'use strict';
/* ============================================================
   Dawnhold — wilds.js
   Wildcraft (v1.6): the village edits the map, the guardian
   draws will on the ground.

   Grovekeep   wild bushes → tended → heavy-fruiting; cuttings
   The Nursery every 2nd felled tree is a sapling to replant
   The Spade   builders carve tiles into ponds; reeds sprout
   Sigils      chalk circles — ward the night, hallow the day
   Restoration a ruin wakes as the Aqueduct / Dawn Shrine /
               Sky Watch / Root Cellar
   Banns       co-workers bond, ask leave, raise a shared hut
   The Hunt    drive the dawn deer herd into your spike-line

   The economy here is DOM-free and headless-testable; the UI
   taps it from ui.js, the sim from game.js. ============================================================ */

const Wilds = {

  /* ================= Grovekeep ================= */
  tendAt(tx, ty) {
    const t = G.tend.get(World.idx(tx, ty));
    return t && World.objAt(tx, ty) === OBJ.BUSH ? t : null;
  },

  // berries a bush holds when full, by its grovekeep stage
  bushYield(tx, ty) {
    const t = this.tendAt(tx, ty);
    const base = amtOf(OBJ.BUSH);
    if (!t) return base;
    return base + (t.stage >= 1 ? CONFIG.GROVE.yieldBonus : 0) + (t.stage >= 2 ? base : 0);
  },

  // regrow speed multiplier for a tile's bush (1 = wild)
  tendMul(i) {
    const t = G.tend.get(i);
    if (!t || t.stage < 1) return 1;
    const m = CONFIG.GROVE.regrowMul;
    return t.stage >= 2 ? m * m : m;
  },

  // order a Forager to call on this bush across days (wild → tended → heavy)
  orderTend(tx, ty) {
    if (World.objAt(tx, ty) !== OBJ.BUSH) return false;
    const i = World.idx(tx, ty);
    let t = G.tend.get(i);
    if (t && t.stage >= 2) return false;
    if (!t) { t = { stage: 0, work: 0 }; G.tend.set(i, t); }
    return true;
  },

  // a forager's tending session at the bush — returns the stage it reached, if any
  tendWork(tx, ty, dt) {
    const i = World.idx(tx, ty), t = G.tend.get(i);
    if (!t || t.stage >= 2 || World.objAt(tx, ty) !== OBJ.BUSH) return 0;
    const need = CONFIG.GROVE.stageWork * (t.stage + 1);
    t.work += dt;
    if (t.work >= need) {
      t.stage++;
      if (t.stage >= 2) t.work = need;
      return t.stage;
    }
    return 0;
  },

  // harvesting a tended bush may spare a cutting the village can plant
  onBushHarvested(tx, ty) {
    const t = this.tendAt(tx, ty);
    if (!t || t.stage < 1) return false;
    if (Math.random() >= CONFIG.GROVE.cuttingChance) return false;
    G.cuttings++;
    Sim.float(tx + .5, ty + .2, 'cutting', '#7dc95e');
    return true;
  },

  canPlantBush(tx, ty) {
    if (!World.inB(tx, ty)) return false;
    const i = World.idx(tx, ty);
    if (World.t[i] !== T.GRASS && World.t[i] !== T.DIRT) return false;
    if (World.occ[i]) return false;
    const o = World.obj[i];
    return o === OBJ.NONE || o === OBJ.FLOWER || o === OBJ.TGRASS || o === OBJ.MUSH;
  },

  plantBush(tx, ty) {
    if (G.cuttings < 1 || !this.canPlantBush(tx, ty)) return false;
    G.cuttings--;
    World.setObj(tx, ty, OBJ.BUSH, amtOf(OBJ.BUSH));
    World.bakeTile(tx, ty);
    Sim.fx('spark', tx + .5, ty + .3, .3);
    return true;
  },

  /* ================= The Nursery ================= */
  nursery() { return G.buildings.find(b => b.built && b.key === 'nursery') || null; },

  // a lumberjack felled a living tree — every 2nd felling roots a sapling
  noteFell(tx, ty) {
    G.fellCount++;
    const n = this.nursery();
    if (!n || G.fellCount < CONFIG.NURSERY.fellsPerSapling) return false;
    G.fellCount -= CONFIG.NURSERY.fellsPerSapling;
    n.sap = (n.sap || 0) + 1;
    Sim.float(n.x + 1, n.y + .4, 'sapling rooted', '#8fd45e');
    return true;
  },

  canPlantSapling(tx, ty) { return this.canPlantBush(tx, ty); },

  plantSapling(tx, ty) {
    const n = this.nursery();
    if (!n || (n.sap || 0) < 1 || !this.canPlantSapling(tx, ty)) return false;
    n.sap--;
    const kind = U.hash2(tx, ty) < 0.4 ? OBJ.PINE : OBJ.TREE;
    World.setObj(tx, ty, OBJ.SAPLING, 0);
    G.regrow.set(World.idx(tx, ty), { t: CONFIG.NURSERY.growT, kind });
    World.bakeTile(tx, ty);
    Sim.fx('spark', tx + .5, ty + .3, .3);
    return true;
  },

  /* ================= The Spade ================= */
  digAt(x, y) { return G.digJobs.some(t => t.x === x && t.y === y); },

  // order a Builder to carve this tile down to shallow water
  toggleDig(x, y) {
    if (this.digAt(x, y)) {
      G.digJobs.splice(G.digJobs.findIndex(t => t.x === x && t.y === y), 1);
      return 'off';
    }
    if (!World.inB(x, y)) return 'no';
    const i = World.idx(x, y);
    if (World.t[i] === T.WATER) return 'no';
    if (World.occ[i]) return 'no';
    const o = World.obj[i];
    if (o !== OBJ.NONE && o !== OBJ.FLOWER && o !== OBJ.TGRASS && o !== OBJ.MUSH && o !== OBJ.STUMP) return 'no';
    G.digJobs.push({ x, y });
    return 'on';
  },

  finishDig(x, y) {
    this.dropDig(x, y);
    World.setT(x, y, T.WATER);
    G.dug++;
    Sim.float(x + .5, y + .3, 'water sprung', '#6fb7d9');
    Sim.fx('spark', x + .5, y + .3, .3);
    // reeds at the margin — herbs on a shore tile
    if (Math.random() < CONFIG.SPADE.reedChance) {
      const opts = [];
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = x + dx, ny = y + dy;
        if (!World.inB(nx, ny)) continue;
        const j = World.idx(nx, ny), o = World.obj[j];
        if (World.t[j] !== T.WATER && !World.occ[j] &&
          (o === OBJ.NONE || o === OBJ.FLOWER || o === OBJ.TGRASS || o === OBJ.MUSH)) opts.push({ x: nx, y: ny });
      }
      if (opts.length) {
        const p = U.choice(opts);
        World.setObj(p.x, p.y, OBJ.REED, amtOf(OBJ.REED));
        World.bakeTile(p.x, p.y);
      }
    }
  },

  dropDig(x, y) {
    const i = G.digJobs.findIndex(t => t.x === x && t.y === y);
    if (i >= 0) G.digJobs.splice(i, 1);
  },

  /* ================= Sigil-craft ================= */
  // chalk drawn by day, salted with 1 herb + 1 charcoal, blooming at dusk
  draftStart(kind) { G.sigilDraft = { kind, tiles: [] }; },

  draftAdd(tx, ty) {
    const d = G.sigilDraft;
    if (!d || d.tiles.length >= 90) return false;
    if (!World.inB(tx, ty)) return false;
    const i = World.idx(tx, ty);
    if (World.t[i] === T.WATER || World.occ[i]) return false;
    const o = World.obj[i];
    if (o !== OBJ.NONE && o !== OBJ.FLOWER && o !== OBJ.TGRASS && o !== OBJ.MUSH) return false;
    if (d.tiles.some(t => t.x === tx && t.y === ty)) return false;
    d.tiles.push({ x: tx, y: ty });
    return true;
  },

  draftCommit() {
    const d = G.sigilDraft;
    G.sigilDraft = null;
    if (!d || !d.tiles.length) return false;
    if (G.res.herbs < 1 || G.res.charcoal < 1) {
      UI.toast('Salting a sigil takes 1 herb + 1 charcoal.', 'bad');
      return false;
    }
    G.res.herbs -= 1; G.res.charcoal -= 1;
    G.sigils.push({ kind: d.kind, tiles: d.tiles, day: G.day, bloomed: false });
    if (G.sigils.length > CONFIG.SIGIL.max) {
      G.sigils.shift();
      UI.toast('The oldest chalk washes away — only six sigils hold.', '');
    }
    UI.toast(d.kind === 'ward'
      ? `The ward is chalked (${d.tiles.length} tiles) — it blooms at dusk.`
      : `The hallow is chalked (${d.tiles.length} tiles) — it steadies your folk from dusk.`, 'good');
    return true;
  },

  draftCancel() { G.sigilDraft = null; },

  // bounding box per sigil keeps the scans cheap
  _box(s) {
    if (!s._box) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const t of s.tiles) {
        if (t.x < x0) x0 = t.x; if (t.x > x1) x1 = t.x;
        if (t.y < y0) y0 = t.y; if (t.y > y1) y1 = t.y;
      }
      s._box = { x0, y0, x1, y1 };
    }
    return s._box;
  },

  nearSigil(x, y, kind, bloomedOnly) {
    const r2 = CONFIG.SIGIL.radius * CONFIG.SIGIL.radius;
    for (const s of G.sigils) {
      if (s.kind !== kind) continue;
      if (bloomedOnly && !s.bloomed) continue; // chalk only wakes at dusk
      const b = this._box(s);
      if (x < b.x0 - 2 || x > b.x1 + 3 || y < b.y0 - 2 || y > b.y1 + 3) continue;
      for (const t of s.tiles) {
        const dx = x - (t.x + .5), dy = y - (t.y + .5);
        if (dx * dx + dy * dy <= r2) return s;
      }
    }
    return null;
  },

  // per-frame: mark monsters crossing a bloomed ward (slowed, +dmg taken)
  auraScan() {
    for (const m of G.monsters) {
      if (m.dead || m.frozenT > 0) continue;
      if (this.nearSigil(m.x, m.y, 'ward', true)) {
        m.ampT = 0.35;
        if (!m.frozenT) m.slowT = Math.max(m.slowT || 0, CONFIG.SIGIL.wardSlow);
      }
    }
  },

  // the Aqueduct's spring: villagers nearby drink without the walk
  nearAqueduct(x, y) {
    const r2 = CONFIG.RESTORE.aqueductR * CONFIG.RESTORE.aqueductR;
    for (const b of G.buildings) {
      if (b.built && b.key === 'aqueduct' && U.dst2(x, y, b.x + .5, b.y + .5) <= r2) return true;
    }
    return false;
  },

  duskSigils() {
    let n = 0;
    for (const s of G.sigils) if (!s.bloomed) { s.bloomed = true; n++; }
    if (n) {
      UI.toast(n === 1 ? 'A sigil blooms in the chalk.' : `${n} sigils bloom in the chalk.`, 'magic');
      Sim.log('The chalked sigils woke with the dusk.', 'magic');
    }
  },

  dawnSigils() {
    if (G.sigils.length) Sim.log('Dawn washed the chalk sigils away.', '');
    G.sigils = [];
    this.draftCancel();
  },

  /* ================= Restoration ================= */
  ANCIENTS: ['aqueduct', 'dawnshrine', 'skywatch', 'cellar'],

  // a Scribe deciphers, Builders scaffold, and a unique ancient building stands
  ruinRestore(tx, ty, key) {
    if (World.objAt(tx, ty) !== OBJ.RUIN || !this.ANCIENTS.includes(key)) return false;
    const def = BUILD[key];
    const c = Buildings.costOf(def);
    if (c.wood > G.res.wood || c.stone > G.res.stone) {
      UI.toast(`Restoring ${def.name} needs ${c.wood ? c.wood + ' wood' + (c.stone ? ' + ' : '') : ''}${c.stone ? c.stone + ' stone' : ''}.`, 'bad');
      return false;
    }
    G.res.wood -= c.wood; G.res.stone -= c.stone;
    World.setObj(tx, ty, OBJ.NONE, 0);
    const b = Buildings.create(key, tx, ty, false);
    b.phase = 'decipher'; b.decT = 0;
    G.stats.built++;
    UI.toast(`${def.name}: the Scribes bend over the old script...`, 'good');
    Sim.log(`The village undertook restoring an ancient ruin into ${def.name}.`, 'good');
    return true;
  },

  decipherSite() { return G.buildings.find(b => !b.built && b.phase === 'decipher') || null; },

  // the scribe's progress at a ruin
  decipherWork(b, dt) {
    b.decT = (b.decT || 0) + dt;
    if (b.decT >= CONFIG.RESTORE.decipherT) {
      b.phase = 'build';
      b.progress = 0.1;
      b.hp = b.maxHp * 0.1;
      UI.toast(`The script is read — the builders raise the ${b.def.name}!`, 'good');
      Sim.log(`The ruin's script was read; the ${b.def.name} rises.`, 'good');
      return true;
    }
    return false;
  },

  /* ================= Banns & blessings ================= */
  villById(id) { return G.villagers.find(v => v.id === id) || null; },

  // throttled scan: villagers working side by side grow attached
  bondScan(dt) {
    this._bondT = (this._bondT || 0) - dt;
    if (this._bondT > 0) return;
    this._bondT = 0.5;
    if (G.banns.length >= 3) return;
    const live = G.villagers.filter(v => !v.below && v.partner == null && (v.state === 'work'));
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j];
        if (U.dst2(a.x, a.y, b.x, b.y) > 12.25) continue; // ~3.5 tiles
        const paired = a.bondId === b.id && b.bondId === a.id;
        if (!paired) { a.bondId = b.id; b.bondId = a.id; a.bondSc = 0; b.bondSc = 0; continue; }
        a.bondSc = (a.bondSc || 0) + 0.5; b.bondSc = (b.bondSc || 0) + 0.5;
        if (a.bondSc >= CONFIG.BANNS.bondT && !G.banns.some(r => (r.a === a.id && r.b === b.id) || (r.a === b.id && r.b === a.id))) {
          G.banns.push({ a: a.id, b: b.id });
          a.bondSc = 0; b.bondSc = 0;
          UI.toast(`${a.name} and ${b.name} ask leave to wed and raise a shared hut — tap either to bless the banns.`, 'magic');
          Sim.log(`${a.name} and ${b.name} grew attached working side by side.`, 'magic');
        }
      }
    }
  },

  canBless(req) {
    const a = this.villById(req.a), b = this.villById(req.b);
    return !!(a && b && a.partner == null && b.partner == null);
  },

  // bless the banns: a feast, a shared hut, and a +work aura between the two
  bless(req) {
    const a = this.villById(req.a), b = this.villById(req.b);
    if (!this.canBless(req)) { G.banns.splice(G.banns.indexOf(req), 1); return false; }
    if (G.res.ale < CONFIG.BANNS.feastAle || G.res.food < CONFIG.BANNS.feastFood) {
      UI.toast(`The feast needs ${CONFIG.BANNS.feastAle} ale + ${CONFIG.BANNS.feastFood} food in store.`, 'bad');
      return false;
    }
    G.res.ale -= CONFIG.BANNS.feastAle; G.res.food -= CONFIG.BANNS.feastFood;
    G.banns.splice(G.banns.indexOf(req), 1);
    a.partner = b.id; b.partner = a.id;
    a.bondId = null; b.bondId = null; a.bondSc = 0; b.bondSc = 0;
    G.feastPending = true;
    const spot = this.hutSpot();
    let hutMsg = '';
    if (spot) {
      const hut = Buildings.place('sharedhut', spot.x, spot.y);
      if (hut) hutMsg = ` Their hut rises at ${spot.x - (World.W / 2 | 0) > 0 ? 'the east' : 'the west'} of camp.`;
    }
    UI.toast(`The banns are blessed — ${a.name} and ${b.name} wed! The village feasts (+10% work tomorrow).${hutMsg}`, 'magic');
    Sim.log(`${a.name} and ${b.name} were wed under the eaves of Dawnhold.`, 'magic');
    return true;
  },

  // spiral out from camp for a 2x2 grass spot the couple may build on
  hutSpot() {
    const cx = World.center.x | 0, cy = World.center.y | 0;
    for (let r = 2; r <= 14; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = cx + dx, y = cy + dy;
          const chk = Buildings.canPlace('sharedhut', x, y);
          if (chk.ok) return { x, y };
        }
      }
    }
    return null;
  },

  // a villager died — untangle their betrothal and any pending banns
  clearVillager(v) {
    for (let i = G.banns.length - 1; i >= 0; i--) {
      if (G.banns[i].a === v.id || G.banns[i].b === v.id) G.banns.splice(i, 1);
    }
    if (v.partner != null) {
      const p = this.villById(v.partner);
      if (p) { p.partner = null; UI.toast(`${p.name} has lost their beloved.`, 'bad'); }
    }
    if (G.herd) G.herd.drivers = G.herd.drivers.filter(id => id !== v.id);
  },

  /* ================= The driven hunt ================= */
  dawnHerd() {
    if (G.herd || G.day < CONFIG.HUNT.minDay || Math.random() >= CONFIG.HUNT.dawnChance) return null;
    const c = World.edgePoint();
    const n = U.irnd(CONFIG.HUNT.herdMin, CONFIG.HUNT.herdMax);
    const deer = [];
    for (let k = 0; k < n; k++) {
      let x = c.x + (Math.random() - .5) * 4, y = c.y + (Math.random() - .5) * 4;
      if (!this.deerPassable(x, y)) { x = c.x; y = c.y; } // never let one stand in the surf
      deer.push({
        id: NID(),
        x, y,
        anim: Math.random() * 2, dang: Math.random() * Math.PI * 2,
      });
    }
    G.herd = { deer, day: G.day, hunt: false, drivers: [], caught: 0, spawn: { x: c.x, y: c.y } };
    UI.toast('A deer herd steps from the wilds to graze — tap a deer to set a hunt.', 'good');
    Sim.log('A deer herd came to graze at the valley\u2019s edge.', 'good');
    return G.herd;
  },

  setHunt() {
    const h = G.herd;
    if (!h || h.hunt || !h.deer.length) return 0;
    let cx = 0, cy = 0;
    for (const d of h.deer) { cx += d.x; cy += d.y; }
    cx /= h.deer.length; cy /= h.deer.length;
    const cands = G.villagers
      .filter(v => !v.below && v.job === 'forager')
      .sort((a, b) => U.dst2(a.x, a.y, cx, cy) - U.dst2(b.x, b.y, cx, cy))
      .slice(0, CONFIG.HUNT.drivers);
    h.hunt = true;
    h.drivers = cands.map(v => v.id);
    for (const v of cands) { v.state = 'idle'; v.path = null; v.tgtTile = null; v.workB = null; }
    if (cands.length) {
      UI.toast(`The hunt is set — ${cands.map(v => v.name).join(' and ')} will drive the herd toward your spike-line.`, 'good');
      Sim.log('A hunt was called; the drivers spread wide behind the herd.', 'good');
    } else {
      UI.toast('No foragers to drive the hunt — they must be resting.', 'bad');
    }
    return cands.length;
  },

  callOffHunt() {
    const h = G.herd;
    if (!h || !h.hunt) return;
    h.hunt = false; h.drivers = [];
    UI.toast('The hunt is called off — the drivers stand down.', '');
  },

  // the day's hunt: deer graze, spook from drivers, bend toward the spike-line
  herdTick(dt) {
    const h = G.herd;
    if (!h) return;
    const drivers = h.drivers.map(id => this.villById(id)).filter(v => v && !v.below);
    const traps = G.buildings.filter(b => b.built && b.def.kind === 'trap');
    for (let i = h.deer.length - 1; i >= 0; i--) {
      const d = h.deer[i];
      // taken by the spike-line?
      const trap = traps.find(t => U.dst2(d.x, d.y, t.x + .5, t.y + .5) < 0.9);
      if (trap) {
        Sim.gain('food', CONFIG.HUNT.perDeer);
        G.stats.gathered += CONFIG.HUNT.perDeer;
        h.caught++;
        Sim.float(d.x, d.y - .4, `+${CONFIG.HUNT.perDeer} venison`, '#c97a4b');
        Sim.fx('spark', d.x, d.y, .4);
        trap.hp -= CONFIG.TRAP.hpCost;
        if (trap.hp <= 0) { Sim.fx('smoke', trap.x + .5, trap.y + .5, .6); Buildings.demolish(trap, true); }
        h.deer.splice(i, 1);
        continue;
      }
      // flee the nearest driver; a planned spike-line bends the bolt
      let vx = 0, vy = 0, fleeing = false;
      let best = null, bd = CONFIG.HUNT.spookR * CONFIG.HUNT.spookR;
      for (const v of drivers) {
        const dd = U.dst2(d.x, d.y, v.x, v.y);
        if (dd < bd) { bd = dd; best = v; }
      }
      if (best) {
        fleeing = true;
        const dl = Math.max(0.01, Math.sqrt(bd));
        vx = (d.x - best.x) / dl; vy = (d.y - best.y) / dl;
        let tp = null, td = CONFIG.HUNT.trapPull * CONFIG.HUNT.trapPull;
        for (const t of traps) {
          const ddt = U.dst2(d.x, d.y, t.x + .5, t.y + .5);
          if (ddt < td) { td = ddt; tp = t; }
        }
        if (tp) {
          const tl = Math.max(0.01, Math.sqrt(td));
          vx = vx * 0.62 + ((tp.x + .5 - d.x) / tl) * 0.38;
          vy = vy * 0.62 + ((tp.y + .5 - d.y) / tl) * 0.38;
        }
      } else {
        // graze: a lazy wandering heading, pulled back toward the spawn edge
        d.dang += (Math.random() - .5) * 1.6 * dt * 6;
        vx = Math.cos(d.dang); vy = Math.sin(d.dang);
        const home = U.dst2(d.x, d.y, h.spawn.x, h.spawn.y);
        if (home > 15 * 15) {
          const hl = Math.max(0.01, Math.sqrt(home));
          vx = vx * .4 + ((h.spawn.x - d.x) / hl) * .6;
          vy = vy * .4 + ((h.spawn.y - d.y) / hl) * .6;
        }
      }
      const spd = fleeing ? 2.6 : 0.5;
      const len = Math.max(0.01, Math.hypot(vx, vy));
      let nx = d.x + vx / len * spd * dt, ny = d.y + vy / len * spd * dt;
      if (!this.deerPassable(nx, ny)) {
        d.dang = Math.random() * Math.PI * 2;
        nx = d.x; ny = d.y;
      }
      d.x = nx; d.y = ny;
      d.anim += dt * (fleeing ? 9 : 2);
    }
    if (!h.deer.length) {
      G.herd = null;
      if (h.caught > 0) {
        Sim.log(`The hunt drove ${h.caught} deer into the spike-line — ${h.caught * CONFIG.HUNT.perDeer} food for the village.`, 'good');
        UI.toast(`The hunt is in! ${h.caught} deer taken — a mountain of venison.`, 'good');
      }
    }
  },

  deerPassable(x, y) {
    const tx = x | 0, ty = y | 0;
    if (!World.inB(tx, ty)) return false;
    const i = World.idx(tx, ty);
    if (World.t[i] === T.WATER) return false;
    const o = World.obj[i];
    if (o === OBJ.TREE || o === OBJ.PINE || o === OBJ.BIRCH || o === OBJ.ROCK || o === OBJ.RUIN || o === OBJ.CRYSTAL || o === OBJ.DEADTREE || o === OBJ.GRAVE) return false;
    const b = World.bldAt(tx, ty);
    if (b && b.built && b.def.kind !== 'trap') return false;
    return true;
  },

  duskHerd() {
    const h = G.herd;
    if (!h) return;
    if (h.caught > 0) {
      Sim.log(`The hunters brought ${h.caught} deer home before dark.`, 'good');
      UI.toast(`The hunt brought home ${h.caught} deer — the rest scattered into the wilds.`, 'good');
    } else {
      Sim.log('The herd scattered into the wilds — no spike-line awaited them.', '');
      UI.toast('The herd scattered into the wilds — lay a spike-line before the next hunt.', 'bad');
    }
    G.herd = null;
  },

  // set-hunt drivers spend the day at the herd's flank (called from vThink)
  driveThink(v) {
    const h = G.herd;
    if (!h || !h.hunt || !h.drivers.includes(v.id)) return false;
    if (!h.deer.length) { v.state = 'idle'; v.path = null; return true; }
    if (!v.path || v.pi >= v.path.length) {
      let cx = 0, cy = 0;
      for (const d of h.deer) { cx += d.x; cy += d.y; }
      cx /= h.deer.length; cy /= h.deer.length;
      // drive from the far side: aim just beyond the herd, away from camp
      const dcx = cx - World.center.x, dcy = cy - World.center.y;
      const dl = Math.max(0.01, Math.hypot(dcx, dcy));
      const p = Path.find(v.x | 0, v.y | 0, U.clamp((cx + dcx / dl * 2.5) | 0, 1, World.W - 2), U.clamp((cy + dcy / dl * 2.5) | 0, 1, World.H - 2), { adjacent: true });
      if (p) { v.path = p; v.pi = 0; v.state = 'toWork'; v.workB = null; v.tgtTile = null; }
    }
    return true;
  },

  /* ================= per-frame & phase hooks ================= */
  tick(dt) {
    this.auraScan();
    this.herdTick(dt);
    this.bondScan(dt);
  },

  dusk() {
    this.duskSigils();
    this.duskHerd();
  },

  dawn() {
    this.dawnSigils();
    this.dawnHerd();
  },
};
