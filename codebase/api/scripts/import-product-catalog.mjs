/**
 * Replace catalog categories/products from Docs/products/ShelfPilot-product-import.xlsx.
 * Copies images into data/product-images/ and maps imageUrl to /product-images/<name>.png.
 *
 * Usage (from codebase/api):
 *   node scripts/import-product-catalog.mjs
 *   node scripts/import-product-catalog.mjs --xlsx ../../Docs/products/ShelfPilot-product-import.xlsx
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { repo } from "../src/store/sqlite.js";
import XLSX from "xlsx";
import {
  copyImagesFromSource,
  mapImagesToProducts,
  publicImageUrl,
  resolveProductImagesDir,
} from "../src/services/productImages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STORE_VERTICAL = {
  supermarket: "retail",
  pharmacy: "pharmacy",
  hypermarket: "hypermarket",
  convenience: "convenience",
  apparel: "apparel",
  beauty: "beauty",
};

function cellStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

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

function resolveVertical(storeType) {
  const key = cellStr(storeType).toLowerCase();
  return STORE_VERTICAL[key] || key || "retail";
}

function localImageUrl(productName) {
  return publicImageUrl(`${productName}.png`);
}

function parseWorkbook(xlsxPath) {
  const wb = XLSX.readFile(xlsxPath);
  const sheetName =
    wb.SheetNames.find((n) => normKey(n) === "import") || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error(`No sheet found in ${xlsxPath}`);

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const categories = [];
  const products = [];

  for (const raw of rows) {
    const r = rowMap(raw);
    const type = cellStr(r.type).toLowerCase();
    const vertical = resolveVertical(r.storetype);
    if (!type && !cellStr(r.name) && !cellStr(r.sku)) continue;

    if (type === "category") {
      const name = cellStr(r.name) || cellStr(r.id);
      if (!name) continue;
      categories.push({
        id: cellStr(r.id) || undefined,
        name,
        vertical,
        parentId: cellStr(r.parentid) || null,
        color: cellStr(r.color) || "#A30A2A",
      });
      continue;
    }

    const name = cellStr(r.name) || cellStr(r.sku);
    if (!name) continue;
    const attributes = {};
    if (r.widthmeters !== "" && r.widthmeters != null && !Number.isNaN(Number(r.widthmeters))) {
      attributes.widthMeters = Number(r.widthmeters);
    }
    if (r.heightmeters !== "" && r.heightmeters != null && !Number.isNaN(Number(r.heightmeters))) {
      attributes.heightMeters = Number(r.heightmeters);
    }
    const storageTemp = cellStr(r.storagetemp);
    if (storageTemp) attributes.storageTemp = storageTemp;
    attributes.imageUrl = localImageUrl(name);

    products.push({
      id: cellStr(r.id) || undefined,
      name,
      sku: cellStr(r.sku),
      categoryId: cellStr(r.categoryid),
      categoryName: cellStr(r.categoryname),
      vertical,
      attributes,
    });
  }

  return { categories, products };
}

function slugId(name) {
  const base = cellStr(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return base ? `cat-${base}` : "";
}

function productId(row) {
  if (row.id) return row.id;
  if (row.sku) {
    const slug = row.sku
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (slug) return `prd-${slug}`;
  }
  return `prd-${randomUUID().slice(0, 8)}`;
}

function normalizePayload(rawCategories, rawProducts, defaultVertical = "retail") {
  const categories = [];
  const categoryIdSet = new Set();
  const nameToId = new Map();

  for (const row of rawCategories) {
    const id = row.id || slugId(row.name);
    const name = row.name || row.id;
    if (!name) continue;
    const cat = {
      id: id || slugId(name) || `cat-${categories.length + 1}`,
      name,
      vertical: row.vertical || defaultVertical,
      parentId: row.parentId || null,
      color: row.color || "#A30A2A",
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
      throw new Error(`Product "${row.name}" needs categoryId or categoryName`);
    }

    if (!categoryIdSet.has(categoryId)) {
      const catName = row.categoryName || categoryId;
      categories.push({
        id: categoryId,
        name: catName,
        vertical: row.vertical || defaultVertical,
        parentId: null,
        color: "#A30A2A",
      });
      categoryIdSet.add(categoryId);
      nameToId.set(catName.toLowerCase(), categoryId);
    }

    products.push({
      id: productId(row),
      name: row.name,
      sku: row.sku || "",
      categoryId,
      attributes: row.attributes || {},
    });
  }

  return { categories, products };
}

function parseArgs(argv) {
  const args = {
    xlsx: path.resolve(__dirname, "../../../Docs/products/ShelfPilot-product-import.xlsx"),
    images: path.resolve(__dirname, "../../../Docs/products/images"),
    skipImages: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--xlsx" && argv[i + 1]) {
      args.xlsx = path.resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === "--images" && argv[i + 1]) {
      args.images = path.resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === "--skip-images") {
      args.skipImages = true;
    }
  }
  return args;
}

function main() {
  const { xlsx, images, skipImages } = parseArgs(process.argv);
  if (!fs.existsSync(xlsx)) {
    console.error(`Excel file not found: ${xlsx}`);
    process.exit(1);
  }

  const raw = parseWorkbook(xlsx);
  const { categories, products } = normalizePayload(raw.categories, raw.products, "retail");

  console.log(`Clearing existing catalog…`);
  repo.clearCatalog();

  console.log(`Importing ${categories.length} categories…`);
  for (const cat of categories) {
    repo.upsertCategory(cat);
  }

  console.log(`Importing ${products.length} products…`);
  for (const p of products) {
    repo.upsertProduct(p);
  }

  let copied = 0;
  if (!skipImages) {
    console.log(`Uploading images from ${images} → ${resolveProductImagesDir()}`);
    copied = copyImagesFromSource(images);
    const mapResult = mapImagesToProducts(repo.listProducts(), (p) => repo.upsertProduct(p));
    console.log(`Mapped ${mapResult.mapped} product image(s).`);
  }

  const withImages = repo.listProducts().filter((p) => p.attributes?.imageUrl).length;
  console.log(
    JSON.stringify({
      ok: true,
      xlsx,
      imagesFolder: resolveProductImagesDir(),
      imagesCopied: copied,
      categories: categories.length,
      products: products.length,
      productsWithImages: withImages,
      sampleImageUrl: repo.listProducts()[0]?.attributes?.imageUrl,
    })
  );
}

main();
