import test from "node:test";
import assert from "node:assert/strict";
import { createGame, stepGame } from "./game.js";
import {
  serialize,
  deserialize,
  serializeSim,
  deserializeSim,
  saveTravel,
  SAVE_VERSION,
  SIM_VERSION,
} from "./save.js";
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

test("old or corrupt saves are rejected (v3 islands migrate in)", () => {
  assert.equal(deserialize(null), null);
  assert.equal(deserialize({}), null);
  assert.equal(deserialize({ v: SAVE_VERSION }), null, "right version, no payload");
  assert.equal(deserialize({ v: SAVE_VERSION + 1 }), null, "from the future");
  // A v3-shaped sim blob (an M3 island) loads fine - it just starts godless.
  const s = createGame(99);
  stepGame(s, 3000);
  const blob = JSON.parse(JSON.stringify(serializeSim(s)));
  blob.v = SIM_VERSION - 1;
  delete blob.god;
  const migrated = deserializeSim(blob);
  assert.ok(migrated, "v3 island loads");
  assert.equal(migrated.god.influence, 0, "fresh god hand for an M3 island");
});

test("a bare v4 blob wraps as a one-region Greenwood world", () => {
  const s = createGame(99);
  stepGame(s, 5000);
  const blob = JSON.parse(JSON.stringify(serializeSim(s)));
  const wrapped = deserialize(blob);
  assert.ok(wrapped, "v4 island loads through the wrapper");
  assert.equal(wrapped.regionId, "greenwood");
  assert.equal(wrapped.clock.tick, s.clock.tick);
  assert.equal(wrapped.villagers.length, s.villagers.length);
  assert.ok(wrapped.regions.find((r) => r.id === "greenwood").founded, "marked founded");
});

test("region travel stashes the live sim and swaps the active region", () => {
  const s = createGame(99);
  stepGame(s, DAY_TICKS + 1234);
  const wrapper = JSON.parse(JSON.stringify(serialize(s)));
  s.regions.find((r) => r.id === "ashen").founded = true; // founded mid-session
  const traveled = JSON.parse(JSON.stringify(saveTravel(wrapper, s, "ashen")));
  assert.equal(traveled.active, "ashen");
  assert.ok(traveled.sims.greenwood, "the live sim is stashed, not lost");
  assert.equal(traveled.sims.greenwood.clock.tick, s.clock.tick);
  const back = deserialize(traveled);
  assert.ok(back, "the wrapper hydrates the new active region");
  assert.equal(back.regionId, "ashen");
  assert.equal(back.world.biome, "dry");
  // Greenwood's blob survives; traveling home restores the exact island.
  const home = deserialize(JSON.parse(JSON.stringify(saveTravel(traveled, back, "greenwood"))));
  assert.equal(home.regionId, "greenwood");
  assert.equal(home.clock.tick, s.clock.tick, "the stashed island resumes exactly");
});

test("migrants arrive intact when a sleeping region's blob hydrates", () => {
  const s = createGame(99);
  stepGame(s, DAY_TICKS + 1234);
  const wrapper = JSON.parse(JSON.stringify(serialize(s)));
  // Ashen was visited before (it has a blob) and settlers marched to it.
  wrapper.sims.ashen = JSON.parse(JSON.stringify(wrapper.sims.greenwood));
  wrapper.regions.find((r) => r.id === "ashen").founded = true;
  wrapper.regions.find((r) => r.id === "ashen").pendingMigrants = 3;
  wrapper.active = "ashen";
  const arrived = deserialize(wrapper);
  assert.ok(arrived, "the wrapper hydrates");
  assert.equal(arrived.regionId, "ashen");
  assert.equal(
    arrived.villagers.length,
    s.villagers.length + 3,
    "saved villagers kept AND the settlers spawned",
  );
  assert.equal(arrived.regions.find((r) => r.id === "ashen").pendingMigrants, 0, "the queue is spent");
});

test("a night's worth of ticks completes quickly (sim budget)", () => {
  const s = createGame(60);
  const t0 = process.hrtime.bigint();
  stepGame(s, DAY_TICKS / 3); // one full night at 1x
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 5000, `8000 ticks took ${ms.toFixed(0)}ms`);
});
