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
      handsUsed: G.handsUsed || 0,
      buffs: { ...G.buffs },
      drill: { ...(G.drill || {}) },
      endless: !!G.endless,
      // wildcraft (v1.6): villagers are saved by array position, so partner /
      // banns / hunt-driver links ride as indexes and are re-linked on load
      tend: Array.from(G.tend.entries()),
      cuttings: G.cuttings || 0,
      sigils: (G.sigils || []).map(s => ({ kind: s.kind, tiles: s.tiles, day: s.day, bloomed: !!s.bloomed })),
      digs: (G.digJobs || []).map(t => [t.x, t.y]),
      dug: G.dug || 0,
      fellCount: G.fellCount || 0,
      feastPending: !!G.feastPending,
      banns: (G.banns || []).map(r => [G.villagers.indexOf(Wilds.villById(r.a)), G.villagers.indexOf(Wilds.villById(r.b))]).filter(r => r[0] >= 0 && r[1] >= 0),
      herd: G.herd ? {
        day: G.herd.day, hunt: !!G.herd.hunt, caught: G.herd.caught || 0,
        spawn: { ...G.herd.spawn },
        drivers: (G.herd.drivers || []).map(id => G.villagers.findIndex(v => v.id === id)).filter(ix => ix >= 0),
        deer: G.herd.deer.map(d => ({ x: d.x, y: d.y, anim: d.anim, dang: d.dang })),
      } : null,
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
        fuel: b.fuel || 0, drillType: b.drillType || null, drillT: b.drillT || 0,
        seamDepth: b.seamDepth || 0, seamDay: b.seamDay || 0,
        sap: b.sap || 0, phase: b.phase || null, decT: b.decT || 0,
        demo: !!b.demo,
        clear: (b.clearTiles || []).map(t => [t.x, t.y]),
      })),
      clears: (G.clearJobs || []).map(t => t.water ? [t.x, t.y, 1] : [t.x, t.y]),
      villagers: G.villagers.map(v => ({
        name: v.name, trait: v.trait ? v.trait.key : null, look: { ...v.look },
        job: v.job, x: v.x, y: v.y, hp: v.hp, maxHp: v.maxHp, hunger: v.hunger,
        thirst: v.thirst == null ? 30 : v.thirst, schooled: !!v.schooled,
        state: v.state === 'arrive' ? 'arrive' : 'idle',
        carry: { type: v.carry.type, amt: v.carry.amt },
        toolCond: v.toolCond == null ? CONFIG.TOOL.cond : v.toolCond, buzzed: !!v.buzzed,
        partnerIx: v.partner != null ? G.villagers.findIndex(o => o.id === v.partner) : -1,
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
    G.res = { wood: d.res.wood || 0, stone: d.res.stone || 0, food: d.res.food || 0, essence: d.res.essence || 0, herbs: d.res.herbs || 0, arrows: d.res.arrows || 0, tools: d.res.tools || 0, meals: d.res.meals || 0, ale: d.res.ale || 0,
              water: d.res.water || 0, oil: d.res.oil || 0, bottles: d.res.bottles || 0, charcoal: d.res.charcoal || 0, flour: d.res.flour || 0, bread: d.res.bread || 0 };
    G.jobs = { idle: 0, forager: 0, lumber: 0, miner: 0, farmer: 0, fisher: 0, medic: 0, builder: 0, guard: 0, fletcher: 0, smith: 0, cook: 0, brewer: 0, bottler: 0, baker: 0, scribe: 0 };
    for (const k of JOBS) if (k !== 'idle') G.jobs[k] = d.jobs[k] || 0;
    if (d.jobs.herbalist) G.jobs.medic = (G.jobs.medic || 0) + d.jobs.herbalist; // v1.1: herbalist → medic
    G.unlocks = d.unlocks || {};
    G.stats = { ...d.stats };
    G.chronicle = d.chronicle || [];
    G.tut = d.tut || 0; G.tutOn = !!d.tutOn;
    G.settings = Object.assign({ fx: true, autosave: true }, d.settings);
    G.finalNight = !!d.finalNight; G.beaconLit = !!d.beaconLit; G.finalNightDay = d.finalNightDay || 0;
    G.handsUsed = d.handsUsed || 0;
    G.buffs = d.buffs || {};
    G.drill = Object.assign({ runner: 0, brute: 0, stalker: 0 }, d.drill || {});
    G.endless = !!d.endless;
    // wildcraft (v1.6): tend stages, cuttings, sigils, digs, the herd, the banns
    G.tend = new Map(d.tend || []);
    G.cuttings = d.cuttings || 0;
    G.sigils = (d.sigils || []).map(s => ({ kind: s.kind, tiles: s.tiles, day: s.day || 1, bloomed: !!s.bloomed }));
    G.sigilDraft = null;
    G.digJobs = (d.digs || []).map(([x, y]) => ({ x, y }));
    G.dug = d.dug || 0;
    G.fellCount = d.fellCount || 0;
    G.feastPending = !!d.feastPending;
    G.herd = null;
    G.banns = [];
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
      b.fuel = bs.fuel || 0;
      b.drillType = bs.drillType || null; b.drillT = bs.drillT || 0;
      b.seamDepth = bs.seamDepth || 0; b.seamDay = bs.seamDay || 0;
      b.sap = bs.sap || 0; b.phase = bs.phase || null; b.decT = bs.decT || 0;
      b.demo = !!bs.demo;
      if (bs.clear && bs.clear.length) b.clearTiles = bs.clear.map(([x, y]) => ({ x, y }));
      if (!b.built) b.hp = b.maxHp * (0.1 + 0.9 * b.progress);
    }
    G.clearJobs = (d.clears || []).map(([x, y, w]) => ({ x, y, water: !!w }));

    G.villagers = d.villagers.map(vs => {
      const tr = TRAITS.find(t => t.key === vs.trait) || null;
      const v = {
        kind: 'v', id: NID(), name: vs.name, trait: tr,
        look: vs.look, job: vs.job === 'herbalist' ? 'medic' : vs.job,
        x: vs.x, y: vs.y, hp: vs.hp, maxHp: vs.maxHp || CONFIG.V.hp,
        hunger: vs.hunger, thirst: vs.thirst == null ? 30 : vs.thirst, schooled: !!vs.schooled, schooling: null,
        state: vs.state, path: null, pi: 0, anim: 0,
        tgt: null, tgtTile: null, workT: 0, workB: null,
        carry: { type: vs.carry ? vs.carry.type : null, amt: vs.carry ? vs.carry.amt : 0 },
        toolCond: vs.toolCond == null ? CONFIG.TOOL.cond : vs.toolCond, buzzed: !!vs.buzzed,
        atkCd: 0, fearT: 0, stuckT: 0, lastD: 1e9, aiT: Math.random() * .5,
        ate: false, starveWarned: false, parchWarned: false,
      };
      return v;
    });

    // re-link the wildcraft's people-links, which ride as array indexes
    G.villagers.forEach((v, ix) => {
      const pIx = d.villagers[ix] && d.villagers[ix].partnerIx;
      v.partner = (pIx != null && pIx >= 0 && G.villagers[pIx]) ? G.villagers[pIx].id : null;
      v.bondId = null; v.bondSc = 0;
    });
    G.banns = (d.banns || [])
      .map(([ai, bi]) => (G.villagers[ai] && G.villagers[bi]) ? { a: G.villagers[ai].id, b: G.villagers[bi].id } : null)
      .filter(Boolean);
    if (d.herd && d.herd.deer && d.herd.deer.length) {
      G.herd = {
        day: d.herd.day || G.day, hunt: !!d.herd.hunt, caught: d.herd.caught || 0,
        spawn: d.herd.spawn || { x: 3, y: 3 },
        drivers: [],
        deer: d.herd.deer.map(dd => ({ id: NID(), x: dd.x, y: dd.y, anim: dd.anim || 0, dang: dd.dang || 0 })),
      };
      G.herd.drivers = (d.herd.drivers || [])
        .map(ix => G.villagers[ix] ? G.villagers[ix].id : -1)
        .filter(id => id >= 0);
    }

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
