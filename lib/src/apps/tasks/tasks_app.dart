import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';

enum _TaskPage { today, all }

enum _TaskAction { edit, moveToToday, moveToAll, makeTopLevel, delete }

enum _DropMode { before, after, nest, topLevel }

class _Todo {
  _Todo({
    required this.id,
    required this.title,
    this.completed = false,
    this.isToday = true,
    this.todayOrder = 0,
    this.parentId,
  });

  factory _Todo.fromJson(Map<String, dynamic> json) {
    return _Todo(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? 'Untitled task',
      completed: json['completed'] as bool? ?? false,
      isToday: json['isToday'] as bool? ?? true,
      todayOrder:
          (json['todayOrder'] as num?)?.toInt() ?? (json['id'] as num).toInt(),
      parentId: (json['parentId'] as num?)?.toInt(),
    );
  }

  final int id;
  String title;
  bool completed;
  bool isToday;
  int todayOrder;
  int? parentId;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'completed': completed,
      'isToday': isToday,
      'todayOrder': todayOrder,
      'parentId': parentId,
    };
  }
}

class TasksApp extends StatefulWidget {
  const TasksApp({super.key});

  @override
  State<TasksApp> createState() => _TasksAppState();
}

class _TasksAppState extends State<TasksApp> {
  final List<_Todo> _todos = <_Todo>[];
  _TaskPage _page = _TaskPage.today;
  int _nextId = 4;
  bool _loaded = false;
  int? _draggingId;
  int? _hoveredId;
  _DropMode? _hoveredMode;
  double _pointerDownDx = 0;
  double _dragStartDx = 0;
  double _dragDeltaX = 0;
  Offset? _lastDragPosition;

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    final List<Map<String, dynamic>>? stored = await LocalStore.readJsonList(
      LocalStore.tasksKey,
    );
    if (!mounted) {
      return;
    }

    setState(() {
      if (stored == null) {
        _todos.addAll(<_Todo>[
          _Todo(id: 1, title: 'Set up your first project', todayOrder: 1),
          _Todo(id: 2, title: 'Review today’s priorities', todayOrder: 2),
          _Todo(id: 3, title: 'Plan tomorrow', todayOrder: 3),
        ]);
      } else {
        _todos.addAll(stored.map(_Todo.fromJson));
        final Set<int> ids = _todos.map((_Todo todo) => todo.id).toSet();
        for (final _Todo todo in _todos) {
          if (todo.parentId == todo.id || !ids.contains(todo.parentId)) {
            todo.parentId = null;
          }
          if (todo.id >= _nextId) {
            _nextId = todo.id + 1;
          }
        }
      }
      _normalizeTodayOrder();
      _loaded = true;
    });
    await _persistTasks();
  }

  Future<void> _persistTasks() async {
    await LocalStore.writeJsonList(
      LocalStore.tasksKey,
      _todos.map((_Todo todo) => todo.toJson()).toList(),
    );
  }

  List<_Todo> _orderedTasks(_TaskPage page) {
    final List<_Todo> base = page == _TaskPage.today
        ? (_todos.where((_Todo todo) => todo.isToday).toList()
            ..sort((_Todo a, _Todo b) {
              final int byOrder = a.todayOrder.compareTo(b.todayOrder);
              return byOrder == 0 ? a.id.compareTo(b.id) : byOrder;
            }))
        : List<_Todo>.of(_todos);
    final Set<int> visibleIds = base.map((_Todo todo) => todo.id).toSet();
    final Set<int> visited = <int>{};
    final List<_Todo> result = <_Todo>[];

    void visit(_Todo todo) {
      if (!visited.add(todo.id)) {
        return;
      }
      result.add(todo);
      for (final _Todo child in base) {
        if (child.parentId == todo.id) {
          visit(child);
        }
      }
    }

    for (final _Todo todo in base) {
      if (todo.parentId == null || !visibleIds.contains(todo.parentId)) {
        visit(todo);
      }
    }
    for (final _Todo todo in base) {
      visit(todo);
    }
    return <_Todo>[
      ...result.where((_Todo todo) => !todo.completed),
      ...result.where((_Todo todo) => todo.completed),
    ];
  }

  void _normalizeTodayOrder([List<_Todo>? ordered]) {
    final List<_Todo> today = ordered ?? _orderedTasks(_TaskPage.today);
    for (int index = 0; index < today.length; index++) {
      today[index].todayOrder = index + 1;
    }
  }

  Set<int> _descendantIds(int id) {
    final Set<int> descendants = <int>{id};
    bool changed;
    do {
      changed = false;
      for (final _Todo todo in _todos) {
        if (todo.parentId != null &&
            descendants.contains(todo.parentId) &&
            descendants.add(todo.id)) {
          changed = true;
        }
      }
    } while (changed);
    return descendants;
  }

  int _taskDepth(_Todo todo, List<_Todo> visible) {
    final Map<int, _Todo> byId = <int, _Todo>{
      for (final _Todo item in visible) item.id: item,
    };
    final Set<int> seen = <int>{todo.id};
    int depth = 0;
    int? parentId = todo.parentId;
    while (parentId != null &&
        byId.containsKey(parentId) &&
        seen.add(parentId)) {
      final _Todo parent = byId[parentId]!;
      if (parent.completed != todo.completed) {
        break;
      }
      depth++;
      parentId = parent.parentId;
    }
    return depth.clamp(0, 3);
  }

  int get _todayCount => _todos.where((_Todo todo) => todo.isToday).length;

  int _completedCount(List<_Todo> tasks) =>
      tasks.where((_Todo todo) => todo.completed).length;

  Future<void> _addTodo() async {
    final String? title = await showDialog<String>(
      context: context,
      builder: (BuildContext context) => const _AddTaskDialog(),
    );
    if (title == null || title.trim().isEmpty) {
      return;
    }

    setState(() {
      final _Todo todo = _Todo(
        id: _nextId++,
        title: title.trim(),
        isToday: _page == _TaskPage.today,
        todayOrder: _page == _TaskPage.today ? 1 : 0,
      );
      _todos.insert(0, todo);
      if (todo.isToday) {
        final List<_Todo> today = _orderedTasks(_TaskPage.today)
          ..remove(todo)
          ..insert(0, todo);
        _normalizeTodayOrder(today);
      }
    });
    await _persistTasks();
  }

  Future<void> _toggleTodo(_Todo todo) async {
    setState(() {
      todo.completed = !todo.completed;
      _normalizeTodayOrder();
    });
    await _persistTasks();
  }

  Future<void> _editTodo(_Todo todo) async {
    final String? title = await showDialog<String>(
      context: context,
      builder: (BuildContext context) =>
          _AddTaskDialog(initialTitle: todo.title),
    );
    if (title == null || title.trim().isEmpty) {
      return;
    }
    setState(() => todo.title = title.trim());
    await _persistTasks();
  }

  Future<void> _deleteTodo(_Todo todo) async {
    setState(() {
      for (final _Todo child in _todos.where(
        (_Todo item) => item.parentId == todo.id,
      )) {
        child.parentId = todo.parentId;
      }
      _todos.remove(todo);
      _normalizeTodayOrder();
    });
    await _persistTasks();
  }

  Future<void> _clearCompleted() async {
    final List<_Todo> visible = _orderedTasks(_page);
    final int count = _completedCount(visible);
    if (count == 0) {
      return;
    }
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: const Text('Clear completed?'),
        content: Text('Delete $count completed task(s) from this view?'),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
    if (confirmed != true) {
      return;
    }

    final Set<int> deletedIds = visible
        .where((_Todo todo) => todo.completed)
        .map((_Todo todo) => todo.id)
        .toSet();
    setState(() {
      for (final _Todo todo in _todos) {
        if (!deletedIds.contains(todo.id) &&
            deletedIds.contains(todo.parentId)) {
          todo.parentId = null;
        }
      }
      _todos.removeWhere((_Todo todo) => deletedIds.contains(todo.id));
      _normalizeTodayOrder();
    });
    await _persistTasks();
  }

  bool _canDropOn(int sourceId, int targetId) {
    final _Todo source = _todos.firstWhere((_Todo todo) => todo.id == sourceId);
    final _Todo target = _todos.firstWhere((_Todo todo) => todo.id == targetId);
    return sourceId != targetId &&
        source.completed == target.completed &&
        !_descendantIds(sourceId).contains(targetId);
  }

  _DropMode _dropModeFor(double targetMidpointY) {
    if (_dragDeltaX >= 48) {
      return _DropMode.nest;
    }
    if (_dragDeltaX <= -48) {
      return _DropMode.topLevel;
    }
    final double y = _lastDragPosition?.dy ?? targetMidpointY;
    return y < targetMidpointY ? _DropMode.before : _DropMode.after;
  }

  void _updateDropPreview(int targetId, double targetMidpointY) {
    final _DropMode mode = _dropModeFor(targetMidpointY);
    if (_hoveredId == targetId && _hoveredMode == mode) {
      return;
    }
    setState(() {
      _hoveredId = targetId;
      _hoveredMode = mode;
    });
  }

  Future<void> _acceptTaskDrop(
    int sourceId,
    int targetId,
    double targetMidpointY,
  ) async {
    if (!_canDropOn(sourceId, targetId)) {
      _finishDragging();
      return;
    }
    final _DropMode mode = _dropModeFor(targetMidpointY);
    final _Todo source = _todos.firstWhere((_Todo todo) => todo.id == sourceId);
    final _Todo target = _todos.firstWhere((_Todo todo) => todo.id == targetId);
    final List<_Todo> ordered = _orderedTasks(_page);
    final Set<int> sourceIds = _descendantIds(sourceId);
    final List<_Todo> sourceBlock = ordered
        .where((_Todo todo) => sourceIds.contains(todo.id))
        .toList();
    final List<_Todo> remaining = ordered
        .where((_Todo todo) => !sourceIds.contains(todo.id))
        .toList();

    setState(() {
      if (mode == _DropMode.nest) {
        source.parentId = target.id;
      } else if (mode == _DropMode.topLevel) {
        source.parentId = null;
      } else {
        source.parentId = target.parentId;
      }

      int insertionIndex = remaining.indexOf(target);
      if (mode == _DropMode.after || mode == _DropMode.nest) {
        final Set<int> targetIds = _descendantIds(target.id);
        insertionIndex =
            remaining.lastIndexWhere(
              (_Todo todo) => targetIds.contains(todo.id),
            ) +
            1;
      }
      insertionIndex = insertionIndex.clamp(0, remaining.length);
      remaining.insertAll(insertionIndex, sourceBlock);

      if (_page == _TaskPage.all) {
        _todos
          ..clear()
          ..addAll(remaining);
      } else {
        _normalizeTodayOrder(remaining);
      }
      _finishDragging(notify: false);
    });
    HapticFeedback.selectionClick();
    await _persistTasks();
  }

  Future<void> _moveTaskToPage(int taskId, _TaskPage destination) async {
    final _Todo source = _todos.firstWhere((_Todo todo) => todo.id == taskId);
    final Set<int> movingIds = _descendantIds(taskId);
    setState(() {
      final bool makeToday = destination == _TaskPage.today;
      if (makeToday &&
          source.parentId != null &&
          !_todos
              .firstWhere((_Todo todo) => todo.id == source.parentId)
              .isToday) {
        source.parentId = null;
      }
      int nextOrder = _todayCount + 1;
      for (final _Todo todo in _orderedTasks(_TaskPage.all)) {
        if (movingIds.contains(todo.id)) {
          todo.isToday = makeToday;
          if (makeToday) {
            todo.todayOrder = nextOrder++;
          }
        }
      }
      _normalizeTodayOrder();
      _page = destination;
      _finishDragging(notify: false);
    });
    HapticFeedback.selectionClick();
    await _persistTasks();
  }

  Future<void> _makeTopLevel(_Todo todo) async {
    setState(() => todo.parentId = null);
    await _persistTasks();
  }

  void _startDragging(int id) {
    HapticFeedback.mediumImpact();
    setState(() {
      _draggingId = id;
      _dragStartDx = _pointerDownDx;
      _dragDeltaX = 0;
    });
  }

  void _updateDragging(DragUpdateDetails details) {
    final double delta = details.globalPosition.dx - _dragStartDx;
    _lastDragPosition = details.globalPosition;
    if ((delta - _dragDeltaX).abs() < 4) {
      return;
    }
    setState(() => _dragDeltaX = delta);
  }

  void _finishDragging({bool notify = true}) {
    void reset() {
      _draggingId = null;
      _hoveredId = null;
      _hoveredMode = null;
      _dragDeltaX = 0;
      _lastDragPosition = null;
    }

    if (notify && mounted) {
      setState(reset);
    } else {
      reset();
    }
  }

  Future<void> _handleAction(_Todo todo, _TaskAction action) async {
    switch (action) {
      case _TaskAction.edit:
        await _editTodo(todo);
      case _TaskAction.moveToToday:
        await _moveTaskToPage(todo.id, _TaskPage.today);
      case _TaskAction.moveToAll:
        await _moveTaskToPage(todo.id, _TaskPage.all);
      case _TaskAction.makeTopLevel:
        await _makeTopLevel(todo);
      case _TaskAction.delete:
        await _deleteTodo(todo);
    }
  }

  @override
  Widget build(BuildContext context) {
    final List<_Todo> visible = _orderedTasks(_page);
    final int completed = _completedCount(visible);
    final double progress = visible.isEmpty ? 0 : completed / visible.length;

    return AppScaffold(
      title: 'Tasks',
      icon: Icons.check_circle_rounded,
      floatingActionButton: FloatingActionButton.extended(
        tooltip: 'Add task',
        onPressed: _addTodo,
        icon: const Icon(Icons.add_rounded),
        label: Text(_page == _TaskPage.today ? 'Add to Today' : 'Add task'),
      ),
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 104),
              children: <Widget>[
                _TaskPageSwitcher(
                  selected: _page,
                  todayCount: _todayCount,
                  allCount: _todos.length,
                  draggingId: _draggingId,
                  isTaskToday: (int id) =>
                      _todos.firstWhere((_Todo todo) => todo.id == id).isToday,
                  onSelected: (_TaskPage page) => setState(() => _page = page),
                  onTaskDropped: _moveTaskToPage,
                ),
                const SizedBox(height: 16),
                _TaskProgress(
                  completed: completed,
                  total: visible.length,
                  progress: progress,
                  page: _page,
                  onClearCompleted: completed == 0 ? null : _clearCompleted,
                ),
                const SizedBox(height: 14),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 160),
                  child: _draggingId == null
                      ? _PageHint(page: _page)
                      : _DragHint(horizontalOffset: _dragDeltaX),
                ),
                const SizedBox(height: 14),
                if (visible.isEmpty)
                  _EmptyTasks(page: _page, onAdd: _addTodo)
                else
                  for (
                    int index = 0;
                    index < visible.length;
                    index++
                  ) ...<Widget>[
                    _TaskDropZone(
                      key: ValueKey<String>('task-${visible[index].id}'),
                      todo: visible[index],
                      rank: _page == _TaskPage.today ? index + 1 : null,
                      depth: _taskDepth(visible[index], visible),
                      page: _page,
                      dragging: _draggingId == visible[index].id,
                      highlighted: _hoveredId == visible[index].id,
                      highlightedMode: _hoveredId == visible[index].id
                          ? _hoveredMode
                          : null,
                      canAccept: (int sourceId) =>
                          _canDropOn(sourceId, visible[index].id),
                      onPointerDown: (double dx) => _pointerDownDx = dx,
                      onDragStarted: () => _startDragging(visible[index].id),
                      onDragUpdate: _updateDragging,
                      onDragFinished: _finishDragging,
                      onHover: (double midpointY) =>
                          _updateDropPreview(visible[index].id, midpointY),
                      onLeave: () {
                        if (_hoveredId == visible[index].id) {
                          setState(() {
                            _hoveredId = null;
                            _hoveredMode = null;
                          });
                        }
                      },
                      onAccept: (int sourceId, double midpointY) =>
                          _acceptTaskDrop(
                            sourceId,
                            visible[index].id,
                            midpointY,
                          ),
                      onToggle: () => _toggleTodo(visible[index]),
                      onAction: (_TaskAction action) =>
                          _handleAction(visible[index], action),
                    ),
                    const SizedBox(height: 10),
                  ],
              ],
            ),
    );
  }
}

class _TaskPageSwitcher extends StatelessWidget {
  const _TaskPageSwitcher({
    required this.selected,
    required this.todayCount,
    required this.allCount,
    required this.draggingId,
    required this.isTaskToday,
    required this.onSelected,
    required this.onTaskDropped,
  });

  final _TaskPage selected;
  final int todayCount;
  final int allCount;
  final int? draggingId;
  final bool Function(int id) isTaskToday;
  final ValueChanged<_TaskPage> onSelected;
  final void Function(int taskId, _TaskPage destination) onTaskDropped;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: _TaskPageTab(
              page: _TaskPage.today,
              label: 'Today',
              count: todayCount,
              selected: selected == _TaskPage.today,
              canAccept: draggingId != null && !isTaskToday(draggingId!),
              onTap: () => onSelected(_TaskPage.today),
              onAccept: (int id) => onTaskDropped(id, _TaskPage.today),
            ),
          ),
          const SizedBox(width: 5),
          Expanded(
            child: _TaskPageTab(
              page: _TaskPage.all,
              label: 'All',
              count: allCount,
              selected: selected == _TaskPage.all,
              canAccept: draggingId != null && isTaskToday(draggingId!),
              onTap: () => onSelected(_TaskPage.all),
              onAccept: (int id) => onTaskDropped(id, _TaskPage.all),
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskPageTab extends StatelessWidget {
  const _TaskPageTab({
    required this.page,
    required this.label,
    required this.count,
    required this.selected,
    required this.canAccept,
    required this.onTap,
    required this.onAccept,
  });

  final _TaskPage page;
  final String label;
  final int count;
  final bool selected;
  final bool canAccept;
  final VoidCallback onTap;
  final ValueChanged<int> onAccept;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return DragTarget<int>(
      onWillAcceptWithDetails: (DragTargetDetails<int> details) => canAccept,
      onAcceptWithDetails: (DragTargetDetails<int> details) =>
          onAccept(details.data),
      builder:
          (
            BuildContext context,
            List<int?> candidateData,
            List<dynamic> rejectedData,
          ) {
            final bool hovering = candidateData.isNotEmpty && canAccept;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 140),
              decoration: BoxDecoration(
                color: hovering
                    ? scheme.tertiaryContainer
                    : selected
                    ? scheme.surface
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(14),
                border: hovering
                    ? Border.all(color: scheme.tertiary, width: 1.5)
                    : null,
                boxShadow: selected && !hovering
                    ? <BoxShadow>[
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  key: ValueKey<String>('task-page-${page.name}'),
                  borderRadius: BorderRadius.circular(14),
                  onTap: onTap,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        Icon(
                          page == _TaskPage.today
                              ? Icons.today_rounded
                              : Icons.inventory_2_outlined,
                          size: 19,
                          color: hovering
                              ? scheme.onTertiaryContainer
                              : selected
                              ? scheme.primary
                              : scheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 7),
                        Flexible(
                          child: Text(
                            hovering ? 'Move' : label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.labelLarge
                                ?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  color: hovering
                                      ? scheme.onTertiaryContainer
                                      : selected
                                      ? scheme.onSurface
                                      : scheme.onSurfaceVariant,
                                ),
                          ),
                        ),
                        const SizedBox(width: 7),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: selected
                                ? scheme.primary.withValues(alpha: 0.12)
                                : scheme.surfaceContainerHigh,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text('$count'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
    );
  }
}

class _TaskProgress extends StatelessWidget {
  const _TaskProgress({
    required this.completed,
    required this.total,
    required this.progress,
    required this.page,
    required this.onClearCompleted,
  });

  final int completed;
  final int total;
  final double progress;
  final _TaskPage page;
  final VoidCallback? onClearCompleted;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 15, 10, 15),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: <Widget>[
          SizedBox(
            width: 46,
            height: 46,
            child: Stack(
              alignment: Alignment.center,
              children: <Widget>[
                CircularProgressIndicator(
                  value: progress,
                  strokeWidth: 5,
                  backgroundColor: scheme.surfaceContainerHighest,
                ),
                Text(
                  '${(progress * 100).round()}',
                  style: Theme.of(context).textTheme.labelSmall
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  page == _TaskPage.today ? 'Today’s progress' : 'All tasks',
                  style: Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 3),
                Text(
                  '$completed of $total completed',
                  style: Theme.of(context).textTheme.bodySmall
                      ?.copyWith(color: scheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Clear completed',
            onPressed: onClearCompleted,
            icon: const Icon(Icons.delete_sweep_outlined),
          ),
        ],
      ),
    );
  }
}

class _PageHint extends StatelessWidget {
  const _PageHint({required this.page});

  final _TaskPage page;

  @override
  Widget build(BuildContext context) {
    return Text(
      key: ValueKey<_TaskPage>(page),
      page == _TaskPage.today
          ? 'Priorities are numbered low to high. Hold and drag to reorder.'
          : 'Every task lives here. Drag a task onto Today to schedule it.',
      style: Theme.of(context).textTheme.bodySmall
          ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
    );
  }
}

class _DragHint extends StatelessWidget {
  const _DragHint({required this.horizontalOffset});

  final double horizontalOffset;

  @override
  Widget build(BuildContext context) {
    final String message = horizontalOffset >= 48
        ? 'Release on a task to make this a subtask'
        : horizontalOffset <= -48
        ? 'Release to move this task to the top level'
        : 'Move up or down to reorder · move right to nest';
    return Container(
      key: const ValueKey<String>('drag-hint'),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        message,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: Theme.of(context).colorScheme.onPrimaryContainer,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _TaskDropZone extends StatelessWidget {
  const _TaskDropZone({
    super.key,
    required this.todo,
    required this.rank,
    required this.depth,
    required this.page,
    required this.dragging,
    required this.highlighted,
    required this.highlightedMode,
    required this.canAccept,
    required this.onPointerDown,
    required this.onDragStarted,
    required this.onDragUpdate,
    required this.onDragFinished,
    required this.onHover,
    required this.onLeave,
    required this.onAccept,
    required this.onToggle,
    required this.onAction,
  });

  final _Todo todo;
  final int? rank;
  final int depth;
  final _TaskPage page;
  final bool dragging;
  final bool highlighted;
  final _DropMode? highlightedMode;
  final bool Function(int sourceId) canAccept;
  final ValueChanged<double> onPointerDown;
  final VoidCallback onDragStarted;
  final ValueChanged<DragUpdateDetails> onDragUpdate;
  final VoidCallback onDragFinished;
  final ValueChanged<double> onHover;
  final VoidCallback onLeave;
  final void Function(int sourceId, double midpointY) onAccept;
  final VoidCallback onToggle;
  final ValueChanged<_TaskAction> onAction;

  @override
  Widget build(BuildContext context) {
    final double indent = depth * 22.0;
    return Padding(
      padding: EdgeInsets.only(left: indent),
      child: Builder(
        builder: (BuildContext targetContext) {
          double midpointY() {
            final RenderBox box =
                targetContext.findRenderObject()! as RenderBox;
            return box.localToGlobal(Offset(0, box.size.height / 2)).dy;
          }

          return DragTarget<int>(
            onWillAcceptWithDetails: (DragTargetDetails<int> details) =>
                canAccept(details.data),
            onMove: (_) => onHover(midpointY()),
            onLeave: (_) => onLeave(),
            onAcceptWithDetails: (DragTargetDetails<int> details) =>
                onAccept(details.data, midpointY()),
            builder:
                (
                  BuildContext context,
                  List<int?> candidateData,
                  List<dynamic> rejectedData,
                ) {
                  final Widget tile = _TaskTileSurface(
                    todo: todo,
                    rank: rank,
                    depth: depth,
                    page: page,
                    highlighted: highlighted && candidateData.isNotEmpty,
                    highlightedMode: highlightedMode,
                    onToggle: onToggle,
                    onAction: onAction,
                  );
                  return Listener(
                    onPointerDown: (PointerDownEvent event) =>
                        onPointerDown(event.position.dx),
                    child: LongPressDraggable<int>(
                      data: todo.id,
                      delay: const Duration(milliseconds: 260),
                      dragAnchorStrategy: childDragAnchorStrategy,
                      rootOverlay: true,
                      onDragStarted: onDragStarted,
                      onDragUpdate: onDragUpdate,
                      onDragCompleted: onDragFinished,
                      onDraggableCanceled: (_, _) => onDragFinished(),
                      feedback: Material(
                        color: Colors.transparent,
                        child: SizedBox(
                          width: MediaQuery.sizeOf(context).width - 40 - indent,
                          child: _TaskDragFeedback(todo: todo, rank: rank),
                        ),
                      ),
                      childWhenDragging: Opacity(opacity: 0.22, child: tile),
                      child: AnimatedScale(
                        scale: dragging ? 0.98 : 1,
                        duration: const Duration(milliseconds: 120),
                        child: tile,
                      ),
                    ),
                  );
                },
          );
        },
      ),
    );
  }
}

class _TaskTileSurface extends StatelessWidget {
  const _TaskTileSurface({
    required this.todo,
    required this.rank,
    required this.depth,
    required this.page,
    required this.highlighted,
    required this.highlightedMode,
    required this.onToggle,
    required this.onAction,
  });

  final _Todo todo;
  final int? rank;
  final int depth;
  final _TaskPage page;
  final bool highlighted;
  final _DropMode? highlightedMode;
  final VoidCallback onToggle;
  final ValueChanged<_TaskAction> onAction;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final bool nesting = highlightedMode == _DropMode.nest;
    return Semantics(
      label: depth == 0 ? 'Task ${todo.title}' : 'Subtask ${todo.title}',
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        decoration: BoxDecoration(
          color: highlighted
              ? nesting
                    ? scheme.tertiaryContainer
                    : scheme.primaryContainer
              : Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: highlighted
                ? nesting
                      ? scheme.tertiary
                      : scheme.primary
                : scheme.outlineVariant.withValues(alpha: 0.55),
            width: highlighted ? 1.7 : 1,
          ),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 6, 8),
              child: Row(
                children: <Widget>[
                  if (rank != null) ...<Widget>[
                    Container(
                      key: ValueKey<String>('today-rank-${todo.id}'),
                      width: 32,
                      height: 32,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: scheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '$rank',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: scheme.primary,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ] else if (depth > 0) ...<Widget>[
                    Icon(
                      Icons.subdirectory_arrow_right_rounded,
                      color: scheme.tertiary,
                    ),
                    const SizedBox(width: 5),
                  ],
                  IconButton(
                    tooltip: todo.completed
                        ? 'Mark incomplete'
                        : 'Mark complete',
                    onPressed: onToggle,
                    icon: Icon(
                      todo.completed
                          ? Icons.check_circle_rounded
                          : Icons.circle_outlined,
                      color: todo.completed
                          ? scheme.primary
                          : scheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          todo.title,
                          style: Theme.of(context).textTheme.bodyLarge
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                                decoration: todo.completed
                                    ? TextDecoration.lineThrough
                                    : null,
                                color: todo.completed
                                    ? scheme.onSurfaceVariant
                                    : scheme.onSurface,
                              ),
                        ),
                        if (page == _TaskPage.all && todo.isToday)
                          Text(
                            'Today',
                            style: Theme.of(context).textTheme.labelSmall
                                ?.copyWith(
                                  color: scheme.primary,
                                  fontWeight: FontWeight.w800,
                                ),
                          )
                        else if (depth > 0)
                          Text(
                            'Subtask',
                            style: Theme.of(context).textTheme.labelSmall
                                ?.copyWith(color: scheme.onSurfaceVariant),
                          ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.drag_indicator_rounded,
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.7),
                  ),
                  PopupMenuButton<_TaskAction>(
                    tooltip: 'Task actions',
                    onSelected: onAction,
                    icon: Icon(
                      Icons.more_horiz_rounded,
                      color: scheme.onSurfaceVariant,
                    ),
                    itemBuilder: (BuildContext context) =>
                        <PopupMenuEntry<_TaskAction>>[
                          const PopupMenuItem<_TaskAction>(
                            value: _TaskAction.edit,
                            child: ListTile(
                              leading: Icon(Icons.edit_outlined),
                              title: Text('Edit name'),
                            ),
                          ),
                          PopupMenuItem<_TaskAction>(
                            value: todo.isToday
                                ? _TaskAction.moveToAll
                                : _TaskAction.moveToToday,
                            child: ListTile(
                              leading: Icon(
                                todo.isToday
                                    ? Icons.inventory_2_outlined
                                    : Icons.today_rounded,
                              ),
                              title: Text(
                                todo.isToday
                                    ? 'Move to All only'
                                    : 'Move to Today',
                              ),
                            ),
                          ),
                          if (todo.parentId != null)
                            const PopupMenuItem<_TaskAction>(
                              value: _TaskAction.makeTopLevel,
                              child: ListTile(
                                leading: Icon(Icons.format_indent_decrease),
                                title: Text('Make top-level task'),
                              ),
                            ),
                          const PopupMenuItem<_TaskAction>(
                            value: _TaskAction.delete,
                            child: ListTile(
                              leading: Icon(Icons.delete_outline_rounded),
                              title: Text('Delete'),
                            ),
                          ),
                        ],
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

class _TaskDragFeedback extends StatelessWidget {
  const _TaskDragFeedback({required this.todo, required this.rank});

  final _Todo todo;
  final int? rank;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      key: ValueKey<String>('task-drag-feedback-${todo.id}'),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.primary, width: 1.5),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: <Widget>[
          if (rank != null) ...<Widget>[
            CircleAvatar(
              radius: 15,
              backgroundColor: scheme.primaryContainer,
              child: Text('$rank'),
            ),
            const SizedBox(width: 10),
          ],
          Icon(Icons.drag_indicator_rounded, color: scheme.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              todo.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyTasks extends StatelessWidget {
  const _EmptyTasks({required this.page, required this.onAdd});

  final _TaskPage page;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        children: <Widget>[
          Icon(
            page == _TaskPage.today
                ? Icons.wb_sunny_outlined
                : Icons.task_alt_rounded,
            size: 50,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 14),
          Text(
            page == _TaskPage.today ? 'Today is clear' : 'No tasks yet',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 7),
          Text(
            page == _TaskPage.today
                ? 'Add a priority here or drag one onto Today from All.'
                : 'Add a task to start building your list.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: onAdd,
            icon: const Icon(Icons.add_rounded),
            label: const Text('Add task'),
          ),
        ],
      ),
    );
  }
}

class _AddTaskDialog extends StatefulWidget {
  const _AddTaskDialog({this.initialTitle = ''});

  final String initialTitle;

  @override
  State<_AddTaskDialog> createState() => _AddTaskDialogState();
}

class _AddTaskDialogState extends State<_AddTaskDialog> {
  final TextEditingController _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    _controller.text = widget.initialTitle;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool isEditing = widget.initialTitle.isNotEmpty;
    return AlertDialog(
      title: Text(isEditing ? 'Edit task' : 'Add task'),
      content: TextField(
        controller: _controller,
        autofocus: true,
        textCapitalization: TextCapitalization.sentences,
        onSubmitted: (_) => Navigator.of(context).pop(_controller.text),
        decoration: const InputDecoration(hintText: 'What needs to be done?'),
      ),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_controller.text),
          child: Text(isEditing ? 'Save' : 'Add'),
        ),
      ],
    );
  }
}
