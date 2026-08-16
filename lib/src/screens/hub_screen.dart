import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show ScrollCacheExtent;
import 'package:flutter/services.dart';

import '../apps/apps_registry.dart';
import '../core/backup_service.dart';
import '../core/local_store.dart';
import '../core/app_manifest.dart';
import '../theme/app_theme.dart';

class HubScreen extends StatefulWidget {
  const HubScreen({super.key});

  @override
  State<HubScreen> createState() => _HubScreenState();
}

class _HubScreenState extends State<HubScreen> {
  final TextEditingController _searchController = TextEditingController();
  final List<String> _recentIds = <String>[];
  final List<String> _orderedIds = <String>[];
  String _query = '';
  AppCategory? _category;

  @override
  void initState() {
    super.initState();
    _loadHubPreferences();
  }

  Future<void> _exportBackup() async {
    final Size screenSize = MediaQuery.sizeOf(context);
    final Rect shareOrigin = Rect.fromLTWH(
      screenSize.width / 2,
      screenSize.height / 2,
      1,
      1,
    );

    try {
      await BackupService.exportAndShare(sharePositionOrigin: shareOrigin);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not export the backup file: $error')),
        );
      }
    }
  }

  Future<void> _importBackup() async {
    final bool restored = await BackupService.importFromPicker();
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          restored
              ? 'Backup imported. Data has been restored.'
              : 'No valid One Hub backup was imported.',
        ),
      ),
    );

    if (restored) {
      await _loadHubPreferences();
    }
  }

  Future<void> _handleBackupAction(String value) async {
    switch (value) {
      case 'export':
        await _exportBackup();
      case 'import':
        await _importBackup();
    }
  }

  Future<void> _loadHubPreferences() async {
    final List<String> storedRecents = await LocalStore.readStringList(
      LocalStore.recentAppsKey,
    );
    final List<String> storedOrder = await LocalStore.readStringList(
      LocalStore.appOrderKey,
    );
    if (!mounted) {
      return;
    }

    final Set<String> validIds = AppRegistry.apps
        .map((AppManifest app) => app.id)
        .toSet();
    final Set<String> seenOrderIds = <String>{};
    final List<String> normalizedOrder = <String>[
      ...storedOrder.where(
        (String id) => validIds.contains(id) && seenOrderIds.add(id),
      ),
      ...validIds.where(seenOrderIds.add),
    ];
    setState(() {
      _recentIds
        ..clear()
        ..addAll(storedRecents.where(validIds.contains).take(3));
      _orderedIds
        ..clear()
        ..addAll(normalizedOrder);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<AppManifest> get _visibleApps {
    final String normalizedQuery = _query.trim().toLowerCase();
    final List<String> order = _orderedIds.isEmpty
        ? AppRegistry.apps.map((AppManifest app) => app.id).toList()
        : _orderedIds;
    return order
        .map(AppRegistry.byId)
        .where((AppManifest app) {
          final bool matchesCategory =
              _category == null || app.category == _category;
          final bool matchesQuery =
              normalizedQuery.isEmpty ||
              app.name.toLowerCase().contains(normalizedQuery) ||
              app.tagline.toLowerCase().contains(normalizedQuery) ||
              app.description.toLowerCase().contains(normalizedQuery);
          return matchesCategory && matchesQuery;
        })
        .toList(growable: false);
  }

  void _reorderApp(String draggedId, String targetId) {
    if (draggedId == targetId) {
      return;
    }
    final List<String> order = _orderedIds.isEmpty
        ? AppRegistry.apps.map((AppManifest app) => app.id).toList()
        : List<String>.of(_orderedIds);
    if (!order.contains(draggedId) || !order.contains(targetId)) {
      return;
    }
    order.remove(draggedId);
    final int adjustedTarget = order.indexOf(targetId);
    order.insert(adjustedTarget, draggedId);
    setState(() {
      _orderedIds
        ..clear()
        ..addAll(order);
    });
    HapticFeedback.selectionClick();
    LocalStore.writeStringList(LocalStore.appOrderKey, order);
  }

  List<AppManifest> get _recentApps {
    return _recentIds
        .map((String id) => AppRegistry.byId(id))
        .toList(growable: false);
  }

  void _openApp(AppManifest app) {
    setState(() {
      _recentIds
        ..remove(app.id)
        ..insert(0, app.id);
      if (_recentIds.length > 3) {
        _recentIds.removeRange(3, _recentIds.length);
      }
    });
    LocalStore.writeStringList(LocalStore.recentAppsKey, _recentIds);

    Navigator.of(context).push<void>(
      PageRouteBuilder<void>(
        settings: RouteSettings(name: '/${app.id}'),
        pageBuilder: (
          BuildContext context,
          Animation<double> animation,
          Animation<double> secondaryAnimation,
        ) => AppIdentity(app: app, child: app.builder(context)),
        transitionsBuilder:
            (
              BuildContext context,
              Animation<double> animation,
              Animation<double> secondaryAnimation,
              Widget child,
            ) {
              final CurvedAnimation curved = CurvedAnimation(
                parent: animation,
                curve: Curves.easeOutCubic,
                reverseCurve: Curves.easeInCubic,
              );
              final Animation<Offset> offset = Tween<Offset>(
                begin: const Offset(0, 0.025),
                end: Offset.zero,
              ).animate(curved);
              return FadeTransition(
                opacity: curved,
                child: SlideTransition(position: offset, child: child),
              );
            },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<AppManifest> visibleApps = _visibleApps;

    return Scaffold(
      body: CustomScrollView(
        scrollCacheExtent: const ScrollCacheExtent.pixels(1200),
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        slivers: <Widget>[
          SliverToBoxAdapter(child: _buildHeader(context)),
          if (_query.isEmpty && _category == null && _recentApps.isNotEmpty)
            SliverToBoxAdapter(
              child: _RecentStrip(apps: _recentApps, onTap: _openApp),
            ),
          SliverToBoxAdapter(child: _buildBrowseControls(context)),
          SliverToBoxAdapter(
            child: _SectionHeading(title: 'Apps', count: visibleApps.length),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
            sliver: visibleApps.isEmpty
                ? SliverFillRemaining(
                    hasScrollBody: false,
                    child: _EmptySearch(query: _query),
                  )
                : SliverGrid(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisExtent: 164,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                    delegate: SliverChildBuilderDelegate((
                      BuildContext context,
                      int index,
                    ) {
                      final AppManifest app = visibleApps[index];
                      return _DraggableAppTile(
                        key: ValueKey<String>(app.id),
                        app: app,
                        onTap: () => _openApp(app),
                        onReorder: _reorderApp,
                      );
                    }, childCount: visibleApps.length),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    if (Theme.of(context).useMaterial3) {
      return _buildModernHeader(context);
    }
    return SafeArea(
      bottom: false,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1120),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(20, 14, 12, 14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(28),
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: <Color>[Color(0xFF171B3A), Color(0xFF313B88)],
                    ),
                    boxShadow: <BoxShadow>[
                      BoxShadow(
                        color: AppColors.brand.withValues(alpha: 0.22),
                        blurRadius: 28,
                        offset: const Offset(0, 14),
                      ),
                    ],
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(
                              'YOUR PERSONAL TOOLKIT',
                              style: Theme.of(context).textTheme.labelSmall
                                  ?.copyWith(
                                    color: Colors.white.withValues(alpha: 0.66),
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.1,
                                  ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'One Hub',
                              style: Theme.of(context).textTheme.headlineLarge
                                  ?.copyWith(color: Colors.white),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'Everything you need, in one fast and focused place.',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodyLarge
                                  ?.copyWith(
                                    color: Colors.white.withValues(alpha: 0.76),
                                  ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Container(
                        width: 54,
                        height: 54,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: <Color>[AppColors.brand, Color(0xFF8E5DFF)],
                          ),
                          boxShadow: <BoxShadow>[
                            BoxShadow(
                              color: AppColors.brand.withValues(alpha: 0.32),
                              blurRadius: 18,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(18),
                          child: Image.asset(
                            'assets/branding/one_hub_icon.png',
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      PopupMenuButton<String>(
                        tooltip: 'Backup options',
                        icon: const Icon(
                          Icons.backup_rounded,
                          color: Colors.white,
                        ),
                        onSelected: _handleBackupAction,
                        itemBuilder: (BuildContext context) =>
                            const <PopupMenuEntry<String>>[
                              PopupMenuItem<String>(
                                value: 'export',
                                child: ListTile(
                                  leading: Icon(Icons.upload_file_rounded),
                                  title: Text('Export backup'),
                                ),
                              ),
                              PopupMenuItem<String>(
                                value: 'import',
                                child: ListTile(
                                  leading: Icon(Icons.download_rounded),
                                  title: Text('Import backup'),
                                ),
                              ),
                            ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 26),
                _buildSearchField(context),
                const SizedBox(height: 16),
                _buildCategoryFilters(context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildModernHeader(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return SafeArea(
      bottom: false,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1120),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(13),
                      child: Image.asset(
                        'assets/branding/one_hub_icon.png',
                        width: 42,
                        height: 42,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(width: 11),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            'One Hub',
                            style: Theme.of(context).textTheme.labelMedium
                                ?.copyWith(
                                  color: scheme.onSurface,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 1.3,
                                ),
                          ),
                          Text(
                            '${AppRegistry.apps.length} tools · one workspace',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: scheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                    PopupMenuButton<String>(
                      tooltip: 'Backup options',
                      icon: const Icon(Icons.more_horiz_rounded),
                      onSelected: _handleBackupAction,
                      itemBuilder: (BuildContext context) =>
                          const <PopupMenuEntry<String>>[
                            PopupMenuItem<String>(
                              value: 'export',
                              child: ListTile(
                                leading: Icon(Icons.upload_file_rounded),
                                title: Text('Export backup'),
                              ),
                            ),
                            PopupMenuItem<String>(
                              value: 'import',
                              child: ListTile(
                                leading: Icon(Icons.download_rounded),
                                title: Text('Import backup'),
                              ),
                            ),
                          ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBrowseControls(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1120),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
          child: Column(
            children: <Widget>[
              _buildSearchField(context),
              const SizedBox(height: 10),
              _buildCategoryFilters(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchField(BuildContext context) {
    return Semantics(
      textField: true,
      label: 'Search apps',
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).colorScheme.outlineVariant
                .withValues(alpha: 0.8),
          ),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: Colors.black.withValues(
                alpha: Theme.of(context).brightness == Brightness.dark
                    ? 0.18
                    : 0.05,
              ),
              blurRadius: 22,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: TextField(
          controller: _searchController,
          onChanged: (String value) => setState(() => _query = value),
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: 'Search apps',
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: _query.isEmpty
                ? null
                : IconButton(
                    tooltip: 'Clear search',
                    onPressed: () {
                      _searchController.clear();
                      setState(() => _query = '');
                    },
                    icon: const Icon(Icons.close_rounded),
                  ),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(vertical: 13),
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryFilters(BuildContext context) {
    return SizedBox(
      height: 38,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: <Widget>[
          _FilterChip(
            label: 'All',
            selected: _category == null,
            onTap: () => setState(() => _category = null),
          ),
          for (final AppCategory category in AppCategory.values) ...<Widget>[
            const SizedBox(width: 10),
            _FilterChip(
              label: category.label,
              selected: _category == category,
              onTap: () => setState(() => _category = category),
            ),
          ],
        ],
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.title, required this.count});

  final String title;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1120),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 14),
          child: Row(
            children: <Widget>[
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$count',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecentStrip extends StatelessWidget {
  const _RecentStrip({required this.apps, required this.onTap});

  final List<AppManifest> apps;
  final ValueChanged<AppManifest> onTap;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1120),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 6),
              child: Text(
                'Recent',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            SizedBox(
              height: 48,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: apps.length,
                separatorBuilder: (BuildContext context, int index) =>
                    const SizedBox(width: 8),
                itemBuilder: (BuildContext context, int index) {
                  final AppManifest app = apps[index];
                  return _RecentAppCard(app: app, onTap: () => onTap(app));
                },
              ),
            ),
            const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }
}

class _RecentAppCard extends StatelessWidget {
  const _RecentAppCard({required this.app, required this.onTap});

  final AppManifest app;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    if (Theme.of(context).useMaterial3) {
      final Color accent = app.gradient.first;
      final ColorScheme scheme = Theme.of(context).colorScheme;
      return Material(
        key: ValueKey<String>('recent-app-${app.id}'),
        color: Colors.transparent,
        child: Ink(
          width: 116,
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                children: <Widget>[
                  Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: Icon(app.icon, color: accent, size: 17),
                  ),
                  const SizedBox(width: 7),
                  Expanded(
                    child: Text(
                      app.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }
    return RepaintBoundary(
      child: Material(
        color: Colors.transparent,
        child: Ink(
          width: 286,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: app.gradient,
            ),
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: app.gradient.last.withValues(alpha: 0.24),
                blurRadius: 18,
                offset: const Offset(0, 9),
              ),
            ],
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(24),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: <Widget>[
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.20),
                      borderRadius: BorderRadius.circular(17),
                    ),
                    child: Icon(app.icon, color: Colors.white, size: 29),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          app.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          app.tagline,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.80),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward_rounded, color: Colors.white),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DraggableAppTile extends StatelessWidget {
  const _DraggableAppTile({
    super.key,
    required this.app,
    required this.onTap,
    required this.onReorder,
  });

  final AppManifest app;
  final VoidCallback onTap;
  final void Function(String draggedId, String targetId) onReorder;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        return DragTarget<String>(
          onWillAcceptWithDetails: (DragTargetDetails<String> details) =>
              details.data != app.id,
          onAcceptWithDetails: (DragTargetDetails<String> details) =>
              onReorder(details.data, app.id),
          builder:
              (
                BuildContext context,
                List<String?> candidateData,
                List<dynamic> rejectedData,
              ) {
                final bool isTarget = candidateData.isNotEmpty;
                return AnimatedScale(
                  duration: const Duration(milliseconds: 140),
                  scale: isTarget ? 0.96 : 1,
                  child: LongPressDraggable<String>(
                    key: ValueKey<String>('draggable-app-${app.id}'),
                    data: app.id,
                    dragAnchorStrategy: childDragAnchorStrategy,
                    maxSimultaneousDrags: 1,
                    onDragStarted: HapticFeedback.mediumImpact,
                    feedback: Material(
                      color: Colors.transparent,
                      child: SizedBox(
                        width: constraints.maxWidth,
                        height: constraints.maxHeight,
                        child: _AppTile(app: app, onTap: () {}),
                      ),
                    ),
                    childWhenDragging: Opacity(
                      opacity: 0.22,
                      child: _AppTile(app: app, onTap: onTap),
                    ),
                    child: _AppTile(app: app, onTap: onTap),
                  ),
                );
              },
        );
      },
    );
  }
}

class _AppTile extends StatelessWidget {
  const _AppTile({required this.app, required this.onTap});

  final AppManifest app;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final Color accent = app.gradient.first;
    if (Theme.of(context).useMaterial3) {
      return _buildModernTile(context, scheme, accent);
    }
    return RepaintBoundary(
      child: Semantics(
        button: true,
        label: 'Open ${app.name}',
        child: Material(
          color: Colors.transparent,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              color: Theme.of(context).cardColor,
              border: Border.all(color: accent.withValues(alpha: 0.24)),
              boxShadow: <BoxShadow>[
                BoxShadow(
                  color: accent.withValues(
                    alpha: Theme.of(context).brightness == Brightness.dark
                        ? 0.12
                        : 0.10,
                  ),
                  blurRadius: 22,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(24),
              onTap: onTap,
              child: Stack(
                children: <Widget>[
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 86,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(23),
                        ),
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: <Color>[
                            accent.withValues(alpha: 0.22),
                            app.gradient.last.withValues(alpha: 0.05),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 17,
                    right: 17,
                    child: _CardMotif(app: app, accent: accent),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: <Widget>[
                            Container(
                              width: 46,
                              height: 46,
                              decoration: BoxDecoration(
                                color: accent,
                                borderRadius: BorderRadius.circular(15),
                                boxShadow: <BoxShadow>[
                                  BoxShadow(
                                    color: accent.withValues(alpha: 0.28),
                                    blurRadius: 12,
                                    offset: const Offset(0, 6),
                                  ),
                                ],
                              ),
                              child: Icon(
                                app.icon,
                                color: Colors.white,
                                size: 24,
                              ),
                            ),
                            Icon(
                              Icons.drag_indicator_rounded,
                              color: scheme.onSurfaceVariant.withValues(
                                alpha: 0.55,
                              ),
                              size: 20,
                            ),
                          ],
                        ),
                        const Spacer(),
                        Text(
                          app.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(
                                color: scheme.onSurface,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          app.tagline,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(
                                color: scheme.onSurfaceVariant,
                                height: 1.25,
                              ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: <Widget>[
                            const Spacer(),
                            Icon(
                              Icons.arrow_forward_rounded,
                              color: accent,
                              size: 19,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildModernTile(
    BuildContext context,
    ColorScheme scheme,
    Color accent,
  ) {
    return RepaintBoundary(
      child: Semantics(
        button: true,
        label: 'Open ${app.name}',
        child: Material(
          color: Colors.transparent,
          child: Ink(
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: scheme.outlineVariant),
              boxShadow: <BoxShadow>[
                BoxShadow(
                  color: Colors.black.withValues(
                    alpha: Theme.of(context).brightness == Brightness.dark
                        ? 0.18
                        : 0.055,
                  ),
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(24),
              onTap: onTap,
              child: Stack(
                children: <Widget>[
                  Positioned(
                    left: 0,
                    top: 20,
                    bottom: 20,
                    child: Container(
                      width: 4,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: app.gradient,
                        ),
                        borderRadius: const BorderRadius.horizontal(
                          right: Radius.circular(999),
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 14, 14),
                    child: Row(
                      children: <Widget>[
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Row(
                                children: <Widget>[
                                  Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      color: accent.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(11),
                                    ),
                                    child: Icon(
                                      app.icon,
                                      color: accent,
                                      size: 20,
                                    ),
                                  ),
                                  const Spacer(),
                                  Icon(
                                    Icons.drag_indicator_rounded,
                                    color: scheme.onSurfaceVariant.withValues(
                                      alpha: 0.55,
                                    ),
                                    size: 20,
                                  ),
                                ],
                              ),
                              const Spacer(),
                              Text(
                                app.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                app.tagline,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CardMotif extends StatelessWidget {
  const _CardMotif({required this.app, required this.accent});

  final AppManifest app;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    switch (app.id) {
      case 'prompts':
        return _NoteMotif(accent: accent);
      case 'tasks':
        return _ChecklistMotif(accent: accent);
      case 'routines':
        return _RoutineMotif(accent: accent);
      case 'maths':
        return _MathsMotif(accent: accent);
      case 'focus':
        return _FocusMotif(accent: accent);
      case 'noises':
        return _NoiseMotif(accent: accent);
    }
    return const SizedBox.shrink();
  }
}

class _MotifSurface extends StatelessWidget {
  const _MotifSurface({required this.child, required this.accent});

  final Widget child;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 92,
      height: 54,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accent.withValues(alpha: 0.18)),
      ),
      child: child,
    );
  }
}

class _NoteMotif extends StatelessWidget {
  const _NoteMotif({required this.accent});
  final Color accent;

  @override
  Widget build(BuildContext context) => _MotifSurface(
    accent: accent,
    child: Column(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: <Widget>[
        for (final double width in <double>[1, .76, .90])
          Align(
            alignment: Alignment.centerLeft,
            child: FractionallySizedBox(
              widthFactor: width,
              child: Container(height: 4, color: accent.withValues(alpha: .72)),
            ),
          ),
      ],
    ),
  );
}

class _ChecklistMotif extends StatelessWidget {
  const _ChecklistMotif({required this.accent});
  final Color accent;

  @override
  Widget build(BuildContext context) => _MotifSurface(
    accent: accent,
    child: Column(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: <Widget>[
        for (int index = 0; index < 3; index++)
          Row(
            children: <Widget>[
              Icon(Icons.check_circle_rounded, color: accent, size: 11),
              const SizedBox(width: 5),
              Expanded(
                child: Container(
                  height: 3,
                  color: accent.withValues(alpha: .55),
                ),
              ),
            ],
          ),
      ],
    ),
  );
}

class _RoutineMotif extends StatelessWidget {
  const _RoutineMotif({required this.accent});
  final Color accent;

  @override
  Widget build(BuildContext context) => _MotifSurface(
    accent: accent,
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: <Widget>[
        for (int index = 0; index < 3; index++)
          Container(
            width: 15,
            height: 15,
            decoration: BoxDecoration(
              color: index == 2 ? accent : accent.withValues(alpha: .24),
              shape: BoxShape.circle,
              border: Border.all(color: accent.withValues(alpha: .58)),
            ),
          ),
      ],
    ),
  );
}

class _MathsMotif extends StatelessWidget {
  const _MathsMotif({required this.accent});
  final Color accent;

  @override
  Widget build(BuildContext context) => _MotifSurface(
    accent: accent,
    child: GridView.count(
      crossAxisCount: 3,
      crossAxisSpacing: 4,
      mainAxisSpacing: 4,
      physics: const NeverScrollableScrollPhysics(),
      children: <Widget>[
        for (int index = 0; index < 9; index++)
          DecoratedBox(
            decoration: BoxDecoration(
              color: index == 4 ? accent : accent.withValues(alpha: .24),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
      ],
    ),
  );
}

class _FocusMotif extends StatelessWidget {
  const _FocusMotif({required this.accent});
  final Color accent;

  @override
  Widget build(BuildContext context) => _MotifSurface(
    accent: accent,
    child: Center(
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: accent, width: 5),
        ),
        child: Center(
          child: Container(
            width: 5,
            height: 5,
            decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
          ),
        ),
      ),
    ),
  );
}

class _NoiseMotif extends StatelessWidget {
  const _NoiseMotif({required this.accent});
  final Color accent;

  @override
  Widget build(BuildContext context) => _MotifSurface(
    accent: accent,
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: <Widget>[
        for (final double height in <double>[10, 24, 16, 30, 20, 12])
          Container(
            width: 6,
            height: height,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: .75),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
      ],
    ),
  );
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Material(
      color: selected ? scheme.onSurface : Colors.transparent,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected ? scheme.onSurface : scheme.outlineVariant,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? scheme.surface : scheme.onSurfaceVariant,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptySearch extends StatelessWidget {
  const _EmptySearch({required this.query});

  final String query;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              Icons.search_off_rounded,
              size: 52,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'No apps found',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 6),
            Text(
              'Nothing matches "$query". Try another search.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}
