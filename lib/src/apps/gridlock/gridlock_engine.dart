import 'dart:math';

enum GridlockPhase { idle, getReady, showing, input, roundWon, gameOver }

enum GridlockEndReason { wrongTile, timeout }

class GridlockEngine {
  GridlockEngine({int? seed}) : _random = Random(seed);

  static const int gridSize = 4;
  static const int tileCount = gridSize * gridSize;
  static const double responseSeconds = 3;
  static const double readySeconds = 0.8;
  static const double flashSeconds = 0.46;
  static const double gapSeconds = 0.14;
  static const double roundWonSeconds = 0.7;

  final Random _random;
  final List<int> path = <int>[];

  GridlockPhase phase = GridlockPhase.idle;
  GridlockEndReason? endReason;
  bool decoysEnabled = false;
  int inputIndex = 0;
  int showIndex = 0;
  int? activeTile;
  int? decoyTile;
  int score = 0;
  int roundsCompleted = 0;
  double responseRemaining = responseSeconds;
  double elapsedSeconds = 0;
  double _phaseTime = 0;
  bool _flashOn = false;

  int get level => max(1, path.length - 2);

  double get responseProgress =>
      (responseRemaining / responseSeconds).clamp(0, 1);

  String get instruction => switch (phase) {
    GridlockPhase.idle => 'Ready when you are',
    GridlockPhase.getReady => 'Get ready',
    GridlockPhase.showing => 'Watch the route',
    GridlockPhase.input => 'Repeat it',
    GridlockPhase.roundWon => 'Route locked',
    GridlockPhase.gameOver =>
      endReason == GridlockEndReason.timeout ? 'Time expired' : 'Wrong turn',
  };

  void start({required bool withDecoys}) {
    decoysEnabled = withDecoys;
    path
      ..clear()
      ..add(_random.nextInt(tileCount));
    _appendStep();
    _appendStep();
    score = 0;
    roundsCompleted = 0;
    elapsedSeconds = 0;
    endReason = null;
    _beginReady();
  }

  void tick(double deltaSeconds) {
    if (phase == GridlockPhase.idle || phase == GridlockPhase.gameOver) {
      return;
    }
    final double dt = deltaSeconds.clamp(0, 0.05);
    elapsedSeconds += dt;
    _phaseTime += dt;

    switch (phase) {
      case GridlockPhase.idle:
      case GridlockPhase.gameOver:
        return;
      case GridlockPhase.getReady:
        if (_phaseTime >= readySeconds) {
          _beginShowing();
        }
      case GridlockPhase.showing:
        _tickShowing();
      case GridlockPhase.input:
        responseRemaining -= dt;
        if (responseRemaining <= 0) {
          responseRemaining = 0;
          endReason = GridlockEndReason.timeout;
          phase = GridlockPhase.gameOver;
        }
      case GridlockPhase.roundWon:
        if (_phaseTime >= roundWonSeconds) {
          _appendStep();
          _beginReady();
        }
    }
  }

  bool tapTile(int tile) {
    if (phase != GridlockPhase.input || tile < 0 || tile >= tileCount) {
      return false;
    }
    if (tile != path[inputIndex]) {
      endReason = GridlockEndReason.wrongTile;
      phase = GridlockPhase.gameOver;
      activeTile = tile;
      return false;
    }

    inputIndex++;
    activeTile = tile;
    responseRemaining = responseSeconds;
    score += 18 + path.length * 4 + (decoysEnabled ? 12 : 0);
    if (inputIndex == path.length) {
      roundsCompleted++;
      score += 80 + path.length * 20 + (decoysEnabled ? 75 : 0);
      phase = GridlockPhase.roundWon;
      _phaseTime = 0;
      decoyTile = null;
    }
    return true;
  }

  void returnToIdle() {
    phase = GridlockPhase.idle;
    activeTile = null;
    decoyTile = null;
  }

  void _beginReady() {
    phase = GridlockPhase.getReady;
    _phaseTime = 0;
    inputIndex = 0;
    showIndex = 0;
    activeTile = null;
    decoyTile = null;
    responseRemaining = responseSeconds;
  }

  void _beginShowing() {
    phase = GridlockPhase.showing;
    _phaseTime = 0;
    showIndex = 0;
    _setFlash(true);
  }

  void _tickShowing() {
    if (_flashOn && _phaseTime >= flashSeconds) {
      _phaseTime -= flashSeconds;
      _setFlash(false);
      return;
    }
    if (!_flashOn && _phaseTime >= gapSeconds) {
      _phaseTime -= gapSeconds;
      showIndex++;
      if (showIndex >= path.length) {
        phase = GridlockPhase.input;
        inputIndex = 0;
        activeTile = null;
        decoyTile = null;
        responseRemaining = responseSeconds;
      } else {
        _setFlash(true);
      }
    }
  }

  void _setFlash(bool value) {
    _flashOn = value;
    if (!value) {
      activeTile = null;
      decoyTile = null;
      return;
    }
    activeTile = path[showIndex];
    decoyTile = decoysEnabled ? _chooseDecoy(activeTile!) : null;
  }

  void _appendStep() {
    final int current = path.last;
    final List<int> choices = neighborsOf(current);
    if (path.length > 1 && choices.length > 1) {
      choices.remove(path[path.length - 2]);
    }
    path.add(choices[_random.nextInt(choices.length)]);
  }

  int _chooseDecoy(int correctTile) {
    final List<int> choices = <int>[
      for (int tile = 0; tile < tileCount; tile++)
        if (tile != correctTile) tile,
    ];
    return choices[_random.nextInt(choices.length)];
  }

  static List<int> neighborsOf(int tile) {
    final int row = tile ~/ gridSize;
    final int column = tile % gridSize;
    return <int>[
      if (row > 0) tile - gridSize,
      if (column < gridSize - 1) tile + 1,
      if (row < gridSize - 1) tile + gridSize,
      if (column > 0) tile - 1,
    ];
  }
}
