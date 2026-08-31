'use strict';
/* ============================================================
   Dawnhold — buildings.js
   BUILD: definitions. Buildings: placement, construction,
   farms, towers, demolition, housing & storage queries.
   ============================================================ */

const BUILD = {
  tent: {
    name: 'Tent', cat: 'basics', w: 1, h: 1, hp: 130, cost: { wood: 8 }, time: 16,
    housing: 2, comfort: 1, light: 2.2, kind: 'house', unlock: 0,
    short: 'Beds for 2 — cheap first shelter.',
    desc: 'Bedrolls for two villagers. Cheap and quick — your first priority.',
  },
  farm: {
    name: 'Wheat Plot', cat: 'basics', w: 2, h: 2, hp: 140, cost: { wood: 6 }, time: 18,
    kind: 'farm', grassOnly: true, unlock: 0, next: 'farm2',
    short: 'Steady food; a Farmer harvests ~15. Upgradable.',
    desc: 'Reliable food. Wheat ripens in the sun; a Farmer harvests ~15 food. Can be upgraded to irrigated rows.',
  },
  road: {
    name: 'Road', cat: 'basics', w: 1, h: 1, hp: 1, cost: { stone: 1 }, time: 0,
    kind: 'road', terrain: true, unlock: 0, paint: true,
    short: 'Villagers walk 30% faster. Drag to paint.',
    desc: 'Stone path. Villagers walk 30% faster along roads. Drag to paint.',
  },
  well: {
    name: 'Well', cat: 'basics', w: 1, h: 1, hp: 160, cost: { wood: 6, stone: 2 }, time: 14,
    kind: 'well', light: 1.4, unlock: 0,
    short: '+1 water / 10s. Villagers drink here.',
    desc: 'Sweet water, drawn a bucket at a time (+1 water per 10s). Thirsty villagers walk here to drink — the Bottlery spares them the trip.',
  },
  cottage: {
    name: 'Cottage', cat: 'basics', w: 2, h: 2, hp: 380, cost: { wood: 14, stone: 12 }, time: 42,
    housing: 4, comfort: 2, light: 2.8, kind: 'house', unlock: 4,
    short: 'Real beds for 4 — comfy, better work.',
    desc: 'Sturdy stone home for four — real beds, real rest. Warm windows glow at night.',
  },
  wallW: {
    name: 'Palisade', cat: 'defense', w: 1, h: 1, hp: 220, cost: { wood: 2 }, time: 5,
    kind: 'wall', paint: true, unlock: 0, next: 'wallSF',
    short: 'Blocks the horde. Drag to paint.',
    desc: 'Wooden wall. Blocks the horde. Drag to draw long lines; can be stone-faced later.',
  },
  wallS: {
    name: 'Stone Wall', cat: 'defense', w: 1, h: 1, hp: 520, cost: { stone: 4 }, time: 9,
    kind: 'wall', paint: true, unlock: 2,
    short: 'Tough wall — brutes take ages.',
    desc: 'Thick stone wall. Brutes hammer a long time before it gives.',
  },
  gateW: {
    name: 'Wooden Gate', cat: 'defense', w: 1, h: 1, hp: 260, cost: { wood: 4 }, time: 9,
    kind: 'gate', unlock: 2,
    short: 'Your folk pass; the horde must break it.',
    desc: 'Your people pass freely; the horde must batter it down.',
  },
  gateS: {
    name: 'Stone Gate', cat: 'defense', w: 1, h: 1, hp: 600, cost: { stone: 8 }, time: 14,
    kind: 'gate', unlock: 6,
    short: 'The strongest door in the valley.',
    desc: 'Reinforced gate. The strongest door in the valley.',
  },
  tower: {
    name: 'Watchtower', cat: 'defense', w: 1, h: 1, hp: 300, cost: { wood: 14, stone: 10 }, time: 32,
    kind: 'tower', atk: CONFIG.TOWER, light: 2.7, tall: 16, unlock: 3, next: 'tower2',
    short: 'Auto-shoots: 8 dmg, range 5.5. Burns 1 arrow a shot.',
    desc: 'Rains arrows on the horde (8 dmg, range 5.5) — 1 arrow a shot. Works alone, all night, while the quivers last.',
  },
  ballista: {
    name: 'Ballista', cat: 'defense', w: 1, h: 1, hp: 420, cost: { wood: 22, stone: 26 }, time: 50,
    kind: 'tower', atk: CONFIG.BALLISTA, light: 1.6, tall: 16, unlock: 7,
    short: '27 dmg, range 7.5 — punches brutes. 2 arrows a shot.',
    desc: 'Heavy bolts punch through brutes (27 dmg, range 7.5).',
  },
  torch: {
    name: 'Torch', cat: 'defense', w: 1, h: 1, hp: 70, cost: { wood: 2, stone: 1 }, time: 5,
    kind: 'torch', light: 4.3, tall: 8, unlock: 0,
    short: 'Light: shades crawl slower. Sips oil.',
    desc: 'Pushes back the dark. Shades crawl slower in the light.',
  },
  warehouse: {
    name: 'Warehouse', cat: 'basics', w: 2, h: 2, hp: 420, cost: { wood: 18, stone: 8 }, time: 40,
    kind: 'store', light: 3.0, unlock: 5,
    short: '+60 wood & stone caps; shorter hauls.',
    desc: 'A second stockpile — shortens hauling trips and raises wood & stone caps by 60.',
  },
  fisher: {
    name: 'Fishing Dock', cat: 'basics', w: 1, h: 1, hp: 160, cost: { wood: 10 }, time: 22,
    kind: 'fisher', needsWater: true, tall: 8, unlock: 3,
    short: 'Needs shore. Steady food, no farmland.',
    desc: 'Must touch water. A Fisher brings in steady food — no farmland used.',
  },
  windmill: {
    name: 'Windmill', cat: 'basics', w: 2, h: 2, hp: 300, cost: { wood: 20, stone: 8 }, time: 55,
    kind: 'windmill', tall: 28, unlock: 4,
    short: 'Nearby farms +35% growth; grinds flour.',
    desc: 'Wheat plots within 6 tiles grow 35% faster in its breeze. While a Bakehouse stands, its stones also grind wheat into flour.',
  },
  kiln: {
    name: 'Charcoal Kiln', cat: 'basics', w: 1, h: 1, hp: 200, cost: { wood: 8, stone: 3 }, time: 20,
    kind: 'kiln', light: 1.6, unlock: 2,
    short: '2 wood → 1 charcoal.',
    desc: 'Slowly chars 2 wood into 1 charcoal (never dips below 10 wood). The press\u2019s fuel — the same tree that feeds arrows, tools and meals.',
  },
  press: {
    name: 'Oil Press', cat: 'basics', w: 1, h: 1, hp: 180, cost: { wood: 10, stone: 4 }, time: 24,
    kind: 'press', unlock: 4,
    short: '1 charcoal + 1 herb → 3 lamp oil.',
    desc: 'Squeezes 1 charcoal + 1 herb into 3 lamp oil. Torches sip 1 oil a minute through the night and gutter to half-light when dry.',
  },
  trap: {
    name: 'Spike Trap', cat: 'defense', w: 1, h: 1, hp: 120, cost: { wood: 2, stone: 1 }, time: 5,
    kind: 'trap', paint: true, unlock: 5,
    short: 'Wounds & slows monsters. Drag to lay rows.',
    desc: 'Wounds and slows monsters that walk over it. Wears out. Drag to lay rows.',
  },
  hospital: {
    name: 'Hospital', cat: 'basics', w: 2, h: 2, hp: 320, cost: { wood: 14, stone: 10 }, time: 40,
    kind: 'healer', light: 2.6, tall: 8, unlock: 2,
    short: 'Mends the wounded nearby. Unlocks Medic.',
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
    short: 'On a boulder: endless stone.',
    desc: 'Build atop a boulder. Miners work it forever — slow but endless stone.',
  },
  barracks: {
    name: 'Barracks', cat: 'defense', w: 2, h: 2, hp: 500, cost: { wood: 25, stone: 20 }, time: 60,
    kind: 'barracks', capOne: true, light: 2.0, tall: 4, unlock: 8,
    short: 'All guards +30% damage. One only.',
    desc: 'Drill yard and armory: all Guards deal +30% damage. Only one may stand.',
  },
  granary: {
    name: 'Granary', cat: 'basics', w: 2, h: 2, hp: 280, cost: { wood: 10, stone: 6 }, time: 24,
    kind: 'store', light: 1.8, tall: 5, unlock: 1,
    short: '+80 food cap (and meals/ale/herbs).',
    desc: 'Raises food, meal, ale & herb caps (+80 food, +10 herbs) and serves as a store. Build more to hoard more.',
  },
  storehouse: {
    name: 'Storehouse', cat: 'basics', w: 2, h: 2, hp: 340, cost: { wood: 12, stone: 8 }, time: 30,
    kind: 'store', light: 1.8, tall: 6, unlock: 1,
    short: '+100 wood & stone caps.',
    desc: 'Raises the wood & stone caps by 100 and serves as a store. Raw materials need room to pile.',
  },
  smithy: {
    name: 'Smithy', cat: 'basics', w: 2, h: 2, hp: 340, cost: { wood: 12, stone: 12 }, time: 36,
    kind: 'craft', craft: 'tools', light: 2.6, tall: 9, unlock: 2,
    short: 'Smith forges tools (2 wood + 1 stone).',
    desc: 'A Smith forges tools (2 wood + 1 stone each); workers wear them out and bare hands are slow. Unlocks the Smith job.',
  },
  kitchen: {
    name: 'Kitchen', cat: 'basics', w: 2, h: 2, hp: 300, cost: { wood: 12, stone: 6 }, time: 30,
    kind: 'craft', craft: 'meals', light: 2.6, tall: 8, unlock: 2,
    short: 'Cook: 3 food + 1 wood → 2 meals.',
    desc: 'A Cook simmers 3 food + 1 wood into 2 meals that satisfy far better than raw berries. Unlocks the Cook job.',
  },
  fletch: {
    name: 'Fletcher Hut', cat: 'defense', w: 2, h: 2, hp: 280, cost: { wood: 12, stone: 4 }, time: 26,
    kind: 'craft', craft: 'arrows', light: 2.0, tall: 7, unlock: 3,
    short: 'Fletcher: wood → arrows. Towers need them.',
    desc: 'A Fletcher fashions arrows from wood. Towers burn 1 a shot (ballistae 2) and raids pack quivers. Unlocks the Fletcher job.',
  },
  tavern: {
    name: 'Tavern', cat: 'basics', w: 2, h: 2, hp: 360, cost: { wood: 16, stone: 8 }, time: 44,
    kind: 'craft', craft: 'ale', light: 3.2, tall: 8, unlock: 4,
    short: 'Brewer: ale → +10% work tomorrow.',
    desc: 'A Brewer mashes food + herbs into ale; a drink at dusk puts +10% into tomorrow\u2019s work. Unlocks the Brewer job.',
  },
  bottlery: {
    name: 'Bottlery', cat: 'basics', w: 2, h: 2, hp: 300, cost: { wood: 12, stone: 6 }, time: 30,
    kind: 'craft', craft: 'bottles', light: 2.2, tall: 8, unlock: 3,
    short: 'Bottler: 2 water → 2 bottles. No well walks.',
    desc: 'A Bottler fills 2 water into 2 bottles. Bottled folk drink where they stand instead of walking to the well — fewer trips, more work. Unlocks the Bottler job.',
  },
  bakery: {
    name: 'Bakehouse', cat: 'basics', w: 2, h: 2, hp: 340, cost: { wood: 18, stone: 10 }, time: 40,
    kind: 'craft', craft: 'bread', light: 2.6, tall: 10, capOne: true, unlock: 5,
    short: 'Baker: flour + water → bread. One only.',
    desc: 'The lord\u2019s monopoly — one per village. A Baker turns flour + water into bread, the heartiest food (Windmill grinds wheat into flour). Unlocks the Baker job.',
  },
  school: {
    name: 'Schoolhouse', cat: 'basics', w: 2, h: 2, hp: 320, cost: { wood: 20, stone: 12 }, time: 50,
    kind: 'school', light: 2.2, tall: 12, unlock: 6,
    short: 'Scribe: +12% work, forever.',
    desc: 'A Scribe teaches one villager at a time; the schooled work +12% forever. A pair of hands now for better hands later. Unlocks the Scribe job.',
  },
  manor: {
    name: 'Manor', cat: 'basics', w: 3, h: 2, hp: 520, cost: { wood: 24, stone: 16 }, time: 70,
    housing: 6, comfort: 3, light: 3.0, tall: 10, kind: 'house', unlock: 6,
    short: 'Plush beds for 6.',
    desc: 'Grand lodgings for six — the plushest beds in the valley. Snug villagers work better.',
  },
  shrine: {
    name: 'Shrine', cat: 'mystic', w: 1, h: 1, hp: 200, cost: { stone: 16 }, time: 28,
    kind: 'shrine', light: 3.1, tall: 8, essence: true, unlock: 8,
    short: 'Essence regenerates faster.',
    desc: 'Faith of the valley made stone. Slowly regenerates your Essence.',
  },
  brazier: {
    name: 'Brazier', cat: 'mystic', w: 1, h: 1, hp: 180, cost: { wood: 6, stone: 4 }, time: 12,
    kind: 'brazier', light: 0, tall: 8, unlock: 3,
    short: 'Kindle it — a great light all night. Cleanses monoliths.',
    desc: `Kindled with ${CONFIG.BRAZIER.kindleWood} wood + ${CONFIG.BRAZIER.kindleEss} essence, it burns a whole night as a super-torch — and set beside a Dark Monolith it slowly cleanses the lair: no mending, no defenders, until the stone cracks into dawn-stone.`,
  },
  muster: {
    name: 'Muster Yard', cat: 'defense', w: 2, h: 2, hp: 320, cost: { wood: 16, stone: 6 }, time: 30,
    kind: 'muster', capOne: true, light: 1.8, tall: 4, unlock: 5,
    short: 'Drill guards vs a monster type: +10% damage. Rally horn.',
    desc: 'Guards drill against a straw-and-bone effigy. Pick the drill — shields (vs runners), pikes (vs brutes), scatter (vs stalkers) — and drilled guards strike +10% harder against that type (stacks to +30%). Ring the horn and off-duty guards run to the yard.',
  },
  nursery: {
    name: 'Tree Nursery', cat: 'basics', w: 2, h: 2, hp: 280, cost: { wood: 14, stone: 4 }, time: 30,
    kind: 'nursery', capOne: true, light: 1.4, tall: 6, unlock: 4,
    short: 'Every 2 felled trees root a sapling — plant groves.',
    desc: `Seedbeds and sapling pots. Every ${CONFIG.NURSERY.fellsPerSapling} trees the Lumberjacks fell, a sapling is potted here; carry them out and plant groves anywhere — wood stops being strip-mining and becomes forestry. Only one may stand.`,
  },
  sharedhut: { // raised by a blessed couple — never built from the menu
    name: 'Shared Hut', cat: null, w: 2, h: 2, hp: 340, cost: {}, time: 26,
    housing: 2, comfort: 2, light: 2.4, kind: 'house', unlock: 99,
    short: 'A wedded pair\u2019s home: two beds, snug comfort.',
    desc: 'Two beds under one roof, raised by the couple themselves. Snug comfort, and the two of them work +10% while side by side.',
  },
  // ---- the ancient buildings: a ruin restores into exactly one of these ----
  aqueduct: {
    name: 'Aqueduct', cat: null, w: 1, h: 1, hp: 380, cost: { wood: 8, stone: 16 }, time: 65,
    kind: 'aqueduct', light: 1.5, tall: 14, unlock: 99,
    short: 'Ancient: wells +50%; folk drink on the spot nearby.',
    desc: 'Old stone channels wake and run sweet. Wells draw half again as fast, and anyone working within 4 tiles drinks straight from the spout — no walk, no bottle.',
  },
  dawnshrine: {
    name: 'Dawn Shrine', cat: null, w: 1, h: 1, hp: 300, cost: { stone: 12 }, time: 55,
    kind: 'dawnshrine', light: 3.2, tall: 10, essence: true, unlock: 99,
    short: 'Ancient: essence regenerates +50%.',
    desc: 'A dawn-carved altar that still remembers the light. Essence seeps back half again as fast while it stands; villagers pause to pray there.',
  },
  skywatch: {
    name: 'Sky Watch', cat: null, w: 1, h: 1, hp: 360, cost: { wood: 10, stone: 12 }, time: 60,
    kind: 'skywatch', light: 2.0, tall: 20, unlock: 99,
    short: 'Ancient: towers +1.5 range; dusk warnings a dawn early.',
    desc: 'A leaning watch-spire, its optics still true. Towers reach 1.5 tiles further, and the watchers read tonight\u2019s attack direction at dawn — a full day\u2019s warning.',
  },
  cellar: {
    name: 'Root Cellar', cat: null, w: 1, h: 1, hp: 320, cost: { wood: 14, stone: 6 }, time: 50,
    kind: 'cellar', light: 1.0, unlock: 99,
    short: 'Ancient: food cap +80; nothing spoils.',
    desc: 'Cool, dry, older than the village above it. The food store deepens by 80 — and what goes in keeps: no more dawn rot.',
  },
  beacon: {
    name: 'The Beacon', cat: 'mystic', w: 3, h: 3, hp: 900, cost: { wood: 100, stone: 80 }, time: 110,
    kind: 'beacon', light: 0, tall: 40, unlock: 10,
    short: 'Light it, survive the Long Night, win.',
    desc: 'The Great Beacon of legend. Lighting it calls the final horde — survive that night and dawn returns forever.',
  },
  // ---- upgrade tiers: reached by upgrading in place, never built directly ----
  tower2: {
    name: 'Watchtower II', cat: null, w: 1, h: 1, hp: 520, cost: { wood: 30, stone: 20 }, time: 40,
    kind: 'tower', atk: { dmg: 12, rate: 1.0, range: 6.0 }, light: 2.8, tall: 18, unlock: 99, next: 'tower3',
    desc: 'Taller, stronger, meaner (12 dmg, range 6.0). Can be raised further.',
  },
  tower3: {
    name: 'Watchtower III', cat: null, w: 1, h: 1, hp: 800, cost: { wood: 60, stone: 45 }, time: 55,
    kind: 'tower', atk: { dmg: 17, rate: 0.95, range: 6.4 }, light: 2.9, tall: 20, unlock: 99,
    desc: 'The valley\u2019s best vantage (17 dmg, range 6.4).',
  },
  farm2: {
    name: 'Irrigated Plot', cat: null, w: 2, h: 2, hp: 180, cost: { wood: 10, stone: 14 }, time: 30,
    kind: 'farm', grassOnly: true, unlock: 99, yield: 22, growT: 70,
    desc: 'Channel-fed rows: grows ~25% faster and harvests 22 food.',
  },
  wallSF: {
    name: 'Stone-Faced Palisade', cat: null, w: 1, h: 1, hp: 400, cost: { stone: 3 }, time: 8,
    kind: 'wall', unlock: 99,
    desc: 'A palisade backed with stone — nearly a stone wall for half the stone.',
  },
};

// starting camp (not buildable)
const CAMP_DEF = {
  name: 'Settlers\u2019 Camp', cat: null, w: 2, h: 2, hp: 850, cost: {}, time: 0,
  kind: 'store', light: 3.2, housing: 2, comfort: 1, tall: 0, desc: 'Where it all began. Stores goods and shelters two.',
};

// monster lair (not buildable — placed by the map, destroyed by raids)
const LAIR_DEF = {
  name: 'Dark Monolith', cat: null, w: 1, h: 1, hp: CONFIG.LAIR.hp, cost: {}, time: 0,
  kind: 'lair', light: 1.8, tall: 12, desc: 'The horde crawls out of this each night. Stone-hard and slow to break — and it calls its brood to defend it while raided. Order a RAID; destroy all three and the nights grow thin.',
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
        const wild = o === OBJ.TREE || o === OBJ.PINE || o === OBJ.BIRCH || o === OBJ.ROCK || o === OBJ.SAPLING || o === OBJ.RUIN || o === OBJ.CRYSTAL || o === OBJ.DEADTREE || o === OBJ.BUSH;
        const blocking = wild || o === OBJ.GRAVE;
        if (blocking && !(def.onRock && o === OBJ.ROCK)) {
          if (!(clearable && wild)) return { ok: false, reason: 'Blocked — clear first' };
          clearTiles.push({ x, y });
        }
        if (World.occ[i]) return { ok: false, reason: 'Occupied' };
      }
    }
    return { ok: true, reason: '', clearTiles };
  },

  // A5: build costs scale with difficulty — every cost check, payment and
  // refund goes through here so they can never disagree
  costOf(def) {
    const m = (G.diffM && G.diffM.costMul) || 1;
    return { wood: Math.ceil((def.cost.wood || 0) * m), stone: Math.ceil((def.cost.stone || 0) * m) };
  },

  afford(key) {
    const def = BUILD[key]; if (!def) return false;
    const c = this.costOf(def);
    return c.wood <= G.res.wood && c.stone <= G.res.stone;
  },

  pay(key) {
    const c = this.costOf(BUILD[key]);
    G.res.wood -= c.wood;
    G.res.stone -= c.stone;
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
      const c = this.costOf(b.def); // half the (difficulty-scaled) cost back
      Sim.gain('wood', Math.floor(c.wood * 0.5));
      Sim.gain('stone', Math.floor(c.stone * 0.5));
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
  braziers() { return G.buildings.filter(b => b.built && b.key === 'brazier'); },
  litBraziers() { return G.buildings.filter(b => b.built && b.key === 'brazier' && b.lit); },
  musters() { return G.buildings.filter(b => b.built && b.key === 'muster'); },
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

  built(key) { return G.buildings.some(b => b.built && b.key === key); },

  // storage cap for a resource (null = uncapped). Granaries raise the larder,
  // Storehouses/Warehouse raise the materials yard.
  capOf(type) {
    const S = CONFIG.STORE;
    if (!(type in S)) return null;
    let cap = S[type];
    if (type === 'food' || type === 'meals' || type === 'ale' || type === 'herbs') {
      const gran = G.buildings.filter(b => b.built && b.key === 'granary').length;
      cap += gran * (type === 'herbs' ? 10 : S.perGranary);
      if (type === 'food') cap += G.buildings.filter(b => b.built && b.key === 'cellar').length * CONFIG.RESTORE.cellarFood;
    }
    if (type === 'wood' || type === 'stone') {
      const sto = G.buildings.filter(b => b.built && b.key === 'storehouse').length;
      const wh = G.buildings.filter(b => b.built && b.key === 'warehouse').length;
      cap += sto * S.perStorehouse + wh * S.perWarehouse;
    }
    return cap;
  },

  // pay the next tier's price and transform a built building in place
  upgrade(b) {
    const nd = b.def.next && BUILD[b.def.next];
    if (!nd || !b.built || b.demo) return false;
    const c = this.costOf(nd);
    if (c.wood > G.res.wood || c.stone > G.res.stone) return false;
    G.res.wood -= c.wood;
    G.res.stone -= c.stone;
    b.key = b.def.next; b.def = nd; b.w = nd.w; b.h = nd.h;
    b.maxHp = nd.hp; b.hp = nd.hp;
    return true;
  },

  damaged() {
    return G.buildings.filter(b => b.built && !b.demo && b.hp < b.maxHp - 0.5)
      .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
  },

  unBuilt() { return G.buildings.filter(b => !b.built); },

  // per-frame building logic
  update(dt) {
    const night = isNightLike();
    const hasBarracks = G.buildings.some(b => b.built && b.key === 'barracks');
    const hasBakery = G.buildings.some(b => b.built && b.key === 'bakery');
    const hasSky = G.buildings.some(b => b.built && b.key === 'skywatch'); // towers reach further
    const wellBoost = G.buildings.some(b => b.built && b.key === 'aqueduct') ? CONFIG.RESTORE.wellMul : 1;
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
        b.growth = Math.min(1, b.growth + dt * boost * breeze / (b.def.growT || CONFIG.FARM.grow));
      }
      // hospital mends wounded villagers nearby, consuming stored herbs
      // (a Suture session makes each herb mend +15 hp more for the day)
      if (b.def.kind === 'healer' && b.built && G.res.herbs >= 1) {
        let patient = null;
        for (const v of G.villagers) {
          if (v.below) continue;
          if (v.hp < v.maxHp - 1 && U.dst2(v.x, v.y, b.x + b.w / 2, b.y + b.h / 2) < 25) { patient = v; break; }
        }
        if (patient) {
          const perHerb = (G.buffs.suture ? 20 : CONFIG.HERB.herbPerHeal);
          patient.hp = Math.min(patient.maxHp, patient.hp + CONFIG.HERB.healRate * dt);
          b.healDebt = (b.healDebt || 0) + CONFIG.HERB.healRate * dt;
          while (b.healDebt >= perHerb && G.res.herbs >= 1) {
            b.healDebt -= perHerb;
            G.res.herbs -= 1;
          }
          if (Math.random() < dt * 2) Sim.fx('spark', patient.x, patient.y - .5, .3);
        }
      }
      // wells draw a bucket at a time into the village store (C5: well
      // output is a difficulty lever; the ancient Aqueduct wakes a +50% flow)
      if (b.def.kind === 'well' && b.built) {
        b.genT = (b.genT || 0) + dt;
        if (b.genT >= CONFIG.WELL.genT / (((G.diffM && G.diffM.wellMul) || 1) * wellBoost)) {
          b.genT = 0;
          if (G.res.water < Buildings.capOf('water')) Sim.gain('water', 1);
        }
      }
      // kiln chars wood into charcoal, never dipping below the wood floor
      if (b.def.kind === 'kiln' && b.built) {
        b.kilnT = (b.kilnT || 0) + dt;
        if (b.kilnT >= CONFIG.KILN.time) {
          b.kilnT = 0;
          if (G.res.wood > CONFIG.KILN.woodKeep && G.res.charcoal < Buildings.capOf('charcoal')) {
            G.res.wood -= 2;
            Sim.gain('charcoal', 1);
          }
        }
      }
      // press squeezes charcoal + herbs into lamp oil
      if (b.def.kind === 'press' && b.built) {
        b.pressT = (b.pressT || 0) + dt;
        if (b.pressT >= CONFIG.PRESS.time) {
          b.pressT = 0;
          if (G.res.charcoal >= 1 && G.res.herbs >= 1 && G.res.oil < Buildings.capOf('oil')) {
            G.res.charcoal -= 1; G.res.herbs -= 1;
            Sim.gain('oil', 3);
          }
        }
      }
      // while a Bakehouse stands, the windmill's stones grind wheat into flour
      if (b.def.kind === 'windmill' && b.built && hasBakery) {
        b.grindT = (b.grindT || 0) + dt;
        if (b.grindT >= CONFIG.MILL.grindT) {
          b.grindT = 0;
          if (G.res.food > CONFIG.MILL.foodKeep && G.res.flour < Buildings.capOf('flour')) {
            G.res.food -= 1;
            Sim.gain('flour', 1);
          }
        }
      }
      // braziers burn their fuel through the night (a strong kindle lasts a
      // night and a half), and one set beside a lair cleanses it: the
      // monolith can't mend, can't call its brood, and cracks into dawn-stone
      if (b.def.kind === 'brazier' && b.built && b.lit) {
        if (isNightLike()) {
          b.fuel = (b.fuel || 0) - dt;
          if (b.fuel <= 0) { b.lit = false; b.fuel = 0; }
        }
        if (b.lit) {
          for (const l of G.buildings) {
            if (l.key !== 'lair') continue;
            if (U.dst(b.x + .5, b.y + .5, l.x + .5, l.y + .5) > CONFIG.BRAZIER.cleanseR) continue;
            l.cleansed = true;
            l.hp -= CONFIG.BRAZIER.cleanseDps * dt;
            if (Math.random() < dt * 2) Sim.fx('spark', l.x + .5, l.y + .2, .35);
            if (l.hp <= 0) { Sim.lairCleansed(l); break; } // lair is gone — stop poking the list
          }
        }
      }
      // the muster yard: off-duty guards near the effigy drill against the
      // chosen monster type — a completed drill is a permanent +10% (cap +30%)
      if (b.def.kind === 'muster' && b.built && b.drillType && G.villagers.length) {
        const cur = G.drill[b.drillType] || 0;
        if (cur < CONFIG.MUSTER.bonusCap) {
          let drillers = 0;
          for (const v of G.villagers) {
            if (v.job !== 'guard' || v.below) continue;
            if (U.dst2(v.x, v.y, b.x + 1, b.y + 1) < 36) drillers++;
          }
          if (drillers > 0 && !G.raidTarget) { // no drills while a raid is on
            b.drillT = (b.drillT || 0) + dt * Math.min(2, drillers);
            if (b.drillT >= CONFIG.MUSTER.drillT) {
              b.drillT = 0;
              G.drill[b.drillType] = Math.min(CONFIG.MUSTER.bonusCap, cur + CONFIG.MUSTER.bonus);
              const nm = { runner: 'shields', brute: 'pikes', stalker: 'scatter' }[b.drillType];
              UI.toast(`Drill complete — the guards' ${nm} work: +10% vs ${CONFIG.MONS[b.drillType].name}s.`, 'good');
              Sim.log(`The yard drilled ${nm} — guards strike +10% harder against ${CONFIG.MONS[b.drillType].name}s.`, 'good');
            }
          }
        }
      }
      // towers shoot (the Sky Watch's old optics reach 1.5 tiles further)
      if (b.def.kind === 'tower' && b.built && b.cd <= 0) {
        const cx = b.x + .5, cy = b.y + .5;
        const range = b.def.atk.range + (hasSky ? CONFIG.RESTORE.skyRange : 0);
        let tgt = null, bd = range * range;
        for (const m of G.monsters) {
          if (m.dead) continue;
          const d = U.dst2(cx, cy, m.x, m.y);
          if (d < bd) { bd = d; tgt = m; }
        }
        if (tgt) {
          // every shot spends arrows from the store — dry quivers hold fire
          const shots = b.key === 'ballista' ? CONFIG.AMMO.ballistaShots : CONFIG.AMMO.perShot;
          if (G.res.arrows >= shots) {
            G.res.arrows -= shots;
            b.cd = b.def.atk.rate;
            Sim.shootTower(b, tgt);
          } else {
            b.cd = 1.0;
            if (!G.dryWarned) {
              G.dryWarned = true;
              UI.toast('Quivers dry — the towers hold fire! Fletchers turn wood into arrows.', 'bad');
              Sim.log('The towers stood silent for want of arrows.', 'bad');
            }
          }
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
      else if (k === 'manor') out.push([b.x * 16 + 10, b.y * 16 + 26], [b.x * 16 + 34, b.y * 16 + 26]);
      else if (k === 'tavern') out.push([b.x * 16 + 8, b.y * 16 + 22], [b.x * 16 + 24, b.y * 16 + 22]);
      else if (k === 'bottlery') out.push([b.x * 16 + 8, b.y * 16 + 22], [b.x * 16 + 24, b.y * 16 + 22]);
      else if (k === 'bakery') out.push([b.x * 16 + 8, b.y * 16 + 24], [b.x * 16 + 26, b.y * 16 + 24]);
      else if (k === 'school') out.push([b.x * 16 + 10, b.y * 16 + 24], [b.x * 16 + 24, b.y * 16 + 24]);
      else if (k === 'cottage2') out.push([0, 0]);
    }
    return out;
  },
};
