import test from "node:test";
import assert from "node:assert/strict";
import { W, H, DAY, DIFFICULTIES, MONSTERS, DEFS, createWorld, place, canPlace,
  startProject, campaign, completed, tick, dailyNeeds, raidDay, nextRaidDay, raidPlan, raid, serialize, restore, route, suggestedSite } from "./world.js";
import { WORLD_W, WORLD_H, TERRITORIES, buildAtlas, regionTiles, worldTile, createTerritory } from "./geography.js";

const run = (s, seconds) => { for (let i = 0; i < seconds * 5; i++) tick(s, .2); };
const atlas = buildAtlas("balance-frontier");

test("all 24 regions are exact slices of one reproducible world", () => {
  assert.deepEqual(buildAtlas(atlas.seed), atlas);
  assert.notDeepEqual(buildAtlas("another-world").tiles, atlas.tiles);
  for (const t of TERRITORIES) {
    const tiles = regionTiles(atlas, t.id);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      assert.equal(tiles[y * W + x], atlas.tiles[(t.row * H + y) * WORLD_W + t.col * W + x]);
    }
    for (const n of t.neighbors) assert.ok(TERRITORIES[n].neighbors.includes(t.id));
    assert.equal(tiles.length, W * H);
  }
  // Inland survey lines must not be bordered by the old repeated ocean ring.
  const inland = Array.from({length: WORLD_H}, (_, y) => worldTile(atlas.seed, W, y));
  assert.ok(inland.filter(t => t !== 1).length > WORLD_H * .8);
  assert.ok(atlas.tiles.filter(t => t === 1).length > 1000, "There is still a global coast and river system");
});

test("every region across varied seeds has a legal hearth and reachable starter deposits", () => {
  for (const seed of ["HEARTH-742", "coast", "ridge", "river"]) {
    const a = buildAtlas(seed);
    for (const t of TERRITORIES) {
      const s = createTerritory(a, t.id, "survival");
      assert.equal(place(s, "hearth", 30, 22), "", `${seed}: ${t.name}`);
      assert.ok(s.tiles.filter(v => v === 3).length >= 10);
      assert.ok(s.tiles.filter(v => v === 4).length >= 10);
      assert.ok(route(s, 29, 22, 30, 17), "Tree row has an accessible edge");
      assert.ok(route(s, 29, 22, 30, 31), "Stone row has an accessible edge");
    }
  }
});

test("difficulty, world location and regional danger survive saves; legacy saves migrate", () => {
  const s = createTerritory(atlas, 5, "onslaught");
  const copy = restore(serialize(s));
  assert.equal(copy.difficulty, "onslaught");
  assert.equal(copy.territory, 5);
  assert.equal(copy.worldSeed, atlas.seed);
  assert.equal(copy.threat, 2);
  const legacy = createWorld("legacy", 0, true);
  delete legacy.difficulty; delete legacy.threat;
  const migrated = restore(serialize(legacy));
  assert.equal(migrated.difficulty, "peaceful");
  assert.deepEqual(migrated.stock, legacy.stock);
  assert.throws(() => restore(JSON.stringify({...s, difficulty: "impossible"})));
  assert.throws(() => restore(JSON.stringify({...s, threat: 9})));
});

test("modes have distinct grace periods, bounded escalating waves and gradual monster introductions", () => {
  for (const [mode, d] of Object.entries(DIFFICULTIES)) {
    const s = createTerritory(atlas, 0, mode);
    assert.equal(nextRaidDay(s), d.firstRaid || null);
    assert.equal(raidDay(s, 1), false);
    if (!d.firstRaid) { assert.deepEqual(raidPlan(s), []); continue; }
    assert.equal(raidDay(s, d.firstRaid), true);
    assert.equal(raidDay(s, d.firstRaid + d.interval), true);
    const initial = raidPlan(s);
    assert.equal(initial.length, d.base);
    assert.ok(initial.every(m => m.kind === "raveler"));
    const later = raidPlan(s, d.firstRaid + d.interval * 6);
    assert.ok(later.length >= initial.length);
    assert.ok(later.some(m => m.kind === "skulker"));
    assert.ok(later.some(m => m.kind === "brute"));
    assert.ok(raidPlan(s, 1000).length <= d.cap);
    s.threat = 2;
    assert.equal(raidPlan(s).length, initial.length + 2);
    s.raided = d.firstRaid; s.day = d.firstRaid;
    assert.equal(nextRaidDay(s), d.firstRaid + d.interval);
  }
});

test("all starting budgets can fund food, water, a cottage, timber and one tower", () => {
  const essentials = ["house", "well", "farm", "lumber", "tower"];
  const wood = essentials.reduce((n, key) => n + DEFS[key].wood, 0);
  const stone = essentials.reduce((n, key) => n + DEFS[key].stone, 0);
  for (const mode of Object.keys(DIFFICULTIES)) {
    const s = createTerritory(atlas, 0, mode);
    assert.ok(s.stock.wood >= wood);
    const shots = raidPlan(s).reduce((n, m) => n + Math.ceil(m.hp / 18), 0);
    assert.ok(s.stock.stone >= stone + shots, mode + " leaves ammunition for the first sheltered wave");
  }
});

test("supplies scale with population and kitchens; scarce food suppresses growth", () => {
  const s = createTerritory(atlas, 14, "survival");
  assert.equal(place(s, "hearth", 30, 22), "");
  run(s, 15);
  assert.deepEqual(dailyNeeds(s), {food: 12, water: 9});
  s.buildings.push({id: 100, type: "kitchen", x: 40, y: 20, rot: 0, progress: 1, hp: 100});
  assert.deepEqual(dailyNeeds(s), {food: 9, water: 9});
  s.stock.food = 0; s.stock.water = 0;
  const morale = s.morale;
  run(s, DAY);
  assert.ok(s.morale < morale);
  assert.equal(s.people.length, 6);
});

test("a reachable raid spawns its forecast once; unprotected buildings take damage", () => {
  const s = createTerritory(atlas, 0, "survival");
  s.tiles.fill(0);
  assert.equal(place(s, "hearth", 30, 22), ""); run(s, 15);
  s.day = 3; s.time = 2 * DAY + DAY * .75;
  const plan = raidPlan(s);
  raid(s); assert.equal(s.enemies.length, plan.length);
  raid(s); assert.equal(s.enemies.length, plan.length, "A wave is not duplicated");
  run(s, 75);
  assert.ok(s.lost || s.buildings[0].hp < DEFS.hearth.hp, "Ignoring defense has a consequence");
});

test("monster strengths increase by mode and preserve distinct speeds", () => {
  const sheltered = createTerritory(atlas, 0, "settler");
  const hard = createTerritory(atlas, 0, "onslaught");
  assert.ok(raidPlan(hard)[0].hp > raidPlan(sheltered)[0].hp);
  assert.ok(MONSTERS.skulker.speed > MONSTERS.raveler.speed);
  assert.ok(MONSTERS.brute.speed < MONSTERS.raveler.speed);
  assert.ok(MONSTERS.brute.damage > MONSTERS.raveler.damage);
});

test("each region can deliver its first forecasted wave from a reachable land edge", () => {
  for (const t of TERRITORIES) {
    const s = createTerritory(atlas, t.id, "survival");
    assert.equal(place(s, "hearth", 30, 22), "");
    s.day = 3;
    raid(s);
    assert.equal(s.enemies.length, 3 + t.threat, t.name);
  }
});

function opening(s, defenses = true) {
  const build = (type, x, y, seconds = 20) => {
    let reason = "";
    for (let wait = 0; wait < 25; wait++) {
      reason = canPlace(s, type, x, y, 0);
      if (!reason) break;
      run(s, 1);
    }
    assert.equal(reason, "", `${s.difficulty}/${s.territoryName}: ${type}`);
    assert.equal(place(s, type, x, y), "");
    run(s, seconds);
  };
  build("hearth", 30, 22, 12);
  build("house", 25, 18);
  build("well", 36, 26);
  build("farm", 25, 28);
  build("lumber", 35, 18);
  if (defenses) build("tower", 34, 26);
  build("quarry", 35, 28);
  build("garden", 28, 25);
  return build;
}

test("a basic economy and one tower sustain a sheltered Survival opening through day six", () => {
  const s = createTerritory(atlas, 0, "survival");
  opening(s);
  run(s, DAY * 6 - s.time);
  assert.equal(s.lost, false);
  assert.ok(completed(s, "hearth").length);
  assert.ok(s.stock.food > 0 && s.stock.water > 0);
  assert.ok(s.people.length >= 8);
  assert.ok(s.won);
});

test("lean Onslaught supplies still allow a prepared opening to survive the first two nights", () => {
  const s = createTerritory(atlas, 0, "onslaught");
  opening(s);
  run(s, DAY * 3 - s.time);
  assert.equal(s.lost, false);
  assert.ok(s.stock.food > 0 && s.stock.water > 0);
  assert.ok(completed(s, "tower").length);
});

test("lowland and highland crop tradeoffs support an established Survival village", () => {
  for (const id of [14, 2]) {
    const s = createTerritory(atlas, id, "survival");
    opening(s);
    run(s, DAY * 5 - s.time);
    assert.equal(s.lost, false, s.territoryName);
    assert.ok(s.stock.food > 0 && s.stock.water > 0, s.territoryName);
  }
});

test("the next building receives a reachable, affordable suggestion without spending resources", () => {
  const s = createTerritory(atlas, 0, "survival");
  place(s, "hearth", 30, 22); run(s, 15);
  const before = serialize(s);
  const site = suggestedSite(s, "house", 32, 24);
  assert.ok(site);
  assert.equal(serialize(s), before);
  assert.equal(place(s, "house", site.x, site.y), "");
  s.stock.wood = 0;
  assert.equal(suggestedSite(s, "house", 32, 24), null);
});


test("an actively improved Survival village can complete the four chapters through winter", () => {
  const s = createTerritory(atlas, 0, "survival");
  opening(s);
  const planned = ["kitchen", "store", "tower", "farm", "beacon", "tower", "well"];
  let pending = 0;
  for (let n = 0; n < 1700 && s.day < 18 && !s.lost; n++) {
    if (s.stock.stone < 35) {
      for (let i = 0; i < s.tiles.length; i++) if (s.tiles[i] === 4 && !s.marks.includes(i)) s.marks.push(i);
    }
    s.focus = s.stock.stone < 15 ? "harvest" : s.stock.food < 35 || s.stock.water < 25 ? "food" : "balanced";
    if (pending < planned.length) {
      const type = planned[pending], site = suggestedSite(s, type, 32, 24);
      if (site) { assert.equal(place(s, type, site.x, site.y), ""); pending++; }
    }
    for (const b of s.buildings) {
      if (b.progress < 1 || b.project) continue;
      if (b.hp < DEFS[b.type].hp * .65) startProject(s, b, "repair");
      else if (["farm", "house", "tower"].includes(b.type) && !b.upgraded && s.stock.stone > 45) startProject(s, b, "upgrade");
    }
    run(s, 1);
  }
  assert.equal(s.lost, false, JSON.stringify({day:s.day, pending, stock:s.stock, events:s.events, buildings:s.buildings.map(b=>[b.type,b.x,b.y,b.hp,b.upgraded])}));
  assert.ok(s.stock.food > 0 && s.stock.water > 0);
  assert.equal(pending, planned.length);
  assert.equal(campaign(s).index, 4, JSON.stringify({day:s.day, people:s.people.length, chapters:s.chapters, stock:s.stock, steps:campaign(s).current?.steps, buildings:s.buildings.map(b=>[b.type,b.progress,b.upgraded])}));
});
