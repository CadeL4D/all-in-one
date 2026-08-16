import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';
import 'resolve_badge.dart';
import 'workout_engine.dart';
import 'workout_models.dart';
import 'workout_notifications.dart';

const Color _workoutNavy = Color(0xFF111827);
const Color _workoutMint = Color(0xFF34D399);
const Color _workoutAmber = Color(0xFFFBBF24);

class WorkoutsApp extends StatefulWidget {
  const WorkoutsApp({super.key});

  @override
  State<WorkoutsApp> createState() => _WorkoutsAppState();
}

class _WorkoutsAppState extends State<WorkoutsApp> with WidgetsBindingObserver {
  WorkoutState? _state;
  bool _loaded = false;
  int _tab = 0;
  final WorkoutNotifications _notifications = WorkoutNotifications();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _state != null) {
      _reconcileAndSave(showMessage: true);
    }
  }

  Future<void> _load() async {
    final Map<String, dynamic>? raw = await LocalStore.readJsonMap(
      LocalStore.workoutsKey,
    );
    WorkoutState? loadedState;
    if (raw != null) {
      try {
        loadedState = WorkoutState.fromJson(raw);
        _ensureUpcomingPlan(loadedState);
        WorkoutEngine.reconcileMissed(loadedState, DateTime.now());
      } catch (_) {
        loadedState = null;
      }
    }
    if (!mounted) {
      return;
    }
    setState(() {
      _state = loadedState;
      _loaded = true;
    });
    if (loadedState != null) {
      await _save();
    }
  }

  void _ensureUpcomingPlan(WorkoutState state) {
    final DateTime today = WorkoutEngine.dateOnly(DateTime.now());
    final bool hasUpcoming = state.workouts.any(
      (PlannedWorkout workout) =>
          !workout.date.isBefore(today) &&
          (workout.status == WorkoutStatus.scheduled ||
              workout.status == WorkoutStatus.inProgress),
    );
    if (hasUpcoming) {
      return;
    }
    final Set<String> existingIds = state.workouts
        .map((PlannedWorkout workout) => workout.id)
        .toSet();
    state.workouts.addAll(
      WorkoutEngine.generateSchedule(
        profile: state.profile,
        resolve: state.resolve,
        now: today.add(const Duration(days: 1)),
      ).where((PlannedWorkout workout) => !existingIds.contains(workout.id)),
    );
  }

  Future<void> _reconcileAndSave({bool showMessage = false}) async {
    final WorkoutState? state = _state;
    if (state == null) {
      return;
    }
    final int missed = WorkoutEngine.reconcileMissed(state, DateTime.now());
    _ensureUpcomingPlan(state);
    if (mounted) {
      setState(() {});
      if (showMessage && missed > 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              missed == 1
                  ? 'One workout passed at midnight. Resolve was updated.'
                  : '$missed workouts passed at midnight. Resolve was updated.',
            ),
          ),
        );
      }
    }
    await _save();
  }

  Future<void> _save() async {
    final WorkoutState? state = _state;
    if (state != null) {
      await LocalStore.writeJsonMap(LocalStore.workoutsKey, state.toJson());
      await _notifications.sync(state);
    }
  }

  Future<void> _finishOnboarding(WorkoutProfile profile) async {
    final WorkoutState state = WorkoutState(
      profile: profile,
      resolve: 1000,
      ratedWorkouts: 0,
      workouts: WorkoutEngine.generateSchedule(
        profile: profile,
        resolve: 1000,
        now: DateTime.now(),
      ),
    );
    setState(() => _state = state);
    await _save();
  }

  Future<void> _reset() async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: const Text('Reset Workouts?'),
        content: const Text(
          'This removes the workout plan, history, and Resolve rating from this device.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Reset'),
          ),
        ],
      ),
    );
    if (confirmed != true) {
      return;
    }
    await LocalStore.writeString(LocalStore.workoutsKey, '');
    if (mounted) {
      setState(() {
        _state = null;
        _tab = 0;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Workouts',
      icon: Icons.fitness_center_rounded,
      actions: <Widget>[
        if (_state != null)
          IconButton(
            tooltip: 'Workout information',
            onPressed: () => _showMethod(context),
            icon: const Icon(Icons.science_outlined),
          ),
      ],
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : _state == null
          ? _WorkoutOnboarding(onComplete: _finishOnboarding)
          : _buildApp(_state!),
    );
  }

  Widget _buildApp(WorkoutState state) {
    final List<Widget> pages = <Widget>[
      _TodayPage(state: state, onChanged: _save),
      _WeekPage(state: state, onChanged: _save),
      _HistoryPage(state: state),
      _ProfilePage(state: state, onReset: _reset),
    ];
    return Column(
      children: <Widget>[
        Expanded(
          child: IndexedStack(index: _tab, children: pages),
        ),
        NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: (int index) => setState(() => _tab = index),
          destinations: const <NavigationDestination>[
            NavigationDestination(
              icon: Icon(Icons.today_outlined),
              selectedIcon: Icon(Icons.today_rounded),
              label: 'Today',
            ),
            NavigationDestination(
              icon: Icon(Icons.calendar_view_week_outlined),
              selectedIcon: Icon(Icons.calendar_view_week_rounded),
              label: 'Week',
            ),
            NavigationDestination(
              icon: Icon(Icons.insights_outlined),
              selectedIcon: Icon(Icons.insights_rounded),
              label: 'History',
            ),
            NavigationDestination(
              icon: Icon(Icons.tune_outlined),
              selectedIcon: Icon(Icons.tune_rounded),
              label: 'Profile',
            ),
          ],
        ),
      ],
    );
  }

  void _showMethod(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (BuildContext context) => const SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(22, 4, 22, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'How Workouts chooses weight',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
              ),
              SizedBox(height: 12),
              Text(
                'Adult plans use a conservative estimate from a recent 1–10 rep set, then prescribe a goal-specific percentage. Actual reps and reps in reserve adjust later loads.',
              ),
              SizedBox(height: 12),
              Text(
                'Youth Mode never prescribes from a maximum. It uses moderate repetitions, gradual progression, and requires qualified adult supervision.',
              ),
              SizedBox(height: 12),
              Text(
                'Resolve measures consistency against each workout’s Pressure—not absolute strength. Extra-rep credit is capped and requires at least one rep in reserve.',
              ),
              SizedBox(height: 12),
              Text(
                'This planner is educational and is not medical care. Stop for pain, dizziness, or unusual symptoms and seek qualified guidance when needed.',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WorkoutOnboarding extends StatefulWidget {
  const _WorkoutOnboarding({required this.onComplete});

  final ValueChanged<WorkoutProfile> onComplete;

  @override
  State<_WorkoutOnboarding> createState() => _WorkoutOnboardingState();
}

class _WorkoutOnboardingState extends State<_WorkoutOnboarding> {
  int _step = 0;
  bool _isYouth = false;
  bool _supervision = false;
  bool _safetyAcknowledged = false;
  WorkoutGoal _goal = WorkoutGoal.balanced;
  WorkoutExperience _experience = WorkoutExperience.newLifter;
  final Set<int> _days = <int>{
    DateTime.monday,
    DateTime.wednesday,
    DateTime.friday,
  };
  int _minutes = 45;
  final Set<WorkoutEquipment> _equipment = <WorkoutEquipment>{
    WorkoutEquipment.bodyweight,
    WorkoutEquipment.dumbbells,
  };
  WorkoutUnit _unit = WorkoutUnit.pounds;
  int _reminderMinutes = 18 * 60;
  final Map<String, TextEditingController> _weightControllers =
      <String, TextEditingController>{};
  final Map<String, TextEditingController> _repControllers =
      <String, TextEditingController>{};

  @override
  void dispose() {
    for (final TextEditingController controller in <TextEditingController>[
      ..._weightControllers.values,
      ..._repControllers.values,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  bool get _canContinue => switch (_step) {
    0 => _safetyAcknowledged && (!_isYouth || _supervision),
    1 => true,
    2 => _days.length >= 2,
    3 => _equipment.isNotEmpty,
    _ => true,
  };

  void _next() {
    if (!_canContinue) {
      return;
    }
    if (_step < 5) {
      setState(() => _step++);
    } else {
      widget.onComplete(_buildProfile());
    }
  }

  WorkoutProfile _buildProfile() {
    final Map<String, double> maxes = <String, double>{};
    if (!_isYouth) {
      for (final WorkoutExerciseDefinition exercise
          in WorkoutEngine.baselineExercises(_equipment)) {
        final double? weight = double.tryParse(
          _weightControllers[exercise.id]?.text ?? '',
        );
        final int? reps = int.tryParse(
          _repControllers[exercise.id]?.text ?? '',
        );
        if (weight == null || reps == null) {
          continue;
        }
        final double? estimate = WorkoutEngine.estimateOneRepMax(weight, reps);
        if (estimate != null) {
          maxes[exercise.id] = estimate;
        }
      }
    }
    return WorkoutProfile(
      isYouth: _isYouth,
      supervisionConfirmed: _supervision,
      goal: _goal,
      experience: _experience,
      trainingDays: Set<int>.of(_days),
      sessionMinutes: _minutes,
      equipment: Set<WorkoutEquipment>.of(_equipment),
      unit: _unit,
      reminderMinutes: _reminderMinutes,
      estimatedMaxes: maxes,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 4),
          child: Row(
            children: <Widget>[
              Text(
                'SETUP ${_step + 1} OF 6',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: LinearProgressIndicator(
                  value: (_step + 1) / 6,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 20),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: KeyedSubtree(key: ValueKey<int>(_step), child: _content()),
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 8, 18, 12),
            child: Row(
              children: <Widget>[
                if (_step > 0)
                  TextButton.icon(
                    onPressed: () => setState(() => _step--),
                    icon: const Icon(Icons.arrow_back_rounded),
                    label: const Text('Back'),
                  ),
                const Spacer(),
                FilledButton.icon(
                  key: const ValueKey<String>('workouts-setup-next'),
                  onPressed: _canContinue ? _next : null,
                  icon: Icon(
                    _step == 5
                        ? Icons.auto_awesome_rounded
                        : Icons.arrow_forward_rounded,
                  ),
                  label: Text(_step == 5 ? 'Build my week' : 'Continue'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _content() => switch (_step) {
    0 => _safetyStep(),
    1 => _goalStep(),
    2 => _scheduleStep(),
    3 => _equipmentStep(),
    4 => _baselineStep(),
    _ => _reviewStep(),
  };

  Widget _heading(String title, String body) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      Text(title, style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 8),
      Text(body),
      const SizedBox(height: 22),
    ],
  );

  Widget _safetyStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _heading(
          'A plan that meets you where you are',
          'Answer a few questions and everything is generated locally. You can leave every strength baseline blank.',
        ),
        SegmentedButton<bool>(
          segments: const <ButtonSegment<bool>>[
            ButtonSegment<bool>(
              value: false,
              icon: Icon(Icons.person_rounded),
              label: Text('Adult'),
            ),
            ButtonSegment<bool>(
              value: true,
              icon: Icon(Icons.family_restroom_rounded),
              label: Text('Under 18'),
            ),
          ],
          selected: <bool>{_isYouth},
          onSelectionChanged: (Set<bool> value) => setState(() {
            _isYouth = value.first;
            if (!_isYouth) {
              _supervision = false;
            }
          }),
        ),
        const SizedBox(height: 16),
        if (_isYouth)
          _NoticeCard(
            color: _workoutAmber,
            icon: Icons.supervisor_account_rounded,
            title: 'Youth Mode',
            body: 'This mode avoids maximum-based loads. A qualified adult should supervise every weighted session.',
            footer: CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _supervision,
              onChanged: (bool? value) =>
                  setState(() => _supervision = value ?? false),
              title: const Text('Adult supervision is available'),
              controlAffinity: ListTileControlAffinity.leading,
            ),
          ),
        const SizedBox(height: 12),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: _safetyAcknowledged,
          onChanged: (bool? value) =>
              setState(() => _safetyAcknowledged = value ?? false),
          title: const Text('I’ll stop for pain or unusual symptoms'),
          subtitle: const Text(
            'Known medical concerns or injuries should be discussed with a qualified professional.',
          ),
          controlAffinity: ListTileControlAffinity.leading,
        ),
      ],
    );
  }

  Widget _goalStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _heading(
          'What should this week build?',
          'This changes volume, repetitions, and the starting intensity—not your rank.',
        ),
        ...WorkoutGoal.values.map(
          (WorkoutGoal goal) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _ChoiceCard(
              selected: _goal == goal,
              title: goal.label,
              subtitle: goal.description,
              onTap: () => setState(() => _goal = goal),
            ),
          ),
        ),
        const SizedBox(height: 12),
        const Text('TRAINING EXPERIENCE', style: _eyebrowStyle),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: WorkoutExperience.values
              .map(
                (WorkoutExperience experience) => ChoiceChip(
                  label: Text(experience.label),
                  selected: _experience == experience,
                  onSelected: (_) => setState(() => _experience = experience),
                ),
              )
              .toList(),
        ),
      ],
    );
  }

  Widget _scheduleStep() {
    const List<String> labels = <String>['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _heading(
          'Choose your training days',
          'Select at least two. An unopened workout is marked missed when its day ends at 12:00 AM.',
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List<Widget>.generate(7, (int index) {
            final int day = index + 1;
            return Semantics(
              label: 'Weekday $day',
              child: FilterChip(
                label: Text(labels[index]),
                selected: _days.contains(day),
                onSelected: (bool selected) => setState(() {
                  selected ? _days.add(day) : _days.remove(day);
                }),
              ),
            );
          }),
        ),
        if (_days.length < 2)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text(
              'Choose at least two days.',
              style: TextStyle(color: Colors.red, fontWeight: FontWeight.w700),
            ),
          ),
        const SizedBox(height: 24),
        Text('$_minutes MINUTES PER SESSION', style: _eyebrowStyle),
        Slider(
          value: _minutes.toDouble(),
          min: 30,
          max: 75,
          divisions: 3,
          label: '$_minutes min',
          onChanged: (double value) => setState(() => _minutes = value.round()),
        ),
        const SizedBox(height: 18),
        const Text('REMINDER', style: _eyebrowStyle),
        const SizedBox(height: 8),
        DropdownButtonFormField<int>(
          initialValue: _reminderMinutes,
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.notifications_rounded),
          ),
          items: const <DropdownMenuItem<int>>[
            DropdownMenuItem<int>(value: 7 * 60, child: Text('7:00 AM')),
            DropdownMenuItem<int>(value: 12 * 60, child: Text('12:00 PM')),
            DropdownMenuItem<int>(value: 18 * 60, child: Text('6:00 PM')),
            DropdownMenuItem<int>(value: 20 * 60, child: Text('8:00 PM')),
          ],
          onChanged: (int? value) =>
              setState(() => _reminderMinutes = value ?? 18 * 60),
        ),
      ],
    );
  }

  Widget _equipmentStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _heading(
          'What can you train with?',
          'The exercise library chooses movements and substitutions that match what you have.',
        ),
        Wrap(
          spacing: 9,
          runSpacing: 9,
          children: WorkoutEquipment.values
              .map(
                (WorkoutEquipment equipment) => FilterChip(
                  label: Text(equipment.label),
                  selected: _equipment.contains(equipment),
                  onSelected: (bool selected) => setState(() {
                    selected
                        ? _equipment.add(equipment)
                        : _equipment.remove(equipment);
                  }),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 24),
        const Text('WEIGHT UNIT', style: _eyebrowStyle),
        const SizedBox(height: 8),
        SegmentedButton<WorkoutUnit>(
          segments: const <ButtonSegment<WorkoutUnit>>[
            ButtonSegment<WorkoutUnit>(
              value: WorkoutUnit.pounds,
              label: Text('Pounds'),
            ),
            ButtonSegment<WorkoutUnit>(
              value: WorkoutUnit.kilograms,
              label: Text('Kilograms'),
            ),
          ],
          selected: <WorkoutUnit>{_unit},
          onSelectionChanged: (Set<WorkoutUnit> value) =>
              setState(() => _unit = value.first),
        ),
      ],
    );
  }

  Widget _baselineStep() {
    if (_isYouth) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          _heading(
            'No maximum needed',
            'Youth Mode starts with technique-focused sets of 10–15 repetitions. The supervising adult chooses a manageable resistance only after the movement is controlled.',
          ),
          const _NoticeCard(
            color: _workoutMint,
            icon: Icons.verified_user_rounded,
            title: 'Technique drives progression',
            body: 'Weights should rise gradually only when every repetition stays controlled and pain-free.',
          ),
        ],
      );
    }
    final List<WorkoutExerciseDefinition> baselines =
        WorkoutEngine.baselineExercises(_equipment);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _heading(
          'Optional strength baseline',
          'Enter the most weight you recently completed for 1–10 clean repetitions. Leave anything unknown blank—there is no max test.',
        ),
        if (baselines.isEmpty)
          const _NoticeCard(
            color: _workoutMint,
            icon: Icons.route_rounded,
            title: 'Calibration first',
            body: 'Your equipment selection does not need a weight estimate. The first workouts will guide you with reps in reserve.',
          )
        else
          ...baselines.map((WorkoutExerciseDefinition exercise) {
            _weightControllers.putIfAbsent(
              exercise.id,
              TextEditingController.new,
            );
            _repControllers.putIfAbsent(exercise.id, TextEditingController.new);
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      exercise.name,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: TextField(
                            key: ValueKey<String>(
                              'baseline-${exercise.id}-weight',
                            ),
                            controller: _weightControllers[exercise.id],
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            inputFormatters: <TextInputFormatter>[
                              FilteringTextInputFormatter.allow(
                                RegExp(r'[0-9.]'),
                              ),
                            ],
                            decoration: InputDecoration(
                              labelText: 'Weight (${_unit.shortLabel})',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            key: ValueKey<String>(
                              'baseline-${exercise.id}-reps',
                            ),
                            controller: _repControllers[exercise.id],
                            keyboardType: TextInputType.number,
                            inputFormatters: <TextInputFormatter>[
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            decoration: const InputDecoration(
                              labelText: 'Reps (1–10)',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _reviewStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _heading(
          'Ready to meet the pressure',
          'Your first two weeks will be generated now and will keep adapting from completed sets.',
        ),
        _ReviewRow(icon: Icons.flag_rounded, label: 'Goal', value: _goal.label),
        _ReviewRow(
          icon: Icons.calendar_month_rounded,
          label: 'Schedule',
          value: '${_days.length} days · $_minutes min',
        ),
        _ReviewRow(
          icon: Icons.fitness_center_rounded,
          label: 'Equipment',
          value: _equipment
              .map((WorkoutEquipment item) => item.label)
              .join(', '),
        ),
        _ReviewRow(
          icon: Icons.shield_rounded,
          label: 'Plan mode',
          value: _isYouth ? 'Youth · supervised' : 'Adult · estimated load',
        ),
        const SizedBox(height: 18),
        const _NoticeCard(
          color: _workoutMint,
          icon: Icons.bolt_rounded,
          title: 'Resolve starts at 1,000',
          body: 'Each workout has a Pressure rating. Complete the plan to gain Resolve; safe extra reps earn a little more.',
        ),
      ],
    );
  }
}

class _TodayPage extends StatefulWidget {
  const _TodayPage({required this.state, required this.onChanged});

  final WorkoutState state;
  final Future<void> Function() onChanged;

  @override
  State<_TodayPage> createState() => _TodayPageState();
}

class _TodayPageState extends State<_TodayPage> {
  PlannedWorkout? get _today {
    for (final PlannedWorkout workout in widget.state.workouts) {
      if (workout.status == WorkoutStatus.inProgress) {
        return workout;
      }
    }
    final String today = WorkoutEngine.dateKey(DateTime.now());
    for (final PlannedWorkout workout in widget.state.workouts) {
      if (WorkoutEngine.dateKey(workout.date) == today) {
        return workout;
      }
    }
    return null;
  }

  PlannedWorkout? get _next {
    final DateTime today = WorkoutEngine.dateOnly(DateTime.now());
    final List<PlannedWorkout> future =
        widget.state.workouts
            .where(
              (PlannedWorkout workout) =>
                  !workout.date.isBefore(today) &&
                  workout.status == WorkoutStatus.scheduled,
            )
            .toList()
          ..sort(
            (PlannedWorkout a, PlannedWorkout b) => a.date.compareTo(b.date),
          );
    return future.firstOrNull;
  }

  Future<void> _start(PlannedWorkout workout) async {
    workout
      ..status = WorkoutStatus.inProgress
      ..startedAt ??= DateTime.now();
    await widget.onChanged();
    if (!mounted) {
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (BuildContext context) => _ActiveWorkoutScreen(
          state: widget.state,
          workout: workout,
          onSave: widget.onChanged,
        ),
      ),
    );
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final WorkoutState state = widget.state;
    final ResolveRank rank = resolveRankFor(state.resolve);
    final PlannedWorkout? today = _today;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 26),
      children: <Widget>[
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(26),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: <Color>[_workoutNavy, Color(0xFF26334C)],
            ),
          ),
          child: Row(
            children: <Widget>[
              ResolveBadge(rating: state.resolve, size: 82),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const Text(
                      'YOUR RESOLVE',
                      style: TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.1,
                      ),
                    ),
                    Text(
                      '${state.resolve}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1.2,
                      ),
                    ),
                    Text(
                      rank.nextAt == null
                          ? 'Everform · the open tier'
                          : '${rank.nextAt! - state.resolve} to the next rank',
                      style: const TextStyle(
                        color: Color(0xFFCBD5E1),
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: rank.progress(state.resolve),
                      color: rank.colors.first,
                      backgroundColor: Colors.white12,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        Text('Today', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 10),
        if (today == null)
          _RestDayCard(next: _next)
        else
          _WorkoutOpponentCard(
            workout: today,
            resolve: state.resolve,
            unit: state.profile.unit,
            onStart:
                today.status == WorkoutStatus.scheduled ||
                    today.status == WorkoutStatus.inProgress
                ? () => _start(today)
                : null,
            onReschedule: today.status == WorkoutStatus.scheduled
                ? () => _reschedule(today)
                : null,
            onRecovery: today.status == WorkoutStatus.scheduled
                ? () => _markRecovery(today)
                : null,
          ),
        const SizedBox(height: 18),
        const _MiniPrincipleCard(),
      ],
    );
  }

  Future<void> _reschedule(PlannedWorkout workout) async {
    final DateTime now = DateTime.now();
    final DateTime? selected = await showDatePicker(
      context: context,
      initialDate: workout.date.isBefore(now) ? now : workout.date,
      firstDate: WorkoutEngine.dateOnly(now),
      lastDate: now.add(const Duration(days: 30)),
      helpText: 'Reschedule before midnight',
    );
    if (selected == null) {
      return;
    }
    setState(() => workout.date = WorkoutEngine.dateOnly(selected));
    await widget.onChanged();
  }

  Future<void> _markRecovery(PlannedWorkout workout) async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: const Text('Use a recovery day?'),
        content: const Text(
          'Use this for illness, injury, or recovery—not an ordinary missed session. Resolve will not change.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Recovery day'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      setState(() {
        workout
          ..status = WorkoutStatus.recovery
          ..finishedAt = DateTime.now();
      });
      await widget.onChanged();
    }
  }
}

class _WorkoutOpponentCard extends StatelessWidget {
  const _WorkoutOpponentCard({
    required this.workout,
    required this.resolve,
    required this.unit,
    required this.onStart,
    required this.onReschedule,
    required this.onRecovery,
  });

  final PlannedWorkout workout;
  final int resolve;
  final WorkoutUnit unit;
  final VoidCallback? onStart;
  final VoidCallback? onReschedule;
  final VoidCallback? onRecovery;

  @override
  Widget build(BuildContext context) {
    final String status = switch (workout.status) {
      WorkoutStatus.scheduled => 'READY',
      WorkoutStatus.inProgress => 'IN PROGRESS',
      WorkoutStatus.completed => 'WON · ${_signed(workout.resolveDelta)}',
      WorkoutStatus.missed => 'MISSED · ${_signed(workout.resolveDelta)}',
      WorkoutStatus.recovery => 'RECOVERY',
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: _workoutMint.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    status,
                    style: const TextStyle(
                      color: Color(0xFF059669),
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.7,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  '${workout.totalSets} sets',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(workout.title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _workoutNavy,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child: _MatchScore(
                      label: 'RESOLVE',
                      value: resolve,
                      color: _workoutMint,
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      'VS',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  Expanded(
                    child: _MatchScore(
                      label: 'PRESSURE',
                      value: workout.pressure,
                      color: _workoutAmber,
                      alignEnd: true,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            ...workout.exercises
                .take(4)
                .map(
                  (PlannedExercise exercise) => Padding(
                    padding: const EdgeInsets.only(bottom: 7),
                    child: Row(
                      children: <Widget>[
                        const Icon(Icons.arrow_right_rounded, size: 18),
                        Expanded(
                          child: Text(
                            exercise.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          exercise.weight == null
                              ? '${exercise.sets} × ${exercise.targetReps}'
                              : '${exercise.sets} × ${exercise.targetReps} · ${_weight(exercise.weight!, unit)}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
            if (workout.exercises.length > 4)
              Text(
                '+ ${workout.exercises.length - 4} more',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            if (onStart != null) ...<Widget>[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  key: const ValueKey<String>('workouts-start'),
                  onPressed: onStart,
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: Text(
                    workout.status == WorkoutStatus.inProgress
                        ? 'Continue workout'
                        : 'Meet the pressure',
                  ),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  if (onReschedule != null)
                    TextButton(
                      onPressed: onReschedule,
                      child: const Text('Reschedule'),
                    ),
                  if (onRecovery != null)
                    TextButton(
                      onPressed: onRecovery,
                      child: const Text('Recovery'),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ActiveWorkoutScreen extends StatefulWidget {
  const _ActiveWorkoutScreen({
    required this.state,
    required this.workout,
    required this.onSave,
  });

  final WorkoutState state;
  final PlannedWorkout workout;
  final Future<void> Function() onSave;

  @override
  State<_ActiveWorkoutScreen> createState() => _ActiveWorkoutScreenState();
}

class _ActiveWorkoutScreenState extends State<_ActiveWorkoutScreen> {
  Timer? _ticker;
  Duration _elapsed = Duration.zero;

  @override
  void initState() {
    super.initState();
    _updateElapsed();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(_updateElapsed);
      }
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _updateElapsed() {
    _elapsed = DateTime.now().difference(
      widget.workout.startedAt ?? DateTime.now(),
    );
  }

  Future<void> _finish() async {
    final int complete = widget.workout.completedSets;
    final int total = widget.workout.totalSets;
    if (complete == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Complete at least one set first.')),
      );
      return;
    }
    if (complete < total) {
      final bool? continueFinish = await showDialog<bool>(
        context: context,
        builder: (BuildContext context) => AlertDialog(
          title: const Text('Finish a partial workout?'),
          content: Text(
            '$complete of $total sets are complete. Resolve will use the work you logged.',
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Keep training'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Finish'),
            ),
          ],
        ),
      );
      if (continueFinish != true) {
        return;
      }
    }
    final int before = widget.state.resolve;
    final int delta = WorkoutEngine.completeWorkout(
      widget.state,
      widget.workout,
    );
    await widget.onSave();
    if (!mounted) {
      return;
    }
    HapticFeedback.heavyImpact();
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) => AlertDialog(
        title: const Text('Pressure met'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            ResolveBadge(rating: widget.state.resolve, size: 100),
            const SizedBox(height: 12),
            Text(
              '$before  →  ${widget.state.resolve}',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
            ),
            Text(
              'Resolve +$delta · ${(widget.workout.performanceScore * 100).round()}% performance',
            ),
          ],
        ),
        actions: <Widget>[
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Done'),
          ),
        ],
      ),
    );
    if (mounted) {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final int minutes = _elapsed.inMinutes;
    final int seconds = _elapsed.inSeconds % 60;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(widget.workout.title),
            Text(
              '$minutes:${seconds.toString().padLeft(2, '0')} · Pressure ${widget.workout.pressure}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        actions: <Widget>[
          TextButton(onPressed: _finish, child: const Text('Finish')),
        ],
      ),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(14, 8, 14, 32),
        itemCount: widget.workout.exercises.length + 1,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (BuildContext context, int index) {
          if (index == widget.workout.exercises.length) {
            return FilledButton.icon(
              key: const ValueKey<String>('workouts-finish'),
              onPressed: _finish,
              icon: const Icon(Icons.flag_rounded),
              label: const Text('Finish workout'),
            );
          }
          return _ExerciseLogger(
            exercise: widget.workout.exercises[index],
            unit: widget.state.profile.unit,
            onChanged: () {
              setState(() {});
              widget.onSave();
            },
          );
        },
      ),
    );
  }
}

class _ExerciseLogger extends StatelessWidget {
  const _ExerciseLogger({
    required this.exercise,
    required this.unit,
    required this.onChanged,
  });

  final PlannedExercise exercise;
  final WorkoutUnit unit;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    exercise.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                ActionChip(
                  tooltip: 'Adjust weight for this exercise',
                  avatar: const Icon(Icons.edit_rounded, size: 14),
                  label: Text(
                    exercise.weight == null
                        ? 'CHOOSE LOAD'
                        : _weight(exercise.weight!, unit),
                    style: const TextStyle(
                      color: Color(0xFF059669),
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  onPressed: () => _editWeight(context),
                ),
              ],
            ),
            const SizedBox(height: 5),
            Text(
              exercise.instructions,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            ...List<Widget>.generate(exercise.logs.length, (int index) {
              final WorkoutSetLog log = exercise.logs[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: log.completed
                        ? _workoutMint.withValues(alpha: 0.09)
                        : Theme.of(context).colorScheme.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: <Widget>[
                      SizedBox(
                        width: 28,
                        child: Text(
                          '${index + 1}',
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        tooltip: 'Remove a repetition',
                        onPressed: log.completed || log.actualReps <= 0
                            ? null
                            : () {
                                log.actualReps--;
                                onChanged();
                              },
                        icon: const Icon(Icons.remove_circle_outline_rounded),
                      ),
                      SizedBox(
                        width: 34,
                        child: Text(
                          '${log.actualReps}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      IconButton(
                        key: ValueKey<String>(
                          'workout-add-rep-${exercise.exerciseId}-$index',
                        ),
                        visualDensity: VisualDensity.compact,
                        tooltip: 'Add a repetition',
                        onPressed: log.completed || log.actualReps >= 99
                            ? null
                            : () {
                                log.actualReps++;
                                onChanged();
                              },
                        icon: const Icon(
                          Icons.add_circle_rounded,
                          color: _workoutMint,
                        ),
                      ),
                      const Spacer(),
                      DropdownButton<int>(
                        value: log.rir,
                        underline: const SizedBox.shrink(),
                        borderRadius: BorderRadius.circular(14),
                        items: List<DropdownMenuItem<int>>.generate(
                          5,
                          (int value) => DropdownMenuItem<int>(
                            value: value,
                            child: Text(
                              '$value RIR',
                              style: const TextStyle(fontSize: 11),
                            ),
                          ),
                        ),
                        onChanged: log.completed
                            ? null
                            : (int? value) {
                                log.rir = value ?? 2;
                                onChanged();
                              },
                      ),
                      Checkbox(
                        value: log.completed,
                        onChanged: (bool? value) {
                          log.completed = value ?? false;
                          HapticFeedback.selectionClick();
                          onChanged();
                        },
                      ),
                    ],
                  ),
                ),
              );
            }),
            Text(
              'Target ${exercise.targetReps}–${exercise.repRangeMax} reps · ${exercise.targetRir} RIR',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _editWeight(BuildContext context) async {
    final TextEditingController controller = TextEditingController(
      text: exercise.weight == null
          ? ''
          : exercise.weight == exercise.weight!.roundToDouble()
          ? exercise.weight!.round().toString()
          : exercise.weight!.toStringAsFixed(1),
    );
    final double? selected = await showDialog<double?>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: Text('${exercise.name} weight'),
        content: TextField(
          key: const ValueKey<String>('workout-edit-weight'),
          controller: controller,
          autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: <TextInputFormatter>[
            FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
          ],
          decoration: InputDecoration(
            labelText: 'Weight (${unit.shortLabel})',
            helperText: 'Enter 0 for bodyweight or no external load.',
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final double? value = double.tryParse(controller.text);
              Navigator.pop(context, value == null || value <= 0 ? 0 : value);
            },
            child: const Text('Use weight'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (selected == null) {
      return;
    }
    exercise.weight = selected <= 0 ? null : selected;
    onChanged();
  }
}

class _WeekPage extends StatelessWidget {
  const _WeekPage({required this.state, required this.onChanged});

  final WorkoutState state;
  final Future<void> Function() onChanged;

  @override
  Widget build(BuildContext context) {
    final DateTime today = WorkoutEngine.dateOnly(DateTime.now());
    final DateTime start = today.subtract(Duration(days: today.weekday - 1));
    final DateTime end = start.add(const Duration(days: 7));
    final List<PlannedWorkout> week =
        state.workouts
            .where(
              (PlannedWorkout workout) =>
                  !workout.date.isBefore(start) && workout.date.isBefore(end),
            )
            .toList()
          ..sort(
            (PlannedWorkout a, PlannedWorkout b) => a.date.compareTo(b.date),
          );
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
      children: <Widget>[
        Text('This week', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 5),
        Text(
          '${week.length} planned sessions · ${week.fold<int>(0, (int total, PlannedWorkout item) => total + item.totalSets)} working sets',
        ),
        const SizedBox(height: 16),
        ...week.map(
          (PlannedWorkout workout) =>
              _WeekWorkoutTile(workout: workout, unit: state.profile.unit),
        ),
        if (week.isEmpty)
          const _NoticeCard(
            color: _workoutMint,
            icon: Icons.event_available_rounded,
            title: 'No sessions this week',
            body: 'Your next generated week will appear here.',
          ),
      ],
    );
  }
}

class _HistoryPage extends StatelessWidget {
  const _HistoryPage({required this.state});

  final WorkoutState state;

  @override
  Widget build(BuildContext context) {
    final List<PlannedWorkout> history =
        state.workouts
            .where(
              (PlannedWorkout workout) =>
                  workout.status == WorkoutStatus.completed ||
                  workout.status == WorkoutStatus.missed ||
                  workout.status == WorkoutStatus.recovery,
            )
            .toList()
          ..sort(
            (PlannedWorkout a, PlannedWorkout b) => b.date.compareTo(a.date),
          );
    final int wins = history
        .where((PlannedWorkout item) => item.status == WorkoutStatus.completed)
        .length;
    final int misses = history
        .where((PlannedWorkout item) => item.status == WorkoutStatus.missed)
        .length;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
      children: <Widget>[
        Text('History', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        Row(
          children: <Widget>[
            Expanded(
              child: _StatCard(
                label: 'COMPLETED',
                value: '$wins',
                color: _workoutMint,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatCard(
                label: 'MISSED',
                value: '$misses',
                color: const Color(0xFFF87171),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (history.isEmpty)
          const _NoticeCard(
            color: _workoutAmber,
            icon: Icons.history_rounded,
            title: 'Your record starts here',
            body: 'Completed and missed matchups will appear after their scheduled day.',
          )
        else
          ...history.map(
            (PlannedWorkout workout) => _HistoryTile(workout: workout),
          ),
      ],
    );
  }
}

class _ProfilePage extends StatelessWidget {
  const _ProfilePage({required this.state, required this.onReset});

  final WorkoutState state;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final WorkoutProfile profile = state.profile;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
      children: <Widget>[
        Text('Plan profile', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 14),
        Card(
          child: Column(
            children: <Widget>[
              ListTile(
                leading: const Icon(Icons.flag_rounded),
                title: const Text('Goal'),
                trailing: Text(profile.goal.label),
              ),
              ListTile(
                leading: const Icon(Icons.calendar_month_rounded),
                title: const Text('Training days'),
                trailing: Text('${profile.trainingDays.length} / week'),
              ),
              ListTile(
                leading: const Icon(Icons.timer_rounded),
                title: const Text('Session length'),
                trailing: Text('${profile.sessionMinutes} min'),
              ),
              ListTile(
                leading: const Icon(Icons.scale_rounded),
                title: const Text('Units'),
                trailing: Text(profile.unit.shortLabel),
              ),
              ListTile(
                leading: const Icon(Icons.shield_rounded),
                title: const Text('Plan mode'),
                trailing: Text(profile.isYouth ? 'Youth' : 'Adult'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        const _NoticeCard(
          color: _workoutMint,
          icon: Icons.lock_rounded,
          title: 'Private by design',
          body: 'The plan and every logged set stay in this app and are included in your One Hub backup.',
        ),
        const SizedBox(height: 20),
        OutlinedButton.icon(
          onPressed: onReset,
          icon: const Icon(Icons.restart_alt_rounded),
          label: const Text('Build a new plan'),
        ),
      ],
    );
  }
}

class _ChoiceCard extends StatelessWidget {
  const _ChoiceCard({
    required this.selected,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });
  final bool selected;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: selected
        ? Theme.of(context).colorScheme.primaryContainer
        : Theme.of(context).cardColor,
    borderRadius: BorderRadius.circular(18),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(
            color: selected
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.outlineVariant,
          ),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          children: <Widget>[
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 3),
                  Text(subtitle),
                ],
              ),
            ),
            if (selected) const Icon(Icons.check_circle_rounded),
          ],
        ),
      ),
    ),
  );
}

class _NoticeCard extends StatelessWidget {
  const _NoticeCard({
    required this.color,
    required this.icon,
    required this.title,
    required this.body,
    this.footer,
  });
  final Color color;
  final IconData icon;
  final String title;
  final String body;
  final Widget? footer;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.10),
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: color.withValues(alpha: 0.22)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          children: <Widget>[
            Icon(icon, color: color),
            const SizedBox(width: 9),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
        const SizedBox(height: 7),
        Text(body),
        ?footer,
      ],
    ),
  );
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({
    required this.icon,
    required this.label,
    required this.value,
  });
  final IconData icon;
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: CircleAvatar(child: Icon(icon, size: 19)),
    title: Text(label),
    subtitle: Text(value, maxLines: 2, overflow: TextOverflow.ellipsis),
  );
}

class _MatchScore extends StatelessWidget {
  const _MatchScore({
    required this.label,
    required this.value,
    required this.color,
    this.alignEnd = false,
  });
  final String label;
  final int value;
  final Color color;
  final bool alignEnd;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: alignEnd
        ? CrossAxisAlignment.end
        : CrossAxisAlignment.start,
    children: <Widget>[
      Text(
        label,
        style: const TextStyle(
          color: Color(0xFF94A3B8),
          fontSize: 9,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.8,
        ),
      ),
      Text(
        '$value',
        style: TextStyle(
          color: color,
          fontSize: 24,
          fontWeight: FontWeight.w900,
        ),
      ),
    ],
  );
}

class _RestDayCard extends StatelessWidget {
  const _RestDayCard({required this.next});
  final PlannedWorkout? next;
  @override
  Widget build(BuildContext context) => _NoticeCard(
    color: _workoutMint,
    icon: Icons.bedtime_rounded,
    title: 'Recovery is part of the plan',
    body: next == null
        ? 'There is no workout scheduled today.'
        : 'Next: ${_weekday(next!.date)} · ${next!.title}',
  );
}

class _MiniPrincipleCard extends StatelessWidget {
  const _MiniPrincipleCard();
  @override
  Widget build(BuildContext context) => const _NoticeCard(
    color: _workoutAmber,
    icon: Icons.lightbulb_rounded,
    title: 'Win with control',
    body: 'The target is a strong set with 2–3 reps left—not failure. Extra-rep Resolve is intentionally capped.',
  );
}

class _WeekWorkoutTile extends StatelessWidget {
  const _WeekWorkoutTile({required this.workout, required this.unit});
  final PlannedWorkout workout;
  final WorkoutUnit unit;
  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 10),
    child: ListTile(
      leading: _StatusIcon(status: workout.status),
      title: Text(workout.title),
      subtitle: Text(
        '${_weekday(workout.date)} · ${workout.totalSets} sets · Pressure ${workout.pressure}',
      ),
      trailing: Text(switch (workout.status) {
        WorkoutStatus.completed ||
        WorkoutStatus.missed => _signed(workout.resolveDelta),
        WorkoutStatus.recovery => 'REST',
        _ => 'OPEN',
      }, style: const TextStyle(fontWeight: FontWeight.w900)),
    ),
  );
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.workout});
  final PlannedWorkout workout;
  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 9),
    child: ListTile(
      leading: _StatusIcon(status: workout.status),
      title: Text(workout.title),
      subtitle: Text(
        '${_shortDate(workout.date)} · ${(workout.performanceScore * 100).round()}% performance',
      ),
      trailing: Text(
        workout.status == WorkoutStatus.recovery
            ? '±0'
            : _signed(workout.resolveDelta),
        style: TextStyle(
          fontWeight: FontWeight.w900,
          color: workout.resolveDelta >= 0
              ? const Color(0xFF059669)
              : const Color(0xFFDC2626),
        ),
      ),
    ),
  );
}

class _StatusIcon extends StatelessWidget {
  const _StatusIcon({required this.status});
  final WorkoutStatus status;
  @override
  Widget build(BuildContext context) {
    final (IconData, Color) value = switch (status) {
      WorkoutStatus.completed => (Icons.check_circle_rounded, _workoutMint),
      WorkoutStatus.missed => (Icons.cancel_rounded, const Color(0xFFF87171)),
      WorkoutStatus.recovery => (
        Icons.bedtime_rounded,
        const Color(0xFF60A5FA),
      ),
      WorkoutStatus.inProgress => (Icons.play_circle_rounded, _workoutAmber),
      WorkoutStatus.scheduled => (
        Icons.radio_button_unchecked_rounded,
        const Color(0xFF94A3B8),
      ),
    };
    return Icon(value.$1, color: value.$2);
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label;
  final String value;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.10),
      borderRadius: BorderRadius.circular(18),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          label,
          style: const TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.8,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 26,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    ),
  );
}

const TextStyle _eyebrowStyle = TextStyle(
  fontSize: 10,
  fontWeight: FontWeight.w900,
  letterSpacing: 1.0,
);

String _weight(double value, WorkoutUnit unit) {
  final String amount = value == value.roundToDouble()
      ? value.round().toString()
      : value.toStringAsFixed(1);
  return '$amount ${unit.shortLabel}';
}

String _signed(int value) => value >= 0 ? '+$value' : '$value';

String _weekday(DateTime date) => const <String>[
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
][date.weekday - 1];

String _shortDate(DateTime date) => '${date.month}/${date.day}/${date.year}';
