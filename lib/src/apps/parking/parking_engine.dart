import 'dart:math';
import 'dart:ui';

enum ParkingDifficulty { easy, hard }

enum ParkingScenarioKind {
  forwardBay,
  reverseBay,
  parallel,
  angled,
  garage,
  tandem,
  curvedCurb,
}

enum ParkingVehicleType { compact, sedan, deliveryVan }

enum ParkingPrecision { perfect, acceptable, crooked }

enum ParkingSonarLevel { clear, green, yellow, red }

enum ParkingObstacleKind {
  pillar,
  shoppingCart,
  pedestrian,
  curb,
  wheelStop,
  wall,
  mirror,
}

enum ParkingEventKind { bump, pickup, parked, timeExpired }

class ParkingEvent {
  const ParkingEvent(this.kind, {this.points = 0});

  final ParkingEventKind kind;
  final int points;
}

class ParkingPickup {
  ParkingPickup(this.center);

  final Offset center;
  bool collected = false;

  void reset() => collected = false;
}

class ParkingVehicleProfile {
  const ParkingVehicleProfile({
    required this.label,
    required this.shortLabel,
    required this.width,
    required this.length,
    required this.acceleration,
    required this.braking,
    required this.reverseAcceleration,
    required this.maxForwardSpeed,
    required this.maxReverseSpeed,
    required this.drag,
    required this.steeringResponse,
    required this.description,
  });

  final String label;
  final String shortLabel;
  final double width;
  final double length;
  final double acceleration;
  final double braking;
  final double reverseAcceleration;
  final double maxForwardSpeed;
  final double maxReverseSpeed;
  final double drag;
  final double steeringResponse;
  final String description;
}

class ParkingObstacle {
  ParkingObstacle({
    required this.kind,
    required this.start,
    required this.width,
    required this.length,
    this.end,
    this.speed = 0,
    this.angle = 0,
    this.initialProgress = 0,
  }) : progress = initialProgress,
       center = end == null ? start : Offset.lerp(start, end, initialProgress)!;

  final ParkingObstacleKind kind;
  final Offset start;
  final Offset? end;
  final double width;
  final double length;
  final double speed;
  final double angle;
  final double initialProgress;
  double progress;
  double direction = 1;
  Offset center;

  bool get isMoving => end != null && speed > 0;

  void tick(double dt) {
    final Offset? destination = end;
    if (destination == null || speed <= 0) {
      return;
    }
    final double pathLength = (destination - start).distance;
    if (pathLength == 0) {
      return;
    }
    progress += direction * speed * dt / pathLength;
    if (progress >= 1) {
      progress = 1;
      direction = -1;
    } else if (progress <= 0) {
      progress = 0;
      direction = 1;
    }
    center = Offset.lerp(start, destination, progress)!;
  }

  void reset() {
    progress = initialProgress;
    direction = 1;
    center = end == null ? start : Offset.lerp(start, end, initialProgress)!;
  }
}

class TrafficCar {
  TrafficCar({
    required this.start,
    required this.end,
    required this.speed,
    required this.colorIndex,
    this.initialProgress = 0,
  }) : progress = initialProgress,
       center = Offset.lerp(start, end, initialProgress)!;

  final Offset start;
  final Offset end;
  final double speed;
  final int colorIndex;
  final double initialProgress;
  double progress;
  double direction = 1;
  Offset center;

  double get angle {
    final Offset path = (end - start) * direction;
    return atan2(path.dx, -path.dy);
  }

  void tick(double dt) {
    final double pathLength = (end - start).distance;
    if (pathLength == 0) {
      return;
    }
    progress += direction * speed * dt / pathLength;
    if (progress >= 1) {
      progress = 1;
      direction = -1;
    } else if (progress <= 0) {
      progress = 0;
      direction = 1;
    }
    center = Offset.lerp(start, end, progress)!;
  }

  void reset() {
    progress = initialProgress;
    direction = 1;
    center = Offset.lerp(start, end, progress)!;
  }
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
    required this.kind,
    required this.label,
    required this.hint,
    required this.target,
    required this.targetAngle,
    required this.start,
    required this.startAngle,
    required this.parkedCars,
    required this.traffic,
    required this.pickups,
    required this.obstacles,
    this.modifierLabel,
  });

  final ParkingScenarioKind kind;
  final String label;
  final String hint;
  final Rect target;
  final double targetAngle;
  final Offset start;
  final double startAngle;
  final List<ParkedCar> parkedCars;
  final List<TrafficCar> traffic;
  final List<ParkingPickup> pickups;
  final List<ParkingObstacle> obstacles;
  final String? modifierLabel;
}

class ParkingEngine {
  ParkingEngine({
    int? seed,
    this.difficulty = ParkingDifficulty.easy,
    this.vehicleType = ParkingVehicleType.compact,
  }) : _seed = seed ?? DateTime.now().microsecondsSinceEpoch {
    restart(difficulty);
  }

  static const double worldWidth = 1;
  static const double worldHeight = 1.48;
  static const double carWidth = 0.078;
  static const double carLength = 0.152;
  static const Rect playableBounds = Rect.fromLTRB(0.045, 0.045, 0.955, 1.435);

  final int _seed;
  ParkingDifficulty difficulty;
  ParkingVehicleType vehicleType;
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
  int score = 0;
  int streak = 0;
  int scenarioBumps = 0;
  int pickupsCollected = 0;
  int lastAward = 0;
  int lastTimeChange = 0;
  double scenarioTime = 0;
  double elapsedTime = 0;
  double timeRemaining = 30;
  double parkedProgress = 0;
  bool isParked = false;
  bool isGameOver = false;
  bool usedReverse = false;
  bool lastSmoothPark = false;
  ParkingPrecision lastPrecision = ParkingPrecision.acceptable;
  bool _collisionLatched = false;
  double _collisionClearTime = 0;
  final List<ParkingEvent> _events = <ParkingEvent>[];

  ParkingVehicleProfile get vehicleProfile => switch (vehicleType) {
    ParkingVehicleType.compact => const ParkingVehicleProfile(
      label: 'City Compact',
      shortLabel: 'Compact',
      width: carWidth,
      length: carLength,
      acceleration: 0.205,
      braking: 0.44,
      reverseAcceleration: 0.11,
      maxForwardSpeed: 0.24,
      maxReverseSpeed: 0.108,
      drag: 0.10,
      steeringResponse: 2.75,
      description: 'Quick steering and the tightest turning circle.',
    ),
    ParkingVehicleType.sedan => const ParkingVehicleProfile(
      label: 'Executive Sedan',
      shortLabel: 'Sedan',
      width: 0.086,
      length: 0.184,
      acceleration: 0.18,
      braking: 0.40,
      reverseAcceleration: 0.095,
      maxForwardSpeed: 0.225,
      maxReverseSpeed: 0.098,
      drag: 0.087,
      steeringResponse: 2.25,
      description: 'Long wheelbase with a wider rear swing.',
    ),
    ParkingVehicleType.deliveryVan => const ParkingVehicleProfile(
      label: 'Delivery Van',
      shortLabel: 'Van',
      width: 0.094,
      length: 0.205,
      acceleration: 0.145,
      braking: 0.30,
      reverseAcceleration: 0.078,
      maxForwardSpeed: 0.195,
      maxReverseSpeed: 0.082,
      drag: 0.07,
      steeringResponse: 1.95,
      description: 'Heavy braking and no rear-window view—trust the sonar.',
    ),
  };

  double get activeCarWidth => vehicleProfile.width;

  double get activeCarLength => vehicleProfile.length;

  double get speedKph => speed.abs() * 145;

  bool get isReversing => speed < -0.006;

  bool get carInsideTarget => _carInsideTarget();

  bool get carWithinPlayableBounds => _corners(
    carPosition,
    carAngle,
    activeCarWidth,
    activeCarLength,
  ).every(playableBounds.contains);

  double get centerError => (carPosition - scenario.target.center).distance;

  double get nearestObstacleDistance {
    final double playerRadius = max(activeCarWidth, activeCarLength) / 2;
    double nearest =
        min(
          min(
            carPosition.dx - playableBounds.left,
            playableBounds.right - carPosition.dx,
          ),
          min(
            carPosition.dy - playableBounds.top,
            playableBounds.bottom - carPosition.dy,
          ),
        ) -
        playerRadius;
    for (final ParkedCar parked in scenario.parkedCars) {
      nearest = min(
        nearest,
        (carPosition - parked.center).distance -
            playerRadius -
            max(parked.width, parked.length) / 2,
      );
    }
    for (final TrafficCar traffic in scenario.traffic) {
      nearest = min(
        nearest,
        (carPosition - traffic.center).distance - playerRadius - carLength / 2,
      );
    }
    for (final ParkingObstacle obstacle in scenario.obstacles) {
      nearest = min(
        nearest,
        (carPosition - obstacle.center).distance -
            playerRadius -
            max(obstacle.width, obstacle.length) / 2,
      );
    }
    return max(0, nearest);
  }

  ParkingSonarLevel get sonarLevel {
    final double distance = nearestObstacleDistance;
    if (distance < 0.025) {
      return ParkingSonarLevel.red;
    }
    if (distance < 0.05) {
      return ParkingSonarLevel.yellow;
    }
    if (distance < 0.085) {
      return ParkingSonarLevel.green;
    }
    return ParkingSonarLevel.clear;
  }

  double get alignmentError => min(
    _angleDistance(carAngle, scenario.targetAngle),
    _angleDistance(carAngle, scenario.targetAngle + pi),
  );

  String get parkingGuidance {
    if (speed.abs() > 0.11) {
      return 'Slow down';
    }
    if (carInsideTarget) {
      if (alignmentError >= 0.17) {
        return 'Straighten';
      }
      if (speed.abs() >= 0.018) {
        return 'Brake here';
      }
      return 'Hold steady';
    }
    final double distance = (carPosition - scenario.target.center).distance;
    if (distance < 0.28) {
      return alignmentError < 0.28 ? 'Good angle' : 'Turn into bay';
    }
    return 'Find the green bay';
  }

  void restart(ParkingDifficulty selectedDifficulty) {
    difficulty = selectedDifficulty;
    _random = Random(_seed + selectedDifficulty.index * 100003);
    level = 1;
    parks = 0;
    bumps = 0;
    score = 0;
    streak = 0;
    elapsedTime = 0;
    timeRemaining = 30;
    isGameOver = false;
    steering = 0;
    _loadScenario();
  }

  void nextScenario() {
    if (isParked) {
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
    scenarioBumps = 0;
    pickupsCollected = 0;
    scenarioTime = 0;
    lastAward = 0;
    lastTimeChange = 0;
    usedReverse = false;
    lastSmoothPark = false;
    _collisionLatched = false;
    _collisionClearTime = 0;
    for (final TrafficCar car in scenario.traffic) {
      car.reset();
    }
    for (final ParkingPickup pickup in scenario.pickups) {
      pickup.reset();
    }
    for (final ParkingObstacle obstacle in scenario.obstacles) {
      obstacle.reset();
    }
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
    if (isParked || isGameOver || deltaSeconds <= 0) {
      return;
    }
    final double dt = deltaSeconds.clamp(0, 0.04);
    elapsedTime += deltaSeconds;
    scenarioTime += deltaSeconds;
    timeRemaining = max(0, timeRemaining - deltaSeconds);
    if (timeRemaining <= 0) {
      isGameOver = true;
      speed = 0;
      throttlePressed = false;
      brakePressed = false;
      _events.add(const ParkingEvent(ParkingEventKind.timeExpired));
      return;
    }
    for (final TrafficCar car in scenario.traffic) {
      car.tick(dt);
    }
    for (final ParkingObstacle obstacle in scenario.obstacles) {
      obstacle.tick(dt);
    }

    final ParkingVehicleProfile profile = vehicleProfile;
    double acceleration = 0;
    if (throttlePressed && !brakePressed) {
      acceleration = profile.acceleration;
    } else if (brakePressed && !throttlePressed) {
      acceleration = speed > 0.012
          ? -profile.braking
          : -profile.reverseAcceleration;
    } else {
      final double drag = profile.drag * dt;
      if (speed.abs() <= drag) {
        speed = 0;
      } else {
        speed -= speed.sign * drag;
      }
    }
    speed = (speed + acceleration * dt).clamp(
      -profile.maxReverseSpeed,
      profile.maxForwardSpeed,
    );
    if (speed < -0.006) {
      usedReverse = true;
    }

    final Offset previousPosition = carPosition;
    final double previousAngle = carAngle;
    if (speed.abs() > 0.002) {
      final double steeringResponse =
          profile.steeringResponse *
          (difficulty == ParkingDifficulty.hard ? 0.94 : 1);
      carAngle = _normalizeAngle(
        carAngle + steering * speed * steeringResponse * dt,
      );
      final Offset forward = Offset(sin(carAngle), -cos(carAngle));
      carPosition += forward * speed * dt;
    }

    if (_carCollides()) {
      carPosition = previousPosition;
      carAngle = previousAngle;
      speed = 0;
      parkedProgress = 0;
      _collisionClearTime = 0;
      if (!_collisionLatched) {
        _collisionLatched = true;
        bumps++;
        scenarioBumps++;
        streak = 0;
        _events.add(const ParkingEvent(ParkingEventKind.bump));
      }
      return;
    }

    if (_collisionLatched) {
      _collisionClearTime += dt;
      if (_collisionClearTime >= 0.28) {
        _collisionLatched = false;
        _collisionClearTime = 0;
      }
    }

    for (final ParkingPickup pickup in scenario.pickups) {
      if (!pickup.collected && (carPosition - pickup.center).distance < 0.066) {
        pickup.collected = true;
        pickupsCollected++;
        score += 75;
        _events.add(const ParkingEvent(ParkingEventKind.pickup, points: 75));
      }
    }

    final bool inSpace = _carParkableInTarget();
    if (inSpace && alignmentError < 0.32 && speed.abs() < 0.018) {
      parkedProgress += dt;
      if (parkedProgress >= 0.72) {
        parkedProgress = 0.72;
        isParked = true;
        parks++;
        if (scenarioBumps == 0) {
          streak++;
        }
        lastPrecision = _precisionRating();
        lastSmoothPark = !usedReverse && scenarioBumps == 0;
        final int timeBonus = max(0, 24 - scenarioTime.floor()) * 8;
        final int baseAward =
            300 +
            (difficulty == ParkingDifficulty.hard ? 200 : 0) +
            timeBonus +
            (scenarioBumps == 0 ? 150 : 0) +
            streak * 35;
        final double precisionMultiplier = switch (lastPrecision) {
          ParkingPrecision.perfect => 1.5,
          ParkingPrecision.acceptable => 1,
          ParkingPrecision.crooked => 0.65,
        };
        final double smoothMultiplier = lastSmoothPark ? 1.5 : 1;
        lastAward = (baseAward * precisionMultiplier * smoothMultiplier)
            .round();
        lastTimeChange = switch (lastPrecision) {
          ParkingPrecision.perfect =>
            difficulty == ParkingDifficulty.hard ? 8 : 7,
          ParkingPrecision.acceptable =>
            difficulty == ParkingDifficulty.hard ? 7 : 5,
          ParkingPrecision.crooked => -3,
        };
        timeRemaining = max(0, timeRemaining + lastTimeChange);
        score += lastAward;
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
      activeCarWidth,
      activeCarLength,
    ).every(scenario.target.inflate(0.004).contains);
  }

  bool _carParkableInTarget() {
    final Rect tolerance = scenario.target.inflate(0.018);
    final List<Offset> corners = _corners(
      carPosition,
      carAngle,
      activeCarWidth,
      activeCarLength,
    );
    return tolerance.contains(carPosition) &&
        corners.where(tolerance.contains).length >= 3;
  }

  ParkingPrecision _precisionRating() {
    if (alignmentError <= pi / 90 && centerError <= 0.015) {
      return ParkingPrecision.perfect;
    }
    if (_carInsideTarget() && alignmentError <= 0.17) {
      return ParkingPrecision.acceptable;
    }
    return ParkingPrecision.crooked;
  }

  bool _carCollides() {
    final List<Offset> carCorners = _corners(
      carPosition,
      carAngle,
      activeCarWidth,
      activeCarLength,
    );
    if (carCorners.any((Offset point) => !playableBounds.contains(point))) {
      return true;
    }
    for (final TrafficCar traffic in scenario.traffic) {
      if (_rectanglesOverlap(
        carPosition,
        carAngle,
        activeCarWidth,
        activeCarLength,
        traffic.center,
        traffic.angle,
        carWidth + 0.006,
        carLength + 0.004,
      )) {
        return true;
      }
    }
    for (final ParkedCar parked in scenario.parkedCars) {
      if (_rectanglesOverlap(
        carPosition,
        carAngle,
        activeCarWidth,
        activeCarLength,
        parked.center,
        parked.angle,
        parked.width,
        parked.length,
      )) {
        return true;
      }
    }
    for (final ParkingObstacle obstacle in scenario.obstacles) {
      if (_rectanglesOverlap(
        carPosition,
        carAngle,
        activeCarWidth,
        activeCarLength,
        obstacle.center,
        obstacle.angle,
        obstacle.width,
        obstacle.length,
      )) {
        return true;
      }
    }
    return false;
  }

  void _loadScenario() {
    scenario = _generateScenario();
    carPosition = scenario.start;
    carAngle = scenario.startAngle;
    speed = 0;
    steering = 0;
    throttlePressed = false;
    brakePressed = false;
    parkedProgress = 0;
    isParked = false;
    scenarioBumps = 0;
    pickupsCollected = 0;
    scenarioTime = 0;
    lastAward = 0;
    lastTimeChange = 0;
    usedReverse = false;
    lastSmoothPark = false;
    _collisionLatched = false;
    _collisionClearTime = 0;
    _events.clear();
  }

  ParkingScenario _generateScenario() {
    final List<ParkingScenarioKind> rotation =
        difficulty == ParkingDifficulty.easy
        ? const <ParkingScenarioKind>[
            ParkingScenarioKind.forwardBay,
            ParkingScenarioKind.angled,
            ParkingScenarioKind.reverseBay,
            ParkingScenarioKind.tandem,
            ParkingScenarioKind.garage,
            ParkingScenarioKind.parallel,
            ParkingScenarioKind.curvedCurb,
          ]
        : const <ParkingScenarioKind>[
            ParkingScenarioKind.parallel,
            ParkingScenarioKind.garage,
            ParkingScenarioKind.angled,
            ParkingScenarioKind.reverseBay,
            ParkingScenarioKind.tandem,
            ParkingScenarioKind.curvedCurb,
            ParkingScenarioKind.forwardBay,
          ];
    return switch (rotation[(level - 1) % rotation.length]) {
      ParkingScenarioKind.forwardBay => _generateForwardBay(),
      ParkingScenarioKind.reverseBay => _generateReverseBay(),
      ParkingScenarioKind.parallel => _generateParallelSpace(),
      ParkingScenarioKind.angled => _generateAngledBay(),
      ParkingScenarioKind.garage => _generateGarageStall(),
      ParkingScenarioKind.tandem => _generateTandemDriveway(),
      ParkingScenarioKind.curvedCurb => _generateCurvedCurb(),
    };
  }

  ParkingScenario _generateForwardBay() {
    final List<double> lanes = <double>[0.28, 0.5, 0.72];
    final double targetX = lanes[_random.nextInt(lanes.length)];
    final double width = max(
      activeCarWidth + (difficulty == ParkingDifficulty.hard ? 0.032 : 0.05),
      0.14,
    );
    final double height = max(activeCarLength + 0.04, 0.205);
    final Rect target = Rect.fromCenter(
      center: Offset(targetX, 0.19),
      width: width,
      height: height,
    );
    final double neighborGap = width + 0.025;
    final bool terribleParker = level >= 3 && _random.nextDouble() < 0.5;
    final List<ParkedCar> parked = <ParkedCar>[
      if (targetX - neighborGap > 0.11)
        _parkedCar(
          Offset(targetX - neighborGap, 0.19),
          terribleParker ? 0.11 : 0,
        ),
      if (targetX + neighborGap < 0.89)
        _parkedCar(
          Offset(targetX + neighborGap, 0.19),
          terribleParker ? -0.09 : 0,
        ),
    ];
    final double startOffset = (_random.nextDouble() - 0.5) * 0.28;
    return ParkingScenario(
      kind: ParkingScenarioKind.forwardBay,
      label: 'Forward 90° bay',
      hint: 'Pull forward, line up, then brake inside the green bay.',
      target: target,
      targetAngle: 0,
      start: Offset((targetX + startOffset).clamp(0.22, 0.78), 1.25),
      startAngle: (_random.nextDouble() - 0.5) * 0.10,
      parkedCars: parked,
      traffic: difficulty == ParkingDifficulty.hard
          ? <TrafficCar>[_trafficCar(0.82)]
          : <TrafficCar>[],
      pickups: <ParkingPickup>[
        ParkingPickup(const Offset(0.5, 1.02)),
        if (level >= 3) ParkingPickup(Offset(targetX, 0.56)),
      ],
      obstacles: _movingHazards(0.72),
      modifierLabel: terribleParker ? 'Terrible parker' : null,
    );
  }

  ParkingScenario _generateReverseBay() {
    final double targetX = <double>[0.30, 0.5, 0.70][_random.nextInt(3)];
    final double targetWidth = max(activeCarWidth + 0.04, 0.135);
    final double targetHeight = max(activeCarLength + 0.045, 0.21);
    final Rect target = Rect.fromCenter(
      center: Offset(targetX, 0.2),
      width: targetWidth,
      height: targetHeight,
    );
    return ParkingScenario(
      kind: ParkingScenarioKind.reverseBay,
      label: 'Reverse 90° bay',
      hint: 'Pull past the bay, then back in and straighten.',
      target: target,
      targetAngle: 0,
      start: Offset((targetX + 0.22).clamp(0.30, 0.72), 0.58),
      startAngle: 0,
      parkedCars: <ParkedCar>[
        _parkedCar(Offset(targetX - targetWidth - 0.02, 0.2), 0),
        _parkedCar(Offset(targetX + targetWidth + 0.02, 0.2), 0),
      ],
      traffic: difficulty == ParkingDifficulty.hard
          ? <TrafficCar>[_trafficCar(0.84)]
          : <TrafficCar>[],
      pickups: <ParkingPickup>[
        ParkingPickup(Offset(targetX, 0.75)),
        ParkingPickup(Offset((targetX + 0.20).clamp(0.25, 0.75), 0.48)),
      ],
      obstacles: _movingHazards(0.92),
    );
  }

  ParkingScenario _generateParallelSpace() {
    final bool rightSide = _random.nextBool();
    final double targetX = rightSide ? 0.84 : 0.16;
    final double targetY = 0.58 + (_random.nextDouble() - 0.5) * 0.12;
    final double targetWidth = activeCarWidth + 0.035;
    final double targetHeight = activeCarLength + 0.065;
    final Rect target = Rect.fromCenter(
      center: Offset(targetX, targetY),
      width: targetWidth,
      height: targetHeight,
    );
    final double neighborOffset = targetHeight / 2 + carLength / 2 + 0.025;
    final bool terribleParker = _random.nextDouble() < 0.45;
    return ParkingScenario(
      kind: ParkingScenarioKind.parallel,
      label: 'Parallel pocket',
      hint: 'Pass the space, reverse in, straighten, and stop.',
      target: target,
      targetAngle: 0,
      start: Offset(rightSide ? 0.58 : 0.42, 1.22),
      startAngle: 0,
      parkedCars: <ParkedCar>[
        _parkedCar(
          Offset(targetX, targetY - neighborOffset),
          terribleParker ? 0.08 : 0,
        ),
        _parkedCar(
          Offset(targetX, targetY + neighborOffset),
          terribleParker ? -0.07 : 0,
        ),
      ],
      traffic: <TrafficCar>[_trafficCar(0.98)],
      pickups: <ParkingPickup>[
        ParkingPickup(const Offset(0.5, 1.08)),
        ParkingPickup(Offset(rightSide ? 0.66 : 0.34, 0.77)),
      ],
      obstacles: <ParkingObstacle>[
        ..._movingHazards(0.82),
        ParkingObstacle(
          kind: ParkingObstacleKind.curb,
          start: Offset(rightSide ? 0.925 : 0.075, targetY),
          width: 0.025,
          length: 0.52,
        ),
      ],
      modifierLabel: terribleParker ? 'Terrible parker' : 'Street traffic',
    );
  }

  ParkingScenario _generateAngledBay() {
    final bool leftSide = _random.nextBool();
    final double angle = leftSide ? -pi / 4 : pi / 4;
    final double targetX = leftSide ? 0.19 : 0.81;
    final double bound =
        (activeCarWidth + activeCarLength) * sqrt1_2 +
        (difficulty == ParkingDifficulty.hard ? 0.025 : 0.045);
    final Rect target = Rect.fromCenter(
      center: Offset(targetX, 0.34),
      width: max(bound, 0.17),
      height: max(bound, 0.17),
    );
    return ParkingScenario(
      kind: ParkingScenarioKind.angled,
      label: '45° one-way bay',
      hint: 'Follow the aisle and sweep smoothly into the angled bay.',
      target: target,
      targetAngle: angle,
      start: const Offset(0.5, 1.24),
      startAngle: 0,
      parkedCars: <ParkedCar>[
        _parkedCar(Offset(targetX, 0.12), angle),
        _parkedCar(Offset(targetX, 0.57), angle),
      ],
      traffic: <TrafficCar>[],
      pickups: <ParkingPickup>[
        ParkingPickup(const Offset(0.5, 1.03)),
        ParkingPickup(Offset(leftSide ? 0.34 : 0.66, 0.67)),
      ],
      obstacles: _movingHazards(0.78),
      modifierLabel: 'One-way aisle',
    );
  }

  ParkingScenario _generateGarageStall() {
    final double targetWidth =
        activeCarWidth + (difficulty == ParkingDifficulty.hard ? 0.035 : 0.055);
    final double targetHeight = activeCarLength + 0.05;
    final Rect target = Rect.fromCenter(
      center: const Offset(0.5, 0.22),
      width: targetWidth,
      height: targetHeight,
    );
    final double pillarX = targetWidth / 2 + 0.035;
    return ParkingScenario(
      kind: ParkingScenarioKind.garage,
      label: 'Pillar garage',
      hint: 'Turn late and keep both pillars clear.',
      target: target,
      targetAngle: 0,
      start: const Offset(0.5, 1.23),
      startAngle: 0,
      parkedCars: const <ParkedCar>[],
      traffic: <TrafficCar>[],
      pickups: <ParkingPickup>[
        ParkingPickup(const Offset(0.5, 0.92)),
        ParkingPickup(const Offset(0.5, 0.55)),
      ],
      obstacles: <ParkingObstacle>[
        for (final double x in <double>[0.5 - pillarX, 0.5 + pillarX])
          for (final double y in <double>[target.top, target.bottom])
            ParkingObstacle(
              kind: ParkingObstacleKind.pillar,
              start: Offset(x, y),
              width: 0.045,
              length: 0.045,
            ),
        ParkingObstacle(
          kind: ParkingObstacleKind.wheelStop,
          start: const Offset(0.5, 0.095),
          width: targetWidth * 0.75,
          length: 0.018,
        ),
        ParkingObstacle(
          kind: ParkingObstacleKind.mirror,
          start: Offset(0.5 + pillarX + 0.045, target.bottom + 0.03),
          width: 0.035,
          length: 0.035,
        ),
        ..._movingHazards(0.74),
      ],
      modifierLabel: 'Concrete pillars',
    );
  }

  ParkingScenario _generateTandemDriveway() {
    final Rect target = Rect.fromCenter(
      center: const Offset(0.5, 0.24),
      width: activeCarWidth + 0.05,
      height: activeCarLength + 0.055,
    );
    return ParkingScenario(
      kind: ParkingScenarioKind.tandem,
      label: 'Double-deep drive',
      hint: 'Go around the rear car and pull all the way to the wall.',
      target: target,
      targetAngle: 0,
      start: const Offset(0.5, 1.26),
      startAngle: 0,
      parkedCars: <ParkedCar>[_parkedCar(const Offset(0.5, 0.55), 0)],
      traffic: const <TrafficCar>[],
      pickups: <ParkingPickup>[
        ParkingPickup(const Offset(0.32, 0.84)),
        ParkingPickup(const Offset(0.5, 0.38)),
      ],
      obstacles: <ParkingObstacle>[
        ParkingObstacle(
          kind: ParkingObstacleKind.wall,
          start: const Offset(0.5, 0.065),
          width: 0.42,
          length: 0.026,
        ),
        ParkingObstacle(
          kind: ParkingObstacleKind.wheelStop,
          start: const Offset(0.5, 0.105),
          width: 0.10,
          length: 0.018,
        ),
      ],
      modifierLabel: 'Garage wall',
    );
  }

  ParkingScenario _generateCurvedCurb() {
    final bool rightSide = _random.nextBool();
    final double targetX = rightSide ? 0.80 : 0.20;
    final Rect target = Rect.fromCenter(
      center: Offset(targetX, 0.54),
      width: activeCarWidth + 0.035,
      height: activeCarLength + 0.06,
    );
    final double curbX = rightSide ? 0.925 : 0.075;
    return ParkingScenario(
      kind: ParkingScenarioKind.curvedCurb,
      label: 'Cul-de-sac curve',
      hint: 'Trace the curve and settle parallel to the rounded curb.',
      target: target,
      targetAngle: 0,
      start: const Offset(0.5, 1.24),
      startAngle: 0,
      parkedCars: <ParkedCar>[
        _parkedCar(Offset(targetX, 0.29), -0.18),
        _parkedCar(Offset(targetX, 0.80), 0.18),
      ],
      traffic: <TrafficCar>[],
      pickups: <ParkingPickup>[
        ParkingPickup(const Offset(0.5, 1.02)),
        ParkingPickup(Offset(rightSide ? 0.67 : 0.33, 0.72)),
      ],
      obstacles: <ParkingObstacle>[
        for (int index = 0; index < 7; index++)
          ParkingObstacle(
            kind: ParkingObstacleKind.curb,
            start: Offset(
              curbX + (rightSide ? -1 : 1) * sin(index * pi / 6) * 0.025,
              0.22 + index * 0.105,
            ),
            width: 0.025,
            length: 0.12,
            angle: (rightSide ? -1 : 1) * (index - 3) * 0.08,
          ),
        ParkingObstacle(
          kind: ParkingObstacleKind.mirror,
          start: Offset(rightSide ? 0.88 : 0.12, 0.90),
          width: 0.04,
          length: 0.04,
        ),
        ..._movingHazards(0.96),
      ],
      modifierLabel: 'Curved curb',
    );
  }

  List<ParkingObstacle> _movingHazards(double y) {
    if (difficulty == ParkingDifficulty.easy && level < 3) {
      return <ParkingObstacle>[];
    }
    return <ParkingObstacle>[
      ParkingObstacle(
        kind: ParkingObstacleKind.shoppingCart,
        start: Offset(0.22, y),
        end: Offset(0.78, y),
        width: 0.045,
        length: 0.06,
        speed: 0.035 + min(level, 10) * 0.002,
        initialProgress: _random.nextDouble(),
      ),
      if (difficulty == ParkingDifficulty.hard && level.isEven)
        ParkingObstacle(
          kind: ParkingObstacleKind.pedestrian,
          start: Offset(0.78, (y + 0.16).clamp(0.2, 1.18)),
          end: Offset(0.22, (y + 0.16).clamp(0.2, 1.18)),
          width: 0.032,
          length: 0.032,
          speed: 0.026,
          initialProgress: _random.nextDouble(),
        ),
    ];
  }

  TrafficCar _trafficCar(double y) {
    return TrafficCar(
      start: Offset(0.18, y),
      end: Offset(0.82, y),
      speed: 0.075 + min(level, 12) * 0.0035,
      colorIndex: _random.nextInt(5),
      initialProgress: _random.nextDouble() * 0.45,
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
