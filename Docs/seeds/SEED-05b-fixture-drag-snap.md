---
seedId: SEED-05b-fixture-drag-snap
phase: 3
status: Done
stack: demo
---

# SEED-05b-fixture-drag-snap

## SEED Unit

- **SEED-ID:** SEED-05b-fixture-drag-snap
- **Status:** Done
- **Phase:** 3
- **Goal:** 2D click-to-place, drag move, and snap-to-grid with persisted positions.
- **Scope:**
  - In scope:
    - Drag handlers
    - Grid snap
    - Persist x/y via API
  - Out of scope:
    - Collision physics
    - Multi-select
- **Constraints:**
  - Performance: UI remains responsive while dragging (no full re-fetch each pixel)
  - Security: N/A — same RBAC as fixture mutate
  - Observability: N/A — client interaction
  - Backward compatibility: x/y fields already on fixture
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given Designer, When dragging a fixture and releasing, Then saved x/y match snapped grid.
  2. Given reload layout, When editor opens, Then fixture is at saved position.
- **Evidence required:**
  - Manual UI smoke
  - API GET shows updated x/y
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Excessive PATCH traffic — debounce saves.
  - Rollback steps: Disable drag; keep click-to-place only.
- **Spec link:** `openspec/changes/SEED-05b-fixture-drag-snap/` (unit: `Docs/seeds/SEED-05b-fixture-drag-snap.md`)
- **Engineering skills invoked:** performance-engineering

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
