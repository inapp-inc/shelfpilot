import { useEffect, useState } from "react";
import { api } from "../api.js";
import CategoryTreePicker from "../catalog/CategoryTreePicker.jsx";
import { filterProductsForShelf } from "./categoryFilter.js";
import { categoryLabel } from "../catalog/buildCategoryTree.js";

function activeFace(shelf, faceId) {
  if (!shelf?.faces?.length) return { id: "A", categoryId: shelf?.categoryId, planogram: shelf?.planogram || [] };
  return shelf.faces.find((f) => f.id === faceId) || shelf.faces[0];
}

/** Guided category → planogram flow for shelves and aisles. */
export default function MerchandisingPanel({
  selection,
  layout,
  token,
  products,
  categories,
  editDisabled,
  onLayoutUpdated,
  onMapAisle,
  onMapShelf,
  onQuickAddProduct,
  onRefreshCatalog,
  toast,
}) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [faceId, setFaceId] = useState("A");
  const [productId, setProductId] = useState("");
  const [preview, setPreview] = useState(null);
  const [facings, setFacings] = useState("");

  let kind = null;
  let entity = null;
  if (selection?.kind === "aisle") {
    kind = "aisle";
    entity = (layout.aisles || []).find((a) => a.id === selection.id);
  } else if (selection?.kind === "shelf" || selection?.kind === "fixture") {
    kind = "shelf";
    entity = (layout.shelves || layout.fixtures || []).find((s) => s.id === selection.id);
  }

  const shelf = kind === "shelf" ? entity : null;
  const face = shelf ? activeFace(shelf, faceId) : null;
  const faceCategory = face?.categoryId || null;
  const levels = shelf?.levels?.length
    ? shelf.levels
    : [{ levelIndex: 0 }, { levelIndex: 1 }];

  const list = faceCategory ? filterProductsForShelf(products, faceCategory, categories) : [];

  useEffect(() => {
    setProductId("");
    setPreview(null);
    setFacings("");
    setLevelIndex(0);
    setFaceId("A");
  }, [entity?.id]);

  useEffect(() => {
    setProductId("");
    setPreview(null);
    setFacings("");
    setLevelIndex(0);
  }, [faceCategory, faceId]);

  useEffect(() => {
    setPreview(null);
    setFacings("");
    if (!faceCategory || !productId || !token || !shelf) return;
    api(`/layouts/${layout.id}/planogram/preview`, {
      token,
      method: "POST",
      body: { shelfId: shelf.id, productId, levelIndex, faceId },
    })
      .then((p) => {
        setPreview(p);
        setFacings(String(p.maxFacings));
      })
      .catch((e) => toast?.(e.message));
  }, [shelf?.id, faceCategory, productId, levelIndex, faceId, layout?.id, token]);

  if (!entity) {
    return (
      <div className="muted" style={{ fontSize: 12.5, fontStyle: "italic", padding: "4px 0" }}>
        Select an aisle or shelf to assign a category and place products.
      </div>
    );
  }

  function mapCategory(categoryId) {
    if (!categoryId) return;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    if (kind === "aisle") onMapAisle(entity.id, cat.id, cat.color);
    else onMapShelf(entity.id, cat.id, cat.color, faceId);
  }

  async function addPlacement() {
    if (!productId || !shelf) return;
    const updated = await api(`/layouts/${layout.id}/shelves/${shelf.id}/planogram`, {
      token,
      method: "POST",
      body: {
        productId,
        levelIndex,
        faceId,
        facings: facings !== "" ? Number(facings) : undefined,
      },
    });
    onLayoutUpdated(updated);
    toast?.(`Product placed on Face ${faceId}, level ${levelIndex}`);
  }

  async function removePlacement(placementId) {
    const updated = await api(
      `/layouts/${layout.id}/shelves/${shelf.id}/planogram/${placementId}`,
      { token, method: "DELETE" }
    );
    onLayoutUpdated(updated);
  }

  const facePlanogram = face?.planogram || shelf?.planogram || [];
  const onLevel = facePlanogram.filter((p) => Number(p.levelIndex) === Number(levelIndex));

  return (
    <div className="merch-panel">
      {kind === "shelf" && shelf?.displayNumber ? (
        <div className="mono" style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "#374151" }}>
          Shelf #{shelf.displayNumber}
          {shelf.doubleSided ? " · Gondola (A/B)" : ` · ${shelf.type || "shelf"}`}
        </div>
      ) : null}

      {kind === "shelf" && shelf?.doubleSided ? (
        <div className="mode-toggle" style={{ marginBottom: 12 }}>
          <button type="button" className={faceId === "A" ? "active" : ""} onClick={() => setFaceId("A")}>
            Face A
          </button>
          <button type="button" className={faceId === "B" ? "active" : ""} onClick={() => setFaceId("B")}>
            Face B
          </button>
        </div>
      ) : null}

      <div className="merch-step">
        <div className="merch-step-label">
          <span className="merch-step-num">1</span> Category
          {kind === "shelf" && shelf?.doubleSided ? ` (Face ${faceId})` : ""}
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginBottom: 6 }}>
          Target: <strong>{kind}</strong>
          {faceCategory ? (
            <span className="cat-chip" style={{ marginLeft: 8 }}>
              {categoryLabel(categories, faceCategory)}
            </span>
          ) : null}
        </div>
        <CategoryTreePicker
          categories={categories}
          products={products}
          value={faceCategory || ""}
          onChange={(id) => {
            if (id) mapCategory(id);
          }}
          disabled={editDisabled}
          showCounts
        />
      </div>

      {kind === "shelf" ? (
        <div className="merch-step">
          <div className="merch-step-label">
            <span className="merch-step-num">2</span> Planogram
            {shelf?.doubleSided ? ` · Face ${faceId}` : ""}
          </div>
          {!faceCategory ? (
            <div className="muted" style={{ fontSize: 12.5 }}>
              Assign a category to this face above first. This shelf has {levels.length} level(s).
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span className="muted" style={{ fontSize: 11.5 }}>
                  <strong>{list.length}</strong> product{list.length === 1 ? "" : "s"} in{" "}
                  {categoryLabel(categories, faceCategory)}
                </span>
                {onRefreshCatalog ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "3px 8px", fontSize: 11 }}
                    onClick={() => onRefreshCatalog()}
                    title="Reload products (e.g. after an import)"
                  >
                    Refresh
                  </button>
                ) : null}
              </div>
              <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600 }}>Level</label>
              <select
                disabled={editDisabled}
                value={levelIndex}
                onChange={(e) => setLevelIndex(Number(e.target.value))}
                style={{ padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb", width: "100%", marginBottom: 8 }}
              >
                {levels.map((lv, idx) => (
                  <option key={lv.levelIndex ?? idx} value={lv.levelIndex ?? idx}>
                    Level {lv.levelIndex ?? idx}
                    {lv.heightFromFloorMeters != null ? ` · ${lv.heightFromFloorMeters} m` : ""}
                  </option>
                ))}
              </select>
              <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600 }}>Product</label>
              <select
                disabled={editDisabled}
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                style={{ padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb", width: "100%" }}
              >
                <option value="">Select product</option>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ""}
                  </option>
                ))}
              </select>
              {list.length === 0 ? (
                <div style={{ marginTop: 10 }}>
                  <p className="muted" style={{ fontSize: 11.5 }}>
                    No products in {categoryLabel(categories, faceCategory)}. Import products in
                    Catalog or add one, then Refresh.
                  </p>
                  {!editDisabled ? (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: "8px 12px", marginTop: 8, width: "100%", fontSize: 12 }}
                      onClick={() => onQuickAddProduct?.(faceCategory)}
                    >
                      + Add product for this category
                    </button>
                  ) : null}
                </div>
              ) : null}
              {preview ? (
                <div className="mono" style={{ fontSize: 11.5, marginTop: 8, color: "#6b7280" }}>
                  Max facings {preview.maxFacings}
                </div>
              ) : null}
              <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600, marginTop: 8, display: "block" }}>
                Facings
              </label>
              <input
                className="mono"
                type="number"
                min="1"
                disabled={editDisabled || !preview}
                value={facings}
                onChange={(e) => setFacings(e.target.value)}
                style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "9px 12px", marginTop: 10, width: "100%" }}
                disabled={editDisabled || !productId}
                onClick={() => addPlacement().catch((e) => toast?.(e.message))}
              >
                Add to Face {faceId}, level {levelIndex}
              </button>
              <div className="section-label" style={{ marginTop: 14 }}>
                On Face {faceId}, level {levelIndex}
              </div>
              {onLevel.length === 0 ? (
                <div className="muted" style={{ fontSize: 12 }}>Empty level.</div>
              ) : (
                onLevel.map((p) => {
                  const prod = products.find((x) => x.id === p.productId);
                  return (
                    <div key={p.id} className="merch-placement-row">
                      <span style={{ fontSize: 12.5 }}>
                        {prod?.name || p.productId} · {p.facings}/{p.maxFacings}
                      </span>
                      {!editDisabled ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() => removePlacement(p.id).catch((e) => toast?.(e.message))}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 12, paddingTop: 8 }}>
          Aisle category mapping only — planogram applies to shelves.
        </div>
      )}
    </div>
  );
}
