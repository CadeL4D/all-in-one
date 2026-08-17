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
    expect(find.text('Compact'), findsOneWidget);
    expect(find.text('Sedan'), findsOneWidget);
    expect(find.text('Van'), findsOneWidget);
    await tester.tap(find.text('Van'));
    await tester.pumpAndSettle();
    expect(
      find.text('Heavy braking and limited rear visibility—trust the sonar.'),
      findsOneWidget,
    );
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
    final Finder hud = find.byKey(const ValueKey<String>('parking-hud-bar'));
    final Finder cameraScene = find.byKey(
      const ValueKey<String>('parking-camera-scene'),
    );
    expect(tester.getSize(hud).height, 44);
    expect(
      tester.getBottomLeft(hud).dy,
      lessThanOrEqualTo(tester.getTopLeft(cameraScene).dy),
    );
    expect(
      find.byKey(const ValueKey<String>('parking-coach-pop')),
      findsOneWidget,
    );
    expect(
      find.text('Pull forward, line up, then brake inside the green bay.'),
      findsNothing,
    );
    expect(tester.takeException(), isNull);

    await tester.tap(find.byTooltip('Pause game'));
    await tester.pumpAndSettle();
    expect(find.text('Parked for a moment'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('the procedural rotation guarantees every parking family', () {
    for (final ParkingDifficulty difficulty in ParkingDifficulty.values) {
      final ParkingEngine engine = ParkingEngine(
        seed: 99,
        difficulty: difficulty,
      );
      final Set<ParkingScenarioKind> kinds = <ParkingScenarioKind>{};
      for (int index = 0; index < ParkingScenarioKind.values.length; index++) {
        kinds.add(engine.scenario.kind);
        engine.isParked = true;
        engine.nextScenario();
      }
      expect(kinds, containsAll(ParkingScenarioKind.values));
    }
  });

  test('every layout accepts every vehicle when precisely aligned', () {
    for (final ParkingVehicleType vehicle in ParkingVehicleType.values) {
      for (final ParkingDifficulty difficulty in ParkingDifficulty.values) {
        final ParkingEngine engine = ParkingEngine(
          seed: 31,
          difficulty: difficulty,
          vehicleType: vehicle,
        );
        for (
          int scenarioIndex = 0;
          scenarioIndex < ParkingScenarioKind.values.length;
          scenarioIndex++
        ) {
          engine
            ..carPosition = engine.scenario.target.center
            ..carAngle = engine.scenario.targetAngle
            ..speed = 0;
          for (int index = 0; index < 45; index++) {
            engine.tick(0.02);
          }
          expect(
            engine.isParked,
            isTrue,
            reason:
                '${vehicle.name} could not complete '
                '${engine.scenario.kind.name} on ${difficulty.name}',
          );
          engine.nextScenario();
        }
      }
    }
  });

  test('procedural modifiers include moving and environmental hazards', () {
    final ParkingEngine engine = ParkingEngine(
      seed: 99,
      difficulty: ParkingDifficulty.hard,
    );
    final Set<ParkingObstacleKind> hazards = <ParkingObstacleKind>{};
    bool foundTerribleParker = false;
    for (int index = 0; index < 28; index++) {
      hazards.addAll(
        engine.scenario.obstacles.map(
          (ParkingObstacle obstacle) => obstacle.kind,
        ),
      );
      foundTerribleParker |= engine.scenario.modifierLabel == 'Terrible parker';
      engine.isParked = true;
      engine.nextScenario();
    }
    expect(
      hazards,
      containsAll(<ParkingObstacleKind>[
        ParkingObstacleKind.pillar,
        ParkingObstacleKind.shoppingCart,
        ParkingObstacleKind.pedestrian,
        ParkingObstacleKind.curb,
        ParkingObstacleKind.wheelStop,
        ParkingObstacleKind.wall,
        ParkingObstacleKind.mirror,
      ]),
    );
    expect(foundTerribleParker, isTrue);
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

    final ParkingEngine pickupEngine = ParkingEngine(seed: 17);
    final ParkingPickup pickup = pickupEngine.scenario.pickups.first;
    pickupEngine
      ..carPosition = pickup.center
      ..speed = 0;
    pickupEngine.tick(0.02);
    expect(pickup.collected, isTrue);
    expect(pickupEngine.score, 75);
    expect(pickupEngine.pickupsCollected, 1);
  });

  test('vehicle profiles change dimensions and handling', () {
    final ParkingEngine compact = ParkingEngine(
      seed: 5,
      vehicleType: ParkingVehicleType.compact,
    );
    final ParkingEngine sedan = ParkingEngine(
      seed: 5,
      vehicleType: ParkingVehicleType.sedan,
    );
    final ParkingEngine van = ParkingEngine(
      seed: 5,
      vehicleType: ParkingVehicleType.deliveryVan,
    );

    expect(sedan.activeCarLength, greaterThan(compact.activeCarLength));
    expect(van.activeCarLength, greaterThan(sedan.activeCarLength));
    compact.setThrottle(true);
    van.setThrottle(true);
    for (int index = 0; index < 20; index++) {
      compact.tick(0.02);
      van.tick(0.02);
    }
    expect(compact.speed, greaterThan(van.speed));
    expect(
      compact.vehicleProfile.steeringResponse,
      greaterThan(van.vehicleProfile.steeringResponse),
    );
  });

  test('perfect smooth parks multiply score and add valet time', () {
    final ParkingEngine engine = ParkingEngine(seed: 11);
    engine
      ..carPosition = engine.scenario.target.center
      ..carAngle = engine.scenario.targetAngle
      ..speed = 0;

    for (int index = 0; index < 45; index++) {
      engine.tick(0.02);
    }

    expect(engine.lastPrecision, ParkingPrecision.perfect);
    expect(engine.lastSmoothPark, isTrue);
    expect(engine.lastTimeChange, 7);
    expect(engine.timeRemaining, greaterThan(30));
    expect(engine.lastAward, greaterThan(900));
  });

  test('using reverse forfeits the smooth-park multiplier', () {
    final ParkingEngine engine = ParkingEngine(seed: 11)..speed = -0.02;
    engine.tick(0.02);
    engine
      ..carPosition = engine.scenario.target.center
      ..carAngle = engine.scenario.targetAngle
      ..speed = 0;
    for (int index = 0; index < 45; index++) {
      engine.tick(0.02);
    }

    expect(engine.usedReverse, isTrue);
    expect(engine.lastSmoothPark, isFalse);
  });

  test('crooked parks trade score and time for a completed space', () {
    final ParkingEngine engine = ParkingEngine(seed: 11);
    engine
      ..carPosition = engine.scenario.target.center
      ..carAngle = engine.scenario.targetAngle + 0.24
      ..speed = 0;

    for (int index = 0; index < 45; index++) {
      engine.tick(0.02);
    }

    expect(engine.isParked, isTrue);
    expect(engine.lastPrecision, ParkingPrecision.crooked);
    expect(engine.lastTimeChange, -3);
  });

  test('the valet run expires and emits a terminal event', () {
    final ParkingEngine engine = ParkingEngine(seed: 3)..timeRemaining = 0.01;
    engine.tick(0.02);

    expect(engine.isGameOver, isTrue);
    expect(engine.timeRemaining, 0);
    expect(
      engine.drainEvents().map((ParkingEvent event) => event.kind),
      contains(ParkingEventKind.timeExpired),
    );
  });

  test('proximity sonar escalates near adjacent vehicles', () {
    final ParkingEngine engine = ParkingEngine(seed: 3);
    expect(engine.sonarLevel, ParkingSonarLevel.clear);
    engine.carPosition =
        engine.scenario.parkedCars.first.center + const Offset(0.09, 0);
    expect(engine.sonarLevel, ParkingSonarLevel.red);
  });
}
