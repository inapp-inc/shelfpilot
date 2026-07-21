# Proposal: Layout editor + planogram redesign

## Why

The current layout editor is a monolithic screen with flat fixtures, aisle semantics mixed into fixture tools, category→fixture mapping only, and no SKU-facing planogram. Merchandising needs reusable components, separate aisle vs shelf configuration, drag-and-drop placement, richer 3D, and dimension-based product facings on shelf fronts.

## What changes

- Refactor Layout Editor into reusable React components under `codebase/web/src/layout-editor/`
- First-class **Aisle** vs **Shelf** models (separate mapping and properties)
- Configure aisle corridor width/space independently of per-shelf height, usable width, and shelf levels
- Drag-and-drop place/move aisles and shelves on the 2D canvas
- **Planogram:** assign products to a shelf face/level; compute max facings from product width × usable shelf width (and levels from heights when present)
- Upgrade Three.js 3D to show shelf levels and facing blocks
- OpenAPI + SQLite contract updates; migrate legacy `fixtures` → `shelves` (keep fixtures array for backward-compatible read during transition)

## Out of scope

- ERP / PIM sync
- CAD/DXF import
- Photoreal materials / VR
- Full bay/slot CAD planogram grid beyond face facings + levels
- Production IdP, Mongo, multi-region HA

## Impact

- New OpenSpec change: `openspec/changes/layout-editor-planogram/`
- Spec deltas: layouts, planogram (new), ui-fidelity
- Contract: `Docs/openapi.yaml` (additive paths/schemas)
- UI: `App.jsx` becomes thin shell; editor modules extracted
- API: layout payload + planogram endpoints; `planogramMath` service
- SEEDs: SEED-LE-00 … SEED-LE-07

## Defaults locked

| Topic | Decision |
|-------|----------|
| Planogram depth | Shelf face + levels; facing count from dimensions |
| Aisle vs shelf | Separate objects; shelves hold category + planogram; aisles hold corridor spacing (+ optional circulation category) |
| Interaction | Palette → canvas DnD |
| 3D | Primary viz upgrade; 2D remains edit surface |

## Parent / related

- Completed demo MVP: `openspec/changes/shelfpilot-mvp/`
- Plan: Layout Planogram Change (approved for docs-first delivery)
