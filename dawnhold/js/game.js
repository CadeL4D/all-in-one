'use strict';
/* ============================================================
   Dawnhold — game.js
   The simulation: day/night cycle, villager job AI, monster
   waves, combat, food & essence economy, population growth,
   unlocks, chronicle, victory & defeat.
   ============================================================ */

const Sim = {
  /* ---------------- setup ---------------- */
  newGame(diff, seed) {
    const C = CONFIG;
    G.state = 'playing';
    G.seed = seed || (Math.random() * 1e9) | 0;
    G.day = 1; G.time = 0; G.phase = 'day';
    G.speed = 1; G.paused = false;
    G.diff = diff in C.DIFF ? diff : 'normal';
    G.diffM = C.DIFF[G.diff];
    G.res = {};
    for (const k in C.START) G.res[k] = Math.max(0, Math.round(C.START[k] * (G.diffM.startMul || 1)));
    G.villagers = []; G.monsters = []; G.buildings = []; G.clearJobs = [];
    G.effects = []; G.floaters = [];
    G.jobs = { idle: 0, forager: 2, lumber: 2, miner: 1, farmer: 0, fisher: 0, medic: 0, builder: 1, guard: 0, fletcher: 0, smith: 0, cook: 0, brewer: 0, bottler: 0, baker: 0, scribe: 0 };
    G.regrow = new Map();
    G.stats = { kills: 0, deaths: 0, built: 0, gathered: 0, wavePeak: 0, peakPop: C.VIL_START };
    G.chronicle = [];
    G.wave = null; G.finalNight = false; G.beaconLit = false; G.boss = null;
    G.tut = 0; G.tutOn = true;
    G.shake = 0; G.sel = null; G.follow = null;
    G.handsUsed = 0; G.buffs = {};
    G.drill = { runner: 0, brute: 0, stalker: 0 };
    G.endless = false;
    G.tend = new Map(); G.cuttings = 0; G.sigils = []; G.sigilDraft = null;
    G.digJobs = []; G.dug = 0; G.fellCount = 0; G.herd = null;
    G.banns = []; G.feastPending = false;

    Buildings.byIdMap.clear();
    World.gen(G.seed);

    const cx = World.W / 2 | 0, cy = World.H / 2 | 0;
    // starting camp slightly left of center, tents around it
    Buildings.create('camp', cx - 1, cy - 1, true);
    // a well by the camp — the first bucket of the village
    for (const [ox, oy] of [[3, 0], [0, 3], [3, 3], [-1, 3], [3, -1]]) {
      if (World.walkable(cx + ox, cy + oy) && !World.bldAt(cx + ox, cy + oy)) { Buildings.create('well', cx + ox, cy + oy, true); break; }
    }
    // monster lairs from the generator
    for (const spot of World.lairSpots) Buildings.create('lair', spot.x, spot.y, true);
    G.bloodMoon = false;
    G.raidTarget = null;
    G.dryWarned = false;
    const starters = ['forager', 'forager', 'lumber', 'lumber', 'miner', 'builder'];
    for (let i = 0; i < C.VIL_START; i++) {
      const a = (i / C.VIL_START) * Math.PI * 2;
      const v = Entities.makeVillager(cx + Math.cos(a) * 2.5 + .5, cy + Math.sin(a) * 2.5 + .5, starters[i]);
      G.villagers.push(v);
    }
    G.cam.x = (cx + .5) * C.TILE; G.cam.y = (cy + .5) * C.TILE; G.cam.z = C.ZOOM.start;

    // grant start unlocks — "day 1" cards are available from the first minute
    G.unlocks = {};
    for (const k in BUILD) if (BUILD[k].unlock <= 1) G.unlocks[k] = true;

    this.log(`Day 1 — ${C.VIL_START} settlers raise the camp of Dawnhold beneath a dimming sun. Three dark monoliths brood on the horizon.`, 'good');
    UI.toast('Shelter is short — raise Tents before dark.', 'good');
    UI.tutStart();
    UI.refreshAll();
    UI.showGameUI();
  },

  /* ---------------- main tick ---------------- */
  tick(dtRaw) {
    if (G.state !== 'playing') return;
    const C = CONFIG;
    const dt = Math.min(dtRaw, 0.25); // clamp big pauses
    G.time += dt;

    // ----- phase machine -----
    let plen;
    if (G.phase === 'day') plen = G.diffM.dayLen || C.DAY_LEN; // C1: daylight is a difficulty lever
    else if (G.phase === 'dusk') plen = C.TRANS;
    else if (G.phase === 'night') plen = C.NIGHT_LEN * G.diffM.night;
    else plen = C.TRANS;
    if (G.time >= plen) {
      G.time -= plen;
      if (G.phase === 'day') this.dusk();
      else if (G.phase === 'dusk') this.night();
      else if (G.phase === 'night') this.dawnPhase();
      else this.dayStart();
    }

    // ----- spawner -----
    if (G.wave && G.phase === 'night') this.waveSpawn(dt);
    this.lairTick(dt);

    // ----- essence -----
    let regen = (isDayLike() ? C.ESSENCE.regenDay : C.ESSENCE.regenNight) * G.diffM.regen;
    for (const b of G.buildings) if (b.built && b.def.essence) regen += 0.06;
    if (G.buildings.some(b => b.built && b.key === 'dawnshrine')) regen *= C.RESTORE.shrineMul; // the Dawn Shrine remembers the light
    G.res.essence = Math.min(C.ESSENCE.max, G.res.essence + regen * dt);

    // ----- lamp oil: torches sip it through the night, then gutter -----
    if (isNightLike() && G.res.oil > 0) {
      let torches = 0;
      for (const b of G.buildings) if (b.built && b.key === 'torch') torches++;
      if (torches > 0) {
        G.res.oil = Math.max(0, G.res.oil - torches * C.OIL.sip * (G.buffs.handDip ? 0.5 : 1) * dt);
        if (G.res.oil <= 0 && !G._oilDryWarned) {
          G._oilDryWarned = true;
          UI.toast('The torches gutter — the Oil Press needs charcoal and herbs.', 'bad');
          this.log('The lamp oil ran dry; the torches burned low.', 'bad');
        }
      }
    } else if (G.res.oil > 0) G._oilDryWarned = false;

    // ----- entities -----
    Buildings.update(dt);
    for (let i = G.villagers.length - 1; i >= 0; i--) {
      const v = G.villagers[i];
      this.updateVillager(v, dt);
      if (v.hp <= 0) this.villagerDeath(v, v.starving ? 'starvation' : v.thirst >= 99.5 ? 'thirst' : 'the horde');
    }
    for (let i = G.monsters.length - 1; i >= 0; i--) {
      const m = G.monsters[i];
      this.updateMonster(m, dt);
      if (m.dead || m.hp <= 0) { G.monsters.splice(i, 1); if (G.boss === m) { G.boss = null; UI.bossBar(null); } }
    }
    this.separate(dt);
    // wildcraft: the herd, the banns, the wards (v1.6)
    Wilds.tick(dt);

    // ----- regrowth -----
    if (G.regrow.size) {
      for (const [i, rg] of G.regrow) {
        rg.t -= dt;
        if (rg.t <= 0) {
          const x = i % World.W, y = (i / World.W) | 0;
          if (rg.kind === OBJ.BUSH) {
            World.amt[i] = Wilds.bushYield(x, y); // tended bushes hang heavier
          } else if (rg.kind === OBJ.HERB || rg.kind === OBJ.REED) {
            World.amt[i] = amtOf(rg.kind);
          } else if (rg.kind === OBJ.TREE || rg.kind === OBJ.PINE) {
            if (World.obj[i] === OBJ.STUMP) {
              World.obj[i] = OBJ.SAPLING;
              rg.t = 55 + Math.random() * 30;
              continue;
            } else if (World.obj[i] === OBJ.SAPLING) {
              World.obj[i] = rg.kind;
              World.amt[i] = amtOf(rg.kind);
            }
          }
          G.regrow.delete(i);
        }
      }
    }

    this.updateEffects(dt);

    // ----- tutorial & defeat -----
    UI.tutCheck();
    if (G.villagers.length === 0 && G.state === 'playing') {
      G.state = 'defeat';
      this.log('The last light of Dawnhold goes out.', 'bad');
      setTimeout(() => UI.endScreen('defeat'), 1600);
    }
  },

  // compass bearing of tonight's attack (nearest living lair) — 'east'.. or null
  telegraphDir() {
    const lairs = Buildings.lairs();
    if (!lairs.length) return null;
    let nearest = null, bd = 1e9;
    for (const l of lairs) {
      const d = U.dst2(World.center.x, World.center.y, l.x, l.y);
      if (d < bd) { bd = d; nearest = l; }
    }
    const ang = Math.atan2(nearest.y - World.center.y, nearest.x - World.center.x);
    const dirs = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
    return dirs[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
  },

  /* ---------------- phases ---------------- */
  dusk() {
    G.phase = 'dusk';
    G.bloodMoon = G.day >= CONFIG.WAVE.bloodEvery && G.day % CONFIG.WAVE.bloodEvery === 0 && this.waveSize(G.day) > 0;
    const n = this.waveSize(G.day) * (G.bloodMoon ? (G.diffM.bloodMult || CONFIG.WAVE.bloodMult) : 1);
    if (n > 0) {
      // direction telegraph from the nearest living lair (readable tactics)
      const dir = this.telegraphDir();
      if (dir) {
        UI.toast(G.bloodMoon
          ? `A BLOOD MOON rises — a greater horde boils from the monolith to the ${dir}!`
          : `The sun slips away. ${n} shapes crawl from the monolith to the ${dir}...`, 'bad');
        this.log(G.bloodMoon ? `Blood moon — the lairs empty themselves upon the valley.` : `Dusk of day ${G.day} — the horde stirs to the ${dir}.`, 'bad');
      } else {
        UI.toast(G.bloodMoon ? 'A BLOOD MOON rises — the dark has no home left, so all of it comes!' : `The sun slips away. ${n} shapes drift in from the wilds...`, 'bad');
        this.log(`Dusk of day ${G.day} — no lairs remain, yet ${n} shapes gather from the wilds.`, 'bad');
      }
    } else if (G.diff === 'peaceful') {
      UI.toast('Night falls. Peaceful valley — nothing stirs.', 'good');
    }
    // villagers seek shelter
    for (const v of G.villagers) {
      if (v.job === 'guard') continue;
      v.state = 'shelter'; v.path = null; v.tgt = null; v.workB = null;
    }
    // the tavern pours at dusk — tomorrow's work goes quicker (a watched,
    // hand-stirred brew pours bright: +15% instead of +10%)
    for (const v of G.villagers) { v.buzzed = false; v.buzzMult = 0; }
    if (G.res.ale >= 1 && G.villagers.length) {
      const pct = G.buffs.brightAle ? 0.15 : CONFIG.ALE.buzz;
      let served = 0;
      for (const v of G.villagers) {
        if (G.res.ale < 1) break;
        G.res.ale -= 1; v.buzzed = true; v.buzzMult = 1 + pct; served++;
        v.thirst = Math.max(0, v.thirst - CONFIG.ALE.quench); // ale is a drink too
      }
      if (served) {
        const bright = !!G.buffs.brightAle;
        delete G.buffs.brightAle;
        UI.toast(bright
          ? `Bright ale for ${served} — the watched brew goes down sweet (+15% tomorrow).`
          : (served === G.villagers.length ? 'The tavern pours for the whole village — tomorrow\u2019s work will fly (+10%).' : `The tavern pours ${served} round${served > 1 ? 's' : ''} of ale — +10% tomorrow.`), 'good');
        this.log(bright ? 'Bright ale at dusk — the watched brew puts extra spring in tomorrow.' : 'Ale at dusk — the village wakes quick tomorrow.', 'good');
      }
    }
    G.dryWarned = false; // fresh night, fresh quiver warnings
    Wilds.dusk(); // the chalk blooms; the herd beds down
    if (G.tut === 3) UI.tutAdvance(4);
  },

  night() {
    G.phase = 'night';
    const base = this.waveSize(G.day);
    if (base > 0) {
      const isFinal = G.finalNight;
      const lairs = Buildings.lairs();
      const noLairMult = lairs.length ? 1 : CONFIG.WAVE.noLairMult;
      const total = Math.max(1, Math.round((base * (G.bloodMoon ? (G.diffM.bloodMult || CONFIG.WAVE.bloodMult) : 1) * noLairMult) * (isFinal ? CONFIG.WAVE.final : 1)));
      let comps = [];
      for (let i = 0; i < total; i++) comps.push(this.rollType(G.day));
      G.wave = { left: total, comps, t: 0, window: CONFIG.WAVE.spawnWindow };
      G.stats.wavePeak = Math.max(G.stats.wavePeak, total);
      if (isFinal) {
        comps.push('lord');
        G.finalNightDay = G.day;
        UI.toast('THE LONG NIGHT — the horde answers the Beacon!', 'bad');
        this.log('The Long Night begins. Everything the dark has, it sends.', 'bad');
      }
    } else G.wave = null;
  },

  dawnPhase() {
    G.phase = 'dawn';
    G.wave = null;
    // monsters burn away in sunlight
    for (const m of G.monsters) {
      m.burning = 2.2;
      m.state = 'burn';
    }
    const dayBefore = G.day;
    // victory requires surviving the actual final assault night
    const survivedFinal = G.beaconLit && G.finalNightDay === dayBefore;
    // day turnover happens as the sun crests
    G.day++;
    G.time = 0;

    // heal villagers
    for (const v of G.villagers) {
      v.hp = Math.min(v.maxHp, v.hp + v.maxHp * CONFIG.V.dayHeal);
      v.state = 'idle'; v.path = null; v.tgt = null; v.workB = null; v.fearT = 0;
      v.starving = false; v.starveWarned = false;
    }
    // fresh day: warm hands refill, day-scoped buffs wear off
    G.handsUsed = 0;
    if (G.buffs.suture) delete G.buffs.suture;
    if (G.buffs.handDip) delete G.buffs.handDip;
    if (G.buffs.flintDays) { G.buffs.flintDays--; if (G.buffs.flintDays <= 0) delete G.buffs.flintDays; }
    // the wedding feast, poured the day after the banns
    if (G.feastPending) {
      G.feastPending = false;
      G.buffs.feast = true;
      UI.toast('The wedding feast still warms the village — +10% work today.', 'magic');
    } else if (G.buffs.feast) delete G.buffs.feast;
    G.stats.peakPop = Math.max(G.stats.peakPop, G.villagers.length);

    // wildcraft: chalk fades, a herd may wander in
    Wilds.dawn();
    // the Sky Watch reads tonight's attack a dawn early
    if (G.buildings.some(b => b.built && b.key === 'skywatch') && this.waveSize(G.day) > 0 && G.diffM.wave > 0) {
      const dir = this.telegraphDir();
      if (dir) {
        UI.toast(`The Sky Watch reads the wind — tonight\u2019s horde will come from the ${dir}.`, 'magic');
        this.log(`The Sky Watch marked movement to the ${dir}.`, 'magic');
      }
    }

    // victory check
    if (survivedFinal && G.finalNight && G.buildings.some(b => b.key === 'beacon' && b.built)) {
      G.state = 'victory';
      this.log('THE BEACON BLAZES. Dawn returns — forever.', 'magic');
      setTimeout(() => UI.endScreen('victory'), 1800);
      return;
    }

    // unlocks
    let newU = [];
    for (const k in BUILD) {
      const d = BUILD[k];
      if (!G.unlocks[k] && d.unlock > 0 && d.unlock <= G.day) { G.unlocks[k] = true; newU.push(d.name); }
    }
    for (const pk in POWERS) {
      const p = POWERS[pk];
      if (p.unlockDay && !G.unlocks['__pw_' + pk] && p.unlockDay <= G.day) {
        G.unlocks['__pw_' + pk] = true;
        newU.push(`${p.name} (Power)`);
      }
    }
    if (newU.length) {
      UI.toast('Unlocked: ' + newU.join(', '), 'good');
      this.log(`Word spreads — new craft learned: ${newU.join(', ')}.`, 'good');
      UI.refreshAll();
    }

    // arrivals
    this.arrivals();

    this.log(`Dawn of day ${G.day}. ${G.villagers.length} souls, ${G.res.food} food in store.`, '');
    UI.toast(`Day ${G.day} — the village stands.`, 'good');

    if (G.settings.autosave) SaveSys.autosave();
    if (G.tut === 1) UI.tutAdvance(2);
  },

  dayStart() {
    G.phase = 'day';
    G._capNote = false;
    // vermin and rot claim whatever outlasted the caps overnight —
    // but what goes into a Root Cellar keeps
    for (const k of ['food', 'wood', 'stone']) {
      if (k === 'food' && G.buildings.some(b => b.built && b.key === 'cellar')) continue;
      const cap = Buildings.capOf(k);
      if (cap != null && G.res[k] > cap) {
        G.res[k] = cap;
        UI.toast('Vermin and rot claimed the overnight overflow — raise a Granary or Storehouse.', 'bad');
        this.log('Stores past their caps spoiled in the night.', 'bad');
        break;
      }
    }
    // miserable, overcrowded villages thin out at dawn
    if (this.contentment().label === 'Miserable' && G.day >= 4 && G.villagers.length >= 8 && Math.random() < CONFIG.COMFORT.leaveChance && G.villagers.length > 1) {
      const v = U.choice(G.villagers.filter(o => o.state !== 'arrive'));
      if (v) this.depart(v);
    }
    // a little daytime texture: variety beats repetition (audit: Final Outpost)
    if (G.day >= 2 && Math.random() < 0.30) this.dayEvent();
  },

  // a discontent villager packs up and leaves for softer beds
  depart(v) {
    const i = G.villagers.indexOf(v);
    if (i < 0) return;
    G.villagers.splice(i, 1);
    if (G.follow === v) G.follow = null;
    if (G.sel && G.sel.ref === v) { G.sel = null; UI.selHide(); }
    UI.toast(`${v.name} packed up and left for softer beds.`, 'bad');
    this.log(`${v.name} left the village — the beds were too thin on the ground.`, 'bad');
    this.reassign();
  },

  dayEvent() {
    const roll = Math.random();
    // C3: the daylight-ambush band widens or vanishes with difficulty
    const hostile = (G.diffM && G.diffM.eventHostile != null) ? G.diffM.eventHostile : 1;
    const ambushTo = 0.68 + 0.18 * hostile;
    if (roll < 0.38) {
      let n = 0;
      for (let i = 0; i < World.obj.length; i++) {
        if (World.obj[i] === OBJ.BUSH && World.amt[i] < Wilds.bushYield(i % World.W, (i / World.W) | 0)) {
          World.amt[i] = Wilds.bushYield(i % World.W, (i / World.W) | 0); n++;
        }
      }
      if (n > 0) {
        UI.toast('Overnight rain — every bush hangs heavy with berries!', 'good');
        this.log('A good rain. The thickets hang heavy with berries.', 'good');
      }
    } else if (roll < 0.68 && G.day >= 3) {
      const w = 10 + G.day * 2;
      this.gain('wood', w);
      UI.toast(`Foragers drag home a storm-felled oak: +${w} wood.`, 'good');
      this.log('A storm-felled oak yielded seasoned timber.', 'good');
    } else if (roll < ambushTo && G.day >= 5 && G.monsters.length === 0) {
      const n = U.irnd(2, 3);
      for (let i = 0; i < n; i++) {
        const p = World.edgePoint();
        G.monsters.push(Entities.makeMonster('runner', p.x, p.y));
      }
      UI.toast('Unnatural gloom — a pack of runners stalks the valley in daylight!', 'bad');
      this.log('Runners prowled in broad daylight. The dark grows bold.', 'bad');
    } else {
      const e = 10 + G.day;
      G.res.essence = Math.min(CONFIG.ESSENCE.max, G.res.essence + e);
      UI.toast(`A pilgrim shares tales of the Light: +${e} essence.`, 'magic');
      this.log('A pilgrim passed through, sharing tales of the Light.', 'magic');
    }
  },

  waveSize(day) {
    if (G.diffM.wave === 0) return 0;
    // the ceiling rises in endless mode: past the Beacon the horde may reach 38
    const cap = G.endless ? CONFIG.WAVE.capEndless : CONFIG.WAVE.cap;
    let n = Math.min(cap, Math.round((CONFIG.WAVE.base + CONFIG.WAVE.per * day) * G.diffM.wave));
    // B5: night one has a per-difficulty floor of its own
    if (day === 1 && G.diffM.night1) n = Math.max(n, G.diffM.night1);
    return n;
  },

  rollType(day) {
    const M = CONFIG.MONS;
    const shift = G.diffM.debutShift || 0; // B2: harder nights debut monsters sooner
    let pool = [{ t: 'shade', w: 1 }];
    if (day >= M.runner.from + shift) pool.push({ t: 'runner', w: M.runner.w });
    if (day >= M.brute.from + shift) pool.push({ t: 'brute', w: M.brute.w });
    if (day >= M.stalker.from + shift) pool.push({ t: 'stalker', w: M.stalker.w });
    if (day >= M.boner.from + shift) pool.push({ t: 'boner', w: M.boner.w });
    if (day >= M.wraith.from + shift) pool.push({ t: 'wraith', w: M.wraith.w });
    if (day >= M.colossus.from + shift) pool.push({ t: 'colossus', w: M.colossus.w });
    let tot = pool.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * tot;
    for (const p of pool) { r -= p.w; if (r <= 0) return p.t; }
    return 'shade';
  },

  waveSpawn(dt) {
    const w = G.wave;
    w.t += dt;
    const should = Math.min(w.comps.length, Math.floor(w.t / w.window * (w.comps.length + 2)));
    const lairs = Buildings.lairs();
    while (w.left > 0 && G.monsters.length < 70 && w.comps.length - w.left < should) {
      const type = w.comps[w.comps.length - w.left];
      w.left--;
      let px, py;
      if (lairs.length) {
        // crawl out of a living lair (with a little jitter), snapped onto
        // walkable in-bounds ground so guards always have a route to it
        const l = U.choice(lairs);
        px = l.x + .5 + (Math.random() - .5) * 1.6;
        py = l.y + .5 + (Math.random() - .5) * 1.6;
        let sx = U.clamp(px | 0, 1, World.W - 2), sy = U.clamp(py | 0, 1, World.H - 2);
        if (!World.walkable(sx, sy)) {
          const sp = Path.nearbyFree(sx, sy, true, 3);
          if (sp) { sx = sp.x; sy = sp.y; }
        }
        px = sx + .5; py = sy + .5;
      } else {
        const p = World.edgePoint(G.nextSides);
        px = p.x; py = p.y;
      }
      const m = Entities.makeMonster(type, px, py);
      G.monsters.push(m);
      if (lairs.length && Math.random() < .4) this.fx('spark', px, py - .4, .3);
      if (type === 'lord') { G.boss = m; UI.bossBar(m); UI.toast('A NIGHT LORD rises with the horde!', 'bad'); G.shake = Math.max(G.shake, 6); }
      if (type === 'colossus') { UI.toast('The ground shakes — a COLOSSUS has come!', 'bad'); G.shake = Math.max(G.shake, 5); }
    }
    if (w.left <= 0 && G.monsters.length === 0) G.wave = null;
  },

  // monoliths shrug off old wounds, and a raided one calls its brood to defend it.
  // A lit brazier nearby (b.cleansed, set in Buildings.update) silences both.
  lairTick(dt) {
    const rt = G.raidTarget;
    for (const b of G.buildings) {
      if (b.key !== 'lair') continue;
      if (b.hitT > 0) b.hitT = Math.max(0, b.hitT - dt);
      else if (b.hp < b.maxHp && !b.cleansed) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * CONFIG.LAIR.regenPct * (G.diffM.lairRegenMul || 1) * dt);
      // struck within the last ~2.5s → the raid is live, the brood answers
      if (b === rt && !b.cleansed && b.hitT > CONFIG.LAIR.regenDelay - 2.5) {
        b.defT = (b.defT == null ? 1.2 : b.defT) - dt;
        if (b.defT <= 0) {
          b.defT = CONFIG.RAID.defEvery;
          this.lairDefenders(b);
        }
      } else if (b === rt) {
        b.defT = null; // guards stopped hacking — the brood settles
      }
      b.cleansed = false; // braziers re-light this flag each frame they burn
    }
  },

  // spawn a few day-scaled monsters at the lair, capped so a raid stays winnable
  lairDefenders(b) {
    const guards = G.villagers.filter(v => v.job === 'guard' && v.hp > 0).length;
    if (!guards) return;
    const alive = G.monsters.filter(m => !m.dead && m.defend === b).length;
    if (alive >= CONFIG.RAID.defCap) return;
    const want = Math.min(CONFIG.RAID.defCap - alive, 1 + (guards >= 3 ? 1 : 0) + (G.day >= 8 ? 1 : 0));
    let spawned = 0;
    for (let k = 0; k < want; k++) {
      let sx = U.clamp((b.x + .5 + (Math.random() - .5) * 3) | 0, 1, World.W - 2);
      let sy = U.clamp((b.y + .5 + (Math.random() - .5) * 3) | 0, 1, World.H - 2);
      if (!World.walkable(sx, sy)) {
        const sp = Path.nearbyFree(sx, sy, true, 3);
        if (!sp) continue;
        sx = sp.x; sy = sp.y;
      }
      const m = Entities.makeMonster(this.rollType(G.day), sx + .5, sy + .5);
      m.defend = b;
      G.monsters.push(m);
      this.fx('spark', sx + .5, sy + .1, .35);
      spawned++;
    }
    if (spawned && alive === 0) {
      UI.toast('The Dark Monolith shrieks — its brood rises to defend it!', 'bad');
      this.log('The raided monolith called its brood to its defense.', 'bad');
      G.shake = Math.max(G.shake, 3);
    }
  },

  arrivals() {
    const C = CONFIG.ARRIVE;
    const cap = Buildings.housingCap();
    const pop = G.villagers.length;
    if (pop >= C.maxPop) return;
    let arrived = [];
    if (G.res.food >= C.foodNeed && pop < cap && Math.random() < ((G.diffM && G.diffM.arrive != null) ? G.diffM.arrive : C.chance)) {
      arrived.push(this.spawnArriver('A wanderer arrives from the wilds, seeking shelter.'));
    }
    if (G.day % C.everyN === 0 && cap - pop >= C.n && G.res.food >= C.foodNeed) {
      for (let i = 0; i < C.n; i++) if (G.villagers.length < C.maxPop && G.villagers.length < Buildings.housingCap())
        arrived.push(this.spawnArriver('Refugees flee the dark and join Dawnhold.'));
    }
    if (arrived.length) {
      UI.toast(arrived[0], 'good');
      this.reassign();
    }
  },

  spawnArriver(msg) {
    const p = World.edgePoint();
    const v = Entities.makeVillager(p.x, p.y, 'idle', true);
    G.villagers.push(v);
    v.path = null;
    this.log(`${v.name}${v.trait ? ' the ' + v.trait.name : ''} joins the settlement.`, 'good');
    return msg;
  },

  /* ---------------- villager brain ---------------- */
  updateVillager(v, dt) {
    if (v.below) return; // a miner in the Deep Seam is off the map for now
    const C = CONFIG;
    // hunger always ticks
    v.hunger = Math.min(100, v.hunger + C.HUNGER.rate * dt);
    if (v.hunger > C.HUNGER.mealAt) {
      // bread from the bakehouse first, then hot meals, then raw berries
      if (G.res.bread >= 1) {
        G.res.bread -= 1;
        v.hunger = Math.max(0, v.hunger - C.BREAD.restore);
        this.float(v.x, v.y - .6, 'bread', '#d9b06c');
      } else if (G.res.meals >= 1) {
        G.res.meals -= 1;
        v.hunger = Math.max(0, v.hunger - C.MEAL.restore);
        this.float(v.x, v.y - .6, 'hot meal', '#e8a94b');
      } else if (G.res.food >= C.HUNGER.mealCost) {
        G.res.food -= C.HUNGER.mealCost;
        v.hunger = Math.max(0, v.hunger - C.HUNGER.mealRestore);
        this.float(v.x, v.y - .6, 'berries', '#7dc95e');
      }
    }
    v.starving = v.hunger >= 99.5;
    if (v.starving) {
      v.hp -= C.HUNGER.starveDps * dt;
      if (!v.starveWarned) { v.starveWarned = true; UI.toast(`${v.name} is starving!`, 'bad'); this.log(`${v.name} starves — the store is empty.`, 'bad'); }
    } else if (v.hunger < 80) v.starveWarned = false;

    // thirst ticks beside hunger — bottles drink on the spot, the well needs
    // the walk, and the ancient Aqueduct brings the spring to your work
    v.thirst = Math.min(100, v.thirst + C.THIRST.rate * dt);
    if (v.thirst > C.THIRST.drinkAt && v.state !== 'drink' && v.state !== 'flee' && v.state !== 'fight' && v.state !== 'arrive' && !v.schooling) {
      if (G.res.bottles >= 1) {
        G.res.bottles -= 1;
        v.thirst = Math.max(0, v.thirst - C.THIRST.restore);
        this.float(v.x, v.y - .6, 'bottled water', '#6fb7d9');
      } else if (Wilds.nearAqueduct(v.x, v.y)) {
        v.thirst = Math.max(0, v.thirst - C.THIRST.restore);
        this.float(v.x, v.y - .6, 'spring water', '#8fd0ee');
      } else {
        this.sendToDrink(v); // no well or no route → they keep at it, growing parched
      }
    }
    if (v.thirst >= 99.5) {
      v.hp -= C.THIRST.parchDps * dt;
      if (!v.parchWarned) { v.parchWarned = true; UI.toast(`${v.name} is parched!`, 'bad'); this.log(`${v.name} has nothing to drink.`, 'bad'); }
    } else if (v.thirst < 80) v.parchWarned = false;

    if (v.atkCd > 0) v.atkCd -= dt;
    if (v.fearT > 0) v.fearT -= dt;
    v.aiT -= dt;
    if (v.aiT <= 0) { v.aiT = 0.45 + Math.random() * 0.2; this.vThink(v); }

    // movement
    if (v.path && v.pi < v.path.length) {
      const spd = Entities.villagerSpeed(v) * (v.state === 'flee' ? 1.25 : 1);
      this.moveAlong(v, dt, spd);
      v.anim += dt * 9;
    } else {
      v.anim = 0;
      // working animation / progress
      if (v.state === 'work' && (v.tgtTile || v.workB)) this.vWork(v, dt);
    }
  },

  vThink(v) {
    // arrivers walk to camp then join
    if (v.state === 'arrive') {
      if (!v.path) {
        const c = World.center;
        v.path = Path.find(v.x | 0, v.y | 0, c.x | 0, c.y | 0, { adjacent: true });
        v.pi = 0;
        if (!v.path) { v.state = 'idle'; }
      }
      if (!v.path || v.pi >= v.path.length) v.state = 'idle';
      return;
    }

    // fear overrides work (non-guards) — workers no longer shelter at night,
    // so they spook from a wider radius after dark. Inside a hallow sigil
    // the folk hold their ground.
    if (v.job !== 'guard' && v.fearT <= 0 && !Wilds.nearSigil(v.x, v.y, 'hallow', true)) {
      for (const m of G.monsters) {
        if (!m.dead && U.dst2(v.x, v.y, m.x, m.y) < (isNightLike() ? 30 : 12)) {
          v.fearT = 4.5; v.state = 'flee'; v.path = null;
          break;
        }
      }
    }

    // a hunt's drivers spend the day at the herd's flank
    if (Wilds.driveThink(v)) return;

    // a lesson in progress calls the student to the schoolhouse (fear and a
    // dry throat come first — class resumes after)
    if (v.schooling && v.state !== 'flee' && v.state !== 'drink') {
      const teacher = G.villagers.some(o => o !== v && o.workB === v.schooling && (o.state === 'work' || o.state === 'toWork'));
      if (!G.buildings.includes(v.schooling) || !teacher) {
        v.schooling = null;
        if (v.state === 'school') { v.state = 'idle'; v.path = null; }
      } else if (v.state !== 'school') {
        const p = Path.find(v.x | 0, v.y | 0, (v.schooling.x + v.schooling.w / 2) | 0, (v.schooling.y + v.schooling.h / 2) | 0, { adjacent: true });
        if (p) {
          v.path = p; v.pi = 0;
          v.state = 'school';
          v.tgtTile = null; v.workB = null;
        }
      }
    }

    switch (v.state) {
      case 'flee': {
        if (v.fearT <= 0) { v.state = 'idle'; v.path = null; return; }
        if (!v.path || v.pi >= v.path.length) {
          // run to the store farthest from nearest monster
          let m = null, bd = 1e9;
          for (const mm of G.monsters) { const d = U.dst2(v.x, v.y, mm.x, mm.y); if (d < bd) { bd = d; m = mm; } }
          let best = null, score = -1e9;
          for (const s of Buildings.stores()) {
            const sx = s.x + s.w / 2, sy = s.y + s.h / 2;
            const sc = m ? U.dst2(m.x, m.y, sx, sy) - U.dst2(v.x, v.y, sx, sy) * .3 : 0;
            if (sc > score) { score = sc; best = s; }
          }
          if (best) {
            v.path = Path.find(v.x | 0, v.y | 0, (best.x + best.w / 2) | 0, (best.y + best.h / 2) | 0, { adjacent: true });
            v.pi = 0;
          }
        }
        return;
      }
      case 'shelter': {
        // sheltering retired — villagers work through the night and only flee
        // from nearby monsters (loaded saves just resume their duties)
        v.state = 'idle'; v.path = null;
        return;
      }
      case 'toWork': {
        if (v.path && v.pi < v.path.length) return;
        // arrived — verify target
        this.vArriveWork(v);
        return;
      }
      case 'toStore': {
        if (v.path && v.pi < v.path.length) return;
        // deposit
        if (v.carry.amt > 0) {
          this.gain(v.carry.type, v.carry.amt);
          G.stats.gathered += v.carry.amt;
          this.float(v.x, v.y - .7, '+' + v.carry.amt + ' ' + v.carry.type, v.carry.type === 'food' ? '#7dc95e' : v.carry.type === 'wood' ? '#c9964b' : '#a5a5ae');
          v.carry.amt = 0; v.carry.type = null;
        }
        v.state = 'idle';
        return;
      }
      case 'drink': {
        // reached the well — a long, cold drink
        if (v.path && v.pi < v.path.length) return;
        v.thirst = Math.max(0, v.thirst - CONFIG.THIRST.restore);
        if (G.res.water >= 1) G.res.water -= 1;
        this.float(v.x, v.y - .6, 'water', '#6fb7d9');
        v.state = 'idle';
        return;
      }
      case 'school': {
        // the scribe's lesson drives progress; the student just attends
        if (!v.schooling || !G.buildings.includes(v.schooling)) { v.schooling = null; v.path = null; v.state = 'idle'; return; }
        return;
      }
      case 'fight': {
        const m = v.tgt;
        // on a raid the leash lifts — guards fight freely out at the monolith.
        // otherwise pursuit reaches as far as the aggro scan acquires (30
        // tiles) so outlying huts never sit in a band guards see but abandon
        const raiding = G.raidTarget && G.buildings.includes(G.raidTarget);
        if (!m || m.dead || m.hp <= 0 || (!raiding && U.dst(v.x, v.y, World.center.x, World.center.y) > 30)) {
          v.tgt = null; v.state = 'idle'; v.path = null; return;
        }
        const d = U.dst(v.x, v.y, m.x, m.y);
        // a quarry on footing only it can use (spikes, a grave pocket — or
        // the monolith itself, where brood defenders stand) can't share
        // ground with a guard: poke it from whatever ground the guard holds
        const mPass = Path.pass(m.x | 0, m.y | 0, false);
        const reach = mPass ? 1.0 : 2.2;
        if (d < reach) {
          v.path = null;
          v.noPathT = 0;
          if (v.atkCd <= 0) {
            v.atkCd = CONFIG.GUARD.atkT;
            this.hitMonster(m, this.guardDmg(m.type, v), v);
            this.fx('spark', m.x, m.y, .25);
          }
        } else if (!v.path || v.pi >= v.path.length) {
          const p = Path.find(v.x | 0, v.y | 0, m.x | 0, m.y | 0, { adjacent: true, monster: false, snapR: 3 });
          if (p) {
            // finish on the quarry's own position — tile-centre routes end a
            // swing-length short of a stationary biter parked on a hut
            if (mPass) p.push({ x: m.x, y: m.y });
            v.path = p; v.pi = 0; v.noPathT = 0;
          }
          else {
            // unreachable quarry — don't freeze on it; give up after ~2s of failed tries
            v.path = null;
            v.noPathT = (v.noPathT || 0) + 0.5;
            if (v.noPathT > 2) { v.tgt = null; v.state = 'idle'; v.noPathT = 0; }
          }
        }
        return;
      }
    }

    // ----- idle: pick a task -----
    if (v.state === 'work') return;
    let job = v.job;
    // emergency forage
    if (job === 'idle' && G.res.food < 8) job = 'forager';

    if (job === 'guard') {
      let best = null, bd = CONFIG.GUARD.aggro * CONFIG.GUARD.aggro;
      for (const m of G.monsters) {
        if (m.dead) continue;
        const dm = U.dst2(v.x, v.y, m.x, m.y);
        const dc = U.dst2(m.x, m.y, World.center.x, World.center.y);
        if (dc < 30 * 30 && (dm < bd || dm < 64)) { bd = Math.min(bd, dm); best = m; }
      }
      if (best) { v.tgt = best; v.state = 'fight'; v.noPathT = 0; return; }
      // raid order: march on a dark monolith and tear it down
      if (G.raidTarget && G.buildings.includes(G.raidTarget)) {
        const rt = G.raidTarget;
        const d = U.dst(v.x, v.y, rt.x + .5, rt.y + .5);
        // the monolith tile itself is solid to villagers, so swing from any
        // nearby standing spot — dead trees and graves can box in the ring
        if (d < 2.2) {
          v.path = null;
          if (v.atkCd <= 0) {
            v.atkCd = CONFIG.GUARD.atkT;
            this.hitBuilding(rt, this.guardDmg(null, v));
            this.fx('spark', rt.x + .5, rt.y + .3, .3);
          }
          v.noPathT = 0;
        } else if (!v.path || v.pi >= v.path.length) {
          // snapR 3: the ring within 2 of the monolith may be sealed shut —
          // standable ground one tile further out still wins the raid
          const p = Path.find(v.x | 0, v.y | 0, rt.x, rt.y, { adjacent: true, snapR: 3 });
          if (p) { v.path = p; v.pi = 0; }
          else {
            // lair unreachable — call off the raid instead of stranding the guards
            G.raidTarget = null;
            v.path = null; v.state = 'idle';
            this.log('The guards cannot reach that lair — the raid is called off.', 'bad');
            UI.toast('Raid called off: no route to the lair.', 'bad');
          }
          // path keeps "succeeding" but the snap tile is still out of swing
          // reach — the ring is truly walled (forest/graves); suggest clearing
          if (d >= 2.2) {
            v.noPathT = (v.noPathT || 0) + 0.5;
            if (v.noPathT > 6) {
              G.raidTarget = null;
              v.path = null; v.state = 'idle'; v.noPathT = 0;
              UI.toast('The ground around the monolith is choked — clear the dead trees and graves beside it, then raid again.', 'bad');
            }
          } else v.noPathT = 0;
        }
        return;
      }
      // idle patrol — pick a new wander only when the last one is done, so
      // mid-stride rerolls don't make patrols twitch
      if (Math.random() < .3 && (!v.path || v.pi >= v.path.length)) {
        const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 3;
        const tx = U.clamp((World.center.x + Math.cos(a) * r) | 0, 1, World.W - 2);
        const ty = U.clamp((World.center.y + Math.sin(a) * r) | 0, 1, World.H - 2);
        v.path = Path.find(v.x | 0, v.y | 0, tx, ty, { adjacent: true }); v.pi = 0;
      }
      return;
    }

    if (job === 'builder') {
      // construction sites first (ruins mid-decipher wait for the Scribe)
      const sites = Buildings.unBuilt().filter(s => s.phase !== 'decipher');
      if (sites.length) {
        let best = null, bd = 1e9;
        for (const s of sites) {
          const d = U.dst2(v.x, v.y, s.x + s.w / 2, s.y + s.h / 2) / (1 + s.progress * 2);
          if (d < bd) { bd = d; best = s; }
        }
        // only 2 builders per site
        const crew = G.villagers.filter(o => o !== v && o.state === 'work' && o.workB === best).length;
        if (crew < 2 && this.sendToBuilding(v, best, 'build')) return;
      }
      // then ordered demolitions
      const demos = Buildings.demoSites();
      if (demos.length) {
        let best = null, bd = 1e9;
        for (const s of demos) {
          const d = U.dst2(v.x, v.y, s.x + s.w / 2, s.y + s.h / 2);
          if (d < bd) { bd = d; best = s; }
        }
        const crew = G.villagers.filter(o => o !== v && o.state === 'work' && o.workB === best).length;
        if (crew < 2 && this.sendToBuilding(v, best, 'demolish')) return;
      }
      // then repairs
      const dmg = Buildings.damaged().filter(b => b.hp / b.maxHp < 0.75);
      if (dmg.length) {
        for (const b of dmg) {
          if (this.repairable(b) && this.sendToBuilding(v, b, 'repair')) return;
        }
      }
      // then queued land clearing
      if (G.clearJobs.length) {
        let best = null, bd = 1e9;
        for (const t of G.clearJobs) {
          const d = U.dst2(v.x, v.y, t.x + .5, t.y + .5);
          if (d < bd) { bd = d; best = t; }
        }
        const p = Path.find(v.x | 0, v.y | 0, best.x, best.y, { adjacent: true });
        if (p) {
          v.path = p; v.pi = 0;
          v.state = 'toWork';
          v.tgtTile = { x: best.x, y: best.y };
          v.workKind = 'clear'; v.workB = null;
          return;
        }
      }
      // then the Spade's digging orders — tiles carved down to ponds
      if (G.digJobs.length) {
        let best = null, bd = 1e9;
        for (const t of G.digJobs) {
          const d = U.dst2(v.x, v.y, t.x + .5, t.y + .5);
          if (d < bd) { bd = d; best = t; }
        }
        const p = Path.find(v.x | 0, v.y | 0, best.x, best.y, { adjacent: true });
        if (p) {
          v.path = p; v.pi = 0;
          v.state = 'toWork';
          v.tgtTile = { x: best.x, y: best.y };
          v.workKind = 'dig'; v.workB = null;
          return;
        }
      }
      return;
    }

    if (job === 'farmer') {
      let ripe = null, grow = null;
      for (const b of G.buildings) {
        if (b.key !== 'farm' || !b.built) continue;
        if (b.growth >= 1 && !ripe) ripe = b;
        else if (b.growth < 0.92 && !grow) grow = b;
      }
      if (ripe) { if (this.sendToBuilding(v, ripe, 'harvest')) return; }
      else if (grow) { if (this.sendToBuilding(v, grow, 'tend')) return; }
      return;
    }

    // fishers work the docks
    if (job === 'fisher') {
      if (v.carry.amt >= Entities.carryMax(v)) { this.sendToStore(v); return; }
      const huts = Buildings.fisherHuts();
      if (huts.length) {
        let best = huts[0], bc = 1e9;
        for (const h of huts) {
          const crew = G.villagers.filter(o => o !== v && o.workB === h && (o.state === 'work' || o.state === 'toWork')).length;
          const d = U.dst2(v.x, v.y, h.x, h.y) * (1 + crew);
          if (d < bc) { bc = d; best = h; }
        }
        if (this.sendToBuilding(v, best, 'fish')) return;
      }
      return;
    }

    // crafters: fletcher / smith / cook / brewer / bottler / baker run their workplace
    if (job === 'fletcher' || job === 'smith' || job === 'cook' || job === 'brewer' || job === 'bottler' || job === 'baker') {
      const hutKey = { fletcher: 'fletch', smith: 'smithy', cook: 'kitchen', brewer: 'tavern', bottler: 'bottlery', baker: 'bakery' }[job];
      let best = null, bd = 1e9;
      for (const h of G.buildings) {
        if (!h.built || h.key !== hutKey) continue;
        const crew = G.villagers.filter(o => o !== v && o.workB === h && (o.state === 'work' || o.state === 'toWork')).length;
        if (crew >= 1) continue;
        const d = U.dst2(v.x, v.y, h.x + h.w / 2, h.y + h.h / 2);
        if (d < bd) { bd = d; best = h; }
      }
      if (best && this.sendToBuilding(v, best, 'craft')) return;
      if (v.carry.amt > 0) this.sendToStore(v);
      return;
    }

    // the scribe teaches at the schoolhouse — one villager at a time,
    // but a ruin mid-restoration is deciphered first
    if (job === 'scribe') {
      const ruin = Wilds.decipherSite();
      if (ruin && this.sendToBuilding(v, ruin, 'decipher')) return;
      let best = null, bd = 1e9;
      for (const h of G.buildings) {
        if (!h.built || h.key !== 'school') continue;
        const crew = G.villagers.filter(o => o !== v && o.workB === h && (o.state === 'work' || o.state === 'toWork')).length;
        if (crew >= 1) continue;
        const d = U.dst2(v.x, v.y, h.x + h.w / 2, h.y + h.h / 2);
        if (d < bd) { bd = d; best = h; }
      }
      if (best && this.sendToBuilding(v, best, 'teach')) return;
      return;
    }

    // gatherers: forager / lumber / miner / medic
    if (job === 'forager' || job === 'lumber' || job === 'miner' || job === 'medic') {
      const types = job === 'forager' ? [OBJ.BUSH]
        : job === 'lumber' ? [OBJ.TREE, OBJ.PINE, OBJ.BIRCH, OBJ.DEADTREE]
          : job === 'miner' ? [OBJ.ROCK, OBJ.CRYSTAL]
            : [OBJ.HERB, OBJ.REED];
      const resType = job === 'forager' ? 'food' : job === 'lumber' ? 'wood' : job === 'miner' ? 'stone' : 'herbs';
      if (v.carry.amt >= Entities.carryMax(v)) { this.sendToStore(v); return; }
      // Grovekeep first: the player's tended bushes outrank wild berries
      if (job === 'forager') {
        let tt = null, td = 30 * 30;
        for (const [i, t] of G.tend) {
          if (t.stage >= 2 || t.work >= CONFIG.GROVE.stageWork * (t.stage + 1)) continue;
          const x = i % World.W, y = (i / World.W) | 0;
          if (World.objAt(x, y) !== OBJ.BUSH) continue;
          const d = U.dst2(v.x, v.y, x + .5, y + .5);
          if (d < td) { td = d; tt = { x, y }; }
        }
        if (tt) {
          const p = Path.find(v.x | 0, v.y | 0, tt.x, tt.y, { adjacent: true });
          if (p) {
            v.path = p; v.pi = 0;
            v.state = 'toWork';
            v.tgtTile = { x: tt.x, y: tt.y };
            v.workKind = 'tendW'; v.workB = null;
            return;
          }
        }
      }
      const near = World.findNearestObj(v.x | 0, v.y | 0, types, 36);
      if (near) {
        const p = Path.find(v.x | 0, v.y | 0, near.x, near.y, { adjacent: true });
        if (p) {
          v.path = p; v.pi = 0;
          v.state = 'toWork';
          v.tgtTile = { x: near.x, y: near.y };
          v.workKind = resType;
          return;
        }
      }
      // miners with no lodes left work the mine shafts instead
      if (job === 'miner') {
        const mines = Buildings.mines();
        if (mines.length) {
          let best = null, bd = 1e9;
          for (const mn of mines) {
            const crew = G.villagers.filter(o => o !== v && o.workB === mn && (o.state === 'work' || o.state === 'toWork')).length;
            if (crew >= 2) continue;
            const d = U.dst2(v.x, v.y, mn.x, mn.y);
            if (d < bd) { bd = d; best = mn; }
          }
          if (best && this.sendToBuilding(v, best, 'mine')) return;
        }
      }
      // nothing in range — if carrying something, store it; else truly idle
      if (v.carry.amt > 0) this.sendToStore(v);
      return;
    }
  },

  vArriveWork(v) {
    if (v.workKind && v.tgtTile) {
      // must truly stand beside the resource — a cut or partial path means no work
      if (Math.max(Math.abs(v.x - (v.tgtTile.x + .5)), Math.abs(v.y - (v.tgtTile.y + .5))) > 2.6) {
        v.state = 'idle'; v.tgtTile = null;
        return;
      }
      // the Spade: the tile must still be a queued dig order on dry land
      if (v.workKind === 'dig') {
        if (Wilds.digAt(v.tgtTile.x, v.tgtTile.y) && World.tileT(v.tgtTile.x, v.tgtTile.y) !== T.WATER) { v.state = 'work'; v.workT = 0; return; }
        Wilds.dropDig(v.tgtTile.x, v.tgtTile.y);
        v.state = 'idle'; v.tgtTile = null;
        return;
      }
      // Grovekeep: the bush must still be standing to be tended
      if (v.workKind === 'tendW') {
        if (World.objAt(v.tgtTile.x, v.tgtTile.y) === OBJ.BUSH) { v.state = 'work'; v.workT = 0; return; }
        v.state = 'idle'; v.tgtTile = null;
        return;
      }
      // land clearing: any wild growth still standing is fair game
      if (v.workKind === 'clear') {
        const o = World.objAt(v.tgtTile.x, v.tgtTile.y);
        const wild = o === OBJ.TREE || o === OBJ.PINE || o === OBJ.BIRCH || o === OBJ.DEADTREE || o === OBJ.ROCK || o === OBJ.RUIN || o === OBJ.CRYSTAL || o === OBJ.SAPLING || o === OBJ.BUSH;
        const waterJob = World.tileT(v.tgtTile.x, v.tgtTile.y) === T.WATER
          && G.clearJobs.some(t => t.x === v.tgtTile.x && t.y === v.tgtTile.y && t.water);
        if (wild || waterJob) { v.state = 'work'; v.workT = 0; return; }
        this.dropClearJob(v.tgtTile.x, v.tgtTile.y);
        v.state = 'idle'; v.tgtTile = null;
        return;
      }
      const o = World.objAt(v.tgtTile.x, v.tgtTile.y);
      const want = v.workKind === 'food' ? [OBJ.BUSH]
        : v.workKind === 'wood' ? [OBJ.TREE, OBJ.PINE, OBJ.BIRCH, OBJ.DEADTREE]
          : v.workKind === 'stone' ? [OBJ.ROCK, OBJ.CRYSTAL]
            : v.workKind === 'herbs' ? [OBJ.HERB, OBJ.REED] : [];
      if (want.includes(o) && World.amtAt(v.tgtTile.x, v.tgtTile.y) > 0) { v.state = 'work'; v.workT = 0; return; }
      v.state = 'idle'; v.tgtTile = null;
      return;
    }
    if (v.workB) {
      const b = v.workB;
      const alive = G.buildings.includes(b);
      if (!alive) { v.workB = null; v.state = 'idle'; return; }
      // same rule for buildings: adjacent to the footprint, not across the map
      if (!(v.x > b.x - 2.6 && v.x < b.x + b.w + 2.6 && v.y > b.y - 2.6 && v.y < b.y + b.h + 2.6)) {
        v.workB = null; v.state = 'idle';
        return;
      }
      if (v.workMode === 'build' && !b.built) { v.state = 'work'; return; }
      if (v.workMode === 'decipher' && !b.built && b.phase === 'decipher') { v.state = 'work'; return; }
      if (v.workMode === 'demolish' && b.built && b.demo) { v.state = 'work'; return; }
      if (v.workMode === 'repair' && b.hp < b.maxHp && this.repairable(b)) { v.state = 'work'; return; }
      if (v.workMode === 'harvest' && b.built && b.growth >= 1) { v.state = 'work'; v.workT = 0; return; }
      if (v.workMode === 'tend' && b.built && b.growth < 1) { v.state = 'work'; v.workT = 0; return; }
      if ((v.workMode === 'fish' || v.workMode === 'mine' || v.workMode === 'craft' || v.workMode === 'teach') && b.built) { v.state = 'work'; v.workT = 0; return; }
      v.workB = null; v.state = 'idle';
      return;
    }
    v.state = 'idle';
  },

  vWork(v, dt) {
    const ws = Entities.workSpeed(v);
    // hands-on work wears tools out (C6: faster on harder difficulties); a
    // spare from the smithy slots right in — a smith's "true" tool lasts
    // twice as long, and Deep-Seam flint stretches every fresh tool by 25%
    if (v.toolCond > 0) v.toolCond = Math.max(0, v.toolCond - CONFIG.TOOL.wear * ((G.diffM && G.diffM.wearMul) || 1) * dt);
    else if (G.res.tools >= 1) {
      G.res.tools -= 1;
      let cond = CONFIG.TOOL.cond;
      if ((G.buffs.trueTools || 0) > 0) { G.buffs.trueTools--; cond *= 2; this.float(v.x, v.y - .6, 'true tool', '#ffd94a'); }
      else this.float(v.x, v.y - .6, 'fresh tool', '#a5a5ae');
      if ((G.buffs.flintDays || 0) > 0) cond *= 1.25;
      v.toolCond = cond;
    }
    if (v.workKind && v.tgtTile) {
      const { x, y } = v.tgtTile;
      // the Spade: builders carve the tile down until water springs
      if (v.workKind === 'dig') {
        if (!Wilds.digAt(x, y)) { v.tgtTile = null; v.state = 'idle'; return; }
        v.workT += dt * ws;
        if (Math.random() < dt * 2) this.fx('spark', x + .5, y + .4, .2);
        if (v.workT >= CONFIG.SPADE.digTime) {
          Wilds.finishDig(x, y);
          v.tgtTile = null; v.state = 'idle';
        }
        return;
      }
      // Grovekeep: a forager's tending session at a wild bush
      if (v.workKind === 'tendW') {
        const st = Wilds.tendWork(x, y, dt * ws);
        if (st === 1) { this.float(x + .5, y + .2, 'tended', '#8fd45e'); this.log('A wild bush was tended — it will hang heavier from now on.', 'good'); }
        else if (st === 2) { this.float(x + .5, y + .2, 'heavy-fruiting!', '#ffd94a'); this.log('A tended bush came heavy-fruiting — a proper orchard bush, for good.', 'good'); }
        v.workT += dt;
        if (st || v.workT > 8) { v.tgtTile = null; v.state = 'idle'; }
        return;
      }
      // land clearing: one burst of labor, salvage half the yield, tile goes bare.
      // water filling is slower — builders throw stone until there's ground to stand on
      if (v.workKind === 'clear') {
        const job = G.clearJobs.find(t => t.x === x && t.y === y);
        if (World.tileT(x, y) === T.WATER) {
          if (!job || !job.water) { this.dropClearJob(x, y); v.tgtTile = null; v.state = 'idle'; return; }
          v.workT += dt * ws;
          if (v.workT >= CONFIG.CLEAR.waterTime) {
            World.setT(x, y, T.SAND);
            this.dropClearJob(x, y);
            this.float(x + .5, y + .3, 'land filled', '#c9b47a');
            this.fx('spark', x + .5, y + .3, .25);
            v.tgtTile = null; v.state = 'idle';
          }
          return;
        }
        v.workT += dt * ws;
        if (v.workT >= CONFIG.CLEAR.time) {
          this.grantClear(x, y, v);
          this.dropClearJob(x, y);
          v.tgtTile = null; v.state = 'idle';
        }
        return;
      }
      v.workT += dt * ws;
      const jobKey = v.workKind === 'food' ? 'forager' : v.workKind === 'wood' ? 'lumber' : v.workKind === 'stone' ? 'miner' : v.workKind === 'herbs' ? 'medic' : v.job;
      const interval = CONFIG.WORK_T[jobKey] || 0.9;
      while (v.workT >= interval) {
        v.workT -= interval;
        const amt = World.amtAt(x, y);
        if (amt <= 0) { v.state = 'idle'; v.tgtTile = null; break; }
        World.amt[World.idx(x, y)] = amt - 1;
        v.carry.type = v.workKind;
        v.carry.amt++;
        this.fx('spark', x + .5, y + .3, .2);
        if (amt - 1 <= 0) {
          const preO = World.objAt(x, y);
          const bonus = World.deplete(x, y);
          // the Nursery counts felled living trees; tended bushes spare cuttings
          if (preO === OBJ.TREE || preO === OBJ.PINE || preO === OBJ.BIRCH) Wilds.noteFell(x, y);
          else if (preO === OBJ.BUSH) Wilds.onBushHarvested(x, y);
          if (bonus === 'crystal') {
            G.res.essence = Math.min(CONFIG.ESSENCE.max, G.res.essence + CONFIG.CRYSTAL.essence);
            this.float(x + .5, y + .3, '+' + CONFIG.CRYSTAL.essence + ' essence', '#b48ae0');
            this.log('Miners cracked an essence crystal — its light flows to you.', 'magic');
          }
          v.state = 'idle'; v.tgtTile = null;
          break;
        }
        if (v.carry.amt >= Entities.carryMax(v)) { v.state = 'idle'; v.tgtTile = null; break; }
      }
      if (v.state === 'idle' && v.carry.amt > 0) this.sendToStore(v);
      return;
    }
    const b = v.workB;
    if (!b || !G.buildings.includes(b)) { v.workB = null; v.state = 'idle'; return; }
    // the scribe teaches — one enrolled student, lessons move while they sit
    if (v.workMode === 'teach' && b.built) {
      let st = b.student;
      if (st && (!G.villagers.includes(st) || st.schooled)) { st.schooling = null; b.student = null; st = null; }
      if (!st) {
        let cand = null, cd2 = 1e9;
          for (const o of G.villagers) {
            if (o === v || o.schooled || o.job === 'guard' || o.state === 'arrive' || o.schooling || o.below) continue;
          const d = U.dst2(v.x, v.y, o.x, o.y);
          if (d < cd2) { cd2 = d; cand = o; }
        }
        if (cand) { b.student = cand; cand.schooling = b; b.eduT = 0; st = cand; }
      }
      if (st && U.dst2(st.x, st.y, b.x + b.w / 2, b.y + b.h / 2) < 9) {
        b.eduT = (b.eduT || 0) + dt * ws;
        if (Math.random() < dt) this.fx('spark', st.x, st.y - .6, .3);
        if (b.eduT >= CONFIG.SCHOOL.time) {
          st.schooled = true; st.schooling = null;
          b.student = null; b.eduT = 0;
          this.float(st.x, st.y - .7, 'schooled! +12% work', '#b9a6e8');
          this.log(`${st.name} finished their letters — schooled hands work +12% forever.`, 'good');
        }
      }
      return;
    }
    // the scribe deciphers a ruin mid-restoration — the builders wait on the script
    if (v.workMode === 'decipher' && !b.built && b.phase === 'decipher') {
      if (Math.random() < dt * 2) this.fx('spark', b.x + .5, b.y - .2, .25);
      if (Wilds.decipherWork(b, dt * ws)) { v.workB = null; v.state = 'idle'; }
      return;
    }
    if (v.workMode === 'craft' && b.built) {
      const spec = CONFIG.CRAFT[b.def.craft];
      v.workT += dt * ws;
      if (v.workT >= spec.time) {
        v.workT = 0;
        // inputs on hand, shelf room for the output — else stand down
        let ok = G.res[b.def.craft] < Buildings.capOf(b.def.craft);
        for (const k in spec.in) if (G.res[k] < spec.in[k]) ok = false;
        if (!ok) { v.workB = null; v.state = 'idle'; if (v.carry.amt > 0) this.sendToStore(v); return; }
        for (const k in spec.in) G.res[k] -= spec.in[k];
        v.carry.type = b.def.craft;
        v.carry.amt += spec.out;
        this.fx('spark', v.x, v.y - .4, .2);
        if (v.carry.amt >= Entities.carryMax(v)) { v.workB = null; v.state = 'idle'; this.sendToStore(v); }
      }
      return;
    }
    if (v.workMode === 'fish' && b.built) {
      v.workT += dt * ws;
      if (v.workT >= CONFIG.FISHER.rate) {
        v.workT = 0;
        v.carry.type = 'food';
        v.carry.amt++;
        this.fx('spark', v.x, v.y - .4, .2);
        if (v.carry.amt >= Math.min(Entities.carryMax(v), CONFIG.FISHER.carry + 4)) {
          v.workB = null; v.state = 'idle';
          this.sendToStore(v);
        }
      }
      return;
    }
    if (v.workMode === 'mine' && b.built) {
      v.workT += dt * ws;
      if (v.workT >= CONFIG.MINE.rate) {
        v.workT = 0;
        v.carry.type = 'stone';
        v.carry.amt++;
        this.fx('spark', v.x, v.y - .4, .2);
        if (v.carry.amt >= Entities.carryMax(v)) {
          v.workB = null; v.state = 'idle';
          this.sendToStore(v);
        }
      }
      return;
    }
    if (v.workMode === 'build' && !b.built) {
      // wild growth staked under the footprint gets cleared before construction
      if (b.clearTiles && b.clearTiles.length) {
        v.workT += dt * ws;
        if (v.workT >= CONFIG.CLEAR.time) {
          v.workT = 0;
          const t = b.clearTiles.shift();
          this.grantClear(t.x, t.y, v);
        }
        return;
      }
      b.progress = Math.min(1, b.progress + dt * ws / b.def.time);
      b.hp = b.maxHp * (0.1 + 0.9 * b.progress);
      if (b.progress >= 1) {
        b.built = true; b.hp = b.maxHp;
        this.fx('ring', b.x + b.w / 2, b.y + b.h / 2, .5);
        if (b.key === 'beacon') this.beaconComplete(b);
        else this.log(`${b.def.name} completed.`, 'good');
        v.workB = null; v.state = 'idle';
      }
      return;
    }
    if (v.workMode === 'demolish' && b.built && b.demo) {
      b.progress -= dt * ws / b.def.time;
      b.hp = Math.max(1, b.maxHp * b.progress);
      if (b.progress <= 0) {
        this.log(`${b.def.name} torn down — half its cost reclaimed.`, '');
        Buildings.demolish(b);       // grants the 50% refund
        v.workB = null; v.state = 'idle';
      }
      return;
    }
    if (v.workMode === 'repair') {
      if (b.hp >= b.maxHp) { v.workB = null; v.state = 'idle'; return; }
      const hpBefore = b.hp;
      b.hp = Math.min(b.maxHp, b.hp + CONFIG.REPAIR.rate * dt * ws);
      b.repairDebt = (b.repairDebt || 0) + (b.hp - hpBefore);
      while (b.repairDebt >= CONFIG.REPAIR.cost) {
        b.repairDebt -= CONFIG.REPAIR.cost;
        const rc = b.def.cost.wood ? 'wood' : 'stone';
        if (G.res[rc] >= 1) G.res[rc] -= 1;
        else { v.workB = null; v.state = 'idle'; return; }
      }
      return;
    }
    if (v.workMode === 'harvest' && b.growth >= 1) {
      v.workT += dt * ws;
      if (v.workT >= 1.4) {
        b.growth = CONFIG.FARM.replant;
        b.tendedT = 99;
        v.carry.type = 'food';
        v.carry.amt += b.def.yield || CONFIG.FARM.yield;
        this.fx('spark', b.x + 1, b.y + 1, .3);
        v.workB = null; v.state = 'idle';
        this.sendToStore(v);
      }
      return;
    }
    if (v.workMode === 'tend') {
      b.tendedT = 0;
      v.workT += dt;
      if (v.workT > 7 || b.growth >= 1) { v.workB = null; v.state = 'idle'; }
      return;
    }
    v.state = 'idle';
  },

  repairable(b) {
    const rc = b.def.cost.wood ? 'wood' : 'stone';
    return G.res[rc] >= 1;
  },

  // remove the wild object at (x,y); hasty clearing salvages half the yield
  grantClear(x, y, v) {
    const o = World.objAt(x, y);
    const amt = World.amtAt(x, y) || 0;
    const gain = amt > 0 ? Math.ceil(amt / 2) : 0;
    if (o === OBJ.TREE || o === OBJ.PINE || o === OBJ.BIRCH || o === OBJ.DEADTREE) {
      this.gain('wood', gain); G.stats.gathered += gain;
      this.float(x + .5, y + .3, '+' + gain + ' wood', '#c9964b');
    } else if (o === OBJ.BUSH) {
      this.gain('food', gain); G.stats.gathered += gain;
      this.float(x + .5, y + .3, '+' + gain + ' food', '#7dc95e');
    } else if (o === OBJ.ROCK || o === OBJ.RUIN) {
      this.gain('stone', gain); G.stats.gathered += gain;
      this.float(x + .5, y + .3, '+' + gain + ' stone', '#a5a5ae');
    } else if (o === OBJ.CRYSTAL) {
      this.gain('stone', gain); G.stats.gathered += gain;
      G.res.essence = Math.min(CONFIG.ESSENCE.max, G.res.essence + CONFIG.CRYSTAL.essence);
      this.float(x + .5, y + .3, '+' + gain + ' stone, +' + CONFIG.CRYSTAL.essence + ' essence', '#b48ae0');
    }
    World.setObj(x, y, OBJ.NONE, 0);
    World.bakeTile(x, y);
    this.fx('spark', x + .5, y + .3, .25);
  },

  dropClearJob(x, y) {
    const i = G.clearJobs.findIndex(t => t.x === x && t.y === y);
    if (i >= 0) G.clearJobs.splice(i, 1);
  },

  // queue/cancel a clearing order (UI toggles this). Water fills cost stone up
  // front — refunded if the order is cancelled before the builder finishes.
  toggleClearJob(x, y) {
    const i = G.clearJobs.findIndex(t => t.x === x && t.y === y);
    if (i >= 0) {
      if (G.clearJobs[i].water) G.res.stone += CONFIG.CLEAR.waterCost;
      G.clearJobs.splice(i, 1);
      return 'off';
    }
    if (World.tileT(x, y) === T.WATER) {
      if (G.res.stone < CONFIG.CLEAR.waterCost) {
        UI.toast(`Filling water takes ${CONFIG.CLEAR.waterCost} stone a tile.`, 'bad');
        return 'no';
      }
      let shore = false;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
        if (World.inB(x + dx, y + dy) && World.tileT(x + dx, y + dy) !== T.WATER) { shore = true; break; }
      }
      if (!shore) {
        UI.toast('Fill at the shore — builders need footing to throw stone.', 'bad');
        return 'no';
      }
      G.res.stone -= CONFIG.CLEAR.waterCost;
      G.clearJobs.push({ x, y, water: true });
      return 'water';
    }
    G.clearJobs.push({ x, y });
    return 'on';
  },

  // flag a built building for teardown — builders un-build it, then half the cost is refunded
  orderDemolish(b) {
    if (!b || b.key === 'lair' || b.key === 'camp' || !b.built) return false;
    b.demo = !b.demo;
    if (!b.demo) {
      b.hp = b.maxHp; b.progress = Math.max(b.progress, 1);
      for (const v of G.villagers) if (v.workB === b && v.workMode === 'demolish') { v.workB = null; v.state = 'idle'; v.path = null; }
    }
    return true;
  },

  sendToBuilding(v, b, mode) {
    const tx = (b.x + b.w / 2) | 0, ty = (b.y + b.h / 2) | 0;
    const p = Path.find(v.x | 0, v.y | 0, tx, ty, { adjacent: true });
    if (!p) return false;
    v.path = p; v.pi = 0;
    v.state = 'toWork';
    v.workB = b; v.workMode = mode; v.workKind = null; v.tgtTile = null;
    if (mode === 'harvest' || mode === 'tend' || mode === 'build' || mode === 'repair' || mode === 'craft' || mode === 'teach' || mode === 'decipher') v.workT = 0;
    return true;
  },

  sendToStore(v) {
    const s = Buildings.nearestStore(v.x | 0, v.y | 0);
    if (!s) return;
    const p = Path.find(v.x | 0, v.y | 0, (s.x + s.w / 2) | 0, (s.y + s.h / 2) | 0, { adjacent: true });
    if (!p) return;
    v.path = p; v.pi = 0;
    v.state = 'toStore';
    v.tgtTile = null; v.workB = null;
  },

  // a thirsty villager without a bottle walks to the nearest well
  sendToDrink(v) {
    let best = null, bd = 1e9;
    for (const b of G.buildings) {
      if (!b.built || b.key !== 'well') continue;
      const d = U.dst2(v.x, v.y, b.x + .5, b.y + .5);
      if (d < bd) { bd = d; best = b; }
    }
    if (!best) return false;
    const p = Path.find(v.x | 0, v.y | 0, best.x, best.y, { adjacent: true });
    if (!p) return false;
    v.path = p; v.pi = 0;
    v.state = 'drink';
    v.tgtTile = null; v.workB = null;
    return true;
  },

  /* ---------------- monsters ---------------- */
  updateMonster(m, dt) {
    if (m.frozenT > 0) { m.frozenT -= dt; return; }   // held by Stasis
    if (m.burning > 0) {
      m.burning -= dt;
      m.hp -= 26 * dt;
      if (Math.random() < dt * 6) this.fx('flame', m.x + (Math.random() - .5) * .6, m.y - Math.random() * .5, .4);
      if (m.hp <= 0) { this.monsterDeath(m, 'dawn'); return; }
      return;
    }
    if (m.slowT > 0) m.slowT -= dt;
    if (m.trapCd > 0) m.trapCd -= dt;
    if (m.atkCd > 0) m.atkCd -= dt;
    m.aiT -= dt;
    if (m.aiT <= 0) { m.aiT = 0.45 + Math.random() * 0.2; this.mThink(m); }

    // spike traps wound & slow whatever walks over them (wraiths drift above)
    if (m.trapCd <= 0 && !m.st.phase) {
      const tb = World.bldAt(m.x | 0, m.y | 0);
      if (tb && tb.built && tb.def.kind === 'trap') {
        m.trapCd = 0.8;
        this.hitMonster(m, CONFIG.TRAP.dmg);
        m.slowT = Math.max(m.slowT, CONFIG.TRAP.slow);
        tb.hp -= CONFIG.TRAP.hpCost;
        this.fx('spark', m.x, m.y - .3, .25);
        if (tb.hp <= 0) {
          this.fx('smoke', tb.x + .5, tb.y + .5, .6);
          Buildings.demolish(tb, true);
        }
      }
    }

    // bonecasters snipe from stand-off range
    if (m.type === 'boner') {
      const rng = m.st.range;
      if (m.tgtE && m.tgtE.hp > 0 && U.dst(m.x, m.y, m.tgtE.x, m.tgtE.y) < rng) {
        m.path = null;
        if (m.atkCd <= 0) {
          m.atkCd = m.atkT;
          this.fx('bone', m.x, m.y - .5, .35, { tx: m.tgtE.x, ty: m.tgtE.y });
          this.hitVillager(m.tgtE, m.dmg);
        }
        return;
      }
      if (m.tgtB && G.buildings.includes(m.tgtB)) {
        if (U.dst(m.x, m.y, m.tgtB.x + m.tgtB.w / 2, m.tgtB.y + m.tgtB.h / 2) < rng) {
          m.path = null;
          if (m.atkCd <= 0) {
            m.atkCd = m.atkT;
            this.fx('bone', m.x, m.y - .5, .35, { tx: m.tgtB.x + m.tgtB.w / 2, ty: m.tgtB.y + m.tgtB.h / 2 });
            this.hitBuilding(m.tgtB, m.dmg * m.bld);
          }
          return;
        }
      }
    }

    if (m.path && m.pi < m.path.length) {
      // check if next waypoint is inside a solid building → attack it
      const wp = m.path[m.pi];
      const bt = World.bldAt(wp.x | 0, wp.y | 0);
      if (bt && bt.built && bt.def.kind !== 'gate' && bt.def.kind !== 'trap' && !m.st.phase) {
        const d = U.dst(m.x, m.y, wp.x, wp.y);
        if (d < 1.25) {
          if (m.atkCd <= 0) {
            m.atkCd = m.atkT;
            this.hitBuilding(bt, m.dmg * m.bld);
          }
          return;
        }
      }
      this.moveAlong(m, dt, m.spd * (m.slowT > 0 ? 0.5 : 1) * (G.bloodMoon ? 1.1 : 1));
      m.anim += dt * 8;
    } else {
      // direct attack checks when pathless/adjacent
      if (m.tgtE && m.tgtE.hp > 0) {
        const d = U.dst(m.x, m.y, m.tgtE.x, m.tgtE.y);
        if (d < 1.0 && m.atkCd <= 0) {
          m.atkCd = m.atkT;
          this.hitVillager(m.tgtE, m.dmg);
        }
      }
    }
  },

  mThink(m) {
    // validate current targets
    if (m.tgtE && (m.tgtE.hp <= 0 || !G.villagers.includes(m.tgtE))) m.tgtE = null;
    if (m.tgtB && !G.buildings.includes(m.tgtB)) m.tgtB = null;

    // pick target: stalkers & wraiths prefer villagers; others nearest villager then building
    if (!m.tgtE && !m.tgtB) {
      let bestV = null, bd = 1e9;
      for (const v of G.villagers) {
        if (v.below) continue; // miners in the Deep Seam are beyond the dark's reach
        const d = U.dst2(m.x, m.y, v.x, v.y);
        if (d < bd) { bd = d; bestV = v; }
      }
      const preferV = m.type === 'stalker' || m.type === 'wraith' || bd < 20 * 20;
      if (bestV && preferV) m.tgtE = bestV;
      else {
        let bestB = null, bdd = 1e9;
        for (const b of G.buildings) {
          if (b.key === 'lair') continue; // never sack their own home
          const d = U.dst2(m.x, m.y, b.x + b.w / 2, b.y + b.h / 2);
          const w = b.key === 'camp' ? d * .6 : d; // drawn to the heart of the village
          if (w < bdd) { bdd = w; bestB = b; }
        }
        if (bestB) m.tgtB = bestB;
      }
    }

    // attack adjacent villager directly
    if (m.tgtE) {
      const d = U.dst(m.x, m.y, m.tgtE.x, m.tgtE.y);
      if (d < 1.0) {
        m.path = null;
        if (m.atkCd <= 0) { m.atkCd = m.atkT; this.hitVillager(m.tgtE, m.dmg); }
        return;
      }
    }

    // (re)path — wraiths drift straight through walls
    const goalE = m.tgtE;
    const goalB = m.tgtB;
    const gx = goalE ? goalE.x : goalB ? goalB.x + goalB.w / 2 : World.center.x;
    const gy = goalE ? goalE.y : goalB ? goalB.y + goalB.h / 2 : World.center.y;
    const needPath = !m.path || m.pi >= m.path.length || (m.pathT = (m.pathT || 0) + .5) > 2.5;
    if (needPath) {
      m.pathT = 0;
      const p = Path.find(m.x | 0, m.y | 0, gx | 0, gy | 0, { adjacent: true, monster: true, phase: !!m.st.phase });
      if (p) { m.path = p; m.pi = 0; }
      else {
        // fully sealed & unpathable — batter nearest structure
        let best = null, bd = 1e9;
        for (const b of G.buildings) {
          if (b.key === 'lair') continue;
          const d = U.dst2(m.x, m.y, b.x + b.w / 2, b.y + b.h / 2);
          if (d < bd) { bd = d; best = b; }
        }
        m.tgtB = best; m.tgtE = null;
        const p2 = best ? Path.find(m.x | 0, m.y | 0, (best.x + best.w / 2) | 0, (best.y + best.h / 2) | 0, { adjacent: true, monster: true, phase: !!m.st.phase }) : null;
        if (p2) { m.path = p2; m.pi = 0; }
      }
    }
  },

  /* ---------------- combat ---------------- */
  hitVillager(v, dmg) {
    v.hp -= dmg;
    v.fearT = Math.max(v.fearT, 4);
    if (v.job !== 'guard') { v.state = 'flee'; v.path = null; }
    this.fx('spark', v.x, v.y - .3, .25);
    if (v.hp <= 0) this.villagerDeath(v, 'the horde');
  },

  hitMonster(m, dmg, src) {
    if (m.ampT > 0) dmg *= CONFIG.SIGIL.wardAmp; // crossing a bloomed ward stings
    m.hp -= dmg;
    m.flash = .12;
    if (m.hp <= 0) this.monsterDeath(m, 'slain');
  },

  monsterDeath(m, how) {
    if (m.dead) return;
    m.dead = true;
    // perKill is the floor a kill can pay — pay the fight (v1.5 audit)
    const base = Math.max(m.ess, CONFIG.ESSENCE.perKill) * (G.diffM.essMul || 1) * (how === 'dawn' ? 0.5 : 1); // B6
    const ess = Math.ceil(base * (G.bloodMoon ? 2 : 1));
    G.res.essence = Math.min(CONFIG.ESSENCE.max, G.res.essence + ess);
    G.stats.kills++;
    this.float(m.x, m.y - .5, '+' + ess + ' essence', '#b48ae0');
    for (let i = 0; i < 4; i++) this.fx('spark', m.x + (Math.random() - .5) * .8, m.y - Math.random() * .6, .35);
    if (G.sel && G.sel.ref === m) { G.sel = null; UI.selHide(); }
    if (G.boss === m) {
      G.boss = null; UI.bossBar(null);
      UI.toast('The Night Lord crumbles to ash!', 'good');
      this.log('The Night Lord is destroyed by the defenders of Dawnhold!', 'good');
      G.shake = Math.max(G.shake, 8);
    }
  },

  villagerDeath(v, cause) {
    const i = G.villagers.indexOf(v);
    if (i < 0) return;
    G.villagers.splice(i, 1);
    G.stats.deaths++;
    this.fx('corpse', v.x, v.y, 2.2, { look: v.look });
    this.log(`${v.name}${v.trait ? ' the ' + v.trait.name : ''} (${v.job}) was lost to ${cause}.`, 'bad');
    UI.toast(`${v.name} has died — ${cause}.`, 'bad');
    // leave a small grave so the dead are remembered — but never at a
    // monolith: failed raids would pave their own melee ring with headstones
    // (graves are solid) and wall the lair off from the next raid
    const gx = v.x | 0, gy = v.y | 0;
    const o = World.objAt(gx, gy);
    const atLair = G.buildings.some(bb => bb.key === 'lair' && Math.max(Math.abs(gx - bb.x), Math.abs(gy - bb.y)) <= 2);
    if (!atLair && (o === OBJ.NONE || o === OBJ.FLOWER || o === OBJ.TGRASS || o === OBJ.MUSH) && !World.bldAt(gx, gy)
      && World.tileT(gx, gy) !== T.WATER && World.inB(gx, gy)) {
      World.setObj(gx, gy, OBJ.GRAVE, 0);
    }
    if (G.follow === v) G.follow = null;
    if (G.sel && G.sel.ref === v) { G.sel = null; UI.selHide(); }
    Wilds.clearVillager(v); // untangle betrothal, banns, hunt duty
    this.reassign();
  },

  hitBuilding(b, dmg) {
    if (!b || !G.buildings.includes(b)) return;
    b.hp -= dmg;
    if (b.key === 'lair') b.hitT = CONFIG.LAIR.regenDelay; // wounded monoliths mend (and defend)
    this.fx('spark', b.x + b.w / 2 + (Math.random() - .5), b.y + b.h / 2 - Math.random(), .2);
    if (b.hp <= 0) {
      if (b.key === 'lair') { this.lairDestroyed(b); return; }
      const wasStore = b.def.kind === 'store';
      const wasBeacon = b.key === 'beacon';
      this.fx('smoke', b.x + b.w / 2, b.y + b.h / 2, 1.0);
      G.shake = Math.max(G.shake, 3);
      Buildings.demolish(b, true);
      if (wasBeacon) {
        G.beaconLit = false;
        UI.toast('THE BEACON HAS FALLEN! Rebuild it and try again.', 'bad');
        this.log('The Great Beacon was smashed by the horde.', 'bad');
      } else {
        this.log(`${b.def.name} was destroyed.`, 'bad');
      }
    }
  },

  // a kindled brazier has burned a monolith down to clean stone — no raid,
  // no graves: the lair cracks into salvageable dawn-stone (The Kindling)
  lairCleansed(b) {
    const idx = G.buildings.indexOf(b);
    if (idx < 0) return;
    G.buildings.splice(idx, 1);
    Buildings.byIdMap.delete(b.id);
    World.occ[World.idx(b.x, b.y)] = 0;
    if (G.raidTarget === b) G.raidTarget = null;
    if (G.sel && G.sel.ref === b) { G.sel = null; UI.selHide(); }
    this.gain('stone', CONFIG.BRAZIER.dawnStone);
    G.res.essence = Math.min(CONFIG.ESSENCE.max, G.res.essence + CONFIG.BRAZIER.dawnEss);
    this.fx('smoke', b.x + .5, b.y + .5, 1.2);
    for (let k = 0; k < 6; k++) this.fx('spark', b.x + (Math.random() - .5), b.y - Math.random() * .8, .5);
    G.shake = Math.max(G.shake, 5);
    UI.toast(`The monolith cracks into clean dawn-stone! +${CONFIG.BRAZIER.dawnStone} stone, +${CONFIG.BRAZIER.dawnEss} essence`, 'good');
    this.log('The light burned a Dark Monolith clean away. Dawn-stone for the taking.', 'good');
    if (!Buildings.lairs().length) {
      UI.toast('The last monolith has fallen — the nights grow thin!', 'good');
      this.log('No lairs remain. The dark must now crawl in from the wilds.', 'good');
    }
  },

  // The Kindling: pay wood + essence and a brazier burns through the night.
  // A strong kindle (lit fast at the striker) carries a night and a half.
  kindle(b, strong) {
    if (!b || !b.built || b.key !== 'brazier' || b.lit) return false;
    if (G.res.wood < CONFIG.BRAZIER.kindleWood || G.res.essence < CONFIG.BRAZIER.kindleEss) return false;
    G.res.wood -= CONFIG.BRAZIER.kindleWood;
    G.res.essence -= CONFIG.BRAZIER.kindleEss;
    b.lit = true;
    b.fuel = CONFIG.NIGHT_LEN * (G.diffM.night || 1) * (strong ? 1.5 : 1);
    this.fx('ring', b.x + .5, b.y + .5, .5, { col: '#ffb057' });
    UI.toast(strong ? 'The brazier ROARS — a strong kindle burns a night and a half!' : 'The brazier catches — it will burn till dawn.', 'good');
    this.log('A brazier was kindled against the coming dark.', 'good');
    return true;
  },

  // ring the muster-yard horn: off-duty guards run to the yard
  rally(b) {
    let n = 0;
    for (const v of G.villagers) {
      if (v.job !== 'guard' || v.below) continue;
      if (U.dst2(v.x, v.y, b.x + 1, b.y + 1) < 25) continue;
      const p = Path.find(v.x | 0, v.y | 0, b.x + 1, b.y + 1, { adjacent: true });
      if (p) { v.path = p; v.pi = 0; v.tgt = null; n++; }
    }
    if (n) {
      this.fx('ring', b.x + 1, b.y + 1, .8, { col: '#e8a94b' });
      UI.toast('The horn rings — the guards muster at the yard!', '');
    }
    return n;
  },


  lairDestroyed(b) {
    const idx = G.buildings.indexOf(b);
    if (idx >= 0) G.buildings.splice(idx, 1);
    Buildings.byIdMap.delete(b.id);
    World.occ[World.idx(b.x, b.y)] = 0;
    if (G.raidTarget === b) G.raidTarget = null;
    if (G.sel && G.sel.ref === b) { G.sel = null; UI.selHide(); }
    G.res.essence = Math.min(CONFIG.ESSENCE.max, G.res.essence + CONFIG.LAIR.ess);
    this.fx('smoke', b.x + .5, b.y + .5, 1.2);
    for (let k = 0; k < 6; k++) this.fx('spark', b.x + (Math.random() - .5), b.y - Math.random() * .8, .5);
    G.shake = Math.max(G.shake, 5);
    UI.toast(`A Dark Monolith shatters! +${CONFIG.LAIR.ess} essence`, 'good');
    this.log('The guards tore down a Dark Monolith. Its night-spawn is ended.', 'good');
    if (!Buildings.lairs().length) {
      UI.toast('The last monolith has fallen — the nights grow thin!', 'good');
      this.log('No lairs remain. The dark must now crawl in from the wilds.', 'good');
    }
  },

  guardDmg(mType, v) {
    let d = CONFIG.GUARD.dmg;
    if (G.buildings.some(b => b.built && b.key === 'barracks')) d *= CONFIG.BARRACKS.dmgMult;
    if (mType && G.drill && G.drill[mType]) d *= 1 + G.drill[mType]; // muster-yard drills
    if (v && Wilds.nearSigil(v.x, v.y, 'hallow', true)) d *= CONFIG.SIGIL.hallowGuard; // steadied by a hallow
    if (G.res.arrows <= 0) d *= CONFIG.AMMO.dryMult; // no resupply for the quivers
    return d;
  },

  // add to a store, respecting caps (overflow never materializes)
  gain(type, amt) {
    const cap = Buildings.capOf(type);
    if (cap == null) { G.res[type] += amt; return; }
    const before = G.res[type];
    G.res[type] = Math.min(cap, G.res[type] + amt);
    if (G.res[type] >= cap && before < cap && !G._capNote && (type === 'wood' || type === 'stone' || type === 'food')) {
      G._capNote = true; // one gentle nudge a day; cleared at dawn
      UI.toast(`The ${type} store is full — build a ${type === 'food' ? 'Granary' : 'Storehouse'} to hoard more.`, '');
    }
  },

  // village-wide housing contentment: beds × their comfort vs population.
  // C4: the snug/crowded multipliers themselves are a difficulty lever
  contentment() {
    let pts = 0;
    for (const b of G.buildings) if (b.built && b.def.housing) pts += (b.def.comfort || 1) * b.def.housing;
    const r = pts / Math.max(1, G.villagers.length);
    const C = Object.assign({}, CONFIG.COMFORT, (G.diffM && G.diffM.comfort) || {});
    if (r >= C.snugAt) return { mult: C.snug, label: 'Snug' };
    if (r >= C.crowdAt) return { mult: C.crowd, label: 'Content' };
    if (r >= C.packedAt) return { mult: C.packed, label: 'Crowded' };
    return { mult: C.packed - 0.03, label: 'Miserable' };
  },

  shootTower(b, m) {
    const st = b.def.atk;
    this.fx('arrow', b.x + .5, b.y - .6, .16, { tx: m.x, ty: m.y });
    this.hitMonster(m, st.dmg);
  },

  beaconComplete(b) {
    G.finalNight = true;
    G.beaconLit = true;
    b.lit = true;
    UI.toast('THE BEACON IS LIT! Survive the Long Night to win.', 'magic');
    this.log('The Great Beacon is lit. Its flame calls to the dark — everything comes, tonight.', 'magic');
    G.shake = Math.max(G.shake, 6);
    UI.refreshAll();
  },

  /* ---------------- helpers ---------------- */
  // villagers drift straight through one another — walls are their only hard
  // obstacle, so no sidesteps, no waiting on neighbours (settled spacing is
  // handled gently in separate())
  moveAlong(e, dt, spd) {
    if (!e.path || e.pi >= e.path.length) return;
    // fresh path object → reset stuck bookkeeping (paths get reassigned all over the brain)
    if (e._lastPath !== e.path) { e._lastPath = e.path; e.stuckT = 0; e.lastD = 1e9; }
    let step = spd * dt;
    while (step > 0 && e.pi < e.path.length) {
      const wp = e.path[e.pi];
      // villagers never enter a solid tile — walls may have risen since this path was made
      if (e.kind === 'v' && !Path.pass(wp.x | 0, wp.y | 0, false)) { e.path = null; e.pi = 0; return; }
      const d = U.dst(e.x, e.y, wp.x, wp.y);
      if (d <= step || d < 0.03) {
        e.x = wp.x; e.y = wp.y; e.pi++; step -= d;
      } else {
        const ux = (wp.x - e.x) / d, uy = (wp.y - e.y) / d;
        const nx = e.x + ux * step, ny = e.y + uy * step;
        // a villager already inside a solid tile (wall built on them) may walk out
        const escaping = e.kind === 'v' && !Path.pass(e.x | 0, e.y | 0, false);
        if (!escaping && e.kind === 'v' && !Path.pass(nx | 0, ny | 0, false)) { e.path = null; e.pi = 0; return; }
        e.x = nx; e.y = ny;
        e.facing = wp.x >= e.x ? 1 : -1;
        step = 0;
      }
    }
    // stuck watch — no progress toward the waypoint means rethink the route
    const d2 = e.path && e.pi < e.path.length ? U.dst2(e.x, e.y, e.path[e.pi].x, e.path[e.pi].y) : 0;
    if (e.path && e.pi < e.path.length) {
      if (d2 > e.lastD - 0.0004) {
        e.stuckT += dt;
        if (e.stuckT > 1.4) { e.stuckT = 0; e.path = null; e.pi = 0; } // force rethink
      } else e.stuckT = 0;
    }
    e.lastD = d2;
  },

  // wall-safe nudge: villagers slide along solids instead of being shoved inside them
  nudge(e, dx, dy) {
    if (e.kind !== 'v') { e.x += dx; e.y += dy; return; }
    const out = !Path.pass(e.x | 0, e.y | 0, false); // already stuck inside → any exit allowed
    const nx = e.x + dx;
    if (out || Path.pass(nx | 0, e.y | 0, false)) e.x = nx;
    const ny = e.y + dy;
    if (out || Path.pass(e.x | 0, ny | 0, false)) e.y = ny;
  },

  separate(dt) {
    const all = G.villagers;
    const mons = G.monsters;
    // walkers pass through each other; only villagers that have both settled
    // ease apart, and gently (dt-scaled) so idle crowds fan out without shoving
    for (let i = 0; i < all.length; i++) {
      const a = all[i];
      if (a.below || (a.path && a.pi < a.path.length)) continue;
      for (let j = i + 1; j < all.length; j++) {
        const b = all[j];
        if (b.below || (b.path && b.pi < b.path.length)) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) > .5 || Math.abs(dy) > .5) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 < .16 && d2 > 0.0001) {
          const d = Math.sqrt(d2), push = (0.4 - d) * Math.min(1, dt * 6);
          const ux = dx / d, uy = dy / d;
          this.nudge(a, -ux * push, -uy * push);
          this.nudge(b, ux * push, uy * push);
        }
      }
    }
    // keep monsters from perfectly stacking
    for (let i = 0; i < mons.length; i++) {
      const a = mons[i];
      for (let j = i + 1; j < mons.length; j++) {
        const b = mons[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) > .6 || Math.abs(dy) > .6) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 < .2 && d2 > 0.0001) {
          const d = Math.sqrt(d2), push = (0.45 - d) * .5;
          const ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
        }
      }
    }
  },

  fx(type, x, y, dur, extra) {
    if (!G.settings.fx && (type === 'spark' || type === 'flame')) return;
    G.effects.push(Object.assign({ type, x, y, t: 0, dur }, extra || {}));
  },

  float(x, y, text, col) {
    G.floaters.push({ x, y, text, col: col || '#fff', t: 0 });
  },

  updateEffects(dt) {
    for (let i = G.effects.length - 1; i >= 0; i--) {
      const e = G.effects[i];
      e.t += dt;
      if (e.type === 'meteor' && !e.impactDone && e.t >= e.dur * 0.55) {
        e.impactDone = true;
        G.shake = Math.max(G.shake, 7);
        Powers.meteorBoom(e.x, e.y);
      }
      if (e.t >= e.dur) G.effects.splice(i, 1);
    }
    for (let i = G.floaters.length - 1; i >= 0; i--) {
      const f = G.floaters[i];
      f.t += dt;
      if (f.t > 1.3) G.floaters.splice(i, 1);
    }
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 12);
  },

  log(txt, k) {
    G.chronicle.push({ d: G.day, txt, k: k || '' });
    if (G.chronicle.length > 120) G.chronicle.shift();
  },

  reassign() {
    // distribute villagers to match G.jobs counts, keeping current assignees first
    const order = JOBS.filter(j => j !== 'idle');
    for (const job of order) {
      let have = G.villagers.filter(v => v.job === job);
      // workplace-gated duties (Medic, Fletcher, Smith, Cook, Brewer) need their building
      let want = G.jobs[job] || 0;
      if (JOB_NEEDS[job] && !Buildings.built(JOB_NEEDS[job])) want = 0;
      if (have.length > want) {
        for (let i = have.length - 1; i >= want; i--) this.setJob(have[i], 'idle');
      } else if (have.length < want) {
        const pool = G.villagers.filter(v => v.job === 'idle');
        for (let i = 0; i < want - have.length && i < pool.length; i++) this.setJob(pool[i], job);
      }
    }
  },

  setJob(v, job) {
    if (v.job === job) return;
    v.job = job;
    v.look.cloth = JOB_INFO[job].cloth;
    v.look.guard = job === 'guard';
    v.state = 'idle'; v.path = null; v.tgt = null; v.tgtTile = null; v.workB = null; v.workKind = null;
    if (v.carry.amt > 0) { /* keep carry, will store on next think */ }
  },

  speedSet(n) {
    G.speed = n; G.paused = n === 0;
    UI.syncSpeedBtns();
  },
};

// ---- debug/test hooks (also handy for tinkering) ----
window.DBG = {
  lairs() {
    const s = Buildings.lairs().map(l => `${l.x},${l.y}`).join(' | ') || 'none';
    UI.toast('LAIRS: ' + s, 'magic');
    return s;
  },  res(k, n) { G.res[k] += n; UI.updateHUD(); },
  dusk() { if (G.phase === 'day') { G.time = (G.diffM.dayLen || CONFIG.DAY_LEN) - 0.01; } },
  night() { DBG.dusk(); },
  day(n) { G.day = n; },
  wave(n) {
    const cnt = n || 8;
    for (let i = 0; i < cnt; i++) { const p = World.edgePoint(); G.monsters.push(Entities.makeMonster(DBG.rollP(), p.x, p.y)); }
  },
  rollP() { return U.choice(['shade', 'shade', 'runner', 'brute', 'stalker']); },
  vill(n) { for (let i = 0; i < (n || 3); i++) G.villagers.push(Entities.makeVillager(World.W / 2 + U.irnd(-3, 3), World.H / 2 + U.irnd(-3, 3), 'idle')); Sim.reassign(); },
  build(key, tx, ty) { return Buildings.place(key, tx, ty); },
  save() { SaveSys.save('auto'); },
};
