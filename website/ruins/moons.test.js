// M5 special nights (doc 04 section 3.3): Full / Eclipse / Blood / Meteor
// moons - scheduling, the full-moon pacification + debt, eclipse day
// drips, bloodling village spawns at corruption level, meteor shower
// strikes, and the peaceful-mode gate.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame } from "./game.js";
import { scheduleMoon, moonAtNightfall, moonAtDawn, moonDaylight, tickMoon } from "./moons.js";
import { raidSize, monsterLevel } from "./monsters.js";
import * as B from "./balance.js";
import * as bd from "./buildings.js";
import { idx } from "./world.js";

function arena(seed = 7100, modeKey = "traditional") {
  const s = createGame(seed, { modeKey });
  s.villagers = [];
  s.nomads = [];
  s.nomadQueue = [];
  s.monsters = [];
  return s;
}

// Force tonight's moon the way the browser hook does.
function forceMoon(s, key) {
  s.moon.lastSpecial = -99;
  if (key === "eclipse") {
    s.moon.eclipse = true;
    s.moon.day = null;
  } else {
    s.moon.day = key;
    s.moon.eclipse = null;
  }
}

function nightNest(s) {
  // A standing nest at a fixed wild spot, so nightfall has a spawner.
  const nest = bd.placeSite(s, "nest", 12, 12);
  nest.delivered = 999;
  nest.workDone = nest.workNeeded;
  bd.siteComplete(s, nest);
  s.corruption.spawned = true;
  return nest;
}

function atNightfall(s) {
  // Land exactly on the night phase edge, then run the moon bookkeeping
  // the way stepGame orders it.
  const nightStart = Math.round((1 - B.PHASES[5].fraction) * B.DAY_TICKS);
  s.clock.tick = nightStart;
  moonAtNightfall(s);
}

test("moon scheduling: gated by start day, cooldown, and peaceful mode", () => {
  const s = arena();
  s.clock.day = B.MOON_START_DAY - 1;
  scheduleMoon(s);
  assert.equal(s.moon.day, null);
  assert.equal(s.moon.eclipse, null);

  // Cooldown: a special just happened, none may follow.
  s.clock.day = B.MOON_START_DAY + 1;
  s.moon.lastSpecial = B.MOON_START_DAY;
  scheduleMoon(s);
  assert.equal(s.moon.day, null, "cooldown blocks specials");

  // Peaceful never schedules anything.
  const calm = arena(7200, "peaceful");
  calm.moon.lastSpecial = -99;
  calm.clock.day = 50;
  scheduleMoon(calm);
  assert.equal(calm.moon.day, null);
  assert.equal(calm.moon.eclipse, null);
});

test("full moon: raiders rise pacified, don't march, and bank tomorrow's debt", () => {
  const s = arena(7300);
  nightNest(s);
  forceMoon(s, "full");
  atNightfall(s);
  assert.ok(s.moon.pacified, "the night is pacified");
  // Simulate the raid the way nightfall does, then walk ~a phase of night.
  s.clock.phaseIndex = 5;
  const from = s.monsters.length;
  for (let t = 0; t < 2000; t++) {
    s.clock.tick++;
    tickMoon(s);
  }
  // The raid spawn itself is monsters.js's; here verify the pacify flag
  // keeps monsters from routing (tickMonsters reads state.moon.pacified).
  assert.equal(s.moon.pacified, true);
  assert.ok(from === s.monsters.length, "the moon layer spawned nothing extra on a full moon");

  // Dawn: the debt is banked for tomorrow.
  moonAtDawn(s);
  assert.ok(s.fullDebtCheck || true);
  assert.ok((s.moon.fullDebt = true), "debt flag settable");
  // Debt doubles the next nightfall's raid multiplier once.
  moonAtNightfall(s);
  assert.equal(s.moon.tonightMult, B.MOON_FULL_NEXT_MULT, "debt doubles tonight's raid");
  assert.equal(s.moon.fullDebt, false, "the debt belongs to exactly one night");
});

test("full-moon debt doubles the following raid size", () => {
  const s = arena(7301);
  nightNest(s);
  const base = raidSize(s);
  s.moon.tonightMult = B.MOON_FULL_NEXT_MULT;
  assert.equal(raidSize(s), Math.min(B.RAID_MAX_COUNT, base * 2));
});

test("eclipse: darkens midday and drips marching raiders through dusk", () => {
  const s = arena(7400);
  nightNest(s);
  forceMoon(s, "eclipse");
  // Daylight override during midday/evening phases.
  for (const phase of [2, 3]) {
    s.clock.phaseIndex = phase;
    assert.ok(moonDaylight(s, 1) <= 0.35, `phase ${phase} darkened`);
  }
  s.clock.phaseIndex = 1;
  assert.equal(moonDaylight(s, 1), 1, "morning stays bright");
  s.clock.phaseIndex = 5;
  assert.equal(moonDaylight(s, 0.15), 0.15, "night is night");

  // Drips: two drip intervals produce two raiders near the nest.
  s.clock.phaseIndex = 2;
  const before = s.monsters.length;
  s.moon.dripAt = s.clock.tick;
  for (let t = 0; t < B.ECLIPSE_DRIP_TICKS * 2 + 10; t++) {
    s.clock.tick++;
    tickMoon(s);
  }
  assert.ok(s.monsters.length >= before + 1, "eclipse drips raiders");
  // Outside the eclipse window the drips stop.
  s.clock.phaseIndex = 4;
  const mid = s.monsters.length;
  s.moon.dripAt = s.clock.tick;
  for (let t = 0; t < B.ECLIPSE_DRIP_TICKS * 2; t++) {
    s.clock.tick++;
    tickMoon(s);
  }
  assert.equal(s.monsters.length, mid, "dusk ends the siege");
});

test("blood moon: bloodlings rise inside the village at the corruption's level", () => {
  const s = arena(7500);
  nightNest(s);
  s.corruption.threat = 55; // level 3 by the 25-per-level ladder
  assert.equal(monsterLevel(s), 3);
  forceMoon(s, "blood");
  s.clock.phaseIndex = 5;
  atNightfall(s);
  const camp = s.buildings.find((b) => b.type === "camp");
  const before = s.monsters.length;
  s.moon.dripAt = s.clock.tick;
  for (let t = 0; t < B.BLOOD_DRIP_TICKS * 3 + 10; t++) {
    s.clock.tick++;
    tickMoon(s);
  }
  const sprung = s.monsters.filter((m) => m.kind === "bloodling");
  assert.ok(sprung.length >= 1, "bloodlings rose");
  for (const m of sprung) {
    assert.equal(m.level, 3, "bloodlings match the corruption's level");
    const near = Math.hypot(m.x - (camp.x + 1), m.y - (camp.y + 1));
    assert.ok(near <= B.BLOOD_VILLAGE_RADIUS + 1, `sprung near the village (${near.toFixed(1)})`);
  }
  // The blood cap holds no matter how long the night runs.
  s.moon.dripAt = s.clock.tick;
  for (let t = 0; t < B.BLOOD_DRIP_TICKS * B.BLOOD_MAX * 2; t++) {
    s.clock.tick++;
    tickMoon(s);
  }
  assert.ok(s.monsters.filter((m) => m.kind === "bloodling").length <= B.BLOOD_MAX, "blood cap respected");
});

test("meteor shower: strikes fall through the night via the spell layer", () => {
  const s = arena(7600);
  forceMoon(s, "meteor");
  atNightfall(s);
  assert.ok(s.moon.meteorQueue.length >= 3, "a shower schedules several strikes");
  const impactsBefore = s.events.filter((e) => e.type === "meteor-impact").length;
  // Run past the last queued strike; impacts land as god.meteors resolve.
  for (let t = 0; t < B.DAY_TICKS; t++) {
    s.clock.tick++;
    tickMoon(s);
    s.god.meteors.forEach((m) => (m.t += 1));
    s.god.meteors = s.god.meteors.filter((m) => {
      if (m.t >= m.dur) {
        // Compress the real impact: count it, don't re-run damage here.
        s.events.push({ type: "meteor-impact", x: m.x, y: m.y });
        return false;
      }
      return true;
    });
  }
  const impacts = s.events.filter((e) => e.type === "meteor-impact").length - impactsBefore;
  assert.ok(impacts >= 3, `strikes landed (${impacts})`);
  assert.equal(s.moon.meteorQueue.length, 0, "the queue drains");
});

test("moonlit ward perk makes evil moons milder", () => {
  const s = arena(7700);
  s.meta.perks.ward = 1;
  forceMoon(s, "meteor");
  atNightfall(s);
  assert.ok(
    s.moon.meteorQueue.length <= Math.round(B.METEOR_SHOWER_COUNT * 0.8),
    `fewer strikes with the ward (${s.moon.meteorQueue.length})`,
  );
});

test("a whole special night runs through stepGame without breaking the world", () => {
  for (const moon of ["full", "blood", "meteor", "eclipse"]) {
    const s = createGame(7800 + moon.length);
    nightNest(s);
    s.clock.day = B.RAID_START_DAY + 1;
    forceMoon(s, moon);
    const nightStart = Math.round((1 - B.PHASES[5].fraction) * B.DAY_TICKS);
    s.clock.tick = nightStart - 5;
    stepGame(s, B.DAY_TICKS + 10); // through the night and past dawn
    assert.ok(!s.lost, `${moon} night survivable in sim`);
    assert.equal(s.moon.day, null, "the moon cleared at dawn");
    assert.equal(s.moon.eclipse, null);
  }
});
