import { categoryLabel } from "../catalog/buildCategoryTree.js";
import { emojiForCategory } from "../storeTypes.js";
import { isDoubleSided, isPairedShelf, shelfFaceDisplayLabel } from "./shelfFaces.js";

/** Maps aisle-centric shelf labels (4A, 4B, …) to categories — clickable for go-to. */
export default function ShelfNumberLegend({ layout, categories, onGoToShelf, selectedShelfId }) {
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

  if (!rows.length) return null;

  const byAisle = new Map();
  for (const r of rows) {
    const k = r.aisleNumber;
    if (!byAisle.has(k)) byAisle.set(k, []);
    byAisle.get(k).push(r);
  }

  const sortedAisles = [...byAisle.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div className="shelf-number-legend">
      <div className="section-label" style={{ marginBottom: 8 }}>
        Shelf numbers by aisle
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sortedAisles.map(([aisleNum, items]) => (
          <div key={aisleNum}>
            <div className="mono" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: "#64748b" }}>
              Aisle {aisleNum === 999 ? "—" : aisleNum}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 4 }}>
              {items.map((r) => {
                const cat = categories?.find((c) => c.id === r.categoryId);
                const emoji = emojiForCategory(r.categoryId, cat?.name, cat?.temperatureZone);
                const selected = selectedShelfId === r.shelfId;
                return (
                  <button
                    key={r.key}
                    type="button"
                    className="shelf-legend-row"
                    onClick={() => onGoToShelf?.(r.label)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: selected ? "1px solid #A30A2A" : "1px solid transparent",
                      background: selected ? "rgba(163,10,42,0.08)" : "transparent",
                      cursor: onGoToShelf ? "pointer" : "default",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <span style={{ fontSize: 14 }} aria-hidden>
                      {emoji}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontWeight: 700,
                        minWidth: 32,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: r.color ? `${r.color}33` : "rgba(163,10,42,0.12)",
                        border: `1px solid ${r.color || "#A30A2A"}`,
                      }}
                    >
                      {r.label}
                    </span>
                    <span>{categoryLabel(categories, r.categoryId)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
