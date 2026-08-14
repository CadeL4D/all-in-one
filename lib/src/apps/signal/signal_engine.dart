import 'dart:math' as math;

import 'package:flutter/material.dart';

enum SignalShape { circle, triangle, square, diamond }

enum SignalObjectKind { target, avoid, distractor }

enum SignalRule {
  tutorial,
  color,
  shape,
  motion,
  sequence,
  memory,
  cue,
  reversal,
  storm,
  boss,
}

extension SignalRuleLabel on SignalRule {
  String get title {
    switch (this) {
      case SignalRule.tutorial:
        return 'First Signal';
      case SignalRule.color:
        return 'Color Lock';
      case SignalRule.shape:
        return 'Shape Shift';
      case SignalRule.motion:
        return 'Motion Track';
      case SignalRule.sequence:
        return 'Sequence';
      case SignalRule.memory:
        return 'Memory Flash';
      case SignalRule.cue:
        return 'Follow the Cue';
      case SignalRule.reversal:
        return 'Signal Flip';
      case SignalRule.storm:
        return 'Distractor Storm';
      case SignalRule.boss:
        return 'Boss Mix';
    }
  }

  String get description {
    switch (this) {
      case SignalRule.tutorial:
        return 'Catch blue. Let red pass.';
      case SignalRule.color:
        return 'Catch blue. Avoid red. Green is neutral.';
      case SignalRule.shape:
        return 'Catch blue circles. Avoid red triangles.';
      case SignalRule.motion:
        return 'Catch cyan. Avoid orange as they drift.';
      case SignalRule.sequence:
        return 'Catch the lit color, then the next in order.';
      case SignalRule.memory:
        return 'Remember the target after the cue fades.';
      case SignalRule.cue:
        return 'The border color tells you what to catch.';
      case SignalRule.reversal:
        return 'When the signal flips, catch the opposite color.';
      case SignalRule.storm:
        return 'Stay locked on blue circles in heavy noise.';
      case SignalRule.boss:
        return 'Every mechanic, switching at full speed.';
    }
  }

  String get skill {
    switch (this) {
      case SignalRule.tutorial:
        return 'Focus';
      case SignalRule.color:
        return 'Selective attention';
      case SignalRule.shape:
        return 'Inhibitory control';
      case SignalRule.motion:
        return 'Tracking';
      case SignalRule.sequence:
        return 'Working memory';
      case SignalRule.memory:
        return 'Working memory';
      case SignalRule.cue:
        return 'Task switching';
      case SignalRule.reversal:
        return 'Cognitive flexibility';
      case SignalRule.storm:
        return 'Selective attention';
      case SignalRule.boss:
        return 'All skills';
    }
  }
}

class SignalPhase {
  const SignalPhase({
    required this.rule,
    required this.targetGoal,
    required this.baseSpawnInterval,
    required this.baseSpeed,
  });

  final SignalRule rule;
  final int targetGoal;
  final double baseSpawnInterval;
  final double baseSpeed;
}

const List<SignalPhase> signalPhases = <SignalPhase>[
  SignalPhase(
    rule: SignalRule.tutorial,
    targetGoal: 6,
    baseSpawnInterval: 1.15,
    baseSpeed: 118,
  ),
  SignalPhase(
    rule: SignalRule.color,
    targetGoal: 12,
    baseSpawnInterval: 0.98,
    baseSpeed: 138,
  ),
  SignalPhase(
    rule: SignalRule.shape,
    targetGoal: 14,
    baseSpawnInterval: 0.9,
    baseSpeed: 152,
  ),
  SignalPhase(
    rule: SignalRule.motion,
    targetGoal: 14,
    baseSpawnInterval: 0.9,
    baseSpeed: 158,
  ),
  SignalPhase(
    rule: SignalRule.sequence,
    targetGoal: 12,
    baseSpawnInterval: 0.92,
    baseSpeed: 156,
  ),
  SignalPhase(
    rule: SignalRule.memory,
    targetGoal: 12,
    baseSpawnInterval: 1.0,
    baseSpeed: 150,
  ),
  SignalPhase(
    rule: SignalRule.cue,
    targetGoal: 13,
    baseSpawnInterval: 0.88,
    baseSpeed: 164,
  ),
  SignalPhase(
    rule: SignalRule.reversal,
    targetGoal: 14,
    baseSpawnInterval: 0.86,
    baseSpeed: 168,
  ),
  SignalPhase(
    rule: SignalRule.storm,
    targetGoal: 14,
    baseSpawnInterval: 0.82,
    baseSpeed: 172,
  ),
  SignalPhase(
    rule: SignalRule.boss,
    targetGoal: 18,
    baseSpawnInterval: 0.78,
    baseSpeed: 182,
  ),
];

class SignalObject {
  SignalObject({
    required this.id,
    required this.kind,
    required this.color,
    required this.shape,
    required this.x,
    required this.y,
    required this.radius,
    required this.vx,
    required this.vy,
    required this.spawnedAt,
  });

  final int id;
  final SignalObjectKind kind;
  final Color color;
  final SignalShape shape;
  final double radius;
  final double spawnedAt;
  double x;
  double y;
  double vx;
  double vy;
  double pulse = 0;
  bool alive = true;
}

class SignalParticle {
  SignalParticle({
    required this.x,
    required this.y,
    required this.vx,
    required this.vy,
    required this.life,
    required this.color,
    required this.radius,
  });

  double x;
  double y;
  double vx;
  double vy;
  double life;
  final Color color;
  final double radius;
}

class SignalRunStats {
  const SignalRunStats({
    required this.score,
    required this.levelReached,
    required this.bestCombo,
    required this.accuracy,
    required this.avgReactionMs,
    required this.targetHits,
    required this.mistakes,
    required this.misses,
    required this.difficulty,
  });

  final int score;
  final int levelReached;
  final int bestCombo;
  final double accuracy;
  final int avgReactionMs;
  final int targetHits;
  final int mistakes;
  final int misses;
  final double difficulty;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'score': score,
      'levelReached': levelReached,
      'bestCombo': bestCombo,
      'accuracy': accuracy,
      'avgReactionMs': avgReactionMs,
      'targetHits': targetHits,
      'mistakes': mistakes,
      'misses': misses,
      'difficulty': difficulty,
    };
  }

  factory SignalRunStats.fromJson(Map<String, dynamic> json) {
    return SignalRunStats(
      score: (json['score'] as num?)?.toInt() ?? 0,
      levelReached: (json['levelReached'] as num?)?.toInt() ?? 1,
      bestCombo: (json['bestCombo'] as num?)?.toInt() ?? 0,
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0,
      avgReactionMs: (json['avgReactionMs'] as num?)?.toInt() ?? 0,
      targetHits: (json['targetHits'] as num?)?.toInt() ?? 0,
      mistakes: (json['mistakes'] as num?)?.toInt() ?? 0,
      misses: (json['misses'] as num?)?.toInt() ?? 0,
      difficulty: (json['difficulty'] as num?)?.toDouble() ?? 1,
    );
  }
}

class SignalEngine {
  SignalEngine({required this.random});

  final math.Random random;

  static const int maxLives = 5;
  static const double playerRadius = 26;
  static const int historySize = 24;

  Size boardSize = const Size(400, 650);
  double playerX = 200;
  double playerTargetX = 200;
  double playerY = 560;

  final List<SignalObject> objects = <SignalObject>[];
  final List<SignalParticle> particles = <SignalParticle>[];

  int score = 0;
  int combo = 0;
  int bestCombo = 0;
  int lives = 4;
  int phaseIndex = 0;
  int collectedInPhase = 0;
  int targetHits = 0;
  int mistakes = 0;
  int misses = 0;

  double difficulty = 1;
  double elapsed = 0;
  double nextSpawnAt = 0;
  double nextAdaptAt = 6;
  double cueTimer = 0;
  double flipTimer = 0;
  double bossTimer = 0;
  double bannerTimer = 0;
  String bannerText = '';
  bool running = false;
  bool paused = false;
  bool gameOver = false;
  bool cueVisible = true;
  bool reversed = false;
  int sequenceIndex = 0;
  int bossStep = 0;
  int nextObjectId = 0;

  final List<bool> recentDecisions = <bool>[];
  final List<double> reactionTimes = <double>[];

  SignalPhase get phase => signalPhases[phaseIndex];

  Color get _targetColor {
    switch (phase.rule) {
      case SignalRule.motion:
        return const Color(0xFF2EE6D6);
      case SignalRule.sequence:
        return const <Color>[
          Color(0xFF2EE6D6),
          Color(0xFFFF4FD8),
          Color(0xFFFFC247),
        ][sequenceIndex];
      case SignalRule.tutorial:
      case SignalRule.color:
      case SignalRule.shape:
      case SignalRule.memory:
      case SignalRule.cue:
      case SignalRule.reversal:
      case SignalRule.storm:
      case SignalRule.boss:
        return const Color(0xFF3E8DFF);
    }
  }

  Color get _avoidColor {
    switch (phase.rule) {
      case SignalRule.motion:
        return const Color(0xFFFF6B6B);
      case SignalRule.sequence:
      case SignalRule.tutorial:
      case SignalRule.color:
      case SignalRule.shape:
      case SignalRule.memory:
      case SignalRule.cue:
      case SignalRule.reversal:
      case SignalRule.storm:
      case SignalRule.boss:
        return const Color(0xFFFF5A5F);
    }
  }

  void resize(Size size) {
    boardSize = size;
    playerY = math.max(playerRadius + 2, size.height - 72);
    playerX = playerX.clamp(playerRadius, size.width - playerRadius).toDouble();
    playerTargetX = playerX;
  }

  void setTargetX(double value) {
    playerTargetX = value
        .clamp(
          playerRadius,
          math.max(playerRadius, boardSize.width - playerRadius),
        )
        .toDouble();
  }

  void start() {
    reset();
    running = true;
    showBanner('Catch blue. Let red pass.');
  }

  void reset() {
    objects.clear();
    particles.clear();
    recentDecisions.clear();
    reactionTimes.clear();

    score = 0;
    combo = 0;
    bestCombo = 0;
    lives = 4;
    phaseIndex = 0;
    collectedInPhase = 0;
    targetHits = 0;
    mistakes = 0;
    misses = 0;
    difficulty = 1;
    elapsed = 0;
    nextSpawnAt = 0.2;
    nextAdaptAt = 6;
    cueTimer = 0;
    flipTimer = 0;
    bossTimer = 0;
    bannerTimer = 0;
    bannerText = '';
    running = false;
    paused = false;
    gameOver = false;
    cueVisible = true;
    reversed = false;
    sequenceIndex = 0;
    bossStep = 0;
    nextObjectId = 0;
  }

  void togglePause() {
    if (gameOver) {
      return;
    }
    paused = !paused;
  }

  void showBanner(String text) {
    bannerText = text;
    bannerTimer = 2.2;
  }

  void update(double dt) {
    if (!running || paused || gameOver) {
      return;
    }

    elapsed += dt;
    bannerTimer = math.max(0, bannerTimer - dt);

    _updatePhaseTimer(dt);
    _spawnIfNeeded();
    _updateObjects(dt);
    _updateParticles(dt);
    _checkCollisions();

    final double lerp = math.min(1, dt * 22);
    playerX += (playerTargetX - playerX) * lerp;

    if (elapsed >= nextAdaptAt) {
      _adaptDifficulty();
      nextAdaptAt = elapsed + 7;
    }
  }

  void _updatePhaseTimer(double dt) {
    final SignalRule rule = phase.rule;
    if (rule == SignalRule.memory) {
      cueTimer += dt;
      cueVisible = cueTimer < 1.8;
    } else if (rule == SignalRule.reversal) {
      flipTimer += dt;
      if (flipTimer >= 7) {
        reversed = !reversed;
        flipTimer = 0;
        showBanner(
          reversed ? 'SIGNAL FLIPPED — catch red' : 'Signal reset — catch blue',
        );
      }
    } else if (rule == SignalRule.boss) {
      bossTimer += dt;
      if (bossTimer >= 5.2) {
        bossTimer = 0;
        bossStep = (bossStep + 1) % 4;
        _showBossStep();
      }
    }
  }

  void _showBossStep() {
    switch (bossStep) {
      case 0:
        showBanner('Boss 1 — catch blue');
        break;
      case 1:
        showBanner('Boss 2 — catch blue circles');
        break;
      case 2:
        showBanner('Boss 3 — signal flipped!');
        break;
      case 3:
        showBanner('Boss 4 — follow the sequence');
        break;
    }
  }

  void _spawnIfNeeded() {
    if (elapsed < nextSpawnAt) {
      return;
    }
    spawnObject();
    final double spawnScale = 1.12 - (difficulty * 0.042);
    nextSpawnAt = elapsed + (phase.baseSpawnInterval * spawnScale);
  }

  void spawnObject() {
    final double width = boardSize.width;
    final double margin = 36;
    final double x = margin + random.nextDouble() * (width - margin * 2);
    final double radius = 20 + random.nextDouble() * 6;
    final SignalRule rule = phase.rule;
    final SignalObjectKind kind = _randomKind(rule);
    final Color color = _colorForKind(kind, rule);
    final SignalShape shape = _shapeForRule(rule, kind);
    final double speed = _objectSpeed(rule);
    final double drift = _driftForRule(rule);

    objects.add(
      SignalObject(
        id: nextObjectId++,
        kind: kind,
        color: color,
        shape: shape,
        x: x,
        y: -radius - 8,
        radius: radius,
        vx: drift,
        vy: speed,
        spawnedAt: elapsed,
      ),
    );
  }

  SignalObjectKind _randomKind(SignalRule rule) {
    if (rule == SignalRule.storm) {
      final double roll = random.nextDouble();
      if (roll < 0.36) {
        return SignalObjectKind.target;
      }
      if (roll < 0.56) {
        return SignalObjectKind.avoid;
      }
      return SignalObjectKind.distractor;
    }

    if (rule == SignalRule.sequence) {
      return random.nextDouble() < 0.52
          ? SignalObjectKind.target
          : SignalObjectKind.avoid;
    }

    if (rule == SignalRule.boss) {
      final double roll = random.nextDouble();
      if (roll < 0.38) {
        return SignalObjectKind.target;
      }
      if (roll < 0.64) {
        return SignalObjectKind.avoid;
      }
      return SignalObjectKind.distractor;
    }

    final double roll = random.nextDouble();
    if (rule == SignalRule.tutorial || rule == SignalRule.memory) {
      if (roll < 0.5) {
        return SignalObjectKind.target;
      }
      if (roll < 0.82) {
        return SignalObjectKind.avoid;
      }
      return SignalObjectKind.distractor;
    }

    if (roll < 0.46) {
      return SignalObjectKind.target;
    }
    if (roll < 0.78) {
      return SignalObjectKind.avoid;
    }
    return SignalObjectKind.distractor;
  }

  Color _colorForKind(SignalObjectKind kind, SignalRule rule) {
    final Color target = _targetColor;
    final Color avoid = _avoidColor;
    final Color neutral = const Color(0xFF7C86A8);

    if (rule == SignalRule.shape || rule == SignalRule.storm) {
      if (kind == SignalObjectKind.target) {
        return target;
      }
      if (kind == SignalObjectKind.avoid) {
        return avoid;
      }
      return neutral;
    }

    if (rule == SignalRule.memory) {
      if (kind == SignalObjectKind.target) {
        return target;
      }
      if (kind == SignalObjectKind.avoid) {
        return avoid;
      }
      return neutral;
    }

    if (rule == SignalRule.sequence) {
      final List<Color> sequence = const <Color>[
        Color(0xFF2EE6D6),
        Color(0xFFFF4FD8),
        Color(0xFFFFC247),
      ];
      if (kind == SignalObjectKind.target) {
        return sequence[sequenceIndex];
      }
      return sequence[(sequenceIndex + 1 + random.nextInt(2)) % 3];
    }

    if (rule == SignalRule.cue) {
      if (kind == SignalObjectKind.target) {
        return _cueColor;
      }
      return kind == SignalObjectKind.avoid ? const Color(0xFFFF5A5F) : neutral;
    }

    if (rule == SignalRule.reversal) {
      if (kind == SignalObjectKind.target) {
        return reversed ? avoid : target;
      }
      if (kind == SignalObjectKind.avoid) {
        return reversed ? target : avoid;
      }
      return neutral;
    }

    if (rule == SignalRule.boss) {
      return _bossColor(kind);
    }

    if (kind == SignalObjectKind.target) {
      return target;
    }
    if (kind == SignalObjectKind.avoid) {
      return avoid;
    }
    return neutral;
  }

  Color _bossColor(SignalObjectKind kind) {
    if (bossStep == 3) {
      if (kind == SignalObjectKind.target) {
        return const Color(0xFF2EE6D6);
      }
      if (kind == SignalObjectKind.avoid) {
        return const Color(0xFFFF4FD8);
      }
      return const Color(0xFFFFC247);
    }

    if (bossStep == 0 || bossStep == 2) {
      if (kind == SignalObjectKind.target) {
        return bossStep == 2
            ? const Color(0xFFFF5A5F)
            : const Color(0xFF3E8DFF);
      }
      if (kind == SignalObjectKind.avoid) {
        return bossStep == 2
            ? const Color(0xFF3E8DFF)
            : const Color(0xFFFF5A5F);
      }
      return const Color(0xFF7C86A8);
    }

    if (kind == SignalObjectKind.target) {
      return const Color(0xFF3E8DFF);
    }
    if (kind == SignalObjectKind.avoid) {
      return const Color(0xFFFF5A5F);
    }
    return const Color(0xFF7C86A8);
  }

  SignalShape _shapeForRule(SignalRule rule, SignalObjectKind kind) {
    final List<SignalShape> shapes = SignalShape.values;
    if (rule == SignalRule.shape || rule == SignalRule.storm) {
      if (kind == SignalObjectKind.target) {
        return SignalShape.circle;
      }
      if (kind == SignalObjectKind.avoid) {
        return SignalShape.triangle;
      }
      return shapes[random.nextInt(shapes.length)];
    }

    if (rule == SignalRule.boss) {
      if (bossStep == 1) {
        if (kind == SignalObjectKind.target) {
          return SignalShape.circle;
        }
        if (kind == SignalObjectKind.avoid) {
          return SignalShape.triangle;
        }
      }
      return shapes[random.nextInt(shapes.length)];
    }

    if (rule == SignalRule.tutorial) {
      return kind == SignalObjectKind.target
          ? SignalShape.circle
          : SignalShape.triangle;
    }

    if (rule == SignalRule.memory || rule == SignalRule.sequence) {
      return SignalShape.circle;
    }

    return shapes[random.nextInt(shapes.length)];
  }

  Color get cueColorForUi => _cueColor;

  Color get _cueColor {
    final List<Color> cueColors = const <Color>[
      Color(0xFF3E8DFF),
      Color(0xFF2EE6D6),
      Color(0xFFFF4FD8),
      Color(0xFFFFC247),
    ];
    return cueColors[phaseIndex % cueColors.length];
  }

  double _objectSpeed(SignalRule rule) {
    final double diffBoost = 0.86 + (difficulty * 0.13);
    double stormBoost = 1;
    if (rule == SignalRule.storm) {
      stormBoost = 1.06;
    } else if (rule == SignalRule.boss) {
      stormBoost = 1.1;
    }
    return phase.baseSpeed * diffBoost * stormBoost;
  }

  double _driftForRule(SignalRule rule) {
    if (rule == SignalRule.motion) {
      return (difficulty > 3 ? 48 + difficulty * 5 : 30) *
          (random.nextBool() ? 1 : -1);
    }
    if (rule == SignalRule.storm || rule == SignalRule.boss) {
      return (12 + difficulty * 5) * (random.nextBool() ? 1 : -1);
    }
    return 0;
  }

  void _updateObjects(double dt) {
    for (final SignalObject object in objects) {
      object.pulse += dt * 6;
      object.y += object.vy * dt;
      object.x += object.vx * dt;
      object.x += math.sin(object.pulse * 0.7) * 4 * dt;

      if (object.x < object.radius) {
        object.x = object.radius;
        object.vx = object.vx.abs();
      } else if (object.x > boardSize.width - object.radius) {
        object.x = boardSize.width - object.radius;
        object.vx = -object.vx.abs();
      }
    }

    final List<SignalObject> remaining = <SignalObject>[];
    for (final SignalObject object in objects) {
      if (object.y > boardSize.height + object.radius + 20) {
        _handleExit(object);
        object.alive = false;
      }
      if (object.alive) {
        remaining.add(object);
      }
    }
    objects
      ..clear()
      ..addAll(remaining);
  }

  void _handleExit(SignalObject object) {
    if (object.kind == SignalObjectKind.target) {
      _registerDecision(false, null);
      misses++;
      combo = 0;
      lives--;
      _spawnErrorParticles(object.x, boardSize.height - 22);
      if (lives <= 0) {
        lives = 0;
        gameOver = true;
        running = false;
      }
    } else if (object.kind == SignalObjectKind.avoid) {
      _registerDecision(true, null);
      score += 2;
      _spawnScoreParticles(object.x, boardSize.height - 22, 2);
    }
  }

  void _updateParticles(double dt) {
    for (final SignalParticle particle in particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 170 * dt;
    }
    particles.removeWhere((SignalParticle particle) => particle.life <= 0);
  }

  void _checkCollisions() {
    for (final SignalObject object in objects) {
      if (!object.alive) {
        continue;
      }
      final double dx = object.x - playerX;
      final double dy = object.y - playerY;
      final double distance = math.sqrt(dx * dx + dy * dy);
      if (distance <= object.radius + playerRadius - 4) {
        object.alive = false;
        _handleCollision(object);
      }
    }
    objects.removeWhere((SignalObject object) => !object.alive);
  }

  void _handleCollision(SignalObject object) {
    switch (object.kind) {
      case SignalObjectKind.target:
        final double reaction = math.max(0, elapsed - object.spawnedAt);
        _registerDecision(true, reaction);
        reactionTimes.add(reaction);
        if (reactionTimes.length > 60) {
          reactionTimes.removeAt(0);
        }
        targetHits++;
        collectedInPhase++;
        combo++;
        bestCombo = math.max(bestCombo, combo);
        final int bonus = 10 * combo;
        score += 100 + bonus;
        _spawnScoreParticles(object.x, object.y, 10);
        if (collectedInPhase >= phase.targetGoal) {
          _advancePhase();
        }
        break;
      case SignalObjectKind.avoid:
        _registerDecision(false, null);
        mistakes++;
        combo = 0;
        lives--;
        _spawnErrorParticles(object.x, object.y);
        if (lives <= 0) {
          lives = 0;
          gameOver = true;
          running = false;
        }
        break;
      case SignalObjectKind.distractor:
        combo = math.max(0, combo - 1);
        _spawnNeutralParticles(object.x, object.y);
        break;
    }
  }

  void _advancePhase() {
    collectedInPhase = 0;
    lives = math.min(maxLives, lives + 1);
    sequenceIndex = 0;
    reversed = false;
    flipTimer = 0;
    bossTimer = 0;
    bossStep = 0;
    cueTimer = 0;
    cueVisible = true;

    if (phaseIndex < signalPhases.length - 1) {
      phaseIndex++;
    } else {
      difficulty = math.min(10, difficulty + 0.5);
    }

    showBanner('${phase.rule.title} — ${phase.rule.description}');
  }

  void _adaptDifficulty() {
    if (recentDecisions.length < 6) {
      return;
    }

    final int recentCount = math.min(historySize, recentDecisions.length);
    final List<bool> recent = recentDecisions.sublist(
      recentDecisions.length - recentCount,
    );
    final double accuracy =
        recent.where((bool decision) => decision).length / recent.length;

    if (accuracy >= 0.82) {
      difficulty = math.min(10, difficulty + 0.6);
    } else if (accuracy <= 0.5) {
      difficulty = math.max(1, difficulty - 0.8);
    } else {
      difficulty = math.min(10, difficulty + 0.18);
    }
  }

  void _registerDecision(bool success, double? reaction) {
    recentDecisions.add(success);
    if (recentDecisions.length > historySize) {
      recentDecisions.removeAt(0);
    }
  }

  void _spawnScoreParticles(double x, double y, int count) {
    for (int i = 0; i < count; i++) {
      final double angle = random.nextDouble() * math.pi * 2;
      final double speed = 40 + random.nextDouble() * 130;
      particles.add(
        SignalParticle(
          x: x,
          y: y,
          vx: math.cos(angle) * speed,
          vy: math.sin(angle) * speed - 30,
          life: 0.45 + random.nextDouble() * 0.4,
          color: i.isEven ? const Color(0xFF2EE6D6) : const Color(0xFF8A7BFF),
          radius: 2 + random.nextDouble() * 3,
        ),
      );
    }
  }

  void _spawnErrorParticles(double x, double y) {
    for (int i = 0; i < 14; i++) {
      final double angle = random.nextDouble() * math.pi * 2;
      final double speed = 70 + random.nextDouble() * 130;
      particles.add(
        SignalParticle(
          x: x,
          y: y,
          vx: math.cos(angle) * speed,
          vy: math.sin(angle) * speed - 40,
          life: 0.4 + random.nextDouble() * 0.4,
          color: const Color(0xFFFF5A5F),
          radius: 2 + random.nextDouble() * 3.5,
        ),
      );
    }
  }

  void _spawnNeutralParticles(double x, double y) {
    for (int i = 0; i < 6; i++) {
      particles.add(
        SignalParticle(
          x: x,
          y: y,
          vx: (random.nextDouble() - 0.5) * 120,
          vy: (random.nextDouble() - 0.5) * 120,
          life: 0.3 + random.nextDouble() * 0.25,
          color: const Color(0xFF7C86A8),
          radius: 1.5 + random.nextDouble() * 2.5,
        ),
      );
    }
  }

  double get accuracy {
    if (recentDecisions.isEmpty) {
      return 1;
    }
    return recentDecisions.where((bool decision) => decision).length /
        recentDecisions.length;
  }

  int get averageReactionMs {
    if (reactionTimes.isEmpty) {
      return 0;
    }
    final double sum = reactionTimes.fold<double>(
      0,
      (double previous, double value) => previous + value,
    );
    return (sum / reactionTimes.length * 1000).round();
  }

  SignalRunStats get runStats => SignalRunStats(
    score: score,
    levelReached: phaseIndex + 1,
    bestCombo: bestCombo,
    accuracy: accuracy,
    avgReactionMs: averageReactionMs,
    targetHits: targetHits,
    mistakes: mistakes,
    misses: misses,
    difficulty: difficulty,
  );
}
