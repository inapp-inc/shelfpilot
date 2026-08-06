/** Storage temperature — categories and products (ambient / chilled / frozen). */

import { resolveCategoryId } from "./layout-editor/categoryFilter.js";

export const STORAGE_TYPE_OPTIONS = [
  { id: "ambient", label: "Ambient", emoji: "🌡️" },
  { id: "chilled", label: "Chilled", emoji: "🧊" },
  { id: "frozen", label: "Frozen", emoji: "❄️" },
];

export function normalizeStorageType(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (!v) return "ambient";
  if (v === "chilled" || v === "cold" || v === "refrigerated" || v === "cool") return "chilled";
  if (v === "frozen" || v === "freeze") return "frozen";
  return "ambient";
}

export function storageTypeLabel(type) {
  const id = normalizeStorageType(type);
  return STORAGE_TYPE_OPTIONS.find((o) => o.id === id)?.label || "Ambient";
}

export function productStorageType(product) {
  const raw =
    product?.storageType ??
    product?.attributes?.storageTemp ??
    product?.attributes?.storageType ??
    product?.attributes?.temperatureZone;
  return normalizeStorageType(raw);
}

export function categoryRecordStorageType(category, categories) {
  if (!category) return "ambient";
  if (category.storageType) return normalizeStorageType(category.storageType);
  if (category.temperatureZone) return normalizeStorageType(category.temperatureZone);
  const hay = `${category.id || ""} ${category.name || ""}`.toLowerCase();
  if (/\bfrozen\b/.test(hay)) return "frozen";
  if (/\bchilled\b|\brefrigerated\b|\bcold\b/.test(hay)) return "chilled";
  if (category.parentId && categories?.length) {
    const parent = categories.find((c) => c.id === category.parentId);
    if (parent) return categoryRecordStorageType(parent, categories);
  }
  return "ambient";
}

export function resolveCategoryStorageType(categoryId, categories) {
  if (!categoryId) return "ambient";
  const resolved = resolveCategoryId(categoryId, categories);
  const cat = (categories || []).find((c) => c.id === resolved);
  return categoryRecordStorageType(cat, categories);
}

export function productMatchesCategoryStorage(product, shelfCategoryId, categories) {
  const required = resolveCategoryStorageType(shelfCategoryId, categories);
  return productStorageType(product) === required;
}
