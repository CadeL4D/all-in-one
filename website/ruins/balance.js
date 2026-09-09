// Every tuning number in Pocket Ruins lives here. Research base:
// docs/rise-to-ruins/research/01-05. RtR's live values are unpublished for
// most constants, so numbers below are reasoned defaults anchored to the
// documented *ratios* (hunger 1/25s idle vs 1/12.5s working, raw food = 25,
// ~3 food/day idle) rescaled to our shorter mobile day. Tune in playtests.

export const TICKS_PER_SECOND = 60;

// RtR: 132k ticks/day = ~37 min at 1x (dev-confirmed). Our day targets the
// mobile session band: one day = 3-10 min (master plan section 5).
export const DAY_TICKS = 24000; // 400s at 1x, 3m20s at 2x (default)

// Speed cluster, top-right, same position as RtR's time panel.
export const SPEEDS = [0, 1, 2, 3];
export const DEFAULT_SPEED = 2;

// Six phases per day with a per-phase progress bar (RtR Interface).
// Night is ~1/3 of the day: long safe days, telegraphed nights.
export const PHASES = [
  { key: "dawn", label: "Dawn", fraction: 0.07 },
  { key: "morning", label: "Morning", fraction: 0.16 },
  { key: "midday", label: "Midday", fraction: 0.18 },
  { key: "evening", label: "Evening", fraction: 0.17 },
  { key: "dusk", label: "Dusk", fraction: 0.09 },
  { key: "night", label: "Night", fraction: 0.33 },
];

// ---- Needs (0-100). RtR dev math is per REAL second: 1 hunger per 25s
// idle, x2 working (doc 03 section 2.2). Our day is 400 real seconds
// (DAY_TICKS/60), so a faithful villager burns 400/25 = 16 hunger per
// in-game day idle - the per-day burn is ~5x smaller than RtR's 18-min day.
export const MAX_NEED = 100;
export const HUNGER_DECAY_PER_DAY = 16;
export const HUNGER_WORK_MULT = 1.8; // working/carrying burns ~x2 in RtR
export const HUNGER_CHILD_MULT = 1.25; // children burn faster (1/16.6s vs 1/25s)
export const EAT_AMOUNT = 25; // raw vegetable food value (dev-confirmed)
export const EAT_THRESHOLD = 45;
export const THIRST_DECAY_PER_DAY = 35; // about one well drink per day
export const DRINK_AMOUNT = 35; // clean water (water bottle = 30 in RtR)
export const DRINK_WILD_AMOUNT = 15; // sipping at a pond: slow and far
export const DRINK_THRESHOLD = 40;
export const ENERGY_DECAY_PER_DAY = 55; // awake
export const SLEEP_RESTORE_PER_DAY = 220; // a full night restores ~70+
export const SLEEPY_THRESHOLD = 35; // go to bed when below this
export const NIGHT_SLEEP_THRESHOLD = 60; // at night, bed when below this
export const HEALTH_REGEN_PER_DAY = 25;
export const STARVE_DAMAGE_PER_DAY = 8;
export const DEHYDRATE_DAMAGE_PER_DAY = 14;
export const HUNGRY_WORK_REFUSAL = 12; // below this hunger, won't start work

// ---- Movement. RtR base speed unpublished; pick readable pace.
// Villagers overlap freely: NO villager-villager collision (standing veto).
export const WALK_TILES_PER_SECOND = 2.2;
export const CHILD_WALK_MULT = 0.85;
// Villagers haul 1 resource per trip (RtR rule).
export const CARRY_CAPACITY = 1;

// ---- Work durations (ticks).
export const CHOP_TICKS = 1500; // fell a tree: ~25s of chops
export const HARVEST_TICKS = 900; // pick a crop or wild bush
export const PLANT_TICKS = 700;
export const BUILD_TICKS_PER_RESOURCE = 110; // building work scales with cost
export const EAT_TICKS = 350;
export const DRINK_TICKS = 300;

// ---- Yields. EAT_AMOUNT is 25 (one vegetable), so yields are counted in
// vegetables: a villager eats ~2/day idle, ~3.5 working. Farmers only work
// ~1/4 of the day (walks, sleep, chat), so a plot must be a whole basket
// or one farm can never keep up with its own village.
export const TREE_WOOD = 4;
export const BUSH_FOOD = 6;
export const CROP_FOOD = 14;
export const CROP_GROWTH_TICKS = 8000; // planted -> ripe in a third of a day
export const BUSH_REGROW_TICKS = 48000; // 2 days after picking
export const SAPLINGS_PER_DAY = 3; // trees slowly regrow away from the village

// ---- Resources & storage. One big pool, capped by buildings (RtR rule);
// harvesters stop when full ("they stop working if there's no space").
// Bolts (M3) are the tower ammo: a crafted pool good, not a raw harvest.
export const RESOURCES = ["wood", "food", "water", "stone", "bolts"];
// RtR hands you up to 64 starting supplies incl. wood (Update 2 notes);
// 64 wood covers well+farm+sawpit with margin - no bootstrap deadlock.
export const START_RESOURCES = { wood: 64, food: 24, water: 30, stone: 0, bolts: 20 };
export const CAMP_STORAGE = 80; // holds the 64 starting wood (research camp
// tiers reach 86 slots); keeps boot supplies inside the cap so the HUD
// doesn't warn on day 1
export const STOREHOUSE_STORAGE = 60;
export const HOME_STORAGE = 6;
// Guides: ~2 wells for the first 10-20 villagers. A villager burns 70
// thirst/day, so one well covers roughly a dozen of them.
export const WELL_WATER_PER_DAY = 800;
export const WELL_STORAGE = 60;

// ---- Buildings (M1 set). Wood is the only build resource until walls.
// Nest HP lives up here: the BUILDINGS table references it.
export const NEST_HP = 300; // targetable by towers; doc 04 section 2.3 (100
// HP/resource RtR math rescaled: our tower does 12 dps, so ~25 s of fire)

export const BUILDINGS = {
  camp: {
    name: "Camp",
    size: 2,
    cost: { wood: 0 },
    storage: CAMP_STORAGE,
    jobs: { builder: 4 },
    radius: 12, // build range radiates from the center (RtR rule)
    houses: 0,
    // The loss anchor: raiders must chew through this before the village
    // falls. RtR castle tiers are the monsters' final target; 400 gives a
    // defended village time to respond (~100s vs one husk's dps).
    hp: 400,
  },
  home: {
    name: "Home",
    size: 2,
    cost: { wood: 16 },
    storage: HOME_STORAGE,
    houses: 4, // base house holds 4 (RtR Quick Guide)
    jobs: {},
    radius: 0,
    hp: 80,
  },
  farm: {
    name: "Farm",
    size: 2,
    cost: { wood: 20 },
    storage: 10,
    houses: 0,
    jobs: { farmer: 3 },
    radius: 9, // wild bushes inside are foraged, plots outside are claimed
    plots: 12, // claims up to N adjacent grass tiles as crop plots
    hp: 70,
  },
  well: {
    name: "Well",
    size: 1,
    cost: { wood: 12 },
    storage: WELL_STORAGE,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 60,
  },
  sawpit: {
    name: "Sawpit",
    size: 2,
    cost: { wood: 14 },
    storage: 8,
    houses: 0,
    jobs: { woodcutter: 3 },
    radius: 11, // chops trees inside this ring
    hp: 70,
  },
  storehouse: {
    name: "Storehouse",
    size: 2,
    cost: { wood: 18 },
    storage: STOREHOUSE_STORAGE,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 90,
  },
  // ---- M2 defense set. Wall stats follow the wiki Walls page ratios
  // (wood fence 100 HP @ 1 wood, stone wall 200 @ 2 stone; ours sits at
  // 240 so a stone ring outlives two raids of chewing). Walls are 1x1,
  // don't count toward housing, and exist to be mazed with (pillar 6).
  fence: {
    name: "Wood Fence",
    size: 1,
    cost: { wood: 1 },
    storage: 0,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 100,
    wall: true, // drag-paint placement; blocks monsters, villagers path around
  },
  stoneWall: {
    name: "Stone Wall",
    size: 1,
    cost: { stone: 2 },
    storage: 0,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 240,
    wall: true,
  },
  gate: {
    name: "Gate",
    size: 1,
    cost: { wood: 8 },
    storage: 0,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 320,
    wall: true,
    gate: true, // villagers & nomads pass; monsters must break it
  },
  tower: {
    name: "Sentry Tower",
    size: 1,
    cost: { wood: 24 },
    storage: 0,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 180,
    // M3: fires piercing bolts drawn from the village ammo pool (RtR bow
    // towers pull arrows from storage; ours skips the hauling, keeps the
    // economy). type feeds the resist matrix - sentries blunt flesh, not
    // blots or phasers.
    tower: { range: 10, damage: 12, reload: 60, type: "pierce" },
  },
  stormPylon: {
    name: "Storm Pylon",
    size: 1,
    cost: { wood: 16, stone: 8 },
    storage: 0,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 150,
    // M3 counter-match piece: magic damage, the only structure answer to
    // blots and wraiths (RtR's Elemental Bolt tower niche). Weaker raw dps
    // than the sentry on purpose - it is a specialist, not an upgrade.
    tower: { range: 9, damage: 10, reload: 75, type: "magic" },
  },
  quarry: {
    name: "Quarry",
    size: 2,
    cost: { wood: 24 },
    storage: 8,
    houses: 0,
    jobs: { stonecutter: 2 },
    radius: 9, // mines rocks inside this ring
    hp: 90,
  },
  // Corrupted nest (doc 04 section 2.3): the graveyard-equivalent spawn
  // point the corruption raises. Never player-placeable; it enters complete
  // and targetable, and monsters pour out of it at nightfall.
  nest: {
    name: "Corrupted Nest",
    size: 1,
    cost: { wood: 0 },
    storage: 0,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: NEST_HP,
    corrupted: true,
  },
};

export const DISMANTLE_REFUND = 0.5; // fraction of cost refunded (RtR salvages)

// ---- Jobs. Self-selected from the idle pool; you only set headcounts
// (RtR Jobs panel). Desired counts below are per-building defaults.
export const JOBS = {
  builder: { name: "Builder", color: "#e8b04b" },
  farmer: { name: "Farmer", color: "#7fb95c" },
  woodcutter: { name: "Woodcutter", color: "#b07845" },
  stonecutter: { name: "Stonecutter", color: "#9aa0a6" },
};

// ---- Growth. Nomads are the primary channel (RtR Events): rate scales with
// free housing, free job slots, and stored food/water - never with wealth.
export const START_POP = 8; // up to 20 spawn with the camp in RtR; mobile start is smaller
export const NOMAD_DAY1_MIDDAY = true; // first nomad ~midday day 1 (pity rule)
export const NOMADS_BASE_PER_DAY = 1.2;
export const NOMADS_MAX_PER_DAY = 3;
export const BIRTH_CHANCE_PER_COUPLE = 0.14; // rolled each dawn, housed couples
export const ADULT_AGE_DAYS = 4; // children grow up on day 4
export const POP_SOFT_CAP = 60; // sim budget guard before LOD work

// ---- World.
export const MAP_SIZE = 72;
export const CAMP_TILE = { x: 35, y: 35 };
export const CLEAR_RADIUS = 5; // guaranteed open ground around the camp

// ---- Naming. Original pool - no pop-culture names.
export const NAMES = [
  "Bren", "Calla", "Dorn", "Edda", "Fenn", "Grita", "Hale", "Isla",
  "Jory", "Kess", "Lark", "Maro", "Nella", "Odo", "Pike", "Runa",
  "Sela", "Tam", "Una", "Voss", "Wren", "Yara", "Zeph", "Brin",
  "Ash", "Briar", "Cove", "Dellan", "Elm", "Ferra", "Gale", "Hollis",
];

// ---- Rendering / feel.
export const TILE = 16; // logical art px per tile (2x render on phones)
export const MIN_ZOOM = 0.55;
export const MAX_ZOOM = 3.2;
export const GHOST_LIFT_PX = 56; // ghost preview floats above the finger
export const CORPSE_DECAY_TICKS = 90000; // ~1.5 days, slower decay (RtR U2 note)

// =====================================================================
// M2 — Night & walls. Research base: docs/rise-to-ruins/research/04
// (sections cited as doc 04 below). RtR publishes structure, not values;
// numbers are reasoned defaults rescaled to our 400 s day, tuned by test.
// =====================================================================

// ---- Mining (quarry). Rocks are finite per map; regrow is a lie for stone.
export const MINE_TICKS = 1100;
export const ROCK_STONE = 6;

// ---- Corruption (doc 04 section 2).
export const CORRUPTION_SPAWN_DAY = 2; // Traditional-style delay (doc 04 section 6):
// Survival spawns night 1, but our mobile players ARE first-timers, so day 1
// stays calm (pillar 2) and day 2 opens with the corruption + a hint.
export const CORRUPTION_MIN_CAMP_DIST = 20; // dev quote: checks map edge first,
// closes in, "if it fails ... it just never spawns" (doc 04 section 2.2)
export const CORRUPTION_SITE_RADIUS = 4; // starts as a blob of this radius
export const CORRUPTION_SPREAD_CHANCE = 0.55; // per 600-tick check, one frontier
// tile converts: ~20 tiles/day early, slowing as the frontier runs out
export const CORRUPTION_SPREAD_TICKS = 600;
export const CORRUPTION_KILLS_TREES = true; // doc 04 section 2.1: spreads under
// forests and kills them; walls/buildings/plots block conversion (that block
// is what "trap in the corrupted tiles" means for the threat model)

// ---- Corrupted nest (our graveyard equivalent; original art/name).
export const NEST_MIN_TILES = 30; // first nest once the blob holds this much
export const NEST_TILES_PER_EXTRA = 60; // one more nest per this many tiles (cap 3)
export const NEST_MAX = 3;
export const NEST_REBUILD_DELAY_DAYS = 2; // drones-equivalent rebuild pause

// ---- Corruption Threat (doc 04 section 2.4 verbatim model): desire grows
// with the day counter; threat rises only when corruption is boxed in
// (wants space, has none). Undisturbed growth decays threat to 0. NOTHING
// else (wealth, population) feeds it - that is the system's identity.
export const THREAT_MAX = 100;
export const THREAT_RISE_PER_DAY = 8; // boxed in
export const THREAT_DECAY_PER_DAY = 12; // growing freely
export const THREAT_SPAWN_MULT = 0.0125; // raid count x (1 + threat * this):
// full bar = +125% raiders. Doc 04: threat scales "how powerful and numerous".

// ---- Monsters. Four types for M3 (melee, splitter, wall-phaser,
// ranged-fire - master plan section 4), each with the full resist matrix
// (doc 04 section 5.1). resists maps DAMAGE TYPE -> multiplier on damage
// TAKEN: >1 is a vulnerability, <1 a resistance. All four types plus water
// must be present for every species (asserted in tests). Names/art original.
export const MONSTERS = {
  husk: {
    name: "Husk",
    hp: 35,
    damage: 3, // per blow
    attackTicks: 45, // ~4 dps: a wood fence buys ~25 s, a villager duel ~25 s
    speed: 1.4, // tiles/s - slower than villagers (doc 04: headless are slow)
    splits: null,
    // Headless analog: no armor, but fire cooks them (+20% -> 1.25).
    resists: { pierce: 1, crush: 1, magic: 1, fire: 1.25, water: 1 },
    color: "#8fae6b",
  },
  blot: {
    name: "Blot",
    hp: 55,
    damage: 3,
    attackTicks: 50,
    speed: 1.1,
    // RtR slimes split into two smaller slimes on death (doc 04 section 1.3).
    splits: { kind: "blotling", count: 2 },
    // Slime analog: tower bolts mostly bounce off (12 pierce -> ~5), storm
    // magic melts it (doc 04: +80% magic electric) - the counter-match
    // lesson of M3. Kept just shy of half-leak so a lone sentry still
    // carries nights 5-6; the pylon is for later, worse blots.
    resists: { pierce: 0.45, crush: 0.5, magic: 1.75, fire: 1, water: 1 },
    color: "#7d5ba6",
  },
  blotling: {
    name: "Blotling",
    hp: 14,
    damage: 2,
    attackTicks: 45,
    speed: 1.6,
    splits: null,
    resists: { pierce: 0.45, crush: 0.5, magic: 1.75, fire: 1, water: 1 },
    color: "#9a7cc0",
  },
  wraith: {
    name: "Wraith",
    hp: 110,
    damage: 4,
    attackTicks: 60,
    speed: 0.9, // spectres are the slowest thing on the field
    splits: null,
    // Spectre analog (doc 04 section 1.6): physical damage barely lands;
    // storm magic is the answer. phaseWalls lets it glide through fences
    // and stone walls - our DIVERGENCE: gates are warded and block it, so
    // the villager lifeline stays meaningful (RtR gates do not stop them).
    resists: { pierce: 0.3, crush: 0.3, magic: 1.75, fire: 1, water: 1 },
    phaseWalls: true,
    color: "#9db7e8",
  },
  emberling: {
    name: "Emberling",
    hp: 45,
    damage: 4,
    attackTicks: 75,
    speed: 1.2,
    ranged: { range: 5.5 }, // stops and shoots buildings/villagers (RtR
    // fire elemental: the only ranged monster, 8-tile range, rescaled)
    splits: null,
    // Fire elemental analog: flame barely singes it (near-immune), water is
    // death (doc 04: thrown into water it takes huge damage) - the Grab
    // showpiece.
    resists: { pierce: 1, crush: 1, magic: 1, fire: 0.1, water: 8 },
    color: "#e2813f",
  },
};
export const MONSTER_HARD_CAP = 24; // sim budget guard (splits can chain)
export const BLOT_ARRIVAL_DAY = 5; // splitters join from night 5 (RtR slimes
// arrive day 2-4; we hold them back until the wall lesson has landed)
export const BLOT_CHANCE = 0.3; // share of blots once arrived
export const WRAITH_ARRIVAL_DAY = 8; // RtR spectres arrive day 12; our days
// run ~9x shorter, but M3 also fronts more defense tools - split the
// difference. The pylon lesson must land before they show up.
export const WRAITH_CHANCE = 0.18;
export const EMBERLING_ARRIVAL_DAY = 12; // RtR fire elementals day 16
export const EMBERLING_CHANCE = 0.15;

// ---- Damage types (doc 04 section 5.1, the M3 slice). Towers: sentry =
// pierce, storm pylon = magic. Villagers swing bare-handed = crushing.
// Lightning = magic, Meteor = fire, water only matters via Grab throws.
export const VILLAGER_DAMAGE_TYPE = "crush";

// ---- Night raids (doc 04 section 3). Spawn at nightfall from nests;
// survivors retreat into the corruption at dawn (calm days, panicked nights).
export const RAID_START_DAY = 3; // night 3 first raid: corruption lands day 2
// morning, so there is always one full calm day to wall up (pillar 2 + 10)
export const RAID_BASE_COUNT = 2; // night 3 size
export const RAID_PER_DAY = 0.45; // + per day after the first raid
export const RAID_PER_NEST = 0.8; // graveyards escalate (doc 04 section 2.3)
export const RAID_MAX_COUNT = 12;
export const RAID_CAP = 8; // population-adjacent raid scale ceiling in day units

// ---- Melee combat (villagers fight back; RtR villagers defend themselves,
// doc 04 section 4.3 - and there is NO hiding/shelter mechanic, veto 3).
export const VILLAGER_DAMAGE = 2.5;
export const VILLAGER_ATTACK_TICKS = 55; // ~2.7 dps: wins 1v1 vs a husk slowly,
// loses 1v2 - towers are supposed to be the real defense
export const MONSTER_ENGAGE_RANGE = 1.4; // tiles: close enough to swing
export const VILLAGER_SWING_RANGE = 1.5;

// ---- Loss (pillar 4: brutal-but-fair loss as content, restart < 10 s).
export const LOSS_CHECK = true; // camp destroyed OR last villager dead

// =====================================================================
// M3 — God hand. Research base: docs/rise-to-ruins/research/03 section 5
// (influence/spells) and 04 section 5 (damage types). RtR costs cited
// inline; ours keep the ratios where the feel is right and rescale where
// RtR's late-game economy (400-2000 influence spells) would dead-lock a
// 10-villager mobile village.
// =====================================================================

// ---- Influence economy (doc 03 section 5.1): max influence scales with
// the living village - RtR's original rule was a flat 40 per villager,
// children giving less in Update 2. Faith scaling of the contribution is
// M4 (master plan section 4); the shape below leaves room for it.
export const INFLUENCE_PER_ADULT = 40;
export const INFLUENCE_PER_CHILD = 15;
// RtR regenerates "a percentage of maximum per tick"; rate unpublished.
// 45%/day at pop 10 = ~180 influence/day: one Lightning a night early on,
// several at pop 20+. The god grows with the village - that IS the loop.
export const INFLUENCE_REGEN_PER_DAY = 0.45;

// ---- The five spells (master plan section 4). Costs: Grab/Lightning/
// Meteor keep RtR's exact 40/100/200; Heal (RtR Healing Aura 400) and Mend
// (RtR Mend 800) are rescaled to our smaller pools for smaller effects.
export const SPELLS = {
  grab: {
    name: "Grab",
    cost: 40, // RtR base cost; per-tick upcharge skipped for mobile taps
    icon: "✋",
    blurb: "Lift a villager, wanderer, or monster. Fling them — hard landings hurt, water drowns embers.",
  },
  lightning: {
    name: "Lightning",
    cost: 100, // RtR exact
    icon: "⚡",
    // 40 storm damage: one-shots husks and blotlings, kills blots via the
    // 1.75 magic weakness, never trivializes wraiths (2 casts) or embers.
    damage: 40,
    damageType: "magic",
    tapRange: 1.8, // creature must be this close to the tap
    cooldown: 30, // ~0.5 s, RtR's lightning cooldown
    blurb: "Strike one creature with storm magic. Blots and wraiths melt; embers shrug it off.",
  },
  heal: {
    name: "Heal",
    cost: 150,
    icon: "✚",
    amount: 40, // instant, RtR Healing Aura is a channel - ours is a burst
    radius: 3,
    cooldown: 30,
    blurb: "Mend every villager near the touch. Works after raids, not during them — plan the triage.",
  },
  mend: {
    name: "Mend",
    cost: 120,
    icon: "⚒",
    amount: 60, // HP restored per building
    radius: 3,
    cooldown: 30,
    blurb: "Repair damaged walls, gates, and buildings near the touch. The corruption's nests resist it.",
  },
  meteor: {
    name: "Meteor",
    cost: 200, // RtR exact
    icon: "☄",
    damage: 60, // fire damage at the impact
    damageType: "fire",
    buildingDamage: 80, // friendly fire is real: RtR meteors crush walls too
    radius: 2.2,
    fallTicks: 48, // ~0.8 s telegraph: the shadow grows, the wise scatter
    cooldown: 60,
    // Doc 04 section 1.7: RtR meteors "occasionally" drop a fire elemental
    // instead of a rock. Kept - it is exactly the gamble that makes stories.
    emberlingChance: 0.12,
    blurb: "Call a falling stone. Devastates raiders - and anything of yours in the circle. Rarely drops an emberling instead.",
  },
};
export const CAST_TAP_RANGE = 1.2; // default tap tolerance for ground spells

// ---- Tower ammo (RtR: bow towers pull 20 arrows per bolt-unit from
// storage). One pool, both towers: bolts. Sawpits fletch them from stored
// wood between felling - defense literally draws on the wood economy.
export const BOLT_CRAFT_TICKS = 600; // per sawpit, ~40 crafts/day
export const BOLT_CRAFT_WOOD = 1;
export const BOLT_CRAFT_YIELD = 4;
// Twenty starting bolts: the first sentry can fire on night 3 even if the
// sawpit is still on the to-do list (brutal-but-fair, not gotcha).
export const START_BOLTS = 20;
export const TOWERS_WARN_EMPTY = true; // one "out of bolts" note per night

// ---- Grab throw physics (doc 03 section 5: drop deals 1-10 in RtR; ours
// scales with fling speed so the *gesture* is the damage dial).
export const GRAB_PICKUP_RANGE = 1.4; // tiles around the tap
export const GRAB_MIN_THROW_SPEED = 2; // tiles/s below which it's a "set down"
export const GRAB_MAX_THROW_SPEED = 14;
export const GRAB_MONSTER_MAX_DROP = 18; // crush damage cap on monsters
export const GRAB_VILLAGER_MAX_DROP = 8; // villagers are fragile (RtR 1-10)
export const GRAB_FLY_TICKS_PER_TILE = 8; // arc length scales with fling
export const GRAB_MIN_FLY_TICKS = 12;
