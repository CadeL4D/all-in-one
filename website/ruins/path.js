// A* on the tile grid. One graph for everyone. Monsters reuse it in two
// modes for the RtR rule (doc 04 section 3.4): a plain search where every
// wall blocks (clear route), and a weighted search where entering a
// structure costs its time-to-break (least-resistance breach).
import { MAP_SIZE } from "./balance.js";
import { tilePassable } from "./world.js";

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// opts.through: Set of tile indices walkable despite `blocked` (gates -
// villagers and nomads pass, monsters never get this option).
// opts.cost(i): traversal cost for entering tile i; default 1. Must be >= 1
// so the Manhattan heuristic stays admissible.
export function findPath(world, start, goal, blocked, opts = {}) {
  const through = opts.through ?? null;
  const cost = opts.cost ?? null;
  if (start === goal) return [];
  // In breach mode the goal stays the (blocked) camp tile itself: A* may
  // enter it like any other structure. Otherwise resolve to standable ground.
  if (!cost && !isPassable(world, goal, blocked, through)) {
    const alt = adjacentOpen(world, goal, start, blocked, through);
    if (alt < 0) return null;
    goal = alt;
    if (start === goal) return [];
  }
  const size = MAP_SIZE;
  const total = size * size;
  const gScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const heap = []; // [f, index]
  const gx = goal % size,
    gy = Math.floor(goal / size);
  const h = (i) => {
    const x = i % size,
      y = Math.floor(i / size);
    return Math.abs(x - gx) + Math.abs(y - gy);
  };
  const push = (i, f) => {
    heap.push([f, i]);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heap[p][0] <= heap[c][0]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1,
          r = l + 1;
        let m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };

  gScore[start] = 0;
  push(start, h(start));
  let guard = total * 4;
  while (heap.length && guard-- > 0) {
    const [, current] = pop();
    if (current === goal) return reconstruct(cameFrom, goal);
    if (closed[current]) continue;
    closed[current] = 1;
    const cx = current % size,
      cy = Math.floor(current / size);
    for (const [dx, dy] of NEIGHBORS) {
      const nx = cx + dx,
        ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const n = ny * size + nx;
      // Breach mode (cost fn) expands through structures at their
      // time-to-break; plain mode treats them as walls. Either way an
      // infinite cost means "never" (water, trees, rocks).
      const step = cost ? cost(n) : 1;
      if (!isFinite(step)) continue;
      if (n !== goal && !cost && !isPassable(world, n, blocked, through)) continue;
      if (closed[n]) continue;
      const tentative = gScore[current] + step;
      if (tentative < gScore[n]) {
        gScore[n] = tentative;
        cameFrom[n] = current;
        push(n, tentative + h(n));
      }
    }
  }
  return null;
}

export function isPassable(world, i, blocked, through = null) {
  if (blocked && blocked[i] !== -1) return through ? through.has(i) : false;
  return tilePassable(world, i);
}

function reconstruct(cameFrom, goal) {
  const path = [];
  let cur = goal;
  while (cur !== -1) {
    path.push(cur);
    cur = cameFrom[cur];
  }
  path.reverse();
  path.shift(); // drop the start tile
  return path;
}

// Walk to the closest standable tile near a (possibly blocked) target:
// scans outward in rings so trees inside dense clumps (or buildings whose
// direct neighbors are all blocked) stay reachable from up to 2 tiles away.
export function adjacentOpen(world, target, from, blocked, through = null) {
  const size = MAP_SIZE;
  const tx = target % size,
    ty = Math.floor(target / size);
  const fx = from % size,
    fy = Math.floor(from / size);
  for (let r = 1; r <= 2; r++) {
    let best = -1,
      bestD = Infinity;
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // ring only
        const x = tx + dx,
          y = ty + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const i = y * size + x;
        if (!isPassable(world, i, blocked, through)) continue;
        const d = Math.abs(x - fx) + Math.abs(y - fy);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    if (best >= 0) return best;
  }
  return -1;
}
