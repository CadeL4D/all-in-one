// M4 buildings doing real work: the refine chains (boards/blocks/meals),
// the guard and healer professions, fire-pit range projection + immunity,
// wraith-proof curtain walls, per-tower ammo, and save v4.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame, placeBuilding } from "./game.js";
import { createVillager } from "./villager.js";
import * as bd from "./buildings.js";
import * as B from "./balance.js";
import { serializeSim, deserializeSim } from "./save.js";
import { tickMonsters } from "./monsters.js";

function arena(seed = 7700) {
  const s = createGame(seed);
  s.villagers = [];
  s.nomads = [];
  s.nomadQueue = [];
  s.monsters = [];
  s.projectiles = [];
  return s;
}

function finish(s, type, x, y) {
  const res = bd.canPlace(s, type, x, y);
  assert.ok(res.ok, `arena premise: ${type} at ${x},${y} (${res.reason})`);
  placeBuilding(s, type, x, y);
  const b = s.buildings[s.buildings.length - 1];
  b.delivered = 999;
  b.deliveredRes = {};
  b.workDone = b.workNeeded;
  bd.siteComplete(s, b);
  return b;
}

// A villager hired into a job at a given building, mid-form.
function worker(s, job, building, x = 36.5, y = 36.5) {
  const v = createVillager(s, x, y);
  v.faith = 80;
  v.job = job;
  v.workBuilding = building.id;
  building.workers.push(v.id);
  return v;
}

test("sawmills saw boards while under the maintain target, then stop", () => {
  const s = arena();
  const mill = finish(s, "sawmill", 33, 33);
  const carp = worker(s, "carpenter", mill);
  s.jobCounts = { carpenter: 1 };
  s.resources.wood = 100;
  stepGame(s, B.DAY_TICKS);
  assert.ok(s.resources.boards > 0, `boards made (got ${s.resources.boards})`);
  stepGame(s, B.DAY_TICKS * 2);
  assert.ok(
    s.resources.boards <= B.CRAFT_MAINTAIN.boards,
    `holds at the maintain target, never past (got ${s.resources.boards})`,
  );
  assert.ok(s.resources.wood < 100, "boards cost wood");
  assert.equal(carp.job, "carpenter");
});

test("kitchens cook meals from food", () => {
  const s = arena(7711);
  const kitchen = finish(s, "kitchen", 33, 33);
  worker(s, "cook", kitchen);
  s.jobCounts = { cook: 1 };
  s.resources.food = 60;
  stepGame(s, B.DAY_TICKS);
  assert.ok(s.resources.meals > 0, `meals cooked (got ${s.resources.meals})`);
  assert.ok(s.resources.meals <= B.CRAFT_MAINTAIN.meals);
  assert.ok(s.resources.food < 60, "meals cost food");
});

test("stonecarvers dress blocks from stone", () => {
  const s = arena(7712);
  const shop = finish(s, "stonecarver", 33, 33);
  worker(s, "mason", shop);
  s.jobCounts = { mason: 1 };
  s.resources.stone = 80;
  stepGame(s, B.DAY_TICKS);
  assert.ok(s.resources.blocks > 0, `blocks dressed (got ${s.resources.blocks})`);
  assert.ok(s.resources.blocks <= B.CRAFT_MAINTAIN.blocks);
});

test("villagers eat meals first when the kitchen has stock", () => {
  const s = arena();
  const v = createVillager(s, 36.5, 36.5);
  v.hunger = 10;
  s.resources.meals = 5;
  s.resources.food = 50;
  stepGame(s, Math.floor(B.DAY_TICKS * 0.6));
  assert.ok(s.resources.meals < 5, "a meal was eaten");
  assert.ok(v.hunger >= 10 + B.MEAL_EAT_AMOUNT - 20, `a meal fills whole (hunger ${v.hunger})`);
});

test("guards pick their own quarry and bring it down", () => {
  const s = arena(7722);
  const post = finish(s, "watchpost", 33, 33);
  const guard = worker(s, "guard", post);
  guard.health = 100;
  s.jobCounts = { guard: 1 };
  const m = {
    id: s.nextId++,
    kind: "husk",
    x: 34.5,
    y: 36.5,
    hp: B.MONSTERS.husk.hp,
    level: 1,
    maxHp: B.MONSTERS.husk.hp,
    path: [],
    pathI: 0,
    attackCd: 0,
    chewCd: 0,
    repathAt: 0,
    facing: 1,
  };
  s.monsters.push(m);
  // Guard swings 2.5 dmg / 55 ticks; a 35 hp husk dies in ~13 minutes of
  // sim - but the husk fights back (3 dmg / 45t): a fresh guard with full
  // health outlasts it. A day is plenty.
  stepGame(s, B.DAY_TICKS);
  assert.ok(m.hp <= 0 || !s.monsters.includes(m), "the guard settled it");
  assert.equal(guard.task?.kind !== "hunt", true, "no quarry left to hunt");
});

test("healers tend the wounded back to health", () => {
  const s = arena(7733);
  const clinic = finish(s, "clinic", 33, 33);
  const healer = worker(s, "healer", clinic);
  s.jobCounts = { healer: 1 };
  const patient = createVillager(s, 34.5, 36.5);
  patient.health = 40;
  stepGame(s, Math.floor(B.DAY_TICKS * 0.7));
  assert.ok(
    patient.health >= 40 + B.TEND_HEAL,
    `tended (health ${patient.health})`,
  );
  assert.equal(healer.job, "healer");
});

test("fire pits project build range and raiders refuse to attack them", () => {
  const s = arena(7744);
  // A fire pit out at the rim of the camp's range.
  const rim = Math.floor(bd.campRange(s)); // tier-1 radius
  const fx = B.CAMP_TILE.x + rim - 1,
    fy = B.CAMP_TILE.y;
  finish(s, "firePit", fx, fy);
  // Somewhere beyond camp range but within the pit's long reach, on clear
  // ground - only the pit can vouch for a spot that far out.
  const range = bd.campRange(s);
  let extended = null;
  outer: for (let dy = -6; dy <= 6; dy++)
    for (let dx = -8; dx <= 8; dx++) {
      const x = fx + dx,
        y = fy + dy;
      if (Math.hypot(x + 0.5 - B.CAMP_TILE.x, y + 0.5 - B.CAMP_TILE.y) <= range) continue;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 8) continue;
      if (bd.canPlace(s, "home", x, y).ok) {
        extended = [x, y];
        break outer;
      }
    }
  assert.ok(extended, "fire pits extend build range past the camp's reach");
  // And monsters never chew one: seal the strip above camp with a fire-pit
  // line and drop a husk beyond it - no open route, no breach route,
  // the husk mills; the pits keep their paint.
  for (let x = B.CAMP_TILE.x - 4; x <= B.CAMP_TILE.x + 5; x++)
    if (bd.canPlace(s, "firePit", x, B.CAMP_TILE.y - 2).ok) finish(s, "firePit", x, B.CAMP_TILE.y - 2);
  const m = {
    id: s.nextId++,
    kind: "husk",
    x: B.CAMP_TILE.x + 0.5,
    y: B.CAMP_TILE.y - 3.5,
    hp: B.MONSTERS.husk.hp,
    level: 1,
    maxHp: B.MONSTERS.husk.hp,
    path: [],
    pathI: 0,
    attackCd: 0,
    chewCd: 0,
    repathAt: 0,
    facing: 1,
  };
  s.monsters.push(m);
  tickMonsters(s, 3600); // a minute plus of trying
  const pitsIntact = s.buildings.filter((b) => b.type === "firePit").every((b) => b.hp === B.BUILDINGS.firePit.hp);
  assert.ok(pitsIntact, "monsters will not attack fire pits (doc 02 section 4.5)");
});

// A 3x3 ring of `type` walls around a clear spot, or null if none fits.
function wallBox(s, type) {
  for (let y = 10; y < s.world.size - 10; y += 4)
    for (let x = 10; x < s.world.size - 10; x += 4) {
      if (Math.hypot(x - B.CAMP_TILE.x, y - B.CAMP_TILE.y) < 8) continue;
      let ok = true;
      const ring = [];
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (!bd.canPlace(s, type, x + dx, y + dy).ok) ok = false;
          else ring.push([x + dx, y + dy]);
        }
      if (ok && ring.length === 8) return { cx: x, cy: y, ring };
    }
  return null;
}

function wraithAt(s, x, y) {
  const w = {
    id: s.nextId++,
    kind: "wraith",
    x: x + 0.5,
    y: y + 0.5,
    hp: B.MONSTERS.wraith.hp,
    level: 1,
    maxHp: B.MONSTERS.wraith.hp,
    path: [],
    pathI: 0,
    attackCd: 0,
    chewCd: 0,
    repathAt: 0,
    facing: 1,
  };
  s.monsters.push(w);
  return w;
}

test("curtain walls stop wraiths where plain walls cannot", () => {
  // Control: boxed in plain fences, the wraith glides out through them.
  const s1 = arena(7755);
  const box1 = wallBox(s1, "fence");
  assert.ok(box1, "arena premise: fence box fits");
  for (const [x, y] of box1.ring) finish(s1, "fence", x, y);
  const w1 = wraithAt(s1, box1.cx, box1.cy);
  tickMonsters(s1, 2400);
  assert.ok(
    Math.hypot(w1.x - box1.cx - 0.5, w1.y - box1.cy - 0.5) > 1.2,
    `wraith phased through the fences (at ${w1.x.toFixed(1)},${w1.y.toFixed(1)})`,
  );
  // The treatment: the same box in warded masonry holds it.
  const s2 = arena(7755);
  const box2 = wallBox(s2, "curtainWall");
  assert.ok(box2, "arena premise: curtain box fits");
  for (const [x, y] of box2.ring) finish(s2, "curtainWall", x, y);
  const w2 = wraithAt(s2, box2.cx, box2.cy);
  tickMonsters(s2, 2400);
  assert.ok(
    Math.hypot(w2.x - box2.cx - 0.5, w2.y - box2.cy - 0.5) <= 1.2 && w2.hp > 0,
    `curtain walls hold the phaser in (at ${w2.x.toFixed(1)},${w2.y.toFixed(1)}, hp ${w2.hp})`,
  );
  const ringHp = s2.buildings
    .filter((b) => b.type === "curtainWall")
    .reduce((a, b) => a + b.hp, 0);
  assert.ok(
    ringHp < B.BUILDINGS.curtainWall.hp * 8,
    "and when it has no phase route, it chews - slowly",
  );
});

test("sling towers throw stone; ballistas drink two bolts a shot", () => {
  const s = arena(7766);
  const sling = finish(s, "slingTower", 36, 38);
  const m = {
    id: s.nextId++,
    kind: "husk",
    x: 36.5,
    y: 40.5,
    hp: B.MONSTERS.husk.hp,
    level: 1,
    maxHp: B.MONSTERS.husk.hp,
    path: [],
    pathI: 0,
    attackCd: 0,
    chewCd: 0,
    repathAt: 0,
    facing: 1,
  };
  s.monsters.push(m);
  s.resources.stone = 10;
  s.resources.bolts = 10;
  const hpBefore = m.hp;
  tickMonsters(s, 600); // 10 shots at reload 55
  assert.ok(s.resources.stone < 10, "the sling spends stone");
  assert.equal(s.resources.bolts, 10, "the sling never touches bolts");
  assert.ok(m.hp < hpBefore, `crush lands (hp ${m.hp})`);

  const s2 = arena(7766);
  const ballista = finish(s2, "ballista", 36, 38);
  const m2 = { ...m, id: s2.nextId++, hp: B.MONSTERS.husk.hp * 3, maxHp: B.MONSTERS.husk.hp * 3, y: 40.5 };
  s2.monsters.push(m2);
  s2.resources.bolts = 10;
  const boltsBefore = s2.resources.bolts;
  tickMonsters(s2, 600);
  assert.ok(s2.resources.bolts < boltsBefore, "the ballista spends bolts");
  assert.ok(boltsBefore - s2.resources.bolts >= 2, "two bolts per shot");
});

test("save v5 round-trips the climb; v3 islands migrate with defaults", () => {
  const s = createGame(7777);
  const camp = s.buildings.find((b) => b.type === "camp");
  camp.tier = 3;
  for (const v of s.villagers) v.faith = 77;
  s.resources.boards = 12;
  s.resources.blocks = 3;
  s.resources.meals = 9;
  const blob = JSON.parse(JSON.stringify(serializeSim(s)));
  assert.equal(blob.v, 4);
  const back = deserializeSim(blob);
  assert.ok(back, "v4 sim blob round-trips");
  assert.equal(back.buildings.find((b) => b.type === "camp").tier, 3);
  assert.equal(back.villagers[0].faith, 77);
  assert.equal(back.resources.boards, 12);
  assert.equal(back.resources.meals, 9);
  assert.equal(bd.buildLimit(back), B.CAMP_TIERS[2].buildLimit);

  // A v3-shaped blob: no tier, no faith, no refined resources.
  const v3 = JSON.parse(JSON.stringify(serializeSim(s)));
  v3.v = 3;
  delete v3.buildings.find((b) => b.type === "camp").tier;
  for (const v of v3.villagers) delete v.faith;
  for (const r of ["boards", "blocks", "meals"]) delete v3.resources[r];
  const old = deserializeSim(v3);
  assert.ok(old, "v3 islands still load");
  const oldCamp = old.buildings.find((b) => b.type === "camp");
  assert.ok(oldCamp.tier >= 1, "camp tier defaulted");
  assert.equal(old.villagers[0].faith, B.FAITH_START, "faith defaulted");
  assert.equal(old.resources.boards, 0, "refined stocks default to zero");
  // The migration never strands a village under its own building count.
  assert.ok(
    bd.buildLimit(old) >= bd.countBuilt(old),
    `limit ${bd.buildLimit(old)} covers ${bd.countBuilt(old)} standing buildings`,
  );
});
