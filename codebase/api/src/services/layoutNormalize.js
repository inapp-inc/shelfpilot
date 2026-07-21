/**
 * Normalize layout payload: synthesize shelves from fixtures, split mappings.
 */
import { levelsForType } from "./layoutPacker.js";
import {
  isDoubleSidedType,
  nextDisplayNumber,
  normalizeShelf,
  syncLegacyFromFaces,
} from "./shelfFaces.js";
import { normalizeEntryPoint, normalizeZone } from "./zones.js";

export function fixtureToShelf(f) {
  const usable = Number(f.usableWidthMeters ?? f.widthMeters) || 1.2;
  const type = f.type || "shelf";
  const height = Number(f.heightMeters) || 2;
  const shelf = {
    id: f.id,
    type,
    label: f.label || "Shelf",
    usableWidthMeters: usable,
    widthMeters: Number(f.widthMeters) || usable,
    depthMeters: Number(f.depthMeters) || 0.6,
    heightMeters: height,
    x: Number(f.x) || 0,
    y: Number(f.y) || 0,
    rotationDeg: Number(f.rotationDeg) || 0,
    aisleId: f.aisleId || null,
    categoryId: f.categoryId,
    color: f.color,
    temperatureZone: f.temperatureZone || "ambient",
    displayNumber: f.displayNumber ?? null,
    doubleSided: f.doubleSided ?? isDoubleSidedType(type),
    faces: f.faces,
    levels: Array.isArray(f.levels) && f.levels.length ? f.levels : levelsForType(type, height, f.defaultLevels),
    planogram: Array.isArray(f.planogram) ? f.planogram : [],
  };
  return normalizeShelf(shelf);
}

export function shelfToFixture(s) {
  syncLegacyFromFaces(s);
  return {
    id: s.id,
    type: s.type || "shelf",
    label: s.label || "Shelf",
    widthMeters: Number(s.widthMeters ?? s.usableWidthMeters) || 1.2,
    depthMeters: Number(s.depthMeters) || 0.6,
    heightMeters: Number(s.heightMeters) || 2,
    x: Number(s.x) || 0,
    y: Number(s.y) || 0,
    rotationDeg: Number(s.rotationDeg) || 0,
    categoryId: s.categoryId,
    color: s.color,
  };
}

export function normalizeLayout(layout) {
  if (!layout) return layout;
  const fixtures = layout.fixtures || [];
  let shelves = layout.shelves || [];
  if (!shelves.length && fixtures.length) {
    shelves = fixtures.map(fixtureToShelf);
  }
  shelves = shelves.map((s) => normalizeShelf({ ...s }));
  // Keep fixtures in sync for legacy clients
  const syncedFixtures = shelves.length ? shelves.map(shelfToFixture) : fixtures;

  const aisleMappings = layout.aisleMappings || [];
  let shelfMappings = layout.shelfMappings || [];
  const legacy = layout.mappings || [];
  if (!shelfMappings.length && legacy.length) {
    shelfMappings = legacy
      .filter((m) => m.fixtureId || m.shelfId)
      .map((m) => ({
        shelfId: m.shelfId || m.fixtureId,
        fixtureId: m.fixtureId || m.shelfId,
        categoryId: m.categoryId,
        color: m.color,
      }));
  }

  layout.shelves = shelves;
  layout.fixtures = syncedFixtures;
  layout.aisleMappings = aisleMappings;
  layout.shelfMappings = shelfMappings;
  layout.mappings = shelfMappings.map((m) => ({
    fixtureId: m.fixtureId || m.shelfId,
    shelfId: m.shelfId,
    categoryId: m.categoryId,
    color: m.color,
  }));
  layout.aisles = (layout.aisles || []).map((a) => ({
    ...a,
    x: a.x != null ? Number(a.x) : 0,
    y: a.y != null ? Number(a.y) : 0,
    orientation: a.orientation === "vertical" ? "vertical" : "horizontal",
  }));
  layout.zones = (layout.zones || []).map(normalizeZone);
  layout.entryPoints = (layout.entryPoints || []).map(normalizeEntryPoint);
  return layout;
}

export { nextDisplayNumber };
