# Shelf labels + planogram → 3D product parity

**Change ID:** CUF-08b  
**Status:** Implemented (Jul 2026)  
**Related:** CUF-08, [planogram-3d-shelf-view.md](./planogram-3d-shelf-view.md), demo-feedback DF-01

## Problem

### 1. Shelf numbering still wrong

Retail-facing labels should follow **aisle-centric single-letter** format per demo feedback:

| Expected | Current (bug) |
|----------|----------------|
| `4A`, `4B`, `4C` on aisle 4 | `4AA`, `4AB`, `4AC` (double-letter suffix) |
| Gondola **back** on aisle 5 → `5A` | Back shelf indexed on **front aisle** → `4B` |

Root causes:

- `aisleShelfLabel()` uses `labelIndexToSuffix()` (AA, AB…) instead of `shelfLetter()` (A, B…).
- `assignAisleShelfLabels()` groups gondola **units** by the **front** `aisleId` only; the back physical shelf gets the next index on the front aisle instead of its own index on `rearAisleId`.

### 2. Planogram products missing in 3D

After adding products in the 2D planogram editor, **View in 3D** does not show product boxes/images on the focused shelf.

Root causes:

- `planogramFromPhysicalShelf()` always reads `faces[0]` — wrong for double-sided fixtures on face B and for gondola back (merchandising face B, data on physical face A).
- In shelf-focus mode, segment/bay lookup uses merchandising face id (`B`) against a **physical** shelf record that only has segments on face `A` → placements resolve to wrong bays (often empty).
- Non-focused shelves still consume the global `MAX_FACINGS` budget in focus mode, starving the highlighted shelf.

## Solution

### Step 1 — Aisle-centric labels (API + web)

1. Change `aisleShelfLabel(aisleNumber, index)` → `{n}{letter}` e.g. `4A`.
2. Rewrite `assignAisleShelfLabels()` to index **each physical shelf** by its own `aisleId` (sort by projection along that aisle).
3. Mirror the same helpers in `codebase/web/src/layout-editor/shelfFaces.js`.
4. Update tests and UI hints (`4AA` → `4A`).

### Step 2 — Planogram → 3D product rendering

1. `planogramFromPhysicalShelf(layout, shelfId, merchandisingFaceId)` — resolve the correct face record (physical gondola halves always use face `A`; true double-sided fixtures use A/B).
2. Add `segmentFaceIdForShelf(shelf, merchandisingFaceId)` for bay/segment lookups in `Scene3D`.
3. Pass merchandising face into focus planogram resolution.
4. In `shelfFocusMode`, render products **only** on the highlighted shelf.

### Step 4 — Binding + label refresh (Jul 2026 follow-up)

Shelves on aisle 9 showing `14D` / `13F` were bound to the **wrong walk aisle** (often a crossing horizontal aisle). Fixes:

1. **Re-bind on normalize** — every layout load/save runs `finalizeAisleShelfBinding` then `finalizeAisleLabeling`.
2. **Orientation-aware binding** — shelves facing E/W bind only to **vertical** aisles; N/S facing bind only to **horizontal** aisles.
3. **GET /layouts/:id** normalizes in memory so labels refresh on open.
4. **Removed legacy `displayNumber` fallback** on canvas badges — labels are aisle-centric only (`9A`, `9B`, …).


- API: `npm test` in `codebase/api` (`aisle-labeling.test.js`).
- Web: `npm run build` in `codebase/web`.
- Manual: add product on shelf in planogram → **View in 3D** → facings + images visible; labels show `4A`/`5A` on gondola front/back.

## Files touched

| Area | Files |
|------|--------|
| Labels API | `codebase/api/src/services/aisleLabeling.js` |
| Labels web | `codebase/web/src/layout-editor/shelfFaces.js` |
| Labels tests | `codebase/api/test/aisle-labeling.test.js` |
| 3D products | `codebase/web/src/Scene3D.jsx` |
| UI hints | `LayoutEditor.jsx`, `ShelfGotoInput.jsx`, `SmartGeneratePanel.jsx` |

## Acceptance criteria

- [x] Autogen / saved layout: aisle 4 shelves labelled `4A`, `4B`, … (not `4AA`).
- [x] Gondola back bound to aisle 5 shows `5A` (not `4B`).
- [x] Planogram product added in 2D appears as facing mesh (+ image when catalog has image) in 3D focus view.
- [x] Gondola face B and double-sided fixture face B both show correct planogram in 3D.
