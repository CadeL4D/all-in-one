// Tile grid, terrain generation, and the harvestable feature layer.
// Generation is fully seeded: same seed -> same island (deterministic tests).
import { MAP_SIZE, CAMP_TILE, CLEAR_RADIUS } from "./balance.js";

export const T_GRASS = 0;
export const T_DIRT = 1;
export const T_WATER = 2;

export const F_NONE = 0;
export const F_TREE = 1;
export const F_ROCK = 2;
export const F_BUSH = 3;
export const F_STUMP = 4;
export const F_PLOT = 5;
export const F_SAPLING = 6;

export function idx(x, y) {
  return y * MAP_SIZE + x;
}
export function inBounds(x, y) {
  return x >= 0 && y >= 0 && x >= 0 && y < MAP_SIZE && x < MAP_SIZE && y < MAP_SIZE;
}

export function createWorld(seed) {
  const size = MAP_SIZE;
  const terrain = new Uint8Array(size * size);
  const feature = new Uint8Array(size * size);
  const world = {
    seed,
    size,
    terrain,
    feature,
    trees: new Set(),
    rocks: new Set(),
    bushes: new Set(),
    // Timers keyed by tile index: stumps fading, saplings maturing,
    // bushes regrowing.
    regrow: new Map(),
    // Crop plots: tile index -> { readyTick } (ripe when tick >= readyTick)
    plots: new Map(),
  };
  generate(world);
  return world;
}

// Smooth value noise from the world's seed stream (kept local so world gen
// consumes a fixed number of draws regardless of later sim randomness).
function noiseField(size, seed, scale) {
  const g = size / scale + 2;
  const grid = new Float32Array(g * g);
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < grid.length; i++) grid[i] = next();
  const out = new Float32Array(size * size);
  const smooth = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = x / scale,
        fy = y / scale;
      const x0 = Math.floor(fx),
        y0 = Math.floor(fy);
      const tx = smooth(fx - x0),
        ty = smooth(fy - y0);
      const v00 = grid[y0 * g + x0],
        v10 = grid[y0 * g + x0 + 1];
      const v01 = grid[(y0 + 1) * g + x0],
        v11 = grid[(y0 + 1) * g + x0 + 1];
      out[y * size + x] =
        v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
    }
  }
  return out;
}

function generate(world) {
  const { size, terrain, feature } = world;
  const height = noiseField(size, world.seed ^ 0x9e3779b9, 18);
  const forest = noiseField(size, world.seed ^ 0x1234abcd, 9);
  const rocky = noiseField(size, world.seed ^ 0x55aa55aa, 7);
  const berry = noiseField(size, world.seed ^ 0x0f0f0f0f, 11);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = idx(x, y);
      terrain[i] = height[i] < 0.3 ? T_WATER : height[i] < 0.36 ? T_DIRT : T_GRASS;
    }
  }

  // Village clearing: open grass around the camp.
  for (let y = CAMP_TILE.y - CLEAR_RADIUS; y <= CAMP_TILE.y + CLEAR_RADIUS; y++) {
    for (let x = CAMP_TILE.x - CLEAR_RADIUS; x <= CAMP_TILE.x + CLEAR_RADIUS; x++) {
      if (!inBounds(x, y)) continue;
      const i = idx(x, y);
      if (terrain[i] === T_WATER) terrain[i] = T_GRASS;
    }
  }

  const campDist = (x, y) =>
    Math.hypot(x - CAMP_TILE.x, y - CAMP_TILE.y);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = idx(x, y);
      if (terrain[i] !== T_GRASS) continue;
      if (campDist(x, y) <= CLEAR_RADIUS) continue;
      if (forest[i] > 0.6) {
        feature[i] = F_TREE;
        world.trees.add(i);
      } else if (rocky[i] > 0.78) {
        feature[i] = F_ROCK;
        world.rocks.add(i);
      } else if (berry[i] > 0.8) {
        feature[i] = F_BUSH;
        world.bushes.add(i);
      }
    }
  }

  guaranteeStart(world);
}

// The start must be playable without RNG luck: water to drink from, trees
// and berries within foraging range (asserted in tests).
function guaranteeStart(world) {
  const { size, terrain, feature } = world;
  const within = (r) => {
    const list = [];
    for (let y = CAMP_TILE.y - r; y <= CAMP_TILE.y + r; y++)
      for (let x = CAMP_TILE.x - r; x <= CAMP_TILE.x + r; x++)
        if (inBounds(x, y)) list.push(idx(x, y));
    return list;
  };

  let pond = null;
  let best = Infinity;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (terrain[idx(x, y)] === T_WATER) {
        const d = Math.hypot(x - CAMP_TILE.x, y - CAMP_TILE.y);
        if (d >= CLEAR_RADIUS + 1 && d < best) {
          best = d;
          pond = [x, y];
        }
      }
  if (!pond || best > 14) {
    // Stamp a pond a fixed distance from camp.
    const angle = (world.seed % 360) * (Math.PI / 180);
    const px = Math.round(CAMP_TILE.x + Math.cos(angle) * 10);
    const py = Math.round(CAMP_TILE.y + Math.sin(angle) * 10);
    for (let y = py - 2; y <= py + 2; y++)
      for (let x = px - 3; x <= px + 3; x++) {
        if (!inBounds(x, y)) continue;
        const dx = (x - px) / 3,
          dy = (y - py) / 2;
        if (dx * dx + dy * dy <= 1) {
          const i = idx(x, y);
          terrain[i] = T_WATER;
          feature[i] = F_NONE;
          world.trees.delete(i);
          world.rocks.delete(i);
          world.bushes.delete(i);
        }
      }
  }

  let trees = 0,
    bushes = 0;
  for (const i of within(16)) {
    if (feature[i] === F_TREE) trees++;
    if (feature[i] === F_BUSH) bushes++;
  }
  // Top up deterministic rings: forests for building, berries for day 1.
  const ring = [];
  for (let r = CLEAR_RADIUS + 1; r <= 16; r++)
    for (let a = 0; a < 60; a++) {
      const angle = (a / 60) * Math.PI * 2;
      const x = Math.round(CAMP_TILE.x + Math.cos(angle) * r);
      const y = Math.round(CAMP_TILE.y + Math.sin(angle) * r * 0.85);
      if (inBounds(x, y)) ring.push(idx(x, y));
    }
  for (const i of ring) {
    if (trees >= 80 && bushes >= 6) break;
    if (terrain[i] !== T_GRASS || feature[i] !== F_NONE) continue;
    const x = i % size,
      y = Math.floor(i / size);
    if (Math.hypot(x - CAMP_TILE.x, y - CAMP_TILE.y) <= CLEAR_RADIUS) continue;
    // Berries first: day-1 food must not depend on tree quota leftovers.
    if (bushes < 6) {
      feature[i] = F_BUSH;
      world.bushes.add(i);
      bushes++;
    } else if (trees < 80 && (i + x) % 3 === 0) {
      feature[i] = F_TREE;
      world.trees.add(i);
      trees++;
    }
  }
}

// Villagers walk through each other and past bushes/plots; water, trees,
// rocks and buildings block (RtR terrain rules, no unit collision - veto A).
export function tilePassable(world, i) {
  const f = world.feature[i];
  if (world.terrain[i] === T_WATER) return false;
  return f === F_NONE || f === F_BUSH || f === F_PLOT || f === F_STUMP || f === F_SAPLING;
}

export function nearestTile(world, set, x, y, radius, extra) {
  let best = -1,
    bestD = Infinity;
  for (const i of set) {
    const fx = i % world.size,
      fy = Math.floor(i / world.size);
    const d = Math.hypot(fx - x, fy - y);
    if (d >= bestD || d > radius) continue;
    if (extra && !extra(i)) continue;
    best = i;
    bestD = d;
  }
  return best;
}

export function countAround(world, set, x, y, radius) {
  let n = 0;
  for (const i of set) {
    const fx = i % world.size,
      fy = Math.floor(i / world.size);
    if (Math.hypot(fx - x, fy - y) <= radius) n++;
  }
  return n;
}
