# DAWNHOLD — a colony survival RTS

A complete, mobile-first single-player colony-survival RTS in the spirit of
**Rise to Ruins, RimWorld, Oddrealm and Final Outpost** — available as an
editable HTML/CSS/JS source tree and as one self-contained HTML file. It has no
assets, sound, or dependencies, and every sprite is hand-painted procedurally
in code. Build a village by day, hold back the horde by night, and light the
Great Beacon to bring back the dawn.

> **v1.1 — The Wilds Update:** biome map overhaul (dark forests, meadows,
> highlands, sand shores) with fully redrawn, readable tree & rock art;
> **3 raidable Dark Monolith lairs** the horde crawls out of each night;
> **blood moons** every 5th night; two new jobs (**Fisher**, **Medic**) with
> herbs & a **Hospital**; **Fishing Docks, Mine Shafts, Windmills, Spike Traps,
> Barracks**; three new monsters (**Bonecasters** that snipe from range,
> **Wraiths** that drift through walls, endless-mode **Colossi**); the
> **Stasis** power; **builder land-clearing & timed demolition**; ancient ruins
> & essence crystals to salvage; and graves that remember the fallen.

---

## Changelog

### v1.1 — The Wilds Update
- **World:** biome map generation (dark forests, meadows, highlands), sand
  shores around water, ancient ruins (14 stone) and essence-crystal lodes
  (6 stone + 8 essence) to salvage out in the wilds.
- **Art:** fully redrawn, outlined, more recognizable trees (oak, pine, birch,
  dead tree) and rocks (boulder, small rock, crystal); mushrooms, tall grass,
  and graves as new set dressing; fixed the cottage's upside-down roof and
  added a Hospital sprite to match.
- **Lairs & raids:** three raidable Dark Monoliths spawn the night horde;
  select one and press **Raid** to send guards to destroy it (+25 essence,
  permanently smaller nights). Pink crosses mark them on the minimap.
- **Blood moons:** every 5th night the horde grows 50% — but kills pay double
  essence.
- **New jobs:** Fisher (works shore docks) and Medic (gathers herbs to stock
  the Hospital, which mends the wounded nearby — the duty itself is locked
  until a Hospital is built, available after night one).
- **New buildings:** Fishing Dock (needs water), Windmill (+35% farm growth
  within 6 tiles), Spike Traps (drag-paintable, wound + slow, wear out), Mine
  Shaft (endless slow stone, built on a boulder), Barracks (+30% guard damage,
  one allowed), Hospital (day 2; heals 6 hp/s nearby, 1 herb per 5 hp; unlocks
  the Medic job).
- **Land clearing:** buildings can be staked straight over trees, boulders,
  ruins and crystals — builders clear the footprint first (half the yield is
  salvaged) and then raise it. A **Clear Land** tool in the Build menu queues
  individual wild tiles for builders; tap again to cancel an order.
- **Timed demolition:** Demolish no longer removes a building instantly —
  builders tear it down at the same pace they build, then half the cost is
  refunded. Tap a marked building again to cancel. Unstarted sites still go
  instantly.
- **New monsters:** Bonecaster (day 7, ranged), Wraith (day 11, phases
  through walls), Colossus (day 15, endless-mode siege titan).
- **New power:** Stasis (day 5) freezes monsters in a circle for 5s.
- **Feel:** dusk telegraphs name the attacking lair's direction; tap
  forgiveness for tall buildings (towers, lairs, windmills); the dead are
  buried where they fall; herbs chip in the HUD; old saves keep working
  (lair-less worlds fall back to wilderness spawns).
- **Fixed (villager pathfinding):** villagers no longer walk through walls
  raised across their route, get shoved inside solid tiles by each other, or
  "work" a target across the map when their path is cut — they repath cleanly
  (and a villager caught inside a new wall simply steps out).
- **Fixed (stuck guards):** chasing a quarry with no route (across water or
  sealed behind walls) used to hand guards a degenerate one-tile path they
  followed forever while the horde rolled in. Unreachable targets now return
  no path: guards give the monster up after ~2s and re-pick, unreachable raid
  orders are refused or called off with a notice, monster spawns are clamped
  to reachable ground, and A* node budget covers the whole map so long lair
  approaches always resolve. Unassign/reassign is never needed to unstick a
  guard again.

### v1.0 — First Light
- Initial release: day/night survival loop, 8 jobs, 15 buildings, 5 monsters,
  god powers, Beacon victory + Night Lord finale, endless mode, chronicle,
  traits, tutorial, 4 difficulties, autosave + 3 slots, mobile-first UI.

---

## Run it

- **Editable build:** double-click `index.html`; it loads the files in `css/`
  and `js/`.
- **Single-file build:** double-click or share `onefile.html`; all CSS and
  JavaScript are embedded inside it.
- Saves live in your browser's localStorage. Both builds work in Chrome, Edge,
  Firefox, and Safari on desktop and mobile.
- **Or serve it** (nicer for full-screen mobile): `python -m http.server 8137`
  in this folder, then open `http://localhost:8137`.
- On your phone: open the URL, then "Add to Home Screen" for fullscreen play.

## How to play (90 seconds)

You are the guardian spirit of six settlers. **You never directly control
villagers** — you assign their **Jobs** (Forager, Lumberjack, Miner, Farmer,
Fisher, Medic, Builder, Guard) and they work autonomously.

- **Day (~3.5 min):** gather berries/wood/stone/herbs, build, farm, fish,
  repair.
- **Dusk:** you're told how many monsters are coming **and from which lair**.
  Every 5th night is a **blood moon** (+50% horde, double essence from kills).
- **Night (~1.5 min):** the horde crawls out of its **Dark Monoliths** (pink
  crosses on the minimap). Guards and towers fight; you spend **Essence** on
  god powers (Mend / Smite / Stasis / Meteor). Workers keep their jobs after
  dark — they only break and run when monsters get close. Survivors burn at
  dawn.
- **Raids:** tap a monolith and press **Raid** — your guards march out and
  tear it down (+25 essence, that lair never spawns again; wipe all three and
  nights shrink to stragglers from the wilds).
- **Grow:** wanderers join at dawn if you have **food + beds**.
- **Win:** raise **The Beacon** (day 10), survive the **Long Night** assault
  (with the Night Lord boss) → dawn returns forever. Then keep playing endless
  (Colossi arrive from day 15).
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

## Balance model (see `js/core.js` → `CONFIG`)

- **Food:** villager eats ~2 meals/day (~4.3 food). Bush yields 7 (regrows
  ~3 min); wheat plot yields 15 per ~95s of sun (farmer +20%, windmill within
  6 tiles +35%); fishing dock ~1 food / 3.4s per fisher. Starting food covers
  ~2 days.
- **Waves (Normal):** `round(1.4 + 1.75 × day)` capped at 30, ×0.68 Easy,
  ×1.38 Hard, 0 Peaceful; blood moons ×1.5 every 5th night; no lairs left →
  ×0.75 from the wilds. Composition: shades always; runners 22% d3; brutes 15%
  d6; bonecasters 14% d7 (range 4.5); stalkers 16% d9; wraiths 18% d11 (phase
  through walls); colossi 10% d15 (endless). HP +5.5%/day past day 9.
- **Defense math:** shade 28hp/4dmg vs guard 7.5dmg/0.72s (+30% with
  Barracks), tower 8dmg/1.1s (range 5.5), ballista 27dmg/2.3s (range 7.5 —
  out-ranges bonecasters). Palisade 220hp/2w, stone wall 520hp/4s. Spike traps
  15 dmg + slow per step, wear out after ~3 monsters. Lair 450hp — two guards
  break it in ~20s.
- **Essence:** starts 40, cap 120, ~0.1/s day · 0.05/s night (×difficulty),
  +2 per kill (double on blood moons; lairs +25, crystals +8, boss +40),
  shrines +0.06/s. Mend 12, Smite 22, Stasis 30 (day 5), Meteor 65 (day 6).
- **Herbs:** bush yields 5 (regrows ~3.5 min); the Hospital heals 6 hp/s nearby,
  1 herb per 5 hp mended.
- **Growth:** wanderer at dawn if food ≥ 14 and beds free (65% chance);
  refugees ×2 every 3rd day; pop cap 44.

Every knob is one edit in `CONFIG` — tune freely.

## Architecture

```text
index.html          shell: canvas + HUD/panel/screen DOM
onefile.html        portable build with the same CSS and JavaScript embedded
css/style.css       mobile-first dark UI, safe areas, touch targets
js/core.js          CONFIG (all balance), enums, utils, global state G
js/art.js           every sprite painted procedurally (16px), title art
js/world.js         seeded map gen (noise), guarantees, baking, queries
js/path.js          A* (binary heap, 8-dir); monsters path through walls
js/buildings.js     BUILD defs; placement/construction/farms/towers/repair
js/entities.js      villager & monster factories, names, traits
js/game.js          simulation, day cycle, jobs, waves, combat, events
js/powers.js        Mend / Smite / Meteor
js/save.js          localStorage autosave and three slots
js/render.js        camera, y-sorted draw, lighting, minimap, effects
js/ui.js            touch/mouse input, panels, selection, tutorial, screens
js/main.js          boot and fixed-cadence game loop
```

The labeled source-boundary comments inside `onefile.html` mirror this load
order, so the portable build remains navigable.

**Console hooks** for tinkering: `DBG.res('wood',100)`, `DBG.dusk()`,
`DBG.wave(8)`, `DBG.vill(3)`, `DBG.day(9)`, `DBG.lairs()` (press **L** in game
to toast lair positions), plus `G`, `Sim`, `BUILD`, `CONFIG` are global.

### Performance notes
Terrain is baked once to an offscreen canvas; entities are capped
(70 monsters / 44 villagers); AI thinks at ~2Hz staggered; night lighting uses
a half-resolution destination-out pass with capped light count; the minimap
redraws at ~3Hz.

## Ideas if you want to extend it
Weather (rain slows foraging), wandering traders, villager
relationships/morale, scenario maps, cloud saves, a second map theme
(snowbound valley), seasonal crop rotations.
