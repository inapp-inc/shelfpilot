/**
 * Client mirror of the API's fixture load defaults (services/weightMath.js), so
 * form placeholders show the same safe working load the engine will apply when a
 * fixture leaves the field blank.
 */

import { formatWeightFromKg } from "./units.js";

export const DEFAULT_LEVEL_LOAD_KG = {
  shelf: 80,
  gondola: 100,
  rack: 150,
  storage: 300,
  pallet: 500,
  freezer: 120,
  chiller: 120,
};

export const FALLBACK_LEVEL_LOAD_KG = 80;

export function defaultLevelLoadKg(shelf) {
  return DEFAULT_LEVEL_LOAD_KG[shelf?.type] ?? FALLBACK_LEVEL_LOAD_KG;
}

/**
 * Human-readable warning when the API reports a placement pushed a level past
 * its safe working load. Placement still succeeds — the planner decides.
 */
export function weightWarningMessage(layout) {
  const w = layout?.weightWarning;
  if (!w) return null;
  return `Level ${w.levelIndex} is over its weight limit: ${formatWeightFromKg(
    w.loadKg
  )} on a ${formatWeightFromKg(w.limitKg)} shelf.`;
}

/** Effective per-level limit including any explicit fixture override. */
export function levelLoadLimitKg(shelf, levelCount = 1) {
  const perLevel = Number(shelf?.maxLoadKgPerLevel);
  if (Number.isFinite(perLevel) && perLevel > 0) return perLevel;
  const total = Number(shelf?.maxLoadKg);
  if (Number.isFinite(total) && total > 0) return total / Math.max(1, levelCount);
  return defaultLevelLoadKg(shelf);
}
