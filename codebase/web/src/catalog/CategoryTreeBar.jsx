import { buildCategoryTree } from "./buildCategoryTree.js";
import { descendantCategoryIds } from "../layout-editor/categoryFilter.js";

function countProducts(products, categoryId, flatCategories) {
  if (!categoryId) return products?.length ?? 0;
  const allowed = descendantCategoryIds(categoryId, flatCategories);
  return (products || []).filter((p) => allowed.has(p.categoryId)).length;
}

/** Horizontal category strip — replaces left sidebar for more table space. */
export default function CategoryTreeBar({
  categories,
  products,
  selectedId,
  onSelect,
  onAddCategory,
  onEditCategory,
  editDisabled,
}) {
  const tree = buildCategoryTree(categories);

  function flatten(nodes, depth = 0, out = []) {
    for (const n of nodes) {
      out.push({ ...n, depth });
      if (n.children?.length) flatten(n.children, depth + 1, out);
    }
    return out;
  }

  const flat = flatten(tree);

  return (
    <div className="cat-tree-bar">
      <div className="cat-tree-bar-header">
        <span className="section-label" style={{ margin: 0 }}>
          Categories
        </span>
        {!editDisabled ? (
          <button type="button" className="btn-secondary cat-tree-add" onClick={onAddCategory}>
            + Add
          </button>
        ) : null}
      </div>
      <div className="cat-tree-bar-scroll">
        <button
          type="button"
          className={`cat-bar-chip ${!selectedId ? "active" : ""}`}
          onClick={() => onSelect?.(null)}
        >
          All
          <span className="mono cat-bar-count">{products?.length ?? 0}</span>
        </button>
        {flat.map((c) => {
          const active = selectedId === c.id;
          const n = countProducts(products, c.id, categories);
          return (
            <span
              key={c.id}
              className={`cat-bar-chip ${active ? "active" : ""}`}
              style={{ marginLeft: c.depth ? 4 : 0 }}
            >
              <button
                type="button"
                className="cat-bar-chip-main"
                onClick={() => onSelect?.(c.id)}
                title={`Filter by ${c.name}`}
              >
                <span className="cat-tree-dot" style={{ background: c.color || "#A30A2A" }} />
                {c.name}
                <span className="mono cat-bar-count">{n}</span>
              </button>
              {!editDisabled && onEditCategory ? (
                <button
                  type="button"
                  className="cat-bar-chip-edit"
                  title={`Edit ${c.name}`}
                  aria-label={`Edit ${c.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCategory(c);
                  }}
                >
                  ✎
                </button>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
