# SEED-DR-01 — Baseline spec consolidation

**Status:** Done (applied 2026-07-15)

## Goal
Make `openspec/specs/**` the single source of truth by folding implemented LE/AG/ML behavior into baselines.

## Deltas (staged)
- `planogram` — category-gated placement, category+children filter, per-level products, shelf-type default levels.
- `layouts` — first-class shelves/aisles, polygon draw + strict containment, rules autogenerate.
- `catalog` — product update (`PATCH /products/{id}`).
- `ui-fidelity` — draw area, Generate, Orbit/Walk 3D, 2D wheel-zoom, per-level planogram panel.

## Acceptance
- A reviewer reading only baseline specs sees current behavior.
- Deltas map 1:1 to shipped API errors (`shelf_category_required`, `containment_violation`) and flags.
