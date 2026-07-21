import { categoryLabel } from "../catalog/buildCategoryTree.js";

/** Responsive shelf number badge for 2D canvas. */
export default function ShelfBadge({ shelf, pixelWidth, categories }) {
  const num = shelf.displayNumber;
  if (!num) return null;

  const w = pixelWidth || 48;
  const tooltipParts = [`#${num}`];
  if (shelf.faces?.length) {
    for (const face of shelf.faces) {
      const cat = face.categoryId ? categoryLabel(categories, face.categoryId) : "Unassigned";
      tooltipParts.push(`Face ${face.id}: ${cat}`);
    }
  }
  const title = tooltipParts.join(" · ");

  if (shelf.doubleSided && shelf.faces?.length >= 2) {
    const faceA = shelf.faces.find((f) => f.id === "A") || shelf.faces[0];
    const faceB = shelf.faces.find((f) => f.id === "B") || shelf.faces[1];

    if (w < 36) {
      return (
        <span className="mono shelf-badge-compact" title={title} style={{ fontSize: 9, fontWeight: 700, color: "#1f2933" }}>
          {num}
          <span style={{ display: "inline-flex", gap: 2, marginLeft: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: faceA?.color || "#A30A2A" }} />
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: faceB?.color || "#0ea5e9" }} />
          </span>
        </span>
      );
    }

    if (w < 56) {
      return (
        <div className="shelf-badge-stacked" title={title} style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
          <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "#1f2933", background: faceA?.color ? `${faceA.color}44` : "rgba(163,10,42,0.15)", padding: "1px 4px", borderRadius: 3 }}>
            {num}A
          </span>
          <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "#1f2933", background: faceB?.color ? `${faceB.color}44` : "rgba(14,165,233,0.15)", padding: "1px 4px", borderRadius: 3, marginTop: 1 }}>
            {num}B
          </span>
        </div>
      );
    }

    return (
      <div title={title} style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}>
        <span
          className="mono"
          style={{
            flex: 1,
            textAlign: "center",
            padding: "2px 0",
            background: faceA?.color ? `${faceA.color}44` : "rgba(163,10,42,0.15)",
            color: "#1f2933",
            borderRight: "1px solid rgba(31,41,51,0.15)",
          }}
        >
          {num}A
        </span>
        <span
          className="mono"
          style={{
            flex: 1,
            textAlign: "center",
            padding: "2px 0",
            background: faceB?.color ? `${faceB.color}44` : "rgba(14,165,233,0.15)",
            color: "#1f2933",
          }}
        >
          {num}B
        </span>
      </div>
    );
  }

  const fontSize = w < 36 ? 9 : w < 48 ? 10 : 11;
  return (
    <span className="mono" title={title} style={{ fontSize, fontWeight: 700, color: "#1f2933" }}>
      {num}
    </span>
  );
}
