import { useEffect, useMemo, useRef, useState } from "react";
import { pathForModule } from "../routes.js";
import { publicApi } from "../publicApi.js";
import {
  collectLayoutPlacements,
  uniquePlacedProducts,
} from "../layout-editor/placementIndex.js";
import ShopperFloorMap from "../shopper/ShopperFloorMap.jsx";
import { computeShopperRoute, shelfApproachPoint } from "../shopper/shopperWayfinding.js";
import { productImageUrl } from "../productCatalog.js";

function LogoMark() {
  return (
    <div className="logo-mark sm">
      <div className="shelf-bars">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ProductThumb({ product, size = 40, className = "" }) {
  const url = productImageUrl(product);
  if (!url) {
    return (
      <span className={`shopper-product-thumb shopper-product-thumb--empty ${className}`.trim()} style={{ width: size, height: size }} aria-hidden>
        ?
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      className={`shopper-product-thumb ${className}`.trim()}
      width={size}
      height={size}
      loading="lazy"
    />
  );
}

/** Public kiosk — simple product finder for in-store customers. */
export default function ShopperKioskPage({ layoutId }) {
  const [meta, setMeta] = useState(null);
  const [layout, setLayout] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null);

  const shopBase = `/shop/${encodeURIComponent(layoutId)}`;

  const shopUrl = useMemo(() => {
    if (typeof window === "undefined") return pathForModule("shop", layoutId);
    return `${window.location.origin}${pathForModule("shop", layoutId)}`;
  }, [layoutId]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      publicApi(`${shopBase}/experience`),
      publicApi(`${shopBase}/layout`),
      publicApi(`${shopBase}/products`),
    ])
      .then(([exp, layoutRes, prodRes]) => {
        if (cancelled) return;
        if (!exp.enabled) {
          setMeta({ enabled: false });
          setLayout(null);
          return;
        }
        setMeta(exp);
        setLayout(layoutRes.layout);
        setProducts(prodRes.items || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Could not load store");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shopBase]);

  useEffect(() => {
    function onDocClick(e) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const placements = useMemo(
    () => (layout ? collectLayoutPlacements(layout, products, []) : []),
    [layout, products]
  );

  const placedProducts = useMemo(() => uniquePlacedProducts(placements), [placements]);

  const searchableProducts = useMemo(() => {
    const byId = new Map(placedProducts.map((p) => [p.productId, p]));
    return products
      .map((p) => {
        const placed = byId.get(p.id);
        return {
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          placementCount: placed?.placementCount || 0,
          imageUrl: productImageUrl(p),
          product: p,
        };
      })
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [products, placedProducts]);

  const inStoreProducts = useMemo(
    () => searchableProducts.filter((p) => p.placementCount > 0),
    [searchableProducts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inStoreProducts;
    return searchableProducts.filter(
      (p) =>
        p.placementCount > 0 &&
        (p.productName.toLowerCase().includes(q) ||
          String(p.sku || "").toLowerCase().includes(q))
    );
  }, [searchableProducts, inStoreProducts, query]);

  const productPlacements = useMemo(() => {
    if (!selectedProductId) return [];
    return placements.filter((p) => p.productId === selectedProductId);
  }, [placements, selectedProductId]);

  const activePlacement = useMemo(() => {
    if (!productPlacements.length) return null;
    return productPlacements.find((p) => p.id === selectedPlacementId) || productPlacements[0];
  }, [productPlacements, selectedPlacementId]);

  const selectedProduct = selectedProductId ? productById.get(selectedProductId) : null;
  const guidedMode = Boolean(activePlacement);

  const entryPoint = meta?.entryPoint || null;

  const route = useMemo(() => {
    if (!layout || !entryPoint || !activePlacement) return [];
    return computeShopperRoute(layout, entryPoint, activePlacement.shelfId);
  }, [layout, entryPoint, activePlacement]);

  const shelfGuide = useMemo(() => {
    if (!layout || !activePlacement?.shelfId || route.length < 1) return null;
    const shelf = (layout.shelves || []).find((s) => s.id === activePlacement.shelfId);
    if (!shelf) return null;
    const aisleNear = route.length >= 2 ? route[route.length - 2] : route[0];
    return shelfApproachPoint(shelf, layout, aisleNear);
  }, [layout, activePlacement?.shelfId, route]);

  function selectProduct(productId, productName) {
    setSelectedProductId(productId);
    setSelectedPlacementId(null);
    setQuery(productName);
    setSuggestOpen(false);
  }

  function clearSelection() {
    setSelectedProductId(null);
    setSelectedPlacementId(null);
    setQuery("");
    setSuggestOpen(false);
    searchInputRef.current?.focus();
  }

  if (loading) {
    return (
      <div className="shopper-kiosk shopper-kiosk--loading">
        <LogoMark />
        <p className="shopper-kiosk-loading-text">Loading store map…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shopper-kiosk shopper-kiosk--error">
        <p>{error}</p>
      </div>
    );
  }

  if (!meta?.enabled) {
    return (
      <div className="shopper-kiosk shopper-kiosk--disabled">
        <LogoMark />
        <h1>Product finder</h1>
        <p className="muted">Not available yet. Please ask a store associate for help.</p>
      </div>
    );
  }

  return (
    <div
      className={`shopper-kiosk${guidedMode ? " shopper-kiosk--guided" : " shopper-kiosk--browse"}`}
      data-testid="shopper-kiosk"
    >
      <header className="shopper-kiosk-header">
        <div className="shopper-kiosk-brand">
          <LogoMark />
          <div>
            <h1 className="shopper-kiosk-title">{meta.displayName}</h1>
            <p className="shopper-kiosk-sub">
              {guidedMode ? "Follow the path on the map" : "Tap a product to see where it is"}
            </p>
          </div>
        </div>
        {guidedMode ? (
          <button type="button" className="shopper-kiosk-start-over" onClick={clearSelection}>
            Find another product
          </button>
        ) : null}
      </header>

      {!guidedMode ? (
        <section className="shopper-kiosk-welcome" aria-label="How to use">
          <h2 className="shopper-kiosk-welcome-title">Find any product in 3 steps</h2>
          <ol className="shopper-kiosk-welcome-steps">
            <li>
              <span className="shopper-kiosk-welcome-num">1</span>
              <span>Tap your product below</span>
            </li>
            <li>
              <span className="shopper-kiosk-welcome-num">2</span>
              <span>Follow the orange path on the map</span>
            </li>
            <li>
              <span className="shopper-kiosk-welcome-num">3</span>
              <span>Stop at the red pin on the shelf</span>
            </li>
          </ol>
        </section>
      ) : null}

      {!guidedMode ? (
        <div className="shopper-kiosk-search" ref={searchWrapRef}>
          <label className="shopper-kiosk-search-label" htmlFor="shopper-search-input">
            Search by name
          </label>
          <div className="shopper-kiosk-search-row">
            <input
              id="shopper-search-input"
              ref={searchInputRef}
              type="search"
              className="shopper-kiosk-search-input"
              placeholder="Type product name…"
              value={query}
              onFocus={() => setSuggestOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setSuggestOpen(true);
                if (!e.target.value.trim()) {
                  setSelectedProductId(null);
                  setSelectedPlacementId(null);
                }
              }}
              data-testid="shopper-search"
              autoComplete="off"
            />
          </div>

          {suggestOpen && filtered.length > 0 && query.trim() ? (
            <ul className="shopper-kiosk-suggest">
              {filtered.slice(0, 8).map((p) => (
                <li key={p.productId}>
                  <button
                    type="button"
                    className="shopper-kiosk-suggest-btn"
                    onClick={() => selectProduct(p.productId, p.productName)}
                  >
                    <ProductThumb product={p.product} size={48} />
                    <span className="shopper-kiosk-suggest-text">
                      <span>{p.productName}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="shopper-kiosk-product-grid-wrap">
            <h2 className="shopper-kiosk-grid-title">
              {query.trim() ? `Results (${filtered.length})` : `Products in this store (${inStoreProducts.length})`}
            </h2>
            {filtered.length === 0 ? (
              <p className="shopper-kiosk-grid-empty muted">
                {query.trim() ? "No matching products found. Try a different name." : "No products on shelves yet."}
              </p>
            ) : (
              <div className="shopper-kiosk-product-grid">
                {filtered.slice(0, 60).map((p) => (
                  <button
                    key={p.productId}
                    type="button"
                    className="shopper-kiosk-product-tile"
                    onClick={() => selectProduct(p.productId, p.productName)}
                  >
                    <ProductThumb product={p.product} size={72} className="shopper-kiosk-product-tile-img" />
                    <span className="shopper-kiosk-product-tile-name">{p.productName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {guidedMode ? (
        <div className="shopper-kiosk-guided shopper-kiosk-guided--way">
          <div className="shopper-kiosk-way-bar">
            {selectedProduct ? <ProductThumb product={selectedProduct} size={56} /> : null}
            <div className="shopper-kiosk-way-bar-text">
              <strong>{activePlacement.productName}</strong>
              <span className="shopper-kiosk-way-bar-dest mono">
                {activePlacement.aisleLabel ? `Aisle ${activePlacement.aisleLabel}` : ""}
                {activePlacement.aisleLabel && activePlacement.shelfLabel ? " · " : ""}
                Shelf {activePlacement.shelfLabel}
              </span>
            </div>
            {productPlacements.length > 1 ? (
              <div className="shopper-kiosk-loc-tabs">
                {productPlacements.map((row, idx) => (
                  <button
                    key={row.id}
                    type="button"
                    className={`shopper-kiosk-loc-tab${row.id === activePlacement.id ? " is-active" : ""}`}
                    onClick={() => setSelectedPlacementId(row.id)}
                  >
                    Spot {idx + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="shopper-kiosk-map-wrap shopper-kiosk-map-wrap--way">
            {layout ? (
              <>
                <p className="shopper-kiosk-map-caption">Store map — follow the orange path · red pin = your product</p>
                <ShopperFloorMap
                  layout={layout}
                  entryPoint={entryPoint}
                  route={route}
                  markerPoint={shelfGuide?.marker || null}
                  highlightShelfId={activePlacement.shelfId}
                  highlightAisleId={activePlacement.aisleId || null}
                />
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {!guidedMode && selectedProductId && !activePlacement ? (
        <div className="shopper-kiosk-not-placed-banner">
          <ProductThumb product={selectedProduct} size={56} />
          <div>
            <strong>{selectedProduct?.name}</strong>
            <p className="muted">Not on a shelf here. Pick another product or ask staff.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={clearSelection}>
            Back
          </button>
        </div>
      ) : null}

      {!guidedMode ? (
        <footer className="shopper-kiosk-footer muted">
          <span>Need help? Ask a store associate.</span>
          <span className="shopper-kiosk-footer-qr">
            Phone map:
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&margin=4&data=${encodeURIComponent(shopUrl)}`}
              width={48}
              height={48}
              alt="QR code"
            />
          </span>
        </footer>
      ) : null}
    </div>
  );
}
