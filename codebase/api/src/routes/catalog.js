import { Router } from "express";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { repo, audit } from "../store/sqlite.js";
import { authRequired, requireRoles } from "../middleware/auth.js";
import { listCategoriesForLayout, resolveCategoryId } from "../services/categoryTree.js";
import { normalizeStorageType } from "../services/storageType.js";
import {
  copyImagesFromSource,
  ensureProductImagesDir,
  imageFileNameForProduct,
  mapImagesToProducts,
  publicImageUrl,
  resolveProductImagesDir,
  saveProductImage,
  saveProductImageForName,
} from "../services/productImages.js";
import {
  getCachedCatalog,
  invalidateCatalogCache,
  setCachedCatalog,
} from "../services/productCatalogCache.js";
import { getDb } from "../store/sqlite.js";

export const catalogRouter = Router();

const MAX_INLINE_IMAGE_BYTES = 512_000;

function upsertProductSafe(product, options = {}) {
  try {
    return { ok: true, product: repo.upsertProduct(product, options) };
  } catch (err) {
    if (err.code === "image_data_url_too_large") {
      return { ok: false, error: "image_data_url_too_large", maxBytes: MAX_INLINE_IMAGE_BYTES };
    }
    throw err;
  }
}

function loadProductsForQuery({ vertical, categoryId }) {
  if (categoryId) {
    return repo.listProducts(categoryId);
  }
  if (vertical) {
    const categories = listCategoriesForLayout(vertical, (v) => repo.listCategories(v));
    const catIds = categories.map((c) => c.id);
    let items = repo.listProductsInCategories(catIds);
    const catIdSet = new Set(catIds);
    items = items.filter((p) => {
      const resolved = resolveCategoryId(p.categoryId, categories);
      return catIdSet.has(resolved) || catIdSet.has(p.categoryId);
    });
    return items;
  }
  return repo.listProducts();
}

catalogRouter.get("/categories", authRequired, (req, res) => {
  const vertical = req.query.vertical || null;
  const cached = getCachedCatalog("categories", vertical, null);
  if (cached) {
    return res.json({ items: cached, cached: true });
  }
  const started = performance.now();
  const items = repo.listCategories(vertical);
  setCachedCatalog("categories", vertical, null, items);
  const durationMs = Number((performance.now() - started).toFixed(3));
  res.json({ items, durationMs, cached: false });
});

catalogRouter.post("/categories", authRequired, requireRoles("Designer", "Admin"), (req, res) => {
  const cat = {
    id: req.body?.id || `cat-${randomUUID().slice(0, 6)}`,
    name: req.body?.name || "Category",
    vertical: String(req.body?.vertical || "retail").toLowerCase(),
    parentId: req.body?.parentId || null,
    color: req.body?.color || "#A30A2A",
    storageType: normalizeStorageType(req.body?.storageType || "ambient"),
  };
  repo.upsertCategory(cat);
  audit(req.user.email, "category.create", cat.id);
  res.status(201).json(cat);
});

catalogRouter.patch(
  "/categories/:categoryId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const existing = repo.getCategory(req.params.categoryId);
    if (!existing) return res.status(404).json({ error: "not_found" });
    const patch = req.body || {};
    if (patch.name != null) existing.name = String(patch.name);
    if (patch.color != null) existing.color = String(patch.color);
    if (patch.parentId !== undefined) {
      existing.parentId = patch.parentId && patch.parentId !== existing.id ? String(patch.parentId) : null;
    }
    if (patch.vertical != null) existing.vertical = String(patch.vertical).toLowerCase();
    if (patch.storageType != null) existing.storageType = normalizeStorageType(patch.storageType);
    repo.upsertCategory(existing);
    audit(req.user.email, "category.update", existing.id);
    res.json(existing);
  }
);

catalogRouter.delete(
  "/categories/:categoryId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const result = repo.deleteCategory(req.params.categoryId);
    if (!result.ok) {
      if (result.error === "category_has_children") {
        return res.status(409).json({ error: "category_has_children" });
      }
      if (result.error === "category_has_products") {
        return res.status(409).json({ error: "category_has_products" });
      }
      return res.status(404).json({ error: "not_found" });
    }
    audit(req.user.email, "category.delete", req.params.categoryId);
    res.status(204).end();
  }
);

catalogRouter.get("/products", authRequired, (req, res) => {
  const vertical = req.query.vertical || null;
  const categoryId = req.query.categoryId || null;
  const cached = getCachedCatalog("products", vertical, categoryId);
  if (cached) {
    return res.json({ items: cached, cached: true });
  }

  const started = performance.now();
  const items = loadProductsForQuery({ vertical, categoryId });
  setCachedCatalog("products", vertical, categoryId, items);
  const durationMs = Number((performance.now() - started).toFixed(3));
  if (durationMs > 200) {
    console.log(
      JSON.stringify({
        level: "info",
        message: "catalog_products",
        vertical,
        categoryId,
        count: items.length,
        durationMs,
      })
    );
  }
  res.json({ items, durationMs, cached: false });
});

catalogRouter.post("/products", authRequired, requireRoles("Designer", "Admin"), (req, res) => {
  if (!req.body?.categoryId) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const attrs = { ...(req.body?.attributes || {}) };
  if (req.body?.widthMeters != null) attrs.widthMeters = Number(req.body.widthMeters);
  if (req.body?.heightMeters != null) attrs.heightMeters = Number(req.body.heightMeters);
  if (req.body?.depthMeters != null) attrs.depthMeters = Number(req.body.depthMeters);
  if (req.body?.weightKg != null) attrs.weightKg = Number(req.body.weightKg);
  if (req.body?.imageUrl != null) attrs.imageUrl = String(req.body.imageUrl);
  if (req.body?.storageType != null) attrs.storageTemp = normalizeStorageType(req.body.storageType);
  if (req.body?.attributes?.storageTemp != null) attrs.storageTemp = normalizeStorageType(req.body.attributes.storageTemp);
  const product = {
    id: req.body?.id || `prd-${randomUUID().slice(0, 6)}`,
    name: req.body?.name || "Product",
    sku: req.body?.sku || "",
    categoryId: req.body.categoryId,
    attributes: attrs,
  };
  const savedResult = upsertProductSafe(product);
  if (!savedResult.ok) {
    return res.status(413).json({ error: savedResult.error, maxBytes: savedResult.maxBytes });
  }
  const saved = savedResult.product;
  audit(req.user.email, "product.create", product.id);
  res.status(201).json(saved);
});

catalogRouter.patch(
  "/products/:productId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const existing = repo.getProduct(req.params.productId);
    if (!existing) return res.status(404).json({ error: "not_found" });
    const patch = req.body || {};
    if (patch.name != null) existing.name = String(patch.name);
    if (patch.sku != null) existing.sku = String(patch.sku);
    if (patch.categoryId != null) existing.categoryId = String(patch.categoryId);
    if (patch.attributes != null && typeof patch.attributes === "object") {
      existing.attributes = { ...(existing.attributes || {}), ...patch.attributes };
    }
    if (patch.widthMeters != null) {
      existing.attributes = { ...(existing.attributes || {}), widthMeters: Number(patch.widthMeters) };
    }
    if (patch.heightMeters != null) {
      existing.attributes = { ...(existing.attributes || {}), heightMeters: Number(patch.heightMeters) };
    }
    if (patch.depthMeters != null) {
      existing.attributes = { ...(existing.attributes || {}), depthMeters: Number(patch.depthMeters) };
    }
    if (patch.weightKg !== undefined) {
      existing.attributes = {
        ...(existing.attributes || {}),
        weightKg: patch.weightKg == null || patch.weightKg === "" ? undefined : Number(patch.weightKg),
      };
    }
    if (patch.imageUrl !== undefined) {
      existing.attributes = { ...(existing.attributes || {}), imageUrl: patch.imageUrl ? String(patch.imageUrl) : "" };
    }
    if (patch.storageType != null) {
      existing.attributes = {
        ...(existing.attributes || {}),
        storageTemp: normalizeStorageType(patch.storageType),
      };
    }
    if (!existing.categoryId) return res.status(400).json({ error: "missing_fields" });
    const savedResult = upsertProductSafe(existing);
    if (!savedResult.ok) {
      return res.status(413).json({ error: savedResult.error, maxBytes: savedResult.maxBytes });
    }
    const saved = savedResult.product;
    audit(req.user.email, "product.update", existing.id);
    res.json(saved);
  }
);

catalogRouter.delete(
  "/products/:productId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const ok = repo.deleteProduct(req.params.productId);
    if (!ok) return res.status(404).json({ error: "not_found" });
    audit(req.user.email, "product.delete", req.params.productId);
    res.status(204).end();
  }
);

catalogRouter.post("/catalog/import", authRequired, requireRoles("Admin", "Designer"), (req, res) => {
  const categories = Array.isArray(req.body?.categories) ? req.body.categories : [];
  const products = Array.isArray(req.body?.products) ? req.body.products : [];
  const categoryIds = new Set();
  const db = getDb();
  let importedProducts = 0;

  db.exec("BEGIN");
  try {
    for (const c of categories) {
      if (!c.name && !c.id) continue;
      const cat = {
        id: c.id || `cat-${randomUUID().slice(0, 6)}`,
        name: c.name || c.id,
        vertical: String(c.vertical || "retail").toLowerCase(),
        parentId: c.parentId || null,
        color: c.color || "#A30A2A",
        storageType: normalizeStorageType(c.storageType || "ambient"),
      };
      repo.upsertCategory(cat, { skipCacheInvalidate: true });
      categoryIds.add(cat.id);
    }

    const allCategories = repo.listCategories();
    const existingCatIds = new Set(allCategories.map((c) => c.id));

    for (const p of products) {
      if (!p.categoryId) continue;
      if (!existingCatIds.has(p.categoryId) && !categoryIds.has(p.categoryId)) {
        const stub = {
          id: p.categoryId,
          name: p.categoryName || p.categoryId,
          vertical: String(p.vertical || categories[0]?.vertical || "retail").toLowerCase(),
          parentId: null,
          color: "#A30A2A",
          storageType: "ambient",
        };
        repo.upsertCategory(stub, { skipCacheInvalidate: true });
        categoryIds.add(stub.id);
        existingCatIds.add(stub.id);
      }
      if (!p.name && !p.sku) continue;
      const savedResult = upsertProductSafe(
        {
          id: p.id || `prd-${randomUUID().slice(0, 6)}`,
          name: p.name || p.sku,
          sku: p.sku || "",
          categoryId: p.categoryId,
          attributes: p.attributes || {},
        },
        { skipCacheInvalidate: true }
      );
      if (!savedResult.ok) {
        throw Object.assign(new Error(savedResult.error), { code: savedResult.error, status: 413 });
      }
      importedProducts += 1;
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    if (err.code === "image_data_url_too_large") {
      return res.status(413).json({ error: err.code, maxBytes: MAX_INLINE_IMAGE_BYTES });
    }
    throw err;
  }
  invalidateCatalogCache();

  const verticals = [
    ...new Set([
      ...categories.map((c) => String(c.vertical || "retail").toLowerCase()),
      ...products.map((p) => String(p.vertical || "").toLowerCase()).filter(Boolean),
    ]),
  ];

  audit(req.user.email, "catalog.import", `cats=${categoryIds.size},prds=${importedProducts}`);
  res.json({
    importedCategories: categoryIds.size,
    importedProducts,
    verticals,
  });
});

catalogRouter.get("/catalog/export", authRequired, (req, res) => {
  const vertical = req.query.vertical || null;
  const categories = repo.listCategories(vertical);
  const catIds = new Set(categories.map((c) => c.id));
  const products = vertical
    ? repo.listProductsInCategories([...catIds])
    : repo.listProducts();
  res.json({ categories, products });
});

catalogRouter.get("/catalog/product-images", authRequired, (req, res) => {
  ensureProductImagesDir();
  const files = [];
  try {
    for (const name of fs.readdirSync(resolveProductImagesDir())) {
      if (/\.(png|jpe?g|webp)$/i.test(name)) files.push({ fileName: name, url: publicImageUrl(name) });
    }
  } catch {
    /* empty folder */
  }
  res.json({ folder: resolveProductImagesDir(), items: files });
});

catalogRouter.post(
  "/catalog/product-images/upload",
  authRequired,
  requireRoles("Admin", "Designer"),
  (req, res) => {
    const productName = String(req.body?.productName || req.body?.name || "").trim();
    const fileName = String(req.body?.fileName || "").trim();
    const dataBase64 = String(req.body?.dataBase64 || req.body?.data || "");
    if (!dataBase64) return res.status(400).json({ error: "missing_image_data" });

    let buffer;
    try {
      const raw = dataBase64.includes(",") ? dataBase64.split(",").pop() : dataBase64;
      buffer = Buffer.from(raw, "base64");
    } catch {
      return res.status(400).json({ error: "invalid_image_data" });
    }
    if (!buffer.length) return res.status(400).json({ error: "empty_image" });

    try {
      const targetName =
        fileName ||
        (productName ? imageFileNameForProduct(productName, ".png") : "");
      const saved = productName && !fileName
        ? saveProductImageForName(buffer, productName, ".png")
        : saveProductImage(buffer, targetName);

      if (productName) {
        const product = repo.getProductByName(productName);
        if (product) {
          repo.upsertProduct({
            ...product,
            attributes: { ...(product.attributes || {}), imageUrl: saved.url },
          });
        }
      }

      audit(req.user.email, "product-image.upload", saved.fileName);
      res.status(201).json(saved);
    } catch (err) {
      if (err.message === "invalid_image_file") {
        return res.status(400).json({ error: "invalid_image_file" });
      }
      throw err;
    }
  }
);

catalogRouter.post(
  "/catalog/product-images/sync",
  authRequired,
  requireRoles("Admin", "Designer"),
  (req, res) => {
    const sourceDir = req.body?.sourceDir ? String(req.body.sourceDir) : null;
    if (!sourceDir) return res.status(400).json({ error: "missing_source_dir" });

    let copied = 0;
    try {
      copied = copyImagesFromSource(sourceDir);
    } catch (err) {
      if (String(err.message).startsWith("source_not_found:")) {
        return res.status(400).json({ error: "source_not_found" });
      }
      throw err;
    }

    const products = repo.listProducts();
    const mapResult = mapImagesToProducts(products, (p) => repo.upsertProduct(p));
    audit(req.user.email, "product-image.sync", `copied=${copied},mapped=${mapResult.mapped}`);
    res.json({
      copied,
      folder: resolveProductImagesDir(),
      ...mapResult,
    });
  }
);

catalogRouter.post(
  "/catalog/product-images/map",
  authRequired,
  requireRoles("Admin", "Designer"),
  (req, res) => {
    const vertical = req.query.vertical || req.body?.vertical || null;
    let products = repo.listProducts();
    if (vertical) {
      const catIds = new Set(repo.listCategories(String(vertical)).map((c) => c.id));
      products = products.filter((p) => catIds.has(p.categoryId));
    }
    const result = mapImagesToProducts(products, (p) => repo.upsertProduct(p));
    audit(req.user.email, "product-image.map", `mapped=${result.mapped}`);
    res.json({ folder: resolveProductImagesDir(), ...result });
  }
);
