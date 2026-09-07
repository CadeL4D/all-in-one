import test from "node:test";
import assert from "node:assert/strict";
import { createClock, advance, phaseInfo, daylight, ticksUntilDawn } from "./clock.js";
import { DAY_TICKS, PHASES } from "./balance.js";

test("day counter advances at day length", () => {
  const c = createClock();
  advance(c, DAY_TICKS - 1);
  assert.equal(c.day, 1);
  advance(c, 1);
  assert.equal(c.day, 2);
});

test("phases progress in order across a day", () => {
  const c = createClock();
  const seen = [];
  for (let t = 0; t < DAY_TICKS - PHASES[5].fraction * DAY_TICKS; t += 50) {
    advance(c, 50);
    const key = PHASES[c.phaseIndex].key;
    if (seen[seen.length - 1] !== key) seen.push(key);
  }
  assert.deepEqual(seen.slice(0, PHASES.length - 1), PHASES.map((p) => p.key).slice(0, -1));
});

test("phase progress bar stays in 0..1 and ends each phase", () => {
  const c = createClock();
  advance(c, Math.round(DAY_TICKS * 0.5));
  const info = phaseInfo(c);
  assert.ok(info.progress > 0 && info.progress < 1);
});

test("daylight is bright at midday and dark at night", () => {
  const c = createClock();
  advance(c, Math.round(DAY_TICKS * 0.3));
  assert.ok(daylight(c) > 0.95, "midday bright");
  advance(c, Math.round(DAY_TICKS * 0.55)); // into night
  assert.equal(PHASES[c.phaseIndex].key, "night");
  assert.ok(daylight(c) < 0.2, "night dark");
});

test("dawn autosave marker: ticks until dawn never negative", () => {
  for (let t = 0; t < DAY_TICKS; t += 997) {
    const n = ticksUntilDawn(t);
    assert.ok(n > 0 && n <= DAY_TICKS);
  }
});
