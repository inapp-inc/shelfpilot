import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  copyImagesFromSource,
  ensureProductImagesDir,
  isAllowedImageFile,
  resolveProductImagesDir,
} from "../services/productImages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Default bundled seed shipped in the Docker image. */
export function resolveBundledSeedDir() {
  return path.resolve(__dirname, "../../seed/product-images");
}

/** Canonical source pack maintained under Docs/products/images. */
export function resolveDocsSeedDir() {
  return path.resolve(__dirname, "../../../../Docs/products/images");
}

export function resolveSeedDir() {
  if (process.env.PRODUCT_IMAGES_SEED) {
    return path.resolve(process.env.PRODUCT_IMAGES_SEED);
  }
  const bundled = resolveBundledSeedDir();
  if (fs.existsSync(bundled)) return bundled;
  const docs = resolveDocsSeedDir();
  if (fs.existsSync(docs)) return docs;
  return null;
}

function countImages(dir) {
  if (!dir || !fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((name) => isAllowedImageFile(name)).length;
}

/** Copy seed thumbnails into the runtime folder when it is empty or behind the seed pack. */
export function bootstrapProductImages() {
  const target = ensureProductImagesDir();
  const seed = resolveSeedDir();
  const existing = countImages(target);

  if (!seed) {
    return { copied: 0, seed: null, target, existing };
  }

  const seedCount = countImages(seed);
  if (seedCount === 0) {
    return { copied: 0, seed, target, existing };
  }

  // Refresh when runtime is empty OR seed has many more files (stale Docker volume).
  if (existing > 0 && existing >= Math.min(20, seedCount)) {
    return { copied: 0, seed, target, existing, seedCount };
  }

  const copied = copyImagesFromSource(seed, target);
  return { copied, seed, target, existing, seedCount };
}

export function seedProductImagesFromDocs() {
  const docs = resolveDocsSeedDir();
  const bundled = resolveBundledSeedDir();
  const runtime = resolveProductImagesDir();

  fs.mkdirSync(path.dirname(bundled), { recursive: true });
  fs.mkdirSync(bundled, { recursive: true });
  fs.mkdirSync(runtime, { recursive: true });

  const toBundled = copyImagesFromSource(docs, bundled);
  const toRuntime = copyImagesFromSource(docs, runtime);
  return { docs, bundled, runtime, toBundled, toRuntime };
}
