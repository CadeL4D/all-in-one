# Rise to Ruins — Research 04: Monsters, Spawning, Waves & Defense

> Deep-research reference for a faithful mobile recreation. Covers the monster catalog,
> the corruption/spawning system, night-attack ("wave") logic, defensive structures,
> damage/combat math, difficulty effects, and special events.
> Companions: `01-overview`, `02-buildings-economy`, `03-villager-simulation`, `05-presentation`.
>
> **Version caveat:** The wiki is community-maintained and partly "Under Construction".
> Numbers marked from the wiki's infoboxes reflect roughly the Update 2 era (the wiki's
> "Updates" page documents current build **2d**). Stats were rebalanced repeatedly across
> InDev and 1.x/2.x; treat exact values as version-sensitive and verify against a current
> playthrough before finalizing a clone.

---

## 1. Monster catalog

The game has exactly **6 regular monster types** plus the corruption's worker caste
(**Drones**), each with variants. Wiki: "All monsters have their own strengths and
weaknesses. Most also have a child version, which is generally weaker than the regular
variant." Monsters also have hidden RPG stats (STR/DEX) and **levels** (a patch note:
"Zombies now tend to get more STR than DEX stats. Other zombie variants now have the same
stat gains as regular Zombies" — implying a variant/level system). Blood Moon slimes spawn
"at a level around the same as the enemies spawned from the corruption".

### 1.1 Overview table

| Monster | First spawn (Survival) | Speed | Key trait | Main weakness |
|---|---|---|---|---|
| Headless | Night 1 | Slow | No resistances; mass-spawns if you push corruption in the first days | Fire/Magic Fire (+20% dmg taken) |
| Slime (small) | Day/Night 2 | Slow | Splits on death | Magic electric (+80%), fire/ice (+30%) |
| Zombie | Day/Night 3 | Medium (faster than Headless) | Blight attacks; slain villagers/doggos can rise as zombies | Fire/Magic Fire (+50%) |
| Slime (normal) | Day/Night 4 | Slow | Tanky vs physical; splits into two smaller slimes on death | Magic electric (+80%) |
| Skeleton | Day/Night 5 | Fast | High HP; anti-piercing ("very resistant to Bow Towers") | Crushing (+50%) |
| Spectre | Day/Night 12 | Slow | High HP, partly invisible, phases through wood/stone walls & fences | Magic (+75%) |
| Fire Elemental | Day/Night 16 | Medium | Only ranged monster (8-tile range); sets buildings on fire | Ice/Magic Ice/Water (+75%) |
| Drone (worker) | With corruption spawn | Normal | Builds corrupted graveyards/towers/roads; replaced instantly on death | Fire/Magic Fire (+20%) |

Spawn days above are from the wiki Monsters page (mode-dependent: on **Traditional**
everything is shifted — monsters only start spawning night 2 and are "less numerous"; on
**Nightmare** monsters are already on the map at start and spawn at higher rates).

### 1.2 Headless

| Field | Value |
|---|---|
| Description | "A weak and slow monster, encountered at the very first night turn." |
| HP / Damage / Attack speed / Move speed | **Unknown — needs video/playtest reference** (no numbers published) |
| Resistances | none |
| Vulnerabilities | +20% damage taken from Fire, Magic Fire |
| Targets | Marches on the village (see pathing, §3.4) |
| Variants | Child version implied (wiki general rule) |
| Drops | Monsters occasionally drop equipment/healing potions (no XP/gold currencies in game) |
| Special | If the player pushes back corruption during the first few days, corruption spawns "literal dozens" of headless which can erase an undefended village |
| First seen | First night (all combat modes except Peaceful) |

### 1.3 Slime (+ Blood Slime, Trashy Slime)

| Field | Value |
|---|---|
| Description | "A slow enemy that can be tough to kill. Splits into smaller Slimes when killed." Larger slimes split into **two smaller slimes** on death. |
| HP / Damage / Attack speed / Move speed | **Unknown — needs video/playtest reference** |
| Resistances | 80% Poison, Blight · 50% Piercing, Slashing (i.e., "highly resistant to non-magic damage") |
| Vulnerabilities | +80% Magic Electric · +50% Magic, Electric · +30% Fire, Ice, Magic Fire, Magic Ice |
| Variants | **Standard** (green or yellow; from graveyards and uncorrupting tiles) · **Blood Slime** (red; spawns during Blood Moon in/near the village) · **Trashy Slime** (black; spawns from piles of Trash) · child/small version (spawns from day 2) |
| First seen | Small slimes day 2, normal slimes day 4 (Survival) |
| Special | Poison melee attack (DoT on villagers, curable by medics/healing aura) |

### 1.4 Zombie

| Field | Value |
|---|---|
| Description | "A little faster and much more resilient than the headless. Its attacks cause blight." |
| HP / Damage / Attack speed / Move speed | **Unknown — needs video/playtest reference** (has hidden STR/DEX stats; patch pushed STR > DEX) |
| Resistances | 80% Poison, Blight |
| Vulnerabilities | +50% Fire, Magic Fire |
| Targets | Village; melee |
| Variants | "Zombie variants" confirmed by patch notes (child version implied by Monsters page) |
| Special | Blight = minor DoT; **a villager or doggo that dies while blighted may rise as a zombie**. Zombies can also be created from resurrect spells gone wrong. |
| First seen | Day 3 (Survival) |

### 1.5 Skeleton

| Field | Value |
|---|---|
| Description | "A fast-moving enemy with high health. Very resistant to Bow Towers." |
| HP / Damage / Attack speed / Move speed | **Unknown — needs video/playtest reference** (fast; high HP) |
| Resistances | 75% Piercing · 20% Slashing |
| Vulnerabilities | +50% Crushing (→ bullet/sling towers, stone/wood golems, unarmed villagers) |
| Spawns from | Graveyards (corrupted graveyards) |
| First seen | Day 5 (Survival) |

### 1.6 Spectre (a.k.a. Specter)

| Field | Value |
|---|---|
| Description | "A slow-moving enemy that can clip through fences and stone walls… partly invisible and may be hard to spot." "Magical entities with a lot of health but traverse slowly." |
| HP / Damage / Attack speed / Move speed | **Unknown — needs video/playtest reference** (high HP; slow) |
| Resistances | 70% Crushing, Piercing · 60% Slashing |
| Vulnerabilities | +75% Magic · +50% Magic Fire, Magic Electric, Magic Ice · +30% Fire, Ice, Electric |
| Wall interaction | Passes through **wood fences, stone walls, and gates/fences**; BLOCKED by **Crylithium Walls**, Crylithium Curtain Walls, mountains, and forests. The wiki has a contradiction: Monsters page says "curtain walls will block them", the Spectre page says they can't clip "mountains, forests, or Crylithium Walls", and the Buildings page says "Spectres can now cross through this [curtain] wall" (a later change). **Current behavior (2.x): curtain walls do NOT stop spectres; crylithium (curtain) walls do.** Trashy Cube Walls also do not block spectres. |
| First seen | Day 12 (Survival) |
| Counter-play | God Wall spell blocks them; crylithium walls; magic-damage towers (Elemental Bolt, Phantom Dart, Static) |

### 1.7 Fire Elemental

| Field | Value |
|---|---|
| Description | "The only enemy with ranged attack." Shoots fireballs that inflict **burning** and **light buildings on fire**. "Incredibly dangerous in high numbers… able to take on any villager all by himself." |
| Attack range | **8 tiles** (dev-confirmed on Steam; the AI deliberately stops at 4–8 tiles, RNG so they don't stack at exactly 8). May shoot **over most walls** but NOT over curtain walls. |
| HP / Damage / Attack speed / Move speed | **Unknown — needs video/playtest reference**; patch 2d cut Fire Elemental overall stats by 33% ("they scale 33% slower") |
| Resistances | 80% Fire, Magic Fire |
| Vulnerabilities | +75% Ice, Magic Ice, **Water** |
| Water interaction | Takes "huge amount of damage when thrown to the water" (Grab spell), refuses to walk into water; **rain damages it**; in winter water freezes so the weakness disappears |
| Special pathing | On watery maps it will destroy any structure blocking its route rather than detour through water (unique among monsters) |
| Spawns from | Corrupted Graveyards · uncorrupting Corrupted Tiles · **Meteors** (Meteor Shower event, Blood Moon event, and the player's Meteor spell sometimes drop a fire elemental instead of a rock) |
| First seen | Day 16 (Survival) |
| Defense tip | Enclose static/magic towers in curtain walls; elementals can't fire over them while your ballistas can fire over the curtain wall |

### 1.8 Drones (corruption workers — not fighters)

| Field | Value |
|---|---|
| Description | "The corruption's equivalent of your followers. They are physically weak." |
| Behavior | Mill around inside corruption, harvest materials, build **corrupted graveyards, defensive towers, roads, fire pits and some walls** |
| Death/replace | Killed drones are **almost instantly replaced** — harassing them has "limited value" |
| Vulnerabilities | +20% Fire, Magic Fire |
| Jail exploit | A drone that wanders out can be Grabbed and dropped into a "jail" (natural pit/enclosure); jailed drones try to build towers forever without finishing them, removing them from the drone pool |
| Stopping them | Only reducing corrupted tiles to **zero** stops drone spawns. Finished corrupted buildings keep spawning regular monsters even after the corruption is cleared. |

### 1.9 Drops, XP, gold

- Monsters **occasionally drop equipment when killed**: weapons/armor (leather chest/helmet, wood shield), healing potions, etc. (wiki Items page).
- There is **no XP-from-kills or gold-from-kills economy** for the player village; kills feed the hidden "MONSTERS_KILLED" God-XP stat (meta-progression currency, listed in an old dev enum of God XP sources).
- Blood Slime levels match the corruption's current monster level, implying monsters carry a **level** value that scales with Corruption Threat / progression.

---

## 2. Spawning system (corruption, corrupted buildings, map generation)

### 2.1 Corrupted Tiles

- Tiles "where the Enemies live". They appear **depending on difficulty** (Survival/Nightmare: spawn alongside a few Drones; Traditional: delayed; Peaceful: never).
- Drones expand the corrupted area and on it build **Corrupted Graveyards, various defensive towers and even Roads**.
- Corruption spreads **under forests and mountains** without drones needing physical access, and **kills trees** it takes over.
- Corrupted tiles slowly **generate crystals** (resource competition).
- You **cannot cast spells on corrupted tiles** (except at the border; earthquake spam at the edge is a known trick, ~300–600 damage per cast per a player report).
- Corruption has its own overlay under "Data Views".
- Fully clearing a region makes it "free of corruption for ever". Achievement "Take it back!" = convert 256 tiles.

### 2.2 Corruption spawn placement vs. map generation (dev-confirmed)

From the dev (Rayvolution) in Steam discussion 3393916911760635449:

> "Corruption requires nearby wood and rock, and checks near the map edge first, as far from your camp as possible, then starts checking closer until it finds a suitable spot. If it fails to find a spot before getting too close to the camp, it just never spawns at all."

- Timing: "Corruption spawn is **delayed 1 day on Traditional**, spawns **as soon as you place the camp on Survival and Nightmare**."
- Consequence (community): camp placement is a strategic lever — a central camp can legally deny corruption any spawn location; conversely placing camp near the map edge gives corruption the far side.
- If no corruption appears after the camp is built, the only fix players use is destroying your own camp (e.g., with Meteors) and re-placing it.

### 2.3 Corrupted buildings = monster spawn points

- "Graveyards, defensive towers, roads, fire pits and even some walls are built by the drones in the corruption. **They will serve as spawn point for monsters when completed.**"
- **Construction:** enemy buildings **gain 100 HP for every single resource** a drone delivers. Monsters/drones **do not repair** damaged corrupted buildings, but drones **may upgrade them, increasing current/total health**.
- **Known bug (documented on wiki Buildings page):** brand-new corrupted construction sites had 0 HP and were **undestroyable until map restart**; patch 2d ("Corrupted buildings now spawn with a small amount of construction already completed so they can be targeted immediately") addresses exactly this — corrupted sites are now targetable on spawn.
- **Corrupted defensive towers shoot at your village** ("Corruption towers can now fire at the village again" — 2d fix).
- Destroying corrupted buildings: any damage source works once they have HP (towers, golems, meteors, earthquakes, lightning). Meteors "just damaged it a bunch" per one player — corrupted buildings are tanky.
- Graveyard count drives escalation: "As they build more graveyards, the corruption will spread further and there will be **more total drones and monster spawns**" (wiki Enemies page).

### 2.4 Corruption Threat — the spawn/power "budget"

Wiki Corruption Threat page (exact mechanic):

> "**Corruption Threat** is a modifier that every region has. The higher the Corruption Threat, the **more powerful and numerous monsters** in this region become. Corruption Threat only cares about **how much space on the map it desires, and how much it has**. Its *Desire* **increases over time as the day counter increases**. If the Corrupted Tiles can grow without a disturbance, the threat remains **0**. If you manage to **trap in** the Corrupted Tiles, the threat starts increasing. (there are **NO other factors**, such as number of villagers, their wealth, etc.)"

- Displayed as a **red bar in the top UI, just above the Influence bar**.
- Pushing corruption back **raises** Corruption Threat; **uncorrupting a tile may spawn an enemy**, with probability set by Corruption Threat; near full clearance, pushback gets **slower** and enemy spawns **more frequent**.
- Practical model for a clone: `threat_desire = f(day)` vs `threat_space = corrupted_tile_share`; when boxed in (`desired_space >> actual_space`), threat rises; threat multiplies spawn **count** and monster **power/level**.
- An older global modifier, "Global Corruption Power", **was removed** from the game (dev Discord citation on the wiki page).

### 2.5 What attacking the corruption does / doesn't do

- Pushing corruption back does **not** remove enemy buildings or roads; villagers passing them will fight/get fought.
- Monsters do not respawn from destroyed corrupted buildings unless/while drones rebuild them.

---

## 3. Wave / raid ("nightly attack") logic

### 3.1 When attacks happen

- **Every night** monsters spawn and attack the village (wiki Quick Guide, v31e): "Enemies will spawn and attack your village every night (on Traditional — starting from the second night)."
- They spawn from **corrupted buildings** (completed graveyards being the main one), not from map edges or portals.
- Mode modifiers (see §6): Survival = night 1 onward; Traditional = night 2, fewer; Nightmare = monsters pre-placed on the map at start + higher spawn rates; Peaceful = none.

### 3.2 Scaling

- **Per-region power/number scaling = Corruption Threat** (§2.4): grows with the day counter and with containment of corruption. This is the game's "spawn budget" — not village wealth (explicitly excluded by the wiki).
- **Per-mode scaling**: Traditional "less numerous"; Nightmare "spawn at higher rates" and pre-spawned monsters.
- Escalation also comes from **corrupted building growth**: more graveyards = more spawn points + more drones = bigger nights.
- **Monster levels rise over time** (Steam community-announcement patch note: "Less monsters now spawn overall, but their levels increase" — a deliberate 1.x/2.x rebalance from swarms to stronger individuals). Blood Moon slimes match this level.
- No published formula exists for exact spawn counts per night — see §8.

### 3.3 Special-night modifiers

| Event | Effect on waves |
|---|---|
| **Full Moon** | Monsters spawn but **do not walk to your village**; essence generates on the ground; monsters keep accumulating so "you might face **twice the amount of monsters** during the next night". Counter: Grab monsters into a tower-lined maze during the moon. |
| **Eclipse** | Replaces midday; monsters **spawn and attack continuously** (day raid). |
| **Blood Moon** | Random, **night-only**. Blood rains; **Blood Slimes spawn in or near your village** at a level matching corruption enemies; **normal corruption spawns continue**; villager ghosts spawn at a much higher rate (Resurrect spell food). |
| **Meteor Shower** | Meteors damage/ignite buildings, villagers, terrain; some meteors are **fire elementals**. |

### 3.4 Attacker pathing (confirmed — the Quick Guide claim verified)

Wiki Walls page:

> "Monsters will always route the **shortest open route** if available; if there is none they will attack the **path of least resistance (Time to break through)**."

Wiki Quick Guide (v31e) — the wall-maze rule:

> "Surround your village with wood or stone walls and only leave a small opening… **If monsters don't have a clear path to your village center, they will destroy walls and buildings to reach it. If there's a clear path, they will not destroy any walls.**"

Confirmed details and consequences:

- The attackers' goal anchor is the **village center** (camp/castle).
- **Maze funneling is the core intended defense**: leave one winding open path through walls; monsters path down it under tower fire instead of attacking walls.
- "Least resistance" = shortest **time-to-break-through** — i.e., monsters evaluate wall HP/material when forced to breach. (Exact per-material break-time formulas unpublished.)
- Fire Elementals are the exception on water maps: they smash blockers rather than detour into water (§1.7).
- Spectres ignore the maze entirely for wood/stone/fences (§1.6) — late-game mazes must be crylithium or accept spectres inside.
- Community rule of thumb (r/risetoruins maze thread): **don't oversize the maze** — "As you expand your maze, you increase what monsters are willing to do to go around you" (i.e., huge mazes trigger wall-breaking instead of pathing).
- Attack direction: toward village center from wherever the monsters spawned (corrupted buildings), i.e., **not** tied to map edges except that corruption itself spawns edge-first (§2.2).

---

## 4. Defense catalog

### 4.1 Towers (player)

All player towers have 4 tiers; tier 4 comes in **Fire / Ice / Lightning** elemental variants
(wiki images: `BowTower4F/4S/4P`, `BallistaTower4r/4i/4l`, `SlingTower4F/4I`, etc.).
"Reload rate" units are not stated on the wiki (likely game ticks — treat as relative).
Infobox `Range` fields (12/16) sometimes disagree with the stat tables below; the tables
are the commonly cited values.

| Tower | Damage per shot (T1→T4) | Type | Range (T1→T4) | Reload (T1→T4) | Ammo / energy | Shots per ammo | HP (T1/T2/T3/T4) | Notes |
|---|---|---|---|---|---|---|---|---|
| **Bow Tower** | 20–30 → 25–35 → 30–40 → 30–40 (+10–15 fire/ice/poison) | Piercing | 16 / 18 / 20 / 20 | 150 / 130 / 110 / 110 | Ballistae bolts | **20 arrows per bolt unit** | 1870/2200/2380/2600 | The starter tower; storage 4/6/8/8; skeleton-resistant |
| **Ballista Tower** | 75–150 → 100–175 → 125–200 → 125–200 (+50–75 fire/ice/poison) | Piercing | 32 / 36 / 40 / 40 | 800 / 650 / 550 / 550 | Ballistae bolts | **10 bolts per unit** | 2330/2710/3120/3620 | Fires over **all** walls & mountains; ~3× slower than bow; as tall as a curtain wall so other towers **cannot fire through/over it**; community "best tower" |
| **Sling Tower** | 6–8 → 7–9 → 8–10 → 8–10 (+4–6 ice/lightning) or T4 Fire: 10–15 pierce +10–15 crush +20–30 fire + **25% splash** | Crushing | 12 (all tiers) | 350 / 300 / 250 / 250 | Stone balls | 10 shots per unit | 1870/2160/2350/2620 | **Cannot shoot over walls**; can shoot through the open center of a closed gate; projectile damages **every tick while in contact**, so dense hordes take massive damage |
| **Spray Tower** | 1–2 → 2–3 → 3–4 → 3–4 (+1–2 fire/ice/lightning) | Crushing | 10 (all tiers) | **5 (all tiers)** | Stone balls | **300 sprays per unit** | 2070/2230/2430/2710 | Rapid-fire shotgun; hits multiple enemies; effective at 1–3 tiles; best where monsters are already aggroed |
| **Bullet Tower** | 7–10 → 9–12 → 12–15 → 12–15 (+4–6 fire/ice/lightning) | Crushing | 10 (all tiers) | 30 (all tiers) | Stone balls | **100 bullets per unit** | 1870/2160/2350/2620 | Good all-round; anti-skeleton; out-ranges fire elementals |
| **Elemental Bolt Tower** | 20–40 → 25–45 → 30–50 → 5–10 (+30–50 magic fire/ice/lightning) | **Magic** | 14 (all tiers) | 60 / 55 / 50 / 50 | **Energy** | 10 energy/shot | 2170/2350/2650/3100 | Anti-slime & anti-spectre specialist (they resist physical) |
| **Phantom Dart Tower** | 4–6 → 6–8 → 8–10 → 8–10 (+4–6 magic fire/ice/lightning) | **Magic** | 10 (all tiers) | 60 (all tiers) | Energy | **3 energy/shot** | 1775/2080/2200/2350 | 1×1 footprint; cheap spam tower |
| **Static Tower** | 10–50 "magic lightning" (all tiers) | Electric | 5 / 5 / 7 / 7 | 150 / 130 / 110 / 90 | Energy | 16/14/12/10 per shot | 2120/2240/2400/2660 | **Damages ALL enemies in range** (aura-like); also hits many at once |
| **Banish Tower** | — (no damage) | Teleport | 5 (all tiers) | 500 / 400 / 300 / 200 | Energy | 50/shot | 2120/2240/2400/2660 | **Teleports an enemy to a random map location** (never onto desirability > 0 tiles); community considers it weak |
| **Attract Tower** | — (utility) | Teleport resources | 18 / 20 / 22 / 24 | 160 / 135 / 110 / 85 | Energy | 25/20/15/10 | 2120/2240/2400/2660 | Pulls resources (incl. dropped equipment in corruption) to it; not a weapon |
| **Recombobulator Tower** | Heals **25% of golem max HP** | Support | 8 / 8 / 10 / 12 | 260 / 210 / 160 / 110 | Energy | 25/20/15/10 | 1945/2270/2730/3180 | Attracts & heals friendly golems |
| **God Tower** (spell-summoned) | Bow-tower-like | Piercing | — | — | **Unlimited ammo** | — | — | Costs 1000 influence + 1000 maintain; dispellable |

**Ammo economy:** Ballistae bolts are crafted at the **Bowyer** (wood; fletcher workers;
"maintain 5" recommended early). Stone balls are made at the **Tumbler** ("rock tumbler").
Energy comes from **Essence Collectors** (energy 300/500/700 by tier). Towers' `MaxStorage`
is ammo capacity 4/6/8/8 by tier.

### 4.2 Walls & gates

| Wall | HP | Cost | Notes |
|---|---|---|---|
| Wood Fence | **100** | 1 wood per section | Doesn't count vs building cap; spectres pass through |
| Stone Wall (Fence) | **200** | 2 stone per section | Doesn't count vs cap; spectres pass through |
| Curtain Wall | **300** (wiki "300?") | 3 cut stone per section | Doesn't count vs cap; only ballista shoots over it; **blocks fire elemental line of fire**; spectres pass through per current wiki (older text said it blocked them — patch-conflict) |
| Trashy Cube Wall | **300** | 3 Trashy Cubes, built by Cube-E Golem | Shot-over by most towers; does NOT block spectres; ties 3rd–5th strongest with Crylithium & Curtain walls |
| Crylithium Wall | (not published; >300 by ordering statement) | crylithium (from Crystillery) | **Spectres can't cross**; towers/ranged fire over it |
| Crylithium Curtain Wall | (not published; strongest wall) | crylithium + cut stone | **Spectres can't cross**; only ballista fires over it |
| Wooden Gate / Stone Wall Gate | (not published) | counts vs building cap | **Villagers, nomads and golems pass; monsters do not** (monsters will attack it if it blocks their only path) |

Pathing rule reference: §3.4. (Quick Guide recommends a wood/stone ring with one opening.)

### 4.3 Villager combat (guards, weapons, animals)

- **Guards:** the Barracks was **removed** and "somewhat replaced with the **Ranger Lodge**" (wiki Buildings page). Ranger Lodge: staffs 6/12/16 **rangers** (T1–T3), HP 2260/2420/2710, range 24, lodge doubles as housing, and **rangers patrol the village for monsters** and capture wild animals. Fully upgraded lodge includes a small bow tower. The **Outpost** (InDev 27 era) was a smaller barracks with guard slots + a small bow tower at max level (current status on wiki: stub).
- **Weapons** (wiki Items): **Wood Sword** (board, Toolsmithy) → slashing; **Iron Sword** (iron ingot) → slashing; **Bow** (wood + silk; 200 uses) → piercing; **Quiver** (wood + feather; 40 arrows). Unarmed villagers deal crushing damage and are "less effective than dedicated guards".
- **Armor:** Iron Chest/Helmet/Shield (Armorsmithy); Leather Chest/Helmet, Wood Shield (lootboxes/marketplace/monster drops). Perk "Mushu's Barrier" (+10% damage resistance) shows a global resistance stat exists for villagers.
- **Animals that fight:** **Doggos** "will attack any enemy in their vicinity"; **tamed Rous** "attack any Enemies they encounter"; Beefalo/Entler/Clucker are not combat units (not documented as fighting).
- **Golems** (6 types): **Stone/Rock golem** — high HP, high damage, very slow (crushing); **Wood golem** — fast, medium HP, melee (crushing); **Crystal golem** — fast, ranged **magic** missiles (fragile); produced by their **Combobulators** using energy (patch 2d: golem generation 50% slower, same total energy cost). **Holy Golem** — summoned by spell, fights enemies; **Labor golem** — summoned, non-combat. Summoned/combobulated golems **permanently reduce max influence while alive** (dispel to recover). At highest combobulator level golems "shoot magic missiles". Small chance any golem spawns as a **doggo ("roggo") variant**.
- **Fire Pits / Lights** extend building/corruption-resistance range and — key defensive property — "**monsters will not attack them**" (Fire Pit: HP 600, range 12, 6 wood; recommended corruption-encirclement tool).

### 4.4 Repairing

- **Maintenance Building**: staffs 4/6/8 **Maintainers** who "exclusively repair buildings and roads" (HP 2180/2300/2540, range 16). This is the during/after-siege repair mechanic.
- **Mend spell**: repairs golems, buildings and walls in radius 6 for ~1020 ticks (cost 800 influence, 0.5 s cooldown); patch 2d added "Mend spell now puts out all fires on buildings when cast".
- Villagers also repair damaged structures as a general behavior (God-XP enum lists "Repairing Buildings"; the corruption-spawn advice thread says to unassign builders so they don't repair a camp you're trying to demolish).
- Monsters/corrupted drones do **not** repair their buildings (but drones may upgrade them, §2.3).

### 4.5 Community defense meta (Steam "Defenses feel weak" thread, page 3)

- **Ballista** = backbone: snipes stray drones, softens hordes, only tower over curtain walls.
- **Bow towers** = early game + support range behind other towers later.
- **Bullet towers** = anti-skeleton (crushing, fast fire), out-range fire elementals.
- **Spray towers** = point-blank (1–3 tiles), place where golems/towers already hold aggro.
- **Sling towers** = "potentially the strongest tower in the game" when set up right (tick-based projectile damage through a gate chokepoint); can't shoot over walls.
- **Fire elementals** are the siege-breaker people complain about (towers "out-scaled"); curtain-walling your static/magic towers is the standard answer.
- Late game, higher building caps and **mazes are effectively mandatory**: "If you don't make a maze you can't get very far."

---

## 5. Combat math

### 5.1 Damage types (wiki Damage Types page, verbatim structure)

| Type | Sources (player side) | Sources (enemy side) | Effect notes |
|---|---|---|---|
| Regular | — | game-mechanic damage | e.g., aging villagers/golems losing HP |
| Crushing | Unarmed villagers; stone & wood golems; **sling, spray, bullet towers** | headless/slime/zombie melee (implied by skeleton's "blunt" weakness) | — |
| Slashing | Villagers with swords (wood/iron) | — | — |
| Piercing | Villagers with bows; **bow and ballista towers** | — | — |
| Fire | Fire-pit/fire hazards; T4 tower elemental add-ons | fire elemental fireballs | **Damage over time**; ignites buildings |
| Ice | T4 ice towers; Cold Aura spell | — | **Slows, then stops (freezes)** enemies |
| Electric | **Static towers** | — | — |
| Poison | — | **Slimes** | DoT until cured (medic/healing aura) |
| Blight | — | **Zombies** | DoT; **villager/doggo dying while blighted may rise as a zombie**; curable by medics/healing aura |
| Magic (non-elemental) | **Crystal golems, elemental bolt & phantom dart towers**; Magic Bolts spell | — | bypasses physical resistances (slimes/spectres) |
| Magic fire / magic ice / magic electric | T4 elemental tower add-ons (magic variants) | — | elemental versions on the magic plane |
| Water | drowning (environment) | — | hard-counter to fire elementals |
| Dysentery / Nutrients | dirty water / starvation | — | villager-sim damage, not combat |

### 5.2 Resistance model

Monster pages express resistances/vulnerabilities as **flat percentages**: e.g., Skeleton
"75% Piercing" (a piercing hit deals 25% damage), "50% Crushing" (a crushing hit deals
150%). Resist and vulnerability are additive per hit type. No armor formula beyond this
percentage model is published for monsters; villager-side has a "Damage Resistance" perk
stat (Mushu's Barrier +10%).

### 5.3 Ranges and AoE

- Fire elemental: 8 tiles (dev-confirmed), RNG approach distance 4–8; projectiles blocked by curtain walls.
- Splash: only documented AoE is Sling T4 Fire's "25% splash damage"; Static Tower hits everything in radius; Spray Tower hits multiple per shot.
- Ballista lofts over everything; Bow fires over walls but not curtain walls; Sling/Bullet/Spray cannot fire over walls at all (sling's closed-gate center gap is the exception).

### 5.4 Unknown combat numbers

Exact monster HP/damage/attack-speed tables, tower tick-lengths, wall break-through times,
and monster level→stat curves are **not published** — needs video frame-analysis or
playtesting (§8).

---

## 6. Difficulty effects on monsters/waves (wiki Game Modes)

| Mode | Monster behavior |
|---|---|
| **Peaceful** | No monster spawns at all. |
| **Traditional** | Monsters start **second night**; "less numerous". Corruption spawn delayed 1 day. Recommended for first-timers. |
| **Survival** | The "default". Monsters start spawning **first night**; corruption spawns as soon as camp is placed. |
| **Nightmare** | Monsters are **already on the map** at start and **spawn at higher rates**; full moons are **less frequent**; summer/winter are 7 days instead of 5. |
| **Custom** | Player-set difficulty parameters (retains god perks; mode progress is per-mode). |
| **Sandbox** | Mechanics playground (time of day control, resource spawning) — recommended for testing towers. |

Difficulty also gates **Corrupted Tile appearance** ("depending on your game's difficulty
eventually Corrupted Tiles spawn in alongside with a few Drones") and per-region corruption
spawn timing (§2.2).

---

## 7. Special events ("bosses")

There are **no raid bosses or siege-style special monsters** in Rise to Ruins. What exists:

| Event | Monster impact |
|---|---|
| **Blood Moon** (random, night-only) | Blood rain visual; **Blood Slimes** (red) spawn in/near the village at corruption-matching level; normal corruption spawns continue; villager ghosts spawn at a much higher rate. The closest thing to a "horde night". |
| **Full Moon** | Peaceful for monsters (they don't march), essence on the ground, **~2× monsters next night**. |
| **Eclipse** (replaces midday) | **Continuous daytime spawning + attacks** — effectively a day siege. |
| **Meteor Shower** (disaster) | Area bombardment; some meteors are **fire elementals** that then join attacks. |
| **Lightning storm / Hail / Earthquake / Blight** (disasters) | Environmental damage; earthquake can spawn rocks; blight damages crops/villagers. Not monster events per se. |

---

## 8. Unknown — needs video/playtest reference

Nothing published for:

1. **Exact monster stat blocks**: HP, damage, attack speed/cooldown, move speed, per-level growth curves, STR/DEX effects for all 6 monsters + variants (child/small/large, zombie "variants").
2. **Nightly spawn-count formula**: how many monsters spawn per night as a function of day counter, Corruption Threat value, graveyard count, and difficulty. (Corruption Threat's *direction* is documented; its formula is not.)
3. **Corruption Threat numeric scale** (bar max value, growth rate per day, per-difficulty multipliers).
4. **Monster level system**: how levels are assigned, what they multiply (HP/damage/speed?), max level.
5. **Wall break-through times** ("path of least resistance (time to break through)") per material and monster DPS; and the maze-size threshold where monsters switch to wall-breaking.
6. **Tower reload-rate unit** (ticks vs seconds) and projectile speeds; tower targeting priority (nearest? strongest? random? — undocumented).
7. **Wall/gate HP for gates, crylithium walls, crylithium curtain wall** (only ordering "strongest" is stated).
8. **Guard/ranger combat stats** (sword damage values, bow damage, armor damage reduction %).
9. **Corrupted defensive tower** stats (range/damage of enemy towers that shoot at the village).
10. **Blood Moon frequency** and eclipse frequency; whether Full Moon's "2× next night" stacks.
11. **Loot tables**: exact monster drop rates for equipment/potions.
12. Monster **sprite sheets/animation frames** — the wiki hosts **no monster images at all** (see Media Inventory); sprites must come from game files or captured video (respect developer copyright; reference only).

---

## Media Inventory (wiki images — reference only, do NOT redistribute)

Monster sprite images: **none exist on the wiki** (Zombie/Skeleton/Slime/Spectre/Headless/
Fire Elemental/Enemies pages contain zero image files). Sprites must be captured from the
game itself for visual reference.

Defense & related images on the wiki (all under `https://rise-to-ruins.fandom.com/wiki/Special:FilePath/<name>`):

| File | Description |
|---|---|
| BowTower1/2/3/4F/4S/4P.png | Bow Tower tiers 1–3 + tier-4 elemental variants (F=P?; fire/shock/poison naming per wiki) |
| BallistaTower1/2/3/4r/4i/4l.png | Ballista Tower tiers 1–3 + tier-4 variants (rock/ice/lightning) |
| SlingTower1/2/3/4F/4I.png | Sling Tower tiers + fire/ice tier-4 |
| SprayTower1/2/3/4F/4I.png | Spray Tower tiers + fire/ice tier-4 |
| BulletTower1/2/3/4F/4I.png | Bullet Tower tiers + fire/ice tier-4 |
| ElementalBolt1/2/3/4F/4I.png | Elemental Bolt Tower tiers + fire/ice tier-4 |
| PhantomDartTower1/2/3/4F/4I.png | Phantom Dart Tower tiers + fire/ice tier-4 |
| StaticTower1/2/3/4.png | Static Tower tiers 1–4 |
| BanishTower1/2/3/4.png | Banish Tower tiers 1–4 |
| AttractTower1/2/3/4.png | Attract Tower tiers 1–4 |
| RecombobulatorTower1/2/3/4.png | Recombobulator Tower tiers 1–4 |
| Barracks1/2/3.png | Removed Barracks building, tiers 1–3 |
| WoodFence.png / StoneWall.png / CurtainWall.png | Wall tiers from the Walls page |
| Castle1.png … Castle15.png | Camp→Large Castle progression (village center, 15 tiers) |
| BallistaeBolts.png / StoneBalls.png | Tower ammunition icons |
| CorruptionResistance.png / Range.png / HitPoints.png / Desirability.png / Energy.png / Chest.png | Infobox stat icons used on defense pages |
| Reclaim.png | Placeholder graphic used on Graveyard / Blood Moon / Monsters pages (no real corrupted-building art on wiki) |
| Roggo golem.png | "Roggo" — rare doggo-variant golem |
| SpellGrab.png, SpellGodTower.png, SpellGodWall.png, SpellMeteor.png, etc. | Spell icons (combat-relevant: God Tower, God Wall, Meteor, Magic Bolts, Lightning Bolt, Flame, Cold Aura, Banish, Charm, Holy Golem) |

---

## Confidence & gaps

**High confidence (multi-source, incl. dev statements):**
- Monster roster (6 types + drone), resistance/vulnerability percentages, spawn-day ordering, wall-phasing and water/rain rules, fire elemental 8-tile range, corruption-spawn placement algorithm, Corruption Threat mechanic, "clear path → no wall breaking / no path → breach" pathing, nightly-attack cadence and mode differences, corrupted-buildings-as-spawn-points (100 HP/resource, upgrade-not-repair), wall HP for wood/stone/curtain/trashy (100/200/300/300), tower stat tables, Mend/Maintenance repairs.

**Medium confidence (single-source or patch-conflicted):**
- Curtain wall vs spectre (wiki contradicts itself across pages; current pages lean "spectres pass curtain walls, blocked only by crylithium walls"); Barracks→Ranger Lodge replacement timeline; Blood Moon "level-matched slimes"; "less monsters but higher levels" rebalance (from a search snippet of the Steam announcement feed, not read in full).

**Gaps (see §8):** all exact monster stats, spawn formulas, threat numbers, break-through times, tower targeting priority, gate/crylithium HP, event frequencies. A recreation should treat the published tower tables as the authoritative skeleton and validate monster combat feel against gameplay video.

---

## Sources

**Wiki (rise-to-ruins.fandom.com, CC-BY-SA):**
- <https://rise-to-ruins.fandom.com/wiki/Monsters> — roster, spawn days, splitting, phasing
- <https://rise-to-ruins.fandom.com/wiki/Enemies> — consolidated enemy page (drone behavior, fire elemental, slimes, skeleton, spectre, zombie)
- <https://rise-to-ruins.fandom.com/wiki/Zombie> · `/wiki/Skeleton` · `/wiki/Slime` · `/wiki/Headless` · `/wiki/Fire_Elemental` · `/wiki/Spectre` — resist/vulnerability tables
- <https://rise-to-ruins.fandom.com/wiki/Corruption> · `/wiki/Corrupted_Tiles` · `/wiki/Corruption_Threat` · `/wiki/Global_Corruption_Power` — spawning/corruption system
- <https://rise-to-ruins.fandom.com/wiki/Drones> · `/wiki/Graveyard` — corruption workers & spawn buildings
- <https://rise-to-ruins.fandom.com/wiki/Walls> · `/wiki/Trashy_Cube_Wall` · `/wiki/Cullis_Gate` — walls, pathing rule, wall HP
- <https://rise-to-ruins.fandom.com/wiki/Bow_Tower> · `/wiki/Ballista_Tower` · `/wiki/Sling_Tower` · `/wiki/Spray_Tower` · `/wiki/Bullet_Tower` · `/wiki/Elemental_Bolt_Tower` · `/wiki/Phantom_Dart_Tower` · `/wiki/Static_Tower` · `/wiki/Banish_Tower` · `/wiki/Attract_Tower` · `/wiki/Recombobulator_Tower` — tower stats
- <https://rise-to-ruins.fandom.com/wiki/Golems> · `/wiki/Ranger_Lodge` · `/wiki/Guards` · `/wiki/Barracks` · `/wiki/Doggo` · `/wiki/Rous` — friendly combat units
- <https://rise-to-ruins.fandom.com/wiki/Buildings> — walls/gates specs, **enemy buildings & spawn-point mechanics**, barracks removal
- <https://rise-to-ruins.fandom.com/wiki/Events> · `/wiki/Blood_Moon` · `/wiki/Game_modes` — events & difficulty
- <https://rise-to-ruins.fandom.com/wiki/Damage_Types> — damage type system
- <https://rise-to-ruins.fandom.com/wiki/Spells> — combat spells & influence economy
- <https://rise-to-ruins.fandom.com/wiki/Quick_Guide> — nightly attacks, wall-maze rule, ammo economy
- <https://rise-to-ruins.fandom.com/wiki/Items> · `/wiki/Lootbox` — weapons, armor, drops
- <https://rise-to-ruins.fandom.com/wiki/Camp_and_Castles> — village center tiers (attack anchor)
- <https://rise-to-ruins.fandom.com/wiki/Updates> — build 2d patch notes (fire elemental -33%, corrupted building targetability, corrupted towers fire again, zombie stat gains)
- <https://rise-to-ruins.fandom.com/wiki/Maintenance_Building> · `/wiki/Fire_Pit` · `/wiki/Essence_Collector` · `/wiki/Bowyer` — support structures

**Steam community (dev + players):**
- <https://steamcommunity.com/app/328080/discussions/0/1692659769961631397/> — dev Rayvolution: fire elemental range = 8; curtain walls block their shots; ballistas fire over
- <https://steamcommunity.com/app/328080/discussions/0/3393916911760635449/> — corruption spawn placement algorithm + per-mode corruption timing
- <https://steamcommunity.com/app/328080/discussions/0/1483232961038485043/> — spawn management (cullis gates, earthquake values, graveyard escalation)
- <https://steamcommunity.com/app/328080/discussions/0/3362406825543097300/?ctp=3> — "Defenses feel weak": tower meta, elemental handling, maze necessity
- <https://steamcommunity.com/sharedfiles/filedetails/?id=1733202053> — Beginner's Guide (InDev 33) [not fully read — timed out]
- Steam announcement feed (via search): "Less monsters now spawn overall, but their levels increase"

**Other:**
- <https://bernar.do/beating-the-corruption-in-rise-to-ruins> — corruption strategy guide [fetch timed out; cited via search snippets]
- <https://gameplay.tips/guides/8235-rise-to-ruins.html> — survival walkthrough [fetch timed out]
- r/risetoruins "Assorted tips and maze defense" — <https://www.reddit.com/r/risetoruins/comments/k8wwkx/assorted_tips_and_maze_defense/> [direct fetch blocked; quoted via search snippet: maze-size vs monster willingness to break walls]
