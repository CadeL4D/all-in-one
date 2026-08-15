import 'package:flutter/material.dart';

enum AppCategory { tools, productivity, wellness, learning, games }

extension AppCategoryLabel on AppCategory {
  String get label {
    switch (this) {
      case AppCategory.tools:
        return 'Tools';
      case AppCategory.productivity:
        return 'Productivity';
      case AppCategory.wellness:
        return 'Wellness';
      case AppCategory.learning:
        return 'Learning';
      case AppCategory.games:
        return 'Games';
    }
  }
}

class AppManifest {
  const AppManifest({
    required this.id,
    required this.name,
    required this.tagline,
    required this.description,
    required this.icon,
    required this.gradient,
    required this.category,
    required this.builder,
  });

  final String id;
  final String name;
  final String tagline;
  final String description;
  final IconData icon;
  final List<Color> gradient;
  final AppCategory category;
  final WidgetBuilder builder;
}

class AppIdentity extends InheritedWidget {
  const AppIdentity({super.key, required this.app, required super.child});

  final AppManifest app;

  static AppIdentity? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<AppIdentity>();
  }

  @override
  bool updateShouldNotify(AppIdentity oldWidget) {
    return oldWidget.app != app;
  }
}
