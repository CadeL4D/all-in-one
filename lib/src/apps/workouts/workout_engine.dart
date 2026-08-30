import 'dart:math';

import 'workout_models.dart';

class WorkoutExerciseDefinition {
  const WorkoutExerciseDefinition({
    required this.id,
    required this.name,
    required this.pattern,
    required this.equipment,
    required this.primary,
    this.secondary = const <WorkoutMuscle>[],
    required this.instructions,
    this.compound = true,
    this.supportsEstimatedMax = false,
    this.rank = 3,
    this.harder,
    this.requiresBar = false,
  });

  final String id;
  final String name;
  final String pattern;
  final WorkoutEquipment equipment;
  final WorkoutMuscle primary;
  final List<WorkoutMuscle> secondary;
  final String instructions;
  final bool compound;
  final bool supportsEstimatedMax;

  /// Coach quality within its niche: 1 is a top pick. Drives recommendation
  /// ordering, the rotation, and the ★ badges.
  final int rank;

  /// Id of the next harder bodyweight variation, for home progression.
  final String? harder;

  /// Needs a pull-up bar. Always allowed at the gym; at home only when the
  /// profile says a bar is available.
  final bool requiresBar;
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
const String kPatternArms = 'Arms';
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
          primary: WorkoutMuscle.quads,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes, WorkoutMuscle.core],
          supportsEstimatedMax: true,
          rank: 1,
          instructions: 'Brace before each rep, keep the bar balanced over mid-foot, and use a depth you control without pain.',
        ),
        WorkoutExerciseDefinition(
          id: 'bench_press',
          name: 'Bench press',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.barbell,
          primary: WorkoutMuscle.chest,
          secondary: <WorkoutMuscle>[WorkoutMuscle.triceps, WorkoutMuscle.shoulders],
          supportsEstimatedMax: true,
          rank: 1,
          instructions: 'Keep feet planted and shoulder blades stable. Lower with control and use a spotter or safeties.',
        ),
        WorkoutExerciseDefinition(
          id: 'deadlift',
          name: 'Deadlift',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.barbell,
          primary: WorkoutMuscle.hamstrings,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes, WorkoutMuscle.back],
          supportsEstimatedMax: true,
          rank: 1,
          instructions: 'Brace with the bar close, push the floor away, and stop the set if your position changes sharply.',
        ),
        WorkoutExerciseDefinition(
          id: 'romanian_deadlift',
          name: 'Romanian deadlift',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.barbell,
          primary: WorkoutMuscle.hamstrings,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes],
          supportsEstimatedMax: true,
          rank: 2,
          instructions: 'Push the hips back with a braced trunk and stop when hamstring tension limits the range.',
        ),
        WorkoutExerciseDefinition(
          id: 'barbell_row',
          name: 'Barbell row',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.barbell,
          primary: WorkoutMuscle.back,
          secondary: <WorkoutMuscle>[WorkoutMuscle.biceps],
          supportsEstimatedMax: true,
          rank: 1,
          instructions: 'Hold a steady torso, pull toward the lower ribs, and lower without losing your brace.',
        ),
        WorkoutExerciseDefinition(
          id: 'overhead_press',
          name: 'Overhead press',
          pattern: kPatternVPush,
          equipment: WorkoutEquipment.barbell,
          primary: WorkoutMuscle.shoulders,
          secondary: <WorkoutMuscle>[WorkoutMuscle.triceps],
          supportsEstimatedMax: true,
          rank: 1,
          instructions: 'Squeeze glutes and ribs down, then press in a smooth path without leaning back.',
        ),
        WorkoutExerciseDefinition(
          id: 'barbell_hip_thrust',
          name: 'Barbell hip thrust',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.barbell,
          primary: WorkoutMuscle.glutes,
          secondary: <WorkoutMuscle>[WorkoutMuscle.hamstrings],
          supportsEstimatedMax: true,
          rank: 1,
          instructions: 'Drive the hips to full extension with the pad away from your joints and ribs kept down.',
        ),
        WorkoutExerciseDefinition(
          id: 'incline_bench_press',
          name: 'Incline bench press',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.barbell,
          primary: WorkoutMuscle.chest,
          secondary: <WorkoutMuscle>[WorkoutMuscle.shoulders, WorkoutMuscle.triceps],
          supportsEstimatedMax: true,
          rank: 2,
          instructions: 'Set a low incline, keep the bar over the collarbone line, and lower with control.',
        ),
        WorkoutExerciseDefinition(
          id: 'front_squat',
          name: 'Front squat',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.barbell,
          primary: WorkoutMuscle.quads,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes, WorkoutMuscle.core],
          supportsEstimatedMax: true,
          rank: 2,
          instructions: 'Rest the bar on the shoulders with elbows high, sit straight down, and keep the torso upright.',
        ),
        WorkoutExerciseDefinition(
          id: 'barbell_curl',
          name: 'Barbell curl',
          pattern: kPatternArms,
          equipment: WorkoutEquipment.barbell,
          primary: WorkoutMuscle.biceps,
          compound: false,
          rank: 3,
          instructions: 'Stand tall, curl without swinging the hips, and lower under control.',
        ),
        // Dumbbells.
        WorkoutExerciseDefinition(
          id: 'goblet_squat',
          name: 'Goblet squat',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.dumbbells,
          primary: WorkoutMuscle.quads,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes, WorkoutMuscle.core],
          supportsEstimatedMax: true,
          rank: 1,
          instructions: 'Hold the weight close, sit between your hips, and keep full-foot pressure.',
        ),
        WorkoutExerciseDefinition(
          id: 'dumbbell_press',
          name: 'Dumbbell bench press',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.dumbbells,
          primary: WorkoutMuscle.chest,
          secondary: <WorkoutMuscle>[WorkoutMuscle.triceps],
          supportsEstimatedMax: true,
          rank: 1,
          instructions: 'Keep shoulders supported on the bench and lower the dumbbells through a comfortable range.',
        ),
        WorkoutExerciseDefinition(
          id: 'dumbbell_rdl',
          name: 'Dumbbell Romanian deadlift',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.dumbbells,
          primary: WorkoutMuscle.hamstrings,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes],
          supportsEstimatedMax: true,
          rank: 1,
          instructions: 'Push the hips back with a braced trunk and stop when hamstring tension limits the range.',
        ),
        WorkoutExerciseDefinition(
          id: 'one_arm_row',
          name: 'One-arm dumbbell row',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.dumbbells,
          primary: WorkoutMuscle.back,
          secondary: <WorkoutMuscle>[WorkoutMuscle.biceps],
          rank: 1,
          instructions: 'Support your torso, pull your elbow toward your hip, and avoid twisting for momentum.',
        ),
        WorkoutExerciseDefinition(
          id: 'shoulder_press',
          name: 'Dumbbell shoulder press',
          pattern: kPatternVPush,
          equipment: WorkoutEquipment.dumbbells,
          primary: WorkoutMuscle.shoulders,
          secondary: <WorkoutMuscle>[WorkoutMuscle.triceps],
          supportsEstimatedMax: true,
          rank: 1,
          instructions: 'Press from a stable seated or standing position without arching your lower back.',
        ),
        WorkoutExerciseDefinition(
          id: 'dumbbell_lunge',
          name: 'Dumbbell lunge',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.dumbbells,
          primary: WorkoutMuscle.quads,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes],
          rank: 2,
          instructions: 'Step to a comfortable length, lower under control, and keep the front shin quiet.',
        ),
        WorkoutExerciseDefinition(
          id: 'incline_db_press',
          name: 'Incline dumbbell press',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.dumbbells,
          primary: WorkoutMuscle.chest,
          secondary: <WorkoutMuscle>[WorkoutMuscle.shoulders, WorkoutMuscle.triceps],
          rank: 2,
          instructions: 'On a low-incline bench, press from chest level and keep the wrists stacked over the elbows.',
        ),
        WorkoutExerciseDefinition(
          id: 'chest_supported_row',
          name: 'Chest-supported row',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.dumbbells,
          primary: WorkoutMuscle.back,
          secondary: <WorkoutMuscle>[WorkoutMuscle.biceps],
          rank: 2,
          instructions: 'Lie chest-down on an incline bench, row to the ribs, and let the bench keep your torso honest.',
        ),
        WorkoutExerciseDefinition(
          id: 'lateral_raise',
          name: 'Lateral raise',
          pattern: kPatternVPush,
          equipment: WorkoutEquipment.dumbbells,
          primary: WorkoutMuscle.shoulders,
          compound: false,
          rank: 2,
          instructions: 'Raise the dumbbells to shoulder height with a soft elbow lead and no swing.',
        ),
        WorkoutExerciseDefinition(
          id: 'bulgarian_split_squat',
          name: 'Bulgarian split squat',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.dumbbells,
          primary: WorkoutMuscle.quads,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes],
          rank: 2,
          instructions: 'Rear foot on a bench, drop straight down, and keep the weight in the front foot.',
        ),
        WorkoutExerciseDefinition(
          id: 'dumbbell_curl',
          name: 'Dumbbell curl',
          pattern: kPatternArms,
          equipment: WorkoutEquipment.dumbbells,
          primary: WorkoutMuscle.biceps,
          compound: false,
          rank: 2,
          instructions: 'Keep the elbows pinned to your sides and curl without leaning back.',
        ),
        WorkoutExerciseDefinition(
          id: 'overhead_triceps_extension',
          name: 'Overhead triceps extension',
          pattern: kPatternArms,
          equipment: WorkoutEquipment.dumbbells,
          primary: WorkoutMuscle.triceps,
          compound: false,
          rank: 2,
          instructions: 'Hold one dumbbell overhead with both hands and bend the elbows to lower it behind your head.',
        ),
        // Machines.
        WorkoutExerciseDefinition(
          id: 'leg_press',
          name: 'Leg press',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.machines,
          primary: WorkoutMuscle.quads,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes],
          supportsEstimatedMax: true,
          rank: 2,
          instructions: 'Keep hips against the pad and use a controlled range without locking the knees forcefully.',
        ),
        WorkoutExerciseDefinition(
          id: 'machine_chest_press',
          name: 'Machine chest press',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.machines,
          primary: WorkoutMuscle.chest,
          secondary: <WorkoutMuscle>[WorkoutMuscle.triceps],
          supportsEstimatedMax: true,
          rank: 2,
          instructions: 'Adjust the seat so the handles align with mid-chest and press without shrugging.',
        ),
        WorkoutExerciseDefinition(
          id: 'seated_row',
          name: 'Seated row',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.machines,
          primary: WorkoutMuscle.back,
          secondary: <WorkoutMuscle>[WorkoutMuscle.biceps],
          supportsEstimatedMax: true,
          rank: 1,
          instructions: 'Stay tall, lead with the elbows, and pause before returning the weight under control.',
        ),
        WorkoutExerciseDefinition(
          id: 'lat_pulldown',
          name: 'Lat pulldown',
          pattern: kPatternVPull,
          equipment: WorkoutEquipment.machines,
          primary: WorkoutMuscle.back,
          secondary: <WorkoutMuscle>[WorkoutMuscle.biceps],
          supportsEstimatedMax: true,
          rank: 1,
          instructions: 'Pull toward the upper chest with the ribs down; avoid leaning far back for momentum.',
        ),
        WorkoutExerciseDefinition(
          id: 'leg_curl',
          name: 'Leg curl',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.machines,
          primary: WorkoutMuscle.hamstrings,
          compound: false,
          rank: 1,
          instructions: 'Set the machine to match your knee joint and keep the movement smooth.',
        ),
        WorkoutExerciseDefinition(
          id: 'leg_extension',
          name: 'Leg extension',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.machines,
          primary: WorkoutMuscle.quads,
          compound: false,
          rank: 2,
          instructions: 'Align the pad just above the ankle and squeeze at the top without swinging.',
        ),
        WorkoutExerciseDefinition(
          id: 'machine_fly',
          name: 'Machine chest fly',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.machines,
          primary: WorkoutMuscle.chest,
          compound: false,
          rank: 3,
          instructions: 'Set the arms level with the chest, hug an arc, and keep the shoulders relaxed.',
        ),
        WorkoutExerciseDefinition(
          id: 'machine_shoulder_press',
          name: 'Machine shoulder press',
          pattern: kPatternVPush,
          equipment: WorkoutEquipment.machines,
          primary: WorkoutMuscle.shoulders,
          secondary: <WorkoutMuscle>[WorkoutMuscle.triceps],
          rank: 2,
          instructions: 'Set the seat so the handles start at ear height and press without a hard lockout.',
        ),
        WorkoutExerciseDefinition(
          id: 'cable_triceps_pushdown',
          name: 'Triceps pushdown',
          pattern: kPatternArms,
          equipment: WorkoutEquipment.machines,
          primary: WorkoutMuscle.triceps,
          compound: false,
          rank: 1,
          instructions: 'Pin the elbows to your ribs and push the bar down until the arms are straight.',
        ),
        WorkoutExerciseDefinition(
          id: 'machine_calf_raise',
          name: 'Calf raise',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.machines,
          primary: WorkoutMuscle.calves,
          compound: false,
          rank: 1,
          instructions: 'Balls of the feet on the platform, drop the heels fully, then press up to a strong squeeze.',
        ),
        WorkoutExerciseDefinition(
          id: 'single_leg_calf_raise',
          name: 'Single-leg calf raise',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.calves,
          compound: false,
          rank: 2,
          instructions: 'Balls of one foot on a step, hold the wall for balance, and press up through the big toe.',
        ),
        WorkoutExerciseDefinition(
          id: 'face_pull',
          name: 'Face pull',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.machines,
          primary: WorkoutMuscle.shoulders,
          secondary: <WorkoutMuscle>[WorkoutMuscle.back],
          compound: false,
          rank: 2,
          instructions: 'Pull the rope toward your forehead and split the hands past the ears; keep it light.',
        ),
        // Bands.
        WorkoutExerciseDefinition(
          id: 'band_row',
          name: 'Band row',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.bands,
          primary: WorkoutMuscle.back,
          secondary: <WorkoutMuscle>[WorkoutMuscle.biceps],
          rank: 2,
          instructions: 'Anchor the band securely, pull toward the ribs, and return with control.',
        ),
        WorkoutExerciseDefinition(
          id: 'band_press',
          name: 'Band chest press',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.bands,
          primary: WorkoutMuscle.chest,
          secondary: <WorkoutMuscle>[WorkoutMuscle.triceps],
          rank: 2,
          instructions: 'Use a secure anchor and a split stance, then press without letting the ribs flare.',
        ),
        WorkoutExerciseDefinition(
          id: 'band_pulldown',
          name: 'Band pulldown',
          pattern: kPatternVPull,
          equipment: WorkoutEquipment.bands,
          primary: WorkoutMuscle.back,
          secondary: <WorkoutMuscle>[WorkoutMuscle.biceps],
          rank: 2,
          instructions: 'Anchor the band overhead, kneel tall, and pull the elbows down to your sides.',
        ),
        WorkoutExerciseDefinition(
          id: 'band_pull_apart',
          name: 'Band pull-apart',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.bands,
          primary: WorkoutMuscle.shoulders,
          secondary: <WorkoutMuscle>[WorkoutMuscle.back],
          compound: false,
          rank: 3,
          instructions: 'Hold the band at shoulder height, pull it apart to the chest, and pause with the shoulders back.',
        ),
        WorkoutExerciseDefinition(
          id: 'band_curl',
          name: 'Band curl',
          pattern: kPatternArms,
          equipment: WorkoutEquipment.bands,
          primary: WorkoutMuscle.biceps,
          compound: false,
          rank: 3,
          instructions: 'Stand on the band and curl, keeping tension even at the bottom.',
        ),
        WorkoutExerciseDefinition(
          id: 'band_pushdown',
          name: 'Band pushdown',
          pattern: kPatternArms,
          equipment: WorkoutEquipment.bands,
          primary: WorkoutMuscle.triceps,
          compound: false,
          rank: 3,
          instructions: 'Anchor the band high and push the hands down and back, like the cable version.',
        ),
        // Bodyweight.
        WorkoutExerciseDefinition(
          id: 'push_up',
          name: 'Push-up',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.chest,
          secondary: <WorkoutMuscle>[WorkoutMuscle.triceps],
          rank: 1,
          harder: 'decline_push_up',
          instructions: 'Keep a straight line from shoulders to ankles. Too hard? Elevate your hands. Too easy? Elevate your feet.',
        ),
        WorkoutExerciseDefinition(
          id: 'decline_push_up',
          name: 'Decline push-up',
          pattern: kPatternHPush,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.chest,
          secondary: <WorkoutMuscle>[WorkoutMuscle.triceps, WorkoutMuscle.shoulders],
          rank: 2,
          instructions: 'Feet raised on a stable surface. The higher the feet, the harder the rep—keep the body line strict.',
        ),
        WorkoutExerciseDefinition(
          id: 'pike_push_up',
          name: 'Pike push-up',
          pattern: kPatternVPush,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.shoulders,
          secondary: <WorkoutMuscle>[WorkoutMuscle.triceps],
          rank: 1,
          instructions: 'Hips high, lower the crown of your head toward the floor between your hands.',
        ),
        WorkoutExerciseDefinition(
          id: 'chair_dip',
          name: 'Chair dip',
          pattern: kPatternVPush,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.triceps,
          secondary: <WorkoutMuscle>[WorkoutMuscle.chest, WorkoutMuscle.shoulders],
          rank: 2,
          instructions: 'Hands on a stable chair or bench behind you; keep the chest tall and shoulders happy.',
        ),
        WorkoutExerciseDefinition(
          id: 'pull_up',
          name: 'Pull-up',
          pattern: kPatternVPull,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.back,
          secondary: <WorkoutMuscle>[WorkoutMuscle.biceps],
          rank: 1,
          requiresBar: true,
          instructions: 'Hang from a sturdy bar and pull your chest toward it. Add a band or jump-assist to build up.',
        ),
        WorkoutExerciseDefinition(
          id: 'chin_up',
          name: 'Chin-up',
          pattern: kPatternVPull,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.back,
          secondary: <WorkoutMuscle>[WorkoutMuscle.biceps],
          rank: 2,
          requiresBar: true,
          instructions: 'Palms facing you, hang fully, and pull until the chin clears the bar. The underhand grip adds biceps.',
        ),
        WorkoutExerciseDefinition(
          id: 'inverted_row',
          name: 'Supported body row',
          pattern: kPatternHPull,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.back,
          secondary: <WorkoutMuscle>[WorkoutMuscle.biceps],
          rank: 1,
          instructions: 'Use a securely fixed bar or sturdy table, keep a straight body line, and adjust your foot position for control.',
        ),
        WorkoutExerciseDefinition(
          id: 'bodyweight_squat',
          name: 'Bodyweight squat',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.quads,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes],
          rank: 1,
          harder: 'split_squat',
          instructions: 'Sit between your hips with the chest tall. Pause at the bottom to make each rep count.',
        ),
        WorkoutExerciseDefinition(
          id: 'split_squat',
          name: 'Split squat',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.quads,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes],
          rank: 2,
          harder: 'step_up',
          instructions: 'Use a stable stance, descend vertically, and hold support if balance limits your technique.',
        ),
        WorkoutExerciseDefinition(
          id: 'step_up',
          name: 'Step-up',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.quads,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes],
          rank: 2,
          instructions: 'Use a knee-height stable surface and drive through the whole foot without pushing off the back leg.',
        ),
        WorkoutExerciseDefinition(
          id: 'reverse_lunge',
          name: 'Reverse lunge',
          pattern: kPatternKnee,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.glutes,
          secondary: <WorkoutMuscle>[WorkoutMuscle.quads],
          rank: 2,
          instructions: 'Step back, drop the back knee toward the floor, and drive up through the front foot.',
        ),
        WorkoutExerciseDefinition(
          id: 'glute_bridge',
          name: 'Glute bridge',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.glutes,
          secondary: <WorkoutMuscle>[WorkoutMuscle.hamstrings],
          rank: 1,
          harder: 'single_leg_glute_bridge',
          instructions: 'Brace your trunk and extend the hips without arching your lower back. Pause at the top.',
        ),
        WorkoutExerciseDefinition(
          id: 'single_leg_glute_bridge',
          name: 'Single-leg glute bridge',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.glutes,
          secondary: <WorkoutMuscle>[WorkoutMuscle.hamstrings],
          rank: 2,
          harder: 'nordic_curl',
          instructions: 'One foot planted, hips level. Slow the tempo down to keep the rep honest.',
        ),
        WorkoutExerciseDefinition(
          id: 'nordic_curl',
          name: 'Nordic curl',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.hamstrings,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes],
          rank: 2,
          instructions: 'Anchor the ankles (sofa or partner) and lower as slowly as you control. Use your hands to reset.',
        ),
        WorkoutExerciseDefinition(
          id: 'single_leg_rdl',
          name: 'Single-leg deadlift',
          pattern: kPatternHip,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.hamstrings,
          secondary: <WorkoutMuscle>[WorkoutMuscle.glutes],
          rank: 2,
          instructions: 'Stand on one leg, reach the other foot back, and fold until the hamstring stops you.',
        ),
        WorkoutExerciseDefinition(
          id: 'dead_bug',
          name: 'Dead bug',
          pattern: kPatternCore,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.core,
          compound: false,
          rank: 1,
          instructions: 'Press the low back into the floor while the opposite arm and leg reach away.',
        ),
        WorkoutExerciseDefinition(
          id: 'bird_dog',
          name: 'Bird dog',
          pattern: kPatternCore,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.core,
          compound: false,
          rank: 2,
          instructions: 'From all fours, reach the opposite arm and leg long without letting the hips tilt.',
        ),
        WorkoutExerciseDefinition(
          id: 'bicycle_crunch',
          name: 'Bicycle crunch',
          pattern: kPatternCore,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.core,
          compound: false,
          rank: 2,
          instructions: 'Rotate from the ribs, not the neck, and keep the lower back comfortable.',
        ),
        WorkoutExerciseDefinition(
          id: 'plank',
          name: 'Plank',
          pattern: kPatternCore,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.core,
          compound: false,
          rank: 1,
          instructions: 'Stack the elbows under the shoulders, squeeze the glutes, and hold a straight line. Count each 20 seconds as a rep.',
        ),
        WorkoutExerciseDefinition(
          id: 'side_plank',
          name: 'Side plank',
          pattern: kPatternCore,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.core,
          compound: false,
          rank: 2,
          instructions: 'Elbow under the shoulder, hips high, body in one line. Count each 20 seconds per side as a rep.',
        ),
        WorkoutExerciseDefinition(
          id: 'superman',
          name: 'Superman hold',
          pattern: kPatternCore,
          equipment: WorkoutEquipment.bodyweight,
          primary: WorkoutMuscle.back,
          secondary: <WorkoutMuscle>[WorkoutMuscle.core],
          compound: false,
          rank: 2,
          instructions: 'Face down, lift the chest and thighs and hold. Keep the neck long; count each 20 seconds as a rep.',
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
        'incline_bench_press': ('bench_press', 0.80),
        'front_squat': ('back_squat', 0.85),
        'chest_supported_row': ('bench_press', 0.55),
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

  static WorkoutExerciseDefinition? definitionFor(String exerciseId) {
    for (final WorkoutExerciseDefinition exercise in exercises) {
      if (exercise.id == exerciseId) {
        return exercise;
      }
    }
    return null;
  }

  static List<WorkoutExerciseDefinition> baselineExercises(
    Set<WorkoutEquipment> equipment,
  ) {
    final List<WorkoutExerciseDefinition> pool =
        exercises
            .where(
              (WorkoutExerciseDefinition exercise) =>
                  equipment.contains(exercise.equipment) &&
                  exercise.supportsEstimatedMax,
            )
            .toList()
          ..sort(_byRecommendation);
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
    return (direct == null || direct <= 0) && _loadHints.containsKey(exerciseId);
  }

  static List<_SessionTemplate> _templatesFor(WorkoutSplit split) =>
      switch (split) {
        WorkoutSplit.fullBody => const <_SessionTemplate>[
          _SessionTemplate('full_a', 'Full body A · Foundation', <_SessionSlot>[
            _SessionSlot(kPatternKnee),
            _SessionSlot(kPatternHPush),
            _SessionSlot(kPatternHip),
            _SessionSlot(kPatternHPull),
            _SessionSlot(kPatternVPush),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('full_b', 'Full body B · Hinge & pull', <_SessionSlot>[
            _SessionSlot(kPatternHip),
            _SessionSlot(kPatternHPull),
            _SessionSlot(kPatternKnee),
            _SessionSlot(kPatternVPull),
            _SessionSlot(kPatternVPush),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate(
            'full_c',
            'Full body C · Single-leg & arms',
            <_SessionSlot>[
              _SessionSlot(kPatternKnee),
              _SessionSlot(kPatternHPush),
              _SessionSlot(kPatternHip),
              _SessionSlot(kPatternHPull),
              _SessionSlot(kPatternArms, accessory: true),
              _SessionSlot(kPatternCore, accessory: true),
            ],
          ),
        ],
        WorkoutSplit.upperLower => const <_SessionTemplate>[
          _SessionTemplate('upper_a', 'Upper A · Press & row', <_SessionSlot>[
            _SessionSlot(kPatternHPush),
            _SessionSlot(kPatternHPull),
            _SessionSlot(kPatternVPush),
            _SessionSlot(kPatternVPull),
            _SessionSlot(kPatternArms, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('lower_a', 'Lower A · Squat focus', <_SessionSlot>[
            _SessionSlot(kPatternKnee),
            _SessionSlot(kPatternHip),
            _SessionSlot(kPatternKnee, accessory: true),
            _SessionSlot(kPatternHip, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('upper_b', 'Upper B · Shoulder focus', <_SessionSlot>[
            _SessionSlot(kPatternVPush),
            _SessionSlot(kPatternVPull),
            _SessionSlot(kPatternHPush),
            _SessionSlot(kPatternHPull),
            _SessionSlot(kPatternArms, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('lower_b', 'Lower B · Hinge focus', <_SessionSlot>[
            _SessionSlot(kPatternHip),
            _SessionSlot(kPatternKnee),
            _SessionSlot(kPatternHip, accessory: true),
            _SessionSlot(kPatternKnee, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
        ],
        WorkoutSplit.pushPullLegs => const <_SessionTemplate>[
          _SessionTemplate('push_a', 'Push A · Chest focus', <_SessionSlot>[
            _SessionSlot(kPatternHPush),
            _SessionSlot(kPatternVPush),
            _SessionSlot(kPatternHPush, accessory: true),
            _SessionSlot(kPatternArms, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('pull_a', 'Pull A · Row focus', <_SessionSlot>[
            _SessionSlot(kPatternHPull),
            _SessionSlot(kPatternVPull),
            _SessionSlot(kPatternHPull, accessory: true),
            _SessionSlot(kPatternArms, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('legs_a', 'Legs A · Squat focus', <_SessionSlot>[
            _SessionSlot(kPatternKnee),
            _SessionSlot(kPatternHip),
            _SessionSlot(kPatternKnee, accessory: true),
            _SessionSlot(kPatternHip, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('push_b', 'Push B · Shoulder focus', <_SessionSlot>[
            _SessionSlot(kPatternVPush),
            _SessionSlot(kPatternHPush),
            _SessionSlot(kPatternVPush, accessory: true),
            _SessionSlot(kPatternArms, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('pull_b', 'Pull B · Lat focus', <_SessionSlot>[
            _SessionSlot(kPatternVPull),
            _SessionSlot(kPatternHPull),
            _SessionSlot(kPatternVPull, accessory: true),
            _SessionSlot(kPatternArms, accessory: true),
            _SessionSlot(kPatternCore, accessory: true),
          ]),
          _SessionTemplate('legs_b', 'Legs B · Hinge focus', <_SessionSlot>[
            _SessionSlot(kPatternHip),
            _SessionSlot(kPatternKnee),
            _SessionSlot(kPatternHip, accessory: true),
            _SessionSlot(kPatternKnee, accessory: true),
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
        rotationSeed: sessionIndex,
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
      rotationSeed: 0,
    );
  }

  static List<PlannedExercise> _planSession({
    required WorkoutProfile profile,
    required _SessionTemplate template,
    required WorkoutLocation location,
    required int rotationSeed,
  }) {
    final Set<WorkoutEquipment> available = _availableEquipment(
      profile,
      location,
    );
    final int maxExercises = profile.sessionMinutes <= 30
        ? 4
        : profile.sessionMinutes <= 45
        ? 5
        : 6;
    final Set<String> usedIds = <String>{};
    final List<PlannedExercise> planned = <PlannedExercise>[];
    final Map<String, int> patternCount = <String, int>{};
    for (final _SessionSlot slot in template.slots) {
      if (planned.length >= maxExercises) {
        break;
      }
      final int rotationIndex =
          rotationSeed + (patternCount[slot.pattern] ?? 0);
      patternCount[slot.pattern] = (patternCount[slot.pattern] ?? 0) + 1;
      final WorkoutExerciseDefinition? chosen = _chooseExercise(
        profile: profile,
        location: location,
        pattern: slot.pattern,
        accessorySlot: slot.accessory,
        available: available,
        usedIds: usedIds,
        rotationIndex: rotationIndex,
      );
      if (chosen == null) {
        continue;
      }
      usedIds.add(chosen.id);
      planned.add(_planExercise(profile, chosen, slot.accessory, location));
    }
    return planned;
  }

  static Set<WorkoutEquipment> _availableEquipment(
    WorkoutProfile profile,
    WorkoutLocation location,
  ) => location == WorkoutLocation.home
      ? <WorkoutEquipment>{
          WorkoutEquipment.bodyweight,
          if (profile.equipment.contains(WorkoutEquipment.bands))
            WorkoutEquipment.bands,
        }
      : <WorkoutEquipment>{...profile.equipment, WorkoutEquipment.bodyweight};

  static bool _isAvailable(
    WorkoutExerciseDefinition exercise,
    WorkoutProfile profile,
    WorkoutLocation location,
    Set<WorkoutEquipment> available,
  ) {
    if (!available.contains(exercise.equipment)) {
      return false;
    }
    if (exercise.requiresBar &&
        location == WorkoutLocation.home &&
        !profile.homePullUpBar) {
      return false;
    }
    return true;
  }

  static int _equipmentOrder(WorkoutEquipment equipment) => switch (equipment) {
    WorkoutEquipment.barbell => 0,
    WorkoutEquipment.dumbbells => 1,
    WorkoutEquipment.machines => 2,
    WorkoutEquipment.bands => 3,
    WorkoutEquipment.bodyweight => 4,
  };

  static int _byRecommendation(
    WorkoutExerciseDefinition a,
    WorkoutExerciseDefinition b,
  ) {
    final int byRank = a.rank.compareTo(b.rank);
    if (byRank != 0) {
      return byRank;
    }
    return _equipmentOrder(a.equipment).compareTo(_equipmentOrder(b.equipment));
  }

  /// Exercises the coach would use for a pattern at this location, best first.
  /// Powers the swap sheet's slot alternatives.
  static List<WorkoutExerciseDefinition> alternativesFor(
    String pattern,
    WorkoutProfile profile,
    WorkoutLocation location,
  ) {
    final Set<WorkoutEquipment> available = _availableEquipment(
      profile,
      location,
    );
    return exercises
        .where(
          (WorkoutExerciseDefinition exercise) =>
              exercise.pattern == pattern &&
              _isAvailable(exercise, profile, location, available),
        )
        .toList()
      ..sort(_byRecommendation);
  }

  /// Every available exercise grouped by primary muscle, best first within
  /// each group. Powers the swap sheet's "pick any exercise" catalog.
  static Map<WorkoutMuscle, List<WorkoutExerciseDefinition>> catalogByMuscle(
    WorkoutProfile profile,
    WorkoutLocation location,
  ) {
    final Set<WorkoutEquipment> available = _availableEquipment(
      profile,
      location,
    );
    final Map<WorkoutMuscle, List<WorkoutExerciseDefinition>> catalog =
        <WorkoutMuscle, List<WorkoutExerciseDefinition>>{};
    for (final WorkoutMuscle muscle in WorkoutMuscle.values) {
      final List<WorkoutExerciseDefinition> group =
          exercises
              .where(
                (WorkoutExerciseDefinition exercise) =>
                    exercise.primary == muscle &&
                    _isAvailable(exercise, profile, location, available),
              )
              .toList()
            ..sort(_byRecommendation);
      if (group.isNotEmpty) {
        catalog[muscle] = group;
      }
    }
    return catalog;
  }

  /// The coach's top choice for a slot: honors a remembered preference, then
  /// the ranked rotation.
  static WorkoutExerciseDefinition? coachPickFor(
    String pattern,
    WorkoutProfile profile,
    WorkoutLocation location, {
    bool accessorySlot = false,
  }) {
    final List<WorkoutExerciseDefinition> pool = alternativesFor(
      pattern,
      profile,
      location,
    ).where((WorkoutExerciseDefinition item) => accessorySlot || item.compound).toList();
    if (pool.isEmpty) {
      return null;
    }
    final String? preferred =
        profile.exercisePreferences['${location.name}:$pattern'];
    if (preferred != null) {
      for (final WorkoutExerciseDefinition item in pool) {
        if (item.id == preferred) {
          return item;
        }
      }
    }
    return pool.first;
  }

  static WorkoutExerciseDefinition? _chooseExercise({
    required WorkoutProfile profile,
    required WorkoutLocation location,
    required String pattern,
    required bool accessorySlot,
    required Set<WorkoutEquipment> available,
    required Set<String> usedIds,
    required int rotationIndex,
  }) {
    List<WorkoutExerciseDefinition> pool =
        exercises
            .where(
              (WorkoutExerciseDefinition exercise) =>
                  exercise.pattern == pattern &&
                  (accessorySlot || exercise.compound) &&
                  _isAvailable(exercise, profile, location, available) &&
                  !usedIds.contains(exercise.id),
            )
            .toList();
    // Gym compound slots stay on weighted tools unless the equipment pool is
    // too thin to rotate; accessory work may always be bodyweight.
    if (location == WorkoutLocation.gym && !accessorySlot) {
      final List<WorkoutExerciseDefinition> weighted =
          pool
              .where(
                (WorkoutExerciseDefinition exercise) =>
                    exercise.equipment != WorkoutEquipment.bodyweight,
              )
              .toList();
      if (weighted.length >= 2) {
        pool = weighted;
      }
    }
    pool.sort(_byRecommendation);
    if (pool.isEmpty) {
      return null;
    }
    final String? preferred =
        profile.exercisePreferences['${location.name}:$pattern'];
    if (preferred != null) {
      for (final WorkoutExerciseDefinition item in pool) {
        if (item.id == preferred) {
          return item;
        }
      }
    }
    return pool[rotationIndex % pool.length];
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
        sets: _homeSets(profile),
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

  static int _homeSets(WorkoutProfile profile) => switch (profile.goal) {
    WorkoutGoal.returning => 2,
    WorkoutGoal.muscle ||
    WorkoutGoal.strength => profile.experience == WorkoutExperience.experienced
        ? 4
        : 3,
    WorkoutGoal.balanced => 3,
  };

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
      if (exercise.logs.isEmpty) {
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
      if (exercise.weight != null) {
        _bumpFutureLoads(state, completed, exercise);
      } else {
        _progressBodyweight(state, completed.date, exercise);
      }
    }
  }

  static void _bumpFutureLoads(
    WorkoutState state,
    PlannedWorkout completed,
    PlannedExercise exercise,
  ) {
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

  /// Double progression without a barbell: beat the top of the rep range on
  /// every set and future sessions add reps, then graduate to the next harder
  /// variation once the range tops out.
  static void _progressBodyweight(
    WorkoutState state,
    DateTime afterDate,
    PlannedExercise done,
  ) {
    final bool graduate = done.targetReps + 2 > done.repRangeMax;
    WorkoutExerciseDefinition? harder;
    if (graduate) {
      final String? nextId = definitionFor(done.exerciseId)?.harder;
      harder = nextId == null ? null : definitionFor(nextId);
    }
    for (final PlannedWorkout future in state.workouts) {
      if (!future.date.isAfter(afterDate) ||
          future.status != WorkoutStatus.scheduled) {
        continue;
      }
      for (int index = 0; index < future.exercises.length; index++) {
        final PlannedExercise planned = future.exercises[index];
        if (planned.exerciseId != done.exerciseId) {
          continue;
        }
        if (harder != null && !harder.requiresBar) {
          future.exercises[index] = _graduatedExercise(state.profile, harder);
        } else {
          future.exercises[index] = _withTargetReps(
            planned,
            min(planned.targetReps + 2, planned.repRangeMax + 4),
          );
        }
      }
    }
  }

  static PlannedExercise _withTargetReps(PlannedExercise source, int reps) {
    return PlannedExercise(
      exerciseId: source.exerciseId,
      name: source.name,
      pattern: source.pattern,
      sets: source.sets,
      targetReps: reps,
      repRangeMax: source.repRangeMax,
      targetRir: source.targetRir,
      weight: source.weight,
      instructions: source.instructions,
      logs: source.logs,
    );
  }

  /// A freshly graduated variation starts about four reps below its usual
  /// baseline so the first session at the new leverage is achievable.
  static PlannedExercise _graduatedExercise(
    WorkoutProfile profile,
    WorkoutExerciseDefinition definition,
  ) {
    final (int reps, int repMax) = _bodyweightReps(definition.pattern);
    return PlannedExercise(
      exerciseId: definition.id,
      name: definition.name,
      pattern: definition.pattern,
      sets: _homeSets(profile),
      targetReps: max(6, reps - 4),
      repRangeMax: repMax,
      targetRir: 2,
      weight: null,
      instructions: definition.instructions,
    );
  }

  /// Primary muscles trained, in canonical order — for the session chips.
  static List<WorkoutMuscle> sessionMuscles(
    Iterable<PlannedExercise> exercises,
  ) {
    final Set<WorkoutMuscle> muscles = <WorkoutMuscle>{};
    for (final PlannedExercise exercise in exercises) {
      final WorkoutExerciseDefinition? definition = definitionFor(
        exercise.exerciseId,
      );
      if (definition != null) {
        muscles.add(definition.primary);
      }
    }
    return WorkoutMuscle.values
        .where((WorkoutMuscle muscle) => muscles.contains(muscle))
        .toList(growable: false);
  }

  /// Planned sets per muscle across a stretch of sessions: primary counts a
  /// full set, secondaries half a set. The UI compares this to the 10–20
  /// evidence band.
  static Map<WorkoutMuscle, double> setsByMuscle(
    Iterable<PlannedExercise> exercises,
  ) {
    final Map<WorkoutMuscle, double> totals = <WorkoutMuscle, double>{};
    for (final PlannedExercise exercise in exercises) {
      final WorkoutExerciseDefinition? definition = definitionFor(
        exercise.exerciseId,
      );
      if (definition == null) {
        continue;
      }
      final double sets = exercise.logs.length.toDouble();
      totals[definition.primary] = (totals[definition.primary] ?? 0) + sets;
      for (final WorkoutMuscle muscle in definition.secondary) {
        totals[muscle] = (totals[muscle] ?? 0) + sets * 0.5;
      }
    }
    return totals;
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
