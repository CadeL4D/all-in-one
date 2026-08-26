'use strict';
/* ============================================================
   Dawnhold — entities.js
   Villagers (named, traited, unique pixel look) and monsters.
   ============================================================ */

const SYL_A = ['Ky', 'Mira', 'Tob', 'Lira', 'Bran', 'Nyla', 'Fen', 'Dara', 'Os', 'Wren', 'Tama', 'Jori', 'Ash', 'Elowen', 'Gar', 'Sela', 'Rho', 'Pell', 'Isla', 'Milo', 'Bryn', 'Edda', 'Cor', 'Ves'];
const SYL_B = ['ren', 'win', 'la', 'ric', 'dis', 'na', 'mar', 'beth', 'well', 'dra', 'lin', 'vas', 'gorn', 'tha', 'lis', 'mund', 'wen', 'tar', 'a', 'is'];
const TRAITS = [
  { key: 'hardy', name: 'Hardy', desc: '+20 max health' },
  { key: 'swift', name: 'Swift', desc: 'walks 18% faster' },
  { key: 'diligent', name: 'Diligent', desc: 'works 12% faster' },
  { key: 'strong', name: 'Strong Back', desc: 'carries 3 more' },
  { key: null, name: '', desc: '' },
];

const Entities = {
  name() { return U.choice(SYL_A) + U.choice(SYL_B); },
  trait() { return U.choice(TRAITS); },

  makeVillager(x, y, job, arrive) {
    const tr = this.trait();
    const v = {
      kind: 'v', id: NID(),
      name: this.name(), trait: tr.key ? tr : null,
      look: { skin: U.irnd(0, 3), hair: U.irnd(0, 5), cloth: JOB_INFO[job || 'idle'].cloth, guard: job === 'guard' },
      job: job || 'idle',
      x, y, hp: CONFIG.V.hp, maxHp: CONFIG.V.hp,
      hunger: 30 + Math.random() * 30,
      thirst: 30 + Math.random() * 30, schooled: false, schooling: null,
      state: arrive ? 'arrive' : 'idle',
      path: null, pi: 0, moveT: 0, anim: 0, facing: 1,
      tgt: null, tgtTile: null, workT: 0, workB: null,
      carry: { type: null, amt: 0 },
      atkCd: 0, fearT: 0, stuckT: 0, lastD: 1e9, aiT: Math.random() * 0.5,
      ate: false, starveWarned: false,
      toolCond: CONFIG.TOOL.cond, buzzed: false,
    };
    if (v.trait && v.trait.key === 'hardy') { v.maxHp += 20; v.hp = v.maxHp; }
    return v;
  },

  makeMonster(type, x, y) {
    const st = CONFIG.MONS[type];
    const hpMul = G.diffM.hp * (1 + Math.max(0, G.day - CONFIG.WAVE.hpScaleDay) * CONFIG.WAVE.hpScale);
    const m = {
      kind: 'm', id: NID(), type, name: st.name, st,
      x, y, hp: Math.round(st.hp * hpMul), maxHp: Math.round(st.hp * hpMul),
      dmg: st.dmg, spd: st.spd * ((G.diffM && G.diffM.spdMul) || 1), atkT: st.atkT, ess: st.ess,
      state: 'advance', path: null, pi: 0,
      tgtE: null, tgtB: null, atkCd: 0,
      anim: Math.random() * 2, aiT: Math.random() * 0.5,
      stuckT: 0, lastD: 1e9, burning: 0, dead: false,
      frozenT: 0, slowT: 0, trapCd: 0,
      bld: st.bld || 1, r: st.r || 0.5,
    };
    return m;
  },

  villagerSpeed(v) {
    let s = CONFIG.V.spd;
    if (v.trait && v.trait.key === 'swift') s *= 1.18;
    if (v.job === 'guard' && isNightLike()) s *= 1.08;
    const t = World.tileT(v.x | 0, v.y | 0);
    if (t === T.ROAD) s *= 1.3;
    if (v.thirst > CONFIG.THIRST.parchedAt) s *= CONFIG.THIRST.walkMult; // parched folk drag their feet
    return s;
  },

  workSpeed(v) {
    let s = 1;
    if (v.trait && v.trait.key === 'diligent') s *= 1.12;
    if (v.schooled) s *= 1.12;                      // the schoolhouse pays off
    if (v.buzzed) s *= 1 + CONFIG.ALE.buzz;        // last night's ale
    if (v.toolCond <= 0) s *= CONFIG.TOOL.dryMult; // working bare-handed
    if (v.thirst > CONFIG.THIRST.parchedAt) s *= CONFIG.THIRST.workMult; // a dry throat slows the hands
    s *= Sim.contentment().mult;                   // beds & breathing room
    return s;
  },

  carryMax(v) {
    let c = CONFIG.CARRY;
    if (v.trait && v.trait.key === 'strong') c += 3;
    return c;
  },

  farmYield(v) { return CONFIG.FARM.yield; },
};
