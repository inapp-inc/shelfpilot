import { buildCategoryTree } from "./buildCategoryTree.js";
import { descendantCategoryIds } from "../layout-editor/categoryFilter.js";

function countInTree(products, categoryId, categories) {
  if (!categoryId) return products?.length ?? 0;
  const allowed = descendantCategoryIds(categoryId, categories);
  return (products || []).filter((p) => allowed.has(p.categoryId)).length;
}

function renderCategoryOptions(nodes, { products, categories, showCounts, depth = 0 }, out = []) {
  for (const node of nodes) {
    const count = showCounts ? countInTree(products, node.id, categories) : null;
    const prefix = depth > 0 ? `${"\u00A0".repeat(depth * 2)}↳ ` : "";
    out.push(
      <option key={node.id} value={node.id}>
        {prefix}
        {node.name}
        {count != null ? ` (${count})` : ""}
      </option>
    );
    if (node.children?.length) {
      renderCategoryOptions(node.children, { products, categories, showCounts, depth: depth + 1 }, out);
    }
  }
  return out;
}

/** Hierarchical category select with optional product counts. */
export default function CategoryTreePicker({
  categories,
  products,
  value,
  onChange,
  disabled,
  showCounts = false,
  allowEmpty = true,
  emptyLabel = "Unmapped",
  style,
}) {
  const tree = buildCategoryTree(categories);

  return (
    <select
      disabled={disabled}
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value || null)}
      style={{ padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb", width: "100%", ...style }}
    >
      {allowEmpty ? <option value="">{emptyLabel}</option> : null}
      {renderCategoryOptions(tree, { products, categories, showCounts })}
    </select>
  );
}
