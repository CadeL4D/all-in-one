# Play-flow refinement

This round focuses on using the existing systems rather than adding another resource chain.

## Gaps found

The chapter roadmap could leave the player looking at a population target or waiting for the second spring while industry, expeditions and trade were available elsewhere. Building inspection commonly said “Ready” without explaining why nothing was happening. Workforce preferences affected categories of jobs, but the player could not prioritize one important site. Completing the shrine expedition also needed a clearer handoff to choosing its reward.

## Changes

- **Worth doing now:** the Village panel shows at most three current actions. They account for food/water reserves, damaged buildings, caravan visits, unclaimed blessings, available expeditions and affordable industry prerequisites. Already-built or queued buildings are not suggested again.
- **Actionable next step:** when a chapter is waiting on a broad milestone, its map button can offer an available action while preserving chapter progress. It takes the player directly to the building, expedition or expanded Village panel. A recovered shrine opens the blessing choices. A lost village's objective opens the atlas.
- **Specific building priorities:** construction sites, projects and production buildings can be prioritized individually. This changes the next job a free worker chooses; it does not cancel a worker's current trip. Urgent food, water and medical work outrank combined building, workforce and global preferences.
- **Production controls:** farms, wells, quarries, foresters and infirmaries can pause and resume from inspection, alongside the existing workshop controls. Workers already engaged in some production tasks can finish the current job. Settings persist in saves.
- **Useful status:** inspection distinguishes construction queues, assigned/traveling workers, paused production, stock targets, project progress and unreachable workplaces.

The recommendations are bounded heuristics, not an omniscient optimizer. A caravan recommendation identifies an available visit, not a guarantee that every offered trade is affordable. Suggestions do not spend resources or issue orders until the player acts.

## Validation and stopping point

Simulation tests cover relevant advice during milestone waits, urgent needs, queued-building exclusion, status explanations, real worker assignment after prioritizing a building, and persistence. Browser coverage exercises next-step navigation, pausing a well, choosing a blessing through a suggestion and inspecting the first cache (whose numeric ID is zero).

This round also caught a panel-toggle bug: a shortcut inside the already-open Village panel was closing its parent. Shortcuts now explicitly keep the target panel visible. The earlier chapter campaign, harvest painting, two-finger navigation, line building and save flows remain covered by the existing regression suite.

After this pass, the useful next step is a full human play session through the first winter before adding further systems. Watch for long idle periods, suggestions that repeat without helping, unclear production bottlenecks, and whether optional expeditions feel rewarding. More feature count alone will not answer those questions.
