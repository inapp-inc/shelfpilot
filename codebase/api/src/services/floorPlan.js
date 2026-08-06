/**
 * Floor-plan underlay calibration.
 *
 * An uploaded architectural drawing is placed on the layout by stating how wide
 * and deep it should be drawn in metres, so the planner calibrates by matching a
 * known dimension (a wall run, a door) to the drawing and then traces over it.
 *
 * Pure geometry only — image storage lives in floorPlanImages.js.
 */

export function normalizeFloorPlan(floorPlan) {
  if (!floorPlan || !floorPlan.url) return null;
  return {
    url: String(floorPlan.url),
    fileName: floorPlan.fileName ? String(floorPlan.fileName) : null,
    x: Number(floorPlan.x) || 0,
    y: Number(floorPlan.y) || 0,
    widthMeters: Math.max(0.5, Number(floorPlan.widthMeters) || 10),
    depthMeters: Math.max(0.5, Number(floorPlan.depthMeters) || 8),
    rotationDeg: (((Number(floorPlan.rotationDeg) || 0) % 360) + 360) % 360,
    opacity: Math.min(1, Math.max(0.05, Number(floorPlan.opacity ?? 0.5))),
    visible: floorPlan.visible !== false,
    locked: floorPlan.locked === true,
  };
}

/** Merge a calibration patch onto an existing floor plan. */
export function patchFloorPlan(existing, patch = {}) {
  if (!existing) return null;
  const next = { ...existing };
  for (const key of [
    "x",
    "y",
    "widthMeters",
    "depthMeters",
    "rotationDeg",
    "opacity",
    "visible",
    "locked",
  ]) {
    if (patch[key] !== undefined) next[key] = patch[key];
  }
  return normalizeFloorPlan(next);
}
