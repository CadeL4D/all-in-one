# *Destiny To Yours* Mechanic-to-Fun Atlas

> A working design audit that connects every planned mechanic to a player decision, an opportunity cost, readable feedback, failure diagnosis, other systems, emergent stories, procedural variation, and a proof build.

**Status:** Architecture draft<br>
**Companion document:** [Main city-builder design guide](CITY_BUILDER_FUN_DESIGN_GUIDE.md)

**Priority experiments:** [Reasons to keep improving the town](CITY_BUILDER_FUN_DESIGN_GUIDE.md#enjoyment-priorities-reasons-to-keep-improving-the-town) expands these entries into ten small experiments with prototype stages, tradeoffs, and acceptance criteria. Begin with visible improvements, alternative shortage remedies, and useful irregular spaces; then test one voluntary peaceful project.

---

## Why this atlas exists

A feature list can become enormous without making a game enjoyable. This atlas evaluates mechanics by the experiences they create.

Every approved mechanic must answer:

1. What does the player decide?
2. What credible alternative do they give up?
3. What changes visibly in the city?
4. How can the mechanic fail?
5. How can the player diagnose that failure?
6. Which other systems read its state?
7. What story can occur because it exists?
8. How can another island seed make the choice different?
9. Which prototype proves it is fun?

If a mechanic cannot answer at least six questions, it is probably content without depth, an automatic upgrade, or hidden simulation noise.

## Proof labels

- **P1 — City proof:** The peaceful settlement must be fun without enemies.
- **P2 — Defense proof:** Danger must deepen the city rather than replace it.
- **P3 — Island proof:** Connected generated sections must create a campaign.
- **VS — Vertical slice:** Representative art, interface, audio, and onboarding.
- **L — Later:** Valuable only after the core proofs pass.

## Product hierarchy

```text
CITY BUILDING
├── land and placement
├── citizens and work
├── logistics and production
├── needs, services, and growth
└── culture, Promises, and history

DEFENSE
└── tests the same land, people, goods, routes, and services

ISLAND CAMPAIGN
└── connects specialized cities through migration, trade, danger, and memory
```

City building must remain satisfying when defense is disabled. Defense must remain strategically substantial when enabled. The island must make successful old settlements useful instead of merely replacing them with new maps.

---

## Atlas A: Land, placement, and construction

| Mechanic | Player decision and real cost | Visible proof | Failure and diagnosis | Connections, stories, and seed variation | Proof |
|---|---|---|---|---|---|
| Fine plot grid | Decide whether a one-cell improvement is worth land, access, or future flexibility. A finer grid increases planning power but consumes attention. | Footprint snaps immediately; individual cells clearly show solid, walkable, delivery, and warning states. | Placement feels fiddly or cells are unreadable. Track cancellations, repeated rotations, misclicks, and zoom changes. | Enables irregular buildings, precise harvesting, alleys, courtyards, walls, and terrain-fit construction. Different terrain fragmentation changes every packing problem. | P1 |
| Irregular footprint masks | Fit rectangles, L-shapes, steps, yards, and courtyards while preserving entrances and roads. Give up the simplicity of uniform lots. | Buildings create recognizable negative spaces and varied skylines. | One footprint orientation always dominates or large shapes are never worth using. Compare placement frequency, travel, and unused gaps. | Makes a player's town visually personal. Slopes, rivers, cliffs, and existing resources favor different shapes per seed. | P1 |
| Rotation and mirroring | Choose which side faces inputs, residents, roads, hazards, or future additions. | Entrances, delivery cells, smoke, yards, and roof direction rotate with the ghost. | Rotation changes appearance but not behavior, or controls create friction. Show route estimates for each orientation. | A workshop may fit physically but face the wrong street; another seed reverses the useful orientation. | P1 |
| Entrances and delivery edges | Decide which path serves people and which serves goods. Spend valuable frontage and road capacity. | Citizens enter through doors; carriers unload at marked edges; queues form physically. | A building appears accessible but cannot operate. Inspector identifies blocked entrance, wrong road type, or occupied delivery cell. | Links footprints, roads, congestion, safety, and logistics. Dense towns may develop service alleys. | P1 |
| Operating yards | Reserve open cells for work instead of packing every gap. | Workers use racks, cutting areas, kilns, carts, or drying ground around the structure. | Yard becomes blocked after nearby construction. Placement and building inspectors identify the obstructing cells. | Creates industrial districts and tension between compactness and throughput. Rain, wind, or slope can change yard usefulness. | P1 |
| Clearance and hazard spacing | Choose whether shorter trips justify fire, illness, smoke, noise, or collapse exposure. | Risk overlay and ambient effects show heat, smoke, dampness, or crowding. | Hidden penalties make efficient-looking layouts mysteriously weak. Expose source, intensity, and affected buildings. | Links density to services, defense, evacuation, and land value. Dry forest seeds punish dense timber construction more strongly. | P1 |
| Planning ghosts | Arrange a future district without immediately spending resources or claiming work. The cost is reserved land and possible overplanning. | Translucent stages display required materials, access, and construction order. | Ghosts become visual clutter or block real operations accidentally. Allow layers, groups, hiding, and clear reservation rules. | Lets players solve Tetris layouts before committing and share blueprints later. Terrain differences require adaptation. | P1 |
| Construction stages | Decide what to finish first when several blueprints compete for labor and materials. | Foundation, frame, roof, fittings, and activation appear sequentially. | A nearly completed structure gives no value and traps scarce inputs. Inspector shows delivered, missing, and recoverable materials. | Creates anticipation, stories about projects finished before crises, and opportunities for staged damage or salvage. Weather affects work windows. | P1 |
| Cancellation and demolition | Decide whether correcting a mistake is worth lost labor, materials, history, and temporary disruption. | Workers dismantle the structure and carry salvage rather than deleting it instantly. | Punishment is so high that players keep bad layouts, or so low that placement has no weight. Preview exact recovery. | Supports learning and urban renewal. Old districts can be repurposed rather than erased without consequence. | P1 |
| Building extensions | Choose whether to enlarge an existing structure, preserve its compact form, or construct elsewhere. Spend connector cells and increase concentration risk. | A wing physically attaches and changes worker or delivery behavior. | Upgrade connector was unknowingly blocked. Placement preview warns before adjacent construction. | Makes city history visible and lets structures become irregular compounds. Terrain and neighborhood shape determine viable expansion. | VS |
| Useful gap fillers | Turn awkward spaces into caches, gardens, lamps, drains, stairs, memorials, or tiny services. Spend materials for local utility. | Small objects are used by nearby citizens and visually finish a district. | Fillers become mandatory spam or meaningless decoration. Measure local behavior and maintenance. | Converts negative space into expression and resilience. Different climates favor drains, shade, wells, or fire equipment. | P1 |
| Paintable fields and work areas | Choose exact farm, quarry, grazing, or gathering shapes around buildings and terrain. Land remains unavailable for other uses. | Workers visibly use marked cells and crop stages follow the painted shape. | Work area is too fragmented, distant, infertile, or unreachable. Overlay explains yield and travel loss. | Fields become part of the settlement's geometry rather than fixed square buildings. Soil and water create seed-specific shapes. | P1 |
| Harvest designations | Choose gather-only, clear-land, preserve-seed, or emergency-strip policy. Faster clearing sacrifices regrowth and beauty. | Claimed resources sparkle or mark; stumps, cuts, and disturbed ground preserve history. | Workers ignore an area due to claims, distance, danger, storage, or tool requirements. Inspector names the reason. | Links land preparation, ecology, logistics, fire, and future scarcity. Resource clusters differ naturally between sections. | P1 |
| Terrain-bound buildings | Fit mills, intakes, bridges, cliff stores, terraces, or lookouts to natural features. Gain efficiency while accepting location constraints. | Machinery aligns with water, slope, wind, cliff, or road direction. | Valid placement rules feel arbitrary. Ghost highlights the precise terrain requirement and expected output. | Makes geography a source of building identity. The same building may be central on one seed and impossible on another. | P1/VS |
| Road hierarchy | Choose cheap Foot Trails, delivery-capable Lanes, or high-capacity Ways. Wider routes consume scarce land and may help enemies. | Different widths carry visibly different traffic; worn paths show actual use. | Congestion is sensed but not explained. Traffic overlay shows flow, queues, and blocked deliveries. | Links packing, economy, evacuation, trade, and defense. Tight mountain sections value narrow routes; ports need broad freight access. | P1 |
| Bridges and crossings | Decide where to concentrate movement across water, ravines, or unstable ground. Spend materials and create a strategic chokepoint. | All relevant traffic visibly converges; damage immediately changes routes. | One destroyed crossing silently strands citizens. Connectivity overlay and alerts identify isolated areas. | Creates memorable places, defensive dilemmas, and trade vulnerability. Hydrology makes crossing decisions unique per seed. | P1/P2 |
| Compactness versus openness | Decide how much land to reserve for courtyards, firebreaks, expansion, queues, and evacuation. Open space increases normal travel and perimeter. | Dense districts bustle; open spaces support gatherings, turning, emergency response, and later construction. | One density level becomes universally optimal. Telemetry compares travel, hazards, wall length, and service effectiveness. | Produces distinct urban forms and different crisis stories. Hazard packages alter the best balance per section. | P1/P2 |

---

## Atlas B: Citizens, work, and attachment

| Mechanic | Player decision and real cost | Visible proof | Failure and diagnosis | Connections, stories, and seed variation | Proof |
|---|---|---|---|---|---|
| Indirect orders | Set intentions, priorities, and zones instead of controlling every citizen. Give up perfect execution for a living settlement. | Citizens claim tasks, choose paths, and visibly perform multi-step work. | Citizens appear irrational. Every task exposes scoring, destination, claim, and blocker. | Creates ant-farm pleasure and surprise. Terrain and settlement layout change which interpretation is efficient. | P1 |
| Task claims and reservations | Decide priorities while the simulation prevents several workers chasing one object. Reservations can temporarily reduce flexibility. | Markers show who has claimed a resource, delivery, or construction stage. | Dead claims freeze work. Claims time out visibly and report path or state changes. | Makes logistics trustworthy and supports thousands of small autonomous decisions. | P1 |
| Profession targets | Move labor between gathering, building, farming, carrying, crafting, services, and defense. Every assignment removes someone elsewhere. | Job counts and worker states change; production and queues respond after believable travel. | Requested workers cannot fill roles due to skill, tools, schedule, or reachability. Panel separates desired, assigned, active, and blocked. | Central juggling system. Resource distribution and crises change valuable staffing by seed and season. | P1/P2 |
| Task priorities | Choose which project, service, district, or material receives attention first. High priority can starve routine maintenance. | Priority color appears on tasks; nearby eligible citizens reroute when interruption rules allow. | Everything is marked urgent and priorities lose meaning. Limit tiers and show displaced work. | Creates emergency choices without individual micromanagement. Different town layouts change interruption cost. | P1 |
| Citizen needs | Balance food, water, rest, health, safety, and belonging against productive time. Services consume land and labor. | Citizens visibly eat, drink, sleep, recover, socialize, or seek safety. | A generic unhappy icon hides the initiating need. Timeline shows need source, attempted remedy, and blocker. | Converts people from workforce points into city customers. Climate and culture alter timing, not the existence, of basic needs. | P1 |
| Daily schedules | Decide shifts and service hours. Longer production windows cost rest, family time, trust, or health. | Neighborhood activity changes by time; lights, queues, and worker travel form a rhythm. | Citizens repeatedly miss meals or arrive after closing. Schedule overlay displays conflicts and travel estimates. | Adds temporal Tetris to spatial packing and gives defense staffing a cost. Seasonal daylight changes schedules. | VS |
| Skills learned through work | Decide whether to keep experts in their strong role or retrain for current need. Specialization reduces flexibility. | Work animation and output improve; skill history appears on the citizen. | Hidden skill modifiers feel arbitrary. Show experience source and expected benefit. | Makes migration choices emotional and economic. Resource-rich regions produce different pools of experts. | VS/P3 |
| Names and personal history | Choose policies affecting recognizable people rather than an anonymous count. Attention is limited, so information must remain concise. | Citizen panel records home, work, migrations, injuries, relationships, and notable events. | Generated biography becomes meaningless text noise. Record only events tied to simulated consequences. | Turns loss, rescue, and migration into stories. Island history follows people between sections. | P1/P3 |
| Relationships and households | Decide housing, migration, and emergency policy while considering social ties. Keeping groups together may be inefficient. | Citizens visit, work near, search for, or mourn known people. | Relationships add computation without decisions. Limit them to a few readable bonds with behavioral effects. | Creates neighborhoods and costly migration choices. New arrivals change the social topology each campaign. | VS/P3 |
| Traits | Use a citizen's strengths while accommodating a meaningful limitation. Traits should change behavior, not add tiny percentages. | A trait affects task choice, risk response, service use, or learning visibly. | One trait is always superior or requires constant assignment micromanagement. Compare utilization and outcomes. | Supports memorable specialists and migration dilemmas. Regional life may cultivate traits over time. | VS |
| Population arrival | Accept, delay, redirect, or refuse newcomers. More labor also means immediate housing, food, service, and safety demand. | People physically arrive along a route carrying limited belongings. | Population appears magically or arrives into unavoidable death. Forecast route, group size, skills, and needs. | Growth becomes an event and Promise test. Island routes and neighboring losses change who arrives. | P1/P3 |
| Injury and treatment | Decide who leaves work to rescue and treat others, and which district receives care. Medical capacity costs labor and supplies. | Responders carry injured people; treatment and recovery take visible time. | Injury is random downtime without actionable cause. History names source, severity, and treatment blocker. | Links defense, hazards, roads, clinics, trust, and attachment. Remote regions need different care networks. | P2 |
| Death and mourning | Decide how the city responds to irreversible loss. Memorial activity costs time but may preserve trust and community. | Household, workplace, and neighborhood behavior changes; history records the event. | Death becomes either trivial replacement or overwhelming punishment. Tune rarity, warning, and recovery. | Makes defense meaningful because people mattered before combat. A reclaimed town remembers prior losses. | P2/P3 |
| Migration | Choose who leaves, what they carry, which route they take, and what the old city can spare. | Named citizens form a group, depart, travel, and arrive with retained history. | Migration duplicates population or causes unexplained off-screen loss. Manifest and route status remain inspectable. | Connects cities socially and economically. Geography changes journey time and risk. | P3 |
| Emergency policies | Temporarily change evacuation, work, rationing, or rescue priorities. Gain control at the cost of productivity, health, or trust. | Citizens visibly acknowledge and follow the policy; the interface shows affected groups. | Policy is mandatory spam or ignored mysteriously. Explain eligibility, response time, and refusal. | Provides macro control during pressure without turning citizens into units. | P2 |

---

## Atlas C: Resources, logistics, production, and services

| Mechanic | Player decision and real cost | Visible proof | Failure and diagnosis | Connections, stories, and seed variation | Proof |
|---|---|---|---|---|---|
| Physical resource stacks | Decide where materials are gathered and allowed to accumulate. Physicality consumes space and transport time. | Timber, stone, food, tools, and supplies appear on ground, racks, carts, and storage. | Counts disagree with usable supply because goods are reserved, distant, or unreachable. Resource panel separates each state. | Makes every final object carry the history of its supply chain. Regional geography changes effective value. | P1 |
| Carrying and hauling | Allocate workers and routes to move goods instead of producing them. More carriers mean fewer gatherers or builders. | Citizens or carts visibly load, travel, queue, unload, and return. | Economy slows for unclear reasons. Flow view shows trip duration, empty travel, queues, and abandoned loads. | Turns distance into an economic resource and creates road stories. | P1 |
| Central storage | Decide whether short management and strong protection justify congestion and a single point of failure. | Many routes converge and stored piles visibly grow. | Inputs wait despite high global inventory. Inspector identifies queue, distance, access, reservation, or item filter. | Supports easy oversight but becomes a meaningful defensive target. Terrain changes viable central locations. | P1/P2 |
| Local caches | Spend extra structures and stocking labor to shorten routes and create redundancy. | Nearby workers use the cache; delivery patterns become local. | Cache fills with the wrong goods or drains the central store. Filters, desired amounts, and transfer history explain it. | Makes small gaps useful and helps districts survive breaches or trade disruption. | P1/P2 |
| Storage filters and desired stock | Choose which goods belong where and how much should be maintained. Over-reservation can starve other districts. | Reserved slots and target fill levels are visible on the building and resource overlay. | Carriers shuffle goods endlessly. Detect circular transfers and show the conflicting rules. | Gives players policy-level logistics control without ordering each trip. | P1 |
| Processing chains | Decide when higher capability justifies extra buildings, labor, transport, energy, and failure points. | Raw inputs arrive, workers transform them, outputs appear, and consuming systems activate. | Workshop is idle because of input, worker, output, tool, power, or schedule. Inspector states the first blocker. | Progress makes the city stronger and more delicate. Local resources change which chains are attractive. | P1 |
| Competing material uses | Choose between housing, services, industry, roads, reserve supplies, and defense. Spending solves one problem while delaying another. | Construction and stock targets visibly consume the same piles. | One use is always correct. Track decisions and rebalance utility, urgency, or substitution. | Creates meaningful tradeoffs instead of recipe bookkeeping. Hazard forecasts shift the value of each sink. | P1/P2 |
| Qualitative upgrades | Choose upgrades that alter citizen or material behavior, not merely output percentages. Larger footprints or maintenance can be the cost. | Citizens carry farther, make fewer need trips, use carts, or access a new route or service. | Upgrade effect is statistically real but visually imperceptible. Provide before-and-after behavior comparisons. | Produces competence the player can see. Different terrain changes which behavior is most valuable. | VS |
| Maintenance | Decide which structures receive routine labor and parts. More construction increases continuing obligations. | Wear appears gradually; maintenance crews and delivered parts are visible. | Maintenance becomes universal busywork. Use policy, thresholds, and clustered routes rather than manual repair clicks. | Prevents limitless consequence-free expansion and gives neglected land meaning for the Fray. Climate affects wear types. | VS/P2 |
| Spoilage and decay | Choose stock size, location, preservation, and rotation. Larger reserves reduce scarcity risk but may waste goods. | Food condition changes visibly; workers prioritize older stock when policy allows. | Loss feels arbitrary. Storage panel forecasts decay and identifies cause. | Creates seasonal preparation and trade urgency. Heat, humidity, and travel duration vary by section. | P1/P3 |
| Waste and by-products | Decide whether to reuse, transport, treat, or tolerate unwanted outputs. Treatment consumes space and labor. | Waste accumulates near its source and is physically removed or repurposed. | Waste becomes repetitive cleanup with no strategic alternatives. Provide several sinks and district policies. | Links industry, sanitation, fire, ecology, and Fray pressure. Biomes change disposal consequences. | L |
| Service access | Place food, water, medicine, rest, and civic spaces relative to the people using them. More local services cost labor and land. | Citizens travel to actual service points; range is based on reachable time, not a magical circle alone. | Coverage overlay says yes while paths make service unusable. Display estimated trip and queue time. | Makes neighborhoods operationally distinct. Terrain and density reshape catchment areas. | P1 |
| Reserves | Decide how much productive capacity to withhold for emergencies. Stockpiling delays current growth and risks decay or capture. | Reserve stores are sealed, labeled, and opened during policy changes or crises. | Players either hoard forever or consume reserves automatically. Forecasts and explicit target ranges support judgment. | Converts production into preparedness and creates relief when supplies matter. | P1/P2 |
| Trade shipments | Choose goods, quantities, route, escorts, schedule, and acceptable reserve floors. Exports weaken the sender temporarily. | Goods are loaded, leave the map, travel on the island, and arrive at a specific store. | Shipments vanish into timers or fail without explanation. Manifest shows every state and interruption. | Connects specialization, defense, migration, weather, and island history. | P3 |
| Inefficient local fallback | Maintain an expensive local substitute for an imported necessity. It consumes land and labor that imports would save. | Fallback workshops or crops activate when stock falls or routes close. | Trade loss becomes instant unavoidable collapse, or fallback is so good that trade is pointless. Compare full delivered cost. | Turns disruption into a solvable city problem. Section scarcity determines fallback form. | P3 |
| Market or exchange policy | Decide whether scarce goods go to construction, households, defense, trade, or public reserve. Allocation creates constituencies. | Queues, store destinations, and denied requests are inspectable. | Priority becomes a hidden global modifier. Show who receives and who waits. | Connects economy to Promises, neighborhoods, trust, and political stories. | L |

---

## Atlas D: Time, culture, and civic agency

| Mechanic | Player decision and real cost | Visible proof | Failure and diagnosis | Connections, stories, and seed variation | Proof |
|---|---|---|---|---|---|
| Pause and speed | Choose when to observe carefully and when to let plans unfold. Pausing protects comprehension but can encourage exhausting optimization. | All forecasts, overlays, and orders remain available while paused; speed state is unmistakable. | Important events disappear at high speed or combat demands constant pausing. Auto-slow rules are configurable. | Supports both reflective builders and pressure-seeking players. | P1 |
| Daily rhythm | Schedule work, rest, services, deliveries, and watch shifts across a readable cycle. | Light, sound, citizen movement, queues, and building use change through the day. | Day is cosmetic or creates unavoidable downtime. Activity timeline exposes consequences. | Provides calm and anticipation even without nightly attacks. Latitude and season can change daylight. | VS |
| Seasons | Prepare land, storage, buildings, clothing, schedules, and trade for recurring conditions. Preparation occupies current labor and space. | Vegetation, water, daylight, citizen behavior, and resource flow visibly change. | Season is only a recolor or a surprise penalty. Calendar previews categories and likely timing. | Creates long planning horizons and regional specialization. Climate changes sequence and severity. | VS/P3 |
| Weather | Adapt current operations and routes to temporary conditions. Stopping outdoor work sacrifices output; continuing accepts risk. | Rain, wind, heat, visibility, ground state, and citizen reactions align. | Random weather invalidates preparation. Forecast confidence and local signs make risk readable. | Links terrain, production, services, fire, flooding, shipping, and defense. | VS |
| Event forecasts | Decide what to prepare when threat class is known but magnitude, path, or timing retains uncertainty. Preparation has opportunity cost. | Scouts, clouds, tracks, rumors, river markers, and calendar signals provide diegetic evidence. | Exact prediction makes events solved; no prediction makes them unfair. Track whether players understood the warning. | Supports crises, attacks, arrivals, trade, and seasonal play. Geography changes evidence quality. | P2 |
| Promises | Publicly accept a measurable civic commitment. Keeping it constrains efficient play; breaking it solves an immediate problem at cultural cost. | Banners, gatherings, neighborhood response, citizen behavior, and history reflect the Promise. | Promise becomes a quest checkbox or obvious moral choice. Require multiple legitimate interpretations and temptations. | Gives mechanical choices civic meaning and makes towns culturally distinct. | P1 |
| Trust | Decide when accumulated civic confidence should fund intervention or remain as long-term capacity. | Trust changes through witnessed events and is represented through people and civic places, not only a bar. | Players cannot tell why trust changed. Timeline attributes each gain and loss to an event and constituency. | Connects Promises, services, migration, Mandates, defense, and culture. | P1/P2 |
| Mandates | Spend trust on a temporary high-authority order such as evacuation, emergency work, rationing, or public access to stores. | A visible command travels from civic centers; affected citizens acknowledge and act. | Mandates become routine buffs or replace planning. Use strong costs, cooldown through trust recovery, and lasting consequences. | Gives immediate agency inside an indirect simulation without copying god spells. | P2 |
| Emergent neighborhoods | Choose service placement, housing, roads, and policy while districts develop shared identity from use and history. | Names, banners, routines, building details, and citizen affiliations emerge gradually. | Neighborhoods are flavor text without decisions. They must alter service expectations, trust, migration, or recovery. | Creates attachment and island-specific cultural variation. | L |
| Civic history | Decide what to preserve, rebuild, memorialize, rename, or abandon after important events. Preservation consumes land and resources. | Buildings, streets, section map, and timeline retain scars and achievements. | History becomes an unreadable event log. Promote only causal and player-relevant events. | Converts simulation into narrative and lets recovered settlements feel continuous. | VS/P3 |

---

## Atlas E: Defense, enemies, and recovery

| Mechanic | Player decision and real cost | Visible proof | Failure and diagnosis | Connections, stories, and seed variation | Proof |
|---|---|---|---|---|---|
| Detection coverage | Decide where lookouts, patrols, lights, and reports justify workers, materials, and valuable high ground. | Fog, sight lines, patrol paths, and warning confidence are visible. | Threat arrives with no understood warning. Post-event report shows the missed route and absent coverage. | Links terrain, staffing, roads, weather, and forecast time. | P2 |
| Enemy intent | Decide what to protect based on a threat family's readable target preference. | Scouts and enemy behavior reveal interest in stores, isolated works, roads, people, or gates. | Enemies retarget arbitrarily. Highlight observed objective changes and their cause. | Makes enemy variety test city assumptions instead of damage statistics. | P2 |
| Route shaping | Use walls, gates, roads, water, light, terrain, and deliberate gaps to influence movement. Construction and geometry affect citizens too. | Predicted routes update as the player changes the map; actual movement follows understandable deviations. | Path rules feel exploitable or inconsistent. Show resistance, width, target, and blockage reasons. | Makes city geometry compute the defensive outcome. Every generated section offers different natural routes. | P2 |
| Walls and gates | Decide what enters the perimeter, which entrances remain convenient, and how much land to enclose. Longer walls consume materials and maintenance. | Gates handle everyday traffic and visibly close or fail during danger. | Walls become mandatory spam or a universal solution. Enemies must test gates, supply, width, alternate terrain, and interior hazards. | Links compactness, roads, maintenance, evacuation, and expansion. | P2 |
| Supplied static defense | Place efficient fixed protection while funding equipment, ammunition, operators, delivery, and line of effect. | Supplies physically arrive and projectiles or defensive actions consume them. | Defense stops despite high global supply. Inspector shows local stock, delivery path, operator, and target constraints. | Final defensive action contains the whole production chain. | P2 |
| Mobile responders | Draw adaptable defenders from the citizen population. Training and deployment reduce normal labor and expose valued people. | Teams muster, equip, travel, hold, retreat, rescue, and recover. | Unit micromanagement overwhelms city play. Use posts, response zones, stances, and fallback policy. | Covers static-defense weaknesses and creates personal stories. | P2 |
| Shelters and evacuation | Decide which civilians leave, where they go, when work stops, and what supplies shelters receive. Safety costs productivity and route capacity. | Households move along planned routes and occupy actual shelter space. | Citizens panic into blocked paths or shelters claim safety without accessibility. Evacuation preview identifies time and capacity. | Tests roads, density, services, warning, and trust. | P2 |
| Defensive local stores | Spend land and stocking labor to keep supplies near likely pressure points. Goods may be captured or wasted if danger comes elsewhere. | Responders and defenses draw from visible local inventory during the attack. | Stores are empty because transfer policy failed. Show desired stock and last deliveries. | Creates preparedness, redundancy, and target-selection dilemmas. | P2 |
| Fray scouts | Decide whether to intercept observation, alter routes, improve patrols, or accept that the enemy learns the city. | Scouts leave tracks, watch traffic, and escape toward known territory. | Scouting becomes invisible difficulty scaling. Show what information escaped and how it affects forecasts. | Connects normal road efficiency to future hostile planning. Geography changes approach and escape routes. | P2 |
| Snarls | Decide whether to clear an enemy foothold, contain it, deny loose resources, or fortify nearby activity. Expeditions consume workers and supplies. | Ravelers build visible temporary infrastructure from gathered material. | Snarls are generic spawn points with no ecology. Their materials, routes, and local effects must be inspectable. | Gives hostile pressure a place and economy without copying territorial corruption. | P2/P3 |
| Enemy behavior families | Prepare counters for crossing, theft, warning disruption, breaching, and fire rather than stacking universal damage. Specialized defenses reduce flexibility. | Silhouette and motion communicate behavior before tooltips are needed. | Hard counters make an attack unwinnable without one unlock. Provide soft counters and emergency recovery. | Encourages different city layouts and responds strongly to biome and density. | P2/VS |
| Breaches and fallback | Decide whether to seal, retreat, redirect, rescue, or defend a second line. Saving one district may expose another. | Rubble, routing, responder positions, gates, and civilian movement change immediately. | One breach causes an unstoppable cascade. Build recovery time, secondary routes, and clear priorities. | Produces dramatic but authored stories from earlier geometry. | P2 |
| Repair and salvage | Prioritize roads, homes, services, defenses, or production after damage. Repair labor delays normal growth. | Crews clear rubble, recover material, stabilize structures, and reopen routes in stages. | “Repair all” removes decisions or manual clicking creates chores. Use district priorities and repair queues. | Makes recovery a city-building phase and preserves scars. | P2 |
| Post-event autopsy | Form the next plan from evidence about the first breach, shortage, interruption, injuries, and route failures. Attention, not resources, is the cost. | Timeline replays causal events and links directly to map positions and system inspectors. | Report gives a generic score or prescribes one solution. Present evidence and comparisons, not a build order. | Turns failure into competence and motivates another settlement or redesign. | P2 |
| Attack cadence | Decide how aggressively to grow during meaningful periods of calm. More warning and recovery reduce constant excitement but strengthen contrast. | Scouts, seasons, regional state, and civic history explain likely pressure windows. | Combat is either exhausting or irrelevant. Measure time spent building, preparing, fighting, and recovering. | Keeps defense substantial while preserving city-first identity. Modes can adjust cadence separately from enemy strength. | P2 |
| Settlement loss | Decide when to evacuate, what to carry, and whether to abandon a section. Loss preserves campaign consequences without deleting all progress. | Survivors leave; ruins, hostile occupation, and broken connections remain on the island. | Defeat is either meaningless or campaign-ending too early. Preserve people, knowledge, and reclamation paths proportionally. | Writes island history and creates future recovery goals. | P3 |

---

## Atlas F: Procedural island and campaign systems

| Mechanic | Player decision and real cost | Visible proof | Failure and diagnosis | Connections, stories, and seed variation | Proof |
|---|---|---|---|---|---|
| Deterministic island seed | Choose or share a world knowing it can be reproduced. Determinism limits invisible rerolls. | Seed and generator version appear in save and island information. | Same seed changes unexpectedly. Automated snapshot tests compare generation stages. | Makes bugs reproducible and player stories shareable. | P3 |
| Causal geography | Read elevation, climate, hydrology, geology, ecology, and access as related facts. Geography constrains easy starts. | Rivers flow downhill, forests follow moisture, minerals follow geology, and passes cross ridges. | Map looks like layered noise. Debug map exposes each causal stage and rejected results. | Makes procedural terrain believable enough for strategic reasoning. | P3 |
| Geographic section boundaries | Choose sections whose rivers, ridges, coasts, and passes create meaningful edges. Natural boundaries may restrict connections. | Survey-map seams follow recognizable geographic features. | Sections look like arbitrary squares or contain incoherent fragments. Boundary validator scores cohesion and access. | Gives each local map a remembered shape and campaign role. | P3 |
| Opportunity-and-burden package | Choose a section for a strong behavior-changing benefit while accepting a related structural problem. | Comparison panel explains consequences in plain language and points to geographic evidence. | One section has universal advantages or modifiers do not affect layout. Run dominance and choice-distribution tests. | Drives different urban forms and opening economies on every island. | P3 |
| Hearthhold placement | Choose between early resources, fertile land, defensibility, connections, expansion room, and hazard exposure. The decision has long consequences. | Hover preview shows travel, buildable area, routes, soil, water, and risks. | Generator creates one obvious site or hidden lethal ground. Require two validated alternatives and honest warnings. | Turns the local map into a planning puzzle before time begins. | P1/P3 |
| Settlement specialization | Lean into geography and civic history while accepting dependence or inefficient fallbacks. Specialized infrastructure reduces flexibility. | Skyline, work patterns, exports, imports, and citizen skills reveal the role visually. | Roles are menu classes or every town builds everything. Compare production, land use, and trade behavior. | Keeps mature cities useful and makes the island a network. | P3 |
| Section connections | Invest in pass roads, ferries, bridges, coast routes, or trails. Capacity and resilience cost construction and maintenance. | Caravans and migrants follow visible island and local-map endpoints. | Connection is a timer line unrelated to terrain. Route state must reflect both endpoint maps and regional hazards. | Links local placement to island logistics and threat movement. | P3 |
| Route capacity and disruption | Choose shipment priority and redundancy. Extra routes cost labor and infrastructure; one efficient route creates vulnerability. | Congestion, delay, weather closure, attack, and alternate routing appear on the survey map. | Goods disappear or the optimal answer is always maximum redundancy. Show delivered cost and reserve effects. | Creates multi-settlement crises with several possible responses. | P3 |
| Off-screen simulation levels | Decide which settlement to visit while trusting summarized production and policy. Abstraction sacrifices minute control. | Forecasts, summaries, shipment manifests, and major-event notices explain changes. | Returning reveals unexplained collapse or summary exploits. Reconciliation report accounts for quantities and causal events. | Allows a giant island without simulating every citizen at full detail. | P3 |
| Island-level threats | Decide where to observe, contain, fortify, aid, or evacuate as danger moves through real connections. Regional defense consumes city resources. | Threat markers follow passes, rivers, roads, or coast routes and leave local evidence. | Hidden global difficulty appears in arbitrary sections. Explain source, objective, movement rule, and attraction. | Turns settlements into a strategic defensive network. | P3 |
| Refugees and aid | Decide whether and how one settlement supports another. Aid reduces the donor's reserves and changes the recipient's population. | Named groups and supply shipments travel along visible routes. | Aid is a menu transfer without human or logistical consequences. Use manifests, travel time, and arrival pressure. | Connects Promises, migration, defense, relationships, and island history. | P3 |
| Reclamation | Choose when the island can afford an expedition to a lost section. Rebuilding competes with safe growth elsewhere. | Returning map preserves ruins, roads, altered ecology, caches, and memorial history. | Reclaimed section is a fresh random map or trivial rebuild. Preserve recognizable structure and new occupation problems. | Turns failure into authored long-term content. | P3 |
| Campaign pacing | Decide when to stabilize, specialize, expand, aid, defend, or recover. Expansion increases opportunity and coordination cost. | Island objectives emerge from actual dependencies and dangers rather than a linear mission list. | Late game becomes waiting or settlement-switching chores. Introduce new decision types and automation policies. | Provides a long arc from one vulnerable town to a resilient island society. | P3/L |

---

## Atlas G: Interface, feedback, pixel art, and sound

| Mechanic | Player decision and real cost | Visible proof | Failure and diagnosis | Connections, stories, and seed variation | Proof |
|---|---|---|---|---|---|
| Placement ghost | Compare fits, routes, access, hazards, cost, and upgrades before committing. More information risks clutter. | Solid cells, entrances, delivery, clearance, warnings, and routes use distinct readable marks. | Player repeatedly confirms bad placements. Observe errors and simplify information hierarchy. | The primary interface for the signature Tetris-city system. | P1 |
| “Why not?” explanations | Decide how to fix blocked construction, work, service, travel, or defense using causal evidence. | Clicking any blocked state shows the first cause and upstream dependency chain. | Explanations are vague, stale, or blame the wrong layer. Test against known simulation states. | Converts complexity into mastery and protects trust in indirect control. | P1 |
| Resource claim feedback | Decide whether to assign more work or wait for an already claimed task. | Claimed ground resource, carrier, destination, and reservation are linked visually. | Several icons compete or claims remain after cancellation. Clean up through authoritative task state. | Makes autonomous logistics readable at miniature scale. | P1 |
| Overlays | Choose which hidden relationship to inspect: travel, service, storage, density, hazard, defense, water, or trade. Screen space and attention are limited. | One focused overlay uses consistent scales and links to inspectors. | Rainbow noise hides the town or numbers contradict behavior. Test at dense late-game load. | Makes different city strategies visible and diagnosable. | P1/VS |
| Alert hierarchy | Decide what requires action now, soon, or only if inspected. Excess alerts consume attention and create panic. | Critical alerts differ in position, sound, persistence, and auto-pause behavior from routine notices. | Players ignore everything or feel constantly interrupted. Track dismissals and missed consequences. | Protects city-building flow while keeping defense substantial. | P1/P2 |
| Delivery closure | Decide whether a production or construction plan is progressing by observing its final transfer. | Carrier unloads, stock changes, sound plays, and receiving structure visibly responds. | Goods teleport or numbers change without spatial explanation. | Gives tactile completion to the entire logistics chain. | P1/VS |
| Construction feedback | Decide what to build next while enjoying the current project becoming real. | Staged sprite, work animation, impact sound, scaffolding, and completion moment align. | Completion is instant or visually weak. Test whether players notice without an alert. | Creates anticipation and attachment to buildings. | VS |
| Citizen state silhouettes | Read work, carrying, rest, fear, injury, and blockage without opening panels. Simplicity sacrifices detailed animation. | Posture, carried object, small icon, and motion clearly distinguish states. | Pixel characters become indistinguishable noise. Test at default zoom and crowd density. | Supports ant-farm pleasure and emergency comprehension. | VS |
| Building-family silhouettes | Identify housing, storage, production, services, civic, and defense structures by shape and value before color. | Roofline, footprint, yard props, entrance, and animation communicate function. | Buildings require labels at normal zoom. Use grayscale silhouette tests. | Keeps dense irregular towns readable and supports a semi-simple art style. | VS |
| Thread visual motif | Interpret Promise, trust, history, and inspected routes through a coherent original identity. Strong theming can become distracting. | Stitched survey borders, restrained route threads, banners, and knots appear only at relevant moments. | Motif overwhelms materials or resembles generic magical effects. Apply a limited color and screen-time budget. | Unifies island, city, civic systems, and naming without copying another game's expression. | VS |
| Sound hierarchy | Hear confirmation, work rhythm, shortage, warning, breach, and recovery without staring at panels. Audio repetition costs comfort. | Material-specific delivery, construction, ambience, alert, and attack sounds have distinct roles. | Everything sounds urgent or repeated work becomes irritating. Test long sessions and individual volume controls. | Makes the city feel alive and helps defense without visual overload. | VS |
| Island-to-city zoom | Move between campaign reasoning and local attachment without feeling like unrelated screens. Transition time and detail loading must stay short. | Geography, connection endpoints, settlement icon, and local entry direction remain spatially consistent. | Zoom is slow, disorienting, or hides off-screen time. Preserve orientation and expose simulation state. | Reinforces that every city belongs to one generated island. | P3/VS |
| Accessibility and custom pressure | Choose text scale, color support, pause behavior, game speed, input, camera motion, alerting, and danger level. Customization may complicate balance. | Settings preview their effects and never hide essential state. | Peaceful or reduced-pressure play removes too much of the city game. Test each mode as a complete experience. | Broadens audience while preserving the city-first core. | VS |
| Post-crisis report | Decide what to change next by inspecting evidence rather than receiving a grade. | Timeline, map markers, shortages, routes, and casualties connect directly to simulation records. | Report overwhelms with statistics or tells the player one solution. Lead with first causes and expandable detail. | Closes the prepare–endure–diagnose–improve loop. | P2/VS |

---

## Coverage audit: the *Rise to Ruins*-type design space

This audit does not reproduce every named building, item, spell, enemy, value, or map from *Rise to Ruins*. It checks whether the important sources of fun in that style of game have an original answer in *Destiny To Yours*.

| Design space | Why it is fun in this genre | *Destiny To Yours* answer | Coverage |
|---|---|---|---|
| Indirect village simulation | The player authors policy and watches little people interpret it. | Inspectable task scoring, claims, profession targets, district policies, and emergency orders. | Core P1 |
| Physical resource logistics | Distance, storage, carrying, and supply make geography economically meaningful. | Visible stacks, delivery edges, road hierarchy, local caches, reserves, and shipment manifests. | Core P1/P3 |
| Production chains | Progress grants capability while adding dependencies and failure points. | Behavior-changing processing, tools, preserved goods, defensive supplies, and maintenance. | Core P1 |
| Citizen needs | Population is productive capacity and vulnerability at once. | Food, water, rest, health, safety, belonging, services, households, and arrivals. | Core P1 |
| Spatial defense | The same town layout becomes a defensive machine. | Route shaping, gates, lookouts, supplied defenses, responders, shelters, and fallback lines. | Core P2 |
| Hostile territorial pressure | Danger appears to inhabit the same world rather than spawning arbitrarily. | The Fray, Ravelers, Snarls, scouting, resource theft, neglected infrastructure, and island routes. | Core P2/P3 |
| Day and crisis rhythm | Calm preparation gains urgency; danger makes recovery feel earned. | Long city-building periods, forecasts, short incursions, environmental Convergences, and recovery. | Core P1/P2 |
| Limited direct intervention | The player can rescue the simulation without replacing it. | Trust-funded Mandates affecting evacuation, work, rationing, stores, and emergency response. | Core P2 |
| Regions and world map | Local settlements become chapters in a wider campaign. | One generated island, geographic sections, settlement roles, migration, trade, threats, and reclamation. | Core P3 |
| Migration and couriers | Stable settlements support risky new beginnings. | Named migrant manifests, carried supplies, physical connections, shipment capacity, and local fallbacks. | Core P3 |
| Weather and seasons | Established routines gain longer planning horizons and variation. | Climate-derived seasons, farming windows, road conditions, services, hazards, and shipping changes. | VS/later |
| Different modes | Players can emphasize relaxation, survival, experimentation, or mastery. | Peaceful city play, adjustable forecasts and attack cadence, custom island pressure, and later scenario tools. | VS/later |
| Pixel-art readability | Many agents and systems remain approachable and visually charming. | Semi-simple survey-map pixel art, strong silhouettes, restrained thread motif, and whole-number scaling. | VS |
| Failure and learning | A loss produces a hypothesis and another attempt. | Causal inspectors, post-event autopsy, refugees, ruins, island consequences, and reclamation. | Core P2/P3 |
| Persistent progression | A doomed settlement can still contribute to a larger journey. | Citizen knowledge, island history, cultural changes, discovered routes, and recovered settlements instead of generic power inflation. | P3/later |
| Sandbox and map experimentation | Players learn by manipulating rules and observing systems. | Generator seed tools, debug overlays during development, peaceful settings, and potential scenario editor after release scope is known. | Later |
| Large agent counts | Watching a living ant-farm is pleasurable and produces emergent events. | Start with small recognizable populations; increase only after pathfinding, readability, and performance tests. | Deliberately bounded |
| Broad spell catalogue | Many immediate verbs maintain player presence. | A smaller civic Mandate set focused on correction, protection, access, and sacrifice rather than magical damage. | Intentionally transformed |
| Tower-defense maze optimization | Geometry visibly alters hostile movement and exposure time. | Fine-grid routes, roads, gates, terrain, multiple objectives, and enemies that challenge universal mazes. | Core P2 |
| Multiple defenders | Static, mobile, and emergency tools cover different weaknesses. | Supplied structures, citizen responders, shelters, local stores, Mandates, and settlement-level aid. | Core P2 |

### What remains intentionally uncommitted

The following require prototypes before receiving detailed content plans:

- Exact resource and recipe quantities.
- Final citizen count and simulation scale.
- Exact day, season, forecast, and attack durations.
- Final names for the world, buildings, Fray creatures, and civic systems.
- Complete technology or progression structure.
- Number of biomes, buildings, Promises, enemies, and events.
- Whether relationships require families, friendships, or broader household groups.
- Whether terrain height is discrete, continuous-looking, or mostly visual.
- How much vertical construction the fine grid supports.
- Whether an editor or mod support fits the eventual technology and schedule.

These are not missing because they are unimportant. They remain open because deciding them before the proof builds would create false precision.

---

## Cross-system scenario test

Use scenarios like this to test whether mechanics form one game instead of separate feature islands:

```text
A wetland section promises medicinal plants but has unstable roads.

The player places the Hearthhold on a dry rise,
packs homes tightly around a Commonpot,
and connects distant herb beds with one raised Lane.

The settlement exports medicine to a mountain frontier.
A Husher disrupts the only Farwatch covering the wetland road.
Ravelers damage the raised Lane and take a medicine shipment.

The player can:
- spend trust on an emergency repair Mandate;
- stop exports and preserve local reserve;
- send responders through slow foot trails;
- build an expensive second crossing;
- request aid from the mountain settlement;
- or evacuate the exposed herb camp.

Stopping exports protects the wetland town,
but the mountain clinic loses medicine,
injured defenders recover slowly,
and a pass settlement may need to accept refugees.
```

This one event reads placement, roads, citizen work, processing, storage, trade, detection, enemies, defense, trust, migration, and island geography. It offers several legitimate responses and leaves a visible history. That is the target density of interaction.

---

## P1 implementation order extracted from the atlas

Build the peaceful city proof in this order:

1. Plot grid, camera, selection, and placement ghost.
2. Footprint masks, rotation, entrances, delivery cells, and yards.
3. Terrain, crossings, roads, pathfinding, and route preview.
4. Building ghosts, construction stages, cancellation, and salvage.
5. Citizens, task claims, task scoring, and inspectable blockers.
6. Physical raw resources, carrying, and storage.
7. Processing, competing material uses, and output limits.
8. Food, water, rest, housing, health, and service access.
9. Profession targets, priorities, and emergency policy foundation.
10. Paintable fields, harvesting policies, regrowth, and spoilage.
11. Population arrival, names, traits, and lightweight history.
12. Trust, one Promise, and one city-pressure event.
13. Useful gap fillers, density risk, maintenance preview, and overlays.
14. Save/load, deterministic replay tools, and telemetry.
15. External test of whether players enjoy improving the town without enemies.

Do not begin P2 until the final test shows that placement, logistics, and citizen operation create voluntary continued play.

## P2 implementation order extracted from the atlas

1. Detection coverage and diegetic evidence.
2. Forecast uncertainty and threat-family communication.
3. Enemy objectives and readable path selection.
4. Walls, gates, alternate terrain crossing, and route preview.
5. Defensive supply recipe, storage, delivery, and consumption.
6. Mobile responder post, response zones, and fallback policy.
7. Shelters, evacuation calculation, and civilian behavior.
8. Fray scouts, one Snarl, and two behavior families.
9. Damage, injury, rubble, repair, and salvage.
10. One emergency Mandate.
11. Post-event autopsy and recovery window.
12. External test of city-defense integration and strategy variety.

## P3 implementation order extracted from the atlas

1. Deterministic local-section generator and validation.
2. Hearthhold candidate detection and comparison.
3. Causal island geography and geographic section boundaries.
4. Opportunity-and-burden assignment.
5. Section comparison interface and island-to-city transition.
6. Connection graph and local edge continuity.
7. Settlement specialization and inefficient local fallback.
8. Named migration and physical shipment manifests.
9. Active, connected, and distant simulation levels.
10. Route capacity, disruption, aid, and refugees.
11. Island-level threat movement and settlement loss.
12. Ruins, history persistence, and reclamation.
13. External test of whether players experience a connected campaign.

---

## Feature review template

Copy this block before approving any new mechanic:

```text
Feature:
Proof phase:

Player decision:
Credible alternatives:
Immediate cost:
Long-term cost:
Visible cause:
Visible effect:
Failure modes:
Diagnostic tools:
Connected systems:
Possible player story:
Procedural variation:
Accessibility concern:
Performance concern:
Telemetry signal:
Pass criterion:
Cut criterion:
```

The cut criterion is mandatory. A mechanic without a condition under which it would be removed is too easy to protect after it fails to improve the game.

---

## Atlas completion rule

This atlas is complete enough to begin P1 architecture when:

- Every P1 mechanic has an owner and a testable pass condition.
- The paper placement prototype establishes a comfortable grid and footprint range.
- The headless economy establishes initial rates and recovery windows.
- The interface can explain task, path, storage, and production blockers.
- A 30–45 minute peaceful scenario has a clear beginning, developing middle, and satisfying stopping point.

It is never “finished” permanently. Playtests should revise the atlas whenever players discover an unexpected strategy, confusion, exploit, frustration, or story.
