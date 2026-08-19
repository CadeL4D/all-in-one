import 'dart:convert';
import 'dart:math';

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

  test('a new day brings a living-world encounter with a real tradeoff', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 44,
      config: const SanctuaryConfig(
        mapSize: 16,
        daySeconds: 0.1,
        duskSeconds: 0.1,
        nightSeconds: 0.1,
        dawnSeconds: 0.1,
      ),
    );

    _advance(engine, 0.5);
    expect(engine.day, 2);
    expect(engine.encounter, isNotNull);
    final double moraleBefore = engine.morale;
    expect(engine.resolveEncounter(compassionate: false), isTrue);
    expect(engine.encounter, isNull);
    expect(engine.morale, lessThan(moraleBefore));
  });

  test('night oaths reward a clean defense and persist in the save', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 52,
      config: const SanctuaryConfig(
        mapSize: 16,
        daySeconds: 0.1,
        duskSeconds: 0.1,
        nightSeconds: 0.5,
        dawnSeconds: 0.1,
      ),
    );
    _advance(engine, 0.25);
    expect(engine.phase, SanctuaryPhase.night);
    engine
      ..nightOath = NightOath.holdTheLine
      ..buildingsLostTonight = 0;
    final int shardsBefore = engine.ancestralShards;

    _advance(engine, 0.55);
    expect(engine.phase, SanctuaryPhase.dawn);
    expect(engine.ancestralShards, shardsBefore + 1);

    final SanctuaryEngine restored = SanctuaryEngine.fromJson(
      jsonDecode(jsonEncode(engine.toJson())) as Map<String, dynamic>,
      config: const SanctuaryConfig(mapSize: 16),
    );
    expect(restored.morale, engine.morale);
    expect(restored.nightOath, NightOath.holdTheLine);
  });

  test('dusk telegraph is deterministic and restricts spawns to its lanes', () {
    const SanctuaryConfig config = SanctuaryConfig(
      mapSize: 16,
      daySeconds: 0.2,
      duskSeconds: 0.2,
      nightSeconds: 5,
      dawnSeconds: 0.2,
    );
    final SanctuaryEngine first = SanctuaryEngine(seed: 77, config: config);
    final SanctuaryEngine second = SanctuaryEngine(seed: 77, config: config);

    _advance(first, 0.25);
    expect(first.phase, SanctuaryPhase.dusk);
    expect(first.pendingEnemies, greaterThan(0));
    expect(first.waveLanes.length, inInclusiveRange(2, 3));
    expect(first.waveComposition, isNotEmpty);

    _advance(second, 0.25);
    expect(second.waveLanes, first.waveLanes);
    expect(second.waveComposition, first.waveComposition);
    expect(second.waveModifier, first.waveModifier);

    _advance(first, 0.25);
    expect(first.phase, SanctuaryPhase.night);
    _advance(first, 0.5);
    expect(first.enemies, isNotEmpty);
    for (final SanctuaryEnemy enemy in first.enemies) {
      final bool nearLane = first.waveLanes.any(
        (GridPoint lane) =>
            (enemy.x - lane.x).abs() + (enemy.y - lane.y).abs() <= 3,
      );
      expect(nearLane, isTrue, reason: 'enemy spawned off a telegraphed lane');
    }
  });

  test('armored wave modifier toughens every spawned abyssal', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 5,
      config: const SanctuaryConfig(
        mapSize: 16,
        daySeconds: 0.2,
        duskSeconds: 0.2,
        nightSeconds: 5,
        dawnSeconds: 0.2,
      ),
    );
    _advance(engine, 0.25);
    engine.waveModifier = WaveModifier.armored;
    _advance(engine, 0.25);
    expect(engine.phase, SanctuaryPhase.night);
    _advance(engine, 0.6);
    expect(engine.enemies, isNotEmpty);
    for (final SanctuaryEnemy enemy in engine.enemies) {
      expect(enemy.maxHp, greaterThan(enemy.kind.maxHp));
    }
  });

  test('tower stances redirect fire between weak and strong targets', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 12,
      config: const SanctuaryConfig(mapSize: 16, daySeconds: 20),
    );
    final GridPoint tile = GridPoint(
      engine.hearthTile.x + 3,
      engine.hearthTile.y,
    );
    final SanctuaryBuilding tower = engine
        .placeBuilding(BuildingKind.arrowTower, tile)
        .building!;
    tower.buildProgress = tower.kind.buildWork;
    engine.setStance(tile, TowerStance.strongest);

    final SanctuaryEnemy crawler = SanctuaryEnemy(
      id: 1,
      kind: EnemyKind.crawler,
      x: tile.x + 0.5,
      y: tile.y + 3.5,
    );
    final SanctuaryEnemy brute = SanctuaryEnemy(
      id: 2,
      kind: EnemyKind.brute,
      x: tile.x + 0.5,
      y: tile.y - 4.5,
    );
    engine.enemies.addAll(<SanctuaryEnemy>[crawler, brute]);
    engine.phase = SanctuaryPhase.night;
    engine.phaseRemaining = 60;

    engine.tick(0.15);
    expect(brute.hp, lessThan(brute.maxHp));
    expect(crawler.hp, crawler.maxHp);

    tower.cooldown = 0;
    engine.setStance(tile, TowerStance.nearest);
    engine.tick(0.15);
    expect(crawler.hp, lessThan(crawler.maxHp));
  });

  test('emergency repair spends timber at 25 hp per log, day or night', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 14,
      config: const SanctuaryConfig(mapSize: 16, daySeconds: 20),
    );
    final GridPoint tile = GridPoint(
      engine.hearthTile.x + 3,
      engine.hearthTile.y,
    );
    final SanctuaryBuilding wall = engine
        .placeBuilding(BuildingKind.palisade, tile)
        .building!;
    wall.buildProgress = wall.kind.buildWork;
    wall.hp = wall.kind.maxHp - 200;
    engine.resources.timber = 3;

    final double healed = engine.repairBuilding(tile);
    expect(healed, 75);
    expect(wall.hp, wall.kind.maxHp - 125);
    expect(engine.resources.timber, 0);

    engine.phase = SanctuaryPhase.night;
    wall.hp = 50;
    engine.resources.timber = 100;
    expect(engine.repairBuilding(tile), greaterThan(0));
  });

  test('dismantling refunds half the materials but never at night', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 15,
      config: const SanctuaryConfig(mapSize: 16, daySeconds: 20),
    );
    engine.resources.timber = 100;
    final GridPoint tile = GridPoint(
      engine.hearthTile.x + 3,
      engine.hearthTile.y,
    );
    expect(engine.placeBuilding(BuildingKind.cottage, tile).success, isTrue);
    final double spent = 100 - engine.resources.timber;

    engine.phase = SanctuaryPhase.night;
    expect(engine.dismantleBuilding(tile), isFalse);
    engine.phase = SanctuaryPhase.day;
    expect(engine.dismantleBuilding(tile), isTrue);
    expect(engine.buildingAt(tile), isNull);
    expect(engine.resources.timber, closeTo(100 - spent / 2, 0.01));
    expect(engine.dismantleBuilding(engine.hearthTile), isFalse);
  });

  test('muster rouses builders during the night and obeys its cooldown', () {
    const SanctuaryConfig config = SanctuaryConfig(
      mapSize: 16,
      daySeconds: 20,
      nightSeconds: 30,
    );
    final SanctuaryEngine idle = SanctuaryEngine(seed: 19, config: config);
    final SanctuaryEngine mustered = SanctuaryEngine(seed: 19, config: config);
    final GridPoint tile = GridPoint(
      idle.hearthTile.x + 3,
      idle.hearthTile.y,
    );
    final SanctuaryBuilding firstWall = idle
        .placeBuilding(BuildingKind.palisade, tile)
        .building!;
    final SanctuaryBuilding secondWall = mustered
        .placeBuilding(BuildingKind.palisade, tile)
        .building!;
    for (final SanctuaryEngine engine in <SanctuaryEngine>[idle, mustered]) {
      engine.phase = SanctuaryPhase.night;
      engine.phaseRemaining = 30;
    }

    expect(mustered.activateMuster(), isTrue);
    expect(mustered.activateMuster(), isFalse);
    _advance(idle, 0.5);
    _advance(mustered, 0.5);
    expect(firstWall.buildProgress, 0);
    expect(secondWall.buildProgress, greaterThan(0));
    expect(mustered.musterCooldown, greaterThan(0));
  });

  test('placement economics: forests feed sawmills, holy ground doubles shrines', () {
    final SanctuaryEngine engine = SanctuaryEngine(seed: 23);
    final GridPoint hearthTile = engine.hearthTile;

    final GridPoint isolatedTile = GridPoint(
      hearthTile.x + 3,
      hearthTile.y,
    );
    final SanctuaryBuilding isolated = engine
        .placeBuilding(BuildingKind.sawmill, isolatedTile)
        .building!;
    expect(engine.efficiencyOf(isolated), 1.0);

    GridPoint? forestNeighbor;
    GridPoint? forestTile;
    for (int dy = -12; dy <= 12 && forestTile == null; dy++) {
      for (int dx = -12; dx <= 12; dx++) {
        final GridPoint tile = GridPoint(
          hearthTile.x + dx,
          hearthTile.y + dy,
        );
        if (engine.terrainAt(tile) != TerrainKind.forest ||
            !engine.isRevealed(tile)) {
          continue;
        }
        for (final GridPoint neighbor in <GridPoint>[
          GridPoint(tile.x + 1, tile.y),
          GridPoint(tile.x - 1, tile.y),
          GridPoint(tile.x, tile.y + 1),
          GridPoint(tile.x, tile.y - 1),
        ]) {
          if (engine.terrainAt(neighbor) == TerrainKind.grass &&
              engine.isRevealed(neighbor)) {
            forestNeighbor = neighbor;
            forestTile = tile;
            break;
          }
        }
      }
    }
    expect(forestNeighbor, isNotNull, reason: 'seed 23 should offer forest');
    final SanctuaryBuilding fed = engine
        .placeBuilding(BuildingKind.sawmill, forestNeighbor!)
        .building!;
    expect(engine.efficiencyOf(fed), greaterThan(1));
    expect(engine.efficiencyOf(fed), lessThanOrEqualTo(1.6));

    final GridPoint holyTile = GridPoint(
      hearthTile.x - 9,
      hearthTile.y - 7,
    );
    expect(engine.purifyFog(const GridPoint(24, 25)), isTrue);
    expect(engine.isRevealed(holyTile), isTrue);
    final SanctuaryBuilding shrine = engine
        .placeBuilding(BuildingKind.shrine, holyTile)
        .building!;
    expect(engine.efficiencyOf(shrine), 2.0);
  });

  test('milestone nights open every rift and seal shards at dawn', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 31,
      config: const SanctuaryConfig(
        mapSize: 16,
        daySeconds: 0.1,
        duskSeconds: 0.1,
        nightSeconds: 0.1,
        dawnSeconds: 0.1,
      ),
    );
    while (engine.day < 10) {
      engine.tick(0.05);
    }
    while (engine.phase != SanctuaryPhase.dusk) {
      engine.tick(0.05);
    }
    expect(engine.isMilestoneNight, isTrue);
    expect(engine.waveLanes.length, 4);
    expect(engine.waveComposition[EnemyKind.devourer], 1);
    final int shardsBefore = engine.ancestralShards;

    while (engine.phase == SanctuaryPhase.dusk ||
        engine.phase == SanctuaryPhase.night) {
      engine.tick(0.05);
    }
    expect(engine.milestonesSealed, 1);
    expect(engine.ancestralShards, greaterThanOrEqualTo(shardsBefore + 3));
  });

  test('a fallen settlement records a complete run summary', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 40,
      config: const SanctuaryConfig(mapSize: 16, daySeconds: 20),
    );
    engine.phase = SanctuaryPhase.night;
    engine.phaseRemaining = 30;
    engine.hearth.hp = 1;
    engine.enemies.add(
      SanctuaryEnemy(
        id: 1,
        kind: EnemyKind.crawler,
        x: engine.hearthTile.x + 0.5,
        y: engine.hearthTile.y + 0.5,
      ),
    );

    _advance(engine, 0.3);
    expect(engine.phase, SanctuaryPhase.fallen);
    expect(engine.ancestralShards, greaterThan(0));

    final Map<String, dynamic> summary = engine.runSummary();
    expect(summary['night'], engine.day);
    expect(summary.containsKey('totalEnemiesDefeated'), isTrue);
    expect(summary.containsKey('oathsFulfilled'), isTrue);
    expect(summary.containsKey('peakPopulation'), isTrue);
    expect(summary.containsKey('milestonesSealed'), isTrue);
  });

  test('version-2 saves migrate with sane defaults', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 51,
      config: const SanctuaryConfig(mapSize: 16),
    );
    final GridPoint tile = GridPoint(
      engine.hearthTile.x + 3,
      engine.hearthTile.y,
    );
    final SanctuaryBuilding tower = engine
        .placeBuilding(BuildingKind.arrowTower, tile)
        .building!;
    tower.buildProgress = tower.kind.buildWork;

    final Map<String, dynamic> legacy = engine.toJson();
    legacy['version'] = 2;
    legacy
      ..remove('waveModifier')
      ..remove('waveLanes')
      ..remove('waveComposition')
      ..remove('oathsFulfilled')
      ..remove('mercifulChoices')
      ..remove('pragmaticChoices')
      ..remove('milestonesSealed')
      ..remove('peakPopulation')
      ..remove('musterCooldown');
    for (final Map<String, dynamic> building
        in (legacy['buildings'] as List<dynamic>).cast<Map<String, dynamic>>()) {
      building.remove('stance');
    }
    for (final Map<String, dynamic> enemy
        in (legacy['enemies'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ??
            <Map<String, dynamic>>[]) {
      enemy.remove('maxHp');
    }

    final SanctuaryEngine restored = SanctuaryEngine.fromJson(
      legacy,
      config: const SanctuaryConfig(mapSize: 16),
    );
    expect(restored.buildings.length, engine.buildings.length);
    expect(restored.waveModifier, WaveModifier.none);
    expect(restored.waveLanes, isEmpty);
    expect(restored.oathsFulfilled, 0);
    expect(restored.buildingAt(tile)?.stance, TowerStance.nearest);
    expect(restored.buildingAt(tile)?.isTower, isTrue);
  });

  test('combat effects stay bounded under sustained fire', () {
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: 60,
      config: const SanctuaryConfig(mapSize: 16),
    );
    engine.effects.addAll(
      List<SanctuaryEffect>.generate(
        200,
        (int index) => SanctuaryEffect(
          kind: 'dmg',
          x: 8,
          y: 8,
          text: '$index',
        ),
      ),
    );
    engine.tick(0.02);
    expect(engine.effects.length, lessThanOrEqualTo(SanctuaryEngine.effectsCap));
  });

  test('night 10 soak with 180 enemies and 100 structures stays fast', () {
    final SanctuaryEngine engine = SanctuaryEngine(seed: 88);
    engine
      ..day = 10
      ..phase = SanctuaryPhase.night
      ..phaseRemaining = 60;
    engine.resources
      ..timber = 5000
      ..stone = 5000
      ..iron = 500;
    int built = 0;
    int towers = 0;
    outer:
    for (int radius = 4; radius <= 11 && built < 100; radius++) {
      for (int dx = -radius; dx <= radius && built < 100; dx++) {
        for (int dy = -radius; dy <= radius && built < 100; dy++) {
          if (dx.abs() != radius && dy.abs() != radius) {
            continue;
          }
          final GridPoint tile = GridPoint(
            engine.hearthTile.x + dx,
            engine.hearthTile.y + dy,
          );
          if (engine.terrainAt(tile) == TerrainKind.forest ||
              engine.terrainAt(tile) == TerrainKind.granite) {
            engine.clearTerrain(tile);
          }
          final BuildingKind kind = built % 9 == 0
              ? BuildingKind.arrowTower
              : built % 13 == 0
              ? BuildingKind.ballista
              : BuildingKind.palisade;
          final PlacementResult result = engine.placeBuilding(kind, tile);
          if (result.success) {
            if (kind != BuildingKind.palisade) {
              result.building!.buildProgress = kind.buildWork;
              towers++;
            }
            built++;
          }
          if (built >= 100) {
            break outer;
          }
        }
      }
    }
    expect(built, greaterThanOrEqualTo(90));
    expect(towers, greaterThan(0));
    for (int index = 0; index < 180; index++) {
      final double angle = index * 0.2094;
      final double distance = 8 + (index % 5);
      engine.enemies.add(
        SanctuaryEnemy(
          id: index + 1,
          kind: EnemyKind.values[index % 4],
          x: engine.hearthTile.x + 0.5 + cos(angle) * distance,
          y: engine.hearthTile.y + 0.5 + sin(angle) * distance,
        ),
      );
    }

    final Stopwatch watch = Stopwatch()..start();
    _advance(engine, 5);
    watch.stop();
    expect(engine.totalEnemiesDefeated, greaterThan(0));
    expect(
      watch.elapsedMilliseconds,
      lessThan(2500),
      reason: '5s of worst-case simulation must not stall the frame budget',
    );
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
    expect(find.text('Repair'), findsOneWidget);
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

  testWidgets('living-world choice is usable on a narrow phone', (
    WidgetTester tester,
  ) async {
    final SanctuaryEngine saved = SanctuaryEngine(
      seed: 61,
      config: const SanctuaryConfig(mapSize: 16),
    )..encounter = SanctuaryEncounterKind.woundedStag;
    SharedPreferences.setMockInitialValues(<String, Object>{
      'sanctuary_cinder_v1': jsonEncode(saved.toJson()),
    });
    tester.view.physicalSize = const Size(360, 740);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: SanctuaryApp()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(find.byKey(const ValueKey<String>('sanctuary-resume')));
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('A WHITE STAG AT THE FARMS'), findsOneWidget);
    expect(find.text('Tend its wounds'), findsOneWidget);
    expect(find.text('Fill the granary'), findsOneWidget);
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
