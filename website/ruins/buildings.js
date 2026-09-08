// Building placement, construction sites, storage pool caps, and the slow
// building-side production (well water, plot claiming). Villager-side work
// lives in villager.js; this module is the content/table half.
import {
  BUILDINGS,
  DISMANTLE_REFUND,
  CAMP_TILE,
  WELL_WATER_PER_DAY,
  DAY_TICKS,
  BUILD_TICKS_PER_RESOURCE,
  JOBS,
} from "./balance.js";
import { T_GRASS, T_DIRT, F_NONE, F_STUMP, F_PLOT, idx } from "./world.js";

export function footprint(type, x, y) {
  const size = BUILDINGS[type].size;
  const tiles = [];
  for (let dy = 0; dy < size; dy++)
    for (let dx = 0; dx < size; dx++) tiles.push(idx(x + dx, y + dy));
  return tiles;
}

export function canPlace(state, type, x, y) {
  const def = BUILDINGS[type];
  const { world, buildingAt } = state;
  const half = def.size / 2;
  const cx = x + half - CAMP_TILE.x,
    cy = y + half - CAMP_TILE.y;
  if (Math.hypot(cx, cy) > campRange(state) && !chainedInRange(state, type, x, y))
    return { ok: false, reason: "Too far from your buildings" };
  if (x < 0 || y < 0 || x + def.size > world.size || y + def.size > world.size)
    return { ok: false, reason: "Off the map" };
  for (const i of footprint(type, x, y)) {
    const t = world.terrain[i];
    if (t !== T_GRASS && t !== T_DIRT) return { ok: false, reason: "Needs open ground" };
    const f = world.feature[i];
    if (f !== F_NONE && f !== F_STUMP) return { ok: false, reason: "Blocked by terrain" };
    if (buildingAt[i] !== -1) return { ok: false, reason: "Space occupied" };
    if (world.plots.has(i)) return { ok: false, reason: "Farm plot in the way" };
  }
  return { ok: true };
}

// RtR build rule: range radiates from finished structures, not just the
// camp. Walls chain outward at short reach - that chain is how a village
// pushes a fence line out to box the corruption in (the Threat lever).
// Enemy nests deliberately extend nothing.
const CHAIN_REACH = 3;
function chainedInRange(state, type, x, y) {
  const def = BUILDINGS[type];
  for (const b of state.buildings) {
    if (!b.complete || BUILDINGS[b.type].corrupted) continue;
    const bs = BUILDINGS[b.type].size;
    const gapX = Math.max(b.x - (x + def.size), x - (b.x + bs), 0);
    const gapY = Math.max(b.y - (y + def.size), y - (b.y + bs), 0);
    if (Math.max(gapX, gapY) <= CHAIN_REACH) return true;
  }
  return false;
}

// A drag-painted wall run is ONE territory push: tiles may anchor to earlier
// tiles of the same run (walls are 1x1), not just to finished buildings.
// Without this, no run could ever leave the village's shadow.
export function canPlaceInRun(state, type, x, y, runKeys) {
  const check = canPlace(state, type, x, y);
  if (check.ok || check.reason !== "Too far from your buildings") return check;
  for (const key of runKeys) {
    const [rx, ry] = key.split(",").map(Number);
    const gapX = Math.max(rx - (x + 1), x - (rx + 1), 0);
    const gapY = Math.max(ry - (y + 1), y - (ry + 1), 0);
    if (Math.max(gapX, gapY) <= CHAIN_REACH) return { ok: true };
  }
  return check;
}

export function campRange(state) {
  const camp = state.buildings.find((b) => b.type === "camp");
  return camp ? BUILDINGS.camp.radius : 0;
}

export function placeSite(state, type, x, y) {
  const def = BUILDINGS[type];
  const id = state.nextId++;
  const building = {
    id,
    type,
    x,
    y,
    complete: false,
    hp: def.hp,
    delivered: 0, // total resources hauled to the site so far
    deliveredRes: {}, // per-resource tally (stone walls need stone, not wood)
    workDone: 0,
    workers: [], // villager ids currently employed here
    occupants: 0,
    plots: [],
  };
  building.workNeeded = totalCost(def) * BUILD_TICKS_PER_RESOURCE;
  for (const i of footprint(type, x, y)) {
    state.buildingAt[i] = id;
    if (def.gate) state.gateTiles.add(i);
  }
  state.buildings.push(building);
  state.stats.sitesPlaced++;
  state.flags.wallsDirty = true;
  return building;
}

function totalCost(def) {
  return Object.values(def.cost).reduce((a, b) => a + b, 0);
}

// The first resource this site is still short of (null = fully supplied).
export function nextMissingRes(site) {
  for (const [res, n] of Object.entries(BUILDINGS[site.type].cost))
    if ((site.deliveredRes?.[res] ?? 0) < n) return res;
  return null;
}

export function siteComplete(state, building) {
  building.complete = true;
  state.stats.built++;
  const def = BUILDINGS[building.type];
  // A finished farm claims its crop plots on nearby open grass.
  if (def.plots) {
    let claimed = 0;
    const size = state.world.size;
    for (let r = 1; r <= 3 && claimed < def.plots; r++) {
      for (let dy = -r; dy <= def.size + r - 1 && claimed < def.plots; dy++) {
        for (let dx = -r; dx <= def.size + r - 1 && claimed < def.plots; dx++) {
          const x = building.x + dx,
            y = building.y + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const i = idx(x, y);
          if (state.buildingAt[i] !== -1) continue;
          if (state.world.terrain[i] !== T_GRASS) continue;
          if (state.world.feature[i] !== F_NONE) continue;
          if (state.world.plots.has(i)) continue;
          state.world.plots.set(i, { farm: building.id, readyTick: -1 });
          state.world.feature[i] = F_PLOT;
          building.plots.push(i);
          claimed++;
        }
      }
    }
  }
  state.events.push({ type: "built", x: building.x, y: building.y, name: def.name });
}

export function dismantle(state, buildingId) {
  const i = state.buildings.findIndex((b) => b.id === buildingId);
  if (i < 0) return null;
  const building = state.buildings[i];
  const def = BUILDINGS[building.type];
  const refund = {};
  for (const [res, amount] of Object.entries(def.cost))
    refund[res] = Math.floor(amount * DISMANTLE_REFUND);
  for (const [res, amount] of Object.entries(refund))
    state.resources[res] = Math.min(capOf(state), state.resources[res] + amount);
  removeBuildingAt(state, building);
  state.events.push({ type: "dismantled", x: building.x, y: building.y, name: def.name });
  return { building, refund };
}

// Raid destruction: no refund, rubble event. The camp additionally ends
// the run (loss state is raised by the raid layer).
export function destroyBuilding(state, building) {
  const i = state.buildings.indexOf(building);
  if (i < 0) return;
  const def = BUILDINGS[building.type];
  removeBuildingAt(state, building);
  state.events.push({
    type: "destroyed",
    x: building.x,
    y: building.y,
    name: def.name,
    corrupted: !!def.corrupted,
  });
}

// Shared teardown: footprint, plots, and everyone who lived or worked here.
function removeBuildingAt(state, building) {
  const i = state.buildings.indexOf(building);
  if (i < 0) return;
  const def = BUILDINGS[building.type];
  for (const plot of building.plots) {
    state.world.plots.delete(plot);
    state.world.feature[plot] = F_NONE;
  }
  for (const i2 of footprint(building.type, building.x, building.y)) {
    state.buildingAt[i2] = -1;
    if (def.gate) state.gateTiles.delete(i2);
  }
  state.buildings.splice(i, 1);
  for (const v of state.villagers) {
    if (v.home === building.id) v.home = null;
    if (v.workBuilding === building.id) {
      v.workBuilding = null;
      v.job = null;
      v.task = null;
    }
    if (v.task && v.task.building === building.id) v.task = null;
  }
  state.flags.wallsDirty = true; // monster breach paths must re-cost
}

function capOf(state) {
  let cap = 0;
  for (const b of state.buildings) if (b.complete) cap += BUILDINGS[b.type].storage;
  return cap;
}

export function storageCap(state) {
  let cap = 0;
  for (const b of state.buildings) if (b.complete) cap += BUILDINGS[b.type].storage;
  return cap;
}

export function housingCap(state) {
  let cap = 0;
  for (const b of state.buildings) if (b.complete) cap += BUILDINGS[b.type].houses;
  return cap;
}

// Job slots offered by all completed buildings, per job key.
export function jobSlots(state) {
  const slots = {};
  for (const job of Object.keys(JOBS)) slots[job] = 0;
  for (const b of state.buildings) {
    if (!b.complete) continue;
    for (const [job, n] of Object.entries(BUILDINGS[b.type].jobs)) slots[job] += n;
  }
  return slots;
}

export function employedCount(state, job) {
  let n = 0;
  for (const v of state.villagers)
    if (!v.dead && v.age === "adult" && v.job === job) n++;
  return n;
}

// Buildings that can hold a deposit (any complete building with storage).
export function storageBuildings(state) {
  return state.buildings.filter((b) => b.complete && BUILDINGS[b.type].storage > 0);
}

export function buildingCenter(b) {
  return { x: b.x + BUILDINGS[b.type].size / 2, y: b.y + BUILDINGS[b.type].size / 2 };
}

// Buildings slowly produce: wells seep clean water into the pool.
export function tickProduction(state, dt) {
  const cap = storageCap(state);
  const perTick = WELL_WATER_PER_DAY / DAY_TICKS;
  for (const b of state.buildings) {
    if (!b.complete) continue;
    if (b.type === "well" && state.resources.water < cap)
      state.resources.water = Math.min(cap, state.resources.water + perTick * dt);
  }
}
