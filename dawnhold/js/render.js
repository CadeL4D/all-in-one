'use strict';
/* ============================================================
   Dawnhold — render.js
   Canvas renderer: camera, y-sorted world, water shimmer,
   fireflies, night lighting (dark overlay with light holes),
   effects, placement ghosts, minimap.
   ============================================================ */

const Render = {
  cv: null, ctx: null, lightCv: null, lctx: null,
  cw: 0, ch: 0, dpr: 1,
  fireflies: [], _mmT: 0, _t: 0,

  init() {
    this.cv = document.getElementById('game');
    this.ctx = this.cv.getContext('2d');
    this.lightCv = document.createElement('canvas');
    this.lctx = this.lightCv.getContext('2d');
    this.resize();
  },

  resize() {
    const vv = window.visualViewport;
    this.cw = Math.round(vv ? vv.width : window.innerWidth);
    this.ch = Math.round(vv ? vv.height : window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(this.cw * this.dpr);
    this.cv.height = Math.round(this.ch * this.dpr);
    this.lightCv.width = this.cv.width;
    this.lightCv.height = this.cv.height;
    this.ctx.imageSmoothingEnabled = false;
  },

  worldToScreen(wx, wy) {
    return {
      x: (wx - G.cam.x) * G.cam.z + this.cw / 2,
      y: (wy - G.cam.y) * G.cam.z + this.ch / 2,
    };
  },
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.cw / 2) / G.cam.z + G.cam.x,
      y: (sy - this.ch / 2) / G.cam.z + G.cam.y,
    };
  },

  clampCam() {
    const mw = World.W * CONFIG.TILE, mh = World.H * CONFIG.TILE;
    const vw = this.cw / G.cam.z / 2, vh = this.ch / G.cam.z / 2;
    G.cam.x = U.clamp(G.cam.x, Math.min(vw, mw / 2), Math.max(mw - vw, mw / 2));
    G.cam.y = U.clamp(G.cam.y, Math.min(vh, mh / 2), Math.max(mh - vh, mh / 2));
  },

  frame(dt) {
    this._t += dt;
    const ctx = this.ctx;
    // camera follow
    if (G.follow) { G.cam.x = U.lerp(G.cam.x, G.follow.x * 16, Math.min(1, dt * 5)); G.cam.y = U.lerp(G.cam.y, G.follow.y * 16, Math.min(1, dt * 5)); }
    this.clampCam();
    const shX = G.shake > 0 ? (Math.random() - .5) * G.shake : 0;
    const shY = G.shake > 0 ? (Math.random() - .5) * G.shake : 0;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0c0e14';
    ctx.fillRect(0, 0, this.cw, this.ch);

    ctx.translate(this.cw / 2 + shX, this.ch / 2 + shY);
    ctx.scale(G.cam.z, G.cam.z);
    ctx.translate(-G.cam.x, -G.cam.y);

    // visible tile range
    const z = G.cam.z;
    const x0 = Math.max(0, ((G.cam.x - this.cw / 2 / z) / 16 | 0) - 1);
    const y0 = Math.max(0, ((G.cam.y - this.ch / 2 / z) / 16 | 0) - 1);
    const x1 = Math.min(World.W - 1, ((G.cam.x + this.cw / 2 / z) / 16 | 0) + 2);
    const y1 = Math.min(World.H - 1, ((G.cam.y + this.ch / 2 / z) / 16 | 0) + 3);

    ctx.drawImage(World.bakeCv, 0, 0);
    this.waterSparkle(x0, y0, x1, y1);

    // ---- gather y-sorted drawables ----
    const draws = [];
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const oi = World.idx(tx, ty);
        const o = World.obj[oi];
        if (!o || o === OBJ.FLOWER || o === OBJ.MUSH || o === OBJ.TGRASS) continue;
        let spr = null;
        const h = U.hash2(tx, ty);
        switch (o) {
          case OBJ.TREE: spr = Art.s['tree' + ((h * 2) | 0)]; break;
          case OBJ.PINE: spr = Art.s['pine' + ((h * 2) | 0)]; break;
          case OBJ.BIRCH: spr = Art.s['birch' + ((h * 2) | 0)]; break;
          case OBJ.DEADTREE: spr = Art.s.deadtree; break;
          case OBJ.BUSH: spr = World.amt[oi] > 0 ? Art.s.bushF : Art.s.bushE; break;
          case OBJ.HERB: spr = World.amt[oi] > 0 ? Art.s.herbF : Art.s.herbE; break;
          case OBJ.ROCK: spr = h < .22 ? Art.s.rockS : Art.s['rock' + ((h * 2) | 0)]; break;
          case OBJ.RUIN: spr = Art.s.ruin; break;
          case OBJ.CRYSTAL: spr = Art.s.crystal; break;
          case OBJ.STUMP: spr = Art.s.stump; break;
          case OBJ.SAPLING: spr = Art.s.sapling; break;
          case OBJ.GRAVE: spr = Art.s.grave; break;
        }
        if (spr) {
          const py = (ty + 1) * 16 - spr.height;
          draws.push({ y: ty * 16 + 16, fn: () => ctx.drawImage(spr, tx * 16, py) });
        }
      }
      // flat decor drawn directly (no y-sort needed)
      for (let tx = x0; tx <= x1; tx++) {
        const o = World.obj[World.idx(tx, ty)];
        if (o === OBJ.FLOWER || o === OBJ.MUSH || o === OBJ.TGRASS) {
          const spr = o === OBJ.MUSH ? Art.s.mush : o === OBJ.TGRASS ? Art.s['tgrass' + ((U.hash2(tx, ty) * 2) | 0)] : Art.s['flw' + ((U.hash2(tx, ty) * 2) | 0)];
          ctx.drawImage(spr, tx * 16, ty * 16);
        }
      }
    }

    // buildings
    for (const b of G.buildings) {
      if (b.x > x1 || b.y > y1 || b.x + b.w < x0 || b.y + b.h < y0) continue;
      draws.push({ y: (b.y + b.h) * 16, fn: () => this.drawBuilding(ctx, b) });
    }
    // villagers
    for (const v of G.villagers) {
      if (v.x * 16 < (x0 - 2) * 16 || v.x * 16 > (x1 + 2) * 16 || v.y * 16 < (y0 - 2) * 16 || v.y * 16 > (y1 + 2) * 16) continue;
      draws.push({ y: v.y * 16, fn: () => this.drawVillager(ctx, v) });
    }
    // monsters
    for (const m of G.monsters) {
      if (m.x * 16 < (x0 - 3) * 16 || m.x * 16 > (x1 + 3) * 16 || m.y * 16 < (y0 - 3) * 16 || m.y * 16 > (y1 + 3) * 16) continue;
      draws.push({ y: m.y * 16, fn: () => this.drawMonster(ctx, m) });
    }

    draws.sort((a, b) => a.y - b.y);
    for (const d of draws) d.fn();

    this.drawClearMarks(ctx, x0, y0, x1, y1);
    this.drawEffects(ctx);
    this.drawGhost(ctx, x0, y0, x1, y1);

    // ---- screen-space passes ----
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.lighting(shX, shY);
    this.drawFloaters(shX, shY);
  },

  waterSparkle(x0, y0, x1, y1) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(200,230,255,.5)';
    const tf = (this._t * 1.5) | 0;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const i = World.idx(tx, ty);
        if (World.t[i] !== T.WATER) continue;
        const h = U.hash2(tx + tf, ty);
        if (h < .16) {
          const px = tx * 16 + ((U.hash2(tx, ty + tf) * 13) | 0) + 1;
          const py = ty * 16 + ((h * 60) | 0) % 15;
          ctx.fillRect(px, py, 2, 1);
        }
      }
    }
  },

  drawBuilding(ctx, b) {
    const px = b.x * 16, py = (b.y + b.h) * 16; // anchor bottom of footprint
    let spr;
    const animF = ((this._t * 5) | 0) % 2;
    if (b.key === 'farm') {
      const st = b.growth >= 1 ? 3 : b.growth > .55 ? 2 : b.growth > .18 ? 1 : 0;
      spr = Art.s['farm' + st];
    } else if (b.key === 'torch') spr = Art.s['torch' + animF];
    else if (b.key === 'lair') spr = Art.s['lair' + animF];
    else if (b.key === 'windmill') spr = Art.s['windmill' + animF];
    else if (b.key === 'herbalistHut') spr = Art.s.herbalist;
    else spr = Art.s[b.key];

    if (!b.built) {
      // scaffold tiling + phantom building
      ctx.globalAlpha = 0.85;
      for (let dy = 0; dy < b.h; dy++)
        for (let dx = 0; dx < b.w; dx++) ctx.drawImage(Art.s.site, (b.x + dx) * 16, (b.y + dy) * 16);
      ctx.globalAlpha = 0.45;
      if (spr && spr.height > b.h * 16) ctx.drawImage(spr, px, py - spr.height);
      else if (spr) ctx.drawImage(spr, px, py - b.h * 16);
      ctx.globalAlpha = 1;
      // progress bar
      const bw = b.w * 16 - 4;
      ctx.fillStyle = '#0d0f15';
      ctx.fillRect(px + 2, py - b.h * 16 - 4, bw, 3);
      ctx.fillStyle = '#6fb3e0';
      ctx.fillRect(px + 2, py - b.h * 16 - 4, bw * b.progress, 3);
      return;
    }
    if (b.demo) {
      // being torn down — faded building with a red de-progress bar
      if (spr) {
        const hgt = spr.height > b.h * 16 ? spr.height : b.h * 16;
        ctx.globalAlpha = 0.55;
        ctx.drawImage(spr, px, py - hgt);
        ctx.globalAlpha = 1;
      }
      const bw = b.w * 16 - 4;
      ctx.fillStyle = '#0d0f15';
      ctx.fillRect(px + 2, py - b.h * 16 - 4, bw, 3);
      ctx.fillStyle = '#e05555';
      ctx.fillRect(px + 2, py - b.h * 16 - 4, bw * b.progress, 3);
      return;
    }
    if (spr) {
      const hgt = spr.height > b.h * 16 ? spr.height : b.h * 16;
      ctx.drawImage(spr, px, py - hgt);
    }
    if (b.key === 'beacon' && b.lit) {
      const f = Art.s['beaconF' + (((this._t * 5) | 0) % 2)];
      if (f) ctx.drawImage(f, px, py - 72);
    }
    // damage cracks/health bar
    if (b.hp < b.maxHp - 1) {
      const ratio = U.clamp(b.hp / b.maxHp, 0, 1);
      const bw = b.w * 16 - 4;
      ctx.fillStyle = 'rgba(13,15,21,.8)';
      ctx.fillRect(px + 2, py - b.h * 16 - 3, bw, 2.5);
      ctx.fillStyle = ratio > .5 ? '#7dc95e' : ratio > .25 ? '#e8a94b' : '#e05555';
      ctx.fillRect(px + 2, py - b.h * 16 - 3, bw * ratio, 2.5);
    }
  },

  drawVillager(ctx, v) {
    const px = v.x * 16 - 8, py = v.y * 16 - 14;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(v.x * 16, v.y * 16 + 1, 5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    const frame = v.path && v.pi < v.path.length ? 1 + ((v.anim | 0) % 2) : 0;
    const spr = Art.villager(v.look, frame);
    ctx.drawImage(spr, px | 0, py | 0);
    // carry icon
    if (v.carry.amt > 0) {
      const ic = v.carry.type === 'wood' ? Art.s.carryWood : v.carry.type === 'stone' ? Art.s.carryStone : v.carry.type === 'herbs' ? Art.s.carryHerb : Art.s.carryFood;
      ctx.drawImage(ic, (v.x * 16 - 3) | 0, (v.y * 16 - 24) | 0);
    }
    // hp
    if (v.hp < v.maxHp - 1) {
      const ratio = U.clamp(v.hp / v.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(13,15,21,.8)';
      ctx.fillRect(px + 2, py - 4, 12, 2);
      ctx.fillStyle = ratio > .4 ? '#7dc95e' : '#e05555';
      ctx.fillRect(px + 2, py - 4, 12 * ratio, 2);
    }
    // hunger pip
    if (v.hunger > 85) {
      ctx.fillStyle = '#e8a94b';
      ctx.fillRect(px + 7, py - 8, 2, 3);
    }
    if (G.sel && G.sel.kind === 'v' && G.sel.ref === v) {
      ctx.strokeStyle = '#ffe9a0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(v.x * 16, v.y * 16, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
  },

  drawMonster(ctx, m) {
    const big = m.type === 'lord' || m.type === 'colossus';
    const spr = Art.monster(m.type, ((m.anim | 0) % 2));
    if (!spr) return;
    const bob = (m.type === 'shade' || m.type === 'lord' || m.type === 'wraith') ? Math.sin(this._t * 3 + m.id) * (m.type === 'wraith' ? 2.4 : 1.6) : 0;
    const px = m.x * 16 - spr.width / 2, py = m.y * 16 - spr.height + 2 + bob;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(m.x * 16, m.y * 16 + 1, big ? 9 : 5, big ? 4 : 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (m.type === 'wraith') ctx.globalAlpha = 0.8;
    ctx.drawImage(spr, px | 0, py | 0);
    ctx.globalAlpha = 1;
    if (m.frozenT > 0) {
      ctx.globalAlpha = .45;
      ctx.fillStyle = '#9ad4f0';
      ctx.fillRect(px | 0, py | 0, spr.width, spr.height);
      ctx.globalAlpha = 1;
    }
    if (m.flash > 0) {
      m.flash -= 0.016;
      ctx.globalAlpha = Math.min(.7, m.flash * 6);
      ctx.fillStyle = '#fff';
      ctx.fillRect(px | 0, py | 0, spr.width, spr.height);
      ctx.globalAlpha = 1;
    }
    if (m.hp < m.maxHp && !big) {
      const ratio = U.clamp(m.hp / m.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(13,15,21,.8)';
      ctx.fillRect(px + 1, py - 3, spr.width - 2, 2);
      ctx.fillStyle = '#e05555';
      ctx.fillRect(px + 1, py - 3, (spr.width - 2) * ratio, 2);
    }
    if (G.sel && G.sel.kind === 'm' && G.sel.ref === m) {
      ctx.strokeStyle = '#ff8a8a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(m.x * 16, m.y * 16, big ? 12 : 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  },

  drawEffects(ctx) {
    for (const e of G.effects) {
      const p = e.t / e.dur;
      switch (e.type) {
        case 'spark': {
          const spr = Art.s.spark;
          ctx.globalAlpha = 1 - p;
          ctx.drawImage(spr, (e.x * 16 - 2) | 0, (e.y * 16 - p * 8) | 0);
          ctx.globalAlpha = 1;
          break;
        }
        case 'flame': {
          const spr = Art.s['flame' + (((e.t * 10) | 0) % 3)];
          ctx.globalAlpha = 1 - p * .7;
          ctx.drawImage(spr, (e.x * 16 - 3) | 0, (e.y * 16 - 6 - p * 6) | 0);
          ctx.globalAlpha = 1;
          break;
        }
        case 'smoke': {
          const spr = Art.s.smoke;
          ctx.globalAlpha = (1 - p) * .6;
          for (let i = 0; i < 3; i++) ctx.drawImage(spr, (e.x * 16 - 12 + i * 10) | 0, (e.y * 16 - 10 - p * 14 + i * 3) | 0);
          ctx.globalAlpha = 1;
          break;
        }
        case 'arrow': {
          const ax = U.lerp(e.x, e.tx, p), ay = U.lerp(e.y, e.ty, p) - Math.sin(p * Math.PI) * .5;
          ctx.drawImage(Art.s.arrow, (ax * 16 - 4) | 0, (ay * 16) | 0);
          break;
        }
        case 'bone': {
          const ax = U.lerp(e.x, e.tx, p), ay = U.lerp(e.y, e.ty, p) - Math.sin(p * Math.PI) * .9;
          ctx.drawImage(Art.s.bone, (ax * 16 - 3) | 0, (ay * 16 - 1) | 0);
          break;
        }
        case 'ring': {
          ctx.strokeStyle = e.col || '#fff';
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 1 - p;
          ctx.beginPath();
          ctx.arc(e.x * 16, e.y * 16, (e.r ? e.r : 1) * 16 * (0.3 + p * 0.9), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'meteor': {
          if (p < .55) {
            const fall = p / .55;
            const mx = e.x, my = e.y - (1 - fall) * 14;
            ctx.drawImage(Art.s.meteor, (mx * 16 - 3) | 0, (my * 16 - 3) | 0);
            ctx.strokeStyle = 'rgba(255,150,40,.6)';
            ctx.beginPath(); ctx.moveTo(mx * 16, my * 16 - 20); ctx.lineTo(mx * 16, my * 16 - 4); ctx.stroke();
            // target marker
            ctx.strokeStyle = 'rgba(255,120,40,.5)';
            ctx.beginPath(); ctx.arc(e.x * 16, e.y * 16, (CONFIG.POWERS.meteor.r) * 16 * .9, 0, Math.PI * 2); ctx.stroke();
          }
          break;
        }
        case 'corpse': {
          ctx.globalAlpha = (1 - p) * .9;
          const spr = Art.villager(e.look, 0);
          ctx.save();
          ctx.translate(e.x * 16, e.y * 16);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(spr, -8, -8);
          ctx.restore();
          ctx.globalAlpha = 1;
          break;
        }
      }
    }
  },

  drawGhost(ctx, x0, y0, x1, y1) {
    const mode = UI.mode;
    if (!mode || !UI.ghost) return;
    const gx = UI.ghost.x, gy = UI.ghost.y; // tile ints
    if (mode.type === 'build') {
      const def = BUILD[mode.key];
      if (!def) return;
      const chk = Buildings.canPlace(mode.key, gx, gy);
      const ok = chk.ok && Buildings.afford(mode.key);
      for (let dy = 0; dy < def.h; dy++)
        for (let dx = 0; dx < def.w; dx++) {
          ctx.fillStyle = ok ? 'rgba(120,220,110,.30)' : 'rgba(230,80,80,.30)';
          ctx.fillRect((gx + dx) * 16, (gy + dy) * 16, 16, 16);
          ctx.strokeStyle = ok ? 'rgba(150,255,140,.8)' : 'rgba(255,110,110,.8)';
          ctx.lineWidth = 1;
          ctx.strokeRect((gx + dx) * 16 + .5, (gy + dy) * 16 + .5, 15, 15);
        }
      if (ok && !def.terrain) {
        ctx.globalAlpha = .6;
        const GHOST_SPR = { farm: 'farm0', windmill: 'windmill0', torch: 'torch0', herbalistHut: 'herbalist', road: 'road0' };
        const spr = Art.s[GHOST_SPR[mode.key] || mode.key];
        if (spr) {
          const hgt = Math.max(spr.height, def.h * 16);
          ctx.drawImage(spr, gx * 16, (gy + def.h) * 16 - hgt);
        }
        ctx.globalAlpha = 1;
      }
    } else if (mode.type === 'power') {
      const p = POWERS[mode.key];
      if (p && p.target === 'area') {
        ctx.strokeStyle = 'rgba(220,160,255,.9)';
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc((gx + .5) * 16, (gy + .5) * 16, p.r * 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (mode.type === 'demolish') {
      ctx.strokeStyle = 'rgba(255,110,110,.9)';
      ctx.strokeRect(gx * 16 + .5, gy * 16 + .5, 15, 15);
    } else if (mode.type === 'clear') {
      ctx.strokeStyle = 'rgba(150,255,140,.9)';
      ctx.strokeRect(gx * 16 + .5, gy * 16 + .5, 15, 15);
    }
  },

  // amber X over tiles queued for clearing
  drawClearMarks(ctx, x0, y0, x1, y1) {
    if (!G.clearJobs || !G.clearJobs.length) return;
    ctx.lineWidth = 2;
    for (const t of G.clearJobs) {
      if (t.x < x0 - 1 || t.x > x1 + 1 || t.y < y0 - 1 || t.y > y1 + 1) continue;
      const px = t.x * 16, py = t.y * 16;
      ctx.strokeStyle = t.water ? 'rgba(133,183,222,.95)' : 'rgba(255,196,107,.95)';
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 4); ctx.lineTo(px + 12, py + 12);
      ctx.moveTo(px + 12, py + 4); ctx.lineTo(px + 4, py + 12);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  },

  lighting(shX, shY) {
    const ctx = this.ctx;
    const dark = darknessLevel();
    const warm = (G.phase === 'dusk' ? G.time / CONFIG.TRANS : G.phase === 'dawn' ? 1 - G.time / CONFIG.TRANS : 0);

    if (dark > 0.02) {
      const lc = this.lightCv, lx = this.lctx;
      lx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      lx.globalCompositeOperation = 'source-over';
      lx.clearRect(0, 0, this.cw, this.ch);
      lx.fillStyle = `rgba(8,10,32,${dark})`;
      lx.fillRect(0, 0, this.cw, this.ch);
      lx.globalCompositeOperation = 'destination-out';

      const hole = (wx, wy, r, a) => { // wx, wy in tile units
        const s = this.worldToScreen(wx * 16, wy * 16);
        const rr = r * 16 * G.cam.z;
        if (s.x < -rr || s.y < -rr || s.x > this.cw + rr || s.y > this.ch + rr) return;
        const g = lx.createRadialGradient(s.x, s.y, rr * 0.15, s.x, s.y, rr);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lx.fillStyle = g;
        lx.beginPath(); lx.arc(s.x, s.y, rr, 0, Math.PI * 2); lx.fill();
      };
      // building lights
      for (const b of G.buildings) {
        if (!b.built) continue;
        let r = b.def.light;
        if (!r) continue;
        if (b.key === 'torch') r = 3.4 + Math.sin(this._t * 7 + b.id) * .12;
        hole(b.x + b.w / 2, b.y + b.h / 2 - (b.def.tall || 0) / 32, r, 0.92);
      }
      if (G.beaconLit) {
        const b = G.buildings.find(bb => bb.key === 'beacon' && bb.built);
        if (b) hole(b.x + 1.5, b.y + .8, 15 + Math.sin(this._t * 3) * .8, 0.98);
      }
      // burning monsters glow faintly
      for (const m of G.monsters) if (m.burning > 0) hole(m.x, m.y, 1.2, 0.5);
      for (const e of G.effects) if (e.type === 'flame') hole(e.x, e.y, 1.6, 0.6);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(lc, 0, 0);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      // warm additive glow on top of the carved light holes
      ctx.globalCompositeOperation = 'lighter';
      const warmGlow = (wx, wy, r) => {
        const s = this.worldToScreen(wx * 16, wy * 16);
        const rr = r * 16 * G.cam.z;
        if (s.x < -rr || s.y < -rr || s.x > this.cw + rr || s.y > this.ch + rr) return;
        const g = ctx.createRadialGradient(s.x, s.y, rr * 0.1, s.x, s.y, rr);
        g.addColorStop(0, 'rgba(255,180,80,0.13)');
        g.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, Math.PI * 2); ctx.fill();
      };
      for (const b of G.buildings) {
        if (!b.built || !b.def.light) continue;
        warmGlow(b.x + b.w / 2, b.y + b.h / 2 - (b.def.tall || 0) / 32, b.key === 'torch' ? 2.2 : b.def.light * 0.8);
      }
      if (G.beaconLit) {
        const b = G.buildings.find(bb => bb.key === 'beacon' && bb.built);
        if (b) warmGlow(b.x + 1.5, b.y + 0.8, 11);
      }
      ctx.globalCompositeOperation = 'source-over';
      this.firefliesDraw();
    }
    if (dark > 0.02 && G.bloodMoon) {
      ctx.fillStyle = `rgba(160,30,40,${0.16 * dark})`;
      ctx.fillRect(0, 0, this.cw, this.ch);
    }
    if (warm > 0.02) {
      ctx.fillStyle = `rgba(255,140,50,${warm * 0.14})`;
      ctx.fillRect(0, 0, this.cw, this.ch);
    }
  },

  firefliesDraw() {
    const ctx = this.ctx;
    const want = G.settings.fx ? 16 : 6;
    while (this.fireflies.length < want) {
      this.fireflies.push({
        x: Math.random() * World.W, y: Math.random() * World.H,
        vx: 0, vy: 0, ph: Math.random() * 6,
      });
    }
    while (this.fireflies.length > want) this.fireflies.pop();
    for (const f of this.fireflies) {
      f.ph += 0.03;
      f.vx += (Math.random() - .5) * .02; f.vy += (Math.random() - .5) * .02;
      f.vx = U.clamp(f.vx, -.06, .06); f.vy = U.clamp(f.vy, -.06, .06);
      f.x += f.vx; f.y += f.vy;
      if (f.x < 2 || f.x > World.W - 2) f.vx *= -1;
      if (f.y < 2 || f.y > World.H - 2) f.vy *= -1;
      const a = 0.35 + Math.sin(f.ph) * 0.3;
      if (a <= 0.05) continue;
      const s = this.worldToScreen(f.x * 16, f.y * 16);
      ctx.fillStyle = `rgba(220,255,140,${a})`;
      ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
      ctx.fillStyle = `rgba(200,240,120,${a * 0.35})`;
      ctx.fillRect(s.x - 2.5, s.y - 2.5, 5, 5);
    }
  },

  drawFloaters(shX, shY) {
    const ctx = this.ctx;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    for (const f of G.floaters) {
      const s = this.worldToScreen(f.x * 16, f.y * 16);
      const rise = f.t * 18;
      ctx.globalAlpha = U.clamp(1.4 - f.t, 0, 1);
      ctx.fillStyle = '#000';
      ctx.fillText(f.text, s.x + 1, s.y - rise + 1);
      ctx.fillStyle = f.col;
      ctx.fillText(f.text, s.x, s.y - rise);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  },

  /* -------- minimap -------- */
  minimap(dt) {
    this._mmT -= dt;
    if (this._mmT > 0) return;
    this._mmT = 0.3;
    const cv = document.getElementById('minimap');
    if (!cv) return;
    const x = cv.getContext('2d');
    const W = World.W, H = World.H;
    const img = x.createImageData(W, H);
    const d = img.data;
    const MM = Art.MM;
    const col = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const cGrass = col(MM.grass), cWater = col(MM.water), cTree = col(MM.tree), cRoad = col(MM.road), cRock = col(MM.rock), cDirt = col(MM.dirt), cSand = col(MM.sand);
    for (let i = 0; i < W * H; i++) {
      let c = cGrass;
      const t = World.t[i], o = World.obj[i];
      if (t === T.WATER) c = cWater;
      else if (t === T.ROAD) c = cRoad;
      else if (t === T.SAND) c = cSand;
      else if (t === T.DIRT) c = cDirt;
      else if (o === OBJ.TREE || o === OBJ.PINE || o === OBJ.BIRCH || o === OBJ.SAPLING) c = cTree;
      else if (o === OBJ.ROCK || o === OBJ.RUIN) c = cRock;
      else if (o === OBJ.CRYSTAL) c = [140, 92, 208];
      d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
    }
    // buildings (lairs glow purple)
    for (const b of G.buildings) {
      const cc = b.key === 'lair' ? [180, 110, 240] : col(MM.bld);
      for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) {
        const i = (b.y + dy) * W + (b.x + dx);
        if (i >= 0 && i < W * H) { d[i * 4] = cc[0]; d[i * 4 + 1] = cc[1]; d[i * 4 + 2] = cc[2]; }
      }
    }
    x.putImageData(img, 0, 0);
    // lairs get a hot-pink 3px cross so they never blend into crystal purple
    x.fillStyle = '#ff6ae0';
    for (const b of G.buildings) {
      if (b.key !== 'lair') continue;
      x.fillRect(b.x - 1, b.y, 3, 1);
      x.fillRect(b.x, b.y - 1, 1, 3);
    }
    // entities as dots (crisper on top)
    x.fillStyle = '#fff';
    for (const v of G.villagers) x.fillRect(v.x | 0, v.y | 0, 1, 1);
    x.fillStyle = '#ff6060';
    for (const m of G.monsters) x.fillRect((m.x | 0) - (m.type === 'lord' ? 1 : 0), (m.y | 0) - (m.type === 'lord' ? 1 : 0), m.type === 'lord' ? 3 : 1, m.type === 'lord' ? 3 : 1);
    // viewport rect
    const z = G.cam.z;
    const vw = this.cw / z / 16, vh = this.ch / z / 16;
    x.strokeStyle = 'rgba(255,255,255,.7)';
    x.lineWidth = 1;
    x.strokeRect(G.cam.x / 16 - vw / 2, G.cam.y / 16 - vh / 2, vw, vh);
  },
};
