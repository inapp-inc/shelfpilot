# Tasks — demo-enhancements-images-dashboard

## SEED-DE-01 — Delete layout API
- [ ] `repo.deleteLayout(id)` (layout + versions/snapshots).
- [ ] `DELETE /layouts/:layoutId` (Designer/Admin), 404 unknown, 403 Viewer.
- [ ] OpenAPI + test (success, 404, 403, cascade).

## SEED-DE-02 — Portfolio delete
- [ ] Card gains trash button (stopPropagation + confirm) → `onDeleteLayout(id)`.
- [ ] App wires `deleteLayout` → refresh list + toast.

## SEED-DE-03 — Editor delete
- [ ] Header `Delete layout` → confirm → DELETE → navigate `/layouts` + refresh.

## SEED-DE-04 — Zone resize on canvas
- [ ] `Canvas2D` resize handles for selected zone (edit mode).
- [ ] Live preview + clamp inside polygon; commit `PATCH /zones/{id}`.

## SEED-DE-05 — Aisle resize on canvas
- [ ] Aisle PATCH accepts `lengthMeters` (+ orientation-aware containment).
- [ ] `Canvas2D` handles for aisle width/length; clamp; commit.

## SEED-DE-06 — Analytics metrics
- [ ] `computeAnalytics`: `usableAreaSqm`, `freeSpacePercent`, `facingsTotal`, `facingsByCategory`.
- [ ] Test the new math.

## SEED-DE-07 — Dashboard charts
- [ ] Layout picker + fetch per-layout summary.
- [ ] `DonutChart` / `BarChart` SVG components (no new dependency).
- [ ] Free space, category fill, facings charts + KPIs + empty state.

## SEED-DE-08 — Product imageUrl (model + API)
- [ ] `product.imageUrl` on POST/PATCH + `repo.upsertProduct`; mirror to `attributes.imageUrl`.

## SEED-DE-09 — Product form Save/Cancel + image upload
- [ ] Sticky, aligned footer buttons.
- [ ] Image upload (drag/drop + browse), client-resize to ≤256px data URL, thumbnail, remove, or paste URL.

## SEED-DE-10 — Import images
- [ ] `imageUrl` column in parser + template (external URL).

## SEED-DE-11 — 3D product images
- [ ] Thread `products` into `Scene3D`; texture planes on shelves per placement; cache; fallback.

## SEED-DE-12 — Docs & validation
- [ ] Fold spec deltas into `openspec/specs/*`.
- [ ] Update `Docs/FSD_ShelfPilot.md` + OpenAPI.
- [ ] `npm test` (api) + `npm run build` (web) + `docker compose build --no-cache`.

## Notes
- Web has no unit-test runner (`npm test` is a smoke stub); web items verified by lint + build + manual.
- Image storage decision: client-resized data URL for uploads + accept external URLs (see design.md). Confirm before implementing SEED-DE-08/09/10.
```
