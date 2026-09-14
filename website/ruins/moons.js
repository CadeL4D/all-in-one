// Special nights (doc 04 section 3.3): Full / Eclipse / Blood / Meteor
// moons. One special is decided each dawn - an eclipse belongs to today's
// midday, the other three to tonight - deterministic off the run seed so a
// night is reproducible in tests. Every moon is a telegraph first and a
// disaster second (pillar 2): the schedule is known by morning, the dusk
// toast names it, and each has a counter that was already taught.
import * as B from "./balance.js";
import { addXp, perkRank } from "./meta.js";
import { spawnMonsterAt, monsterLevel, pickKind } from "./monsters.js";

export function createMoonState() {
  return {
    day: null, // tonight's moon: 'full' | 'blood' | 'meteor' | null
    eclipse: null, // today's day-siege moon: true | null
    pacified: false, // full moon: raiders rise but do not march
    fullDebt: false, // the NEXT raid is doubled (banked by a full moon)
    tonightMult: 1, // debt applied to tonight's raid (reset at nightfall)
    lastSpecial: -99, // day index of the last special (cooldown clock)
    dripAt: 0, // next eclipse/blood drip tick
    meteorQueue: [], // meteor shower strikes still to schedule
  };
}

// Moonlit Ward perk: evil moons run 20% milder (fewer drips and strikes).
function mildMult(state) {
  return 1 - 0.2 * perkRank(state, "ward");
}

// Dawn scheduling. Rolled in a fixed order from state.rng so the draw count
// is stable regardless of which moons are live.
export function scheduleMoon(state) {
  const m = state.moon;
  const day = state.clock.day;
  m.day = null;
  m.eclipse = null;
  m.pacified = false;
  m.meteorQueue = [];
  const mode = state.mode;
  if (mode.peaceful) return;
  if (day < B.MOON_START_DAY) return;
  if (day - m.lastSpecial <= B.MOON_COOLDOWN_DAYS) return;

  const nightmare = mode.key === "nightmare";
  const weight = (key) => {
    const base = B.MOON_CHANCE[key];
    return key === "full" ? base : base * (nightmare ? B.MOON_NIGHTMARE_MULT : 1);
  };
  if (state.rng.chance(weight("full"))) m.day = "full";
  else if (state.rng.chance(weight("blood"))) m.day = "blood";
  else if (state.rng.chance(weight("meteor"))) m.day = "meteor";
  else if (state.rng.chance(weight("eclipse"))) m.eclipse = true;
  if (m.day || m.eclipse) m.lastSpecial = day;
}

// The dusk beat: name tonight's moon so the player can prepare (or cull).
export function moonAtDusk(state) {
  const m = state.moon;
  if (m.day) state.events.push({ type: "moon", moon: m.day });
}

// Nightfall: set the night's machinery running. Raid spawning itself stays
// in monsters.js; this moon layer only bends it.
export function moonAtNightfall(state) {
  const m = state.moon;
  m.tonightMult = m.fullDebt ? B.MOON_FULL_NEXT_MULT : 1;
  m.fullDebt = false; // the debt belongs to exactly one nightfall
  if (m.day === "full") {
    m.pacified = true; // they rise, they do not march (doc 04 section 3.3)
    state.events.push({ type: "full-moon-rise" });
  }
  if (m.day === "blood") {
    m.dripAt = state.clock.tick + B.BLOOD_DRIP_TICKS;
    state.events.push({ type: "blood-moon-rise" });
  }
  if (m.day === "meteor") {
    const count = Math.max(3, Math.round(B.METEOR_SHOWER_COUNT * mildMult(state)));
    m.meteorQueue = [];
    const nightSpan = B.PHASES[5].fraction * B.DAY_TICKS;
    for (let i = 0; i < count; i++) {
      m.meteorQueue.push(state.clock.tick + Math.round(((i + 0.5) / count) * nightSpan * state.rng.range(0.7, 1.3)));
    }
    state.events.push({ type: "meteor-shower-rise" });
  }
}

// Per-tick driver: eclipse drips (continuous day spawns), blood drips
// (village spawns at corruption level), meteor queue release.
export function tickMoon(state) {
  const m = state.moon;
  const tick = state.clock.tick;
  const phase = state.clock.phaseIndex;

  // Eclipse: midday through dusk, a raider every drip until the night
  // proper takes over. They march like night raiders - that's the horror.
  if (m.eclipse && phase >= B.ECLIPSE_START_PHASE && phase < B.ECLIPSE_END_PHASE) {
    if (tick >= m.dripAt) {
      m.dripAt = tick + Math.round(B.ECLIPSE_DRIP_TICKS * mildMult(state));
      dripEclipseRaider(state);
    }
  }

  if (m.day === "blood" && phase === 5) {
    if (tick >= m.dripAt) {
      m.dripAt = tick + Math.round(B.BLOOD_DRIP_TICKS * mildMult(state));
      dripBloodling(state);
    }
  }

  if (m.meteorQueue.length && tick >= m.meteorQueue[0]) {
    m.meteorQueue.shift();
    dropShowerMeteor(state);
  }
}

// One siege raider appears at a nest's mouth and marches. Marching itself
// is free - tickMonsters routes anything it finds toward the camp.
function dripEclipseRaider(state) {
  const nests = state.buildings.filter((b) => b.type === "nest" && b.complete);
  if (!nests.length) return;
  if (state.monsters.length >= B.MONSTER_HARD_CAP) return;
  const size = state.world.size;
  for (let tries = 0; tries < nests.length * 2; tries++) {
    const nest = nests[state.rng.int(0, nests.length - 1)];
    const angle = state.rng.range(0, Math.PI * 2);
    const x = Math.floor(nest.x + 0.5 + Math.cos(angle) * 1.5);
    const y = Math.floor(nest.y + 0.5 + Math.sin(angle) * 1.5);
    if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) continue;
    const i = y * size + x;
    if (state.world.terrain[i] === 2 || state.buildingAt[i] !== -1) continue;
    spawnMonsterAt(state, pickKind(state), x + 0.5, y + 0.5);
    state.events.push({ type: "eclipse-drip", x: x + 0.5, y: y + 0.5 });
    return;
  }
}

function dripBloodling(state) {
  const camp = state.buildings.find((b) => b.type === "camp");
  if (!camp) return;
  const blood = state.monsters.filter((m) => B.MONSTERS[m.kind]?.blood).length;
  if (blood >= B.BLOOD_MAX) return;
  if (state.monsters.length >= B.MONSTER_HARD_CAP) return;
  const size = state.world.size;
  for (let tries = 0; tries < 12; tries++) {
    const angle = state.rng.range(0, Math.PI * 2);
    const r = state.rng.range(2, B.BLOOD_VILLAGE_RADIUS);
    const x = Math.floor(camp.x + 1 + Math.cos(angle) * r);
    const y = Math.floor(camp.y + 1 + Math.sin(angle) * r);
    if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) continue;
    const i = y * size + x;
    if (state.world.terrain[i] === 2 || state.buildingAt[i] !== -1) continue;
    spawnMonsterAt(state, "bloodling", x + 0.5, y + 0.5, monsterLevel(state));
    state.events.push({ type: "bloodling-sprung", x: x + 0.5, y: y + 0.5 });
    return;
  }
}

function dropShowerMeteor(state) {
  const size = state.world.size;
  const camp = state.buildings.find((b) => b.type === "camp");
  for (let tries = 0; tries < 20; tries++) {
    let x, y;
    if (camp && state.rng.chance(B.METEOR_SHOWER_VILLAGE_SHARE)) {
      const angle = state.rng.range(0, Math.PI * 2);
      const r = state.rng.range(3, 11);
      x = Math.round(camp.x + 1 + Math.cos(angle) * r);
      y = Math.round(camp.y + 1 + Math.sin(angle) * r);
    } else {
      x = state.rng.int(3, size - 4);
      y = state.rng.int(3, size - 4);
    }
    if (x < 2 || y < 2 || x >= size - 2 || y >= size - 2) continue;
    if (state.world.terrain[y * size + x] === 2) continue;
    // Scheduled through the spell layer so the telegraph, impact, friendly
    // fire and emberling gamble all reuse the one honest implementation.
    state.god.meteors.push({ x: x + 0.5, y: y + 0.5, t: 0, dur: B.SPELLS.meteor.fallTicks });
    return;
  }
}

// Dawn bookkeeping: retreats already clear monsters; this layer pays XP for
// survived specials, ends pacification, and banks the full-moon debt.
export function moonAtDawn(state) {
  const m = state.moon;
  if (m.day === "full") m.fullDebt = true; // tomorrow answers for the culling you skipped
  if (m.day === "blood") addXp(state, "moonBlood");
  if (m.day === "meteor") addXp(state, "moonMeteor");
  if (m.eclipse) addXp(state, "moonEclipse");
  m.day = null;
  m.eclipse = null;
  m.pacified = false;
  m.tonightMult = 1;
  m.meteorQueue = [];
}

// Eclipse dims the world (it replaces midday): main.js multiplies the
// clock's daylight by this before rendering.
export function moonDaylight(state, dl) {
  const m = state.moon;
  if (m.eclipse && state.clock.phaseIndex >= B.ECLIPSE_START_PHASE && state.clock.phaseIndex < B.ECLIPSE_END_PHASE)
    return Math.min(dl, 0.35);
  return dl;
}
