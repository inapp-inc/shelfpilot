---
seedId: SEED-AG-04-3d-orbit-controls
phase: AG
status: Done
stack: demo
change: layout-autogen-walkthrough
---

# SEED-AG-04-3d-orbit-controls

## SEED Unit

- **SEED-ID:** SEED-AG-04-3d-orbit-controls
- **Status:** Done
- **Goal:** Replace static camera with OrbitControls (scroll zoom, orbit, pan).
- **Scope:**
  - In scope: Scene3D OrbitControls; dispose on unmount
  - Out of scope: walk mode (SEED-AG-05)
- **Constraints:**
  - Performance: 30fps target on integrated GPU for baseline demo layouts
  - Observability: N/A
- **Acceptance criteria:**
  1. Given 3D view, When user scrolls/drags, Then camera orbits/zooms/pans smoothly.
- **Evidence required:** Manual smoke
- **Risks & rollback:** Revert to fixed camera lookAt.
- **Spec link:** `openspec/changes/layout-autogen-walkthrough/`
- **Engineering skills:** performance-engineering (draw call budget note)
