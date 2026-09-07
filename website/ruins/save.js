// Deterministic snapshots: save-anywhere + dawn autosave (mobile session
// model). Everything needed to resume the exact sim state is in the blob;
// the seeded RNG state is included so replays stay reproducible.
import { createGame } from "./game.js";
import { MAP_SIZE } from "./balance.js";
import { F_TREE, F_ROCK, F_BUSH } from "./world.js";
import { indexWaterTiles } from "./villager.js";

export const SAVE_KEY = "ruins-save-v1";
export const SAVE_VERSION = 1;

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
    resources: { ...state.resources },
    jobCounts: { ...state.jobCounts },
    flags: { ...state.flags },
    nextId: state.nextId,
    stats: { ...state.stats },
    terrain: rleEncode(state.world.terrain),
    feature: rleEncode(state.world.feature),
    regrow: [...state.world.regrow].map(([i, e]) => [i, e.stage, e.readyTick]),
    plots: [...state.world.plots].map(([i, e]) => [i, e.farm, e.readyTick]),
    buildings: state.buildings,
    villagers: state.villagers,
    nomads: state.nomads,
    nomadQueue: state.nomadQueue,
    corpses: state.corpses,
  };
}

export function deserialize(data) {
  if (!data || data.v !== SAVE_VERSION) return null;
  const state = createGame(data.seed);
  state.rng.restore(data.rng);
  Object.assign(state.clock, data.clock);
  state.lastDawn = data.lastDawn;
  state.resources = { ...data.resources };
  state.jobCounts = { ...data.jobCounts };
  state.flags = { ...data.flags };
  state.nextId = data.nextId;
  state.stats = { ...data.stats };
  rleDecode(data.terrain, state.world.terrain);
  rleDecode(data.feature, state.world.feature);
  state.world.regrow = new Map(
    data.regrow.map(([i, stage, readyTick]) => [i, { stage, readyTick }]),
  );
  state.world.plots = new Map(data.plots.map(([i, farm, readyTick]) => [i, { farm, readyTick }]));
  state.world.trees = new Set();
  state.world.rocks = new Set();
  state.world.bushes = new Set();
  for (let i = 0; i < MAP_SIZE * MAP_SIZE; i++) {
    const f = state.world.feature[i];
    if (f === F_TREE) state.world.trees.add(i);
    else if (f === F_ROCK) state.world.rocks.add(i);
    else if (f === F_BUSH) state.world.bushes.add(i);
  }
  indexWaterTiles(state.world);
  state.buildings = data.buildings;
  state.villagers = data.villagers;
  state.nomads = data.nomads;
  state.nomadQueue = data.nomadQueue;
  state.corpses = data.corpses;
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
