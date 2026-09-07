import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "./game.js";
import { CAMP_TILE, CLEAR_RADIUS, MAP_SIZE } from "./balance.js";
import { T_GRASS, T_WATER, F_TREE, F_BUSH, F_NONE } from "./world.js";

// The start must never depend on RNG luck (playable without restarts).
test("generation guarantees a playable start", () => {
  for (const seed of [1, 42, 12345, 987654321, 20260907]) {
    const s = createGame(seed);
    const { world } = s;
    const dist = (x, y) => Math.hypot(x - CAMP_TILE.x, y - CAMP_TILE.y);

    let water = 0,
      trees = 0,
      bushes = 0;
    for (let y = 0; y < MAP_SIZE; y++)
      for (let x = 0; x < MAP_SIZE; x++) {
        const d = dist(x, y);
        const i = y * MAP_SIZE + x;
        if (d <= 16) {
          if (world.terrain[i] === T_WATER) water++;
          if (world.feature[i] === F_TREE) trees++;
          if (world.feature[i] === F_BUSH) bushes++;
        }
        if (d <= CLEAR_RADIUS) {
          assert.notEqual(world.terrain[i], T_WATER, `seed ${seed}: water in clearing`);
          assert.equal(world.feature[i], F_NONE, `seed ${seed}: feature in clearing`);
        }
      }
    assert.ok(water > 0, `seed ${seed}: water to drink from`);
    assert.ok(trees >= 40, `seed ${seed}: trees ${trees} for building`);
    assert.ok(bushes >= 1, `seed ${seed}: berries for day 1`);
  }
});

test("same seed, same island", () => {
  const a = createGame(777).world;
  const b = createGame(777).world;
  assert.deepEqual([...a.terrain], [...b.terrain]);
  assert.deepEqual([...a.feature], [...b.feature]);
});
