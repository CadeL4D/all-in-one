// Pure simulation: no DOM, rendering, or wall-clock dependencies.
export const W = 64,
  H = 48,
  DAY = 100;
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
    food: 1.5,
  },
  {
    name: "Greyreach",
    tag: "THE HIGHLAND",
    text: "Stone underfoot, pines on the ridge. Rich quarries; slower crops.",
    wood: 0.1,
    rock: 0.15,
    food: 0.8,
  },
];
export const DEFS = {
  quarry: {
    name: "Stonewright",
    glyph: "◆",
    mask: ["111", "110", "100"],
    wood: 16,
    stone: 8,
    time: 8,
    hp: 110,
    desc: "Marks stone deposits within 12 tiles. Workers carry stone home for building and defense.",
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
    desc: "The village heart. All gathered goods return here. Shelters six.",
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
    desc: "A worker draws 8 water per trip.",
  },
  farm: {
    name: "Field patch",
    glyph: "♧",
    mask: ["1111", "1111", "1111"],
    wood: 10,
    stone: 0,
    time: 5,
    hp: 60,
    desc: "A worker grows and carries 8 food. Lowland fields yield more.",
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
    desc: "A shared kitchen cuts daily food use by 30%. Maximum one benefit.",
  },
  garden: {
    name: "Pocket garden",
    glyph: "✿",
    mask: ["11", "11"],
    wood: 8,
    stone: 2,
    time: 4,
    hp: 50,
    desc: "A small shared space. Adds 6 daily morale, up to 18.",
  },
  tower: {
    name: "Farwatch",
    glyph: "♜",
    mask: ["11", "11"],
    wood: 18,
    stone: 14,
    time: 10,
    hp: 150,
    desc: "Defends within 11 tiles. Each shot consumes 1 stone.",
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
    desc: "Each shed raises the village capacity for each resource by 100.",
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
export function createWorld(seed, region, peaceful = false) {
  return {
    version: 1,
    seed,
    region,
    peaceful,
    tiles: terrain(seed, region),
    roads: [],
    buildings: [],
    people: [],
    enemies: [],
    marks: [],
    stock: { wood: 95, stone: 70, food: 55, water: 55 },
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
  return 180 + completed(s, "store").length * 100;
}
export function beds(s) {
  return (
    (completed(s, "hearth").length ? 6 : 0) + completed(s, "house").length * 4
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
export function occupancy(s) {
  const grid = s.tiles.map((t) => ([1, 3, 4].includes(t) ? 1 : 0));
  for (const b of s.buildings)
    for (const [dx, dy] of footprint(b.type, b.rot))
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
  if (s.lost) return "This settlement has fallen. Begin again from the island.";
  if (type === "hearth" && s.buildings.some((b) => b.type === "hearth"))
    return "Your village already has a hearth.";
  if (type !== "hearth" && !s.buildings.some((b) => b.type === "hearth"))
    return "Place the Hearthhold first.";
  const cells = footprint(type, rot);
  for (const [dx, dy] of cells) {
    const ax = x + dx,
      ay = y + dy;
    if (ax < 2 || ay < 2 || ax >= W - 2 || ay >= H - 2)
      return "Too close to the water’s edge.";
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
    for (const [dx, dy] of cells) grid[(y + dy) * W + x + dx] = 1;
    if (!edgeCells(s, candidate, grid).length)
      return "Leave a walkable edge for builders.";
    if (
      s.people.length &&
      !s.people.some((p) => accessRoute(s, p, candidate, grid) !== null)
    )
      return "No worker can reach this site.";
  }
  return "";
}
export function place(s, type, x, y, rot = 0) {
  const reason = canPlace(s, type, x, y, rot);
  if (reason) return reason;
  const d = DEFS[type];
  s.stock.wood -= d.wood;
  s.stock.stone -= d.stone;
  if (type === "path") {
    s.roads.push(y * W + x);
    return "";
  }
  const b = { id: s.nextId++, type, x, y, rot, progress: 0, hp: d.hp, cool: 0 };
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
export function remove(s, b) {
  if (b.type === "hearth") return "The Hearthhold anchors this village.";
  s.buildings = s.buildings.filter((v) => v.id !== b.id);
  const d = DEFS[b.type];
  s.stock.wood = Math.min(capacity(s), s.stock.wood + Math.floor(d.wood / 2));
  s.stock.stone = Math.min(
    capacity(s),
    s.stock.stone + Math.floor(d.stone / 2),
  );
  log(s, d.name + " dismantled; half its materials recovered.");
  return "";
}
function give(s, key, n) {
  s.stock[key] = Math.min(capacity(s), s.stock[key] + n);
}
function move(p, dt, s, grid) {
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
      (s.morale < 30 ? 0.6 : 1) *
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
  const jobs = [];
  for (const b of s.buildings) {
    if (b.progress < 1)
      jobs.push({ key: "build" + b.id, kind: "build", b, priority: 0 });
    else if (b.type === "farm" && s.stock.food < capacity(s) - 8)
      jobs.push({
        key: "farm" + b.id,
        kind: "farm",
        b,
        priority: s.stock.food < 20 ? 0 : 2,
      });
    else if (b.type === "well" && s.stock.water < capacity(s) - 8)
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
    if (
      (s.focus === "build" && job.kind === "build") ||
      (s.focus === "harvest" && job.kind === "harvest") ||
      (s.focus === "food" && ["farm", "well"].includes(job.kind))
    )
      job.priority -= 4;
  }
  jobs.sort(
    (a, b) =>
      a.priority - b.priority ||
      Math.hypot(p.x - a.b.x, p.y - a.b.y) -
        Math.hypot(p.x - b.b.x, p.y - b.b.y),
  );
  for (const job of jobs) {
    if (claimed.has(job.key)) continue;
    const path = accessRoute(s, p, job.b, grid);
    if (path === null) continue;
    p.task = { key: job.key, kind: job.kind, id: job.b.id, index: job.index };
    p.path = path;
    p.work = 0;
    p.state =
      job.kind === "build"
        ? "Building " + DEFS[job.b.type].name
        : job.kind === "harvest"
          ? "Gathering " + (s.tiles[job.index] === 3 ? "timber" : "stone")
          : job.kind === "farm"
            ? "Tending crops"
            : "Drawing water";
    return;
  }
  p.state = "Resting — no reachable work";
}
function daily(s) {
  const foodNeed = Math.ceil(
      s.people.length * (completed(s, "kitchen").length ? 0.7 : 1),
    ),
    waterNeed = s.people.length;
  const fed = s.stock.food >= foodNeed && s.stock.water >= waterNeed;
  s.stock.food = Math.max(0, s.stock.food - foodNeed);
  s.stock.water = Math.max(0, s.stock.water - waterNeed);
  s.morale = Math.max(
    0,
    Math.min(
      100,
      s.morale +
        (fed ? 4 : -18) +
        Math.min(18, completed(s, "garden").length * 6) -
        (beds(s) < s.people.length ? 8 : 0),
    ),
  );
  if (!fed)
    log(s, "Supplies ran short. Food and water restore morale and work speed.");
  if (
    fed &&
    beds(s) > s.people.length &&
    s.people.length < 24 &&
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
        state: "Arriving",
      });
      log(s, "A traveler joined the village. A new story begins.");
    }
  }
  if (!s.peaceful && s.day >= 3 && s.day % 2 === 1)
    log(s, "Tracks at the border. A small raiding party will arrive at dusk.");
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
  if (s.peaceful) return;
  const grid = occupancy(s),
    r = rng(hash(s.seed + s.day));
  for (let i = 0; i < Math.min(7, 2 + Math.floor(s.day / 3)); i++) {
    // Find an actually reachable entry; a forest must not silently cancel a raid.
    let entry = null;
    const target = s.buildings.find((b) => b.type === "hearth");
    for (let attempt = 0; attempt < 60; attempt++) {
      const x = W - 4 - (attempt % 6),
        y = 4 + Math.floor(r() * (H - 8));
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
    if (entry)
      s.enemies.push({
        id: s.nextId++,
        x: entry.x + 0.5,
        y: entry.y + 0.5,
        kind: s.day >= 5 && i % 3 === 0 ? "brute" : "raveler",
        hp: s.day >= 5 && i % 3 === 0 ? 80 : 36,
        path: [],
        cool: 0,
        age: 0,
      });
  }
  s.raided = s.day;
  log(s, "Ravelers at the eastern edge. Protect the hearth!");
}
export function tick(s, dt) {
  if (!s.people.length || s.lost) return;
  s.influence ??= 35;
  s.focus ??= "balanced";
  s.influence = Math.min(
    influenceCap(s),
    s.influence + completed(s, "beacon").length * dt * 0.2,
  );
  s.time += dt;
  const day = Math.floor(s.time / DAY) + 1;
  if (day > s.day) {
    s.day = day;
    daily(s);
  }
  if (
    !s.peaceful &&
    s.day >= 3 &&
    s.day % 2 === 1 &&
    s.time % DAY > DAY * 0.74 &&
    s.raided !== s.day
  )
    raid(s);
  const grid = occupancy(s);
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
    if (move(p, dt, s, grid)) continue;
    if (p.carry) {
      const hearth = s.buildings.find((b) => b.type === "hearth");
      if (!hearth) continue;
      const path = accessRoute(s, p, hearth, grid);
      if (path === null) {
        p.state = "Delivery blocked — open a path to the hearth";
        continue;
      }
      if (path.length) {
        p.path = path;
        p.state = "Carrying " + p.carry.n + " " + p.carry.key;
        continue;
      }
      give(s, p.carry.key, p.carry.n);
      s.influence = Math.min(influenceCap(s), s.influence + 2);
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
    p.work += dt;
    if (p.task.kind === "build") {
      if (!b || b.progress >= 1) {
        p.task = null;
        continue;
      }
      b.progress = Math.min(1, b.progress + dt / DEFS[b.type].time);
      if (b.progress >= 1) {
        log(s, DEFS[b.type].name + " is ready.");
        p.task = null;
      }
    } else if (p.task.kind === "harvest" && p.work > 3) {
      const index = p.task.index,
        t = s.tiles[index];
      if (t === 3 || t === 4) {
        s.tiles[index] = 0;
        p.carry = { key: t === 3 ? "wood" : "stone", n: t === 3 ? 8 : 7 };
      }
      p.task = null;
    } else if (["farm", "well"].includes(p.task.kind)) {
      if (!b) {
        p.task = null;
        continue;
      }
      if (p.work > 4) {
        p.carry = {
          key: p.task.kind === "farm" ? "food" : "water",
          n:
            p.task.kind === "farm" ? Math.round(8 * REGIONS[s.region].food) : 8,
        };
        p.task = null;
      }
    }
  }
  for (const b of completed(s, "tower")) {
    b.cool -= dt;
    const e = s.enemies.find(
      (e) => e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < 11,
    );
    if (e && b.cool <= 0 && s.stock.stone >= 1) {
      s.stock.stone--;
      e.hp -= 18;
      b.cool = 1.8;
      s.effects.push({ x: b.x + 1, y: b.y + 1, tx: e.x, ty: e.y, life: 0.22 });
    }
  }
  for (const e of s.enemies) {
    e.age += dt;
    e.cool -= dt;
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
        const damage = e.kind === "brute" ? 15 : 8;
        near.hp -= damage;
        e.cool = 1.5;
        s.effects.push({ x: e.x, y: e.y, text: "−" + damage, life: 0.7 });
      }
      continue;
    }
    if (!e.path.length || e.cool <= 0) {
      e.path = accessRoute(s, e, target, grid) || [];
      if (!e.path.length) {
        const walls = s.buildings
          .filter((b) => b.type === "wall")
          .sort(
            (a, b) =>
              Math.hypot(e.x - a.x, e.y - a.y) -
              Math.hypot(e.x - b.x, e.y - b.y),
          );
        for (const wall of walls) {
          const p = accessRoute(s, e, wall, grid);
          if (p) {
            e.path = p;
            break;
          }
        }
      }
      e.cool = 3;
    }
    move(e, dt * (e.kind === "brute" ? 0.34 : 0.48), s, grid);
  }
  for (const b of s.buildings.filter((b) => b.hp <= 0)) {
    log(s, DEFS[b.type].name + " was lost.");
    if (b.type === "hearth") {
      s.lost = true;
      log(
        s,
        "The hearth has fallen. Your chronicle remains; begin again from the island.",
      );
    }
  }
  s.buildings = s.buildings.filter((b) => b.hp > 0);
  s.enemies = s.enemies.filter((e) => e.hp > 0 && e.age < 55);
  for (const b of s.buildings)
    if (!s.enemies.length && b.hp < DEFS[b.type].hp)
      b.hp = Math.min(DEFS[b.type].hp, b.hp + dt * 0.8);
  s.effects = s.effects.filter((e) => (e.life -= dt) > 0);
}
export function serialize(s) {
  return JSON.stringify({ ...s, effects: [] });
}
export const POWERS = {
  mend: {
    name: "Mend",
    cost: 20,
    radius: 5,
    desc: "Restore up to 85 condition to every building within five tiles.",
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
  if (power === "mend")
    for (const b of s.buildings) {
      if (Math.hypot(b.x - x, b.y - y) <= p.radius && b.hp < DEFS[b.type].hp) {
        b.hp = Math.min(DEFS[b.type].hp, b.hp + 85);
        changed++;
      }
    }
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
    s.people.length > 24 ||
    s.buildings.length > W * H ||
    !Number.isFinite(s.time) ||
    !Number.isFinite(s.morale)
  )
    throw Error("Invalid save");
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
  s.effects = [];
  return s;
}
