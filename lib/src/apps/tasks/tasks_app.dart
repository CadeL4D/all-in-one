import 'package:flutter/material.dart';

import '../../screens/app_scaffold.dart';

class _Todo {
  _Todo({required this.id, required this.title});

  final int id;
  String title;
  bool completed = false;
}

class TasksApp extends StatefulWidget {
  const TasksApp({super.key});

  @override
  State<TasksApp> createState() => _TasksAppState();
}

class _TasksAppState extends State<TasksApp> {
  final List<_Todo> _todos = <_Todo>[
    _Todo(id: 1, title: 'Set up your first project'),
    _Todo(id: 2, title: 'Review today’s priorities'),
    _Todo(id: 3, title: 'Plan tomorrow'),
  ];
  int _nextId = 4;

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
  }

  void _toggleTodo(_Todo todo) {
    setState(() => todo.completed = !todo.completed);
  }

  void _deleteTodo(_Todo todo) {
    setState(() => _todos.remove(todo));
  }

  @override
  Widget build(BuildContext context) {
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
      body: _todos.isEmpty
          ? _EmptyTasks(onAdd: _addTodo)
          : Column(
              children: <Widget>[
                _TaskProgress(
                  completed: _completedCount,
                  total: _todos.length,
                  progress: progress,
                ),
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(20, 6, 20, 96),
                    itemCount: _todos.length,
                    separatorBuilder: (BuildContext context, int index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (BuildContext context, int index) {
                      final _Todo todo = _todos[index];
                      return _TaskTile(
                        todo: todo,
                        onToggle: () => _toggleTodo(todo),
                        onDelete: () => _deleteTodo(todo),
                      );
                    },
                  ),
                ),
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

class _TaskTile extends StatelessWidget {
  const _TaskTile({
    required this.todo,
    required this.onToggle,
    required this.onDelete,
  });

  final _Todo todo;
  final VoidCallback onToggle;
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
                IconButton(
                  tooltip: 'Delete task',
                  onPressed: onDelete,
                  icon: Icon(
                    Icons.more_horiz_rounded,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ),
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
  const _AddTaskDialog();

  @override
  State<_AddTaskDialog> createState() => _AddTaskDialogState();
}

class _AddTaskDialogState extends State<_AddTaskDialog> {
  final TextEditingController _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add task'),
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
          child: const Text('Add'),
        ),
      ],
    );
  }
}
