// The god hand (research doc 03 section 5): influence economy and the five
// M3 spells. Influence regenerates as a share of a population-scaled maximum
// - the god grows with the village (RtR's own rule). Since M4 the per-
// villager contribution scales with their FAITH (doc 03 section 1.4:
// "50% faith = 50% of their potential") - a doubting village is a poorer
// god, which is the whole reason to keep them believing. Every damage-
// dealing path funnels through monsters.damageMonster so the resist matrix
// stays in one place. NOTHING here touches the DOM.
import * as B from "./balance.js";
import { T_WATER } from "./world.js";
import * as bd from "./buildings.js";
import { damageMonster, damageBuilding, spawnMonsterAt } from "./monsters.js";
import { killVillager } from "./villager.js";

export function createGodState() {
  return {
    influence: 0,
    cooldown: 0,
    held: null, // { kind: 'monster'|'villager'|'nomad', id } while lifted
    flight: null, // thrown-creature arc: { kind, id, x0, y0, x1, y1, t, dur }
    meteors: [], // pending impacts: { x, y, t, dur }
  };
}

export function influenceMax(state) {
  let max = 0;
  for (const v of state.villagers) {
    if (v.dead) continue;
    const worth = v.age === "child" ? B.INFLUENCE_PER_CHILD : B.INFLUENCE_PER_ADULT;
    max += worth * (v.faith ?? B.FAITH_START) / B.MAX_NEED;
  }
  return Math.round(max);
}

// Per-sim-tick driver, called from stepGame: regen, cast cooldown, falling
// meteors, and the arc of a thrown creature. Influence never sits above
// the cap: a rite that lands on a full purse is spent (essence caps too).
export function tickSpells(state, dt) {
  const god = state.god;
  const max = Math.max(influenceMax(state), 1);
  if (god.influence < max) god.influence = Math.min(max, god.influence + max * (B.INFLUENCE_REGEN_PER_DAY / B.DAY_TICKS) * dt);
  else if (god.influence > max) god.influence = max;
  god.cooldown = Math.max(0, god.cooldown - dt);

  for (const meteor of god.meteors) {
    meteor.t += dt;
    if (meteor.t >= meteor.dur) meteorImpact(state, meteor.x, meteor.y);
  }
  god.meteors = god.meteors.filter((m) => m.t < m.dur);

  const f = god.flight;
  if (f) {
    f.t += dt;
    const p = Math.min(1, f.t / f.dur);
    const creature = findCreature(state, f.kind, f.id);
    if (!creature) {
      god.flight = null;
    } else {
      creature.x = f.x0 + (f.x1 - f.x0) * p;
      creature.y = f.y0 + (f.y1 - f.y0) * p;
      creature.heldZ = Math.sin(Math.PI * p) * 0.9; // arc, in tiles
      if (p >= 1) {
        god.flight = null;
        creature.held = false;
        creature.heldZ = 0;
        landCreature(state, creature, f.kind, f.impactSpeed, f.x1, f.y1);
      }
    }
  }
}

// Shared cost gate: cooldown first (a recharging hand takes no coin), then
// influence. Nothing is charged on a denied or whiffed cast.
function spend(state, key) {
  const spec = B.SPELLS[key];
  if (state.god.cooldown > 0) return { ok: false, reason: "The god hand is recharging" };
  if (state.god.influence < spec.cost)
    return { ok: false, reason: `Not enough influence — ${spec.cost} needed` };
  state.god.influence -= spec.cost;
  state.god.cooldown = spec.cooldown ?? 0;
  return { ok: true };
}

// Tap-to-cast dispatch. (x, y) are world tile coordinates (floats).
export function castSpell(state, key, x, y) {
  switch (key) {
    case "lightning":
      return castLightning(state, x, y);
    case "meteor":
      return castMeteor(state, x, y);
    case "heal":
      return castHeal(state, x, y);
    case "mend":
      return castMend(state, x, y);
    default:
      return { ok: false, reason: "Unknown spell" };
  }
}

function castLightning(state, x, y) {
  const spec = B.SPELLS.lightning;
  // Creatures first, nests as fallback (towers use the same order). The
  // target is found BEFORE the purse opens: a whiffed bolt costs nothing
  // and never starts the recharge.
  let best = null,
    bestD = spec.tapRange;
  for (const m of state.monsters) {
    if (m.hp <= 0 || m.held) continue;
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < bestD) {
      bestD = d;
      best = { kind: "monster", obj: m };
    }
  }
  if (!best) {
    for (const b of state.buildings) {
      if (!b.complete || !B.BUILDINGS[b.type].corrupted) continue;
      const d = Math.hypot(b.x + 0.5 - x, b.y + 0.5 - y);
      if (d < bestD) {
        bestD = d;
        best = { kind: "building", obj: b };
      }
    }
  }
  if (!best) return { ok: false, reason: "No target there — strike a raider or a nest" };
  const gate = spend(state, "lightning");
  if (!gate.ok) return gate;
  state.projectiles.push({ x, y, t: 0, dur: 0.25, kind: "lightning" });
  if (best.kind === "monster") damageMonster(state, best.obj, spec.damage, spec.damageType);
  else damageBuilding(state, best.obj, spec.damage);
  return { ok: true };
}

function castMeteor(state, x, y) {
  const gate = spend(state, "meteor");
  if (!gate.ok) return gate;
  // Clamp onto the map; the fall is telegraphed by a growing shadow.
  state.god.meteors.push({
    x: Math.max(1, Math.min(state.world.size - 1, x)),
    y: Math.max(1, Math.min(state.world.size - 1, y)),
    t: 0,
    dur: B.SPELLS.meteor.fallTicks,
  });
  return { ok: true };
}

function meteorImpact(state, x, y) {
  const spec = B.SPELLS.meteor;
  state.projectiles.push({ x, y, t: 0, dur: 0.35, kind: "impact" });
  for (const m of state.monsters) {
    if (m.hp <= 0 || m.held) continue;
    if (Math.hypot(m.x - x, m.y - y) <= spec.radius) damageMonster(state, m, spec.damage, spec.damageType);
  }
  for (const v of [...state.villagers]) {
    if (v.dead || v.held) continue;
    if (Math.hypot(v.x - x, v.y - y) <= spec.radius) {
      v.health -= spec.damage;
      v.faith = Math.max(0, v.faith + B.METEOR_HURT_FAITH); // the rock was YOURS
      if (v.health <= 0) killVillager(state, v, "the god's wrath");
    }
  }
  for (const b of [...state.buildings]) {
    const c = bd.buildingCenter(b);
    if (Math.hypot(c.x - x, c.y - y) <= spec.radius)
      damageBuilding(state, b, spec.buildingDamage, { raidAlarm: false });
  }
  // Doc 04 section 1.7: sometimes the sky sends a fire spirit instead.
  if (state.rng.chance(spec.emberlingChance)) {
    const at = nearestDryTile(state, x, y);
    if (at) {
      spawnMonsterAt(state, "emberling", at.x, at.y);
      state.events.push({ type: "emberling-sprung", x: at.x, y: at.y });
    }
  }
  state.events.push({ type: "meteor-impact", x, y });
}

function castHeal(state, x, y) {
  const spec = B.SPELLS.heal;
  const hurt = state.villagers.filter(
    (v) => !v.dead && !v.held && v.health < B.MAX_NEED && Math.hypot(v.x - x, v.y - y) <= spec.radius,
  );
  if (!hurt.length) return { ok: false, reason: "No one hurt there" };
  const gate = spend(state, "heal");
  if (!gate.ok) return gate;
  for (const v of hurt) {
    v.health = Math.min(B.MAX_NEED, v.health + spec.amount);
    // Being visibly mended by the god is the strongest sermon there is.
    v.faith = Math.min(B.MAX_NEED, v.faith + B.HEAL_FAITH);
  }
  state.projectiles.push({ x, y, t: 0, dur: 0.4, kind: "heal", radius: spec.radius });
  return { ok: true };
}

function castMend(state, x, y) {
  const spec = B.SPELLS.mend;
  const broken = state.buildings.filter((b) => {
    if (!b.complete || B.BUILDINGS[b.type].corrupted) return false; // nests resist
    const c = bd.buildingCenter(b);
    return b.hp < B.BUILDINGS[b.type].hp && Math.hypot(c.x - x, c.y - y) <= spec.radius;
  });
  if (!broken.length) return { ok: false, reason: "Nothing broken there" };
  const gate = spend(state, "mend");
  if (!gate.ok) return gate;
  for (const b of broken) b.hp = Math.min(B.BUILDINGS[b.type].hp, b.hp + spec.amount);
  state.projectiles.push({ x, y, t: 0, dur: 0.4, kind: "mend", radius: spec.radius });
  return { ok: true };
}

// ---- Grab (the physical god hand; doc 03 section 5: RtR's only way to
// move a creature by hand). Pickup charges; carrying is free; the fling is
// the damage dial - a gentle drop sets down, a hard throw crushes, and an
// emberling that lands in water dies for it.
export function grabAt(state, x, y) {
  if (state.god.held || state.god.flight) return { ok: false, reason: "Your hand is full" };
  let best = null,
    bestD = B.GRAB_PICKUP_RANGE;
  for (const m of state.monsters) {
    if (m.hp <= 0 || m.held) continue;
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < bestD) {
      bestD = d;
      best = { kind: "monster", obj: m };
    }
  }
  for (const v of state.villagers) {
    if (v.dead || v.held) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < bestD) {
      bestD = d;
      best = { kind: "villager", obj: v };
    }
  }
  for (const n of state.nomads) {
    if (n.held) continue;
    const d = Math.hypot(n.x - x, n.y - y);
    if (d < bestD) {
      bestD = d;
      best = { kind: "nomad", obj: n };
    }
  }
  if (!best) return { ok: false, reason: "Nothing within reach of your hand" };
  const gate = spend(state, "grab");
  if (!gate.ok) return gate;
  state.god.held = { kind: best.kind, id: best.obj.id };
  best.obj.held = true;
  best.obj.heldZ = 0.6;
  best.obj.path = [];
  best.obj.pathI = 0;
  if (best.kind === "villager") {
    best.obj.task = null;
    // Being plucked skyward by an unseen hand is unnerving (doc 03: god
    // actions are judged; grabbing mobs reads as negative).
    best.obj.faith = Math.max(0, best.obj.faith + B.GRAB_VILLAGER_FAITH);
  }
  return { ok: true, kind: best.kind };
}

// While carried the creature rides the pointer (already in world coords).
export function moveHeld(state, x, y) {
  const held = state.god.held;
  if (!held) return;
  const creature = findCreature(state, held.kind, held.id);
  if (!creature) {
    state.god.held = null;
    return;
  }
  const size = state.world.size;
  creature.x = Math.max(0.5, Math.min(size - 0.5, x));
  creature.y = Math.max(0.5, Math.min(size - 0.5, y));
}

// (dx, dy): throw displacement in tiles; flingSpeed: release velocity in
// tiles/s - the damage dial. Zero speed = a set-down at the carried spot.
export function releaseHeld(state, dx, dy, flingSpeed = 0) {
  const held = state.god.held;
  if (!held) return { ok: false, reason: "Nothing in hand" };
  const creature = findCreature(state, held.kind, held.id);
  state.god.held = null;
  if (!creature) return { ok: false, reason: "It slipped away" };
  const dist = Math.hypot(dx, dy);
  if (!dist || flingSpeed < B.GRAB_MIN_THROW_SPEED) {
    // Set down: never in water - nudge to dry ground if the pointer is lazy.
    const at = nearestDryTile(state, creature.x, creature.y);
    creature.x = at ? at.x : creature.x;
    creature.y = at ? at.y : creature.y;
    creature.held = false;
    creature.heldZ = 0;
    return { ok: true, setDown: true };
  }
  const dur = Math.max(B.GRAB_MIN_FLY_TICKS, dist * B.GRAB_FLY_TICKS_PER_TILE);
  state.god.flight = {
    kind: held.kind,
    id: held.id,
    x0: creature.x,
    y0: creature.y,
    x1: creature.x + dx,
    y1: creature.y + dy,
    t: 0,
    dur,
    impactSpeed: flingSpeed,
  };
  return { ok: true };
}

function landCreature(state, creature, kind, impactSpeed, x, y) {
  const size = state.world.size;
  const ti = Math.floor(y) * size + Math.floor(x);
  const inWater = state.world.terrain[ti] === T_WATER;
  if (inWater) {
    // RtR rule (doc 04 section 1.7): fire elementals take huge water
    // damage; everyone else scrambles to shore, wet and cross.
    const mult = B.MONSTERS[creature.kind]?.resists?.water ?? 1;
    if (kind === "monster" && mult > 1) {
      damageMonster(state, creature, GRAB_DROWN_DAMAGE * mult, "water");
      state.events.push({ type: "grab-land", x, y, splash: true });
      return;
    }
    const at = nearestDryTile(state, x, y);
    if (at) {
      creature.x = at.x;
      creature.y = at.y;
    }
    creature.health = (creature.health ?? B.MAX_NEED) - 3;
    if (kind === "villager" && creature.health <= 0) killVillager(state, creature, "drowning");
    else if (kind === "monster" && creature.health <= 0) damageMonster(state, creature, 999, "crush");
    state.events.push({ type: "grab-land", x, y, splash: true });
    return;
  }
  if (kind === "monster") {
    const dmg = Math.min(B.GRAB_MONSTER_MAX_DROP, Math.max(3, Math.round(impactSpeed * 1.6)));
    damageMonster(state, creature, dmg, "crush");
  } else if (impactSpeed > 3) {
    const dmg = Math.min(B.GRAB_VILLAGER_MAX_DROP, Math.max(1, Math.round(impactSpeed * 0.9)));
    creature.health = (creature.health ?? B.MAX_NEED) - dmg;
    if (creature.health <= 0) killVillager(state, creature, "a hard landing");
  }
  state.events.push({ type: "grab-land", x, y });
}

// Non-water, unoccupied standable tile near (x, y), or null if the pointer
// is out at sea entirely.
function nearestDryTile(state, x, y) {
  const size = state.world.size;
  const cx = Math.floor(x),
    cy = Math.floor(y);
  for (let r = 0; r <= 4; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = cx + dx,
          ny = cy + dy;
        if (nx < 1 || ny < 1 || nx >= size - 1 || ny >= size - 1) continue;
        const i = ny * size + nx;
        if (state.world.terrain[i] === T_WATER) continue;
        if (state.buildingAt[i] !== -1) continue;
        return { x: nx + 0.5, y: ny + 0.5 };
      }
  return null;
}

export function findCreature(state, kind, id) {
  if (kind === "monster") return state.monsters.find((m) => m.id === id && m.hp > 0);
  if (kind === "villager") return state.villagers.find((v) => v.id === id && !v.dead);
  if (kind === "nomad") return state.nomads.find((n) => n.id === id);
  return null;
}

const GRAB_DROWN_DAMAGE = 10; // base water damage; the emberling's 8x mult makes it lethal
