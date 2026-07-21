# Tasks: catalog-merch-ui-v2

## SEED-CM-00 — Vertical sync + catalog scoping
- [x] Sync shell vertical to `layout.vertical` when editor opens
- [x] Load categories/products using layout vertical in editor context
- [x] Show vertical badge in editor header

## SEED-CM-01 — Shared category utilities & picker
- [x] `buildCategoryTree.js`
- [x] `CategoryTreePicker` with parent/child optgroups

## SEED-CM-02 — Catalog category CRUD UI
- [x] Category tree sidebar with selection state
- [x] `CategoryFormDrawer` wired to `POST /categories`
- [x] Filter product table by selected category (+ descendants)

## SEED-CM-03 — Product drawer (create/edit)
- [x] `ProductFormDrawer` replaces inline form
- [x] Hierarchical category field, dimension fields
- [x] Table shows category name not id

## SEED-CM-04 — Editor tabbed merchandising rail
- [x] `EditorSideRail` with Properties / Merchandising tabs
- [x] `MerchandisingPanel` stepper (category → planogram by level)

## SEED-CM-05 — Quick-add + demo seed docs
- [x] Quick-add product CTA in MerchandisingPanel
- [x] HANDOVER mentions `npm run seed:demo`

## SEED-CM-06 — Validation
- [x] `npm test` — 25 passed
- [x] Baseline specs updated (`catalog`, `ui-fidelity`)
