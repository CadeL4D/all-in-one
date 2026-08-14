import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';

String _formatClockMinutes(int? minutes) {
  if (minutes == null) {
    return 'No time';
  }
  final int hour = minutes ~/ 60;
  final int minute = minutes % 60;
  final String period = hour < 12 ? 'AM' : 'PM';
  final int displayHour = hour % 12 == 0 ? 12 : hour % 12;
  return '$displayHour:${minute.toString().padLeft(2, '0')} $period';
}

String _localDateKey() {
  final DateTime now = DateTime.now();
  final String month = now.month.toString().padLeft(2, '0');
  final String day = now.day.toString().padLeft(2, '0');
  return '${now.year}-$month-$day';
}

class _RoutineStep {
  _RoutineStep({
    required this.id,
    required this.title,
    this.done = false,
    this.timeMinutes,
  });

  factory _RoutineStep.fromJson(Map<String, dynamic> json) {
    return _RoutineStep(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? 'Untitled step',
      done: json['done'] as bool? ?? false,
      timeMinutes: (json['timeMinutes'] as num?)?.toInt(),
    );
  }

  final int id;
  String title;
  bool done;
  int? timeMinutes;

  bool get hasTime => timeMinutes != null;

  String get timeLabel => _formatClockMinutes(timeMinutes);

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'done': done,
      'timeMinutes': timeMinutes,
    };
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

  int get timedSteps => steps.where((_RoutineStep step) => step.hasTime).length;

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

class _RoutineStepDraft {
  const _RoutineStepDraft({required this.title, this.timeMinutes});

  final String title;
  final int? timeMinutes;

  bool get hasTime => timeMinutes != null;
}

class _RoutineDraft {
  const _RoutineDraft({
    required this.name,
    required this.description,
    required this.steps,
  });

  final String name;
  final String description;
  final List<_RoutineStepDraft> steps;
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
                (_RoutineStepDraft step) => _RoutineStep(
                  id: _nextStepId++,
                  title: step.title,
                  timeMinutes: step.timeMinutes,
                ),
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
              (_RoutineStepDraft step) => _RoutineStep(
                id: _nextStepId++,
                title: step.title,
                timeMinutes: step.timeMinutes,
                done: completedByTitle[step.title] ?? false,
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
                    subtitle: step.hasTime
                        ? Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: <Widget>[
                                Icon(
                                  Icons.schedule_rounded,
                                  size: 15,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  step.timeLabel,
                                  style: Theme.of(context).textTheme.labelMedium
                                      ?.copyWith(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .primary,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ],
                            ),
                          )
                        : null,
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
              routine.timedSteps == 0
                  ? '${routine.completedSteps} of ${routine.steps.length} steps complete'
                  : '${routine.completedSteps} of ${routine.steps.length} steps • ${routine.timedSteps} timed',
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
  late final List<_RoutineStepDraft> _steps;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.routine?.name ?? '');
    _descriptionController = TextEditingController(
      text: widget.routine?.description ?? '',
    );
    _steps =
        widget.routine?.steps
            .map(
              (_RoutineStep step) => _RoutineStepDraft(
                title: step.title,
                timeMinutes: step.timeMinutes,
              ),
            )
            .toList() ??
        <_RoutineStepDraft>[];
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _stepController.dispose();
    super.dispose();
  }

  Future<_RoutineStepDraft?> _promptForStep() async {
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
    if (title == null || title.trim().isEmpty) {
      return null;
    }
    return _RoutineStepDraft(title: title.trim());
  }

  Future<void> _addStepToEnd() async {
    final _RoutineStepDraft? step = await _promptForStep();
    if (step == null || !mounted) {
      return;
    }
    setState(() => _steps.add(step));
  }

  Future<void> _insertStepAt(int index) async {
    final _RoutineStepDraft? step = await _promptForStep();
    if (step == null || !mounted) {
      return;
    }
    setState(() => _steps.insert(index, step));
  }

  void _removeStepAt(int index) {
    setState(() => _steps.removeAt(index));
  }

  void _reorderStep(int oldIndex, int newIndex) {
    setState(() {
      final _RoutineStepDraft step = _steps.removeAt(oldIndex);
      _steps.insert(newIndex, step);
    });
  }

  Future<void> _editStepTime(int index) async {
    final _RoutineStepDraft step = _steps[index];
    final _ClockTimeChoice? choice =
        await showModalBottomSheet<_ClockTimeChoice>(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (BuildContext context) =>
              _ClockTimePickerSheet(initialMinutes: step.timeMinutes),
        );
    if (choice == null || !mounted) {
      return;
    }

    setState(() {
      _steps[index] = _RoutineStepDraft(
        title: step.title,
        timeMinutes: choice.hasTime ? choice.timeMinutes : null,
      );
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
        steps: List<_RoutineStepDraft>.from(_steps),
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
                        final _RoutineStepDraft step = _steps[index];
                        return Padding(
                          key: ValueKey<String>('step-$index-${step.title}'),
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Material(
                            color: Theme.of(context).cardColor,
                            borderRadius: BorderRadius.circular(16),
                            child: ListTile(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              contentPadding: const EdgeInsets.only(
                                left: 8,
                                right: 4,
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
                              title: Text(step.title),
                              subtitle: Padding(
                                padding: const EdgeInsets.only(top: 5),
                                child: _StepTimeButton(
                                  hasTime: step.hasTime,
                                  timeMinutes: step.timeMinutes,
                                  onTap: () => _editStepTime(index),
                                ),
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: <Widget>[
                                  IconButton(
                                    tooltip: 'Set step time',
                                    onPressed: () => _editStepTime(index),
                                    icon: Icon(
                                      step.hasTime
                                          ? Icons.schedule_rounded
                                          : Icons.schedule_outlined,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .primary,
                                    ),
                                  ),
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
                        setState(() {
                          _steps.add(_RoutineStepDraft(title: title));
                        });
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
                      setState(() {
                        _steps.add(_RoutineStepDraft(title: title));
                      });
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

class _StepTimeButton extends StatelessWidget {
  const _StepTimeButton({
    required this.hasTime,
    required this.timeMinutes,
    required this.onTap,
  });

  final bool hasTime;
  final int? timeMinutes;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final String label = hasTime
        ? _formatClockMinutes(timeMinutes)
        : 'Add clock time';
    final Color accent = hasTime
        ? scheme.primary
        : scheme.onSurfaceVariant.withValues(alpha: 0.72);

    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: accent.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: accent.withValues(alpha: 0.34)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              hasTime ? Icons.schedule_rounded : Icons.add_rounded,
              size: 15,
              color: accent,
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall
                  ?.copyWith(color: accent, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }
}

class _ClockTimeChoice {
  const _ClockTimeChoice.noTime() : timeMinutes = null;

  const _ClockTimeChoice.time(int minutes) : timeMinutes = minutes;

  final int? timeMinutes;

  bool get hasTime => timeMinutes != null;
}

class _ClockTimePickerSheet extends StatefulWidget {
  const _ClockTimePickerSheet({this.initialMinutes});

  final int? initialMinutes;

  @override
  State<_ClockTimePickerSheet> createState() => _ClockTimePickerSheetState();
}

class _ClockTimePickerSheetState extends State<_ClockTimePickerSheet> {
  late bool _hasTime;
  late bool _isPm;
  late final TextEditingController _hourController;
  late final TextEditingController _minuteController;

  @override
  void initState() {
    super.initState();
    final int? minutes = widget.initialMinutes;
    _hasTime = minutes != null;
    final int initialMinutes = minutes?.clamp(0, 1439) ?? 420;
    final int hour = initialMinutes ~/ 60;
    _isPm = hour >= 12;
    _hourController = TextEditingController(
      text: (hour % 12 == 0 ? 12 : hour % 12).toString(),
    );
    _minuteController = TextEditingController(
      text: (initialMinutes % 60).toString().padLeft(2, '0'),
    );
  }

  @override
  void dispose() {
    _hourController.dispose();
    _minuteController.dispose();
    super.dispose();
  }

  int? get _selectedMinutes {
    final int? hour = int.tryParse(_hourController.text);
    final int? minute = int.tryParse(_minuteController.text);
    if (hour == null ||
        hour < 1 ||
        hour > 12 ||
        minute == null ||
        minute > 59) {
      return null;
    }
    return (hour % 12 + (_isPm ? 12 : 0)) * 60 + minute;
  }

  void _save() {
    if (!_hasTime) {
      Navigator.of(context).pop(const _ClockTimeChoice.noTime());
      return;
    }
    final int? minutes = _selectedMinutes;
    if (minutes == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Use an hour from 1–12 and a minute from 00–59.'),
        ),
      );
      return;
    }
    Navigator.of(context).pop(_ClockTimeChoice.time(minutes));
  }

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final double inset = MediaQuery.of(context).viewInsets.bottom;
    return AnimatedPadding(
      duration: const Duration(milliseconds: 160),
      curve: Curves.easeOutCubic,
      padding: EdgeInsets.only(bottom: inset),
      child: Container(
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.24),
              blurRadius: 30,
              offset: const Offset(0, -8),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(22, 12, 22, 22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: scheme.outlineVariant,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            'Schedule this step',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'A quick cue, not a reminder. Set it precisely.',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                    Switch.adaptive(
                      value: _hasTime,
                      onChanged: (bool value) =>
                          setState(() => _hasTime = value),
                    ),
                  ],
                ),
                AnimatedSize(
                  duration: const Duration(milliseconds: 240),
                  curve: Curves.easeOutCubic,
                  child: _hasTime
                      ? Padding(
                          padding: const EdgeInsets.only(top: 22),
                          child: _RoutineTimeComposer(
                            hourController: _hourController,
                            minuteController: _minuteController,
                            isPm: _isPm,
                            onPeriodChanged: (bool isPm) =>
                                setState(() => _isPm = isPm),
                          ),
                        )
                      : const SizedBox.shrink(),
                ),
                const SizedBox(height: 22),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: _save,
                        child: Text(_hasTime ? 'Save time' : 'Remove time'),
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

class _RoutineTimeComposer extends StatelessWidget {
  const _RoutineTimeComposer({
    required this.hourController,
    required this.minuteController,
    required this.isPm,
    required this.onPeriodChanged,
  });

  final TextEditingController hourController;
  final TextEditingController minuteController;
  final bool isPm;
  final ValueChanged<bool> onPeriodChanged;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.primaryContainer.withValues(alpha: 0.46),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: scheme.primary.withValues(alpha: 0.20)),
      ),
      child: SizedBox(
        height: 108,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Expanded(
              child: _TimeNumberField(
                controller: hourController,
                label: 'HOUR',
                hintText: '7',
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 22),
              child: Center(
                child: Text(
                  ':',
                  style: TextStyle(
                    color: scheme.primary,
                    fontSize: 38,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            Expanded(
              child: _TimeNumberField(
                controller: minuteController,
                label: 'MINUTE',
                hintText: '13',
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: 54,
              child: Column(
                children: <Widget>[
                  _PeriodButton(
                    label: 'AM',
                    selected: !isPm,
                    onTap: () => onPeriodChanged(false),
                  ),
                  const SizedBox(height: 8),
                  _PeriodButton(
                    label: 'PM',
                    selected: isPm,
                    onTap: () => onPeriodChanged(true),
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

class _TimeNumberField extends StatelessWidget {
  const _TimeNumberField({
    required this.controller,
    required this.label,
    required this.hintText,
  });

  final TextEditingController controller;
  final String label;
  final String hintText;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(
          label,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: scheme.primary,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 7),
        TextField(
          controller: controller,
          onTap: () {
            controller.selection = TextSelection(
              baseOffset: 0,
              extentOffset: controller.text.length,
            );
          },
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          maxLength: 2,
          inputFormatters: <TextInputFormatter>[
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(2),
          ],
          decoration: InputDecoration(
            hintText: hintText,
            counterText: '',
            contentPadding: const EdgeInsets.symmetric(vertical: 7),
            filled: true,
            fillColor: scheme.surface,
          ),
          style: Theme.of(context).textTheme.headlineSmall
              ?.copyWith(color: scheme.onSurface, fontWeight: FontWeight.w800),
        ),
      ],
    );
  }
}

class _PeriodButton extends StatelessWidget {
  const _PeriodButton({
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
    return Expanded(
      child: Material(
        color: selected
            ? scheme.primary
            : scheme.surface.withValues(alpha: 0.62),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Center(
            child: Text(
              label,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: selected ? scheme.onPrimary : scheme.onSurfaceVariant,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
