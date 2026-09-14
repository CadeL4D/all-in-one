// UI layer: HUD binding, build sheet, jobs panel, inspector, toasts, and
// the contextual hint system (pillar 10 - RtR's opaque onboarding is its
// #1 flaw; we replace it with one-line, first-time-only hints).
import * as B from "./balance.js";
import * as bd from "./buildings.js";
import { influenceMax, spellCost } from "./spells.js";
import { nextPickCost, perkRank, rollPerkChoices, pickPerk } from "./meta.js";
import { canFound, canMigrate, foundRegion, migrateTo, migratableCount, regionDef } from "./regions.js";

const RES_STYLE = {
  wood: { color: "#b98a54", label: "Wood" },
  food: { color: "#9cc45c", label: "Food" },
  water: { color: "#7fb3de", label: "Water" },
  stone: { color: "#a7adb3", label: "Stone" },
  bolts: { color: "#c9a15f", label: "Bolts" },
  boards: { color: "#d8b98a", label: "Boards" },
  blocks: { color: "#8e97a8", label: "Blocks" },
  meals: { color: "#e0915c", label: "Meals" },
};

// Build menu categories (bottom sheet, mirroring RtR's build order). The
// full M4 set: 29 placeables across five tabs, gated by the camp ladder.
const BUILD_TABS = [
  {
    key: "village",
    label: "Village",
    types: ["home", "cottage", "manor", "storehouse", "granary", "waystation", "firePit"],
  },
  {
    key: "food",
    label: "Food & Water",
    types: ["farm", "orchard", "well", "cistern", "kitchen"],
  },
  {
    key: "industry",
    label: "Industry",
    types: ["sawpit", "sawmill", "quarry", "stonecarver"],
  },
  {
    key: "faith",
    label: "Faith & Care",
    types: ["shrine", "clinic", "watchpost"],
  },
  {
    key: "defense",
    label: "Defense",
    types: ["fence", "stoneWall", "curtainWall", "gate", "stoneGate", "tower", "ballista", "slingTower", "stormPylon"],
  },
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
  god: "Your people are dying at night — open God and spend influence. Lightning strikes one raider dead; your growing village refills the bar.",
  bolts: "Your towers are out of bolts. Sawpits fletch new ones from stored wood — keep both flowing.",
  upgrade:
    "You've hit the camp's build limit. Tap the camp and raise it a tier — bigger camps allow more buildings, store more, and draw more wanderers.",
  faith:
    "Belief is fading — the red mark means a villager doubts you, and doubtful villagers shrink your influence. Build a Shrine: occultists pray, and faith flows back.",
  pushback:
    "The blight fought your walls. Reclaiming corrupted ground raises Threat and springs defenders — purge only when you can survive the answer.",
  bonewalker:
    "Bonewalkers! Their bones shed tower bolts — crush them instead: a Sling Tower, or guards with bare hands.",
  moonFull:
    "A Full Moon rises tonight: the raiders will NOT march. Cull them at their nests — tomorrow's raid is doubled if you don't.",
  moonEclipse:
    "An Eclipse swallows midday — raiders spawn and attack all through the day. This is a siege; hold your walls.",
  moonBlood:
    "A Blood Moon tonight: red bloodlings will rise INSIDE your village. Storm magic and crushing hands answer them.",
  moonMeteor:
    "A Meteor Shower tonight — burning stone falls on everything, yours included. Scatter what you can't afford to lose.",
  perks:
    "Your deeds feed god experience — and experience becomes Boons: permanent blessings that survive every fall. Open God to claim one.",
  regions:
    "The world is wider than this island. Raise the camp to a Settlement, then open the Map: a funded caravan can found a second village in harsher wilds.",
};

export function createUI(game) {
  // game: {getState, commands, renderer, flyTo(x,y), saveNow()}
  const $ = (id) => document.getElementById(id);
  const ui = {
    hintShown: loadHints(),
    activeHint: null,
    mode: "look", // look | build | dismantle | cast
    placing: null, // {type, x, y, valid}
    dismantleTarget: null,
    selected: null,
    castKey: null, // armed spell key while casting
    godOpen: false,
    perkChoices: null, // the three offered boons while a pick is banked
    migrateN: {}, // per-region stepper: id -> settlers to send
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
      const value = Math.floor(state.resources[res] ?? 0);
      const style = RES_STYLE[res];
      const warn = value >= cap;
      chips.push(
        `<span class="res-chip${warn ? " warn" : ""}"><i class="res-dot" style="background:${style.color}"></i><b>${value}</b><small>/${cap} ${style.label}</small></span>`,
      );
    }
    chips.push(
      `<span class="res-chip"><i class="res-dot" style="background:#e8c39a"></i><b>${pop}</b><small>/ ${housing} housed</small></span>`,
    );
    // The god's purse: influence (regrows with the village - doc 03 §5.1).
    // Since M4 the maximum is what your people BELIEVE you're worth.
    const maxInf = influenceMax(state);
    if (maxInf > 0) {
      const inf = Math.floor(state.god.influence);
      chips.push(
        `<span class="res-chip" title="Influence — spend it in the God panel"><i class="res-dot" style="background:#dfbd7d"></i><b>${inf}</b><small>/ ${maxInf} influence</small></span>`,
      );
    }
    const faithful = state.villagers.filter((v) => !v.dead);
    const avgFaith = faithful.length
      ? Math.round(faithful.reduce((a, v) => a + (v.faith ?? 60), 0) / faithful.length)
      : 0;
    if (faithful.length) {
      chips.push(
        `<span class="res-chip${avgFaith < 40 ? " warn" : ""}" title="Average faith — scales your maximum influence"><i class="res-dot" style="background:${avgFaith < 40 ? "#d1603d" : "#b48ec8"}"></i><b>${avgFaith}</b><small>faith</small></span>`,
      );
    }
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
    // The moon chip: tonight's special, named from the moment it's decided
    // (dawn) so the whole day is a telegraph (pillar 2).
    const chip = $("moon-chip");
    const moon = state.moon?.eclipse ? "eclipse" : state.moon?.day;
    if (moon) {
      const names = { full: "Full Moon", eclipse: "Eclipse", blood: "Blood Moon", meteor: "Meteor Shower" };
      chip.textContent = names[moon];
      chip.className = `moon-chip ${moon}`;
      chip.hidden = false;
    } else chip.hidden = true;
  }

  function renderSpeed(state, speed) {
    document.querySelectorAll(".speed button").forEach((btn) => {
      const s = btn.dataset.speed ? Number(btn.dataset.speed) : null;
      if (btn.id === "pause") btn.classList.toggle("active", speed === 0);
      else btn.classList.toggle("active", s === speed);
    });
  }

  // ---- Build sheet (categorized: village life / defense) ----
  function renderBuildLimit(state) {
    const note = $("build-limit-note");
    if (!note) return;
    const used = bd.countBuilt(state);
    const limit = bd.buildLimit(state);
    note.textContent = `Buildings ${used}/${limit} — walls never count; raise the camp for more.`;
    note.classList.toggle("warn", used >= limit);
  }

  function buildCards() {
    const grid = $("build-cards");
    grid.className = "build-grid";
    const state = game.getState();
    grid.innerHTML = "";
    renderBuildLimit(state);
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
    if (type === "cistern") bits.push("Double a well's seep, stone-built.");
    if (type === "farm") bits.push("Farmers grow crops here.");
    if (type === "orchard") bits.push("A bigger farm — more plots, fruit trees.");
    if (type === "sawpit") bits.push("Woodcutters chop nearby trees.");
    if (type === "sawmill") bits.push("Carpenters saw boards from wood (holds 30).");
    if (type === "quarry") bits.push("Stonecutters mine nearby rocks.");
    if (type === "stonecarver") bits.push("Masons dress stone into blocks (holds 30).");
    if (type === "kitchen") bits.push("Cooks turn 2 food into 1 hearty meal.");
    if (type === "storehouse") bits.push(`+${def.storage} storage space.`);
    if (type === "granary") bits.push(`+${def.storage} storage, cheap and sturdy.`);
    if (type === "waystation") bits.push("Coaxes +1 wanderer per day.");
    if (type === "shrine") bits.push("Occultists pray — faith rises, influence flows.");
    if (type === "clinic") bits.push("Healers tend wounded villagers nearby.");
    if (type === "watchpost") bits.push("Guards patrol and hunt raiders nearby.");
    if (type === "firePit") bits.push("Extends build range far past your walls. Raiders never attack it.");
    if (type === "fence") bits.push("Drag to paint a run of fence. Raiders chew it, but slowly.");
    if (type === "stoneWall") bits.push("Drag to paint. Twice the fence at shrugging off raids.");
    if (type === "curtainWall") bits.push("Warded masonry — wraiths cannot glide through. Needs blocks.");
    if (type === "gate") bits.push("Your villagers pass; raiders must break it.");
    if (type === "stoneGate") bits.push("A gate that outlasts sieges.");
    if (type === "tower") bits.push(`Piercing bolts up to ${def.tower.range} tiles, over walls. Good against husks and embers.`);
    if (type === "ballista") bits.push(`Huge reach (${def.tower.range}), 2 bolts a shot. Deletes husks and bonewalkers.`);
    if (type === "slingTower") bits.push(`Crushing stones — the answer to bonewalkers. Spends your stone!`);
    if (type === "stormPylon") bits.push(`Storm magic up to ${def.tower.range} tiles. The answer to blots and wraiths.`);
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

  // ---- God panel: influence meter + the five-spell hand (RtR's spell
  // bar, mobile-shaped). Armed spell swaps the bar for the cast instructions.
  const CAST_INFO = {
    grab: "Tap a creature to lift it — fling to throw, ease off to set down",
    lightning: "Tap a raider or a nest to strike it",
    meteor: "Tap where the stone should fall — everything in the circle burns",
    heal: "Tap near your hurt villagers",
    mend: "Tap near damaged walls and buildings",
  };
  const SPELL_ORDER = ["grab", "lightning", "meteor", "heal", "mend"];

  function renderSpellbar() {
    const state = game.getState();
    const max = influenceMax(state);
    $("influence-fill").style.width = `${Math.round((state.god.influence / Math.max(1, max)) * 100)}%`;
    $("influence-text").textContent = `${Math.floor(state.god.influence)}/${max}${state.mode?.infiniteInfluence ? " ∞" : ""}`;
    // The purse's size IS the village's belief (M4): show the average.
    const alive = state.villagers.filter((v) => !v.dead);
    const avg = alive.length
      ? Math.round(alive.reduce((a, v) => a + (v.faith ?? 60), 0) / alive.length)
      : 0;
    $("influence-faith").textContent = `avg faith ${avg}% · every point of belief is influence`;
    const slots = $("spell-slots");
    slots.innerHTML = "";
    for (const key of SPELL_ORDER) {
      const spec = B.SPELLS[key];
      const btn = document.createElement("button");
      btn.className = `spell-slot${ui.castKey === key ? " armed" : ""}`;
      const cost = spellCost(state, key);
      btn.innerHTML = `<i>${spec.icon}</i><b>${spec.name}</b><small>${cost}</small>`;
      btn.disabled = !state.mode?.infiniteInfluence && state.god.influence < cost && ui.castKey !== key;
      btn.onclick = () => game.armSpell(key);
      slots.appendChild(btn);
    }
    // The meta strip: god XP progress + banked boon picks (M5).
    refreshMetaHud();
  }

  // The banked-picks badge must stay honest wherever picks change - the
  // boons sheet spends them without re-rendering the whole spellbar.
  function refreshMetaHud() {
    const meta = game.getState().meta;
    const need = nextPickCost(meta);
    const prog = Math.max(0, Math.min(1, (meta.xp - meta.spent) / need));
    $("xp-fill").style.width = `${Math.round(prog * 100)}%`;
    $("xp-text").textContent = `${Math.max(0, meta.xp - meta.spent)}/${need} XP`;
    const badge = $("perk-picks-badge");
    badge.hidden = meta.picks <= 0;
    badge.textContent = meta.picks;
  }

  function setGodPanel(open) {
    ui.godOpen = open;
    if (open) renderSpellbar();
    $("spellbar").hidden = !open || !!ui.castKey;
    setDock(open ? "god-open" : "look");
  }

  // ---- Boons sheet (M5 meta): claim banked picks from three offered.
  function renderPerkSheet() {
    const state = game.getState();
    const meta = state.meta;
    $("perk-note").textContent = meta.picks
      ? `Choose one of the offered boons — ${meta.picks} pick${meta.picks === 1 ? "" : "s"} banked. Boons never expire and survive every fall.`
      : "Boons come from god experience: building, raising, defending, growing. Keep playing and the next pick will come.";
    const choicesBox = $("perk-choices");
    choicesBox.innerHTML = "";
    if (meta.picks > 0) {
      if (!ui.perkChoices?.length) ui.perkChoices = rollPerkChoices(state, state.rng);
      for (const key of ui.perkChoices) {
        const spec = B.PERKS[key];
        const card = document.createElement("button");
        card.className = "perk-card";
        const rank = perkRank(state, key);
        card.innerHTML = `<b>${spec.name}</b><span class="rank">${rank ? `rank ${rank} → ${rank + 1}` : "new"}</span><small>${spec.desc}.</small>`;
        card.onclick = () => {
          const result = pickPerk(state, key);
          if (result.ok) {
            ui.perkChoices = null;
            game.saveNow();
            refreshMetaHud();
            renderPerkSheet();
          } else if (result.reason) toast(result.reason, null, "info");
        };
        choicesBox.appendChild(card);
      }
    } else ui.perkChoices = null;
    const owned = $("perk-owned");
    owned.innerHTML = "";
    const ranks = Object.entries(meta.perks).filter(([, r]) => r > 0);
    if (!ranks.length) owned.innerHTML = `<p class="sheet-note">None yet — your first boon is one good session away.</p>`;
    for (const [key, rank] of ranks) {
      const row = document.createElement("div");
      row.className = "perk-row";
      row.innerHTML = `<span>${B.PERKS[key].name}</span><b>rank ${rank}/${B.PERKS[key].maxRank} — ${B.PERKS[key].desc}</b>`;
      owned.appendChild(row);
    }
  }

  // ---- Map sheet (M5 regions): travel, found, migrate.
  function renderMap() {
    const state = game.getState();
    const wrapper = game.getWrapper?.();
    $("map-note").textContent =
      state.mode.key === "peaceful"
        ? "A quiet world. The other regions wait for whoever walks there."
        : "Harsher wilds breed worse nights — but a second village means a second chance.";
    const box = $("region-cards");
    box.innerHTML = "";
    for (const def of B.REGIONS) {
      const entry = state.regions.find((r) => r.id === def.id);
      const stats = entry.id === state.regionId
        ? {
            day: state.clock.day,
            pop: state.villagers.length,
            status: state.lost ? "lost" : state.corruption.cleared ? "cleared" : "alive",
          }
        : wrapper?.regions?.find((r) => r.id === def.id) ?? {};
      const isActive = entry.id === state.regionId;
      const card = document.createElement("div");
      card.className = `region-card${isActive ? " active-region" : ""}${stats.status === "lost" ? " locked" : ""}`;
      const statusLine = isActive
        ? `<b>${state.lost ? "fallen" : state.corruption.cleared ? "cleared — blight-free forever" : "you are here"}</b>`
        : entry.founded
          ? `<b class="${stats.status === "lost" ? "status-lost" : stats.status === "cleared" ? "status-cleared" : ""}">${stats.status === "lost" ? `fallen, day ${stats.day ?? "?"}` : stats.status === "cleared" ? "cleared — blight-free" : `village · day ${stats.day ?? "?"}`}</b>`
          : `<b>unsettled</b>`;
      card.innerHTML = `
        <h4>${def.name} <span class="stars">${"★".repeat(def.stars)}${"☆".repeat(3 - def.stars)}</span></h4>
        <p>${def.blurb}</p>
        <div class="region-meta">${statusLine}${entry.founded && stats.status !== "lost" ? `<span>pop <b>${stats.pop ?? (isActive ? state.villagers.length : "—")}</b></span>` : ""}</div>
        <div class="region-actions"></div>`;
      const actions = card.querySelector(".region-actions");

      if (isActive) {
        const here = document.createElement("span");
        here.textContent = "Found new villages from the other wilds' cards below.";
        actions.appendChild(here);
      } else if (stats.status === "lost") {
        const note = document.createElement("span");
        note.textContent = "A lost region can never be walked again.";
        actions.appendChild(note);
      } else if (entry.founded) {
        const travel = document.createElement("button");
        travel.className = "primary";
        travel.textContent = "Travel";
        travel.onclick = () => game.travel(def.id);
        actions.appendChild(travel);
        // Migrate box: send healthy adults (RtR rule: pop 15+).
        const mig = document.createElement("div");
        mig.className = "migrate-box";
        const room = Math.min(B.MIGRATE_MAX_BATCH, migratableCount(state), state.villagers.length - 4);
        const canSend = canMigrate(state, def.id);
        mig.innerHTML = `
          <button aria-label="Fewer settlers" ${ui.migrateN?.[def.id] <= 1 ? "disabled" : ""}>−</button>
          <span><b id="mig-count-${def.id}">${ui.migrateN?.[def.id] ?? Math.min(3, Math.max(1, room))}</b> settlers</span>
          <button aria-label="More settlers" ${(ui.migrateN?.[def.id] ?? 3) >= room ? "disabled" : ""}>+</button>
          <button class="primary" ${canSend.ok && room > 0 ? "" : "disabled"}>Send at dawn</button>`;
        const [minus, plus, send] = mig.querySelectorAll("button");
        ui.migrateN[def.id] = Math.min(ui.migrateN?.[def.id] ?? Math.min(3, Math.max(1, room)), Math.max(1, room));
        minus.onclick = () => {
          ui.migrateN[def.id] = Math.max(1, (ui.migrateN[def.id] ?? 1) - 1);
          renderMap();
        };
        plus.onclick = () => {
          ui.migrateN[def.id] = Math.min(room, (ui.migrateN[def.id] ?? 1) + 1);
          renderMap();
        };
        send.onclick = () => {
          const result = migrateTo(state, def.id, ui.migrateN[def.id] ?? 1);
          if (result.ok) {
            game.saveNow();
            renderMap();
          } else if (result.reason) toast(result.reason, null, "info");
        };
        if (!canSend.ok) mig.title = canSend.reason;
        card.appendChild(mig);
      } else {
        const findCheck = canFound(state, def.id);
        const btn = document.createElement("button");
        btn.className = "primary";
        btn.textContent = `Send a caravan (${Object.entries(B.FOUND_COST).map(([r, n]) => `${n} ${RES_STYLE[r].label.toLowerCase()}`).join(" + ")} + ${B.FOUND_SETTLERS} settlers)`;
        btn.disabled = !findCheck.ok;
        btn.title = findCheck.ok ? "" : findCheck.reason;
        btn.onclick = () => {
          const result = foundRegion(state, def.id);
          if (result.ok) {
            game.saveNow();
            renderMap();
          } else if (result.reason) toast(result.reason, null, "info");
        };
        actions.appendChild(btn);
      }
      box.appendChild(card);
    }
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
          <div class="insp-row"><span>Doing</span><b>${v.migrating ? "Packing to leave at dawn" : v.activity}</b></div>
          <div class="insp-row"><span>Job</span><b>${job}</b></div>
          <div class="insp-row"><span>Home</span><b>${home ? bd.def(home).name : "none"}</b></div>
          ${v.carrying ? `<div class="insp-row"><span>Carrying</span><b>${RES_STYLE[v.carrying].label}</b></div>` : ""}
        </div>
        <div style="margin-top:10px">
          ${needBar("Food", v.hunger)}${needBar("Water", v.thirst)}${needBar("Energy", v.energy)}${needBar("Health", v.health)}${needBar("Faith", v.faith ?? 60)}
        </div>`;
    } else if (selection.kind === "building") {
      const b = state.buildings.find((b2) => b2.id === selection.id);
      if (!b) return closeInspector();
      const def = bd.def(b);
      $("inspector-title").textContent = def.name;
      const jobs = Object.entries(def.jobs)
        .map(([j, n]) => `${n} ${B.JOBS[j].name.toLowerCase()}${n > 1 ? "s" : ""}`)
        .join(", ");
      const rows = [];
      if (def.corrupted) rows.push(["What it is", "The corruption's spawn point. Destroy it to starve the night raids."]);
      if (!b.complete) {
        const missing = bd.nextMissingRes(b);
        rows.push(["Site", `${Math.round((b.workDone / b.workNeeded) * 100)}% built`]);
        rows.push(["Supplies", `${b.delivered}/${Object.values(B.BUILDINGS[b.type].cost).reduce((a, n) => a + n, 0)} hauled${missing ? ` (needs ${missing})` : ""}`]);
      }
      if (b.type === "camp") {
        const tier = b.tier ?? 1;
        const stats = bd.campTierStats(tier);
        rows.push(["Tier", `${tier} of ${B.CAMP_MAX_TIER} — ${stats.name}`]);
        rows.push(["Buildings", `${bd.countBuilt(state)}/${stats.buildLimit}`]);
        rows.push(["Build range", `${stats.radius} tiles`]);
        rows.push(["Work speed", `+${Math.round((stats.workMult - 1) * 100)}%`]);
        rows.push(["Wanderer draw", `×${stats.nomadMult}`]);
        if (b.upgrade) {
          const pct = Math.round(((b.upgrade.workDone ?? 0) / b.upgrade.workNeeded) * 100);
          rows.push(["Raising", `${B.CAMP_TIERS[b.upgrade.toTier - 1].name} — ${pct}%`]);
        }
      }
      if (def.tower) {
        rows.push(["Range", `${def.tower.range} tiles, fires over walls`]);
        rows.push(["Ammo", `${def.tower.ammoPerShot ?? 1} ${def.tower.ammo ?? "bolts"} per shot — ${def.tower.type} damage`]);
      }
      if (jobs) rows.push(["Jobs", jobs]);
      if (def.houses) rows.push(["Residents", `${b.occupants}/${def.houses}`]);
      if (def.storage) rows.push(["Storage", `+${def.storage} to village cap`]);
      if (def.craft) {
        const [outRes, outN] = Object.entries(def.craft.out)[0];
        const ins = Object.entries(def.craft.in).map(([r, n]) => `${n} ${r}`).join(" + ");
        rows.push(["Crafts", `${ins} → ${outN} ${outRes} (holds ${B.CRAFT_MAINTAIN[outRes]})`]);
      }
      rows.push(["Health", `${Math.max(0, Math.ceil(b.hp))}/${def.hp}`]);
      const canUpgrade = b.type === "camp" && !b.upgrade && (b.tier ?? 1) < B.CAMP_MAX_TIER;
      body.innerHTML = `<div class="insp-rows">${rows
        .map(([k, v2]) => `<div class="insp-row"><span>${k}</span><b>${v2}</b></div>`)
        .join("")}</div>
        ${canUpgrade ? `<div class="insp-actions"><button class="primary" id="insp-upgrade">Raise to ${B.CAMP_TIERS[(b.tier ?? 1)].name}</button></div>` : ""}
        ${b.type !== "camp" && !def.corrupted ? `<div class="insp-actions"><button class="danger" id="insp-dismantle">Dismantle (${Math.round(B.DISMANTLE_REFUND * 100)}% refund)</button></div>` : ""}`;
      const up = $("insp-upgrade");
      if (up)
        up.onclick = () => {
          const nextTier = (b.tier ?? 1) + 1;
          const cost = B.CAMP_TIERS[nextTier - 1].cost;
          const costText = Object.entries(cost)
            .filter(([, n]) => n > 0)
            .map(([r, n]) => `${n} ${RES_STYLE[r].label.toLowerCase()}`)
            .join(" + ");
          game.confirm(
            `Raise the camp to ${B.CAMP_TIERS[nextTier - 1].name}?`,
            `Builders haul ${costText} and raise it on-site. More buildings, storage, range, and wanderers.`,
            () => {
              game.upgradeCamp();
              inspect(selection);
            },
          );
        };
      const dm = $("insp-dismantle");
      if (dm)
        dm.onclick = () =>
          game.confirm(
            `Tear down the ${def.name}?`,
            `You'll reclaim part of its materials.`,
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
    const low = label === "Faith" ? v < 40 : v < 25;
    return `<div class="need"><span>${label}</span><span class="bar"><i class="${low ? "low" : ""}" style="width:${Math.max(0, Math.min(100, v))}%"></i></span><b>${Math.max(0, Math.min(100, v))}</b></div>`;
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
    "bolts-out": (e) =>
      e.ammo === "stone"
        ? ["Sling Tower out of stone", "It throws your building stone — quarry more.", "bad"]
        : ["Towers out of bolts", "Sawpits fletch them from stored wood.", "bad"],
    "emberling-sprung": (e) => [
      "A fire spirit slipped through",
      "The meteor carried an emberling instead of rock. It hates water...",
      "bad",
    ],
    "meteor-impact": (e) => ["Meteor impact", "The circle burns — yours and theirs.", "info"],
    "upgrade-started": (e) => [
      `Raising the ${e.to}`,
      "Builders will haul the materials. The camp keeps working meanwhile.",
      "info",
    ],
    "camp-upgraded": (e) => [
      `The village rises: ${e.name}`,
      "More buildings, more storage, more wanderers. The people celebrate.",
      "good",
    ],
    "blight-fought-back": (e) => [
      "The blight fought back",
      `Reclaiming its ground springs defenders (${e.count}) and raises Threat. Tap to look.`,
      "bad",
    ],
    "site-placed": (e) =>
      e.count ? [`${e.name} sites placed`, "Builders will haul the materials.", "good"] : null,
    // ---- M5: moons, boons, regions ----
    moon: (e) => {
      const text = {
        full: ["The Full Moon rises", "Raiders will stir but not march. Tomorrow's raid doubles — cull them tonight.", "info"],
        blood: ["The Blood Moon rises", "Red bloodlings will climb out of your own streets before dawn.", "bad"],
        meteor: ["A Meteor Shower begins", "Burning stone falls all night — on everything. Tap impacts to watch.", "bad"],
        eclipse: ["An Eclipse is coming today", "When midday darkens, raiders will march. This is a day siege.", "bad"],
      };
      return text[e.moon] ?? null;
    },
    "eclipse-rise": () => ["Midday turns to night", "The eclipse has begun — raiders pour from the nests.", "bad"],
    "bloodling-sprung": (e) => [
      "A bloodling rises in the village",
      "Storm magic melts them; tower bolts barely scratch. Tap to look.",
      "bad",
    ],
    "perk-earned": (e) => [
      "A boon is earned",
      "The god grows with every deed. Open God → Boons to claim it.",
      "good",
    ],
    "perk-picked": (e) => [`${e.name} mastered`, `Rank ${e.rank}. Its blessing covers every village you will ever raise.`, "good"],
    "region-founded": (e) => [
      `Settlers will raise ${e.name}`,
      `${e.settlers} able villagers leave at dawn with the caravan. Travel there from the Map when they've had time to build.`,
      "good",
    ],
    "migrants-scheduled": (e) => [
      `${e.count} villager${e.count === 1 ? "" : "s"} packing for ${e.name}`,
      "They finish today's work and walk out at dawn.",
      "info",
    ],
    "migrants-left": (e) => [
      `${e.count} settler${e.count === 1 ? "" : "s"} walked out`,
      "Bound for another region. They'll be waiting at its camp.",
      "info",
    ],
    "region-cleared": () => [
      "This region is clean",
      "The last of the blight is gone — free of corruption, forever. The wilds remember.",
      "good",
    ],
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
      if (e.type === "raid-start") {
        showHint("raid");
        // By the second raid the wall lesson has landed; time for the hand.
        if (state.clock.day >= 4) showHint("god");
      }
      if (e.type === "bolts-out") showHint("bolts");
      if (e.type === "blight-fought-back") showHint("pushback");
      if (e.type === "raid-start" && state.clock.day >= B.BONEWALKER_ARRIVAL_DAY) showHint("bonewalker");
      if (e.type === "moon") showHint(`moon${e.moon === "full" ? "Full" : e.moon === "eclipse" ? "Eclipse" : e.moon === "blood" ? "Blood" : "Meteor"}`);
      if (e.type === "perk-earned") showHint("perks");
      if (e.type === "region-founded") showHint("regions");
      if (e.type === "dawn") game.saveNow();
    }
  }

  function showLoss(lost) {
    const dlg = $("loss-dialog");
    const state = game.getState();
    // M5: a fallen region is a chapter, not the book - if other founded
    // regions still stand, the world goes on from the Map.
    const wrapper = game.getWrapper?.();
    const othersLive = state.regions.some((r) => {
      if (!r.founded || r.id === state.regionId) return false;
      const stats = wrapper?.regions?.find((w) => w.id === r.id);
      return !stats || stats.status !== "lost";
    });
    $("loss-title").textContent = othersLive ? "The region has fallen" : "The village has fallen";
    $("loss-cause").textContent = lost.cause;
    $("loss-stats").innerHTML = [
      ["Days survived", lost.day],
      ["Peak population", lost.peakPop],
      ["Buildings raised", lost.built],
      ["Monsters slain", lost.slain],
    ]
      .map(([k, v]) => `<div class="insp-row"><span>${k}</span><b>${v}</b></div>`)
      .join("");
    $("loss-note").textContent = othersLive
      ? "The wilds keep this ground. Your boons and your other villages remain — travel on."
      : "Every fall teaches the next village — the wilds keep the blight, you keep the know-how, and your boons keep their blessing.";
    $("loss-map").hidden = !othersLive;
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
    if (!ui.hintShown.upgrade) {
      if (bd.countBuilt(state) >= bd.buildLimit(state) && bd.buildLimit(state) > 0)
        showHint("upgrade");
    }
    if (!ui.hintShown.faith) {
      const alive = state.villagers.filter((v) => !v.dead);
      const avg = alive.length
        ? alive.reduce((a, v) => a + (v.faith ?? 60), 0) / alive.length
        : 100;
      if (alive.length >= 6 && avg < 42) showHint("faith");
    }
    if (!ui.hintShown.regions) {
      const camp = bd.findCamp(state);
      if ((camp?.tier ?? 1) >= B.FOUND_TIER) showHint("regions");
    }
    const complete = state.buildings.filter((b) => b.complete).length;
    if (complete >= 3) showHint("jobs");
  }

  function closeSheets() {
    $("build-sheet").hidden = true;
    $("jobs-sheet").hidden = true;
    $("perk-sheet").hidden = true;
    $("map-sheet").hidden = true;
    setGodPanel(false);
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
  $("god-open").onclick = () => {
    const opening = !ui.godOpen;
    game.exitModes();
    closeSheets();
    if (opening) setGodPanel(true);
  };
  $("map-open").onclick = () => {
    const sheet = $("map-sheet");
    const opening = sheet.hidden;
    game.exitModes();
    closeSheets();
    if (opening) {
      renderMap();
      sheet.hidden = false;
      setDock("map-open");
    } else setDock("look");
  };
  $("perks-open").onclick = () => {
    const sheet = $("perk-sheet");
    const opening = sheet.hidden;
    game.exitModes();
    closeSheets();
    if (opening) {
      renderPerkSheet();
      sheet.hidden = false;
      setDock("god-open");
    } else setDock("look");
  };
  $("cancel-cast").onclick = () => game.disarmSpell();
  document.querySelectorAll(".sheet-close").forEach((b) => (b.onclick = closeSheet));
  function closeSheet() {
    closeSheets();
    setDock("look");
  }
  function setDock(active) {
    ["look", "build-open", "jobs-open", "god-open", "map-open"].forEach((id) =>
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
  $("loss-map").onclick = () => {
    $("loss-dialog").close();
    game.exitModes();
    closeSheets();
    renderMap();
    $("map-sheet").hidden = false;
    setDock("map-open");
  };

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
    if (!$("build-sheet").hidden) renderBuildLimit(state);
    if (!$("map-sheet").hidden) renderMap();
    if (!$("perk-sheet").hidden) renderPerkSheet();
    if (ui.placing) updatePlacementInfo(state, ui.placing.type);
    if (ui.godOpen) renderSpellbar();
    // A camp mid-upgrade shows live progress in the inspector.
    if (!$("inspector").hidden && ui.selected?.kind === "building") {
      const b = state.buildings.find((b2) => b2.id === ui.selected.id);
      if (b?.upgrade) inspect(ui.selected);
    }
  };
  ui.inspect = inspect;
  ui.closeInspector = closeInspector;
  ui.closeSheets = closeSheets;
  ui.showHint = showHint;
  ui.setDock = setDock;
  // Arm a spell: bar swaps to cast instructions, reticle follows the finger.
  ui.armSpell = (key) => {
    ui.castKey = key;
    ui.mode = "cast";
    $("spellbar").hidden = true;
    $("cast-name").textContent = `${B.SPELLS[key].icon} ${B.SPELLS[key].name}`;
    $("cast-info").textContent = CAST_INFO[key];
    $("castbar").hidden = false;
    game.renderer.view.cast = { key, x: null, y: null };
  };
  ui.disarmSpell = () => {
    ui.castKey = null;
    if (ui.mode === "cast") ui.mode = "look";
    $("castbar").hidden = true;
    game.renderer.view.cast = null;
    if (ui.godOpen) setGodPanel(true);
    else setDock("look");
  };
  // Exit-everything hook for main.js (Escape, dock switches, placement).
  ui.closeGod = () => {
    ui.castKey = null;
    ui.godOpen = false;
    $("spellbar").hidden = true;
    $("castbar").hidden = true;
    game.renderer.view.cast = null;
  };
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
