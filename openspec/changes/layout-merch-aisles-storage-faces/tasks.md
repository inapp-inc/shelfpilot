# Tasks — layout-merch-aisles-storage-faces

**Status:** Approved / Implemented — 2026-07-22

---

## SEED-LM-01 — Category → product listing

- [x] `App.loadCatalog`: fetch all `/products`, filter by vertical category IDs client-side.
- [x] `MerchandisingPanel`: call `onRefreshCatalog` when shelf selection changes.
- [x] `LayoutEditor`: pass `faceId` through `onMapShelf` wrapper to `mapShelf`.
- [x] Empty state + Refresh button + quick-add product for category.
- [ ] **Verify:** Import Excel products → assign category → products appear without page reload.
- [ ] **Verify:** Face B gets different category than Face A on storage/gondola.

## SEED-LM-02 — Planogram arrangement suggestions

- [x] API: `computeSuggestedDepthFacings` + extend `previewFacings` response.
- [x] Merchandising UI: show front facings, depth (backward), levels in “Suggested arrangement”.
- [x] Default facings input from `preview.maxFacings`.
- [ ] **Verify:** Product with width/height/depth in catalog → suggestions match manual calculation.
- [ ] **Verify:** Product without dimensions → defaults + “Using default product size” hint.

## SEED-LM-03 — Visible aisles

- [x] CSS: stronger aisle fill, border, hatch pattern.
- [x] `Canvas2D`: `visibleAisles` filtered by `entityFitsPolygon`.
- [x] Overlap rules (prior change): aisles overlapping shelves dropped, shelves kept.
- [ ] **Verify:** Autogenerate mixed layout → aisles visible between shelf rows.
- [ ] **Verify:** Portrait / irregular polygon → in-polygon aisles still render.
- [ ] **Verify:** Generate toast reports shelf and aisle counts.

## SEED-LM-04 — Dual-face storage

- [x] API: `isDoubleSidedType` includes `"storage"`.
- [x] Merchandising label: “Storage (A/B)” for storage type.
- [x] Face A/B toggle for any `doubleSided` shelf (existing).
- [ ] **Verify:** Autogen produce → storage shelves show 1A/1B badges.
- [ ] **Verify:** Separate products on Face A vs Face B persist after save/reload.

## SEED-LM-05 — Docs, tests, build

- [x] OpenSpec change folder (this document set).
- [x] `FSD_DELTA.md` for downstream doc fold.
- [x] Update `Docs/openapi.yaml` preview response fields.
- [x] API tests: `layout-merch.test.js` (depth preview, storage dual-face, Face B mapping).
- [x] Product catalog: depth (m) field for accurate backward suggestions.
- [x] Run `npm test` (api) — 67 pass.
- [x] Run `npm run build` (web).
- [ ] Manual browser verification (see checklist below).

---

## Suggested verification order

1. Catalog: add 3 products under “Snacks” → open layout → assign Snacks → all 3 in picker.
2. Pick product → confirm three suggestion numbers → Add placement.
3. Generate layout → confirm aisles visible → zoom in on corridor.
4. Select storage shelf → map category on A, different category on B → place products on each face.
