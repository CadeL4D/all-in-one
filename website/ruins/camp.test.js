// M4 "The climb" — the town-center ladder (doc 02 section 3, compressed to
// 8 tiers): upgrade flow, the build limit as the content gate, and the
// work-speed/nomad bonuses each rung hands out.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame, placeBuilding, upgradeCamp } from "./game.js";
import * as bd from "./buildings.js";
import * as B from "./balance.js";

function campOf(s) {
  return s.buildings.find((b) => b.type === "camp");
}

// A quiet arena: villagers cleared (we drive builders explicitly).
function arena(seed = 4400) {
  const s = createGame(seed);
  s.villagers = [];
  s.nomads = [];
  s.nomadQueue = [];
  return s;
}

test("the tier ladder is coherent and ascending", () => {
  assert.equal(B.CAMP_TIERS.length, 8, "8-tier mobile ladder");
  for (let i = 1; i < B.CAMP_TIERS.length; i++) {
    const a = B.CAMP_TIERS[i - 1],
      b = B.CAMP_TIERS[i];
    assert.ok(b.buildLimit > a.buildLimit, `buildLimit ascends at ${i + 1}`);
    assert.ok(b.storage > a.storage, `storage ascends at ${i + 1}`);
    assert.ok(b.hp > a.hp, `hp ascends at ${i + 1}`);
    assert.ok(b.radius >= a.radius, `radius ascends at ${i + 1}`);
    assert.ok(b.builders >= a.builders, `builders ascend at ${i + 1}`);
    assert.ok(b.workMult > a.workMult, `workMult ascends at ${i + 1}`);
    assert.ok(b.nomadMult > a.nomadMult, `nomadMult ascends at ${i + 1}`);
    for (const res of Object.keys(b.cost)) assert.ok(B.RESOURCES.includes(res), `${res} is real`);
  }
  assert.equal(B.CAMP_TIERS[0].cost.wood, 0, "the first camp is free");
});

test("camp stats come from the tier, not the static table", () => {
  const s = arena();
  const camp = campOf(s);
  assert.equal(bd.def(camp).storage, B.CAMP_TIERS[0].storage);
  assert.equal(bd.def(camp).jobs.builder, B.CAMP_TIERS[0].builders);
  camp.tier = 3;
  assert.equal(bd.def(camp).storage, B.CAMP_TIERS[2].storage);
  assert.equal(bd.def(camp).jobs.builder, B.CAMP_TIERS[2].builders);
  assert.equal(bd.def(camp).name, B.CAMP_TIERS[2].name);
  assert.equal(bd.campRange(s), B.CAMP_TIERS[2].radius);
  assert.ok(Math.abs(bd.workSpeedMult(s) - B.CAMP_TIERS[2].workMult) < 1e-9);
});

test("applyCampUpgrade applies the rung wholesale", () => {
  const s = arena();
  const camp = campOf(s);
  camp.upgrade = { toTier: 2, workNeeded: 100, workDone: 100 };
  const upgraded = bd.applyCampUpgrade(s);
  assert.equal(upgraded, camp);
  assert.equal(camp.tier, 2);
  assert.equal(camp.upgrade, null);
  assert.equal(camp.hp, B.CAMP_TIERS[1].hp, "the raise fully heals the camp");
  assert.equal(bd.buildLimit(s), B.CAMP_TIERS[1].buildLimit);
  const slots = bd.jobSlots(s);
  assert.equal(slots.builder, B.CAMP_TIERS[1].builders);
});

test("the build limit blocks buildings, never walls; nests never count", () => {
  const s = arena(4411);
  const limit = bd.buildLimit(s);
  assert.equal(limit, B.CAMP_TIERS[0].buildLimit);
  assert.equal(bd.countBuilt(s), 1, "the camp itself holds one slot");
  // Fill to limit-1 with wells inside camp range (camp already holds one).
  let placed = 0;
  outer: for (let r = 2; r < 12; r++)
    for (let a = 0; a < 40; a++) {
      const x = 36 + Math.round(Math.cos((a / 40) * 6.283) * r);
      const y = 36 + Math.round(Math.sin((a / 40) * 6.283) * r);
      if (!bd.canPlace(s, "well", x, y).ok) continue;
      placeBuilding(s, "well", x, y);
      placed++;
      if (placed >= limit - 2) break outer;
    }
  assert.equal(bd.countBuilt(s), limit - 1);
  const home = bd.canPlace(s, "home", 33, 33);
  assert.ok(home.ok, `last slot open: ${home.reason}`);
  placeBuilding(s, "home", 33, 33);
  assert.equal(bd.countBuilt(s), limit);
  const blocked = bd.canPlace(s, "well", 40, 40);
  assert.ok(!blocked.ok && /Build limit/.test(blocked.reason), `blocked by limit: ${blocked.reason}`);
  // Fences skip the limit check entirely: find any in-range tile and the
  // only remaining refusal reason would be occupancy, never the limit.
  let fenceSpot = null;
  outer2: for (let r = 2; r < 12; r++)
    for (let a = 0; a < 40; a++) {
      const x = 36 + Math.round(Math.cos((a / 40) * 6.283 + r * 0.7) * r);
      const y = 36 + Math.round(Math.sin((a / 40) * 6.283 + r * 0.7) * r);
      const chk = bd.canPlace(s, "fence", x, y);
      if (chk.ok) {
        fenceSpot = chk;
        break outer2;
      }
    }
  assert.ok(fenceSpot, "fences never count toward the limit (RtR rule)");
  // Corrupted buildings are the enemy's, not yours.
  const nest = bd.placeSite(s, "nest", 10, 10);
  nest.complete = true;
  assert.equal(bd.countBuilt(s), limit, "nests don't consume player slots");
});

test("builders raise the camp a tier from hauled materials", () => {
  const s = createGame(4422);
  s.resources.wood = 200;
  s.jobCounts = { builder: 4, farmer: 0, woodcutter: 0, stonecutter: 0 };
  const before = {
    storage: bd.storageCap(s),
    range: bd.campRange(s),
    mult: bd.workSpeedMult(s),
  };
  const started = upgradeCamp(s);
  assert.ok(started.ok, started.reason);
  const camp = campOf(s);
  assert.ok(camp.upgrade, "upgrade site opened");
  assert.equal(bd.nextMissingRes(camp), "wood", "tier 2 costs wood");
  // Enough ticks for 4 builders to haul 20 wood and hammer it in.
  stepGame(s, B.DAY_TICKS * 2);
  assert.equal(camp.tier, 2, `camp reached tier 2 (day ${s.clock.day})`);
  assert.ok(bd.storageCap(s) > before.storage);
  assert.ok(bd.campRange(s) > before.range);
  assert.ok(bd.workSpeedMult(s) > before.mult);
  assert.ok(s.events.some((e) => e.type === "camp-upgraded"), "the event fired");
});

test("upgrade is refused while one is in progress or at the top", () => {
  const s = arena();
  const camp = campOf(s);
  camp.upgrade = { toTier: 2, workNeeded: 10, workDone: 0 };
  assert.ok(!upgradeCamp(s).ok, "no double scaffold");
  camp.upgrade = null;
  camp.tier = B.CAMP_MAX_TIER;
  assert.ok(!upgradeCamp(s).ok, "the Stronghold is the last rung");
});
