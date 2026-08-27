enum WorkoutGoal { balanced, strength, muscle, returning }

enum WorkoutExperience { newLifter, regular, experienced }

enum WorkoutEquipment { bodyweight, dumbbells, barbell, machines, bands }

enum WorkoutUnit { pounds, kilograms }

enum WorkoutStatus { scheduled, inProgress, completed, missed, recovery }

enum WorkoutSplit { fullBody, upperLower, pushPullLegs }

enum WorkoutLocation { gym, home }

extension WorkoutGoalLabel on WorkoutGoal {
  String get label => switch (this) {
    WorkoutGoal.balanced => 'Balanced',
    WorkoutGoal.strength => 'Strength',
    WorkoutGoal.muscle => 'Build muscle',
    WorkoutGoal.returning => 'Return safely',
  };

  String get description => switch (this) {
    WorkoutGoal.balanced => 'A practical mix of strength and muscle work.',
    WorkoutGoal.strength => 'Heavier compound work with generous recovery.',
    WorkoutGoal.muscle => 'More weekly sets across moderate rep ranges.',
    WorkoutGoal.returning => 'A lower-volume ramp back into consistency.',
  };
}

extension WorkoutExperienceLabel on WorkoutExperience {
  String get label => switch (this) {
    WorkoutExperience.newLifter => 'New',
    WorkoutExperience.regular => 'Some experience',
    WorkoutExperience.experienced => 'Experienced',
  };
}

extension WorkoutEquipmentLabel on WorkoutEquipment {
  String get label => switch (this) {
    WorkoutEquipment.bodyweight => 'Bodyweight',
    WorkoutEquipment.dumbbells => 'Dumbbells',
    WorkoutEquipment.barbell => 'Barbell',
    WorkoutEquipment.machines => 'Machines',
    WorkoutEquipment.bands => 'Bands',
  };
}

extension WorkoutUnitLabel on WorkoutUnit {
  String get shortLabel => this == WorkoutUnit.pounds ? 'lb' : 'kg';
}

extension WorkoutSplitLabel on WorkoutSplit {
  String get label => switch (this) {
    WorkoutSplit.fullBody => 'Full body',
    WorkoutSplit.upperLower => 'Upper / Lower',
    WorkoutSplit.pushPullLegs => 'Push / Pull / Legs',
  };

  String get description => switch (this) {
    WorkoutSplit.fullBody =>
      'Every session trains everything. Great for 2–3 days a week.',
    WorkoutSplit.upperLower =>
      'Alternate upper- and lower-body days. Great for 4 days a week.',
    WorkoutSplit.pushPullLegs =>
      'Rotate pushing, pulling, and leg days. Great for 5–6 days a week.',
  };

  String get shortName => switch (this) {
    WorkoutSplit.fullBody => 'Full body',
    WorkoutSplit.upperLower => 'Upper/Lower',
    WorkoutSplit.pushPullLegs => 'PPL',
  };
}

extension WorkoutLocationLabel on WorkoutLocation {
  String get label => switch (this) {
    WorkoutLocation.gym => 'Gym',
    WorkoutLocation.home => 'Home',
  };
}

class WorkoutProfile {
  WorkoutProfile({
    required this.goal,
    required this.experience,
    required this.split,
    required this.trainingDays,
    required this.sessionMinutes,
    required this.equipment,
    required this.unit,
    required this.reminderMinutes,
    required this.notificationsEnabled,
    required this.estimatedMaxes,
    Map<int, int>? reminderMinutesByDay,
  }) : reminderMinutesByDay = reminderMinutesByDay ?? <int, int>{};

  factory WorkoutProfile.fromJson(Map<String, dynamic> json) {
    return WorkoutProfile(
      goal: WorkoutGoal.values.byName(
        json['goal'] as String? ?? WorkoutGoal.balanced.name,
      ),
      experience: WorkoutExperience.values.byName(
        json['experience'] as String? ?? WorkoutExperience.newLifter.name,
      ),
      split: WorkoutSplit.values.byName(
        json['split'] as String? ?? WorkoutSplit.fullBody.name,
      ),
      trainingDays: (json['trainingDays'] as List<dynamic>? ?? <dynamic>[])
          .whereType<num>()
          .map((num value) => value.toInt())
          .toSet(),
      sessionMinutes: (json['sessionMinutes'] as num?)?.toInt() ?? 45,
      equipment: (json['equipment'] as List<dynamic>? ?? <dynamic>[])
          .whereType<String>()
          .map(WorkoutEquipment.values.byName)
          .toSet(),
      unit: WorkoutUnit.values.byName(
        json['unit'] as String? ?? WorkoutUnit.pounds.name,
      ),
      reminderMinutes: (json['reminderMinutes'] as num?)?.toInt() ?? 18 * 60,
      notificationsEnabled: json['notificationsEnabled'] as bool? ?? true,
      estimatedMaxes:
          (json['estimatedMaxes'] as Map<String, dynamic>? ??
                  <String, dynamic>{})
              .map(
                (String key, dynamic value) =>
                    MapEntry<String, double>(key, (value as num).toDouble()),
              ),
      reminderMinutesByDay:
          (json['reminderMinutesByDay'] as Map<String, dynamic>? ??
                  <String, dynamic>{})
              .map(
                (String key, dynamic value) =>
                    MapEntry<int, int>(int.parse(key), (value as num).toInt()),
              ),
    );
  }

  final WorkoutGoal goal;
  final WorkoutExperience experience;
  final WorkoutSplit split;
  final Set<int> trainingDays;
  final int sessionMinutes;
  final Set<WorkoutEquipment> equipment;
  final WorkoutUnit unit;
  int reminderMinutes;
  bool notificationsEnabled;
  final Map<int, int> reminderMinutesByDay;
  final Map<String, double> estimatedMaxes;

  int reminderMinutesFor(int weekday) =>
      reminderMinutesByDay[weekday] ?? reminderMinutes;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'goal': goal.name,
    'experience': experience.name,
    'split': split.name,
    'trainingDays': trainingDays.toList()..sort(),
    'sessionMinutes': sessionMinutes,
    'equipment': equipment.map((WorkoutEquipment value) => value.name).toList(),
    'unit': unit.name,
    'reminderMinutes': reminderMinutes,
    'notificationsEnabled': notificationsEnabled,
    'reminderMinutesByDay': reminderMinutesByDay.map(
      (int key, int value) => MapEntry<String, int>(key.toString(), value),
    ),
    'estimatedMaxes': estimatedMaxes,
  };
}

class WorkoutSetLog {
  WorkoutSetLog({
    required this.targetReps,
    int? actualReps,
    this.rir = 2,
    this.completed = false,
  }) : actualReps = actualReps ?? targetReps;

  factory WorkoutSetLog.fromJson(Map<String, dynamic> json) => WorkoutSetLog(
    targetReps: (json['targetReps'] as num?)?.toInt() ?? 8,
    actualReps: (json['actualReps'] as num?)?.toInt(),
    rir: (json['rir'] as num?)?.toInt() ?? 2,
    completed: json['completed'] as bool? ?? false,
  );

  final int targetReps;
  int actualReps;
  int rir;
  bool completed;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'targetReps': targetReps,
    'actualReps': actualReps,
    'rir': rir,
    'completed': completed,
  };
}

class PlannedExercise {
  PlannedExercise({
    required this.exerciseId,
    required this.name,
    required this.pattern,
    required this.sets,
    required this.targetReps,
    required this.repRangeMax,
    required this.targetRir,
    required this.weight,
    required this.instructions,
    List<WorkoutSetLog>? logs,
  }) : logs =
           logs ??
           List<WorkoutSetLog>.generate(
             sets,
             (_) => WorkoutSetLog(targetReps: targetReps, rir: targetRir),
           );

  factory PlannedExercise.fromJson(Map<String, dynamic> json) {
    return PlannedExercise(
      exerciseId: json['exerciseId'] as String? ?? 'unknown',
      name: json['name'] as String? ?? 'Exercise',
      pattern: json['pattern'] as String? ?? 'Movement',
      sets: (json['sets'] as num?)?.toInt() ?? 2,
      targetReps: (json['targetReps'] as num?)?.toInt() ?? 8,
      repRangeMax: (json['repRangeMax'] as num?)?.toInt() ?? 10,
      targetRir: (json['targetRir'] as num?)?.toInt() ?? 2,
      weight: (json['weight'] as num?)?.toDouble(),
      instructions: json['instructions'] as String? ?? '',
      logs: (json['logs'] as List<dynamic>? ?? <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(WorkoutSetLog.fromJson)
          .toList(),
    );
  }

  final String exerciseId;
  final String name;
  final String pattern;
  final int sets;
  final int targetReps;
  final int repRangeMax;
  final int targetRir;
  double? weight;
  final String instructions;
  final List<WorkoutSetLog> logs;

  int get completedSets =>
      logs.where((WorkoutSetLog set) => set.completed).length;

  int get targetTotalReps => targetReps * sets;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'exerciseId': exerciseId,
    'name': name,
    'pattern': pattern,
    'sets': sets,
    'targetReps': targetReps,
    'repRangeMax': repRangeMax,
    'targetRir': targetRir,
    'weight': weight,
    'instructions': instructions,
    'logs': logs.map((WorkoutSetLog set) => set.toJson()).toList(),
  };
}

class PlannedWorkout {
  PlannedWorkout({
    required this.id,
    required this.date,
    required this.title,
    required this.pressure,
    required this.exercises,
    this.status = WorkoutStatus.scheduled,
    this.location = WorkoutLocation.gym,
    this.focus = '',
    this.startedAt,
    this.finishedAt,
    this.resolveDelta = 0,
    this.performanceScore = 0,
  });

  factory PlannedWorkout.fromJson(Map<String, dynamic> json) {
    return PlannedWorkout(
      id: json['id'] as String? ?? '',
      date: DateTime.parse(json['date'] as String),
      title: json['title'] as String? ?? 'Workout',
      pressure: (json['pressure'] as num?)?.toInt() ?? 1000,
      exercises: (json['exercises'] as List<dynamic>? ?? <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(PlannedExercise.fromJson)
          .toList(),
      status: WorkoutStatus.values.byName(
        json['status'] as String? ?? WorkoutStatus.scheduled.name,
      ),
      location: WorkoutLocation.values.byName(
        json['location'] as String? ?? WorkoutLocation.gym.name,
      ),
      focus: json['focus'] as String? ?? '',
      startedAt: json['startedAt'] == null
          ? null
          : DateTime.parse(json['startedAt'] as String),
      finishedAt: json['finishedAt'] == null
          ? null
          : DateTime.parse(json['finishedAt'] as String),
      resolveDelta: (json['resolveDelta'] as num?)?.toInt() ?? 0,
      performanceScore: (json['performanceScore'] as num?)?.toDouble() ?? 0,
    );
  }

  final String id;
  DateTime date;
  final String title;
  final int pressure;
  List<PlannedExercise> exercises;
  WorkoutStatus status;
  WorkoutLocation location;
  String focus;
  DateTime? startedAt;
  DateTime? finishedAt;
  int resolveDelta;
  double performanceScore;

  int get totalSets => exercises.fold<int>(
    0,
    (int total, PlannedExercise exercise) => total + exercise.logs.length,
  );

  int get completedSets => exercises.fold<int>(
    0,
    (int total, PlannedExercise exercise) => total + exercise.completedSets,
  );

  /// Reps the plan asked for across every programmed set.
  int get targetTotalReps => exercises.fold<int>(
    0,
    (int total, PlannedExercise exercise) => total + exercise.targetTotalReps,
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'date': date.toIso8601String(),
    'title': title,
    'pressure': pressure,
    'exercises': exercises
        .map((PlannedExercise item) => item.toJson())
        .toList(),
    'status': status.name,
    'location': location.name,
    'focus': focus,
    'startedAt': startedAt?.toIso8601String(),
    'finishedAt': finishedAt?.toIso8601String(),
    'resolveDelta': resolveDelta,
    'performanceScore': performanceScore,
  };
}

class WorkoutState {
  WorkoutState({
    required this.profile,
    required this.resolve,
    required this.ratedWorkouts,
    required this.workouts,
  });

  factory WorkoutState.fromJson(Map<String, dynamic> json) => WorkoutState(
    profile: WorkoutProfile.fromJson(
      json['profile'] as Map<String, dynamic>? ?? <String, dynamic>{},
    ),
    resolve: (json['resolve'] as num?)?.toInt() ?? 1000,
    ratedWorkouts: (json['ratedWorkouts'] as num?)?.toInt() ?? 0,
    workouts: (json['workouts'] as List<dynamic>? ?? <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .map(PlannedWorkout.fromJson)
        .toList(),
  );

  final WorkoutProfile profile;
  int resolve;
  int ratedWorkouts;
  final List<PlannedWorkout> workouts;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'schemaVersion': 2,
    'profile': profile.toJson(),
    'resolve': resolve,
    'ratedWorkouts': ratedWorkouts,
    'workouts': workouts.map((PlannedWorkout item) => item.toJson()).toList(),
  };
}
