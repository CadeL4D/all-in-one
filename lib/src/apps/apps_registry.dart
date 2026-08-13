import 'package:flutter/material.dart';

import '../core/app_manifest.dart';
import 'focus/focus_app.dart';
import 'maths/maths_app.dart';
import 'routines/routines_app.dart';
import 'tasks/tasks_app.dart';

abstract final class AppRegistry {
  static const List<AppManifest> apps = <AppManifest>[
    AppManifest(
      id: 'tasks',
      name: 'Tasks',
      tagline: 'Plan your day',
      description: 'A simple task list that keeps your priorities visible.',
      icon: Icons.check_circle_rounded,
      gradient: <Color>[Color(0xFFFF8008), Color(0xFFFFC837)],
      category: AppCategory.productivity,
      builder: _tasksBuilder,
    ),
    AppManifest(
      id: 'routines',
      name: 'Routines',
      tagline: 'Build consistent habits',
      description: 'Create repeatable routines and track each step every day.',
      icon: Icons.event_repeat_rounded,
      gradient: <Color>[Color(0xFF8E2DE2), Color(0xFF4A00E0)],
      category: AppCategory.wellness,
      builder: _routinesBuilder,
    ),
    AppManifest(
      id: 'maths',
      name: 'Maths',
      tagline: 'Practice with a purpose',
      description: 'Timed maths challenges with saved personal bests.',
      icon: Icons.functions_rounded,
      gradient: <Color>[Color(0xFF11998E), Color(0xFF38EF7D)],
      category: AppCategory.learning,
      builder: _mathsBuilder,
    ),
    AppManifest(
      id: 'focus',
      name: 'Focus',
      tagline: 'Timers that keep you on track',
      description: 'A simple focus timer with work and break intervals.',
      icon: Icons.timer_rounded,
      gradient: <Color>[Color(0xFFFC466B), Color(0xFF3F5EFB)],
      category: AppCategory.wellness,
      builder: _focusBuilder,
    ),
  ];

  static AppManifest byId(String id) {
    return apps.firstWhere((AppManifest app) => app.id == id);
  }

  static Widget _tasksBuilder(BuildContext context) => const TasksApp();

  static Widget _focusBuilder(BuildContext context) => const FocusApp();

  static Widget _mathsBuilder(BuildContext context) => const MathsApp();

  static Widget _routinesBuilder(BuildContext context) => const RoutinesApp();
}
