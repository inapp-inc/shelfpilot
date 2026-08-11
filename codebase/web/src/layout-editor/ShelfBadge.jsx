import { categoryLabel } from "../catalog/buildCategoryTree.js";
import { colorForShelfFace, withAlpha } from "../categoryColors.js";
import {
  isDoubleSided,
  isPairedShelf,
  normalizeShelfUI,
  pairFaceId,
  shelfCanvasFaceLabel,
  shelfDisplayLabel,
  shelfFaceDisplayLabel,
  shelfFaceLabel,
} from "./shelfFaces.js";

/** Responsive shelf face label badge for 2D canvas (aisle-centric: 4A, 4B). */
export default function ShelfBadge({ shelf: rawShelf, pixelWidth, categories, aisles, allShelves }) {
  const shelf = normalizeShelfUI(rawShelf);
  const w = pixelWidth || 48;
  const colorA = colorForShelfFace(shelf, "A", categories);
  const colorB = colorForShelfFace(shelf, "B", categories);
  const badgeBg = (color, fallback) => (color ? withAlpha(color, 0.28) : fallback);

  if (isPairedShelf(shelf)) {
    const face = pairFaceId(shelf);
    const label =
      shelfFaceDisplayLabel(shelf, aisles) ||
      shelfCanvasFaceLabel(shelf, face, aisles, allShelves) ||
      "—";
    const cat = shelf.categoryId ? categoryLabel(categories, shelf.categoryId) : "Unassigned";
    const role = shelf.pairRole === "back" ? "back" : "front";
    const title = `${label} · ${role} · ${cat}`;
    const fontSize = w < 36 ? 9 : w < 48 ? 10 : 11;
    const bg = badgeBg(
      colorA,
      face === "B" ? "rgba(14,165,233,0.18)" : "rgba(163,10,42,0.15)"
    );
    return (
      <span
        className="mono"
        title={title}
        style={{
          fontSize,
          fontWeight: 700,
          color: "#1f2933",
          background: bg,
          padding: "1px 4px",
          borderRadius: 3,
        }}
      >
        {label}
      </span>
    );
  }

  const labelA = shelfCanvasFaceLabel(shelf, "A", aisles, allShelves);
  const labelB = shelfCanvasFaceLabel(shelf, "B", aisles, allShelves);
  const tooltipParts = [labelA];
  if (shelf.faces?.length) {
    for (const face of shelf.faces) {
      const cat = face.categoryId ? categoryLabel(categories, face.categoryId) : "Unassigned";
      const lbl = face.id === "B" ? labelB : labelA;
      tooltipParts.push(`${lbl}: ${cat}`);
    }
  }
  const title = tooltipParts.join(" · ");

  if (isDoubleSided(shelf) && shelf.faces?.length >= 2) {
    if (w < 36) {
      return (
        <span className="mono shelf-badge-compact" title={title} style={{ fontSize: 9, fontWeight: 700, color: "#1f2933" }}>
          {String(labelA ?? "—").replace(/[A-Z]$/, "")}
          <span style={{ display: "inline-flex", gap: 2, marginLeft: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: colorA || "#A30A2A" }} />
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: colorB || "#0ea5e9" }} />
          </span>
        </span>
      );
    }

    if (w < 56) {
      return (
        <div className="shelf-badge-stacked" title={title} style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
          <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "#1f2933", background: badgeBg(colorA, "rgba(163,10,42,0.15)"), padding: "1px 4px", borderRadius: 3 }}>
            {labelA}
          </span>
          <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "#1f2933", background: badgeBg(colorB, "rgba(14,165,233,0.15)"), padding: "1px 4px", borderRadius: 3, marginTop: 1 }}>
            {labelB}
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
            background: badgeBg(colorA, "rgba(163,10,42,0.15)"),
            color: "#1f2933",
            borderRight: "1px solid rgba(31,41,51,0.15)",
          }}
        >
          {labelA}
        </span>
        <span
          className="mono"
          style={{
            flex: 1,
            textAlign: "center",
            padding: "2px 0",
            background: badgeBg(colorB, "rgba(14,165,233,0.15)"),
            color: "#1f2933",
          }}
        >
          {labelB}
        </span>
      </div>
    );
  }

  const singleLabel = shelfDisplayLabel(shelf, aisles);
  const fontSize = w < 36 ? 9 : w < 48 ? 10 : 11;
  return (
    <span className="mono" title={title} style={{ fontSize, fontWeight: 700, color: "#1f2933" }}>
      {singleLabel}
    </span>
  );
}
