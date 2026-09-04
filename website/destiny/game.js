import {
  W,
  H,
  DAY,
  REGIONS,
  DEFS,
  createWorld,
  footprint,
  canPlace,
  place,
  remove,
  buildingAt,
  completed,
  beds,
  tick,
  serialize,
  restore,
  log,
} from "./world.js";
import { TILE, scene, island } from "./art.js";
const $ = (id) => document.getElementById(id),
  canvas = $("world"),
  ctx = canvas.getContext("2d"),
  KEY = "destiny-to-yours-v1";
let state = null,
  tool = "hearth",
  rotation = 0,
  speed = 1,
  paused = false,
  active = false,
  selected = null,
  hover = null,
  drag = null,
  moved = false,
  last = 0,
  uiTimer = 0,
  saveTimer = 0,
  audio = null,
  sound = false,
  noticeTimer;
const camera = { x: 0, y: 0, zoom: 1.6 };
let saved = null;
function readSave() {
  try {
    const raw = localStorage.getItem(KEY);
    saved = raw ? restore(raw) : null;
  } catch {
    saved = null;
    toast("The saved village could not be read. You can start a new island.");
  }
  $("resume").hidden = !saved;
}
function toast(message) {
  $("notice").textContent = message;
  $("notice").classList.add("show");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => $("notice").classList.remove("show"), 4200);
}
function beep(freq = 420) {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.14);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.15);
  } catch {}
}
function save(manual = false) {
  if (!state?.people.length) return;
  try {
    localStorage.setItem(KEY, serialize(state));
    saved = restore(serialize(state));
    $("resume").hidden = false;
    if (manual) toast("Village saved in this browser.");
  } catch {
    toast("Storage is unavailable or full. Keep this tab open to continue.");
  }
}
function enter(s) {
  state = s;
  active = true;
  paused = false;
  selected = null;
  $("island-screen").hidden = true;
  $("play").hidden = false;
  setTool(s.people.length ? "inspect" : "hearth");
  $("village-name").textContent = REGIONS[s.region].name;
  $("region-copy").textContent = REGIONS[s.region].text;
  $("map-label").textContent = REGIONS[s.region].tag;
  resize();
  center();
  update();
  if (!s.people.length) $("guide").showModal();
}
function center() {
  const b = state?.buildings.find((b) => b.type === "hearth");
  camera.x = canvas.width / 2 - (b ? b.x + 2 : 32) * TILE * camera.zoom;
  camera.y = canvas.height / 2 - (b ? b.y + 1 : 24) * TILE * camera.zoom;
}
function resize() {
  const box = canvas.getBoundingClientRect();
  if (box.width && box.height) {
    canvas.width = Math.round(box.width);
    canvas.height = Math.round(box.height);
    ctx.imageSmoothingEnabled = false;
  }
}
new ResizeObserver(() => {
  resize();
  if (active) center();
}).observe(canvas.parentElement);
function setTool(next) {
  tool = next;
  rotation = 0;
  document
    .querySelectorAll("[data-build]")
    .forEach((b) => b.classList.toggle("active", b.dataset.build === next));
  for (const id of ["harvest", "inspect", "demolish"])
    $(id).classList.toggle("active", id === next);
  $("tool-tip").textContent =
    DEFS[next]?.desc ||
    (next === "harvest"
      ? "Click a tree or rock to mark it. Click again to unmark. Workers need a route to its edge."
      : next === "demolish"
        ? "Click a building to remove it and recover half the materials."
        : "Click a building or citizen to inspect.");
}
for (const [type, d] of Object.entries(DEFS)) {
  const button = document.createElement("button");
  button.dataset.build = type;
  button.title = d.desc;
  button.innerHTML =
    '<span class="glyph">' +
    d.glyph +
    "</span><strong>" +
    d.name +
    "</strong><small>" +
    (d.wood ? d.wood + " wood " : "") +
    (d.stone
      ? d.stone + " stone"
      : type === "hearth"
        ? "Found your village"
        : "") +
    "</small>";
  button.onclick = () => setTool(type);
  $("buildings").append(button);
}
for (const id of ["harvest", "inspect", "demolish"])
  $(id).onclick = () => setTool(id);
$("rotate").onclick = () => {
  rotation = (rotation + 1) % 4;
  beep(320);
};
function tileFrom(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: Math.floor((e.clientX - r.left - camera.x) / camera.zoom / TILE),
    y: Math.floor((e.clientY - r.top - camera.y) / camera.zoom / TILE),
  };
}
function action(pos) {
  if (!state || !pos || pos.x < 0 || pos.y < 0 || pos.x >= W || pos.y >= H)
    return;
  const { x, y } = pos;
  if (DEFS[tool]) {
    const reason = place(state, tool, x, y, rotation);
    if (reason) toast(reason);
    else {
      beep(580);
      if (tool === "hearth") setTool("inspect");
    }
  } else if (tool === "harvest") {
    const index = y * W + x;
    if (![3, 4].includes(state.tiles[index]))
      toast("Choose a tree or a stone deposit.");
    else {
      state.marks = state.marks.includes(index)
        ? state.marks.filter((i) => i !== index)
        : [...state.marks, index];
      beep(370);
    }
  } else if (tool === "demolish") {
    const b = buildingAt(state, x, y);
    if (b) {
      if (b.type === "hearth") toast(remove(state, b));
      else if (
        confirm(
          "Remove " +
            DEFS[b.type].name +
            "? Half the construction materials will be recovered.",
        )
      ) {
        remove(state, b);
        selected = null;
      }
    } else {
      const i = y * W + x;
      state.roads = state.roads.filter((v) => v !== i);
    }
  } else {
    selected =
      buildingAt(state, x, y) ||
      state.people.find((p) => Math.hypot(p.x - x - 0.5, p.y - y - 0.5) < 1) ||
      null;
    if (!selected) {
      const t = state.tiles[y * W + x];
      $("inspector").textContent = [
        "Open ground. Space for your next good idea.",
        "Water. The shore shapes your village.",
        "Sandy ground. Buildable, but away from fertile soil.",
        "A tree. Mark it with Harvest to gather 8 timber.",
        "Stone deposit. Mark it to gather 7 stone.",
      ][t];
    }
  }
  update();
}
canvas.addEventListener("pointerdown", (e) => {
  canvas.focus({ preventScroll: true });
  drag = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y };
  moved = false;
  canvas.setPointerCapture(e.pointerId);
  hover = tileFrom(e);
});
canvas.addEventListener("pointermove", (e) => {
  if (drag) {
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) moved = true;
    if (moved) {
      camera.x = drag.cx + dx;
      camera.y = drag.cy + dy;
    }
  }
  hover = tileFrom(e);
});
canvas.addEventListener("pointerup", (e) => {
  if (drag && !moved) action(tileFrom(e));
  drag = null;
});
canvas.addEventListener("pointercancel", () => {
  drag = null;
});
canvas.addEventListener("pointerleave", () => {
  if (!drag) hover = null;
});
function zoom(factor) {
  const old = camera.zoom;
  camera.zoom = Math.max(0.7, Math.min(4, camera.zoom * factor));
  const ratio = camera.zoom / old;
  camera.x = canvas.width / 2 - (canvas.width / 2 - camera.x) * ratio;
  camera.y = canvas.height / 2 - (canvas.height / 2 - camera.y) * ratio;
}
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1);
  },
  { passive: false },
);
$("zoom-in").onclick = () => zoom(1.2);
$("zoom-out").onclick = () => zoom(1 / 1.2);
$("center").onclick = center;
function pause() {
  paused = !paused;
  update();
}
$("pause").onclick = pause;
document.querySelectorAll("[data-speed]").forEach(
  (b) =>
    (b.onclick = () => {
      speed = Number(b.dataset.speed);
      paused = false;
      update();
    }),
);
document.addEventListener("keydown", (e) => {
  if (
    !active ||
    $("guide").open ||
    ["INPUT", "TEXTAREA", "BUTTON"].includes(document.activeElement.tagName)
  )
    return;
  if (
    [" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(
      e.key,
    )
  )
    e.preventDefault();
  if (e.key === " ") pause();
  if (e.key.toLowerCase() === "r") rotation = (rotation + 1) % 4;
  if (e.key === "Escape") setTool("inspect");
  const pan = { w: [0, 35], s: [0, -35], a: [35, 0], d: [-35, 0] }[
    e.key.toLowerCase()
  ];
  if (pan) {
    camera.x += pan[0];
    camera.y += pan[1];
  }
  const move = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  }[e.key];
  if (move) {
    hover ??= { x: 32, y: 24 };
    hover = {
      x: Math.max(0, Math.min(W - 1, hover.x + move[0])),
      y: Math.max(0, Math.min(H - 1, hover.y + move[1])),
    };
  }
  if (e.key === "Enter") action(hover);
});
$("save").onclick = () => {
  if (state) save(true);
  else alert("Start a village before saving.");
};
$("atlas").onclick = () => {
  save();
  active = false;
  $("play").hidden = true;
  $("island-screen").hidden = false;
  readSave();
};
$("sound").onclick = () => {
  sound = !sound;
  $("sound").textContent = sound ? "Sound on" : "Sound off";
  $("sound").setAttribute("aria-pressed", String(sound));
  beep();
};
$("help").onclick = () => $("guide").showModal();
$("close-guide").onclick = () => $("guide").close();
$("start-guide").onclick = () => $("guide").close();
function generate() {
  const seed = $("seed").value.trim() || "HEARTH-742";
  $("seed").value = seed;
  island($("island").getContext("2d"), seed);
  $("regions").replaceChildren();
  REGIONS.forEach((r, i) => {
    const b = document.createElement("button");
    b.className = "region-card";
    b.innerHTML =
      '<span class="num">0' +
      (i + 1) +
      " / " +
      r.tag +
      "</span><h2>" +
      r.name +
      "</h2><p>" +
      r.text +
      "</p><strong>Settle here →</strong>";
    b.onclick = () => {
      if (
        saved &&
        !confirm(
          "Start a new village? Your existing local save will be replaced when the new village saves.",
        )
      )
        return;
      enter(createWorld(seed, i, $("peaceful").checked));
    };
    $("regions").append(b);
  });
}
$("generate").onclick = generate;
$("seed").addEventListener("keydown", (e) => {
  if (e.key === "Enter") generate();
});
$("resume").onclick = () => {
  if (saved) enter(restore(serialize(saved)));
};
function update() {
  if (!state) return;
  const s = state;
  $("resources").replaceChildren();
  for (const [key, label, icon] of [
    ["wood", "TIMBER", "♧"],
    ["stone", "STONE", "◆"],
    ["food", "FOOD", "❧"],
    ["water", "WATER", "◈"],
    ["morale", "MORALE", "✦"],
  ]) {
    const el = document.createElement("div");
    el.className = "resource";
    el.innerHTML =
      '<span class="icon">' +
      icon +
      "</span><div><b>" +
      Math.floor(key === "morale" ? s.morale : s.stock[key]) +
      (key === "morale" ? "%" : "") +
      "</b><small>" +
      label +
      "</small></div>";
    $("resources").append(el);
  }
  $("day").textContent = "Day " + s.day;
  const phase = (s.time % DAY) / DAY;
  $("clock").textContent = paused
    ? "Paused"
    : phase < 0.35
      ? "Morning"
      : phase < 0.7
        ? "Afternoon"
        : phase < 0.83
          ? "Dusk"
          : "Night";
  $("day-progress").style.width = phase * 100 + "%";
  $("pause").textContent = paused ? "▶" : "Ⅱ";
  $("pause").setAttribute(
    "aria-label",
    paused ? "Resume simulation" : "Pause simulation",
  );
  document
    .querySelectorAll("[data-speed]")
    .forEach((b) =>
      b.classList.toggle(
        "active",
        !paused && Number(b.dataset.speed) === speed,
      ),
    );
  const count = (t) => completed(s, t).length;
  let goal = !s.people.length
    ? "Place your Hearthhold in a clearing."
    : !count("hearth")
      ? "Your travelers are raising the first hearth."
      : !count("house")
        ? "Build a cottage. Make room for four more stories."
        : !count("well")
          ? "Build a Dew well to provide drinking water."
          : !count("farm")
            ? "Plant a Field patch. Feed tomorrow’s village."
            : !count("lumber")
              ? "Build a Beamwright to gather nearby timber."
              : !count("garden")
                ? "Create a Pocket garden. A home deserves beauty."
                : !s.peaceful && !count("tower")
                  ? "A Farwatch needs stone to fire. Prepare before day 3 dusk."
                  : "Keep food, water, and housing available. Travelers arrive at dawn.";
  if (s.won)
    goal =
      "Promise kept. Your first chapter is complete. Keep shaping your village.";
  if (s.lost)
    goal =
      "The hearth has fallen. Return to the Island to begin a new chapter.";
  $("objective").textContent = goal;
  $("population").replaceChildren(
    document.createTextNode(s.people.length + " villagers"),
  );
  const small = document.createElement("small");
  small.textContent =
    beds(s) +
    " sheltered spaces · " +
    s.people.filter((p) => p.task || p.carry).length +
    " working";
  $("population").append(small);
  $("promise-state").textContent = s.won
    ? "✦ A place for everyone. Promise kept."
    : s.people.length +
      "/8 villagers · day " +
      s.day +
      "/4 · " +
      (count("garden") ? "garden planted" : "garden needed");
  $("events").replaceChildren();
  for (const event of s.events.slice(0, 7)) {
    const li = document.createElement("li"),
      time = document.createElement("time");
    time.textContent = "DAY " + event.day;
    li.append(time, document.createTextNode(event.text));
    $("events").append(li);
  }
  if (selected) {
    $("inspector").replaceChildren();
    const title = document.createElement("b"),
      copy = document.createElement("p");
    if (selected.type) {
      title.textContent = DEFS[selected.type].name;
      copy.textContent =
        DEFS[selected.type].desc +
        " " +
        (selected.progress < 1
          ? "Construction " + Math.floor(selected.progress * 100) + "%."
          : "Ready.") +
        " Condition " +
        Math.floor(selected.hp) +
        "/" +
        DEFS[selected.type].hp +
        ".";
    } else {
      title.textContent = selected.name;
      copy.textContent =
        selected.state +
        (selected.carry
          ? " · Carrying " + selected.carry.n + " " + selected.carry.key
          : "");
    }
    $("inspector").append(title, copy);
  }
  $("weather").textContent = s.enemies.length
    ? "⚑ " + s.enemies.length + " raiders approaching"
    : s.peaceful
      ? "✿ Peaceful settlement"
      : s.day >= 3 && s.day % 2 === 1 && s.raided !== s.day
        ? "⚑ Tracks at the border · raid at dusk"
        : "✦ Clear skies";
}
function draw() {
  if (!active || !state) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#1d3d36";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(Math.round(camera.x), Math.round(camera.y));
  ctx.scale(camera.zoom, camera.zoom);
  ctx.imageSmoothingEnabled = false;
  scene(ctx, state, state.time);
  if (hover && hover.x >= 0 && hover.y >= 0 && hover.x < W && hover.y < H) {
    const type = DEFS[tool] ? tool : null;
    const valid = type
      ? !canPlace(state, type, hover.x, hover.y, rotation)
      : true;
    ctx.fillStyle = valid ? "#e3eabc55" : "#db817b66";
    ctx.strokeStyle = valid ? "#eff2c7" : "#ed9a8d";
    ctx.lineWidth = 1 / camera.zoom;
    for (const [dx, dy] of type ? footprint(type, rotation) : [[0, 0]]) {
      const x = (hover.x + dx) * TILE,
        y = (hover.y + dy) * TILE;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
}
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000 || 0);
  last = now;
  if (active && state && !paused && !document.hidden && !$("guide").open) {
    const steps = Math.ceil(speed);
    for (let i = 0; i < steps; i++) tick(state, (dt * speed) / steps);
  }
  uiTimer += dt;
  saveTimer += dt;
  if (uiTimer > 0.3) {
    update();
    uiTimer = 0;
  }
  if (saveTimer > 20) {
    if (active) save();
    saveTimer = 0;
  }
  draw();
  requestAnimationFrame(frame);
}
window.addEventListener("pagehide", () => save());
readSave();
generate();
requestAnimationFrame(frame);
