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
export const RESOURCES = ["wood", "food", "water"];
// RtR hands you up to 64 starting supplies incl. wood (Update 2 notes);
// 64 wood covers well+farm+sawpit with margin - no bootstrap deadlock.
export const START_RESOURCES = { wood: 64, food: 24, water: 30 };
export const CAMP_STORAGE = 40;
export const STOREHOUSE_STORAGE = 60;
export const HOME_STORAGE = 6;
// Guides: ~2 wells for the first 10-20 villagers. A villager burns 70
// thirst/day, so one well covers roughly a dozen of them.
export const WELL_WATER_PER_DAY = 800;
export const WELL_STORAGE = 60;

// ---- Buildings (M1 set). Wood is the only build resource until walls.
export const BUILDINGS = {
  camp: {
    name: "Camp",
    size: 2,
    cost: { wood: 0 },
    storage: CAMP_STORAGE,
    jobs: { builder: 4 },
    radius: 12, // build range radiates from the center (RtR rule)
    houses: 0,
    hp: 100,
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
};

export const DISMANTLE_REFUND = 0.5; // fraction of cost refunded (RtR salvages)

// ---- Jobs. Self-selected from the idle pool; you only set headcounts
// (RtR Jobs panel). Desired counts below are per-building defaults.
export const JOBS = {
  builder: { name: "Builder", color: "#e8b04b" },
  farmer: { name: "Farmer", color: "#7fb95c" },
  woodcutter: { name: "Woodcutter", color: "#b07845" },
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
