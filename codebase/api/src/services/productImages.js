import fs from "node:fs";
import path from "node:path";
import { resolveSqlitePath } from "../store/sqlite.js";

export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

/** Folder where product thumbnails are stored (alongside the SQLite DB by default). */
export function resolveProductImagesDir() {
  if (process.env.PRODUCT_IMAGES_DIR) return path.resolve(process.env.PRODUCT_IMAGES_DIR);
  const sqlitePath = resolveSqlitePath();
  if (sqlitePath === ":memory:") {
    return path.resolve(process.cwd(), "data", "product-images");
  }
  return path.join(path.dirname(sqlitePath), "product-images");
}

export function ensureProductImagesDir() {
  const dir = resolveProductImagesDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Public URL path for a stored image file (relative to app base). */
export function publicImageUrl(fileName) {
  return `/product-images/${encodeURIComponent(fileName)}`;
}

export function imageFileNameForProduct(productName, ext = ".png") {
  return `${productName}${ext}`;
}

export function isAllowedImageFile(fileName) {
  const ext = path.extname(String(fileName || "")).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

export function sanitizeImageFileName(fileName) {
  const base = path.basename(String(fileName || "").trim());
  if (!base || base.includes("..")) return null;
  if (!isAllowedImageFile(base)) return null;
  return base;
}

export function findImageForProduct(productName, dir) {
  const imagesDir = dir || ensureProductImagesDir();
  for (const ext of IMAGE_EXTENSIONS) {
    const fileName = imageFileNameForProduct(productName, ext);
    if (fs.existsSync(path.join(imagesDir, fileName))) return fileName;
  }
  return null;
}

export function copyImagesFromSource(sourceDir, destDir) {
  const dest = destDir || ensureProductImagesDir();
  fs.mkdirSync(dest, { recursive: true });
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`source_not_found:${sourceDir}`);
  }
  let copied = 0;
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!isAllowedImageFile(entry.name)) continue;
    fs.copyFileSync(path.join(sourceDir, entry.name), path.join(dest, entry.name));
    copied += 1;
  }
  return copied;
}

export function saveProductImage(buffer, fileName) {
  const safe = sanitizeImageFileName(fileName);
  if (!safe) throw new Error("invalid_image_file");
  const dir = ensureProductImagesDir();
  fs.writeFileSync(path.join(dir, safe), buffer);
  return { fileName: safe, url: publicImageUrl(safe) };
}

export function saveProductImageForName(buffer, productName, ext = ".png") {
  const fileName = imageFileNameForProduct(productName, ext);
  return saveProductImage(buffer, fileName);
}

/** Match stored files to catalog products by exact product name (+ extension). */
export function mapImagesToProducts(products, upsertProduct) {
  const dir = ensureProductImagesDir();
  let mapped = 0;
  let missing = 0;
  for (const product of products) {
    const fileName = findImageForProduct(product.name, dir);
    if (!fileName) {
      missing += 1;
      continue;
    }
    const imageUrl = publicImageUrl(fileName);
    upsertProduct({
      ...product,
      attributes: { ...(product.attributes || {}), imageUrl },
    });
    mapped += 1;
  }
  return { mapped, missing, total: products.length, folder: dir };
}
