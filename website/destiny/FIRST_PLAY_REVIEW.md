# Why the opening feels harder than it should

Historical opening review, before the connected industry/frontier pass. See [GAMEPLAY_AUDIT.md](GAMEPLAY_AUDIT.md) for the current implementation and measured campaigns.

The main problem is learning effort before payoff. This is a design assessment based on Destiny's current code and a walkthrough of its opening, compared with the systems described by Rise to Ruins' developer. It is not a claim that Rise to Ruins has no onboarding problems, or that these changes guarantee fun.

## What the reference offers

Rise to Ruins combines a village you can watch, tools you can experiment with, and survival pressure. Its developer describes a deliberate blend of village simulation, godlike powers and RTS simplicity. The player can alter terrain, intervene in danger and try different ways to survive. That offers reasons to learn the controls beyond completing a checklist. [Developer description](https://rayvolution.itch.io/risetoruins)

Its world also has persistent stakes: migration, couriers, shared corruption, goals and perks connect settlements into a longer story. Destiny's atlas currently offers geographic continuity and separate villages; it does not yet have those economic or progression links. [World update](https://rayvolution.itch.io/risetoruins/devlog/48767/indev-31-the-world-update-released)

## What I found in Destiny

1. **Too many decisions before context.** Twenty-four regions, four modes, six resource counters and thirteen buildings are available before the player has watched a village function. The choices have costs, but their value is not yet obvious.
2. **A confusing second action.** After completing the hearth, the cottage objective used to open a disabled Build button with no suggested site. The objective disappeared while placing, leaving only a generic instruction. Villagers standing in a footprint can also prevent construction. This looks like a dead end when the player is still learning.
3. **The village waits for the interface.** Only one worker claims a given construction job. Once the hearth is complete, all six villagers may stand idle until another order is issued. Needing manual harvest marks or a specialized production building creates another instruction to learn before the landscape becomes active.
4. **Consequences are separated from their causes.** A cottage adds beds, but arrivals happen at dawn and also depend on supplies and morale. The player does not immediately see why that cottage mattered. Food demand, worker travel and ammunition likewise need visible explanations.
5. **Names require decoding.** “Beamwright,” “Farwatch” and “Keepshed” have flavor, but they do not teach their function. Cards need plain purposes alongside names.
6. **Breadth grew faster than the core loop.** More regions and difficulty modes add replay choices. They do not create satisfying minute-to-minute activity by themselves. Balancing monsters cannot solve unclear placement or an idle-feeling village.

## Changes completed in this pass

- The next objective and building cards offer a legal nearby site, with an actual building ghost. The player can accept it, rotate it or tap another location.
- Placement explains the building's benefit instead of counting footprint cells.
- Cards explain their purpose, and the recommended next building moves to the front of the tray.
- Difficulty previews explain starting supplies and the first raid. The Village panel shows daily food/water needs, wave composition and minimum tower ammunition.

## The next design priority

Make the first five minutes a short sequence of understandable outcomes while retaining free building and map choice:

| Stage | Player choice | Visible response | What it teaches |
| --- | --- | --- | --- |
| Arrive | Accept a recommended start or explore | Travelers and an inviting clearing | You are beginning a village, not configuring a scenario |
| Establish | Place the hearth | Builders work; other villagers begin useful camp work | Your orders make a living scene respond |
| Gather | Mark a nearby grove | A tree falls and timber is carried home | Resources are physical and workers need routes |
| Shelter | Place a cottage at a suggested site | The home finishes and its upcoming arrivals are explained | Building creates room for growth |
| Sustain | Add water and a field | Deliveries and daily demand become visible | A growing village needs a working economy |
| Defend | Prepare for a clearly forecast small raid | Towers intercept threats; stone is spent visibly | Defense is a choice about placement and supply |

Introduce advanced powers, work priorities and larger expansion decisions when the player has a reason to use them. Do not force a long tutorial or lock experienced players into a prescribed layout. Keep challenge in meaningful village decisions, while making the controls and feedback straightforward.

This larger sequence is a proposed follow-up, not a claim that automatic camp work, immediate arrivals, migration or world progression have been implemented.
