import 'package:flutter/material.dart';

import '../apps/apps_registry.dart';
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
  String _query = '';
  AppCategory? _category;

  @override
  void initState() {
    super.initState();
    _loadRecentApps();
  }

  Future<void> _loadRecentApps() async {
    final List<String> stored = await LocalStore.readStringList(
      LocalStore.recentAppsKey,
    );
    if (!mounted) {
      return;
    }

    setState(() {
      _recentIds
        ..clear()
        ..addAll(stored.where(AppRegistry.apps.map((app) => app.id).contains));
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<AppManifest> get _visibleApps {
    final String normalizedQuery = _query.trim().toLowerCase();
    return AppRegistry.apps
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
        ) => app.builder(context),
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
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        slivers: <Widget>[
          SliverToBoxAdapter(child: _buildHeader(context)),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
            sliver: visibleApps.isEmpty
                ? SliverFillRemaining(
                    hasScrollBody: false,
                    child: _EmptySearch(query: _query),
                  )
                : SliverGrid(
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 300,
                          mainAxisExtent: 220,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                        ),
                    delegate: SliverChildBuilderDelegate((
                      BuildContext context,
                      int index,
                    ) {
                      final AppManifest app = visibleApps[index];
                      return _AppTile(
                        key: ValueKey<String>(app.id),
                        app: app,
                        isRecent: _recentIds.contains(app.id),
                        onTap: () => _openApp(app),
                      );
                    }, childCount: visibleApps.length),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
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
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            'One Hub',
                            style: Theme.of(context).textTheme.headlineLarge,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Everything you need, in one fast and focused place.',
                            style: Theme.of(context).textTheme.bodyLarge
                                ?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant,
                                ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
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
                      child: const Icon(
                        Icons.apps_rounded,
                        color: Colors.white,
                      ),
                    ),
                  ],
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

  Widget _buildSearchField(BuildContext context) {
    return Semantics(
      textField: true,
      label: 'Search apps',
      child: Container(
        height: 54,
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(18),
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
            contentPadding: const EdgeInsets.symmetric(vertical: 16),
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

class _AppTile extends StatelessWidget {
  const _AppTile({
    super.key,
    required this.app,
    required this.isRecent,
    required this.onTap,
  });

  final AppManifest app;
  final bool isRecent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: Semantics(
        button: true,
        label: 'Open ${app.name}',
        child: Material(
          color: Colors.transparent,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: app.gradient,
              ),
              boxShadow: <BoxShadow>[
                BoxShadow(
                  color: app.gradient.last.withValues(alpha: 0.28),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(24),
              onTap: onTap,
              child: Padding(
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
                            color: Colors.white.withValues(alpha: 0.20),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Icon(app.icon, color: Colors.white, size: 24),
                        ),
                        if (isRecent)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Text(
                              'Recent',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const Spacer(),
                    Text(
                      app.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      app.tagline,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.78),
                        fontSize: 13,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
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
