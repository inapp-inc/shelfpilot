import { useEffect, useMemo, useState } from "react";
import MissingProductsPanel from "./MissingProductsPanel.jsx";
import {
  collectLayoutPlacements,
  uniquePlacedProducts,
  placementsGroupedByCategory,
} from "./placementIndex.js";

/** Toolbar modal — find product/category placements + missing SKUs. */
export default function MissingProductsDialog({
  open,
  onClose,
  coverage,
  loading,
  onRefresh,
  categories = [],
  layout = null,
  products = [],
  onLocateShelf,
}) {
  const [tab, setTab] = useState("product");
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedProductId(null);
    setSelectedCategoryId(null);
  }, [open]);

  const placements = useMemo(
    () => (open && layout ? collectLayoutPlacements(layout, products, categories) : []),
    [open, layout, products, categories]
  );
  const placedProducts = useMemo(() => uniquePlacedProducts(placements), [placements]);
  const categoryGroups = useMemo(() => placementsGroupedByCategory(placements), [placements]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return placedProducts;
    return placedProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        String(p.sku || "").toLowerCase().includes(q) ||
        String(p.categoryName || "").toLowerCase().includes(q)
    );
  }, [placedProducts, query]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categoryGroups;
    return categoryGroups.filter((g) => g.categoryName.toLowerCase().includes(q));
  }, [categoryGroups, query]);

  const selectedProductPlacements = useMemo(() => {
    if (!selectedProductId) return [];
    return placements.filter((p) => p.productId === selectedProductId);
  }, [placements, selectedProductId]);

  const selectedCategory = useMemo(
    () => categoryGroups.find((g) => g.categoryId === selectedCategoryId) || null,
    [categoryGroups, selectedCategoryId]
  );

  if (!open) return null;

  const missingCount = coverage?.missingCount ?? coverage?.missingProducts?.length ?? 0;

  return (
    <div
      className="modal-backdrop missing-products-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="missing-products-dialog-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="modal missing-products-modal find-products-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="missing-products-modal-head">
          <div>
            <h2 id="missing-products-dialog-title" style={{ margin: 0, fontSize: 18 }}>
              Find products
            </h2>
            <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
              See shelf number, level, and position for any placed product or category
            </p>
          </div>
          <button type="button" className="btn-secondary missing-products-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="find-products-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "product"}
            className={`find-products-tab${tab === "product" ? " is-active" : ""}`}
            onClick={() => setTab("product")}
          >
            By product
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "category"}
            className={`find-products-tab${tab === "category" ? " is-active" : ""}`}
            onClick={() => setTab("category")}
          >
            By category
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "missing"}
            className={`find-products-tab${tab === "missing" ? " is-active" : ""}`}
            onClick={() => setTab("missing")}
          >
            Missing{missingCount > 0 ? ` (${missingCount})` : ""}
          </button>
        </div>

        {tab !== "missing" ? (
          <div className="find-products-search">
            <input
              type="search"
              className="find-products-search-input"
              placeholder={tab === "product" ? "Search products…" : "Search categories…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <span className="muted find-products-search-meta">
              {placements.length} placement{placements.length === 1 ? "" : "s"} on layout
            </span>
          </div>
        ) : null}

        {tab === "product" ? (
          <div className="find-products-body">
            <div className="find-products-list-pane">
              {filteredProducts.length === 0 ? (
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  {placedProducts.length === 0
                    ? "No products placed on shelves yet. Use Smart Generate or open a shelf planogram."
                    : "No products match this search."}
                </p>
              ) : (
                <ul className="find-products-list">
                  {filteredProducts.map((p) => (
                    <li key={p.productId}>
                      <button
                        type="button"
                        className={`find-products-list-btn${selectedProductId === p.productId ? " is-active" : ""}`}
                        onClick={() => setSelectedProductId(p.productId)}
                      >
                        <span className="find-products-list-name">{p.productName}</span>
                        <span className="muted mono find-products-list-count">
                          {p.placementCount} loc{p.placementCount === 1 ? "" : "s"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="find-products-detail-pane">
              {!selectedProductId ? (
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  Select a product to see shelf number, level, and position.
                </p>
              ) : selectedProductPlacements.length === 0 ? (
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  No placements found.
                </p>
              ) : (
                <>
                  <div className="find-products-detail-head">
                    <strong>{selectedProductPlacements[0].productName}</strong>
                    <span className="muted">
                      {selectedProductPlacements.length} location
                      {selectedProductPlacements.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="find-products-locations">
                    {selectedProductPlacements.map((row) => (
                      <li key={row.id} className="find-products-location">
                        <div className="find-products-location-main">
                          <span className="mono find-products-shelf">{row.shelfLabel}</span>
                          <span className="find-products-level">{row.levelLabel}</span>
                          <span className="find-products-pos">{row.positionLabel}</span>
                          {row.facings != null ? (
                            <span className="muted mono">×{row.facings}</span>
                          ) : null}
                        </div>
                        {onLocateShelf ? (
                          <button
                            type="button"
                            className="btn-secondary find-products-locate"
                            onClick={() => {
                              onLocateShelf(row.shelfId);
                              onClose?.();
                            }}
                          >
                            Show
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        ) : null}

        {tab === "category" ? (
          <div className="find-products-body">
            <div className="find-products-list-pane">
              {filteredCategories.length === 0 ? (
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  No categories with placements.
                </p>
              ) : (
                <ul className="find-products-list">
                  {filteredCategories.map((g) => (
                    <li key={g.categoryId}>
                      <button
                        type="button"
                        className={`find-products-list-btn${selectedCategoryId === g.categoryId ? " is-active" : ""}`}
                        onClick={() => setSelectedCategoryId(g.categoryId)}
                      >
                        <span className="find-products-list-name">{g.categoryName}</span>
                        <span className="muted mono find-products-list-count">
                          {g.shelfCount} shelf{g.shelfCount === 1 ? "" : "s"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="find-products-detail-pane">
              {!selectedCategory ? (
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  Select a category to see where its products are placed.
                </p>
              ) : (
                <>
                  <div className="find-products-detail-head">
                    <strong>{selectedCategory.categoryName}</strong>
                    <span className="muted">
                      {selectedCategory.placements.length} placement
                      {selectedCategory.placements.length === 1 ? "" : "s"} · {selectedCategory.shelfCount}{" "}
                      shelf{selectedCategory.shelfCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="find-products-locations">
                    {selectedCategory.placements.map((row) => (
                      <li key={row.id} className="find-products-location">
                        <div className="find-products-location-main">
                          <span className="find-products-prod-name">{row.productName}</span>
                          <span className="mono find-products-shelf">{row.shelfLabel}</span>
                          <span className="find-products-level">{row.levelLabel}</span>
                          <span className="find-products-pos">{row.positionLabel}</span>
                        </div>
                        {onLocateShelf ? (
                          <button
                            type="button"
                            className="btn-secondary find-products-locate"
                            onClick={() => {
                              onLocateShelf(row.shelfId);
                              onClose?.();
                            }}
                          >
                            Show
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        ) : null}

        {tab === "missing" ? (
          <MissingProductsPanel
            coverage={coverage}
            loading={loading}
            onRefresh={onRefresh}
            categories={categories}
            alwaysShow
            embedded
            maxProductsPerCategory={null}
          />
        ) : null}

        <div className="modal-actions">
          {tab === "missing" && onRefresh ? (
            <button type="button" className="btn-secondary" onClick={onRefresh} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          ) : null}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
