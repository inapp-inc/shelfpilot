---
seedId: SEED-LE-06-3d-upgrade
phase: LE
status: Done
stack: demo
change: layout-editor-planogram
---

# SEED-LE-06-3d-upgrade

## SEED Unit

- **SEED-ID:** SEED-LE-06-3d-upgrade
- **Status:** Done
- **Goal:** Richer Three.js view: aisle corridors, shelf levels, facing boxes, dispose on unmount.
- **Scope:**
  - In scope:
    - Scene3D upgrade
    - level meshes
    - facing boxes from planogram
  - Out of scope:
    - Photoreal materials
- **Constraints:**
  - Performance: Interactive on integrated GPU
  - Security: N/A
  - Observability: N/A — client
  - Backward compatibility: 2D editor unchanged
  - Cost: N/A
- **Stack note:** Demo stack: React/Vite · Express · SQLite · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given shelf with planogram, When switching to 3D, Then facing blocks render without console errors.
  2. Given leaving editor, When unmount, Then WebGL disposed.
- **Evidence required:**
  - manual smoke
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: WebGL unavailable — show fallback.
  - Rollback steps: Revert Scene3D to prior simple boxes.
- **Spec link:** `openspec/changes/SEED-LE-06-3d-upgrade/` (unit: `Docs/seeds/SEED-LE-06-3d-upgrade.md`; parent change: `openspec/changes/layout-editor-planogram/`)
- **Engineering skills invoked:** performance-engineering

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI modular editor checked when UI touched
- [ ] Intent review before merge
