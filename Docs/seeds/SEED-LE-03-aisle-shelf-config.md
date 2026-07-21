---
seedId: SEED-LE-03-aisle-shelf-config
phase: LE
status: Done
stack: demo
change: layout-editor-planogram
---

# SEED-LE-03-aisle-shelf-config

## SEED Unit

- **SEED-ID:** SEED-LE-03-aisle-shelf-config
- **Status:** Done
- **Goal:** Configure aisle corridor width/space and per-shelf height, usable width, and levels.
- **Scope:**
  - In scope:
    - PropertiesPanel aisle vs shelf fields
    - PATCH aisle/shelf
    - levels[]
  - Out of scope:
    - CAD-grade geometry
- **Constraints:**
  - Performance: N/A
  - Security: Designer/Admin only
  - Observability: N/A
  - Backward compatibility: Existing aisles without x/y still valid
  - Cost: N/A
- **Stack note:** Demo stack: React/Vite · Express · SQLite · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given aisle selected, When widthMeters set to 1.6, Then GET returns 1.6 on aisle only.
  2. Given shelf selected, When height and two levels saved, Then GET shelf.levels length is 2.
- **Evidence required:**
  - API tests
  - UI smoke
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Invalid level heights.
  - Rollback steps: Hide levels UI; keep single height field.
- **Spec link:** `openspec/changes/SEED-LE-03-aisle-shelf-config/` (unit: `Docs/seeds/SEED-LE-03-aisle-shelf-config.md`; parent change: `openspec/changes/layout-editor-planogram/`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI modular editor checked when UI touched
- [ ] Intent review before merge
