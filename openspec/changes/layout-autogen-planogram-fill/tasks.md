# Tasks — layout-autogen-planogram-fill

## SEED-CF-13 — Planogram auto-fill (API)

- [x] `planogramAutoFill.js` — fill shelf faces from category-matched products
- [x] Hook into `POST /layouts/{id}/autogenerate` when category mix + `fillPlanogram`
- [x] Return `planogramPlacements` count in `generated` block

## SEED-CF-14 — Missing products (API + web)

- [x] `planogramCoverage.js` — compute placed vs missing SKUs
- [x] `GET /layouts/{id}/planogram/coverage`
- [x] Layout editor panel: missing products list + refresh after autogen

## SEED-CF-15 — 3D walk avatar (web)

- [x] Replace `buildWalkerAvatar` with proportioned human figure + walk cycle
