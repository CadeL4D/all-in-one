import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';

class _Prompt {
  _Prompt({
    required this.id,
    required this.title,
    required this.note,
    required this.updatedAt,
  });

  factory _Prompt.fromJson(Map<String, dynamic> json) {
    return _Prompt(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? 'Untitled prompt',
      note: json['note'] as String? ?? '',
      updatedAt:
          DateTime.tryParse(json['updatedAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  final int id;
  String title;
  String note;
  DateTime updatedAt;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'note': note,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class _PromptDraft {
  const _PromptDraft({required this.title, required this.note});

  final String title;
  final String note;
}

class PromptsApp extends StatefulWidget {
  const PromptsApp({super.key});

  @override
  State<PromptsApp> createState() => _PromptsAppState();
}

class _PromptsAppState extends State<PromptsApp> {
  final List<_Prompt> _prompts = <_Prompt>[];
  int _nextId = 2;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _loadPrompts();
  }

  Future<void> _loadPrompts() async {
    final List<Map<String, dynamic>>? stored = await LocalStore.readJsonList(
      LocalStore.promptsKey,
    );
    if (!mounted) {
      return;
    }

    setState(() {
      if (stored == null || stored.isEmpty) {
        _prompts.add(
          _Prompt(
            id: 1,
            title: 'Welcome',
            note:
                'Use Prompts to keep titles and reusable notes together. '
                'Tap the copy icon to copy only this note text without the title.',
            updatedAt: DateTime.now(),
          ),
        );
      } else {
        _prompts.addAll(stored.map(_Prompt.fromJson));
        for (final _Prompt prompt in _prompts) {
          if (prompt.id >= _nextId) {
            _nextId = prompt.id + 1;
          }
        }
      }
      _loaded = true;
    });
    await _persistPrompts();
  }

  Future<void> _persistPrompts() async {
    await LocalStore.writeJsonList(
      LocalStore.promptsKey,
      _prompts.map((_Prompt prompt) => prompt.toJson()).toList(),
    );
  }

  Future<void> _copyNote(_Prompt prompt) async {
    await Clipboard.setData(ClipboardData(text: prompt.note));
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Note copied without title.')));
  }

  Future<void> _openEditor({_Prompt? prompt}) async {
    _Prompt? workingPrompt = prompt;
    Future<void> autosave(_PromptDraft draft) async {
      final bool isEmpty = draft.title.trim().isEmpty && draft.note.isEmpty;
      if (workingPrompt == null && isEmpty) {
        return;
      }
      final _PromptDraft normalized = _PromptDraft(
        title: draft.title.trim().isEmpty ? 'Untitled prompt' : draft.title,
        note: draft.note,
      );

      if (!mounted) {
        return;
      }
      setState(() {
        if (workingPrompt == null) {
          workingPrompt = _Prompt(
            id: _nextId++,
            title: normalized.title,
            note: normalized.note,
            updatedAt: DateTime.now(),
          );
          _prompts.insert(0, workingPrompt!);
        } else {
          workingPrompt!
            ..title = normalized.title
            ..note = normalized.note
            ..updatedAt = DateTime.now();
          _prompts.remove(workingPrompt);
          _prompts.insert(0, workingPrompt!);
        }
      });
      await _persistPrompts();
    }

    final _PromptDraft? draft = await Navigator.of(context).push<_PromptDraft>(
      MaterialPageRoute<_PromptDraft>(
        builder: (BuildContext context) =>
            _PromptEditorScreen(prompt: prompt, onAutosave: autosave),
      ),
    );

    if (draft == null) {
      return;
    }
    await autosave(draft);
  }

  Future<void> _deletePrompt(_Prompt prompt) async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: const Text('Delete prompt?'),
        content: Text('Delete "${prompt.title}"?'),
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

    setState(() => _prompts.remove(prompt));
    await _persistPrompts();
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Prompts',
      icon: Icons.lightbulb_rounded,
      floatingActionButton: FloatingActionButton(
        tooltip: 'New prompt',
        onPressed: () => _openEditor(),
        child: const Icon(Icons.add_rounded),
      ),
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : _prompts.isEmpty
          ? _EmptyPrompts(onAdd: () => _openEditor())
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
              itemCount: _prompts.length,
              separatorBuilder: (BuildContext context, int index) =>
                  const SizedBox(height: 12),
              itemBuilder: (BuildContext context, int index) {
                final _Prompt prompt = _prompts[index];
                return _PromptCard(
                  prompt: prompt,
                  onTap: () => _openEditor(prompt: prompt),
                  onCopy: () => _copyNote(prompt),
                  onDelete: () => _deletePrompt(prompt),
                );
              },
            ),
    );
  }
}

class _PromptCard extends StatelessWidget {
  const _PromptCard({
    required this.prompt,
    required this.onTap,
    required this.onCopy,
    required this.onDelete,
  });

  final _Prompt prompt;
  final VoidCallback onTap;
  final VoidCallback onCopy;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
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
                  Expanded(
                    child: Text(
                      prompt.title,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  IconButton(
                    tooltip: 'Copy note without title',
                    onPressed: onCopy,
                    icon: const Icon(Icons.copy_rounded),
                  ),
                  IconButton(
                    tooltip: 'Delete prompt',
                    onPressed: onDelete,
                    icon: Icon(
                      Icons.delete_outline_rounded,
                      color: scheme.error,
                    ),
                  ),
                ],
              ),
              if (prompt.note.isNotEmpty) ...<Widget>[
                const SizedBox(height: 6),
                Text(
                  prompt.note,
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyPrompts extends StatelessWidget {
  const _EmptyPrompts({required this.onAdd});

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
              Icons.lightbulb_outline_rounded,
              size: 56,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'No prompts yet',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Create a prompt with a title and note, then copy the note text '
              'whenever you need it.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add_rounded),
              label: const Text('New prompt'),
            ),
          ],
        ),
      ),
    );
  }
}

class _PromptEditorScreen extends StatefulWidget {
  const _PromptEditorScreen({this.prompt, required this.onAutosave});

  final _Prompt? prompt;
  final Future<void> Function(_PromptDraft draft) onAutosave;

  @override
  State<_PromptEditorScreen> createState() => _PromptEditorScreenState();
}

class _PromptEditorScreenState extends State<_PromptEditorScreen> {
  late final TextEditingController _titleController;
  late final TextEditingController _noteController;
  Timer? _autosaveTimer;
  Future<void> _autosaveChain = Future<void>.value();
  bool _allowPop = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.prompt?.title ?? '');
    _noteController = TextEditingController(text: widget.prompt?.note ?? '');
    _titleController.addListener(_scheduleAutosave);
    _noteController.addListener(_scheduleAutosave);
  }

  @override
  void dispose() {
    _autosaveTimer?.cancel();
    _titleController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  _PromptDraft _draft() {
    final String title = _titleController.text.trim();
    final String note = _noteController.text.trim();
    return _PromptDraft(title: title, note: note);
  }

  void _scheduleAutosave() {
    _autosaveTimer?.cancel();
    _autosaveTimer = Timer(const Duration(milliseconds: 550), () {
      final _PromptDraft draft = _draft();
      _autosaveChain = _autosaveChain.then((_) => widget.onAutosave(draft));
    });
  }

  Future<void> _save() async {
    await _flushAutosave();
    if (mounted) {
      setState(() => _allowPop = true);
      Navigator.of(context).pop(_draft());
    }
  }

  Future<void> _flushAutosave() async {
    _autosaveTimer?.cancel();
    await _autosaveChain;
    await widget.onAutosave(_draft());
  }

  @override
  Widget build(BuildContext context) {
    return PopScope<_PromptDraft>(
      canPop: _allowPop,
      onPopInvokedWithResult: (bool didPop, _PromptDraft? result) async {
        if (!didPop) {
          await _flushAutosave();
          if (mounted) {
            setState(() => _allowPop = true);
            Navigator.of(this.context).pop();
          }
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.prompt == null ? 'New prompt' : 'Edit prompt'),
          actions: <Widget>[
            TextButton(onPressed: _save, child: const Text('Save')),
            const SizedBox(width: 8),
          ],
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Column(
              children: <Widget>[
                TextField(
                  controller: _titleController,
                  autofocus: widget.prompt == null,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    hintText: 'Title',
                    border: InputBorder.none,
                  ),
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: TextField(
                    controller: _noteController,
                    expands: true,
                    minLines: null,
                    maxLines: null,
                    textAlignVertical: TextAlignVertical.top,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: const InputDecoration(
                      hintText: 'Write the note…',
                      border: InputBorder.none,
                    ),
                    style: Theme.of(context).textTheme.bodyLarge,
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
