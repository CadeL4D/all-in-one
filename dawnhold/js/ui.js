'use strict';
/* ============================================================
   Dawnhold — ui.js
   DOM UI + input. Touch-first: tap = select/place, drag = pan
   (or paint walls/roads), pinch = zoom, and a tappable minimap
   as a jump aid (mobile best practice).
   ============================================================ */

const UI = {
  mode: null,        // {type:'build',key} | {type:'demolish'} | {type:'power',key}
  ghost: null,       // {x,y} tile under finger/cursor (top-left for buildings)
  _ghostParked: false, // ghost placed by drag/tap and waiting for the confirm tap
  _cardDrag: null,   // live drag-from-menu-card gesture {key,x,y,moved}
  _cardDragged: false, // a card drag just ended — swallow the trailing click
  open: null,        // open panel name
  _pt: new Map(),    // active pointers
  _pinch: null,
  _panning: false,
  _lastPhase: '',
  _hudT: 0,
  _lastPlaceFail: 0,
  _chips: {},        // resource chip elements by key (order lives in G.settings.matOrder)
  els: {},

  /* Materials roster: default order = importance. `on` chips are always
     shown until the player picks their own set; the rest appear the moment
     they matter (first unit gained or workplace built). */
  MATS: [
    { k: 'wood', n: 'Wood', icon: 'wood', d: 'Walls, tents, towers, arrows', on: true },
    { k: 'stone', n: 'Stone', icon: 'stone', d: 'Stone walls, towers, the Beacon', on: true },
    { k: 'food', n: 'Food', icon: 'food', d: 'Eaten by every villager', on: true },
    { k: 'essence', n: 'Essence', icon: 'essence', d: 'Fuels your Powers', on: true },
    { k: 'herbs', n: 'Herbs', icon: 'herb', d: 'Hospital stores, ale, lamp oil', on: true },
    { k: 'water', n: 'Water', icon: 'water', d: 'Drawn from wells; drinking, bread, bottles', b: 'well' },
    { k: 'arrows', n: 'Arrows', icon: 'arrow', d: 'Tower and raid ammunition', b: 'fletch' },
    { k: 'tools', n: 'Tools', icon: 'tool', d: 'Worn down by every worker', b: 'smithy' },
    { k: 'meals', n: 'Meals', icon: 'meal', d: 'Cooked food satisfies far better', b: 'kitchen' },
    { k: 'bread', n: 'Bread', icon: 'bread', d: 'The heartiest food, from the Bakehouse', b: 'bakery' },
    { k: 'flour', n: 'Flour', icon: 'flour', d: 'Ground at the Mill for the Bakehouse', b: 'windmill' },
    { k: 'charcoal', n: 'Charcoal', icon: 'charcoal', d: 'Burned at the Kiln; pressed into lamp oil', b: 'kiln' },
    { k: 'ale', n: 'Ale', icon: 'ale', d: 'A dusk drink that speeds tomorrow\u2019s work', b: 'tavern' },
    { k: 'oil', n: 'Lamp oil', icon: 'oil', d: 'Torches sip it through the night', b: 'press' },
    { k: 'bottles', n: 'Bottles', icon: 'bottle', d: 'A drink without the walk to the well', b: 'bottlery' },
  ],

  TUT: [
    { text: 'Welcome, Guardian.<br>Your settlers depend on you: assign their <b>Jobs</b>, raise <b>shelter</b>, stock <b>food</b> — and hold back the shades each night. Goal: raise <b>The Beacon</b> and survive the Long Night.', btn: 'Begin' },
    { text: 'Shelter first.<br>Open <b>Build</b> and place two <b>Tents</b> — your six settlers outnumber the beds they have.', done: () => Buildings.housingCap() >= 8 },
    { text: 'Set the work.<br>Open <b>Jobs</b>: 2 Foragers, 2 Lumberjacks, 1 Miner, 1 Builder is a strong start. Add a <b>Guard</b> before dark.', done: () => G.jobs.guard >= 1 },
    { text: 'Before nightfall...<br>Draw a <b>Palisade</b> ring around camp (drag to paint) and plant <b>Torches</b>. Towers unlock on day 3.', done: () => Buildings.count('wallW') + Buildings.count('wallS') >= 6 || G.day > 1 },
    { text: 'The night is theirs — until it isn\u2019t.<br><b>Powers</b> burn Essence: <b>Smite</b> erases shades. The horde crawls from the <b>Dark Monoliths</b> — the purple dots on your map. Essence flows back from every kill.', done: () => !isNightLike() && G.day > 1 },
    { text: 'Grow, fortify, hunt.<br>Wheat plots and Fishing Docks feed a village; tap a <b>Dark Monolith</b> and press <b>Raid</b> to send guards to destroy it — fewer lairs, smaller nights. The Beacon awaits on day 10.', done: () => G.day >= 2 },
  ],

  /* ================= init ================= */
  init() {
    const $ = id => document.getElementById(id);
    this.els = {
      hud: $('hud'), resRow: $('resRow'), dayLabel: $('dayLabel'), clockFill: $('clockFill'), clockBar: $('clockBar'),
      phaseIcon: $('phaseIcon'), toasts: $('toasts'), tut: $('tut'), tutText: $('tutText'),
      selCard: $('selCard'), dock: $('dock'), panel: $('panel'), panelTitle: $('panelTitle'), panelBody: $('panelBody'),
      panelBack: $('panelBack'), modeChip: $('modeChip'), modeChipText: $('modeChipText'), mmWrap: $('mmWrap'),
      bossBar: $('bossBar'), bossHpFill: $('bossHpFill'), hudBtns: $('hudBtns'),
    };
    $('btnPause').onclick = () => Sim.speedSet(G.paused ? 1 : 0);
    $('btnSpd1').onclick = () => Sim.speedSet(1);
    $('btnSpd2').onclick = () => Sim.speedSet(2);
    $('btnSpd3').onclick = () => Sim.speedSet(3);
    $('btnMenuTop').onclick = () => this.openPanel('menu');
    $('dockBuild').onclick = () => this.openPanel('build');
    $('dockJobs').onclick = () => this.openPanel('jobs');
    $('dockPowers').onclick = () => this.openPanel('powers');
    $('btnMats').onclick = () => this.openPanel('materials');
    $('modeChipX').onclick = () => this.cancelMode();
    $('btnHelpClose').onclick = () => { $('helpScreen').classList.add('hidden'); if (G.state === 'title') $('titleScreen').classList.remove('hidden'); };
    $('btnHelpT').onclick = () => { $('titleScreen').classList.add('hidden'); $('helpScreen').classList.remove('hidden'); };
    $('btnNew').onclick = () => { $('diffPick').classList.remove('hidden'); $('btnNew').classList.add('hidden'); };
    $('btnDiffBack').onclick = () => { $('diffPick').classList.add('hidden'); $('btnNew').classList.remove('hidden'); };
    $('btnContinue').onclick = () => {
      let ok = SaveSys.load('auto');
      if (!ok) for (let i = 1; i <= 3; i++) if (SaveSys.has(i) && SaveSys.load(i)) { ok = true; break; }
      if (ok) {
        document.getElementById('titleScreen').classList.add('hidden');
        document.getElementById('helpScreen').classList.add('hidden');
        this.showGameUI();
      }
    };
    document.querySelectorAll('.bigbtn.diff').forEach(b => {
      b.onclick = () => {
        $('titleScreen').classList.add('hidden');
        Sim.newGame(b.dataset.diff);
      };
    });
    $('tutSkip').onclick = () => { G.tutOn = false; this.els.tut.classList.add('hidden'); };
    $('tutNext').onclick = () => this.tutAdvance(G.tut + 1);

    // dock + bar icons
    const put = (id, name) => { const e = $(id); e.innerHTML = ''; e.appendChild(Art.iconEl(name)); };
    put('icoBuild', 'build'); put('icoJobs', 'jobs'); put('icoPowers', 'powers');
    const mic = $('icoMats').getContext('2d');
    mic.imageSmoothingEnabled = false;
    mic.drawImage(Art.s.ic_mats, 0, 0);

    this.buildResRow();
    this.input();
    this.helpFill();
    window.addEventListener('keydown', e => {
      if (G.state !== 'playing') return;
      if (e.key === ' ') { e.preventDefault(); Sim.speedSet(G.paused ? 1 : 0); }
      else if (e.key === '1') Sim.speedSet(1);
      else if (e.key === '2') Sim.speedSet(2);
      else if (e.key === '3') Sim.speedSet(3);
      else if (e.key === 'Escape') {
        if (Bench.active || Bench.seam) Bench.close();
        else if (this.open) this.closePanel();
        else this.cancelMode();
      }
      else if (e.key === 'l' || e.key === 'L') { if (window.DBG && DBG.lairs) DBG.lairs(); }
    });
    // continue button availability
    if (SaveSys.has('auto') || SaveSys.has(1) || SaveSys.has(2) || SaveSys.has(3)) $('btnContinue').classList.remove('hidden');
  },

  /* ================= HUD ================= */
  matBy(k) { return this.MATS.find(m => m.k === k); },

  // resolved bar order — the saved one if it still covers the roster
  matOrder() {
    const s = G.settings.matOrder;
    if (Array.isArray(s) && s.length === this.MATS.length && this.MATS.every(m => s.includes(m.k))) return s;
    return this.MATS.map(m => m.k);
  },

  // auto visibility (before the player pins a choice): the vital five, plus
  // anything the village has actually touched
  matAutoShown(m) { return !!m.on || (G.res[m.k] || 0) >= 1 || !!(m.b && Buildings.built(m.b)); },

  matShown(m) {
    if (G.settings.matPin && G.settings.matPin[m.k]) return !(G.settings.matHidden && G.settings.matHidden[m.k]);
    return this.matAutoShown(m);
  },

  // "42 / 120" — storage cap beside the stock (null = no cap)
  matCap(k) { return k === 'essence' ? CONFIG.ESSENCE.max : Buildings.capOf(k); },
  matStockHTML(k) {
    const cap = this.matCap(k);
    return Math.floor(G.res[k] || 0) + (cap != null ? ` <span class="cap">/ ${cap}</span>` : '');
  },

  layoutResRow() {
    const row = this.els.resRow;
    for (const k of this.matOrder()) if (this._chips[k]) row.appendChild(this._chips[k]);
    if (this._chips.pop) row.appendChild(this._chips.pop); // population stays at the end
    const bm = document.getElementById('btnMats');
    if (bm) row.appendChild(bm); // the Materials tab rides at the end of its chips
  },

  buildResRow() {
    const row = this.els.resRow;
    row.innerHTML = '';
    this._chips = {};
    const mk = (id, icon, title) => {
      const d = document.createElement('div');
      d.className = 'chip'; d.id = 'chip_' + id; d.title = title;
      d.appendChild(Art.iconEl(icon));
      const v = document.createElement('span'); v.id = 'val_' + id; v.textContent = '0';
      d.appendChild(v);
      this._chips[id] = d;
      return d;
    };
    mk('wood', 'wood', 'Wood — walls, tents, towers');
    mk('stone', 'stone', 'Stone — stone walls, towers, the Beacon');
    mk('food', 'food', 'Food — eaten by every villager');
    const e = mk('essence', 'essence', 'Essence — fuels your Powers');
    const bar = document.createElement('div'); bar.id = 'essBar'; bar.innerHTML = '<div id="essFill"></div>';
    e.appendChild(bar); e.id = 'essChip';
    mk('herbs', 'herb', 'Herbs — stock the Hospital, brew ale, press lamp oil');
    mk('water', 'water', 'Water — drawn from wells; drinking, bread and bottles all pull it');
    mk('arrows', 'arrow', 'Arrows — burned by towers and raiding guards; Fletchers make them from wood');
    mk('tools', 'tool', 'Tools — worn down by every worker; forged at the Smithy');
    mk('meals', 'meal', 'Meals — cooked food satisfies far better than raw berries');
    mk('bread', 'bread', 'Bread — the heartiest food, from the Bakehouse');
    mk('flour', 'flour', 'Flour — ground at the Mill for the Bakehouse');
    mk('charcoal', 'charcoal', 'Charcoal — burned at the Kiln, pressed into lamp oil');
    mk('ale', 'ale', 'Ale — a dusk drink at the Tavern speeds tomorrow\u2019s work');
    mk('oil', 'oil', 'Lamp oil — torches sip it through the night; pressed from charcoal + herbs');
    mk('bottles', 'bottle', 'Bottles — a drink without the walk to the well; filled at the Bottlery');
    mk('pop', 'pop', 'Villagers / housing capacity');
    this.layoutResRow();
  },

  updateHUD() {
    if (G.state !== 'playing' && G.state !== 'victory' && G.state !== 'defeat') return;
    const set = (id, v) => { const e = document.getElementById('val_' + id); if (e) e.textContent = v; };
    set('wood', Math.floor(G.res.wood));
    set('stone', Math.floor(G.res.stone));
    set('food', Math.floor(G.res.food));
    set('essence', Math.floor(G.res.essence));
    set('herbs', Math.floor(G.res.herbs || 0));
    set('water', Math.floor(G.res.water || 0));
    set('arrows', Math.floor(G.res.arrows || 0));
    set('tools', Math.floor(G.res.tools || 0));
    set('meals', Math.floor(G.res.meals || 0));
    set('ale', Math.floor(G.res.ale || 0));
    set('oil', Math.floor(G.res.oil || 0));
    set('bottles', Math.floor(G.res.bottles || 0));
    set('bread', Math.floor(G.res.bread || 0));
    set('flour', Math.floor(G.res.flour || 0));
    set('charcoal', Math.floor(G.res.charcoal || 0));
    // bar membership: the player's pinned choice, else the auto rule
    for (const m of this.MATS) {
      const c = this._chips[m.k]; // the essence chip is renamed #essChip, so go by element
      if (c) c.style.display = this.matShown(m) ? '' : 'none';
    }
    for (const k of ['wood', 'stone', 'food']) {
      const cap = Buildings.capOf(k), chip = document.getElementById('chip_' + k);
      if (chip) chip.title = `${k[0].toUpperCase() + k.slice(1)} — ${Math.floor(G.res[k])} / ${cap} (Granaries & Storehouses raise caps)`;
    }
    const cap = Buildings.housingCap();
    set('pop', G.villagers.length + '/' + cap);
    document.getElementById('chip_food').classList.toggle('low', G.res.food < 15 && G.villagers.length > 0);
    document.getElementById('chip_pop').classList.toggle('low', G.villagers.length > cap);
    const ef = document.getElementById('essFill');
    if (ef) ef.style.width = (G.res.essence / CONFIG.ESSENCE.max * 100) + '%';
    this.els.dayLabel.textContent = 'Day ' + G.day + (G.finalNight ? ' \u26a0' : '');
    // clock (day length is a difficulty lever — read it from the preset)
    let frac;
    const C = CONFIG;
    const dayLen = (G.diffM && G.diffM.dayLen) || C.DAY_LEN;
    if (G.phase === 'day') frac = G.time / dayLen * 0.5;
    else if (G.phase === 'dusk') frac = 0.5 + G.time / C.TRANS * (C.NIGHT_LEN * G.diffM.night) / (C.NIGHT_LEN * G.diffM.night + C.TRANS) * 0.5;
    else if (G.phase === 'night') {
      const nl = C.NIGHT_LEN * G.diffM.night;
      frac = 0.5 + (C.TRANS + G.time) / (nl + C.TRANS) * 0.5;
    } else frac = 0.98;
    this.els.clockFill.style.width = (frac * 100).toFixed(1) + '%';
    this.els.clockBar.classList.toggle('night', isNightLike());
    if (this._lastPhase !== G.phase) { this._lastPhase = G.phase; this.drawPhaseIcon(); }
    if (G.boss) this.els.bossHpFill.style.width = U.clamp(G.boss.hp / G.boss.maxHp * 100, 0, 100) + '%';
    Bench.drawMeter();
    if (!this.els.selCard.classList.contains('hidden')) this.selRender();
    if (this.open === 'materials') this.matsLive();
    // narrow layout: the materials block's height varies with shown goods, so
    // pin orb / notices just below it instead of fixed offsets
    if (window.matchMedia('(max-width:560px)').matches) {
      const b = Math.round(this.els.resRow.getBoundingClientRect().bottom) + 8;
      this.els.mmWrap.style.top = b + 'px';
      this.els.toasts.style.top = b + 'px';
      this.els.tut.style.top = b + 'px';
      this.els.bossBar.style.top = b + 'px';
    }
  },

  // stock & caps tick live while the Materials tab is open
  matsLive() {
    for (const m of this.MATS) {
      const el = document.getElementById('matVal_' + m.k);
      if (el) el.innerHTML = this.matStockHTML(m.k);
    }
  },

  drawPhaseIcon() {
    const cv = this.els.phaseIcon, x = cv.getContext('2d');
    x.clearRect(0, 0, 18, 18);
    x.imageSmoothingEnabled = false;
    const icon = G.phase === 'night' ? 'moon' : G.phase === 'day' ? 'sun' : 'dusk';
    x.drawImage(Art.s['ic_' + icon], 0, 0);
  },

  syncSpeedBtns() {
    const map = { btnPause: G.paused, btnSpd1: !G.paused && G.speed === 1, btnSpd2: !G.paused && G.speed === 2, btnSpd3: !G.paused && G.speed === 3 };
    for (const id in map) document.getElementById(id).classList.toggle('active', map[id]);
  },

  bossBar(m) {
    this.els.bossBar.classList.toggle('hidden', !m);
    if (m) this.els.bossHpFill.style.width = '100%';
  },

  /* ================= toasts ================= */
  toast(msg, kind) {
    const box = this.els.toasts;
    const top = box.lastElementChild;
    if (top && top._msg === msg) {
      // same message again — fold into a ×N badge instead of stacking a copy
      top._n = (top._n || 1) + 1;
      let b = top.querySelector('.tn');
      if (!b) { b = document.createElement('b'); b.className = 'tn'; top.appendChild(b); }
      b.textContent = '\u00d7' + top._n;
      clearTimeout(top._t1); clearTimeout(top._t2);
      top.classList.remove('fadeout');
      top._t1 = setTimeout(() => top.classList.add('fadeout'), 4200);
      top._t2 = setTimeout(() => top.remove(), 4900);
      return;
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.innerHTML = U.esc(msg).replace(/\u26a0/g, '\u26a0\ufe0f');
    t._msg = msg;
    box.appendChild(t);
    while (box.children.length > 2) box.firstChild.remove();
    t._t1 = setTimeout(() => t.classList.add('fadeout'), 4200);
    t._t2 = setTimeout(() => t.remove(), 4900);
  },

  /* -------- hold-for-details -------- */
  // press-and-hold on a compact card pops its full story (jobs, buildings)
  showInfoPop(html) {
    let p = document.getElementById('ipop');
    if (!p) { p = document.createElement('div'); p.id = 'ipop'; document.getElementById('app').appendChild(p); }
    p.innerHTML = html;
    p.classList.remove('fadeout');
    clearTimeout(this._ipopT); clearTimeout(this._ipopT2);
    this._popT = performance.now(); // a card's click right after a hold is a release, not a tap
    this._ipopT = setTimeout(() => p.classList.add('fadeout'), 3600);
    this._ipopT2 = setTimeout(() => p.remove(), 4200);
  },

  holdInfo(el, html) {
    el.addEventListener('pointerdown', e => {
      const sx = e.clientX, sy = e.clientY;
      let t = null;
      const clean = () => {
        if (t) { clearTimeout(t); t = null; }
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', clean);
        el.removeEventListener('pointercancel', clean);
      };
      const move = ev => { if (t && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 12) { clearTimeout(t); t = null; } };
      t = setTimeout(() => { t = null; clean(); this.showInfoPop(html); }, 430);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', clean);
      el.addEventListener('pointercancel', clean);
    });
  },

  // a click within 700ms of an info popup is the release that ended the hold
  afterPop() { return performance.now() - (this._popT || 0) < 700; },

  /* ================= tutorial ================= */
  tutStart() { G.tut = 0; this.tutRender(); },
  tutRender() {
    if (!G.tutOn || G.tut >= this.TUT.length) { this.els.tut.classList.add('hidden'); return; }
    const step = this.TUT[G.tut];
    this.els.tutText.innerHTML = step.text;
    document.getElementById('tutNext').style.display = step.done ? 'none' : '';
    this.els.tut.classList.remove('hidden');
  },
  tutAdvance(n) { G.tut = n; this.tutRender(); },
  tutCheck() {
    if (!G.tutOn || G.tut >= this.TUT.length) return;
    const step = this.TUT[G.tut];
    if (step.done && step.done()) this.tutAdvance(G.tut + 1);
  },

  /* ================= selection ================= */
  select(kind, ref) {
    G.sel = { kind, ref };
    this.els.selCard.classList.remove('hidden');
    this.selRender();
  },
  selHide() { this.els.selCard.classList.add('hidden'); G.sel = null; },

  selRender() {
    const s = G.sel, el = this.els.selCard;
    if (!s) { el.classList.add('hidden'); return; }
    if (s.kind === 'v') {
      const v = s.ref;
      if (!G.villagers.includes(v)) return this.selHide();
      const tr = v.trait ? ` <span style="color:var(--amber2)">the ${U.esc(v.trait.name)}</span>` : '';
      let bars = `
        <div class="row"><span class="mLbl">HP</span><div class="meter mHP"><div style="width:${U.clamp(v.hp / v.maxHp * 100, 0, 100)}%"></div></div></div>
        <div class="row"><span class="mLbl">Food</span><div class="meter mHun"><div style="width:${U.clamp(v.hunger, 0, 100)}%"></div></div></div>`;
      const ji = JOBS.indexOf(v.job);
      const jobRow = `
        <div class="row" style="justify-content:space-between">
          <span style="font-size:12px;color:var(--dim)">Duty</span>
          <div class="jobArrows">
            <button id="selJobDown">&minus;</button>
            <b style="min-width:76px;text-align:center;font-size:13px;color:${JOB_INFO[v.job].cloth === '#e8e0d0' ? '#e8e0d0' : JOB_INFO[v.job].cloth}">${JOB_INFO[v.job].name}</b>
            <button id="selJobUp">+</button>
          </div>
        </div>`;
      const carry = v.carry.amt > 0 ? `<div class="sub">Carrying ${v.carry.amt} ${v.carry.type}</div>` : '';
      // banns & blessings: a bonded pair asks leave to wed
      const partner = v.partner != null ? G.villagers.find(o => o.id === v.partner) : null;
      const req = G.banns.find(r => r.a === v.id || r.b === v.id);
      const wed = partner ? `<div class="sub" style="color:#e88bd0">Wed to ${U.esc(partner.name)} — they work +10% side by side.</div>` : '';
      const bannsBtn = req && Wilds.canBless(req) ? `<button id="selBless">\u2661 Bless the banns</button>` : '';
      const state = { idle: 'waiting', toWork: 'heading out', work: 'working', toStore: 'hauling', shelter: 'sheltering', flee: 'fleeing!', fight: 'fighting!', arrive: 'arriving' }[v.state] || v.state;
      el.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center">
          <canvas id="selPortrait" width="48" height="48"></canvas>
          <div style="flex:1">
            <h3>${U.esc(v.name)}${tr}</h3>
            <div class="sub">${U.esc(state)}${v.trait ? ' \u00b7 ' + U.esc(v.trait.desc) : ''}</div>
          </div>
        </div>
        ${bars}${jobRow}${carry}${wed}
        <div class="selActs">
          ${bannsBtn}
          <button id="selFollow">${G.follow === v ? 'Unfollow' : 'Follow'}</button>
          ${v.job !== 'guard' ? '<button id="selShelter">To shelter</button>' : ''}
          <button id="selClose">Close</button>
        </div>`;
      const pc = document.getElementById('selPortrait').getContext('2d');
      pc.imageSmoothingEnabled = false;
      pc.drawImage(Art.villager(v.look, 0), 0, 0, 16, 16, 0, 0, 48, 48);
      const bl = document.getElementById('selBless');
      if (bl) bl.onclick = () => {
        const feast = G.res.ale >= CONFIG.BANNS.feastAle && G.res.food >= CONFIG.BANNS.feastFood;
        if (Wilds.bless(req)) this.selRender();
        else if (!feast) this.selRender();
      };
      document.getElementById('selJobDown').onclick = () => this.cycleJob(v, -1);
      document.getElementById('selJobUp').onclick = () => this.cycleJob(v, 1);
      document.getElementById('selFollow').onclick = () => { G.follow = G.follow === v ? null : v; this.selRender(); };
      const sh = document.getElementById('selShelter');
      if (sh) sh.onclick = () => {
        if (v.job === 'guard') return;
        v.state = 'shelter'; v.path = null; v.tgt = null; v.workB = null; v.tgtTile = null; v.fearT = 0;
        this.toast(`${v.name} heads for shelter.`, '');
        this.selRender();
      };
      document.getElementById('selClose').onclick = () => this.selHide();
    } else if (s.kind === 'm') {
      const m = s.ref;
      if (m.dead || !G.monsters.includes(m)) return this.selHide();
      el.innerHTML = `
        <h3 style="color:#ff9a9a">${U.esc(m.name)}</h3>
        <div class="sub">Damage ${m.dmg} \u00b7 Speed ${m.spd.toFixed(1)} \u00b7 ${m.burning > 0 ? 'burning in the light!' : 'hungry for the village'}</div>
        <div class="row"><span class="mLbl">HP</span><div class="meter mHP"><div style="width:${U.clamp(m.hp / m.maxHp * 100, 0, 100)}%;background:#e05555"></div></div></div>
        <div class="selActs"><button id="selClose">Close</button></div>`;
      document.getElementById('selClose').onclick = () => this.selHide();
    } else if (s.kind === 'o') {
      // a wild thing — a worksite, an ordered bush, or an ancient ruin
      const t = s.ref;
      const of = Bench.siteObj(t.tx, t.ty);
      let acts = '', note = '';
      if (t.o === OBJ.RUIN) {
        // Restoration: a ruin wakes as one unique ancient building
        const scribeReady = (G.jobs.scribe || 0) > 0 && Buildings.built('school');
        note = scribeReady
          ? 'A Scribe deciphers the script (~a minute\u2019s work), then Builders raise it.'
          : 'Restoration wants a Schoolhouse and a Scribe to read the script — then Builders.';
        for (const key of Wilds.ANCIENTS) {
          const def = BUILD[key];
          const c = Buildings.costOf(def);
          const afford = c.wood <= G.res.wood && c.stone <= G.res.stone;
          acts += `<button id="selRes_${key}" style="${afford ? '' : 'opacity:.5'}">\u2697 ${U.esc(def.name)}${c.wood ? ` ${c.wood}w` : ''}${c.stone ? ` ${c.stone}s` : ''}</button>`;
        }
        el.innerHTML = `
          <h3>Ancient Ruin</h3>
          <div class="sub">Older than any chronicle. Choose what it wakes as — which ruin you raise shapes the whole run.</div>
          <div class="sub" style="color:var(--amber)">${U.esc(note)}</div>
          <div class="selActs">${acts}<button id="selClose">Close</button></div>`;
        for (const key of Wilds.ANCIENTS) {
          const rb = document.getElementById('selRes_' + key);
          if (rb) rb.onclick = () => {
            if (Wilds.ruinRestore(t.tx, t.ty, key)) this.selHide();
            else this.selRender();
          };
        }
      } else if (t.o === OBJ.BUSH) {
        // Grovekeep: wild → tended → heavy-fruiting; cuttings plant new bushes
        const tnd = Wilds.tendAt(t.tx, t.ty);
        const nm = !tnd ? 'Berry Bush' : tnd.stage >= 2 ? 'Orchard Bush' : 'Tended Bush';
        const stage = !tnd ? 'Wild — pickable berries.'
          : tnd.stage >= 2 ? 'Heavy-fruiting — double berries, forever.'
            : 'Tended — +2 berries and quicker regrowth.';
        const prog = tnd && tnd.stage < 2
          ? `<div class="row"><span class="mLbl">Tending</span><div class="meter mGrow"><div style="width:${U.clamp(tnd.work / (CONFIG.GROVE.stageWork * (tnd.stage + 1)) * 100, 0, 100)}%"></div></div></div>` : '';
        if (!tnd) acts += `<button id="selTend">Tend (foragers)</button>`;
        else if (tnd.stage < 2) acts += `<button id="selTendOff">Cancel tending</button>`;
        if (G.cuttings >= 1) acts += `<button id="selPlantBush">Plant cutting (${G.cuttings})</button>`;
        if (of) acts += `<button id="selObjBench">\u270b ${U.esc(Bench.GAMES.find(g => g.id === of.id).name)}${Bench.handsLeft() > 0 ? '' : ' (no hands)'}</button>`;
        el.innerHTML = `
          <h3>${U.esc(nm)}</h3>
          <div class="sub">${U.esc(stage)}${of ? '' : ' The bench needs the right duty assigned to lend a hand here.'}</div>
          ${prog}
          <div class="selActs">${acts}<button id="selClose">Close</button></div>`;
        const tb = document.getElementById('selTend');
        if (tb) tb.onclick = () => {
          Wilds.orderTend(t.tx, t.ty);
          this.toast('A Forager will call on this bush across days.', 'good');
          this.selRender();
        };
        const to = document.getElementById('selTendOff');
        if (to) to.onclick = () => {
          G.tend.delete(World.idx(t.tx, t.ty));
          this.toast('Tending called off.', '');
          this.selRender();
        };
        const pb = document.getElementById('selPlantBush');
        if (pb) pb.onclick = () => { this.setMode({ type: 'plant', what: 'bush' }); };
      } else {
        const nm = { [OBJ.TREE]: 'Tree', [OBJ.PINE]: 'Pine', [OBJ.BIRCH]: 'Birch', [OBJ.ROCK]: 'Boulder' }[t.o] || 'Wilds';
        const amt = World.amtAt(t.tx, t.ty);
        const sub = t.o === OBJ.ROCK ? `${amt} stone left in it.` : `${amt} wood left in it.`;
        if (of) acts += `<button id="selObjBench">\u270b ${U.esc(Bench.GAMES.find(g => g.id === of.id).name)}${Bench.handsLeft() > 0 ? '' : ' (no hands)'}</button>`;
        el.innerHTML = `
          <h3>${U.esc(nm)}</h3>
          <div class="sub">${U.esc(sub)}${of ? '' : ' The bench needs the right duty assigned to lend a hand here.'}</div>
          <div class="selActs">${acts}<button id="selClose">Close</button></div>`;
      }
      const ob = document.getElementById('selObjBench');
      if (ob) ob.onclick = () => {
        if (!Bench.start(of.id, { tx: t.tx, ty: t.ty, o: t.o })) this.selRender();
      };
      document.getElementById('selClose').onclick = () => this.selHide();
    } else if (s.kind === 'd') {
      // the driven hunt: a deer herd grazing at the map's edge
      const h = s.ref;
      if (!G.herd || G.herd !== h) return this.selHide();
      const dir = h.spawn.x > World.W / 2 ? 'east' : h.spawn.x < World.W / 2 ? 'west' : 'the wilds';
      el.innerHTML = `
        <h3>Deer Herd</h3>
        <div class="sub">${h.deer.length} deer grazing to the ${dir}. ${h.hunt
          ? 'The hunt is on — your foragers are driving them. Lay or tend <b>spike traps</b> in their flight line; a deer that bolts into one is venison in the store.'
          : 'Set a hunt and two foragers spend the day driving the herd — toward the <b>spike traps</b> you laid, if you planned the ground. Otherwise they scatter at dusk.'}</div>
        ${h.caught ? `<div class="sub" style="color:var(--good,#7dc95e)">${h.caught} deer taken so far.</div>` : ''}
        <div class="selActs">
          ${h.hunt ? '<button id="selHuntOff">Call off the hunt</button>' : `<button id="selHunt">Set hunt (foragers)</button>`}
          <button id="selClose">Close</button>
        </div>`;
      const sh = document.getElementById('selHunt');
      if (sh) sh.onclick = () => { Wilds.setHunt(); this.selRender(); };
      const so = document.getElementById('selHuntOff');
      if (so) so.onclick = () => { Wilds.callOffHunt(); this.selRender(); };
      document.getElementById('selClose').onclick = () => this.selHide();
    } else if (s.kind === 'b') {
      const b = s.ref;
      if (!G.buildings.includes(b)) return this.selHide();
      if (b.key === 'lair') {
        const raiding = G.raidTarget === b;
        el.innerHTML = `
          <h3 style="color:#b48ae0">${U.esc(b.def.name)}</h3>
          <div class="sub">${U.esc(b.def.desc)}</div>
          <div class="row"><span class="mLbl">HP</span><div class="meter mHP"><div style="width:${U.clamp(b.hp / b.maxHp * 100, 0, 100)}%;background:#b48ae0"></div></div></div>
          <div class="selActs">
            <button id="selRaid" ${raiding ? 'style="border-color:var(--amber);color:var(--amber2)"' : ''}>${raiding ? 'Cancel Raid' : '\u2694 Raid!'}</button>
            <button id="selClose">Close</button>
          </div>`;
        document.getElementById('selRaid').onclick = () => {
          if (raiding) { G.raidTarget = null; this.toast('The guards stand down.', ''); }
          else {
            // refuse orders the guards physically can't reach (snapR 3 — a
            // monolith ringed by dead trees and graves still has ground to
            // stand on a little further out)
            const route = Path.find(World.center.x | 0, World.center.y | 0, b.x, b.y, { adjacent: true, snapR: 3 });
            if (!route) { this.toast('No route to that lair — the wilds are too thick. Clear a path with Clear Land.', 'bad'); return; }
            G.raidTarget = b;
            if (G.res.arrows >= CONFIG.AMMO.raidCost) {
              G.res.arrows -= CONFIG.AMMO.raidCost;
              this.toast(`Quivers loaded (${CONFIG.AMMO.raidCost} arrows) — RAID THE MONOLITH!`, 'good');
            } else {
              this.toast('RAID THE MONOLITH! But the quivers are dry — guards hit softer without arrows.', 'bad');
            }
          }
          this.selRender();
        };
        document.getElementById('selClose').onclick = () => this.selHide();
        return;
      }
      let extra = '';
      if (!b.built && b.phase === 'decipher') extra = `<div class="row"><span class="mLbl">Decipher</span><div class="meter mProg"><div style="width:${U.clamp((b.decT || 0) / CONFIG.RESTORE.decipherT * 100, 0, 100)}%"></div></div></div><div class="sub" style="color:var(--purple)">A Scribe reads the old script — Builders wait on the words.</div>`;
      else if (!b.built) extra = `<div class="row"><span class="mLbl">Build</span><div class="meter mProg"><div style="width:${(b.progress * 100).toFixed(0)}%"></div></div></div>`;
      else if (b.key === 'farm') extra = `<div class="row"><span class="mLbl">Wheat</span><div class="meter mGrow"><div style="width:${(b.growth * 100).toFixed(0)}%"></div></div></div>`;
      else if (b.def.kind === 'tower') extra = `<div class="sub">Damage ${b.def.atk.dmg} \u00b7 Range ${b.def.atk.range}</div>`;
      else if (b.def.housing) extra = `<div class="sub">Shelters ${b.def.housing}</div>`;
      else if (b.key === 'beacon') extra = `<div class="sub" style="color:var(--amber2)">${b.lit ? 'THE FLAME BURNS. Survive the Long Night!' : 'Unlit. Complete it to call the final dawn.'}</div>`;
      const dem = b.key === 'camp' ? '' : `<button class="warn" id="selDem">Demolish</button>`;
      const nd = b.built && !b.demo && b.def.next && BUILD[b.def.next] ? BUILD[b.def.next] : null;
      const up = nd ? `<button id="selUp">\u2b06 ${U.esc(nd.name)}</button>` : '';
      const upC = nd ? Buildings.costOf(nd) : null;
      const upCost = nd ? `${upC.wood || 0} wood${upC.stone ? ' \u00b7 ' + upC.stone + ' stone' : ''}` : '';
      const oldName = b.def.name;
      // ---- Daycraft: the guardian lends a hand at a ready worksite ----
      let benchActs = '', benchNote = '';
      if (b.built && !b.demo) {
        const of = Bench.site(b);
        if (of) {
          const gm = Bench.GAMES.find(g => g.id === of.id);
          const hands = Bench.handsLeft();
          benchActs += `<button id="selBench">\u270b ${U.esc(gm.name)}${hands > 0 ? '' : ' (no hands)'}</button>`;
          if (hands <= 0) benchNote = 'No warm hands left today — they refill at dawn.';
        }
        if (b.key === 'mine' && !Bench.seam) benchActs += `<button id="selSeam">\u2b07 Dig Deeper</button>`;
        if (b.key === 'nursery') {
          const sap = b.sap || 0;
          benchNote = `Every ${CONFIG.NURSERY.fellsPerSapling} felled trees pot a sapling here (${G.fellCount % CONFIG.NURSERY.fellsPerSapling} of the way).`;
          benchActs += `<button id="selPlantSap" ${sap ? '' : 'style="opacity:.55"'}>Plant sapling (${sap} potted)</button>`;
        }
        if (b.key === 'brazier' && !b.lit) {
          const can = G.res.wood >= CONFIG.BRAZIER.kindleWood && G.res.essence >= CONFIG.BRAZIER.kindleEss;
          benchActs += `<button id="selKindle" ${can ? '' : 'style="opacity:.55"'}>Kindle${Bench.handsLeft() > 0 ? ' \u270b' : ''}</button>`;
          if (!can) benchNote = `Kindling needs ${CONFIG.BRAZIER.kindleWood} wood + ${CONFIG.BRAZIER.kindleEss} essence in store.`;
        }
        if (b.key === 'muster') {
          const types = [['runner', 'shields'], ['brute', 'pikes'], ['stalker', 'scatter']];
          benchNote = 'Pick the drill — guards near the yard drill it in about a minute. Stacks to +30%.';
          for (const [t, nm] of types) {
            const cur = (G.drill[t] || 0), capped = cur >= CONFIG.MUSTER.bonusCap;
            benchActs += `<button id="selDrill_${t}" style="${capped ? 'opacity:.5;' : ''}${b.drillType === t ? 'border-color:var(--amber);color:var(--amber2)' : ''}">${nm}${capped ? ' \u2713' : ''} +${Math.round(cur * 100)}%</button>`;
          }
          benchActs += `<button id="selRally">\ud83d\udd14 Rally</button>`;
        }
      }
      el.innerHTML = `
        <h3>${U.esc(b.def.name)}</h3>
        <div class="sub">${U.esc(b.def.desc || '')}</div>
        <div class="row"><span class="mLbl">HP</span><div class="meter mHP"><div style="width:${U.clamp(b.hp / b.maxHp * 100, 0, 100)}%"></div></div></div>
        ${extra}
        ${b.built && b.key === 'brazier' && b.lit ? `<div class="sub" style="color:var(--amber2)">Burning — ${Math.max(0, Math.ceil(b.fuel || 0))}s of fuel left.</div>` : ''}
        ${b.built && b.key === 'muster' && b.drillType ? `<div class="sub">Drilling <b style="color:var(--amber2)">${{ runner: 'shields', brute: 'pikes', stalker: 'scatter' }[b.drillType]}</b> — ${(100 * U.clamp((b.drillT || 0) / CONFIG.MUSTER.drillT, 0, 1)).toFixed(0)}% done</div>` : ''}
        ${b.built && b.key === 'mine' ? `<div class="sub">Seam depth ${b.seamDepth || 0}${b.seamDay === G.day ? ' — dug out today' : ''}</div>` : ''}
        ${nd ? `<div class="sub" style="color:var(--amber2)">Upgrade in place: ${U.esc(nd.name)} — ${upCost}</div>` : ''}
        ${benchNote ? `<div class="sub" style="color:var(--amber)">${U.esc(benchNote)}</div>` : ''}
        <div class="selActs">${benchActs}${up}${dem}<button id="selClose">Close</button></div>`;
      const sb = document.getElementById('selBench');
      if (sb) sb.onclick = () => {
        const of = Bench.site(b);
        if (!of) { this.toast('The worksite has changed — nothing to lend a hand at.', ''); this.selRender(); return; }
        if (!Bench.start(of.id, { b })) this.selRender();
      };
      const ss = document.getElementById('selSeam');
      if (ss) ss.onclick = () => { Seam.start(b); };
      const sp = document.getElementById('selPlantSap');
      if (sp) sp.onclick = () => {
        if ((b.sap || 0) < 1) { this.toast('No saplings potted yet — the nursery pots one for every 2 felled trees.', 'bad'); return; }
        this.setMode({ type: 'plant', what: 'sapling' });
      };
      const sk = document.getElementById('selKindle');
      if (sk) sk.onclick = () => {
        if (Bench.handsLeft() > 0 && isDayLike()) { Bench.start('spark', { b }); return; }
        if (Sim.kindle(b, false)) this.updateHUD();
        else this.toast(`Kindling needs ${CONFIG.BRAZIER.kindleWood} wood + ${CONFIG.BRAZIER.kindleEss} essence.`, 'bad');
      };
      for (const t of ['runner', 'brute', 'stalker']) {
        const db = document.getElementById('selDrill_' + t);
        if (db) db.onclick = () => { b.drillType = t; b.drillT = 0; this.toast(`The yard drills ${ { runner: 'shields', brute: 'pikes', stalker: 'scatter' }[t]}.`, ''); this.selRender(); };
      }
      const sr = document.getElementById('selRally');
      if (sr) sr.onclick = () => { Sim.rally(b); };
      if (up) document.getElementById('selUp').onclick = () => {
        if (Buildings.upgrade(b)) {
          this.toast(`${nd.name} raised in place of the old ${oldName}.`, 'good');
          Sim.log(`${nd.name} raised in place of an older structure.`, 'good');
        } else this.toast(`Upgrade needs ${upCost} in store.`, 'bad');
        this.selRender();
        this.updateHUD();
      };
      if (dem) document.getElementById('selDem').onclick = () => {
        Buildings.demolish(b);
        this.toast(`Demolished ${b.def.name} — half the cost reclaimed.`, '');
        this.selHide();
      };
      document.getElementById('selClose').onclick = () => this.selHide();
    }
  },

  cycleJob(v, dir) {
    const i = JOBS.indexOf(v.job);
    let ni = i + dir;
    // workplace-gated duties (Medic, Fletcher, Smith, Cook, Brewer) skip in the cycle
    while (JOB_NEEDS[JOBS[ni]] && !Buildings.built(JOB_NEEDS[JOBS[ni]])) ni += dir;
    if (ni < 0 || ni >= JOBS.length) {
      const blocked = JOBS.filter(j => JOB_NEEDS[j] && !Buildings.built(JOB_NEEDS[j]));
      if (blocked.length) this.toast(`Some duties need their workplace built first (${blocked.map(j => JOB_INFO[j].name).join(', ')}).`, '');
      return;
    }
    if (ni === i) return;
    if (JOBS[i] !== 'idle') G.jobs[JOBS[i]] = Math.max(0, (G.jobs[JOBS[i]] || 0) - 1);
    if (JOBS[ni] !== 'idle') G.jobs[JOBS[ni]] = (G.jobs[ni] || 0) + 1;
    Sim.setJob(v, JOBS[ni]);
    this.selRender();
  },

  /* ================= panels ================= */
  openPanel(name) {
    this.open = name;
    this.els.panel.classList.remove('hidden');
    this.els.panelBack.classList.remove('hidden');
    const B = this.els.panelBody;
    const T = this.els.panelTitle;
    const xBtn = '<button class="x" id="panelX">\u2715</button>';
    if (name === 'build') {
      this._buildCat = this._buildCat || 'basics';
      T.innerHTML = 'Build' + xBtn;
      B.innerHTML = '';
      B.appendChild(this.buildGrid(this._buildCat));
    } else if (name === 'jobs') {
      T.innerHTML = 'Jobs' + xBtn;
      B.innerHTML = '';
      B.appendChild(this.jobsList());
    } else if (name === 'powers') {
      T.innerHTML = 'Guardian Powers' + xBtn;
      B.innerHTML = '';
      B.appendChild(this.powersList());
    } else if (name === 'materials') {
      T.innerHTML = 'Materials' + xBtn;
      B.innerHTML = '';
      B.appendChild(this.materialsList());
    } else if (name === 'menu') {
      T.innerHTML = 'Menu' + xBtn;
      B.innerHTML = '';
      B.appendChild(this.menuList());
    } else if (name === 'chronicle') {
      T.innerHTML = 'Chronicle of Dawnhold' + xBtn;
      B.innerHTML = '';
      B.appendChild(this.chronicleList());
    } else if (name === 'slots') {
      T.innerHTML = (this._slotMode === 'save' ? 'Save Game' : 'Load Game') + xBtn;
      B.innerHTML = '';
      B.appendChild(this.slotsList());
    } else if (name === 'settings') {
      T.innerHTML = 'Settings' + xBtn;
      B.innerHTML = '';
      B.appendChild(this.settingsList());
    }
    const px = document.getElementById('panelX');
    if (px) px.onclick = () => this.closePanel();
  },

  closePanel() {
    this.open = null;
    this.els.panel.classList.add('hidden');
    this.els.panelBack.classList.add('hidden');
  },

  buildGrid(cat) {
    const wrap = document.createElement('div');
    // category tabs
    const tabs = document.createElement('div');
    tabs.className = 'catTabs';
    [['basics', 'Basics'], ['defense', 'Defense'], ['mystic', 'Mystic']].forEach(([k, label]) => {
      const b = document.createElement('button');
      b.className = 'catTab' + (cat === k ? ' on' : '');
      b.textContent = label;
      b.onclick = () => { this._buildCat = k; this.openPanel('build'); };
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);

    const hint = document.createElement('div');
    hint.className = 'jnote';
    hint.innerHTML = 'Tap a card to pick a site — or drag its <b>\u283f</b> edge straight onto the map. Drag anywhere else to scroll the menu.';
    wrap.appendChild(hint);

    const grid = document.createElement('div');
    grid.className = 'bgrid';
    const keys = Object.keys(BUILD).filter(k => BUILD[k].cat === cat);
    // day-locked cards sink to the bottom of their category and rejoin the
    // top group the moment they unlock (stable sort keeps roster order)
    keys.sort((a, b) => (G.unlocks[a] ? 0 : 1) - (G.unlocks[b] ? 0 : 1));
    if (cat === 'basics' || cat === 'defense') keys.push('__demolish');
    if (cat === 'basics') { keys.push('__clear'); keys.push('__dig'); }
    if (cat === 'mystic') { keys.push('__sigilWard'); keys.push('__sigilHallow'); }
    for (const k of keys) {
      if (k === '__demolish') {
        const card = document.createElement('button');
        card.className = 'bcard' + (this.mode && this.mode.type === 'demolish' ? ' sel' : '');
        card.innerHTML = `<canvas width="16" height="16" style="background:#3a2020"></canvas>
          <div><div class="bn">Demolish</div><div class="bc"><span>reclaims 50%</span></div>
          <div class="bd">Tear buildings down — half the cost comes back. Drag across walls.</div></div>`;
        card.onclick = () => { if (this.afterPop()) return; this.setMode({ type: 'demolish' }); this.closePanel(); };
        this.drawCardIcon(card, 'wallW', true);
        this.holdInfo(card, '<b>Demolish</b> — builders tear the building down and half its cost is refunded. Tap an order again to cancel. Drag across walls to clear a whole line.');
        grid.appendChild(card);
        continue;
      }
      if (k === '__clear') {
        const card = document.createElement('button');
        card.className = 'bcard' + (this.mode && this.mode.type === 'clear' ? ' sel' : '');
        card.innerHTML = `<canvas width="16" height="16" style="background:#2a3320"></canvas>
          <div><div class="bn">Clear Land</div><div class="bc"><span>builders</span></div>
          <div class="bd">Mark trees, rocks & ruins — or fill shore water (${CONFIG.CLEAR.waterCost} stone a tile).</div></div>`;
        card.onclick = () => { if (this.afterPop()) return; this.setMode({ type: 'clear' }); this.closePanel(); };
        this.drawCardIcon(card, 'tree0', true);
        this.holdInfo(card, `<b>Clear Land</b> — mark trees, boulders, berry bushes, ruins or crystals and a Builder clears the tile (half the yield is salvaged). Tap shore water to fill it with stone (${CONFIG.CLEAR.waterCost} stone a tile) and make new land. Tap again to cancel.`);
        grid.appendChild(card);
        continue;
      }
      if (k === '__dig') {
        const card = document.createElement('button');
        card.className = 'bcard' + (this.mode && this.mode.type === 'dig' ? ' sel' : '');
        card.innerHTML = `<canvas width="16" height="16" style="background:#2a2a33"></canvas>
          <div><div class="bn">The Spade</div><div class="bc"><span>builders</span></div>
          <div class="bd">Mark dry tiles — a Builder digs them down to pond water. Reeds (herbs) sprout at the margin.</div></div>`;
        card.onclick = () => { if (this.afterPop()) return; this.setMode({ type: 'dig' }); this.closePanel(); };
        this.drawCardIcon(card, 'dirt', true);
        this.holdInfo(card, `<b>The Spade</b> — mark dry, open ground and a Builder carves the tile down until water springs (about ${CONFIG.SPADE.digTime}s a tile). Ponds let Fishing Docks sit inland and grow <b>reeds</b> — herbs at the margin. Tap a mark again to cancel.`);
        grid.appendChild(card);
        continue;
      }
      if (k === '__sigilWard' || k === '__sigilHallow') {
        const kind = k === '__sigilWard' ? 'ward' : 'hallow';
        const card = document.createElement('button');
        card.className = 'bcard' + (this.mode && this.mode.type === 'sigil' && this.mode.kind === kind ? ' sel' : '');
        card.innerHTML = `<canvas width="16" height="16" style="background:#20242e"></canvas>
          <div><div class="bn">${kind === 'ward' ? 'Ward Sigil' : 'Hallow Sigil'}</div><div class="bc"><span>1 herb + 1 charcoal</span></div>
          <div class="bd">${kind === 'ward' ? 'Chalk a line — monsters crossing it at night slow down and take +25% damage.' : 'Chalk a circle — your folk inside hold their ground; guards strike +10%.'}</div></div>`;
        card.onclick = () => { if (this.afterPop()) return; this.setMode({ type: 'sigil', kind }); this.closePanel(); };
        this.drawCardIcon(card, kind === 'ward' ? 'ic_ward' : 'ic_hallow', true);
        this.holdInfo(card, `<b>${kind === 'ward' ? 'Ward' : 'Hallow'} Sigil</b> — drag on open ground to draw the chalk (each stroke is one sigil; six hold at once). Salting it costs 1 herb + 1 charcoal, it charges through the day, and at dusk it ${kind === 'ward' ? 'blooms: monsters crossing the chalk crawl at half speed and take +25% damage.' : 'blooms: villagers inside won\u2019t break and run, and guards strike +10% harder.'} Dawn washes the chalk away.`);
        grid.appendChild(card);
        continue;
      }
      const def = BUILD[k];
      const unlocked = !!G.unlocks[k];
      const afford = Buildings.afford(k);
      const card = document.createElement('button');
      card.className = 'bcard' + (unlocked ? '' : ' locked') + (unlocked && !afford ? ' poor' : '') + (this.mode && this.mode.type === 'build' && this.mode.key === k ? ' sel' : '');
      const cc = Buildings.costOf(def); // A5: costs shown are costs charged
      const cost = Object.entries(def.cost).map(([r]) =>
        `<span class="cchip${G.res[r] < cc[r] ? ' no' : ''}" data-r="${r}">${cc[r]}</span>`).join('');
      card.innerHTML = `
        <span class="bgrab" title="Drag from here to place straight onto the map">\u283f</span>
        <canvas width="44" height="44"></canvas>
        <div><div class="bn">${U.esc(def.name)}</div>
        <div class="bc">${cost}</div>
        <div class="bd">${U.esc(def.short || def.desc)}${unlocked ? '' : `<br><b style="color:var(--amber)">Unlocks day ${def.unlock}</b>`}</div></div>`;
      this.drawCardIcon(card, k, !unlocked);
      for (const s of card.querySelectorAll('.cchip')) s.prepend(Art.iconEl(s.dataset.r));
      this.holdInfo(card, `<b>${U.esc(def.name)}</b> — ${U.esc(def.desc)}${unlocked ? '' : `<br><i style="color:var(--amber)">Unlocks day ${def.unlock}.</i>`}`);
      card.onclick = () => {
        if (this._cardDragged) { this._cardDragged = false; return; } // drag just ended — not a click
        if (this.afterPop()) return; // the release that ended a hold — not a tap
        if (!unlocked) { this.toast(`Unlocks on day ${def.unlock}.`, ''); return; }
        if (!afford) { this.toast(`Not enough resources for ${def.name}.`, 'bad'); return; }
        this.setMode({ type: 'build', key: k });
        this.closePanel();
      };
      // drag the card straight out onto the map — the building ghost rides
      // the finger; release parks it, then a tap on the outline builds.
      // On touch only the ⠿ grip starts the drag; the rest of the card is
      // scroll room (the browser claims the gesture otherwise)
      card.onpointerdown = e => {
        if (!unlocked || !afford) return;
        if (e.pointerType === 'touch' && !(e.target && e.target.closest && e.target.closest('.bgrab'))) return;
        try { card.setPointerCapture(e.pointerId); } catch (err) { /* already gone */ }
        this._cardDrag = { key: k, x: e.clientX, y: e.clientY, moved: false };
      };
      card.onpointermove = e => {
        const dg = this._cardDrag;
        if (!dg) return;
        if (!dg.moved) {
          if (Math.hypot(e.clientX - dg.x, e.clientY - dg.y) < 12) return;
          dg.moved = true;
          this.setMode({ type: 'build', key: dg.key });
          this.closePanel();
        }
        const w = Render.screenToWorld(e.clientX, e.clientY);
        const d = BUILD[dg.key];
        this.ghost = { x: (w.x / 16 | 0) - ((d.w - 1) >> 1), y: (w.y / 16 | 0) - ((d.h - 1) >> 1) };
      };
      card.onpointerup = () => {
        if (this._cardDrag && this._cardDrag.moved) {
          this._ghostParked = true;   // ghost stays where it landed
          this._cardDragged = true;   // swallow the trailing click
        }
        this._cardDrag = null;
      };
      card.onpointercancel = () => { this._cardDrag = null; };
      grid.appendChild(card);
    }
    wrap.appendChild(grid);
    return wrap;
  },

  drawCardIcon(card, key, locked) {
    const cv = card.querySelector('canvas');
    if (!(cv instanceof HTMLCanvasElement)) return;
    const x = cv.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, cv.width, cv.height);
    if (locked) x.globalAlpha = 0.4;
    const MAP = { farm: 'farm3', windmill: 'windmill0', torch: 'torch0', herbalistHut: 'herbalist', road: 'road0' };
    let spr = Art.s[MAP[key] || key];
    if (key === '__demolish' || !spr) spr = Art.s.wallW;
    const s = Math.min(cv.width / spr.width, cv.height / spr.height);
    const w = spr.width * s, h = spr.height * s;
    x.drawImage(spr, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
    x.globalAlpha = 1;
  },

  jobsList() {
    const wrap = document.createElement('div');
    const pop = G.villagers.length;
    const sum = JOBS.filter(j => j !== 'idle').reduce((s, j) => s + (G.jobs[j] || 0), 0);
    const cm = Sim.contentment();
    const note = document.createElement('div');
    note.className = 'jnote';
    note.innerHTML = `Villagers <b>${pop}</b> \u00b7 Assigned <b>${Math.min(sum, pop)}</b> \u00b7 Resting <b>${Math.max(0, pop - sum)}</b> \u00b7 Housing <b>${cm.label}</b> \u00d7${cm.mult.toFixed(2)}<br>Tap <b>+</b>/<b>&minus;</b> to reassign — hold a card for the full story.`;
    wrap.appendChild(note);
    // compact card grid: tiny rows fit every duty on one screen; the whole
    // story lives behind a press-and-hold
    const lockedJ = j => !!(JOB_NEEDS[j] && !Buildings.built(JOB_NEEDS[j]));
    const ordered = JOBS.filter(j => j !== 'idle');
    ordered.sort((a, b) => (lockedJ(a) ? 1 : 0) - (lockedJ(b) ? 1 : 0));
    const grid = document.createElement('div');
    grid.className = 'jgrid';
    for (const j of ordered) {
      const info = JOB_INFO[j];
      const locked = lockedJ(j);
      const row = document.createElement('div');
      row.className = 'jrow' + (locked ? ' locked' : '');
      const icon = document.createElement('canvas');
      icon.width = 16; icon.height = 16;
      const ix = icon.getContext('2d');
      ix.imageSmoothingEnabled = false;
      ix.drawImage(Art.villager({ skin: 1, hair: 1, cloth: info.cloth, guard: j === 'guard' }, 0), 0, 0);
      const top = document.createElement('div');
      top.className = 'jtop';
      top.appendChild(icon);
      const nm = document.createElement('div');
      nm.className = 'jn';
      nm.textContent = info.name;
      top.appendChild(nm);
      const cnt = document.createElement('div');
      cnt.className = 'cnt';
      cnt.textContent = (G.jobs[j] || 0);
      top.appendChild(cnt);
      row.appendChild(top);
      const btns = document.createElement('div');
      btns.className = 'jbtns';
      const minus = document.createElement('button');
      minus.textContent = '\u2212';
      minus.onclick = () => {
        G.jobs[j] = Math.max(0, (G.jobs[j] || 0) - 1);
        Sim.reassign(); this.openPanel('jobs'); this.updateHUD();
      };
      const plus = document.createElement('button');
      plus.textContent = '+';
      plus.onclick = () => {
        if (locked) { this.toast(`Build a ${BUILD[JOB_NEEDS[j]].name} first.`, 'bad'); return; }
        const s2 = JOBS.filter(jj => jj !== 'idle').reduce((s, jj) => s + (G.jobs[jj] || 0), 0);
        if (s2 >= pop) { this.toast('No one is resting — every soul has a duty.', ''); return; }
        G.jobs[j] = (G.jobs[j] || 0) + 1;
        Sim.reassign(); this.openPanel('jobs'); this.updateHUD();
      };
      btns.appendChild(minus); btns.appendChild(plus);
      row.appendChild(btns);
      this.holdInfo(row, locked
        ? `<b>${info.name}</b> — needs a built ${U.esc(BUILD[JOB_NEEDS[j]].name)} first.`
        : `<b>${info.name}</b> — ${U.esc(info.desc)}`);
      grid.appendChild(row);
    }
    wrap.appendChild(grid);
    return wrap;
  },

  powersList() {
    const wrap = document.createElement('div');
    const note = document.createElement('div');
    note.className = 'jnote';
    note.innerHTML = `Essence: <b style="color:var(--purple)">${Math.floor(G.res.essence)} / ${CONFIG.ESSENCE.max}</b> — seeps in with time, surges with every kill. Shrines (day 8) hasten it.`;
    wrap.appendChild(note);
    for (const k in POWERS) {
      const p = POWERS[k];
      const un = Powers.unlocked(k);
      const afford = Powers.canAfford(k);
      const card = document.createElement('button');
      card.className = 'pcard' + (un ? '' : ' locked') + (this.mode && this.mode.type === 'power' && this.mode.key === k ? ' sel' : '');
      card.innerHTML = `
        <div><div class="pn">${p.name} <span class="cost">${p.cost} essence</span></div>
        <div class="pd">${p.desc}${un ? '' : `<br><b style="color:var(--purple)">Unlocks day ${p.unlockDay}</b>`}</div></div>`;
      const cv = document.createElement('canvas');
      cv.width = 16; cv.height = 16;
      const x = cv.getContext('2d');
      x.imageSmoothingEnabled = false;
      if (k === 'smite') x.drawImage(Art.s.spark, 0, 0, 4, 4, 1, 1, 14, 14);
      else if (k === 'meteor') x.drawImage(Art.s.meteor, 0, 0, 7, 7, 1, 1, 14, 14);
      else x.drawImage(Art.s.ic_essence, 0, 0);
      card.prepend(cv);
      card.onclick = () => {
        if (!un) { this.toast(`Meteor unlocks on day ${p.unlockDay}.`, ''); return; }
        if (!afford) { this.toast('Not enough essence.', 'bad'); return; }
        this.setMode({ type: 'power', key: k });
        this.closePanel();
      };
      wrap.appendChild(card);
    }
    return wrap;
  },

  /* ================= materials tab ================= */
  materialsList() {
    const wrap = document.createElement('div');

    // the Map button's new home — off the bottom dock
    const mmRow = document.createElement('div');
    mmRow.className = 'toggleRow';
    mmRow.innerHTML = '<span>Minimap <small style="color:var(--dim);font-weight:400">— the little map, top right</small></span>';
    const mmBtn = document.createElement('button');
    mmBtn.className = 'togBtn' + (!this.els.mmWrap.classList.contains('hidden') ? ' on' : '');
    mmBtn.onclick = () => {
      this.els.mmWrap.classList.toggle('hidden');
      mmBtn.classList.toggle('on', !this.els.mmWrap.classList.contains('hidden'));
    };
    mmRow.appendChild(mmBtn);
    wrap.appendChild(mmRow);

    const note = document.createElement('div');
    note.className = 'jnote';
    note.innerHTML = 'Shown materials line up in the top bar, most vital first. Drag a row\u2019s <b>\u283f</b> to reorder it; <b>Show/Hide</b> picks what the bar carries. Everything keeps gathering while hidden.';
    wrap.appendChild(note);

    const order = this.matOrder();
    const pin = G.settings.matPin || (G.settings.matPin = {});
    const hid = G.settings.matHidden || (G.settings.matHidden = {});
    const list = document.createElement('div');
    for (const k of order) {
      const m = this.matBy(k);
      const shown = this.matShown(m);
      const row = document.createElement('div');
      row.className = 'matRow' + (shown ? '' : ' off');

      const grip = document.createElement('div');
      grip.className = 'grip';
      grip.textContent = '\u283f';
      grip.title = 'Drag to reorder';
      row.appendChild(grip);

      row.appendChild(Art.iconEl(m.icon));
      const txt = document.createElement('div');
      txt.style.flex = '1';
      txt.innerHTML = `<div class="mn">${U.esc(m.n)}</div><div class="md">${U.esc(m.d)}</div>`;
      row.appendChild(txt);

      const stock = document.createElement('div');
      stock.className = 'stock';
      stock.id = 'matVal_' + m.k;
      stock.innerHTML = this.matStockHTML(m.k);
      row.appendChild(stock);

      const eye = document.createElement('button');
      eye.className = 'eyeBtn';
      eye.textContent = shown ? 'Hide' : 'Show';
      eye.onclick = () => {
        pin[m.k] = true; // a manual choice stops the auto rules for this material
        if (shown) hid[m.k] = true; else delete hid[m.k];
        this.layoutResRow();
        this.openPanel('materials');
      };
      row.appendChild(eye);

      this.matDrag(list, row, grip);
      list.appendChild(row);
    }
    wrap.appendChild(list);

    const rst = document.createElement('button');
    rst.className = 'mbtn';
    rst.innerHTML = 'Reset bar to defaults <small>default order &amp; visibility</small>';
    rst.onclick = () => {
      delete G.settings.matOrder; delete G.settings.matPin; delete G.settings.matHidden;
      this.layoutResRow();
      this.openPanel('materials');
    };
    wrap.appendChild(rst);
    return wrap;
  },

  // drag a materials row by its grip; neighbours slide aside and the order
  // commits on release (touch drags elsewhere in the panel just scroll)
  matDrag(list, row, grip) {
    grip.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { grip.setPointerCapture(e.pointerId); } catch (err) { /* already gone */ }
      const rows = [...list.children].filter(r => r.classList.contains('matRow'));
      const idx0 = rows.indexOf(row);
      const h = row.offsetHeight + 7; // row + margin
      let idx = idx0;
      row.classList.add('drag');
      const move = ev => {
        const dy = ev.clientY - e.clientY;
        row.style.transform = `translateY(${dy}px)`;
        const pr = this.els.panelBody.getBoundingClientRect();
        if (ev.clientY < pr.top + 48) this.els.panelBody.scrollTop -= 8;
        else if (ev.clientY > pr.bottom - 48) this.els.panelBody.scrollTop += 8;
        idx = U.clamp(idx0 + Math.round(dy / h), 0, rows.length - 1);
        rows.forEach((r, i) => {
          if (r === row) return;
          let off = 0;
          if (i > idx0 && i <= idx) off = -h;
          else if (i < idx0 && i >= idx) off = h;
          r.style.transition = 'transform .12s';
          r.style.transform = off ? `translateY(${off}px)` : '';
        });
      };
      const finish = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', finish);
        grip.removeEventListener('pointercancel', finish);
        if (idx !== idx0) {
          const ord = UI.matOrder();
          const [k] = ord.splice(idx0, 1);
          ord.splice(idx, 0, k);
          G.settings.matOrder = ord;
          UI.layoutResRow();
        }
        UI.openPanel('materials');
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', finish);
      grip.addEventListener('pointercancel', finish);
    });
  },

  menuList() {
    const wrap = document.createElement('div');
    const btn = (label, sub, fn, warn) => {
      const b = document.createElement('button');
      b.className = 'mbtn' + (warn ? ' warn' : '');
      b.innerHTML = label + (sub ? `<small>${sub}</small>` : '');
      b.onclick = fn;
      wrap.appendChild(b);
      return b;
    };
    const s = G.stats;
    const stats = document.createElement('div');
    stats.className = 'statgrid';
    stats.innerHTML = `
      <div class="stat"><div class="v">${G.day}</div><div class="l">Day</div></div>
      <div class="stat"><div class="v">${G.villagers.length}</div><div class="l">Souls</div></div>
      <div class="stat"><div class="v">${s.kills}</div><div class="l">Kills</div></div>
      <div class="stat"><div class="v">${s.deaths}</div><div class="l">Lost</div></div>`;
    wrap.appendChild(stats);
    btn('Chronicle', 'The story so far', () => this.openPanel('chronicle'));
    btn('Save Game', 'Three slots + auto at dawn', () => { this._slotMode = 'save'; this.openPanel('slots'); });
    btn('Load Game', 'Return to a saved dawn', () => { this._slotMode = 'load'; this.openPanel('slots'); });
    btn('How to Play', 'The full manual', () => { this.closePanel(); document.getElementById('helpScreen').classList.remove('hidden'); });
    btn('Settings', 'Effects & autosave', () => this.openPanel('settings'));
    btn('Quit to Title', 'Progress is autosaved at dawn', () => {
      if (G.settings.autosave) SaveSys.autosave();
      if (Bench.seam) Seam.finishSession();
      if (Bench.active) Bench.close();
      G.state = 'title';
      this.closePanel();
      document.getElementById('titleScreen').classList.remove('hidden');
      this.els.hud.classList.add('hidden'); this.els.dock.classList.add('hidden');
      this.els.mmWrap.classList.add('hidden');
      document.getElementById('handsWrap').classList.add('hidden');
      this.selHide(); this.cancelMode();
      document.getElementById('btnContinue').classList.remove('hidden');
    });
    btn('Abandon & New Game', 'Start over on a fresh map', () => {
      if (!confirm('Abandon this village and start a new game?')) return;
      if (Bench.seam) Seam.finishSession();
      if (Bench.active) Bench.close();
      this.closePanel();
      G.state = 'title';
      document.getElementById('titleScreen').classList.remove('hidden');
      document.getElementById('diffPick').classList.remove('hidden');
      document.getElementById('btnNew').classList.add('hidden');
      this.els.hud.classList.add('hidden'); this.els.dock.classList.add('hidden'); this.els.mmWrap.classList.add('hidden');
      document.getElementById('handsWrap').classList.add('hidden');
    }, true);
    return wrap;
  },

  chronicleList() {
    const wrap = document.createElement('div');
    if (!G.chronicle.length) wrap.innerHTML = '<div class="jnote">The chronicle is still blank...</div>';
    for (let i = G.chronicle.length - 1; i >= 0; i--) {
      const c = G.chronicle[i];
      const d = document.createElement('div');
      d.className = 'chron ' + (c.k || '');
      d.innerHTML = `<b>Day ${c.d}</b> — ${U.esc(c.txt)}`;
      wrap.appendChild(d);
    }
    return wrap;
  },

  slotsList() {
    const wrap = document.createElement('div');
    const slots = ['auto', 1, 2, 3];
    for (const s of slots) {
      const meta = SaveSys.readMeta(s);
      const row = document.createElement('div');
      row.className = 'slotRow';
      const label = s === 'auto' ? 'Autosave' : 'Slot ' + s;
      const when = meta ? new Date(meta.when).toLocaleString() : '';
      row.innerHTML = `<div class="info"><b>${label}</b><br>${meta ? `Day ${meta.day} \u00b7 ${meta.diff} \u00b7 ${meta.pop} souls \u00b7 ${when}` : 'empty'}</div>`;
      if (this._slotMode === 'save') {
        if (s !== 'auto') {
          const b = document.createElement('button');
          b.textContent = 'Save';
          b.disabled = G.state !== 'playing';
          b.onclick = () => { SaveSys.save(s); this.openPanel('slots'); };
          row.appendChild(b);
        }
      } else {
        if (meta && meta.v === CONFIG.SAVE_V) {
          const b = document.createElement('button');
          b.textContent = 'Load';
          b.onclick = () => {
            if (SaveSys.load(s)) {
              this.closePanel();
              document.getElementById('titleScreen').classList.add('hidden');
              this.showGameUI();
            }
          };
          row.appendChild(b);
          const d = document.createElement('button');
          d.textContent = '\u2715';
          d.onclick = () => { SaveSys.del(s); this.openPanel('slots'); };
          row.appendChild(d);
        }
      }
      wrap.appendChild(row);
    }
    return wrap;
  },

  settingsList() {
    const wrap = document.createElement('div');
    const mk = (label, key) => {
      const row = document.createElement('div');
      row.className = 'toggleRow';
      row.innerHTML = `<span>${label}</span>`;
      const b = document.createElement('button');
      b.className = 'togBtn' + (G.settings[key] ? ' on' : '');
      b.onclick = () => { G.settings[key] = !G.settings[key]; b.classList.toggle('on', G.settings[key]); };
      row.appendChild(b);
      wrap.appendChild(row);
    };
    mk('Effects (fireflies, sparks, lighting detail)', 'fx');
    mk('Autosave at dawn', 'autosave');
    return wrap;
  },

  /* ================= mode / ghost ================= */
  setMode(m) {
    this.mode = m;
    this.ghost = null;
    this._ghostParked = false;
    // an abandoned (or switched) sigil draft washes away
    if (G.sigilDraft && (!m || m.type !== 'sigil' || m.kind !== G.sigilDraft.kind)) Wilds.draftCancel();
    const chip = this.els.modeChip;
    if (!m) { chip.classList.add('hidden'); return; }
    // placement owns the bottom of the screen — drop any open selection card
    this.selHide();
    chip.classList.remove('hidden');
    if (m.type === 'build') {
      const def = BUILD[m.key];
      this.els.modeChipText.textContent = def.paint
        ? `Placing: ${def.name} — tap or drag to paint`
        : `Placing: ${def.name} — drag to aim, tap the outline to build`;
    } else if (m.type === 'demolish') {
      this.els.modeChipText.textContent = 'Demolish — tap buildings';
    } else if (m.type === 'clear') {
      this.els.modeChipText.textContent = 'Clear Land — trees, rocks & shore water';
    } else if (m.type === 'dig') {
      this.els.modeChipText.textContent = 'The Spade — tap dry tiles to carve ponds';
    } else if (m.type === 'plant') {
      this.els.modeChipText.textContent = m.what === 'bush' ? `Plant cutting — tap grass (${G.cuttings} in store)` : `Plant sapling — tap grass (${(Wilds.nursery() ? Wilds.nursery().sap : 0) || 0} potted)`;
    } else if (m.type === 'sigil') {
      this.els.modeChipText.textContent = m.kind === 'ward' ? 'Ward sigil — drag to chalk a line (1 herb + 1 charcoal)' : 'Hallow sigil — drag to chalk a circle (1 herb + 1 charcoal)';
    } else if (m.type === 'power') {
      this.els.modeChipText.textContent = `${POWERS[m.key].name} — tap target`;
    }
  },
  cancelMode() { this.setMode(null); },

  tryPlace(tileX, tileY) {
    const m = this.mode;
    if (!m) return;
    if (m.type === 'build') {
      const def = BUILD[m.key];
      const gx = tileX - ((def.w - 1) >> 1), gy = tileY - ((def.h - 1) >> 1);
      const chk = Buildings.canPlace(m.key, gx, gy);
      if (!chk.ok) {
        if (chk.reason && performance.now() - this._lastPlaceFail > 900) {
          this._lastPlaceFail = performance.now();
          this.toast(chk.reason, 'bad');
        }
        return;
      }
      if (!Buildings.afford(m.key)) {
        if (performance.now() - this._lastPlaceFail > 900) {
          this._lastPlaceFail = performance.now();
          this.toast('Not enough resources.', 'bad');
        }
        return;
      }
      const r = Buildings.place(m.key, gx, gy);
      if (r) {
        this.updateHUD();
        if (!def.paint && def.kind !== 'wall') this.toast(`${def.name} staked out — a Builder will raise it.`, '');
      }
    } else if (m.type === 'demolish') {
      const b = World.bldAt(tileX, tileY);
      if (!b || b.key === 'camp') return;
      if (!b.built) { Buildings.demolish(b); this.updateHUD(); return; } // unstarted sites go instantly
      if (b.demo) {
        b.demo = false; b.hp = b.maxHp; b.progress = Math.max(b.progress, 1);
        for (const v of G.villagers) if (v.workB === b && v.workMode === 'demolish') { v.workB = null; v.state = 'idle'; v.path = null; }
        this.toast(`${b.def.name}: demolition cancelled.`, '');
      } else {
        Sim.orderDemolish(b);
        this.toast(`${b.def.name} marked for demolition — a Builder will tear it down.`, '');
      }
      this.updateHUD();
    } else if (m.type === 'clear') {
      const r = Sim.toggleClearJob(tileX, tileY);
      if (r === 'off') this.toast('Order cancelled.', '');
      else if (r === 'water') this.toast('A Builder will fill this water with stone.', '');
      else if (r === 'on') this.toast('A Builder will clear this tile.', '');
      this.updateHUD();
    } else if (m.type === 'dig') {
      const r = Wilds.toggleDig(tileX, tileY);
      if (r === 'off') this.toast('Dig order cancelled.', '');
      else if (r === 'on') this.toast('A Builder will dig this tile down to water.', '');
      else this.toast('The Spade needs dry, open ground.', 'bad');
      this.updateHUD();
    } else if (m.type === 'plant') {
      const ok = m.what === 'bush' ? Wilds.plantBush(tileX, tileY) : Wilds.plantSapling(tileX, tileY);
      if (ok) {
        this.toast(m.what === 'bush' ? 'The cutting takes root — a wild bush, yours now.' : 'The sapling is planted — a grove begins.', 'good');
        this.updateHUD();
      } else if (m.what === 'bush' && G.cuttings < 1) {
        this.toast('No cuttings in store — tend wild bushes to spare some.', 'bad');
      } else if (m.what === 'sapling' && !(Wilds.nursery() && (Wilds.nursery().sap || 0) >= 1)) {
        this.toast('No saplings potted — the nursery pots one for every 2 felled trees.', 'bad');
      } else {
        this.toast('Plants need open grass or dirt.', 'bad');
      }
    } else if (m.type === 'sigil') {
      // a tap with no drag chalks a single tile
      if (!isDayLike()) { this.toast('Sigils are chalked by day — the dusk wakes them.', 'bad'); return; }
      if (!G.sigilDraft) Wilds.draftStart(m.kind);
      Wilds.draftAdd(tileX, tileY);
      Wilds.draftCommit();
    } else if (m.type === 'power') {
      Powers.cast(m.key, tileX + 0.5, tileY + 0.5);
      this.updateHUD();
      if (G.res.essence < POWERS[m.key].cost) this.cancelMode();
    }
  },

  /* ================= input ================= */
  input() {
    const cv = Render.cv;
    cv.addEventListener('pointerdown', e => {
      this._pt.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false });
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* pointer may already be released */ }
      if (this._pt.size === 2) {
        const pts = [...this._pt.values()];
        const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
        this._pinch = {
          d0: Math.hypot(dx, dy) || 1, z0: G.cam.z,
          mx: (pts[0].x + pts[1].x) / 2, my: (pts[0].y + pts[1].y) / 2,
        };
        this._panning = false;
      }
      e.preventDefault();
    }, { passive: false });

    cv.addEventListener('pointermove', e => {
      const p = this._pt.get(e.pointerId);
      if (!p) {
        // hover ghost (desktop) — never dislodge a parked, waiting ghost
        if (G.state === 'playing' && this.mode && !(this.mode.type === 'build' && this._ghostParked)) {
          const w = Render.screenToWorld(e.clientX, e.clientY);
          const ox = this.mode.type === 'build' ? ((BUILD[this.mode.key].w - 1) >> 1) : 0;
          const oy = this.mode.type === 'build' ? ((BUILD[this.mode.key].h - 1) >> 1) : 0;
          this.ghost = { x: (w.x / 16 | 0) - ox, y: (w.y / 16 | 0) - oy };
        }
        return;
      }
      const dxp = e.clientX - p.x, dyp = e.clientY - p.y; // delta since last event
      const dx = e.clientX - p.sx, dy = e.clientY - p.sy;
      if (Math.hypot(dx, dy) > 9) p.moved = true;
      p.x = e.clientX; p.y = e.clientY;

      if (this._pt.size === 2 && this._pinch) {
        // pinch zoom + two-finger pan
        const pts = [...this._pt.values()];
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        const mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
        const before = Render.screenToWorld(mx, my);
        G.cam.z = U.clamp(this._pinch.z0 * d / this._pinch.d0, CONFIG.ZOOM.min, CONFIG.ZOOM.max);
        const after = Render.screenToWorld(mx, my);
        G.cam.x += before.x - after.x;
        G.cam.y += before.y - after.y;
        G.cam.x -= (mx - this._pinch.mx) / G.cam.z;
        G.cam.y -= (my - this._pinch.my) / G.cam.z;
        this._pinch.mx = mx; this._pinch.my = my;
        this._panning = true;
        return;
      }

      if (p.moved) {
        const paint = this.mode && this.mode.type === 'build' && BUILD[this.mode.key] && BUILD[this.mode.key].paint;
        const demo = this.mode && this.mode.type === 'demolish';
        const sig = this.mode && this.mode.type === 'sigil';
        const steer = this.mode && this.mode.type === 'build' && !BUILD[this.mode.key].paint;
        if ((paint || demo || sig) && G.state === 'playing') {
          const w = Render.screenToWorld(e.clientX, e.clientY);
          const tx = (w.x / 16) | 0, ty = (w.y / 16) | 0;
          if (!this._lastTile || this._lastTile.x !== tx || this._lastTile.y !== ty) {
            this._lastTile = { x: tx, y: ty };
            this.ghost = { x: tx, y: ty };
            if (sig) {
              // chalk follows the drag; the shape is salted & committed on release
              if (!G.sigilDraft) {
                if (!isDayLike()) { this.toast('Sigils are chalked by day — the dusk wakes them.', 'bad'); return; }
                Wilds.draftStart(this.mode.kind);
              }
              Wilds.draftAdd(tx, ty);
            } else this.tryPlace(tx, ty);
          }
        } else if (steer && G.state === 'playing') {
          // placing a building: one finger steers the ghost, release parks it,
          // two fingers pan & pinch (handled above)
          const w = Render.screenToWorld(e.clientX, e.clientY);
          const d = BUILD[this.mode.key];
          this.ghost = { x: (w.x / 16 | 0) - ((d.w - 1) >> 1), y: (w.y / 16 | 0) - ((d.h - 1) >> 1) };
          this._ghostParked = true;
        } else {
          // pan (mouse and touch share the per-event delta)
          G.cam.x -= dxp / G.cam.z;
          G.cam.y -= dyp / G.cam.z;
          this._panning = true;
          if (G.state === 'playing' && this.mode && this.mode.type !== 'build') {
            const w = Render.screenToWorld(e.clientX, e.clientY);
            this.ghost = { x: (w.x / 16) | 0, y: (w.y / 16) | 0 };
          }
        }
      }
    }, { passive: false });

    const up = e => {
      const p = this._pt.get(e.pointerId);
      this._pt.delete(e.pointerId);
      if (this._pt.size < 2) this._pinch = null;
      this._lastMx = undefined; this._lastMy = undefined;
      this._lastTile = null;
      // a finished chalk stroke is salted and set — the mode stays for the next sigil
      if (this.mode && this.mode.type === 'sigil' && G.sigilDraft && G.sigilDraft.tiles.length) Wilds.draftCommit();
      if (!p) return;
      const dt = performance.now() - p.t;
      if (!p.moved && dt < 800 && G.state === 'playing') this.tap(e.clientX, e.clientY);
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    cv.addEventListener('wheel', e => {
      e.preventDefault();
      const before = Render.screenToWorld(e.clientX, e.clientY);
      G.cam.z = U.clamp(G.cam.z * (e.deltaY < 0 ? 1.12 : 0.89), CONFIG.ZOOM.min, CONFIG.ZOOM.max);
      const after = Render.screenToWorld(e.clientX, e.clientY);
      G.cam.x += before.x - after.x;
      G.cam.y += before.y - after.y;
    }, { passive: false });

    // minimap tap/drag (on narrow screens the orb expands while in use)
    const mm = document.getElementById('minimap');
    let mmShrinkT = null;
    const mmBig = () => {
      this.els.mmWrap.classList.add('big');
      clearTimeout(mmShrinkT);
      mmShrinkT = setTimeout(() => this.els.mmWrap.classList.remove('big'), 3500);
    };
    const mmNav = e => {
      const r = mm.getBoundingClientRect();
      const fx = U.clamp((e.clientX - r.left) / r.width, 0, 1);
      const fy = U.clamp((e.clientY - r.top) / r.height, 0, 1);
      G.cam.x = fx * World.W * 16;
      G.cam.y = fy * World.H * 16;
      G.follow = null;
    };
    mm.addEventListener('pointerdown', e => { mmBig(); try { mm.setPointerCapture(e.pointerId); } catch (err) {} mmNav(e); });
    mm.addEventListener('pointermove', e => { if (e.buttons) { mmBig(); mmNav(e); } });

    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && G.state === 'playing' && !G.paused) Sim.speedSet(0);
    });
  },

  tap(sx, sy) {
    const w = Render.screenToWorld(sx, sy);
    const wx = w.x / 16, wy = w.y / 16;
    if (this.mode) {
      const tx = wx | 0, ty = wy | 0;
      if (this.mode.type === 'build' && !BUILD[this.mode.key].paint) {
        const def = BUILD[this.mode.key];
        const g = this.ghost;
        // a tap on (or right beside) the parked outline commits the build;
        // any other tap re-aims the ghost and waits for its confirm tap
        if (this._ghostParked && g
          && wx >= g.x - 0.35 && wx < g.x + def.w + 0.35
          && wy >= g.y - 0.35 && wy < g.y + def.h + 0.35) {
          this.tryPlace(g.x + ((def.w - 1) >> 1), g.y + ((def.h - 1) >> 1));
        } else {
          this.ghost = { x: tx - ((def.w - 1) >> 1), y: ty - ((def.h - 1) >> 1) };
          this._ghostParked = true;
        }
        return;
      }
      this.ghost = { x: tx, y: ty };
      this.tryPlace(tx, ty);
      return;
    }
    // pick: monsters > villagers > buildings
    let best = null, bd = 0.85;
    for (const m of G.monsters) {
      const d = U.dst(wx, wy, m.x, m.y);
      if (d < bd) { bd = d; best = { kind: 'm', ref: m }; }
    }
    if (!best) {
      bd = 0.7;
      for (const v of G.villagers) {
        const d = U.dst(wx, wy, v.x, v.y);
        if (d < bd) { bd = d; best = { kind: 'v', ref: v }; }
      }
    }
    if (!best && G.herd) {
      for (const d of G.herd.deer) {
        if (U.dst(wx, wy, d.x, d.y) < 0.8) { best = { kind: 'd', ref: G.herd }; break; }
      }
    }
    if (!best) {
      let b = World.bldAt(wx | 0, wy | 0);
      if (!b) {
        // tall sprites (towers, lairs, windmills) overhang the tile above their
        // footprint — a tap on the visible body should still select them
        const up = World.bldAt(wx | 0, (wy | 0) - 1);
        if (up && up.def.tall) b = up;
      }
      if (b) best = { kind: 'b', ref: b };
    }
    // nothing standing — a wild worksite, an ordered bush, or an old ruin?
    if (!best) {
      const tx = wx | 0, ty = wy | 0;
      const o = World.objAt(tx, ty);
      if (o === OBJ.BUSH || o === OBJ.RUIN || Bench.siteObj(tx, ty)) best = { kind: 'o', ref: { tx, ty, o } };
    }
    if (best) { this.select(best.kind, best.ref); G.follow = null; }
    else this.selHide();
  },

  /* ================= screens ================= */
  showGameUI() {
    this.els.hud.classList.remove('hidden');
    this.els.dock.classList.remove('hidden');
    this.els.mmWrap.classList.remove('hidden');
    document.getElementById('handsWrap').classList.remove('hidden');
    this.syncSpeedBtns();
    this.updateHUD();
  },

  refreshAll() {
    this.updateHUD();
    if (this.open) this.openPanel(this.open);
  },

  endScreen(kind) {
    if (Bench.seam) Seam.finishSession();
    if (Bench.active) Bench.close();
    this.closePanel(); this.cancelMode(); this.selHide();
    this.els.hud.classList.add('hidden'); this.els.dock.classList.add('hidden');
    this.els.mmWrap.classList.add('hidden');
    document.getElementById('handsWrap').classList.add('hidden');
    this.els.tut.classList.add('hidden');
    const scr = document.getElementById('endScreen');
    const c = document.getElementById('endContent');
    const s = G.stats;
    const stats = `
      <div class="statgrid">
        <div class="stat"><div class="v">${G.day}</div><div class="l">Days</div></div>
        <div class="stat"><div class="v">${s.kills}</div><div class="l">Kills</div></div>
        <div class="stat"><div class="v">${s.built}</div><div class="l">Built</div></div>
        <div class="stat"><div class="v">${s.peakPop}</div><div class="l">Peak souls</div></div>
      </div>`;
    const chronBits = G.chronicle.slice(-4).map(cc => `<div class="sub2" style="font-size:12px">\u201c${U.esc(cc.txt)}\u201d</div>`).join('');
    if (kind === 'victory') {
      c.innerHTML = `
        <canvas id="endArt" width="180" height="100"></canvas>
        <h1 style="color:#ffd94a;text-shadow:0 3px 0 #6b4310,0 6px 18px rgba(255,217,74,.5)">DAWN ETERNAL</h1>
        <div class="sub2">The Beacon roars, the dark breaks like a storm at sunrise, and the long night is over.<br>Your people will tell this story for a thousand years.</div>
        ${stats}${chronBits}
        <button class="bigbtn" id="endContinue">Keep Playing (Endless)</button>
        <button class="bigbtn ghost" id="endNew">New Game</button>`;
      document.getElementById('endContinue').onclick = () => {
        G.state = 'playing'; G.finalNight = false; G.endless = true;
        scr.classList.add('hidden');
        this.showGameUI();
        this.toast('Endless mode — the nights keep coming. How long can Dawnhold stand?', 'magic');
      };
    } else {
      c.innerHTML = `
        <canvas id="endArt" width="180" height="100"></canvas>
        <h1 style="color:#ff6a6a">DAWNHOLD HAS FALLEN</h1>
        <div class="sub2">The last hearth goes cold, and the dark takes the valley.<br>But every ending is a lesson. Raise it again, Guardian.</div>
        ${stats}${chronBits}
        <button class="bigbtn" id="endNew">Try Again</button>
        <button class="bigbtn ghost" id="endTitle">Title Screen</button>`;
    }
    const ea = document.getElementById('endArt');
    if (ea) Art.titlePaint(ea, kind === 'victory' ? 'win' : 'lose');
    document.getElementById('endNew').onclick = () => {
      scr.classList.add('hidden');
      document.getElementById('titleScreen').classList.remove('hidden');
      document.getElementById('diffPick').classList.remove('hidden');
      document.getElementById('btnNew').classList.add('hidden');
      G.state = 'title';
    };
    const et = document.getElementById('endTitle');
    if (et) et.onclick = () => {
      scr.classList.add('hidden');
      document.getElementById('titleScreen').classList.remove('hidden');
      G.state = 'title';
    };
    scr.classList.remove('hidden');
  },

  helpFill() {
    document.getElementById('helpBody').innerHTML = `
      <h2>Your Goal</h2>
      <p>You are the guardian spirit of a tiny settlement. Keep your villagers alive, grow the village, and raise <b>The Beacon</b> (unlocks day 10). Light it and survive the <b>Long Night</b> that follows — dawn returns forever. Lose only when every villager dies.</p>
      <h2>The Rhythm</h2>
      <p><b>Day (~3.5 min):</b> villagers with jobs gather food, wood, stone and herbs; they build, farm, fish and repair.<br>
      <b>Night (~1.5 min):</b> monsters attack from their <b>Dark Monoliths</b>. Guards and towers fight; you cast powers. Survivors burn at dawn.<br>
      Every 5th night is a <b>BLOOD MOON</b> — a much bigger horde, but double essence from kills.</p>
      <h2>Dark Monoliths & Raids</h2>
      <p>Three lairs sit out in the wilds — the horde crawls out of them every night. Tap one and press <b>Raid</b>: your Guards will march out and tear it down (+25 essence, and that lair never spawns again). Monoliths are stone-hard, slowly <b>mend themselves</b>, and <b>spawn defenders while raided</b> — bring several guards and see it through, because a half-hearted raid heals back. Destroy all three and the nights grow thin... but the dark still comes from the wilds.</p>
      <h2>Controls</h2>
      <ul>
        <li><b>Tap</b> a villager, monster, building or monolith to inspect it.</li>
        <li><b>Drag</b> to pan. <b>Pinch</b> to zoom (scroll wheel on desktop). Tap the <b>minimap</b> (top right) to jump — purple dots are lairs.</li>
        <li><b>Build:</b> drag a card by its <b>\u283f edge</b> and the building rides your finger — release to park it, then <b>tap the outline to build</b> (tap elsewhere to re-aim; tapping the card alone works too). Drag the rest of the menu to scroll. Walls, gates, roads and traps <b>paint as you drag</b>. While placing a building, <b>two fingers pan & zoom</b>.</li>
        <li><b>Materials tab</b> (right end of the resource bar): stock &amp; storage of every good, with show/hide and drag-to-reorder for the chips. The minimap toggle lives there too.</li>
        <li>Speed: pause / 1\u00d7 / 2\u00d7 / 3\u00d7 (space bar pauses on desktop).</li>
      </ul>
      <h2>Jobs</h2>
      <ul>
        <li><b>Forager</b> — berries. Fast early food; bushes regrow daily.</li>
        <li><b>Lumberjack</b> — wood for tents, palisades, towers.</li>
        <li><b>Miner</b> — stone from boulders; cracks crystal lodes for essence; works Mine Shafts when lodes run dry — and descends into <b>the Deep Seam</b> if you order it.</li>
        <li><b>Farmer</b> — tends wheat plots. A Windmill nearby grows them 35% faster.</li>
        <li><b>Fisher</b> — works a Fishing Dock on the shore. Steady food, no farmland.</li>
        <li><b>Medic</b> — gathers herbs to stock the Hospital, which mends the wounded nearby. Needs a built Hospital (day 2).</li>
        <li><b>Fletcher</b> — fashions arrows from wood at a Fletcher Hut; towers and raiding guards burn them.</li>
        <li><b>Smith</b> — forges tools at the Smithy; every worker wears them out, and bare hands are slow.</li>
        <li><b>Cook</b> — simmers berries into proper meals at the Kitchen (3 food + 1 wood \u2192 2 meals).</li>
        <li><b>Brewer</b> — brews ale at the Tavern (food + herbs); a dusk drink speeds the whole village tomorrow.</li>
        <li><b>Builder</b> — raises construction, repairs damage (costs materials), clears marked wild tiles and <b>fills shore water with stone</b> to make new land.</li>
        <li><b>Guard</b> — patrols, fights, and raids monoliths. A Barracks makes all guards +30% damage; the Muster Yard drills +10% per monster type.</li>
      </ul>
      <h2>The Bench — lend a hand</h2>
      <p>You are no spectator by day. Six <b>warm hands</b> a day (the little hand-meter by the dock) buy a few seconds of touch-work at any ready worksite — tap a tree, boulder, berry bush or a built workplace and press the <b>\u270b</b> button. Every game pays a real stock: split logs on the swing\u2019s sweet band, hook the bobber\u2019s dip, trace a boulder\u2019s glowing fault, circle a berry bush past its thorns, swipe wheat with the wind, knead and stir on the bounce, strike when the forge bar flares, match feather patterns, tap cresting brew-bubbles, dip wicks on the wave, suture without crossing the red, strike sparks until a brazier catches, call the straw effigy\u2019s drill-shape. A player who never touches the bench loses nothing — but busy hands end the day ahead.</p>
      <h2>The Kindling & the Muster Yard</h2>
      <p>A <b>Brazier</b> kindled with wood and essence burns all night as a great light — and set beside a Dark Monolith it slowly <b>cleanses</b> it: no mending, no defenders, until the stone cracks into salvageable dawn-stone. No raid, no graves. The <b>Muster Yard</b> drills your guards against a straw effigy: pick shields (runners), pikes (brutes) or scatter (stalkers) for a permanent +10% damage per drill (stacks to +30%), ring the horn to rally off-duty guards — or play the drill for real and the bonus lands a day early.</p>
      <h2>The Deep Seam</h2>
      <p>Order <b>Dig Deeper</b> on a Mine Shaft and a miner spends the day below while you watch the wheel. Each level the seam gets richer — stone, double stone, flint (tools last +25% for days), then crystal flecks of essence — but every level spins the wheel: <b>okay, injured, or dead</b>. Injured miners crawl out hurt and the tunnel seals; dead ones are lost to the dark. If the worst happens you get one chance at the <b>rescue</b>: steer the ropeline through falling rock, and the injured walk away clean while the dead come up hurt but alive. Climb out any time to bank the haul.</p>
      <h2>Wildcraft — the village edits the map</h2>
      <ul>
        <li><b>Grovekeep</b> — tap a wild berry bush and order <b>Tend</b>: a Forager calls on it across days until it's <b>tended</b> (+2 berries, faster regrow), then <b>heavy-fruiting</b> (double berries, for good). Tended bushes may spare <b>cuttings</b> when harvested — plant them anywhere to breed your own orchards.</li>
        <li><b>The Nursery</b> — every 2 trees your Lumberjacks fell pots a <b>sapling</b>. Select the nursery to plant them out as groves: wood stops being strip-mining and becomes forestry.</li>
        <li><b>The Spade</b> — mark dry tiles (Build panel) and a Builder digs them down to <b>pond</b> water. Docks can sit inland on ponds, and <b>reeds</b> — herbs — sprout at the margin.</li>
        <li><b>Sigils</b> — drag to draw chalk on open ground (Build &rarr; Mystic); salting a stroke costs 1 herb + 1 charcoal. A <b>ward</b> blooms at dusk: monsters crossing it crawl at half speed and take +25% damage. A <b>hallow</b> steadies your folk inside: no fleeing, guards +10%. Dawn washes the chalk away; six sigils hold at once.</li>
        <li><b>Restoration</b> — tap an <b>Ancient Ruin</b> and choose what it wakes as: the <b>Aqueduct</b> (wells +50%, folk drink on the spot nearby), the <b>Dawn Shrine</b> (essence regen +50%), the <b>Sky Watch</b> (towers +1.5 range, tonight's attack direction revealed at dawn) or the <b>Root Cellar</b> (food cap +80, nothing spoils). A Scribe deciphers for a stretch, Builders scaffold after — which ruin you raise shapes the whole run.</li>
        <li><b>Banns &amp; blessings</b> — villagers who work side by side grow attached, and in time a pair asks leave to wed. Tap either to <b>bless the banns</b>: a feast (1 ale + food) puts +10% into the next day's work, the couple raises a <b>shared hut</b>, and they work +10% while together.</li>
        <li><b>The driven hunt</b> — some mornings a <b>deer herd</b> grazes at the map's edge. Tap a deer and <b>set a hunt</b>: two foragers spend the day driving it — toward the <b>spike traps</b> you laid, if you planned the ground. Each deer driven into the line is a heap of venison; a botched drive scatters the herd by dusk.</li>
      </ul>
      <h2>Supply Lines</h2>
      <ul>
        <li><b>Arrows are ammunition</b> — every tower shot spends 1 (ballistae 2), and raids pack quivers (5). Dry quivers: towers hold fire, guards hit at 75%. Build a Fletcher Hut before your towers go up.</li>
        <li><b>Tools wear out</b> — each worker burns through tools (a Smithy forges them from 2 wood + 1 stone). Bare-handed villagers work at 65% speed.</li>
        <li><b>Cooked beats raw</b> — Kitchen meals satisfy 85 hunger vs 54 for 3 raw food.</li>
        <li><b>Stores have caps</b> — wood/stone 120, food 80, herbs 20. Granaries & Storehouses raise them; overflow spoils to vermin at dawn. The <b>Materials tab</b> tracks every stock and cap.</li>
        <li><b>Comfort matters</b> — bedrolls (Tent) \u2192 real beds (Cottage) \u2192 manor life: snug villagers work +5%, miserable crowds work slower and some may leave at dawn.</li>
        <li><b>Upgrades</b> — select a built Watchtower, Wheat Plot or Palisade and press the \u2b06 button for a stronger tier in place.</li>
      </ul>
      <h2>Surviving the Night</h2>
      <ul>
        <li>Walls route the horde; they break gates and weak walls, so ring your camp and mind the gaps.</li>
        <li><b>Watchtowers</b> (day 3) shoot automatically; <b>Ballistae</b> (day 7) out-range everything.</li>
        <li><b>Runners</b> are fast and fragile; <b>Brutes</b> (day 6) smash walls; <b>Bonecasters</b> (day 7) lob bones from range; <b>Stalkers</b> (day 9) hunt villagers; <b>Wraiths</b> drift <i>through</i> walls — keep guards inside; <b>Colossi</b> (day 15, endless) are walking sieges.</li>
        <li><b>Spike Traps</b> wound and slow whatever steps on them; lay rows before your gates.</li>
        <li><b>Powers</b>: Mend heals, Smite erases shades, Stasis (day 3) freezes a circle for 5s, Meteor (day 5) wipes waves. Essence flows from time, kills and Shrines.</li>
        <li>The dead are buried where they fall — little graves remember them.</li>
      </ul>
      <h2>People</h2>
      <p>Villagers are named individuals with traits (Hardy, Swift, Diligent, Strong Back). New folks arrive at dawn if there's <b>housing and food</b>. Starvation kills — keep the store above ~15.</p>
      <h2>Saving</h2>
      <p>Autosaves at every dawn, plus three manual slots (Menu \u2192 Save). Saves live in this browser.</p>`;
  },
};
