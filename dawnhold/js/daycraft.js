'use strict';
/* ============================================================
   Dawnhold — daycraft.js
   The Daycraft bench (v1.5): the guardian lends a hand.

   Six WARM HANDS a day (a small hand-meter by the dock). Each
   session is a few seconds of touch-work at a ready worksite —
   the world keeps simulating while you play, every payoff is a
   stock the village already tracks, and a player who never
   touches the bench loses nothing.

   The Chop    (trees)      split logs on the swing's sweet band
   The Line    (dock)       hook the dip, land the silver
   The Fault   (boulders)   trace the glowing crack, split clean
   The Comb    (bushes)     circle the bush, dodge the thorns
   The Sickle  (ripe plots) swipe with the wind
   The Knead   (bakehouse)  tap-tap-HOLD on the dough's bounce
   The Stir    (kitchen)    keep the ladle in the swirl
   The Hammer  (smithy)     strike the instant the bar flares
   The Flight  (fletcher)   match the feather pattern
   The Brew    (tavern)     tap the bubbles as they crest
   The Dip     (oil press)  dip the wicks on the wave
   The Suture  (hospital)   trace the wound, avoid the red

   Plus THE DEEP SEAM: push-your-luck mining below a Mine Shaft.
   Each level deeper is richer, and the spinning wheel decides —
   okay, injured, or dead. An injured or dead miner can be saved
   with the rescue skill game: injured becomes okay, dead becomes
   injured.

   The interactive overlays live on their own little canvas; the
   economy (Bench.apply / Seam payouts) is DOM-free and headless-
   testable. ============================================================ */

/* -------- the seam's outcome odds (pure — tests use these) -------- */
function seamOdds(d) { // d = 0-based index of the level being attempted
  const S = CONFIG.SEAM;
  let ok = Math.max(S.okMin, S.okBase - S.okDrop * d);
  let dead = Math.min(S.deadMax, Math.max(0.01, 0.02 + 0.03 * d));
  let inj = Math.max(0.03, 1 - ok - dead);
  const tot = ok + inj + dead;
  return { ok: ok / tot, inj: inj / tot, dead: dead / tot };
}
/* -------- the seam's pay for reaching 1-based depth n -------- */
function seamPay(n) {
  const S = CONFIG.SEAM;
  return n <= S.pay.length ? S.pay[n - 1] : S.deepPay;
}

const Bench = {
  active: null,       // running session {g, s, site}
  seam: null,         // active Deep Seam session
  cvs: null, ctx: null,
  W: 320, H: 240, SC: 4, // internal canvas + big-pixel scale (80×60 grid)

  /* ================= availability ================= */
  handsLeft() { return CONFIG.BENCH.handsPerDay - (G.handsUsed || 0); },
  canPlay() { return isDayLike() && this.handsLeft() > 0; },

  // what a built building offers right now → {id, why} (why = refusal reason)
  site(b) {
    if (!b || !b.built || !isDayLike()) return null;
    const j = n => (G.jobs[n] || 0) > 0;
    const capOf = k => Buildings.capOf(k);
    switch (b.key) {
      case 'fisher':
        if (!j('fisher')) return null;
        return { id: 'line' };
      case 'kitchen':
        if (!j('cook') || G.res.food < 3 || G.res.wood < 1 || G.res.meals >= capOf('meals')) return null;
        return { id: 'stir' };
      case 'bakery':
        if (!j('baker') || G.res.flour < 2 || G.res.water < 1 || G.res.bread >= capOf('bread')) return null;
        return { id: 'knead' };
      case 'smithy':
        if (!j('smith') || G.res.wood < 2 || G.res.stone < 1 || G.res.tools >= capOf('tools')) return null;
        return { id: 'hammer' };
      case 'fletch':
        if (!j('fletcher') || G.res.wood < 2 || G.res.arrows >= capOf('arrows')) return null;
        return { id: 'flight' };
      case 'tavern':
        if (!j('brewer') || G.res.food < 2 || G.res.herbs < 1 || (G.res.ale >= capOf('ale') && G.buffs.brightAle)) return null;
        return { id: 'brew' };
      case 'press':
        return { id: 'dip' };
      case 'hospital':
        if (!j('medic') || G.res.herbs < 1 || G.buffs.suture) return null;
        return { id: 'suture' };
    }
    return null;
  },

  // what a wild object offers (tap a tree, boulder or berry bush)
  siteObj(tx, ty) {
    if (!isDayLike()) return null;
    const o = World.objAt(tx, ty);
    const j = n => (G.jobs[n] || 0) > 0;
    if ((o === OBJ.TREE || o === OBJ.PINE || o === OBJ.BIRCH) && j('lumber')) return { id: 'chop' };
    if (o === OBJ.ROCK && j('miner')) return { id: 'fault' };
    if (o === OBJ.BUSH && j('forager')) return { id: 'comb' };
    return null;
  },

  /* ================= overlay ================= */
  initDom() {
    this.cvs = document.getElementById('mgCv');
    this.ctx = this.cvs.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    const cv = this.cvs;
    const toLogical = e => {
      const r = cv.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width * (this.W / this.SC),
        y: (e.clientY - r.top) / r.height * (this.H / this.SC),
      };
    };
    const route = (type, e) => {
      e.preventDefault();
      const p = toLogical(e);
      if (this.seam) Seam.pointer(type, p.x, p.y);
      else if (this.active) {
        const g = this.active.g, s = this.active.s;
        if (g[type]) g[type](s, p.x, p.y);
      }
    };
    cv.addEventListener('pointerdown', e => { try { cv.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } route('down', e); });
    cv.addEventListener('pointermove', e => route('move', e));
    cv.addEventListener('pointerup', e => route('up', e));
    cv.addEventListener('pointercancel', e => route('up', e));
    document.getElementById('mgX').onclick = () => this.close();
  },

  show(title, hint) {
    const w = document.getElementById('mgWrap');
    document.getElementById('mgTitle').textContent = title;
    document.getElementById('mgHint').textContent = hint || '';
    document.getElementById('mgBtns').innerHTML = '';
    w.classList.remove('hidden');
    UI.selHide();
    this.drawHandsTag();
  },
  hideOverlay() { document.getElementById('mgWrap').classList.add('hidden'); },
  setHint(t) { document.getElementById('mgHint').textContent = t; },
  setBtns(list) {
    const row = document.getElementById('mgBtns');
    row.innerHTML = '';
    for (const b of list) {
      const el = document.createElement('button');
      el.textContent = b.label;
      if (b.warn) el.className = 'warn';
      el.onclick = b.fn;
      row.appendChild(el);
    }
  },
  close() {
    if (this.seam) { Seam.close(); return; }
    if (!this.active) return;
    this.active = null;
    this.hideOverlay();
  },

  drawHandsTag() {
    const el = document.getElementById('mgHands');
    if (el) el.textContent = `\u270b ${this.handsLeft()} warm hand${this.handsLeft() === 1 ? '' : 's'} left today`;
  },

  /* ================= session flow ================= */
  start(id, site) {
    const g = this.GAMES.find(x => x.id === id);
    if (!g) return false;
    if (isDayLike() && this.handsLeft() <= 0) { UI.toast('No warm hands left today — the bench rests.', ''); return false; }
    if (!isDayLike()) { UI.toast('The bench is daywork — lend a hand after dawn.', ''); return false; }
    if (g.ready && !g.ready(site, site)) { return false; } // ready() toasts its own refusal
    G.handsUsed++;
    const s = { t: 0, out: 0, done: false, msg: null };
    g.init(s, site);
    this.active = { g, s, site };
    this.show(g.name, g.hint);
    return true;
  },

  tick(dt) {
    if (this.seam) { Seam.tick(dt); return; }
    const a = this.active;
    if (!a) return;
    a.s.t += dt;
    if (a.g.tick) a.g.tick(a.s, dt);
    if (a.s.done || a.s.t >= CONFIG.BENCH.sessionT) this.finish();
  },

  finish() {
    const a = this.active;
    if (!a) return;
    this.active = null;
    const msg = a.g.apply(a.s, a.site);
    if (msg) UI.toast(msg, 'good');
    UI.updateHUD();
    this.hideOverlay();
  },

  // little world-space payoff floater above the site
  payFx(site, txt, col) {
    let x = World.center.x, y = World.center.y;
    if (site && site.b) { x = site.b.x + site.b.w / 2; y = site.b.y; }
    else if (site && site.tx !== undefined) { x = site.tx + 0.5; y = site.ty; }
    Sim.float(x, y - 0.4, txt, col || '#ffe9a0');
  },

  /* -------- the dock-side hand meter (drawn by UI.updateHUD) -------- */
  drawMeter() {
    const cv = document.getElementById('handsCv');
    if (!cv || !cv.getContext) return;
    const x = cv.getContext('2d');
    if (!x || !x.clearRect) return;
    x.clearRect(0, 0, cv.width, cv.height);
    const sun = Art.s.ic_sun;
    if (!sun) return;
    const left = this.handsLeft();
    for (let i = 0; i < CONFIG.BENCH.handsPerDay; i++) {
      x.globalAlpha = i < left ? 1 : 0.22;
      x.drawImage(sun, i * 16, 0);
    }
    x.globalAlpha = 1;
  },

  /* -------- per-frame paint of the overlay scene -------- */
  renderFrame() {
    if ((!this.active && !this.seam) || !this.ctx) return;
    const x = this.ctx;
    x.fillStyle = '#14161c';
    x.fillRect(0, 0, this.W, this.H);
    const P = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px * 4 | 0, py * 4 | 0, Math.max(1, w * 4 | 0), Math.max(1, h * 4 | 0)); };
    const C2 = (cx, cy, r, col, lw) => {
      x.beginPath();
      x.arc(cx * 4, cy * 4, Math.max(0.5, r * 4), 0, Math.PI * 2);
      if (lw) { x.strokeStyle = col; x.lineWidth = lw; x.stroke(); }
      else { x.fillStyle = col; x.fill(); }
    };
    if (this.seam) Seam.draw(x);
    else {
      const a = this.active;
      a.g.draw(a.s, x, P, C2);
      // session time bar
      const p = Math.min(1, a.s.t / CONFIG.BENCH.sessionT);
      x.fillStyle = '#33291f';
      x.fillRect(0, 0, this.W, 3);
      x.fillStyle = '#e8a94b';
      x.fillRect(0, 0, this.W * p, 3);
    }
  },

  /* ================= THE GAMES ================= */
  GAMES: [
    /* ---- The Chop — split logs on the swing's sweet band ---- */
    {
      id: 'chop', name: 'The Chop', hint: 'Tap when the needle crosses the amber band — every clean split is +1 wood.',
      init(s) {
        s.ang = 0; s.dir = 1; s.band = 0.5 + Math.random() * 0.3; s.cool = 0;
        s.hits = 0; s.chips = []; s.missT = 0;
      },
      tick(s, dt) {
        s.ang += s.dir * dt * 1.35;
        if (s.ang > 1) { s.ang = 1; s.dir = -1; }
        if (s.ang < 0) { s.ang = 0; s.dir = 1; }
        s.cool = Math.max(0, s.cool - dt);
        s.missT = Math.max(0, s.missT - dt);
        for (const c of s.chips) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 30 * dt; }
        s.chips = s.chips.filter(c => c.y < 62);
        if (s.hits >= CONFIG.BENCH.chopMax) s.done = true;
      },
      down(s) {
        if (s.cool > 0 || s.done) return;
        s.cool = 0.55;
        if (Math.abs(s.ang - s.band) < 0.09) {
          s.hits++;
          s.band = 0.35 + Math.random() * 0.5;
          s.flash = 0.25;
          for (let i = 0; i < 5; i++) s.chips.push({ x: 40 + (Math.random() - .5) * 8, y: 30, vx: (Math.random() - .5) * 26, vy: -14 - Math.random() * 12 });
        } else s.missT = 0.3;
      },
      draw(s, x, P, C2) {
        // yard backdrop
        P(0, 44, 80, 16, '#4e7a40'); P(0, 44, 80, 2, '#5a8a4a');
        for (let i = 0; i < 12; i++) P((i * 13) % 78, 46 + (i * 7) % 12, 1, 1, i % 2 ? '#659355' : '#466f3a');
        // stump
        P(28, 38, 24, 8, '#6e5136'); P(28, 36, 24, 3, '#8a6a44'); P(28, 36, 24, 1, '#a5825a');
        P(31, 37, 18, 1, '#77592f');
        // the log being split (whole → split apart as hits land)
        const half = Math.min(10, 2 + s.hits);
        P(32, 32, 16, 5, '#7c5a2e'); P(32, 32, 16, 1, '#a07840'); P(47, 33, 1, 3, '#553a20');
        if (s.hits > 0) { P(32 - (half > 6 ? 2 : 0), 32, 5, 5, '#7c5a2e'); P(51, 32, 5, 5, '#7c5a2e'); }
        for (const c of s.chips) P(c.x, c.y, 1, 1, '#c09455');
        // swing meter: arc + sweeping needle + amber band
        C2(40, 22, 13, '#241f30', 3);
        const a0 = Math.PI * 1.05, a1 = Math.PI * 1.95;
        const mid = a0 + (a1 - a0) * s.band;
        x.strokeStyle = '#e8a94b'; x.lineWidth = 5;
        x.beginPath(); x.arc(160, 88, 52, a0 + (a1 - a0) * (s.band - 0.09), a0 + (a1 - a0) * (s.band + 0.09)); x.stroke();
        const na = a0 + (a1 - a0) * s.ang;
        x.strokeStyle = s.missT > 0 ? '#e05555' : '#e8e4d8'; x.lineWidth = 3;
        x.beginPath(); x.moveTo(160, 88); x.lineTo(160 + Math.cos(na) * 46, 88 + Math.sin(na) * 46); x.stroke();
        // axe head rides the needle
        const ax = 160 + Math.cos(na) * 52, ay = 88 + Math.sin(na) * 52;
        P(ax / 4 - 2, ay / 4 - 1, 3, 3, '#c9ced9'); P(ax / 4 + 1, ay / 4, 2, 2, '#8f95a3');
        if (s.flash > 0) { s.flash -= 1 / 60; P(34, 28, 12, 2, '#ffe9a0'); }
      },
      apply(s, site) {
        if (!s.hits) return null;
        Sim.gain('wood', s.hits);
        G.stats.gathered += s.hits;
        Bench.payFx(site, `+${s.hits} wood`, '#c9964b');
        return `The Chop — ${s.hits} clean split${s.hits > 1 ? 's' : ''}: +${s.hits} wood.`;
      },
    },

    /* ---- The Line — hook the dip, land the catch ---- */
    {
      id: 'line', name: 'The Line', hint: 'Tap when the bobber dips to hook — tap again when the fish reaches the ring to land it.',
      init(s) {
        s.phase = 'wait'; s.biteT = 0.9 + Math.random() * 1.2; s.win = 0;
        s.fishX = -6; s.fishDir = 1; s.silver = false; s.spark = 0;
        s.caught = 0; s.silverCaught = 0; s.rip = 0;
      },
      tick(s, dt) {
        s.rip = Math.max(0, s.rip - dt * 2);
        s.spark = Math.max(0, s.spark - dt);
        if (s.phase === 'wait') {
          s.biteT -= dt;
          if (s.biteT <= 0) { s.phase = 'bite'; s.win = 0.62; s.silver = Math.random() < 0.13; }
        } else if (s.phase === 'bite') {
          s.win -= dt;
          if (s.win <= 0) { s.phase = 'wait'; s.biteT = 0.9 + Math.random() * 1.3; }
        } else if (s.phase === 'reel') {
          s.fishX += s.fishDir * dt * 15;
          if (s.fishX > 74 || s.fishX < 6) s.fishDir *= -1;
        }
      },
      down(s) {
        if (s.phase === 'bite') { s.phase = 'reel'; s.fishX = 6; s.fishDir = 1; }
        else if (s.phase === 'reel') {
          if (Math.abs(s.fishX - 40) < 4) {
            if (s.silver) s.silverCaught++; else s.caught++;
            s.spark = 0.4; s.rip = 1;
            s.phase = 'wait'; s.biteT = 0.8 + Math.random() * 1.2;
          } else { s.phase = 'wait'; s.biteT = 1 + Math.random(); s.rip = 0.5; } // the one that got away
        }
      },
      draw(s, x, P, C2) {
        // riverbank
        P(0, 0, 80, 14, '#4e7a40'); P(0, 12, 80, 2, '#5a8a4a');
        P(0, 14, 80, 46, '#33619a'); P(0, 14, 80, 2, '#3b6ea8');
        for (let i = 0; i < 14; i++) P((i * 17 + ((s.t * 6) | 0)) % 78, 18 + (i * 11) % 38, 2, 1, 'rgba(168,203,232,.5)');
        // dock plank
        P(6, 10, 20, 3, '#8a5f37'); P(6, 10, 20, 1, '#a07840'); P(8, 13, 2, 3, '#6e4a28'); P(22, 13, 2, 3, '#6e4a28');
        // angler silhouette
        P(10, 4, 3, 6, '#e07030'); P(10, 1, 3, 3, '#f0c8a0'); P(10, 0, 3, 1, '#3a2a1a');
        // line + bobber
        const bob = s.phase === 'bite' ? 22 : 19 + Math.sin(s.t * 3) * 1.2;
        P(24, 5, 1, bob - 5, 'rgba(232,228,216,.7)');
        P(23, bob, 3, 2, s.phase === 'bite' ? '#e05555' : '#e8e4d8');
        if (s.phase === 'bite' && (s.win * 10 | 0) % 2) P(22, bob - 2, 1, 1, '#e8e4d8'), P(26, bob - 2, 1, 1, '#e8e4d8');
        if (s.rip > 0) C2(24, bob + 1, 2 + (1 - s.rip) * 3, `rgba(200,230,255,${s.rip * 0.5})`, 1);
        // landing ring
        C2(40, 30, 4, 'rgba(255,233,160,.8)', 1);
        // the fish on the line
        if (s.phase === 'reel') {
          const fy = 30 + Math.sin(s.t * 6) * 1.5;
          P(s.fishX - 3, fy - 1, 6, 2, s.silver ? '#dce6f6' : '#6f9a5a');
          P(s.fishX + (s.fishDir > 0 ? -4 : 3), fy - 1, 1, 2, s.silver ? '#dce6f6' : '#6f9a5a');
          if (s.silver && s.spark > 0) P(s.fishX, fy - 3, 1, 1, '#fff2b0');
          P(24, 7, 1, 20, 'rgba(232,228,216,.35)');
        }
      },
      apply(s, site) {
        if (s.caught) {
          Sim.gain('food', s.caught * 2);
          Bench.payFx(site, `+${s.caught * 2} food`, '#7dc95e');
        }
        if (s.silverCaught) {
          G.res.essence = Math.min(CONFIG.ESSENCE.max, G.res.essence + s.silverCaught * 2);
          Bench.payFx(site, `+${s.silverCaught * 2} essence`, '#b48ae0');
        }
        if (!s.caught && !s.silverCaught) return null;
        const bits = [];
        if (s.caught) bits.push(`${s.caught} landed (×2 food)`);
        if (s.silverCaught) bits.push(`${s.silverCaught} dawn-silver (+${s.silverCaught * 2} essence)`);
        return 'The Line — ' + bits.join(', ') + '.';
      },
    },

    /* ---- The Fault — trace the glowing crack, split clean ---- */
    {
      id: 'fault', name: 'The Fault', hint: 'Hold and trace along the glowing crack from end to end without slipping off.',
      init(s, site) {
        s.pts = [];
        let px = 12, py = 46;
        for (let i = 0; i < 7; i++) {
          s.pts.push({ x: px, y: py });
          px += 7 + Math.random() * 5; py += (Math.random() - 0.55) * 12;
          py = Math.max(12, Math.min(52, py));
        }
        s.idx = 0; s.tracing = false; s.slipT = 0; s.splitT = 0;
      },
      tick(s, dt) { s.slipT = Math.max(0, s.slipT - dt); s.splitT = Math.max(0, s.splitT - dt); },
      down(s, x, y) {
        if (Math.hypot(x - s.pts[0].x, y - s.pts[0].y) < 5) { s.tracing = true; s.idx = 0; }
      },
      move(s, x, y) {
        if (!s.tracing || s.splitT > 0) return;
        const p = s.pts[s.idx], n = s.pts[s.idx + 1];
        if (n && Math.hypot(x - n.x, y - n.y) < 4.5) { s.idx++; if (s.idx >= s.pts.length - 1) { s.splitT = 0.5; s.tracing = false; s.done = true; } return; }
        // slipped too far off the crack line → the strike wanders
        let near = 1e9;
        for (const q of [p, n]) if (q) near = Math.min(near, Math.hypot(x - q.x, y - q.y));
        if (near > 6) { s.tracing = false; s.idx = 0; s.slipT = 0.4; }
      },
      up(s) { s.tracing = false; if (s.splitT <= 0) s.idx = 0; },
      draw(s, x, P, C2) {
        P(0, 0, 80, 60, '#3a3a44');
        for (let i = 0; i < 22; i++) P((i * 19) % 78, (i * 23) % 58, 3, 1, i % 2 ? '#42424e' : '#34343e');
        // boulder face
        C2(40, 34, 22, '#6e6e78', 0); C2(40, 34, 22, 'rgba(0,0,0,.0)', 0);
        C2(40, 34, 21, '#8d8d95', 0); C2(33, 27, 6, '#a5a5ae', 0); C2(48, 42, 5, '#6e6e78', 0);
        P(20, 12, 6, 1, '#5a7a4a'); P(52, 50, 5, 1, '#5a7a4a');
        // the crack: lit up to progress
        for (let i = 0; i < s.pts.length - 1; i++) {
          const a = s.pts[i], b = s.pts[i + 1];
          const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
          for (let k = 0; k <= steps; k++) {
            const cx = a.x + (b.x - a.x) * k / steps, cy = a.y + (b.y - a.y) * k / steps;
            const lit = i < s.idx || (i === s.idx && s.splitT > 0);
            P(cx - 0.5, cy - 0.5, 1.6, 1.6, lit ? ((k | 1) % 2 ? '#ffd977' : '#ff9a2e') : '#4a4a54');
          }
        }
        // start marker
        const p0 = s.pts[0];
        C2(p0.x, p0.y, 2.4 + (s.tracing ? Math.sin(s.t * 8) * 0.6 : 0), 'rgba(255,217,119,.9)', 1);
        if (s.slipT > 0) P(30, 6, 20, 2, '#e05555');
        if (s.splitT > 0) { P(0, 0, 80, 60, `rgba(255,240,200,${s.splitT})`); }
      },
      apply(s, site) {
        if (site && site.tx !== undefined) {
          World.amt[World.idx(site.tx, site.ty)] = (World.amtAt(site.tx, site.ty) || 0) + 1;
        }
        Sim.gain('stone', 2);
        G.stats.gathered += 2;
        Bench.payFx(site, '+2 stone', '#a5a5ae');
        return 'The Fault — split clean: +2 stone' + (site && site.tx !== undefined ? ', and the boulder yields one more.' : '.');
      },
    },

    /* ---- The Comb — circle the bush, spare the thorns ---- */
    {
      id: 'comb', name: 'The Comb', hint: 'Draw a ring around the bush without touching the thorn specks.',
      init(s) {
        s.cx = 40; s.cy = 28;
        s.thorns = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
          const r = 15 + Math.random() * 4;
          s.thorns.push({ x: s.cx + Math.cos(a) * r, y: s.cy + Math.sin(a) * r * 0.8 });
        }
        s.covered = new Array(24).fill(false); s.coverN = 0;
        s.tracing = false; s.hearts = 3; s.prickT = 0; s.lushT = 0;
      },
      tick(s, dt) { s.prickT = Math.max(0, s.prickT - dt); s.lushT = Math.max(0, s.lushT - dt); },
      down(s, x, y) { if (Math.hypot(x - s.cx, y - s.cy) < 12) { s.tracing = true; } },
      move(s, x, y) {
        if (!s.tracing || s.done) return;
        for (const t of s.thorns) if (Math.hypot(x - t.x, y - t.y) < 2.6) {
          s.hearts--; s.tracing = false; s.covered.fill(false); s.coverN = 0; s.prickT = 0.5;
          if (s.hearts <= 0) s.done = true;
          return;
        }
        const d = Math.hypot(x - s.cx, y - s.cy);
        if (d > 9 && d < 22) {
          const a = Math.atan2(y - s.cy, x - s.cx);
          const b = ((Math.round(a / (Math.PI * 2) * 24) % 24) + 24) % 24;
          if (!s.covered[b]) { s.covered[b] = true; s.coverN++; }
          if (s.coverN >= 22) { s.lushT = 0.6; s.done = true; } // ~full circle
        }
      },
      up(s) { s.tracing = false; },
      draw(s, x, P, C2) {
        P(0, 0, 80, 60, '#4e7a40');
        for (let i = 0; i < 16; i++) P((i * 11) % 78, (i * 13) % 58, 1, 1, '#5a8a4a');
        // the bush, bursting with berries
        C2(s.cx, s.cy + 2, 9, '#1c3b1c', 0); C2(s.cx, s.cy + 2, 8, '#2e6230', 0); C2(s.cx - 2, s.cy, 4, '#3a7a3c', 0);
        for (const [bx, by] of [[-4, 0], [2, -3], [4, 2], [-1, 4], [-5, 4], [1, 1]]) P(s.cx + bx, s.cy + by, 2, 2, '#d84a6a');
        // thorn specks
        for (const t of s.thorns) {
          P(t.x - 1, t.y, 3, 1, '#8a2e2e'); P(t.x, t.y - 1, 1, 3, '#8a2e2e'); P(t.x, t.y, 1, 1, '#e05555');
        }
        // progress ring: covered buckets lit
        for (let i = 0; i < 24; i++) {
          if (!s.covered[i]) continue;
          const a = (i / 24) * Math.PI * 2;
          P(s.cx + Math.cos(a) * 18 - 0.5, s.cy + Math.sin(a) * 14.5 - 0.5, 1.4, 1.4, '#ffe9a0');
        }
        for (let h = 0; h < s.hearts; h++) P(70 + h * 4, 3, 2, 2, '#e05555');
        if (s.prickT > 0) P(0, 0, 80, 60, `rgba(200,40,40,${s.prickT * 0.4})`);
        if (s.lushT > 0) P(0, 0, 80, 60, `rgba(255,240,200,${s.lushT})`);
      },
      apply(s, site) {
        if (s.hearts <= 0 || !s.lushT) return null;
        Sim.gain('food', 3);
        G.stats.gathered += 3;
        if (site && site.tx !== undefined) {
          const i = World.idx(site.tx, site.ty), rg = G.regrow.get(i);
          if (rg) rg.t = Math.max(3, rg.t - 30); // combed bushes regrow ~half a minute sooner
        }
        Bench.payFx(site, '+3 food', '#7dc95e');
        return 'The Comb — the bush hangs heavy: +3 food, and it regrows sooner.';
      },
    },

    /* ---- The Sickle — swipe with the wind ---- */
    {
      id: 'sickle', name: 'The Sickle', hint: 'Swipe across a wheat row in the direction of the wind — two clean swales.',
      init(s, site) {
        s.wind = Math.random() < 0.5 ? 1 : -1;
        s.swipes = 0; s.trk = null; s.cutT = 0; s.rows = [22, 34, 46];
      },
      tick(s, dt) { s.cutT = Math.max(0, s.cutT - dt); },
      down(s, x, y) {
        const row = s.rows.find(r => Math.abs(y - r) < 6);
        if (row) s.trk = { x, row, dir: 0, len: 0 };
      },
      move(s, x, y) {
        if (!s.trk) return;
        const dx = x - s.trk.x;
        if (Math.abs(dx) < 1) return;
        const dir = Math.sign(dx);
        if (s.trk.dir && dir !== s.trk.dir) { s.trk.len = 0; } // reversed mid-swipe
        s.trk.dir = dir; s.trk.len += Math.abs(dx); s.trk.x = x;
        if (s.trk.len >= 28) {
          if (dir === s.wind) {
            s.swipes++; s.cutT = 0.5; s.wind *= -1;
            s.trk = null;
            if (s.swipes >= 2) s.done = true;
          } else { s.trk.len = 0; } // against the wind — the blade binds
        }
      },
      up(s) { s.trk = null; },
      draw(s, x, P, C2) {
        P(0, 0, 80, 60, '#6e5136');
        for (let r = 0; r < 5; r++) P(0, 8 + r * 11, 80, 10, r % 2 ? '#5c4229' : '#6e5136');
        // wheat rows (cut rows fall as stubble)
        s.rows.forEach((ry, ri) => {
          const cut = ri < s.swipes;
          for (let i = 0; i < 10; i++) {
            const wx = 6 + i * 8;
            if (cut) { P(wx, ry + 2, 2, 2, '#b8912f'); }
            else {
              P(wx, ry - 6, 1, 9, '#c9a036'); P(wx - 1, ry - 8, 3, 2, '#e8cc70'); P(wx, ry - 10, 1, 2, '#d9b24a');
            }
          }
        });
        // wind indicator
        const wx = 40 + Math.sin(s.t * 2) * 2;
        P(wx - 8, 2, 16, 3, 'rgba(232,228,216,.25)');
        if (s.wind > 0) { P(wx + 8, 1, 3, 5, '#ffe9a0'); P(wx - 8, 2, 16, 1, '#ffe9a0'); }
        else { P(wx - 11, 1, 3, 5, '#ffe9a0'); P(wx - 8, 2, 16, 1, '#ffe9a0'); }
        if (s.cutT > 0) { P(0, s.rows[0] - 12, 80, 40, `rgba(255,240,190,${s.cutT * 0.5})`); }
      },
      apply(s, site) {
        if (!s.swipes) return null;
        Sim.gain('food', 2);
        G.stats.gathered += 2;
        if (site && site.b) { site.b.growth = CONFIG.FARM.replant; site.b.tendedT = 99; } // re-seeds itself
        Bench.payFx(site, '+2 food', '#d9b24a');
        return 'The Sickle — clean swales: +2 food, and the plot re-seeds itself.';
      },
    },

    /* ---- The Knead — tap-tap-HOLD on the dough's bounce ---- */
    {
      id: 'knead', name: 'The Knead', hint: 'Tap twice as the dough crests, then HOLD through the big rise.',
      init(s) { s.riseT = 0; s.taps = 0; s.holding = false; s.holdT = 0; s.puff = 0; s.ok = false; },
      tick(s, dt) {
        s.riseT += dt;
        s.puff = Math.max(0, s.puff - dt * 2);
        if (s.holding) {
          s.holdT += dt;
          if (s.holdT >= 1.1) { s.ok = true; s.done = true; }
        }
      },
      rise(s) { return (Math.sin(s.riseT * 3.6) + 1) / 2; },
      down(s) {
        const r = this.rise(s);
        if (!s.holding) {
          if (r > 0.72) { s.taps++; s.puff = 1; if (s.taps >= 2) { s.holding = true; s.holdT = 0; } }
          else { s.taps = 0; s.missT = 0.3; } // knocked the air out — start over
        }
      },
      up(s) { if (s.holding) { s.holding = false; s.taps = 0; s.holdT = 0; } },
      draw(s, x, P, C2) {
        P(0, 0, 80, 60, '#d8cbb0');
        for (let i = 0; i < 12; i++) P((i * 17) % 78, (i * 7) % 58, 2, 1, '#c4b698');
        P(0, 46, 80, 14, '#8a5f37'); P(0, 46, 80, 2, '#a07840'); // bench
        const r = this.rise(s);
        const big = s.holding ? 1 + s.holdT * 0.35 : 1;
        const rad = (5 + r * 2.5) * big;
        C2(40, 40 - r * 3, rad, '#1c1c24', 0); C2(40, 40 - r * 3, rad - 0.8, '#e8dcc0', 0); C2(38, 41 - r * 3, rad / 2.4, '#f4ecd8', 0);
        if (s.puff > 0) C2(40, 40 - r * 3, rad + s.puff * 2, `rgba(255,240,200,${s.puff * 0.4})`, 1);
        // recipe glyphs: • • ▬
        const gx = 28;
        P(gx, 6, 3, 3, s.taps >= 1 ? '#7dc95e' : '#5c4229');
        P(gx + 6, 6, 3, 3, s.taps >= 2 ? '#7dc95e' : '#5c4229');
        P(gx + 12, 6, 12, 3, s.holding ? '#7dc95e' : '#5c4229');
        if (s.holding) P(gx + 12, 6, 12 * Math.min(1, s.holdT / 1.1), 3, '#ffe9a0');
        if (s.missT > 0) { s.missT -= 1 / 60; P(30, 20, 20, 1, '#e05555'); }
      },
      apply(s, site) {
        if (!s.ok) return null;
        if (G.res.flour < 2 || G.res.water < 1) return null;
        G.res.flour -= 2; G.res.water -= 1;
        Sim.gain('bread', 3);
        Bench.payFx(site, '+3 bread', '#d9b06c');
        return 'The Knead — the batch rose proud: 3 loaves for two\u2019s flour.';
      },
    },

    /* ---- The Stir — keep the ladle in the swirl ---- */
    {
      id: 'stir', name: 'The Stir', hint: 'Hold the ladle inside the pot\u2019s slow swirl until the ring fills.',
      init(s) { s.ang = 0; s.lx = 40; s.ly = 40; s.held = false; s.prog = 0; },
      tick(s, dt) {
        s.ang += dt * 1.5;
        const r = Math.hypot(s.lx - 40, s.ly - 28);
        if (s.held && Math.abs(r - 14) < 3.6) s.prog = Math.min(1, s.prog + dt / 4.2);
        else s.prog = Math.max(0, s.prog - dt / 2.5);
        if (s.prog >= 1) s.done = true;
      },
      down(s, x, y) { s.held = true; s.lx = x; s.ly = y; },
      move(s, x, y) { if (s.held) { s.lx = x; s.ly = y; } },
      up(s) { s.held = false; },
      draw(s, x, P, C2) {
        P(0, 0, 80, 60, '#3a3026');
        for (let i = 0; i < 10; i++) P((i * 23) % 78, (i * 11) % 58, 2, 1, '#443a2e');
        // hearth
        P(14, 44, 52, 12, '#5c5c66'); P(14, 44, 52, 2, '#6e6e78');
        for (let i = 0; i < 4; i++) P(18 + i * 3, 52, 2, 1, i % 2 ? '#ff9a2e' : '#ffce56');
        // pot
        C2(40, 28, 18, '#181420', 0); C2(40, 28, 17, '#2c2c34', 0); C2(40, 29, 15, '#7a5a2e', 0); C2(40, 29, 14, '#9a7038', 0);
        // swirl band (rotating gap shows the stir)
        for (let k = 0; k < 26; k++) {
          const a = s.ang + k / 26 * Math.PI * 2;
          P(40 + Math.cos(a) * 14 - 0.7, 29 + Math.sin(a) * 11 - 0.7, 1.6, 1.6, k % 3 ? '#c9a03c' : '#e8b95a');
        }
        for (let k = 0; k < 4; k++) { // steam
          const sy = 12 - ((s.t * 8 + k * 7) % 14);
          P(34 + k * 3 + Math.sin(s.t * 3 + k) * 1.5, sy, 1, 2, 'rgba(240,240,230,.35)');
        }
        // ladle
        P(s.lx - 1, s.ly - 5, 1.6, 6, '#7a5a34'); C2(s.lx, s.ly, 2, '#6e4a28', 0); C2(s.lx, s.ly, 1.3, '#8a5f37', 0);
        // progress ring
        C2(40, 28, 20, 'rgba(255,233,160,.25)', 1);
        x.strokeStyle = '#ffe9a0'; x.lineWidth = 2.5;
        x.beginPath(); x.arc(160, 114, 78, -Math.PI / 2, -Math.PI / 2 + s.prog * Math.PI * 2); x.stroke();
      },
      apply(s, site) {
        if (s.prog < 1) return null;
        if (G.res.food < 3 || G.res.wood < 1) return null;
        G.res.food -= 3; G.res.wood -= 1;
        Sim.gain('meals', 3);
        Bench.payFx(site, '+3 meals', '#e8a94b');
        return 'The Stir — a watched pot: 3 meals where 2 stood.';
      },
    },

    /* ---- The Hammer — strike the instant the bar flares ---- */
    {
      id: 'hammer', name: 'The Hammer', hint: 'Strike when the flare crosses the hot zone — a dead-center blow forges a true tool.',
      init(s) { s.fx = 0; s.dir = 1; s.zone = 0.4 + Math.random() * 0.2; s.tools = 0; s.trueT = 0; s.cool = 0; s.flash = 0; s.hit = 0; },
      tick(s, dt) {
        s.fx += s.dir * dt * 0.85;
        if (s.fx > 1) { s.fx = 1; s.dir = -1; }
        if (s.fx < 0) { s.fx = 0; s.dir = 1; }
        s.cool = Math.max(0, s.cool - dt); s.flash = Math.max(0, s.flash - dt * 2);
        if (s.tools >= 2) s.done = true;
      },
      down(s) {
        if (s.cool > 0 || s.done) return;
        s.cool = 0.5; s.strikes = (s.strikes || 0) + 1;
        const d = Math.abs(s.fx - s.zone);
        if (d < 0.13) {
          s.tools++; s.flash = 1;
          if (d < 0.05) { s.trueT++; s.hit = 2; } else s.hit = 1;
          s.zone = 0.25 + Math.random() * 0.5;
        } else s.hit = 0;
      },
      draw(s, x, P, C2) {
        P(0, 0, 80, 60, '#3a3026');
        P(10, 40, 60, 16, '#4a4038'); P(10, 40, 60, 2, '#5a5048'); // forge wall
        P(30, 50, 20, 6, '#181420'); P(31, 51, 18, 4, '#ff7a2e'); P(34, 52, 10, 2, '#ffce56'); // forge mouth
        // anvil + blade blank
        P(34, 36, 12, 5, '#5c5c66'); P(32, 34, 16, 3, '#71717d'); P(36, 41, 4, 4, '#3a3a44');
        P(35, 33, 10, 2, s.flash > 0 ? '#fff2b0' : '#c9ced9');
        // the timing bar
        P(10, 8, 60, 6, '#241f30');
        P(10 + (s.zone - 0.13) * 60, 8, 0.26 * 60, 6, '#7c3030');
        P(10 + (s.zone - 0.05) * 60, 8, 0.10 * 60, 6, '#e8a94b');
        P(10 + s.fx * 60 - 1, 6, 3, 10, '#fff2b0'); P(10 + s.fx * 60 - 0.5, 5, 2, 12, '#ffd977');
        if (s.flash > 0) { P(30, 30, 20, 2, `rgba(255,233,160,${s.flash})`); P(34, 26, 12, 2, `rgba(255,233,160,${s.flash * 0.7})`); }
        if (s.hit === 0 && s.cool > 0.3) P(34, 20, 12, 2, '#e05555');
        // tally
        for (let i = 0; i < s.tools; i++) P(12 + i * 6, 52, 4, 2, '#c9ced9');
        for (let i = 0; i < s.trueT; i++) P(12 + i * 6, 50, 4, 1, '#ffd94a');
      },
      apply(s, site) {
        if (!s.tools) return null;
        let made = 0;
        for (let i = 0; i < s.tools; i++) {
          if (G.res.wood < 2 || G.res.stone < 1 || G.res.tools >= Buildings.capOf('tools')) break;
          G.res.wood -= 2; G.res.stone -= 1; made++;
        }
        if (!made) return null;
        Sim.gain('tools', made);
        if (s.trueT) G.buffs.trueTools = (G.buffs.trueTools || 0) + Math.min(s.trueT, made);
        Bench.payFx(site, `+${made} tool${made > 1 ? 's' : ''}`, '#c9ced9');
        return `The Hammer — ${made} tool${made > 1 ? 's' : ''} forged${s.trueT ? `, ${Math.min(s.trueT, made)} TRUE (last twice as long)` : ''}.`;
      },
    },

    /* ---- The Flight — match the feather pattern ---- */
    {
      id: 'flight', name: 'The Flight', hint: 'Match the pattern: tap a feather, then its shaft slot.',
      init(s) { this.newPattern(s); s.batches = 0; s.sel = -1; s.errT = 0; },
      newPattern(s) {
        const cols = ['#c03030', '#e8e0d0', '#3b6ea8'];
        s.pattern = [0, 1, 2, Math.floor(Math.random() * 3)].map(i => cols[i % 3]);
        s.filled = [false, false, false, false];
        s.tray = s.pattern.slice();
        s.tray.push(cols[(Math.random() * 3) | 0]);
        s.tray.push(cols[(Math.random() * 3) | 0]);
        for (let i = s.tray.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [s.tray[i], s.tray[j]] = [s.tray[j], s.tray[i]]; }
        s.trayX = s.tray.map((_, i) => 9 + i * 12);
      },
      tick(s, dt) { s.errT = Math.max(0, s.errT - dt); if (s.batches >= 2) s.done = true; },
      down(s, x, y) {
        if (s.done) return;
        // tray pick
        if (y > 44) {
          for (let i = 0; i < s.tray.length; i++) {
            if (Math.abs(x - s.trayX[i]) < 4) { s.sel = i; return; }
          }
          s.sel = -1; return;
        }
        // slots
        if (y > 24 && y < 40) {
          const slot = Math.floor((x - 14) / 13);
          if (slot < 0 || slot > 3 || s.filled[slot]) return;
          if (s.sel < 0) return;
          if (s.tray[s.sel] === s.pattern[slot]) {
            s.filled[slot] = true; s.tray[s.sel] = null; s.sel = -1;
            if (s.filled.every(Boolean)) { s.batches++; this.newPattern(s); s.okT = 0.4; }
          } else { s.errT = 0.35; s.sel = -1; }
        }
      },
      draw(s, x, P, C2) {
        P(0, 0, 80, 60, '#6b5a3e');
        P(0, 0, 80, 4, '#5c4e34');
        for (let i = 0; i < 8; i++) P(i * 10, 8 + (i % 2) * 44, 1, 44, '#5c4e34');
        // pattern to match
        P(12, 4, 56, 1, '#241f30');
        s.pattern.forEach((c, i) => P(17 + i * 13, 6, 4, 4, c));
        // shafts
        for (let i = 0; i < 4; i++) {
          const sx = 14 + i * 13;
          P(sx, 26, 1.6, 16, '#c9b47a'); P(sx - 0.7, 42, 3, 2, '#b8b8c0');
          if (s.filled[i]) { P(sx - 1.7, 24, 4, 5, s.pattern[i]); P(sx - 1.7, 24, 4, 1, '#fff'); }
          else C2(sx + 0.8, 27, 2.6, 'rgba(255,233,160,.5)', 1);
        }
        // feather tray
        P(4, 44, 72, 1, '#241f30');
        s.tray.forEach((c, i) => {
          if (c == null) return;
          const fx = s.trayX[i], fy = 50 + (s.sel === i ? -2 : 0);
          P(fx - 1.5, fy - 3, 3, 6, c); P(fx, fy - 5, 1, 2, c); P(fx - 0.5, fy + 3, 1, 3, '#c9b47a');
        });
        if (s.errT > 0) P(24, 20, 32, 2, '#e05555');
        if (s.okT > 0) { s.okT -= 1 / 60; P(0, 0, 80, 60, `rgba(255,240,200,${s.okT})`); }
      },
      apply(s, site) {
        if (!s.batches) return null;
        let made = 0;
        for (let i = 0; i < s.batches; i++) {
          if (G.res.wood < 2 || G.res.arrows >= Buildings.capOf('arrows')) break;
          G.res.wood -= 2; made++;
        }
        if (!made) return null;
        Sim.gain('arrows', made * 14);
        Bench.payFx(site, `+${made * 14} arrows`, '#c9b47a');
        return `The Flight — ${made} matched batch${made > 1 ? 'es' : ''}: +${made * 14} arrows.`;
      },
    },

    /* ---- The Brew — tap the bubbles as they crest ---- */
    {
      id: 'brew', name: 'The Brew', hint: 'Tap each bubble the moment it crests the surface.',
      init(s) { s.bubbles = []; s.gauge = 0; s.spawn = 0; s.rip = []; },
      tick(s, dt) {
        s.spawn -= dt;
        if (s.spawn <= 0) { s.spawn = 0.45 + Math.random() * 0.45; s.bubbles.push({ x: 26 + Math.random() * 28, y: 42, v: 11 + Math.random() * 5 }); }
        for (const b of s.bubbles) b.y -= b.v * dt;
        s.bubbles = s.bubbles.filter(b => b.y > 12);
        for (const r of s.rip) r.t -= dt * 2;
        s.rip = s.rip.filter(r => r.t > 0);
        if (s.gauge >= 1) s.done = true;
      },
      down(s, x, y) {
        const crest = 18;
        for (let i = 0; i < s.bubbles.length; i++) {
          const b = s.bubbles[i];
          if (Math.hypot(x - b.x, y - b.y) < 4.5 && Math.abs(b.y - crest) < 4) {
            s.bubbles.splice(i, 1); s.gauge += 1 / 3; s.rip.push({ x: b.x, y: crest, t: 1 });
            return;
          }
        }
        s.gauge = Math.max(0, s.gauge - 0.04); // sloshed the vat for nothing
      },
      draw(s, x, P, C2) {
        P(0, 0, 80, 60, '#4a4038');
        P(0, 50, 80, 10, '#33291f');
        // kettle
        P(18, 10, 44, 4, '#5c5c66'); C2(40, 32, 22, '#2c2c34', 0); C2(40, 32, 20, '#71717d', 0);
        C2(40, 34, 17, '#181420', 0); C2(40, 35, 16, '#4a3018', 0);
        // wort surface + crest band
        P(24, 18, 32, 1, 'rgba(232,185,90,.7)');
        P(24, 16, 32, 4, 'rgba(255,217,119,.18)');
        for (const b of s.bubbles) { C2(b.x, b.y, 1.8, '#e8b95a', 0); C2(b.x - 0.4, b.y - 0.4, 0.8, '#f4d898', 0); }
        for (const r of s.rip) C2(r.x, r.y, 2 + (1 - r.t) * 3, `rgba(232,185,90,${r.t * 0.6})`, 1);
        // gauge: the brew darkening to bright ale
        P(64, 14, 6, 26, '#241f30');
        P(65, 15, 4, 24 * Math.min(1, s.gauge), '#d8b46a'); P(65, 15, 4, Math.min(4, 24 * Math.min(1, s.gauge)), '#f0e0b0');
      },
      apply(s, site) {
        if (s.gauge < 1) return null;
        if (G.res.food < 2 || G.res.herbs < 1) return null;
        G.res.food -= 2; G.res.herbs -= 1;
        Sim.gain('ale', 1);
        G.buffs.brightAle = true;
        Bench.payFx(site, 'bright ale', '#d8b46a');
        return 'The Brew — a watched brew pours bright: +15% work at tomorrow\u2019s pour.';
      },
    },

    /* ---- The Dip — wicks on the wave ---- */
    {
      id: 'dip', name: 'The Dip', hint: 'Tap on the wave\u2019s crest to dip each wick — three wicks, hand-dipped.',
      init(s) { s.waveT = 0; s.dips = 0; s.badT = 0; s.dropY = [0, 0, 0]; },
      tick(s, dt) {
        s.waveT += dt;
        s.badT = Math.max(0, s.badT - dt);
        for (let i = 0; i < 3; i++) s.dropY[i] = Math.max(0, s.dropY[i] - dt * 14);
        if (s.dips >= 3) s.done = true;
      },
      wave(s) { return Math.sin(s.waveT * 3.0); },
      down(s) {
        if (this.wave(s) > 0.82) {
          s.dips++; s.dropY[Math.min(2, s.dips - 1)] = 1; s.splash = 1;
        } else s.badT = 0.3;
      },
      draw(s, x, P, C2) {
        P(0, 0, 80, 60, '#4a4038');
        P(0, 46, 80, 14, '#5c4229'); P(0, 46, 80, 2, '#6e5136');
        // the dipping vat
        P(16, 20, 48, 26, '#6e4a28'); P(16, 20, 48, 2, '#8a5f37');
        const h = this.wave(s);
        const surf = 30 - h * 3;
        P(18, surf, 44, 44 - surf + 4, '#c9862e'); P(18, surf, 44, 2, '#e8c05a'); P(18, surf, 44, 1, '#f0dc9a');
        // crest highlight
        if (h > 0.82) { P(18, surf - 1, 44, 1, '#fff2b0'); }
        // wick rack + wicks
        P(10, 8, 60, 2, '#7a5a34');
        for (let i = 0; i < 3; i++) {
          const wx = 24 + i * 16;
          P(wx - 1, 10, 2, 6, '#e8e0d0');
          const dy = s.dropY[i] * 14;
          if (dy > 0) P(wx - 1, 16 + dy - 6, 2, 6, '#e8e0d0');
          P(wx - 1, 10, 2, 2, s.dips > i ? '#c9862e' : '#e8e0d0');
        }
        if (s.badT > 0) P(30, 4, 20, 2, '#e05555');
        // wave meter
        P(6, 52, 68, 3, '#241f30');
        P(6 + ((s.waveT * 10) % 68), 52, 3, 3, h > 0.82 ? '#ffe9a0' : '#6f6f7a');
      },
      apply(s, site) {
        if (s.dips < 3) return null;
        G.buffs.handDip = true;
        Bench.payFx(site, 'wicks dipped', '#e8c05a');
        return 'The Dip — hand-dipped wicks: the torches sip half oil tonight.';
      },
    },

    /* ---- The Suture — trace the wound, spare the red ---- */
    {
      id: 'suture', name: 'The Suture', hint: 'Trace the wound line end to end without crossing the raw red.',
      init(s) {
        s.pts = []; let px = 10, py = 30;
        for (let i = 0; i < 8; i++) { s.pts.push({ x: px, y: py }); px += 8 + Math.random() * 2; py += (Math.random() - 0.5) * 10; py = Math.max(16, Math.min(44, py)); }
        s.red = [s.pts[2], s.pts[5]].map(p => ({ x: p.x, y: p.y }));
        s.idx = 0; s.tracing = false; s.hearts = 2; s.bleedT = 0; s.doneT = 0;
      },
      tick(s, dt) { s.bleedT = Math.max(0, s.bleedT - dt); s.doneT = Math.max(0, s.doneT - dt); },
      down(s, x, y) {
        if (Math.hypot(x - s.pts[0].x, y - s.pts[0].y) < 5) { s.tracing = true; s.idx = 0; }
      },
      move(s, x, y) {
        if (!s.tracing || s.doneT > 0) return;
        for (const r of s.red) if (Math.hypot(x - r.x, y - r.y) < 4.2) {
          s.hearts--; s.tracing = false; s.idx = 0; s.bleedT = 0.5;
          if (s.hearts <= 0) s.done = true;
          return;
        }
        const n = s.pts[s.idx + 1];
        if (n && Math.hypot(x - n.x, y - n.y) < 4.5) {
          s.idx++;
          if (s.idx >= s.pts.length - 1) { s.doneT = 0.5; s.tracing = false; s.ok = true; s.done = true; }
          return;
        }
        const p = s.pts[s.idx];
        let near = 1e9;
        for (const q of [p, n]) if (q) near = Math.min(near, Math.hypot(x - q.x, y - q.y));
        if (near > 5.5) { s.tracing = false; s.idx = 0; }
      },
      up(s) { s.tracing = false; },
      draw(s, x, P, C2) {
        P(0, 0, 80, 60, '#d9a06c'); // skin
        for (let i = 0; i < 10; i++) P((i * 13) % 78, (i * 19) % 58, 2, 1, 'rgba(0,0,0,.05)');
        P(0, 0, 80, 8, '#f0c8a0'); P(0, 52, 80, 8, '#c9865a');
        // raw red danger zones
        for (const r of s.red) { C2(r.x, r.y, 4, 'rgba(180,30,30,.5)', 0); C2(r.x, r.y, 2.4, 'rgba(220,50,50,.75)', 0); }
        // the wound line: stitched where traced
        for (let i = 0; i < s.pts.length - 1; i++) {
          const a = s.pts[i], b = s.pts[i + 1];
          const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
          for (let k = 0; k <= steps; k++) {
            const cx = a.x + (b.x - a.x) * k / steps, cy = a.y + (b.y - a.y) * k / steps;
            const stitched = i < s.idx;
            P(cx - 0.5, cy - 0.5, 1.4, 1.4, stitched ? '#8a1c1c' : '#5a1010');
            if (stitched && k % 4 === 0) P(cx - 0.5, cy - 1.5, 1, 3, '#e8e0d0'); // little stitches
          }
        }
        C2(s.pts[0].x, s.pts[0].y, 2.2 + (s.tracing ? Math.sin(s.t * 8) * 0.5 : 0), 'rgba(255,233,160,.9)', 1);
        for (let h = 0; h < s.hearts; h++) P(70 + h * 4, 3, 2, 2, '#e05555');
        if (s.bleedT > 0) P(0, 0, 80, 60, `rgba(160,20,20,${s.bleedT * 0.45})`);
        if (s.doneT > 0) P(0, 0, 80, 60, `rgba(255,240,200,${s.doneT})`);
      },
      apply(s, site) {
        if (!s.ok) return null;
        G.buffs.suture = true;
        Bench.payFx(site, 'steady hands', '#3f9d84');
        return 'The Suture — the medic\u2019s next mends restore +15 hp per herb today.';
      },
    },

  ],
};

/* ============================================================
   THE DEEP SEAM — push-your-luck mining below a Mine Shaft.
   Each level the seam gets richer, and the spinning wheel
   decides: okay, injured, dead. An injured or dead miner gets
   one chance at the rescue — win, and injured becomes okay,
   dead becomes injured. ============================================================ */
const Seam = {
  /* -------- entry checks (used by the Mine Shaft card) -------- */
  canDig(b) {
    if (!b || !b.built || b.key !== 'mine') return { ok: false, why: 'The shaft is not built.' };
    if (b.seamDay === G.day) return { ok: false, why: 'The seam is dug out for today — try again at dawn.' };
    if (!isDayLike()) return { ok: false, why: 'Nobody descends after dark.' };
    if (!G.villagers.some(v => v.job === 'miner' && !v.below && v.hp > 0)) return { ok: false, why: 'No miner is free to descend.' };
    return { ok: true };
  },

  start(b) {
    const chk = this.canDig(b);
    if (!chk.ok) { UI.toast(chk.why, ''); return false; }
    // the nearest free miner takes the descent
    let who = null, bd = 1e9;
    for (const v of G.villagers) {
      if (v.job !== 'miner' || v.below || v.hp <= 0) continue;
      const d = U.dst2(v.x, v.y, b.x, b.y);
      if (d < bd) { bd = d; who = v; }
    }
    b.seamDay = G.day;
    who.below = true;
    UI.selHide();
    Bench.seam = {
      b, v: who,
      depth: b.seamDepth || 0,
      haul: 0, haulEss: 0, flint: false,
      phase: 'idle',            // idle | spin | result | rescue | over
      t: 0,
      wheelA: -Math.PI / 2, spinT: 0, spinDur: 1.7, spinFrom: 0, spinTo: 0, result: null,
      rescue: null,
      shakeT: 0,
    };
    Bench.show('The Deep Seam', `${who.name} the Miner descends. The seam is richest far below — if it lets them come back up.`);
    this.syncBtns();
    return true;
  },

  close() {
    const s = Bench.seam;
    if (!s) return;
    if (s.phase === 'result' && s.result === 'dead') return; // must choose: rescue or leave him
    if (s.phase === 'spin') return; // let the wheel land
    this.finishSession();
  },

  finishSession() {
    const s = Bench.seam;
    if (!s) return;
    const b = s.b, v = s.v;
    Bench.seam = null;
    if (v && G.villagers.includes(v)) {
      v.below = false;
      v.state = 'idle'; v.path = null;
    }
    Bench.hideOverlay();
    UI.updateHUD();
  },

  syncBtns() {
    const s = Bench.seam;
    if (!s) return;
    if (s.phase === 'idle') {
      const next = seamOdds(s.depth);
      Bench.setBtns([
        { label: `\u2b07 Go deeper (${s.depth + 1})`, fn: () => Seam.go() },
        { label: '\u2b06 Climb out', fn: () => Seam.finishSession() },
      ]);
      Bench.setHint(`Depth ${s.depth} \u00b7 haul: ${s.haul} stone${s.haulEss ? `, ${s.haulEss} essence` : ''}${s.flint ? ', flint' : ''}. Next level — OK ${Math.round(next.ok * 100)}% \u00b7 hurt ${Math.round(next.inj * 100)}% \u00b7 lost ${Math.round(next.dead * 100)}%.`);
    } else if (s.phase === 'result') {
      if (s.result === 'ok') Bench.setBtns([
        { label: '\u2b07 Go deeper', fn: () => Seam.go() },
        { label: '\u2b06 Climb out with the haul', fn: () => Seam.finishSession() },
      ]);
      else if (s.result === 'inj') Bench.setBtns([
        { label: '\u2695 Rescue him!', fn: () => Seam.tryRescue() },
        { label: 'Leave him to crawl home', warn: true, fn: () => { Seam.applyInjury(); Seam.finishSession(); } },
      ]);
      else Bench.setBtns([
        { label: '\u2695 Dig him out!', fn: () => Seam.tryRescue() },
        { label: 'It is too late', warn: true, fn: () => { Seam.applyDeath(); Seam.finishSession(); } },
      ]);
    } else if (s.phase === 'rescue') {
      Bench.setBtns([]);
    } else Bench.setBtns([]);
  },

  /* -------- the spin -------- */
  go() {
    const s = Bench.seam;
    if (!s || s.phase === 'spin') return;
    const d = s.depth; // attempting depth d+1
    const odds = seamOdds(d);
    const r = Math.random();
    s.result = r < odds.ok ? 'ok' : r < odds.ok + odds.inj ? 'inj' : 'dead';
    // aim the wheel so the needle (fixed at angle 0, east) lands inside the
    // chosen sector: sector i is under the needle iff (-wheelA) mod 2π sits
    // in [i·seg, (i+1)·seg) — so we steer spinTo ≡ -target (mod 2π)
    const sector = s.result === 'ok' ? 0 : s.result === 'inj' ? 1 : 2;
    const seg = (Math.PI * 2) / 3;
    const target = sector * seg + seg / 2 + (Math.random() - 0.5) * seg * 0.7;
    const laps = Math.PI * 2 * (2.5 + Math.random() * 1.5);
    const delta = (((-target) - s.spinFrom) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    s.spinFrom = s.wheelA;
    s.spinTo = s.wheelA + laps + delta;
    s.spinT = 0;
    s.phase = 'spin';
    this.syncBtns();
  },

  resolveSpin() {
    const s = Bench.seam;
    s.phase = 'result';
    if (s.result === 'ok') {
      s.depth++;
      s.b.seamDepth = s.depth;
      const pay = seamPay(s.depth);
      Sim.gain('stone', pay.stone);
      s.haul += pay.stone;
      if (pay.ess) {
        G.res.essence = Math.min(CONFIG.ESSENCE.max, G.res.essence + pay.ess);
        s.haulEss += pay.ess;
      }
      if (pay.flint) { G.buffs.flintDays = CONFIG.SEAM.flintDays; s.flint = true; }
      Sim.float(s.b.x + .5, s.b.y - .3, `+${pay.stone} stone${pay.ess ? ' +' + pay.ess + ' essence' : ''}`, '#a5a5ae');
      Bench.payFx({ b: s.b }, `depth ${s.depth}`, '#ffe9a0');
      Sim.log(`${s.v.name} struck a rich seam at depth ${s.depth} (+${pay.stone} stone${pay.ess ? ', +' + pay.ess + ' essence' : ''}${pay.flint ? ', flint' : ''}).`, '');
      UI.updateHUD();
    } else {
      s.shakeT = 0.8;
      // the tunnel seals — everything about this level is lost, the depth collapses
      s.b.seamDepth = 0;
      s.depth = 0;
    }
    this.syncBtns();
  },

  applyInjury() {
    const s = Bench.seam;
    if (!s) return;
    const v = s.v;
    v.hp = Math.max(1, Math.round(v.maxHp * CONFIG.SEAM.hurtHp));
    Sim.log(`${v.name} crawled out of the Deep Seam hurt.`, 'bad');
  },

  applyDeath() {
    const s = Bench.seam;
    if (!s) return;
    const v = s.v;
    if (G.villagers.includes(v)) Sim.villagerDeath(v, 'a tunnel collapse');
    s.v = null;
  },

  /* -------- the rescue skill game: dodge the falling rock -------- */
  tryRescue() {
    const s = Bench.seam;
    if (!s || (s.phase !== 'result')) return;
    const dead = s.result === 'dead';
    s.phase = 'rescue';
    s.rescue = {
      mx: 40, tx: 40, rocks: [], spawn: 0.4, t: 0,
      hits: 0, win: null, dead,
      // the dead must be dug out of deeper rubble: less time, more rock
      dur: dead ? CONFIG.SEAM.rescueT + 2 : CONFIG.SEAM.rescueT,
    };
    Bench.setHint(dead
      ? 'RESCUE — steer the ropeline through the falling rock. Two hits and he is lost. Survive, and he comes up hurt but alive.'
      : 'RESCUE — steer the ropeline through the falling rock. Two hits and the injury stands. Survive, and he walks away clean.');
    this.syncBtns();
  },

  tickRescue(dt) {
    const s = Bench.seam, r = s.rescue;
    r.t += dt;
    r.mx = U.lerp(r.mx, r.tx, Math.min(1, dt * 12));
    r.spawn -= dt;
    const rate = 0.75 - Math.min(0.45, r.t * 0.07);
    if (r.spawn <= 0) {
      r.spawn = rate * (0.6 + Math.random() * 0.7);
      r.rocks.push({ x: 8 + Math.random() * 64, y: -3, v: 16 + Math.random() * 12, sz: 1.6 + Math.random() * 1.6 });
    }
    for (const k of r.rocks) {
      k.y += k.v * dt;
      if (k.hitT > 0) k.hitT -= dt;
      else if (!k.done && k.y > 44 && k.y < 50 && Math.abs(k.x - r.mx) < 2.6 + k.sz * 0.5) {
        k.done = true; r.hits++; s.shakeT = 0.4;
      }
    }
    r.rocks = r.rocks.filter(k => k.y < 64);
    if (r.hits >= CONFIG.SEAM.rescueHits) r.win = false;
    else if (r.t >= r.dur) r.win = true;
    if (r.win != null) this.resolveRescue();
  },

  resolveRescue() {
    const s = Bench.seam, r = s.rescue;
    const v = s.v;
    s.phase = 'over';
    if (r.win) {
      if (r.dead) {
        // dead becomes injured — pulled from the rubble alive
        v.below = false; v.state = 'idle'; v.path = null;
        v.hp = Math.max(1, Math.round(v.maxHp * CONFIG.SEAM.hurtHp));
        UI.toast(`${v.name} is pulled from the rubble — hurt, but ALIVE.`, 'good');
        Sim.log(`${v.name} was dug out of a seam collapse — bruised, breathing, alive.`, 'good');
      } else {
        // injured becomes okay — walks out of the shaft there and then
        v.below = false; v.state = 'idle'; v.path = null;
        v.hp = v.maxHp;
        UI.toast(`${v.name} is pulled clear — not a scratch.`, 'good');
        Sim.log(`${v.name} was rescued from a seam collapse without a scratch.`, 'good');
      }
    } else {
      if (r.dead) {
        this.applyDeath();
      } else {
        this.applyInjury();
        UI.toast(`${v.name} crawls out of the Deep Seam hurt.`, 'bad');
      }
    }
    Bench.setHint(r.win ? 'RESCUED.' : (r.dead ? 'The rubble settles...' : 'He limps home.'));
    Bench.setBtns([{ label: 'Leave the shaft', fn: () => Seam.finishSession() }]);
  },

  /* -------- pointer -------- */
  pointer(type, x, y) {
    const s = Bench.seam;
    if (!s) return;
    if (s.phase === 'rescue' && s.rescue && !s.rescue.win) {
      if (type === 'down' || type === 'move') s.rescue.tx = U.clamp(x, 6, 74);
    }
  },

  /* -------- frame tick -------- */
  tick(dt) {
    const s = Bench.seam;
    if (!s) return;
    s.t += dt;
    s.shakeT = Math.max(0, s.shakeT - dt);
    if (s.phase === 'spin') {
      s.spinT += dt;
      const p = Math.min(1, s.spinT / s.spinDur);
      const e = 1 - Math.pow(1 - p, 3);
      s.wheelA = U.lerp(s.spinFrom, s.spinTo, e);
      if (p >= 1) { s.wheelA = s.spinTo; this.resolveSpin(); }
    } else if (s.phase === 'rescue' && s.rescue && s.rescue.win == null) {
      this.tickRescue(dt);
    }
  },

  /* -------- drawing -------- */
  draw(x) {
    const s = Bench.seam;
    if (!s) return;
    const P = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px * 4 | 0, py * 4 | 0, Math.max(1, w * 4 | 0), Math.max(1, h * 4 | 0)); };
    const C2 = (cx, cy, r, col, lw) => {
      x.beginPath();
      x.arc(cx * 4, cy * 4, Math.max(0.5, r * 4), 0, Math.PI * 2);
      if (lw) { x.strokeStyle = col; x.lineWidth = lw; x.stroke(); }
      else { x.fillStyle = col; x.fill(); }
    };
    const sh = s.shakeT > 0 ? (Math.random() - .5) * 3 : 0;
    x.save();
    x.translate(sh, sh);

    // —— the shaft cutaway ——
    P(0, 0, 80, 60, '#241f30');
    for (let i = 0; i < 20; i++) P((i * 13) % 78, (i * 29) % 58, 2, 1, 'rgba(120,100,160,.08)');
    P(0, 8, 80, 3, '#4e7a40');                    // grass line
    P(0, 11, 80, 2, '#6e5136');                   // soil
    P(8, 4, 12, 8, '#3a3026');                    // mine hut
    P(10, 6, 8, 6, '#181420');                    // entrance
    P(9, 3, 10, 1, '#6b4a2b'); P(9, 3, 1, 5, '#6b4a2b'); P(18, 3, 1, 5, '#6b4a2b');
    // the shaft, level bands
    for (let lv = 0; lv < 8; lv++) {
      const ly = 16 + lv * 5.4;
      P(24, ly, 32, 4.4, lv % 2 ? '#33291f' : '#3a3026');
      P(24, ly, 32, 0.6, '#181420');
      // level marker + pay hint
      const pay = seamPay(lv + 1);
      P(58, ly + 1.4, 2, 1.6, pay.ess ? '#b48ae0' : pay.flint ? '#8fc9e8' : '#8d8d95');
    }
    // dug depth glow
    for (let lv = 0; lv < s.depth; lv++) P(25, 17 + lv * 5.4, 30, 3.4, 'rgba(255,217,119,.06)');
    // the miner (or the ropeline during rescue)
    const my = 18 + Math.min(7, s.depth) * 5.4 - 4;
    if (s.phase !== 'rescue') {
      P(38, my, 3, 5, '#7d7d85'); P(38.4, my - 2.6, 2.2, 2.6, '#f0c8a0'); P(38.4, my - 3.4, 2.2, 1, '#3a2a1a');
      P(41, my + 1, 2, 1, '#b8bcc8'); // pick
    }
    // —— the wheel ——
    if (s.phase === 'spin' || s.phase === 'result') {
      const cx = 40, cy = 30, r = 11;
      const seg = (Math.PI * 2) / 3;
      const cols = ['#2e6230', '#a3762a', '#7c2430'];
      const labels = ['OK', 'HURT', 'LOST'];
      for (let i = 0; i < 3; i++) {
        x.beginPath();
        x.moveTo(cx * 4, cy * 4);
        x.arc(cx * 4, cy * 4, r * 4, s.wheelA + i * seg, s.wheelA + (i + 1) * seg);
        x.closePath();
        x.fillStyle = cols[i]; x.fill();
        x.strokeStyle = '#181420'; x.lineWidth = 1.5; x.stroke();
        const mid = s.wheelA + (i + 0.5) * seg;
        x.fillStyle = 'rgba(255,255,255,.85)';
        x.font = 'bold 8px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(labels[i], cx * 4 + Math.cos(mid) * r * 2.4, cy * 4 + Math.sin(mid) * r * 2.4);
      }
      C2(cx, cy, 2, '#181420', 0); C2(cx, cy, 1.2, '#e8e4d8', 0);
      // needle at east
      P(cx + r + 0.5, cy - 0.6, 3, 1.2, '#ffe9a0'); P(cx + r + 2.5, cy - 1.4, 1.4, 2.8, '#ffe9a0');
      if (s.phase === 'result' && s.result !== 'ok') {
        x.fillStyle = s.result === 'dead' ? '#ff6a6a' : '#ffc46b';
        x.font = 'bold 11px monospace'; x.textAlign = 'center';
        x.fillText(s.result === 'dead' ? 'COLLAPSE!' : 'THE TUNNEL SHIFTS!', 160, 60);
      } else if (s.phase === 'result') {
        x.fillStyle = '#9fe08a'; x.font = 'bold 11px monospace'; x.textAlign = 'center';
        x.fillText('A RICH POCKET!', 160, 60);
      }
    }
    // —— the rescue game ——
    if (s.phase === 'rescue' && s.rescue) {
      const r = s.rescue;
      // pit scene
      for (let lv = 0; lv < 8; lv++) P(24, 16 + lv * 5.4, 32, 4.4, lv % 2 ? '#33291f' : '#3a3026');
      P(24, 12, 32, 44, '#181420');
      for (const k of r.rocks) { C2(k.x, k.y, k.sz, '#6e6e78', 0); C2(k.x - k.sz * 0.3, k.y - k.sz * 0.3, k.sz * 0.4, '#8d8d95', 0); }
      // the ropeline + miner
      P(r.mx - 0.4, 12, 0.8, 32, 'rgba(232,228,216,.5)');
      const bobY = 44 + Math.sin(r.t * 8) * 0.6;
      P(r.mx - 1.5, bobY, 3, 5, '#7d7d85'); P(r.mx - 1.2, bobY - 2.6, 2.4, 2.6, '#f0c8a0');
      if (r.hits > 0) P(r.mx - 2, bobY - 1, 4, 1, '#e05555');
      // hearts + timer
      for (let i = 0; i < CONFIG.SEAM.rescueHits; i++) P(64 + i * 4, 4, 2, 2, i < CONFIG.SEAM.rescueHits - r.hits ? '#e05555' : '#3a3a44');
      P(8, 4, 64, 2, '#33291f');
      P(8, 4, 64 * (1 - r.t / r.dur), 2, '#ffe9a0');
      if (r.win === true) { x.fillStyle = '#9fe08a'; x.font = 'bold 12px monospace'; x.textAlign = 'center'; x.fillText('PULLED CLEAR!', 160, 100); }
      if (r.win === false) { x.fillStyle = '#ff6a6a'; x.font = 'bold 12px monospace'; x.textAlign = 'center'; x.fillText('THE ROCK WINS', 160, 100); }
    }
    // —— idle: depth & haul readout ——
    if (s.phase === 'idle') {
      x.fillStyle = '#e8e4d8'; x.font = 'bold 9px monospace'; x.textAlign = 'left';
      x.fillText(`DEPTH ${s.depth}`, 8, 18);
      x.fillStyle = '#9aa3b5'; x.font = '8px monospace';
      x.fillText(`haul ${s.haul} stone${s.haulEss ? ' + ' + s.haulEss + ' ess' : ''}`, 8, 26);
      if (s.flint) { x.fillStyle = '#8fc9e8'; x.fillText('flint!', 8, 33); }
    }
    x.restore();
  },
};
