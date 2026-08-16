import 'dart:math';

import 'workout_models.dart';

class WorkoutExerciseDefinition {
  const WorkoutExerciseDefinition({
    required this.id,
    required this.name,
    required this.pattern,
    required this.equipment,
    required this.instructions,
    this.supportsEstimatedMax = false,
  });

  final String id;
  final String name;
  final String pattern;
  final WorkoutEquipment equipment;
  final String instructions;
  final bool supportsEstimatedMax;
}

abstract final class WorkoutEngine {
  static const List<WorkoutExerciseDefinition> exercises =
      <WorkoutExerciseDefinition>[
        WorkoutExerciseDefinition(
          id: 'back_squat',
          name: 'Back squat',
          pattern: 'Knee dominant',
          equipment: WorkoutEquipment.barbell,
          supportsEstimatedMax: true,
          instructions: 'Brace before each rep, keep the bar balanced over mid-foot, and use a depth you control without pain.',
        ),
        WorkoutExerciseDefinition(
          id: 'bench_press',
          name: 'Bench press',
          pattern: 'Horizontal push',
          equipment: WorkoutEquipment.barbell,
          supportsEstimatedMax: true,
          instructions: 'Keep feet planted and shoulder blades stable. Lower with control and use a spotter or safeties.',
        ),
        WorkoutExerciseDefinition(
          id: 'deadlift',
          name: 'Deadlift',
          pattern: 'Hip dominant',
          equipment: WorkoutEquipment.barbell,
          supportsEstimatedMax: true,
          instructions: 'Brace with the bar close, push the floor away, and stop the set if your position changes sharply.',
        ),
        WorkoutExerciseDefinition(
          id: 'barbell_row',
          name: 'Barbell row',
          pattern: 'Horizontal pull',
          equipment: WorkoutEquipment.barbell,
          instructions: 'Hold a steady torso, pull toward the lower ribs, and lower without losing your brace.',
        ),
        WorkoutExerciseDefinition(
          id: 'overhead_press',
          name: 'Overhead press',
          pattern: 'Vertical push',
          equipment: WorkoutEquipment.barbell,
          instructions: 'Squeeze glutes and ribs down, then press in a smooth path without leaning back.',
        ),
        WorkoutExerciseDefinition(
          id: 'goblet_squat',
          name: 'Goblet squat',
          pattern: 'Knee dominant',
          equipment: WorkoutEquipment.dumbbells,
          supportsEstimatedMax: true,
          instructions: 'Hold the weight close, sit between your hips, and keep full-foot pressure.',
        ),
        WorkoutExerciseDefinition(
          id: 'dumbbell_press',
          name: 'Dumbbell bench press',
          pattern: 'Horizontal push',
          equipment: WorkoutEquipment.dumbbells,
          supportsEstimatedMax: true,
          instructions: 'Keep shoulders supported on the bench and lower the dumbbells through a comfortable range.',
        ),
        WorkoutExerciseDefinition(
          id: 'dumbbell_rdl',
          name: 'Dumbbell Romanian deadlift',
          pattern: 'Hip dominant',
          equipment: WorkoutEquipment.dumbbells,
          supportsEstimatedMax: true,
          instructions: 'Push the hips back with a braced trunk and stop when hamstring tension limits the range.',
        ),
        WorkoutExerciseDefinition(
          id: 'one_arm_row',
          name: 'One-arm dumbbell row',
          pattern: 'Horizontal pull',
          equipment: WorkoutEquipment.dumbbells,
          instructions: 'Support your torso, pull your elbow toward your hip, and avoid twisting for momentum.',
        ),
        WorkoutExerciseDefinition(
          id: 'shoulder_press',
          name: 'Dumbbell shoulder press',
          pattern: 'Vertical push',
          equipment: WorkoutEquipment.dumbbells,
          instructions: 'Press from a stable seated or standing position without arching your lower back.',
        ),
        WorkoutExerciseDefinition(
          id: 'leg_press',
          name: 'Leg press',
          pattern: 'Knee dominant',
          equipment: WorkoutEquipment.machines,
          supportsEstimatedMax: true,
          instructions: 'Keep hips against the pad and use a controlled range without locking the knees forcefully.',
        ),
        WorkoutExerciseDefinition(
          id: 'machine_chest_press',
          name: 'Machine chest press',
          pattern: 'Horizontal push',
          equipment: WorkoutEquipment.machines,
          supportsEstimatedMax: true,
          instructions: 'Adjust the seat so the handles align with mid-chest and press without shrugging.',
        ),
        WorkoutExerciseDefinition(
          id: 'seated_row',
          name: 'Seated row',
          pattern: 'Horizontal pull',
          equipment: WorkoutEquipment.machines,
          supportsEstimatedMax: true,
          instructions: 'Stay tall, lead with the elbows, and pause before returning the weight under control.',
        ),
        WorkoutExerciseDefinition(
          id: 'leg_curl',
          name: 'Leg curl',
          pattern: 'Hip dominant',
          equipment: WorkoutEquipment.machines,
          instructions: 'Set the machine to match your knee joint and keep the movement smooth.',
        ),
        WorkoutExerciseDefinition(
          id: 'push_up',
          name: 'Push-up',
          pattern: 'Horizontal push',
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Keep a straight line from shoulders to ankles and choose an incline if full reps lose form.',
        ),
        WorkoutExerciseDefinition(
          id: 'split_squat',
          name: 'Split squat',
          pattern: 'Knee dominant',
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Use a stable stance, descend vertically, and hold support if balance limits your technique.',
        ),
        WorkoutExerciseDefinition(
          id: 'glute_bridge',
          name: 'Glute bridge',
          pattern: 'Hip dominant',
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Brace your trunk and extend the hips without arching your lower back.',
        ),
        WorkoutExerciseDefinition(
          id: 'inverted_row',
          name: 'Supported body row',
          pattern: 'Horizontal pull',
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Use a securely fixed bar or suspension point, keep a straight body line, and adjust your foot position for control.',
        ),
        WorkoutExerciseDefinition(
          id: 'plank',
          name: 'Plank',
          pattern: 'Core',
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Maintain steady breathing and stop when you can no longer hold a stacked trunk position.',
        ),
        WorkoutExerciseDefinition(
          id: 'band_row',
          name: 'Band row',
          pattern: 'Horizontal pull',
          equipment: WorkoutEquipment.bands,
          instructions: 'Anchor the band securely, pull toward the ribs, and return with control.',
        ),
        WorkoutExerciseDefinition(
          id: 'band_press',
          name: 'Band chest press',
          pattern: 'Horizontal push',
          equipment: WorkoutEquipment.bands,
          instructions: 'Use a secure anchor and a split stance, then press without letting the ribs flare.',
        ),
      ];

  static double? estimateOneRepMax(double weight, int reps) {
    if (weight <= 0 || reps < 1 || reps > 10) {
      return null;
    }
    if (reps == 1) {
      return weight;
    }
    final double epley = weight * (1 + reps / 30);
    final double brzycki = weight * 36 / (37 - reps);
    return min(epley, brzycki);
  }

  static List<WorkoutExerciseDefinition> baselineExercises(
    Set<WorkoutEquipment> equipment,
  ) {
    final WorkoutEquipment preferred =
        equipment.contains(WorkoutEquipment.barbell)
        ? WorkoutEquipment.barbell
        : equipment.contains(WorkoutEquipment.dumbbells)
        ? WorkoutEquipment.dumbbells
        : equipment.contains(WorkoutEquipment.machines)
        ? WorkoutEquipment.machines
        : WorkoutEquipment.bodyweight;
    return exercises
        .where(
          (WorkoutExerciseDefinition exercise) =>
              exercise.equipment == preferred && exercise.supportsEstimatedMax,
        )
        .take(3)
        .toList(growable: false);
  }

  static List<PlannedWorkout> generateSchedule({
    required WorkoutProfile profile,
    required int resolve,
    required DateTime now,
    int days = 14,
  }) {
    final DateTime today = _dateOnly(now);
    final List<PlannedWorkout> result = <PlannedWorkout>[];
    int sessionIndex = 0;
    for (int offset = 0; offset < days; offset++) {
      final DateTime date = today.add(Duration(days: offset));
      if (!profile.trainingDays.contains(date.weekday)) {
        continue;
      }
      final List<WorkoutExerciseDefinition> selected = _sessionExercises(
        profile,
        sessionIndex,
      );
      final _Prescription prescription = _prescription(profile);
      final int maxExercises = profile.sessionMinutes <= 30
          ? 4
          : profile.sessionMinutes <= 45
          ? 5
          : 6;
      final List<PlannedExercise> planned = selected
          .take(maxExercises)
          .map(
            (WorkoutExerciseDefinition exercise) =>
                _planExercise(profile, exercise, prescription),
          )
          .toList();
      final int totalSets = planned.fold<int>(
        0,
        (int value, PlannedExercise exercise) => value + exercise.sets,
      );
      final int goalPressure = switch (profile.goal) {
        WorkoutGoal.returning => -20,
        WorkoutGoal.balanced => 15,
        WorkoutGoal.strength => 35,
        WorkoutGoal.muscle => 45,
      };
      final int pressure = (resolve - 35 + goalPressure + (totalSets - 8) * 5)
          .clamp(resolve - 60, resolve + 120);
      final String title = _sessionTitle(profile, sessionIndex);
      result.add(
        PlannedWorkout(
          id: '${_dateKey(date)}-${sessionIndex + 1}',
          date: date,
          title: title,
          pressure: pressure,
          exercises: planned,
        ),
      );
      sessionIndex++;
    }
    return result;
  }

  static int completeWorkout(WorkoutState state, PlannedWorkout workout) {
    final double score = performanceScore(workout);
    final int delta = _ratingDelta(
      resolve: state.resolve,
      pressure: workout.pressure,
      score: score,
      ratedWorkouts: state.ratedWorkouts,
    );
    workout
      ..status = WorkoutStatus.completed
      ..finishedAt = DateTime.now()
      ..performanceScore = score
      ..resolveDelta = max(1, delta);
    state.resolve = max(100, state.resolve + workout.resolveDelta);
    state.ratedWorkouts++;
    _updateEstimatedMaxes(state.profile, workout);
    _progressFutureLoads(state, workout);
    return workout.resolveDelta;
  }

  static double performanceScore(PlannedWorkout workout) {
    final List<WorkoutSetLog> sets = workout.exercises
        .expand((PlannedExercise exercise) => exercise.logs)
        .toList();
    if (sets.isEmpty) {
      return 0;
    }
    final int completed = sets
        .where((WorkoutSetLog set) => set.completed)
        .length;
    final double completion = completed / sets.length;
    double repFulfillment = 0;
    double extraEarned = 0;
    double extraPossible = 0;
    for (final WorkoutSetLog set in sets) {
      if (!set.completed) {
        continue;
      }
      repFulfillment += min(set.actualReps / set.targetReps, 1);
      final int safeExtraCap = max(1, min(2, (set.targetReps * 0.2).ceil()));
      extraPossible += safeExtraCap;
      if (set.rir >= 1) {
        extraEarned += min(
          max(0, set.actualReps - set.targetReps),
          safeExtraCap,
        );
      }
    }
    final double repScore = repFulfillment / sets.length;
    final double extraScore = extraPossible == 0
        ? 0
        : extraEarned / extraPossible;
    return (completion * 0.70 + repScore * 0.15 + extraScore * 0.15).clamp(
      0,
      1,
    );
  }

  static int reconcileMissed(WorkoutState state, DateTime now) {
    final DateTime today = _dateOnly(now);
    int missed = 0;
    for (final PlannedWorkout workout in state.workouts) {
      if (workout.status == WorkoutStatus.scheduled &&
          workout.date.isBefore(today)) {
        final int delta = _ratingDelta(
          resolve: state.resolve,
          pressure: workout.pressure,
          score: 0,
          ratedWorkouts: state.ratedWorkouts,
        );
        workout
          ..status = WorkoutStatus.missed
          ..finishedAt = workout.date.add(const Duration(days: 1))
          ..resolveDelta = min(-1, delta)
          ..performanceScore = 0;
        state.resolve = max(100, state.resolve + workout.resolveDelta);
        state.ratedWorkouts++;
        missed++;
      }
    }
    return missed;
  }

  static DateTime dateOnly(DateTime value) => _dateOnly(value);

  static String dateKey(DateTime value) => _dateKey(value);

  static int _ratingDelta({
    required int resolve,
    required int pressure,
    required double score,
    required int ratedWorkouts,
  }) {
    final double expected = 1 / (1 + pow(10, (pressure - resolve) / 400));
    final int k = ratedWorkouts < 10 ? 40 : 28;
    return (k * (score - expected)).round();
  }

  static PlannedExercise _planExercise(
    WorkoutProfile profile,
    WorkoutExerciseDefinition exercise,
    _Prescription prescription,
  ) {
    final double? estimatedMax = profile.estimatedMaxes[exercise.id];
    final double? weight = profile.isYouth || estimatedMax == null
        ? null
        : _roundLoad(estimatedMax * prescription.percent, profile.unit);
    return PlannedExercise(
      exerciseId: exercise.id,
      name: exercise.name,
      pattern: exercise.pattern,
      sets: prescription.sets,
      targetReps: prescription.reps,
      repRangeMax: prescription.repMax,
      targetRir: prescription.rir,
      weight: weight,
      instructions: exercise.instructions,
    );
  }

  static _Prescription _prescription(WorkoutProfile profile) {
    if (profile.isYouth) {
      return const _Prescription(
        sets: 2,
        reps: 10,
        repMax: 15,
        rir: 3,
        percent: 0,
      );
    }
    return switch (profile.goal) {
      WorkoutGoal.strength => _Prescription(
        sets: profile.experience == WorkoutExperience.newLifter ? 2 : 3,
        reps: 5,
        repMax: 6,
        rir: 2,
        percent: profile.experience == WorkoutExperience.newLifter
            ? 0.70
            : 0.78,
      ),
      WorkoutGoal.muscle => const _Prescription(
        sets: 3,
        reps: 8,
        repMax: 10,
        rir: 2,
        percent: 0.67,
      ),
      WorkoutGoal.returning => const _Prescription(
        sets: 2,
        reps: 8,
        repMax: 10,
        rir: 3,
        percent: 0.55,
      ),
      WorkoutGoal.balanced => const _Prescription(
        sets: 3,
        reps: 8,
        repMax: 10,
        rir: 2,
        percent: 0.65,
      ),
    };
  }

  static List<WorkoutExerciseDefinition> _sessionExercises(
    WorkoutProfile profile,
    int index,
  ) {
    final Set<WorkoutEquipment> available = <WorkoutEquipment>{
      ...profile.equipment,
      WorkoutEquipment.bodyweight,
    };
    WorkoutExerciseDefinition choose(
      String pattern,
      List<WorkoutEquipment> preference,
    ) {
      for (final WorkoutEquipment equipment in preference) {
        for (final WorkoutExerciseDefinition exercise in exercises) {
          if (exercise.pattern == pattern &&
              exercise.equipment == equipment &&
              available.contains(equipment)) {
            return exercise;
          }
        }
      }
      return exercises.firstWhere(
        (WorkoutExerciseDefinition exercise) =>
            exercise.pattern == pattern &&
            available.contains(exercise.equipment),
      );
    }

    final List<WorkoutEquipment> preference = index.isEven
        ? <WorkoutEquipment>[
            WorkoutEquipment.barbell,
            WorkoutEquipment.dumbbells,
            WorkoutEquipment.machines,
            WorkoutEquipment.bands,
            WorkoutEquipment.bodyweight,
          ]
        : <WorkoutEquipment>[
            WorkoutEquipment.dumbbells,
            WorkoutEquipment.machines,
            WorkoutEquipment.barbell,
            WorkoutEquipment.bands,
            WorkoutEquipment.bodyweight,
          ];
    return <WorkoutExerciseDefinition>[
      choose('Knee dominant', preference),
      choose('Horizontal push', preference),
      choose('Hip dominant', preference),
      choose('Horizontal pull', preference),
      if (!profile.isYouth &&
          available.any(
            (WorkoutEquipment item) =>
                item == WorkoutEquipment.barbell ||
                item == WorkoutEquipment.dumbbells,
          ))
        choose('Vertical push', preference),
      exercises.firstWhere(
        (WorkoutExerciseDefinition exercise) => exercise.id == 'plank',
      ),
    ];
  }

  static String _sessionTitle(WorkoutProfile profile, int index) {
    if (profile.trainingDays.length <= 3) {
      return index.isEven ? 'Full body · Foundation' : 'Full body · Build';
    }
    return index.isEven ? 'Strength circuit' : 'Volume circuit';
  }

  static void _updateEstimatedMaxes(
    WorkoutProfile profile,
    PlannedWorkout workout,
  ) {
    if (profile.isYouth) {
      return;
    }
    for (final PlannedExercise exercise in workout.exercises) {
      final double? weight = exercise.weight;
      if (weight == null) {
        continue;
      }
      for (final WorkoutSetLog set in exercise.logs) {
        if (!set.completed || set.actualReps > 10) {
          continue;
        }
        final double? estimate = estimateOneRepMax(weight, set.actualReps);
        if (estimate != null &&
            estimate > (profile.estimatedMaxes[exercise.exerciseId] ?? 0)) {
          profile.estimatedMaxes[exercise.exerciseId] = estimate;
        }
      }
    }
  }

  static void _progressFutureLoads(
    WorkoutState state,
    PlannedWorkout completed,
  ) {
    for (final PlannedExercise exercise in completed.exercises) {
      final double? weight = exercise.weight;
      if (weight == null || exercise.logs.isEmpty) {
        continue;
      }
      final bool earnedIncrease = exercise.logs.every(
        (WorkoutSetLog set) =>
            set.completed &&
            set.actualReps >= exercise.repRangeMax &&
            set.rir >= 1,
      );
      if (!earnedIncrease) {
        continue;
      }
      final double factor =
          exercise.pattern.contains('Knee') || exercise.pattern.contains('Hip')
          ? 1.05
          : 1.025;
      for (final PlannedWorkout future in state.workouts) {
        if (!future.date.isAfter(completed.date) ||
            future.status != WorkoutStatus.scheduled) {
          continue;
        }
        for (final PlannedExercise futureExercise in future.exercises) {
          if (futureExercise.exerciseId == exercise.exerciseId &&
              futureExercise.weight != null) {
            futureExercise.weight = _roundLoad(
              futureExercise.weight! * factor,
              state.profile.unit,
            );
          }
        }
      }
    }
  }

  static double _roundLoad(double value, WorkoutUnit unit) {
    final double increment = unit == WorkoutUnit.pounds ? 5 : 2.5;
    return max(increment, (value / increment).floor() * increment);
  }

  static DateTime _dateOnly(DateTime value) =>
      DateTime(value.year, value.month, value.day);

  static String _dateKey(DateTime value) =>
      '${value.year}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';
}

class _Prescription {
  const _Prescription({
    required this.sets,
    required this.reps,
    required this.repMax,
    required this.rir,
    required this.percent,
  });

  final int sets;
  final int reps;
  final int repMax;
  final int rir;
  final double percent;
}
