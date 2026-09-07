import test from "node:test";
import assert from "node:assert/strict";
import * as B from "./balance.js";

test("phases cover the whole day exactly once", () => {
  const total = B.PHASES.reduce((a, p) => a + p.fraction, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, "fractions must sum to 1");
  assert.equal(new Set(B.PHASES.map((p) => p.key)).size, B.PHASES.length);
  const keys = B.PHASES.map((p) => p.key);
  assert.deepEqual(keys.slice(-1), ["night"]);
});

test("a day is a 3-10 minute mobile session at default speed", () => {
  const realSeconds = B.DAY_TICKS / B.TICKS_PER_SECOND;
  const atDefault = realSeconds / B.DEFAULT_SPEED;
  assert.ok(atDefault >= 3 * 60 && atDefault <= 10 * 60, `default-speed day is ${atDefault}s`);
});

test("building definitions are coherent", () => {
  for (const [type, def] of Object.entries(B.BUILDINGS)) {
    assert.ok(def.size >= 1 && def.size <= 3, `${type} size`);
    assert.ok(def.hp > 0, `${type} hp`);
    assert.ok(def.storage >= 0 && def.radius >= 0, `${type} caps`);
    for (const res of Object.keys(def.cost)) assert.ok(B.RESOURCES.includes(res), `${type} cost resource`);
    for (const job of Object.keys(def.jobs)) assert.ok(B.JOBS[job], `${type} job ${job} exists`);
    if (type === "camp") assert.ok(def.radius > 0, "camp radiates the build range");
  }
  assert.ok(B.BUILDINGS.camp.jobs.builder > 0, "camp provides builders");
  for (const type of ["home", "farm", "well", "sawpit", "storehouse"])
    assert.ok(B.BUILDINGS[type], `M1 set includes ${type}`);
});

test("start fits inside the world clearing", () => {
  assert.ok(B.CAMP_TILE.x - B.CLEAR_RADIUS >= 1);
  assert.ok(B.CAMP_TILE.y + B.CLEAR_RADIUS <= B.MAP_SIZE - 2);
});

test("name pool is original and large enough", () => {
  assert.ok(new Set(B.NAMES).size === B.NAMES.length, "names unique");
  assert.ok(B.NAMES.length >= 24);
  for (const n of B.NAMES) assert.match(n, /^[A-Z][a-z]+$/, "plain fantasy names only");
});
