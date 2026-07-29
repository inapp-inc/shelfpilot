/** Catalog coverage — products not placed on any shelf in this layout. */
export default function MissingProductsPanel({ coverage, loading, onRefresh, categories = [] }) {
  if (!coverage && !loading) return null;

  const catName = (id) => categories.find((c) => c.id === id)?.name || id || "—";
  const missing = coverage?.missingProducts || [];
  const total = coverage?.totalProducts ?? 0;
  const placed = coverage?.placedCount ?? 0;
  const pct = coverage?.coveragePercent ?? 0;

  return (
    <div className="panel missing-products-panel">
      <div className="missing-products-header">
        <strong>Catalog coverage</strong>
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
      ) : (
        <>
          <p className="muted" style={{ fontSize: 12, margin: "0 0 8px" }}>
            {placed} of {total} products on shelves ({pct}%)
            {missing.length ? ` · ${missing.length} not placed` : " · all placed"}
          </p>
          {missing.length > 0 ? (
            <details className="missing-products-details">
              <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Missing products ({missing.length})
              </summary>
              <ul className="missing-products-list">
                {missing.slice(0, 80).map((p) => (
                  <li key={p.id}>
                    <span>{p.name || p.sku || p.id}</span>
                    <span className="muted mono" style={{ fontSize: 11 }}>
                      {catName(p.categoryId)}
                    </span>
                  </li>
                ))}
                {missing.length > 80 ? (
                  <li className="muted" style={{ fontSize: 12 }}>
                    …and {missing.length - 80} more
                  </li>
                ) : null}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}
