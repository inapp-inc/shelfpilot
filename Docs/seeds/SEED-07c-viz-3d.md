---
seedId: SEED-07c-viz-3d
phase: 5
status: Done
stack: demo
---

# SEED-07c-viz-3d

## SEED Unit

- **SEED-ID:** SEED-07c-viz-3d
- **Status:** Done
- **Phase:** 5
- **Goal:** Three.js 3D view with floor, grid, fixtures colored by mapping; safe teardown.
- **Scope:**
  - In scope:
    - 2D/3D toggle
    - Scene3D parity with UI SoT
    - Unmount cleanup
  - Out of scope:
    - Photoreal materials
    - VR
- **Constraints:**
  - Performance: Interactive on integrated GPU; no specialized GPU required
  - Security: N/A
  - Observability: N/A — client render
  - Backward compatibility: N/A
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given layout with mapped fixtures, When switching to 3D, Then scene renders without console errors.
  2. Given leaving editor, When unmounting, Then WebGL context is disposed.
- **Evidence required:**
  - Manual smoke
  - Optional screenshot
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: WebGL unavailable — show fallback message.
  - Rollback steps: Hide 3D toggle; keep 2D only.
- **Spec link:** `openspec/changes/SEED-07c-viz-3d/` (unit: `Docs/seeds/SEED-07c-viz-3d.md`)
- **Engineering skills invoked:** performance-engineering

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
