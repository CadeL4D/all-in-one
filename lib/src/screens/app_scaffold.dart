import 'package:flutter/material.dart';

import '../core/app_manifest.dart';

class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.title,
    required this.icon,
    required this.body,
    this.actions = const <Widget>[],
    this.floatingActionButton,
  });

  final String title;
  final IconData icon;
  final Widget body;
  final List<Widget> actions;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final AppIdentity? identity = AppIdentity.maybeOf(context);
    final List<Color> accent =
        identity?.app.gradient ??
        const <Color>[Color(0xFF5B8DEF), Color(0xFF8E5DFF)];
    final String tagline = identity?.app.tagline ?? '';
    final Color primary = accent.first;
    final Color onPrimary =
        ThemeData.estimateBrightnessForColor(primary) == Brightness.dark
        ? Colors.white
        : const Color(0xFF171827);
    final ThemeData baseTheme = Theme.of(context);
    final ColorScheme appScheme = baseTheme.colorScheme.copyWith(
      primary: primary,
      onPrimary: onPrimary,
      primaryContainer: primary.withValues(alpha: 0.14),
      onPrimaryContainer: baseTheme.colorScheme.onSurface,
      secondary: accent.last,
    );

    return Theme(
      data: baseTheme.copyWith(colorScheme: appScheme),
      child: Scaffold(
        appBar: AppBar(
          toolbarHeight: 76,
          titleSpacing: 12,
          title: Row(
            children: <Widget>[
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: primary.withValues(alpha: 0.13),
                  borderRadius: BorderRadius.circular(13),
                  border: Border.all(color: primary.withValues(alpha: 0.20)),
                ),
                child: Icon(icon, size: 21, color: primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(title),
                    if (tagline.isNotEmpty)
                      Text(
                        tagline,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: baseTheme.textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          actions: actions,
        ),
        body: Stack(
          children: <Widget>[
            Positioned(
              top: -130,
              right: -110,
              child: IgnorePointer(
                child: Container(
                  width: 260,
                  height: 260,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: <Color>[
                        primary.withValues(alpha: 0.11),
                        primary.withValues(alpha: 0),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Positioned.fill(child: SafeArea(top: false, child: body)),
          ],
        ),
        floatingActionButton: floatingActionButton,
      ),
    );
  }
}
