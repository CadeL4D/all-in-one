import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/local_store.dart';
import 'gridlock_engine.dart';
import 'gridlock_models.dart';

class GridlockApp extends StatefulWidget {
  const GridlockApp({super.key});

  @override
  State<GridlockApp> createState() => _GridlockAppState();
}

class _GridlockAppState extends State<GridlockApp>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late final AnimationController _ticker;
  late final GridlockEngine _engine;
  Duration? _lastFrame;
  GridlockPhase _lastPhase = GridlockPhase.idle;
  GridlockStats _stats = const GridlockStats();
  bool _loaded = false;
  bool _runSaved = false;
  bool _newBest = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _engine = GridlockEngine();
    _loadStats();
    _ticker = AnimationController.unbounded(vsync: this)
      ..addListener(_frame)
      ..repeat(min: 0, max: 100000, period: const Duration(days: 1));
  }

  Future<void> _loadStats() async {
    final Map<String, dynamic>? saved = await LocalStore.readJsonMap(
      LocalStore.gridlockKey,
    );
    if (!mounted) {
      return;
    }
    setState(() {
      _stats = saved == null
          ? const GridlockStats()
          : GridlockStats.fromJson(saved);
      _loaded = true;
    });
  }

  void _frame() {
    final Duration now = _ticker.lastElapsedDuration ?? Duration.zero;
    final double dt = _lastFrame == null
        ? 0
        : (now - _lastFrame!).inMicroseconds / Duration.microsecondsPerSecond;
    _lastFrame = now;
    if (_engine.phase != GridlockPhase.idle &&
        _engine.phase != GridlockPhase.gameOver) {
      _engine.tick(dt);
    }
    if (_engine.phase != _lastPhase) {
      _handlePhaseChange(_lastPhase, _engine.phase);
      _lastPhase = _engine.phase;
    }
    if (mounted && _engine.phase != GridlockPhase.idle) {
      setState(() {});
    }
  }

  void _handlePhaseChange(GridlockPhase from, GridlockPhase to) {
    switch (to) {
      case GridlockPhase.input:
        HapticFeedback.selectionClick();
      case GridlockPhase.roundWon:
        HapticFeedback.mediumImpact();
        SystemSound.play(SystemSoundType.click);
      case GridlockPhase.gameOver:
        HapticFeedback.heavyImpact();
        unawaited(_saveRun());
      case GridlockPhase.idle:
      case GridlockPhase.getReady:
      case GridlockPhase.showing:
        break;
    }
  }

  Future<void> _saveRun() async {
    if (_runSaved) {
      return;
    }
    _runSaved = true;
    final int previousBest = _stats.highScoreFor(_engine.decoysEnabled);
    final GridlockRun run = GridlockRun(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      score: _engine.score,
      rounds: _engine.roundsCompleted,
      longestPath: _engine.path.length,
      decoys: _engine.decoysEnabled,
      durationSeconds: _engine.elapsedSeconds.ceil(),
      playedAt: DateTime.now(),
    );
    final GridlockStats updated = _stats.record(run);
    if (mounted) {
      setState(() {
        _newBest = run.score > previousBest;
        _stats = updated;
      });
    } else {
      _stats = updated;
    }
    await LocalStore.writeJsonMap(LocalStore.gridlockKey, updated.toJson());
  }

  void _startGame() {
    _runSaved = false;
    _newBest = false;
    _lastPhase = GridlockPhase.getReady;
    _engine.start(withDecoys: _stats.decoysEnabled);
    HapticFeedback.mediumImpact();
    setState(() {});
  }

  Future<void> _setDecoys(bool value) async {
    final GridlockStats updated = _stats.withDecoys(value);
    setState(() => _stats = updated);
    await LocalStore.writeJsonMap(LocalStore.gridlockKey, updated.toJson());
  }

  void _returnToLobby() {
    _engine.returnToIdle();
    _lastPhase = GridlockPhase.idle;
    setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed &&
        _engine.phase != GridlockPhase.idle &&
        _engine.phase != GridlockPhase.gameOver) {
      _engine.returnToIdle();
      _lastPhase = GridlockPhase.idle;
      if (mounted) {
        setState(() {});
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(
        scaffoldBackgroundColor: const Color(0xFF080B15),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF5AE6D3),
          brightness: Brightness.dark,
          surface: const Color(0xFF111625),
        ),
      ),
      child: Scaffold(
        body: SafeArea(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 320),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            child: _engine.phase == GridlockPhase.idle
                ? _Lobby(
                    key: const ValueKey<String>('gridlock-lobby'),
                    stats: _stats,
                    loaded: _loaded,
                    onDecoysChanged: _setDecoys,
                    onStart: _startGame,
                  )
                : _Game(
                    key: const ValueKey<String>('gridlock-game'),
                    engine: _engine,
                    bestScore: _stats.highScoreFor(_engine.decoysEnabled),
                    newBest: _newBest,
                    onTile: (int tile) {
                      final bool correct = _engine.tapTile(tile);
                      if (correct) {
                        HapticFeedback.selectionClick();
                      } else if (_engine.phase == GridlockPhase.gameOver) {
                        _handlePhaseChange(_lastPhase, GridlockPhase.gameOver);
                        _lastPhase = GridlockPhase.gameOver;
                      }
                      setState(() {});
                    },
                    onRetry: _startGame,
                    onLobby: _returnToLobby,
                  ),
          ),
        ),
      ),
    );
  }
}

class _Lobby extends StatelessWidget {
  const _Lobby({
    super.key,
    required this.stats,
    required this.loaded,
    required this.onDecoysChanged,
    required this.onStart,
  });

  final GridlockStats stats;
  final bool loaded;
  final ValueChanged<bool> onDecoysChanged;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: <Widget>[
        SliverToBoxAdapter(
          child: _LobbyHeader(onBack: () => Navigator.of(context).pop()),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 30),
          sliver: SliverList.list(
            children: <Widget>[
              const _HeroPanel(),
              const SizedBox(height: 16),
              _ModeSelector(
                enabled: stats.decoysEnabled,
                onChanged: onDecoysChanged,
              ),
              const SizedBox(height: 12),
              Row(
                children: <Widget>[
                  Expanded(
                    child: _BestCard(
                      label: 'MEMORY BEST',
                      score: stats.memoryHighScore,
                      icon: Icons.psychology_rounded,
                      color: const Color(0xFF5AE6D3),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _BestCard(
                      label: 'DECOY BEST',
                      score: stats.decoyHighScore,
                      icon: Icons.warning_amber_rounded,
                      color: const Color(0xFFFF6B7A),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  key: const ValueKey<String>('gridlock-start'),
                  onPressed: loaded ? onStart : null,
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: Text(
                    stats.decoysEnabled
                        ? 'START WITH DECOYS'
                        : 'START MEMORY RUN',
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: stats.decoysEnabled
                        ? const Color(0xFFFF6B7A)
                        : const Color(0xFF5AE6D3),
                    foregroundColor: const Color(0xFF07110F),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    textStyle: const TextStyle(
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.7,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const _SectionTitle(
                title: 'How it works',
                trailing: 'SIMON, ON A GRID',
              ),
              const SizedBox(height: 10),
              const _HowToPanel(),
              const SizedBox(height: 24),
              _SectionTitle(
                title: 'Recent plays',
                trailing: '${stats.recentRuns.length}/5',
              ),
              const SizedBox(height: 10),
              if (stats.recentRuns.isEmpty)
                const _EmptyRecents()
              else
                for (
                  int index = 0;
                  index < stats.recentRuns.length;
                  index++
                ) ...<Widget>[
                  _RecentRunCard(run: stats.recentRuns[index], index: index),
                  if (index != stats.recentRuns.length - 1)
                    const SizedBox(height: 8),
                ],
            ],
          ),
        ),
      ],
    );
  }
}

class _LobbyHeader extends StatelessWidget {
  const _LobbyHeader({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 7, 18, 8),
      child: Row(
        children: <Widget>[
          IconButton.filledTonal(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back_rounded, size: 20),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'SIMON',
                  style: TextStyle(
                    color: Color(0xFFF4F6FF),
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.1,
                  ),
                ),
                Text(
                  'PURE SEQUENCE MEMORY',
                  style: TextStyle(
                    color: Color(0xFF71798F),
                    fontSize: 8,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.25,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Color(0xFF13192A),
              borderRadius: BorderRadius.all(Radius.circular(99)),
            ),
            child: Text(
              '4 × 4',
              style: TextStyle(
                color: Color(0xFF5AE6D3),
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

class _HeroPanel extends StatelessWidget {
  const _HeroPanel();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 188,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[
            Color(0xFF17233B),
            Color(0xFF101427),
            Color(0xFF261A3D),
          ],
        ),
        border: Border.all(color: const Color(0xFF303A56)),
      ),
      child: Stack(
        children: <Widget>[
          const Positioned(right: -22, top: -20, child: _MiniGrid()),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: <Color>[
                    const Color(0xFF0D1220).withValues(alpha: 0.96),
                    const Color(0xFF0D1220).withValues(alpha: 0.20),
                  ],
                ),
              ),
            ),
          ),
          const Positioned(
            left: 20,
            right: 80,
            bottom: 20,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'WATCH. REMEMBER. REPEAT.',
                  style: TextStyle(
                    color: Color(0xFF5AE6D3),
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.6,
                  ),
                ),
                SizedBox(height: 7),
                Text(
                  'One more turn.\nEvery round.',
                  style: TextStyle(
                    color: Color(0xFFF4F6FF),
                    fontSize: 27,
                    height: 1.04,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.7,
                  ),
                ),
                SizedBox(height: 9),
                Text(
                  'Remember an unrestricted sequence that grows by one square every round. Squares can jump or repeat.',
                  style: TextStyle(
                    color: Color(0xFFAAB1C2),
                    fontSize: 11,
                    height: 1.3,
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

class _MiniGrid extends StatelessWidget {
  const _MiniGrid();

  @override
  Widget build(BuildContext context) {
    return Transform.rotate(
      angle: -0.12,
      child: SizedBox(
        width: 190,
        height: 190,
        child: GridView.builder(
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            mainAxisSpacing: 6,
            crossAxisSpacing: 6,
          ),
          itemCount: 16,
          itemBuilder: (_, int index) => DecoratedBox(
            decoration: BoxDecoration(
              color: <int>{5, 6, 10}.contains(index)
                  ? const Color(0xFF5AE6D3).withValues(alpha: 0.65)
                  : const Color(0xFF29324A).withValues(alpha: 0.62),
              borderRadius: BorderRadius.circular(9),
              border: Border.all(color: const Color(0xFF536078)),
            ),
          ),
        ),
      ),
    );
  }
}

class _ModeSelector extends StatelessWidget {
  const _ModeSelector({required this.enabled, required this.onChanged});

  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: const Color(0xFF101522),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF252D42)),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: _ModeOption(
              key: const ValueKey<String>('gridlock-memory-mode'),
              selected: !enabled,
              icon: Icons.psychology_rounded,
              label: 'Pure memory',
              color: const Color(0xFF5AE6D3),
              onTap: () => onChanged(false),
            ),
          ),
          Expanded(
            child: _ModeOption(
              key: const ValueKey<String>('gridlock-decoy-mode'),
              selected: enabled,
              icon: Icons.warning_amber_rounded,
              label: 'Decoys on',
              color: const Color(0xFFFF6B7A),
              onTap: () => onChanged(true),
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeOption extends StatelessWidget {
  const _ModeOption({
    super.key,
    required this.selected,
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final bool selected;
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 11),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected
                ? color.withValues(alpha: 0.65)
                : Colors.transparent,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Icon(
              icon,
              color: selected ? color : const Color(0xFF6E768A),
              size: 17,
            ),
            const SizedBox(width: 7),
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: selected
                      ? const Color(0xFFF2F5FF)
                      : const Color(0xFF7F879B),
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BestCard extends StatelessWidget {
  const _BestCard({
    required this.label,
    required this.score,
    required this.icon,
    required this.color,
  });

  final String label;
  final int score;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF101522),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF252D42)),
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                score.toString().padLeft(4, '0'),
                style: const TextStyle(
                  color: Color(0xFFF2F4FB),
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                label,
                style: const TextStyle(
                  color: Color(0xFF71798D),
                  fontSize: 7,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.7,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.trailing});

  final String title;
  final String trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              color: Color(0xFFF0F2F8),
              fontSize: 15,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        Text(
          trailing,
          style: const TextStyle(
            color: Color(0xFF697187),
            fontSize: 8,
            fontWeight: FontWeight.w900,
            letterSpacing: 1,
          ),
        ),
      ],
    );
  }
}

class _HowToPanel extends StatelessWidget {
  const _HowToPanel();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF101522),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF252D42)),
      ),
      child: const Column(
        children: <Widget>[
          _HowToRow(
            number: '01',
            title: 'Watch the sequence',
            detail: 'One square flashes in the first round.',
          ),
          _HowDivider(),
          _HowToRow(
            number: '02',
            title: 'Repeat every tile',
            detail: 'Tap the same squares in the exact order.',
          ),
          _HowDivider(),
          _HowToRow(
            number: '03',
            title: 'Add one more',
            detail: 'Each clear adds one completely independent square.',
          ),
          _HowDivider(),
          _HowToRow(
            number: '04',
            title: 'Beat the clock',
            detail: 'You get three seconds for each next tap.',
          ),
        ],
      ),
    );
  }
}

class _HowToRow extends StatelessWidget {
  const _HowToRow({
    required this.number,
    required this.title,
    required this.detail,
  });

  final String number;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        Text(
          number,
          style: const TextStyle(
            color: Color(0xFF5AE6D3),
            fontSize: 10,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(width: 13),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFFE9ECF4),
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                detail,
                style: const TextStyle(
                  color: Color(0xFF7F879A),
                  fontSize: 10,
                  height: 1.25,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _HowDivider extends StatelessWidget {
  const _HowDivider();

  @override
  Widget build(BuildContext context) =>
      const Divider(height: 20, color: Color(0xFF252C3D));
}

class _EmptyRecents extends StatelessWidget {
  const _EmptyRecents();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFF101522),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF252D42)),
      ),
      child: const Text(
        'Your last five runs will appear here.',
        style: TextStyle(color: Color(0xFF737B8E), fontSize: 11),
      ),
    );
  }
}

class _RecentRunCard extends StatelessWidget {
  const _RecentRunCard({required this.run, required this.index});

  final GridlockRun run;
  final int index;

  @override
  Widget build(BuildContext context) {
    final Color color = run.decoys
        ? const Color(0xFFFF6B7A)
        : const Color(0xFF5AE6D3);
    return Container(
      key: ValueKey<String>('gridlock-run-${run.id}'),
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
      decoration: BoxDecoration(
        color: const Color(0xFF101522),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF252D42)),
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 29,
            height: 29,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.13),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Text(
              '${index + 1}',
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  run.decoys ? 'Decoy run' : 'Memory run',
                  style: const TextStyle(
                    color: Color(0xFFE9ECF4),
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  '${run.rounds} rounds  •  sequence ${run.longestPath}  •  ${_formatDuration(run.durationSeconds)}',
                  style: const TextStyle(color: Color(0xFF737B90), fontSize: 9),
                ),
              ],
            ),
          ),
          Text(
            run.score.toString().padLeft(4, '0'),
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _Game extends StatelessWidget {
  const _Game({
    super.key,
    required this.engine,
    required this.bestScore,
    required this.newBest,
    required this.onTile,
    required this.onRetry,
    required this.onLobby,
  });

  final GridlockEngine engine;
  final int bestScore;
  final bool newBest;
  final ValueChanged<int> onTile;
  final VoidCallback onRetry;
  final VoidCallback onLobby;

  @override
  Widget build(BuildContext context) {
    final bool gameOver = engine.phase == GridlockPhase.gameOver;
    return Stack(
      children: <Widget>[
        Positioned.fill(
          child: Column(
            children: <Widget>[
              _GameHeader(
                engine: engine,
                bestScore: bestScore,
                onClose: onLobby,
              ),
              Expanded(
                child: LayoutBuilder(
                  builder: (BuildContext context, BoxConstraints constraints) {
                    final double boardSize = min(
                      constraints.maxWidth - 28,
                      constraints.maxHeight - 128,
                    ).clamp(240, 430);
                    return Column(
                      children: <Widget>[
                        const SizedBox(height: 10),
                        _TurnStatus(engine: engine),
                        const Spacer(),
                        SizedBox.square(
                          dimension: boardSize,
                          child: _Board(engine: engine, onTile: onTile),
                        ),
                        const Spacer(),
                        _GameFooter(engine: engine),
                        const SizedBox(height: 15),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        if (gameOver)
          Positioned.fill(
            child: _GameOver(
              engine: engine,
              bestScore: bestScore,
              newBest: newBest,
              onRetry: onRetry,
              onLobby: onLobby,
            ),
          ),
      ],
    );
  }
}

class _GameHeader extends StatelessWidget {
  const _GameHeader({
    required this.engine,
    required this.bestScore,
    required this.onClose,
  });

  final GridlockEngine engine;
  final int bestScore;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 7, 12, 6),
      child: Row(
        children: <Widget>[
          IconButton.filledTonal(
            onPressed: onClose,
            icon: const Icon(Icons.close_rounded, size: 20),
          ),
          const SizedBox(width: 8),
          _GameStat(
            label: 'SCORE',
            value: engine.score.toString().padLeft(4, '0'),
            color: const Color(0xFFF2F4FA),
          ),
          const SizedBox(width: 6),
          _GameStat(
            label: 'ROUND',
            value: '${engine.path.length}',
            color: const Color(0xFF5AE6D3),
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: <Widget>[
              Text(
                'BEST ${bestScore.toString().padLeft(4, '0')}',
                style: const TextStyle(
                  color: Color(0xFF8B93A7),
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.7,
                ),
              ),
              const SizedBox(height: 3),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color:
                      (engine.decoysEnabled
                              ? const Color(0xFFFF6B7A)
                              : const Color(0xFF5AE6D3))
                          .withValues(alpha: 0.13),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(
                  engine.decoysEnabled ? 'DECOYS' : 'MEMORY',
                  style: TextStyle(
                    color: engine.decoysEnabled
                        ? const Color(0xFFFF7886)
                        : const Color(0xFF62E8D6),
                    fontSize: 8,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.7,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _GameStat extends StatelessWidget {
  const _GameStat({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF111624),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF262E42)),
      ),
      child: Column(
        children: <Widget>[
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF677087),
              fontSize: 7,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.7,
            ),
          ),
        ],
      ),
    );
  }
}

class _TurnStatus extends StatelessWidget {
  const _TurnStatus({required this.engine});

  final GridlockEngine engine;

  @override
  Widget build(BuildContext context) {
    final bool input = engine.phase == GridlockPhase.input;
    final Color color = input
        ? const Color(0xFF5AE6D3)
        : const Color(0xFF9B82FF);
    return Column(
      children: <Widget>[
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          child: Text(
            engine.instruction.toUpperCase(),
            key: ValueKey<GridlockPhase>(engine.phase),
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.7,
            ),
          ),
        ),
        const SizedBox(height: 7),
        Text(
          input
              ? '${engine.inputIndex + 1} OF ${engine.path.length}'
              : 'ROUND ${engine.level}',
          style: const TextStyle(
            color: Color(0xFFF1F3F9),
            fontSize: 22,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.5,
          ),
        ),
      ],
    );
  }
}

class _Board extends StatelessWidget {
  const _Board({required this.engine, required this.onTile});

  final GridlockEngine engine;
  final ValueChanged<int> onTile;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(9),
      decoration: BoxDecoration(
        color: const Color(0xFF0D111E),
        borderRadius: BorderRadius.circular(27),
        border: Border.all(color: const Color(0xFF283149), width: 1.4),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x77000000),
            blurRadius: 28,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: GridView.builder(
        physics: const NeverScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 4,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
        ),
        itemCount: GridlockEngine.tileCount,
        itemBuilder: (BuildContext context, int index) {
          final bool active = engine.activeTile == index;
          final bool decoy = engine.decoyTile == index;
          final bool entered =
              engine.phase == GridlockPhase.input &&
              engine.path.take(engine.inputIndex).contains(index);
          final bool enabled = engine.phase == GridlockPhase.input;
          return _GridTile(
            key: ValueKey<String>('gridlock-tile-$index'),
            active: active,
            decoy: decoy,
            entered: entered,
            enabled: enabled,
            onTap: () => onTile(index),
          );
        },
      ),
    );
  }
}

class _GridTile extends StatelessWidget {
  const _GridTile({
    super.key,
    required this.active,
    required this.decoy,
    required this.entered,
    required this.enabled,
    required this.onTap,
  });

  final bool active;
  final bool decoy;
  final bool entered;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final Color glow = decoy
        ? const Color(0xFFFF5267)
        : const Color(0xFF5AE6D3);
    final Color top = decoy
        ? const Color(0xFFFF6678)
        : active
        ? const Color(0xFF7EFFE9)
        : entered
        ? const Color(0xFF245A58)
        : const Color(0xFF1A2236);
    final Color bottom = decoy
        ? const Color(0xFF8F263D)
        : active
        ? const Color(0xFF24AFA5)
        : entered
        ? const Color(0xFF153C3D)
        : const Color(0xFF111625);
    return Semantics(
      button: true,
      enabled: enabled,
      label: decoy ? 'Decoy tile' : 'Grid tile',
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: enabled ? onTap : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 110),
          curve: Curves.easeOut,
          transform: Matrix4.translationValues(0, active || decoy ? -3 : 0, 0),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: <Color>[top, bottom],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: active || decoy
                  ? glow.withValues(alpha: 0.9)
                  : entered
                  ? const Color(0xFF3D8F89)
                  : const Color(0xFF303B55),
              width: active || decoy ? 2 : 1,
            ),
            boxShadow: <BoxShadow>[
              const BoxShadow(
                color: Color(0x99000000),
                blurRadius: 5,
                offset: Offset(0, 5),
              ),
              if (active || decoy)
                BoxShadow(
                  color: glow.withValues(alpha: 0.48),
                  blurRadius: 20,
                  spreadRadius: 1,
                ),
            ],
          ),
          child: Center(
            child: AnimatedScale(
              scale: active || decoy ? 1 : 0.5,
              duration: const Duration(milliseconds: 120),
              child: Container(
                width: 13,
                height: 13,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: active || decoy
                      ? Colors.white.withValues(alpha: 0.88)
                      : Colors.transparent,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _GameFooter extends StatelessWidget {
  const _GameFooter({required this.engine});

  final GridlockEngine engine;

  @override
  Widget build(BuildContext context) {
    final bool input = engine.phase == GridlockPhase.input;
    final double progress = input ? engine.responseProgress : 1;
    final Color timerColor = progress < 0.34
        ? const Color(0xFFFF5E73)
        : const Color(0xFF5AE6D3);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 22),
      child: Column(
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(
                input ? Icons.timer_outlined : Icons.visibility_rounded,
                color: input ? timerColor : const Color(0xFF8172C9),
                size: 15,
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  input
                      ? 'NEXT TAP'
                      : engine.phase == GridlockPhase.roundWon
                      ? 'SEQUENCE COMPLETE'
                      : 'MEMORIZE ONLY',
                  style: const TextStyle(
                    color: Color(0xFF7B8398),
                    fontSize: 8,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1,
                  ),
                ),
              ),
              Text(
                input
                    ? '${engine.responseRemaining.toStringAsFixed(1)}s'
                    : '3.0s / TAP',
                style: TextStyle(
                  color: input ? timerColor : const Color(0xFF7B8398),
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 7),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 7,
              color: input ? timerColor : const Color(0xFF4C426F),
              backgroundColor: const Color(0xFF171C2B),
            ),
          ),
        ],
      ),
    );
  }
}

class _GameOver extends StatelessWidget {
  const _GameOver({
    required this.engine,
    required this.bestScore,
    required this.newBest,
    required this.onRetry,
    required this.onLobby,
  });

  final GridlockEngine engine;
  final int bestScore;
  final bool newBest;
  final VoidCallback onRetry;
  final VoidCallback onLobby;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xE8080A11),
      child: Center(
        child: Container(
          width: min(MediaQuery.sizeOf(context).width - 36, 360),
          padding: const EdgeInsets.all(23),
          decoration: BoxDecoration(
            color: const Color(0xFF111624),
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: const Color(0xFF343D54)),
            boxShadow: const <BoxShadow>[
              BoxShadow(
                color: Color(0xCC000000),
                blurRadius: 35,
                offset: Offset(0, 15),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: const Color(0xFFFF6075).withValues(alpha: 0.13),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  engine.endReason == GridlockEndReason.timeout
                      ? Icons.timer_off_rounded
                      : Icons.touch_app_rounded,
                  color: const Color(0xFFFF6B7A),
                  size: 25,
                ),
              ),
              const SizedBox(height: 13),
              Text(
                engine.instruction.toUpperCase(),
                style: const TextStyle(
                  color: Color(0xFFFF7C8A),
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                engine.score.toString().padLeft(4, '0'),
                style: const TextStyle(
                  color: Color(0xFFF5F6FA),
                  fontSize: 43,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -1.5,
                ),
              ),
              Text(
                newBest
                    ? 'NEW HIGH SCORE'
                    : 'BEST ${bestScore.toString().padLeft(4, '0')}',
                style: TextStyle(
                  color: newBest
                      ? const Color(0xFFFFD36D)
                      : const Color(0xFF858DA0),
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 17),
              Row(
                children: <Widget>[
                  Expanded(
                    child: _ResultStat(
                      value: '${engine.roundsCompleted}',
                      label: 'ROUNDS',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _ResultStat(
                      value: '${engine.path.length}',
                      label: 'LONGEST',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _ResultStat(
                      value: _formatDuration(engine.elapsedSeconds.ceil()),
                      label: 'TIME',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  key: const ValueKey<String>('gridlock-retry'),
                  onPressed: onRetry,
                  icon: const Icon(Icons.replay_rounded),
                  label: const Text('PLAY AGAIN'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF5AE6D3),
                    foregroundColor: const Color(0xFF07110F),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    textStyle: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
              ),
              TextButton(
                onPressed: onLobby,
                child: const Text('BACK TO RESULTS'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResultStat extends StatelessWidget {
  const _ResultStat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: BoxDecoration(
        color: const Color(0xFF0B0F1A),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: <Widget>[
          Text(
            value,
            style: const TextStyle(
              color: Color(0xFFE9ECF4),
              fontSize: 13,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF666F83),
              fontSize: 7,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }
}

String _formatDuration(int seconds) {
  final int minutes = seconds ~/ 60;
  final int remainder = seconds % 60;
  return '${minutes.toString().padLeft(2, '0')}:${remainder.toString().padLeft(2, '0')}';
}
