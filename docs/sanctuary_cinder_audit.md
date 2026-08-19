# Sanctuary & Cinder implementation audit

This audit treats the supplied game design document as the product target and
separates the playable implementation from production work that still needs
real-device profiling, authored media, or long-form balance testing.

## Playable implementation

- A deterministic 64×64 world with grass, forest, granite, rivers, chasms,
  holy ground, corruption fog, clearing, and mana-driven purification.
- A deterministic 60 Hz fixed-timestep day, dusk, night, and dawn loop with tactical pause and
  0.5×, 1×, and 2× speeds.
- Autonomous citizens allocated through four Hearth directives. Agents visibly
  travel, gather, construct, repair, deliver ammunition, shelter, and pray.
- Raw and refined resources, capacity-limited stockpiles, sawmills, masonry
  yards, shrine crystal infusion, farms, housing, ammunition logistics, and
  resource loss when a stockpile falls.
- Path-safe blueprint placement using a recomputed breadth-first flow field.
  The final structure that would seal a spawn route is rejected.
- Palisades, ramparts, gates, spike trenches, ignitable tar pits, arrow towers,
  ballistas, catapults, frost spires, solar beacons, cottages, farms,
  stockpiles, sawmills, masonry yards, and mana shrines.
- Crawlers, spitters, brutes, banshees, and every-tenth-night Devourer bosses.
  Terrain slowing, ranged corrosion, breaching, flight, ammo depletion,
  autonomous targeting, area damage, and dawn dissolution are simulated.
- Lightning, cleansing rain, temporary fissures, meteors, and zero-mana
  long-press kinetic flings with velocity-based damage.
- Population capacity, daily food use, starvation losses, new arrivals, dawn
  integrity bonuses, settlement failure, Ancestral Shards, and five persistent
  constellation upgrades.
- A code-rendered isometric viewport with pan, 0.5×–2.5× zoom, day/night color
  grading, corruption treatment, health/construction feedback, thumb-zone
  controls, haptics, active pause, and versioned ten-second/lifecycle autosave.
- Morale-driven productivity, consequential living-world encounters, rotating
  Night Oaths, breakthrough casualties, and reactive ambient world motion.

## Design corrections made during implementation

1. **Readable world scale:** The logical map remains 64×64, but the camera
   begins at a legible sanctuary radius. Rendering the full board at once made
   accurate phone placement impossible.
2. **Gesture conflict prevention:** Camera pan and pinch retain priority.
   Powers use explicit target modes while the Hand of God keeps a long-press
   fling. Making rain and fissure depend exclusively on multi-touch gestures
   conflicted with zoom and reduced accessibility.
3. **Late-wave compression:** The original Night 20 budget can imply roughly a
   thousand crawlers. Active enemies are capped at 180 and excess budget is
   converted into elite health. Threat still scales without turning old phones
   into particle benchmarks.
4. **No offline-time punishment:** The game autosaves on lifecycle changes but
   does not advance hunger or attacks while closed. Offline simulation would
   make returning to a destroyed settlement feel arbitrary.
5. **Separate simulation and presentation:** World state has no widget
   dependency. Saves can be migrated and simulation rules can be tested without
   rendering a frame.
6. **Failure-safe building:** Blueprints count as future blockers during path
   validation, closing an exploit where several unfinished walls could seal a
   route simultaneously.

## Additional systems added by the audit

- Deterministic seeds and save schema versioning.
- A hard active-entity budget and fixed-step safety cap.
- Independent simulation, 30 FPS world-paint, and 10 Hz HUD cadences; visible
  tile culling; cached path validation; indexed buildings; 20 Hz defense scans;
  and allocation-reduced Canvas painting for mobile frame stability.
- Separate blueprint, power, clear, purify, inspect, and camera interaction
  states to prevent accidental spending.
- Onboarding that explains autonomy, kinetic gestures, and maze rules before
  the first run.
- Shape, icon, silhouette, and motion cues in addition to color.
- Independent refined-material production and visible refined-resource counts.
- Persistent meta-progression that carries into a new settlement instead of
  being erased when the previous Hearth falls.

## Partial approximations

- Citizen choices are autonomous physical agents, but individual five-unit
  backpacks and every production recipe are summarized into deterministic work
  rates to keep the opening loop readable.
- Flow fields are recomputed synchronously only when topology changes, while
  repeated placement validation is cached. A 4,096-cell BFS is currently
  small, but isolate migration should still be driven by real-device traces.
- Gates block and absorb enemies at night, though friendly gate-opening is
  represented by citizens sheltering before the siege rather than per-agent
  door animation.
- Solar beacons counter banshees directly; a separate invisible enemy modifier
  is not yet exposed.
- The low-poly visual language, lighting, fog, rain, projectile, and shockwave
  effects are rendered with Canvas. The proposed fragment shader suite is not
  required for the simulation and remains a production-polish task.

## Required before a commercial premium release

1. Profile raster time, memory, thermal behavior, and touch latency on older
   iPhones and mid-range Android hardware, then cache or atlas only the paths
   proven hot by traces.
2. Commission and license adaptive music, creature sounds, warnings, and
   projectile audio. Current feedback is visual, system-click, and haptic.
3. Add the Glacial, Volcanic, and Swamp biome rule sets after the Verdant economy
   survives full Night 1–30 balance sessions.
4. Add save-migration fixtures for every future schema revision and recovery
   UI for malformed saves.
5. Conduct accessibility passes for reduced motion, haptic disablement, larger
   HUD text, screen-reader build descriptions, and alternate contrast palettes.
6. Run automated soak simulations for all 30 nights, especially gate mazes,
   fissure expiration, starvation, and boss budgets.
7. Store pricing, entitlements, storefront metadata, and refund behavior are
   distribution concerns and are intentionally not embedded in this hub module.

The current module is a broad playable alpha, not a claim that authored audio,
three additional biomes, device certification, or thirty-night economy tuning
can be replaced by code completeness alone.
