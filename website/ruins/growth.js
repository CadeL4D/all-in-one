// Population growth: nomad immigration + births. Nomad rate scales with
// free housing, free job slots, and stored supplies - never with wealth
// (research doc 03 section 1.1). First nomad arrives ~midday day 1.
import { createVillager } from "./villager.js";
import * as B from "./balance.js";
import * as bd from "./buildings.js";
import { findPath } from "./path.js";

// Called at creation and at every dawn: decides how many nomads the day
// will bring and when they step onto the map.
export function scheduleNomads(state) {
  const day = state.clock.day;
  const pop = state.villagers.filter((v) => !v.dead).length + state.nomads.length;
  if (pop >= B.POP_SOFT_CAP) return;

  const housing = bd.housingCap(state);
  const slots = bd.jobSlots(state);
  const employed = ["builder", "farmer", "woodcutter"].reduce(
    (a, j) => a + bd.employedCount(state, j),
    0,
  );
  const freeJobs = Math.max(0, Math.min(slots.builder + slots.farmer + slots.woodcutter, state.jobCounts.builder + state.jobCounts.farmer + state.jobCounts.woodcutter) - employed);
  const supplies = (state.resources.food + state.resources.water) / Math.max(4, pop * 3);
  const supplyFactor = Math.min(1.2, Math.max(0.15, supplies));
  const roomFactor = 0.35 + 0.4 * Math.min(1, housing ? (housing - pop) / 4 : 0) + 0.25 * Math.min(1, freeJobs / 4);
  let count = B.NOMADS_BASE_PER_DAY * roomFactor * supplyFactor * state.rng.range(0.6, 1.4);
  if (day <= 3) count += 0.6; // early-game pity (RtR: more arrivals days 1-3)
  count = Math.min(B.NOMADS_MAX_PER_DAY, Math.floor(count));

  const dayStart = (day - 1) * B.DAY_TICKS;
  for (let i = 0; i < count; i++) {
    const at = dayStart + Math.round(B.DAY_TICKS * state.rng.range(0.3, 0.9));
    if (day === 1 && i === 0 && B.NOMAD_DAY1_MIDDAY) {
      // The guaranteed first wanderer, midday day 1.
      state.nomadQueue.push({ at: dayStart + Math.round(B.DAY_TICKS * 0.42) });
    } else state.nomadQueue.push({ at });
  }
}

export function tickNomads(state, dt) {
  const tick = state.clock.tick;
  // Spawn queued nomads.
  while (state.nomadQueue.length && state.nomadQueue[0].at <= tick) {
    state.nomadQueue.shift();
    if (state.villagers.filter((v) => !v.dead).length + state.nomads.length >= B.POP_SOFT_CAP)
      continue;
    spawnNomad(state);
  }
  // Follow the path to the camp; convert on arrival.
  const speed = B.WALK_TILES_PER_SECOND / B.TICKS_PER_SECOND;
  const size = state.world.size;
  const camp = state.buildings.find((b) => b.type === "camp");
  for (const n of state.nomads) {
    if (!n.path.length) {
      n.arrived = true;
      createVillager(state, n.x, n.y, "adult");
      state.events.push({ type: "nomad-joined", name: n.name, x: n.x, y: n.y });
      continue;
    }
    const budget = speed * dt * 0.8;
    let moved = 0;
    while (moved < budget && n.pathI < n.path.length) {
      const node = n.path[n.pathI];
      const nx = (node % size) + 0.5,
        ny = Math.floor(node / size) + 0.5;
      const d = Math.hypot(nx - n.x, ny - n.y);
      if (Math.abs(nx - n.x) > 0.05) n.facing = nx > n.x ? 1 : -1;
      if (d <= budget - moved) {
        n.x = nx;
        n.y = ny;
        n.pathI++;
        moved += d;
      } else {
        n.x += ((nx - n.x) / d) * (budget - moved);
        n.y += ((ny - n.y) / d) * (budget - moved);
        moved = budget;
      }
    }
    if (n.pathI >= n.path.length) n.path = [];
  }
  state.nomads = state.nomads.filter((n) => !n.arrived);
}

function spawnNomad(state) {
  const size = state.world.size;
  const camp = state.buildings.find((b) => b.type === "camp");
  // Random edge point, some distance from camp.
  for (let tries = 0; tries < 20; tries++) {
    const side = state.rng.int(0, 3);
    const t = state.rng.int(2, size - 3);
    const x = side === 0 ? 1 : side === 1 ? size - 2 : t;
    const y = side === 2 ? 1 : side === 3 ? size - 2 : t;
    const i = y * size + x;
    if (state.world.terrain[i] === 2) continue;
    if (Math.hypot(x - size / 2, y - size / 2) < 10) continue;
    const nomad = {
      id: state.nextId++,
      name: state.rng.pick(B.NAMES),
      x: x + 0.5,
      y: y + 0.5,
      facing: 1,
      arrived: false,
      path: [],
      pathI: 0,
    };
    if (camp) {
      const goal = camp.y * size + camp.x;
      const path = findPath(state.world, i, goal, state.buildingAt);
      if (path) nomad.path = path;
    }
    state.nomads.push(nomad);
    state.events.push({ type: "nomad-spawned", name: nomad.name, x: nomad.x, y: nomad.y });
    return;
  }
}

// Births: housed couples, rolled at dawn (research doc 03).
export function rollBirths(state) {
  const housedAdults = state.villagers.filter(
    (v) => !v.dead && v.age === "adult" && v.home !== null,
  ).length;
  const couples = Math.floor(housedAdults / 2);
  const pop = state.villagers.filter((v) => !v.dead).length;
  for (let i = 0; i < couples; i++) {
    if (pop + i >= B.POP_SOFT_CAP) break;
    if (!state.rng.chance(B.BIRTH_CHANCE_PER_COUPLE)) continue;
    const homes = state.buildings.filter((b) => b.complete && B.BUILDINGS[b.type].houses > 0);
    if (!homes.length) break;
    const home = homes[state.rng.int(0, homes.length - 1)];
    const v = createVillager(state, home.x + 1, home.y + 1, "child");
    assignHome(state, v, home);
    state.events.push({ type: "birth", name: v.name, x: v.x, y: v.y });
  }
}

// Called on villager creation (adults included): claim free housing.
export function assignHomes(state) {
  for (const v of state.villagers) {
    if (v.dead || v.home !== null || v.age !== "adult") continue;
    const home = state.buildings.find(
      (b) =>
        b.complete &&
        B.BUILDINGS[b.type].houses > 0 &&
        b.occupants < B.BUILDINGS[b.type].houses,
    );
    if (home) assignHome(state, v, home);
  }
}

function assignHome(state, v, home) {
  v.home = home.id;
  home.occupants += 1;
}
