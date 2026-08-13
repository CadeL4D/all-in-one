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
    expect(find.text('Maths'), findsOneWidget);
    expect(find.text('Routines'), findsOneWidget);
    expect(find.text('Focus'), findsOneWidget);

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
}
