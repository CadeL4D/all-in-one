import { reconcileConvoys, queueConvoy, applyConvoy, RECIPES, initDepth, recipeStatus, depthSummary, expeditionCost, exploreSite, chooseBlessing } from "./depth.js";
import { ROLES, OFFERS, workerRole, setWorkforce, caravan, tradeCaravan } from "./civic.js";
import {opportunities,buildingStatus,PAUSABLE} from "./advice.js";
import {
  W,
  H,
  DAY,
  REGIONS,
  DEFS,
  linePlan, placeLine, campaign, season, UPGRADES, startProject, productionYield, capacity,
  DIFFICULTIES, MONSTERS, rules, dailyNeeds, nextRaidDay, raidPlan, raidDay,
  footprint,
  canPlace,
  suggestedSite,
  place,
  remove,
  buildingAt,
  completed,
  beds,
  tick,
  serialize,
  restore,
  log,
  POWERS,
  cast,
  influenceCap,
} from "./world.js";
import { TILE, scene, structure } from "./art.js";
import { TERRITORIES, GEOGRAPHY_VERSION, buildAtlas, regionTiles, createTerritory, paintAtlas } from "./geography.js";
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
let pixelRatio = window.devicePixelRatio || 1;
let requestedZoom = 1.6;
const camera = { x: 0, y: 0, zoom: Math.round(requestedZoom * pixelRatio) / pixelRatio };
// Paint the art at its native pixel grid before scaling without interpolation.
const artwork = document.createElement("canvas");
artwork.width = W * TILE; artwork.height = H * TILE;
const artContext = artwork.getContext("2d");
let saved = null;
let lastHarvest = [];
let brush = 3,
  candidate = null,
  category = "all",
  pinch = null,
  gesture = false;
const pointers = new Map();
const groups = {
  hearth: "home",
  house: "home",
  garden: "home",
  kitchen: "home",
  store: "work",
  well: "work",
  farm: "work",
  lumber: "work",
  infirmary: "home", quarry: "work", workshop: "work", forge: "work", forester: "work", gate: "defense",
  path: "work",
  tower: "defense",
  wall: "defense",
  beacon: "defense",
};
function closeSheets() {
  document.querySelectorAll(".sheet").forEach((el) => (el.hidden = true));
}
function openSheet(id) {
  const wasOpen = !$(id).hidden;
  closeSheets();
  if (!wasOpen) $(id).hidden = false;
}
document
  .querySelectorAll("[data-close-sheet]")
  .forEach((b) => (b.onclick = closeSheets));
document
  .querySelectorAll("[data-close-dialog]")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
$("build-open").onclick = () => openSheet("build-sheet");
$("powers-open").onclick = () => openSheet("powers-sheet");
$("village-open").onclick = () => openSheet("village-sheet");
for(const [role,info] of Object.entries(ROLES)) {
  const row=document.createElement("div");row.className="workforce-row";
  const label=document.createElement("span");label.textContent=info.name;
  const count=document.createElement("output");count.id="workers-"+role;
  const less=document.createElement("button"),more=document.createElement("button");
  less.textContent="−";more.textContent="+";
  less.setAttribute("aria-label","Fewer "+info.name.toLowerCase());more.setAttribute("aria-label","More "+info.name.toLowerCase());
  less.onclick=()=>{const message=setWorkforce(state,role,-1);if(message)toast(message);update();save();};
  more.onclick=()=>{const message=setWorkforce(state,role,1);if(message)toast(message);update();save();};
  row.append(label,less,count,more);$("workforce-controls").append(row);
}
for(const offer of OFFERS){
  const button=document.createElement("button");button.dataset.caravan=offer.id;
  button.textContent=offer.description;
  button.onclick=()=>{const message=tradeCaravan(state,offer.id,capacity(state));toast(message||"Caravan trade complete. Morale +5.");update();save();};
  $("caravan-offers").append(button);
}
let nextBuild = "hearth", nextImprove = null, nextHarvest = false, nextSite = null, chapterProgress = null, roadmapKey = "";
let caravanNoticeKey="";
let nextAdvice=null,opportunityKey="";
function actOnAdvice(action){
  if(action.type){closeSheets();setTool(action.type,true);}
  else if(action.site!==undefined){const site=state.sites?.find(v=>v.id===action.site);if(site)inspectSite(site);}
  else if(action.building){
    selected=state.buildings.find(b=>b.id===action.building);
    if(selected){setTool("inspect");camera.x=canvas.clientWidth/2-(selected.x+1)*TILE*camera.zoom;camera.y=canvas.clientHeight/2-(selected.y+1)*TILE*camera.zoom;openSheet("inspect-sheet");update();}
  }else if(action.panel){closeSheets();openSheet("village-sheet");$(action.panel).open=true;$(action.panel).scrollIntoView({block:"start",behavior:"smooth"});}
}
$("goal-open").onclick = () => {
  if(state?.lost){$("atlas").click();return;}
  if(nextAdvice){actOnAdvice(nextAdvice);return;}
  if (nextBuild) { closeSheets(); setTool(nextBuild, true); }
  else if (nextSite) {
    const site = state.sites?.find(v=>v.kind===nextSite&&!v.done);
    if (site) inspectSite(site); else openSheet("village-sheet");
  }
  else if (nextHarvest) { closeSheets(); setTool("harvest"); }
  else if (nextImprove) {
    selected = completed(state, nextImprove).find(b => !b.upgraded);
    if (selected) {
      setTool("inspect");
      camera.x = canvas.clientWidth / 2 - (selected.x + 1) * TILE * camera.zoom;
      camera.y = canvas.clientHeight / 2 - (selected.y + 1) * TILE * camera.zoom;
      openSheet("inspect-sheet"); update();
    } else openSheet("village-sheet");
  } else openSheet("village-sheet");
};
$("open-menu").onclick = () => { renderSaves(); $("menu").showModal(); };
$("return-game").onclick = () => $("menu").close();
const LIBRARY = KEY + "-villages";
function villages() {
  const raw = localStorage.getItem(LIBRARY);
  return raw ? JSON.parse(raw) : {};
}
function villageKey(s) { return JSON.stringify([s.seed, s.region]); }
function renderSaves() {
  $("saved-villages").replaceChildren();
  $("return-game").hidden = !active;
  $("save").disabled = !state?.people.length;
  try {
    const all = villages();
    if(state && all[villageKey(state)])reconcileConvoys(state,restore(all[villageKey(state)]));
    if (saved) all[villageKey(saved)] ??= serialize(saved);
    for (const raw of Object.values(all)) {
      const village = restore(raw);
      const b = document.createElement("button");
      b.textContent = `${village.territoryName || REGIONS[village.region].name} · Day ${village.day} · ${village.people.length} villagers`;
      const label = document.createElement("small");
      label.textContent = rules(village).name + " · " + (village.worldSeed || village.seed) + (village.worldSeed && village.geographyVersion !== GEOGRAPHY_VERSION ? " · Earlier landscape" : "");
      b.append(label);
      b.onclick = () => {
        if (!save()) return;
        const latest = villages()[villageKey(village)];
        enter(latest ? restore(latest) : village);
        $("menu").close();
      };
      $("saved-villages").append(b);
    }
    if (!$("saved-villages").children.length) $("saved-villages").textContent = "Your first village will appear here after you place a hearth.";
  } catch { $("save-status").textContent = "Could not read saved villages. Download a backup before leaving."; }
}
$("choose-land").onclick = () =>
  $("land-selection").scrollIntoView({ behavior: "smooth", block: "center" });
$("work-focus").onchange = (e) => {
  if (state) {
    state.focus = e.target.value;
    log(
      state,
      "Work priority changed to " + e.target.selectedOptions[0].text + ".",
    );
    update();
  }
};
for (const [name, p] of Object.entries(POWERS)) {
  const b = document.createElement("button");
  b.dataset.power = name;
  b.innerHTML =
    "<strong>✦ " +
    p.name +
    " · " +
    p.cost +
    " influence</strong><small>" +
    p.desc +
    "</small>";
  b.onclick = () => {
    setTool(name);
    closeSheets();
  };
  $("powers").append(b);
}
document.querySelectorAll("[data-category]").forEach(
  (b) =>
    (b.onclick = () => {
      category = b.dataset.category;
      document
        .querySelectorAll("[data-category]")
        .forEach((v) => v.classList.toggle("active", v === b));
      document
        .querySelectorAll("[data-build]")
        .forEach(
          (v) =>
            (v.hidden =
              category !== "all" && groups[v.dataset.build] !== category),
        );
    }),
);
document.querySelectorAll("[data-brush]").forEach(
  (b) =>
    (b.onclick = () => {
      brush = Number(b.dataset.brush);
      document
        .querySelectorAll("[data-brush]")
        .forEach((v) => v.classList.toggle("active", v === b));
      closeSheets();
      preview();
    }),
);
$("erase-marks").onclick = () => {
  if (state) {
    state.marks = [];
    toast("Harvest marks cleared.");
    closeSheets();
  }
};
function readSave() {
  try {
    const raw = localStorage.getItem(KEY);
    saved = raw ? restore(raw) : null;
    if (saved) { const latest=villages()[villageKey(saved)]; if(latest)saved=restore(latest); }
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
  if (!state?.people.length) return true;
  try {
    const all = villages();
    if (saved) all[villageKey(saved)] ??= serialize(saved);
    all[villageKey(state)] = serialize(state);
    localStorage.setItem(LIBRARY, JSON.stringify(all));
    localStorage.setItem(KEY, serialize(state));
    $("save-status").textContent = "Saved on this device · " + new Date().toLocaleTimeString([], {hour: "numeric", minute: "2-digit"});
    saved = restore(serialize(state));
    $("resume").hidden = false;
    if (manual) toast("Village saved in this browser.");
    return true;
  } catch {
    $("save-status").textContent = "Save failed. Download a backup to keep your progress.";
    toast("Storage is unavailable or full. Download a backup from the menu.");
    return false;
  }
}
function enter(s) {
  state = s;
  chapterProgress = null;
  lastHarvest = [];
  active = true;
  paused = false;
  selected = null;
  document.body.classList.add("in-game");
  closeSheets();
  $("work-focus").value = s.focus || "balanced";
  $("island-screen").hidden = true;
  $("play").hidden = false;
  setTool(s.people.length ? "inspect" : "hearth");
  $("village-name").textContent = s.territoryName || REGIONS[s.region].name;
  $("region-copy").textContent = REGIONS[s.region].text;
  $("map-label").textContent = (s.territoryName || REGIONS[s.region].name) + " · " + rules(s).name;
  resize();
  center();
  update();
  if (!s.people.length) {
    candidate = { x: 30, y: 22 }; preview();
    toast("Your travelers have arrived. Choose a clearing and light the hearth.");
  }
}
function center() {
  const b = state?.buildings.find((b) => b.type === "hearth");
  camera.x = canvas.clientWidth / 2 - (b ? b.x + 2 : 32) * TILE * camera.zoom;
  camera.y = canvas.clientHeight / 2 - (b ? b.y + 1 : 24) * TILE * camera.zoom;
}
function resize() {
  const box = canvas.getBoundingClientRect();
  if (box.width && box.height) {
    pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(box.width * pixelRatio);
    canvas.height = Math.round(box.height * pixelRatio);
    camera.zoom = Math.max(1, Math.round(requestedZoom * pixelRatio)) / pixelRatio;
    canvas.dataset.zoom = String(camera.zoom);
    ctx.imageSmoothingEnabled = false;
  }
}
new ResizeObserver(() => {
  resize();
  if (active) center();
}).observe(canvas.parentElement);
const buildingPurpose = {
  infirmary: "Food + water → care for injuries", workshop: "Timber → planks", forge: "Planks + stone → faster tools", forester: "Renew your timber supply", gate: "Villagers pass; raiders must break it",
  hearth: "A home for your six travelers", house: "Four more beds for new arrivals", well: "Drinking water for your villagers",
  farm: "Food for your growing village", lumber: "Workers gather nearby timber", quarry: "Stone for buildings and tower shots",
  kitchen: "Use 30% less food each day", garden: "A daily boost to village morale", tower: "Protect nearby homes; uses stone",
  wall: "Slow attackers; leave workers a route", path: "Faster journeys for your workers", store: "Space for 100 more of each resource", beacon: "More influence for your powers",
};
let lineStart = null, linePreview = null;
function setTool(next, suggest = false) {
  lineStart = linePreview = null;
  tool = next;
  rotation = 0;
  candidate = null;
  hover = null;
  $("placement").hidden = next === "inspect" || next === "demolish";
  $("placement-name").textContent =
    DEFS[next]?.name ||
    POWERS[next]?.name ||
    (next === "harvest" ? "Mark a harvest" : "Inspect");
  $("rotate").hidden = !DEFS[next] || ["wall", "path"].includes(next);
  $("brush-cycle").hidden = next !== "harvest";
  $("undo-harvest").hidden = next !== "harvest";
  $("undo-harvest").disabled = !lastHarvest.length;
  $("confirm-placement").hidden = next === "harvest";
  $("confirm-placement").textContent = next === "hearth" ? "Light hearth" : DEFS[next] ? "Build ✓" : "Cast ✦";
  $("confirm-placement").disabled = true;
  $("placement-info").textContent = next === "harvest" ? "Drag to paint · two fingers to move map" : "Drag to position · lift, then Build";
  document
    .querySelectorAll("[data-build]")
    .forEach((b) => b.classList.toggle("active", b.dataset.build === next));
  $("build-open").classList.toggle("active", !!DEFS[next]);
  $("powers-open").classList.toggle("active", !!POWERS[next]);
  for (const id of ["harvest", "inspect", "demolish"])
    $(id).classList.toggle("active", id === next);
  $("tool-tip").textContent =
    DEFS[next]?.desc ||
    POWERS[next]?.desc ||
    (next === "harvest"
      ? "Click a tree or rock to mark it. Click again to unmark. Workers need a route to its edge."
      : next === "demolish"
        ? "Click a building to remove it and recover half the materials."
        : "Click a building or citizen to inspect.");
  if (suggest && DEFS[next] && state) {
    const x = (canvas.clientWidth / 2 - camera.x) / camera.zoom / TILE;
    const y = (canvas.clientHeight / 2 - camera.y) / camera.zoom / TILE;
    candidate = suggestedSite(state, next, x, y, rotation);
    if (candidate) preview();
    else $("placement-info").textContent = "Find open ground nearby; check your timber and stone.";
  }
}
for (const type of [
  "hearth",
  "house",
  "well",
  "farm",
  "lumber",
  "quarry",
  "kitchen",
  "store",
  "garden",
  "tower",
  "wall",
  "path",
  "beacon", "workshop", "forge", "forester", "gate", "infirmary",
]) {
  const d = DEFS[type];
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
  const icon = document.createElement("canvas");
  icon.className = "building-icon";
  icon.width = 64;
  icon.height = 42;
  const c = icon.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.translate(8, 14);
  c.scale(1, 1);
  structure(c, { type, x: 0, y: 0, rot: 0, progress: 1, hp: d.hp });
  button.prepend(icon);
  const purpose = document.createElement("span"); purpose.className = "building-purpose";
  purpose.textContent = buildingPurpose[type]; button.append(purpose);
  button.onclick = () => {
    setTool(type, true);
    closeSheets();
  };
  $("buildings").append(button);
}
$("inspect").onclick = () => {
  closeSheets();
  setTool("inspect");
};
$("harvest").onclick = () => {
  setTool("harvest");
  closeSheets();
};
$("undo-harvest").onclick = () => {
  state.marks = state.marks.filter(i => !lastHarvest.includes(i));
  lastHarvest = [];
  $("undo-harvest").disabled = true;
  toast("Last harvest marks removed. Already gathered goods are kept.");
};
$("brush-cycle").onclick = () => {
  brush = brush === 1 ? 3 : brush === 3 ? 5 : 1;
  $("brush-cycle").textContent = `${brush} × ${brush}`;
};
for (const kind of ["upgrade", "repair"]) $(kind + "-building").onclick = () => {
  const error = startProject(state, selected, kind);
  toast(error || (kind === "upgrade" ? "Upgrade queued. A worker will improve this building." : "Repair queued. A worker will restore 60 condition."));
  save(); update();
};
$("demolish").onclick = () => {
  if (!selected?.type) {
    toast("Select a building first.");
    return;
  }
  if (selected.type === "hearth") {
    toast("The Hearthhold anchors this village.");
    return;
  }
  if (
    confirm(
      "Dismantle " + DEFS[selected.type].name + "? Recover half its materials.",
    )
  ) {
    remove(state, selected);
    selected = null;
    closeSheets();
    update();
  }
};
$("rotate").onclick = () => {
  rotation = (rotation + 1) % 4;
  beep(320);
  preview();
};
function preview() {
  if (!candidate || !state) return;
  hover = { ...candidate };
  if (["wall", "path"].includes(tool) && lineStart) {
    linePreview = linePlan(state, tool, lineStart, candidate);
    $("placement-info").textContent = linePreview.reason || `${linePreview.cells.length} tiles · ${linePreview.wood} timber / ${linePreview.stone} stone`;
    $("confirm-placement").disabled = !!linePreview.reason;
    $("confirm-placement").textContent = "Build line ✓";
    return;
  }
  const reason = DEFS[tool]
    ? canPlace(state, tool, candidate.x, candidate.y, rotation)
    : "";
  $("placement-info").textContent =
    reason ||
    (POWERS[tool]
      ? POWERS[tool].cost + " influence · radius " + POWERS[tool].radius
      : tool === "harvest"
        ? brush + " × " + brush + " harvest area"
        : buildingPurpose[tool] + " · Drag to position");
  $("confirm-placement").disabled = !!reason;
}
$("cancel-placement").onclick = () => {
  setTool("inspect");
  closeSheets();
};
$("confirm-placement").onclick = () => {
  if (lineStart && candidate && ["wall", "path"].includes(tool)) {
    const count = linePreview?.cells.length || 0;
    const reason = placeLine(state, tool, lineStart, candidate);
    if (reason) { toast(reason); preview(); return; }
    toast(`${count} ${tool === "path" ? "trail tiles laid" : "wall sections queued"}. Drag to draw another line.`);
    lineStart = linePreview = candidate = hover = null;
    $("confirm-placement").disabled = true;
    $("placement-info").textContent = "Drag another line · two fingers to move map";
    save(); update(); return;
  }
  if (candidate) {
    action(candidate);
    if (tool !== "inspect") preview();
  }
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
      if (!["wall", "path"].includes(tool)) setTool("inspect");
      save();
    }
  } else if (POWERS[tool]) {
    const reason = cast(state, tool, x, y);
    if (reason) toast(reason);
    else {
      beep(170);
      toast(POWERS[tool].name + " cast.");
    }
  } else if (tool === "harvest") {
    let count = 0;
    const marked = [];
    const half = Math.floor(brush / 2);
    for (let dy = -half; dy <= half; dy++)
      for (let dx = -half; dx <= half; dx++) {
        const ax = x + dx,
          ay = y + dy,
          index = ay * W + ax;
        if (
          ax >= 0 &&
          ay >= 0 &&
          ax < W &&
          ay < H &&
          [3, 4].includes(state.tiles[index]) &&
          !state.marks.includes(index)
        ) {
          state.marks.push(index);
          marked.push(index);
          count++;
        }
      }
    toast(
      count
        ? count + " deposits marked for gathering."
        : "Choose unmarked trees or stone.",
    );
    if (count) { lastHarvest = marked; $("undo-harvest").disabled = false; beep(370); }
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
      state.sites?.find(site=>Math.hypot(site.x-x,site.y-y)<2) || null;
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
    $("demolish").hidden = !selected?.type;
  }
  update();
}
function selectTile(pos) {
  if (tool === "harvest") { hover = pos; action(pos); return; }
  if (tool === "inspect") {
    action(pos);
    closeSheets();
    $("inspect-sheet").hidden = false;
    return;
  }
  closeSheets();
  candidate = pos;
  preview();
}
let stroke = null;
function paintStroke(pos) {
  const from = stroke.last || pos;
  const steps = Math.max(Math.abs(pos.x - from.x), Math.abs(pos.y - from.y), 1);
  const half = Math.floor(brush / 2);
  for (let n = 0; n <= steps; n++) {
    const x = Math.round(from.x + (pos.x - from.x) * n / steps);
    const y = Math.round(from.y + (pos.y - from.y) * n / steps);
    for (let dy = -half; dy <= half; dy++) for (let dx = -half; dx <= half; dx++) {
      const ax = x + dx, ay = y + dy, i = ay * W + ax;
      if (ax >= 0 && ay >= 0 && ax < W && ay < H && [3, 4].includes(state.tiles[i]) && !state.marks.includes(i)) stroke.marks.add(i);
    }
  }
  stroke.last = pos;
  hover = pos;
}
canvas.addEventListener("pointerdown", (e) => {
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    gesture = true;
    if (lineStart) { lineStart = linePreview = candidate = hover = null; $("confirm-placement").disabled = true; }
    stroke = null;
    const [a, b] = [...pointers.values()];
    pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: camera.zoom, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    drag = null;
    moved = true;
  } else if (pointers.size === 1) {
    gesture = false;
    drag = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y };
    moved = false;
    if (["wall", "path"].includes(tool)) { lineStart = tileFrom(e); candidate = {...lineStart}; preview(); }
    if (tool === "harvest") { stroke = { marks: new Set(), last: null }; paintStroke(tileFrom(e)); }
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2 && pinch) {
    const [a, b] = [...pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    const desired = Math.max(0.7, Math.min(4, (pinch.zoom * distance) / Math.max(1, pinch.distance)));
    zoom(desired / requestedZoom);
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    camera.x += x - pinch.x;
    camera.y += y - pinch.y;
    pinch.x = x; pinch.y = y;
    return;
  }
  if (drag && !gesture) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 6) moved = true;
    if (stroke) { paintStroke(tileFrom(e)); return; }
    if (DEFS[tool]) { candidate = tileFrom(e); preview(); return; }
    if (moved) { camera.x = drag.cx + dx; camera.y = drag.cy + dy; }
  }
  if (!candidate && e.pointerType === "mouse") hover = tileFrom(e);
});
canvas.addEventListener("pointerup", (e) => {
  if (!gesture && stroke) {
    paintStroke(tileFrom(e));
    const marked = [...stroke.marks].filter(i => [3, 4].includes(state.tiles[i]) && !state.marks.includes(i));
    if (marked.length) {
      state.marks.push(...marked);
      lastHarvest = marked;
      $("undo-harvest").disabled = false;
      beep(370);
      toast(marked.length + " deposits marked. Undo removes this brush stroke.");
      save();
    }
    update();
  } else if (!gesture && drag && (!moved || DEFS[tool])) selectTile(tileFrom(e));
  stroke = null;
  pointers.delete(e.pointerId);
  drag = null;
  pinch = null;
  if (pointers.size === 0) gesture = false;
});
canvas.addEventListener("pointercancel", (e) => {
  if (lineStart) { lineStart = linePreview = candidate = hover = null; $("confirm-placement").disabled = true; }
  stroke = null;
  pointers.delete(e.pointerId);
  drag = null;
  pinch = null;
  gesture = true;
});
canvas.addEventListener("pointerleave", () => {
  if (!drag && !candidate) hover = null;
});
function zoom(factor) {
  const old = camera.zoom;
  requestedZoom = Math.max(0.7, Math.min(4, requestedZoom * factor));
  camera.zoom = Math.max(1, Math.round(requestedZoom * pixelRatio)) / pixelRatio;
  const ratio = camera.zoom / old;
  camera.x = canvas.clientWidth / 2 - (canvas.clientWidth / 2 - camera.x) * ratio;
  camera.y = canvas.clientHeight / 2 - (canvas.clientHeight / 2 - camera.y) * ratio;
  canvas.dataset.zoom = String(camera.zoom);
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
$("mobile-speed").onclick = () => {
  speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
  paused = false;
  update();
};
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
    document.querySelector("dialog[open]") ||
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
  if (e.key.toLowerCase() === "r") {
    rotation = (rotation + 1) % 4;
    preview();
  }
  if (e.key === "Escape") {
    setTool("inspect");
    closeSheets();
  }
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
    if (tool !== "inspect") {
      candidate = { ...hover };
      preview();
    }
  }
  if (e.key === "Enter") action(hover);
});
$("save").onclick = () => {
  if (state) save(true);
  else alert("Start a village before saving.");
};
$("atlas").onclick = () => {
  if (!save()) return;
  active = false;
  document.body.classList.remove("in-game");
  $("menu").close();
  closeSheets();
  $("play").hidden = true;
  $("island-screen").hidden = false;
  readSave();
  if (state?.worldSeed) { $("seed").value = state.worldSeed; $("difficulty").value = state.difficulty; scouted = state.territory; }
  generate();
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
let currentAtlas = null, scouted = 0, atlasScale = 1;
function atlasSaves() {
  const matching = new Map();
  try {
    for (const raw of Object.values(villages())) {
      const s = restore(raw);
      if (s.worldSeed === currentAtlas.seed && s.geographyVersion === GEOGRAPHY_VERSION && s.difficulty === $("difficulty").value) matching.set(s.territory, s);
    }
  } catch { $("world-progress").textContent = "Some saves could not be read."; }
  return matching;
}
function showTerritory(id) {
  scouted = id;
  const t = TERRITORIES[id], r = REGIONS[t.region], mode = $("difficulty").value;
  const saves = atlasSaves(), existing = saves.get(id);
  const draft = existing || createTerritory(currentAtlas, id, mode);
  const d = rules(draft), tiles = regionTiles(currentAtlas, id);
  document.querySelectorAll(".territory").forEach((el, i) => {
    el.setAttribute("aria-pressed", String(i === id));
    el.classList.toggle("neighbor", t.neighbors.includes(i));
    el.classList.toggle("settled", saves.has(i));
    const reclaimed=!!saves.get(i)?.stats?.riftSealed;
    el.classList.toggle("reclaimed",reclaimed);
    el.querySelector(".region-marker").textContent = reclaimed ? "✦" : saves.has(i) ? "⌂" : "◆";
  });
  $("world-progress").textContent = `${saves.size}/24 settled · ${[...saves.values()].filter(v=>v.stats?.riftSealed).length} reclaimed · ${d.name}`;
  $("difficulty-copy").textContent = d.desc;
  const detail = $("territory-detail"); detail.replaceChildren();
  const title = document.createElement("h3"); title.textContent = t.name;
  const biome = document.createElement("p"); biome.className = "region-biome";
  biome.textContent = r.tag + " · " + ["Sheltered", "Wild", "Hostile"][t.threat];
  const copy = document.createElement("p"); copy.textContent = r.text;
  const resources = document.createElement("p"); resources.className = "scout-resources";
  resources.textContent = `${tiles.filter(v => v === 3).length} timber · ${tiles.filter(v => v === 4).length} stone deposits · ${Math.round(r.food * 100)}% crops`;
  const stock = document.createElement("p"); stock.className = "scout-stock";
  stock.textContent = `${existing ? "In store" : "Starting supplies"}: ${draft.stock.wood} timber / ${draft.stock.stone} stone / ${Math.floor(draft.stock.food)} food / ${Math.floor(draft.stock.water)} water`;
  const threat = document.createElement("p"); threat.className = "scout-threat";
  const next = nextRaidDay(draft), wave = raidPlan(draft);
  threat.textContent = next === null ? "No monster raids. Your challenge is a healthy, growing village." :
    `${existing ? "Next" : "First"} raid: day ${next}, dusk · ${wave.length} monsters. ${d.interval === 1 ? "Every night" : "Every " + d.interval + " days"} after that. ${t.threat ? "+" + t.threat + " monsters from regional danger (up to the mode cap)." : "No regional wave bonus."}`;
  const neighbors = document.createElement("div"); neighbors.className = "region-neighbors";
  const label = document.createElement("small"); label.textContent = "BORDERING REGIONS"; neighbors.append(label);
  t.neighbors.forEach(n => {
    const b = document.createElement("button"); b.textContent = TERRITORIES[n].name;
    b.onclick = () => { showTerritory(n); document.querySelectorAll(".territory")[n].scrollIntoView({block: "nearest", inline: "nearest"}); };
    neighbors.append(b);
  });
  const settle = document.createElement("button"); settle.className = "primary";
  settle.textContent = existing ? `Continue · Day ${existing.day} →` : "Settle " + t.name + " →";
  settle.onclick = () => {
    if (!save()) return;
    enter(atlasSaves().get(id) || createTerritory(currentAtlas, id, mode));
  };
  if(existing){const legacy=document.createElement("p");legacy.textContent=`${existing.people.length} villagers · ${existing.chapters?.length||0}/6 chapters · ${existing.stats?.riftSealed?"Frontier reclaimed":"Frontier unclaimed"}${existing.blessing?" · "+existing.blessing+" blessing":""}.`;detail.append(title,biome,copy,resources,stock,threat,legacy,neighbors,settle);}else detail.append(title, biome, copy, resources, stock, threat, neighbors, settle);
}
function generate() {
  const seed = $("seed").value.trim() || "HEARTH-742";
  $("seed").value = seed;
  currentAtlas = buildAtlas(seed);
  paintAtlas($("atlas-canvas"), currentAtlas);
  $("territory-map").replaceChildren();
  TERRITORIES.forEach(t => {
    const button = document.createElement("button"); button.className = "territory";
    button.style.setProperty("--danger", ["#b6d39a", "#e5bc71", "#e79182"][t.threat]);
    button.setAttribute("aria-label", t.name + ", " + ["sheltered", "wild", "hostile"][t.threat] + ", " + REGIONS[t.region].tag);
    const marker = document.createElement("span"); marker.className = "region-marker"; marker.textContent = "◆";
    const label = document.createElement("span"); label.className = "region-name"; label.textContent = t.name;
    button.append(marker, label); button.onclick = () => showTerritory(t.id);
    $("territory-map").append(button);
  });
  showTerritory(scouted);
  atlasZoom(1, true);
}
function atlasZoom(factor, fit = false) {
  const view = $("atlas-scroll"), board = $("atlas-board");
  const oldWidth = board.getBoundingClientRect().width || view.clientWidth;
  const cx = (view.scrollLeft + view.clientWidth / 2) / oldWidth;
  const cy = (view.scrollTop + view.clientHeight / 2) / oldWidth;
  atlasScale = fit ? 1 : Math.max(1, Math.min(3, atlasScale * factor));
  // CSS sizing avoids a scrollbar/ResizeObserver feedback loop.
  view.classList.toggle("atlas-zoomed", atlasScale > 1);
  board.style.width = `${atlasScale * 100}%`;
  const newWidth = board.getBoundingClientRect().width;
  view.scrollLeft = cx * newWidth - view.clientWidth / 2;
  view.scrollTop = cy * newWidth - view.clientHeight / 2;
}
$("atlas-in").onclick = () => atlasZoom(1.4);
$("atlas-out").onclick = () => atlasZoom(1 / 1.4);
$("atlas-fit").onclick = () => atlasZoom(1, true);
$("difficulty").onchange = () => showTerritory(scouted);
let atlasDrag = null, atlasMoved = false;
$("atlas-scroll").addEventListener("pointerdown", e => {
  atlasMoved = false;
  if (e.pointerType === "mouse" && e.button === 0) atlasDrag = { x: e.clientX, y: e.clientY, left: e.currentTarget.scrollLeft, top: e.currentTarget.scrollTop };
});
window.addEventListener("pointermove", e => {
  if (!atlasDrag) return;
  const dx = e.clientX - atlasDrag.x, dy = e.clientY - atlasDrag.y;
  if (Math.hypot(dx, dy) > 6) atlasMoved = true;
  if (atlasMoved) { $("atlas-scroll").scrollLeft = atlasDrag.left - dx; $("atlas-scroll").scrollTop = atlasDrag.top - dy; }
});
window.addEventListener("pointerup", () => { atlasDrag = null; });
window.addEventListener("pointercancel", () => { atlasDrag = null; });
$("atlas-scroll").addEventListener("click", e => { if (atlasMoved) { e.preventDefault(); e.stopPropagation(); } }, true);
$("generate").onclick = () => {
  const number = new Uint32Array(1);
  crypto.getRandomValues(number);
  $("seed").value = "HEARTH-" + number[0].toString(36).toUpperCase();
  generate();
};
$("seed").addEventListener("change", generate);
$("seed").addEventListener("keydown", (e) => {
  if (e.key === "Enter") generate();
});
$("resume").onclick = () => {
  if (saved) enter(restore(serialize(saved)));
};
function update() {
  if (!state) return;
  if (candidate && active) preview();
  const s = state;
  $("resources").replaceChildren();
  for (const [key, label, icon] of [
    ["wood", "TIMBER", "♧"],
    ["stone", "STONE", "◆"],
    ["food", "FOOD", "❧"],
    ["water", "WATER", "◈"],
    ["morale", "MORALE", "✦"],
    ["influence", "INFLUENCE", "✧"],
  ]) {
    const el = document.createElement("div");
    el.className = "resource";
    el.innerHTML =
      '<span class="icon">' +
      icon +
      "</span><div><b>" +
      Math.floor(
        key === "morale"
          ? s.morale
          : key === "influence"
            ? (s.influence ?? 35)
            : s.stock[key],
      ) +
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
  $("mobile-speed").textContent = speed + "×";
  $("mobile-speed").setAttribute(
    "aria-label",
    `Simulation speed: ${speed}×. Tap to change`,
  );
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
  initDepth(s);
  const path = campaign(s), chapter = path.current;
  const step = chapter?.steps.find(step => !step.done);
  const choices=opportunities(s);
  nextAdvice=null;
  nextHarvest = false;
  nextSite = step?.site || null;
  nextBuild = step?.type || null;
  nextImprove = step?.improve || null;
  let goal = step?.label || "Region reclaimed. Support a neighboring village or explore the world.";
  const incoming = nextRaidDay(s);
  if (incoming !== null && incoming - s.day <= 1 && completed(s, "well").length && completed(s, "farm").length && !completed(s, "tower").length) {
    goal = `Raise a Farwatch before day ${incoming} dusk. Keep stone for shots.`;
    nextBuild = "tower"; nextImprove = nextSite = null;
  }
  if (nextBuild && s.buildings.some(b => b.type === nextBuild && b.progress < 1)) {
    goal = `Workers are building ${DEFS[nextBuild].name}. Keep a clear route to the site.`;
    nextBuild = null;
  }
  if (completed(s, "tower").length && !s.peaceful && s.stock.stone < 12) {
    goal = "Towers need ammunition. Paint stone deposits or add a Stonewright for renewable mining.";
    nextBuild = nextImprove = nextSite = null; nextHarvest = true;
  }
  if (s.people.some(p=>p.health<50) && completed(s,"well").length && !completed(s,"infirmary").length) {
    goal="Villagers are injured. Build an Infirmary near the hearth; Mend can help immediately.";
    nextBuild="infirmary";nextImprove=nextSite=null;nextHarvest=false;
  }
  if (s.lost) { nextHarvest = false; goal = "The hearth has fallen. Explore the world to start another village."; nextBuild = nextImprove = nextSite = null; }
  if(!s.lost&&!nextBuild&&!nextImprove&&!nextSite&&!nextHarvest&&choices.length && !(step?.type&&s.buildings.some(b=>b.type===step.type&&b.progress<1))){
    nextAdvice=choices[0];goal=nextAdvice.title+". "+nextAdvice.why;
  }
  if(!s.lost&&nextSite==="relic"&&s.relicReady&&!s.blessing){nextAdvice={panel:"exploration-panel",title:"Choose your keeper’s blessing"};goal="Your expedition returned. Choose a permanent blessing for your village.";nextSite=null;}
  const choicesKey=JSON.stringify(choices);
  if(choicesKey!==opportunityKey){
    opportunityKey=choicesKey;$("opportunities").replaceChildren();
    for(const action of choices){const card=document.createElement("button"),title=document.createElement("strong"),why=document.createElement("span");card.dataset.opportunity=action.id;title.textContent=action.title+" →";why.textContent=action.why;card.append(title,why);card.onclick=()=>actOnAdvice(action);$("opportunities").append(card);}
  }
  $("opportunity-section").hidden=!choices.length;
  const progress = chapter ? chapter.steps.filter(step => step.done).length : 0;
  const chapterNumber = path.index < 0 ? path.chapters.length : path.index;
  if (chapterProgress !== null && chapterNumber > chapterProgress) { toast("Chapter complete! " + (chapter ? "Next: " + chapter.name : "You are a Hearthkeeper.")); beep(680); }
  chapterProgress = chapterNumber;
  $("chapter").textContent = chapter ? `${chapterNumber + 1}/${path.chapters.length} · ${chapter.name.toUpperCase()} · ${progress}/${chapter.steps.length}` : "HEARTHKEEPER · CAMPAIGN COMPLETE";
  const newRoadmapKey = JSON.stringify([s.seed, path.index, path.chapters]);
  if (newRoadmapKey !== roadmapKey) {
  const expanded = [...$("campaign-roadmap").querySelectorAll("details[open]")].map(el => Number(el.dataset.chapter));
  const chapterChanged = !roadmapKey || JSON.parse(roadmapKey)[1] !== path.index;
  roadmapKey = newRoadmapKey;
  $("campaign-roadmap").replaceChildren();
  for (const [i, ch] of path.chapters.entries()) {
    const card = document.createElement("details");
    card.dataset.chapter = String(i);
    card.open = chapterChanged ? i === path.index : expanded.includes(i);
    const title = document.createElement("summary");
    title.textContent = `${path.earned.includes(i) ? "✓" : i + 1} · ${ch.name}`;
    const purpose = document.createElement("p"); purpose.textContent = ch.purpose + " Reward: 30 influence, up to capacity.";
    const list = document.createElement("ul");
    for (const task of ch.steps) { const li = document.createElement("li"); li.textContent = `${path.earned.includes(i) || task.done ? "✓" : "○"} ${task.label}`; list.append(li); }
    card.append(title, purpose, list); $("campaign-roadmap").append(card);
  }
  }
  document.querySelectorAll("[data-build]").forEach(b => {
    const recommended = b.dataset.build === nextBuild;
    b.classList.toggle("recommended", recommended);
    b.style.order = recommended ? "-1" : "0";
    const requires=DEFS[b.dataset.build].unlock;
    b.disabled=!!requires&&!completed(s,requires).length;
    if(requires)b.querySelector(".building-purpose").textContent=buildingPurpose[b.dataset.build]+(b.disabled?" · Requires "+DEFS[requires].name:"");
  });
  $("goal-open").setAttribute("aria-label", nextAdvice?nextAdvice.title:nextBuild ? "Next objective: build " + DEFS[nextBuild].name : nextImprove ? "Next objective: improve " + DEFS[nextImprove].name : "View village progress");
  $("objective").textContent = goal + (nextBuild || nextImprove || nextHarvest ? " →" : "");
  $("village-objective").textContent = goal;
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
      (completed(s, "garden").length ? "garden planted" : "garden needed");
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
      title.textContent = DEFS[selected.type].name + (selected.upgraded ? " · Improved" : "");
      copy.textContent =
        DEFS[selected.type].desc +
        " " +
        (selected.progress < 1
          ? "Construction " + Math.floor(selected.progress * 100) + "%."
          : buildingStatus(s,selected)) +
        " Condition " +
        Math.floor(selected.hp) +
        "/" +
        DEFS[selected.type].hp +
        ".";
    } else if (selected.kind && state.sites?.includes(selected)) {
      title.textContent=selected.name;
      const cost=Object.entries(expeditionCost(selected)).map(([k,n])=>`${n} ${k}`).join(" + ") || "No supplies needed";
      copy.textContent=selected.done?"Explored. Its legacy belongs to your village.":selected.ordered?`Expedition underway · ${Math.floor(selected.progress*100)}%`: `${selected.kind === "rift" ? "Seal this rift to remove its extra raid pressure." : selected.kind === "relic" ? "Recover an old blessing: choose better industry, shelter, or defenses." : "Recover 28 stone and 12 timber."} ${cost}. A worker must travel here.`;
    } else {
      title.textContent = selected.name;
      copy.textContent =
        selected.state + ` · Health ${Math.floor(selected.health??100)}% · Energy ${Math.floor(selected.energy || 0)}% · Tool uses ${selected.toolUses || 0}` +
        (selected.carry
          ? " · Carrying " + selected.carry.n + " " + selected.carry.key
          : "");
    }
    if (selected.type && ["farm", "well"].includes(selected.type)) copy.textContent += ` Current yield: ${productionYield(s, selected)} per trip.`;
    if (selected.project) copy.textContent += ` ${selected.project.kind}: ${Math.floor(selected.project.progress * 100)}%.`;
    $("inspector").append(title, copy);
  }
  $("explore-site").hidden=!selected?.kind || !state.sites?.includes(selected);
  $("explore-site").disabled=!!selected?.done || !!selected?.ordered;
  $("demolish").hidden=!selected?.type;
  $("production-controls").hidden=!selected?.type || !RECIPES[selected.type] || selected.progress<1;
  $("prioritize-building").hidden=!selected?.type||(!PAUSABLE.has(selected.type)&&selected.progress>=1&&!selected.project);
  $("prioritize-building").textContent=selected?.priority?"★ Priority enabled · return to normal":"☆ Prioritize this building";
  $("pause-building").hidden=!selected?.type||!PAUSABLE.has(selected.type)||!!RECIPES[selected.type]||selected.progress<1;
  $("pause-building").textContent=selected?.paused?"Resume production":"Pause production";
  if(selected?.type && RECIPES[selected.type]) {
    $("production-toggle").textContent=selected.paused?"Resume production":"Pause production";
    if(document.activeElement!==$("production-target")) $("production-target").value=String(selected.target??RECIPES[selected.type].target);
    $("production-status").textContent=recipeStatus(s,selected);
  }
  deliverReadyConvoys();
  updateDepthUI(s);
  for(const role of Object.keys(ROLES))$("workers-"+role).textContent=s.people.filter(p=>workerRole(s,p)===role).length;
  $("workforce-summary").textContent=`${s.people.filter(p=>!workerRole(s,p)).length} general workers. Specialists prefer their trade, then help elsewhere. Changes apply after their current job; urgent food, water and care come first.`;
  const visit=caravan(s);
  const arrivalKey=s.seed+":"+s.region+":"+visit.visit;
  if(visit.open&&!visit.traded&&completed(s,"store").length&&caravanNoticeKey!==arrivalKey){caravanNoticeKey=arrivalKey;toast("A caravan is visiting. Open Village → Visiting caravan to trade.");}
  $("caravan-status").textContent=visit.open?visit.traded?"Trade completed. The next caravan arrives on day "+(visit.arriving+4)+".":`A caravan is visiting until day ${visit.leaves}. Choose one trade; a Keepshed and storage room are required.`:`Next caravan: day ${visit.arriving}. Traders stay two days and return every four days.`;
  for(const button of $("caravan-offers").children)button.disabled=!visit.open||visit.traded||!completed(s,"store").length;
  const upgrade = selected?.type && UPGRADES[selected.type];
  $("upgrade-building").hidden = !upgrade || selected.progress < 1 || !!selected.upgraded;
  $("upgrade-building").disabled = !!selected?.project || (upgrade && (s.stock.wood < upgrade.wood || s.stock.stone < upgrade.stone));
  if (upgrade) $("upgrade-building").textContent = `Improve · ${upgrade.benefit} · ${upgrade.wood} timber / ${upgrade.stone} stone`;
  $("repair-building").hidden = !selected?.type || selected.progress < 1 || selected.hp >= DEFS[selected.type].hp;
  $("repair-building").disabled = !!selected?.project || s.stock.wood < 4 || s.stock.stone < 2;
  const currentSeason = season(s);
  $("season-status").textContent = `${currentSeason.name} · ${currentSeason.next} in ${currentSeason.daysLeft} days. ${currentSeason.hint} Crop yield: ${Math.round(currentSeason.crop * 100)}%. Storage: ${capacity(s)} per resource.`;
  $("weather").textContent = s.enemies.length
    ? "⚑ " + s.enemies.length + " raiders approaching"
    : s.peaceful
      ? "✿ " + currentSeason.name
      : raidDay(s) && s.raided !== s.day
        ? "⚑ Tracks at the border · raid at dusk"
        : "✦ " + currentSeason.name + " · " + currentSeason.next + " in " + currentSeason.daysLeft + "d";
  $("weather").classList.toggle("alert", $("weather").textContent.startsWith("⚑"));
  $("village-weather").textContent = $("weather").textContent;
  const demand = dailyNeeds(s), wave = raidPlan(s), next = nextRaidDay(s);
  const kinds = Object.entries(MONSTERS).map(([key, m]) => {
    const n = wave.filter(e => e.kind === key).length; return n ? `${n} ${m.name}${n > 1 ? "s" : ""}` : "";
  }).filter(Boolean).join(", ");
  $("survival-status").textContent = `${rules(s).name} · ${["Sheltered", "Wild", "Hostile"][s.threat || 0]} region. Daily need: ${demand.food} food + ${demand.water} water. ` +
    (next === null ? "No monster raids." : `Day ${next} dusk: ${kinds}. Reserve at least ${wave.reduce((sum, m) => sum + Math.ceil(m.hp / 18), 0)} stone for tower shots, plus building costs. The estimate assumes every shot hits; defenses must cover the approach.`);
}
function draw() {
  if (!active || !state) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#1d3d36";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  camera.x = Math.round(camera.x * pixelRatio) / pixelRatio;
  camera.y = Math.round(camera.y * pixelRatio) / pixelRatio;
  ctx.translate(camera.x * pixelRatio, camera.y * pixelRatio);
  ctx.scale(camera.zoom * pixelRatio, camera.zoom * pixelRatio);
  ctx.imageSmoothingEnabled = false;
  artContext.clearRect(0, 0, artwork.width, artwork.height);
  scene(artContext, state, state.time);
  ctx.drawImage(artwork, 0, 0);
  if (hover && hover.x >= 0 && hover.y >= 0 && hover.x < W && hover.y < H) {
    const type = DEFS[tool] ? tool : null;
    const valid = type
      ? !canPlace(state, type, hover.x, hover.y, rotation)
      : true;
    if (type && candidate) {
      ctx.save(); ctx.globalAlpha = .55;
      structure(ctx, { type, x: hover.x, y: hover.y, rot: rotation, progress: 1, hp: DEFS[type].hp }, state.time);
      ctx.restore();
    }
    ctx.fillStyle = valid ? "#e3eabc33" : "#db817b66";
    ctx.strokeStyle = valid ? "#eff2c7" : "#ed9a8d";
    ctx.lineWidth = 1 / camera.zoom;
    if (POWERS[tool]) {
      ctx.beginPath();
      ctx.arc(
        (hover.x + 0.5) * TILE,
        (hover.y + 0.5) * TILE,
        POWERS[tool].radius * TILE,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();
    }
    if (stroke) {
      ctx.fillStyle = "#e5bc7177";
      for (const i of stroke.marks) {
        ctx.fillRect((i % W) * TILE, Math.floor(i / W) * TILE, TILE, TILE);
      }
    }
    const marks = [];
    if (tool === "harvest") {
      const half = Math.floor(brush / 2);
      for (let dy = -half; dy <= half; dy++)
        for (let dx = -half; dx <= half; dx++) marks.push([dx, dy]);
    }
    for (const [dx, dy] of type
      ? footprint(type, rotation)
      : marks.length
        ? marks
        : [[0, 0]]) {
      const x = (hover.x + dx) * TILE,
        y = (hover.y + dy) * TILE;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
  if (linePreview) {
    ctx.fillStyle = linePreview.reason ? "#d56e6577" : "#e9d69c77";
    ctx.strokeStyle = linePreview.reason ? "#ff9a8b" : "#fff0be";
    ctx.lineWidth = 1 / camera.zoom;
    for (const p of linePreview.cells) {
      ctx.fillRect(p.x * TILE, p.y * TILE, TILE, TILE);
      ctx.strokeRect(p.x * TILE, p.y * TILE, TILE, TILE);
    }
  }
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  for (const e of state.effects) {
    if (!e.text) continue;
    const text = String(e.text).replace("wood", "timber");
    const width = ctx.measureText(text).width + 12;
    const x = Math.round((camera.x + e.x * TILE * camera.zoom) * pixelRatio) / pixelRatio;
    const y = Math.round((camera.y + e.y * TILE * camera.zoom - 24 - (2 - e.life) * 14) * pixelRatio) / pixelRatio;
    ctx.fillStyle = "#102229";
    ctx.fillRect(x - 6, y - 12, width, 24);
    ctx.fillStyle = "#fff0be";
    ctx.fillText(text, x, y);
  }
}
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000 || 0);
  last = now;
  if (
    active &&
    state &&
    !paused &&
    !document.hidden &&
    !document.querySelector("dialog[open]")
  ) {
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
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    save();
    audio?.suspend();
  } else {
    last = performance.now();
    if (sound) audio?.resume();
  }
});
window.addEventListener("game-save-request", (event) => {
  if (!save()) event.preventDefault();
});
$("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
    else toast("Install to your Home Screen for an app-sized view.");
  } catch {
    toast("Use the Home Screen app for a full-screen view.");
  }
};
$("export-save").onclick = () => {
  if (!state?.people.length) {
    toast("Start a village first.");
    return;
  }
  const url = URL.createObjectURL(
    new Blob([serialize(state)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "destiny-village-day-" + state.day + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("import-save").onclick = () => $("import-file").click();
$("import-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw Error("too large");
    const imported = restore(await file.text());
    if (saved && villageKey(saved) === villageKey(imported) && !confirm("Restore this village from the backup? Its current progress will be replaced."))
      return;
    if (!save()) return;
    $("menu").close();
    enter(imported);
    save(true);
  } catch {
    toast(
      "That file is not a valid village save. Your current village is unchanged.",
    );
  } finally {
    e.target.value = "";
  }
};
for (const m of Object.values(MONSTERS)) {
  const p = document.createElement("p"); p.textContent = `${m.name} · ${m.hp} base health · ${m.damage} base damage. ${m.desc}`; $("balance-guide").append(p);
}
const economyGuide = document.createElement("p");
economyGuide.textContent = "On Survival, each villager needs 2 food and 1.5 water per day. A field grows 8 food in 20 seconds of work (10 in lowlands, 7 in highlands); a well draws 8 water in 14 seconds. Delivery travel adds time. Add farms as you grow. A Commonpot saves 30% food; gardens help morale. Timber deposits yield 8, stone 7. Towers spend 1 stone per 18-damage shot. Brutes and skulkers join later waves; regional danger adds up to 2 monsters, within the difficulty cap.";
$("balance-guide").append(economyGuide);
readSave();
if (saved?.worldSeed) { $("seed").value = saved.worldSeed; $("difficulty").value = saved.difficulty; scouted = saved.territory; }
generate();
requestAnimationFrame(frame);

const buildingRail = $("buildings");
let railDrag = null, railMoved = false;
buildingRail.addEventListener("pointerdown", e => {
  railMoved = false;
  if (e.pointerType !== "touch" && e.button === 0) railDrag = {id: e.pointerId, x: e.clientX, left: buildingRail.scrollLeft};
});
window.addEventListener("pointermove", e => {
  if (!railDrag || e.pointerId !== railDrag.id) return;
  const dx = e.clientX - railDrag.x;
  if (Math.abs(dx) > 6) { railMoved = true; buildingRail.setPointerCapture(e.pointerId); }
  if (railMoved) { buildingRail.scrollLeft = railDrag.left - dx; e.preventDefault(); }
});
window.addEventListener("pointerup", () => { railDrag = null; });
window.addEventListener("pointercancel", () => { railDrag = null; });
buildingRail.addEventListener("click", e => { if (railMoved) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);

function inspectSite(site) {
  selected=site;setTool("inspect");
  camera.x=canvas.clientWidth/2-(site.x+.5)*TILE*camera.zoom;
  camera.y=canvas.clientHeight/2-(site.y+.5)*TILE*camera.zoom;
  openSheet("inspect-sheet");update();
}
$("explore-site").onclick=()=>{toast(exploreSite(state,selected)||"Expedition queued. Watch your worker travel to the site.");save();update();};
$("production-toggle").onclick=()=>{selected.paused=!selected.paused;save();update();};
$("prioritize-building").onclick=()=>{selected.priority=!selected.priority;save();update();};
$("pause-building").onclick=()=>{selected.paused=!selected.paused;save();update();};
$("production-target").onchange=e=>{selected.target=Number(e.target.value);save();update();};
$("camp-gather").onchange=e=>{state.campGather=e.target.checked;save();};
$("blessings").onclick=e=>{const button=e.target.closest("[data-blessing]");if(button){toast(chooseBlessing(state,button.dataset.blessing)||"Your village has received its blessing.");save();update();}};
$("exploration-sites").onclick=e=>{const button=e.target.closest("[data-site]");if(button){const site=state.sites.find(v=>v.id===Number(button.dataset.site));if(site)inspectSite(site);}};
$("worker-roster").onclick=e=>{const button=e.target.closest("[data-person]");if(button){selected=state.people.find(v=>v.id===Number(button.dataset.person));setTool("inspect");openSheet("inspect-sheet");update();}};
let depthKey="";
function updateDepthUI(s) {
  const status=depthSummary(s),f=status.frontier;
  $("camp-gather").checked=s.campGather;
  if(document.activeElement!==$("tool-reserve"))$("tool-reserve").value=String(s.toolReserve);
  $("convoy-status").textContent=s.convoys.map(c=>`${c.targetName}: ${Math.ceil(c.remaining)}s remaining`).join(" · ") || "No convoys traveling.";
  $("settlement-pulse").textContent=`${status.working} working · ${status.resting} resting · ${status.tools} equipped. Food reserve ${status.foodDays} days; water ${status.waterDays} days.`;
  $("crafted-stock").textContent=`${s.stock.planks} planks · ${s.stock.tools} spare tools · ${s.stock.meals} meals` + (Object.values(s.pendingSupplies).some(n=>n>0)?` · ${Object.values(s.pendingSupplies).reduce((a,b)=>a+b,0)} convoy supplies waiting for storage`:"");
  $("frontier-status").textContent=f.site?`${f.warded?"Warded frontier":s.peaceful?"Quiet frontier":"The Hollow is spreading"}. ${f.pressure?`+${f.pressure} monsters per raid.`:"No extra monsters yet."} A nearby Wishing spire suppresses it; an expedition seals it permanently.`:"The rift is sealed. Your village reclaimed the frontier.";
  $("blessings").hidden=!s.relicReady || !!s.blessing;
  $("blessing-status").textContent=s.blessing?`Keeper's blessing: ${s.blessing}.` : "Explore the old keeper shrine to choose a permanent blessing.";
  const key=JSON.stringify([s.seed,s.sites?.map(v=>[v.id,v.done,v.ordered]),s.people.map(p=>[p.id,p.state,Math.floor(p.energy/10),Math.floor(p.health/10),!!p.toolUses]),s.buildings.filter(b=>RECIPES[b.type]).map(b=>[b.id,b.type,recipeStatus(s,b)])]);
  if(key===depthKey)return;depthKey=key;
  $("exploration-sites").replaceChildren();
  for(const site of s.sites||[]) {const b=document.createElement("button");b.dataset.site=site.id;b.textContent=`${site.done?"✓":site.ordered?"⌛":"◇"} ${site.name}`;$("exploration-sites").append(b);}
  $("industry-status").replaceChildren();
  for(const b of s.buildings.filter(b=>RECIPES[b.type])) {const p=document.createElement("p");p.textContent=`${DEFS[b.type].name}: ${b.progress<1?"Under construction":recipeStatus(s,b)}`;$("industry-status").append(p);}
  $("worker-roster").replaceChildren();
  for(const p of s.people){const b=document.createElement("button");b.dataset.person=p.id;b.textContent=`${p.name} · ${p.state} · ${Math.floor(p.health)}% health · ${Math.floor(p.energy)}% energy${p.toolUses?" · equipped":""}`;$("worker-roster").append(b);}
}

$("tool-reserve").onchange=e=>{state.toolReserve=Number(e.target.value);save();};
function convoyDestinations() {
  if(!state?.worldSeed || !Number.isInteger(state.territory))return [];
  return Object.entries(villages()).flatMap(([key,raw])=>{try{const v=restore(raw);return v.worldSeed===state.worldSeed && v.difficulty===state.difficulty && TERRITORIES[state.territory].neighbors.includes(v.territory) && v.people.length && !v.lost ? [{key,name:v.territoryName||TERRITORIES[v.territory].name}] : [];}catch{return [];}});
}
$("convoy-target").onfocus=()=> {
  const previous=$("convoy-target").value;$("convoy-target").replaceChildren();
  const choices=convoyDestinations();
  for(const entry of choices){const option=document.createElement("option");option.value=entry.key;option.textContent=entry.name;$("convoy-target").append(option);}
  if(choices.some(v=>v.key===previous))$("convoy-target").value=previous;
  if(!choices.length){const option=document.createElement("option");option.textContent="Settle a neighboring region first";option.value="";$("convoy-target").append(option);}
};
$("send-convoy").onclick=()=> {
  const choice=convoyDestinations().find(v=>v.key===$("convoy-target").value);
  if(!choice){toast("Choose a neighboring saved village in this world and difficulty.");return;}
  toast(queueConvoy(state,choice.key,choice.name,crypto.randomUUID())||"Convoy dispatched. Supplies arrive in 30 seconds of village time.");save();update();
};
function deliverReadyConvoys() {
  if(!state?.convoys?.some(c=>c.remaining===0))return;
  for(const convoy of [...state.convoys].filter(c=>c.remaining===0)) {
    try {
      const all=villages();if(!all[convoy.targetKey])continue;
      const target=restore(all[convoy.targetKey]);
      if(target.worldSeed!==state.worldSeed || target.difficulty!==state.difficulty || !TERRITORIES[state.territory]?.neighbors.includes(target.territory))continue;
      const source=JSON.parse(serialize(state));
      applyConvoy(source,source.convoys.find(c=>c.id===convoy.id),target);
      all[convoy.targetKey]=serialize(target);all[villageKey(source)]=serialize(source);
      // Both villages and the delivery receipt commit in a single storage write.
      localStorage.setItem(LIBRARY,JSON.stringify(all));
      state.stock=source.stock;state.convoys=source.convoys;state.events=source.events;
      saved=restore(serialize(state));
      try{localStorage.setItem(KEY,serialize(state));}catch{}
      toast("Supply convoy arrived at "+convoy.targetName+".");
    } catch { $("convoy-status").textContent="Delivery is waiting for save storage. Your convoy is retained."; }
  }
}

window.addEventListener("storage",e=> {
  if(e.key!==LIBRARY || !state)return;
  try{const raw=JSON.parse(e.newValue||"{}")[villageKey(state)];if(raw){reconcileConvoys(state,restore(raw));update();}}catch{}
});
