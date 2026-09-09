// Night raids (research doc 04 section 3). Monsters spawn from nests at
// nightfall and march on the village center under the RtR pathing rule
// (doc 04 section 3.4, the acceptance core of M2):
//   - shortest OPEN route if one exists -> they never touch walls;
//   - otherwise the path of least resistance = least time-to-break, and
//     they chew through whatever is cheapest on the way.
// Survivors crumble at dawn: calm days, panicked nights (pillar 2). There
// is NO villager hiding mechanic - villagers swing back where they stand
// (standing veto 3).
import * as B from "./balance.js";
import { tilePassable } from "./world.js";
import { findPath, adjacentOpen } from "./path.js";
import * as bd from "./buildings.js";
import { killVillager } from "./villager.js";

export function createRaidState() {
  return {
    active: false,
    campHit: false, // one "the camp is under attack" alarm per raid
  };
}

// ---- Raid size. Escalation is nests + days + threat (doc 04 sections
// 2.3/2.4); village wealth is deliberately absent from the formula.
export function raidSize(state) {
  const nests = state.buildings.filter((b) => b.type === "nest" && b.complete).length;
  const days = Math.min(B.RAID_CAP, Math.max(0, state.clock.day - B.RAID_START_DAY));
  const threatMult = 1 + (state.corruption?.threat ?? 0) * B.THREAT_SPAWN_MULT;
  const raw =
    B.RAID_BASE_COUNT + B.RAID_PER_DAY * days + B.RAID_PER_NEST * Math.max(0, nests - 1);
  return Math.max(1, Math.min(B.RAID_MAX_COUNT, Math.round(raw * threatMult)));
}

export function spawnRaid(state) {
  const nests = state.buildings.filter((b) => b.type === "nest" && b.complete);
  if (!nests.length) return 0;
  const size = state.world.size;
  let count = Math.min(raidSize(state), B.MONSTER_HARD_CAP - state.monsters.length);
  let spawned = 0;
  let nestI = 0;
  while (count > 0 && nestI <= nests.length * 3) {
    const nest = nests[nestI % nests.length];
    nestI++;
    const at = nest.y * size + nest.x;
    const spot = adjacentOpen(state.world, at, at, state.buildingAt);
    if (spot < 0) continue; // sealed in: this spawn slot is lost
    spawnMonsterAt(state, pickKind(state), (spot % size) + 0.5, Math.floor(spot / size) + 0.5);
    spawned++;
    count--;
  }
  if (spawned > 0) {
    state.raid.active = true;
    state.raid.campHit = false;
    state.events.push({ type: "raid-start", count: spawned });
  }
  return spawned;
}

// One construction site for every monster entering the world: raids,
// slime splits, and meteor-sprung emberlings all look identical.
export function spawnMonsterAt(state, kind, x, y) {
  const def = B.MONSTERS[kind];
  const m = {
    id: state.nextId++,
    kind,
    x,
    y,
    hp: def.hp,
    facing: 1,
    path: [],
    pathI: 0,
    attackCd: 0,
    chewCd: 0,
    repathAt: 0,
  };
  state.monsters.push(m);
  return m;
}

function pickKind(state) {
  const day = state.clock.day;
  if (day < B.BLOT_ARRIVAL_DAY) return "husk";
  const roll = state.rng.next();
  // Each ARRIVED species claims a band off the top of the roll; husks keep
  // whatever remains, so they thin out as the menagerie arrives. Bands of
  // species not yet on the field stay unclaimed (a day-5 roll of 0.4 is a
  // husk, not a blot riding the wraith's absent share).
  let band = 0;
  if (day >= B.EMBERLING_ARRIVAL_DAY && roll < (band += B.EMBERLING_CHANCE))
    return "emberling";
  if (day >= B.WRAITH_ARRIVAL_DAY && roll < (band += B.WRAITH_CHANCE)) return "wraith";
  if (roll < (band += B.BLOT_CHANCE)) return "blot";
  return "husk";
}

// ---- Per-tick driver, called from stepGame.
export function tickMonsters(state, dt) {
  tickTowers(state, dt);
  if (!state.monsters.length) return;

  if (state.flags.wallsDirty) {
    state.breakCost = null; // rebuilt lazily by the breach search
    state.phaseTiles = null; // wall tiles a wraith may glide through
    for (const m of state.monsters) {
      m.path = []; // re-evaluate the rule
      m.repathAt = 0;
    }
    state.flags.wallsDirty = false;
  }

  const size = state.world.size;
  const camp = state.buildings.find((b) => b.type === "camp");
  for (const m of state.monsters) {
    if (m.hp <= 0 || m.held) continue; // held: suspended mid-air by the god hand
    m.attackCd = Math.max(0, m.attackCd - dt);
    m.chewCd = Math.max(0, m.chewCd - dt);
    const def = B.MONSTERS[m.kind];

    // Melee first: a villager in reach takes all the monster's attention.
    const prey = nearestVillager(state, m, B.MONSTER_ENGAGE_RANGE);
    if (prey) {
      if (m.attackCd <= 0) {
        m.attackCd = def.attackTicks;
        hurtVillager(state, prey, def.damage);
      }
      strikeBack(state, prey, dt);
      continue; // engaged: no marching while the duel lasts
    }

    // Ranged monsters (RtR fire elemental): stop at range and shoot the
    // nearest villager, else any finished village building - walls included.
    if (def.ranged && rangedStrike(state, m, def)) continue;

    // A failed route must back off too: repathing a boxed-in raider every
    // tick is a full-grid A* storm (two searches x monsters x every tick).
    if (state.clock.tick >= m.repathAt) {
      m.path = routeToCamp(state, m, camp);
      if (!m.path.length) m.path = breachRoute(state, m, camp); // chew instead
      m.pathI = 0;
      m.repathAt = state.clock.tick + (m.path.length ? 900 : 240);
      if (!m.path.length) continue; // boxed in entirely: mill here
    }

    // March; the tile ahead being a building means chew, not step - unless
    // you are a wraith and the building is a bare wall, which you glide
    // through (gates and true buildings still stop you).
    const speed = (def.speed / B.TICKS_PER_SECOND) * dt;
    let budget = speed;
    while (budget > 0 && m.pathI < m.path.length) {
      const node = m.path[m.pathI];
      if (state.buildingAt[node] !== -1) {
        if (!(def.phaseWalls && phaseTiles(state).has(node))) {
          const b = state.buildings.find((b2) => b2.id === state.buildingAt[node]);
          if (!b) {
            m.path = []; // rubble: repath next tick
            break;
          }
          if (m.chewCd <= 0) {
            m.chewCd = def.attackTicks;
            chew(state, b, def.damage);
          }
          break; // no movement while chewing
        }
      }
      const nx = (node % size) + 0.5,
        ny = Math.floor(node / size) + 0.5;
      const d = Math.hypot(nx - m.x, ny - m.y);
      if (Math.abs(nx - m.x) > 0.05) m.facing = nx > m.x ? 1 : -1;
      if (d <= budget) {
        m.x = nx;
        m.y = ny;
        m.pathI++;
        budget -= d;
      } else {
        m.x += ((nx - m.x) / d) * budget;
        m.y += ((ny - m.y) / d) * budget;
        budget = 0;
      }
    }
    // Arrived next to the village center: this is the raid's whole point.
    if (m.pathI >= m.path.length && camp) {
      const c = bd.buildingCenter(camp);
      if (Math.hypot(c.x - m.x, c.y - m.y) < 2.3 && m.chewCd <= 0) {
        m.chewCd = def.attackTicks;
        chew(state, camp, def.damage);
      }
    }
  }
  state.monsters = state.monsters.filter((m) => m.hp > 0);
}

// Wraith passability: wall tiles (fence/stone wall, never gates) a phaser
// may glide through. Cached until walls change, like the breach grid.
function phaseTiles(state) {
  if (!state.phaseTiles) {
    state.phaseTiles = new Set();
    for (const b of state.buildings) {
      const d = B.BUILDINGS[b.type];
      if (!d.wall || d.gate) continue;
      for (const i of bd.footprint(b.type, b.x, b.y)) state.phaseTiles.add(i);
    }
  }
  return state.phaseTiles;
}

// Emberling ranged attack. Returns true when it fired (or held a bead on
// cooldown) - the caller then skips marching this tick.
function rangedStrike(state, m, def) {
  const spec = def.ranged;
  const cx = m.x,
    cy = m.y;
  let target = null,
    kind = null,
    bestD = spec.range;
  for (const v of state.villagers) {
    if (v.dead || v.held) continue;
    const d = Math.hypot(v.x - cx, v.y - cy);
    if (d < bestD) {
      bestD = d;
      target = v;
      kind = "villager";
    }
  }
  if (!target) {
    for (const b of state.buildings) {
      if (!b.complete || B.BUILDINGS[b.type].corrupted) continue;
      const c = bd.buildingCenter(b);
      const d = Math.hypot(c.x - cx, c.y - cy);
      if (d < bestD) {
        bestD = d;
        target = b;
        kind = "building";
      }
    }
  }
  if (!target) return false;
  if (m.attackCd > 0) return true; // reloading: hold position
  m.attackCd = def.attackTicks;
  const tx = kind === "villager" ? target.x : bd.buildingCenter(target).x;
  const ty = kind === "villager" ? target.y : bd.buildingCenter(target).y;
  state.projectiles.push({ x: cx, y: cy, tx, ty, t: 0, dur: 0.16, kind: "fireball" });
  if (kind === "villager") hurtVillager(state, target, def.damage);
  else {
    target.hp -= def.damage;
    if (target.type === "camp" && !state.raid.campHit) {
      state.raid.campHit = true;
      state.events.push({ type: "camp-hit", x: target.x, y: target.y });
    }
    finishBuildingIfDestroyed(state, target);
  }
  return true;
}

// The RtR rule, as a pair of searches (doc 04 section 3.4). routeToCamp
// answers only the first half: the FREE route this monster can walk without
// breaking anything - open ground for most, bare walls erased for phasers
// (gates and true buildings still stop a wraith, so breaching stays
// meaningful). Empty means "no free route": the caller (tickMonsters) then
// falls back to the least-time-to-break breach route and chews.
export function routeToCamp(state, m, camp) {
  if (!camp) return [];
  const size = state.world.size;
  const here = Math.floor(m.y) * size + Math.floor(m.x);
  const goal = camp.y * size + camp.x;
  if (B.MONSTERS[m.kind].phaseWalls) {
    const walls = phaseTiles(state);
    return (
      findPath(state.world, here, goal, state.buildingAt, {
        blockedFn: (i) => state.buildingAt[i] !== -1 && !walls.has(i),
      }) ?? []
    );
  }
  return findPath(state.world, here, goal, state.buildingAt) ?? [];
}

// The fallback half of the rule: a weighted search where entering a
// structure costs its remaining chew time - the path of least resistance.
function breachRoute(state, m, camp) {
  const size = state.world.size;
  const here = Math.floor(m.y) * size + Math.floor(m.x);
  const goal = camp.y * size + camp.x;
  const cost = breachCost(state);
  return findPath(state.world, here, goal, state.buildingAt, { cost }) ?? [];
}

// Time-to-break grid, cached until walls change. Costs use one reference
// dps (the husk's): only the ORDERING of structures matters for routing.
// Non-structure blockers (water, trees, rocks) are never breachable.
function breachCost(state) {
  if (!state.breakCost) {
    const total = state.world.size * state.world.size;
    const grid = new Float32Array(total);
    const dpsPerTick = B.MONSTERS.husk.damage / B.MONSTERS.husk.attackTicks;
    for (const b of state.buildings) {
      const chewTicks = b.hp / dpsPerTick;
      for (const i of bd.footprint(b.type, b.x, b.y)) grid[i] = chewTicks;
    }
    state.breakCost = grid;
  }
  return (i) => {
    if (state.buildingAt[i] !== -1) return 1 + state.breakCost[i];
    return tilePassable(state.world, i) ? 1 : Infinity;
  };
}

// ---- Damage helpers.

// The resist/vulnerability matrix, applied in one place (doc 04 section
// 5.1). Every damage source in the game funnels through here: tower bolts,
// villager fists, spells, Grab throws. Water only ever matters to thrown
// creatures - it is the emberling's death sentence and nobody else's.
export function damageMonster(state, m, amount, type = "crush") {
  const mult = B.MONSTERS[m.kind].resists?.[type] ?? 1;
  m.hp -= amount * mult;
  if (m.hp <= 0) killMonster(state, m);
  return m.hp <= 0;
}

function chew(state, b, damage) {
  damageBuilding(state, b, damage);
}

// Shared rite for any building taking damage - monster chew, tower fire,
// spell blast: raise the camp alarm once per raid, and destroy at 0.
// opts.raidAlarm: meteor-class friendly fire stays silent about raiders.
export function damageBuilding(state, b, amount, opts = {}) {
  b.hp -= amount;
  if (b.type === "camp" && !state.raid.campHit && opts.raidAlarm !== false) {
    state.raid.campHit = true;
    state.events.push({ type: "camp-hit", x: b.x, y: b.y });
  }
  finishBuildingIfDestroyed(state, b);
}

// Shared death rite for buildings chewed by monsters or shot by towers:
// remove, and if it was a nest, pause corruption rebuilds.
function finishBuildingIfDestroyed(state, b) {
  if (b.hp > 0) return;
  const wasNest = B.BUILDINGS[b.type].corrupted;
  bd.destroyBuilding(state, b);
  if (wasNest) {
    state.corruption.nestCooldownUntil =
      state.clock.tick + B.NEST_REBUILD_DELAY_DAYS * B.DAY_TICKS;
    state.events.push({ type: "nest-destroyed", x: b.x, y: b.y });
  }
}

function hurtVillager(state, v, damage) {
  v.health -= damage;
  if (v.health <= 0) killVillager(state, v, "raiders");
}

// Villagers swing back at whatever is chewing on them (doc 04 section 4.3).
// Bare hands = crushing: blots barely notice, which is the point of the
// matrix - villagers hold the line against husks, not against everything.
function strikeBack(state, v, dt) {
  v.attackCd = Math.max(0, (v.attackCd ?? 0) - dt);
  if (v.attackCd > 0) return;
  const size = state.world.size;
  let best = null,
    bestD = B.VILLAGER_SWING_RANGE;
  for (const m of state.monsters) {
    if (m.hp <= 0 || m.held) continue;
    const d = Math.hypot(m.x - v.x, m.y - v.y);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  if (!best) return;
  v.attackCd = B.VILLAGER_ATTACK_TICKS;
  damageMonster(state, best, B.VILLAGER_DAMAGE, B.VILLAGER_DAMAGE_TYPE);
}

export function killMonster(state, m) {
  m.hp = 0;
  state.stats.slain++;
  const def = B.MONSTERS[m.kind];
  if (def.splits && state.monsters.length < B.MONSTER_HARD_CAP) {
    for (let i = 0; i < def.splits.count; i++) {
      spawnMonsterAt(
        state,
        def.splits.kind,
        m.x + (i - 0.5) * 0.4,
        m.y + (i % 2 ? 0.3 : -0.3),
      );
    }
  }
}

// ---- Towers (M3: ammo-fed, matrix-aware). Every shot spends one bolt
// from the village pool (RtR bow towers pull arrows from storage); sentries
// deal piercing, storm pylons magic - WHICH tower is built is the
// counter-match decision the resist matrix exists to create.
function tickTowers(state, dt) {
  advanceProjectiles(state, dt);
  for (const b of state.buildings) {
    if (!b.complete || !B.BUILDINGS[b.type].tower) continue;
    b.reload = Math.max(0, (b.reload ?? 0) - dt);
    if (b.reload > 0) continue;
    const spec = B.BUILDINGS[b.type].tower;
    const size = state.world.size;
    const cx = b.x + 0.5,
      cy = b.y + 0.5;
    let target = null,
      kind = null,
      bestD = spec.range;
    for (const m of state.monsters) {
      if (m.hp <= 0 || m.held) continue; // the god's hand is not a target
      const d = Math.hypot(m.x - cx, m.y - cy);
      if (d < bestD) {
        bestD = d;
        target = m;
        kind = "monster";
      }
    }
    if (!target) {
      for (const b2 of state.buildings) {
        if (!b2.complete || !B.BUILDINGS[b2.type].corrupted) continue;
        const d = Math.hypot(b2.x + 0.5 - cx, b2.y + 0.5 - cy);
        if (d < bestD) {
          bestD = d;
          target = b2;
          kind = "nest";
        }
      }
    }
    if (!target) continue;
    // The empty-magazine check: towers hold, they don't improvise. One
    // nudge per night so a dry pool reads as a decision point, not spam.
    if ((state.resources.bolts ?? 0) < 1) {
      if (B.TOWERS_WARN_EMPTY && !state.flags.boltsWarned) {
        state.flags.boltsWarned = true;
        state.events.push({ type: "bolts-out" });
      }
      continue;
    }
    state.resources.bolts -= 1;
    b.reload = spec.reload;
    const tx = kind === "monster" ? target.x : target.x + 0.5;
    const ty = kind === "monster" ? target.y : target.y + 0.5;
    state.projectiles.push({ x: cx, y: cy, tx, ty, t: 0, dur: 0.12, kind: "bolt" });
    if (kind === "monster") damageMonster(state, target, spec.damage, spec.type);
    else damageBuilding(state, target, spec.damage);
  }
}

// Bolt cosmetics: damage is instant on fire; these only draw the arc.
function advanceProjectiles(state, dt) {
  if (!state.projectiles.length) return;
  for (const p of state.projectiles) p.t += dt / B.TICKS_PER_SECOND;
  state.projectiles = state.projectiles.filter((p) => p.t < p.dur);
}

// ---- Night bookkeeping. Called from stepGame on phase edges.
export function raidsAtNightfall(state) {
  if (state.clock.day < B.RAID_START_DAY) return;
  spawnRaid(state);
}

export function raidsAtDawn(state) {
  if (!state.monsters.length && !state.raid.active) return;
  state.monsters = [];
  state.raid.active = false;
  state.raid.campHit = false;
  state.events.push({ type: "monsters-retreat" });
}

function nearestVillager(state, m, range) {
  let best = null,
    bestD = range;
  for (const v of state.villagers) {
    if (v.dead || v.held) continue; // airborne villagers are out of reach
    const d = Math.hypot(v.x - m.x, v.y - m.y);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}
