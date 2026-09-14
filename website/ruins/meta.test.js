// M5 meta layer (doc 01 section 5.2): god XP from play, the pick-cost
// ladder, three-boon choices, and GLOBAL persistence - perks outlive any
// one village (RtR: "progress in the form of perks persists"). Node has no
// localStorage, so these tests stub a slot to prove the round-trip that
// keeps meta alive across runs.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "./game.js";
import {
  addXp,
  createMeta,
  loadMeta,
  saveMeta,
  nextPickCost,
  perkRank,
  perkMult,
  rollPerkChoices,
  pickPerk,
  META_KEY,
} from "./meta.js";
import * as B from "./balance.js";

function arena(seed = 8100) {
  const s = createGame(seed);
  s.meta = createMeta(); // a fresh god: creation paid 3 xp for the camp
  s.events = []; // ...and logged a built event for it
  return s;
}

// Install a fake localStorage; returns the uninstaller.
function stubStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  return () => delete globalThis.localStorage;
}

test("xp from play banks picks on the 1.3x cost ladder", () => {
  const s = arena();
  assert.equal(nextPickCost(s.meta), B.XP_FIRST_PICK, "the first pick comes cheap");

  assert.equal(addXp(s, "founded"), B.PERK_XP.founded, "the action's worth is returned");
  addXp(s, "founded"); // 60 total: short of a pick
  assert.equal(s.meta.picks, 0);

  addXp(s, "cleared"); // 100 total: crosses the first rung
  assert.equal(s.meta.picks, 1, "one pick banked");
  assert.equal(s.meta.spent, B.XP_FIRST_PICK, "the rung's cost is consumed");
  assert.equal(s.meta.granted, 1);
  assert.equal(
    nextPickCost(s.meta),
    Math.round(B.XP_FIRST_PICK * B.XP_PICK_GROWTH),
    "the next rung is 30% steeper",
  );
  assert.deepEqual(s.events.at(-1), { type: "perk-earned", count: 1, picks: 1 });

  // Leftover xp (20) carries toward the next rung, never leaks away.
  addXp(s, "cleared"); // 140 total: 40 banked toward the 104 rung
  assert.equal(s.meta.picks, 1);
  assert.equal(s.meta.xp, 140);
});

test("a windfall banks several picks at once, rung by rung", () => {
  const s = arena();
  // 5 clears = 200 xp: buys the 80 rung and the 104 rung, 16 left over.
  addXp(s, "cleared", 5);
  assert.equal(s.meta.picks, 2);
  assert.equal(s.meta.granted, 2);
  assert.equal(s.meta.spent, B.XP_FIRST_PICK + Math.round(B.XP_FIRST_PICK * B.XP_PICK_GROWTH));
  assert.equal(s.meta.xp - s.meta.spent, 16);
  assert.deepEqual(s.events.at(-1), { type: "perk-earned", count: 2, picks: 2 });
});

test("unknown keys pay nothing", () => {
  const s = arena();
  assert.equal(addXp(s, "not-a-thing"), 0);
  assert.equal(s.meta.xp, 0);
  assert.equal(s.meta.picks, 0);
  assert.equal(s.events.length, 0);
});

test("perk ranks read through one multiplier", () => {
  const s = arena();
  assert.equal(perkRank(s, "work"), 0);
  assert.equal(perkMult(s, "work", 0.1), 1, "no rank, no effect");
  s.meta.perks.work = 2;
  assert.equal(perkRank(s, "work"), 2);
  assert.ok(Math.abs(perkMult(s, "work", 0.1) - 1.2) < 1e-9);
  // A state with no meta yet reads as rank 0, not a crash.
  assert.equal(perkRank({ meta: null }, "work"), 0);
  assert.equal(perkMult({ meta: null }, "work", 0.1), 1);
});

test("boon choices are distinct and never mastered", () => {
  const s = arena();
  for (const k of Object.keys(B.PERKS)) s.meta.perks[k] = B.PERKS[k].maxRank;
  // Only two boons have room left: the pool has run dry.
  s.meta.perks.work = B.PERKS.work.maxRank - 1;
  s.meta.perks.water = B.PERKS.water.maxRank - 1;
  const choices = rollPerkChoices(s, s.rng);
  assert.deepEqual([...choices].sort(), ["water", "work"]);

  // A healthy pool offers exactly PERK_CHOICES distinct real boons.
  s.meta = createMeta();
  const fresh = rollPerkChoices(s, s.rng);
  assert.equal(fresh.length, B.PERK_CHOICES);
  assert.equal(new Set(fresh).size, B.PERK_CHOICES, "no duplicate offers");
  for (const k of fresh) assert.ok(B.PERKS[k], "every offer is a real boon");
});

test("picking a boon stamps the rank and spends the pick", () => {
  const s = arena();
  s.meta.picks = 1;
  const r = pickPerk(s, "work");
  assert.ok(r.ok, r.reason);
  assert.equal(r.rank, 1);
  assert.equal(s.meta.picks, 0);
  assert.equal(perkRank(s, "work"), 1);
  assert.equal(s.events.at(-1).type, "perk-picked");

  // The refusal paths cost nothing.
  assert.equal(pickPerk(s, "work").ok, false, "nothing banked to spend");
  s.meta.picks = 1;
  assert.equal(pickPerk(s, "nope").ok, false, "unknown boon");
  s.meta.perks.ward = B.PERKS.ward.maxRank;
  assert.equal(pickPerk(s, "ward").ok, false, "already mastered");
  assert.equal(s.meta.picks, 1, "refusals refund the pick");
});

test("meta is a global slot: it outlives the save and the village", () => {
  const undo = stubStorage();
  try {
    const meta = createMeta();
    meta.xp = 500;
    meta.picks = 2;
    meta.perks.towers = 2;
    saveMeta(meta);
    const loaded = loadMeta();
    assert.equal(loaded.picks, 2);
    assert.equal(loaded.perks.towers, 2);

    // A brand-new world starts owning what the last run earned.
    const s = createGame(4242);
    assert.equal(perkRank(s, "towers"), 2, "perks carried into a fresh village");

    // A pick is stamped into the slot the moment it's claimed.
    s.meta.picks = 1;
    assert.ok(pickPerk(s, "faith").ok);
    assert.equal(loadMeta().perks.faith, 1, "the slot saw the pick at once");

    // A broken slot is a fresh god, not a crash.
    globalThis.localStorage.setItem(META_KEY, "{oops");
    assert.deepEqual(loadMeta().perks, {});
    assert.equal(loadMeta().xp, 0);
  } finally {
    undo();
  }
});
