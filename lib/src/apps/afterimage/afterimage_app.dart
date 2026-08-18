import 'dart:math';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/local_store.dart';
import 'afterimage_engine.dart';

class AfterimageApp extends StatefulWidget {
  const AfterimageApp({super.key});

  @override
  State<AfterimageApp> createState() => _AfterimageAppState();
}

class _AfterimageAppState extends State<AfterimageApp>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late final AnimationController _ticker;
  late final AfterimageEngine _engine;
  Duration? _lastFrame;
  bool _paused = false;
  int _bestScore = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _engine = AfterimageEngine();
    _loadBestScore();
    _ticker = AnimationController.unbounded(vsync: this)
      ..addListener(_frame)
      ..repeat(min: 0, max: 100000, period: const Duration(days: 1));
  }

  Future<void> _loadBestScore() async {
    final String? saved = await LocalStore.readString(
      LocalStore.afterimageBestKey,
    );
    if (mounted) {
      setState(() => _bestScore = int.tryParse(saved ?? '') ?? 0);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed &&
        _engine.phase == AfterimagePhase.playing) {
      setState(() {
        _paused = true;
        _engine.setMove(Offset.zero);
        _engine.setAct(false);
      });
    }
  }

  void _frame() {
    final Duration now = _ticker.lastElapsedDuration ?? Duration.zero;
    final double delta = _lastFrame == null
        ? 0
        : (now - _lastFrame!).inMicroseconds / Duration.microsecondsPerSecond;
    _lastFrame = now;
    if (!_paused) {
      _engine.tick(delta);
      for (final AfterimageEvent event in _engine.drainEvents()) {
        _respondTo(event);
      }
    }
    if (mounted) {
      setState(() {});
    }
  }

  void _respondTo(AfterimageEvent event) {
    switch (event.kind) {
      case AfterimageEventKind.dash:
      case AfterimageEventKind.pulse:
        HapticFeedback.selectionClick();
      case AfterimageEventKind.hack:
      case AfterimageEventKind.relic:
        HapticFeedback.mediumImpact();
      case AfterimageEventKind.core:
        HapticFeedback.heavyImpact();
        SystemSound.play(SystemSoundType.click);
      case AfterimageEventKind.escaped:
        HapticFeedback.heavyImpact();
        SystemSound.play(SystemSoundType.click);
        if (_engine.score > _bestScore) {
          _bestScore = _engine.score;
          LocalStore.writeString(
            LocalStore.afterimageBestKey,
            _bestScore.toString(),
          );
        }
      case AfterimageEventKind.caught:
        HapticFeedback.vibrate();
      case AfterimageEventKind.rewind:
        HapticFeedback.lightImpact();
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
    return PopScope(
      onPopInvokedWithResult: (bool didPop, Object? result) {
        if (!didPop) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF06070D),
        body: SafeArea(
          bottom: false,
          child: Stack(
            children: <Widget>[
              Column(
                children: <Widget>[
                  _TopBar(
                    engine: _engine,
                    paused: _paused,
                    onBack: () => Navigator.of(context).pop(),
                    onPause: () => setState(() => _paused = !_paused),
                  ),
                  Expanded(
                    child: _GameViewport(
                      engine: _engine,
                      bestScore: _bestScore,
                    ),
                  ),
                  _ControlDeck(engine: _engine),
                ],
              ),
              if (_engine.phase == AfterimagePhase.ready)
                _BriefingOverlay(
                  onStart: () {
                    _engine.start();
                    setState(() {});
                  },
                ),
              if (_paused && _engine.phase != AfterimagePhase.ready)
                _PauseOverlay(onResume: () => setState(() => _paused = false)),
              if (_engine.phase == AfterimagePhase.missionComplete)
                _CompleteOverlay(
                  engine: _engine,
                  onContinue: () {
                    _engine.nextMission();
                    setState(() {});
                  },
                ),
              if (_engine.phase == AfterimagePhase.caught ||
                  _engine.phase == AfterimagePhase.loopTransition)
                IgnorePointer(
                  child: Center(
                    child: _LoopNotice(
                      caught: _engine.phase == AfterimagePhase.caught,
                      message: _engine.transitionMessage,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.engine,
    required this.paused,
    required this.onBack,
    required this.onPause,
  });

  final AfterimageEngine engine;
  final bool paused;
  final VoidCallback onBack;
  final VoidCallback onPause;

  @override
  Widget build(BuildContext context) {
    final bool urgent = engine.remainingTime < 5;
    final bool compact = MediaQuery.sizeOf(context).width < 410;
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: Color(0xFF0A0C14),
        border: Border(bottom: BorderSide(color: Color(0xFF24273A))),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(4, 6, 4, 7),
        child: Row(
          children: <Widget>[
            _HudButton(icon: Icons.arrow_back_rounded, onTap: onBack),
            if (!compact) ...<Widget>[
              const SizedBox(width: 7),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Text(
                    'AFTERIMAGE',
                    style: TextStyle(
                      color: Color(0xFFF4F1FF),
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.8,
                    ),
                  ),
                  Text(
                    'TIME VAULT',
                    style: TextStyle(
                      color: Color(0xFF7E829B),
                      fontSize: 8,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.4,
                    ),
                  ),
                ],
              ),
            ],
            const Spacer(),
            _HudStat(label: 'VAULT', value: '${engine.level}'),
            _HudStat(
              label: 'LOOP',
              value: engine.phase == AfterimagePhase.ready
                  ? '--'
                  : engine.remainingTime.toStringAsFixed(1),
              color: urgent ? const Color(0xFFFF557C) : const Color(0xFF67F7E5),
            ),
            _HudStat(label: 'ECHO', value: '${engine.echoes.length}/4'),
            _HudButton(
              icon: paused ? Icons.play_arrow_rounded : Icons.pause_rounded,
              onTap: onPause,
            ),
          ],
        ),
      ),
    );
  }
}

class _HudStat extends StatelessWidget {
  const _HudStat({required this.label, required this.value, this.color});

  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 47),
      margin: const EdgeInsets.only(right: 4),
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF121522),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF24283C)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(
            value,
            style: TextStyle(
              color: color ?? const Color(0xFFE9E7F7),
              fontSize: 12,
              fontWeight: FontWeight.w900,
              fontFeatures: const <ui.FontFeature>[
                ui.FontFeature.tabularFigures(),
              ],
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF6F748C),
              fontSize: 7,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.7,
            ),
          ),
        ],
      ),
    );
  }
}

class _HudButton extends StatelessWidget {
  const _HudButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onTap,
      visualDensity: VisualDensity.compact,
      style: IconButton.styleFrom(
        backgroundColor: const Color(0xFF151827),
        foregroundColor: const Color(0xFFC7C9DA),
        side: const BorderSide(color: Color(0xFF292D43)),
      ),
      icon: Icon(icon, size: 19),
    );
  }
}

class _GameViewport extends StatelessWidget {
  const _GameViewport({required this.engine, required this.bestScore});

  final AfterimageEngine engine;
  final int bestScore;

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          Image.asset(
            'assets/game/afterimage/vault_floor.png',
            fit: BoxFit.cover,
            color: const Color(0xFF6E738A).withValues(alpha: 0.34),
            colorBlendMode: BlendMode.modulate,
            filterQuality: FilterQuality.medium,
          ),
          CustomPaint(painter: _AfterimagePainter(engine)),
          Positioned(
            left: 12,
            right: 12,
            top: 9,
            child: Row(
              children: <Widget>[
                Expanded(
                  child: _ObjectivePill(
                    icon: engine.carryingCore
                        ? Icons.exit_to_app_rounded
                        : engine.gateOpen
                        ? Icons.diamond_rounded
                        : Icons.route_rounded,
                    text: engine.guidance,
                    progress: engine.missionProgress,
                  ),
                ),
                const SizedBox(width: 8),
                _ScorePill(score: engine.score, best: bestScore),
              ],
            ),
          ),
          if (engine.detection > 0.02)
            Positioned(
              left: 12,
              right: 12,
              bottom: 10,
              child: _DetectionMeter(value: engine.detection),
            ),
        ],
      ),
    );
  }
}

class _ObjectivePill extends StatelessWidget {
  const _ObjectivePill({
    required this.icon,
    required this.text,
    required this.progress,
  });

  final IconData icon;
  final String text;
  final double progress;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: const Color(0xE810121D),
          border: Border.all(color: const Color(0x88373C57)),
          boxShadow: const <BoxShadow>[
            BoxShadow(
              color: Color(0x66000000),
              blurRadius: 12,
              offset: Offset(0, 5),
            ),
          ],
        ),
        child: Stack(
          alignment: Alignment.centerLeft,
          children: <Widget>[
            Positioned.fill(
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: progress.clamp(0, 1),
                child: const ColoredBox(color: Color(0x2424E7CC)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Row(
                children: <Widget>[
                  Icon(icon, color: const Color(0xFF68F6E4), size: 15),
                  const SizedBox(width: 7),
                  Flexible(
                    child: Text(
                      text.toUpperCase(),
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFFE6E7F0),
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScorePill extends StatelessWidget {
  const _ScorePill({required this.score, required this.best});

  final int score;
  final int best;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xE810121D),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x88373C57)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(
            score.toString().padLeft(5, '0'),
            style: const TextStyle(
              color: Color(0xFFFFD979),
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1,
              fontFeatures: <ui.FontFeature>[ui.FontFeature.tabularFigures()],
            ),
          ),
          Text(
            'BEST ${best.toString().padLeft(5, '0')}',
            style: const TextStyle(
              color: Color(0xFF74788E),
              fontSize: 6,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _DetectionMeter extends StatelessWidget {
  const _DetectionMeter({required this.value});

  final double value;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 24,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xDD200A13),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: const Color(0x99FF416C)),
      ),
      child: Row(
        children: <Widget>[
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 5),
            child: Icon(
              Icons.visibility_rounded,
              color: Color(0xFFFF6687),
              size: 13,
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                value: value,
                minHeight: 8,
                color: const Color(0xFFFF416C),
                backgroundColor: const Color(0xFF391724),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ControlDeck extends StatelessWidget {
  const _ControlDeck({required this.engine});

  final AfterimageEngine engine;

  @override
  Widget build(BuildContext context) {
    final bool enabled = engine.phase == AfterimagePhase.playing;
    return Container(
      height: 164 + MediaQuery.paddingOf(context).bottom,
      padding: EdgeInsets.fromLTRB(
        14,
        10,
        14,
        10 + MediaQuery.paddingOf(context).bottom,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF090B12),
        border: Border(top: BorderSide(color: Color(0xFF262A3C))),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Color(0x99000000),
            blurRadius: 18,
            offset: Offset(0, -5),
          ),
        ],
      ),
      child: Row(
        children: <Widget>[
          _VirtualStick(enabled: enabled, onChanged: engine.setMove),
          const Spacer(),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              _ActionButton(
                label: 'PULSE',
                icon: Icons.waves_rounded,
                color: const Color(0xFF9D78FF),
                enabled: enabled && engine.pulseAvailable,
                onPressed: engine.requestPulse,
                small: true,
              ),
              const SizedBox(height: 10),
              _ActionButton(
                label: 'REWIND',
                icon: Icons.replay_rounded,
                color: const Color(0xFF778099),
                enabled: enabled,
                onPressed: engine.requestRewind,
                small: true,
              ),
            ],
          ),
          const SizedBox(width: 10),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              _HoldButton(enabled: enabled, onChanged: engine.setAct),
              const SizedBox(height: 9),
              _ActionButton(
                label: engine.dashCooldown > 0
                    ? engine.dashCooldown.toStringAsFixed(1)
                    : 'DASH',
                icon: Icons.double_arrow_rounded,
                color: const Color(0xFF48EED9),
                enabled: enabled && engine.dashCooldown <= 0,
                onPressed: engine.requestDash,
                small: true,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _VirtualStick extends StatefulWidget {
  const _VirtualStick({required this.enabled, required this.onChanged});

  final bool enabled;
  final ValueChanged<Offset> onChanged;

  @override
  State<_VirtualStick> createState() => _VirtualStickState();
}

class _VirtualStickState extends State<_VirtualStick> {
  Offset _value = Offset.zero;

  void _update(Offset local) {
    if (!widget.enabled) {
      return;
    }
    const Offset center = Offset(66, 66);
    Offset next = (local - center) / 43;
    if (next.distance > 1) {
      next /= next.distance;
    }
    setState(() => _value = next);
    widget.onChanged(next);
  }

  void _release() {
    setState(() => _value = Offset.zero);
    widget.onChanged(Offset.zero);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      key: const ValueKey<String>('afterimage-stick'),
      behavior: HitTestBehavior.opaque,
      onPanDown: (DragDownDetails details) => _update(details.localPosition),
      onPanUpdate: (DragUpdateDetails details) =>
          _update(details.localPosition),
      onPanEnd: (_) => _release(),
      onPanCancel: _release,
      child: SizedBox.square(
        dimension: 132,
        child: CustomPaint(painter: _StickPainter(_value, widget.enabled)),
      ),
    );
  }
}

class _StickPainter extends CustomPainter {
  const _StickPainter(this.value, this.enabled);

  final Offset value;
  final bool enabled;

  @override
  void paint(Canvas canvas, Size size) {
    final Offset center = size.center(Offset.zero);
    canvas.drawCircle(
      center,
      60,
      Paint()
        ..shader = const RadialGradient(
          colors: <Color>[Color(0xFF171B2B), Color(0xFF0B0D16)],
        ).createShader(Rect.fromCircle(center: center, radius: 60)),
    );
    canvas.drawCircle(
      center,
      59,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..color = enabled ? const Color(0xFF343A53) : const Color(0xFF202331),
    );
    for (int index = 0; index < 4; index++) {
      final double angle = index * pi / 2;
      final Offset point = center + Offset(cos(angle), sin(angle)) * 48;
      canvas.drawCircle(point, 2, Paint()..color = const Color(0xFF474C64));
    }
    final Offset knob = center + value * 34;
    canvas.drawCircle(
      knob + const Offset(0, 5),
      27,
      Paint()..color = const Color(0x99000000),
    );
    canvas.drawCircle(
      knob,
      26,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[Color(0xFF39405A), Color(0xFF181C2A)],
        ).createShader(Rect.fromCircle(center: knob, radius: 26)),
    );
    canvas.drawCircle(
      knob,
      25,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..color = enabled ? const Color(0xFF63EEDC) : const Color(0xFF505367),
    );
  }

  @override
  bool shouldRepaint(_StickPainter oldDelegate) =>
      oldDelegate.value != value || oldDelegate.enabled != enabled;
}

class _HoldButton extends StatelessWidget {
  const _HoldButton({required this.enabled, required this.onChanged});

  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      key: const ValueKey<String>('afterimage-act'),
      onTapDown: enabled ? (_) => onChanged(true) : null,
      onTapUp: enabled ? (_) => onChanged(false) : null,
      onTapCancel: enabled ? () => onChanged(false) : null,
      child: AnimatedOpacity(
        opacity: enabled ? 1 : 0.38,
        duration: const Duration(milliseconds: 150),
        child: Container(
          width: 72,
          height: 72,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: <Color>[Color(0xFFFFD87B), Color(0xFFC47720)],
            ),
            border: Border.all(color: const Color(0xFFFFE9A8), width: 1.5),
            boxShadow: const <BoxShadow>[
              BoxShadow(color: Color(0x55FFB63E), blurRadius: 18),
              BoxShadow(
                color: Color(0xAA000000),
                blurRadius: 8,
                offset: Offset(0, 6),
              ),
            ],
          ),
          child: const Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Icon(Icons.touch_app_rounded, color: Color(0xFF241507), size: 22),
              Text(
                'HOLD ACT',
                style: TextStyle(
                  color: Color(0xFF241507),
                  fontSize: 8,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.enabled,
    required this.onPressed,
    this.small = false,
  });

  final String label;
  final IconData icon;
  final Color color;
  final bool enabled;
  final VoidCallback onPressed;
  final bool small;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: small ? 68 : 76,
      height: 48,
      child: FilledButton(
        onPressed: enabled ? onPressed : null,
        style: FilledButton.styleFrom(
          padding: EdgeInsets.zero,
          backgroundColor: color.withValues(alpha: 0.17),
          disabledBackgroundColor: const Color(0xFF151722),
          foregroundColor: color,
          disabledForegroundColor: const Color(0xFF4C5062),
          side: BorderSide(
            color: enabled
                ? color.withValues(alpha: 0.65)
                : const Color(0xFF252837),
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Icon(icon, size: 17),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                fontSize: 8,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BriefingOverlay extends StatelessWidget {
  const _BriefingOverlay({required this.onStart});

  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    return _ModalScrim(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 370),
        child: Container(
          margin: const EdgeInsets.all(22),
          padding: const EdgeInsets.all(24),
          decoration: _panelDecoration(const Color(0xFF7259ED)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const _Eyebrow('ORIGINAL TIME-HEIST'),
              const SizedBox(height: 8),
              const Text(
                'Outsmart the room.\nThen outsmart yourself.',
                style: TextStyle(
                  color: Color(0xFFF7F5FF),
                  fontSize: 27,
                  height: 1.02,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.8,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Every rewind records your exact movement and actions. Use an echo to hold the pressure plate while your next self hacks the vault. Guards remember noise — bait them with PULSE.',
                style: TextStyle(
                  color: Color(0xFFB8BBCD),
                  fontSize: 12,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 18),
              const Row(
                children: <Widget>[
                  Expanded(
                    child: _BriefPoint(
                      icon: Icons.route_rounded,
                      text: 'MOVE & DASH',
                    ),
                  ),
                  SizedBox(width: 7),
                  Expanded(
                    child: _BriefPoint(
                      icon: Icons.replay_rounded,
                      text: 'RECORD ECHO',
                    ),
                  ),
                  SizedBox(width: 7),
                  Expanded(
                    child: _BriefPoint(
                      icon: Icons.visibility_off_rounded,
                      text: 'BREAK SIGHT',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  key: const ValueKey<String>('afterimage-start'),
                  onPressed: onStart,
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('ENTER THE FIRST LOOP'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF6AF6E4),
                    foregroundColor: const Color(0xFF07110F),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    textStyle: const TextStyle(
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.7,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BriefPoint extends StatelessWidget {
  const _BriefPoint({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 3),
      decoration: BoxDecoration(
        color: const Color(0xFF151726),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: <Widget>[
          Icon(icon, color: const Color(0xFF987BFF), size: 19),
          const SizedBox(height: 4),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFFAEB1C2),
              fontSize: 7,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _CompleteOverlay extends StatelessWidget {
  const _CompleteOverlay({required this.engine, required this.onContinue});

  final AfterimageEngine engine;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    return _ModalScrim(
      child: Container(
        width: 330,
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(24),
        decoration: _panelDecoration(const Color(0xFF56F3DC)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(
              Icons.diamond_rounded,
              color: Color(0xFF67F7E5),
              size: 43,
            ),
            const SizedBox(height: 9),
            const _Eyebrow('VAULT EXTRACTED'),
            const SizedBox(height: 5),
            Text(
              '${engine.score.toString().padLeft(5, '0')} PTS',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 31,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.7,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '${engine.echoes.length} echoes used  •  ${engine.relicCollected ? 'relic recovered' : 'relic missed'}',
              style: const TextStyle(color: Color(0xFFAAAFC3), fontSize: 12),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: onContinue,
                icon: const Icon(Icons.arrow_forward_rounded),
                label: const Text('NEXT VAULT'),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF64F4E1),
                  foregroundColor: const Color(0xFF071411),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  textStyle: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PauseOverlay extends StatelessWidget {
  const _PauseOverlay({required this.onResume});

  final VoidCallback onResume;

  @override
  Widget build(BuildContext context) {
    return _ModalScrim(
      child: FilledButton.icon(
        onPressed: onResume,
        icon: const Icon(Icons.play_arrow_rounded),
        label: const Text('RESUME LOOP'),
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFF64F4E1),
          foregroundColor: const Color(0xFF071411),
          padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 16),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w900,
            letterSpacing: 0.8,
          ),
        ),
      ),
    );
  }
}

class _LoopNotice extends StatelessWidget {
  const _LoopNotice({required this.caught, required this.message});

  final bool caught;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: caught ? const Color(0xF02A0B15) : const Color(0xF013102A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: caught ? const Color(0xFFFF4D75) : const Color(0xFF9474FF),
        ),
        boxShadow: const <BoxShadow>[
          BoxShadow(color: Color(0xBB000000), blurRadius: 22),
        ],
      ),
      child: Text(
        message.toUpperCase(),
        style: TextStyle(
          color: caught ? const Color(0xFFFF7B98) : const Color(0xFFB5A0FF),
          fontSize: 12,
          fontWeight: FontWeight.w900,
          letterSpacing: 1.1,
        ),
      ),
    );
  }
}

class _ModalScrim extends StatelessWidget {
  const _ModalScrim({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: const Color(0xE806070C),
        child: Center(child: child),
      ),
    );
  }
}

class _Eyebrow extends StatelessWidget {
  const _Eyebrow(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: Color(0xFF8D76EF),
        fontSize: 9,
        fontWeight: FontWeight.w900,
        letterSpacing: 1.7,
      ),
    );
  }
}

BoxDecoration _panelDecoration(Color accent) => BoxDecoration(
  color: const Color(0xFF0E101A),
  borderRadius: BorderRadius.circular(25),
  border: Border.all(color: accent.withValues(alpha: 0.55)),
  boxShadow: <BoxShadow>[
    BoxShadow(color: accent.withValues(alpha: 0.15), blurRadius: 40),
    const BoxShadow(
      color: Color(0xCC000000),
      blurRadius: 22,
      offset: Offset(0, 10),
    ),
  ],
);

class _AfterimagePainter extends CustomPainter {
  _AfterimagePainter(this.engine);

  final AfterimageEngine engine;
  static const List<Color> _echoColors = <Color>[
    Color(0xFF52EBD9),
    Color(0xFFA67BFF),
    Color(0xFF58A6FF),
    Color(0xFFFF74C8),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final double scale = min(
      size.width / AfterimageEngine.worldWidth,
      size.height / AfterimageEngine.worldHeight,
    );
    final Offset origin = Offset(
      (size.width - AfterimageEngine.worldWidth * scale) / 2,
      (size.height - AfterimageEngine.worldHeight * scale) / 2,
    );
    final double wobble = engine.shake * 3.2;
    final Offset shake = Offset(
      sin(engine.loopTime * 49) * wobble,
      cos(engine.loopTime * 41) * wobble,
    );
    canvas.save();
    canvas.translate(origin.dx + shake.dx, origin.dy + shake.dy);
    canvas.scale(scale);

    _paintFloorGrid(canvas);
    _paintExit(canvas);
    _paintPlate(canvas);
    _paintConsole(canvas);
    _paintVault(canvas);
    _paintRelic(canvas);
    for (final Rect wall in engine.layout.walls) {
      _paintWall(canvas, wall);
    }
    for (final AfterimageGuard guard in engine.layout.guards) {
      _paintGuardSight(canvas, guard);
    }
    for (int index = 0; index < engine.echoes.length; index++) {
      _paintEchoTrail(
        canvas,
        engine.echoes[index],
        _echoColors[index % _echoColors.length],
      );
    }
    final List<ReplayFrame> states = engine.echoStates;
    for (int index = 0; index < states.length; index++) {
      _paintAgent(
        canvas,
        states[index].position,
        _echoColors[index % _echoColors.length],
        ghost: true,
        moving: states[index].moving,
      );
    }
    for (final AfterimageGuard guard in engine.layout.guards) {
      _paintGuard(canvas, guard);
    }
    _paintAgent(
      canvas,
      engine.playerPosition,
      const Color(0xFFF7F5FF),
      carrying: engine.carryingCore,
      moving: engine.moveInput.distance > 0.08,
    );
    for (final AfterimageEffect effect in engine.effects) {
      _paintEffect(canvas, effect);
    }
    canvas.restore();

    _paintVignette(canvas, size);
    if (engine.detection > 0) {
      canvas.drawRect(
        Offset.zero & size,
        Paint()
          ..shader = RadialGradient(
            colors: <Color>[
              Colors.transparent,
              const Color(0xFFFF174F)
                  .withValues(alpha: engine.detection * 0.28),
            ],
            stops: const <double>[0.5, 1],
          ).createShader(Offset.zero & size),
      );
    }
  }

  void _paintFloorGrid(Canvas canvas) {
    final Paint line = Paint()..color = const Color(0x1820DCCA);
    for (double x = 0; x <= AfterimageEngine.worldWidth; x += 40) {
      canvas.drawLine(
        Offset(x, 0),
        Offset(x, AfterimageEngine.worldHeight),
        line,
      );
    }
    for (double y = 0; y <= AfterimageEngine.worldHeight; y += 40) {
      canvas.drawLine(
        Offset(0, y),
        Offset(AfterimageEngine.worldWidth, y),
        line,
      );
    }
  }

  void _paintWall(Canvas canvas, Rect wall) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        wall.shift(const Offset(0, 8)),
        const Radius.circular(4),
      ),
      Paint()..color = const Color(0xA6000000),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        wall.shift(const Offset(0, 5)),
        const Radius.circular(4),
      ),
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: <Color>[Color(0xFF121522), Color(0xFF070810)],
        ).createShader(wall),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(wall, const Radius.circular(4)),
      Paint()
        ..shader = const LinearGradient(
          colors: <Color>[Color(0xFF383C50), Color(0xFF1A1D2C)],
        ).createShader(wall),
    );
    canvas.drawLine(
      wall.topLeft + const Offset(5, 3),
      wall.topRight - const Offset(5, -3),
      Paint()..color = const Color(0xFF555A70),
    );
  }

  void _paintPlate(Canvas canvas) {
    final bool active = engine.plateActive;
    final double pulse = 0.5 + sin(engine.loopTime * 5) * 0.5;
    canvas.drawCircle(
      engine.layout.plate,
      25 + pulse * 3,
      Paint()
        ..color = (active ? const Color(0xFF4BF4DC) : const Color(0xFF8B73EF))
            .withValues(alpha: 0.1 + pulse * 0.09),
    );
    canvas.drawCircle(
      engine.layout.plate,
      19,
      Paint()..color = const Color(0xFF111522),
    );
    canvas.drawCircle(
      engine.layout.plate,
      17,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..color = active ? const Color(0xFF5CF7E4) : const Color(0xFF705FAF),
    );
    canvas.drawCircle(
      engine.layout.plate,
      5,
      Paint()
        ..color = active ? const Color(0xFFB8FFF5) : const Color(0xFF4B426D),
    );
  }

  void _paintConsole(Canvas canvas) {
    final Offset point = engine.layout.console;
    final Rect body = Rect.fromCenter(
      center: point + const Offset(0, 5),
      width: 30,
      height: 38,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(body, const Radius.circular(5)),
      Paint()..color = const Color(0xFF0B0D15),
    );
    final Rect screen = Rect.fromCenter(center: point, width: 24, height: 24);
    canvas.drawRRect(
      RRect.fromRectAndRadius(screen, const Radius.circular(4)),
      Paint()
        ..color = engine.plateActive
            ? const Color(0xFF163E3A)
            : const Color(0xFF251B3E),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(screen.deflate(3), const Radius.circular(3)),
      Paint()
        ..color = engine.plateActive
            ? const Color(0xFF62F5E2)
            : const Color(0xFF8F74F4),
    );
    if (engine.hackProgress > 0) {
      canvas.drawArc(
        Rect.fromCircle(center: point, radius: 22),
        -pi / 2,
        pi * 2 * engine.hackProgress,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3
          ..strokeCap = StrokeCap.round
          ..color = const Color(0xFFFFD76E),
      );
    }
  }

  void _paintVault(Canvas canvas) {
    final Rect chamber = const Rect.fromLTRB(139, 23, 261, 143);
    canvas.drawRRect(
      RRect.fromRectAndRadius(chamber, const Radius.circular(8)),
      Paint()..color = const Color(0xCC080A12),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(chamber.deflate(4), const Radius.circular(6)),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..color = engine.gateOpen
            ? const Color(0xFF48EAD6)
            : const Color(0xFF4C5064),
    );
    if (!engine.carryingCore) {
      final double pulse = 0.75 + sin(engine.loopTime * 4) * 0.25;
      canvas.drawCircle(
        engine.layout.core,
        28,
        Paint()
          ..color = const Color(0xFF7BF7E5).withValues(alpha: pulse * 0.12),
      );
      final Path crystal = Path()
        ..moveTo(engine.layout.core.dx, engine.layout.core.dy - 16)
        ..lineTo(engine.layout.core.dx + 11, engine.layout.core.dy)
        ..lineTo(engine.layout.core.dx, engine.layout.core.dy + 16)
        ..lineTo(engine.layout.core.dx - 11, engine.layout.core.dy)
        ..close();
      canvas.drawPath(
        crystal,
        Paint()
          ..shader = const LinearGradient(
            colors: <Color>[
              Color(0xFFFFFFFF),
              Color(0xFF57EAD8),
              Color(0xFF4E50D9),
            ],
          ).createShader(crystal.getBounds()),
      );
    }
    if (!engine.gateOpen) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(engine.gateRect, const Radius.circular(3)),
        Paint()
          ..shader = const LinearGradient(
            colors: <Color>[Color(0xFF667086), Color(0xFF222635)],
          ).createShader(engine.gateRect),
      );
      for (
        double x = engine.gateRect.left + 8;
        x < engine.gateRect.right;
        x += 12
      ) {
        canvas.drawLine(
          Offset(x, engine.gateRect.top + 2),
          Offset(x, engine.gateRect.bottom - 2),
          Paint()
            ..color = const Color(0xFF161A26)
            ..strokeWidth = 3,
        );
      }
    }
  }

  void _paintExit(Canvas canvas) {
    final Offset point = engine.layout.exit;
    final double pulse = 0.5 + sin(engine.loopTime * 4.2) * 0.5;
    canvas.drawOval(
      Rect.fromCenter(center: point, width: 66, height: 35),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..color =
            (engine.carryingCore
                    ? const Color(0xFF6AF7E4)
                    : const Color(0xFF5D647B))
                .withValues(alpha: 0.6 + pulse * 0.3),
    );
    canvas.drawOval(
      Rect.fromCenter(center: point, width: 46, height: 23),
      Paint()
        ..color = const Color(0xFF4AEFD9)
            .withValues(alpha: engine.carryingCore ? 0.15 : 0.04),
    );
  }

  void _paintRelic(Canvas canvas) {
    if (engine.relicCollected) {
      return;
    }
    final Offset point = engine.layout.relic;
    canvas.save();
    canvas.translate(point.dx, point.dy);
    canvas.rotate(engine.loopTime * 0.7);
    final Path star = Path();
    for (int i = 0; i < 8; i++) {
      final double a = i * pi / 4;
      final double radius = i.isEven ? 10 : 4;
      final Offset p = Offset(cos(a), sin(a)) * radius;
      if (i == 0) {
        star.moveTo(p.dx, p.dy);
      } else {
        star.lineTo(p.dx, p.dy);
      }
    }
    star.close();
    canvas.drawPath(star, Paint()..color = const Color(0xFFFFD36A));
    canvas.restore();
  }

  void _paintGuardSight(Canvas canvas, AfterimageGuard guard) {
    const double radius = 135;
    final Path cone = Path()
      ..moveTo(guard.position.dx, guard.position.dy)
      ..arcTo(
        Rect.fromCircle(center: guard.position, radius: radius),
        guard.facing - 0.48,
        0.96,
        false,
      )
      ..close();
    canvas.drawPath(
      cone,
      Paint()
        ..shader = RadialGradient(
          colors: <Color>[
            const Color(0xFFFF4269).withValues(alpha: 0.17),
            const Color(0xFFFF4269).withValues(alpha: 0.01),
          ],
        ).createShader(Rect.fromCircle(center: guard.position, radius: radius)),
    );
  }

  void _paintGuard(Canvas canvas, AfterimageGuard guard) {
    canvas.save();
    canvas.translate(guard.position.dx, guard.position.dy);
    canvas.rotate(guard.facing + pi / 2);
    final double bob = sin(engine.loopTime * 9 + guard.position.dx) * 1.2;
    canvas.drawOval(
      const Rect.fromLTRB(-12, 7, 12, 17),
      Paint()..color = const Color(0x88000000),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(0, bob), width: 21, height: 29),
        const Radius.circular(7),
      ),
      Paint()
        ..shader = const LinearGradient(
          colors: <Color>[Color(0xFFFF5E7F), Color(0xFF8E1E40)],
        ).createShader(const Rect.fromLTRB(-11, -15, 11, 15)),
    );
    canvas.drawCircle(
      const Offset(0, -8),
      6,
      Paint()..color = const Color(0xFF17101A),
    );
    canvas.drawRect(
      const Rect.fromLTRB(-7, -11, 7, -7),
      Paint()..color = const Color(0xFFFFA0B4),
    );
    canvas.restore();
    if (guard.investigateTarget != null) {
      canvas.drawCircle(
        guard.investigateTarget!,
        8,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = const Color(0xFFFFD66A),
      );
    }
  }

  void _paintEchoTrail(Canvas canvas, EchoTrack echo, Color color) {
    final List<ReplayFrame> visible = echo.frames
        .where((ReplayFrame frame) => frame.time <= engine.loopTime)
        .toList();
    if (visible.length < 2) {
      return;
    }
    final Path path = Path()
      ..moveTo(visible.first.position.dx, visible.first.position.dy);
    for (final ReplayFrame frame in visible.skip(1)) {
      path.lineTo(frame.position.dx, frame.position.dy);
    }
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..color = color.withValues(alpha: 0.24),
    );
  }

  void _paintAgent(
    Canvas canvas,
    Offset position,
    Color color, {
    bool ghost = false,
    bool carrying = false,
    bool moving = false,
  }) {
    final double bob = moving ? sin(engine.loopTime * 13) * 1.6 : 0;
    canvas.drawOval(
      Rect.fromCenter(
        center: position + const Offset(0, 9),
        width: 26,
        height: 12,
      ),
      Paint()..color = const Color(0x88000000),
    );
    if (ghost) {
      canvas.drawCircle(
        position,
        19,
        Paint()..color = color.withValues(alpha: 0.09),
      );
    }
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: position + Offset(0, bob),
          width: 20,
          height: 28,
        ),
        const Radius.circular(7),
      ),
      Paint()..color = color.withValues(alpha: ghost ? 0.46 : 1),
    );
    canvas.drawCircle(
      position + Offset(0, -8 + bob),
      6,
      Paint()
        ..color = ghost
            ? color.withValues(alpha: 0.5)
            : const Color(0xFF15141D),
    );
    canvas.drawRect(
      Rect.fromCenter(
        center: position + Offset(0, -8 + bob),
        width: 11,
        height: 3,
      ),
      Paint()
        ..color = ghost ? const Color(0xAAFFFFFF) : const Color(0xFF65F3E0),
    );
    if (carrying) {
      canvas.drawCircle(
        position + const Offset(11, -4),
        6,
        Paint()..color = const Color(0xFF7CFFED),
      );
    }
  }

  void _paintEffect(Canvas canvas, AfterimageEffect effect) {
    final double progress = effect.progress;
    final Color color = switch (effect.kind) {
      AfterimageEventKind.caught => const Color(0xFFFF3F68),
      AfterimageEventKind.relic => const Color(0xFFFFD366),
      AfterimageEventKind.dash => const Color(0xFF5DF4E1),
      _ => const Color(0xFF8F78FF),
    };
    canvas.drawCircle(
      effect.position,
      10 + progress * 62,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3 * (1 - progress)
        ..color = color.withValues(alpha: 1 - progress),
    );
    for (int i = 0; i < 7; i++) {
      final double angle = i * pi * 2 / 7 + progress;
      final Offset p =
          effect.position +
          Offset(cos(angle), sin(angle)) * (8 + progress * 37);
      canvas.drawCircle(
        p,
        2.8 * (1 - progress),
        Paint()..color = color.withValues(alpha: 1 - progress),
      );
    }
  }

  void _paintVignette(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = RadialGradient(
          radius: 0.9,
          colors: const <Color>[Colors.transparent, Color(0x9A020309)],
          stops: const <double>[0.55, 1],
        ).createShader(Offset.zero & size),
    );
  }

  @override
  bool shouldRepaint(_AfterimagePainter oldDelegate) => true;
}
