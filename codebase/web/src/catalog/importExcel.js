import * as XLSX from "xlsx";
import { STORE_TYPES } from "../storeTypes.js";
import { inchesToMeters } from "../units.js";
import { normalizeStorageType } from "../storageType.js";

const HEADER = [
  "type",
  "storeType",
  "id",
  "name",
  "sku",
  "categoryId",
  "categoryName",
  "parentId",
  "color",
  "widthInches",
  "heightInches",
  "depthInches",
  "widthMeters",
  "heightMeters",
  "storageType",
  "storageTemp",
  "imageUrl",
];

function normKey(k) {
  return String(k || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function rowMap(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    out[normKey(k)] = v;
  }
  return out;
}

function cellStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

function slugId(name) {
  const base = cellStr(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return base ? `cat-${base}` : "";
}

/** Map store type id or label → vertical key. Falls back to the user-selected type. */
export function resolveVertical(storeType, vertical, defaultVertical) {
  const fallback = cellStr(defaultVertical).toLowerCase() || "retail";
  const v = cellStr(vertical).toLowerCase();
  if (v) return v;
  const raw = cellStr(storeType);
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  const byId = STORE_TYPES.find((s) => s.id === lower);
  if (byId) return byId.vertical;
  const byLabel = STORE_TYPES.find((s) => s.label.toLowerCase() === lower);
  if (byLabel) return byLabel.vertical;
  if (STORE_TYPES.some((s) => s.vertical === lower)) return lower;
  return lower || fallback;
}

function dimMeters(r, inchKey, meterKey) {
  const inchVal = r[inchKey];
  if (inchVal !== "" && inchVal != null && Number.isFinite(Number(inchVal))) {
    return inchesToMeters(Number(inchVal));
  }
  const meterVal = r[meterKey];
  if (meterVal !== "" && meterVal != null && Number.isFinite(Number(meterVal))) {
    return Number(meterVal);
  }
  return undefined;
}

function parseRow(raw, defaultVertical) {
  const r = rowMap(raw);
  const type = cellStr(r.type).toLowerCase();
  const storeType = cellStr(r.storetype);
  const vertical = resolveVertical(storeType, r.vertical, defaultVertical);
  return {
    type,
    storeType,
    vertical,
    id: cellStr(r.id),
    name: cellStr(r.name),
    sku: cellStr(r.sku),
    categoryId: cellStr(r.categoryid),
    categoryName: cellStr(r.categoryname),
    parentId: cellStr(r.parentid) || null,
    color: cellStr(r.color) || "#A30A2A",
    widthMeters: dimMeters(r, "widthinches", "widthmeters"),
    heightMeters: dimMeters(r, "heightinches", "heightmeters"),
    depthMeters: dimMeters(r, "depthinches", "depthmeters"),
    storageType: normalizeStorageType(cellStr(r.storagetype) || cellStr(r.temperaturezone) || "ambient"),
    storageTemp: normalizeStorageType(cellStr(r.storagetemp) || cellStr(r.storagetype) || "ambient"),
    imageUrl: cellStr(r.imageurl),
  };
}

/**
 * Normalize parsed rows: stable category ids, resolve product → category links,
 * auto-create categories referenced by products.
 */
export function normalizeImportPayload(rawCategories, rawProducts, defaultVertical) {
  const fallbackVertical = cellStr(defaultVertical).toLowerCase() || "retail";
  const categories = [];
  const categoryIdSet = new Set();
  const nameToId = new Map();

  for (const row of rawCategories) {
    const id = row.id || slugId(row.name) || undefined;
    const name = row.name || row.id;
    if (!name) continue;
    const cat = {
      id: id || slugId(name) || `cat-${categories.length + 1}`,
      name,
      vertical: row.vertical || fallbackVertical,
      parentId: row.parentId || null,
      color: row.color || "#A30A2A",
      storageType: normalizeStorageType(row.storageType || "ambient"),
    };
    categories.push(cat);
    categoryIdSet.add(cat.id);
    nameToId.set(name.toLowerCase(), cat.id);
    nameToId.set(cat.id.toLowerCase(), cat.id);
  }

  const products = [];
  for (const row of rawProducts) {
    let categoryId = row.categoryId;
    if (!categoryId && row.categoryName) {
      categoryId = nameToId.get(row.categoryName.toLowerCase()) || slugId(row.categoryName);
    }
    if (!categoryId) {
      throw new Error(`Product "${row.name || row.sku}" needs categoryId or categoryName`);
    }

    if (!categoryIdSet.has(categoryId)) {
      const catName = row.categoryName || categoryId;
      categories.push({
        id: categoryId,
        name: catName,
        vertical: row.vertical || fallbackVertical,
        parentId: null,
        color: "#A30A2A",
        storageType: "ambient",
      });
      categoryIdSet.add(categoryId);
      nameToId.set(catName.toLowerCase(), categoryId);
    }

    const attributes = { ...(row.attributes || {}) };
    if (row.widthMeters != null) attributes.widthMeters = row.widthMeters;
    if (row.heightMeters != null) attributes.heightMeters = row.heightMeters;
    if (row.depthMeters != null) attributes.depthMeters = row.depthMeters;
    if (row.storageTemp) attributes.storageTemp = normalizeStorageType(row.storageTemp);
    if (row.imageUrl) attributes.imageUrl = row.imageUrl;
    products.push({
      id: row.id || undefined,
      name: row.name || row.sku,
      sku: row.sku || "",
      categoryId,
      attributes,
      vertical: row.vertical || fallbackVertical,
    });
  }

  return { categories, products };
}

/**
 * Parse .xlsx / .xls / .csv into catalog import payload.
 * @param {ArrayBuffer} buffer
 * @param {{ defaultVertical?: string }} [options] target store type vertical when a row omits storeType
 */
export function parseCatalogImportWorkbook(buffer, options = {}) {
  const defaultVertical = options.defaultVertical;
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName =
    wb.SheetNames.find((n) => normKey(n) === "import") ||
    wb.SheetNames.find((n) => normKey(n) === "products") ||
    wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error("empty_workbook");

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const rawCategories = [];
  const rawProducts = [];

  for (const raw of rows) {
    const row = parseRow(raw, defaultVertical);
    if (!row.type && !row.name && !row.sku) continue;

    if (row.type === "category") {
      if (!row.name && !row.id) continue;
      rawCategories.push({
        id: row.id || undefined,
        name: row.name || row.id,
        vertical: row.vertical,
        parentId: row.parentId,
        color: row.color,
        storageType: row.storageType,
      });
    } else {
      if (!row.name && !row.sku) continue;
      const attributes = {};
      if (row.widthMeters != null && !Number.isNaN(row.widthMeters)) {
        attributes.widthMeters = row.widthMeters;
      }
      if (row.heightMeters != null && !Number.isNaN(row.heightMeters)) {
        attributes.heightMeters = row.heightMeters;
      }
      if (row.depthMeters != null && !Number.isNaN(row.depthMeters)) {
        attributes.depthMeters = row.depthMeters;
      }
      if (row.storageTemp) {
        attributes.storageTemp = row.storageTemp;
      }
      if (row.imageUrl || row.name) {
        const fileName = `${row.name || row.sku}.png`;
        attributes.imageUrl = `/product-images/${encodeURIComponent(fileName)}`;
      }
      rawProducts.push({
        id: row.id || undefined,
        name: row.name || row.sku,
        sku: row.sku,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        vertical: row.vertical,
        attributes,
      });
    }
  }

  if (!rawCategories.length && !rawProducts.length) {
    throw new Error("no_rows");
  }

  return normalizeImportPayload(rawCategories, rawProducts, defaultVertical);
}

/** Build and download Excel import template with store type column. */
export function downloadCatalogImportTemplate() {
  const storeTypeHint = STORE_TYPES.map((s) => s.id).join(", ");
  const rows = [
    {
      type: "category",
      storeType: "pharmacy",
      id: "cat-example",
      name: "Example Category",
      sku: "",
      categoryId: "",
      categoryName: "",
      parentId: "",
      color: "#A30A2A",
      widthInches: "",
      heightInches: "",
      depthInches: "",
      widthMeters: "",
      heightMeters: "",
      imageUrl: "",
    },
    {
      type: "product",
      storeType: "pharmacy",
      id: "",
      name: "Example Product A",
      sku: "SKU-001",
      categoryId: "cat-example",
      categoryName: "Example Category",
      parentId: "",
      color: "",
      widthInches: 8,
      heightInches: 10,
      depthInches: 6,
      widthMeters: "",
      heightMeters: "",
      imageUrl: "https://example.com/product-a.jpg",
    },
    {
      type: "product",
      storeType: "pharmacy",
      id: "",
      name: "Example Product B",
      sku: "SKU-002",
      categoryId: "cat-example",
      categoryName: "Example Category",
      parentId: "",
      color: "",
      widthInches: 6,
      heightInches: 8,
      depthInches: 6,
      widthMeters: "",
      heightMeters: "",
      imageUrl: "",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADER });
  const instructions = XLSX.utils.aoa_to_sheet([
    ["ShelfPilot product import"],
    [""],
    ["Sheet: Import — one row per category or product"],
    ["type", "category or product"],
    ["storeType", `Store type: ${storeTypeHint}`],
    ["id", "Category id (recommended). Products: optional product id"],
    ["name", "Category or product name"],
    ["sku", "Product SKU"],
    ["categoryId", "Product → category id (must match a category row id)"],
    ["categoryName", "Optional — link product by category name instead of id"],
    ["parentId", "Optional parent category id"],
    ["color", "Category hex color"],
    ["widthInches / heightInches / depthInches", "Product dimensions in inches (preferred)"],
    ["widthMeters / heightMeters", "Optional legacy dimensions in meters"],
    ["imageUrl", "Optional product image URL (shown in catalog, planogram & 3D)"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Import");
  XLSX.utils.book_append_sheet(wb, instructions, "Instructions");
  XLSX.writeFile(wb, "ShelfPilot-product-import-template.xlsx");
}
