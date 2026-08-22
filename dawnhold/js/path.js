'use strict';
/* ============================================================
   Dawnhold — path.js
   A* over the tile grid, 8-directional with corner-cut
   prevention. Monsters path *through* solid buildings at high
   cost, which naturally makes them prefer gaps and gates but
   batter walls when fully sealed.
   ============================================================ */

const Path = {
  find(sx, sy, tx, ty, opts) {
    opts = opts || {};
    const monster = !!opts.monster, adjacent = !!opts.adjacent, phase = !!opts.phase;
    sx |= 0; sy |= 0; tx |= 0; ty |= 0;
    const W = World.W, H = World.H;
    if (!World.inB(tx, ty)) return null;

    // If goal blocked and adjacent allowed, snap to a nearby walkable tile
    if (adjacent && !this.pass(tx, ty, monster, phase)) {
      const spot = this.nearbyFree(tx, ty, monster, 2, phase);
      if (!spot) return null;
      tx = spot.x; ty = spot.y;
    }
    if (sx === tx && sy === ty) return [{ x: tx + .5, y: ty + .5 }];

    const size = W * H;
    const g = this._g || (this._g = new Float64Array(size));
    const came = this._came || (this._came = new Int32Array(size));
    const closed = this._closed || (this._closed = new Uint8Array(size));
    g.fill(Infinity); closed.fill(0);
    const open = this._heap || (this._heap = new Heap());
    open.clear();

    const si = World.idx(sx, sy), ti = World.idx(tx, ty);
    g[si] = 0; came[si] = -1;
    open.push(si, this.h(sx, sy, tx, ty));
    let best = si, bestH = this.h(sx, sy, tx, ty);
    let nodes = 0, maxNodes = opts.maxNodes || 5000;

    while (open.len && nodes < maxNodes) {
      const cur = open.pop();
      if (closed[cur]) continue;
      closed[cur] = 1; nodes++;
      if (cur === ti) { best = cur; bestH = 0; break; }
      const cx = cur % W, cy = (cur / W) | 0;
      const hh = this.h(cx, cy, tx, ty);
      if (hh < bestH) { bestH = hh; best = cur; }
      for (let d = 0; d < 8; d++) {
        const dx = DIR8[d][0], dy = DIR8[d][1];
        const nx = cx + dx, ny = cy + dy;
        if (!World.inB(nx, ny)) continue;
        const step = World.cost(nx, ny, monster, phase);
        if (step === Infinity) continue;
        if (dx && dy) { // no corner cutting
          if (World.cost(cx + dx, cy, monster, phase) === Infinity) continue;
          if (World.cost(cx, cy + dy, monster, phase) === Infinity) continue;
        }
        const ni = World.idx(nx, ny);
        if (closed[ni]) continue;
        const ng = g[cur] + step * (dx && dy ? 1.42 : 1);
        if (ng < g[ni]) {
          g[ni] = ng; came[ni] = cur;
          open.push(ni, ng + this.h(nx, ny, tx, ty) * 1.05);
        }
      }
    }

    // build path from best node (exact or closest reached)
    if (best === si && si !== ti) {
      // no progress at all — try direct adjacent fallback
      if (!adjacent) return null;
    }
    const pts = [];
    let n = best;
    while (n !== -1) { pts.push({ x: (n % W) + 0.5, y: ((n / W) | 0) + 0.5 }); n = came[n]; }
    pts.reverse();
    if (pts.length > 1) { pts.shift(); } // drop current tile
    return pts.length ? pts : null;
  },

  pass(tx, ty, monster, phase) {
    if (!World.inB(tx, ty)) return false;
    return World.cost(tx, ty, monster, phase) !== Infinity;
  },

  nearbyFree(tx, ty, monster, r, phase) {
    let best = null, bd = 1e9;
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const x = tx + dx, y = ty + dy;
        if (!this.pass(x, y, monster, phase)) continue;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = { x, y }; }
      }
    return best;
  },

  h(ax, ay, bx, by) {
    const dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
    return (dx + dy) + (-0.6) * Math.min(dx, dy);
  },
};

const DIR8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// binary min-heap keyed by priority
class Heap {
  constructor() { this.a = []; this.len = 0; }
  clear() { this.a.length = 0; this.len = 0; }
  push(v, p) {
    const a = this.a; a.push([p, v]); this.len++;
    let i = a.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (a[par][0] <= a[i][0]) break;
      [a[par], a[i]] = [a[i], a[par]]; i = par;
    }
  }
  pop() {
    const a = this.a; if (!a.length) return -1;
    const top = a[0][1]; this.len--;
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}
