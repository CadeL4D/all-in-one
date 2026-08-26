'use strict';
/* ============================================================
   Dawnhold — ui.js
   DOM UI + input. Touch-first: tap = select/place, drag = pan
   (or paint walls/roads), pinch = zoom, plus zoom buttons and a
   tappable minimap as alternatives (mobile best practice).
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
  _toastN: 0,
  _hudT: 0,
  _lastPlaceFail: 0,
  els: {},

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
      zoomBtns: $('zoomBtns'), bossBar: $('bossBar'), bossHpFill: $('bossHpFill'),
    };
    $('btnPause').onclick = () => Sim.speedSet(G.paused ? 1 : 0);
    $('btnSpd1').onclick = () => Sim.speedSet(1);
    $('btnSpd2').onclick = () => Sim.speedSet(2);
    $('btnSpd3').onclick = () => Sim.speedSet(3);
    $('btnMenuTop').onclick = () => this.openPanel('menu');
    $('dockBuild').onclick = () => this.openPanel('build');
    $('dockJobs').onclick = () => this.openPanel('jobs');
    $('dockPowers').onclick = () => this.openPanel('powers');
    $('dockMap').onclick = () => { this.els.mmWrap.classList.toggle('hidden'); };
    $('modeChipX').onclick = () => this.cancelMode();
    $('zoomIn').onclick = () => this.zoomBy(0.4);
    $('zoomOut').onclick = () => this.zoomBy(-0.4);
    $('btnHelpClose').onclick = () => { $('helpScreen').classList.add('hidden'); if (G.state === 'title') $('titleScreen').classList.remove('hidden'); };
    $('btnHelpT').onclick = () => { $('titleScreen').classList.add('hidden'); $('helpScreen').classList.remove('hidden'); };
    $('btnNew').onclick = () => { $('diffPick').classList.remove('hidden'); $('btnNew').classList.add('hidden'); };
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

    // dock icons
    const put = (id, name) => { const e = $(id); e.innerHTML = ''; e.appendChild(Art.iconEl(name)); };
    put('icoBuild', 'build'); put('icoJobs', 'jobs'); put('icoPowers', 'powers'); put('icoMap', 'map');

    this.buildResRow();
    this.input();
    this.helpFill();
    window.addEventListener('keydown', e => {
      if (G.state !== 'playing') return;
      if (e.key === ' ') { e.preventDefault(); Sim.speedSet(G.paused ? 1 : 0); }
      else if (e.key === '1') Sim.speedSet(1);
      else if (e.key === '2') Sim.speedSet(2);
      else if (e.key === '3') Sim.speedSet(3);
      else if (e.key === 'Escape') { if (this.open) this.closePanel(); else this.cancelMode(); }
      else if (e.key === 'l' || e.key === 'L') { if (window.DBG && DBG.lairs) DBG.lairs(); }
    });
    // continue button availability
    if (SaveSys.has('auto') || SaveSys.has(1) || SaveSys.has(2) || SaveSys.has(3)) $('btnContinue').classList.remove('hidden');
  },

  /* ================= HUD ================= */
  buildResRow() {
    const row = this.els.resRow;
    row.innerHTML = '';
    const mk = (id, icon, title) => {
      const d = document.createElement('div');
      d.className = 'chip'; d.id = 'chip_' + id; d.title = title;
      d.appendChild(Art.iconEl(icon));
      const v = document.createElement('span'); v.id = 'val_' + id; v.textContent = '0';
      d.appendChild(v);
      row.appendChild(d);
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
    mk('ale', 'ale', 'Ale — a dusk drink at the Tavern speeds tomorrow\u2019s work');
    mk('oil', 'oil', 'Lamp oil — torches sip it through the night; pressed from charcoal + herbs');
    mk('bottles', 'bottle', 'Bottles — a drink without the walk to the well; filled at the Bottlery');
    mk('bread', 'bread', 'Bread — the heartiest food, from the Bakehouse');
    mk('pop', 'pop', 'Villagers / housing capacity');
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
    const show = (k, cond) => { const c = document.getElementById('chip_' + k); if (c) c.style.display = cond ? '' : 'none'; };
    show('arrows', G.res.arrows >= 1 || Buildings.built('fletch'));
    show('tools', G.res.tools >= 1 || Buildings.built('smithy'));
    show('meals', G.res.meals >= 1 || Buildings.built('kitchen'));
    show('ale', G.res.ale >= 1 || Buildings.built('tavern'));
    show('water', G.res.water >= 1 || Buildings.built('well'));
    show('oil', G.res.oil >= 1 || Buildings.built('press'));
    show('bottles', G.res.bottles >= 1 || Buildings.built('bottlery'));
    show('bread', G.res.bread >= 1 || Buildings.built('bakery'));
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
    if (!this.els.selCard.classList.contains('hidden')) this.selRender();
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
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.innerHTML = U.esc(msg).replace(/\u26a0/g, '\u26a0\ufe0f');
    this.els.toasts.appendChild(t);
    this._toastN++;
    while (this.els.toasts.children.length > 4) this.els.toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('fadeout'); setTimeout(() => t.remove(), 650); }, 4200);
  },

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
      const state = { idle: 'waiting', toWork: 'heading out', work: 'working', toStore: 'hauling', shelter: 'sheltering', flee: 'fleeing!', fight: 'fighting!', arrive: 'arriving' }[v.state] || v.state;
      el.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center">
          <canvas id="selPortrait" width="48" height="48"></canvas>
          <div style="flex:1">
            <h3>${U.esc(v.name)}${tr}</h3>
            <div class="sub">${U.esc(state)}${v.trait ? ' \u00b7 ' + U.esc(v.trait.desc) : ''}</div>
          </div>
        </div>
        ${bars}${jobRow}${carry}
        <div class="selActs">
          <button id="selFollow">${G.follow === v ? 'Unfollow' : 'Follow'}</button>
          ${v.job !== 'guard' ? '<button id="selShelter">To shelter</button>' : ''}
          <button id="selClose">Close</button>
        </div>`;
      const pc = document.getElementById('selPortrait').getContext('2d');
      pc.imageSmoothingEnabled = false;
      pc.drawImage(Art.villager(v.look, 0), 0, 0, 16, 16, 0, 0, 48, 48);
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
      if (!b.built) extra = `<div class="row"><span class="mLbl">Build</span><div class="meter mProg"><div style="width:${(b.progress * 100).toFixed(0)}%"></div></div></div>`;
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
      el.innerHTML = `
        <h3>${U.esc(b.def.name)}</h3>
        <div class="sub">${U.esc(b.def.desc || '')}</div>
        <div class="row"><span class="mLbl">HP</span><div class="meter mHP"><div style="width:${U.clamp(b.hp / b.maxHp * 100, 0, 100)}%"></div></div></div>
        ${extra}
        ${nd ? `<div class="sub" style="color:var(--amber2)">Upgrade in place: ${U.esc(nd.name)} — ${upCost}</div>` : ''}
        <div class="selActs">${up}${dem}<button id="selClose">Close</button></div>`;
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

    const grid = document.createElement('div');
    grid.className = 'bgrid';
    const keys = Object.keys(BUILD).filter(k => BUILD[k].cat === cat);
    // day-locked cards sink to the bottom of their category and rejoin the
    // top group the moment they unlock (stable sort keeps roster order)
    keys.sort((a, b) => (G.unlocks[a] ? 0 : 1) - (G.unlocks[b] ? 0 : 1));
    if (cat === 'basics' || cat === 'defense') keys.push('__demolish');
    if (cat === 'basics') keys.push('__clear');
    for (const k of keys) {
      if (k === '__demolish') {
        const card = document.createElement('button');
        card.className = 'bcard' + (this.mode && this.mode.type === 'demolish' ? ' sel' : '');
        card.innerHTML = `<canvas width="16" height="16" style="background:#3a2020"></canvas>
          <div><div class="bn">Demolish</div><div class="bc"><span>reclaims 50%</span></div>
          <div class="bd">Builders tear the building down and half its cost is refunded. Tap again to cancel an order. Drag across walls.</div></div>`;
        card.onclick = () => { this.setMode({ type: 'demolish' }); this.closePanel(); };
        this.drawCardIcon(card, 'wallW', true);
        grid.appendChild(card);
        continue;
      }
      if (k === '__clear') {
        const card = document.createElement('button');
        card.className = 'bcard' + (this.mode && this.mode.type === 'clear' ? ' sel' : '');
        card.innerHTML = `<canvas width="16" height="16" style="background:#2a3320"></canvas>
          <div><div class="bn">Clear Land</div><div class="bc"><span>builders</span></div>
          <div class="bd">Mark trees, boulders, berry bushes, ruins or crystals and a Builder will clear the tile (half the yield is salvaged). Tap shore water to fill it with stone (${CONFIG.CLEAR.waterCost} stone a tile) and make new land. Tap again to cancel.</div></div>`;
        card.onclick = () => { this.setMode({ type: 'clear' }); this.closePanel(); };
        this.drawCardIcon(card, 'tree0', true);
        grid.appendChild(card);
        continue;
      }
      const def = BUILD[k];
      const unlocked = !!G.unlocks[k];
      const afford = Buildings.afford(k);
      const card = document.createElement('button');
      card.className = 'bcard' + (unlocked ? '' : ' locked') + (this.mode && this.mode.type === 'build' && this.mode.key === k ? ' sel' : '');
      const cc = Buildings.costOf(def); // A5: costs shown are costs charged
      const cost = Object.entries(def.cost).map(([r]) =>
        `<span class="${G.res[r] < cc[r] ? 'costNo' : ''}">${cc[r]} ${r}</span>`).join('');
      card.innerHTML = `
        <div><div class="bn">${U.esc(def.name)}</div>
        <div class="bc">${cost}</div>
        <div class="bd">${U.esc(def.desc)}${unlocked ? '' : `<br><b style="color:var(--amber)">Unlocks day ${def.unlock}</b>`}</div></div>`;
      this.drawCardIcon(card, k, !unlocked);
      card.onclick = () => {
        if (this._cardDragged) { this._cardDragged = false; return; } // drag just ended — not a click
        if (!unlocked) { this.toast(`Unlocks on day ${def.unlock}.`, ''); return; }
        if (!afford) { this.toast(`Not enough resources for ${def.name}.`, 'bad'); return; }
        this.setMode({ type: 'build', key: k });
        this.closePanel();
      };
      // drag the card straight out onto the map — the building ghost rides
      // the finger; release parks it, then a tap on the outline builds
      card.onpointerdown = e => {
        if (!unlocked || !afford) return;
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
    const cv = card.querySelector('canvas') || card.firstChild;
    if (!(cv instanceof HTMLCanvasElement)) return;
    const x = cv.getContext('2d');
    x.imageSmoothingEnabled = false;
    if (locked) x.globalAlpha = 0.4;
    const MAP = { farm: 'farm3', windmill: 'windmill0', torch: 'torch0', herbalistHut: 'herbalist', road: 'road0' };
    let spr = Art.s[MAP[key] || key];
    if (key === '__demolish' || !spr) spr = Art.s.wallW;
    const s = Math.min(38 / spr.width, 38 / spr.height);
    const w = spr.width * s, h = spr.height * s;
    x.drawImage(spr, (38 - w) / 2, (38 - h) / 2, w, h);
    x.globalAlpha = 1;
  },

  jobsList() {
    const wrap = document.createElement('div');
    const pop = G.villagers.length;
    const sum = JOBS.filter(j => j !== 'idle').reduce((s, j) => s + (G.jobs[j] || 0), 0);
    const note = document.createElement('div');
    note.className = 'jnote';
    const cm = Sim.contentment();
    note.innerHTML = `Villagers: <b>${pop}</b> \u00b7 Assigned: <b>${Math.min(sum, pop)}</b> \u00b7 Resting: <b>${Math.max(0, pop - sum)}</b><br>Housing: <b>${cm.label}</b> \u00d7${cm.mult.toFixed(2)} work — beds and comfort pay off.<br>Tap <b>+</b>/<b>&minus;</b> to move people between duties. They start at once.`;
    wrap.appendChild(note);
    // locked duties grey out and sink to the bottom; building the workplace
    // returns them to the roster (stable sort keeps the roster order)
    const lockedJ = j => !!(JOB_NEEDS[j] && !Buildings.built(JOB_NEEDS[j]));
    const ordered = JOBS.filter(j => j !== 'idle');
    ordered.sort((a, b) => (lockedJ(a) ? 1 : 0) - (lockedJ(b) ? 1 : 0));
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
      row.appendChild(icon);
      const txt = document.createElement('div');
      txt.style.flex = '1';
      txt.innerHTML = `<div class="jn">${info.name}</div><div class="jd">${locked ? `Requires a built ${U.esc(BUILD[JOB_NEEDS[j]].name)}.` : info.desc}</div>`;
      row.appendChild(txt);
      const cnt = document.createElement('div');
      cnt.className = 'cnt';
      cnt.textContent = (G.jobs[j] || 0);
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
      row.appendChild(minus); row.appendChild(cnt); row.appendChild(plus);
      wrap.appendChild(row);
    }
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
      G.state = 'title';
      this.closePanel();
      document.getElementById('titleScreen').classList.remove('hidden');
      this.els.hud.classList.add('hidden'); this.els.dock.classList.add('hidden');
      this.els.zoomBtns.classList.add('hidden'); this.els.mmWrap.classList.add('hidden');
      this.selHide(); this.cancelMode();
      document.getElementById('btnContinue').classList.remove('hidden');
    });
    btn('Abandon & New Game', 'Start over on a fresh map', () => {
      if (!confirm('Abandon this village and start a new game?')) return;
      this.closePanel();
      G.state = 'title';
      document.getElementById('titleScreen').classList.remove('hidden');
      document.getElementById('diffPick').classList.remove('hidden');
      document.getElementById('btnNew').classList.add('hidden');
      this.els.hud.classList.add('hidden'); this.els.dock.classList.add('hidden'); this.els.zoomBtns.classList.add('hidden');
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
        const steer = this.mode && this.mode.type === 'build' && !BUILD[this.mode.key].paint;
        if ((paint || demo) && G.state === 'playing') {
          const w = Render.screenToWorld(e.clientX, e.clientY);
          const tx = (w.x / 16) | 0, ty = (w.y / 16) | 0;
          if (!this._lastTile || this._lastTile.x !== tx || this._lastTile.y !== ty) {
            this._lastTile = { x: tx, y: ty };
            this.ghost = { x: tx, y: ty };
            this.tryPlace(tx, ty);
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

    // minimap tap/drag
    const mm = document.getElementById('minimap');
    const mmNav = e => {
      const r = mm.getBoundingClientRect();
      const fx = U.clamp((e.clientX - r.left) / r.width, 0, 1);
      const fy = U.clamp((e.clientY - r.top) / r.height, 0, 1);
      G.cam.x = fx * World.W * 16;
      G.cam.y = fy * World.H * 16;
      G.follow = null;
    };
    mm.addEventListener('pointerdown', e => { try { mm.setPointerCapture(e.pointerId); } catch (err) {} mmNav(e); });
    mm.addEventListener('pointermove', e => { if (e.buttons) mmNav(e); });

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
    if (best) { this.select(best.kind, best.ref); G.follow = null; }
    else this.selHide();
  },

  zoomBy(dz) {
    const before = Render.screenToWorld(Render.cw / 2, Render.ch / 2);
    G.cam.z = U.clamp(G.cam.z + dz, CONFIG.ZOOM.min, CONFIG.ZOOM.max);
    const after = Render.screenToWorld(Render.cw / 2, Render.ch / 2);
    G.cam.x += before.x - after.x;
    G.cam.y += before.y - after.y;
  },

  /* ================= screens ================= */
  showGameUI() {
    this.els.hud.classList.remove('hidden');
    this.els.dock.classList.remove('hidden');
    this.els.zoomBtns.classList.remove('hidden');
    this.els.mmWrap.classList.remove('hidden');
    this.syncSpeedBtns();
    this.updateHUD();
  },

  refreshAll() {
    this.updateHUD();
    if (this.open) this.openPanel(this.open);
  },

  endScreen(kind) {
    this.closePanel(); this.cancelMode(); this.selHide();
    this.els.hud.classList.add('hidden'); this.els.dock.classList.add('hidden');
    this.els.zoomBtns.classList.add('hidden'); this.els.mmWrap.classList.add('hidden');
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
        G.state = 'playing'; G.finalNight = false;
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
        <li><b>Drag</b> to pan. <b>Pinch</b> or use <b>+/&minus;</b> buttons to zoom. Tap the <b>minimap</b> (top right) to jump — purple dots are lairs.</li>
        <li><b>Build:</b> drag a card straight out of the menu and the building rides your finger — release to park it, then <b>tap the outline to build</b> (tap elsewhere to re-aim; tapping the card alone works too). Walls, gates, roads and traps <b>paint as you drag</b>. While placing a building, <b>two fingers pan & zoom</b>.</li>
        <li>Speed: pause / 1\u00d7 / 2\u00d7 / 3\u00d7 (space bar pauses on desktop).</li>
      </ul>
      <h2>Jobs</h2>
      <ul>
        <li><b>Forager</b> — berries. Fast early food; bushes regrow daily.</li>
        <li><b>Lumberjack</b> — wood for tents, palisades, towers.</li>
        <li><b>Miner</b> — stone from boulders; salvages ancient ruins; cracks crystal lodes for essence; works Mine Shafts when lodes run dry.</li>
        <li><b>Farmer</b> — tends wheat plots. A Windmill nearby grows them 35% faster.</li>
        <li><b>Fisher</b> — works a Fishing Dock on the shore. Steady food, no farmland.</li>
        <li><b>Medic</b> — gathers herbs to stock the Hospital, which mends the wounded nearby. Needs a built Hospital (day 2).</li>
        <li><b>Fletcher</b> — fashions arrows from wood at a Fletcher Hut; towers and raiding guards burn them.</li>
        <li><b>Smith</b> — forges tools at the Smithy; every worker wears them out, and bare hands are slow.</li>
        <li><b>Cook</b> — simmers berries into proper meals at the Kitchen (3 food + 1 wood \u2192 2 meals).</li>
        <li><b>Brewer</b> — brews ale at the Tavern (food + herbs); a dusk drink speeds the whole village tomorrow.</li>
        <li><b>Builder</b> — raises construction, repairs damage (costs materials), clears marked wild tiles and <b>fills shore water with stone</b> to make new land.</li>
        <li><b>Guard</b> — patrols, fights, and raids monoliths. A Barracks makes all guards +30% damage.</li>
      </ul>
      <h2>Supply Lines</h2>
      <ul>
        <li><b>Arrows are ammunition</b> — every tower shot spends 1 (ballistae 2), and raids pack quivers (5). Dry quivers: towers hold fire, guards hit at 75%. Build a Fletcher Hut before your towers go up.</li>
        <li><b>Tools wear out</b> — each worker burns through tools (a Smithy forges them from 2 wood + 1 stone). Bare-handed villagers work at 65% speed.</li>
        <li><b>Cooked beats raw</b> — Kitchen meals satisfy 85 hunger vs 54 for 3 raw food.</li>
        <li><b>Stores have caps</b> — wood/stone 120, food 80, herbs 20. Granaries & Storehouses raise them; overflow spoils to vermin at dawn.</li>
        <li><b>Comfort matters</b> — bedrolls (Tent) \u2192 real beds (Cottage) \u2192 manor life: snug villagers work +5%, miserable crowds work slower and some may leave at dawn.</li>
        <li><b>Upgrades</b> — select a built Watchtower, Wheat Plot or Palisade and press the \u2b06 button for a stronger tier in place.</li>
      </ul>
      <h2>Surviving the Night</h2>
      <ul>
        <li>Walls route the horde; they break gates and weak walls, so ring your camp and mind the gaps.</li>
        <li><b>Watchtowers</b> (day 3) shoot automatically; <b>Ballistae</b> (day 7) out-range everything.</li>
        <li><b>Runners</b> are fast and fragile; <b>Brutes</b> (day 6) smash walls; <b>Bonecasters</b> (day 7) lob bones from range; <b>Stalkers</b> (day 9) hunt villagers; <b>Wraiths</b> drift <i>through</i> walls — keep guards inside; <b>Colossi</b> (day 15, endless) are walking sieges.</li>
        <li><b>Spike Traps</b> wound and slow whatever steps on them; lay rows before your gates.</li>
        <li><b>Powers</b>: Mend heals, Smite erases shades, Stasis (day 5) freezes a circle for 5s, Meteor (day 6) wipes waves. Essence flows from time, kills and Shrines.</li>
        <li>The dead are buried where they fall — little graves remember them.</li>
      </ul>
      <h2>People</h2>
      <p>Villagers are named individuals with traits (Hardy, Swift, Diligent, Strong Back). New folks arrive at dawn if there's <b>housing and food</b>. Starvation kills — keep the store above ~15.</p>
      <h2>Saving</h2>
      <p>Autosaves at every dawn, plus three manual slots (Menu \u2192 Save). Saves live in this browser.</p>`;
  },
};
