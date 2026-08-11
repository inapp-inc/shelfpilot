import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildMissingCategoryTree,
  findTreeNode,
  flattenSubcategoryOptions,
  groupMissingByCategory,
} from "./missingProductCategories.js";
import { categoryLabel } from "../catalog/buildCategoryTree.js";
import { resolveCategoryId } from "./categoryFilter.js";
import { MISSING_PRODUCT_MIME, serializeMissingProduct } from "./missingProductDrag.js";

function MissingProductRow({
  product,
  isSidebar,
  draggable,
  editDisabled,
  onProductDragStart,
  onProductDragEnd,
}) {
  return (
    <li
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
        e.dataTransfer.setData(MISSING_PRODUCT_MIME, serializeMissingProduct(product));
        e.dataTransfer.effectAllowed = "copy";
        const ghost = document.createElement("div");
        ghost.className = "missing-product-drag-ghost";
        ghost.textContent = product.name || product.sku || product.id;
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 12, 12);
        requestAnimationFrame(() => ghost.remove());
        onProductDragStart?.(product);
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
            <span className="missing-product-name">{product.name || product.sku || product.id}</span>
            {product.sku ? <span className="missing-product-sku mono">{product.sku}</span> : null}
          </span>
        </>
      ) : (
        <>
          <span>{product.name || product.sku || product.id}</span>
          {product.sku ? (
            <span className="muted mono" style={{ fontSize: 11 }}>
              {product.sku}
            </span>
          ) : null}
        </>
      )}
    </li>
  );
}

function MissingCategoryNode({
  node,
  depth,
  expandedIds,
  onToggle,
  isSidebar,
  embedded,
  maxProductsPerCategory,
  draggable,
  editDisabled,
  onProductDragStart,
  onProductDragEnd,
}) {
  const isExpanded = expandedIds.has(node.categoryId);
  const hasChildren = node.children?.length > 0;
  const hasProducts = node.products?.length > 0;
  const canToggle = hasChildren || hasProducts;
  const visibleProducts =
    maxProductsPerCategory != null ? node.products.slice(0, maxProductsPerCategory) : node.products;

  return (
    <div
      className={[
        "missing-category-block",
        isSidebar ? "missing-category-block--sidebar" : "",
        depth > 0 ? "missing-category-block--nested" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className={`missing-category-head missing-category-head--toggle${isExpanded ? " is-expanded" : ""}`}
        onClick={() => canToggle && onToggle(node.categoryId)}
        aria-expanded={canToggle ? isExpanded : undefined}
        disabled={!canToggle}
        title={canToggle ? (isExpanded ? "Collapse subcategory" : "Expand subcategory") : undefined}
      >
        <span className="missing-category-chevron" aria-hidden>
          {canToggle ? (isExpanded ? "▾" : "▸") : "·"}
        </span>
        <span className="missing-category-name">{node.categoryName}</span>
        <span className="missing-category-count mono">{node.totalCount}</span>
      </button>

      {isExpanded ? (
        <div className="missing-category-body">
          {hasProducts ? (
            <ul
              className={`missing-products-list${embedded ? " missing-products-list--dialog" : ""}${isSidebar ? " missing-products-list--sidebar" : ""}`}
            >
              {visibleProducts.map((p) => (
                <MissingProductRow
                  key={p.id}
                  product={p}
                  isSidebar={isSidebar}
                  draggable={draggable}
                  editDisabled={editDisabled}
                  onProductDragStart={onProductDragStart}
                  onProductDragEnd={onProductDragEnd}
                />
              ))}
              {maxProductsPerCategory != null && node.products.length > maxProductsPerCategory ? (
                <li className="muted missing-products-more" style={{ fontSize: 12 }}>
                  …and {node.products.length - maxProductsPerCategory} more in {node.categoryName}
                </li>
              ) : null}
            </ul>
          ) : null}
          {hasChildren ? (
            <div className="missing-category-children">
              {node.children.map((child) => (
                <MissingCategoryNode
                  key={child.categoryId}
                  node={child}
                  depth={depth + 1}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                  isSidebar={isSidebar}
                  embedded={embedded}
                  maxProductsPerCategory={maxProductsPerCategory}
                  draggable={draggable}
                  editDisabled={editDisabled}
                  onProductDragStart={onProductDragStart}
                  onProductDragEnd={onProductDragEnd}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
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
  hierarchical = false,
  rootCategoryId = null,
  showCategoryFilter = false,
  compactSidebar = false,
  refreshLoading = false,
  hideDragHint = false,
}) {
  if (!alwaysShow && !coverage && !loading) return null;

  const missing = coverage?.missingProducts || [];
  const total = coverage?.totalProducts ?? 0;
  const placed = coverage?.placedCount ?? 0;
  const pct = coverage?.coveragePercent ?? 0;
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [filterSubcategoryId, setFilterSubcategoryId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const filteredMissing = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return missing;
    return missing.filter(
      (p) =>
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.sku || "").toLowerCase().includes(q) ||
        String(p.id || "").toLowerCase().includes(q)
    );
  }, [missing, searchQuery]);

  const grouped = useMemo(() => groupMissingByCategory(filteredMissing, categories), [filteredMissing, categories]);
  const categoryTree = useMemo(
    () => (hierarchical ? buildMissingCategoryTree(filteredMissing, categories, rootCategoryId) : []),
    [hierarchical, filteredMissing, categories, rootCategoryId]
  );

  const resolvedRoot = rootCategoryId ? resolveCategoryId(rootCategoryId, categories) : null;
  const rootLabel = resolvedRoot ? categoryLabel(categories, resolvedRoot) : "All categories";
  const filterLabel = resolvedRoot ? "Subcategory" : "Category";

  const subcategoryOptions = useMemo(() => {
    if (!showCategoryFilter || !categoryTree.length) return [];
    const rootNode = resolvedRoot ? categoryTree[0] : null;
    if (rootNode?.children?.length) return flattenSubcategoryOptions(rootNode.children);
    return flattenSubcategoryOptions(categoryTree);
  }, [showCategoryFilter, categoryTree, resolvedRoot]);

  const displayTree = useMemo(() => {
    if (!hierarchical) return [];
    if (!filterSubcategoryId) return categoryTree;
    const node = findTreeNode(categoryTree, filterSubcategoryId);
    return node ? [node] : categoryTree;
  }, [hierarchical, categoryTree, filterSubcategoryId]);

  useEffect(() => {
    setActiveCategoryId("all");
    setFilterSubcategoryId("");
    setSearchQuery("");
  }, [rootCategoryId]);

  useEffect(() => {
    if (activeCategoryId === "all") return;
    if (!grouped.some((g) => g.categoryId === activeCategoryId)) {
      setActiveCategoryId("all");
    }
  }, [activeCategoryId, grouped]);

  useEffect(() => {
    const next = new Set();
    if (filterSubcategoryId) {
      next.add(filterSubcategoryId);
      setExpandedIds(next);
      return;
    }
    if (resolvedRoot) next.add(resolvedRoot);
    else displayTree.forEach((node) => next.add(node.categoryId));
    setExpandedIds(next);
  }, [filterSubcategoryId, resolvedRoot, displayTree]);

  useEffect(() => {
    if (!filterSubcategoryId) return;
    if (!findTreeNode(categoryTree, filterSubcategoryId)) {
      setFilterSubcategoryId("");
    }
  }, [filterSubcategoryId, categoryTree]);

  const toggleExpanded = useCallback((categoryId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const visibleGroups = useMemo(() => {
    if (!categoryTabs || activeCategoryId === "all") return grouped;
    return grouped.filter((g) => g.categoryId === activeCategoryId);
  }, [grouped, categoryTabs, activeCategoryId]);

  const isSidebar = variant === "sidebar";
  const useHierarchy = hierarchical && categoryTree.length > 0;

  const flatCategoryList = (
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
              <MissingProductRow
                key={p.id}
                product={p}
                isSidebar={isSidebar}
                draggable={draggable}
                editDisabled={editDisabled}
                onProductDragStart={onProductDragStart}
                onProductDragEnd={onProductDragEnd}
              />
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

  const hierarchicalCategoryList = (
    <div className={`missing-by-category missing-by-category--tree${isSidebar ? " missing-by-category--sidebar" : ""}`}>
      {displayTree.map((node) => (
        <MissingCategoryNode
          key={node.categoryId}
          node={node}
          depth={0}
          expandedIds={expandedIds}
          onToggle={toggleExpanded}
          isSidebar={isSidebar}
          embedded={embedded}
          maxProductsPerCategory={maxProductsPerCategory}
          draggable={draggable}
          editDisabled={editDisabled}
          onProductDragStart={onProductDragStart}
          onProductDragEnd={onProductDragEnd}
        />
      ))}
    </div>
  );

  const searchBar = (
    <label className={`missing-products-search${compactSidebar ? " missing-products-search--compact" : ""}`}>
      <span className="visually-hidden">Search missing products</span>
      <input
        type="search"
        className="missing-products-search-input"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={compactSidebar ? "Search name or SKU…" : "Search by name or SKU…"}
        aria-label="Search missing products"
      />
      {searchQuery ? (
        <button
          type="button"
          className="missing-products-search-clear"
          onClick={() => setSearchQuery("")}
          aria-label="Clear search"
          title="Clear search"
        >
          ×
        </button>
      ) : null}
    </label>
  );

  const categoryFilterBar =
    showCategoryFilter && subcategoryOptions.length > 0 ? (
      <label className={`missing-category-filter${compactSidebar ? " missing-category-filter--compact" : ""}`}>
        {!compactSidebar ? <span className="missing-category-filter-label">{filterLabel}</span> : null}
        <select
          className="missing-category-filter-select"
          value={filterSubcategoryId}
          onChange={(e) => setFilterSubcategoryId(e.target.value)}
          aria-label={
            resolvedRoot
              ? `Filter missing products by subcategory under ${rootLabel}`
              : "Filter missing products by category"
          }
        >
          <option value="">
            {compactSidebar
              ? `All (${searchQuery.trim() ? filteredMissing.length : missing.length})`
              : resolvedRoot
                ? `All in ${rootLabel} (${searchQuery.trim() ? filteredMissing.length : missing.length})`
                : `All categories (${searchQuery.trim() ? filteredMissing.length : missing.length})`}
          </option>
          {subcategoryOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {`${"\u00A0".repeat(opt.depth * 2)}${opt.depth > 0 ? "↳ " : ""}${opt.name} (${opt.count})`}
            </option>
          ))}
        </select>
      </label>
    ) : null;

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

  const categoryList = useHierarchy ? hierarchicalCategoryList : flatCategoryList;

  const missingListContent =
    missing.length > 0 ? (
      filteredMissing.length === 0 ? (
        <p className="muted missing-products-search-empty" style={{ fontSize: 12, margin: "8px 0 0" }}>
          No missing products match &ldquo;{searchQuery.trim()}&rdquo;.
        </p>
      ) : categoryTabs ? (
        <>
          {categoryTabsBar}
          {categoryList}
        </>
      ) : isSidebar ? (
        categoryList
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
    );

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
      {compactSidebar ? (
        <div className="missing-sidebar-compact-bar">
          <div className="missing-sidebar-compact-stats mono">
            <span className={`missing-coverage-pct${pct >= 100 ? " is-full" : ""}`}>{pct}%</span>
            <span className="missing-sidebar-compact-meta muted">
              {missing.length} to place · drag to grid
            </span>
          </div>
          <div className="missing-sidebar-compact-actions">
            {categoryFilterBar}
            {onRefresh ? (
              <button
                type="button"
                className="btn-secondary missing-sidebar-refresh-btn"
                onClick={onRefresh}
                disabled={refreshLoading}
                title="Refresh missing products"
                aria-label="Refresh missing products"
              >
                {refreshLoading ? "…" : "↻"}
              </button>
            ) : null}
          </div>
          {missing.length > 0 ? searchBar : null}
        </div>
      ) : (
        <>
          <div className={`missing-coverage-summary${isSidebar ? " missing-coverage-summary--sidebar" : ""}`}>
            <span className={`missing-coverage-pct mono${pct >= 100 ? " is-full" : ""}`}>{pct}%</span>
            <span className="missing-coverage-detail muted">
              {placed}/{total} placed
              {missing.length ? ` · ${missing.length} missing` : " · complete"}
            </span>
          </div>
          {categoryFilterBar}
          {missing.length > 0 ? searchBar : null}
        </>
      )}
      {isSidebar && missing.length > 0 && !categoryTabs ? (
        <div
          className="missing-products-scroll"
          role="region"
          aria-label={`${missing.length} missing products — scroll to browse`}
        >
          {missingListContent}
        </div>
      ) : (
        missingListContent
      )}
      {draggable && !editDisabled && missing.length > 0 && !hideDragHint ? (
        <p className={`muted missing-product-drag-hint${isSidebar ? " missing-product-drag-hint--sidebar" : ""}`}>
          {dragHint}
        </p>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div
        className={`missing-products-embedded${isSidebar ? " missing-products-embedded--sidebar" : ""}${compactSidebar ? " missing-products-embedded--compact" : ""}`}
      >
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
