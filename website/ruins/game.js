// Game state assembly and the fixed-timestep step. Rendering, input and UI
// sample this state; nothing here touches the DOM (node-testable).
import * as B from "./balance.js";
import { createRng } from "./rng.js";
import { createClock, advance, phaseInfo } from "./clock.js";
import { createWorld, idx, F_NONE, F_SAPLING, F_TREE } from "./world.js";
import * as bd from "./buildings.js";
import { createVillager, tickVillager, indexWaterTiles } from "./villager.js";
import { scheduleNomads, tickNomads, rollBirths, assignHomes } from "./growth.js";
import { createCorruptionState, ensureCorruptionSpawn, tickCorruption, corruptionDawn } from "./corruption.js";
import { createRaidState, tickMonsters, raidsAtNightfall, raidsAtDawn } from "./monsters.js";

export function createGame(seed = (Math.random() * 0xffffffff) >>> 0) {
  const state = {
    seed,
    rng: null,
    clock: createClock(),
    world: null,
    buildings: [],
    buildingAt: new Int32Array(B.MAP_SIZE * B.MAP_SIZE).fill(-1),
    gateTiles: new Set(), // tiles villagers may walk through, monsters may not
    villagers: [],
    nomads: [],
    nomadQueue: [],
    monsters: [],
    projectiles: [],
    raid: createRaidState(),
    corruption: createCorruptionState(),
    corpses: [],
    resources: { ...B.START_RESOURCES },
    jobCounts: { builder: 2, farmer: 2, woodcutter: 2, stonecutter: 0 },
    flags: { storageFull: false, duskAnnounced: false, wallsDirty: true },
    nextId: 1,
    events: [],
    stats: { sitesPlaced: 0, built: 0, died: 0, slain: 0, peakPop: B.START_POP },
    lastDawn: 0,
    lost: null, // { day, cause } once the run ends (pillar 4: loss as content)
  };
  state.rng = createRng(seed);
  state.world = createWorld(seed);
  indexWaterTiles(state.world);

  // The camp stands before anyone arrives (RtR: villagers spawn with it).
  const camp = bd.placeSite(state, "camp", B.CAMP_TILE.x, B.CAMP_TILE.y);
  camp.delivered = 999;
  camp.workDone = camp.workNeeded;
  bd.siteComplete(state, camp);

  for (let i = 0; i < B.START_POP; i++) {
    let x = 0,
      y = 0;
    for (let tries = 0; tries < 12; tries++) {
      const angle = state.rng.range(0, Math.PI * 2);
      const r = state.rng.range(1, B.CLEAR_RADIUS - 1.5);
      x = Math.floor(B.CAMP_TILE.x + 1 + Math.cos(angle) * r);
      y = Math.floor(B.CAMP_TILE.y + 1 + Math.sin(angle) * r);
      const ti = y * B.MAP_SIZE + x;
      if (x > 0 && y > 0 && x < B.MAP_SIZE && y < B.MAP_SIZE && state.buildingAt[ti] === -1)
        break;
    }
    createVillager(state, x + 0.5, y + 0.5, "adult");
  }
  assignHomes(state);
  scheduleNomads(state);
  return state;
}

// Advance the sim by `ticks` (caller batches per frame: speed 2 => 2 ticks).
// A lost village freezes the sim: the run is over, the overlay tells the tale.
export function stepGame(state, ticks) {
  if (state.lost) return;
  for (let t = 0; t < ticks; t++) {
    const prevPhase = state.clock.phaseIndex;
    advance(state.clock, 1);

    // Nightfall: the nests release their raiders (doc 04 section 3.1).
    if (prevPhase === 4 && state.clock.phaseIndex === 5) raidsAtNightfall(state);

    // The blight lands with the dawn, BEFORE this tick's corruption beat, so
    // the nest search sees the fresh blob on the spawn morning itself
    // (idempotent; a no-op on every other dawn).
    if (prevPhase !== 0 && state.clock.phaseIndex === 0) ensureCorruptionSpawn(state);

    for (const v of state.villagers) if (!v.dead) tickVillager(state, v, 1);
    tickNomads(state, 1);
    bd.tickProduction(state, 1);
    tickRegrow(state);
    tickCorruption(state);
    tickMonsters(state, 1);

    // Dawn beats: births, nomad schedule, corruption threat, retreats.
    if (prevPhase !== 0 && state.clock.phaseIndex === 0 && state.clock.day > state.lastDawn) {
      state.lastDawn = state.clock.day;
      rollBirths(state);
      scheduleNomads(state);
      corruptionDawn(state);
      raidsAtDawn(state);
      state.stats.peakPop = Math.max(state.stats.peakPop, state.villagers.length);
      state.events.push({ type: "dawn", day: state.clock.day });
    }
    cleanupDead(state);
    checkLoss(state);
    if (state.lost) return;
  }
  // Dusk announcement (the heartbeat: day is ending).
  if (state.clock.phaseIndex === 4 && !state.flags.duskAnnounced) {
    state.flags.duskAnnounced = true;
    state.events.push({ type: "dusk" });
  }
  if (state.clock.phaseIndex !== 4) state.flags.duskAnnounced = false;
}

// Pillar 4: brutal-but-fair loss is content. The run ends when the camp is
// chewed down or the last villager falls; the overlay turns the failure
// into a story (days, peak, kills) and restart takes seconds.
function checkLoss(state) {
  if (state.lost) return;
  const camp = state.buildings.find((b) => b.type === "camp");
  if (!camp) state.lost = { day: state.clock.day, cause: "The camp has fallen" };
  else if (state.villagers.length === 0)
    state.lost = { day: state.clock.day, cause: "The last villager has fallen" };
  if (state.lost) {
    state.lost.slain = state.stats.slain;
    state.lost.peakPop = state.stats.peakPop;
    state.lost.built = state.stats.built;
    state.events.push({ type: "village-lost", cause: state.lost.cause, day: state.lost.day });
  }
}

function tickRegrow(state) {
  if (state.clock.tick % 600 !== 0) return;
  const { world } = state;
  for (const [i, entry] of world.regrow) {
    if (state.clock.tick < entry.readyTick) continue;
    if (entry.stage === "sapling") {
      world.feature[i] = F_TREE;
      world.trees.add(i);
      world.regrow.delete(i);
    } else if (entry.stage === "bush") {
      world.regrow.delete(i); // berries are back (render checks regrow map)
    } else if (entry.stage === "stump") {
      world.feature[i] = F_NONE;
      world.regrow.delete(i);
    }
  }
  // Rare new saplings on open ground near existing trees (slow renewability).
  if (state.rng.chance(B.SAPLINGS_PER_DAY * (600 / B.DAY_TICKS))) {
    const trees = [...world.trees];
    if (trees.length) {
      const base = trees[state.rng.int(0, trees.length - 1)];
      const size = world.size;
      const x = (base % size) + state.rng.int(-2, 2);
      const y = Math.floor(base / size) + state.rng.int(-2, 2);
      if (x > 0 && y > 0 && x < size && y < size) {
        const i = idx(x, y);
        if (world.feature[i] === F_NONE && world.terrain[i] !== 2 && state.buildingAt[i] === -1 && !world.plots.has(i)) {
          world.feature[i] = F_SAPLING;
          world.regrow.set(i, { stage: "sapling", readyTick: state.clock.tick + B.DAY_TICKS });
        }
      }
    }
  }
  // Fade old corpses.
  state.corpses = state.corpses.filter((c) => c.decay > state.clock.tick);
}

function cleanupDead(state) {
  if (!state.villagers.some((v) => v.dead)) return;
  for (const v of state.villagers) {
    if (!v.dead) continue;
    if (v.workBuilding !== null) {
      const b = state.buildings.find((b2) => b2.id === v.workBuilding);
      if (b) b.workers = b.workers.filter((id) => id !== v.id);
    }
  }
  state.stats.died += state.villagers.filter((v) => v.dead).length;
  state.villagers = state.villagers.filter((v) => !v.dead);
}

// ---- Commands (from the UI layer).

export function setJobDesired(state, job, delta) {
  const slots = bd.jobSlots(state);
  const max = slots[job] ?? 0;
  const next = Math.max(0, Math.min(max, (state.jobCounts[job] ?? 0) + delta));
  state.jobCounts[job] = next;
  // Lay off excess workers (latest hires quit first).
  const employed = state.villagers.filter((v) => !v.dead && v.job === job);
  if (employed.length > next) {
    for (const v of employed.slice(next)) {
      v.job = null;
      v.task = null;
      const b = state.buildings.find((b2) => b2.id === v.workBuilding);
      if (b) b.workers = b.workers.filter((id) => id !== v.id);
      v.workBuilding = null;
    }
  }
}

export function placeBuilding(state, type, x, y) {
  const check = bd.canPlace(state, type, x, y);
  if (!check.ok) return check;
  bd.placeSite(state, type, x, y);
  state.events.push({ type: "site-placed", name: B.BUILDINGS[type].name, x, y });
  return { ok: true };
}

// Drag-paint walls: place a run of 1x1 tiles in one confirm, paying only
// for the tiles that actually fit (master plan section 5.2). The run chains
// off itself, so one confirm can push territory outward.
export function placeWallRun(state, type, tiles) {
  const placed = [];
  const runKeys = new Set();
  for (const [x, y] of tiles) {
    if (bd.canPlaceInRun(state, type, x, y, runKeys).ok) {
      bd.placeSite(state, type, x, y);
      placed.push([x, y]);
      runKeys.add(`${x},${y}`);
    }
  }
  if (placed.length) {
    state.flags.wallsDirty = true;
    state.events.push({ type: "site-placed", name: B.BUILDINGS[type].name, count: placed.length });
  }
  return placed;
}

export function phaseOf(state) {
  return phaseInfo(state.clock);
}
