import { buildCategoryTree } from "./buildCategoryTree.js";
import { descendantCategoryIds } from "../layout-editor/categoryFilter.js";

function countInTree(products, categoryId, categories) {
  if (!categoryId) return products?.length ?? 0;
  const allowed = descendantCategoryIds(categoryId, categories);
  return (products || []).filter((p) => allowed.has(p.categoryId)).length;
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
      {tree.map((parent) => {
        const parentCount = showCounts ? countInTree(products, parent.id, categories) : null;
        const children = parent.children || [];
        if (children.length === 0) {
          return (
            <option key={parent.id} value={parent.id}>
              {parent.name}
              {parentCount != null ? ` (${parentCount})` : ""}
            </option>
          );
        }
        return (
          <optgroup key={parent.id} label={`${parent.name}${parentCount != null ? ` · ${parentCount} SKUs` : ""}`}>
            <option value={parent.id}>
              {parent.name} (all subcategories)
            </option>
            {children.map((ch) => {
              const n = showCounts ? countInTree(products, ch.id, categories) : null;
              return (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                  {n != null ? ` (${n})` : ""}
                </option>
              );
            })}
          </optgroup>
        );
      })}
    </select>
  );
}
