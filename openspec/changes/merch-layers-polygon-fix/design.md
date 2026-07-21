# Design: Product CRUD · polygon-tight autogen · 2D zoom · multi-layer planogram

## Platform-fit

Demo stack unchanged. No ADR-0017. Reuse guide documents future packaging without changing Day-1 persistence.

## Patterns considered

| Pattern | Choice | Rationale |
|---------|--------|-----------|
| Strategy | **Chosen** — packer + shelf-type level templates | Domain reuse |
| Repository | **Chosen** — product update via existing store | Consistency |
| Adapter | **Chosen** — auth/token adapter called out for reuse | Embed in other apps |
| Soft delete | **Deferred** | Out of scope this change |
| Event bus for catalog | **Rejected** | Overkill for demo |

## Root cause — overflow outside drawn area

Observed: generated aisles/shelves appear outside the **drawn polygon** while still inside the **axis-aligned bounding box** (or aisle `lengthMeters` / UI width disagree).

Fixes:

1. Packer iterates candidates only where **all footprint corners** are inside `layout.polygon` (already intended); add **edge midpoints** check; shrink aisle `lengthMeters` to max segment fully inside polygon.
2. After pack, run `collectContainmentViolations` and **drop** offenders before save (belt-and-suspenders).
3. Canvas: render aisles with `lengthMeters`; optional `clip-path` / SVG mask to polygon for floor plan chrome so overflow is obvious if any slip through.
4. Tests: L-shaped / concave polygon fixture — assert zero entities outside.

## Product CRUD

| Method | Path | Notes |
|--------|------|-------|
| POST | `/products` | Already exists — wire real UI form |
| PATCH | `/products/{productId}` | **Additive** — name, sku, categoryId, attributes |
| GET | `/products` | Unchanged |

UI: Catalog page replace mock “+ Add product”; row action Edit; fields include widthMeters/heightMeters under attributes.

## Multi-layer planogram

- PlanogramPanel: **Level** select (`0..levels.length-1`); add product to selected level.
- Facing width shared across placements on same level (sum of `facings * productWidth` ≤ usableWidth — v1: clamp each placement independently as today; document known limitation; optional SEED for shared budget).
- Shelf type templates (config / fixtureTemplates):

```json
{ "type": "gondola", "defaultLevels": 3, "defaultWidthMeters": 1.2, "defaultDepthMeters": 0.8 }
```

On shelf create / type change, initialize `levels[]` from template if empty.

## 2D mouse zoom

- `wheel` on `.canvas-stage` / floor-plan: adjust `zoom` state toward cursor (scale around pointer).
- Prevent page scroll when over canvas (`preventDefault`).
- Keep existing +/− buttons.

## Reuse architecture (for other products)

```text
Host app
  ├── Auth adapter (token, roles)
  ├── Vertical config (min aisle, shelf type templates, categories)
  └── LayoutEditor package
        ├── Canvas2D / Palette / PlanogramPanel / Scene3D
        └── api client → Layouts + Planogram + Catalog OpenAPI
Backend
  ├── layoutPacker (Strategy)
  ├── polygonContainment
  ├── planogramMath
  └── repository (SQLite now / Mongo later)
```

See `Docs/REUSE_LAYOUT_PLANOGRAM.md`.

## Observability

- Log `layout_autogenerate` with `droppedOutsidePolygon` count.
- Log `product.update` audit.

## Rollback

- Flag `PLANOGRAM_MULTI_LEVEL_UI` (default on).
- Revert packer clip; keep AABB-only if needed (not recommended).
- Hide product edit form; keep import/export.
