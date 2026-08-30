'use strict';
/* ============================================================
   Dawnhold — art.js
   All pixel art is painted procedurally into offscreen canvases.
   16px tiles. Art.init() bakes static sprites; villager sprites
   are generated per-look on demand (unique little people).
   ============================================================ */

function mkc(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return { c, x };
}
function R(x, px, py, w, h, col) { x.fillStyle = col; x.fillRect(px, py, w, h); }
// darken/lighten hex
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

const PAL = {
  grass: ['#5a8a4a', '#54834544', '#65935566'], dirt: ['#8a6d4e', '#7a5f42'], road: ['#b09a6a', '#9a855a', '#c4ae7c'],
  water: ['#3b6ea8', '#33619a', '#a8cbe8'], waterDeep: '#2c5288',
  trunk: '#6b4a2b', trunkD: '#553a20', pine: '#2e5d3a', pineD: '#254c30', pineL: '#3a6e46',
  oak: '#418a3c', oakL: '#529e49', oakD: '#337030',
  stump: '#7a5a38', bush: '#3a7a3c', bushD: '#2e6230', berry: '#d84a6a', berryL: '#f07090',
  rock: '#8d8d95', rockD: '#6e6e78', rockL: '#a5a5ae',
  wood: '#a07840', woodD: '#7c5a2e', woodL: '#c09455', plank: '#8a5f37', plankD: '#6e4a28',
  thatch: '#c9a050', thatchD: '#a37f38', stoneB: '#8b8b95', stoneD: '#6c6c76', stoneL: '#a3a3ad',
  door: '#5f4022', win: '#ffd977', tentC: '#cbb27e', tentD: '#a8935f',
  cloth: '#b0524a', metal: '#c9ced9', metalD: '#8f95a3',
  soil: '#6e5136', soilD: '#5c4229', wheat: '#d9b24a', wheatD: '#b8912f', sprout: '#7ec850',
  shade: '#2a2440', shadeO: '#191430', shadeEye: '#c46bff',
  crystal: '#6fe0e8',
};

const Art = {
  s: {},            // static sprite canvases by name
  _vcache: new Map(), // villager look sprites
  MM: { water: '#33619a', grass: '#4e7a40', tree: '#2e5d3a', road: '#b09a6a', rock: '#8d8d95', dirt: '#8a6d4e', sand: '#d8c48a', bld: '#e8a94b', vil: '#ffffff', mon: '#e05555' },

  init() {
    this.terrain();
    this.objects();
    this.buildings();
    this.monsters();
    this.fx();
    this.icons();
  },

  /* ================= TERRAIN ================= */
  terrain() {
    const S = this.s;
    // grass — 4 variants with speckle
    for (let v = 0; v < 4; v++) {
      const { c, x } = mkc(16, 16);
      const rng = U.mulberry32(v * 77 + 3);
      R(x, 0, 0, 16, 16, PAL.grass[0]);
      for (let i = 0; i < 14; i++) {
        const px = (rng() * 16) | 0, py = (rng() * 16) | 0;
        R(x, px, py, 1, 1, rng() < 0.5 ? '#4e7a40' : '#659355');
      }
      if (v === 3) R(x, 7, 9, 1, 2, '#4e7a40'), R(x, 8, 10, 1, 1, '#4e7a40');
      S['g' + v] = c;
    }
    // dirt
    {
      const { c, x } = mkc(16, 16);
      const rng = U.mulberry32(99);
      R(x, 0, 0, 16, 16, PAL.dirt[0]);
      for (let i = 0; i < 12; i++) R(x, (rng() * 16) | 0, (rng() * 16) | 0, 1, 1, PAL.dirt[1]);
      S.dirt = c;
    }
    // road — 2 variants
    for (let v = 0; v < 2; v++) {
      const { c, x } = mkc(16, 16);
      const rng = U.mulberry32(v * 31 + 7);
      R(x, 0, 0, 16, 16, PAL.road[0]);
      for (let i = 0; i < 8; i++) R(x, (rng() * 15) | 0, (rng() * 15) | 0, 2, 1, rng() < .5 ? PAL.road[1] : PAL.road[2]);
      S['road' + v] = c;
    }
    // water base (still frame; sparkle overlay is live)
    {
      const { c, x } = mkc(16, 16);
      R(x, 0, 0, 16, 16, PAL.water[0]);
      for (let i = 0; i < 10; i++) R(x, (U.hash2(i, 4) * 16) | 0, (U.hash2(i, 9) * 16) | 0, 2, 1, PAL.water[1]);
      S.water = c;
    }
    // sand — shore tile
    {
      const { c, x } = mkc(16, 16);
      const rng = U.mulberry32(51);
      R(x, 0, 0, 16, 16, '#d8c48a');
      for (let i = 0; i < 16; i++) {
        const px = (rng() * 16) | 0, py = (rng() * 16) | 0;
        R(x, px, py, 1, 1, rng() < .5 ? '#c4ae74' : '#e8d8a4');
      }
      R(x, 3, 11, 1, 1, '#b4a066'); R(x, 11, 5, 1, 1, '#b4a066');
      S.sand = c;
    }
  },

  /* ================= OBJECTS ================= */
  // Trees are 16x24 (they overhang the tile above); everything anchors to
  // its tile bottom in the renderer. Strong outlines keep them readable.
  objects() {
    const S = this.s;
    const shadowBand = (x) => { x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(4, 22, 8, 2); };

    // --- oaks: round, outlined canopy, flared trunk ---
    for (let v = 0; v < 2; v++) {
      const { c, x } = mkc(16, 24);
      shadowBand(x);
      // trunk with flare + shading
      R(x, 6, 16, 4, 7, PAL.trunk); R(x, 6, 16, 1, 7, PAL.trunkD);
      R(x, 5, 21, 6, 2, PAL.trunk); R(x, 5, 22, 6, 1, PAL.trunkD);
      // canopy: outline, dark base, mid, light clumps
      const canopy = [
        [4, 3, 8], [3, 4, 10], [2, 5, 12], [2, 6, 12], [1, 7, 14], [1, 8, 14], [2, 9, 12], [2, 10, 12], [3, 11, 10], [4, 12, 8],
      ];
      // outline pass (1px bigger)
      x.fillStyle = '#1c3b1c';
      for (const [cx, cy, w] of canopy) x.fillRect(cx - 1, cy - 1 + 3, w + 2, 3);
      // body
      x.fillStyle = PAL.oakD;
      for (const [cx, cy, w] of canopy) x.fillRect(cx, cy + 3, w, 1);
      // mid tone upper 2/3
      x.fillStyle = PAL.oak;
      for (const [cx, cy, w] of canopy) if (cy <= 8) x.fillRect(cx, cy + 3, w, 1);
      // highlights
      x.fillStyle = PAL.oakL;
      R(x, 5 + v, 5, 4, 2); R(x, 9 - v, 7, 3, 2); R(x, 4, 9 - v, 3, 1);
      R(x, 10, 5 + v, 2, 1);
      if (v) { R(x, 3, 8, 2, 2, PAL.oakD); R(x, 11, 9, 2, 2, PAL.oakD); }
      S['tree' + v] = c;
    }
    // --- pines: jagged tiers, dark outline ---
    for (let v = 0; v < 2; v++) {
      const { c, x } = mkc(16, 24);
      shadowBand(x);
      R(x, 7, 18, 2, 5, PAL.trunk); R(x, 7, 18, 1, 5, PAL.trunkD);
      const tiers = [[7, 1, 2], [6, 4, 4], [5, 7, 6], [4, 10, 8], [3, 13, 10]];
      // outline
      x.fillStyle = '#152e1d';
      for (const [tx0, ty0, w] of tiers) {
        x.fillRect(tx0 - 1, ty0 + 2, w + 2, 3);
        x.fillRect(tx0 - 1, ty0 + 4, 2, 2); x.fillRect(tx0 + w - 1, ty0 + 4, 2, 2); // droop tips
      }
      tiers.forEach(([tx0, ty0, w], i) => {
        x.fillStyle = i % 2 ? PAL.pineD : PAL.pine;
        x.fillRect(tx0, ty0 + 2, w, 2);
        x.fillRect(tx0 + 1, ty0 + 4, w - 2, 1);
      });
      x.fillStyle = PAL.pineL;
      R(x, 7, 3, 2, 2); R(x, 6, 8, 2, 2); R(x, 5 + v, 12, 3, 1); R(x, 9 - v, 5, 2, 1);
      R(x, 7, 0, 2, 3, PAL.pineL);
      if (v) { R(x, 5, 9, 2, 2, PAL.pineD); R(x, 10, 12, 2, 2, PAL.pineD); }
      S['pine' + v] = c;
    }
    // --- birch: white trunk, airy light canopy ---
    for (let v = 0; v < 2; v++) {
      const { c, x } = mkc(16, 24);
      shadowBand(x);
      R(x, 7, 14, 2, 9, '#e8e4d4'); R(x, 7, 14, 1, 9, '#c9c4b0');
      R(x, 7, 16, 1, 1, '#5a5648'); R(x, 8, 19, 1, 1, '#5a5648'); R(x, 7, 22, 1, 1, '#5a5648');
      const lumps = [[5, 4], [9, 4], [3, 6], [11, 6], [6, 8], [10, 8]];
      x.fillStyle = '#1c3b1c';
      for (const [lx, ly] of lumps) x.fillRect(lx - 1, ly + 2, 5, 5);
      x.fillStyle = '#7ab648';
      for (const [lx, ly] of lumps) x.fillRect(lx, ly + 2, 3, 3);
      x.fillStyle = '#a8d86a';
      for (const [lx, ly] of lumps) x.fillRect(lx, ly + 2, 2, 2);
      if (v) { R(x, 4, 5, 2, 2, '#5a9434'); }
      S['birch' + v] = c;
    }
    // --- dead tree: bare twisted branches ---
    {
      const { c, x } = mkc(16, 24);
      shadowBand(x);
      x.fillStyle = '#4a4038';
      R(x, 7, 12, 2, 10, '#4a4038');
      R(x, 5, 9, 2, 1, '#4a4038'); R(x, 4, 7, 1, 2, '#4a4038'); R(x, 3, 5, 1, 2, '#4a4038');
      R(x, 9, 8, 2, 1, '#4a4038'); R(x, 10, 5, 1, 3, '#4a4038'); R(x, 11, 3, 1, 2, '#4a4038');
      R(x, 6, 6, 1, 3, '#4a4038'); R(x, 7, 2, 1, 4, '#4a4038');
      x.fillStyle = '#6e6258';
      R(x, 7, 13, 1, 8, '#6e6258'); R(x, 4, 7, 1, 1, '#6e6258'); R(x, 10, 5, 1, 2, '#6e6258');
      S.deadtree = c;
    }
    // --- stump & sapling (refreshed) ---
    { const { c, x } = mkc(16, 24); R(x, 4, 19, 8, 3, PAL.stump); R(x, 4, 19, 8, 1, '#9a7448'); R(x, 5, 20, 6, 1, '#684a2c'); R(x, 4, 22, 8, 1, 'rgba(0,0,0,.2)'); S.stump = c; }
    { const { c, x } = mkc(16, 24); R(x, 7, 20, 2, 3, PAL.trunk); R(x, 5, 17, 6, 3, PAL.sprout); R(x, 6, 15, 4, 2, '#8fd45e'); R(x, 7, 14, 2, 1, '#8fd45e'); S.sapling = c; }
    // --- berry bush full / empty (outlined) ---
    {
      const mk = full => {
        const { c, x } = mkc(16, 24);
        x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(4, 22, 8, 2);
        const rows = [[4, 6], [3, 10], [3, 10], [4, 6]];
        x.fillStyle = '#1c3b1c';
        rows.forEach((r, i) => x.fillRect(r[0] - 1, 15 + i, r[1] - r[0] + 2, 1));
        rows.forEach((r, i) => { x.fillStyle = i === 0 ? PAL.bushD : PAL.bush; x.fillRect(r[0], 15 + i, r[1] - r[0], 1); });
        x.fillStyle = '#4f9a52'; R(x, 6, 16, 1, 1); R(x, 10, 17, 1, 1);
        if (full) { [[4, 16], [8, 15], [11, 17], [5, 18], [9, 18], [7, 16]].forEach(p => R(x, p[0], p[1], 1, 1, ((p[0] + p[1]) % 3) ? PAL.berry : PAL.berryL)); }
        return c;
      };
      S.bushF = mk(true); S.bushE = mk(false);
    }
    // --- herb bush: teal leaves, white blossoms (clearly not a berry) ---
    {
      const mk = full => {
        const { c, x } = mkc(16, 24);
        x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(5, 22, 6, 2);
        // dark under-leaves
        x.fillStyle = '#1d4a40';
        R(x, 4, 15, 8, 7); R(x, 5, 13, 6, 2);
        // spiky leaves fanning up
        x.fillStyle = '#3fa88c';
        R(x, 7, 12, 2, 10);          // center blade
        R(x, 5, 15, 2, 7); R(x, 9, 15, 2, 7);   // mid blades
        R(x, 3, 18, 2, 4); R(x, 11, 18, 2, 4);  // outer blades
        x.fillStyle = '#6fd4b4';
        R(x, 7, 12, 1, 8); R(x, 5, 15, 1, 4); R(x, 9, 15, 1, 4);
        if (full) { x.fillStyle = '#f0f0e0'; R(x, 7, 10, 2, 2); R(x, 5, 12, 1, 2); R(x, 10, 12, 1, 2); x.fillStyle = '#e8a94b'; R(x, 7, 10, 1, 1); }
        return c;
      };
      S.herbF = mk(true); S.herbE = mk(false);
    }
    // --- rocks: small, boulders (2), all outlined w/ moss & cracks ---
    {
      const { c, x } = mkc(16, 24);
      x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(5, 22, 7, 2);
      R(x, 5, 18, 6, 4, PAL.rock); R(x, 5, 18, 6, 1, PAL.rockL); R(x, 5, 21, 6, 1, PAL.rockD); R(x, 7, 19, 2, 1, PAL.rockD);
      x.fillStyle = '#4a4a54'; x.fillRect(4, 17, 8, 1); x.fillRect(4, 17, 1, 5); x.fillRect(11, 17, 1, 5);
      S.rockS = c;
    }
    for (let v = 0; v < 2; v++) {
      const { c, x } = mkc(16, 24);
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(3, 22, 11, 2);
      const w = v ? 12 : 10, h = v ? 9 : 7, ox = v ? 2 : 3, oy = 23 - h;
      // outline
      x.fillStyle = '#4a4a54';
      x.fillRect(ox - 1, oy, w + 2, h + 1);
      // body
      R(x, ox, oy, w, h, PAL.rock);
      R(x, ox + 1, oy, w - 2, 1, PAL.rockL);
      R(x, ox + 2, oy + 1, 3, 1, PAL.rockL);
      R(x, ox, oy + h - 1, w, 1, PAL.rockD);
      R(x, ox + w - 3, oy + 2, 1, h - 3, PAL.rockD);
      R(x, ox + 2, oy + 3, 3, 1, PAL.rockD); R(x, ox + 5, oy + h - 3, 2, 1, PAL.rockD);
      // moss patch
      R(x, ox + 1, oy + 1, 2, 1, '#5a7a4a'); R(x, ox + 1, oy + 2, 1, 1, '#5a7a4a');
      if (v) { // secondary lump
        R(x, ox + 7, oy - 4, 4, 5, PAL.rock); R(x, ox + 7, oy - 4, 4, 1, PAL.rockL);
        x.fillStyle = '#4a4a54'; x.fillRect(ox + 6, oy - 5, 6, 1); x.fillRect(ox + 6, oy - 5, 1, 6);
        R(x, ox + 9, oy - 2, 1, 2, PAL.rockD);
      }
      S['rock' + v] = c;
    }
    // --- essence crystal lode ---
    {
      const { c, x } = mkc(16, 24);
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(3, 22, 10, 2);
      R(x, 3, 15, 10, 7, PAL.rock); R(x, 3, 15, 10, 1, PAL.rockL); R(x, 3, 21, 10, 1, PAL.rockD);
      x.fillStyle = '#4a4a54'; x.fillRect(2, 14, 12, 1); x.fillRect(2, 14, 1, 8); x.fillRect(13, 14, 1, 8);
      // crystal spikes
      const spikes = [[5, 10, 2, 5], [8, 12, 2, 3], [10, 13, 1, 2]];
      for (const [sx, sy, sw, sh] of spikes) {
        R(x, sx, sy, sw, sh, '#8a5cd0'); R(x, sx, sy, sw, 2, '#b48ae0'); R(x, sx, sy, 1, sh, '#d0b0ff');
        x.fillStyle = '#4a2e78'; x.fillRect(sx - 1, sy + sh, sw + 2, 0); x.fillRect(sx - 1 + sw + 1, sy, 1, sh);
      }
      R(x, 6, 9, 1, 1, '#f0e0ff');
      S.crystal = c;
    }
    // --- ancient ruin: crumbled masonry ---
    {
      const { c, x } = mkc(16, 24);
      x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(2, 22, 12, 2);
      R(x, 2, 14, 12, 8, PAL.stoneD);
      R(x, 2, 14, 12, 1, PAL.stoneB); R(x, 2, 21, 12, 1, '#4c4c56');
      R(x, 3, 16, 4, 2, PAL.stoneB); R(x, 8, 15, 5, 2, PAL.stoneB); R(x, 4, 19, 3, 2, PAL.stoneB); R(x, 9, 18, 4, 2, PAL.stoneB);
      R(x, 2, 14, 1, 8, '#4c4c56'); R(x, 13, 14, 1, 8, '#4c4c56');
      R(x, 6, 9, 3, 5, PAL.stoneB); R(x, 6, 9, 3, 1, PAL.stoneL); R(x, 6, 9, 1, 5, PAL.stoneL); // broken pillar stub
      R(x, 3, 15, 2, 1, '#5a7a4a'); R(x, 10, 20, 2, 1, '#5a7a4a'); // moss
      S.ruin = c;
    }
    // --- decor: mushrooms & tall grass ---
    {
      const { c, x } = mkc(16, 16);
      R(x, 4, 10, 2, 3, '#d8cbb0'); R(x, 3, 8, 4, 2, '#c04444'); R(x, 4, 8, 2, 1, '#e86a6a');
      R(x, 10, 12, 2, 2, '#d8cbb0'); R(x, 9, 10, 4, 2, '#c04444');
      R(x, 3, 8, 4, 1, '#8a2e2e'); R(x, 4, 9, 1, 1, '#f0e0d0');
      S.mush = c;
    }
    for (let v = 0; v < 2; v++) {
      const { c, x } = mkc(16, 16);
      for (let i = 0; i < 4; i++) {
        const gx = 3 + i * 3 + v;
        R(x, gx, 8 + ((i * 5 + v * 3) % 4), 1, 7 - ((i + v) % 3), i % 2 ? '#6ea83c' : '#5a8a34');
      }
      R(x, 6 + v, 6, 1, 9, '#7ab648'); R(x, 9 - v, 7, 1, 8, '#5a8a34');
      S['tgrass' + v] = c;
    }
    // --- flowers (2) ---
    for (let v = 0; v < 2; v++) {
      const { c, x } = mkc(16, 16);
      const cols = ['#f0f0f0', '#ffd94a', '#e88bd0'];
      for (let i = 0; i < 3; i++) {
        const px = 3 + i * 4 + v * 2, py = 6 + ((i * 5 + v * 3) % 6);
        R(x, px, py + 1, 1, 2, '#4e7a40');
        R(x, px - 1, py, 1, 1, cols[(i + v) % 3]); R(x, px + 1, py, 1, 1, cols[(i + v) % 3]);
        R(x, px, py - 1, 1, 1, cols[(i + v + 1) % 3]); R(x, px, py, 1, 1, cols[(i + v + 2) % 3]);
      }
      S['flw' + v] = c;
    }
    // --- grave ---
    {
      const { c, x } = mkc(16, 24);
      x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(4, 22, 8, 2);
      R(x, 5, 13, 6, 9, PAL.stoneB); R(x, 5, 13, 6, 1, PAL.stoneL); R(x, 5, 21, 6, 1, PAL.stoneD);
      R(x, 6, 14, 1, 7, PAL.stoneL); R(x, 7, 16, 2, 1, PAL.stoneD); R(x, 7, 18, 2, 1, PAL.stoneD);
      R(x, 4, 21, 8, 1, '#5a7a4a');
      S.grave = c;
    }
  },

  /* ================= BUILDINGS ================= */
  buildings() {
    const S = this.s;
    // --- tent 1x1 ---
    {
      const { c, x } = mkc(16, 16);
      for (let i = 0; i < 9; i++) R(x, 7 - i, 6 + i, 2 + i * 2, 1, i > 6 ? PAL.tentD : PAL.tentC);
      R(x, 7, 2, 2, 5, '#5a4426'); R(x, 6, 4, 5, 1, PAL.tentD);
      R(x, 7, 12, 2, 3, '#4a3820');
      R(x, 4, 8, 1, 4, PAL.tentD); R(x, 11, 8, 1, 4, PAL.tentD);
      S.tent = c;
    }
    // --- camp (starting warehouse) 2x2 ---
    {
      const { c, x } = mkc(32, 32);
      R(x, 3, 14, 26, 15, PAL.plank);                     // walls
      for (let i = 0; i < 5; i++) R(x, 3, 15 + i * 3, 26, 1, PAL.plankD);
      R(x, 3, 14, 26, 1, PAL.woodL);
      // roof
      for (let i = 0; i < 10; i++) R(x, 1 + i, 4 + i, 30 - i * 2, 1, i % 2 ? PAL.thatchD : PAL.thatch);
      R(x, 1, 13, 30, 2, PAL.thatchD);
      R(x, 15, 8, 2, 6, PAL.woodD);                        // ridge pole
      R(x, 13, 20, 6, 9, PAL.door); R(x, 13, 20, 6, 1, '#7a5a34'); // door
      R(x, 6, 18, 4, 4, '#2c2c34'); R(x, 24, 18, 4, 4, '#2c2c34'); // windows
      R(x, 24, 26, 6, 5, PAL.wood); R(x, 25, 27, 4, 1, PAL.woodD); // crate
      R(x, 5, 27, 4, 3, '#9a7448'); R(x, 6, 28, 2, 1, '#6e5136'); // barrel-ish
      S.camp = c;
    }
    // --- warehouse (buildable store) 2x2 ---
    {
      const { c, x } = mkc(32, 32);
      R(x, 2, 12, 28, 17, PAL.stoneB);
      for (let r = 0; r < 4; r++) R(x, 2, 13 + r * 4, 28, 1, PAL.stoneD);
      R(x, 9, 13, 1, 15, PAL.stoneD); R(x, 19, 13, 1, 15, PAL.stoneD);
      R(x, 1, 8, 30, 5, PAL.wood);                          // flat awning roof
      for (let i = 0; i < 8; i++) R(x, 1 + i * 4, 8, 1, 5, PAL.woodD);
      R(x, 1, 12, 30, 1, PAL.woodL);
      R(x, 13, 19, 6, 10, PAL.door); R(x, 13, 19, 6, 1, '#7a5a34');
      R(x, 5, 17, 4, 4, '#2c2c34'); R(x, 23, 17, 4, 4, '#2c2c34');
      R(x, 4, 26, 7, 6, PAL.wood); R(x, 5, 27, 5, 1, PAL.woodD); R(x, 21, 26, 7, 6, PAL.wood); R(x, 22, 27, 5, 1, PAL.woodD);
      S.warehouse = c;
    }
    // --- granary 2x2 (v1.2 supply lines) ---
    {
      const { c, x } = mkc(32, 32);
      R(x, 4, 14, 24, 14, PAL.plank);
      for (let i = 0; i < 4; i++) R(x, 4, 16 + i * 3, 24, 1, PAL.plankD);
      for (let i = 0; i < 7; i++) R(x, 2 + i, 5 + i, 28 - i * 2, 1, i % 2 ? PAL.thatchD : PAL.thatch);
      R(x, 3, 26, 2, 5, PAL.woodD); R(x, 27, 26, 2, 5, PAL.woodD);   // stilts
      R(x, 13, 19, 6, 9, PAL.door);
      R(x, 5, 17, 5, 5, '#d8b46a'); R(x, 6, 18, 3, 1, '#b8944e');    // grain sacks
      R(x, 22, 17, 5, 5, '#d8b46a'); R(x, 23, 18, 3, 1, '#b8944e');
      R(x, 7, 24, 3, 4, '#c9a75e'); R(x, 24, 24, 2, 3, '#c9a75e');
      S.granary = c;
    }
    // --- storehouse 2x2 ---
    {
      const { c, x } = mkc(32, 32);
      R(x, 2, 12, 28, 17, PAL.stoneB);
      for (let r = 0; r < 4; r++) R(x, 2, 13 + r * 4, 28, 1, PAL.stoneD);
      R(x, 1, 8, 30, 5, PAL.wood);
      for (let i = 0; i < 8; i++) R(x, 1 + i * 4, 8, 1, 5, PAL.woodD);
      R(x, 13, 19, 6, 10, PAL.door);
      R(x, 4, 24, 7, 2, PAL.wood); R(x, 5, 22, 5, 2, PAL.woodD); R(x, 5, 26, 5, 2, PAL.wood); // log piles
      R(x, 21, 24, 7, 2, PAL.wood); R(x, 22, 22, 5, 2, PAL.woodD); R(x, 22, 26, 5, 2, PAL.wood);
      R(x, 23, 16, 5, 5, '#d8b46a'); R(x, 24, 17, 3, 1, '#b8944e');
      S.storehouse = c;
    }
    // --- smithy 2x2 ---
    {
      const { c, x } = mkc(32, 32);
      R(x, 3, 14, 26, 15, PAL.stoneB);
      for (let r = 0; r < 4; r++) R(x, 3, 15 + r * 4, 26, 1, PAL.stoneD);
      R(x, 22, 4, 6, 12, PAL.stoneB); R(x, 22, 4, 6, 1, PAL.stoneL);  // chimney
      R(x, 23, 3, 4, 2, PAL.stoneD); R(x, 24, 8, 2, 3, '#3a3a42');
      for (let i = 0; i < 6; i++) R(x, 4 + i, 8 + i, 18 - i * 2, 1, i % 2 ? PAL.plankD : PAL.plank); // shed roof
      R(x, 4, 14, 18, 1, PAL.plankD);
      R(x, 8, 20, 7, 6, '#3a3a42'); R(x, 9, 21, 5, 4, '#ff7a2e'); R(x, 10, 22, 3, 2, '#ffce56'); // forge mouth
      R(x, 20, 21, 6, 2, PAL.metalD); R(x, 21, 19, 4, 2, PAL.metal); // anvil
      R(x, 17, 26, 3, 6, '#6b4a26'); R(x, 16, 25, 5, 2, PAL.wood);   // hammer haft
      S.smithy = c;
    }
    // --- kitchen 2x2 ---
    {
      const { c, x } = mkc(32, 32);
      R(x, 4, 16, 24, 12, PAL.plank);
      for (let i = 0; i < 4; i++) R(x, 4, 17 + i * 3, 24, 1, PAL.plankD);
      for (let i = 0; i < 8; i++) R(x, 2 + i, 4 + i, 28 - i * 2, 1, i % 2 ? PAL.thatchD : PAL.thatch);
      R(x, 2, 12, 28, 2, PAL.thatchD);
      R(x, 13, 22, 6, 6, PAL.door);
      R(x, 6, 20, 4, 4, '#2c2c34');
      R(x, 21, 21, 7, 5, PAL.metalD); R(x, 22, 22, 5, 3, PAL.metal); // cauldron
      R(x, 23, 18, 1, 3, '#cfd8e0'); R(x, 25, 17, 1, 4, '#cfd8e0'); R(x, 27, 19, 1, 2, '#cfd8e0'); // steam
      S.kitchen = c;
    }
    // --- fletcher hut 2x2 ---
    {
      const { c, x } = mkc(32, 32);
      R(x, 5, 15, 22, 13, PAL.plank);
      for (let i = 0; i < 4; i++) R(x, 5, 16 + i * 3, 22, 1, PAL.plankD);
      for (let i = 0; i < 7; i++) R(x, 3 + i, 6 + i, 26 - i * 2, 1, i % 2 ? PAL.thatchD : PAL.thatch);
      R(x, 12, 20, 6, 8, PAL.door);
      R(x, 21, 20, 1, 9, '#c9b47a'); R(x, 23, 20, 1, 9, '#c9b47a'); R(x, 25, 20, 1, 9, '#c9b47a'); // arrow bundle
      R(x, 20, 24, 7, 1, '#b8452e');
      R(x, 21, 17, 1, 2, '#e8e0d0'); R(x, 23, 17, 1, 2, '#e8e0d0'); R(x, 25, 17, 1, 2, '#e8e0d0');  // fletchings
      R(x, 27, 18, 1, 10, '#c9b47a'); R(x, 26, 22, 3, 1, '#b8452e');
      R(x, 7, 18, 3, 3, '#2c2c34');
      S.fletch = c;
    }
    // --- tavern 2x2 ---
    {
      const { c, x } = mkc(32, 32);
      R(x, 3, 14, 26, 15, PAL.plank);
      for (let i = 0; i < 5; i++) R(x, 3, 15 + i * 3, 26, 1, PAL.plankD);
      R(x, 3, 14, 26, 1, PAL.woodL);
      R(x, 5, 14, 2, 15, PAL.woodD); R(x, 25, 14, 2, 15, PAL.woodD); R(x, 5, 20, 22, 2, PAL.woodD); // half-timber
      for (let i = 0; i < 8; i++) R(x, 1 + i, 4 + i, 30 - i * 2, 1, i % 2 ? '#8a4a3a' : '#a05a48'); // red roof
      R(x, 1, 11, 30, 3, '#7a4234');
      R(x, 13, 21, 6, 8, PAL.door);
      R(x, 6, 19, 4, 4, '#ffdf9a'); R(x, 22, 19, 4, 4, '#ffdf9a');   // warm windows
      R(x, 12, 2, 8, 6, PAL.wood); R(x, 13, 3, 6, 4, '#e8b84a');     // hanging sign
      R(x, 14, 4, 4, 2, '#8a5a2b'); R(x, 15, 8, 2, 2, PAL.woodD);    // mug + bracket
      S.tavern = c;
    }
    // --- well 1x1 ---
    {
      const { c, x } = mkc(16, 16);
      R(x, 2, 9, 12, 6, PAL.stoneB);                              // stone ring
      R(x, 2, 9, 12, 1, PAL.stoneL); R(x, 2, 14, 12, 1, PAL.stoneD);
      R(x, 4, 10, 8, 3, '#20304a'); R(x, 4, 10, 8, 1, '#3b6ea8');  // water below
      R(x, 3, 2, 1, 8, PAL.woodD); R(x, 12, 2, 1, 8, PAL.woodD);   // A-frame legs
      R(x, 3, 2, 10, 1, PAL.wood); R(x, 2, 1, 12, 1, PAL.woodL);   // crossbar + cap
      R(x, 7, 3, 1, 4, '#c9b47a');                                // rope
      R(x, 6, 7, 3, 2, PAL.wood); R(x, 6, 7, 3, 1, PAL.woodL);     // bucket
      S.well = c;
    }
    // --- charcoal kiln 1x1 ---
    {
      const { c, x } = mkc(16, 16);
      R(x, 2, 8, 12, 6, PAL.stoneD);
      for (let i = 0; i < 5; i++) R(x, 3 + i, 7 - i, 10 - i * 2, 1, PAL.stoneB); // dome
      R(x, 2, 14, 12, 1, PAL.stoneD);
      R(x, 6, 10, 4, 4, '#181420'); R(x, 6, 10, 4, 1, '#241f30');  // mouth
      R(x, 7, 2, 2, 2, '#3a3a40');                                // vent
      R(x, 7, 11, 1, 1, '#ff9a2e'); R(x, 8, 12, 1, 1, '#ffce56');  // ember glow
      S.kiln = c;
    }
    // --- oil press 1x1 ---
    {
      const { c, x } = mkc(16, 18);
      R(x, 2, 9, 12, 7, PAL.plank); R(x, 2, 9, 12, 1, PAL.woodL);  // bench
      R(x, 3, 10, 1, 6, PAL.plankD); R(x, 12, 10, 1, 6, PAL.plankD);
      R(x, 3, 2, 10, 2, PAL.wood); R(x, 3, 2, 10, 1, PAL.woodL);   // top beam
      R(x, 3, 4, 1, 6, PAL.woodD); R(x, 12, 4, 1, 6, PAL.woodD);   // posts
      R(x, 7, 4, 2, 3, PAL.metalD); R(x, 7, 4, 2, 1, PAL.metal);   // screw
      R(x, 5, 8, 6, 2, PAL.metal);                                 // press plate
      R(x, 4, 12, 3, 3, '#e8c05a'); R(x, 9, 12, 3, 3, '#c9a050');  // seed sacks
      R(x, 5, 15, 2, 3, '#6fb7d9'); R(x, 9, 15, 2, 3, '#4f8fa8');  // oil jars
      S.press = c;
    }
    // --- bottlery 2x2 ---
    {
      const { c, x } = mkc(32, 32);
      R(x, 5, 15, 22, 13, PAL.plank);
      for (let i = 0; i < 4; i++) R(x, 5, 16 + i * 3, 22, 1, PAL.plankD);
      for (let i = 0; i < 7; i++) R(x, 3 + i, 7 + i, 26 - i * 2, 1, i % 2 ? PAL.thatchD : PAL.thatch);
      R(x, 3, 13, 26, 2, PAL.thatchD);
      R(x, 13, 21, 6, 7, PAL.door);
      R(x, 6, 18, 5, 2, PAL.woodD); R(x, 21, 18, 5, 2, PAL.woodD); // shelves
      R(x, 7, 16, 2, 2, '#6fb7d9'); R(x, 10, 16, 2, 2, '#4f8fa8'); // bottles
      R(x, 22, 16, 2, 2, '#6fb7d9'); R(x, 25, 16, 2, 2, '#a8cbe8');
      R(x, 24, 21, 3, 5, '#3b6ea8'); R(x, 24, 21, 3, 1, '#a8cbe8'); // water barrel
      S.bottlery = c;
    }
    // --- bakehouse 2x2 ---
    {
      const { c, x } = mkc(32, 32);
      R(x, 3, 12, 26, 16, PAL.plank);
      for (let i = 0; i < 5; i++) R(x, 3, 13 + i * 3, 26, 1, PAL.plankD);
      for (let i = 0; i < 8; i++) R(x, 1 + i, 3 + i, 30 - i * 2, 1, i % 2 ? PAL.thatchD : PAL.thatch);
      R(x, 1, 10, 30, 2, PAL.thatchD);
      R(x, 22, 1, 4, 8, PAL.stoneB); R(x, 22, 1, 4, 1, PAL.stoneL); R(x, 22, 5, 4, 1, PAL.stoneD); // chimney
      R(x, 6, 18, 8, 8, PAL.stoneD); R(x, 7, 20, 6, 6, '#181420'); // oven
      R(x, 7, 20, 6, 1, '#ff9a2e'); R(x, 8, 21, 2, 1, '#ffce56');  // fire in the mouth
      R(x, 19, 21, 6, 7, PAL.door);
      R(x, 17, 16, 5, 2, PAL.wheat); R(x, 18, 15, 3, 1, PAL.wheatD); // loaf on the sill
      R(x, 24, 17, 4, 4, '#ffdf9a');                              // warm window
      S.bakery = c;
    }
    // --- schoolhouse 2x2 ---
    {
      const { c, x } = mkc(32, 36);
      R(x, 3, 16, 26, 14, PAL.stoneB);
      R(x, 3, 16, 26, 1, PAL.stoneL); R(x, 3, 29, 26, 1, PAL.stoneD);
      for (let i = 0; i < 8; i++) R(x, 1 + i, 7 + i, 30 - i * 2, 1, i % 2 ? '#6a8ab4' : '#5278a4'); // slate roof
      R(x, 1, 14, 30, 2, '#3f5d80');
      R(x, 13, 3, 6, 5, '#5278a4'); R(x, 13, 3, 6, 1, '#3f5d80'); // bell gable
      R(x, 15, 4, 2, 2, '#e8c05a');                               // bell
      R(x, 13, 21, 6, 9, PAL.door); R(x, 13, 21, 6, 1, '#7a5a34');
      R(x, 6, 20, 4, 4, '#ffdf9a'); R(x, 22, 20, 4, 4, '#ffdf9a'); // windows
      S.school = c;
    }
    // --- manor 3x2 ---
    {
      const { c, x } = mkc(48, 32);
      R(x, 4, 14, 40, 14, PAL.stoneB);
      for (let r = 0; r < 4; r++) R(x, 4, 15 + r * 4, 40, 1, PAL.stoneD);
      R(x, 18, 14, 1, 14, PAL.stoneD); R(x, 30, 14, 1, 14, PAL.stoneD);
      for (let i = 0; i < 9; i++) {                                   // twin slate slopes
        R(x, 2 + i, 5 + i, 26 - i * 2, 1, i % 2 ? '#5a6274' : '#6a7284');
        R(x, 26 + i, 5 + i, 26 - i * 2, 1, i % 2 ? '#5a6274' : '#6a7284');
      }
      R(x, 2, 13, 44, 2, '#4a5262');
      R(x, 8, 3, 4, 8, PAL.stoneB); R(x, 8, 3, 4, 1, PAL.stoneL);
      R(x, 36, 3, 4, 8, PAL.stoneB); R(x, 36, 3, 4, 1, PAL.stoneL);   // chimneys
      R(x, 21, 20, 6, 8, PAL.door); R(x, 23, 20, 1, 8, '#4a3018');
      R(x, 9, 18, 4, 5, '#ffdf9a'); R(x, 35, 18, 4, 5, '#ffdf9a');
      R(x, 14, 19, 3, 4, '#2c2c34'); R(x, 31, 19, 3, 4, '#2c2c34');
      S.manor = c;
    }
    // --- watchtower II (upgrade tier) ---
    {
      const { c, x } = mkc(16, 36);
      R(x, 4, 14, 8, 20, PAL.plank);
      for (let i = 0; i < 6; i++) R(x, 4, 16 + i * 3, 8, 1, PAL.plankD);
      R(x, 2, 12, 12, 3, PAL.wood); R(x, 2, 12, 12, 1, PAL.woodL);
      R(x, 2, 9, 1, 3, PAL.woodD); R(x, 13, 9, 1, 3, PAL.woodD); R(x, 2, 9, 12, 1, PAL.wood);
      for (let i = 0; i < 5; i++) R(x, 2 + i * 3, 3 + (i % 2), 3, 2, i % 2 ? PAL.thatchD : PAL.thatch);
      R(x, 7, 5, 2, 2, '#ff9a2e');
      R(x, 13, 2, 1, 7, '#6b4a26'); R(x, 14, 2, 2, 2, '#c03030');    // banner
      S.tower2 = c;
    }
    // --- watchtower III (stone keep) ---
    {
      const { c, x } = mkc(16, 40);
      R(x, 4, 14, 8, 24, PAL.stoneB);
      for (let r = 0; r < 7; r++) R(x, 4, 16 + r * 3, 8, 1, PAL.stoneD);
      R(x, 4, 14, 1, 24, PAL.stoneL); R(x, 11, 14, 1, 24, PAL.stoneD);
      R(x, 3, 10, 2, 4, PAL.stoneB); R(x, 7, 10, 2, 4, PAL.stoneB); R(x, 11, 10, 2, 4, PAL.stoneB); // crenellations
      R(x, 3, 10, 2, 1, PAL.stoneL); R(x, 7, 10, 2, 1, PAL.stoneL); R(x, 11, 10, 2, 1, PAL.stoneL);
      R(x, 3, 14, 10, 1, PAL.stoneD);
      R(x, 6, 18, 4, 5, '#2c2c34');                                  // arrow slit
      R(x, 7, 7, 2, 3, '#ff9a2e');                                   // brazier
      R(x, 12, 1, 1, 9, '#6b4a26'); R(x, 13, 1, 2, 3, '#c9a94b');    // pennant
      S.tower3 = c;
    }
    // --- stone-faced palisade (upgrade tier) ---
    {
      const { c, x } = mkc(16, 16);
      for (let r = 0; r < 2; r++) {                                  // stone base
        R(x, 0, 8 + r * 4, 16, 3, r % 2 ? PAL.stoneB : '#93939d');
        R(x, 0, 11 + r * 4, 16, 1, PAL.stoneD);
      }
      R(x, 0, 8, 16, 1, PAL.stoneL);
      [3, 8, 13].forEach(ox => {                                     // timber top
        R(x, ox, 1, 3, 7, PAL.wood);
        R(x, ox, 1, 3, 1, PAL.woodL); R(x, ox + 2, 1, 1, 7, PAL.woodD);
        R(x, ox + 1, 0, 1, 1, '#8a6a38');
      });
      R(x, 0, 4, 16, 1, PAL.woodD);
      S.wallSF = c;
    }
    // --- irrigated plot 2x2, 4 stages ---
    {
      const stages2 = [
        { spr: 0, col: null },
        { spr: 1, col: PAL.sprout },
        { spr: 2, col: '#8fbf48' },
        { spr: 3, col: PAL.wheat },
      ];
      stages2.forEach((st, si) => {
        const { c, x } = mkc(32, 32);
        for (let r = 0; r < 5; r++) {
          R(x, 2, 3 + r * 6, 28, 3, r % 2 ? PAL.soil : PAL.soilD);
          R(x, 2, 6 + r * 6, 28, 1, '#4a7ea8');                      // irrigation rills
        }
        R(x, 0, 0, 32, 2, '#5a8a4a'); R(x, 0, 30, 32, 2, '#4e7a40');
        R(x, 0, 15, 32, 1, '#5a8ec0'); R(x, 0, 27, 32, 1, '#5a8ec0');
        if (st.spr > 0) {
          for (let r = 0; r < 5; r++) for (let i = 0; i < 7; i++) {
            const px = 4 + i * 4, py = 4 + r * 6;
            if (st.spr === 1) R(x, px, py - 1, 1, 2, st.col);
            else if (st.spr === 2) { R(x, px, py - 3, 1, 4, st.col); R(x, px - 1, py - 2, 1, 2, '#6ea83c'); }
            else { R(x, px, py - 5, 1, 6, st.col); R(x, px - 1, py - 6, 3, 2, PAL.wheatD); R(x, px, py - 4, 1, 1, '#e8cc70'); }
          }
        }
        S['farm2_' + si] = c;
      });
    }
    // --- cottage 2x2 ---
    {
      const { c, x } = mkc(32, 32);
      R(x, 4, 16, 24, 12, PAL.stoneB);
      R(x, 4, 17, 24, 1, PAL.stoneD); R(x, 4, 22, 24, 1, PAL.stoneD); R(x, 4, 26, 24, 1, PAL.stoneD);
      R(x, 10, 16, 1, 12, PAL.stoneD); R(x, 21, 16, 1, 12, PAL.stoneD);
      // timber gable
      R(x, 13, 10, 6, 6, PAL.plank); R(x, 13, 10, 1, 6, PAL.plankD); R(x, 18, 10, 1, 6, PAL.plankD);
      // thatch roof — ridge at the top, eaves wide at the bottom
      for (let i = 0; i < 9; i++) {
        const w = 4 + i * 3, sx = 16 - (w >> 1);
        R(x, sx, 2 + i, w, 1, i % 2 ? PAL.thatchD : PAL.thatch);
      }
      R(x, 2, 11, 28, 1, PAL.thatchD); R(x, 13, 1, 6, 2, PAL.thatchD);
      R(x, 13, 22, 6, 6, PAL.door); R(x, 13, 22, 6, 1, '#7a5a34');
      R(x, 6, 20, 4, 4, '#2c2c34'); R(x, 22, 20, 4, 4, '#2c2c34');
      S.cottage = c;
    }
    // --- farm 2x2, 4 stages ---
    {
      const stages = [
        { spr: 0, col: null },                       // tilled
        { spr: 1, col: PAL.sprout },                 // sprouts
        { spr: 2, col: '#8fbf48' },                  // green
        { spr: 3, col: PAL.wheat },                  // ripe
      ];
      stages.forEach((st, si) => {
        const { c, x } = mkc(32, 32);
        for (let r = 0; r < 5; r++) { R(x, 2, 3 + r * 6, 28, 4, r % 2 ? PAL.soil : PAL.soilD); }
        R(x, 0, 0, 32, 2, '#5a8a4a'); R(x, 0, 30, 32, 2, '#4e7a40'); // grass fringe
        if (st.spr > 0) {
          for (let r = 0; r < 5; r++) for (let i = 0; i < 7; i++) {
            const px = 4 + i * 4, py = 4 + r * 6;
            if (st.spr === 1) R(x, px, py - 1, 1, 2, st.col);
            else if (st.spr === 2) { R(x, px, py - 3, 1, 4, st.col); R(x, px - 1, py - 2, 1, 2, '#6ea83c'); }
            else { R(x, px, py - 5, 1, 6, st.col); R(x, px - 1, py - 6, 3, 2, PAL.wheatD); R(x, px, py - 4, 1, 1, '#e8cc70'); }
          }
        }
        S['farm' + si] = c;
      });
    }
    // --- walls & gates ---
    {
      const { c, x } = mkc(16, 16);
      [3, 8, 13].forEach(ox => {
        R(x, ox, 3, 3, 12, PAL.wood);
        R(x, ox, 3, 3, 1, PAL.woodL); R(x, ox + 2, 3, 1, 12, PAL.woodD);
        R(x, ox, 1, 3, 2, PAL.woodL); R(x, ox + 1, 0, 1, 1, '#8a6a38'); // pointed top
      });
      R(x, 0, 6, 16, 1, PAL.woodD); R(x, 0, 11, 16, 1, PAL.woodD);
      S.wallW = c;
    }
    {
      const { c, x } = mkc(16, 16);
      for (let r = 0; r < 4; r++) {
        R(x, 0, r * 4, 16, 3, r % 2 ? PAL.stoneB : '#93939d');
        R(x, 0, r * 4 + 3, 16, 1, PAL.stoneD);
        const off = r % 2 ? 0 : 4;
        for (let i = 0; i < 2; i++) R(x, off + i * 8, r * 4, 1, 3, PAL.stoneD);
      }
      R(x, 0, 0, 16, 1, PAL.stoneL); R(x, 2, 6, 2, 1, PAL.stoneD); R(x, 11, 10, 2, 1, PAL.stoneD);
      S.wallS = c;
    }
    {
      const { c, x } = mkc(16, 16); // wooden gate: frame + dark opening
      R(x, 2, 0, 3, 16, PAL.wood); R(x, 11, 0, 3, 16, PAL.wood);
      R(x, 2, 0, 1, 16, PAL.woodL); R(x, 13, 0, 1, 16, PAL.woodD);
      R(x, 5, 5, 6, 2, PAL.woodD); R(x, 5, 10, 6, 2, PAL.woodD); // crossbars
      R(x, 6, 7, 4, 3, '#3a2c18');
      R(x, 7, 0, 2, 2, '#8a6a38');
      S.gateW = c;
    }
    {
      const { c, x } = mkc(16, 16); // stone gate
      R(x, 0, 0, 4, 16, PAL.stoneB); R(x, 12, 0, 4, 16, PAL.stoneB);
      R(x, 0, 0, 1, 16, PAL.stoneL); R(x, 15, 0, 1, 16, PAL.stoneD);
      R(x, 0, 5, 16, 1, PAL.stoneD);
      R(x, 5, 6, 6, 10, PAL.door); R(x, 7, 6, 1, 10, '#4a3018');
      R(x, 5, 4, 6, 2, PAL.stoneD);
      S.gateS = c;
    }
    // --- torch (2 flame frames) ---
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(16, 24);
      R(x, 7, 10, 2, 12, PAL.woodD); R(x, 6, 20, 4, 2, PAL.wood);
      R(x, 6, 9, 4, 2, PAL.metalD);
      const fy = f ? 3 : 4;
      R(x, 7, fy - 2, 2, 4, '#ff9a2e'); R(x, 6, fy, 4, 3, '#ffce56'); R(x, 7, fy + 1, 2, 1, '#fff2b0');
      if (f) R(x, 5, fy + 1, 1, 2, '#ff9a2e'); else R(x, 10, fy + 1, 1, 2, '#ff9a2e');
      S['torch' + f] = c;
    }
    // --- watchtower 1x1 (tall sprite) ---
    {
      const { c, x } = mkc(16, 32);
      R(x, 3, 12, 2, 18, PAL.wood); R(x, 11, 12, 2, 18, PAL.wood);
      R(x, 3, 12, 1, 18, PAL.woodL); R(x, 12, 12, 1, 18, PAL.woodD);
      R(x, 4, 18, 8, 1, PAL.woodD); R(x, 4, 24, 8, 1, PAL.woodD); // braces
      R(x, 2, 9, 12, 4, PAL.plank); R(x, 2, 9, 12, 1, PAL.woodL); // platform
      R(x, 2, 13, 1, 2, PAL.woodD); R(x, 13, 13, 1, 2, PAL.woodD);
      R(x, 2, 6, 1, 3, PAL.woodD); R(x, 13, 6, 1, 3, PAL.woodD); // rail posts
      R(x, 2, 6, 12, 1, PAL.wood); // rail
      for (let i = 0; i < 5; i++) R(x, 2 + i * 3, 2 + (i % 2), 3, 2, i % 2 ? PAL.thatchD : PAL.thatch); // roof
      R(x, 7, 4, 2, 2, '#ff9a2e'); // brazier ember
      S.tower = c;
    }
    // --- ballista tower ---
    {
      const { c, x } = mkc(16, 32);
      R(x, 4, 12, 8, 18, PAL.stoneB);
      R(x, 4, 12, 1, 18, PAL.stoneL); R(x, 11, 12, 1, 18, PAL.stoneD);
      R(x, 4, 17, 8, 1, PAL.stoneD); R(x, 4, 23, 8, 1, PAL.stoneD);
      R(x, 3, 9, 10, 4, PAL.stoneL); R(x, 3, 9, 10, 1, '#c2c2cc'); // platform
      R(x, 2, 6, 2, 3, PAL.metalD); R(x, 12, 6, 2, 3, PAL.metalD); // bow arms
      R(x, 3, 7, 10, 1, PAL.metalD);
      R(x, 7, 6, 2, 3, PAL.woodD); R(x, 6, 6, 4, 1, PAL.metal); // bolt
      S.ballista = c;
    }
    // --- shrine ---
    {
      const { c, x } = mkc(16, 24);
      [[3, 18], [11, 18]].forEach(p => { R(x, p[0], p[1] - 4, 2, 6, PAL.stoneB); R(x, p[0], p[1] - 4, 2, 1, PAL.stoneL); });
      R(x, 2, 14, 12, 2, PAL.stoneD); R(x, 4, 12, 8, 2, PAL.stoneB);
      R(x, 7, 8, 2, 4, '#d8f4f8');
      R(x, 6, 10, 4, 3, PAL.crystal); R(x, 7, 8, 2, 2, '#b0f2f6'); R(x, 6, 12, 1, 1, '#3fa8b0');
      S.shrine = c;
    }
    // --- beacon 3x3 (48x72, unlit) ---
    {
      const { c, x } = mkc(48, 72);
      // stepped ziggurat
      R(x, 4, 56, 40, 14, PAL.stoneB); R(x, 4, 56, 40, 1, PAL.stoneL);
      R(x, 4, 62, 40, 1, PAL.stoneD); R(x, 16, 56, 1, 14, PAL.stoneD); R(x, 32, 56, 1, 14, PAL.stoneD);
      R(x, 10, 42, 28, 14, '#909098'); R(x, 10, 42, 28, 1, PAL.stoneL); R(x, 10, 50, 28, 1, PAL.stoneD);
      R(x, 16, 30, 16, 12, PAL.stoneB); R(x, 16, 30, 16, 1, PAL.stoneL); R(x, 16, 38, 16, 1, PAL.stoneD);
      // brazier bowl
      R(x, 10, 24, 28, 6, PAL.stoneD); R(x, 12, 22, 24, 3, '#5c5c66');
      R(x, 14, 25, 20, 3, '#3a3a44'); // coals pit
      [[18, 25], [26, 26], [23, 24]].forEach(p => R(x, p[0], p[1], 2, 1, '#6e3418'));
      // side runes
      R(x, 8, 48, 2, 5, PAL.crystal); R(x, 38, 48, 2, 5, PAL.crystal);
      S.beacon = c;
    }
    // --- beacon lit overlay (flame) ---
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(48, 72);
      const h = f ? 20 : 17;
      for (let i = 0; i < h; i++) {
        const w = Math.max(2, 18 - (i * 16 / h) | 0);
        const col = i < 4 ? '#fff2b0' : i < 9 ? '#ffce56' : i < 14 ? '#ff9a2e' : '#e86a1e';
        R(x, 24 - (w >> 1) + ((f && i > 6) ? 1 : 0), 26 - i, w, 1, col);
      }
      if (f) { R(x, 12, 14, 3, 4, '#ff9a2e'); R(x, 33, 16, 3, 3, '#ffce56'); }
      S['beaconF' + f] = c;
    }
    // construction scaffold
    {
      const { c, x } = mkc(16, 16);
      R(x, 1, 1, 14, 1, PAL.woodL); R(x, 1, 14, 14, 1, PAL.woodD);
      R(x, 1, 1, 1, 14, PAL.woodL); R(x, 14, 1, 1, 14, PAL.woodD);
      R(x, 2, 2, 3, 3, '#6e5136'); R(x, 10, 9, 4, 4, '#6e5136');
      R(x, 4, 7, 8, 2, PAL.wood);
      S.site = c;
    }
    // --- monster lair: dark monolith w/ runes (2 glow frames), 16x28 ---
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(16, 28);
      x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(3, 26, 10, 2);
      // bones at base
      R(x, 3, 24, 3, 1, '#d8d4c4'); R(x, 11, 24, 2, 1, '#d8d4c4'); R(x, 5, 25, 1, 2, '#b8b4a4');
      // monolith
      R(x, 4, 6, 8, 20, '#3a3548'); R(x, 4, 6, 2, 20, '#4c4660'); R(x, 10, 6, 2, 20, '#2c2838');
      R(x, 5, 4, 6, 2, '#3a3548'); R(x, 6, 3, 4, 1, '#4c4660');
      x.fillStyle = '#241f30'; x.fillRect(3, 5, 10, 1); x.fillRect(3, 5, 1, 21); x.fillRect(12, 5, 1, 21);
      // cracks
      R(x, 7, 14, 1, 4, '#241f30'); R(x, 8, 18, 1, 3, '#241f30');
      // runes
      const glow = f ? '#d070ff' : '#9a4ed0';
      x.fillStyle = glow;
      R(x, 6, 9, 1, 2); R(x, 9, 8, 1, 3); R(x, 7, 12, 3, 1); R(x, 6, 16, 2, 1); R(x, 9, 20, 1, 2);
      if (f) { x.fillStyle = 'rgba(208,112,255,.5)'; R(x, 6, 8, 4, 5); }
      S['lair' + f] = c;
    }
    // --- spike trap ---
    {
      const { c, x } = mkc(16, 16);
      R(x, 1, 12, 14, 3, '#6e5136'); R(x, 1, 12, 14, 1, '#7c5a34');
      for (let i = 0; i < 4; i++) {
        const sx = 2 + i * 4;
        R(x, sx, 4 + (i % 2) * 2, 2, 9, PAL.metalD);
        R(x, sx, 4 + (i % 2) * 2, 1, 9, PAL.metal);
        R(x, sx, 4 + (i % 2) * 2, 2, 1, '#e8e8f0');
      }
      R(x, 3, 13, 2, 1, '#5c4229'); R(x, 10, 14, 3, 1, '#5c4229');
      S.trap = c;
    }
    // --- windmill 2x2 (2 blade frames) ---
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(32, 44);
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(6, 42, 20, 2);
      // stone base 2 tiles tall
      R(x, 8, 22, 16, 20, PAL.stoneB);
      R(x, 8, 22, 16, 1, PAL.stoneL); R(x, 8, 27, 16, 1, PAL.stoneD); R(x, 8, 33, 16, 1, PAL.stoneD); R(x, 8, 39, 16, 1, PAL.stoneD);
      R(x, 14, 22, 1, 20, PAL.stoneD); R(x, 8, 41, 16, 1, '#5c5c66');
      R(x, 14, 34, 4, 8, PAL.door); R(x, 14, 34, 4, 1, '#7a5a34');
      R(x, 9, 25, 3, 3, '#2c2c34');
      // wooden cap + hub
      R(x, 10, 18, 12, 5, PAL.plank); R(x, 10, 18, 12, 1, PAL.woodL); R(x, 15, 20, 2, 3, PAL.plankD);
      // blades
      const bx = 16, by = 19;
      x.fillStyle = PAL.plank;
      const rot = f ? 45 : 0;
      for (let b = 0; b < 4; b++) {
        const ang = (rot + b * 90) * Math.PI / 180;
        const dx = Math.round(Math.cos(ang)), dy = Math.round(Math.sin(ang));
        if (Math.abs(dx) > Math.abs(dy)) { x.fillRect(bx + (dx > 0 ? 2 : -10), by - 1, 8, 3); }
        else { x.fillRect(bx - 1, by + (dy > 0 ? 2 : -10), 3, 8); }
      }
      x.fillStyle = '#e8e4d4'; x.fillRect(bx - 1, by - 1, 3, 3);
      S['windmill' + f] = c;
    }
    // --- fishing dock 1x1 (hut + planks over water) ---
    {
      const { c, x } = mkc(16, 24);
      R(x, 2, 19, 12, 2, PAL.plank); R(x, 2, 19, 12, 1, PAL.woodL); // dock
      R(x, 3, 21, 1, 3, PAL.plankD); R(x, 12, 21, 1, 3, PAL.plankD); // posts
      // hut
      R(x, 3, 9, 10, 10, PAL.plank);
      R(x, 3, 9, 10, 1, PAL.woodL); R(x, 3, 18, 10, 1, PAL.plankD);
      R(x, 3, 12, 10, 1, PAL.plankD); R(x, 3, 15, 10, 1, PAL.plankD);
      for (let i = 0; i < 4; i++) R(x, 1 + i * 4, 4 + i, 2, 1, i % 2 ? '#6a8ab4' : '#5278a4'); // slate roof
      R(x, 1, 8, 14, 1, '#3f5d80'); R(x, 1, 3, 2, 1, '#3f5d80'); R(x, 12, 6, 2, 1, '#3f5d80');
      R(x, 6, 13, 4, 6, PAL.door); R(x, 6, 13, 4, 1, '#7a5a34');
      R(x, 5, 10, 2, 2, '#2c2c34');
      // fishing rod
      R(x, 12, 15, 1, 4, '#7a5a34'); R(x, 13, 18, 1, 3, '#d8d4c4');
      S.fisher = c;
    }
    // --- mine shaft ---
    {
      const { c, x } = mkc(16, 20);
      R(x, 2, 6, 12, 13, PAL.rock);
      R(x, 2, 6, 12, 1, PAL.rockL); R(x, 2, 18, 12, 1, PAL.rockD);
      R(x, 2, 6, 1, 13, PAL.rockD); R(x, 13, 6, 1, 13, PAL.rockD);
      // dark entrance
      R(x, 4, 8, 8, 11, '#181420');
      R(x, 4, 8, 8, 1, '#241f30');
      // timber frame
      R(x, 3, 7, 1, 12, PAL.plank); R(x, 12, 7, 1, 12, PAL.plank); R(x, 3, 6, 10, 2, PAL.plank);
      R(x, 3, 6, 10, 1, PAL.woodL);
      // cart + lamp
      R(x, 1, 15, 4, 3, PAL.wood); R(x, 1, 15, 4, 1, PAL.woodL);
      R(x, 13, 12, 1, 1, '#ffd94a');
      S.mine = c;
    }
    // --- herbalist hut ---
    {
      const { c, x } = mkc(16, 22);
      x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(3, 20, 10, 2);
      R(x, 3, 11, 10, 9, PAL.plank);
      R(x, 3, 11, 10, 1, PAL.woodL); R(x, 3, 19, 10, 1, PAL.plankD);
      for (let i = 0; i < 4; i++) R(x, 1 + i * 4, 4 + i, 3, 2, i % 2 ? '#3f8a6a' : '#357a5c'); // green roof
      R(x, 1, 8, 14, 3, '#357a5c'); R(x, 1, 10, 14, 1, '#2a6448');
      R(x, 6, 14, 4, 6, PAL.door); R(x, 6, 14, 4, 1, '#7a5a34');
      R(x, 4, 12, 2, 2, '#2c2c34');
      // drying rack with herbs
      R(x, 13, 12, 1, 8, '#7a5a34'); R(x, 13, 12, 3, 1, '#7a5a34');
      R(x, 14, 13, 1, 2, '#3fa88c'); R(x, 15, 13, 1, 3, '#3fa88c');
      S.herbalist = c;
    }
    // --- hospital 2x2 ---
    {
      const { c, x } = mkc(32, 36);
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(4, 33, 24, 2);
      R(x, 4, 15, 24, 18, '#e6dfd0');                     // plaster walls
      R(x, 4, 15, 24, 1, '#f2ecdd');
      for (let i = 0; i < 5; i++) R(x, 4, 19 + i * 3, 24, 1, '#d6cdb8');
      R(x, 4, 15, 1, 18, '#d6cdb8'); R(x, 27, 15, 1, 18, '#d6cdb8');
      // slate roof — ridge at top, eaves wide at bottom
      for (let i = 0; i < 8; i++) {
        const w = 6 + i * 3, sx = 16 - (w >> 1);
        R(x, sx, 4 + i, w, 1, i % 2 ? '#57687c' : '#61728a');
      }
      R(x, 2, 12, 28, 2, '#46586c');                      // eave board
      R(x, 13, 3, 6, 2, '#46586c');                       // ridge cap
      // red cross sign
      R(x, 13, 17, 6, 2, '#d84040'); R(x, 15, 15, 2, 6, '#d84040');
      // door + stone step
      R(x, 13, 26, 6, 7, PAL.door); R(x, 13, 26, 6, 1, '#7a5a34');
      R(x, 11, 33, 10, 1, PAL.stoneD);
      // lit windows
      R(x, 6, 20, 4, 4, PAL.win); R(x, 6, 20, 4, 1, '#b58a2e');
      R(x, 22, 20, 4, 4, PAL.win); R(x, 22, 20, 4, 1, '#b58a2e');
      // herb planters
      R(x, 5, 28, 4, 3, PAL.wood); R(x, 5, 28, 4, 1, PAL.woodD);
      R(x, 6, 27, 1, 1, '#3fa88c'); R(x, 7, 27, 1, 1, '#5cc4a4');
      R(x, 23, 28, 4, 3, PAL.wood); R(x, 23, 28, 4, 1, PAL.woodD);
      R(x, 24, 27, 1, 1, '#3fa88c'); R(x, 25, 27, 1, 1, '#5cc4a4');
      S.hospital = c;
    }
    // --- barracks 2x2 ---
    {
      const { c, x } = mkc(32, 36);
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(4, 34, 24, 2);
      R(x, 4, 16, 24, 18, PAL.plank);
      R(x, 4, 16, 24, 1, PAL.woodL);
      for (let r = 0; r < 4; r++) R(x, 4, 19 + r * 4, 24, 1, PAL.plankD);
      R(x, 13, 16, 1, 18, PAL.plankD);
      // roof
      for (let i = 0; i < 8; i++) R(x, 2 + i, 8 + i, 26, 1, i % 2 ? '#8a4038' : '#7c3830');
      R(x, 2, 15, 28, 1, '#5c2822');
      // banner + weapon rack
      R(x, 27, 4, 1, 12, PAL.plankD);
      R(x, 24, 5, 4, 7, '#c03030'); R(x, 24, 5, 4, 1, '#e05555'); R(x, 25, 8, 2, 2, '#e8a94b');
      R(x, 5, 25, 8, 3, PAL.wood); R(x, 5, 25, 8, 1, PAL.woodL);
      R(x, 7, 21, 1, 4, PAL.metal); R(x, 9, 22, 1, 3, '#9aa0aa');
      // door + windows
      R(x, 13, 26, 6, 8, PAL.door); R(x, 13, 26, 6, 1, '#7a5a34');
      R(x, 6, 19, 4, 4, '#2c2c34'); R(x, 21, 19, 4, 4, '#2c2c34');
      S.barracks = c;
    }
    // --- brazier (The Kindling): stone bowl on legs; 2 lit frames ---
    {
      const { c, x } = mkc(16, 20);
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(3, 18, 10, 2);
      R(x, 4, 13, 2, 5, PAL.stoneD); R(x, 10, 13, 2, 5, PAL.stoneD);   // legs
      R(x, 2, 9, 12, 4, PAL.stoneB); R(x, 2, 9, 12, 1, PAL.stoneL); R(x, 2, 12, 12, 1, PAL.stoneD); // bowl
      R(x, 3, 8, 10, 1, '#4c4c56');
      R(x, 4, 7, 8, 1, '#3a3a44');                                     // cold coals
      S.brazier = c;
    }
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(16, 20);
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(3, 18, 10, 2);
      R(x, 4, 13, 2, 5, PAL.stoneD); R(x, 10, 13, 2, 5, PAL.stoneD);
      R(x, 2, 9, 12, 4, PAL.stoneB); R(x, 2, 9, 12, 1, PAL.stoneL); R(x, 2, 12, 12, 1, PAL.stoneD);
      R(x, 3, 8, 10, 1, '#6e3418');
      R(x, 4, 7, 8, 1, '#ff7a2e');                                     // hot coals
      // tall flame, two flicker frames
      const fy = f ? 0 : 1;
      R(x, 6, 2 + fy, 4, 6, '#ff9a2e'); R(x, 5, 4 + fy, 6, 4, '#ffce56'); R(x, 6, 5 + fy, 4, 2, '#fff2b0');
      if (f) { R(x, 4, 5 + fy, 1, 2, '#ff9a2e'); R(x, 11, 3 + fy, 1, 3, '#ff9a2e'); }
      else { R(x, 3, 4 + fy, 1, 3, '#ff9a2e'); R(x, 12, 5 + fy, 1, 2, '#ffce56'); }
      S['brazierOn' + f] = c;
    }
    // --- muster yard 2x2: fenced drill yard, straw-shade effigy, horn post ---
    {
      const { c, x } = mkc(32, 30);
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(4, 27, 24, 2);
      // trampled dirt ring
      R(x, 3, 12, 26, 14, '#8a6d4e'); R(x, 3, 12, 26, 1, '#9a7d5c');
      R(x, 5, 14, 22, 10, '#7c5f42');
      for (let i = 0; i < 5; i++) R(x, 6 + i * 4, 15 + (i % 3) * 3, 2, 1, '#6e5136');
      // fence posts around
      for (const p of [[2, 10], [9, 8], [20, 8], [28, 10], [2, 22], [28, 22]]) {
        R(x, p[0], p[1], 2, 6, PAL.woodD); R(x, p[0], p[1], 2, 1, PAL.woodL);
      }
      R(x, 2, 12, 6, 1, PAL.wood); R(x, 24, 12, 6, 1, PAL.wood);
      R(x, 4, 16, 24, 1, PAL.woodD);
      // straw-shade effigy: little straw blob with purple-button eyes on a pole
      R(x, 14, 20, 3, 6, '#6b4a2b');
      R(x, 10, 12, 11, 8, '#c9a94b'); R(x, 9, 14, 13, 4, '#c9a94b');
      R(x, 10, 12, 11, 1, '#e0c46a');
      R(x, 8, 15, 2, 4, '#b8942e'); R(x, 21, 13, 2, 5, '#b8942e');     // straw arms
      R(x, 12, 14, 2, 2, '#7a4ec0'); R(x, 17, 14, 2, 2, '#7a4ec0');    // button eyes
      R(x, 14, 17, 3, 1, '#8a6a1e');
      R(x, 11, 10, 9, 2, '#e0c46a'); R(x, 12, 9, 7, 1, '#e0c46a');     // straw hat brim
      // horn post + weapon rack
      R(x, 26, 14, 2, 12, '#6b4a26'); R(x, 24, 14, 6, 2, '#8a5f37'); R(x, 25, 13, 2, 2, '#c9a94b');
      R(x, 5, 24, 7, 2, PAL.wood); R(x, 6, 21, 1, 3, PAL.metalD); R(x, 9, 21, 1, 3, PAL.metal);
      S.muster = c;
    }
  },

  /* ================= MONSTERS ================= */
  monsters() {
    const S = this.s;
    // shade — floating blob
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(16, 16);
      const rows = [[5, 6], [4, 8], [3, 10], [3, 10], [3, 10], [4, 8]];
      rows.forEach((r, i) => R(x, r[0], 3 + i, r[1] - r[0], 1, i < 2 ? '#3a3252' : PAL.shade));
      R(x, 4, 2, 8, 1, '#3a3252'); R(x, 6, 1, 4, 1, PAL.shadeO);
      // outline wisps
      R(x, 2, 5, 1, 6, PAL.shadeO); R(x, 13, 5, 1, 6, PAL.shadeO); R(x, 3, 3, 10, 1, PAL.shadeO);
      R(x, 6, 6, 2, 2, PAL.shadeEye); R(x, 9, 6, 2, 2, PAL.shadeEye);
      R(x, 6, 6, 1, 1, '#f0d0ff'); R(x, 9, 6, 1, 1, '#f0d0ff');
      // wispy bottom
      if (f) { R(x, 4, 9, 2, 2, PAL.shade); R(x, 10, 9, 2, 3, PAL.shade); R(x, 7, 9, 1, 2, '#3a3252'); }
      else { R(x, 5, 9, 2, 3, PAL.shade); R(x, 9, 9, 2, 2, PAL.shade); R(x, 12, 8, 1, 2, '#3a3252'); }
      S['mon_shade' + f] = c;
    }
    // runner — lean sprinter
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(16, 16);
      R(x, 6, 1, 4, 8, '#3c3450'); R(x, 5, 2, 1, 6, '#2c2540'); R(x, 10, 2, 1, 6, '#2c2540');
      R(x, 5, 0, 5, 2, '#2c2540');
      R(x, 6, 3, 1, 1, '#ff7070'); R(x, 8, 3, 1, 1, '#ff7070');
      if (f) { R(x, 6, 9, 2, 4, '#2c2540'); R(x, 8, 9, 2, 2, '#2c2540'); R(x, 3, 4, 3, 1, '#2c2540'); }
      else { R(x, 8, 9, 2, 4, '#2c2540'); R(x, 6, 9, 2, 2, '#2c2540'); R(x, 10, 4, 3, 1, '#2c2540'); }
      R(x, 7, 13, 1, 2, '#2c2540'); R(x, 9, 12, 1, 3, '#2c2540');
      S['mon_runner' + f] = c;
    }
    // brute — hulking
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(16, 16);
      R(x, 3, 3, 10, 9, '#46503c'); R(x, 2, 4, 12, 6, '#3d4634');
      R(x, 4, 2, 8, 2, '#333d2c');
      R(x, 4, 5, 2, 2, '#ffd94a'); R(x, 10, 5, 2, 2, '#ffd94a');
      R(x, 6, 8, 4, 1, '#222a1c'); R(x, 7, 9, 1, 1, '#222a1c');
      if (f) { R(x, 1, 5, 2, 5, '#333d2c'); R(x, 13, 4, 2, 4, '#333d2c'); }
      else { R(x, 1, 4, 2, 4, '#333d2c'); R(x, 13, 5, 2, 5, '#333d2c'); }
      R(x, 4, 12, 3, 3, '#2c3324'); R(x, 9, 12, 3, 3, '#2c3324');
      R(x, 5, 0, 2, 2, '#333d2c'); R(x, 9, 0, 2, 2, '#333d2c'); // horns
      S['mon_brute' + f] = c;
    }
    // stalker — tall clawed
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(16, 16);
      R(x, 6, 0, 4, 11, '#221e36'); R(x, 5, 2, 1, 8, '#191628'); R(x, 10, 2, 1, 8, '#191628');
      R(x, 6, 2, 1, 1, '#ffffff'); R(x, 8, 2, 1, 1, '#ffffff');
      if (f) { R(x, 3, 1, 2, 6, '#191628'); R(x, 11, 2, 2, 5, '#191628'); R(x, 2, 0, 2, 1, '#cfd4e8'); R(x, 12, 1, 2, 1, '#cfd4e8'); }
      else { R(x, 3, 2, 2, 5, '#191628'); R(x, 11, 1, 2, 6, '#191628'); R(x, 3, 7, 1, 2, '#cfd4e8'); R(x, 12, 6, 1, 2, '#cfd4e8'); }
      R(x, 6, 11, 2, 4, '#191628'); R(x, 8, 11, 2, 3, '#191628');
      S['mon_stalker' + f] = c;
    }
    // bonecaster — hunched skeleton hurling bones
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(16, 16);
      R(x, 6, 1, 4, 4, '#d8d4c4'); // skull
      R(x, 6, 2, 1, 1, '#8a1c1c'); R(x, 9, 2, 1, 1, '#8a1c1c');
      R(x, 7, 4, 2, 1, '#241f30');
      R(x, 6, 5, 4, 5, '#c4c0b0'); // ribcage
      R(x, 7, 6, 2, 3, '#8a8678'); R(x, 6, 7, 4, 1, '#a8a494');
      R(x, 6, 10, 1, 4, '#c4c0b0'); R(x, 9, 10, 1, 4, '#c4c0b0'); // legs
      if (f) { R(x, 11, 5, 1, 3, '#c4c0b0'); R(x, 12, 3, 2, 2, '#e8e4d4'); } // throwing arm + bone
      else { R(x, 11, 4, 1, 4, '#c4c0b0'); R(x, 4, 6, 1, 3, '#c4c0b0'); }
      R(x, 5, 6, 1, 3, '#c4c0b0');
      S['mon_boner' + f] = c;
    }
    // wraith — pale phasing spirit (baked translucency)
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(16, 20);
      x.globalAlpha = 0.85;
      const body = 'rgba(150,180,220,0.9)';
      x.fillStyle = body;
      const rows = [[5, 6], [4, 8], [4, 8], [3, 10], [4, 8], [4, 8], [5, 6]];
      rows.forEach((r, i) => x.fillRect(r[0], 3 + i, r[1] - r[0], 1));
      x.fillRect(6, 1, 4, 2);
      // hollow eyes + mouth
      R(x, 6, 4, 1, 2, '#101828'); R(x, 9, 4, 1, 2, '#101828'); R(x, 7, 7, 2, 1, '#101828');
      // tattered tail wisps
      x.fillStyle = 'rgba(150,180,220,0.55)';
      if (f) { x.fillRect(5, 10, 2, 4); x.fillRect(9, 10, 2, 5); x.fillRect(7, 10, 1, 3); }
      else { x.fillRect(6, 10, 2, 5); x.fillRect(9, 10, 1, 3); x.fillRect(4, 10, 1, 2); }
      x.globalAlpha = 1;
      S['mon_wraith' + f] = c;
    }
    // colossus — 24x24 walking stone horror
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(24, 24);
      x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(5, 22, 14, 2);
      // legs
      R(x, 6, 17, 4, 6, '#5c5c68'); R(x, 14, 17, 4, 6, '#5c5c68');
      R(x, 6, 17, 4, 1, '#7c7c88'); R(x, 14, 17, 4, 1, '#7c7c88');
      // torso slab
      R(x, 4, 6, 16, 12, '#6c6c78');
      R(x, 4, 6, 16, 1, '#8c8c98'); R(x, 4, 17, 16, 1, '#4c4c58');
      R(x, 5, 8, 3, 1, '#4c4c58'); R(x, 15, 11, 3, 1, '#4c4c58'); R(x, 8, 14, 4, 1, '#4c4c58');
      R(x, 10, 8, 2, 6, '#4c4c58'); // crack
      // arms (swing frames)
      if (f) { R(x, 1, 4, 3, 10, '#5c5c68'); R(x, 20, 8, 3, 8, '#5c5c68'); }
      else { R(x, 1, 8, 3, 8, '#5c5c68'); R(x, 20, 4, 3, 10, '#5c5c68'); }
      R(x, 1, 13, 3, 2, '#8c8c98'); R(x, 20, 13, 3, 2, '#8c8c98');
      // head
      R(x, 8, 1, 8, 6, '#7c7c88'); R(x, 8, 1, 8, 1, '#9c9ca8');
      R(x, 9, 3, 2, 2, '#ff5a5a'); R(x, 13, 3, 2, 2, '#ff5a5a');
      R(x, 9, 3, 1, 1, '#ffd0d0'); R(x, 13, 3, 1, 1, '#ffd0d0');
      R(x, 10, 5, 4, 1, '#4c4c58');
      R(x, 7, 0, 2, 2, '#5c5c68'); R(x, 15, 0, 2, 2, '#5c5c68'); // horns
      S['mon_colossus' + f] = c;
    }
    // night lord — 32x32 boss
    for (let f = 0; f < 2; f++) {
      const { c, x } = mkc(32, 32);
      // cloak
      const rows = [[10, 12], [8, 16], [7, 18], [6, 20], [6, 20], [5, 22], [5, 22], [6, 20], [7, 18]];
      rows.forEach((r, i) => R(x, r[0], 6 + i, r[1] - r[0], 1, i < 3 ? '#2a2342' : '#1d1830'));
      R(x, 9, 4, 14, 3, '#2a2342'); // shoulders
      R(x, 12, 1, 8, 4, '#241e3a'); // head hood
      R(x, 13, 2, 2, 2, '#ff5a5a'); R(x, 17, 2, 2, 2, '#ff5a5a'); // eyes
      R(x, 13, 2, 1, 1, '#ffd0d0'); R(x, 17, 2, 1, 1, '#ffd0d0');
      // horns
      R(x, 8, 0, 2, 5, '#c9c9d9'); R(x, 22, 0, 2, 5, '#c9c9d9');
      R(x, 7, 0, 1, 2, '#c9c9d9'); R(x, 24, 0, 1, 2, '#c9c9d9');
      // claws
      if (f) { R(x, 3, 8, 4, 2, '#191430'); R(x, 25, 10, 4, 2, '#191430'); }
      else { R(x, 3, 10, 4, 2, '#191430'); R(x, 25, 8, 4, 2, '#191430'); }
      R(x, 2, 7, 2, 1, '#cfd4e8'); R(x, 28, 9, 2, 1, '#cfd4e8');
      // ragged hem
      for (let i = 0; i < 8; i++) R(x, 7 + i * 2 + (f ? 1 : 0), 15, 1, 2 + (i % 3), '#1d1830');
      // inner ember
      R(x, 15, 8, 2, 4, f ? '#7c2e8a' : '#5c2266');
      S['mon_lord' + f] = c;
    }
  },

  /* ================= FX & ICONS ================= */
  fx() {
    const S = this.s;
    { const { c, x } = mkc(9, 3); R(x, 0, 0, 7, 1, PAL.metal); R(x, 6, 0, 3, 1, PAL.metalD); R(x, 0, 1, 2, 1, '#e8e8f0'); S.arrow = c; }
    { const { c, x } = mkc(4, 4); R(x, 1, 0, 2, 4, '#fff2c8'); R(x, 0, 1, 4, 2, '#ffd977'); S.spark = c; }
    for (let f = 0; f < 3; f++) {
      const { c, x } = mkc(6, 7);
      R(x, 2, 1 + f, 2, 4, '#ff9a2e'); R(x, 1, 2 + f, 4, 3, '#ffce56'); R(x, 2, 3 + f, 2, 2, '#fff2b0');
      S['flame' + f] = c;
    }
    { const { c, x } = mkc(5, 5); x.fillStyle = 'rgba(120,120,130,.7)'; x.fillRect(1, 0, 3, 5); x.fillRect(0, 1, 5, 3); S.smoke = c; }
    { const { c, x } = mkc(7, 7); R(x, 1, 1, 5, 5, '#8a4a28'); R(x, 2, 0, 3, 2, '#ff9a2e'); R(x, 0, 2, 2, 3, '#e86a1e'); S.meteor = c; }
    // carry icons (drawn above heads)
    { const { c, x } = mkc(7, 6); R(x, 0, 1, 7, 2, PAL.wood); R(x, 0, 3, 7, 2, PAL.woodD); R(x, 1, 0, 1, 1, PAL.woodL); R(x, 4, 2, 1, 1, '#c9a86a'); S.carryWood = c; }
    { const { c, x } = mkc(7, 6); R(x, 1, 2, 2, 2, PAL.berry); R(x, 4, 2, 2, 2, PAL.berry); R(x, 2, 4, 2, 2, PAL.berryL); R(x, 3, 0, 1, 2, '#4e7a40'); S.carryFood = c; }
    { const { c, x } = mkc(7, 6); R(x, 0, 1, 7, 4, PAL.rock); R(x, 1, 1, 4, 1, PAL.rockL); R(x, 1, 4, 5, 1, PAL.rockD); S.carryStone = c; }
    { const { c, x } = mkc(7, 6); R(x, 2, 0, 1, 2, '#3fa88c'); R(x, 1, 2, 2, 3, '#3fa88c'); R(x, 4, 2, 2, 3, '#6fd4b4'); R(x, 2, 5, 1, 1, '#f0f0e0'); S.carryHerb = c; }
    // bone projectile
    { const { c, x } = mkc(6, 3); R(x, 1, 0, 4, 1, '#e8e4d4'); R(x, 0, 0, 1, 2, '#d8d4c4'); R(x, 5, 1, 1, 2, '#d8d4c4'); R(x, 2, 1, 2, 1, '#c4c0b0'); S.bone = c; }
    // ghost placement tile
    { const { c, x } = mkc(16, 16); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1; x.strokeRect(.5, .5, 15, 15); S.ghostTile = c; }
  },

  icons() {
    const S = this.s;
    const ic = (name, fn) => { const { c, x } = mkc(16, 16); fn(x); S['ic_' + name] = c; };
    ic('wood', x => { R(x, 1, 3, 14, 3, PAL.wood); R(x, 1, 8, 14, 3, PAL.woodD); R(x, 12, 4, 2, 1, '#e8d0a0'); R(x, 12, 9, 2, 1, '#e8d0a0'); });
    ic('stone', x => { R(x, 3, 5, 10, 8, PAL.rock); R(x, 4, 4, 6, 2, PAL.rockL); R(x, 3, 12, 10, 1, PAL.rockD); R(x, 6, 8, 3, 1, PAL.rockD); });
    ic('food', x => { R(x, 3, 5, 4, 4, PAL.berry); R(x, 9, 6, 4, 4, PAL.berryL); R(x, 5, 10, 4, 4, PAL.berry); R(x, 7, 2, 1, 3, '#4e7a40'); R(x, 4, 3, 3, 1, '#4e7a40'); });
    ic('essence', x => { R(x, 5, 3, 6, 10, '#8a5cd0'); R(x, 4, 5, 8, 6, '#8a5cd0'); R(x, 6, 4, 2, 3, '#d0b0ff'); R(x, 6, 11, 4, 1, '#5c3a94'); });
    ic('pop', x => { R(x, 5, 2, 6, 6, '#f0c8a0'); R(x, 5, 2, 6, 2, '#6b4a26'); R(x, 3, 9, 10, 5, '#4a8f3c'); R(x, 6, 5, 1, 1, '#222'); R(x, 9, 5, 1, 1, '#222'); });
    ic('herb', x => { R(x, 7, 2, 2, 12, '#3fa88c'); R(x, 4, 5, 3, 2, '#3fa88c'); R(x, 9, 7, 3, 2, '#6fd4b4'); R(x, 5, 9, 2, 2, '#6fd4b4'); R(x, 7, 1, 2, 2, '#f0f0e0'); R(x, 7, 1, 1, 1, '#e8a94b'); });
    ic('stasis', x => { R(x, 7, 1, 2, 14, '#9ad4f0'); R(x, 1, 7, 14, 2, '#9ad4f0'); R(x, 4, 4, 2, 2, '#c8ecff'); R(x, 10, 10, 2, 2, '#c8ecff'); R(x, 10, 4, 2, 2, '#c8ecff'); R(x, 4, 10, 2, 2, '#c8ecff'); R(x, 7, 7, 2, 2, '#f0faff'); });
    ic('build', x => { R(x, 3, 7, 8, 2, '#7a5a34'); R(x, 9, 3, 4, 5, PAL.metal); R(x, 10, 3, 2, 1, PAL.metalD); R(x, 2, 12, 12, 2, PAL.plank); });
    ic('jobs', x => { R(x, 2, 4, 4, 4, '#f0c8a0'); R(x, 1, 9, 6, 5, '#c03030'); R(x, 10, 5, 4, 4, '#f0c8a0'); R(x, 9, 10, 6, 5, '#4a8f3c'); });
    ic('powers', x => { R(x, 7, 1, 2, 14, '#c9a94b'); R(x, 1, 7, 14, 2, '#c9a94b'); R(x, 4, 4, 8, 8, '#8a5cd0'); R(x, 6, 6, 4, 4, '#d0b0ff'); });
    ic('map', x => { R(x, 1, 3, 14, 10, '#d8cbb0'); R(x, 1, 3, 14, 1, '#b0a388'); R(x, 1, 8, 14, 1, '#b0a388'); R(x, 5, 5, 2, 2, '#4a8f3c'); R(x, 9, 9, 2, 2, '#3b6ea8'); R(x, 10, 4, 2, 2, '#e05555'); });
    ic('sun', x => { R(x, 5, 5, 6, 6, '#ffd94a'); R(x, 7, 1, 2, 3, '#ffd94a'); R(x, 7, 12, 2, 3, '#ffd94a'); R(x, 1, 7, 3, 2, '#ffd94a'); R(x, 12, 7, 3, 2, '#ffd94a'); R(x, 6, 6, 2, 2, '#fff2b0'); });
    ic('moon', x => {
      // pixel crescent opening right — thick back, tapering arms
      R(x, 6, 1, 4, 2, '#c9d4f0'); R(x, 4, 2, 4, 2, '#c9d4f0');
      R(x, 2, 3, 4, 10, '#c9d4f0'); R(x, 4, 12, 4, 2, '#c9d4f0');
      R(x, 6, 13, 4, 2, '#c9d4f0');
    });
    ic('dusk', x => { R(x, 1, 7, 14, 2, '#e8894a'); R(x, 5, 5, 6, 6, '#ffd94a'); R(x, 11, 5, 5, 6, '#1e222b'); });
    ic('arrow', x => { R(x, 12, 2, 2, 2, '#e8e0d0'); R(x, 10, 4, 2, 2, '#e8e0d0'); R(x, 3, 11, 8, 2, '#c9b47a'); R(x, 2, 12, 2, 2, '#b8b8c0'); R(x, 4, 10, 2, 2, '#cfd8e0'); R(x, 11, 1, 2, 2, '#e05555'); });
    ic('tool', x => { R(x, 6, 2, 4, 8, '#8a6a4a'); R(x, 4, 9, 8, 4, PAL.metal); R(x, 4, 9, 8, 1, PAL.metalD); R(x, 7, 3, 1, 6, '#6b4a32'); });
    ic('meal', x => { R(x, 3, 7, 10, 6, '#d8d8e0'); R(x, 4, 6, 8, 2, '#efeff5'); R(x, 5, 8, 2, 2, '#e8a94b'); R(x, 9, 9, 2, 2, '#7dc95e'); R(x, 7, 4, 2, 2, '#cfd8e0'); });
    ic('ale', x => { R(x, 5, 4, 6, 10, '#d8b46a'); R(x, 4, 5, 1, 6, '#b8944e'); R(x, 11, 6, 3, 4, '#d8b46a'); R(x, 5, 4, 6, 2, '#f0e0b0'); R(x, 6, 3, 4, 1, '#f0f0e0'); });
    ic('water', x => { R(x, 7, 1, 2, 3, '#8fc9e8'); R(x, 5, 4, 6, 8, '#6fb7d9'); R(x, 6, 12, 4, 2, '#4f8fa8'); R(x, 6, 5, 2, 3, '#a8d8ee'); });
    ic('oil', x => { R(x, 6, 1, 4, 2, '#c9a050'); R(x, 5, 3, 6, 10, '#e8c05a'); R(x, 5, 8, 6, 5, '#c9862e'); R(x, 6, 4, 2, 3, '#f0dc9a'); });
    ic('bottle', x => { R(x, 7, 1, 2, 3, '#8a6a4a'); R(x, 6, 4, 4, 10, '#6fb7d9'); R(x, 6, 7, 4, 7, '#3b6ea8'); R(x, 7, 5, 1, 4, '#a8d8ee'); });
    ic('bread', x => { R(x, 3, 6, 10, 7, '#d9a04a'); R(x, 4, 5, 8, 2, '#e8bc6c'); R(x, 5, 7, 2, 1, '#b8862e'); R(x, 9, 9, 2, 1, '#b8862e'); R(x, 6, 10, 2, 1, '#b8862e'); });
    ic('mats', x => { R(x, 2, 2, 12, 3, '#7a5a34'); R(x, 2, 4, 12, 1, '#5c4226'); R(x, 2, 6, 12, 3, '#7a7f8c'); R(x, 2, 8, 12, 1, '#5f6470'); R(x, 2, 10, 12, 3, '#c9a94b'); R(x, 2, 12, 12, 1, '#a3873a'); R(x, 12, 3, 1, 1, '#e8d0a0'); R(x, 12, 7, 1, 1, '#aab0be'); });
    ic('charcoal', x => { R(x, 3, 9, 5, 4, '#26262e'); R(x, 8, 7, 5, 5, '#33333c'); R(x, 5, 5, 4, 4, '#1d1d24'); R(x, 9, 8, 2, 1, '#4a4a56'); R(x, 4, 10, 2, 1, '#4a4a56'); });
    ic('flour', x => { R(x, 5, 2, 6, 2, '#d8c8a8'); R(x, 6, 1, 4, 1, '#b09a70'); R(x, 4, 4, 8, 10, '#e8dcc0'); R(x, 3, 6, 1, 6, '#d8c8a8'); R(x, 12, 6, 1, 6, '#d8c8a8'); R(x, 6, 8, 4, 1, '#b09a70'); });
    ic('hands', x => { // the guardian's warm hands — an open palm
      R(x, 4, 6, 8, 6, '#f0c8a0'); R(x, 4, 11, 8, 2, '#d9a06c');
      R(x, 3, 7, 1, 4, '#f0c8a0'); R(x, 12, 7, 1, 4, '#f0c8a0');
      R(x, 4, 2, 1, 4, '#f0c8a0'); R(x, 6, 1, 1, 5, '#f0c8a0'); R(x, 8, 1, 1, 5, '#f0c8a0'); R(x, 10, 2, 1, 4, '#f0c8a0');
      R(x, 5, 3, 5, 2, '#ffd977');
    });
  },

  /* -------- villager sprites (per unique look) -------- */
  villager(look, frame) {
    const key = `${look.skin}|${look.hair}|${look.cloth}|${frame}|${look.guard ? 1 : 0}`;
    let c = this._vcache.get(key);
    if (c) return c;
    const m = mkc(16, 16); const x = m.x;
    const skin = ['#f0c8a0', '#d9a06c', '#a9744b', '#7c5233'][look.skin % 4];
    const hair = ['#3a2a1a', '#6b4a26', '#222222', '#b8862e', '#8a3a2a', '#c9c9c9'][look.hair % 6];
    const cloth = look.cloth, clothD = shade(cloth, -0.3);
    const bob = frame ? 1 : 0;
    // legs
    const legY = 12 + bob;
    if (frame === 0) { R(x, 6, 12, 2, 3, '#3a2f28'); R(x, 9, 12, 2, 3, '#3a2f28'); }
    else if (frame === 1) { R(x, 5, 11 + bob, 2, 4 - bob, '#3a2f28'); R(x, 9, 12, 2, 3, '#3a2f28'); }
    else { R(x, 6, 12, 2, 3, '#3a2f28'); R(x, 10, 11 + bob, 2, 4 - bob, '#3a2f28'); }
    // body
    R(x, 5, 7 + bob, 6, 5, cloth);
    R(x, 5, 10 + bob, 6, 1, clothD);
    R(x, 5, 7 + bob, 6, 1, shade(cloth, 0.18));
    // arms
    R(x, 4, 8 + bob, 1, 3, clothD); R(x, 11, 8 + bob, 1, 3, clothD);
    // head
    R(x, 5, 2 + bob, 6, 5, skin);
    R(x, 5, 2 + bob, 6, 2, hair);
    R(x, 4, 3 + bob, 1, 2, hair); R(x, 11, 3 + bob, 1, 2, hair);
    R(x, 6, 4 + bob, 1, 1, '#1c1c24'); R(x, 9, 4 + bob, 1, 1, '#1c1c24');
    // guard helm
    if (look.guard) { R(x, 4, 1 + bob, 8, 2, '#8a8f9c'); R(x, 5, 0 + bob, 6, 1, '#8a8f9c'); R(x, 4, 1 + bob, 8, 1, '#aab0be'); }
    // tool by cloth color
    const J = JOB_INFO;
    if (cloth === J.guard.cloth) { R(x, 12, 4 + bob, 1, 7, PAL.metal); R(x, 11, 10 + bob, 3, 1, PAL.plank); }
    else if (cloth === J.lumber.cloth) { R(x, 12, 6 + bob, 1, 4, '#7a5a34'); R(x, 12, 5 + bob, 2, 2, '#b8bcc8'); }
    else if (cloth === J.miner.cloth) { R(x, 12, 6 + bob, 1, 5, '#7a5a34'); R(x, 11, 4 + bob, 3, 1, '#b8bcc8'); R(x, 13, 5 + bob, 1, 2, '#b8bcc8'); }
    else if (cloth === J.forager.cloth) { R(x, 11, 9 + bob, 3, 2, '#a97f3f'); R(x, 11, 9 + bob, 3, 1, '#c9a35f'); }
    else if (cloth === J.farmer.cloth) { R(x, 12, 7 + bob, 1, 3, '#7a5a34'); R(x, 12, 6 + bob, 2, 1, '#d9d9e2'); }
    else if (cloth === J.builder.cloth) { R(x, 12, 6 + bob, 1, 4, '#7a5a34'); R(x, 11, 5 + bob, 3, 2, '#9aa0aa'); }
    c = m.c; this._vcache.set(key, c);
    return c;
  },

  monster(type, frame) { return this.s['mon_' + type + frame]; },

  // UI helper: clone an icon canvas into a DOM canvas element
  iconEl(name, size) {
    const src = this.s['ic_' + name] || this.s[name];
    const cv = document.createElement('canvas');
    cv.width = src.width; cv.height = src.height;
    cv.getContext('2d').drawImage(src, 0, 0);
    if (size) { cv.style.width = size + 'px'; cv.style.height = size + 'px'; }
    return cv;
  },

  /* -------- title / end screen painting -------- */
  titlePaint(cv, mode) {
    const x = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    // sky
    const g = x.createLinearGradient(0, 0, 0, h);
    if (mode === 'win') { g.addColorStop(0, '#2c3a6e'); g.addColorStop(.55, '#e8894a'); g.addColorStop(1, '#ffd94a'); }
    else if (mode === 'lose') { g.addColorStop(0, '#05060d'); g.addColorStop(1, '#141830'); }
    else { g.addColorStop(0, '#1c1440'); g.addColorStop(.5, '#5a3a6e'); g.addColorStop(.78, '#e8894a'); g.addColorStop(1, '#f0b060'); }
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // stars
    const rng = U.mulberry32(42);
    x.fillStyle = mode === 'lose' ? 'rgba(200,210,255,.5)' : 'rgba(255,255,255,.7)';
    for (let i = 0; i < 40; i++) x.fillRect((rng() * w) | 0, (rng() * h * .5) | 0, 1, 1);
    // moon / sun
    if (mode === 'win') { x.fillStyle = '#fff2b0'; x.fillRect(w / 2 - 20, h * .52, 40, 40); x.fillStyle = '#ffd94a'; x.fillRect(w / 2 - 26, h * .55, 52, 40); }
    else {
      // pixel crescent stamped 2x — same design as the HUD moon icon, floats
      // clean on the gradient sky (the old offset-rectangle carve left a
      // dark box and an L-shaped blob)
      const u = 2, mx = w * .74, my = h * .16 - 6;
      x.fillStyle = '#dce6f6';
      x.fillRect(mx + 6 * u, my + 1 * u, 4 * u, 2 * u);
      x.fillRect(mx + 4 * u, my + 2 * u, 4 * u, 2 * u);
      x.fillRect(mx + 2 * u, my + 3 * u, 4 * u, 10 * u);
      x.fillRect(mx + 4 * u, my + 12 * u, 4 * u, 2 * u);
      x.fillRect(mx + 6 * u, my + 13 * u, 4 * u, 2 * u);
    }
    // ground
    x.fillStyle = mode === 'lose' ? '#0c0e18' : '#1a2416';
    x.fillRect(0, h * .72, w, h * .28);
    x.fillStyle = mode === 'lose' ? '#10121e' : '#141c10';
    for (let i = 0; i < w; i += 7) x.fillRect(i, h * .72 + ((i * 13) % 9 | 0), 4, 3);
    // silhouette pines
    const pine = (px, py, s, col) => {
      x.fillStyle = col;
      for (let i = 0; i < 4; i++) x.fillRect(px - ((i + 1) * s), py + i * s * 2, (i + 1) * 2 * s, s * 2);
      x.fillRect(px - s / 2, py + 8 * s, s, s * 2);
    };
    const silCol = mode === 'win' ? '#2a3020' : '#0e1220';
    pine(w * .12, h * .56, 4, silCol); pine(w * .2, h * .64, 3, silCol);
    pine(w * .88, h * .58, 4, silCol); pine(w * .8, h * .66, 3, silCol);
    pine(w * .3, h * .68, 2, silCol); pine(w * .68, h * .69, 2, silCol);
    // camp silhouette (tent + hut)
    const gy = h * .78;
    x.fillStyle = silCol;
    x.fillRect(w * .4, gy - 14, 34, 14); x.fillRect(w * .4 - 2, gy - 18, 38, 5); // hut
    for (let i = 0; i < 7; i++) x.fillRect(w * .55 + 10 - i, gy - 8 + i, i * 2 + 2, 1); // tent
    // beacon tower
    const bx = w * .5 - 14, by = gy - 34;
    x.fillStyle = mode === 'win' ? '#4a4a56' : '#2a2a34';
    x.fillRect(bx + 8, by + 22, 12, 12); x.fillRect(bx + 10, by + 12, 8, 10); x.fillRect(bx + 4, by + 8, 20, 5);
    if (mode === 'win' || mode === 'title') {
      const fl = (fx, fy, s, col) => { x.fillStyle = col; for (let i = 0; i < s; i++) x.fillRect(fx - ((s - i) / 2 | 0), fy - i, (s - i), 1); };
      fl(bx + 14, by + 7, 14, '#ff9a2e'); fl(bx + 14, by + 5, 9, '#ffce56'); fl(bx + 14, by + 3, 5, '#fff2b0');
      const rg = x.createRadialGradient(bx + 14, by + 2, 2, bx + 14, by + 2, 46);
      rg.addColorStop(0, 'rgba(255,200,90,.45)'); rg.addColorStop(1, 'rgba(255,200,90,0)');
      x.fillStyle = rg; x.fillRect(bx - 40, by - 44, 110, 110);
    } else {
      // menacing eyes in the dark
      const rng2 = U.mulberry32(7);
      for (let i = 0; i < 7; i++) {
        const ex = w * .1 + rng2() * w * .8, ey = h * .74 + rng2() * h * .18;
        x.fillStyle = rng2() < .5 ? '#c46bff' : '#ff5a5a';
        x.fillRect(ex, ey, 2, 2); x.fillRect(ex + 4, ey, 2, 2);
      }
    }
    // vignette
    const vg = x.createRadialGradient(w / 2, h / 2, h * .4, w / 2, h / 2, h);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
    x.fillStyle = vg; x.fillRect(0, 0, w, h);
  },
};
