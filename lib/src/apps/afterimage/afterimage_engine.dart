import 'dart:math';
import 'dart:ui';

enum AfterimagePhase { ready, playing, caught, loopTransition, missionComplete }

enum AfterimageEventKind {
  dash,
  pulse,
  hack,
  core,
  relic,
  caught,
  rewind,
  escaped,
}

class AfterimageEvent {
  const AfterimageEvent(this.kind, {this.position});

  final AfterimageEventKind kind;
  final Offset? position;
}

class AfterimageEffect {
  AfterimageEffect(this.kind, this.position, {this.life = 0.7});

  final AfterimageEventKind kind;
  final Offset position;
  final double life;
  double age = 0;

  double get progress => (age / life).clamp(0, 1);
}

class ReplayFrame {
  const ReplayFrame({
    required this.time,
    required this.position,
    required this.moving,
    required this.acting,
    required this.pulsed,
    required this.dashing,
  });

  final double time;
  final Offset position;
  final bool moving;
  final bool acting;
  final bool pulsed;
  final bool dashing;
}

class EchoTrack {
  const EchoTrack(this.frames, this.colorIndex);

  final List<ReplayFrame> frames;
  final int colorIndex;

  ReplayFrame sample(double time) {
    if (frames.length == 1 || time <= frames.first.time) {
      return frames.first;
    }
    if (time >= frames.last.time) {
      return frames.last;
    }
    int low = 0;
    int high = frames.length - 1;
    while (low + 1 < high) {
      final int middle = (low + high) ~/ 2;
      if (frames[middle].time <= time) {
        low = middle;
      } else {
        high = middle;
      }
    }
    final ReplayFrame before = frames[low];
    final ReplayFrame after = frames[high];
    final double span = after.time - before.time;
    final double amount = span <= 0 ? 0 : (time - before.time) / span;
    return ReplayFrame(
      time: time,
      position: Offset.lerp(before.position, after.position, amount)!,
      moving: before.moving || after.moving,
      acting: before.acting,
      pulsed: before.pulsed,
      dashing: before.dashing || after.dashing,
    );
  }
}

class AfterimageGuard {
  AfterimageGuard({required this.start, required this.end, this.speed = 48})
    : position = start;

  final Offset start;
  final Offset end;
  final double speed;
  Offset position;
  double direction = 1;
  Offset? investigateTarget;
  double investigateTime = 0;
  double facing = 0;

  void reset() {
    position = start;
    direction = 1;
    investigateTarget = null;
    investigateTime = 0;
    facing = atan2(end.dy - start.dy, end.dx - start.dx);
  }
}

class AfterimageLayout {
  const AfterimageLayout({
    required this.walls,
    required this.plate,
    required this.console,
    required this.core,
    required this.relic,
    required this.exit,
    required this.guards,
    required this.variant,
  });

  final List<Rect> walls;
  final Offset plate;
  final Offset console;
  final Offset core;
  final Offset relic;
  final Offset exit;
  final List<AfterimageGuard> guards;
  final int variant;
}

class AfterimageEngine {
  AfterimageEngine({int? seed})
    : _seed = seed ?? DateTime.now().microsecondsSinceEpoch {
    _random = Random(_seed);
    layout = _makeLayout(1);
    _resetActors();
  }

  static const double worldWidth = 400;
  static const double worldHeight = 680;
  static const double playerRadius = 11;
  static const int maxEchoes = 4;

  final int _seed;
  late Random _random;
  late AfterimageLayout layout;
  final List<EchoTrack> echoes = <EchoTrack>[];
  final List<ReplayFrame> _recording = <ReplayFrame>[];
  final List<AfterimageEvent> _events = <AfterimageEvent>[];
  final List<AfterimageEffect> effects = <AfterimageEffect>[];

  AfterimagePhase phase = AfterimagePhase.ready;
  Offset playerPosition = const Offset(200, 620);
  Offset moveInput = Offset.zero;
  double loopTime = 0;
  double loopDuration = 18;
  double hackProgress = 0;
  double detection = 0;
  double dashCooldown = 0;
  double shake = 0;
  int level = 1;
  int score = 0;
  int completedVaults = 0;
  int loopsUsed = 0;
  bool actHeld = false;
  bool plateActive = false;
  bool gateOpen = false;
  bool carryingCore = false;
  bool relicCollected = false;
  bool pulseAvailable = true;
  bool _dashRequested = false;
  bool _pulseRequested = false;
  bool _rewindRequested = false;
  bool _pulsedThisFrame = false;
  bool _dashedThisFrame = false;
  bool _hackEventSent = false;
  double _transitionTime = 0;
  double _recordTime = 0;
  String transitionMessage = '';

  double get remainingTime => max(0, loopDuration - loopTime);

  double get missionProgress {
    if (carryingCore) {
      return 1;
    }
    if (gateOpen) {
      return 0.72;
    }
    if (hackProgress > 0) {
      return 0.35 + hackProgress * 0.35;
    }
    return plateActive ? 0.22 : 0;
  }

  Rect get gateRect => const Rect.fromLTRB(158, 137, 242, 158);

  String get guidance {
    if (phase == AfterimagePhase.caught) {
      return transitionMessage;
    }
    if (phase == AfterimagePhase.loopTransition) {
      return 'Echo ${echoes.length} recorded';
    }
    if (carryingCore) {
      return 'Get the core to extraction';
    }
    if (gateOpen) {
      return 'Vault open — take the core';
    }
    if (!plateActive && echoes.isEmpty) {
      return 'Stand on the plate, then rewind';
    }
    if (!plateActive) {
      return 'Your echo must reach the plate';
    }
    if (hackProgress < 1) {
      return 'Hold ACT at the console';
    }
    return 'Move';
  }

  void start() {
    phase = AfterimagePhase.playing;
    level = 1;
    score = 0;
    completedVaults = 0;
    loopsUsed = 0;
    echoes.clear();
    layout = _makeLayout(level);
    _resetLoop();
  }

  void setMove(Offset value) {
    moveInput = value.distance > 1 ? value / value.distance : value;
  }

  void setAct(bool value) => actHeld = value;

  void requestDash() => _dashRequested = true;

  void requestPulse() => _pulseRequested = true;

  void requestRewind() => _rewindRequested = true;

  void nextMission() {
    level++;
    completedVaults++;
    loopsUsed = 0;
    echoes.clear();
    layout = _makeLayout(level);
    loopDuration = max(13, 18 - (level - 1) * 0.55);
    phase = AfterimagePhase.playing;
    _resetLoop();
  }

  List<AfterimageEvent> drainEvents() {
    final List<AfterimageEvent> result = List<AfterimageEvent>.of(_events);
    _events.clear();
    return result;
  }

  List<ReplayFrame> get echoStates => <ReplayFrame>[
    for (final EchoTrack echo in echoes) echo.sample(loopTime),
  ];

  void tick(double deltaSeconds) {
    final double dt = deltaSeconds.clamp(0, 0.04);
    if (dt <= 0 ||
        phase == AfterimagePhase.ready ||
        phase == AfterimagePhase.missionComplete) {
      return;
    }
    for (final AfterimageEffect effect in effects) {
      effect.age += dt;
    }
    effects.removeWhere((AfterimageEffect effect) => effect.age >= effect.life);
    shake = max(0, shake - dt * 5);

    if (phase == AfterimagePhase.caught ||
        phase == AfterimagePhase.loopTransition) {
      _transitionTime -= dt;
      if (_transitionTime <= 0) {
        _beginNextLoop();
      }
      return;
    }

    loopTime += dt;
    dashCooldown = max(0, dashCooldown - dt);
    _pulsedThisFrame = false;
    _dashedThisFrame = false;

    _handleMovement(dt);
    _handlePulse();
    _updateInteractions(dt);
    _updateGuards(dt);
    _recordFrame(dt);

    if (_rewindRequested) {
      _rewindRequested = false;
      _bankLoop('Manual rewind', AfterimageEventKind.rewind);
      return;
    }
    if (loopTime >= loopDuration) {
      _bankLoop('Time folded', AfterimageEventKind.rewind);
    }
  }

  void _handleMovement(double dt) {
    final double speed = carryingCore ? 78 : 108;
    final bool moving = moveInput.distance > 0.08;
    if (moving) {
      _moveActor(moveInput * speed * dt);
    }
    if (_dashRequested) {
      _dashRequested = false;
      if (dashCooldown <= 0 && !carryingCore && moving) {
        final Offset before = playerPosition;
        for (int step = 0; step < 5; step++) {
          _moveActor(moveInput * 13);
        }
        if ((playerPosition - before).distance > 4) {
          dashCooldown = 1.05;
          _dashedThisFrame = true;
          shake = max(shake, 0.28);
          effects.add(AfterimageEffect(AfterimageEventKind.dash, before));
          _events.add(
            AfterimageEvent(AfterimageEventKind.dash, position: before),
          );
        }
      }
    }
  }

  void _moveActor(Offset delta) {
    Offset candidate = Offset(
      (playerPosition.dx + delta.dx).clamp(
        playerRadius,
        worldWidth - playerRadius,
      ),
      playerPosition.dy,
    );
    if (!_collides(candidate)) {
      playerPosition = candidate;
    }
    candidate = Offset(
      playerPosition.dx,
      (playerPosition.dy + delta.dy).clamp(
        playerRadius,
        worldHeight - playerRadius,
      ),
    );
    if (!_collides(candidate)) {
      playerPosition = candidate;
    }
  }

  bool _collides(Offset center) {
    final Rect actor = Rect.fromCircle(center: center, radius: playerRadius);
    if (!gateOpen && actor.overlaps(gateRect)) {
      return true;
    }
    return layout.walls.any((Rect wall) => wall.inflate(2).overlaps(actor));
  }

  void _handlePulse() {
    if (!_pulseRequested) {
      return;
    }
    _pulseRequested = false;
    if (!pulseAvailable) {
      return;
    }
    pulseAvailable = false;
    _pulsedThisFrame = true;
    _makeNoise(playerPosition);
    effects.add(
      AfterimageEffect(AfterimageEventKind.pulse, playerPosition, life: 1),
    );
    _events.add(
      AfterimageEvent(AfterimageEventKind.pulse, position: playerPosition),
    );
  }

  void _makeNoise(Offset position) {
    for (final AfterimageGuard guard in layout.guards) {
      guard
        ..investigateTarget = position
        ..investigateTime = 2.4;
    }
  }

  void _updateInteractions(double dt) {
    final List<ReplayFrame> replay = echoStates;
    plateActive =
        (playerPosition - layout.plate).distance < 24 ||
        replay.any(
          (ReplayFrame frame) => (frame.position - layout.plate).distance < 24,
        );

    bool echoActingAtConsole = false;
    for (int index = 0; index < replay.length; index++) {
      final ReplayFrame frame = replay[index];
      echoActingAtConsole |=
          frame.acting && (frame.position - layout.console).distance < 27;
      if (frame.pulsed) {
        _makeNoise(frame.position);
      }
    }
    final bool playerAtConsole =
        actHeld && (playerPosition - layout.console).distance < 27;
    if (plateActive && (playerAtConsole || echoActingAtConsole)) {
      hackProgress = min(1, hackProgress + dt * 0.72);
    } else if (!gateOpen) {
      hackProgress = max(0, hackProgress - dt * 0.14);
    }
    if (hackProgress >= 1) {
      gateOpen = true;
      if (!_hackEventSent) {
        _hackEventSent = true;
        score += 150;
        effects.add(AfterimageEffect(AfterimageEventKind.hack, layout.console));
        _events.add(
          AfterimageEvent(AfterimageEventKind.hack, position: layout.console),
        );
      }
    }

    if (actHeld &&
        gateOpen &&
        !carryingCore &&
        (playerPosition - layout.core).distance < 28) {
      carryingCore = true;
      score += 300;
      shake = 0.45;
      effects.add(
        AfterimageEffect(AfterimageEventKind.core, layout.core, life: 1.2),
      );
      _events.add(
        AfterimageEvent(AfterimageEventKind.core, position: layout.core),
      );
    }
    if (actHeld &&
        !relicCollected &&
        (playerPosition - layout.relic).distance < 25) {
      relicCollected = true;
      score += 225;
      effects.add(AfterimageEffect(AfterimageEventKind.relic, layout.relic));
      _events.add(
        AfterimageEvent(AfterimageEventKind.relic, position: layout.relic),
      );
    }
    if (carryingCore && (playerPosition - layout.exit).distance < 30) {
      final int timeBonus = remainingTime.ceil() * 20;
      final int loopBonus = max(0, maxEchoes - echoes.length) * 160;
      score += 700 + timeBonus + loopBonus;
      phase = AfterimagePhase.missionComplete;
      shake = 0.7;
      effects.add(
        AfterimageEffect(AfterimageEventKind.escaped, layout.exit, life: 1.4),
      );
      _events.add(
        AfterimageEvent(AfterimageEventKind.escaped, position: layout.exit),
      );
    }
  }

  void _updateGuards(double dt) {
    for (final AfterimageGuard guard in layout.guards) {
      Offset target;
      if (guard.investigateTarget != null && guard.investigateTime > 0) {
        guard.investigateTime -= dt;
        target = guard.investigateTarget!;
        if ((guard.position - target).distance < 8 ||
            guard.investigateTime <= 0) {
          guard.investigateTarget = null;
        }
      } else {
        target = guard.direction > 0 ? guard.end : guard.start;
        if ((guard.position - target).distance < 6) {
          guard.direction *= -1;
          target = guard.direction > 0 ? guard.end : guard.start;
        }
      }
      final Offset delta = target - guard.position;
      if (delta.distance > 0.5) {
        final Offset direction = delta / delta.distance;
        guard.facing = atan2(direction.dy, direction.dx);
        guard.position += direction * guard.speed * dt;
      }

      final Offset toPlayer = playerPosition - guard.position;
      final double distance = toPlayer.distance;
      final double angle = atan2(toPlayer.dy, toPlayer.dx);
      final double angleError = _angleDistance(angle, guard.facing);
      final bool seen =
          distance < 135 &&
          angleError < 0.48 &&
          _hasLineOfSight(guard.position, playerPosition);
      if (seen) {
        detection = min(1, detection + dt * (distance < 55 ? 2.1 : 1.25));
      }
      if (distance < 18) {
        detection = 1;
      }
    }
    final bool anySeeing = layout.guards.any((AfterimageGuard guard) {
      final Offset toPlayer = playerPosition - guard.position;
      return toPlayer.distance < 135 &&
          _angleDistance(atan2(toPlayer.dy, toPlayer.dx), guard.facing) <
              0.48 &&
          _hasLineOfSight(guard.position, playerPosition);
    });
    if (!anySeeing) {
      detection = max(0, detection - dt * 0.72);
    }
    if (detection >= 1) {
      _caught();
    }
  }

  bool _hasLineOfSight(Offset from, Offset to) {
    for (int index = 1; index < 14; index++) {
      final Offset point = Offset.lerp(from, to, index / 14)!;
      if (layout.walls.any((Rect wall) => wall.contains(point)) ||
          (!gateOpen && gateRect.contains(point))) {
        return false;
      }
    }
    return true;
  }

  void _recordFrame(double dt) {
    _recordTime += dt;
    if (_recordTime < 0.045 && !_pulsedThisFrame && !_dashedThisFrame) {
      return;
    }
    _recordTime = 0;
    _recording.add(
      ReplayFrame(
        time: loopTime,
        position: playerPosition,
        moving: moveInput.distance > 0.08,
        acting: actHeld,
        pulsed: _pulsedThisFrame,
        dashing: _dashedThisFrame,
      ),
    );
  }

  void _caught() {
    if (phase != AfterimagePhase.playing) {
      return;
    }
    transitionMessage = 'Spotted — the loop learned from it';
    phase = AfterimagePhase.caught;
    _transitionTime = 0.72;
    shake = 1;
    effects.add(
      AfterimageEffect(AfterimageEventKind.caught, playerPosition, life: 0.9),
    );
    _events.add(
      AfterimageEvent(AfterimageEventKind.caught, position: playerPosition),
    );
    _storeEcho();
  }

  void _bankLoop(String message, AfterimageEventKind event) {
    if (phase != AfterimagePhase.playing) {
      return;
    }
    transitionMessage = message;
    phase = AfterimagePhase.loopTransition;
    _transitionTime = 0.58;
    _events.add(AfterimageEvent(event, position: playerPosition));
    _storeEcho();
  }

  void _storeEcho() {
    if (_recording.isEmpty) {
      _recording.add(
        ReplayFrame(
          time: 0,
          position: playerPosition,
          moving: false,
          acting: actHeld,
          pulsed: false,
          dashing: false,
        ),
      );
    }
    if (echoes.length == maxEchoes) {
      echoes.removeAt(0);
    }
    echoes.add(EchoTrack(List<ReplayFrame>.of(_recording), loopsUsed % 4));
    loopsUsed++;
  }

  void _beginNextLoop() {
    phase = AfterimagePhase.playing;
    _resetLoop();
  }

  void _resetLoop() {
    _resetActors();
    loopTime = 0;
    hackProgress = 0;
    detection = 0;
    dashCooldown = 0;
    plateActive = false;
    gateOpen = false;
    carryingCore = false;
    relicCollected = false;
    pulseAvailable = true;
    actHeld = false;
    moveInput = Offset.zero;
    _dashRequested = false;
    _pulseRequested = false;
    _rewindRequested = false;
    _pulsedThisFrame = false;
    _dashedThisFrame = false;
    _hackEventSent = false;
    _recordTime = 0;
    _recording
      ..clear()
      ..add(
        ReplayFrame(
          time: 0,
          position: playerPosition,
          moving: false,
          acting: false,
          pulsed: false,
          dashing: false,
        ),
      );
    for (final AfterimageGuard guard in layout.guards) {
      guard.reset();
    }
  }

  void _resetActors() {
    playerPosition = layout.exit;
  }

  AfterimageLayout _makeLayout(int mission) {
    _random = Random(_seed + mission * 7919);
    final int variant = (mission - 1) % 3;
    final bool flipped = _random.nextBool();
    final Offset plate = Offset(flipped ? 86 : 314, variant == 1 ? 360 : 315);
    final Offset console = Offset(flipped ? 314 : 86, variant == 2 ? 270 : 350);
    final List<Rect> walls = switch (variant) {
      0 => const <Rect>[
        Rect.fromLTRB(22, 228, 150, 252),
        Rect.fromLTRB(250, 228, 378, 252),
        Rect.fromLTRB(112, 448, 286, 472),
      ],
      1 => const <Rect>[
        Rect.fromLTRB(70, 205, 94, 390),
        Rect.fromLTRB(306, 205, 330, 390),
        Rect.fromLTRB(150, 475, 378, 499),
      ],
      _ => const <Rect>[
        Rect.fromLTRB(22, 260, 175, 284),
        Rect.fromLTRB(225, 260, 378, 284),
        Rect.fromLTRB(22, 440, 145, 464),
        Rect.fromLTRB(255, 440, 378, 464),
      ],
    };
    final List<AfterimageGuard> guards = <AfterimageGuard>[
      AfterimageGuard(
        start: Offset(flipped ? 320 : 80, 185),
        end: Offset(flipped ? 80 : 320, 185),
        speed: 44 + min(mission, 7) * 2,
      ),
      if (mission >= 2)
        AfterimageGuard(
          start: const Offset(105, 520),
          end: const Offset(305, 520),
          speed: 42 + min(mission, 6) * 1.5,
        ),
    ];
    return AfterimageLayout(
      walls: walls,
      plate: plate,
      console: console,
      core: const Offset(200, 82),
      relic: Offset(flipped ? 350 : 50, variant == 1 ? 560 : 205),
      exit: const Offset(200, 625),
      guards: guards,
      variant: variant,
    );
  }

  static double _angleDistance(double a, double b) {
    double difference = (a - b) % (pi * 2);
    if (difference > pi) {
      difference -= pi * 2;
    }
    if (difference < -pi) {
      difference += pi * 2;
    }
    return difference.abs();
  }
}
