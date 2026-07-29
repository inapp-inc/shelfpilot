# FSD delta — shelf-planogram-visual-editor

Target: `Docs/FSD_ShelfPilot.md` (apply after change approved + implemented)

## Epic F4 — Planogram / Merchandising (ADD / MODIFY)

- **F4-visual** When a shelf or storage fixture is selected, the Designer SHALL have an
  **Open Planogram** action opening a **visual planogram editor**.
- **F4-levels** The editor SHALL display **one row per shelf level**, showing products
  placed on that level as proportional blocks.
- **F4-bays** The editor SHALL support **horizontal bay splits** (segments) along the
  shelf usable width; each bay MAY have independent products and **front facing counts**.
- **F4-face** Dual-face fixtures (storage, gondola) SHALL show a **Face A / Face B**
  toggle in the planogram editor; segments are shared, planograms are face-scoped.
- **F4-split-actions** Designer can **split equally**, **customize bay widths**, **merge
  bays**, and set **fill mode** (`full` | `partial`) per segment.
- **F4-item-count** When adding a product to a bay, the Designer specifies **front facings**
  (items across) and **depth facings** (items deep / backstock); the system suggests max
  capacity from product and shelf dimensions.

## Epic C — Layout Editor / Canvas (MODIFY)

- **C-planogram-entry** Merchandising and Properties panels expose **Open Planogram**
  for shelf-like fixtures (`shelf`, `rack`, `gondola`, `storage`).

## OpenAPI (additive)

- Planogram preview request: optional `segmentId`.
- Planogram POST body: optional `depthFacings` (clamped to maxDepthFacings).
- `PlanogramPlacement`: `depthFacings`, `maxDepthFacings`, `faceId`, `segmentId`.
- `ShelfSegment`: optional `label` (if approved in REVIEW.md).
- `ShelfPatch.segments`: document array update for bay split from planogram editor.

## Acceptance additions (traceability)

| ID | Criterion |
|----|-----------|
| PE-AC-1 | Open Planogram on selected shelf opens level × bay grid |
| PE-AC-2 | Product placed on Level 2 Bay 3 appears only in that cell |
| PE-AC-3 | Equal 3-way split updates max facings to 1/3 shelf width |
| PE-AC-4 | Face B planogram independent of Face A on same shelf |
| PE-AC-5 | Read-only layout opens view-only planogram editor |
