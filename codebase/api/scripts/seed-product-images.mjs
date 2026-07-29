/**
 * Copy Docs/products/images into api seed + runtime product-images folders.
 *
 * Usage (from codebase/api):
 *   node scripts/seed-product-images.mjs
 */
import { seedProductImagesFromDocs } from "../src/services/bootstrapProductImages.js";

const result = seedProductImagesFromDocs();
console.log(JSON.stringify({ ok: true, ...result }, null, 2));
