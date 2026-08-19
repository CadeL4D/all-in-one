import 'package:flutter/material.dart';

import '../core/app_manifest.dart';
import 'focus/focus_app.dart';
import 'gridlock/gridlock_app.dart';
import 'maths/maths_app.dart';
import 'noises/noises_app.dart';
import 'prompts/prompts_app.dart';
import 'routines/routines_app.dart';
import 'sanctuary/sanctuary_app.dart';
import 'tasks/tasks_app.dart';
import 'workouts/workouts_app.dart';

abstract final class AppRegistry {
  static const List<AppManifest> apps = <AppManifest>[
    AppManifest(
      id: 'prompts',
      name: 'Prompts',
      tagline: 'Titles and reusable notes',
      description: 'Keep reusable notes together and copy the note text without the title.',
      icon: Icons.lightbulb_rounded,
      gradient: <Color>[Color(0xFFD97706), Color(0xFFFBBF24)],
      category: AppCategory.productivity,
      builder: _promptsBuilder,
    ),
    AppManifest(
      id: 'tasks',
      name: 'Tasks',
      tagline: 'Prioritize today',
      description:
          'Order today’s priorities, organize every task, and nest subtasks.',
      icon: Icons.check_circle_rounded,
      gradient: <Color>[Color(0xFF2563EB), Color(0xFF38BDF8)],
      category: AppCategory.productivity,
      builder: _tasksBuilder,
    ),
    AppManifest(
      id: 'routines',
      name: 'Routines',
      tagline: 'Build consistent habits',
      description: 'Create repeatable routines and track each step every day.',
      icon: Icons.event_repeat_rounded,
      gradient: <Color>[Color(0xFF7C3AED), Color(0xFFC084FC)],
      category: AppCategory.wellness,
      builder: _routinesBuilder,
    ),
    AppManifest(
      id: 'maths',
      name: 'Maths',
      tagline: 'Practice with a purpose',
      description: 'Timed maths challenges with saved personal bests.',
      icon: Icons.functions_rounded,
      gradient: <Color>[Color(0xFF059669), Color(0xFF34D399)],
      category: AppCategory.learning,
      builder: _mathsBuilder,
    ),
    AppManifest(
      id: 'focus',
      name: 'Focus',
      tagline: 'Timers that keep you on track',
      description: 'A simple focus timer with work and break intervals.',
      icon: Icons.timer_rounded,
      gradient: <Color>[Color(0xFFE11D48), Color(0xFF7C3AED)],
      category: AppCategory.wellness,
      builder: _focusBuilder,
    ),
    AppManifest(
      id: 'noises',
      name: 'Noises',
      tagline: 'Ambient soundscapes',
      description:
          'Play colored noise and mix in Creative Commons nature audio.',
      icon: Icons.graphic_eq_rounded,
      gradient: <Color>[Color(0xFF0891B2), Color(0xFF2563EB)],
      category: AppCategory.wellness,
      builder: _noisesBuilder,
    ),
    AppManifest(
      id: 'gridlock',
      name: 'Gridlock Rush',
      tagline: 'Watch. Remember. Repeat.',
      description: 'A Simon-style spatial memory game with growing routes and optional decoys.',
      icon: Icons.grid_view_rounded,
      gradient: <Color>[Color(0xFF17233B), Color(0xFF5AE6D3)],
      category: AppCategory.games,
      builder: _gridlockBuilder,
    ),
    AppManifest(
      id: 'sanctuary',
      name: 'Sanctuary & Cinder',
      tagline: 'Build by day. Endure by night.',
      description: 'Guide an autonomous settlement, shape defensive paths, and wield divine powers against the abyss.',
      icon: Icons.local_fire_department_rounded,
      gradient: <Color>[Color(0xFF2D6A4F), Color(0xFFFF5400)],
      category: AppCategory.games,
      builder: _sanctuaryBuilder,
    ),
    AppManifest(
      id: 'workouts',
      name: 'Workouts',
      tagline: 'Meet the pressure. Build resolve.',
      description: 'Generate a private weekly strength plan and face every workout with an adaptive Resolve rating.',
      icon: Icons.fitness_center_rounded,
      gradient: <Color>[Color(0xFF111827), Color(0xFF34D399)],
      category: AppCategory.wellness,
      builder: _workoutsBuilder,
    ),
  ];

  static AppManifest byId(String id) {
    return apps.firstWhere((AppManifest app) => app.id == id);
  }

  static Widget _tasksBuilder(BuildContext context) => const TasksApp();

  static Widget _promptsBuilder(BuildContext context) => const PromptsApp();

  static Widget _focusBuilder(BuildContext context) => const FocusApp();

  static Widget _mathsBuilder(BuildContext context) => const MathsApp();

  static Widget _routinesBuilder(BuildContext context) => const RoutinesApp();

  static Widget _noisesBuilder(BuildContext context) => const NoisesApp();

  static Widget _gridlockBuilder(BuildContext context) => const GridlockApp();

  static Widget _sanctuaryBuilder(BuildContext context) => const SanctuaryApp();

  static Widget _workoutsBuilder(BuildContext context) => const WorkoutsApp();
}
