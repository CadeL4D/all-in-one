import test from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame, placeBuilding } from "./game.js";
import * as bd from "./buildings.js";
import * as cor from "./corruption.js";
import { DAY_TICKS, CORRUPTION_SPAWN_DAY, CAMP_TILE, CORRUPTION_MIN_CAMP_DIST } from "./balance.js";

// Corruption: territorial spread, nest spawn points, and the space-pressure
// threat model (research doc 04 section 2) - the M2 world layer.
function spawnAtDay2(seed = 2026) {
  const s = createGame(seed);
  stepGame(s, (CORRUPTION_SPAWN_DAY - 1) * DAY_TICKS + 5);
  return s;
}

test("corruption spawns on its day, far from camp, near wood", () => {
  const s = spawnAtDay2();
  assert.ok(s.corruption.spawned, "corruption arrived at day 2 dawn");
  assert.ok(s.world.corrupted > 0, "blob stamped");
  const size = s.world.size;
  let cx = 0,
    cy = 0;
  for (let i = 0; i < s.world.corruption.length; i++)
    if (s.world.corruption[i]) {
      cx += i % size;
      cy += Math.floor(i / size);
    }
  cx /= s.world.corrupted;
  cy /= s.world.corrupted;
  assert.ok(
    Math.hypot(cx - CAMP_TILE.x, cy - CAMP_TILE.y) >= CORRUPTION_MIN_CAMP_DIST - 5,
    `blob too close to camp: ${Math.hypot(cx - CAMP_TILE.x, cy - CAMP_TILE.y).toFixed(1)}`,
  );
  assert.ok(
    s.buildings.some((b) => b.type === "nest" && b.complete),
    "a nest formed at the heart of the blob",
  );
});

test("corruption spreads over days and kills the forest it takes", () => {
  const s = spawnAtDay2();
  const start = s.world.corrupted;
  const trees = s.world.trees.size;
  stepGame(s, DAY_TICKS * 3);
  assert.ok(s.world.corrupted > start + 10, `spread stalled: ${start} -> ${s.world.corrupted}`);
  assert.ok(trees > 0, "trees existed before spread");
  for (let i = 0; i < s.world.corruption.length; i++)
    if (s.world.corruption[i]) assert.equal(s.world.feature[i], 0, "corrupted tile not cleared");
});

test("threat stays at zero while corruption grows freely", () => {
  const s = spawnAtDay2();
  stepGame(s, DAY_TICKS * 3);
  assert.equal(s.corruption.threat, 0, "free growth never raises threat (doc 04 2.4)");
});

test("boxing the corruption in raises Corruption Threat", () => {
  const s = spawnAtDay2();
  const size = s.world.size;
  // Build range chains from finished structures (RtR rule), so the test
  // bridges a fence line out from the village, then rings the blob's every
  // exposed orthogonal neighbor. Sites occupy buildingAt, which is exactly
  // what blocks conversion; trees in the way are cleared first because
  // fences need bare ground and the blight would otherwise keep eating them.
  const finish = (b) => {
    b.delivered = 999;
    b.workDone = b.workNeeded;
    bd.siteComplete(s, b);
  };
  const fenceAt = (x, y) => {
    const i = y * size + x;
    // Clear ANY feature: rocks and bushes block fences just like trees, and
    // any unoccupied ring tile the blight can still claim is a hole.
    const f = s.world.feature[i];
    if (f !== 0 && f !== 4) {
      s.world.feature[i] = 0;
      s.world.trees.delete(i);
      s.world.rocks.delete(i);
      s.world.bushes.delete(i);
      s.world.regrow.delete(i);
    }
    if (bd.canPlace(s, "fence", x, y).ok) {
      finish(bd.placeSite(s, "fence", x, y));
      return 1;
    }
    return 0;
  };
  let fences = 0;
  // Bridge: BFS a land route from the village edge to the blob rim (water
  // is the only hard barrier; trees get cleared), fencing every step so the
  // chain never gaps.
  const prev = new Map();
  const start = 37 * size + 37;
  prev.set(start, -1);
  const queue = [start];
  let rim = -1;
  while (queue.length && rim < 0) {
    const c = queue.shift();
    const x = c % size,
      y = Math.floor(c / size);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 1 || ny < 1 || nx >= size - 1 || ny >= size - 1) continue;
      const n = ny * size + nx;
      if (prev.has(n) || s.world.terrain[n] === 2) continue;
      prev.set(n, c);
      if (s.world.corruption[n]) {
        rim = n;
        break;
      }
      queue.push(n);
    }
  }
  assert.ok(rim >= 0, "test setup: no land route to the blob");
  const route = [];
  for (let c = prev.get(rim); c !== start && c !== -1; c = prev.get(c)) route.push(c);
  for (const i of route.reverse()) fences += fenceAt(i % size, Math.floor(i / size));
  // Ring every exposed orthogonal neighbor of the blob.
  const ring = new Set();
  for (let i = 0; i < s.world.corruption.length; i++) {
    if (!s.world.corruption[i]) continue;
    const x = i % size,
      y = Math.floor(i / size);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const n = ny * size + nx;
      if (!s.world.corruption[n] && s.buildingAt[n] === -1) ring.add(n);
    }
  }
  // The ring chains outward from the bridge, so placement is iterative:
  // keep passing over it until every ring tile that can hold a fence does.
  let progress = true;
  while (progress) {
    progress = false;
    for (const i of ring) {
      if (s.buildingAt[i] === -1 && fenceAt(i % size, Math.floor(i / size)))
        progress = true;
    }
  }
  assert.ok(fences > 20, `wall ring too thin: ${fences}`);
  const held = s.world.corrupted;
  // One day, not three: the nest sits INSIDE the ring, and night 3's raid
  // chews the box open from within - that counterplay is the design (and
  // monsters.test.js covers it). Here we verify the isolation: sealed
  // frontier, zero growth, threat climbing.
  stepGame(s, DAY_TICKS);
  assert.ok(
    s.world.corrupted <= held + 3,
    `boxed corruption still grew: ${held} -> ${s.world.corrupted}`,
  );
  assert.ok(s.corruption.threat > 0, "containment is never free (doc 04 2.4)");
});

test("walls and buildings are never converted by spread", () => {
  const s = spawnAtDay2();
  // Force the issue: try to corrupt every fence tile in the world.
  for (const b of [...s.buildings].filter((b2) => b2.type === "fence"))
    for (const i of bd.footprint("fence", b.x, b.y)) cor.corruptTile(s, i);
  for (const b of s.buildings.filter((b2) => b2.type === "fence"))
    for (const i of bd.footprint("fence", b.x, b.y))
      assert.equal(s.world.corruption[i], 0, "corruption ate a fence");
});

test("village pressure slowly reclaims corruption at dawn", () => {
  const s = createGame(4321);
  const place = (type) => {
    for (let r = 2; r < 12; r++)
      for (let a = 0; a < 40; a++) {
        const x = 36 + Math.round(Math.cos((a / 40) * 6.283 + r * 0.7) * r) - 1;
        const y = 36 + Math.round(Math.sin((a / 40) * 6.283 + r * 0.7) * r) - 1;
        if (bd.canPlace(s, type, x, y).ok) {
          placeBuilding(s, type, x, y);
          const b = s.buildings[s.buildings.length - 1];
          b.delivered = 999;
          b.workDone = b.workNeeded;
          bd.siteComplete(s, b);
          return b;
        }
      }
    return null;
  };
  place("home");
  place("home");
  // A free, dry tile with two DISTINCT finished buildings orthogonally
  // adjacent qualifies (a tile inside a home's own footprint never counts).
  let target = -1;
  const size = s.world.size;
  for (let i = 0; i < size * size && target < 0; i++) {
    if (s.buildingAt[i] !== -1 || s.world.terrain[i] === 2) continue;
    const ids = new Set();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const id = s.buildingAt[i + dy * size + dx];
      if (id === -1) continue;
      const b = s.buildings.find((b2) => b2.id === id);
      if (b && b.complete && b.type !== "camp") ids.add(id);
    }
    if (ids.size >= 2) target = i;
  }
  assert.ok(target >= 0, "test setup: no tile between two buildings");
  s.corruption.spawned = true;
  assert.ok(cor.corruptTile(s, target), "test tile corruptible");
  // Reclaim is chance-gated (0.4/dawn), so give it a few dawns.
  for (let d = 0; d < 40 && s.world.corruption[target]; d++) cor.corruptionDawn(s);
  assert.equal(s.world.corruption[target], 0, "villagers reclaimed the tile");
});
