import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:all_in_one/src/apps/tasks/tasks_app.dart';
import 'package:all_in_one/src/core/local_store.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  Future<void> pumpTasks(WidgetTester tester) async {
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const MaterialApp(home: TasksApp()));
    await tester.pumpAndSettle();
  }

  testWidgets('Today is numbered and tasks can move to All only', (
    WidgetTester tester,
  ) async {
    await pumpTasks(tester);

    expect(
      find.byKey(const ValueKey<String>('task-page-today')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey<String>('task-page-all')), findsOneWidget);
    expect(find.byKey(const ValueKey<String>('today-rank-1')), findsOneWidget);
    expect(find.byKey(const ValueKey<String>('today-rank-2')), findsOneWidget);
    expect(find.byKey(const ValueKey<String>('today-rank-3')), findsOneWidget);

    await tester.tap(find.byTooltip('Task actions').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Move to All only'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey<String>('task-1')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey<String>('task-page-today')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey<String>('task-1')), findsNothing);
    expect(find.byKey(const ValueKey<String>('today-rank-2')), findsOneWidget);

    final SharedPreferences preferences = await SharedPreferences.getInstance();
    final List<dynamic> stored = jsonDecode(
      preferences.getString(LocalStore.tasksKey)!,
    ) as List<dynamic>;
    final Map<String, dynamic> first = stored
        .cast<Map<String, dynamic>>()
        .firstWhere((Map<String, dynamic> task) => task['id'] == 1);
    expect(first['isToday'], isFalse);
  });

  testWidgets('long-press drag reorders Today priorities', (
    WidgetTester tester,
  ) async {
    await pumpTasks(tester);

    final Finder source = find.byKey(const ValueKey<String>('task-3'));
    final Finder target = find.byKey(const ValueKey<String>('task-1'));
    final TestGesture gesture = await tester.startGesture(
      tester.getCenter(source),
    );
    await tester.pump(const Duration(milliseconds: 320));
    await gesture.moveTo(tester.getCenter(target) - const Offset(0, 12));
    await tester.pump(const Duration(milliseconds: 180));
    await gesture.up();
    await tester.pumpAndSettle();

    final Finder firstRank = find.byKey(const ValueKey<String>('today-rank-3'));
    expect(
      find.descendant(of: firstRank, matching: find.text('1')),
      findsOneWidget,
    );
  });

  testWidgets('completed tasks move to the bottom of Today', (
    WidgetTester tester,
  ) async {
    await pumpTasks(tester);

    await tester.tap(find.byTooltip('Mark complete').first);
    await tester.pumpAndSettle();

    final double secondTaskY = tester
        .getTopLeft(find.byKey(const ValueKey<String>('task-2')))
        .dy;
    final double thirdTaskY = tester
        .getTopLeft(find.byKey(const ValueKey<String>('task-3')))
        .dy;
    final double completedTaskY = tester
        .getTopLeft(find.byKey(const ValueKey<String>('task-1')))
        .dy;
    expect(secondTaskY, lessThan(thirdTaskY));
    expect(thirdTaskY, lessThan(completedTaskY));

    final Finder completedRank = find.byKey(
      const ValueKey<String>('today-rank-1'),
    );
    expect(
      find.descendant(of: completedRank, matching: find.text('3')),
      findsOneWidget,
    );
  });

  testWidgets('holding a task does not shift its drag preview', (
    WidgetTester tester,
  ) async {
    await pumpTasks(tester);

    final Finder source = find.byKey(const ValueKey<String>('task-2'));
    final double originalX = tester.getTopLeft(source).dx;
    final TestGesture gesture = await tester.startGesture(
      tester.getCenter(source),
    );
    await tester.pump(const Duration(milliseconds: 320));

    final Finder feedback = find.byKey(
      const ValueKey<String>('task-drag-feedback-2'),
    );
    expect(feedback, findsOneWidget);
    expect((tester.getTopLeft(feedback).dx - originalX).abs(), lessThan(2));

    await gesture.up();
    await tester.pumpAndSettle();
  });

  testWidgets('a task can be dragged from Today to All', (
    WidgetTester tester,
  ) async {
    await pumpTasks(tester);

    final Finder source = find.byKey(const ValueKey<String>('task-1'));
    final Finder allTab = find.byKey(const ValueKey<String>('task-page-all'));
    final TestGesture gesture = await tester.startGesture(
      tester.getCenter(source),
    );
    await tester.pump(const Duration(milliseconds: 320));
    await gesture.moveTo(tester.getCenter(allTab));
    await tester.pump(const Duration(milliseconds: 180));
    await gesture.up();
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey<String>('task-page-today')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey<String>('task-1')), findsNothing);

    await tester.tap(find.byKey(const ValueKey<String>('task-page-all')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey<String>('task-1')), findsOneWidget);

    final TestGesture returnGesture = await tester.startGesture(
      tester.getCenter(find.byKey(const ValueKey<String>('task-1'))),
    );
    await tester.pump(const Duration(milliseconds: 320));
    await returnGesture.moveTo(
      tester.getCenter(find.byKey(const ValueKey<String>('task-page-today'))),
    );
    await tester.pump(const Duration(milliseconds: 180));
    await returnGesture.up();
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey<String>('task-1')), findsOneWidget);
    expect(find.byKey(const ValueKey<String>('today-rank-1')), findsOneWidget);
  });

  testWidgets('dragging right nests a task under a specific task', (
    WidgetTester tester,
  ) async {
    await pumpTasks(tester);

    final Finder source = find.byKey(const ValueKey<String>('task-2'));
    final Finder target = find.byKey(const ValueKey<String>('task-1'));
    final TestGesture gesture = await tester.startGesture(
      tester.getCenter(source),
    );
    await tester.pump(const Duration(milliseconds: 320));
    await gesture.moveTo(tester.getCenter(target) + const Offset(58, 0));
    await tester.pump(const Duration(milliseconds: 180));
    await gesture.up();
    await tester.pumpAndSettle();

    final SharedPreferences preferences = await SharedPreferences.getInstance();
    final List<dynamic> stored = jsonDecode(
      preferences.getString(LocalStore.tasksKey)!,
    ) as List<dynamic>;
    final Map<String, dynamic> nested = stored
        .cast<Map<String, dynamic>>()
        .firstWhere((Map<String, dynamic> task) => task['id'] == 2);
    expect(nested['parentId'], 1);
    expect(
      find.bySemanticsLabel(RegExp('Subtask Review today’s priorities')),
      findsOneWidget,
    );
  });
}
