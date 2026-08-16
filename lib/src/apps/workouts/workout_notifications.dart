import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import 'workout_models.dart';

class WorkoutNotifications {
  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  bool _initialized = false;
  String? _lastSignature;

  Future<void> sync(WorkoutState state) async {
    final String signature = state.workouts
        .map(
          (PlannedWorkout workout) =>
              '${workout.id}:${workout.date.toIso8601String()}:${workout.status.name}',
        )
        .join('|');
    if (_lastSignature == signature) {
      return;
    }
    _lastSignature = signature;
    try {
      await _initialize();
      for (final PlannedWorkout workout in state.workouts) {
        await _plugin.cancel(id: _idFor(workout.id));
      }
      final DateTime now = DateTime.now();
      for (final PlannedWorkout workout in state.workouts) {
        if (workout.status != WorkoutStatus.scheduled) {
          continue;
        }
        final int minutes = state.profile.reminderMinutes;
        final DateTime reminder = DateTime(
          workout.date.year,
          workout.date.month,
          workout.date.day,
          minutes ~/ 60,
          minutes % 60,
        );
        if (!reminder.isAfter(now)) {
          continue;
        }
        await _plugin.zonedSchedule(
          id: _idFor(workout.id),
          title: 'Pressure is waiting',
          body:
              '${workout.title} is rated ${workout.pressure}. Meet it before midnight.',
          scheduledDate: tz.TZDateTime.from(reminder, tz.local),
          notificationDetails: const NotificationDetails(
            android: AndroidNotificationDetails(
              'workout_reminders',
              'Workout reminders',
              channelDescription: 'Reminders for scheduled Workouts sessions',
              importance: Importance.high,
              priority: Priority.high,
            ),
            iOS: DarwinNotificationDetails(
              presentBanner: true,
              presentList: true,
              presentSound: true,
            ),
            macOS: DarwinNotificationDetails(
              presentBanner: true,
              presentList: true,
              presentSound: true,
            ),
          ),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        );
      }
    } catch (_) {
      // Reminders are optional on unsupported platforms and in widget tests.
    }
  }

  Future<void> _initialize() async {
    if (_initialized) {
      return;
    }
    tz_data.initializeTimeZones();
    await _plugin.initialize(
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
    await _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.requestNotificationsPermission();
    await _plugin
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >()
        ?.requestPermissions(alert: true, badge: false, sound: true);
    _initialized = true;
  }

  int _idFor(String id) {
    int hash = 17;
    for (final int value in id.codeUnits) {
      hash = (hash * 31 + value) & 0x7fffffff;
    }
    return 820000 + hash % 100000;
  }
}
