import test from "node:test";
import assert from "node:assert/strict";
import { buildLine, linePlan, placeLine, createWorld, place, tick, DAY, DEFS, season, dailyNeeds, productionYield, startProject, beds, capacity, campaign, advanceCampaign, serialize, restore } from "./world.js";
const run = (s, seconds) => { for (let i = 0; i < seconds * 10; i++) tick(s, .1); };
function village() {
  const s = createWorld("chapters", 0, true);
  s.tiles.fill(0); place(s, "hearth", 30, 22); run(s, 12);
  s.stock = {wood: 180, stone: 180, food: 150, water: 150};
  return s;
}
function add(s, type, x = 24, y = 18) {
  const b = {id: s.nextId++, type, x, y, rot: 0, hp: DEFS[type].hp, progress: 1};
  s.buildings.push(b); return b;
}
test("seasons change real yields and demand without stopping winter farming", () => {
  const s = village(), farm = add(s, "farm"), well = add(s, "well", 38, 18);
  const spring = productionYield(s, farm), water = dailyNeeds(s).water;
  s.day = 5; assert.equal(season(s).name, "Summer"); assert.ok(dailyNeeds(s).water > water);
  s.day = 9; assert.ok(productionYield(s, farm) > spring);
  s.day = 13; assert.equal(productionYield(s, farm), spring / 2);
  farm.upgraded = true; assert.equal(productionYield(s, farm), 6);
  well.upgraded = true; assert.equal(productionYield(s, well), 12);
  s.day = 17; assert.equal(season(s).name, "Spring");
});
test("worker upgrades cost resources once, take time, improve output and survive saves", () => {
  const s = village(), b = add(s, "farm");
  const before = s.stock.wood;
  assert.equal(startProject(s, b, "upgrade"), "");
  assert.equal(s.stock.wood, before - 16);
  assert.ok(startProject(s, b, "upgrade"));
  assert.equal(s.stock.wood, before - 16);
  assert.equal(b.upgraded, undefined);
  run(s, 5); assert.equal(b.upgraded, undefined);
  const copy = restore(serialize(s));
  run(copy, 50);
  const improved = copy.buildings.find(v => v.id === b.id);
  assert.equal(improved.upgraded, true);
  assert.equal(improved.project, undefined);
  assert.equal(productionYield(copy, improved), 12);
  assert.ok(startProject(copy, improved, "upgrade"));
});
test("repair jobs restore capped condition and fail without supplies", () => {
  const s = village(), b = add(s, "house"); b.hp = 50;
  s.stock.wood = 0;
  assert.ok(startProject(s, b, "repair")); assert.equal(b.project, undefined);
  s.stock.wood = 50;
  assert.equal(startProject(s, b, "repair"), "");
  run(s, 35); assert.equal(b.hp, DEFS.house.hp);
  assert.ok(startProject(s, b, "repair"));
});
test("upgraded homes and storage add capacity without expanding their footprint", () => {
  const s = village(); const house = add(s, "house"), store = add(s, "store", 38, 18);
  const oldBeds = beds(s), oldCap = capacity(s);
  house.upgraded = true; store.upgraded = true;
  assert.equal(beds(s), oldBeds + 2); assert.equal(capacity(s), oldCap + 100);
});
test("chapters advance persistently, reward once, and replace the old ending", () => {
  const s = village(); add(s, "house"); add(s, "well", 38, 18); add(s, "farm", 20, 30);
  s.influence = 0;
  advanceCampaign(s);
  assert.deepEqual(s.chapters, [0]); assert.equal(s.influence, 30);
  advanceCampaign(s); assert.equal(s.influence, 30);
  assert.equal(campaign(s).current.name, "Secure the village");
  s.won = true;
  assert.equal(campaign(s).current.name, "Secure the village");
  const copy = restore(serialize(s)); assert.deepEqual(copy.chapters, [0]);
  copy.buildings = copy.buildings.filter(b => b.type !== "house");
  assert.equal(campaign(copy).index, 1, "Earned chapters never regress");
  const invalid = JSON.parse(serialize(s)); invalid.chapters = [3];
  assert.throws(() => restore(JSON.stringify(invalid)), /chapter/);
});

test("wall and trail lines are continuous, preview costs, and build atomically", () => {
  const s = village(), from = {x: 14, y: 14}, to = {x: 18, y: 16};
  const cells = buildLine(from, to);
  for (let i = 1; i < cells.length; i++) assert.equal(Math.abs(cells[i].x-cells[i-1].x)+Math.abs(cells[i].y-cells[i-1].y), 1);
  const before = serialize(s), plan = linePlan(s, "wall", from, to);
  assert.equal(plan.reason, ""); assert.equal(serialize(s), before);
  assert.equal(placeLine(s, "wall", from, to), "");
  assert.equal(s.buildings.filter(b=>b.type === "wall").length, cells.length);
  const trailFrom = {x:14,y:17}, trailTo = {x:18,y:17};
  s.tiles[17*64+16] = 3;
  const blocked = serialize(s);
  assert.ok(placeLine(s, "path", trailFrom, trailTo)); assert.equal(serialize(s), blocked);
  s.tiles[17*64+16] = 0; s.stock.wood = 0; s.stock.stone = 0;
  const poor = serialize(s);
  assert.ok(placeLine(s, "path", trailFrom, trailTo)); assert.equal(serialize(s), poor);
  s.stock.wood = s.stock.stone = 100;
  assert.equal(placeLine(s, "path", trailFrom, trailTo), "");
  assert.equal(s.roads.length, 5);
  assert.equal(placeLine(s, "path", trailFrom, {x:20,y:17}), "");
  assert.equal(s.roads.length, 7, "Existing trail segments are skipped without double charging");
});
