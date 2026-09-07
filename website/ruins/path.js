// A* on the tile grid. One graph for everyone; monsters will reuse it in M2
// with the RtR rule (open path preferred, else chew the weakest wall).
import { MAP_SIZE } from "./balance.js";
import { tilePassable } from "./world.js";

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Returns an array of tile indices from (excluding) start to (including)
// goal, or null when unreachable. `blocked` is the building occupancy grid
// (Int32Array of building ids, -1 = free). A goal that sits inside a
// building (or on a feature) is resolved to the nearest adjacent open tile
// first, so targets are always standable. Uses a binary heap; maps are fine
// at this size but the heap keeps 60 villagers re-pathing without spikes.
export function findPath(world, start, goal, blocked) {
  if (start === goal) return [];
  if (!isPassable(world, goal, blocked)) {
    const alt = adjacentOpen(world, goal, start, blocked);
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
      if (n !== goal && !isPassable(world, n, blocked, false)) continue;
      if (closed[n]) continue;
      const tentative = gScore[current] + 1;
      if (tentative < gScore[n]) {
        gScore[n] = tentative;
        cameFrom[n] = current;
        push(n, tentative + h(n));
      }
    }
  }
  return null;
}

export function isPassable(world, i, blocked) {
  if (blocked && blocked[i] !== -1) return false;
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
export function adjacentOpen(world, target, from, blocked) {
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
        if (blocked && blocked[i] !== -1) continue;
        if (!tilePassable(world, i)) continue;
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
