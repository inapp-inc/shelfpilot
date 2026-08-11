import test from "node:test";
import assert from "node:assert/strict";
import { buildMissingCategoryTree } from "../../web/src/layout-editor/missingProductCategories.js";

const categories = [
  { id: "cat-grocery", name: "Grocery", parentId: null },
  { id: "cat-rice-grains", name: "Rice & Grains", parentId: "cat-grocery" },
  { id: "cat-spices", name: "Spices & Masala", parentId: "cat-grocery" },
];

const missing = [
  { id: "p1", name: "Basmati Rice", categoryId: "cat-rice-grains" },
  { id: "p2", name: "Coriander Powder", categoryId: "cat-spices" },
  { id: "p3", name: "Mixed Nuts", categoryId: "cat-grocery" },
];

test("buildMissingCategoryTree nests products under parent category", () => {
  const tree = buildMissingCategoryTree(missing, categories, "cat-grocery");
  assert.equal(tree.length, 1);
  assert.equal(tree[0].categoryId, "cat-grocery");
  assert.equal(tree[0].totalCount, 3);
  assert.equal(tree[0].products.length, 1);
  assert.equal(tree[0].children.length, 2);
  const rice = tree[0].children.find((c) => c.categoryId === "cat-rice-grains");
  assert.equal(rice.products.length, 1);
  assert.equal(rice.totalCount, 1);
});

test("buildMissingCategoryTree filters to selected root only", () => {
  const tree = buildMissingCategoryTree(missing, categories, "cat-rice-grains");
  assert.equal(tree.length, 1);
  assert.equal(tree[0].categoryId, "cat-rice-grains");
  assert.equal(tree[0].products.length, 1);
});
