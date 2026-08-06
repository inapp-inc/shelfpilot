import { useEffect, useMemo, useState } from "react";
import { categoryLabel } from "../catalog/buildCategoryTree.js";
import { emojiForCategoryId } from "../storeTypes.js";
import { categoryChipStyle, colorForCategoryId, withAlpha } from "../categoryColors.js";
import { isDoubleSided, isPairedShelf, shelfFaceDisplayLabel } from "./shelfFaces.js";

function buildLegendRows(layout) {
  const aisles = layout?.aisles || [];
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const rows = [];

  for (const s of shelves) {
    const label = shelfFaceDisplayLabel(s, aisles);
    if (!label) continue;

    let categoryId = s.categoryId ?? s.faces?.[0]?.categoryId;
    let color = s.color ?? s.faces?.[0]?.color;

    if (isPairedShelf(s)) {
      categoryId = s.categoryId ?? s.faces?.[0]?.categoryId;
    } else if (isDoubleSided(s) && s.faces?.length >= 2) {
      for (const face of s.faces) {
        if (!face.categoryId) continue;
        const faceLabel = shelfFaceDisplayLabel(
          { ...s, aisleId: s.aisleId, shelfIndexAlongAisle: s.shelfIndexAlongAisle },
          aisles
        );
        rows.push({
          key: `${s.id}-${face.id}`,
          shelfId: s.id,
          label: faceLabel || label,
          categoryId: face.categoryId,
          color: face.color,
          aisleNumber: aisles.find((a) => a.id === s.aisleId)?.aisleNumber ?? 999,
        });
      }
      continue;
    }

    if (!categoryId) continue;
    rows.push({
      key: s.id,
      shelfId: s.id,
      label,
      categoryId,
      color,
      aisleNumber: aisles.find((a) => a.id === s.aisleId)?.aisleNumber ?? 999,
    });
  }

  return rows;
}

/** Maps aisle-centric shelf labels (4A, 4B, …) to categories — clickable for go-to. */
export default function ShelfNumberLegend({ layout, categories, onGoToShelf, selectedShelfId }) {
  const rows = useMemo(() => buildLegendRows(layout), [layout]);

  const sortedAisles = useMemo(() => {
    const byAisle = new Map();
    for (const r of rows) {
      if (!byAisle.has(r.aisleNumber)) byAisle.set(r.aisleNumber, []);
      byAisle.get(r.aisleNumber).push(r);
    }
    for (const items of byAisle.values()) {
      items.sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { numeric: true }));
    }
    return [...byAisle.entries()].sort((a, b) => a[0] - b[0]);
  }, [rows]);

  const [openAisles, setOpenAisles] = useState(() => new Set());

  useEffect(() => {
    if (!selectedShelfId) return;
    const match = rows.find((r) => r.shelfId === selectedShelfId);
    if (!match) return;
    setOpenAisles((prev) => {
      if (prev.has(match.aisleNumber)) return prev;
      const next = new Set(prev);
      next.add(match.aisleNumber);
      return next;
    });
  }, [selectedShelfId, rows]);

  if (!rows.length) return null;

  function toggleAisle(aisleNum) {
    setOpenAisles((prev) => {
      const next = new Set(prev);
      if (next.has(aisleNum)) next.delete(aisleNum);
      else next.add(aisleNum);
      return next;
    });
  }

  const allOpen = sortedAisles.length > 0 && sortedAisles.every(([n]) => openAisles.has(n));

  return (
    <div className="shelf-number-legend">
      <div className="shelf-legend-head">
        <span className="section-label">Shelf numbers by aisle</span>
        {sortedAisles.length > 1 ? (
          <button
            type="button"
            className="shelf-legend-toggle-all"
            onClick={() => {
              if (allOpen) setOpenAisles(new Set());
              else setOpenAisles(new Set(sortedAisles.map(([n]) => n)));
            }}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        ) : null}
      </div>
      <div className="shelf-legend-aisles">
        {sortedAisles.map(([aisleNum, items]) => {
          const open = openAisles.has(aisleNum);
          const hasSelected = items.some((r) => r.shelfId === selectedShelfId);
          const aisleLabel = aisleNum === 999 ? "Unassigned" : `Aisle ${aisleNum}`;

          return (
            <div
              key={aisleNum}
              className={`shelf-legend-aisle${open ? " is-open" : ""}${hasSelected ? " has-selected" : ""}`}
            >
              <button
                type="button"
                className="shelf-legend-aisle-head"
                aria-expanded={open}
                onClick={() => toggleAisle(aisleNum)}
              >
                <span className="shelf-legend-aisle-chevron" aria-hidden>
                  {open ? "▾" : "▸"}
                </span>
                <span className="shelf-legend-aisle-title">{aisleLabel}</span>
                <span className="shelf-legend-aisle-count mono">{items.length}</span>
              </button>
              {open ? (
                <div className="shelf-legend-aisle-body">
                  {items.map((r) => {
                    const emoji = emojiForCategoryId(categories, r.categoryId);
                    const selected = selectedShelfId === r.shelfId;
                    const color = colorForCategoryId(categories, r.categoryId);

                    return (
                      <button
                        key={r.key}
                        type="button"
                        className={`shelf-legend-row${selected ? " is-selected" : ""}`}
                        onClick={() => onGoToShelf?.(r.label)}
                        disabled={!onGoToShelf}
                      >
                        <span className="shelf-legend-emoji category-chip" aria-hidden style={categoryChipStyle(color)}>
                          {emoji}
                        </span>
                        <span
                          className="shelf-legend-label mono"
                          style={{
                            background: withAlpha(color, 0.2),
                            borderColor: color,
                          }}
                        >
                          {r.label}
                        </span>
                        <span className="shelf-legend-category">{categoryLabel(categories, r.categoryId)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
