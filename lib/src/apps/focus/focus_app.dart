import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import '../../screens/app_scaffold.dart';

enum _FocusPhase { focus, break_ }

extension on _FocusPhase {
  String get label => this == _FocusPhase.focus ? 'Focus' : 'Break';

  Color get color => this == _FocusPhase.focus
      ? const Color(0xFFFC466B)
      : const Color(0xFF3F5EFB);
}

class _FocusPreferences {
  const _FocusPreferences({
    required this.taskName,
    required this.focusMinutes,
    required this.breakMinutes,
    required this.scheduledStartEnabled,
    required this.scheduledStart,
  });

  final String taskName;
  final int focusMinutes;
  final int breakMinutes;
  final bool scheduledStartEnabled;
  final DateTime? scheduledStart;

  factory _FocusPreferences.defaults() => const _FocusPreferences(
    taskName: 'Deep work',
    focusMinutes: 25,
    breakMinutes: 5,
    scheduledStartEnabled: false,
    scheduledStart: null,
  );

  factory _FocusPreferences.fromJson(Map<String, dynamic> json) {
    return _FocusPreferences(
      taskName: json['taskName'] as String? ?? 'Deep work',
      focusMinutes: (json['focusMinutes'] as num?)?.toInt() ?? 25,
      breakMinutes: (json['breakMinutes'] as num?)?.toInt() ?? 5,
      scheduledStartEnabled: json['scheduledStartEnabled'] as bool? ?? false,
      scheduledStart: json['scheduledStart'] is num
          ? DateTime.fromMillisecondsSinceEpoch(
              (json['scheduledStart'] as num).toInt(),
            )
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'taskName': taskName,
      'focusMinutes': focusMinutes,
      'breakMinutes': breakMinutes,
      'scheduledStartEnabled': scheduledStartEnabled,
      'scheduledStart': scheduledStart?.millisecondsSinceEpoch,
    };
  }
}

class _FocusSessionState {
  const _FocusSessionState({
    required this.phase,
    required this.running,
    required this.endTime,
    required this.pausedRemainingSeconds,
    required this.sessionCount,
  });

  final String phase;
  final bool running;
  final int? endTime;
  final int? pausedRemainingSeconds;
  final int sessionCount;

  factory _FocusSessionState.fromJson(Map<String, dynamic> json) {
    return _FocusSessionState(
      phase: json['phase'] as String? ?? 'focus',
      running: json['running'] as bool? ?? false,
      endTime: (json['endTime'] as num?)?.toInt(),
      pausedRemainingSeconds: (json['pausedRemainingSeconds'] as num?)?.toInt(),
      sessionCount: (json['sessionCount'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'phase': phase,
      'running': running,
      'endTime': endTime,
      'pausedRemainingSeconds': pausedRemainingSeconds,
      'sessionCount': sessionCount,
    };
  }
}

class FocusApp extends StatefulWidget {
  const FocusApp({super.key});

  @override
  State<FocusApp> createState() => _FocusAppState();
}

class _FocusAppState extends State<FocusApp> with WidgetsBindingObserver {
  static const String _preferencesKey = 'focus_preferences_v1';
  static const String _sessionKey = 'focus_session_v1';
  static const int _notificationId = 4711;

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  AudioPlayer? _chimePlayer;
  Timer? _ticker;

  _FocusPreferences _preferences = _FocusPreferences.defaults();
  _FocusPhase _phase = _FocusPhase.focus;
  bool _running = false;
  DateTime? _endTime;
  int _remainingSeconds = 25 * 60;
  int _sessionCount = 0;
  bool _loaded = false;
  bool _completionShowing = false;
  AppLifecycleState _lifecycleState = AppLifecycleState.resumed;

  int get _durationSeconds => _phase == _FocusPhase.focus
      ? _preferences.focusMinutes * 60
      : _preferences.breakMinutes * 60;

  int get _totalSeconds => _durationSeconds;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    tz_data.initializeTimeZones();
    _initializeNotifications();
    _load();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _onTick());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _ticker?.cancel();
    _chimePlayer?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycleState = state;
    if (state == AppLifecycleState.resumed) {
      _syncFromWallClock();
    }
  }

  Future<void> _initializeNotifications() async {
    try {
      await _notifications.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(
            requestAlertPermission: false,
            requestBadgePermission: false,
            requestSoundPermission: false,
          ),
          macOS: DarwinInitializationSettings(
            requestAlertPermission: false,
            requestBadgePermission: false,
            requestSoundPermission: false,
          ),
        ),
      );
      final AndroidFlutterLocalNotificationsPlugin? androidNotifications =
          _notifications
              .resolvePlatformSpecificImplementation<
                AndroidFlutterLocalNotificationsPlugin
              >();
      await androidNotifications?.requestNotificationsPermission();
      await androidNotifications?.requestExactAlarmsPermission();
      await _notifications
          .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin
          >()
          ?.requestPermissions(alert: true, badge: true, sound: true);
    } catch (_) {
      // Notifications are optional on unsupported platforms.
    }
  }

  Future<void> _load() async {
    final SharedPreferences preferences = await SharedPreferences.getInstance();

    final String? rawPreferences = preferences.getString(_preferencesKey);
    if (rawPreferences != null) {
      try {
        _preferences = _FocusPreferences.fromJson(
          jsonDecode(rawPreferences) as Map<String, dynamic>,
        );
      } catch (_) {
        _preferences = _FocusPreferences.defaults();
      }
    }

    final String? rawSession = preferences.getString(_sessionKey);
    if (rawSession != null) {
      try {
        final _FocusSessionState session = _FocusSessionState.fromJson(
          jsonDecode(rawSession) as Map<String, dynamic>,
        );
        _phase = session.phase == 'break'
            ? _FocusPhase.break_
            : _FocusPhase.focus;
        _sessionCount = session.sessionCount;
        _running = session.running;
        if (session.running && session.endTime != null) {
          _endTime = DateTime.fromMillisecondsSinceEpoch(session.endTime!);
          _remainingSeconds = _remainingFromEndTime();
          if (_remainingSeconds <= 0) {
            _running = false;
            _remainingSeconds = 0;
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _completePhase();
            });
          }
        } else {
          _remainingSeconds =
              session.pausedRemainingSeconds ?? _durationSeconds;
        }
      } catch (_) {
        _remainingSeconds = _durationSeconds;
      }
    } else {
      _remainingSeconds = _durationSeconds;
    }

    if (mounted) {
      setState(() => _loaded = true);
    }
  }

  int _remainingFromEndTime() {
    final DateTime? endTime = _endTime;
    if (endTime == null) {
      return _durationSeconds;
    }
    final int millis = endTime.difference(DateTime.now()).inMilliseconds;
    return (millis / 1000).ceil().clamp(0, _durationSeconds);
  }

  void _onTick() {
    if (!_loaded || !mounted) {
      return;
    }

    if (_running) {
      _remainingSeconds = _remainingFromEndTime();
      if (_remainingSeconds <= 0) {
        _completePhase();
        return;
      }
    } else {
      _maybeStartScheduledSession();
    }

    if (mounted) {
      setState(() {});
    }
  }

  void _syncFromWallClock() {
    if (!_loaded || !mounted) {
      return;
    }
    if (_running) {
      _remainingSeconds = _remainingFromEndTime();
      if (_remainingSeconds <= 0) {
        _completePhase();
        return;
      }
    }
    _maybeStartScheduledSession();
    if (mounted) {
      setState(() {});
    }
  }

  void _maybeStartScheduledSession() {
    if (_completionShowing || _running) {
      return;
    }
    if (!_preferences.scheduledStartEnabled ||
        _preferences.scheduledStart == null) {
      return;
    }

    final DateTime now = DateTime.now();
    final DateTime start = _preferences.scheduledStart!;
    if (!now.isBefore(start) && now.difference(start).inSeconds < 90) {
      _startPhase(_FocusPhase.focus, scheduled: true);
    }
  }

  Future<void> _startPause() async {
    if (_running) {
      await _pauseTimer();
      return;
    }

    if (_preferences.scheduledStartEnabled &&
        _preferences.scheduledStart != null &&
        _preferences.scheduledStart!.isAfter(DateTime.now())) {
      await _startScheduledNowQuestion();
      return;
    }

    await _startPhase(_phase);
  }

  Future<void> _startScheduledNowQuestion() async {
    final bool? startNow = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        title: const Text('Scheduled start is on'),
        content: const Text(
          'Start now instead of waiting for the scheduled time?',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep schedule'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Start now'),
          ),
        ],
      ),
    );
    if (startNow == true && mounted) {
      await _startPhase(_phase, scheduled: true);
    }
  }

  Future<void> _startPhase(_FocusPhase phase, {bool scheduled = false}) async {
    _phase = phase;
    _running = true;
    _endTime = DateTime.now().add(Duration(seconds: _durationSeconds));
    _remainingSeconds = _durationSeconds;
    if (scheduled) {
      _preferences = _FocusPreferences(
        taskName: _preferences.taskName,
        focusMinutes: _preferences.focusMinutes,
        breakMinutes: _preferences.breakMinutes,
        scheduledStartEnabled: false,
        scheduledStart: null,
      );
    }
    await _persist();
    await _scheduleCompletionNotification();
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _pauseTimer() async {
    _running = false;
    _remainingSeconds = _remainingFromEndTime();
    _endTime = null;
    await _notifications.cancel(id: _notificationId);
    await _persist();
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _reset() async {
    _running = false;
    _endTime = null;
    _phase = _FocusPhase.focus;
    _remainingSeconds = _preferences.focusMinutes * 60;
    await _notifications.cancel(id: _notificationId);
    await _persist();
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _switchPhase(_FocusPhase phase) async {
    _running = false;
    _endTime = null;
    _phase = phase;
    _remainingSeconds = _durationSeconds;
    await _notifications.cancel(id: _notificationId);
    await _persist();
    if (mounted) {
      setState(() {});
    }
  }

  void _completePhase() {
    if (_completionShowing) {
      return;
    }
    final _FocusPhase completedPhase = _phase;
    _running = false;
    _endTime = null;
    _completionShowing = true;
    _remainingSeconds = 0;

    if (completedPhase == _FocusPhase.focus) {
      _sessionCount++;
    }

    _persist();
    _notifications.cancel(id: _notificationId);
    _playCompletionFeedback();

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) => AlertDialog(
        title: Text(
          completedPhase == _FocusPhase.focus
              ? 'Focus session complete'
              : 'Break complete',
        ),
        content: Text(
          completedPhase == _FocusPhase.focus
              ? 'Nice work on "${_preferences.taskName}". Ready to rest?'
              : 'Ready to return to "${_preferences.taskName}"?',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _completionShowing = false;
              _reset();
            },
            child: const Text('Stop here'),
          ),
          FilledButton.icon(
            onPressed: () {
              Navigator.of(context).pop();
              _completionShowing = false;
              _startPhase(
                completedPhase == _FocusPhase.focus
                    ? _FocusPhase.break_
                    : _FocusPhase.focus,
              );
            },
            icon: Icon(
              completedPhase == _FocusPhase.focus
                  ? Icons.local_cafe_rounded
                  : Icons.play_arrow_rounded,
            ),
            label: Text(
              completedPhase == _FocusPhase.focus
                  ? 'Start break'
                  : 'Start focus',
            ),
          ),
        ],
      ),
    );

    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _playCompletionFeedback() async {
    if (_lifecycleState != AppLifecycleState.resumed) {
      return;
    }
    HapticFeedback.vibrate();
    try {
      _chimePlayer ??= AudioPlayer();
      await _chimePlayer?.stop();
      await _chimePlayer?.play(AssetSource('audio/focus/chime.wav'));
    } catch (_) {
      // The scheduled notification still provides an audible alert.
    }
  }

  Future<void> _scheduleCompletionNotification() async {
    final DateTime? endTime = _endTime;
    if (endTime == null) {
      return;
    }

    try {
      final tz.TZDateTime scheduledDate = tz.TZDateTime.from(endTime, tz.local);
      final NotificationDetails details = NotificationDetails(
        android: AndroidNotificationDetails(
          'focus_timer',
          'Focus timer',
          channelDescription: 'Alerts when focus and break sessions finish',
          importance: Importance.max,
          priority: Priority.high,
          playSound: true,
          enableVibration: true,
          vibrationPattern: Int64List.fromList(<int>[0, 450, 220, 450]),
          category: AndroidNotificationCategory.alarm,
        ),
        iOS: DarwinNotificationDetails(
          presentSound: true,
          presentBanner: true,
          presentList: true,
        ),
        macOS: DarwinNotificationDetails(
          presentSound: true,
          presentBanner: true,
          presentList: true,
        ),
      );

      await _notifications.zonedSchedule(
        id: _notificationId,
        title: _phase == _FocusPhase.focus
            ? 'Focus complete'
            : 'Break complete',
        body: _phase == _FocusPhase.focus
            ? '"${_preferences.taskName}" is finished. Time to rest.'
            : 'Your break is over. Ready to focus again?',
        scheduledDate: scheduledDate,
        notificationDetails: details,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      );
    } catch (_) {
      // Some desktop platforms do not support scheduled notifications.
    }
  }

  Future<void> _persist() async {
    final SharedPreferences preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _preferencesKey,
      jsonEncode(_preferences.toJson()),
    );
    await preferences.setString(
      _sessionKey,
      jsonEncode(
        _FocusSessionState(
          phase: _phase == _FocusPhase.focus ? 'focus' : 'break',
          running: _running,
          endTime: _endTime?.millisecondsSinceEpoch,
          pausedRemainingSeconds: _running ? null : _remainingSeconds,
          sessionCount: _sessionCount,
        ).toJson(),
      ),
    );
  }

  Future<void> _setTaskName(String value) async {
    _preferences = _FocusPreferences(
      taskName: value.trim().isEmpty ? 'Deep work' : value.trim(),
      focusMinutes: _preferences.focusMinutes,
      breakMinutes: _preferences.breakMinutes,
      scheduledStartEnabled: _preferences.scheduledStartEnabled,
      scheduledStart: _preferences.scheduledStart,
    );
    await _persist();
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _setDuration({int? focusMinutes, int? breakMinutes}) async {
    _preferences = _FocusPreferences(
      taskName: _preferences.taskName,
      focusMinutes: focusMinutes ?? _preferences.focusMinutes,
      breakMinutes: breakMinutes ?? _preferences.breakMinutes,
      scheduledStartEnabled: _preferences.scheduledStartEnabled,
      scheduledStart: _preferences.scheduledStart,
    );

    if (!_running) {
      _remainingSeconds = _durationSeconds;
    }
    await _persist();
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _setScheduledStartEnabled(bool enabled) async {
    if (enabled) {
      final DateTime? picked = await _pickScheduledStart();
      if (picked == null) {
        return;
      }
      _preferences = _FocusPreferences(
        taskName: _preferences.taskName,
        focusMinutes: _preferences.focusMinutes,
        breakMinutes: _preferences.breakMinutes,
        scheduledStartEnabled: true,
        scheduledStart: picked,
      );
    } else {
      _preferences = _FocusPreferences(
        taskName: _preferences.taskName,
        focusMinutes: _preferences.focusMinutes,
        breakMinutes: _preferences.breakMinutes,
        scheduledStartEnabled: false,
        scheduledStart: null,
      );
    }
    await _persist();
    if (mounted) {
      setState(() {});
    }
  }

  Future<DateTime?> _pickScheduledStart() async {
    final DateTime now = DateTime.now();
    final DateTime initial = now.add(const Duration(minutes: 5));
    final DateTime? date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: now.subtract(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (date == null || !mounted) {
      return null;
    }

    final TimeOfDay? time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null) {
      return null;
    }

    final DateTime selected = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    if (selected.isBefore(now)) {
      return selected.add(const Duration(days: 1));
    }
    return selected;
  }

  String get _timeLabel {
    final int minutes = _remainingSeconds ~/ 60;
    final int seconds = _remainingSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:'
        '${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Focus',
      icon: Icons.timer_rounded,
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : _buildLoaded(context),
    );
  }

  Widget _buildLoaded(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: <Widget>[
        _TaskCard(taskName: _preferences.taskName, onChanged: _setTaskName),
        const SizedBox(height: 14),
        _TimerCard(
          phase: _phase,
          timeLabel: _timeLabel,
          progress: 1 - (_remainingSeconds / _totalSeconds),
          running: _running,
          taskName: _preferences.taskName,
          scheduledStartEnabled: _preferences.scheduledStartEnabled,
          scheduledStart: _preferences.scheduledStart,
          sessionCount: _sessionCount,
          onStartPause: _startPause,
          onReset: _reset,
          onSwitchPhase: _switchPhase,
        ),
        const SizedBox(height: 14),
        _DurationSettingsCard(
          focusMinutes: _preferences.focusMinutes,
          breakMinutes: _preferences.breakMinutes,
          onFocusChanged: (int value) => _setDuration(focusMinutes: value),
          onBreakChanged: (int value) => _setDuration(breakMinutes: value),
        ),
        const SizedBox(height: 14),
        _ScheduleCard(
          enabled: _preferences.scheduledStartEnabled,
          scheduledStart: _preferences.scheduledStart,
          onEnabledChanged: _setScheduledStartEnabled,
        ),
        const SizedBox(height: 14),
        _InfoNote(),
      ],
    );
  }
}

class _TaskCard extends StatefulWidget {
  const _TaskCard({required this.taskName, required this.onChanged});

  final String taskName;
  final ValueChanged<String> onChanged;

  @override
  State<_TaskCard> createState() => _TaskCardState();
}

class _TaskCardState extends State<_TaskCard> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.taskName);
  }

  @override
  void didUpdateWidget(covariant _TaskCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.taskName != widget.taskName &&
        _controller.text != widget.taskName) {
      _controller.text = widget.taskName;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(Icons.flag_rounded, color: scheme.primary),
              const SizedBox(width: 9),
              Text(
                'Focus session',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _controller,
            textCapitalization: TextCapitalization.sentences,
            onSubmitted: widget.onChanged,
            onEditingComplete: () {
              widget.onChanged(_controller.text);
              FocusScope.of(context).unfocus();
            },
            decoration: InputDecoration(
              hintText: 'What are you focusing on?',
              suffixIcon: IconButton(
                tooltip: 'Save task name',
                onPressed: () => widget.onChanged(_controller.text),
                icon: const Icon(Icons.check_rounded),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimerCard extends StatelessWidget {
  const _TimerCard({
    required this.phase,
    required this.timeLabel,
    required this.progress,
    required this.running,
    required this.taskName,
    required this.scheduledStartEnabled,
    required this.scheduledStart,
    required this.sessionCount,
    required this.onStartPause,
    required this.onReset,
    required this.onSwitchPhase,
  });

  final _FocusPhase phase;
  final String timeLabel;
  final double progress;
  final bool running;
  final String taskName;
  final bool scheduledStartEnabled;
  final DateTime? scheduledStart;
  final int sessionCount;
  final VoidCallback onStartPause;
  final VoidCallback onReset;
  final ValueChanged<_FocusPhase> onSwitchPhase;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.7)),
      ),
      child: Column(
        children: <Widget>[
          _ModeSwitch(phase: phase, onChanged: onSwitchPhase),
          const SizedBox(height: 22),
          SizedBox(
            width: 220,
            height: 220,
            child: Stack(
              fit: StackFit.expand,
              children: <Widget>[
                CircularProgressIndicator(
                  value: progress,
                  strokeWidth: 13,
                  backgroundColor: scheme.surfaceContainerHighest,
                  color: phase.color,
                ),
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Text(
                        timeLabel,
                        style: TextStyle(
                          fontSize: 44,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -1.4,
                          color: scheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        running ? taskName : phase.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      if (scheduledStartEnabled && scheduledStart != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: _ScheduledPill(
                            scheduledStart: scheduledStart!,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(
            '$sessionCount ${sessionCount == 1 ? 'session' : 'sessions'} completed',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: phase.color,
                padding: const EdgeInsets.symmetric(vertical: 15),
              ),
              onPressed: onStartPause,
              icon: Icon(
                running ? Icons.pause_rounded : Icons.play_arrow_rounded,
              ),
              label: Text(running ? 'Pause' : 'Start'),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: onReset,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Reset'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScheduledPill extends StatelessWidget {
  const _ScheduledPill({required this.scheduledStart});

  final DateTime scheduledStart;

  @override
  Widget build(BuildContext context) {
    final String time = TimeOfDay.fromDateTime(scheduledStart).format(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFFC466B).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        'Scheduled $time',
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: const Color(0xFFFC466B),
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ModeSwitch extends StatelessWidget {
  const _ModeSwitch({required this.phase, required this.onChanged});

  final _FocusPhase phase;
  final ValueChanged<_FocusPhase> onChanged;

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
            child: _ModeButton(
              label: 'Focus',
              selected: phase == _FocusPhase.focus,
              color: const Color(0xFFFC466B),
              onTap: () => onChanged(_FocusPhase.focus),
            ),
          ),
          Expanded(
            child: _ModeButton(
              label: 'Break',
              selected: phase == _FocusPhase.break_,
              color: const Color(0xFF3F5EFB),
              onTap: () => onChanged(_FocusPhase.break_),
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? color : Colors.transparent,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 11),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: selected
                  ? Colors.white
                  : Theme.of(context).colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class _DurationSettingsCard extends StatelessWidget {
  const _DurationSettingsCard({
    required this.focusMinutes,
    required this.breakMinutes,
    required this.onFocusChanged,
    required this.onBreakChanged,
  });

  final int focusMinutes;
  final int breakMinutes;
  final ValueChanged<int> onFocusChanged;
  final ValueChanged<int> onBreakChanged;

  @override
  Widget build(BuildContext context) {
    return _SettingsCard(
      icon: Icons.tune_rounded,
      title: 'Durations',
      child: Column(
        children: <Widget>[
          _DurationSlider(
            label: 'Focus',
            minutes: focusMinutes,
            color: const Color(0xFFFC466B),
            onChanged: onFocusChanged,
          ),
          const SizedBox(height: 14),
          _DurationSlider(
            label: 'Break',
            minutes: breakMinutes,
            color: const Color(0xFF3F5EFB),
            onChanged: onBreakChanged,
          ),
        ],
      ),
    );
  }
}

class _DurationSlider extends StatelessWidget {
  const _DurationSlider({
    required this.label,
    required this.minutes,
    required this.color,
    required this.onChanged,
  });

  final String label;
  final int minutes;
  final Color color;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          children: <Widget>[
            Icon(Icons.schedule_rounded, size: 18, color: color),
            const SizedBox(width: 7),
            Text(label, style: Theme.of(context).textTheme.titleMedium),
            const Spacer(),
            Text(
              '$minutes min',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(color: color, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        Slider(
          value: minutes.clamp(1, 90).toDouble(),
          min: 1,
          max: 90,
          divisions: 89,
          activeColor: color,
          label: '$minutes min',
          onChanged: (double value) => onChanged(value.round()),
        ),
        Wrap(
          spacing: 8,
          children: <Widget>[
            for (final int preset in <int>[5, 10, 15, 25, 45])
              ActionChip(
                label: Text('$preset'),
                backgroundColor: scheme.surfaceContainerHighest,
                side: BorderSide.none,
                onPressed: () => onChanged(preset),
              ),
          ],
        ),
      ],
    );
  }
}

class _ScheduleCard extends StatelessWidget {
  const _ScheduleCard({
    required this.enabled,
    required this.scheduledStart,
    required this.onEnabledChanged,
  });

  final bool enabled;
  final DateTime? scheduledStart;
  final ValueChanged<bool> onEnabledChanged;

  @override
  Widget build(BuildContext context) {
    return _SettingsCard(
      icon: Icons.event_available_rounded,
      title: 'Scheduled start',
      child: Column(
        children: <Widget>[
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Start at a chosen time'),
            subtitle: Text(
              enabled && scheduledStart != null
                  ? '${TimeOfDay.fromDateTime(scheduledStart!).format(context)} • ${scheduledStart!.month}/${scheduledStart!.day}'
                  : 'Off until you enable it',
            ),
            value: enabled,
            onChanged: onEnabledChanged,
          ),
        ],
      ),
    );
  }
}

class _InfoNote extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(Icons.notifications_active_rounded, color: scheme.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Focus keeps counting even when you leave the app. When a timer ends, it can vibrate and chime from the background.',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({
    required this.icon,
    required this.title,
    required this.child,
  });

  final IconData icon;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(icon, color: scheme.primary),
              const SizedBox(width: 9),
              Text(title, style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
