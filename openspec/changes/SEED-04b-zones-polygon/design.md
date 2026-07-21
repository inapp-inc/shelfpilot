# Design: SEED-04b-zones-polygon

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — few vertices demo
  - Security: N/A — same layout RBAC
  - Observability: N/A
  - Backward compatibility: shape=rectangle remains default
  - Cost: N/A

## Risks & rollback

- Risks: Invalid polygons may break canvas — validate min 3 points.
  - Rollback steps: Ignore polygon field; fall back to rectangle bounds.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
