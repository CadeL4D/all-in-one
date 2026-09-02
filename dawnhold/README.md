# DAWNHOLD — a colony survival RTS

A complete, mobile-first single-player colony-survival RTS in the spirit of
**Rise to Ruins, RimWorld, Oddrealm and Final Outpost** — available as an
editable HTML/CSS/JS source tree and as one self-contained HTML file. It has no
assets, sound, or dependencies, and every sprite is hand-painted procedurally
in code. Build a village by day, hold back the horde by night, and light the
Great Beacon to bring back the dawn.

> **v1.5.1 — The Daycraft Update, trimmed:** the day itself stays playable.
The **bench** gives the guardian **six warm hands a day** (a little
hand-meter by the dock) to spend on ~8-second touch-work at any ready
worksite — **twelve minigames**, each painted and playable, each paying a
stock the village already tracks: split logs on the swing's sweet band, hook
the bobber's dip, trace a boulder's glowing fault, circle a berry bush past
its thorns, swipe wheat with the wind, knead and stir to the bounce, strike
when the forge bar flares, match feather patterns, tap cresting brew-bubbles,
dip wicks on the wave, suture without crossing the red. And **the Deep Seam**
below a Mine Shaft is push-your-luck mining: a **spinning wheel** rules every
level deeper — **okay, injured, dead** — and an injured or dead miner gets
one chance at the **rescue skill game**: injured becomes okay, dead becomes
injured. The Kindling's braziers and the Muster Yard shipped in v1.5.0 and
are gone in v1.5.1, cut at the guardian's request. The v1.5 balance audit
stands: earlier, hungrier nights, a real essence bank, and a ceiling that
rises in endless mode. Rebuild the portable file anytime with `node rebake.js`.

> **v1.4.2 — The Pocket Update:** built for the **vertical phone screen**.
> One control row up top — the day clock stretches while **round pause/speed
> buttons ride the right corner** — and the materials chips run full-width
> beneath it (the Materials tab rides as the last chip); the minimap shrinks
> to a **little orb that expands while you steer it**. The build menu finally
> **shows every building's sprite** with
> icon costs, a greyed can't-afford state, and **one-line intents** — jobs
> became a **compact card grid** — and **holding any card pops its full
> story**. Nights are **graded by phase** — dusk bleeds orange into violet,
> dawn washes gold — and torchlight now breathes. Toasts fold repeats into a
> **×N badge** instead of stacking copies, the difficulty picker grew a
> **Back** button, and the title moon is a proper crescent again.
> Rebuild the portable file anytime with `node rebake.js`.

> **v1.4.1 — The Materials Bar:** all resource chips in **one bar** ending
> in a **Materials tab** — live stock &amp; storage for every good, with
> show/hide and drag-to-reorder (the vital five first by default; flour and
> charcoal now visible). The +/− **zoom buttons are gone** (pinch/wheel
> remain), the **Map** button left the dock for that tab, and the **build
> menu scrolls on touch**: only a card's **⠿ grip** drags it out, so a
> scrolling finger can't place buildings by accident.

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

### v1.5.1 — Braziers and the Muster Yard removed

The guardian played the Daycraft build and asked for two of its day-3/day-5
flagships to go:

- **The Kindling is out.** No braziers, no kindling, no monolith cleansing —
  lairs are raided the old way again (guards, spikes, arrows), and a
  monolith's mend-and-defenders behavior is back to unconditionally on.
- **The Muster Yard is out.** No drills, no rally horn — guard damage comes
  from the Barracks alone.
- **The bench is twelve games.** The Spark (kindling) and the Effigy (drills)
  existed only to power the two removed buildings and left with them; the
  other twelve games and the Deep Seam are untouched.
- Saves round-trip: a v1.5.0 save that had braziers or a Muster Yard loads
  clean — those buildings are quietly dropped and their tiles freed.
- Portable file rebuilt with `node rebake.js`; headless suites green.

### v1.5.0 — The Daycraft Update
- **The bench — six warm hands a day.** A small hand-meter by the dock
  refills at dawn; each session spends one hand and runs ~8 real seconds
  while **the world keeps simulating**. Every worksite advertises its game on
  the selection card (**✋ The ...**); wild trees, boulders and berry bushes
  get their own little cards. Hands run out → the games grey out and a
  player who never touches the bench loses nothing — the guardrail stands:
  no new stocks, jobs or panels, and six sessions can't gate the night.
- **The fourteen games, each with its own painted scene:** the **Chop**
  (split logs inside the swing's amber band, +1 wood a split, 6 a session);
  the **Line** (hook the bobber's dip, land the fish in the ring — a clean
  landing doubles the catch, the rare dawn-silver pays essence); the
  **Fault** (trace a boulder's glowing crack without slipping: +2 stone and
  the rock holds one extra unit); the **Comb** (circle the bush, dodge the
  thorns: +3 berries and the bush regrows ~30s sooner); the **Sickle**
  (swipe the rows with the wind: +2 grain, the plot re-seeds itself); the
  **Knead** (tap-tap-HOLD on the dough's bounce: three loaves for two's
  flour); the **Stir** (keep the ladle in the swirl: 3 meals where 2 stood);
  the **Hammer** (strike the flare in the hot zone: a dead-center blow forges
  a **true tool** that lasts twice as long); the **Flight** (match the
  feather pattern: 14 arrows where 10 stood); the **Brew** (tap bubbles as
  they crest: the pour at dusk is **bright ale**, +15% work instead of
  +10%); the **Dip** (dip the wicks on the wave: torches sip half oil
  tonight); the **Suture** (trace the wound without crossing red: the
  medic's herbs mend +15 hp each for the day); the **Spark** (rapid-tap the
  striker until the brazier catches — a fast kindle is a **strong kindle**,
  a night and a half of burn); the **Effigy** (tap the shape the straw shade
  raises: the yard's +10% drill lands a day early).
- **The Kindling — braziers:** buildable (day 3, mystic), kindled for 4
  wood + 8 essence. A lit brazier is a super-torch (great warm light), burns
  fuel only through the dark, and gutters at dawn — or mid-night if you
  skimped the spark. Planted beside a **Dark Monolith** it **cleanses** it:
  no mending, no defenders for the raid-less, 4 damage a tick around the
  clock until the stone cracks into **dawn-stone** (+30 stone, +12 essence)
  without a single grave. A slow day-campaign; three braziers' worth of
  nights reclaim a lair.
- **The Muster Yard:** buildable (day 5, defense, one only). Pick the drill
  — **shields** (vs runners), **pikes** (vs brutes), **scatter** (vs
  stalkers) — and guards near the yard drill it in about a minute of
  daywork for a **permanent +10% damage** against that type (stacks to
  +30%). **Ring the horn** to rally off-duty guards to the yard. Raid
  orders pause the drilling.
- **The Deep Seam — push-your-luck mining:** order **Dig Deeper** on a Mine
  Shaft (once a shaft a day) and the nearest free miner descends — off the
  map, beyond the dark's reach. Each level is another spin of the **wheel**,
  three sectors sized by depth: **okay, injured, dead** (day 1: 90/8/2 — by
  depth 6 it reads 55/28/17). Okay pays on the spot: stone, double stone,
  **flint** at depth 3 (tools last +25% for three days), then **crystal
  flecks** of essence; climb out any time to keep it. A collapse seals the
  tunnel back to depth 0 — and an **injured** miner crawls out at 30%
  health, while a **dead** one is gone. Injured or dead, you get one chance
  at the **rescue**: steer the ropeline through falling rock — win, and
  **injured becomes okay, dead becomes injured**; lose, and the outcome
  stands. The chronicle remembers every descent.
- **The balance re-look ships** (Normal figures): nights bite from the
  start — wave curve `2.0 + 1.95 × day` (day 3 ≈ 8, the blood moon ≈ 18),
  night-1 floor 4, shade damage 5, runners debut day 2. Mouths matter:
  hunger rate 0.42, fishers land a fish per 6.0s. Essence is a bank again:
  cap 100, passive 0.075/s, every kill pays at least **3** (perKill is now
  live as a floor), Stasis at day 3 and Meteor at day 5 give it somewhere to
  go. The ceiling rises: monster HP scales **+8.5%/day** past day 9, and
  endless-mode waves cap at **38** past the Beacon. Full table still in
  `CONFIG`; `js/core.js` is the one edit per cell.
- **Fixed:** harvested wheat plots were being handed `CONFIG.FARM.replant`,
  which had never been defined — `growth` went `NaN` and farmers never
  worked a plot again after its first harvest. The replant height now
  exists (0.06), so plots cycle forever.
- Old saves keep working: hands, buffs, drills, lit braziers, seam depths
  and muster drills all round-trip; a save from v1.4 loads with the bench
  untouched and full hands.

### v1.4.2 — The Pocket Update
- **Portrait-first HUD:** on narrow screens the top collapses to **one
  control row** — the day clock stretches to fill it while compact **round**
  pause/speed/menu buttons ride the right corner — and the materials chips
  run **full-width rows** beneath (no more chips lost past the screen edge;
  the Materials tab rides as the **last chip**). The minimap becomes a 64px
  orb that **expands to full size while touched** and tucks back after a
  moment; the orb, toasts, tutorial and boss bar pin just below the
  materials block (JS tracks its live height every tick).
- **Build cards show the buildings:** each card now carries its real sprite —
  `drawCardIcon` was already called but every regular card lacked a `<canvas>`
  to paint into, so the menu was text-only. Costs render as the same 16px
  icons the bar uses (red when short), unaffordable cards grey out, and each
  card says only its **one-line intent** (`short` in `BUILD`).
- **Jobs board, compact:** duties render as a **card grid** (two columns on
  a phone) — icon, name, count and wide −/+ taps, no paragraph per row. The
  whole roster fits one screen.
- **Hold any card for the full story:** press-and-hold a job or building
  card pops a detail card (description, recipe, unlock) and fades; the
  release that ends a hold never counts as a tap.
- **Graded nights:** dusk tints orange → violet as the dark rises, dawn
  washes gold, torch warm-glow radii wobble with the flame, the lit Beacon
  pulses. Blood-moon and existing light holes unchanged.
- **Calmer toasts:** identical consecutive messages fold into a **×N badge**
  on one toast (timer restarts) instead of stacking copies; at most **two**
  show at once.
- **Title flow:** the difficulty picker has a **Back** button (it no longer
  replaces New Game with no way back), and the title/defeat crescent moon is
  a proper pixel crescent — the old offset rectangle painted a dark box over
  the stars (the "broken L" artifact).
- **`node rebake.js`** regenerates `onefile.html` from the source tree
  (byte-identical to the committed build recipe).

### v1.4.1 — The Materials Bar
- **One materials bar:** every resource chip now lives in a single top bar
  ending in a **Materials tab** (the stacked-crates button). The bottom-right
  **+/− zoom buttons are gone** — pinch (or the mouse wheel) already did the
  job — and the dock's **Map** button moved into the Materials tab as the
  **Minimap** toggle, leaving the dock at Build / Jobs / Powers.
- **The Materials tab** lists all 15 goods (flour and charcoal included, both
  with new icons) with **live stock / storage cap** for each. **Show/Hide**
  picks what the bar carries, **drag the ⠿ grip** to set the order, and
  **Reset** returns to the default spread — the vital five (wood, stone,
  food, essence, herbs) first, the rest appearing the moment the village
  first gains or builds them. Choices are pinned per material and persist in
  saves; hidden goods keep gathering.
- **Build menu scrolls on touch.** Panels used to ignore touch drags (a
  page-wide `touch-action:none`), so dragging a card 12px "placed" the
  building. Now only a card's **⠿ grip edge** starts a drag-out — the rest of
  the card and every panel scroll natively, and a tap still picks the site.

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
  JavaScript are embedded inside it. After editing the source tree, run
  `node rebake.js` in this folder to regenerate it.
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
  craft arrows/tools/meals/ale, repair — and **lend a hand**: six **warm
  hands** a day buy a few seconds of touch-work at any ready worksite (tap a
  tree, boulder, bush or workplace and press **✋**). Optional, but busy
  hands end the day ahead.
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

**Controls:** tap = select/place · drag a build card by its **⠿ edge** onto
the map to aim it, tap the outline to build (drag the rest of the menu to
scroll it) · one-finger drag = pan (or steer the ghost while placing;
walls/roads/gates/traps paint as you drag) · two-finger drag/pinch =
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

- **Food:** a villager eats ~2.2 times a day (~6.5 food raw, or ~1.7 hot
  meals). Bush yields 7 (regrows ~3 min); wheat plot yields 15 per ~95s of
  sun (farmer +20%, windmill within 6 tiles +35%); fishing dock ~1 food /
  6s per fisher. Starting food covers ~2 days.
- **Waves (Normal):** `round(2.0 + 1.95 × day)` capped at 30 (38 in
  endless, past the Beacon), ×0.68 Easy, ×1.38 Hard, 0 Peaceful; night-1
  waves floor at 2/4/5 (Easy/Normal/Hard); blood moons every 5th night at
  ×1.2/×1.35/×1.5/×1.75 by difficulty; no lairs left → ×0.75 from the
  wilds. Composition: shades always; runners 22% d2; brutes 15% d6;
  bonecasters 14% d7 (range 4.5); stalkers 16% d9; wraiths 18% d11 (phase
  through walls); colossi 10% d15 (endless) — debut days shift −1 on Hard,
  +1 Easy, +3 Peaceful. HP +8.5%/day past day 9.
- **Defense math:** shade 28hp/5dmg vs guard 7.5dmg/0.72s (+30% with
  Barracks), tower 8dmg/1.1s (range 5.5),
  ballista 27dmg/2.3s (range 7.5 — out-ranges bonecasters). Palisade
  220hp/2w, stone wall 520hp/4s. Spike traps 15 dmg + slow per step, wear
  out after ~3 monsters. Lair 1100hp, mends 0.6%/s when not struck for 8s,
  and spawns day-scaled defenders (up to 5 alive, every ~7s) while raided —
  a 3-guard raid is a rolling fight, not a 20-second teardown.
- **Essence:** starts 40, cap 100, ~0.075/s day · 0.05/s night
  (×difficulty), every kill pays at least 3 (more from brutes, colossi and
  the boss; double on blood moons; lairs +25, crystals +8, boss +40),
  shrines +0.06/s. Mend 12, Smite 22, Stasis 30 (day 3), Meteor 65 (day 5).
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

- **The bench (v1.5):** six warm hands a day; a session is ~8s of touch-work
  for a capped bonus — Chop ≤ +6 wood, Line ×2 catches (+essence for the
  dawn-silver), Fault +2 stone & +1 hidden yield, Comb +3 food & ~30s sooner
  regrow, Sickle +2 food & a re-seeded plot, Knead 3 bread for 2 flour,
  Stir 3 meals for a normal batch, Hammer true tools (2× wear life), Flight
  14 arrows per batch, Brew bright ale (+15% at the next pour), Dip half oil
  tonight, Suture +15 hp per herb today. The Deep Seam: pay
  3/6/6(+flint)/8+6ess/10+10ess a level, then 12+12; odds 90/8/2 at depth 1
  → 55/28/17 at depth 6, floor 40/30/30; the rescue turns injured→okay and
  dead→injured.

Every knob is one edit in `CONFIG` — tune freely.

## Architecture

```text
index.html          shell: canvas + HUD/panel/screen DOM
onefile.html        portable build with the same CSS and JavaScript embedded
rebake.js           regenerates onefile.html from index.html + css/ + js/
css/style.css       mobile-first dark UI, safe areas, touch targets
js/core.js          CONFIG (all balance), enums, utils, global state G
js/art.js           every sprite painted procedurally (16px), title art
js/world.js         seeded map gen (noise), guarantees, baking, queries
js/path.js          A* (binary heap, 8-dir); monsters path through walls
js/buildings.js     BUILD defs; placement/construction/farms/towers/repair
js/entities.js      villager & monster factories, names, traits
js/game.js          simulation, day cycle, jobs, waves, combat, events
js/powers.js        Mend / Smite / Stasis / Meteor
js/daycraft.js      the bench: 12 minigames, warm hands, the Deep Seam
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

## The city-building gap — diagnosis & candidate backlog

*(Written 2026-09-01 at the guardian's ask, replacing the shipped v1.4/v1.5
audit sections — both live on in the changelog above. This is the standing
backlog: what's wrong with the building layer, and what would fix it.)*

**The one-line diagnosis: other builders make you assemble a machine in
space; Dawnhold lets you assemble a shopping list.** The layer isn't missing
features — the chains, caps, tools and auras all exist — it's missing
*pressure* that makes **where** and **why** you build matter. Left alone the
build loop self-terminates around day 5–6: the palisade ring is drawn, food
is stable, and nothing ever demands a bigger village.

### What Rise to Ruins has that Dawnhold doesn't

- **A land war.** Corruption creeps across RtR's map and fire pits push it
  back — every placement is a tug-of-war over territory. Dawnhold's dark is
  three fixed monoliths; the map never fights back.
- **Rebuild churn.** RtR's defenses are ground down every night, so
  construction never stops. Dawnhold's walls are tanky and repair is nearly
  free (`CONFIG.REPAIR`: 1 resource per 24 hp) — the shell stabilizes.
- **Construction that summons labor.** In RtR, placing a building makes the
  village visibly swarm to it. A Dawnhold building does nothing until a job
  slider moves; the indirect layer is less reactive than the genre it sits in.
- **Perk variance.** RtR runs diverge (God-Experience chests). A Dawnhold
  build order is deterministic — day-3 towers, day-4 windmill, every time.
- The god layer Dawnhold already matches (essence, shrines, Smite, Meteor);
  what's missing is essence coming back as villager-visible things — RtR
  builds golems and faith with it.

### Why it feels flat — three structural reasons

1. **The global pool flattens space.** The kiln, press and windmill transmute
   `G.res` with nobody fetching anything, and crafters pull from the pool too
   (`Buildings.update`). The windmill's 6-tile breeze and the dock's shoreline
   are the only placement puzzles; haul distance is a soft, invisible cost, so
   the dominant strategy is sprawl.
2. **Demand never escalates.** The need ladder is static and fully revealed by
   day 5, population caps at 44 (`ARRIVE.maxPop`), and the Beacon wins around
   day 10. No threshold ever demands a new good → a new chain → a new
   building. Great builders feed you exactly that ladder.
3. **A run is too short for a city.** A campaign is about an hour, and the
   build menu stops changing meaningfully just as the Long Night arrives.
   Endless mode exists, but nothing in it demands growth either.

### Candidate fixes, in payoff order

1. **Real hauling everywhere.** Extend the v1.2 supply lines to the whole
   economy: charcoal shouldn't teleport from the pool into the kiln — every
   conversion becomes a carried trip (`CARRY: 8`), so distance becomes a rate,
   warehouse and granary placement becomes layout, and the village visibly
   moves its own goods. The single biggest lever, and most of the machinery
   (haulers, `Buildings.nearestStore`, the Warehouse) already exists.
2. **Eager hands.** A finished building auto-pulls one idle villager into its
   job (overridable in the roster panel). Placement reads instantly as
   cause → effect — the RtR swarm, kept honest.
3. **Escalating demand.** Arrivals won't stay past pop 12 without cottages,
   past 20 without ale, past 30 without bread and a Schoolhouse — population
   becomes the need-chain engine. Hooks the existing COMFORT leave-chance, and
   every threshold is a new chain the player must build.
4. **Irrigated plots drink water** *(already queued)*. The farm → Irrigated
   Plot upgrade only keeps its faster rows while a hauler keeps the channel
   fed from a well — water becomes a spatial constraint farms must drink from,
   and wells become infrastructure worth clustering around instead of a
   set-and-forget bucket.
5. **The long-shadow frontier.** Each dawn, every surviving monolith pushes a
   visible shadow-line a tile or two further into the valley; inside the line,
   work rates sag and the wild thins. Light holds it — torch rings, tower
   reach — and destroying a monolith rolls the line back for good. The map
   becomes territory and the endgame becomes a land-grab. (Deliberately not
   the rejected Restless-Dark blight stains: the line moves at dawn scale and
   clearing it is conquest, not weeding.)

### The second tier — what else the great builders have

Seven more gaps, named 2026-09-01; none overlap the five above:

6. **Show the machine.** Placement ghosts with real radii — the windmill's
   6-tile breeze, tower range, well draw-radius — plus a walk-time overlay
   once real hauling lands. The five fixes above only pay off if the game
   teaches placement; this is the cheapest item and multiplies all of them.
7. **Dawn-stone miracles — essence that builds, not just burns.** Monoliths
   crack into dawn-stone, spendable on overnight blessings: a plot ripens at
   first light, the kiln draws no wood tonight, a sun-wrought hauler works one
   full day, a breached wall stands whole at dawn. Raids start feeding the
   city and the Long Night leaves something behind — closes the
   "essence as villager-visible things" gap named above.
8. **Villagers who remember (growth, not wants).** Event-written titles: the
   guard who held the breach becomes a Warden (won't flee, strikes harder),
   the first baker earns the Master's apron (teaches faster than the
   schoolhouse). History, not the rejected villager-wants — the chronicle
   gains protagonists and the city gains a face.
9. **Wear & the warden's round.** Tool wear is the best-tuned sink; buildings
   never age. Slow, visible wear (walls grey, roads rut, crack sprites)
   patched by a staffed maintainer walking a daily round — churn becomes a
   labor decision, not a resource tax. (Upkeep sat on the endorsed v1.2
   shortlist, never built, never rejected.)
10. **Runs that diverge — conquest relic picks.** Breaking a monolith offers
    pick-1-of-3 carved relics that rewrite one rule for the rest of the run:
    towers fire twice as fast but 2 arrows a shot, farmers tend a neighbor's
    plot, wells draw at dusk too. Earned mid-run by raiding — unlike the
    rejected opening-boon handed out at minute one.
11. **The valley's bones.** Worldgen occasionally lays a boulder spine, a dry
    ravine or an ancient causeway the horde must bend around, so every map
    asks a different wall line. (They Are Billions lets the map design the
    wall; Dawnhold's valley is open lawn and every map plays the same.)
12. **A face for the ladder — Hamlet → Village → Town.** The
    escalating-demand thresholds also visibly promote the village: a banner
    by the camp, a bell at the well, the chronicle renames the place,
    arrivals come faster. Makes the need-ladder legible and gives a run a
    shape you can see from across the valley.

### The third tier — fresh angles, named 2026-09-02

Seven more, named at the guardian's ask; none re-pitch the twelve above —
where one extends an earlier item it says so openly:

13. **Desire paths.** The ground keeps score of footfall: tiles crossed often
    trample from grass to dirt to a worn path, and a path underfoot lifts walk
    speed a notch — haulers included, so the village's own traffic starts
    writing its streets before the player touches anything. Paving the busiest
    lines with stone buys the full bonus, but the map shows where the roads
    want to be. No new UI and no collision change (bodies still pass through
    each other; only the ground remembers) — the terrain half of eager hands,
    and two day-10 villages end up with visibly different scarring.
14. **The walk home.** Once real hauling makes distance a rate, housing makes
    it a tax: each villager claims the free bed nearest their workplace, and a
    long commute sags COMFORT and delays the morning's first chore. Cottages
    stop being a count ("+4 cap") and become placement — a bed by the mill, a
    bed by the palisade — and the leave-chance gets a cause the player can
    see: the poor hauler sleeping clear across the valley. (Distinct from
    escalating demand, which is about how many beds; this is where they
    stand.)
15. **The valley keeps one secret.** Every worldgen roll buries exactly one
    restorable ancient site — the Deep Well (its bend never draws down), the
    Sun Stair (terraced plots that never exhaust), the Old Span (the one safe
    crossing of a dry ravine), the Hollow Court (a light-well that shoves the
    shadow-line back a tile) — and restoring it is a heavy mid-run goal. The
    site is different every map, so every valley offers a different
    build-around: variance from the land you chose, not a minute-one boon
    (that's why it's a place to restore, not a perk handed out).
16. **The land keeps score.** Use depletes: farmed rows slowly exhaust and lie
    fallow, clay and surface stone run out, and a bend's wells share one water
    table that sags if over-clustered — territory becomes consumable,
    rotation becomes a verb, and even a warless valley reshapes itself over a
    long run. The use-driven twin of the long-shadow's conquest-driven
    thinning; regrowth of the wild is slow and passive only — no nursery
    building (Wildcraft stays dead).
17. **Weather writes on the valley.** The worldgen bones go live: rain swells
    the dry ravine and closes its crossings for a day so hauls and guards
    detour, a dry fortnight sags every well's bend, a storm dawn slows work
    outside the walls. A readable two-day sky line keeps it a routing puzzle,
    not an ambush — the map you settled keeps arguing with your layout, and
    the valley's bones and the land's depletion start to move.
18. **Meat has a clock.** Kills and pressed goods decay where they lie — gone
    by dusk unless hauled — so the hunt, the weir and the press become races
    against the granary's distance, and a cheap smokehouse at the far camp is
    the difference between a feast and a loss. The urgency lever on top of
    real hauling: hauling makes distance a rate, spoilage makes it a deadline.
    (Ships with hauling or after it, never instead of it.)
19. **The second clearing.** The endgame of the land-grab: past Town, the
    valley allows a second settlement — a claimed clearing with its own well
    and bed-count and one caravan hauler walking the provisioning loop between
    the two stores. The same machine-in-space levers, doubled and stretched to
    caravan distance, with two fires holding the shadow-line instead of one.

### The fourth tier — feel & pressure, named 2026-09-02

Eight more, pitched at the guardian's ask and grounded in the same day's code
pass (zero audio calls, no villager name field, day-number unlock gates, blood
moons announced only at dusk, waves from pre-picked sides, villager deaths
leave nothing behind); none re-pitch the nineteen above. First four are cheap
feel, last four are systemic:

20. **The roster gets names.** Villagers are anonymous — no name field
    anywhere in `entities.js`. Give every arrival a name and everything
    downstream gains a face: the roster reads like people, the chronicle
    narrates them, and the villagers-who-remember titles get protagonists to
    pin themselves on. Smallest item on the whole list, biggest per-line
    feel.
21. **Graves for the village dead.** The object system already has graves
    (`OBJ.GRAVE` — raid debris where monsters fall), but a villager who dies
    at night just vanishes. Give the village's dead the same stone: a body
    must be hauled to rest (a CARRY trip once real hauling lands) or nearby
    comfort sags, and the chronicle gains their line. The fallen Warden's
    grave by the gate is the story item 8 wants.
22. **The valley gets loud.** Not one audio call in the codebase. Ambient
    loops per working building — the mill's whoosh, the anvil, the chop —
    and night howls drifting in from outside the walls, so you *hear* the
    machine running and hear it stop. Zero simulation cost; the most
    untouched feel lever left.
23. **The dark calendar.** Blood moons already fire on
    `G.day % CONFIG.WAVE.bloodEvery` and multiply the wave, but the cycle is
    only announced at dusk. A moon dial on the HUD shows the month ahead —
    fat moon to plan under, blood moon to brace for — and the week gets a
    heartbeat: expansion becomes a gamble against a readable clock.
24. **The dark learns.** Waves arrive from pre-picked sides (`G.nextSides` →
    `World.edgePoint`) no matter where you're weak. Each raid remembers where
    the last one bled: the side that took the worst hits sends the next wave
    harder until you re-fortify or bait it. Walls stop being a ring you draw
    once and become a conversation — the RtR land-war feeling on the threat
    side, no Restless Dark anywhere near it.
25. **Unlocks by feat, not by date.** The build menu gates on day counters
    today (`def.unlock` — "Unlocks day 3"). Gate on feats instead: towers
    when the palisade ring closes, the windmill when the granary fills once,
    the Barracks after surviving a blood moon. Closes structural reason 3 —
    the one gap no earlier item fixed: the menu keeps changing all run and
    rewards play, not the clock.
26. **The circuit peddler.** Nothing exists outside the valley. A peddler's
    wagon arrives on schedule with contracts — 12 ale by second dawn, 20
    bread before the blood moon — paying tools, essence or dawn-stone.
    Surplus gets an export and the machine a deadline; distinct from
    escalating demand (what arrivals need) — this is what the outside world
    pays for.
27. **Three crowns.** One win exists — light the Beacon, survive the Long
    Night. Alternates: the Purge (every monolith down, the long-shadow
    rolled back) and the Charter (Town rank held a full season). Each run
    leans toward a different crown — replay variance aimed at the "every
    build order is deterministic" RtR gap.

### Guardrails, restated

No villager hiding indoors; no villager-versus-villager collision; no
researched corruption sets (Restless Dark stays rejected); Wildcraft stays
dead. Whatever ships must make two villages look different by day 10 — that's
the acceptance test for the whole list.
