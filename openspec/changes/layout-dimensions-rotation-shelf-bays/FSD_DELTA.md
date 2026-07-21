# FSD delta — layout-dimensions-rotation-shelf-bays

Target: `Docs/FSD_ShelfPilot.md` (apply after change approved + implemented)

## Epic C — Layout Editor / Canvas (MODIFY)

- **C-dim** Selected fixtures display **physical dimensions** on canvas and in the
  selection bar: aisles show run length × width; shelves show usable width × depth
  (× height in Properties).
- **C-contain** Dragging fixtures respects the drawn polygon on the client; shelves
  outside the polygon remain **visible with violation styling** until corrected.
- **C-rotate** Shelves can be rotated to **any angle** (0–359°); footprint containment
  uses rotated corners; 2D and 3D views reflect rotation.
- **C-badge** Shelf number badges scale for small fixtures; dual-face labels remain
  readable (stacked/compact modes + tooltips).

## Epic F4 — Planogram / Merchandising (ADD)

- **F4-split** A shelf MAY be divided into **segments (bays)** along its usable width,
  each with `fillMode` (`full` | `partial`).
- Planogram placement MAY target a **segment**; facing capacity is computed from
  segment width, not the full shelf run.
- Designer can split/merge segments from the Merchandising panel.

## Epic F3 — Smart Autogenerate (UNCHANGED)

- Autogenerate continues to place shelves at 0° / 90° only; arbitrary rotation is
  manual post-generate.

## OpenAPI (additive — minor)

- `Shelf.rotationDeg`: document full 0–360 range.
- `ShelfSegment` schema; `Shelf.segments[]`.
- Planogram POST: optional `segmentId`.
- Errors: `segment_overlap`, `segment_out_of_range`.

## Acceptance additions (traceability)

| ID | Criterion |
|----|-----------|
| LD-AC-1 | Aisle dimensions visible without hover on selected or labelled aisle |
| LD-AC-2 | No shelf can be left outside drawn polygon after drag without visible violation |
| LD-AC-3 | 45° rotated shelf persists and passes containment when inside polygon |
| LD-AC-4 | 3-segment shelf computes independent max facings per segment |
