import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';
import 'parking_engine.dart';

const List<Color> _parkedCarColors = <Color>[
  Color(0xFF537188),
  Color(0xFFD16D5A),
  Color(0xFFE2B650),
  Color(0xFF7568A9),
  Color(0xFF4F8A78),
];

class ParkingApp extends StatefulWidget {
  const ParkingApp({super.key});

  @override
  State<ParkingApp> createState() => _ParkingAppState();
}

class _ParkingAppState extends State<ParkingApp>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  static const double _maxWheelRotation = 2.55;

  late final Ticker _ticker;
  ParkingEngine _engine = ParkingEngine();
  ParkingDifficulty _selectedDifficulty = ParkingDifficulty.easy;
  Duration? _lastElapsed;
  bool _playing = false;
  bool _paused = false;
  bool _pausedAutomatically = false;
  int _bestParks = 0;
  double _wheelRotation = 0;
  double _bumpFlash = 0;
  double _messageLife = 0;
  String _message = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _ticker = createTicker(_tick);
    _loadBest();
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
        !_engine.isParked) {
      _setPaused(true, automatic: true);
    }
  }

  Future<void> _loadBest() async {
    final String? stored = await LocalStore.readString(
      LocalStore.parkingBestKey,
    );
    if (mounted) {
      setState(() => _bestParks = int.tryParse(stored ?? '') ?? 0);
    }
  }

  void _startGame() {
    _ticker.stop();
    setState(() {
      _engine = ParkingEngine(difficulty: _selectedDifficulty);
      _playing = true;
      _paused = false;
      _pausedAutomatically = false;
      _wheelRotation = 0;
      _bumpFlash = 0;
      _message = _engine.scenario.hint;
      _messageLife = 3.2;
      _lastElapsed = null;
    });
    _ticker.start();
  }

  void _nextSpace() {
    _engine.nextScenario();
    setState(() {
      _wheelRotation = 0;
      _message = _engine.scenario.hint;
      _messageLife = 2.8;
      _lastElapsed = null;
    });
    _ticker.start();
  }

  void _retrySpace() {
    _engine.retryScenario();
    setState(() {
      _wheelRotation = 0;
      _message = 'Fresh start—take it slowly.';
      _messageLife = 1.8;
      _lastElapsed = null;
    });
    if (!_ticker.isActive) {
      _ticker.start();
    }
  }

  void _togglePause() => _setPaused(!_paused);

  void _setPaused(bool paused, {bool automatic = false}) {
    if (!_playing || _engine.isParked || _paused == paused) {
      return;
    }
    setState(() {
      _paused = paused;
      _pausedAutomatically = paused && automatic;
      _engine
        ..setThrottle(false)
        ..setBrake(false);
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
    _bumpFlash = max(0, _bumpFlash - dt * 3.4);
    _messageLife = max(0, _messageLife - dt);
    for (final ParkingEvent event in _engine.drainEvents()) {
      switch (event.kind) {
        case ParkingEventKind.bump:
          _bumpFlash = 0.72;
          _message = 'Bump! Use the brake and make a smaller correction.';
          _messageLife = 1.7;
          HapticFeedback.heavyImpact();
        case ParkingEventKind.parked:
          _ticker.stop();
          final int completed = _engine.parks + 1;
          if (completed > _bestParks) {
            _bestParks = completed;
            LocalStore.writeString(LocalStore.parkingBestKey, '$_bestParks');
          }
          HapticFeedback.mediumImpact();
      }
    }
    if (mounted) {
      setState(() {});
    }
  }

  void _setWheelRotation(double rotation) {
    if (!_playing || _paused || _engine.isParked) {
      return;
    }
    final double value = rotation.clamp(-_maxWheelRotation, _maxWheelRotation);
    setState(() {
      _wheelRotation = value;
      _engine.setSteering(value / _maxWheelRotation);
    });
  }

  void _setThrottle(bool pressed) {
    if (!_playing || _paused || _engine.isParked) {
      return;
    }
    _engine.setThrottle(pressed);
    if (mounted) {
      setState(() {});
    }
  }

  void _setBrake(bool pressed) {
    if (!_playing || _paused || _engine.isParked) {
      return;
    }
    _engine.setBrake(pressed);
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Parkline',
      icon: Icons.local_parking_rounded,
      actions: <Widget>[
        if (_playing && !_engine.isParked)
          IconButton(
            tooltip: _paused ? 'Resume game' : 'Pause game',
            onPressed: _togglePause,
            icon: Icon(
              _paused ? Icons.play_arrow_rounded : Icons.pause_rounded,
            ),
          ),
      ],
      body: Column(
        children: <Widget>[
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 6, 12, 4),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(26),
                child: Stack(
                  fit: StackFit.expand,
                  children: <Widget>[
                    RepaintBoundary(
                      child: CustomPaint(
                        painter: _ParkingPainter(
                          engine: _engine,
                          bumpFlash: _bumpFlash,
                        ),
                      ),
                    ),
                    if (_playing) ...<Widget>[
                      _ParkingHud(engine: _engine, bestParks: _bestParks),
                      if (_messageLife > 0 && !_engine.isParked)
                        _DrivingMessage(message: _message),
                    ],
                    if (!_playing)
                      _ReadyOverlay(
                        selectedDifficulty: _selectedDifficulty,
                        bestParks: _bestParks,
                        onDifficultyChanged: (ParkingDifficulty value) =>
                            setState(() => _selectedDifficulty = value),
                        onPlay: _startGame,
                      )
                    else if (_paused)
                      _PauseOverlay(
                        automatic: _pausedAutomatically,
                        onResume: _togglePause,
                        onRetry: _retrySpace,
                      )
                    else if (_engine.isParked)
                      _ParkedOverlay(
                        completed: _engine.parks + 1,
                        bumps: _engine.bumps,
                        onNext: _nextSpace,
                      ),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(
            height: 188,
            child: _ControlDeck(
              enabled: _playing && !_paused && !_engine.isParked,
              wheelRotation: _wheelRotation,
              throttlePressed: _engine.throttlePressed,
              brakePressed: _engine.brakePressed,
              reversing: _engine.isReversing,
              onWheelChanged: _setWheelRotation,
              onThrottleChanged: _setThrottle,
              onBrakeChanged: _setBrake,
            ),
          ),
        ],
      ),
    );
  }
}

class _ParkingHud extends StatelessWidget {
  const _ParkingHud({required this.engine, required this.bestParks});

  final ParkingEngine engine;
  final int bestParks;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.all(12),
      child: Align(
        alignment: Alignment.topCenter,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            _HudCard(
              eyebrow: 'SPACE ${engine.level}',
              value: engine.scenario.label,
              detail: engine.difficulty == ParkingDifficulty.easy
                  ? 'EASY'
                  : 'HARD',
            ),
            const Spacer(),
            _HudCard(
              eyebrow: 'SPEED',
              value: '${engine.speedKph.round()} km/h',
              detail: engine.isReversing ? 'REVERSE' : 'DRIVE',
              alignEnd: true,
            ),
          ],
        ),
      ),
    );
  }
}

class _HudCard extends StatelessWidget {
  const _HudCard({
    required this.eyebrow,
    required this.value,
    required this.detail,
    this.alignEnd = false,
  });

  final String eyebrow;
  final String value;
  final String detail;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 150),
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xE6151B20),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: alignEnd
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            eyebrow,
            style: const TextStyle(
              color: Color(0xFF94A39B),
              fontSize: 9,
              fontWeight: FontWeight.w900,
              letterSpacing: 1,
            ),
          ),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(
            detail,
            style: const TextStyle(
              color: Color(0xFF4DE1A8),
              fontSize: 9,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _DrivingMessage extends StatelessWidget {
  const _DrivingMessage({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: 18,
      right: 18,
      bottom: 16,
      child: IgnorePointer(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            color: const Color(0xE6151B20),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            message,
            maxLines: 2,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class _ControlDeck extends StatelessWidget {
  const _ControlDeck({
    required this.enabled,
    required this.wheelRotation,
    required this.throttlePressed,
    required this.brakePressed,
    required this.reversing,
    required this.onWheelChanged,
    required this.onThrottleChanged,
    required this.onBrakeChanged,
  });

  final bool enabled;
  final double wheelRotation;
  final bool throttlePressed;
  final bool brakePressed;
  final bool reversing;
  final ValueChanged<double> onWheelChanged;
  final ValueChanged<bool> onThrottleChanged;
  final ValueChanged<bool> onBrakeChanged;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 4, 12, 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            flex: 6,
            child: _SteeringWheel(
              enabled: enabled,
              rotation: wheelRotation,
              onChanged: onWheelChanged,
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            flex: 4,
            child: Column(
              children: <Widget>[
                Expanded(
                  child: _PedalButton(
                    key: const ValueKey<String>('parking-go'),
                    enabled: enabled,
                    pressed: throttlePressed,
                    label: 'GO',
                    detail: 'HOLD TO DRIVE',
                    color: const Color(0xFF25B779),
                    icon: Icons.arrow_upward_rounded,
                    onChanged: onThrottleChanged,
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: _PedalButton(
                    key: const ValueKey<String>('parking-brake'),
                    enabled: enabled,
                    pressed: brakePressed,
                    label: 'BRAKE',
                    detail: reversing ? 'REVERSING' : 'HOLD FOR REVERSE',
                    color: const Color(0xFFE25555),
                    icon: Icons.arrow_downward_rounded,
                    onChanged: onBrakeChanged,
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

class _SteeringWheel extends StatefulWidget {
  const _SteeringWheel({
    required this.enabled,
    required this.rotation,
    required this.onChanged,
  });

  final bool enabled;
  final double rotation;
  final ValueChanged<double> onChanged;

  @override
  State<_SteeringWheel> createState() => _SteeringWheelState();
}

class _SteeringWheelState extends State<_SteeringWheel> {
  double? _lastPointerAngle;

  double _pointerAngle(Offset localPosition, Size size) {
    final Offset center = Offset(size.width / 2, size.height / 2);
    final Offset delta = localPosition - center;
    return atan2(delta.dy, delta.dx);
  }

  double _wrappedDelta(double current, double previous) {
    double delta = current - previous;
    if (delta > pi) {
      delta -= pi * 2;
    } else if (delta < -pi) {
      delta += pi * 2;
    }
    return delta;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final Size size = Size(constraints.maxWidth, constraints.maxHeight);
        return Semantics(
          label: 'Steering wheel',
          value: widget.rotation.abs() < 0.08
              ? 'Centered'
              : widget.rotation < 0
              ? 'Left'
              : 'Right',
          child: GestureDetector(
            key: const ValueKey<String>('parking-steering-wheel'),
            behavior: HitTestBehavior.opaque,
            onDoubleTap: widget.enabled ? () => widget.onChanged(0) : null,
            onPanStart: widget.enabled
                ? (DragStartDetails details) {
                    _lastPointerAngle = _pointerAngle(
                      details.localPosition,
                      size,
                    );
                    HapticFeedback.selectionClick();
                  }
                : null,
            onPanUpdate: widget.enabled
                ? (DragUpdateDetails details) {
                    final double angle = _pointerAngle(
                      details.localPosition,
                      size,
                    );
                    final double? previous = _lastPointerAngle;
                    _lastPointerAngle = angle;
                    if (previous != null) {
                      widget.onChanged(
                        widget.rotation + _wrappedDelta(angle, previous),
                      );
                    }
                  }
                : null,
            onPanEnd: (_) => _lastPointerAngle = null,
            onPanCancel: () => _lastPointerAngle = null,
            child: CustomPaint(
              painter: _SteeringWheelPainter(
                rotation: widget.rotation,
                enabled: widget.enabled,
              ),
              child: const Center(
                child: Padding(
                  padding: EdgeInsets.only(top: 116),
                  child: Text(
                    'STEER · DOUBLE-TAP TO CENTER',
                    style: TextStyle(
                      color: Color(0xFF7C8982),
                      fontSize: 8,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.7,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _PedalButton extends StatelessWidget {
  const _PedalButton({
    super.key,
    required this.enabled,
    required this.pressed,
    required this.label,
    required this.detail,
    required this.color,
    required this.icon,
    required this.onChanged,
  });

  final bool enabled;
  final bool pressed;
  final String label;
  final String detail;
  final Color color;
  final IconData icon;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.opaque,
      onPointerDown: enabled
          ? (_) {
              onChanged(true);
              HapticFeedback.selectionClick();
            }
          : null,
      onPointerUp: enabled ? (_) => onChanged(false) : null,
      onPointerCancel: enabled ? (_) => onChanged(false) : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 90),
        transform: Matrix4.translationValues(0, pressed ? 2 : 0, 0),
        decoration: BoxDecoration(
          color: enabled
              ? color.withValues(alpha: pressed ? 1 : 0.86)
              : color.withValues(alpha: 0.25),
          borderRadius: BorderRadius.circular(17),
          boxShadow: pressed || !enabled
              ? null
              : <BoxShadow>[
                  BoxShadow(
                    color: color.withValues(alpha: 0.24),
                    blurRadius: 10,
                    offset: const Offset(0, 5),
                  ),
                ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Icon(icon, color: Colors.white, size: 21),
            const SizedBox(width: 7),
            Flexible(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Text(
                    detail,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.75),
                      fontSize: 7,
                      fontWeight: FontWeight.w800,
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

class _ReadyOverlay extends StatelessWidget {
  const _ReadyOverlay({
    required this.selectedDifficulty,
    required this.bestParks,
    required this.onDifficultyChanged,
    required this.onPlay,
  });

  final ParkingDifficulty selectedDifficulty;
  final int bestParks;
  final ValueChanged<ParkingDifficulty> onDifficultyChanged;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    return _OverlayScrim(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: const Color(0xFF4DE1A8),
              borderRadius: BorderRadius.circular(23),
              boxShadow: const <BoxShadow>[
                BoxShadow(color: Color(0x554DE1A8), blurRadius: 24),
              ],
            ),
            child: const Icon(
              Icons.local_parking_rounded,
              color: Color(0xFF10231D),
              size: 42,
            ),
          ),
          const SizedBox(height: 17),
          const Text(
            'PARKLINE',
            style: TextStyle(
              color: Colors.white,
              fontSize: 29,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Spin the wheel. Feather the pedals. Park every procedural space.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFFB8C5BE), height: 1.4),
          ),
          const SizedBox(height: 18),
          SegmentedButton<ParkingDifficulty>(
            segments: const <ButtonSegment<ParkingDifficulty>>[
              ButtonSegment<ParkingDifficulty>(
                value: ParkingDifficulty.easy,
                icon: Icon(Icons.directions_car_filled_rounded),
                label: Text('Easy lots'),
              ),
              ButtonSegment<ParkingDifficulty>(
                value: ParkingDifficulty.hard,
                icon: Icon(Icons.local_fire_department_rounded),
                label: Text('Hard lots'),
              ),
            ],
            selected: <ParkingDifficulty>{selectedDifficulty},
            onSelectionChanged: (Set<ParkingDifficulty> value) =>
                onDifficultyChanged(value.first),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            key: const ValueKey<String>('parking-play'),
            onPressed: onPlay,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF4DE1A8),
              foregroundColor: const Color(0xFF10231D),
              minimumSize: const Size(190, 50),
            ),
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Start parking'),
          ),
          const SizedBox(height: 11),
          Text(
            bestParks == 0
                ? 'Your first space awaits'
                : 'Best run  $bestParks spaces',
            style: const TextStyle(
              color: Color(0xFF84938B),
              fontSize: 11,
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
    required this.automatic,
    required this.onResume,
    required this.onRetry,
  });

  final bool automatic;
  final VoidCallback onResume;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return _OverlayScrim(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(
            Icons.pause_circle_filled_rounded,
            color: Color(0xFF4DE1A8),
            size: 62,
          ),
          const SizedBox(height: 12),
          const Text(
            'Parked for a moment',
            style: TextStyle(
              color: Colors.white,
              fontSize: 23,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            automatic
                ? 'The game paused while the app was in the background.'
                : 'Your position and steering are saved.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF9AA9A1)),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: onResume,
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Resume'),
          ),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.replay_rounded),
            label: const Text('Restart this space'),
          ),
        ],
      ),
    );
  }
}

class _ParkedOverlay extends StatelessWidget {
  const _ParkedOverlay({
    required this.completed,
    required this.bumps,
    required this.onNext,
  });

  final int completed;
  final int bumps;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return _OverlayScrim(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(
            Icons.check_circle_rounded,
            color: Color(0xFF4DE1A8),
            size: 68,
          ),
          const SizedBox(height: 10),
          const Text(
            'PERFECTLY PARKED',
            style: TextStyle(
              color: Colors.white,
              fontSize: 23,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '$completed spaces cleared  ·  $bumps bumps',
            style: const TextStyle(color: Color(0xFFB8C5BE)),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            key: const ValueKey<String>('parking-next-space'),
            onPressed: onNext,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF4DE1A8),
              foregroundColor: const Color(0xFF10231D),
            ),
            icon: const Icon(Icons.arrow_forward_rounded),
            label: const Text('Next space'),
          ),
        ],
      ),
    );
  }
}

class _OverlayScrim extends StatelessWidget {
  const _OverlayScrim({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xD20D1316),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(24),
      child: SingleChildScrollView(child: child),
    );
  }
}

class _SteeringWheelPainter extends CustomPainter {
  const _SteeringWheelPainter({required this.rotation, required this.enabled});

  final double rotation;
  final bool enabled;

  @override
  void paint(Canvas canvas, Size size) {
    final Offset center = Offset(size.width / 2, size.height / 2 - 8);
    final double radius = min(size.width, size.height - 22) * 0.42;
    final Color rim = enabled
        ? const Color(0xFF27322D)
        : const Color(0xFF66706B);
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = const Color(0xFFE8ECEA)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );
    canvas.drawCircle(
      center,
      radius - 5,
      Paint()
        ..color = rim
        ..style = PaintingStyle.stroke
        ..strokeWidth = 10
        ..strokeCap = StrokeCap.round,
    );
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(rotation);
    final Paint spoke = Paint()
      ..color = enabled ? const Color(0xFF303D37) : const Color(0xFF7B8580)
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;
    for (int index = 0; index < 3; index++) {
      final double angle = -pi / 2 + index * pi * 2 / 3;
      canvas.drawLine(
        Offset(cos(angle), sin(angle)) * 10,
        Offset(cos(angle), sin(angle)) * (radius - 9),
        spoke,
      );
    }
    canvas.drawCircle(
      Offset.zero,
      19,
      Paint()
        ..color = enabled ? const Color(0xFF4DE1A8) : const Color(0xFF96A19B),
    );
    canvas.drawCircle(Offset.zero, 7, Paint()..color = const Color(0xFF17201C));
    canvas.restore();
  }

  @override
  bool shouldRepaint(_SteeringWheelPainter oldDelegate) =>
      rotation != oldDelegate.rotation || enabled != oldDelegate.enabled;
}

class _ParkingPainter extends CustomPainter {
  const _ParkingPainter({required this.engine, required this.bumpFlash});

  final ParkingEngine engine;
  final double bumpFlash;

  @override
  void paint(Canvas canvas, Size size) {
    final double scale = min(
      size.width / ParkingEngine.worldWidth,
      size.height / ParkingEngine.worldHeight,
    );
    final Offset origin = Offset(
      (size.width - ParkingEngine.worldWidth * scale) / 2,
      (size.height - ParkingEngine.worldHeight * scale) / 2,
    );
    final Rect worldRect = Rect.fromLTWH(
      origin.dx,
      origin.dy,
      ParkingEngine.worldWidth * scale,
      ParkingEngine.worldHeight * scale,
    );
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = const Color(0xFF101619),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(worldRect, const Radius.circular(20)),
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[Color(0xFF283136), Color(0xFF1E272B)],
        ).createShader(worldRect),
    );
    canvas.save();
    canvas.clipRRect(
      RRect.fromRectAndRadius(worldRect, const Radius.circular(20)),
    );
    canvas.translate(origin.dx, origin.dy);
    canvas.scale(scale);
    _drawLot(canvas);
    _drawTarget(canvas);
    for (final ParkedCar parked in engine.scenario.parkedCars) {
      _drawCar(
        canvas,
        parked.center,
        parked.angle,
        parked.width,
        parked.length,
        _parkedCarColors[parked.colorIndex],
        false,
      );
    }
    _drawCar(
      canvas,
      engine.carPosition,
      engine.carAngle,
      ParkingEngine.carWidth,
      ParkingEngine.carLength,
      const Color(0xFF4DE1A8),
      true,
    );
    canvas.restore();

    if (bumpFlash > 0) {
      canvas.drawRect(
        Offset.zero & size,
        Paint()
          ..color = const Color(0xFFE25555).withValues(alpha: bumpFlash * 0.18),
      );
    }
  }

  void _drawLot(Canvas canvas) {
    final Paint curb = Paint()
      ..color = const Color(0xFF69736E)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.018;
    canvas.drawRect(
      const Rect.fromLTWH(
        0.028,
        0.028,
        ParkingEngine.worldWidth - 0.056,
        ParkingEngine.worldHeight - 0.056,
      ),
      curb,
    );
    final Paint dash = Paint()
      ..color = Colors.white.withValues(alpha: 0.12)
      ..strokeWidth = 0.009;
    for (double y = 0.34; y < ParkingEngine.worldHeight; y += 0.16) {
      canvas.drawLine(Offset(0.5, y), Offset(0.5, y + 0.075), dash);
    }
    final Random texture = Random(18);
    for (int index = 0; index < 90; index++) {
      canvas.drawCircle(
        Offset(
          texture.nextDouble() * ParkingEngine.worldWidth,
          texture.nextDouble() * ParkingEngine.worldHeight,
        ),
        0.002 + texture.nextDouble() * 0.002,
        Paint()..color = Colors.white.withValues(alpha: 0.035),
      );
    }
  }

  void _drawTarget(Canvas canvas) {
    final Rect target = engine.scenario.target;
    final double pulse =
        0.55 + sin(DateTime.now().millisecondsSinceEpoch / 280) * 0.12;
    canvas.drawRRect(
      RRect.fromRectAndRadius(target, const Radius.circular(0.015)),
      Paint()..color = const Color(0xFF4DE1A8).withValues(alpha: 0.10),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(target, const Radius.circular(0.015)),
      Paint()
        ..color = const Color(0xFF4DE1A8).withValues(alpha: pulse)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.011,
    );
    if (engine.parkedProgress > 0) {
      canvas.drawArc(
        Rect.fromCircle(center: target.center, radius: 0.055),
        -pi / 2,
        pi * 2 * (engine.parkedProgress / 0.72),
        false,
        Paint()
          ..color = const Color(0xFF4DE1A8)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 0.012
          ..strokeCap = StrokeCap.round,
      );
    }
    final TextPainter label = TextPainter(
      text: const TextSpan(
        text: 'P',
        style: TextStyle(
          color: Color(0xAA4DE1A8),
          fontSize: 0.07,
          fontWeight: FontWeight.w900,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    label.paint(
      canvas,
      target.center - Offset(label.width / 2, label.height / 2),
    );
  }

  void _drawCar(
    Canvas canvas,
    Offset center,
    double angle,
    double width,
    double length,
    Color color,
    bool player,
  ) {
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(angle);
    if (player) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: Offset.zero,
            width: width * 1.25,
            height: length * 1.2,
          ),
          const Radius.circular(0.026),
        ),
        Paint()
          ..color = color.withValues(alpha: 0.22)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 0.018),
      );
    }
    final Paint tire = Paint()..color = const Color(0xFF0C1012);
    for (final double x in <double>[-width * 0.55, width * 0.55]) {
      for (final double y in <double>[-length * 0.29, length * 0.29]) {
        canvas.save();
        canvas.translate(x, y);
        if (player && y < 0) {
          canvas.rotate(engine.steering * 0.42);
        }
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromCenter(
              center: Offset.zero,
              width: width * 0.16,
              height: length * 0.23,
            ),
            const Radius.circular(0.006),
          ),
          tire,
        );
        canvas.restore();
      }
    }
    final RRect body = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset.zero, width: width, height: length),
      Radius.circular(width * 0.25),
    );
    canvas.drawRRect(body, Paint()..color = color);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(0, -length * 0.08),
          width: width * 0.72,
          height: length * 0.43,
        ),
        Radius.circular(width * 0.15),
      ),
      Paint()..color = const Color(0xFF26333A).withValues(alpha: 0.88),
    );
    final Paint light = Paint()
      ..color = player ? const Color(0xFFFFF3B0) : const Color(0xFFC9D2D5);
    canvas.drawCircle(Offset(-width * 0.25, -length * 0.43), 0.008, light);
    canvas.drawCircle(Offset(width * 0.25, -length * 0.43), 0.008, light);
    final Paint tail = Paint()..color = const Color(0xFFFF5656);
    canvas.drawCircle(Offset(-width * 0.25, length * 0.43), 0.007, tail);
    canvas.drawCircle(Offset(width * 0.25, length * 0.43), 0.007, tail);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_ParkingPainter oldDelegate) => true;
}
