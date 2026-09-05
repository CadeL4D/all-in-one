# Destiny: world and survival balance

Current playable balance for the connected world. Base values live in `world.js`, recipes/buildings in `industry.js`, settlement systems in `depth.js`, and geography in `geography.js`. See [GAMEPLAY_AUDIT.md](GAMEPLAY_AUDIT.md) for the design review and six day-23 campaign results. Automated play verifies viable strategies, not final tuning or subjective fun.

## One world

The world is 384 × 192 tiles, divided into 24 adjacent 64 × 48 regions. The atlas and region views sample the same terrain. Coastlines, rivers and fords continue across survey lines; regions no longer generate their own ocean borders. Neighbor buttons scout the regions sharing an edge. Any region can be chosen.

Western woods are sheltered, central lands are wild, and eastern ridges are hostile. Western forest bands contain more timber; northeastern mountain bands contain more stone. Every starting clearing has ten timber and ten stone deposits nearby with accessible edges. Lowland fields yield 10 food per trip, woodland fields 8, highland fields 7 (rounded from 85% yield).

## Difficulty

| Mode | Timber / stone / food / water | First raid | Repeat | Initial monsters, sheltered | Wave cap | Monster health / damage |
| --- | --- | --- | --- | --- | --- | --- |
| Peaceful | 120 / 90 / 85 / 85 | Never | — | 0 | 0 | — |
| Settler | 110 / 80 / 70 / 70 | Day 5 dusk | Every 3 days | 2 | 7 | 85% / 75% |
| Survival | 95 / 70 / 55 / 55 | Day 3 dusk | Every 2 days | 3 | 10 | 100% / 100% |
| Onslaught | 75 / 60 / 45 / 45 | Day 2 dusk | Every day | 4 | 14 | 115% / 115% |

Settler gains one monster every two waves. Survival adds `floor((wave - 1) × 0.75)`. Onslaught adds one each wave. Wild regions add one monster and hostile regions two, without exceeding the mode cap. Local danger never shortens the preparation period or secretly multiplies damage.

The first wave contains only ravelers. Skulkers enter from wave 3 on Settler, wave 2 on Survival and Onslaught. Brutes enter from wave 4 on Settler, wave 3 on Survival, and wave 2 on Onslaught. Eligible waves use a brute in every fourth slot and a skulker in every third eligible remaining slot.

## Food, water and work

- On Survival, each villager uses 2 food and 1.5 water daily; totals round up. Six founders need 12 food and 9 water. A Commonpot reduces food demand by 30% without stacking.
- Peaceful uses 80% of normal supplies and Settler 85%. Both work 15% faster at harvesting, farming and drawing water. Onslaught consumes 120% of normal supplies. Construction costs and times stay the same across modes.
- Fields take 20 seconds of work; wells take 14 seconds and yield 8 water. Walking to work and carrying goods back takes additional time. Farms must scale with population, especially in highlands. Trails and compact placement have economic value.
- A timber deposit yields 8; a stone deposit yields 7. Storage starts at 180 per resource. Each Keepshed adds 100.
- A shortage reduces morale by 18; full daily rations add 4. Gardens add 6 per day, capped at 18. Low morale slows villagers, never monsters. Travelers need food, water, spare beds and at least 50 morale.

## Monsters and defenses

| Monster | Base health | Base damage every 1.5 seconds | Speed, tiles/second off-road | Survival tower shots |
| --- | --- | --- | --- | --- |
| Raveler | 36 | 8 | 1.008 | 2 |
| Skulker | 24 | 5 | 1.575 | 2 |
| Brute | 80 | 15 | 0.714 | 5 |

Farwatch towers deal 18 damage every 1.8 seconds within 11 tiles, spending one stone per shot. The Village panel forecasts the next wave's composition and minimum ammunition; overlapping coverage and travel routes determine whether towers can actually intercept it. Walls buy time but must leave routes for workers. Monsters try different entry sides in successive waves and fall back to reachable land when a coast blocks an approach. Remaining monsters retreat after 90 seconds; damaged buildings recover slowly out of combat.

Each starting budget covers a cottage, well, farm, timber yard and tower, with ammunition left for the first sheltered wave. Onslaught leaves very little spare timber: gathering early matters. Quarries sustain ammunition; adding towers without supplying stone will fail.

## Save behavior and limits

Each region/difficulty combination keeps separate progress. Changing difficulty in the atlas selects that mode's save or starts a new one; it does not overwrite another mode. Old standalone saves remain available in Your villages with their original terrain and stocks. Saves without a difficulty migrate to Peaceful or Survival according to their original setting.

Only the active village simulates. Supply convoys deliver to started neighboring villages in the same world and difficulty without advancing the recipient's clock. Inter-region migration and background corruption are not implemented.

## Verification

Run `npm test` in `website`, and `npm run test:browser` with that folder served on port 4173.

Coverage includes exact atlas-to-region terrain, shared adjacency, seed variation, legal founding sites and accessible materials in all 24 regions across four seeds, reachable raid entry, bounded waves, mode persistence, shortage consequences, protected versus unprotected openings, and crop tradeoffs. Scripted Survival villages survive through day six in sheltered woodland and through day five in lowland/highland; a prepared Onslaught opening survives its first two nights. Browser checks cover difficulty previews, map zoom, neighbor selection, independent saves, mobile controls and offline reload.


## Six-chapter progression and seasonal economy
The old day-four promise remains a keepsake; it no longer replaces the next objective. Four persistent chapters lead through founding, supply/defense, winter reserves, and twelve villagers surviving into day 17. Two more cover a working industrial town and reclaiming the frontier. Each chapter grants 30 influence capped at current capacity, once only. Completing all six earns the Hearthkeeper title; existing villages retain their progress and buildings.

Seasons last four days: Spring crops 100%, Summer 85% and water demand 125%, Autumn crops 125%, Winter crops 50%. Winter starts on day 13; a warning arrives on day 11. Farms continue producing in winter to avoid a total food dead end. The calendar and forecast are visible in Village.

One upgrade per cottage (+2 beds), field (+50% output), well (8 to 12 water), store (+100 capacity), or tower (18 to 27 damage per stone). Upgrades take 16 worker seconds, cost timber/stone, and persist across saves. Repairs take eight worker seconds, four timber and two stone, restoring up to 60 condition. Passive repair slowed to .08/second so repairs and Mend have a purpose. Workers finish their current jobs before taking a project.

A full-cycle integration scenario uses real building costs, construction, transport, food, summer demand, upgrades, repairs and raids. It completes the four chapters in sheltered Survival with additional stone marking and work-priority changes. This establishes a viable strategy, not universal balance across seeds or proof of subjective fun. Existing tests also cover Onslaught's opening and differing regional crop yields.

Placement now preserves access to existing buildings, including construction sites. The advisor recommends marking more stone below 12 ammunition, even during later chapters. New mechanics do not add another permanent resource bar or mandatory setup screen.

Design reference: the Rise to Ruins wiki's Buildings and Kitchen entries describe housing/production upgrades and more efficient food use: https://rise-to-ruins.fandom.com/wiki/Buildings and https://rise-to-ruins.fandom.com/wiki/Kitchen . These informed connected choices; all values and the chapter campaign here are original to Destiny. Some wiki pages are outdated or incomplete, so their numerical values were not copied.

## Connected settlement additions

| System | Current values |
| --- | --- |
| Sawmill | 4 timber → 2 planks in 10 working seconds; default target 24 |
| Forge | 2 planks + 2 stone → 2 tools in 14 working seconds; default target 12; preserves 12 stone |
| Kitchen | 4 food + 1 water → 3 meals in 12 working seconds; default target 24; pauses below 12 raw food; each meal substitutes 2 food at dawn |
| Tools | 25% faster work for 10 completed jobs; equipment reserve selectable at 0, 2 or 6 |
| Quarry | 4 renewable stone per 18 working seconds below 60 stock; upgrade costs 18 timber/14 stone and yields 6 |
| Forester | One tree per 16 working seconds on safe open land; stops at 45% forest coverage |
| Infirmary | Every 8 working seconds, 2 food + 1 water heals nearby patients by 30 within 7 tiles |
| Guardian | 25 influence; 110 health; 16 damage per 1.2 seconds; 90-second lifetime; maximum two |
| Frontier | Extra raid pressure +1 from day 9, +2 from day 13; bounded by mode cap; a beacon within 13 tiles suppresses it |
| Rift expedition | 6 planks + 2 tools; 24 working seconds; permanent seal and 35 influence |
| Shrine | 6 food; 12 working seconds; 20 influence and one permanent blessing choice |
| Blessings | Industry +10% work; Shelter faster rest; Sentinel +3 tower damage |
| Convoys | 20 timber/15 stone/15 food/15 water; 30 seconds of sender simulation; at most three pending; recipient overflow retained in crates |

Villagers start with 100 health and energy. Active work drains energy; home rest recovers it. Injured workers seek care, nearby monsters can wound or kill them, and nourishment affects recovery. Arrivals remain gated by spare beds, morale and supplies, with one arrival at dawn and a ceiling of 48 citizens.

The six expanded campaign scenarios all reached day 23 with twelve villagers and all six chapters. Onslaught required additional mining, towers and active guardians. Full results and limitations are recorded in [GAMEPLAY_AUDIT.md](GAMEPLAY_AUDIT.md). Run `npm run test:balance` to regenerate daily measurements and `npm run test:depth-browser` to verify the new interfaces and delivery between actual saves.
