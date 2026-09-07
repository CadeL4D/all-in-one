import test from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame, placeBuilding } from "./game.js";
import { findPath, adjacentOpen } from "./path.js";
import { MAP_SIZE } from "./balance.js";
import { tilePassable, T_WATER } from "./world.js";

const idx = (x, y) => y * MAP_SIZE + x;

test("paths route around water", () => {
  const s = createGame(42);
  // Walk from camp toward the guaranteed pond; every step must stay dry.
  let goal = -1;
  for (const t of s.world.waterTiles) {
    const d = Math.hypot((t % MAP_SIZE) - CAMPX, Math.floor(t / MAP_SIZE) - CAMPY);
    if (d > 8 && d < 16) {
      goal = t;
      break;
    }
  }
  assert.ok(goal >= 0, "pond exists in range");
  const start = idx(CAMPX + 2, CAMPY + 2);
  const path = findPath(s.world, start, adjacentOpen(s.world, goal, start, s.buildingAt), s.buildingAt);
  assert.ok(path && path.length > 0, "path exists");
  const last = path[path.length - 1];
  assert.notEqual(s.world.terrain[last], T_WATER, "never ends in water");
  for (const step of path) assert.ok(tilePassable(s.world, step), "every step passable");
});

test("paths go around buildings, not through them", () => {
  const s = createGame(42);
  // Wall of homes across the clearing with a gap at the end.
  placeBuilding(s, "home", CAMPX + 2, CAMPY - 2);
  placeBuilding(s, "home", CAMPX + 2, CAMPY);
  placeBuilding(s, "home", CAMPX + 2, CAMPY + 2);
  const from = idx(CAMPX - 2, CAMPY);
  const to = idx(CAMPX + 8, CAMPY);
  const path = findPath(s.world, from, to, s.buildingAt);
  assert.ok(path, "route exists around the houses");
  for (const step of path)
    assert.equal(s.buildingAt[step], -1, `tile ${step} not inside a building`);
});

test("deep water is unreachable; shallow shores are standable", () => {
  const s = createGame(42);
  const size = MAP_SIZE;
  const start = idx(CAMPX, CAMPY);
  // A pond tile whose whole 2-ring is water has no standable approach.
  let deep = -1,
    shallow = -1;
  for (const t of s.world.waterTiles) {
    const tx = t % size,
      ty = Math.floor(t / size);
    let allWater = true;
    for (let dy = -2; dy <= 2 && allWater; dy++)
      for (let dx = -2; dx <= 2 && allWater; dx++) {
        const x = tx + dx,
          y = ty + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) allWater = false;
        else if (s.world.terrain[y * size + x] !== 2) allWater = false;
      }
    if (allWater) {
      deep = t;
      break;
    }
  }
  shallow = [...s.world.waterTiles].find((t) => {
    const tx = t % size,
      ty = Math.floor(t / size);
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const x = tx + dx,
        y = ty + dy;
      return x >= 0 && y >= 0 && x < size && y < size && s.world.terrain[y * size + x] !== 2;
    });
  });
  assert.ok(shallow !== undefined, "a drinkable shore exists");
  const shorePath = findPath(s.world, start, shallow, s.buildingAt);
  assert.ok(shorePath, "shore is reachable");
  assert.notEqual(s.world.terrain[shorePath[shorePath.length - 1]], 2, "path ends on land");
  if (deep >= 0) {
    assert.equal(findPath(s.world, start, deep, s.buildingAt), null, "no swimming to deep water");
  }
});

test("a goal sealed by buildings on every side is unreachable", () => {
  const s = createGame(42);
  const size = MAP_SIZE;
  // Ring a tree with homes so no standable tile remains within reach 2.
  const tree = [...s.world.trees].find(
    (t) =>
      Math.hypot((t % size) - 38, Math.floor(t / size) - 38) < 1 &&
      (t % size) > 6 &&
      Math.floor(t / size) > 6 &&
      (t % size) < size - 8 &&
      Math.floor(t / size) < size - 8,
  );
  if (tree === undefined) return; // world layout without such a tree
  const tx = tree % size,
    ty = Math.floor(tree / size);
  const spots = [];
  for (let dy = -3; dy <= 3; dy += 3)
    for (let dx = -3; dx <= 3; dx += 3)
      if (dx !== 0 || dy !== 0) spots.push([tx + dx + 1, ty + dy + 1]);
  let placed = 0;
  for (const [x, y] of spots) if (placeBuilding(s, "home", x, y).ok) placed++;
  if (placed < 6) return; // not enough room to seal; skip
  const start = idx(CAMPX, CAMPY);
  const path = findPath(s.world, start, tree, s.buildingAt);
  assert.equal(path, null, "sealed goal has no standable approach");
});

const CAMPX = 35,
  CAMPY = 35;
