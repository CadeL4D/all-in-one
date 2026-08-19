import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:all_in_one/src/app.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  testWidgets('hub renders app tiles and opens Tasks', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const HubApp());
    await tester.pumpAndSettle();

    expect(find.text('One Hub'), findsOneWidget);
    expect(find.text('Notes'), findsNothing);
    expect(find.text('Calculator'), findsNothing);
    expect(find.text('Tasks'), findsOneWidget);
    expect(find.text('Prompts'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Maths'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    expect(find.text('Maths'), findsOneWidget);
    expect(find.text('Routines'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Noises'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    expect(find.text('Noises'), findsOneWidget);

    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 1200),
      2400,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tasks'));
    await tester.pumpAndSettle();

    expect(find.text('Set up your first project'), findsOneWidget);
  });

  testWidgets('hub search filters the app grid', (WidgetTester tester) async {
    await tester.pumpWidget(const HubApp());

    await tester.enterText(find.byType(TextField), 'maths');
    await tester.pump();

    expect(find.text('Maths'), findsOneWidget);
    expect(find.text('Routines'), findsNothing);
    expect(find.text('Notes'), findsNothing);
    expect(find.text('Tasks'), findsNothing);
  });

  testWidgets('hub uses two columns and persists long-press card order', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const HubApp());
    await tester.pumpAndSettle();

    final Finder prompts = find.byKey(const ValueKey<String>('prompts'));
    final Finder tasks = find.byKey(const ValueKey<String>('tasks'));
    final Finder maths = find.byKey(const ValueKey<String>('maths'));
    expect(tester.getTopLeft(prompts).dy, tester.getTopLeft(tasks).dy);
    expect(
      tester.getTopLeft(prompts).dx,
      lessThan(tester.getTopLeft(tasks).dx),
    );
    expect(find.text('Make room for\nwhat matters.'), findsNothing);

    final TestGesture drag = await tester.startGesture(
      tester.getCenter(
        find.byKey(const ValueKey<String>('draggable-app-prompts')),
      ),
    );
    await tester.pump(const Duration(milliseconds: 700));
    await drag.moveTo(tester.getCenter(maths));
    await tester.pump(const Duration(milliseconds: 200));
    await drag.up();
    await tester.pumpAndSettle();

    final SharedPreferences preferences = await SharedPreferences.getInstance();
    expect(preferences.getStringList('app_order_v1'), <String>[
      'tasks',
      'routines',
      'prompts',
      'maths',
      'focus',
      'noises',
      'simon',
      'sanctuary',
      'workouts',
    ]);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpWidget(const HubApp());
    await tester.pumpAndSettle();
    expect(
      tester.getTopLeft(find.byKey(const ValueKey<String>('tasks'))).dy,
      lessThan(
        tester.getTopLeft(find.byKey(const ValueKey<String>('prompts'))).dy,
      ),
    );
  });

  testWidgets('recent apps are compact and above the browsing controls', (
    WidgetTester tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{
      'recent_apps_v1': <String>['tasks', 'maths', 'focus'],
    });
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const HubApp());
    await tester.pumpAndSettle();

    final Finder recentTask = find.byKey(
      const ValueKey<String>('recent-app-tasks'),
    );
    expect(tester.getSize(recentTask).height, 48);
    expect(
      tester.getTopLeft(recentTask).dy,
      lessThan(tester.getTopLeft(find.byType(TextField)).dy),
    );
  });

  testWidgets('routine step accepts and saves an exact time', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const HubApp());
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('Routines'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Routines'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Morning reset'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Edit routine'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Add start time').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Switch).last);
    await tester.pumpAndSettle();

    final Finder timeFields = find.byType(TextField);
    await tester.enterText(
      timeFields.at(timeFields.evaluate().length - 2),
      '7',
    );
    await tester.enterText(timeFields.last, '13');
    await tester.tap(find.text('Save time'));
    await tester.pumpAndSettle();

    expect(find.text('7:13 AM'), findsOneWidget);
  });

  testWidgets('routine step offsets chain from the previous step', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const HubApp());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Routines'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Morning reset'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Edit routine'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Add start time'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Switch).last);
    await tester.pumpAndSettle();
    final Finder anchorFields = find.byType(TextField);
    await tester.enterText(
      anchorFields.at(anchorFields.evaluate().length - 2),
      '7',
    );
    await tester.enterText(anchorFields.last, '13');
    await tester.tap(find.text('Save time'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Add time or offset').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Switch).last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('From previous step'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey<String>('routine-offset-minutes')),
      '10',
    );
    await tester.pump();
    expect(find.text('10 min after previous step · 7:23 AM'), findsOneWidget);

    await tester.tap(find.text('Before'));
    await tester.pump();
    expect(find.text('10 min before previous step · 7:03 AM'), findsOneWidget);
    await tester.tap(find.text('After'));
    await tester.pump();
    await tester.tap(find.text('Save offset'));
    await tester.pumpAndSettle();

    expect(find.text('10 min after previous step · 7:23 AM'), findsOneWidget);

    await tester.tap(find.text('Add time or offset'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Switch).last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('From previous step'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey<String>('routine-offset-minutes')),
      '5',
    );
    await tester.pump();
    expect(find.text('5 min after previous step · 7:28 AM'), findsOneWidget);
    await tester.tap(find.text('Save offset'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(find.text('10 min after previous step · 7:23 AM'), findsOneWidget);
    expect(find.text('5 min after previous step · 7:28 AM'), findsOneWidget);

    final SharedPreferences preferences = await SharedPreferences.getInstance();
    final List<dynamic> routines =
        jsonDecode(preferences.getString('routines_v1')!) as List<dynamic>;
    final Map<String, dynamic> routine = routines.first as Map<String, dynamic>;
    final List<dynamic> steps = routine['steps'] as List<dynamic>;
    expect((steps[1] as Map<String, dynamic>)['offsetMinutes'], 10);
    expect((steps[2] as Map<String, dynamic>)['offsetMinutes'], 5);
  });
}
