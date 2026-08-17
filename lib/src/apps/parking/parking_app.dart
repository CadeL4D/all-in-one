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
  ParkingVehicleType _selectedVehicle = ParkingVehicleType.compact;
  Duration? _lastElapsed;
  bool _playing = false;
  bool _paused = false;
  bool _pausedAutomatically = false;
  int _bestParks = 0;
  double _wheelRotation = 0;
  double _bumpFlash = 0;
  double _precisionFlash = 0;
  double _nextSpaceDelay = 0;
  double _sonarPulse = 0;
  ParkingSonarLevel _lastSonarLevel = ParkingSonarLevel.clear;
  Offset _cameraCenter = const Offset(0.5, 0.74);
  double _cameraZoom = 1;

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
      _engine = ParkingEngine(
        difficulty: _selectedDifficulty,
        vehicleType: _selectedVehicle,
      );
      _playing = true;
      _paused = false;
      _pausedAutomatically = false;
      _wheelRotation = 0;
      _bumpFlash = 0;
      _precisionFlash = 0;
      _nextSpaceDelay = 0;
      _sonarPulse = 0;
      _lastSonarLevel = ParkingSonarLevel.clear;
      _lastElapsed = null;
      _snapCamera();
    });
    _ticker.start();
  }

  void _advanceToNextSpace() {
    _engine.nextScenario();
    _wheelRotation = 0;
    _nextSpaceDelay = 0;
  }

  void _retrySpace() {
    _engine.retryScenario();
    setState(() {
      _wheelRotation = 0;
      _lastElapsed = null;
      _snapCamera();
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
    if (_engine.isParked) {
      _nextSpaceDelay = max(0, _nextSpaceDelay - dt);
      _precisionFlash = max(0, _precisionFlash - dt * 1.9);
      if (_nextSpaceDelay <= 0) {
        _advanceToNextSpace();
      }
      _updateCamera(dt);
      if (mounted) {
        setState(() {});
      }
      return;
    }
    _engine.tick(dt);
    _updateCamera(dt);
    _bumpFlash = max(0, _bumpFlash - dt * 3.4);
    _precisionFlash = max(0, _precisionFlash - dt * 1.9);
    _updateSonarFeedback(dt);
    for (final ParkingEvent event in _engine.drainEvents()) {
      switch (event.kind) {
        case ParkingEventKind.bump:
          _bumpFlash = 0.72;
          HapticFeedback.heavyImpact();
        case ParkingEventKind.pickup:
          HapticFeedback.selectionClick();
        case ParkingEventKind.parked:
          _nextSpaceDelay = 1.35;
          _precisionFlash = 1;
          final int completed = _engine.parks;
          if (completed > _bestParks) {
            _bestParks = completed;
            LocalStore.writeString(LocalStore.parkingBestKey, '$_bestParks');
          }
          HapticFeedback.mediumImpact();
        case ParkingEventKind.timeExpired:
          _ticker.stop();
          HapticFeedback.heavyImpact();
      }
    }
    if (mounted) {
      setState(() {});
    }
  }

  void _updateSonarFeedback(double dt) {
    _sonarPulse = max(0, _sonarPulse - dt);
    final ParkingSonarLevel level = _engine.sonarLevel;
    if (level == ParkingSonarLevel.clear || _engine.speed.abs() < 0.002) {
      _lastSonarLevel = level;
      return;
    }
    if (level != _lastSonarLevel) {
      _sonarPulse = 0;
      _lastSonarLevel = level;
    }
    if (_sonarPulse > 0) {
      return;
    }
    SystemSound.play(SystemSoundType.click);
    if (level == ParkingSonarLevel.red) {
      HapticFeedback.mediumImpact();
      _sonarPulse = 0.24;
    } else {
      HapticFeedback.selectionClick();
      _sonarPulse = level == ParkingSonarLevel.yellow ? 0.48 : 0.82;
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

  _CameraPose get _desiredCameraPose {
    final Offset target = _engine.scenario.target.center;
    final double distance = (_engine.carPosition - target).distance;
    final double proximity = (1 - distance / 0.72).clamp(0.0, 1.0);
    final double finalAlignmentBoost = _engine.carInsideTarget ? 0.12 : 0;
    return _CameraPose(
      center: Offset.lerp(_engine.carPosition, target, 0.5)!,
      zoom: 1.02 + proximity * 0.32 + finalAlignmentBoost,
    );
  }

  void _snapCamera() {
    final _CameraPose pose = _desiredCameraPose;
    _cameraCenter = pose.center;
    _cameraZoom = pose.zoom;
  }

  void _updateCamera(double dt) {
    final _CameraPose pose = _desiredCameraPose;
    final double easing = 1 - exp(-dt * 4.2);
    _cameraCenter = Offset.lerp(_cameraCenter, pose.center, easing)!;
    _cameraZoom += (pose.zoom - _cameraZoom) * easing;
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Parkline',
      icon: Icons.local_parking_rounded,
      actions: <Widget>[
        if (_playing && !_engine.isParked && !_engine.isGameOver)
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
                    Positioned.fill(
                      top: _playing ? _ParkingHud.height : 0,
                      child: Stack(
                        fit: StackFit.expand,
                        children: <Widget>[
                          RepaintBoundary(
                            key: const ValueKey<String>('parking-camera-scene'),
                            child: CustomPaint(
                              painter: _ParkingPainter(
                                engine: _engine,
                                bumpFlash: _bumpFlash,
                                precisionFlash: _precisionFlash,
                                cameraCenter: _cameraCenter,
                                cameraZoom: _cameraZoom,
                              ),
                            ),
                          ),
                          if (_playing && !_paused && !_engine.isParked)
                            _ParkingCoach(
                              message: _engine.parkingGuidance,
                              carPosition: _engine.carPosition,
                              carLength: _engine.activeCarLength,
                              cameraCenter: _cameraCenter,
                              cameraZoom: _cameraZoom,
                            ),
                        ],
                      ),
                    ),
                    if (_playing)
                      Align(
                        alignment: Alignment.topCenter,
                        child: _ParkingHud(
                          engine: _engine,
                          bestParks: _bestParks,
                        ),
                      ),
                    if (!_playing)
                      _ReadyOverlay(
                        selectedDifficulty: _selectedDifficulty,
                        bestParks: _bestParks,
                        onDifficultyChanged: (ParkingDifficulty value) =>
                            setState(() => _selectedDifficulty = value),
                        selectedVehicle: _selectedVehicle,
                        onVehicleChanged: (ParkingVehicleType value) =>
                            setState(() => _selectedVehicle = value),
                        onPlay: _startGame,
                      )
                    else if (_paused)
                      _PauseOverlay(
                        automatic: _pausedAutomatically,
                        onResume: _togglePause,
                        onRetry: _retrySpace,
                      )
                    else if (_engine.isGameOver)
                      _GameOverOverlay(
                        completed: _engine.parks,
                        score: _engine.score,
                        bestParks: _bestParks,
                        onRestart: _startGame,
                      )
                    else if (_engine.isParked)
                      _ParkedOverlay(
                        award: _engine.lastAward,
                        precision: _engine.lastPrecision,
                        timeChange: _engine.lastTimeChange,
                        smooth: _engine.lastSmoothPark,
                        streak: _engine.streak,
                      ),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(
            height: 188,
            child: _ControlDeck(
              enabled:
                  _playing &&
                  !_paused &&
                  !_engine.isParked &&
                  !_engine.isGameOver,
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

  static const double height = 44;

  final ParkingEngine engine;
  final int bestParks;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const ValueKey<String>('parking-hud-bar'),
      height: height,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: const Color(0xD9151B20),
        border: Border(
          bottom: BorderSide(color: Colors.white.withValues(alpha: 0.10)),
        ),
      ),
      child: Row(
        children: <Widget>[
          const Icon(
            Icons.local_parking_rounded,
            size: 17,
            color: Color(0xFF4DE1A8),
          ),
          const SizedBox(width: 7),
          Expanded(
            child: _HudBarStat(
              value: engine.scenario.label,
              detail: engine.scenario.modifierLabel == null
                  ? 'SPACE ${engine.level} · ${engine.vehicleProfile.shortLabel.toUpperCase()} · BEST $bestParks'
                  : '${engine.vehicleProfile.shortLabel.toUpperCase()} · ${engine.scenario.modifierLabel!.toUpperCase()}',
            ),
          ),
          _HudBarStat(
            value: '${engine.timeRemaining.ceil()}s',
            detail: 'VALET TIMER',
            centered: true,
            accent: engine.timeRemaining <= 8
                ? const Color(0xFFFF6B6B)
                : const Color(0xFFFFD166),
          ),
          const SizedBox(width: 14),
          _HudBarStat(
            value: '${engine.speedKph.round()} km/h',
            detail:
                '${engine.isReversing ? 'R' : 'D'} · ${engine.score} PTS · ${engine.streak}×',
            alignEnd: true,
          ),
        ],
      ),
    );
  }
}

class _HudBarStat extends StatelessWidget {
  const _HudBarStat({
    required this.value,
    required this.detail,
    this.centered = false,
    this.alignEnd = false,
    this.accent,
  });

  final String value;
  final String detail;
  final bool centered;
  final bool alignEnd;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final CrossAxisAlignment alignment = alignEnd
        ? CrossAxisAlignment.end
        : centered
        ? CrossAxisAlignment.center
        : CrossAxisAlignment.start;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: alignment,
      children: <Widget>[
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
          ).copyWith(color: accent ?? Colors.white),
        ),
        Text(
          detail,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: Color(0xFF8FA49A),
            fontSize: 7.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.3,
          ),
        ),
      ],
    );
  }
}

class _ParkingCoach extends StatelessWidget {
  const _ParkingCoach({
    required this.message,
    required this.carPosition,
    required this.carLength,
    required this.cameraCenter,
    required this.cameraZoom,
  });

  final String message;
  final Offset carPosition;
  final double carLength;
  final Offset cameraCenter;
  final double cameraZoom;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final Size size = constraints.biggest;
        final _ParkingCameraView camera = _ParkingCameraView.resolve(
          size: size,
          requestedCenter: cameraCenter,
          zoom: cameraZoom,
        );
        final Offset carOnScreen = camera.worldToScreen(carPosition);
        const double bubbleWidth = 116;
        const double bubbleHeight = 28;
        final double left = (carOnScreen.dx - bubbleWidth / 2).clamp(
          6.0,
          max(6.0, size.width - bubbleWidth - 6),
        );
        final double top =
            (carOnScreen.dy - carLength * camera.scale / 2 - bubbleHeight - 7)
                .clamp(6.0, max(6.0, size.height - bubbleHeight - 6));

        return Stack(
          children: <Widget>[
            Positioned(
              left: left,
              top: top,
              width: bubbleWidth,
              height: bubbleHeight,
              child: IgnorePointer(
                child: AnimatedSwitcher(
                  key: const ValueKey<String>('parking-coach-pop'),
                  duration: const Duration(milliseconds: 180),
                  child: Container(
                    key: ValueKey<String>('parking-coach-pop-$message'),
                    padding: const EdgeInsets.symmetric(horizontal: 9),
                    decoration: BoxDecoration(
                      color: const Color(0xD9151B20),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: const Color(0xFF4DE1A8).withValues(alpha: 0.38),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        Icon(
                          _coachIcon(message),
                          size: 12,
                          color: const Color(0xFF4DE1A8),
                        ),
                        const SizedBox(width: 5),
                        Flexible(
                          child: Text(
                            message,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  IconData _coachIcon(String message) {
    if (message == 'Slow down') {
      return Icons.speed_rounded;
    }
    if (message == 'Brake here' || message == 'Hold steady') {
      return Icons.stop_circle_outlined;
    }
    if (message == 'Good angle') {
      return Icons.check_rounded;
    }
    if (message == 'Straighten') {
      return Icons.align_vertical_center_rounded;
    }
    return Icons.assistant_navigation;
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
    required this.selectedVehicle,
    required this.onVehicleChanged,
    required this.onPlay,
  });

  final ParkingDifficulty selectedDifficulty;
  final int bestParks;
  final ValueChanged<ParkingDifficulty> onDifficultyChanged;
  final ParkingVehicleType selectedVehicle;
  final ValueChanged<ParkingVehicleType> onVehicleChanged;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    return _OverlayScrim(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 62,
            height: 62,
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
              size: 36,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'PARKLINE',
            style: TextStyle(
              color: Colors.white,
              fontSize: 27,
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
          const SizedBox(height: 13),
          SegmentedButton<ParkingDifficulty>(
            segments: const <ButtonSegment<ParkingDifficulty>>[
              ButtonSegment<ParkingDifficulty>(
                value: ParkingDifficulty.easy,
                icon: Icon(Icons.directions_car_filled_rounded),
                label: Text('Easy'),
              ),
              ButtonSegment<ParkingDifficulty>(
                value: ParkingDifficulty.hard,
                icon: Icon(Icons.local_fire_department_rounded),
                label: Text('Hard'),
              ),
            ],
            selected: <ParkingDifficulty>{selectedDifficulty},
            onSelectionChanged: (Set<ParkingDifficulty> value) =>
                onDifficultyChanged(value.first),
          ),
          const SizedBox(height: 12),
          const Text(
            'CHOOSE YOUR VEHICLE',
            style: TextStyle(
              color: Color(0xFF8FA49A),
              fontSize: 9,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 7),
          Row(
            children: <Widget>[
              for (final ParkingVehicleType type in ParkingVehicleType.values)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: ChoiceChip(
                      label: SizedBox(
                        width: double.infinity,
                        child: Text(
                          _vehicleLabel(type),
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 10),
                        ),
                      ),
                      selected: selectedVehicle == type,
                      showCheckmark: false,
                      onSelected: (_) => onVehicleChanged(type),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            _vehicleDescription(selectedVehicle),
            textAlign: TextAlign.center,
            maxLines: 2,
            style: const TextStyle(color: Color(0xFF9AA9A1), fontSize: 10),
          ),
          const SizedBox(height: 12),
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

  String _vehicleLabel(ParkingVehicleType type) => switch (type) {
    ParkingVehicleType.compact => 'Compact',
    ParkingVehicleType.sedan => 'Sedan',
    ParkingVehicleType.deliveryVan => 'Van',
  };

  String _vehicleDescription(ParkingVehicleType type) => switch (type) {
    ParkingVehicleType.compact =>
      'Quick steering, short wheelbase, and a forgiving turn radius.',
    ParkingVehicleType.sedan =>
      'A long wheelbase and rear overhang demand earlier setup.',
    ParkingVehicleType.deliveryVan =>
      'Heavy braking and limited rear visibility—trust the sonar.',
  };
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
    required this.award,
    required this.precision,
    required this.timeChange,
    required this.smooth,
    required this.streak,
  });

  final int award;
  final ParkingPrecision precision;
  final int timeChange;
  final bool smooth;
  final int streak;

  @override
  Widget build(BuildContext context) {
    final Color ratingColor = switch (precision) {
      ParkingPrecision.perfect => const Color(0xFFFFD166),
      ParkingPrecision.acceptable => const Color(0xFFD5DFE4),
      ParkingPrecision.crooked => const Color(0xFFFF8A7A),
    };
    final String rating = switch (precision) {
      ParkingPrecision.perfect => 'PERFECT ALIGNMENT',
      ParkingPrecision.acceptable => 'CLEAN ALIGNMENT',
      ParkingPrecision.crooked => 'CROOKED PARK',
    };
    return Positioned(
      left: 26,
      right: 26,
      top: _ParkingHud.height + 16,
      child: IgnorePointer(
        child: Container(
          key: const ValueKey<String>('parking-result-pop'),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            color: const Color(0xF0151B20),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: ratingColor.withValues(alpha: 0.68)),
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: ratingColor.withValues(alpha: 0.22),
                blurRadius: 22,
              ),
            ],
          ),
          child: Row(
            children: <Widget>[
              Icon(Icons.auto_awesome_rounded, color: ratingColor, size: 28),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      rating,
                      style: TextStyle(
                        color: ratingColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '+$award pts · ${timeChange >= 0 ? '+' : ''}${timeChange}s'
                      '${smooth ? ' · SMOOTH PARK 1.5×' : ''}'
                      '${streak > 1 ? ' · $streak× STREAK' : ''}',
                      maxLines: 2,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.arrow_forward_rounded,
                color: Color(0xFF8FA49A),
                size: 18,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GameOverOverlay extends StatelessWidget {
  const _GameOverOverlay({
    required this.completed,
    required this.score,
    required this.bestParks,
    required this.onRestart,
  });

  final int completed;
  final int score;
  final int bestParks;
  final VoidCallback onRestart;

  @override
  Widget build(BuildContext context) {
    return _OverlayScrim(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(
            Icons.timer_off_rounded,
            color: Color(0xFFFFD166),
            size: 58,
          ),
          const SizedBox(height: 10),
          const Text(
            'VALET RUN COMPLETE',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            '$completed spaces · $score points · best $bestParks',
            style: const TextStyle(color: Color(0xFFB8C5BE)),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            key: const ValueKey<String>('parking-restart-run'),
            onPressed: onRestart,
            icon: const Icon(Icons.replay_rounded),
            label: const Text('Run it again'),
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

class _CameraPose {
  const _CameraPose({required this.center, required this.zoom});

  final Offset center;
  final double zoom;
}

class _ParkingCameraView {
  const _ParkingCameraView({
    required this.size,
    required this.center,
    required this.scale,
  });

  factory _ParkingCameraView.resolve({
    required Size size,
    required Offset requestedCenter,
    required double zoom,
  }) {
    final double baseScale = min(
      size.width / ParkingEngine.worldWidth,
      size.height / ParkingEngine.worldHeight,
    );
    final double scale = baseScale * zoom;
    final double halfWidth = size.width / scale / 2;
    final double halfHeight = size.height / scale / 2;
    final double centerX = halfWidth >= ParkingEngine.worldWidth / 2
        ? ParkingEngine.worldWidth / 2
        : requestedCenter.dx.clamp(
            halfWidth,
            ParkingEngine.worldWidth - halfWidth,
          );
    final double centerY = halfHeight >= ParkingEngine.worldHeight / 2
        ? ParkingEngine.worldHeight / 2
        : requestedCenter.dy.clamp(
            halfHeight,
            ParkingEngine.worldHeight - halfHeight,
          );
    return _ParkingCameraView(
      size: size,
      center: Offset(centerX, centerY),
      scale: scale,
    );
  }

  final Size size;
  final Offset center;
  final double scale;

  Offset worldToScreen(Offset point) {
    return Offset(
      size.width / 2 + (point.dx - center.dx) * scale,
      size.height / 2 + (point.dy - center.dy) * scale,
    );
  }

  Rect get worldRect {
    final Offset topLeft = worldToScreen(Offset.zero);
    return Rect.fromLTWH(
      topLeft.dx,
      topLeft.dy,
      ParkingEngine.worldWidth * scale,
      ParkingEngine.worldHeight * scale,
    );
  }
}

class _ParkingPainter extends CustomPainter {
  const _ParkingPainter({
    required this.engine,
    required this.bumpFlash,
    required this.precisionFlash,
    required this.cameraCenter,
    required this.cameraZoom,
  });

  final ParkingEngine engine;
  final double bumpFlash;
  final double precisionFlash;
  final Offset cameraCenter;
  final double cameraZoom;

  @override
  void paint(Canvas canvas, Size size) {
    final _ParkingCameraView camera = _ParkingCameraView.resolve(
      size: size,
      requestedCenter: cameraCenter,
      zoom: cameraZoom,
    );
    final Rect worldRect = camera.worldRect;
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
    canvas.clipRect(Offset.zero & size);
    canvas.translate(size.width / 2, size.height / 2);
    canvas.scale(camera.scale);
    canvas.translate(-camera.center.dx, -camera.center.dy);
    _drawLot(canvas);
    _drawTarget(canvas);
    for (final ParkingObstacle obstacle in engine.scenario.obstacles) {
      _drawObstacle(canvas, obstacle);
    }
    for (final ParkingPickup pickup in engine.scenario.pickups) {
      if (!pickup.collected) {
        _drawPickup(canvas, pickup);
      }
    }
    for (final TrafficCar traffic in engine.scenario.traffic) {
      _drawTrafficCar(canvas, traffic);
    }
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
    _drawSonar(canvas);
    final Color playerColor = switch (engine.vehicleType) {
      ParkingVehicleType.compact => const Color(0xFF4DE1A8),
      ParkingVehicleType.sedan => const Color(0xFF66B8FF),
      ParkingVehicleType.deliveryVan => const Color(0xFFFFB45E),
    };
    _drawCar(
      canvas,
      engine.carPosition,
      engine.carAngle,
      engine.activeCarWidth,
      engine.activeCarLength,
      playerColor,
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
    if (precisionFlash > 0) {
      final Color color = switch (engine.lastPrecision) {
        ParkingPrecision.perfect => const Color(0xFFFFD166),
        ParkingPrecision.acceptable => const Color(0xFFD5DFE4),
        ParkingPrecision.crooked => const Color(0xFFFF6B6B),
      };
      canvas.drawRect(
        Offset.zero & size,
        Paint()..color = color.withValues(alpha: precisionFlash * 0.14),
      );
    }
  }

  void _drawLot(Canvas canvas) {
    final Rect bounds = ParkingEngine.playableBounds;
    canvas.drawRect(
      Offset.zero &
          const Size(ParkingEngine.worldWidth, ParkingEngine.worldHeight),
      Paint()..color = const Color(0xFF404A46),
    );
    canvas.drawRect(
      bounds,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[Color(0xFF293338), Color(0xFF20292D)],
        ).createShader(bounds),
    );
    final Paint curb = Paint()
      ..color = const Color(0xFFD8E0DC)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.012;
    canvas.drawRect(bounds, curb);
    final Paint curbAccent = Paint()
      ..color = const Color(0xFF4DE1A8).withValues(alpha: 0.24)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.003;
    canvas.drawRect(bounds.deflate(0.009), curbAccent);

    for (double x = bounds.left + 0.02; x < bounds.right; x += 0.075) {
      canvas.drawLine(
        Offset(x, bounds.top - 0.025),
        Offset(min(x + 0.035, bounds.right), bounds.top),
        Paint()
          ..color = Colors.white.withValues(alpha: 0.10)
          ..strokeWidth = 0.008,
      );
      canvas.drawLine(
        Offset(x, bounds.bottom),
        Offset(min(x + 0.035, bounds.right), bounds.bottom + 0.025),
        Paint()
          ..color = Colors.white.withValues(alpha: 0.10)
          ..strokeWidth = 0.008,
      );
    }
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
          bounds.left + texture.nextDouble() * bounds.width,
          bounds.top + texture.nextDouble() * bounds.height,
        ),
        0.002 + texture.nextDouble() * 0.002,
        Paint()..color = Colors.white.withValues(alpha: 0.035),
      );
    }
  }

  void _drawTarget(Canvas canvas) {
    final Rect target = engine.scenario.target;
    final bool angled = engine.scenario.kind == ParkingScenarioKind.angled;
    final Rect paintedTarget = Rect.fromCenter(
      center: Offset.zero,
      width: angled ? engine.activeCarWidth + 0.04 : target.width,
      height: angled ? engine.activeCarLength + 0.05 : target.height,
    );
    canvas.save();
    canvas.translate(target.center.dx, target.center.dy);
    canvas.rotate(engine.scenario.targetAngle);
    canvas.drawRRect(
      RRect.fromRectAndRadius(paintedTarget, const Radius.circular(0.015)),
      Paint()..color = const Color(0xFF4DE1A8).withValues(alpha: 0.10),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(paintedTarget, const Radius.circular(0.015)),
      Paint()
        ..color = const Color(0xFF4DE1A8).withValues(alpha: 0.72)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.011,
    );
    if (engine.parkedProgress > 0) {
      canvas.drawArc(
        Rect.fromCircle(center: Offset.zero, radius: 0.055),
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
    label.paint(canvas, Offset(-label.width / 2, -label.height / 2));
    canvas.restore();
  }

  void _drawPickup(Canvas canvas, ParkingPickup pickup) {
    canvas.save();
    canvas.translate(pickup.center.dx, pickup.center.dy);
    canvas.rotate(engine.elapsedTime * 1.8);
    canvas.drawCircle(
      Offset.zero,
      0.036,
      Paint()
        ..color = const Color(0x33FFD166)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 0.012),
    );
    canvas.drawCircle(
      Offset.zero,
      0.025,
      Paint()..color = const Color(0xFFFFD166),
    );
    final Path sparkle = Path();
    for (int index = 0; index < 8; index++) {
      final double radius = index.isEven ? 0.017 : 0.007;
      final double angle = -pi / 2 + index * pi / 4;
      final Offset point = Offset(cos(angle), sin(angle)) * radius;
      if (index == 0) {
        sparkle.moveTo(point.dx, point.dy);
      } else {
        sparkle.lineTo(point.dx, point.dy);
      }
    }
    sparkle.close();
    canvas.drawPath(sparkle, Paint()..color = const Color(0xFF5A4311));
    canvas.restore();
  }

  void _drawObstacle(Canvas canvas, ParkingObstacle obstacle) {
    canvas.save();
    canvas.translate(obstacle.center.dx, obstacle.center.dy);
    canvas.rotate(obstacle.angle);
    final Rect bounds = Rect.fromCenter(
      center: Offset.zero,
      width: obstacle.width,
      height: obstacle.length,
    );
    switch (obstacle.kind) {
      case ParkingObstacleKind.pillar:
        canvas.drawRRect(
          RRect.fromRectAndRadius(bounds, const Radius.circular(0.006)),
          Paint()..color = const Color(0xFF8A9290),
        );
        canvas.drawLine(
          bounds.topLeft,
          bounds.bottomRight,
          Paint()
            ..color = const Color(0xFF5E6664)
            ..strokeWidth = 0.006,
        );
      case ParkingObstacleKind.shoppingCart:
        canvas.drawRRect(
          RRect.fromRectAndRadius(bounds, const Radius.circular(0.006)),
          Paint()
            ..color = const Color(0xFFD7E0DD)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 0.006,
        );
        canvas.drawCircle(
          Offset(-obstacle.width * 0.28, obstacle.length * 0.48),
          0.007,
          Paint()..color = const Color(0xFF121719),
        );
        canvas.drawCircle(
          Offset(obstacle.width * 0.28, obstacle.length * 0.48),
          0.007,
          Paint()..color = const Color(0xFF121719),
        );
      case ParkingObstacleKind.pedestrian:
        canvas.drawCircle(
          Offset(0, -obstacle.length * 0.28),
          obstacle.width * 0.28,
          Paint()..color = const Color(0xFFFFD2AC),
        );
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromCenter(
              center: Offset(0, obstacle.length * 0.14),
              width: obstacle.width * 0.72,
              height: obstacle.length * 0.55,
            ),
            const Radius.circular(0.006),
          ),
          Paint()..color = const Color(0xFFE85D75),
        );
      case ParkingObstacleKind.curb:
        canvas.drawRRect(
          RRect.fromRectAndRadius(bounds, const Radius.circular(0.008)),
          Paint()..color = const Color(0xFFCED5D2),
        );
      case ParkingObstacleKind.wheelStop:
        canvas.drawRRect(
          RRect.fromRectAndRadius(bounds, const Radius.circular(0.005)),
          Paint()..color = const Color(0xFFE0B64F),
        );
      case ParkingObstacleKind.wall:
        canvas.drawRect(bounds, Paint()..color = const Color(0xFF747D7A));
        for (double x = bounds.left + 0.025; x < bounds.right; x += 0.05) {
          canvas.drawLine(
            Offset(x, bounds.top),
            Offset(x, bounds.bottom),
            Paint()
              ..color = const Color(0xFF565E5C)
              ..strokeWidth = 0.004,
          );
        }
      case ParkingObstacleKind.mirror:
        canvas.drawCircle(
          Offset.zero,
          obstacle.width / 2,
          Paint()..color = const Color(0xFFBDEBFA),
        );
        canvas.drawCircle(
          Offset.zero,
          obstacle.width / 2,
          Paint()
            ..color = const Color(0xFF5B6867)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 0.006,
        );
    }
    canvas.restore();
  }

  void _drawSonar(Canvas canvas) {
    final ParkingSonarLevel level = engine.sonarLevel;
    if (level == ParkingSonarLevel.clear) {
      return;
    }
    final Color color = switch (level) {
      ParkingSonarLevel.clear => Colors.transparent,
      ParkingSonarLevel.green => const Color(0xFF4DE1A8),
      ParkingSonarLevel.yellow => const Color(0xFFFFD166),
      ParkingSonarLevel.red => const Color(0xFFFF6565),
    };
    canvas.save();
    canvas.translate(engine.carPosition.dx, engine.carPosition.dy);
    canvas.rotate(engine.carAngle);
    final double length = engine.activeCarLength;
    final int arcCount = level == ParkingSonarLevel.red
        ? 3
        : level == ParkingSonarLevel.yellow
        ? 2
        : 1;
    for (int index = 0; index < arcCount; index++) {
      final double radius = 0.055 + index * 0.026;
      final Paint paint = Paint()
        ..color = color.withValues(alpha: 0.78 - index * 0.16)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.006
        ..strokeCap = StrokeCap.round;
      canvas.drawArc(
        Rect.fromCircle(center: Offset(0, -length / 2), radius: radius),
        -pi * 0.82,
        pi * 0.64,
        false,
        paint,
      );
      canvas.drawArc(
        Rect.fromCircle(center: Offset(0, length / 2), radius: radius),
        pi * 0.18,
        pi * 0.64,
        false,
        paint,
      );
    }
    canvas.restore();
  }

  void _drawTrafficCar(Canvas canvas, TrafficCar traffic) {
    canvas.save();
    canvas.translate(traffic.center.dx, traffic.center.dy);
    canvas.rotate(traffic.angle);
    canvas.drawOval(
      Rect.fromCenter(
        center: const Offset(0, 0.012),
        width: ParkingEngine.carWidth * 1.25,
        height: ParkingEngine.carLength * 1.12,
      ),
      Paint()
        ..color = Colors.black.withValues(alpha: 0.30)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 0.010),
    );
    canvas.restore();
    _drawCar(
      canvas,
      traffic.center,
      traffic.angle,
      ParkingEngine.carWidth + 0.006,
      ParkingEngine.carLength + 0.004,
      _parkedCarColors[traffic.colorIndex],
      false,
    );
    canvas.drawCircle(
      traffic.center,
      0.052,
      Paint()
        ..color = const Color(0xFFFFD166).withValues(alpha: 0.22)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.004,
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
    if (player && engine.steering.abs() > 0.06) {
      final double wheelAngle = engine.steering * 0.55;
      final Offset start = Offset(0, -length * 0.48);
      final Offset direction = Offset(sin(wheelAngle), -cos(wheelAngle));
      final Offset end = start + direction * (length * 0.34);
      final Paint indicator = Paint()
        ..color = const Color(0xFFFFD166)
        ..strokeWidth = 0.008
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(start, end, indicator);
      final Offset right = Offset(direction.dy, -direction.dx);
      canvas.drawLine(end, end - direction * 0.022 + right * 0.013, indicator);
      canvas.drawLine(end, end - direction * 0.022 - right * 0.013, indicator);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_ParkingPainter oldDelegate) => true;
}
