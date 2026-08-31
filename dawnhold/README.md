# DAWNHOLD — a colony survival RTS

A complete, mobile-first single-player colony-survival RTS in the spirit of
**Rise to Ruins, RimWorld, Oddrealm and Final Outpost** — available as an
editable HTML/CSS/JS source tree and as one self-contained HTML file. It has no
assets, sound, or dependencies, and every sprite is hand-painted procedurally
in code. Build a village by day, hold back the horde by night, and light the
Great Beacon to bring back the dawn.

> **v1.6.0 — The Wildcraft Update:** the village stops strip-mining the map
and starts *editing* it. Order **Tend** on wild berry bushes until they stand
*tended* and then *heavy-fruiting* — tended harvests sometimes spare a
**cutting** the village can plant anywhere. The **Tree Nursery** pots a
sapling for every 2nd tree the Lumberjacks fell, and planted groves grow
back into oaks and pines. Builders **dig ponds** tile by tile — Fishing
Docks move inland, and reeds (herbs) sprout at the margin. And the guardian
draws will on the ground: **sigil-craft** chalks a **ward** (monsters
crossing it crawl and take +25% damage) or a **hallow** (guards +10%,
workers don't break) that blooms at dusk and washes at dawn. The ancient
**ruins wake**: pick what a ruin becomes — **Aqueduct, Dawn Shrine, Sky
Watch or Root Cellar** — and a Scribe deciphers while Builders raise it.
Two villagers who work side by side grow attached and **ask leave to wed** —
bless the banns for the feast, the shared hut and the couple's +10% aura.
And on some dawns a **deer herd** grazes in from the wilds: set the hunt,
lay the spike-line in their path, and drive them in. All of it is optional
upside — no new stocks, jobs or panels, and a village that never wildcrafts
still holds its walls.

> **v1.5.0 — The Daycraft Update:** the day itself becomes playable. The
**bench** gives the guardian **six warm hands a day** (a little hand-meter by
the dock) to spend on ~8-second touch-work at any ready worksite — **fourteen
minigames**, each painted and playable, each paying a stock the village
already tracks: split logs on the swing's sweet band, hook the bobber's dip,
trace a boulder's glowing fault, circle a berry bush past its thorns, swipe
wheat with the wind, knead and stir to the bounce, strike when the forge bar
flares, match feather patterns, tap cresting brew-bubbles, dip wicks on the
wave, suture without crossing the red, strike sparks until a brazier catches,
call the straw effigy's drill-shape. Braziers (**The Kindling**) burn all
night as great lights — and beside a monolith they slowly **cleanse** it into
salvageable dawn-stone, no raid and no graves. The **Muster Yard** drills
guards for a permanent +10% per monster type. And **the Deep Seam** below a
Mine Shaft is push-your-luck mining: a **spinning wheel** rules every level
deeper — **okay, injured, dead** — and an injured or dead miner gets one
chance at the **rescue skill game**: injured becomes okay, dead becomes
injured. The v1.5 balance audit ships with it: earlier, hungrier nights, a
real essence bank, and a ceiling that rises in endless mode. Rebuild the
portable file anytime with `node rebake.js`.

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

### v1.6.0 — The Wildcraft Update
- **Grovekeep — bushes become orchards.** Order **Tend** on a wild berry
  bush and a Forager calls on it across the days: wild → *tended* (10s of
  tending; **+2 berries**, regrows 1.35× faster) → *heavy-fruiting* (20s
  more; **double yield**, 1.8× regrow — an orchard bush for good). Harvests
  of tended bushes have a 60% chance to spare a **cutting**; plant cuttings
  on open grass or dirt and a full bush stands there the same minute.
- **The Tree Nursery — wood becomes forestry.** 14 wood + 4 stone, one per
  village. Every 2nd tree the Lumberjacks fell pots a **sapling** there;
  carry saplings out and plant groves anywhere — each grows into a tree
  (oak, or a windbreak pine) in ~110s.
- **The Spade — dig where the water should be.** Order a dig on any clear
  tile and a Builder hauls it down to shallow water (~6s a tile). A pond
  lets a **Fishing Dock stand inland**, and 35% of fresh pond edges sprout a
  **reed** — harvestable herbs on a shore you made.
- **Sigil-craft — draw where the night should bend.** Pick **ward** or
  **hallow**, drag to chalk the circle (up to 90 tiles), salt it with
  **1 herb + 1 charcoal**, and it charges through the day: at **dusk it
  blooms**, at **dawn the chalk washes away**. A bloomed **ward** marks
  monsters crossing it — they crawl and take **+25% damage** while on the
  chalk. A bloomed **hallow** steadies everything inside: guards strike
  **+10%**, and workers there hold their ground instead of fleeing. Only
  six sigils hold at once — the oldest chalk crumbles.
- **Restoration — the ruins wake.** Tap an ancient ruin and choose what it
  becomes: the **Aqueduct** (8w+16s; wells draw **+50%**, anyone within 4
  tiles drinks on the spot), the **Dawn Shrine** (12s; essence regenerates
  **+50%**), the **Sky Watch** (10w+12s; towers reach **+1.5 tiles** and
  tonight's attack direction is read at **dawn** — a full day's warning) or
  the **Root Cellar** (14w+6s; food cap **+80**, and **nothing spoils**).
  A Scribe deciphers the old script (~60s), then Builders raise it. Each
  ruin yields exactly one ancient, so which ruins your map spawns shapes
  the whole run.
- **Banns & blessings — the village grows families.** Two unmarried
  villagers who work side by side (~3.5 tiles) grow attached, and after
  ~150s together they **ask leave to wed**. Bless them (1 ale + 6 food):
  they're wed, the village feasts (**+10% work the next day**), a **shared
  hut** — two beds, snug comfort — rises by camp, and the couple works
  **+10% whenever they're together**. Death untangles the betrothal gently;
  up to three banns may wait at once.
- **The driven hunt — food you plan for.** From day 2, some dawns (45%) a
  herd of 4–6 deer steps from the wilds to graze. Tap a deer to set the
  hunt: the two nearest Foragers spend the day at its flank. Deer bolt from
  a driver within 5.5 tiles, and a **spike-line laid in the bolt-line bends
  the flee** — every deer that finds the line is **+14 venison** (traps
  wear; a flattened trap is the cost of a sloppy line). At dusk the rest
  scatter into the wilds.
- **All of it rides the save** — tend stages, cuttings, chalk sigils, dig
  orders, potted saplings, banns, marriages re-linked by id, the herd and
  its drivers, the pending feast — and a v1.5 save loads clean with
  wildcraft defaults. 112 new headless checks (643 green across the four
  suites), and `rebake.js` is now the verified incremental baker it always
  claimed to be.

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
  Barracks, +10%/drill from the Muster Yard), tower 8dmg/1.1s (range 5.5),
  ballista 27dmg/2.3s (range 7.5 — out-ranges bonecasters). Palisade
  220hp/2w, stone wall 520hp/4s. Spike traps 15 dmg + slow per step, wear
  out after ~3 monsters. Lair 1100hp, mends 0.6%/s when not struck for 8s,
  and spawns day-scaled defenders (up to 5 alive, every ~7s) while raided —
  a 3-guard raid is a rolling fight, not a 20-second teardown. A lit
  brazier beside a lair ends both: no mend, no defenders, 4 cleanse-dps
  until the stone cracks.
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
  tonight, Suture +15 hp per herb today, Spark a kindle (strong = 1.5
  nights), Effigy a drill landed early. Braziers: 4 wood + 8 essence a
  kindle; cleanse 4 dps beside a lair → +30 dawn-stone, +12 essence. Muster
  drills: +10% a type in ~60s of daywork, cap +30%. The Deep Seam: pay
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
js/wilds.js         the wildcraft: grovekeep, nursery, spade, sigils,
                    restoration, banns, the driven hunt
js/game.js          simulation, day cycle, jobs, waves, combat, events
js/powers.js        Mend / Smite / Stasis / Meteor
js/daycraft.js      the bench: 14 minigames, warm hands, braziers'
                    kindling/cleansing, muster drills, the Deep Seam
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

## Research backlog — Daycraft (v1.5 candidates)

*(Shipped in v1.5.0: the whole minigame bench below, The Kindling's
braziers, The Muster Yard's drills and The Deep Seam — with the seam
reworked into a spinning wheel of okay/injured/dead and a rescue skill game.
Shipped in v1.6.0 — The Wildcraft Update: the wilds-shaping, sigil-craft,
restoration, banns and driven-hunt sections below.)*

*(The previous backlog batch bet on timers and pressure; this one bets the
other way. The complaint it answers: by mid-morning of any day the player is
a spectator — jobs are assigned, the site is queued, and nothing needs you
until dusk. These candidates make the **day itself playable**: a bench of
original activities — fast hands-on **minigames** at the worksites and
slower **daycraft** projects — each productive (a player who does them all
day ends the day measurably ahead) and each optional (a player who skips
them is comfortable, not doomed). No new economy chains: every idea spends
wood, stone, food, herbs, essence and the jobs the village already has.)*

### The minigame bench — the guardian lends a hand

*The new rule of play: villagers keep working on their own, but the guardian
can put hands directly on any ready worksite and play a few seconds of
touch-work for a bonus. Six **warm hands** a day (a small sun-meter by the
dock), each session ~8 seconds, the world keeps simulating while you play,
every payoff is a stock the village already tracks — and a player who never
touches the bench loses nothing. Sigil-craft and the Kindling below are the
bench's slow flagships; this is its quick menu.*

- **The Chop (wood):** a felled log rests at camp — tap with the axe's swing
  rhythm; every split inside the sweet band is +1 wood, up to +6 a session.
- **The Line (fishing):** tap the bobber's dip to hook, tap again to land; a
  clean landing doubles the catch, and the rare dawn-silver pays 2 essence.
- **The Fault (stone):** swipe along a boulder's glowing crack to split it
  clean — +2 stone, and the rock holds one extra unit before it's spent.
- **The Comb (berries):** circle a bush without catching the thorn specks;
  +3 berries and the bush regrows about half a minute faster.
- **The Sickle (harvest):** swipe the wheat rows in time with the wind; clean
  swales bundle +2 grain and the plot re-seeds itself.
- **The Knead (bread):** tap-tap-hold on the dough's bounce; the batch bakes
  three loaves for two's flour.
- **The Stir (meals):** keep the ladle inside the pot's slow swirl for eight
  seconds; the same pot renders 3 meals where 2 stood.
- **The Hammer (smith):** strike the instant the bar flares; a "true" tool
  lasts twice as long as a forged one.
- **The Flight (arrows):** drag feathers to shafts in the pattern shown; a
  matched flight batches 14 arrows where 10 stood.
- **The Brew (ale):** tap the bubbles as they crest; a watched brew pours
  bright ale — +15% work tomorrow instead of +10%.
- **The Dip (oil):** dip the wicks on the wave; hand-dipped torches sip half
  oil tonight.
- **The Suture (hospital):** trace the wound's line without crossing red;
  the medic's next mends restore +15 hp per herb.
- **The Spark (braziers):** the hands behind The Kindling below — strike
  sparks on the cap until it catches; a strong kindle burns a night and a
  half.
- **The Effigy (muster yard):** the drill below played for real — tap the
  shape the straw shade raises, and the +10% lands a day early.

### Shape the wilds — the village edits the map

- **Grovekeep (domestication):** tap a wild berry bush and order **Tend** —
  a Forager calls on it across days: wild → *tended* (+2 yield, faster
  regrow) → *heavy-fruiting* (double yield, an orchard bush for good).
  Tended bushes drop **cuttings** the village can plant anywhere, so food
  stops being strip-mining the wilds and becomes breeding your own orchards
  — a dozen tiny long-term projects scattered across the map, each with
  visible stages.
- **The Nursery (forestry):** for every 2 trees felled a Lumberjack plants a
  sapling at the nursery; saplings are dragged out and planted as groves.
  Wood stops being purely extractive, and *where* you raise a wood becomes a
  landscape decision — a windbreak of pines shielding the huts, a hedge of
  oaks funnelling raiders past your towers.
- **The Spade (dig & pond):** a dig tool carves a tile into shallow water
  (builders haul ~6s a tile). Ponds let Fishing Docks sit inland, bank water
  for thirsty days, and grow reeds — herbs at the margin. The water-fill
  tool terraforms the map *up*; this terraforms it *down*.

### The guardian's hand — draw your will on the ground

- **Sigil-craft:** drag to draw a chalk circle on the ground (the wall
  drag-paint, repurposed) — salting it costs 1 herb + 1 charcoal, and it
  charges through the daylight hours. At dusk a **ward** sigil blooms:
  monsters crossing it slow and take +25% damage. A **hallow** sigil instead
  steadies villagers inside: guards +10%, and workers within won't break and
  run. The quiet afternoon is spent *drawing where the night should bend* —
  the drawing is the defense.
- **The Kindling (the push of light):** braziers can be kindled during the
  day (wood + essence) to burn all night as super-torches — and a brazier
  planted beside a Dark Monolith slowly *cleanses* it: the lair stops
  mending, stops defending, and finally cracks into salvageable dawn-stone
  without a single grave. Light stops being decoration; reclaiming the map
  from the dark becomes a slow, deliberate day campaign.

### Projects with a finish line — check-in work

- **Restoration (the ruins wake):** the ancient ruins stop being salvage and
  become **restorations** — a Scribe deciphers for a day, Builders scaffold
  for two, and the ruin stands again as a unique ancient building: the
  **Aqueduct** (wells +50%, drinks on the spot within 4 tiles), the **Dawn
  Shrine** (essence regen +50%; villagers pray there, a small daily visit),
  the **Sky Watch** (towers +1.5 range; dusk warnings arrive a dawn early),
  the **Root Cellar** (food cap +80; nothing spoils). Which ruin you raise
  shapes the whole run, and getting there is a multi-day project worth
  opening the panel for.
- **The Muster Yard (drills):** guards drill against a straw-and-bone effigy
  of the last monster the village killed. Pick the drill — **shields** (vs
  runners), **pikes** (vs brutes), **scatter** (vs stalkers) — and drilled
  guards take a permanent +10% against that type; the yard also unlocks
  **rally**: ring the horn and off-duty guards run to it. The dusk telegraph
  already names the attacking lair, so a quiet morning is spent drilling for
  exactly what tonight brings.
- **The Deep Seam (push-your-luck mining):** order **Dig Deeper** on a Mine
  Shaft and a miner spends the day below. Each level the seam gets richer —
  stone → double stone → flint (tools last +25%) → crystal flecks (essence)
  — but every level risks a collapse: the tunnel seals and the miner crawls
  out hurt. A repeatable risk dial for days when nothing else needs you.

### The village is alive — moments worth tapping

- **Banns & blessings:** villagers who work beside each other grow attached
  (the Chronicle already remembers friendships); in time a pair asks leave
  to raise a **shared hut** — bless the banns and they build it together:
  two beds, snug comfort, a small +work aura between them, and the village
  throws a feast (1 ale + food; +10% work the next day). Housing, comfort
  and the Chronicle folded into one tap-worthy moment.
- **The driven hunt:** some mornings a deer herd grazes at the map's edge.
  Set a **hunt** and two villagers spend the day driving it — toward the
  spike-line you laid, if you planned the ground. A clean drive is a mountain
  of food and a Chronicle entry; a botched one scatters the herd into the
  wilds. Map-reading, line-setting and payoff, all before lunch.

### Guardrails

Daycraft is *upside*: none of it may gate the night (a village that never
tends, draws, drills or digs still holds its walls), and none of it may add
a stock, a job or a panel — tending belongs to Foragers, saplings to
Lumberjacks, deciphering to Scribes, drills to Guards, digs to Miners, and
the map stays the canvas while the day becomes the brush. The bench obeys
the same law: warm hands are capped at six a day and every minigame pays an
existing stock.

---

## Balance re-look — what the numbers say (v1.5 audit — SHIPPED)

*(A pass over `CONFIG` in `js/core.js` with the complaint "too easy at the
start, flat after" in hand. All figures are the Normal preset. **Every
suggested change below shipped in v1.5.0** — the audit text is kept as the
rationale.)*

**What holds up:** tool wear is the best-tuned sink in the game — a tool
lasts ~125s of active work, so twenty workers eat ~20 tools a day and the
Smithy chain (2 wood + 1 stone → one per 3.2s) never becomes background
noise. Storage caps bite just before the Beacon (100 wood + 80 stone fits
under the 120/120 caps with room for nothing else — hoarding is a real
choice). Comfort multipliers are honest texture, not a fake lever.

**Where the numbers betray the feel:**

1. **Nights 1–3 can't bite.** Night 1 is 3 shades — 84 hp in total against
   one guard's 10.4 dps (7.5 × 1/0.72s): eight seconds of fighting. The wave
   curve `1.4 + 1.75 × day` doesn't clear ten monsters until day 5's blood
   moon, by which point a tower is up and arrows are cheap. *Suggested:*
   night-1 floor 3 → 4, shade dmg 4 → 5, curve base 1.4 → 2.0 and per
   1.75 → 1.95 (day 3 ≈ 8, the blood moon ≈ 19), runners debut day 3 → 2.
2. **Every food chain outruns the mouths.** A villager eats ~124 hunger a
   day — 7 food raw, or ~2.2 food as meals. Against that: a fisher lands
   1 food / 3.4s with no inputs, no land and no regrow (~55 a day after
   haul walks) from a day-2 building; a farmer pushing two plots manages
   ~30–45; and bush foraging is free. Hunger stops being a system on day 1
   and never comes back. *Suggested:* `FISHER.rate` 3.4 → 6.0, and
   `HUNGER.rate` 0.355 → 0.42 so mouths matter again.
3. **Essence is a dead battery by day 4.** Start 40, passive ~22 a day,
   +2 a kill — the 120 cap arrives around day 3–4; after that every kill
   pays nothing and Mend/Smite are the only outlets. *Suggested:*
   `regenDay` 0.105 → 0.075, max 120 → 100, `perKill` 2 → 3 (pay the
   fight), and pull Stasis/Meteor unlocks in to day 3/5 so the bank has
   somewhere to go.
4. **The ceiling never rises.** Defense compounds — Barracks ×1.3, tower
   II/III, schooled +12% — while waves grow linearly to a flat cap of 30
   and hp scales +5.5%/day only from day 9. Around day 14 a maxed village
   auto-wins every night, blood moons included, and endless mode flattens.
   *Suggested:* `hpScale` 0.055 → 0.085, and an endless-only wave cap of
   38 past the Beacon.
5. **Day 1 offers ~5 buildings and no problems.** Unlocks open with
   Granary/Storehouse, the first waves are 0–3 shades, and no system needs
   the player before dusk — which is precisely the gap the Daycraft bench
   above is drawn to fill. The numbers say what the hands say: the early
   game has nothing to hold.

---

## The difficulty spread — shipped in v1.4

Each preset is a *different game* rather than the same game tuned up or
down: on top of the original four knobs (wave size ×0.68 Easy / ×1.38 Hard,
monster HP ×0.88 / ×1.22, night length ×0.88 / ×1.15, essence regen ×1.1 /
×0.9), every preset now sets the seventeen levers below. These tables are
the shipped values — they live in `CONFIG.DIFF` in `js/core.js`, one edit
per cell. The v1.5 Daycraft mechanics shipped from the backlog above; the
remaining wilds-shaping ideas stay candidates. Verified headless:
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
| B5 | Night-1 wave size | 0 | 2 | 4 | 5 |
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


