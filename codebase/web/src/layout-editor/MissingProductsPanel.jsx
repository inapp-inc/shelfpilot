import { useMemo } from "react";
import { categoryLabel } from "../catalog/buildCategoryTree.js";

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
}) {
  if (!alwaysShow && !coverage && !loading) return null;

  const missing = coverage?.missingProducts || [];
  const total = coverage?.totalProducts ?? 0;
  const placed = coverage?.placedCount ?? 0;
  const pct = coverage?.coveragePercent ?? 0;
  const grouped = useMemo(() => groupMissingByCategory(missing, categories), [missing, categories]);

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
      {loading ? (
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          Loading coverage…
        </p>
      ) : !coverage ? (
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          Coverage unavailable — open the layout in the editor after placing shelves.
        </p>
      ) : (
        <>
          <div className="missing-coverage-summary">
            <span className="mono" style={{ fontWeight: 700, color: pct >= 100 ? "#16a34a" : "#d97706" }}>
              {pct}%
            </span>
            <span className="muted" style={{ fontSize: 12 }}>
              {placed} of {total} catalog products placed on shelves
              {missing.length ? ` · ${missing.length} still need placement` : " · all placed"}
            </span>
          </div>
          {missing.length > 0 ? (
            <details className="missing-products-details" open={defaultOpen}>
              <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Missing by category ({missing.length} products)
              </summary>
              <div className="missing-by-category">
                {grouped.map((g) => (
                  <div key={g.categoryId} className="missing-category-block">
                    <div className="missing-category-head">
                      <span>{g.categoryName}</span>
                      <span className="mono muted" style={{ fontSize: 11 }}>
                        {g.products.length}
                      </span>
                    </div>
                    <ul className="missing-products-list">
                      {g.products.slice(0, 12).map((p) => (
                        <li key={p.id}>
                          <span>{p.name || p.sku || p.id}</span>
                          {p.sku ? (
                            <span className="muted mono" style={{ fontSize: 11 }}>
                              {p.sku}
                            </span>
                          ) : null}
                        </li>
                      ))}
                      {g.products.length > 12 ? (
                        <li className="muted" style={{ fontSize: 12 }}>
                          …and {g.products.length - 12} more in {g.categoryName}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          ) : (
            <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
              Every catalog product for this store type is on at least one shelf.
            </p>
          )}
        </>
      )}
    </div>
  );
}
