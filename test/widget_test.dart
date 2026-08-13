import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:all_in_one/src/app.dart';

void main() {
  testWidgets('hub renders app tiles and opens Notes', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const HubApp());

    expect(find.text('One Hub'), findsOneWidget);
    expect(find.text('Notes'), findsOneWidget);
    expect(find.text('Tasks'), findsOneWidget);
    expect(find.text('Calculator'), findsOneWidget);
    expect(find.text('Focus'), findsOneWidget);

    await tester.tap(find.text('Notes'));
    await tester.pumpAndSettle();

    expect(find.text('Welcome to Notes'), findsOneWidget);
  });

  testWidgets('hub search filters the app grid', (WidgetTester tester) async {
    await tester.pumpWidget(const HubApp());

    await tester.enterText(find.byType(TextField), 'calculator');
    await tester.pump();

    expect(find.text('Calculator'), findsOneWidget);
    expect(find.text('Notes'), findsNothing);
    expect(find.text('Tasks'), findsNothing);
  });
}
