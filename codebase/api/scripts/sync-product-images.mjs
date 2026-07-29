/**
 * Copy product images into data/product-images/ and map them to catalog products
 * by filename (<Product Name>.png).
 *
 * Usage (from codebase/api):
 *   node scripts/sync-product-images.mjs
 *   node scripts/sync-product-images.mjs --source ../../Docs/products/images
 *   node scripts/sync-product-images.mjs --map-only
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repo } from "../src/store/sqlite.js";
import {
  copyImagesFromSource,
  mapImagesToProducts,
  resolveProductImagesDir,
} from "../src/services/productImages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    source: path.resolve(__dirname, "../../../Docs/products/images"),
    mapOnly: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--source" && argv[i + 1]) {
      args.source = path.resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === "--map-only") {
      args.mapOnly = true;
    }
  }
  return args;
}

function main() {
  const { source, mapOnly } = parseArgs(process.argv);
  let copied = 0;

  if (!mapOnly) {
    console.log(`Copying images from ${source} → ${resolveProductImagesDir()}`);
    copied = copyImagesFromSource(source);
    console.log(`Copied ${copied} image(s).`);
  }

  const products = repo.listProducts();
  const result = mapImagesToProducts(products, (p) => repo.upsertProduct(p));
  console.log(
    JSON.stringify({
      ok: true,
      copied,
      folder: result.folder,
      mapped: result.mapped,
      missing: result.missing,
      total: result.total,
    })
  );
}

main();
