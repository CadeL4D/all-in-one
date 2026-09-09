// Deterministic snapshots: save-anywhere + dawn autosave (mobile session
// model). Everything needed to resume the exact sim state is in the blob;
// the seeded RNG state is included so replays stay reproducible.
import { createGame } from "./game.js";
import { MAP_SIZE } from "./balance.js";
import * as B2 from "./balance.js";
import { F_TREE, F_ROCK, F_BUSH } from "./world.js";
import { indexWaterTiles } from "./villager.js";
import { footprint } from "./buildings.js";
import { findCreature } from "./spells.js";

export const SAVE_KEY = "ruins-save-v1";
// v4: the climb - camp tier + pending upgrade on the camp building,
// per-villager faith, boards/blocks/meals resources, monster levels.
// v3 blobs (M3 islands) load with defaults for all of those; v1/v2 are
// treated as fresh islands.
export const SAVE_VERSION = 4;

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
    god: {
      influence: state.god.influence,
      held: state.god.held,
      meteors: state.god.meteors,
    },
    buildings: state.buildings,
    villagers: state.villagers,
    nomads: state.nomads,
    nomadQueue: state.nomadQueue,
    monsters: state.monsters,
    corpses: state.corpses,
  };
}

export function deserialize(data) {
  if (!data || (data.v !== SAVE_VERSION && data.v !== SAVE_VERSION - 1)) return null;
  try {
    return hydrate(data);
  } catch {
    return null; // corrupt payload of either version: fresh island instead
  }
}

function hydrate(data) {
  const state = createGame(data.seed);
  state.rng.restore(data.rng);
  Object.assign(state.clock, data.clock);
  state.lastDawn = data.lastDawn;
  state.lost = data.lost ?? null;
  // v3 islands predate boards/blocks/meals: merge over the zero defaults
  // instead of letting undefined poison the arithmetic.
  state.resources = { ...state.resources, ...data.resources };
  state.jobCounts = { ...state.jobCounts, ...data.jobCounts };
  state.flags = { ...state.flags, wallsDirty: true };
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
  // God hand (v3; a v2 island simply starts with an empty hand).
  if (data.god) {
    state.god.influence = data.god.influence ?? 0;
    state.god.held = data.god.held ?? null;
    state.god.meteors = data.god.meteors ?? [];
  }
  indexWaterTiles(state.world);
  state.buildings = data.buildings;
  state.villagers = data.villagers;
  state.nomads = data.nomads;
  state.nomadQueue = data.nomadQueue;
  state.monsters = data.monsters ?? [];
  state.projectiles = [];
  state.corpses = data.corpses;
  // ---- v4 migration seams ----
  // Faith is a need like any other; v3 villagers simply start believing.
  for (const v of state.villagers) if (v.faith === undefined) v.faith = 60;
  // Monster levels (threat-scaled power) default to 1; maxHp backs out of
  // the current hp for the damage bar.
  for (const m of state.monsters) {
    if (m.level === undefined) m.level = 1;
    if (m.maxHp === undefined) m.maxHp = m.hp;
  }
  // A v3 camp has no tier. Rather than stranding a 20-building village at
  // the tier-1 limit of 8, infer the smallest rung that legally houses
  // what already stands.
  const camp = state.buildings.find((b) => b.type === "camp");
  if (camp && !camp.tier) {
    let built = 0;
    for (const b of state.buildings) {
      const d = B2.BUILDINGS[b.type];
      if (d.corrupted || (d.wall && !d.gate)) continue;
      built++;
    }
    camp.tier = 1;
    for (const t of B2.CAMP_TIERS)
      if (t.buildLimit >= built) {
        camp.tier = B2.CAMP_TIERS.indexOf(t) + 1;
        break;
      }
    camp.tier = Math.max(camp.tier, 1);
  }
  // Re-link a held creature by id (entities exist now); if it is gone, the
  // hand opens rather than carrying a ghost.
  if (state.god.held) {
    const { kind, id } = state.god.held;
    const linked = findCreature(state, kind, id);
    if (linked) linked.held = true;
    else state.god.held = null;
  }
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
