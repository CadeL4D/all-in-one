# Sanctuary & Cinder — "Make it a real game" overhaul

Goal: fix the four things that make the game not fun — the night is watch-only, dusk/night decisions are always the same, there's no arc or record of a run, and combat has no feedback (no sound, no projectiles, no deaths). Keep the endless format per user choice, with milestone nights as the arc.

## 1. Models — `sanctuary_models.dart`
- `enum TowerStance { nearest, vanguard, strongest }` + label/detail extension.
- `enum WaveModifier { none, swift, armored, horde, eclipse }` + label/detail extension.
- `SanctuaryEffect`: add optional `x2`, `y2` (projectile target) and `text` (floating combat text).
- `SanctuaryBuilding`: add `stance` field (default `nearest`), persisted in toJson/fromJson.
- `SanctuaryEnemy`: add `maxHp` (defaults to `kind.maxHp`) so HP bars work with elite scaling; persisted.
- `SanctuaryConfig`: add `manaCap = 320`.

## 2. Engine — `sanctuary_engine.dart`
**Wave telegraph (dusk becomes a decision point)**
- Move `_prepareWave()` from night-start to day→dusk; store `waveLanes` (2–3 of the 4 spawn points, deterministic by seed+day), `waveComposition` (exposed getter), `waveModifier` (none on nights 1–3, then 40% chance of swift +30% speed / armored +40% HP / horde +35% count −25% HP / eclipse = mana income halved).
- Night spawning restricted to telegraphed lanes. Milestone nights (every 10th) telegraph all 4 lanes + boss count (1 devourer at 10, 2 at 20, 3 at 30+, HP-escalating).

**Night verbs (the player acts during combat)**
- Stance-aware tower targeting in `_updateDefenses`: nearest (current), vanguard (closest to Hearth), strongest (max HP). Setter `setStance`.
- `repairBuilding(tile)`: emergency repair, any phase, 1 timber per 25 HP, partial heal if short; green float text + effect.
- `dismantleBuilding(tile)`: 50% refund, day/dusk only, never the Hearth, recompute flow.
- `activateMuster()`: night-only, 8s duration, 90s cooldown — citizens leave shelter and work at 65% productivity (builders visibly rush repairs).

**Milestones + run record (endless with an arc)**
- Surviving a milestone dawn: +2+milestone# shards, +10 morale, `milestoneSealed` event/banner.
- Track `oathsFulfilled`, `mercifulChoices`, `pragmaticChoices`, `peakPopulation`, `milestonesSealed`; `_fallSettlement` assembles a `runSummary`.

**Spatial economy (adjacency)**
- `efficiencyOf(building)`: farm +15%/adjacent river (cap +60%), sawmill +12%/adjacent forest, masonry yard +12%/adjacent granite, shrine ×2 on holy ground. Cache invalidated on topology/terrain change; applied to production rates; shown in inspect panel and completion toast.

**Juice hooks**
- Projectiles with origin+target (`projArrow`/`projBallista`/`projCatapult` arc), enemy death bursts in `_removeDefeatedEnemies`, building collapse effects, throttled damage-number text effects, effects list capped ~140.
- `double shake` (decays in `_step`), hoisted `hearthUnderAttack` — both read by the painter.

**Balance**: mana cap 200→320, acolyte 0.48→0.6/s, shrine 0.2→0.3/s, brute building damage ×3→×2.
**Save v3**: new fields with tolerant defaults so v2 saves load (migration test).

## 3. Audio — new `sanctuary_sfx.dart`
`SanctuarySfx` singleton: code-synthesized 22050 Hz 16-bit mono WAVs (cached bytes), 3-player low-latency pool via existing `audioplayers` dependency, round-robin, rate-limited, mute flag persisted via LocalStore, every call wrapped in try/catch (silent no-op on failure — safe in tests). ~8 sounds: tower shot, enemy pop, collapse thud, meteor boom, dawn chime, breach alarm, muster horn, UI tap. Wired into `_handleEvent`.

## 4. UI — `sanctuary_app.dart`
- **Dusk forecast banner** (`_WaveForecastBanner`): lanes, composition, modifier, boss warning; painter tints active rifts red / inactive dim; ThreatPill shows pending wave at dusk.
- **Inspect panel**: `_showBuildingSheet` (bottom sheet, `_showDirectives` pattern): HP, ammo, efficiency %, stance segmented control for towers, Repair (cost preview) and Dismantle (refund, day-only) buttons. Replaces the inspect toast for buildings.
- **Repair tool** chip in BuildRail + **Muster** floating pill button above the deck (night only, cooldown ring).
- **Painter juice**: interpolated projectiles (catapult arc + shadow), floating damage/repair text (capped 8 alive), enemy HP pips, death bursts, collapse flashes, screen shake via `canvas.translate`, red pulsing vignette while Hearth is under attack, amber outline on mustered citizens.
- **Fallen overlay**: run summary block (nights survived, kills, oaths, merciful choices, peak pop, milestones) + "NEW DEEPEST NIGHT" badge; `_MilestoneBanner` on milestone dawn.
- **Title screen**: "PAST HEARTHS" — deepest night + last few runs from new LocalStore keys (`sanctuary_runs_v1`, `sanctuary_best_v1`).
- HUD: sound toggle, mana gauge reads config cap.

## 5. Tests — `test/sanctuary_test.dart`
Keep all existing tests green; add: telegraph determinism + lane-restricted spawning, modifier effects, stance targeting, repair cost/heal, dismantle refund/rules, muster enables night work, adjacency production deltas, shrine-on-holy-ground, milestone shard award, run summary after fall, v2-save migration, effects cap.

## 6. Docs & version
Update `docs/sanctuary_living_world_plan.md` (move shipped items into "Implemented") and `docs/sanctuary_cinder_audit.md`; bump pubspec `0.2.9+13` → `0.3.0+14`.

**Order**: models → engine mechanics → juice hooks → sfx module → painter → UI panels/overlays → tests → docs/version. Verify with `flutter analyze` and `flutter test`.