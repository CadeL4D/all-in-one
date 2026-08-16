import 'dart:math';

enum LoomObjectKind { stitch, snag, mend, prism }

enum LoomEventKind { correct, wrong, hit, mend, nearMiss, gameOver }

class LoomObject {
  LoomObject({
    required this.id,
    required this.row,
    required this.lane,
    required this.kind,
    required this.x,
    required this.y,
    required this.radius,
    this.colorIndex = 0,
    this.patternTarget = false,
    this.drift = 0,
    this.phase = 0,
  });

  final int id;
  final int row;
  final int lane;
  final LoomObjectKind kind;
  final double x;
  double y;
  final double radius;
  int colorIndex;
  final bool patternTarget;
  final double drift;
  final double phase;
  bool nearMissAwarded = false;

  double xAt(double time) =>
      (x + sin(time * 1.8 + phase) * drift).clamp(0.08, 0.92);
}

class LoomEvent {
  const LoomEvent({
    required this.kind,
    required this.x,
    required this.y,
    this.colorIndex = 0,
  });

  final LoomEventKind kind;
  final double x;
  final double y;
  final int colorIndex;
}

class TetherloomEngine {
  TetherloomEngine({int? seed})
    : _seed = seed ?? DateTime.now().microsecondsSinceEpoch {
    reset();
  }

  static const List<double> lanes = <double>[0.17, 0.39, 0.61, 0.83];
  static const double playerY = 0.76;
  static const double playerRadius = 0.032;
  static const int maxLives = 3;
  static const int colorCount = 4;

  final int _seed;
  int _run = 0;
  late Random _random;
  final List<LoomObject> objects = <LoomObject>[];
  final List<LoomEvent> _events = <LoomEvent>[];

  double playerX = 0.5;
  double targetX = 0.5;
  double time = 0;
  double distance = 0;
  double rawScore = 0;
  double speed = 0.20;
  double invulnerableFor = 0;
  double recoveryFor = 0;
  int lives = maxLives;
  int combo = 0;
  int bestCombo = 0;
  int stitches = 0;
  int expectedColor = 0;
  int rows = 0;
  bool gameOver = false;
  double _spawnIn = 0;
  int _nextObjectId = 1;

  int get score => rawScore.floor();

  int get multiplier => min(6, 1 + combo ~/ 5);

  double get difficulty => (distance / 1800).clamp(0.0, 1.0);

  void reset() {
    _random = Random(_seed + _run++);
    objects.clear();
    _events.clear();
    playerX = 0.5;
    targetX = 0.5;
    time = 0;
    distance = 0;
    rawScore = 0;
    speed = 0.20;
    invulnerableFor = 0;
    recoveryFor = 0;
    lives = maxLives;
    combo = 0;
    bestCombo = 0;
    stitches = 0;
    expectedColor = _random.nextInt(colorCount);
    rows = 0;
    gameOver = false;
    _spawnIn = 0.8;
    _nextObjectId = 1;
    spawnProceduralRow(y: 0.04);
  }

  void setTargetX(double value) {
    targetX = value.clamp(0.07, 0.93);
  }

  List<LoomEvent> drainEvents() {
    final List<LoomEvent> result = List<LoomEvent>.of(_events);
    _events.clear();
    return result;
  }

  void tick(double deltaSeconds) {
    if (gameOver || deltaSeconds <= 0) {
      return;
    }
    final double dt = deltaSeconds.clamp(0.0, 0.05);
    time += dt;
    invulnerableFor = max(0, invulnerableFor - dt);
    recoveryFor = max(0, recoveryFor - dt);
    playerX += (targetX - playerX) * min(1, dt * 13);
    final double targetSpeed = min(0.58, 0.20 + distance / 5200);
    speed = max(0.18, targetSpeed - (recoveryFor > 0 ? 0.055 : 0));
    distance += speed * dt * 100;
    rawScore += speed * dt * 34;

    _spawnIn -= dt;
    if (_spawnIn <= 0) {
      spawnProceduralRow();
      _spawnIn = max(0.58, 1.16 - difficulty * 0.56);
    }

    final List<LoomObject> removed = <LoomObject>[];
    for (final LoomObject object in objects) {
      final double previousY = object.y;
      object.y += speed * dt;
      final double objectX = object.xAt(time);
      final double dx = (objectX - playerX).abs();
      final double dy = (object.y - playerY).abs();
      final bool collides = dx < object.radius + playerRadius && dy < 0.038;

      if (collides &&
          (object.kind != LoomObjectKind.snag || invulnerableFor <= 0)) {
        removed.add(object);
        _collect(object, objectX);
        continue;
      }

      final bool crossedPlayer = previousY < playerY && object.y >= playerY;
      if (object.kind == LoomObjectKind.snag &&
          crossedPlayer &&
          !object.nearMissAwarded &&
          dx >= object.radius + playerRadius &&
          dx < object.radius + playerRadius + 0.075) {
        object.nearMissAwarded = true;
        combo++;
        bestCombo = max(bestCombo, combo);
        rawScore += 24 * multiplier;
        _events.add(
          LoomEvent(kind: LoomEventKind.nearMiss, x: objectX, y: object.y),
        );
      }
      if (object.y > 1.12) {
        removed.add(object);
      }
    }
    objects.removeWhere(removed.contains);
  }

  void _collect(LoomObject object, double objectX) {
    switch (object.kind) {
      case LoomObjectKind.stitch:
        if (object.colorIndex == expectedColor) {
          combo++;
          bestCombo = max(bestCombo, combo);
          stitches++;
          rawScore += 48 * multiplier;
          _events.add(
            LoomEvent(
              kind: LoomEventKind.correct,
              x: objectX,
              y: object.y,
              colorIndex: object.colorIndex,
            ),
          );
          _advancePattern();
        } else {
          combo = 0;
          rawScore += 4;
          _events.add(
            LoomEvent(
              kind: LoomEventKind.wrong,
              x: objectX,
              y: object.y,
              colorIndex: object.colorIndex,
            ),
          );
        }
      case LoomObjectKind.prism:
        combo += 2;
        bestCombo = max(bestCombo, combo);
        stitches++;
        rawScore += 72 * multiplier;
        _events.add(
          LoomEvent(
            kind: LoomEventKind.correct,
            x: objectX,
            y: object.y,
            colorIndex: expectedColor,
          ),
        );
        _advancePattern();
      case LoomObjectKind.mend:
        lives = min(maxLives, lives + 1);
        rawScore += 30;
        _events.add(
          LoomEvent(kind: LoomEventKind.mend, x: objectX, y: object.y),
        );
      case LoomObjectKind.snag:
        if (invulnerableFor > 0) {
          return;
        }
        lives--;
        combo = 0;
        invulnerableFor = 1.05;
        recoveryFor = 2.8;
        _events.add(
          LoomEvent(kind: LoomEventKind.hit, x: objectX, y: object.y),
        );
        if (lives <= 0) {
          gameOver = true;
          _events.add(
            LoomEvent(kind: LoomEventKind.gameOver, x: playerX, y: playerY),
          );
        }
    }
  }

  void _advancePattern() {
    final int previous = expectedColor;
    do {
      expectedColor = _random.nextInt(colorCount);
    } while (expectedColor == previous && _random.nextBool());
    for (final LoomObject object in objects) {
      if (object.patternTarget && object.kind == LoomObjectKind.stitch) {
        object.colorIndex = expectedColor;
      }
    }
  }

  List<LoomObject> spawnProceduralRow({double y = -0.08}) {
    rows++;
    final int row = rows;
    final int targetLane = _random.nextInt(lanes.length);
    final bool prismRow = row % 17 == 0;
    final List<LoomObject> generated = <LoomObject>[
      LoomObject(
        id: _nextObjectId++,
        row: row,
        lane: targetLane,
        kind: prismRow ? LoomObjectKind.prism : LoomObjectKind.stitch,
        x: lanes[targetLane],
        y: y,
        radius: prismRow ? 0.034 : 0.029,
        colorIndex: expectedColor,
        patternTarget: true,
      ),
    ];

    final List<int> remainingLanes = <int>[
      for (int lane = 0; lane < lanes.length; lane++)
        if (lane != targetLane) lane,
    ]..shuffle(_random);
    final int maxSnags = difficulty < 0.42 ? 1 : 2;
    final int snagCount = _random.nextDouble() < 0.30 + difficulty * 0.58
        ? maxSnags
        : 0;

    for (int index = 0; index < remainingLanes.length; index++) {
      final int lane = remainingLanes[index];
      if (index < snagCount) {
        generated.add(
          LoomObject(
            id: _nextObjectId++,
            row: row,
            lane: lane,
            kind: LoomObjectKind.snag,
            x: lanes[lane],
            y: y,
            radius: 0.034,
            drift: difficulty > 0.48 && _random.nextDouble() < 0.35
                ? 0.018 + difficulty * 0.013
                : 0,
            phase: _random.nextDouble() * pi * 2,
          ),
        );
      } else if (_random.nextDouble() < 0.62) {
        int decoyColor;
        do {
          decoyColor = _random.nextInt(colorCount);
        } while (decoyColor == expectedColor);
        generated.add(
          LoomObject(
            id: _nextObjectId++,
            row: row,
            lane: lane,
            kind: LoomObjectKind.stitch,
            x: lanes[lane],
            y: y,
            radius: 0.027,
            colorIndex: decoyColor,
          ),
        );
      }
    }

    if (row % 13 == 0 && lives < maxLives) {
      final int mendLane = remainingLanes.last;
      generated.removeWhere((LoomObject object) => object.lane == mendLane);
      generated.add(
        LoomObject(
          id: _nextObjectId++,
          row: row,
          lane: mendLane,
          kind: LoomObjectKind.mend,
          x: lanes[mendLane],
          y: y,
          radius: 0.031,
        ),
      );
    }

    objects.addAll(generated);
    return generated;
  }
}
