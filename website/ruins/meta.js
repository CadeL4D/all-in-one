// The meta layer (doc 01 section 5.2): god XP, perk picks, and owned perk
// ranks. Meta is GLOBAL - it persists through lost villages and started
// worlds (RtR: "progress in the form of perks/goals persists"). In the
// browser it lives in its own localStorage slot beside the world save; in
// node tests there is no localStorage and the state copy is the only home.
import * as B from "./balance.js";

export const META_KEY = "ruins-meta-v1";

export function createMeta() {
  return {
    xp: 0, // lifetime god XP
    spent: 0, // XP consumed by earned picks so far
    granted: 0, // picks earned over all time (drives the cost ladder)
    picks: 0, // banked, unspent perk picks
    perks: {}, // key -> rank
  };
}

export function loadMeta() {
  try {
    const raw = globalThis.localStorage?.getItem(META_KEY);
    if (!raw) return createMeta();
    const data = JSON.parse(raw);
    return { ...createMeta(), ...data, perks: { ...(data.perks ?? {}) } };
  } catch {
    return createMeta();
  }
}

export function saveMeta(meta) {
  try {
    globalThis.localStorage?.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* private mode: meta lives only in this session's state */
  }
}

// Cost of the NEXT pick: the first comes inside one long session, each
// after it costs 30% more - the chest grind's shape without the gambling.
export function nextPickCost(meta) {
  return Math.round(B.XP_FIRST_PICK * Math.pow(B.XP_PICK_GROWTH, meta.granted));
}

// Award XP for a play action (key into B.PERK_XP). Banked picks surface as
// events the UI toasts; the god panel's Perks button spends them.
export function addXp(state, key, times = 1) {
  const meta = state.meta;
  const amount = (B.PERK_XP[key] ?? 0) * times;
  if (!amount) return 0;
  meta.xp += amount;
  let earned = 0;
  while (meta.xp - meta.spent >= nextPickCost(meta)) {
    meta.spent += nextPickCost(meta);
    meta.granted += 1;
    meta.picks += 1;
    earned++;
  }
  if (earned) state.events.push({ type: "perk-earned", count: earned, picks: meta.picks });
  return amount;
}

export function perkRank(state, key) {
  return state.meta?.perks?.[key] ?? 0;
}

// The one multiplier reader: 1 + perRank x owned rank.
export function perkMult(state, key, perRank) {
  return 1 + perRank * perkRank(state, key);
}

// Three distinct boons not yet at max rank (fewer if the pool runs dry).
export function rollPerkChoices(state, rng) {
  const open = Object.keys(B.PERKS).filter((k) => perkRank(state, k) < B.PERKS[k].maxRank);
  const want = Math.min(B.PERK_CHOICES, open.length); // fixed target: open drains as we draw
  const choices = [];
  while (choices.length < want) {
    const i = rng.int(0, open.length - 1);
    choices.push(open.splice(i, 1)[0]);
  }
  return choices;
}

// Spend a banked pick on a boon. The RNG for choices lives on the UI side;
// this only validates and stamps.
export function pickPerk(state, key) {
  if (state.meta.picks <= 0) return { ok: false, reason: "No boon to claim" };
  const spec = B.PERKS[key];
  if (!spec) return { ok: false, reason: "Unknown boon" };
  const rank = perkRank(state, key);
  if (rank >= spec.maxRank) return { ok: false, reason: "Already mastered" };
  state.meta.picks -= 1;
  state.meta.perks[key] = rank + 1;
  state.events.push({ type: "perk-picked", key, name: spec.name, rank: rank + 1 });
  saveMeta(state.meta);
  return { ok: true, rank: rank + 1 };
}
