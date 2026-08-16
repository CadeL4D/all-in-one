import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:all_in_one/src/apps/apps_registry.dart';
import 'package:all_in_one/src/apps/tetherloom/tetherloom_app.dart';
import 'package:all_in_one/src/apps/tetherloom/tetherloom_engine.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test('procedural rows always contain a safe pattern target', () {
    final TetherloomEngine engine = TetherloomEngine(seed: 42);
    engine.objects.clear();
    engine.distance = 2000;

    for (int index = 0; index < 250; index++) {
      final int expected = engine.expectedColor;
      final List<LoomObject> row = engine.spawnProceduralRow();
      final Iterable<LoomObject> targetLaneObjects = row.where(
        (LoomObject object) =>
            object.kind == LoomObjectKind.prism ||
            (object.kind == LoomObjectKind.stitch &&
                object.colorIndex == expected),
      );

      expect(targetLaneObjects, isNotEmpty);
      expect(
        row.where((LoomObject object) => object.kind == LoomObjectKind.snag),
        hasLength(lessThan(TetherloomEngine.lanes.length)),
      );
      for (final LoomObject target in targetLaneObjects) {
        expect(
          row.any(
            (LoomObject object) =>
                object.lane == target.lane &&
                object.kind == LoomObjectKind.snag,
          ),
          isFalse,
        );
      }
    }
  });

  test('correct stitches advance the pattern and reward mastery', () {
    final TetherloomEngine engine = TetherloomEngine(seed: 7);
    engine.objects.clear();
    final int expected = engine.expectedColor;
    engine.objects.add(
      LoomObject(
        id: 999,
        row: 1,
        lane: 1,
        kind: LoomObjectKind.stitch,
        x: engine.playerX,
        y: TetherloomEngine.playerY,
        radius: 0.03,
        colorIndex: expected,
      ),
    );

    engine.tick(0.01);

    expect(engine.stitches, 1);
    expect(engine.combo, 1);
    expect(engine.score, greaterThan(40));
    expect(
      engine.drainEvents().map((LoomEvent event) => event.kind),
      contains(LoomEventKind.correct),
    );
  });

  test('queued pattern targets stay valid after the pattern changes', () {
    final TetherloomEngine engine = TetherloomEngine(seed: 17);
    engine.objects.clear();
    final List<LoomObject> currentRow = engine.spawnProceduralRow(
      y: TetherloomEngine.playerY,
    );
    engine.spawnProceduralRow(y: 0.2);
    final LoomObject currentTarget = currentRow.singleWhere(
      (LoomObject object) => object.patternTarget,
    );
    engine.playerX = currentTarget.x;
    engine.targetX = currentTarget.x;

    engine.tick(0.01);

    final List<LoomObject> queuedTargets = engine.objects
        .where(
          (LoomObject object) =>
              object.patternTarget && object.kind == LoomObjectKind.stitch,
        )
        .toList();
    expect(queuedTargets, isNotEmpty);
    expect(
      queuedTargets.every(
        (LoomObject object) => object.colorIndex == engine.expectedColor,
      ),
      isTrue,
    );
  });

  test('a snag costs one thread and briefly eases the pace', () {
    final TetherloomEngine engine = TetherloomEngine(seed: 11);
    engine.objects.clear();
    engine.objects.add(
      LoomObject(
        id: 1000,
        row: 1,
        lane: 1,
        kind: LoomObjectKind.snag,
        x: engine.playerX,
        y: TetherloomEngine.playerY,
        radius: 0.034,
      ),
    );

    engine.tick(0.01);

    expect(engine.lives, TetherloomEngine.maxLives - 1);
    expect(engine.recoveryFor, greaterThan(2));
    expect(
      engine.drainEvents().map((LoomEvent event) => event.kind),
      contains(LoomEventKind.hit),
    );
  });

  testWidgets('Tetherloom starts and pauses cleanly', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    expect(AppRegistry.byId('tetherloom').name, 'Tetherloom');
    await tester.pumpWidget(const MaterialApp(home: TetherloomApp()));
    await tester.pumpAndSettle();

    expect(find.text('TETHERLOOM'), findsOneWidget);
    expect(find.text('Start weaving'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey<String>('tetherloom-play')));
    await tester.pump(const Duration(milliseconds: 32));

    expect(find.text('MATCH'), findsOneWidget);
    expect(find.byTooltip('Pause game'), findsOneWidget);
    await tester.tap(find.byTooltip('Pause game'));
    await tester.pumpAndSettle();

    expect(find.text('Loom paused'), findsOneWidget);
    expect(find.text('Resume'), findsOneWidget);
  });

  testWidgets('Tetherloom pauses when the app leaves the foreground', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(() {
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    });

    await tester.pumpWidget(const MaterialApp(home: TetherloomApp()));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey<String>('tetherloom-play')));
    await tester.pump(const Duration(milliseconds: 32));

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    await tester.pump();

    expect(find.text('Loom paused'), findsOneWidget);
    expect(
      find.text('Paused while the app was in the background.'),
      findsOneWidget,
    );
  });
}
