---
seedId: SEED-05-fixtures-autocalc
phase: 3
status: Done
stack: demo
---

# SEED-05-fixtures-autocalc

## SEED Unit

- **SEED-ID:** SEED-05-fixtures-autocalc
- **Status:** Done
- **Phase:** 3
- **Goal:** M2 fixture palette from vertical templates, place/edit/delete, auto-calc on dimension change.
- **Scope:**
  - In scope:
    - Palette shelf/rack/gondola/storage
    - Properties W/D
    - autoCalc.maxFixtures
    - Calc duration log
  - Out of scope:
    - Structural load engineering
- **Constraints:**
  - Performance: Auto-calc p95 < 50ms for demo footprints
  - Security: Designer/Admin only mutations
  - Observability: Log auto_calc durationMs
  - Backward compatibility: Existing fixture schema preserved
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given Designer, When placing a shelf from palette, Then fixture appears on GET layout.
  2. Given layout dimensions patched larger, When auto-calc runs, Then maxFixtures increases.
  3. Given Viewer, When POST fixture, Then 403.
- **Evidence required:**
  - shelfpilot auto-calc/fixture tests
  - Log sample
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Template missing for vertical — fall back to defaults.
  - Rollback steps: Revert layoutMath formula; keep prior fixtures in DB.
- **Spec link:** `openspec/changes/SEED-05-fixtures-autocalc/` (unit: `Docs/seeds/SEED-05-fixtures-autocalc.md`)
- **Engineering skills invoked:** performance-engineering, observability

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
