import 'dart:convert';

import 'package:all_in_one/src/apps/routines/routines_app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  testWidgets('completed routine steps show their time and adjacent interval', (
    WidgetTester tester,
  ) async {
    final DateTime today = DateTime.now();
    final DateTime firstCompletion = DateTime(
      today.year,
      today.month,
      today.day,
      7,
    );
    final DateTime secondCompletion = firstCompletion.add(
      const Duration(minutes: 13),
    );
    SharedPreferences.setMockInitialValues(<String, Object>{
      'routines_v1': jsonEncode(<Map<String, dynamic>>[
        <String, dynamic>{
          'id': 1,
          'name': 'Timing test',
          'description': '',
          'lastResetDate': _dateKey(today),
          'steps': <Map<String, dynamic>>[
            <String, dynamic>{
              'id': 1,
              'title': 'First step',
              'done': true,
              'completedAt': firstCompletion.toIso8601String(),
            },
            <String, dynamic>{
              'id': 2,
              'title': 'Second step',
              'done': true,
              'completedAt': secondCompletion.toIso8601String(),
            },
          ],
        },
      ]),
    });

    await tester.pumpWidget(const MaterialApp(home: RoutinesApp()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Timing test'));
    await tester.pumpAndSettle();

    expect(find.text('Completed at 7:00 AM'), findsOneWidget);
    expect(
      find.text('Completed at 7:13 AM · 13 min after previous step'),
      findsOneWidget,
    );
  });

  testWidgets('checking a routine step persists its actual completion time', (
    WidgetTester tester,
  ) async {
    final DateTime today = DateTime.now();
    SharedPreferences.setMockInitialValues(<String, Object>{
      'routines_v1': jsonEncode(<Map<String, dynamic>>[
        <String, dynamic>{
          'id': 1,
          'name': 'Live routine',
          'description': '',
          'lastResetDate': _dateKey(today),
          'steps': <Map<String, dynamic>>[
            <String, dynamic>{'id': 1, 'title': 'Live step', 'done': false},
          ],
        },
      ]),
    });

    await tester.pumpWidget(const MaterialApp(home: RoutinesApp()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Live routine'));
    await tester.pumpAndSettle();

    final DateTime beforeCompletion = DateTime.now();
    await tester.tap(find.text('Live step'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Completed at '), findsOneWidget);
    final SharedPreferences preferences = await SharedPreferences.getInstance();
    Map<String, dynamic> storedStep = _storedStep(preferences);
    final DateTime completedAt = DateTime.parse(
      storedStep['completedAt'] as String,
    );
    expect(storedStep['done'], isTrue);
    expect(
      completedAt.isBefore(
        beforeCompletion.subtract(const Duration(seconds: 1)),
      ),
      isFalse,
    );
    expect(
      completedAt.isAfter(DateTime.now().add(const Duration(seconds: 1))),
      isFalse,
    );

    await tester.tap(find.text('Live step'));
    await tester.pumpAndSettle();

    storedStep = _storedStep(preferences);
    expect(storedStep['done'], isFalse);
    expect(storedStep['completedAt'], isNull);
    expect(find.textContaining('Completed at '), findsNothing);
  });
}

String _dateKey(DateTime date) {
  final String month = date.month.toString().padLeft(2, '0');
  final String day = date.day.toString().padLeft(2, '0');
  return '${date.year}-$month-$day';
}

Map<String, dynamic> _storedStep(SharedPreferences preferences) {
  final List<dynamic> routines =
      jsonDecode(preferences.getString('routines_v1')!) as List<dynamic>;
  final Map<String, dynamic> routine = routines.first as Map<String, dynamic>;
  final List<dynamic> steps = routine['steps'] as List<dynamic>;
  return steps.first as Map<String, dynamic>;
}
