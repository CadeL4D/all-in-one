import 'dart:math';

import 'workout_models.dart';

class WorkoutExerciseDefinition {
  const WorkoutExerciseDefinition({
    required this.id,
    required this.name,
    required this.pattern,
    required this.equipment,
    required this.instructions,
    this.compound = true,
    this.supportsEstimatedMax = false,
  });

  final String id;
  final String name;
  final String pattern;
  final WorkoutEquipment equipment;
  final String instructions;
  final bool compound;
  final bool supportsEstimatedMax;
}

/// One movement-pattern slot inside a split day. Accessory slots get higher
/// rep, lower intensity prescriptions than compound slots.
class _SessionSlot {
  const _SessionSlot(this.pattern, {this.accessory = false});

  final String pattern;
  final bool accessory;
}

class _SessionTemplate {
  const _SessionTemplate(this.id, this.title, this.slots);

  final String id;
  final String title;
  final List<_SessionSlot> slots;
}

const String kPatternKnee = 'Knee dominant';
const String kPatternHip = 'Hip dominant';
const String kPatternHPush = 'Horizontal push';
const String kPatternVPush = 'Vertical push';
const String kPatternHPull = 'Horizontal pull';
const String kPatternVPull = 'Vertical pull';
const String kPatternCore = 'Core';

abstract final class WorkoutEngine {
  static const List<WorkoutExerciseDefinition> exercises =
      <WorkoutExerciseDefinition>[
        // Barbell.
        WorkoutExerciseDefinition(
          id: 'back_squat',
          name: 'Back squat',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.barbell,
          supportsEstimatedMax: true,
          instructions: 'Brace before each rep, keep the bar balanced over mid-foot, and use a depth you control without pain.',
        ),
        WorkoutExerciseDefinition(
          id: 'bench_press',
          name: 'Bench press',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.barbell,
          supportsEstimatedMax: true,
          instructions: 'Keep feet planted and shoulder blades stable. Lower with control and use a spotter or safeties.',
        ),
        WorkoutExerciseDefinition(
          id: 'deadlift',
          name: 'Deadlift',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.barbell,
          supportsEstimatedMax: true,
          instructions: 'Brace with the bar close, push the floor away, and stop the set if your position changes sharply.',
        ),
        WorkoutExerciseDefinition(
          id: 'romanian_deadlift',
          name: 'Romanian deadlift',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.barbell,
          supportsEstimatedMax: true,
          instructions: 'Push the hips back with a braced trunk and stop when hamstring tension limits the range.',
        ),
        WorkoutExerciseDefinition(
          id: 'barbell_row',
          name: 'Barbell row',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.barbell,
          supportsEstimatedMax: true,
          instructions: 'Hold a steady torso, pull toward the lower ribs, and lower without losing your brace.',
        ),
        WorkoutExerciseDefinition(
          id: 'overhead_press',
          name: 'Overhead press',
          pattern: kPatternVPush,
          equipment: WorkoutEquipment.barbell,
          supportsEstimatedMax: true,
          instructions: 'Squeeze glutes and ribs down, then press in a smooth path without leaning back.',
        ),
        WorkoutExerciseDefinition(
          id: 'barbell_hip_thrust',
          name: 'Barbell hip thrust',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.barbell,
          instructions: 'Drive the hips to full extension with the pad away from your joints and ribs kept down.',
        ),
        // Dumbbells.
        WorkoutExerciseDefinition(
          id: 'goblet_squat',
          name: 'Goblet squat',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.dumbbells,
          supportsEstimatedMax: true,
          instructions: 'Hold the weight close, sit between your hips, and keep full-foot pressure.',
        ),
        WorkoutExerciseDefinition(
          id: 'dumbbell_press',
          name: 'Dumbbell bench press',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.dumbbells,
          supportsEstimatedMax: true,
          instructions: 'Keep shoulders supported on the bench and lower the dumbbells through a comfortable range.',
        ),
        WorkoutExerciseDefinition(
          id: 'dumbbell_rdl',
          name: 'Dumbbell Romanian deadlift',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.dumbbells,
          supportsEstimatedMax: true,
          instructions: 'Push the hips back with a braced trunk and stop when hamstring tension limits the range.',
        ),
        WorkoutExerciseDefinition(
          id: 'one_arm_row',
          name: 'One-arm dumbbell row',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.dumbbells,
          instructions: 'Support your torso, pull your elbow toward your hip, and avoid twisting for momentum.',
        ),
        WorkoutExerciseDefinition(
          id: 'shoulder_press',
          name: 'Dumbbell shoulder press',
          pattern: kPatternVPush,
          equipment: WorkoutEquipment.dumbbells,
          supportsEstimatedMax: true,
          instructions: 'Press from a stable seated or standing position without arching your lower back.',
        ),
        WorkoutExerciseDefinition(
          id: 'dumbbell_lunge',
          name: 'Dumbbell lunge',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.dumbbells,
          instructions: 'Step to a comfortable length, lower under control, and keep the front shin quiet.',
        ),
        // Machines.
        WorkoutExerciseDefinition(
          id: 'leg_press',
          name: 'Leg press',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.machines,
          supportsEstimatedMax: true,
          instructions: 'Keep hips against the pad and use a controlled range without locking the knees forcefully.',
        ),
        WorkoutExerciseDefinition(
          id: 'machine_chest_press',
          name: 'Machine chest press',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.machines,
          supportsEstimatedMax: true,
          instructions: 'Adjust the seat so the handles align with mid-chest and press without shrugging.',
        ),
        WorkoutExerciseDefinition(
          id: 'seated_row',
          name: 'Seated row',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.machines,
          supportsEstimatedMax: true,
          instructions: 'Stay tall, lead with the elbows, and pause before returning the weight under control.',
        ),
        WorkoutExerciseDefinition(
          id: 'lat_pulldown',
          name: 'Lat pulldown',
          pattern: kPatternVPull,
          equipment: WorkoutEquipment.machines,
          supportsEstimatedMax: true,
          instructions: 'Pull toward the upper chest with the ribs down; avoid leaning far back for momentum.',
        ),
        WorkoutExerciseDefinition(
          id: 'leg_curl',
          name: 'Leg curl',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.machines,
          compound: false,
          instructions: 'Set the machine to match your knee joint and keep the movement smooth.',
        ),
        WorkoutExerciseDefinition(
          id: 'leg_extension',
          name: 'Leg extension',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.machines,
          compound: false,
          instructions: 'Align the pad just above the ankle and squeeze at the top without swinging.',
        ),
        WorkoutExerciseDefinition(
          id: 'machine_fly',
          name: 'Machine chest fly',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.machines,
          compound: false,
          instructions: 'Set the arms level with the chest, hug an arc, and keep the shoulders relaxed.',
        ),
        // Bands.
        WorkoutExerciseDefinition(
          id: 'band_row',
          name: 'Band row',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.bands,
          instructions: 'Anchor the band securely, pull toward the ribs, and return with control.',
        ),
        WorkoutExerciseDefinition(
          id: 'band_press',
          name: 'Band chest press',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.bands,
          instructions: 'Use a secure anchor and a split stance, then press without letting the ribs flare.',
        ),
        WorkoutExerciseDefinition(
          id: 'band_pulldown',
          name: 'Band pulldown',
          pattern: kPatternVPull,
          equipment: WorkoutEquipment.bands,
          instructions: 'Anchor the band overhead, kneel tall, and pull the elbows down to your sides.',
        ),
        // Bodyweight.
        WorkoutExerciseDefinition(
          id: 'push_up',
          name: 'Push-up',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Keep a straight line from shoulders to ankles. Too hard? Elevate your hands. Too easy? Elevate your feet.',
        ),
        WorkoutExerciseDefinition(
          id: 'decline_push_up',
          name: 'Decline push-up',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Feet raised on a stable surface. The higher the feet, the harder the rep—keep the body line strict.',
        ),
        WorkoutExerciseDefinition(
          id: 'pike_push_up',
          name: 'Pike push-up',
          pattern: kPatternVPush,
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Hips high, lower the crown of your head toward the floor between your hands.',
        ),
        WorkoutExerciseDefinition(
          id: 'chair_dip',
          name: 'Chair dip',
          pattern: kPatternVPush,
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Hands on a stable chair or bench behind you; keep the chest tall and shoulders happy.',
        ),
        WorkoutExerciseDefinition(
          id: 'pull_up',
          name: 'Pull-up',
          pattern: kPatternVPull,
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Hang from a sturdy bar and pull your chest toward it. Add a band or jump-assist to build up.',
        ),
        WorkoutExerciseDefinition(
          id: 'inverted_row',
          name: 'Supported body row',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Use a securely fixed bar or sturdy table, keep a straight body line, and adjust your foot position for control.',
        ),
        WorkoutExerciseDefinition(
          id: 'bodyweight_squat',
          name: 'Bodyweight squat',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Sit between your hips with the chest tall. Pause at the bottom to make each rep count.',
        ),
        WorkoutExerciseDefinition(
          id: 'split_squat',
          name: 'Split squat',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Use a stable stance, descend vertically, and hold support if balance limits your technique.',
        ),
        WorkoutExerciseDefinition(
          id: 'step_up',
          name: 'Step-up',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Use a knee-height stable surface and drive through the whole foot without pushing off the back leg.',
        ),
        WorkoutExerciseDefinition(
          id: 'glute_bridge',
          name: 'Glute bridge',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Brace your trunk and extend the hips without arching your lower back. Pause at the top.',
        ),
        WorkoutExerciseDefinition(
          id: 'single_leg_glute_bridge',
          name: 'Single-leg glute bridge',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'One foot planted, hips level. Slow the tempo down to keep the rep honest.',
        ),
        WorkoutExerciseDefinition(
          id: 'nordic_curl',
          name: 'Nordic curl',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.bodyweight,
          instructions: 'Anchor the ankles (sofa or partner) and lower as slowly as you control. Use your hands to reset.',
        ),
        WorkoutExerciseDefinition(
          id: 'dead_bug',
          name: 'Dead bug',
          pattern: kPatternCore,
          equipment: WorkoutEquipment.bodyweight,
          compound: false,
          instructions: 'Press the low back into the floor while the opposite arm and leg reach away.',
        ),
        WorkoutExerciseDefinition(
          id: 'bird_dog',
          name: 'Bird dog',
          pattern: kPatternCore,
          equipment: WorkoutEquipment.bodyweight,
          compound: false,
          instructions: 'From all fours, reach the opposite arm and leg long without letting the hips tilt.',
        ),
        WorkoutExerciseDefinition(
          id: 'bicycle_crunch',
          name: 'Bicycle crunch',
          pattern: kPatternCore,
          equipment: WorkoutEquipment.bodyweight,
          compound: false,
          instructions: 'Rotate from the ribs, not the neck, and keep the lower back comfortable.',
        ),
      ];

  /// Rough one-rep-max estimates for exercises without a logged baseline,
  /// derived from a related lift. These are starting suggestions only.
  static const Map<String, (String, double)> _loadHints =
      <String, (String, double)>{
        'overhead_press': ('bench_press', 0.60),
        'barbell_row': ('bench_press', 0.70),
        'romanian_deadlift': ('deadlift', 0.75),
        'dumbbell_press': ('bench_press', 0.40),
        'goblet_squat': ('back_squat', 0.30),
        'leg_press': ('back_squat', 2.2),
      };

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
    final List<WorkoutExerciseDefinition> pool = exercises
        .where(
          (WorkoutExerciseDefinition exercise) =>
              equipment.contains(exercise.equipment) &&
              exercise.supportsEstimatedMax,
        )
        .toList(growable: false);
    return pool.take(4).toList(growable: false);
  }

  /// Best available one-rep-max estimate for an exercise: a logged estimate
  /// first, then a family hint from a related lift.
  static double? estimatedMaxFor(WorkoutProfile profile, String exerciseId) {
    final double? direct = profile.estimatedMaxes[exerciseId];
    if (direct != null && direct > 0) {
      return direct;
    }
    final (String, double)? hint = _loadHints[exerciseId];
    if (hint == null) {
      return null;
    }
    final double? base = profile.estimatedMaxes[hint.$1];
    if (base == null || base <= 0) {
      return null;
    }
    return base * hint.$2;
  }

  /// True when the estimate came from a related-lift ratio rather than this
  /// exercise's own logs, so the UI can flag it as approximate.
  static bool estimateIsApproximate(WorkoutProfile profile, String exerciseId) {
    final double? direct = profile.estimatedMaxes[exerciseId];
    return (direct == null || direct <= 0) &&
        _loadHints.containsKey(exerciseId);
  }

  static List<_SessionTemplate> _templatesFor(WorkoutSplit split) =>
      switch (split) {
        WorkoutSplit.fullBody => const <_SessionTemplate>[
          _SessionTemplate('full_a', 'Full body · Foundation', <_SessionSlot>[
            _SessionSlot(kPatternKnee),
            _SessionSlot(kPatternHPush),
            _SessionSlot(kPatternHip),
            _SessionSlot(kPatternHPull),
            _SessionSlot(kPatternVPush),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('full_b', 'Full body · Build', <_SessionSlot>[
            _SessionSlot(kPatternKnee),
            _SessionSlot(kPatternHPull),
            _SessionSlot(kPatternHip),
            _SessionSlot(kPatternVPull),
            _SessionSlot(kPatternVPush),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
        ],
        WorkoutSplit.upperLower => const <_SessionTemplate>[
          _SessionTemplate('upper', 'Upper body', <_SessionSlot>[
            _SessionSlot(kPatternHPush),
            _SessionSlot(kPatternHPull),
            _SessionSlot(kPatternVPush),
            _SessionSlot(kPatternVPull),
            _SessionSlot(kPatternHPush, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('lower', 'Lower body', <_SessionSlot>[
            _SessionSlot(kPatternKnee),
            _SessionSlot(kPatternHip),
            _SessionSlot(kPatternKnee, accessory: true),
            _SessionSlot(kPatternHip, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
        ],
        WorkoutSplit.pushPullLegs => const <_SessionTemplate>[
          _SessionTemplate('push', 'Push day', <_SessionSlot>[
            _SessionSlot(kPatternHPush),
            _SessionSlot(kPatternVPush),
            _SessionSlot(kPatternHPush, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('pull', 'Pull day', <_SessionSlot>[
            _SessionSlot(kPatternHPull),
            _SessionSlot(kPatternVPull),
            _SessionSlot(kPatternHPull, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('legs', 'Leg day', <_SessionSlot>[
            _SessionSlot(kPatternKnee),
            _SessionSlot(kPatternHip),
            _SessionSlot(kPatternKnee, accessory: true),
            _SessionSlot(kPatternHip, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
        ],
      };

  static List<PlannedWorkout> generateSchedule({
    required WorkoutProfile profile,
    required int resolve,
    required DateTime now,
    int days = 14,
  }) {
    final DateTime today = _dateOnly(now);
    final List<_SessionTemplate> rotation = _templatesFor(profile.split);
    final List<PlannedWorkout> result = <PlannedWorkout>[];
    int sessionIndex = 0;
    for (int offset = 0; offset < days; offset++) {
      final DateTime date = today.add(Duration(days: offset));
      if (!profile.trainingDays.contains(date.weekday)) {
        continue;
      }
      final _SessionTemplate template =
          rotation[sessionIndex % rotation.length];
      final List<PlannedExercise> planned = _planSession(
        profile: profile,
        template: template,
        location: WorkoutLocation.gym,
        varyPreference: sessionIndex.isOdd,
      );
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
      result.add(
        PlannedWorkout(
          id: '${_dateKey(date)}-${sessionIndex + 1}',
          date: date,
          title: template.title,
          pressure: pressure,
          exercises: planned,
          focus: template.id,
        ),
      );
      sessionIndex++;
    }
    return result;
  }

  /// Swaps a scheduled session between gym and bodyweight versions while
  /// keeping its date, pressure, and Resolve stakes.
  static void relocateSession(
    PlannedWorkout workout,
    WorkoutProfile profile,
    WorkoutLocation location,
  ) {
    if (workout.status != WorkoutStatus.scheduled ||
        workout.location == location) {
      return;
    }
    workout.location = location;
    final List<_SessionTemplate> rotation = _templatesFor(profile.split);
    final _SessionTemplate template = rotation.firstWhere(
      (_SessionTemplate template) => template.id == workout.focus,
      orElse: () => rotation.first,
    );
    workout.exercises = _planSession(
      profile: profile,
      template: template,
      location: location,
      varyPreference: false,
    );
  }

  static List<PlannedExercise> _planSession({
    required WorkoutProfile profile,
    required _SessionTemplate template,
    required WorkoutLocation location,
    required bool varyPreference,
  }) {
    final Set<WorkoutEquipment> available = location == WorkoutLocation.home
        ? <WorkoutEquipment>{
            WorkoutEquipment.bodyweight,
            if (profile.equipment.contains(WorkoutEquipment.bands))
              WorkoutEquipment.bands,
          }
        : <WorkoutEquipment>{...profile.equipment, WorkoutEquipment.bodyweight};
    final List<WorkoutEquipment> preference = varyPreference
        ? <WorkoutEquipment>[
            WorkoutEquipment.dumbbells,
            WorkoutEquipment.machines,
            WorkoutEquipment.barbell,
            WorkoutEquipment.bands,
            WorkoutEquipment.bodyweight,
          ]
        : <WorkoutEquipment>[
            WorkoutEquipment.barbell,
            WorkoutEquipment.dumbbells,
            WorkoutEquipment.machines,
            WorkoutEquipment.bands,
            WorkoutEquipment.bodyweight,
          ];
    final int maxExercises = profile.sessionMinutes <= 30
        ? 4
        : profile.sessionMinutes <= 45
        ? 5
        : 6;
    final Set<String> usedIds = <String>{};
    final List<PlannedExercise> planned = <PlannedExercise>[];
    for (final _SessionSlot slot in template.slots) {
      if (planned.length >= maxExercises) {
        break;
      }
      final WorkoutExerciseDefinition? chosen = _chooseExercise(
        slot.pattern,
        available,
        preference,
        usedIds,
      );
      if (chosen == null) {
        continue;
      }
      usedIds.add(chosen.id);
      planned.add(_planExercise(profile, chosen, slot.accessory, location));
    }
    return planned;
  }

  static WorkoutExerciseDefinition? _chooseExercise(
    String pattern,
    Set<WorkoutEquipment> available,
    List<WorkoutEquipment> preference,
    Set<String> usedIds,
  ) {
    for (final WorkoutEquipment equipment in preference) {
      if (!available.contains(equipment)) {
        continue;
      }
      for (final WorkoutExerciseDefinition exercise in exercises) {
        if (exercise.pattern == pattern &&
            exercise.equipment == equipment &&
            !usedIds.contains(exercise.id)) {
          return exercise;
        }
      }
    }
    for (final WorkoutExerciseDefinition exercise in exercises) {
      if (exercise.pattern == pattern &&
          available.contains(exercise.equipment) &&
          !usedIds.contains(exercise.id)) {
        return exercise;
      }
    }
    return null;
  }

  /// Exercise options for a pattern given the equipment for the location,
  /// best matches first. Powers the "pick my exercises" sheet.
  static List<WorkoutExerciseDefinition> alternativesFor(
    String pattern,
    WorkoutProfile profile,
    WorkoutLocation location,
  ) {
    final Set<WorkoutEquipment> available = location == WorkoutLocation.home
        ? <WorkoutEquipment>{
            WorkoutEquipment.bodyweight,
            if (profile.equipment.contains(WorkoutEquipment.bands))
              WorkoutEquipment.bands,
          }
        : <WorkoutEquipment>{...profile.equipment, WorkoutEquipment.bodyweight};
    final List<WorkoutExerciseDefinition> matches = exercises
        .where(
          (WorkoutExerciseDefinition exercise) =>
              exercise.pattern == pattern &&
              available.contains(exercise.equipment),
        )
        .toList(growable: false);
    final List<WorkoutEquipment> order = <WorkoutEquipment>[
      WorkoutEquipment.barbell,
      WorkoutEquipment.dumbbells,
      WorkoutEquipment.machines,
      WorkoutEquipment.bands,
      WorkoutEquipment.bodyweight,
    ];
    matches.sort(
      (WorkoutExerciseDefinition a, WorkoutExerciseDefinition b) =>
          order.indexOf(a.equipment).compareTo(order.indexOf(b.equipment)),
    );
    return matches;
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
      ..resolveDelta = delta;
    state.resolve = max(100, state.resolve + delta);
    state.ratedWorkouts++;
    _updateEstimatedMaxes(state.profile, workout);
    _progressFutureLoads(state, workout);
    return delta;
  }

  /// Credited reps divided by the reps the plan asked for. Meeting every
  /// target scores 1.0; safe extra reps score higher; missed sets score 0.
  static double performanceScore(PlannedWorkout workout) {
    final int target = workout.targetTotalReps;
    if (target == 0) {
      return 0;
    }
    int credited = 0;
    for (final PlannedExercise exercise in workout.exercises) {
      for (final WorkoutSetLog set in exercise.logs) {
        if (!set.completed) {
          continue;
        }
        final int withinTarget = min(set.actualReps, exercise.targetReps);
        final int extra = max(0, set.actualReps - exercise.targetReps);
        // Extra reps count fully only when at least one rep was left in
        // reserve; grinding to failure earns minimal bonus credit.
        final int extraCap = set.rir >= 1 ? 5 : 1;
        credited += withinTarget + min(extra, extraCap);
      }
    }
    return credited / target;
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
          ..resolveDelta = min(delta, -4)
          ..performanceScore = 0;
        state.resolve = max(100, state.resolve + workout.resolveDelta);
        state.ratedWorkouts++;
        missed++;
      }
    }
    return missed;
  }

  /// Resolve moves with the rep total: beating the planned reps adds Resolve,
  /// falling short trims a little, and harder opponents swing the stakes more.
  static int _ratingDelta({
    required int resolve,
    required int pressure,
    required double score,
    required int ratedWorkouts,
  }) {
    final double difficulty = (1 + (pressure - resolve) / 800).clamp(0.6, 1.5);
    final int k = ratedWorkouts < 10 ? 32 : 24;
    if (score >= 1) {
      return max((k * (score - 1) * difficulty).round() + 2, 2);
    }
    return (k * (score - 1) * difficulty).round().clamp(-10, -1);
  }

  /// Prescribes a single exercise (used when the user swaps an exercise in
  /// the picker). Accessories get the higher-rep prescription.
  static PlannedExercise planExerciseFor(
    WorkoutProfile profile,
    WorkoutExerciseDefinition exercise,
    WorkoutLocation location,
  ) => _planExercise(profile, exercise, !exercise.compound, location);

  static PlannedExercise _planExercise(
    WorkoutProfile profile,
    WorkoutExerciseDefinition exercise,
    bool accessory,
    WorkoutLocation location,
  ) {
    if (location == WorkoutLocation.home) {
      final (int reps, int repMax) = _bodyweightReps(exercise.pattern);
      return PlannedExercise(
        exerciseId: exercise.id,
        name: exercise.name,
        pattern: exercise.pattern,
        sets: 3,
        targetReps: reps,
        repRangeMax: repMax,
        targetRir: 2,
        weight: null,
        instructions: exercise.instructions,
      );
    }
    final _Prescription prescription = _prescription(profile, accessory);
    final double? estimatedMax = estimatedMaxFor(profile, exercise.id);
    final double? weight = estimatedMax == null
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

  static (int, int) _bodyweightReps(String pattern) => switch (pattern) {
    kPatternKnee => (14, 20),
    kPatternHip => (12, 18),
    kPatternVPull => (8, 12),
    kPatternVPush => (8, 12),
    kPatternHPull => (10, 15),
    _ => (12, 16),
  };

  static _Prescription _prescription(WorkoutProfile profile, bool accessory) {
    if (accessory) {
      return switch (profile.goal) {
        WorkoutGoal.strength => const _Prescription(
          sets: 3,
          reps: 8,
          repMax: 10,
          rir: 2,
          percent: 0.65,
        ),
        WorkoutGoal.muscle => const _Prescription(
          sets: 3,
          reps: 10,
          repMax: 12,
          rir: 1,
          percent: 0.65,
        ),
        WorkoutGoal.returning => const _Prescription(
          sets: 2,
          reps: 10,
          repMax: 12,
          rir: 3,
          percent: 0.55,
        ),
        WorkoutGoal.balanced => const _Prescription(
          sets: 3,
          reps: 9,
          repMax: 12,
          rir: 2,
          percent: 0.62,
        ),
      };
    }
    return switch (profile.goal) {
      WorkoutGoal.strength => _Prescription(
        sets: profile.experience == WorkoutExperience.newLifter ? 3 : 4,
        reps: 5,
        repMax: 6,
        rir: 2,
        percent: profile.experience == WorkoutExperience.newLifter
            ? 0.72
            : 0.78,
      ),
      WorkoutGoal.muscle => const _Prescription(
        sets: 4,
        reps: 6,
        repMax: 8,
        rir: 2,
        percent: 0.72,
      ),
      WorkoutGoal.returning => const _Prescription(
        sets: 2,
        reps: 8,
        repMax: 10,
        rir: 3,
        percent: 0.60,
      ),
      WorkoutGoal.balanced => const _Prescription(
        sets: 3,
        reps: 6,
        repMax: 8,
        rir: 2,
        percent: 0.70,
      ),
    };
  }

  static void _updateEstimatedMaxes(
    WorkoutProfile profile,
    PlannedWorkout workout,
  ) {
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

  static DateTime dateOnly(DateTime value) => _dateOnly(value);

  static String dateKey(DateTime value) => _dateKey(value);

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
