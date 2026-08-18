import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:all_in_one/src/apps/afterimage/afterimage_app.dart';
import 'package:all_in_one/src/apps/afterimage/afterimage_engine.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test('a recorded echo can hold the plate for the next loop', () {
    final AfterimageEngine engine = AfterimageEngine(seed: 4)..start();

    engine.playerPosition = engine.layout.plate;
    engine.tick(0.06);
    engine.requestRewind();
    engine.tick(0.01);
    _finishTransition(engine);
    engine.tick(0.06);

    expect(engine.echoes, hasLength(1));
    expect(engine.plateActive, isTrue);
    expect(engine.guidance, contains('ACT'));
  });

  test('the two-self solution opens the vault and completes a mission', () {
    final AfterimageEngine engine = AfterimageEngine(seed: 8)..start();
    _recordPlateEcho(engine);

    engine.playerPosition = engine.layout.console;
    engine.setAct(true);
    for (int index = 0; index < 38; index++) {
      engine.tick(0.04);
    }
    expect(engine.gateOpen, isTrue);

    engine.playerPosition = engine.layout.core;
    engine.tick(0.04);
    expect(engine.carryingCore, isTrue);

    engine.playerPosition = engine.layout.exit;
    engine.tick(0.04);
    expect(engine.phase, AfterimagePhase.missionComplete);
    expect(engine.score, greaterThan(1000));
  });

  test('old loops are retired so the field never becomes noisy or unfair', () {
    final AfterimageEngine engine = AfterimageEngine(seed: 12)..start();

    for (int index = 0; index < AfterimageEngine.maxEchoes + 2; index++) {
      engine.playerPosition = Offset(40.0 + index * 20, 610);
      engine.tick(0.06);
      engine.requestRewind();
      engine.tick(0.01);
      _finishTransition(engine);
    }

    expect(engine.echoes, hasLength(AfterimageEngine.maxEchoes));
    expect(engine.echoes.first.frames.last.position.dx, closeTo(80, 0.1));
  });

  test('later vaults rotate layouts and raise the pressure', () {
    final AfterimageEngine engine = AfterimageEngine(seed: 22)..start();
    final int firstVariant = engine.layout.variant;
    final double firstDuration = engine.loopDuration;

    engine
      ..phase = AfterimagePhase.missionComplete
      ..nextMission();

    expect(engine.layout.variant, isNot(firstVariant));
    expect(engine.layout.guards, hasLength(2));
    expect(engine.loopDuration, lessThan(firstDuration));
  });

  testWidgets('briefing launches into a full-screen playable control deck', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(375, 812);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: AfterimageApp()));
    await tester.pump();

    expect(
      find.text('Outsmart the room.\nThen outsmart yourself.'),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey<String>('afterimage-start')));
    await tester.pump(const Duration(milliseconds: 50));

    expect(
      find.byKey(const ValueKey<String>('afterimage-stick')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey<String>('afterimage-act')),
      findsOneWidget,
    );
    expect(find.text('PULSE'), findsOneWidget);
    expect(find.text('REWIND'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

void _recordPlateEcho(AfterimageEngine engine) {
  engine.playerPosition = engine.layout.plate;
  engine.tick(0.06);
  engine.requestRewind();
  engine.tick(0.01);
  _finishTransition(engine);
  engine.tick(0.06);
  expect(engine.plateActive, isTrue);
}

void _finishTransition(AfterimageEngine engine) {
  for (int index = 0; index < 20; index++) {
    engine.tick(0.04);
  }
  expect(engine.phase, AfterimagePhase.playing);
}
