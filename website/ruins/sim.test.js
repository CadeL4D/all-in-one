import test from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame, placeBuilding, setJobDesired } from "./game.js";
import { createGame as unused } from "./game.js"; // eslint keeps one import
import * as bd from "./buildings.js";
import { DAY_TICKS } from "./balance.js";

// The full village heartbeat: build the starter set, run days, and verify
// every loop the M1 acceptance names - growth, needs, hands-off work.
// The set includes a Sentry Tower since M2: night raids start on day 3 and
// the day-2 hint tells the village to raise one.
function village(seed) {
  const s = createGame(seed);
  s.jobCounts = { builder: 3, farmer: 3, woodcutter: 3 };
  const place = (type) => {
    for (let r = 2; r < 14; r++)
      for (let a = 0; a < 40; a++) {
        const x = 36 + Math.round(Math.cos((a / 40) * 6.283 + r * 0.7) * r) - 1;
        const y = 36 + Math.round(Math.sin((a / 40) * 6.283 + r * 0.7) * r) - 1;
        if (bd.canPlace(s, type, x, y).ok) {
          placeBuilding(s, type, x, y);
          return [x, y];
        }
      }
    return null;
  };
  for (const t of ["well", "farm", "sawpit", "home", "home", "tower"]) place(t);
  return s;
}

test("villagers build the starter set from hauled wood", () => {
  const s = village(4242);
  stepGame(s, DAY_TICKS * 3);
  const done = s.buildings.filter((b) => b.complete).length;
  assert.ok(done >= 5, `expected camp + 4 built, got ${done}`);
  for (const b of s.buildings)
    if (!b.complete) assert.ok(b.workDone > 0 || b.delivered > 0, "stalled site has progress");
});

test("needs loop: villagers eat, drink, and sleep without orders", () => {
  const s = village(777);
  stepGame(s, DAY_TICKS * 3);
  assert.ok(s.resources.food > 0 || s.villagers.every((v) => v.hunger > 10), "food economy alive");
  assert.ok(s.resources.water > 0, "well produced water");
  const acts = new Set(s.villagers.map((v) => v.activity));
  assert.ok(
    [...acts].some((a) => /Chopping|Harvesting|Planting|Building|Picking|Hauling/.test(a)),
    `nobody works: ${[...acts].join(", ")}`,
  );
});

test("population grows through nomads and births", () => {
  const s = village(777);
  const start = s.villagers.length;
  stepGame(s, DAY_TICKS * 6);
  assert.ok(s.villagers.length > start, "village grew");
  assert.ok(s.stats.died === 0 || s.villagers.length >= start, "collapse is possible but not from a healthy start");
});

test("no micromanagement: villagers self-assign to job headcounts", () => {
  const s = village(4242);
  stepGame(s, DAY_TICKS * 2);
  const slots = bd.jobSlots(s);
  for (const job of Object.keys(s.jobCounts)) {
    const employed = bd.employedCount(s, job);
    assert.ok(employed <= s.jobCounts[job], `${job} over desired headcount`);
    assert.ok(employed <= slots[job], `${job} over physical slots`);
  }
});

test("raising headcount hires idlers; lowering lays off", () => {
  const s = village(12345);
  stepGame(s, DAY_TICKS * 2);
  setJobDesired(s, "farmer", +3);
  assert.ok(bd.employedCount(s, "farmer") > 0, "farmers hired");
  const before = bd.employedCount(s, "farmer");
  setJobDesired(s, "farmer", -99);
  assert.equal(bd.employedCount(s, "farmer"), 0);
  assert.ok(before >= 0);
});

test("storage caps actually cap production", () => {
  const s = village(777);
  stepGame(s, DAY_TICKS * 4);
  assert.ok(s.resources.wood <= bd.storageCap(s) + 1, "wood respects cap");
  assert.ok(s.resources.water <= bd.storageCap(s) + 1, "water respects cap");
});

test("a neglected village does not survive (raids or starvation end it)", () => {
  const s = createGame(999);
  s.resources.food = 0;
  s.resources.water = 0;
  // No buildings placed: nothing to eat, nothing to defend with. In M2 the
  // unprotected nights usually arrive before hunger does - either way the
  // run ends well inside the window.
  stepGame(s, DAY_TICKS * 22);
  assert.ok(
    s.lost || s.stats.died > 0,
    `neglect has consequences (lost=${JSON.stringify(s.lost)}, died=${s.stats.died})`,
  );
});
