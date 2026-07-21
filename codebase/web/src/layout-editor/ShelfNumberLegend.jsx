import { categoryLabel } from "../catalog/buildCategoryTree.js";

/** Maps display numbers (+ face suffix) to categories for the active layout. */
export default function ShelfNumberLegend({ layout, categories }) {
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const rows = [];

  for (const s of shelves) {
    if (!s.displayNumber) continue;
    if (s.doubleSided && s.faces?.length >= 2) {
      for (const face of s.faces) {
        if (!face.categoryId) continue;
        rows.push({
          key: `${s.id}-${face.id}`,
          label: `${s.displayNumber}${face.id}`,
          categoryId: face.categoryId,
          color: face.color,
        });
      }
    } else if (s.categoryId) {
      rows.push({
        key: s.id,
        label: String(s.displayNumber),
        categoryId: s.categoryId,
        color: s.color,
      });
    }
  }

  if (!rows.length) return null;

  return (
    <div className="shelf-number-legend">
      <div className="section-label" style={{ marginBottom: 8 }}>
        Shelf numbers
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map((r) => (
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
  );
}
