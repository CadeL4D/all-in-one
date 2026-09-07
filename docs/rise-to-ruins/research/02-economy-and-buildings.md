# Rise to Ruins — Economy & Buildings Deep Dive (02)

**Game:** Rise to Ruins (Steam appid 328080), pixel-art village-builder / god-game / tower-defense hybrid.
**Scope of this doc:** resources, storage rules, every building (costs / tiers / workers / HP / behavior), economy loops, placement & terrain rules, roads, build-order meta. Companion docs cover overview/modes, villager AI, monsters/defense, presentation.
**Compiled:** 2026-09-07.

---

## 0. Version caveat (read first)

- The live game's last public patch per the Steam news feed is **Update 2d (Sep 2023)** ("Even More Minor Fixes and Balance Update"); before it "Update 2 — The Achievement Update" (Aug 2023, billed "largest update in the game's history") and "Update 1 — The Magic Update". Development has been quiet since. Wiki pages describing Ancillaries, Camp/Castle tiers, Clucker Coops, Courier Stations, the trash system and multi-village world map all reflect this current build.
- The wiki's main **Buildings** page still contains stale InDev-29-era (2018) descriptions (e.g., "Small Farm removed in version 29", "Housing upgraded along 3 paths Occupancy/Standard/Quality"). Its **tile sizes** are probably still valid but should be verified in-game.
- Many wiki building pages are stubs or contain template placeholder values (`HP = 1234/2345/3456`, costs of `999`). **Placeholders are explicitly labeled below and excluded from the "confirmed" numbers.** Everything not published anywhere is in [§9 Unknown](#9-unknown--needs-videoplaytest-reference).
- Highest-confidence data comes from pages someone filled in from the live game: Camp and Castles, Ancillary, Kitchen, Clinic, Bowyer, Animal Pen, Doggo House, all 10 towers, Roads, fountains, storage buildings Crystal/Equipment, item/food pages.

Primary sources: [rise-to-ruins.fandom.com wiki](https://rise-to-ruins.fandom.com) (raw wikitext pulled via the Fandom API), [Meshech's Steam beginner guide](https://steamcommunity.com/sharedfiles/filedetails/?id=1733202053), [Steam "Food Strategies" thread with dev-posted hunger math](https://steamcommunity.com/app/328080/discussions/0/365163686071866277/), [bernar.do corruption playthrough](https://bernar.do/beating-the-corruption-in-rise-to-ruins).

---

## 1. Economy model overview (how the machine works)

- **One big resource pool, physically stored in buildings.** Every building has a small local `MaxStorage` (listed per building below). The top UI bar shows your **global totals** of every resource ("Inventory and Spells panel"), plus gold coins, clean water, and energy stored in essence collectors ([Interface](https://rise-to-ruins.fandom.com/wiki/Interface)).
- **Hauling:** villagers carry what they harvest; **Organizers** (employed at Ancillaries) and **Doggos** additionally move resources to storage / to where they are needed ("redistributing resources" is a tracked villager activity). Harvesters **stop working when no storage space is left** (dev note in the Food Strategies thread).
- **Caps:** the resources tab lets you set per-resource maintain/cap thresholds (the Steam guide's "set caps in the resources tab"). Craft buildings (bowyer, tumbler, forge, kitchen, clinic…) work on **"maintain N"** thresholds you configure per item rather than continuous rates.
- **Build limit:** the number of buildings is capped by village-center tier (8 → 86, table below); **walls (fences) do not count** toward the limit, **gates do**. Ancillaries raise the limit further and each has its own allowed count per center tier ("Ancillary Max" column).
- **Build range:** your village center emits a build range (32 tiles at tier 1, up to 60). Fire Pits extend range cheaply. Ancillaries have their own range (20→28). Per a community playthrough, building range does not project through walls.
- **Villagers are the bottleneck for everything:** every job (builder, farmer, water master, lumberjack, miner, organizer, cook, fletcher, …) is a villager; population grows via **nomads** arriving on the map (escort/recall them), births (housed couples), or **hiring Catjeet Laborers with gold** (1200–1750 gold each).
- **Essence/influence:** max influence = **40 × villagers alive** (wiki Essence page; a chest perk modifies the per-villager value). Essence is spent on spells; essence collectors convert/map-store it as **energy** for magic buildings.

---

## 2. Resource table

Sources: [Resources](https://rise-to-ruins.fandom.com/wiki/Resources), [Items](https://rise-to-ruins.fandom.com/wiki/Items), [Raw Vegetable](https://rise-to-ruins.fandom.com/wiki/Raw_Vegetable), [Raw Meat](https://rise-to-ruins.fandom.com/wiki/Raw_Meat), [Cooked Meat](https://rise-to-ruins.fandom.com/wiki/Cooked_Meat), [Ration](https://rise-to-ruins.fandom.com/wiki/Ration), [Water Bottle](https://rise-to-ruins.fandom.com/wiki/Water_Bottle), [Essence](https://rise-to-ruins.fandom.com/wiki/Essence), [Trash](https://rise-to-ruins.fandom.com/wiki/Trash).

### 2.1 Raw resources (harvested from the world)

| Resource | How obtained | Consumed by / used for | Notes |
|---|---|---|---|
| **Wood** | Lumber Shack workers chop designated trees (or God Grab/harvest spells) | Almost all construction; Boards; Bowyer (bows, quivers, ballistae bolts); Burner fuel? | Rare **Silk** drop while harvesting wood |
| **Rock** | Mining Facility workers mine designated rock tiles | Most construction; Cut Stone; Tumbler (stone balls) | Rare **Iron Ore** and **Gold Ore** drops from some rock tiles |
| **Raw Vegetable** (food value **25**) | Farmers harvest wild plants (harvest-food designation), grow on Farms; Holy Potatoes/Motivate Land spells; Marketplace; imports from other villages | Villager/animal food; Rations (with Cooked Meat); feeding animals | ~3/day eaten by idle villager, ~3–6 working, ~4 children, ~1 Clucker, ~2 other animals |
| **Crystal** | Crystal Harvestry workers mine designated crystal | Some construction (every tower needs some); Crylithium | — |
| **Dirty Water Bucket** | Water Masters scoop from marked water tiles (lakes/rivers/sea) | Water Purifier input; Animal Pens; Farms (they accept dirty water if clean unavailable) | Water freezes in winter — cannot be harvested when frozen |
| **Silk** | Rare drop when harvesting wood | Clinic: Bandages, Medkits; Bowyer: Bows (1 wood + 1 silk) | — |
| **Iron Ore** | Rare drop when mining rock | Forge → Iron Ingot | — |
| **Gold Ore** | Rare drop when mining rock; lootboxes | Forge → Gold Ingot | — |
| **Wild animals** (Clucker, Beefalo, Entler, Rous, Doggo, Doofy Doggo) | Spawn at "Animal Habitats" (uncorrupted area with water tile + wild plant + resource node); Rangers tame & deliver | Clucker→Eggs+Feathers+meat; Beefalo→meat+Leather; Entler→meat+Wood(!); Rous→meat only; Doggos = village helpers | Butcher yields Raw Meat: Rous 16, Beefalo 13–14, Entler 11–12, Clucker unknown |

### 2.2 Refined / processed resources

| Resource | Made at (input) | Used for |
|---|---|---|
| **Board** | Lumber Mill (wood) | Construction tier 2+, Way Maker roads (cobble+board) |
| **Cut Stone** | Stone Cuttery (rock) | Construction tier 2+, curtain walls, best roads, fountains |
| **Crylithium** | Crystillery (crystal) | Top-tier construction (crylithium walls, tower tier 4), crylithium wall |
| **Clean Water (Water Bucket)** | Water Purifier (dirty bucket), Well (slow passive fill), Rain Catcher (when raining) | Drinking at fountains, Bottler, farms, animal pens |
| **Iron Ingot** | Forge (iron ore) | Construction tier 3+, Toolsmithy, Armorsmithy |
| **Gold Ingot** | Forge (gold ore) | Only used to mint Gold Coins |
| **Gold Coin Sack** | Forge (gold ingots) or selling at Marketplace | Currency: buy resources/equipment, Suspicious Keys, hire Catjeet Laborers (1200–1750) |
| **Ballistae Bolts** | Bowyer (wood) | Ammo: **Bow Tower 20 shots/bolt, Ballista Tower 10 shots/bolt** |
| **Stone Balls** | Tumbler (rock) | Ammo: **Sling 10, Bullet 100, Spray 300 shots per ball** |
| **Ration** (food value **120**) | Kitchen (1 Raw Vegetable + 1 Cooked Meat) | Best food; carried in villager inventory; ~2 days to eat one (48h) |
| **Cooked Meat** (food value **80**) | Kitchen (Raw Meat) | Food; Ration ingredient |
| **Boiled Egg** (food value ?) | Kitchen (Egg) | Food |
| **Water Bottle** (drink value **30**) | Bottler (clean water) | Carried drink; tier bonuses -10%/-20% refine time |
| **Bandage / Medkit** | Clinic (silk) | Medic healing; medkit equipped per-medic |
| **Bow (200 uses) / Quiver (40 arrows)** | Bowyer (wood+silk / wood+feather) | Ranged villager/guard equipment |
| **Wood Sword, Iron Sword** | Toolsmithy (board / iron ingot) | Melee equipment |
| **Iron Chest / Helmet / Shield** | Armorsmithy (iron) | Armor; leather gear only from lootboxes/market/monster drops |
| **Tools: Pickaxe, Axe, Hoe, Shovel, Hammer** | Toolsmithy (iron); or bought from Catjeet | **300 uses; halve the final work-tick count** after bonuses (dev: 100-tick rock → 50 with tool) |
| **Trash** (Woody/Rocky/Crystally/Organicy) | Decaying items, working ground | → Processor → **Trashy Trash** → Burner (**→ Essence**) or Cube-E Golem → **Trashy Cube** → Burner / Trash buildings / Landfill |
| **God Dust** | Destroying **God buildings** (must be destroyed by damage; Dispel yields none) | Sell to Catjeet Provisioners (achievement "The Dust Must Flow!") |
| **Suspicious Key** | Random magic circles; Marketplace | Opens **Lootboxes** (ammo, food, armor, tools, trash, gold ore, silk) |

### 2.3 Ground decay & food-spoilage rules (confirmed)

- Any food item lying on the ground starts darkening after **~20h in-game**, and **by 24h 100% has decayed** (into Organicy Trash) at temperate/dry conditions. Rain accelerates decay. Applies to Raw Meat, Cooked Meat, Rations; Water Bottles decay into Trashy Trash the same way.
- Uncollected ground resources in general rot into trash; heavy trash spawns **Trash Slimes** (guide warning: "overproducing food breeds Trash Slimes").
- Storage rule of thumb from guides: keep raw stocks capped; convert to Rations for winter (kitchen output doesn't decay in storage).

---

## 3. Village center — Camp → Castle (the spine of the economy)

Source: [Camp and Castles](https://rise-to-ruins.fandom.com/wiki/Camp_and_Castles) (full 15-tier table, high confidence). Placed at world start for 6 wood + 6 rock (provided free with starting villagers). Emits **build range**, provides **builders** jobs, storage, and scales **max buildings**, **ancillary allowance**, and passive bonuses. Each tier adds **+1% global work speed and +2% build speed** over the previous. Upgrading increases nomad spawn frequency. Corruption Resistance 3, Desirability 2 at all tiers. Stores everything except Water Bucket, Dirty Water Bucket, Suspicious Key. Caps at tier 15.

| Tier | Name | Upgrade cost | HP | Builders | Range | Storage | Global/Build bonus | Max buildings | Ancillary max |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Camp | 6 wood, 6 rock (initial) | 1195 | 12 | 32 | 20 | — | 8 | 1 |
| 2 | Large Camp | 6 wood, 6 rock | 1945 | 13 | 34 | 30 | 2% / 4% | 12 | 2 |
| 3 | Small Settlement | 12 wood, 12 rock | 2140 | 14 | 36 | 40 | 3% / 6% | 16 | 3 |
| 4 | Large Settlement | 18 wood, 18 rock | 2320 | 15 | 38 | 50 | 4% / 8% | 20 | 4 |
| 5 | Village Center | 8 wood, 8 rock, 8 board | 2440 | 16 | 40 | 60 | 5% / 10% | 26 | 5 |
| 6 | Large Village Center | 14 wood, 14 rock, 8 board | 2620 | 17 | 42 | 70 | 6% / 12% | 32 | 6 |
| 7 | Established Village Center | 8 wood, 8 rock, 8 board, 8 cut stone | 2780 | 18 | 44 | 80 | 7% / 14% | 38 | 7 |
| 8 | Small Keep | 18 wood, 18 rock, 8 board, 8 cut stone | 3040 | 19 | 46 | 90 | 8% / 16% | 44 | 8 |
| 9 | Large Keep | 38 wood, 38 rock, 8 board, 8 cut stone | 3500 | 20 | 48 | 100 | 9% / 18% | 50 | 9 |
| 10 | Established Keep | 64 rock, 8 board, 8 cut stone, 8 iron ingot | 3940 | 21 | 50 | 110 | 10% / 20% | 56 | 10 |
| 11 | Small Stronghold | 64 rock, 16 board, 10 cut stone, 8 iron ingot | 4430 | 22 | 52 | 120 | 11% / 22% | 62 | 11 |
| 12 | Large Stronghold | 128 rock, 64 wood, 30 cut stone, 8 iron ingot | 5580 | 23 | 54 | 130 | 12% / 24% | 68 | 12 |
| 13 | Established Stronghold | 128 rock, 64 wood, 56 cut stone, 8 iron ingot, 8 board | 6900 | 24 | 56 | 140 | 13% / 26% | 74 | 13 |
| 14 | Small Castle | 128 rock, 64 cut stone, 32 iron ingot, 56 board | 8940 | 25 | 58 | 150 | 14% / 28% | 80 | 14 |
| 15 | Large Castle | 256 rock, 64 cut stone, 8 iron ingot | 10580 | 26 | 60 | 160 | 15% / 30% | 86 | 15 |

Notes / conflicts: the wiki [Quick Guide](https://rise-to-ruins.fandom.com/wiki/Quick_Guide) says the finished starting camp raises the limit to **6 slots** (vs 8 in this table) — verify in game. Tile size not published (older text: village center acts as town core; multi-village play puts one Camp per region).

---

## 4. Building catalog

Build-menu categories (from [Interface](https://rise-to-ruins.fandom.com/wiki/Interface)): **Civics, Defense, Food and Water, Harvesting, Housing, Lighting, Magic, Manufacturing, Refining, Storage, Walls**. Conventions: costs are `Tier1 / Tier2 / Tier3 / …` upgrade costs; worker counts likewise. `Range` = building's service/work radius (also the radius used for ancillary build-range extension). "Placeholder" = wiki page contains template dummy values; do not trust.

### 4.1 Civics

Source: individual pages linked.

| Building | Cost per tier | HP | Range | Workers (job) | Storage | Special behavior |
|---|---|---|---|---|---|---|
| **Ancillary** (5 tiers: Small / / Large / Established / Reinforced) | 32 wood 8 rock / 16 wood 8 rock / 16 wood 8 rock 16 cut stone / 8 wood 16 board 24 rock 16 cut stone / ? | 2100 / 2220 / 2420 / 2740 / 3020 | 20 / 22 / 24 / 26 / 28 | 2/3/4/5/6 **Organizers** | 24 / 32 / 40 / 48 / 64 (everything except water buckets & Suspicious Key) | Extension of the village center: adds **build-limit slots** (amount per tier not published), storage, build range; organizers haul/redistribute. Tilesize 9w×7h (old Buildings page) |
| **Clinic** | 24 wood 8 rock / 24 wood 8 rock / 16 wood 8 rock 16 cut stone | 2060 / 2220 / 2420 | 16 / 20 / 24 | 2 / 4 / 6 **Medics** | 24 / 32 / 48 (silk, bandage, medkit) | Refines silk → bandages → medkits; medics patrol with guards and heal (blight/poison included). Upgrade = faster refining. Tilesize 6w×8h |
| **Courier Station** | 16 wood 24 rock 4 crystal / 16 wood 8 rock 12 cut stone 4 crystal / 16 wood 16 rock 12 cut stone 4 crylithium | 2120 / 2320 / 2560 | 16 | 2 / 3 / 4 **Courier Suppliers** | 200 energy | Spawns **Courier Golems** to send resources to adjacent world-map regions: spawn cost **100/75/50 energy + 1 rock**; parking spots 2/4/6; can keep 4/6/8 golems alive; destination region needs a started Camp. Desirability -2 |
| **Maintenance Building** | 24 wood 16 rock / 8 wood 16 board / 16 wood 16 board 16 cut stone | 2180 / 2300 / 2540 | 16 | 4 / 6 / 8 **Maintainers** | 6 / 8 / 12 (tools) | Staffed villagers who **exclusively repair buildings and roads** |
| **Marketplace** | 48 wood 24 rock 16 board / 16 wood 8 rock 8 board 16 cut stone / 8 wood 16 rock 8 board 16 cut stone 16 iron ingot | 2340 / 2580 / 2900 | ? | 6 / 12 / 16 **Provisioners** | 48 / 64 / 96 (gold sacks) | Buy/sell most resources for gold; attracts **Catjeet Provisioners**; chance to spawn a **Catjeet Laborer** offering hire for **1200–1750 gold** (becomes a villager) |
| **Migration Way Station** | 24 wood 32 rock / ? / 16 rock 8 cut stone | ? / 2300 / 2420 | 16 | none; **6 / 10 / 14 migrants per day** | ? | Send adults to adjacent regions to seed new villages; requires **local pop ≥ 15**; only young healthy adults; migrants leave in the morning |
| **Way Maker Shack** | 24 wood 16 rock / 8 wood 16 board / 16 wood 16 board | 2100 / 2220 / 2380 | 16 | 6 / 10 / 14 **Way Makers** | 8 / 12 / 16 (wood, rock, board, cut stone) | Unlocks the Roads & Digging orders; builds and maintains roads |

### 4.2 Food and Water

| Building | Cost per tier | HP | Range | Workers | Storage / capacity | Special behavior |
|---|---|---|---|---|---|---|
| **Farm** | 32 wood / 32 wood / ? (T3 placeholder 999s) | placeholder (1234/2345/3456) | 20 | 2 / 3 / 4 **Farmers** | food items (raw veg, meat, eggs, meals) | Farmers harvest designated wild plants and **replant** them as crops; water crops (dirty water acceptable); **inactive in cold seasons**; Small Farm removed (v29-era). Tilesize 9w×7h. Hotkey 8 designates food/water |
| **Kitchen** | 24 wood 16 rock 4 cut stone / 8 wood 8 rock 8 board 4 cut stone / 48 wood 32 rock 12 cut stone 16 board 4 iron ingot | 2120 / ? / 2460 | 20 | 2 / 3 / 4 **Cooks** | raw 24/32/40; refined 8/12/16; T2 **+10%** and T3 **+20%** ration refine speed | Butchers tamed animals (only above the **75% herd-rule floor**) and cooks **Boiled Eggs**, **Cooked Meat**, **Rations** (raw veg + cooked meat). Slaughter byproducts: Feathers (cluckers), Leather (beefalos), Wood (entlers), none (rous). Tilesize 7w×4h |
| **Well** | unknown (stub) | unknown | ? | ? | ? | "Constantly, but slowly, fills with clean water" (passive producer, no water source needed) |
| **Water Purifier** | 24 wood 24 rock / ? / ? | ? / ? / 2541 | 24 | 2 / 3 / 4 **Water Masters** | "32+12" / ? / "60+20" (dirty+clean buckets) | Converts dirty → clean water; water masters haul dirty buckets from designated tiles; **frozen water unharvestable in winter** |
| **Rain Catcher** | unknown (stub) | unknown | ? | none? | ? | "Fills up with water when it rains" |
| **Bottler** | T1 ~24 wood 16 rock; T2/T3 costs corrupted on wiki | 2100 / 2180 / 2290 | 12 | 2 / 3 / 4 **Bottlers** | 32 / 48 / 64 | Water buckets → **Water Bottles** (portable drinks); T2 −10%, T3 −20% refining time. Tilesize 4w×6h |
| **Small Fountain** | 24 rock | 1945 | 12 | none | 48 water buckets | Villagers drink here; no workers; **not upgradeable** |
| **Large Fountain** | 24 rock, 24 cut stone | 2140 | 12 | none | 96 water buckets | As above, bigger; **not upgradeable** |
| **Animal Pen** | 32 wood / 32 wood / 32 wood 16 board | 2060 / 2220 / 2460 | 24 | 2 / 3 / 4 **Farmers** | houses **6 / 8 / 10 animals** + food (raw veg) & water (buckets) | Houses tamed Beefalos/Entlers/Rous (mixed species OK); cooks slaughter only surplus above **75% of pen capacity**; animals breed in captivity; Rous attack monsters |
| **Clucker Coop** | 32 wood / ? (placeholder) / 32 wood 16 board | ? / 2331 / ? | 20 | 2 / 3 / 4 **Farmers** | eggs + food + water | Houses Cluckers → **Eggs**; same 75% slaughter rule; ranger brings wild cluckers if housing space exists |
| **Outpost** | unknown (stub) | unknown | ? | guard slots? | ? | Legacy text (v29): "smaller barracks — expanded influence + guard slots, small bow tower when fully upgraded". Current status unclear (see Unknown) |

### 4.3 Harvesting

| Building | Cost per tier | HP | Range | Workers | Notes |
|---|---|---|---|---|---|
| **Lumber Shack** | unknown (stub page) | unknown | ? | **Lumberjacks** | Chop designated trees (hotkey 6). **Each upgrade level = +10% harvest speed** (Buildings page). Tilesize 8w×6h |
| **Mining Facility** | unknown (stub) | unknown | ? | **Miners** | Mine designated rock (hotkey 7); rare iron/gold ore drops. **+10% harvest speed per level**. Tilesize 8w×9h |
| **Crystal Harvestry** | **16 wood 32 rock 8 board** (T1) / ? / ? | unknown (placeholder) | 20 | **Crystal Harvesters** | Mine designated crystal (hotkey 9). **+10%/level**. Tilesize 10w×10h |

Designated harvest areas are map-wide brush selections; guides stress harvesting **near** the village (travel time dominates) and that farmers/harvesters idle when storage is full.

### 4.4 Housing

| Building | Cost per tier | HP | Storage | Capacity / notes |
|---|---|---|---|---|
| **Housing** | 24 wood / 40 wood 16 rock / 32 wood 8 rock 8 board | 1945 / 2300 / 2900 | 12 / 36 / 96 (raw veg, ration, water bucket/bottle, cooked meat, egg, boiled egg) | Base house holds **4 villagers** (Quick Guide); couples move in together and reproduce only if both have a home; houses buffer food/water for occupants. Tilesize 7w×7h (old page; v29 text mentions Occupancy/Standard/Quality upgrade paths — current build appears to use the 3 linear tiers above) |
| **Doggo House** | 12 wood / 12 wood 8 rock / 12 wood 8 rock | 1195 / 2060 / 2160 | raw 6/12/18 + refined 12/24/36 | Houses **6 / 12 / 18 Doggos**; bonuses: sleep speed 50/65/80%, health regen 2/3/4; desirability 3; wild doggos need no house; excess doggos squat in human housing |
| **Ranger Lodge** | 48 wood 24 rock / 16 wood 8 rock 8 board / 8 wood 16 rock 4 crystal 8 board 16 cut stone 6 iron ingot | 2260 / 2420 / 2710 | 6 / 12 / 16 (weapons & armor list) | 6 / 12 / 16 **Rangers**; rangers **live here** (acts as housing); tame wild animals for pens/coops and patrol for monsters; fully upgraded lodge includes a **small bow tower**. Desirability -1 |
| **Key Shack** | unknown (stub) | unknown | ? (Storage category) | Presumably stores Suspicious Keys / loot; verify in game |

### 4.5 Lighting (also extends build range)

| Building | Cost | HP | Range | Notes |
|---|---|---|---|---|
| **Fire Pit** | 6 wood | 600 | 12 | Cheap range extender; **monsters will not attack it**; desirability -1 |
| **Large Fire Pit** | 12 wood | 1195 | 16 | "Extra 4 range and double health"; monsters won't attack; can be built inside wall lines |
| **Crystal Motivator** | unknown (stub) | ? | ? | Lighting category; function/stats not documented — verify in game |

### 4.6 Magic

| Building | Cost per tier | HP | Energy | Range | Notes |
|---|---|---|---|---|---|
| **Essence Collector** | 12 rock 8 crystal / 4 rock 4 crystal 24 cut stone / 16 rock 20 crystal 24 cut stone 4 crylithium | ? / 2160 / 2480 | stores **300 / 500 / 700** | 8 | Collects stray essence → energy for magic buildings; collectors **resupply each other** when low; desirability -1. (Infobox also lists "MaxStorage 10 Crithilium" — ambiguous, verify) |
| **Crystal Golem Combobulator** | unknown (images only) | ? | ? | ? | Spawns Crystal Golems from energy (ranged, fast, fragile). Wood and Stone Combobulators also exist (melee/medium, melee/tank); v2d patch: combobulators generate golems **50% slower but same total energy/golem**. See defense doc for golem stats |
| **Cube-E Golem Combobulator** | unknown | ? | ? | ? | Trash category: spawns Cube-E Golems that compress Trashy Trash → Trashy Cubes and build trash buildings |
| **Cullis Gate** | unknown (stub) | ? | ? | ? | Neutral/magic building; historically destroys dropped items/creatures → essence; easter-egg interactions (Doofy Doggos) |

### 4.7 Manufacturing

| Building | Cost per tier | HP | Workers | Products (maintain-thresholds) | Notes |
|---|---|---|---|---|---|
| **Forge** | unknown (stub) | ? | smiths | Iron ore→**Iron Ingot**; gold ore→**Gold Ingot**; gold ingot→**Gold Coin Sack** | Tilesize 9w×8h |
| **Toolsmithy** | unknown (stub) | ? | smiths | **Pickaxe, Axe, Hoe, Shovel, Hammer** (iron), Wood Sword (board), Iron Sword (iron ingot) | Tools: 300 uses, halve work ticks. Tilesize 7w×9h |
| **Armorsmithy** | placeholder (999s) | placeholder | 2/3/4 (worker type mislabeled "cooks" on wiki) | **Iron Chest, Iron Helmet, Iron Shield** | Tilesize 9w×7h |
| **Bowyer** ("Makeshift Bowyer" T1) | 24 wood 8 rock / 8 wood 8 board 8 rock / 16 wood 8 board 8 rock | 2060 / 2180 / 2340 | 2 / 3 / 4 **Fletchers** | **Bow** (wood+silk), **Quiver** (wood+feather), **Ballistae Bolts** (wood) | Storage 16/24/32; set "maintain N" (guide: ~40 bolts mid-game; wiki quick guide: 5 bolts for first night). Tilesize 6w×7h |
| **Tumbler** | unknown (stub) | ? | ? | **Stone Balls** (rock) | Ammo for sling/bullet/spray towers. Tilesize 7w×8h |

### 4.8 Refining

| Building | Cost per tier | Workers | Recipe | Notes |
|---|---|---|---|---|
| **Lumber Mill** | unknown (stub) | **Carpenters** | Wood → **Board** | Tilesize 11w×7h |
| **Stone Cuttery** | unknown (stub) | **Stone Cutters** | Rock → **Cut Stone** | Tilesize 8w×6h |
| **Crystillery** | unknown (stub) | **Crystillers** | Crystal → **Crylithium** | Tilesize not published |

Refiner output is threshold-driven ("maintain N"); guide targets ~50 boards / 50 cut stone / 50 crylithium as a healthy baseline.

### 4.9 Storage

Confirmed chassis (from Crystal/Equipment pages): 5 tiers, HP 2060 / 2140 / 2220 / 2340 / 2500, range 16, desirability 1, no workers, costs 32 wood / 16 wood / 16 wood / 16 wood 16 board / (T5 unknown).

| Building | Storage per tier | Stores |
|---|---|---|
| **Crystal Storage** | **16 / 32 / 48 / 64 / 80** | Crystal, Crylithium |
| **Equipment Storage** | **10 / 14 / 18 / 22 / 26** | All weapons/armor/tools, bandage, medkit |
| **Food Storage** | unknown (placeholder page) | food items |
| **Wood Storage** | unknown (placeholder) | wood, boards |
| **Rock Storage** | unknown (placeholder) | rock, cut stone |
| **Mineral Storage** | unknown (placeholder) | iron/gold ore, ingots, (crystal?) |
| **Gold Storage** | unknown (placeholder) | gold ingots, coin sacks |
| **Miscellaneous Storage** | unknown (placeholder) | misc items |
| **Ammo Storage** | unknown (placeholder; page confirms 5 tiers named Small→Reinforced) | ballistae bolts, stone balls |

**Given the identical HP/cost chassis, the other storage buildings very likely share the 16/32/48/64/80 capacity curve — treat as a strong hypothesis to verify in-game, not as confirmed.** Storage buildings placed near Ancillaries spread logistics (community tip).

### 4.10 Walls & gates

Source: [Walls](https://rise-to-ruins.fandom.com/wiki/Walls) + stale Buildings page. **Fences do NOT count toward the build limit; gates DO.**

| Wall | Cost per section | HP | Notes |
|---|---|---|---|
| **Wood Fence** | 1 wood | 100 | — |
| **Stone Fence** | 2 rock | 200 | — |
| **Curtain Wall** | 3 cut stone | 300? (wiki: "300?") | As tall as a wall: only Ballista Towers shoot over it; **Spectres can cross it** |
| **Crylithium Wall** | unknown | ? | Spectres **cannot** cross; ranged fire can shoot over |
| **Crylithium Curtain Wall** | unknown | ? | Spectres can't cross; only Ballista shoots over |
| **Wooden Gate / Stone Gate** | unknown (count toward limit) | ? | Villagers, nomads, golems pass; monsters don't |
| **Trashy Cube Wall** | trashy cubes | ? | Trash-tier wall (Cube-E golems build) |

Pathing rule (Walls page): monsters always route the shortest open path; if none exists they attack the path of least resistance (lowest time-to-break-through) — this is what makes maze/funnel defenses work.

### 4.11 Defense towers (summary — details in the monsters/defense doc)

All towers: desirability -2, corruption resistance 2 (except Recombobulator/Attract same), tier 4 variants come in Fire/Ice/Lightning flavors, tier 4 adds +250 energy storage on ammo towers. All data from individual tower pages (high confidence).

| Tower | T1 cost | HP 1/2/3/4 | Damage | Range 1→4 | Reload 1→4 | Ammo/energy |
|---|---|---|---|---|---|---|
| **Bow Tower** | 12 wood 8 rock 2 crystal | 1870/2200/2380/2600 | 20-30 → 30-40 piercing (+10-15 elem T4) | 16/18/20/20 | 150/130/110/110 | 20 shots per ballistae bolt |
| **Ballista Tower** | 24 wood 32 rock 24 cut stone 6 crystal | 2330/2710/3120/3620 | 75-150 → 125-200 piercing (+50-75 elem T4) | 32/36/40/40 | 800/650/550/550 | 10 shots/bolt; fires over walls & mountains; blocks LOS (curtain-wall height) |
| **Sling Tower** | 4 wood 16 rock 2 crystal | 1870/2160/2350/2620 | 6-8 → 8-10 crushing (T4 fire: 10-15 pierce +20-30 fire, 25% splash) | 12 all | 350/300/250/250 | 10 shots/stone ball; **cannot shoot over walls** |
| **Bullet Tower** | 4 wood 16 rock 2 crystal | 1870/2160/2350/2620 | 7-10 → 12-15 crushing (+4-6 elem T4) | 10 all | 30 | 100 bullets/stone ball |
| **Spray Tower** | 4 wood 4 board 16 rock 8 cut stone 2 crystal | 2070/2230/2430/2710 | 1-2 → 3-4 crushing (+1-2 elem T4) | 10 all | 5 | 300 spray bullets/stone ball; multi-hit |
| **Phantom Dart Tower** (1×1 tile) | 12 wood 8 crystal | 1775/2080/2200/2350 | 4-6 → 8-10 magic (+4-6 elem T4) | 10 all | 60 | 3 energy/shot; energy store 50/75/100/100 |
| **Elemental Bolt Tower** | 4 wood 24 board 16 rock 8 crystal 2 crylithium | 2170/2350/2650/3100 | 20-40 → 30-50 magic (+30-50 elem T4) | 14 all | 60/55/50/50 | 10 energy/shot; store 250; **magic damage vs slimes/spectres** |
| **Static Tower** | 16 wood 4 board 16 rock 8 crystal | 2120/2240/2400/2660 | 10-50 magic lightning (AoE all enemies in range) | 5/5/7/7 | 150/130/110/90 | 16/14/12/10 energy/shot |
| **Attract Tower** | 16 wood 4 board 16 rock 8 crystal | 2120/2240/2400/2660 | teleports resources >3 tiles to itself | 18/20/22/24 | 160/135/110/85 | 25→10 energy/shot; store 100→250; retrieve dropped gear from corrupted tiles |
| **Banish Tower** | 16 wood 16 rock 4 cut stone 8 crystal | 2120/2240/2400/2660 | teleports a monster to a random map tile (desirability >0 tiles excluded) | 5 all | 500/400/300/200 | 50 energy/shot; store 50→200 |
| **Recombobulator Tower** | 16 wood 8 crystal | 1945/2270/2730/3180 | heals golems 25% max HP | 8/8/10/12 | 260/210/160/110 | 25→10 energy/shot; attracts & heals friendly golems |

---

## 5. Economy loops

### 5.1 Food chain
1. **Gathering:** farmers harvest designated wild plants (fast early food; finite patches; Motivate Land/Holy Potatoes spells regrow).
2. **Farming:** farms replant harvested plants into crops; need water deliveries (water masters); **shut down in cold seasons** → winter must be survived on stockpiles/rations (guide math: 30 mostly-idle villagers ≈ 300–400 food; a fully-working 60-villager village eats 3–4× that).
3. **Animal husbandry:** Ranger Lodge rangers tame wild Cluckers/Beefalos/Entlers/Rous into Clucker Coops (eggs) / Animal Pens (meat, leather, feathers, wood-byproduct); pens breed in captivity; cooks butcher only the surplus above 75% capacity.
4. **Cooking:** Kitchen turns eggs→Boiled Eggs, raw meat→Cooked Meat, (raw vegetable + cooked meat)→**Rations** (120 food value, carried in inventory, ~2 days per ration).
- Villager appetite (wiki): ~3 raw veg/day idle, ~3–6 working, ~4 children. Dev hunger math (older balance, structure still useful): idle 1 hunger/25 s; working/fighting/carrying/pregnant 1/12.5 s; pregnant+working 1/8.3 s; children 1/16.6 s; day ≈ 18.3 real minutes.
- Overproduced food left on the ground decays to trash in ~24h → trash slimes.

### 5.2 Water chain
Water Purifier (dirty buckets from marked tiles; workers 2–4) and Rain Catcher (rain only) and Well (slow passive) → clean water stored in buckets → **fountains** are where villagers actually drink (Small 48 / Large 96 bucket buffers) → Bottler converts buckets to portable Water Bottles (30 drink value) so villagers skip the walk. Farms and animal pens also consume buckets. Winter freezes surface water (no dirty-water harvest; rain becomes snow).

### 5.3 Wood / stone / crystal chains
Designate tiles (hotkeys 6/7/9) → harvesting building workers (lumberjacks/miners/crystal harvesters, +10% speed per building level) → raw stock → refiners (Lumber Mill → boards; Stone Cuttery → cut stone; Crystillery → crylithium) driven by maintain-thresholds. Construction costs scale through boards (T5+), cut stone (T7+), iron ingots (T10+), crylithium (T4 tower tiers / crylithium walls). Silk (wood byproduct) and iron/gold ore (rock byproduct) are the bottleneck byproducts for meds/ammo/tools/currency.

### 5.4 Tools & equipment
Toolsmithy tools (iron; 300 uses; halve effective work ticks — multiplicative after speed bonuses) are the single biggest villager-productivity multiplier. Bows/quivers arm rangers/guards; armorsmithy iron gear raises survivability; medkit/bandage from the clinic keep them alive. Equipment also drops from monsters, lootboxes, and the Catjeet market.

### 5.5 Gold economy
**No taxes, no villager wages.** Gold enters via (a) Forge: gold ore → gold ingot → gold coin sacks; (b) **selling** any sellable resource/equipment at the Marketplace (Catjeet provisioners physically cart goods in/out). Gold exits via buying resources/equipment/Suspicious Keys and **hiring Catjeet Laborers (1200–1750 gold) as new villagers**. Marketplace jobs: 6/12/16 provisioners. God Dust is a sell-only item.

### 5.6 Essence / energy / influence
Every harvested resource and death releases essence. Max influence = 40 × villagers (chest perks can add more per villager). Essence collectors (range 8) vacuum essence into stored **energy** (300/500/700) that powers towers (phantom dart, elemental bolt, static, attract, banish, recombobulator), golem combobulators, and courier stations; collectors cross-feed. Burners convert trash → essence. Prayer actions historically gave 3 essence × 3 energy (v2d note).

### 5.7 Trash cycle (secondary loop)
Decay and mining/wood work generate typed trash → Processor unifies to Trashy Trash → Cube-E Golems compress to Trashy Cubes → Burner burns either for essence, Landfill/Trash Can dumps it, trash buildings (Trashy Cube Pile/Wall) consume cubes. Ignoring trash breeds Trash Slimes.

### 5.8 Growth limits (what actually gates expansion)
1. **Villagers** (every job) — grown via nomads/births/hired Catjeets.
2. **Build limit** (center tier 8→86 + ancillaries).
3. **Storage** (tiny local buffers; storage buildings + caps).
4. **Food/water in winter** (farms stop; water freezes).
5. **Byproduct RNG** (silk, iron ore, gold ore) gating meds/ammo/tools/gold.
6. **Corruption pressure** (nights, Blood Moons; see defense doc).

---

## 6. Placement & terrain rules

- **Build range** radiates from the village center (32→60 by tier), Ancillaries (20→28), and Fire Pits (12/16). Community finding: building range does not project through walls (fire pits must be chained ahead of the wall line). Everything else in the build menu must be inside range and on clear, uncorrupted ground (corruption placement rules — see defense doc).
- **Terrain tools** (Terrain panel): pause building (o), **dismantle building (i) — refunds/salvages resources** (exact % not documented), dig hole (q) — holes fill with rainwater (player-made ponds), create/upgrade roads, dismantle roads, destroy terrain (0) — clears tiles (rocks/trees) so buildings/roads fit.
- **Roads** ([Roads](https://rise-to-ruins.fandom.com/wiki/Roads)): Path (auto-appears on frequently walked tiles, free, **+20% speed**, vanishes without maintenance); Log Path (1 wood, **+40%**); Cobble & Log (1 rock, **+50%**); Cobble & Board (1 board, **+60%**); Cut Stone & Board (1 cut stone, **+70%**). Unmaintained roads degrade to **Debris (+10%)**. Built/maintained by Way Makers and Maintainers. (Max ≈ 50–75% faster than bare ground.)
- **Repair & decay:** buildings damaged by monsters/weather need repair (builders do it; Maintainers do it exclusively); roads decay to debris. Enemy (corruption) buildings gain 100 HP per resource delivered and are not repaired by monsters (see defense doc).
- **Demolition:** dismantle salvages resources (amount unspecified). God-placed (spell) buildings placed via god powers don't grant build XP.
- **Animal Habitats** (spawn system): need an uncorrupted area containing a water tile + a wild plant + a resource node; each habitat ≈ +2 to the wild-animal spawn cap; spawn location itself is random on uncorrupted ground. Relevant if you want renewable tameable animals.

---

## 7. Build-order meta (guides + community)

### 7.1 Day-1 opening (Meshech Steam guide, updated for current systems)
1. Place Camp central to wood/rock/crystal/food/water.
2. **Farm** (assign 1 farmer; tag wild food with hotkey 8) → **Housing** → **Well** (1 water master) → upgrade camp → **Lumber Shack** (1 lumberjack) → 1–2 **Ancillaries** (1 organizer) → wood-fence perimeter with one chokepoint.
3. First night (Traditional: attacks start night 2): **1 Bow Tower** + Bowyer set to *maintain 5 bolts* (1 fletcher). Survival/Nightmare: corruption is present immediately — wall first.

### 7.2 Ratios that get repeated across guides
- **Farms:** early ~1 makeshift farm per 10 villagers; later 1–2 established farms per 20 villagers; dev baseline advice: keep **≥8 farm workers / 3–4 farms** once food farming seriously matters. Late-game stack (bernar.do): 10–12 farms, 2–3 clucker coops, 2–3 animal pens, 3–4 kitchens, 4–5 water purifiers, 6–7 rain catchers, ~a dozen large fountains; stock targets ≈ 1,000 raw vegetables / ~100 rations / ~100 cooked meat, and 50–60k water.
- **Organizers ≈ 2× builders** (hauling keeps specialists working).
- Wells: start with 2 beside farms, add in pairs, ~6 before winter; water purifiers 1 early, 2 before winter.
- Refiner maintain-targets: ~50 boards / 50 cut stone / 50 crylithium; bowyer ~40 bolts once towers multiply.
- Magic economy: essence collector + crystillery early, then community standard is **3 crystal golem combobulators ASAP**.

### 7.3 Mid / late game
- Upgrade the camp whenever you hit the build cap; ancillaries for storage/logistics saturation; roads on all worker routes (way maker shack).
- Contain corruption by ring-walling with fire pits extending range, one maze entrance; elemental bolt towers vs slimes/spectres, ballistas behind curtain walls; "creeping tower" strategy to reclaim the map.
- Multi-village: Migration Way Station (needs local pop ≥15) seeds adjacent regions; Courier Stations ship surplus (energy + rock per golem); gold buys laborers to boot a new village.

### 7.4 Classic beginner mistakes (from the same sources)
- Tagging far-away harvest patches (travel time dominates; harvest near, Grab the rest).
- No maintain-thresholds set → crafters idle or overproduce (and rot into trash).
- Overproducing raw food left on the ground → trash → trash slimes.
- Too few organizers → specialists spend their day hauling.
- Farms without water masters / without winter stockpile; forgetting farms die in winter.
- Walling without a funnel (monsters then chew the least-resistant wall segment); building towers outside walls prematurely (provokes corrupted buildings).
- Ignoring housing → no births; ignoring nomads on the minimap → no population growth.

---

## 8. Buildings not (yet) covered above

Barracks (page stub; v29 text says replaced by Ranger Lodge but the Quick Guide still lists a Barracks under Defense→Guards and Golems — status conflicting, verify in game), Graveyard (stub), Key Shack (stub), Crystal Motivator (stub), Cullis Gate (stub), Landfill / Trash Can / Trashy Cube Pile / Cube-E Golem Combobulator (trash category, minimal documentation), God Tower / God Wall (god-power constructs; god-powers doc).

---

## 9. Unknown — needs video/playtest reference

Exact numbers the wiki does **not** publish anywhere (do not guess; capture from gameplay):

- **Production rates per worker** for every harvester/refiner/kitchen/bottler/clinic (wood/min/worker, veg/day/farm, water/day, bolts/day, rations/day, etc.). Nothing published; must be timed in-game.
- **Build times** for every building (not documented).
- **Well**: cost, HP, fill rate, storage, tiers.
- **Rain Catcher**: cost, capacity, fill-per-rain numbers.
- **Lumber Shack / Mining Facility** T1–T3 costs & HP (pages are stubs; only +10%/level is known).
- **Farm** T3 cost & real HP; farm plot count / tiles per farm; per-crop growth times.
- **Bottler** exact T2/T3 costs (wikitext corrupted); **Water Purifier** T2/T3 costs; Migration Way Station T2 cost.
- **Storage buildings**: Food/Wood/Rock/Mineral/Gold/Misc/Ammo Storage capacities per tier (chassis strongly suggests 16/32/48/64/80 but unconfirmed).
- **Ancillary**: how many build-limit slots each tier adds.
- **Camp**: whether the starting build limit is 6 or 8 (conflicting sources); tile size.
- **Housing**: exact villager capacity per tier (4 at T1 only source: Quick Guide); whether Occupancy/Quality upgrade paths still exist.
- **Food values** for Egg and Boiled Egg; **drink value** of Water Bucket vs Water Bottle at fountains.
- **Clucker** butcher meat yield; egg lay rate.
- **Kitchen/Clinic/Bottler** refine times (only % tier bonuses are documented).
- **Demolition refund** percentage; **repair** costs/rates.
- **Marketplace** buy/sell price tables (item-by-item gold prices not documented); laborer spawn chance.
- **Roads**: exact villager speed multipliers per road type are given (+20…70%) but base tile-walk speed is not.
- **Essence**: current max-influence formula confirmation (40×villagers is flagged "may be outdated" adjacent); essence per harvested resource by type; burner essence per trash/cube.
- **Golem combobulators** (wood/stone/crystal/cube-E): costs, energy per golem, spawn times (defense doc will want these too).
- **Crystal Motivator, Cullis Gate, Key Shack, Graveyard, Outpost, Barracks** current-game function and stats.
- **Walls/gates**: current costs/HP for curtain/crylithium walls and gates (numbers above may be v29-era).
- Nomad arrival rate formulas; birth/pregnancy durations; elder lifespan effects on workforce.

---

## 10. Confidence & gaps

- **High confidence:** Camp/Castle 15-tier table; Ancillary; Kitchen (recipes, storage, tier bonuses, 75% slaughter rule); Clinic; Bowyer; Animal Pen/Clucker Coop mechanics; Doggo House; Ranger Lodge; all 10 defense towers (costs, HP, damage, reload, ammo economy); fountains; water purifier behavior; roads (+20–70%, decay); food item values (25/50/80/120) & ground-decay (~24h); gold/currency loop; hunger-rate structure (dev post).
- **Medium confidence:** tile sizes (from the stale v29 Buildings page); housing capacity 4; farm/water-master ratios (community consensus, several versions old); storage-building capacity hypothesis; "organizers ≈ 2× builders".
- **Low confidence / stale:** everything on the main Buildings page (v29-era text), wall HP/costs beyond wood/stone fences, barracks/outpost status, tool "halve ticks" exact current formula.
- **Biggest gaps for a faithful recreation:** per-worker production rates and build times (must be captured from gameplay/video), marketplace price table, well/rain-catcher numbers, storage caps. Recommend capturing a reference playthrough (Traditional difficulty) and timing: 1 lumberjack wood/min at each shack tier; 1 farmer output/season; well fill/hour; purifier conversions/hour; bowyer bolts/hour; kitchen rations/hour.

---

## 11. Sources

Wiki (Fandom API raw wikitext, all accessed 2026-09-07):
- https://rise-to-ruins.fandom.com/wiki/Buildings (tile sizes; stale v29 text)
- https://rise-to-ruins.fandom.com/wiki/Camp_and_Castles
- https://rise-to-ruins.fandom.com/wiki/Ancillary , /Clinic , /Courier_Station , /Maintenance_Building , /Marketplace , /Migration_Way_Station , /Way_Maker_Shack
- https://rise-to-ruins.fandom.com/wiki/Farm , /Kitchen , /Well , /Water_Purifier , /Rain_Catcher , /Bottler , /Small_Fountain , /Large_Fountain , /Animal_Pen , /Clucker_Coop
- https://rise-to-ruins.fandom.com/wiki/Lumber_Shack , /Mining_Facility , /Crystal_Harvestry , /Lumber_Mill , /Stone_Cuttery , /Crystillery
- https://rise-to-ruins.fandom.com/wiki/Housing , /Doggo_House , /Ranger_Lodge , /Key_Shack
- https://rise-to-ruins.fandom.com/wiki/Fire_Pit , /Large_Fire_Pit , /Crystal_Motivator
- https://rise-to-ruins.fandom.com/wiki/Essence_Collector , /Crystal_Golem_Combobulator , /Cullis_Gate , /Burner , /Processor , /Trash , /Trashy_Trash , /Trashy_Cube
- https://rise-to-ruins.fandom.com/wiki/Forge , /Toolsmithy , /Armorsmithy , /Bowyer , /Tumbler
- https://rise-to-ruins.fandom.com/wiki/Crystal_Storage , /Equipment_Storage , /Food_Storage , /Wood_Storage , /Rock_Storage , /Mineral_Storage , /Gold_Storage , /Miscellaneous_Storage , /Ammo_Storage
- https://rise-to-ruins.fandom.com/wiki/Walls , /Roads
- Towers: /Attract_Tower , /Ballista_Tower , /Banish_Tower , /Bow_Tower , /Bullet_Tower , /Elemental_Bolt_Tower , /Phantom_Dart_Tower , /Recombobulator_Tower , /Sling_Tower , /Spray_Tower , /Static_Tower
- Resources/items: /Resources , /Items , /Ration , /Raw_Meat , /Cooked_Meat , /Raw_Vegetable , /Water_Bottle , /Essence , /God_Dust , /God_Experience , /Lootbox , /Suspicious_Key , /Bonuses_from_chests
- Economy actors: /Catjeets , /Catjeet_Provisioner , /Catjeet_Laborer , /Catjeet_Nomad , /Golems , /Animals (habitats: /Animal_Habitats), /Rous , /World_Map
- Meta: /Quick_Guide , /Interface , /Villagers , /Updates

Community:
- Meshech, "Rise to Ruins Beginner's Guide" — https://steamcommunity.com/sharedfiles/filedetails/?id=1733202053
- "Food Strategies?" (dev Rayvolution hunger-rate posts) — https://steamcommunity.com/app/328080/discussions/0/365163686071866277/
- "Beating the Corruption in Rise to Ruins" — https://bernar.do/beating-the-corruption-in-rise-to-ruins
- Steam news feed (version timeline) — https://store.steampowered.com/feeds/news/app/328080/
- r/risetoruins (blocked for scraping at research time; build-order threads: https://www.reddit.com/r/risetoruins/comments/cjaugx/rise_to_ruins_beginners_guide/)

---

## 12. Media inventory (reference only — do NOT download; developer copyright)

Wiki images documenting buildings (use `https://rise-to-ruins.fandom.com/wiki/File:<name>` to view). Useful for faithful sprite/layout recreation:

| File | Shows |
|---|---|
| `Ancillary1.png` … `Ancillary5.png` | Ancillary tiers 1–5 appearance |
| `Clinic1.png` / `Clinic2.png` / `Clinic3.png` | Clinic tiers |
| `Courier` (see Ancillary4/5 pattern; station pages use SpellGrab placeholder) | — |
| `Kitchen1.png` / `Kitchen2.png` / `Kitchen3.png` | Kitchen tiers (Makeshift / Kitchen / Established) |
| `Bowyer1.png` / `Bowyer2.png` / `Bowyer3.png` | Bowyer tiers |
| `Armorsmithy1.png` … `Armorsmithy3.png` | Armorsmithy tiers |
| `CrystalHarvestry1.png` … `CrystalHarvestry3.png` | Crystal Harvestry tiers |
| `Barracks1.png` … `Barracks3.png` | Barracks tiers (legacy) |
| `CrystalGolemCombobulator1.png` … `4F/4I/4L.png` | Combobulator tiers incl. elemental T4 variants |
| `AttractTower1–4.png`, `BallistaTower1–4r/i/l.png`, `BanishTower1–4.png`, `BowTower1–4F/S/P.png`, `BulletTower1–4F/I/L.png`, `ElementalBolt1–4.png`, `PhantomDartTower1–4F/I/L.png`, `RecombobulatorTower1–4.png`, `SlingTower1–4F/I/L.png`, `SprayTower1–4F/I/L.png`, `StaticTower1–4.png` | Every defense tower per tier / elemental variant |
| `WoodFence.png`, `StoneWall.png`, `CurtainWall.png` | Wall types |
| `Path1.png` … `Path5.png` | The 5 road tiers |
| `EssenceBar.png` | Influence/essence UI bar |
| `UI pop.png`, `Top_panel.png`, `JobsPanel.png`, `ConstructionPanel.png`, `HarvestPanel.png`, `TerrainPanel.png` | All main UI panels (economy HUD reference) |
| `WorldMap-0.png` + region minimaps (Merrowshore, Farley, Quiet Forest, SurvivalIsland, …) | World map & 45 regions |
| `Roggo golem.png` | Rare "doggo golem" variant |
| `Send them.JPG` | Migration Way Station send-migrants UI |

Note: many building infoboxes on the wiki still use the `SpellGrab.png` spell icon as a placeholder instead of real building art — those buildings' official art is best captured from gameplay/video.
