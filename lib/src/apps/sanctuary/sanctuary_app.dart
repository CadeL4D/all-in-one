import 'dart:async';
import 'dart:math';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/local_store.dart';
import 'sanctuary_engine.dart';
import 'sanctuary_models.dart';

enum _WorldTool { inspect, clear, purify }

enum _DeckPage { build, directives, powers }

class SanctuaryApp extends StatefulWidget {
  const SanctuaryApp({super.key});

  @override
  State<SanctuaryApp> createState() => _SanctuaryAppState();
}

class _SanctuaryAppState extends State<SanctuaryApp>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  static const double _tileWidth = 64;
  static const double _tileHeight = 32;
  static const double _worldMarginX = 220;
  static const double _worldMarginY = 180;

  late final AnimationController _ticker;
  final TransformationController _camera = TransformationController();
  SanctuaryEngine? _engine;
  Map<String, dynamic>? _savedWorld;
  Duration? _lastFrame;
  Timer? _autosaveTimer;
  bool _loaded = false;
  bool _cameraInitialized = false;
  _DeckPage _deckPage = _DeckPage.build;
  BuildingKind? _building = BuildingKind.palisade;
  GodPower? _power;
  _WorldTool _tool = _WorldTool.inspect;
  GridPoint? _selectedTile;
  GridPoint? _flingSource;
  String? _toast;
  double _toastLife = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadSave();
    _ticker = AnimationController.unbounded(vsync: this)
      ..addListener(_frame)
      ..repeat(min: 0, max: 100000, period: const Duration(days: 1));
    _autosaveTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => unawaited(_save()),
    );
  }

  Future<void> _loadSave() async {
    final Map<String, dynamic>? saved = await LocalStore.readJsonMap(
      LocalStore.sanctuaryKey,
    );
    if (!mounted) {
      return;
    }
    setState(() {
      _savedWorld = saved;
      _loaded = true;
    });
  }

  Future<void> _save() async {
    final SanctuaryEngine? engine = _engine;
    if (engine == null) {
      return;
    }
    final Map<String, dynamic> data = engine.toJson();
    _savedWorld = data;
    await LocalStore.writeJsonMap(LocalStore.sanctuaryKey, data);
  }

  void _frame() {
    final Duration now = _ticker.lastElapsedDuration ?? Duration.zero;
    final double delta = _lastFrame == null
        ? 0
        : (now - _lastFrame!).inMicroseconds / Duration.microsecondsPerSecond;
    _lastFrame = now;
    final SanctuaryEngine? engine = _engine;
    if (engine == null) {
      return;
    }
    engine.tick(delta);
    if (_toastLife > 0) {
      _toastLife -= delta;
    }
    for (final SanctuaryEvent event in engine.drainEvents()) {
      _handleEvent(event);
    }
    if (mounted) {
      setState(() {});
    }
  }

  void _handleEvent(SanctuaryEvent event) {
    switch (event.kind) {
      case SanctuaryEventKind.construction:
        HapticFeedback.selectionClick();
        _showToast(event.message ?? 'Blueprint placed');
      case SanctuaryEventKind.placementRejected:
        HapticFeedback.lightImpact();
        _showToast(event.message ?? 'Cannot build there');
      case SanctuaryEventKind.towerShot:
        if ((_engine?.enemiesDefeatedTonight ?? 0) % 5 == 0) {
          HapticFeedback.selectionClick();
        }
      case SanctuaryEventKind.powerCast:
        HapticFeedback.heavyImpact();
        SystemSound.play(SystemSoundType.click);
      case SanctuaryEventKind.impact:
        HapticFeedback.heavyImpact();
        _showToast(event.message ?? 'Heavy impact');
      case SanctuaryEventKind.phaseChanged:
        HapticFeedback.mediumImpact();
        _showToast(_phaseAnnouncement(_engine!.phase));
        unawaited(_save());
      case SanctuaryEventKind.dawn:
        HapticFeedback.mediumImpact();
        _showToast(event.message ?? 'Dawn secured');
      case SanctuaryEventKind.citizenLost:
        HapticFeedback.vibrate();
      case SanctuaryEventKind.settlementFallen:
        HapticFeedback.vibrate();
        unawaited(_save());
    }
  }

  void _showToast(String message) {
    _toast = message;
    _toastLife = 2.2;
  }

  void _newSettlement() {
    SanctuaryEngine? legacy = _engine;
    if (legacy == null && _savedWorld != null) {
      legacy = SanctuaryEngine.fromJson(_savedWorld!);
    }
    final SanctuaryEngine fresh = SanctuaryEngine();
    if (legacy != null) {
      fresh.ancestralShards = legacy.ancestralShards;
      for (final AncestralUpgrade upgrade in AncestralUpgrade.values) {
        fresh.upgrades[upgrade] = legacy.upgrades[upgrade] ?? 0;
      }
    }
    setState(() {
      _engine = fresh;
      _cameraInitialized = false;
      _selectedTile = null;
      _building = BuildingKind.palisade;
      _power = null;
      _tool = _WorldTool.inspect;
      _deckPage = _DeckPage.build;
    });
    unawaited(_save());
  }

  void _resumeSettlement() {
    final Map<String, dynamic>? save = _savedWorld;
    if (save == null) {
      _newSettlement();
      return;
    }
    setState(() {
      _engine = SanctuaryEngine.fromJson(save);
      _cameraInitialized = false;
      _selectedTile = null;
    });
  }

  Future<void> _confirmNewSettlement() async {
    if (_savedWorld == null) {
      _newSettlement();
      return;
    }
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: const Text('Begin a new settlement?'),
        content: const Text(
          'This replaces the current Sanctuary & Cinder autosave.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep current'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Begin anew'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      _newSettlement();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) {
      _engine?.paused = true;
      unawaited(_save());
      if (mounted) {
        setState(() {});
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _autosaveTimer?.cancel();
    _ticker.dispose();
    _camera.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF080710),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF00F5D4),
          brightness: Brightness.dark,
          surface: const Color(0xFF12121C),
        ),
      ),
      child: Scaffold(
        body: SafeArea(
          bottom: false,
          child: _engine == null
              ? _SanctuaryFront(
                  loaded: _loaded,
                  saved: _savedWorld,
                  onBack: () => Navigator.of(context).pop(),
                  onResume: _resumeSettlement,
                  onNew: _confirmNewSettlement,
                )
              : _buildGame(_engine!),
        ),
      ),
    );
  }

  Widget _buildGame(SanctuaryEngine engine) {
    return Stack(
      children: <Widget>[
        Column(
          children: <Widget>[
            _SanctuaryHud(
              engine: engine,
              onExit: () {
                unawaited(_save());
                setState(() => _engine = null);
              },
              onPause: () => setState(engine.togglePause),
              onSpeed: (double speed) => setState(() => engine.setSpeed(speed)),
            ),
            _ResourceRail(resources: engine.resources),
            Expanded(
              child: LayoutBuilder(
                builder: (BuildContext context, BoxConstraints constraints) {
                  _initializeCamera(engine, constraints.biggest);
                  return _WorldViewport(
                    engine: engine,
                    camera: _camera,
                    worldSize: _worldSize(engine),
                    origin: _worldOrigin(engine),
                    selectedTile: _selectedTile,
                    selectedBuilding: _building,
                    selectedPower: _power,
                    tool: _tool,
                    onTap: _handleWorldTap,
                    onLongPressStart: (Offset local) {
                      final GridPoint tile = _tileAt(local, engine);
                      final TerrainKind terrain = engine.terrainAt(tile);
                      if (terrain == TerrainKind.granite ||
                          terrain == TerrainKind.forest) {
                        _flingSource = tile;
                        HapticFeedback.lightImpact();
                      }
                    },
                    onLongPressEnd: (Offset local, double velocity) {
                      final GridPoint? source = _flingSource;
                      _flingSource = null;
                      if (source == null) {
                        return;
                      }
                      final GridPoint target = _tileAt(local, engine);
                      if (engine.fling(source, target, velocity)) {
                        HapticFeedback.heavyImpact();
                        _showToast('Kinetic fling');
                      }
                    },
                  );
                },
              ),
            ),
            _MacroDeck(
              engine: engine,
              page: _deckPage,
              building: _building,
              power: _power,
              tool: _tool,
              onPage: (value) {
                if (value == _DeckPage.directives) {
                  _showDirectives(engine);
                }
                setState(() => _deckPage = value);
              },
              onBuilding: (BuildingKind value) => setState(() {
                _building = value;
                _power = null;
                _tool = _WorldTool.inspect;
              }),
              onPower: (GodPower value) => setState(() {
                _power = value;
                _building = null;
                _tool = _WorldTool.inspect;
              }),
              onTool: (_WorldTool value) => setState(() {
                _tool = value;
                _building = null;
                _power = null;
              }),
            ),
          ],
        ),
        if (_toastLife > 0 && _toast != null)
          Positioned(
            left: 18,
            right: 18,
            top: 118,
            child: IgnorePointer(child: _WorldToast(message: _toast!)),
          ),
        if (engine.paused && engine.phase != SanctuaryPhase.fallen)
          Positioned.fill(
            child: _PauseScrim(onResume: () => setState(engine.togglePause)),
          ),
        if (engine.phase == SanctuaryPhase.fallen)
          Positioned.fill(
            child: _FallenOverlay(
              engine: engine,
              onConstellation: () => _showConstellation(engine),
              onNew: _newSettlement,
              onExit: () => setState(() => _engine = null),
            ),
          ),
      ],
    );
  }

  void _initializeCamera(SanctuaryEngine engine, Size viewport) {
    if (_cameraInitialized || viewport.isEmpty) {
      return;
    }
    _cameraInitialized = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _engine != engine) {
        return;
      }
      const double scale = 0.82;
      final Offset hearthPoint = _project(
        engine.hearthTile.x + 0.5,
        engine.hearthTile.y + 0.5,
        engine,
      );
      _camera.value = Matrix4.diagonal3Values(scale, scale, 1)
        ..setTranslationRaw(
          viewport.width / 2 - hearthPoint.dx * scale,
          viewport.height / 2 - hearthPoint.dy * scale,
          0,
        );
    });
  }

  void _handleWorldTap(Offset local) {
    final SanctuaryEngine engine = _engine!;
    final GridPoint tile = _tileAt(local, engine);
    setState(() => _selectedTile = tile);
    if (!engine.inBounds(tile)) {
      return;
    }
    if (_building != null) {
      engine.placeBuilding(_building!, tile);
      return;
    }
    if (_power != null) {
      if (!engine.castPower(_power!, tile)) {
        _showToast('Need ${_power!.manaCost} mana on purified ground');
        HapticFeedback.lightImpact();
      }
      return;
    }
    switch (_tool) {
      case _WorldTool.clear:
        if (!engine.clearTerrain(tile)) {
          _showToast('Select a forest or granite outcrop');
        } else {
          HapticFeedback.mediumImpact();
          _showToast('Materials recovered');
        }
      case _WorldTool.purify:
        if (!engine.purifyFog(tile)) {
          _showToast('Purify adjacent fog · 8 mana');
        } else {
          HapticFeedback.mediumImpact();
          _showToast('Corruption cleared');
        }
      case _WorldTool.inspect:
        final SanctuaryBuilding? building = engine.buildingAt(tile);
        if (building != null) {
          _showToast(
            '${building.kind.label} · ${(building.healthRatio * 100).round()}% integrity',
          );
        }
    }
  }

  Future<void> _showDirectives(SanctuaryEngine engine) async {
    final Map<CitizenRole, double> working = <CitizenRole, double>{
      for (final CitizenRole role in CitizenRole.values)
        role: (engine.directives[role] ?? 0).toDouble(),
    };
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF11131D),
      builder: (BuildContext context) => StatefulBuilder(
        builder: (BuildContext context, StateSetter setSheetState) {
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 22),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Center(
                    child: Container(
                      width: 42,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFF3E4251),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'Hearth directives',
                    style: TextStyle(
                      color: Color(0xFFF4F1DE),
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 5),
                  const Text(
                    'Set priorities, not individuals. Percentages normalize automatically when applied.',
                    style: TextStyle(
                      color: Color(0xFF9296A6),
                      fontSize: 12,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 16),
                  for (final CitizenRole role in CitizenRole.values)
                    _DirectiveSlider(
                      role: role,
                      value: working[role]!,
                      onChanged: (double value) =>
                          setSheetState(() => working[role] = value),
                    ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                        engine.setDirectives(
                          working.map(
                            (CitizenRole key, double value) =>
                                MapEntry<CitizenRole, int>(key, value.round()),
                          ),
                        );
                        HapticFeedback.mediumImpact();
                        Navigator.of(context).pop();
                        setState(() {});
                      },
                      child: const Text('APPLY DIRECTIVES'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _showConstellation(SanctuaryEngine engine) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF12101B),
      builder: (BuildContext context) => StatefulBuilder(
        builder: (BuildContext context, StateSetter setSheetState) {
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 15, 18, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Text(
                    'Ancestral Constellation',
                    style: TextStyle(
                      color: Color(0xFFF4F1DE),
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${engine.ancestralShards} shards available · upgrades follow every future settlement',
                    style: const TextStyle(
                      color: Color(0xFF9C93A8),
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 14),
                  for (final AncestralUpgrade upgrade
                      in AncestralUpgrade.values)
                    _UpgradeRow(
                      upgrade: upgrade,
                      rank: engine.upgrades[upgrade] ?? 0,
                      cost: engine.upgradeCost(upgrade),
                      canBuy:
                          engine.ancestralShards >=
                              engine.upgradeCost(upgrade) &&
                          (engine.upgrades[upgrade] ?? 0) < upgrade.maxRank,
                      onBuy: () {
                        if (engine.purchaseUpgrade(upgrade)) {
                          HapticFeedback.mediumImpact();
                          setSheetState(() {});
                          setState(() {});
                          unawaited(_save());
                        }
                      },
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  GridPoint _tileAt(Offset local, SanctuaryEngine engine) {
    final Offset origin = _worldOrigin(engine);
    final double sx = local.dx - origin.dx;
    final double sy = local.dy - origin.dy;
    final double gridX = sx / _tileWidth + sy / _tileHeight;
    final double gridY = sy / _tileHeight - sx / _tileWidth;
    return GridPoint(gridX.floor(), gridY.floor());
  }

  Offset _project(double x, double y, SanctuaryEngine engine) {
    final Offset origin = _worldOrigin(engine);
    return Offset(
      (x - y) * (_tileWidth / 2) + origin.dx,
      (x + y) * (_tileHeight / 2) + origin.dy,
    );
  }

  Offset _worldOrigin(SanctuaryEngine engine) =>
      Offset(engine.mapSize * (_tileWidth / 2) + _worldMarginX, _worldMarginY);

  Size _worldSize(SanctuaryEngine engine) => Size(
    engine.mapSize * _tileWidth + _worldMarginX * 2,
    engine.mapSize * _tileHeight + _worldMarginY * 2,
  );
}

class _SanctuaryFront extends StatelessWidget {
  const _SanctuaryFront({
    required this.loaded,
    required this.saved,
    required this.onBack,
    required this.onResume,
    required this.onNew,
  });

  final bool loaded;
  final Map<String, dynamic>? saved;
  final VoidCallback onBack;
  final VoidCallback onResume;
  final VoidCallback onNew;

  @override
  Widget build(BuildContext context) {
    final int savedDay = (saved?['day'] as num?)?.toInt() ?? 1;
    final String savedPhase = saved?['phase'] as String? ?? 'day';
    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: <Widget>[
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 16, 6),
            child: Row(
              children: <Widget>[
                IconButton.filledTonal(
                  onPressed: onBack,
                  icon: const Icon(Icons.arrow_back_rounded),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        'SANCTUARY & CINDER',
                        style: TextStyle(
                          color: Color(0xFFF4F1DE),
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        'A GOD-SURVIVAL BUILDER',
                        style: TextStyle(
                          color: Color(0xFF7D8294),
                          fontSize: 8,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                ),
                const _OfflineBadge(),
              ],
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(17, 8, 17, 30),
          sliver: SliverList.list(
            children: <Widget>[
              const _SanctuaryHero(),
              const SizedBox(height: 15),
              if (saved != null)
                _ResumeCard(
                  day: savedDay,
                  phase: savedPhase,
                  onResume: loaded ? onResume : null,
                ),
              if (saved != null) const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  key: const ValueKey<String>('sanctuary-new'),
                  onPressed: loaded ? onNew : null,
                  icon: const Icon(Icons.local_fire_department_rounded),
                  label: Text(
                    saved == null ? 'LIGHT THE FIRST HEARTH' : 'NEW SETTLEMENT',
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFFF6A2A),
                    foregroundColor: const Color(0xFF1E0B02),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    textStyle: const TextStyle(
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.6,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 23),
              const _FrontSectionTitle('THE CYCLE'),
              const SizedBox(height: 10),
              const _CycleCards(),
              const SizedBox(height: 23),
              const _FrontSectionTitle('YOU SET PRIORITIES. THEY DO THE WORK.'),
              const SizedBox(height: 10),
              const _PillarCard(
                icon: Icons.hub_rounded,
                color: Color(0xFF00F5D4),
                title: 'Autonomous settlement',
                detail: 'Balance four Hearth directives while citizens harvest, build, haul ammunition, repair, and pray on their own.',
              ),
              const SizedBox(height: 9),
              const _PillarCard(
                icon: Icons.gesture_rounded,
                color: Color(0xFFFF6A2A),
                title: 'Tactile intervention',
                detail: 'Tap divine powers or long-press and fling forest and granite debris through the swarm for zero mana.',
              ),
              const SizedBox(height: 9),
              const _PillarCard(
                icon: Icons.account_tree_rounded,
                color: Color(0xFFB76CF0),
                title: 'Build paths, not boxes',
                detail: 'Maze enemies through kill zones. Unsafe placements are rejected before they can seal every route.',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _OfflineBadge extends StatelessWidget {
  const _OfflineBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF15372F),
        borderRadius: BorderRadius.circular(99),
      ),
      child: const Row(
        children: <Widget>[
          Icon(Icons.cloud_off_rounded, color: Color(0xFF5CE6C6), size: 13),
          SizedBox(width: 5),
          Text(
            'OFFLINE',
            style: TextStyle(
              color: Color(0xFF7EEBD0),
              fontSize: 8,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }
}

class _SanctuaryHero extends StatelessWidget {
  const _SanctuaryHero();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 222,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(27),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[
            Color(0xFF243B31),
            Color(0xFF171A21),
            Color(0xFF2A1027),
          ],
        ),
        border: Border.all(color: const Color(0xFF3B433F)),
      ),
      child: Stack(
        children: <Widget>[
          const Positioned(right: -15, top: -4, child: _HeroIslands()),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: <Color>[
                    const Color(0xFF0D1211).withValues(alpha: 0.97),
                    const Color(0xFF0D1211).withValues(alpha: 0.15),
                  ],
                ),
              ),
            ),
          ),
          const Positioned(
            left: 21,
            right: 92,
            bottom: 22,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'BUILD BY DAY · ENDURE BY NIGHT',
                  style: TextStyle(
                    color: Color(0xFF00F5D4),
                    fontSize: 8,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.35,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Guard the last\nlight in the wild.',
                  style: TextStyle(
                    color: Color(0xFFF4F1DE),
                    fontSize: 29,
                    height: 1.02,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.9,
                  ),
                ),
                SizedBox(height: 11),
                Text(
                  'Shape the sanctuary. Let your people live. Meet the abyss with stone, flame, and your own hand.',
                  style: TextStyle(
                    color: Color(0xFFADB2AC),
                    fontSize: 11,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroIslands extends StatelessWidget {
  const _HeroIslands();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 205,
      height: 210,
      child: CustomPaint(painter: _HeroPainter()),
    );
  }
}

class _HeroPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final Paint ground = Paint()..color = const Color(0xFF2D6A4F);
    final Paint edge = Paint()..color = const Color(0xFF18372C);
    final Paint line = Paint()
      ..color = const Color(0xFF5DA178)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    for (int row = 0; row < 6; row++) {
      for (int column = 0; column < 6; column++) {
        final double x = 102 + (column - row) * 22;
        final double y = 20 + (column + row) * 11;
        final Path diamond = Path()
          ..moveTo(x, y)
          ..lineTo(x + 22, y + 11)
          ..lineTo(x, y + 22)
          ..lineTo(x - 22, y + 11)
          ..close();
        canvas.drawPath(diamond.shift(const Offset(0, 6)), edge);
        canvas.drawPath(diamond, ground);
        canvas.drawPath(diamond, line);
      }
    }
    final Offset hearth = const Offset(102, 86);
    canvas.drawOval(
      Rect.fromCenter(
        center: hearth + const Offset(0, 12),
        width: 46,
        height: 20,
      ),
      Paint()..color = const Color(0xFF6C473A),
    );
    canvas.drawCircle(hearth, 22, Paint()..color = const Color(0x33FF5400));
    canvas.drawCircle(hearth, 10, Paint()..color = const Color(0xFFFF8A35));
    canvas.drawCircle(
      hearth - const Offset(0, 5),
      5,
      Paint()..color = const Color(0xFFFFE09B),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _ResumeCard extends StatelessWidget {
  const _ResumeCard({
    required this.day,
    required this.phase,
    required this.onResume,
  });

  final int day;
  final String phase;
  final VoidCallback? onResume;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: const Color(0xFF121720),
        borderRadius: BorderRadius.circular(19),
        border: Border.all(color: const Color(0xFF2B3941)),
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFF00F5D4).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(13),
            ),
            child: const Icon(Icons.restore_rounded, color: Color(0xFF42E7CC)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Day $day · ${phase.toUpperCase()}',
                  style: const TextStyle(
                    color: Color(0xFFF0F1E9),
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const Text(
                  'Autosave ready',
                  style: TextStyle(color: Color(0xFF7C8590), fontSize: 10),
                ),
              ],
            ),
          ),
          FilledButton(
            key: const ValueKey<String>('sanctuary-resume'),
            onPressed: onResume,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF00CDB1),
              foregroundColor: const Color(0xFF04130F),
              padding: const EdgeInsets.symmetric(horizontal: 17),
            ),
            child: const Text('RESUME'),
          ),
        ],
      ),
    );
  }
}

class _FrontSectionTitle extends StatelessWidget {
  const _FrontSectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: const TextStyle(
      color: Color(0xFF777F8F),
      fontSize: 8,
      fontWeight: FontWeight.w900,
      letterSpacing: 1.3,
    ),
  );
}

class _CycleCards extends StatelessWidget {
  const _CycleCards();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: <Widget>[
        Expanded(
          child: _CycleCard(
            icon: Icons.wb_sunny_rounded,
            color: Color(0xFFFFCE67),
            title: 'DAY',
            detail: 'Gather & build',
          ),
        ),
        SizedBox(width: 7),
        Expanded(
          child: _CycleCard(
            icon: Icons.nights_stay_rounded,
            color: Color(0xFF9F7BFF),
            title: 'NIGHT',
            detail: 'Maze & defend',
          ),
        ),
        SizedBox(width: 7),
        Expanded(
          child: _CycleCard(
            icon: Icons.wb_twilight_rounded,
            color: Color(0xFF00F5D4),
            title: 'DAWN',
            detail: 'Repair & grow',
          ),
        ),
      ],
    );
  }
}

class _CycleCard extends StatelessWidget {
  const _CycleCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.detail,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF12151E),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF292D38)),
      ),
      child: Column(
        children: <Widget>[
          Icon(icon, color: color, size: 21),
          const SizedBox(height: 6),
          Text(
            title,
            style: const TextStyle(
              color: Color(0xFFECEDE8),
              fontSize: 9,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.8,
            ),
          ),
          Text(
            detail,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF737B89), fontSize: 8),
          ),
        ],
      ),
    );
  }
}

class _PillarCard extends StatelessWidget {
  const _PillarCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.detail,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: const Color(0xFF11141C),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF292D38)),
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFFECEDE8),
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  detail,
                  style: const TextStyle(
                    color: Color(0xFF808794),
                    fontSize: 10,
                    height: 1.32,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SanctuaryHud extends StatelessWidget {
  const _SanctuaryHud({
    required this.engine,
    required this.onExit,
    required this.onPause,
    required this.onSpeed,
  });

  final SanctuaryEngine engine;
  final VoidCallback onExit;
  final VoidCallback onPause;
  final ValueChanged<double> onSpeed;

  @override
  Widget build(BuildContext context) {
    final Color phaseColor = _phaseColor(engine.phase);
    return Container(
      height: 66,
      padding: const EdgeInsets.fromLTRB(6, 7, 8, 6),
      decoration: const BoxDecoration(
        color: Color(0xFF0A0A12),
        border: Border(bottom: BorderSide(color: Color(0xFF24242F))),
      ),
      child: Row(
        children: <Widget>[
          IconButton(
            onPressed: onExit,
            visualDensity: VisualDensity.compact,
            style: IconButton.styleFrom(
              backgroundColor: const Color(0xFF171720),
            ),
            icon: const Icon(Icons.arrow_back_rounded, size: 19),
          ),
          const SizedBox(width: 5),
          SizedBox(
            width: 48,
            height: 48,
            child: Stack(
              alignment: Alignment.center,
              children: <Widget>[
                CircularProgressIndicator(
                  value: engine.phaseProgress,
                  strokeWidth: 3,
                  color: phaseColor,
                  backgroundColor: phaseColor.withValues(alpha: 0.13),
                ),
                Icon(_phaseIcon(engine.phase), color: phaseColor, size: 20),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Text(
                      'DAY ${engine.day}',
                      style: const TextStyle(
                        color: Color(0xFFF1F0E8),
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        '${engine.phase.name.toUpperCase()} · ${engine.phaseRemaining.ceil()}s',
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: phaseColor,
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.7,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                _ThinGauge(
                  value: engine.hearth.healthRatio,
                  color: engine.hearth.healthRatio < 0.3
                      ? const Color(0xFFFF4D68)
                      : const Color(0xFFFF7B35),
                  label: 'HEARTH ${engine.hearth.hp.ceil()}',
                ),
                const SizedBox(height: 3),
                _ThinGauge(
                  value: engine.resources.mana / 200,
                  color: const Color(0xFF00F5D4),
                  label: 'MANA ${engine.resources.mana.floor()}',
                ),
              ],
            ),
          ),
          const SizedBox(width: 7),
          _SpeedControl(engine: engine, onPause: onPause, onSpeed: onSpeed),
        ],
      ),
    );
  }
}

class _ThinGauge extends StatelessWidget {
  const _ThinGauge({
    required this.value,
    required this.color,
    required this.label,
  });

  final double value;
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        SizedBox(
          width: 54,
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF7E8290),
              fontSize: 6,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: value.clamp(0, 1),
              minHeight: 4,
              color: color,
              backgroundColor: const Color(0xFF242530),
            ),
          ),
        ),
      ],
    );
  }
}

class _SpeedControl extends StatelessWidget {
  const _SpeedControl({
    required this.engine,
    required this.onPause,
    required this.onSpeed,
  });

  final SanctuaryEngine engine;
  final VoidCallback onPause;
  final ValueChanged<double> onSpeed;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: const Color(0xFF15151E),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          _SpeedButton(
            label: engine.paused ? '▶' : 'Ⅱ',
            selected: engine.paused,
            onTap: onPause,
          ),
          _SpeedButton(
            label: '½×',
            selected: !engine.paused && engine.gameSpeed == 0.5,
            onTap: () => onSpeed(0.5),
          ),
          _SpeedButton(
            label: '1×',
            selected: !engine.paused && engine.gameSpeed == 1,
            onTap: () => onSpeed(1),
          ),
          _SpeedButton(
            label: '2×',
            selected: !engine.paused && engine.gameSpeed == 2,
            onTap: () => onSpeed(2),
          ),
        ],
      ),
    );
  }
}

class _SpeedButton extends StatelessWidget {
  const _SpeedButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(9),
      child: Container(
        width: 28,
        height: 30,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFF00D8BB).withValues(alpha: 0.18)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(9),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? const Color(0xFF4BE9D0) : const Color(0xFF777B88),
            fontSize: 9,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

class _ResourceRail extends StatelessWidget {
  const _ResourceRail({required this.resources});

  final SanctuaryResources resources;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 34,
      color: const Color(0xEE0C0D14),
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          _Resource(
            icon: Icons.forest_rounded,
            value: resources.timber.floor(),
            color: const Color(0xFFB98260),
          ),
          _Resource(
            icon: Icons.landscape_rounded,
            value: resources.stone.floor(),
            color: const Color(0xFFD7D2BB),
          ),
          _Resource(
            icon: Icons.grass_rounded,
            value: resources.food.floor(),
            color: const Color(0xFF7DCB74),
          ),
          _Resource(
            icon: Icons.settings_rounded,
            value: resources.iron.floor(),
            color: const Color(0xFF9EA7B1),
          ),
          _Resource(
            icon: Icons.carpenter_rounded,
            value: resources.planks.floor(),
            color: const Color(0xFFD19974),
          ),
          _Resource(
            icon: Icons.view_in_ar_rounded,
            value: resources.masonry.floor(),
            color: const Color(0xFFE3DFD1),
          ),
          _Resource(
            icon: Icons.diamond_rounded,
            value: resources.crystals.floor(),
            color: const Color(0xFFB57BEE),
          ),
        ],
      ),
    );
  }
}

class _Resource extends StatelessWidget {
  const _Resource({
    required this.icon,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        Icon(icon, color: color, size: 13),
        const SizedBox(width: 4),
        Text(
          '$value',
          style: const TextStyle(
            color: Color(0xFFD9DBDF),
            fontSize: 9,
            fontWeight: FontWeight.w800,
            fontFeatures: <ui.FontFeature>[ui.FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}

class _WorldViewport extends StatelessWidget {
  const _WorldViewport({
    required this.engine,
    required this.camera,
    required this.worldSize,
    required this.origin,
    required this.selectedTile,
    required this.selectedBuilding,
    required this.selectedPower,
    required this.tool,
    required this.onTap,
    required this.onLongPressStart,
    required this.onLongPressEnd,
  });

  final SanctuaryEngine engine;
  final TransformationController camera;
  final Size worldSize;
  final Offset origin;
  final GridPoint? selectedTile;
  final BuildingKind? selectedBuilding;
  final GodPower? selectedPower;
  final _WorldTool tool;
  final ValueChanged<Offset> onTap;
  final ValueChanged<Offset> onLongPressStart;
  final void Function(Offset local, double velocity) onLongPressEnd;

  @override
  Widget build(BuildContext context) {
    Offset? longPressStart;
    DateTime? longPressTime;
    return ColoredBox(
      color: _phaseBackground(engine.phase),
      child: InteractiveViewer(
        transformationController: camera,
        constrained: false,
        minScale: 0.5,
        maxScale: 2.5,
        boundaryMargin: const EdgeInsets.all(300),
        clipBehavior: Clip.hardEdge,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapUp: (TapUpDetails details) => onTap(details.localPosition),
          onLongPressStart: (LongPressStartDetails details) {
            longPressStart = details.localPosition;
            longPressTime = DateTime.now();
            onLongPressStart(details.localPosition);
          },
          onLongPressEnd: (LongPressEndDetails details) {
            final Offset start = longPressStart ?? details.localPosition;
            final int milliseconds = DateTime.now()
                .difference(longPressTime ?? DateTime.now())
                .inMilliseconds
                .clamp(80, 1500);
            final double velocity =
                (details.localPosition - start).distance / milliseconds * 95;
            onLongPressEnd(details.localPosition, velocity);
          },
          child: SizedBox.fromSize(
            size: worldSize,
            child: RepaintBoundary(
              child: CustomPaint(
                painter: _SanctuaryPainter(
                  engine: engine,
                  origin: origin,
                  selectedTile: selectedTile,
                  selectedBuilding: selectedBuilding,
                  selectedPower: selectedPower,
                  tool: tool,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SanctuaryPainter extends CustomPainter {
  _SanctuaryPainter({
    required this.engine,
    required this.origin,
    required this.selectedTile,
    required this.selectedBuilding,
    required this.selectedPower,
    required this.tool,
  });

  final SanctuaryEngine engine;
  final Offset origin;
  final GridPoint? selectedTile;
  final BuildingKind? selectedBuilding;
  final GodPower? selectedPower;
  final _WorldTool tool;
  final Path _diamond = Path();
  final Paint _fill = Paint();
  final Paint _stroke = Paint()
    ..style = PaintingStyle.stroke
    ..strokeWidth = 0.75;

  Offset _iso(double x, double y) =>
      Offset((x - y) * 32 + origin.dx, (x + y) * 16 + origin.dy);

  @override
  void paint(Canvas canvas, Size size) {
    final Rect clip = canvas.getLocalClipBounds().inflate(80);
    final double night = switch (engine.phase) {
      SanctuaryPhase.day => 0,
      SanctuaryPhase.dusk => 0.48,
      SanctuaryPhase.night => 1,
      SanctuaryPhase.dawn => 0.28,
      SanctuaryPhase.fallen => 0.9,
    };
    for (int sum = 0; sum <= (engine.mapSize - 1) * 2; sum++) {
      final int minX = max(0, sum - engine.mapSize + 1);
      final int maxX = min(engine.mapSize - 1, sum);
      for (int x = minX; x <= maxX; x++) {
        final int y = sum - x;
        final GridPoint tile = GridPoint(x, y);
        final Offset center = _iso(x + 0.5, y + 0.5);
        if (!clip.overlaps(
          Rect.fromCenter(center: center, width: 68, height: 50),
        )) {
          continue;
        }
        _paintTile(canvas, tile, center, night);
      }
    }
    for (final SanctuaryBuilding building in engine.buildings) {
      final Offset point = _iso(building.tile.x + 0.5, building.tile.y + 0.5);
      if (clip.contains(point)) {
        _paintBuilding(canvas, building, point, night);
      }
    }
    for (final SanctuaryCitizen citizen in engine.citizens) {
      final Offset point = _iso(citizen.x, citizen.y);
      if (clip.contains(point)) {
        _paintCitizen(canvas, citizen, point);
      }
    }
    for (final SanctuaryEnemy enemy in engine.enemies) {
      final Offset point = _iso(enemy.x, enemy.y);
      if (clip.contains(point)) {
        _paintEnemy(canvas, enemy, point);
      }
    }
    for (final SanctuaryEffect effect in engine.effects) {
      final Offset point = _iso(effect.x, effect.y);
      if (clip.contains(point)) {
        _paintEffect(canvas, effect, point);
      }
    }
    if (selectedTile != null && engine.inBounds(selectedTile!)) {
      _paintSelection(canvas, selectedTile!);
    }
    if (engine.rainActive) {
      _paintRain(canvas, clip);
    }
  }

  void _paintTile(Canvas canvas, GridPoint tile, Offset center, double night) {
    final bool revealed = engine.isRevealed(tile);
    final TerrainKind terrain = engine.terrainAt(tile);
    final Color dayColor = switch (terrain) {
      TerrainKind.grass => const Color(0xFF2D6A4F),
      TerrainKind.forest => const Color(0xFF1D513A),
      TerrainKind.granite => const Color(0xFF7A786F),
      TerrainKind.river => const Color(0xFF4BABC1),
      TerrainKind.chasm => const Color(0xFF120D1C),
      TerrainKind.holyGround => const Color(0xFF8E9E72),
    };
    final Color nightColor = switch (terrain) {
      TerrainKind.river => const Color(0xFF17395B),
      TerrainKind.chasm => const Color(0xFF05030A),
      TerrainKind.holyGround => const Color(0xFF174D4B),
      _ => const Color(0xFF111827),
    };
    final Color color = revealed
        ? Color.lerp(dayColor, nightColor, night)!
        : Color.lerp(const Color(0xFF261036), const Color(0xFF080511), night)!;
    _diamond
      ..reset()
      ..moveTo(center.dx, center.dy - 16)
      ..lineTo(center.dx + 32, center.dy)
      ..lineTo(center.dx, center.dy + 16)
      ..lineTo(center.dx - 32, center.dy)
      ..close();
    _fill.color = color;
    canvas.drawPath(_diamond, _fill);
    _stroke.color = revealed
        ? const Color(0x22FFFFFF)
        : const Color(0x557209B7);
    canvas.drawPath(_diamond, _stroke);
    if (!revealed) {
      if ((tile.x * 7 + tile.y * 11 + engine.seed) % 9 == 0) {
        canvas.drawCircle(
          center,
          5,
          Paint()..color = const Color(0xFF7209B7).withValues(alpha: 0.28),
        );
      }
      return;
    }
    switch (terrain) {
      case TerrainKind.forest:
        canvas.drawOval(
          Rect.fromCenter(
            center: center + const Offset(0, 5),
            width: 22,
            height: 9,
          ),
          Paint()..color = const Color(0x66000000),
        );
        canvas.drawRect(
          Rect.fromCenter(
            center: center - const Offset(0, 5),
            width: 4,
            height: 16,
          ),
          Paint()..color = const Color(0xFF704735),
        );
        canvas.drawCircle(
          center - const Offset(0, 14),
          11,
          Paint()
            ..color = Color.lerp(
              const Color(0xFF276749),
              const Color(0xFF13283B),
              night,
            )!,
        );
      case TerrainKind.granite:
        final Path rock = Path()
          ..moveTo(center.dx - 10, center.dy + 4)
          ..lineTo(center.dx - 6, center.dy - 10)
          ..lineTo(center.dx + 5, center.dy - 14)
          ..lineTo(center.dx + 12, center.dy + 3)
          ..close();
        canvas.drawPath(rock, Paint()..color = const Color(0xFFAAA89E));
        canvas.drawLine(
          center - const Offset(5, 8),
          center + const Offset(5, -5),
          Paint()
            ..color = const Color(0xFFD5D1C5)
            ..strokeWidth = 1.5,
        );
      case TerrainKind.river:
        canvas.drawLine(
          center - const Offset(19, 1),
          center + const Offset(18, 1),
          Paint()
            ..color = const Color(0x8890E0EF)
            ..strokeWidth = 2,
        );
      case TerrainKind.holyGround:
        canvas.drawCircle(
          center,
          8,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2
            ..color = const Color(0xFF00F5D4),
        );
      case TerrainKind.grass || TerrainKind.chasm:
        break;
    }
    if (engine.fissures.containsKey(tile.index(engine.mapSize))) {
      canvas.drawLine(
        center - const Offset(18, 7),
        center + const Offset(18, 7),
        Paint()
          ..color = const Color(0xFFFF5400)
          ..strokeWidth = 5,
      );
      canvas.drawLine(
        center - const Offset(18, 7),
        center + const Offset(18, 7),
        Paint()
          ..color = const Color(0xFF2A0810)
          ..strokeWidth = 2,
      );
    }
  }

  void _paintBuilding(
    Canvas canvas,
    SanctuaryBuilding building,
    Offset point,
    double night,
  ) {
    final double alpha = building.complete ? 1 : 0.52;
    canvas.drawOval(
      Rect.fromCenter(
        center: point + const Offset(0, 9),
        width: 38,
        height: 16,
      ),
      Paint()..color = const Color(0x77000000),
    );
    switch (building.kind) {
      case BuildingKind.hearth:
        canvas.drawOval(
          Rect.fromCenter(
            center: point + const Offset(0, 3),
            width: 48,
            height: 25,
          ),
          Paint()..color = const Color(0xFF8D5B4C),
        );
        final double pulse = 0.5 + sin(engine.phaseRemaining * 4) * 0.5;
        canvas.drawCircle(
          point - const Offset(0, 10),
          25 + pulse * 3,
          Paint()..color = const Color(0xFFFF5400).withValues(alpha: 0.13),
        );
        canvas.drawCircle(
          point - const Offset(0, 10),
          11,
          Paint()..color = const Color(0xFFFF6A24),
        );
        canvas.drawCircle(
          point - const Offset(0, 15),
          6,
          Paint()..color = const Color(0xFFFFE09C),
        );
      case BuildingKind.palisade || BuildingKind.rampart || BuildingKind.gate:
        final Color top = building.kind == BuildingKind.palisade
            ? const Color(0xFF9B664E)
            : const Color(0xFFF4F1DE);
        canvas.drawRect(
          Rect.fromCenter(
            center: point - const Offset(0, 7),
            width: 48,
            height: 13,
          ),
          Paint()..color = top.withValues(alpha: alpha),
        );
        canvas.drawRect(
          Rect.fromCenter(
            center: point + const Offset(0, 1),
            width: 48,
            height: 8,
          ),
          Paint()
            ..color = Color.lerp(
              top,
              Colors.black,
              0.42,
            )!.withValues(alpha: alpha),
        );
        if (building.kind == BuildingKind.gate) {
          canvas.drawRect(
            Rect.fromCenter(
              center: point - const Offset(0, 3),
              width: 12,
              height: 18,
            ),
            Paint()..color = const Color(0xFF32333A),
          );
        }
      case BuildingKind.arrowTower ||
          BuildingKind.ballista ||
          BuildingKind.catapult ||
          BuildingKind.frostSpire ||
          BuildingKind.solarBeacon ||
          BuildingKind.shrine:
        final Color color = building.kind == BuildingKind.frostSpire
            ? const Color(0xFF7DE8F0)
            : building.kind == BuildingKind.shrine
            ? const Color(0xFF00F5D4)
            : const Color(0xFFC69B6B);
        canvas.drawRect(
          Rect.fromCenter(
            center: point - const Offset(0, 11),
            width: 20,
            height: 34,
          ),
          Paint()
            ..color = Color.lerp(
              color,
              const Color(0xFF34313B),
              0.32,
            )!.withValues(alpha: alpha),
        );
        canvas.drawPath(
          Path()
            ..moveTo(point.dx - 15, point.dy - 23)
            ..lineTo(point.dx, point.dy - 36)
            ..lineTo(point.dx + 15, point.dy - 23)
            ..close(),
          Paint()..color = color.withValues(alpha: alpha),
        );
        if (building.kind == BuildingKind.arrowTower ||
            building.kind == BuildingKind.ballista ||
            building.kind == BuildingKind.catapult) {
          canvas.drawLine(
            point - const Offset(0, 29),
            point + const Offset(18, -29),
            Paint()
              ..color = const Color(0xFFFFD39A)
              ..strokeWidth = 3,
          );
        }
      case BuildingKind.cottage ||
          BuildingKind.stockpile ||
          BuildingKind.farm ||
          BuildingKind.sawmill ||
          BuildingKind.masonryYard:
        final Color wall = building.kind == BuildingKind.farm
            ? const Color(0xFFD4A45D)
            : const Color(0xFFF0DFC6);
        canvas.drawRect(
          Rect.fromCenter(
            center: point - const Offset(0, 7),
            width: 31,
            height: 23,
          ),
          Paint()..color = wall.withValues(alpha: alpha),
        );
        canvas.drawPath(
          Path()
            ..moveTo(point.dx - 20, point.dy - 18)
            ..lineTo(point.dx, point.dy - 32)
            ..lineTo(point.dx + 20, point.dy - 18)
            ..close(),
          Paint()..color = const Color(0xFF8D5B4C).withValues(alpha: alpha),
        );
      case BuildingKind.spikeTrench || BuildingKind.tarPit:
        if (building.kind == BuildingKind.tarPit) {
          canvas.drawOval(
            Rect.fromCenter(center: point, width: 44, height: 18),
            Paint()..color = const Color(0xFF171014),
          );
          if (building.cooldown > 0) {
            canvas.drawOval(
              Rect.fromCenter(
                center: point - const Offset(0, 3),
                width: 35,
                height: 14,
              ),
              Paint()..color = const Color(0xFFFF5400).withValues(alpha: 0.78),
            );
          }
          break;
        }
        for (int index = -2; index <= 2; index++) {
          canvas.drawLine(
            point + Offset(index * 7, 6),
            point + Offset(index * 7 + 3, -8),
            Paint()
              ..color = const Color(0xFFD6B181).withValues(alpha: alpha)
              ..strokeWidth = 3,
          );
        }
    }
    if (!building.complete) {
      canvas.drawRect(
        Rect.fromCenter(
          center: point - const Offset(0, 20),
          width: 36,
          height: 4,
        ),
        Paint()..color = const Color(0xFF282935),
      );
      canvas.drawRect(
        Rect.fromLTWH(
          point.dx - 18,
          point.dy - 22,
          36 * building.buildRatio,
          4,
        ),
        Paint()..color = const Color(0xFFFFC15A),
      );
    } else if (building.healthRatio < 0.72) {
      canvas.drawRect(
        Rect.fromCenter(
          center: point - const Offset(0, 28),
          width: 31,
          height: 3,
        ),
        Paint()..color = const Color(0xFF32151A),
      );
      canvas.drawRect(
        Rect.fromLTWH(
          point.dx - 15.5,
          point.dy - 29.5,
          31 * building.healthRatio,
          3,
        ),
        Paint()..color = const Color(0xFFFF566F),
      );
    }
  }

  void _paintCitizen(Canvas canvas, SanctuaryCitizen citizen, Offset point) {
    final Color color = switch (citizen.role) {
      CitizenRole.harvester => const Color(0xFF70C77B),
      CitizenRole.builder => const Color(0xFFFFC15A),
      CitizenRole.hauler => const Color(0xFF90E0EF),
      CitizenRole.acolyte => const Color(0xFFB981E8),
    };
    canvas.drawOval(
      Rect.fromCenter(center: point + const Offset(0, 4), width: 9, height: 5),
      Paint()..color = const Color(0x77000000),
    );
    canvas.drawCircle(point - const Offset(0, 5), 4, Paint()..color = color);
    canvas.drawRect(
      Rect.fromCenter(center: point + const Offset(0, 1), width: 6, height: 8),
      Paint()..color = Color.lerp(color, Colors.black, 0.24)!,
    );
  }

  void _paintEnemy(Canvas canvas, SanctuaryEnemy enemy, Offset point) {
    final Color color = switch (enemy.kind) {
      EnemyKind.crawler => const Color(0xFF8B27C6),
      EnemyKind.spitter => const Color(0xFFB53AC9),
      EnemyKind.banshee => const Color(0xFFA8A0FF),
      EnemyKind.brute => const Color(0xFFFF5400),
      EnemyKind.devourer => const Color(0xFFFF245F),
    };
    final double radius = switch (enemy.kind) {
      EnemyKind.crawler => 6,
      EnemyKind.spitter => 8,
      EnemyKind.banshee => 8,
      EnemyKind.brute => 12,
      EnemyKind.devourer => 18,
    };
    final Offset elevated = enemy.kind == EnemyKind.banshee
        ? point - const Offset(0, 15)
        : point;
    canvas.drawOval(
      Rect.fromCenter(
        center: point + const Offset(0, 5),
        width: radius * 2.2,
        height: radius,
      ),
      Paint()..color = const Color(0x99000000),
    );
    canvas.drawCircle(
      elevated,
      radius + 5,
      Paint()..color = color.withValues(alpha: 0.12),
    );
    final Path body = Path()
      ..moveTo(elevated.dx, elevated.dy - radius)
      ..lineTo(elevated.dx + radius, elevated.dy + radius * 0.7)
      ..lineTo(elevated.dx, elevated.dy + radius)
      ..lineTo(elevated.dx - radius, elevated.dy + radius * 0.7)
      ..close();
    canvas.drawPath(body, Paint()..color = color);
    canvas.drawCircle(
      elevated + Offset(radius * 0.32, -radius * 0.15),
      max(1.7, radius * 0.18),
      Paint()..color = const Color(0xFFFFD3A0),
    );
  }

  void _paintEffect(Canvas canvas, SanctuaryEffect effect, Offset point) {
    final double p = effect.progress;
    final Color color = switch (effect.kind) {
      'lightning' || 'frost' => const Color(0xFF90E0EF),
      'meteor' || 'fling' => const Color(0xFFFF5400),
      'purify' || 'rain' => const Color(0xFF00F5D4),
      _ => const Color(0xFFFFC15A),
    };
    canvas.drawCircle(
      point,
      8 + p * 45,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = max(0.5, 4 * (1 - p))
        ..color = color.withValues(alpha: 1 - p),
    );
    if (effect.kind == 'lightning') {
      canvas.drawLine(
        point - const Offset(9, 90),
        point,
        Paint()
          ..color = color.withValues(alpha: 1 - p)
          ..strokeWidth = 5,
      );
    }
  }

  void _paintSelection(Canvas canvas, GridPoint tile) {
    final Offset center = _iso(tile.x + 0.5, tile.y + 0.5);
    Color color = const Color(0xFF00F5D4);
    if (selectedBuilding != null) {
      final PlacementFailure failure = engine.validatePlacement(
        selectedBuilding!,
        tile,
      );
      color = failure == PlacementFailure.none
          ? const Color(0xFF65F5C1)
          : const Color(0xFFFF4D68);
    } else if (selectedPower != null) {
      color = const Color(0xFF90E0EF);
    } else if (tool == _WorldTool.purify) {
      color = const Color(0xFFB75BE0);
    } else if (tool == _WorldTool.clear) {
      color = const Color(0xFFFFC15A);
    }
    final Path selection = Path()
      ..moveTo(center.dx, center.dy - 17)
      ..lineTo(center.dx + 34, center.dy)
      ..lineTo(center.dx, center.dy + 17)
      ..lineTo(center.dx - 34, center.dy)
      ..close();
    canvas.drawPath(
      selection,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..color = color,
    );
  }

  void _paintRain(Canvas canvas, Rect clip) {
    final Paint rain = Paint()
      ..color = const Color(0x5590E0EF)
      ..strokeWidth = 1.5;
    for (double x = clip.left - 30; x < clip.right + 30; x += 28) {
      canvas.drawLine(Offset(x, clip.top), Offset(x - 35, clip.bottom), rain);
    }
  }

  @override
  bool shouldRepaint(_SanctuaryPainter oldDelegate) => true;
}

class _MacroDeck extends StatelessWidget {
  const _MacroDeck({
    required this.engine,
    required this.page,
    required this.building,
    required this.power,
    required this.tool,
    required this.onPage,
    required this.onBuilding,
    required this.onPower,
    required this.onTool,
  });

  final SanctuaryEngine engine;
  final _DeckPage page;
  final BuildingKind? building;
  final GodPower? power;
  final _WorldTool tool;
  final ValueChanged<_DeckPage> onPage;
  final ValueChanged<BuildingKind> onBuilding;
  final ValueChanged<GodPower> onPower;
  final ValueChanged<_WorldTool> onTool;

  @override
  Widget build(BuildContext context) {
    final double bottom = MediaQuery.paddingOf(context).bottom;
    return Container(
      height: 158 + bottom,
      padding: EdgeInsets.fromLTRB(10, 7, 10, 8 + bottom),
      decoration: const BoxDecoration(
        color: Color(0xFF090A10),
        border: Border(top: BorderSide(color: Color(0xFF292A34))),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Color(0xAA000000),
            blurRadius: 18,
            offset: Offset(0, -6),
          ),
        ],
      ),
      child: Column(
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: _DeckTab(
                  icon: Icons.construction_rounded,
                  label: 'BUILD',
                  selected: page == _DeckPage.build,
                  onTap: () => onPage(_DeckPage.build),
                ),
              ),
              const SizedBox(width: 5),
              Expanded(
                child: _DeckTab(
                  icon: Icons.donut_large_rounded,
                  label: 'HEARTH',
                  selected: page == _DeckPage.directives,
                  onTap: () => onPage(_DeckPage.directives),
                ),
              ),
              const SizedBox(width: 5),
              Expanded(
                child: _DeckTab(
                  icon: Icons.auto_awesome_rounded,
                  label: 'POWERS',
                  selected: page == _DeckPage.powers,
                  onTap: () => onPage(_DeckPage.powers),
                ),
              ),
              const SizedBox(width: 8),
              _ThreatPill(engine: engine),
            ],
          ),
          const SizedBox(height: 7),
          Expanded(
            child: page == _DeckPage.powers
                ? _PowerRail(
                    engine: engine,
                    selected: power,
                    onSelected: onPower,
                  )
                : _BuildRail(
                    engine: engine,
                    selected: building,
                    tool: tool,
                    onSelected: onBuilding,
                    onTool: onTool,
                  ),
          ),
        ],
      ),
    );
  }
}

class _DeckTab extends StatelessWidget {
  const _DeckTab({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(11),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 7),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFF00E0C2).withValues(alpha: 0.13)
              : const Color(0xFF13141B),
          borderRadius: BorderRadius.circular(11),
          border: Border.all(
            color: selected ? const Color(0xFF00BFA5) : const Color(0xFF262730),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Icon(
              icon,
              color: selected
                  ? const Color(0xFF3FE4C9)
                  : const Color(0xFF6F7380),
              size: 14,
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: selected
                    ? const Color(0xFFDDFBF5)
                    : const Color(0xFF747884),
                fontSize: 8,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.6,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ThreatPill extends StatelessWidget {
  const _ThreatPill({required this.engine});

  final SanctuaryEngine engine;

  @override
  Widget build(BuildContext context) {
    final bool night = engine.phase == SanctuaryPhase.night;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
      decoration: BoxDecoration(
        color: (night ? const Color(0xFFFF4D68) : const Color(0xFF4C5260))
            .withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(11),
      ),
      child: Text(
        night
            ? 'THREAT ${engine.activeThreat}'
            : 'POP ${engine.citizens.length}/${engine.populationCapacity}',
        style: TextStyle(
          color: night ? const Color(0xFFFF7085) : const Color(0xFFA0A5AF),
          fontSize: 8,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _BuildRail extends StatelessWidget {
  const _BuildRail({
    required this.engine,
    required this.selected,
    required this.tool,
    required this.onSelected,
    required this.onTool,
  });

  final SanctuaryEngine engine;
  final BuildingKind? selected;
  final _WorldTool tool;
  final ValueChanged<BuildingKind> onSelected;
  final ValueChanged<_WorldTool> onTool;

  @override
  Widget build(BuildContext context) {
    const List<BuildingKind> buildable = <BuildingKind>[
      BuildingKind.palisade,
      BuildingKind.spikeTrench,
      BuildingKind.arrowTower,
      BuildingKind.cottage,
      BuildingKind.farm,
      BuildingKind.stockpile,
      BuildingKind.sawmill,
      BuildingKind.masonryYard,
      BuildingKind.rampart,
      BuildingKind.gate,
      BuildingKind.tarPit,
      BuildingKind.ballista,
      BuildingKind.catapult,
      BuildingKind.frostSpire,
      BuildingKind.solarBeacon,
      BuildingKind.shrine,
    ];
    return ListView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      children: <Widget>[
        _ToolChip(
          icon: Icons.content_cut_rounded,
          label: 'Clear',
          detail: '+goods',
          color: const Color(0xFFFFC15A),
          selected: selected == null && tool == _WorldTool.clear,
          onTap: () => onTool(_WorldTool.clear),
        ),
        const SizedBox(width: 6),
        _ToolChip(
          icon: Icons.blur_on_rounded,
          label: 'Purify',
          detail: '8 mana',
          color: const Color(0xFFB76CF0),
          selected: selected == null && tool == _WorldTool.purify,
          onTap: () => onTool(_WorldTool.purify),
        ),
        const SizedBox(width: 6),
        for (int index = 0; index < buildable.length; index++) ...<Widget>[
          _ToolChip(
            key: ValueKey<String>('sanctuary-build-${buildable[index].name}'),
            icon: _buildingIcon(buildable[index]),
            label: buildable[index].shortLabel,
            detail: buildable[index].cost.compact,
            color: _buildingColor(buildable[index]),
            selected: selected == buildable[index],
            enabled: engine.resources.canAfford(buildable[index].cost),
            onTap: () => onSelected(buildable[index]),
          ),
          if (index != buildable.length - 1) const SizedBox(width: 6),
        ],
      ],
    );
  }
}

class _PowerRail extends StatelessWidget {
  const _PowerRail({
    required this.engine,
    required this.selected,
    required this.onSelected,
  });

  final SanctuaryEngine engine;
  final GodPower? selected;
  final ValueChanged<GodPower> onSelected;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      itemCount: GodPower.values.length,
      separatorBuilder: (_, _) => const SizedBox(width: 7),
      itemBuilder: (BuildContext context, int index) {
        final GodPower power = GodPower.values[index];
        return _ToolChip(
          key: ValueKey<String>('sanctuary-power-${power.name}'),
          icon: _powerIcon(power),
          label: power.label,
          detail: '${power.manaCost} mana',
          color: _powerColor(power),
          selected: selected == power,
          enabled: engine.resources.mana >= power.manaCost,
          onTap: () => onSelected(power),
        );
      },
    );
  }
}

class _ToolChip extends StatelessWidget {
  const _ToolChip({
    super.key,
    required this.icon,
    required this.label,
    required this.detail,
    required this.color,
    required this.selected,
    required this.onTap,
    this.enabled = true,
  });

  final IconData icon;
  final String label;
  final String detail;
  final Color color;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.42,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(15),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: 84,
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 7),
          decoration: BoxDecoration(
            color: selected
                ? color.withValues(alpha: 0.16)
                : const Color(0xFF12141C),
            borderRadius: BorderRadius.circular(15),
            border: Border.all(
              color: selected ? color : const Color(0xFF282B36),
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Icon(icon, color: color, size: 19),
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFFE3E4E4),
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                detail,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xFF747A87), fontSize: 7),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DirectiveSlider extends StatelessWidget {
  const _DirectiveSlider({
    required this.role,
    required this.value,
    required this.onChanged,
  });

  final CitizenRole role;
  final double value;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final Color color = _roleColor(role);
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Row(
        children: <Widget>[
          Container(
            width: 35,
            height: 35,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.13),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(_roleIcon(role), color: color, size: 18),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 66,
            child: Text(
              _roleLabel(role),
              style: const TextStyle(
                color: Color(0xFFE5E5DF),
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          Expanded(
            child: Slider(
              value: value,
              min: 0,
              max: 100,
              divisions: 20,
              activeColor: color,
              onChanged: onChanged,
            ),
          ),
          SizedBox(
            width: 35,
            child: Text(
              '${value.round()}%',
              textAlign: TextAlign.right,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WorldToast extends StatelessWidget {
  const _WorldToast({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xEA11131C),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: const Color(0xFF353947)),
          boxShadow: const <BoxShadow>[
            BoxShadow(color: Color(0x99000000), blurRadius: 16),
          ],
        ),
        child: Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Color(0xFFEAEAE5),
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _PauseScrim extends StatelessWidget {
  const _PauseScrim({required this.onResume});

  final VoidCallback onResume;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xCC080810),
      child: Center(
        child: FilledButton.icon(
          onPressed: onResume,
          icon: const Icon(Icons.play_arrow_rounded),
          label: const Text('RESUME SURVEY'),
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFF00D8BB),
            foregroundColor: const Color(0xFF04130F),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 15),
          ),
        ),
      ),
    );
  }
}

class _FallenOverlay extends StatelessWidget {
  const _FallenOverlay({
    required this.engine,
    required this.onConstellation,
    required this.onNew,
    required this.onExit,
  });

  final SanctuaryEngine engine;
  final VoidCallback onConstellation;
  final VoidCallback onNew;
  final VoidCallback onExit;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xEE08050D),
      child: Center(
        child: Container(
          width: min(MediaQuery.sizeOf(context).width - 34, 370),
          margin: const EdgeInsets.all(17),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF15101A),
            borderRadius: BorderRadius.circular(27),
            border: Border.all(color: const Color(0xFF6D233C)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Icon(
                Icons.local_fire_department_rounded,
                color: Color(0xFFFF5400),
                size: 43,
              ),
              const SizedBox(height: 10),
              const Text(
                'THE HEARTH HAS FALLEN',
                style: TextStyle(
                  color: Color(0xFFFF7889),
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.4,
                ),
              ),
              const SizedBox(height: 7),
              Text(
                'Day ${engine.day}',
                style: const TextStyle(
                  color: Color(0xFFF4F1DE),
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                '${engine.totalEnemiesDefeated} abyssals defeated · ${engine.ancestralShards} shards held',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF9A909C), fontSize: 11),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onConstellation,
                  icon: const Icon(Icons.auto_awesome_rounded),
                  label: Text(
                    'ANCESTRAL CONSTELLATION · ${engine.ancestralShards}',
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: onNew,
                  child: const Text('LIGHT ANOTHER HEARTH'),
                ),
              ),
              TextButton(
                onPressed: onExit,
                child: const Text('RETURN TO TITLE'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _UpgradeRow extends StatelessWidget {
  const _UpgradeRow({
    required this.upgrade,
    required this.rank,
    required this.cost,
    required this.canBuy,
    required this.onBuy,
  });

  final AncestralUpgrade upgrade;
  final int rank;
  final int cost;
  final bool canBuy;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1723),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: const Color(0xFF342D42)),
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: const Color(0xFFB76CF0).withValues(alpha: 0.13),
              borderRadius: BorderRadius.circular(11),
            ),
            child: const Icon(
              Icons.star_rounded,
              color: Color(0xFFC889F2),
              size: 20,
            ),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  '${upgrade.label} · $rank/${upgrade.maxRank}',
                  style: const TextStyle(
                    color: Color(0xFFECE9EF),
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  upgrade.detail,
                  style: const TextStyle(color: Color(0xFF8F8799), fontSize: 9),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: canBuy ? onBuy : null,
            style: FilledButton.styleFrom(
              minimumSize: const Size(58, 38),
              padding: const EdgeInsets.symmetric(horizontal: 10),
              backgroundColor: const Color(0xFF7A3FA2),
            ),
            child: Text(
              rank >= upgrade.maxRank ? 'MAX' : '$cost ✦',
              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900),
            ),
          ),
        ],
      ),
    );
  }
}

String _phaseAnnouncement(SanctuaryPhase phase) => switch (phase) {
  SanctuaryPhase.day => 'The workday begins',
  SanctuaryPhase.dusk => 'Dusk horn · citizens retreat',
  SanctuaryPhase.night => 'The abyss is moving',
  SanctuaryPhase.dawn => 'Dawn breaks over the walls',
  SanctuaryPhase.fallen => 'The Hearth has fallen',
};

Color _phaseColor(SanctuaryPhase phase) => switch (phase) {
  SanctuaryPhase.day => const Color(0xFFFFCC66),
  SanctuaryPhase.dusk => const Color(0xFFFF8A5C),
  SanctuaryPhase.night => const Color(0xFFA878FF),
  SanctuaryPhase.dawn => const Color(0xFF00F5D4),
  SanctuaryPhase.fallen => const Color(0xFFFF4D68),
};

IconData _phaseIcon(SanctuaryPhase phase) => switch (phase) {
  SanctuaryPhase.day => Icons.wb_sunny_rounded,
  SanctuaryPhase.dusk => Icons.wb_twilight_rounded,
  SanctuaryPhase.night => Icons.nights_stay_rounded,
  SanctuaryPhase.dawn => Icons.wb_twilight_rounded,
  SanctuaryPhase.fallen => Icons.local_fire_department_rounded,
};

Color _phaseBackground(SanctuaryPhase phase) => switch (phase) {
  SanctuaryPhase.day => const Color(0xFF17251D),
  SanctuaryPhase.dusk => const Color(0xFF211725),
  SanctuaryPhase.night => const Color(0xFF070611),
  SanctuaryPhase.dawn => const Color(0xFF142127),
  SanctuaryPhase.fallen => const Color(0xFF11070B),
};

IconData _buildingIcon(BuildingKind kind) => switch (kind) {
  BuildingKind.hearth => Icons.local_fire_department_rounded,
  BuildingKind.cottage => Icons.cottage_rounded,
  BuildingKind.stockpile => Icons.inventory_2_rounded,
  BuildingKind.farm => Icons.grass_rounded,
  BuildingKind.sawmill => Icons.carpenter_rounded,
  BuildingKind.masonryYard => Icons.view_in_ar_rounded,
  BuildingKind.palisade => Icons.fence_rounded,
  BuildingKind.rampart => Icons.foundation_rounded,
  BuildingKind.gate => Icons.door_sliding_rounded,
  BuildingKind.spikeTrench => Icons.warning_rounded,
  BuildingKind.tarPit => Icons.water_drop_rounded,
  BuildingKind.arrowTower => Icons.gps_fixed_rounded,
  BuildingKind.ballista => Icons.adjust_rounded,
  BuildingKind.catapult => Icons.sports_baseball_rounded,
  BuildingKind.frostSpire => Icons.ac_unit_rounded,
  BuildingKind.solarBeacon => Icons.flare_rounded,
  BuildingKind.shrine => Icons.auto_awesome_rounded,
};

Color _buildingColor(BuildingKind kind) => switch (kind) {
  BuildingKind.palisade ||
  BuildingKind.cottage ||
  BuildingKind.stockpile => const Color(0xFFC58B67),
  BuildingKind.sawmill => const Color(0xFFB77A57),
  BuildingKind.masonryYard => const Color(0xFFD6D1C2),
  BuildingKind.rampart || BuildingKind.gate => const Color(0xFFF4F1DE),
  BuildingKind.arrowTower ||
  BuildingKind.ballista ||
  BuildingKind.catapult => const Color(0xFFFFB45D),
  BuildingKind.frostSpire => const Color(0xFF90E0EF),
  BuildingKind.solarBeacon => const Color(0xFFFFD35C),
  BuildingKind.shrine => const Color(0xFF00F5D4),
  BuildingKind.farm => const Color(0xFF84C66D),
  BuildingKind.spikeTrench || BuildingKind.tarPit => const Color(0xFFFF795F),
  BuildingKind.hearth => const Color(0xFFFF5400),
};

IconData _powerIcon(GodPower power) => switch (power) {
  GodPower.lightning => Icons.bolt_rounded,
  GodPower.rain => Icons.thunderstorm_rounded,
  GodPower.fissure => Icons.multiple_stop_rounded,
  GodPower.meteor => Icons.whatshot_rounded,
};

Color _powerColor(GodPower power) => switch (power) {
  GodPower.lightning => const Color(0xFFFFE36D),
  GodPower.rain => const Color(0xFF90E0EF),
  GodPower.fissure => const Color(0xFFB56BE2),
  GodPower.meteor => const Color(0xFFFF5400),
};

Color _roleColor(CitizenRole role) => switch (role) {
  CitizenRole.harvester => const Color(0xFF70C77B),
  CitizenRole.builder => const Color(0xFFFFC15A),
  CitizenRole.hauler => const Color(0xFF90E0EF),
  CitizenRole.acolyte => const Color(0xFFB981E8),
};

IconData _roleIcon(CitizenRole role) => switch (role) {
  CitizenRole.harvester => Icons.forest_rounded,
  CitizenRole.builder => Icons.construction_rounded,
  CitizenRole.hauler => Icons.local_shipping_rounded,
  CitizenRole.acolyte => Icons.auto_awesome_rounded,
};

String _roleLabel(CitizenRole role) => switch (role) {
  CitizenRole.harvester => 'Harvest',
  CitizenRole.builder => 'Build',
  CitizenRole.hauler => 'Haul',
  CitizenRole.acolyte => 'Pray',
};
