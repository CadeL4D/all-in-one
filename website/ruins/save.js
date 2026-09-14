// Deterministic snapshots: save-anywhere + dawn autosave (mobile session
// model). Everything needed to resume the exact sim state is in the blob;
// the seeded RNG state is included so replays stay reproducible.
//
// v5 wraps the world: one blob per founded region plus world-map metadata,
// with only the ACTIVE region hydrated at a time (regions.js owns travel).
// Meta (god XP / perks) lives beside the save in its own slot and survives
// even a full restart (meta.js). The inner sim blob keeps the v4 shape.
import { createGame, spawnSettlers } from "./game.js";
import { MAP_SIZE } from "./balance.js";
import * as B2 from "./balance.js";
import { F_TREE, F_ROCK, F_BUSH } from "./world.js";
import { indexWaterTiles } from "./villager.js";
import { footprint } from "./buildings.js";
import { findCreature } from "./spells.js";
import { createRegions, applyPendingMigrants, regionSeed } from "./regions.js";

export const SAVE_KEY = "ruins-save-v1";
// v5: the world wrapper - regions + mode + per-region sim blobs (M5).
// v4 blobs (M4 islands) load as single-region worlds; v1-v3 are treated
// as fresh islands.
export const SAVE_VERSION = 5;
export const SIM_VERSION = 4; // version of the inner per-region sim blob

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

// ---- Inner sim blob (the M4 shape, plus moon) ----

export function serializeSim(state) {
  return {
    v: SIM_VERSION,
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
    moon: { ...state.moon, meteorQueue: [] }, // pending strikes don't survive reloads
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

export function deserializeSim(data, opts = {}) {
  // v3 (M3 islands) hydrate through the migration seams below; v1/v2 are
  // too far gone - fresh islands instead.
  if (!data || (data.v !== SIM_VERSION && data.v !== SIM_VERSION - 1)) return null;
  try {
    return hydrate(data, opts);
  } catch {
    return null; // corrupt payload: fresh island instead
  }
}

function hydrate(data, opts) {
  // Arrivals must wait: createGame would otherwise spawn settlers that the
  // saved villager list below then overwrites - hydrate applies them itself,
  // after the saved villagers are in place.
  const state = createGame(data.seed, { ...opts, skipArrivals: true });
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
  if (data.moon) state.moon = { ...state.moon, ...data.moon, meteorQueue: [] };
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
  // Settlers that arrived while this region slept appear at the camp NOW -
  // after the saved villagers are in place, or they would be overwritten.
  const settlers = applyPendingMigrants(state);
  if (settlers > 0) spawnSettlers(state, settlers);
  state.events = [];
  return state;
}

// ---- v5 world wrapper ----

// Map-card stats for the region the live sim belongs to.
function regionStats(entry, state) {
  return {
    ...entry,
    day: state.clock.day,
    pop: state.villagers.length,
    status: state.lost ? "lost" : state.corruption.cleared ? "cleared" : "alive",
  };
}

function modeBlob(state) {
  const { key, ...knobs } = state.mode;
  return { key, ...knobs };
}

export function serialize(state) {
  const regions = state.regions.map((entry) =>
    entry.id === state.regionId ? regionStats(entry, state) : { ...entry },
  );
  return {
    v: SAVE_VERSION,
    mode: modeBlob(state),
    active: state.regionId,
    worldSeed: state.seed,
    regions,
    sims: { [state.regionId]: serializeSim(state) },
  };
}

export function deserialize(data) {
  if (!data) return null;
  // v4 (M4): a bare sim blob - wrap it as a one-region Greenwood world.
  if (data.v === SIM_VERSION) {
    return deserializeSim(data, {
      regionId: "greenwood",
      regions: markFounded(createRegions(), "greenwood"),
    });
  }
  if (data.v !== SAVE_VERSION) return null;
  try {
    const modeKey = data.mode?.key ?? "traditional";
    const mode = { ...B2.MODES[modeKey], ...(data.mode ?? {}) };
    const { key, ...custom } = mode;
    const regions = data.regions ?? createRegions();
    const opts = { modeKey, custom, regionId: data.active, regions };
    const simBlob = data.sims?.[data.active];
    if (simBlob) return deserializeSim(simBlob, opts);
    // Founded but never visited: the region generates fresh, from the
    // world seed and its own stable salt (deterministic every reload).
    if (regions.find((r) => r.id === data.active)?.founded)
      return createGame(regionSeed(data.worldSeed ?? 1, data.active), opts);
    return null;
  } catch {
    return null;
  }
}

function markFounded(regions, id) {
  const entry = regions.find((r) => r.id === id);
  if (entry) entry.founded = true;
  return regions;
}

// The stash-and-swap behind region travel: rewrites the save so the target
// region is active, keeping every other region's blob untouched. The caller
// reloads the page; loading hydrates (or generates) the new active region.
// Live metadata always wins - founding and migration happened in THIS sim.
export function saveTravel(data, state, targetId) {
  const blob = data && data.v === SAVE_VERSION ? data : serialize(state);
  const stale = new Map(blob.regions.map((r) => [r.id, r]));
  const regions = state.regions.map((entry) => {
    if (entry.id === state.regionId) return regionStats(entry, state);
    const old = stale.get(entry.id);
    return old ? { ...entry, day: old.day, pop: old.pop, status: old.status } : { ...entry };
  });
  return {
    v: SAVE_VERSION,
    mode: modeBlob(state),
    active: targetId,
    worldSeed: blob.worldSeed ?? state.seed,
    regions,
    sims: { ...blob.sims, [state.regionId]: serializeSim(state) },
  };
}

export function saveToLocal(state) {
  try {
    // Merge into any existing wrapper so other regions' blobs survive.
    let data = null;
    try {
      data = JSON.parse(localStorage.getItem(SAVE_KEY));
    } catch {
      data = null;
    }
    const merged =
      data && data.v === SAVE_VERSION ? saveTravel(data, state, state.regionId) : serialize(state);
    localStorage.setItem(SAVE_KEY, JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}

export function loadWrapper() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && data.v === SAVE_VERSION ? data : null;
  } catch {
    return null;
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
