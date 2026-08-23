/**
 * Special zones (hot / offer / custom) and store entry points.
 * Zones are merchandising overlays; they do not participate in fixture packing.
 */
import { randomUUID } from "node:crypto";

export const ZONE_TYPES = ["hot", "offer", "special"];

export const ZONE_DEFAULT_COLOR = {
  hot: "#ef4444",
  offer: "#f59e0b",
  special: "#8b5cf6",
};

export const ZONE_LABEL = {
  hot: "Hot zone",
  offer: "Offer zone",
  special: "Special zone",
};

export function normalizeZoneType(type) {
  const t = String(type || "special").toLowerCase();
  return ZONE_TYPES.includes(t) ? t : "special";
}

export function normalizeZone(zone = {}) {
  const type = normalizeZoneType(zone.type);
  return {
    id: zone.id || `zone-${randomUUID().slice(0, 6)}`,
    type,
    name: zone.name != null && String(zone.name).trim() !== "" ? String(zone.name) : ZONE_LABEL[type],
    color: zone.color || ZONE_DEFAULT_COLOR[type],
    x: Number(zone.x) || 0,
    y: Number(zone.y) || 0,
    widthMeters: Math.max(0.1, Number(zone.widthMeters) || 2),
    depthMeters: Math.max(0.1, Number(zone.depthMeters) || 2),
  };
}

export function normalizeEntryPoint(entry = {}) {
  const nameRaw = entry.name ?? entry.label;
  return {
    id: entry.id || `entry-${randomUUID().slice(0, 6)}`,
    name: nameRaw != null && String(nameRaw).trim() !== "" ? String(nameRaw).trim() : "Entrance",
    x: Number(entry.x) || 0,
    y: Number(entry.y) || 0,
    widthMeters: Math.max(0.3, Number(entry.widthMeters) || 1.8),
  };
}

/** Keep at most one entrance — first array element wins (creation order / primary). */
export function canonicalizeEntryPoints(layout) {
  const entries = layout?.entryPoints || [];
  if (entries.length <= 1) return 0;
  layout.entryPoints = [entries[0]];
  return entries.length - 1;
}
