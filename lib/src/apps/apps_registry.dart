import 'package:flutter/material.dart';

import '../core/app_manifest.dart';
import 'calculator/calculator_app.dart';
import 'focus/focus_app.dart';
import 'maths/maths_app.dart';
import 'notes/notes_app.dart';
import 'tasks/tasks_app.dart';

abstract final class AppRegistry {
  static const List<AppManifest> apps = <AppManifest>[
    AppManifest(
      id: 'notes',
      name: 'Notes',
      tagline: 'Capture ideas in seconds',
      description:
          'A fast, focused notebook for quick thoughts and checklists.',
      icon: Icons.edit_note_rounded,
      gradient: <Color>[Color(0xFF3A7BD5), Color(0xFF00D2FF)],
      category: AppCategory.productivity,
      builder: _notesBuilder,
    ),
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
      id: 'calculator',
      name: 'Calculator',
      tagline: 'Quick, distraction-free math',
      description:
          'A polished calculator that works exactly where you need it.',
      icon: Icons.calculate_rounded,
      gradient: <Color>[Color(0xFF667EEA), Color(0xFF764BA2)],
      category: AppCategory.tools,
      builder: _calculatorBuilder,
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

  static Widget _notesBuilder(BuildContext context) => const NotesApp();

  static Widget _tasksBuilder(BuildContext context) => const TasksApp();

  static Widget _calculatorBuilder(BuildContext context) =>
      const CalculatorApp();

  static Widget _focusBuilder(BuildContext context) => const FocusApp();

  static Widget _mathsBuilder(BuildContext context) => const MathsApp();
}
