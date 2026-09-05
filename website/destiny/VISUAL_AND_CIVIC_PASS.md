# Screenshot study, visual changes and village decisions

September 4, 2026. Follow-up to [GAMEPLAY_AUDIT.md](GAMEPLAY_AUDIT.md).

## References inspected

Image search found several Rise to Ruins gameplay views. Two full screenshots were opened and visually inspected: a mature settlement with planted rows and a smaller settlement with purple roofs, work yards, loose supplies and a sharply outlined blue shoreline. [Steam community screenshots](https://steamcommunity.com/app/328080/), [mature settlement image](https://steamuserimages-a.akamaihd.net/ugc/772858335313070201/5E4375898EFBD5580DEDCF5956AC4D3993DD42D7/), [smaller settlement image](https://steamuserimages-a.akamaihd.net/ugc/777352432734232085/EE8C415F07695F228EBBB5C32B3C15ED8F11D959/)

The developer's description also emphasizes mixing village management with direct intervention and survival. That supports giving the player choices about labor and supplies, alongside the visual work. [Developer overview](https://rayvolution.itch.io/risetoruins)

The screenshots guided palette, silhouette, contrast and visible activity. Destiny's sprites are drawn locally in canvas code; no screenshot crops or extracted game assets are included. This is a closer visual direction, not a pixel-for-pixel reproduction.

## Implemented visuals

- Olive grass with small texture marks and broader color patches; blue water, shallow margins and shoreline stones.
- Darker tree and rock silhouettes, stepped evergreen branches and clustered broadleaf crowns.
- Purple cottage roofs, shaded roof edges, stepped pitched roofs and contrasting chimneys.
- Paved foundation details, building frames that gain scaffolding/materials during construction, and visible store crates based on timber/stone stocks.
- Small activity bars and sparks at working workshops, colored hats for preferred worker roles, smoke and warmer night lighting.
- A visiting wagon appears near a completed store on available ground during a caravan visit. It is a visual presence, not a simulated traveling courier.
- Compact earth-colored interface frames with shallow corners. Mobile target sizes and separate screen-resolution text are retained.

Terrain detail is cached in two native-resolution ripple frames, invalidating when terrain or trails change. People, structures, activity and effects still render dynamically. This avoids repainting thousands of decorative ground marks on every frame. Rendering stays on the existing integer physical-pixel camera grid.

## Workforce choices

Village → Assign the workforce allows builder, grower, gatherer and artisan preferences. Builders favor construction and projects; growers favor food, water and treatment; gatherers favor deposits, mines and forestry; artisans favor refinement. At least one person remains a general worker. Specialists help with other tasks if their preferred work is unavailable, and current jobs are not cancelled when the player adjusts the plan.

Urgent food and water below ten units, and medical care, receive stronger priority than specialization. The existing overall work-priority setting still applies. Counts shown are current assignments; after deaths or arrivals the plan applies to the available population. Plans persist in saves, and old saves begin with everyone available for general work. Colored hats provide a map cue without adding labels over every citizen.

These are preferences, not hard profession locks or skill-level bonuses. They are intended to let the player change economic emphasis without creating a starvation trap through a single assignment mistake.

## Recurring caravans

The first visit starts on day five. Caravans stay for two days and return every four days. Each visit allows one transaction, requires a completed Keepshed and sufficient storage room, and adds five morale. The chronicle announces arrivals and a short notice points to the Village controls.

| Offer | Give | Receive | Purpose |
| --- | --- | --- | --- |
| Feed the road | 12 meals | 35 stone | Turn kitchen output into defense supplies |
| Equip the travelers | 6 tools | 40 food + 30 water | Exchange industry output for a seasonal buffer |
| Timber for the frontier | 40 timber | 12 planks + 4 tools | Spend early timber to accelerate industry or an expedition |

Only a successful trade records a visit receipt. Insufficient supplies, a missing depot or a full store spend nothing. Reloading cannot repeat a completed visit. There is no penalty for ignoring a caravan; the base survival strategy does not depend on it. Unlike player-to-player-region convoys, this is an external merchant trade and does not subtract goods from another saved settlement.

## Verification

49 simulation tests pass, including workforce preferences, emergency priority, save migration, recurring visits, trade atomicity and receipt persistence. Both browser suites pass, including phone workforce controls, an actual caravan transaction and its persisted state after reload. Six baseline campaigns still reach day 23 with twelve villagers and six completed chapters. With the new urgent-care priority, the Onslaught run finishes with 47 stone, 227 food and 80 water; the other baseline cases retain the earlier results.

The baseline campaigns do not use the new optional workforce controls or caravan trades. Dedicated tests establish their mechanics, while subjective pacing and the value of the trade choices still need player feedback. The visual review covers phone and desktop views; it is not a performance certification for every physical device.
