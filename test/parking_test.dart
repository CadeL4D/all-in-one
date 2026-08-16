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
          ParkingEngine.playableBounds.contains(scenario.target.topLeft),
          isTrue,
        );
        expect(
          ParkingEngine.playableBounds.contains(scenario.target.bottomRight),
          isTrue,
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
    expect(engine.parks, 1);
    expect(engine.score, greaterThan(0));
    expect(
      engine.drainEvents().map((ParkingEvent event) => event.kind),
      contains(ParkingEventKind.parked),
    );
  });

  testWidgets('Parkline starts with wheel and pedal controls', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(360, 780);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    expect(AppRegistry.byId('parking').name, 'Parkline');
    expect(() => AppRegistry.byId('tetherloom'), throwsStateError);
    await tester.pumpWidget(const MaterialApp(home: ParkingApp()));
    await tester.pumpAndSettle();

    expect(find.text('PARKLINE'), findsOneWidget);
    expect(find.text('Easy'), findsOneWidget);
    expect(find.text('Hard'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.tap(find.byKey(const ValueKey<String>('parking-play')));
    await tester.pump(const Duration(milliseconds: 40));

    expect(
      find.byKey(const ValueKey<String>('parking-steering-wheel')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey<String>('parking-go')), findsOneWidget);
    expect(find.byKey(const ValueKey<String>('parking-brake')), findsOneWidget);
    expect(find.byTooltip('Pause game'), findsOneWidget);
    expect(tester.takeException(), isNull);

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

  test(
    'boundary impacts remain stable instead of retriggering every frame',
    () {
      final ParkingEngine engine = ParkingEngine(seed: 4)
        ..carPosition = Offset(
          ParkingEngine.playableBounds.left + ParkingEngine.carWidth / 2 - 0.01,
          0.9,
        );

      for (int index = 0; index < 40; index++) {
        engine.tick(0.02);
      }

      expect(engine.carWithinPlayableBounds, isFalse);
      expect(engine.bumps, 1);
      expect(
        engine.drainEvents().where(
          (ParkingEvent event) => event.kind == ParkingEventKind.bump,
        ),
        hasLength(1),
      );
    },
  );

  test('hard scenarios have moving traffic and collectible route tokens', () {
    final ParkingEngine engine = ParkingEngine(
      seed: 17,
      difficulty: ParkingDifficulty.hard,
    );
    final TrafficCar traffic = engine.scenario.traffic.single;
    final Offset trafficStart = traffic.center;
    engine.tick(0.2);
    expect(traffic.center, isNot(trafficStart));

    final ParkingPickup pickup = engine.scenario.pickups.first;
    engine
      ..carPosition = pickup.center
      ..speed = 0;
    engine.tick(0.02);
    expect(pickup.collected, isTrue);
    expect(engine.score, 75);
    expect(engine.pickupsCollected, 1);
  });
}
