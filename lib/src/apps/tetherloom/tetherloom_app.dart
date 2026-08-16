import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';
import 'tetherloom_engine.dart';

const List<Color> _stitchColors = <Color>[
  Color(0xFF6EE7FF),
  Color(0xFFFF6FAE),
  Color(0xFFFFD166),
  Color(0xFF9B8CFF),
];

const List<String> _stitchNames = <String>['Cyan', 'Rose', 'Gold', 'Violet'];

class _LoomParticle {
  _LoomParticle({
    required this.position,
    required this.velocity,
    required this.color,
    required this.life,
    required this.radius,
  });

  Offset position;
  final Offset velocity;
  final Color color;
  double life;
  final double radius;
}

class TetherloomApp extends StatefulWidget {
  const TetherloomApp({super.key});

  @override
  State<TetherloomApp> createState() => _TetherloomAppState();
}

class _TetherloomAppState extends State<TetherloomApp>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late final Ticker _ticker;
  TetherloomEngine _engine = TetherloomEngine();
  final Random _effectsRandom = Random();
  final List<Offset> _trail = <Offset>[];
  final List<_LoomParticle> _particles = <_LoomParticle>[];
  Duration? _lastElapsed;
  Size _boardSize = Size.zero;
  bool _playing = false;
  bool _paused = false;
  bool _pausedAutomatically = false;
  int _bestScore = 0;
  double _trailTimer = 0;
  double _shake = 0;
  double _flash = 0;
  double _messageLife = 0;
  String _message = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _ticker = createTicker(_tick);
    _loadBestScore();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _ticker.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed &&
        _playing &&
        !_paused &&
        !_engine.gameOver) {
      _setPaused(true, automatic: true);
    }
  }

  Future<void> _loadBestScore() async {
    final String? stored = await LocalStore.readString(
      LocalStore.tetherloomBestKey,
    );
    if (!mounted) {
      return;
    }
    setState(() => _bestScore = int.tryParse(stored ?? '') ?? 0);
  }

  void _startGame() {
    _ticker.stop();
    setState(() {
      _engine = TetherloomEngine();
      _playing = true;
      _paused = false;
      _pausedAutomatically = false;
      _trail
        ..clear()
        ..add(const Offset(0.5, TetherloomEngine.playerY));
      _particles.clear();
      _lastElapsed = null;
      _trailTimer = 0;
      _shake = 0;
      _flash = 0;
      _messageLife = 1.8;
      _message = 'Follow the glowing color';
    });
    _ticker.start();
  }

  void _togglePause() {
    if (!_playing || _engine.gameOver) {
      return;
    }
    _setPaused(!_paused);
  }

  void _setPaused(bool paused, {bool automatic = false}) {
    if (!_playing || _engine.gameOver || _paused == paused) {
      return;
    }
    setState(() {
      _paused = paused;
      _pausedAutomatically = paused && automatic;
    });
    if (paused) {
      _ticker.stop();
    } else {
      _lastElapsed = null;
      _ticker.start();
    }
  }

  void _tick(Duration elapsed) {
    if (!_playing || _paused) {
      _lastElapsed = elapsed;
      return;
    }
    final Duration? previous = _lastElapsed;
    _lastElapsed = elapsed;
    if (previous == null) {
      return;
    }
    final double dt = (elapsed - previous).inMicroseconds / 1000000;
    if (dt <= 0) {
      return;
    }

    _engine.tick(dt);
    _updateTrail(dt);
    _updateParticles(dt);
    _shake = max(0, _shake - dt * 3.7);
    _flash = max(0, _flash - dt * 3.2);
    _messageLife = max(0, _messageLife - dt);
    _handleEvents(_engine.drainEvents());

    if (_engine.gameOver) {
      _finishRun();
    }
    if (mounted) {
      setState(() {});
    }
  }

  void _updateTrail(double dt) {
    for (int index = 0; index < _trail.length; index++) {
      _trail[index] = Offset(
        _trail[index].dx,
        _trail[index].dy + _engine.speed * dt,
      );
    }
    _trailTimer -= dt;
    if (_trailTimer <= 0) {
      _trail.insert(
        0,
        Offset(_engine.playerX, TetherloomEngine.playerY + 0.018),
      );
      _trailTimer = 0.028;
    }
    _trail.removeWhere((Offset point) => point.dy > 1.08);
    if (_trail.length > 90) {
      _trail.removeRange(90, _trail.length);
    }
  }

  void _updateParticles(double dt) {
    for (final _LoomParticle particle in _particles) {
      particle.position += particle.velocity * dt;
      particle.life -= dt;
    }
    _particles.removeWhere((_LoomParticle particle) => particle.life <= 0);
  }

  void _handleEvents(List<LoomEvent> events) {
    for (final LoomEvent event in events) {
      switch (event.kind) {
        case LoomEventKind.correct:
          _burst(event, _stitchColors[event.colorIndex], 13);
          _flash = 0.16;
          _message = _engine.multiplier > 1
              ? '${_engine.multiplier}× weave'
              : 'Perfect stitch';
          _messageLife = 0.8;
          HapticFeedback.selectionClick();
        case LoomEventKind.wrong:
          _burst(event, const Color(0xFFB7BED8), 6);
          _message = 'Pattern reset';
          _messageLife = 0.7;
          HapticFeedback.lightImpact();
        case LoomEventKind.hit:
          _burst(event, const Color(0xFFFF5C75), 18);
          _shake = 1;
          _flash = 0.65;
          _message = 'Thread snapped';
          _messageLife = 1;
          HapticFeedback.heavyImpact();
        case LoomEventKind.mend:
          _burst(event, const Color(0xFF65F2B0), 16);
          _message = 'Thread restored';
          _messageLife = 1;
          HapticFeedback.mediumImpact();
        case LoomEventKind.nearMiss:
          _burst(event, const Color(0xFFFFD166), 8);
          _message = 'Close weave +${24 * _engine.multiplier}';
          _messageLife = 0.8;
          HapticFeedback.selectionClick();
        case LoomEventKind.gameOver:
          _messageLife = 0;
      }
    }
  }

  void _burst(LoomEvent event, Color color, int count) {
    for (int index = 0; index < count; index++) {
      final double angle = _effectsRandom.nextDouble() * pi * 2;
      final double velocity = 0.08 + _effectsRandom.nextDouble() * 0.18;
      _particles.add(
        _LoomParticle(
          position: Offset(event.x, event.y),
          velocity: Offset(cos(angle) * velocity, sin(angle) * velocity),
          color: color,
          life: 0.35 + _effectsRandom.nextDouble() * 0.4,
          radius: 1.5 + _effectsRandom.nextDouble() * 3,
        ),
      );
    }
  }

  void _finishRun() {
    _ticker.stop();
    if (_engine.score > _bestScore) {
      _bestScore = _engine.score;
      LocalStore.writeString(LocalStore.tetherloomBestKey, '$_bestScore');
    }
  }

  void _steer(double localX) {
    if (!_playing || _paused || _engine.gameOver || _boardSize.width <= 0) {
      return;
    }
    _engine.setTargetX(localX / _boardSize.width);
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Tetherloom',
      icon: Icons.gesture_rounded,
      actions: <Widget>[
        if (_playing && !_engine.gameOver)
          IconButton(
            tooltip: _paused ? 'Resume game' : 'Pause game',
            onPressed: _togglePause,
            icon: Icon(
              _paused ? Icons.play_arrow_rounded : Icons.pause_rounded,
            ),
          ),
      ],
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 620),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: LayoutBuilder(
              builder: (BuildContext context, BoxConstraints constraints) {
                _boardSize = Size(constraints.maxWidth, constraints.maxHeight);
                return ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTapDown: (TapDownDetails details) =>
                        _steer(details.localPosition.dx),
                    onPanStart: (DragStartDetails details) =>
                        _steer(details.localPosition.dx),
                    onPanUpdate: (DragUpdateDetails details) =>
                        _steer(details.localPosition.dx),
                    child: Stack(
                      fit: StackFit.expand,
                      children: <Widget>[
                        RepaintBoundary(
                          child: CustomPaint(
                            painter: _TetherloomPainter(
                              engine: _engine,
                              trail: _trail,
                              particles: _particles,
                              shake: _shake,
                              flash: _flash,
                              reduceMotion: MediaQuery.disableAnimationsOf(
                                context,
                              ),
                            ),
                          ),
                        ),
                        if (_playing) ...<Widget>[
                          _GameHud(
                            score: _engine.score,
                            best: _bestScore,
                            combo: _engine.combo,
                            multiplier: _engine.multiplier,
                            lives: _engine.lives,
                            expectedColor: _engine.expectedColor,
                          ),
                          if (_messageLife > 0)
                            _GameMessage(
                              message: _message,
                              color: _stitchColors[_engine.expectedColor],
                            ),
                        ],
                        if (!_playing)
                          _ReadyOverlay(
                            bestScore: _bestScore,
                            onPlay: _startGame,
                          )
                        else if (_paused)
                          _PauseOverlay(
                            pausedAutomatically: _pausedAutomatically,
                            onResume: _togglePause,
                            onRestart: _startGame,
                          )
                        else if (_engine.gameOver)
                          _GameOverOverlay(
                            score: _engine.score,
                            bestScore: _bestScore,
                            stitches: _engine.stitches,
                            bestCombo: _engine.bestCombo,
                            elapsedSeconds: _engine.time.floor(),
                            onRestart: _startGame,
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _GameHud extends StatelessWidget {
  const _GameHud({
    required this.score,
    required this.best,
    required this.combo,
    required this.multiplier,
    required this.lives,
    required this.expectedColor,
  });

  final int score;
  final int best;
  final int combo;
  final int multiplier;
  final int lives;
  final int expectedColor;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: SafeArea(
        minimum: const EdgeInsets.all(14),
        child: Align(
          alignment: Alignment.topCenter,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _HudPill(
                label: 'SCORE',
                value: '$score',
                secondary: 'BEST $best',
              ),
              const Spacer(),
              _PatternPill(colorIndex: expectedColor),
              const Spacer(),
              _HudPill(
                label: combo == 0 ? 'WEAVE' : '$combo CHAIN',
                value: '$multiplier×',
                secondary: '●' * lives,
                alignEnd: true,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HudPill extends StatelessWidget {
  const _HudPill({
    required this.label,
    required this.value,
    required this.secondary,
    this.alignEnd = false,
  });

  final String label;
  final String value;
  final String secondary;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 78),
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xCC11152E),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.11)),
      ),
      child: Column(
        crossAxisAlignment: alignEnd
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF9AA4C7),
              fontSize: 9,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
              height: 1.1,
            ),
          ),
          Text(
            secondary,
            style: const TextStyle(
              color: Color(0xFF7681A8),
              fontSize: 9,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _PatternPill extends StatelessWidget {
  const _PatternPill({required this.colorIndex});

  final int colorIndex;

  @override
  Widget build(BuildContext context) {
    final Color color = _stitchColors[colorIndex];
    return Semantics(
      label: 'Match ${_stitchNames[colorIndex]} stitch',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xE611152E),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.65)),
          boxShadow: <BoxShadow>[
            BoxShadow(color: color.withValues(alpha: 0.18), blurRadius: 14),
          ],
        ),
        child: Column(
          children: <Widget>[
            const Text(
              'MATCH',
              style: TextStyle(
                color: Color(0xFF9AA4C7),
                fontSize: 9,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.1,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                boxShadow: <BoxShadow>[BoxShadow(color: color, blurRadius: 10)],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _stitchNames[colorIndex].toUpperCase(),
              style: TextStyle(
                color: color,
                fontSize: 8,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.8,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GameMessage extends StatelessWidget {
  const _GameMessage({required this.message, required this.color});

  final String message;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 98,
      left: 0,
      right: 0,
      child: IgnorePointer(
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0xD911152E),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: color.withValues(alpha: 0.35)),
            ),
            child: Text(
              message,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ReadyOverlay extends StatelessWidget {
  const _ReadyOverlay({required this.bestScore, required this.onPlay});

  final int bestScore;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    return _OverlayScrim(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: <Color>[Color(0xFF6EE7FF), Color(0xFF9B8CFF)],
              ),
              borderRadius: BorderRadius.circular(25),
              boxShadow: const <BoxShadow>[
                BoxShadow(color: Color(0x669B8CFF), blurRadius: 28),
              ],
            ),
            child: const Icon(
              Icons.gesture_rounded,
              color: Color(0xFF11152E),
              size: 38,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'TETHERLOOM',
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.6,
            ),
          ),
          const SizedBox(height: 7),
          const Text(
            'Repair an endless living loom—one perfect stitch at a time.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFFB7BED8), height: 1.4),
          ),
          const SizedBox(height: 22),
          const _HowToPlay(),
          const SizedBox(height: 22),
          FilledButton.icon(
            key: const ValueKey<String>('tetherloom-play'),
            onPressed: onPlay,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF6EE7FF),
              foregroundColor: const Color(0xFF11152E),
              minimumSize: const Size(190, 52),
            ),
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Start weaving'),
          ),
          const SizedBox(height: 13),
          Text(
            bestScore == 0 ? 'Your first run awaits' : 'Best score  $bestScore',
            style: const TextStyle(
              color: Color(0xFF7F89AC),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _HowToPlay extends StatelessWidget {
  const _HowToPlay();

  @override
  Widget build(BuildContext context) {
    return const Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: <Widget>[
        _HowToItem(icon: Icons.swipe_rounded, label: 'Drag to steer'),
        SizedBox(width: 20),
        _HowToItem(icon: Icons.colorize_rounded, label: 'Match color'),
        SizedBox(width: 20),
        _HowToItem(icon: Icons.bolt_rounded, label: 'Skim snags'),
      ],
    );
  }
}

class _HowToItem extends StatelessWidget {
  const _HowToItem({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 76,
      child: Column(
        children: <Widget>[
          Icon(icon, color: const Color(0xFF9B8CFF), size: 23),
          const SizedBox(height: 5),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF9AA4C7),
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _PauseOverlay extends StatelessWidget {
  const _PauseOverlay({
    required this.pausedAutomatically,
    required this.onResume,
    required this.onRestart,
  });

  final bool pausedAutomatically;
  final VoidCallback onResume;
  final VoidCallback onRestart;

  @override
  Widget build(BuildContext context) {
    return _OverlayScrim(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(
            Icons.pause_circle_filled_rounded,
            color: Color(0xFF6EE7FF),
            size: 64,
          ),
          const SizedBox(height: 14),
          const Text(
            'Loom paused',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            pausedAutomatically
                ? 'Paused while the app was in the background.'
                : 'Your weave is safe. Resume when you are ready.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF9AA4C7)),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            key: const ValueKey<String>('tetherloom-resume'),
            onPressed: onResume,
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Resume'),
          ),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: onRestart,
            icon: const Icon(Icons.replay_rounded),
            label: const Text('Restart run'),
          ),
        ],
      ),
    );
  }
}

class _GameOverOverlay extends StatelessWidget {
  const _GameOverOverlay({
    required this.score,
    required this.bestScore,
    required this.stitches,
    required this.bestCombo,
    required this.elapsedSeconds,
    required this.onRestart,
  });

  final int score;
  final int bestScore;
  final int stitches;
  final int bestCombo;
  final int elapsedSeconds;
  final VoidCallback onRestart;

  @override
  Widget build(BuildContext context) {
    return _OverlayScrim(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Text(
            'THE THREAD BROKE',
            style: TextStyle(
              color: Color(0xFFFF6FAE),
              fontSize: 12,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.8,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '$score',
            key: const ValueKey<String>('tetherloom-final-score'),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 54,
              fontWeight: FontWeight.w900,
              height: 1,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '$stitches stitches  ·  ${_formatLoomTime(elapsedSeconds)}  ·  best $bestScore',
            style: const TextStyle(color: Color(0xFFB7BED8)),
          ),
          const SizedBox(height: 6),
          Text(
            'Longest chain  $bestCombo',
            style: const TextStyle(
              color: Color(0xFF7F89AC),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: onRestart,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF6EE7FF),
              foregroundColor: const Color(0xFF11152E),
            ),
            icon: const Icon(Icons.replay_rounded),
            label: const Text('Weave again'),
          ),
        ],
      ),
    );
  }
}

String _formatLoomTime(int totalSeconds) {
  final int minutes = totalSeconds ~/ 60;
  final int seconds = totalSeconds % 60;
  return '$minutes:${seconds.toString().padLeft(2, '0')}';
}

class _OverlayScrim extends StatelessWidget {
  const _OverlayScrim({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xC9070A18),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(24),
      child: SingleChildScrollView(child: child),
    );
  }
}

class _TetherloomPainter extends CustomPainter {
  const _TetherloomPainter({
    required this.engine,
    required this.trail,
    required this.particles,
    required this.shake,
    required this.flash,
    required this.reduceMotion,
  });

  final TetherloomEngine engine;
  final List<Offset> trail;
  final List<_LoomParticle> particles;
  final double shake;
  final double flash;
  final bool reduceMotion;

  @override
  void paint(Canvas canvas, Size size) {
    final Rect bounds = Offset.zero & size;
    canvas.drawRect(
      bounds,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: <Color>[
            Color(0xFF080B1C),
            Color(0xFF111634),
            Color(0xFF191336),
          ],
        ).createShader(bounds),
    );

    canvas.save();
    if (!reduceMotion && shake > 0) {
      canvas.translate(
        sin(engine.time * 78) * shake * 4,
        cos(engine.time * 91) * shake * 2,
      );
    }
    _drawBackdrop(canvas, size);
    _drawTrail(canvas, size);
    _drawObjects(canvas, size);
    _drawParticles(canvas, size);
    _drawPlayer(canvas, size);
    canvas.restore();

    if (flash > 0) {
      canvas.drawRect(
        bounds,
        Paint()..color = const Color(0xFFFF6F91).withValues(alpha: flash * 0.2),
      );
    }
  }

  void _drawBackdrop(Canvas canvas, Size size) {
    final Paint lanePaint = Paint()
      ..color = const Color(0xFF93A4E8).withValues(alpha: 0.09)
      ..strokeWidth = 1;
    for (final double lane in TetherloomEngine.lanes) {
      final double x = lane * size.width;
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), lanePaint);
    }

    for (int index = 0; index < 34; index++) {
      final double x = ((index * 0.371 + sin(index * 7.1) * 0.2) % 1).abs();
      final double y = ((index * 0.117 + engine.distance * 0.0008) % 1.08)
          .abs();
      final double radius = index % 7 == 0 ? 1.8 : 0.8;
      canvas.drawCircle(
        Offset(x * size.width, y * size.height),
        radius,
        Paint()
          ..color = Colors.white.withValues(
            alpha: index % 7 == 0 ? 0.28 : 0.12,
          ),
      );
    }

    final double beatY = (engine.distance * 0.007 % 1) * size.height;
    canvas.drawLine(
      Offset(0, beatY),
      Offset(size.width, beatY),
      Paint()
        ..shader = const LinearGradient(
          colors: <Color>[
            Colors.transparent,
            Color(0x229B8CFF),
            Colors.transparent,
          ],
        ).createShader(Rect.fromLTWH(0, beatY, size.width, 1)),
    );
  }

  void _drawTrail(Canvas canvas, Size size) {
    if (trail.length < 2) {
      return;
    }
    final Path path = Path()
      ..moveTo(trail.first.dx * size.width, trail.first.dy * size.height);
    for (int index = 1; index < trail.length; index++) {
      path.lineTo(trail[index].dx * size.width, trail[index].dy * size.height);
    }
    final Color color = _stitchColors[engine.expectedColor];
    canvas.drawPath(
      path,
      Paint()
        ..color = color.withValues(alpha: 0.12)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 14
        ..strokeCap = StrokeCap.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 9),
    );
    canvas.drawPath(
      path,
      Paint()
        ..shader = LinearGradient(
          colors: <Color>[
            color.withValues(alpha: 0.95),
            const Color(0xFF9B8CFF).withValues(alpha: 0.14),
          ],
        ).createShader(Offset.zero & size)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.2
        ..strokeCap = StrokeCap.round,
    );
  }

  void _drawObjects(Canvas canvas, Size size) {
    for (final LoomObject object in engine.objects) {
      final Offset center = Offset(
        object.xAt(engine.time) * size.width,
        object.y * size.height,
      );
      final double radius = object.radius * size.width;
      switch (object.kind) {
        case LoomObjectKind.stitch:
          final Color color = _stitchColors[object.colorIndex];
          _drawGlow(canvas, center, radius * 1.8, color, 0.18);
          if (object.colorIndex == engine.expectedColor) {
            canvas.drawCircle(
              center,
              radius * 1.45,
              Paint()
                ..color = color.withValues(alpha: 0.65)
                ..style = PaintingStyle.stroke
                ..strokeWidth = 2,
            );
          }
          for (int petal = 0; petal < 4; petal++) {
            final double angle = petal * pi / 2 + pi / 4;
            canvas.drawCircle(
              center + Offset(cos(angle), sin(angle)) * radius * 0.52,
              radius * 0.48,
              Paint()..color = color.withValues(alpha: 0.8),
            );
          }
          canvas.drawCircle(
            center,
            radius * 0.45,
            Paint()..color = Colors.white,
          );
        case LoomObjectKind.snag:
          _drawGlow(
            canvas,
            center,
            radius * 1.9,
            const Color(0xFFFF5C75),
            0.16,
          );
          canvas.save();
          canvas.translate(center.dx, center.dy);
          canvas.rotate(engine.time * 0.9 + object.id);
          final Path shard = Path();
          for (int point = 0; point < 8; point++) {
            final double angle = point * pi / 4;
            final double length = point.isEven ? radius : radius * 0.48;
            final Offset vertex = Offset(cos(angle), sin(angle)) * length;
            if (point == 0) {
              shard.moveTo(vertex.dx, vertex.dy);
            } else {
              shard.lineTo(vertex.dx, vertex.dy);
            }
          }
          shard.close();
          canvas.drawPath(shard, Paint()..color = const Color(0xFFEE4967));
          canvas.drawCircle(
            Offset.zero,
            radius * 0.35,
            Paint()..color = const Color(0xFF290C22),
          );
          canvas.restore();
        case LoomObjectKind.mend:
          _drawGlow(canvas, center, radius * 2, const Color(0xFF65F2B0), 0.2);
          canvas.drawCircle(
            center,
            radius,
            Paint()..color = const Color(0xFF65F2B0),
          );
          final Paint mendPaint = Paint()
            ..color = const Color(0xFF102D2A)
            ..strokeWidth = 3
            ..strokeCap = StrokeCap.round;
          canvas.drawLine(
            center - Offset(radius * 0.45, 0),
            center + Offset(radius * 0.45, 0),
            mendPaint,
          );
          canvas.drawLine(
            center - Offset(0, radius * 0.45),
            center + Offset(0, radius * 0.45),
            mendPaint,
          );
        case LoomObjectKind.prism:
          _drawGlow(canvas, center, radius * 2.2, Colors.white, 0.24);
          final Path diamond = Path()
            ..moveTo(center.dx, center.dy - radius)
            ..lineTo(center.dx + radius, center.dy)
            ..lineTo(center.dx, center.dy + radius)
            ..lineTo(center.dx - radius, center.dy)
            ..close();
          canvas.drawPath(
            diamond,
            Paint()
              ..shader = const LinearGradient(
                colors: _stitchColors,
              ).createShader(Rect.fromCircle(center: center, radius: radius)),
          );
          canvas.drawCircle(
            center,
            radius * 0.25,
            Paint()..color = Colors.white,
          );
      }
    }
  }

  void _drawParticles(Canvas canvas, Size size) {
    for (final _LoomParticle particle in particles) {
      canvas.drawCircle(
        Offset(
          particle.position.dx * size.width,
          particle.position.dy * size.height,
        ),
        particle.radius * particle.life.clamp(0.25, 1),
        Paint()
          ..color = particle.color.withValues(alpha: particle.life.clamp(0, 1)),
      );
    }
  }

  void _drawPlayer(Canvas canvas, Size size) {
    if (engine.invulnerableFor > 0 &&
        (engine.invulnerableFor * 12).floor().isOdd) {
      return;
    }
    final Offset center = Offset(
      engine.playerX * size.width,
      TetherloomEngine.playerY * size.height,
    );
    final Color color = _stitchColors[engine.expectedColor];
    final Paint tetherPaint = Paint()
      ..color = color.withValues(alpha: 0.13)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    canvas.drawLine(
      center,
      Offset(size.width * 0.08, size.height),
      tetherPaint,
    );
    canvas.drawLine(
      center,
      Offset(size.width * 0.92, size.height),
      tetherPaint,
    );
    _drawGlow(canvas, center, 30, color, 0.25);

    canvas.save();
    canvas.translate(center.dx, center.dy);
    final Path shuttle = Path()
      ..moveTo(0, -19)
      ..quadraticBezierTo(13, -4, 10, 10)
      ..lineTo(0, 16)
      ..lineTo(-10, 10)
      ..quadraticBezierTo(-13, -4, 0, -19)
      ..close();
    canvas.drawPath(shuttle, Paint()..color = color);
    canvas.drawPath(
      shuttle,
      Paint()
        ..color = Colors.white.withValues(alpha: 0.8)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );
    canvas.drawCircle(const Offset(0, 1), 4.2, Paint()..color = Colors.white);
    canvas.restore();
  }

  void _drawGlow(
    Canvas canvas,
    Offset center,
    double radius,
    Color color,
    double alpha,
  ) {
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = color.withValues(alpha: alpha)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, radius * 0.55),
    );
  }

  @override
  bool shouldRepaint(_TetherloomPainter oldDelegate) => true;
}
