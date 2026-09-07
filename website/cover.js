// Draws the Pocket Ruins hub-card cover from the game's own renderer, the
// same trick the old cover used: a tiny seeded world, no assets.
import { createWorld } from "./ruins/world.js";
import { createRenderer } from "./ruins/render.js";
import { CAMP_TILE, BUILDINGS } from "./ruins/balance.js";

const canvas = document.querySelector("#cover");
if (canvas) {
  const world = createWorld(20260907);
  const state = {
    world,
    clock: { tick: 24000 * 0.35, day: 1, phaseIndex: 2 },
    daylight: 1,
    buildings: [],
    villagers: [],
    nomads: [],
    corpses: [],
    events: [],
  };
  // A little hamlet east of the camp.
  const put = (type, x, y) => {
    state.buildings.push({
      id: state.buildings.length + 1,
      type,
      x,
      y,
      complete: true,
      delivered: 99,
      workDone: 1,
      workNeeded: 1,
      occupants: 0,
      workers: [],
      plots: [],
    });
  };
  put("camp", CAMP_TILE.x, CAMP_TILE.y);
  put("home", CAMP_TILE.x + 3, CAMP_TILE.y - 1);
  put("home", CAMP_TILE.x + 5, CAMP_TILE.y + 1);
  put("farm", CAMP_TILE.x - 1, CAMP_TILE.y + 3);
  put("well", CAMP_TILE.x + 3, CAMP_TILE.y + 3);
  put("sawpit", CAMP_TILE.x - 3, CAMP_TILE.y - 2);
  put("storehouse", CAMP_TILE.x + 5, CAMP_TILE.y - 2);
  // Claim farm plots so the render shows crops.
  const farm = state.buildings[3];
  const size = world.size;
  let claimed = 0;
  for (let dy = -1; dy <= 3 && claimed < 8; dy++)
    for (let dx = -1; dx <= 3 && claimed < 8; dx++) {
      const i = (farm.y + dy) * size + farm.x + dx;
      if (world.feature[i] === 0 && world.terrain[i] === 0) {
        world.feature[i] = 5;
        world.plots.set(i, { farm: farm.id, readyTick: state.clock.tick + 4000 });
        claimed++;
      }
    }
  for (let i = 0; i < 12; i++)
    state.villagers.push({
      id: i,
      name: "",
      age: "adult",
      x: CAMP_TILE.x + 1.5 + Math.cos(i * 2.1) * (2 + (i % 3)),
      y: CAMP_TILE.y + 1.5 + Math.sin(i * 2.1) * (1.5 + (i % 4)),
      job: ["builder", "farmer", "woodcutter"][i % 3],
      task: null,
      carrying: null,
      home: null,
      facing: 1,
      hunger: 80,
      thirst: 80,
      bubble: null,
    });

  const renderer = createRenderer(canvas, state);
  renderer.view.camera = { x: CAMP_TILE.x + 2, y: CAMP_TILE.y + 0.5, zoom: 2.6 };
  renderer.draw(state);
}
