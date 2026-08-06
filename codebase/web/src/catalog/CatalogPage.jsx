import { useMemo, useState } from "react";
import CategoryTreeBar from "./CategoryTreeBar.jsx";
import ImportProgressPanel from "./ImportProgressPanel.jsx";
import { categoryLabel } from "./buildCategoryTree.js";
import { descendantCategoryIds } from "../layout-editor/categoryFilter.js";
import { resolveAssetUrl } from "../assetUrl.js";
import { catalogProductDimensionsInches } from "./productDimensions.js";

export default function CatalogPage({
  vertical,
  verticalOptions,
  onVerticalChange,
  categories,
  products,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onImport,
  onExport,
  onDownloadTemplate,
  importing,
  importProgress,
  onDismissImportProgress,
  editDisabled,
}) {
  const [search, setSearch] = useState("");

  const categoryFiltered = useMemo(() => {
    if (!selectedCategoryId) return products;
    const allowed = descendantCategoryIds(selectedCategoryId, categories);
    return products.filter((p) => allowed.has(p.categoryId));
  }, [products, selectedCategoryId, categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categoryFiltered;
    return categoryFiltered.filter((p) => {
      const cat = categoryLabel(categories, p.categoryId).toLowerCase();
      const dims = catalogProductDimensionsInches(p).label.toLowerCase();
      return (
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.sku || "").toLowerCase().includes(q) ||
        cat.includes(q) ||
        dims.includes(q)
      );
    });
  }, [categoryFiltered, search, categories]);

  const filterName = selectedCategoryId ? categoryLabel(categories, selectedCategoryId) : "All";

  return (
    <section className="fade catalog-page" data-testid="catalog-page">
      <ImportProgressPanel progress={importProgress} onDismiss={onDismissImportProgress} />
      <div className="catalog-toolbar">
        <div>
          <h2 className="page-title">Products & Categories</h2>
          <p className="muted catalog-toolbar-desc">
            Product dimensions are in <strong>inches</strong> (W × H × D). Import from Excel or add products below.
          </p>
        </div>
        <div className="catalog-toolbar-actions">
          {verticalOptions?.length ? (
            <select
              className="catalog-vertical-select"
              data-testid="catalog-vertical"
              value={vertical}
              onChange={(e) => onVerticalChange?.(e.target.value)}
              aria-label="Store type"
            >
              {verticalOptions.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            className="btn-secondary catalog-toolbar-btn"
            data-testid="catalog-excel-template"
            onClick={onDownloadTemplate}
            disabled={importing}
          >
            Excel template
          </button>
          <button
            type="button"
            className="btn-secondary catalog-toolbar-btn"
            data-testid="catalog-import"
            onClick={onImport}
            disabled={importing || editDisabled}
          >
            {importing ? "Importing…" : "Import Excel"}
          </button>
          <button type="button" className="btn-secondary catalog-toolbar-btn" data-testid="catalog-export" onClick={onExport}>
            Export
          </button>
          <button
            type="button"
            className="btn-primary catalog-toolbar-btn"
            data-testid="catalog-product-create"
            disabled={editDisabled}
            onClick={() => onAddProduct(selectedCategoryId)}
          >
            + Add product
          </button>
        </div>
      </div>

      <div className="panel catalog-category-top">
        <CategoryTreeBar
          categories={categories}
          products={products}
          selectedId={selectedCategoryId}
          onSelect={onSelectCategory}
          onAddCategory={onAddCategory}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          editDisabled={editDisabled}
        />
      </div>

      <div className="panel catalog-main catalog-main-full">
        <div className="catalog-main-header">
          <strong className="catalog-main-title">Products · {filterName}</strong>
          <div className="catalog-main-tools">
            <input
              type="search"
              className="catalog-search"
              data-testid="catalog-search"
              placeholder="Search name, SKU, category, dimensions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search products"
            />
            <span className="mono muted catalog-count" data-testid="catalog-count">
              {filtered.length} item(s)
            </span>
          </div>
        </div>
        <div className="table-scroll">
          <table className="catalog-products-table" data-testid="catalog-product-list">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th className="catalog-th-image">Product image</th>
                <th className="catalog-th-dims">Dimensions (in)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const dims = catalogProductDimensionsInches(p);
                const imgSrc = p.imageUrl || p.attributes?.imageUrl;
                return (
                  <tr key={p.id || p.sku}>
                    <td className="catalog-td-name">
                      {!editDisabled ? (
                        <button type="button" className="linklike" title={`Edit ${p.name}`} onClick={() => onEditProduct(p)}>
                          {p.name}
                        </button>
                      ) : (
                        p.name
                      )}
                    </td>
                    <td className="mono">{p.sku}</td>
                    <td>
                      <span className="cat-chip">
                        <span className="cat-tree-dot" style={{ background: categories.find((c) => c.id === p.categoryId)?.color || "#ccc" }} />
                        {categoryLabel(categories, p.categoryId)}
                      </span>
                    </td>
                    <td className="catalog-td-image">
                      {imgSrc ? (
                        <img src={resolveAssetUrl(imgSrc)} alt="" className="catalog-product-thumb" />
                      ) : (
                        <span className="catalog-product-thumb catalog-product-thumb--empty" aria-hidden="true">
                          📦
                        </span>
                      )}
                    </td>
                    <td className="mono catalog-td-dims">
                      {dims.label}
                      {dims.assumed ? <span className="muted catalog-dims-hint"> (default)</span> : null}
                    </td>
                    <td className="catalog-td-actions">
                      {!editDisabled ? (
                        <div className="catalog-row-actions">
                          <button type="button" className="btn-secondary catalog-edit-btn" onClick={() => onEditProduct(p)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-secondary catalog-delete-btn"
                            onClick={() => onDeleteProduct?.(p)}
                            title={`Delete ${p.name}`}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length ? (
          <div className="empty-box catalog-empty">
            <div className="catalog-empty-title">
              {search.trim() ? "No products match your search" : `No products in ${filterName}`}
            </div>
            <div className="muted catalog-empty-desc">
              {search.trim() ? "Try a different term or clear the search box." : "Add a product or pick another category."}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
