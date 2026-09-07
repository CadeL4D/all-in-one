# Rise to Ruins — Research 05: Presentation, Feel & Mobile Adaptation

**Scope of this doc (vs. sibling docs):** presentation/feel teardown (art, UI/UX, controls, pacing, audio, feel pillars) and touch/mobile adaptation research. System deep-dives (buildings/economy, villager AI internals, monsters/defense math) live in docs 02–04. This doc owns **how the game presents, feels, and would translate to a phone**.

**Game facts used throughout:** Steam appid 328080; solo dev Raymond Doerr ("Rayvolution"), SixtyGig Games; music by Bibiki García; EA Oct 27 2014 (as "Retro-Pixel Castles" — renamed because "the name sucked" — [AMA](https://www.reddit.com/r/IAmA/comments/did8rl/)); 1.0 Oct 14 2019; last update Sep 2023 (Update 2d); Windows/macOS/Linux, **no official mobile port exists** (confirmed via [Wikipedia city-building list](https://en.wikipedia.org/wiki/List_of_city-building_video_games), PCGamingWiki, store page); Steam rating **Very Positive** (~87%, 5,490 reviews as of 2026-09 per [Steam reviews API](https://store.steampowered.com/appreviews/328080?json=1)); **no Metacritic critic score** (only 1 mixed user rating — [Metacritic](https://www.metacritic.com/game/rise-to-ruins/)); reception is entirely Steam-user-driven. Written engine in **Java** ([Funding Secured post](https://store.steampowered.com/news/app/328080/view/5127884013766587984)).

---

# PART A — PRESENTATION / FEEL TEARDOWN

## A1. Art style spec

### Format & resolution
- **Pure top-down square tile grid, NOT isometric.** Buildings are drawn with slight pseudo-depth facades; terrain is flat tiles. (Screenshot analysis: [Steam screenshot 2](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/328080/ss_ca30ef5b4cee617bd36017da2953777f19b151c2.1920x1080.jpg), [screenshot 5](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/328080/ss_6ec7e87a6abb974c4ae2d2ff3f7fef8321e5f3e5.1920x1080.jpg).)
- **Tile/unit scale:** the art reads as **16×16-px tiles rendered at 2× (≈32 px per tile at default zoom)**; villagers occupy about one tile (≈16×24 px incl. head). *Confidence: inferred from screenshot pixel measurement (tile ≈32 px at mid zoom in 1920×1080 shots) + villager≈tile proportion; I found no official dev statement of tile size — flag as "inferred".*
- **Zoom range:** continuous mouse-wheel / `[` `]` zoom from "villagers are colourful ants" ([Save or Quit](https://saveorquit.com/2017/04/11/review-rise-to-ruins/)) up to a close zoom where art is visibly upscaled/blocky ("At maximum zoom the characters look a bit too blocky for my liking" — Save or Quit). Minimum zoom-out is a **recurring complaint**: "the zoom level is way too close. It felt like playing at 640x480 on my 4k monitor" ([-] Steam review, 9 upvotes) and "The maximum zoom-out level is not enough for my preference… feels too restrictive" (refund review). UI scale above ~1.1× shows an in-game warning that rendering glitches may occur (same refund review) — the art pipeline is fragile above native scale, consistent with a hand-authored low-res pixel set.
- **Min spec** listed on [Steam](https://store.steampowered.com/app/328080/Rise_to_Ruins/) is only "1280x720" — the game targets low-end hardware and upscales aggressively.

### Palette & color strategy
- **Muted, earthy base + saturated accents.** Forest biome grass is a vivid mid-green; Drylands/Desert grass shifts olive/khaki; corruption zones desaturate everything to grey-purple stone speckled with **red and gold dots** — corruption is communicated *purely by recoloring terrain*, no overlay needed. (Screenshots 2, 5, 6.)
- Outline-heavy sprites (dark 1px outlines) keep units readable against busy terrain.
- **Biome + seasonal recoloring**: autumn turns foliage orange (screenshot 6); winter adds snow and is mechanically deadlier ("The difficulty really gets hard around wintertime" — [Highland Piper review](https://highlandpiper-sc.com/1281/entertainment/games-steam-early-access-game-review-rise-to-ruins-a-godlike-stimulator/)).

### Day/night & lighting
- Night is **the game's signature visual event**: heavy desaturation + dark blue-grey grade, buildings become lamps with warm glowing windows, and the map fades to black at the world edge (screenshot 6, "My village at night on the beta branch" — [r/risetoruins](https://www.reddit.com/r/risetoruins/)).
- Light is a **mechanic, not just a grade**: Illuminate spell exists; light suppresses corruption/spectres ("A guide how to tame corruption (Hint: Let there be light)" — [r/risetoruins](https://www.reddit.com/r/risetoruins/comments/bgq2x6/)); lightning storms flash the screen and villagers visibly flee the flashes ("The villagers do seem to run away from the flashes of crackling lightning though and that amuses me" — [RPS](https://www.rockpapershotgun.com/rise-to-ruins-village-management)).

### Weather, FX, juice
- Drifting **cloud shadows** over the map ("Cloud-Gazing: Can you guess the shape?" — [+] Steam review listing easter eggs; "the cloud effects with the mouse is such a stellar little touch" — [+] review). Rain, hail, blood-rain during Blood Moons, meteor showers, spreading fire ([wiki: Events](https://rise-to-ruins.fandom.com/wiki/Events)).
- **Particles are a beloved feature**: "try to play with particles turned on the max btw. seeing a cloud of particles flying around never gets boring" ([+] review); "Nice effects (like flowers growing in places where mana is concentrated)" ([+] review, 7 upvotes). A particle-quality slider exists in settings.
- Floating juice: "+1" resource popups, construction-% labels, hearts/speech bubbles when villagers pair up (screenshot 6), god-particle trails when grabbing essence ("small green sparks on the ground, which follow your cursor when you hold it close" — [wiki: Quick Guide](https://rise-to-ruins.fandom.com/wiki/Quick_Guide)).
- **Marketing screenshots hide the HUD entirely** and overlay white player-quote captions on a dark band ("The best 'just five more minutes' I've ever turned into 300 hours." — David Kowis, 291 hours, printed on [store screenshot 5](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/328080/ss_6ec7e87a6abb974c4ae2d2ff3f7fef8321e5f3e5.1920x1080.jpg)). Note for our mobile marketing: quote-over-caption on clean gameplay shots is the house style.

### Readability at zoom-out
- Units read as colored dots; buildings have unique silhouettes + color-coded roofs; roads auto-connect and draw tan/brown borders that read as a network at distance; corruption spread reads as a creeping recolor; data overlays (hotkey V) can paint % values over tiles (screenshot 0 shows 69%/25% overlays). Alerts draw colored dots on the minimap ("They appear as blue dots on the mini-map" for nomads — [wiki: Events](https://rise-to-ruins.fandom.com/wiki/Events)).

## A2. UI/UX flow

### Full HUD inventory (per [wiki: Interface](https://rise-to-ruins.fandom.com/wiki/Interface))
| Screen position | Panel | Contents |
|---|---|---|
| Top-left | **Population panel** | Population; housed/total-housing; guards in barracks; ancillaries; buildings built/building cap; children count |
| Top-center | **Inventory & Spells panel** | All stored resources/items; **essence bar with spell slots castable at any time**; gold, clean water, stored essence on the right end |
| Top-right | **Weather & time panel** | Temperature half-circle gauge (with "dangerously hot/cold" marks), season, **game speed text + buttons**, day, year, time-of-day bar (resets each phase: Dawn→Morning→Midday→Evening→Dusk→Night) |
| Left | **Jobs panel** | Every job with +/- worker steppers, desired/max (turns red when unmet), and *live villager sprites shown doing the job* |
| Right | **Construction panel** | All buildings grouped into 11 categories: Civics, Defense, Food & water, Harvesting, Housing, Lighting, Magic, Manufacturing, Refining, Storage, Walls. Hover = description + construction cost |
| Bottom-left | **Harvest panel** | Brush size/shape modifier + Harvest Wood(6)/Rock(7)/Food&Water(8)/Crystal(9) — a **paint tool**, not single-click |
| Bottom | **Console/info strip** | Passive game messages, no interaction |
| Bottom-right | **Terrain panel** | Pause building (O), Dismantle (I), Dig hole (Q), create/upgrade roads, dismantle roads, Destroy terrain (0) |
| Toggleable | **Minimap (TAB)**, Population list (P), Building list (L), Data views (V), Problem panel (R), Map info (I), Main menu (M) | Problems panel centralizes "no food"-type complaints; nomads/alerts appear as colored minimap dots |

### Pause & speed model
- **SPACE = pause; F5/F6 = speed down/up.** The time panel exposes buttons; speed options are **1× / 2× / 3×** ("You can use the speed changer, which lets you speed up the game to 2x or 3x speed" — [Highland Piper](https://highlandpiper-sc.com/1281/entertainment/games-steam-early-access-game-review-rise-to-ruins-a-godlike-stimulator/)). Pause is a full sim freeze; build/spell ordering still works. There is no auto-pause-on-event by default; alerts arrive as toasts/minimap dots while the clock keeps running.
- Placement model: the game is played mostly **while paused or at 3×**, with players dropping to 1× for night fights — the speed levers are the primary "tension dial".

### How state is communicated
- **Essence sparks physically follow your cursor** — resource-at-hand feedback ([Quick Guide](https://rise-to-ruins.fandom.com/wiki/Quick_Guide)).
- Jobs panel shows *actual villager sprites animating the job*; unmet demand turns red text.
- Problem panel (R) aggregates complaints ("Changed problem panel text for no food to also mention animal farms" — [Update 2d notes](https://store.steampowered.com/news/app/328080/view/3712711277286541677)).
- Goal notifications play "fanfare sound/particle effects" ([Update 2d](https://store.steampowered.com/news/app/328080/view/3712711277286541677)).
- Villager social state surfaces as icons/bubbles (heart above pairing villagers — screenshot 6); ghosts appear on deaths (resurrectable — [wiki: Spells](https://rise-to-ruins.fandom.com/wiki/Spells)).
- Region labels like red "Recall to Home Region" text appear over off-region content (screenshot 0).

### Settings (categories per Interface page + reviews)
Display (fullscreen/borderless, hardware cursor — [GamingOnLinux](https://www.gamingonlinux.com/2018/09/village-building-god-sim-rise-to-ruins-had-an-absolutely-massive-update/)); Video (particles, UI scale 1.0–1.5 w/ glitch warning); Audio (effects volume, music volume, **alert-sound toggles**); Controls (**view-only list, historically not rebindable**: "you can't change which keys do what" — Highland Piper); Gameplay; Help/Next Tip (RETURN). FPS historically "capped at 60" (Highland Piper).

## A3. Controls on PC (every verb, from the in-game controls screen)

Source: official controls screen ([wiki image](https://static.wikia.nocookie.net/rise-to-ruins/images/7/73/RiseToRuinsControls-0.jpg)) + [wiki: Interface](https://rise-to-ruins.fandom.com/wiki/Interface) + Save or Quit (middle-mouse cancel).

| Verb | Input |
|---|---|
| Pan map | WASD (+ screen-edge) |
| Zoom | Mouse wheel, `[` out / `]` in |
| Game speed | F5 down / F6 up; SPACE pause |
| **Brush cycle / brush size** | **Z** cycle type, `,` shrink / `.` grow — placement & harvest are **paintable drags**, not one-by-one |
| Place building | Construction panel → click/drag paint; ESC/right-cancel |
| Designate harvest | Drag-paint with hotkeys 6/7/8/9 (wood/rock/food-water/crystal) |
| Roads/dig/destroy terrain | Terrain panel tools; Q dig, 0 destroy terrain; roads also **emerge automatically** on well-walked tiles ([wiki: Roads](https://rise-to-ruins.fandom.com/wiki/Roads)) |
| Dismantle / pause building | I / O |
| Cancel / escape | ESC **and middle-mouse** ("middle mouse button to cancel is not intuitive at all" — [Save or Quit](https://saveorquit.com/2017/04/11/review-rise-to-ruins/)) |
| Accept / alt-function | X |
| Select/inspect | Left-click villager/building → info + job assignment |
| Cast spell | Click spell slot or `1`–`5` (5 equipable slots); **Grab** spell on `` ` `` — click-hold to pick up creatures/objects, click again to drop |
| Destroy terrain / god terraform | 0 |
| Panels | TAB minimap, P population, L buildings, V data views, R problems, I map info, M menu, G grid view, F4 hide GUI, F3 debug |
| Axis lock | LSHIFT (constrains placement to an axis) |
| Screenshot / fullscreen | F2 / F10 |
| Map editor | E erase, Q object grab, P patch, H hole, T hide topography |

Dev trivia relevant to porting: **no rebindable keys** (Highland Piper), and the cursor is a **hardware cursor** (GamingOnLinux).

## A4. Pacing curve (documented numbers)

- **Day length: 132,000 ticks at 60 TPS = ~36.7 real minutes per in-game day at 1×** — straight from the dev: "I've never bothered to actually time it, but in theory if I did the math right, about 36.66 minutes" ([Steam discussion "What is the time scale?"](https://steamcommunity.com/app/328080/discussions/0/1742232339945026370/), answered by Rayvolution). **At 3× that's ~12 min/day.** Day **segments** (dawn/day/dusk/night proportions) vary by season — winter has longer nights (same thread).
- **Six day-phases per day** (Dawn, Morning, Midday, Evening, Dusk, Night) with a per-phase progress bar, not a clock ([wiki: Interface](https://rise-to-ruins.fandom.com/wiki/Interface)).
- **First attack:** Survival — monsters spawn **the first night**; Traditional — **second night**, fewer; Nightmare — monsters already roaming; Peaceful — none ([wiki: Game modes](https://rise-to-ruins.fandom.com/wiki/Game_modes)). One Bow Tower + a Bowyer producing bolts "should suffice for the first night" ([Quick Guide](https://rise-to-ruins.fandom.com/wiki/Quick_Guide)).
- **Seasons = 5 days (7 in Nightmare summer/winter); difficulty ramps seasonally**: summer dehydration/overheating and fires, winter cold and tougher waves ("The long nights and short days make recovering from the hordes of enemies difficult" — [Highland Piper](https://highlandpiper-sc.com/1281/entertainment/games-steam-early-access-game-review-rise-to-ruins-a-godlike-stimulator/)).
- **The pressure escalates with *time-in-region*, not just calendar**: "each region gets progressively nastier the longer you stay in it" ([+] review via [GamingOnLinux](https://www.gamingonlinux.com/2018/09/village-building-god-sim-rise-to-ruins-had-an-absolutely-massive-update/)); every 5 days in a region grants a **perk chest** (same source); RPS agrees the "greatest threat is in the first days, when you're balancing the need to defend your perimeter," then "the dangers feel a little blunted" if you turtle ([RPS](https://www.rockpapershotgun.com/rise-to-ruins-village-management)).
- **Meta-curve:** a world has **45 regions across 6 biomes** plus global "Corruption Threat" ([wiki: World Map](https://rise-to-ruins.fandom.com/wiki/World_Map)); you migrate outward, shipping resources/people to harder maps; endgame = survive one year in every region (GamingOnLinux). Building cap starts at 6 from the camp and grows by upgrades/ancillaries ([Quick Guide](https://rise-to-ruins.fandom.com/wiki/Quick_Guide)) — an early-game quantity throttle that forces prioritization.
- **Run/session length:** reviewers frame it as "a game that lasts around 20 to 40 hours" for one arc, ~100h to internalize ([+] reviews); community posts show 250–400h players and a "4000 Population Mega Village" build ([r/risetoruins top posts](https://api.pullpush.io/reddit/search/submission/?subreddit=risetoruins)). Single in-game days at 3× (~12 min) are the natural *session chunk*.
- **Intervention rhythm (observed):** day = set orders, paint harvest, place 1–5 buildings, speed 3×, hands mostly off (villager autonomy); dusk = final wall/tower checks, position golems; night = 1× triage — plug maze breaches, cast healing/meteor/grab-rescue, resurrect; alerts (nomads, blood moon, eclipse, meteor/lightning/hail/quake/blight — [wiki: Events](https://rise-to-ruins.fandom.com/wiki/Events)) inject spikes into calm periods. Failure is fast: "a single mistake can cause the enemies to pour in and destroy half of your town in a single night" ([-] review). The self-reported failure mode of the loop is boredom before the first night's threat lands: "waiting over an hour for my population to increase to a workable level" ([-] review) — i.e., **early-game flat spot at 1× that the 3× lever exists to fix**.

## A5. Audio

- **Music:** original score by **Bibiki García**, "evoking old 1990s era PC gaming" ([Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/)); fantasy/medieval with a Battle for Wesnoth comparison and "one song even has a ukulele in it" ([Highland Piper](https://highlandpiper-sc.com/1281/entertainment/games-steam-early-access-game-review-rise-to-ruins-a-godlike-stimulator/)). Consistently cited as a feel-driver: "the music drives you to want more all of the time" ([+] review); "Chill music" ([+] review, 7 upvotes).
- **Adaptive day/night scoring** — the key audio signal of danger: "The music will also change based on what is happening in the game… when night comes it will play darker songs, such as *Whispers In The Night* or *Skull Hunter*" (Highland Piper). An **in-game music player** lets you skip tracks (same source).
- **SFX:** "functional, but nothing special" (Save or Quit) — low density, but purposeful: alert sounds are individually toggleable in settings; goal completion gets a fanfare that was later "lowered a few decibels" after complaints ([Update 2d](https://store.steampowered.com/news/app/328080/view/3712711277286541677)); there's even a sound-reward easter egg for "kill[ing] mobs in the menus" ([+] review). Danger signaling leans on *music shift + alert stings* rather than dense positional SFX.

## A6. Feel synthesis — top 10 pillars (each with a source quote)

1. **Hands-off villagers = watching an anthill come alive.** "I've been looking for… rimworld but I don't have to tell them where to go, and this game is close to that" ([+] review); "you don't need to micromanage all your villagers all the time" (Highland Piper); RPS hoped for "villagers with some autonomy, the kind of people who wouldn't need me to hold their hand."
2. **Calm day / panicked night is the heartbeat.** "Fight off hoards of monsters at night, and expand your village in the day time" ([Steam store](https://store.steampowered.com/app/328080/Rise_to_Ruins/)); nights literally play darker music (Highland Piper); "one of my fav chill not so chill games. Punishing but rewarding" ([+] review).
3. **"One more day" time-dilation.** "The best 'just five more minutes' I've ever turned into 300 hours" (marketing quote by David Kowis, 291h, [store screenshot](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/328080/ss_6ec7e87a6abb974c4ae2d2ff3f7fef8321e5f3e5.1920x1080.jpg)); "one hour turns into four before you know it" ([+] review); "It is very easy to sink a few hours into, with a sort of 'One more turn' feel to it" (Highland Piper); "oh, look, where did 650 hours of my life go" (GamingOnLinux comments).
4. **Brutal-but-fair loss is content, not failure.** "In this game, you will lose frequently" ([store](https://store.steampowered.com/app/328080/Rise_to_Ruins/)); "its a punishing game but fair" ([+] review); "when you play and fail, don't abandon your world. Learn from your mistakes and let the dead territories be your battle scars" ([+] review, 1 upvote); "built around the idea that collapse is not a failure state but a core part of learning" ([+] review essay).
5. **You are physically *in* the world (god hand).** "You're part of this world just as much as your villagers are… pick up objects or creatures, heal your villagers" ([store](https://store.steampowered.com/app/328080/Rise_to_Ruins/)); "I felt like a mad mayor (or god? I think I'm technically a god)" ([RPS](https://www.rockpapershotgun.com/rise-to-ruins-village-management)); "you could drop a extinction level meatball on their faces or even role-play as Zeus" ([+] review); essence sparks chase your cursor ([Quick Guide](https://rise-to-ruins.fandom.com/wiki/Quick_Guide)).
6. **Toybox tinkering: mazes, traps, terraform.** "I find the process of building these elaborate traps quite satisfying" (RPS); "Spells that you must use with precision and understanding… Want enemies to go thru this choke point? Just make the forest grow somewhere else" ([+] review, 7 upvotes); "The perfect maze setup" (recurring [r/risetoruins](https://www.reddit.com/r/risetoruins/) showcase posts).
7. **Readable chaos at ant-scale.** "At minimum zoom the game looks quite nice, with map tiles being well drawn… characters looking like colourful ants" ([Save or Quit](https://saveorquit.com/2017/04/11/review-rise-to-ruins/)); corruption reads as a creeping recolor; a full late-game walled city stays legible in one screen ([store screenshot 2](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/328080/ss_ca30ef5b4cee617bd36017da2953777f19b151c2.1920x1080.jpg)).
8. **A living, joke-cracking world worth poking.** "The villagers do seem to run away from the flashes of crackling lightning though and that amuses me" (RPS); villagers chat, pair up, have babies ([RPS](https://www.rockpapershotgun.com/rise-to-ruins-village-management), [wiki: Villagers](https://rise-to-ruins.fandom.com/wiki/Villagers)); "Touch everything!… Cloud-Gazing… Spend hours looking for sparkly circles!… Kill mobs in the menus to receive a sound reward!" ([+] review); hidden Duck Hunt art in the world-map water ([r/risetoruins](https://www.reddit.com/r/risetoruins/), 53 upvotes).
9. **Respect for the player's time and rig.** "It really gives you a challenge and respects your time; and I haven't seen it bug out on me once" ([+] review); "Decent performance even in large cities" ([+] review); DRM-free forever pledge ([store](https://store.steampowered.com/app/328080/Rise_to_Ruins/)).
10. **Steep, opaque onboarding is the #1 friction — and the #1 churn cause.** "Throws you into the game with a 'figure it out yourself' attitude. I gave it 8 tries before giving up" ([-] review, 9 upvotes); "No proper tutorial, making for a very steep learning curve" ([Save or Quit](https://saveorquit.com/2017/04/11/review-rise-to-ruins/)); "it seemed like a game that needs a really robust tutorial" (GamingOnLinux comments); "the early game so staggeringly slow and boring" ([-] review). **For the mobile port this is the single most important thing to fix.**

**What makes them lose hours:** pillar 3's loop is powered by pillars 1+2 (autonomous growth you keep nudging + a deadline every ~12 in-game minutes at speed). **What frustrates them:** onboarding opacity, slow pre-first-threat buildup, tiny text/zoom limits, wall-builder AI dumbness and maze-or-pretty tension (RPS: "the two areas feel at odds"), mid-game repetition once a settlement is safe, and the perception of abandonment (dominant recent [-] theme: "abandoned", answered by the top [+]: "Don't listen to 'game is abandoned' bull-crap reviews. It's a complete, released game").

## A7. MEDIA INVENTORY (reference only — do not download/redistribute; developer copyright)

**Trailer**
- Steam movie id 256721713, "Rise to Ruins InDev 30 Gameplay Trailer (Trailer Squad – No Early Access Message – 30FPS)", thumb: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/256721713/movie.293x165.jpg` — Early-Access-era trailer; useful only for UI history (pre-1.0 HUD).

**Steam store screenshots (1920×1080, all HUD-hidden with player-quote overlays)**
- ss id 0 (ss_5c878445…): walled maze fortress at far zoom, towers behind multi-angle walls; data-view overlays "69%/25%"; red "Recall to Home Region" region labels — best reference for TD-maze readability + data views.
- ss id 2 (ss_ca30ef5b…): maximum zoom-out, daylight, corruption border recoloring terrain — readability-at-ants-scale reference.
- ss id 5 (ss_6ec7e87a…): mid-zoom forest village, auto-connecting roads, maze fort, floating "+1", corruption speckle — best "typical play" reference.
- ss id 6 (ss_116ddf5c…): dusk/night — desaturated grade, glowing windows, heart icon + "equip" tooltip, autumn foliage — night grading + villager-state icons reference.
- ids 1,3,4,7,8,9,10,11 (ss_20a099e9, ss_b9451ef1, ss_0dfe4550, ss_bd07002c, ss_13f50720, ss_95d84cf5, ss_a8bbc17e, ss_190382f1): additional village/defense shots, same caption style (not individually analyzed).

**Wiki images (UI reference)**
- `UI_pop.png`, `Top_panel.png`, `JobsPanel.png`, `ConstructionPanel.png`, `HarvestPanel.png`, `TerrainPanel.png`, `InDev-2018-01-05-4 - Copy.jpg` (weather/time panel) — all on [wiki: Interface](https://rise-to-ruins.fandom.com/wiki/Interface).
- `RiseToRuinsControls-0.jpg` — the in-game controls list (transcribed in A3).
- `WorldMap-0.png` — world map UI (45 regions, 6 biomes).

**YouTube (titles/descriptions mined; transcripts unavailable)**
- [RISE TO RUINS How To Series — FallenShogun Gaming](https://www.youtube.com/playlist?list=PLi9_tXwdXOlgqF3gZVK6aw3eDU4na-iW7) (2017–18, 36K views, ep.1 "Village Placement and Starting Setup") — canonical beginner pacing reference.
- [Playlist incl. "How to survive the night", "Getting more villagers"](https://www.youtube.com/playlist?list=PL4mlfwe2exoIESkeWbclA7OjL8H4Ju2xA) — night-prep ritual on video.
- [Mini Review — "A little Gem"](https://www.youtube.com/watch?v=_iDcKw9SXlU) and ["Fantastic godlike village sim" review](https://www.youtube.com/watch?v=Aw0AMNclQPY) — sentiment references.

---

# PART B — MOBILE ADAPTATION RESEARCH

## B1. Precedents

| Game (platform/year) | Model vs RtR | Control scheme on touch | Session design | What worked | What was criticized |
|---|---|---|---|---|---|
| **Kingdom Two Crowns** (iOS/Android 2020, Raw Fury) | Closest *tension* match: day-build/night-defend, but side-scroller | One-thumb: move L/R + one action; "tailored touch controls that are easy to grasp but makes it hard to put down as you just want to play 'one more day'" ([official announcement](https://www.kingdomthegame.com/news/2020/4/2/kingdom-two-crowns-coming-soon-to-mobile)); virtual pad + controller support ([wiki](https://kingdomthegame.fandom.com/wiki/Controls)) | Continuous "one more day" loop; no save-scumming; landscape | Minimal 3-button input ported perfectly; the day/night deadline creates natural stopping points ([NWR](http://www.nintendoworldreport.com/review/49136/kingdom-two-crowns-switch-review): playable "with just one hand") | **No cancel/undo for coin spends on mobile** — "TL;DR: No cancel option on mobile. I just bought the game 3 hours ago" and quit ([r/kingdomthegame](https://www.reddit.com/r/kingdomthegame/comments/srrqun/)). Lesson: every touch purchase needs an undo window |
| **The Battle of Polytopia** (iOS/Android 2016, Midjiwan) | 4X, turn-based — proves strategy-native- touch | "The original game was designed for touch screens" ([dev interview](https://www.rewinder.co.uk/how-the-battle-of-polytopia-approaches-mobile-vs-pc-switch/)); tap-to-select, tap adjacent tile to move/attack; no drag needed | Matches in **10–30 min** ([Third Coast Review](https://thirdcoastreview.com/games-tech/2021/02/27/review-the-battle-of-polytopia), [CogConnected](https://cogconnected.com/review/battle-polytopia-review/)); **portrait default**; "Mobile game of the year" ([Pocket Gamer via App Store](https://apps.apple.com/us/app/the-battle-of-polytopia/id1006393168)) | Portrait one-handed commute play ("On the go I like to switch to portrait mode" — [r/Polytopia](https://www.reddit.com/r/Polytopia/comments/wf4wpi/)); tiny ruleset = zero onboarding wall | Gamepad port hardest (touch-first DNA); long campaign dilutes the bite |
| **Northgard** (iOS/Android 2021, Playdigious/Shiro) | Closest *RTS-port* match: real-time villager economy + winter survival + combat | Tap select, tap context commands, drag-box for units; "a revamped interface for mobile" ([TouchArcade](https://toucharcade.com/2021/04/13/northgard-mobile-out-now-ios-price-free-dlc-roadmap-playdigious-shiro-games/)); "a reworked UI for touchscreen play" ([Android Police](https://www.androidpolice.com/2021/09/29/embrace-your-inner-viking-with-the-launch-of-northgard-on-android/)) | Premium (~$10) + DLC IAP; classic RTS session of 30–60+ min; **landscape only**; saves suspend mid-match | "The controls are a little cumbersome but once you get used to them it's not too bad. The game runs smooth and looks amazing" ([r/Northgard](https://www.reddit.com/r/Northgard/comments/pazzv9/)); PC players "pleasantly surprised" ([Steam discussion](https://steamcommunity.com/app/466560/discussions/1/3165462410662338853/)) | Port-of-PC-UI complaints: "Everything is pretty weird… like the UI… poorly made" ([r/Northgard](https://www.reddit.com/r/Northgard/comments/1f7m5p0/)); App Store reports of menus bouncing back (input-eaten by gestures); Switch version shipped *without* touch ([NWR](http://www.nintendoworldreport.com/review/51799/northgard-switch-review)) |
| **The Bonfire: Forsaken Lands** (iOS/Android 2017–18, Xigma Games) | Closest *scope* match: tiny day/night survival village builder | Tap-based worker assignment ("send worker" buttons), build-menu taps; "sort of a cross between a survival game and an idle clicker" ([AppUnwrapper](https://www.appunwrapper.com/2018/03/08/the-bonfire-forsaken-lands-review-and-gameplay-videos/)) | Short real-time days; night waves arrive whether you play or not; 2D landscape | "One of the best and most original adaptations of the RTS we've seen on mobile" ([GameFAQs user review](https://gamefaqs.gamespot.com/iphone/234022-the-bonfire-forsaken-lands/reviews)) | "very short… zero replay value and a short experience" — finishing in days felt like poor value ([App Store/GameFAQs](https://gamefaqs.gamespot.com/iphone/234022-the-bonfire-forsaken-lands/reviews)) |
| **Direct RtR-like on mobile** | — | **Does not exist.** RtR has no port; the similarly-named "Rise of Ruins" on Google Play is an unrelated museum game ([Play Store](https://play.google.com/store/apps/details?id=com.TuoMuseo.RiseOfRuins)). Nearest neighbors are the four above + maze-TD hybrids. | — | Open lane for a faithful RtR mobile | — |

**Orientation evidence:** every real-time precedent (Kingdom, Northgard, Bonfire) is **landscape-only**; the sole portrait success (Polytopia) is turn-based with minimal HUD. RtR's HUD is left+right-panel heavy (A2) and its core skill is watching wide maze kill-boxes → **landscape primary** is the evidence-backed choice.

## B2. Touch translation table (every PC verb → recommended gesture)

| # | RtR PC verb | Recommended touch gesture | Pitfalls to design against |
|---|---|---|---|
| 1 | Pan (WASD/edge) | **One-finger drag on empty ground** (free pan, slight inertia). Never edge-pan on touch | Pan vs paint conflict → paint only when a *tool mode* is armed (like PC: tools are modal) |
| 2 | Zoom (wheel, `[`/`]`) | **Pinch zoom, continuous**, anchored at gesture centroid | PC players beg for *more* zoom-out (A1); phone screens need it even more — extend min zoom, and auto-raise sprite contrast below a zoom threshold |
| 3 | Place building (click/drag-paint) | Tap build category (right-anchored **bottom-sheet** menu, regrouped to ~5 thumbs-first tabs from PC's 11) → tap cell to drop ghost → **drag ghost to nudge** → confirm button (or second tap). Multi-place via drag-paint after first confirm | Fat-finger on 32px tiles → render a **ghost offset ~48px above the finger** while dragging (finger never hides what it points at); ghost must show validity tint + rotation; Kingdom's no-undo scandal (B1) → **always offer dismantle-refund confirm** |
| 4 | Drag-paint harvest/walls/roads (6/7/8/9, Z, `,`/`.`) | Arm tool (tap), then **drag-paint** across tiles; brush size = slider in tool tray (replace cycle buttons); erase = toggle (PC's X) or two-finger tap while armed | Accidental paints while panning → tool modes are exclusive with pan; show brush footprint outline live |
| 5 | Select/inspect villager/building | **Tap** to select (info card slides up, never centered — keep map visible); **long-press** for deep inspect (stats/inventory/home) | Occlusion by finger → info card anchors to screen edge nearest thumb-free space |
| 6 | Cancel (ESC/middle-mouse) | **Persistent cancel/close chip in bottom thumb zone** whenever any mode is armed; plus system back-gesture handling | The single most-cited mobile port failure is missing cancel (Kingdom, B1) |
| 7 | Cast spell (1–5, click target) | Spell slots live in the top essence bar (as PC) → tap slot → radius circle follows a **drag**; release to cast; tap-and-release on spot = quick cast | Precise god-bolts on tiny monsters → post-cast 0.5s "sloppy-cast forgiveness": if release is within N px of a valid target, snap to it |
| 8 | Grab creature/object (`` ` ``) | **Drag from target to destination** (the verb is literally drag-drop; a [+] review: "Make Drag-n-Drop your weapon of choice!") | Holding a squirming monster with one finger while panning → while grabbing, one-finger drag moves the *held object*; second finger pans |
| 9 | Pause/speed (SPACE, F5/F6) | **Persistent top-right speed cluster** (pause/play, 1×/2×/3×), same screen position as PC's time panel; big hit areas (≥44px) | Night arrives faster than expected mid-menu → optional **auto-pause on alert** toggle (PC lacks it; mobile needs it — interruptions are constant) |
| 10 | Jobs +/- (left panel) | **Bottom sheet** with steppers; keep live villager-sprite rows (charming and informative) | Sheet must be collapsible to a one-line summary chip; don't let it cover the night sky |
| 11 | Minimap (TAB) + alerts | Minimap collapsed by default (corner bubble); **alert toasts are tap-to-fly** (camera pans to nomads/breach) | Alerts with no jump-to-location are useless on a phone-sized viewport — every alert carries its map coordinate |
| 12 | Dismantle/dig/terrain (I, O, Q, 0) | Tool tray (sticky mode + "Done"); destructive tools get red footprint + confirm | Destroy-terrain is irreversible; add 3s shake-to-undo style confirm on bulk strokes |
| 13 | Data views / problem panel (V, R) | **Toggle chips row** above the bottom bar; problems open a tappable list that flies to each issue | PC players found problems panel essential late-game; hide it early-game to protect onboarding |
| 14 | Hotkey-equivalents (6–0, P/L/V/R…) | None exposed; everything reachable ≤2 taps; optional long-press on panels = power-user shortcuts | Don't port the keyboard UI; RtR's own "can't rebind" complaint (A3) shows rigid input ages badly |

## B3. Session & performance budgets

**Session design**
- Natural chunk = **one in-game day ≈ 12 min at 3×** (~37 min at 1× — dev-confirmed math, A4). Target the Polytopia/Northgard band: **5–15 min core sessions**, with "one more day" as the explicit retention hook (Kingdom's marketing line proves the phrase sells the loop, B1).
- **Save-anywhere with exact-state resume is mandatory** on mobile (OS can kill the app anytime); RtR's PC model — continuously-simulated world, progress bound to mode, save-rollback for corrupt saves (GamingOnLinux) — already implies autosave; add **dawn autosave + snapshot on app-background + auto-pause when night falls if user was idle**. Cautionary quote: PC players complain the save discipline is used as difficulty ("why for any reason is the save feature omitted… For imaginary increased difficulty" — [r/risetoruins](https://api.pullpush.io/reddit/search/comment/?subreddit=risetoruins&q=day%20length)); a mobile port should be *more* generous, not less.
- Night as the interrupt boundary: design sessions to end at dawn/dusk beats; never let the player get ambushed by night while re-launching the app (resume paused at the start of the phase they left in).

**Performance/battery (hundreds of pathfinding agents)**
- Evidence of strain on PC: "can get a bit slow during late game on old hardware (e.g. my +10 year old laptop)" ([+] review); "I've definitely noticed the game taking a huge hit in performance with a bigger village" ([r/risetoruins](https://api.pullpush.io/reddit/search/comment/?subreddit=risetoruins&q=mobile)); the dev admits TPS "might slow down if your computer is bogged down" ([time-scale thread](https://steamcommunity.com/app/328080/discussions/0/1742232339945026370/)) — i.e., **sim-speed is coupled to frame-rate**; a phone thermal-throttling must not slow the *day clock*, or pacing breaks.
- Budget recommendations: stagger/path-cache A* (villagers re-path rarely; flows to fixed targets), time-slice AI across frames, cap sim-visible agents with LOD (off-screen villagers update at reduced tick), **30fps cap + reduced-particles battery mode** (RtR already ships a particles slider — reuse it), decouple day-clock from render rate (fixed-timestep sim), and test the 4000-population scenario (community mega-village, B1 note) as the worst case. RtR simulates one region at a time — keep that; it's the single biggest mobile-savings property of the original design.

**Orientation & input summary:** landscape-primary (all real-time precedents); free-pan + pinch zoom; modal tools so pan never fights paint; bottom-sheet build menu; persistent speed cluster; alert-toasts that fly the camera; undo/confirm everywhere destructive.

---

## Confidence & gaps

**High confidence** (multi-source): HUD panel inventory; hotkey list; speed model (pause + 1×/2×/3×); first-attack timing per mode; no-official-mobile-port; day≈36.7 min at 1× (dev-stated); night-music adaptation; zoom-out complaints; onboarding-opacity as top complaint; precedents' control schemes and criticisms.

**Medium confidence** (single source or inferred): 16×16-tile art scale (inferred from screenshots; no official statement found); exact share of the day that is night (varies by season; not pinned); particle/cloud FX details from single reviews; save-scumming specifics; "3× is max speed" (EA-era review — later speeds possible).

**Unknown / unverified:** current settings-itemized list (would need the game running); whether any post-2023 builds changed UI; exact SFX inventory and positional-audio behavior; frame-rate cap today (60 noted in EA); whether the dev ever *answered* a mobile-port question publicly (searched AMA + news — no such question surfaced); villager-inspection UI depth (no wiki page documents the click-a-villager panel fully); the "Road to Release 1" dev-post body (Steam link, text not retrievable via API in this session).

## Sources

**Store/marketing**
- Steam store page: https://store.steampowered.com/app/328080/Rise_to_Ruins/ (copy, soundtrack credit, min spec, modes, price)
- Steam appreviews API (60 reviews mined, 2026-09): https://store.steampowered.com/appreviews/328080?json=1
- GOG listing: https://www.gog.com/en/game/rise_to_ruins

**Press/reviews**
- Rock Paper Shotgun — Adam Smith, "Herding skeletons and settling scores in Rise To Ruins" (2018): https://www.rockpapershotgun.com/rise-to-ruins-village-management
- Save or Quit review (2017): https://saveorquit.com/2017/04/11/review-rise-to-ruins/ ; RPC preview (2014): https://saveorquit.com/2014/11/17/review-retro-pixel-castles/
- Highland Piper EA review ("A Godlike Stimulator"): https://highlandpiper-sc.com/1281/entertainment/games-steam-early-access-game-review-rise-to-ruins-a-godlike-stimulator/
- GamingOnLinux on the 2018 World Update (+ comment quotes): https://www.gamingonlinux.com/2018/09/village-building-god-sim-rise-to-ruins-had-an-absolutely-massive-update/
- Metacritic (no critic reviews): https://www.metacritic.com/game/rise-to-ruins/

**Dev statements**
- Reddit AMA (Oct 2019, via pullpush archive): https://www.reddit.com/r/IAmA/comments/did8rl/
- Steam news: "Funding Secured." https://store.steampowered.com/news/app/328080/view/5127884013766587984 ; "Plans Secured." https://store.steampowered.com/news/app/328080/view/3121557478192966379 ; Update 2d notes https://store.steampowered.com/news/app/328080/view/3712711277286541677
- Dev time-scale answer: https://steamcommunity.com/app/328080/discussions/0/1742232339945026370/
- Dev site (placeholder): https://www.risetoruins.com/

**Wiki** (all https://rise-to-ruins.fandom.com/wiki/…): Interface, Controls (image), Quick Guide, Game_modes, Spells, Events, Blood_Moon, World_Map, Roads, Villagers, Corruption

**Community**
- r/risetoruins via pullpush (top posts + comment searches): https://api.pullpush.io/reddit/search/submission/?subreddit=risetoruins
- r/BaseBuildingGames "most underrated" thread: https://www.reddit.com/r/BaseBuildingGames/comments/1i3h5vy/

**Mobile precedents**
- Kingdom Two Crowns mobile announcement: https://www.kingdomthegame.com/news/2020/4/2/kingdom-two-crowns-coming-soon-to-mobile ; controls wiki: https://kingdomthegame.fandom.com/wiki/Controls ; no-cancel complaint: https://www.reddit.com/r/kingdomthegame/comments/srrqun/ ; NWR Switch review: http://www.nintendoworldreport.com/review/49136/
- Polytopia: dev interview https://www.rewinder.co.uk/how-the-battle-of-polytopia-approaches-mobile-vs-pc-switch/ ; reviews: https://thirdcoastreview.com/games-tech/2021/02/27/review-the-battle-of-polytopia , https://cogconnected.com/review/battle-polytopia-review/ ; orientation thread: https://www.reddit.com/r/Polytopia/comments/wf4wpi/
- Northgard mobile: https://toucharcade.com/2021/04/13/northgard-mobile-out-now-ios-price-free-dlc-roadmap-playdigious-shiro-games/ ; https://www.androidpolice.com/2021/09/29/embrace-your-inner-viking-with-the-launch-of-northgard-on-android/ ; https://www.reddit.com/r/Northgard/comments/pazzv9/ ; https://www.reddit.com/r/Northgard/comments/1f7m5p0/ ; NWR http://www.nintendoworldreport.com/review/51799/
- The Bonfire: Forsaken Lands: https://toucharcade.com/2018/03/07/the-bonfire-forsaken-lands-review/ ; https://www.appunwrapper.com/2018/03/08/the-bonfire-forsaken-lands-review-and-gameplay-videos/ ; https://gamefaqs.gamespot.com/iphone/234022-the-bonfire-forsaken-lands/reviews
- Unrelated namesake check: https://play.google.com/store/apps/details?id=com.TuoMuseo.RiseOfRuins

**Media reference** (do not download; copyright SixtyGig/Raymond Doerr): Steam screenshots ss ids 0–11 (`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/328080/ss_*.1920x1080.jpg`), trailer movie id 256721713, wiki UI images listed in A7, YouTube playlists listed in A7.
