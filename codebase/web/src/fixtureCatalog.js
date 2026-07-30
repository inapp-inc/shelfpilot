/** Store-level shelf layer — shared fixture templates from Admin config. */
import { FIXTURE_TYPES, VERTICALS } from "./referenceCatalog.js";
import { normalizeFixtureTemplate } from "./fixtureTypeUtils.js";

const FALLBACK_BY_VERTICAL = {
  retail: [
    { type: "ambient", label: "Ambient", baseKind: "gondola", temperatureZone: "ambient", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9, defaultLevels: 3 },
    { type: "chilled", label: "Chilled", baseKind: "gondola", temperatureZone: "chilled", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9, defaultLevels: 3 },
    { type: "shelf", label: "Shelf", baseKind: "shelf", temperatureZone: "ambient", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultLevels: 2 },
  ],
  hypermarket: [
    { type: "ambient", label: "Ambient", baseKind: "gondola", temperatureZone: "ambient", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9, defaultLevels: 3 },
    { type: "chilled", label: "Chilled", baseKind: "gondola", temperatureZone: "chilled", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9, defaultLevels: 3 },
    { type: "frozen", label: "Frozen", baseKind: "shelf", temperatureZone: "frozen", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultLevels: 2 },
  ],
  pharmacy: [
    { type: "shelf", label: "Shelf", baseKind: "shelf", temperatureZone: "ambient", defaultWidthMeters: 1.0, defaultDepthMeters: 0.5, defaultLevels: 2 },
    { type: "rack", label: "Rack", baseKind: "rack", temperatureZone: "ambient", defaultWidthMeters: 0.8, defaultDepthMeters: 0.4, defaultLevels: 4 },
  ],
  beauty: [{ type: "gondola", label: "Gondola", baseKind: "gondola", temperatureZone: "ambient", defaultWidthMeters: 1.5, defaultDepthMeters: 0.7, defaultLevels: 3 }],
  apparel: [
    { type: "rack", label: "Rack", baseKind: "rack", temperatureZone: "ambient", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultLevels: 4 },
    { type: "storage", label: "Storage", baseKind: "storage", temperatureZone: "ambient", defaultWidthMeters: 2.0, defaultDepthMeters: 1.0, defaultLevels: 2 },
  ],
  convenience: [{ type: "shelf", label: "Shelf", baseKind: "shelf", temperatureZone: "ambient", defaultWidthMeters: 1.0, defaultDepthMeters: 0.5, defaultLevels: 2 }],
};

/** Templates for a vertical — API config wins, else vertical defaults. */
export function fixtureTemplatesForVertical(config, vertical) {
  const v = String(vertical || "retail").toLowerCase();
  const fromConfig =
    config?.vertical === v && config?.fixtureTemplates?.length ? config.fixtureTemplates : null;
  const list = fromConfig?.length ? fromConfig : FALLBACK_BY_VERTICAL[v] || FALLBACK_BY_VERTICAL.retail;
  return list.map(normalizeFixtureTemplate);
}

/** Palette + manual placement entries from store config. */
export function fixturePaletteEntries(config, vertical) {
  const v = vertical || config?.vertical || "retail";
  return fixtureTemplatesForVertical(config, v);
}

export function fixtureForType(config, type, vertical) {
  const entries = fixturePaletteEntries(config, vertical);
  return (
    entries.find((e) => e.type === type) ||
    normalizeFixtureTemplate({ type, ...(FIXTURE_TYPES[type] ? { defaultWidthMeters: FIXTURE_TYPES[type].w, defaultDepthMeters: FIXTURE_TYPES[type].d } : {}) })
  );
}

export function verticalLabel(vertical) {
  return VERTICALS[vertical]?.label || vertical;
}
