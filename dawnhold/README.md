# DAWNHOLD — a colony survival RTS

A complete, mobile-first single-player colony-survival RTS in the spirit of
**Rise to Ruins, RimWorld, Oddrealm and Final Outpost** — available as an
editable HTML/CSS/JS source tree and as one self-contained HTML file. It has no
assets, sound, or dependencies, and every sprite is hand-painted procedurally
in code. Build a village by day, hold back the horde by night, and light the
Great Beacon to bring back the dawn.

> **v1.4 — The Difficulty Spread:** every preset is a **different game**, not
> a stat slider — 21 levers per difficulty: scarcity (starting stores, wild
> yields, regrow, map density, build costs), the horde (speed, **debut days**,
> blood moons, monolith mending, night-1 waves, essence) and village life
> (**day length**, wanderer arrivals, daylight ambushes, comfort, wells, tool
> wear). Hard starts hungry, rushed and ambushed; Peaceful is a cozy build
> sandbox. The menu tables at the bottom of this README are the shipped
> values.

> **v1.3.1 — Touch &amp; Raids:** **drag a building card straight out of the
> menu** — the ghost rides your finger, release parks it, tap the outline to
> build (one finger steers the ghost, **two fingers pan**). The build ✕ now
> sits by the dock, and resource chips are bigger and brighter. Raids fixed:
> the false **"no route"** is gone (grave rings around monoliths no longer
> seal the raid check), guards no longer freeze against brood standing on the
> monolith itself, and fresh maps keep every melee tile around a lair clear.

> **v1.3 — The Village Round:** the village needs **water** (wells, and a
> **Bottler** who spares villagers the walk), **lamp oil** (kiln chars wood,
> the press squeezes oil — torches gutter when it runs dry), **bread** (the
> Windmill grinds flour for the one-and-only **Bakehouse**), and **schooling**
> (a **Scribe** teaches villagers one at a time; the schooled work +12%
> forever). Wood is now the deliberate crunch resource.

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

### v1.4 — The Difficulty Spread
- **Every preset is a different game, not a stat slider.** The four
  difficulties used to differ by four knobs (wave size, monster HP, night
  length, essence regen). Each preset now sets **21 levers** across the
  wilds, the horde and village life — the full A1–C6 menu from this README
  shipped (tables below, now documentation rather than a wishlist).
- **Scarcity (A1–A5):** starting stores ×1.25 Peaceful → ×0.7 Hard; wild
  yields ×1.15 → ×0.7 (a bush drops 8 on Peaceful, 5 on Hard — the kiln's
  10-wood floor and the store caps finally bite on Normal too, ×0.85);
  regrow speed, map density (≈890 harvestable wilds on a fresh Peaceful
  map vs ≈725 on Hard) and build costs (×0.9 → ×1.15) all scale. Every cost
  check, payment, refund, upgrade and menu display now funnels through one
  `Buildings.costOf()` so the charged price can never disagree with the
  shown one.
- **Monsters (B1–B6):** speed ×0.9–×1.08; debuts shift +3 days on Peaceful
  → −1 on Hard (brutes at day 5, wraiths at day 10 on Hard — the
  *composition* changes, not just the count); blood moons ×1.2 / ×1.35 /
  ×1.5 / ×1.75; unraided monoliths mend ×0.5–×1.5; night-1 waves floor at
  0/2/3/5; essence payouts ×1.25 → ×0.9.
- **Village life (C1–C6):** day length 240/225/210/185s (the HUD clock
  reads the preset); wanderer arrivals 80/70/65/50%; daylight ambushes
  vanish on Peaceful (the hostile band sits exactly under the good-event
  band) and widen ×1.5 on Hard; comfort spreads (crowded Hard villagers
  work ×0.85); well output ×1.25 → ×0.9; tool wear ×0.8 → ×1.15.
- **Title screen:** the four difficulty buttons now say what each preset
  does ("Scant stores, hungry dark, short days").

### v1.3.1 — Touch &amp; Raids
- **Drag-to-place:** press a Build card and drag it onto the map — the ghost
  rides your finger, release parks it, and a **tap on the outline builds**
  (a tap elsewhere re-aims it). A plain card tap still arms placement; the
  first map tap now aims, the tap on the outline commits. Walls, gates,
  roads and traps keep their instant drag-paint.
- **One finger steers, two fingers travel:** while placing a building, a
  one-finger drag moves the ghost and **two fingers pan & pinch** the camera
  (as they always did — placement just stopped hogging the drag).
- **Build ✕ by your thumb:** the placing/cancel chip moved from the top of
  the screen to just above the dock, and entering placement dismisses the
  selection card so they never fight for space.
- **Readable materials bar:** resource chips reworked — 20px icons, 15px
  bold tabular numerals, darker chips with brighter borders.
- **Raid "no route" fixed:** the Raid button only searched a 5×5 box around
  the monolith for a standable tile — and failed raids bury guards where
  they fall (graves are solid pathing blockers), so repeated raids could
  pave that box shut while a route plainly existed. The search now reaches
  one ring further out (`snapR 3`), **deaths beside a monolith leave no
  grave**, world generation clears all 8 melee tiles around every lair (the
  dead-tree ring stays a step beyond), and a truly walled-in monolith calls
  the raid off with a *clear the ground around it* hint instead.
- **Guards freeze-fixed at monoliths:** brood defenders spawn standing on
  the monolith tile itself, where guards couldn't share footing — swing
  reach against solid-footing quarry rose 1.6 → 2.2 (with a wider path
  snap), so raiding guards cut defenders down from the second ring and get
  back to the monolith instead of repathing forever while it mends.
- Help/controls text updated for the new flow; title-screen version label
  refreshed (it still said v1.1).

### v1.3 — The Village Round
- **Thirst, wells & the Bottler:** villagers now drink like they eat. A free
  **Well** stands by the starting camp (+1 water per 10s; build more), and a
  thirsty villager walks there for a drink — real time lost to the trip. A
  **Bottler** at the Bottlery fills 2 water into 2 bottles; bottled drinks
  happen on the spot, wherever the villager stands (Rise to Ruins' exact
  "fewer trips = more work" loop). Ale at dusk counts as a drink. Parched
  villagers (thirst 90+) work at 70% and drag their feet; a truly dry village
  loses health slowly.
- **Charcoal kiln & lamp oil:** the **Kiln** chars 2 wood → 1 charcoal (never
  dipping below 10 wood); the **Oil Press** squeezes 1 charcoal + 1 herb →
  3 lamp oil. Torches each sip 1 oil per minute of night and **gutter to
  half-light** when the store runs dry — wood now feeds arrows, tools,
  meals, oil and walls, all from the same tree.
- **Bakehouse & the mill:** while a **Bakehouse** stands (one per village —
  the lord's monopoly), the Windmill grinds 1 wheat → 1 flour (never below
  12 food). A **Baker** turns 2 flour + 1 water → 2 bread: the third food
  tier (berries < meals < bread, restores 110) and it never spoils. Bread is
  eaten first.
- **Scribe & the Schoolhouse:** a **Scribe** teaches one villager at a time
  (the student attends class instead of working — a pair of hands now for
  better hands later). The schooled work **+12% forever**. Guards drill
  instead of studying.
- **New jobs (3):** Bottler (Bottlery), Baker (Bakehouse), Scribe
  (Schoolhouse) — each gated on its workplace like the v1.2 crafters. The
  roster is now 15 duties.
- **New buildings (5 buildable + the starting well):** Well, Charcoal Kiln,
  Oil Press, Bottlery, Bakehouse, Schoolhouse — all with hand-painted
  procedural sprites, night windows, and HUD chips (water always visible;
  oil/bottles/bread appear when relevant).
- Old saves keep working: the new resources default to their starting
  values, and a villager's thirst/schooling state round-trips cleanly.

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
Fisher, Medic, Fletcher, Smith, Cook, Brewer, Bottler, Baker, Scribe, Builder,
Guard) and they work autonomously. They also **drink** — a well and a Bottler
keep them at their posts.

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

**Controls:** tap = select/place · drag a build card onto the map to aim it,
tap the outline to build · one-finger drag = pan (or steer the ghost while
placing; walls/roads/gates/traps paint as you drag) · two-finger drag/pinch =
pan & zoom any time, including mid-placement · minimap tap = jump ·
pause/1×/2×/3× (or space/1/2/3).

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
| **Difficulty options** | Peaceful / Easy / Normal / Hard — a full 21-lever spread since v1.4: scarcity, monster debuts, day length, wells, tools, comfort (see the difficulty tables below) |
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
  ×1.38 Hard, 0 Peaceful; night-1 waves floor at 2/3/5 (Easy/Normal/Hard);
  blood moons every 5th night at ×1.2/×1.35/×1.5/×1.75 by difficulty; no
  lairs left → ×0.75 from the wilds. Composition: shades always; runners 22%
  d3; brutes 15% d6; bonecasters 14% d7 (range 4.5); stalkers 16% d9;
  wraiths 18% d11 (phase through walls); colossi 10% d15 (endless) — debut
  days shift −1 on Hard, +1 Easy, +3 Peaceful. HP +5.5%/day past day 9.
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
  dawn departures from day 4; the snug/crowd multipliers are per-difficulty
  since v1.4). Upgrades: tower II 30w+20s → III 60w+45s,
  farm2 10w+14s, stoneface 3s.
- **The village round (v1.3):** thirst rises 0.4/s (drink ~once a cycle);
  wells give +1 water/10s, a well-trip costs the walk, a bottle (~1.3s of
  Bottler work per 2) erases it; parched (90+) ×0.7 work, ×0.85 walk,
  0.45 hp/s at rock bottom. Kiln: 2 wood → 1 charcoal/12s (stops at 10
  wood); press: 1 charcoal + 1 herb → 3 oil/20s; each torch burns 1 oil/min
  of night (a 6-torch village ≈ 14 oil/cycle), dry torches at half light.
  Windmill grinds 1 food → 1 flour/8s while a Bakehouse stands (stops at 12
  food); Baker: 2 flour + 1 water → 2 bread (×110 hunger, eaten first).
  School: 40 teaching-seconds per villager → +12% work forever. Caps: water
  60, oil 40, bottles 30, charcoal 24, flour 30, bread 16.

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

## Research backlog — running a real village (v1.4+ candidates)

*(v1.3 shipped four of these — the charcoal kiln & lamp oil, thirst, wells &
Bottler, the Bakehouse & mill, and the Scribe's schoolhouse. v1.4 shipped the
difficulty rework instead. What remains:)*

Researched from the inspirations' actual systems: Rise to Ruins' water chain
(water master → purifier → wells → bottler) and trash slimes; Banished's
firewood economy, educated workers and sheep/wool/warm-coat tiers; Frostpunk's
coal/steam-hub heating and Book of Laws; Timberborn's droughts and the
irrigation-vs-drinking-water split; Kingdom Two Crowns' winter income drought
and coin-stealing Greed; Oddrealm's winters; RimWorld's wealth-scaled, adaptive
raids — plus how a real medieval manor ran (mill, bakehouse and brewery as
monopolies; commons grazing; wells; tithes).

### More to manage — needs, seasons & civic life

- **First Frost (Oddrealm/ Kingdom winters):** a 2-day frost hits days 7–8
  (and each 10-day cycle in endless): farm growth pauses, bush regrow halves,
  outdoors villagers take cold damage (0.5 hp/s) unless near a torch/hearth or
  wearing a cloak. Banished's numbers, scaled: a heated home beats a torch, a
  cloak beats the walk between them. Stockpile food like Kingdom, burn warmth
  like Banished. *(Shipped as the torch-oil half in v1.3 — the frost itself is
  still open.)*
- **Weaver & cloaks (Banished's tailor):** a flax plot (new crop — the only
  one that grows in frost) feeds the Weaver's loom; cloaks halve cold damage
  and add comfort, but wear out like tools. Banished's tier trick: hide
  cloaks (shepherd culls) for warmth, wool cloaks (shearing, no slaughter)
  for wear-life, and a warm cloak (wool + hide) that's twice as warm — the
  smith and weaver share the same "keep them equipped" rhythm.
- **Dry spells (Timberborn droughts):** every ~8th day a 2-day dry spell:
  shore tiles recede (docks idle, water-fill is off), wells slow, and farms
  outside an irrigation trench grow at half speed. Builders dig trenches from
  the shore (Timberborn's rule kept honest: cistern water is for drinking,
  only channels irrigate). The water-fill tool finally has a nemesis.
- **Shepherd & the commons (Banished pastures, real-manor commons):** a
  pasture on grass tiles with a **Shepherd**: sheep give wool without
  slaughter (the weaver's second input), mutton and hides on cull; herds need
  hay — a second fodder stockpile cut from grass, and the only thing they eat
  through frost. Grazing slowly depletes grass tiles, so paddocks rotate:
  land itself becomes a managed resource.
- **The Midden (RtR trash slimes, real cesspits):** a village generates
  refuse — kiln ash, husks, spoiled food, broken tools. Idle villagers haul
  it to the midden; three un-hauled piles in a 3×3 spawn a **rat swarm** (a
  mini-wave that interrupts work, exactly RtR's trash slimes). A composted
  midden turns into muck the spreader carts to farms for +25% growth — waste
  becomes the fertilizer loop, and overproduction finally has a smell.
- **The Moot Hall & edicts (Frostpunk's Book of Laws):** a civic building
  that holds one standing **edict**, swapped free at dawn: Rations (−25% food
  eaten, −10% work), Curfew (workers keep near walls after dusk, +safety,
  −night work), Feast Day (+work speed a day, costs ale + food), Water
  Rationing (drought relief, −comfort). Frostpunk's discontent/hope trade,
  expressed through Dawnhold's comfort instead of a second mood meter.

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
  store for a full day means −20% village work until 20 food is laid in; dry
  quivers do the same to guard damage (on top of the existing ×0.75), and an
  empty cistern during a dry spell joins the list. Buffers stop being
  optional.
- **The dark festers (RtR's day-15 clock):** every living lair past day 8
  adds +4% monster HP (up to +12% with all three standing). Raids already
  shrink the nights — now they also slow the festering, so raid timing
  becomes a real decision instead of "whenever."
- **Filchers in the night (Kingdom's coin-stealing Greed):** on Hard+, a few
  filchers each night ignore the camp and slip for the stores — they steal
  arrows, oil or food and flee home to their lair. Walls must enclose the
  pantry, not just the campfire; guards learn interception beats standing
  ground.
- **Grief weighs (Frostpunk's death penalties):** on Hard+, a villager's
  death leaves −15% village work for a day — halved if a grave stands within
  six tiles of the mourners' homes. Burial rites stop being set dressing.

### Balance guardrails

Wood stays the crunch resource — arrows, tools, oil and cloak-frames fight
over the same tree — while **water** becomes the second axis (drink, dough,
irrigation, drought) and food gets its third tier. Frost is budgeted by
difficulty: 1 day Easy / 2 Normal / 3 Hard, with blizzards only on Nightmare;
a Normal player with one kiln, six cloaks and a full cistern sails through.
Every new chain keeps a bare-hands fallback (unbottled villagers walk to the
well, cloakless ones huddle by torches, unirrigated farms just grow slower)
so nothing hard-locks a build. The job roster grows ~12 → 16 (Bottler,
Shepherd, Baker, Scribe, plus the Moot Hall's keeper) — each new mouth also
drinks, eats and gets cold, so growth keeps costing what it yields. Wave cap
(30) and guard/tower DPS stay untouched; pressure comes from larders,
seasons, thieves and the fester — never from bullet-sponge monsters.

---

## The difficulty spread — shipped in v1.4

Each preset is a *different game* rather than the same game tuned up or
down: on top of the original four knobs (wave size ×0.68 Easy / ×1.38 Hard,
monster HP ×0.88 / ×1.22, night length ×0.88 / ×1.15, essence regen ×1.1 /
×0.9), every preset now sets the seventeen levers below. These tables are
the shipped values — they live in `CONFIG.DIFF` in `js/core.js`, one edit
per cell. The "Harder difficulties" backlog above stays separate (those are
Hard+/Nightmare *mechanics*; these are preset *numbers*). Verified headless:
each lever measured per preset, 3-day soaks, and cross-preset orderings
(wilds 887 > 841 > 798 > 725 sources; wells 16 > 13 > 12 > 11 buckets).

### A. Resources & scarcity (the "resources feel plentiful" fix)

| # | Lever | Peaceful | Easy | Normal | Hard |
|---|---|---|---|---|---|
| A1 | Starting store (wood/food/…) | ×1.25 | ×1.1 | ×1 (today) | ×0.7 |
| A2 | Wild yields (bush/tree/rock/herb units) | ×1.15 | ×1 | **×0.85** | ×0.7 |
| A3 | Regrow speed (bushes, stumps→saplings) | ×1.25 | ×1.1 | ×1 | ×0.8 |
| A4 | Map density (trees/rocks/bushes sprinkled) | ×1.1 | ×1 | ×0.9 | ×0.8 |
| A5 | Build costs | ×0.9 | ×1 | ×1 | ×1.15 |

A2 alone at ×0.85 Normal is the scarcity fix: a bush drops 6 not 7, a tree
8 not 9 — the kiln's 10-wood floor and the store caps start to bite by
mid-game without touching combat.

### B. Monsters

| # | Lever | Peaceful | Easy | Normal | Hard |
|---|---|---|---|---|---|
| B1 | Monster speed | ×0.9 | ×0.95 | ×1 | ×1.08 |
| B2 | Debut days (runners/brutes/stalkers/wraiths) | +3 | +1 | today | −1 |
| B3 | Blood-moon horde multiplier | ×1.2 | ×1.35 | ×1.5 | ×1.75 |
| B4 | Monolith mend rate while unraided | ×0.5 | ×0.75 | ×1 | ×1.5 |
| B5 | Night-1 wave size | 0 | 2 | 3 | 5 |
| B6 | Essence payout per kill | ×1.25 | ×1.1 | ×1 | ×0.9 |

B2 on Hard means brutes at day 5 and wraiths at day 10 — the *composition*
changes, not just the count, so Hard demands different defenses (ballistae
and interior guards earlier), not just more of them.

### C. Other axes

| # | Lever | Peaceful | Easy | Normal | Hard |
|---|---|---|---|---|---|
| C1 | Day length (seconds of building time) | 240 | 225 | 210 | 185 |
| C2 | Wanderer arrival chance at dawn | 0.8 | 0.7 | 0.65 | 0.5 |
| C3 | Day-event hostility (daylight ambush weight) | 0 | ×0.5 | ×1 | ×1.5 |
| C4 | Comfort spread (snug/crowded multipliers) | gentler | snug ×1.08 | today | crowd ×0.85 |
| C5 | Well water output | ×1.25 | ×1.1 | ×1 | ×0.9 |
| C6 | Tool wear rate | ×0.8 | ×0.9 | ×1 | ×1.15 |

### Reading the spread

- **Peaceful** is a cozy build sandbox: fat wilds, fast regrowth, no waves
  or ambushes, long days, quick wells, slow tools.
- **Hard** starts hungry (×0.7 stores and yields), rushed (185s days),
  ambushed (×1.5 hostile events) and crowded (×0.85), with brutes and
  wraiths arriving a day early and monoliths mending ×1.5 between raids.
- These preset numbers stack under the backlog's **Nightmare** fifth
  difficulty if that ever ships.


