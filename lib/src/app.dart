import 'package:flutter/material.dart';

import 'apps/apps_registry.dart';
import 'screens/hub_screen.dart';
import 'theme/app_theme.dart';

class HubApp extends StatelessWidget {
  const HubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'One Hub',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      home: const HubScreen(),
      routes: {for (final app in AppRegistry.apps) '/${app.id}': app.builder},
    );
  }
}
