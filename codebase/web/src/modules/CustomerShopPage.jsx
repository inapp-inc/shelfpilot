import { useMemo, useState } from "react";
import { VERTICALS, STATUS_META } from "../referenceCatalog.js";
import { STORE_TYPES } from "../storeTypes.js";
import {
  collectLayoutPlacements,
  uniquePlacedProducts,
} from "../layout-editor/placementIndex.js";

const DEMO_LAYOUT_MARKERS = ["Demo Hypermarket", "demo-generated"];

function isDemoReadyLayout(name) {
  const n = String(name || "").toLowerCase();
  return DEMO_LAYOUT_MARKERS.some((m) => n.includes(m.toLowerCase()));
}

/** Layouts a shopper may browse — approved stores plus demo layouts. */
export function customerBrowsableLayouts(layouts = []) {
  return layouts.filter((l) => l.status === "approved" || isDemoReadyLayout(l.name));
}

function groupLayoutsByStoreType(layouts) {
  const groups = new Map();
  for (const layout of layouts) {
    const storeType =
      STORE_TYPES.find((s) => s.vertical === layout.vertical) ||
      STORE_TYPES.find((s) => s.id === layout.vertical) ||
      null;
    const key = storeType?.id || layout.vertical || "other";
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        label: storeType?.label || VERTICALS[layout.vertical]?.label || layout.vertical || "Store",
        emoji: storeType?.emoji || "🏬",
        accent: storeType?.color || "#C4183A",
        layouts: [],
      });
    }
    groups.get(key).layouts.push(layout);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** FR-CUST-01 — store picker + full-screen product find / wayfinding. */
export default function CustomerShopPage({
  layouts = [],
  layout = null,
  categories = [],
  products = [],
  shopLayoutId,
  onOpenStore,
  onBackToStores,
}) {
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(null);

  const browsable = useMemo(() => customerBrowsableLayouts(layouts), [layouts]);
  const groupedStores = useMemo(() => groupLayoutsByStoreType(browsable), [browsable]);

  const placements = useMemo(
    () => (layout ? collectLayoutPlacements(layout, products, categories) : []),
    [layout, products, categories]
  );
  const placedProducts = useMemo(() => uniquePlacedProducts(placements), [placements]);

  const catalogProducts = useMemo(() => {
    if (!layout?.vertical) return placedProducts;
    const vertical = layout.vertical;
    const inVertical = (products || []).filter((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      return !cat?.vertical || cat.vertical === vertical;
    });
    const byId = new Map(placedProducts.map((p) => [p.productId, p]));
    return inVertical
      .map((p) => {
        const placed = byId.get(p.id);
        return (
          placed || {
            productId: p.id,
            productName: p.name || p.id,
            sku: p.sku || "",
            categoryId: p.categoryId,
            categoryName: "",
            placementCount: 0,
          }
        );
      })
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [layout?.vertical, products, categories, placedProducts]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogProducts;
    return catalogProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        String(p.sku || "").toLowerCase().includes(q)
    );
  }, [catalogProducts, query]);

  const selectedPlacements = useMemo(() => {
    if (!selectedProductId) return [];
    return placements.filter((p) => p.productId === selectedProductId);
  }, [placements, selectedProductId]);

  const activeStore = layout || browsable.find((l) => l.id === shopLayoutId) || null;
  const statusMeta = (s) => STATUS_META[s] || STATUS_META.draft;

  if (!shopLayoutId) {
    return (
      <section className="customer-shop-page fade" data-testid="customer-shop-stores">
        <header className="customer-shop-hero">
          <h1 className="customer-shop-title">Find products in store</h1>
          <p className="customer-shop-subtitle muted">
            Choose a store layout, then search the catalog for aisle and shelf directions.
          </p>
        </header>

        {!browsable.length ? (
          <div className="empty-box" data-testid="customer-shop-empty">
            <div style={{ fontSize: 15, fontWeight: 700 }}>No stores available yet</div>
            <p className="muted" style={{ fontSize: 13, margin: "8px 0 0" }}>
              Approved layouts will appear here for shoppers to browse.
            </p>
          </div>
        ) : (
          <div className="customer-groups">
            {groupedStores.map((group) => (
              <div key={group.id} className="customer-group">
                <div className="customer-group-head">
                  <span className="customer-group-emoji" aria-hidden>
                    {group.emoji}
                  </span>
                  <span>{group.label}</span>
                  <span className="customer-group-count mono">{group.layouts.length}</span>
                </div>
                <div className="customer-grid">
                  {group.layouts.map((l) => {
                    const st = statusMeta(l.status);
                    const demoReady = isDemoReadyLayout(l.name);
                    return (
                      <article
                        key={l.id}
                        className="customer-card"
                        style={{ "--customer-accent": group.accent }}
                        data-testid={`customer-store-${l.id}`}
                      >
                        <button
                          type="button"
                          className="customer-card-open"
                          onClick={() => onOpenStore?.(l)}
                        >
                          <div className="customer-card-header">
                            <span className="customer-card-emoji" aria-hidden>
                              {group.emoji}
                            </span>
                            <div className="customer-card-titles">
                              <div className="customer-card-name">{l.name}</div>
                              <div className="customer-card-type">{group.label}</div>
                            </div>
                            <span
                              className="customer-card-status"
                              style={{ background: st.bg, color: st.color }}
                            >
                              {demoReady ? "Demo" : st.label}
                            </span>
                          </div>
                          <div className="customer-floor-thumb customer-floor-thumb--placeholder" aria-hidden />
                          <div className="customer-card-meta">
                            {l.widthMeters != null && l.depthMeters != null ? (
                              <span className="mono">
                                {Number(l.widthMeters).toFixed(0)} × {Number(l.depthMeters).toFixed(0)} m
                              </span>
                            ) : null}
                            <span className="customer-card-updated">
                              Updated {l.updatedAt ? String(l.updatedAt).slice(0, 10) : "—"}
                            </span>
                          </div>
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="customer-shop-page customer-shop-page--find fade" data-testid="customer-shop-find">
      <header className="customer-shop-find-head">
        <button type="button" className="btn-secondary customer-shop-back" onClick={onBackToStores}>
          ← Stores
        </button>
        <div className="customer-shop-find-title-wrap">
          <h1 className="customer-shop-find-title">{activeStore?.name || "Store"}</h1>
          <p className="muted customer-shop-find-meta">
            {placements.length} product location{placements.length === 1 ? "" : "s"} on shelves
          </p>
        </div>
      </header>

      <div className="customer-find-panel">
        <div className="find-products-search customer-find-search">
          <input
            type="search"
            className="find-products-search-input"
            placeholder="Search products by name or SKU…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            data-testid="customer-find-search"
          />
          <span className="muted find-products-search-meta">
            {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="find-products-body customer-find-body">
          <div className="find-products-list-pane">
            {filteredProducts.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                {catalogProducts.length === 0
                  ? "No products in this store catalog yet."
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
                        {p.placementCount > 0
                          ? `${p.placementCount} loc${p.placementCount === 1 ? "" : "s"}`
                          : "Not on shelf"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="find-products-detail-pane customer-find-detail">
            {!selectedProductId ? (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Select a product to see aisle, shelf, level, and position.
              </p>
            ) : selectedPlacements.length === 0 ? (
              <div className="customer-find-not-placed">
                <strong>{catalogProducts.find((p) => p.productId === selectedProductId)?.productName}</strong>
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
                  This product is not on any shelf in this store yet.
                </p>
              </div>
            ) : (
              <>
                <div className="find-products-detail-head">
                  <strong>{selectedPlacements[0].productName}</strong>
                  <span className="muted">
                    {selectedPlacements.length} location{selectedPlacements.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="find-products-locations">
                  {selectedPlacements.map((row) => (
                    <li key={row.id} className="find-products-location customer-find-location">
                      <div className="customer-find-directions">
                        <span className="customer-find-directions-label">Directions</span>
                        <p className="customer-find-directions-text">{row.directionsText || row.locationText}</p>
                      </div>
                      <div className="find-products-location-main customer-find-location-chips">
                        {row.aisleLabel ? (
                          <span className="mono customer-find-chip customer-find-chip--aisle">
                            Aisle {row.aisleLabel}
                          </span>
                        ) : null}
                        <span className="mono find-products-shelf">{row.shelfLabel}</span>
                        <span className="find-products-level">{row.levelLabel}</span>
                        <span className="find-products-pos">{row.positionLabel}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
