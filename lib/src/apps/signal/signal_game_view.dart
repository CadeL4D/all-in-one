import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';

import 'signal_engine.dart';

class SignalGameView extends StatefulWidget {
  const SignalGameView({
    super.key,
    required this.engine,
    required this.onQuit,
    required this.onGameOver,
  });

  final SignalEngine engine;
  final VoidCallback onQuit;
  final ValueChanged<SignalRunStats> onGameOver;

  @override
  State<SignalGameView> createState() => _SignalGameViewState();
}

class _SignalGameViewState extends State<SignalGameView>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  bool _reportedGameOver = false;
  int _lastScore = 0;
  int _lastMistakes = 0;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker(_onTick);
    widget.engine.start();
    _ticker.start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  void _onTick(Duration elapsed) {
    final double dt =
        (elapsed.inMicroseconds / 1000000) -
        ((_previousMicros ?? elapsed.inMicroseconds) / 1000000);
    _previousMicros = elapsed.inMicroseconds;
    widget.engine.update(dt);

    if (widget.engine.score > _lastScore) {
      HapticFeedback.selectionClick();
    } else if (widget.engine.mistakes > _lastMistakes) {
      HapticFeedback.heavyImpact();
    }
    _lastScore = widget.engine.score;
    _lastMistakes = widget.engine.mistakes;

    if (widget.engine.gameOver && !_reportedGameOver) {
      _reportedGameOver = true;
      HapticFeedback.vibrate();
      widget.onGameOver(widget.engine.runStats);
    }

    if (mounted) {
      setState(() {});
    }
  }

  int? _previousMicros;

  void _resume() {
    setState(() => widget.engine.paused = false);
  }

  void _restart() {
    setState(() {
      _reportedGameOver = false;
      _lastScore = 0;
      _lastMistakes = 0;
      widget.engine.start();
    });
  }

  void _handlePointer(Offset localPosition) {
    widget.engine.setTargetX(localPosition.dx);
  }

  @override
  Widget build(BuildContext context) {
    final SignalEngine engine = widget.engine;
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final Size size = Size(
          math.max(1, constraints.maxWidth),
          math.max(1, constraints.maxHeight),
        );
        if (!_ready || size != engine.boardSize) {
          engine.resize(size);
          _ready = true;
        }

        return Stack(
          fit: StackFit.expand,
          children: <Widget>[
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onPanDown: (DragDownDetails details) =>
                  _handlePointer(details.localPosition),
              onPanUpdate: (DragUpdateDetails details) =>
                  _handlePointer(details.localPosition),
              onTapDown: (TapDownDetails details) =>
                  _handlePointer(details.localPosition),
              child: CustomPaint(painter: SignalPainter(engine: engine)),
            ),
            _SignalHud(engine: engine),
            if (engine.paused && !engine.gameOver)
              _PauseOverlay(
                onResume: _resume,
                onRestart: _restart,
                onQuit: widget.onQuit,
              ),
            if (engine.gameOver)
              _GameOverOverlay(
                stats: engine.runStats,
                onRetry: _restart,
                onQuit: widget.onQuit,
              ),
          ],
        );
      },
    );
  }
}

class _SignalHud extends StatelessWidget {
  const _SignalHud({required this.engine});

  final SignalEngine engine;

  @override
  Widget build(BuildContext context) {
    final SignalPhase phase = engine.phase;
    final double progress = engine.collectedInPhase / phase.targetGoal;
    final ColorScheme scheme = Theme.of(context).colorScheme;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Column(
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Expanded(
                  child: _stat(context, 'SCORE', engine.score.toString()),
                ),
                Expanded(
                  child: _stat(
                    context,
                    'COMBO',
                    engine.combo > 0 ? '×${engine.combo}' : '—',
                  ),
                ),
                Expanded(child: _stat(context, 'DIFFICULTY', _difficultyLabel)),
                _LivesBar(lives: engine.lives),
              ],
            ),
            const SizedBox(height: 14),
            Align(
              alignment: Alignment.center,
              child: _PhaseChip(
                title: phase.rule.title,
                skill: phase.rule.skill,
                progress: progress,
              ),
            ),
            if (engine.bannerText.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: _Banner(text: engine.bannerText),
              ),
            if (engine.phase.rule == SignalRule.sequence)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: _SequenceIndicator(engine: engine),
              ),
            if (engine.phase.rule == SignalRule.memory)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: _MemoryCue(
                  visible: engine.cueVisible,
                  targetColor: const Color(0xFF3E8DFF),
                ),
              ),
            if (engine.phase.rule == SignalRule.cue)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: _CueReadout(color: engine.cueColorForUi),
              ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                'Drag or tap to move • Catch targets • Avoid the rest',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: scheme.onSurfaceVariant.withValues(alpha: 0.8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String get _difficultyLabel {
    if (engine.difficulty < 2.4) return 'Calm';
    if (engine.difficulty < 4.4) return 'Steady';
    if (engine.difficulty < 6.4) return 'Sharp';
    if (engine.difficulty < 8.4) return 'Rapid';
    return 'Overload';
  }

  Widget _stat(BuildContext context, String label, String value) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall
              ?.copyWith(color: scheme.onSurfaceVariant, letterSpacing: 1),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge
              ?.copyWith(fontSize: 22, fontWeight: FontWeight.w800),
        ),
      ],
    );
  }
}

class _LivesBar extends StatelessWidget {
  const _LivesBar({required this.lives});

  final int lives;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List<Widget>.generate(
        SignalEngine.maxLives,
        (int index) => Padding(
          padding: const EdgeInsets.only(left: 3),
          child: Icon(
            index < lives
                ? Icons.favorite_rounded
                : Icons.favorite_border_rounded,
            size: 18,
            color: index < lives
                ? const Color(0xFFFF5A7A)
                : Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
      ),
    );
  }
}

class _PhaseChip extends StatelessWidget {
  const _PhaseChip({
    required this.title,
    required this.skill,
    required this.progress,
  });

  final String title;
  final String skill;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: scheme.surface.withValues(alpha: 0.88),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.7)),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Colors.black.withValues(
              alpha: Theme.of(context).brightness == Brightness.dark
                  ? 0.24
                  : 0.08,
            ),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(width: 8),
          Container(
            width: 6,
            height: 6,
            decoration: const BoxDecoration(
              color: Color(0xFF2EE6D6),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            skill,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 64,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: progress.clamp(0, 1),
                minHeight: 6,
                backgroundColor: scheme.surfaceContainerHighest,
                color: const Color(0xFF2EE6D6),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: <Color>[Color(0xFF2EE6D6), Color(0xFF3E8DFF)],
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: const Color(0xFF2EE6D6).withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.labelLarge
            ?.copyWith(color: Colors.white),
      ),
    );
  }
}

class _SequenceIndicator extends StatelessWidget {
  const _SequenceIndicator({required this.engine});

  final SignalEngine engine;

  static const List<Color> _colors = <Color>[
    Color(0xFF2EE6D6),
    Color(0xFFFF4FD8),
    Color(0xFFFFC247),
  ];

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List<Widget>.generate(3, (int index) {
        final bool current = engine.sequenceIndex == index;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: current ? 22 : 12,
          height: 12,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: _colors[index].withValues(alpha: current ? 1 : 0.35),
            borderRadius: BorderRadius.circular(999),
            boxShadow: current
                ? <BoxShadow>[
                    BoxShadow(
                      color: _colors[index].withValues(alpha: 0.5),
                      blurRadius: 12,
                    ),
                  ]
                : null,
          ),
        );
      }),
    );
  }
}

class _MemoryCue extends StatelessWidget {
  const _MemoryCue({required this.visible, required this.targetColor});

  final bool visible;
  final Color targetColor;

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 180),
      opacity: visible ? 1 : 0.25,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: targetColor.withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: targetColor.withValues(alpha: 0.7)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              visible ? Icons.visibility_rounded : Icons.visibility_off_rounded,
              size: 16,
              color: targetColor,
            ),
            const SizedBox(width: 7),
            Text(
              visible ? 'Memorize blue' : 'Remember the target',
              style: Theme.of(context).textTheme.labelLarge
                  ?.copyWith(color: targetColor),
            ),
          ],
        ),
      ),
    );
  }
}

class _CueReadout extends StatelessWidget {
  const _CueReadout({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.7)),
      ),
      child: Text(
        'Border = catch this color',
        style: Theme.of(context).textTheme.labelLarge?.copyWith(color: color),
      ),
    );
  }
}

class _PauseOverlay extends StatelessWidget {
  const _PauseOverlay({
    required this.onResume,
    required this.onRestart,
    required this.onQuit,
  });

  final VoidCallback onResume;
  final VoidCallback onRestart;
  final VoidCallback onQuit;

  @override
  Widget build(BuildContext context) {
    return _Scrim(
      child: _Panel(
        icon: Icons.pause_rounded,
        title: 'Paused',
        subtitle:
            'The signal can wait. You can’t improve if you rush every run.',
        actions: <Widget>[
          FilledButton.icon(
            onPressed: onResume,
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Resume'),
          ),
          OutlinedButton.icon(
            onPressed: onRestart,
            icon: const Icon(Icons.replay_rounded),
            label: const Text('Restart'),
          ),
          TextButton(onPressed: onQuit, child: const Text('Leave run')),
        ],
      ),
    );
  }
}

class _GameOverOverlay extends StatelessWidget {
  const _GameOverOverlay({
    required this.stats,
    required this.onRetry,
    required this.onQuit,
  });

  final SignalRunStats stats;
  final VoidCallback onRetry;
  final VoidCallback onQuit;

  @override
  Widget build(BuildContext context) {
    return _Scrim(
      child: _Panel(
        icon: Icons.bolt_rounded,
        title: 'Signal Lost',
        subtitle:
            'Score ${stats.score} • Level ${stats.levelReached} • ${stats.avgReactionMs} ms avg',
        actions: <Widget>[
          FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.replay_rounded),
            label: const Text('Run it back'),
          ),
          OutlinedButton.icon(
            onPressed: onQuit,
            icon: const Icon(Icons.grid_view_rounded),
            label: const Text('Back to Signal'),
          ),
        ],
      ),
    );
  }
}

class _Scrim extends StatelessWidget {
  const _Scrim({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black.withValues(alpha: 0.52),
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: child,
        ),
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.actions,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      constraints: const BoxConstraints(maxWidth: 380),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.7)),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.24),
            blurRadius: 36,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 62,
            height: 62,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: <Color>[Color(0xFF2EE6D6), Color(0xFF3E8DFF)],
              ),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.white, size: 30),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 10,
            runSpacing: 10,
            children: actions,
          ),
        ],
      ),
    );
  }
}

class SignalPainter extends CustomPainter {
  const SignalPainter({required this.engine});

  final SignalEngine engine;

  @override
  void paint(Canvas canvas, Size size) {
    _paintBackground(canvas, size);
    _paintObjects(canvas);
    _paintParticles(canvas);
    _paintPlayer(canvas);
  }

  void _paintBackground(Canvas canvas, Size size) {
    final Paint paint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: <Color>[Color(0xFF080B14), Color(0xFF0F1524)],
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, paint);

    final Paint gridPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.045)
      ..strokeWidth = 1;
    const double spacing = 42;
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final Rect glowRect = Rect.fromCenter(
      center: Offset(engine.playerX, size.height - 68),
      width: 240,
      height: 150,
    );
    canvas.drawOval(
      glowRect,
      Paint()
        ..shader = RadialGradient(
          colors: <Color>[
            const Color(0xFF2EE6D6).withValues(alpha: 0.12),
            Colors.transparent,
          ],
        ).createShader(glowRect),
    );

    if (engine.phase.rule == SignalRule.cue) {
      final Color cue = engine.cueColorForUi;
      final Paint borderPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 6
        ..shader = SweepGradient(
          colors: <Color>[
            cue.withValues(alpha: 0),
            cue.withValues(alpha: 0.9),
            cue.withValues(alpha: 0),
          ],
        ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
      canvas.drawRect(
        Rect.fromLTWH(2, 2, size.width - 4, size.height - 4),
        borderPaint,
      );
    }

    if (engine.phase.rule == SignalRule.memory && !engine.cueVisible) {
      final Paint dim = Paint()..color = Colors.black.withValues(alpha: 0.08);
      canvas.drawRect(Offset.zero & size, dim);
    }
  }

  void _paintObjects(Canvas canvas) {
    for (final SignalObject object in engine.objects) {
      final Offset center = Offset(object.x, object.y);
      final double pulse = 1 + math.sin(object.pulse) * 0.035;
      final double radius = object.radius * pulse;

      final Paint glow = Paint()
        ..color = object.color.withValues(alpha: 0.22)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);
      _drawShape(canvas, center, radius + 6, object.shape, glow);

      final Paint fill = Paint()
        ..shader = RadialGradient(
          center: const Alignment(-0.35, -0.4),
          radius: 0.9,
          colors: <Color>[
            Color.lerp(object.color, Colors.white, 0.25) ?? object.color,
            object.color,
          ],
        ).createShader(Rect.fromCircle(center: center, radius: radius));
      _drawShape(canvas, center, radius, object.shape, fill);

      final Paint outline = Paint()
        ..color = Colors.white.withValues(alpha: 0.68)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8;
      _drawShape(canvas, center, radius, object.shape, outline);
    }
  }

  void _drawShape(
    Canvas canvas,
    Offset center,
    double radius,
    SignalShape shape,
    Paint paint,
  ) {
    switch (shape) {
      case SignalShape.circle:
        canvas.drawCircle(center, radius, paint);
        break;
      case SignalShape.triangle:
        final Path path = Path()
          ..moveTo(center.dx, center.dy - radius)
          ..lineTo(center.dx + radius * 0.95, center.dy + radius * 0.7)
          ..lineTo(center.dx - radius * 0.95, center.dy + radius * 0.7)
          ..close();
        canvas.drawPath(path, paint);
        break;
      case SignalShape.square:
        final RRect rrect = RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: center,
            width: radius * 1.7,
            height: radius * 1.7,
          ),
          Radius.circular(radius * 0.28),
        );
        canvas.drawRRect(rrect, paint);
        break;
      case SignalShape.diamond:
        final Path path = Path()
          ..moveTo(center.dx, center.dy - radius)
          ..lineTo(center.dx + radius, center.dy)
          ..lineTo(center.dx, center.dy + radius)
          ..lineTo(center.dx - radius, center.dy)
          ..close();
        canvas.drawPath(path, paint);
        break;
    }
  }

  void _paintParticles(Canvas canvas) {
    for (final SignalParticle particle in engine.particles) {
      final Paint paint = Paint()
        ..color = particle.color.withValues(
          alpha: (particle.life / 0.9).clamp(0, 1),
        );
      canvas.drawCircle(
        Offset(particle.x, particle.y),
        particle.radius * particle.life.clamp(0.4, 1),
        paint,
      );
    }
  }

  void _paintPlayer(Canvas canvas) {
    final Offset center = Offset(engine.playerX, engine.playerY);
    final Paint outerGlow = Paint()
      ..color = const Color(0xFF2EE6D6).withValues(alpha: 0.28)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 18);
    canvas.drawCircle(center, SignalEngine.playerRadius + 4, outerGlow);

    final Paint ring = Paint()
      ..shader =
          const SweepGradient(
            colors: <Color>[
              Color(0xFF2EE6D6),
              Color(0xFF3E8DFF),
              Color(0xFF2EE6D6),
            ],
          ).createShader(
            Rect.fromCircle(center: center, radius: SignalEngine.playerRadius),
          );
    canvas.drawCircle(center, SignalEngine.playerRadius, ring);

    final Paint core = Paint()
      ..shader =
          const RadialGradient(
            colors: <Color>[Color(0xFF17203A), Color(0xFF0B0F1C)],
          ).createShader(
            Rect.fromCircle(center: center, radius: SignalEngine.playerRadius),
          );
    canvas.drawCircle(center, SignalEngine.playerRadius - 6, core);

    canvas.drawCircle(
      center,
      7,
      Paint()
        ..shader = RadialGradient(
          colors: <Color>[
            Colors.white.withValues(alpha: 0.95),
            const Color(0xFF2EE6D6).withValues(alpha: 0),
          ],
        ).createShader(Rect.fromCircle(center: center, radius: 8)),
    );

    if (engine.combo >= 4) {
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: SignalEngine.playerRadius + 8),
        -1.5,
        3,
        false,
        Paint()
          ..color = const Color(0xFFFFC247).withValues(alpha: 0.75)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5,
      );
    }
  }

  @override
  bool shouldRepaint(covariant SignalPainter oldDelegate) {
    return true;
  }
}
