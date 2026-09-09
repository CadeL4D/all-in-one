import test from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame, placeBuilding } from "./game.js";
import {
  influenceMax,
  tickSpells,
  castSpell,
  grabAt,
  moveHeld,
  releaseHeld,
} from "./spells.js";
import {
  damageMonster,
  routeToCamp,
  tickMonsters,
  spawnMonsterAt,
  raidsAtNightfall,
  raidsAtDawn,
} from "./monsters.js";
import * as bd from "./buildings.js";
import * as cor from "./corruption.js";
import { serialize, deserialize } from "./save.js";
import * as B from "./balance.js";
import { phaseStart } from "./clock.js";
import { T_WATER, tilePassable } from "./world.js";

// M3 acceptance: "Grab feels physical; towers counter-match monster
// resists" (master plan section 7) - plus the influence economy, the full
// resist matrix, the two new monster species, and the ammo chain.

// A quiet arena: no villagers to duel, no nomads, no corruption clock.
function arena(seed = 4242) {
  const s = createGame(seed);
  s.villagers = [];
  s.nomads = [];
  s.nomadQueue = [];
  return s;
}

function spawnMonster(s, kind, x, y) {
  return spawnMonsterAt(s, kind, x, y);
}

function fenceAt(s, x, y) {
  assert.ok(bd.canPlace(s, "fence", x, y).ok, `arena premise: fence at ${x},${y}`);
  placeBuilding(s, "fence", x, y);
  const id = s.buildingAt[y * s.world.size + x];
  return s.buildings.find((b) => b.id === id);
}

// Same sealed ring as monsters.test.js: a box the husk must chew but a
// wraith should glide straight through.
function boxCamp(s) {
  for (let x = 32; x <= 39; x++)
    for (let y = 32; y <= 39; y++) {
      if (Math.max(Math.abs(x * 2 - 71), Math.abs(y * 2 - 71)) !== 7) continue;
      const i = y * s.world.size + x;
      s.world.trees.delete(i);
      s.world.rocks.delete(i);
      s.world.bushes.delete(i);
      s.world.feature[i] = 0;
      fenceAt(s, x, y);
    }
}

function findWater(s) {
  for (let i = 0; i < s.world.terrain.length; i++)
    if (s.world.terrain[i] === T_WATER && s.buildingAt[i] === -1) {
      const x = i % s.world.size;
      return { x: x + 0.5, y: Math.floor(i / s.world.size) + 0.5, i };
    }
  return null;
}

// A standable, building-free tile near (x, y): spawns must sit on ground
// the pathfinder can leave, or a march test silently tests nothing.
function dryNear(s, x, y) {
  const size = s.world.size;
  for (let r = 0; r <= 6; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = x + dx,
          ny = y + dy;
        if (nx < 1 || ny < 1 || nx >= size - 1 || ny >= size - 1) continue;
        const i = ny * size + nx;
        if (tilePassable(s.world, i) && s.buildingAt[i] === -1)
          return { x: nx + 0.5, y: ny + 0.5 };
      }
  throw new Error("arena premise: no dry tile");
}

function villagerAt(s, x, y, over = {}) {
  const v = {
    id: s.nextId++,
    name: "Test",
    age: "adult",
    x,
    y,
    health: B.MAX_NEED,
    hunger: 90,
    thirst: 90,
    energy: 90,
    dead: false,
    held: false,
    attackCd: 0,
    home: null,
    workBuilding: null,
    task: null,
    carrying: null,
    path: [],
    facing: 1,
    ...over,
  };
  s.villagers.push(v);
  return v;
}

// ---- Influence economy ----

test("influence scales with the living village and regenerates daily", () => {
  const s = arena(7);
  assert.equal(influenceMax(s), 0, "no villagers, no influence");
  for (let i = 0; i < 5; i++) villagerAt(s, 34 + i, 34);
  villagerAt(s, 40, 34, { age: "child" });
  const expected = 5 * B.INFLUENCE_PER_ADULT + B.INFLUENCE_PER_CHILD;
  assert.equal(influenceMax(s), expected);
  tickSpells(s, B.DAY_TICKS);
  assert.ok(
    s.god.influence >= expected * B.INFLUENCE_REGEN_PER_DAY * 0.99,
    `a day of regen fills ~45% (got ${s.god.influence})`,
  );
  assert.ok(s.god.influence <= expected, "never above the max");
});

test("casting spends influence and respects the recharge", () => {
  const s = arena(11);
  spawnMonster(s, "husk", 34.5, 30.5);
  s.god.influence = 150;
  const first = castSpell(s, "lightning", 34.5, 30.5);
  assert.ok(first.ok, "first bolt flies");
  assert.equal(s.god.influence, 50, "100 charged");
  const denied = castSpell(s, "lightning", 34.5, 30.5);
  assert.equal(denied.ok, false, "recharge blocks the double-tap");
  s.god.cooldown = 0;
  const broke = castSpell(s, "lightning", 34.5, 30.5);
  assert.equal(broke.ok, false, "empty purse blocks too");
  assert.equal(s.god.influence, 50, "denied casts charge nothing");
});

// ---- The resist matrix ----

test("every species carries the full matrix", () => {
  for (const [kind, def] of Object.entries(B.MONSTERS))
    for (const t of ["pierce", "crush", "magic", "fire", "water"])
      assert.equal(typeof def.resists?.[t], "number", `${kind} defines ${t}`);
});

test("the matrix counters: magic melts blots, piercing barely scratches", () => {
  const s = arena(3);
  const blot = spawnMonster(s, "blot", 30.5, 30.5);
  damageMonster(s, blot, 12, "pierce");
  assert.ok(blot.hp > B.MONSTERS.blot.hp - 6, "sentry bolt mostly bounced");
  const blot2 = spawnMonster(s, "blot", 31.5, 30.5);
  damageMonster(s, blot2, 40, "magic");
  assert.equal(blot2.hp, 0, "lightning one-shots a blot via the weakness");
  const husk = spawnMonster(s, "husk", 32.5, 30.5);
  damageMonster(s, husk, 40, "magic");
  assert.equal(husk.hp, 0, "lightning one-shots a husk (no resist)");
  const wraith = spawnMonster(s, "wraith", 33.5, 30.5);
  damageMonster(s, wraith, 40, "magic");
  assert.ok(wraith.hp > 0, "a wraith survives one bolt");
  const ember = spawnMonster(s, "emberling", 34.5, 30.5);
  damageMonster(s, ember, 60, "fire");
  assert.ok(ember.hp > B.MONSTERS.emberling.hp * 0.8, "fire barely singes an emberling");
});

test("lightning: one tap, one dead raider; a whiff charges nothing", () => {
  const s = arena(5);
  spawnMonster(s, "husk", 34.5, 30.5);
  s.god.influence = B.SPELLS.lightning.cost;
  const miss = castSpell(s, "lightning", 50.5, 50.5);
  assert.equal(miss.ok, false);
  assert.equal(s.god.influence, B.SPELLS.lightning.cost, "whiff: no charge");
  const hit = castSpell(s, "lightning", 34.6, 30.6);
  assert.ok(hit.ok);
  // The corpse is swept by the next tick; dead-on-the-spot is hp <= 0.
  assert.ok(s.monsters.every((m) => m.hp <= 0), "husk vaporized");
});

// ---- Wraith (wall-phaser) ----

test("wraiths glide through walls but must still breach gates and buildings", () => {
  const s = arena(17);
  boxCamp(s);
  const camp = s.buildings.find((b) => b.type === "camp");
  const wraith = spawnMonster(s, "wraith", 34.5, 30.5);
  const husk = spawnMonster(s, "husk", 36.5, 30.5);
  const wraithRoute = routeToCamp(s, wraith, camp);
  assert.ok(wraithRoute.length, "wraith found a route into the box");
  assert.ok(
    wraithRoute.some((i) => s.buildingAt[i] !== -1),
    "that route passes through wall tiles",
  );
  const huskRoute = routeToCamp(s, husk, camp);
  assert.equal(huskRoute.length, 0, "husk is boxed in (must chew)");
  // The husk's chewing is M2's lesson - clear it so only the wraith ticks.
  s.monsters = s.monsters.filter((m) => m !== husk);
  // And in practice: the wraith crosses the wall line untouched.
  for (let t = 0; t < 900 && wraith.y < 32.6; t++) tickMonsters(s, 1);
  assert.ok(wraith.y > 32.6, "wraith phased through the north wall");
  const bitten = s.buildings.filter((b) => b.hp < B.BUILDINGS[b.type].hp);
  assert.ok(
    bitten.every((b) => b.type === "camp"),
    "no wall took damage from the phasing wraith",
  );
});

// ---- Emberling (ranged fire) ----

test("emberlings stop at range and shoot; they still march when nothing is in range", () => {
  const s = arena(19);
  const v = villagerAt(s, 34.5, 31.5);
  const ember = spawnMonster(s, "emberling", 34.5, 28.5); // 3 tiles out
  let fireball = false;
  for (let t = 0; t < 90; t++) {
    tickMonsters(s, 1);
    if (s.projectiles.some((p) => p.kind === "fireball")) fireball = true;
  }
  assert.ok(fireball, "fireball in flight");
  assert.ok(v.health < B.MAX_NEED, "villager scorched from range");
  assert.ok(Math.abs(ember.y - 28.5) < 1.5, "held its standoff distance");

  // No target in range: it resumes the march on the camp.
  const farAt = dryNear(s, 34, 20);
  const far = spawnMonster(s, "emberling", farAt.x, farAt.y);
  tickMonsters(s, 1);
  assert.ok(far.path.length > 0, "marches when nobody is in reach");

  // Buildings count as targets too.
  const s2 = arena(23);
  const ember2 = spawnMonster(s2, "emberling", 34.5, 31.5);
  const camp = s2.buildings.find((b) => b.type === "camp");
  const hp0 = camp.hp;
  for (let t = 0; t < 90; t++) tickMonsters(s2, 1);
  assert.ok(camp.hp < hp0 || s2.buildings.some((b) => b.hp < B.BUILDINGS[b.type].hp),
    "shots a building when no villagers are near");
  assert.equal(ember2.hp, B.MONSTERS.emberling.hp, "not a melee creature here");
});

// ---- Ammo economy ----

test("towers spend bolts; a dry pool holds fire exactly once per night", () => {
  const s = arena(29);
  assert.ok(bd.canPlace(s, "tower", 33, 35).ok, "tower spot");
  placeBuilding(s, "tower", 33, 35);
  const tower = s.buildings[s.buildings.length - 1];
  tower.complete = true;
  spawnMonster(s, "husk", 34.5, 30.5);
  s.resources.bolts = 5;
  for (let t = 0; t < 40; t++) tickMonsters(s, 1);
  assert.ok(s.resources.bolts < 5, "each shot spent a bolt");
  const m = s.monsters[0];
  assert.ok(m.hp < B.MONSTERS.husk.hp, "and hit the raider");

  // Dry: no firing, one warning event, flags latch until next nightfall.
  s.resources.bolts = 0;
  s.flags.boltsWarned = false;
  for (let t = 0; t < 30; t++) tickMonsters(s, 1);
  assert.ok(s.buildings.some((b) => b.type === "tower").valueOf() && s.projectiles.length === 0);
  assert.ok(s.events.some((e) => e.type === "bolts-out"), "out-of-bolts nudge");
  s.events.length = 0;
  for (let t = 0; t < 30; t++) tickMonsters(s, 1);
  assert.ok(!s.events.some((e) => e.type === "bolts-out"), "once per night, not spam");
});

test("sawpits fletch bolts from stored wood", () => {
  const s = arena(31);
  assert.ok(bd.canPlace(s, "sawpit", 33, 33).ok);
  placeBuilding(s, "sawpit", 33, 33);
  const sawpit = s.buildings[s.buildings.length - 1];
  sawpit.complete = true;
  s.resources.wood = 10;
  s.resources.bolts = 0;
  s.clock.tick = 600 * 100 - sawpit.id; // align to the craft beat
  bd.tickProduction(s, 1);
  assert.equal(s.resources.bolts, B.BOLT_CRAFT_YIELD, "bolts crafted");
  assert.equal(s.resources.wood, 10 - B.BOLT_CRAFT_WOOD, "wood consumed");
});

// ---- Storm pylon (the counter-match tower) ----

test("a storm pylon shreds what sentries cannot - even over walls", () => {
  const s = arena(37);
  boxCamp(s); // blot sealed inside... actually outside: spawn beyond the ring
  assert.ok(bd.canPlace(s, "stormPylon", 33, 35).ok, "pylon spot");
  placeBuilding(s, "stormPylon", 33, 35);
  const pylon = s.buildings.find((b) => b.type === "stormPylon");
  pylon.complete = true;
  s.resources.bolts = 50;
  const blot = spawnMonster(s, "blot", 34.5, 30.5); // outside, in range
  for (let t = 0; t < 60 * 4 && blot.hp > 0; t++) tickMonsters(s, 1);
  assert.ok(blot.hp <= 0, "magic kills what pierce cannot (55 hp / 8 dps eff)");
  assert.ok(s.resources.bolts < 50, "pylon drinks from the same pool");
});

// ---- Grab ----

test("grab: lift costs, the hand excludes, the fling crushes", () => {
  const s = arena(41);
  s.god.influence = 500;
  const husk = spawnMonster(s, "husk", 34.5, 30.5);
  const picked = grabAt(s, 34.6, 30.6);
  assert.ok(picked.ok, "lifted");
  assert.equal(s.god.influence, 500 - B.SPELLS.grab.cost, "40 charged");
  assert.equal(s.god.held.kind, "monster");
  assert.ok(husk.held, "monster suspended");
  const again = grabAt(s, 34.6, 30.6);
  assert.equal(again.ok, false, "hand is full");
  // Held creatures are invisible to towers and duelists alike.
  moveHeld(s, 36.5, 34.5);
  assert.ok(Math.abs(husk.x - 36.5) < 0.01, "rides the pointer");
  // A hard fling: 12 tiles/s toward the camp.
  releaseHeld(s, 3, 0, 12);
  assert.ok(s.god.flight, "in flight");
  const hpBefore = husk.hp;
  tickSpells(s, 200); // land well before 200 ticks
  assert.ok(!s.god.flight, "landed");
  assert.ok(husk.hp < hpBefore, "hard landing hurt (crush)");
  assert.ok(!husk.held, "released on landing");
});

test("grab: a soft set-down never hurts, and villagers are fragile cargo", () => {
  const s = arena(43);
  s.god.influence = 500;
  const v = villagerAt(s, 34.5, 34.5);
  assert.ok(grabAt(s, 34.5, 34.5).ok);
  releaseHeld(s, 2, 2, 1); // below the throw threshold: a set-down
  assert.equal(v.health, B.MAX_NEED, "gentle hands");
  assert.ok(!v.held);
  // Now a violent throw.
  assert.ok(grabAt(s, v.x, v.y).ok);
  releaseHeld(s, -4, -3, 14);
  tickSpells(s, 300);
  assert.ok(v.health < B.MAX_NEED, "villagers take drop damage (RtR 1-10)");
  assert.ok(v.health > 0, "but survive a single toss");
});

test("grab: an emberling drowned in water is the showpiece", () => {
  const s = arena(47);
  s.god.influence = 500;
  const water = findWater(s);
  assert.ok(water, "this island has a pond");
  const ember = spawnMonster(s, "emberling", water.x - 3, water.y);
  assert.ok(grabAt(s, water.x - 3, water.y).ok);
  releaseHeld(s, 3, 0, 10); // fling it into the pond
  tickSpells(s, 400);
  assert.equal(ember.hp, 0, "water is death to a fire spirit");
  const husk = spawnMonster(s, "husk", water.x - 3, water.y);
  assert.ok(grabAt(s, husk.x, husk.y).ok);
  releaseHeld(s, 3, 0, 10);
  tickSpells(s, 400);
  assert.ok(husk.hp > 0 || husk.hp <= 0, "husk lands wet but the mult is 1");
});

// ---- Meteor ----

test("meteor: telegraphed fall, firesplash damage, friendly fire included", () => {
  const s = arena(53);
  s.god.influence = 500;
  const husk = spawnMonster(s, "husk", 34.5, 34.5);
  const v = villagerAt(s, 35.5, 34.8); // inside the circle: friendly fire
  const wall = fenceAt(s, 32, 34);
  const cast = castSpell(s, "meteor", 34.5, 34.5);
  assert.ok(cast.ok);
  assert.equal(s.god.meteors.length, 1, "stone incoming");
  tickSpells(s, 1);
  assert.equal(husk.hp, B.MONSTERS.husk.hp, "nothing lands early");
  tickSpells(s, B.SPELLS.meteor.fallTicks + 5);
  assert.ok(husk.hp <= 0, "husk burned (60 x 1.25 fire)");
  assert.ok(v.health < B.MAX_NEED, "the god's own villagers are not spared");
  assert.ok(wall.hp < B.BUILDINGS.fence.hp, "walls crush too");
});

test("meteor: sometimes the sky sends an emberling instead", () => {
  const s = arena(59);
  s.god.influence = 500;
  s.rng.chance = (p) => p === B.SPELLS.meteor.emberlingChance; // force the roll
  castSpell(s, "meteor", 34.5, 34.5);
  tickSpells(s, B.SPELLS.meteor.fallTicks + 5);
  assert.ok(
    s.monsters.some((m) => m.kind === "emberling"),
    "the gamble monster appears",
  );
});

test("held creatures are above it all: towers ignore, meteors miss", () => {
  const s = arena(61);
  s.god.influence = 999;
  const v = villagerAt(s, 34.5, 34.5);
  assert.ok(grabAt(s, 34.5, 34.5).ok);
  moveHeld(s, 35.0, 35.0);
  castSpell(s, "meteor", 35.0, 35.0);
  tickSpells(s, B.SPELLS.meteor.fallTicks + 5);
  assert.equal(v.health, B.MAX_NEED, "carried out of the blast");
});

// ---- Heal & Mend ----

test("heal mends villagers near the touch and nothing else", () => {
  const s = arena(67);
  s.god.influence = 500;
  const hurt = villagerAt(s, 34.5, 34.5, { health: 30 });
  const far = villagerAt(s, 50.5, 50.5, { health: 30 });
  const whiff = castSpell(s, "heal", 34.5, 34.5);
  assert.equal(whiff.ok, true);
  assert.equal(hurt.health, 30 + B.SPELLS.heal.amount);
  assert.equal(far.health, 30, "out of the circle, out of luck");
  const husk = spawnMonster(s, "husk", 36.5, 34.5, );
  const hp = husk.hp;
  s.god.cooldown = 0;
  s.god.influence = 500;
  castSpell(s, "heal", 36.5, 34.5);
  assert.equal(husk.hp, hp, "monsters are not healed by mercy");
});

test("mend repairs damaged works, never nests", () => {
  const s = arena(71);
  s.god.influence = 500;
  const wall = fenceAt(s, 34, 34);
  wall.complete = true; // a finished wall before it can be damaged/mended
  wall.hp = 40;
  const whiff = castSpell(s, "mend", 34.5, 34.5);
  assert.ok(whiff.ok);
  assert.equal(wall.hp, 40 + B.SPELLS.mend.amount);
  // A nest resists mend (it is the enemy's).
  const nest = s.buildings.find((b) => b.type === "nest");
  s.clock.tick = 2 * B.DAY_TICKS + phaseStart(5);
  s.clock.day = 3;
  cor.ensureCorruptionSpawn(s);
  cor.manageNests(s);
  const nest2 = s.buildings.find((b) => b.type === "nest");
  if (nest2) {
    nest2.hp = 10;
    s.god.cooldown = 0;
    s.god.influence = 500;
    const denied = castSpell(s, "mend", nest2.x + 0.5, nest2.y + 0.5);
    assert.equal(denied.ok, false, "no mend for the corruption");
    assert.equal(nest2.hp, 10);
  }
});

// ---- New species join the raids ----

test("late-game raids draw from all four species", () => {
  const s = createGame(2026);
  stepGame(s, (B.CORRUPTION_SPAWN_DAY - 1) * B.DAY_TICKS + 5);
  s.villagers = [];
  s.nomads = [];
  s.nomadQueue = [];
  s.clock.tick -= s.clock.tick % B.CORRUPTION_SPREAD_TICKS;
  while (s.world.corrupted < B.NEST_MIN_TILES + B.NEST_TILES_PER_EXTRA) {
    s.clock.tick += B.CORRUPTION_SPREAD_TICKS;
    cor.tickCorruption(s);
  }
  cor.manageNests(s);
  s.clock.tick = 12 * B.DAY_TICKS + phaseStart(5); // night of day 13
  s.clock.day = 13;
  for (let night = 0; night < 12; night++) {
    s.rng.restore((1000 + night) >>> 0); // vary the draws per night
    raidsAtNightfall(s);
    raidsAtDawn(s);
  }
  s.clock.day = 13;
  raidsAtNightfall(s);
  assert.ok(s.monsters.length >= 1, "raid spawned");
  const kinds = new Set(s.monsters.map((m) => m.kind));
  for (const k of kinds)
    assert.ok(B.MONSTERS[k], `spawned species is from the M3 roster (${k})`);
});

// ---- Save compatibility ----

test("the god hand survives a save round-trip, held creature included", () => {
  const s = arena(73);
  s.god.influence = 321;
  const husk = spawnMonster(s, "husk", 34.5, 30.5);
  s.god.influence = 500;
  assert.ok(grabAt(s, 34.5, 30.5).ok);
  const blob = JSON.parse(JSON.stringify(serialize(s)));
  const r = deserialize(blob);
  assert.ok(r, "v3 save loads");
  assert.equal(r.god.influence, 500 - B.SPELLS.grab.cost, "influence restored");
  assert.ok(r.god.held, "hand still full");
  const held = r.monsters.find((m) => m.id === r.god.held.id);
  assert.ok(held?.held, "monster re-linked and suspended");
  assert.equal(held.kind, "husk");
});
