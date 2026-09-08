// Corruption territorial war (research doc 04 section 2): edge-first spawn
// placement, daily spread that kills forests, corrupted nests as the monster
// spawn points, and the space-pressure Corruption Threat model - threat only
// cares how much space corruption wants vs. holds, never village wealth.
import * as B from "./balance.js";
import { idx, inBounds, F_NONE, F_TREE, F_ROCK, T_WATER } from "./world.js";
import * as bd from "./buildings.js";

export function createCorruptionState() {
  return {
    spawned: false,
    threat: 0,
    grewToday: 0, // tiles converted since last dawn (0 => boxed in)
    nestCooldownUntil: 0, // destroyed nests rebuild after a pause
  };
}

// Dev-confirmed placement (doc 04 section 2.2): "requires nearby wood and
// rock, and checks near the map edge first, as far from your camp as
// possible, then ... closer until it finds a suitable spot. If it fails ...
// it just never spawns at all." Returns the chosen center tile index or -1.
export function findCorruptionSite(state) {
  const { world } = state;
  const size = world.size;
  const edgeDist = (x, y) => Math.min(x, y, size - 1 - x, size - 1 - y);
  const candidates = [];
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++) {
      if (world.terrain[idx(x, y)] === T_WATER) continue;
      if (!world.landmass[idx(x, y)]) continue; // off-island: raiders could never march
      if (state.buildingAt[idx(x, y)] !== -1) continue;
      const d = Math.hypot(x - B.CAMP_TILE.x, y - B.CAMP_TILE.y);
      if (d < B.CORRUPTION_MIN_CAMP_DIST) continue;
      candidates.push([idx(x, y), edgeDist(x, y)]);
    }
  // Edge first: sort by distance-to-edge, ties broken by tile order (stable
  // enough - the search is deterministic per seed either way).
  candidates.sort((a, b2) => a[1] - b2[1]);
  for (const [i] of candidates) {
    if (!hasBuildMaterialNear(world, i)) continue;
    return i;
  }
  return -1;
}

function hasBuildMaterialNear(world, i) {
  const size = world.size;
  const x = i % size,
    y = Math.floor(i / size);
  let wood = 0,
    rock = 0;
  const r = B.CORRUPTION_SITE_RADIUS + 2;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx,
        ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      const f = world.feature[idx(nx, ny)];
      if (f === F_TREE) wood++;
      else if (f === F_ROCK) rock++;
      if (wood >= 6 || rock >= 3) return true;
    }
  return false;
}

// Called at the spawn day's dawn. Stamps the corruption blob and a "the
// wilds are blighted" event the hint system latches onto.
export function ensureCorruptionSpawn(state) {
  if (state.corruption.spawned) return false;
  const center = findCorruptionSite(state);
  if (center < 0) return false; // dev-faithful: no suitable spot, no corruption
  state.corruption.spawned = true;
  const size = state.world.size;
  const cx = center % size,
    cy = Math.floor(center / size);
  const r = B.CORRUPTION_SITE_RADIUS;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = cx + dx,
        y = cy + dy;
      if (!inBounds(x, y)) continue;
      corruptTile(state, idx(x, y));
    }
  state.events.push({ type: "corruption-spawned", x: cx + 0.5, y: cy + 0.5 });
  return true;
}

// Convert one tile. Forests die under corruption (doc 04 section 2.1);
// water, buildings and walls are never converted - that block is exactly
// what "trap in the corrupted tiles" means for the threat model.
export function corruptTile(state, i) {
  const world = state.world;
  if (world.corruption[i]) return false;
  if (world.terrain[i] === T_WATER) return false;
  if (state.buildingAt[i] !== -1) return false;
  world.corruption[i] = 1;
  world.corrupted++;
  state.corruption.grewToday++;
  const f = world.feature[i];
  if (f !== F_NONE) {
    world.feature[i] = F_NONE;
    world.regrow.delete(i);
  }
  world.trees.delete(i);
  world.bushes.delete(i);
  world.rocks.delete(i);
  if (world.plots.has(i)) {
    world.plots.delete(i);
    const b = state.buildings.find((b2) => b2.plots.includes(i));
    if (b) b.plots = b.plots.filter((p) => p !== i);
  }
  return true;
}

export function uncorruptTile(state, i) {
  const world = state.world;
  if (!world.corruption[i]) return false;
  world.corruption[i] = 0;
  world.corrupted--;
  return true;
}

function spreadEligible(state, i) {
  const world = state.world;
  if (world.corruption[i]) return false;
  if (world.terrain[i] === T_WATER) return false;
  if (state.buildingAt[i] !== -1) return false;
  return true;
}

// Slow reclaim: corruption adjacent to two finished village buildings
// recedes at dawn (pre-god-hand pushback; RtR's uncorrupting may spawn an
// enemy - that counterweight arrives with the threat-scaled raids here).
function villagePressure(state) {
  const { world } = state;
  const size = world.size;
  const reclaimed = [];
  for (let i = 0; i < world.corruption.length; i++) {
    if (!world.corruption[i]) continue;
    const x = i % size,
      y = Math.floor(i / size);
    let neighbors = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const id = state.buildingAt[ny * size + nx];
      if (id === -1) continue;
      const b = state.buildings.find((b2) => b2.id === id);
      if (b && b.complete && !B.BUILDINGS[b.type].corrupted) neighbors++;
    }
    if (neighbors >= 2 && state.rng.chance(0.4)) reclaimed.push(i);
  }
  for (const i of reclaimed) uncorruptTile(state, i);
  return reclaimed.length;
}

// Dawn beats: threat update (doc 04 section 2.4) + village pressure.
export function corruptionDawn(state) {
  const c = state.corruption;
  if (!c.spawned) return;
  if (c.grewToday === 0 && state.world.corrupted > 0) {
    c.threat = Math.min(B.THREAT_MAX, c.threat + B.THREAT_RISE_PER_DAY);
  } else {
    c.threat = Math.max(0, c.threat - B.THREAT_DECAY_PER_DAY);
  }
  c.grewToday = 0;
  villagePressure(state);
}

// Per-sim-tick driver: spread check + nest management on a coarse grid.
export function tickCorruption(state) {
  const c = state.corruption;
  if (!c.spawned || state.clock.tick % B.CORRUPTION_SPREAD_TICKS !== 0) return;
  if (state.rng.chance(B.CORRUPTION_SPREAD_CHANCE)) {
    const frontier = corruptionFrontier(state);
    if (frontier.length) {
      const pick = frontier[state.rng.int(0, frontier.length - 1)];
      corruptTile(state, pick);
    }
  }
  manageNests(state);
}

// Eligible uncorrupted tiles touching corruption.
function corruptionFrontier(state) {
  const { world } = state;
  const size = world.size;
  const out = [];
  for (let i = 0; i < world.corruption.length; i++) {
    if (!world.corruption[i]) continue;
    const x = i % size,
      y = Math.floor(i / size);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const n = ny * size + nx;
      if (spreadEligible(state, n)) out.push(n);
    }
  }
  return out;
}

// Graveyards are the spawn points AND the escalation (doc 04 sections 2.3,
// 3.2): more held space => more nests => bigger nights. Destroyed nests
// rebuild after NEST_REBUILD_DELAY_DAYS.
export function manageNests(state) {
  const { world } = state;
  const target = Math.min(
    B.NEST_MAX,
    world.corrupted < B.NEST_MIN_TILES
      ? 0
      : 1 + Math.floor((world.corrupted - B.NEST_MIN_TILES) / B.NEST_TILES_PER_EXTRA),
  );
  const nests = state.buildings.filter((b) => b.type === "nest");
  if (nests.length >= target) return;
  if (state.clock.tick < state.corruption.nestCooldownUntil) return;
  const spot = nestSpot(state);
  if (spot < 0) return;
  const size = world.size;
  const nest = bd.placeSite(state, "nest", spot % size, Math.floor(spot / size));
  nest.delivered = 999;
  nest.workDone = nest.workNeeded;
  bd.siteComplete(state, nest);
  state.events.push({
    type: "nest-formed",
    x: (spot % size) + 0.5,
    y: Math.floor(spot / size) + 0.5,
  });
}

// Drop the nest near the corruption's centroid, on a corrupted free tile.
function nestSpot(state) {
  const { world } = state;
  const size = world.size;
  let sx = 0,
    sy = 0,
    n = 0;
  for (let i = 0; i < world.corruption.length; i++) {
    if (!world.corruption[i]) continue;
    sx += i % size;
    sy += Math.floor(i / size);
    n++;
  }
  if (!n) return -1;
  const cx = Math.round(sx / n),
    cy = Math.round(sy / n);
  for (let r = 0; r <= 8; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = cx + dx,
          y = cy + dy;
        if (!inBounds(x, y)) continue;
        const i = idx(x, y);
        if (!world.corruption[i] || state.buildingAt[i] !== -1) continue;
        return i;
      }
  return -1;
}
