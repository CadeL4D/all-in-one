import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:all_in_one/src/apps/sanctuary/sanctuary_app.dart';
import 'package:all_in_one/src/apps/sanctuary/sanctuary_engine.dart';
import 'package:all_in_one/src/apps/sanctuary/sanctuary_models.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test('new settlement creates a deterministic 64x64 autonomous world', () {
    final SanctuaryEngine first = SanctuaryEngine(seed: 42);
    final SanctuaryEngine second = SanctuaryEngine(seed: 42);

    expect(first.mapSize, 64);
    expect(first.citizens, hasLength(12));
    expect(first.hearth.kind, BuildingKind.hearth);
    expect(first.hearth.hp, 2500);
    expect(
      first.terrainAt(const GridPoint(18, 18)),
      second.terrainAt(const GridPoint(18, 18)),
    );
    expect(first.isRevealed(first.hearthTile), isTrue);
    expect(first.directives.values.reduce((int a, int b) => a + b), 100);
  });

  test('phase loop reaches night, creates pressure, and resolves dawn', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 7,
      config: const SanctuaryConfig(
        mapSize: 16,
        daySeconds: 0.2,
        duskSeconds: 0.2,
        nightSeconds: 0.5,
        dawnSeconds: 0.2,
      ),
    );

    _advance(engine, 0.25);
    expect(engine.phase, SanctuaryPhase.dusk);
    _advance(engine, 0.25);
    expect(engine.phase, SanctuaryPhase.night);
    expect(engine.activeThreat, greaterThan(0));
    _advance(engine, 0.55);
    expect(engine.phase, SanctuaryPhase.dawn);
    _advance(engine, 0.25);
    expect(engine.phase, SanctuaryPhase.day);
    expect(engine.day, 2);
  });

  test('builders finish queued blueprints without citizen micromanagement', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 3,
      config: const SanctuaryConfig(mapSize: 16, daySeconds: 20),
    );
    final GridPoint tile = GridPoint(
      engine.hearthTile.x,
      engine.hearthTile.y + 3,
    );
    final PlacementResult result = engine.placeBuilding(
      BuildingKind.palisade,
      tile,
    );
    expect(result.success, isTrue);
    expect(result.building!.complete, isFalse);

    engine.setDirectives(<CitizenRole, int>{
      CitizenRole.harvester: 0,
      CitizenRole.builder: 100,
      CitizenRole.hauler: 0,
      CitizenRole.acolyte: 0,
    });
    _advance(engine, 1.2);

    expect(result.building!.complete, isTrue);
    expect(
      engine.citizens.every(
        (SanctuaryCitizen citizen) => citizen.role == CitizenRole.builder,
      ),
      isTrue,
    );
  });

  test('anti-blocking rejects the final wall around a swarm entrance', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 1,
      config: const SanctuaryConfig(mapSize: 16, daySeconds: 20),
    );
    engine.resources.timber = 500;
    final GridPoint spawn = GridPoint(engine.mapSize ~/ 2, 2);
    final List<GridPoint> neighbors = <GridPoint>[
      GridPoint(spawn.x, spawn.y - 1),
      GridPoint(spawn.x + 1, spawn.y),
      GridPoint(spawn.x, spawn.y + 1),
      GridPoint(spawn.x - 1, spawn.y),
    ];
    final List<GridPoint> buildable = <GridPoint>[];
    for (final GridPoint tile in neighbors) {
      final TerrainKind terrain = engine.terrainAt(tile);
      if (terrain == TerrainKind.forest || terrain == TerrainKind.granite) {
        engine.clearTerrain(tile);
      }
      if (engine.terrainAt(tile) == TerrainKind.grass ||
          engine.terrainAt(tile) == TerrainKind.holyGround) {
        buildable.add(tile);
      }
    }
    expect(buildable, hasLength(4));
    for (final GridPoint tile in buildable.take(3)) {
      expect(engine.placeBuilding(BuildingKind.palisade, tile).success, isTrue);
    }

    final PlacementResult sealed = engine.placeBuilding(
      BuildingKind.palisade,
      buildable.last,
    );
    expect(sealed.failure, PlacementFailure.blocksAllPaths);
  });

  test('divine powers spend mana and damage nearby abyssals', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 9,
      config: const SanctuaryConfig(mapSize: 16),
    );
    final GridPoint target = GridPoint(
      engine.hearthTile.x,
      engine.hearthTile.y - 3,
    );
    final SanctuaryEnemy crawler = SanctuaryEnemy(
      id: 1,
      kind: EnemyKind.crawler,
      x: target.x + 0.5,
      y: target.y + 0.5,
      hp: 300,
    );
    engine.enemies.add(crawler);
    final double manaBefore = engine.resources.mana;

    expect(engine.castPower(GodPower.lightning, target), isTrue);
    expect(engine.resources.mana, manaBefore - 15);
    expect(crawler.hp, 150);
    expect(crawler.slowTime, 1.5);
  });

  test('save data restores the exact settlement economy and world state', () {
    final SanctuaryEngine original = SanctuaryEngine(
      seed: 21,
      config: const SanctuaryConfig(mapSize: 16),
    );
    original.resources
      ..timber = 234
      ..mana = 111;
    final GridPoint tile = GridPoint(
      original.hearthTile.x + 3,
      original.hearthTile.y,
    );
    original.placeBuilding(BuildingKind.cottage, tile);
    original.purifyFog(const GridPoint(0, 0));

    final SanctuaryEngine restored = SanctuaryEngine.fromJson(
      jsonDecode(jsonEncode(original.toJson())) as Map<String, dynamic>,
      config: const SanctuaryConfig(mapSize: 16),
    );

    expect(restored.seed, original.seed);
    expect(restored.resources.timber, original.resources.timber);
    expect(restored.resources.mana, original.resources.mana);
    expect(restored.buildings.length, original.buildings.length);
    expect(restored.citizens.length, original.citizens.length);
    expect(restored.buildingAt(tile)?.kind, BuildingKind.cottage);
  });

  test('refineries create advanced materials and storage prevents runaway stockpiles', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 27,
      config: const SanctuaryConfig(mapSize: 16, daySeconds: 20),
    );
    engine.resources
      ..timber = 1000
      ..stone = 1000;
    final GridPoint sawTile = GridPoint(
      engine.hearthTile.x + 3,
      engine.hearthTile.y,
    );
    final GridPoint masonryTile = GridPoint(
      engine.hearthTile.x - 3,
      engine.hearthTile.y,
    );
    final SanctuaryBuilding sawmill = engine
        .placeBuilding(BuildingKind.sawmill, sawTile)
        .building!;
    final SanctuaryBuilding masonry = engine
        .placeBuilding(BuildingKind.masonryYard, masonryTile)
        .building!;
    sawmill.buildProgress = sawmill.kind.buildWork;
    masonry.buildProgress = masonry.kind.buildWork;

    _advance(engine, 1);

    expect(engine.resources.planks, greaterThan(0));
    expect(engine.resources.masonry, greaterThan(0));
    expect(engine.resources.timber, lessThanOrEqualTo(engine.storageCapacity));
    expect(engine.resources.stone, lessThanOrEqualTo(engine.storageCapacity));
  });

  test('ancestral upgrades spend shards and survive save restoration', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 31,
      config: const SanctuaryConfig(mapSize: 16),
    )..ancestralShards = 10;

    expect(engine.purchaseUpgrade(AncestralUpgrade.divineMight), isTrue);
    expect(engine.upgrades[AncestralUpgrade.divineMight], 1);
    expect(engine.ancestralShards, 8);

    final SanctuaryEngine restored = SanctuaryEngine.fromJson(
      jsonDecode(jsonEncode(engine.toJson())) as Map<String, dynamic>,
      config: const SanctuaryConfig(mapSize: 16),
    );
    expect(restored.upgrades[AncestralUpgrade.divineMight], 1);
    expect(restored.ancestralShards, 8);
  });

  testWidgets('front page starts a responsive playable settlement', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(375, 812);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: SanctuaryApp()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('SANCTUARY & CINDER'), findsOneWidget);
    expect(find.text('Autonomous settlement'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey<String>('sanctuary-new')));
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(InteractiveViewer), findsOneWidget);
    expect(
      find.byKey(const ValueKey<String>('sanctuary-build-palisade')),
      findsOneWidget,
    );
    expect(find.text('BUILD'), findsOneWidget);
    expect(find.text('HEARTH'), findsOneWidget);
    expect(find.text('POWERS'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('autosave appears as a resumable settlement', (
    WidgetTester tester,
  ) async {
    final SanctuaryEngine saved = SanctuaryEngine(
      seed: 33,
      config: const SanctuaryConfig(mapSize: 16),
    )..day = 6;
    SharedPreferences.setMockInitialValues(<String, Object>{
      'sanctuary_cinder_v1': jsonEncode(saved.toJson()),
    });
    tester.view.physicalSize = const Size(375, 812);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: SanctuaryApp()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Day 6 · DAY'), findsOneWidget);
    expect(
      find.byKey(const ValueKey<String>('sanctuary-resume')),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
}

void _advance(SanctuaryEngine engine, double seconds) {
  double elapsed = 0;
  while (elapsed < seconds) {
    engine.tick(0.05);
    elapsed += 0.05;
  }
}
