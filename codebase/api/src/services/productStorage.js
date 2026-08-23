/**
 * Normalize product attributes before persistence — avoid storing large data URLs in SQLite.
 */
import { randomUUID } from "node:crypto";
import { saveProductImage, saveProductImageForName } from "./productImages.js";

export function normalizeProductAttributes(attributes = {}, { productName = "", productId = "" } = {}) {
  const attrs = { ...(attributes || {}) };
  const url = attrs.imageUrl;
  if (typeof url !== "string" || !url.startsWith("data:")) {
    return attrs;
  }
  if (url.length > 512_000) {
    const err = new Error("image_data_url_too_large");
    err.code = "image_data_url_too_large";
    throw err;
  }
  try {
    const raw = url.includes(",") ? url.split(",").pop() : url;
    const buffer = Buffer.from(raw, "base64");
    if (!buffer.length) return attrs;
    const ext = url.includes("image/png") ? ".png" : ".jpg";
    const saved =
      productName && String(productName).trim()
        ? saveProductImageForName(buffer, String(productName).trim(), ext)
        : saveProductImage(buffer, `product-${productId || randomUUID().slice(0, 8)}${ext}`);
    attrs.imageUrl = saved.url;
  } catch {
    /* keep original on failure */
  }
  return attrs;
}

/** Parse DB row — shared by list/get paths. */
export function productFromRow(row) {
  if (!row) return null;
  const attributes = JSON.parse(row.attributes || "{}");
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    categoryId: row.categoryId,
    attributes,
    imageUrl: attributes.imageUrl || null,
  };
}
