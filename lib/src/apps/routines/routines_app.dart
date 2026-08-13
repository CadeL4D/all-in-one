import 'package:flutter/material.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';

String _localDateKey() {
  final DateTime now = DateTime.now();
  final String month = now.month.toString().padLeft(2, '0');
  final String day = now.day.toString().padLeft(2, '0');
  return '${now.year}-$month-$day';
}

class _RoutineStep {
  _RoutineStep({required this.id, required this.title, this.done = false});

  factory _RoutineStep.fromJson(Map<String, dynamic> json) {
    return _RoutineStep(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? 'Untitled step',
      done: json['done'] as bool? ?? false,
    );
  }

  final int id;
  String title;
  bool done;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{'id': id, 'title': title, 'done': done};
  }
}

class _Routine {
  _Routine({
    required this.id,
    required this.name,
    required this.description,
    required this.steps,
    required this.lastResetDate,
  });

  factory _Routine.fromJson(Map<String, dynamic> json) {
    final List<Map<String, dynamic>> rawSteps =
        (json['steps'] as List<dynamic>?)
            ?.whereType<Map<String, dynamic>>()
            .toList() ??
        <Map<String, dynamic>>[];

    return _Routine(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String? ?? 'Untitled routine',
      description: json['description'] as String? ?? '',
      steps: rawSteps.map(_RoutineStep.fromJson).toList(),
      lastResetDate: json['lastResetDate'] as String? ?? _localDateKey(),
    );
  }

  final int id;
  String name;
  String description;
  List<_RoutineStep> steps;
  String lastResetDate;

  void resetForNewDay() {
    final String today = _localDateKey();
    if (lastResetDate == today) {
      return;
    }
    for (final _RoutineStep step in steps) {
      step.done = false;
    }
    lastResetDate = today;
  }

  int get completedSteps =>
      steps.where((_RoutineStep step) => step.done).length;

  double get progress => steps.isEmpty ? 0 : completedSteps / steps.length;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'description': description,
      'steps': steps.map((_RoutineStep step) => step.toJson()).toList(),
      'lastResetDate': lastResetDate,
    };
  }
}

class _RoutineDraft {
  const _RoutineDraft({
    required this.name,
    required this.description,
    required this.steps,
  });

  final String name;
  final String description;
  final List<String> steps;
}

class RoutinesApp extends StatefulWidget {
  const RoutinesApp({super.key});

  @override
  State<RoutinesApp> createState() => _RoutinesAppState();
}

class _RoutinesAppState extends State<RoutinesApp> {
  final List<_Routine> _routines = <_Routine>[];
  int _nextRoutineId = 2;
  int _nextStepId = 100;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _loadRoutines();
  }

  Future<void> _loadRoutines() async {
    final List<Map<String, dynamic>>? stored = await LocalStore.readJsonList(
      LocalStore.routinesKey,
    );
    if (!mounted) {
      return;
    }

    setState(() {
      if (stored == null) {
        _routines.add(
          _Routine(
            id: 1,
            name: 'Morning reset',
            description:
                'A simple start-of-day routine to build consistency before the '
                'rest of the day begins.',
            lastResetDate: _localDateKey(),
            steps: <_RoutineStep>[
              _RoutineStep(id: 1, title: 'Drink a glass of water'),
              _RoutineStep(id: 2, title: 'Make the bed'),
              _RoutineStep(id: 3, title: 'Review today’s top priorities'),
            ],
          ),
        );
      } else {
        _routines.addAll(stored.map(_Routine.fromJson));
        for (final _Routine routine in _routines) {
          if (routine.id >= _nextRoutineId) {
            _nextRoutineId = routine.id + 1;
          }
          for (final _RoutineStep step in routine.steps) {
            if (step.id >= _nextStepId) {
              _nextStepId = step.id + 1;
            }
          }
        }
      }
      for (final _Routine routine in _routines) {
        routine.resetForNewDay();
      }
      _loaded = true;
    });
    await _persistRoutines();
  }

  Future<void> _persistRoutines() async {
    await LocalStore.writeJsonList(
      LocalStore.routinesKey,
      _routines.map((_Routine routine) => routine.toJson()).toList(),
    );
  }

  Future<void> _addRoutine() async {
    final _RoutineDraft? draft = await Navigator.of(context)
        .push<_RoutineDraft>(
          MaterialPageRoute<_RoutineDraft>(
            builder: (BuildContext context) => const _RoutineEditorScreen(),
          ),
        );

    if (draft == null) {
      return;
    }

    setState(() {
      _routines.insert(
        0,
        _Routine(
          id: _nextRoutineId++,
          name: draft.name,
          description: draft.description,
          lastResetDate: _localDateKey(),
          steps: draft.steps
              .map(
                (String title) => _RoutineStep(id: _nextStepId++, title: title),
              )
              .toList(),
        ),
      );
    });
    await _persistRoutines();
  }

  Future<void> _editRoutine(_Routine routine) async {
    final _RoutineDraft? draft = await Navigator.of(context)
        .push<_RoutineDraft>(
          MaterialPageRoute<_RoutineDraft>(
            builder: (BuildContext context) =>
                _RoutineEditorScreen(routine: routine),
          ),
        );

    if (draft == null || !mounted) {
      return;
    }

    setState(() {
      final Map<String, bool> completedByTitle = <String, bool>{
        for (final _RoutineStep step in routine.steps) step.title: step.done,
      };
      routine
        ..name = draft.name
        ..description = draft.description
        ..steps = draft.steps
            .map(
              (String title) => _RoutineStep(
                id: _nextStepId++,
                title: title,
                done: completedByTitle[title] ?? false,
              ),
            )
            .toList();
    });
    await _persistRoutines();
  }

  Future<void> _openRoutine(_Routine routine) async {
    routine.resetForNewDay();
    await _persistRoutines();
    if (!mounted) {
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (BuildContext context) => _RoutineDetailScreen(
          routine: routine,
          onChanged: () {
            setState(() {});
            _persistRoutines();
          },
          onEdit: () => _editRoutine(routine),
        ),
      ),
    );
  }

  Future<void> _deleteRoutine(_Routine routine) async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: const Text('Delete routine?'),
        content: Text('Delete "${routine.name}" and all of its steps?'),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) {
      return;
    }

    setState(() => _routines.remove(routine));
    await _persistRoutines();
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Routines',
      icon: Icons.event_repeat_rounded,
      floatingActionButton: FloatingActionButton(
        tooltip: 'New routine',
        onPressed: _addRoutine,
        child: const Icon(Icons.add_rounded),
      ),
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : _routines.isEmpty
          ? _EmptyRoutines(onAdd: _addRoutine)
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
              itemCount: _routines.length,
              separatorBuilder: (BuildContext context, int index) =>
                  const SizedBox(height: 12),
              itemBuilder: (BuildContext context, int index) {
                final _Routine routine = _routines[index];
                return _RoutineCard(
                  routine: routine,
                  onTap: () => _openRoutine(routine),
                  onDelete: () => _deleteRoutine(routine),
                );
              },
            ),
    );
  }
}

class _RoutineCard extends StatelessWidget {
  const _RoutineCard({
    required this.routine,
    required this.onTap,
    required this.onDelete,
  });

  final _Routine routine;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final int totalSteps = routine.steps.length;
    final int completedSteps = routine.completedSteps;

    return Material(
      color: Theme.of(context).cardColor,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: scheme.primaryContainer,
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Icon(
                      Icons.event_repeat_rounded,
                      color: scheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          routine.name,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        if (routine.description.isNotEmpty) ...<Widget>[
                          const SizedBox(height: 4),
                          Text(
                            routine.description,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Delete routine',
                    onPressed: onDelete,
                    icon: Icon(
                      Icons.delete_outline_rounded,
                      color: scheme.error,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: <Widget>[
                  Text(
                    totalSteps == 0
                        ? 'No steps yet'
                        : '$completedSteps of $totalSteps complete',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const Spacer(),
                  if (totalSteps > 0)
                    Text(
                      '${(routine.progress * 100).round()}%',
                      style: Theme.of(context).textTheme.titleMedium
                          ?.copyWith(color: scheme.primary),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: routine.progress,
                  minHeight: 8,
                  backgroundColor: scheme.surfaceContainerHighest,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyRoutines extends StatelessWidget {
  const _EmptyRoutines({required this.onAdd});

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
              Icons.event_repeat_rounded,
              size: 56,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'No routines yet',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Create a repeatable routine and check off each step.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add_rounded),
              label: const Text('New routine'),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoutineDetailScreen extends StatefulWidget {
  const _RoutineDetailScreen({
    required this.routine,
    required this.onChanged,
    this.onEdit,
  });

  final _Routine routine;
  final VoidCallback onChanged;
  final Future<void> Function()? onEdit;

  @override
  State<_RoutineDetailScreen> createState() => _RoutineDetailScreenState();
}

class _RoutineDetailScreenState extends State<_RoutineDetailScreen> {
  _Routine get routine => widget.routine;

  void _toggleStep(_RoutineStep step) {
    setState(() {
      routine.resetForNewDay();
      step.done = !step.done;
      widget.onChanged();
    });
  }

  void _resetRoutine() {
    setState(() {
      for (final _RoutineStep step in routine.steps) {
        step.done = false;
      }
      routine.lastResetDate = _localDateKey();
      widget.onChanged();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(routine.name),
        actions: <Widget>[
          if (widget.onEdit != null)
            IconButton(
              tooltip: 'Edit routine',
              onPressed: () async {
                await widget.onEdit?.call();
                if (mounted) {
                  setState(() {});
                }
              },
              icon: const Icon(Icons.edit_rounded),
            ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: <Widget>[
            if (routine.description.isNotEmpty) ...<Widget>[
              Text(
                routine.description,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 18),
            ],
            _RoutineProgress(routine: routine),
            const SizedBox(height: 16),
            Text('Steps', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 10),
            if (routine.steps.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 20),
                child: Text(
                  'No steps yet. Add steps when you create or edit a routine.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              )
            else
              for (final _RoutineStep step in routine.steps)
                Card(
                  elevation: 0,
                  color: Theme.of(context).cardColor,
                  margin: const EdgeInsets.only(bottom: 10),
                  child: CheckboxListTile(
                    value: step.done,
                    onChanged: (_) => _toggleStep(step),
                    controlAffinity: ListTileControlAffinity.leading,
                    title: Text(
                      step.title,
                      style: TextStyle(
                        decoration: step.done
                            ? TextDecoration.lineThrough
                            : TextDecoration.none,
                        color: step.done
                            ? Theme.of(context).colorScheme.onSurfaceVariant
                            : Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                  ),
                ),
            const SizedBox(height: 18),
            OutlinedButton.icon(
              onPressed: _resetRoutine,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Reset routine'),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoutineProgress extends StatelessWidget {
  const _RoutineProgress({required this.routine});

  final _Routine routine;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: <Widget>[
          Icon(Icons.track_changes_rounded, color: scheme.onPrimaryContainer),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              '${routine.completedSteps} of ${routine.steps.length} steps complete',
              style: TextStyle(
                color: scheme.onPrimaryContainer,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Text(
            '${(routine.progress * 100).round()}%',
            style: TextStyle(
              color: scheme.onPrimaryContainer,
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _RoutineEditorScreen extends StatefulWidget {
  const _RoutineEditorScreen({this.routine});

  final _Routine? routine;

  @override
  State<_RoutineEditorScreen> createState() => _RoutineEditorScreenState();
}

class _RoutineEditorScreenState extends State<_RoutineEditorScreen> {
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  final TextEditingController _stepController = TextEditingController();
  late final List<String> _steps;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.routine?.name ?? '');
    _descriptionController = TextEditingController(
      text: widget.routine?.description ?? '',
    );
    _steps = List<String>.from(
      widget.routine?.steps.map((_RoutineStep step) => step.title) ??
          const <String>[],
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _stepController.dispose();
    super.dispose();
  }

  Future<String?> _promptForStep() async {
    final TextEditingController controller = TextEditingController();
    final String? title = await showDialog<String>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: const Text('Add step'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.sentences,
          onSubmitted: (String value) => Navigator.of(context).pop(value),
          decoration: const InputDecoration(hintText: 'Step title'),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            child: const Text('Add'),
          ),
        ],
      ),
    );
    controller.dispose();
    return title == null || title.trim().isEmpty ? null : title.trim();
  }

  Future<void> _addStepToEnd() async {
    final String? title = await _promptForStep();
    if (title == null || !mounted) {
      return;
    }
    setState(() => _steps.add(title));
  }

  Future<void> _insertStepAt(int index) async {
    final String? title = await _promptForStep();
    if (title == null || !mounted) {
      return;
    }
    setState(() => _steps.insert(index, title));
  }

  void _removeStepAt(int index) {
    setState(() => _steps.removeAt(index));
  }

  void _reorderStep(int oldIndex, int newIndex) {
    setState(() {
      final String step = _steps.removeAt(oldIndex);
      _steps.insert(newIndex, step);
    });
  }

  void _save() {
    final String name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a routine name first.')),
      );
      return;
    }

    Navigator.of(context).pop(
      _RoutineDraft(
        name: name,
        description: _descriptionController.text.trim(),
        steps: List<String>.from(_steps),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.routine == null ? 'New routine' : 'Edit routine'),
        actions: <Widget>[
          TextButton(onPressed: _save, child: const Text('Save')),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  TextField(
                    controller: _nameController,
                    autofocus: widget.routine == null,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: const InputDecoration(
                      labelText: 'Routine name',
                      hintText: 'Morning routine',
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _descriptionController,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: const InputDecoration(
                      labelText: 'Description (optional)',
                      hintText: 'What is this routine for?',
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          'Steps',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ),
                      TextButton.icon(
                        onPressed: _addStepToEnd,
                        icon: const Icon(Icons.add_rounded),
                        label: const Text('Add'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: _steps.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          'Add steps to build the sequence. You can drag them '
                          'into order or insert a step below any existing one.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                    )
                  : ReorderableListView.builder(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                      itemCount: _steps.length,
                      onReorderItem: _reorderStep,
                      itemBuilder: (BuildContext context, int index) {
                        return Padding(
                          key: ValueKey<String>('step-$index-${_steps[index]}'),
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Material(
                            color: Theme.of(context).cardColor,
                            borderRadius: BorderRadius.circular(16),
                            child: ListTile(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              leading: ReorderableDragStartListener(
                                index: index,
                                child: Icon(
                                  Icons.drag_handle_rounded,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant,
                                ),
                              ),
                              title: Text(_steps[index]),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: <Widget>[
                                  IconButton(
                                    tooltip: 'Insert step below',
                                    onPressed: () => _insertStepAt(index + 1),
                                    icon: const Icon(Icons.add_rounded),
                                  ),
                                  IconButton(
                                    tooltip: 'Remove step',
                                    onPressed: () => _removeStepAt(index),
                                    icon: Icon(
                                      Icons.remove_circle_outline_rounded,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .error,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child: TextField(
                      controller: _stepController,
                      textCapitalization: TextCapitalization.sentences,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) async {
                        final String title = _stepController.text.trim();
                        if (title.isEmpty) {
                          return;
                        }
                        setState(() => _steps.add(title));
                        _stepController.clear();
                      },
                      decoration: const InputDecoration(
                        hintText: 'Add a step to the end',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  IconButton.filled(
                    tooltip: 'Add step',
                    onPressed: () {
                      final String title = _stepController.text.trim();
                      if (title.isEmpty) {
                        return;
                      }
                      setState(() => _steps.add(title));
                      _stepController.clear();
                    },
                    icon: const Icon(Icons.add_rounded),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
