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
  if (Math.hypot(cx, cy) > campRange(state)) return { ok: false, reason: "Too far from camp" };
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
    delivered: 0, // wood hauled to the site so far
    workDone: 0,
    workers: [], // villager ids currently employed here
    occupants: 0,
    plots: [],
  };
  building.workNeeded = totalCost(def) * BUILD_TICKS_PER_RESOURCE;
  for (const i of footprint(type, x, y)) state.buildingAt[i] = id;
  state.buildings.push(building);
  state.stats.sitesPlaced++;
  return building;
}

function totalCost(def) {
  return Object.values(def.cost).reduce((a, b) => a + b, 0);
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
  for (const plot of building.plots) {
    state.world.plots.delete(plot);
    state.world.feature[plot] = F_NONE;
  }
  for (const i of footprint(building.type, building.x, building.y))
    state.buildingAt[i] = -1;
  state.buildings.splice(i, 1);
  // Evict everyone who lived or worked here.
  for (const v of state.villagers) {
    if (v.home === buildingId) v.home = null;
    if (v.workBuilding === buildingId) {
      v.workBuilding = null;
      v.job = null;
      v.task = null;
    }
    if (v.task && v.task.building === buildingId) v.task = null;
  }
  state.events.push({ type: "dismantled", x: building.x, y: building.y, name: def.name });
  return { building, refund };
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
  const slots = { builder: 0, farmer: 0, woodcutter: 0 };
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
