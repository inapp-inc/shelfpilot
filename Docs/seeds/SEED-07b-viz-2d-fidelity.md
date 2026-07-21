---
seedId: SEED-07b-viz-2d-fidelity
phase: 5
status: Done
stack: demo
---

# SEED-07b-viz-2d-fidelity

## SEED Unit

- **SEED-ID:** SEED-07b-viz-2d-fidelity
- **Status:** Done
- **Phase:** 5
- **Goal:** 2D editor visual parity with ui/ShelfPilot.dc.html.
- **Scope:**
  - In scope:
    - Canvas wash #e9e5e0
    - Floor #fbfaf8
    - Dashed aisles
    - Selection chrome
    - Grid
  - Out of scope:
    - Print/PDF export
- **Constraints:**
  - Performance: N/A — CSS/layout
  - Security: N/A
  - Observability: N/A
  - Backward compatibility: N/A — visual only
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given VALIDATION_UI_REFERENCE checklist for editor 2D, When reviewed, Then all critical rows are Match.
- **Evidence required:**
  - Docs/VALIDATION_UI_REFERENCE.md updated
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Drift from DC file if both edited — UI SoT wins.
  - Rollback steps: Revert web CSS/editor styles.
- **Spec link:** `openspec/changes/SEED-07b-viz-2d-fidelity/` (unit: `Docs/seeds/SEED-07b-viz-2d-fidelity.md`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
