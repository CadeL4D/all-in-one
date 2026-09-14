// M5 world map (doc 01 section 4.2, doc 03 section 1): three regions on
// one save, founded with a paid caravan whose settlers walk at dawn;
// migration follows RtR's rule set (pop 15+ to send, young healthy adults
// only, at most 8 per batch). Only the active sim ticks; arrivals
// materialize at the camp when a sleeping region wakes.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "./game.js";
import { createVillager } from "./villager.js";
import {
  createRegions,
  regionDef,
  regionSeed,
  diffOf,
  canFound,
  foundRegion,
  canMigrate,
  migratableCount,
  migrateTo,
  departuresAtDawn,
  applyPendingMigrants,
} from "./regions.js";
import * as B from "./balance.js";

function arena(seed = 8200) {
  const s = createGame(seed);
  s.villagers = [];
  s.nomads = [];
  s.nomadQueue = [];
  s.monsters = [];
  s.events = []; // creation already logged the camp's founding
  s.meta.xp = 0; // ...and paid its 3 xp for it
  return s;
}

// A founding-ready village: tier-3 camp, a full purse, ten able adults.
function readyToFound(s) {
  s.buildings.find((b) => b.type === "camp").tier = B.FOUND_TIER;
  s.resources.wood = B.FOUND_COST.wood + 10;
  s.resources.food = B.FOUND_COST.food + 10;
  for (let i = 0; i < B.FOUND_SETTLERS + 4; i++) createVillager(s, 36 + i * 0.5, 36);
}

test("the world starts settled at home, wilds untouched", () => {
  const s = arena();
  assert.deepEqual(
    s.regions.map((r) => r.id),
    B.REGIONS.map((r) => r.id),
  );
  assert.equal(s.regions.find((r) => r.id === s.regionId).founded, true, "home is, by definition, settled");
  assert.equal(s.regions.find((r) => r.id === "ashen").founded, false);
  assert.equal(s.regions.find((r) => r.id === "mirefen").founded, false);
  for (const r of s.regions) {
    assert.equal(r.pendingMigrants, 0);
    assert.equal(r.departing, 0);
    assert.equal(r.departingTo, null);
  }
  assert.equal(regionDef("mirefen").stars, 3, "the mire is the deep end");
});

test("difficulty knobs ride the region's stars", () => {
  const home = arena();
  assert.equal(diffOf(home), B.REGION_DIFF[0], "greenwood is one-star calm");
  const hard = createGame(99, { regionId: "mirefen" });
  assert.equal(diffOf(hard), B.REGION_DIFF[2], "the mire bites");
  assert.equal(hard.world.biome, "marsh", "the biome came with the region");
});

test("region seeds are stable: same world, same three maps", () => {
  for (const r of B.REGIONS) {
    assert.equal(regionSeed(1234, r.id), regionSeed(1234, r.id), `${r.id} regenerates identically`);
    assert.notEqual(regionSeed(1234, r.id), regionSeed(1235, r.id), "another world, another map");
  }
  assert.notEqual(regionSeed(1234, "ashen"), regionSeed(1234, "mirefen"), "regions never share maps");

  // Two fresh generations of the same never-visited region match tile for
  // tile - the stable salt promise behind travel.
  const a = createGame(regionSeed(4321, "ashen"), { regionId: "ashen" });
  const c = createGame(regionSeed(4321, "ashen"), { regionId: "ashen" });
  assert.deepEqual([...a.world.terrain], [...c.world.terrain]);
  assert.deepEqual([...a.world.feature], [...c.world.feature]);
});

test("founding gates: tier, purse, and spare hands", () => {
  const s = arena();
  let check = canFound(s, "ashen");
  assert.ok(!check.ok && /tier 3/.test(check.reason), "a hamlet cannot fund a caravan");

  s.buildings.find((b) => b.type === "camp").tier = B.FOUND_TIER;
  check = canFound(s, "ashen");
  assert.ok(!check.ok && /short on food/.test(check.reason), "the caravan has a price");

  s.resources.food = B.FOUND_COST.food;
  check = canFound(s, "ashen");
  assert.ok(!check.ok && /able adults/.test(check.reason), "someone must stay behind");

  for (let i = 0; i < B.FOUND_SETTLERS + 4; i++) createVillager(s, 36 + i * 0.5, 36);
  assert.ok(canFound(s, "ashen").ok, "a settlement can send its first settlers");
  assert.equal(canFound(s, s.regionId).ok, false, "you cannot found where you stand");
});

test("founding pays the caravan and schedules the walk", () => {
  const s = arena();
  readyToFound(s);
  const woodBefore = s.resources.wood;
  const foodBefore = s.resources.food;
  assert.ok(foundRegion(s, "ashen").ok);
  assert.equal(s.resources.wood, woodBefore - B.FOUND_COST.wood);
  assert.equal(s.resources.food, foodBefore - B.FOUND_COST.food);
  const entry = s.regions.find((r) => r.id === "ashen");
  assert.equal(entry.founded, true);
  assert.equal(entry.pendingMigrants, B.FOUND_SETTLERS, "settlers await at the far camp");
  const local = s.regions.find((r) => r.id === s.regionId);
  assert.equal(local.departing, B.FOUND_SETTLERS);
  assert.equal(local.departingTo, "ashen");
  assert.equal(local.departingIsFounding, true);
  assert.equal(s.meta.xp, B.PERK_XP.founded, "founding teaches the god");
  assert.equal(s.events.at(-1).type, "region-founded");

  // Founding twice is refused without touching the purse.
  const purse = s.resources.wood;
  assert.equal(foundRegion(s, "ashen").ok, false, "already settled");
  assert.equal(foundRegion(s, s.regionId).ok, false, "standing in it");
  assert.equal(s.resources.wood, purse);
});

test("migration follows the RtR rulebook", () => {
  const s = arena();
  s.regions.find((r) => r.id === "ashen").founded = true;
  assert.equal(canMigrate(s, "mirefen").ok, false, "no village there to receive them");
  assert.equal(canMigrate(s, s.regionId).ok, false, "they already live here");

  // Pop 16: 12 hale adults, 2 hurt adults, 2 children.
  for (let i = 0; i < 12; i++) createVillager(s, 36 + i * 0.5, 36);
  const hurt1 = createVillager(s, 40, 36);
  hurt1.health = B.MIGRATE_HEALTH - 10;
  const hurt2 = createVillager(s, 40.5, 36);
  hurt2.health = 20;
  createVillager(s, 41, 36, "child");
  createVillager(s, 41.5, 36, "child");
  assert.equal(migratableCount(s), 12, "only the hale may walk");

  const r = migrateTo(s, "ashen", 99); // an absurd request clamps to the rules
  assert.ok(r.ok);
  assert.equal(r.count, B.MIGRATE_MAX_BATCH, "at most 8 walk per batch");
  const walkers = s.villagers.filter((v) => v.migrating);
  assert.equal(walkers.length, 8);
  for (const v of walkers) {
    assert.equal(v.age, "adult", "children stay");
    assert.ok(v.health >= B.MIGRATE_HEALTH, "the hurt stay");
  }
  assert.equal(s.villagers.filter((v) => v.health < B.MIGRATE_HEALTH).length, 2, "nobody hale was passed over");
  const local = s.regions.find((r) => r.id === s.regionId);
  assert.equal(local.departing, 8);
  assert.equal(local.departingTo, "ashen");
  assert.equal(local.departingIsFounding, false);
  assert.equal(s.events.at(-1).type, "migrants-scheduled");
  assert.equal(migratableCount(s), 4, "the chosen are no longer eligible");
});

test("the dawn walk: settlers leave, the ledger stays honest", () => {
  const s = arena();
  s.regions.find((r) => r.id === "ashen").founded = true;
  // Pop 15: 8 hale adults (each with a job and a home) plus 7 children.
  const camp = s.buildings.find((b) => b.type === "camp");
  for (let i = 0; i < 8; i++) {
    const v = createVillager(s, 36 + i * 0.5, 36);
    v.workBuilding = camp.id;
    camp.workers.push(v.id);
    v.home = camp.id;
    camp.occupants = i + 1;
  }
  for (let i = 0; i < 7; i++) createVillager(s, 40 + i * 0.5, 36, "child");
  assert.equal(s.villagers.length, 15);
  assert.equal(migrateTo(s, "ashen", 8).count, 8);

  departuresAtDawn(s);
  assert.equal(s.villagers.length, 7, "the walkers are gone");
  assert.equal(s.stats.died, 0, "they walked out - not a death");
  const entry = s.regions.find((r) => r.id === "ashen");
  assert.equal(entry.pendingMigrants, 8, "the far camp counts them in");
  const local = s.regions.find((r) => r.id === s.regionId);
  assert.equal(local.departing, 0, "the departure is spent");
  assert.equal(local.departingTo, null);
  assert.equal(camp.workers.length, 0, "their jobs opened up");
  assert.equal(camp.occupants, 0, "their beds opened up");
  assert.equal(s.events.at(-1).type, "migrants-left");
  // Eight migrants at 10 xp each lands exactly on the first pick's rung.
  assert.equal(s.meta.picks, 1, "giving settlers a future taught the god");

  // Nothing scheduled: the dawn beat is a no-op.
  departuresAtDawn(s);
  assert.equal(s.villagers.length, 7);
});

test("arrivals materialize at the camp when a region wakes", () => {
  const regions = createRegions();
  const ashen = regions.find((r) => r.id === "ashen");
  ashen.founded = true;
  ashen.pendingMigrants = B.FOUND_SETTLERS;
  const s = createGame(8300, { regionId: "ashen", regions });
  assert.equal(s.villagers.length, B.START_POP + B.FOUND_SETTLERS, "settlers stepped off the caravan");
  assert.equal(
    s.resources.wood,
    B.FOUND_START_BOOST.wood,
    "the caravan's supplies are the new region's purse",
  );
  assert.equal(applyPendingMigrants(s), 0, "the queue is spent");
  assert.equal(
    s.regions.find((r) => r.id === "ashen").pendingMigrants,
    0,
    "and stays spent",
  );
});
