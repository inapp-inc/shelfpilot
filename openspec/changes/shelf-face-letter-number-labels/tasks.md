# Tasks — shelf-face-letter-number-labels

## SEED-SL-01 — Label helpers

- [x] `shelfFaceLabel`, `displayNumberToLetter`, `shelfUnitLabel` in API + web `shelfFaces`
- [x] API unit tests for letter mapping and face labels

## SEED-SL-02 — Canvas + legend

- [x] `ShelfBadge` shows A1/A2 format
- [x] `ShelfNumberLegend` uses face labels

## SEED-SL-03 — Panels

- [x] `MerchandisingPanel` face toggles + header
- [x] `PlanogramEditorModal` header
- [x] `PropertiesPanel` unit letter summary
- [x] `LayoutEditor` delete label

## SEED-SL-04 — Face-scoped bay segments

- [x] `faces[].segments` in API normalize + PATCH with `faceId`
- [x] Planogram editor uses active face segments only
- [x] API test: independent segment layouts per face

## Validation

- [x] `npm test` (api)
- [x] `npm run build` (web)
