// M4 faith (doc 03 sections 1.4 + 5.3): a per-villager need that scales
// their influence contribution, fed by prayer and witnessed miracles,
// drained by witnessed deaths and a careless god's hand.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame, placeBuilding } from "./game.js";
import { faithPulse, killVillager, createVillager } from "./villager.js";
import { influenceMax, castSpell, grabAt, tickSpells, releaseHeld } from "./spells.js";
import { damageMonster } from "./monsters.js";
import * as bd from "./buildings.js";
import * as B from "./balance.js";

function arena(seed = 5500) {
  const s = createGame(seed);
  s.villagers = [];
  s.nomads = [];
  s.nomadQueue = [];
  s.monsters = [];
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

test("villagers start believing and faith slowly decays", () => {
  const s = arena();
  const v = createVillager(s, 36.5, 36.5);
  assert.equal(v.faith, B.FAITH_START);
  stepGame(s, B.DAY_TICKS); // a day passes: needs tick, faith drifts down
  assert.ok(v.faith < B.FAITH_START, `decayed (got ${v.faith})`);
  assert.ok(v.faith > B.FAITH_START - 10, "but only gently");
});

test("faithPulse reaches witnesses only, clamps, and can skip one", () => {
  const s = arena();
  const near = createVillager(s, 36.5, 36.5);
  const near2 = createVillager(s, 37.5, 37.5);
  const far = createVillager(s, 60.5, 60.5);
  faithPulse(s, 36, 36, 10, 9, near.id);
  assert.equal(near.faith, B.FAITH_START, "the excepted villager is untouched");
  assert.equal(near2.faith, B.FAITH_START + 10, "nearby witness believes more");
  assert.equal(far.faith, B.FAITH_START, "out of sight, out of faith");
  near2.faith = 99;
  faithPulse(s, 37, 37, 50);
  assert.equal(near2.faith, B.MAX_NEED, "clamped at the sky");
  near2.faith = 2;
  faithPulse(s, 37, 37, -50);
  assert.equal(near2.faith, 0, "clamped at the floor");
});

test("witnessing a villager's fall shakes the believers", () => {
  const s = arena();
  const victim = createVillager(s, 36.5, 36.5);
  const witness = createVillager(s, 37.5, 37.5);
  killVillager(s, victim, "raiders");
  assert.equal(
    witness.faith,
    B.FAITH_START + B.WITNESS_DEATH_FAITH,
    "the neighbor saw everything",
  );
});

test("witnessing a monster fall strengthens the believers", () => {
  const s = arena();
  const witness = createVillager(s, 36.5, 36.5);
  const m = { id: s.nextId++, kind: "husk", x: 36.5, y: 36.5, hp: 30, path: [], pathI: 0, attackCd: 0, chewCd: 0, repathAt: 0, facing: 1 };
  s.monsters.push(m);
  damageMonster(s, m, 999, "crush");
  assert.equal(witness.faith, B.FAITH_START + B.WITNESS_KILL_FAITH);
});

test("influence maximum is what the village believes you're worth", () => {
  const s = arena();
  for (let i = 0; i < 5; i++) createVillager(s, 34 + i, 34);
  const half = 5 * B.INFLUENCE_PER_ADULT * 0.5;
  for (const v of s.villagers) v.faith = 50;
  assert.equal(influenceMax(s), Math.round(half), "50% faith = 50% of potential (Update 2 rule)");
  for (const v of s.villagers) v.faith = 100;
  assert.equal(influenceMax(s), 5 * B.INFLUENCE_PER_ADULT, "full belief, full purse");
  for (const v of s.villagers) v.faith = 0;
  assert.equal(influenceMax(s), 0, "a faithless village is a poor god");
});

test("healing raises the healed's faith; being grabbed lowers it", () => {
  const s = arena();
  s.god.influence = 9999;
  const hurt = createVillager(s, 36.5, 36.5);
  hurt.health = 30;
  hurt.faith = 50;
  const r = castSpell(s, "heal", hurt.x, hurt.y);
  assert.ok(r.ok, r.reason);
  assert.equal(hurt.faith, 50 + B.HEAL_FAITH, "a visible miracle is a sermon");
  s.god.cooldown = 0; // the hand recharges between miracles in this test
  const grabbed = createVillager(s, 38.5, 36.5);
  grabbed.faith = 50;
  const g = grabAt(s, grabbed.x, grabbed.y);
  assert.ok(g.ok, g.reason);
  assert.equal(grabbed.faith, 50 + B.GRAB_VILLAGER_FAITH, "being plucked skyward unnerves");
  releaseQuietly(s, grabbed);
});

test("occultists pray at the shrine: faith rises and influence flows", () => {
  const s = arena(5511);
  finish(s, "shrine", 33, 33);
  const zealot = createVillager(s, 34.5, 34.5);
  zealot.faith = 40;
  s.jobCounts = { occultist: 1 };
  // Self-hire happens in decide(); a couple of days covers walk + rites.
  const influenceBefore = s.god.influence;
  const faithBefore = zealot.faith;
  stepGame(s, Math.floor(B.DAY_TICKS * 1.5));
  assert.equal(zealot.job, "occultist", "the shrine hires");
  assert.ok(s.god.influence > influenceBefore, `rites piped influence (got +${s.god.influence - influenceBefore})`);
  assert.ok(zealot.faith > faithBefore, `prayer restored belief (got ${zealot.faith})`);
});

// Put a held creature down without throwing (test hygiene).
function releaseQuietly(s, v) {
  releaseHeld(s, 0, 0);
  v.held = false;
}

test("influence never sits above what the village believes you're worth", () => {
  const s = arena();
  const v = createVillager(s, 36.5, 36.5);
  v.faith = 10;
  const max = influenceMax(s);
  s.god.influence = max + 100; // a burst of rites from richer times
  tickSpells(s, 600);
  assert.ok(s.god.influence <= max, `capped at belief (max ${max}, got ${s.god.influence})`);
});
