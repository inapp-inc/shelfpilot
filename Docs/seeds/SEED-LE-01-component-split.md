---
seedId: SEED-LE-01-component-split
phase: LE
status: Done
stack: demo
change: layout-editor-planogram
---

# SEED-LE-01-component-split

## SEED Unit

- **SEED-ID:** SEED-LE-01-component-split
- **Status:** Done
- **Goal:** Extract Layout Editor into reusable components under web/src/layout-editor/ with behavior parity.
- **Scope:**
  - In scope:
    - LayoutEditor, Canvas2D, Palette, PropertiesPanel, Scene3D wrapper
    - App.jsx thin shell
  - Out of scope:
    - New planogram panel UI
    - DnD from palette
- **Constraints:**
  - Performance: N/A — refactor
  - Security: N/A — UI structure
  - Observability: N/A
  - Backward compatibility: Existing editor flows still work
  - Cost: N/A
- **Stack note:** Demo stack: React/Vite · Express · SQLite · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given Designer opens editor, When page loads, Then modular components render and place/map still works.
- **Evidence required:**
  - web/src/layout-editor/**
  - manual smoke
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Regression in selection/state.
  - Rollback steps: Revert to previous App.jsx editor block.
- **Spec link:** `openspec/changes/SEED-LE-01-component-split/` (unit: `Docs/seeds/SEED-LE-01-component-split.md`; parent change: `openspec/changes/layout-editor-planogram/`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI modular editor checked when UI touched
- [ ] Intent review before merge
