import { useMemo } from "react";
import {
  effectiveSegmentsForLevel,
  levelDisplayLabel,
  resolveSegmentId,
  shelfLevels,
} from "../layout-editor/planogramSegments.js";
import { normalizeShelfUI, planogramRowsOnPhysicalShelf } from "../layout-editor/shelfFaces.js";
import { productImageUrl } from "../productCatalog.js";

function findShelf(layout, shelfId) {
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  return shelves.find((s) => s.id === shelfId && !s.pairDisplay) || shelves.find((s) => s.id === shelfId);
}

/** 2D shelf elevation from real planogram segments + placement level/position. */
export default function ShopperShelfGuide({
  layout,
  placement,
  product,
  aisleLabel,
  shelfLabel,
  products = [],
  className = "",
}) {
  const model = useMemo(() => {
    if (!layout || !placement) return null;
    const raw = findShelf(layout, placement.shelfId);
    if (!raw) return null;

    const shelf = normalizeShelfUI(raw);
    const faceId = placement.faceId || "A";
    const levels = shelfLevels(shelf).sort(
      (a, b) => Number(b.levelIndex ?? 0) - Number(a.levelIndex ?? 0)
    );
    const planogram = planogramRowsOnPhysicalShelf(shelf, faceId);
    const productById = new Map((products || []).map((p) => [p.id, p]));

    const rows = levels.map((lvl) => {
      const levelIndex = Number(lvl.levelIndex ?? 0);
      const segments = effectiveSegmentsForLevel(shelf, faceId, levelIndex);
      const slots = segments.map((seg, segIdx) => {
        const row = planogram.find(
          (p) =>
            Number(p.levelIndex) === levelIndex &&
            resolveSegmentId(p, shelf, faceId) === seg.id
        );
        const slotProduct = row ? productById.get(row.productId) : null;
        return {
          id: seg.id || `seg-${segIdx}`,
          segIdx,
          isTarget:
            levelIndex === Number(placement.levelIndex) &&
            segIdx === Number(placement.positionIndex),
          product: slotProduct,
          label: seg.label || null,
        };
      });
      return {
        levelIndex,
        label: levelDisplayLabel(levelIndex),
        slots,
      };
    });

    return { shelf, faceId, rows };
  }, [layout, placement, products]);

  if (!placement || !model) {
    return (
      <div className={`sp-kiosk-shelf-guide sp-kiosk-shelf-guide--empty ${className}`.trim()}>
        Select a product to see its shelf position.
      </div>
    );
  }

  const header = aisleLabel
    ? `Aisle ${aisleLabel} · Shelf ${shelfLabel || "—"}`
    : `Shelf ${shelfLabel || "—"}`;

  const X0 = 30;
  const Y0 = 54;
  const W = 400;
  const boardStep = 64;
  const startX = X0 + 22;
  const slotGap = 8;

  return (
    <svg
      className={`sp-kiosk-shelf-guide ${className}`.trim()}
      viewBox="0 0 460 380"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Shelf view — ${placement.productName}`}
    >
      <rect x={X0} y={Y0} width={W} height={298} rx={12} className="sp-shelf-frame" />
      <rect x={X0} y={Y0} width={W} height={30} rx={12} className="sp-shelf-header" />
      <rect x={X0} y={Y0 + 18} width={W} height={12} className="sp-shelf-header" />
      <text x={X0 + 14} y={Y0 + 20} className="sp-shelf-header-text">
        {header}
      </text>

      {model.rows.map((row, ri) => {
        const slotCount = Math.max(1, row.slots.length);
        const slotW = Math.min(72, (W - 44 - (slotCount - 1) * slotGap) / slotCount);
        const by = Y0 + 92 + ri * boardStep;
        return (
          <g key={`lvl-${row.levelIndex}`}>
            <rect x={X0 + 10} y={by} width={W - 20} height={9} rx={3} className="sp-shelf-board" />
            <rect x={X0 + 10} y={by + 9} width={W - 20} height={4} rx={2} className="sp-shelf-board-edge" />
            <text
              x={X0 - 6}
              y={by - 2}
              textAnchor="end"
              className={`sp-shelf-level${row.levelIndex === Number(placement.levelIndex) ? " is-active" : ""}`}
            >
              {row.label}
            </text>
            {row.slots.map((slot, si) => {
              const x = startX + si * (slotW + slotGap);
              const y = by - 46;
              const thumb = slot.isTarget
                ? productImageUrl(product)
                : productImageUrl(slot.product);
              if (slot.isTarget) {
                const px = x - 4;
                const py = y - 12;
                const pw = slotW + 8;
                return (
                  <g key={slot.id}>
                    <rect x={px} y={py} width={pw} height={58} rx={9} className="sp-shelf-slot-target" />
                    <rect x={px} y={py} width={pw} height={18} rx={9} className="sp-shelf-slot-target-cap" />
                    <rect x={px} y={py + 9} width={pw} height={9} className="sp-shelf-slot-target-cap" />
                    <text x={px + pw / 2} y={py + 13.5} textAnchor="middle" className="sp-shelf-here-flag">
                      HERE
                    </text>
                    {thumb ? (
                      <image href={thumb} x={px + pw / 2 - 14} y={py + 22} width={28} height={28} />
                    ) : (
                      <text x={px + pw / 2} y={py + 46} textAnchor="middle" className="sp-shelf-slot-emj">
                        📦
                      </text>
                    )}
                  </g>
                );
              }
              return (
                <g key={slot.id}>
                  <rect
                    x={x}
                    y={y}
                    width={slotW}
                    height={46}
                    rx={8}
                    className="sp-shelf-slot"
                    opacity={thumb ? 0.72 : 0.45}
                  />
                  {thumb ? (
                    <image href={thumb} x={x + slotW / 2 - 10} y={y + 10} width={20} height={20} opacity={0.55} />
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}

      <text x={X0} y={Y0 + 298 + 24} className="sp-shelf-caption">
        {placement.productName} — {placement.levelLabel}, {placement.positionLabel}
        {placement.faceId && placement.faceId !== "A" ? ` · Face ${placement.faceId}` : ""}
      </text>
    </svg>
  );
}
