# Frontier economy and balance pass

Implemented September 5, 2026. This follows `CORE_FUN_AUDIT.md`; that document describes the earlier baseline. Villager attachment systems were deliberately excluded at the user's request.

## Design basis

The useful lesson from Rise to Ruins is that production, hauling, defense, and land compete for the same workers and resources. More buildings alone do not produce that relationship. Its [resource reference](https://rise-to-ruins.fandom.com/wiki/Resources) describes separate raw materials, refined goods, and manufactured ammunition. Its developer's [Indev 30 notes](https://rayvolution.itch.io/risetoruins/devlog/31464/indev-30-the-life-is-precious-update-released) describe corruption occupying land and building hostile infrastructure alongside staged enemy introductions. The [Indev 30b balance notes](https://rayvolution.itch.io/risetoruins/devlog/33032/indev-30b-the-optimizing-and-balance-update-released) show pressure being adjusted through corruption behavior and combat as well as spawn quantities. The [Indev 31 unstable 3 notes](https://rayvolution.itch.io/risetoruins/devlog/42560/build-indev-31-unstable-3-released) discuss nearest-resource selection and delivery/pathfinding behavior.

These are historical references, not evidence of today's exact Rise to Ruins balance. Destiny uses its own costs, pacing, art, and implementation. The design inference is to make success depend on maintaining a working settlement, with readable shortages and opportunities to recover.

## What now changes the player's decisions

- **Supply routes:** warehouses hold goods at real locations. Paid construction and upgrade materials travel in loads of up to eight units. Crafting inputs and tower ammunition need delivery. Blocking a route stops the relevant work even when the resource counter is positive. Losing a warehouse loses its inventory; reserved construction loads there require replacement. Foot trails remain immediate placement to keep route editing practical.
- **Manufactured defenses:** the Ammunition yard converts two stone and one plank into eight shots in twelve working seconds. Towers request twelve crafted shots, or six emergency stone shots when ammunition is unavailable. Newly completed towers receive two starter stone shots. Towers can be supplied while being repaired. Workshops buffer two recipe batches and stop ordering inputs at their production target.
- **Useful land:** fields yield 80%, 110%, or 130% depending on soil and nearby water, before region and season modifiers. Wells yield 85% on dry land and 135% near water. Quarries yield two, four, or six stone per working trip depending on surveyed seams. Surface harvesting does not erase a surveyed seam. Placement previews explain the site quality.
- **Outlying districts:** Frontier depots are real delivery destinations and sources, add 80 storage capacity per resource, and ward land within ten tiles. Players can shorten a remote quarry's supply route while assuming responsibility for protecting that depot.
- **Continuing pressure:** from day nine, the frontier checks for a new reachable foothold every eight days, subject to suitable land and a maximum of three active fronts. Blight expands, halves affected farm/well output, and restricts ordinary construction. Beacons ward seven tiles; depots ward ten. Unwarded fronts increase raid pressure. Sappers join raids from day seventeen and prefer supply infrastructure. Later wave caps rise in bounded steps rather than remaining fixed forever.
- **Progression:** eight chapters now include supplying defenses and establishing a productive distant outpost. A chapter previously gated by elapsed days instead asks for delivered loads. Peaceful mode has attainable alternatives to combat objectives.
- **Feedback:** local stockpiles, working indicators, delivery routes for selected carriers, blighted terrain, ward circles, and chapter celebrations expose simulation state. Quiet work, delivery, dawn, and raid sounds are enabled by default and can be disabled in settings.

Town-wide eating, trading, and tool equipping still withdraw from aggregate inventory, reconciled against warehouse bins. Storage capacity is pooled. This is a physical construction/production/defense network, not a simulation of every household delivery.

## Scarcity and pacing

| Setting | Previous | Current |
| --- | --- | --- |
| Survival starting timber / stone / food / water | 95 / 70 / 55 / 55 | 70 / 48 / 40 / 40 |
| Settler starting reserves | 110 / 80 / 70 / 70 | 95 / 70 / 60 / 60 |
| Onslaught starting reserves | 75 / 60 / 45 / 45 | 62 / 44 / 38 / 38 |
| Harvested timber / stone, non-Peaceful | 8 / 7 | 6 / 5 |
| Base storage capacity per resource | 180 | 140 |
| Store capacity / upgraded store capacity | 100 / 200 | 80 / 160 |
| Kitchen passive food savings | 30% | 15% |
| Garden daily food / combined cap | 6 / 18 | 2 / 6 |
| Production delivery influence | 2 | 0.5 |
| Beacon influence per second | 0.2 | 0.06 |

Peaceful keeps its generous starting supplies and harvest yields. Scarcity should create choices without forcing a single flawless opening. Physical deliveries add preparation time, so Survival's first raid moved from day three to day four, and Onslaught's from day two to day three. Survival raids every two days; Onslaught raids nightly, has 10% higher consumption, stronger enemies, and earlier specialist enemies. Settler starts raids on day five, every three days.

The first combined scarcity/hauling iteration was too punishing. The opening grace period and Onslaught combat tuning were adjusted after simulations. Building costs do not vary by difficulty. Quarry, well, storage, and tower upgrade descriptions now match their actual behavior.

## Verification and limits

- The full simulation and packaging suite passed 64 tests. A subsequent regression for ammunition restocking during tower repairs also passed with the economy suite, bringing coverage to 65 tests.
- Browser checks passed for production controls, priorities, expeditions, convoys, workforce, caravans, save restoration, mobile layout, and contextual next steps. Earlier comprehensive checks also passed harvest painting, two-finger panning, and line building.
- The assembled site includes all 35 public files. A browser test verified the island and 24 territories under the actual GitHub Pages subpath, then reloaded offline. New modules are included in service-worker cache version 19.
- The real-cost automated strategy reached day 23 alive in four Survival scenarios spanning woodland, lowland, and highland, and in Settler. Default seed HEARTH-742 completed all eight chapters with twelve villagers. Other seeds progressed differently; stone and delivery throughput were meaningful constraints.
- Onslaught defeated the tested automated strategies around days ten and eleven. Those strategies do not design sophisticated walls, trade tactically, or respond like experienced players. This is a warning to human-playtest Onslaught, not proof that it is either fair or impossible.
- The campaign browser screenshot uses a simulated village, with its clock and a few goods adjusted only to exercise caravan controls. It is not balance evidence; balance tests use the simulation directly without stock injection.
- These checks establish functioning systems and some viable openings. They cannot establish that the game is as enjoyable or as deep as Rise to Ruins. Human sessions should next assess whether players understand delivery bottlenecks, can recover from one lost depot, and find distant districts worth their protection costs.

Existing saves retain earned chapters and initialize missing economy fields. Their already-earned stock is not retroactively reduced; the lean opening applies to new villages. Production changes and new threats apply when those saves continue.

This pass updates the local source and preview. Publishing is a separate action.
