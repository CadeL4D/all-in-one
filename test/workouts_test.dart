import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:all_in_one/src/apps/workouts/workout_coach.dart';
import 'package:all_in_one/src/apps/workouts/workout_engine.dart';
import 'package:all_in_one/src/apps/workouts/workout_models.dart';
import 'package:all_in_one/src/apps/workouts/workouts_app.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test('estimated max is conservative and limited to 1-10 rep sets', () {
    expect(WorkoutEngine.estimateOneRepMax(100, 1), 100);
    expect(WorkoutEngine.estimateOneRepMax(100, 5), closeTo(112.5, 0.001));
    expect(WorkoutEngine.estimateOneRepMax(100, 11), isNull);
    expect(WorkoutEngine.estimateOneRepMax(0, 5), isNull);
  });

  test('plans prescribe estimated loads from baselines', () {
    final DateTime monday = DateTime(2026, 8, 17);
    final WorkoutProfile profile = _profile(
      days: <int>{DateTime.monday, DateTime.wednesday},
      maxes: <String, double>{
        'back_squat': 200,
        'bench_press': 150,
        'deadlift': 250,
      },
    );
    final List<PlannedWorkout> plan = WorkoutEngine.generateSchedule(
      profile: profile,
      resolve: 1000,
      now: monday,
      days: 7,
    );
    expect(plan, hasLength(2));
    expect(
      plan
          .expand((PlannedWorkout workout) => workout.exercises)
          .where((PlannedExercise exercise) => exercise.weight != null),
      isNotEmpty,
    );
  });

  test('splits rotate templates across the training week', () {
    final DateTime monday = DateTime(2026, 8, 17);
    final List<PlannedWorkout> upperLower = WorkoutEngine.generateSchedule(
      profile: _profile(
        days: <int>{
          DateTime.monday,
          DateTime.tuesday,
          DateTime.thursday,
          DateTime.friday,
        },
        split: WorkoutSplit.upperLower,
      ),
      resolve: 1000,
      now: monday,
      days: 7,
    );
    expect(upperLower.map((PlannedWorkout w) => w.focus).toList(), <String>[
      'upper_a',
      'lower_a',
      'upper_b',
      'lower_b',
    ]);

    final List<PlannedWorkout> ppl = WorkoutEngine.generateSchedule(
      profile: _profile(
        days: <int>{
          DateTime.monday,
          DateTime.tuesday,
          DateTime.wednesday,
          DateTime.thursday,
          DateTime.friday,
        },
        split: WorkoutSplit.pushPullLegs,
      ),
      resolve: 1000,
      now: monday,
      days: 7,
    );
    expect(ppl.map((PlannedWorkout w) => w.focus).toList(), <String>[
      'push_a',
      'pull_a',
      'legs_a',
      'push_b',
      'pull_b',
    ]);
  });

  test('sessions rotate through different exercise variants', () {
    final DateTime monday = DateTime(2026, 8, 17);
    final WorkoutProfile profile = _profile(
      days: <int>{DateTime.monday, DateTime.wednesday},
      maxes: <String, double>{'bench_press': 150},
    );
    final List<PlannedWorkout> first = WorkoutEngine.generateSchedule(
      profile: profile,
      resolve: 1000,
      now: monday,
      days: 14,
    );
    final Set<String> chestPicks = first
        .expand(
          (PlannedWorkout workout) => workout.exercises.where(
            (PlannedExercise exercise) => exercise.pattern == 'Horizontal push',
          ),
        )
        .map((PlannedExercise exercise) => exercise.exerciseId)
        .toSet();
    expect(chestPicks.length, greaterThanOrEqualTo(2));

    // The rotation is deterministic: regenerating yields the same sessions.
    final List<PlannedWorkout> second = WorkoutEngine.generateSchedule(
      profile: profile,
      resolve: 1000,
      now: monday,
      days: 14,
    );
    expect(
      second
          .expand((PlannedWorkout workout) => workout.exercises)
          .map((PlannedExercise exercise) => exercise.exerciseId)
          .toList(),
      first
          .expand((PlannedWorkout workout) => workout.exercises)
          .map((PlannedExercise exercise) => exercise.exerciseId)
          .toList(),
    );
  });

  test('remembered swaps steer future plans and stay location-scoped', () {
    final DateTime monday = DateTime(2026, 8, 17);
    final WorkoutProfile profile = _profile(
      days: <int>{DateTime.monday, DateTime.wednesday},
      maxes: <String, double>{'bench_press': 150},
    );
    profile.exercisePreferences['gym:Horizontal push'] = 'incline_bench_press';

    final List<PlannedWorkout> plan = WorkoutEngine.generateSchedule(
      profile: profile,
      resolve: 1000,
      now: monday,
      days: 14,
    );
    final List<String> gymChest = plan
        .expand(
          (PlannedWorkout workout) => workout.exercises.where(
            (PlannedExercise exercise) => exercise.pattern == 'Horizontal push',
          ),
        )
        .map((PlannedExercise exercise) => exercise.exerciseId)
        .toList();
    expect(gymChest, everyElement('incline_bench_press'));

    // The home version ignores gym preferences.
    WorkoutEngine.relocateSession(plan.first, profile, WorkoutLocation.home);
    final List<String> homeChest = plan.first.exercises
        .where(
          (PlannedExercise exercise) => exercise.pattern == 'Horizontal push',
        )
        .map((PlannedExercise exercise) => exercise.exerciseId)
        .toList();
    expect(homeChest, everyElement('push_up'));
  });

  test('bodyweight sessions add reps, then graduate to harder variations', () {
    final PlannedWorkout done = PlannedWorkout(
      id: 'done',
      date: DateTime(2026, 8, 17),
      title: 'Home session',
      pressure: 1000,
      exercises: <PlannedExercise>[
        PlannedExercise(
          exerciseId: 'push_up',
          name: 'Push-up',
          pattern: 'Horizontal push',
          sets: 3,
          targetReps: 20,
          repRangeMax: 20,
          targetRir: 2,
          weight: null,
          instructions: 'Test',
        ),
      ],
    );
    for (final WorkoutSetLog set in done.exercises.single.logs) {
      set
        ..completed = true
        ..actualReps = 20
        ..rir = 2;
    }
    final PlannedWorkout future = PlannedWorkout(
      id: 'future',
      date: DateTime(2026, 8, 19),
      title: 'Next home session',
      pressure: 1000,
      exercises: <PlannedExercise>[
        PlannedExercise(
          exerciseId: 'push_up',
          name: 'Push-up',
          pattern: 'Horizontal push',
          sets: 3,
          targetReps: 20,
          repRangeMax: 20,
          targetRir: 2,
          weight: null,
          instructions: 'Test',
        ),
      ],
    );
    final WorkoutState state = WorkoutState(
      profile: _profile(days: <int>{DateTime.monday, DateTime.wednesday}),
      resolve: 1000,
      ratedWorkouts: 0,
      workouts: <PlannedWorkout>[done, future],
    );
    WorkoutEngine.completeWorkout(state, done);
    expect(future.exercises.single.exerciseId, 'decline_push_up');
    // A graduated variation starts easier than its usual baseline
    // (HPush baseline is 12, so the fresh variation opens at 8).
    expect(future.exercises.single.targetReps, 8);
  });

  test('muscle tags cover the library and secondaries count half a set', () {
    for (final WorkoutExerciseDefinition exercise in WorkoutEngine.exercises) {
      expect(exercise.primary, isA<WorkoutMuscle>());
      if (exercise.harder != null) {
        expect(
          WorkoutEngine.definitionFor(exercise.harder!),
          isNotNull,
          reason: '${exercise.id} chains to a missing variation',
        );
      }
    }
    final PlannedExercise bench = PlannedExercise(
      exerciseId: 'bench_press',
      name: 'Bench press',
      pattern: 'Horizontal push',
      sets: 3,
      targetReps: 6,
      repRangeMax: 8,
      targetRir: 2,
      weight: null,
      instructions: 'Test',
    );
    final Map<WorkoutMuscle, double> sets = WorkoutEngine.setsByMuscle(<
      PlannedExercise
    >[bench]);
    expect(sets[WorkoutMuscle.chest], 3);
    expect(sets[WorkoutMuscle.triceps], closeTo(1.5, 0.001));
    expect(sets[WorkoutMuscle.shoulders], closeTo(1.5, 0.001));
  });

  test('home sessions scale sets by goal and respect the pull-up gate', () {
    final WorkoutExerciseDefinition pushUp = WorkoutEngine.definitionFor(
      'push_up',
    )!;
    final WorkoutProfile scaled = WorkoutProfile(
      goal: WorkoutGoal.muscle,
      experience: WorkoutExperience.experienced,
      split: WorkoutSplit.fullBody,
      trainingDays: <int>{DateTime.monday},
      sessionMinutes: 45,
      equipment: <WorkoutEquipment>{
        WorkoutEquipment.bodyweight,
        WorkoutEquipment.bands,
      },
      unit: WorkoutUnit.pounds,
      reminderMinutes: 18 * 60,
      notificationsEnabled: true,
      estimatedMaxes: const <String, double>{},
    );
    expect(
      WorkoutEngine.planExerciseFor(scaled, pushUp, WorkoutLocation.home).sets,
      4,
    );

    final WorkoutProfile noBar = _profile(
      days: <int>{DateTime.monday},
      equipment: <WorkoutEquipment>{
        WorkoutEquipment.bodyweight,
        WorkoutEquipment.bands,
      },
    );
    expect(
      WorkoutEngine.alternativesFor(
        'Vertical pull',
        noBar,
        WorkoutLocation.home,
      ).map((WorkoutExerciseDefinition item) => item.id),
      <String>['band_pulldown'],
    );
  });

  test('relocating a session to home swaps in bodyweight work', () {
    final DateTime monday = DateTime(2026, 8, 17);
    final WorkoutProfile profile = _profile(
      days: <int>{DateTime.monday, DateTime.wednesday},
      maxes: <String, double>{'back_squat': 200},
    );
    final PlannedWorkout workout = WorkoutEngine.generateSchedule(
      profile: profile,
      resolve: 1000,
      now: monday,
      days: 7,
    ).first;
    expect(workout.exercises, isNotEmpty);

    WorkoutEngine.relocateSession(workout, profile, WorkoutLocation.home);
    expect(workout.location, WorkoutLocation.home);
    expect(
      workout.exercises.every(
        (PlannedExercise exercise) => exercise.weight == null,
      ),
      isTrue,
    );
    for (final PlannedExercise exercise in workout.exercises) {
      final WorkoutExerciseDefinition definition = WorkoutEngine.exercises
          .firstWhere(
            (WorkoutExerciseDefinition item) => item.id == exercise.exerciseId,
          );
      expect(definition.equipment, WorkoutEquipment.bodyweight);
    }

    WorkoutEngine.relocateSession(workout, profile, WorkoutLocation.gym);
    expect(workout.location, WorkoutLocation.gym);
    expect(
      workout.exercises.any(
        (PlannedExercise exercise) => exercise.weight != null,
      ),
      isTrue,
    );
  });

  test(
    'rep-total scoring: exact meets 1.0, safe extras beat it, shortfall dips',
    () {
      final PlannedWorkout exact = _simpleWorkout('exact');
      final PlannedWorkout extra = _simpleWorkout('extra');
      final PlannedWorkout failure = _simpleWorkout('failure');
      final PlannedWorkout partial = _simpleWorkout('partial');
      for (final WorkoutSetLog set in exact.exercises.single.logs) {
        set.completed = true;
      }
      for (final WorkoutSetLog set in extra.exercises.single.logs) {
        set
          ..completed = true
          ..actualReps += 2
          ..rir = 2;
      }
      for (final WorkoutSetLog set in failure.exercises.single.logs) {
        set
          ..completed = true
          ..actualReps += 2
          ..rir = 0;
      }
      partial.exercises.single.logs.first.completed = true;

      expect(WorkoutEngine.performanceScore(exact), 1.0);
      expect(WorkoutEngine.performanceScore(extra), greaterThan(1.0));
      expect(
        WorkoutEngine.performanceScore(failure),
        lessThan(WorkoutEngine.performanceScore(extra)),
      );
      expect(WorkoutEngine.performanceScore(partial), lessThan(1.0));
    },
  );

  test('Resolve rises above target reps and dips slightly below', () {
    final PlannedWorkout above = _simpleWorkout('above');
    for (final WorkoutSetLog set in above.exercises.single.logs) {
      set
        ..completed = true
        ..actualReps += 2
        ..rir = 2;
    }
    final WorkoutState aboveState = WorkoutState(
      profile: _profile(days: <int>{DateTime.monday, DateTime.wednesday}),
      resolve: 1000,
      ratedWorkouts: 0,
      workouts: <PlannedWorkout>[above],
    );
    final int aboveDelta = WorkoutEngine.completeWorkout(aboveState, above);
    expect(aboveDelta, greaterThanOrEqualTo(2));
    expect(aboveState.resolve, greaterThan(1000));

    final PlannedWorkout below = _simpleWorkout('below');
    below.exercises.single.logs.first.completed = true;
    final WorkoutState belowState = WorkoutState(
      profile: _profile(days: <int>{DateTime.monday, DateTime.wednesday}),
      resolve: 1000,
      ratedWorkouts: 5,
      workouts: <PlannedWorkout>[below],
    );
    WorkoutEngine.completeWorkout(belowState, below);
    expect(below.resolveDelta, lessThan(0));
    expect(below.resolveDelta, greaterThanOrEqualTo(-10));
    expect(belowState.resolve, lessThan(1000));
  });

  test(
    'midnight marks unopened workouts once but preserves active workouts',
    () {
      final PlannedWorkout missed = _simpleWorkout(
        'missed',
        date: DateTime(2026, 8, 15),
      );
      final PlannedWorkout active = _simpleWorkout(
        'active',
        date: DateTime(2026, 8, 15),
      )..status = WorkoutStatus.inProgress;
      final WorkoutState state = WorkoutState(
        profile: _profile(days: <int>{DateTime.saturday, DateTime.sunday}),
        resolve: 1000,
        ratedWorkouts: 0,
        workouts: <PlannedWorkout>[missed, active],
      );

      expect(WorkoutEngine.reconcileMissed(state, DateTime(2026, 8, 16)), 1);
      final int afterFirstPass = state.resolve;
      expect(missed.status, WorkoutStatus.missed);
      expect(missed.resolveDelta, lessThan(0));
      expect(active.status, WorkoutStatus.inProgress);
      expect(WorkoutEngine.reconcileMissed(state, DateTime(2026, 8, 17)), 0);
      expect(state.resolve, afterFirstPass);
    },
  );

  test('weights are suggested from direct logs first, then related lifts', () {
    final WorkoutProfile profile = _profile(
      days: <int>{DateTime.monday, DateTime.wednesday},
      maxes: <String, double>{'bench_press': 200},
    );
    expect(
      WorkoutEngine.estimatedMaxFor(profile, 'overhead_press'),
      closeTo(120, 0.001),
    );
    expect(
      WorkoutEngine.estimateIsApproximate(profile, 'overhead_press'),
      isTrue,
    );
    expect(WorkoutEngine.estimatedMaxFor(profile, 'pull_up'), isNull);

    profile.estimatedMaxes['overhead_press'] = 130;
    expect(WorkoutEngine.estimatedMaxFor(profile, 'overhead_press'), 130);
    expect(
      WorkoutEngine.estimateIsApproximate(profile, 'overhead_press'),
      isFalse,
    );
  });

  test('alternatives keep the pattern and respect the location', () {
    final WorkoutProfile gymProfile = _profile(
      days: <int>{DateTime.monday, DateTime.wednesday},
      equipment: <WorkoutEquipment>{
        WorkoutEquipment.bodyweight,
        WorkoutEquipment.barbell,
        WorkoutEquipment.machines,
      },
    );
    final List<WorkoutExerciseDefinition> gymOptions =
        WorkoutEngine.alternativesFor(
          'Vertical pull',
          gymProfile,
          WorkoutLocation.gym,
        );
    expect(
      gymOptions.map((WorkoutExerciseDefinition item) => item.id),
      containsAll(<String>['lat_pulldown', 'pull_up']),
    );
    // Best picks come first: the rank-1 machine lat pulldown leads.
    expect(gymOptions.first.id, 'lat_pulldown');

    // At home, bar exercises are gated until the profile says there is a bar.
    expect(
      WorkoutEngine.alternativesFor(
        'Vertical pull',
        gymProfile,
        WorkoutLocation.home,
      ),
      isEmpty,
    );
    gymProfile.homePullUpBar = true;
    expect(
      WorkoutEngine.alternativesFor(
        'Vertical pull',
        gymProfile,
        WorkoutLocation.home,
      ).map((WorkoutExerciseDefinition item) => item.id),
      <String>['pull_up', 'chin_up'],
    );
  });

  test('notification settings and per-day times survive a save cycle', () {
    final WorkoutProfile profile = _profile(
      days: <int>{DateTime.monday, DateTime.wednesday},
    );
    profile
      ..notificationsEnabled = false
      ..reminderMinutes = 7 * 60
      ..reminderMinutesByDay[DateTime.wednesday] = 12 * 60
      ..homePullUpBar = true;
    profile.exercisePreferences['gym:Horizontal push'] = 'incline_bench_press';
    final Map<String, dynamic> saved = WorkoutState(
      profile: profile,
      resolve: 1010,
      ratedWorkouts: 2,
      workouts: <PlannedWorkout>[],
    ).toJson();
    final WorkoutState restored = WorkoutState.fromJson(
      jsonDecode(jsonEncode(saved)) as Map<String, dynamic>,
    );
    expect(restored.profile.notificationsEnabled, isFalse);
    expect(restored.profile.reminderMinutesFor(DateTime.monday), 7 * 60);
    expect(restored.profile.reminderMinutesFor(DateTime.wednesday), 12 * 60);
    expect(restored.profile.homePullUpBar, isTrue);
    expect(
      restored.profile.exercisePreferences['gym:Horizontal push'],
      'incline_bench_press',
    );
  });

  test('pre-split saves from schema v1 load with defaults', () {
    final Map<String, dynamic> legacy = <String, dynamic>{
      'schemaVersion': 1,
      'profile': <String, dynamic>{
        'isYouth': false,
        'supervisionConfirmed': false,
        'goal': 'balanced',
        'experience': 'regular',
        'trainingDays': <dynamic>[1, 3],
        'sessionMinutes': 45,
        'equipment': <dynamic>['bodyweight', 'barbell'],
        'unit': 'pounds',
        'reminderMinutes': 1080,
        'estimatedMaxes': <String, dynamic>{'back_squat': 205},
      },
      'resolve': 1042,
      'ratedWorkouts': 3,
      'workouts': <dynamic>[
        <String, dynamic>{
          'id': '2026-08-16-1',
          'date': '2026-08-16T00:00:00.000',
          'title': 'Full body · Foundation',
          'pressure': 1020,
          'status': 'completed',
          'exercises': <dynamic>[],
        },
      ],
    };
    final WorkoutState state = WorkoutState.fromJson(legacy);
    expect(state.profile.split, WorkoutSplit.fullBody);
    expect(state.profile.notificationsEnabled, isTrue);
    expect(state.workouts.single.location, WorkoutLocation.gym);
    expect(state.workouts.single.focus, '');
    expect(state.profile.estimatedMaxes['back_squat'], 205);
  });

  test('coach answers are searchable and split advice tracks day count', () {
    expect(WorkoutCoach.search('home'), isNotEmpty);
    expect(
      WorkoutCoach.search('failure')
          .every((CoachEntry entry) => entry.matches('failure')),
      isTrue,
    );
    expect(WorkoutCoach.search('zzz'), isEmpty);
    expect(WorkoutCoach.recommendedSplit(2), WorkoutSplit.fullBody);
    expect(WorkoutCoach.recommendedSplit(4), WorkoutSplit.upperLower);
    expect(WorkoutCoach.recommendedSplit(6), WorkoutSplit.pushPullLegs);
    expect(WorkoutCoach.splitAdvice(4), contains('Upper / Lower'));
  });

  test('coach best picks cover every muscle group in order', () {
    final List<(WorkoutMuscle, List<String>)> picks = WorkoutCoach
        .bestPicksByMuscle();
    expect(
      picks.map(((WorkoutMuscle, List<String>) pick) => pick.$1).toList(),
      WorkoutMuscle.values.toList(),
    );
    for (final (WorkoutMuscle, List<String>) pick in picks) {
      expect(pick.$2, hasLength(2));
    }
  });

  testWidgets('Workouts onboarding starts with safety and no age gate', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(360, 780);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: WorkoutsApp()));
    await tester.pumpAndSettle();

    expect(find.text('A plan built around your answers'), findsOneWidget);
    expect(find.text('Under 18'), findsNothing);
    expect(find.text('Adult'), findsNothing);
    expect(find.text('I’ll stop for pain or unusual symptoms'), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(
            find.byKey(const ValueKey<String>('workouts-setup-next')),
          )
          .onPressed,
      isNull,
    );
    await tester.tap(find.text('I’ll stop for pain or unusual symptoms'));
    await tester.pump();
    expect(
      tester
          .widget<FilledButton>(
            find.byKey(const ValueKey<String>('workouts-setup-next')),
          )
          .onPressed,
      isNotNull,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('a workout logs extra reps, finishes, and persists Resolve', (
    WidgetTester tester,
  ) async {
    final DateTime today = DateTime.now();
    final PlannedWorkout workout = _simpleWorkout('today', date: today);
    final WorkoutState initial = WorkoutState(
      profile: _profile(days: <int>{today.weekday, (today.weekday % 7) + 1}),
      resolve: 1000,
      ratedWorkouts: 0,
      workouts: <PlannedWorkout>[workout],
    );
    SharedPreferences.setMockInitialValues(<String, Object>{
      'workouts_v1': jsonEncode(initial.toJson()),
    });
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: WorkoutsApp()));
    await tester.pumpAndSettle();
    expect(find.text('YOUR RESOLVE'), findsOneWidget);
    expect(find.text('PRESSURE'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey<String>('workouts-start')));
    await tester.pumpAndSettle();
    await tester.tap(
      find.byKey(const ValueKey<String>('workout-add-rep-bench_press-0')),
    );
    for (final Finder checkbox in <Finder>[
      find.byType(Checkbox).at(0),
      find.byType(Checkbox).at(1),
    ]) {
      await tester.tap(checkbox);
      await tester.pump();
    }
    await tester.tap(find.byKey(const ValueKey<String>('workouts-finish')));
    await tester.pumpAndSettle();

    expect(find.text('Pressure met'), findsOneWidget);
    expect(find.textContaining('Resolve +'), findsOneWidget);
    expect(find.textContaining('% of target reps'), findsOneWidget);
    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();

    final SharedPreferences preferences = await SharedPreferences.getInstance();
    final Map<String, dynamic> saved = jsonDecode(
      preferences.getString('workouts_v1')!,
    ) as Map<String, dynamic>;
    expect(saved['resolve'] as int, greaterThan(1000));
    final List<dynamic> savedWorkouts = saved['workouts'] as List<dynamic>;
    expect(
      (savedWorkouts.first as Map<String, dynamic>)['status'],
      WorkoutStatus.completed.name,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('a scheduled session can switch to a home version', (
    WidgetTester tester,
  ) async {
    final DateTime today = DateTime.now();
    final WorkoutProfile profile = _profile(
      days: <int>{today.weekday, (today.weekday % 7) + 1},
      maxes: <String, double>{'back_squat': 200, 'bench_press': 150},
    );
    final List<PlannedWorkout> plan = WorkoutEngine.generateSchedule(
      profile: profile,
      resolve: 1000,
      now: today,
      days: 3,
    );
    final WorkoutState initial = WorkoutState(
      profile: profile,
      resolve: 1000,
      ratedWorkouts: 0,
      workouts: plan,
    );
    SharedPreferences.setMockInitialValues(<String, Object>{
      'workouts_v1': jsonEncode(initial.toJson()),
    });
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: WorkoutsApp()));
    await tester.pumpAndSettle();
    expect(find.text('Bench press'), findsOneWidget);

    // The Gym ⇄ Home segmented toggle sits in the card header.
    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();
    expect(find.text('Push-up'), findsOneWidget);
    expect(find.text('Bench press'), findsNothing);

    await tester.tap(find.text('Gym'));
    await tester.pumpAndSettle();
    expect(find.text('Bench press'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

WorkoutProfile _profile({
  required Set<int> days,
  WorkoutSplit split = WorkoutSplit.fullBody,
  Map<String, double> maxes = const <String, double>{},
  Set<WorkoutEquipment> equipment = const <WorkoutEquipment>{
    WorkoutEquipment.bodyweight,
    WorkoutEquipment.barbell,
  },
}) {
  return WorkoutProfile(
    goal: WorkoutGoal.balanced,
    experience: WorkoutExperience.regular,
    split: split,
    trainingDays: days,
    sessionMinutes: 45,
    equipment: Set<WorkoutEquipment>.of(equipment),
    unit: WorkoutUnit.pounds,
    reminderMinutes: 18 * 60,
    notificationsEnabled: true,
    estimatedMaxes: Map<String, double>.of(maxes),
  );
}

PlannedWorkout _simpleWorkout(String id, {DateTime? date}) {
  return PlannedWorkout(
    id: id,
    date: date ?? DateTime(2026, 8, 16),
    title: 'Test workout',
    pressure: 1050,
    exercises: <PlannedExercise>[
      PlannedExercise(
        exerciseId: 'bench_press',
        name: 'Bench press',
        pattern: 'Horizontal push',
        sets: 2,
        targetReps: 8,
        repRangeMax: 10,
        targetRir: 2,
        weight: 100,
        instructions: 'Test instructions',
      ),
    ],
  );
}
