# Rise to Ruins — Deep Research 03: Villager Simulation & God Powers

**Game:** Rise to Ruins (Steam appid 328080, formerly Retro-Pixel Castles), by RaymondDoerr / SixtyGig Games.
**Scope of this doc:** villager lifecycle, needs/schedule, jobs/assignment, AI/pathfinding, faith & divine powers, morale, difficulty effects on the simulation. Other docs cover overview/modes, buildings/economy, monsters/defense, and presentation.
**Research date:** 2026-09-07. Latest major content patch studied: **Update 2 "Achievement Update" (Aug 2023) + 2b/2c/2d hotfixes** — this is the version that introduced Faith, the Essence Altar, and the Reliquary.

> **DESIGN-VETO FLAG (read first):** Our recreation has two hard vetoes from the user's earlier project:
> **(a) villagers will NOT collide with each other** (no sidestep/avoidance systems), and
> **(b) NO villager hiding/indoor-shelter mechanic.**
> Every place below where RtR's real behavior touches these topics is marked **[VETO-A]** or **[VETO-B]**. Summary of findings: RtR shows **no evidence of unit-unit collision** (villagers freely overlap/stack; only blocking terrain, walls and buildings constrain movement) — consistent with our veto (a). RtR has **no hide-indoors/shelter mechanic at all** — villagers keep working, hauling, and wandering during night raids, sleep only when sleepy, and the community actively complains there is no way to zone villagers away from danger — consistent with our veto (b). RtR is a faithful precedent for both vetoes.

---

## 1. Villager Lifecycle

### 1.1 How villagers arrive

| Channel | Mechanic | Details |
|---|---|---|
| **Initial spawn-in** | Placing the Camp teleports villagers in alongside starting resources | Up to **20 villagers** spawn at camp placement (Update 2 raised from lower); they arrive **pre-equipped with 1 ration + 1 water bottle** and start with **max hunger/thirst**. Starting resources up to 64 incl. food and water. **1-in-50 chance the entire starting population is Catjeets** (cat-people); **1-in-200 chance doggos are included**. (Update 2 notes) |
| **Nomads (immigration)** | The primary growth mechanism | Nomads periodically appear at a random map edge/point and **walk toward the village center; on arrival they convert to villagers**. They show as **blue dots on the minimap**, are fragile, and commonly die to monsters en route — the intended play pattern is for the *player-god* to Recall/Grab them to safety (wiki Quick Guide, Events page). |
| **Nomad spawn rules** | What drives immigration | Nomad amount is based on: **total available housing**, **total free job slots (job slots minus population, regardless of assignment)**, and **total available food/water** (wiki Events). Update 2: overpopulation and high total population now penalize nomad rate more strongly; available water factors in. Nomads spawn **more often on days 1–3** (anti-RNG pity), and **never in the morning of day 1** (they "almost-always arrive Midday day 1"). Upgrading the village center **increases nomad spawn frequency** (Camp & Castles page). Perk "**+1 Nomad Amount**" (Drogcarter's Accumulation). |
| **Births** | Mating → pregnancy → child birth | Villagers **form relationships, take a mate, and move into the same home** automatically when possible; **pregnancy only occurs if both partners have a home** (wiki Villagers). Pregnancy produces a child villager; a console banner announces the mob type born. Divine Blessing spell **guarantees pregnancy on the couple's next coitus**. Children conceived while parents' **combined faith is within 90% of max faith** are **Nephilim** (superior STR/DEX/INT + longer lifespan). |
| **Migration between regions** | Multi-village population flow | **Migration Way Station**: pick a connected world-map region, "Send" **Migratable Villagers**. Requirements: **local population ≥ 15**, and only **young, healthy adults** (no children/elders). Migrants leave the following morning(s); ~a day or two travel. (wiki Migration Way Station) |
| **Purchasing** | Catjeet Laborers | Bought with gold at the Marketplace; **become regular villagers**. (wiki Catjeets, Meshech guide) |
| **Resurrection** | Ghosts → villagers again | Dead villagers sometimes appear as **harmless ghosts at night**, hovering near their corpse; the **Resurrect spell** (500 influence) revives them. Failure chance: a failed resurrection produces a **zombie** instead (this is a documented goal trigger: "Rise From The Grave... tick up even if the resurrection fails, resulting in a zombie"). Resurrected mobs get **max faith instantly**. |

**No vanilla "natural spawn" of villagers** exists beyond the above; population is capped in practice by housing (births), food/water + free jobs (nomads), and map mortality.

### 1.2 Names, traits, personalities

- **Names:** every villager has a random first name from a built-in pool; the pool contains pop-culture names (patch note: "Ellen Page" changed to "Elliot Page" in the villager name list). Village *names* draw from a pool that includes all Patreon backers' names. Hovering a mob shows its name.
- **Stats:** each villager has **Strength, Dexterity, Intelligence** (wiki Villagers) plus **levels** ("Villager Leveled Up" is a tracked event; leveling grants more stat points and more max HP — InDev 11 notes). Stats make some villagers better fighters (STR), workers or survivors; zombies "tend to get more STR than DEX" implying stats are inherited/derived on conversion.
- **Faith:** a per-villager resource/need (see §6) that acts as the closest thing to a "mood/loyalty" stat.
- **Personality traits:** **none found** — no trait/perk system per villager (no "optimist/gourmand" etc.). Individuality = name + STR/DEX/INT + level + faith + species (human/Catjeet/Nephilim) + job + equipment.
- **Species variants:** Humans (default), **Catjeets** (cat-folk, can also be born as "Nephilim Catjeets"), **Nephilim** (blessed/high-faith lineage: longer lifespan, boosted stats).

### 1.3 Aging and death

- **Ages exist: child → adult → elder.** Evidence: God Experience enum lists `GROWING_UP`, `CHILD_BIRTH`, `ELDERS_SHARING_WISDOM`; Update 2 says max influence differs by age (**children give less, elders give more**); "witness an elder die of natural causes (living a 'full life')" grants faith; Migration requires "young, healthy adults, not children or elders"; housing quality increases "energy, health and happiness gains for occupants"; perk "+5% Villager Lifespan" (Jornker's Healthcare) proves a numeric lifespan. Doggos in a player journal "died of old age."
- **Death conditions (all documented):**
  - **Starvation** (hunger at 0) — starvation was explicitly re-added in InDev 11 and remains; "starving" is one of the three canonical need thought-bubbles ("starving, homeless, sleepy").
  - **Thirst** — perk "+10% Maximum Thirst" exists; villagers die of thirst when water supply fails (guide authors report villagers dying of thirst early game).
  - **Monsters** — killed in raids; corpses remain on the map.
  - **Disasters** — meteor shower, lightning storm, hail (regional chip damage), earthquake, **blight** (DoT to villagers; blight survivors can become zombies on death).
  - **Old age** — elders die of natural causes ("full life"); this is coded as a faith-*positive* event for witnesses.
  - **Childbirth (planned-in-code)** — an old changelog states "A slight chance the mother, or mother and child will die during child birth will be added. The chance will be based on the mother's age and health." Current live status unverified → playtest.
  - **Zombie conversion:** a villager (or animal/doggo) **dying while blighted has a chance to rise as a zombie** (chance halved in Update 2). Zombie variants include Child Zombie, Catjeet Zombie, Doggo Zombie; Child Zombie is faster than regular.
- **Corpses & graves:**
  - Corpses lie on the map and **decay slowly** (Update 2: "Mobs now decay 20 times slower"); clicking a corpse or casting **Dissolve** (200 influence) converts it to essence faster; mobs "pop" when dissolved/soul-captured.
  - **Ghosts**: dead villagers spawn harmless ghosts (much more often at night, ×10 for bound ghosts); ghosts hover around their **corpse or vessel** (no longer wander to random buildings); if unbound, a ghost eventually **leaves the map forever**, releasing a burst of essence and dropping **Ghost Dust**.
  - **Reliquary loop (Update 2):** **Occultists** craft Empty Eerie Vessels (1 iron + 1 gold) and, when a villager/doggo dies, walk to the corpse and **capture the soul into a Filled Eerie Vessel**, storing it at the Reliquary — binding the ghost to the area and preserving it for future Resurrection.
  - **Graveyards** are *corruption/drone buildings* (monster spawn points), **not** player-built villager graves. There is no player burial mechanic documented.

### 1.4 Population cap & essence link

- No hard pop cap documented; practical caps = housing (births), nomad supply, food.
- **Every villager raises maximum influence (mana):** original rule **max influence = 40 × living villagers**; Update 2 rewrote this so each villager has a **min/max contribution by type** (children < adults < elders; Nephilim bonus; **Catjeets, golems, animals count too** — domesticated animals +5 each, doggos +20, doofy doggos +50), and the contribution **scales with the villager's current faith** (50% faith = 50% of their potential). Perks modify: "+2 More Influence per Villager" (Divination of Aidos), "+minimum influence," "influence per animal." No absolute cap ("uncorked the influence maximum" — Update 1).

---

## 2. Needs & Daily Schedule

### 2.1 The needs list

| Need | Driven by | Restored by | Failure consequence |
|---|---|---|---|
| **Hunger** | Work raises decay (see 2.2) | Raw food (wild vegetables, cactus, raw meat, eggs — all restore the same, 20 hunger per raw food per 2016 dev math), **Rations (120 hunger, best food)**, Cooked Meat, Boiled Eggs; villagers can carry **1 ration in inventory** | Starvation damage → death; "starving" thought bubble; villagers with low hunger **much less likely to work** (Update 2) |
| **Thirst** | Time + heat | **Wells & fountains** (clean water), **water bottles** (30 drink value, carried in inventory — Bottler building); perk "+10% Maximum Thirst" | Death by thirst; low thirst reduces willingness to work |
| **Sleep / Energy** | Time awake, work | **Sleeping in their house** (sleep animation exists; "when villagers are in their house they are still visible in the GUI" — InDev 11); housing **Quality upgrades increase energy gain** | "Sleepy" thought bubble; presumably sleep-on-the-spot/idle; no collapse mechanic documented |
| **Faith** | God actions witnessed, world events (see §6) | Praying at the **Essence Altar**, housing faith bonuses, witnessing benevolent god acts, mates, doggos, loot boxes, elder deaths, monster kills near them | Low faith = more **panic/confusion**, reduced influence contribution, no Nephilim births; shown as a **red hand icon** over the villager |
| **Health** | Damage, blight, poison, temperature extremes | Passive regen (villager health regenerates fast — InDev 11), **Healing Aura / Regenerate** spells, **Medics** (Clinic bandages/medkits — heal + cure blight/poison), perk "+5% Health Recovery Speed," "+5% Max Health" | Death; low HP reduces willingness to work |
| **Housing (shelter-adjacent)** | Homeless villagers | Houses store food/water and give "happier and more efficient" villagers, **protect from extreme hot/cold**, and replenish energy | "Homeless" thought bubble; no mating without a home; cold/heat vulnerability |
| **Temperature comfort** | Region temp + season + weather | Housing insulation; standing near fire pits (implied) | "Overheating" listed among conditions that make villagers less likely to work (Update 2); cold presumably mirrors |

**Needs presentation:** floating **thought bubbles** follow villagers with dire needs (Update 2 replaced ad-hoc floating icons: "starving, homeless, sleepy" are the canonical three).

### 2.2 Published decay & consumption numbers (dev-verified, 2016 — re-verify in playtest)

Direct quotes from Rayvolution (Steam "Food Strategies?" thread, Apr 2016):

- **Hunger decay:** idle/walking/sleeping/chatting = **1 hunger per 25 s** (baseline). **Working** (actually building/chopping/carrying/refining — *not* travel time), **fighting**, **carrying a resource**, or **pregnant** = **×2 → 1 hunger / 12.5 s**. **Pregnant AND working = ×3 → 1 hunger / 8.3 s**. **Children baseline = 1 hunger / 16.6 s** (but children don't work or get pregnant).
- **Day length:** "**1 full day is roughly 18.3 minutes long**" (real time, at 1× speed) → an idle villager burns ~44 hunger/day ≈ **2+ raw foods/day**; heavily worked populations eat far more (guide rule of thumb ~3 food/villager/day).
- Food values: raw food **20** hunger (all crops identical in 2016; cactus 15/turnip 20/carrot 25 was proposed), **ration 120** (raised from 100 in Update 2; now requires cooked meat + raw vegetable), water bottle **30**.
- Rations/water bottles **decay on the ground**: start spoiling after ~20 in-game hours, fully turned to trash by ~24 h (temperate, dry; rain accelerates).

### 2.3 Time & schedule

- **Time-of-day phases: 6** — the HUD shows a **bar that resets each phase**: Dawn → Morning → Midday → Evening → Dusk → Night (Interface page; InDev 11 originally named them Midnight/Dawn/Morning/Midday/Evening/Dusk). The phase bar is *not* a clock.
- **Calendar:** HUD shows **day, season, year, temperature bar, game speed**. Seasons: **Spring / Summer / Autumn (Fall) / Winter**; **5 days per season** in normal modes, **7 days** in Nightmare (summer/winter) → a "year" ≈ 20 days normal. Winter = farms inactive, surface water freezes, food stockpile test. Region temperature bar marks "very cold / dangerously cold / very hot / dangerously hot."
- **Behavioral schedule:** there is **no fixed work-shift schedule** — villagers work as long as they have jobs, resources and unmet need thresholds allow; they sleep when sleepy (often at night in their house), eat/drink when hungry/thirsty, chat and idle otherwise, pray when assigned as Occultists. Monsters attack at night, which makes night the de-facto danger shift; **villagers are NOT pulled indoors at night** — see §4.3 **[VETO-B]**.
- **Special nights:** **Full moon** (every 7 days in earlier builds; frequency mode-dependent) — monsters stay away unless provoked, essence circles spawn, ghosts appear frequently, region slightly cools. **Blood moon** — blood rain, region overheats, Blood Slimes spawn *inside/near the village*, fire rains, villagers **panic and run around screaming**; ghosts spawn at higher rates. **Eclipse** — replaces midday, constant monster spawns, region very cold.

---

## 3. Jobs & Assignment — how hands-on is it?

**Short answer: entirely hands-off at the individual level.** There is no click-a-villager-and-order. All control is *indirect*, through five levers:

1. **Job counts (Jobs panel, left side):** lists every job type; you set **desired workers per job** with +/- controls (text turns red if desired > available). The panel shows actual workers as **job-colored sprites**; you can even judge how busy each worker is from its sprite's action. Unemployed villagers are listed top-right of the panel. Workers are **self-selected** from the idle pool — you cannot pick *which* villager gets a job (only via job **color overrides** for readability — Update 2 added per-job color picker).
2. **Buildings:** each worker type is hired at a building (Lumberjack→Lumber Shack, etc. — see table). Buildings can be clicked for their own panel; **some buildings accept direct assignment** (guides mention assigning farmers "in the left-hand panel, or by clicking a farm"). Production buildings (Bowyer, Forge, Kitchen...) take **maintain-X / make-Y production orders**.
3. **Harvest designations (Harvest panel, bottom-left, hotkeys 6–9):** brush-paint wood / rock / food-and-water / crystal tiles for harvesting. Villagers harvest designated tiles; they **stop working if storage is full** ("they'll stop working if they don't have anywhere to take it" — dev). Distant designations waste time — villagers walk to the far tile for 1 resource (dev warns this is a classic mistake).
4. **Terrain orders (Terrain panel, bottom-right):** pause building, dismantle/demolish, dig holes, build/upgrade/remove roads, destroy terrain.
5. **God powers:** **Grab** is the only way to physically move an individual villager (drop damage 1–10); **Recall** teleports all villagers/resources in an area home; spells otherwise influence the world, not workers.

Villagers choose their own **targets** within a designation/building: farmers tend their "own" farm first (per-farm assignment only biases priority, "no difference in the big picture" — dev), gatherers prefer nearer tiles implicitly by travel economics, builders converge on construction sites, builders switch to the build AI immediately after dropping a resource (InDev 30d fix to reduce weird task assignment), haulers (Organizers) redistribute resources between storages/buildings.

### 3.1 Job → building mapping (worker types)

| Job | Building | Notes |
|---|---|---|
| Builders (12–26) | Camp / Castle tiers | Build/upgraded buildings; count scales with castle tier |
| Organizers (2–6) | Ancillary | Hauling/logistics: storage↔site redistribution; "the heavy-lifting" job |
| Farmers (2–4) | Farm | Harvest designated wild crops, plant/replant farm plots, water mgmt; farms idle in cold seasons; per-tier +speed |
| Water Masters (2–4) | Water Purifier / Wells / Fountains | Haul dirty water to purifier; distribute clean water to farms/houses/fountains |
| Bottlers (2–3) | Bottler | Refill water bottles |
| Cooks (2–4) | Kitchen | Rations/cooked meat/boiled eggs; slaughter animals (only if pen stays ≥75% populated) |
| Lumberjacks | Lumber Shack | Chop designated trees; +10%/tier speed |
| Miners | Mining Facility | Rock + iron ore; +10%/tier |
| Crystal Harvesters | Crystal Harvestry | Designated crystal; +10%/tier |
| Carpenters | Lumber Mill | Wood→Boards |
| Stone Cutters | Stone Cuttery | Stone→Cut Stone |
| Crystillers | Crystillery | Crystal→Crylithium |
| Fletcher / smiths | Bowyer / Toolsmithy / Armorsmithy / Forge | Ammo, tools, armor, coins |
| Way Makers | Way Maker Shack | Build/upgrade/maintain roads, dig |
| Maintainers (4–8) | Maintenance Building | Repair buildings & roads exclusively |
| Trashers | Landfill / Burner / Processor | Trash collection; burners make energy from trash |
| Medics (2–6) | Clinic | Patrol with guards, heal villagers, cure blight/poison; silk→bandages→medkits |
| Rangers (6–16) | Ranger Lodge | Patrol for monsters, capture wild animals; lodge doubles as their housing; top tier has a bow tower |
| Guards | ~~Barracks~~ (removed; function folded into Ranger Lodge) | Equipped patrol fighters |
| Occultists | **Essence Altar** / **Reliquary** | Pray for essence+faith (altar); craft vessels & capture souls (reliquary) |
| Courier Suppliers (2–4) | Courier Station | Load courier golems for inter-region delivery |
| Traders / tenders | Marketplace / Animal Pen / Clucker Coop | Trade; tend & breed animals |

### 3.2 What you CANNOT do (feel-critical)

- No direct orders to individuals (no "go here," "attack this," "equip this").
- No per-villager schedule or shift editing.
- No job *priority* ordering beyond headcount; no per-villager tool/weapon assignment (villagers **auto-equip weapons/armor found on the ground** — wiki Villagers).
- No zoning (no "keep out" areas) — a frequent community complaint (see §4.3).
- The intended god-level levers are designations, headcounts, buildings, and spells — plus literal picking-up of villagers.

---

## 4. AI & Pathfinding

### 4.1 Navigation

- **Modular utility-ish AI** ("completely new modular AI system for villagers and all future mobs" — InDev 11) with task queue → walk → act → deliver loops; AI auto-resets on old-save load; builders re-task instantly after resource drop (InDev 30d).
- **Terrain:** movement is tile-based; **walls, buildings, water, mountains, forests block** villagers (unlike specters/ghosts which phase through small walls). **Gates** (wood/stone/crylithium) allow **villagers, nomads and golems but not monsters**. Crylithium walls/fences additionally block ghosts/specters; **villagers can walk over Phantom Dart Towers**; fire pits block movement.
- **Roads:** walkable-path upgrades auto-appear on heavily walked tiles ("Paths appear on their own at frequently walked tiles"); speed bonuses: **Dirt path +20%, Log path +40%, Cobble&Log +50%, Cobble&Board +60%, Cut Stone&Board +70%** (vs no road; overall "roughly 50–75% increase on max"); unmaintained roads decay to debris (+10%).
- **Movement speed modifiers:** base speed per mob (unpublished), +road tier, perk **Owen's Pace +5% Movement Speed**, castle-tier **global speed +2%→+15%** (Large Camp→Large Castle), Processor upgrade +global work speed, cold slows/freezes creatures (Cold Aura).

### 4.2 Combat response — fight or flight

- Core rule (InDev 11): **"mobs decide based on their stats, and how many friends or foes are around them if they should fight or run away."** Armed/armored villagers fight better but any villager "can help with the fight, [but is] prone to getting scared and running away" (Reddit). Armor is auto-equipped and takes damage when struck.
- **Panic & Confusion** are first-class AI states with per-source AoE radii: spells cause panic/confusion in villagers near the cast point or affected mobs (Update 2 tuned each: Grab-mobs panics (range ×2), Grab-resources no longer panics, God Wall/God Tower confuse, Meteor/Lightning tuned, Resurrect panics only on zombie failure, Conjure Material can panic, Dissolve may panic, Harvest panics only if the resource spawns *next to* a villager, loot boxes/keys cause wide-area bursts).
- **High faith suppresses panic/confusion** when witnessing god actions — this is faith's main behavioral payoff (Update 2).
- **Medics patrol alongside guards and heal**; rangers patrol for monsters; **"Emergency" icon** appears when a mob is startled (InDev 11).
- Villagers **regenerate health faster** (InDev 11); get **stunned briefly when hit**; have hit/get-hit/attack/sleep/death/flee/hold/face animations.

### 4.3 Night behavior, shelter, and idle behavior — **[VETO-B] critical**

- **RtR has NO hide-indoors mechanic.** Villagers do not retreat indoors at night or during raids. They keep working/hauling even while monsters assault the walls; community posts document villagers *wandering out at night to pick up meteor resources near tower chokepoints* mid-raid, with players begging for "do not enter zones" that don't exist. **[VETO-B confirmed: our no-shelter design matches RtR. Nothing to adapt.]**
- Sleep is **need-driven**, not scheduled: villagers go home to sleep (sleep animation; visible in GUI while inside), children/elderly included; the blood moon "sends hapless villagers running around screaming" — panic fleeing, not sheltering.
- **Idle behaviors:** chatting with other villagers (faith transfer opportunity — see §6), wandering, doggo interaction, drinking at fountains, praying (if assigned), visiting mate (God XP enum: `VISITING_MATE`, `COITUS`, `FINDING_NEW_HOME`, `PATROLLING`, `GUARD_DUTY`, `REDISTRIBUTING_RESOURCES`, `CLEARING_OUT_RESOURCES` are all real AI tasks in the code enum).
- **Carrying capacity:** villagers haul **1 resource per trip** (grab→carry→drop loop); plus an **inventory** of up to **1 ration + 1 water bottle** consumed in place. Organizers/doggos/labor golems exist precisely to shorten haul chains.
- **[VETO-A] collision:** **No unit-unit collision found anywhere** — not in wiki, changelogs, guides, or community posts. Villagers path through each other; the only spatial frictions are terrain/walls/buildings and grab-drop stacking. *(Not explicitly dev-confirmed as "no collision" — flag for playtest confirmation, but there is no evidence of avoidance/sidestep systems, and nothing in the community discourse suggests crowding mechanics.)* **[VETO-A compatible.]**

---

## 5. Faith, Influence & Divine Powers (the god layer)

### 5.1 Resource model — three interlocking meters

1. **Essence** (map resource): green sparks dropped by harvesting/living things dying; physically follow the cursor ("hand") when close; **Influence bar = collected essence**, max = **Σ(per-villager/animal contribution × faith)** — originally 40/villager. Regenerates passively: "Influence gained per tick is now based on a **percentage of maximum influence**" (Update 1); essence collectors store energy for magic buildings; **Essence Altar praying generates free essence piped to a collector**.
2. **Energy** (stored essence in **Essence Collectors**, max 200/tier): powers magical buildings (elemental/static/phantom towers, combobulators, god structures partially). Burners convert trash→energy. Essence collectors can no longer burn crylithium (Update 2).
3. **Faith** (per-villager need, Update 2): see §5.3. **God Experience** is a separate meta-currency (world map chests → perks) earned by play actions (see the enum below), not part of the in-region loop.

### 5.2 The FULL spell/divine-power list (wiki Spells + Update 1/2 changes)

Cast from a 5-slot spell bar (hotkeys 1–5, each slot remappable). Some spells are **channel-hold** (Conjure Essence, Flame). "Maintain" costs **permanently reserve** that much of your *maximum* influence while alive/placed.

**Utility / core**

| Spell | Cost (Influence) | Cooldown | Duration / Radius | Effect |
|---|---|---|---|---|
| **Grab** | 40 base **+1 per 2 ticks beyond 120** (e.g. 130 ticks = 45) | — | — | Telekinetic hand: pick up/drop items, resources, creatures, villagers (drop deals 1–10 dmg); can harvest by dropping; hold-to-continue not allowed (click) |
| **Conjure (Generate) Essence** | 10 (was 5; Update 2 doubled, ×2 yield) | — (channel) | — | Spawn essence from thin air; careful it isn't reabsorbed; ¼ panic range |
| **Conjure Material** | 67 | 0.5 s | — | Spawn a raw material matching surrounding topography |
| **Illuminate** | 100 (was 50; U2 doubled) | 0.5 s | 250 s / r=32 | Long-lived large light source; **raises faith when cast at dusk/night** |
| **Construct** | 1000 | 60 s | 20 s / r=6 | God-assists building construction; resources must already be delivered |
| **Recall** | 200 | 5 s | 17 s / r=8 | Teleport a large group of villagers + resources safely back to the village |
| **Dissolve** | 200 | 4 s | 11 s / r=8 | Dissolve living resources (crystals/wood) and **dead bodies** into essence |
| **Dispel God Structure** | free | — | — | Remove god wall/tower, refunds reserved max influence |
| **Dispel Golem** | free | — | — | Remove any golem (incl. combobulated), refunds reserved max influence |

**Aid**

| Spell | Cost | Cooldown | Duration / Radius | Effect |
|---|---|---|---|---|
| **Divine Blessing** | 1500 | 10 s | — | Bless a villager: **guarantees pregnancy at next coitus** (originally forced Nephilim birth; rebalanced in U2). Perk −10% cost |
| **Harvest** | 800 (raised in U2) | 35 s (perks −1 s/−3 s) | 17 s / r=8 | Auto-harvest region resources, dropped for pickup; can panic if spawning next to a villager; rarely generates trash |
| **Healing Aura** | 400 | 5 s | 17 s / r=8 | Steadily heals all villagers in area |
| **Holy Potatoes** | 700 (raised in U2) | 20 s | 25 s / r=6 | Sprout magic potato food patch |
| **Holy Wood** | 700 (raised in U2) | 20 s | 25 s / r=6 | Sprout wood trees |
| **Mend** | 800 (perk −10%) | 0.5 s | 1020 ticks / r=6 | Repairs golems, buildings, walls (incl. abandoned); puts out building fires |
| **Motivate Land** | 700 | 5 s (perk −0.5 s) | 750 ticks / r=10 | Regrow natural resources; best in spring/autumn/rain, near-useless in winter; heals blighted tiles |
| **Regenerate** | 250 | 0.5 s | 2100 ticks | Heal one creature over time (works on monsters too — careful!) |
| **Resurrect** | 500 | 5 s | — | Revive a visible ghost; **failure = zombie**; success confuses witnesses, failure panics them |

**Defensive**

| Spell | Cost | Maintain | Cooldown | Effect |
|---|---|---|---|---|
| **Charm** | 750 | — | 17 s | Turn a monster against its friends (unreliable, can backfire) |
| **God Tower** | 1000 | 1000 reserved | 5 s (since U2) | Unlimited-ammo magic bow tower; dispellable |
| **God Wall** | 50 → **150 (tripled in U2)** | 50 (reserve scales) | — | Blocks all monsters incl. specters; dispellable |
| **Summon Holy Golem** | 500 | 500 reserved | 15 s (cast 3.3 s) | Tanky holy defender; **strength scales with village age**; fights to the death |

**Offensive**

| Spell | Cost | Cooldown | Duration / Radius | Effect |
|---|---|---|---|---|
| **Banish** | 500 | 5 s | 17 s / r=8 | Teleport enemies to a random far location; confuses friendlies near the *banished mob* |
| **Cold Aura** | 400 | 10 s | 85 s / r=9 | Extreme cold: slows and freezes creatures; lowers region temp |
| **Earthquake** | 2000 | 60 s | 25 s / r=32 | Damage everything; spawns rock (best over harvested rocky ground) |
| **Flame** | 5 | — (channel) | 0.5 s / r=3 | Ignite area/creatures; tiny region temp rise |
| **Lightning Bolt** | 100 | 0.3 s | — | Zap a creature; weak near lightning rods (rods convert strikes to energy+faith) |
| **Magic Bolts** | 100 | 0.3 s | — | Energy-ball attack |
| **Meteor** | 200 | 0.5 s | — | Drop a flaming rock; occasionally a **Fire Elemental** instead; heats region briefly |
| **Comet** (Update 2 disaster-spell) | — | — | — | Huge ice comet, catastrophic damage + digs a deep crater |

**Unlock order / progression:** spells are **not purchased or unlocked by god level** — the spell bar holds 5 at a time and **the player swaps which spells are equipped**; the wiki's older pages describe god-level gating of powers in very early builds, but the live game gates power by **influence economy** (max influence scales with population/faith) and by **faith side-effects**, not by skill trees. God Experience → chests → **perks** is the meta-progression that buffs spells (cost, cooldown, radius, golem levels).

### 5.3 Faith — exact mechanics (Update 2, dev changelog)

**Faith is a villager need.** Villagers gain/lose faith "based on your and the world's actions. Anything they deem positive, they'll gain faith, negative, they lose it."

Faith **gains**:
- **Praying at the Essence Altar** (assigned Occultists): completing a pray action raises the praiser's faith **and nearby villagers' faith**, and generates **free essence sent to an Essence Collector**. Update 2d buff: a pray action now yields **3 essence ×3 = 9 essence** (was 2×2=4). Perks raise praying speed.
- Witnessing: monster killed (+), villager killed (−), **elder dying naturally = bonus** ("full life"), lood boxes opened (+), grabbing resources (+), grabbing mobs (−), **Illuminate at night** (+), lightning hitting a rod (+), meteor/lightning strikes judged by what they hit (±).
- Social: chatting with a much-higher-faith villager (+), **taking a mate or domesticating a doggo = +10 faith**, mating (nearby villagers tiny +), **Nephilim conceived when parents' combined faith ≥ 90% of max**.
- Housing: **Standard and Quality upgrades grant faith bonuses** (high-quality housing "generates faith every visit" per player reports).
- **Resurrected mobs = instant max faith.** Loot box circles poked = tiny faith + confusion.

Faith **effects**:
- **High faith → villagers less likely to panic/be confused** when witnessing god actions (the flagship behavior).
- **Faith scales influence contribution** of every villager (50% faith = 50% of their max-influence value).
- **High-faith couples conceive Nephilim** (superior stats + long lifespan).
- Low faith indicator: red hand icon over the villager.
- "Wiser Elders" perk also boosts faith sharing (elder chatting).
- Faith decay rates exist and were "adjusted for all villagers" (rates unpublished).

**Deity differences: NONE.** There is a single unnamed god (the player); no god/deity selection. "God Dust" is just salvage from destroyed god buildings (sellable to Catjeets). The flavor "gods" on the World Map are **perk names** (e.g., "Alatha's Invigoration") — cosmetic naming only.

### 5.4 God Experience (meta) — what generates it

From the game's own enum (leaked on the wiki via Discord): nomads joining, buildings constructed/upgraded/dismantled, walls built/dismantled, casting spells, grabbing creatures/resources, surviving villagers, village size, monsters killed, villager leveled up, **child birth**, buying resources, hiring laborers, **elders sharing wisdom**, clearing roads, combat, topography clearing, harvesting, farming, tending farms, **coitus**, repairing buildings/roads, building roads, deliveries (construction/courier/road), digging holes, equipping resources, **finding new home**, **growing up**, patrolling, guard duty, healing villagers, migrants departing/preparing, redistributing resources, refining, selling, storing, **visiting mate**, domestication, destroying roads, planting crops, villagers impregnated. (Some entries are legacy; current split: goals award God XP, chests cost God XP and grant perks.)

### 5.5 Perks (World-Map meta-buffs) — villager-relevant examples

+2% Medic Work Speed; **+1 Villager Cold Resistance**; **+1 Efficient Housing** (Alendru's Accomodation / Shelter of Cingularis); −5% Energy Decay; **+2 More Influence per Villager**; **+1 Nomad Amount**; **+5% Fertility** (Embrace of Spritus); **+5% Villager Lifespan**; **+5% Health Recovery Speed**; **+10% Maximum Thirst**; **+5% Movement Speed**; +5% Max Health; +5% Melee / +5–10% Ranged Damage; +10% Damage Resistance; −10% God Wall cast; −10% Divine Blessing cost; −10% Mend cost; −10% Conjure Material cost; Illuminate radius +1/+2; Holy Potatoes +1 s; Harvest cooldown −1/−3 s; Motivate Land cooldown −0.5 s; Labor Golem +1 level; +2% Harvesting Speed; +4% Road Construction. Perk rarity was removed (Update 1) — all perks equally likely.

---

## 6. Happiness / Morale

There is **no dedicated happiness stat** with a visible meter. Morale is expressed through:

1. **Faith** (per-villager) — the de-facto mood system: gates panic/confusion, Nephilim conception, influence contribution. See §5.3.
2. **Housing quality → "happiness"**: Housing has three upgrade paths — **Occupancy** (capacity), **Standard** (mix), **Quality** ("increases energy, health **and happiness gains** for its occupants" — wiki Buildings). A guide confirms a house "makes them happier and more efficient and protects them from extreme hot and cold."
3. **Behavioral proxies**: happiness presumably feeds the "less likely to work when condition compromised" rule (Update 2); panic/confusion are the *negative* morale states; thought bubbles are the visible symptom layer (starving/homeless/sleepy).
4. **Panic & Confusion** (temporary morale states): triggered by god powers, disasters, deaths nearby, loot-box openings; suppressed by high faith; they interrupt work and cause scattered fleeing (with flee-target failure now crash-fixed).

**Design takeaway:** RtR collapses "happiness" into (a) faith toward the god and (b) comfort from housing — both with concrete mechanical outputs rather than a global percentage.

---

## 7. Difficulty's Effect on the Simulation (brief — cross-ref overview doc)

| Mode | Simulation deltas |
|---|---|
| **Peaceful** | No monster spawns (all other sim unchanged) |
| **Traditional** | Monsters from night 2, fewer; recommended learning mode |
| **Survival** (default) | Monsters from night 1 |
| **Nightmare** | Monsters present at start, higher spawn rates; **summer/winter 7 days instead of 5**; full moons less frequent |
| **Custom** | Per-parameter difficulty settings |
| **Sandbox** | Time-of-day control, direct resource spawning (useful for balancing our sim!) |

Difficulty is chosen per region on the World Map; progress is per-mode. Needs/faith mechanics are identical across modes; difficulty mostly scales *external pressure*, not villager metabolism.

---

## 8. Unknown — needs video/playtest reference

The wiki is substantially "Under Construction" and does not publish:
- **Current (1.0/Update 2) day length & phase durations** — the 18.3-min day is a **2016 dev quote**; confirm against a current video (day/season length may have been retuned; Nightmare's 7-day seasons are from wiki Game modes).
- **Exact hunger/thirst/energy/faith decay constants** in the live build (2016 hunger math is dev-quoted but pre-1.0).
- **Base villager movement speed** (tiles/sec) and whether speed differs by age/sex/species.
- **Villager-unit collision** — no evidence of any exists anywhere; confirm via playtest that villagers truly overlap freely. **[VETO-A]**
- **Lifespan numbers** (child→adult→elder thresholds, elder death age, child work rules — do children work in the live game? They did in 2016; current child behavior undocumented).
- **Pregnancy duration (in-game days), mating frequency, twin/chance rules** beyond Divine Blessing/Nephilim conditions.
- **Carrying capacity** — 1-item-per-trip is implied but not pinned; stack limits unknown.
- **Whether villagers still auto-equip gear in Update 2 era**, and stat formulas for STR/DEX/INT effects (work speed? combat? both?).
- **Essence Altar placement rules/cost**, Occultist job UI, praying animation cadence (Update 2-era building absent from wiki's building list).
- **Exact panic/confusion radii and durations** per event.
- **Childbirth mortality** — coded statement (2016-era changelog) vs live behavior.
- **Ghost spawn rates** and Resurrect success probability.
- **Whether max-influence per villager still includes the 40 baseline** or is fully type-based now.

---

## 9. Confidence & Gaps

**High confidence** (dev changelog, wiki, or dev forum quotes):
- Faith system & Essence Altar mechanics (official Update 2 changelog, quoted extensively).
- Full spell list with costs/cooldowns/durations/radii (wiki Spells, cross-checked vs Update 1/2 notes).
- Influence = 40/villager base, maintenance-reservation spells, faith scaling (changelog).
- Hunger decay math & 18.3-min day *for the 2016 build* (direct dev quote).
- Nomad rules, migration rules (≥15 pop, adults only), mating/home rules, Nephilim rules.
- Fight-or-flight AI, panic/confusion system, no-shelter reality, roads speeds, gate/wall pass rules.

**Medium confidence:** housing upgrade paths (v29 wiki page, possibly superseded by Update 2 art), guard vs ranger job consolidation, trash-slime ecosystem pressure on villagers, some perk values (wiki disclaims "actual values may vary").

**Low confidence / stale:** 2016-era numbers (day length, hunger) vs Update 2 live build; wiki Villagers page is a stub and may omit newer systems (e.g., Essence Altar is absent from the wiki's Buildings list entirely — discovered only via changelogs/Reddit).

---

## 10. MEDIA INVENTORY (reference only — developer copyright; do NOT download/redistribute)

Wiki images that document villager/simulation behavior (file pages on rise-to-ruins.fandom.com):

| Image (wiki File page) | What it documents |
|---|---|
| `File:UI pop.png` | Population panel: total pop, housed vs capacity, guards, ancillary count, building count vs limit, **children count** |
| `File:Top_panel.png` | Inventory/spell bar incl. **essence/influence meter** |
| `File:InDev-2018-01-05-4 - Copy.jpg` | Weather/time panel: temperature half-circle, season, day, year, **time-of-day phase bar** |
| `File:JobsPanel.png` | Jobs panel: desired vs actual workers, job-colored worker sprites, unemployed list — core evidence of hands-off assignment |
| `File:ConstructionPanel.png`, `File:HarvestPanel.png`, `File:TerrainPanel.png` | Designation/order UI (the player's only "commands") |
| `File:EssenceBar.png` | Influence bar (Essence page) |
| `File:SpellGrab.png` … `File:SpellStorm.png` (one per spell on the Spells page) | Spell iconography matching each row of §5.2 |
| `File:Send them.JPG` | Migration Way Station "send migrants" dialog |
| `File:GameModes.png` | Difficulty mode selection screen |
| `File:RTRPERKS.png` | Perk list (outdated values, layout reference) |
| `File:Path1.png`–`File:Path5.png` | Road tier visuals (+speed per tier) |
| `File:Castle1.png`–`File:Castle15.png` | Village-center tier progression (nomad frequency & builder count drivers) |
| `File:RiseToRuinsControls-0.jpg` | Default control sheet (Grab/spell hotkeys) |
| `File:Roggo golem.png` | Rare "doggo golem" variant (charm/life detail) |
| `File:Cactus.png` | Wild food example (harvest designation) |

Non-wiki media worth referencing: Steam guide screenshots in "Rise to Ruins Beginner's Guide [InDev 33]" (base layouts with villager flows) and "Rise To Ruins, Fall To Greatness" (blood-moon panic narrative, doggo life cycle).

---

## 11. Sources

**Wiki (rise-to-ruins.fandom.com)** — fetched via MediaWiki API:
- /wiki/Villagers, /wiki/Friendlies, /wiki/Essence, /wiki/Spells, /wiki/God_Energy, /wiki/God_Experience, /wiki/Perks, /wiki/Bonuses_from_chests, /wiki/Events, /wiki/Blood_Moon, /wiki/Game_modes, /wiki/Interface, /wiki/Quick_Guide, /wiki/Camp_and_Castles, /wiki/Buildings, /wiki/Housing, /wiki/Ancillary, /wiki/Migration_Way_Station, /wiki/Graveyard, /wiki/Limbo, /wiki/Roads, /wiki/Walls, /wiki/Courier_Station, /wiki/Ranger_Lodge, /wiki/Kitchen, /wiki/Clinic, /wiki/Bottler, /wiki/Ration, /wiki/Water_Bottle, /wiki/Small_Fountain, /wiki/Fire_Pit, /wiki/Essence_Collector, /wiki/Golems, /wiki/Catjeets, /wiki/Drones, /wiki/Trash, /wiki/InDev_10, /wiki/InDev_11, /wiki/InDev_30d, /wiki/Updates

**Official patch notes (Steam news API / store announcements):**
- Update 2 — The Achievement Update (faith & influence system, Reliquary, occultists, panic/confusion, housing faith bonuses): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/5141475722335280139
- Update 2d changelog (pray action = 9 essence): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/5219165352617858654
- Update 1 — The Magic Update (spell overhaul, maintain-reserve influence, Nephilim): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/2698159409986043288
- Release 1 announcement: https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/3051677487687038014

**Steam guides:**
- Meshech, "Rise to Ruins Beginner's Guide [InDev 33]": https://steamcommunity.com/sharedfiles/filedetails/?id=1733202053
- "Rise To Ruins, Fall To Greatness": https://steamcommunity.com/sharedfiles/filedetails/?id=1441708556

**Reddit (r/risetoruins):**
- "The Faith Mechanic" thread (faith gating spells, altar prayer, HQ housing faith, occult shrine): https://www.reddit.com/r/risetoruins/comments/17rlefr/the_faith_mechanic/
- "Faith Mechanics" update thread incl. TL;DR by u/BenLaramie: https://www.reddit.com/r/risetoruins/comments/tqytmz/
- "Not understanding the Villager AI" (fight-or-flight reality): https://www.reddit.com/r/risetoruins/comments/uieu0i/
- Zoning complaint (no shelter/keep-out zones): https://www.reddit.com/r/risetoruins/comments/tqytmz/ (NorbeeNorbee comment)

**Dev forum quotes:**
- Rayvolution, "Food Strategies?" Steam discussion (hunger decay rates, 18.3-min day, storage halt rule, mating/downtime): https://steamcommunity.com/app/328080/discussions/0/365163686071866277/
