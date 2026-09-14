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
// Bolts (M3) are the tower ammo; boards/blocks/meals (M4) are the refined
// chain - wood->boards, stone->blocks, food->meals (doc 02 section 2.2's
// three chains that matter most, one per raw resource).
export const RESOURCES = ["wood", "food", "water", "stone", "bolts", "boards", "blocks", "meals"];
// RtR hands you up to 64 starting supplies incl. wood (Update 2 notes);
// 64 wood covers well+farm+sawpit with margin - no bootstrap deadlock.
export const START_RESOURCES = { wood: 64, food: 24, water: 30, stone: 0, bolts: 20, boards: 0, blocks: 0, meals: 0 };
export const CAMP_STORAGE = 80; // holds the 64 starting wood (research camp
// tiers reach 86 slots); keeps boot supplies inside the cap so the HUD
// doesn't warn on day 1
export const STOREHOUSE_STORAGE = 60;
export const HOME_STORAGE = 6;
// Guides: ~2 wells for the first 10-20 villagers. A villager burns 70
// thirst/day, so one well covers roughly a dozen of them.
export const WELL_WATER_PER_DAY = 800;
export const WELL_STORAGE = 60;
// Cisterns are the tier-2 well: double the seep, stonework price.
export const CISTERN_WATER_PER_DAY = 1600;

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
  cottage: {
    name: "Cottage",
    size: 2,
    cost: { wood: 14, stone: 8 },
    storage: 10,
    houses: 6,
    jobs: {},
    radius: 0,
    hp: 140,
  },
  manor: {
    name: "Manor",
    size: 3,
    cost: { wood: 20, boards: 4, stone: 10 },
    storage: 16,
    houses: 10,
    jobs: {},
    radius: 0,
    hp: 220,
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
  orchard: {
    name: "Orchard",
    size: 2,
    cost: { wood: 24, boards: 2 },
    storage: 14,
    houses: 0,
    jobs: { farmer: 3 },
    radius: 10,
    plots: 16,
    hp: 100,
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
  cistern: {
    name: "Cistern",
    size: 1,
    cost: { wood: 10, stone: 14 },
    storage: 100,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 110,
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
  sawmill: {
    name: "Sawmill",
    size: 2,
    cost: { wood: 24, stone: 4 },
    storage: 10,
    houses: 0,
    jobs: { carpenter: 2 },
    radius: 0,
    hp: 110,
    // The refine chain, half one: carpenters saw boards while the stock
    // sits under the maintain target (RtR refiners are threshold-driven).
    craft: { in: { wood: 2 }, out: { boards: 1 }, ticks: 900 },
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
  granary: {
    name: "Granary",
    size: 2,
    cost: { wood: 12, stone: 8 },
    storage: 90,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 130,
  },
  kitchen: {
    name: "Kitchen",
    size: 2,
    cost: { wood: 20, stone: 6 },
    storage: 12,
    houses: 0,
    jobs: { cook: 2 },
    radius: 0,
    hp: 110,
    // Refine chain, half three: two vegetables become one hearty meal -
    // less value per raw vegetable, but one stop fills a worker whole
    // (fewer walks to storage: the real cost of hunger is the trip).
    craft: { in: { food: 2 }, out: { meals: 1 }, ticks: 800 },
  },
  waystation: {
    name: "Waystation",
    size: 2,
    cost: { wood: 18, boards: 2 },
    storage: 10,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 100,
    // Growth lever: each finished waystation coaxes +1 wanderer per day
    // (RtR Migration Way Station adjacent - ours stays single-village).
    waystation: true,
  },
  shrine: {
    name: "Shrine",
    size: 2,
    cost: { wood: 16, stone: 6 },
    storage: 8,
    houses: 0,
    jobs: { occultist: 2 },
    radius: 0,
    hp: 110,
    // The faith engine (doc 03 section 5.3): occultists pray here; each
    // completed rite lifts their faith, nearby villagers' faith, and pipes
    // free influence to the god (RtR essence altar, 3x3=9 essence rite).
    pray: true,
  },
  clinic: {
    name: "Clinic",
    size: 2,
    cost: { wood: 18, stone: 8 },
    storage: 10,
    houses: 0,
    jobs: { healer: 2 },
    radius: 14, // healers tend wounded villagers inside this ring
    hp: 120,
    heal: true,
  },
  watchpost: {
    name: "Watchpost",
    size: 2,
    cost: { wood: 14, stone: 6 },
    storage: 6,
    houses: 0,
    jobs: { guard: 3 },
    radius: 12, // guards patrol for monsters inside this ring
    hp: 150,
    guard: true,
  },
  // ---- M2/M4 defense set. Wall stats follow the wiki Walls page ratios
  // (wood fence 100 HP @ 1 wood, stone wall 200 @ 2 stone; ours sits at
  // 240 so a stone ring outlives two raids of chewing). Walls are 1x1,
  // don't count toward housing or the build limit, and exist to be mazed
  // with (pillar 6). The curtain wall (M4) is the wraith answer: warded
  // masonry no phaser can glide through (our crylithium analog).
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
  curtainWall: {
    name: "Curtain Wall",
    size: 1,
    cost: { blocks: 1 },
    storage: 0,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 460,
    wall: true,
    blocksPhasers: true, // wraiths cannot glide through (doc 04 section 4.2)
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
  stoneGate: {
    name: "Stone Gate",
    size: 1,
    cost: { stone: 4, blocks: 1 },
    storage: 0,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 620,
    wall: true,
    gate: true,
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
    tower: { range: 10, damage: 12, reload: 60, type: "pierce", ammo: "bolts", ammoPerShot: 1 },
  },
  ballista: {
    name: "Ballista",
    size: 1,
    cost: { wood: 20, stone: 8, boards: 4 },
    storage: 0,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 260,
    // The long arm (RtR ballista niche): reaches across the maze, hits
    // hard, drinks two bolts a shot. Community's "best tower" - it still
    // cannot answer blots or wraiths; it just deletes husks and bonewalkers
    // before they reach the gap.
    tower: { range: 14, damage: 30, reload: 110, type: "pierce", ammo: "bolts", ammoPerShot: 2 },
  },
  slingTower: {
    name: "Sling Tower",
    size: 1,
    cost: { wood: 10, stone: 12 },
    storage: 0,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 200,
    // The crush answer (RtR sling niche): bonewalkers shrug off pierce and
    // crack under stone. Ammo is raw stone - every shot is a wall section
    // you didn't build (the tumbler's stone-ball economy, made honest).
    tower: { range: 8, damage: 14, reload: 55, type: "crush", ammo: "stone", ammoPerShot: 1 },
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
    tower: { range: 9, damage: 10, reload: 75, type: "magic", ammo: "bolts", ammoPerShot: 1 },
  },
  // Cheap range extender (RtR Fire Pit, cost exact): projects build range
  // past the wall line, and monsters refuse to attack it - the community's
  // corruption-encirclement tool. It still blocks their feet.
  firePit: {
    name: "Fire Pit",
    size: 1,
    cost: { wood: 6 },
    storage: 0,
    houses: 0,
    jobs: {},
    radius: 0,
    hp: 60,
    firePit: true,
    untargetable: true, // monsters will not attack it (doc 02 section 4.5)
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
  stonecarver: {
    name: "Stonecarver",
    size: 2,
    cost: { wood: 20, stone: 10 },
    storage: 12,
    houses: 0,
    jobs: { mason: 2 },
    radius: 0,
    hp: 130,
    // Refine chain, half two: blocks arm the curtain walls and stone gates
    // that keep wraiths honest.
    craft: { in: { stone: 2 }, out: { blocks: 1 }, ticks: 1000 },
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

// ---- The town ladder (doc 02 section 3: RtR's 15-tier Camp->Castle table
// compressed to 8 mobile tiers). The tier gates the WHOLE late game: build
// limit (RtR: walls never count, gates do), builder jobs, storage, build
// range, nomad draw, and work speed (+1%/tier global, RtR rule). Costs
// follow the same resource ladder as RtR - wood/stone early, boards from
// tier 5, blocks from tier 7.
export const CAMP_TIERS = [
  {
    name: "Camp",
    cost: { wood: 0 },
    hp: 400,
    storage: CAMP_STORAGE,
    radius: 12,
    builders: 4,
    buildLimit: 8,
    nomadMult: 1,
    workMult: 1,
  },
  {
    name: "Large Camp",
    cost: { wood: 20 },
    hp: 520,
    storage: 110,
    radius: 13,
    builders: 5,
    buildLimit: 12,
    nomadMult: 1.1,
    workMult: 1.03,
  },
  {
    name: "Settlement",
    cost: { wood: 30, stone: 10 },
    hp: 650,
    storage: 145,
    radius: 14,
    builders: 6,
    buildLimit: 16,
    nomadMult: 1.2,
    workMult: 1.06,
  },
  {
    name: "Large Settlement",
    cost: { wood: 40, stone: 20 },
    hp: 800,
    storage: 185,
    radius: 15,
    builders: 6,
    buildLimit: 20,
    nomadMult: 1.35,
    workMult: 1.09,
  },
  {
    name: "Village Center",
    cost: { wood: 30, stone: 20, boards: 6 },
    hp: 1000,
    storage: 230,
    radius: 16,
    builders: 7,
    buildLimit: 26,
    nomadMult: 1.5,
    workMult: 1.12,
  },
  {
    name: "Large Village",
    cost: { wood: 40, stone: 30, boards: 8 },
    hp: 1250,
    storage: 280,
    radius: 17,
    builders: 8,
    buildLimit: 32,
    nomadMult: 1.65,
    workMult: 1.15,
  },
  {
    name: "Keep",
    cost: { wood: 40, stone: 40, boards: 10, blocks: 6 },
    hp: 1550,
    storage: 340,
    radius: 18,
    builders: 9,
    buildLimit: 38,
    nomadMult: 1.8,
    workMult: 1.18,
  },
  {
    name: "Stronghold",
    cost: { wood: 60, stone: 60, boards: 14, blocks: 10 },
    hp: 1900,
    storage: 400,
    radius: 20,
    builders: 10,
    buildLimit: 44,
    nomadMult: 2,
    workMult: 1.22,
  },
];
export const CAMP_MAX_TIER = CAMP_TIERS.length;

// ---- Jobs. Self-selected from the idle pool; you only set headcounts
// (RtR Jobs panel). Desired counts below are per-building defaults.
export const JOBS = {
  builder: { name: "Builder", color: "#e8b04b" },
  farmer: { name: "Farmer", color: "#7fb95c" },
  woodcutter: { name: "Woodcutter", color: "#b07845" },
  stonecutter: { name: "Stonecutter", color: "#9aa0a6" },
  carpenter: { name: "Carpenter", color: "#c9a15f" },
  mason: { name: "Mason", color: "#8d99ae" },
  cook: { name: "Cook", color: "#e0915c" },
  occultist: { name: "Occultist", color: "#b48ec8" },
  healer: { name: "Healer", color: "#e0d3b0" },
  guard: { name: "Guard", color: "#d1603d" },
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
// (Rise/decay rates and the desire model live in the M4 section below.)
export const THREAT_MAX = 100;
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
  bonewalker: {
    name: "Bonewalker",
    hp: 70,
    damage: 4,
    attackTicks: 50,
    speed: 1.7, // the fastest thing on the field (doc 04: skeletons are fast)
    splits: null,
    // Skeleton analog (doc 04 section 1.5): arrow-proof and crush-brittle.
    // Sentry-heavy villages meet their counter; slings, ballista stone
    // shot, and villager fists (all crush) are the answer. Arrives M4.
    resists: { pierce: 0.3, crush: 1.5, magic: 1, fire: 1, water: 1 },
    color: "#ddd8c0",
  },
  bloodling: {
    name: "Bloodling",
    hp: 40,
    damage: 3,
    attackTicks: 50,
    speed: 1.2,
    splits: null,
    // M5 Blood Moon slime (doc 04 section 1.3): rises IN the village at the
    // corruption's level. Same counter-lesson as blots - storm magic and
    // crushing hands - but it spawns past your walls, so the answer must
    // already be standing.
    resists: { pierce: 0.45, crush: 0.5, magic: 1.75, fire: 1, water: 1 },
    blood: true,
    color: "#c04a5a",
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

// =====================================================================
// M4 — The climb. Research base: doc 02 section 3 (the town ladder),
// doc 03 sections 1.4/5.3 (faith-scaled influence, prayer), doc 04
// sections 2.4/3.2 (the desire-vs-space threat budget and stronger-
// individuals rebalance). Same convention: structure is faithful, values
// are reasoned defaults rescaled to the 400 s day.
// =====================================================================

// ---- Meals (kitchen output). A meal is one eating stop that fills a
// worker whole: fewer storage walks, which is where hunger really costs.
export const MEAL_EAT_AMOUNT = 45; // vs 25 raw - the kitchen's whole point

// ---- Craft maintain targets (RtR refiners are threshold-driven; ours
// hold these flat stocks and then idle - no config UI on mobile).
export const CRAFT_MAINTAIN = { boards: 30, blocks: 30, meals: 24 };

// ---- Faith (doc 03 section 5.3). A per-villager 0-100 need and the M4
// influence multiplier: max influence = sum(per-villager contribution x
// their faith%). "50% faith = 50% of their potential" - Update 2 rule.
export const FAITH_START = 60;
export const FAITH_DECAY_PER_DAY = 3.5; // slow drift down without care
export const FAITH_HOME_PER_DAY = 8; // sleeping in a real bed (housing bonus)
export const PRAY_TICKS = 900; // one rite at the shrine (~15 s)
export const PRAY_FAITH_SELF = 10;
export const PRAY_FAITH_NEARBY = 4;
export const PRAY_NEARBY_RADIUS = 4;
export const PRAY_INFLUENCE = 8; // free essence piped to the god (rite math)
export const WITNESS_KILL_FAITH = 3; // seeing a monster slain nearby
export const WITNESS_DEATH_FAITH = -8; // seeing a villager fall
export const WITNESS_RADIUS = 9;
export const HEAL_FAITH = 12; // touched by the god's healing
export const GRAB_VILLAGER_FAITH = -4; // being plucked up by the hand
export const METEOR_HURT_FAITH = -15; // the god's rock landed on you
export const UPGRADE_FAITH = 10; // the camp rises - everyone celebrates
// Healing hands (clinic healers, our medic slice of doc 03 section 3.1).
export const TEND_TICKS = 420;
export const TEND_HEAL = 30; // one tending visit

// ---- Corruption Threat v2 (doc 04 section 2.4 verbatim model). Desire
// grows with the day counter; threat rises only while corruption is boxed
// in AND short of the space it desires; undisturbed growth keeps it at 0.
// Pushing back now RAISES threat and can spring a defender from the tile -
// the counterweight that makes purging a decision, not a chore.
export const THREAT_DESIRE_BASE = 40; // tiles the blight wants on day 0
export const THREAT_DESIRE_PER_DAY = 10; // ...and this many more each day
export const THREAT_DESIRE_CAP = 600;
export const THREAT_RISE_PER_DAY = 8; // boxed in, short of desire
export const THREAT_RISE_GAP_BONUS = 6; // extra per 25 tiles of shortfall
export const THREAT_DECAY_PER_DAY = 12; // growing freely
export const THREAT_PUSHBACK = 6; // per tile reclaimed by village pressure
export const THREAT_SPAWN_CHANCE_BASE = 0.1; // uncorrupting may spring a
export const THREAT_SPAWN_CHANCE_PER_THREAT = 0.35; // defender (doc 04 §2.4)
// Threat scales COUNT (M3) and now POWER (doc 04 section 3.2): every 25
// threat is a monster level - "less monsters, stronger individuals".
export const MONSTER_LEVEL_PER_THREAT = 25;
export const MONSTER_LEVEL_MAX = 4;
export const MONSTER_HP_PER_LEVEL = 0.18; // +18% hp per level past 1
export const MONSTER_DAMAGE_PER_LEVEL = 0.12; // +12% damage per level

// ---- Bonewalker (doc 04 section 1.5, skeleton analog): fast, thick-boned,
// shrugs off arrows - the piece that makes Sling Towers and villager fists
// (both crush) matter. Arrives once pierce-heavy defenses feel safe.
export const BONEWALKER_ARRIVAL_DAY = 10; // RtR skeletons day 5 of 18-min
export const BONEWALKER_CHANCE = 0.2; // days; ours is ~9x faster, split the diff

// =====================================================================
// M5 — Meta & world. Research base: doc 04 section 3.3 (special nights),
// doc 01 sections 4-5 (modes, world map, god XP, perks), doc 03 section 1
// (migration rules). Same convention: structure faithful, values reasoned
// defaults rescaled to the 400 s day.
// =====================================================================

// ---- Special nights (doc 04 section 3.3). Decided each dawn for today
// (eclipse, a DAY event) and tonight (the other three), deterministic off
// the run seed. Weights are per-day chances; MOON_COOLDOWN keeps two
// specials from stacking back-to-back while the village is still bruised.
export const MOON_START_DAY = 7; // let walls + counters land first (pillar 10)
export const MOON_COOLDOWN_DAYS = 3; // quiet nights after any special
export const MOON_CHANCE = {
  full: 0.1, // a breather that banks pressure for tomorrow
  eclipse: 0.06, // the day siege - rarest, scariest
  blood: 0.08, // the horde night
  meteor: 0.07, // the bombardment
};
export const MOON_NIGHTMARE_MULT = 1.5; // bad-moon weights x this in
// Nightmare (doc 01 section 4.1: Nightmare only notes "full moons less
// frequent" - we read that as the mode trading breathers for disasters).
// Full Moon: raiders rise but do NOT march (doc 04: "they do not walk to
// your village"); they crumble at dawn like any night. The debt doubles the
// NEXT night's raid - the whole moon is a question: cull them now (towers,
// Grab) or bank the problem.
export const MOON_FULL_NEXT_MULT = 2;
export const MOON_FULL_REGEN_MULT = 1.5; // essence gathers on calm ground
// Eclipse: replaces midday (doc 04 section 3.3) with continuous spawning +
// attacks; night still comes on top. The drip keeps it a siege, not a spike.
export const ECLIPSE_START_PHASE = 2; // midday
export const ECLIPSE_END_PHASE = 4; // through dusk's edge (exclusive)
export const ECLIPSE_DRIP_TICKS = 2600; // one extra raider every ~43 s
// Blood Moon: blood slimes rise IN the village at corruption-matching level
// (doc 04 section 1.3); normal night raids continue alongside.
export const BLOOD_DRIP_TICKS = 2200; // one bloodling every ~37 s of night
export const BLOOD_VILLAGE_RADIUS = 9; // spawn ring around the camp
export const BLOOD_MAX = 6; // sim-budget guard on village spawns
// Meteor Shower: N strikes over the night on random ground, biased toward
// the village (the sky is not neutral). Reuses the Meteor spell impact,
// emberling gamble included (doc 04 section 1.7).
export const METEOR_SHOWER_COUNT = 7;
export const METEOR_SHOWER_VILLAGE_SHARE = 0.55; // this fraction target town

// ---- God XP & perks (doc 01 section 5.2: XP from nearly everything,
// spent on the world map; perks are global and persist through loss).
// DIVERGENCE for pillar 10: no chest lottery - each earned pick chooses
// one of three offered boons outright. The grind ratio is preserved.
export const PERK_XP = {
  nomad: 5, // a wanderer joined
  built: 3, // a building finished
  upgraded: 25, // the camp rose a rung
  slain: 2, // a monster died
  birth: 5, // a child born
  cast: 1, // a spell cast (the god acted)
  night: 2, // a raid survived to its dawn
  moonEclipse: 15,
  moonBlood: 15,
  moonMeteor: 10,
  migrant: 10, // settlers walked to another region
  founded: 30, // a new region was founded
  cleared: 40, // a region scrubbed clean of blight, forever
};
export const XP_FIRST_PICK = 80; // ~one pick inside the first long session
export const XP_PICK_GROWTH = 1.3; // each pick costs 30% more XP than the last

// The perk pool. maxRank caps stacking; the effect line names the exact
// multiplier used in code (perkMult in meta.js is the only reader).
export const PERKS = {
  work: {
    name: "Busy Hands",
    desc: "+10% work speed",
    maxRank: 3,
  },
  water: {
    name: "Deep Springs",
    desc: "+25% well and cistern water",
    maxRank: 2,
  },
  crops: {
    name: "Fertile Rows",
    desc: "+20% crop harvests",
    maxRank: 2,
  },
  wood: {
    name: "Keen Axes",
    desc: "+1 wood per tree",
    maxRank: 2,
  },
  stone: {
    name: "Sharp Picks",
    desc: "+1 stone per rock",
    maxRank: 2,
  },
  nomads: {
    name: "Wandering Hearts",
    desc: "+0.3 wanderers per day",
    maxRank: 3,
  },
  faith: {
    name: "Devout Voices",
    desc: "faith fades 50% slower",
    maxRank: 2,
  },
  spells: {
    name: "Storm Covenant",
    desc: "spells cost 10% less",
    maxRank: 2,
  },
  towers: {
    name: "Nightwatch",
    desc: "towers hit 10% harder",
    maxRank: 2,
  },
  influence: {
    name: "Second Wind",
    desc: "influence returns 20% faster",
    maxRank: 2,
  },
  hunger: {
    name: "Iron Stomachs",
    desc: "starvation and thirst hurt 30% less",
    maxRank: 2,
  },
  ward: {
    name: "Moonlit Ward",
    desc: "evil moons run 20% milder",
    maxRank: 1,
  },
};
export const PERK_CHOICES = 3; // boons offered per pick

// ---- Regions & biomes (doc 01 section 4.2: connected regions, migration,
// per-region difficulty; doc 03 section 1: migrants are young healthy
// adults, local pop must be 15+ to send). Three regions, three biomes, one
// save: the world map sheet travels between them (each region's sim sleeps
// in the save; only the active one ticks - a battery-friendly divergence).
export const REGIONS = [
  {
    id: "greenwood",
    name: "Greenwood",
    biome: "verdant",
    stars: 1,
    blurb: "Soft hills, deep woods. Where the wilds first took you in.",
  },
  {
    id: "ashen",
    name: "Ashen Steppe",
    biome: "dry",
    stars: 2,
    blurb: "Sparse trees, bare rock, long sightlines. Raiders come early and hungry.",
  },
  {
    id: "mirefen",
    name: "Mirefen",
    biome: "marsh",
    stars: 3,
    blurb: "Drowned ground veined with water. The blight here has an appetite.",
  },
];
// Per-star difficulty knobs (index = stars-1): monsters arrive earlier,
// raids run bigger, the blight wants more ground.
export const REGION_DIFF = [
  { arriveMult: 1, raidMult: 1, desireMult: 1 },
  { arriveMult: 0.8, raidMult: 1.15, desireMult: 1.15 },
  { arriveMult: 0.65, raidMult: 1.3, desireMult: 1.3 },
];
// Biome worldgen (world.js reads these): water cut raises the sea share;
// forest/rock/bush cut lower = more of that feature. Growth mult scales
// crop maturation (dry soil is stingy, muck is generous).
export const BIOMES = {
  verdant: { water: 0.3, dirt: 0.36, forest: 0.6, rocky: 0.78, berry: 0.8, growth: 1 },
  dry: { water: 0.22, dirt: 0.3, forest: 0.72, rocky: 0.68, berry: 0.84, growth: 1.15 },
  marsh: { water: 0.4, dirt: 0.44, forest: 0.56, rocky: 0.82, berry: 0.72, growth: 0.9 },
};
export const FOUND_TIER = 3; // the world opens once the camp is a Settlement
export const FOUND_COST = { wood: 60, food: 40 }; // the founding caravan
export const FOUND_SETTLERS = 6; // young adults who walk out at dawn
export const FOUND_START_BOOST = { wood: 40, food: 30, water: 30, stone: 10, bolts: 20 };
export const MIGRATE_MIN_POP = 15; // RtR rule: pop must be 15+ to send at all
export const MIGRATE_MAX_BATCH = 8; // UI stepper ceiling per departure
export const MIGRATE_HEALTH = 60; // "young, healthy adults" (no children)

// ---- Modes (doc 01 section 4.1: Traditional / Survival / Nightmare /
// Peaceful / Sandbox / Custom). One knob set, read by monsters.js,
// corruption.js and moons.js. Custom is the user-tuned subset of the same
// knobs; Sandbox adds an infinite purse (live god-hand manipulation).
export const MODES = {
  traditional: {
    name: "Traditional",
    blurb: "The intended first climb. Blight lands on day 2, raids from night 3.",
    corruptionDay: 2,
    raidStartDay: 3,
    arrivalMult: 1,
    raidMult: 1,
    threatMult: 1,
    peaceful: false,
    infiniteInfluence: false,
  },
  peaceful: {
    name: "Peaceful",
    blurb: "No blight, no raids, no moons. Just villagekeeping.",
    corruptionDay: Infinity,
    raidStartDay: Infinity,
    arrivalMult: 1,
    raidMult: 0,
    threatMult: 0,
    peaceful: true,
    infiniteInfluence: false,
  },
  nightmare: {
    name: "Nightmare",
    blurb: "Blight at dawn day 1, raids from night 2, evil moons far likelier.",
    corruptionDay: 1,
    raidStartDay: 2,
    arrivalMult: 0.7,
    raidMult: 1.25,
    threatMult: 1.3,
    peaceful: false,
    infiniteInfluence: false,
  },
  custom: {
    name: "Custom",
    blurb: "Tune the wilds yourself: monster pace, raid size, and whether they come at all.",
    corruptionDay: 2,
    raidStartDay: 3,
    arrivalMult: 1,
    raidMult: 1,
    threatMult: 1,
    peaceful: false,
    infiniteInfluence: false,
  },
  sandbox: {
    name: "Sandbox",
    blurb: "The god's purse never empties. Everything else plays by the normal rules.",
    corruptionDay: 2,
    raidStartDay: 3,
    arrivalMult: 1,
    raidMult: 1,
    threatMult: 1,
    peaceful: false,
    infiniteInfluence: true,
  },
};
