import 'package:flutter/material.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';

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
    );
  }

  final int id;
  String name;
  String description;
  List<_RoutineStep> steps;

  int get completedSteps =>
      steps.where((_RoutineStep step) => step.done).length;

  double get progress => steps.isEmpty ? 0 : completedSteps / steps.length;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'description': description,
      'steps': steps.map((_RoutineStep step) => step.toJson()).toList(),
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

  Future<void> _openRoutine(_Routine routine) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (BuildContext context) => _RoutineDetailScreen(
          routine: routine,
          onChanged: () {
            setState(() {});
            _persistRoutines();
          },
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

class _RoutineDetailScreen extends StatelessWidget {
  const _RoutineDetailScreen({required this.routine, required this.onChanged});

  final _Routine routine;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(routine.name)),
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
                    onChanged: (_) {
                      step.done = !step.done;
                      onChanged();
                    },
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
              onPressed: () {
                for (final _RoutineStep step in routine.steps) {
                  step.done = false;
                }
                onChanged();
              },
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
  const _RoutineEditorScreen();

  @override
  State<_RoutineEditorScreen> createState() => _RoutineEditorScreenState();
}

class _RoutineEditorScreenState extends State<_RoutineEditorScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _stepController = TextEditingController();
  final List<String> _steps = <String>[];

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _stepController.dispose();
    super.dispose();
  }

  void _addStep() {
    final String step = _stepController.text.trim();
    if (step.isEmpty) {
      return;
    }
    setState(() {
      _steps.add(step);
      _stepController.clear();
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
        title: const Text('New routine'),
        actions: <Widget>[
          TextButton(onPressed: _save, child: const Text('Save')),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          children: <Widget>[
            TextField(
              controller: _nameController,
              autofocus: true,
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
            const SizedBox(height: 24),
            Text('Steps', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            if (_steps.isEmpty)
              Text(
                'Add the individual steps that make up this routine.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            for (int index = 0; index < _steps.length; index++) ...<Widget>[
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Row(
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        _steps[index],
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Remove step',
                      onPressed: () => setState(() => _steps.removeAt(index)),
                      icon: Icon(
                        Icons.remove_circle_outline_rounded,
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 18),
            Row(
              children: <Widget>[
                Expanded(
                  child: TextField(
                    controller: _stepController,
                    textCapitalization: TextCapitalization.sentences,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _addStep(),
                    decoration: const InputDecoration(hintText: 'Add a step'),
                  ),
                ),
                const SizedBox(width: 10),
                IconButton.filled(
                  tooltip: 'Add step',
                  onPressed: _addStep,
                  icon: const Icon(Icons.add_rounded),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
