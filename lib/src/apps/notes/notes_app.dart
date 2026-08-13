import 'package:flutter/material.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';

class _Note {
  _Note({
    required this.id,
    required this.title,
    required this.body,
    required this.updatedAt,
  });

  factory _Note.fromJson(Map<String, dynamic> json) {
    return _Note(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String? ?? 'Untitled note',
      body: json['body'] as String? ?? '',
      updatedAt:
          DateTime.tryParse(json['updatedAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  final int id;
  String title;
  String body;
  DateTime updatedAt;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'body': body,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class _NoteDraft {
  const _NoteDraft({required this.title, required this.body});

  final String title;
  final String body;
}

class NotesApp extends StatefulWidget {
  const NotesApp({super.key});

  @override
  State<NotesApp> createState() => _NotesAppState();
}

class _NotesAppState extends State<NotesApp> {
  final List<_Note> _notes = <_Note>[];
  int _nextId = 2;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  Future<void> _loadNotes() async {
    final List<Map<String, dynamic>>? stored = await LocalStore.readJsonList(
      LocalStore.notesKey,
    );
    if (!mounted) {
      return;
    }

    setState(() {
      if (stored == null || stored.isEmpty) {
        _notes.add(
          _Note(
            id: 1,
            title: 'Welcome to Notes',
            body:
                'This is your first note. Tap the + button to create another '
                'one, or tap this card to edit it. Swipe a note to delete it.',
            updatedAt: DateTime.now(),
          ),
        );
      } else {
        _notes.addAll(stored.map(_Note.fromJson));
        for (final _Note note in _notes) {
          if (note.id >= _nextId) {
            _nextId = note.id + 1;
          }
        }
      }
      _loaded = true;
    });
    await _persistNotes();
  }

  Future<void> _persistNotes() async {
    await LocalStore.writeJsonList(
      LocalStore.notesKey,
      _notes.map((_Note note) => note.toJson()).toList(),
    );
  }

  void _openEditor({_Note? note}) async {
    final _NoteDraft? draft = await Navigator.of(context).push<_NoteDraft>(
      MaterialPageRoute<_NoteDraft>(
        builder: (BuildContext context) => _NoteEditorScreen(note: note),
      ),
    );

    if (draft == null) {
      return;
    }

    setState(() {
      if (note == null) {
        _notes.insert(
          0,
          _Note(
            id: _nextId++,
            title: draft.title,
            body: draft.body,
            updatedAt: DateTime.now(),
          ),
        );
      } else {
        note
          ..title = draft.title
          ..body = draft.body
          ..updatedAt = DateTime.now();
        _notes.remove(note);
        _notes.insert(0, note);
      }
    });
    await _persistNotes();
  }

  Future<void> _deleteNote(_Note note) async {
    setState(() => _notes.remove(note));
    await _persistNotes();
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Notes',
      icon: Icons.edit_note_rounded,
      floatingActionButton: FloatingActionButton(
        tooltip: 'New note',
        onPressed: () => _openEditor(),
        child: const Icon(Icons.add_rounded),
      ),
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : _notes.isEmpty
          ? _EmptyNotes(onCreate: () => _openEditor())
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
              itemCount: _notes.length,
              separatorBuilder: (BuildContext context, int index) =>
                  const SizedBox(height: 10),
              itemBuilder: (BuildContext context, int index) {
                final _Note note = _notes[index];
                return _NoteCard(
                  note: note,
                  onTap: () => _openEditor(note: note),
                  onDelete: () => _deleteNote(note),
                );
              },
            ),
    );
  }
}

class _NoteCard extends StatelessWidget {
  const _NoteCard({
    required this.note,
    required this.onTap,
    required this.onDelete,
  });

  final _Note note;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Dismissible(
      key: ValueKey<int>(note.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDelete(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        decoration: BoxDecoration(
          color: scheme.errorContainer,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Icon(
          Icons.delete_outline_rounded,
          color: scheme.onErrorContainer,
        ),
      ),
      child: Material(
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
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        note.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      _relativeTime(note.updatedAt),
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(fontSize: 12),
                    ),
                  ],
                ),
                if (note.body.isNotEmpty) ...<Widget>[
                  const SizedBox(height: 8),
                  Text(
                    note.body,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _relativeTime(DateTime time) {
    final Duration difference = DateTime.now().difference(time);
    if (difference.inMinutes < 1) {
      return 'just now';
    }
    if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    }
    if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    }
    return '${difference.inDays}d ago';
  }
}

class _EmptyNotes extends StatelessWidget {
  const _EmptyNotes({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              Icons.note_add_outlined,
              size: 56,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text('No notes yet', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              'Create your first note and keep everything organized.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add_rounded),
              label: const Text('New note'),
            ),
          ],
        ),
      ),
    );
  }
}

class _NoteEditorScreen extends StatefulWidget {
  const _NoteEditorScreen({this.note});

  final _Note? note;

  @override
  State<_NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends State<_NoteEditorScreen> {
  late final TextEditingController _titleController;
  late final TextEditingController _bodyController;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.note?.title ?? '');
    _bodyController = TextEditingController(text: widget.note?.body ?? '');
  }

  @override
  void dispose() {
    _titleController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  void _save() {
    final String title = _titleController.text.trim();
    final String body = _bodyController.text.trim();
    Navigator.of(context).pop(
      _NoteDraft(title: title.isEmpty ? 'Untitled note' : title, body: body),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.note == null ? 'New note' : 'Edit note'),
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
                autofocus: widget.note == null,
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
                  controller: _bodyController,
                  expands: true,
                  minLines: null,
                  maxLines: null,
                  textAlignVertical: TextAlignVertical.top,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    hintText: 'Start writing…',
                    border: InputBorder.none,
                  ),
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
