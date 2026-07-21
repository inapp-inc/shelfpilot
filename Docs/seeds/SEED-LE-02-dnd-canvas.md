---
seedId: SEED-LE-02-dnd-canvas
phase: LE
status: Done
stack: demo
change: layout-editor-planogram
---

# SEED-LE-02-dnd-canvas

## SEED Unit

- **SEED-ID:** SEED-LE-02-dnd-canvas
- **Status:** Done
- **Goal:** Palette drag-and-drop place/move for aisles and shelves with snap and PATCH persist.
- **Scope:**
  - In scope:
    - HTML5/DnD or pointer DnD
    - Snap 0.5m
    - Persist x/y
  - Out of scope:
    - Collision physics
- **Constraints:**
  - Performance: No full re-fetch per drag pixel; save on drop
  - Security: Designer/Admin only
  - Observability: N/A — client
  - Backward compatibility: Click-to-place may remain as fallback
  - Cost: N/A
- **Stack note:** Demo stack: React/Vite · Express · SQLite · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given shelf tool dragged from palette, When dropped on canvas, Then shelf is persisted at snapped coordinates.
  2. Given existing shelf dragged, When mouseup, Then PATCH updates x/y.
- **Evidence required:**
  - manual smoke
  - API PATCH assertions
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Click vs drag conflict.
  - Rollback steps: Disable DnD; keep click-to-place.
- **Spec link:** `openspec/changes/SEED-LE-02-dnd-canvas/` (unit: `Docs/seeds/SEED-LE-02-dnd-canvas.md`; parent change: `openspec/changes/layout-editor-planogram/`)
- **Engineering skills invoked:** performance-engineering

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI modular editor checked when UI touched
- [ ] Intent review before merge
