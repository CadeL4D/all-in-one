'use strict';
/* ============================================================
   Dawnhold — save.js
   localStorage saves: 1 autosave + 3 manual slots.
   World arrays are serialized verbatim (roads & depletion must
   persist); villagers keep their identity (names, traits, looks).
   ============================================================ */

const SaveSys = {
  KEY: 'dawnhold_save_',
  ver: CONFIG.SAVE_V,

  serialize() {
    return {
      v: this.ver,
      seed: G.seed, day: G.day, time: G.time, phase: G.phase,
      diff: G.diff, res: { ...G.res },
      jobs: { ...G.jobs },
      unlocks: { ...G.unlocks },
      stats: { ...G.stats },
      chronicle: G.chronicle.slice(-60),
      tut: G.tut, tutOn: G.tutOn,
      settings: { ...G.settings },
      finalNight: G.finalNight, beaconLit: G.beaconLit, finalNightDay: G.finalNightDay || 0,
      wave: G.wave ? { left: G.wave.left, comps: G.wave.comps, t: G.wave.t, window: G.wave.window } : null,
      cam: { x: G.cam.x, y: G.cam.y, z: G.cam.z },
      nextId: _id,
      world: {
        t: Array.from(World.t), obj: Array.from(World.obj), amt: Array.from(World.amt),
        regrow: Array.from(G.regrow.entries()),
      },
      buildings: G.buildings.map(b => ({
        key: b.key, x: b.x, y: b.y, hp: b.hp, built: b.built, progress: b.progress,
        growth: b.growth, lit: b.lit,
      })),
      villagers: G.villagers.map(v => ({
        name: v.name, trait: v.trait ? v.trait.key : null, look: { ...v.look },
        job: v.job, x: v.x, y: v.y, hp: v.hp, maxHp: v.maxHp, hunger: v.hunger, state: v.state === 'arrive' ? 'arrive' : 'idle',
        carry: { type: v.carry.type, amt: v.carry.amt },
      })),
      monsters: G.monsters.map(m => ({
        type: m.type, x: m.x, y: m.y, hp: m.hp, burning: m.burning > 0,
      })),
    };
  },

  save(slot) {
    try {
      const data = this.serialize();
      data.when = Date.now();
      localStorage.setItem(this.KEY + slot, JSON.stringify(data));
      if (slot !== 'auto') UI.toast('Game saved.', 'good');
      return true;
    } catch (e) {
      UI.toast('Save failed (storage full?)', 'bad');
      return false;
    }
  },

  autosave() { this.save('auto'); },

  readMeta(slot) {
    try {
      const raw = localStorage.getItem(this.KEY + slot);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return { day: d.day, diff: d.diff, pop: (d.villagers || []).length, when: d.when || 0, v: d.v };
    } catch (e) { return null; }
  },

  has(slot) { return !!localStorage.getItem(this.KEY + slot); },

  del(slot) { localStorage.removeItem(this.KEY + slot); },

  load(slot) {
    let d;
    try { d = JSON.parse(localStorage.getItem(this.KEY + slot)); } catch (e) { return false; }
    if (!d || d.v !== this.ver) { UI.toast('Save is incompatible.', 'bad'); return false; }

    G.state = 'playing';
    G.seed = d.seed; G.day = d.day; G.time = d.time; G.phase = d.phase;
    G.diff = d.diff in CONFIG.DIFF ? d.diff : 'normal';
    G.diffM = CONFIG.DIFF[G.diff];
    G.res = { wood: d.res.wood || 0, stone: d.res.stone || 0, food: d.res.food || 0, essence: d.res.essence || 0, herbs: d.res.herbs || 0 };
    G.jobs = { idle: 0, forager: 0, lumber: 0, miner: 0, farmer: 0, fisher: 0, herbalist: 0, builder: 0, guard: 0 };
    for (const k of JOBS) if (k !== 'idle') G.jobs[k] = d.jobs[k] || 0;
    G.unlocks = d.unlocks || {};
    G.stats = { ...d.stats };
    G.chronicle = d.chronicle || [];
    G.tut = d.tut || 0; G.tutOn = !!d.tutOn;
    G.settings = Object.assign({ fx: true, autosave: true }, d.settings);
    G.finalNight = !!d.finalNight; G.beaconLit = !!d.beaconLit; G.finalNightDay = d.finalNightDay || 0;
    G.wave = d.wave ? { ...d.wave } : null;
    G.cam = { x: d.cam.x, y: d.cam.y, z: d.cam.z };
    _id = d.nextId || 1000;

    World.adopt(d.world);
    G.regrow = new Map(d.world.regrow);

    Buildings.byIdMap.clear();
    G.buildings = [];
    for (const bs of d.buildings) {
      const b = Buildings.create(bs.key, bs.x, bs.y, bs.built);
      b.hp = bs.hp; b.progress = bs.progress; b.growth = bs.growth; b.lit = !!bs.lit;
      if (!b.built) b.hp = b.maxHp * (0.1 + 0.9 * b.progress);
    }

    G.villagers = d.villagers.map(vs => {
      const tr = TRAITS.find(t => t.key === vs.trait) || null;
      const v = {
        kind: 'v', id: NID(), name: vs.name, trait: tr,
        look: vs.look, job: vs.job,
        x: vs.x, y: vs.y, hp: vs.hp, maxHp: vs.maxHp || CONFIG.V.hp,
        hunger: vs.hunger, state: vs.state, path: null, pi: 0, anim: 0,
        tgt: null, tgtTile: null, workT: 0, workB: null,
        carry: { type: vs.carry ? vs.carry.type : null, amt: vs.carry ? vs.carry.amt : 0 },
        atkCd: 0, fearT: 0, stuckT: 0, lastD: 1e9, aiT: Math.random() * .5,
        ate: false, starveWarned: false,
      };
      return v;
    });

    G.monsters = (d.monsters || []).map(ms => {
      const m = Entities.makeMonster(ms.type, ms.x, ms.y);
      m.hp = Math.min(m.maxHp, ms.hp);
      if (ms.burning) m.burning = 1.5;
      if (ms.type === 'lord') { G.boss = m; }
      return m;
    });
    UI.bossBar(G.boss);

    G.effects = []; G.floaters = [];
    G.sel = null; G.follow = null; G.speed = 1; G.paused = false;
    UI.refreshAll();
    UI.toast(`Day ${G.day} — the story continues.`, 'good');
    return true;
  },
};
