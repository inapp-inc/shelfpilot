# Tasks — shelf-planogram-visual-editor

**Status:** Draft — pending REVIEW.md approval

---

## SEED-PE-01 — Open Planogram entry + modal shell

- [ ] Add `planogramEditor` state to `LayoutEditor.jsx` (`{ shelfId, faceId }`).
- [ ] **Open Planogram** button in `MerchandisingPanel.jsx` when shelf/storage selected.
- [ ] Secondary **Open Planogram** in `PropertiesPanel.jsx`.
- [ ] Create `PlanogramEditorModal.jsx`: header (shelf #, dimensions), Face A/B toggle, Close/Esc.
- [ ] Modal styles in `styles.css` (overlay, focus trap, responsive min-width).
- [ ] Disable entry when `editDisabled`; read-only grid when opened on submitted layout.

## SEED-PE-02 — Level-row visual grid

- [ ] `PlanogramLevelGrid.jsx` — render levels bottom-up (level 0 = floor).
- [ ] `PlanogramSegmentRow.jsx` — proportional segment columns from `shelf.segments[]`.
- [ ] `PlanogramProductBlock.jsx` — SKU name, facings/maxFacings bar, category color.
- [ ] Empty cell placeholder + click to add.
- [ ] Footer summary: level count, bay count, placement count, fill warnings.

## SEED-PE-03 — Bay split toolbar

- [ ] `SegmentSplitControls.jsx` — drag dividers on grid, Equal split (2–12), merge all
- [ ] Drag handles between bay columns; snap 0.05 m; min bay width 0.2 m.
- [ ] PATCH shelf `segments` via existing `onPatchShelf`.
- [ ] Per-segment fill mode toggle (`full` | `partial`).
- [ ] Optional segment `label` field (if REVIEW Q5 = Yes).
- [ ] Re-split confirmation when placements would be orphaned.
- [ ] Canvas segment dividers remain in sync (existing `Canvas2D.jsx` behaviour).

## SEED-PE-04 — Segment-scoped placement

- [ ] Pass `segmentId` to planogram preview API from modal.
- [ ] Add/edit/remove placements with `{ faceId, levelIndex, segmentId, facings, depthFacings }`.
- [ ] API: persist `depthFacings` / `maxDepthFacings` on planogram placement.
- [ ] Enforce one SKU per bay per level (v1) with replace prompt.
- [ ] Show preview suggestions: front facings, depth, levels (from existing preview response).
- [ ] API test: preview with `segmentId` returns segment-scoped `maxFacings`.

## SEED-PE-05 — Docs, OpenAPI, validation

- [ ] Update `Docs/openapi.yaml` — preview `segmentId`, placement `faceId`/`segmentId`, segment `label`.
- [ ] Author spec deltas (this folder); fold to canonical on closeout.
- [ ] Apply `FSD_DELTA.md` to `Docs/FSD_ShelfPilot.md` on closeout.
- [ ] Manual verification checklist (see below).
- [ ] Run `npm test` (api) and `npm run build` (web).

---

## Manual verification checklist

- [ ] Select gondola → Open Planogram → all levels visible with empty bays.
- [ ] Assign category on Face A → add product on Level 1 Bay 1 → block appears.
- [ ] Split into 3 equal bays → max facings on Bay 2 reflects 1/3 shelf width.
- [ ] Switch Face B → different products; same bay layout.
- [ ] Partial fill bay → hatched unused space shown.
- [ ] Re-split with existing placements → confirmation dialog works.
- [ ] Read-only layout → modal opens view-only; no edits.
- [ ] 3D view still renders planogram from same data.

---

## Traceability

| Spec ref | SEED | Primary files |
|----------|------|---------------|
| Open Planogram action | PE-01 | MerchandisingPanel, PropertiesPanel, LayoutEditor |
| Level visual grid | PE-02 | PlanogramEditorModal, PlanogramLevelGrid |
| Bay split | PE-03 | SegmentSplitControls, layouts PATCH |
| Segment placement | PE-04 | PlanogramEditorModal, planogram routes |
| OpenAPI | PE-05 | Docs/openapi.yaml |

## Dependencies

| Dependency | Status |
|------------|--------|
| SEED-LD-05 segment API | Done |
| SEED-LD-06 bay split (canvas) | Partial — canvas dividers exist; merch panel incomplete |
| layout-merch dual-face + preview | Done |
