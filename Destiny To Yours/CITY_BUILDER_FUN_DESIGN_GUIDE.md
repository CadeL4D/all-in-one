# Why *Rise to Ruins* Is Fun — and How *Destiny To Yours* Can Learn From It

> A systems-design reference for building a city-builder with the same *kind* of appeal without copying *Rise to Ruins*' names, art, lore, maps, code, interface, balance values, or exact content.

**Research date:** September 3, 2026<br>
**Purpose:** Explain the small-scale details that make *Rise to Ruins* compelling, map those details to general city-builder design principles, and turn the analysis into an actionable plan for *Destiny To Yours*.

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

### Pillar 1: A settlement is a visible chain of causes

The player should be able to follow a material from landscape to finished purpose. If a system matters, its state and movement should be inspectable.

**Test:** Select any finished object. Can the interface explain where its materials came from, who transported them, and what is blocking its replacement?

### Pillar 2: Calm preparation earns dramatic survival

Construction and crisis use the same space and economy. Peace gives the player time to form a plan; pressure reveals its consequences.

**Test:** Remove the threat system. Does town planning lose an important reason? Remove town planning. Does the threat become impossible or shallow? If either half survives unchanged, the hybrid is insufficiently connected.

### Pillar 3: The player directs; citizens perform

The player sets goals, zones, job limits, routes, and emergency policies. Citizens choose individual tasks. Direct powers exist for exceptional moments.

**Test:** Can the player solve routine work without clicking individuals? Can they still intervene when a beloved citizen or critical chain is in danger?

### Pillar 4: Every failure leaves a usable lesson

Loss should be painful, legible, and generative.

**Test:** After a playtest defeat, ask the player what they will change. A healthy answer names a system or layout. “I guess I needed more stuff” is a warning sign.

### Pillar 5: Growth creates new vulnerability

Population and technology should not be pure power. Density increases disease risk; territory lengthens routes; advanced industry consumes scarce inputs; prestige attracts stronger threats.

**Test:** Is there ever a rational reason to delay growth? If not, expansion may be automatic rather than strategic.

### Pillar 6: Strategies are spatially visible

Players should recognize a food district, defensive funnel, market center, or distributed village by looking at the map.

**Test:** Hide the statistics. Can an experienced player infer what this town is optimized for?

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

Instead of copying corruption and nightly monster waves, use **Convergences**: periodic regional crises created by geography and prior decisions.

Examples:

- A flood follows water channels and tests drainage, storage placement, and evacuation roads.
- A caravan surge tests housing, food reserves, and disease control.
- A political schism divides work preferences and access to civic buildings.
- A wildfire reads wind, dry vegetation, roadbreaks, and water logistics.
- A “destiny storm” temporarily makes spoken civic Promises physically binding.

Each crisis must read the normal city rather than launching a separate minigame.

### Original direct-intervention resource

Replace god spells with **Mandates**. The player accumulates public trust by keeping visible commitments. Trust can fund brief high-authority actions:

- Call an emergency work shift.
- Open private stores to the public.
- Establish a temporary evacuation corridor.
- Rally volunteers to reinforce a failing structure.
- Suspend a Promise—with a lasting trust cost.

This creates the same macro/micro oscillation while fitting a different fantasy.

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

## A practical first playable

The first prototype should prove the emotional loop with very little content.

### Map

- One handcrafted 64×64 or similarly modest tile map.
- Forest, stone, river, fertile ground, blocked terrain.
- One likely settlement basin and two viable alternative starts.
- One narrow crossing and one open approach so layout matters.

### Citizens

- 12 starting citizens.
- Needs: food, water, rest, safety.
- Jobs: builder, gatherer, farmer, carrier, craftsperson, responder.
- Simple individual names and one visible trait each.
- Task-state icon and inspectable current destination.

### Resources

- Raw: timber, stone, crops, water.
- Processed: beams, masonry, meals.
- Emergency: supplies.
- Civic: trust.

### Buildings

- Civic hearth / town center.
- House.
- Field.
- Well or pump.
- Timber yard.
- Mason.
- Kitchen.
- Storehouse.
- Watch post.
- Barrier.
- Clinic or shelter.

Eleven buildings are enough to test a network. Fifty would hide whether the loop works.

### Crisis

Implement one flood or wildfire—whichever best matches the desired identity.

For a flood:

- Water enters from a readable edge or river rise.
- Elevation and drainage determine flow.
- Roads improve evacuation but may channel water.
- Storehouses on low ground risk losing inventory.
- Citizens prioritize themselves unless an emergency policy changes behavior.
- Barriers redirect rather than simply delete water.
- Recovery requires cleanup and replacement of spoiled supplies.

This single crisis tests layout, logistics, reserves, citizen behavior, and intervention.

### Promise

Use one Promise: “No one will be left without shelter.”

- Keeping it generates trust over time.
- Overcrowding stops the gain and raises illness risk.
- Refugees arrive shortly before the crisis.
- Refusing them preserves capacity but breaks the Promise.
- Accepting them creates a difficult, solvable resource problem.

Now the mechanical decision also carries authorship and meaning.

### Definition of success

The prototype succeeds if playtesters:

1. Can explain why the crisis caused the damage it did.
2. Propose a different layout or policy for another run.
3. Care about at least one citizen or visible town outcome.
4. Feel relief when the crisis ends.
5. Voluntarily choose “play again” without an unlock reward.

---

## Systems architecture and code organization

The game should be organized around simulation domains and explicit events. Avoid putting all behavior in one “city manager.”

```text
DestinyToYours/
├── design/
│   ├── pillars.md
│   ├── economy.md
│   ├── citizens.md
│   ├── crises.md
│   ├── promises.md
│   └── ui-information-hierarchy.md
├── data/
│   ├── buildings/
│   ├── resources/
│   ├── jobs/
│   ├── crises/
│   └── promises/
├── simulation/
│   ├── clock/
│   ├── world/
│   ├── pathfinding/
│   ├── tasks/
│   ├── citizens/
│   ├── logistics/
│   ├── production/
│   ├── needs/
│   ├── hazards/
│   └── progression/
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

### Phase 0: Paper and spreadsheet prototypes

Prove:

- Four-resource economy has moving bottlenecks.
- Job allocation creates opportunity costs.
- One crisis reads the normal economy.
- One Promise creates a difficult choice.

Do not produce final art.

### Phase 1: Gray-box simulation

Implement:

- Fixed tick.
- Tile world.
- Resource stacks and reservations.
- Citizen movement and task scoring.
- Construction.
- Four needs.
- Ten or eleven buildings.
- One hazard.
- Save/load.
- Debug overlays for paths, claims, and blockers.

Exit criterion: an internal tester can play the complete prepare–crisis–recover loop twice.

### Phase 2: Readability and trust

Implement:

- Inspectors.
- Blocking reasons.
- Alert priorities.
- Production and hazard overlays.
- Citizen state icons.
- Post-crisis report.
- Input response, sounds, and core effects.

Exit criterion: a new tester can correctly explain the cause of most failures without developer help.

### Phase 3: Strategic variation

Add:

- Two more map structures.
- Two more crises that read different systems.
- Three Promises.
- At least three viable spatial strategies.
- Difficulty modifiers that alter relationships rather than only quantities.

Exit criterion: the same player voluntarily uses different plans across three maps.

### Phase 4: Campaign layer

Add:

- Regional map.
- Migration.
- Specialized settlements.
- Intersettlement shipments.
- Persistent cultural history.
- Loss and recovery rules.

Exit criterion: a mature settlement has a meaningful role after it is locally stable.

### Phase 5: Content and polish

Only now expand:

- Building families.
- Citizen traits.
- Events.
- Biomes.
- Music.
- Visual variety.
- Accessibility.
- Mod or scenario support, if feasible.

Content should multiply proven relationships, not bury unproven ones.

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

When evaluating any proposed feature, ask five questions:

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

If a feature cannot answer at least four, cut it or redesign it.

The deepest lesson from *Rise to Ruins* is not “combine city building with tower defense.” It is this:

> **Build a world where preparation becomes drama, drama exposes the truth of the player’s design, and that truth inspires the next design.**

That loop—not the quantity of buildings—is what can keep *Destiny To Yours* compelling for years.

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
