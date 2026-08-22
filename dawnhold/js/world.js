'use strict';
/* ============================================================
   Dawnhold — world.js
   Procedural map: value-noise terrain, forests, berry thickets,
   stone lodes. Guarantees starting resources near the village.
   Terrain is baked to an offscreen canvas; tiles rebake on change.
   ============================================================ */

const World = {
  W: CONFIG.MAP_W, H: CONFIG.MAP_H,
  t: null,     // Uint8 terrain (T.*)
  obj: null,   // Uint8 object (OBJ.*)
  amt: null,   // Uint8 remaining units in object
  occ: null,   // Int32 building id per tile (0 = none)
  bakeCv: null,
  center: { x: 0, y: 0 },

  idx(tx, ty) { return ty * this.W + tx; },
  inB(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.W && ty < this.H; },

  // ---- value noise ----
  noiseGen(seed) {
    const rng = U.mulberry32(seed);
    const gw = 24, gh = 24; // coarse lattice
    const grid = new Float32Array((gw + 1) * (gh + 1));
    for (let i = 0; i < grid.length; i++) grid[i] = rng();
    const at = (x, y) => grid[Math.min(gh, y) * (gw + 1) + Math.min(gw, x)];
    const smooth = t => t * t * (3 - 2 * t);
    const sample = (nx, ny) => { // nx,ny in 0..1
      const fx = nx * gw, fy = ny * gh;
      const x0 = fx | 0, y0 = fy | 0;
      const sx = smooth(fx - x0), sy = smooth(fy - y0);
      const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
      return U.lerp(U.lerp(a, b, sx), U.lerp(c, d, sx), sy);
    };
    return {
      fbm(nx, ny, oct) {
        let v = 0, amp = 1, tot = 0, f = 1;
        for (let o = 0; o < oct; o++) { v += sample((nx * f) % 1, (ny * f) % 1) * amp; tot += amp; amp *= .5; f *= 2; }
        return v / tot;
      }
    };
  },

  gen(seed) {
    const W = this.W, H = this.H;
    this.t = new Uint8Array(W * H);
    this.obj = new Uint8Array(W * H);
    this.amt = new Uint8Array(W * H);
    this.occ = new Int32Array(W * H);
    G.regrow = new Map();
    this.lairSpots = [];
    const elev = this.noiseGen(seed);
    const moist = this.noiseGen(seed * 7 + 13);
    const forestN = this.noiseGen(seed * 5 + 71);
    const rocky = this.noiseGen(seed * 3 + 101);
    const cx = W / 2, cy = H / 2;
    this.center = { x: cx, y: cy };

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = this.idx(x, y);
        const nx = x / W, ny = y / H;
        // island falloff: water ring at map edge focuses play inward
        const dx = (x - cx) / (W / 2), dy = (y - cy) / (H / 2);
        const edge = Math.max(Math.abs(dx), Math.abs(dy));
        const e = elev.fbm(nx, ny, 4) * (1 - Math.pow(U.clamp((edge - .82) / .18, 0, 1), 1.6));
        const m = moist.fbm(nx, ny, 3);
        const f = forestN.fbm(nx + .17, ny + .41, 3);
        const r = rocky.fbm(nx + .31, ny + .77, 3);
        const dc = U.dst(x, y, cx, cy);

        if (e < 0.34) { this.t[i] = T.WATER; continue; }
        if (e < 0.375) { this.t[i] = T.SAND; continue; }   // shore ring
        this.t[i] = T.GRASS;
        if (e > 0.36 && e < 0.42 && U.hash2(x, y) < .3) this.t[i] = T.DIRT; // clearings

        if (this.t[i] !== T.GRASS) continue;
        const h = U.hash2(x, y), h2 = U.hash2(x + 5, y + 9);

        // ---- dark forest biome: dense pines, mushrooms, dead trees ----
        if (f > 0.63 && e > 0.40) {
          if (h < 0.62) this.obj[i] = h2 < .82 ? OBJ.PINE : OBJ.TREE;
          else if (h < 0.70) this.obj[i] = OBJ.MUSH;
          else if (h < 0.735) this.obj[i] = OBJ.DEADTREE;
          else if (h < 0.76) this.obj[i] = OBJ.HERB;
          continue;
        }
        // ---- highland biome: boulders, crystals, birch ----
        if (r > 0.66 && dc > 13) {
          if (h < 0.42) this.obj[i] = h2 < 0.10 ? OBJ.CRYSTAL : OBJ.ROCK;
          else if (h < 0.47) this.obj[i] = OBJ.PINE;
          else if (h < 0.50) this.obj[i] = OBJ.BIRCH;
          continue;
        }
        // ---- meadow biome: oaks, berries, herbs, flowers, tall grass ----
        if (m > 0.48) {
          if (h < 0.13) this.obj[i] = OBJ.TREE;
          else if (h < 0.155) this.obj[i] = OBJ.BIRCH;
          else if (h < 0.23) this.obj[i] = OBJ.BUSH;
          else if (h < 0.265) this.obj[i] = OBJ.HERB;
          else if (h < 0.34) this.obj[i] = h2 < .5 ? OBJ.FLOWER : OBJ.TGRASS;
        } else if (h < 0.05) {
          this.obj[i] = OBJ.TGRASS;
        }
        // stray stone even in meadows, farther out
        if (!this.obj[i] && r > 0.63 && dc > 10 && U.hash2(x + 4, y + 2) < .12) this.obj[i] = OBJ.ROCK;
      }
    }

    // clear village heart
    for (let y = cy - 5 | 0; y <= cy + 5; y++)
      for (let x = cx - 5 | 0; x <= cx + 5; x++)
        if (this.inB(x, y) && U.dst(x, y, cx, cy) <= 5.5) {
          const i = this.idx(x, y);
          this.t[i] = T.GRASS; this.obj[i] = OBJ.NONE;
        }

    // guarantee starting resources (idempotent placement on grass)
    const sprinkle = (type, count, rMin, rMax, amt) => {
      let placed = 0, tries = 0;
      while (placed < count && tries++ < 900) {
        const a = Math.random() * Math.PI * 2;
        const r = rMin + Math.random() * (rMax - rMin);
        const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
        if (!this.inB(x, y)) continue;
        const i = this.idx(x, y);
        if (this.t[i] !== T.GRASS) continue;
        if (this.obj[i] === type) { placed++; continue; }
        if (this.obj[i] !== OBJ.NONE && this.obj[i] !== OBJ.FLOWER && this.obj[i] !== OBJ.TGRASS && this.obj[i] !== OBJ.MUSH) continue;
        this.obj[i] = type; if (amt) this.amt[i] = amt;
        placed++;
      }
    };
    sprinkle(OBJ.BUSH, 16, 5, 13, OBJ_AMT[OBJ.BUSH]);
    sprinkle(OBJ.TREE, 24, 7, 17, OBJ_AMT[OBJ.TREE]);
    sprinkle(OBJ.PINE, 8, 12, 22, OBJ_AMT[OBJ.PINE]);
    sprinkle(OBJ.ROCK, 8, 13, 20, OBJ_AMT[OBJ.ROCK]);
    sprinkle(OBJ.HERB, 6, 6, 14, OBJ_AMT[OBJ.HERB]);

    // ancient ruins scattered at mid distance
    sprinkle(OBJ.RUIN, 8, 14, 30, CONFIG.RUIN.stone);
    // essence crystal lodes, far out (risk/reward)
    sprinkle(OBJ.CRYSTAL, 5, 16, 28, OBJ_AMT[OBJ.CRYSTAL]);

    // ---- monster lairs: 3 monoliths, spread angles, far from camp ----
    const baseA = Math.random() * Math.PI * 2;
    for (let k = 0; k < CONFIG.LAIR.count; k++) {
      let placed = false;
      for (let tries = 0; tries < 60 && !placed; tries++) {
        const a = baseA + k * (Math.PI * 2 / CONFIG.LAIR.count) + (Math.random() - .5) * 0.7;
        const r = 19 + Math.random() * 7;
        const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
        if (!this.inB(x, y)) continue;
        const i = this.idx(x, y);
        if (this.t[i] === T.WATER || this.t[i] === T.SAND) continue;
        this.t[i] = T.GRASS;
        this.obj[i] = OBJ.NONE;
        // keep the lair's tile & neighbors clear so monsters can leave
        let ok = true;
        for (const [ddx, ddy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const j = this.inB(x + ddx, y + ddy) ? this.idx(x + ddx, y + ddy) : -1;
          if (j >= 0 && this.t[j] === T.WATER) ok = false;
          if (j >= 0) { this.obj[j] = OBJ.NONE; }
        }
        if (!ok) continue;
        this.lairSpots.push({ x, y });
        // dead trees & mushrooms ring the lair (visual tell)
        for (let d = 0; d < 8; d++) {
          const da = Math.random() * Math.PI * 2, dr = 1.5 + Math.random() * 2.5;
          const dx2 = Math.round(x + Math.cos(da) * dr), dy2 = Math.round(y + Math.sin(da) * dr);
          if (this.inB(dx2, dy2)) {
            const j = this.idx(dx2, dy2);
            if (this.t[j] === T.GRASS && this.obj[j] === OBJ.NONE && U.dst(dx2, dy2, cx, cy) > 6)
              this.obj[j] = U.hash2(dx2, dy2) < .6 ? OBJ.DEADTREE : OBJ.MUSH;
          }
        }
        placed = true;
      }
    }

    // fill amounts for all generated objects
    for (let i = 0; i < this.obj.length; i++) {
      const o = this.obj[i];
      if (OBJ_AMT[o] && this.amt[i] === 0)
        this.amt[i] = OBJ_AMT[o] + (U.hash2(i, 17) < .3 ? 1 : 0);
    }

    this.bakeAll();
  },

  // adopt arrays from a save (no regen)
  adopt(data) {
    this.t = Uint8Array.from(data.t);
    this.obj = Uint8Array.from(data.obj);
    this.amt = Uint8Array.from(data.amt);
    this.occ = new Int32Array(this.W * this.H);
    this.center = { x: this.W / 2, y: this.H / 2 };
    this.bakeAll();
  },

  /* ---------------- baking ---------------- */
  bakeAll() {
    const sz = this.W * CONFIG.TILE;
    if (!this.bakeCv) { this.bakeCv = document.createElement('canvas'); this.bakeCv.width = sz; this.bakeCv.height = sz; }
    const x = this.bakeCv.getContext('2d');
    x.imageSmoothingEnabled = false;
    for (let ty = 0; ty < this.H; ty++)
      for (let tx = 0; tx < this.W; tx++)
        this.bakeTileCtx(x, tx, ty);
  },

  bakeTileCtx(x, tx, ty) {
    const T16 = CONFIG.TILE, i = this.idx(tx, ty), px = tx * T16, py = ty * T16;
    const t = this.t[i];
    if (t === T.WATER) {
      x.drawImage(Art.s.water, px, py);
      // foam against land neighbors
      x.fillStyle = PAL.water[2];
      const n = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dx, dy] of n) {
        if (!this.inB(tx + dx, ty + dy)) continue;
        const nt = this.t[this.idx(tx + dx, ty + dy)];
        if (nt === T.WATER) continue;
        if (dy === -1) x.fillRect(px, py, T16, 2);
        else if (dy === 1) x.fillRect(px, py + T16 - 2, T16, 2);
        else if (dx === -1) x.fillRect(px, py, 2, T16);
        else x.fillRect(px + T16 - 2, py, 2, T16);
      }
      return;
    }
    const v = (U.hash2(tx, ty) * 4) | 0;
    if (t === T.GRASS) x.drawImage(Art.s['g' + v], px, py);
    else if (t === T.DIRT) x.drawImage(Art.s.dirt, px, py);
    else if (t === T.ROAD) x.drawImage(Art.s['road' + (v % 2)], px, py);
    else if (t === T.SAND) x.drawImage(Art.s.sand, px, py);
  },

  bakeTile(tx, ty) {
    if (!this.bakeCv || !this.inB(tx, ty)) return;
    const x = this.bakeCv.getContext('2d');
    x.imageSmoothingEnabled = false;
    this.bakeTileCtx(x, tx, ty);
    // rebake water neighbors so foam stays right
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = tx + dx, ny = ty + dy;
      if (this.inB(nx, ny) && this.t[this.idx(nx, ny)] === T.WATER) this.bakeTileCtx(x, nx, ny);
    }
  },

  /* ---------------- queries ---------------- */
  tileT(tx, ty) { return this.inB(tx, ty) ? this.t[this.idx(tx, ty)] : T.WATER; },
  objAt(tx, ty) { return this.inB(tx, ty) ? this.obj[this.idx(tx, ty)] : OBJ.NONE; },
  amtAt(tx, ty) { return this.inB(tx, ty) ? this.amt[this.idx(tx, ty)] : 0; },
  bldAt(tx, ty) {
    if (!this.inB(tx, ty)) return null;
    const id = this.occ[this.idx(tx, ty)];
    return id ? Buildings.byId(id) : null;
  },

  setObj(tx, ty, o, amt) {
    if (!this.inB(tx, ty)) return;
    const i = this.idx(tx, ty);
    this.obj[i] = o; this.amt[i] = amt || 0;
  },

  // depleted → regrowth scheduling; returns a bonus tag for the caller
  deplete(tx, ty) {
    const i = this.idx(tx, ty), o = this.obj[i];
    this.amt[i] = 0;
    let bonus = null;
    if (o === OBJ.TREE || o === OBJ.PINE) {
      this.obj[i] = OBJ.STUMP;
      G.regrow.set(i, { t: 150 + Math.random() * 60, kind: o });   // stump → sapling → tree
    } else if (o === OBJ.BUSH) {
      G.regrow.set(i, { t: 170 + Math.random() * 50, kind: OBJ.BUSH });
    } else if (o === OBJ.HERB) {
      G.regrow.set(i, { t: CONFIG.HERB.regrow, kind: OBJ.HERB });
    } else if (o === OBJ.CRYSTAL) {
      this.obj[i] = OBJ.NONE;
      bonus = 'crystal';
    } else if (o === OBJ.RUIN) {
      this.obj[i] = OBJ.NONE;
      bonus = 'ruin';
    } else if (o === OBJ.ROCK || o === OBJ.DEADTREE) {
      this.obj[i] = OBJ.NONE; // exhausted
    }
    return bonus;
  },

  // walkability for pathing/movement. opts: {monster, phase}
  walkable(tx, ty, opts) {
    if (!this.inB(tx, ty)) return false;
    const i = this.idx(tx, ty);
    if (this.t[i] === T.WATER) return false;
    const o = this.obj[i];
    if (o === OBJ.TREE || o === OBJ.PINE || o === OBJ.ROCK || o === OBJ.RUIN || o === OBJ.CRYSTAL || o === OBJ.DEADTREE || o === OBJ.GRAVE) return false;
    if (opts && opts.phase) return true; // wraiths drift through walls
    const id = this.occ[i];
    if (id && !(opts && opts.phase)) {
      const b = Buildings.byId(id);
      if (b && b.built) {
        if (b.def.kind === 'trap') return !!(opts && opts.monster); // monsters stride onto spikes
        if (b.def.kind === 'gate' && !(opts && opts.monster)) return true;
        return false;
      }
      // construction sites are passable
      return true;
    }
    return true;
  },

  // movement cost for A*. monsters treat solid buildings as pricey breakables.
  cost(tx, ty, monster, phase) {
    if (!this.inB(tx, ty)) return Infinity;
    const i = this.idx(tx, ty);
    if (this.t[i] === T.WATER) return Infinity;
    const o = this.obj[i];
    let c = this.t[i] === T.ROAD ? 0.72 : this.t[i] === T.SAND ? 1.15 : 1;
    if (o === OBJ.TREE || o === OBJ.PINE || o === OBJ.ROCK || o === OBJ.RUIN || o === OBJ.CRYSTAL || o === OBJ.DEADTREE || o === OBJ.GRAVE) return Infinity;
    const id = this.occ[i];
    if (id && !phase) {
      const b = Buildings.byId(id);
      if (b && b.built) {
        if (b.def.kind === 'trap') return monster ? 1 : Infinity; // spikes are walked over
        if (b.def.kind === 'gate') return monster ? 22 : 0.8;
        if (monster) return 24 + b.hp / 60;  // will have to break it
        return Infinity;
      }
      return 1.4; // site
    }
    return c;
  },

  // spiral out from (tx,ty) to find nearest matching object tile
  findNearestObj(tx, ty, types, maxR) {
    tx |= 0; ty |= 0;
    const cands = [];
    for (let r = 1; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = tx + dx, y = ty + dy;
          if (!this.inB(x, y)) continue;
          const i = this.idx(x, y);
          const o = this.obj[i];
          if (types.includes(o)) {
            const needsAmt = o === OBJ.BUSH || o === OBJ.HERB;
            if (needsAmt && this.amt[i] <= 0) continue;
            cands.push({ x, y, i, d: r });
          }
        }
      }
      if (cands.length) {
        // prefer closest few but randomize among them so workers spread out
        cands.sort((a, b) => a.d - b.d);
        const top = cands.slice(0, Math.min(4, cands.length));
        return U.choice(top);
      }
    }
    return null;
  },

  // random walkable edge point; pass an array of sides (0=N,1=S,2=W,3=E) to focus spawns
  edgePoint(sideSel) {
    const pick = s => {
      let x, y;
      if (s === 0) { x = U.irnd(4, this.W - 5); y = 2; }
      else if (s === 1) { x = U.irnd(4, this.W - 5); y = this.H - 3; }
      else if (s === 2) { x = 2; y = U.irnd(4, this.H - 5); }
      else { x = this.W - 3; y = U.irnd(4, this.H - 5); }
      return { x, y };
    };
    const sides = sideSel || [0, 1, 2, 3];
    for (let tries = 0; tries < 80; tries++) {
      const p = pick(U.choice(sides));
      if (this.walkable(p.x, p.y)) return { x: p.x + 0.5, y: p.y + 0.5 };
    }
    return { x: this.W / 2, y: 1.5 };
  },
};
