import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveCategoryId,
  descendantCategoryIds,
  productAllowedForShelf,
  listCategoriesForLayout,
} from "../src/services/categoryTree.js";

const importedCategories = [
  { id: "cat-fresh-produce", name: "Fresh Produce", parentId: null },
  { id: "cat-vegetables", name: "Vegetables", parentId: "cat-fresh-produce" },
  { id: "cat-grocery", name: "Grocery", parentId: null },
  { id: "cat-rice-grains", name: "Rice & Grains", parentId: "cat-grocery" },
];

test("resolveCategoryId maps legacy shelf ids to imported catalog ids", () => {
  assert.equal(resolveCategoryId("fresh-produce", importedCategories), "cat-fresh-produce");
  assert.equal(resolveCategoryId("hm-grocery", importedCategories), "cat-grocery");
  assert.equal(resolveCategoryId("cat-vegetables", importedCategories), "cat-vegetables");
});

test("productAllowedForShelf accepts products under resolved parent category", () => {
  const product = { id: "prd-1", categoryId: "cat-vegetables" };
  assert.equal(productAllowedForShelf(product, "fresh-produce", importedCategories), true);
  assert.equal(productAllowedForShelf(product, "hm-fresh", importedCategories), true);
  assert.equal(productAllowedForShelf(product, "cat-rice-grains", importedCategories), false);
});

test("productAllowedForShelf maps legacy product category ids", () => {
  const legacyProduct = { id: "prd-2", categoryId: "grocery" };
  const categoriesWithLegacy = [
    ...importedCategories,
    { id: "grocery", name: "Grocery (legacy)", parentId: null },
  ];
  assert.equal(productAllowedForShelf(legacyProduct, "cat-grocery", categoriesWithLegacy), true);
});

test("listCategoriesForLayout merges hypermarket and retail verticals", () => {
  const merged = listCategoriesForLayout("hypermarket", (v) =>
    v === "hypermarket"
      ? [{ id: "hm-grocery", name: "Grocery", vertical: "hypermarket" }]
      : importedCategories
  );
  assert.ok(merged.some((c) => c.id === "hm-grocery"));
  assert.ok(merged.some((c) => c.id === "cat-vegetables"));
});

test("descendantCategoryIds walks tree from resolved root", () => {
  const ids = descendantCategoryIds("hm-fresh", importedCategories);
  assert.ok(ids.has("cat-fresh-produce"));
  assert.ok(ids.has("cat-vegetables"));
});
