import test from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame } from "./game.js";
import { serialize, deserialize, SAVE_VERSION } from "./save.js";
import { DAY_TICKS } from "./balance.js";

test("save round-trip preserves the world exactly", () => {
  const s = createGame(31415);
  stepGame(s, DAY_TICKS + 5000);
  const data = JSON.parse(JSON.stringify(serialize(s)));
  const restored = deserialize(data);
  assert.ok(restored, "deserialize succeeds");
  assert.equal(restored.clock.tick, s.clock.tick);
  assert.equal(restored.villagers.length, s.villagers.length);
  assert.equal(restored.buildings.length, s.buildings.length);
  assert.deepEqual([...restored.world.terrain], [...s.world.terrain]);
  assert.deepEqual([...restored.world.feature], [...s.world.feature]);
  assert.deepEqual(
    Object.values(restored.resources).map(Math.floor),
    Object.values(s.resources).map(Math.floor),
  );
});

test("resumed sim stays deterministic (same seed + rng state)", () => {
  const a = createGame(2718);
  stepGame(a, 9000);
  const blob = serialize(a);
  const b = deserialize(JSON.parse(JSON.stringify(blob)));
  assert.ok(b);
  stepGame(a, 12000);
  stepGame(b, 12000);
  assert.equal(a.clock.tick, b.clock.tick);
  assert.equal(Math.floor(a.resources.wood), Math.floor(b.resources.wood));
  assert.equal(a.villagers.length, b.villagers.length);
  assert.equal(
    a.villagers.map((v) => v.name).join(","),
    b.villagers.map((v) => v.name).join(","),
  );
});

test("old or corrupt saves are rejected (v2 islands migrate in)", () => {
  assert.equal(deserialize(null), null);
  assert.equal(deserialize({}), null);
  assert.equal(deserialize({ v: SAVE_VERSION }), null, "right version, no payload");
  assert.equal(deserialize({ v: SAVE_VERSION + 1 }), null, "from the future");
  // A real v2 blob (an M2 island) loads fine - it just starts godless.
  const s = createGame(99);
  stepGame(s, 3000);
  const blob = JSON.parse(JSON.stringify(serialize(s)));
  delete blob.god;
  blob.v = SAVE_VERSION - 1;
  const migrated = deserialize(blob);
  assert.ok(migrated, "v2 island loads");
  assert.equal(migrated.god.influence, 0, "fresh god hand for an M2 island");
});

test("a night's worth of ticks completes quickly (sim budget)", () => {
  const s = createGame(60);
  const t0 = process.hrtime.bigint();
  stepGame(s, DAY_TICKS / 3); // one full night at 1x
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 5000, `8000 ticks took ${ms.toFixed(0)}ms`);
});
