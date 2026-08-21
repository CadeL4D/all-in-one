# DAWNHOLD — a colony survival RTS

A complete, mobile-first single-player colony-survival RTS in the spirit of
**Rise to Ruins, RimWorld, Oddrealm and Final Outpost** — pure HTML/CSS/JS,
every sprite hand-painted procedurally in code (no assets, no sound, no
dependencies). Build a village by day, hold back the horde by night, and light
the Great Beacon to bring back the dawn.

---

## Run it

- **Easiest:** double-click `index.html`. Saves live in your browser's
  localStorage. Works in Chrome, Edge, Firefox, Safari (desktop & mobile).
- **Or serve it** (nicer for full-screen mobile): `python -m http.server 8137`
  in this folder, then open `http://localhost:8137`.
- On your phone: open the URL, then "Add to Home Screen" for fullscreen play.

## How to play (90 seconds)

You are the guardian spirit of six settlers. **You never directly control
villagers** — you assign their **Jobs** (Forager, Lumberjack, Miner, Farmer,
Builder, Guard) and they work autonomously.

- **Day (~3.5 min):** gather berries/wood/stone, build, farm, repair.
- **Dusk:** you're told how many monsters are coming **and from which
  direction**. Non-guards head for shelter.
- **Night (~1.5 min):** the horde attacks. Guards and towers fight; you spend
  **Essence** on god powers (Mend / Smite / Meteor). Survivors burn at dawn.
- **Grow:** wanderers join at dawn if you have **food + beds**.
- **Win:** raise **The Beacon** (day 10), survive the **Long Night** assault
  (with the Night Lord boss) → dawn returns forever. Then keep playing endless.
- **Lose:** only when every villager is dead.

**Controls:** tap = select/place · drag = pan (or paint walls/roads/gates) ·
pinch or +/- buttons = zoom · minimap tap = jump · pause/1×/2×/3× (or space/1/2/3).

---

## Design audit — why the inspirations work, and what Dawnhold took

This game was designed from a review-driven audit of its inspirations.

### The GOOD, implemented

| Principle (source) | In Dawnhold |
|---|---|
| **Wave-defense pacing** — building phase vs. assault phase gives rhythm and breathing room (wave-defense RTS analyses; Rise to Ruins' "city builder that is basically tower defense") | Strict day/dusk/night/dawn cycle; dusk telegraphs wave size **and direction** so you can prepare |
| **Autonomy without chores** — RtR praised for villagers working by role; RimWorld hauling criticized as tedium | Job-assignment economy (Final Outpost style, ideal for touch); no corpse/hauling micro; builders auto-repair |
| **Story generator + attachment** (RimWorld/Tynan Sylvester: apophenia, traits, elastic failure) | Named villagers with traits (Hardy/Swift/Diligent/Strong Back), unique pixel looks, and an auto-written **Chronicle** ("Tobin the Lumberjack was lost to the horde") |
| **Elastic failure** — losses hurt but don't spiral (RimWorld design talks) | Dawn heals 28%, monsters burn at dawn, repairs are cheap, wanderers replace the dead, emergency forage when food runs dry |
| **Player agency in defense** (RtR's one big criticism: *no way to intervene*) | Active god powers (Mend/Smite/Meteor), "To shelter" direct order, mid-night building, tower/wall/gate choices with clear counters (towers→swarms, ballistae→brutes, walls→everything, torches→slow) |
| **Readable tactics** (single-player RTS design: controlled, legible situations) | Direction telegraphs, wave-count warnings, distinct monster silhouettes, minimap, health bars everywhere |
| **Variety & pacing** (Final Outpost criticized as "a race to a strict repetitive finish line") | Rolling unlocks every dawn (days 2–10), changing wave compositions (runners d3, brutes d6, stalkers d9), daytime events (bounty harvests, pilgrims, daylight ambushes), a boss finale, then endless mode |
| **Difficulty options** | Peaceful / Easy / Normal / Hard (wave size, monster HP, night length, essence regen) |
| **Fair mobile F2P-free experience** (FO's ads/grind complaints) | One HTML folder you own; saves local; no monetization of any kind |

### The BAD, deliberately kept out

| Complaint (source) | How Dawnhold avoids it |
|---|---|
| Punishing starvation spirals (Oddrealm's most common negative review; dev had to rework food) | Food is forgiving: slow starvation damage, early warnings, emergency auto-forage, generous bushes/farms |
| Poor UI / no tutorial / inaccessible (Oddrealm) | 4-button dock, contextual slide-up panels, 6-step contextual tutorial, full in-game manual, big touch targets, safe-area padding |
| Micromanagement tedium (RimWorld hauling; RtR corpse handling) | No corpses, no stockpile micro, no per-villager schedules |
| Shallow endgame / max-out-too-fast (Final Outpost) | 10-day unlock arc → Beacon → Long Night boss → endless scaling (wave HP +5.5%/day past day 9) |
| "Frustration generator" repetition (RimWorld critique) | Events, unlock cadence, and escalating compositions keep nights different |
| Clunky presentation | Coherent 16px pixel art generated in code, warm night lighting with torch glow, fireflies, screenshake, floating numbers |

---

## Balance model (all numbers in `js/core.js` → `CONFIG`)

- **Food:** villager eats ~2 meals/day (~4.3 food). Bush yields 7 (regrows
  ~3 min); wheat plot yields 15 per ~95s of sun (farmer tends to boost 20%).
  1 farm ≈ 3+ villagers fed. Starting food covers ~2 days.
- **Waves (Normal):** `round(1.4 + 1.75 × day)` capped at 30, ×0.68 Easy,
  ×1.38 Hard, 0 Peaceful. Composition: shades always; runners 22% from d3;
  brutes 15% from d6 (2.4× building damage); stalkers 16% from d9 (hunt
  villagers). HP +5.5%/day past day 9.
- **Defense math:** shade 28hp/4dmg vs guard 7.5dmg/0.72s, tower 8dmg/1.1s
  (range 5.5), ballista 27dmg/2.3s (range 7.5). Palisade 220hp/2w, stone wall
  520hp/4s, brutes need ~40s to solo a stone wall.
- **Essence:** starts 40, cap 120, ~0.1/s day · 0.05/s night (×difficulty),
  +2 per kill (brutes 5, boss 40), shrines +0.06/s. Mend 12, Smite 22
  (kills a shade outright), Meteor 65 (day 6).
- **Growth:** wanderer at dawn if food ≥ 14 and beds free (65% chance);
  refugees ×2 every 3rd day; pop cap 44.

Every knob is one edit in `CONFIG` — tune freely.

## Architecture

```
index.html          shell: canvas + HUD/panel/screen DOM
css/style.css       mobile-first dark UI, safe areas, touch targets
js/core.js          CONFIG (all balance), enums, utils, global state G
js/art.js           every sprite painted procedurally (16px), title art
js/world.js         seeded map gen (noise), guarantees, baking, queries
js/path.js          A* (binary heap, 8-dir); monsters path *through* walls
                    at high cost (prefer gaps, batter when sealed)
js/buildings.js     BUILD defs; placement/construction/farms/towers/repair
js/entities.js      villager & monster factories, names, traits
js/game.js          Sim: day cycle, job AI, waves, combat, events, win/lose
js/powers.js        Mend / Smite / Meteor
js/save.js          localStorage: autosave + 3 slots
js/render.js        camera, y-sorted draw, night lighting, minimap, fx
js/ui.js            touch/mouse input, panels, selection, tutorial, screens
js/main.js          boot + fixed-cadence RAF loop (stable at 3× speed)
```

**Console hooks** for tinkering: `DBG.res('wood',100)`, `DBG.dusk()`,
`DBG.wave(8)`, `DBG.vill(3)`, `DBG.day(9)`, plus `G`, `Sim`, `BUILD`,
`CONFIG` are global.

### Performance notes
Terrain is baked once to an offscreen canvas; entities are capped
(70 monsters / 44 villagers); AI thinks at ~2Hz staggered; night lighting uses
a half-resolution destination-out pass with capped light count; the minimap
redraws at ~3Hz.

## Ideas if you want to extend it
Weather (rain slows foraging), wandering traders, monster camps you can raid
by day, villager relationships/morale, stone-tier monsters that throw bones
over walls, scenario maps, cloud saves.
