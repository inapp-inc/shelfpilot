import { categoryLabel } from "../catalog/buildCategoryTree.js";
import { isDoubleSided, isPairedShelf, shelfFaceLabel, shelfUnitLabel } from "./shelfFaces.js";

/** Maps face labels (A1, A2, B1, …) to categories for the active layout. */
export default function ShelfNumberLegend({ layout, categories }) {
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const units = new Map();

  for (const s of shelves) {
    if (!s.displayNumber) continue;
    const letter = shelfUnitLabel(s.displayNumber);
    if (!units.has(letter)) {
      units.set(letter, { displayNumber: s.displayNumber, faces: [] });
    }
    const unit = units.get(letter);

    if (isPairedShelf(s)) {
      const faceId = s.pairRole === "back" ? "B" : "A";
      const categoryId = s.categoryId ?? s.faces?.[0]?.categoryId;
      if (!categoryId) continue;
      unit.faces.push({
        key: `${s.id}-${faceId}`,
        label: shelfFaceLabel(s.displayNumber, faceId),
        categoryId,
        color: s.color ?? s.faces?.[0]?.color,
      });
    } else if (isDoubleSided(s) && s.faces?.length >= 2) {
      for (const face of s.faces) {
        if (!face.categoryId) continue;
        unit.faces.push({
          key: `${s.id}-${face.id}`,
          label: shelfFaceLabel(s.displayNumber, face.id),
          categoryId: face.categoryId,
          color: face.color,
        });
      }
    } else if (s.categoryId) {
      unit.faces.push({
        key: s.id,
        label: shelfFaceLabel(s.displayNumber, "A"),
        categoryId: s.categoryId,
        color: s.color,
      });
    }
  }

  const grouped = [...units.entries()].sort((a, b) => a[1].displayNumber - b[1].displayNumber);
  if (!grouped.some(([, u]) => u.faces.length)) return null;

  return (
    <div className="shelf-number-legend">
      <div className="section-label" style={{ marginBottom: 8 }}>
        Gondola / shelf numbers
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {grouped.map(([letter, unit]) =>
          unit.faces.length ? (
            <div key={letter}>
              <div className="mono" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: "#64748b" }}>
                Gondola {letter}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 4 }}>
                {unit.faces.map((r) => (
                  <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
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
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
