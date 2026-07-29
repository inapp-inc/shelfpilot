import { useMemo } from "react";
import CategoryTreeBar from "./CategoryTreeBar.jsx";
import ImportProgressPanel from "./ImportProgressPanel.jsx";
import { categoryLabel } from "./buildCategoryTree.js";
import { descendantCategoryIds } from "../layout-editor/categoryFilter.js";
import { resolveAssetUrl } from "../assetUrl.js";

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
  onAddProduct,
  onEditProduct,
  onImport,
  onExport,
  onDownloadTemplate,
  importing,
  importProgress,
  onDismissImportProgress,
  editDisabled,
}) {
  const filtered = useMemo(() => {
    if (!selectedCategoryId) return products;
    const allowed = descendantCategoryIds(selectedCategoryId, categories);
    return products.filter((p) => allowed.has(p.categoryId));
  }, [products, selectedCategoryId, categories]);

  const attrOf = (p) =>
    p.attr ??
    (p.attributes && Object.keys(p.attributes).length
      ? Object.entries(p.attributes)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      : "—");

  const filterName = selectedCategoryId ? categoryLabel(categories, selectedCategoryId) : "All";

  return (
    <section className="fade catalog-page">
      <ImportProgressPanel progress={importProgress} onDismiss={onDismissImportProgress} />
      <div className="catalog-toolbar">
        <div>
          <h2 className="page-title">Products & Categories</h2>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
            Import categories and products from Excel (.xlsx). Click <strong>Import Excel</strong> to choose the{" "}
            target <strong>store type</strong> and drag &amp; drop your file — rows without a storeType use the type you pick.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {verticalOptions?.length ? (
            <select
              className="catalog-vertical-select"
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
            className="btn-secondary"
            style={{ padding: "9px 14px" }}
            onClick={onDownloadTemplate}
            disabled={importing}
          >
            Excel template
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "9px 14px" }}
            onClick={onImport}
            disabled={importing || editDisabled}
          >
            {importing ? "Importing…" : "Import Excel"}
          </button>
          <button type="button" className="btn-secondary" style={{ padding: "9px 14px" }} onClick={onExport}>
            Export
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: "9px 14px" }}
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
          editDisabled={editDisabled}
        />
      </div>

      <div className="panel catalog-main catalog-main-full">
          <div className="catalog-main-header">
            <strong style={{ fontSize: 14 }}>Products · {filterName}</strong>
            <span className="mono muted" style={{ fontSize: 12 }}>
              {filtered.length} item(s)
            </span>
          </div>
          <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Attr</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id || p.sku}>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {p.imageUrl || p.attributes?.imageUrl ? (
                        <img
                          src={resolveAssetUrl(p.imageUrl || p.attributes?.imageUrl)}
                          alt=""
                          style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }}
                        />
                      ) : (
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: "1px solid #eef0f2",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            background: "#fafafa",
                          }}
                        >
                          📦
                        </span>
                      )}
                      {!editDisabled ? (
                        <button
                          type="button"
                          className="linklike"
                          title={`Edit ${p.name}`}
                          onClick={() => onEditProduct(p)}
                        >
                          {p.name}
                        </button>
                      ) : (
                        p.name
                      )}
                    </span>
                  </td>
                  <td className="mono">{p.sku}</td>
                  <td>
                    <span className="cat-chip">
                      <span
                        className="cat-tree-dot"
                        style={{ background: categories.find((c) => c.id === p.categoryId)?.color || "#ccc" }}
                      />
                      {categoryLabel(categories, p.categoryId)}
                    </span>
                  </td>
                  <td className="mono">{attrOf(p)}</td>
                  <td>
                    {!editDisabled ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        onClick={() => onEditProduct(p)}
                      >
                        Edit
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {!filtered.length ? (
            <div className="empty-box" style={{ margin: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>No products in {filterName}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>
                Add a product or pick another category.
              </div>
            </div>
          ) : null}
      </div>
    </section>
  );
}
