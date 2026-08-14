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

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 82,
        titleSpacing: 16,
        flexibleSpace: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: <Color>[
                accent.first.withValues(alpha: 0.11),
                Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0),
              ],
            ),
          ),
        ),
        title: Row(
          children: <Widget>[
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: accent,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: <BoxShadow>[
                  BoxShadow(
                    color: accent.last.withValues(alpha: 0.32),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Icon(icon, size: 23, color: Colors.white),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(title),
                  if (tagline.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 2),
                    Text(
                      'ONE HUB  •  ${tagline.toUpperCase()}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                        fontSize: 10,
                        letterSpacing: 0.75,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        actions: actions,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(2),
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: accent,
              ),
            ),
          ),
        ),
      ),
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.center,
            colors: <Color>[
              accent.first.withValues(alpha: 0.07),
              Theme.of(context).scaffoldBackgroundColor,
            ],
          ),
        ),
        child: SafeArea(top: false, child: body),
      ),
      floatingActionButton: floatingActionButton,
    );
  }
}
