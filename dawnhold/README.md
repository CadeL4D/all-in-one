# DAWNHOLD — a colony survival RTS

A complete, mobile-first single-player colony-survival RTS in the spirit of
**Rise to Ruins, RimWorld, Oddrealm and Final Outpost** — available as an
editable HTML/CSS/JS source tree and as one self-contained HTML file. It has no
assets, sound, or dependencies, and every sprite is hand-painted procedurally
in code. Build a village by day, hold back the horde by night, and light the
Great Beacon to bring back the dawn.

> **v1.2.1 — Movement & Reach:** villagers now **walk straight through each
> other** (walls are the only solid obstacle; settled villagers still drift
> apart gently) — no more circling, orbiting or teleport-skipping around one
> another — and **guards always close to bite range**: a monster parked on a
> hut (or stood on spike traps, or lured out past the old pursuit leash) can
> no longer sit just outside swing range while guards repath forever.

> **v1.2 — Supply Lines:** the economy becomes a balancing act — four new
> jobs (**Fletcher, Smith, Cook, Brewer**) turn raw surplus into arrows,
> tools, meals and ale; **towers burn arrows**, **workers wear out tools**,
> **stores have caps** (Granaries & Storehouses raise them), **housing
> comfort** changes work speed, and buildings **upgrade in place**
> (Watchtower II/III, irrigated plots, stone-faced palisades).

> **v1.1 — The Wilds Update:** biome map overhaul (dark forests, meadows,
> highlands, sand shores) with fully redrawn, readable tree & rock art;
> **3 raidable Dark Monolith lairs** the horde crawls out of each night — and
> defends with its own brood when you raid it;
> **blood moons** every 5th night; two new jobs (**Fisher**, **Medic**) with
> herbs & a **Hospital**; **Fishing Docks, Mine Shafts, Windmills, Spike Traps,
> Barracks**; three new monsters (**Bonecasters** that snipe from range,
> **Wraiths** that drift through walls, endless-mode **Colossi**); the
> **Stasis** power; **builder land-clearing & timed demolition**; ancient ruins
> & essence crystals to salvage; and graves that remember the fallen.

---

## Changelog

### v1.2.2 — First Day & Panel Polish
- **"Day 1" means day one:** buildings labelled *Unlocks day 1* (Granary,
  Storehouse) are unlocked from the first minute of the run instead of
  appearing at the next dawn.
- **Locked duties are greyed out:** the jobs panel no longer appends a lock
  emoji — locked rows dim and desaturate (keeping their "Requires a built X"
  hint), and they **sink to the bottom of the list**, rejoining the main
  roster the moment their workplace is built.
- **Same order rule in the Build menu:** day-locked building cards sort to
  the bottom of their category and move up into place when they unlock.

### v1.2.1 — Movement & Reach
- **Villagers pass through each other** (reverses v1.1's personal-space
  steering). That steering fought itself: perpendicular sidesteps rotate with
  the heading, so two crossing villagers curved around each other endlessly,
  and both the sidestep and the crowd-separation shove were instant
  teleports (~9× walk speed — the "fast skipping"), while the phase-through
  escape valve's timer reset on nearly every think. Walls are now the only
  solid obstacle for a walking villager; no sidesteps, no waiting, no valve.
- **Settled villagers still space out:** when two villagers with nowhere to
  go stand within 0.4 tiles, they ease apart gently (a slow dt-scaled drift,
  never a shove) — idle and working crowds fan out instead of stacking.
- **Guards close the last step:** pursuit paths now finish on the monster's
  own position instead of an adjacent tile centre. Until now a *stationary*
  monster — e.g. one parked on a hut eating it — sat exactly a swing-length
  away: the guard arrived at the neighbouring tile centre (distance ~1.0–1.4,
  attack needs < 1.0), the path "succeeded" so the give-up timer never fired,
  and the guard repathed to the same spot forever while the hut was eaten.
- **Quarry on spikes is poked from beside them:** spike traps are solid
  ground for monsters but not for villagers, so a biter stood on one had its
  pursuers snap 1–2 tiles out and stand there. Guards now attack such quarry
  from the neighbouring tile (reach 1.6).
- **Pursuit reaches as far as acquisition:** guards used to spot monsters up
  to 30 tiles from camp but abandon the chase at 22 — outlying huts (fishing
  docks!) could sit in a band guards looked at but never defended. The leash
  now matches the 30-tile acquisition radius (raids keep their unlimited
  leash).
- Patrol guards only pick a new wander once the current one finishes, so
  strolls stop twitching mid-stride.

### v1.2 — Supply Lines
- **New jobs (4):** Fletcher (wood → arrows), Smith (wood + stone → tools),
  Cook (3 food + 1 wood → 2 meals), Brewer (food + herbs → ale). Each needs
  its workplace built — the duty stays locked in the jobs panel until then.
- **Ammunition:** every tower shot spends 1 arrow (ballistae 2) and raids
  pack quivers (5). Dry quivers: towers hold fire and guards fight at 75%
  damage — the Fletcher Hut pays for itself before the first tower does.
- **Tool wear:** every working villager wears out tools (~2 minutes each);
  bare hands work at 65% speed. Smiths keep the village sharp.
- **Meals:** a Kitchen meal restores 85 hunger where 3 raw berries restore
  54 — villagers always eat the Cook's output first.
- **Tavern nights:** ale poured at dusk gives every drinker +10% work speed
  the next day.
- **Storage caps:** wood/stone 120, food 80, herbs 20 by default; Granaries
  (+80 food/pantry), Storehouses (+100 materials) and Warehouses (+60)
  raise them, and overflow spoils to vermin at dawn. Hoarding now costs
  buildings.
- **Comfort tiers:** tent bedrolls < cottage beds < the new Manor. Snug
  villagers work +5%, crowded ones work slower, and a miserable village can
  lose someone at dawn — growth is a materials decision, not just food.
- **Upgrades:** select a built Watchtower, Wheat Plot or Palisade for the ⬆
  button — Watchtower II (12 dmg) → III (17 dmg, range 6.4), Irrigated
  Plots (grow ~25% faster, harvest 22), stone-faced palisades (400 hp for
  3 stone).
- **New buildings (7):** Granary, Storehouse, Smithy, Kitchen, Fletcher
  Hut, Tavern, Manor — plus 4 upgrade tiers.
- **HUD:** arrows/tools/meals/ale chips appear when relevant; resource
  tooltips show your caps.

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
  permanently smaller nights). Monoliths are stone-hard (1100 hp), slowly mend
  when not being battered, and **call day-scaled defenders every few seconds
  while raided** (max 5 alive) — raids are fights, not demolitions. Pink
  crosses mark them on the minimap.
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
  berry bushes, ruins and crystals — builders clear the footprint first (half
  the yield is salvaged) and then raise it. A **Clear Land** tool in the Build
  menu queues individual wild tiles for builders; tap again to cancel an
  order. Cleared ground stays clear — nothing regrows. The same tool
  **fills shore water with stone** (2 stone a tile, ~4s each), turning lakes
  into buildable sand — cancel a fill order before it's done and the stone is
  refunded.
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
- **Villager collisions prevented:** villagers keep half-tile personal space
  and sidestep around each other instead of overlapping and being shoved off
  their routes (the old post-hoc shoving caused repath churn). Crowds finish
  a trip just short of an occupied destination instead of orbiting it, and a
  hard jam (head-on in a one-wide corridor) briefly phases through rather
  than deadlocking.
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
Fisher, Medic, Fletcher, Smith, Cook, Brewer, Builder, Guard) and they work
autonomously.

- **Day (~3.5 min):** gather berries/wood/stone/herbs, build, farm, fish,
  craft arrows/tools/meals/ale, repair.
- **Dusk:** you're told how many monsters are coming **and from which lair**.
  Every 5th night is a **blood moon** (+50% horde, double essence from kills).
- **Night (~1.5 min):** the horde crawls out of its **Dark Monoliths** (pink
  crosses on the minimap). Guards and towers fight; you spend **Essence** on
  god powers (Mend / Smite / Stasis / Meteor). Workers keep their jobs after
  dark — they only break and run when monsters get close. Survivors burn at
  dawn.
- **Raids:** tap a monolith and press **Raid** — your guards march out and
  tear it down (+25 essence, that lair never spawns again; wipe all three and
  nights shrink to stragglers from the wilds). The monolith fights back:
  defenders pour out while it's struck and it mends between blows, so commit
  several guards.
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
  15 dmg + slow per step, wear out after ~3 monsters. Lair 1100hp, mends
  0.6%/s when not struck for 8s, and spawns day-scaled defenders (up to 5
  alive, every ~7s) while raided — a 3-guard raid is a rolling fight, not a
  20-second teardown.
- **Essence:** starts 40, cap 120, ~0.1/s day · 0.05/s night (×difficulty),
  +2 per kill (double on blood moons; lairs +25, crystals +8, boss +40),
  shrines +0.06/s. Mend 12, Smite 22, Stasis 30 (day 5), Meteor 65 (day 6).
- **Herbs:** bush yields 5 (regrows ~3.5 min); the Hospital heals 6 hp/s nearby,
  1 herb per 5 hp mended.
- **Growth:** wanderer at dawn if food ≥ 14 and beds free (65% chance);
  refugees ×2 every 3rd day; pop cap 44.
- **Supply lines (v1.2):** arrows 2 per wood (~2.4s); tower shot 1 arrow,
  ballista 2, raid 5; dry guards ×0.75 and towers hold fire. Tools 2 wood +
  1 stone, ~125s of work each, bare hands ×0.65. Meals: 3 food + 1 wood →
  2 meals × 85 hunger (vs 3 food → 54 raw). Ale: 2 food + 1 herb → +10%
  next-day work. Caps: wood/stone 120, food 80, herbs 20, arrows 60, tools
  10, meals/ale 12; granary +80 pantry, storehouse +100, warehouse +60;
  overflow spoils at dawn. Comfort: tent 1/bed, cottage 2, manor 3 →
  ×1.05 snug / ×0.95 content / ×0.88 crowded / ×0.85 miserable (possible
  dawn departures from day 4). Upgrades: tower II 30w+20s → III 60w+45s,
  farm2 10w+14s, stoneface 3s.

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

---

## Research backlog — v1.3 candidates from Rise to Ruins & friends

Researched from how the inspirations actually work: Rise to Ruins'
corruption/threat bar, firepit-push economy, Nightmare mode and meteor nights;
Banished's tools↔firewood↔food death spiral; Oddrealm's winters and spoilage;
Kingdom Two Crowns' winter income drought and Cursed mode; Frostpunk's
shortage crises; RimWorld's wealth-scaled, adaptive raid points.

### More to manage (new chains & needs)

- **First Frost (Oddrealm/ Kingdom winters):** a 2-day frost hits days 7–8
  (and each 10-day cycle in endless): farm growth pauses, bush regrow halves,
  outdoors villagers take cold damage (0.5 hp/s) unless near a torch/hearth or
  wearing a cloak. Cold counterplay is the point — stockpile food like Kingdom,
  burn warmth like Banished.
- **Charcoal kiln & lamp oil (RtR firepit economy):** kiln turns 2 wood → 1
  charcoal; the press turns 1 charcoal + 1 herb → 3 lamp oil. Torches sip
  1 oil/minute and gutter to half-light when dry; frost doubles the burn.
  Wood becomes the deliberate crunch resource — arrows, tools, meals, oil and
  walls all hunger for the same tree (RtR's lesson: every surplus is an input
  somewhere else).
- **Weaver & cloaks (Banished's tailor):** a flax plot (new crop — the only
  one that grows in frost) feeds the Weaver's loom; cloaks halve cold damage
  and add comfort, but wear out like tools. Naked-winter villagers work at
  65% — the smith and weaver share the same "keep them equipped" rhythm.
- **Smokehouse (Oddrealm's cook-before-it-rots):** from day 6 raw berries rot
  −10%/day at dawn; smoked food, meals and ale keep forever. The Granary stops
  being a dump stat — kitchen throughput becomes the real food cap.
- **New god powers — Recall & Summon Guardian (RtR's recall/defender):**
  Recall (8 essence) yanks a fleeing villager home mid-terror; Summon Guardian
  (30 essence) raises a spirit fighter that fades at dawn. Priced against
  0.1/s day regen: Recall is cheap mercy, Guardian is a deliberate splurge.
- **Meteor-shower nights & fire elementals (RtR events):** a rare night event
  rains flame patches; elementals shrug off spike traps, refuse to cross
  water, and set wooden walls alight (−8 hp/s until a builder douses them).
  Water moats and stone faces become real tactics, not decoration.

### Harder difficulties (fair pressure, not stat inflation)

- **Nightmare, a fifth difficulty (RtR Nightmare/ Kingdom Cursed):** shades
  roam from day 1, night length and wave size ×1.6, essence regen halved,
  lairs mend twice as fast. Learn the game on Easy; prove it here.
- **Wealth-scaled waves (RimWorld raid points):** on Hard+ the wave grows
  +8% per 15 built buildings past your first 10 — a tall, rich village earns
  bigger hordes (still capped at 30). Sitting on a fortress is no longer free.
- **Adaptive pressure (RimWorld adaptation/ RtR threat bar):** a flawless
  night (no damage, no one hurt) makes the next wave +10%, stacking to +50%;
  a rough night (a building lost, or two villagers hurt) eases it −10%. The
  game leans in when you're bored and lets up when you're drowning.
- **Hollow-larder crises (Frostpunk shortages):** on Hard+, an empty food
  store for a full day means −20% village work speed until 20 food is laid in;
  dry quivers for a full night do the same to guard damage (on top of the
  existing ×0.75). Buffers stop being optional.
- **The dark festers (RtR's day-15 clock):** every living lair past day 8
  adds +4% monster HP (up to +12% with all three standing). Raids already
  shrink the nights — now they also slow the festering, so raid timing
  becomes a real decision instead of "whenever."

### Balance guardrails

All five new chains pull wood — that's the design: one crunch resource with
four competing mouths (arrows, tools, oil, meals), like RtR's everything-eats-
wood endgame. Frost is tuned so a Normal player with one kiln and six cloaks
by day 7 sails through; Hard needs double that plus oil reserves. Wave math
keeps its cap of 30 and guard/tower DPS stays untouched, so existing defense
math holds — pressure comes from larders, timing and the fester, not bullet-
sponge monsters.

