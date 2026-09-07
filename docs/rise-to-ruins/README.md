# Rise to Ruins — Research Library & Mobile Recreation Plan

Everything extracted from *Rise to Ruins* (Raymond Doerr / SixtyGig Games,
Steam 328080) to power **Pocket Ruins** (working title), a faithful-feel
mobile recreation as a future One Hub Flutter app.

**Start here:** `plan/00-master-plan.md` — the port contract, architecture,
and roadmap built on the research below.

## Research docs (`research/`)

| Doc | Covers | Highlights |
|---|---|---|
| [01-overview-and-wiki-map](research/01-overview-and-wiki-map.md) | Dev history, modes/difficulties, world structure, progression, **complete map of all 135 wiki articles**, 326-file media inventory | 6 modes = difficulty ladder; 45 regions / 6 biomes; no win condition; 15-tier town center; perks meta; wiki is stale (~2023) — structure yes, numbers no |
| [02-economy-and-buildings](research/02-economy-and-buildings.md) | Every building in 15 categories, full resource/refined-goods chains, storage rules, build-order meta | 11 tower types × 4 tiers; food values (Ration 120); hunger decay rates; camp tier table (8→86 slots); roads +20–70% speed |
| [03-villagers-and-simulation](research/03-villagers-and-simulation.md) | Villager lifecycle (nomads/births/migration), needs & daily schedule, hands-off job AI, **all 25 god spells with influence costs**, faith system | Zero unit orders — headcounts only; influence = 40/villager scaled by faith; RtR has *no* unit collision and *no* hiding mechanic (matches our vetoes) |
| [04-combat-monsters-and-defense](research/04-combat-monsters-and-defense.md) | 6 monster types + drones, full resist/vulnerability matrix, corruption spread & spawn placement, Corruption Threat model, walls/towers/ammo | Threat = corruption space pressure, *not* village wealth; clear path → walls untouched, blocked → chewed through; 4 special nights; no bosses |
| [05-presentation-feel-and-mobile](research/05-presentation-feel-and-mobile.md) | Art/UI/audio teardown, pacing math, 10 quote-backed feel pillars, mobile precedents, touch-translation table | Day = 132k ticks ≈ 37 min at 1×; #1 player complaint = opaque onboarding; full touch scheme recommendation |

Every doc ends with **Confidence & gaps** (what the wiki doesn't publish →
needs playtest/footage verification) and full source URLs. Media is linked,
never stored — RtR assets are copyrighted and must never enter this repo or
the game.

## Plan docs (`plan/`)

- [00-master-plan](plan/00-master-plan.md) — vision, legal constraints, feel
  pillars, system→mobile decision table, Flutter architecture, M1–M6 roadmap,
  gap-closure protocol, risks.

## Headline numbers for quick reference

- Solo dev Raymond Doerr ("Rayvolution"), custom Java/LWJGL engine, EA Oct
  2014, 1.0 Oct 14 2019, latest verifiable build Update 2d (Sep 2023); RtR 2
  announced. Steam ~7.8k reviews @ 88% Very Positive.
- Modes: Traditional / Survival / Nightmare / Peaceful / Sandbox / Custom.
- Monsters (first appearance, Survival): Headless n1, Slime n4, Zombie n3*,
  Skeleton n5, Spectre n12, Fire Elemental n16 (*zombie/blight interplay —
  see doc 04).
- The game was originally titled **Retro-Pixel Castles** (Kickstarter 2014);
  renamed Jan 2017.
