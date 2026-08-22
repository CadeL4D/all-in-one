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
  fisher: {
    name: 'Fishing Dock', cat: 'basics', w: 1, h: 1, hp: 160, cost: { wood: 10 }, time: 22,
    kind: 'fisher', needsWater: true, tall: 8, unlock: 3,
    desc: 'Must touch water. A Fisher brings in steady food — no farmland used.',
  },
  windmill: {
    name: 'Windmill', cat: 'basics', w: 2, h: 2, hp: 300, cost: { wood: 20, stone: 8 }, time: 55,
    kind: 'windmill', tall: 28, unlock: 4,
    desc: 'Wheat plots within 6 tiles grow 35% faster in its breeze.',
  },
  trap: {
    name: 'Spike Trap', cat: 'defense', w: 1, h: 1, hp: 120, cost: { wood: 2, stone: 1 }, time: 5,
    kind: 'trap', paint: true, unlock: 5,
    desc: 'Wounds and slows monsters that walk over it. Wears out. Drag to lay rows.',
  },
  hospital: {
    name: 'Hospital', cat: 'basics', w: 2, h: 2, hp: 320, cost: { wood: 14, stone: 10 }, time: 40,
    kind: 'healer', light: 2.6, tall: 8, unlock: 2,
    desc: 'Mends wounded villagers nearby, one herb at a time. Unlocks the Medic job. Buildable after your first night.',
  },
  herbalistHut: { // legacy — no longer buildable, but old saves keep working
    name: 'Herbalist Hut', cat: null, w: 1, h: 1, hp: 180, cost: { wood: 10, stone: 4 }, time: 26,
    kind: 'healer', light: 2.0, tall: 6, unlock: 99,
    desc: 'Gathered herbs slowly mend wounded villagers nearby.',
  },
  mine: {
    name: 'Mine Shaft', cat: 'basics', w: 1, h: 1, hp: 260, cost: { wood: 12 }, time: 30,
    kind: 'mine', onRock: true, tall: 4, unlock: 7,
    desc: 'Build atop a boulder. Miners work it forever — slow but endless stone.',
  },
  barracks: {
    name: 'Barracks', cat: 'defense', w: 2, h: 2, hp: 500, cost: { wood: 25, stone: 20 }, time: 60,
    kind: 'barracks', capOne: true, light: 2.0, tall: 4, unlock: 8,
    desc: 'Drill yard and armory: all Guards deal +30% damage. Only one may stand.',
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

// monster lair (not buildable — placed by the map, destroyed by raids)
const LAIR_DEF = {
  name: 'Dark Monolith', cat: null, w: 1, h: 1, hp: CONFIG.LAIR.hp, cost: {}, time: 0,
  kind: 'lair', light: 1.8, tall: 12, desc: 'The horde crawls out of this each night. Select it and order a RAID — destroy all three and the nights grow thin.',
};

const Buildings = {
  byIdMap: new Map(),

  def(key) { return key === 'camp' ? CAMP_DEF : key === 'lair' ? LAIR_DEF : BUILD[key]; },

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
    if (def.capOne && this.count(key) >= 1) return { ok: false, reason: 'Only one allowed' };
    // fishing docks must touch water
    if (def.needsWater) {
      let wet = false;
      for (let dy = -1; dy <= 1 && !wet; dy++)
        for (let dx = -1; dx <= 1 && !wet; dx++)
          if ((dx || dy) && World.tileT(tx + dx, ty + dy) === T.WATER) wet = true;
      if (!wet) return { ok: false, reason: 'Must touch water' };
    }
    // mine shafts consume the boulder they stand on
    if (def.onRock) {
      if (World.objAt(tx, ty) !== OBJ.ROCK) return { ok: false, reason: 'Place on a boulder' };
    }
    // real buildings may be staked over wild growth — builders clear it first
    const clearable = def.time > 0;
    const clearTiles = [];
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const x = tx + dx, y = ty + dy;
        if (!World.inB(x, y)) return { ok: false, reason: 'Off map' };
        const i = World.idx(x, y);
        const t = World.t[i];
        if (t === T.WATER) return { ok: false, reason: 'On water' };
        if (def.terrain) { // roads can overwrite grass/dirt/sand but not objects/farms
          if (t === T.ROAD) return { ok: false, reason: '' };
          const o = World.obj[i];
          if (o === OBJ.TREE || o === OBJ.PINE || o === OBJ.BIRCH || o === OBJ.ROCK || o === OBJ.BUSH || o === OBJ.RUIN || o === OBJ.CRYSTAL || o === OBJ.DEADTREE) return { ok: false, reason: 'Blocked' };
          if (World.occ[i]) return { ok: false, reason: 'Occupied' };
          continue;
        }
        if (t !== T.GRASS && t !== T.DIRT && t !== T.SAND) return { ok: false, reason: 'Bad ground' };
        if (def.grassOnly && t !== T.GRASS) return { ok: false, reason: 'Needs grass' };
        const o = World.obj[i];
        const wild = o === OBJ.TREE || o === OBJ.PINE || o === OBJ.BIRCH || o === OBJ.ROCK || o === OBJ.SAPLING || o === OBJ.RUIN || o === OBJ.CRYSTAL || o === OBJ.DEADTREE;
        const blocking = wild || o === OBJ.BUSH || o === OBJ.GRAVE;
        if (blocking && !(def.onRock && o === OBJ.ROCK)) {
          if (!(clearable && wild)) return { ok: false, reason: 'Blocked — clear first' };
          clearTiles.push({ x, y });
        }
        if (World.occ[i]) return { ok: false, reason: 'Occupied' };
      }
    }
    return { ok: true, reason: '', clearTiles };
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
    if (chk.clearTiles && chk.clearTiles.length) b.clearTiles = chk.clearTiles; // builders clear these first
    if (def.onRock) World.setObj(tx, ty, OBJ.NONE, 0); // shaft swallows the boulder
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
    if (b.key === 'lair') return; // lairs are destroyed by raiding, never demolished
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
  lairs() { return G.buildings.filter(b => b.key === 'lair'); },
  fisherHuts() { return G.buildings.filter(b => b.built && b.def.kind === 'fisher'); },
  mines() { return G.buildings.filter(b => b.built && b.def.kind === 'mine'); },
  hospitals() { return G.buildings.filter(b => b.key === 'hospital' && b.built); },
  demoSites() { return G.buildings.filter(b => b.built && b.demo); },

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
    return G.buildings.filter(b => b.built && !b.demo && b.hp < b.maxHp - 0.5)
      .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
  },

  unBuilt() { return G.buildings.filter(b => !b.built); },

  // per-frame building logic
  update(dt) {
    const night = isNightLike();
    const hasBarracks = G.buildings.some(b => b.built && b.key === 'barracks');
    const windmills = [];
    for (const b of G.buildings) if (b.built && b.key === 'windmill') windmills.push(b);
    for (const b of G.buildings) {
      if (b.cd > 0) b.cd -= dt;
      if (b.tendedT < 90) b.tendedT += dt;
      // farms grow in daylight (faster while tended, faster near a windmill)
      if (b.def.kind === 'farm' && b.built && !night) {
        const boost = b.tendedT < 2 ? CONFIG.FARM.tendBoost : 1;
        let breeze = 1;
        for (const wm of windmills) {
          if (U.dst(b.x + 1, b.y + 1, wm.x + 1, wm.y + 1) <= 6) { breeze = 1.35; break; }
        }
        b.growth = Math.min(1, b.growth + dt * boost * breeze / CONFIG.FARM.grow);
      }
      // hospital mends wounded villagers nearby, consuming stored herbs
      if (b.def.kind === 'healer' && b.built && G.res.herbs >= 1) {
        let patient = null;
        for (const v of G.villagers) {
          if (v.hp < v.maxHp - 1 && U.dst2(v.x, v.y, b.x + b.w / 2, b.y + b.h / 2) < 25) { patient = v; break; }
        }
        if (patient) {
          patient.hp = Math.min(patient.maxHp, patient.hp + CONFIG.HERB.healRate * dt);
          b.healDebt = (b.healDebt || 0) + CONFIG.HERB.healRate * dt;
          while (b.healDebt >= CONFIG.HERB.herbPerHeal && G.res.herbs >= 1) {
            b.healDebt -= CONFIG.HERB.herbPerHeal;
            G.res.herbs -= 1;
          }
          if (Math.random() < dt * 2) Sim.fx('spark', patient.x, patient.y - .5, .3);
        }
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
    return hasBarracks;
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
