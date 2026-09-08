// UI layer: HUD binding, build sheet, jobs panel, inspector, toasts, and
// the contextual hint system (pillar 10 - RtR's opaque onboarding is its
// #1 flaw; we replace it with one-line, first-time-only hints).
import * as B from "./balance.js";
import * as bd from "./buildings.js";

const RES_STYLE = {
  wood: { color: "#b98a54", label: "Wood" },
  food: { color: "#9cc45c", label: "Food" },
  water: { color: "#7fb3de", label: "Water" },
  stone: { color: "#a7adb3", label: "Stone" },
};

// Build menu categories (bottom sheet, mirroring RtR's build order).
const BUILD_TABS = [
  { key: "village", label: "Village", types: ["home", "farm", "well", "sawpit", "storehouse", "quarry"] },
  { key: "defense", label: "Defense", types: ["fence", "stoneWall", "gate", "tower"] },
];

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
  corruption:
    "The blight has landed. It spreads every day — wall your village and raise a Sentry Tower before the night raids begin.",
  raid:
    "Raiders march on your camp at night. They take any open path and never touch walls — so leave ONE gap in your wall and let the Sentry Tower greet them.",
  quarry:
    "Stone walls need stone. Build a Quarry near the gray rocks and stonecutters will mine it on their own.",
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
    // Corruption Threat (doc 04: red bar in the top UI). It rises only when
    // the corruption is boxed in - never with wealth or population.
    const threat = state.corruption?.threat ?? 0;
    $("threat-fill").style.width = `${Math.round((threat / B.THREAT_MAX) * 100)}%`;
    $("threat").classList.toggle("hot", threat > 0);
  }

  function renderSpeed(state, speed) {
    document.querySelectorAll(".speed button").forEach((btn) => {
      const s = btn.dataset.speed ? Number(btn.dataset.speed) : null;
      if (btn.id === "pause") btn.classList.toggle("active", speed === 0);
      else btn.classList.toggle("active", s === speed);
    });
  }

  // ---- Build sheet (categorized: village life / defense) ----
  function buildCards() {
    const grid = $("build-cards");
    grid.className = "build-grid";
    const state = game.getState();
    grid.innerHTML = "";
    for (const tab of BUILD_TABS) {
      const head = document.createElement("h3");
      head.className = "build-tab";
      head.textContent = tab.label;
      grid.appendChild(head);
      for (const type of tab.types) {
        const def = B.BUILDINGS[type];
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
          ui.placing = { type, x: null, y: null, valid: false, run: null };
          closeSheets();
          game.enterPlacement(type);
          $("placement-name").textContent = def.name;
          updatePlacementInfo(state, type);
          $("placement").hidden = false;
        };
        grid.appendChild(card);
      }
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
    if (type === "quarry") bits.push("Stonecutters mine nearby rocks.");
    if (type === "storehouse") bits.push(`+${def.storage} storage space.`);
    if (type === "fence") bits.push("Drag to paint a run of fence. Raiders chew it, but slowly.");
    if (type === "stoneWall") bits.push("Drag to paint. Twice the fence at shrugging off raids.");
    if (type === "gate") bits.push("Your villagers pass; raiders must break it.");
    if (type === "tower") bits.push(`Shoots raiders up to ${def.tower.range} tiles away, over walls.`);
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
    const wall = !!def.wall;
    const painted = ui.placing?.run?.size ?? 0;
    if (!ui.placing || (ui.placing.x === null && !painted)) {
      info.textContent = wall
        ? `Drag to paint a run of ${def.name.toLowerCase()} · ${cost} each`
        : `Drag the ghost, then confirm · ${cost}`;
      info.className = "";
      $("confirm-placement").disabled = true;
      return;
    }
    if (wall) {
      const run = ui.placing.run;
      if (!run.size) {
        info.textContent = "Drag across the map to paint the wall";
        info.className = "";
        $("confirm-placement").disabled = true;
        return;
      }
      info.textContent = `${run.size} section${run.size === 1 ? "" : "s"} painted · ${cost} each — confirm to raise them`;
      info.className = "";
      $("confirm-placement").disabled = false;
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
      if (def.corrupted) rows.push(["What it is", "The corruption's spawn point. Destroy it to starve the night raids."]);
      if (!b.complete) {
        const missing = bd.nextMissingRes(b);
        rows.push(["Site", `${Math.round((b.workDone / b.workNeeded) * 100)}% built`]);
        rows.push(["Supplies", `${b.delivered}/${Object.values(def.cost).reduce((a, n) => a + n, 0)} hauled${missing ? ` (needs ${missing})` : ""}`]);
      }
      if (def.tower) rows.push(["Range", `${def.tower.range} tiles, fires over walls`]);
      if (jobs) rows.push(["Jobs", jobs]);
      if (def.houses) rows.push(["Residents", `${b.occupants}/${def.houses}`]);
      if (def.storage) rows.push(["Storage", `+${def.storage} to village cap`]);
      if (b.type === "camp") rows.push(["Build range", `${def.radius} tiles`]);
      rows.push(["Health", `${Math.max(0, Math.ceil(b.hp))}/${def.hp}`]);
      body.innerHTML = `<div class="insp-rows">${rows
        .map(([k, v2]) => `<div class="insp-row"><span>${k}</span><b>${v2}</b></div>`)
        .join("")}</div>
        ${b.type !== "camp" && !def.corrupted ? `<div class="insp-actions"><button class="danger" id="insp-dismantle">Dismantle (${Math.round(B.DISMANTLE_REFUND * 100)}% refund)</button></div>` : ""}`;
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
    died: (e) =>
      e.cause === "raiders"
        ? [`${e.name} was killed by raiders`, "Tap to see where. Walls and towers defend.", "bad"]
        : [
            `${e.name} died of ${e.cause}`,
            "Tap to see where. Keep food and water flowing.",
            "bad",
          ],
    built: (e) => [`${e.name} finished`, "Villagers are moving in.", "good"],
    "storage-full": () => ["Storage is full", "Workers will idle — build a Storehouse.", "bad"],
    dusk: () => ["Dusk", "The day is ending. Nights are for resting.", "info"],
    "corruption-spawned": (e) => [
      "The blight has landed",
      "Purple corruption spreads in the wilds — tap to see it.",
      "bad",
    ],
    "nest-formed": (e) => [
      "A corrupted nest grew",
      "Monsters pour from it at night. Tap to look.",
      "bad",
    ],
    "nest-destroyed": (e) => ["Nest destroyed", "The night raids starve for a while.", "good"],
    "raid-start": (e) => [
      `Night raid — ${e.count} monster${e.count === 1 ? "" : "s"}`,
      "They march on the camp. Hold the walls.",
      "bad",
    ],
    "monsters-retreat": () => ["Dawn", "The surviving raiders crumble away.", "good"],
    "camp-hit": (e) => ["The camp is under attack!", "Tap to look — every blow counts.", "bad"],
    destroyed: (e) => [`${e.name} was torn down`, "Raiders broke through there.", "bad"],
    "site-placed": (e) =>
      e.count ? [`${e.name} sites placed`, "Builders will haul the materials.", "good"] : null,
  };
  function toast(title, sub, kind, fly) {
    const box = $("toasts");
    if (box.children.length >= 3) box.firstChild.remove();
    const el = document.createElement("div");
    el.className = `toast${kind === "bad" ? " bad" : ""}`;
    el.innerHTML = `<span><b>${title}</b>${sub ? `<br/><small>${sub}</small></span>` : ""}`;
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
      if (e.type === "village-lost") {
        showLoss(state.lost);
        continue;
      }
      const fn = EVENT_TEXT[e.type];
      const text = fn ? fn(e) : null;
      if (text) {
        const [t, s, k] = text;
        toast(t, s, k, "x" in e ? e : null);
      }
      if (e.type === "nomad-spawned") showHint("nomad");
      if (e.type === "storage-full") showHint("storage");
      if (e.type === "dusk") showHint("night");
      if (e.type === "corruption-spawned") showHint("corruption");
      if (e.type === "raid-start") showHint("raid");
      if (e.type === "dawn") game.saveNow();
    }
  }

  function showLoss(lost) {
    const dlg = $("loss-dialog");
    $("loss-cause").textContent = lost.cause;
    $("loss-stats").innerHTML = [
      ["Days survived", lost.day],
      ["Peak population", lost.peakPop],
      ["Buildings raised", lost.built],
      ["Monsters slain", lost.slain],
    ]
      .map(([k, v]) => `<div class="insp-row"><span>${k}</span><b>${v}</b></div>`)
      .join("");
    dlg.showModal();
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
    if (!ui.hintShown.quarry) {
      const walls = state.buildings.some((b) => b.type === "stoneWall");
      const quarry = state.buildings.some((b) => b.type === "quarry");
      if (walls && !quarry) showHint("quarry");
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
  $("loss-restart").onclick = () => game.restart();

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
  // A save restored after the village fell goes straight to the ledger.
  if (game.getState().lost) showLoss(game.getState().lost);
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
