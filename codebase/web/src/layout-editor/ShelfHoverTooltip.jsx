import { categoryLabel } from "../catalog/buildCategoryTree.js";
import { catalogProductDimensionsInches } from "../catalog/productDimensions.js";
import {
  groupPlanogramByLevel,
  normalizeShelfUI,
  shelfCanvasFaceLabel,
  shelfFaceDisplayLabel,
  planogramEditorFaceId,
} from "./shelfFaces.js";

/** Planogram rows for the hovered shelf face only — no cross-face bleed. */
function planogramForHover(layout, hover) {
  const faceId = hover.faceId || "A";
  const shelves = layout.shelves || layout.fixtures || [];
  const raw = shelves.find((s) => s.id === hover.shelfId);
  if (!raw) return [];

  const storageFaceId = planogramEditorFaceId(raw, faceId);
  const shelf = normalizeShelfUI(raw);
  const face = shelf.faces?.find((f) => f.id === storageFaceId);
  if (face) return (face.planogram || []).filter((p) => p?.productId);
  if (storageFaceId === "A" && !shelf.faces?.length) {
    return (shelf.planogram || []).filter((p) => p?.productId);
  }
  return [];
}

function categoryForHover(layout, hover) {
  const faceId = hover.faceId || "A";
  const shelves = layout.shelves || layout.fixtures || [];
  const raw = shelves.find((s) => s.id === hover.shelfId);
  if (!raw) return null;

  const storageFaceId = planogramEditorFaceId(raw, faceId);
  const shelf = normalizeShelfUI(raw);
  const face = shelf.faces?.find((f) => f.id === storageFaceId);
  return face?.categoryId ?? (storageFaceId === "A" ? shelf.categoryId : null) ?? null;
}

function labelForHover(layout, hover) {
  const shelves = layout.shelves || layout.fixtures || [];
  const faceId = hover.faceId || "A";
  const phys = shelves.find((s) => s.id === hover.shelfId);

  if (hover.mergedShelf && phys) {
    return (
      shelfCanvasFaceLabel(hover.mergedShelf, faceId, layout.aisles, shelves) ||
      shelfFaceDisplayLabel(phys, layout.aisles) ||
      "Shelf"
    );
  }

  return shelfFaceDisplayLabel(phys, layout.aisles) || shelfCanvasFaceLabel(phys, faceId, layout.aisles, shelves) || "Shelf";
}

/** Hover tooltip showing products on a shelf face, grouped by level. */
export default function ShelfHoverTooltip({ hover, layout, categories, products, anchor }) {
  if (!hover || !layout) return null;

  const shelves = layout.shelves || layout.fixtures || [];
  const shelf = shelves.find((s) => s.id === hover.shelfId);
  if (!shelf) return null;

  const label = labelForHover(layout, hover);
  const categoryId = categoryForHover(layout, hover);
  const planogram = planogramForHover(layout, hover);

  const productLine = (p) => {
    const prod = (products || []).find((x) => x.id === p.productId);
    const name = prod ? prod.name || prod.sku || p.productId : p.productId;
    if (!prod) return name;
    const dims = catalogProductDimensionsInches(prod);
    return `${name} · ${dims.label}`;
  };

  const levelGroups = groupPlanogramByLevel(planogram, null).filter((g) => g.products.length > 0);
  const totalProducts = planogram.length;

  const style = anchor
    ? { position: "fixed", left: anchor.x + 12, top: anchor.y + 12, zIndex: 10000 }
    : { position: "absolute", zIndex: 10000 };

  return (
    <div
      className="panel shelf-hover-tooltip"
      style={{
        ...style,
        padding: "10px 12px",
        minWidth: 160,
        maxWidth: 280,
        pointerEvents: "none",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      }}
    >
      <div className="mono" style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
        {label}
      </div>
      {categoryId ? (
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          {categoryLabel(categories, categoryId)}
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          No category assigned
        </div>
      )}
      {totalProducts > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {levelGroups.map(({ levelIndex, products: levelProducts }) => {
            const rows = levelProducts.slice(0, 5).map((p) => productLine(p));
            const overflow = levelProducts.length - rows.length;
            return (
              <div key={levelIndex}>
                <div className="mono" style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 2 }}>
                  L{levelIndex}
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.5 }}>
                  {rows.map((name, i) => (
                    <li key={`${levelIndex}-${i}`}>{name}</li>
                  ))}
                </ul>
                {overflow > 0 ? (
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    +{overflow} more on this level
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 12 }}>
          No products on this face
        </div>
      )}
      {totalProducts > 8 ? (
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          +{totalProducts - 8} more total
        </div>
      ) : null}
    </div>
  );
}
