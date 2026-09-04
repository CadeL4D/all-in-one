# Destiny To Yours

Design research and planning notes for an original city-builder inspired by the systemic appeal of games such as *Rise to Ruins*.

## Start here

Read [Why *Rise to Ruins* Is Fun — and How *Destiny To Yours* Can Learn From It](CITY_BUILDER_FUN_DESIGN_GUIDE.md).

Then use the [Mechanic-to-Fun Atlas](MECHANIC_TO_FUN_ATLAS.md) to trace each planned mechanic from player choice through tradeoff, feedback, failure diagnosis, connected systems, procedural variation, and prototype testing.

The guide examines:

- The moment-to-moment settlement loop.
- Citizens, jobs, logistics, production, defense, crises, and progression.
- Why visible cause and effect makes city-building satisfying.
- How calm preparation and urgent pressure reinforce one another.
- Common frustrations that can make simulations feel confusing or repetitive.
- Original design pillars and a distinct identity for *Destiny To Yours*.
- A city-first gameplay architecture in which defense tests and supplements the settlement.
- A fine placement grid with irregular building footprints and Tetris-like district planning.
- A semi-simple pixel-art direction with an original civic “thread” motif and naming rules.
- A procedurally generated island divided into connected, locally generated settlement sections.
- Three proof builds, systems architecture, interface hierarchy, balancing strategy, and a phased production roadmap.
- A mechanic-by-mechanic fun audit and implementation order for the peaceful city, defense, and island proofs.
- [Enjoyment priorities](CITY_BUILDER_FUN_DESIGN_GUIDE.md#enjoyment-priorities-reasons-to-keep-improving-the-town): visible improvements, alternative solutions, optional projects, discoveries, partial victories, automation, and a shared island ambition—with prototype tests.

## Core design direction

*Destiny To Yours* should first be an excellent city-builder about promises and consequences. The player fits differently shaped buildings into fine-grained terrain, guides a living settlement, juggles labor and physical logistics, makes civic commitments, and watches those decisions become visible stories. Defense is substantial, but it uses and tests the city rather than replacing city building.

The central loop is:

```text
observe → choose → build → watch → endure → diagnose → improve
```

The goal is to learn from successful system relationships—not to reproduce another game’s names, content, art, interface, code, or exact balance.

The larger campaign takes place on a generated island. The player chooses a section, chooses where within it to establish a village, specializes settlements around regional opportunities and burdens, and connects them through migration, trade, shared danger, and history.

## Recommended next step

Begin with the paper placement prototype in the main guide: one fine grid and ten to fifteen varied building cutouts with entrances, delivery points, yards, roads, and upgrade space. Prove that arranging a compact town is enjoyable before implementing the full citizen simulation, defense, or generated island.
