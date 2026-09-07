// Fixed-timestep day clock. The sim ticks headless at TICKS_PER_SECOND;
// rendering samples it. Phases have a progress bar, not a clock (RtR).
import { DAY_TICKS, PHASES } from "./balance.js";

export function createClock() {
  return { tick: 0, day: 1, phaseIndex: 0 };
}

export function phaseStart(phaseIndex) {
  let start = 0;
  for (let i = 0; i < phaseIndex; i++) start += PHASES[i].fraction;
  return Math.round(start * DAY_TICKS);
}

export function advance(clock, ticks) {
  clock.tick += ticks;
  clock.day = Math.floor(clock.tick / DAY_TICKS) + 1;
  const into = clock.tick % DAY_TICKS;
  let acc = 0;
  for (let i = 0; i < PHASES.length; i++) {
    acc += PHASES[i].fraction * DAY_TICKS;
    if (into < acc) {
      clock.phaseIndex = i;
      return;
    }
  }
  clock.phaseIndex = PHASES.length - 1;
}

export function phaseInfo(clock) {
  const into = clock.tick % DAY_TICKS;
  const start = phaseStart(clock.phaseIndex);
  const span = PHASES[clock.phaseIndex].fraction * DAY_TICKS;
  return {
    key: PHASES[clock.phaseIndex].key,
    label: PHASES[clock.phaseIndex].label,
    progress: Math.min(1, (into - start) / span),
    day: clock.day,
  };
}

// 0 = deep night, 1 = full daylight. Smooth ramps at dawn/dusk for grading.
export function daylight(clock) {
  const into = clock.tick % DAY_TICKS;
  const spans = PHASES.map((p) => p.fraction * DAY_TICKS);
  const edges = [];
  let acc = 0;
  for (const s of spans) {
    edges.push([acc, acc + s]);
    acc += s;
  }
  const [dawn0, dawn1] = edges[0];
  const [dusk0, dusk1] = edges[4];
  const [night0, night1] = edges[5];
  if (into >= dawn0 && into < dawn1) {
    const t = (into - dawn0) / (dawn1 - dawn0);
    return 0.15 + 0.85 * t;
  }
  if (into >= dusk0 && into < dusk1) {
    const t = (into - dusk0) / (dusk1 - dusk0);
    return 0.85 - 0.7 * t;
  }
  if (into >= night0 && into < night1) return 0.15;
  return 1;
}

export function isNight(clock) {
  return PHASES[clock.phaseIndex].key === "night";
}

// Ticks until the dawn that follows `tick`.
export function ticksUntilDawn(tick) {
  const into = tick % DAY_TICKS;
  const nightStart = phaseStart(5);
  return into < nightStart ? nightStart - into : DAY_TICKS - into;
}
