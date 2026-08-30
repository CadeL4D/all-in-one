import 'workout_engine.dart';
import 'workout_models.dart';

class CoachEntry {
  const CoachEntry({
    required this.category,
    required this.question,
    required this.answer,
    required this.source,
  });

  final String category;
  final String question;
  final String answer;
  final String source;

  bool matches(String query) {
    final String needle = query.toLowerCase();
    return question.toLowerCase().contains(needle) ||
        answer.toLowerCase().contains(needle) ||
        category.toLowerCase().contains(needle);
  }
}

abstract final class WorkoutCoach {
  static const List<CoachEntry> entries = <CoachEntry>[
    CoachEntry(
      category: 'Volume',
      question: 'How many sets should I do per muscle each week?',
      answer: 'Most evidence lands on a dose-response curve: beginners grow well on around 4–10 hard sets per muscle per week, while trained lifters tend to do best around 12–20. This plan aims for that range across your split by hitting each pattern two or more times weekly.',
      source: 'Baz-Valle et al. 2022, Sports Medicine; Bernárdez-Vázquez et al. 2022',
    ),
    CoachEntry(
      category: 'Splits',
      question: 'Full body or a split—which is better?',
      answer: 'When total weekly sets are equal, research finds similar muscle and strength gains between full-body and split routines. The best split is the one that fits your schedule: 2–3 days favors full body, 4 days suits Upper/Lower, and 5–6 days suits Push/Pull/Legs.',
      source: 'Pedersen et al. 2022 randomized trial',
    ),
    CoachEntry(
      category: 'Splits',
      question: 'How often should I train each muscle?',
      answer: 'Training a muscle around twice per week generally beats once per week for growth at equal volume. Every split offered here repeats each pattern across the week for that reason.',
      source: 'Schoenfeld et al. 2016 meta-analysis on frequency',
    ),
    CoachEntry(
      category: 'Effort',
      question: 'How close to failure should my sets be?',
      answer: 'Most of the benefit arrives 0–3 reps shy of failure. Growth improves as sets get closer to failure, but going from 1 rep in reserve to absolute failure adds little—while adding a lot of fatigue. That is why the plan prescribes 1–3 RIR and only credits extra reps you finish with a rep still in the tank.',
      source: 'Robinson et al. 2024; Refalo et al. 2024; Grgic et al. 2022',
    ),
    CoachEntry(
      category: 'Effort',
      question: 'Do I ever need to train to failure?',
      answer: 'No. Meta-analyses find no significant strength or hypertrophy advantage to failure training, and it costs recovery. Treat failure as an occasional test on safe exercises, not the target.',
      source: 'Grgic et al. 2022, Sports Medicine',
    ),
    CoachEntry(
      category: 'Load',
      question: 'How heavy should my sets be?',
      answer: 'Muscle grows similarly well anywhere from about 5 to 30 reps when sets are taken near failure—effort matters more than the exact number. This plan uses heavier, lower-rep compounds for strength goals and moderate 6–12 rep work for muscle goals.',
      source: 'Robinson et al. 2024; Schoenfeld et al. load meta-analyses',
    ),
    CoachEntry(
      category: 'Load',
      question: 'How does the app choose my weights?',
      answer: 'From any set of 1–10 clean reps you log or enter, it estimates a conservative one-rep max (the lower of the Epley and Brzycki formulas), then prescribes a goal-specific percentage. When you beat the top of a rep range on every set with reps to spare, future loads rise automatically.',
      source: 'Epley (1985) and Brzycki (1993) 1RM formulas',
    ),
    CoachEntry(
      category: 'Progression',
      question: 'How do I progress an exercise?',
      answer: 'Double progression: stay at a weight until you hit the top of the rep range on every set with at least one rep in reserve, then add load (about 5% on lower-body moves, 2.5% on upper-body) and build the reps back up. The plan applies this for you after each completed workout.',
      source: 'Teixeira et al. 2019, progression strategies',
    ),
    CoachEntry(
      category: 'Home',
      question: 'Can I actually build muscle without a gym?',
      answer: 'Yes. Progressive bodyweight squats improved lower-body strength and size in a randomized trial against barbell squats, and push-up ability tracks bench-press strength closely. The key is progression—keep making reps harder, not just more numerous.',
      source: 'Wei et al. 2023 RCT; Alizadeh et al. 2020',
    ),
    CoachEntry(
      category: 'Home',
      question: 'How do I progress bodyweight exercises?',
      answer: 'Change the leverage instead of the load: elevate the feet on push-ups, raise the box on step-ups, slow the tempo, or move to a harder variation (push-up → decline push-up → pike push-up). Each home session in this app uses higher rep targets and harder variations as you beat them.',
      source: 'Teixeira et al. 2019; Harvard Health push-up progressions',
    ),
    CoachEntry(
      category: 'Home',
      question: 'What if I have no pull-up bar at home?',
      answer: 'Horizontal pulling is the fallback: supported body rows under a sturdy table build most of the same musculature. If you own bands, band rows and band pulldowns are included automatically when you switch a session to Home.',
      source: 'Coach guidance (equipment substitutions)',
    ),
    CoachEntry(
      category: 'Resolve',
      question: 'How does my Resolve rating change?',
      answer: 'Resolve follows the rep total. Beat the planned reps across the session and Resolve rises—more when the workout outranked you. Fall short and it dips slightly (losses are capped). Skipping an unopened session costs more, and recovery days are free.',
      source: 'How Workouts works',
    ),
    CoachEntry(
      category: 'Recovery',
      question: 'How long should I rest between sets?',
      answer: 'Around 2–3 minutes on heavy compound sets and 1–2 minutes on lighter accessory work. Very short rests can cost some strength and size on compounds.',
      source: 'Schoenfeld et al. 2016 rest-interval study',
    ),
    CoachEntry(
      category: 'Recovery',
      question: 'Do I need to be sore for it to work?',
      answer: 'No. Soreness mostly reflects novelty, not growth. Progress in reps and load over weeks is the signal that matters.',
      source: 'Coach guidance',
    ),
    CoachEntry(
      category: 'Recovery',
      question: 'When should I take it easy for a week?',
      answer: 'If sleep is wrecked, reps are stalling across the board, or joints ache, cut sets roughly in half for a week while keeping the movements. Use the Recovery button on a scheduled day to skip it without losing Resolve.',
      source: 'Coach guidance (deload practice)',
    ),
    CoachEntry(
      category: 'Basics',
      question: 'How do I warm up?',
      answer: 'Two or three ramping sets of your first exercise (half the working weight, then three-quarters) after a couple of minutes of easy movement is enough. You should feel ready, not tired.',
      source: 'Coach guidance',
    ),
    CoachEntry(
      category: 'Basics',
      question: 'How long until I see results?',
      answer: 'Strength on the lifts usually moves within 2–4 weeks as technique and coordination improve. Visible muscle change typically shows around 8–12 consistent weeks. Logging every session is what makes the trend visible.',
      source: 'Coach guidance',
    ),
  ];

  static List<CoachEntry> search(String query) {
    final String trimmed = query.trim();
    if (trimmed.isEmpty) {
      return entries;
    }
    return entries
        .where((CoachEntry entry) => entry.matches(trimmed))
        .toList(growable: false);
  }

  /// Split recommendation for a chosen number of weekly training days.
  static String splitAdvice(int trainingDays) {
    if (trainingDays <= 3) {
      return 'With $trainingDays days, Full body hits every muscle the most often—usually the strongest fit.';
    }
    if (trainingDays == 4) {
      return 'With 4 days, Upper / Lower gives each muscle two quality sessions with room for volume.';
    }
    return 'With $trainingDays days, Push / Pull / Legs spreads the volume out so each session stays focused.';
  }

  static WorkoutSplit recommendedSplit(int trainingDays) {
    if (trainingDays <= 3) {
      return WorkoutSplit.fullBody;
    }
    if (trainingDays == 4) {
      return WorkoutSplit.upperLower;
    }
    return WorkoutSplit.pushPullLegs;
  }

  /// The coach's two top lifts for every muscle group, for the Coach tab's
  /// reference section.
  static List<(WorkoutMuscle, List<String>)> bestPicksByMuscle() {
    final List<(WorkoutMuscle, List<String>)> result =
        <(WorkoutMuscle, List<String>)>[];
    for (final WorkoutMuscle muscle in WorkoutMuscle.values) {
      final List<WorkoutExerciseDefinition> pool =
          WorkoutEngine.exercises
              .where(
                (WorkoutExerciseDefinition exercise) =>
                    exercise.primary == muscle,
              )
              .toList()
            ..sort((WorkoutExerciseDefinition a, WorkoutExerciseDefinition b) {
              final int byRank = a.rank.compareTo(b.rank);
              return byRank != 0 ? byRank : a.name.compareTo(b.name);
            });
      if (pool.isNotEmpty) {
        result.add((
          muscle,
          pool.take(2).map((WorkoutExerciseDefinition e) => e.name).toList(),
        ));
      }
    }
    return result;
  }
}
