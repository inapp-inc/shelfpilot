/**
 * Demo catalog + generated layout bootstrap — idempotent, safe on every API start.
 * Ensures: categories → products with imageUrl → Smart Generate layout → 3D products.
 */
import fs from "node:fs";
import path from "node:path";
import { repo, now } from "../store/sqlite.js";
import { packAislesAndShelves } from "./layoutPacker.js";
import { assignCategoryMix } from "./categoryMixPacker.js";
import { applyFixtureTypesToShelves } from "./categoryFixtureDefaults.js";
import { fillPlanogramsForLayout, loadProductsForLayoutVertical } from "./planogramAutoFill.js";
import { finalizeAisleShelfBinding } from "./aisleBinding.js";
import { finalizeAisleLabeling } from "./aisleLabeling.js";
import { computeAutoCalc, validateAisles } from "./layoutMath.js";
import { listCategoriesForLayout } from "./categoryTree.js";
import { entityInsideLayout } from "./polygonContainment.js";
import {
  ensureProductImagesDir,
  isAllowedImageFile,
  mapImagesToProducts,
  publicImageUrl,
} from "./productImages.js";

export const DEMO_LAYOUT_NAME = "Demo Hypermarket — Generated";
export const DEMO_LAYOUT_ID = "lay-demo-generated";

const DEMO_CATEGORIES = {
  hypermarket: [
    { id: "hm-fresh", name: "Fresh Produce", color: "#22c55e" },
    { id: "hm-grocery", name: "Grocery", color: "#16a34a" },
    { id: "hm-chilled", name: "Chilled", color: "#0ea5e9" },
    { id: "hm-frozen", name: "Frozen", color: "#38bdf8" },
    { id: "hm-seasonal", name: "Seasonal", color: "#ea580c" },
  ],
  pharmacy: [
    { id: "otc", name: "OTC Medicines", color: "#0ea5e9" },
    { id: "painrelief", name: "Pain Relief", parentId: "otc", color: "#38bdf8" },
    { id: "rx", name: "Prescription", color: "#a855f7" },
    { id: "vitamins", name: "Vitamins", color: "#ca8a04" },
  ],
};

/** Fallback SKUs when the image folder is empty — names match Docs/products/images. */
const FALLBACK_PRODUCTS = [
  { id: "hm-roma", name: "Roma Tomato", categoryId: "hm-fresh", w: 0.1, h: 0.1, d: 0.1, kg: 0.4 },
  { id: "hm-banana", name: "Banana Bunch", categoryId: "hm-fresh", w: 0.18, h: 0.12, d: 0.1, kg: 0.8 },
  { id: "hm-apple", name: "Red Apple", categoryId: "hm-fresh", w: 0.09, h: 0.09, d: 0.09, kg: 0.25 },
  { id: "hm-lettuce", name: "Lettuce", categoryId: "hm-fresh", w: 0.16, h: 0.12, d: 0.14, kg: 0.35 },
  { id: "hm-rice", name: "Basmati Rice", categoryId: "hm-grocery", w: 0.12, h: 0.22, d: 0.06, kg: 1.0 },
  { id: "hm-atta", name: "Wheat Flour (Atta)", categoryId: "hm-grocery", w: 0.14, h: 0.24, d: 0.08, kg: 1.0 },
  { id: "hm-dal", name: "Toor Dal", categoryId: "hm-grocery", w: 0.1, h: 0.18, d: 0.06, kg: 0.5 },
  { id: "hm-oil", name: "Mustard Oil", categoryId: "hm-grocery", w: 0.08, h: 0.26, d: 0.08, kg: 0.9 },
  { id: "hm-cola", name: "Cola", categoryId: "hm-chilled", w: 0.07, h: 0.22, d: 0.07, kg: 0.5 },
  { id: "hm-juice", name: "Apple Juice", categoryId: "hm-chilled", w: 0.08, h: 0.24, d: 0.08, kg: 1.0 },
  { id: "hm-water", name: "Bottled Water", categoryId: "hm-chilled", w: 0.07, h: 0.28, d: 0.07, kg: 1.0 },
  { id: "hm-peas", name: "Frozen Green Peas", categoryId: "hm-frozen", w: 0.16, h: 0.22, d: 0.06, kg: 0.9 },
  { id: "hm-fries", name: "Frozen French Fries", categoryId: "hm-frozen", w: 0.18, h: 0.24, d: 0.08, kg: 1.0 },
  { id: "hm-corn", name: "Frozen Corn", categoryId: "hm-frozen", w: 0.16, h: 0.22, d: 0.06, kg: 0.9 },
];

const DEMO_CATEGORY_MIX = [
  { categoryId: "hm-grocery", percent: 35 },
  { categoryId: "hm-fresh", percent: 25 },
  { categoryId: "hm-chilled", percent: 25 },
  { categoryId: "hm-frozen", percent: 15 },
];

function slugId(name) {
  return `hm-${String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)}`;
}

function guessHypermarketCategory(name) {
  const n = String(name || "").toLowerCase();
  if (/frozen|nugget|paratha|ice.?cream/.test(n)) return "hm-frozen";
  if (/cola|soda|juice|water|milk|drink|tea|coffee/.test(n)) return "hm-chilled";
  if (
    /tomato|apple|banana|lettuce|carrot|onion|pepper|grape|mango|orange|potato|broccoli|cucumber|lemon|kiwi|pear|cherry|strawberry|watermelon|pineapple|mushroom|corn|garlic/.test(
      n
    )
  ) {
    return "hm-fresh";
  }
  return "hm-grocery";
}

function refreshLayout(layout) {
  const config = repo.getConfig(layout.vertical);
  layout.validation = { aisleViolations: validateAisles(layout, config) };
  layout.autoCalc = computeAutoCalc(layout, config);
  layout.updatedAt = now();
  return layout;
}

/** Ensure vertical categories exist. */
export function ensureDemoCategories() {
  let count = 0;
  for (const [vertical, cats] of Object.entries(DEMO_CATEGORIES)) {
    for (const c of cats) {
      repo.upsertCategory({
        id: c.id,
        name: c.name,
        vertical,
        parentId: c.parentId || null,
        color: c.color,
      });
      count += 1;
    }
  }
  return count;
}

/**
 * Create / update catalog products from files in the product-images folder.
 * Filename (without extension) becomes the product name — matches Docs pack.
 */
export function seedProductsFromImageFiles() {
  const dir = ensureProductImagesDir();
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((name) => isAllowedImageFile(name));
  } catch {
    files = [];
  }

  let created = 0;
  if (files.length) {
    for (const file of files) {
      const name = path.basename(file, path.extname(file));
      if (!name) continue;
      const categoryId = guessHypermarketCategory(name);
      const id = slugId(name);
      repo.upsertProduct({
        id,
        name,
        sku: `IMG-${id.toUpperCase().slice(0, 24)}`,
        categoryId,
        attributes: {
          imageUrl: publicImageUrl(file),
          widthMeters: 0.1,
          heightMeters: 0.2,
          depthMeters: 0.08,
          weightKg: 0.35,
        },
      });
      created += 1;
    }
  } else {
    for (const p of FALLBACK_PRODUCTS) {
      const fileName = `${p.name}.png`;
      repo.upsertProduct({
        id: p.id,
        name: p.name,
        sku: p.id.toUpperCase(),
        categoryId: p.categoryId,
        attributes: {
          imageUrl: publicImageUrl(fileName),
          widthMeters: p.w,
          heightMeters: p.h,
          depthMeters: p.d,
          weightKg: p.kg,
        },
      });
      created += 1;
    }
  }

  // Pharmacy fallbacks (may not have matching images — still fill planograms).
  repo.upsertProduct({
    id: "ph-p1",
    name: "Ibuprofen 200mg",
    sku: "PH-2001",
    categoryId: "painrelief",
    attributes: { widthMeters: 0.06, heightMeters: 0.12, depthMeters: 0.04, weightKg: 0.08 },
  });
  repo.upsertProduct({
    id: "ph-p3",
    name: "Multivitamin Tablets",
    sku: "PH-2003",
    categoryId: "vitamins",
    attributes: {
      imageUrl: publicImageUrl("Multivitamin Tablets.png"),
      widthMeters: 0.08,
      heightMeters: 0.14,
      depthMeters: 0.06,
      weightKg: 0.2,
    },
  });

  return { created, imageFiles: files.length };
}

/** Remap any product whose name matches an image file. */
export function ensureProductImageUrls() {
  const products = repo.listProducts();
  return mapImagesToProducts(products, (p) => repo.upsertProduct(p));
}

export function ensureDemoCatalog() {
  const categories = ensureDemoCategories();
  const fromImages = seedProductsFromImageFiles();
  const mapped = ensureProductImageUrls();
  return { categories, ...fromImages, mapped };
}

/** Build or refresh the fully generated hypermarket demo layout. */
export function ensureDemoGeneratedLayout({ force = false } = {}) {
  const existing = repo.listLayouts().find((l) => l.id === DEMO_LAYOUT_ID || l.name === DEMO_LAYOUT_NAME);
  if (existing && !force) {
    const hasPlanogram = (existing.shelves || []).some(
      (s) => s.planogram?.length || s.faces?.some((f) => f.planogram?.length)
    );
    if (hasPlanogram && (existing.shelves || []).length > 0) {
      return { layoutId: existing.id, created: false, planogramPlacements: 0, skipped: true };
    }
  }

  const vertical = "hypermarket";
  const config = repo.getConfig(vertical);
  const categories = listCategoriesForLayout(vertical, (v) => repo.listCategories(v));

  let layout = {
    id: DEMO_LAYOUT_ID,
    name: DEMO_LAYOUT_NAME,
    vertical,
    status: "draft",
    widthMeters: 24,
    depthMeters: 16,
    heightMeters: 3.2,
    shape: "polygon",
    polygon: [
      { x: 0, y: 0 },
      { x: 24, y: 0 },
      { x: 24, y: 16 },
      { x: 0, y: 16 },
    ],
    storeEnvelope: { x: 0, y: 0, widthMeters: 24, depthMeters: 16 },
    aisles: [],
    shelves: [],
    fixtures: [],
    mappings: [],
    shelfMappings: [],
    zones: [],
    entryPoints: [{ id: "entry-main", x: 12, y: 0, label: "Main entrance" }],
    obstacles: [],
    floorPlan: null,
  };

  const tmpl = config.fixtureTemplates?.find((t) => t.type === "gondola") || {};
  const minAisle = Math.max(0.9, Number(config.minAisleWidthMeters) || 1.2);
  const packed = packAislesAndShelves(layout, {
    orientation: "horizontal",
    minAisleWidthMeters: minAisle,
    compactMode: true,
    shelfTemplate: {
      type: "gondola",
      usableWidthMeters: tmpl.defaultWidthMeters ?? 1.2,
      depthMeters: tmpl.defaultDepthMeters ?? 0.6,
      heightMeters: tmpl.defaultHeightMeters ?? 2,
      defaultLevels: tmpl.defaultLevels ?? 3,
    },
  });

  layout.aisles = packed.aisles;
  for (const aisle of layout.aisles || []) {
    if (Number(aisle.widthMeters) < minAisle) aisle.widthMeters = minAisle;
  }
  const assigned = assignCategoryMix(packed.shelves, DEMO_CATEGORY_MIX, categories);
  layout.shelves = applyFixtureTypesToShelves(assigned.shelves, DEMO_CATEGORY_MIX, categories, config);
  layout.shelfMappings = assigned.shelfMappings;

  layout.aisles = (layout.aisles || []).filter((a) => entityInsideLayout(a, "aisle", layout));
  layout.shelves = (layout.shelves || []).filter((s) => entityInsideLayout(s, "shelf", layout));

  let bound = finalizeAisleShelfBinding(layout.shelves, layout.aisles, layout);
  layout.shelves = bound.shelves;
  layout.aisles = bound.aisles;
  ({ shelves: layout.shelves, aisles: layout.aisles } = finalizeAisleLabeling(
    layout.shelves,
    layout.aisles,
    layout
  ));

  const { categories: fillCats, products: fillProducts } = loadProductsForLayoutVertical(
    vertical,
    (v) => repo.listCategories(v),
    () => repo.listProducts()
  );
  const placements = fillPlanogramsForLayout(layout, fillProducts, fillCats);

  bound = finalizeAisleShelfBinding(layout.shelves, layout.aisles, layout);
  layout.shelves = bound.shelves;
  layout.aisles = bound.aisles;
  ({ shelves: layout.shelves, aisles: layout.aisles } = finalizeAisleLabeling(
    layout.shelves,
    layout.aisles,
    layout
  ));

  if (existing) layout.id = existing.id;
  layout.arrangementAcceptedAt = new Date().toISOString();
  layout.arrangementAcceptedBy = "system@shelfpilot.local";
  refreshLayout(layout);
  repo.saveLayout(layout);

  return {
    layoutId: layout.id,
    created: !existing,
    planogramPlacements: placements,
    gondolaUnits: packed.gondolaUnits ?? Math.ceil(packed.shelves.length / 2),
    walkAisles: layout.aisles.length,
    skipped: false,
  };
}

/**
 * Called once when the API starts (not in tests).
 * Guarantees catalog products with images and one Smart-Generated demo layout.
 */
export function ensureDemoReady() {
  const catalog = ensureDemoCatalog();
  // Force regenerate if prior layout was built with products that had no images,
  // or if the same SKU was duplicated across many shelves (old autofill).
  const existing = repo.listLayouts().find((l) => l.id === DEMO_LAYOUT_ID || l.name === DEMO_LAYOUT_NAME);
  let force = false;
  if (existing) {
    const firstPog = (existing.shelves || [])
      .flatMap((s) => s.faces?.flatMap((f) => f.planogram || []) || s.planogram || [])
      .find(Boolean);
    if (firstPog?.productId) {
      const prod = repo.listProducts().find((p) => p.id === firstPog.productId);
      const hasImg = Boolean(prod?.imageUrl || prod?.attributes?.imageUrl);
      if (!hasImg && catalog.imageFiles > 0) force = true;
    }
    const placedIds = [];
    for (const s of existing.shelves || []) {
      const rows = [
        ...(s.planogram || []),
        ...((s.faces || []).flatMap((f) => f.planogram || [])),
      ];
      for (const p of rows) {
        if (p?.productId) placedIds.push(p.productId);
      }
    }
    if (placedIds.length > 0 && new Set(placedIds).size < placedIds.length) {
      force = true;
    }
    // Force regenerate if any walk aisle is narrower than the store-type minimum
    // (old bootstrap hardcoded 1.2m while hypermarket validates at 1.5m).
    const configMin = Math.max(0.9, Number(repo.getConfig("hypermarket")?.minAisleWidthMeters) || 1.5);
    const narrow = (existing.aisles || []).some((a) => Number(a.widthMeters) < configMin - 1e-9);
    if (narrow) force = true;
    if (!(existing.polygon?.length >= 3)) force = true;
  }
  const layout = ensureDemoGeneratedLayout({ force });
  const result = { catalog, layout, forceLayoutRefresh: force };
  console.log(JSON.stringify({ level: "info", message: "demo_bootstrap", ...result }));
  return result;
}
