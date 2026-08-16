import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

  test('adult plans use estimated loads while youth plans avoid them', () {
    final DateTime monday = DateTime(2026, 8, 17);
    final WorkoutProfile adult = _profile(
      days: <int>{DateTime.monday, DateTime.wednesday},
      maxes: <String, double>{
        'back_squat': 200,
        'bench_press': 150,
        'deadlift': 250,
      },
    );
    final List<PlannedWorkout> adultPlan = WorkoutEngine.generateSchedule(
      profile: adult,
      resolve: 1000,
      now: monday,
      days: 7,
    );
    expect(adultPlan, hasLength(2));
    expect(
      adultPlan
          .expand((PlannedWorkout workout) => workout.exercises)
          .where((PlannedExercise exercise) => exercise.weight != null),
      isNotEmpty,
    );

    final WorkoutProfile youth = _profile(
      youth: true,
      days: <int>{DateTime.monday, DateTime.wednesday},
      maxes: <String, double>{'back_squat': 200},
    );
    final List<PlannedWorkout> youthPlan = WorkoutEngine.generateSchedule(
      profile: youth,
      resolve: 1000,
      now: monday,
      days: 7,
    );
    expect(
      youthPlan
          .expand((PlannedWorkout workout) => workout.exercises)
          .every(
            (PlannedExercise exercise) =>
                exercise.weight == null &&
                exercise.targetReps == 10 &&
                exercise.targetRir == 3,
          ),
      isTrue,
    );
  });

  test('safe extra reps earn more Resolve than basic completion', () {
    final PlannedWorkout exact = _simpleWorkout('exact');
    final PlannedWorkout extra = _simpleWorkout('extra');
    final PlannedWorkout failure = _simpleWorkout('failure');
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

    expect(
      WorkoutEngine.performanceScore(extra),
      greaterThan(WorkoutEngine.performanceScore(exact)),
    );
    expect(
      WorkoutEngine.performanceScore(failure),
      WorkoutEngine.performanceScore(exact),
    );
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

  testWidgets('Workouts onboarding is responsive and starts with safety', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(360, 780);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: WorkoutsApp()));
    await tester.pumpAndSettle();

    expect(find.text('A plan that meets you where you are'), findsOneWidget);
    expect(find.text('Adult'), findsOneWidget);
    expect(find.text('Under 18'), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(
            find.byKey(const ValueKey<String>('workouts-setup-next')),
          )
          .onPressed,
      isNull,
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
}

WorkoutProfile _profile({
  bool youth = false,
  required Set<int> days,
  Map<String, double> maxes = const <String, double>{},
}) {
  return WorkoutProfile(
    isYouth: youth,
    supervisionConfirmed: youth,
    goal: WorkoutGoal.balanced,
    experience: WorkoutExperience.regular,
    trainingDays: days,
    sessionMinutes: 45,
    equipment: <WorkoutEquipment>{
      WorkoutEquipment.bodyweight,
      WorkoutEquipment.barbell,
    },
    unit: WorkoutUnit.pounds,
    reminderMinutes: 18 * 60,
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
