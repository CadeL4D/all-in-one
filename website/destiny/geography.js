import { W, H, REGIONS, hash, noise, createWorld } from "./world.js";

export const COLS = 6, ROWS = 4;
export const GEOGRAPHY_VERSION = 2;
const starterWood = new Set([[25,15],[27,14],[29,14],[31,13],[34,14],[37,15],[39,17],[24,17],[23,19],[26,16]].map(([x,y]) => y * W + x));
const starterStone = new Set([[26,32],[28,34],[31,35],[34,35],[37,33],[40,31],[39,29],[24,31],[25,33],[38,32]].map(([x,y]) => y * W + x));
export const WORLD_W = COLS * W, WORLD_H = ROWS * H;
const names = [
  "Fernwake", "Elderwood", "Greyreach", "Frostcrag", "Stormcrest", "High Cairn",
  "Mossvale", "Briar Glen", "Cloverbank", "Slatefall", "Ironridge", "Ravenrock",
  "Willowmere", "Oakwatch", "Honeymead", "Amberfield", "Dawnplain", "Ashen Peak",
  "Reedhaven", "Wildgrove", "Golden Vale", "Summerford", "Sunmeadow", "Pinehollow",
];
export const TERRITORIES = names.map((name, id) => {
  const col = id % COLS, row = Math.floor(id / COLS);
  const region = col < 2 ? 0 : row === 0 || (col >= 4 && row < 3) ? 2 : 1;
  const threat = col >= 4 ? 2 : col >= 2 ? 1 : 0;
  return { id, name, col, row, region, threat,
    neighbors: [col > 0 ? id - 1 : -1, col < COLS - 1 ? id + 1 : -1,
      row > 0 ? id - COLS : -1, row < ROWS - 1 ? id + COLS : -1].filter(n => n >= 0) };
});

// Smooth noise bends shores at several scales instead of outlining an oval.
function smoothNoise(x, y, seed, scale) {
  const gx = Math.floor(x / scale), gy = Math.floor(y / scale);
  const fx = x / scale - gx, fy = y / scale - gy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = noise(gx, gy, seed), b = noise(gx + 1, gy, seed);
  const c = noise(gx, gy + 1, seed), d = noise(gx + 1, gy + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

// The continent follows overlapping, skewed landforms, with inlets cut into them.
// Small irregular refuge islands keep all 24 regions playable near the outer sea.
export function worldTile(seed, x, y) {
  const sd = hash(seed), phase = (sd % 1000) / 159;
  const u = x / WORLD_W, v = y / WORLD_H;
  const drift = Math.sin(phase) * .025;
  const ellipse = (cx, cy, rx, ry, lean = 0) => {
    const yy = v - cy;
    return 1 - ((u - cx - yy * lean) / rx) ** 2 - (yy / ry) ** 2;
  };
  let land = Math.max(
    ellipse(.36 + drift, .47, .30, .36, -.24),
    ellipse(.25, .22 + drift, .23, .16, .45),
    ellipse(.57, .27, .24, .17, -.5),
    ellipse(.77, .26 - drift, .19, .13, .48),
    ellipse(.14, .72, .12, .21, -.40),
    ellipse(.44, .78 + drift, .23, .16, .5),
    ellipse(.67, .81, .18, .095, -.6),
    ellipse(.90, .86, .08, .10, .35)
  );
  // Fjord in the north, a broad eastern gulf and a hooked western bay.
  land = Math.min(land,
    -ellipse(.34 + drift, .015, .058, .29, -.22),
    -ellipse(.96, .58 + drift, .29, .19, .45),
    -ellipse(.005, .49 - drift, .15, .13, -.6));
  const rough = (smoothNoise(x, y, sd, 35) - .5) * .40 +
    (smoothNoise(x, y, sd + 13, 12) - .5) * .19 +
    (smoothNoise(x, y, sd + 71, 5) - .5) * .055;
  const lx = x % W, ly = y % H;
  const id = Math.floor(y / H) * COLS + Math.floor(x / W);
  const rx = 20 + noise(id, 0, sd) * 7, ry = 17 + noise(id, 1, sd) * 5;
  const refuge = (1 - ((lx - 32) / rx) ** 2 - ((ly - 24) / ry) ** 2) * .4;
  land = Math.max(land + rough, refuge + rough * .55);
  land = Math.min(land, (Math.min(x, y, WORLD_W - 1 - x, WORLD_H - 1 - y) - 2) / 8);
  const riverX = WORLD_W / 2 + Math.sin(y * .026 + phase) * 12 + Math.sin(y * .075 - phase) * 6;
  const riverY = H * 2 + Math.sin(x * .024 + phase) * 8 + Math.sin(x * .057 - phase) * 3;
  const river = Math.abs(x - riverX);
  const tributary = x < riverX ? Math.abs(y - riverY) : 999;
  const ford = Math.abs(ly - 24) <= 2;
  const crossFord = Math.abs(lx - 32) <= 2;
  let tile = 0;
  if (land < 0 || (river < 2.1 && !ford) || (tributary < 1.15 && !crossFord)) tile = 1;
  else if (land < .07 || river < 3.1 || tributary < 2.0) tile = 2;
  else {
    const forest = Math.max(0, 1 - x / (WORLD_W * .68));
    const ridge = Math.max(0, (x / WORLD_W - .38) * 1.8) * Math.max(.15, 1 - y / WORLD_H);
    const grove = smoothNoise(x, y, sd + 101, 22);
    const n = noise(x, y, sd);
    if (n < .045 + forest * .20 + grove * .10) tile = 3;
    else if (n > 1 - (.022 + ridge * .26)) tile = 4;
  }
  const clearing = ((lx - 32) / 10) ** 2 + ((ly - 24) / 11) ** 2;
  if (clearing < 1 + .10 * smoothNoise(x, y, sd + 301, 9)) tile = 0;
  // Only open a second clearing on land; never turn a bay into a rectangle.
  if (land > .10 && lx > 43 && lx < 52 && ly > 30 && ly < 39 && tile !== 1) tile = 0;
  if (starterWood.has(ly * W + lx)) tile = 3;
  if (starterStone.has(ly * W + lx)) tile = 4;
  return tile;
}

export function buildAtlas(seed) {
  const tiles = Array.from({ length: WORLD_W * WORLD_H }, (_, i) =>
    worldTile(seed, i % WORLD_W, Math.floor(i / WORLD_W)));
  return { seed, tiles };
}

export function regionTiles(atlas, id) {
  const t = TERRITORIES[id];
  if (!t) throw Error("Unknown territory");
  return Array.from({ length: W * H }, (_, i) =>
    atlas.tiles[(t.row * H + Math.floor(i / W)) * WORLD_W + t.col * W + i % W]);
}

export function createTerritory(atlas, id, difficulty = "survival") {
  const t = TERRITORIES[id];
  if (!t) throw Error("Unknown territory");
  const s = createWorld(atlas.seed + ":world:" + id + ":" + difficulty + ":g" + GEOGRAPHY_VERSION, t.region, difficulty);
  Object.assign(s, { worldSeed: atlas.seed, territory: id, territoryName: t.name,
    geographyVersion: GEOGRAPHY_VERSION, threat: t.threat, tiles: regionTiles(atlas, id) });
  return s;
}

export function paintAtlas(canvas, atlas) {
  canvas.width = WORLD_W * 2; canvas.height = WORLD_H * 2;
  const c = canvas.getContext("2d");

  atlas.tiles.forEach((tile, i) => {
    const x = i % WORLD_W, y = Math.floor(i / WORLD_W);
    const east = x / WORLD_W, north = 1 - y / WORLD_H;
    const grass = `rgb(${Math.round(80 + east * 43)},${Math.round(119 + east * 24 - north * east * 15)},${Math.round(72 + east * north * 25)})`;
    c.fillStyle = tile === 0 ? grass : ["", "#315e69", "#b6ac7a", "#30533a", "#a0a48b"][tile];
    c.fillRect(x * 2, y * 2, 2, 2);
    if (tile === 3) { c.fillStyle = "#436b42"; c.fillRect(x * 2, y * 2, 1, 1); }
  });
  // A thin survey grid divides one continuous landscape into playable regions.
  c.strokeStyle = "#edddb866"; c.lineWidth = 1; c.setLineDash([4, 4]);
  for (let x = 1; x < COLS; x++) { c.beginPath(); c.moveTo(x * W * 2, 0); c.lineTo(x * W * 2, canvas.height); c.stroke(); }
  for (let y = 1; y < ROWS; y++) { c.beginPath(); c.moveTo(0, y * H * 2); c.lineTo(canvas.width, y * H * 2); c.stroke(); }
}
