/** Independent category mapping for aisle vs shelf. */
export default function CategoryMappingPanel({
  selection,
  layout,
  categories,
  editDisabled,
  onMapAisle,
  onMapShelf,
}) {
  const cats = categories || [];

  let kind = null;
  let entity = null;
  if (selection?.kind === "aisle") {
    kind = "aisle";
    entity = (layout.aisles || []).find((a) => a.id === selection.id);
  } else if (selection?.kind === "shelf" || selection?.kind === "fixture") {
    kind = "shelf";
    entity = (layout.shelves || layout.fixtures || []).find((s) => s.id === selection.id);
  }

  return (
    <div className="props-panel">
      <div className="section-label">Category mapping</div>
      {!entity ? (
        <div className="muted" style={{ fontSize: 12.5, fontStyle: "italic" }}>
          Select an aisle or shelf to map a category (mapped separately).
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Mapping target: <strong>{kind}</strong>
          </div>
          <select
            disabled={editDisabled}
            value={entity.categoryId || ""}
            onChange={(e) => {
              const cat = cats.find((c) => c.id === e.target.value);
              if (!cat) return;
              if (kind === "aisle") onMapAisle(entity.id, cat.id, cat.color);
              else onMapShelf(entity.id, cat.id, cat.color);
            }}
            style={{ padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb" }}
          >
            <option value="">Unmapped</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="section-label" style={{ marginTop: 8 }}>
            Legend
          </div>
          {cats.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
              <span style={{ fontSize: 12.5 }}>{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
