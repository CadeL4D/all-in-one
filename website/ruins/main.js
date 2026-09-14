// Bootstrap: fixed-timestep loop, touch/mouse/keyboard input, and the
// command bridge between the UI and the sim. One-finger drag pans; pinch
// zooms; build tools are modal so pan never fights placement (doc 05 B2).
import * as B from "./balance.js";
import { createGame, stepGame, placeBuilding, placeWallRun, setJobDesired, upgradeCamp as upgradeCampCmd } from "./game.js";
import { daylight, phaseInfo } from "./clock.js";
import { createRenderer, screenToTile } from "./render.js";
import * as bd from "./buildings.js";
import { castSpell, grabAt, moveHeld, releaseHeld } from "./spells.js";
import { createUI } from "./ui.js";
import { saveToLocal, loadFromLocal, clearSave, loadWrapper, saveTravel, SAVE_KEY } from "./save.js";
import { addXp, saveMeta, pickPerk } from "./meta.js";
import { moonDaylight } from "./moons.js";
import { foundRegion as foundRegionCmd, migrateTo as migrateToCmd } from "./regions.js";
import { pwa } from "./pwa.js";

const canvas = document.getElementById("world");

// ---- Boot: restore a world, or pick how wild a fresh one should be ----
// A pending "ruins-new-run" flag (set by the mode dialog) seeds the mode;
// without a save or a flag, the mode dialog greets the player first and
// the sim stays paused until they've chosen.
let pendingRun = null;
try {
  pendingRun = JSON.parse(localStorage.getItem("ruins-new-run"));
} catch {
  pendingRun = null;
}
const restored = loadFromLocal();
const freshBoot = !restored && !pendingRun;
const state =
  restored ??
  createGame(undefined, pendingRun ? { modeKey: pendingRun.mode, custom: pendingRun.custom } : {});
if (pendingRun) {
  try {
    localStorage.removeItem("ruins-new-run");
  } catch {
    /* private mode */
  }
}
state.daylight = daylight(state.clock);

let speed = freshBoot ? 0 : 2;
const renderer = createRenderer(canvas, state);
const camera = renderer.view.camera;
try {
  const savedCam = JSON.parse(localStorage.getItem("ruins-camera"));
  if (savedCam) Object.assign(camera, savedCam);
} catch {
  /* fresh camera */
}

function persistCamera() {
  try {
    localStorage.setItem("ruins-camera", JSON.stringify(camera));
  } catch {
    /* private mode */
  }
}

// ---- Command bridge (ui.js talks to this) ----
let confirmHandler = null;
// World swaps (travel, restart, mode start) reload the page; the unload
// autosave must not clobber the blob they just wrote with the OLD world.
let worldSwap = false;
const game = {
  getState: () => state,
  renderer,
  enterPlacement() {
    renderer.view.buildMode = true;
    renderer.view.ghost = null;
    renderer.view.paint = null;
    document.getElementById("hint").hidden = true; // never cover the ghost UI
  },
  enterDismantle() {
    ui.mode = "dismantle";
    toastNote("Tap a building to dismantle it");
  },
  exitModes() {
    renderer.view.buildMode = false;
    renderer.view.ghost = null;
    renderer.view.paint = null;
    ui.placing = null;
    ui.mode = "look";
    ui.setDock("look");
    document.getElementById("placement").hidden = true;
    // Casting: disarm, and set down anything the hand was carrying so a
    // mode switch never leaves a villager dangling forever.
    ui.closeGod();
    if (state.god.held) releaseHeld(state, 0, 0);
  },
  armSpell(key) {
    ui.armSpell(key);
  },
  disarmSpell() {
    ui.disarmSpell();
  },
  confirmPlacement() {
    if (!ui.placing) return;
    const def = B.BUILDINGS[ui.placing.type];
    if (def.wall) {
      // Drag-paint run: commit every painted section that fits. The run is
      // stored as "x,y" keys - parse them back into tile pairs.
      if (!ui.placing.run?.size) return;
      const tiles = [...ui.placing.run].map((key) => key.split(",").map(Number));
      placeWallRun(state, ui.placing.type, tiles);
      // Stay armed for the next painted run.
      renderer.view.ghost = null;
      ui.placing = { type: ui.placing.type, x: null, y: null, valid: false, run: new Set() };
      ui.updatePlacement(state);
      return;
    }
    if (!ui.placing.valid) return;
    placeBuilding(state, ui.placing.type, ui.placing.x, ui.placing.y);
    // Stay armed for quick multi-building (drag-place feel).
    renderer.view.ghost = null;
    ui.placing = { type: ui.placing.type, x: null, y: null, valid: false, run: null };
    ui.updatePlacement(state);
  },
  setJob(job, delta) {
    setJobDesired(state, job, delta);
    ui.slow(state);
  },
  dismantle(id) {
    bd.dismantle(state, id);
    ui.slow(state);
  },
  upgradeCamp() {
    const result = upgradeCampCmd(state);
    if (!result.ok && result.reason) toastNote(result.reason);
    ui.slow(state);
  },
  confirm(title, body, onYes) {
    const dlg = document.getElementById("confirm-dialog");
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-body").textContent = body;
    confirmHandler = onYes;
    dlg.showModal();
  },
  flyTo(x, y) {
    flyTarget = { x, y };
  },
  getWrapper() {
    return loadWrapper();
  },
  // Region travel: stash the live sim, make the target active, reload.
  // Loading hydrates (or first-generates) the new region.
  travel(id) {
    const next = saveTravel(loadWrapper(), state, id);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch {
      /* private mode: travel unavailable */
      return;
    }
    saveMeta(state.meta);
    worldSwap = true;
    location.reload();
  },
  saveNow(flash) {
    saveMeta(state.meta);
    if (saveToLocal(state) && flash) toastNote("Saved");
  },
  restart() {
    worldSwap = true;
    clearSave();
    location.reload(); // fresh boot reopens the mode picker
  },
};

document.getElementById("confirm-yes").onclick = () => {
  document.getElementById("confirm-dialog").close();
  if (confirmHandler) confirmHandler();
  confirmHandler = null;
};
document.getElementById("confirm-no").onclick = () => {
  document.getElementById("confirm-dialog").close();
  confirmHandler = null;
};

function toastNote(text) {
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span><b>${text}</b></span>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

const ui = createUI(game);

// ---- Mode picker (fresh boots only): how wild should the wilds be? ----
if (freshBoot) {
  const dlg = document.getElementById("mode-dialog");
  const cards = document.getElementById("mode-cards");
  const tuners = document.getElementById("custom-tuners");
  let selected = "traditional";
  let custom = { peaceful: false, pace: "normal", raidSize: 1 };
  for (const [key, mode] of Object.entries(B.MODES)) {
    const card = document.createElement("button");
    card.className = `mode-card${key === selected ? " selected" : ""}`;
    card.dataset.mode = key;
    card.innerHTML = `<b>${mode.name}</b><small>${mode.blurb}</small>`;
    card.onclick = () => {
      selected = key;
      cards.querySelectorAll(".mode-card").forEach((c) => c.classList.toggle("selected", c.dataset.mode === key));
      tuners.hidden = key !== "custom";
    };
    cards.appendChild(card);
  }
  for (const box of tuners.querySelectorAll(".tuner-options")) {
    box.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        box.querySelectorAll("button").forEach((b2) => b2.classList.toggle("active", b2 === btn));
        if (box.id === "tuner-peaceful") custom.peaceful = btn.dataset.v === "off";
        if (box.id === "tuner-pace") custom.pace = btn.dataset.v;
        if (box.id === "tuner-raids") custom.raidSize = Number(btn.dataset.v);
      };
    });
  }
  document.getElementById("mode-start").onclick = () => {
    // Custom folds the tuners into mode knobs the sim reads directly.
    const overrides =
      selected === "custom"
        ? {
            peaceful: custom.peaceful,
            corruptionDay: custom.peaceful ? Infinity : custom.pace === "early" ? 1 : 2,
            raidStartDay: custom.peaceful ? Infinity : custom.pace === "early" ? 2 : custom.pace === "late" ? 4 : 3,
            arrivalMult: custom.pace === "early" ? 0.8 : custom.pace === "late" ? 1.25 : 1,
            raidMult: custom.raidSize,
          }
        : {};
    try {
      localStorage.setItem("ruins-new-run", JSON.stringify({ mode: selected, custom: overrides }));
    } catch {
      /* private mode: falls back to traditional on reload */
    }
    clearSave();
    worldSwap = true;
    location.reload();
  };
  document.getElementById("mode-close").onclick = () => {
    dlg.close();
    setSpeed(2); // dismissed: settle the default Traditional wilds
  };
  dlg.showModal();
}

// ---- Speed cluster ----
document.getElementById("pause").onclick = () => setSpeed(speed === 0 ? 2 : 0);
document.querySelectorAll(".speed button[data-speed]").forEach((btn) => {
  btn.onclick = () => setSpeed(Number(btn.dataset.speed));
});
function setSpeed(s) {
  speed = s;
  ui.frame(state, phaseInfo(state.clock), speed);
}

// ---- Zoom controls ----
const centerX = () => canvas.width / 2;
const centerY = () => canvas.height / 2;
document.getElementById("zoom-in").onclick = () => zoomAt(centerX(), centerY(), 1.25);
document.getElementById("zoom-out").onclick = () => zoomAt(centerX(), centerY(), 0.8);
document.getElementById("center").onclick = () => {
  flyTarget = { x: B.CAMP_TILE.x + 1, y: B.CAMP_TILE.y + 1 };
};

function zoomAt(px, py, factor) {
  const oldZ = camera.zoom;
  const z = Math.min(B.MAX_ZOOM, Math.max(B.MIN_ZOOM, oldZ * factor));
  if (z === oldZ) return;
  const wx = (px - canvas.width / 2) / oldZ / B.TILE + camera.x;
  const wy = (py - canvas.height / 2) / oldZ / B.TILE + camera.y;
  camera.zoom = z;
  camera.x = wx - (px - canvas.width / 2) / z / B.TILE;
  camera.y = wy - (py - canvas.height / 2) / z / B.TILE;
  clampCamera();
}

function clampCamera() {
  camera.x = Math.max(2, Math.min(state.world.size - 2, camera.x));
  camera.y = Math.max(2, Math.min(state.world.size - 2, camera.y));
}

// ---- Wall drag-paint: continuous line from the last touched tile. Each
// stroke defines the whole run (a new stroke starts fresh), so painting is
// additive within the stroke - dragging back over it never erases.
function paintWallTile(x, y) {
  const placing = ui.placing;
  if (!placing || !B.BUILDINGS[placing.type].wall) return;
  if (!placing.run) placing.run = new Set();
  const type = placing.type;
  const size = state.world.size;
  const line = [];
  if (placing.lastPainted) {
    const [lx, ly] = placing.lastPainted;
    const steps = Math.max(Math.abs(x - lx), Math.abs(y - ly));
    for (let s = 1; s <= steps; s++)
      line.push([
        Math.round(lx + ((x - lx) * s) / steps),
        Math.round(ly + ((y - ly) * s) / steps),
      ]);
  }
  line.push([x, y]);
  for (const [tx, ty] of line) {
    if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;
    const key = `${tx},${ty}`;
    if (placing.run.has(key)) continue;
    if (!canPlaceQuick(tx, ty, type, placing.run)) continue;
    placing.run.add(key);
    placing.lastPainted = [tx, ty];
  }
  renderer.view.paint = { type: placing.type, tiles: placing.run };
  ui.updatePlacement(state);
}

// Ghost/paint validity uses the authoritative rule so the preview can never
// disagree with confirm (including the wall-chain build range). Wall runs
// may anchor to their own earlier tiles - one stroke, one territory push.
function canPlaceQuick(x, y, type, runKeys) {
  if (runKeys) return bd.canPlaceInRun(state, type, x, y, runKeys).ok;
  return bd.canPlace(state, type, x, y).ok;
}

// ---- Pointer input: pan / pinch / tap / ghost drag / god hand ----
const pointers = new Map();
let pinchStart = null;
let moved = false;
// Recent carried-creature positions (world coords + time) for the fling.
let grabPoints = [];

// Velocity of the last ~160 ms of carry, as a throw displacement in tiles.
// Slow release = a set-down; a hard fling throws up to ~7 tiles.
function throwVector() {
  const now = performance.now();
  const pts = grabPoints.filter((p) => now - p.t < 160);
  if (pts.length < 2) return { dx: 0, dy: 0, speed: 0 };
  const a = pts[0],
    b = pts[pts.length - 1];
  const dt = Math.max(16, b.t - a.t);
  const vx = ((b.wx - a.wx) / dt) * 1000;
  const vy = ((b.wy - a.wy) / dt) * 1000;
  const speed = Math.hypot(vx, vy);
  if (speed < B.GRAB_MIN_THROW_SPEED) return { dx: 0, dy: 0, speed: 0 };
  const capped = Math.min(speed, B.GRAB_MAX_THROW_SPEED);
  const scale = (0.45 * B.GRAB_MAX_THROW_SPEED) / capped;
  let dx = vx * scale,
    dy = vy * scale;
  const d = Math.hypot(dx, dy);
  if (d > 7) {
    dx *= 7 / d;
    dy *= 7 / d;
  }
  return { dx, dy, speed: capped };
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  moved = false;
  const tile = screenToTile(canvas, camera, e.clientX, e.clientY);
  if (ui.mode === "build" && ui.placing) {
    // A tap puts the ghost exactly where you touched (lifted above the
    // finger); dragging then nudges it. Walls paint a run instead.
    const lifted = screenToTile(canvas, camera, e.clientX, e.clientY, B.GHOST_LIFT_PX);
    if (B.BUILDINGS[ui.placing.type].wall) {
      ui.placing.run = new Set();
      paintWallTile(lifted.x, lifted.y);
    } else {
      ui.placing.x = lifted.x;
      ui.placing.y = lifted.y;
      renderer.view.ghost = {
        type: ui.placing.type,
        x: lifted.x,
        y: lifted.y,
        valid: canPlaceQuick(lifted.x, lifted.y, ui.placing.type),
      };
      ui.updatePlacement(state);
    }
  }
  if (ui.mode === "cast" && ui.castKey === "grab" && !state.god.held) {
    const grabbed = grabAt(state, tile.wx, tile.wy);
    if (grabbed.ok) {
      grabPoints = [{ wx: tile.wx, wy: tile.wy, t: performance.now() }];
      ui.slow(state);
    } else if (grabbed.reason) toastNote(grabbed.reason);
  }
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
  }
});
canvas.addEventListener("pointermove", (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const dx = e.clientX - prev.x,
    dy = e.clientY - prev.y;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;

  if (pointers.size === 2 && pinchStart) {
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const rect = canvas.getBoundingClientRect();
    const cx = ((a.x + b.x) / 2 - rect.left) * (canvas.width / rect.width);
    const cy = ((a.y + b.y) / 2 - rect.top) * (canvas.height / rect.height);
    zoomAt(cx, cy, dist / pinchStart.dist);
    pinchStart.dist = dist;
    return;
  }
  if (pointers.size !== 1) return;

  if (ui.mode === "cast" && ui.castKey) {
    const tile = screenToTile(canvas, camera, e.clientX, e.clientY);
    renderer.view.cast = { key: ui.castKey, x: tile.wx, y: tile.wy };
    if (state.god.held) {
      // The carried creature rides the finger; panning waits.
      moveHeld(state, tile.wx, tile.wy);
      grabPoints.push({ wx: tile.wx, wy: tile.wy, t: performance.now() });
      if (grabPoints.length > 8) grabPoints.shift();
      return;
    }
  }
  if (ui.mode === "build" && ui.placing) {
    // Ghost follows the finger, lifted above it so it's never occluded.
    // Walls instead paint a continuous run from the last tile touched.
    const tile = screenToTile(canvas, camera, e.clientX, e.clientY, B.GHOST_LIFT_PX);
    if (B.BUILDINGS[ui.placing.type].wall) {
      paintWallTile(tile.x, tile.y);
      return;
    }
    ui.placing.x = tile.x;
    ui.placing.y = tile.y;
    renderer.view.ghost = {
      type: ui.placing.type,
      x: tile.x,
      y: tile.y,
      valid: canPlaceQuick(tile.x, tile.y, ui.placing.type),
    };
    ui.updatePlacement(state);
    return;
  }
  if (
    (ui.mode === "look" || ui.mode === "dismantle" || (ui.mode === "cast" && !state.god.held))
  ) {
    const rect = canvas.getBoundingClientRect();
    camera.x -= (dx / rect.width) * (canvas.width / camera.zoom / B.TILE);
    camera.y -= (dy / rect.height) * (canvas.height / camera.zoom / B.TILE);
    clampCamera();
  }
});

canvas.addEventListener("pointerup", (e) => {
  const wasSingle = pointers.size === 1;
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = null;

  // Releasing a carried creature happens even after a drag - the drag IS
  // the throw. Slow releases become a set-down (throwVector says so).
  if (state.god.held) {
    const here = screenToTile(canvas, camera, e.clientX, e.clientY);
    grabPoints.push({ wx: here.wx, wy: here.wy, t: performance.now() });
    const v = throwVector();
    releaseHeld(state, v.dx, v.dy, v.speed);
    grabPoints = [];
    ui.slow(state);
    return;
  }

  if (!wasSingle || moved) return;

  // Tap (no drag): context action.
  const tile = screenToTile(canvas, camera, e.clientX, e.clientY);
  if (ui.mode === "build" && ui.placing) return; // ghost already followed
  if (ui.mode === "cast" && ui.castKey) {
    const result = castSpell(state, ui.castKey, tile.wx, tile.wy);
    if (!result.ok && result.reason) toastNote(result.reason);
    ui.slow(state);
    return;
  }
  if (ui.mode === "dismantle") {
    const id = tile.x >= 0 && tile.y >= 0 ? state.buildingAt[tile.y * state.world.size + tile.x] : -1;
    if (id >= 0) {
      const b = state.buildings.find((b2) => b2.id === id);
      if (b && b.type !== "camp") {
        game.confirm(
          `Dismantle the ${B.BUILDINGS[b.type].name}?`,
          "Villagers living or working here will move on.",
          () => game.dismantle(id),
        );
      }
    }
    return;
  }
  // Look mode: nearest villager within a thumb's radius, else the building.
  const wx = tile.wx,
    wy = tile.wy;
  let best = null,
    bestD = 1.1;
  for (const v of state.villagers) {
    const d = Math.hypot(v.x - wx, v.y - wy);
    if (d < bestD) {
      bestD = d;
      best = { kind: "villager", id: v.id };
    }
  }
  if (best) {
    ui.inspect(best);
    return;
  }
  const id = tile.x >= 0 && tile.y >= 0 ? state.buildingAt[tile.y * state.world.size + tile.x] : -1;
  if (id >= 0) ui.inspect({ kind: "building", id });
  else ui.closeInspector();
});
canvas.addEventListener("pointercancel", (e) => {
  pointers.delete(e.pointerId);
  pinchStart = null;
  // An interrupted gesture never strands a creature mid-air.
  if (state.god.held) {
    releaseHeld(state, 0, 0);
    grabPoints = [];
    ui.slow(state);
  }
});

// Mouse wheel zoom.
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomAt(
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height,
      e.deltaY < 0 ? 1.15 : 0.87,
    );
  },
  { passive: false },
);

// Keyboard (desktop convenience; touch is the primary scheme).
window.addEventListener("keydown", (e) => {
  const pan = 2 / camera.zoom;
  if (e.key === "ArrowLeft") camera.x -= pan;
  else if (e.key === "ArrowRight") camera.x += pan;
  else if (e.key === "ArrowUp") camera.y -= pan;
  else if (e.key === "ArrowDown") camera.y += pan;
  else if (e.key === "+" || e.key === "=") zoomAt(centerX(), centerY(), 1.2);
  else if (e.key === "-") zoomAt(centerX(), centerY(), 0.83);
  else if (e.key === " ") {
    e.preventDefault();
    setSpeed(speed === 0 ? 2 : 0);
  } else if (e.key === "1") setSpeed(1);
  else if (e.key === "2") setSpeed(2);
  else if (e.key === "3") setSpeed(3);
  else if (e.key === "Escape") game.exitModes();
  else return;
  clampCamera();
});

// ---- Resize ----
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
}
window.addEventListener("resize", resize);
resize();

// ---- Main loop: fixed 60 TPS sim, batched ticks per frame ----
let last = performance.now();
let accumulator = 0;
let slowTimer = 0;
let flyTarget = null;
const MAX_TICKS_PER_FRAME = 12; // battery guard against spiral-of-death

function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  renderer.view.time = now;

  accumulator += dt * speed * B.TICKS_PER_SECOND;
  const ticks = Math.min(MAX_TICKS_PER_FRAME, Math.floor(accumulator));
  accumulator -= ticks;
  if (ticks > 0) {
    stepGame(state, ticks);
    state.daylight = moonDaylight(state, daylight(state.clock));
    ui.frame(state, phaseInfo(state.clock), speed);
  }

  // Smooth fly-to for tap-to-fly toasts.
  if (flyTarget) {
    const dx = flyTarget.x - camera.x,
      dy = flyTarget.y - camera.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.3) flyTarget = null;
    else {
      camera.x += dx * Math.min(1, dt * 6);
      camera.y += dy * Math.min(1, dt * 6);
      clampCamera();
    }
  }

  renderer.draw(state);

  slowTimer += dt;
  if (slowTimer > 1) {
    slowTimer = 0;
    ui.slow(state);
    persistCamera();
  }
  requestAnimationFrame(frame);
}

// ---- Lifecycle: save on hide, catch up on return (doc 05 B3) ----
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (!worldSwap) {
      saveMeta(state.meta);
      saveToLocal(state);
    }
  } else {
    last = performance.now();
    accumulator = 0;
  }
});
window.addEventListener("pagehide", () => {
  if (worldSwap) return; // the swap wrote its own blob; keep it
  saveMeta(state.meta);
  saveToLocal(state);
});

ui.frame(state, phaseInfo(state.clock), speed);
ui.slow(state);
requestAnimationFrame(frame);

// Test hook: browser tests fast-forward the clock and inspect the sim.
window.__ruins = {
  state,
  camera,
  setSpeed: (s) => setSpeed(s),
  fastForward: (ticks) => {
    stepGame(state, ticks);
    state.daylight = moonDaylight(state, daylight(state.clock));
    ui.frame(state, phaseInfo(state.clock), speed);
  },
  // M3 god-hand hooks for browser verification.
  cast: (key, x, y) => castSpell(state, key, x, y),
  grab: (x, y) => grabAt(state, x, y),
  carryTo: (x, y) => moveHeld(state, x, y),
  fling: (dx, dy, speed) => releaseHeld(state, dx, dy, speed),
  influence: () => (state.god.influence = 9999),
  // M4 the-climb hook.
  upgradeCamp: () => upgradeCampCmd(state),
  // M5 hooks: moons, boons, regions, modes.
  forceMoon: (key) => {
    state.moon.lastSpecial = -99;
    if (key === "eclipse") {
      state.moon.eclipse = true;
      state.moon.day = null;
    } else {
      state.moon.day = key;
      state.moon.eclipse = null;
    }
  },
  moonInfo: () => ({ ...state.moon }),
  grantXp: (n) => {
    for (let i = 0; i < n; i++) addXp(state, "slain");
    saveMeta(state.meta);
  },
  pickPerk: (key) => pickPerk(state, key),
  openPanel: (id) => document.getElementById(id)?.click(),
  foundRegion: (id) => {
    const r = foundRegionCmd(state, id);
    if (r.ok) saveToLocal(state);
    return r;
  },
  migrate: (id, n) => {
    const r = migrateToCmd(state, id, n);
    if (r.ok) saveToLocal(state);
    return r;
  },
  travel: (id) => game.travel(id),
};

pwa();
