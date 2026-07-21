---
seedId: SEED-07a-category-mapping
phase: 4
status: Done
stack: demo
---

# SEED-07a-category-mapping

## SEED Unit

- **SEED-ID:** SEED-07a-category-mapping
- **Status:** Done
- **Phase:** 4
- **Goal:** Map product category to fixture/shelf with color coding (space planogram foundation).
- **Scope:**
  - In scope:
    - POST mappings
    - Legend
    - Unmapped state
    - Viewer cannot map
  - Out of scope:
    - SKU-level facing planogram (future SEED if required)
- **Constraints:**
  - Performance: N/A — few fixtures
  - Security: Designer/Admin only; Viewer 403
  - Observability: N/A
  - Backward compatibility: CategoryMapping schema in OpenAPI
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given fixture and category, When POST mapping with color, Then GET layout returns mapping and fixture.color.
  2. Given Viewer, When POST mapping, Then 403.
  3. Given mapped fixtures, When viewing 2D canvas, Then colors match legend.
- **Evidence required:**
  - Mapping API test
  - UI editor mapping control
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Orphan mappings if category deleted — prevent or null color.
  - Rollback steps: Clear mappings array on layouts; revert UI select.
- **Spec link:** `openspec/changes/SEED-07a-category-mapping/` (unit: `Docs/seeds/SEED-07a-category-mapping.md`)
- **Engineering skills invoked:** security-engineering

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
