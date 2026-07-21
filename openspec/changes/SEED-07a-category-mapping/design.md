# Design: SEED-07a-category-mapping

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — few fixtures
  - Security: Designer/Admin only; Viewer 403
  - Observability: N/A
  - Backward compatibility: CategoryMapping schema in OpenAPI
  - Cost: N/A

## Risks & rollback

- Risks: Orphan mappings if category deleted — prevent or null color.
  - Rollback steps: Clear mappings array on layouts; revert UI select.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
