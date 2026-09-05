# Destiny: core gameplay and feel audit

Date: September 5, 2026. Game baseline: `e5a39622cf5c1c363f4f5d6d9eba8e0a4191666f`.

## Verdict

Destiny has a functioning survival simulation and a growing collection of mechanics. Its main weakness is that too few decisions change the next problem the player must solve. Building production often settles a need; subsequent play tends toward surplus management, repeating defense, or replacing losses. Progression lists things to finish but does not consistently transform how the settlement works.

The missing core is an evolving, visible relationship between **growth, land, labor, supply, danger, and the people worth protecting**. More building types will help only when they strengthen those relationships.

This is a design diagnosis, not a claim to have measured enjoyment. I reviewed the simulation, progression, advice, industry, civic, terrain, audio and rendering code; inspected the recent mobile town capture; researched developer explanations and the Rise to Ruins wiki; and ran five controlled simulations. I did not run a new human usability study or personally play a full Rise to Ruins campaign for this audit. Historical developer posts explain design decisions, not necessarily current numerical balance. Several wiki entries mix old versions; their exact costs and timings should not be copied.

## What makes managing a city rewarding

Different players want different mixtures of problem solving, creativity, spectacle, attachment and challenge. Constant crisis is not a universal requirement. A peaceful builder can sustain interest through expressive layouts, improving services, ambitious projects and a satisfying town to watch.

For Destiny's intended survival-builder identity, I would evaluate each system against this cycle:

**Notice an opportunity → choose a commitment → watch people carry it out → understand the consequence → enjoy the improvement → discover a new worthwhile ambition.**

A shortage is useful only if its cause is readable and the player has plausible responses. Success should buy relief and open possibilities. If success only makes the next timer faster, improvement can feel like punishment. If success removes all worthwhile decisions, it becomes waiting.

| Thing to manage | Decision that can be interesting | What makes the result satisfying |
|---|---|---|
| Labor and time | Builders now, food reserve first, or a temporary hauling push? | Workers visibly change priorities and finish the job the player chose. |
| Resource flows | Improve throughput, shorten transport, substitute an input, or trade? | A bottleneck clears and a previously stalled part of town comes alive. |
| Land and routes | Safe compact site, productive exposed site, or costly protected extension? | The town's shape reflects the player's judgment. |
| Population and services | Welcome more workers now or prepare homes and supplies first? | A hamlet grows into a recognizable community with new capabilities. |
| Defense and recovery | Fortify a crossing, maintain ammunition, intercept, or retreat? | Preparation visibly saves something valuable; damage teaches a specific lesson. |
| Environment | Preserve forest, clear farmland, exploit a deposit, prepare for a season? | The landscape changes in understandable ways and offers different strategies. |
| Trade and expansion | Export a specialty or keep reserves; support an outpost or improve home? | Surplus gains a purpose and earlier settlements help later ones. |
| God powers | Spend strength on productivity, rescue, terrain, or defense? | A direct action changes events dramatically and the world reacts. |
| Identity and expression | Shape districts, choose architecture, develop a specialty, protect a favorite place? | This becomes the player's town rather than an interchangeable solution. |

Do not implement every row as a new bar. Several should emerge from the same small set of systems. For example, a remote quarry can connect transport, workforce, defense, roads and trade without adding five independent chores.

## What the comparison games teach

Rise to Ruins deliberately combines village simulation, god-game interaction and survival. Its developer describes direct intervention through powers alongside managing a settlement. That combination provides both long-term planning and short-term agency. My interpretation is that the contrast between vulnerable autonomous villagers and the player's ability to intervene is central to its feel. [Developer overview](https://rayvolution.itch.io/risetoruins)

Its documented corruption system occupies territory, builds hostile infrastructure and links spawning to that development. The same update describes individual aging and lasting consequences of poor wellbeing. These connect danger to both a changing landscape and lives with history. The important lesson is the relationship between systems, not reproducing every mechanic or those historical values. [Life is Precious developer update](https://rayvolution.itch.io/risetoruins/devlog/31464/indev-30-the-life-is-precious-update-released)

Its world progression also gives established villages an outward purpose: migration establishes neighboring regions, couriers move supplies, and expansion interacts with global corruption. A world map becomes a strategic continuation of the town instead of primarily a settlement selector. [World Update](https://rayvolution.itch.io/risetoruins/devlog/48767/indev-31-the-world-update-released)

The wiki describes an opening centered on camp placement near resources and distinct gathering/building tasks. It also describes utility spells that affect construction, rescue and materials, plus different golem roles. This supports a useful target: connect ordinary production to expressive intervention. The wiki contains outdated entries, so these are structural references only. [Quick Guide](https://rise-to-ruins.fandom.com/wiki/Quick_Guide), [Spells](https://rise-to-ruins.fandom.com/wiki/Spells), [Golems](https://rise-to-ruins.fandom.com/wiki/Golems)

Against the Storm's designer explicitly discusses the problem of a city reaching stability, and its choice to reward and end a settlement before that becomes boredom. Destiny need not adopt runs or resets, but it needs an intentional answer to what comes after stability. [Designer interview](https://www.gamedeveloper.com/business/how-against-the-storm-managed-to-mix-city-building-and-roguelite-play)

More simulation is not automatically better. Eremite removed an experiment that made people fulfill needs at individual houses because it encouraged tedious reassignment. It redirected that spatial purpose into hearth-centered hubs. This is especially relevant to Destiny on mobile: make district placement matter without requiring the player to babysit every person. [Hubs design explanation](https://eremitegames.com/hubs-system/)

Anno's designers describe separating subsistence and happiness needs to enable different approaches to development. They also explain regional goods and transport that give expansion an economic purpose. Both demonstrate how additional systems can support different strategies rather than a single mandatory checklist. [Happiness](https://www.anno-union.com/devblog-happiness/), [New World residents](https://www.anno-union.com/the-residents-of-the-new-world/)

## What Destiny actually lacks

### 1. Its economy is only partly physical

Workers really travel, perform jobs and carry outputs to reachable depots. Roads, obstacles and depot placement therefore already matter. It would be inaccurate to call the economy entirely abstract.

However, crafting draws ingredients from the global stock. Building and upgrade materials are paid from the same stock before construction. Towers spend global stone. Food and water are deducted globally at dawn. A remote workshop does not need its inputs delivered; a tower does not have a local ammunition supply to protect.

The consequence is that many buildings can function as independent producers inside a compact cluster. Layout changes travel efficiency and exposure, but does not create a full supply network. A road is less consequential when it is not the link keeping a district supplied.

**Highest-value change:** introduce limited local storage and automatic input delivery for one meaningful chain first. Show reservations and blocked deliveries. Let the player set district priorities; let villagers handle individual trips. Preserve forgiving starter provisioning so this does not make the opening harder to understand.

Evidence: `world.js` functions `place`, `startProject`, `daily`, delivery and tower logic; `depth.js` function `workDepth`; `industry.js` recipes.

### 2. The landscape changes appearance more than strategy

The world is cohesive, terrain blocks placement and routes, and regions have different resource distributions and crop yields. These are useful foundations.

But farms do not evaluate local soil quality, wells do not evaluate water access, and renewable quarry extraction is available at the building without a deposit underneath it. Placement checks mostly ask whether ground is clear and accessible. The same infrastructure recipe works across the tested regions with relatively small adaptations.

Renewable stone solved a real ammunition dead end. Removing it without providing alternatives would reintroduce a bad failure. Instead, give it a spatial tradeoff: safe extraction could be slow, while a rich seam supports a valuable but exposed outpost. Trade could be another viable response.

**Highest-value change:** a few clearly visible land advantages that alter the best location and order of investment. Avoid hidden fertility arithmetic. A placement preview should explain the advantage before commitment.

Evidence: `world.js` functions `canPlace`, `productionYield`; `geography.js`; `depth.js` quarry work.

### 3. Progression adds completion requirements more often than new possibilities

Six chapters provide direction, including settlement essentials, defense, winter, population, industry and frontier tasks. The fourth requires day 17. Most underlying facilities can be built ahead of their chapter, and later chapters may therefore clear quickly after the time requirement.

Upgrades mostly increase beds, capacity, yield or damage. These are useful rewards, but they rarely change the kind of town the player can build. Four one-time sites provide limited discovery. A blessing is a real choice, but does not by itself create strongly different economies or settlement plans.

**Highest-value change:** progression should change the scope of the player's decisions: surviving camp → reliable village → productive district → protected outpost → linked settlements. Milestones should grant a useful capability and preview an attractive next ambition. Keep objectives as guidance; avoid requiring every town to complete the same shopping list.

Evidence: `world.js` functions `campaign`, `advanceCampaign`, `UPGRADES`; `depth.js` functions `ensureSites`, `chooseBlessing`.

### 4. Danger creates maintenance more reliably than a changing frontier

Three enemy archetypes, worker flight, towers, gates, guardians and stone ammunition already form a meaningful defense foundation. Attacks can destroy buildings, as the probe below demonstrates.

The rift adds limited wave pressure and a visual radius; it does not operate a hostile settlement or consume usable land. It can be sealed permanently. Waves ultimately reach fixed mode caps with recurring compositions. Consequently the long-term problem tends to be sustaining the established defense or repairing what it loses.

**Highest-value change:** one visible contested frontier with a reason to advance, defend or withdraw. Introduce attacks that change the tactical problem, with readable warnings and counters. Winning should secure usable land or a lasting advantage, rather than merely reset the same encounter.

Do not equate fun with uncapped monster growth. Preserve recovery space, a forgiving difficulty, and peaceful building.

Evidence: `world.js` functions `raidPlan`, enemy/tower logic; `depth.js` function `frontier`.

### 5. Villagers have needs but little accumulated identity

People have names, health, energy, tools and visible jobs. They rest, seek care and can die. This is more than decorative movement.

There is no accumulated occupational expertise or household history. Workforce roles are soft preferences derived from positions in the population array, not enduring careers. Arrival is largely a daily check for supplies, beds and morale. Most wellbeing is represented by aggregate town values.

This makes a loss mechanically costly but gives the player relatively little history to attach to it. Also, three gardens can offset the entire daily shortage morale penalty for adequately housed villagers, even though health still suffers. Mood can therefore tell a confusing story about deprivation.

**Highest-value change:** modest persistent identity before complex demographics: a worker becomes an experienced mason, a household arrives together, a survivor remembers a battle. Pair that with visible routines and reliable need feedback. Do not add aging, disease, families and individual scheduling all at once.

Evidence: `world.js` daily arrivals/morale and fallen-villager logic; `civic.js` functions `workerRole`, `favorJob`; `depth.js` worker needs.

### 6. Surplus lacks compelling destinations

Caravans provide three recurring offers, while convoys help already-started neighboring villages. These are useful optional tools. However, new territories can start with fresh supplies and settlers, and only the active village advances. Supporting an outpost is not necessary to establish it. The wider world gives surplus limited strategic purpose.

Tools accelerate existing work; the major expedition costs are finite. After those expenses, production targets frequently become stopping points rather than stepping stones to new projects.

**Highest-value change:** an attractive, optional frontier project that requires sustained support and offers something the home village cannot produce efficiently. Offer a corresponding local ambition for players who prefer one town. Starting over should not feel like the only way to regain interesting decisions.

Evidence: `industry.js`; `civic.js` offers; `depth.js` convoys; `geography.js` function `createTerritory`.

### 7. Presentation does not yet communicate enough life or causality

The inspected mobile capture has clearer pixel edges, distinct buildings, workers and a compact town. These improvements should be retained. But overlapping roofs obscure working spaces, and the compact automated layout looks like a cluster of facilities more than streets, neighborhoods and public life. This is one fixture, not proof that every player's layout looks that way.

The core audio implementation is short oscillator beeps, with sound initially off. There is no comparable layered work ambience or musical pacing. Resource counters and advice cards carry much of the explanation; spatial input flows cannot be seen because they are not simulated yet.

For the intended feel, the player should see a log enter a workshop, see a worker transform it, watch a loaded carrier leave, and hear a restrained local work sound. At night, lighting, movement and sound should express safety or danger. A district becoming productive should be pleasurable to watch even between orders.

**Highest-value change:** improve visual and audio feedback alongside the first connected production chain. Render believable work yards, entrances and delivered supplies; clearly distinguish idle, waiting for inputs, working and blocked. Prioritize legibility at normal mobile zoom over extra decorative noise. Static images cannot establish whether all motion or blur issues are fixed; that requires a separate live rendering check.

Evidence: `art.js`; `game.js` function `beep`; inspected `test-output/destiny-living-town-mobile.png` from September 4.

## Controlled balance probe

Reproduce with `node website/destiny/fun-audit.mjs`. Full output: `website/test-output/destiny-fun-audit.json`.

Each case uses the existing costed, worker-driven scripted opening through day 23. The script selects sites, orders builds and exploration, upgrades, marks stone, adjusts priorities and summons guardians. It has foreknowledge and is **not** a novice player. Then the probe makes no new player interventions for 32 simulation days. Existing automation and queued tasks continue. No stock was injected.

| Case | All chapters earned | People, day 23 → 55 | Buildings, day 23 → 55 | Raw food, day 23 → 55 | Worker samples with a task or cargo |
|---|---:|---:|---:|---:|---:|
| Fernwake, balance-frontier, Survival | Day 17 | 12 → 12 | 18 → 13 | 275 → 0 | 28.9% |
| Fernwake, HEARTH-742, Survival | Day 20 | 12 → 12 | 17 → 13 | 277 → 0 | 21.2% |
| Honeymead, balance-frontier, Survival | Day 17 | 12 → 12 | 17 → 16 | 279 → 279 | 34.3% |
| Greyreach, balance-frontier, Survival | Day 17 | 12 → 12 | 18 → 18 | 279 → 279 | 46.0% |
| Fernwake, balance-frontier, Onslaught | Day 22 | 12 → 12 | 21 → 19 | 227 → 278 | 50.4% |

All cases remained alive through day 55. The two Fernwake Survival cases depleted both food and meals and finished with morale 52 and 0. The other cases retained strong supplies. Onslaught's opening deliberately constructs additional defenses and a quarry; its result is not evidence that the mode is easier.

The worker statistic counts task/cargo flags once per simulation second, including assigned travel. It is not exact productive utilization, and its complement includes rest and other activity. It certainly is not a measurement of player boredom. Likewise, influence remaining at its cap throughout the passive Survival samples is expected when powers are not used; that alone cannot justify a nerf.

What the probe supports:

- The game can reach long stretches of economic abundance after a compact opening without needing new districts, trade or expansion.
- It can also decay under unattended attacks. There is real pressure; simply saying “nothing happens” would be wrong.
- Chapter completion does not ensure ongoing town health, and completing all chapters does not introduce a new strategic layer.
- A single scalar difficulty adjustment will not address both passive abundance and deteriorating infrastructure.

It does not establish how frequently people should click, an optimal balance, or which seed differences are caused by terrain versus the placement policy. Those require controlled layout comparisons and human sessions.

## Why starting can feel harder while the middle feels emptier

These experiences are compatible. A novice pays the cost of learning controls, unusual building names, resource rules, priorities and panels before understanding a rewarding plan. An informed player then finds that many decisions have a fairly settled answer.

The advice system now explains useful next actions. But “build this next” teaches sequence more readily than judgment. A better opening teaches one visible relationship at a time: choose nearby timber, see it delivered, build shelter, welcome someone, notice the extra demand, choose how to meet it. The player should learn why their placement or priority worked.

Familiarity with Rise to Ruins may contribute to the comparison; its wiki itself describes mechanics learned through play. That does not explain away the structural gaps found here.

## Recommended order of work

### First: prove one satisfying district

Build a bounded slice around timber → planks → a useful construction project, with automatic ingredient hauling, local buffers and clear shortages. Put a valuable resource beyond the safe center. Connect roads, worker allocation and one predictable raid to the same decision. Add work-state animation and local sound during this slice, not after dozens of features.

Success criterion: moving a depot or changing a priority makes an observable, understandable difference. A player can explain why an order is waiting and identify two viable responses. Managing it on a phone requires policy and placement decisions, not tapping each carrier.

### Second: turn growth into a new strategic question

Introduce a supported outpost or a new district with a real benefit and a real commitment. Tie one frontier threat to that territory. Give players a choice between local development and outward expansion. Replace elapsed-time gates where a demonstrated capability would communicate progress better.

Success criterion: two playthroughs support meaningfully different layouts or investment orders; a successful town has an appealing next ambition beyond keeping counters full. The next stage must not erase the relief of achieving stability.

### Third: strengthen attachment and recovery

Add a small amount of persistent villager identity, town routines and visible rebuilding history. Use recovery actions that let players save something they care about. Deepen powers around labor, rescue and frontier choices so they are part of ordinary play as well as emergency defense.

Success criterion: players can recount a specific town event, notice a specific improvement, and explain a setback without attributing it to mysterious worker behavior.

### Validate before expanding scope again

Run observed fresh-player mobile sessions and experienced-player sessions through the opening and an established town. Ask what they are trying to accomplish and why, without coaching. Record confusing waits, productive planning pauses, changes of plan, and whether they voluntarily begin another project. Check supply trajectories, travel time, shortage causes, losses and recovery alongside those observations.

Do not optimize for maximum click frequency or make every worker busy. The target is understandable agency and worthwhile decisions. The earlier survival tests establish that the simulation can run; they do not certify that playing it is fun.

Do not prioritize another batch of decorative building variants, more interchangeable resources, harsher hunger, endless wave growth, or a longer checklist. The next improvement should make existing systems depend on one another in ways the player can see, influence and care about.
