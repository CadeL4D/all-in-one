import { createWorld, footprint } from "./destiny/world.js";
import { scene } from "./destiny/art.js";
const c = document.querySelector("#cover").getContext("2d"),
  s = createWorld("HEARTH-742", 0, true);
const list = [
  ["hearth", 30, 21],
  ["house", 26, 25],
  ["house", 36, 26],
  ["house", 38, 21],
  ["farm", 30, 28],
  ["well", 34, 25],
  ["tower", 41, 25],
  ["garden", 27, 22],
  ["lumber", 23, 20],
];
for (const [type, x, y] of list) {
  s.buildings.push({ type, x, y, rot: 0, progress: 1, hp: 300 });
  for (const [dx, dy] of footprint(type)) s.tiles[(y + dy) * 64 + x + dx] = 0;
}
for (let x = 24; x < 44; x++) s.roads.push(24 * 64 + x);
for (let i = 0; i < 10; i++)
  s.people.push({ id: i, x: 26 + i * 1.5, y: 24.5, path: [] });
c.scale(1.8, 1.8);
c.translate(-180, -175);
scene(c, s, 0);
