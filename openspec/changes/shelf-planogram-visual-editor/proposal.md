# Proposal: Shelf planogram visual editor

**Status:** Draft — pending review (2026-07-24)

**Source:** Layout merchandising feedback — users need a dedicated planogram view when selecting a shelf or storage fixture, not only the compact Merchandising side panel.

## Summary

When a Designer selects a **shelf** or **storage** fixture on the layout canvas, the editor SHALL offer an **Open Planogram** action that opens a **visual planogram editor**. The editor shows the fixture **level by level** (horizontal shelf rows), displays **products placed on each level**, and supports **horizontal bay splits** along the shelf width so each segment can hold its own products and **item (facing) counts**.

This change is primarily **UI/UX** — it builds on existing planogram APIs (`POST .../planogram`, preview, `segmentId`, `faceId`, per-level placements) and completes the bay-split workflow started in `layout-dimensions-rotation-shelf-bays` (SEED-LD-05/06).

## Problems today

| # | Problem | Current behaviour |
|---|---------|-------------------|
| 1 | No dedicated planogram view | Merchandising tab is a **form** (dropdown level → product → facings → Add). Users cannot see the full shelf at a glance. |
| 2 | Levels are abstract | Level selector is a `<select>`; no visual row per shelf tier with product blocks. |
| 3 | Bay splits are invisible in merch flow | Segment API exists (`shelf.segments[]`, canvas dividers) but Merchandising panel does **not** expose split controls or segment-scoped placement. |
| 4 | Item counts hard to reason about | Facings shown as `3/6` text; no proportional blocks showing how much of each bay is filled. |
| 5 | Storage dual-face unclear in planogram | Face A/B toggle exists in Merchandising but there is no face-specific **visual** planogram grid. |

## Deliverables

### 1. Open Planogram entry point

- When a **shelf** or **storage** fixture is selected, show **Open Planogram** in:
  - Merchandising panel header (primary CTA), and
  - Properties panel footer (secondary shortcut).
- Button disabled when layout is read-only (submitted/reviewed per existing `editDisabled` rules).
- Opens the planogram editor for the **currently selected shelf**; preserves canvas selection underneath.

### 2. Visual planogram editor (level grid)

- **Modal overlay** (recommended default — see REVIEW.md) covering the editor workspace; dismiss via Close / Esc; layout canvas remains visible dimmed behind.
- Header: shelf `#displayNumber`, type label, usable width × depth, active **Face A / Face B** toggle (dual-face fixtures).
- Body: one **horizontal row per shelf level** (bottom = floor / level 0), stacked top-to-bottom like a real fixture.
- Each row shows:
  - Level label + optional height-from-floor readout.
  - **Bay segments** as vertical columns (from `shelf.segments[]`).
  - **Product blocks** inside each segment: name/SKU, facings count, fill bar (`facings / maxFacings`).
  - Empty segment: dashed placeholder + “Add product”.
- Footer summary: total SKUs, total facings, unused width warnings per segment (`fillMode: full`).

### 3. Horizontal bay split (segment management)

- **Drag dividers** on the visual grid between bay columns to resize segments (primary interaction per review).
- Snap dividers to **0.05 m** increments; live width readout while dragging.
- Toolbar secondary actions: **Equal split (N)**, **Merge all**, reset to full width.
- Split modes:
  - **Drag** — reposition vertical boundaries between bays on any level row (updates all levels).
  - **Equal split** — choose N bays (2–12); creates equal-width segments (uses `buildEqualSegments`).
  - **Custom widths** — fallback numeric editor in toolbar when drag is imprecise.
- Per-segment controls:
  - **Fill mode** toggle (`full` | `partial`).
  - Optional **label** (e.g. “Promo”, “Bay 2”) — stored on segment if approved in REVIEW.md.
- Segments are **shared across Face A and Face B** on the same physical shelf (same as SEED-LD-06 decision); planogram placements remain face-scoped.

### 4. Product placement per level × segment

- Click empty segment cell → product picker (filtered by face category + descendants).
- Preview API called with `{ shelfId, productId, levelIndex, faceId, segmentId }` → show suggested **front facings**, **depth**, **levels** (from existing preview fields).
- User sets **front facings** and **depth facings (backstock)**; Add persists via planogram POST.
- Product block shows `facings × depthFacings` (e.g. `4 wide × 3 deep`) and total unit hint.
- Click existing product block → inline edit facings or Remove.
- Multiple products per segment on the same level: **v1 = one SKU per segment per level** (see REVIEW.md); additional SKUs require another bay or level.

### 5. Documentation & API alignment

- OpenAPI: document `segmentId` on planogram **preview** request; `faceId` + `segmentId` on `PlanogramPlacement` response; add **`depthFacings`** / **`maxDepthFacings`** on placement (new fields per Q3).
- Optional `label` on `ShelfSegment` if approved.
- FSD delta, spec deltas, SEED units, tasks checklist.

## SEED units

| ID | Scope |
|----|-------|
| SEED-PE-01 | Open Planogram entry + modal shell + face toggle |
| SEED-PE-02 | Level-row visual grid + product blocks + empty states |
| SEED-PE-03 | Bay split toolbar (equal/custom/merge) + PATCH segments |
| SEED-PE-04 | Segment-scoped add/edit/remove + preview with segmentId |
| SEED-PE-05 | OpenAPI/FSD delta, tests, manual verification checklist |

## Success criteria

- Select storage shelf `#3` → **Open Planogram** → modal shows all levels for Face A with segment columns.
- Split 3.6 m shelf into 3 bays → each bay shows independent max facings when adding a product.
- Place product on Level 1, Bay 2 with 4 facings → block appears in correct cell; 3D view unchanged (existing planogram data).
- Switch to Face B → separate planogram grid; segments layout unchanged.
- Read-only layout → Open Planogram shows grid but Add/Split disabled.
- API tests pass; web build succeeds.

## Non-goals (v1)

- Drag-and-drop reorder of product blocks along a shelf row (form/tap based only).
- Automatic planogram fill / AI assortment optimization.
- Vertical splits (shelf height zones) — levels already cover vertical separation.
- Separate segment layouts per face (physical bays are shared).
- Planogram editor for **aisles** (category mapping only; no planogram).
- Print/export planogram PDF (future).

## Relationship to prior changes

| Prior change | Relationship |
|--------------|--------------|
| layout-dimensions-rotation-shelf-bays | Segment model + API; this change delivers the **visual editor** and completes merch UX |
| layout-merch-aisles-storage-faces | Dual-face storage, preview suggestions; editor consumes same APIs |
| layout-editor-planogram | Original per-level planogram; superseded in editor by visual modal (Merchandising tab remains for quick category assign) |
| dual-face-numbered-shelves-strict-polygon | Face A/B planogram scoping |

See [design.md](./design.md), [REVIEW.md](./REVIEW.md), and [tasks.md](./tasks.md).
