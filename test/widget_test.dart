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

    await tester.tap(find.text('Add clock time').first);
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
}
