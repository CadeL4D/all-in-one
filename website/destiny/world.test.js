import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  terrain,
  footprint,
  place,
  canPlace,
  tick,
  completed,
  route,
  serialize,
  restore,
  raid,
  cast,
  POWERS,
  W,
  H,
} from "./world.js";
const run = (s, seconds) => {
  for (let i = 0; i < seconds * 10; i++) tick(s, 0.1);
};
test("powers require targets, spend influence, and repair real damage", () => {
  const s = setup(),
    hearth = completed(s, "hearth")[0];
  s.influence = 60;
  assert.ok(cast(s, "mend", hearth.x, hearth.y));
  assert.equal(s.influence, 60);
  hearth.hp -= 100;
  assert.equal(cast(s, "mend", hearth.x, hearth.y), "");
  assert.equal(hearth.hp, 285);
  assert.equal(s.influence, 40);
  s.enemies.push({ id: 999, x: 32, y: 25, hp: 36, path: [], age: 0, cool: 0 });
  assert.equal(cast(s, "starfall", 32, 25), "");
  assert.ok(s.enemies[0].hp <= 0);
  assert.equal(s.influence, 10);
});
test("wildseed creates harvestable timber away from the city and respects roads", () => {
  const s = setup();
  s.influence = 50;
  for (let y = 5; y < 12; y++)
    for (let x = 40; x < 47; x++) s.tiles[y * W + x] = 0;
  s.roads.push(6 * W + 41);
  assert.equal(cast(s, "wildseed", 43, 8), "");
  assert.equal(s.tiles[6 * W + 41], 0);
  assert.ok(s.tiles.slice(6 * W, 11 * W).includes(3));
  assert.equal(s.influence, 25);
});
test("legacy saves acquire influence and priority defaults", () => {
  const s = setup();
  delete s.influence;
  delete s.focus;
  const restored = restore(serialize(s));
  assert.equal(restored.influence, 35);
  assert.equal(restored.focus, "balanced");
});
function setup() {
  const s = createWorld("test", 1, true);
  assert.equal(place(s, "hearth", 30, 23), "");
  run(s, 20);
  return s;
}
function build(s, type) {
  for (let y = 17; y < 30; y++)
    for (let x = 25; x < 39; x++)
      if (!canPlace(s, type, x, y, 0)) {
        assert.equal(place(s, type, x, y), "");
        run(s, 30);
        return s.buildings.find((b) => b.type === type);
      }
  throw Error("No site for " + type);
}
test("reproducible sections and distinct seed/region layouts", () => {
  assert.deepEqual(terrain("same", 0), terrain("same", 0));
  assert.notDeepEqual(terrain("same", 0), terrain("other", 0));
  assert.notDeepEqual(terrain("same", 0), terrain("same", 1));
});
test("rotations preserve occupied area and courtyard gaps", () => {
  for (const type of ["hearth", "house", "kitchen", "lumber"]) {
    const n = footprint(type).length;
    for (let r = 0; r < 4; r++) assert.equal(footprint(type, r).length, n);
    assert.deepEqual(footprint(type, 4), footprint(type, 0));
  }
});
test("founding, construction, cost and placement rejection", () => {
  const s = setup();
  assert.equal(s.people.length, 6);
  assert.equal(completed(s, "hearth").length, 1);
  const snapshot = serialize(s);
  assert.ok(place(s, "hearth", 30, 23));
  assert.equal(serialize(s), snapshot);
  assert.ok(canPlace(s, "house", 0, 0, 0));
  const before = s.stock.wood;
  const b = build(s, "house");
  assert.equal(b.progress, 1);
  assert.equal(s.stock.wood, before - 14);
});
test("harvest physically returns materials and removes deposit", () => {
  const s = setup();
  const index = 17 * W + 30;
  s.tiles[index] = 3;
  s.marks.push(index);
  const before = s.stock.wood;
  run(s, 60);
  assert.equal(s.tiles[index], 0);
  assert.ok(s.stock.wood > before);
});
test("farms and wells sustain growth and milestone", () => {
  const s = setup();
  build(s, "house");
  build(s, "well");
  build(s, "farm");
  build(s, "garden");
  run(s, 450);
  assert.ok(s.stock.food > 0);
  assert.ok(s.stock.water > 0);
  assert.ok(s.people.length >= 8);
  assert.equal(s.won, true);
});
test("sealed destination has no route", () => {
  const s = createWorld("path", 1, true);
  s.tiles = Array(W * H).fill(0);
  for (const [x, y] of [
    [20, 19],
    [20, 21],
    [19, 20],
    [21, 20],
  ])
    s.tiles[y * W + x] = 4;
  assert.equal(route(s, 10, 10, 20, 20), null);
});
test("saves restore quantities and reject corrupt state", () => {
  const s = setup();
  const restored = restore(serialize(s));
  assert.deepEqual(restored.stock, s.stock);
  assert.deepEqual(restored.tiles, s.tiles);
  assert.equal(restored.people.length, 6);
  assert.throws(() => restore("{}"));
  const bad = { ...s, tiles: [0] };
  assert.throws(() => restore(JSON.stringify(bad)));
});
test("peaceful disables raids; towers use stone and defeat a nearby threat", () => {
  const s = setup();
  raid(s);
  assert.equal(s.enemies.length, 0);
  const tower = build(s, "tower");
  s.peaceful = false;
  s.enemies.push({
    id: 900,
    x: tower.x + 5.5,
    y: tower.y + 0.5,
    hp: 36,
    path: [],
    cool: 0,
    age: 0,
  });
  const before = s.stock.stone;
  run(s, 6);
  assert.equal(s.enemies.length, 0);
  assert.ok(s.stock.stone < before);
});
