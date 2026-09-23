import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { categoryLabel } from "../catalog/buildCategoryTree.js";
import LoadingState from "../components/LoadingState.jsx";
import {
  collectLayoutPlacements,
  uniquePlacedProducts,
} from "../layout-editor/placementIndex.js";
import { pathForModule } from "../routes.js";
import { useAppRoute } from "../useAppRoute.js";
import ShopperLayoutPlanMap from "../shopper/ShopperLayoutPlanMap.jsx";
import ShopperShelfGuide from "../shopper/ShopperShelfGuide.jsx";
import ShopperStorePicker from "../shopper/ShopperStorePicker.jsx";
import ShopperStoreSwitcher from "../shopper/ShopperStoreSwitcher.jsx";
import {
  buildShelfMarkersForPlacements,
  highlightShelfIdsForPlacements,
  mapHighlightShelfId,
  placementSpotLabel,
} from "../shopper/shopperKioskHelpers.js";
import { readPinnedStoreId } from "../shopper/shopperStorePin.js";
import { computeShopperRoute, resolveShopperEntry } from "../shopper/shopperWayfinding.js";
import { productImageUrl } from "../productCatalog.js";

function LogoMark() {
  return (
    <div className="sp-kiosk-logo" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.6" fill="#fff" />
        <rect x="14" y="3" width="7" height="7" rx="1.6" fill="#fff" opacity="0.85" />
        <rect x="3" y="14" width="7" height="7" rx="1.6" fill="#fff" opacity="0.85" />
        <rect x="14" y="14" width="7" height="7" rx="1.6" fill="#fff" />
      </svg>
    </div>
  );
}

function KioskStatusShell({ title, children, onSignOut }) {
  return (
    <div className="sp-kiosk sp-kiosk--status sp-kiosk--status-shell">
      <header className="sp-kiosk-topbar sp-kiosk-topbar--status">
        <div className="sp-kiosk-brand">
          <LogoMark />
          <div>
            <h1>
              Shelf<b>Pilot</b> · Shelf Finder
            </h1>
          </div>
        </div>
        <div className="sp-kiosk-topbar-spacer" />
        {onSignOut ? (
          <button type="button" className="sp-kiosk-sign-out btn-secondary" onClick={onSignOut}>
            Sign out
          </button>
        ) : null}
      </header>
      <div className="sp-kiosk-status-body">
        {title ? <h2 className="sp-kiosk-status-title">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}

function ProductThumb({ product, size = 52, className = "" }) {
  const url = productImageUrl(product);
  if (!url) {
    return (
      <span
        className={`sp-kiosk-thumb sp-kiosk-thumb--empty ${className}`.trim()}
        style={{ width: size, height: size }}
        aria-hidden
      >
        ?
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      className={`sp-kiosk-thumb ${className}`.trim()}
      width={size}
      height={size}
      loading="lazy"
    />
  );
}

function HeaderProductSearch({
  searchInputRef,
  query,
  onQueryChange,
  onClearQuery,
  items,
  selectedProductId,
  onSelectProduct,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const showDropdown = open && (query.trim() || items.length > 0);

  useEffect(() => {
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div className="sp-kiosk-header-search" ref={rootRef}>
      <div className="sp-kiosk-search sp-kiosk-search--header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          ref={searchInputRef}
          id="shopper-search-input"
          type="search"
          inputMode="search"
          placeholder="Search products — rice, shampoo, apples…"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          data-testid="shopper-search"
          autoComplete="off"
          aria-label="Search products"
          aria-expanded={showDropdown}
          aria-controls="shopper-search-results"
        />
        {query ? (
          <button
            type="button"
            className="sp-kiosk-search-clear"
            aria-label="Clear search"
            onClick={() => {
              onClearQuery();
              setOpen(false);
            }}
          >
            ×
          </button>
        ) : null}
      </div>
      {showDropdown ? (
        <div
          id="shopper-search-results"
          className="sp-kiosk-search-dropdown"
          role="listbox"
          aria-label="Search results"
        >
          {items.length === 0 ? (
            <p className="sp-kiosk-results-empty">
              {query.trim()
                ? `No products match “${query.trim()}”.`
                : "No products on shelves yet."}
            </p>
          ) : (
            items.slice(0, 24).map((p) => (
              <button
                key={p.productId}
                type="button"
                role="option"
                className="sp-kiosk-tile sp-kiosk-tile--dropdown"
                aria-selected={p.productId === selectedProductId}
                onClick={() => {
                  onSelectProduct(p.productId);
                  setOpen(false);
                }}
              >
                <ProductThumb product={p.product} size={40} />
                <span className="sp-kiosk-tile-info">
                  <span className="sp-kiosk-tile-name">{p.productName}</span>
                  <span className="sp-kiosk-tile-row">
                    {p.placementCount > 1 ? (
                      <span className="sp-kiosk-tile-spots">{p.placementCount} locations</span>
                    ) : (
                      <>
                        {p.aisleLabel ? (
                          <span className="sp-kiosk-tile-aisle">Aisle {p.aisleLabel}</span>
                        ) : null}
                        {p.shelfLabel ? (
                          <span className="sp-kiosk-tile-shelf mono">{p.shelfLabel}</span>
                        ) : null}
                      </>
                    )}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function MapOverlayLegend({ multiSpot }) {
  return (
    <div className="sp-kiosk-map-legend-float" aria-label="Map legend">
      <span><i className="sp-kiosk-legend-dot sp-kiosk-legend-dot--here" />Entrance</span>
      <span><i className="sp-kiosk-legend-line sp-kiosk-legend-line--dotted" />Walk lines</span>
      <span>
        <i className="sp-kiosk-legend-dot sp-kiosk-legend-dot--product" />
        {multiSpot ? "Tap a number to highlight a shelf" : "Product"}
      </span>
    </div>
  );
}

function FloatingProductChip({ product, placementCount, onClear }) {
  return (
    <div className="sp-kiosk-map-float sp-kiosk-map-float--product" aria-label="Selected product">
      <ProductThumb product={product} size={32} />
      <div className="sp-kiosk-map-float-text">
        <div className="sp-kiosk-map-float-name">{product?.name || "Product"}</div>
        <div className="sp-kiosk-map-float-sub">
          {placementCount > 1
            ? `${placementCount} locations · dotted lines to each shelf`
            : "Follow the dotted line from entrance"}
        </div>
      </div>
      <button type="button" className="sp-kiosk-map-float-clear btn-secondary" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}

function FloatingShelfLevelPanel({ product, placement, spotLabel, bayLabel, layout, products, onClose }) {
  if (!placement) return null;
  return (
    <div className="sp-kiosk-map-float sp-kiosk-map-float--level" aria-label="Shelf level">
      <div className="sp-kiosk-map-float-level-head">
        <div>
          <div className="sp-kiosk-map-float-level-title">{spotLabel}</div>
          {placement.levelLabel ? (
            <div className="sp-kiosk-map-float-level-meta mono">Level {placement.levelLabel}</div>
          ) : null}
        </div>
        <button type="button" className="sp-kiosk-map-float-clear btn-secondary" onClick={onClose} aria-label="Close shelf detail">
          ×
        </button>
      </div>
      <ShopperShelfGuide
        layout={layout}
        placement={placement}
        product={product}
        products={products}
        aisleLabel={placement.aisleLabel}
        shelfLabel={bayLabel}
        className="sp-kiosk-shelf-guide--float"
      />
    </div>
  );
}

/** Shelf Finder kiosk — header search, store picker, full-width map. */
export default function ShopperKioskPage({ layoutId, session = null, onSignOut }) {
  const { navigate } = useAppRoute();
  const [meta, setMeta] = useState(null);
  const [stores, setStores] = useState([]);
  const [activeLayoutId, setActiveLayoutId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [layout, setLayout] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [kioskLoading, setKioskLoading] = useState(true);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [focusedPlacementId, setFocusedPlacementId] = useState(null);
  const searchInputRef = useRef(null);

  const token = session?.token || null;

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  useEffect(() => {
    let cancelled = false;
    setKioskLoading(true);
    setError("");
    setMeta(null);
    setStores([]);
    setActiveLayoutId(null);

    (async () => {
      try {
        if (!token) {
          setError("Sign in required");
          return;
        }
        const kiosk = await api(
          `/shopper/kiosk${layoutId ? `?layoutId=${encodeURIComponent(layoutId)}` : ""}`,
          { token }
        );
        if (cancelled) return;
        if (!kiosk.enabled) {
          setMeta({
            enabled: false,
            reason: kiosk.reason || "no_layout",
          });
          return;
        }
        const storeList = kiosk.stores || [];
        const pinned = readPinnedStoreId(session?.user?.id);
        const initialId =
          (layoutId && storeList.some((s) => s.id === layoutId) && layoutId) ||
          (pinned && storeList.some((s) => s.id === pinned) && pinned) ||
          kiosk.layoutId ||
          storeList[0]?.id ||
          null;
        setStores(storeList);
        setActiveLayoutId(initialId);
        setPickerOpen(storeList.length > 1 && !layoutId && !pinned);
        setMeta({
          enabled: true,
          displayName: kiosk.displayName || "Store",
          entryPoint: kiosk.entryPoint || null,
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e.message || "Could not load store";
        if (msg === "shopper_disabled" || msg === "forbidden") {
          setMeta({ enabled: false });
          setError("");
        } else {
          setError(msg);
        }
      } finally {
        if (!cancelled) setKioskLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [layoutId, token, session?.user?.id]);

  useEffect(() => {
    if (!activeLayoutId || activeLayoutId === layoutId) return;
    navigate(pathForModule("shop", activeLayoutId), { replace: true });
  }, [activeLayoutId, layoutId, navigate]);

  useEffect(() => {
    if (!activeLayoutId || !token || !meta?.enabled) return;
    let cancelled = false;
    setLayoutLoading(true);
    setLayout(null);
    setProducts([]);
    setCategories([]);
    setSelectedProductId(null);
    setFocusedPlacementId(null);
    setQuery("");

    (async () => {
      try {
        const layoutRes = await api(`/layouts/${encodeURIComponent(activeLayoutId)}?include=planograms`, {
          token,
        });
        if (cancelled) return;
        const vertical = layoutRes.vertical || "";
        const [prodRes, catRes] = await Promise.all([
          api(`/products${vertical ? `?vertical=${encodeURIComponent(vertical)}` : ""}`, { token }),
          api(`/categories${vertical ? `?vertical=${encodeURIComponent(vertical)}` : ""}`, { token }).catch(() => ({
            items: [],
          })),
        ]);
        if (cancelled) return;
        setLayout(layoutRes);
        setProducts(prodRes.items || []);
        setCategories(catRes.items || catRes.categories || []);
        setMeta((prev) => ({
          ...prev,
          displayName: layoutRes.name || prev?.displayName,
          layoutId: layoutRes.id,
        }));
      } catch (e) {
        if (cancelled) return;
        setError(e.message || "Could not load store layout");
      } finally {
        if (!cancelled) setLayoutLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeLayoutId, token, meta?.enabled]);

  const placements = useMemo(
    () => (layout ? collectLayoutPlacements(layout, products, categories) : []),
    [layout, products, categories]
  );

  const placedProducts = useMemo(() => uniquePlacedProducts(placements), [placements]);

  const productMeta = useMemo(() => {
    const byProduct = new Map();
    for (const row of placements) {
      if (!byProduct.has(row.productId)) {
        byProduct.set(row.productId, {
          aisleLabel: row.aisleLabel,
          shelfLabel: row.shelfLabel,
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          temperatureZone: row.temperatureZone,
        });
      }
    }
    return byProduct;
  }, [placements]);

  const inStoreProducts = useMemo(() => {
    const byId = new Map(placedProducts.map((p) => [p.productId, p]));
    const searchableProducts = products
      .map((p) => {
        const placed = byId.get(p.id);
        const metaRow = productMeta.get(p.id);
        return {
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          placementCount: placed?.placementCount || 0,
          imageUrl: productImageUrl(p),
          product: p,
          aisleLabel: metaRow?.aisleLabel || null,
          shelfLabel: metaRow?.shelfLabel || null,
          categoryId: p.categoryId || metaRow?.categoryId || null,
          categoryName: metaRow?.categoryName || categoryLabel(categories, p.categoryId) || null,
        };
      })
      .sort((a, b) => a.productName.localeCompare(b.productName));

    const fromCatalog = searchableProducts.filter((p) => p.placementCount > 0);
    if (fromCatalog.length) return fromCatalog;
    return placedProducts.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      sku: p.sku,
      placementCount: p.placementCount,
      imageUrl: productImageUrl(productById.get(p.productId)),
      product: productById.get(p.productId) || { id: p.productId, name: p.productName, sku: p.sku },
      aisleLabel: productMeta.get(p.productId)?.aisleLabel || null,
      shelfLabel: productMeta.get(p.productId)?.shelfLabel || null,
      categoryId: p.categoryId || productMeta.get(p.productId)?.categoryId || null,
      categoryName: p.categoryName || productMeta.get(p.productId)?.categoryName || null,
    }));
  }, [products, placedProducts, productMeta, categories, productById]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inStoreProducts.filter((p) => {
      if (!q) return true;
      return (
        p.productName.toLowerCase().includes(q) ||
        String(p.sku || "").toLowerCase().includes(q) ||
        String(p.aisleLabel || "").includes(q) ||
        String(p.shelfLabel || "").toLowerCase().includes(q)
      );
    });
  }, [inStoreProducts, query]);

  const productPlacements = useMemo(() => {
    if (!selectedProductId) return [];
    return placements.filter((p) => p.productId === selectedProductId);
  }, [placements, selectedProductId]);

  const entryPoint = useMemo(
    () => (layout ? resolveShopperEntry(layout, meta?.entryPoint) : null),
    [layout, meta?.entryPoint]
  );

  const selectedProduct = selectedProductId ? productById.get(selectedProductId) : null;
  const hasSelection = productPlacements.length > 0;

  const focusedPlacement = useMemo(() => {
    if (!productPlacements.length) return null;
    if (focusedPlacementId) {
      return productPlacements.find((p) => p.id === focusedPlacementId) || null;
    }
    if (productPlacements.length === 1) return productPlacements[0];
    return null;
  }, [productPlacements, focusedPlacementId]);

  const focusedSpotLabel = useMemo(() => {
    if (!focusedPlacement) return "";
    const idx = productPlacements.findIndex((p) => p.id === focusedPlacement.id);
    return placementSpotLabel(focusedPlacement, idx >= 0 ? idx : 0);
  }, [focusedPlacement, productPlacements]);

  const shelfShortLabel = useMemo(() => {
    const label = focusedPlacement?.shelfLabel;
    if (!label) return null;
    return label.replace(/\s·\sFace\s[AB]$/, "") || label;
  }, [focusedPlacement?.shelfLabel]);

  const mapHighlightId = useMemo(() => {
    if (!layout || !focusedPlacement?.shelfId) return null;
    return mapHighlightShelfId(layout, focusedPlacement.shelfId);
  }, [layout, focusedPlacement?.shelfId]);

  const highlightShelfIds = useMemo(
    () => (layout ? highlightShelfIdsForPlacements(layout, productPlacements) : []),
    [layout, productPlacements]
  );

  const productRoutes = useMemo(() => {
    if (!layout || !productPlacements.length) return [];
    return productPlacements.map((p) => ({
      placementId: p.id,
      shelfId: p.shelfId,
      route: computeShopperRoute(layout, entryPoint, p.shelfId),
    }));
  }, [layout, entryPoint, productPlacements]);

  /** Active spot: tapped number, or location 1 by default so the walk line is always visible. */
  const activePlacementId = useMemo(() => {
    if (!productPlacements.length) return null;
    if (focusedPlacementId) return focusedPlacementId;
    return productPlacements[0].id;
  }, [productPlacements, focusedPlacementId]);

  /** Every shelf that stocks the product gets a walk line; focused spot is drawn on top (first). */
  const routesForMap = useMemo(() => {
    if (!productRoutes.length) return [];
    if (productRoutes.length === 1) return productRoutes;
    const focusId = activePlacementId;
    if (!focusId) return productRoutes;
    const idx = productRoutes.findIndex((r) => r.placementId === focusId);
    if (idx <= 0) return productRoutes;
    const ordered = [...productRoutes];
    const [focused] = ordered.splice(idx, 1);
    ordered.unshift(focused);
    return ordered;
  }, [productRoutes, activePlacementId]);

  const guideRoute = useMemo(() => {
    if (!productRoutes.length) return [];
    if (focusedPlacementId) {
      return productRoutes.find((r) => r.placementId === focusedPlacementId)?.route || [];
    }
    if (productPlacements.length === 1) return productRoutes[0]?.route || [];
    return productRoutes[0]?.route || [];
  }, [productRoutes, focusedPlacementId, productPlacements.length]);

  const shelfMarkers = useMemo(() => {
    if (!layout || !productPlacements.length) return [];
    const primaryShelfId =
      focusedPlacement?.shelfId ||
      (productPlacements.length === 1 ? productPlacements[0].shelfId : null);
    return buildShelfMarkersForPlacements(layout, productPlacements, {
      primaryShelfId,
      route: guideRoute,
    });
  }, [layout, productPlacements, focusedPlacement?.shelfId, guideRoute]);

  const multiSpotSelection = productPlacements.length > 1;

  function selectProduct(productId) {
    setSelectedProductId(productId);
    setFocusedPlacementId(null);
    setQuery(inStoreProducts.find((p) => p.productId === productId)?.productName || "");
  }

  function clearSelection() {
    setSelectedProductId(null);
    setFocusedPlacementId(null);
    setQuery("");
    searchInputRef.current?.focus();
  }

  function handleSpotSelect(placementId) {
    setFocusedPlacementId(placementId);
  }

  function selectStore(nextId) {
    if (nextId === activeLayoutId) return;
    setActiveLayoutId(nextId);
    setPickerOpen(false);
  }

  const loading = kioskLoading || (meta?.enabled && layoutLoading && !layout);

  if (kioskLoading) {
    return (
      <KioskStatusShell onSignOut={onSignOut}>
        <LoadingState label="Loading store map…" size="lg" />
        <p className="sp-kiosk-muted">Fetching products and floor plan</p>
      </KioskStatusShell>
    );
  }

  if (error && !layout) {
    return (
      <KioskStatusShell title="Could not load store" onSignOut={onSignOut}>
        <p className="sp-kiosk-muted">{error}</p>
        <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </KioskStatusShell>
    );
  }

  if (!meta?.enabled) {
    const hint =
      meta?.reason === "no_layout"
        ? "No store is assigned to this account yet. Ask an administrator to assign a layout under Users & Roles."
        : "This kiosk is not available yet. Please ask a store associate for help.";
    return (
      <KioskStatusShell title="Shelf finder" onSignOut={onSignOut}>
        <p className="sp-kiosk-muted">{hint}</p>
      </KioskStatusShell>
    );
  }

  if (pickerOpen && stores.length > 1) {
    return (
      <ShopperStorePicker
        stores={stores}
        activeId={activeLayoutId}
        onSelect={selectStore}
        userName={session?.user?.name || ""}
      />
    );
  }

  return (
    <div
      className={`sp-kiosk sp-kiosk--map-first sp-kiosk--plan-max${hasSelection ? " sp-kiosk--guided" : ""}`}
      data-testid="shopper-kiosk"
    >
      <header className="sp-kiosk-topbar sp-kiosk-topbar--compact">
        <LogoMark />
        <h1 className="sp-kiosk-compact-title">
          Shelf<b>Pilot</b>
        </h1>
        <ShopperStoreSwitcher
          stores={stores}
          activeId={activeLayoutId}
          onSelect={selectStore}
          disabled={layoutLoading}
          userId={session?.user?.id}
          userName={session?.user?.name || ""}
        />
        <HeaderProductSearch
          searchInputRef={searchInputRef}
          query={query}
          onQueryChange={setQuery}
          onClearQuery={clearSelection}
          items={filtered}
          selectedProductId={selectedProductId}
          onSelectProduct={selectProduct}
        />
        {onSignOut ? (
          <button type="button" className="sp-kiosk-sign-out btn-secondary" onClick={onSignOut}>
            Sign out
          </button>
        ) : null}
      </header>

      <div className="sp-kiosk-main sp-kiosk-main--map">
        <section className="sp-kiosk-card sp-kiosk-mapcol sp-kiosk-mapcol--max" aria-label="Store plan">
          <div
            className={`sp-kiosk-mapwrap sp-kiosk-mapwrap--max${hasSelection ? " sp-kiosk-mapwrap--routed" : ""}${loading ? " sp-kiosk-mapwrap--loading" : ""}`}
            data-testid="shopper-mapwrap"
          >
            {layout ? (
              <>
                <ShopperLayoutPlanMap
                  layout={layout}
                  entryPoint={entryPoint}
                  routes={routesForMap}
                  focusedPlacementId={focusedPlacementId}
                  focusedRoutePlacementId={activePlacementId}
                  mapEntryPoint={meta?.entryPoint}
                  highlightShelfId={focusedPlacement?.shelfId || productPlacements[0]?.shelfId || null}
                  highlightMapUnitId={mapHighlightId}
                  highlightShelfIds={highlightShelfIds}
                  shelfMarkers={shelfMarkers}
                  onSpotSelect={handleSpotSelect}
                  categories={categories}
                  className="sp-kiosk-floor-map"
                />
                <MapOverlayLegend multiSpot={multiSpotSelection} />
                {hasSelection ? (
                  <FloatingProductChip
                    product={selectedProduct}
                    placementCount={productPlacements.length}
                    onClear={clearSelection}
                  />
                ) : null}
                {focusedPlacement ? (
                  <FloatingShelfLevelPanel
                    product={selectedProduct}
                    placement={focusedPlacement}
                    spotLabel={focusedSpotLabel}
                    bayLabel={shelfShortLabel}
                    layout={layout}
                    products={products}
                    onClose={() => setFocusedPlacementId(null)}
                  />
                ) : null}
              </>
            ) : loading ? (
              <LoadingState label="Loading floor plan…" />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
