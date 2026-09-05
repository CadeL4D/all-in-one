# Read the settlement, choose the response

This pass addresses visibility and player control after the frontier economy update. It does not add attachment systems or increase population, scarcity, or raid frequency.

## Player-facing changes

- The resource strip includes ammunition, planks, tools, and meals. It scrolls sideways on phones, with a persistent Flow button. Its 44px buttons leave at least 684px of map height in the 390 × 844 test viewport.
- Flow shows actual goods produced and used today or on the previous recorded day. Moving stock into a building or warehouse is not counted as consumption or production. Finished goods include loads not yet deposited. Building orders count as use when paid. Trade, losses, refunds, and starting reserves are excluded and explained in the view. Old saves begin recording when opened; the first recorded day may be partial.
- In Look mode, buildings show readable warning badges for missing inputs, waiting for haulage, and blocked access. Loaded towers and warehouse inventories are available through inspection. Badges avoid overlap, and the Flow list includes every building even when a map badge is hidden or off screen. Tap a badge or list entry to inspect its cause. Signals refresh once per second to avoid running path searches each frame.
- The labor summary separates work, hauling, rest, and time between jobs. Idle reasons distinguish no production demand, jobs already staffed, and inaccessible jobs. Idle village movement is not reported as productive work.
- Assigned roles are now a separate job-selection tier ahead of unrelated priorities. A dedicated hauler role covers construction freight and workshop/tower replenishment. Workers finish their current job, choose reachable work in their trade, and help elsewhere when none is available. Urgent food, water, and care still take precedence. This does not create permanent villager careers.
- Guidance defaults to the opening chapter only. After the hearth, home, well, and field are established, the map shows a compact supply-status button instead of prescribing the next build. Village → Guidance lets players keep suggestions on or turn them off immediately. Chapter milestones remain available for voluntary planning; changing guidance does not erase progress. Existing automatic camp gathering remains an explicit independent option under Industry & supplies.
- Supply inspection remains live, as do the existing management sheets. The clock pauses play; save/help dialogs retain their existing pause behavior.

## Verification

New simulation checks exercise shortage/haul/transit/blocked-route distinctions, insufficient partial batches, local tower shots, actual role selection under conflicting priorities, emergency overrides, hauler assignments, idle reasons, recipe accounting, day rollover, malformed history, and save restoration. Building previews and delivery transfers do not alter production/use totals.

The mobile Flow browser test checks refined resources, partial/missing history, live inspection, guidance fading after onboarding, explicit opt-in, persistence, hauler controls, and building inspection. The existing comprehensive mobile and depth browser tests cover harvesting, two-finger panning, building lines, production, progression, convoys and saved villages. The deployment smoke test checks all 37 public files, the island, 24 territories, and offline reload with cache version 21.

The older browser fixture that deliberately moves a late village backward in time now discards its production history; real saves retain it. The older advisor test explicitly opts into guidance to keep testing that feature.

These tests establish function, not human enjoyment. The next useful human session is to create a workshop shortage, ask the player what is wrong without offering a solution, and observe whether their chosen intervention resolves it. No human-playtest success is claimed here.

A returning browser exposed stale HTTP-cache dependencies during service-worker installation. New shell installations now fetch all modules with cache reload semantics before activation, preventing an incompatible mix of old and new module exports.
