/** Store-level shelf layer — shared fixture templates from Admin config. */
import { FIXTURE_TYPES, VERTICALS } from "./referenceCatalog.js";

const FALLBACK_BY_VERTICAL = {
  retail: [
    { type: "shelf", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultLevels: 2 },
    { type: "gondola", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9, defaultLevels: 3 },
  ],
  hypermarket: [
    { type: "gondola", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9, defaultLevels: 3 },
    { type: "shelf", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultLevels: 2 },
  ],
  pharmacy: [
    { type: "shelf", defaultWidthMeters: 1.0, defaultDepthMeters: 0.5, defaultLevels: 2 },
    { type: "rack", defaultWidthMeters: 0.8, defaultDepthMeters: 0.4, defaultLevels: 4 },
  ],
  beauty: [{ type: "gondola", defaultWidthMeters: 1.5, defaultDepthMeters: 0.7, defaultLevels: 3 }],
  apparel: [
    { type: "rack", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultLevels: 4 },
    { type: "storage", defaultWidthMeters: 2.0, defaultDepthMeters: 1.0, defaultLevels: 2 },
  ],
  convenience: [{ type: "shelf", defaultWidthMeters: 1.0, defaultDepthMeters: 0.5, defaultLevels: 2 }],
};

function normalizeTemplate(tmpl) {
  const type = tmpl?.type || "shelf";
  const fallback = FIXTURE_TYPES[type] || FIXTURE_TYPES.shelf;
  return {
    type,
    label: fallback.label,
    defaultWidthMeters: Number(tmpl?.defaultWidthMeters ?? fallback.w) || fallback.w,
    defaultDepthMeters: Number(tmpl?.defaultDepthMeters ?? fallback.d) || fallback.d,
    defaultHeightMeters: Number(tmpl?.defaultHeightMeters ?? 2) || 2,
    defaultLevels: Math.max(1, Number(tmpl?.defaultLevels) || 2),
  };
}

/** Templates for a vertical — API config wins, else vertical defaults. */
export function fixtureTemplatesForVertical(config, vertical) {
  const fromConfig = config?.vertical === vertical ? config?.fixtureTemplates : null;
  const list = fromConfig?.length ? fromConfig : FALLBACK_BY_VERTICAL[vertical] || FALLBACK_BY_VERTICAL.retail;
  return list.map(normalizeTemplate);
}

/** Palette + manual placement entries from store config. */
export function fixturePaletteEntries(config) {
  const vertical = config?.vertical || "retail";
  return fixtureTemplatesForVertical(config, vertical);
}

export function fixtureForType(config, type) {
  const entries = fixturePaletteEntries(config);
  return (
    entries.find((e) => e.type === type) ||
    normalizeTemplate({ type, ...(FIXTURE_TYPES[type] ? { defaultWidthMeters: FIXTURE_TYPES[type].w, defaultDepthMeters: FIXTURE_TYPES[type].d } : {}) })
  );
}

export function verticalLabel(vertical) {
  return VERTICALS[vertical]?.label || vertical;
}
