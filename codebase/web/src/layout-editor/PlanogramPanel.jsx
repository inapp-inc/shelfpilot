import { useEffect, useState } from "react";
import { api } from "../api.js";
import { filterProductsForShelf } from "./categoryFilter.js";

/** Per-level planogram; products filtered by shelf category + children. */
export default function PlanogramPanel({
  selection,
  layout,
  token,
  products,
  categories,
  editDisabled,
  onLayoutUpdated,
  toast,
}) {
  const shelf =
    selection?.kind === "shelf" || selection?.kind === "fixture"
      ? (layout.shelves || []).find((s) => s.id === selection.id)
      : null;
  const levels = shelf?.levels?.length
    ? shelf.levels
    : [
        { levelIndex: 0 },
        { levelIndex: 1 },
      ];
  const [levelIndex, setLevelIndex] = useState(0);
  const [productId, setProductId] = useState("");
  const [preview, setPreview] = useState(null);
  const [facings, setFacings] = useState("");

  const list = shelf?.categoryId
    ? filterProductsForShelf(products, shelf.categoryId, categories)
    : [];

  useEffect(() => {
    setProductId("");
    setPreview(null);
    setFacings("");
    setLevelIndex(0);
  }, [shelf?.id, shelf?.categoryId]);

  useEffect(() => {
    setPreview(null);
    setFacings("");
    if (!shelf?.categoryId || !productId || !token) return;
    api(`/layouts/${layout.id}/planogram/preview`, {
      token,
      method: "POST",
      body: { shelfId: shelf.id, productId, levelIndex },
    })
      .then((p) => {
        setPreview(p);
        setFacings(String(p.maxFacings));
      })
      .catch((e) => toast?.(e.message));
  }, [shelf?.id, shelf?.categoryId, productId, levelIndex, layout?.id, token]);

  if (!shelf) {
    return (
      <div className="props-panel">
        <div className="section-label">Planogram</div>
        <div className="muted" style={{ fontSize: 12.5, fontStyle: "italic" }}>
          Select a shelf to place products on each level.
        </div>
      </div>
    );
  }

  if (!shelf.categoryId) {
    return (
      <div className="props-panel">
        <div className="section-label">Planogram</div>
        <div className="muted" style={{ fontSize: 12.5 }}>
          Assign a category to this shelf first. Only products in that category (and children) can be
          placed. Shelf type <strong>{shelf.type}</strong> has {levels.length} level(s).
        </div>
      </div>
    );
  }

  async function addPlacement() {
    if (!productId) return;
    const updated = await api(`/layouts/${layout.id}/shelves/${shelf.id}/planogram`, {
      token,
      method: "POST",
      body: {
        productId,
        levelIndex,
        facings: facings !== "" ? Number(facings) : undefined,
      },
    });
    onLayoutUpdated(updated);
    toast?.(`Product placed on level ${levelIndex}`);
  }

  async function removePlacement(placementId) {
    const updated = await api(
      `/layouts/${layout.id}/shelves/${shelf.id}/planogram/${placementId}`,
      { token, method: "DELETE" }
    );
    onLayoutUpdated(updated);
  }

  const onLevel = (shelf.planogram || []).filter((p) => Number(p.levelIndex) === Number(levelIndex));

  return (
    <div className="props-panel">
      <div className="section-label">Planogram · by level</div>
      <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
        Type {shelf.type} · {levels.length} levels · category filter ({list.length} SKUs)
      </div>
      <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600 }}>Level / layer</label>
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
        <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
          No products in this category tree. Add products in Catalog or pick a broader shelf category.
        </div>
      ) : null}
      {preview ? (
        <div className="mono" style={{ fontSize: 11.5, marginTop: 8, color: "#6b7280" }}>
          Max facings {preview.maxFacings}
          {preview.assumedDimensions ? " · assumed size 0.2×0.25 m" : ""}
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
        className="btn-primary"
        style={{ padding: "9px 12px", marginTop: 10, width: "100%" }}
        disabled={editDisabled || !productId}
        onClick={() => addPlacement().catch((e) => toast?.(e.message))}
      >
        Add to level {levelIndex}
      </button>
      <div className="section-label" style={{ marginTop: 14 }}>
        On this level
      </div>
      {onLevel.length === 0 ? (
        <div className="muted" style={{ fontSize: 12 }}>
          No products on level {levelIndex} yet.
        </div>
      ) : (
        onLevel.map((p) => {
          const prod = (products || []).find((x) => x.id === p.productId);
          return (
            <div
              key={p.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}
            >
              <span style={{ fontSize: 12.5 }}>
                {prod?.name || p.productId} · {p.facings}/{p.maxFacings}
              </span>
              {!editDisabled ? (
                <button
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
      <div className="section-label" style={{ marginTop: 12 }}>
        All levels
      </div>
      {(shelf.planogram || []).length === 0 ? (
        <div className="muted" style={{ fontSize: 12 }}>
          Empty shelf.
        </div>
      ) : (
        (shelf.planogram || []).map((p) => {
          const prod = (products || []).find((x) => x.id === p.productId);
          return (
            <div key={p.id} className="mono" style={{ fontSize: 11, marginBottom: 4, color: "#6b7280" }}>
              L{p.levelIndex}: {prod?.name || p.productId} ×{p.facings}
            </div>
          );
        })
      )}
    </div>
  );
}
