import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../screens/app_scaffold.dart';

enum _MathsOperation { addition, subtraction, multiplication, division }

extension on _MathsOperation {
  String get symbol {
    switch (this) {
      case _MathsOperation.addition:
        return '+';
      case _MathsOperation.subtraction:
        return '−';
      case _MathsOperation.multiplication:
        return '×';
      case _MathsOperation.division:
        return '÷';
    }
  }

  String get label {
    switch (this) {
      case _MathsOperation.addition:
        return 'Addition';
      case _MathsOperation.subtraction:
        return 'Subtraction';
      case _MathsOperation.multiplication:
        return 'Multiplication';
      case _MathsOperation.division:
        return 'Division';
    }
  }
}

enum _MathsDifficulty { easy, medium, hard }

extension on _MathsDifficulty {
  String get label {
    switch (this) {
      case _MathsDifficulty.easy:
        return 'Easy';
      case _MathsDifficulty.medium:
        return 'Medium';
      case _MathsDifficulty.hard:
        return 'Hard';
    }
  }
}

enum _MathsMode { count, timed }

extension on _MathsMode {
  String get label {
    switch (this) {
      case _MathsMode.count:
        return 'Question count';
      case _MathsMode.timed:
        return 'Time trial';
    }
  }
}

class _MathsPreferences {
  const _MathsPreferences({
    required this.enabledOperations,
    required this.enabledDifficulties,
    required this.targetCount,
    required this.timedSeconds,
    required this.bestTimes,
    required this.bestScores,
  });

  final Set<_MathsOperation> enabledOperations;
  final Set<_MathsDifficulty> enabledDifficulties;
  final int targetCount;
  final int timedSeconds;
  final Map<String, int> bestTimes;
  final Map<String, int> bestScores;

  factory _MathsPreferences.fromJson(Map<String, dynamic> json) {
    final List<String> rawOperations =
        (json['enabledOperations'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<String>()
            .toList();
    final Set<_MathsOperation> operations = _MathsOperation.values
        .where(
          (_MathsOperation operation) => rawOperations.contains(operation.name),
        )
        .toSet();
    final List<String> rawDifficulties =
        (json['enabledDifficulties'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<String>()
            .toList();
    final Set<_MathsDifficulty> difficulties = _MathsDifficulty.values
        .where(
          (_MathsDifficulty difficulty) =>
              rawDifficulties.contains(difficulty.name),
        )
        .toSet();

    return _MathsPreferences(
      enabledOperations: operations.isEmpty
          ? _MathsOperation.values.toSet()
          : operations,
      enabledDifficulties: difficulties.isEmpty
          ? _MathsDifficulty.values.toSet()
          : difficulties,
      targetCount: (json['targetCount'] as num?)?.toInt() ?? 10,
      timedSeconds: (json['timedSeconds'] as num?)?.toInt() ?? 60,
      bestTimes: _readIntMap(json['bestTimes']),
      bestScores: _readIntMap(json['bestScores']),
    );
  }

  static Map<String, int> _readIntMap(Object? value) {
    if (value is! Map<String, dynamic>) {
      return <String, int>{};
    }

    return value.map(
      (String key, dynamic rawValue) =>
          MapEntry<String, int>(key, (rawValue as num?)?.toInt() ?? 0),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'enabledOperations': enabledOperations.map((e) => e.name).toList(),
      'enabledDifficulties': enabledDifficulties.map((e) => e.name).toList(),
      'targetCount': targetCount,
      'timedSeconds': timedSeconds,
      'bestTimes': bestTimes,
      'bestScores': bestScores,
    };
  }
}

class _MathsProblem {
  const _MathsProblem({required this.question, required this.answer});

  final String question;
  final int answer;
}

class MathsApp extends StatefulWidget {
  const MathsApp({super.key});

  @override
  State<MathsApp> createState() => _MathsAppState();
}

class _MathsAppState extends State<MathsApp> {
  static const String _preferencesKey = 'maths_v1';
  static const List<int> _countOptions = <int>[5, 10, 20, 50];
  static const List<int> _timeOptions = <int>[30, 60, 120, 300];

  final Random _random = Random();
  final TextEditingController _answerController = TextEditingController();
  Timer? _timer;

  _MathsPreferences _preferences = const _MathsPreferences(
    enabledOperations: <_MathsOperation>{
      _MathsOperation.addition,
      _MathsOperation.subtraction,
      _MathsOperation.multiplication,
      _MathsOperation.division,
    },
    enabledDifficulties: <_MathsDifficulty>{
      _MathsDifficulty.easy,
      _MathsDifficulty.medium,
      _MathsDifficulty.hard,
    },
    targetCount: 10,
    timedSeconds: 60,
    bestTimes: <String, int>{},
    bestScores: <String, int>{},
  );

  bool _loaded = false;
  _MathsMode _mode = _MathsMode.count;
  bool _playing = false;
  _MathsProblem? _problem;
  int _correctCount = 0;
  int _elapsedSeconds = 0;
  int _remainingSeconds = 0;
  int _problemSeconds = 0;
  String? _lastResultMessage;
  bool _lastResultIsNewBest = false;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _answerController.dispose();
    super.dispose();
  }

  String get _operationsKey {
    final List<String> operations =
        _preferences.enabledOperations.map((e) => e.name).toList()..sort();
    return operations.join('-');
  }

  String get _difficultiesKey {
    final List<String> difficulties =
        _preferences.enabledDifficulties.map((e) => e.name).toList()..sort();
    return difficulties.join('-');
  }

  String get _countKey =>
      'count:$_operationsKey:$_difficultiesKey:${_preferences.targetCount}';

  String get _timedKey =>
      'timed:$_operationsKey:$_difficultiesKey:${_preferences.timedSeconds}';

  Future<void> _loadPreferences() async {
    final SharedPreferences sharedPreferences =
        await SharedPreferences.getInstance();
    final String? raw = sharedPreferences.getString(_preferencesKey);
    if (raw != null) {
      try {
        final Map<String, dynamic> decoded =
            jsonDecode(raw) as Map<String, dynamic>;
        _preferences = _MathsPreferences.fromJson(decoded);
      } on FormatException {
        // Keep defaults if the stored value is malformed.
      }
    }

    if (mounted) {
      setState(() => _loaded = true);
    }
  }

  Future<void> _savePreferences() async {
    final SharedPreferences sharedPreferences =
        await SharedPreferences.getInstance();
    await sharedPreferences.setString(
      _preferencesKey,
      jsonEncode(_preferences.toJson()),
    );
  }

  void _setOperation(_MathsOperation operation, bool enabled) {
    setState(() {
      if (enabled) {
        _preferences = _MathsPreferences(
          enabledOperations: <_MathsOperation>{
            ..._preferences.enabledOperations,
            operation,
          },
          enabledDifficulties: _preferences.enabledDifficulties,
          targetCount: _preferences.targetCount,
          timedSeconds: _preferences.timedSeconds,
          bestTimes: _preferences.bestTimes,
          bestScores: _preferences.bestScores,
        );
      } else {
        _preferences = _MathsPreferences(
          enabledOperations: <_MathsOperation>{
            ..._preferences.enabledOperations,
          }..remove(operation),
          enabledDifficulties: _preferences.enabledDifficulties,
          targetCount: _preferences.targetCount,
          timedSeconds: _preferences.timedSeconds,
          bestTimes: _preferences.bestTimes,
          bestScores: _preferences.bestScores,
        );
      }
    });
    _savePreferences();
  }

  void _setDifficulty(_MathsDifficulty difficulty, bool enabled) {
    setState(() {
      if (enabled) {
        _preferences = _MathsPreferences(
          enabledOperations: _preferences.enabledOperations,
          enabledDifficulties: <_MathsDifficulty>{
            ..._preferences.enabledDifficulties,
            difficulty,
          },
          targetCount: _preferences.targetCount,
          timedSeconds: _preferences.timedSeconds,
          bestTimes: _preferences.bestTimes,
          bestScores: _preferences.bestScores,
        );
      } else {
        _preferences = _MathsPreferences(
          enabledOperations: _preferences.enabledOperations,
          enabledDifficulties: <_MathsDifficulty>{
            ..._preferences.enabledDifficulties,
          }..remove(difficulty),
          targetCount: _preferences.targetCount,
          timedSeconds: _preferences.timedSeconds,
          bestTimes: _preferences.bestTimes,
          bestScores: _preferences.bestScores,
        );
      }
    });
    _savePreferences();
  }

  void _setTargetCount(int value) {
    setState(() {
      _preferences = _MathsPreferences(
        enabledOperations: _preferences.enabledOperations,
        enabledDifficulties: _preferences.enabledDifficulties,
        targetCount: value,
        timedSeconds: _preferences.timedSeconds,
        bestTimes: _preferences.bestTimes,
        bestScores: _preferences.bestScores,
      );
    });
    _savePreferences();
  }

  void _setTimedSeconds(int value) {
    setState(() {
      _preferences = _MathsPreferences(
        enabledOperations: _preferences.enabledOperations,
        enabledDifficulties: _preferences.enabledDifficulties,
        targetCount: _preferences.targetCount,
        timedSeconds: value,
        bestTimes: _preferences.bestTimes,
        bestScores: _preferences.bestScores,
      );
    });
    _savePreferences();
  }

  void _setMode(_MathsMode mode) {
    setState(() => _mode = mode);
  }

  IconData _operationIcon(_MathsOperation operation) {
    switch (operation) {
      case _MathsOperation.addition:
        return Icons.add_rounded;
      case _MathsOperation.subtraction:
        return Icons.remove_rounded;
      case _MathsOperation.multiplication:
        return Icons.close_rounded;
      case _MathsOperation.division:
        return Icons.horizontal_rule_rounded;
    }
  }

  IconData _difficultyIcon(_MathsDifficulty difficulty) {
    switch (difficulty) {
      case _MathsDifficulty.easy:
        return Icons.eco_rounded;
      case _MathsDifficulty.medium:
        return Icons.speed_rounded;
      case _MathsDifficulty.hard:
        return Icons.local_fire_department_rounded;
    }
  }

  void _startChallenge() {
    if (_preferences.enabledOperations.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enable at least one operation first.')),
      );
      return;
    }
    if (_preferences.enabledDifficulties.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enable at least one difficulty first.')),
      );
      return;
    }

    _answerController.clear();
    setState(() {
      _playing = true;
      _lastResultMessage = null;
      _lastResultIsNewBest = false;
      _correctCount = 0;
      _elapsedSeconds = 0;
      _remainingSeconds = _mode == _MathsMode.timed
          ? _preferences.timedSeconds
          : 0;
      _problemSeconds = 0;
      _problem = _generateProblem();
    });

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (Timer timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      setState(() {
        if (_mode == _MathsMode.timed) {
          if (_remainingSeconds > 1) {
            _remainingSeconds--;
            _problemSeconds++;
          } else {
            _remainingSeconds = 0;
            _finishChallenge();
          }
        } else {
          _elapsedSeconds++;
          _problemSeconds++;
        }
      });
    });
  }

  _MathsProblem _generateProblem() {
    final List<_MathsOperation> operations = _preferences.enabledOperations
        .toList();
    final List<_MathsDifficulty> difficulties = _preferences.enabledDifficulties
        .toList();
    final _MathsOperation operation =
        operations[_random.nextInt(operations.length)];
    final _MathsDifficulty difficulty =
        difficulties[_random.nextInt(difficulties.length)];

    int left;
    int right;
    int answer;

    switch (difficulty) {
      case _MathsDifficulty.easy:
        switch (operation) {
          case _MathsOperation.addition:
            left = _random.nextInt(20) + 1;
            right = _random.nextInt(20) + 1;
            answer = left + right;
          case _MathsOperation.subtraction:
            left = _random.nextInt(19) + 2;
            right = _random.nextInt(left - 1) + 1;
            answer = left - right;
          case _MathsOperation.multiplication:
            left = _random.nextInt(4) + 2;
            right = _random.nextInt(4) + 2;
            answer = left * right;
          case _MathsOperation.division:
            right = _random.nextInt(4) + 2;
            answer = _random.nextInt(4) + 2;
            left = right * answer;
        }
      case _MathsDifficulty.medium:
        switch (operation) {
          case _MathsOperation.addition:
            left = _random.nextInt(89) + 11;
            right = _random.nextInt(89) + 11;
            answer = left + right;
          case _MathsOperation.subtraction:
            left = _random.nextInt(89) + 11;
            right = _random.nextInt(left - 1) + 2;
            answer = left - right;
          case _MathsOperation.multiplication:
            left = _random.nextInt(11) + 2;
            right = _random.nextInt(11) + 2;
            answer = left * right;
          case _MathsOperation.division:
            right = _random.nextInt(11) + 2;
            answer = _random.nextInt(11) + 2;
            left = right * answer;
        }
      case _MathsDifficulty.hard:
        switch (operation) {
          case _MathsOperation.addition:
            left = _random.nextInt(899) + 101;
            right = _random.nextInt(899) + 101;
            answer = left + right;
          case _MathsOperation.subtraction:
            left = _random.nextInt(899) + 101;
            right = _random.nextInt(left - 100) + 101;
            answer = left - right;
          case _MathsOperation.multiplication:
            left = _random.nextInt(10) + 11;
            right = _random.nextInt(10) + 11;
            answer = left * right;
          case _MathsOperation.division:
            right = _random.nextInt(10) + 11;
            answer = _random.nextInt(10) + 11;
            left = right * answer;
        }
    }

    return _MathsProblem(
      question: '$left ${operation.symbol} $right',
      answer: answer,
    );
  }

  void _handleAnswer(String value) {
    final int? answer = int.tryParse(value.trim());
    final _MathsProblem? problem = _problem;
    if (answer == null || problem == null) {
      return;
    }

    if (answer != problem.answer) {
      return;
    }

    setState(() {
      _correctCount++;
      if (_mode == _MathsMode.timed) {
        if (_remainingSeconds <= 0) {
          _finishChallenge();
        } else {
          _advanceToNextProblem();
        }
      } else if (_correctCount >= _preferences.targetCount) {
        _finishChallenge();
      } else {
        _advanceToNextProblem();
      }
    });
  }

  void _advanceToNextProblem() {
    _problem = _generateProblem();
    _problemSeconds = 0;
    _answerController.clear();
  }

  void _skipProblem() {
    if (_problem == null) {
      return;
    }

    setState(() {
      if (_mode == _MathsMode.timed && _remainingSeconds <= 0) {
        _finishChallenge();
      } else {
        _advanceToNextProblem();
      }
    });
  }

  void _finishChallenge() {
    _timer?.cancel();
    final _MathsMode mode = _mode;
    final String key = mode == _MathsMode.count ? _countKey : _timedKey;
    final int result = mode == _MathsMode.count
        ? _elapsedSeconds
        : _correctCount;
    final int? previousBest = mode == _MathsMode.count
        ? _preferences.bestTimes[key]
        : _preferences.bestScores[key];

    bool isNewBest = false;
    if (previousBest == null) {
      isNewBest = true;
    } else if (mode == _MathsMode.count) {
      isNewBest = result < previousBest;
    } else {
      isNewBest = result > previousBest;
    }

    _preferences = _MathsPreferences(
      enabledOperations: _preferences.enabledOperations,
      enabledDifficulties: _preferences.enabledDifficulties,
      targetCount: _preferences.targetCount,
      timedSeconds: _preferences.timedSeconds,
      bestTimes: mode == _MathsMode.count
          ? <String, int>{
              ..._preferences.bestTimes,
              key: isNewBest ? result : previousBest!,
            }
          : _preferences.bestTimes,
      bestScores: mode == _MathsMode.timed
          ? <String, int>{
              ..._preferences.bestScores,
              key: isNewBest ? result : previousBest!,
            }
          : _preferences.bestScores,
    );

    final String resultMessage = mode == _MathsMode.count
        ? 'You completed ${_preferences.targetCount} questions in '
              '${_formatSeconds(result)}.'
        : 'You answered $result correctly in '
              '${_formatSeconds(_preferences.timedSeconds)}.';

    setState(() {
      _playing = false;
      _lastResultMessage = resultMessage;
      _lastResultIsNewBest = isNewBest;
    });
    _savePreferences();
  }

  void _quitChallenge() {
    _timer?.cancel();
    setState(() {
      _playing = false;
      _lastResultMessage = null;
      _lastResultIsNewBest = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Maths',
      icon: Icons.functions_rounded,
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : _playing
          ? _buildChallenge(context)
          : _buildHome(context),
    );
  }

  Widget _buildHome(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: <Widget>[
        if (_lastResultMessage != null) ...<Widget>[
          _ResultBanner(
            message: _lastResultMessage!,
            isNewBest: _lastResultIsNewBest,
          ),
          const SizedBox(height: 14),
        ],
        _SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Mode', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 14),
              _ModeSelector(mode: _mode, onChanged: _setMode),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Operations', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 6),
              Text(
                'Enable the operations you want included in the problem pool.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final _MathsOperation operation
                      in _MathsOperation.values)
                    _AccentToggleButton(
                      label: operation.label,
                      icon: _operationIcon(operation),
                      selected: _preferences.enabledOperations.contains(
                        operation,
                      ),
                      onTap: () => _setOperation(
                        operation,
                        !_preferences.enabledOperations.contains(operation),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Difficulty', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 6),
              Text(
                'Enable the difficulty levels you want included in the pool.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final _MathsDifficulty difficulty
                      in _MathsDifficulty.values)
                    _AccentToggleButton(
                      label: difficulty.label,
                      icon: _difficultyIcon(difficulty),
                      selected: _preferences.enabledDifficulties.contains(
                        difficulty,
                      ),
                      onTap: () => _setDifficulty(
                        difficulty,
                        !_preferences.enabledDifficulties.contains(difficulty),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                _mode == _MathsMode.count
                    ? 'How many questions?'
                    : 'How much time?',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final int option
                      in _mode == _MathsMode.count
                          ? _countOptions
                          : _timeOptions)
                    _AccentToggleButton(
                      label: _mode == _MathsMode.count
                          ? '$option'
                          : _formatSeconds(option),
                      selected: _mode == _MathsMode.count
                          ? _preferences.targetCount == option
                          : _preferences.timedSeconds == option,
                      onTap: () => _mode == _MathsMode.count
                          ? _setTargetCount(option)
                          : _setTimedSeconds(option),
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        _BestScoreCard(preferences: _preferences, mode: _mode),
        const SizedBox(height: 18),
        SizedBox(
          height: 56,
          child: FilledButton.icon(
            style: FilledButton.styleFrom(
              textStyle: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            onPressed: _startChallenge,
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Start'),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 56,
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              textStyle: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            onPressed: _startChallenge,
            icon: const Icon(Icons.bolt_rounded),
            label: const Text('Quick start'),
          ),
        ),
      ],
    );
  }

  Widget _buildChallenge(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final _MathsProblem problem = _problem!;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              OutlinedButton.icon(
                onPressed: _quitChallenge,
                icon: const Icon(Icons.close_rounded),
                label: const Text('End'),
              ),
              _ChallengeTimer(
                mode: _mode,
                elapsedSeconds: _elapsedSeconds,
                remainingSeconds: _remainingSeconds,
              ),
            ],
          ),
          const SizedBox(height: 18),
          LinearProgressIndicator(
            value: _mode == _MathsMode.count
                ? _correctCount / _preferences.targetCount
                : _remainingSeconds / _preferences.timedSeconds,
            minHeight: 10,
            borderRadius: BorderRadius.circular(999),
          ),
          const SizedBox(height: 28),
          Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Text('Solve', style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 8),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      problem.question,
                      style: TextStyle(
                        fontSize: 68,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -2,
                        color: scheme.onSurface,
                      ),
                    ),
                  ),
                  const SizedBox(height: 30),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 320),
                    child: TextField(
                      controller: _answerController,
                      autofocus: true,
                      keyboardType: TextInputType.number,
                      textInputAction: TextInputAction.done,
                      textAlign: TextAlign.center,
                      onChanged: _handleAnswer,
                      style: const TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w700,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Answer',
                        filled: true,
                        fillColor: scheme.surfaceContainerHighest,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(18),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 56,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: _problemSeconds >= 10
                  ? SizedBox(
                      key: const ValueKey<String>('give-up'),
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _skipProblem,
                        icon: const Icon(Icons.flag_rounded),
                        label: const Text('Give up'),
                      ),
                    )
                  : const SizedBox(
                      key: ValueKey<String>('no-give-up'),
                      height: 56,
                    ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatSeconds(int seconds) {
    final int minutes = seconds ~/ 60;
    final int remainder = seconds % 60;
    if (minutes == 0) {
      return '${seconds}s';
    }
    return remainder == 0 ? '${minutes}m' : '${minutes}m ${remainder}s';
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: child,
    );
  }
}

class _AccentToggleButton extends StatelessWidget {
  const _AccentToggleButton({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
  });

  final String label;
  final IconData? icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final Color background = selected
        ? scheme.primary
        : scheme.surfaceContainerHighest;
    final Color foreground = selected
        ? scheme.onPrimary
        : scheme.onSurfaceVariant;

    return Material(
      color: background,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              if (icon != null) ...<Widget>[
                Icon(icon, size: 18, color: foreground),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: TextStyle(
                  color: foreground,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResultBanner extends StatelessWidget {
  const _ResultBanner({required this.message, required this.isNewBest});

  final String message;
  final bool isNewBest;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(
            isNewBest ? Icons.emoji_events_rounded : Icons.done_all_rounded,
            color: scheme.onPrimaryContainer,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  message,
                  style: TextStyle(
                    color: scheme.onPrimaryContainer,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isNewBest ? 'New personal best!' : 'Personal best stands.',
                  style: TextStyle(
                    color: scheme.onPrimaryContainer.withValues(alpha: 0.78),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
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

class _ModeSelector extends StatelessWidget {
  const _ModeSelector({required this.mode, required this.onChanged});

  final _MathsMode mode;
  final ValueChanged<_MathsMode> onChanged;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: <Widget>[
          for (final _MathsMode option in _MathsMode.values) ...<Widget>[
            Expanded(
              child: Material(
                color: mode == option ? scheme.primary : Colors.transparent,
                borderRadius: BorderRadius.circular(14),
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => onChanged(option),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      option.label,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: mode == option
                            ? scheme.onPrimary
                            : scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            if (option != _MathsMode.values.last) const SizedBox(width: 5),
          ],
        ],
      ),
    );
  }
}

class _BestScoreCard extends StatelessWidget {
  const _BestScoreCard({required this.preferences, required this.mode});

  final _MathsPreferences preferences;
  final _MathsMode mode;

  @override
  Widget build(BuildContext context) {
    final List<String> operationsKey =
        preferences.enabledOperations.map((e) => e.name).toList()..sort();
    final List<String> difficultiesKey =
        preferences.enabledDifficulties.map((e) => e.name).toList()..sort();
    final String key = mode == _MathsMode.count
        ? 'count:${operationsKey.join('-')}:${difficultiesKey.join('-')}:'
              '${preferences.targetCount}'
        : 'timed:${operationsKey.join('-')}:${difficultiesKey.join('-')}:'
              '${preferences.timedSeconds}';
    final int? best = mode == _MathsMode.count
        ? preferences.bestTimes[key]
        : preferences.bestScores[key];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.35),
        ),
      ),
      child: Row(
        children: <Widget>[
          Icon(
            Icons.emoji_events_rounded,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              mode == _MathsMode.count
                  ? 'Fastest completion time'
                  : 'Best score',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
          Text(
            best == null
                ? '—'
                : mode == _MathsMode.count
                ? _formatBestTime(best)
                : best.toString(),
            style: Theme.of(context).textTheme.titleLarge
                ?.copyWith(color: Theme.of(context).colorScheme.primary),
          ),
        ],
      ),
    );
  }

  String _formatBestTime(int seconds) {
    final int minutes = seconds ~/ 60;
    final int remainder = seconds % 60;
    if (minutes == 0) {
      return '${seconds}s';
    }
    return '${minutes}m ${remainder.toString().padLeft(2, '0')}s';
  }
}

class _ChallengeTimer extends StatelessWidget {
  const _ChallengeTimer({
    required this.mode,
    required this.elapsedSeconds,
    required this.remainingSeconds,
  });

  final _MathsMode mode;
  final int elapsedSeconds;
  final int remainingSeconds;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final int display = mode == _MathsMode.count
        ? elapsedSeconds
        : remainingSeconds;
    final int minutes = display ~/ 60;
    final int seconds = display % 60;
    final String label =
        '${minutes.toString().padLeft(2, '0')}:'
        '${seconds.toString().padLeft(2, '0')}';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(Icons.timer_rounded, size: 20, color: scheme.onPrimaryContainer),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              color: scheme.onPrimaryContainer,
              fontSize: 18,
              fontWeight: FontWeight.w800,
              fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}
