import test from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame, placeBuilding } from "./game.js";
import { tickMonsters, raidsAtNightfall, raidsAtDawn, killMonster } from "./monsters.js";
import * as bd from "./buildings.js";
import * as cor from "./corruption.js";
import { findPath } from "./path.js";
import { serialize, deserialize } from "./save.js";
import * as B from "./balance.js";
import { tilePassable } from "./world.js";
import { phaseStart } from "./clock.js";
import { createVillager } from "./villager.js";

// M2 acceptance: "Night raids follow RtR pathing rule; maze changes
// outcomes; loss is readable" (master plan section 7).

// A quiet arena: no villagers to duel, no nomads, no corruption clock.
function arena(seed = 2026) {
  const s = createGame(seed);
  s.villagers = [];
  s.nomads = [];
  s.nomadQueue = [];
  return s;
}

function spawnMonster(s, kind, x, y) {
  const def = B.MONSTERS[kind];
  const m = {
    id: s.nextId++,
    kind,
    x,
    y,
    hp: def.hp,
    facing: 1,
    path: [],
    pathI: 0,
    attackCd: 0,
    chewCd: 0,
    repathAt: 0,
  };
  s.monsters.push(m);
  return m;
}

function fenceAt(s, x, y) {
  assert.ok(bd.canPlace(s, "fence", x, y).ok, `arena premise: fence at ${x},${y}`);
  placeBuilding(s, "fence", x, y);
  const id = s.buildingAt[y * s.world.size + x];
  return s.buildings.find((b) => b.id === id);
}

function openNear(s, x, y) {
  for (let r = 0; r < 4; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx,
          ny = y + dy;
        if (nx < 1 || ny < 1 || nx >= s.world.size - 1 || ny >= s.world.size - 1) continue;
        const i = ny * s.world.size + nx;
        if (tilePassable(s.world, i) && s.buildingAt[i] === -1) return [nx + 0.5, ny + 0.5];
      }
  throw new Error("arena premise: no open tile");
}

// A full fence box around the camp actually seals it - a lone wall row on
// an open 72x72 map always has a detour, and raiders correctly take it.
function boxCamp(s, gateX = null) {
  let n = 0;
  for (let x = 32; x <= 39; x++)
    for (let y = 32; y <= 39; y++) {
      const onRing = Math.max(Math.abs(x * 2 - 71), Math.abs(y * 2 - 71)) === 7;
      if (!onRing) continue;
      // Clear berries/rocks off the ring line: walls need bare ground.
      const i = y * s.world.size + x;
      s.world.trees.delete(i);
      s.world.rocks.delete(i);
      s.world.bushes.delete(i);
      s.world.feature[i] = 0;
      if (x === gateX && y === 32) placeBuilding(s, "gate", x, y);
      else fenceAt(s, x, y);
      n++;
    }
  return n;
}

test("clear path: raiders take the gap and never touch walls (RtR rule)", () => {
  const s = arena();
  // Wall row above the camp with one gap at x=37.
  for (let x = 31; x <= 40; x++) if (x !== 37) fenceAt(s, x, 33);
  const [mx, my] = openNear(s, 34, 30);
  const m = spawnMonster(s, "husk", mx, my);
  const walls = s.buildings.filter((b) => b.type === "fence");
  for (let t = 0; t < 900 && m.y < 33.6; t++) tickMonsters(s, 1);
  assert.ok(m.y > 33.6, "raider crossed the wall line through the gap");
  for (const w of walls)
    assert.equal(w.hp, B.BUILDINGS.fence.hp, "walls untouched on a clear path");
});

test("sealed in: raiders chew the least time-to-break wall and push through", () => {
  const s = arena();
  boxCamp(s);
  const [mx, my] = openNear(s, 34, 30);
  const m = spawnMonster(s, "husk", mx, my);
  for (let t = 0; t < 700 && m.hp > 0 && m.y < 32.6; t++) tickMonsters(s, 1);
  const bitten = s.buildings.filter((b) => b.type === "fence" && b.hp < B.BUILDINGS.fence.hp);
  assert.ok(bitten.length >= 1, "a wall took damage");
  const lineY = bitten.map((b) => b.y);
  assert.ok(lineY.every((y) => y === 32), "damage landed on the near wall line");
});

test("gates pass villagers but not raiders", () => {
  const s = arena();
  boxCamp(s, 35); // gate punched into the north wall
  const size = s.world.size;
  const outside = 30 * size + 35; // north of the box
  const camp = 35 * size + 35;
  // Villager graph: straight through the gate.
  const withGate = findPath(s.world, outside, camp, s.buildingAt, { through: s.gateTiles });
  assert.ok(withGate, "villagers path through the gate");
  // Monster graph: the sealed box has no open route at all.
  const sealed = findPath(s.world, outside, camp, s.buildingAt);
  assert.equal(sealed, null, "no open route through a closed gate");
  // And in practice: a raider breaches, and the least-resistance rule picks
  // a cheap fence (100 HP) over the gate (320 HP) - gates are walls to
  // raiders, just doors for villagers.
  const [mx, my] = openNear(s, 34, 30);
  spawnMonster(s, "husk", mx, my);
  for (let t = 0; t < 800; t++) {
    tickMonsters(s, 1);
    if (s.buildings.some((b) => b.type === "fence" && b.hp < B.BUILDINGS.fence.hp)) break;
  }
  const bitten = s.buildings.filter((b) => b.hp < B.BUILDINGS[b.type].hp);
  assert.ok(bitten.length >= 1, "raiders chew through a sealed line");
  assert.ok(
    bitten.every((b) => b.type === "fence"),
    "the breach goes for the cheapest structure, not the gate",
  );
});

test("sentry tower shoots raiders in range, over walls", () => {
  const s = arena();
  for (let x = 31; x <= 40; x++) fenceAt(s, x, 33);
  assert.ok(bd.canPlace(s, "tower", 33, 35).ok, "tower spot");
  placeBuilding(s, "tower", 33, 35);
  const tower = s.buildings[s.buildings.length - 1];
  tower.complete = true;
  const [mx, my] = openNear(s, 34, 30);
  const m = spawnMonster(s, "husk", mx, my);
  // Bolts live ~7 ticks, so the "in flight" check must happen DURING the
  // volley, not after the loop.
  let boltSeen = false;
  for (let t = 0; t < 40; t++) {
    tickMonsters(s, 1);
    if (s.projectiles.length > 0) boltSeen = true;
  }
  assert.ok(m.hp < B.MONSTERS.husk.hp, "tower hit the raider");
  assert.ok(boltSeen, "bolt in flight");
});

test("blots split into two blotlings when killed", () => {
  const s = arena();
  const m = spawnMonster(s, "blot", 34.5, 30.5);
  killMonster(s, m);
  assert.equal(m.hp, 0);
  const blots = s.monsters.filter((m2) => m2.kind === "blotling");
  assert.equal(blots.length, 2, "two smaller blots remain");
  assert.equal(s.stats.slain, 1, "kill counted");
});

test("nests release a raid at nightfall; dawn crumbles the survivors", () => {
  const s = createGame(2026);
  // Fast-forward the world layer WITH the villagers alive: an empty
  // village trips the loss check on tick 1 and freezes the sim before the
  // corruption ever lands.
  stepGame(s, (B.CORRUPTION_SPAWN_DAY - 1) * B.DAY_TICKS + 5);
  s.villagers = [];
  s.nomads = [];
  s.nomadQueue = [];
  assert.ok(s.corruption.spawned, "blob landed");
  // Grow the blob to a second nest's worth. The spread check only fires on
  // ticks aligned to CORRUPTION_SPREAD_TICKS, so snap before stepping.
  s.clock.tick -= s.clock.tick % B.CORRUPTION_SPREAD_TICKS;
  while (s.world.corrupted < B.NEST_MIN_TILES + B.NEST_TILES_PER_EXTRA) {
    s.clock.tick += B.CORRUPTION_SPREAD_TICKS;
    cor.tickCorruption(s);
  }
  cor.manageNests(s);
  assert.ok(s.buildings.some((b) => b.type === "nest"), "nest exists");
  s.clock.tick = 2 * B.DAY_TICKS + phaseStart(5); // nightfall of day 3
  s.clock.day = 3;
  raidsAtNightfall(s);
  assert.ok(s.monsters.length >= 1, `raid spawned (got ${s.monsters.length})`);
  raidsAtDawn(s);
  assert.equal(s.monsters.length, 0, "survivors crumble at dawn");
});

test("raiders duel villagers: both sides bleed, nobody hides", () => {
  const s = arena();
  const v = { id: 999, name: "Test", x: 34.5, y: 31.5, health: B.MAX_NEED, dead: false, attackCd: 0, home: null, workBuilding: null, task: null, carrying: null };
  s.villagers.push(v);
  const m = spawnMonster(s, "husk", 34.8, 31.8);
  for (let t = 0; t < 120 && !v.dead && m.hp > 0; t++) tickMonsters(s, 1);
  assert.ok(v.health < B.MAX_NEED || v.dead, "villager took hits (no shelter - veto 3)");
  assert.ok(m.hp < B.MONSTERS.husk.hp || v.dead, "villager swung back");
});

test("a fallen camp ends the run and freezes the sim", () => {
  const s = arena();
  // One far-off villager so the OTHER loss trigger (last villager dead)
  // can't fire first - this test is about the camp. Real villager shape:
  // stepGame ticks it fully.
  createVillager(s, 5.5, 5.5);
  const camp = s.buildings.find((b) => b.type === "camp");
  camp.hp = B.MONSTERS.husk.damage; // one bite from the end
  const [mx, my] = openNear(s, 34, 34);
  spawnMonster(s, "husk", mx, my);
  for (let t = 0; t < 400 && !s.lost; t++) stepGame(s, 1);
  assert.ok(s.lost, "loss state raised");
  assert.match(s.lost.cause, /camp/i);
  assert.equal(s.lost.slain, 0);
  const tick = s.clock.tick;
  stepGame(s, 500);
  assert.equal(s.clock.tick, tick, "a lost village freezes (restart is the move)");
});

test("mid-raid save round-trips walls, monsters, and occupancy", () => {
  const s = arena();
  boxCamp(s, 35); // sealed box with a gate: occupancy + gate tiles to save
  spawnMonster(s, "husk", 34.5, 30.5);
  const blob = JSON.parse(JSON.stringify(serialize(s)));
  const r = deserialize(blob);
  assert.ok(r, "v2 save loads");
  assert.equal(r.monsters.length, s.monsters.length, "raiders restored");
  const wallTile = 32 * s.world.size + 34;
  assert.equal(r.buildingAt[wallTile], s.buildingAt[wallTile], "wall occupancy restored");
  assert.equal(r.gateTiles.size, s.gateTiles.size, "gate tiles restored");
  // The restored raider keeps routing (the box still blocks it).
  for (let t = 0; t < 300 && r.monsters.length; t++) tickMonsters(r, 1);
  const bitten = r.buildings.find(
    (b) => b.type === "fence" && b.hp < B.BUILDINGS.fence.hp,
  );
  assert.ok(bitten || r.monsters.length === 0, "restored raid still fights");
});
