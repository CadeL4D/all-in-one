'use strict';
/* ============================================================
   Dawnhold — buildings.js
   BUILD: definitions. Buildings: placement, construction,
   farms, towers, demolition, housing & storage queries.
   ============================================================ */

const BUILD = {
  tent: {
    name: 'Tent', cat: 'basics', w: 1, h: 1, hp: 130, cost: { wood: 8 }, time: 16,
    housing: 2, light: 2.2, kind: 'house', unlock: 0,
    desc: 'Shelter for two villagers. Cheap and quick — your first priority.',
  },
  farm: {
    name: 'Wheat Plot', cat: 'basics', w: 2, h: 2, hp: 140, cost: { wood: 6 }, time: 18,
    kind: 'farm', grassOnly: true, unlock: 0,
    desc: 'Reliable food. Wheat ripens in the sun; a Farmer harvests ~15 food.',
  },
  road: {
    name: 'Road', cat: 'basics', w: 1, h: 1, hp: 1, cost: { stone: 1 }, time: 0,
    kind: 'road', terrain: true, unlock: 0, paint: true,
    desc: 'Stone path. Villagers walk 30% faster along roads. Drag to paint.',
  },
  cottage: {
    name: 'Cottage', cat: 'basics', w: 2, h: 2, hp: 380, cost: { wood: 14, stone: 12 }, time: 42,
    housing: 4, light: 2.8, kind: 'house', unlock: 4,
    desc: 'Sturdy stone home for four. Warm windows glow at night.',
  },
  wallW: {
    name: 'Palisade', cat: 'defense', w: 1, h: 1, hp: 220, cost: { wood: 2 }, time: 5,
    kind: 'wall', paint: true, unlock: 0,
    desc: 'Wooden wall. Blocks the horde. Drag to draw long lines.',
  },
  wallS: {
    name: 'Stone Wall', cat: 'defense', w: 1, h: 1, hp: 520, cost: { stone: 4 }, time: 9,
    kind: 'wall', paint: true, unlock: 2,
    desc: 'Thick stone wall. Brutes hammer a long time before it gives.',
  },
  gateW: {
    name: 'Wooden Gate', cat: 'defense', w: 1, h: 1, hp: 260, cost: { wood: 4 }, time: 9,
    kind: 'gate', unlock: 2,
    desc: 'Your people pass freely; the horde must batter it down.',
  },
  gateS: {
    name: 'Stone Gate', cat: 'defense', w: 1, h: 1, hp: 600, cost: { stone: 8 }, time: 14,
    kind: 'gate', unlock: 6,
    desc: 'Reinforced gate. The strongest door in the valley.',
  },
  tower: {
    name: 'Watchtower', cat: 'defense', w: 1, h: 1, hp: 300, cost: { wood: 14, stone: 10 }, time: 32,
    kind: 'tower', atk: CONFIG.TOWER, light: 2.7, tall: 16, unlock: 3,
    desc: 'Rains arrows on the horde (8 dmg, range 5.5). Works alone, all night.',
  },
  ballista: {
    name: 'Ballista', cat: 'defense', w: 1, h: 1, hp: 420, cost: { wood: 22, stone: 26 }, time: 50,
    kind: 'tower', atk: CONFIG.BALLISTA, light: 1.6, tall: 16, unlock: 7,
    desc: 'Heavy bolts punch through brutes (27 dmg, range 7.5).',
  },
  torch: {
    name: 'Torch', cat: 'defense', w: 1, h: 1, hp: 70, cost: { wood: 2, stone: 1 }, time: 5,
    kind: 'torch', light: 4.3, tall: 8, unlock: 0,
    desc: 'Pushes back the dark. Shades crawl slower in the light.',
  },
  warehouse: {
    name: 'Warehouse', cat: 'basics', w: 2, h: 2, hp: 420, cost: { wood: 18, stone: 8 }, time: 40,
    kind: 'store', light: 3.0, unlock: 5,
    desc: 'A second stockpile — shorten hauling trips and guard outer farms.',
  },
  shrine: {
    name: 'Shrine', cat: 'mystic', w: 1, h: 1, hp: 200, cost: { stone: 16 }, time: 28,
    kind: 'shrine', light: 3.1, tall: 8, essence: true, unlock: 8,
    desc: 'Faith of the valley made stone. Slowly regenerates your Essence.',
  },
  beacon: {
    name: 'The Beacon', cat: 'mystic', w: 3, h: 3, hp: 900, cost: { wood: 100, stone: 80 }, time: 110,
    kind: 'beacon', light: 0, tall: 40, unlock: 10,
    desc: 'The Great Beacon of legend. Lighting it calls the final horde — survive that night and dawn returns forever.',
  },
};

// starting camp (not buildable)
const CAMP_DEF = {
  name: 'Settlers\u2019 Camp', cat: null, w: 2, h: 2, hp: 850, cost: {}, time: 0,
  kind: 'store', light: 3.2, housing: 2, tall: 0, desc: 'Where it all began. Stores goods and shelters two.',
};

const Buildings = {
  byIdMap: new Map(),

  def(key) { return key === 'camp' ? CAMP_DEF : BUILD[key]; },

  byId(id) { return this.byIdMap.get(id) || null; },

  create(key, tx, ty, built) {
    const def = this.def(key);
    const b = {
      id: NID(), key, def, x: tx, y: ty, w: def.w, h: def.h,
      hp: built ? def.hp : Math.max(8, def.hp * 0.1),
      maxHp: def.hp, built: !!built, progress: built ? 1 : 0,
      growth: 0, tendedT: 99, cd: 0, lit: false,
    };
    this.byIdMap.set(b.id, b);
    G.buildings.push(b);
    for (let dy = 0; dy < b.h; dy++)
      for (let dx = 0; dx < b.w; dx++)
        World.occ[World.idx(tx + dx, ty + dy)] = b.id;
    return b;
  },

  canPlace(key, tx, ty) {
    const def = BUILD[key];
    if (!def) return { ok: false, reason: 'Unknown' };
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const x = tx + dx, y = ty + dy;
        if (!World.inB(x, y)) return { ok: false, reason: 'Off map' };
        const i = World.idx(x, y);
        const t = World.t[i];
        if (t === T.WATER) return { ok: false, reason: 'On water' };
        if (def.terrain) { // roads can overwrite grass/dirt but not objects/farms
          if (t === T.ROAD) return { ok: false, reason: '' };
          const o = World.obj[i];
          if (o === OBJ.TREE || o === OBJ.PINE || o === OBJ.ROCK || o === OBJ.BUSH) return { ok: false, reason: 'Blocked' };
          if (World.occ[i]) return { ok: false, reason: 'Occupied' };
          continue;
        }
        if (t !== T.GRASS && t !== T.DIRT) return { ok: false, reason: 'Bad ground' };
        if (def.grassOnly && t !== T.GRASS) return { ok: false, reason: 'Needs grass' };
        const o = World.obj[i];
        if (o === OBJ.TREE || o === OBJ.PINE || o === OBJ.ROCK || o === OBJ.BUSH || o === OBJ.SAPLING)
          return { ok: false, reason: 'Blocked — clear first' };
        if (World.occ[i]) return { ok: false, reason: 'Occupied' };
      }
    }
    return { ok: true, reason: '' };
  },

  afford(key) {
    const def = BUILD[key]; if (!def) return false;
    if ((def.cost.wood || 0) > G.res.wood) return false;
    if ((def.cost.stone || 0) > G.res.stone) return false;
    return true;
  },

  pay(key) {
    const def = BUILD[key];
    G.res.wood -= def.cost.wood || 0;
    G.res.stone -= def.cost.stone || 0;
  },

  place(key, tx, ty) {
    const chk = this.canPlace(key, tx, ty);
    if (!chk.ok && chk.reason) return null;
    if (!chk.ok) return null;
    if (!this.afford(key)) return null;
    this.pay(key);
    const def = BUILD[key];
    if (def.kind === 'road') {
      const i = World.idx(tx, ty);
      World.t[i] = T.ROAD;
      World.obj[i] = OBJ.NONE;
      World.bakeTile(tx, ty);
      return 'road';
    }
    // clear flowers/stumps under footprint
    for (let dy = 0; dy < def.h; dy++)
      for (let dx = 0; dx < def.w; dx++) {
        const i = World.idx(tx + dx, ty + dy);
        if (World.obj[i] === OBJ.FLOWER || World.obj[i] === OBJ.STUMP) World.obj[i] = OBJ.NONE;
      }
    const b = this.create(key, tx, ty, false);
    G.stats.built++;
    // nudge villagers out of footprint
    for (const v of G.villagers) {
      if (v.x >= tx && v.x < tx + def.w && v.y >= ty && v.y < ty + def.h) {
        const spot = Path.nearbyFree(tx, ty, false, 3);
        if (spot) { v.x = spot.x + .5; v.y = spot.y + .5; v.path = null; }
      }
    }
    return b;
  },

  demolish(b, silent) {
    const i = G.buildings.indexOf(b);
    if (i < 0) return;
    G.buildings.splice(i, 1);
    this.byIdMap.delete(b.id);
    for (let dy = 0; dy < b.h; dy++)
      for (let dx = 0; dx < b.w; dx++) {
        const idx = World.idx(b.x + dx, b.y + dy);
        if (World.occ[idx] === b.id) World.occ[idx] = 0;
      }
    if (b.built && !silent) {
      const def = b.def;
      G.res.wood += Math.floor((def.cost.wood || 0) * 0.5);
      G.res.stone += Math.floor((def.cost.stone || 0) * 0.5);
    }
    if (b.key === 'beacon' && G.beaconLit) { G.beaconLit = false; }
    if (G.sel && G.sel.ref === b) { G.sel = null; UI.selHide(); }
    for (const v of G.villagers) if (v.tgt === b || v.workB === b) { v.tgt = null; v.workB = null; v.state = 'idle'; }
  },

  housingCap() {
    let cap = 0;
    for (const b of G.buildings) if (b.built && b.def.housing) cap += b.def.housing;
    return cap;
  },

  stores() { return G.buildings.filter(b => b.built && b.def.kind === 'store'); },

  nearestStore(tx, ty) {
    let best = null, bd = 1e9;
    for (const b of this.stores()) {
      const d = U.dst2(tx, ty, b.x + b.w / 2, b.y + b.h / 2);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  },

  count(key) { let n = 0; for (const b of G.buildings) if (b.key === key) n++; return n; },

  damaged() {
    return G.buildings.filter(b => b.built && b.hp < b.maxHp - 0.5)
      .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
  },

  unBuilt() { return G.buildings.filter(b => !b.built); },

  // per-frame building logic
  update(dt) {
    const night = isNightLike();
    for (const b of G.buildings) {
      if (b.cd > 0) b.cd -= dt;
      if (b.tendedT < 90) b.tendedT += dt;
      // farms grow in daylight (faster while tended)
      if (b.def.kind === 'farm' && b.built && !night) {
        const boost = b.tendedT < 2 ? CONFIG.FARM.tendBoost : 1;
        b.growth = Math.min(1, b.growth + dt * boost / CONFIG.FARM.grow);
      }
      // towers shoot
      if (b.def.kind === 'tower' && b.built && b.cd <= 0) {
        const cx = b.x + .5, cy = b.y + .5;
        let tgt = null, bd = b.def.atk.range * b.def.atk.range;
        for (const m of G.monsters) {
          if (m.dead) continue;
          const d = U.dst2(cx, cy, m.x, m.y);
          if (d < bd) { bd = d; tgt = m; }
        }
        if (tgt) {
          b.cd = b.def.atk.rate;
          Sim.shootTower(b, tgt);
        }
      }
    }
  },

  windowGlows() {
    // pixel-offset glow points per building kind (for night windows)
    const out = [];
    for (const b of G.buildings) {
      if (!b.built) continue;
      const k = b.key;
      if (k === 'cottage') out.push([b.x * 16 + 8, b.y * 16 + 24], [b.x * 16 + 25, b.y * 16 + 24]);
      else if (k === 'warehouse') out.push([b.x * 16 + 8, b.y * 16 + 21], [b.x * 16 + 26, b.y * 16 + 21]);
      else if (k === 'camp') out.push([b.x * 16 + 8, b.y * 16 + 21], [b.x * 16 + 26, b.y * 16 + 21]);
      else if (k === 'cottage2') out.push([0, 0]);
    }
    return out;
  },
};
