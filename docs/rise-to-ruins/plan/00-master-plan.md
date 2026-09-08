# Master Plan — Pocket Ruins (working title)

A faithful-feel mobile recreation of *Rise to Ruins* as a new Flutter app in
the One Hub. Research base: `docs/rise-to-ruins/research/01…05`. Working title
is a placeholder — the shipped name, art, audio, and text must all be original
(see §2).

Status: **M2 "Night & walls" is implemented and playable** at
`website/ruins/` (hub website game, M0 planning complete before it). The
Flutter app shell sketched in §6 was swapped for the hub's zero-dependency
plain-JS website stack at the user's direction ("a website on the hub
website"); every architectural principle (fixed-timestep sim, sim/render
split, single balance file, seeded determinism) carries over 1:1 —
`balance.dart` became `balance.js`, and `flutter_test` became `node --test`.

---

## 1. What we are cloning, precisely

*Rise to Ruins* (Raymond Doerr / SixtyGig Games, 1.0 Oct 2019) is a
hands-off village builder with a god-game layer and a nightly monster siege,
built on a **corruption territorial war** rather than wave scripts:

- Villagers are **never micromanaged** — you place buildings and set job
  headcounts; they choose their own targets and lives (research doc 03 §3).
- **Corruption spreads** across the map, builds its own structures, and those
  structures spawn monsters that march on your village center every night
  (doc 04 §2–3). The pressure valve is **Corruption Threat** — driven by how
  much space corruption wants vs. holds, *not* by your village wealth.
- You are a **physical god**: influence (power) scales with population and
  faith; 25 spells from Grab (pick up and throw anything) to Meteor, some with
  permanent upkeep (doc 03 §5).
- **No win condition.** 45 hand-made regions across 6 biomes; villages
  migrate between them; you "just survive" (doc 01 §4–5).

Our target is the *feel* of that loop on a phone — not a line-by-line content
copy. Systems, pacing, and interaction model are cloned; content (names,
sprites, maps, text) is re-authored.

## 2. Legal & design constraints (non-negotiable)

1. **Original expression only.** Game mechanics are not copyrightable; art,
   audio, names, maps, and text are. Wiki images/videos are research
   reference only — never committed to the repo, never shipped. New name,
   new species/monster designs, new music.
2. **No villager-villager collision.** Villagers overlap and walk through
   each other (standing veto from the Dawnhold project). RtR itself does this
   too — faithful and veto-aligned.
3. **No hiding/indoor-shelter mechanic.** RtR also has none (villagers keep
   working through raids) — faithful and veto-aligned. Do not "improve" this.
4. **Hub integration rules** apply when we publish (registry entry, website
   build, tagging per repo convention).

## 3. Feel pillars (what we must protect)

Distilled from quote-backed research (doc 05 §6). Every design argument
resolves to one of these; if a milestone doesn't serve a pillar, cut it.

| # | Pillar | Produced by |
|---|--------|-------------|
| 1 | Hands-off villagers ("they live their own lives") | Autonomous AI, job headcounts, zero unit orders |
| 2 | Calm day / panicked night heartbeat | Long safe days, telegraphed night raids, music shift |
| 3 | Time dilation ("one more day…") | Rapid day cycles at speed, always-resumable sessions |
| 4 | Brutal-but-fair loss as content | Losses teach; restart in <10 s; corruption is readable |
| 5 | A physical god hand | Grab/drag/flick spells; visible influence economy |
| 6 | Maze & trap tinkering | Walls/gates/towers with pathing that respects player mazes |
| 7 | Readable chaos at zoom-out | Strong silhouette/palette discipline; corruption recolors terrain |
| 8 | A living, joking world | Idle behaviors, reactions to weather/spells |
| 9 | Respects your time and device | Instant save/restore, battery mode, no forced sessions |
| 10 | Learn by playing, not by manual | **RtR's #1 flaw is opaque onboarding — our port must beat it** (contextual hints, not a wall of text) |

## 4. System inventory → mobile decisions

Detail lives in the research docs; this table is the port contract.

| System | RtR behavior (doc) | Our mobile decision | Pri |
|---|---|---|---|
| Time | 132k ticks/day @60 TPS; ~37 min/day at 1×; 6 phases; 5-day seasons (05 §4) | Same tick model; default **2×**, cluster pause/1×/2×/3×; sim decoupled from render | P0 |
| Villager needs | Hunger/thirst/energy/faith/health/temp; decay per activity (03 §2) | Clone set minus temperature for v1 (re-add with biomes) | P0 |
| Growth | Nomads arrive for free housing+jobs; births; migration (03 §1) | Clone nomad + birth for v1; multi-region migration later | P0 |
| Jobs | Building headcounts, auto-targeting, harvest brushes (03 §3) | Clone exactly — this IS pillar 1 | P0 |
| Buildings | ~15 categories, storage-per-type, refine chains (02 §1–2) | Start with 12-building core set (§6 M1), grow to full set | P0 |
| Resources | Raw→refined chains; food/water values (02 §1) | Clone chain shape; exact values re-tuned for faster mobile days | P0 |
| Corruption | Spreads, builds structures, spawns monsters; threat = space pressure (04 §2–3) | Clone the space-pressure threat model — unique, keep it | P0 |
| Monsters | 6 types + drones, resist/vulnerability matrix, variants (04 §1) | 4 types for v1 slice (melee, poison-splitter, wall-phaser, ranged-fire), full matrix by M3 | P0 |
| Pathing rule | Clear path = untouched walls; blocked = they chew through (04 §3) | Clone exactly; this rule powers pillar 6 | P0 |
| Defense | 11 tower types × 4 tiers, ammo economy, wall tiers (04 §4) | 3 towers + 2 wall tiers for v1; full catalog by M3 | P1 |
| God powers | 25 spells, influence costs, upkeep (03 §5) | 5 spells for v1 (Grab, Lightning, Heal, Mend, Meteor), full tree by M4 | P1 |
| Faith system | Praying, mood, influence multiplier (03 §5–6) | Simplified faith→influence multiplier for v1; full mood system M4 | P1 |
| Town center | 15-tier ladder, slot/storage growth (01 §5, 02 §3) | 8-tier ladder for v1 (slots gate content pacing) | P1 |
| Meta | God XP → perks from chests; 45 regions (01 §5) | Perks post-M4; regions as "islands" post-M5 | P2 |
| Special nights | Full/Eclipse/Blood/Meteor moons (04 §3) | All four — cheap, high-feel content | P2 |

## 5. What we consciously change for mobile

From doc 05 §8–9 (precedents: Polytopia, Northgard mobile, Kingdom Two Crowns):

1. **Landscape-first**, free one-finger pan, pinch zoom (no PC-style edge pan).
2. **Modal tool modes with drag-paint** (walls/fences/roads) and an offset
   ghost preview above the finger so placement is never occluded.
3. **Bottom-sheet build menu** (category tabs mirroring RtR's build order),
   persistent pause/speed cluster top-right, one-thumb reachable.
4. **Every destructive act confirmable + undo-able.** Kingdom's no-cancel
   placement is the cautionary tale.
5. **Session model:** save-anywhere + dawn autosave; a satisfying unit of
   play is 3–10 minutes = one in-game day at 2×. Alert toasts tap-to-fly.
6. **Onboarding beats RtR's #1 flaw:** contextual one-line hints keyed to
   first-time states (first nomad, first night, first corruption tile), plus
   an always-available "why did my villager die?" inspector.
7. **Battery mode:** 30 fps cap, particle reduction; day clock runs on sim
   ticks, never wall-clock, so backgrounding is free.
8. **Text ≥ 14 pt equivalent** — RtR's tiny text is a top complaint.

## 6. Architecture (house style: dependency-light Flutter)

Follows the existing game-module pattern (`gridlock`): one folder per app,
three concerns, no engine dependency. No Flame — the sim needs a custom fixed
timestep anyway, and repo convention is zero heavyweight deps.

```text
lib/src/apps/ruins/
├── ruins_app.dart          # Scaffold, touch input, HUD, build menu, settings
├── src/
│   ├── sim/
│   │   ├── world.dart      # Tile grid, regions, corruption field
│   │   ├── clock.dart      # Fixed 60 TPS timestep, day phases, seasons
│   │   ├── villager.dart   # Needs decay, job selection, pathing (A*)
│   │   ├── corruption.dart # Spread, drone builders, threat calculation
│   │   ├── combat.dart     # Damage types, resist matrix, projectiles
│   │   └── spells.dart     # Influence economy, effects, upkeep
│   ├── data/
│   │   ├── buildings.dart  # Content tables (costs, rates, workers)
│   │   ├── monsters.dart   # Roster, resist/vulnerability matrix
│   │   └── balance.dart    # Every magic number in ONE file, tuned in playtests
│   ├── render/
│   │   ├── tile_map.dart   # Canvas painter: terrain, buildings, entities
│   │   └── sprites.dart    # Original atlas; dirty-rect redraw
│   └── state/
│       └── save.dart       # Deterministic snapshot; dawn autosave
└── ruins_models.dart       # Shared value types (Resource, TilePos, …)
```

Key decisions:

- **Sim/render separation:** sim ticks headless at 60 TPS (batched: run N ticks
  per frame at speed 2×/3×); rendering samples sim state. Enables fast-forward,
  backgrounding, and deterministic testing.
- **`balance.dart` is the tuning surface.** All unknown-from-research numbers
  (see §8) start as reasoned defaults there, never scattered.
- **Pathfinding:** A* on the tile grid, monsters use the same graph with the
  RtR rule (open path preferred; otherwise attack lowest time-to-break).
- **Determinism:** seeded RNG + fixed timestep = reproducible nights, which
  makes balance bugs testable in `flutter_test`.

## 7. Roadmap

| Milestone | Deliverable | Acceptance |
|---|---|---|
| **M1 — Village heartbeat** ✅ (2026-09-07, `website/ruins/`) | Clock + day/night, 8 villagers, needs (hunger/thirst/energy/health), 5 buildings (home, farm, well, sawpit, storehouse) + camp, A* pathing, pan/zoom, drag-place, jobs headcounts, nomads + births, deaths, save-anywhere + dawn autosave, contextual hints, PWA | 10-min session: village grows, needs loop works, no individual orders needed — verified in-browser + 33 node tests |
| **M2 — Night & walls** ✅ (2026-09-08, `website/ruins/`) | Corruption spread + 2 monster types, 2 wall tiers + gate, 1 tower, the pathing rule, loss state | Night raids follow RtR pathing rule; maze changes outcomes; loss is readable — verified in-browser + 48 node tests |
| **M3 — God hand** | Influence economy, 5 spells incl. Grab (throw physics), full resist matrix, 4 monster types, ammo economy | Grab feels physical; towers counter-match monster resists |
| **M4 — The climb** | 8-tier town center ladder, faith/influence multiplier, full building set (≈30), Corruption Threat tuning | Full RtR loop shape; threat behaves like doc 04 §3 |
| **M5 — Meta & world** | Perks, special nights, 3 regions + migration, sandbox/custom modes | Second village possible; restart loop is inviting |
| **M6 — Polish & publish** | Original art/audio pass complete, battery mode, onboarding hints, hub registry + website publish | Ships under hub conventions; pillar 10 verified with a fresh player |

Asset pipeline note: original pixel art at 16×16 logical tiles (2× render),
authored in Aseprite/Percepti-style workflow; atlas PNG + offset metadata in
`assets/`. **No RtR assets at any stage.**

## 8. Research gaps → how we close them

The wiki is stale (~2023-era) and omits many constants. Aggregated
"Unknown" items across docs 01–05 (full lists in each doc's final section):

- Exact current balance: monster HP/damage/speeds, spawn-count formulas,
  per-worker production rates, build times, storage capacities.
- Day-length constant conflicts across eras (18.3 min 2016 quote vs 36.7 min
  dev-confirmed tick math) — treat as "changed in patch", pick a feel target.
- Lifespan thresholds, pregnancy duration, movement speeds, panic radii.

Closure protocol: capture 2–3 h of reference footage (own copy, private
notes), extract numbers by frame-checking; every number lands in
`balance.dart` with a source comment. The wiki stays the source for
*structure* (what systems exist and how they interact — that is stable), not
*values*.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Feel is in the tuning, not the feature list | Every milestone gates on a feel pillar (§3), not a checklist; playtest nightly Raids early |
| Sim performance with 100s of agents on phones | Fixed budget: batched ticks, capped population per region (RtR caps ~100s too), profile at M2 |
| Scope creep toward full 45-region world | Regions are M5+; v1 ships the heartbeat loop on one map |
| Asset authoring is the long pole | Art starts at M1 (12-tile set), not at the end; atlas-first pipeline |
| Opaque-systems reputation (RtR's flaw) | Pillar 10 has acceptance criteria in M6 |
