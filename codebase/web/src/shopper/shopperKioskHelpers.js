import { shelfMarkerFootprint } from "./shopperWayfinding.js";

/** Resolve physical shelf id → map display unit id (merged gondola). */
export function mapHighlightShelfId(layout, physicalShelfId) {
  if (!physicalShelfId || !layout?.shelves) return physicalShelfId;
  const shelves = layout.shelves;
  const phys = shelves.find((s) => s.id === physicalShelfId);
  if (!phys) return physicalShelfId;

  const merged = shelves.find(
    (s) =>
      s.pairDisplay &&
      (s.id === physicalShelfId ||
        s.pairShelfIds?.front === physicalShelfId ||
        s.pairShelfIds?.back === physicalShelfId)
  );
  if (merged) return merged.id;

  if (phys.pairId && phys.pairRole === "back") {
    const front = shelves.find((s) => s.pairId === phys.pairId && s.pairRole !== "back");
    if (front) return front.id;
  }
  return physicalShelfId;
}

/** Pick the map face id when highlighting a gondola half. */
export function mapHighlightFaceShelfId(layout, physicalShelfId) {
  return physicalShelfId;
}

/** Customer-facing chip label for a planogram placement row. */
export function placementSpotLabel(placement, index = 0) {
  if (!placement) return `Spot ${index + 1}`;
  const parts = [];
  if (placement.aisleLabel) parts.push(`Aisle ${placement.aisleLabel}`);
  const bay = String(placement.shelfLabel || "")
    .replace(/\s·\sFace\s[AB]$/i, "")
    .trim();
  if (bay) parts.push(bay);
  if (placement.levelLabel) parts.push(`L${placement.levelLabel}`);
  return parts.length ? parts.join(" · ") : `Spot ${index + 1}`;
}

export function highlightShelfIdsForPlacements(layout, placements = []) {
  const ids = new Set();
  for (const row of placements) {
    if (!row?.shelfId) continue;
    ids.add(mapHighlightShelfId(layout, row.shelfId));
  }
  return [...ids];
}

/**
 * Map markers for every placement; primary spot uses route approach geometry when provided.
 */
export function buildShelfMarkersForPlacements(layout, placements, { primaryShelfId = null, route = [] } = {}) {
  if (!layout || !placements?.length) return [];
  const aisleNearPrimary =
    primaryShelfId && route?.length >= 2 ? route[route.length - 2] : null;

  return placements
    .map((placement, idx) => {
      const shelfId = placement.shelfId;
      if (!shelfId) return null;
      const isPrimary = shelfId === primaryShelfId;
      const footprint = shelfMarkerFootprint(
        layout,
        shelfId,
        isPrimary ? aisleNearPrimary : null
      );
      if (!footprint) return null;
      return {
        placementId: placement.id,
        shelfId,
        spotIndex: idx + 1,
        isPrimary,
        footprint,
        label: placementSpotLabel(placement, idx),
        placement,
      };
    })
    .filter(Boolean);
}

export function nearestPlacementFromEntry(layout, entryPoint, placements, { computeRoute, routeLengthMeters }) {
  if (!layout || !placements?.length || !computeRoute || !routeLengthMeters) {
    return { placement: placements?.[0] || null, walkMeters: null };
  }
  let best = placements[0];
  let bestLen = Infinity;
  for (const row of placements) {
    if (!row?.shelfId) continue;
    const path = computeRoute(layout, entryPoint, row.shelfId);
    const len = routeLengthMeters(path);
    if (len < bestLen) {
      bestLen = len;
      best = row;
    }
  }
  return {
    placement: best,
    walkMeters: Number.isFinite(bestLen) ? Math.max(1, Math.round(bestLen)) : null,
  };
}
