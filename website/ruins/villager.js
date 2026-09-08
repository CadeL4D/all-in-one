// Villager simulation: needs decay, utility-ish decisions, and job work
// loops. There is NO direct ordering - the player sets headcounts and
// buildings; villagers choose their own targets (master plan pillar 1).
// Villagers overlap freely: no unit-unit collision (standing veto).
import * as B from "./balance.js";
import { nearestTile, tilePassable, F_TREE, F_BUSH, F_STUMP } from "./world.js";
import { findPath, adjacentOpen } from "./path.js";
import * as bd from "./buildings.js";

export function createVillager(state, x, y, age = "adult") {
  const id = state.nextId++;
  const v = {
    id,
    name: state.rng.pick(B.NAMES),
    age,
    x,
    y,
    hunger: B.MAX_NEED * 0.9,
    thirst: B.MAX_NEED * 0.9,
    energy: B.MAX_NEED * 0.85,
    health: B.MAX_NEED,
    job: null,
    workBuilding: null,
    home: null,
    carrying: null,
    carryAmount: 0,
    path: [],
    task: null,
    bubble: null,
    bubbleUntil: 0,
    activity: "Arriving",
    attackCd: 0, // melee swing cooldown when raiders close in
    growTick: age === "child" ? state.clock.tick + B.ADULT_AGE_DAYS * B.DAY_TICKS : -1,
    facing: 1,
  };
  state.villagers.push(v);
  return v;
}

const perTick = (perDay) => perDay / B.DAY_TICKS;

export function tickVillager(state, v, dt) {
  if (v.dead) return;
  const working = isWorking(v);

  // ---- Needs decay (working burns hunger ~x2 in RtR).
  let hungerRate = perTick(B.HUNGER_DECAY_PER_DAY);
  if (working) hungerRate *= B.HUNGER_WORK_MULT;
  if (v.age === "child") hungerRate *= B.HUNGER_CHILD_MULT;
  v.hunger = Math.max(0, v.hunger - hungerRate * dt);
  v.thirst = Math.max(0, v.thirst - perTick(B.THIRST_DECAY_PER_DAY) * dt);

  if (v.task && v.task.kind === "sleep") {
    v.energy = Math.min(B.MAX_NEED, v.energy + perTick(B.SLEEP_RESTORE_PER_DAY) * (v.home ? 1 : 0.6) * dt);
  } else {
    v.energy = Math.max(0, v.energy - perTick(B.ENERGY_DECAY_PER_DAY) * dt);
  }

  // ---- Health: regen when fed, damage when starving/dehydrated.
  if (v.hunger > 40 && v.thirst > 30 && v.health < B.MAX_NEED)
    v.health = Math.min(B.MAX_NEED, v.health + perTick(B.HEALTH_REGEN_PER_DAY) * dt);
  if (v.hunger <= 0) v.health -= perTick(B.STARVE_DAMAGE_PER_DAY) * dt;
  if (v.thirst <= 0) v.health -= perTick(B.DEHYDRATE_DAMAGE_PER_DAY) * dt;
  if (v.health <= 0) {
    killVillager(state, v, v.thirst <= 0 && v.hunger > 0 ? "thirst" : "starvation");
    return;
  }

  // ---- Children grow up.
  if (v.age === "child" && v.growTick > 0 && state.clock.tick >= v.growTick) {
    v.age = "adult";
    v.growTick = -1;
    v.task = null;
    state.events.push({ type: "grew-up", name: v.name, x: v.x, y: v.y });
  }

  // ---- Bubble timers.
  if (v.bubble && state.clock.tick >= v.bubbleUntil) v.bubble = null;

  // ---- Wake up.
  if (v.task && v.task.kind === "sleep") {
    const night = state.clock.phaseIndex === 5;
    if (v.energy >= B.MAX_NEED - 5 || (!night && v.energy > 70)) {
      v.task = null;
      v.activity = "Waking up";
    } else return;
  }

  if (!v.task) {
    // Failed lookups back off briefly - never re-path the whole map per tick.
    if (v.waitUntil && state.clock.tick < v.waitUntil) {
      idleAround(state, v, dt);
      return;
    }
    decide(state, v);
    if (!v.task) {
      v.waitUntil = state.clock.tick + 90;
      idleAround(state, v, dt);
      return;
    }
    v.waitUntil = 0;
  }
  runTask(state, v, dt);
}

function isWorking(v) {
  return (
    v.task &&
    ["chop", "mine", "plant", "harvestPlot", "harvestBush", "build", "fetch", "deliver"].includes(v.task.kind)
  );
}

export function killVillager(state, v, cause) {
  v.dead = true;
  state.corpses.push({
    x: v.x,
    y: v.y,
    name: v.name,
    cause,
    decay: state.clock.tick + B.CORPSE_DECAY_TICKS,
  });
  if (v.home !== null) {
    const home = state.buildings.find((b) => b.id === v.home);
    if (home) home.occupants = Math.max(0, home.occupants - 1);
  }
  state.events.push({ type: "died", name: v.name, cause, x: v.x, y: v.y });
}

// ---- Decision layer: needs first, then work, then charm.
function decide(state, v) {
  const tick = state.clock.tick;

  // Claim a free bed before anything else (RtR's "finding new home" task).
  if (v.age === "adult" && v.home === null) findHome(state, v);

  // Starving thoughts become bubbles even before the walk begins.
  if (v.hunger < B.EAT_THRESHOLD && state.resources.food >= 1) {
    const store = nearestStore(state, v);
    if (store) return startGoto(state, v, { kind: "eat", building: store.id }, store);
  }
  if (v.thirst < B.DRINK_THRESHOLD) {
    if (state.resources.water >= 1) {
      const well = nearestBuilding(state, v, (b) => b.complete && b.type === "well");
      if (well) return startGoto(state, v, { kind: "drink", building: well.id }, well);
    }
    // Drink at a standable shore tile (never a tile surrounded by water).
    const shore = nearestTile(
      state.world,
      state.world.waterTiles,
      Math.floor(v.x),
      Math.floor(v.y),
      24,
      (i) => hasLandNeighbor(state.world, i),
    );
    if (shore >= 0) return startGotoTile(state, v, { kind: "drinkWild", target: shore }, shore);
  }
  const night = state.clock.phaseIndex === 5;
  if (v.energy < B.SLEEPY_THRESHOLD || (night && v.energy < B.NIGHT_SLEEP_THRESHOLD)) {
    if (v.home !== null) {
      const home = state.buildings.find((b) => b.id === v.home && b.complete);
      if (home) return startGoto(state, v, { kind: "sleep", building: home.id }, home);
    } else {
      v.task = { kind: "sleep", stage: "work", workLeft: 0 };
      setBubble(v, tick, "homeless", 500);
      v.activity = "Sleeping rough";
      return;
    }
  }

  if (v.age === "adult") {
    if (!v.job && !tryHire(state, v)) return maybeChat(state, v);
    if (v.job && jobWork(state, v)) return;
  }
  maybeChat(state, v);
}

// Claim a free bed in any finished house (research doc 03: housed couples
// are the backbone of growth, so moving in matters).
function findHome(state, v) {
  const home = state.buildings.find(
    (b) =>
      b.complete &&
      B.BUILDINGS[b.type].houses > 0 &&
      b.occupants < B.BUILDINGS[b.type].houses,
  );
  if (home) {
    v.home = home.id;
    home.occupants += 1;
    setBubble(v, state.clock.tick, "chat", 200); // little "moved in" flourish
  }
}

function setBubble(v, tick, key, ticks) {
  v.bubble = key;
  v.bubbleUntil = tick + ticks;
}

function nearestStore(state, v) {
  return nearestBuilding(state, v, (b) => b.complete && B.BUILDINGS[b.type].storage > 0);
}

function nearestBuilding(state, v, filter) {
  let best = null,
    bestD = Infinity;
  for (const b of state.buildings) {
    if (!filter(b)) continue;
    const c = bd.buildingCenter(b);
    const d = Math.hypot(c.x - v.x, c.y - v.y);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

// Self-select into any job whose desired count isn't met (RtR Jobs panel).
function tryHire(state, v) {
  const slots = bd.jobSlots(state);
  for (const job of Object.keys(B.JOBS)) {
    if (bd.employedCount(state, job) >= (state.jobCounts[job] ?? 0)) continue;
    if (slots[job] <= 0) continue;
    const free = state.buildings.filter(
      (b) => b.complete && (B.BUILDINGS[b.type].jobs?.[job] ?? 0) > b.workers.length,
    );
    free.sort((a, b2) => dist2(v, a) - dist2(v, b2));
    const spot = free[0];
    if (!spot) continue;
    v.job = job;
    v.workBuilding = spot.id;
    spot.workers.push(v.id);
    return true;
  }
  return false;
}

function dist2(v, b) {
  const c = bd.buildingCenter(b);
  return (c.x - v.x) ** 2 + (c.y - v.y) ** 2;
}

// Pick a work task for the current job. Returns true when a task started.
function jobWork(state, v) {
  if (v.hunger < B.HUNGRY_WORK_REFUSAL) return false; // too hungry to work (RtR rule)
  const workAt = state.buildings.find((b) => b.id === v.workBuilding);
  if (!workAt || !workAt.complete) {
    // Workplace gone: re-hire next tick.
    v.job = null;
    v.workBuilding = null;
    return false;
  }
  const cap = bd.storageCap(state);
  if (v.carrying) return startHaul(state, v);
  if (v.job === "woodcutter" && state.resources.wood >= cap) return false;
  if (v.job === "farmer" && state.resources.food >= cap) return false;
  if (v.job === "stonecutter" && state.resources.stone >= cap) return false;
  if (!state.flags.storageFull && state.resources.wood >= cap && state.resources.food >= cap) {
    state.flags.storageFull = true;
    state.events.push({ type: "storage-full" });
  }

  if (v.job === "woodcutter") {
    const def = B.BUILDINGS[workAt.type];
    const tree = nearestTile(
      state.world,
      state.world.trees,
      workAt.x, workAt.y,
      def.radius,
    );
    if (tree >= 0) return startGotoTile(state, v, { kind: "chop", target: tree, workLeft: B.CHOP_TICKS }, tree);
  }

  if (v.job === "stonecutter") {
    const def = B.BUILDINGS[workAt.type];
    const rock = nearestTile(
      state.world,
      state.world.rocks,
      workAt.x, workAt.y,
      def.radius,
    );
    if (rock >= 0) return startGotoTile(state, v, { kind: "mine", target: rock, workLeft: B.MINE_TICKS }, rock);
  }

  if (v.job === "farmer") {
    // Ripe crop -> harvest. Empty plot -> plant. Wild berry in radius -> pick.
    let ripe = -1,
      empty = -1;
    for (const [i, plot] of state.world.plots) {
      if (plot.farm !== workAt.id) continue;
      if (plot.readyTick > 0 && state.clock.tick >= plot.readyTick) ripe = i;
      else if (plot.readyTick < 0 && empty < 0) empty = i;
      if (ripe >= 0) break;
    }
    if (ripe >= 0)
      return startGotoTile(state, v, { kind: "harvestPlot", target: ripe, workLeft: B.HARVEST_TICKS }, ripe);
    if (empty >= 0)
      return startGotoTile(state, v, { kind: "plant", target: empty, workLeft: B.PLANT_TICKS }, empty);
    const def = B.BUILDINGS[workAt.type];
    const bush = nearestTile(
      state.world,
      state.world.bushes,
      workAt.x, workAt.y,
      def.radius,
      (i) => !state.world.regrow.has(i),
    );
    if (bush >= 0)
      return startGotoTile(state, v, { kind: "harvestBush", target: bush, workLeft: B.HARVEST_TICKS }, bush);
  }

  if (v.job === "builder") {
    const site = state.buildings.find((b) => !b.complete);
    if (site) {
      const missing = bd.nextMissingRes(site);
      if (missing) {
        if (v.carrying === missing)
          return startGoto(state, v, { kind: "deliver", building: site.id, res: missing }, site);
        if (state.resources[missing] >= 1) {
          const store = nearestStore(state, v);
          if (store)
            return startGoto(state, v, { kind: "fetch", building: store.id, then: site.id, res: missing }, store);
        }
        return false; // that resource is out of storage: builders wait
      }
      return startGoto(state, v, { kind: "build", building: site.id }, site);
    }
  }
  return false;
}

// ---- Task execution.
// Buildings are goals you stand NEXT to: try each open perimeter tile,
// closest first, and take the first one that actually paths (a ring of
// buildings can seal the direct neighbors - diagonals still count).
function startGoto(state, v, task, building) {
  const size = state.world.size;
  const def = B.BUILDINGS[building.type];
  const here = Math.floor(v.y) * size + Math.floor(v.x);
  const candidates = [];
  for (let dy = -1; dy <= def.size; dy++)
    for (let dx = -1; dx <= def.size; dx++) {
      const onEdge = dx === -1 || dy === -1 || dx === def.size || dy === def.size;
      if (!onEdge) continue;
      const x = building.x + dx,
        y = building.y + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const i = y * size + x;
      if (!tilePassable(state.world, i) || state.buildingAt[i] !== -1) continue;
      const cx = (i % size) + 0.5,
        cy = Math.floor(i / size) + 0.5;
      candidates.push([i, (cx - v.x) ** 2 + (cy - v.y) ** 2]);
    }
  candidates.sort((a, b) => a[1] - b[1]);
  for (const [goal] of candidates) {
    const path = here === goal ? [] : findPath(state.world, here, goal, state.buildingAt, { through: state.gateTiles });
    if (!path) continue;
    v.path = path;
    v.task = task;
    v.task.stage = path.length ? "go" : "work";
    if (!path.length && (task.kind === "eat" || task.kind === "drink")) beginNeed(state, v);
    else if (!path.length) v.task.workLeft = v.task.workLeft ?? 0;
    else v.activity = "Walking";
    return true;
  }
  return false;
}

function startGotoTile(state, v, task, tile) {
  const size = state.world.size;
  const here = Math.floor(v.y) * size + Math.floor(v.x);
  const path = here === tile ? [] : findPath(state.world, here, tile, state.buildingAt, { through: state.gateTiles });
  if (!path) return false;
  v.path = path;
  v.task = task;
  v.task.stage = path.length ? "go" : "work";
  if (!path.length && (task.kind === "eat" || task.kind === "drink")) beginNeed(state, v);
  else if (!path.length) v.task.workLeft = v.task.workLeft ?? 0;
  else v.activity = "Walking";
  return true;
}

function startHaul(state, v) {
  const store = nearestStore(state, v);
  if (!store) return false;
  return startGoto(state, v, { kind: "haul", building: store.id, res: v.carrying }, store);
}

function moveAlong(state, v, dt) {
  const speed =
    (B.WALK_TILES_PER_SECOND / B.TICKS_PER_SECOND) *
    (v.age === "child" ? B.CHILD_WALK_MULT : 1);
  let budget = speed * dt;
  while (budget > 0 && v.path.length) {
    const size = state.world.size;
    const node = v.path[0];
    const nx = (node % size) + 0.5,
      ny = Math.floor(node / size) + 0.5;
    const dx = nx - v.x,
      dy = ny - v.y;
    const d = Math.hypot(dx, dy);
    if (d <= budget) {
      v.x = nx;
      v.y = ny;
      v.path.shift();
      budget -= d;
    } else {
      v.x += (dx / d) * budget;
      v.y += (dy / d) * budget;
      if (Math.abs(dx) > 0.05) v.facing = dx > 0 ? 1 : -1;
      budget = 0;
    }
  }
  return v.path.length === 0;
}

function runTask(state, v, dt) {
  const task = v.task;
  if (task.stage === "go") {
    const arrived = moveAlong(state, v, dt);
    if (!arrived) return;
    task.stage = "work";
    if (task.kind === "eat" || task.kind === "drink") beginNeed(state, v);
    if (!v.task) return;
  }
  // stage === "work"
  switch (task.kind) {
    case "eat": {
      v.activity = "Eating";
      task.workLeft -= dt;
      if (task.workLeft <= 0) {
        const take = Math.min(B.EAT_AMOUNT, state.resources.food);
        state.resources.food -= take;
        v.hunger = Math.min(B.MAX_NEED, v.hunger + take);
        v.task = null;
      }
      return;
    }
    case "drink": {
      v.activity = "Drinking";
      task.workLeft -= dt;
      if (task.workLeft <= 0) {
        const take = Math.min(B.DRINK_AMOUNT, state.resources.water);
        state.resources.water -= take;
        v.thirst = Math.min(B.MAX_NEED, v.thirst + take);
        v.task = null;
      }
      return;
    }
    case "drinkWild": {
      v.activity = "Drinking at the water";
      task.workLeft = (task.workLeft ?? B.DRINK_TICKS) - dt;
      if (task.workLeft <= 0) {
        v.thirst = Math.min(B.MAX_NEED, v.thirst + B.DRINK_WILD_AMOUNT);
        v.task = null;
      }
      return;
    }
    case "sleep": {
      v.activity = v.home ? "Sleeping" : "Sleeping rough";
      return; // woken by tickVillager
    }
    case "chop": {
      v.activity = "Chopping wood";
      v.task.workLeft -= dt;
      if (v.task.workLeft <= 0) finishChop(state, v);
      return;
    }
    case "mine": {
      v.activity = "Mining stone";
      v.task.workLeft -= dt;
      if (v.task.workLeft <= 0) finishMine(state, v);
      return;
    }
    case "harvestPlot": {
      v.activity = "Harvesting";
      v.task.workLeft -= dt;
      if (v.task.workLeft <= 0) finishPlot(state, v);
      return;
    }
    case "harvestBush": {
      v.activity = "Picking berries";
      v.task.workLeft -= dt;
      if (v.task.workLeft <= 0) finishBush(state, v);
      return;
    }
    case "plant": {
      v.activity = "Planting";
      v.task.workLeft -= dt;
      if (v.task.workLeft <= 0) {
        const plot = state.world.plots.get(v.task.target);
        if (plot) plot.readyTick = state.clock.tick + B.CROP_GROWTH_TICKS;
        v.task = null;
      }
      return;
    }
    case "fetch": {
      v.activity = `Fetching ${task.res}`;
      task.workLeft = (task.workLeft ?? B.EAT_TICKS) - dt;
      if (task.workLeft <= 0) {
        if (state.resources[task.res] >= 1) {
          state.resources[task.res] -= 1;
          v.carrying = task.res;
          const site = state.buildings.find((b) => b.id === task.then);
          if (site)
            startGoto(state, v, { kind: "deliver", building: site.id, res: task.res }, site);
          else {
            // Site gone: put it back.
            state.resources[task.res] = Math.min(bd.storageCap(state), state.resources[task.res] + 1);
            v.carrying = null;
            v.task = null;
          }
        } else v.task = null;
      }
      return;
    }
    case "deliver": {
      v.activity = `Delivering ${task.res}`;
      if (v.carrying !== task.res) {
        v.task = null;
        return;
      }
      const site = state.buildings.find((b) => b.id === task.building);
      if (!site || site.complete) {
        v.carrying = null; // put it back
        state.resources[task.res] = Math.min(bd.storageCap(state), state.resources[task.res] + 1);
        v.task = null;
        return;
      }
      const need = B.BUILDINGS[site.type].cost[task.res] ?? 0;
      if ((site.deliveredRes[task.res] ?? 0) >= need) return; // fully supplied; keep holding it
      site.deliveredRes[task.res] = (site.deliveredRes[task.res] ?? 0) + 1;
      site.delivered = (site.delivered ?? 0) + 1;
      v.carrying = null;
      v.task = null;
      return;
    }
    case "build": {
      v.activity = "Building";
      const site = state.buildings.find((b) => b.id === task.building);
      if (!site || site.complete) {
        v.task = null;
        return;
      }
      if (bd.nextMissingRes(site)) {
        v.task = null; // a resource ran short: go fetch next decide()
        return;
      }
      site.workDone += dt;
      if (site.workDone >= site.workNeeded) bd.siteComplete(state, site);
      return;
    }
    case "haul": {
      v.activity = "Hauling";
      const store = state.buildings.find((b) => b.id === task.building);
      if (!store || v.carrying !== task.res) {
        v.task = null;
        return;
      }
      const amount = v.carryAmount || 1;
      state.resources[task.res] = Math.min(bd.storageCap(state), state.resources[task.res] + amount);
      v.carrying = null;
      v.carryAmount = 0;
      v.task = null;
      return;
    }
    default:
      v.task = null;
  }
}

function beginNeed(state, v) {
  const kind = v.task.kind;
  v.task.workLeft = kind === "eat" ? B.EAT_TICKS : B.DRINK_TICKS;
}

function finishChop(state, v) {
  const i = v.task.target;
  if (state.world.feature[i] === F_TREE) {
    state.world.feature[i] = F_STUMP;
    state.world.trees.delete(i);
    state.world.regrow.set(i, { stage: "sapling", readyTick: state.clock.tick + B.DAY_TICKS * 2 });
    v.carrying = "wood";
    v.carryAmount = B.TREE_WOOD;
    state.events.push({ type: "chopped", x: i % state.world.size, y: Math.floor(i / state.world.size) });
  }
  v.task = null;
}

function finishMine(state, v) {
  const i = v.task.target;
  if (state.world.rocks.has(i)) {
    state.world.feature[i] = F_NONE;
    state.world.rocks.delete(i); // rocks are finite: no regrow
    v.carrying = "stone";
    v.carryAmount = B.ROCK_STONE;
  }
  v.task = null;
}

function finishPlot(state, v) {
  const i = v.task.target;
  const plot = state.world.plots.get(i);
  if (plot && plot.readyTick > 0 && state.clock.tick >= plot.readyTick) {
    plot.readyTick = -1; // farmed out; replant next cycle
    v.carrying = "food";
    v.carryAmount = B.CROP_FOOD;
  }
  v.task = null;
}

function finishBush(state, v) {
  const i = v.task.target;
  if (state.world.feature[i] === F_BUSH && !state.world.regrow.has(i)) {
    state.world.regrow.set(i, { stage: "bush", readyTick: state.clock.tick + B.BUSH_REGROW_TICKS });
    v.carrying = "food";
    v.carryAmount = B.BUSH_FOOD;
  }
  v.task = null;
}

// ---- Idle charm: wander near home/work, chat with neighbors (pillar 8).
function idleAround(state, v, dt) {
  if (v.bubble === "chat") return;
  // Chance to start a wander, biased around the workplace when employed.
  if (!v.path.length && state.rng.chance(0.01 * dt)) {
    const size = state.world.size;
    const anchor = v.workBuilding
      ? state.buildings.find((b) => b.id === v.workBuilding)
      : null;
    const ax = anchor ? anchor.x + 1 : v.x;
    const ay = anchor ? anchor.y + 1 : v.y;
    for (let tries = 0; tries < 6; tries++) {
      const angle = state.rng.range(0, Math.PI * 2);
      const r = state.rng.range(1, 5);
      const x = Math.round(ax + Math.cos(angle) * r),
        y = Math.round(ay + Math.sin(angle) * r);
      if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) continue;
      const i = y * size + x;
      if (!tilePassable(state.world, i) || state.buildingAt[i] !== -1) continue;
      const here = Math.floor(v.y) * size + Math.floor(v.x);
      const path = findPath(state.world, here, i, state.buildingAt, { through: state.gateTiles });
      if (path) {
        v.path = path;
        v.activity = "Wandering";
        break;
      }
    }
  }
  maybeChat(state, v);
}

function maybeChat(state, v) {
  if (v.bubble) return;
  const tick = state.clock.tick;
  if (!state.rng.chance(0.0005)) return;
  for (const other of state.villagers) {
    if (other === v || other.dead || other.task) continue;
    if (Math.hypot(other.x - v.x, other.y - v.y) > 1.6) continue;
    setBubble(v, tick, "chat", 300);
    setBubble(other, tick, "chat", 300);
    v.activity = "Chatting";
    other.activity = "Chatting";
    v.path = [];
    other.path = [];
    return;
  }
}

// Add water tiles as a set for drinking lookups (built once per world).
export function indexWaterTiles(world) {
  world.waterTiles = new Set();
  for (let i = 0; i < world.terrain.length; i++)
    if (world.terrain[i] === 2) world.waterTiles.add(i);
}

function hasLandNeighbor(world, i) {
  const size = world.size;
  const x = i % size,
    y = Math.floor(i / size);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx,
      ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
    if (world.terrain[ny * size + nx] !== 2) return true;
  }
  return false;
}
