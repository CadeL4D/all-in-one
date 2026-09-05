# Difficulty and attack rhythm

This pass follows the readable-settlement work. Its aim is pressure that creates preparation and recovery decisions, with forecasts the player can trust. No additional resource-yield reductions or starting-supply cuts were made.

## Calendar and mode identity

| Mode | Opening | Continuing pressure | Repairs |
| --- | --- | --- | --- |
| Peaceful | No attacks | Economy and expansion | Existing slow passive recovery retained |
| Settler | First raid day 5 | Every three nights; two clear nights between attacks | Existing slow passive recovery retained |
| Survival | First raid day 4 | Every other night through day 14; from day 16, two raid nights followed by one clear night | Materials and a worker, or Mend |
| Onslaught | First raid day 3 | Every night; each third attack is a smaller patrol | Materials and a worker, or Mend |

Onslaught retains lean starting supplies, 10% higher consumption and increases enemy damage to 110% of normal. Basic enemy health is now 100%, replacing 105%. The old 5% bonus pushed a 36-health raider above the 36 damage delivered by two standard tower shots, requiring a third shot. That was a 50% increase in ammunition needed against the initial enemy, not a 5% increase. Difficulty now comes more from frequency, composition, and maintaining supplies. Brutes enter its progression later than before; the first dedicated heavy assault is on day 7.

## Attack identities

The first two attacks preserve the opening introduction. Subsequent attack budgets vary by identity:

- **Raiding party:** full budget, mixed enemies, dusk. Sappers can appear after day 17. From day 24 onward, eligible raiding parties can use two opposite approaches; the existing force splits rather than doubling.
- **Border patrol:** 55% of the capped budget, rounded up, early night. No brutes or sappers. Onslaught gets one each third attack; other modes encounter them in their repeating pattern.
- **Night rush:** 90% of the capped budget, mostly fast skulkers, early night.
- **Heavy assault:** 72% of the capped budget, brutes mixed with ordinary raiders, late night. Fewer attackers require more time under tower fire.

Patrol scaling applies after the cap, so it remains a smaller force even very late in a campaign. Caps retain the earlier bounded age growth. After day 16, each six villagers above twelve adds one point to the attack budget, up to four. Existing regional danger and unwarded Hollow fronts also contribute. Stockpiles, tower counts, damage upgrades, and walls do not increase the budget. Defensive investment therefore retains its benefit.

## Forecasts and fairness

The current day's force is frozen when simulation first runs on that raid day. Growth or frontier changes later that day do not silently replace the announced monster list. That list survives saving and reloading, and malformed forecasts are rejected on import. Future-day projections may change with population and frontier conditions.

The map warning and Village forecast show attack identity, time, and preferred approach. The forecast includes the monster composition and standard-tower shot requirement. Terrain may force an entry to another reachable edge; Hollow fronts may supply an inland entry. These exceptions are stated in the forecast. The shot estimate assumes coverage and hits; it is not a promise that enough ammunition alone guarantees victory.

Survival and Onslaught no longer repair every building automatically between attacks. The existing repair project costs four timber and two stone, restores 60 condition, and requires hauling and work. Mend remains an influence-funded alternative. Clear nights and smaller patrols create repair opportunities without giving free materials.

## Checks and measured outcomes

The 77-test simulation/packaging suite passed. New tests cover the late Survival calendar, Onslaught's first-enemy ammunition breakpoint, recurring light patrols, distinct attack composition and timing, opposite-side attacks, independence from towers/wealth, frozen forecasts, actual spawn timing, saved forecasts, and mode-specific repair behavior.

The same real-cost automated strategy was used before and after the change; no stock injection was used for balance runs:

| Scenario | Result |
| --- | --- |
| Four existing Survival seed/region cases | All reached day 23 with twelve villagers |
| Default HEARTH-742, Fernwake, Survival | All eight chapters by day 23; alive at day 40, twelve villagers, 22 attacks repelled, 4 stone and 13 ammunition in town stock |
| balance-frontier, Fernwake, Onslaught | Previously lost on day 15; now alive on day 30, twelve villagers, 27 attacks repelled, 7 stone and 17 water in town stock |
| HEARTH-742, High Cairn, hostile Survival region | Alive at day 23 with all eight chapters and twelve villagers |
| balance-frontier, Fernwake, Settler | Alive at day 23; seven chapters completed |

These are bounded automated strategies with automatic repair orders and power use, not evidence that a new human player will find the modes fair or enjoyable. They establish viable examples and expose resource pressure. They do not justify increasing population or adding more systems solely to make the screen busier.

Browser checks cover the updated opening forecast and late two-sided attack intelligence, along with existing mobile interactions. The assembled/offline smoke test includes all 38 public files and cache version 22, using the corrected complete-shell update loader.
