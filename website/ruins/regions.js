// The world map (doc 01 section 4.2): three regions on one save. Only the
// ACTIVE region's sim ticks; the others sleep in the save as serialized
// blobs (a battery-friendly divergence from RtR's live world - the frozen
// regions resume exactly where they stood). Migration is RtR's rule set:
// pop 15+ to send, young healthy adults only, they leave at dawn.
import * as B from "./balance.js";
import { addXp } from "./meta.js";

// The world-map half of the save: metadata for every region, founded or not.
// Sim blobs themselves are stashed by save.js (it owns serialization).
export function createRegions() {
  return B.REGIONS.map((r) => ({
    id: r.id,
    founded: false,
    pendingMigrants: 0, // settlers waiting to appear at that region's camp
    departing: 0, // scheduled to leave THIS region at next dawn
    departingTo: null,
  }));
}

export function regionDef(id) {
  return B.REGIONS.find((r) => r.id === id);
}

// Stable per-region seed off the world seed: same world, same three maps,
// every reload - even before a region's first visit writes its blob.
export function regionSeed(worldSeed, id) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (worldSeed ^ h) >>> 0;
}

// Difficulty knobs for the active sim (stars -> multipliers).
export function diffOf(state) {
  return B.REGION_DIFF[(regionDef(state.regionId)?.stars ?? 1) - 1];
}

// ---- Founding (the milestone's acceptance: a second village becomes
// possible). The caravan is paid up front; the settlers walk at dawn; the
// new region's sim is generated on first travel, seeded from the world.
export function canFound(state, id) {
  const camp = state.buildings.find((b) => b.type === "camp");
  const entry = state.regions.find((r) => r.id === id);
  if (!entry || entry.founded) return { ok: false, reason: "Already settled" };
  if (state.regionId === id) return { ok: false, reason: "You are standing in it" };
  if (!camp || (camp.tier ?? 1) < B.FOUND_TIER)
    return { ok: false, reason: `Needs a tier ${B.FOUND_TIER} camp (Settlement)` };
  for (const [res, n] of Object.entries(B.FOUND_COST))
    if ((state.resources[res] ?? 0) < n) return { ok: false, reason: `Caravan short on ${res}` };
  const adults = state.villagers.filter(
    (v) => !v.dead && v.age === "adult" && v.health >= B.MIGRATE_HEALTH,
  ).length;
  if (adults < B.FOUND_SETTLERS + 4)
    return { ok: false, reason: `Needs ${B.FOUND_SETTLERS + 4} able adults to spare` };
  return { ok: true };
}

export function foundRegion(state, id) {
  const check = canFound(state, id);
  if (!check.ok) return check;
  for (const [res, n] of Object.entries(B.FOUND_COST)) state.resources[res] -= n;
  const entry = state.regions.find((r) => r.id === id);
  entry.founded = true;
  entry.pendingMigrants += B.FOUND_SETTLERS;
  scheduleDeparture(state, id, B.FOUND_SETTLERS, true);
  addXp(state, "founded");
  state.events.push({ type: "region-founded", id, name: regionDef(id).name, settlers: B.FOUND_SETTLERS });
  return { ok: true };
}

// ---- Migration between founded regions. Selects the healthiest adults.
export function canMigrate(state, id) {
  const entry = state.regions.find((r) => r.id === id);
  if (!entry || !entry.founded) return { ok: false, reason: "No village there to receive them" };
  if (state.regionId === id) return { ok: false, reason: "They already live here" };
  if (state.villagers.length < B.MIGRATE_MIN_POP)
    return { ok: false, reason: `Needs ${B.MIGRATE_MIN_POP} villagers before anyone may leave` };
  return { ok: true };
}

// How many adults are currently eligible to walk out.
export function migratableCount(state) {
  return state.villagers.filter(
    (v) => !v.dead && v.age === "adult" && v.health >= B.MIGRATE_HEALTH && !v.migrating,
  ).length;
}

export function migrateTo(state, id, n) {
  const check = canMigrate(state, id);
  if (!check.ok) return check;
  // The village must keep its feet: leave at least 4 villagers behind.
  const room = Math.min(B.MIGRATE_MAX_BATCH, migratableCount(state), state.villagers.length - 4);
  n = Math.max(1, Math.min(n, room));
  const walkers = state.villagers
    .filter((v) => !v.dead && v.age === "adult" && v.health >= B.MIGRATE_HEALTH && !v.migrating)
    .sort((a, b) => b.health - a.health)
    .slice(0, n);
  scheduleDeparture(state, id, walkers.length, false);
  for (const v of walkers) v.migrating = true; // they finish today, walk at dawn
  state.events.push({ type: "migrants-scheduled", id, count: walkers.length, name: regionDef(id).name });
  return { ok: true, count: walkers.length };
}

function scheduleDeparture(state, id, count, isFounding) {
  const local = state.regions.find((r) => r.id === state.regionId);
  local.departing += count;
  local.departingTo = id;
  local.departingIsFounding = isFounding;
}

// The dawn beat: marked villagers walk out (they are simply gone from this
// sim; the receiving region counts them in pendingMigrants and materializes
// them at its camp when it next loads).
export function departuresAtDawn(state) {
  const local = state.regions.find((r) => r.id === state.regionId);
  if (!local?.departing) return;
  const walkers = state.villagers.filter((v) => v.migrating);
  const target = state.regions.find((r) => r.id === local.departingTo);
  if (target) target.pendingMigrants += walkers.length;
  addXp(state, "migrant", walkers.length);
  state.events.push({
    type: "migrants-left",
    count: walkers.length,
    name: regionDef(local.departingTo)?.name ?? "the wilds",
  });
  for (const v of walkers) {
    if (v.workBuilding !== null) {
      const b = state.buildings.find((b2) => b2.id === v.workBuilding);
      if (b) b.workers = b.workers.filter((id) => id !== v.id);
    }
    if (v.home !== null) {
      const home = state.buildings.find((b2) => b2.id === v.home);
      if (home) home.occupants = Math.max(0, home.occupants - 1);
    }
  }
  // Walkers leave the sim directly - NOT via the dead flag, which the loss
  // and death-stat paths read.
  state.villagers = state.villagers.filter((v) => !v.migrating);
  local.departing = 0;
  local.departingTo = null;
  local.departingIsFounding = false;
}

// Applied when a region's sim hydrates: settlers appear at the camp.
export function applyPendingMigrants(state) {
  const entry = state.regions.find((r) => r.id === state.regionId);
  if (!entry?.pendingMigrants) return 0;
  const n = entry.pendingMigrants;
  entry.pendingMigrants = 0;
  return n; // game.js spawns the villagers (it owns villager creation)
}
