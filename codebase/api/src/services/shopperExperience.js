import { normalizeLayout } from "./layoutNormalize.js";
import { repo } from "../store/sqlite.js";
import { listCategoriesForLayout } from "./categoryTree.js";

const DEFAULT = {
  enabled: false,
  layoutId: null,
  displayName: "",
  entryPointId: null,
};

export function getShopperExperience() {
  return repo.getShopperExperience?.() || { ...DEFAULT };
}

export function putShopperExperience(patch) {
  const prev = getShopperExperience();
  const next = {
    enabled: patch.enabled != null ? Boolean(patch.enabled) : prev.enabled,
    layoutId: patch.layoutId !== undefined ? patch.layoutId || null : prev.layoutId,
    displayName: patch.displayName !== undefined ? String(patch.displayName || "") : prev.displayName,
    entryPointId: patch.entryPointId !== undefined ? patch.entryPointId || null : prev.entryPointId,
  };
  repo.putShopperExperience(next);
  return next;
}

export function resolveShopperLayout(requestedLayoutId = null) {
  const exp = getShopperExperience();
  const layoutId = requestedLayoutId || exp.layoutId;
  if (!exp.enabled || !layoutId) return { exp, layout: null, entry: null };
  if (requestedLayoutId && exp.layoutId && requestedLayoutId !== exp.layoutId) {
    return { exp: { ...exp, enabled: false }, layout: null, entry: null };
  }
  const raw = repo.getLayout(layoutId);
  if (!raw) return { exp, layout: null, entry: null };
  const layout = normalizeLayout(raw);
  const entry =
    (layout.entryPoints || []).find((e) => e.id === exp.entryPointId) ||
    layout.entryPoints?.[0] ||
    null;
  return { exp, layout, entry };
}

/** Public layout payload — geometry + labels only. */
export function publicLayoutPayload(layout) {
  if (!layout) return null;
  return {
    id: layout.id,
    name: layout.name,
    vertical: layout.vertical,
    widthMeters: layout.widthMeters,
    depthMeters: layout.depthMeters,
    heightMeters: layout.heightMeters,
    shape: layout.shape,
    polygon: layout.polygon || [],
    storeEnvelope: layout.storeEnvelope || null,
    aisles: (layout.aisles || []).map((a) => ({
      id: a.id,
      x: a.x,
      y: a.y,
      widthMeters: a.widthMeters,
      lengthMeters: a.lengthMeters,
      orientation: a.orientation,
      aisleNumber: a.aisleNumber,
      name: a.name,
    })),
    shelves: (layout.shelves || [])
      .filter((s) => !s.pairDisplay)
      .map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        widthMeters: s.widthMeters,
        usableWidthMeters: s.usableWidthMeters,
        depthMeters: s.depthMeters,
        rotationDeg: s.rotationDeg,
        aisleId: s.aisleId,
        shelfIndexAlongAisle: s.shelfIndexAlongAisle,
        displayNumber: s.displayNumber ?? null,
        pairId: s.pairId || null,
        pairRole: s.pairRole || null,
        label: s.label,
        levels: s.levels,
        segments: s.segments,
        planogram: s.planogram,
        faces: (s.faces || []).map((f) => ({
          id: f.id,
          planogram: f.planogram || [],
          segments: f.segments || [],
          categoryId: f.categoryId || null,
        })),
      })),
    entryPoints: (layout.entryPoints || []).map((e) => ({
      id: e.id,
      x: e.x,
      y: e.y,
      label: e.label,
    })),
  };
}

export function publicProductsForLayout(layout) {
  if (!layout) return [];
  const categories = listCategoriesForLayout(layout.vertical, (v) => repo.listCategories(v));
  const catIds = new Set(categories.map((c) => c.id));
  const products = repo.listProducts();
  return products
    .filter((p) => catIds.has(p.categoryId))
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      categoryId: p.categoryId,
      attributes: p.attributes || {},
      imageUrl: p.imageUrl || p.attributes?.imageUrl || null,
    }));
}
