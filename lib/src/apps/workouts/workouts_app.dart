import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';
import 'resolve_badge.dart';
import 'workout_coach.dart';
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
    if (profile.notificationsEnabled) {
      await _notifications.requestPermission();
    }
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
      _CoachPage(state: state),
      _ProfilePage(
        state: state,
        onReset: _reset,
        onChanged: _save,
        onRequestPermission: _notifications.requestPermission,
      ),
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
              icon: Icon(Icons.psychology_outlined),
              selectedIcon: Icon(Icons.psychology_rounded),
              label: 'Coach',
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
                'How Workouts builds the plan',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
              ),
              SizedBox(height: 12),
              Text(
                'Sessions come in labeled varieties—A, B, C—that rotate real exercise variants week to week, so every muscle is trained at least twice weekly while volume stays in the evidence-backed 10–20 sets per muscle range. The Week tab shows your muscle balance against that range.',
              ),
              SizedBox(height: 12),
              Text(
                'Loads come from a conservative estimate of a recent 1–10 rep set, prescribed as a goal-specific percentage. Beating the top of a rep range with reps to spare raises future loads automatically—at home, bodyweight exercises add reps and then graduate to harder variations.',
              ),
              SizedBox(height: 12),
              Text(
                'Swap any exercise before you start. Leave “Remember my picks” on and the coach plans around your swaps in future sessions.',
              ),
              Text(
                'Resolve follows the rep total. Beat the planned reps and Resolve rises—more when the workout outranked you. Fall short and it dips slightly. Recovery days are free.',
              ),
              SizedBox(height: 12),
              Text(
                'Every recommendation is grounded in published research—open the Coach tab for the studies behind it.',
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
  bool _safetyAcknowledged = false;
  WorkoutGoal _goal = WorkoutGoal.balanced;
  WorkoutExperience _experience = WorkoutExperience.newLifter;
  WorkoutSplit _split = WorkoutSplit.fullBody;
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
  bool _remindersEnabled = true;
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
    0 => _safetyAcknowledged,
    2 => _days.length >= 2,
    4 => _equipment.isNotEmpty,
    _ => true,
  };

  void _next() {
    if (!_canContinue) {
      return;
    }
    if (_step < 6) {
      setState(() => _step++);
    } else {
      widget.onComplete(_buildProfile());
    }
  }

  WorkoutProfile _buildProfile() {
    final Map<String, double> maxes = <String, double>{};
    for (final WorkoutExerciseDefinition exercise
        in WorkoutEngine.baselineExercises(_equipment)) {
      final double? weight = double.tryParse(
        _weightControllers[exercise.id]?.text ?? '',
      );
      final int? reps = int.tryParse(_repControllers[exercise.id]?.text ?? '');
      if (weight == null || reps == null) {
        continue;
      }
      final double? estimate = WorkoutEngine.estimateOneRepMax(weight, reps);
      if (estimate != null) {
        maxes[exercise.id] = estimate;
      }
    }
    return WorkoutProfile(
      goal: _goal,
      experience: _experience,
      split: _split,
      trainingDays: Set<int>.of(_days),
      sessionMinutes: _minutes,
      equipment: Set<WorkoutEquipment>.of(_equipment),
      unit: _unit,
      reminderMinutes: _reminderMinutes,
      notificationsEnabled: _remindersEnabled,
      estimatedMaxes: maxes,
    );
  }

  Future<void> _pickReminderTime() async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(
        hour: _reminderMinutes ~/ 60,
        minute: _reminderMinutes % 60,
      ),
    );
    if (picked != null) {
      setState(() => _reminderMinutes = picked.hour * 60 + picked.minute);
    }
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
                'SETUP ${_step + 1} OF 7',
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
                  value: (_step + 1) / 7,
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
                    _step == 6
                        ? Icons.auto_awesome_rounded
                        : Icons.arrow_forward_rounded,
                  ),
                  label: Text(_step == 6 ? 'Build my week' : 'Continue'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _content() => switch (_step) {
    0 => _welcomeStep(),
    1 => _goalStep(),
    2 => _scheduleStep(),
    3 => _splitStep(),
    4 => _equipmentStep(),
    5 => _baselineStep(),
    _ => _remindersStep(),
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

  Widget _welcomeStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _heading(
          'A plan built around your answers',
          'Pick your split, approve the exercises, and get weight suggestions grounded in training research. You can leave every strength baseline blank.',
        ),
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
          'Select at least two. An unopened workout is marked missed when its day ends at 12:00 AM. Each day can have its own reminder time.',
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
      ],
    );
  }

  Widget _splitStep() {
    final WorkoutSplit recommended = WorkoutCoach.recommendedSplit(
      _days.length,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _heading(
          'How should the week be split?',
          'You choose the split; the plan fills in exercises and weights. You can swap any exercise before starting.',
        ),
        _NoticeCard(
          color: _workoutMint,
          icon: Icons.auto_awesome_rounded,
          title: 'Recommended for ${_days.length} days',
          body: WorkoutCoach.splitAdvice(_days.length),
          footer: _split == recommended
              ? null
              : TextButton.icon(
                  onPressed: () => setState(() => _split = recommended),
                  icon: const Icon(Icons.check_rounded, size: 16),
                  label: Text('Use ${recommended.label}'),
                ),
        ),
        const SizedBox(height: 12),
        ...WorkoutSplit.values.map(
          (WorkoutSplit split) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _ChoiceCard(
              selected: _split == split,
              title: split.label,
              subtitle: split.description,
              onTap: () => setState(() => _split = split),
            ),
          ),
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
          'The exercise library chooses movements and substitutions that match what you have. Bodyweight is always available as a fallback.',
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
    final List<WorkoutExerciseDefinition> baselines =
        WorkoutEngine.baselineExercises(_equipment);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _heading(
          'Optional strength baseline',
          'Enter the most weight you recently completed for 1–10 clean repetitions. Leave anything unknown blank—there is no max test, and loads also adapt from what you log.',
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

  Widget _remindersStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _heading(
          'Reminders and review',
          'Reminders fire on every scheduled day. You can give each weekday its own time later in Profile.',
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          value: _remindersEnabled,
          onChanged: (bool value) => setState(() => _remindersEnabled = value),
          title: const Text('Workout reminders'),
          subtitle: const Text(
            'A notification on each training day before the session is due.',
          ),
        ),
        if (_remindersEnabled)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.notifications_rounded),
            title: const Text('Default reminder time'),
            trailing: Text(
              _formatMinutes(_reminderMinutes),
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            onTap: _pickReminderTime,
          ),
        const SizedBox(height: 14),
        _ReviewRow(icon: Icons.flag_rounded, label: 'Goal', value: _goal.label),
        _ReviewRow(
          icon: Icons.call_split_rounded,
          label: 'Split',
          value: _split.label,
        ),
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
        const SizedBox(height: 18),
        const _NoticeCard(
          color: _workoutMint,
          icon: Icons.bolt_rounded,
          title: 'Resolve starts at 1,000',
          body: 'Each workout has a Pressure rating. Beat the planned rep total to gain Resolve—more when the workout outranks you. Fall short and it dips slightly.',
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

  Future<void> _toggleLocation(PlannedWorkout workout) async {
    setState(() {
      WorkoutEngine.relocateSession(
        workout,
        widget.state.profile,
        workout.location == WorkoutLocation.gym
            ? WorkoutLocation.home
            : WorkoutLocation.gym,
      );
    });
    await widget.onChanged();
  }

  Future<void> _openEditorAt(PlannedWorkout workout, int? index) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (BuildContext context) => _ExercisePickerSheet(
        state: widget.state,
        workout: workout,
        onChanged: widget.onChanged,
        focusIndex: index,
      ),
    );
    if (mounted) {
      setState(() {});
    }
  }

  /// Rest day, but the user wants to train: pull the next scheduled session
  /// to today.
  Future<void> _pullForward(PlannedWorkout workout) async {
    setState(() => workout.date = WorkoutEngine.dateOnly(DateTime.now()));
    await widget.onChanged();
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
          _RestDayCard(
            next: _next,
            onTrainNow: _next == null
                ? null
                : () => _pullForward(_next!),
          )
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
            onToggleLocation: today.status == WorkoutStatus.scheduled
                ? () => _toggleLocation(today)
                : null,
            onEditExercise: today.status == WorkoutStatus.scheduled
                ? (int? index) => _openEditorAt(today, index)
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
    required this.onToggleLocation,
    required this.onEditExercise,
  });

  final PlannedWorkout workout;
  final int resolve;
  final WorkoutUnit unit;
  final VoidCallback? onStart;
  final VoidCallback? onReschedule;
  final VoidCallback? onRecovery;
  final VoidCallback? onToggleLocation;
  final ValueChanged<int?>? onEditExercise;

  @override
  Widget build(BuildContext context) {
    final String status = switch (workout.status) {
      WorkoutStatus.scheduled => 'READY',
      WorkoutStatus.inProgress => 'IN PROGRESS',
      WorkoutStatus.completed => 'WON · ${_signed(workout.resolveDelta)}',
      WorkoutStatus.missed => 'MISSED · ${_signed(workout.resolveDelta)}',
      WorkoutStatus.recovery => 'RECOVERY',
    };
    final bool editable = onEditExercise != null;
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
                if (onToggleLocation != null)
                  SegmentedButton<WorkoutLocation>(
                    key: const ValueKey<String>('workouts-toggle-location'),
                    showSelectedIcon: false,
                    style: const ButtonStyle(
                      visualDensity: VisualDensity.compact,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    segments: const <ButtonSegment<WorkoutLocation>>[
                      ButtonSegment<WorkoutLocation>(
                        value: WorkoutLocation.gym,
                        icon: Icon(Icons.fitness_center_rounded, size: 16),
                        label: Text('Gym'),
                      ),
                      ButtonSegment<WorkoutLocation>(
                        value: WorkoutLocation.home,
                        icon: Icon(Icons.home_rounded, size: 16),
                        label: Text('Home'),
                      ),
                    ],
                    selected: <WorkoutLocation>{workout.location},
                    onSelectionChanged: onToggleLocation == null
                        ? null
                        : (Set<WorkoutLocation> _) => onToggleLocation!(),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(workout.title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: <Widget>[
                for (final WorkoutMuscle muscle in WorkoutEngine.sessionMuscles(
                  workout.exercises,
                ))
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: _workoutNavy.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      muscle.label,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
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
            for (
              int index = 0;
              index < workout.exercises.length;
              index++
            )
              _ExerciseRow(
                exercise: workout.exercises[index],
                unit: unit,
                editable: editable,
                onTap: editable
                    ? () => onEditExercise!(index)
                    : null,
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
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 6,
                runSpacing: 2,
                children: <Widget>[
                  if (editable)
                    TextButton(
                      onPressed: () => onEditExercise!(null),
                      child: const Text('Edit exercises'),
                    ),
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

class _ExerciseRow extends StatelessWidget {
  const _ExerciseRow({
    required this.exercise,
    required this.unit,
    required this.editable,
    required this.onTap,
  });

  final PlannedExercise exercise;
  final WorkoutUnit unit;
  final bool editable;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final WorkoutExerciseDefinition? definition = WorkoutEngine.definitionFor(
      exercise.exerciseId,
    );
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 5, horizontal: 2),
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
            if (editable) ...<Widget>[
              const SizedBox(width: 6),
              Tooltip(
                message: definition == null
                    ? 'Swap exercise'
                    : 'Swap · trains ${definition.primary.label.toLowerCase()}',
                child: Icon(
                  Icons.tune_rounded,
                  size: 17,
                  color: Theme.of(context).colorScheme.outline,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Session editor: swap any slot for a ranked alternative, pick any exercise
/// from the muscle-group catalog, add or remove slots, and optionally let the
/// coach remember picks for future sessions.
class _ExercisePickerSheet extends StatefulWidget {
  const _ExercisePickerSheet({
    required this.state,
    required this.workout,
    required this.onChanged,
    this.focusIndex,
  });

  final WorkoutState state;
  final PlannedWorkout workout;
  final Future<void> Function() onChanged;
  final int? focusIndex;

  @override
  State<_ExercisePickerSheet> createState() => _ExercisePickerSheetState();
}

class _ExercisePickerSheetState extends State<_ExercisePickerSheet> {
  bool _remember = true;

  WorkoutProfile get profile => widget.state.profile;

  WorkoutLocation get location => widget.workout.location;

  void _replace(int index, WorkoutExerciseDefinition definition) {
    final String slotPattern = widget.workout.exercises[index].pattern;
    setState(() {
      widget.workout.exercises[index] = WorkoutEngine.planExerciseFor(
        profile,
        definition,
        location,
      );
    });
    // Only same-pattern swaps are remembered, so a one-off odd pick never
    // leaks into unrelated slots of future sessions.
    if (_remember && definition.pattern == slotPattern) {
      profile.exercisePreferences['${location.name}:$slotPattern'] =
          definition.id;
    }
    widget.onChanged();
  }

  void _remove(int index) {
    setState(() => widget.workout.exercises.removeAt(index));
    widget.onChanged();
  }

  void _append(WorkoutExerciseDefinition definition) {
    setState(
      () => widget.workout.exercises.add(
        WorkoutEngine.planExerciseFor(profile, definition, location),
      ),
    );
    widget.onChanged();
  }

  void _restoreCoachPick(int index) {
    final PlannedExercise current = widget.workout.exercises[index];
    final List<WorkoutExerciseDefinition> options = WorkoutEngine
        .alternativesFor(current.pattern, profile, location);
    if (options.isEmpty) {
      return;
    }
    _replace(index, options.first);
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      maxChildSize: 0.92,
      initialChildSize: 0.75,
      builder: (BuildContext context, ScrollController scrollController) {
        return ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
          children: <Widget>[
            Text('Build this session', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              'Tap an exercise to swap it. ★ marks the coach’s top pick for the slot, and swaps keep the sets and target reps.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _remember,
              onChanged: (bool value) => setState(() => _remember = value),
              title: const Text('Remember my picks'),
              subtitle: const Text(
                'Future sessions plan around your swaps instead of the rotation.',
              ),
            ),
            const SizedBox(height: 4),
            for (
              int index = 0;
              index < widget.workout.exercises.length;
              index++
            )
              _slot(index),
            const SizedBox(height: 8),
            _addExerciseTile(),
          ],
        );
      },
    );
  }

  Widget _slot(int index) {
    final PlannedExercise current = widget.workout.exercises[index];
    final List<WorkoutExerciseDefinition> alternatives =
        WorkoutEngine.alternativesFor(current.pattern, profile, location);
    final String? coachPickId = alternatives.isEmpty
        ? null
        : alternatives.first.id;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ExpansionTile(
        key: ValueKey<String>('workout-slot-$index'),
        initiallyExpanded: index == widget.focusIndex,
        tilePadding: const EdgeInsets.symmetric(horizontal: 14),
        childrenPadding: const EdgeInsets.fromLTRB(8, 0, 8, 10),
        title: Text(current.name),
        subtitle: Text(
          '${current.pattern} · ${current.sets} × ${current.targetReps}',
        ),
        children: <Widget>[
          for (final WorkoutExerciseDefinition definition in alternatives)
            _optionTile(index, current, definition),
          if (coachPickId != null && current.exerciseId != coachPickId)
            TextButton.icon(
              onPressed: () => _restoreCoachPick(index),
              icon: const Icon(Icons.auto_awesome_rounded, size: 15),
              label: Text('Restore ${alternatives.first.name}'),
            ),
          if (widget.workout.exercises.length > 3)
            TextButton.icon(
              onPressed: () => _remove(index),
              icon: const Icon(Icons.remove_circle_outline_rounded, size: 15),
              label: const Text('Remove from session'),
            ),
        ],
      ),
    );
  }

  Widget _optionTile(
    int index,
    PlannedExercise current,
    WorkoutExerciseDefinition definition,
  ) {
    final bool isCurrent = definition.id == current.exerciseId;
    return ListTile(
      dense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 10),
      leading: definition.rank == 1
          ? const Icon(Icons.star_rounded, size: 18, color: _workoutAmber)
          : const SizedBox(width: 18),
      title: Text(definition.name),
      subtitle: Text(
        _optionSubtitle(definition),
        style: Theme.of(context).textTheme.bodySmall,
      ),
      trailing: isCurrent
          ? const Icon(Icons.check_rounded, size: 18)
          : null,
      onTap: isCurrent ? null : () => _replace(index, definition),
    );
  }

  Widget _addExerciseTile() {
    final Map<WorkoutMuscle, List<WorkoutExerciseDefinition>> catalog =
        WorkoutEngine.catalogByMuscle(profile, location);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 14),
        childrenPadding: const EdgeInsets.fromLTRB(8, 0, 8, 10),
        title: const Text('Add an exercise'),
        subtitle: const Text('Browse by muscle group'),
        children: <Widget>[
          for (
            final MapEntry<WorkoutMuscle, List<WorkoutExerciseDefinition>> group
            in catalog.entries
          ) ...<Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 2),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  group.key.label.toUpperCase(),
                  style: _eyebrowStyle.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
            ),
            for (final WorkoutExerciseDefinition definition in group.value)
              ListTile(
                dense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 10),
                leading: definition.rank == 1
                    ? const Icon(
                        Icons.star_rounded,
                        size: 18,
                        color: _workoutAmber,
                      )
                    : const SizedBox(width: 18),
                title: Text(definition.name),
                subtitle: Text(
                  _optionSubtitle(definition),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                onTap: () => _append(definition),
              ),
          ],
        ],
      ),
    );
  }

  String _optionSubtitle(WorkoutExerciseDefinition definition) {
    final String kind = definition.compound ? 'compound' : 'accessory';
    if (definition.equipment == WorkoutEquipment.bodyweight) {
      return 'Bodyweight · $kind';
    }
    final double? max = WorkoutEngine.estimatedMaxFor(profile, definition.id);
    if (max == null) {
      return '${definition.equipment.label} · $kind · set weight when logging';
    }
    final String tag = WorkoutEngine.estimateIsApproximate(profile, definition.id)
        ? ' (est.)'
        : '';
    return '${definition.equipment.label} · $kind · around ${_weight(max, profile.unit)} max$tag';
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
        title: Text(delta >= 0 ? 'Pressure met' : 'Pressure slipped'),
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
              'Resolve ${_signed(delta)} · ${(widget.workout.performanceScore * 100).round()}% of target reps',
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

  void _flipLocation(PlannedWorkout workout) {
    WorkoutEngine.relocateSession(
      workout,
      state.profile,
      workout.location == WorkoutLocation.gym
          ? WorkoutLocation.home
          : WorkoutLocation.gym,
    );
    onChanged();
  }

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
    final Map<WorkoutMuscle, double> sets = WorkoutEngine.setsByMuscle(
      week.expand((PlannedWorkout workout) => workout.exercises),
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
        _MuscleBalanceCard(sets: sets),
        const SizedBox(height: 14),
        ...week.map(
          (PlannedWorkout workout) => _WeekWorkoutTile(
            workout: workout,
            unit: state.profile.unit,
            onFlipLocation: workout.status == WorkoutStatus.scheduled
                ? () => _flipLocation(workout)
                : null,
          ),
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

/// Planned sets per muscle versus the evidence-backed 10–20 weekly band.
class _MuscleBalanceCard extends StatelessWidget {
  const _MuscleBalanceCard({required this.sets});

  final Map<WorkoutMuscle, double> sets;

  @override
  Widget build(BuildContext context) {
    if (sets.isEmpty) {
      return const SizedBox.shrink();
    }
    final List<WorkoutMuscle> trained =
        WorkoutMuscle.values
            .where((WorkoutMuscle muscle) => (sets[muscle] ?? 0) >= 1)
            .toList();
    final List<WorkoutMuscle> light = trained
        .where((WorkoutMuscle muscle) => (sets[muscle] ?? 0) < 10)
        .toList();
    final String nudge = light.isEmpty
        ? 'Every trained muscle is inside the 10–20 set range.'
        : '${light.first.label} is light this week (${(sets[light.first] ?? 0).round()} sets)—one or two more sets brings it into range.';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'MUSCLE BALANCE',
              style: _eyebrowStyle.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: <Widget>[
                for (final WorkoutMuscle muscle in trained)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: (sets[muscle] ?? 0) < 10
                          ? _workoutAmber.withValues(alpha: 0.14)
                          : _workoutMint.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '${muscle.label} ${(sets[muscle] ?? 0).round()}',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: (sets[muscle] ?? 0) < 10
                            ? const Color(0xFFB45309)
                            : const Color(0xFF059669),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Text(nudge, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
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

/// Searchable, research-grounded answers plus a summary of the user's split.
class _CoachPage extends StatefulWidget {
  const _CoachPage({required this.state});

  final WorkoutState state;

  @override
  State<_CoachPage> createState() => _CoachPageState();
}

class _CoachPageState extends State<_CoachPage> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final WorkoutProfile profile = widget.state.profile;
    final List<CoachEntry> entries = WorkoutCoach.search(_query);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
      children: <Widget>[
        Text('Coach', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text('Ask a question or browse the research behind your plan.'),
        const SizedBox(height: 12),
        TextField(
          key: const ValueKey<String>('workouts-coach-search'),
          onChanged: (String value) => setState(() => _query = value),
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search_rounded),
            hintText: 'Search: sets, failure, home, splits…',
            border: OutlineInputBorder(),
            isDense: true,
          ),
        ),
        const SizedBox(height: 14),
        _NoticeCard(
          color: _workoutMint,
          icon: Icons.call_split_rounded,
          title: 'Your split: ${profile.split.label}',
          body:
              '${profile.split.description} ${WorkoutCoach.splitAdvice(profile.trainingDays.length)}',
        ),
        const SizedBox(height: 14),
        Card(
          margin: const EdgeInsets.only(bottom: 14),
          child: ExpansionTile(
            tilePadding: const EdgeInsets.symmetric(horizontal: 14),
            childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
            title: const Text(
              'Best exercises by muscle group',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            subtitle: const Text('The coach’s top two picks for each muscle'),
            children: <Widget>[
              for (
                final (WorkoutMuscle muscle, List<String> picks)
                in WorkoutCoach.bestPicksByMuscle()
              )
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    muscle.label,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(picks.join(' · ')),
                ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (entries.isEmpty)
          const _NoticeCard(
            color: _workoutAmber,
            icon: Icons.search_off_rounded,
            title: 'No matches',
            body: 'Try a shorter word like “sets”, “home”, or “failure”.',
          )
        else
          ...entries.map(
            (CoachEntry entry) => Card(
              margin: const EdgeInsets.only(bottom: 9),
              child: ExpansionTile(
                tilePadding: const EdgeInsets.symmetric(horizontal: 14),
                childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                title: Text(
                  entry.question,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text(entry.category),
                children: <Widget>[
                  Text(entry.answer),
                  const SizedBox(height: 8),
                  Text(
                    'Source: ${entry.source}',
                    style: Theme.of(context).textTheme.bodySmall
                        ?.copyWith(fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _ProfilePage extends StatefulWidget {
  const _ProfilePage({
    required this.state,
    required this.onReset,
    required this.onChanged,
    required this.onRequestPermission,
  });

  final WorkoutState state;
  final VoidCallback onReset;
  final Future<void> Function() onChanged;
  final Future<bool> Function() onRequestPermission;

  @override
  State<_ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<_ProfilePage> {
  Future<void> _toggleNotifications(bool value) async {
    final WorkoutProfile profile = widget.state.profile;
    if (value) {
      final bool granted = await widget.onRequestPermission();
      if (!granted) {
        return;
      }
    }
    setState(() => profile.notificationsEnabled = value);
    await widget.onChanged();
  }

  Future<void> _pickDefaultTime() async {
    final WorkoutProfile profile = widget.state.profile;
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(
        hour: profile.reminderMinutes ~/ 60,
        minute: profile.reminderMinutes % 60,
      ),
    );
    if (picked == null) {
      return;
    }
    setState(() => profile.reminderMinutes = picked.hour * 60 + picked.minute);
    await widget.onChanged();
  }

  Future<void> _pickDayTime(int weekday) async {
    final WorkoutProfile profile = widget.state.profile;
    final int current = profile.reminderMinutesFor(weekday);
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      helpText: 'Reminder time',
      initialTime: TimeOfDay(hour: current ~/ 60, minute: current % 60),
    );
    if (picked == null) {
      return;
    }
    setState(() {
      profile.reminderMinutesByDay[weekday] = picked.hour * 60 + picked.minute;
    });
    await widget.onChanged();
  }

  void _clearDayTime(int weekday) {
    setState(() => widget.state.profile.reminderMinutesByDay.remove(weekday));
    widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final WorkoutProfile profile = widget.state.profile;
    final List<int> days = profile.trainingDays.toList()..sort();
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
                leading: const Icon(Icons.call_split_rounded),
                title: const Text('Split'),
                trailing: Text(profile.split.label),
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
            ],
          ),
        ),
        const SizedBox(height: 14),
        Text('REMINDERS', style: _eyebrowStyle),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: <Widget>[
              SwitchListTile(
                value: profile.notificationsEnabled,
                onChanged: _toggleNotifications,
                title: const Text('Workout reminders'),
                subtitle: const Text(
                  'A notification on each training day before the session is due.',
                ),
              ),
              if (profile.notificationsEnabled) ...<Widget>[
                ListTile(
                  leading: const Icon(Icons.schedule_rounded),
                  title: const Text('Default time'),
                  trailing: Text(
                    _formatMinutes(profile.reminderMinutes),
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  onTap: _pickDefaultTime,
                ),
                for (final int day in days)
                  ListTile(
                    leading: const Icon(Icons.notifications_active_outlined),
                    title: Text(_weekday(DateTime(2024, 1, day))),
                    subtitle: Text(
                      profile.reminderMinutesByDay.containsKey(day)
                          ? 'Custom time'
                          : 'Uses the default',
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        Text(
                          _formatMinutes(profile.reminderMinutesFor(day)),
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.edit_rounded, size: 16),
                        if (profile.reminderMinutesByDay.containsKey(day))
                          IconButton(
                            tooltip: 'Use the default time again',
                            visualDensity: VisualDensity.compact,
                            onPressed: () => _clearDayTime(day),
                            icon: const Icon(Icons.close_rounded, size: 16),
                          ),
                      ],
                    ),
                    onTap: () => _pickDayTime(day),
                  ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 14),
        Text('HOME TRAINING', style: _eyebrowStyle),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: <Widget>[
              SwitchListTile(
                value: profile.homePullUpBar,
                onChanged: (bool value) {
                  setState(() => profile.homePullUpBar = value);
                  widget.onChanged();
                },
                title: const Text('Pull-up bar at home'),
                subtitle: const Text(
                  'Unlocks pull-ups and chin-ups in home sessions.',
                ),
              ),
              if (profile.exercisePreferences.isNotEmpty)
                ListTile(
                  leading: const Icon(Icons.swap_horiz_rounded),
                  title: const Text('Remembered exercise swaps'),
                  subtitle: const Text(
                    'The coach plans around your past picks.',
                  ),
                  trailing: TextButton(
                    onPressed: () {
                      setState(() => profile.exercisePreferences.clear());
                      widget.onChanged();
                    },
                    child: const Text('Forget'),
                  ),
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
          onPressed: widget.onReset,
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
  const _RestDayCard({required this.next, this.onTrainNow});
  final PlannedWorkout? next;
  final VoidCallback? onTrainNow;
  @override
  Widget build(BuildContext context) => _NoticeCard(
    color: _workoutMint,
    icon: Icons.bedtime_rounded,
    title: 'Recovery is part of the plan',
    body: next == null
        ? 'There is no workout scheduled today.'
        : 'Next: ${_weekday(next!.date)} · ${next!.title}',
    footer: onTrainNow == null
        ? null
        : TextButton.icon(
            onPressed: onTrainNow,
            icon: const Icon(Icons.bolt_rounded, size: 16),
            label: const Text('Train today instead'),
          ),
  );
}

class _MiniPrincipleCard extends StatelessWidget {
  const _MiniPrincipleCard();
  @override
  Widget build(BuildContext context) => const _NoticeCard(
    color: _workoutAmber,
    icon: Icons.lightbulb_rounded,
    title: 'Beat the rep total',
    body: 'Resolve follows the planned reps. Finish above the total to climb—extra reps count when a rep is still in reserve.',
  );
}

class _WeekWorkoutTile extends StatelessWidget {
  const _WeekWorkoutTile({
    required this.workout,
    required this.unit,
    this.onFlipLocation,
  });
  final PlannedWorkout workout;
  final WorkoutUnit unit;
  final VoidCallback? onFlipLocation;
  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 10),
    child: ListTile(
      leading: _StatusIcon(status: workout.status),
      title: Text(workout.title),
      subtitle: Text(
        '${_weekday(workout.date)} · ${workout.totalSets} sets · Pressure ${workout.pressure}'
        '${workout.location == WorkoutLocation.home ? ' · Home' : ''}',
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (onFlipLocation != null)
            IconButton(
              tooltip: workout.location == WorkoutLocation.gym
                  ? 'Switch this day to the home version'
                  : 'Switch this day back to the gym version',
              icon: Icon(
                workout.location == WorkoutLocation.gym
                    ? Icons.home_outlined
                    : Icons.fitness_center_rounded,
                size: 20,
              ),
              onPressed: onFlipLocation,
            ),
          Text(switch (workout.status) {
            WorkoutStatus.completed ||
            WorkoutStatus.missed => _signed(workout.resolveDelta),
            WorkoutStatus.recovery => 'REST',
            _ => 'OPEN',
          }, style: const TextStyle(fontWeight: FontWeight.w900)),
        ],
      ),
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
        '${_shortDate(workout.date)} · ${(workout.performanceScore * 100).round()}% of target reps',
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

String _formatMinutes(int minutes) {
  final int hour = minutes ~/ 60;
  final int minute = minutes % 60;
  final String suffix = hour >= 12 ? 'PM' : 'AM';
  final int hour12 = hour % 12 == 0 ? 12 : hour % 12;
  return '$hour12:${minute.toString().padLeft(2, '0')} $suffix';
}

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
