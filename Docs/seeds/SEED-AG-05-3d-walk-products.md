---
seedId: SEED-AG-05-3d-walk-products
phase: AG
status: Done
stack: demo
change: layout-autogen-walkthrough
---

# SEED-AG-05-3d-walk-products

## SEED Unit

- **SEED-ID:** SEED-AG-05-3d-walk-products
- **Status:** Done
- **Goal:** Walk-through mode + visible planogram products on shelves in 3D.
- **Scope:**
  - In scope: Walk/Orbit mode toggle; WASD + mouse look; facing meshes; soft clamp to store bounds; flag `SCENE3D_WALK`
  - Out of scope: VR, photoreal materials, physics engine
- **Constraints:**
  - Performance: LOD/merge facings if &gt;500 meshes
  - Security: N/A — client viz
- **Acceptance criteria:**
  1. Given Walk mode, When user moves, Then camera translates through store and shelves remain visible.
  2. Given shelf with planogram, When in 3D, Then facing boxes for products render.
- **Evidence required:** Manual smoke checklist
- **Risks & rollback:** Disable walk flag; keep orbit.
- **Spec link:** `openspec/changes/layout-autogen-walkthrough/`
- **Engineering skills:** performance-engineering
