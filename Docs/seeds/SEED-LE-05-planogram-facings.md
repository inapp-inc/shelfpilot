---
seedId: SEED-LE-05-planogram-facings
phase: LE
status: Done
stack: demo
change: layout-editor-planogram
---

# SEED-LE-05-planogram-facings

## SEED Unit

- **SEED-ID:** SEED-LE-05-planogram-facings
- **Status:** Done
- **Goal:** Add products to shelf front; compute/clamp facings from dimensions.
- **Scope:**
  - In scope:
    - PlanogramPanel
    - POST/DELETE planogram
    - preview endpoint
    - planogramMath
  - Out of scope:
    - ERP sync
    - full bay slot grid
- **Constraints:**
  - Performance: Facing calc < 5ms demo
  - Security: Designer/Admin only
  - Observability: Log planogram_facing_calc durationMs
  - Backward compatibility: N/A — new feature
  - Cost: N/A
- **Stack note:** Demo stack: React/Vite · Express · SQLite · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given usableWidth 1.2 and product width 0.2, When POST placement, Then maxFacings is 6.
  2. Given facings request 9 and max 4, When POST, Then facings stored as 4 (clamp).
  3. Given Viewer, When POST placement, Then 403.
- **Evidence required:**
  - unit tests planogramMath
  - API tests
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Missing product dimensions → defaults.
  - Rollback steps: PLANOGRAM_EDITOR=0 hides panel and write routes.
- **Spec link:** `openspec/changes/SEED-LE-05-planogram-facings/` (unit: `Docs/seeds/SEED-LE-05-planogram-facings.md`; parent change: `openspec/changes/layout-editor-planogram/`)
- **Engineering skills invoked:** observability, rollback-and-flags

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI modular editor checked when UI touched
- [ ] Intent review before merge
