---
seedId: SEED-04b-zones-polygon
phase: 2
status: Done
stack: demo
---

# SEED-04b-zones-polygon

## SEED Unit

- **SEED-ID:** SEED-04b-zones-polygon
- **Status:** Done
- **Phase:** 2
- **Goal:** Demo-level store zones and irregular polygon boundary storage/render.
- **Scope:**
  - In scope:
    - Polygon points on layout
    - Zone list optional
    - Canvas outline render
  - Out of scope:
    - CAD-grade geometry engine
    - Boolean merges
- **Constraints:**
  - Performance: N/A — few vertices demo
  - Security: N/A — same layout RBAC
  - Observability: N/A
  - Backward compatibility: shape=rectangle remains default
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given shape polygon, When saving boundary points, Then GET layout returns polygon array.
  2. Given polygon layout, When opening 2D editor, Then outline is rendered.
- **Evidence required:**
  - API test for polygon round-trip
  - UI smoke screenshot optional
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Invalid polygons may break canvas — validate min 3 points.
  - Rollback steps: Ignore polygon field; fall back to rectangle bounds.
- **Spec link:** `openspec/changes/SEED-04b-zones-polygon/` (unit: `Docs/seeds/SEED-04b-zones-polygon.md`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
