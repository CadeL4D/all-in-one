# Sanctuary & Cinder: living-world plan

The goal is not to cover the screen with particles. The settlement should feel
alive because people, sound, weather, threats, and player choices visibly react
to one another while the game maintains a stable mobile frame budget.

## Implemented in the current update

- Separate the 60 Hz fixed simulation from 30 FPS world painting and 10 Hz HUD
  refreshes, so a timer label no longer rebuilds the entire game every frame.
- Cull the isometric map to visible tile bounds, reuse hot-path paint objects,
  cache repeated placement path checks, index buildings by tile, run defense
  targeting at 20 Hz, and replace targeting square roots with squared distance.
- Add animated Hearth smoke, daylight birds, night fireflies, active rifts,
  moving citizen silhouettes, carried supplies, and prayer glows with a small,
  deterministic visual budget.
- Add settlement morale. It responds to mercy, hard choices, casualties, clean
  nights, and lost structures, then feeds back into citizen productivity.
- Add four living-world encounters with two materially different responses:
  caravans, singing stone, a white stag, and an ember wind.
- Add rotating Night Oaths that create an optional tactical goal and award an
  Ancestral Shard for clean execution.
- Make an enemy breakthrough at the Hearth capable of costing citizens, so a
  breached defense has a visible consequence beyond a shrinking health bar.

## Phase 1 — Make actions readable

1. Give every tower a visible projectile origin, flight path, hit reaction, and
   distinct impact silhouette.
2. Telegraph brute charges, spitter targets, banshee disruption, and boss phases
   early enough for an intentional response.
3. Add compact damage, repair, harvest, delivery, and morale callouts near the
   affected object instead of routing all information through the HUD.
4. Add a reduced-effects option and device quality tiers before increasing
   particle density.

Exit criteria: during a busy night, a new player can identify what damaged a
wall, why a tower stopped firing, and where the next serious threat is coming
from without opening a panel.

## Phase 2 — Give the settlement a voice

1. Add licensed or original adaptive audio stems for workday, dusk, siege, low
   Hearth health, and dawn. Mix intensity from actual threat proximity.
2. Add spatial warning cues for an empty tower, a breach, a new rift, and a
   citizen in danger, with independent music/effects controls.
3. Give a small rotating cast of villagers names, jobs, and short contextual
   thoughts. Keep logistics autonomous; personality should explain the
   simulation rather than add micromanagement.
4. Turn encounter outcomes into later callbacks: a sheltered family becomes a
   named household, the healed stag can return, and quarried singing stone can
   affect a later night.

Exit criteria: the player can remember at least one villager or event outcome
from a settlement after a ten-minute session.

## Phase 3 — Deepen the tactical loop

1. Add pre-night reconnaissance that reveals two likely lanes and one uncertain
   modifier, preserving surprise without making losses feel random.
2. Add active tower stances such as nearest, strongest, and breach priority,
   changed per tower type rather than per individual shot.
3. Add limited daytime expeditions that trade labor for a short, readable risk
   and return with maps, survivors, or rare materials.
4. Add enemy synergies and counters: crawlers screen spitters, banshees disable
   isolated towers, and brutes expose a temporary weak point after a charge.
5. Expand Night Oaths into a three-choice risk contract at dusk, with harder
   variants granting proportionally better meta-progression.

Exit criteria: two settlements with the same map seed can produce meaningfully
different defensive plans because of player choices, not hidden randomness.

## Phase 4 — Make the world persist

1. Add seasonal weather and terrain states that alter routes, crops, fire, and
   visibility, with clear forecasts.
2. Ship the Glacial, Volcanic, and Swamp biome rules only after each has a unique
   economy and defense problem rather than a palette swap.
3. Add permanent visual history: repaired breach scars, memorials for lost
   citizens, reclaimed shrine growth, and trophies from completed boss nights.
4. Add a settlement chronicle that records pivotal defenses and encounter
   choices in short, generated entries.

Exit criteria: a late settlement should be visually and mechanically
recognizable as the result of that player's history.

## Performance gates for every phase

- Profile on an older supported iPhone and a mid-range Android phone in profile
  mode, not debug mode.
- Target a 16.7 ms 95th-percentile frame on the default quality tier and never
  let simulation catch-up exceed the existing fixed-step safety cap.
- Test Night 10 with 180 active enemies, 100 structures, rain, rifts, and a
  moving camera before accepting a feature.
- Require bounded particles, pooled/reused render objects, viewport culling,
  lifecycle-safe audio, and backward-compatible save fixtures.
- Prefer stronger animation timing, sound, and reactions over additional
  always-on entities when both serve the same visual purpose.
