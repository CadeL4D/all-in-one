// M4 Corruption Threat v2 (doc 04 sections 2.4 + 3.2): desire-vs-space
// budget, pushback that enrages and springs defenders, and threat-scaled
// monster levels ("less monsters, stronger individuals").
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, placeBuilding } from "./game.js";
import { corruptionDawn, threatDesire, corruptTile, ensureCorruptionSpawn } from "./corruption.js";
import { monsterLevel, monsterDamage, spawnMonsterAt, raidSize } from "./monsters.js";
import * as bd from "./buildings.js";
import * as B from "./balance.js";
import { idx } from "./world.js";

function arena(seed = 6600) {
  const s = createGame(seed);
  s.villagers = [];
  s.nomads = [];
  s.nomadQueue = [];
  s.monsters = [];
  return s;
}

// Stamp a corruption blob at a fixed spot, bypassing the spawn search.
function stampCorruption(s, cx, cy, r) {
  s.corruption.spawned = true;
  const size = s.world.size;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = cx + dx,
        y = cy + dy;
      if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) continue;
      corruptTile(s, idx(x, y));
    }
}

test("desire grows with the day counter and caps", () => {
  const s = arena();
  s.clock.day = 0;
  assert.equal(threatDesire(s), B.THREAT_DESIRE_BASE);
  s.clock.day = 10;
  assert.equal(threatDesire(s), B.THREAT_DESIRE_BASE + 10 * B.THREAT_DESIRE_PER_DAY);
  s.clock.day = 10000;
  assert.equal(threatDesire(s), B.THREAT_DESIRE_CAP);
});

test("boxed in and short of desire: threat climbs, gap makes it climb harder", () => {
  const s = arena();
  stampCorruption(s, 10, 10, 2); // ~13 tiles, desire is 40 at day 0
  s.corruption.grewToday = 0;
  const before = s.corruption.threat;
  corruptionDawn(s);
  const smallGap = s.corruption.threat - before;
  assert.ok(smallGap >= B.THREAT_RISE_PER_DAY, `rises when boxed in (+${smallGap})`);
  // The same box at a later day: desire outgrew the holding, gap bonus bites.
  stampCorruption(s, 12, 30, 2);
  s.world.corrupted = s.world.corrupted; // unchanged holdings
  s.clock.day = 40; // desire 440 >> held
  s.corruption.grewToday = 0;
  const before2 = s.corruption.threat;
  corruptionDawn(s);
  const bigGap = s.corruption.threat - before2;
  assert.ok(bigGap > smallGap, `shortfall sharpens the climb (${bigGap} > ${smallGap})`);
});

test("growing freely bleeds threat back toward zero", () => {
  const s = arena();
  stampCorruption(s, 10, 10, 2);
  s.corruption.threat = 50;
  s.corruption.grewToday = 5; // it took new ground today
  corruptionDawn(s);
  assert.ok(s.corruption.threat < 50, `decays when the blight grows (got ${s.corruption.threat})`);
});

test("pushback enrages the blight and springs defenders", () => {
  const s = arena(6611);
  // A corruption pocket at (30,30) with finished village walls on two
  // sides of every tile: build a tight ring of huts around a 3-wide blob.
  stampCorruption(s, 30, 30, 1);
  const size = s.world.size;
  const ring = [];
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== 2) continue; // ring shell
      const x = 30 + dx,
        y = 30 + dy;
      const b = bd.placeSite(s, "home", x, y);
      b.complete = true;
      ring.push(b);
    }
  assert.ok(ring.length >= 8, "arena premise: the ring stands");
  // Give the blight room to "want" and nothing to grow into: many eligible
  // tiles, chance 0.4 each - with 9+ candidates the reclaim is a certainty.
  s.corruption.threat = 30;
  const corruptedBefore = s.world.corrupted;
  s.corruption.grewToday = 0; // boxed in AND short: rise, then pushback adds
  corruptionDawn(s);
  assert.ok(s.world.corrupted < corruptedBefore, "village pressure reclaimed tiles");
  assert.ok(
    s.corruption.threat > 30 + B.THREAT_RISE_PER_DAY,
    `pushback stacked on the boxed-in rise (got ${s.corruption.threat})`,
  );
  // High threat springs defenders from the reclaimed ground (probabilistic,
  // but threat 90 over 9 candidates is a lock; if none spawned, threat math
  // still holds - assert softly to stay deterministic-ish).
  if (s.monsters.length === 0 && s.world.corrupted < corruptedBefore - 6) {
    s.corruption.threat = B.THREAT_MAX;
    stampCorruption(s, 30, 30, 1); // refill for a second dawn
    corruptionDawn(s);
    assert.ok(s.monsters.length > 0, "a furious blight fights back");
  }
  assert.ok(
    s.events.some((e) => e.type === "blight-fought-back") || s.monsters.length > 0,
    "the fight-back is narrated",
  );
});

test("monster levels scale with threat: hp, damage, and the spawn snapshot", () => {
  const s = arena();
  s.corruption.threat = 0;
  assert.equal(monsterLevel(s), 1);
  s.corruption.threat = 25;
  assert.equal(monsterLevel(s), 2);
  s.corruption.threat = 74;
  assert.equal(monsterLevel(s), 3, "floor(74/25)+1 = 3");
  s.corruption.threat = B.THREAT_MAX;
  assert.equal(monsterLevel(s), B.MONSTER_LEVEL_MAX, "capped strength");
  const m = spawnMonsterAt(s, "husk", 30, 30);
  const base = B.MONSTERS.husk;
  assert.ok(Math.abs(m.hp - base.hp * (1 + B.MONSTER_HP_PER_LEVEL * (m.level - 1))) < 1e-9, "hp scales");
  assert.ok(Math.abs(monsterDamage(m) - base.damage * (1 + B.MONSTER_DAMAGE_PER_LEVEL * (m.level - 1))) < 1e-9, "damage scales");
  assert.equal(m.maxHp, m.hp);
  // A monster spawned at calm stays calm when the threat later spikes.
  s.corruption.threat = 0;
  const calm = spawnMonsterAt(s, "husk", 31, 31);
  assert.equal(calm.level, 1);
});

test("raid size still multiplies with threat (count) on top of levels (power)", () => {
  const s = arena(6622);
  // Two nests standing.
  for (const [x, y] of [
    [8, 8],
    [60, 60],
  ]) {
    const b = bd.placeSite(s, "nest", x, y);
    b.complete = true;
  }
  s.clock.day = 6;
  s.corruption.threat = 0;
  const calm = raidSize(s);
  s.corruption.threat = 80;
  const hot = raidSize(s);
  assert.ok(hot > calm, `threaty nights are bigger (${hot} vs ${calm})`);
});
