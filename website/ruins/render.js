// Canvas painter: terrain, features, buildings, villagers, night grading.
// All art is procedural and original - no external assets. Rendering only
// samples sim state; it never mutates it.
import * as B from "./balance.js";
import { T_GRASS, T_DIRT, T_WATER, F_TREE, F_ROCK, F_BUSH, F_STUMP, F_PLOT, F_SAPLING } from "./world.js";

const P = {
  grass1: "#7ab053",
  grass2: "#74a94e",
  tuft: "#8abd60",
  dry: "#9cbb62",
  dirt: "#b3966a",
  water: "#4f8ecb",
  waterDeep: "#4180bf",
  shimmer: "#8fbde2",
  treeA: "#3f7c41",
  treeB: "#4f9450",
  treeC: "#356b38",
  trunk: "#7a5230",
  rock: "#9aa0a6",
  rockHi: "#b6bcc2",
  rockLo: "#7c8288",
  bush: "#4c8a46",
  berry: "#d1495b",
  soil: "#8a6a3f",
  soilRow: "#775a34",
  crop: "#9cc45c",
  cropRipe: "#d9b156",
  wood: "#8a5a34",
  woodHi: "#a4713f",
  plank: "#c9a15f",
  plaster: "#ecdcb2",
  roof: "#b5563e",
  roofHi: "#c96a4f",
  stone: "#a7adb3",
  night: "#0b1233",
  fire: "#ffb454",
  skin: "#e8c39a",
  shadow: "rgba(20,40,20,0.25)",
  // Corruption palette: terrain is recolored, not overlaid (pillar 7 -
  // readable chaos at zoom-out).
  blight1: "#4a3555",
  blight2: "#41304e",
  blightSpot: "#33243e",
  blightVein: "#6d4b8f",
  nest: "#3a2a46",
  nestHi: "#7d5ba6",
  nestMaw: "#1d1428",
  husk: "#8fae6b",
  huskHi: "#a5c47e",
  blot: "#7d5ba6",
  blotHi: "#9a7cc0",
  bolt: "#ffd97a",
};

const hash = (i) => {
  let h = (i * 2654435761) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
};

export function createRenderer(canvas, stateRef) {
  const g = canvas.getContext("2d");
  const view = {
    camera: { x: B.CAMP_TILE.x + 1, y: B.CAMP_TILE.y + 1, zoom: 2 },
    ghost: null, // {type, x, y, valid}
    selected: null, // {kind:'building'|'villager', id}
    buildMode: false,
    time: 0,
  };

  function draw(state) {
    const { camera } = view;
    const w = canvas.width,
      h = canvas.height;
    g.imageSmoothingEnabled = false;
    g.fillStyle = P.waterDeep;
    g.fillRect(0, 0, w, h);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const z = camera.zoom;
    g.setTransform(z, 0, 0, z, w / 2 / 1 - camera.x * B.TILE * z, h / 2 - camera.y * B.TILE * z);

    const halfW = w / 2 / (z * B.TILE),
      halfH = h / 2 / (z * B.TILE);
    const x0 = Math.max(0, Math.floor(camera.x - halfW - 1)),
      x1 = Math.min(state.world.size - 1, Math.ceil(camera.x + halfW + 1));
    const y0 = Math.max(0, Math.floor(camera.y - halfH - 1)),
      y1 = Math.min(state.world.size - 1, Math.ceil(camera.y + halfH + 2));

    drawTerrain(state, x0, x1, y0, y1);
    drawCorruption(state, x0, x1, y0, y1);
    drawFeatures(state, x0, x1, y0, y1);
    drawPlots(state, x0, x1, y0, y1);
    drawBuildings(state);
    drawCorpses(state);
    drawRangeCircle(state);
    drawNomads(state);
    drawMonsters(state);
    drawVillagers(state);
    drawProjectiles(state);
    drawGhost(state);
    drawPaint(state);
    drawNight(state);
    drawSelection(state);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  const px = (tx) => tx * B.TILE;

  function drawTerrain(state, x0, x1, y0, y1) {
    const { world } = state;
    const t = view.time;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * world.size + x;
        const hsh = hash(i);
        const X = px(x),
          Y = px(y);
        const terr = world.terrain[i];
        if (terr === T_WATER) {
          g.fillStyle = (hsh & 3) === 0 ? P.waterDeep : P.water;
          g.fillRect(X, Y, B.TILE, B.TILE);
          const s = Math.sin(t * 0.0016 + x * 1.7 + y * 2.3);
          if (s > 0.55) {
            g.fillStyle = P.shimmer;
            g.fillRect(X + 3, Y + 6 + ((hsh >> 3) & 3), 6, 1);
            g.fillRect(X + 9, Y + 11, 4, 1);
          }
        } else if (terr === T_DIRT) {
          g.fillStyle = P.dirt;
          g.fillRect(X, Y, B.TILE, B.TILE);
          if ((hsh & 7) === 0) {
            g.fillStyle = "#a3885e";
            g.fillRect(X + ((hsh >> 4) & 7) + 2, Y + ((hsh >> 6) & 7) + 2, 3, 2);
          }
        } else {
          g.fillStyle = (x + y) & 1 ? P.grass1 : P.grass2;
          g.fillRect(X, Y, B.TILE, B.TILE);
          const kind = hsh & 15;
          if (kind === 0) {
            g.fillStyle = P.tuft;
            g.fillRect(X + 4, Y + 9, 2, 3);
            g.fillRect(X + 8, Y + 7, 2, 5);
          } else if (kind === 5) {
            g.fillStyle = P.dry;
            g.fillRect(X + 3, Y + 4, 4, 2);
            g.fillRect(X + 9, Y + 10, 3, 2);
          }
        }
      }
    }
  }

  function drawFeatures(state, x0, x1, y0, y1) {
    const { world } = state;
    for (const i of world.trees) {
      const x = i % world.size,
        y = Math.floor(i / world.size);
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      drawTree(px(x), px(y), hash(i));
    }
    for (const i of world.rocks) {
      const x = i % world.size,
        y = Math.floor(i / world.size);
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      drawRock(px(x), px(y), hash(i));
    }
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * world.size + x;
        const f = world.feature[i];
        if (f === F_BUSH) drawBush(px(x), px(y), hash(i), !world.regrow.has(i));
        else if (f === F_STUMP) drawStump(px(x), px(y));
        else if (f === F_SAPLING) drawSapling(px(x), px(y));
      }
    }
  }

  function drawPlots(state, x0, x1, y0, y1) {
    const { world } = state;
    for (const [i, plot] of world.plots) {
      const x = i % world.size,
        y = Math.floor(i / world.size);
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const X = px(x),
        Y = px(y);
      g.fillStyle = P.soil;
      g.fillRect(X, Y, B.TILE, B.TILE);
      g.fillStyle = P.soilRow;
      g.fillRect(X, Y + 3, B.TILE, 2);
      g.fillRect(X, Y + 9, B.TILE, 2);
      const ripe = plot.readyTick > 0 && state.clock.tick >= plot.readyTick;
      const growing = plot.readyTick > 0;
      if (growing) {
        g.fillStyle = ripe ? P.cropRipe : P.crop;
        for (const rx of [2, 7, 12]) {
          g.fillRect(X + rx, Y + (ripe ? 2 : 5), 2, ripe ? 4 : 2);
          if (ripe) g.fillRect(X + rx - 1, Y + 1, 4, 2);
        }
      }
    }
  }

  // Corruption eats the tile art wholesale: blighted ground, dark veins,
  // and a slow pulse so the frontier reads at any zoom.
  function drawCorruption(state, x0, x1, y0, y1) {
    const { world } = state;
    const pulse = Math.sin(view.time * 0.0012) * 0.5 + 0.5;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * world.size + x;
        if (!world.corruption[i]) continue;
        const hsh = hash(i);
        const X = px(x),
          Y = px(y);
        g.fillStyle = (hsh & 3) === 0 ? P.blight2 : P.blight1;
        g.fillRect(X, Y, B.TILE, B.TILE);
        if ((hsh & 7) === 0) {
          g.fillStyle = P.blightSpot;
          g.fillRect(X + ((hsh >> 4) & 9) + 2, Y + ((hsh >> 7) & 9) + 2, 4, 3);
        }
        if ((hsh & 15) === 5) {
          g.fillStyle = P.blightVein;
          g.fillRect(X + 3, Y + 4 + ((hsh >> 5) & 5), 2, 2);
          g.fillRect(X + 5, Y + 9, 2, 2);
        }
        // Border glow on the frontier: corruption's next move is visible.
        const edge =
          (x > 0 && !world.corruption[i - 1]) ||
          (x < world.size - 1 && !world.corruption[i + 1]) ||
          (y > 0 && !world.corruption[i - world.size]) ||
          (y < world.size - 1 && !world.corruption[i + world.size]);
        if (edge && pulse > 0.45) {
          g.fillStyle = "rgba(154,124,192,0.35)";
          g.fillRect(X, Y, B.TILE, B.TILE);
        }
      }
    }
  }

  function drawTree(X, Y, hsh) {
    const big = (hsh & 3) !== 0;
    const s = big ? 1 : 0;
    g.fillStyle = P.shadow;
    g.fillRect(X + 3, Y + 13, 10, 2);
    g.fillStyle = P.trunk;
    g.fillRect(X + 7, Y + 9, 2, 5);
    g.fillStyle = P.treeA;
    g.fillRect(X + 3 - s, Y + 2 - s, 10 + s * 2, 7 + s);
    g.fillStyle = P.treeB;
    g.fillRect(X + 5 - s, Y + 1 - s, 5 + s * 2, 3);
    g.fillStyle = P.treeC;
    g.fillRect(X + 3 - s, Y + 7, 10 + s * 2, 2);
  }

  function drawRock(X, Y, hsh) {
    g.fillStyle = P.shadow;
    g.fillRect(X + 3, Y + 12, 9, 2);
    g.fillStyle = P.rock;
    g.fillRect(X + 3, Y + 6, 9, 6);
    g.fillRect(X + 5, Y + 4, 5, 2);
    g.fillStyle = P.rockHi;
    g.fillRect(X + 5, Y + 4, 3, 2);
    g.fillStyle = P.rockLo;
    g.fillRect(X + 3, Y + 10, 9, 2);
  }

  function drawBush(X, Y, hsh, berries) {
    g.fillStyle = P.shadow;
    g.fillRect(X + 4, Y + 12, 8, 1);
    g.fillStyle = P.bush;
    g.fillRect(X + 3, Y + 5, 10, 7);
    g.fillRect(X + 5, Y + 3, 6, 3);
    if (berries) {
      g.fillStyle = P.berry;
      g.fillRect(X + 5, Y + 6, 2, 2);
      g.fillRect(X + 9, Y + 8, 2, 2);
      g.fillRect(X + 7, Y + 4, 2, 2);
    }
  }

  function drawStump(X, Y) {
    g.fillStyle = P.trunk;
    g.fillRect(X + 6, Y + 9, 5, 4);
    g.fillStyle = P.woodHi;
    g.fillRect(X + 6, Y + 8, 5, 2);
  }

  function drawSapling(X, Y) {
    g.fillStyle = P.treeB;
    g.fillRect(X + 7, Y + 9, 2, 3);
    g.fillRect(X + 5, Y + 7, 6, 2);
  }

  function drawBuildings(state) {
    for (const b of state.buildings) {
      const def = B.BUILDINGS[b.type];
      const X = px(b.x),
        Y = px(b.y),
        S = def.size * B.TILE;
      if (!b.complete) drawSite(state, b, X, Y, S);
      else if (b.type === "camp") drawCamp(X, Y, S);
      else if (b.type === "home") drawHome(X, Y, S);
      else if (b.type === "farm") drawFarm(X, Y, S);
      else if (b.type === "well") drawWell(X, Y, S);
      else if (b.type === "sawpit") drawSawpit(X, Y, S);
      else if (b.type === "storehouse") drawStorehouse(X, Y, S);
      else if (b.type === "nest") drawNest(X, Y, S);
      else if (b.type === "fence") drawFence(X, Y, S);
      else if (b.type === "stoneWall") drawStoneWall(X, Y, S);
      else if (b.type === "gate") drawGate(X, Y, S);
      else if (b.type === "tower") drawTower(X, Y, S);
      else if (b.type === "quarry") drawQuarry(X, Y, S);
      // Damage bar: only when it actually hurts (readable raids).
      if (b.complete && b.hp < def.hp) {
        const w = S - 4;
        g.fillStyle = "#3a3f45";
        g.fillRect(X + 2, Y - 4, w, 2);
        g.fillStyle = b.hp / def.hp > 0.4 ? "#7ec466" : "#e26d5a";
        g.fillRect(X + 2, Y - 4, (w * b.hp) / def.hp, 2);
      }
      if (view.selected && view.selected.kind === "building" && view.selected.id === b.id) {
        g.strokeStyle = "#ffe08a";
        g.lineWidth = 1;
        g.strokeRect(X + 0.5, Y + 0.5, S - 1, S - 1);
      }
    }
  }

  function drawSite(state, b, X, Y, S) {
    const def = B.BUILDINGS[b.type];
    const needed = def.cost.wood ?? 0;
    g.fillStyle = "rgba(122,90,50,0.25)";
    g.fillRect(X, Y, S, S);
    g.strokeStyle = "#caa96a";
    g.setLineDash([3, 2]);
    g.strokeRect(X + 0.5, Y + 0.5, S - 1, S - 1);
    g.setLineDash([]);
    // corner posts
    g.fillStyle = P.wood;
    g.fillRect(X + 1, Y + 1, 2, 2);
    g.fillRect(X + S - 3, Y + 1, 2, 2);
    g.fillRect(X + 1, Y + S - 3, 2, 2);
    g.fillRect(X + S - 3, Y + S - 3, 2, 2);
    if (b.delivered > 0) {
      g.fillStyle = P.wood;
      g.fillRect(X + S / 2 - 4, Y + S - 6, 8, 2);
      g.fillRect(X + S / 2 - 3, Y + S - 8, 6, 2);
    }
    const workPart = Math.min(1, b.workDone / b.workNeeded);
    if (workPart > 0) {
      g.fillStyle = "rgba(202,169,106,0.5)";
      g.fillRect(X + 2, Y + 2, (S - 4) * workPart, 3);
    }
  }

  function drawCamp(X, Y, S) {
    // Tent
    g.fillStyle = P.shadow;
    g.fillRect(X + 3, Y + S - 3, S - 8, 2);
    g.fillStyle = "#d9b56a";
    g.fillRect(X + 4, Y + 8, 14, 9);
    g.fillStyle = "#c9a254";
    g.fillRect(X + 4, Y + 8, 14, 3);
    g.fillStyle = "#8a5a34";
    g.fillRect(X + 9, Y + 12, 4, 5); // doorway
    // Banner pole
    g.fillStyle = "#6b6f76";
    g.fillRect(X + S - 5, Y + 2, 1, 12);
    g.fillStyle = "#5f9e5f";
    g.fillRect(X + S - 4, Y + 2, 3, 4);
    // Fire pit (glows at night - drawn in glow pass)
    g.fillStyle = P.rockLo;
    g.fillRect(X + 2, Y + S - 5, 8, 3);
    g.fillStyle = P.fire;
    const flick = 1 + Math.sin(view.time * 0.02) * 0.3;
    g.fillRect(X + 4, Y + S - 4, 3, 1);
    g.fillRect(X + 5, Y + S - 5 - (flick > 1.1 ? 1 : 0), 1, 1);
  }

  function drawHome(X, Y, S) {
    g.fillStyle = P.shadow;
    g.fillRect(X + 2, Y + S - 3, S - 4, 2);
    g.fillStyle = P.plaster;
    g.fillRect(X + 3, Y + 9, S - 6, 7);
    g.fillStyle = P.wood;
    g.fillRect(X + 3, Y + 14, S - 6, 2);
    g.fillStyle = P.roof;
    g.fillRect(X + 1, Y + 4, S - 2, 5);
    g.fillStyle = P.roofHi;
    g.fillRect(X + 1, Y + 4, S - 2, 2);
    g.fillStyle = "#8f4030";
    g.fillRect(X + 1, Y + 8, S - 2, 1);
    g.fillStyle = "#5f4025";
    g.fillRect(X + 7, Y + 11, 4, 5); // door
    g.fillStyle = "#ffd97a";
    g.fillRect(X + 12, Y + 11, 2, 2); // window
  }

  function drawFarm(X, Y, S) {
    g.fillStyle = P.soil;
    g.fillRect(X + 1, Y + 1, S - 2, S - 2);
    g.fillStyle = P.soilRow;
    for (let r = 3; r < S - 2; r += 4) g.fillRect(X + 1, Y + r, S - 2, 2);
    g.fillStyle = P.crop;
    for (let r = 2; r < S - 3; r += 4)
      for (let cx = 3; cx < S - 2; cx += 5) g.fillRect(X + cx, Y + r, 2, 2);
    // tool rack
    g.fillStyle = P.wood;
    g.fillRect(X + 1, Y + 1, S - 2, 2);
  }

  function drawWell(X, Y, S) {
    g.fillStyle = P.shadow;
    g.fillRect(X + 2, Y + S - 3, S - 4, 1);
    g.fillStyle = P.stone;
    g.fillRect(X + 3, Y + 8, 10, 6);
    g.fillStyle = "#20262e";
    g.fillRect(X + 5, Y + 9, 6, 3); // water
    g.fillStyle = P.wood;
    g.fillRect(X + 3, Y + 2, 1, 7);
    g.fillRect(X + 12, Y + 2, 1, 7);
    g.fillStyle = P.roof;
    g.fillRect(X + 2, Y + 1, 12, 2);
    g.fillStyle = P.wood;
    g.fillRect(X + 7, Y + 4, 2, 3); // rope+bucket
  }

  function drawSawpit(X, Y, S) {
    g.fillStyle = P.shadow;
    g.fillRect(X + 2, Y + S - 3, S - 4, 2);
    g.fillStyle = P.wood;
    g.fillRect(X + 2, Y + 5, S - 4, 11);
    g.fillStyle = P.woodHi;
    g.fillRect(X + 2, Y + 5, S - 4, 2);
    g.fillStyle = "#6f4526";
    for (let r = 8; r < 16; r += 3) g.fillRect(X + 2, Y + r, S - 4, 1);
    g.fillStyle = P.roof;
    g.fillRect(X + 1, Y + 2, S - 2, 3);
    // log pile
    g.fillStyle = P.trunk;
    g.fillRect(X + S - 6, Y + S - 4, 5, 2);
    g.fillRect(X + S - 5, Y + S - 6, 5, 2);
    // saw blade leaning
    g.fillStyle = "#b8bfc6";
    g.fillRect(X + 3, Y + S - 7, 1, 5);
  }

  function drawStorehouse(X, Y, S) {
    g.fillStyle = P.shadow;
    g.fillRect(X + 2, Y + S - 3, S - 4, 2);
    g.fillStyle = P.stone;
    g.fillRect(X + 2, Y + 12, S - 4, 4);
    g.fillStyle = P.plank;
    g.fillRect(X + 2, Y + 6, S - 4, 6);
    g.fillStyle = "#a8813f";
    g.fillRect(X + 2, Y + 9, S - 4, 1);
    g.fillStyle = P.roof;
    g.fillRect(X + 1, Y + 3, S - 2, 3);
    g.fillStyle = P.wood;
    g.fillRect(X + 4, Y + 11, 4, 3); // crate
    g.fillRect(X + 10, Y + 12, 3, 2);
  }

  // ---- M2 structures: original art, RtR ratios.
  function drawFence(X, Y, S) {
    g.fillStyle = P.shadow;
    g.fillRect(X + 2, Y + 13, 12, 1);
    g.fillStyle = P.wood;
    g.fillRect(X + 2, Y + 4, 3, 10); // posts
    g.fillRect(X + 11, Y + 4, 3, 10);
    g.fillStyle = P.woodHi;
    g.fillRect(X + 2, Y + 4, 3, 2);
    g.fillRect(X + 11, Y + 4, 3, 2);
    g.fillStyle = "#6f4526";
    g.fillRect(X + 2, Y + 7, 12, 2); // rails
    g.fillRect(X + 2, Y + 11, 12, 1);
  }

  function drawStoneWall(X, Y, S) {
    g.fillStyle = P.shadow;
    g.fillRect(X + 1, Y + 14, 14, 1);
    g.fillStyle = P.rock;
    g.fillRect(X + 1, Y + 3, 14, 12);
    g.fillStyle = P.rockHi;
    g.fillRect(X + 1, Y + 3, 14, 2);
    g.fillStyle = P.rockLo;
    g.fillRect(X + 1, Y + 8, 6, 1); // mortar lines
    g.fillRect(X + 8, Y + 12, 7, 1);
    g.fillRect(X + 8, Y + 5, 1, 3);
    g.fillRect(X + 4, Y + 9, 1, 3);
  }

  function drawGate(X, Y, S) {
    g.fillStyle = P.shadow;
    g.fillRect(X + 1, Y + 14, 14, 1);
    g.fillStyle = P.wood;
    g.fillRect(X + 1, Y + 2, 4, 13); // doorframe posts
    g.fillRect(X + 11, Y + 2, 4, 13);
    g.fillStyle = P.woodHi;
    g.fillRect(X + 1, Y + 2, 4, 2);
    g.fillRect(X + 11, Y + 2, 4, 2);
    g.fillStyle = "#5f9e5f"; // friendly lintel: open for villagers
    g.fillRect(X + 5, Y + 2, 6, 2);
    g.fillStyle = P.plank;
    g.fillRect(X + 5, Y + 10, 6, 5); // half-lowered portcullis look
  }

  function drawTower(X, Y, S) {
    g.fillStyle = P.shadow;
    g.fillRect(X + 1, Y + 14, 14, 2);
    g.fillStyle = P.rockLo;
    g.fillRect(X + 3, Y + 6, 10, 9); // stone base
    g.fillStyle = P.rock;
    g.fillRect(X + 3, Y + 6, 10, 2);
    g.fillStyle = P.wood;
    g.fillRect(X + 2, Y + 1, 12, 6); // wooden top
    g.fillStyle = P.woodHi;
    g.fillRect(X + 2, Y + 1, 12, 2);
    g.fillStyle = "#20262e";
    g.fillRect(X + 7, Y + 3, 2, 3); // arrow slit
    g.fillStyle = "#6f4526";
    g.fillRect(X + 3, Y + 12, 10, 1);
  }

  function drawQuarry(X, Y, S) {
    g.fillStyle = "#8d8d84";
    g.fillRect(X + 1, Y + 1, S - 2, S - 2); // cut pit floor
    g.fillStyle = "#9d9d92";
    g.fillRect(X + 3, Y + 3, S - 7, S - 7);
    g.fillStyle = P.rockLo;
    g.fillRect(X + 2, Y + S - 5, S - 4, 3); // rubble rim
    g.fillStyle = P.rock;
    g.fillRect(X + S - 7, Y + S - 7, 4, 4); // stone pile
    g.fillRect(X + S - 9, Y + S - 5, 3, 3);
    g.fillStyle = P.wood;
    g.fillRect(X + 2, Y + 2, 2, 10); // hoist frame
    g.fillRect(X + 2, Y + 2, 8, 2);
  }

  function drawNest(X, Y, S) {
    const pulse = Math.sin(view.time * 0.004) * 0.5 + 0.5;
    g.fillStyle = P.shadow;
    g.fillRect(X + 1, Y + 13, 14, 2);
    g.fillStyle = P.nest;
    g.fillRect(X + 2, Y + 4, 12, 10);
    g.fillRect(X + 4, Y + 2, 8, 3);
    g.fillStyle = P.nestHi;
    g.fillRect(X + 4, Y + 3, 3, 2); // pustules
    g.fillRect(X + 10, Y + 6, 2, 2);
    g.fillStyle = P.nestMaw;
    g.fillRect(X + 5, Y + 8, 6, 5); // the maw monsters pour from
    g.fillRect(X + 6, Y + 7, 4, 1);
    if (pulse > 0.6) {
      g.fillStyle = "rgba(154,124,192,0.5)";
      g.fillRect(X + 6, Y + 9, 4, 2); // inner glow when about to spawn
    }
  }

  function drawCorpses(state) {
    for (const c of state.corpses) {
      const X = px(c.x) - 2,
        Y = px(c.y) - 2;
      g.globalAlpha = Math.max(0.25, Math.min(1, (c.decay - state.clock.tick) / B.CORPSE_DECAY_TICKS));
      g.fillStyle = "#c9c2b8";
      g.fillRect(X + 4, Y + 8, 2, 4);
      g.fillRect(X + 2, Y + 6, 6, 2);
      g.globalAlpha = 1;
    }
  }

  function drawRangeCircle(state) {
    if (!view.buildMode) return;
    const camp = state.buildings.find((b) => b.type === "camp");
    if (!camp) return;
    const c = { x: camp.x + 1, y: camp.y + 1 };
    g.strokeStyle = "rgba(255,224,138,0.5)";
    g.setLineDash([4, 3]);
    g.beginPath();
    g.arc(px(c.x), px(c.y), B.BUILDINGS.camp.radius * B.TILE, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  }

  function drawNomads(state) {
    for (const n of state.nomads) {
      const X = px(n.x),
        Y = px(n.y);
      g.fillStyle = P.shadow;
      g.fillRect(X - 3, Y + 4, 6, 1);
      g.fillStyle = "#5a8dd6";
      g.fillRect(X - 2, Y - 1, 4, 5);
      g.fillStyle = P.skin;
      g.fillRect(X - 1, Y - 3, 2, 2);
    }
  }

  // Monsters shamble with a 2-frame bob keyed to time + id.
  function drawMonsters(state) {
    for (const m of state.monsters) {
      const X = px(m.x),
        Y = px(m.y);
      const bob = Math.floor(view.time / 220 + m.id) % 2;
      const s = m.kind === "blotling" ? 0.6 : m.kind === "blot" ? 1.15 : 1;
      g.fillStyle = P.shadow;
      g.fillRect(X - 3 * s, Y + 4 * s, 6 * s, 1);
      if (m.kind === "blot" || m.kind === "blotling") {
        // Blob: jiggly dome with a darker core.
        const j = bob ? 1 : 0;
        g.fillStyle = P.blot;
        g.fillRect(X - 4 * s, Y - 3 * s + j, 8 * s, 7 * s - j);
        g.fillRect(X - 2 * s, Y - 5 * s + j, 4 * s, 2 * s);
        g.fillStyle = P.blotHi;
        g.fillRect(X - 2 * s, Y - 4 * s + j, 3 * s, 2 * s);
        g.fillStyle = "#2a1d3a";
        g.fillRect(X - 2 * s, Y - 1 * s + j, 1, 1);
        g.fillRect(X + 1 * s, Y - 1 * s + j, 1, 1);
      } else {
        // Husk: hunched husk of a villager, arms dangling.
        g.fillStyle = P.husk;
        g.fillRect(X - 2 * s, Y - 1 * s - bob, 4 * s, 5 * s);
        g.fillStyle = P.huskHi;
        g.fillRect(X - 2 * s, Y - 3 * s - bob, 4 * s, 2 * s);
        g.fillStyle = "#2a3322";
        g.fillRect(X - 1 * s, Y - 3 * s - bob, 1, 1);
        g.fillRect(X + 1 * s, Y - 3 * s - bob, 1, 1);
        g.fillStyle = P.husk;
        g.fillRect(X - 3 * s, Y - (bob ? 0 : 1) * s, 1, 3 * s); // arms
        g.fillRect(X + 2 * s, Y - (bob ? 0 : 1) * s, 1, 3 * s);
      }
    }
  }

  function drawProjectiles(state) {
    for (const p of state.projectiles) {
      const t = Math.max(0, Math.min(1, p.t / p.dur));
      const x = p.x + (p.tx - p.x) * t,
        y = p.y + (p.ty - p.y) * t;
      g.fillStyle = P.bolt;
      g.fillRect(px(x) - 1, px(y) - 1, 2, 2);
    }
  }

  function drawVillagers(state) {
    for (const v of state.villagers) {
      const X = px(v.x),
        Y = px(v.y);
      const child = v.age === "child";
      const s = child ? 0.7 : 1;
      const sleeping = v.task && v.task.kind === "sleep";
      g.fillStyle = P.shadow;
      g.fillRect(X - 3 * s, Y + 4 * s, 6 * s, 1);
      if (sleeping) {
        g.fillStyle = v.job ? B.JOBS[v.job].color : "#7f8a99";
        g.fillRect(X - 3 * s, Y + 1, 6 * s, 2);
        g.fillStyle = P.skin;
        g.fillRect(X + (v.facing > 0 ? 2 * s : -2 * s - 2), Y, 2, 2);
      } else {
        g.fillStyle = v.job ? B.JOBS[v.job].color : "#7f8a99";
        g.fillRect(X - 2 * s, Y - 1 * s, 4 * s, 5 * s);
        g.fillStyle = P.skin;
        g.fillRect(X - 1.5 * s, Y - 3.5 * s, 3 * s, 3 * s);
        g.fillStyle = "#5c4326";
        g.fillRect(X - 1.5 * s, Y - 3.5 * s, 3 * s, 1); // hair
      }
      if (v.carrying) {
        g.fillStyle =
          v.carrying === "wood" ? P.wood : v.carrying === "stone" ? P.rock : P.crop;
        g.fillRect(X - 1, Y - 6 * s, 2, 2);
      }
      // Status bubbles (the RtR thought-bubble layer).
      if (v.bubble === "chat") drawBubble(X, Y - 9 * s, "…");
      else if (sleeping && !v.home) drawBubble(X, Y - 9 * s, "z", "#9db7e8");
      else if (v.hunger < 12) drawBubble(X, Y - 9 * s, "!", "#e26d5a");
      else if (v.thirst < 12) drawBubble(X, Y - 9 * s, "!", "#5a9bd6");
    }
  }

  function drawBubble(X, Y, char, color = "#f4efe2") {
    g.fillStyle = color;
    g.fillRect(X - 3, Y - 3, 6, 5);
    g.fillRect(X - 1, Y + 2, 2, 1);
    g.fillStyle = "#3a3f45";
    g.font = "6px monospace";
    g.textAlign = "center";
    g.fillText(char, X, Y + 1.5);
    g.textAlign = "start";
  }

  function drawGhost(state) {
    if (!view.ghost) return;
    const { type, x, y, valid } = view.ghost;
    const def = B.BUILDINGS[type];
    const S = def.size * B.TILE;
    g.globalAlpha = 0.55;
    for (let dy = 0; dy < def.size; dy++)
      for (let dx = 0; dx < def.size; dx++) {
        g.fillStyle = valid ? "rgba(126,196,102,0.4)" : "rgba(226,109,90,0.4)";
        g.fillRect(px(x + dx), px(y + dy), B.TILE, B.TILE);
      }
    if (type === "home") drawHome(px(x), px(y), S);
    else if (type === "farm") drawFarm(px(x), px(y), S);
    else if (type === "well") drawWell(px(x), px(y), S);
    else if (type === "sawpit") drawSawpit(px(x), px(y), S);
    else if (type === "storehouse") drawStorehouse(px(x), px(y), S);
    else if (type === "camp") drawCamp(px(x), px(y), S);
    else if (type === "fence") drawFence(px(x), px(y), S);
    else if (type === "stoneWall") drawStoneWall(px(x), px(y), S);
    else if (type === "gate") drawGate(px(x), px(y), S);
    else if (type === "tower") drawTower(px(x), px(y), S);
    else if (type === "quarry") drawQuarry(px(x), px(y), S);
    if (valid && B.BUILDINGS[type].tower) {
      // Sentry coverage preview: the whole point of a tower is its circle.
      g.strokeStyle = "rgba(255,217,122,0.55)";
      g.setLineDash([3, 3]);
      g.beginPath();
      g.arc(px(x) + B.TILE / 2, px(y) + B.TILE / 2, B.BUILDINGS[type].tower.range * B.TILE, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
    g.globalAlpha = 1;
    g.strokeStyle = valid ? "#7ec466" : "#e26d5a";
    g.strokeRect(px(x) + 0.5, px(y) + 0.5, S - 1, S - 1);
  }

  // Painted wall run preview: green where it will land.
  function drawPaint(state) {
    if (!view.paint || !view.paint.tiles.size) return;
    const draw = { fence: drawFence, stoneWall: drawStoneWall, gate: drawGate }[view.paint.type];
    g.globalAlpha = 0.75;
    for (const key of view.paint.tiles) {
      const [x, y] = key.split(",").map(Number);
      g.fillStyle = "rgba(126,196,102,0.3)";
      g.fillRect(px(x), px(y), B.TILE, B.TILE);
      draw(px(x), px(y), B.TILE);
    }
    g.globalAlpha = 1;
  }

  function drawNight(state) {
    const dl = state.daylight ?? 1;
    if (dl >= 0.99) return;
    // Screen-space grade first...
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = `rgba(11,18,51,${(1 - dl) * 0.55})`;
    g.fillRect(0, 0, canvas.width, canvas.height);
    const { camera } = view;
    const z = camera.zoom;
    g.setTransform(z, 0, 0, z, canvas.width / 2 - camera.x * B.TILE * z, canvas.height / 2 - camera.y * B.TILE * z);
    // ...then warm glows: camp fire + windows.
    g.globalCompositeOperation = "lighter";
    const camp = state.buildings.find((b) => b.type === "camp");
    if (camp) {
      const flick = 0.8 + Math.sin(view.time * 0.02) * 0.12;
      const r = 3.2 * B.TILE * flick;
      const grad = g.createRadialGradient(px(camp.x + 1), px(camp.y + 1.5), 2, px(camp.x + 1), px(camp.y + 1.5), r);
      grad.addColorStop(0, `rgba(255,180,84,${0.28 * (1 - dl)})`);
      grad.addColorStop(1, "rgba(255,180,84,0)");
      g.fillStyle = grad;
      g.fillRect(px(camp.x + 1) - r, px(camp.y + 1.5) - r, r * 2, r * 2);
    }
    for (const b of state.buildings) {
      if (b.type !== "home" || !b.complete) continue;
      g.fillStyle = `rgba(255,217,122,${0.35 * (1 - dl)})`;
      g.fillRect(px(b.x) + 12, px(b.y) + 11, 2, 2);
    }
    g.globalCompositeOperation = "source-over";
  }

  function drawSelection(state) {
    if (!view.selected || view.selected.kind !== "villager") return;
    const v = state.villagers.find((v2) => v2.id === view.selected.id);
    if (!v) return;
    g.strokeStyle = "#ffe08a";
    g.beginPath();
    g.ellipse(px(v.x), px(v.y) + 4, 6, 2.5, 0, 0, Math.PI * 2);
    g.stroke();
  }

  return { view, draw };
}

// Screen point -> tile coords (accounts for the ghost lift offset).
export function screenToTile(canvas, camera, clientX, clientY, liftPx = 0) {
  const rect = canvas.getBoundingClientRect();
  const sx = ((clientX - rect.left) / rect.width) * canvas.width;
  const sy = ((clientY - rect.top) / rect.height) * canvas.height - liftPx;
  const z = camera.zoom;
  const wx = (sx - canvas.width / 2) / z / B.TILE + camera.x;
  const wy = (sy - canvas.height / 2) / z / B.TILE + camera.y;
  return { x: Math.floor(wx), y: Math.floor(wy), wx, wy };
}

export function tileToScreen(canvas, camera, wx, wy) {
  const rect = canvas.getBoundingClientRect();
  const z = camera.zoom;
  const sx = (wx * B.TILE - camera.x * B.TILE) * z + canvas.width / 2;
  const sy = (wy * B.TILE - camera.y * B.TILE) * z + canvas.height / 2;
  return {
    x: rect.left + (sx / canvas.width) * rect.width,
    y: rect.top + (sy / canvas.height) * rect.height,
  };
}
