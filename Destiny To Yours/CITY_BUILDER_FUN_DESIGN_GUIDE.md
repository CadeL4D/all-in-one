# Why *Rise to Ruins* Is Fun — and How *Destiny To Yours* Can Learn From It

> A systems-design reference for building a city-builder with the same *kind* of appeal without copying *Rise to Ruins*' names, art, lore, maps, code, interface, balance values, or exact content.

**Research date:** September 3, 2026<br>
**Purpose:** Explain the small-scale details that make *Rise to Ruins* compelling, map those details to general city-builder design principles, and turn the analysis into an actionable plan for *Destiny To Yours*.

For the mechanic-level implementation audit, read the companion [Mechanic-to-Fun Atlas](MECHANIC_TO_FUN_ATLAS.md).

---

## The short answer

*Rise to Ruins* is fun because it keeps changing the meaning of the same settlement.

During the day, a patch of land is a planning puzzle: where should the farm go, how far must a worker walk, which resource is becoming a bottleneck, and what should be built next? At night, the same land becomes a defensive machine: are the walls routing enemies correctly, do towers have ammunition, can villagers reach safety, and where should the player spend scarce godly power? After an attack, the settlement becomes a diagnosis: what failed, what barely held, and what single improvement will matter most tomorrow?

That creates a powerful repeating rhythm:

```text
observe → choose → build → watch → endure → diagnose → improve
      ↑                                              ↓
      └──────────────── one more day ────────────────┘
```

The player is never *only* designing a pretty town, *only* maintaining production chains, or *only* fighting a tower-defense wave. Each activity supplies the next one:

- The town produces the resources that make defense possible.
- Defense protects the workers who keep the town alive.
- Enemy pressure gives efficient town planning a purpose.
- God powers let the player rescue the simulation without replacing it.
- Failure teaches a concrete lesson that can be applied to the next attempt.
- Regional and account-level progression makes individual settlements feel like chapters in a larger undertaking.

The result is a game that alternates between calm authorship and urgent intervention. That contrast is its central pleasure.

For *Destiny To Yours*, city building takes priority within that relationship. The settlement must be fun to shape and operate without enemies; defense then becomes a deep test of land use, routes, reserves, labor, services, and attachment rather than a separate game competing for attention.

---

## A popularity reality check

It is useful to be precise about the phrase “so many people play it.” *Rise to Ruins* is not a mass-market phenomenon with an enormous present-day concurrent population. It is a long-lived niche success with a notably satisfied audience:

- Steam currently displays **about 5,100 English reviews, 87% positive**.
- SteamDB records an **all-time Steam concurrent peak of 1,469** on May 3, 2019.
- The game first appeared on Steam in 2014, left Early Access in 2019, and was still receiving substantial free updates years later.
- Its store tags reach several overlapping audiences: colony simulation, city building, tower defense, survival, resource management, god games, sandboxes, and pixel art.

Those numbers suggest *durable audience fit*, not universal appeal. Its longevity is especially valuable to study: players who like its particular mixture can spend tens or hundreds of hours exploring variations in settlement layout, difficulty, maps, and recovery from failure.

The commercial lesson is not “copy this and millions will arrive.” It is: **combine compatible niches around one coherent loop, serve that combined fantasy deeply, and give players enough systemic variation to keep producing new problems.**

Sources: [Steam store page](https://store.steampowered.com/app/328080/Rise_to_Ruins/), [SteamDB charts](https://steamdb.info/app/328080/charts/).

---

## What the player actually does

Before discussing psychology, it helps to describe a normal play sequence at very fine resolution.

### 1. Read the land

The player begins by scanning terrain rather than immediately placing decorative streets. They are looking for the five basic categories needed to establish a viable settlement: wood, rock, crystal, food, and water. The position of these resources matters because hauling time is real. A rich resource patch that is far away may be less useful than a smaller nearby patch.

This opening is already interesting because placement is not cosmetic. The camp determines:

- Initial walking distances.
- Access to food and water.
- Which directions remain available for expansion.
- How much territory must later be defended.
- Where enemies will approach relative to natural barriers.
- Whether future production buildings can sit near both input and output storage.

One click quietly commits the player to dozens of downstream consequences. That makes the map feel meaningful.

### 2. Mark intentions instead of puppeteering everyone

The player designates areas for harvesting and places construction plans. Villagers then decide how to fulfill those intentions. This is **indirect control**: the player operates at the level of policy and priority, while agents operate at the level of individual actions.

Indirect control creates two pleasures at once:

1. **Authorship:** “This settlement follows my plan.”
2. **Observation:** “Let me see how these little people execute it.”

If every log required a direct order, the experience would become repetitive micromanagement. If the simulation required no direction, it would become a screensaver. Designations sit in the productive middle.

### 3. Allocate scarce labor

The jobs panel distinguishes desired workers from workers actually available. Assigning another farmer is never just a free increase in food; it removes a potential builder, water carrier, refiner, ranger, or hauler.

That creates an opportunity cost on almost every staffing choice:

```text
more harvesting now
    versus
more construction now
    versus
more processing for later
    versus
more defense before night
```

The interface also lets the player watch worker sprites and infer whether a profession is genuinely busy. That tiny detail matters: staffing is not an abstract percentage slider. The player can diagnose whether a job lacks labor, inputs, storage, or reachable work.

### 4. Establish a survival floor

Housing, food, and clean water come before ambitious expansion. A basic house increases capacity, farms stabilize food, and wells or other water systems stabilize hydration. These needs create a minimum viable settlement.

The fun is not the existence of hunger by itself. Hunger is interesting because it connects spatial planning, labor, production, storage, and time:

- A farm needs labor.
- Laborers need water.
- Produce must be carried.
- Storage must have room.
- The path must be safe and short enough.
- Seasonal conditions may change output.
- A night attack can interrupt the chain.

One red “no food” warning may therefore have five possible causes. Diagnosing the correct one is the real game.

### 5. Turn raw matter into infrastructure

The economy moves from raw resources to refined resources and then to specialized uses. Wood can become boards, rock can become cut stone, crystal can become crylithium, and ore can become metal. Food and water also gain more portable forms, such as rations and bottles, which reduce how often villagers must interrupt work to satisfy needs.

This gives the economy a satisfying shape:

```text
terrain deposit
  → harvesting labor
    → hauling
      → raw storage
        → processing labor
          → refined storage
            → building / ammunition / equipment / trade
```

Every new processing stage offers higher capability but also adds more places for the system to stall. The city becomes more powerful and more delicate at the same time.

### 6. Collect essence and act as a god

Villager activity produces essence. The player physically attracts or collects these visible sparks with the cursor, filling an influence resource used for powers. Powers can manipulate objects, accelerate resource regrowth, illuminate darkness, heal villagers, summon defenders, create magical structures, move people, or attack enemies.

This solves a classic simulation problem: watching autonomous agents can become emotionally distant. The god layer gives the player a hand inside the world.

Small sensory actions help:

- Essence visibly travels toward the cursor.
- The influence bar rises in response.
- A spell produces an immediate effect at a chosen location.
- The player can save one villager or disrupt one dangerous cluster.
- Large powers have costs and cooldowns, so intervention remains a decision.

The player alternates between architect and emergency responder. They are neither completely omnipotent nor helpless.

### 7. Convert the town into a defensive pathing puzzle

Walls, gates, roads, terrain, and towers do more than add hit points. They shape movement. When an open path exists, monsters tend to follow it; when none exists, they attack a route of lower resistance. This lets the player create a long entrance path or “maze” exposed to defensive fire.

The important pleasure is **spatial causality**:

- Move a wall one tile.
- Enemy traffic changes.
- One tower gains several more seconds of firing time.
- Ammunition consumption changes.
- The next wave reaches a different part of town.

The settlement is not just an inventory of buildings. Its geometry computes an outcome.

Alternative defenses—rangers, golems, offensive magic, magical walls, and several tower types—prevent the maze from being the only answer. Different enemies can pressure different assumptions; for example, specter-like threats require different containment than ordinary ground attackers.

### 8. Survive the night

At night, stored preparation is cashed out under pressure. A day’s decisions become visible all at once:

- Did production make enough ammunition?
- Did haulers deliver it to the right towers?
- Is the maze long enough?
- Are farms and homes outside the safe perimeter?
- Did the player reserve influence for an emergency?
- Can a breach be contained without abandoning the entire settlement?

This is satisfying because the attack is an **exam authored by the player’s earlier decisions**. It is not a disconnected combat minigame.

### 9. Inspect the failure

After a bad night, the most useful question is rarely “Was my character level high enough?” It is more often:

- Was the route too short?
- Did a tower lack ammunition?
- Were too many villagers assigned to refinement and too few to defense?
- Did corruption gain too much territory?
- Did a distant stockpile create excessive hauling?
- Did the player spend influence too early?

These are legible hypotheses. A good failure immediately suggests an experiment, and an experiment motivates one more day or one more settlement.

### 10. Expand beyond one map

The world is divided into connected regions with different biomes and challenges. Villagers and resources can move between connected settlements. After the first region, expansion requires migration rather than simply receiving an entirely free new population. Courier systems can support interregional logistics.

The world map converts a single-session survival story into a campaign:

- A stable village can become a supplier.
- A new region can be an expedition.
- A loss in one place can affect wider plans.
- Global goals and account-level progression survive individual world failure.

That structure gives both local attachment and a reason to let go.

Mechanics references: [official Steam description](https://store.steampowered.com/app/328080/Rise_to_Ruins/), [community quick guide](https://rise-to-ruins.fandom.com/wiki/Quick_Guide), [resources reference](https://rise-to-ruins.fandom.com/wiki/Resources), [world map reference](https://rise-to-ruins.fandom.com/wiki/World_Map), [official migration update notes](https://store.steampowered.com/news/posts/?appids=328080&enddate=1537106988&feed=steam_community_announcements).

---

## The complete system stack

The game’s appeal comes from the way systems are organized, not from the isolated existence of a farm or tower.

### Layer 1: Terrain and ecology

The map provides spatial constraints and opportunities:

- Harvestable resource deposits.
- Water and terrain obstacles.
- Natural growth and regrowth.
- Buildable versus blocked ground.
- Biome variation.
- Weather and seasons.
- Corrupted versus safe territory.

This is the base truth every other system reads. Terrain must be understandable at a glance because players will mentally simulate routes and land use before committing.

### Layer 2: Population and needs

Villagers are both productive capacity and vulnerable lives. They can require:

- Housing.
- Food.
- Water.
- Safe movement.
- Recovery or medical attention.
- Appropriate conditions for work.
- Faith, affected by positive and negative events in newer versions.

Population growth increases strength and demand simultaneously. A new villager is an extra worker, an extra mouth, extra influence capacity, another pathfinding agent, and another person who can be lost.

### Layer 3: Work and logistics

Workers interact with:

- Job assignments.
- Designated tasks.
- Building job slots.
- Input and output inventories.
- Carry capacity.
- Path distance and path safety.
- Storage rules.
- Task priority and availability.

The crucial design point is that **distance is an economic resource**. A building does not produce “10 food per minute” in a vacuum. Real output is closer to:

```text
effective output
= nominal work rate
× worker attendance
× input availability
× output-space availability
× travel efficiency
× safety uptime
```

This is why two visually similar towns can perform very differently.

### Layer 4: Production chains

Production transforms common resources into capability:

- Raw materials support early construction.
- Refined materials unlock stronger structures.
- Ammunition enables defensive towers.
- Processed food and water reduce worker downtime.
- Equipment improves specialists.
- Stored magical energy supports constructs and powers.
- Trade converts surpluses into otherwise scarce goods.

Good production chains create **qualitative rewards**, not merely larger numbers. A water bottle changes villager behavior. Ammunition turns a tower from architecture into force. A new wall material changes which enemy types can cross it.

### Layer 5: Construction and land planning

Buildings are organized into understandable functional families such as civics, defense, food and water, harvesting, housing, magic, manufacturing, refining, storage, roads, and walls. Categories reduce browsing cost and teach the player the economy’s ontology.

Construction has several overlapping constraints:

- Resource cost.
- Builder time.
- Building cap or civic capacity.
- Footprint.
- Input proximity.
- Output destination.
- Defense exposure.
- Future upgrade space.
- Opportunity cost relative to nightfall.

Upgrading existing structures creates a compact-growth alternative to endless sprawl.

### Layer 6: Threat and corruption

The opposition is not just a wave spawner. Corrupted territory expands, generates resources for the enemy side, and supports enemy construction. Drones gather and build graveyards, roads, and defensive structures. Corruption pressure rises when its desired expansion is constrained.

This creates an antagonist that seems to inhabit the same world rather than appearing from an arbitrary edge timer. The player reads enemy territory as an economy and an ecological infection.

Important consequences:

- Ignoring corruption gives it space and infrastructure.
- Containing it can increase threat pressure.
- Pushing land back may still leave hostile buildings to address.
- Attacking worker-like drones is not automatically the best strategy because replacements can appear.
- Expansion and defense compete for the same land.

Source: [corruption reference](https://rise-to-ruins.fandom.com/wiki/Corruption), [enemy reference](https://rise-to-ruins.fandom.com/wiki/Enemies).

### Layer 7: Defense

Defense supports multiple strategies:

- Path shaping with walls and gates.
- Static damage through towers.
- Ammunition supply chains.
- Mobile rangers or guards.
- Constructed golems with different profiles.
- Temporary god powers.
- Terrain manipulation.
- Emergency healing, relocation, or barriers.

The layers cover one another’s weaknesses. Static defense is efficient but inflexible. Mobile units respond but may be fragile or distracted. God powers are immediate but limited by influence. Stronger walls buy time but do not eliminate the need for damage.

### Layer 8: Time, weather, seasons, and events

The day is visibly segmented from dawn through night. Seasons and weather change resource growth and survival requirements. Special events such as nomad arrivals, full moons, and blood moons interrupt the normal rhythm.

Time does three jobs:

1. It creates deadlines.
2. It changes which activity is currently valuable.
3. It generates anticipation before anything bad actually happens.

A night timer turns “build a tower sometime” into “can I complete and supply it before dusk?”

Sources: [quick guide](https://rise-to-ruins.fandom.com/wiki/Quick_Guide), [event reference](https://rise-to-ruins.fandom.com/wiki/Events), [official hydration/season development notes](https://store.steampowered.com/news/posts/?appids=328080&enddate=1487869301).

### Layer 9: Divine intervention

Influence is both a resource and a leash on omnipotence. Some summoned objects can reserve or reduce maximum influence while maintained. That turns persistent miracles into long-term commitments rather than free permanent upgrades.

The spell set supports several verbs:

- **Correct:** grab, move, recall, heal.
- **Accelerate:** motivate growth or labor.
- **Reveal:** illuminate or inspect.
- **Protect:** walls, towers, summoned defenders.
- **Disrupt:** banish, slow, charm.
- **Destroy:** bolts, meteors, earthquakes, and related attacks.

The range matters because powers solve different classes of failure. A spell system made only of damage abilities would weaken the god fantasy and duplicate tower defense.

Source: [spell reference](https://rise-to-ruins.fandom.com/wiki/Spells).

### Layer 10: Meta-progression and modes

The game provides several ways to engage:

- A survival-oriented default.
- A more traditional, lower-pressure village simulation.
- Nightmare difficulty.
- Peaceful play without monsters.
- Sandbox manipulation.
- Custom settings for variables such as day length, season length, and monster pressure.

This is more than accessibility. It lets different players emphasize different aesthetics: optimization, survival, creativity, experimentation, or mastery.

The 2023 achievement update added a web of 117 goals tied to achievements, persistent progress, god experience, and chest-related rewards. Persistent goals soften the emotional cost of losing a world: even a doomed settlement may have advanced the player’s broader journey.

Sources: [official mode descriptions](https://store.steampowered.com/app/328080/Rise_to_Ruins/), [official Update 2 notes](https://store.steampowered.com/oldnews/?appgroupname=Rise+to+Ruins&appids=328080&enddate=1767254400&feed=steam_community_announcements).

---

## Why those mechanics produce fun

### 1. The player is always making tradeoffs, not filling orders

A weak city-builder tells the player what to build next and waits for the timer. A strong one repeatedly offers several valid needs that cannot all be solved immediately.

In *Rise to Ruins*, one pile of wood might become:

- A house that permits population growth.
- A farm-related building that stabilizes food.
- A harvesting building that improves future wood supply.
- A defensive tower needed tonight.
- A wall that lengthens the enemy route.
- A refinery that unlocks higher-tier construction.

None is universally correct. The map, current inventories, season, population, enemy pressure, and time of day alter the answer. This is meaningful choice: the options have legible but incomparable benefits.

**Emulate it:** Keep at least two credible uses for every major resource. If a resource has only one sink, spending it is bookkeeping rather than strategy.

### 2. Decisions echo across time horizons

The game nests short, medium, and long planning:

| Horizon | Player question | Typical feedback |
|---|---|---|
| Seconds | Where do I cast this spell? | Immediate particles, damage, healing, movement |
| Minutes | Which building or job fixes this bottleneck? | Production starts, inventory changes, walking patterns shift |
| One day/night | Is the settlement prepared for tonight? | The attack validates or breaks the plan |
| One season | Are food, water, temperature, and growth sustainable? | Seasonal stress exposes weak infrastructure |
| One region | Can this village become stable and defensible? | Growth, corruption pressure, regional goals |
| Whole world | Where should people and goods move next? | Migration, courier networks, persistent progression |

Short feedback prevents boredom; long consequences create weight.

**Emulate it:** Every major system should pay off at two or more horizons. A farm can solve today’s hunger while also claiming land that might later be needed for defense.

### 3. It satisfies competence

Self-determination research connects game enjoyment and continued play with feelings of competence and autonomy. *Rise to Ruins* supplies competence in a particularly concrete way: the player’s second wall layout survives where the first one failed; a shorter hauling route visibly increases throughput; a better labor allocation finishes a tower before dark.

The game rarely needs to say “you became smarter.” The new outcome proves it.

**Emulate it:** Make improvements observable. If a player optimizes a route, show fewer idle moments, faster deliveries, a higher stable inventory, or a clearer comparison—not merely a hidden modifier.

Research reference: [Ryan, Rigby, and Przybylski, *The Motivational Pull of Video Games*](https://www.researchgate.net/publication/225998888_The_Motivational_Pull_of_Video_Games_A_Self-Determination_Theory_Approach).

### 4. It satisfies autonomy

The player chooses:

- Settlement location.
- Layout and expansion direction.
- Labor allocation.
- Production priorities.
- Defensive philosophy.
- Where and when to intervene.
- Which region to settle.
- Difficulty and game mode.
- Whether a settlement’s goal is beauty, survival, or experimentation.

These choices express a personal solution rather than a memorized script. Custom mode makes the game’s rules themselves partially player-authored.

**Emulate it:** Offer a small set of strategically distinct tools early. Do not mistake a long linear unlock tree for autonomy.

### 5. The town is a machine the player can watch

City-builders make invisible systems visible. A worker walks to a storehouse, collects material, brings it to a site, constructs a wall, then goes elsewhere. That trip is both simulation and explanation.

The player gets “ant-farm pleasure” from zooming out to see patterns and zooming in to follow an individual. Tiny animations communicate:

- A task has been claimed.
- A resource is in transit.
- A building is waiting for input.
- A worker is productive or idle.
- A danger is approaching.

**Emulate it:** Every important economic transfer should have an inspectable physical or visual representation. Avoid teleporting all goods unless abstraction is an explicit pillar.

### 6. The player oscillates between control and surprise

The plan belongs to the player, but the outcome emerges from agent behavior, pathfinding, weather, enemy composition, events, and timing. That gap produces stories.

A perfectly deterministic spreadsheet can be solved and exhausted. A purely random system feels unfair. *Rise to Ruins* sits between them: players can reason about causes, but the exact night remains lively.

**Emulate it:** Randomness should change the problem, not erase preparation. Telegraph categories of danger and let uncertainty live inside those boundaries.

### 7. Tension is followed by relief

The day/night structure creates an emotional waveform:

```text
morning relief
    → productive calm
        → dusk anticipation
            → night crisis
                → dawn release
                    → repair and reflection
```

Constant danger becomes exhausting; constant peace becomes inert. Alternation makes both halves stronger. A quiet morning feels earned because the player remembers the previous night.

**Emulate it:** Design recovery as a real phase. Let players inspect damage, repair, reorganize, and enjoy a visible period of safety before the next escalation.

### 8. Defense tests the city instead of interrupting it

The defensive game reads the same layout, inventories, roads, population, and production chains as the building game. This is why the genre blend works.

Bad hybrid design places two unrelated games beside one another. Good hybrid design makes them exchange resources and consequences.

**Emulate it:** A threat should interrogate normal city systems. A winter storm tests food storage and heating logistics. A siege tests road geometry and ammunition production. A plague tests housing density and medical access. Avoid an isolated combat arena with no connection to settlement design.

### 9. Failure is expensive enough to matter but informative enough to retry

The official description openly frames frequent loss and learning as part of the experience. The player usually receives a causal narrative: a route failed, a supply ran out, or growth exceeded support capacity.

Persistent goals and broader progression can also preserve some value across a doomed world. This keeps failure from feeling like entirely deleted time.

**Emulate it:** After defeat, provide a concise autopsy:

- The first critical shortage.
- The first structural breach.
- The most interrupted production chain.
- The largest source of villager deaths.
- A timeline that lets the player inspect two minutes before collapse.

Do not tell the player exactly what to build. Give evidence that supports their next hypothesis.

### 10. The aesthetic makes complexity approachable

Pixel graphics communicate many agents and structures without demanding photorealistic detail. Bright particles make essence and spells readable. Music and the visual rhythm of little workers soften a game whose systems can be punishing.

The contrast is valuable: the simulation is deep, but its surface is toy-like and inviting. A player can emotionally tolerate loss more easily when the presentation feels playful rather than relentlessly grim.

**Emulate it:** Pick an art language that scales to crowds and makes state changes readable. Beauty should clarify the simulation, not conceal it.

### 11. It supports several kinds of fun

Using the MDA framework—mechanics, runtime dynamics, and emotional aesthetics—the game serves multiple motivations:

| Aesthetic of fun | Mechanics that support it | Dynamic the player experiences |
|---|---|---|
| Challenge | Night attacks, scarcity, corruption, seasons | Adapting under rising pressure |
| Discovery | Maps, biomes, production chains, enemy types | Learning how systems react |
| Expression | Freeform settlement and defense layouts | “This is *my* solution” |
| Fantasy | God powers and living followers | Being a protective, fallible deity |
| Narrative | Autonomous villagers, emergencies, loss | Unscripted settlement stories |
| Submission/relaxation | Peaceful mode, ambient simulation | Watching a functioning town breathe |
| Mastery | Repeat attempts and diagnostic feedback | Turning failure into expertise |

This breadth explains why the same game can be “relaxing” to one player and “brutal” to another.

Framework reference: [Hunicke, LeBlanc, and Zubek, *MDA: A Formal Approach to Game Design and Game Research*](https://www.cs.northwestern.edu/~hunicke/MDA.pdf). For detailed real-time-strategy enjoyment heuristics, see [Sweetser, Johnson, and Wyeth’s GameFlow follow-up](https://ojs.aut.ac.nz/journal-of-creative-technologies/article/download/16/14/).

---

## The miniature details that make a large difference

These are easy to dismiss as polish, but they carry much of the experience.

### Cursor attraction gives passive production a tactile ending

Villagers generate essence, but the cursor’s attraction completes the loop. The player does not merely see `+1 mana`; they gather the settlement’s activity into their hand. The motion connects worker labor to divine agency.

### Worker sprites make a staffing panel diagnosable

A number says how many workers are assigned. A row of worker states suggests what they are doing. This helps the player distinguish “understaffed” from “assigned but blocked.”

### Ground resources sparkle when claimed

A claim indicator answers a tiny but constant question: “Has anyone decided to pick that up?” Removing that uncertainty makes the simulation feel more trustworthy.

### Inputs physically travel

A tower’s lack of ammunition is understandable because ammunition is made, stored, carried, and consumed. The final projectile contains the history of the whole chain.

### Open paths matter more than abstract aggro

When enemies follow a route the player shaped, the battle validates spatial reasoning. A useful path overlay can make this even stronger.

### Portable food and drink improve behavior, not just statistics

Rations and water bottles reduce return trips. This changes the visible rhythm of work. Upgrades that alter behavior feel more substantial than `+5% output`.

### Maintained miracles reserve capacity

A permanent summoned defender can reduce available influence. The player feels the cost every time they consider another spell. Persistent benefits produce persistent tradeoffs.

### Nomads turn population growth into an event

New people physically approach and may encounter danger. Growth is no longer a silent number increment; it is a rescue opportunity and a small story.

### Special nights modify expectation

A full moon can provide temporary relief while allowing future danger to accumulate; a blood moon changes the nature of the crisis. Variants prevent the cycle from becoming a metronome.

### The game includes low-pressure modes

Peaceful and sandbox modes let players learn systems or enjoy the simulation without proving themselves in the default survival loop. This expands the audience without diluting the core mode.

### Categories teach the design

Grouping construction by function—food, defense, refinement, storage, magic—implicitly tells players how the settlement is organized. Information architecture doubles as tutorial.

---

## Where the design can lose players

Studying weaknesses is as important as studying strengths. Reviews and community discussions repeatedly point toward several friction points.

### 1. A steep learning curve can turn diagnosis into confusion

If a village collapses and the player cannot identify the initiating cause, failure stops being educational. Dense panels, unusual controls, and several interacting needs can overwhelm new players.

**Lesson:** progressive disclosure must reveal complexity in layers. The first hour should introduce one complete causal chain at a time.

### 2. Agent AI and pathfinding can undermine trust

Indirect control only feels good while agents behave plausibly. A worker ignoring nearby danger or carrying a low-priority object during an emergency can make the player feel robbed rather than challenged.

**Lesson:** expose task claims, path failures, and priorities. Add emergency policy overrides. When AI cannot fulfill an order, explain why.

### 3. A solved build order can flatten replayability

If the same opening sequence dominates every map, choice becomes ritual. Some negative reviews describe later play as building everything in the “right” order and waiting.

**Lesson:** maps, weather, threats, resource distributions, and faction traits must change priorities—not merely reskin the terrain.

### 4. Late-game waiting can outlive meaningful decisions

Once production and defense stabilize, long victory or progression timers risk turning play into observation without stakes.

**Lesson:** the late game needs decisions of a new *kind*: diplomacy, regional specialization, population politics, expeditions, or transformative projects. Do not merely increase quantities and wave health.

### 5. Dense information can become visual noise

Many tiny agents, particles, buildings, warning messages, and panels compete for attention.

**Lesson:** alerts should be prioritized by consequence and time sensitivity. The interface must answer “What requires me now?” before “What exists?”

Critical perspective: [top negative Steam reviews](https://steamcommunity.com/app/328080/negativereviews/?browsefilter=toprated&l=english), [Save or Quit review](https://saveorquit.com/2017/04/11/review-rise-to-ruins/).

---

## Design pillars for *Destiny To Yours*

Do not begin with a list of 80 buildings. Begin with promises about the player experience.

### Pillar 1: City building is the main game

The settlement must be satisfying when enemies are disabled. Reading land, fitting buildings together, assigning work, shortening routes, balancing needs, processing materials, expanding services, and watching citizens use the result form the primary game.

Defense is a demanding customer of those systems. It consumes city-made goods, occupies valuable city land, uses city roads, draws from the city workforce, and protects the city the player already values. It supplements city building rather than competing with it for the game's identity.

**Test:** Run a 45-minute playtest with threats disabled. Do players still make difficult spatial and economic choices, change their plans, and enjoy watching the settlement? If not, improve the city simulation before adding more enemies.

### Pillar 2: A settlement is a visible chain of causes

The player should be able to follow a material from landscape to finished purpose. If a system matters, its state and movement should be inspectable.

**Test:** Select any finished object. Can the interface explain where its materials came from, who transported them, and what is blocking its replacement?

### Pillar 3: Calm preparation earns dramatic survival

Construction and crisis use the same space and economy. Peace gives the player time to form a plan; pressure reveals its consequences.

**Test:** Remove the threat system. Does town planning lose an important reason? Remove town planning. Does the threat become impossible or shallow? If either half survives unchanged, the hybrid is insufficiently connected.

### Pillar 4: The player directs; citizens perform

The player sets goals, zones, job limits, routes, and emergency policies. Citizens choose individual tasks. Direct powers exist for exceptional moments.

**Test:** Can the player solve routine work without clicking individuals? Can they still intervene when a beloved citizen or critical chain is in danger?

### Pillar 5: Every failure leaves a usable lesson

Loss should be painful, legible, and generative.

**Test:** After a playtest defeat, ask the player what they will change. A healthy answer names a system or layout. “I guess I needed more stuff” is a warning sign.

### Pillar 6: Growth creates new vulnerability

Population and technology should not be pure power. Density increases disease risk; territory lengthens routes; advanced industry consumes scarce inputs; prestige attracts stronger threats.

**Test:** Is there ever a rational reason to delay growth? If not, expansion may be automatic rather than strategic.

### Pillar 7: Strategies are spatially visible

Players should recognize a food district, defensive funnel, market center, or distributed village by looking at the map.

**Test:** Hide the statistics. Can an experienced player infer what this town is optimized for?

### Pillar 8: Compact construction is a spatial puzzle

The placement grid is much finer than a conventional one-building-per-tile city-builder grid. Buildings use varied rectangular, L-shaped, stepped, courtyard, and thin footprints. Entrances, delivery edges, operating clearance, roads, terrain, and future upgrades make packing a town an ongoing Tetris-like problem.

Compactness is valuable but never automatically correct. A dense town shortens travel and defense perimeters, yet also creates congestion, fire spread, disease concentration, blocked expansion, and difficult evacuation. Open space costs walking time and wall length, but provides safety and flexibility.

**Test:** Give three players the same small site and building list. Their towns should have visibly different arrangements with credible advantages—not one obviously optimal packing pattern.

---

## Give *Destiny To Yours* its own identity

Emulation should target design relationships, not surface content. A possible original identity is **a city-builder about promises and consequences**.

### Original fantasy

The player is not a god collecting essence. They are the keeper of a living civic destiny. At the beginning of each season, the settlement chooses or is offered a **Promise**:

- “No one sleeps without shelter.”
- “The river will remain clean.”
- “We will welcome every refugee.”
- “No wall will divide the old road.”
- “We will send aid to the valley before winter.”

Keeping a Promise changes culture, migration, technology, and future choices. Breaking it may save the city now but reshape public trust and the kinds of citizens who arrive later.

This retains the appeal of interconnected planning and pressure while creating a distinct thematic center: **the city becomes the history of what the player chose to honor.**

### Original pressure system

Instead of copying corruption and nightly monster waves, use **Convergences**: forecast periods when geographic, civic, or hostile pressures align. A Convergence is the event framework, not the name of every danger.

Examples:

- A flood follows water channels and tests drainage, storage placement, and evacuation roads.
- A caravan surge tests housing, food reserves, and disease control.
- A political schism divides work preferences and access to civic buildings.
- A wildfire reads wind, dry vegetation, roadbreaks, and water logistics.
- A hostile incursion follows observed routes, attacks a legible kind of target, and consumes city-made defensive supplies.
- A “destiny storm” temporarily makes spoken civic Promises physically binding.

Each crisis must read the normal city rather than launching a separate minigame.

### Original hostile pressure: the Fray

One possible working direction is **the Fray**, a condition that takes root in neglected land, abandoned construction, discarded materials, and broken civic bonds. Its creatures are called **Ravelers**. These are provisional names to test the concept, not locked production terminology.

The Fray is not a recolored corruption carpet. It behaves through recognizable activity:

- Ravelers scout paths and observe frequently traveled routes.
- They take loose or poorly protected materials to build temporary **Snarls**.
- Snarls change nearby movement, visibility, wildlife, or resource safety rather than merely producing units.
- Broken roads, abandoned buildings, battle rubble, and isolated works give them opportunities.
- Maintained public space, active routes, lookouts, patrols, and fulfilled Promises make territory harder for them to exploit.
- They may retreat, reroute, raid a shipment, or establish themselves elsewhere rather than always charging the town center.

Working enemy roles should have strong pixel silhouettes and distinct planning questions:

| Working name | Readable behavior | City assumption tested |
|---|---|---|
| Skipling | Small, quick, crosses shallow water and narrow gaps | Reliance on one boundary type |
| Raveler | Carries exposed supplies toward a Snarl | Poor storage and overextended extraction |
| Husher | Obscures warnings and disrupts lookout coverage | Reliance on centralized detection |
| Breachback | Slow, broad, follows usable routes and damages gates | Weak entrances and direct roads |
| Ashwake | Spreads fire through tightly packed structures | Maximum density without breaks or water access |

The names and fiction should change if playtesting reveals a stronger identity. The behavioral jobs matter first: the player should recognize a silhouette, predict its likely objective, and adapt the city.

### A complete defense has six layers

Defense should not lack depth, even though it is secondary to city building:

1. **Detect:** scouts, tracks, watch coverage, citizen reports, and regional information reveal likely behavior.
2. **Forecast:** the player learns the threat family, approximate strength, and possible routes before committing resources.
3. **Shape:** walls, gates, terrain, roads, bridges, light, and deliberately empty land alter movement.
4. **Sustain:** workshops, carriers, local stores, medical services, food, and replacement parts keep defenses operating.
5. **Respond:** trained citizens, mobile teams, fallback positions, shelters, and Mandates handle surprises and breaches.
6. **Recover:** rescue, treatment, rubble clearing, rebuilding, salvage, mourning, and investigation return the player to city building.

An attack is deep when these layers can compensate for one another. Excellent warning can make modest defenses viable. Strong walls can buy time for weak responders. Distributed supplies can preserve a breached district. No single layer should be sufficient by itself.

### Original direct-intervention resource

Replace god spells with **Mandates**. The player accumulates public trust by keeping visible commitments. Trust can fund brief high-authority actions:

- Call an emergency work shift.
- Open private stores to the public.
- Establish a temporary evacuation corridor.
- Rally volunteers to reinforce a failing structure.
- Suspend a Promise—with a lasting trust cost.

This creates the same macro/micro oscillation while fitting a different fantasy.

---

## Main game architecture: city first, defense second

The game should be designed in this order:

```text
interesting land
→ difficult placement
→ living citizens
→ physical logistics
→ moving economic bottlenecks
→ growth and specialization
→ attachment to the city
→ defensive preparation
→ an attack that tests the city
→ repair, learning, and better building
```

This ordering is a product rule, not merely a tutorial order. No defense feature should be approved unless it makes an existing city-building decision more meaningful.

### The three layers of city-building fun

#### Layer A: Shape the place

The player reads terrain, selects a starting point, fits differently shaped buildings together, lays narrow and wide routes, preserves useful gaps, assigns land, and decides where future expansion can occur.

The key questions are spatial:

- Can housing fit close to food without occupying fertile soil?
- Should industry sit near raw materials or near the people who operate it?
- Is the shortest road worth creating a congested central intersection?
- Should an awkward gap become a garden, cache, well, shrine, or emergency access lane?
- Is a compact district worth the increased fire, disease, or evacuation risk?
- Will today's perfect fit prevent tomorrow's building upgrade?

This layer produces authorship. A screenshot of the town should reveal the player's decisions.

#### Layer B: Make the place work

Citizens turn the layout into behavior. They walk, claim jobs, carry inputs, satisfy needs, wait, reroute, rest, and respond to policies. The player adjusts priorities and watches the effects propagate.

The key questions are systemic:

- Is production slow because of labor, input, travel, storage, or demand?
- Does another workshop help, or would it compete for the same workers?
- Is a distant resource deposit truly valuable after transport time?
- Which reserve should be consumed now and which must survive the season?
- Is population growth increasing capacity faster than needs?
- Which service is the settlement's current limiting factor?

This layer produces competence. The player feels clever because the simulation visibly improves after a good diagnosis.

#### Layer C: Care about what was built

Named citizens, lived-in buildings, neighborhood history, seasonal Promises, visible repairs, and local traditions turn an efficient arrangement into a home.

The key questions are emotional:

- Who lives and works in this district?
- Which family or work crew depends on this route?
- What did this building survive?
- Which Promise shaped this neighborhood?
- What would be painful to lose even if it could be rebuilt efficiently?

This layer creates stakes before enemies appear. Defense becomes meaningful because the player protects something they authored, understand, and value.

### The city systems that create the juggling

The player should usually face three to five active concerns, not twenty simultaneous emergencies. These systems create that workload:

1. **Land:** footprint space, soil, slope, water, vegetation, hazards, and expansion room.
2. **People:** population, housing, health, morale, safety, family or community ties, and availability.
3. **Work:** profession targets, task priorities, shifts, travel time, and emergency reassignment.
4. **Materials:** extraction, processing, storage, hauling, spoilage, and competing uses.
5. **Services:** food, water, rest, sanitation, medicine, civic access, and maintenance.
6. **Movement:** roads, alleys, bridges, entrances, congestion, delivery access, and evacuation.
7. **Time:** daily work windows, weather, seasons, construction deadlines, and recovery periods.
8. **Commitments:** Promises, trust, migration policy, trade agreements, and cultural consequences.
9. **Growth:** new citizens, district expansion, advanced production, specialization, and increased fragility.
10. **Preparedness:** reserves, shelters, guards, walls, lookout coverage, equipment, and contingency routes.

Each concern must touch at least two others. Sanitation should not be an isolated happiness meter; it should read density, water routes, worker availability, illness, and waste logistics. Preparedness should not be an isolated military score; it should read roads, materials, staffing, storage, and city geometry.

### How bottlenecks should move

A satisfying city never becomes permanently solved, but it also does not randomly invalidate good work. Progress changes the current limiting problem:

```text
secure water
→ population can grow
→ food demand rises
→ farms consume land and labor
→ hauling becomes inefficient
→ roads and local storage matter
→ dense growth creates sanitation pressure
→ advanced services need processed materials
→ regional imports become attractive
```

Every solution should provide a period of relief before revealing the next constraint. If a new problem appears instantly, progress feels fake. If no new problem develops, the game becomes idle observation.

### The defense contract

Defense receives roughly one quarter of the player's normal planning attention and becomes more prominent during clearly forecast danger. It must remain deep, but its depth comes from interacting with the city rather than from becoming a separate unit-control game.

Defense must use:

- City-produced construction materials.
- City-produced weapons, ammunition, supplies, or protective equipment.
- Citizens drawn from normal labor pools.
- Roads used by workers and emergency responders.
- Storage and delivery rules shared with the economy.
- Terrain and building footprints already relevant to city layout.
- Shelters, clinics, food, water, and repair capacity.
- Trust-funded Mandates for rare intervention.

Defense must test:

- Whether important districts were placed safely.
- Whether the town has redundant routes and stores.
- Whether compact construction created dangerous congestion.
- Whether outer industries can evacuate or hold.
- Whether the economy can sustain defensive consumption.
- Whether the player preserved enough flexible labor and reserve stock.

Defense must not:

- Teleport in resources that bypass the city economy.
- Take place on a disconnected battle screen.
- Require constant individual-unit micromanagement.
- Make one maze or wall pattern solve every threat.
- Attack so frequently that rebuilding and peaceful optimization disappear.
- Make peaceful-mode city building feel like a stripped-down game.

### Enemy design as planning pressure

Enemy families should ask different city-building questions:

| Enemy behavior | City-building question it tests |
|---|---|
| Follows roads quickly | Did efficient roads also create a direct hostile route? |
| Damages isolated production | Did the town overextend toward resources? |
| Avoids walls but crosses shallow water | Are natural boundaries truly secure? |
| Disrupts storage or deliveries | Does the economy have local buffers and redundancy? |
| Creates fire or contamination | Is the city too densely packed? |
| Frightens civilians | Are shelters and evacuation paths accessible? |
| Attacks infrastructure instead of people | Can the town prioritize repairs while operating? |
| Establishes camps in unused land | Did expansion leave important territory unobserved? |

The player should learn what an enemy tends to do, receive a forecast about likely danger, and still face uncertainty about exact timing, route, or composition. Preparation must matter more than reflexes.

### The desired emotional rhythm

City building occupies the long, satisfying middle of the experience:

```text
explore and plan
→ place and construct
→ watch the town become efficient
→ solve a moving bottleneck
→ enjoy a period of stability
→ receive a danger forecast
→ adapt the existing city
→ endure a short, intense defense
→ rescue selectively
→ repair and improve
→ return to building with a new story
```

The crisis should be memorable precisely because it interrupts a town that was already enjoyable—not because combat is the only time something happens.

---

## The fine-grid “Tetris city” system

Spatial packing should be one of the game's signature pleasures. The player is not filling large square lots. They are fitting a growing collection of differently sized structures, yards, paths, resources, and defenses into imperfect terrain.

### Grid scale

Use a small logical **plot cell** as the shared placement and harvesting unit. A useful prototype target is:

- One plot cell represents roughly one quarter of a conventional city-builder tile.
- One plot cell renders as approximately 8×8 native art pixels before display scaling.
- A local section contains roughly 192×192 to 256×256 plot cells during early tests.
- Citizens move continuously or on a separate navigation graph; their feet do not need to jump visibly from cell center to cell center.
- Terrain, resource designation, roads, building masks, operating space, and defensive collision all agree on the same plot coordinates.

The exact numbers remain prototype variables. The test is whether a one-cell adjustment can produce a meaningfully better fit without forcing pixel-perfect mouse control.

### Footprints are masks, not only rectangles

Every placeable structure owns a footprint mask containing several cell types:

- **Solid:** occupied by the building and impassable.
- **Walkable:** courtyard, covered passage, interior lane, or bridge-through space.
- **Entrance:** a cell citizens use to enter or receive services.
- **Delivery:** an edge or cell where carried inputs must arrive.
- **Operating:** space needed while the building runs, such as a saw yard.
- **Clearance:** optional space required for safety, light, airflow, or an upgrade.
- **Connector:** an attachment point for a later wing, wall, pipe, canal, or road.

That permits shapes such as:

```text
small cache       narrow workshop       courtyard hall       stepped kiln

##                ####                  #####                ###
##                ##E#                  #...#                ###
                  ##D#                  #.E.#                 ##D
                  ####                  ##D##

# solid   . walkable court   E entrance   D delivery
```

Rotation should usually be allowed. Mirroring should be allowed when the art and function support it. A few landscape-bound structures may have directional constraints, such as a waterwheel facing flowing water.

### Footprint families

The building library should deliberately mix shapes and scales:

- **Tiny fillers:** 1×1 to 2×3 lamps, caches, gardens, pumps, shrines, stairs, and guard posts.
- **Small civic fabric:** 3×3 to 5×6 homes, kitchens, clinics, workshops, and neighborhood stores.
- **Long structures:** ropewalks, drying racks, markets, barracks, walls, and covered passages.
- **Yard structures:** a small solid building with a larger operating-space mask.
- **Courtyard structures:** buildings whose useful center remains walkable or plantable.
- **Large anchors:** halls, mills, foundries, reservoirs, theaters, and major defensive works.
- **Terrain-fit structures:** bridges, hillside buildings, cliff stores, river intakes, and watch platforms.

Large buildings should not simply replace small ones. They can be more labor-efficient but harder to fit, slower to build, more vulnerable to disruption, and less adaptable when a district changes.

### Why packing is fun

The placement problem works when several benefits conflict:

```text
short travel
versus operating clearance
versus future expansion
versus hazard separation
versus defensive perimeter
versus road capacity
versus terrain quality
```

A perfect geometric fit should not automatically be a perfect city. Squeezing houses beside a foundry may shorten commutes but worsen noise, smoke, fire exposure, and evacuation. Leaving space may look inefficient today but accept a future clinic wing or emergency reservoir.

Awkward leftover spaces must remain useful. Tiny fillers, trees, footpaths, drains, storage racks, gardens, wells, public art, and defense attachments turn gaps into opportunities. Otherwise the player experiences irregular footprints as wasted land rather than a creative puzzle.

### Placement tools that prevent frustration

The challenge should come from planning, not fighting the controls. Building placement needs:

- Strong grid snapping with a crisp footprint outline.
- Rotate and, where supported, mirror controls.
- Valid, warning, and blocked cells shown separately.
- Entrance, delivery, operating-space, and future-upgrade overlays.
- Estimated walking routes to likely inputs and destinations.
- A temporary planning mode that places uncommitted ghost buildings.
- Multi-building blueprints for rearranging a district before construction.
- Free cancellation until materials are delivered.
- Partial material recovery after construction, with the loss stated before demolition.
- A replace-in-place preview for upgrades.
- Small, medium, and large brushes for harvesting designations.
- Drag-to-paint and drag-to-erase rather than requiring individual cell clicks.
- Keyboard-accessible rotation and brush resizing.

The player should be able to create a dense, complicated district comfortably even when the underlying grid is fine.

### Roads should also be a packing decision

Do not require every cell to touch a full road. Support a hierarchy:

- **Foot trails:** one cell wide, cheap, low capacity.
- **Lanes:** two cells wide, normal delivery access.
- **Ways:** three or more cells wide, high capacity and fast emergency movement.
- **Service gaps:** walkable spaces between compatible structures, but poor for carts.

Buildings can require different access. A home may function from a foot trail; a large workshop may require a lane beside its delivery edge; a market or defensive depot may become inefficient without a Way.

This lets roads consume meaningful space without forcing every town into a uniform street grid.

### Harvesting on the same fine grid

Harvest designations should feel like land management rather than deleting resource nodes:

- Paint individual plot cells or larger brush areas.
- Choose gather-only, clear-land, preserve-seed, or emergency-strip rules.
- Show which resources are already claimed by workers.
- Preview estimated yield and travel cost for the marked area.
- Allow protected groves and regeneration zones.
- Preserve stumps, disturbed soil, quarry cuts, or other visible history after extraction.

Fine-grained harvesting lets the player clear precisely around irregular construction while choosing which natural shapes remain part of the town.

### Spatial consequences that keep packing strategic

The simulation should read the player's compactness:

- Shorter trips improve normal productivity.
- Crowded junctions reduce carrying speed.
- Fire and illness spread more easily through dense districts.
- Noise or smoke affects nearby uses.
- Wide roads and courtyards improve evacuation and fire response.
- Wall length decreases around compact towns.
- Large enemies or emergency carts need wider routes.
- Rubble from one destroyed structure can block a tight lane.
- Distributed caches provide resilience but require more total labor to stock.

This creates multiple valid urban forms instead of one mathematically optimal packing ratio.

---

## Original visual and naming direction

The working art direction is **a living pixel-art survey map stitched together by civic destiny**. It should feel readable and lightly storybook-like rather than grim, hyper-detailed, or visually noisy.

### Pixel-art principles

- Use a three-quarter or high top-down camera that keeps footprints and entrances readable.
- Build art at one intentional native resolution and scale it by whole-number increments.
- Use compact color ramps and strong value separation rather than heavy texture.
- Give every building family a clear roof shape and silhouette.
- Reserve the brightest colors for current work, warnings, Promises, and player commands.
- Animate citizens with a few expressive frames rather than fluid but ambiguous motion.
- Let construction visibly advance through foundation, frame, roof, and finishing stages.
- Show carried resources on citizens, carts, racks, and delivery cells.
- Keep terrain shapes broad enough that the fine placement grid remains legible.
- Use weather, flags, chimney smoke, lamps, gardens, and moving water to make a stable town feel alive.

### The distinctive “thread” motif

Destiny should appear subtly throughout the visual language:

- Survey borders and region connections resemble stitched seams.
- Promise markers use knots, ribbons, and woven emblems.
- Important citizen routes can briefly appear as faint threads when inspected.
- A neighborhood's history can add small banners, roof trims, or pavement patterns.
- Mandates pull visible lines of trust from civic places toward the affected district.
- Broken commitments fray or recolor civic banners rather than filling a generic morality bar.

The motif must remain restrained. The town should still look constructed from timber, stone, soil, cloth, water, and metal—not like every object is literally made from magical string.

### Naming rules

Original names should emerge from the setting's culture and remain understandable in play:

1. Give every object a clear functional category in its tooltip.
2. Use one or two evocative words, not long fantasy compounds.
3. Name related buildings with a shared cultural pattern.
4. Avoid renamed equivalents of distinctive *Rise to Ruins* terms.
5. Prefer names citizens might naturally use.
6. Test names aloud and in plural form.

Working examples—not locked final names—include:

| Plain function | Possible setting name | Interface clarification |
|---|---|---|
| Town center | Hearthhold | Civic center and Promise gathering place |
| Local warehouse | Keepshed | Neighborhood material storage |
| Food hall | Commonpot | Prepares meals and feeds nearby citizens |
| Lumber workshop | Beamwright | Converts timber into structural beams |
| Mason workshop | Stonefold | Cuts and stores building stone |
| Clinic | Menders' Nook | Treats injury and illness |
| Shelter | Wayhouse | Temporary beds and crisis refuge |
| Defensive depot | Wardstore | Stores equipment and supplies responders |
| Watchtower | Farwatch | Detects hazards and approaching enemies |
| Trust intervention | Mandate | Temporary civic emergency order |
| Seasonal commitment | Promise | Public commitment with lasting consequences |

These names should be replaced whenever the evolving culture, history, or spoken language of the world suggests something stronger. Originality comes from a coherent whole, not unusual spelling.

### Readability budget

At the default zoom, the player must be able to distinguish:

- Ground from harvestable material.
- Walkable space from blocked space.
- Homes from production, storage, civic, service, and defense buildings.
- Citizens who are working, carrying, resting, endangered, or blocked.
- Normal ambience from actionable danger.
- A building's front or delivery side.

Decorative pixels are allowed only after these states remain readable in rain, darkness, crowds, and dense construction.

---

## The recommended core loop for *Destiny To Yours*

### Moment-to-moment loop: 5–20 seconds

```text
notice a signal
→ inspect its cause
→ issue one policy/designation/build order
→ watch citizens respond
→ confirm or revise
```

Required feedback:

- Acknowledgment within 100 ms of the player’s input.
- A visible claim when a citizen accepts the task.
- A reason when nobody can accept it.
- A path or destination preview for spatial orders.
- An arrival/build/production effect that closes the loop.

### Economic loop: 2–8 minutes

```text
forecast a need
→ allocate labor and land
→ extract inputs
→ transport and process
→ consume or store output
→ discover the next bottleneck
```

The output should change capability or behavior, not just increase wealth.

### Crisis loop: 12–25 minutes

```text
receive an imperfect forecast
→ choose what to protect
→ prepare shared city systems
→ endure the crisis
→ rescue selectively
→ recover and investigate
```

The forecast should reveal the *class* of threat while retaining uncertainty about magnitude or location.

### Seasonal loop: 60–120 minutes

```text
choose a Promise
→ organize growth around it
→ face a temptation to break it
→ keep, reinterpret, or abandon it
→ permanently change the settlement’s culture
```

### Campaign loop: multiple settlements

```text
stabilize one place
→ specialize it
→ send people/knowledge/material elsewhere
→ establish a new settlement
→ let regional dependencies produce new stories
```

---

## The generated island campaign

The campaign takes place on one large procedurally generated island divided into smaller playable **sections**. The island is the persistent strategic world; a section is the detailed city-building map where citizens live and work.

The feature has four purposes:

1. Give the player a meaningful choice before placing the first building.
2. Make each settlement solve a different city-building problem.
3. Let mature settlements remain valuable through specialization and connection.
4. Turn local successes and failures into island-wide history.

### The complete player journey

```text
generate an island from a seed
→ study its geography and section boundaries
→ compare known benefits, burdens, and connections
→ choose a section to settle
→ zoom into its generated local map
→ compare several viable starting locations
→ place the Hearthhold
→ build, specialize, and survive locally
→ connect to neighboring sections
→ move people, materials, and knowledge
→ choose the next section
→ respond to island-wide consequences
→ establish a network of distinct settlements
```

The section-selection decision and the village-placement decision must answer different questions. Section selection is about long-term identity and regional relationships. Hearthhold placement is about walking distance, terrain, growth space, and local defensibility.

### What the player sees on the island map

The initial island overview should reveal enough to support strategy without exposing every local tile:

- Section shape, approximate size, elevation, and coast.
- Dominant biome and climate.
- Major rivers, lakes, passes, and mountain chains.
- Two or three notable resource tendencies.
- Known hazards and seasonal extremes.
- Neighboring sections and likely connection types.
- Several broad starting-site candidates.
- One distinctive opportunity and one accompanying burden.
- Unknown landmarks represented honestly as unknown, not hidden numerical traps.

The interface should let the player compare sections side by side. It should describe behavioral consequences rather than rely on modifiers:

```text
Weak description:  +20% farming

Better description:
Deep river soil supports two harvests each warm season,
but spring floods cross low roads and spoil ground-level stores.
```

### Section benefits must be paired with burdens

Every section receives a strategic package, not a free bonus:

| Section character | Opportunity | Burden | City form encouraged |
|---|---|---|---|
| River delta | Fertile soil, fishing, water transport | Flooding, disease, unstable banks | Raised stores and separated neighborhoods |
| Mountain basin | Rich stone and metal, natural chokepoints | Cold, little farmland, steep hauling | Dense mining town with imported food |
| Ancient woodland | Timber, medicine, wildlife | Fire, obstructed sight, slow clearing | Dispersed clearings connected by trails |
| Wind coast | Fishing, salt, shipping, wind power | Storms, erosion, exposed approaches | Hardened harbor with inland refuge |
| Open prairie | Fast farming and easy roads | Few barriers, wind and distant resources | Broad agricultural town with planned defenses |
| Volcanic slope | Fertile ash and rare minerals | Toxic events, tremors, lava channels | Terraced town with evacuation routes |
| Marsh | Reeds, herbs, peat, concealed waterways | Disease, unstable roads, limited foundations | Raised paths and small specialized districts |
| Narrow pass | Trade control and strong defensive terrain | Congestion and scarce building room | Extremely compact vertical settlement |

The pair must change how the player places and operates a city. A section tag that only modifies output percentages is insufficient.

### Island generation pipeline

Generate the island from causes so its geography feels coherent:

#### Step 1: Seed and campaign rules

Create a reproducible island seed plus the selected campaign settings. The same seed and settings must recreate the same strategic island.

#### Step 2: Island silhouette

Create one recognizable landmass with peninsulas, bays, offshore islets, and a readable overall shape. Reject silhouettes that are excessively fragmented, round, or dominated by unusable coastline.

#### Step 3: Elevation and geology

Place mountain spines, ridges, basins, plateaus, valleys, and geological bands. Mineral distribution should follow geology rather than uniform noise.

#### Step 4: Climate and wind

Determine prevailing wind, temperature gradients, rainfall, and rain shadows. These variables influence vegetation, water, fire, farming, and later hazards.

#### Step 5: Hydrology

Run water downhill to create watersheds, rivers, lakes, deltas, marshes, and floodplains. Rivers should normally connect to a believable source and destination.

#### Step 6: Ecology and resources

Derive soil, forests, grasslands, wetlands, and wildlife from elevation, rainfall, water, and geology. Place common necessities broadly and rare materials in strategically meaningful clusters.

#### Step 7: Section boundaries

Divide the island along rivers, ridge lines, passes, coasts, and ecological transitions. Boundaries should look geographically motivated. Avoid a visible square or hex overlay as the primary fantasy, even if an internal graph represents connections.

#### Step 8: Section identities

Evaluate each section's terrain and assign its opportunity, burden, likely specialties, hazard profile, and connection options. Identity should be derived from the generated land whenever possible.

#### Step 9: Connections

Create adjacency through passes, roads, rivers, coastlines, ferries, or later infrastructure. Every starting candidate needs at least two plausible long-term expansion directions unless an isolated-island challenge is explicitly selected.

#### Step 10: History and landmarks

Place a small number of ruins, old roads, sacred places, abandoned works, and cultural traces. These should alter decisions or Promises, not serve as decorative collectibles alone.

#### Step 11: Strategic validation

Reject or repair islands that lack viable opening choices, contain dominant sections, isolate essential resources unfairly, or create impossible connections.

#### Step 12: Presentation pass

Render a simplified pixel-art survey map with strong silhouettes, readable water flow, section seams, landmarks, and uncluttered comparison information.

### Local section generation

When the player enters a section, generate its detailed map from the island data plus a stable section seed:

```text
island elevation and rivers
+ section climate and geology
+ neighboring connections
+ section-specific seed
+ campaign history
= detailed local terrain
```

The local generator must preserve macro truth. A river crossing a section on the island map must enter and leave the detailed map at compatible points. A mountain pass connection must correspond to an actual route. A burned or invaded section must remember that history when revisited.

Local generation proceeds in this order:

1. Import edge connections and large geographic anchors.
2. Produce fine elevation, water channels, and buildability.
3. Grow soil, vegetation, and harvestable clusters.
4. Place rare deposits and landmarks.
5. Reserve space for entrances to neighboring sections.
6. Calculate travel, farming, hazard, and defensive values.
7. Find potential Hearthhold sites.
8. Validate early-resource reachability and growth room.
9. Decorate without obscuring placement information.

### Choosing where to place the first village

Time remains paused until the player places the Hearthhold. Hovering a potential footprint should show:

- Walking time to early timber, stone, food, and water.
- Nearby buildable area and its fragmentation.
- Soil and hazard exposure.
- Likely routes to section exits.
- Natural barriers and open approaches.
- An approximate 10-minute expansion envelope.
- Warnings about seasonally flooded, unstable, or contaminated ground.

The generator must create at least two credible starts with different advantages. One might be compact and defensible but far from fertile soil; another may have excellent water and farmland but require a wider protective perimeter.

Do not label a location “best.” Give evidence and let the player author the decision.

### Regional specialization

No section should contain an effortless version of every resource chain. Each settlement needs:

- A reliable way to meet basic survival needs.
- One or two naturally strong specializations.
- One meaningful scarcity that is expensive but locally survivable.
- A reason to connect with at least one neighbor.
- A useful role after becoming stable.

A locally scarce resource must have an inefficient fallback. For example, a mountain settlement might maintain costly greenhouse food rather than instantly collapsing when imports stop. Trade disruption then creates a difficult city-building problem instead of an unavoidable failure.

Possible settlement roles include:

- Food basin.
- Timber and medicinal producer.
- Stone and metal center.
- Coastal trade port.
- Cultural or research center.
- Defensive frontier.
- Transport junction.
- Refuge and recovery settlement.

Roles emerge from land and player choices; they are not rigid character classes selected from a menu.

### Connections create island stories

People, materials, knowledge, danger, and Promises can cross section borders. A useful chain might be:

```text
coastal storm closes shipping
→ mountain settlement loses food imports
→ rationing changes citizen schedules
→ workers leave mines to operate greenhouses
→ metal exports decline
→ frontier equipment cannot be repaired
→ an enemy force reaches the forest border
→ the player must redirect trade or issue a costly Mandate
```

This is fun because one understandable event travels through systems the player built. The response should offer several remedies rather than one scripted solution.

### Migration

Founding a new section requires people to leave an existing settlement or join through a believable migration event. New settlements should not receive a consequence-free population from nowhere.

Migration creates several decisions:

- Which skills can the old settlement spare?
- How much food and equipment travels with the group?
- Which route is safest and fastest?
- Does the old settlement have enough labor afterward?
- Does the new settlement inherit a Promise or choose a new one?
- What happens if the expedition must return?

Citizens retain names, skills, relationships, and some history when they move. This makes the island feel inhabited by one connected society rather than independent scenario populations.

### Threats across the island

Enemies and hazards should occupy geography and communicate intent. They may establish camps, move through passes, spread along waterways, raid supply routes, or pressure an exposed frontier.

The player should be able to answer:

- Where did this threat come from?
- Why is it interested in this location?
- Which route can it use?
- What warning signs were available?
- Which city system will it test?
- What can change its path or objective?

Threat pressure should not rise merely because a hidden global timer advanced. Time may increase danger, but settlement wealth, observed routes, overharvesting, broken Promises, regional neglect, and enemy-held territory should help explain the specific pressure.

### Section loss and recovery

Losing a local settlement should damage the campaign without automatically deleting the island:

- Surviving citizens may flee to connected sections.
- Stored materials may be lost, abandoned, or recoverable.
- Roads and buildings become ruins on future visits.
- The section may fall under hostile control or ecological collapse.
- Neighboring trade and safety change immediately.
- A later expedition can reclaim and rebuild it.

Failure therefore writes history onto the island. Recovery is more meaningful when the player recognizes the streets and remains of the settlement they lost.

### Simulation levels

A giant island must not fully simulate every citizen at full detail simultaneously.

- **Active section:** complete citizens, paths, resources, buildings, combat, and animation.
- **Connected section:** summarized production, consumption, shipments, population, hazards, and defensive readiness.
- **Distant section:** coarse seasonal updates and major events only.
- **Reactivated section:** reconcile summarized changes into visible inventories, citizen states, damage, and history before play resumes.

The summary model must conserve important quantities and explain major changes. A player should never reopen a settlement and find unexplained ruin caused by invisible high-speed simulation.

### Procedural-generation fairness rules

Every generated island must satisfy automated checks:

- At least three viable initial sections.
- At least two credible Hearthhold sites in each normal section.
- Essential early resources reachable without crossing lethal terrain.
- No required connection blocked before the technology needed to open it.
- No section with every major advantage and no meaningful burden.
- No single resource layout forcing the same opening build order everywhere.
- At least two connected expansion routes from the starting area.
- Hazards telegraphed before they can cause campaign-ending damage.
- Local fallback for every imported survival necessity.
- A path to recover from the loss of any one non-final settlement.

Generation telemetry should record why a candidate island was rejected, not just the seed. This makes generator tuning diagnosable.

### Island feature boundaries

Do not initially include:

- Seamless real-time simulation across the entire island.
- Naval combat.
- Diplomacy with many fully simulated rival nations.
- Dozens of biome-specific production chains.
- Underground maps.
- Freeform terraforming of the island-level coastline.
- Random world modifiers that cannot be explained through geography.

Those ideas can be evaluated after the local city loop, section generator, and three-settlement campaign are demonstrably fun.

---

## Enjoyment priorities: reasons to keep improving the town

These additions turn the existing systems into visible rewards, optional ambitions, and memorable consequences. They are design hypotheses to test in small increments. Their inclusion here does not mean they all belong in the first playable.

### 1. Improvements the player can immediately see

A nearby kitchen should reduce meal trips. A second delivery entrance should clear a queue. A cart-capable Lane should change the movement of materials. Every major upgrade should alter at least one observable behavior, with an inspector comparison available when the effect takes time to emerge.

**First test — P1:** Give the player a congested delivery route and tools to improve it. Pass when they notice the resulting change in citizen behavior and can explain why it happened without reading an upgrade description. If an upgrade only changes a hidden percentage, revise its feedback or behavior.

### 2. Several good solutions to the same shortage

A food shortage can be addressed through fields, meal preparation, shorter delivery routes, preservation, labor reassignment, or eventually imports. These solutions must compete through land, time, workers, materials, or dependence. Their suitability depends on the actual cause: another farm will not fix food stranded behind a blocked crossing.

**First test — P1:** Present two different causes of low food. Players should diagnose them and use different remedies. At least two responses should be viable for each scenario. If the same building solves every shortage, revise costs, dependencies, or scenario design.

### 3. Optional ambitions during peaceful periods

Offer attractive projects such as a market courtyard, restored mill, orchard, neighborhood connection, or public bath. Each changes daily life and the appearance of the settlement. Players can postpone or decline these projects while maintaining a healthy city; they are aspirations rather than another stream of emergencies.

**First test — P1:** Offer one courtyard project after basic needs stabilize. It should compete with expansion for land and labor and provide a visible service benefit. Pass when some players pursue it willingly and others choose an equally credible goal. Add more projects only after the first creates voluntary interest.

### 4. Buildings made personal through use

Workshops can support earned extensions, crossroads can become gathering places, and houses that sheltered displaced citizens can retain a small banner. Record simulated events and player choices in restrained visual details. Some recognition can be cosmetic; permanent bonuses for every event would encourage repetitive reward farming.

**First test — VS:** Preserve one building's history across an extension and one civic event. Pass when players recognize its significance later. Keep names, extensions, and commemorations inspectable, and let players decline cosmetic changes.

### 5. Useful spaces inside the packing puzzle

Let an L-shaped kitchen wrap around a garden, storage receive goods through a rear service alley, and houses share a sheltered courtyard. Walkable gaps need actual access and use. Compactness improves travel but can leave insufficient turning, maintenance, evacuation, or expansion space.

**First test — paper placement and P1:** Provide one irregular site and several compatible footprints. Players should produce at least two functioning arrangements with different advantages. If maximum packing is always best, strengthen the benefits of access and flexible space. Keep clearance rules visible before construction.

### 6. Discoveries that change plans

Clearing woodland might reveal an old road; quarry work could uncover a spring; a restored ruin might reveal a building technique or regional route. Each discovery should offer a choice with consequences, such as preserving the spring versus continuing extraction.

Discoveries are generated and saved with the section. They must not silently invalidate a reasonable starting decision or conceal essential survival resources behind a lucky reveal.

**First test — local generation, then P3:** Add one spring discovery with two viable uses. Pass when it changes a player's plan without making them feel their original choice was a trap. Avoid collectible checklists and compulsory excavation of every tile.

### 7. Enemy objectives the player can disrupt

Raiders may seek supplies, a large force may require a camp or crossing, and a creature may be attracted to exposed waste. Observation should reveal these intentions. The player can protect cargo, deny access, intercept scouts, dismantle a camp, prepare alternate deliveries, or strengthen defenses.

Counterplay must carry costs and leave uncertainty. Intercepting scouts can improve warning without guaranteeing that all attacks disappear. Objectives and retreat conditions belong in enemy behavior data and should remain understandable through animation and reports.

**First test — P2:** One supply-seeking enemy can be handled by defended storage or interception along its route. Pass when both approaches work under different town layouts and players can explain the enemy's objective.

### 8. Partial victories and rewarding recovery

Allow attacks to end with a saved population, lost outer workshop, abandoned stockpile, or successful evacuation. Recognize these outcomes through consequences and history rather than a single win/loss score. Preserve enough people, access, and basic supplies to make recovery plausible after a survivable setback.

Recovery priorities include reopening food service, housing displaced people, salvaging materials, clearing important roads, and redesigning the damaged district. Routine repairs should execute through policies and queues.

**First test — P2:** Damage an outer industry while leaving the main town viable. Pass when players identify a recovery order, rebuild differently, and resume elective city improvements. If recovery becomes repeated clicking or a long inevitable decline, adjust salvage, damage scope, and repair controls.

### 9. Useful automation as the island grows

Let mature towns maintain policies such as “keep three days of food,” “export only surplus,” and “request medicine below this reserve.” Capacity still comes from real workers, storage, roads, and connections. Policies need reachable destinations, stock floors, priorities, and visible reasons when they cannot execute.

Unlock or introduce policies as the corresponding infrastructure becomes stable. Start with one reserve rule and one export rule. Prevent circular shipments and repeated aid requests through explicit order state and cooldown or threshold hysteresis.

**First test — P3:** Operate a second settlement while the first maintains reserves and exports. Pass when players can explain what the old town did and return to meaningful decisions without constantly correcting shipments.

### 10. A clear campaign ambition

A proposed campaign direction is restoring a network of old communal works: reservoirs, bridges, harbors, and gathering places. Projects require contributions from specialized towns, accessible routes, labor, and continuing upkeep. They should visibly improve ordinary island life.

Provide alternative project combinations and routes to completion so geography and player preference shape the society. Completing the ambition creates a satisfying milestone and permits continued play. The exact fiction, project count, and victory conditions remain provisional until P3 proves that connected towns are enjoyable.

**First test — P3:** One shared bridge project accepts contributions from two settlements and opens a useful route. Pass when its completion changes trade or migration visibly and players describe why they chose to build it. Expand into a campaign only after this small project works.

### Delivery order and complexity budget

| Stage | Add and test | Keep bounded |
|---|---|---|
| Paper placement / P1 | Visible improvements, alternative shortage remedies, useful irregular spaces, one optional courtyard | Small citizen population, short production chains, few service needs |
| P2 | Disruptable enemy objectives, partial victories, recovery priorities | Two enemy families and one clear attack/recovery cycle |
| Local generation / P3 | One discovery, reserve/export policies, one shared island project | Few sections, limited shipping rules, no full political simulation |
| VS and later | Building history, more ambitions and discoveries, broader campaign projects | Expand only relationships already shown to improve play |

Introduce relationships, waste, culture, maintenance, and neighborhood expectations one at a time. For each addition, observe whether it creates an enjoyable choice, how often it interrupts play, and whether players can explain its effects. Simplify, automate, defer, or remove systems that add recurring chores without worthwhile decisions.

The central peaceful-play question is: **When the town is safe and everyone is fed, does the player still want to rearrange, improve, and expand it?** Ask what they wanted to do next and observe whether they actually pursue it. Stated interest alone is weaker evidence than voluntary play.

These priorities extend the [Mechanic-to-Fun Atlas](MECHANIC_TO_FUN_ATLAS.md); use its feature review template to record outcomes and revise this plan after each test.

---

## Three proof builds before full production

The game should earn its scope in three small proof builds. Each build answers one risky question and keeps previously proven systems intact.

### Proof build 1: Is the city fun without enemies?

This is the first playable. It contains no combat and lasts about 30–45 minutes.

#### Map

- One handcrafted 96×96 plot-cell map.
- Forest, stone, river, fertile ground, slope, and blocked terrain.
- Two credible Hearthhold locations with different spatial advantages.
- One cramped buildable pocket and one open but travel-heavy area.
- Fine-grid harvesting and construction designation.

A handcrafted map comes first because it separates city-design problems from generator problems. Procedural generation begins after the basic spatial loop is enjoyable.

#### Citizens

- 12 starting citizens, growing to roughly 24.
- Needs: food, water, rest, health, and safety.
- Jobs: builder, gatherer, farmer, carrier, cook, craftsperson, and mender.
- Individual names, one visible trait, a home, a workplace, and simple relationships.
- Inspectable current task, destination, carried item, need, and blocking reason.

#### Resources

- Raw: timber, stone, crops, and water.
- Processed: beams, masonry, and meals.
- Flexible reserve: general supplies.
- Civic resource: trust.

Every major material has at least two credible uses. Timber, for example, competes between housing, processing, storage, road improvements, and reserve construction.

#### Buildings and footprints

- Hearthhold: one large irregular civic anchor.
- Two house shapes with different capacity and footprint efficiency.
- Field: paintable growing area rather than a fixed square.
- Water source: terrain-dependent narrow footprint.
- Beamwright: long building with an exterior working yard.
- Stonefold: stepped heavy-industry footprint with a delivery edge.
- Commonpot: compact service building sensitive to housing distance.
- Keepshed: several small shapes rather than one universal warehouse.
- Menders' Nook: small clinic with an upgrade connector.
- Garden, cache, lamp, and drain as useful gap fillers.
- Foot trail, Lane, and Way road widths.

The set must contain enough footprint variety to make rotation, access, compactness, and future expansion meaningful.

#### City-building pressure

- One dry period reduces easy water collection.
- Food spoils slowly without suitable storage.
- Dense housing raises minor illness pressure.
- An arrival event offers four additional citizens before housing is ready.
- A Promise—“No one will be left without shelter”—rewards acceptance but creates a solvable capacity problem.

These are city pressures, not attacks. They prove whether juggling land, work, needs, and commitments is intrinsically enjoyable.

#### Pass criteria

The proof succeeds only if most testers:

1. Continue rearranging or improving the town after meeting basic survival needs.
2. Create visibly different layouts from the same map.
3. Correctly diagnose at least two production or service bottlenecks.
4. Describe one building placement they are proud of.
5. Care about at least one citizen, district, or civic outcome.
6. Want another run even though there is no enemy attack or permanent unlock.

If this build is not fun, do not add combat. Improve placement, logistics, citizen behavior, feedback, and moving bottlenecks first.

### Proof build 2: Does defense deepen the city?

Add a short defensive arc to the same city-building sandbox.

#### Defensive content

- One lookout structure that extends warning time.
- One barrier family with gates and two footprint shapes.
- One supply-consuming ranged defense.
- One staffed responder post drawing workers from the normal economy.
- One shelter using existing food, water, and health services.
- Two enemy families that test different layouts.
- One emergency Mandate funded by trust.

Enemy family A follows easy routes and pressures entrances. Enemy family B targets isolated production or supply infrastructure. Neither should be defeated by statistics alone.

#### Defense sequence

```text
discover tracks or scouts
→ receive a route and behavior forecast
→ choose what to protect
→ produce and deliver supplies
→ reassign a limited number of citizens
→ endure a brief attack
→ inspect the first breach and first shortage
→ rescue, repair, and resume city growth
```

#### Pass criteria

The defense proof succeeds only if:

1. A strong city economy noticeably improves defensive readiness.
2. Defensive preparation creates meaningful economic and spatial sacrifices.
3. Two different city layouts produce different battle stories.
4. Players can explain why enemies chose their routes and targets.
5. At least two defensive plans are viable.
6. Recovery is interesting and does not require rebuilding the entire town.
7. Players spend more total time designing and operating the city than fighting.

### Proof build 3: Does the island create a campaign?

Build a small generated archipelago-style test island with seven sections, of which three can be settled during the test.

Include:

- At least three viable opening sections.
- Deterministic island and local-section seeds.
- Opportunity-and-burden summaries.
- Two credible Hearthhold sites per playable section.
- Section specialization and one inefficient local fallback.
- Migration from the first settlement to the second.
- One material shipment and one disrupted route.
- Summary simulation for the inactive settlement.
- One island-level threat movement.
- The ability to lose and later reclaim one settlement.

#### Pass criteria

The campaign proof succeeds only if:

1. Players disagree constructively about the best opening section.
2. Their selection changes their opening layout and economy.
3. The first settlement remains useful after the second begins.
4. A disrupted connection creates several understandable responses.
5. Players remember which citizens migrated and where they came from.
6. Generated islands pass fairness checks without feeling interchangeable.
7. Players can describe their island's history as a sequence of their own decisions.

### Vertical-slice definition

After all three proofs pass, combine their best pieces into a polished 60–90 minute vertical slice:

- One small generated island.
- Three playable section types.
- One complete settlement tier with roughly 15–18 buildings.
- Three citizen services and two production chains.
- One Promise with multiple legitimate responses.
- Two enemy families and one environmental hazard.
- One migration and trade connection.
- Representative pixel art, sound, interface, save/load, and recovery.

The vertical slice is the first artifact used to estimate full production. Before it exists, feature-count estimates are guesses.

---

## Systems architecture and code organization

The game should be organized around simulation domains and explicit events. Avoid putting all behavior in one “city manager.”

```text
DestinyToYours/
├── design/
│   ├── pillars.md
│   ├── economy.md
│   ├── citizens.md
│   ├── placement.md
│   ├── defense.md
│   ├── island-campaign.md
│   ├── crises.md
│   ├── promises.md
│   └── ui-information-hierarchy.md
├── data/
│   ├── buildings/
│   ├── footprints/
│   ├── resources/
│   ├── jobs/
│   ├── enemies/
│   ├── biomes/
│   ├── crises/
│   └── promises/
├── generation/
│   ├── island/
│   ├── sections/
│   ├── validation/
│   └── random-streams/
├── simulation/
│   ├── clock/
│   ├── grid/
│   ├── terrain/
│   ├── pathfinding/
│   ├── tasks/
│   ├── citizens/
│   ├── logistics/
│   ├── production/
│   ├── needs/
│   ├── settlements/
│   ├── migration/
│   ├── trade/
│   ├── defense/
│   ├── hazards/
│   ├── promises/
│   └── island-summary/
├── presentation/
│   ├── rendering/
│   ├── audio/
│   ├── effects/
│   └── camera/
├── interface/
│   ├── alerts/
│   ├── inspectors/
│   ├── build-menu/
│   ├── overlays/
│   └── reports/
├── save/
├── tests/
└── telemetry/
```

### Simulation rules

- Run the simulation on a fixed tick independent from rendering.
- Keep authoritative state in simulation components, never in UI widgets.
- Use stable entity IDs so saves and event histories remain inspectable.
- Express buildings, resources, recipes, and crises as data where practical.
- Use deterministic random streams with stored seeds for reproducible bugs.
- Maintain a small rolling event history for defeat reports and debugging.
- Test production graphs without rendering.
- Version save files from the first external playtest.

### Placement representation

A building definition should include data rather than hard-coded placement exceptions:

```text
building definition
├── identity and category
├── rotated footprint masks
├── entrance cells
├── delivery cells
├── operating and clearance cells
├── connector and upgrade cells
├── terrain requirements
├── construction stages and costs
├── jobs, inputs, outputs, and storage
├── service range or recipients
├── hazard properties
└── art and feedback references
```

Placement validation should return a collection of precise reasons rather than a single valid/invalid boolean. The interface can then distinguish a hard block from a warning about distance, congestion, flooding, missing road access, or lost upgrade room.

### Generation boundaries

- Generate immutable base geography separately from mutable campaign history.
- Give island shape, climate, hydrology, sections, resources, and events separate deterministic random streams.
- Store generator version and seed in every save.
- Never reroll an already revealed section because the generator changed.
- Validate macro connections before generating local decoration.
- Store the reason for every rejected or repaired candidate.
- Make batch generation runnable without rendering.
- Keep island summaries independent from active-section citizen simulation.

### Citizen task selection

A citizen should choose a task using transparent scoring rather than an opaque global queue.

```text
task score =
    policy priority
  + urgency
  + citizen suitability
  + local need
  - travel cost
  - danger cost
  - interruption cost
```

Important rules:

- Reserve a task when selected so several citizens do not chase the same item.
- Time out or release claims when paths fail.
- Reconsider only on meaningful events, not every frame.
- Let life-threatening needs override work.
- Let emergency policies alter weights rather than directly scripting every citizen.
- Show the winning reason and rejected blockers in the citizen inspector.

Trust in AI comes from consistency and explanation more than brilliance.

### Logistics representation

Every stored resource stack should know:

- Resource type.
- Amount.
- Location.
- Owner or access policy.
- Reserved amount.
- Intended destination, if claimed.
- Freshness or condition, if relevant.
- Danger exposure.

Every production building should expose:

- Required inputs.
- Current input buffer.
- Output buffer.
- Assigned workers.
- Actual attending workers.
- Cycle progress.
- Blocking reason.
- Recent utilization.

This data powers both AI and a useful player inspector.

### Event model

Use domain events such as:

- `ResourceHarvested`
- `ResourceReserved`
- `DeliveryCompleted`
- `ProductionBlocked`
- `CitizenNeedCritical`
- `PromiseKeptTick`
- `PromiseBroken`
- `HazardForecastChanged`
- `BuildingDamaged`
- `CitizenDied`
- `SettlementRecovered`

Events let the UI, audio, telemetry, tutorials, and post-crisis report observe the simulation without becoming embedded inside it.

---

## Information architecture

The player should not face every system at equal volume.

### Persistent top-level information

Always visible:

- Time and current phase.
- Weather / crisis forecast.
- Population and idle labor.
- Critical food and water runway.
- Trust / intervention resource.
- Highest-priority active warning.

### Contextual information

Visible on selection or relevant overlay:

- Full inventories.
- Production recipes and buffers.
- Citizen task reasoning.
- Path costs.
- Land fertility.
- Flood, fire, danger, or defense coverage.
- Housing quality.

### Historical information

Visible in reports:

- Net production over time.
- Cause of deaths.
- Crisis timeline.
- Promise history.
- Bottleneck durations.
- Settlement imports and exports.

### Alert priority

| Priority | Meaning | Presentation |
|---|---|---|
| Critical | Irreversible loss likely in seconds | Sound, screen-edge direction, pause option |
| Urgent | Serious failure likely this phase | Persistent banner and map marker |
| Advisory | Efficiency or future-risk issue | Problem panel, no interrupt |
| Informational | Normal completion or flavor | Event log or small toast |

Never use a critical treatment for routine good news. If every event shouts, no event is heard.

### The “why not?” rule

For every unavailable action, answer why:

- Missing 8 masonry.
- No qualified worker.
- Input is reserved elsewhere.
- Destination is unreachable.
- Storage policy rejects this item.
- Promise forbids this action unless suspended.

Explanations turn friction into planning.

---

## Balance principles

### Tune bottlenecks to move, not vanish

Early play may be constrained by raw labor. Solving labor should reveal hauling. Solving hauling should reveal processing. Solving processing should reveal storage or land. A healthy economy changes its limiting factor as the player improves it.

If every problem is solved by “build more of the same,” depth collapses.

### Preserve slack

Perfect 100% utilization looks efficient but leaves no capacity for surprises. Let experienced players learn to value spare carriers, reserve food, empty beds, and unused trust.

Crises should punish brittleness more than mere smallness.

### Use soft counters before hard counters

A fire-resistant building taking less damage is a soft counter. A special enemy that is literally immune to everything except one late-game tower is a hard counter.

Soft counters allow improvisation. Hard counters often create build-order checks.

### Escalate complexity before magnitude

Prefer:

- A threat that arrives from two directions.
- A wet season that changes travel routes.
- Refugees who increase both labor and consumption.
- A Promise that conflicts with the easiest defense.

Over:

- Enemies with 300% health.
- Buildings that cost 500% more.
- Waiting five times longer.

New relationships produce strategy; larger numbers produce grind.

### Maintain recovery windows

After a crisis, temporarily reduce external pressure and surface the most useful repairs. A player who barely survived should see a path back to stability.

### Suggested tuning targets for early prototypes

These are starting hypotheses, not sacred values:

- A newly issued routine task should be claimed within 1–3 simulation seconds when labor and a path are available.
- The first meaningful building choice should occur within 2 minutes.
- The player should encounter the first understandable bottleneck within 5 minutes.
- The first crisis forecast should arrive early enough for at least two meaningful preparations.
- The first crisis should last long enough for 2–4 interventions, not constant clicking.
- Recovery should reveal damage quickly and restore a sense of agency within 2 minutes.
- No early loss should require more than 15 minutes before the player understands the central mistake.

Measure these in playtests rather than trusting intuition.

---

## Feedback and “game feel” checklist

Simulation games still need responsive game feel.

### Placing a building

- Footprint snaps clearly to the grid.
- Validity colors remain readable for color-blind players.
- Inputs and outputs show directional hints.
- Nearby resource paths can be previewed.
- On click: immediate sound, ground stamp, dust, and assigned-builder indicator.
- Construction visibly moves through stages.
- Completion has a distinct but brief animation and sound.

### Assigning a worker

- The desired count changes instantly.
- The actual count changes only when a citizen transitions.
- A tooltip explains the difference.
- The selected citizen visibly leaves their previous duty.
- The building reports “waiting for worker” until arrival.

### Delivering a resource

- Claimed stacks gain a subtle marker.
- The carrier visibly holds or represents the material.
- The destination buffer updates on arrival, not departure.
- The production building wakes up with motion and sound.
- If delivery fails, the claim clears and the reason enters a low-priority log.

### A crisis forecast

- The environment foreshadows it before a panel does.
- The UI states confidence and time window, not false precision.
- A relevant overlay is one click away.
- Music changes gradually rather than abruptly.

### A structural breach

- Sound communicates direction and severity.
- Screen-edge treatment points toward off-screen danger.
- The game can optionally slow or pause on the first critical breach.
- The failed object shows the cause and recent damage sources.
- Nearby agents visibly change behavior.

### Recovery

- Music releases tension.
- Surviving citizens acknowledge the end.
- Damage is summarized without covering the map.
- Repair and cleanup tasks are grouped intelligently.
- The player can inspect the causal timeline before continuing.

---

## Tutorial structure

Do not teach the entire interface before play.

### Lesson 1: One visible chain

Teach:

```text
mark tree → citizen claims tree → timber moves to site → shelter is built
```

The player learns designation, labor, hauling, and construction through one outcome.

### Lesson 2: One living need

Introduce food and show one citizen’s need changing. Let the player build a field and watch the need resolve.

### Lesson 3: One bottleneck

Temporarily create a full output buffer. Teach the building inspector’s blocking reason and construction of storage.

### Lesson 4: One imperfect forecast

Forecast a small hazard. Let roads, barriers, and supplies each help in visible ways.

### Lesson 5: One meaningful rescue

Give enough trust for one emergency Mandate but present two threatened targets. This teaches the cost and emotional role of direct intervention.

### Lesson 6: Independent play

Offer a Promise and stop directing. Contextual hints should respond only to observed blockers.

---

## Replayability without filler

Replayability comes from recombination, not merely quantity.

### Map grammar

Generate or author maps from strategic ingredients:

- Resource richness versus defensibility.
- Centralized versus distributed water.
- Chokepoints versus open ground.
- Fertile lowlands versus safe highlands.
- Existing roads versus untouched wilderness.
- Ruins that offer capability at a cultural cost.

Each map should ask a different opening question.

### Crisis grammar

Build crises from components:

```text
source + propagation rule + vulnerable systems + warning pattern + aftermath
```

Example:

```text
upstream rain
+ elevation-based water flow
+ low storage and housing
+ rising river and dark clouds
+ mud, spoiled food, displaced citizens
```

Components can recombine, but each combination needs authored validation so it remains fair and legible.

### Promise grammar

Every Promise needs:

- A measurable condition.
- A recurring benefit for keeping it.
- A real temptation to break it.
- A visible constituency that cares.
- A lasting cultural consequence.
- At least two legitimate interpretations or solutions.

### Distinct settlement strategies

Support at least three early viable structures:

1. **Dense civic core:** short routes and strong services, but high hazard concentration.
2. **Distributed hamlets:** resilient to local disasters, but expensive logistics.
3. **Linear trade town:** efficient movement and commerce, but vulnerable chokepoints.

The strategy should change streets and skylines, not merely a bonus icon.

---

## Playtesting and telemetry

### Questions to ask after a session

Avoid “Was it fun?” Ask:

- What were you trying to accomplish before the crisis?
- What first made you feel behind?
- Which loss felt fair? Which felt unexplained?
- When did you change your plan?
- Which citizen or building did you care about most, and why?
- What would you do differently on the same map?
- What would you like to automate now?
- What information did you search for but fail to find?
- Did keeping or breaking the Promise feel like your choice?
- At what moment did you want to stop?

### Events worth recording

- Time to first building, food stability, storage block, and crisis.
- Average and 95th-percentile citizen travel time by job.
- Percentage of work time spent walking, waiting, working, and satisfying needs.
- Duration each production building spends blocked by input, output, labor, power, or path.
- Alert counts and time-to-player-response.
- Trust earned and spent.
- Promise state changes.
- Damage and death causal chains.
- Pause and speed-control usage.
- Session endpoint and state at exit.

### Watch for these warning patterns

- **One dominant opener:** more than 70% of experienced players build the same first sequence regardless of map.
- **Invisible inefficiency:** players sense slowness but cannot identify its source.
- **Alert blindness:** critical messages are dismissed because routine alerts use the same presentation.
- **Intervention spam:** optimal play requires constant Mandate use rather than occasional decisive action.
- **No recovery:** one small early error produces an unrecoverable 30-minute decline.
- **Solved crisis:** one layout defeats every hazard with no tradeoff.
- **Decorative citizens:** players refer only to population numbers and never individuals or groups.

---

## Production roadmap

The roadmap is ordered by design risk. Each phase ends with a playable artifact or a measurable answer, not merely completed code.

### Phase 0: Lock the product rules

Write one-page specifications for:

- City-first design hierarchy.
- Fine-grid placement and footprint masks.
- Citizens and indirect control.
- Logistics and resource ownership.
- Defensive integration rules.
- Island and section hierarchy.
- Visual readability and naming principles.

Also maintain a short “not now” list. Any proposed feature must identify which current proof it helps.

**Exit gate:** the team can explain the game in one sentence, identify its three signature systems, and reject features that conflict with the city-first hierarchy.

### Phase 1: Paper placement prototype

Use a printed or simple digital grid with cutout building shapes.

Test:

- Grid-cell scale.
- Ten to fifteen footprint masks.
- Rotation and mirroring.
- Entrances, delivery cells, yards, and clearance.
- Foot trail, Lane, and Way widths.
- Compactness against firebreak and expansion needs.
- Whether small fillers make awkward gaps satisfying.

Do not implement citizens or final art yet.

**Exit gate:** players voluntarily rearrange districts, produce several credible layouts, and describe placement tradeoffs without prompting.

### Phase 2: Headless economy model

Implement or spreadsheet-test:

- Four raw resources and three processed resources.
- Citizen-hours as the common labor budget.
- Travel-time costs.
- Input reservations and output capacity.
- Food, water, rest, health, and housing consumption.
- Construction and maintenance costs.
- Population growth from 12 to roughly 24.

Run thousands of accelerated simulations with simplified task logic. Tune for moving bottlenecks, recovery windows, and useful reserves.

**Exit gate:** no single resource or job remains the dominant bottleneck throughout a normal session, and at least two economic responses solve each intended shortage.

### Phase 3: Gray-box city simulation

Build Proof 1 with:

- Fixed simulation tick independent from rendering.
- Fine plot-cell world.
- Placement, rotation, demolition, and planning ghosts.
- Foot trails, Lanes, Ways, entrances, and delivery cells.
- Citizens, movement, task scoring, and job targets.
- Physical resource stacks, carrying, storage, and production.
- Construction stages.
- Needs and services.
- One Promise and one arrival event.
- Save/load.
- Debug overlays for paths, claims, reservations, congestion, and blockers.

Use primitive shapes and labels. The goal is to expose bad simulation rules cheaply.

**Exit gate:** Proof 1 passes its city-without-enemies criteria with external testers.

### Phase 4: City readability and feel

Add:

- Inspectors that answer “What, where, and why not?”
- Task, carrying, need, and danger icons.
- Build footprint and route previews.
- Production, service, density, and travel overlays.
- Alert priority levels.
- Construction, delivery, and completion feedback.
- Early representative pixel sprites and building silhouettes.
- Basic sound acknowledgments.
- A short city-history timeline.

**Exit gate:** a new tester correctly explains most shortages and placement problems without developer help, and can visually distinguish every building family at normal zoom.

### Phase 5: Integrated defense proof

Build Proof 2 with:

- Threat forecasting and lookout coverage.
- Barriers, gates, shelter, responder post, and one supplied defense.
- Two enemy behavior families.
- Worker reassignment and emergency priorities.
- Defensive supply production and delivery.
- Evacuation and shelter behavior.
- One trust-funded Mandate.
- Damage, rubble, repair, injury, and recovery.
- A post-attack timeline showing first breach and critical shortages.

Spend more tuning effort on path readability and recovery than on enemy quantity.

**Exit gate:** Proof 2 passes, no universal defensive layout emerges, and the city remains engaging during the long periods between attacks.

### Phase 6: Local procedural section generator

Build the local-map pipeline before the full island generator:

- Deterministic seeds and separate random streams.
- Fine elevation and water.
- Terrain and resource growth.
- Section-edge connections.
- Resource clusters derived from terrain.
- Hearthhold candidate detection.
- Automated reachability and viability checks.
- Generator debug view and rejection reasons.
- Batch generation and screenshot capture for review.

Compare generated sections against the handcrafted Proof 1 map. They should create equally strong but different placement questions.

**Exit gate:** at least 90% of accepted sections meet automated viability rules, and testers choose meaningfully different openings across a review set without one repeated build order dominating.

### Phase 7: Island generator and selection interface

Implement:

- Island silhouette, elevation, climate, hydrology, ecology, and geology.
- Geography-derived section boundaries.
- Section opportunity-and-burden packages.
- Passes, rivers, coasts, and connection graph.
- Island validation and repair.
- Pixel-art survey-map presentation.
- Section comparison and seed sharing.
- Zoom transition from island to local section.

Start with seven sections. A “giant” island is a content and pacing scale reached after the seven-section structure works.

**Exit gate:** testers disagree about the best starting section for understandable reasons and can predict how their choice will affect city layout.

### Phase 8: Three-settlement campaign proof

Build Proof 3 with:

- Settlement specialization.
- Migration preserving citizen identity.
- Material shipments and route capacity.
- Inefficient local fallbacks.
- Active, connected, and distant simulation levels.
- Regional threats and route disruption.
- Persistent Promises and cultural history.
- Settlement loss, refugees, ruins, and reclamation.
- Island event history and causal explanations.

**Exit gate:** the first settlement remains strategically useful, off-screen results are trusted, and players describe a connected island story rather than three isolated scenarios.

### Phase 9: Vertical slice

Polish the combined 60–90 minute experience:

- Representative final pixel-art quality.
- Original building and system names.
- Complete onboarding through one crisis and one migration.
- Music and layered ambient sound.
- Accessibility for color, text, speed, pause, camera, and input.
- Performance budgets for dense cities and large islands.
- Robust saving, loading, seed storage, and version migration.
- Crash reporting and privacy-conscious telemetry.

**Exit gate:** new players can complete the slice without spoken developer instruction, understand why major outcomes occurred, and express interest in continuing the island.

### Phase 10: Strategic breadth

Expand relationships before raw quantity:

- Three or four biome identities.
- Additional building footprint families.
- At least three viable urban forms.
- Three enemy behavior families.
- Two environmental crises.
- Several Promises with different constituencies.
- More regional roles and route types.
- Mid-game civic choices that change building behavior.
- Difficulty settings that alter relationships and forecasting.

Every new biome must change placement, logistics, or services. Every new enemy must test a different city assumption. Every new building must create or resolve a meaningful tradeoff.

**Exit gate:** repeat players voluntarily make different plans across islands and can identify why the seed changed their decisions.

### Phase 11: Full-island scale and optimization

Only after the seven-section proof works:

- Increase supported island size.
- Profile memory, save size, generation time, and pathfinding.
- Stress-test dense fine-grid towns.
- Validate summarized simulation over long campaigns.
- Add campaign pacing for opening, expansion, specialization, setback, and recovery.
- Prevent stable settlements from becoming maintenance chores.
- Add tools for quickly revisiting alerts and shipments across many sections.

**Exit gate:** a large campaign remains understandable, performant, and decision-rich without requiring constant settlement switching.

### Phase 12: Content, polish, and release preparation

Only now broaden:

- Building families and upgrades.
- Citizen traits and relationships.
- Events and island histories.
- Biomes, landmarks, and decorative sets.
- Enemy and crisis combinations.
- Music and ambient variety.
- Tutorials, custom settings, and peaceful play.
- Localization-ready text and UI layouts.
- Mod or scenario support, if technically feasible.
- Balance, performance, compatibility, and long-save testing.

Content should multiply proven relationships, not bury unproven ones.

### Work order inside every phase

Use the same small loop for each feature:

```text
state the player decision
→ identify the opportunity cost
→ build the smallest simulation
→ expose cause and effect
→ playtest without explanation
→ measure behavior and collect stories
→ keep, revise, or cut
```

A feature is not complete when its code runs. It is complete when players understand the decision it creates and that decision improves the larger city loop.

---

## What to copy as a principle—and what not to copy

### Learn from these principles

- Calm planning and urgent pressure can reinforce each other.
- Indirect citizen control becomes engaging when task logic is visible.
- Physical logistics make layout economically meaningful.
- A limited direct-intervention layer keeps the player emotionally present.
- Day/season/campaign loops can support different planning horizons.
- Threats are strongest when they test the normal settlement.
- Failure should produce knowledge.
- Multiple modes let audiences choose their preferred pressure.
- Persistent progress can make individual losses feel worthwhile.
- Small visual and audio acknowledgments make simulations tactile.

### Do not copy these expressions

- The title, logo, terminology, or lore.
- Specific building, spell, enemy, item, or region names.
- Exact resource chains and balance values.
- Pixel art, sprites, sound effects, music, maps, or interface layouts.
- Source code or data obtained without permission.
- Marketing language or distinctive written descriptions.

The goal is not to make “*Rise to Ruins* with renamed assets.” The goal is to understand why its systems generate tension, ownership, mastery, and stories—then build original systems around *Destiny To Yours*’ own fantasy.

---

## Final design test

When evaluating any proposed feature, ask seven questions:

1. **What decision does it create?**<br>
   If the player always uses it when available, it may be an upgrade rather than a choice.

2. **What other system does it touch?**<br>
   Isolated features add complexity without depth.

3. **How does the player see its cause and effect?**<br>
   Hidden improvements do not reliably produce mastery.

4. **How can it fail, and what will that failure teach?**<br>
   Unreadable failure becomes frustration.

5. **What story can happen because it exists?**<br>
   The best city-builder mechanics produce sentences players want to tell afterward.

6. **Is it still interesting without an enemy present?**<br>
   A core city system must create a planning or operational decision before defense reads it.

7. **Does it produce a spatially visible consequence?**<br>
   In this game, a strong strategy should affect footprints, streets, districts, movement, or the use of land.

If a feature cannot answer at least five, cut it or redesign it.

The deepest lesson from *Rise to Ruins* is not “combine city building with tower defense.” It is this:

> **Make the city intrinsically joyful to shape and operate; then let danger expose the strengths, weaknesses, and human meaning of what the player built.**

That loop—extended across a generated island of connected, specialized settlements—is what can keep *Destiny To Yours* compelling for years.

---

## Sources and further reading

### Primary and official *Rise to Ruins* sources

- [Official Steam store page and feature description](https://store.steampowered.com/app/328080/Rise_to_Ruins/)
- [Official Steam announcements](https://steamcommunity.com/app/328080/announcements/)
- [Official Update 2 / achievement and faith notes](https://store.steampowered.com/oldnews/?appgroupname=Rise+to+Ruins&appids=328080&enddate=1767254400&feed=steam_community_announcements)
- [Official Update 1 / magic notes](https://store.steampowered.com/news/posts/?appgroupname=Retro-Pixel+Castles&appids=328080&enddate=1615766599&feed=steam_community_announcements)
- [Official World Update and migration notes](https://store.steampowered.com/news/posts/?appids=328080&enddate=1537106988&feed=steam_community_announcements)
- [Developer’s itch.io devlog](https://rayvolution.itch.io/risetoruins/devlog)
- [SteamDB player-history page](https://steamdb.info/app/328080/charts/)

### Community mechanical references

The wiki is community-authored and can contain outdated details; use it to understand relationships, then verify implementation-sensitive values in the current game build.

- [Quick guide and interface overview](https://rise-to-ruins.fandom.com/wiki/Quick_Guide)
- [Resource chains](https://rise-to-ruins.fandom.com/wiki/Resources)
- [Buildings](https://rise-to-ruins.fandom.com/wiki/Buildings)
- [Walls and pathing](https://rise-to-ruins.fandom.com/wiki/Walls)
- [Corruption](https://rise-to-ruins.fandom.com/wiki/Corruption)
- [Enemies](https://rise-to-ruins.fandom.com/wiki/Enemies)
- [Spells](https://rise-to-ruins.fandom.com/wiki/Spells)
- [Golems](https://rise-to-ruins.fandom.com/wiki/Golems)
- [World map](https://rise-to-ruins.fandom.com/wiki/World_Map)
- [Events](https://rise-to-ruins.fandom.com/wiki/Events)

### Design research

- Robin Hunicke, Marc LeBlanc, and Robert Zubek, [*MDA: A Formal Approach to Game Design and Game Research*](https://www.cs.northwestern.edu/~hunicke/MDA.pdf)
- Penelope Sweetser and Peta Wyeth, [*GameFlow: A Model for Evaluating Player Enjoyment in Games*](https://www.valuesatplay.org/wp-content/uploads/2007/09/sweetser.pdf)
- Penelope Sweetser, Daniel Johnson, and Peta Wyeth, [*Revisiting the GameFlow Model with Detailed Heuristics*](https://ojs.aut.ac.nz/journal-of-creative-technologies/article/download/16/14/)
- Richard Ryan, C. Scott Rigby, and Andrew Przybylski, [*The Motivational Pull of Video Games: A Self-Determination Theory Approach*](https://www.researchgate.net/publication/225998888_The_Motivational_Pull_of_Video_Games_A_Self-Determination_Theory_Approach)
- Andrew Przybylski, C. Scott Rigby, and Richard Ryan, [*A Motivational Model of Video Game Engagement*](https://journals.sagepub.com/doi/pdf/10.1037/a0019440?download=true)
