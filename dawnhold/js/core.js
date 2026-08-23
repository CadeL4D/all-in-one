'use strict';
/* ============================================================
   Dawnhold — core.js
   CONFIG: every balance number lives here so the game can be
   tuned from one place. U: utilities. G: live game state.
   ============================================================ */

const CONFIG = {
  MAP_W: 72, MAP_H: 72, TILE: 16,

  // --- day cycle (seconds at 1x speed) ---
  DAY_LEN: 210, NIGHT_LEN: 95, TRANS: 22,   // TRANS = dusk/dawn fade

  START: { wood: 26, stone: 0, food: 48, essence: 40, herbs: 0, arrows: 0, tools: 0, meals: 0, ale: 0 },
  VIL_START: 6,

  // --- hunger / food ---
  HUNGER: { rate: 0.355, mealAt: 66, mealRestore: 54, mealCost: 3, starveDps: 0.9 },

  // --- work ---
  CARRY: 8,                       // units hauled per trip
  WORK_T: { forager: 0.78, lumber: 0.85, miner: 1.0, medic: 0.8 },
  CLEAR: { time: 1.3, waterTime: 4, waterCost: 2 }, // secs/tile (half yield salvaged); water fill is slower and costs stone
  FARM: { grow: 95, yield: 15, tendBoost: 1.2 },
  REPAIR: { rate: 22, cost: 24 }, // hp/s while repairing, hp per 1 resource

  // --- supply lines (v1.2): crafting jobs, ammo, tools, meals, ale, storage ---
  CRAFT: {
    arrows: { time: 2.4, in: { wood: 1 }, out: 2 },           // fletcher
    tools:  { time: 3.2, in: { wood: 2, stone: 1 }, out: 1 }, // smith
    meals:  { time: 3.0, in: { food: 3, wood: 1 }, out: 2 },  // cook
    ale:    { time: 3.4, in: { food: 2, herbs: 1 }, out: 1 }, // brewer
  },
  AMMO:  { perShot: 1, ballistaShots: 2, raidCost: 5, dryMult: 0.75 },
  TOOL:  { cond: 100, wear: 0.8, dryMult: 0.65 }, // one tool ≈ two minutes of work
  MEAL:  { restore: 85 },                          // a hot meal vs raw berries
  ALE:   { buzz: 0.10 },                           // dusk drink → tomorrow's work
  STORE: { // hoard caps; Granaries & Storehouses raise them, overflow spoils at dawn
    wood: 120, stone: 120, food: 80, herbs: 20, arrows: 60, tools: 10, meals: 12, ale: 12,
    perGranary: 80, perStorehouse: 100, perWarehouse: 60,
  },
  COMFORT: { snug: 1.05, snugAt: 1.3, crowd: 0.95, crowdAt: 1.0, packed: 0.88, packedAt: 0.7, leaveChance: 0.2 },

  // --- villagers / combat ---
  V: { hp: 60, spd: 2.3, dmg: 3, atkT: 0.85, dayHeal: 0.28 },
  GUARD: { dmg: 7.5, atkT: 0.72, aggro: 13 },

  // --- towers ---
  TOWER:    { dmg: 8,  rate: 1.1, range: 5.5 },
  BALLISTA: { dmg: 27, rate: 2.3, range: 7.5 },

  // --- essence / powers ---
  ESSENCE: { max: 120, regenDay: 0.105, regenNight: 0.05, perKill: 2 },
  POWERS: {
    mend:    { cost: 12, heal: 45, cd: 1.0 },
    smite:   { cost: 22, dmg: 32, r: 1.7, cd: 1.2 },
    stasis:  { cost: 30, dur: 5, r: 2.2, cd: 2.0, unlockDay: 5 },
    meteor:  { cost: 65, dmg: 130, r: 2.8, cd: 3.0, unlockDay: 6 },
  },

  // --- waves ---
  WAVE: { base: 1.4, per: 1.75, cap: 30, spawnWindow: 30, hpScaleDay: 9, hpScale: 0.055, final: 2.1, bloodEvery: 5, bloodMult: 1.5, noLairMult: 0.75 },

  MONS: {
    shade:   { name: 'Shade',   hp: 28,  dmg: 4,  spd: 1.75, atkT: 0.9,  ess: 2, r: 0.5 },
    runner:  { name: 'Runner',  hp: 17,  dmg: 3,  spd: 2.9,  atkT: 0.65, ess: 2, from: 3, w: 0.22 },
    brute:   { name: 'Brute',   hp: 95,  dmg: 12, spd: 1.15, atkT: 1.4,  ess: 5, from: 6, w: 0.15, bld: 2.4 },
    stalker: { name: 'Stalker', hp: 34,  dmg: 7,  spd: 2.45, atkT: 0.8,  ess: 3, from: 9, w: 0.16 },
    boner:   { name: 'Bonecaster', hp: 42, dmg: 6, spd: 1.3, atkT: 2.2, ess: 4, from: 7, w: 0.14, bld: 1.6, range: 4.5 },
    wraith:  { name: 'Wraith',  hp: 46,  dmg: 9,  spd: 1.6,  atkT: 0.9,  ess: 5, from: 11, w: 0.18, phase: true },
    colossus:{ name: 'Colossus', hp: 700, dmg: 30, spd: 0.8, atkT: 1.8,  ess: 30, from: 15, w: 0.10, bld: 3.5, r: 0.8 },
    lord:    { name: 'Night Lord', hp: 900, dmg: 24, spd: 1.0, atkT: 1.6, ess: 40, bld: 2.6, r: 0.7 },
  },

  // --- lairs & raids ---
  LAIR: { hp: 1100, ess: 25, count: 3, regenDelay: 8, regenPct: 0.006 },
  RAID: { defEvery: 7, defCap: 5 },  // monolith defenders while raided: spawn interval, alive cap

  // --- herb / healing economy ---
  HERB: { amt: 5, regrow: 210, healRate: 6, herbPerHeal: 5 },
  MINE: { rate: 2.8 },
  FISHER: { rate: 3.4, carry: 6 },
  TRAP: { dmg: 15, hpCost: 40, slow: 1.0 },
  BARRACKS: { dmgMult: 1.3 },
  RUIN: { stone: 14 },
  CRYSTAL: { stone: 6, essence: 8 },

  // --- population growth ---
  ARRIVE: { chance: 0.65, foodNeed: 14, everyN: 3, n: 2, maxPop: 44 },

  // --- difficulty presets ---
  DIFF: {
    peaceful: { wave: 0,    hp: 1,    night: 0.8,  regen: 1.25, label: 'Peaceful' },
    easy:     { wave: 0.68, hp: 0.88, night: 0.88, regen: 1.1,  label: 'Easy' },
    normal:   { wave: 1,    hp: 1,    night: 1,    regen: 1,    label: 'Normal' },
    hard:     { wave: 1.38, hp: 1.22, night: 1.15, regen: 0.9,  label: 'Hard' },
  },

  ZOOM: { min: 1.35, max: 4.2, start: 2.6 },
  SAVE_V: 1,
};

// ---- terrain tile ids ----
const T = { GRASS: 0, DIRT: 1, WATER: 2, ROAD: 3, SAND: 4 };

// ---- map object ids (things standing on terrain) ----
const OBJ = { NONE: 0, TREE: 1, PINE: 2, BUSH: 3, ROCK: 4, STUMP: 5, SAPLING: 6, FLOWER: 7, MUSH: 8, TGRASS: 9, HERB: 10, RUIN: 11, CRYSTAL: 12, DEADTREE: 13, BIRCH: 14, GRAVE: 15 };

// object yields (units per full source)
const OBJ_AMT = { 1: 9, 2: 9, 3: 7, 4: 10, 10: 5, 11: 14, 12: 6, 13: 4 };

// ---- jobs ----
const JOBS = ['idle', 'forager', 'lumber', 'miner', 'farmer', 'fisher', 'medic', 'builder', 'guard', 'fletcher', 'smith', 'cook', 'brewer'];
const JOB_INFO = {
  idle:     { name: 'Resting',  cloth: '#e8e0d0', desc: 'No duty. They haul nothing and stay near camp. Idle folk will emergency-forage if food runs dry.' },
  forager:  { name: 'Forager',  cloth: '#4a8f3c', desc: 'Pick berries from bushes. Fast food early on; bushes regrow each day.' },
  lumber:   { name: 'Lumberjack', cloth: '#8a5a2b', desc: 'Fell trees for wood. Stumps slowly regrow into new trees.' },
  miner:    { name: 'Miner',    cloth: '#7d7d85', desc: 'Mine stone from boulders and lodes, salvage ancient ruins, crack essence crystals.' },
  farmer:   { name: 'Farmer',   cloth: '#d9a036', desc: 'Tend and harvest wheat plots. The reliable food engine for a growing village.' },
  fisher:   { name: 'Fisher',   cloth: '#5a8fc9', desc: 'Works a Fishing Dock on the shore — steady food, no land used.' },
  medic:   { name: 'Medic',    cloth: '#3f9d84', desc: 'Gathers healing herbs to stock the Hospital, which mends the wounded nearby. Requires a Hospital.' },
  builder:  { name: 'Builder',  cloth: '#e07030', desc: 'Raises new buildings and repairs damaged walls and towers.' },
  guard:    { name: 'Guard',    cloth: '#c03030', desc: 'Patrols the village and fights the shades. Keep at least one after night one.' },
  fletcher: { name: 'Fletcher', cloth: '#6b8f4a', desc: 'Works the Fletcher Hut, turning wood into arrows. Towers and raiding guards burn them — dry quivers mean a silent defense. Requires a Fletcher Hut.' },
  smith:    { name: 'Smith',    cloth: '#8a5a52', desc: 'Runs the Smithy, forging tools from wood and stone. Every worker wears a tool out — bare hands work slowly. Requires a Smithy.' },
  cook:     { name: 'Cook',     cloth: '#c9803c', desc: 'Runs the Kitchen, turning 3 food + 1 wood into 2 hearty meals that feed far better than raw berries. Requires a Kitchen.' },
  brewer:   { name: 'Brewer',   cloth: '#b8862e', desc: 'Runs the Tavern, brewing food + herbs into ale. A drink at dusk makes the whole village work faster tomorrow. Requires a Tavern.' },
};

// duties that need their workplace built before they can be staffed
const JOB_NEEDS = { medic: 'hospital', fletcher: 'fletch', smith: 'smithy', cook: 'kitchen', brewer: 'tavern' };

// ---- utilities ----
const U = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  irnd: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  choice: arr => arr[Math.floor(Math.random() * arr.length)],
  dst: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  dst2: (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
  mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  hash2(x, y) { // cheap deterministic per-tile hash 0..1
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  },
  fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : '' + Math.floor(n); },
  esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
};

let _id = 1;
const NID = () => _id++;

// ---- live game state (reset by Sim.newGame / SaveSys.load) ----
const G = {
  state: 'title',          // title | playing | defeat | victory
  seed: 1, day: 1,
  time: 0,                 // seconds into current phase
  phase: 'day',            // day | dusk | night | dawn
  speed: 1, paused: false,
  diff: 'normal', diffM: CONFIG.DIFF.normal,
  res: { wood: 0, stone: 0, food: 0, essence: 0, herbs: 0, arrows: 0, tools: 0, meals: 0, ale: 0 },
  villagers: [], monsters: [], buildings: [],
  clearJobs: [],           // queued land-clearing tiles {x, y} for builders
  effects: [], floaters: [],
  jobs: { idle: 0, forager: 2, lumber: 2, miner: 1, farmer: 0, fisher: 0, medic: 0, builder: 1, guard: 0, fletcher: 0, smith: 0, cook: 0, brewer: 0 },
  regrow: new Map(),       // tileIdx -> {t, kind}
  unlocks: {},             // buildKey -> true (granted)
  stats: { kills: 0, deaths: 0, built: 0, gathered: 0, wavePeak: 0, peakPop: 6 },
  chronicle: [],           // {d, txt, k}
  wave: null,              // pending spawn state for the night
  finalNight: false, beaconLit: false, boss: null, bloodMoon: false,
  raidTarget: null,        // lair building the guards are ordered to raid
  dryWarned: false,        // one "towers are dry" notice per night
  tut: 0, tutOn: true,
  shake: 0,
  cam: { x: 0, y: 0, z: CONFIG.ZOOM.start },
  sel: null,               // {kind:'v'|'m'|'b', ref}
  follow: null,
  settings: { fx: true, autosave: true },
  lastEssenceSpent: 0,
};

// phase helpers -------------------------------------------------
function cycleLen() {
  return CONFIG.DAY_LEN + CONFIG.NIGHT_LEN + CONFIG.TRANS * 2;
}
function isNightLike() { return G.phase === 'night' || G.phase === 'dusk'; }
function isDayLike() { return G.phase === 'day' || G.phase === 'dawn'; }
function isWorkTime() { return G.phase === 'day' || G.phase === 'dawn'; }
// 0 = bright noon, 1 = deep night
function darknessLevel() {
  const C = CONFIG;
  switch (G.phase) {
    case 'day': return 0;
    case 'dusk': return U.clamp(G.time / C.TRANS, 0, 1) * 0.80;
    case 'night': return 0.80;
    case 'dawn': return (1 - U.clamp(G.time / C.TRANS, 0, 1)) * 0.80;
  }
  return 0;
}
