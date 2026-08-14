import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../screens/app_scaffold.dart';
import 'signal_engine.dart';
import 'signal_game_view.dart';

enum _SignalScreen { home, game, stats }

class SignalApp extends StatefulWidget {
  const SignalApp({super.key});

  @override
  State<SignalApp> createState() => _SignalAppState();
}

class _SignalAppState extends State<SignalApp> {
  static const String _storeKey = 'signal_v1';

  late final SignalEngine _engine;
  _SignalScreen _screen = _SignalScreen.home;
  SignalHistory _history = SignalHistory.empty();
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _engine = SignalEngine(random: math.Random());
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final SharedPreferences preferences = await SharedPreferences.getInstance();
    final String? raw = preferences.getString(_storeKey);
    if (raw != null) {
      try {
        final Map<String, dynamic> json =
            jsonDecode(raw) as Map<String, dynamic>;
        _history = SignalHistory.fromJson(json);
      } on FormatException {
        _history = SignalHistory.empty();
      }
    }
    if (mounted) {
      setState(() => _loaded = true);
    }
  }

  Future<void> _saveRun(SignalRunStats stats) async {
    _history = _history.withRun(stats);
    final SharedPreferences preferences = await SharedPreferences.getInstance();
    await preferences.setString(_storeKey, jsonEncode(_history.toJson()));
    if (mounted) {
      setState(() {});
    }
  }

  void _openGame() {
    setState(() => _screen = _SignalScreen.game);
  }

  void _openStats() {
    setState(() => _screen = _SignalScreen.stats);
  }

  void _returnHome() {
    setState(() => _screen = _SignalScreen.home);
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Signal',
      icon: Icons.bolt_rounded,
      actions: _screen == _SignalScreen.game
          ? <Widget>[
              IconButton(
                tooltip: 'Pause',
                onPressed: () => _engine.togglePause(),
                icon: const Icon(Icons.pause_rounded),
              ),
            ]
          : <Widget>[
              if (_screen != _SignalScreen.home)
                IconButton(
                  tooltip: 'Back to Signal',
                  onPressed: _returnHome,
                  icon: const Icon(Icons.arrow_back_rounded),
                ),
            ],
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 240),
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (!_loaded) {
      return const Center(child: CircularProgressIndicator());
    }

    switch (_screen) {
      case _SignalScreen.home:
        return _SignalHome(
          key: const ValueKey<String>('home'),
          history: _history,
          onPlay: _openGame,
          onStats: _openStats,
        );
      case _SignalScreen.game:
        return SignalGameView(
          key: const ValueKey<String>('game'),
          engine: _engine,
          onQuit: _returnHome,
          onGameOver: _saveRun,
        );
      case _SignalScreen.stats:
        return _SignalStats(
          key: const ValueKey<String>('stats'),
          history: _history,
          onPlay: _openGame,
        );
    }
  }
}

class _SignalHome extends StatelessWidget {
  const _SignalHome({
    super.key,
    required this.history,
    required this.onPlay,
    required this.onStats,
  });

  final SignalHistory history;
  final VoidCallback onPlay;
  final VoidCallback onStats;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
      children: <Widget>[
        _HeroCard(history: history, onPlay: onPlay, onStats: onStats),
        const SizedBox(height: 22),
        Text(
          'Train your signal',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 6),
        Text(
          'Rapid observation, changing rules, distraction control and mental flexibility—wrapped in an arcade loop. Metrics reflect practice, not a diagnostic.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 14),
        const _HowToPlay(),
        const SizedBox(height: 22),
        Text('Skills in play', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: const <Widget>[
            _SkillChip(
              icon: Icons.center_focus_strong_rounded,
              label: 'Selective attention',
              color: Color(0xFF3E8DFF),
            ),
            _SkillChip(
              icon: Icons.memory_rounded,
              label: 'Working memory',
              color: Color(0xFF2EE6D6),
            ),
            _SkillChip(
              icon: Icons.block_rounded,
              label: 'Inhibitory control',
              color: Color(0xFFFF4FD8),
            ),
            _SkillChip(
              icon: Icons.sync_rounded,
              label: 'Cognitive flexibility',
              color: Color(0xFFFFC247),
            ),
          ],
        ),
        if (history.runs.isNotEmpty) ...<Widget>[
          const SizedBox(height: 22),
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  'Latest run',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              TextButton(onPressed: onStats, child: const Text('Full stats')),
            ],
          ),
          _LatestRunCard(stats: history.runs.first),
        ],
      ],
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.history,
    required this.onPlay,
    required this.onStats,
  });

  final SignalHistory history;
  final VoidCallback onPlay;
  final VoidCallback onStats;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[
            Color(0xFF2EE6D6),
            Color(0xFF3E8DFF),
            Color(0xFF8A5DFF),
          ],
        ),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: const Color(0xFF3E8DFF).withValues(alpha: 0.32),
            blurRadius: 30,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.28),
                  ),
                ),
                child: const Icon(Icons.bolt_rounded, color: Colors.white),
              ),
              const Spacer(),
              if (history.runs.isNotEmpty)
                _BestScorePill(score: history.bestScore),
            ],
          ),
          const SizedBox(height: 22),
          Text(
            'Signal',
            style: Theme.of(context).textTheme.headlineLarge
                ?.copyWith(color: Colors.white, fontSize: 40),
          ),
          const SizedBox(height: 6),
          Text(
            'A fast arcade workout for attention, memory and flexibility.',
            style: Theme.of(context).textTheme.bodyLarge
                ?.copyWith(color: Colors.white.withValues(alpha: 0.9)),
          ),
          const SizedBox(height: 22),
          Wrap(
            spacing: 12,
            runSpacing: 10,
            children: <Widget>[
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF2A6DFF),
                ),
                onPressed: onPlay,
                icon: const Icon(Icons.play_arrow_rounded),
                label: const Text('Start run'),
              ),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: BorderSide(color: Colors.white.withValues(alpha: 0.45)),
                ),
                onPressed: onStats,
                icon: const Icon(Icons.insights_rounded),
                label: const Text('Stats'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BestScorePill extends StatelessWidget {
  const _BestScorePill({required this.score});

  final int score;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        'Best $score',
        style: Theme.of(context).textTheme.labelLarge
            ?.copyWith(color: Colors.white),
      ),
    );
  }
}

class _HowToPlay extends StatelessWidget {
  const _HowToPlay();

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.7)),
      ),
      child: const Column(
        children: <Widget>[
          _Instruction(
            icon: Icons.touch_app_rounded,
            title: 'Move with one finger',
            body: 'Drag or tap anywhere. Your receiver glides to that spot.',
            color: Color(0xFF2EE6D6),
          ),
          _Divider(),
          _Instruction(
            icon: Icons.check_circle_rounded,
            title: 'Catch targets',
            body: 'Match the current signal. Hits build combo and score.',
            color: Color(0xFF3E8DFF),
          ),
          _Divider(),
          _Instruction(
            icon: Icons.do_not_disturb_alt_rounded,
            title: 'Inhibit the rest',
            body: 'Let avoid targets pass. Wrong grabs cost a shield.',
            color: Color(0xFFFF5A5F),
          ),
          _Divider(),
          _Instruction(
            icon: Icons.sync_rounded,
            title: 'Adapt on the fly',
            body: 'Rules reverse, cue fades and bosses mix everything.',
            color: Color(0xFFFFC247),
          ),
        ],
      ),
    );
  }
}

class _Instruction extends StatelessWidget {
  const _Instruction({
    required this.icon,
    required this.title,
    required this.body,
    required this.color,
  });

  final IconData icon;
  final String title;
  final String body;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.14),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: color, size: 22),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 3),
              Text(body, style: Theme.of(context).textTheme.bodyMedium),
            ],
          ),
        ),
      ],
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Divider(
        height: 1,
        color: Theme.of(context).colorScheme.outlineVariant
            .withValues(alpha: 0.55),
      ),
    );
  }
}

class _SkillChip extends StatelessWidget {
  const _SkillChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.34)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 7),
          Text(
            label,
            style: Theme.of(context).textTheme.labelLarge
                ?.copyWith(color: Theme.of(context).colorScheme.onSurface),
          ),
        ],
      ),
    );
  }
}

class _LatestRunCard extends StatelessWidget {
  const _LatestRunCard({required this.stats});

  final SignalRunStats stats;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.7)),
      ),
      child: Column(
        children: <Widget>[
          _MetricRow(
            children: <Widget>[
              _Metric(label: 'Score', value: '${stats.score}'),
              _Metric(label: 'Level', value: '${stats.levelReached}'),
              _Metric(label: 'Combo', value: '×${stats.bestCombo}'),
            ],
          ),
          const SizedBox(height: 14),
          _MetricRow(
            children: <Widget>[
              _Metric(
                label: 'Accuracy',
                value: '${(stats.accuracy * 100).round()}%',
              ),
              _Metric(label: 'Reaction', value: '${stats.avgReactionMs} ms'),
              _Metric(
                label: 'Difficulty',
                value: stats.difficulty.toStringAsFixed(1),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MetricRow extends StatelessWidget {
  const _MetricRow({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: children.map((Widget child) => Expanded(child: child)).toList(),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          label.toUpperCase(),
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge
              ?.copyWith(fontSize: 22, fontWeight: FontWeight.w800),
        ),
      ],
    );
  }
}

class SignalHistory {
  const SignalHistory({required this.bestScore, required this.runs});

  final int bestScore;
  final List<SignalRunStats> runs;

  factory SignalHistory.empty() {
    return const SignalHistory(bestScore: 0, runs: <SignalRunStats>[]);
  }

  SignalHistory withRun(SignalRunStats stats) {
    final List<SignalRunStats> next = <SignalRunStats>[stats, ...runs];
    if (next.length > 20) {
      next.removeRange(20, next.length);
    }
    return SignalHistory(
      bestScore: math.max(bestScore, stats.score),
      runs: List<SignalRunStats>.unmodifiable(next),
    );
  }

  double get averageAccuracy {
    if (runs.isEmpty) {
      return 0;
    }
    return runs
            .map((SignalRunStats run) => run.accuracy)
            .reduce((double a, double b) => a + b) /
        runs.length;
  }

  int get averageReactionMs {
    if (runs.isEmpty) {
      return 0;
    }
    final List<int> valid = runs
        .map((SignalRunStats run) => run.avgReactionMs)
        .where((int value) => value > 0)
        .toList();
    if (valid.isEmpty) {
      return 0;
    }
    return (valid.reduce((int a, int b) => a + b) / valid.length).round();
  }

  int get totalTargetHits =>
      runs.fold<int>(0, (int sum, SignalRunStats run) => sum + run.targetHits);

  int get totalMistakes =>
      runs.fold<int>(0, (int sum, SignalRunStats run) => sum + run.mistakes);

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bestScore': bestScore,
      'runs': runs
          .map((SignalRunStats run) => run.toJson())
          .toList(growable: false),
    };
  }

  factory SignalHistory.fromJson(Map<String, dynamic> json) {
    final List<Map<String, dynamic>> rawRuns = <Map<String, dynamic>>[];
    for (final dynamic rawRun
        in json['runs'] as List<dynamic>? ?? const <dynamic>[]) {
      if (rawRun is Map<String, dynamic>) {
        rawRuns.add(rawRun);
      }
    }
    return SignalHistory(
      bestScore: (json['bestScore'] as num?)?.toInt() ?? 0,
      runs: List<SignalRunStats>.unmodifiable(
        rawRuns.map(SignalRunStats.fromJson),
      ),
    );
  }
}

class _SignalStats extends StatelessWidget {
  const _SignalStats({super.key, required this.history, required this.onPlay});

  final SignalHistory history;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    if (history.runs.isEmpty) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(20, 40, 20, 32),
        children: <Widget>[
          const Icon(
            Icons.insights_rounded,
            size: 54,
            color: Color(0xFF3E8DFF),
          ),
          const SizedBox(height: 14),
          Text(
            'No signal runs yet',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Finish a run to see accuracy, reaction time, mistakes and difficulty progression.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),
          Center(
            child: FilledButton.icon(
              onPressed: onPlay,
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Start first run'),
            ),
          ),
        ],
      );
    }

    final int previousRuns = math.max(0, history.runs.length - 1);
    final double previousAccuracy = previousRuns == 0
        ? 0
        : history.runs
                  .skip(1)
                  .map((SignalRunStats run) => run.accuracy)
                  .reduce((double a, double b) => a + b) /
              previousRuns;
    final double latestAccuracy = history.runs.first.accuracy;
    final double accuracyDelta = previousRuns == 0
        ? 0
        : latestAccuracy - previousAccuracy;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
      children: <Widget>[
        _SummaryGrid(history: history),
        const SizedBox(height: 20),
        Text('Practice trend', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 6),
        Text(
          'Latest run compared with the average of your earlier runs.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 12),
        _TrendRow(
          label: 'Accuracy',
          value: '${(latestAccuracy * 100).round()}%',
          deltaText: previousRuns == 0
              ? 'baseline'
              : '${accuracyDelta >= 0 ? '+' : ''}${(accuracyDelta * 100).round()} pts',
          positive: accuracyDelta >= 0,
          color: const Color(0xFF3E8DFF),
        ),
        const SizedBox(height: 10),
        _TrendRow(
          label: 'Best score',
          value: '${history.bestScore}',
          deltaText:
              history.runs.first.score >= history.bestScore &&
                  history.runs.length > 1
              ? 'new best'
              : 'kept',
          positive: history.runs.first.score >= history.bestScore,
          color: const Color(0xFF2EE6D6),
        ),
        const SizedBox(height: 22),
        Text('Recent runs', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 10),
        for (final SignalRunStats run in history.runs.take(8))
          _RunRow(stats: run),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: scheme.outlineVariant.withValues(alpha: 0.7),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(
                Icons.info_outline_rounded,
                color: scheme.onSurfaceVariant,
                size: 20,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'These are practice metrics for your own review. They show task performance over time, not an increase in intelligence or a clinical assessment.',
                  style: Theme.of(context).textTheme.bodySmall
                      ?.copyWith(color: scheme.onSurfaceVariant),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SummaryGrid extends StatelessWidget {
  const _SummaryGrid({required this.history});

  final SignalHistory history;

  @override
  Widget build(BuildContext context) {
    final List<_SummaryItem> items = <_SummaryItem>[
      _SummaryItem(
        label: 'Best score',
        value: '${history.bestScore}',
        icon: Icons.emoji_events_rounded,
        color: const Color(0xFFFFC247),
      ),
      _SummaryItem(
        label: 'Runs',
        value: '${history.runs.length}',
        icon: Icons.replay_rounded,
        color: const Color(0xFF3E8DFF),
      ),
      _SummaryItem(
        label: 'Avg accuracy',
        value: '${(history.averageAccuracy * 100).round()}%',
        icon: Icons.center_focus_strong_rounded,
        color: const Color(0xFF2EE6D6),
      ),
      _SummaryItem(
        label: 'Avg reaction',
        value: '${history.averageReactionMs} ms',
        icon: Icons.speed_rounded,
        color: const Color(0xFFFF4FD8),
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.8,
      ),
      itemBuilder: (BuildContext context, int index) {
        return _SummaryCard(item: items[index]);
      },
    );
  }
}

class _SummaryItem {
  const _SummaryItem({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.item});

  final _SummaryItem item;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.7)),
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: item.color.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(item.icon, color: item.color, size: 20),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  item.label.toUpperCase(),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    letterSpacing: 0.6,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  item.value,
                  style: Theme.of(context).textTheme.titleLarge
                      ?.copyWith(fontSize: 18, fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TrendRow extends StatelessWidget {
  const _TrendRow({
    required this.label,
    required this.value,
    required this.deltaText,
    required this.positive,
    required this.color,
  });

  final String label;
  final String value;
  final String deltaText;
  final bool positive;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.7)),
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 8,
            height: 34,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label, style: Theme.of(context).textTheme.titleMedium),
          ),
          Text(value, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(width: 12),
          Text(
            deltaText,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: positive
                  ? const Color(0xFF2EE6D6)
                  : scheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _RunRow extends StatelessWidget {
  const _RunRow({required this.stats});

  final SignalRunStats stats;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: <Widget>[
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: <Color>[Color(0xFF2EE6D6), Color(0xFF3E8DFF)],
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.bolt_rounded,
              color: Colors.white,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Level ${stats.levelReached} • ${stats.score} pts',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 2),
                Text(
                  '${(stats.accuracy * 100).round()}% accuracy • ${stats.avgReactionMs} ms • ${stats.mistakes} mistakes',
                  style: Theme.of(context).textTheme.bodySmall
                      ?.copyWith(color: scheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
