import {recordFlow,recordCost} from './ledger.js';
import {scheduled,sequence,pattern,raidRhythm} from './pressure.js';
export {raidRhythm} from './pressure.js';
import {blighted,frontierCycle} from './frontier.js';
import {syncWarehouses,reserveFreight,supplied,freightJobs,pickupFreight,deliverFreight,deposit,loseWarehouse,replaceLostFreight,terrainValue,validateEconomy} from './economy.js';
import { EXTRA_BUILDINGS } from "./industry.js";
import { favorJob, jobTier } from "./civic.js";
import { unloadSupplies, initDepth, validateDepth, campOrders, depthJobs, workDepth, workRate, equipWorker, nearestDepot, workerNeeds, idleActivity, ensureSites, frontier, summonGuardian, tickGuardians } from "./depth.js";
// Pure simulation: no DOM, rendering, or wall-clock dependencies.
export const W = 64,
  H = 48,
  DAY = 100;
// Difficulty changes pressure and reserves, never the cost of a building.
export const DIFFICULTIES = {
  peaceful: { name: "Peaceful", desc: "Build at your own pace. No monsters; generous supplies.",
    stock: [120, 90, 85, 85], consumption: .8, work: 1.15, firstRaid: 0, interval: 0,
    base: 0, growth: 0, cap: 0, hp: 1, damage: 1, bruteWave: 99, skulkWave: 99 },
  settler: { name: "Settler", desc: "Room to learn. Five days to prepare, smaller raids, faster production.",
    stock: [95, 70, 60, 60], consumption: .85, work: 1.15, firstRaid: 5, interval: 3,
    base: 2, growth: .5, cap: 7, hp: .85, damage: .75, bruteWave: 4, skulkWave: 3 },
  survival: { name: "Survival", desc: "Lean reserves and supply routes. Raids from day four; from day sixteen, two raid nights then one clear night.",
    stock: [70, 48, 40, 40], consumption: 1, work: 1, firstRaid: 4, interval: 2,
    base: 3, growth: .75, cap: 10, hp: 1, damage: 1, bruteWave: 3, skulkWave: 2 },
  onslaught: { name: "Onslaught", desc: "Lean supplies, harder hits and nightly attacks from day three. Each third attack is a smaller patrol.",
    stock: [62, 44, 38, 38], consumption: 1.1, work: 1, firstRaid: 3, interval: 1,
    base: 3, growth: .75, cap: 12, hp: 1, damage: 1.1, bruteWave: 3, skulkWave: 2 },
};
export const MONSTERS = {
  sapper: {name:"Sapper",hp:58,damage:12,speed:.42,desc:"Seeks warehouses. Keep ammunition routes inside your defenses."},
  raveler: { name: "Raveler", hp: 36, damage: 8, speed: .48, desc: "A steady attacker. Two tower shots on Survival." },
  skulker: { name: "Skulker", hp: 24, damage: 5, speed: .75, desc: "Fast and fragile. Intercept before it reaches your homes." },
  brute: { name: "Brute", hp: 80, damage: 15, speed: .34, desc: "Slow and armored. Five tower shots on Survival; use walls to buy time." },
};
export function rules(s) {
  return DIFFICULTIES[s.difficulty] || DIFFICULTIES[s.peaceful ? "peaceful" : "survival"];
}
export function raidDay(s, day = s.day) {
  const d = rules(s);
  return scheduled(s,d,day);
}
export function nextRaidDay(s) {
  const d = rules(s);
  if (s.peaceful || !d.firstRaid) return null;
  let day = Math.max(s.day, d.firstRaid);
  while(!raidDay(s,day)||day===s.raided)day++;
  return day;
}
export function raidInfo(s,day=nextRaidDay(s)){return day===null?null:pattern(rules(s),day);}
export function raidPlan(s, day = nextRaidDay(s)) {
  const d = rules(s);
  if (day === null || s.peaceful || !d.firstRaid || day < d.firstRaid) return [];
  if(s.raidForecast?.day===day)return s.raidForecast.monsters.map(m=>({...m}));
  const info=raidInfo(s,day),wave=sequence(d,day);
  const growth=day>=16?Math.min(4,Math.floor(Math.max(0,s.people.length-12)/6)):0;
  const base=d.base+Math.floor((wave-1)*d.growth)+(s.threat||0)+frontier(s).pressure+growth;
  const budget=Math.min(d.cap+Math.min(12,Math.floor(Math.max(0,day-16)/8)*2),base);
  const count=Math.max(1,Math.ceil(budget*info.scale));
  return Array.from({ length: count }, (_, i) => {
    const kind = day>=17&&info.kind==='raid'&&i%5===2 ? "sapper" : info.kind==='patrol'?(wave>=d.skulkWave&&i%3===1?'skulker':'raveler'):info.kind==='rush'&&wave>=d.skulkWave?(i%4===0?'raveler':'skulker'):info.kind==='siege'&&wave>=d.bruteWave?(i%3===0?'brute':'raveler'):wave >= d.bruteWave && i % 4 === 0 ? "brute" :
      wave >= d.skulkWave && i % 3 === 1 ? "skulker" : "raveler";
    return { kind, hp: Math.round(MONSTERS[kind].hp * d.hp) };
  });
}
export const SEASONS = [
  { name: "Spring", crop: 1, water: 1, hint: "Establish farms and shelter." },
  { name: "Summer", crop: .85, water: 1.25, hint: "Thirst rises. Keep wells staffed." },
  { name: "Autumn", crop: 1.25, water: 1, hint: "A generous harvest. Store food for winter." },
  { name: "Winter", crop: .5, water: 1, hint: "Half harvests. Reserves and kitchens keep people fed." },
];
export function season(s) {
  const index = Math.floor((s.day - 1) / 4) % 4;
  return { ...SEASONS[index], next: SEASONS[(index + 1) % 4].name, daysLeft: 4 - (s.day - 1) % 4 };
}
export const UPGRADES = {
  quarry: {wood: 18, stone: 14, benefit: "+50% stone per trip; richer seams yield more"},
  house: { wood: 18, stone: 8, benefit: "4 → 6 beds" },
  farm: { wood: 16, stone: 6, benefit: "+50% harvest per trip" },
  well: { wood: 12, stone: 12, benefit: "8 → 11 base water per trip; nearby water improves yield" },
  store: { wood: 20, stone: 12, benefit: "+80 extra capacity for each resource" },
  tower: { wood: 16, stone: 24, benefit: "18 → 27 damage per delivered shot" },
};
export function projectCost(b, kind) {
  return kind === "upgrade" ? UPGRADES[b.type] : kind === "repair" ? { wood: 4, stone: 2 } : null;
}
export function startProject(s, b, kind) {
  if (!b || !s.buildings.includes(b) || b.progress < 1 || s.lost) return "Select a completed building.";
  if (b.project) return "Workers already have a project here.";
  const cost = projectCost(b, kind);
  if (!cost || (kind === "upgrade" && b.upgraded)) return "No further upgrade available.";
  if (kind === "repair" && b.hp >= DEFS[b.type].hp) return "Already in good condition.";
  if (s.stock.wood < cost.wood || s.stock.stone < cost.stone) return "Gather more timber and stone first.";
  recordCost(s,cost);
  b.freight=reserveFreight(s,cost);
  s.stock.wood -= cost.wood; s.stock.stone -= cost.stone;
  b.project = { kind, progress: 0 };
  log(s, `${DEFS[b.type].name}: ${kind} queued. Workers must reach the building.`);
  return "";
}
export function productionYield(s, b) {
  const land=blighted(s,b.x,b.y)?.5:1;
  return b.type === "farm" ? Math.max(1, Math.round(8 * land * REGIONS[s.region].food * terrainValue(s,b.x,b.y).soil * season(s).crop * (b.upgraded ? 1.5 : 1))) : Math.max(1,Math.round(land*(b.upgraded ? 11 : 8)*terrainValue(s,b.x,b.y).water));
}
export function campaign(s) {
  const built = type => completed(s, type).length > 0;
  const build = (type, label) => ({ type, label, done: built(type) });
  const improve = (type, label) => ({ improve: type, label, done: completed(s, type).some(b => b.upgraded) });
  const need = dailyNeeds(s);
  const chapters = [
    { name: "Light the hearth", purpose: "A home, clean water, and food. Next: establish your supply lines.", steps: [
      build("hearth", "Place your Hearthhold in a clearing."), build("house", "Build a cottage for four more villagers."),
      build("well", "Build a Dew well for drinking water."), build("farm", "Plant a Field patch to feed the village.") ] },
    { name: "Secure the village", purpose: "Keep materials arriving while you prepare for danger. Next: improve production.", steps: [
      build("lumber", "Build a Beamwright near trees."), build("quarry", "Build a Stonewright near stone."),
      s.peaceful ? build("garden", "Make a Pocket garden to lift morale.") : build("tower", "Build a Farwatch on a raid approach. Keep stone for shots.") ] },
    { name: "Prepare for winter", purpose: "Store surplus harvests before cold weather halves crop yields. Next: carry a thriving village through winter.", steps: [
      build("kitchen", "Build a Commonpot to reduce daily food use."), build("store", "Build a storehouse for larger reserves."),
      improve("farm", "Improve a field for 50% more food per trip."),
      { label: `Stockpile two days of food: ${Math.floor(s.stock.food)}/${need.food * 2}.`, done: s.stock.food >= need.food * 2 } ] },
    { name: "A lasting home", purpose: "Maintain a growing village and dependable supply routes. Then develop industry and the frontier.", steps: [
      improve("house", "Improve a cottage to welcome two more villagers."), build("garden", "Create a Pocket garden to keep spirits high."),
      build("beacon", "Raise a Wishing spire to strengthen your powers."),
      { label: `Welcome twelve villagers: ${s.people.length}/12. Spare beds and supplies attract a traveler at dawn.`, done: s.people.length >= 12 },
      { label: `Deliver 20 supply loads: ${s.stats?.freight||0}/20. Build a working supply network.`, done:(s.stats?.freight||0)>=20 } ] },
    { name: "A working town", purpose: "Turn raw materials into tools, trade meals for longer reserves, and uncover a keeper's blessing.", steps: [
      build("workshop", "Build a Sawmill: timber becomes planks."), build("forge", "Build a Tool forge: planks and stone become tools."),
      { label: "Equip a villager with a crafted tool.", done: (s.people || []).some(p=>p.toolUses>0) || !!s.stats?.equipped },
      { site: "relic", label: "Explore the old keeper shrine and choose a permanent blessing.", done: !!s.blessing } ] },
    { name: "Reclaim the frontier", purpose: "Renew your forests and remove the rift's growing pressure. The whole region becomes a lasting home.", steps: [
      build("forester", "Build a Forester lodge to renew harvested timber."),
      { label: "Plant three trees: "+(s.stats?.planted || 0)+"/3.", done:(s.stats?.planted || 0)>=3 },
      { site: "rift", label: "Seal the Hollow Rift: take 10 planks and 4 tools on an expedition.", done: !!s.stats?.riftSealed },
      {label:"Discover all three abandoned sites.",done:(s.sites||[]).filter(v=>v.kind!=="rift"&&v.done).length>=3,site:"cache"} ] },
  ];
  const frontierChapter={name:"A foothold beyond home",purpose:"Develop a protected district and keep the Hollow away from productive land.",steps:[{type:"outpost",label:"Build a Frontier depot at least 16 tiles from the hearth.",done:completed(s,"outpost").some(b=>completed(s,"hearth").some(h=>Math.hypot(h.x-b.x,h.y-b.y)>=16))},{label:"Work a rich seam or riverside field within 10 tiles of the frontier depot.",done:completed(s,"outpost").some(o=>s.buildings.some(b=>b.progress>=1&&Math.hypot(b.x-o.x,b.y-o.y)<10&&((b.type==="quarry"&&terrainValue(s,b.x,b.y).seam>=1)||(b.type==="farm"&&terrainValue(s,b.x,b.y).soil>1))))},{label:s.peaceful?"Reclaim the old Hollow site.":"Reclaim two Hollow fronts.",site:"rift",done:(s.sites||[]).filter(v=>v.kind==="rift"&&v.done).length>=(s.peaceful?1:2)}]};
  chapters.push({name:"Supply the defenses",purpose:"Ammunition yards stretch scarce stone into prepared shots. Protect the carriers.",steps:[s.peaceful?build("store","Build a storehouse for surplus supplies."):build("arsenal","Build an Ammunition yard."),{label:"Deliver 50 supply loads through your network.",done:(s.stats?.freight||0)>=50},{label:s.peaceful?"Stock 12 planks for a frontier district.":"Keep 12 prepared shots in storage or towers.",done:s.peaceful?(s.stock.planks||0)>=12:(s.stock.ammo||0)+s.buildings.reduce((n,b)=>n+(b.buffer?.ammo||0),0)>=12}]});
  chapters.push(frontierChapter);
  const earned = s.chapters || [];
  const index = chapters.findIndex((_, i) => !earned.includes(i));
  return { chapters, index, current: index < 0 ? null : chapters[index], earned };
}
export function advanceCampaign(s) {
  if (s.lost) return;
  s.chapters ??= [];s.progressionVersion=2;
  let path = campaign(s);
  while (path.current && path.current.steps.every(step => step.done)) {
    s.chapters.push(path.index);
    s.influence = Math.min(influenceCap(s), (s.influence || 0) + 30);
    log(s, `Chapter complete: ${path.current.name}. +30 influence (up to capacity).`);
    path = campaign(s);
  }
}
export function dailyNeeds(s) {
  const multiplier = rules(s).consumption;
  return { food: Math.ceil(s.people.length * 2 * multiplier * (completed(s, "kitchen").length ? .85 : 1)),
    water: Math.ceil(s.people.length * 1.5 * multiplier * season(s).water) };
}
export const REGIONS = [
  {
    name: "Fernwake",
    tag: "THE WOODLAND",
    text: "Deep forests, sheltered clearings. Plenty of timber; room must be earned.",
    wood: 0.22,
    rock: 0.028,
    food: 1,
  },
  {
    name: "Honeymead",
    tag: "THE LOWLAND",
    text: "Wide meadows and rich soil. Faster harvests; open approaches.",
    wood: 0.085,
    rock: 0.035,
    food: 1.25,
  },
  {
    name: "Greyreach",
    tag: "THE HIGHLAND",
    text: "Stone underfoot, pines on the ridge. Rich quarries; slower crops.",
    wood: 0.1,
    rock: 0.15,
    food: 0.85,
  },
];
export const DEFS = {
  ...EXTRA_BUILDINGS,
  quarry: {
    name: "Stonewright",
    glyph: "◆",
    mask: ["111", "110", "100"],
    wood: 16,
    stone: 8,
    time: 8,
    hp: 110,
    desc: "Marks nearby stone. Extracts 2, 4 or 6 stone per 24 working seconds depending on the surveyed seam. Rich seams reward an outpost.",
  },
  beacon: {
    name: "Wishing spire",
    glyph: "✦",
    mask: ["11", "11"],
    wood: 18,
    stone: 20,
    time: 10,
    hp: 120,
    desc: "Increases influence capacity by 50 and generates a little influence over time.",
  },
  hearth: {
    name: "Hearthhold",
    glyph: "⌂",
    mask: ["1111", "1111", "1110"],
    wood: 0,
    stone: 0,
    time: 6,
    hp: 300,
    desc: "The village heart shelters six. Free workers gather nearby starter materials when reserves run low. Storehouses shorten deliveries.",
  },
  house: {
    name: "Hearth cottage",
    glyph: "⌂",
    mask: ["111", "111", "110"],
    wood: 14,
    stone: 3,
    time: 7,
    hp: 90,
    desc: "A warm roof for four villagers. Leave an open edge for access.",
  },
  well: {
    name: "Dew well",
    glyph: "◈",
    mask: ["11", "11"],
    wood: 8,
    stone: 8,
    time: 6,
    hp: 90,
    desc: "Draws water in 14 working seconds. Water access improves yield; workers carry it to local storage.",
  },
  farm: {
    name: "Field patch",
    glyph: "♧",
    mask: ["1111", "1111", "1111"],
    wood: 10,
    stone: 0,
    time: 5,
    hp: 60,
    desc: "Grows food in 20 working seconds. Soil, region and season affect yield. Check the land before planting.",
  },
  lumber: {
    name: "Beamwright",
    glyph: "♜",
    mask: ["1111", "1100", "1100"],
    wood: 12,
    stone: 4,
    time: 8,
    hp: 100,
    desc: "Marks nearby trees within 12 tiles for workers to harvest.",
  },
  kitchen: {
    name: "Commonpot",
    glyph: "♨",
    mask: ["111", "101", "100"],
    wood: 18,
    stone: 8,
    time: 9,
    hp: 100,
    desc: "Cuts daily food use by 15%. A cook also turns 4 food and 1 water into 3 meals; each meal replaces 2 food at dawn. Production can be paused.",
  },
  garden: {
    name: "Pocket garden",
    glyph: "✿",
    mask: ["11", "11"],
    wood: 8,
    stone: 2,
    time: 4,
    hp: 50,
    desc: "Adds 2 daily morale, up to 6. Gardens cannot replace food and water.",
  },
  tower: {
    name: "Farwatch",
    glyph: "♜",
    mask: ["11", "11"],
    wood: 18,
    stone: 14,
    time: 10,
    hp: 150,
    desc: "Defends within 11 tiles. Construction includes 2 stone shots. Workers deliver crafted ammunition or emergency stone shots. Protect the supply route.",
  },
  wall: {
    name: "Stone stitch",
    glyph: "▥",
    mask: ["1"],
    wood: 0,
    stone: 2,
    time: 2,
    hp: 200,
    desc: "Blocks movement and diverts raiders. Leave your villagers a route.",
  },
  path: {
    name: "Foot trail",
    glyph: "∷",
    mask: ["1"],
    wood: 1,
    stone: 0,
    time: 0,
    hp: 30,
    desc: "Walkable. Citizens travel 60% faster along trails.",
  },
  store: {
    name: "Keepshed",
    glyph: "▤",
    mask: ["111", "011"],
    wood: 12,
    stone: 3,
    time: 6,
    hp: 90,
    desc: "Adds 80 capacity and stores actual delivered supplies here. Place near work and keep its supply routes open.",
  },
};
export function hash(s) {
  let n = 2166136261;
  for (const c of String(s)) {
    n ^= c.charCodeAt(0);
    n = Math.imul(n, 16777619);
  }
  return n >>> 0;
}
export function rng(seed) {
  let n = seed >>> 0;
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function noise(x, y, seed) {
  return hash(x + "," + y + "," + seed) / 4294967296;
}
export function footprint(type, rot = 0) {
  let a = DEFS[type].mask.map((s) => [...s]);
  for (let i = 0; i < rot % 4; i++)
    a = a[0].map((_, x) => a.map((row) => row[x]).reverse());
  const cells = [];
  a.forEach((row, y) =>
    row.forEach((v, x) => {
      if (v === "1") cells.push([x, y]);
    }),
  );
  return cells;
}
export function terrain(seed, region = 0) {
  const r = rng(hash(seed + ":" + region)),
    tiles = [];
  const bend = r() * 6,
    reg = REGIONS[region];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
      const river = 7 + Math.sin(y * 0.16 + bend) * 3;
      let t = 0;
      if (edge < 2 || (x < river && y > 8 && y < 40)) t = 1;
      else if (edge < 3 || (Math.abs(x - river) < 1.5 && y > 8 && y < 40))
        t = 2;
      else if (r() < reg.wood) t = 3;
      else if (r() < reg.rock) t = 4;
      // Two open founding areas; guaranteed accessible starter materials nearby.
      if (
        (x > 24 && x < 38 && y > 17 && y < 30) ||
        (x > 43 && x < 52 && y > 30 && y < 39)
      )
        t = 0;
      tiles.push(t);
    }
  for (let i = 0; i < 10; i++) {
    tiles[(14 + (i % 3)) * W + 27 + (i % 7)] = 3;
    tiles[(32 + (i % 3)) * W + 30 + (i % 7)] = 4;
  }
  return tiles;
}
const names = [
  "Wren",
  "Moss",
  "Nell",
  "Bram",
  "Pip",
  "Ada",
  "Rowan",
  "Kit",
  "Fern",
  "Cove",
  "Lark",
  "Otto",
  "Eira",
  "Reed",
  "Sage",
  "Jun",
];
export function createWorld(seed, region, difficulty = "survival") {
  // The boolean signature is retained for old callers and saved games.
  const mode = typeof difficulty === "boolean" ? (difficulty ? "peaceful" : "survival") : difficulty;
  if (!Object.hasOwn(DIFFICULTIES, mode)) throw Error("Unknown difficulty");
  const d = DIFFICULTIES[mode];
  return {
    version: 1,
    seed,
    region,
    peaceful: mode === "peaceful",
    difficulty: mode,
    threat: 0,
    tiles: terrain(seed, region),
    roads: [],
    buildings: [],
    people: [],
    enemies: [],
    marks: [],
    stock: { ...Object.fromEntries(["wood", "stone", "food", "water"].map((key, i) => [key, d.stock[i]])), planks: 0, tools: 0, meals: 0, ammo:0 },
    time: 0,
    day: 1,
    nextId: 1,
    morale: 80,
    influence: 35,
    focus: "balanced",
    events: [],
    raided: 0,
    won: false,
    lost: false,
    effects: [],
  };
}
export function log(s, text) {
  s.events.unshift({ day: s.day, text });
  s.events = s.events.slice(0, 20);
}
export const completed = (s, type) =>
  s.buildings.filter((b) => b.type === type && b.progress >= 1);
export function capacity(s) {
  return 140 + completed(s, "store").reduce((n, b) => n + (b.upgraded ? 160 : 80), 0)+completed(s,"outpost").length*80;
}
export function beds(s) {
  return (
    (completed(s, "hearth").length ? 6 : 0) + completed(s, "house").reduce((n, b) => n + (b.upgraded ? 6 : 4), 0)
  );
}
export function buildingAt(s, x, y) {
  return s.buildings.find((b) =>
    footprint(b.type, b.rot).some(
      ([dx, dy]) => b.x + dx === x && b.y + dy === y,
    ),
  );
}
export function blocked(s, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return true;
  return [1, 3, 4].includes(s.tiles[y * W + x]) || !!buildingAt(s, x, y);
}
export function occupancy(s, enemy = false) {
  const grid = s.tiles.map((t) => ([1, 3, 4].includes(t) ? 1 : 0));
  for (const b of s.buildings)
    if (enemy || b.type !== "gate") for (const [dx, dy] of footprint(b.type, b.rot))
      grid[(b.y + dy) * W + b.x + dx] = 1;
  return grid;
}
export function route(s, x, y, tx, ty, grid = occupancy(s)) {
  x = Math.floor(x);
  y = Math.floor(y);
  const start = y * W + x,
    target = ty * W + tx;
  if (start === target) return [];
  if (tx < 0 || ty < 0 || tx >= W || ty >= H || grid[target]) return null;
  const prev = new Int32Array(W * H).fill(-1),
    queue = [start];
  prev[start] = start;
  for (let i = 0; i < queue.length; i++) {
    const v = queue[i],
      cx = v % W,
      cy = Math.floor(v / W);
    for (const [nx, ny] of [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (prev[n] >= 0 || grid[n]) continue;
      prev[n] = v;
      if (n === target) {
        let cur = n,
          p = [];
        while (cur !== start) {
          p.push([(cur % W) + 0.5, Math.floor(cur / W) + 0.5]);
          cur = prev[cur];
        }
        return p.reverse();
      }
      queue.push(n);
    }
  }
  return null;
}
export function edgeCells(s, b, grid = occupancy(s)) {
  const cells = [];
  for (const [dx, dy] of footprint(b.type, b.rot))
    for (const [ox, oy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = b.x + dx + ox,
        y = b.y + dy + oy;
      if (
        x >= 0 &&
        y >= 0 &&
        x < W &&
        y < H &&
        !grid[y * W + x] &&
        !cells.some((c) => c[0] === x && c[1] === y)
      )
        cells.push([x, y]);
    }
  return cells;
}
export function accessRoute(s, p, b, grid) {
  const edges = edgeCells(s, b, grid).sort(
    (a, c) =>
      Math.hypot(p.x - a[0], p.y - a[1]) - Math.hypot(p.x - c[0], p.y - c[1]),
  );
  for (const [x, y] of edges) {
    const path = route(s, p.x, p.y, x, y, grid);
    if (path) return path;
  }
  return null;
}
export function canPlace(s, type, x, y, rot) {
  if (!DEFS[type]) return "Unknown building";
  if (DEFS[type].unlock && !completed(s, DEFS[type].unlock).length) return "Complete a " + DEFS[DEFS[type].unlock].name + " first.";
  if (s.sites?.some(site => !site.done && footprint(type, rot).some(([dx,dy])=>site.x===x+dx && site.y===y+dy))) return "Explore this site before building over it.";
  if (s.lost) return "This settlement has fallen. Begin again from the island.";
  if (type === "hearth" && s.buildings.some((b) => b.type === "hearth"))
    return "Your village already has a hearth.";
  if (type !== "hearth" && !s.buildings.some((b) => b.type === "hearth"))
    return "Place the Hearthhold first.";
  if(blighted(s,x,y)&&!["outpost","beacon","wall","gate","path"].includes(type))return "Hollow blight: reclaim the site or ward this land with a frontier depot.";
  const cells = footprint(type, rot);
  for (const [dx, dy] of cells) {
    const ax = x + dx,
      ay = y + dy;
    if (ax < 2 || ay < 2 || ax >= W - 2 || ay >= H - 2)
      return "Leave two tiles clear at the region boundary.";
    if (![0, 2].includes(s.tiles[ay * W + ax]))
      return "Clear trees or stone first.";
    if (buildingAt(s, ax, ay)) return "Another building occupies this space.";
    if (s.roads.includes(ay * W + ax) && type === "path")
      return "A trail already crosses here.";
    if (s.people.some((p) => Math.floor(p.x) === ax && Math.floor(p.y) === ay))
      return "A villager is standing here.";
  }
  const def = DEFS[type];
  if (s.stock.wood < def.wood || s.stock.stone < def.stone)
    return "Not enough materials. Mark nearby trees or rocks to harvest.";
  if (type !== "path") {
    const candidate = { x, y, type, rot };
    const grid = occupancy(s);
    if(type!=="gate") for (const [dx, dy] of cells) grid[(y + dy) * W + x + dx] = 1;
    if (!edgeCells(s, candidate, grid).length)
      return "Leave a walkable edge for builders.";
    if (
      s.people.length &&
      !s.people.some((p) => accessRoute(s, p, candidate, grid) !== null)
    )
      return "No worker can reach this site.";
    if (s.people.length) {
      // Compare connected ground, not just access to any edge of a building.
      // Otherwise two workers can reach opposite sides of a warehouse while
      // being unable to carry supplies between their separate pockets.
      const worker=s.people[0],before=occupancy(s);
      const flood=map=>{
        const seen=new Uint8Array(W*H),start=Math.floor(worker.y)*W+Math.floor(worker.x),queue=[start];seen[start]=1;
        for(let i=0;i<queue.length;i++){const v=queue[i],x=v%W,y=Math.floor(v/W);for(const [nx,ny]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
          if(nx<0||ny<0||nx>=W||ny>=H)continue;const n=ny*W+nx;if(!map[n]&&!seen[n]){seen[n]=1;queue.push(n);}
        }}return seen;
      };
      const was=flood(before),after=flood(grid);
      for(const p of s.people){const i=Math.floor(p.y)*W+Math.floor(p.x);if(was[i]&&!after[i])return "Leave a connected supply route for every worker.";}
      for(const b of s.buildings){
        if(b.type==='wall'||b.type==='path')continue;
        if(edgeCells(s,b,before).some(([x,y])=>was[y*W+x])&&!edgeCells(s,b,grid).some(([x,y])=>after[y*W+x]))return "Leave a passage to existing buildings.";
      }
    }
  }
  return "";
}
export function suggestedSite(s, type, cx, cy, rot = 0) {
  const candidates = [];
  for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++)
    candidates.push({ x: Math.round(cx) + dx, y: Math.round(cy) + dy, distance: dx * dx + dy * dy });
  if(['quarry','farm','well'].includes(type))for(const p of candidates){
    const land=terrainValue(s,p.x,p.y);p.distance-=(type==='quarry'?48*land.seam:24*land[type==='farm'?'soil':'water']);
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const site = candidates.find(p => !canPlace(s, type, p.x, p.y, rot));
  return site ? { x: site.x, y: site.y } : null;
}
export function place(s, type, x, y, rot = 0) {
  const reason = canPlace(s, type, x, y, rot);
  if (reason) return reason;
  const d = DEFS[type];
  recordCost(s,{wood:d.wood,stone:d.stone});
  const freight=type === "path"?null:reserveFreight(s,d);
  s.stock.wood -= d.wood;
  s.stock.stone -= d.stone;
  if (type === "path") {
    s.roads.push(y * W + x);
    return "";
  }
  const b = { id: s.nextId++, type, x, y, rot, progress: 0, hp: d.hp, cool: 0, freight:freight||[], buffer:{} };
  s.buildings.push(b);
  if (type === "hearth") {
    const e = edgeCells(s, b);
    for (let i = 0; i < 6; i++) {
      const cell = e[i % e.length];
      s.people.push({
        id: s.nextId++,
        name: names[i],
        x: cell[0] + 0.5,
        y: cell[1] + 0.5,
        path: [],
        task: null,
        carry: null,
        work: 0,
        state: "Finding a first task",
      });
    }
    log(s, "Six travelers found a place to call home.");
  }
  return "";
}
// Four-connected grid line keeps diagonal walls and trails continuous.
export function buildLine(from, to) {
  let x = from.x, y = from.y;
  const dx = Math.abs(to.x - x), dy = Math.abs(to.y - y), sx = Math.sign(to.x - x), sy = Math.sign(to.y - y);
  const cells = [{x, y}]; let ix = 0, iy = 0;
  while (ix < dx || iy < dy) {
    if (ix < dx && (iy === dy || (ix + .5) / dx < (iy + .5) / dy)) { x += sx; ix++; }
    else { y += sy; iy++; }
    cells.push({x, y});
  }
  return cells;
}
export function linePlan(s, type, from, to) {
  if (!["wall", "path"].includes(type)) return {cells: [], reason: "Choose a wall or trail."};
  if (![from.x, from.y, to.x, to.y].every(Number.isInteger) || Math.abs(to.x - from.x) + Math.abs(to.y - from.y) > W + H) return {cells: [], reason: "Draw a shorter line inside the map."};
  const draft = {...s, ledger:structuredClone(s.ledger), buildings: structuredClone(s.buildings), roads: [...s.roads], stock: {...s.stock}};
  const cells = buildLine(from, to).filter(p => type === "path" ? !s.roads.includes(p.y * W + p.x) : !["wall", "gate"].includes(buildingAt(s, p.x, p.y)?.type));
  for (const p of cells) {
    const reason = place(draft, type, p.x, p.y);
    if (reason) return {cells, reason};
  }
  return {cells, reason: cells.length ? "" : "This line is already built.", wood: s.stock.wood - draft.stock.wood, stone: s.stock.stone - draft.stock.stone};
}
export function placeLine(s, type, from, to) {
  const plan = linePlan(s, type, from, to);
  if (plan.reason) return plan.reason;
  for (const p of plan.cells) place(s, type, p.x, p.y);
  return "";
}
export function remove(s, b) {
  if (b.type === "hearth") return "The Hearthhold anchors this village.";
  syncWarehouses(s);loseWarehouse(s,b);
  s.buildings = s.buildings.filter((v) => v.id !== b.id);
  const d = DEFS[b.type];
  s.stock.wood = Math.min(capacity(s), s.stock.wood + Math.max(0,Math.floor(d.wood / 2)-s.people.filter(p=>p.carry?.target===b.id&&p.carry.key==="wood").reduce((n,p)=>n+p.carry.n,0)));
  s.stock.stone = Math.min(
    capacity(s),
    s.stock.stone + Math.max(0,Math.floor(d.stone / 2)-s.people.filter(p=>p.carry?.target===b.id&&p.carry.key==="stone").reduce((n,p)=>n+p.carry.n,0)),
  );
  log(s, d.name + " dismantled; half its materials recovered.");
  return "";
}
function give(s, key, n) {
  s.stock[key] = Math.min(capacity(s), s.stock[key] + n);
}
function move(p, dt, s, grid, enemy = false) {
  if (!p.path?.length) return false;
  const [tX, tY] = p.path[0];
  if (grid[Math.floor(tY) * W + Math.floor(tX)]) {
    p.path = [];
    p.task = null;
    p.state = "Route changed — finding another";
    return false;
  }
  const dx = tX - p.x,
    dy = tY - p.y,
    d = Math.hypot(dx, dy),
    speed =
      (s.roads.includes(Math.floor(p.y) * W + Math.floor(p.x)) ? 3.4 : 2.1) *
      (!enemy && s.morale < 30 ? 0.6 : 1) *
      dt;
  if (d <= speed) {
    p.x = tX;
    p.y = tY;
    p.path.shift();
  } else {
    p.x += (dx / d) * speed;
    p.y += (dy / d) * speed;
  }
  return true;
}
function assign(s, p, grid) {
  const claimed = new Set(
    s.people.filter((v) => v !== p && v.task).map((v) => v.task.key),
  );
  const jobs = [...freightJobs(s,grid),...depthJobs(s)];
  for (const b of s.buildings) {
    if (b.progress < 1) {
      if(supplied(s,b))jobs.push({ key: "build" + b.id, kind: "build", b, priority: 0 });
      continue;
    }
    else if (b.project) {if(supplied(s,b))jobs.push({ key: "project" + b.id, kind: "project", b, priority: b.project.kind === "repair" ? 0 : 1 });continue;}
    else if (!b.paused && b.type === "farm" && s.stock.food < capacity(s) - 8)
      jobs.push({
        key: "farm" + b.id,
        kind: "farm",
        b,
        priority: s.stock.food < 20 ? 0 : 2,
      });
    else if (!b.paused && b.type === "well" && s.stock.water < capacity(s) - 8)
      jobs.push({
        key: "well" + b.id,
        kind: "well",
        b,
        priority: s.stock.water < 20 ? 0 : 2,
      });
  }
  for (const index of s.marks) {
    if (![3, 4].includes(s.tiles[index])) continue;
    const key = s.tiles[index] === 3 ? "wood" : "stone";
    if (s.stock[key] >= capacity(s) - 6) continue;
    jobs.push({
      key: "harvest" + index,
      kind: "harvest",
      index,
      b: { type: "wall", x: index % W, y: Math.floor(index / W), rot: 0 },
      priority: 1,
    });
  }
  for (const job of jobs) {
    if(job.b?.priority||s.buildings.find(b=>b.id===job.target)?.priority)job.priority-=5;
    favorJob(s,p,job);
    if (
      (s.focus === "build" && ["build", "project"].includes(job.kind)) ||
      (s.focus === "harvest" && job.kind === "harvest") ||
      (s.focus === "food" && ["farm", "well"].includes(job.kind))
    )
      job.priority -= 4;
  }
  jobs.sort(
    (a, b) =>
      jobTier(s,p,a)-jobTier(s,p,b) || a.priority - b.priority ||
      Math.hypot(p.x - a.b.x, p.y - a.b.y) -
        Math.hypot(p.x - b.b.x, p.y - b.b.y),
  );
  for (const job of jobs) {
    if (claimed.has(job.key)) continue;
    const path = accessRoute(s, p, job.b, grid);
    if (path === null) continue;
    delete p.idleReason;
    p.task = { key: job.key, kind: job.kind, id: job.b.id, index: job.index, site: job.site, target:job.target, good:job.good, amount:job.amount };
    equipWorker(s, p);
    p.path = path;
    p.work = 0;
    p.state =
      ["freight","supply"].includes(job.kind) ? "Collecting supplies for delivery" : job.kind === "mine" ? "Mining deeper stone" : job.kind === "heal" ? "Caring for injured villagers" : job.kind === "craft" ? "Refining supplies" : job.kind === "plant" ? "Planting new trees" : job.kind === "explore" ? "Traveling to an old site" : job.kind === "build"
        ? "Building " + DEFS[job.b.type].name
        : job.kind === "project" ? (job.b.project.kind === "repair" ? "Repairing " : "Upgrading ") + DEFS[job.b.type].name
        : job.kind === "harvest"
          ? "Gathering " + (s.tiles[job.index] === 3 ? "timber" : "stone")
          : job.kind === "farm"
            ? "Tending crops"
            : "Drawing water";
    return;
  }
  const openJobs=jobs.filter(j=>!claimed.has(j.key));
  p.idleReason=!jobs.length?"No open orders or production demand":!openJobs.length?"Available jobs already staffed":"Open jobs cannot be reached";
  p.state = p.idleReason;
  idleActivity(s,p,grid);
}
function daily(s) {
  if(s.day>=5 && (s.day-5)%4===0)log(s,"A caravan has arrived for two days. Open Village → Visiting caravan to trade through a Keepshed.");
  if ((s.day - 1) % 4 === 0) log(s, `${season(s).name} has arrived. ${season(s).hint}`);
  if (s.day % 16 === 11) log(s, "Winter arrives in two days. Upgrade fields and store a food reserve.");
  const { food: foodNeed, water: waterNeed } = dailyNeeds(s);
  const meals = Math.min(s.stock.meals || 0, Math.floor(foodNeed / 2));
  const rawNeed = foodNeed - meals * 2;
  const fed = s.stock.food >= rawNeed && s.stock.water >= waterNeed;
  recordCost(s,{meals,food:Math.min(s.stock.food,rawNeed),water:Math.min(s.stock.water,waterNeed)});
  s.stock.meals = (s.stock.meals || 0) - meals;
  s.stock.food = Math.max(0, s.stock.food - rawNeed);
  s.stock.water = Math.max(0, s.stock.water - waterNeed);
  s.morale = Math.max(
    0,
    Math.min(
      100,
      s.morale +
        (fed ? 4 : -18) +
        Math.min(6, completed(s, "garden").length * 2) -
        (beds(s) < s.people.length ? 8 : 0),
    ),
  );
  for(const p of s.people)p.health=Math.max(0,Math.min(100,(p.health??100)+(fed?8:-8)));
  if (!fed)
    log(s, "Supplies ran short. Food and water restore morale and work speed.");
  if (
    fed &&
    beds(s) > s.people.length &&
    s.people.length < 48 &&
    s.morale >= 50
  ) {
    const hearth = s.buildings.find((b) => b.type === "hearth");
    const e = hearth && edgeCells(s, hearth)[0];
    if (e) {
      s.people.push({
        id: s.nextId++,
        name: names[s.people.length % names.length],
        x: e[0] + 0.5,
        y: e[1] + 0.5,
        path: [],
        task: null,
        carry: null,
        work: 0,
        state: "Arriving", health:100, energy:100, toolUses:0,
      });
      log(s, "A traveler joined the village. A new story begins.");
    }
  }
  if (raidDay(s))
    log(s, `${raidInfo(s,s.day).label}: ${raidPlan(s,s.day).length} monsters expected at ${raidInfo(s,s.day).time}, from the ${raidInfo(s,s.day).approach}.`);
  if (
    !s.won &&
    s.day >= 4 &&
    s.people.length >= 8 &&
    beds(s) >= s.people.length &&
    fed &&
    completed(s, "farm").length &&
    completed(s, "well").length &&
    completed(s, "garden").length
  ) {
    s.won = true;
    log(
      s,
      "Promise kept. A place for everyone. Your first chapter is complete — keep growing!",
    );
  }
}
export function raid(s) {
  if (!raidDay(s) || s.raided === s.day) return;
  const grid = occupancy(s),
    r = rng(hash(s.seed + s.day));
  const d = rules(s), plan = raidPlan(s, s.day);
  const info=raidInfo(s,s.day),side=info.side;
  let spawned = 0;
  const hollow=frontier(s);
  for (const [index,monster] of plan.entries()) {
    // Find an actually reachable entry; a forest must not silently cancel a raid.
    let entry = index>=plan.length-hollow.pressure && hollow.site && !grid[hollow.site.y*W+hollow.site.x] ? {x:hollow.site.x,y:hollow.site.y} : null;
    const target = s.buildings.find((b) => b.type === "hearth");
    for (let attempt = 0; !entry && attempt < 160; attempt++) {
      const depth = 3 + attempt % 6;
      // Cycle east, north, west, south; use other edges if this one is ocean.
      const flank=info.pincer&&index>=Math.ceil(plan.length/2)?2:0;
      const edge = (side + flank + Math.floor(attempt / 40)) % 4;
      const x = edge === 0 ? W - depth - 1 : edge === 2 ? depth : 4 + Math.floor(r() * (W - 8));
      const y = edge === 1 ? depth : edge === 3 ? H - depth - 1 : 4 + Math.floor(r() * (H - 8));
      if (
        !grid[y * W + x] &&
        (!target ||
          accessRoute(s, { x, y }, target, grid) ||
          s.buildings.some(
            (b) => b.type === "wall" && accessRoute(s, { x, y }, b, grid),
          ))
      ) {
        entry = { x, y };
        break;
      }
    }
    if (entry) {
      s.enemies.push({
        id: s.nextId++,
        x: entry.x + 0.5,
        y: entry.y + 0.5,
        kind: monster.kind,
        hp: monster.hp,
        path: [],
        cool: 0,
        age: 0,
      });
      spawned++;
    }
  }
  s.raided = s.day;
  log(s, spawned ? `${spawned} monsters crossed the border. Protect the hearth!` : "The raiding party could not find a route into the village.");
}
export function tick(s, dt) {
  initDepth(s);
  unloadSupplies(s);
  if (!s.people.length || s.lost) return;
  s.influence ??= 35;
  s.focus ??= "balanced";
  s.influence = Math.min(
    influenceCap(s),
    s.influence + completed(s, "beacon").length * dt * 0.06,
  );
  s.time += dt;
  const day = Math.floor(s.time / DAY) + 1;
  if (day > s.day) {
    s.day = day;
    daily(s);
  }
  if(raidDay(s)&&s.raidForecast?.day!==s.day)s.raidForecast={day:s.day,monsters:raidPlan(s,s.day)};
  if (
    raidDay(s) &&
    s.time % DAY > DAY * raidInfo(s,s.day).phase &&
    s.raided !== s.day
  )
    raid(s);
  for (const convoy of s.convoys) convoy.remaining=Math.max(0,convoy.remaining-dt);
  const grid = occupancy(s);
  ensureSites(s,grid);frontierCycle(s);
  syncWarehouses(s);replaceLostFreight(s);
  if ((s.campTimer = (s.campTimer || 0) - dt) <= 0) {campOrders(s);s.campTimer=5;}
  tickGuardians(s,dt,grid);
  for (const b of [...completed(s, "lumber"), ...completed(s, "quarry")])
    for (let y = Math.max(0, b.y - 12); y < Math.min(H, b.y + 13); y++)
      for (let x = Math.max(0, b.x - 12); x < Math.min(W, b.x + 13); x++) {
        const i = y * W + x;
        if (
          s.tiles[i] === (b.type === "quarry" ? 4 : 3) &&
          !s.marks.includes(i)
        )
          s.marks.push(i);
      }
  s.marks = s.marks.filter((i) => [3, 4].includes(s.tiles[i]));
  for (const p of s.people) {
    if (workerNeeds(s,p,dt,grid)) continue;
    if (move(p, dt, s, grid)) continue;
    if(deliverFreight(s,p,grid))continue;
    if (p.carry) {
      const delivery = nearestDepot(s,p,grid);
      if (!delivery) {p.state="Delivery blocked — open a route to a storehouse";continue;}
      const {path} = delivery;
      if (path.length) {
        p.path = path;
        p.state = "Carrying " + p.carry.n + " " + p.carry.key;
        continue;
      }
      deposit(s,delivery.b,p.carry.key,p.carry.n);
      s.stats.deliveries++;
      s.influence = Math.min(influenceCap(s), s.influence + .5);
      s.effects.push({
        x: p.x,
        y: p.y,
        text: "+" + p.carry.n + " " + p.carry.key,
        life: 2,
      });
      p.carry = null;
      p.task = null;
    }
    if (!p.task) {
      p.idle = (p.idle || 0) + dt;
      if (p.idle > 0.6) {
        assign(s, p, grid);
        p.idle = 0;
      }
      continue;
    }
    const b = s.buildings.find((b) => b.id === p.task.id);
    const rate = rules(s).work * workRate(s,p);
    p.work += dt * rate;
    if(pickupFreight(s,p,b))continue;
    if (workDepth(s,p,b,dt*rate)) {if(!p.task && p.toolUses>0)p.toolUses--;continue;}
    if (p.task.kind === "build") {
      if (!b || b.progress >= 1 || !supplied(s,b)) {
        p.task = null;
        continue;
      }
      b.progress = Math.min(1, b.progress + dt * workRate(s,p) / DEFS[b.type].time);
      if (b.progress >= 1) {
        if(b.type==="tower"){b.buffer??={};b.buffer.stone=(b.buffer.stone||0)+2;}
        s.effects.push({x:b.x,y:b.y,text:DEFS[b.type].name+" ready",ring:2,life:1.8,duration:1.8,sound:"delivery"});
        log(s, DEFS[b.type].name + " is ready.");
        p.task = null;
      }
    } else if (p.task.kind === "project") {
      if (!b?.project || !supplied(s,b)) { p.task = null; continue; }
      b.project.progress += dt * rate / (b.project.kind === "repair" ? 8 : 16);
      if (b.project.progress >= 1) {
        if (b.project.kind === "upgrade") b.upgraded = true;
        else b.hp = Math.min(DEFS[b.type].hp, b.hp + 60);
        log(s, `${DEFS[b.type].name}: ${b.project.kind} complete.`);
        delete b.project; p.task = null;
      }
    } else if (p.task.kind === "harvest" && p.work > 3) {
      const index = p.task.index,
        t = s.tiles[index];
      if (t === 3 || t === 4) {
        s.tiles[index] = 0;
        p.carry = { key: t === 3 ? "wood" : "stone", n: s.peaceful ? (t===3?8:7) : (t===3?6:5) };
        recordFlow(s,p.carry.key,p.carry.n,"made");
      }
      p.task = null;
    } else if (["farm", "well"].includes(p.task.kind)) {
      if (!b) {
        p.task = null;
        continue;
      }
      if(p.task.kind === "farm") b.cropProgress=Math.min(1,p.work/20);
      if (p.work > (p.task.kind === "farm" ? 20 : 14)) {
        if(p.task.kind === "farm") b.cropProgress=0;
        p.carry = {
          key: p.task.kind === "farm" ? "food" : "water",
          n:
            productionYield(s, b),
        };
        recordFlow(s,p.carry.key,p.carry.n,"made");
        p.task = null;
      }
    }
    if (!p.task && p.toolUses > 0) p.toolUses--;
  }
  for (const b of completed(s, "tower")) {
    b.cool = (b.cool || 0) - dt;
    const e = s.enemies.find(
      (e) => e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < 11,
    );
    if (e && b.cool <= 0 && (b.buffer?.ammo||b.buffer?.stone||0) >= 1) {
      const ammunition=b.buffer.ammo>0?"ammo":"stone";b.buffer[ammunition]--;recordFlow(s,ammunition,1,"used");
      e.hp -= (b.upgraded ? 27 : 18) + (s.blessing === "sentinel" ? 3 : 0);
      b.cool = 1.8;
      s.effects.push({ x: b.x + 1, y: b.y + 1, tx: e.x, ty: e.y, life: 0.22 });
    }
  }
  const enemyGrid = completed(s,"gate").length ? occupancy(s,true) : grid;
  for (const e of s.enemies) {
    if(e.hp<=0)continue;
    e.age += dt;
    e.cool -= dt;
    const guardian=s.guardians.find(g=>g.hp>0 && Math.hypot(g.x-e.x,g.y-e.y)<1.9);
    if(guardian) {if(e.cool<=0){guardian.hp-=Math.round((MONSTERS[e.kind]||MONSTERS.raveler).damage*rules(s).damage);e.cool=1.5;}continue;}
    const villager=s.people.find(p=>p.health>0 && Math.hypot(p.x-e.x,p.y-e.y)<1.35);
    if(villager) {if(e.cool<=0){const damage=Math.round((MONSTERS[e.kind]||MONSTERS.raveler).damage*rules(s).damage);villager.health-=damage;e.cool=1.5;s.effects.push({x:villager.x,y:villager.y,text:"−"+damage,life:.7});}continue;}
    const target = s.buildings
      .filter((b) => b.type !== "wall")
      .sort(
        (a, b) =>
          Math.hypot(e.x - a.x, e.y - a.y) - Math.hypot(e.x - b.x, e.y - b.y),
      )[0];
    if (!target) continue;
    let near = s.buildings.find((b) =>
      footprint(b.type, b.rot).some(
        ([dx, dy]) =>
          Math.hypot(e.x - (b.x + dx + 0.5), e.y - (b.y + dy + 0.5)) < 1.6,
      ),
    );
    if (near) {
      if (e.cool <= 0) {
        const damage = Math.round((MONSTERS[e.kind] || MONSTERS.raveler).damage * rules(s).damage);
        near.hp -= damage;
        e.cool = 1.5;
        s.effects.push({ x: e.x, y: e.y, text: "−" + damage, life: 0.7 });
      }
      continue;
    }
    if (!e.path.length || e.cool <= 0) {
      e.path = accessRoute(s, e, target, enemyGrid) || [];
      if (!e.path.length) {
        const walls = s.buildings
          .filter((b) => ["wall", "gate"].includes(b.type))
          .sort(
            (a, b) =>
              Math.hypot(e.x - a.x, e.y - a.y) -
              Math.hypot(e.x - b.x, e.y - b.y),
          );
        for (const wall of walls) {
          const p = accessRoute(s, e, wall, enemyGrid);
          if (p) {
            e.path = p;
            break;
          }
        }
      }
      e.cool = 3;
    }
    move(e, dt * (MONSTERS[e.kind] || MONSTERS.raveler).speed, s, enemyGrid, true);
  }
  for (const b of s.buildings.filter((b) => b.hp <= 0)) {
    loseWarehouse(s,b);
    log(s, DEFS[b.type].name + " was lost.");
    if (b.type === "hearth") {
      s.lost = true;
      log(
        s,
        "The hearth has fallen. Your chronicle remains; begin again from the island.",
      );
    }
  }
  const fallen=s.people.filter(p=>p.health<=0);
  for(const p of fallen)if(p.carry?.construction){const target=s.buildings.find(b=>b.id===p.carry.target);if(target){target.replacement??={};target.replacement[p.carry.key]=(target.replacement[p.carry.key]||0)+p.carry.n;}}
  for(const p of fallen){log(s,p.name+" was lost. Protect workers and care for the injured.");s.morale=Math.max(0,s.morale-8);}
  s.people=s.people.filter(p=>(p.health??100)>0);
  if(!s.people.length&&!s.lost){s.lost=true;log(s,"No keepers remain. Your chronicle is preserved.");}
  s.buildings = s.buildings.filter((b) => b.hp > 0);
  const hadRaid = s.enemies.length > 0;
  s.enemies = s.enemies.filter((e) => e.hp > 0 && e.age < 90);
  if (hadRaid && !s.enemies.length && !s.lost) {s.stats.repelled++;s.influence=Math.min(influenceCap(s),s.influence+10);log(s,"The village held! +10 influence. Repair and prepare before the next night.");}

  for (const b of s.buildings)
    if ((s.peaceful||s.difficulty==='settler')&&!s.enemies.length && b.hp < DEFS[b.type].hp)
      b.hp = Math.min(DEFS[b.type].hp, b.hp + dt * 0.08);
  s.effects = s.effects.filter((e) => (e.life -= dt) > 0);
  advanceCampaign(s);
}
export function serialize(s) {
  return JSON.stringify({ ...s, effects: [] });
}
export const POWERS = {
  guardian: {name: "Wake guardian", cost: 25, radius: 1, desc: "Summon a stone guardian for 90 seconds. It intercepts nearby raiders. Maximum two; 110 condition, 16 damage every 1.2 seconds."},
  mend: {
    name: "Mend",
    cost: 20,
    radius: 5,
    desc: "Restore up to 85 building condition and 35 villager health within five tiles.",
  },
  starfall: {
    name: "Starfall",
    cost: 30,
    radius: 4,
    desc: "Strike a cluster of enemies for 55 damage within four tiles.",
  },
  wildseed: {
    name: "Wildseed",
    cost: 25,
    radius: 3,
    desc: "Regrow up to six trees on unoccupied grass. Keep routes and yards open.",
  },
};
export function influenceCap(s) {
  return 100 + completed(s, "beacon").length * 50;
}
export function cast(s, power, x, y) {
  const p = POWERS[power];
  if (
    !p ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= W ||
    y >= H
  )
    return "Choose a location on the island.";
  if (s.lost || !completed(s, "hearth").length)
    return "Finish your Hearthhold first.";
  if ((s.influence ?? 35) < p.cost)
    return "Not enough influence. Villager deliveries replenish it.";
  let changed = 0;
  initDepth(s);
  if (power === "guardian") {const error=summonGuardian(s,x,y);if(error)return error;changed=1;}
  if (power === "mend")
    for (const b of s.buildings) {
      if (Math.hypot(b.x - x, b.y - y) <= p.radius && b.hp < DEFS[b.type].hp) {
        b.hp = Math.min(DEFS[b.type].hp, b.hp + 85);
        changed++;
      }
    }
  if(power==="mend")for(const person of s.people)if(person.health<100&&Math.hypot(person.x-x,person.y-y)<=p.radius){person.health=Math.min(100,person.health+35);changed++;}
  if (power === "starfall")
    for (const e of s.enemies) {
      if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) <= p.radius) {
        e.hp -= 55;
        changed++;
      }
    }
  if (power === "wildseed") {
    // Protect occupied cells and all currently planned worker routes.
    const reserved = new Set(s.roads);
    for (const person of s.people) {
      reserved.add(Math.floor(person.y) * W + Math.floor(person.x));
      for (const [px, py] of person.path || [])
        reserved.add(Math.floor(py) * W + Math.floor(px));
    }
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const ax = x + dx,
          ay = y + dy,
          i = ay * W + ax;
        if (
          changed < 6 &&
          ax > 2 &&
          ay > 2 &&
          ax < W - 3 &&
          ay < H - 3 &&
          s.tiles[i] === 0 &&
          !reserved.has(i) &&
          !s.buildings.some((b) => Math.hypot(b.x - ax, b.y - ay) < 7)
        ) {
          s.tiles[i] = 3;
          changed++;
        }
      }
  }
  if (!changed)
    return power === "wildseed"
      ? "Choose open grass away from buildings and paths."
      : "No valid targets in range. Influence was not spent.";
  s.influence = (s.influence ?? 35) - p.cost;
  s.effects.push({ x, y, text: POWERS[power].name, ring: p.radius, life: 1.2 });
  log(s, p.name + " answered the village’s need.");
  return "";
}
export function restore(raw) {
  const s = JSON.parse(raw);
  if (
    s?.version !== 1 ||
    typeof s.seed !== "string" ||
    !Number.isInteger(s.region) ||
    !REGIONS[s.region] ||
    s.tiles?.length !== W * H ||
    !s.tiles.every((t) => Number.isInteger(t) && t >= 0 && t <= 4) ||
    !Array.isArray(s.buildings) ||
    !Array.isArray(s.people) ||
    s.people.length > 48 ||
    s.buildings.length > W * H ||
    !Number.isFinite(s.time) ||
    !Number.isFinite(s.morale)
  )
    throw Error("Invalid save");
  s.difficulty ??= s.peaceful ? "peaceful" : "survival";
  if (!Object.hasOwn(DIFFICULTIES, s.difficulty)) throw Error("Invalid difficulty");
  s.peaceful = s.difficulty === "peaceful";
  if(s.raidForecast!==undefined){const f=s.raidForecast;if(!f||!Number.isInteger(f.day)||f.day<1||f.day>s.day||!Array.isArray(f.monsters)||f.monsters.length>48||f.monsters.some(m=>!m||!Object.hasOwn(MONSTERS,m.kind)||!Number.isFinite(m.hp)||m.hp<=0||m.hp>500))throw Error("Invalid raid forecast");}
  s.threat ??= 0;
  if (!Number.isInteger(s.threat) || s.threat < 0 || s.threat > 2) throw Error("Invalid regional threat");
  if (s.worldSeed !== undefined && (typeof s.worldSeed !== "string" ||
      !Number.isInteger(s.territory) || s.territory < 0 || s.territory >= 24 ||
      typeof s.territoryName !== "string")) throw Error("Invalid world location");
  for (const key of ["wood", "stone", "food", "water"])
    if (!Number.isFinite(s.stock?.[key]) || s.stock[key] < 0)
      throw Error("Invalid stock");
  for (const b of s.buildings)
    if (
      !DEFS[b.type] ||
      !Number.isInteger(b.rot) ||
      !Number.isFinite(b.progress) ||
      !Number.isFinite(b.hp) ||
      footprint(b.type, b.rot).some(
        ([x, y]) => b.x + x < 0 || b.y + y < 0 || b.x + x >= W || b.y + y >= H,
      )
    )
      throw Error("Invalid building");
  for (const b of s.buildings) {
    if(b.priority!==undefined&&typeof b.priority!=="boolean")throw Error("Invalid building priority");
    if(b.paused!==undefined&&typeof b.paused!=="boolean")throw Error("Invalid production pause");
    if (b.upgraded !== undefined && (typeof b.upgraded !== "boolean" || !UPGRADES[b.type])) throw Error("Invalid upgrade");
    if (b.project && (!["repair", "upgrade"].includes(b.project.kind) || !Number.isFinite(b.project.progress) || b.project.progress < 0 || b.project.progress >= 1 || (b.project.kind === "upgrade" && (!UPGRADES[b.type] || b.upgraded)))) throw Error("Invalid building project");
  }
  for (const p of s.people) {
    if (
      typeof p.name !== "string" ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y) ||
      p.x < 0 ||
      p.x >= W ||
      p.y < 0 ||
      p.y >= H
    )
      throw Error("Invalid citizen");
    p.path = [];
    p.task = null;
    p.work = 0;
  }
  for (const key of ["marks", "roads"])
    if (
      !Array.isArray(s[key]) ||
      !s[key].every((i) => Number.isInteger(i) && i >= 0 && i < W * H)
    )
      throw Error("Invalid map");
  if (!Array.isArray(s.events) || !Array.isArray(s.enemies))
    throw Error("Invalid chronicle");
  s.events = s.events
    .filter((e) => typeof e.text === "string" && Number.isFinite(e.day))
    .slice(0, 20);
  s.enemies = s.enemies
    .filter(
      (e) =>
        Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.hp),
    )
    .map((e) => ({ ...e, path: [] }));
  s.influence = Number.isFinite(s.influence)
    ? Math.max(0, Math.min(influenceCap(s), s.influence))
    : 35;
  s.focus = ["balanced", "build", "harvest", "food"].includes(s.focus)
    ? s.focus
    : "balanced";
  if (
    !Number.isInteger(s.day) ||
    s.day < 1 ||
    !Number.isInteger(s.nextId) ||
    s.nextId < 1
  )
    throw Error("Invalid timeline");
  validateDepth(s);validateEconomy(s);
  s.progressionVersion=2;
  s.chapters ??= [];
  if (!Array.isArray(s.chapters) || s.chapters.length > 8 || s.chapters.some((v, i) => v !== i)) throw Error("Invalid chapter progress");
  s.effects = [];
  return s;
}
