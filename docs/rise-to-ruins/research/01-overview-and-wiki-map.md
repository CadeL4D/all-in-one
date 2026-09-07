# Rise to Ruins — Research 01: Game Overview, History, Modes, Progression & Wiki Map

> Master reference for the mobile recreation project. Scope of this doc: game identity, history, design lineage, core loop, **game modes**, **world map/regions**, **difficulty**, **progression/meta systems**, complete **Fandom wiki index**, and **media inventory**.
> Out of scope (indexed only): buildings/economy, villager simulation, monsters/defense, audiovisual presentation — covered by other research docs.
> Research date: 2026-09-07. Steam appid **328080**.

---

## 1. Game identity (verified facts)

| Field | Value | Source |
|---|---|---|
| Title | **Rise to Ruins** | [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins) |
| Former title (verified) | **Retro-Pixel Castles** (until Jan 2017) | [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins); [Steam rename announcement, Dec 12 2016](https://steamcommunity.com/app/328080/eventcomments/1630790506914322727) |
| Former title (claimed, NOT verified) | "Villagers" — see §12 Confidence & gaps. Kickstarter (Sep 2014), early press (Oct 2014) and SteamDB all use "Retro-Pixel Castles"; no source found tying app 328080 to the name "Villagers". Note a *different* village-builder called *Villagers* exists (2016) | research for this doc |
| Developer | **Raymond Doerr**, handle **"Rayvolution"**, solo developer (ex-Lockheed Martin avionics technician; taught himself Java in 2013) | [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins); [GamingOnLinux 2021-03-16](https://www.gamingonlinux.com/2021/03/the-developer-of-rise-to-ruins-is-absolutely-mad-and-has-secured-funding-for-their-games/); [AMA 2019](https://www.reddit.com/r/IAmA/comments/did8rl/i_am_a_oneman_game_developer_of_rise_to_ruins_and/) |
| Publisher | **SixtyGig Games** (Doerr's own one-man company; "DRM free independent game developer") | [Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/); [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins) |
| Composer | **José Ramón "Bibiki" García** (all music; sold separately as "The Living Soundtrack!" DLC, $2.99; game+bundle $16.99) | [AMA](https://www.reddit.com/r/IAmA/comments/did8rl/i_am_a_oneman_game_developer_of_rise_to_ruins_and/); [Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/) |
| Kickstarter | Sept 2014, "Retro-Pixel Castles — Village Survival Mayhem!", goal **$5,000**, raised **$10,163** | [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins); [archived Kickstarter page](http://web.archive.org/web/20140923091930/https://www.kickstarter.com/projects/1385547263/retro-pixel-castles-village-survival-mayhem) |
| Steam Early Access | **27 October 2014** (as Retro-Pixel Castles, greenlit via Steam Greenlight) | [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins) |
| 1.0 release | **14 October 2019** ("Release 1 — The Milestone Update"; announcement dated Oct 13) | [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins); [Steam announcement](https://store.steampowered.com/news/app/328080/view/3712711277286541677) (news hub); [release post](https://steamcommunity.com/games/328080/announcements/detail/3307256771838552765) |
| Latest public build | **Update 2d** (2023-09-19) — final Steam news post to date; the wiki's Updates page also lists "Current Build - 2d" | [Steam news RSS](https://store.steampowered.com/feeds/news/app/328080/); [wiki Updates page](https://rise-to-ruins.fandom.com/wiki/Updates) |
| Engine | **Custom Java engine** on **LWJGL** (Lightweight Java Game Library); Steam ships bundled Java 8+; dev is now building a successor engine "Rayvo2D" for the sequel | [itch.io tech list](https://rayvolution.itch.io/risetoruins); [Steam sysreqs](https://store.steampowered.com/app/328080/Rise_to_Ruins/); [Update 2 post](https://store.steampowered.com/news/app/328080/view/3689064842520572199) |
| Platforms / stores | Windows, macOS, Linux (64-bit) on **Steam**, **GOG**, **itch.io** | [Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/); [PCGamingWiki](https://www.pcgamingwiki.com/wiki/Rise_to_Ruins); [itch.io](https://rayvolution.itch.io/risetoruins) |
| Price | **$14.99 USD** (raised for 1.0; the EA price was lower with a standard 50% discount that became 33%) | [Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/); [Road to Release 1 post, 2019-02-24](https://store.steampowered.com/news/?appids=328080&appgroupname=Rise+to+Ruins&feed=steam_community_announcements) |
| Genre (self-described) | "A brutal godlike village sim that melds the **god game, management, and tower defense** genres"; Wikipedia classes it city-building/strategy with survival and god-game elements | [Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/); [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins) |
| Steam tags | Tower Defense, Colony Sim, City Builder, Strategy, Survival, Pixel Graphics, Base Building, God Game, Simulation, Indie, Sandbox, Singleplayer, 2D, Resource Management, Retro, Roguelike, Great Soundtrack, Level Editor, Soundtrack | [Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/) |
| Steam reviews (2026-09-07) | **7,757 total, 6,802 positive (87.7%) — "Very Positive"**. Store page shows 87% of 5,102 English reviews | [Steam appreviews API](https://store.steampowered.com/appreviews/328080?json=1&num_per_page=0&language=all&purchase_type=all); [Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/) |
| itch.io rating | **4.7/5 from 45 ratings** | [itch.io](https://rayvolution.itch.io/risetoruins) |
| Steam features | Single-player, **113 Steam Achievements**, Steam Trading Cards, Steam Cloud, **Level Editor**, Steam Workshop support, Family Sharing | [Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/); [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins) |
| DRM / DLC stance | "DRM free… no always-online logins or registration codes"; "I believe DLC is greedy" — all post-release content free | [Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/); [Free Content Patches post, 2020-01-02](https://store.steampowered.com/news/app/328080/view/25923165) (news hub) |
| Sales (dev-disclosed) | **$2M+ gross in first 5 years** (AMA, Oct 2019); **$1.5M net by Mar 2020**, "a few hundred thousand copies" (GamingOnLinux, Mar 2021) | [AMA](https://www.reddit.com/r/IAmA/comments/did8rl/i_am_a_oneman_game_developer_of_rise_to_ruins_and/); [GamingOnLinux](https://www.gamingonlinux.com/2021/03/the-developer-of-rise-to-ruins-is-absolutely-mad-and-has-secured-funding-for-their-games/) |

### Reception / coverage highlights
- No aggregate Metacritic/OpenCritic score located (indie-press-only coverage). Press cites found: Destructoid (2014-10-17, "…all the work of just one person"), PCGamesN (2014-10-31), Hardcore Gamer (2014-10-11, "Endless Survival Is Impossible In Retro Pixel Castles"), GamingOnLinux (2016, 2017, 2019, 2021), Rock Paper Shotgun ("Unknown Pleasures" 2019-10-25; listed in "The best building games on PC", 2020-08-25). Source: [Wikipedia refs](https://en.wikipedia.org/wiki/Rise_to_Ruins) and [Steam news feed](https://store.steampowered.com/feeds/news/app/328080/).
- Dev did a public AMA with full sales transparency: [r/IAmA, Oct 15 2019](https://www.reddit.com/r/IAmA/comments/did8rl/i_am_a_oneman_game_developer_of_rise_to_ruins_and/).

---

## 2. History & design lineage

### 2.1 Timeline
| Date | Event | Source |
|---|---|---|
| 2013 | Doerr (avionics tech at Lockheed Martin, military background) teaches himself **Java** over 8-9 months of double shifts; saves ~$90k | [Funding Secured, 2021-03-15](https://store.steampowered.com/news/app/328080/view/5556851879153055460) (news hub) |
| Sep 2014 | Kickstarter "Retro-Pixel Castles — Village Survival Mayhem!" — goal $5,000, raised $10,163 | [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins); [archived KS page](http://web.archive.org/web/20140923091930/https://www.kickstarter.com/projects/1385547263/retro-pixel-castles-village-survival-mayhem) |
| Oct 2014 | Greenlit; **Steam Early Access 27 Oct 2014**; press: "all the work of just one person" (Destructoid) | [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins) |
| 2014–2019 | Open development: public "InDev" builds (InDev 10 → InDev 34) with road-map posts, public changelogs, community-driven features | [Steam news feed](https://store.steampowered.com/feeds/news/app/328080/); [wiki Dev Builds pages](https://rise-to-ruins.fandom.com/wiki/InDev_10) |
| 2016-12-12 | Rename announced: "Soon, Retro-Pixel Castles will be known as **Rise to Ruins**" (direction of game unchanged; logo kept similar for recognition) | [Steam announcement](https://steamcommunity.com/app/328080/eventcomments/1630790506914322727) |
| Jan 2017 | Rename goes live with InDev 24 ("The Upgrade Update") | [GamingOnLinux](https://www.gamingonlinux.com/2017/01/rise-to-ruins-previously-retro-pixel-castles-has-a-major-content-update-now-out/) |
| 2018 | InDev 31 "The World Update" (world map with multiple villages), InDev 32 localization/modding, InDev 33 new save system, InDev 34 hunting | [Steam news feed](https://store.steampowered.com/feeds/news/app/328080/) |
| 2019-02-24 | "The Road to Release 1" — plans: bio/hygiene/trash/fishing/hunting/cooking systems, workshop support, corruption redesign pre-1.0; procedural map generator, religion, bridges, per-map difficulty post-1.0 | [Steam news hub](https://store.steampowered.com/news/?appids=328080&appgroupname=Rise+to+Ruins&feed=steam_community_announcements) |
| 2019-10-14 | **1.0 "Release 1 — The Milestone Update"** | [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins) |
| 2020-01-02 | Free-patch policy: smaller, more frequent patches; "All future content will be 100% free" | [Free Content Patches post](https://store.steampowered.com/news/app/328080/view/25923165) (news hub) |
| 2020-03-23 | **Update 1 — "The Magic Update"**: full spell overhaul, ~10 new spells (God Tower, God Wall, Harvest, Holy Potatoes, Holy Wood, Construct, Divine Blessing, Dispel Golem…), Crylithium walls (block spectres), perk count doubled, perk rarity removed | [Steam news](https://store.steampowered.com/news/app/328080/view/26981594) (news hub) |
| 2020-07-19 | **Update 1b** — bug fix & tweaks (an "Update 1c" is also referenced by the dev in the 2021 funding post) | [Steam news RSS](https://store.steampowered.com/feeds/news/app/328080/); [Funding Secured](https://store.steampowered.com/news/app/328080/view/5556851879153055460) |
| 2021-03-15 | **"Funding Secured."** — dev stock-invested $200k → $2.5M to fund Updates 2, 3, 4 and a sequel codenamed **"Project Mary"**; admitted burnout/mental-health toll | [Steam news](https://store.steampowered.com/news/app/328080/view/5556851879153055460) (news hub); [GamingOnLinux](https://www.gamingonlinux.com/2021/03/the-developer-of-rise-to-ruins-is-absolutely-mad-and-has-secured-funding-for-their-games/) |
| 2022-01-11 | **"Plans Secured."** — diagnosed ASD Level 1 (Asperger's); explains 2020 burnout break; development resumes | [Steam news](https://store.steampowered.com/news/app/328080/view/3121557478192966379) (news hub) |
| 2022-03 → 2023-08 | Update 2 "Unstable" beta branch builds 1-4 | [Steam news RSS](https://store.steampowered.com/feeds/news/app/328080/) |
| 2023-08-26 | **Update 2 — "The Achievement Update"** (largest patch ever): 117-goal web / 100+ achievements, Faith system, Essence Altar + Occultists, chest economy rework; wife joins as SixtyGig art intern; **"Rise to Ruins 2"** and Rayvo2D engine publicly named | [Steam news](https://store.steampowered.com/news/app/328080/view/3689064842520572199) (news hub) |
| 2023-08-29 / 2023-09-19 | Update 2c, **Update 2d** (final news post to date; no 2024-2026 announcements found) | [Steam news RSS](https://store.steampowered.com/feeds/news/app/328080/) |

### 2.2 Design lineage (inspirations)
- Steam page: inspired by "**Black and White, Rimworld, and Dwarf Fortress** but not quite like any of them", with **Settlers** and **ActRaiser** named among classic inspirations; described as bridging "the depth of village sims with the fun of godlikes and the simplicity of RTS games." Source: [Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/).
- Wikipedia (from SteamDB-era source) lists influences: *Towns*, *Gnomoria*, *Warcraft*, *Banished*, *Dwarf Fortress*. Source: [Wikipedia](https://en.wikipedia.org/wiki/Rise_to_Ruins).
- Wiki main-page description: "a survival, tower-defense, village building game in which **you can never win, just survive for as long as possible**." Source: [wiki](https://rise-to-ruins.fandom.com/wiki/Rise_to_Ruins).
- Post-1.0 support story is unusually personal/documented: burnout, ASD diagnosis, self-funded future via stock gains, sequel announced. Sources: the two Steam posts and GamingOnLinux above.

---

## 3. Core loop

One sentence per the dev/store: by day, players grow a village of simulated villagers — placing a town center, gathering wood/rock/crystal/food/water, building housing, farms, defenses — while a spreading purple **corruption** on the map spawns monsters; every night monsters assault the village and the player acts as a god with **spells** (funded by essence/influence generated by villagers) to grab objects, smite, heal, wall off, and rescue nomads; the goal is not to win but to survive and grow, region by region on a 45-region world map, converting god experience into permanent perks. Losing villages is expected ("lose often, and learn from your failures"); progress in the form of perks/goals persists.

Sources: [Steam store description](https://store.steampowered.com/app/328080/Rise_to_Ruins/); [wiki Quick Guide](https://rise-to-ruins.fandom.com/wiki/Quick_Guide); [wiki Game modes](https://rise-to-ruins.fandom.com/wiki/Game_modes).

### Stated features list (Steam)
- God game + management + tower defense hybrid; pixel art
- Survival / Traditional / Nightmare / Peaceful / Sandbox / **Custom** modes
- Simulated villagers: jobs, needs, relationships, reproduction, equipment, combat
- Corruption system with monsters spawning nightly; corruption fights back (builds graveyards, towers, roads)
- **45-region world map** in themed biomes (Forest, Desert, Drylands…); start anywhere, "attempt to conquer the world"; hand-made maps + level editor
- Spells/god powers powered by essence; perks via god chests; lootboxes
- Weather and seasons (spring/summer/autumn/winter), temperature, disasters
- Trading with Catjeets at the Marketplace; DRM-free; free updates; soundtrack by Bibiki Garcia

Source: [Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/).

---

## 4. Game modes & difficulty

### 4.1 Mode list (6 modes; the modes ARE the difficulty levels)
| Mode | What it changes | Source |
|---|---|---|
| **Traditional** | Monsters start spawning on the **second** night and are less numerous. Recommended for first-timers / casual play | [wiki Game modes](https://rise-to-ruins.fandom.com/wiki/Game_modes); [Steam](https://store.steampowered.com/app/328080/Rise_to_Ruins/) |
| **Survival** | The "default"/intended brutal experience; monsters start spawning on the **first** night; frequent death expected | same |
| **Nightmare** | Monsters already on the map at start and spawn at higher rates; **full moons less frequent**; **summer and winter are 7 days long (instead of 5)**; "the masochist's mode" | same |
| **Peaceful** | **No monster spawns**; relaxed village management, no defense needed | same |
| **Sandbox** | Manipulate game mechanics live: change time of day, spawn resources/creatures, edit the map | same |
| **Custom** | Set difficulty to your own preferences — adjust **day length, season length, spawn rates** and other settings | [wiki](https://rise-to-ruins.fandom.com/wiki/Game_modes); [Steam](https://store.steampowered.com/app/328080/Rise_to_Ruins/) |

Key rules:
- **Game progress is bound to the mode**; switching mode switches your progress (per-mode save state). Source: [wiki Game modes](https://rise-to-ruins.fandom.com/wiki/Game_modes).
- Mode can be changed on the world map screen. Source: same.

### 4.2 Map / world structure
- The world map has **45 regions in 6 biomes**; each region offers its own difficulty and challenges; connected regions allow **migration and resource delivery** between villages (multiple simultaneous villages are supported). Sources: [wiki World Map](https://rise-to-ruins.fandom.com/wiki/World_Map); [InDev 30d notes](https://rise-to-ruins.fandom.com/wiki/InDev_30d).
- Biome groups per the wiki: **Desert (N)**, **Red Sands**, **Marsh (E)**, **Dry Lands (S)**, **Haven (W)**, **Forest (C)**, plus **Islands** (the page says "six biomes" but shows 7 headers; Red Sands reads as a desert sub-type). Source: [wiki World Map](https://rise-to-ruins.fandom.com/wiki/World_Map).

Complete region list (45) with wiki minimap images:

| Biome | Regions |
|---|---|
| Desert (N) | Merrowshore, Farley, SandySouth, Wyvernedge, Casas, Stonerock (Marsh hybrid) |
| Red Sands | Pryley, Silverhurst, Deepnesse, Hollow Isle, Wolfmere, Violetbank, Vertmist, Swyndell, Crystalcoast |
| Marsh (E) | Black Coast, Black Sands, Newdragon, Death Pass, Limestone, Nerstrand |
| Dry Lands (S) | Strongvale, Northoak, Wheatcastle, Silvercoast, Arid River, Goldmist, Wilderock, Greyby, Outlands (Forest hybrid) |
| Haven (W) | Enchanted Shoreline, Narrow Path, Woodhaven, Valencia, Azusa, Coastbridge (Desert hybrid) |
| Forest (C) | Quiet Forest, Greenham, Applemeadow, Gateway, Clearland, Loracre, Springland, Outlands (Dry Lands hybrid) |
| Islands | Survival Island |

Source: [wiki World Map](https://rise-to-ruins.fandom.com/wiki/World_Map). (Outlands appears twice as a hybrid; that is how the wiki tables it.)

- Maps are hand-made; players can make their own (level editor + Workshop). Map generation was planned as a post-1.0 feature (procedural map generator) — not verified as shipped. Sources: [Steam](https://store.steampowered.com/app/328080/Rise_to_Ruins/); [Road to Release 1](https://store.steampowered.com/news/?appids=328080&appgroupname=Rise+to+Ruins&feed=steam_community_announcements).
- World map trivia: the ocean contains hidden pixel-art references to other games (community-found: e.g. Duck Hunt). Sources: [wiki World Map](https://rise-to-ruins.fandom.com/wiki/World_Map); [r/risetoruins top post](https://www.reddit.com/r/risetoruins/).

### 4.3 Win / loss conditions
- **No victory**: "you can never win, just survive for as long as possible" (wiki main page); Steam: "you will lose often… learning from your failures."
- A **lost region can no longer be visited** (since InDev 30d). Source: [wiki InDev 30d](https://rise-to-ruins.fandom.com/wiki/InDev_30d).
- Clearing **all corruption** in a region makes it "free of corruption for ever." Source: [wiki Corrupted Tiles](https://rise-to-ruins.fandom.com/wiki/Corrupted_Tiles).
- Achievements/goals persist "through dooming the world" (i.e., losing). Source: [Update 2 post](https://store.steampowered.com/news/app/328080/view/3689064842520572199) (news hub).
- No separate challenge maps found; challenge comes from regions + modes. (See gaps.)

### 4.4 Time, events, disasters (difficulty modifiers)
- Calendar: days, **seasons** (spring/summer/autumn/winter, 5 days each in Survival/Traditional; 7 in Nightmare), temperature, 6 day-phases (Dawn, Morning, Midday, Evening, Dusk, Night). Source: [wiki Interface](https://rise-to-ruins.fandom.com/wiki/Interface); [wiki Game modes](https://rise-to-ruins.fandom.com/wiki/Game_modes).
- **Events** ([wiki Events](https://rise-to-ruins.fandom.com/wiki/Events)):
  - **Nomads** — arrive periodically; convert to villagers at village center; quantity scales with free housing, free jobs, food/water.
  - **Full moon** — monsters don't march on the village; essence spawns on the ground; spawns "bank up" for the next night.
  - **Blood Moon** — blood rains; red Blood Slimes spawn in/near the village; normal corruption spawns continue; villager ghosts spawn at a higher rate ([wiki Blood Moon](https://rise-to-ruins.fandom.com/wiki/Blood_Moon)).
  - **Eclipse** — replaces midday; monsters spawn and attack continuously.
  - **Disasters**: meteor shower, lightning storm, hail, earthquake, blight.
- **Corruption Threat** — per-region difficulty modifier: grows with the day counter; trapping corrupted tiles *increases* threat; higher threat = stronger/more numerous monsters. Displayed as a red UI bar. The old global "Global Corruption Power" was removed. Sources: [wiki Corruption Threat](https://rise-to-ruins.fandom.com/wiki/Corruption_Threat); [wiki Corrupted Tiles](https://rise-to-ruins.fandom.com/wiki/Corrupted_Tiles).

---

## 5. Progression systems

### 5.1 Village development — the Camp/Castle tier ladder (core "village level")
The town center ("Camp and Castles") is the village level: **15 tiers**, each upgrade raises build range, max buildings ("building slots"), storage, workers, and global speed bonuses; nomad frequency rises with it. Upgrading requires deliverable materials (wood/rock → boards/cut stone → iron ingots).

| Tier | Name | Max buildings | Storage | Workers | Bonus |
|---|---|---|---|---|---|
| 1 | Camp | 8 | 20 | 12 | — |
| 2 | Large Camp | 12 | 30 | 13 | +2% global speed / +4% building |
| 3 | Small Settlement | 16 | 40 | 14 | +3% / +6% |
| 4 | Large Settlement | 20 | 50 | 15 | +4% / +8% |
| 5 | Village Center | 26 | 60 | 16 | +5% / +10% |
| 6 | Large Village Center | 32 | 70 | 17 | +6% / +12% |
| 7 | Established Village Center | 38 | 80 | 18 | +7% / +14% |
| 8 | Small Keep | 44 | 90 | 19 | +8% / +16% |
| 9 | Large Keep | 50 | 100 | 20 | +9% / +18% |
| 10 | Established Keep | 56 | 110 | 21 | +10% / +20% |
| 11 | Small Stronghold | 62 | 120 | 22 | +11% / +22% |
| 12 | Large Stronghold | 68 | 130 | 23 | +12% / +24% |
| 13 | Established Stronghold | 74 | 140 | 24 | +13% / +26% |
| 14 | Small Castle | 80 | 150 | 25 | +14% / +28% |
| 15 | Large Castle | 86 | 160 | 26 | +15% / +30% |

Costs range from 6 wood + 6 rock (tier 1) to 256 rock + 64 cut stone + 8 iron ingots (tier 15). **Ancillaries** (extra town centers/storage) are limited to the current tier number (max 15). Source: [wiki Camp and Castles](https://rise-to-ruins.fandom.com/wiki/Camp_and_Castles); [wiki Ancillary](https://rise-to-ruins.fandom.com/wiki/Ancillary).

Other progression at village level: villager stats (Strength/Dexterity/Intelligence, level-ups), housing tiers, equipment tiers (wood→iron), food quality ladder (raw vegetable 25 → raw meat 50 → cooked meat 80 → rations 120). Sources: [wiki Villagers](https://rise-to-ruins.fandom.com/wiki/Villagers); [wiki Items](https://rise-to-ruins.fandom.com/wiki/Items); [wiki Ration](https://rise-to-ruins.fandom.com/wiki/Ration); [wiki Raw Vegetable](https://rise-to-ruins.fandom.com/wiki/Raw_Vegetable).

### 5.2 God/faith progression (meta level)
- **Essence → Influence**: villagers generate essence (from harvesting, deaths, praying); essence fills the influence bar; **max influence = 40 × living villagers**; influence is spent to cast spells. Sources: [wiki Essence](https://rise-to-ruins.fandom.com/wiki/Essence); [wiki Spells](https://rise-to-ruins.fandom.com/wiki/Spells).
- **God Experience (god XP)** — earned from nearly everything (nomads joining, buildings built/upgraded, spells cast, kills, births, etc.) and spent to **open chests on the World Map screen**, each granting a **Perk**. Source: [wiki God Experience](https://rise-to-ruins.fandom.com/wiki/God_Experience) (includes the developer-posted XP source list).
- **Perks** are *global boosts applying to all regions of the world map* — this is the main meta-progression between runs/regions. Update 1 more than doubled the perk list and removed perk rarity. Sources: [wiki Perks](https://rise-to-ruins.fandom.com/wiki/Perks); [wiki Bonuses from chests](https://rise-to-ruins.fandom.com/wiki/Bonuses_from_chests) (catalog of ~50 named perks with effects); [Update 1 post](https://store.steampowered.com/news/app/328080/view/26981594) (news hub).
- **Faith** (added in Update 2, 2023): villagers gain/lose faith from world events and god actions; high faith reduces panic; **Essence Altar** building + **Occultist** job generate essence via prayer; lightning/meteor outcomes shift faith. Source: [Update 2 post](https://store.steampowered.com/news/app/328080/view/3689064842520572199) (news hub).
- **Goals/Achievements** (Update 2): old goal system replaced by **117 goals on a huge unlock web**, each tied to a Steam achievement (store lists 113 achievements), awarding god XP; progress persists across lost villages. Sources: [Update 2 post](https://store.steampowered.com/news/app/328080/view/3689064842520572199) (news hub); [Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/).
- Chests: Update 2d raised chest cost 10% and award rate 33%; free chest slots unlockable. Source: [wiki Updates](https://rise-to-ruins.fandom.com/wiki/Updates).
- **Lootboxes** (in-region): spawn from magic circles; require a **Suspicious Key**; drop equipment/ammo/consumables/trash. Source: [wiki Lootbox](https://rise-to-ruins.fandom.com/wiki/Lootbox); [wiki Suspicious Key](https://rise-to-ruins.fandom.com/wiki/Suspicious_Key).

### 5.3 Between-runs / between-regions meta
- Perks, goals/achievements and god XP are global and persist through loss; mode is a separate save-state dimension (progress is per-mode).
- Multiple villages coexist on the world map; **Migration Way Station** (villagers move between regions) and **Courier Station** (courier golems ship resources to connected regions) replace the old "Limbo" god-storage mechanic (removed). Sources: [wiki Migration Way Station](https://rise-to-ruins.fandom.com/wiki/Migration_Way_Station); [wiki Courier Station](https://rise-to-ruins.fandom.com/wiki/Courier_Station); [wiki Limbo](https://rise-to-ruins.fandom.com/wiki/Limbo).
- There is **no unlock gating of buildings per map or per difficulty** found — buildings unlock via village/castle level and ancillary count; difficulty differences are mechanical (see §4.1), not unlock-based. (Caveat in §12.)

### 5.4 Spell list (god toolkit, with influence costs)
Full catalog on [wiki God Powers](https://rise-to-ruins.fandom.com/wiki/God_Powers) / [wiki Spells](https://rise-to-ruins.fandom.com/wiki/Spells) — indexed here, details out of scope:
- **Aid**: Divine Blessing, Harvest, Healing Aura, Holy Potatoes, Holy Wood, Mend, Motivate Land, Regenerate, Resurrect
- **Defensive**: Charm, God Tower, God Wall, Summon Holy Golem
- **Offensive**: Banish, Cold Aura, Earthquake, Flame, Lightning Bolt, Magic Bolts, Meteor, Storm
- **Utility**: Conjure Essence, Conjure Material, Construct, Dispel God Structure, Dispel Golem, Dissolve, Illuminate, Recall, Summon Labor Golem, plus **Grab** (the core telekinesis tool, default hotkey `)

---

## 6. WIKI MAP — complete index of rise-to-ruins.fandom.com

Wiki stats (via MediaWiki API, 2026-09-07): **148 page entries on Special:AllPages = 135 real articles + 13 redirects/case-variants**; **47 categories**; **326 files**; Russian interlanguage wiki exists. Main-page hub: [Rise to Ruins Wiki](https://rise-to-ruins.fandom.com/wiki/Rise_to_Ruins_Wiki). Sources: [Special:AllPages](https://rise-to-ruins.fandom.com/wiki/Special:AllPages), [Special:Categories](https://rise-to-ruins.fandom.com/wiki/Special:Categories), [api.php](https://rise-to-ruins.fandom.com/api.php).
URL pattern: every page below is `https://rise-to-ruins.fandom.com/wiki/<Title with underscores>`. Red-linked/nonexistent pages inside articles are not listed. "UC" = tagged Under Construction (many pages are stubs).

### 6.1 Game info & meta pages
| Page | Contents |
|---|---|
| [Rise to Ruins](https://rise-to-ruins.fandom.com/wiki/Rise_to_Ruins) | Wiki main article: game blurb (SixtyGig, Steam, 1.0 = 14 Oct 2019, "never win, just survive") |
| [Rise to Ruins Wiki](https://rise-to-ruins.fandom.com/wiki/Rise_to_Ruins_Wiki) | Main page: nav hub, category list, featured videos, article/file counters |
| [Navigation](https://rise-to-ruins.fandom.com/wiki/Navigation) | Hub page linking Getting Started, Interface, Game modes, World map, Mobs, Buildings, Magic, Resources/Items, Damage types, Events |
| [Quick Guide](https://rise-to-ruins.fandom.com/wiki/Quick_Guide) | Best practical beginner walkthrough (based on v31e): camp placement, harvesting, jobs, essence/spells, expansion, defense/mazes |
| [Getting Started](https://rise-to-ruins.fandom.com/wiki/Getting_Started) | Category-hub stub (UC) |
| [Controls](https://rise-to-ruins.fandom.com/wiki/Controls) | Default keyboard/mouse controls (as a control-map image) |
| [Interface](https://rise-to-ruins.fandom.com/wiki/Interface) | All UI panels explained: population, inventory/spells, weather & time, jobs, construction, data views |
| [Game modes](https://rise-to-ruins.fandom.com/wiki/Game_modes) | The 6 modes and exactly what each changes (see §4.1) (UC) |
| [Events](https://rise-to-ruins.fandom.com/wiki/Events) | Nomads, blood moon, full moon, eclipse, disasters (meteor/lightning/hail/earthquake/blight) (UC) |
| [Updates](https://rise-to-ruins.fandom.com/wiki/Updates) | Full changelog of the current build (Update 2d) incl. goals/faith/perk tweaks |
| [InDev 10](https://rise-to-ruins.fandom.com/wiki/InDev_10) | Archived EA-era changelog/announcements (2015-era; map packs, editor fixes) |
| [InDev 11](https://rise-to-ruins.fandom.com/wiki/InDev_11) | Archived changelog: modular AI rewrite, first monsters (slime, zombie), combat AI |
| [InDev 30d](https://rise-to-ruins.fandom.com/wiki/InDev_30d) | World map UI update notes; Maintenance Building + Key Shack added; lost regions unvisit-able |
| [Title Screen Trivia](https://rise-to-ruins.fandom.com/wiki/Title_Screen_Trivia) | Title screen is a playable diorama: click-to-kill counter, chiptune easter egg at 50 kills |
| [Thoughts and Ideas](https://rise-to-ruins.fandom.com/wiki/Thoughts_and_Ideas) | Editor suggestion board; links the Russian interlanguage wiki |
| [UnderConstruction](https://rise-to-ruins.fandom.com/wiki/UnderConstruction) | Shared "under construction" notice template page |
| [Condemned](https://rise-to-ruins.fandom.com/wiki/Condemned) | Category hub for pages slated for cleanup |

### 6.2 Core mechanics
| Page | Contents |
|---|---|
| [Corruption](https://rise-to-ruins.fandom.com/wiki/Corruption) | Disambiguation → Corrupted Tiles + Corruption Threat |
| [Corrupted Tiles](https://rise-to-ruins.fandom.com/wiki/Corrupted_Tiles) | How corruption spawns/spreads (drones build graveyards/towers/roads), how to push it back (building light/resistance ranges), clearing a region forever, "Take it back!" 256-tile achievement |
| [Corruption Threat](https://rise-to-ruins.fandom.com/wiki/Corruption_Threat) | Per-region monster-power modifier: desire grows over time; trapping tiles raises threat; red UI bar |
| [Global Corruption Power](https://rise-to-ruins.fandom.com/wiki/Global_Corruption_Power) | Redirect to Corruption Threat (removed mechanic) |
| [Essence](https://rise-to-ruins.fandom.com/wiki/Essence) | Resource that fuels spells; influence bar (40 × villagers); energy for magic buildings |
| [God Experience](https://rise-to-ruins.fandom.com/wiki/God_Experience) | Meta currency for world-map chests/perks; full XP-source enum from the dev |
| [God Energy](https://rise-to-ruins.fandom.com/wiki/God_Energy) | Disambiguation stub (God XP vs influence vs energy vs essence) |
| [God Powers](https://rise-to-ruins.fandom.com/wiki/God_Powers) | Full spell catalog with influence costs/cooldowns/radii (see §5.4) (UC) |
| [Spells](https://rise-to-ruins.fandom.com/wiki/Spells) | Same content as God Powers (duplicate/redirected) |
| [Damage Types](https://rise-to-ruins.fandom.com/wiki/Damage_Types) | Regular/crushing/piercing/slashing/magic/fire etc. and resist/vulnerability system |
| [Blood Moon](https://rise-to-ruins.fandom.com/wiki/Blood_Moon) | Night event: blood rain, Blood Slimes, extra ghosts (UC) |
| [Perks](https://rise-to-ruins.fandom.com/wiki/Perks) | Global boost system, unlocked from chests with god XP on world map (UC, values outdated) |
| [Bonuses from chests](https://rise-to-ruins.fandom.com/wiki/Bonuses_from_chests) | Catalog of ~50 named perks and effects |
| [Lootbox](https://rise-to-ruins.fandom.com/wiki/Lootbox) | In-map treasure chests: spawning circles, Suspicious Key usage, drop tables |
| [Suspicious Key](https://rise-to-ruins.fandom.com/wiki/Suspicious_Key) | Key item for lootboxes; marketplace purchase; Key Shack storage |
| [God Dust](https://rise-to-ruins.fandom.com/wiki/God_Dust) | Item dropped when god buildings are destroyed by damage; sellable; achievement tie-in |
| [Animal Habitats](https://rise-to-ruins.fandom.com/wiki/Animal_Habitats) | Virtual spawn-zones required for wild animals; criteria for creating them |
| [Limbo](https://rise-to-ruins.fandom.com/wiki/Limbo) | Removed pre-game storage dimension for villagers/resources; replaced by migration/courier |
| [Roads](https://rise-to-ruins.fandom.com/wiki/Roads) | Road tiers and movement-speed bonuses |
| [Walls](https://rise-to-ruins.fandom.com/wiki/Walls) | Wood fence/stone wall/curtain wall HP + monster pathing logic (least-resistance attack) |

### 6.3 Villagers & friendlies
| Page | Contents |
|---|---|
| [Villagers](https://rise-to-ruins.fandom.com/wiki/Villagers) | Core species: STR/DEX/INT stats, essence capacity bonus, auto-equip, mating/homes (UC) |
| [Friendlies](https://rise-to-ruins.fandom.com/wiki/Friendlies) | Hub transcluding Villagers, Golems, Doggo, Doofy Doggo, Catjeets |
| [Guards](https://rise-to-ruins.fandom.com/wiki/Guards) | Guard job stub (UC) |
| [Golems](https://rise-to-ruins.fandom.com/wiki/Golems) | 6 golem types (labor, holy, rock, wood, crystal, courier), combobulator spawning, rare "doggo golem" variant |
| [Animals](https://rise-to-ruins.fandom.com/wiki/Animals) | Tamable wild animals: needs (food/water/sleep), butchering |
| [Beefalo](https://rise-to-ruins.fandom.com/wiki/Beefalo) | Tamable; butchers to 13-14 raw meat |
| [Entler](https://rise-to-ruins.fandom.com/wiki/Entler) | Tamable; butchers to 11-12 raw meat |
| [Rous](https://rise-to-ruins.fandom.com/wiki/Rous) | Tamable; butchers to 16 raw meat |
| [Clucker](https://rise-to-ruins.fandom.com/wiki/Clucker) | Tamable bird housed in coops |
| [Doggo](https://rise-to-ruins.fandom.com/wiki/Doggo) | Dog companions: self-taming, item carrying |
| [Doofy Doggo](https://rise-to-ruins.fandom.com/wiki/Doofy_Doggo) | Redirect (wild doggo variant, always named "Moon Moon") |
| [Doggos](https://rise-to-ruins.fandom.com/wiki/Doggos) | Redirect to Doggo |
| [Catjeets](https://rise-to-ruins.fandom.com/wiki/Catjeets) | Human-cat crossbreed species: villagers/provisioners |
| [Catjeet Laborer](https://rise-to-ruins.fandom.com/wiki/Catjeet_Laborer) | Gold-hired worker variant |
| [Catjeet Nomad](https://rise-to-ruins.fandom.com/wiki/Catjeet_Nomad) | Nomad variant that joins as catjeet villagers |
| [Catjeet Provisioner](https://rise-to-ruins.fandom.com/wiki/Catjeet_Provisioner) | Marketplace trader that brings goods |

### 6.4 Monsters (enemies) — index only
| Page | Contents |
|---|---|
| [Monsters](https://rise-to-ruins.fandom.com/wiki/Monsters) | Overview + first-night/first-spawn-day per monster; child variants |
| [Enemies](https://rise-to-ruins.fandom.com/wiki/Enemies) | Category hub stub |
| [Zombie](https://rise-to-ruins.fandom.com/wiki/Zombie) | Weak early monster (day 3+); blight; slain villagers can rise as zombies |
| [Skeleton](https://rise-to-ruins.fandom.com/wiki/Skeleton) | Fast, spawns from graveyards (day 5+); crush-vulnerable |
| [Headless](https://rise-to-ruins.fandom.com/wiki/Headless) | Basic low-level monster |
| [Slime](https://rise-to-ruins.fandom.com/wiki/Slime) | Splits on death; resistances table (day 2/4+) |
| [Spectre](https://rise-to-ruins.fandom.com/wiki/Spectre) | Wall-phasing ghost; blocked by crylithium (day 12+) |
| [Fire Elemental](https://rise-to-ruins.fandom.com/wiki/Fire_Elemental) | Ranged fire attacker (day 16+); rained on = hurt |
| [Drones](https://rise-to-ruins.fandom.com/wiki/Drones) | Corruption's workers: build graveyards/towers/roads; respawn instantly; "jail" tactics |

### 6.5 Buildings (index only — details are another agent's scope)
Hub: [Buildings](https://rise-to-ruins.fandom.com/wiki/Buildings) — full building browser with per-category lists and ancillary system explanation; [Building Menu](https://rise-to-ruins.fandom.com/wiki/Building_Menu) is an empty stub.

| Group | Pages |
|---|---|
| Town center | [Camp and Castles](https://rise-to-ruins.fandom.com/wiki/Camp_and_Castles) (15-tier table, see §5.1), [Ancillary](https://rise-to-ruins.fandom.com/wiki/Ancillary), [Outpost](https://rise-to-ruins.fandom.com/wiki/Outpost) (UC) |
| Civics | [Clinic](https://rise-to-ruins.fandom.com/wiki/Clinic), [Courier Station](https://rise-to-ruins.fandom.com/wiki/Courier_Station), [Maintenance Building](https://rise-to-ruins.fandom.com/wiki/Maintenance_Building), [Marketplace](https://rise-to-ruins.fandom.com/wiki/Marketplace) ([Market Place](https://rise-to-ruins.fandom.com/wiki/Market_Place) redirect), [Migration Way Station](https://rise-to-ruins.fandom.com/wiki/Migration_Way_Station), [Way Maker Shack](https://rise-to-ruins.fandom.com/wiki/Way_Maker_Shack) |
| Food & water | [Animal Pen](https://rise-to-ruins.fandom.com/wiki/Animal_Pen), [Bottler](https://rise-to-ruins.fandom.com/wiki/Bottler), [Clucker Coop](https://rise-to-ruins.fandom.com/wiki/Clucker_Coop), [Farm](https://rise-to-ruins.fandom.com/wiki/Farm), [Kitchen](https://rise-to-ruins.fandom.com/wiki/Kitchen) (butchering/cooking), [Large Fountain](https://rise-to-ruins.fandom.com/wiki/Large_Fountain), [Small Fountain](https://rise-to-ruins.fandom.com/wiki/Small_Fountain), [Rain Catcher](https://rise-to-ruins.fandom.com/wiki/Rain_Catcher), [Ranger Lodge](https://rise-to-ruins.fandom.com/wiki/Ranger_Lodge) (rangers tame/hunt), [Water Purifier](https://rise-to-ruins.fandom.com/wiki/Water_Purifier), [Well](https://rise-to-ruins.fandom.com/wiki/Well) (UC) |
| Harvesting | [Crystal Harvestry](https://rise-to-ruins.fandom.com/wiki/Crystal_Harvestry), [Lumber Shack](https://rise-to-ruins.fandom.com/wiki/Lumber_Shack) (stub), [Mining Facility](https://rise-to-ruins.fandom.com/wiki/Mining_Facility) (stub) |
| Refining | [Crystillery](https://rise-to-ruins.fandom.com/wiki/Crystillery), [Forge](https://rise-to-ruins.fandom.com/wiki/Forge), [Lumber Mill](https://rise-to-ruins.fandom.com/wiki/Lumber_Mill), [Stone Cuttery](https://rise-to-ruins.fandom.com/wiki/Stone_Cuttery) (all UC stubs) |
| Manufacturing | [Armorsmithy](https://rise-to-ruins.fandom.com/wiki/Armorsmithy), [Bowyer](https://rise-to-ruins.fandom.com/wiki/Bowyer) (bows/quivers/bolts), [Toolsmithy](https://rise-to-ruins.fandom.com/wiki/Toolsmithy), [Tumbler](https://rise-to-ruins.fandom.com/wiki/Tumbler) (stone balls; UC) |
| Magic | [Cullis Gate](https://rise-to-ruins.fandom.com/wiki/Cullis_Gate) (easter-egg teleporter), [Essence Collector](https://rise-to-ruins.fandom.com/wiki/Essence_Collector), [Crystal Motivator](https://rise-to-ruins.fandom.com/wiki/Crystal_Motivator) (UC) |
| Golems/guards | [Barracks](https://rise-to-ruins.fandom.com/wiki/Barracks) (3 tiers of images), [Crystal Golem Combobulator](https://rise-to-ruins.fandom.com/wiki/Crystal_Golem_Combobulator) |
| Towers (11) | [Attract Tower](https://rise-to-ruins.fandom.com/wiki/Attract_Tower) (resource teleporter), [Ballista Tower](https://rise-to-ruins.fandom.com/wiki/Ballista_Tower) (over-wall fire), [Banish Tower](https://rise-to-ruins.fandom.com/wiki/Banish_Tower) (teleports enemies), [Bow Tower](https://rise-to-ruins.fandom.com/wiki/Bow_Tower), [Bullet Tower](https://rise-to-ruins.fandom.com/wiki/Bullet_Tower), [Elemental Bolt Tower](https://rise-to-ruins.fandom.com/wiki/Elemental_Bolt_Tower) (magic dmg; fire/ice/lightning tier-3 upgrades), [Phantom Dart Tower](https://rise-to-ruins.fandom.com/wiki/Phantom_Dart_Tower) ([lowercase variant](https://rise-to-ruins.fandom.com/wiki/Phantom_dart_tower)), [Recombobulator Tower](https://rise-to-ruins.fandom.com/wiki/Recombobulator_Tower) (golem healer; [lowercase variant](https://rise-to-ruins.fandom.com/wiki/Recombobulator_tower)), [Sling Tower](https://rise-to-ruins.fandom.com/wiki/Sling_Tower) ([lowercase variant](https://rise-to-ruins.fandom.com/wiki/Sling_tower)), [Spray Tower](https://rise-to-ruins.fandom.com/wiki/Spray_Tower) ([lowercase variant](https://rise-to-ruins.fandom.com/wiki/Spray_tower)), [Static Tower](https://rise-to-ruins.fandom.com/wiki/Static_Tower) (AoE; [lowercase variant](https://rise-to-ruins.fandom.com/wiki/Static_tower)) — tower pages include tier/range/damage/reload/ammo tables + upgrade paths |
| Storage (10) | [Ammo Storage](https://rise-to-ruins.fandom.com/wiki/Ammo_Storage), [Crystal Storage](https://rise-to-ruins.fandom.com/wiki/Crystal_Storage), [Equipment Storage](https://rise-to-ruins.fandom.com/wiki/Equipment_Storage), [Food Storage](https://rise-to-ruins.fandom.com/wiki/Food_Storage), [Gold Storage](https://rise-to-ruins.fandom.com/wiki/Gold_Storage), [Key Shack](https://rise-to-ruins.fandom.com/wiki/Key_Shack), [Mineral Storage](https://rise-to-ruins.fandom.com/wiki/Mineral_Storage), [Miscellaneous Storage](https://rise-to-ruins.fandom.com/wiki/Miscellaneous_Storage), [Rock Storage](https://rise-to-ruins.fandom.com/wiki/Rock_Storage), [Wood Storage](https://rise-to-ruins.fandom.com/wiki/Wood_Storage) |
| Lighting | [Fire Pit](https://rise-to-ruins.fandom.com/wiki/Fire_Pit), [Large Fire Pit](https://rise-to-ruins.fandom.com/wiki/Large_Fire_Pit) — cheap building-range/corruption-resistance extenders |
| Housing | [Housing](https://rise-to-ruins.fandom.com/wiki/Housing) (house tiers), [Doggo House](https://rise-to-ruins.fandom.com/wiki/Doggo_House) |
| Trash system | [Trash](https://rise-to-ruins.fandom.com/wiki/Trash) (overview), [Trashy Trash](https://rise-to-ruins.fandom.com/wiki/Trashy_Trash), [Trashy Cube](https://rise-to-ruins.fandom.com/wiki/Trashy_Cube), [Trashy Cube Wall](https://rise-to-ruins.fandom.com/wiki/Trashy_Cube_Wall), [Burner](https://rise-to-ruins.fandom.com/wiki/Burner) (burns trash → essence), [Processor](https://rise-to-ruins.fandom.com/wiki/Processor) (compresses trash) |
| Misc | [Graveyard](https://rise-to-ruins.fandom.com/wiki/Graveyard) (empty stub) |

### 6.6 Resources & items (index only)
| Page | Contents |
|---|---|
| [Resources](https://rise-to-ruins.fandom.com/wiki/Resources) | Raw (wood, rock, raw food, crystal, water buckets, silk, iron/gold ore) → refined (boards, cut stone, crylithium, ingots) |
| [Items](https://rise-to-ruins.fandom.com/wiki/Items) | Equipment (bows, quivers, swords, chests/helmets/shields, tools), recovery (rations, water bottles, bandages, medkits) with craft sources and durability |
| [Ration](https://rise-to-ruins.fandom.com/wiki/Ration) / [Rations](https://rise-to-ruins.fandom.com/wiki/Rations) (redirect) | Best food (value 120), crafted at kitchen |
| [Cooked Meat](https://rise-to-ruins.fandom.com/wiki/Cooked_Meat) | Food value 80 |
| [Raw Meat](https://rise-to-ruins.fandom.com/wiki/Raw_Meat) | Food value 50, carried in inventory |
| [Raw Vegetable](https://rise-to-ruins.fandom.com/wiki/Raw_Vegetable) | Food value 25, farm input |
| [Water Bottle](https://rise-to-ruins.fandom.com/wiki/Water_Bottle) | Best portable drink (30) |

### 6.7 Wiki categories (47 total, via [Special:Categories](https://rise-to-ruins.fandom.com/wiki/Special:Categories))
Content categories: Animals (7), Buildings (57 incl. subcats), Civics (7), Condemned (3), Defences (1), Defense (3), Dev Builds (3: InDev 10/11/30d), Disambiguations, Enemies (8), Food and Water (12), Friendlies (7), Game Mechanics (5), Gameplay (16), Gamplay (typo cat), Getting Started (3), Golems, Guards and Golems (2), Harvesting (1), Help, Housing (2), Images (2), Items (4), Lighting (3), Magic (2), Manufacturing (4), Maps (1), Miscellaneous, MiscellaneousDefense, Nav (1), NoCat, Objects (82), Objetcs (typo cat), Other (1), Pages with broken file links, Refining (4), Roads (1), Spoiler templates, Storage, Template documentation, Templates (31), Towers (11), Under Construction (36), Users, Videos (2). Others: Blog posts, Browse, Candidates for deletion.

---

## 7. MEDIA INVENTORY (links only — no downloads; all assets remain © SixtyGig Games / Raymond Doerr)

### 7.1 Wiki media (326 files; browse all at [Special:NewFiles](https://rise-to-ruins.fandom.com/wiki/Special:NewFiles) or via API `list=allimages`)
URL pattern: `https://rise-to-ruins.fandom.com/wiki/File:<Name>`. Category:Images contains only 2 files ([File:Example.jpg](https://rise-to-ruins.fandom.com/wiki/File:Example.jpg), [File:Wiki.png](https://rise-to-ruins.fandom.com/wiki/File:Wiki.png)) — real images live inline in articles, not in image categories.

| Group | Count (approx) | Notable examples / what they show |
|---|---|---|
| Full world map renders | 3 | [File:WorldMap.png](https://rise-to-ruins.fandom.com/wiki/File:WorldMap.png), [File:WorldMap-0.png](https://rise-to-ruins.fandom.com/wiki/File:WorldMap-0.png), [File:WorldMapSmall.png](https://rise-to-ruins.fandom.com/wiki/File:WorldMapSmall.png) |
| Per-region minimaps | ~45 | One per region, e.g. [File:Applemeadow.png](https://rise-to-ruins.fandom.com/wiki/File:Applemeadow.png), [File:SurvivalIsland.png](https://rise-to-ruins.fandom.com/wiki/File:SurvivalIsland.png), [File:DeathPass.png](https://rise-to-ruins.fandom.com/wiki/File:DeathPass.png), [File:QuietForest.png](https://rise-to-ruins.fandom.com/wiki/File:QuietForest.png), [File:Gateway.png](https://rise-to-ruins.fandom.com/wiki/File:Gateway.png); Red Sands regions are the `Minimap*.png` series |
| Castle/camp tiers 1-15 | 15 | [File:Castle1.png](https://rise-to-ruins.fandom.com/wiki/File:Castle1.png) … [File:Castle15.png](https://rise-to-ruins.fandom.com/wiki/File:Castle15.png) — sprite of each town-center tier |
| Tower sprites + upgrades | ~80 | `<Tower>1-4.png` per tier; upgrade variants e.g. [File:SlingTowerUpgrade3Fire.png](https://rise-to-ruins.fandom.com/wiki/File:SlingTowerUpgrade3Fire.png), [File:ElementalBoltTowerUpgrade3Lightning.png](https://rise-to-ruins.fandom.com/wiki/File:ElementalBoltTowerUpgrade3Lightning.png) |
| Building tier sprites | ~60 | e.g. [File:Ancillary1-5.png](https://rise-to-ruins.fandom.com/wiki/File:Ancillary.png), [File:Clinic1.png](https://rise-to-ruins.fandom.com/wiki/File:Clinic1.png), [File:Kitchen1-3.png](https://rise-to-ruins.fandom.com/wiki/File:Kitchen1.png) |
| Spell icons | ~35 | [File:SpellMeteor.png](https://rise-to-ruins.fandom.com/wiki/File:SpellMeteor.png), [File:SpellGrab.png](https://rise-to-ruins.fandom.com/wiki/File:SpellGrab.png), [File:SpellSummonHolyGolem.png](https://rise-to-ruins.fandom.com/wiki/File:SpellSummonHolyGolem.png), etc. |
| UI panels | ~15 | [File:GameModes.png](https://rise-to-ruins.fandom.com/wiki/File:GameModes.png) (mode select screen), [File:RTRPERKS.png](https://rise-to-ruins.fandom.com/wiki/File:RTRPERKS.png) (perk list), [File:EssenceBar.png](https://rise-to-ruins.fandom.com/wiki/File:EssenceBar.png), [File:JobsPanel.png](https://rise-to-ruins.fandom.com/wiki/File:JobsPanel.png), [File:ConstructionPanel.png](https://rise-to-ruins.fandom.com/wiki/File:ConstructionPanel.png), [File:RiseToRuinsControls-0.jpg](https://rise-to-ruins.fandom.com/wiki/File:RiseToRuinsControls-0.jpg) (control map) |
| Item/resource icons | ~45 | [File:IronSword.png](https://rise-to-ruins.fandom.com/wiki/File:IronSword.png), [File:Ration.png](https://rise-to-ruins.fandom.com/wiki/File:Ration.png), [File:Crylithium.png](https://rise-to-ruins.fandom.com/wiki/File:Crylithium.png), [File:LootBox.png](https://rise-to-ruins.fandom.com/wiki/File:LootBox.png) |
| Title-screen captures | 4 | [File:Rtr titlescreen dev33.png](https://rise-to-ruins.fandom.com/wiki/File:Rtr_titlescreen_dev33.png) series (build dev33) |
| EA-era screenshots | 7 | [File:InDev-2018-01-05-1.png](https://rise-to-ruins.fandom.com/wiki/File:InDev-2018-01-05-1.png) series |
| Videos | 2 | [InDev 24 Official Gameplay Trailer (Revised)](https://rise-to-ruins.fandom.com/wiki/File:Rise_to_Ruins_InDev_24_Official_Gameplay_Trailer_(Revised)) and [InDev 28 Early Game Tutorial](https://rise-to-ruins.fandom.com/wiki/File:Rise_to_Ruins_Indev_28_Early_Game_Tutorial_Rise_to_Ruins_Basics_and_survival_management) (embedded from YouTube; listed in Category:Videos) |
| Wiki chrome / splash | ~8 | [File:Site-logo.png](https://rise-to-ruins.fandom.com/wiki/File:Site-logo.png), [File:LaunchSplash.png](https://rise-to-ruins.fandom.com/wiki/File:LaunchSplash.png) (game logo splash), [File:Splash.png](https://rise-to-ruins.fandom.com/wiki/File:Splash.png), [File:Wiki-wordmark.png](https://rise-to-ruins.fandom.com/wiki/File:Wiki-wordmark.png) |

### 7.2 Official media channels
| Channel | Links | Notes |
|---|---|---|
| Steam store media | [Store page](https://store.steampowered.com/app/328080/Rise_to_Ruins/) (screenshot strip + embedded trailers incl. 1.0 release trailer and InDev 30 gameplay trailer) | Primary official screenshot/trailer source |
| Steam news (dev posts) | [News hub](https://store.steampowered.com/news/app/328080) / [RSS](https://store.steampowered.com/feeds/news/app/328080/) | All InDev/Update announcements with changelogs |
| Official site | [risetoruins.com](http://risetoruins.com/) | Placeholder page: links [Discord](https://discord.gg/RiseToRuins), [Twitter/X @RaymondDoerr](https://twitter.com/RaymondDoerr), [Steam forums](https://steamcommunity.com/app/328080/discussions/), [itch.io](https://rayvolution.itch.io/risetoruins) |
| itch.io page | [rayvolution.itch.io/risetoruins](https://rayvolution.itch.io/risetoruins) | Screenshots, tech credits (LWJGL), 4.7/5 rating |
| Soundtrack | [Bibiki Garcia — "Rise to Ruins" on Bandcamp](https://bibikigl.bandcamp.com/album/rise-to-ruins) (incl. bonus chiptune "R1$3 t0 Ru1n$"); Steam DLC "The Living Soundtrack!" | Also on streaming platforms since May 2020 |
| Dev YouTube | Rayvolution's channel (hosts official trailers/tutorials; exact handle not verified — search "Rayvolution Rise to Ruins") | SteamDB patch-note refs name "InDev 30 Gameplay Trailer" and a 1.0 release trailer |
| Community screenshots | [Steam Community hub](https://steamcommunity.com/app/328080/screenshots), [r/risetoruins](https://www.reddit.com/r/risetoruins/) | Player village/maze screenshots; top posts referenced in §8 |

---

## 8. Community knowledge (Steam guides & Reddit, indexed)

**Steam Community guides** (16 English guides total; [guides hub](https://steamcommunity.com/app/328080/guides/)): Beginner's Guide [InDev 33] (Meshech), Advanced Techniques (goldeNspiriT), World Supremacy (fragmeister05), Complete Guide to Monsters & Corruption in RtR 1c (ZeroGravitas), How to REALLY outplace corruption (DAY 1) (Fedrat), Rise to Ruins: The Basics (ehyder), Best ways to fulfil goals (Spike Dread), Harvesting: The First Thing You Need To Know (Scobee), How to outpace the corruption (nils.coussement), How to actually beat the corruption 1B Survival (Infoblaze), crash fixes (Hyper Phoenix), building slots (BrendyBear), Rise To Ruins Fall To Greatness (darKatana), Building Info (Mihir), Oktas RtR FAQ Indev28 U3 (Oktabyte), Retro-Pixel Castles Advanced Guide (Nev_Skrap). *Recurring theme: corruption containment/outpacing is the community's hardest problem.*

**r/risetoruins top threads** (via archive): "Early Access is over. Full game released!" (73 pts); hidden world-map water imagery (Duck Hunt) (53); "New Rise to Ruins update: Faith Mechanics!" (43); corruption-clearing + maze-design threads (37, 36, 26, 33); "Accidental speedrun by removing corruption in 8 days" (33); "4000 Population Survival… 1C" mega-village (26); feeding/villager-AI troubleshooting (29). Take-aways: corruption strategy, mazes, and feeding logistics dominate community discussion.

---

## 9. Cross-reference index for the other research docs
- **Buildings/economy** → wiki §6.5 building pages, [Building Menu/Buildings hub](https://rise-to-ruins.fandom.com/wiki/Buildings), [Resources](https://rise-to-ruins.fandom.com/wiki/Resources), [Items](https://rise-to-ruins.fandom.com/wiki/Items), [Marketplace](https://rise-to-ruins.fandom.com/wiki/Marketplace), [Camp and Castles](https://rise-to-ruins.fandom.com/wiki/Camp_and_Castles)
- **Villager simulation** → [Villagers](https://rise-to-ruins.fandom.com/wiki/Villagers), [Interface](https://rise-to-ruins.fandom.com/wiki/Interface) (jobs panel), [Events/Nomads](https://rise-to-ruins.fandom.com/wiki/Events), [Housing](https://rise-to-ruins.fandom.com/wiki/Housing), [Faith system in Update 2 post](https://store.steampowered.com/news/app/328080/view/3689064842520572199)
- **Monsters/defense** → §6.4 monster pages, [Drones](https://rise-to-ruins.fandom.com/wiki/Drones), [Corrupted Tiles](https://rise-to-ruins.fandom.com/wiki/Corrupted_Tiles), [Walls](https://rise-to-ruins.fandom.com/wiki/Walls), tower pages, [Blood Moon](https://rise-to-ruins.fandom.com/wiki/Blood_Moon)
- **Presentation** → [Title Screen Trivia](https://rise-to-ruins.fandom.com/wiki/Title_Screen_Trivia), §7 media inventory, Bandcamp soundtrack

---

## 10. Confidence & gaps

**High confidence (multi-source verified):** developer/publisher identity; EA date (27 Oct 2014); 1.0 date (14 Oct 2019); Kickstarter figures; rename date/reason window; mode list and their exact mechanical differences; 45-region/6-biome world map and full region names; 15-tier castle ladder; perks-via-chests meta; god XP sources; Steam review totals; price; engine (Java/LWJGL); post-1.0 update timeline (Update 1 → 2d, with dates).

**Unverified / gaps:**
1. **"Villagers" former title: NOT verified.** Kickstarter (Sep 2014), press (Oct 2014) and SteamDB all say "Retro-Pixel Castles". If the project brief requires it, ask the user for their source; otherwise treat lineage as Retro-Pixel Castles → Rise to Ruins only.
2. **No 2024-2026 news found** — latest verifiable build is Update 2d (Sep 2023). Absence of news ≠ abandonment; the dev's Discord (discord.gg/RiseToRuins) is the primary channel and could not be read.
3. **Latest exact version number** on Steam (e.g. "dev33" appears in wiki screenshots; "Update 2d" in news/wiki) — internal build numbering between 2023-2026 unverified.
4. **Procedural map generation** was promised pre-1.0 (Road to Release 1) — not confirmed shipped; Custom-mode generation options need in-game verification.
5. **Steam "113 achievements" vs dev's "117 goals"** — exact live count unverified (store front-end numbers vary by region/cache).
6. **45 regions** comes from the wiki (which says "currently"); if any region was added/removed after Update 2, the wiki may be stale (it largely documents ~1c/33e-era data; many pages tagged Under Construction).
7. **Custom mode's exact option list** (beyond day length/season length/spawn rates) needs in-game capture.
8. **Precise dev YouTube channel handle** not confirmed.
9. Reddit's live API was blocked; r/risetoruins data comes from an archive (pullpush.io) and search summaries.
10. Wiki page quality: many pages are stubs marked Under Construction with outdated values (wiki itself warns "based on version 31e" / "as of 33f") — cross-check all numeric balance data in-game before implementing.

## 11. Sources (full URL list)

**Primary/official**
- https://store.steampowered.com/app/328080/Rise_to_Ruins/ (store page)
- https://store.steampowered.com/appreviews/328080?json=1&num_per_page=0&language=all (review API)
- https://store.steampowered.com/feeds/news/app/328080/ (news RSS) and https://store.steampowered.com/news/?appids=328080&appgroupname=Rise+to+Ruins&feed=steam_community_announcements (news hub; individual posts cited inline)
- https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=328080 (news API)
- https://steamcommunity.com/app/328080/eventcomments/1630790506914322727 (rename announcement, 2016-12-12)
- https://steamcommunity.com/app/328080/guides/ (16 community guides)
- https://steamcommunity.com/games/328080/announcements/detail/3307256771838552765 (Release 1 post)
- http://risetoruins.com/ (official site placeholder)
- https://rayvolution.itch.io/risetoruins (itch.io page)
- https://twitter.com/RaymondDoerr (dev Twitter)
- https://bibikigl.bandcamp.com/album/rise-to-ruins (soundtrack)
- http://web.archive.org/web/20140923091930/https://www.kickstarter.com/projects/1385547263/retro-pixel-castles-village-survival-mayhem (archived Kickstarter)

**Encyclopedia / press**
- https://en.wikipedia.org/wiki/Rise_to_Ruins
- https://www.pcgamingwiki.com/wiki/Rise_to_Ruins
- https://www.gamingonlinux.com/2021/03/the-developer-of-rise-to-ruins-is-absolutely-mad-and-has-secured-funding-for-their-games/
- https://www.gamingonlinux.com/2017/01/rise-to-ruins-previously-retro-pixel-castles-has-a-major-content-update-now-out/
- https://www.destructoid.com/retro-pixel-castles-is-all-the-work-of-just-one-person-282662.phtml (403 at fetch time; cited via Wikipedia)
- http://www.pcgamesn.com/retro-pixel-castles/retro-pixel-castles-video-reveals-bloody-rain-and-sexy-sexy-villagers (via Wikipedia)
- http://www.hardcoregamer.com/2014/10/11/endless-survival-is-impossible-in-retro-pixel-castles/111333/ (via Wikipedia)

**Wiki (Fandom) — main entry points**
- https://rise-to-ruins.fandom.com/wiki/Rise_to_Ruins_Wiki (main page)
- https://rise-to-ruins.fandom.com/wiki/Special:AllPages (148 entries)
- https://rise-to-ruins.fandom.com/wiki/Special:Categories (47 categories)
- https://rise-to-ruins.fandom.com/wiki/Special:NewFiles (326 files)
- https://rise-to-ruins.fandom.com/api.php (MediaWiki API used for exhaustive enumeration)
- Individual pages: all 148 indexed in §6 with inline URLs
- Russian interlanguage wiki: https://rise-to-ruins.fandom.com/ru/wiki/Rise_to_Ruins

**Community**
- https://www.reddit.com/r/IAmA/comments/did8rl/i_am_a_oneman_game_developer_of_rise_to_ruins_and/ (AMA, Oct 2019)
- https://www.reddit.com/r/risetoruins/ (subreddit; top posts via https://api.pullpush.io archive)
