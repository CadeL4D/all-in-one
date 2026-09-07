// UI layer: HUD binding, build sheet, jobs panel, inspector, toasts, and
// the contextual hint system (pillar 10 - RtR's opaque onboarding is its
// #1 flaw; we replace it with one-line, first-time-only hints).
import * as B from "./balance.js";
import * as bd from "./buildings.js";

const RES_STYLE = {
  wood: { color: "#b98a54", label: "Wood" },
  food: { color: "#9cc45c", label: "Food" },
  water: { color: "#7fb3de", label: "Water" },
};

const HINTS = {
  welcome:
    "Drag to look around, pinch to zoom. Your villagers live here — they find their own work.",
  well: "Villagers are getting thirsty. Open Build and place a Well — clean water keeps everyone going.",
  food: "Hunger is setting in. Build a Farm — farmers plant and harvest on their own once you give them the job.",
  nomad: "A wanderer is walking in from the wilds. They'll join if you have supplies and a job to offer.",
  jobs: "New building up! Open Jobs to set how many villagers work each place.",
  storage:
    "Storage is nearly full — your workers will start idling. Build a Storehouse to keep them busy.",
  night:
    "Night is falling. Tired villagers sleep at home — build Homes so they recover by morning.",
  homeless:
    "Someone is sleeping on the ground. Homes give rest, and housed couples raise children.",
  unemployed:
    "Some villagers have no work. Raise job counts in Jobs, or build another workplace.",
};

export function createUI(game) {
  // game: {getState, commands, renderer, flyTo(x,y), saveNow()}
  const $ = (id) => document.getElementById(id);
  const ui = {
    hintShown: loadHints(),
    activeHint: null,
    mode: "look", // look | build | dismantle
    placing: null, // {type, x, y, valid}
    dismantleTarget: null,
    selected: null,
  };

  const hintEl = $("hint");
  let hintTimer = null;
  function showHint(key) {
    if (ui.hintShown[key] || ui.activeHint) return;
    ui.hintShown[key] = true;
    saveHints(ui.hintShown);
    ui.activeHint = key;
    hintEl.innerHTML = `<span class="hint-tag">HINT</span><span>${HINTS[key]}</span>`;
    const dismiss = document.createElement("button");
    dismiss.textContent = "×";
    dismiss.setAttribute("aria-label", "Dismiss hint");
    dismiss.onclick = hideHint;
    hintEl.appendChild(dismiss);
    hintEl.hidden = false;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, 12000);
  }
  function hideHint() {
    hintEl.hidden = true;
    ui.activeHint = null;
    clearTimeout(hintTimer);
  }

  // ---- HUD ----
  function renderResources(state) {
    const cap = bd.storageCap(state);
    const pop = state.villagers.length;
    const housing = bd.housingCap(state);
    const chips = [];
    for (const res of B.RESOURCES) {
      const value = Math.floor(state.resources[res]);
      const style = RES_STYLE[res];
      const warn = value >= cap;
      chips.push(
        `<span class="res-chip${warn ? " warn" : ""}"><i class="res-dot" style="background:${style.color}"></i><b>${value}</b><small>/${cap} ${style.label}</small></span>`,
      );
    }
    chips.push(
      `<span class="res-chip"><i class="res-dot" style="background:#e8c39a"></i><b>${pop}</b><small>/ ${housing} housed</small></span>`,
    );
    const jobs = bd.jobSlots(state);
    const employed = Object.keys(B.JOBS).reduce(
      (a, j) => a + bd.employedCount(state, j),
      0,
    );
    const idle = state.villagers.filter((v) => v.age === "adult" && !v.job).length;
    chips.push(
      `<span class="res-chip${idle > 0 ? " warn" : ""}"><b>${employed}</b><small>working · ${idle} idle</small></span>`,
    );
    $("resources").innerHTML = chips.join("");
  }

  function renderClock(state, phase) {
    $("day").textContent = `Day ${phase.day}`;
    $("clockphase").textContent = phase.label;
    $("day-progress").style.width = `${Math.round(phase.progress * 100)}%`;
  }

  function renderSpeed(state, speed) {
    document.querySelectorAll(".speed button").forEach((btn) => {
      const s = btn.dataset.speed ? Number(btn.dataset.speed) : null;
      if (btn.id === "pause") btn.classList.toggle("active", speed === 0);
      else btn.classList.toggle("active", s === speed);
    });
  }

  // ---- Build sheet ----
  function buildCards() {
    const grid = $("build-cards");
    grid.className = "build-grid";
    const state = game.getState();
    const cap = bd.storageCap(state);
    grid.innerHTML = "";
    for (const [type, def] of Object.entries(B.BUILDINGS)) {
      if (type === "camp") continue;
      const count = state.buildings.filter((b) => b.type === type).length;
      const card = document.createElement("button");
      card.className = "build-card";
      const cost = Object.entries(def.cost)
        .filter(([, n]) => n > 0)
        .map(([r, n]) => `${n} ${RES_STYLE[r].label.toLowerCase()}`)
        .join(" + ");
      card.innerHTML = `<b>${def.name}</b><span class="cost">${cost || "free"}</span><small>${buildBlurb(type, def)}<br/>Built: ${count}</small>`;
      card.onclick = () => {
        ui.mode = "build";
        ui.placing = { type, x: null, y: null, valid: false };
        closeSheets();
        game.enterPlacement(type);
        $("placement-name").textContent = def.name;
        updatePlacementInfo(state, type);
        $("placement").hidden = false;
      };
      grid.appendChild(card);
    }
    const dm = document.createElement("button");
    dm.className = "build-card";
    dm.innerHTML = `<b>Dismantle</b><span class="cost">${Math.round(B.DISMANTLE_REFUND * 100)}% refund</span><small>Tap a building to take it down and reclaim part of its cost.</small>`;
    dm.onclick = () => {
      ui.mode = "dismantle";
      closeSheets();
      game.enterDismantle();
    };
    grid.appendChild(dm);
  }

  function buildBlurb(type, def) {
    const bits = [];
    if (def.houses) bits.push(`Houses ${def.houses} villagers.`);
    if (type === "well") bits.push("Slowly supplies clean water.");
    if (type === "farm") bits.push("Farmers grow crops here.");
    if (type === "sawpit") bits.push("Woodcutters chop nearby trees.");
    if (type === "storehouse") bits.push(`+${def.storage} storage space.`);
    for (const [job, n] of Object.entries(def.jobs))
      bits.push(`${n} ${B.JOBS[job].name.toLowerCase()} job${n > 1 ? "s" : ""}.`);
    return bits.join(" ");
  }

  function updatePlacementInfo(state, type) {
    const info = $("placement-info");
    const def = B.BUILDINGS[type];
    const cost = Object.entries(def.cost)
      .filter(([, n]) => n > 0)
      .map(([r, n]) => `${n} ${RES_STYLE[r].label.toLowerCase()}`)
      .join(" + ");
    if (!ui.placing || ui.placing.x === null) {
      info.textContent = `Drag the ghost, then confirm · ${cost}`;
      info.className = "";
      $("confirm-placement").disabled = true;
      return;
    }
    const check = bd.canPlace(state, type, ui.placing.x, ui.placing.y);
    ui.placing.valid = check.ok;
    info.textContent = check.ok ? `${cost} — builders will haul it` : check.reason;
    info.className = check.ok ? "" : "bad";
    $("confirm-placement").disabled = !check.ok;
  }

  // ---- Jobs sheet ----
  function renderJobs() {
    const state = game.getState();
    const slots = bd.jobSlots(state);
    const rows = $("job-rows");
    rows.innerHTML = "";
    for (const [job, meta] of Object.entries(B.JOBS)) {
      const employed = bd.employedCount(state, job);
      const desired = state.jobCounts[job] ?? 0;
      const row = document.createElement("div");
      row.className = "job-row";
      row.innerHTML = `
        <span class="job-swatch" style="background:${meta.color}"></span>
        <span class="job-name">${meta.name}<small>${employed} working · ${slots[job]} slots</small></span>
        <button aria-label="Fewer ${meta.name}s" ${desired <= 0 ? "disabled" : ""}>−</button>
        <span class="job-count">${desired}<small>/${slots[job]}</small></span>
        <button aria-label="More ${meta.name}s" ${desired >= slots[job] ? "disabled" : ""}>+</button>`;
      const [minus, plus] = row.querySelectorAll("button");
      minus.onclick = () => game.setJob(job, -1);
      plus.onclick = () => game.setJob(job, +1);
      rows.appendChild(row);
    }
    const idle = state.villagers.filter((v) => v.age === "adult" && !v.job).length;
    const kids = state.villagers.filter((v) => v.age === "child").length;
    $("jobs-unemployed").textContent = `${state.villagers.length} villagers · ${idle} unemployed · ${kids} child${kids === 1 ? "" : "ren"}`;
  }

  // ---- Inspector ----
  function inspect(selection) {
    const state = game.getState();
    const body = $("inspector-body");
    if (selection.kind === "villager") {
      const v = state.villagers.find((v2) => v2.id === selection.id);
      if (!v) return closeInspector();
      $("inspector-title").textContent = `${v.name}${v.age === "child" ? " (child)" : ""}`;
      const job = v.job ? B.JOBS[v.job].name : v.age === "child" ? "Growing up" : "Unemployed";
      const home = state.buildings.find((b) => b.id === v.home);
      body.innerHTML = `
        <div class="insp-rows">
          <div class="insp-row"><span>Doing</span><b>${v.activity}</b></div>
          <div class="insp-row"><span>Job</span><b>${job}</b></div>
          <div class="insp-row"><span>Home</span><b>${home ? B.BUILDINGS[home.type].name : "none"}</b></div>
          ${v.carrying ? `<div class="insp-row"><span>Carrying</span><b>${RES_STYLE[v.carrying].label}</b></div>` : ""}
        </div>
        <div style="margin-top:10px">
          ${needBar("Food", v.hunger)}${needBar("Water", v.thirst)}${needBar("Energy", v.energy)}${needBar("Health", v.health)}
        </div>`;
    } else if (selection.kind === "building") {
      const b = state.buildings.find((b2) => b2.id === selection.id);
      if (!b) return closeInspector();
      const def = B.BUILDINGS[b.type];
      $("inspector-title").textContent = def.name;
      const jobs = Object.entries(def.jobs)
        .map(([j, n]) => `${n} ${B.JOBS[j].name.toLowerCase()}${n > 1 ? "s" : ""}`)
        .join(", ");
      const rows = [];
      if (!b.complete) {
        const needed = def.cost.wood ?? 0;
        rows.push(["Site", `${Math.round((b.workDone / b.workNeeded) * 100)}% built`]);
        rows.push(["Supplies", `${b.delivered}/${needed} wood delivered`]);
      }
      if (jobs) rows.push(["Jobs", jobs]);
      if (def.houses) rows.push(["Residents", `${b.occupants}/${def.houses}`]);
      if (def.storage) rows.push(["Storage", `+${def.storage} to village cap`]);
      if (b.type === "camp") rows.push(["Build range", `${def.radius} tiles`]);
      body.innerHTML = `<div class="insp-rows">${rows
        .map(([k, v2]) => `<div class="insp-row"><span>${k}</span><b>${v2}</b></div>`)
        .join("")}</div>
        ${b.type !== "camp" ? `<div class="insp-actions"><button class="danger" id="insp-dismantle">Dismantle (${Math.round(B.DISMANTLE_REFUND * 100)}% refund)</button></div>` : ""}`;
      const dm = $("insp-dismantle");
      if (dm)
        dm.onclick = () =>
          game.confirm(
            `Tear down the ${def.name}?`,
            `You'll reclaim part of its wood.`,
            () => {
              game.dismantle(b.id);
              closeInspector();
            },
          );
    }
    ui.selected = selection;
    game.renderer.view.selected = selection;
    $("inspector").hidden = false;
  }
  function needBar(label, value) {
    const v = Math.round(value);
    return `<div class="need"><span>${label}</span><span class="bar"><i class="${v < 25 ? "low" : ""}" style="width:${v}%"></i></span><b>${v}</b></div>`;
  }
  function closeInspector() {
    $("inspector").hidden = true;
    ui.selected = null;
    game.renderer.view.selected = null;
  }

  // ---- Toasts ----
  const EVENT_TEXT = {
    "nomad-spawned": (e) => [`A wanderer approaches`, `${e.name} — tap to follow`, "info"],
    "nomad-joined": (e) => [`${e.name} joined the village`, "They'll find work or rest.", "good"],
    birth: (e) => [`${e.name} was born`, "A new life at home.", "good"],
    "grew-up": (e) => [`${e.name} grew up`, "Ready for work.", "good"],
    died: (e) => [
      `${e.name} died of ${e.cause}`,
      "Tap to see where. Keep food and water flowing.",
      "bad",
    ],
    built: (e) => [`${e.name} finished`, "Villagers are moving in.", "good"],
    "storage-full": () => ["Storage is full", "Workers will idle — build a Storehouse.", "bad"],
    dusk: () => ["Dusk", "The day is ending. Nights are for resting.", "info"],
  };
  function toast(title, sub, kind, fly) {
    const box = $("toasts");
    if (box.children.length >= 3) box.firstChild.remove();
    const el = document.createElement("div");
    el.className = `toast${kind === "bad" ? " bad" : ""}`;
    el.innerHTML = `<span><b>${title}</b>${sub ? `<br/><small>${sub}</small>` : ""}</span>`;
    if (fly) {
      el.style.cursor = "pointer";
      el.onclick = () => {
        game.flyTo(fly.x, fly.y);
        el.remove();
      };
    }
    box.appendChild(el);
    setTimeout(() => el.remove(), kind === "bad" ? 9000 : 6000);
  }

  function processEvents(state) {
    for (const e of state.events.splice(0)) {
      const fn = EVENT_TEXT[e.type];
      if (fn) {
        const [t, s, k] = fn(e);
        toast(t, s, k, "x" in e ? e : null);
      }
      if (e.type === "nomad-spawned") showHint("nomad");
      if (e.type === "storage-full") showHint("storage");
      if (e.type === "dusk") showHint("night");
      if (e.type === "dawn") game.saveNow();
    }
  }

  // Trigger hints from world observation, ~1×/second.
  function observeHints(state) {
    showHint("welcome");
    if (!ui.hintShown.well || !ui.hintShown.food) {
      const wells = state.buildings.some((b) => b.type === "well" && b.complete);
      const farms = state.buildings.some((b) => b.type === "farm");
      const thirsty = state.villagers.some((v) => v.thirst < 55);
      const hungry = state.villagers.some((v) => v.hunger < 45);
      if (!wells && thirsty) showHint("well");
      if (!farms && hungry) showHint("food");
    }
    if (!ui.hintShown.homeless) {
      const homeless = state.villagers.some(
        (v) => v.task && v.task.kind === "sleep" && !v.home,
      );
      if (homeless) showHint("homeless");
    }
    if (!ui.hintShown.unemployed) {
      const slots = bd.jobSlots(state);
      const desired = Object.keys(B.JOBS).reduce(
        (a, j) => a + (state.jobCounts[j] ?? 0),
        0,
      );
      const employed = Object.keys(B.JOBS).reduce(
        (a, j) => a + bd.employedCount(state, j),
        0,
      );
      if (employed < state.villagers.length && employed >= desired && slots.builder > 0)
        showHint("unemployed");
    }
    const complete = state.buildings.filter((b) => b.complete).length;
    if (complete >= 3) showHint("jobs");
  }

  function closeSheets() {
    $("build-sheet").hidden = true;
    $("jobs-sheet").hidden = true;
    closeInspector();
  }

  // ---- Wiring ----
  $("build-open").onclick = () => {
    const sheet = $("build-sheet");
    const opening = sheet.hidden;
    game.exitModes();
    closeSheets();
    if (opening) {
      buildCards();
      sheet.hidden = false;
      setDock("build-open");
      ui.mode = "build-menu";
    } else setDock("look");
  };
  $("jobs-open").onclick = () => {
    const sheet = $("jobs-sheet");
    const opening = sheet.hidden;
    game.exitModes();
    closeSheets();
    if (opening) {
      renderJobs();
      sheet.hidden = false;
      setDock("jobs-open");
    } else setDock("look");
  };
  document.querySelectorAll(".sheet-close").forEach((b) => (b.onclick = closeSheet));
  function closeSheet() {
    closeSheets();
    setDock("look");
  }
  function setDock(active) {
    ["look", "build-open", "jobs-open"].forEach((id) =>
      $(id).classList.toggle("active", id === active),
    );
  }
  $("look").onclick = () => {
    game.exitModes();
    closeSheet();
    setDock("look");
  };
  $("cancel-placement").onclick = () => game.exitModes();
  $("confirm-placement").onclick = () => game.confirmPlacement();

  $("help").onclick = () => $("help-dialog").showModal();
  $("help-close").onclick = () => $("help-dialog").close();
  $("open-menu").onclick = () => $("menu-dialog").showModal();
  $("menu-close").onclick = () => $("menu-dialog").close();
  $("menu-help").onclick = () => {
    $("menu-dialog").close();
    $("help-dialog").showModal();
  };
  $("menu-save").onclick = () => {
    game.saveNow(true);
    $("save-note").textContent = "Saved just now. Dawn autosaves too.";
    setTimeout(() => ($("save-note").textContent = "Progress saves itself at dawn."), 3000);
  };
  $("menu-restart").onclick = () =>
    game.confirm(
      "Start a new island?",
      "This village and everyone in it will be gone. Fresh island, fresh start.",
      () => {
        $("menu-dialog").close();
        game.restart();
      },
    );

  // Public: called every frame (cheap parts) + slower tick (1 Hz).
  ui.frame = (state, phase, speed) => {
    renderClock(state, phase);
    renderSpeed(state, speed);
  };
  ui.slow = (state) => {
    renderResources(state);
    processEvents(state);
    observeHints(state);
    if (!$("jobs-sheet").hidden) renderJobs();
    if (ui.placing) updatePlacementInfo(state, ui.placing.type);
  };
  ui.inspect = inspect;
  ui.closeInspector = closeInspector;
  ui.closeSheets = closeSheets;
  ui.showHint = showHint;
  ui.setDock = setDock;
  ui.updatePlacement = (state) => {
    if (ui.placing) updatePlacementInfo(state, ui.placing.type);
  };
  return ui;
}

const HINTS_KEY = "ruins-hints-v1";
function loadHints() {
  try {
    return JSON.parse(localStorage.getItem(HINTS_KEY)) ?? {};
  } catch {
    return {};
  }
}
function saveHints(hints) {
  try {
    localStorage.setItem(HINTS_KEY, JSON.stringify(hints));
  } catch {
    /* private mode */
  }
}
