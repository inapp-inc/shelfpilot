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
import ShopperFloorMap from "../shopper/ShopperFloorMap.jsx";
import ShopperLayoutPlanMap from "../shopper/ShopperLayoutPlanMap.jsx";
import ShopperShelfGuide from "../shopper/ShopperShelfGuide.jsx";
import ShopperStorePicker from "../shopper/ShopperStorePicker.jsx";
import ShopperStoreSwitcher from "../shopper/ShopperStoreSwitcher.jsx";
import { mapHighlightShelfId } from "../shopper/shopperKioskHelpers.js";
import { readPinnedStoreId } from "../shopper/shopperStorePin.js";
import {
  computeShopperRoute,
  resolveShopperEntry,
  routeLengthMeters,
} from "../shopper/shopperWayfinding.js";
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

function useClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function MapViewToggle({ mode, onChange }) {
  return (
    <div className="sp-kiosk-map-toggle" role="tablist" aria-label="Map style">
      {[
        { id: "simple", label: "Simple map" },
        { id: "plan", label: "Store plan" },
      ].map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          className={`sp-kiosk-map-toggle-btn${mode === opt.id ? " is-active" : ""}`}
          aria-selected={mode === opt.id}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
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
                      <span className="sp-kiosk-tile-spots">{p.placementCount} spots</span>
                    ) : null}
                    {p.aisleLabel ? (
                      <span className="sp-kiosk-tile-aisle">Aisle {p.aisleLabel}</span>
                    ) : null}
                    {p.shelfLabel ? <span className="sp-kiosk-tile-shelf mono">{p.shelfLabel}</span> : null}
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

function MapLegend() {
  return (
    <div className="sp-kiosk-map-legend-inline">
      <span><i className="sp-kiosk-legend-dot sp-kiosk-legend-dot--here" />Entrance</span>
      <span><i className="sp-kiosk-legend-line" />Walk this line</span>
      <span><i className="sp-kiosk-legend-dot sp-kiosk-legend-dot--product" />Your product</span>
    </div>
  );
}

function SelectionContextBar({
  product,
  placement,
  bayLabel,
  walkMeters,
  hasRoute,
  productPlacements,
  layout,
  products,
  onSelectPlacement,
  onClear,
}) {
  const facts = [
    placement.aisleLabel ? { label: "Aisle", value: placement.aisleLabel } : null,
    bayLabel ? { label: "Bay", value: bayLabel } : null,
    placement.levelLabel ? { label: "Level", value: placement.levelLabel } : null,
    placement.positionLabel ? { label: "Pos", value: placement.positionLabel } : null,
    hasRoute ? { label: "Walk", value: `~${walkMeters} meters` } : null,
  ].filter(Boolean);

  return (
    <div className="sp-kiosk-selection-bar" aria-label="Selected product">
      <ProductThumb product={product} size={36} />
      <div className="sp-kiosk-selection-main">
        <div className="sp-kiosk-selection-name">{placement.productName}</div>
        <div className="sp-kiosk-selection-hint">
          Follow the <b>blue line</b> from the entrance
          {hasRoute ? ` · ~${walkMeters} meters` : ""}
        </div>
      </div>
      <div className="sp-kiosk-selection-facts">
        {facts.map((fact) => (
          <span key={fact.label} className="sp-kiosk-selection-fact">
            <span className="sp-kiosk-selection-fact-label">{fact.label}</span>
            <span className="sp-kiosk-selection-fact-val mono">{fact.value}</span>
          </span>
        ))}
      </div>
      {productPlacements.length > 1 ? (
        <div className="sp-kiosk-loc-tabs sp-kiosk-loc-tabs--inline">
          {productPlacements.map((row, idx) => (
            <button
              key={row.id}
              type="button"
              className={`sp-kiosk-loc-tab${row.id === placement.id ? " is-active" : ""}`}
              onClick={() => onSelectPlacement(row.id)}
            >
              Spot {idx + 1}
            </button>
          ))}
        </div>
      ) : null}
      <div className="sp-kiosk-selection-shelf">
        <ShopperShelfGuide
          layout={layout}
          placement={placement}
          product={product}
          products={products}
          aisleLabel={placement.aisleLabel}
          shelfLabel={bayLabel}
          className="sp-kiosk-shelf-guide--compact"
        />
      </div>
      <button type="button" className="sp-kiosk-selection-clear btn-secondary" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}

/** Shelf Finder kiosk — header search, store picker, full-width map. */
export default function ShopperKioskPage({ layoutId, session = null, onSignOut }) {
  const { navigate } = useAppRoute();
  const [meta, setMeta] = useState(null);
  const [stores, setStores] = useState([]);
  const [activeLayoutId, setActiveLayoutId] = useState(null);
  const [mapViewMode, setMapViewMode] = useState("simple");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [layout, setLayout] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [kioskLoading, setKioskLoading] = useState(true);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState(null);
  const searchInputRef = useRef(null);
  const clock = useClock();

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
    setSelectedPlacementId(null);
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

  const activePlacement = useMemo(() => {
    if (!productPlacements.length) return null;
    return productPlacements.find((p) => p.id === selectedPlacementId) || productPlacements[0];
  }, [productPlacements, selectedPlacementId]);

  const selectedProduct = selectedProductId ? productById.get(selectedProductId) : null;
  const hasSelection = Boolean(activePlacement);

  const shelfShortLabel = useMemo(() => {
    const label = activePlacement?.shelfLabel;
    if (!label) return null;
    return label.replace(/\s·\sFace\s[AB]$/, "") || label;
  }, [activePlacement?.shelfLabel]);

  const entryPoint = useMemo(
    () => (layout ? resolveShopperEntry(layout, meta?.entryPoint) : null),
    [layout, meta?.entryPoint]
  );

  const mapHighlightId = useMemo(() => {
    if (!layout || !activePlacement?.shelfId) return null;
    return mapHighlightShelfId(layout, activePlacement.shelfId);
  }, [layout, activePlacement?.shelfId]);

  const route = useMemo(() => {
    if (!layout || !activePlacement) return [];
    return computeShopperRoute(layout, entryPoint, activePlacement.shelfId);
  }, [layout, entryPoint, activePlacement]);

  const walkMeters = useMemo(() => Math.max(1, Math.round(routeLengthMeters(route))), [route]);

  function selectProduct(productId) {
    setSelectedProductId(productId);
    setSelectedPlacementId(null);
    setQuery(inStoreProducts.find((p) => p.productId === productId)?.productName || "");
  }

  function clearSelection() {
    setSelectedProductId(null);
    setSelectedPlacementId(null);
    setQuery("");
    searchInputRef.current?.focus();
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
    <div className={`sp-kiosk sp-kiosk--map-first${hasSelection ? " sp-kiosk--guided" : ""}`} data-testid="shopper-kiosk">
      <header className="sp-kiosk-topbar sp-kiosk-topbar--map-first">
        <div className="sp-kiosk-topbar-row sp-kiosk-topbar-row--primary">
          <div className="sp-kiosk-brand">
            <LogoMark />
            <div>
              <h1>
                Shelf<b>Pilot</b> · Shelf Finder
              </h1>
            </div>
          </div>
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
          <div className="sp-kiosk-clock mono">{clock || "--:--"}</div>
          {onSignOut ? (
            <button type="button" className="sp-kiosk-sign-out btn-secondary" onClick={onSignOut}>
              Sign out
            </button>
          ) : null}
        </div>
      </header>

      {hasSelection ? (
        <SelectionContextBar
          product={selectedProduct}
          placement={activePlacement}
          bayLabel={shelfShortLabel}
          walkMeters={walkMeters}
          hasRoute={route.length >= 2}
          productPlacements={productPlacements}
          layout={layout}
          products={products}
          onSelectPlacement={setSelectedPlacementId}
          onClear={clearSelection}
        />
      ) : null}

      <div className="sp-kiosk-main sp-kiosk-main--map">
        <section className="sp-kiosk-card sp-kiosk-mapcol" aria-label="Store map">
          <div className="sp-kiosk-card-head sp-kiosk-card-head--map">
            <h2>{hasSelection ? "Follow the blue line" : "Store map"}</h2>
            <div className="sp-kiosk-card-head-actions">
              <MapViewToggle mode={mapViewMode} onChange={setMapViewMode} />
              <MapLegend />
            </div>
          </div>

          <div
            className={`sp-kiosk-mapwrap${hasSelection ? " sp-kiosk-mapwrap--routed" : ""}${loading ? " sp-kiosk-mapwrap--loading" : ""}`}
            data-testid="shopper-mapwrap"
          >
            {layout ? (
              mapViewMode === "plan" ? (
                <ShopperLayoutPlanMap
                  layout={layout}
                  entryPoint={entryPoint}
                  route={route}
                  highlightShelfId={activePlacement?.shelfId || null}
                  highlightMapUnitId={mapHighlightId}
                  highlightAisleId={activePlacement?.aisleId || null}
                  categories={categories}
                  className="sp-kiosk-floor-map"
                />
              ) : (
                <ShopperFloorMap
                  layout={layout}
                  entryPoint={entryPoint}
                  route={route}
                  highlightShelfId={activePlacement?.shelfId || null}
                  highlightMapUnitId={mapHighlightId}
                  highlightAisleId={activePlacement?.aisleId || null}
                  categories={categories}
                  products={products}
                  className="sp-kiosk-floor-map"
                />
              )
            ) : loading ? (
              <LoadingState label="Loading floor plan…" />
            ) : null}
          </div>

          {!hasSelection ? (
            <div className="sp-kiosk-dock is-empty" aria-live="polite">
              <p>Search for a product above — we will draw a line from the entrance to that shelf.</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
