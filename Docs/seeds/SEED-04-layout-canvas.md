---
seedId: SEED-04-layout-canvas
phase: 2
status: Done
stack: demo
---

# SEED-04-layout-canvas

## SEED Unit

- **SEED-ID:** SEED-04-layout-canvas
- **Status:** Done
- **Phase:** 2
- **Goal:** M1 layout canvas: scaled floor, zoom, selection, aisle tools with min-width validation.
- **Scope:**
  - In scope:
    - Scaled blank canvas from dimensions
    - Zoom
    - Aisle add + validation banner
    - Selection chrome
  - Out of scope:
    - CAD boolean ops
    - DXF import
- **Constraints:**
  - Performance: N/A — 2D canvas MVP
  - Security: Designer/Admin mutate; Viewer read-only
  - Observability: N/A — client canvas
  - Backward compatibility: Layout payload fields additive
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given dimensions entered, When layout opens, Then scaled blank canvas is visible immediately.
  2. Given min aisle from vertical config, When aisle width is below min, Then violation shows icon and text.
  3. Given zoom controls, When zoom in/out, Then canvas scale updates.
- **Evidence required:**
  - Aisle validation API test
  - Docs/VALIDATION_UI_REFERENCE.md editor rows
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Validation rules differ per vertical — must read config.
  - Rollback steps: Revert editor canvas components; keep API validation.
- **Spec link:** `openspec/changes/SEED-04-layout-canvas/` (unit: `Docs/seeds/SEED-04-layout-canvas.md`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
