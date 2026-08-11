/**
 * Floor-plan import helpers (server).
 * @see Docs/FLOOR_PLAN_IMPORT_SPEC.md
 */

/** Full-store rectangle polygon for fixture zone after floor-plan create. */
export function fullStorePolygon(widthMeters, depthMeters) {
  const w = Number(widthMeters) || 0;
  const d = Number(depthMeters) || 0;
  if (w <= 0 || d <= 0) return [];
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: d },
    { x: 0, y: d },
  ];
}

/** Bind floor-plan underlay metres to confirmed store envelope. */
export function floorPlanEnvelopeBinding(layout, fpPayload = {}) {
  const w = Number(fpPayload.widthMeters ?? layout?.widthMeters) || 10;
  const d = Number(fpPayload.depthMeters ?? layout?.depthMeters) || 8;
  return {
    x: 0,
    y: 0,
    widthMeters: w,
    depthMeters: d,
  };
}

export function inferFloorPlanSourceType(fileName, explicit) {
  if (explicit === "pdf" || explicit === "image" || explicit === "svg") return explicit;
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".svg")) return "svg";
  return "image";
}
