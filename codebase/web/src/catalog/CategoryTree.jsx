import { buildCategoryTree } from "./buildCategoryTree.js";
import { descendantCategoryIds } from "../layout-editor/categoryFilter.js";

function countProducts(products, categoryId, flatCategories) {
  if (!categoryId) return products?.length ?? 0;
  const allowed = descendantCategoryIds(categoryId, flatCategories);
  return (products || []).filter((p) => allowed.has(p.categoryId)).length;
}

export default function CategoryTree({
  categories,
  products,
  selectedId,
  onSelect,
  onAddCategory,
  editDisabled,
}) {
  const tree = buildCategoryTree(categories);

  function renderNode(c, depth = 0) {
    const active = selectedId === c.id;
    const n = countProducts(products, c.id, categories);
    return (
      <div key={c.id}>
        <button
          type="button"
          className={`cat-tree-item ${active ? "active" : ""}`}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => onSelect?.(c.id)}
        >
          <span className="cat-tree-dot" style={{ background: c.color || "#A30A2A" }} />
          <span className="cat-tree-name">{c.name}</span>
          <span className="cat-tree-count mono">{n}</span>
        </button>
        {(c.children || []).map((ch) => renderNode(ch, depth + 1))}
      </div>
    );
  }

  return (
    <div className="cat-tree">
      <div className="cat-tree-header">
        <span className="section-label" style={{ margin: 0 }}>
          Categories
        </span>
        {!editDisabled ? (
          <button type="button" className="btn-secondary cat-tree-add" onClick={onAddCategory}>
            + Add
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className={`cat-tree-item ${!selectedId ? "active" : ""}`}
        onClick={() => onSelect?.(null)}
      >
        <span className="cat-tree-name">All products</span>
        <span className="cat-tree-count mono">{products?.length ?? 0}</span>
      </button>
      {tree.map((c) => renderNode(c))}
      {!tree.length ? <div className="muted" style={{ fontSize: 12, padding: 8 }}>No categories yet.</div> : null}
    </div>
  );
}
