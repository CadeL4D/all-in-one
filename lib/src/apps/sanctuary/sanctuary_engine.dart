import 'dart:collection';
import 'dart:math';
import 'dart:typed_data';

import 'sanctuary_models.dart';

enum SanctuaryEventKind {
  phaseChanged,
  construction,
  constructionComplete,
  placementRejected,
  towerShot,
  powerCast,
  impact,
  citizenLost,
  encounterAvailable,
  encounterResolved,
  oathResolved,
  waveForecast,
  milestoneSealed,
  musterCalled,
  buildingRepaired,
  buildingDismantled,
  settlementFallen,
  dawn,
}

class SanctuaryEvent {
  const SanctuaryEvent(this.kind, {this.tile, this.message});

  final SanctuaryEventKind kind;
  final GridPoint? tile;
  final String? message;
}

class SanctuaryConfig {
  const SanctuaryConfig({
    this.mapSize = 64,
    this.daySeconds = 75,
    this.duskSeconds = 10,
    this.nightSeconds = 70,
    this.dawnSeconds = 5,
    this.manaCap = 320,
  });

  final int mapSize;
  final double daySeconds;
  final double duskSeconds;
  final double nightSeconds;
  final double dawnSeconds;
  final double manaCap;
}

class SanctuaryEngine {
  SanctuaryEngine({int? seed, this.config = const SanctuaryConfig()})
    : seed = seed ?? DateTime.now().microsecondsSinceEpoch {
    _random = Random(this.seed);
    _terrain = Uint8List(config.mapSize * config.mapSize);
    _revealed = Uint8List(config.mapSize * config.mapSize);
    _flow = Int32List(config.mapSize * config.mapSize);
    _generateWorld();
    _createSettlement();
    _recomputeFlow();
  }

  static const double fixedStep = 1 / 60;
  static const int saveVersion = 3;
  static const int milestoneInterval = 10;
  static const int effectsCap = 140;

  final int seed;
  final SanctuaryConfig config;
  late final Random _random;
  late Uint8List _terrain;
  late Uint8List _revealed;
  late Int32List _flow;
  final Map<int, SanctuaryBuilding> _buildingsByTile =
      <int, SanctuaryBuilding>{};
  final List<SanctuaryBuilding> buildings = <SanctuaryBuilding>[];
  final List<SanctuaryCitizen> citizens = <SanctuaryCitizen>[];
  final List<SanctuaryEnemy> enemies = <SanctuaryEnemy>[];
  final List<SanctuaryEffect> effects = <SanctuaryEffect>[];
  final List<SanctuaryEvent> _events = <SanctuaryEvent>[];
  final Queue<EnemyKind> _spawnQueue = Queue<EnemyKind>();
  final Map<int, double> fissures = <int, double>{};
  final Map<CitizenRole, int> directives = <CitizenRole, int>{
    CitizenRole.harvester: 40,
    CitizenRole.builder: 20,
    CitizenRole.hauler: 25,
    CitizenRole.acolyte: 15,
  };
  final Map<AncestralUpgrade, int> upgrades = <AncestralUpgrade, int>{
    for (final AncestralUpgrade upgrade in AncestralUpgrade.values) upgrade: 0,
  };
  final Map<String, double> _efficiencyCache = <String, double>{};
  int _efficiencyRevision = -1;
  double _dmgTextCooldown = 0;

  SanctuaryResources resources = SanctuaryResources();
  SanctuaryPhase phase = SanctuaryPhase.day;
  int day = 1;
  int ancestralShards = 0;
  double phaseRemaining = 75;
  double gameSpeed = 1;
  bool paused = false;
  bool rainActive = false;
  double rainRemaining = 0;
  double worldTime = 0;
  double morale = 65;
  SanctuaryEncounterKind? encounter;
  NightOath? nightOath;
  int oathTarget = 0;
  int powersCastTonight = 0;
  int buildingsLostTonight = 0;
  int citizensLostTonight = 0;
  int enemiesDefeatedTonight = 0;
  int totalEnemiesDefeated = 0;
  int oathsFulfilled = 0;
  int mercifulChoices = 0;
  int pragmaticChoices = 0;
  int milestonesSealed = 0;
  int peakPopulation = 12;
  List<GridPoint> waveLanes = <GridPoint>[];
  Map<EnemyKind, int> waveComposition = <EnemyKind, int>{};
  WaveModifier waveModifier = WaveModifier.none;
  double musterTime = 0;
  double musterCooldown = 0;
  bool hearthUnderAttack = false;
  double shake = 0;
  double _accumulator = 0;
  double _citizenAccumulator = 0;
  double _spawnAccumulator = 0;
  double _directiveAccumulator = 0;
  double _defenseAccumulator = 0;
  double _hearthDangerAccumulator = 0;
  double _towerFeedbackCooldown = 0;
  int _nextBuildingId = 1;
  int _nextEnemyId = 1;
  int _nextCitizenId = 1;
  double _eliteMultiplier = 1;
  int _topologyRevision = 0;
  int _cachedPathTile = -1;
  int _cachedPathRevision = -1;
  bool _cachedPathResult = false;

  double get manaCap => config.manaCap;
  bool get isMilestoneNight => day % milestoneInterval == 0;
  bool get musterActive => musterTime > 0;
  bool get musterReady =>
      phase == SanctuaryPhase.night && !musterActive && musterCooldown <= 0;

  int get mapSize => config.mapSize;
  GridPoint get hearthTile => GridPoint(mapSize ~/ 2, mapSize ~/ 2);

  SanctuaryBuilding get hearth => buildings.firstWhere(
    (SanctuaryBuilding building) => building.kind == BuildingKind.hearth,
  );

  int get populationCapacity =>
      12 +
      buildings
              .where(
                (SanctuaryBuilding building) =>
                    building.complete && building.kind == BuildingKind.cottage,
              )
              .length *
          4;

  double get storageCapacity =>
      300.0 *
      (1 +
          buildings
              .where(
                (SanctuaryBuilding building) =>
                    building.complete &&
                    building.kind == BuildingKind.stockpile,
              )
              .length);

  double get phaseDuration => switch (phase) {
    SanctuaryPhase.day => config.daySeconds,
    SanctuaryPhase.dusk => config.duskSeconds,
    SanctuaryPhase.night => config.nightSeconds,
    SanctuaryPhase.dawn => config.dawnSeconds,
    SanctuaryPhase.fallen => 1,
  };

  double get phaseProgress => phase == SanctuaryPhase.fallen
      ? 0
      : (phaseRemaining / phaseDuration).clamp(0, 1);

  int get pendingEnemies => _spawnQueue.length;
  int get activeThreat => enemies.length + pendingEnemies;
  bool get hasSaveableProgress =>
      day > 1 || buildings.length > 1 || totalEnemiesDefeated > 0;

  int upgradeCost(AncestralUpgrade upgrade) => 2 + (upgrades[upgrade] ?? 0) * 2;

  bool purchaseUpgrade(AncestralUpgrade upgrade) {
    final int rank = upgrades[upgrade] ?? 0;
    final int cost = upgradeCost(upgrade);
    if (rank >= upgrade.maxRank || ancestralShards < cost) {
      return false;
    }
    ancestralShards -= cost;
    upgrades[upgrade] = rank + 1;
    return true;
  }

  TerrainKind terrainAt(GridPoint tile) {
    if (!inBounds(tile)) {
      return TerrainKind.chasm;
    }
    return TerrainKind.values[_terrain[tile.index(mapSize)]];
  }

  TerrainKind terrainAtXY(int x, int y) {
    if (x < 0 || y < 0 || x >= mapSize || y >= mapSize) {
      return TerrainKind.chasm;
    }
    return TerrainKind.values[_terrain[y * mapSize + x]];
  }

  bool isRevealed(GridPoint tile) =>
      inBounds(tile) && _revealed[tile.index(mapSize)] == 1;

  bool isRevealedXY(int x, int y) =>
      x >= 0 &&
      y >= 0 &&
      x < mapSize &&
      y < mapSize &&
      _revealed[y * mapSize + x] == 1;

  bool inBounds(GridPoint tile) =>
      tile.x >= 0 && tile.y >= 0 && tile.x < mapSize && tile.y < mapSize;

  SanctuaryBuilding? buildingAt(GridPoint tile) {
    if (!inBounds(tile)) {
      return null;
    }
    return _buildingAtXY(tile.x, tile.y);
  }

  SanctuaryBuilding? _buildingAtXY(int x, int y) {
    final SanctuaryBuilding? building = _buildingsByTile[y * mapSize + x];
    return building != null && building.hp > 0 ? building : null;
  }

  void tick(double realDeltaSeconds) {
    if (paused || phase == SanctuaryPhase.fallen) {
      return;
    }
    _accumulator += realDeltaSeconds.clamp(0, 0.1) * gameSpeed;
    int safety = 0;
    while (_accumulator >= fixedStep && safety < 8) {
      _step(fixedStep);
      _accumulator -= fixedStep;
      safety++;
    }
  }

  void setSpeed(double value) {
    gameSpeed = value.clamp(0.5, 2);
    paused = false;
  }

  void togglePause() => paused = !paused;

  List<SanctuaryEvent> drainEvents() {
    if (_events.isEmpty) {
      return const <SanctuaryEvent>[];
    }
    final List<SanctuaryEvent> result = List<SanctuaryEvent>.of(_events);
    _events.clear();
    return result;
  }

  PlacementFailure validatePlacement(BuildingKind kind, GridPoint tile) {
    if (!inBounds(tile) || !isRevealed(tile)) {
      return PlacementFailure.fog;
    }
    if (buildingAt(tile) != null || fissures.containsKey(tile.index(mapSize))) {
      return PlacementFailure.occupied;
    }
    final TerrainKind terrain = terrainAt(tile);
    final bool terrainAllowed = switch (kind) {
      BuildingKind.spikeTrench =>
        terrain == TerrainKind.grass || terrain == TerrainKind.holyGround,
      _ => terrain == TerrainKind.grass || terrain == TerrainKind.holyGround,
    };
    if (!terrainAllowed) {
      return PlacementFailure.terrain;
    }
    if (tile.distanceTo(hearthTile) < 2.2) {
      return PlacementFailure.tooCloseToHearth;
    }
    if (!resources.canAfford(kind.cost)) {
      return PlacementFailure.resources;
    }
    if (kind.blocksGround && !_cachedPathsRemainOpen(tile)) {
      return PlacementFailure.blocksAllPaths;
    }
    return PlacementFailure.none;
  }

  PlacementResult placeBuilding(BuildingKind kind, GridPoint tile) {
    final PlacementFailure failure = validatePlacement(kind, tile);
    if (failure != PlacementFailure.none) {
      _events.add(
        SanctuaryEvent(
          SanctuaryEventKind.placementRejected,
          tile: tile,
          message: placementFailureMessage(failure),
        ),
      );
      return PlacementResult(failure);
    }
    resources.spend(kind.cost);
    final SanctuaryBuilding building = SanctuaryBuilding(
      id: 'b${_nextBuildingId++}',
      kind: kind,
      tile: tile,
      hp: _maxHpFor(kind) * 0.35,
      ammo: kind == BuildingKind.ballista
          ? 8
          : kind == BuildingKind.catapult
          ? 4
          : 20,
    );
    buildings.add(building);
    _buildingsByTile[tile.index(mapSize)] = building;
    _recomputeFlow();
    _events.add(
      SanctuaryEvent(
        SanctuaryEventKind.construction,
        tile: tile,
        message: '${kind.label} blueprint placed',
      ),
    );
    return PlacementResult(PlacementFailure.none, building: building);
  }

  bool clearTerrain(GridPoint tile) {
    if (!isRevealed(tile) || buildingAt(tile) != null) {
      return false;
    }
    final TerrainKind terrain = terrainAt(tile);
    switch (terrain) {
      case TerrainKind.forest:
        resources.timber += 15;
      case TerrainKind.granite:
        resources.stone += 25;
        resources.iron += 5;
      case TerrainKind.grass ||
          TerrainKind.river ||
          TerrainKind.chasm ||
          TerrainKind.holyGround:
        return false;
    }
    _terrain[tile.index(mapSize)] = TerrainKind.grass.index;
    effects.add(
      SanctuaryEffect(kind: 'harvest', x: tile.x + 0.5, y: tile.y + 0.5),
    );
    _recomputeFlow();
    return true;
  }

  bool purifyFog(GridPoint tile) {
    if (!inBounds(tile) || isRevealed(tile) || resources.mana < 8) {
      return false;
    }
    final bool touchesSanctuary = _neighbors(tile).any(isRevealed);
    if (!touchesSanctuary) {
      return false;
    }
    resources.mana -= 8;
    _revealCircle(tile, 3.6);
    effects.add(
      SanctuaryEffect(
        kind: 'purify',
        x: tile.x + 0.5,
        y: tile.y + 0.5,
        life: 1.2,
      ),
    );
    return true;
  }

  void setDirectives(Map<CitizenRole, int> values) {
    final int total = values.values.fold<int>(
      0,
      (int sum, int value) => sum + value,
    );
    if (total <= 0) {
      return;
    }
    int assigned = 0;
    for (int index = 0; index < CitizenRole.values.length; index++) {
      final CitizenRole role = CitizenRole.values[index];
      final int normalized = index == CitizenRole.values.length - 1
          ? 100 - assigned
          : ((values[role] ?? 0) * 100 / total).round();
      directives[role] = normalized.clamp(0, 100);
      assigned += directives[role]!;
    }
    _assignRoles();
  }

  void setStance(GridPoint tile, TowerStance stance) {
    final SanctuaryBuilding? building = buildingAt(tile);
    if (building != null && building.isTower && building.stance != stance) {
      building.stance = stance;
      _events.add(
        SanctuaryEvent(
          SanctuaryEventKind.towerShot,
          tile: tile,
          message: '${building.kind.label} · ${stance.label} stance',
        ),
      );
    }
  }

  /// Emergency repair by the player's own hand: 1 timber per 25 structure HP,
  /// usable at any hour so a failing wall at night can still be answered.
  double repairBuilding(GridPoint tile) {
    final SanctuaryBuilding? building = buildingAt(tile);
    if (building == null || building.complete && building.hp >= building.kind.maxHp) {
      return 0;
    }
    final double maxHp = building.kind.maxHp;
    final double missing = maxHp - building.hp;
    if (missing <= 0.5) {
      return 0;
    }
    final double affordable = min(missing, resources.timber * 25);
    if (affordable <= 0.5) {
      _events.add(
        const SanctuaryEvent(
          SanctuaryEventKind.placementRejected,
          message: 'Not enough timber to repair',
        ),
      );
      return 0;
    }
    resources.timber -= affordable / 25;
    building.hp = min(maxHp, building.hp + affordable);
    effects.add(
      SanctuaryEffect(
        kind: 'repair',
        x: tile.x + 0.5,
        y: tile.y + 0.5,
        text: '+${affordable.round()}',
        life: 0.9,
      ),
    );
    _events.add(
      SanctuaryEvent(
        SanctuaryEventKind.buildingRepaired,
        tile: tile,
        message: '${building.kind.label} restored',
      ),
    );
    return affordable;
  }

  bool dismantleBuilding(GridPoint tile) {
    if (phase == SanctuaryPhase.night || phase == SanctuaryPhase.fallen) {
      return false;
    }
    final SanctuaryBuilding? building = buildingAt(tile);
    if (building == null || building.kind == BuildingKind.hearth) {
      return false;
    }
    final BuildingCost cost = building.kind.cost;
    resources
      ..timber += cost.timber * 0.5
      ..stone += cost.stone * 0.5
      ..iron += cost.iron * 0.5
      ..planks += cost.planks * 0.5
      ..masonry += cost.masonry * 0.5
      ..crystals += cost.crystals * 0.5;
    buildings.remove(building);
    _buildingsByTile.remove(tile.index(mapSize));
    _efficiencyCache.remove(building.id);
    effects.add(
      SanctuaryEffect(kind: 'dismantle', x: tile.x + 0.5, y: tile.y + 0.5),
    );
    _recomputeFlow();
    _enforceStorageCaps();
    _events.add(
      SanctuaryEvent(
        SanctuaryEventKind.buildingDismantled,
        tile: tile,
        message: '${building.kind.label} dismantled · half materials returned',
      ),
    );
    return true;
  }

  bool activateMuster() {
    if (phase != SanctuaryPhase.night || musterCooldown > 0 || musterActive) {
      return false;
    }
    musterTime = 8;
    musterCooldown = 90;
    shake = max(shake, 0.35);
    _events.add(
      const SanctuaryEvent(
        SanctuaryEventKind.musterCalled,
        message: 'MUSTER · the village answers the night',
      ),
    );
    return true;
  }

  /// Placement-sensitive output multiplier: farms thirst for rivers, sawmills
  /// for standing forest, masonry yards for granite, and shrines only sing at
  /// full strength on holy ground.
  double efficiencyOf(SanctuaryBuilding building) {
    if (_efficiencyRevision != _topologyRevision) {
      _efficiencyCache.clear();
      _efficiencyRevision = _topologyRevision;
    }
    final double? cached = _efficiencyCache[building.id];
    if (cached != null) {
      return cached;
    }
    double bonus = 0;
    switch (building.kind) {
      case BuildingKind.farm:
        bonus = _countNeighborTerrain(building.tile, TerrainKind.river) * 0.15;
      case BuildingKind.sawmill:
        bonus = _countNeighborTerrain(building.tile, TerrainKind.forest) * 0.12;
      case BuildingKind.masonryYard:
        bonus =
            _countNeighborTerrain(building.tile, TerrainKind.granite) * 0.12;
      case BuildingKind.shrine:
        bonus = terrainAt(building.tile) == TerrainKind.holyGround ? 1 : 0;
      case BuildingKind.hearth ||
          BuildingKind.cottage ||
          BuildingKind.stockpile ||
          BuildingKind.palisade ||
          BuildingKind.rampart ||
          BuildingKind.gate ||
          BuildingKind.spikeTrench ||
          BuildingKind.tarPit ||
          BuildingKind.arrowTower ||
          BuildingKind.ballista ||
          BuildingKind.catapult ||
          BuildingKind.frostSpire ||
          BuildingKind.solarBeacon:
        bonus = 0;
    }
    final double value = 1 + bonus.clamp(0, 1);
    _efficiencyCache[building.id] = value;
    return value;
  }

  int _countNeighborTerrain(GridPoint tile, TerrainKind kind) => _neighbors(
    tile,
  ).where((GridPoint neighbor) => terrainAt(neighbor) == kind).length;

  bool canResolveEncounter({required bool compassionate}) {
    final SanctuaryEncounterKind? current = encounter;
    if (current == null || !compassionate) {
      return current != null;
    }
    return switch (current) {
      SanctuaryEncounterKind.lostCaravan =>
        resources.food >= 15 && populationCapacity > citizens.length,
      SanctuaryEncounterKind.singingStones => resources.mana >= 18,
      SanctuaryEncounterKind.woundedStag => resources.food >= 8,
      SanctuaryEncounterKind.emberWind => resources.mana >= 20,
    };
  }

  bool resolveEncounter({required bool compassionate}) {
    final SanctuaryEncounterKind? current = encounter;
    if (current == null || !canResolveEncounter(compassionate: compassionate)) {
      return false;
    }
    String result;
    switch ((current, compassionate)) {
      case (SanctuaryEncounterKind.lostCaravan, true):
        resources.food -= 15;
        final int arrivals = min(2, populationCapacity - citizens.length);
        for (int index = 0; index < arrivals; index++) {
          citizens.add(
            SanctuaryCitizen(
              id: _nextCitizenId++,
              role: CitizenRole.harvester,
              x: hearthTile.x + 0.5,
              y: hearthTile.y + 1.5,
            ),
          );
        }
        morale = min(100, morale + 9);
        result = '$arrivals travelers joined the settlement';
      case (SanctuaryEncounterKind.lostCaravan, false):
        resources
          ..timber += 25
          ..stone += 12;
        morale = max(0, morale - 4);
        result = 'The caravan traded its remaining supplies';
      case (SanctuaryEncounterKind.singingStones, true):
        resources
          ..mana -= 18
          ..crystals += 4;
        morale = min(100, morale + 6);
        result = 'The song became four mana crystals';
      case (SanctuaryEncounterKind.singingStones, false):
        resources.stone += 40;
        morale = max(0, morale - 5);
        result = 'The singing seam was quarried';
      case (SanctuaryEncounterKind.woundedStag, true):
        resources.food -= 8;
        morale = min(100, morale + 10);
        result = 'The healed stag vanished into the green';
      case (SanctuaryEncounterKind.woundedStag, false):
        resources.food += 25;
        morale = max(0, morale - 7);
        result = 'The granary is fuller, but the village is quiet';
      case (SanctuaryEncounterKind.emberWind, true):
        resources.mana -= 20;
        for (final SanctuaryBuilding building in buildings) {
          building.hp = min(
            _maxHpFor(building.kind),
            building.hp + _maxHpFor(building.kind) * 0.18,
          );
        }
        morale = min(100, morale + 5);
        result = 'A cool ward settled across every roof and wall';
      case (SanctuaryEncounterKind.emberWind, false):
        resources.iron += 12;
        morale = max(0, morale - 4);
        result = 'Twelve pieces of star-iron cooled in the ash';
    }
    encounter = null;
    if (compassionate) {
      mercifulChoices++;
    } else {
      pragmaticChoices++;
    }
    _assignRoles();
    _enforceStorageCaps();
    _events.add(
      SanctuaryEvent(SanctuaryEventKind.encounterResolved, message: result),
    );
    return true;
  }

  Map<String, dynamic> runSummary() => <String, dynamic>{
    'night': day,
    'seed': seed,
    'totalEnemiesDefeated': totalEnemiesDefeated,
    'oathsFulfilled': oathsFulfilled,
    'mercifulChoices': mercifulChoices,
    'pragmaticChoices': pragmaticChoices,
    'peakPopulation': peakPopulation,
    'milestonesSealed': milestonesSealed,
    'endedAt': DateTime.now().toIso8601String(),
  };

  bool castPower(GodPower power, GridPoint target) {
    final double cost = switch (power) {
      GodPower.lightning => 15,
      GodPower.rain => 25,
      GodPower.fissure => 50,
      GodPower.meteor => 80,
    };
    if (!inBounds(target) || !isRevealed(target) || resources.mana < cost) {
      return false;
    }
    resources.mana -= cost;
    if (phase == SanctuaryPhase.night) {
      powersCastTonight++;
    }
    switch (power) {
      case GodPower.lightning:
        shake = max(shake, 0.2);
        _damageEnemies(target, radius: 1.5, damage: 150, stun: 1.5);
        for (final SanctuaryBuilding building in buildings) {
          if (building.kind == BuildingKind.tarPit &&
              building.tile.distanceTo(target) <= 1.5) {
            building.cooldown = 8;
          }
        }
        effects.add(
          SanctuaryEffect(
            kind: 'lightning',
            x: target.x + 0.5,
            y: target.y + 0.5,
          ),
        );
      case GodPower.rain:
        rainActive = true;
        rainRemaining = 4;
        for (final SanctuaryBuilding building in buildings) {
          building.hp = min(building.kind.maxHp, building.hp + 35);
        }
        for (final SanctuaryEnemy enemy in enemies) {
          enemy.slowTime = max(enemy.slowTime, 4);
        }
        resources.food += 8;
        effects.add(
          SanctuaryEffect(
            kind: 'rain',
            x: target.x + 0.5,
            y: target.y + 0.5,
            life: 4,
          ),
        );
      case GodPower.fissure:
        shake = max(shake, 0.5);
        for (int offset = -1; offset <= 1; offset++) {
          final GridPoint tile = GridPoint(target.x + offset, target.y);
          if (inBounds(tile) &&
              tile != hearthTile &&
              buildingAt(tile) == null) {
            fissures[tile.index(mapSize)] = 12;
          }
        }
        _recomputeFlow();
        effects.add(
          SanctuaryEffect(
            kind: 'fissure',
            x: target.x + 0.5,
            y: target.y + 0.5,
            life: 1.1,
          ),
        );
      case GodPower.meteor:
        shake = max(shake, 0.85);
        _damageEnemies(target, radius: 2.5, damage: 750);
        effects.add(
          SanctuaryEffect(
            kind: 'meteor',
            x: target.x + 0.5,
            y: target.y + 0.5,
            life: 1.4,
          ),
        );
    }
    _events.add(
      SanctuaryEvent(
        SanctuaryEventKind.powerCast,
        tile: target,
        message: power.label,
      ),
    );
    return true;
  }

  bool fling(GridPoint source, GridPoint target, double velocity) {
    final TerrainKind terrain = terrainAt(source);
    if (!isRevealed(source) ||
        !isRevealed(target) ||
        (terrain != TerrainKind.granite && terrain != TerrainKind.forest)) {
      return false;
    }
    final double mass = terrain == TerrainKind.granite ? 50 : 25;
    final double maxDamage = terrain == TerrainKind.granite ? 450 : 220;
    final double might =
        1 + (upgrades[AncestralUpgrade.divineMight] ?? 0) * 0.05;
    final double damage = (0.085 * 0.5 * mass * velocity * velocity * might)
        .clamp(25, maxDamage * might);
    _terrain[source.index(mapSize)] = TerrainKind.grass.index;
    final double sx = source.x + 0.5;
    final double sy = source.y + 0.5;
    final double tx = target.x + 0.5;
    final double ty = target.y + 0.5;
    final double lineDx = tx - sx;
    final double lineDy = ty - sy;
    final double lineLengthSquared = lineDx * lineDx + lineDy * lineDy;
    for (final SanctuaryEnemy enemy in enemies) {
      final double projection = lineLengthSquared == 0
          ? 0
          : (((enemy.x - sx) * (tx - sx) + (enemy.y - sy) * (ty - sy)) /
                    lineLengthSquared)
                .clamp(0, 1);
      final double px = sx + (tx - sx) * projection;
      final double py = sy + (ty - sy) * projection;
      final double hitDx = enemy.x - px;
      final double hitDy = enemy.y - py;
      if (hitDx * hitDx + hitDy * hitDy < 0.49) {
        enemy.hp -= damage;
      }
    }
    effects.add(
      SanctuaryEffect(kind: 'fling', x: target.x + 0.5, y: target.y + 0.5),
    );
    _removeDefeatedEnemies();
    return true;
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'version': saveVersion,
    'seed': seed,
    'mapSize': mapSize,
    'day': day,
    'phase': phase.name,
    'phaseRemaining': phaseRemaining,
    'worldTime': worldTime,
    'morale': morale,
    'encounter': encounter?.name,
    'nightOath': nightOath?.name,
    'oathTarget': oathTarget,
    'powersCastTonight': powersCastTonight,
    'buildingsLostTonight': buildingsLostTonight,
    'citizensLostTonight': citizensLostTonight,
    'resources': resources.toJson(),
    'buildings': buildings
        .map((SanctuaryBuilding value) => value.toJson())
        .toList(),
    'citizens': citizens
        .map((SanctuaryCitizen value) => value.toJson())
        .toList(),
    'enemies': enemies.map((SanctuaryEnemy value) => value.toJson()).toList(),
    'revealed': <int>[
      for (int index = 0; index < _revealed.length; index++)
        if (_revealed[index] == 1) index,
    ],
    'fissures': fissures.map(
      (int key, double value) => MapEntry<String, dynamic>('$key', value),
    ),
    'directives': directives.map(
      (CitizenRole key, int value) =>
          MapEntry<String, dynamic>(key.name, value),
    ),
    'upgrades': upgrades.map(
      (AncestralUpgrade key, int value) =>
          MapEntry<String, dynamic>(key.name, value),
    ),
    'ancestralShards': ancestralShards,
    'totalEnemiesDefeated': totalEnemiesDefeated,
    'oathsFulfilled': oathsFulfilled,
    'mercifulChoices': mercifulChoices,
    'pragmaticChoices': pragmaticChoices,
    'milestonesSealed': milestonesSealed,
    'peakPopulation': peakPopulation,
    'musterCooldown': musterCooldown,
    'waveModifier': waveModifier.name,
    'waveLanes': waveLanes
        .map((GridPoint point) => point.toJson())
        .toList(),
    'waveComposition': waveComposition.map(
      (EnemyKind key, int value) => MapEntry<String, dynamic>(key.name, value),
    ),
    'nextBuildingId': _nextBuildingId,
    'nextCitizenId': _nextCitizenId,
    'nextEnemyId': _nextEnemyId,
    'savedAt': DateTime.now().toIso8601String(),
  };

  factory SanctuaryEngine.fromJson(
    Map<String, dynamic> json, {
    SanctuaryConfig? config,
  }) {
    final int size =
        (json['mapSize'] as num?)?.toInt() ?? config?.mapSize ?? 64;
    final SanctuaryConfig resolved = config ?? SanctuaryConfig(mapSize: size);
    final SanctuaryEngine engine = SanctuaryEngine(
      seed: (json['seed'] as num?)?.toInt(),
      config: resolved,
    );
    engine
      ..day = (json['day'] as num?)?.toInt() ?? 1
      ..phase = SanctuaryPhase.values.firstWhere(
        (SanctuaryPhase value) => value.name == json['phase'],
        orElse: () => SanctuaryPhase.day,
      )
      ..phaseRemaining =
          (json['phaseRemaining'] as num?)?.toDouble() ?? resolved.daySeconds
      ..worldTime = (json['worldTime'] as num?)?.toDouble() ?? 0
      ..morale = (json['morale'] as num?)?.toDouble() ?? 65
      ..encounter = SanctuaryEncounterKind.values
          .cast<SanctuaryEncounterKind?>()
          .firstWhere(
            (SanctuaryEncounterKind? value) => value?.name == json['encounter'],
            orElse: () => null,
          )
      ..nightOath = NightOath.values.cast<NightOath?>().firstWhere(
        (NightOath? value) => value?.name == json['nightOath'],
        orElse: () => null,
      )
      ..oathTarget = (json['oathTarget'] as num?)?.toInt() ?? 0
      ..powersCastTonight = (json['powersCastTonight'] as num?)?.toInt() ?? 0
      ..buildingsLostTonight =
          (json['buildingsLostTonight'] as num?)?.toInt() ?? 0
      ..citizensLostTonight =
          (json['citizensLostTonight'] as num?)?.toInt() ?? 0
      ..resources = SanctuaryResources.fromJson(_map(json['resources']))
      ..ancestralShards = (json['ancestralShards'] as num?)?.toInt() ?? 0
      ..totalEnemiesDefeated =
          (json['totalEnemiesDefeated'] as num?)?.toInt() ?? 0
      ..oathsFulfilled = (json['oathsFulfilled'] as num?)?.toInt() ?? 0
      ..mercifulChoices = (json['mercifulChoices'] as num?)?.toInt() ?? 0
      ..pragmaticChoices = (json['pragmaticChoices'] as num?)?.toInt() ?? 0
      ..milestonesSealed = (json['milestonesSealed'] as num?)?.toInt() ?? 0
      ..peakPopulation = (json['peakPopulation'] as num?)?.toInt() ?? 12
      ..musterCooldown =
          (json['musterCooldown'] as num?)?.toDouble() ?? 0
      ..waveModifier = WaveModifier.values.firstWhere(
        (WaveModifier value) => value.name == json['waveModifier'],
        orElse: () => WaveModifier.none,
      )
      ..waveLanes = _mapList(json['waveLanes'])
          .map(GridPoint.fromJson)
          .toList()
      ..waveComposition = _map(json['waveComposition']).map(
        (String key, dynamic value) => MapEntry<EnemyKind, int>(
          EnemyKind.values.firstWhere(
            (EnemyKind kind) => kind.name == key,
            orElse: () => EnemyKind.crawler,
          ),
          (value as num?)?.toInt() ?? 0,
        ),
      )
      .._nextBuildingId = (json['nextBuildingId'] as num?)?.toInt() ?? 1
      .._nextCitizenId = (json['nextCitizenId'] as num?)?.toInt() ?? 1
      .._nextEnemyId = (json['nextEnemyId'] as num?)?.toInt() ?? 1;

    engine.buildings
      ..clear()
      ..addAll(_mapList(json['buildings']).map(SanctuaryBuilding.fromJson));
    if (engine.buildings.every(
      (SanctuaryBuilding value) => value.kind != BuildingKind.hearth,
    )) {
      engine.buildings.add(
        SanctuaryBuilding(
          id: 'hearth',
          kind: BuildingKind.hearth,
          tile: engine.hearthTile,
        ),
      );
    }
    engine._reindexBuildings();
    engine.citizens
      ..clear()
      ..addAll(_mapList(json['citizens']).map(SanctuaryCitizen.fromJson));
    engine.enemies
      ..clear()
      ..addAll(_mapList(json['enemies']).map(SanctuaryEnemy.fromJson));
    engine._revealed.fillRange(0, engine._revealed.length, 0);
    final Object? rawRevealed = json['revealed'];
    if (rawRevealed is List) {
      for (final int index in rawRevealed.whereType<num>().map(
        (num value) => value.toInt(),
      )) {
        if (index >= 0 && index < engine._revealed.length) {
          engine._revealed[index] = 1;
        }
      }
    } else {
      engine._revealCircle(engine.hearthTile, 10);
    }
    final Map<String, dynamic> rawFissures = _map(json['fissures']);
    engine.fissures
      ..clear()
      ..addAll(
        rawFissures.map(
          (String key, dynamic value) => MapEntry<int, double>(
            int.tryParse(key) ?? 0,
            (value as num?)?.toDouble() ?? 0,
          ),
        ),
      );
    final Map<String, dynamic> rawDirectives = _map(json['directives']);
    for (final CitizenRole role in CitizenRole.values) {
      engine.directives[role] =
          (rawDirectives[role.name] as num?)?.toInt() ??
          engine.directives[role]!;
    }
    final Map<String, dynamic> rawUpgrades = _map(json['upgrades']);
    for (final AncestralUpgrade upgrade in AncestralUpgrade.values) {
      engine.upgrades[upgrade] =
          (rawUpgrades[upgrade.name] as num?)?.toInt() ?? 0;
    }
    engine._recomputeFlow();
    return engine;
  }

  static String placementFailureMessage(PlacementFailure failure) =>
      switch (failure) {
        PlacementFailure.none => 'Ready',
        PlacementFailure.fog => 'Purify this ground first',
        PlacementFailure.occupied => 'That tile is occupied',
        PlacementFailure.terrain => 'Clear the terrain before building',
        PlacementFailure.resources => 'Not enough resources',
        PlacementFailure.blocksAllPaths =>
          'A route to the Hearth must remain open',
        PlacementFailure.tooCloseToHearth => 'Leave space around the Hearth',
      };

  void _step(double dt) {
    worldTime += dt;
    phaseRemaining -= dt;
    _towerFeedbackCooldown = max(0, _towerFeedbackCooldown - dt);
    _dmgTextCooldown = max(0, _dmgTextCooldown - dt);
    shake = max(0, shake - dt * 1.8);
    if (musterTime > 0) {
      musterTime = max(0, musterTime - dt);
      if (musterTime == 0) {
        _events.add(const SanctuaryEvent(SanctuaryEventKind.musterCalled, message: 'The muster ends · back to the Hearth'));
      }
    }
    musterCooldown = max(0, musterCooldown - dt);
    for (final SanctuaryEffect effect in effects) {
      effect.age += dt;
    }
    effects.removeWhere((SanctuaryEffect effect) => effect.age >= effect.life);
    while (effects.length > effectsCap) {
      effects.removeAt(0);
    }
    _tickFissures(dt);
    if (rainActive) {
      rainRemaining -= dt;
      if (rainRemaining <= 0) {
        rainActive = false;
      }
    }

    _directiveAccumulator += dt;
    if (_directiveAccumulator >= 1) {
      _directiveAccumulator -= 1;
      _assignRoles();
      peakPopulation = max(peakPopulation, citizens.length);
    }
    _citizenAccumulator += dt;
    if (_citizenAccumulator >= 0.1) {
      _citizenAccumulator -= 0.1;
      _updateCitizens(0.1);
    }

    if (phase == SanctuaryPhase.night) {
      _spawnAccumulator += dt;
      if (_spawnAccumulator >= 0.38 &&
          _spawnQueue.isNotEmpty &&
          enemies.length < 180) {
        _spawnAccumulator = 0;
        _spawnEnemy(_spawnQueue.removeFirst());
      }
      _defenseAccumulator += dt;
      if (_defenseAccumulator >= 0.05) {
        _updateDefenses(_defenseAccumulator);
        _defenseAccumulator = 0;
      }
      _updateEnemies(dt);
    }

    if (phaseRemaining <= 0) {
      _advancePhase();
    }
  }

  void _advancePhase() {
    switch (phase) {
      case SanctuaryPhase.day:
        phase = SanctuaryPhase.dusk;
        phaseRemaining = config.duskSeconds;
        _prepareWave();
      case SanctuaryPhase.dusk:
        phase = SanctuaryPhase.night;
        phaseRemaining = config.nightSeconds;
        citizensLostTonight = 0;
        enemiesDefeatedTonight = 0;
        buildingsLostTonight = 0;
        powersCastTonight = 0;
        _hearthDangerAccumulator = 0;
        _recomputeFlow();
      case SanctuaryPhase.night:
        phase = SanctuaryPhase.dawn;
        phaseRemaining = config.dawnSeconds;
        _resolveDawn();
      case SanctuaryPhase.dawn:
        day++;
        phase = SanctuaryPhase.day;
        phaseRemaining = config.daySeconds;
        _beginDay();
      case SanctuaryPhase.fallen:
        return;
    }
    _events.add(
      SanctuaryEvent(SanctuaryEventKind.phaseChanged, message: phase.name),
    );
  }

  void _generateWorld() {
    final int center = mapSize ~/ 2;
    final Random terrainRandom = Random(seed);
    for (int y = 0; y < mapSize; y++) {
      final int riverCenter = center + (sin(y * 0.24 + seed % 7) * 7).round();
      for (int x = 0; x < mapSize; x++) {
        TerrainKind kind = TerrainKind.grass;
        final double centerDistance = sqrt(
          pow(x - center, 2) + pow(y - center, 2),
        );
        final double roll = terrainRandom.nextDouble();
        if ((x - riverCenter).abs() <= 1 && centerDistance > 6) {
          kind = TerrainKind.river;
        } else if (roll < 0.13) {
          kind = TerrainKind.forest;
        } else if (roll < 0.185) {
          kind = TerrainKind.granite;
        } else if (roll < 0.198 && centerDistance > 10) {
          kind = TerrainKind.chasm;
        }
        if (centerDistance < 5.5 || x == center || y == center) {
          kind = TerrainKind.grass;
        }
        _terrain[y * mapSize + x] = kind.index;
      }
    }
    final List<GridPoint> shrines = <GridPoint>[
      GridPoint(center - 9, center - 7),
      GridPoint(center + 10, center - 6),
      GridPoint(center - 8, center + 9),
      GridPoint(center + 9, center + 8),
    ];
    for (final GridPoint shrine in shrines) {
      if (inBounds(shrine)) {
        _terrain[shrine.index(mapSize)] = TerrainKind.holyGround.index;
      }
    }
    _revealCircle(hearthTile, 10);
  }

  void _createSettlement() {
    phaseRemaining = config.daySeconds;
    buildings.add(
      SanctuaryBuilding(
        id: 'hearth',
        kind: BuildingKind.hearth,
        tile: hearthTile,
        buildProgress: 1,
      ),
    );
    _buildingsByTile[hearthTile.index(mapSize)] = buildings.first;
    for (int index = 0; index < 12; index++) {
      citizens.add(
        SanctuaryCitizen(
          id: _nextCitizenId++,
          role: CitizenRole.values[index % CitizenRole.values.length],
          x: hearthTile.x + 0.1 + _random.nextDouble() * 1.8,
          y: hearthTile.y + 0.1 + _random.nextDouble() * 1.8,
        ),
      );
    }
    _assignRoles();
  }

  void _revealCircle(GridPoint center, double radius) {
    final int minX = max(0, (center.x - radius).floor());
    final int maxX = min(mapSize - 1, (center.x + radius).ceil());
    final int minY = max(0, (center.y - radius).floor());
    final int maxY = min(mapSize - 1, (center.y + radius).ceil());
    for (int y = minY; y <= maxY; y++) {
      for (int x = minX; x <= maxX; x++) {
        if (sqrt(pow(x - center.x, 2) + pow(y - center.y, 2)) <= radius) {
          _revealed[y * mapSize + x] = 1;
        }
      }
    }
  }

  void _assignRoles() {
    int cursor = 0;
    for (
      int roleIndex = 0;
      roleIndex < CitizenRole.values.length;
      roleIndex++
    ) {
      final CitizenRole role = CitizenRole.values[roleIndex];
      final int desired = roleIndex == CitizenRole.values.length - 1
          ? citizens.length - cursor
          : (citizens.length * (directives[role] ?? 0) / 100).round();
      for (
        int count = 0;
        count < desired && cursor < citizens.length;
        count++
      ) {
        citizens[cursor++].role = role;
      }
    }
    while (cursor < citizens.length) {
      citizens[cursor++].role = CitizenRole.harvester;
    }
  }

  void _updateCitizens(double dt) {
    if (citizens.isEmpty) {
      return;
    }
    if (phase == SanctuaryPhase.night || phase == SanctuaryPhase.dusk) {
      final bool mustering = musterActive && phase == SanctuaryPhase.night;
      if (!mustering) {
        for (final SanctuaryCitizen citizen in citizens) {
          citizen.state = CitizenState.sheltering;
          _moveCitizenToward(citizen, hearthTile, dt * 4.2);
        }
        return;
      }
    }

    double productivity = 0.85 + morale * 0.003;
    if (phase == SanctuaryPhase.night) {
      productivity *= 0.65;
    }
    final List<SanctuaryBuilding> blueprints = buildings
        .where((SanctuaryBuilding building) => !building.complete)
        .toList();
    for (final SanctuaryCitizen citizen in citizens) {
      citizen.hunger = min(100, citizen.hunger + dt * 0.16);
      switch (citizen.role) {
        case CitizenRole.harvester:
          citizen.state = CitizenState.working;
          final int choice = (citizen.id + day) % 10;
          if (choice < 5) {
            resources.timber += 0.13 * productivity;
          } else if (choice < 8) {
            resources.stone += 0.09 * productivity;
          } else {
            resources.food += 0.1 * productivity;
          }
          _wanderCitizen(citizen, dt);
        case CitizenRole.builder:
          if (blueprints.isNotEmpty) {
            final SanctuaryBuilding target =
                blueprints[citizen.id % blueprints.length];
            final bool wasComplete = target.complete;
            citizen
              ..state = CitizenState.working
              ..taskTile = target.tile;
            _moveCitizenToward(citizen, target.tile, dt * 3.7);
            if (_citizenDistanceSquared(citizen, target.tile) < 1.69) {
              target.buildProgress += dt * 5.2 * productivity;
              final double maxHp = _maxHpFor(target.kind);
              target.hp = min(maxHp, target.hp + dt * maxHp * 0.12);
              if (target.complete) {
                target.hp = max(target.hp, maxHp * 0.72);
                if (!wasComplete) {
                  _recomputeFlow();
                  final double efficiency = efficiencyOf(target);
                  _events.add(
                    SanctuaryEvent(
                      SanctuaryEventKind.constructionComplete,
                      tile: target.tile,
                      message: efficiency > 1.05
                          ? '${target.kind.label} complete · ${(efficiency * 100).round()}% output'
                          : '${target.kind.label} complete',
                    ),
                  );
                }
              }
            }
          } else {
            final SanctuaryBuilding? repair = buildings
                .where(
                  (SanctuaryBuilding value) =>
                      value.hp < value.kind.maxHp * 0.9,
                )
                .firstOrNull;
            if (repair != null && resources.timber >= 0.02) {
              citizen.state = CitizenState.working;
              _moveCitizenToward(citizen, repair.tile, dt * 3.7);
              if (_citizenDistanceSquared(citizen, repair.tile) < 1.69) {
                repair.hp = min(
                  _maxHpFor(repair.kind),
                  repair.hp + dt * 18 * productivity,
                );
                resources.timber -= dt * 0.1;
              }
            } else {
              citizen.state = CitizenState.idle;
              _wanderCitizen(citizen, dt);
            }
          }
        case CitizenRole.hauler:
          final SanctuaryBuilding? tower = buildings
              .where(
                (SanctuaryBuilding building) =>
                    building.complete &&
                    (building.kind == BuildingKind.arrowTower ||
                        building.kind == BuildingKind.ballista ||
                        building.kind == BuildingKind.catapult) &&
                    building.ammo < 10,
              )
              .firstOrNull;
          final bool catapult = tower?.kind == BuildingKind.catapult;
          final bool hasAmmoResource = catapult
              ? resources.stone >= 5
              : resources.timber >= 1;
          if (tower != null && hasAmmoResource) {
            citizen.state = CitizenState.carrying;
            _moveCitizenToward(citizen, tower.tile, dt * 4);
            if (_citizenDistanceSquared(citizen, tower.tile) < 1.44) {
              if (catapult) {
                tower.ammo += 3;
                resources.stone -= 5;
              } else {
                tower.ammo += 10;
                resources.timber -= 1;
              }
            }
          } else {
            citizen.state = CitizenState.idle;
            _wanderCitizen(citizen, dt);
          }
        case CitizenRole.acolyte:
          citizen.state = CitizenState.praying;
          final SanctuaryBuilding target = buildings.firstWhere(
            (SanctuaryBuilding building) =>
                building.complete && building.kind == BuildingKind.shrine,
            orElse: () => hearth,
          );
          _moveCitizenToward(citizen, target.tile, dt * 3.2);
          final double eclipseScale =
              waveModifier == WaveModifier.eclipse && phase == SanctuaryPhase.night
              ? 0.5
              : 1;
          resources.mana = min(
            manaCap,
            resources.mana + dt * 0.6 * productivity * eclipseScale,
          );
      }
    }
    double farmOutput = 0;
    double sawmillOutput = 0;
    double masonryOutput = 0;
    double shrineOutput = 0;
    for (final SanctuaryBuilding building in buildings) {
      if (!building.complete) {
        continue;
      }
      final double efficiency = efficiencyOf(building);
      switch (building.kind) {
        case BuildingKind.farm:
          farmOutput += efficiency;
        case BuildingKind.sawmill:
          sawmillOutput += efficiency;
        case BuildingKind.masonryYard:
          masonryOutput += efficiency;
        case BuildingKind.shrine:
          shrineOutput += efficiency;
        case BuildingKind.hearth ||
            BuildingKind.cottage ||
            BuildingKind.stockpile ||
            BuildingKind.palisade ||
            BuildingKind.rampart ||
            BuildingKind.gate ||
            BuildingKind.spikeTrench ||
            BuildingKind.tarPit ||
            BuildingKind.arrowTower ||
            BuildingKind.ballista ||
            BuildingKind.catapult ||
            BuildingKind.frostSpire ||
            BuildingKind.solarBeacon:
          break;
      }
    }
    resources.food += farmOutput * dt * (rainActive ? 1.2 : 0.32) * productivity;
    final double plankWork = min(
      resources.timber,
      sawmillOutput * dt * 0.42 * productivity,
    );
    resources
      ..timber -= plankWork
      ..planks += plankWork * 0.5;
    final double masonryWork = min(
      resources.stone,
      masonryOutput * dt * 0.32 * productivity,
    );
    resources
      ..stone -= masonryWork
      ..masonry += masonryWork * 0.5;
    final double shrineBoost =
        1 + (upgrades[AncestralUpgrade.overchargedShrines] ?? 0) * 0.10;
    final double eclipseScale =
        waveModifier == WaveModifier.eclipse && phase == SanctuaryPhase.night
        ? 0.5
        : 1;
    resources.mana = min(
      manaCap,
      resources.mana + shrineOutput * dt * 0.3 * shrineBoost * eclipseScale,
    );
    if (shrineOutput > 0 && resources.mana > 20) {
      final double infusion = min(resources.mana - 20, shrineOutput * dt * 0.035);
      resources
        ..mana -= infusion
        ..crystals += infusion;
    }
    _enforceStorageCaps();
  }

  void _wanderCitizen(SanctuaryCitizen citizen, double dt) {
    final double angle = citizen.id * 1.7 + day * 0.2;
    final GridPoint target = GridPoint(
      (hearthTile.x + cos(angle) * (3 + citizen.id % 4)).round(),
      (hearthTile.y + sin(angle) * (3 + citizen.id % 4)).round(),
    );
    _moveCitizenToward(citizen, target, dt * 1.4);
  }

  void _moveCitizenToward(
    SanctuaryCitizen citizen,
    GridPoint tile,
    double distance,
  ) {
    distance *= 1 + (upgrades[AncestralUpgrade.swiftSettlers] ?? 0) * 0.04;
    final double tx = tile.x + 0.5;
    final double ty = tile.y + 0.5;
    final double dx = tx - citizen.x;
    final double dy = ty - citizen.y;
    final double length = sqrt(dx * dx + dy * dy);
    if (length > 0.05) {
      citizen.x += dx / length * min(distance, length);
      citizen.y += dy / length * min(distance, length);
    }
  }

  double _citizenDistanceSquared(SanctuaryCitizen citizen, GridPoint tile) {
    final double dx = citizen.x - tile.x - 0.5;
    final double dy = citizen.y - tile.y - 0.5;
    return dx * dx + dy * dy;
  }

  void _prepareWave() {
    _spawnQueue.clear();
    final int rawBudget = (15 * pow(day, 1.45) + 5 * pow(1.12, day)).floor();
    nightOath = NightOath.values[(seed + day * 5) % NightOath.values.length];
    oathTarget = min(45, max(8, rawBudget ~/ 4));

    // Telegraph: every wave announces its lanes and nature at dusk so the day's
    // building is a response, not a ritual. Milestone nights hit every lane.
    final int milestoneNumber = day ~/ milestoneInterval;
    final bool milestone = isMilestoneNight;
    if (milestone) {
      waveLanes = List<GridPoint>.of(_spawnPoints);
    } else {
      final int laneCount = 2 + ((seed ~/ 7 + day) % 2);
      final int start = (seed + day) % 4;
      waveLanes = List<GridPoint>.generate(
        laneCount,
        (int offset) => _spawnPoints[(start + offset) % 4],
      );
    }
    if (day < 4 || milestone) {
      waveModifier = WaveModifier.none;
    } else if ((seed * 7 + day * 13) % 25 < 10) {
      waveModifier = WaveModifier.values[1 + ((seed + day * 3) % 4)];
    } else {
      waveModifier = WaveModifier.none;
    }

    int budget = rawBudget;
    if (waveModifier == WaveModifier.horde) {
      budget = (budget * 1.35).floor();
    }
    if (milestone) {
      final int devourers = min(3, milestoneNumber);
      for (int index = 0; index < devourers; index++) {
        _spawnQueue.add(EnemyKind.devourer);
        budget = max(0, budget - EnemyKind.devourer.budget);
      }
    }
    final int targetCap = min(180, max(10, budget ~/ 2));
    int unitCount = _spawnQueue.length;
    while (budget >= 2 && unitCount < targetCap) {
      EnemyKind kind;
      final double roll = _random.nextDouble();
      if (day >= 5 && roll < 0.08 && budget >= EnemyKind.banshee.budget) {
        kind = EnemyKind.banshee;
      } else if (day >= 3 && roll < 0.18 && budget >= EnemyKind.brute.budget) {
        kind = EnemyKind.brute;
      } else if (day >= 2 &&
          roll < 0.36 &&
          budget >= EnemyKind.spitter.budget) {
        kind = EnemyKind.spitter;
      } else {
        kind = EnemyKind.crawler;
      }
      _spawnQueue.add(kind);
      budget -= kind.budget;
      unitCount++;
    }
    final int representedBudget = _spawnQueue.fold<int>(
      0,
      (int total, EnemyKind kind) => total + kind.budget,
    );
    _eliteMultiplier = max(1, rawBudget / max(1, representedBudget));
    final Map<EnemyKind, int> composition = <EnemyKind, int>{};
    for (final EnemyKind kind in _spawnQueue) {
      composition[kind] = (composition[kind] ?? 0) + 1;
    }
    waveComposition = composition;
    final int bosses = waveComposition[EnemyKind.devourer] ?? 0;
    _events.add(
      SanctuaryEvent(
        SanctuaryEventKind.waveForecast,
        message: milestone
            ? 'MILESTONE NIGHT · ${bosses}x Devourer · every rift opens'
            : 'Scouts report ${waveLanes.length} active rifts'
              '${waveModifier.isActive ? ' · ${waveModifier.label}' : ''}',
      ),
    );
  }

  void _spawnEnemy(EnemyKind kind) {
    final List<GridPoint> lanes = waveLanes.isEmpty
        ? _spawnPoints
        : waveLanes;
    final GridPoint spawn = lanes[_random.nextInt(lanes.length)];
    double hpScale = _eliteMultiplier;
    if (waveModifier == WaveModifier.armored) {
      hpScale *= 1.4;
    } else if (waveModifier == WaveModifier.horde) {
      hpScale *= 0.75;
    }
    if (kind == EnemyKind.devourer && isMilestoneNight) {
      hpScale *= 1 + ((day ~/ milestoneInterval) - 1) * 0.35;
    }
    final double maxHp = kind.maxHp * hpScale;
    enemies.add(
      SanctuaryEnemy(
        id: _nextEnemyId++,
        kind: kind,
        x: spawn.x + 0.5,
        y: spawn.y + 0.5,
        maxHp: maxHp,
      ),
    );
    if (kind == EnemyKind.brute || kind == EnemyKind.devourer) {
      shake = max(shake, kind == EnemyKind.devourer ? 1 : 0.3);
      _events.add(
        SanctuaryEvent(
          SanctuaryEventKind.impact,
          tile: spawn,
          message: kind == EnemyKind.devourer
              ? 'The Devourer has come'
              : 'Brute breach warning',
        ),
      );
    }
  }

  List<GridPoint> get _spawnPoints {
    final int c = mapSize ~/ 2;
    final int radius = min(13, c - 2);
    return <GridPoint>[
      GridPoint(c, c - radius),
      GridPoint(c + radius, c),
      GridPoint(c, c + radius),
      GridPoint(c - radius, c),
    ];
  }

  void _addDamageText(SanctuaryEnemy target, double damage) {
    if (_dmgTextCooldown > 0) {
      return;
    }
    _dmgTextCooldown = 0.12;
    final int count = effects
        .where((SanctuaryEffect effect) => effect.kind.startsWith('dmg'))
        .length;
    if (count >= 8) {
      return;
    }
    effects.add(
      SanctuaryEffect(
        kind: 'dmg',
        x: target.x,
        y: target.y,
        text: '-${damage.round()}',
        life: 0.7,
      ),
    );
  }

  void _updateDefenses(double dt) {
    for (final SanctuaryBuilding building in buildings) {
      if (!building.complete || building.hp <= 0) {
        continue;
      }
      building.cooldown = max(0, building.cooldown - dt);
      if (building.kind == BuildingKind.frostSpire) {
        for (final SanctuaryEnemy enemy in enemies) {
          if (_distanceBuildingEnemySquared(building, enemy) <= 20.25) {
            enemy
              ..slowTime = max(enemy.slowTime, 0.25)
              ..hp -= 15 * dt;
          }
        }
        continue;
      }
      if (building.kind == BuildingKind.solarBeacon) {
        for (final SanctuaryEnemy enemy in enemies) {
          if (_distanceBuildingEnemySquared(building, enemy) <= 36) {
            enemy.hp -= (enemy.kind == EnemyKind.banshee ? 28 : 8) * dt;
          }
        }
        continue;
      }
      final bool arrow = building.kind == BuildingKind.arrowTower;
      final bool ballista = building.kind == BuildingKind.ballista;
      final bool catapult = building.kind == BuildingKind.catapult;
      if ((!arrow && !ballista && !catapult) ||
          building.cooldown > 0 ||
          enemies.isEmpty) {
        continue;
      }
      final double range = arrow
          ? 5.5
          : ballista
          ? 7.5
          : 9;
      final double hearthX = hearthTile.x + 0.5;
      final double hearthY = hearthTile.y + 0.5;
      SanctuaryEnemy? target;
      double bestScore = double.negativeInfinity;
      final double rangeSquared = range * range;
      for (final SanctuaryEnemy enemy in enemies) {
        final double distanceSquared = _distanceBuildingEnemySquared(
          building,
          enemy,
        );
        if (distanceSquared <= rangeSquared &&
            (!catapult || distanceSquared >= 9)) {
          final double score = switch (building.stance) {
            TowerStance.nearest => -distanceSquared,
            TowerStance.vanguard => -((enemy.x - hearthX) * (enemy.x -
                    hearthX) +
                (enemy.y - hearthY) * (enemy.y - hearthY)),
            TowerStance.strongest => enemy.hp,
          };
          if (score > bestScore) {
            target = enemy;
            bestScore = score;
          }
        }
      }
      if (target == null) {
        continue;
      }
      final bool supplied = building.ammo > 0;
      double? directDamage;
      if (catapult && supplied) {
        _damageEnemies(
          GridPoint(target.x.floor(), target.y.floor()),
          radius: 2.5,
          damage: 110,
        );
        directDamage = 110;
      } else {
        directDamage = supplied ? (arrow ? 18 : 95) : 4;
        target.hp -= directDamage;
      }
      if (supplied) {
        building.ammo--;
      }
      _addDamageText(target, directDamage);
      effects.add(
        SanctuaryEffect(
          kind: arrow ? 'projArrow' : ballista ? 'projBallista' : 'projCatapult',
          x: building.tile.x + 0.5,
          y: building.tile.y + 0.5,
          x2: target.x,
          y2: target.y,
          life: arrow ? 0.18 : ballista ? 0.3 : 0.55,
        ),
      );
      final double attackSpeed =
          1 + (upgrades[AncestralUpgrade.arcaneTurrets] ?? 0) * 0.05;
      building.cooldown =
          (arrow
              ? 0.64
              : catapult
              ? 2.2
              : 1.45) /
          attackSpeed;
      if (_towerFeedbackCooldown <= 0) {
        _towerFeedbackCooldown = 0.3;
        _events.add(
          SanctuaryEvent(SanctuaryEventKind.towerShot, tile: building.tile),
        );
      }
    }
    _removeDefeatedEnemies();
  }

  void _updateEnemies(double dt) {
    hearthUnderAttack = false;
    for (final SanctuaryEnemy enemy in enemies) {
      enemy.attackCooldown = max(0, enemy.attackCooldown - dt);
      if (enemy.slowTime > 0) {
        enemy.slowTime -= dt;
      }
      final double dxHearth = hearthTile.x + 0.5 - enemy.x;
      final double dyHearth = hearthTile.y + 0.5 - enemy.y;
      final double hearthDistanceSquared =
          dxHearth * dxHearth + dyHearth * dyHearth;
      if (hearthDistanceSquared < 0.7225) {
        hearthUnderAttack = true;
        _damageBuilding(hearth, enemy.kind.hearthDamage * dt);
        continue;
      }

      if (enemy.kind == EnemyKind.spitter) {
        final SanctuaryBuilding? target = _nearestDefensiveBuilding(
          enemy,
          maxRange: 6.5,
        );
        if (target != null && enemy.attackCooldown <= 0) {
          _damageBuilding(target, 35);
          enemy.attackCooldown = 2.2;
          effects.add(
            SanctuaryEffect(
              kind: 'acid',
              x: target.tile.x + 0.5,
              y: target.tile.y + 0.5,
            ),
          );
          continue;
        }
      }

      if (enemy.kind == EnemyKind.brute || enemy.kind == EnemyKind.devourer) {
        final SanctuaryBuilding? blocker = _buildingTowardHearth(enemy);
        if (blocker != null && blocker.kind != BuildingKind.hearth) {
          _damageBuilding(
            blocker,
            enemy.kind.hearthDamage *
                (enemy.kind == EnemyKind.brute ? 2 : 1) *
                dt,
          );
          continue;
        }
      }

      int cellX = enemy.x.floor().clamp(0, mapSize - 1);
      int cellY = enemy.y.floor().clamp(0, mapSize - 1);
      final double terrainScale = terrainAtXY(cellX, cellY) == TerrainKind.river
          ? 0.35
          : 1;
      final double speedScale = (enemy.slowTime > 0 ? 0.45 : 1) * terrainScale;
      final double swiftScale = waveModifier == WaveModifier.swift ? 1.3 : 1;
      final double speed = enemy.kind.speed * speedScale * swiftScale * dt;
      if (enemy.kind == EnemyKind.banshee) {
        _moveEnemyToward(enemy, hearthTile.x + 0.5, hearthTile.y + 0.5, speed);
      } else {
        final int nextIndex = _lowestFlowNeighborIndex(cellX, cellY);
        if (nextIndex < 0) {
          final SanctuaryBuilding? blocker = _nearestBlockingBuilding(
            enemy,
            1.6,
          );
          if (blocker != null) {
            _damageBuilding(blocker, enemy.kind.hearthDamage * dt);
          }
        } else {
          final int nextX = nextIndex % mapSize;
          final int nextY = nextIndex ~/ mapSize;
          final SanctuaryBuilding? gate = _buildingAtXY(nextX, nextY);
          if (gate != null && gate.kind == BuildingKind.gate) {
            _damageBuilding(gate, enemy.kind.hearthDamage * dt);
          } else {
            _moveEnemyToward(enemy, nextX + 0.5, nextY + 0.5, speed);
          }
        }
      }

      cellX = enemy.x.floor().clamp(0, mapSize - 1);
      cellY = enemy.y.floor().clamp(0, mapSize - 1);
      final SanctuaryBuilding? trap = _buildingAtXY(cellX, cellY);
      if (trap != null &&
          trap.kind == BuildingKind.spikeTrench &&
          trap.triggers > 0) {
        enemy.hp -= 45;
        enemy.slowTime = max(enemy.slowTime, 2);
        trap.triggers--;
        _addDamageText(enemy, 45);
        if (trap.triggers <= 0) {
          trap.hp = 0;
        }
      }
      if (trap != null && trap.kind == BuildingKind.tarPit) {
        enemy.slowTime = max(enemy.slowTime, 0.3);
        if (trap.cooldown > 0) {
          enemy.hp -= 120 * dt;
        }
      }
    }
    final int buildingCount = buildings.length;
    final List<SanctuaryBuilding> destroyed = buildings
        .where(
          (SanctuaryBuilding building) =>
              building.hp <= 0 && building.kind != BuildingKind.hearth,
        )
        .toList();
    buildings.removeWhere(
      (SanctuaryBuilding building) =>
          building.hp <= 0 && building.kind != BuildingKind.hearth,
    );
    if (buildings.length != buildingCount) {
      buildingsLostTonight += buildingCount - buildings.length;
      _reindexBuildings();
      shake = max(shake, 0.45);
      for (final SanctuaryBuilding ruin in destroyed) {
        _efficiencyCache.remove(ruin.id);
        effects.add(
          SanctuaryEffect(
            kind: 'collapse',
            x: ruin.tile.x + 0.5,
            y: ruin.tile.y + 0.5,
            life: 0.9,
          ),
        );
      }
      final List<SanctuaryBuilding> destroyedStores = destroyed
          .where((SanctuaryBuilding building) => building.kind == BuildingKind.stockpile)
          .toList();
      if (destroyedStores.isNotEmpty) {
        final double spill = pow(0.8, destroyedStores.length).toDouble();
        resources
          ..timber *= spill
          ..stone *= spill
          ..food *= spill;
        for (final SanctuaryBuilding store in destroyedStores) {
          effects.add(
            SanctuaryEffect(
              kind: 'spill',
              x: store.tile.x + 0.5,
              y: store.tile.y + 0.5,
            ),
          );
        }
      }
      _recomputeFlow();
    }
    if (hearthUnderAttack && citizens.isNotEmpty) {
      _hearthDangerAccumulator += dt;
      if (_hearthDangerAccumulator >= 8) {
        _hearthDangerAccumulator = 0;
        citizens.removeLast();
        citizensLostTonight++;
        morale = max(0, morale - 12);
        _events.add(
          const SanctuaryEvent(
            SanctuaryEventKind.citizenLost,
            message: 'A villager was lost at the Hearth',
          ),
        );
      }
    } else {
      _hearthDangerAccumulator = max(0, _hearthDangerAccumulator - dt * 2);
    }
    _removeDefeatedEnemies();
    if (hearth.hp <= 0) {
      _fallSettlement();
    }
  }

  void _moveEnemyToward(
    SanctuaryEnemy enemy,
    double targetX,
    double targetY,
    double distance,
  ) {
    final double dx = targetX - enemy.x;
    final double dy = targetY - enemy.y;
    final double length = sqrt(dx * dx + dy * dy);
    if (length > 0.02) {
      enemy.x += dx / length * min(length, distance);
      enemy.y += dy / length * min(length, distance);
    }
  }

  SanctuaryBuilding? _buildingTowardHearth(SanctuaryEnemy enemy) {
    final double dx = hearthTile.x + 0.5 - enemy.x;
    final double dy = hearthTile.y + 0.5 - enemy.y;
    final double length = sqrt(dx * dx + dy * dy);
    if (length == 0) {
      return hearth;
    }
    final GridPoint ahead = GridPoint(
      (enemy.x + dx / length * 0.8).floor().clamp(0, mapSize - 1),
      (enemy.y + dy / length * 0.8).floor().clamp(0, mapSize - 1),
    );
    return buildingAt(ahead);
  }

  SanctuaryBuilding? _nearestDefensiveBuilding(
    SanctuaryEnemy enemy, {
    required double maxRange,
  }) {
    SanctuaryBuilding? result;
    double bestSquared = maxRange * maxRange;
    for (final SanctuaryBuilding building in buildings) {
      if (!building.kind.defensive || !building.complete) {
        continue;
      }
      final double distanceSquared = _distanceBuildingEnemySquared(
        building,
        enemy,
      );
      if (distanceSquared < bestSquared) {
        bestSquared = distanceSquared;
        result = building;
      }
    }
    return result;
  }

  SanctuaryBuilding? _nearestBlockingBuilding(
    SanctuaryEnemy enemy,
    double range,
  ) {
    SanctuaryBuilding? result;
    double bestSquared = range * range;
    for (final SanctuaryBuilding building in buildings) {
      if (!building.complete || !building.kind.blocksGround) {
        continue;
      }
      final double distanceSquared = _distanceBuildingEnemySquared(
        building,
        enemy,
      );
      if (distanceSquared < bestSquared) {
        bestSquared = distanceSquared;
        result = building;
      }
    }
    return result;
  }

  double _distanceBuildingEnemySquared(
    SanctuaryBuilding building,
    SanctuaryEnemy enemy,
  ) {
    final double dx = building.tile.x + 0.5 - enemy.x;
    final double dy = building.tile.y + 0.5 - enemy.y;
    return dx * dx + dy * dy;
  }

  void _damageBuilding(SanctuaryBuilding building, double amount) {
    building.hp -= amount;
    if (amount > 25) {
      _events.add(
        SanctuaryEvent(SanctuaryEventKind.impact, tile: building.tile),
      );
    }
  }

  void _damageEnemies(
    GridPoint center, {
    required double radius,
    required double damage,
    double stun = 0,
  }) {
    final double radiusSquared = radius * radius;
    for (final SanctuaryEnemy enemy in enemies) {
      final double dx = enemy.x - center.x - 0.5;
      final double dy = enemy.y - center.y - 0.5;
      if (dx * dx + dy * dy <= radiusSquared) {
        enemy.hp -= damage;
        enemy.slowTime = max(enemy.slowTime, stun);
      }
    }
    _removeDefeatedEnemies();
  }

  void _removeDefeatedEnemies() {
    final List<SanctuaryEnemy> dead = enemies
        .where((SanctuaryEnemy enemy) => enemy.hp <= 0)
        .toList();
    if (dead.isEmpty) {
      return;
    }
    for (final SanctuaryEnemy enemy in dead) {
      enemies.remove(enemy);
      effects.add(
        SanctuaryEffect(
          kind: enemy.kind == EnemyKind.brute || enemy.kind == EnemyKind.devourer
              ? 'deathBig'
              : 'death',
          x: enemy.x,
          y: enemy.y,
          life: enemy.kind == EnemyKind.devourer ? 1.2 : 0.45,
        ),
      );
    }
    enemiesDefeatedTonight += dead.length;
    totalEnemiesDefeated += dead.length;
    resources.mana = min(manaCap, resources.mana + dead.length * 1.5);
  }

  void _tickFissures(double dt) {
    bool changed = false;
    final List<int> expired = <int>[];
    for (final MapEntry<int, double> entry in fissures.entries) {
      final double remaining = entry.value - dt;
      if (remaining <= 0) {
        expired.add(entry.key);
      } else {
        fissures[entry.key] = remaining;
      }
    }
    for (final int index in expired) {
      fissures.remove(index);
      changed = true;
    }
    if (changed) {
      _recomputeFlow();
    }
  }

  void _resolveDawn() {
    resources.mana = min(manaCap, resources.mana + enemies.length * 0.6);
    totalEnemiesDefeated += enemies.length;
    enemiesDefeatedTonight += enemies.length;
    enemies.clear();
    _spawnQueue.clear();
    final double integrity = buildings.isEmpty
        ? 0
        : buildings
                  .map((SanctuaryBuilding value) => value.healthRatio)
                  .reduce((double a, double b) => a + b) /
              buildings.length;
    final NightOath? completedOath = nightOath;
    final bool oathSucceeded = switch (completedOath) {
      NightOath.holdTheLine => buildingsLostTonight == 0,
      NightOath.divineRestraint => powersCastTonight <= 1,
      NightOath.cinderHarvest => enemiesDefeatedTonight >= oathTarget,
      null => false,
    };
    if (completedOath != null) {
      if (oathSucceeded) {
        ancestralShards++;
        oathsFulfilled++;
        morale = min(100, morale + 6);
        resources.mana = min(manaCap, resources.mana + 12);
      } else {
        morale = max(0, morale - 2);
      }
      _events.add(
        SanctuaryEvent(
          SanctuaryEventKind.oathResolved,
          message: oathSucceeded
              ? '${completedOath.label} fulfilled · +1 shard'
              : '${completedOath.label} broken',
        ),
      );
    }
    if (isMilestoneNight) {
      final int milestoneNumber = day ~/ milestoneInterval;
      final int award = 2 + milestoneNumber;
      milestonesSealed++;
      ancestralShards += award;
      morale = min(100, morale + 10);
      _events.add(
        SanctuaryEvent(
          SanctuaryEventKind.milestoneSealed,
          message:
              'MILESTONE SEALED · Night $day held · +$award Ancestral Shards',
        ),
      );
    }
    morale =
        (morale +
                (citizensLostTonight == 0 ? 2 : -citizensLostTonight * 6) -
                buildingsLostTonight)
            .clamp(0, 100)
            .toDouble();
    final double bonus =
        8 + integrity * 12 + (citizensLostTonight == 0 ? 15 : 0);
    resources.mana = min(manaCap, resources.mana + bonus);
    _events.add(
      SanctuaryEvent(
        SanctuaryEventKind.dawn,
        message: 'Dawn secured · +${bonus.round()} mana',
      ),
    );
  }

  void _beginDay() {
    final double foodRequired = citizens.length.toDouble();
    if (resources.food >= foodRequired) {
      resources.food -= foodRequired;
      for (final SanctuaryCitizen citizen in citizens) {
        citizen.hunger = max(0, citizen.hunger - 45);
      }
    } else {
      final int losses = min(
        citizens.length,
        ((foodRequired - resources.food) / 4).ceil(),
      );
      resources.food = 0;
      if (losses > 0) {
        citizens.removeRange(max(0, citizens.length - losses), citizens.length);
      }
    }
    final int openHomes = populationCapacity - citizens.length;
    if (resources.food > 20 && openHomes > 0) {
      final int arrivals = min(openHomes, 1 + day % 3);
      for (int index = 0; index < arrivals; index++) {
        citizens.add(
          SanctuaryCitizen(
            id: _nextCitizenId++,
            role: CitizenRole.harvester,
            x: hearthTile.x + 0.5,
            y: hearthTile.y + 1.5,
          ),
        );
      }
    }
    _assignRoles();
    encounter = SanctuaryEncounterKind
        .values[(seed + day * 7) % SanctuaryEncounterKind.values.length];
    _events.add(
      SanctuaryEvent(
        SanctuaryEventKind.encounterAvailable,
        message: encounter!.title,
      ),
    );
  }

  void _fallSettlement() {
    phase = SanctuaryPhase.fallen;
    paused = false;
    final int earned = max(1, (day * 2 + totalEnemiesDefeated / 12).floor());
    ancestralShards += earned;
    _events.add(
      SanctuaryEvent(
        SanctuaryEventKind.settlementFallen,
        tile: hearthTile,
        message: '+$earned Ancestral Shards',
      ),
    );
  }

  bool _pathsRemainOpen(GridPoint tentativeBlock) {
    final Set<int> visited = <int>{hearthTile.index(mapSize)};
    final Queue<GridPoint> queue = Queue<GridPoint>()..add(hearthTile);
    while (queue.isNotEmpty) {
      final GridPoint current = queue.removeFirst();
      for (final GridPoint neighbor in _neighbors(current)) {
        final int index = neighbor.index(mapSize);
        if (visited.contains(index) ||
            neighbor == tentativeBlock ||
            !_placementPathPassable(neighbor)) {
          continue;
        }
        visited.add(index);
        queue.add(neighbor);
      }
    }
    return _spawnPoints.every(
      (GridPoint point) => visited.contains(point.index(mapSize)),
    );
  }

  bool _cachedPathsRemainOpen(GridPoint tentativeBlock) {
    final int tileIndex = tentativeBlock.index(mapSize);
    if (_cachedPathTile == tileIndex &&
        _cachedPathRevision == _topologyRevision) {
      return _cachedPathResult;
    }
    _cachedPathTile = tileIndex;
    _cachedPathRevision = _topologyRevision;
    _cachedPathResult = _pathsRemainOpen(tentativeBlock);
    return _cachedPathResult;
  }

  void _reindexBuildings() {
    _buildingsByTile.clear();
    for (final SanctuaryBuilding building in buildings) {
      if (building.hp > 0) {
        _buildingsByTile[building.tile.index(mapSize)] = building;
      }
    }
  }

  void _recomputeFlow() {
    _topologyRevision++;
    _flow.fillRange(0, _flow.length, -1);
    final Queue<GridPoint> queue = Queue<GridPoint>()..add(hearthTile);
    _flow[hearthTile.index(mapSize)] = 0;
    while (queue.isNotEmpty) {
      final GridPoint current = queue.removeFirst();
      final int nextCost = _flow[current.index(mapSize)] + 1;
      for (final GridPoint neighbor in _neighbors(current)) {
        final int index = neighbor.index(mapSize);
        if (_flow[index] >= 0 ||
            !_groundPassable(neighbor, allowHearth: true)) {
          continue;
        }
        _flow[index] = nextCost;
        queue.add(neighbor);
      }
    }
  }

  int _lowestFlowNeighborIndex(int x, int y) {
    final int currentIndex = y * mapSize + x;
    int bestIndex = -1;
    int bestCost = _flow[currentIndex];
    if (bestCost < 0) {
      bestCost = 1 << 30;
    }
    if (y > 0) {
      final int index = currentIndex - mapSize;
      final int cost = _flow[index];
      if (cost >= 0 && cost < bestCost) {
        bestIndex = index;
        bestCost = cost;
      }
    }
    if (x < mapSize - 1) {
      final int index = currentIndex + 1;
      final int cost = _flow[index];
      if (cost >= 0 && cost < bestCost) {
        bestIndex = index;
        bestCost = cost;
      }
    }
    if (y < mapSize - 1) {
      final int index = currentIndex + mapSize;
      final int cost = _flow[index];
      if (cost >= 0 && cost < bestCost) {
        bestIndex = index;
        bestCost = cost;
      }
    }
    if (x > 0) {
      final int index = currentIndex - 1;
      final int cost = _flow[index];
      if (cost >= 0 && cost < bestCost) {
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  bool _groundPassable(GridPoint tile, {bool allowHearth = false}) {
    if (!inBounds(tile) || fissures.containsKey(tile.index(mapSize))) {
      return false;
    }
    final TerrainKind terrain = terrainAt(tile);
    if (terrain == TerrainKind.chasm || terrain == TerrainKind.granite) {
      return false;
    }
    final SanctuaryBuilding? building = buildingAt(tile);
    if (building == null || !building.complete) {
      return true;
    }
    if (allowHearth && building.kind == BuildingKind.hearth) {
      return true;
    }
    if (building.kind == BuildingKind.gate ||
        building.kind == BuildingKind.spikeTrench ||
        building.kind == BuildingKind.tarPit) {
      return true;
    }
    return !building.kind.blocksGround;
  }

  bool _placementPathPassable(GridPoint tile) {
    if (!inBounds(tile) || fissures.containsKey(tile.index(mapSize))) {
      return false;
    }
    final TerrainKind terrain = terrainAt(tile);
    if (terrain == TerrainKind.chasm || terrain == TerrainKind.granite) {
      return false;
    }
    final SanctuaryBuilding? building = buildingAt(tile);
    if (building == null || building.kind == BuildingKind.hearth) {
      return true;
    }
    return building.kind == BuildingKind.gate ||
        building.kind == BuildingKind.spikeTrench ||
        building.kind == BuildingKind.tarPit ||
        !building.kind.blocksGround;
  }

  double _maxHpFor(BuildingKind kind) {
    final bool masonryApplies =
        kind == BuildingKind.palisade ||
        kind == BuildingKind.rampart ||
        kind == BuildingKind.gate;
    if (!masonryApplies) {
      return kind.maxHp;
    }
    return kind.maxHp *
        (1 + (upgrades[AncestralUpgrade.masterMasonry] ?? 0) * 0.08);
  }

  void _enforceStorageCaps() {
    final double capacity = storageCapacity;
    resources
      ..timber = min(resources.timber, capacity)
      ..stone = min(resources.stone, capacity)
      ..food = min(resources.food, capacity)
      ..planks = min(resources.planks, capacity)
      ..masonry = min(resources.masonry, capacity);
  }

  List<GridPoint> _neighbors(GridPoint tile) => <GridPoint>[
    if (tile.y > 0) GridPoint(tile.x, tile.y - 1),
    if (tile.x < mapSize - 1) GridPoint(tile.x + 1, tile.y),
    if (tile.y < mapSize - 1) GridPoint(tile.x, tile.y + 1),
    if (tile.x > 0) GridPoint(tile.x - 1, tile.y),
  ];
}

extension GodPowerData on GodPower {
  String get label => switch (this) {
    GodPower.lightning => 'Divine Lightning',
    GodPower.rain => 'Cleansing Rain',
    GodPower.fissure => 'Seismic Fissure',
    GodPower.meteor => 'Celestial Meteor',
  };

  int get manaCost => switch (this) {
    GodPower.lightning => 15,
    GodPower.rain => 25,
    GodPower.fissure => 50,
    GodPower.meteor => 80,
  };
}

Map<String, dynamic> _map(Object? value) {
  if (value is! Map) {
    return <String, dynamic>{};
  }
  return value.map(
    (dynamic key, dynamic item) =>
        MapEntry<String, dynamic>(key.toString(), item),
  );
}

List<Map<String, dynamic>> _mapList(Object? value) {
  if (value is! List) {
    return <Map<String, dynamic>>[];
  }
  return value.whereType<Map>().map(_map).toList();
}
