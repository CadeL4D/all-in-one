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
    G.res = { wood: C.START.wood, stone: C.START.stone, food: C.START.food, essence: C.START.essence };
    G.villagers = []; G.monsters = []; G.buildings = [];
    G.effects = []; G.floaters = [];
    G.jobs = { idle: 0, forager: 2, lumber: 2, miner: 1, farmer: 0, builder: 1, guard: 0 };
    G.regrow = new Map();
    G.stats = { kills: 0, deaths: 0, built: 0, gathered: 0, wavePeak: 0, peakPop: C.VIL_START };
    G.chronicle = [];
    G.wave = null; G.finalNight = false; G.beaconLit = false; G.boss = null;
    G.tut = 0; G.tutOn = true;
    G.shake = 0; G.sel = null; G.follow = null;

    Buildings.byIdMap.clear();
    World.gen(G.seed);

    const cx = World.W / 2 | 0, cy = World.H / 2 | 0;
    // starting camp slightly left of center, tents around it
    Buildings.create('camp', cx - 1, cy - 1, true);
    // monster lairs from the generator
    for (const spot of World.lairSpots) Buildings.create('lair', spot.x, spot.y, true);
    G.bloodMoon = false;
    G.raidTarget = null;
    const starters = ['forager', 'forager', 'lumber', 'lumber', 'miner', 'builder'];
    for (let i = 0; i < C.VIL_START; i++) {
      const a = (i / C.VIL_START) * Math.PI * 2;
      const v = Entities.makeVillager(cx + Math.cos(a) * 2.5 + .5, cy + Math.sin(a) * 2.5 + .5, starters[i]);
      G.villagers.push(v);
    }
    G.cam.x = (cx + .5) * C.TILE; G.cam.y = (cy + .5) * C.TILE; G.cam.z = C.ZOOM.start;

    // grant day-0 unlocks
    G.unlocks = {};
    for (const k in BUILD) if (BUILD[k].unlock <= 0) G.unlocks[k] = true;

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
    if (G.phase === 'day') plen = C.DAY_LEN;
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

    // ----- essence -----
    let regen = (isDayLike() ? C.ESSENCE.regenDay : C.ESSENCE.regenNight) * G.diffM.regen;
    for (const b of G.buildings) if (b.built && b.def.essence) regen += 0.06;
    G.res.essence = Math.min(C.ESSENCE.max, G.res.essence + regen * dt);

    // ----- entities -----
    Buildings.update(dt);
    for (let i = G.villagers.length - 1; i >= 0; i--) {
      const v = G.villagers[i];
      this.updateVillager(v, dt);
      if (v.hp <= 0) this.villagerDeath(v, v.starving ? 'starvation' : 'the horde');
    }
    for (let i = G.monsters.length - 1; i >= 0; i--) {
      const m = G.monsters[i];
      this.updateMonster(m, dt);
      if (m.dead || m.hp <= 0) { G.monsters.splice(i, 1); if (G.boss === m) { G.boss = null; UI.bossBar(null); } }
    }
    this.separate();

    // ----- regrowth -----
    if (G.regrow.size) {
      for (const [i, rg] of G.regrow) {
        rg.t -= dt;
        if (rg.t <= 0) {
          const x = i % World.W, y = (i / World.W) | 0;
          if (rg.kind === OBJ.BUSH) {
            World.amt[i] = OBJ_AMT[OBJ.BUSH];
          } else if (rg.kind === OBJ.HERB) {
            World.amt[i] = OBJ_AMT[OBJ.HERB];
          } else if (rg.kind === OBJ.TREE || rg.kind === OBJ.PINE) {
            if (World.obj[i] === OBJ.STUMP) {
              World.obj[i] = OBJ.SAPLING;
              rg.t = 55 + Math.random() * 30;
              continue;
            } else if (World.obj[i] === OBJ.SAPLING) {
              World.obj[i] = rg.kind;
              World.amt[i] = OBJ_AMT[rg.kind];
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

  /* ---------------- phases ---------------- */
  dusk() {
    G.phase = 'dusk';
    G.bloodMoon = G.day >= CONFIG.WAVE.bloodEvery && G.day % CONFIG.WAVE.bloodEvery === 0 && this.waveSize(G.day) > 0;
    const n = this.waveSize(G.day) * (G.bloodMoon ? CONFIG.WAVE.bloodMult : 1);
    if (n > 0) {
      // direction telegraph from the nearest living lair (readable tactics)
      const lairs = Buildings.lairs();
      if (lairs.length) {
        let nearest = null, bd = 1e9;
        for (const l of lairs) {
          const d = U.dst2(World.center.x, World.center.y, l.x, l.y);
          if (d < bd) { bd = d; nearest = l; }
        }
        const ang = Math.atan2(nearest.y - World.center.y, nearest.x - World.center.x);
        const dirs = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
        const dir = dirs[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
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
    if (G.tut === 3) UI.tutAdvance(4);
  },

  night() {
    G.phase = 'night';
    const base = this.waveSize(G.day);
    if (base > 0) {
      const isFinal = G.finalNight;
      const lairs = Buildings.lairs();
      const noLairMult = lairs.length ? 1 : CONFIG.WAVE.noLairMult;
      const total = Math.max(1, Math.round((base * (G.bloodMoon ? CONFIG.WAVE.bloodMult : 1) * noLairMult) * (isFinal ? CONFIG.WAVE.final : 1)));
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
    G.stats.peakPop = Math.max(G.stats.peakPop, G.villagers.length);

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
    // a little daytime texture: variety beats repetition (audit: Final Outpost)
    if (G.day >= 2 && Math.random() < 0.30) this.dayEvent();
  },

  dayEvent() {
    const roll = Math.random();
    if (roll < 0.38) {
      let n = 0;
      for (let i = 0; i < World.obj.length; i++) {
        if (World.obj[i] === OBJ.BUSH && World.amt[i] < OBJ_AMT[OBJ.BUSH]) { World.amt[i] = OBJ_AMT[OBJ.BUSH]; n++; }
      }
      if (n > 0) {
        UI.toast('Overnight rain — every bush hangs heavy with berries!', 'good');
        this.log('A good rain. The thickets hang heavy with berries.', 'good');
      }
    } else if (roll < 0.68 && G.day >= 3) {
      const w = 10 + G.day * 2;
      G.res.wood += w;
      UI.toast(`Foragers drag home a storm-felled oak: +${w} wood.`, 'good');
      this.log('A storm-felled oak yielded seasoned timber.', 'good');
    } else if (roll < 0.86 && G.day >= 5 && G.monsters.length === 0) {
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
    return Math.min(CONFIG.WAVE.cap, Math.round((CONFIG.WAVE.base + CONFIG.WAVE.per * day) * G.diffM.wave));
  },

  rollType(day) {
    const M = CONFIG.MONS;
    let pool = [{ t: 'shade', w: 1 }];
    if (day >= M.runner.from) pool.push({ t: 'runner', w: M.runner.w });
    if (day >= M.brute.from) pool.push({ t: 'brute', w: M.brute.w });
    if (day >= M.stalker.from) pool.push({ t: 'stalker', w: M.stalker.w });
    if (day >= M.boner.from) pool.push({ t: 'boner', w: M.boner.w });
    if (day >= M.wraith.from) pool.push({ t: 'wraith', w: M.wraith.w });
    if (day >= M.colossus.from) pool.push({ t: 'colossus', w: M.colossus.w });
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
        // crawl out of a living lair (with a little jitter)
        const l = U.choice(lairs);
        px = l.x + .5 + (Math.random() - .5) * 1.6;
        py = l.y + .5 + (Math.random() - .5) * 1.6;
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

  arrivals() {
    const C = CONFIG.ARRIVE;
    const cap = Buildings.housingCap();
    const pop = G.villagers.length;
    if (pop >= C.maxPop) return;
    let arrived = [];
    if (G.res.food >= C.foodNeed && pop < cap && Math.random() < C.chance) {
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
    const C = CONFIG;
    // hunger always ticks
    v.hunger = Math.min(100, v.hunger + C.HUNGER.rate * dt);
    if (v.hunger > C.HUNGER.mealAt && G.res.food >= C.HUNGER.mealCost) {
      G.res.food -= C.HUNGER.mealCost;
      v.hunger = Math.max(0, v.hunger - C.HUNGER.mealRestore);
      this.float(v.x, v.y - .6, 'meal', '#e8a94b');
    }
    v.starving = v.hunger >= 99.5;
    if (v.starving) {
      v.hp -= C.HUNGER.starveDps * dt;
      if (!v.starveWarned) { v.starveWarned = true; UI.toast(`${v.name} is starving!`, 'bad'); this.log(`${v.name} starves — the store is empty.`, 'bad'); }
    } else if (v.hunger < 80) v.starveWarned = false;

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

    // fear overrides work (non-guards)
    if (v.job !== 'guard' && v.fearT <= 0) {
      for (const m of G.monsters) {
        if (!m.dead && U.dst2(v.x, v.y, m.x, m.y) < 12) {
          v.fearT = 4.5; v.state = 'flee'; v.path = null;
          break;
        }
      }
    }

    switch (v.state) {
      case 'flee': {
        if (v.fearT <= 0) { v.state = isNightLike() && v.job !== 'guard' ? 'shelter' : 'idle'; v.path = null; return; }
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
        if (!isNightLike()) { v.state = 'idle'; v.path = null; return; }
        if (!v.path || v.pi >= v.path.length) {
          const s = Buildings.nearestStore(v.x | 0, v.y | 0);
          if (s && U.dst(v.x, v.y, s.x + s.w / 2, s.y + s.h / 2) > 2.2) {
            v.path = Path.find(v.x | 0, v.y | 0, (s.x + s.w / 2) | 0, (s.y + s.h / 2) | 0, { adjacent: true });
            v.pi = 0;
          }
        }
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
          G.res[v.carry.type] += v.carry.amt;
          G.stats.gathered += v.carry.amt;
          this.float(v.x, v.y - .7, '+' + v.carry.amt + ' ' + v.carry.type, v.carry.type === 'food' ? '#7dc95e' : v.carry.type === 'wood' ? '#c9964b' : '#a5a5ae');
          v.carry.amt = 0; v.carry.type = null;
        }
        v.state = 'idle';
        return;
      }
      case 'fight': {
        const m = v.tgt;
        if (!m || m.dead || m.hp <= 0 || U.dst(v.x, v.y, World.center.x, World.center.y) > CONFIG.GUARD.leash + 6) {
          v.tgt = null; v.state = 'idle'; v.path = null; return;
        }
        const d = U.dst(v.x, v.y, m.x, m.y);
        if (d < 1.0) {
          v.path = null;
          if (v.atkCd <= 0) {
            v.atkCd = CONFIG.GUARD.atkT;
            this.hitMonster(m, this.guardDmg(), v);
            this.fx('spark', m.x, m.y, .25);
          }
        } else if (!v.path || v.pi >= v.path.length || (v.aiT > .3 && !v.path)) {
          v.path = Path.find(v.x | 0, v.y | 0, m.x | 0, m.y | 0, { adjacent: true, monster: false });
          v.pi = 0;
        }
        return;
      }
    }

    // ----- idle: pick a task -----
    if (v.state === 'work') return;
    if (isNightLike() && v.job !== 'guard') { v.state = 'shelter'; return; }
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
      if (best) { v.tgt = best; v.state = 'fight'; return; }
      // raid order: march on a dark monolith and tear it down
      if (G.raidTarget && G.buildings.includes(G.raidTarget)) {
        const rt = G.raidTarget;
        const d = U.dst(v.x, v.y, rt.x + .5, rt.y + .5);
        if (d < 1.15) {
          v.path = null;
          if (v.atkCd <= 0) {
            v.atkCd = CONFIG.GUARD.atkT;
            this.hitBuilding(rt, this.guardDmg());
            this.fx('spark', rt.x + .5, rt.y + .3, .3);
          }
        } else if (!v.path || v.pi >= v.path.length) {
          v.path = Path.find(v.x | 0, v.y | 0, rt.x, rt.y, { adjacent: true });
          v.pi = 0;
        }
        return;
      }
      // idle patrol
      if (Math.random() < .3) {
        const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 3;
        const tx = U.clamp((World.center.x + Math.cos(a) * r) | 0, 1, World.W - 2);
        const ty = U.clamp((World.center.y + Math.sin(a) * r) | 0, 1, World.H - 2);
        v.path = Path.find(v.x | 0, v.y | 0, tx, ty, { adjacent: true }); v.pi = 0;
      }
      return;
    }

    if (job === 'builder') {
      // construction sites first
      const sites = Buildings.unBuilt();
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
      // then repairs
      const dmg = Buildings.damaged().filter(b => b.hp / b.maxHp < 0.75);
      if (dmg.length) {
        for (const b of dmg) {
          if (this.repairable(b) && this.sendToBuilding(v, b, 'repair')) return;
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

    // gatherers: forager / lumber / miner / herbalist
    if (job === 'forager' || job === 'lumber' || job === 'miner' || job === 'herbalist') {
      const types = job === 'forager' ? [OBJ.BUSH]
        : job === 'lumber' ? [OBJ.TREE, OBJ.PINE, OBJ.BIRCH, OBJ.DEADTREE]
          : job === 'miner' ? [OBJ.ROCK, OBJ.RUIN, OBJ.CRYSTAL]
            : [OBJ.HERB];
      const resType = job === 'forager' ? 'food' : job === 'lumber' ? 'wood' : job === 'miner' ? 'stone' : 'herbs';
      if (v.carry.amt >= Entities.carryMax(v)) { this.sendToStore(v); return; }
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
      const o = World.objAt(v.tgtTile.x, v.tgtTile.y);
      const want = v.workKind === 'food' ? [OBJ.BUSH]
        : v.workKind === 'wood' ? [OBJ.TREE, OBJ.PINE, OBJ.BIRCH, OBJ.DEADTREE]
          : v.workKind === 'stone' ? [OBJ.ROCK, OBJ.RUIN, OBJ.CRYSTAL]
            : v.workKind === 'herbs' ? [OBJ.HERB] : [];
      if (want.includes(o) && World.amtAt(v.tgtTile.x, v.tgtTile.y) > 0) { v.state = 'work'; v.workT = 0; return; }
      v.state = 'idle'; v.tgtTile = null;
      return;
    }
    if (v.workB) {
      const b = v.workB;
      const alive = G.buildings.includes(b);
      if (!alive) { v.workB = null; v.state = 'idle'; return; }
      if (v.workMode === 'build' && !b.built) { v.state = 'work'; return; }
      if (v.workMode === 'repair' && b.hp < b.maxHp && this.repairable(b)) { v.state = 'work'; return; }
      if (v.workMode === 'harvest' && b.built && b.growth >= 1) { v.state = 'work'; v.workT = 0; return; }
      if (v.workMode === 'tend' && b.built && b.growth < 1) { v.state = 'work'; v.workT = 0; return; }
      if ((v.workMode === 'fish' || v.workMode === 'mine') && b.built) { v.state = 'work'; v.workT = 0; return; }
      v.workB = null; v.state = 'idle';
      return;
    }
    v.state = 'idle';
  },

  vWork(v, dt) {
    const ws = Entities.workSpeed(v);
    if (v.workKind && v.tgtTile) {
      const { x, y } = v.tgtTile;
      v.workT += dt * ws;
      const jobKey = v.workKind === 'food' ? 'forager' : v.workKind === 'wood' ? 'lumber' : v.workKind === 'stone' ? 'miner' : v.workKind === 'herbs' ? 'herbalist' : v.job;
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
          const bonus = World.deplete(x, y);
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
        v.carry.amt += CONFIG.FARM.yield;
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

  sendToBuilding(v, b, mode) {
    const tx = (b.x + b.w / 2) | 0, ty = (b.y + b.h / 2) | 0;
    const p = Path.find(v.x | 0, v.y | 0, tx, ty, { adjacent: true });
    if (!p) return false;
    v.path = p; v.pi = 0;
    v.state = 'toWork';
    v.workB = b; v.workMode = mode; v.workKind = null; v.tgtTile = null;
    if (mode === 'harvest' || mode === 'tend' || mode === 'build' || mode === 'repair') v.workT = 0;
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
    m.hp -= dmg;
    m.flash = .12;
    if (m.hp <= 0) this.monsterDeath(m, 'slain');
  },

  monsterDeath(m, how) {
    if (m.dead) return;
    m.dead = true;
    const base = how === 'dawn' ? m.ess / 2 : m.ess;
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
    // leave a small grave so the dead are remembered
    const gx = v.x | 0, gy = v.y | 0;
    const o = World.objAt(gx, gy);
    if ((o === OBJ.NONE || o === OBJ.FLOWER || o === OBJ.TGRASS || o === OBJ.MUSH) && !World.bldAt(gx, gy)
      && World.tileT(gx, gy) !== T.WATER && World.inB(gx, gy)) {
      World.setObj(gx, gy, OBJ.GRAVE, 0);
    }
    if (G.follow === v) G.follow = null;
    if (G.sel && G.sel.ref === v) { G.sel = null; UI.selHide(); }
    this.reassign();
  },

  hitBuilding(b, dmg) {
    if (!b || !G.buildings.includes(b)) return;
    b.hp -= dmg;
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

  guardDmg() {
    let d = CONFIG.GUARD.dmg;
    if (G.buildings.some(b => b.built && b.key === 'barracks')) d *= CONFIG.BARRACKS.dmgMult;
    return d;
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
  moveAlong(e, dt, spd) {
    if (!e.path || e.pi >= e.path.length) return;
    let step = spd * dt;
    while (step > 0 && e.pi < e.path.length) {
      const wp = e.path[e.pi];
      const d = U.dst(e.x, e.y, wp.x, wp.y);
      if (d <= step || d < 0.03) {
        e.x = wp.x; e.y = wp.y; e.pi++; step -= d;
      } else {
        e.x += (wp.x - e.x) / d * step;
        e.y += (wp.y - e.y) / d * step;
        e.facing = wp.x >= e.x ? 1 : -1;
        step = 0;
      }
    }
    // stuck watch
    const d2 = e.pi < e.path.length ? U.dst2(e.x, e.y, e.path[e.pi].x, e.path[e.pi].y) : 0;
    if (d2 > e.lastD - 0.0004 && e.pi < e.path.length) {
      e.stuckT += dt;
      if (e.stuckT > 1.4) { e.stuckT = 0; e.path = null; e.pi = 0; } // force rethink
    } else { e.stuckT = 0; }
    e.lastD = d2;
  },

  separate() {
    const all = G.villagers;
    const mons = G.monsters;
    // push villagers apart so they don't stack
    for (let i = 0; i < all.length; i++) {
      const a = all[i];
      for (let j = i + 1; j < all.length; j++) {
        const b = all[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) > .5 || Math.abs(dy) > .5) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 < .16 && d2 > 0.0001) {
          const d = Math.sqrt(d2), push = (0.4 - d) * .5;
          const ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
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
      const want = G.jobs[job] || 0;
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
  dusk() { if (G.phase === 'day') { G.time = CONFIG.DAY_LEN - 0.01; } },
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
