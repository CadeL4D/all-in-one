import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:all_in_one/src/apps/maths/maths_app.dart';

void main() {
  testWidgets('Maths shows only the five most recent completed runs', (
    WidgetTester tester,
  ) async {
    final DateTime now = DateTime.now();
    SharedPreferences.setMockInitialValues(<String, Object>{
      'maths_v1': jsonEncode(<String, dynamic>{
        'enabledOperations': <String>['addition'],
        'enabledDifficulties': <String>['easy'],
        'targetCount': 10,
        'timedSeconds': 60,
        'bestTimes': <String, int>{},
        'bestScores': <String, int>{},
        'recentRuns': <Map<String, dynamic>>[
          for (int index = 1; index <= 6; index++)
            <String, dynamic>{
              'id': '$index',
              'mode': index.isOdd ? 'count' : 'timed',
              'correctCount': 11 - index,
              'durationSeconds': index * 12,
              'goal': index.isOdd ? 10 : 60,
              'completedAt': now
                  .subtract(Duration(minutes: index))
                  .toIso8601String(),
            },
        ],
      }),
    });
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: MathsApp()));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Recent runs'),
      400,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();

    expect(find.text('Recent runs'), findsOneWidget);
    for (int index = 1; index <= 5; index++) {
      expect(find.byKey(ValueKey<String>('maths-run-$index')), findsOneWidget);
    }
    expect(find.byKey(const ValueKey<String>('maths-run-6')), findsNothing);
    expect(find.text('00:12'), findsOneWidget);
  });

  testWidgets('Maths safely migrates preferences without run history', (
    WidgetTester tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{
      'maths_v1': jsonEncode(<String, dynamic>{
        'enabledOperations': <String>['addition'],
        'enabledDifficulties': <String>['easy'],
        'recentRuns': 'legacy-invalid-value',
      }),
    });

    await tester.pumpWidget(const MaterialApp(home: MathsApp()));
    await tester.pumpAndSettle();

    expect(find.byType(MathsApp), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
