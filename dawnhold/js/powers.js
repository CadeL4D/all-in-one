'use strict';
/* ============================================================
   Dawnhold — powers.js
   Guardian powers fueled by Essence: Mend, Smite, Meteor.
   ============================================================ */

const POWERS = {
  mend: {
    name: 'Mend', cost: CONFIG.POWERS.mend.cost, icon: 'essence', target: 'friendly',
    desc: `Heal a villager, wall or tower for ${CONFIG.POWERS.mend.heal} health. Costs ${CONFIG.POWERS.mend.cost} essence.`,
  },
  smite: {
    name: 'Smite', cost: CONFIG.POWERS.smite.cost, icon: 'spark', target: 'area', r: CONFIG.POWERS.smite.r,
    desc: `Holy light burns ${CONFIG.POWERS.smite.dmg} damage in a small circle — wipes out shades. Costs ${CONFIG.POWERS.smite.cost} essence.`,
  },
  meteor: {
    name: 'Meteor', cost: CONFIG.POWERS.meteor.cost, icon: 'meteor', target: 'area', r: CONFIG.POWERS.meteor.r, unlockDay: CONFIG.POWERS.meteor.unlockDay,
    desc: `Call a falling star: ${CONFIG.POWERS.meteor.dmg} damage in a wide circle. Costs ${CONFIG.POWERS.meteor.cost} essence.`,
  },
};

const Powers = {
  unlocked(key) {
    const p = POWERS[key];
    if (!p) return false;
    if (key === 'meteor') return G.day >= p.unlockDay || G.unlocks.__meteor || G.unlocks['__meteor'];
    return true;
  },
  canAfford(key) { return G.res.essence >= POWERS[key].cost; },

  cast(key, wx, wy) {
    const p = POWERS[key];
    if (!p || !this.unlocked(key) || !this.canAfford(key)) return false;
    const C = CONFIG.POWERS[key];
    if (key === 'mend') {
      // nearest friendly entity within 1 tile
      let healed = false;
      let bestV = null, bd = 1.4;
      for (const v of G.villagers) {
        const d = U.dst(wx, wy, v.x, v.y);
        if (d < bd) { bd = d; bestV = v; }
      }
      if (bestV && bestV.hp < bestV.maxHp) {
        bestV.hp = Math.min(bestV.maxHp, bestV.hp + C.heal);
        Sim.float(bestV.x, bestV.y - .8, '+' + C.heal, '#7dc95e');
        healed = true;
      } else {
        let bestB = null, bbd = 1.6;
        for (const b of G.buildings) {
          if (!b.built) continue;
          const d = U.dst(wx, wy, b.x + b.w / 2, b.y + b.h / 2) - (b.w + b.h) / 4;
          if (d < bbd && b.hp < b.maxHp) { bbd = d; bestB = b; }
        }
        if (bestB) {
          bestB.hp = Math.min(bestB.maxHp, bestB.hp + C.heal);
          Sim.float(bestB.x + bestB.w / 2, bestB.y, '+' + C.heal, '#7dc95e');
          healed = true;
        }
      }
      if (!healed) { UI.toast('Nothing wounded to mend here.', ''); return false; }
      Sim.fx('ring', wx, wy, .5, { col: '#7dc95e' });
    } else if (key === 'smite') {
      Sim.fx('ring', wx, wy, .5, { col: '#ffe9a0', r: C.r });
      Sim.float(wx, wy - .8, 'SMITE', '#ffe9a0');
      for (const m of G.monsters) {
        if (U.dst(wx, wy, m.x, m.y) <= C.r) Sim.hitMonster(m, C.dmg);
      }
      G.shake = Math.max(G.shake, 2.5);
    } else if (key === 'meteor') {
      Sim.fx('meteor', wx, wy, 1.0, { r: C.r, dmg: C.dmg });
      return true; // essence deducted, boom comes on impact
    }
    G.res.essence -= p.cost;
    return true;
  },

  meteorBoom(x, y) {
    const C = CONFIG.POWERS.meteor;
    Sim.fx('ring', x, y, .6, { col: '#ff9a2e', r: C.r + .4 });
    Sim.float(x, y - .8, 'BOOM', '#ff9a2e');
    for (let i = 0; i < 8; i++) Sim.fx('flame', x + (Math.random() - .5) * C.r * 1.6, y + (Math.random() - .5) * C.r * 1.2, .5);
    for (const m of G.monsters) {
      if (U.dst(x, y, m.x, m.y) <= C.r) Sim.hitMonster(m, C.dmg);
    }
    UI.updateHUD();
  },
};
