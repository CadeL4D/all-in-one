import 'package:flutter/material.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';

class _Todo {
  _Todo({required this.id, required this.title, this.completed = false});

  factory _Todo.fromJson(Map<String, dynamic> json) {
    return _Todo(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? 'Untitled task',
      completed: json['completed'] as bool? ?? false,
    );
  }

  final int id;
  String title;
  bool completed;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{'id': id, 'title': title, 'completed': completed};
  }
}

class TasksApp extends StatefulWidget {
  const TasksApp({super.key});

  @override
  State<TasksApp> createState() => _TasksAppState();
}

class _TasksAppState extends State<TasksApp> {
  final List<_Todo> _todos = <_Todo>[];
  int _nextId = 4;
  bool _loaded = false;

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
          _Todo(id: 1, title: 'Set up your first project'),
          _Todo(id: 2, title: 'Review today’s priorities'),
          _Todo(id: 3, title: 'Plan tomorrow'),
        ]);
      } else {
        _todos.addAll(stored.map(_Todo.fromJson));
        for (final _Todo todo in _todos) {
          if (todo.id >= _nextId) {
            _nextId = todo.id + 1;
          }
        }
      }
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

  int get _completedCount =>
      _todos.where((_Todo todo) => todo.completed).length;

  Future<void> _addTodo() async {
    final String? title = await showDialog<String>(
      context: context,
      builder: (BuildContext context) => const _AddTaskDialog(),
    );

    if (title == null || title.trim().isEmpty) {
      return;
    }

    setState(() {
      _todos.insert(0, _Todo(id: _nextId++, title: title.trim()));
    });
    await _persistTasks();
  }

  Future<void> _toggleTodo(_Todo todo) async {
    setState(() => todo.completed = !todo.completed);
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
    setState(() => _todos.remove(todo));
    await _persistTasks();
  }

  Future<void> _clearCompleted() async {
    if (_completedCount == 0) {
      return;
    }

    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: const Text('Clear completed?'),
        content: Text('Delete $_completedCount completed task(s)?'),
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

    setState(() {
      _todos.removeWhere((_Todo todo) => todo.completed);
    });
    await _persistTasks();
  }

  @override
  Widget build(BuildContext context) {
    final List<_Todo> active = _todos
        .where((_Todo todo) => !todo.completed)
        .toList(growable: false);
    final List<_Todo> completed = _todos
        .where((_Todo todo) => todo.completed)
        .toList(growable: false);
    final double progress = _todos.isEmpty
        ? 0
        : _completedCount / _todos.length;

    return AppScaffold(
      title: 'Tasks',
      icon: Icons.check_circle_rounded,
      floatingActionButton: FloatingActionButton(
        tooltip: 'Add task',
        onPressed: _addTodo,
        child: const Icon(Icons.add_rounded),
      ),
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : _todos.isEmpty
          ? _EmptyTasks(onAdd: _addTodo)
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
              children: <Widget>[
                _TaskProgress(
                  completed: _completedCount,
                  total: _todos.length,
                  progress: progress,
                ),
                const SizedBox(height: 6),
                if (active.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Column(
                      children: <Widget>[
                        Icon(
                          Icons.task_alt_rounded,
                          size: 48,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'No active tasks',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Everything is checked off.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  )
                else
                  for (final _Todo todo in active) ...<Widget>[
                    _TaskTile(
                      todo: todo,
                      onToggle: () => _toggleTodo(todo),
                      onEdit: () => _editTodo(todo),
                      onDelete: () => _deleteTodo(todo),
                    ),
                    const SizedBox(height: 10),
                  ],
                if (completed.isNotEmpty) ...<Widget>[
                  const SizedBox(height: 8),
                  _CompletedTasksSection(
                    tasks: completed,
                    onToggle: _toggleTodo,
                    onEdit: _editTodo,
                    onDelete: _deleteTodo,
                    onClearCompleted: _clearCompleted,
                  ),
                ],
              ],
            ),
    );
  }
}

class _TaskProgress extends StatelessWidget {
  const _TaskProgress({
    required this.completed,
    required this.total,
    required this.progress,
  });

  final int completed;
  final int total;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    '$completed of $total completed',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                Text(
                  '${(progress * 100).round()}%',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: scheme.surfaceContainerHighest,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _TaskAction { edit, delete }

class _TaskTile extends StatelessWidget {
  const _TaskTile({
    required this.todo,
    required this.onToggle,
    required this.onEdit,
    required this.onDelete,
  });

  final _Todo todo;
  final VoidCallback onToggle;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Dismissible(
      key: ValueKey<int>(todo.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDelete(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        decoration: BoxDecoration(
          color: scheme.errorContainer,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Icon(
          Icons.delete_outline_rounded,
          color: scheme.onErrorContainer,
        ),
      ),
      child: Material(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onToggle,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: Row(
              children: <Widget>[
                IconButton(
                  tooltip: todo.completed ? 'Mark incomplete' : 'Mark complete',
                  onPressed: onToggle,
                  icon: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 180),
                    child: Icon(
                      todo.completed
                          ? Icons.check_circle_rounded
                          : Icons.circle_outlined,
                      key: ValueKey<bool>(todo.completed),
                      color: todo.completed
                          ? scheme.primary
                          : scheme.onSurfaceVariant,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    todo.title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      decoration: todo.completed
                          ? TextDecoration.lineThrough
                          : TextDecoration.none,
                      color: todo.completed
                          ? scheme.onSurfaceVariant
                          : scheme.onSurface,
                    ),
                  ),
                ),
                PopupMenuButton<_TaskAction>(
                  tooltip: 'Task actions',
                  onSelected: (_TaskAction action) {
                    if (action == _TaskAction.edit) {
                      onEdit();
                    } else {
                      onDelete();
                    }
                  },
                  icon: Icon(
                    Icons.more_horiz_rounded,
                    color: scheme.onSurfaceVariant,
                  ),
                  itemBuilder: (BuildContext context) =>
                      const <PopupMenuEntry<_TaskAction>>[
                        PopupMenuItem<_TaskAction>(
                          value: _TaskAction.edit,
                          child: ListTile(
                            leading: Icon(Icons.edit_outlined),
                            title: Text('Edit name'),
                          ),
                        ),
                        PopupMenuItem<_TaskAction>(
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
    );
  }
}

class _CompletedTasksSection extends StatefulWidget {
  const _CompletedTasksSection({
    required this.tasks,
    required this.onToggle,
    required this.onEdit,
    required this.onDelete,
    required this.onClearCompleted,
  });

  final List<_Todo> tasks;
  final ValueChanged<_Todo> onToggle;
  final ValueChanged<_Todo> onEdit;
  final ValueChanged<_Todo> onDelete;
  final VoidCallback onClearCompleted;

  @override
  State<_CompletedTasksSection> createState() => _CompletedTasksSectionState();
}

class _CompletedTasksSectionState extends State<_CompletedTasksSection> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        children: <Widget>[
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(18),
              onTap: () => setState(() => _expanded = !_expanded),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                child: Row(
                  children: <Widget>[
                    Icon(
                      _expanded
                          ? Icons.expand_less_rounded
                          : Icons.expand_more_rounded,
                      color: scheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Completed (${widget.tasks.length})',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Clear completed',
                      onPressed: widget.onClearCompleted,
                      icon: Icon(
                        Icons.delete_sweep_outlined,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (_expanded)
            for (final _Todo todo in widget.tasks) ...<Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                child: _TaskTile(
                  todo: todo,
                  onToggle: () => widget.onToggle(todo),
                  onEdit: () => widget.onEdit(todo),
                  onDelete: () => widget.onDelete(todo),
                ),
              ),
            ],
        ],
      ),
    );
  }
}

class _EmptyTasks extends StatelessWidget {
  const _EmptyTasks({required this.onAdd});

  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              Icons.task_alt_rounded,
              size: 56,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'All caught up',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Add a task to start planning your day.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Add task'),
            ),
          ],
        ),
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
