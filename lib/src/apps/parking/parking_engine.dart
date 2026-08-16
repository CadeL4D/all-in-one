import 'dart:math';
import 'dart:ui';

enum ParkingDifficulty { easy, hard }

enum ParkingEventKind { bump, parked }

class ParkingEvent {
  const ParkingEvent(this.kind);

  final ParkingEventKind kind;
}

class ParkedCar {
  const ParkedCar({
    required this.center,
    required this.angle,
    required this.width,
    required this.length,
    required this.colorIndex,
  });

  final Offset center;
  final double angle;
  final double width;
  final double length;
  final int colorIndex;
}

class ParkingScenario {
  const ParkingScenario({
    required this.label,
    required this.hint,
    required this.target,
    required this.targetAngle,
    required this.start,
    required this.startAngle,
    required this.parkedCars,
  });

  final String label;
  final String hint;
  final Rect target;
  final double targetAngle;
  final Offset start;
  final double startAngle;
  final List<ParkedCar> parkedCars;
}

class ParkingEngine {
  ParkingEngine({int? seed, this.difficulty = ParkingDifficulty.easy})
    : _seed = seed ?? DateTime.now().microsecondsSinceEpoch {
    restart(difficulty);
  }

  static const double worldWidth = 1;
  static const double worldHeight = 1.48;
  static const double carWidth = 0.078;
  static const double carLength = 0.152;

  final int _seed;
  ParkingDifficulty difficulty;
  late Random _random;
  late ParkingScenario scenario;

  Offset carPosition = const Offset(0.5, 1.2);
  double carAngle = 0;
  double speed = 0;
  double steering = 0;
  bool throttlePressed = false;
  bool brakePressed = false;
  int level = 1;
  int parks = 0;
  int bumps = 0;
  double parkedProgress = 0;
  bool isParked = false;
  final List<ParkingEvent> _events = <ParkingEvent>[];

  double get speedKph => speed.abs() * 145;

  bool get isReversing => speed < -0.006;

  void restart(ParkingDifficulty selectedDifficulty) {
    difficulty = selectedDifficulty;
    _random = Random(_seed + selectedDifficulty.index * 100003);
    level = 1;
    parks = 0;
    bumps = 0;
    steering = 0;
    _loadScenario();
  }

  void nextScenario() {
    if (isParked) {
      parks++;
      level++;
    }
    _loadScenario();
  }

  void retryScenario() {
    carPosition = scenario.start;
    carAngle = scenario.startAngle;
    speed = 0;
    steering = 0;
    throttlePressed = false;
    brakePressed = false;
    parkedProgress = 0;
    isParked = false;
    _events.clear();
  }

  void setSteering(double value) {
    steering = value.clamp(-1, 1);
  }

  void setThrottle(bool pressed) => throttlePressed = pressed;

  void setBrake(bool pressed) => brakePressed = pressed;

  List<ParkingEvent> drainEvents() {
    final List<ParkingEvent> result = List<ParkingEvent>.of(_events);
    _events.clear();
    return result;
  }

  void tick(double deltaSeconds) {
    if (isParked || deltaSeconds <= 0) {
      return;
    }
    final double dt = deltaSeconds.clamp(0, 0.04);

    double acceleration = 0;
    if (throttlePressed && !brakePressed) {
      acceleration = 0.19;
    } else if (brakePressed && !throttlePressed) {
      acceleration = speed > 0.012 ? -0.42 : -0.105;
    } else {
      final double drag = 0.095 * dt;
      if (speed.abs() <= drag) {
        speed = 0;
      } else {
        speed -= speed.sign * drag;
      }
    }
    speed = (speed + acceleration * dt).clamp(-0.105, 0.235);

    final Offset previousPosition = carPosition;
    final double previousAngle = carAngle;
    if (speed.abs() > 0.002) {
      final double steeringResponse = difficulty == ParkingDifficulty.hard
          ? 2.75
          : 2.55;
      carAngle = _normalizeAngle(
        carAngle + steering * speed * steeringResponse * dt,
      );
      final Offset forward = Offset(sin(carAngle), -cos(carAngle));
      carPosition += forward * speed * dt;
    }

    if (_carCollides()) {
      carPosition = previousPosition;
      carAngle = previousAngle;
      speed = -speed * 0.16;
      bumps++;
      parkedProgress = 0;
      _events.add(const ParkingEvent(ParkingEventKind.bump));
      return;
    }

    final bool inSpace = _carInsideTarget();
    final double alignment = min(
      _angleDistance(carAngle, scenario.targetAngle),
      _angleDistance(carAngle, scenario.targetAngle + pi),
    );
    if (inSpace && alignment < 0.17 && speed.abs() < 0.018) {
      parkedProgress += dt;
      if (parkedProgress >= 0.72) {
        parkedProgress = 0.72;
        isParked = true;
        speed = 0;
        throttlePressed = false;
        brakePressed = false;
        _events.add(const ParkingEvent(ParkingEventKind.parked));
      }
    } else {
      parkedProgress = max(0, parkedProgress - dt * 1.8);
    }
  }

  bool _carInsideTarget() {
    return _corners(
      carPosition,
      carAngle,
      carWidth,
      carLength,
    ).every(scenario.target.inflate(0.004).contains);
  }

  bool _carCollides() {
    final List<Offset> carCorners = _corners(
      carPosition,
      carAngle,
      carWidth,
      carLength,
    );
    if (carCorners.any(
      (Offset point) =>
          point.dx < 0.035 ||
          point.dx > worldWidth - 0.035 ||
          point.dy < 0.035 ||
          point.dy > worldHeight - 0.035,
    )) {
      return true;
    }
    for (final ParkedCar parked in scenario.parkedCars) {
      if (_rectanglesOverlap(
        carPosition,
        carAngle,
        carWidth,
        carLength,
        parked.center,
        parked.angle,
        parked.width,
        parked.length,
      )) {
        return true;
      }
    }
    return false;
  }

  void _loadScenario() {
    scenario = difficulty == ParkingDifficulty.easy
        ? _generateEasyScenario()
        : _generateHardScenario();
    carPosition = scenario.start;
    carAngle = scenario.startAngle;
    speed = 0;
    steering = 0;
    throttlePressed = false;
    brakePressed = false;
    parkedProgress = 0;
    isParked = false;
    _events.clear();
  }

  ParkingScenario _generateEasyScenario() {
    final List<double> lanes = <double>[0.28, 0.5, 0.72];
    final double targetX = lanes[_random.nextInt(lanes.length)];
    final double width = 0.145 - min(level, 10) * 0.0025;
    final Rect target = Rect.fromCenter(
      center: Offset(targetX, 0.19),
      width: width,
      height: 0.205,
    );
    final double neighborGap = width * 0.96;
    final List<ParkedCar> parked = <ParkedCar>[
      if (targetX - neighborGap > 0.11)
        _parkedCar(Offset(targetX - neighborGap, 0.19), 0),
      if (targetX + neighborGap < 0.89)
        _parkedCar(Offset(targetX + neighborGap, 0.19), 0),
    ];
    final double startOffset = (_random.nextDouble() - 0.5) * 0.28;
    return ParkingScenario(
      label: level < 3 ? 'Open bay' : 'Busy row',
      hint: 'Pull forward, line up, then brake inside the green bay.',
      target: target,
      targetAngle: 0,
      start: Offset((targetX + startOffset).clamp(0.22, 0.78), 1.25),
      startAngle: (_random.nextDouble() - 0.5) * 0.10,
      parkedCars: parked,
    );
  }

  ParkingScenario _generateHardScenario() {
    if (level.isOdd) {
      final bool rightSide = _random.nextBool();
      final double targetX = rightSide ? 0.82 : 0.18;
      final double targetY = 0.55 + (_random.nextDouble() - 0.5) * 0.18;
      final Rect target = Rect.fromCenter(
        center: Offset(targetX, targetY),
        width: 0.112,
        height: 0.19,
      );
      return ParkingScenario(
        label: 'Parallel pocket',
        hint: 'Pass the space, reverse in, straighten, and stop.',
        target: target,
        targetAngle: 0,
        start: Offset(rightSide ? 0.58 : 0.42, 1.22),
        startAngle: 0,
        parkedCars: <ParkedCar>[
          _parkedCar(Offset(targetX, targetY - 0.205), 0),
          _parkedCar(Offset(targetX, targetY + 0.205), 0),
        ],
      );
    }

    final bool leftSide = _random.nextBool();
    final double targetX = leftSide ? 0.145 : 0.855;
    final double targetY = 0.30 + _random.nextDouble() * 0.24;
    final Rect target = Rect.fromCenter(
      center: Offset(targetX, targetY),
      width: 0.19,
      height: 0.108,
    );
    return ParkingScenario(
      label: 'Tight turn-in',
      hint: 'Use the full lane and turn late into the narrow space.',
      target: target,
      targetAngle: pi / 2,
      start: Offset(0.5, 1.24),
      startAngle: 0,
      parkedCars: <ParkedCar>[
        _parkedCar(Offset(targetX, targetY - 0.13), pi / 2),
        _parkedCar(Offset(targetX, targetY + 0.13), pi / 2),
      ],
    );
  }

  ParkedCar _parkedCar(Offset center, double angle) {
    return ParkedCar(
      center: center,
      angle: angle,
      width: carWidth + 0.006,
      length: carLength + 0.004,
      colorIndex: _random.nextInt(5),
    );
  }

  static List<Offset> _corners(
    Offset center,
    double angle,
    double width,
    double length,
  ) {
    final Offset forward = Offset(sin(angle), -cos(angle));
    final Offset right = Offset(cos(angle), sin(angle));
    final Offset halfForward = forward * (length / 2);
    final Offset halfRight = right * (width / 2);
    return <Offset>[
      center + halfForward + halfRight,
      center + halfForward - halfRight,
      center - halfForward + halfRight,
      center - halfForward - halfRight,
    ];
  }

  static bool _rectanglesOverlap(
    Offset centerA,
    double angleA,
    double widthA,
    double lengthA,
    Offset centerB,
    double angleB,
    double widthB,
    double lengthB,
  ) {
    final List<Offset> cornersA = _corners(centerA, angleA, widthA, lengthA);
    final List<Offset> cornersB = _corners(centerB, angleB, widthB, lengthB);
    final List<Offset> axes = <Offset>[
      Offset(cos(angleA), sin(angleA)),
      Offset(sin(angleA), -cos(angleA)),
      Offset(cos(angleB), sin(angleB)),
      Offset(sin(angleB), -cos(angleB)),
    ];
    for (final Offset axis in axes) {
      final Iterable<double> projectionA = cornersA.map(
        (Offset point) => point.dx * axis.dx + point.dy * axis.dy,
      );
      final Iterable<double> projectionB = cornersB.map(
        (Offset point) => point.dx * axis.dx + point.dy * axis.dy,
      );
      if (projectionA.reduce(max) < projectionB.reduce(min) ||
          projectionB.reduce(max) < projectionA.reduce(min)) {
        return false;
      }
    }
    return true;
  }

  static double _normalizeAngle(double angle) {
    double result = angle % (pi * 2);
    if (result > pi) {
      result -= pi * 2;
    }
    if (result < -pi) {
      result += pi * 2;
    }
    return result;
  }

  static double _angleDistance(double a, double b) =>
      _normalizeAngle(a - b).abs();
}
