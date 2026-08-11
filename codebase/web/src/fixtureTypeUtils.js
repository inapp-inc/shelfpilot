/** Shelf type presets, slug helpers, and template normalization. */
import { FIXTURE_TYPES } from "./referenceCatalog.js";

export const FIXTURE_BASE_KINDS = ["shelf", "gondola", "rack", "storage"];

export const TEMPERATURE_ZONES = [
  { id: "ambient", label: "Ambient", emoji: "🛒" },
  { id: "chilled", label: "Chilled", emoji: "🧊" },
  { id: "frozen", label: "Frozen", emoji: "❄️" },
];

/** Quick-add presets for Store Master (Ambient / Chilled / Frozen + standard fixtures). */
export const SHELF_TYPE_PRESETS = [
  {
    label: "Ambient",
    type: "ambient",
    baseKind: "gondola",
    temperatureZone: "ambient",
    defaultWidthMeters: 1.8,
    defaultDepthMeters: 0.9,
    defaultHeightMeters: 2,
    defaultLevels: 3,
  },
  {
    label: "Chilled",
    type: "chilled",
    baseKind: "gondola",
    temperatureZone: "chilled",
    defaultWidthMeters: 1.8,
    defaultDepthMeters: 0.9,
    defaultHeightMeters: 2,
    defaultLevels: 3,
  },
  {
    label: "Frozen",
    type: "frozen",
    baseKind: "shelf",
    temperatureZone: "frozen",
    defaultWidthMeters: 1.2,
    defaultDepthMeters: 0.6,
    defaultHeightMeters: 2,
    defaultLevels: 2,
  },
  ...FIXTURE_BASE_KINDS.map((baseKind) => ({
    label: FIXTURE_TYPES[baseKind].label,
    type: baseKind,
    baseKind,
    temperatureZone: "ambient",
    defaultWidthMeters: FIXTURE_TYPES[baseKind].w,
    defaultDepthMeters: FIXTURE_TYPES[baseKind].d,
    defaultHeightMeters: 2,
    defaultLevels: baseKind === "rack" ? 4 : baseKind === "gondola" ? 3 : 2,
  })),
];

export function slugifyFixtureType(label) {
  return (
    String(label || "shelf")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "shelf"
  );
}

export function uniqueFixtureTypeId(label, existingTypes) {
  const used = new Set(existingTypes || []);
  let base = slugifyFixtureType(label);
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export function inferTemperatureZone(type, label) {
  const hay = `${type || ""} ${label || ""}`.toLowerCase();
  if (/frozen|❄/.test(hay)) return "frozen";
  if (/chill|🧊|dairy|cold/.test(hay)) return "chilled";
  return "ambient";
}

export function resolveBaseKind(tmpl) {
  if (tmpl?.baseKind && FIXTURE_TYPES[tmpl.baseKind]) return tmpl.baseKind;
  if (tmpl?.type && FIXTURE_TYPES[tmpl.type]) return tmpl.type;
  return "shelf";
}

export function normalizeFixtureTemplate(tmpl) {
  const baseKind = resolveBaseKind(tmpl);
  const fallback = FIXTURE_TYPES[baseKind] || FIXTURE_TYPES.shelf;
  const type = tmpl?.type || slugifyFixtureType(tmpl?.label) || baseKind;
  const label = tmpl?.label || FIXTURE_TYPES[type]?.label || type;
  const temperatureZone = tmpl?.temperatureZone || inferTemperatureZone(type, label);
  return {
    type,
    label,
    baseKind,
    temperatureZone,
    temporaryStorage: tmpl?.temporaryStorage === true,
    defaultWidthMeters: Number(tmpl?.defaultWidthMeters ?? fallback.w) || fallback.w,
    defaultDepthMeters: Number(tmpl?.defaultDepthMeters ?? fallback.d) || fallback.d,
    defaultHeightMeters: Number(tmpl?.defaultHeightMeters ?? 2) || 2,
    defaultLevels: Math.max(1, Number(tmpl?.defaultLevels) || (baseKind === "rack" ? 4 : baseKind === "gondola" ? 3 : 2)),
  };
}

export function fixtureLabelForType(type, templates) {
  const row = (templates || []).find((t) => t.type === type);
  if (row?.label) return row.label;
  return FIXTURE_TYPES[type]?.label || type;
}
