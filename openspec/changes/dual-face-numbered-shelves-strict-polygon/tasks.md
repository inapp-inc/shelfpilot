# Tasks: dual-face-numbered-shelves-strict-polygon

**Status:** Implemented

## SEED-DF-00 — Shelf schema + OpenAPI v0.7
- [ ] `displayNumber`, `doubleSided`, `faces[]` on Shelf
- [ ] Planogram `faceId` on POST body
- [ ] `layoutNormalize.js` face synthesis

## SEED-DF-01 — Strict polygon canvas
- [ ] Polygon AABB viewport; coordinate translate
- [ ] Dim exterior; clicks only inside polygon
- [ ] Grid scoped to active zone

## SEED-DF-02 — Numbered shelf badges
- [ ] Remove type labels from Canvas2D
- [ ] Render `12` / `12A` / `12B` with category colors
- [ ] Shelf number legend component

## SEED-DF-03 — Dual-face autogen
- [ ] Sequential displayNumber in packer
- [ ] Gondola → two faces + category from mix
- [ ] Extend categoryMixPacker for face assignment

## SEED-DF-04 — Merchandising dual-face UI
- [ ] Face A / B selector in MerchandisingPanel
- [ ] Planogram scoped per face

## SEED-DF-05 — Containment hardening
- [ ] Verify grid sampling packer (baseline merged)
- [ ] Autogen response includes `skippedOutsideCount`
- [ ] Zero violations test on L-shape + user polygons

## SEED-DF-06 — Validation & docs
- [ ] API + E2E tests
- [ ] Fold spec deltas; FSD §5f; HANDOVER
