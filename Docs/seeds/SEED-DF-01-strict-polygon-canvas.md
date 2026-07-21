# SEED-DF-01 — Strict polygon canvas viewport

**Change:** `dual-face-numbered-shelves-strict-polygon` · **Status:** Pending review

## Scope
- New `polygonCanvas.js`: AABB, coord translate, point-in-polygon
- `Canvas2D.jsx`: stage = polygon AABB when polygon present
- Dim overlay outside polygon; reject drops outside zone
- Grid scoped to active fixture area

## Acceptance
- L-shaped layout: canvas does not show full 40×30 empty margin as active grid
- Palette drop outside dashed line is rejected
- Existing wheel-zoom works on new viewport

## Evidence
- Manual: draw irregular polygon → verify canvas crops to drawn bounds
- Component test for AABB helper (if feasible)
