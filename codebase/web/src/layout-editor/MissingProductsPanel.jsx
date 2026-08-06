import { useEffect, useMemo, useState } from "react";
import { categoryLabel } from "../catalog/buildCategoryTree.js";
import { MISSING_PRODUCT_MIME, serializeMissingProduct } from "./missingProductDrag.js";

function groupMissingByCategory(missing, categories) {
  const map = new Map();
  for (const p of missing) {
    const key = p.categoryId || "__none__";
    if (!map.has(key)) {
      map.set(key, {
        categoryId: key,
        categoryName: key === "__none__" ? "Uncategorized" : categoryLabel(categories, key),
        products: [],
      });
    }
    map.get(key).products.push(p);
  }
  return [...map.values()].sort((a, b) => b.products.length - a.products.length);
}

/** Catalog coverage — products not placed on any shelf in this layout. */
export default function MissingProductsPanel({
  coverage,
  loading,
  onRefresh,
  categories = [],
  alwaysShow = false,
  defaultOpen = false,
  title = "Products not on shelves",
  embedded = false,
  variant = "default",
  maxProductsPerCategory = 12,
  draggable = false,
  editDisabled = false,
  onProductDragStart,
  onProductDragEnd,
  dragHint = "Drag a product onto a shelf on the 2D canvas to place it.",
  categoryTabs = false,
}) {
  if (!alwaysShow && !coverage && !loading) return null;

  const missing = coverage?.missingProducts || [];
  const total = coverage?.totalProducts ?? 0;
  const placed = coverage?.placedCount ?? 0;
  const pct = coverage?.coveragePercent ?? 0;
  const grouped = useMemo(() => groupMissingByCategory(missing, categories), [missing, categories]);
  const [activeCategoryId, setActiveCategoryId] = useState("all");

  useEffect(() => {
    setActiveCategoryId("all");
  }, [missing.length, total, placed]);

  useEffect(() => {
    if (activeCategoryId === "all") return;
    if (!grouped.some((g) => g.categoryId === activeCategoryId)) {
      setActiveCategoryId("all");
    }
  }, [activeCategoryId, grouped]);

  const visibleGroups = useMemo(() => {
    if (!categoryTabs || activeCategoryId === "all") return grouped;
    return grouped.filter((g) => g.categoryId === activeCategoryId);
  }, [grouped, categoryTabs, activeCategoryId]);

  const isSidebar = variant === "sidebar";

  const categoryList = (
    <div className={`missing-by-category${isSidebar ? " missing-by-category--sidebar" : ""}${categoryTabs ? " missing-by-category--tabs" : ""}`}>
      {visibleGroups.map((g) => (
        <div key={g.categoryId} className={`missing-category-block${isSidebar ? " missing-category-block--sidebar" : ""}`}>
          {!(categoryTabs && activeCategoryId !== "all") ? (
            <div className="missing-category-head">
              <span className="missing-category-name">{g.categoryName}</span>
              <span className="missing-category-count mono">{g.products.length}</span>
            </div>
          ) : null}
          <ul className={`missing-products-list${embedded ? " missing-products-list--dialog" : ""}${isSidebar ? " missing-products-list--sidebar" : ""}`}>
            {(maxProductsPerCategory != null ? g.products.slice(0, maxProductsPerCategory) : g.products).map((p) => (
              <li
                key={p.id}
                className={[
                  isSidebar ? "missing-product-row" : undefined,
                  draggable && !editDisabled ? "missing-product-draggable" : undefined,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined}
                draggable={draggable && !editDisabled}
                onDragStart={(e) => {
                  if (editDisabled) {
                    e.preventDefault();
                    return;
                  }
                  e.dataTransfer.setData(MISSING_PRODUCT_MIME, serializeMissingProduct(p));
                  e.dataTransfer.effectAllowed = "copy";
                  const ghost = document.createElement("div");
                  ghost.className = "missing-product-drag-ghost";
                  ghost.textContent = p.name || p.sku || p.id;
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, 12, 12);
                  requestAnimationFrame(() => ghost.remove());
                  onProductDragStart?.(p);
                }}
                onDragEnd={() => onProductDragEnd?.()}
              >
                {isSidebar ? (
                  <>
                    {draggable && !editDisabled ? (
                      <span className="missing-product-grip" aria-hidden>
                        ⋮⋮
                      </span>
                    ) : null}
                    <span className="missing-product-row-body">
                      <span className="missing-product-name">{p.name || p.sku || p.id}</span>
                      {p.sku ? <span className="missing-product-sku mono">{p.sku}</span> : null}
                    </span>
                  </>
                ) : (
                  <>
                    <span>{p.name || p.sku || p.id}</span>
                    {p.sku ? (
                      <span className="muted mono" style={{ fontSize: 11 }}>
                        {p.sku}
                      </span>
                    ) : null}
                  </>
                )}
              </li>
            ))}
            {maxProductsPerCategory != null && g.products.length > maxProductsPerCategory ? (
              <li className="muted" style={{ fontSize: 12 }}>
                …and {g.products.length - maxProductsPerCategory} more in {g.categoryName}
              </li>
            ) : null}
          </ul>
        </div>
      ))}
    </div>
  );

  const categoryTabsBar =
    categoryTabs && grouped.length > 0 ? (
      <div className="product-mapping-category-tabs" role="tablist" aria-label="Missing products by category">
        <button
          type="button"
          role="tab"
          aria-selected={activeCategoryId === "all"}
          className={`product-mapping-category-tab${activeCategoryId === "all" ? " product-mapping-category-tab--active" : ""}`}
          onClick={() => setActiveCategoryId("all")}
        >
          All
          <span className="product-mapping-category-tab-count mono">{missing.length}</span>
        </button>
        {grouped.map((g) => (
          <button
            key={g.categoryId}
            type="button"
            role="tab"
            aria-selected={activeCategoryId === g.categoryId}
            className={`product-mapping-category-tab${activeCategoryId === g.categoryId ? " product-mapping-category-tab--active" : ""}`}
            onClick={() => setActiveCategoryId(g.categoryId)}
            title={g.categoryName}
          >
            <span className="product-mapping-category-tab-label">{g.categoryName}</span>
            <span className="product-mapping-category-tab-count mono">{g.products.length}</span>
          </button>
        ))}
      </div>
    ) : null;

  const body = loading ? (
    <p className="muted" style={{ fontSize: 12, margin: 0 }}>
      Loading coverage…
    </p>
  ) : !coverage ? (
    <p className="muted" style={{ fontSize: 12, margin: 0 }}>
      Coverage unavailable — open the layout in the editor after placing shelves.
    </p>
  ) : (
    <>
      <div className={`missing-coverage-summary${isSidebar ? " missing-coverage-summary--sidebar" : ""}`}>
        <span className={`missing-coverage-pct mono${pct >= 100 ? " is-full" : ""}`}>{pct}%</span>
        <span className="missing-coverage-detail muted">
          {placed}/{total} placed
          {missing.length ? ` · ${missing.length} missing` : " · complete"}
        </span>
      </div>
      {missing.length > 0 ? (
        categoryTabs ? (
          <>
            {categoryTabsBar}
            {categoryList}
          </>
        ) : embedded ? (
          categoryList
        ) : (
          <details className="missing-products-details" open={defaultOpen}>
            <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Missing by category ({missing.length} products)
            </summary>
            {categoryList}
          </details>
        )
      ) : (
        <p className="muted" style={{ fontSize: 12, margin: embedded ? 0 : "8px 0 0" }}>
          Every catalog product for this store type is on at least one shelf.
        </p>
      )}
      {draggable && !editDisabled && missing.length > 0 ? (
        <p className={`muted missing-product-drag-hint${isSidebar ? " missing-product-drag-hint--sidebar" : ""}`}>
          {dragHint}
        </p>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className={`missing-products-embedded${isSidebar ? " missing-products-embedded--sidebar" : ""}`}>
        {body}
      </div>
    );
  }

  return (
    <div className="panel missing-products-panel">
      <div className="missing-products-header">
        <strong>{title}</strong>
        {onRefresh ? (
          <button type="button" className="btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={onRefresh}>
            Refresh
          </button>
        ) : null}
      </div>
      {body}
    </div>
  );
}
