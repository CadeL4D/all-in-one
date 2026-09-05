# Destiny gameplay audit and implemented changes

Reviewed September 4, 2026. This describes the implemented local build, not a proposed feature list. [BALANCE.md](BALANCE.md) contains the base economy and difficulty tables.

## Why the game felt empty

The largest gap was the number of meaningful consequences following each action. Destiny let you build, gather, survive raids and select regions, but most choices ended with a building appearing or a counter increasing. Once basic food, water and defense were solved, there were few reasons to change the settlement. Twenty-four regions repeated that same shallow loop.

My assessment is that Rise to Ruins benefits from overlapping timescales: immediate intervention, a working village to observe, preparation for the next threat, and a world that gives the settlement a longer purpose. Its developer explicitly combines village simulation, god powers and survival strategy. This is a design interpretation, not evidence that any mechanic guarantees enjoyment. [Developer description](https://rayvolution.itch.io/risetoruins)

The reference's production buildings and food processing give raw resources competing uses. Its guide connects production, storage, defense and intervention; its inhabitants have needs beyond a population counter. The useful lesson is interdependence: changing one part of the town creates reasons to reconsider another. [Buildings wiki](https://rise-to-ruins.fandom.com/wiki/Buildings), [Quick Guide](https://rise-to-ruins.fandom.com/wiki/Quick_Guide), [Friendlies](https://rise-to-ruins.fandom.com/wiki/Friendlies)

Research included historical developer updates and indexed wiki material. Some wiki content is explicitly outdated, and direct wiki access was inconsistent. These sources inform broad design patterns, not authoritative current balance numbers. All costs, yields, timings, names and campaign objectives below are Destiny's own design.

## Findings and implemented responses

| Previous gap | Effect on play | Implemented response |
| --- | --- | --- |
| Raw stocks mainly purchased buildings | Gathering lost purpose after the opening | Timber → planks → tools; food → meals; production targets and reserves |
| Workers were largely interchangeable job markers | Little reason to observe or protect them | Energy, home rest, equipment, injuries, retreat and medical care |
| Extra towers solved danger until ammunition ran out | Finite ore could make survival impossible | Renewable mining, quarry upgrade, forge reserve, guardians and passable gates |
| Empty land mostly provided building room | Exploring had little payoff | Worker expeditions, supplies, a shrine blessing and a sealable rift |
| Threat came mainly from a calendar | Defense barely affected the wider landscape | Visible frontier growth, local ward suppression and reclamation |
| Progression ended with a stable village | Few goals after winter | Six persistent chapters, industrial and exploration objectives |
| Regions shared geography but little purpose | Another settlement meant mostly restarting | Supply convoys to saved neighboring villages |
| Mobile input competed with watching the town | Interface effort obscured strategy | Paint harvesting, two-finger navigation, line building, swipe tray and readable compact objectives |

## A village that works

Five building types extend the existing set to eighteen: Sawmill, Tool forge, Forester lodge, Village gate and Infirmary. They have actual simulation behavior, costs, worker time and map sprites.

The sawmill consumes four timber for two planks. The forge consumes two planks and two stone for two tools. Workers equip tools above the player's reserve; each provides 25% faster work for ten completed jobs. This creates competition between building now, improving productivity and saving crafted goods for expeditions. Stone also supplies tower ammunition. The forge keeps twelve stone in reserve to reduce accidental disarmament.

The kitchen now makes meals in addition to its existing food-efficiency benefit. Four food and one water become three meals; each meal substitutes two raw food at dawn. Cooking consumes labor and water and preserves a raw-food reserve. Production can be paused and targets changed to 12, 24 or 48. Reaching a target stops new production jobs. Outputs are carried to the nearest reachable completed hearth or store, making placement and trails affect throughput.

Foresters replenish timber on clear ground while avoiding buildings, roads and current worker routes. Quarries produce renewable stone: four per eighteen working seconds, or six after upgrading. Mining pauses above sixty stone. These systems prevent eventual depletion from becoming a dead end; manual harvesting remains useful for faster supplies and clearing space.

Workers consume energy while active, return home when tired and recover before resuming. Tools and rest are visible. Idle villagers move toward public places instead of always standing where their last task ended. Injured workers seek care; enemies can harm villagers, guardians intercept attacks, and an infirmary spends food and water to heal nearby patients. Daily nourishment also supports recovery. The population ceiling is now 48; the twelve-person campaign tests do not establish balance or performance at that maximum.

An expedition temporarily removes labor from farms and construction; a wounded workforce loses productive time. These changes make the town more observable and interconnected, but do not constitute a household, relationship or individual profession simulation.

## Reasons to leave the clearing

Completing the hearth reveals four seeded reachable sites: two supply caches, an old keeper shrine and a Hollow Rift. Inspection explains the purpose and cost. A worker walks there and performs the expedition work.

Caches provide recovery supplies. The shrine costs six food and unlocks a permanent choice: faster industry, better rest or stronger towers. Sealing the rift costs six planks and two tools, giving the new production chain an objective beyond accumulating its own output.

An unsealed rift adds one monster per raid from day nine and two from day thirteen, within the existing difficulty cap. Its visible area grows; a nearby Wishing spire suppresses the extra pressure and sealing removes it permanently. Peaceful worlds receive no combat pressure. Some raid enemies enter from the rift, making its position matter.

The reference's developer describes corruption as a spatial enemy presence with structures and expansion. Destiny implements a smaller relationship between territory and threat: visible growth, bounded raid pressure, warding and reclamation. It does not simulate enemy construction or actual terrain conversion. [Corruption update](https://rayvolution.itch.io/risetoruins/devlog/29159/build-indev-30-unstable-2-released)

A guardian costs 25 influence, lasts ninety simulation seconds, seeks reachable enemies and intercepts melee attacks. Up to two can coexist. Clearing a raid grants ten influence. Gates let workers cross a defensive line while enemies must break through, making walls practical without cutting off the village.

## Progression and world purpose

The original four chapter records and rewards remain valid. Two chapters follow: **A working town**, covering industry, equipment and a blessing; and **Reclaim the frontier**, covering renewable timber, discoveries and sealing the rift. Each chapter awards thirty influence once, subject to capacity. Hearthkeeper now requires all six.

Industry and exploration unlock through building prerequisites, so players can pursue them before chapter five and overlap them with winter preparation. The current chapter supplies a next action and the Village roadmap shows the longer sequence. On phones, the objective now has two lines and its chapter label instead of truncating the entire instruction into one line.

Reclaimed regions receive a distinct atlas marker. Saved region details show population, chapters and blessing. A completed store can send a convoy to a started, surviving neighboring village in the same world and difficulty. Cargo costs twenty timber, fifteen stone, fifteen food and fifteen water; delivery takes thirty simulation seconds in the sender, with at most three pending shipments.

Delivery updates both saved records together and records a receipt to avoid duplicate application. Full receiving stores leave excess supplies in crates that unload as capacity becomes available. The recipient's clock does not advance. This gives mature villages a use for surplus without silently simulating settlements the player is not watching.

The reference's world update describes migration, couriers, goals and persistent world stakes. Destiny's convoys provide an economic connection between regions, but use timers rather than traveling carts and cannot move citizens. [World update](https://rayvolution.itch.io/risetoruins/devlog/48767/indev-31-the-world-update-released)

## Balance review and evidence

The automated playthrough uses real building costs, worker time, travel, harvesting, work priorities, repairs, upgrades, expeditions, crafting and combat. It does not replenish stocks or instantly complete buildings. Its policy is informed and consistent, not representative of a first-time player. Each run starts fresh and stops on day 23 or loss.

| Seed | Region | Mode | Day | People | Chapters | Stone / food / water left | Raids cleared |
| --- | --- | --- | --- | --- | --- | --- | --- |
| balance-frontier | Fernwake | Survival | 23 | 12 | 6/6 | 111 / 275 / 255 | 10 |
| HEARTH-742 | Fernwake | Survival | 23 | 12 | 6/6 | 174 / 277 / 254 | 10 |
| balance-frontier | Honeymead | Survival | 23 | 12 | 6/6 | 262 / 279 / 257 | 10 |
| balance-frontier | Greyreach | Survival | 23 | 12 | 6/6 | 159 / 279 / 257 | 10 |
| balance-frontier | Fernwake | Settler | 23 | 12 | 6/6 | 205 / 279 / 259 | 6 |
| balance-frontier | Fernwake | Onslaught | 23 | 12 | 6/6 | 48 / 202 / 72 | 20 |

The first hardest-mode strategy failed on day thirteen. It added towers but exhausted nearby ore while also making tools. This exposed an economic failure, rather than simply insufficient tower damage. Renewable quarry production and the forge reserve address it. The revised Onslaught strategy uses one more quarry, two more towers and permits two concurrent guardians, compared with one guardian in the other strategies. Its final water and stone stocks show a tighter margin.

Survival becomes comfortable after the town is established, with several resources near storage capacity. That provides an earned recovery period and convoy supplies, but also shows that indefinite endgame balance is not solved. These six cases do not prove every region, layout or opening viable. Separate geography tests cover founding access across multiple seeds; they are not full campaigns in every territory.

Tests cover recipe consumption and reserves, equipment, treatment, gates, exploration rewards, frontier pressure, guardians, legacy save migration, convoy overflow and receipt reconciliation. Browser checks exercise actual production controls, expedition orders, blessing choices, cross-save delivery and phone layouts. They caught a browser module initialization cycle, now fixed. Simulation review caught arriving villagers missing initialized health, also fixed.

Reproduce from `website` with `npm test`, `npm run test:balance`, `npm run test:browser` and `npm run test:depth-browser`. Browser checks require the site served at port 4173 and use isolated saves. The balance command writes daily snapshots to `test-output/destiny-balance-audit.json`.

## Remaining gaps and how to judge this pass

The game has more connected decisions and observable activity, but still has a finite six-chapter campaign. It lacks relationships, career progression, births and aging, extensive manufacturing tiers, dedicated ammunition logistics, an enemy settlement economy, persistent world corruption, migration and full courier travel. Recipe and construction inputs come from shared stock rather than individually transported ingredient piles. Reforestation creates mature resource tiles rather than a detailed growth cycle. More authored sound, animation variety and memorable events would also improve the experience.

Human playtesting should ask whether the opening produces an understandable reward before introducing another system; whether players can explain a supply failure and fix it; and whether reclaiming the rift makes them want to support another village. Watch for ignored industrial buildings, repeated idle periods and players opening panels without finding a useful next action. Longer survival alone is not proof of fun.

This pass closes specific gaps in production, care, exploration, active defense and persistent purpose. Its next evaluation should include an uninterrupted first-time mobile session and a returning-player session after winter. Automated campaigns establish that the connected systems can work together; enjoyment and lasting replay value still require player evidence.
