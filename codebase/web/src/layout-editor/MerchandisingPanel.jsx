import { useEffect, useState } from "react";
import { api } from "../api.js";
import CategoryTreePicker from "../catalog/CategoryTreePicker.jsx";
import { filterProductsForShelf } from "./categoryFilter.js";
import { categoryLabel } from "../catalog/buildCategoryTree.js";
import { catalogProductDimensionsInches } from "../catalog/productDimensions.js";
import { formatInchesFromMeters, formatWeightFromKg } from "../units.js";
import { colorForCategoryId } from "../categoryColors.js";
import { weightWarningMessage } from "../shelfLoad.js";
import { isDoubleSided, normalizeShelfUI, shelfDisplayLabel, shelfCanvasFaceLabel, shelfFaceDisplayLabel, resolveGondolaForEditor } from "./shelfFaces.js";
import { isShelfLike } from "./planogramSegments.js";

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
  onOpenPlanogram,
  toast,
  onShelfFaceChange,
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

  const shelfRaw = kind === "shelf" ? entity : null;
  const gondolaCtx = shelfRaw ? resolveGondolaForEditor(layout, shelfRaw.id) : null;
  const shelf = gondolaCtx?.shelf ?? (shelfRaw ? normalizeShelfUI(shelfRaw) : null);
  const dualFace = gondolaCtx?.mode === "gondola" || (shelf ? isDoubleSided(shelf) : false);
  const face = shelf ? activeFace(shelf, faceId) : null;
  const faceCategory = face?.categoryId || null;
  const levels = shelf?.levels?.length
    ? shelf.levels
    : [{ levelIndex: 0 }, { levelIndex: 1 }];

  const list = faceCategory ? filterProductsForShelf(products, faceCategory, categories) : [];

  function merchApiTarget(currentFaceId = faceId) {
    if (!shelfRaw) return { shelfId: "", faceId: "A" };
    if (gondolaCtx?.mode === "gondola") {
      return {
        shelfId: gondolaCtx.physicalShelfId(currentFaceId),
        faceId: gondolaCtx.apiFaceId(currentFaceId),
      };
    }
    return { shelfId: shelfRaw.id, faceId: currentFaceId };
  }

  const activeAisleLabel =
    shelf && kind === "shelf"
      ? shelfCanvasFaceLabel(shelf, faceId, layout.aisles, layout.shelves) ||
        shelfFaceDisplayLabel(shelfRaw, layout.aisles) ||
        shelfDisplayLabel(shelfRaw, layout.aisles)
      : null;

  useEffect(() => {
    setProductId("");
    setPreview(null);
    setFacings("");
    setLevelIndex(0);
    setFaceId(selection?.faceId || "A");
    if (kind === "shelf" && onRefreshCatalog) onRefreshCatalog();
  }, [entity?.id, selection?.faceId]);

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
    const { shelfId, faceId: apiFaceId } = merchApiTarget();
    api(`/layouts/${layout.id}/planogram/preview`, {
      token,
      method: "POST",
      body: { shelfId, productId, levelIndex, faceId: apiFaceId },
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
        Select an aisle to assign a category, or click a shelf to open its planogram.
      </div>
    );
  }

  if (kind === "shelf") {
    return (
      <div className="muted" style={{ fontSize: 12.5, fontStyle: "italic", padding: "4px 0", lineHeight: 1.45 }}>
        Shelf settings and planogram are in the dialog that opens when you click a shelf on the canvas.
      </div>
    );
  }

  function mapCategory(categoryId) {
    if (!categoryId) return;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    // Store the resolved colour so every mapped fixture gets a distinct hue even
    // when the catalog category was created without one.
    const color = colorForCategoryId(categories, cat.id);
    if (kind === "aisle") onMapAisle(entity.id, cat.id, color);
    else {
      const { shelfId, faceId: apiFaceId } = merchApiTarget();
      onMapShelf(shelfId, cat.id, color, apiFaceId);
    }
  }

  async function addPlacement() {
    if (!productId || !shelfRaw) return;
    const { shelfId, faceId: apiFaceId } = merchApiTarget();
    const updated = await api(`/layouts/${layout.id}/shelves/${shelfId}/planogram`, {
      token,
      method: "POST",
      body: {
        productId,
        levelIndex,
        faceId: apiFaceId,
        facings: facings !== "" ? Number(facings) : undefined,
      },
    });
    onLayoutUpdated(updated);
    onRefreshCatalog?.();
    const overload = weightWarningMessage(updated);
    if (overload) toast?.(overload, { type: "warning" });
    else toast?.(`Product placed on ${activeAisleLabel || "shelf"}, level ${levelIndex}`);
  }

  async function removePlacement(placementId) {
    const { shelfId } = merchApiTarget();
    const updated = await api(
      `/layouts/${layout.id}/shelves/${shelfId}/planogram/${placementId}`,
      { token, method: "DELETE" }
    );
    onLayoutUpdated(updated);
  }

  const facePlanogram = face?.planogram || shelf?.planogram || [];
  const onLevel = facePlanogram.filter((p) => Number(p.levelIndex) === Number(levelIndex));

  return (
    <div className="merch-panel">
      {kind === "shelf" && shelf && isShelfLike(shelf.type) ? (
        <button
          type="button"
          className="btn-primary"
          style={{ padding: "10px 12px", width: "100%", marginBottom: 4 }}
          onClick={() => {
            const { shelfId } = merchApiTarget();
            onOpenPlanogram?.(shelfId, faceId);
          }}
        >
          Open Planogram
        </button>
      ) : null}

      {kind === "shelf" && shelf ? (
        <div className="mono" style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "#374151" }}>
          {activeAisleLabel || shelfDisplayLabel(shelfRaw, layout.aisles)}
        </div>
      ) : null}

      {kind === "shelf" && dualFace ? (
        <div className="merch-face-toggle">
          <button
            type="button"
            className={faceId === "A" ? "active" : ""}
            onClick={() => {
              setFaceId("A");
              const { shelfId } = merchApiTarget("A");
              onShelfFaceChange?.(shelfId, "A");
            }}
          >
            {shelfCanvasFaceLabel(shelf, "A", layout.aisles, layout.shelves)}
          </button>
          <button
            type="button"
            className={faceId === "B" ? "active" : ""}
            onClick={() => {
              setFaceId("B");
              const { shelfId } = merchApiTarget("B");
              onShelfFaceChange?.(shelfId, "B");
            }}
          >
            {shelfCanvasFaceLabel(shelf, "B", layout.aisles, layout.shelves)}
          </button>
        </div>
      ) : null}

      <div className="merch-step">
        <div className="merch-step-label">
          <span className="merch-step-num">1</span>           Category
          {kind === "shelf" && dualFace ? ` (${shelfCanvasFaceLabel(shelf, faceId, layout.aisles, layout.shelves)})` : ""}
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
            <span className="merch-step-num">2</span>             Planogram
            {dualFace ? ` · ${shelfCanvasFaceLabel(shelf, faceId, layout.aisles, layout.shelves)}` : ""}
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
                    {lv.heightFromFloorMeters != null ? ` · ${formatInchesFromMeters(lv.heightFromFloorMeters)} high` : ""}
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
                <div className="planogram-suggest mono" style={{ fontSize: 11.5, marginTop: 8, color: "#374151", lineHeight: 1.55 }}>
                  <div><strong>Suggested arrangement</strong></div>
                  <div>Front facings (wide): up to {preview.maxFacings}</div>
                  <div>Depth (backward): up to {preview.maxDepthFacings ?? 1} unit(s) deep</div>
                  <div>Levels (high): up to {preview.suggestedLevels ?? levels.length}</div>
                  {preview.maxUnitsByWeight != null ? (
                    <div>
                      Weight limit: {preview.maxUnitsByWeight} unit(s) ·{" "}
                      {formatWeightFromKg(preview.productWeightKg)} each, level holds{" "}
                      {formatWeightFromKg(preview.levelLoadLimitKg)}
                    </div>
                  ) : null}
                  {preview.fitsLevelHeight === false ? (
                    <div style={{ color: "#A30A2A" }}>
                      Too tall for this level ({formatInchesFromMeters(preview.levelClearHeightMeters)} clear).
                    </div>
                  ) : null}
                  {preview.assumedDimensions ? (
                    <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                      Using default product size — set width/height in Catalog for accurate counts.
                    </div>
                  ) : null}
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
                      <span style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span>
                          {prod?.name || p.productId} · {p.facings}/{p.maxFacings}
                        </span>
                        {prod ? (
                          <span className="mono muted" style={{ fontSize: 11 }}>
                            {catalogProductDimensionsInches(prod).label}
                          </span>
                        ) : null}
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
