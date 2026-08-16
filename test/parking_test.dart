import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:all_in_one/src/apps/apps_registry.dart';
import 'package:all_in_one/src/apps/parking/parking_app.dart';
import 'package:all_in_one/src/apps/parking/parking_engine.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test('procedural parking spaces remain valid across both difficulties', () {
    for (final ParkingDifficulty difficulty in ParkingDifficulty.values) {
      final ParkingEngine engine = ParkingEngine(
        seed: 42,
        difficulty: difficulty,
      );
      for (int index = 0; index < 80; index++) {
        final ParkingScenario scenario = engine.scenario;
        expect(scenario.target.left, greaterThan(0.02));
        expect(
          scenario.target.right,
          lessThan(ParkingEngine.worldWidth - 0.02),
        );
        expect(scenario.target.top, greaterThan(0.02));
        expect(
          scenario.target.bottom,
          lessThan(ParkingEngine.worldHeight - 0.02),
        );
        expect(
          scenario.parkedCars.any(
            (ParkedCar car) => scenario.target.contains(car.center),
          ),
          isFalse,
        );
        engine.isParked = true;
        engine.nextScenario();
      }
    }
  });

  test('go, steering, brake, and reverse affect the car', () {
    final ParkingEngine engine = ParkingEngine(seed: 7);
    final Offset start = engine.carPosition;
    engine.setThrottle(true);
    for (int index = 0; index < 30; index++) {
      engine.tick(0.02);
    }
    engine.setThrottle(false);

    expect(engine.carPosition.dy, lessThan(start.dy));
    expect(engine.speed, greaterThan(0));

    final double angle = engine.carAngle;
    engine.setSteering(1);
    engine.setThrottle(true);
    for (int index = 0; index < 20; index++) {
      engine.tick(0.02);
    }
    engine.setThrottle(false);
    expect(engine.carAngle, greaterThan(angle));

    engine.setBrake(true);
    for (int index = 0; index < 80; index++) {
      engine.tick(0.02);
    }
    expect(engine.speed, lessThan(0));
    expect(engine.isReversing, isTrue);
  });

  test('a stopped and aligned car completes the parking space', () {
    final ParkingEngine engine = ParkingEngine(seed: 11);
    engine
      ..carPosition = engine.scenario.target.center
      ..carAngle = engine.scenario.targetAngle
      ..speed = 0;

    for (int index = 0; index < 45; index++) {
      engine.tick(0.02);
    }

    expect(engine.isParked, isTrue);
    expect(
      engine.drainEvents().map((ParkingEvent event) => event.kind),
      contains(ParkingEventKind.parked),
    );
  });

  testWidgets('Parkline starts with wheel and pedal controls', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    expect(AppRegistry.byId('parking').name, 'Parkline');
    expect(() => AppRegistry.byId('tetherloom'), throwsStateError);
    await tester.pumpWidget(const MaterialApp(home: ParkingApp()));
    await tester.pumpAndSettle();

    expect(find.text('PARKLINE'), findsOneWidget);
    expect(find.text('Easy lots'), findsOneWidget);
    expect(find.text('Hard lots'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey<String>('parking-play')));
    await tester.pump(const Duration(milliseconds: 40));

    expect(
      find.byKey(const ValueKey<String>('parking-steering-wheel')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey<String>('parking-go')), findsOneWidget);
    expect(find.byKey(const ValueKey<String>('parking-brake')), findsOneWidget);
    expect(find.byTooltip('Pause game'), findsOneWidget);

    await tester.tap(find.byTooltip('Pause game'));
    await tester.pumpAndSettle();
    expect(find.text('Parked for a moment'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('hard spaces include both parallel and turn-in situations', () {
    final ParkingEngine engine = ParkingEngine(
      seed: 99,
      difficulty: ParkingDifficulty.hard,
    );
    final Set<String> labels = <String>{};
    for (int index = 0; index < 6; index++) {
      labels.add(engine.scenario.label);
      engine.isParked = true;
      engine.nextScenario();
    }
    expect(labels, containsAll(<String>['Parallel pocket', 'Tight turn-in']));
    expect(engine.scenario.targetAngle.abs(), anyOf(0, closeTo(pi / 2, 0.001)));
  });
}
