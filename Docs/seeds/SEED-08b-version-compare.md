---
seedId: SEED-08b-version-compare
phase: 6
status: Done
stack: demo
---

# SEED-08b-version-compare

## SEED Unit

- **SEED-ID:** SEED-08b-version-compare
- **Status:** Done
- **Phase:** 6
- **Goal:** Compare two layouts (or versions) for utilization and fixture count deltas.
- **Scope:**
  - In scope:
    - POST /analytics/compare
    - UI A vs B panel
    - OpenAPI sync
  - Out of scope:
    - Visual diff overlay
- **Constraints:**
  - Performance: N/A
  - Security: N/A — auth required
  - Observability: N/A
  - Backward compatibility: Additive endpoint
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given two layout ids, When POST compare, Then utilizationDelta and fixtureCountDelta are returned.
  2. Given Analytics UI, When selecting A and B, Then deltas display.
- **Evidence required:**
  - API test
  - UI panel
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Missing layout id → 404.
  - Rollback steps: Hide compare UI; keep summary.
- **Spec link:** `openspec/changes/SEED-08b-version-compare/` (unit: `Docs/seeds/SEED-08b-version-compare.md`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
