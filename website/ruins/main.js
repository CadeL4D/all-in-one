// Bootstrap: fixed-timestep loop, touch/mouse/keyboard input, and the
// command bridge between the UI and the sim. One-finger drag pans; pinch
// zooms; build tools are modal so pan never fights placement (doc 05 B2).
import * as B from "./balance.js";
import { createGame, stepGame, placeBuilding, setJobDesired } from "./game.js";
import { daylight, phaseInfo } from "./clock.js";
import { createRenderer, screenToTile } from "./render.js";
import { dismantle } from "./buildings.js";
import { createUI } from "./ui.js";
import { saveToLocal, loadFromLocal, clearSave } from "./save.js";
import { pwa } from "./pwa.js";

const canvas = document.getElementById("world");
const state = loadFromLocal() ?? createGame();
state.daylight = daylight(state.clock);

let speed = 2;
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
const game = {
  getState: () => state,
  renderer,
  enterPlacement() {
    renderer.view.buildMode = true;
    renderer.view.ghost = null;
    document.getElementById("hint").hidden = true; // never cover the ghost UI
  },
  enterDismantle() {
    ui.mode = "dismantle";
    toastNote("Tap a building to dismantle it");
  },
  exitModes() {
    renderer.view.buildMode = false;
    renderer.view.ghost = null;
    ui.placing = null;
    ui.mode = "look";
    ui.setDock("look");
    document.getElementById("placement").hidden = true;
  },
  confirmPlacement() {
    if (!ui.placing || !ui.placing.valid) return;
    placeBuilding(state, ui.placing.type, ui.placing.x, ui.placing.y);
    // Stay armed for quick multi-building (drag-place feel).
    renderer.view.ghost = null;
    ui.placing = { type: ui.placing.type, x: null, y: null, valid: false };
    ui.updatePlacement(state);
  },
  setJob(job, delta) {
    setJobDesired(state, job, delta);
    ui.slow(state);
  },
  dismantle(id) {
    dismantle(state, id);
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
  saveNow(flash) {
    if (saveToLocal(state) && flash) toastNote("Saved");
  },
  restart() {
    clearSave();
    location.reload();
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

// ---- Placement validity (cheap re-check used on every pointer move) ----
function canPlaceQuick(x, y, def) {
  if (x < 0 || y < 0) return false;
  if (x + def.size > state.world.size || y + def.size > state.world.size) return false;
  for (let dy = 0; dy < def.size; dy++)
    for (let dx = 0; dx < def.size; dx++) {
      const i = (y + dy) * state.world.size + x + dx;
      if (state.buildingAt[i] !== -1) return false;
      if (state.world.terrain[i] === 2) return false;
      const f = state.world.feature[i];
      if (f !== 0 && f !== 4) return false;
      if (state.world.plots.has(i)) return false;
    }
  const half = def.size / 2;
  const camp = state.buildings.find((b) => b.type === "camp");
  if (!camp) return false;
  return Math.hypot(x + half - (camp.x + 1), y + half - (camp.y + 1)) <= B.BUILDINGS.camp.radius;
}

// ---- Pointer input: pan / pinch / tap / ghost drag ----
const pointers = new Map();
let pinchStart = null;
let moved = false;

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  moved = false;
  if (ui.mode === "build" && ui.placing) {
    // A tap puts the ghost exactly where you touched (lifted above the
    // finger); dragging then nudges it.
    const tile = screenToTile(canvas, camera, e.clientX, e.clientY, B.GHOST_LIFT_PX);
    ui.placing.x = tile.x;
    ui.placing.y = tile.y;
    const def = B.BUILDINGS[ui.placing.type];
    renderer.view.ghost = {
      type: ui.placing.type,
      x: tile.x,
      y: tile.y,
      valid: canPlaceQuick(tile.x, tile.y, def),
    };
    ui.updatePlacement(state);
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

  if (ui.mode === "build" && ui.placing) {
    // Ghost follows the finger, lifted above it so it's never occluded.
    const tile = screenToTile(canvas, camera, e.clientX, e.clientY, B.GHOST_LIFT_PX);
    ui.placing.x = tile.x;
    ui.placing.y = tile.y;
    const def = B.BUILDINGS[ui.placing.type];
    renderer.view.ghost = {
      type: ui.placing.type,
      x: tile.x,
      y: tile.y,
      valid: canPlaceQuick(tile.x, tile.y, def),
    };
    ui.updatePlacement(state);
    return;
  }
  if (ui.mode === "look" || ui.mode === "dismantle") {
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
  if (!wasSingle || moved) return;

  // Tap (no drag): context action.
  const tile = screenToTile(canvas, camera, e.clientX, e.clientY);
  if (ui.mode === "build" && ui.placing) return; // ghost already followed
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
    state.daylight = daylight(state.clock);
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
  if (document.hidden) saveToLocal(state);
  else {
    last = performance.now();
    accumulator = 0;
  }
});
window.addEventListener("pagehide", () => saveToLocal(state));

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
    state.daylight = daylight(state.clock);
    ui.frame(state, phaseInfo(state.clock), speed);
  },
};

pwa();
