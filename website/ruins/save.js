// Deterministic snapshots: save-anywhere + dawn autosave (mobile session
// model). Everything needed to resume the exact sim state is in the blob;
// the seeded RNG state is included so replays stay reproducible.
import { createGame } from "./game.js";
import { MAP_SIZE } from "./balance.js";
import { F_TREE, F_ROCK, F_BUSH } from "./world.js";
import { indexWaterTiles } from "./villager.js";
import { footprint } from "./buildings.js";

export const SAVE_KEY = "ruins-save-v1";
// v2: night raids - corruption field, monsters, nests, threat, walls/gates.
// v1 blobs predate all of it and are treated as a fresh island.
export const SAVE_VERSION = 2;

function rleEncode(arr) {
  const out = [];
  let prev = arr[0],
    run = 1;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === prev && run < 65535) run++;
    else {
      out.push(prev, run);
      prev = arr[i];
      run = 1;
    }
  }
  out.push(prev, run);
  return out;
}

function rleDecode(pairs, target) {
  let o = 0;
  for (let i = 0; i < pairs.length; i += 2) {
    const value = pairs[i],
      run = pairs[i + 1];
    target.fill(value, o, o + run);
    o += run;
  }
}

export function serialize(state) {
  return {
    v: SAVE_VERSION,
    seed: state.seed,
    rng: state.rng.state(),
    clock: { ...state.clock },
    lastDawn: state.lastDawn,
    lost: state.lost,
    resources: { ...state.resources },
    jobCounts: { ...state.jobCounts },
    flags: { ...state.flags },
    nextId: state.nextId,
    stats: { ...state.stats },
    terrain: rleEncode(state.world.terrain),
    feature: rleEncode(state.world.feature),
    corruption: rleEncode(state.world.corruption),
    regrow: [...state.world.regrow].map(([i, e]) => [i, e.stage, e.readyTick]),
    plots: [...state.world.plots].map(([i, e]) => [i, e.farm, e.readyTick]),
    corruptionMeta: { ...state.corruption },
    raid: { ...state.raid },
    buildings: state.buildings,
    villagers: state.villagers,
    nomads: state.nomads,
    nomadQueue: state.nomadQueue,
    monsters: state.monsters,
    corpses: state.corpses,
  };
}

export function deserialize(data) {
  if (!data || data.v !== SAVE_VERSION) return null;
  const state = createGame(data.seed);
  state.rng.restore(data.rng);
  Object.assign(state.clock, data.clock);
  state.lastDawn = data.lastDawn;
  state.lost = data.lost ?? null;
  state.resources = { ...data.resources };
  state.jobCounts = { ...data.jobCounts };
  state.flags = { ...data.flags, wallsDirty: true };
  state.nextId = data.nextId;
  state.stats = { ...data.stats };
  rleDecode(data.terrain, state.world.terrain);
  rleDecode(data.feature, state.world.feature);
  rleDecode(data.corruption, state.world.corruption);
  state.world.regrow = new Map(
    data.regrow.map(([i, stage, readyTick]) => [i, { stage, readyTick }]),
  );
  state.world.plots = new Map(data.plots.map(([i, farm, readyTick]) => [i, { farm, readyTick }]));
  state.world.trees = new Set();
  state.world.rocks = new Set();
  state.world.bushes = new Set();
  let corrupted = 0;
  for (let i = 0; i < MAP_SIZE * MAP_SIZE; i++) {
    const f = state.world.feature[i];
    if (f === F_TREE) state.world.trees.add(i);
    else if (f === F_ROCK) state.world.rocks.add(i);
    else if (f === F_BUSH) state.world.bushes.add(i);
    if (state.world.corruption[i]) corrupted++;
  }
  state.world.corrupted = corrupted;
  state.corruption = { ...data.corruptionMeta };
  state.raid = { ...data.raid };
  indexWaterTiles(state.world);
  state.buildings = data.buildings;
  state.villagers = data.villagers;
  state.nomads = data.nomads;
  state.nomadQueue = data.nomadQueue;
  state.monsters = data.monsters ?? [];
  state.projectiles = [];
  state.corpses = data.corpses;
  // Re-stamp building occupancy (and gate walkthroughs) from the saved
  // list - the fresh camp stamped by createGame is replaced wholesale.
  state.buildingAt.fill(-1);
  state.gateTiles = new Set();
  for (const b of state.buildings) {
    for (const i of footprint(b.type, b.x, b.y)) {
      state.buildingAt[i] = b.id;
      if (b.type === "gate") state.gateTiles.add(i);
    }
  }
  state.events = [];
  return state;
}

export function saveToLocal(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(state)));
    return true;
  } catch {
    return false;
  }
}

export function loadFromLocal() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? deserialize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* private mode: nothing to clear */
  }
}
