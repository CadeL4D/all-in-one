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
    required this.targetCount,
    required this.timedSeconds,
    required this.bestTimes,
    required this.bestScores,
  });

  final Set<_MathsOperation> enabledOperations;
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

    return _MathsPreferences(
      enabledOperations: operations.isEmpty
          ? _MathsOperation.values.toSet()
          : operations,
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

  String get _countKey => 'count:$_operationsKey:${_preferences.targetCount}';

  String get _timedKey => 'timed:$_operationsKey:${_preferences.timedSeconds}';

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

  void _startChallenge() {
    if (_preferences.enabledOperations.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enable at least one operation first.')),
      );
      return;
    }

    _answerController.clear();
    setState(() {
      _playing = true;
      _correctCount = 0;
      _elapsedSeconds = 0;
      _remainingSeconds = _mode == _MathsMode.timed
          ? _preferences.timedSeconds
          : 0;
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
          } else {
            _remainingSeconds = 0;
            _finishChallenge();
          }
        } else {
          _elapsedSeconds++;
        }
      });
    });
  }

  _MathsProblem _generateProblem() {
    final List<_MathsOperation> operations = _preferences.enabledOperations
        .toList();
    final _MathsOperation operation =
        operations[_random.nextInt(operations.length)];

    int left;
    int right;
    int answer;

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

    return _MathsProblem(
      question: '$left ${operation.symbol} $right',
      answer: answer,
    );
  }

  void _submitAnswer() {
    final int? answer = int.tryParse(_answerController.text.trim());
    final _MathsProblem? problem = _problem;
    if (answer == null || problem == null) {
      return;
    }

    setState(() {
      if (answer == problem.answer) {
        _correctCount++;
        _answerController.clear();

        if (_mode == _MathsMode.timed) {
          if (_remainingSeconds <= 0) {
            _finishChallenge();
          } else {
            _problem = _generateProblem();
          }
        } else if (_correctCount >= _preferences.targetCount) {
          _finishChallenge();
        } else {
          _problem = _generateProblem();
        }
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

    setState(() {
      _playing = false;
    });
    _savePreferences();
  }

  void _quitChallenge() {
    _timer?.cancel();
    setState(() => _playing = false);
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
              for (final _MathsOperation operation in _MathsOperation.values)
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(operation.label),
                  secondary: _OperationIcon(operation: operation),
                  value: _preferences.enabledOperations.contains(operation),
                  onChanged: (bool value) => _setOperation(operation, value),
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
                    ChoiceChip(
                      label: Text(
                        _mode == _MathsMode.count
                            ? '$option'
                            : _formatSeconds(option),
                      ),
                      selected: _mode == _MathsMode.count
                          ? _preferences.targetCount == option
                          : _preferences.timedSeconds == option,
                      onSelected: (_) => _mode == _MathsMode.count
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
                      onSubmitted: (_) => _submitAnswer(),
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
            width: double.infinity,
            height: 56,
            child: FilledButton(
              onPressed: _submitAnswer,
              child: const Text('Check'),
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
                color: mode == option ? scheme.onSurface : Colors.transparent,
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
                            ? scheme.surface
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

class _OperationIcon extends StatelessWidget {
  const _OperationIcon({required this.operation});

  final _MathsOperation operation;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      width: 38,
      height: 38,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        operation.symbol,
        style: TextStyle(
          color: scheme.onPrimaryContainer,
          fontSize: 18,
          fontWeight: FontWeight.w800,
        ),
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
    final String key = mode == _MathsMode.count
        ? 'count:${preferences.enabledOperations.map((e) => e.name).toList()..sort()}:${preferences.targetCount}'
        : 'timed:${preferences.enabledOperations.map((e) => e.name).toList()..sort()}:${preferences.timedSeconds}';
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
