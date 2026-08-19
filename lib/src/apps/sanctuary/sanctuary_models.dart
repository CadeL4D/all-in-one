import 'dart:math';

enum SanctuaryPhase { day, dusk, night, dawn, fallen }

enum TerrainKind { grass, forest, granite, river, chasm, holyGround }

enum CitizenRole { harvester, builder, hauler, acolyte }

enum CitizenState { idle, working, carrying, praying, sheltering }

enum EnemyKind { crawler, brute, spitter, banshee, devourer }

enum BuildingKind {
  hearth,
  cottage,
  stockpile,
  farm,
  sawmill,
  masonryYard,
  palisade,
  rampart,
  gate,
  spikeTrench,
  tarPit,
  arrowTower,
  ballista,
  catapult,
  frostSpire,
  solarBeacon,
  shrine,
}

enum GodPower { lightning, rain, fissure, meteor }

enum TowerStance { nearest, vanguard, strongest }

enum WaveModifier { none, swift, armored, horde, eclipse }

enum AncestralUpgrade {
  divineMight,
  masterMasonry,
  swiftSettlers,
  overchargedShrines,
  arcaneTurrets,
}

enum SanctuaryEncounterKind {
  lostCaravan,
  singingStones,
  woundedStag,
  emberWind,
}

enum NightOath { holdTheLine, divineRestraint, cinderHarvest }

enum PlacementFailure {
  none,
  fog,
  occupied,
  terrain,
  resources,
  blocksAllPaths,
  tooCloseToHearth,
}

class GridPoint {
  const GridPoint(this.x, this.y);

  final int x;
  final int y;

  int index(int mapSize) => y * mapSize + x;

  int manhattanTo(GridPoint other) => (x - other.x).abs() + (y - other.y).abs();

  double distanceTo(GridPoint other) {
    final int dx = x - other.x;
    final int dy = y - other.y;
    return sqrt(dx * dx + dy * dy);
  }

  Map<String, dynamic> toJson() => <String, dynamic>{'x': x, 'y': y};

  factory GridPoint.fromJson(Map<String, dynamic> json) => GridPoint(
    (json['x'] as num?)?.toInt() ?? 0,
    (json['y'] as num?)?.toInt() ?? 0,
  );

  @override
  bool operator ==(Object other) =>
      other is GridPoint && other.x == x && other.y == y;

  @override
  int get hashCode => Object.hash(x, y);
}

class SanctuaryResources {
  SanctuaryResources({
    this.timber = 90,
    this.stone = 65,
    this.food = 80,
    this.iron = 8,
    this.mana = 60,
    this.planks = 0,
    this.masonry = 0,
    this.crystals = 0,
  });

  double timber;
  double stone;
  double food;
  double iron;
  double mana;
  double planks;
  double masonry;
  double crystals;

  bool canAfford(BuildingCost cost) =>
      timber >= cost.timber &&
      stone >= cost.stone &&
      iron >= cost.iron &&
      planks >= cost.planks &&
      masonry >= cost.masonry &&
      crystals >= cost.crystals;

  void spend(BuildingCost cost) {
    timber -= cost.timber;
    stone -= cost.stone;
    iron -= cost.iron;
    planks -= cost.planks;
    masonry -= cost.masonry;
    crystals -= cost.crystals;
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'timber': timber,
    'stone': stone,
    'food': food,
    'iron': iron,
    'mana': mana,
    'planks': planks,
    'masonry': masonry,
    'crystals': crystals,
  };

  factory SanctuaryResources.fromJson(Map<String, dynamic> json) =>
      SanctuaryResources(
        timber: (json['timber'] as num?)?.toDouble() ?? 90,
        stone: (json['stone'] as num?)?.toDouble() ?? 65,
        food: (json['food'] as num?)?.toDouble() ?? 80,
        iron: (json['iron'] as num?)?.toDouble() ?? 8,
        mana: (json['mana'] as num?)?.toDouble() ?? 60,
        planks: (json['planks'] as num?)?.toDouble() ?? 0,
        masonry: (json['masonry'] as num?)?.toDouble() ?? 0,
        crystals: (json['crystals'] as num?)?.toDouble() ?? 0,
      );
}

class BuildingCost {
  const BuildingCost({
    this.timber = 0,
    this.stone = 0,
    this.iron = 0,
    this.planks = 0,
    this.masonry = 0,
    this.crystals = 0,
  });

  final double timber;
  final double stone;
  final double iron;
  final double planks;
  final double masonry;
  final double crystals;

  String get compact {
    final List<String> parts = <String>[
      if (timber > 0) '${timber.round()} wood',
      if (stone > 0) '${stone.round()} stone',
      if (iron > 0) '${iron.round()} iron',
      if (planks > 0) '${planks.round()} plank',
      if (masonry > 0) '${masonry.round()} cut stone',
      if (crystals > 0) '${crystals.round()} crystal',
    ];
    return parts.join(' · ');
  }
}

extension BuildingKindData on BuildingKind {
  String get label => switch (this) {
    BuildingKind.hearth => 'Sacred Hearth',
    BuildingKind.cottage => 'Cottage',
    BuildingKind.stockpile => 'Stockpile',
    BuildingKind.farm => 'Farmstead',
    BuildingKind.sawmill => 'Sawmill',
    BuildingKind.masonryYard => 'Masonry Yard',
    BuildingKind.palisade => 'Palisade',
    BuildingKind.rampart => 'Rampart',
    BuildingKind.gate => 'Portcullis',
    BuildingKind.spikeTrench => 'Spike Trench',
    BuildingKind.tarPit => 'Tar Pit',
    BuildingKind.arrowTower => 'Arrow Sentry',
    BuildingKind.ballista => 'Ballista',
    BuildingKind.catapult => 'Catapult Mortar',
    BuildingKind.frostSpire => 'Frost Spire',
    BuildingKind.solarBeacon => 'Solar Beacon',
    BuildingKind.shrine => 'Mana Shrine',
  };

  String get shortLabel => switch (this) {
    BuildingKind.arrowTower => 'Sentry',
    BuildingKind.spikeTrench => 'Spikes',
    BuildingKind.frostSpire => 'Frost',
    BuildingKind.stockpile => 'Store',
    BuildingKind.masonryYard => 'Masonry',
    BuildingKind.catapult => 'Mortar',
    BuildingKind.solarBeacon => 'Solar',
    _ => label,
  };

  BuildingCost get cost => switch (this) {
    BuildingKind.hearth => const BuildingCost(),
    BuildingKind.cottage => const BuildingCost(timber: 15),
    BuildingKind.stockpile => const BuildingCost(timber: 20, stone: 8),
    BuildingKind.farm => const BuildingCost(timber: 20),
    BuildingKind.sawmill => const BuildingCost(timber: 30, stone: 10),
    BuildingKind.masonryYard => const BuildingCost(timber: 40, stone: 30),
    BuildingKind.palisade => const BuildingCost(timber: 4),
    BuildingKind.rampart => const BuildingCost(stone: 8, planks: 2),
    BuildingKind.gate => const BuildingCost(stone: 20, iron: 10),
    BuildingKind.spikeTrench => const BuildingCost(timber: 8),
    BuildingKind.tarPit => const BuildingCost(stone: 12),
    BuildingKind.arrowTower => const BuildingCost(timber: 25, stone: 10),
    BuildingKind.ballista => const BuildingCost(timber: 40, stone: 25, iron: 5),
    BuildingKind.catapult => const BuildingCost(timber: 60, stone: 50),
    BuildingKind.frostSpire => const BuildingCost(stone: 35, crystals: 10),
    BuildingKind.solarBeacon => const BuildingCost(stone: 45, crystals: 15),
    BuildingKind.shrine => const BuildingCost(timber: 30, stone: 30),
  };

  double get maxHp => switch (this) {
    BuildingKind.hearth => 2500,
    BuildingKind.cottage => 350,
    BuildingKind.stockpile => 500,
    BuildingKind.farm => 400,
    BuildingKind.sawmill => 600,
    BuildingKind.masonryYard => 850,
    BuildingKind.palisade => 450,
    BuildingKind.rampart => 1800,
    BuildingKind.gate => 2200,
    BuildingKind.spikeTrench => 300,
    BuildingKind.tarPit => 500,
    BuildingKind.arrowTower => 650,
    BuildingKind.ballista => 900,
    BuildingKind.catapult => 1100,
    BuildingKind.frostSpire => 750,
    BuildingKind.solarBeacon => 800,
    BuildingKind.shrine => 700,
  };

  double get buildWork => switch (this) {
    BuildingKind.hearth => 0,
    BuildingKind.palisade => 8,
    BuildingKind.spikeTrench || BuildingKind.tarPit => 10,
    BuildingKind.cottage || BuildingKind.farm => 18,
    BuildingKind.stockpile ||
    BuildingKind.arrowTower ||
    BuildingKind.sawmill => 24,
    BuildingKind.rampart ||
    BuildingKind.shrine ||
    BuildingKind.masonryYard => 32,
    BuildingKind.gate ||
    BuildingKind.ballista ||
    BuildingKind.catapult ||
    BuildingKind.frostSpire ||
    BuildingKind.solarBeacon => 40,
  };

  bool get blocksGround => switch (this) {
    BuildingKind.hearth ||
    BuildingKind.palisade ||
    BuildingKind.rampart ||
    BuildingKind.gate ||
    BuildingKind.cottage ||
    BuildingKind.stockpile ||
    BuildingKind.farm ||
    BuildingKind.sawmill ||
    BuildingKind.masonryYard ||
    BuildingKind.arrowTower ||
    BuildingKind.ballista ||
    BuildingKind.catapult ||
    BuildingKind.frostSpire ||
    BuildingKind.solarBeacon ||
    BuildingKind.shrine => true,
    BuildingKind.spikeTrench || BuildingKind.tarPit => false,
  };

  bool get defensive => switch (this) {
    BuildingKind.palisade ||
    BuildingKind.rampart ||
    BuildingKind.gate ||
    BuildingKind.spikeTrench ||
    BuildingKind.tarPit ||
    BuildingKind.arrowTower ||
    BuildingKind.ballista ||
    BuildingKind.catapult ||
    BuildingKind.frostSpire ||
    BuildingKind.solarBeacon => true,
    _ => false,
  };
}

class SanctuaryBuilding {
  SanctuaryBuilding({
    required this.id,
    required this.kind,
    required this.tile,
    double? hp,
    this.buildProgress = 0,
    this.ammo = 20,
    this.cooldown = 0,
    this.triggers = 10,
    this.stance = TowerStance.nearest,
  }) : hp = hp ?? kind.maxHp;

  final String id;
  final BuildingKind kind;
  final GridPoint tile;
  double hp;
  double buildProgress;
  int ammo;
  double cooldown;
  int triggers;
  TowerStance stance;

  bool get complete =>
      kind == BuildingKind.hearth || buildProgress >= kind.buildWork;
  double get healthRatio => (hp / kind.maxHp).clamp(0, 1);
  double get buildRatio =>
      kind.buildWork <= 0 ? 1 : (buildProgress / kind.buildWork).clamp(0, 1);
  bool get isTower =>
      kind == BuildingKind.arrowTower ||
      kind == BuildingKind.ballista ||
      kind == BuildingKind.catapult;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'kind': kind.name,
    'tile': tile.toJson(),
    'hp': hp,
    'buildProgress': buildProgress,
    'ammo': ammo,
    'cooldown': cooldown,
    'triggers': triggers,
    if (isTower) 'stance': stance.name,
  };

  factory SanctuaryBuilding.fromJson(Map<String, dynamic> json) {
    final BuildingKind kind = BuildingKind.values.firstWhere(
      (BuildingKind value) => value.name == json['kind'],
      orElse: () => BuildingKind.palisade,
    );
    return SanctuaryBuilding(
      id: json['id'] as String? ?? '',
      kind: kind,
      tile: GridPoint.fromJson(_stringMap(json['tile'])),
      hp: (json['hp'] as num?)?.toDouble(),
      buildProgress: (json['buildProgress'] as num?)?.toDouble() ?? 0,
      ammo: (json['ammo'] as num?)?.toInt() ?? 20,
      cooldown: (json['cooldown'] as num?)?.toDouble() ?? 0,
      triggers: (json['triggers'] as num?)?.toInt() ?? 10,
      stance: TowerStance.values.firstWhere(
        (TowerStance value) => value.name == json['stance'],
        orElse: () => TowerStance.nearest,
      ),
    );
  }
}

class SanctuaryCitizen {
  SanctuaryCitizen({
    required this.id,
    required this.role,
    required this.x,
    required this.y,
    this.state = CitizenState.idle,
    this.taskTile,
    this.hunger = 0,
    this.carry = 0,
  });

  final int id;
  CitizenRole role;
  double x;
  double y;
  CitizenState state;
  GridPoint? taskTile;
  double hunger;
  double carry;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'role': role.name,
    'x': x,
    'y': y,
    'state': state.name,
    'hunger': hunger,
    'carry': carry,
  };

  factory SanctuaryCitizen.fromJson(Map<String, dynamic> json) =>
      SanctuaryCitizen(
        id: (json['id'] as num?)?.toInt() ?? 0,
        role: CitizenRole.values.firstWhere(
          (CitizenRole value) => value.name == json['role'],
          orElse: () => CitizenRole.harvester,
        ),
        x: (json['x'] as num?)?.toDouble() ?? 0,
        y: (json['y'] as num?)?.toDouble() ?? 0,
        state: CitizenState.values.firstWhere(
          (CitizenState value) => value.name == json['state'],
          orElse: () => CitizenState.idle,
        ),
        hunger: (json['hunger'] as num?)?.toDouble() ?? 0,
        carry: (json['carry'] as num?)?.toDouble() ?? 0,
      );
}

class SanctuaryEnemy {
  SanctuaryEnemy({
    required this.id,
    required this.kind,
    required this.x,
    required this.y,
    double? hp,
    double? maxHp,
    this.attackCooldown = 0,
    this.slowTime = 0,
  }) : hp = hp ?? maxHp ?? kind.maxHp,
       maxHp = maxHp ?? hp ?? kind.maxHp;

  final int id;
  final EnemyKind kind;
  double x;
  double y;
  double hp;
  double maxHp;
  double attackCooldown;
  double slowTime;

  double get healthRatio => (hp / maxHp).clamp(0, 1);

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'kind': kind.name,
    'x': x,
    'y': y,
    'hp': hp,
    'maxHp': maxHp,
    'attackCooldown': attackCooldown,
    'slowTime': slowTime,
  };

  factory SanctuaryEnemy.fromJson(Map<String, dynamic> json) {
    final EnemyKind kind = EnemyKind.values.firstWhere(
      (EnemyKind value) => value.name == json['kind'],
      orElse: () => EnemyKind.crawler,
    );
    final double? hp = (json['hp'] as num?)?.toDouble();
    return SanctuaryEnemy(
      id: (json['id'] as num?)?.toInt() ?? 0,
      kind: kind,
      x: (json['x'] as num?)?.toDouble() ?? 0,
      y: (json['y'] as num?)?.toDouble() ?? 0,
      hp: hp,
      maxHp: (json['maxHp'] as num?)?.toDouble() ?? hp ?? kind.maxHp,
      attackCooldown: (json['attackCooldown'] as num?)?.toDouble() ?? 0,
      slowTime: (json['slowTime'] as num?)?.toDouble() ?? 0,
    );
  }
}

extension EnemyKindData on EnemyKind {
  double get maxHp => switch (this) {
    EnemyKind.crawler => 45,
    EnemyKind.spitter => 160,
    EnemyKind.banshee => 220,
    EnemyKind.brute => 850,
    EnemyKind.devourer => 6500,
  };

  double get speed => switch (this) {
    EnemyKind.crawler => 2.8,
    EnemyKind.spitter => 1.3,
    EnemyKind.banshee => 3.2,
    EnemyKind.brute => 0.9,
    EnemyKind.devourer => 0.7,
  };

  double get hearthDamage => switch (this) {
    EnemyKind.crawler => 8,
    EnemyKind.spitter => 18,
    EnemyKind.banshee => 15,
    EnemyKind.brute => 95,
    EnemyKind.devourer => 250,
  };

  int get budget => switch (this) {
    EnemyKind.crawler => 2,
    EnemyKind.spitter => 6,
    EnemyKind.banshee => 12,
    EnemyKind.brute => 25,
    EnemyKind.devourer => 250,
  };
}

extension AncestralUpgradeData on AncestralUpgrade {
  String get label => switch (this) {
    AncestralUpgrade.divineMight => 'Divine Might',
    AncestralUpgrade.masterMasonry => 'Master Masonry',
    AncestralUpgrade.swiftSettlers => 'Swift Settlers',
    AncestralUpgrade.overchargedShrines => 'Overcharged Shrines',
    AncestralUpgrade.arcaneTurrets => 'Arcane Turrets',
  };

  String get detail => switch (this) {
    AncestralUpgrade.divineMight => '+5% kinetic damage',
    AncestralUpgrade.masterMasonry => '+8% starting wall integrity',
    AncestralUpgrade.swiftSettlers => '+4% citizen movement',
    AncestralUpgrade.overchargedShrines => '+10% shrine mana',
    AncestralUpgrade.arcaneTurrets => '+5% tower attack speed',
  };

  int get maxRank => 10;
}

extension SanctuaryEncounterData on SanctuaryEncounterKind {
  String get title => switch (this) {
    SanctuaryEncounterKind.lostCaravan => 'Lanterns at the boundary',
    SanctuaryEncounterKind.singingStones => 'The quarry is singing',
    SanctuaryEncounterKind.woundedStag => 'A white stag at the farms',
    SanctuaryEncounterKind.emberWind => 'Warm ash on the wind',
  };

  String get story => switch (this) {
    SanctuaryEncounterKind.lostCaravan =>
      'A tired family has followed the Hearth-light through the corruption.',
    SanctuaryEncounterKind.singingStones =>
      'The granite hums with trapped essence. Acolytes gather to listen.',
    SanctuaryEncounterKind.woundedStag =>
      'The creature kneels without fear while the village waits for your sign.',
    SanctuaryEncounterKind.emberWind =>
      'Cinders drift from the coming rifts and settle across the ramparts.',
  };

  String get compassionateLabel => switch (this) {
    SanctuaryEncounterKind.lostCaravan => 'Offer shelter',
    SanctuaryEncounterKind.singingStones => 'Let acolytes listen',
    SanctuaryEncounterKind.woundedStag => 'Tend its wounds',
    SanctuaryEncounterKind.emberWind => 'Bless the ramparts',
  };

  String get pragmaticLabel => switch (this) {
    SanctuaryEncounterKind.lostCaravan => 'Trade for supplies',
    SanctuaryEncounterKind.singingStones => 'Break the seam',
    SanctuaryEncounterKind.woundedStag => 'Fill the granary',
    SanctuaryEncounterKind.emberWind => 'Gather the cinders',
  };

  String get compassionateCost => switch (this) {
    SanctuaryEncounterKind.lostCaravan => '15 food · +2 people · +morale',
    SanctuaryEncounterKind.singingStones => '18 mana · +4 crystals',
    SanctuaryEncounterKind.woundedStag => '8 food · strong morale gain',
    SanctuaryEncounterKind.emberWind => '20 mana · repair every structure',
  };

  String get pragmaticReward => switch (this) {
    SanctuaryEncounterKind.lostCaravan => '+25 wood · +12 stone',
    SanctuaryEncounterKind.singingStones => '+40 stone · morale falls',
    SanctuaryEncounterKind.woundedStag => '+25 food · morale falls',
    SanctuaryEncounterKind.emberWind => '+12 iron · morale falls',
  };
}

extension NightOathData on NightOath {
  String get label => switch (this) {
    NightOath.holdTheLine => 'Hold the Line',
    NightOath.divineRestraint => 'Divine Restraint',
    NightOath.cinderHarvest => 'Cinder Harvest',
  };

  String detail(int target) => switch (this) {
    NightOath.holdTheLine => 'Lose no structures before dawn',
    NightOath.divineRestraint => 'Use at most one god power tonight',
    NightOath.cinderHarvest => 'Defeat $target abyssals before dawn',
  };
}

class SanctuaryEffect {
  SanctuaryEffect({
    required this.kind,
    required this.x,
    required this.y,
    this.x2,
    this.y2,
    this.text,
    this.life = 0.8,
  });

  final String kind;
  final double x;
  final double y;
  final double? x2;
  final double? y2;
  final String? text;
  final double life;
  double age = 0;

  double get progress => (age / life).clamp(0, 1);
}

extension TowerStanceData on TowerStance {
  String get label => switch (this) {
    TowerStance.nearest => 'Nearest',
    TowerStance.vanguard => 'Vanguard',
    TowerStance.strongest => 'Strongest',
  };

  String get detail => switch (this) {
    TowerStance.nearest => 'Fire at the closest abyssal',
    TowerStance.vanguard => 'Fire at whoever is deepest inside the sanctuary',
    TowerStance.strongest => 'Fire at the toughest abyssal in range',
  };
}

extension WaveModifierData on WaveModifier {
  String get label => switch (this) {
    WaveModifier.none => 'Still Air',
    WaveModifier.swift => 'Swift Darkness',
    WaveModifier.armored => 'Armored Tide',
    WaveModifier.horde => 'Endless Horde',
    WaveModifier.eclipse => 'Eclipse',
  };

  String get detail => switch (this) {
    WaveModifier.none => 'No alteration tonight',
    WaveModifier.swift => 'Abyssals move 30% faster',
    WaveModifier.armored => 'Abyssals arrive with 40% more health',
    WaveModifier.horde => '35% more abyssals, each 25% weaker',
    WaveModifier.eclipse => 'Shrines and acolytes gather half as much mana',
  };

  bool get isActive => this != WaveModifier.none;
}

class PlacementResult {
  const PlacementResult(this.failure, {this.building});

  final PlacementFailure failure;
  final SanctuaryBuilding? building;

  bool get success => failure == PlacementFailure.none;
}

Map<String, dynamic> _stringMap(Object? value) {
  if (value is! Map) {
    return <String, dynamic>{};
  }
  return value.map(
    (dynamic key, dynamic item) =>
        MapEntry<String, dynamic>(key.toString(), item),
  );
}
