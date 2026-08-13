import 'package:flutter/material.dart';

enum AppCategory { tools, productivity, wellness }

extension AppCategoryLabel on AppCategory {
  String get label {
    switch (this) {
      case AppCategory.tools:
        return 'Tools';
      case AppCategory.productivity:
        return 'Productivity';
      case AppCategory.wellness:
        return 'Wellness';
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
