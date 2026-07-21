---
seedId: SEED-LE-00-model-openapi
phase: LE
status: Done
stack: demo
change: layout-editor-planogram
---

# SEED-LE-00-model-openapi

## SEED Unit

- **SEED-ID:** SEED-LE-00-model-openapi
- **Status:** Done
- **Goal:** OpenAPI + layout payload model for aisles/shelves/planogram; migrate fixtures→shelves on read.
- **Scope:**
  - In scope:
    - OpenAPI paths already drafted
    - SQLite/payload shelves+planogram
    - Synthesize shelves from fixtures
    - planogramMath service stub
  - Out of scope:
    - Full DnD UI
    - 3D upgrade
- **Constraints:**
  - Performance: N/A — model/migration
  - Security: Same RBAC on new mutate routes
  - Observability: N/A — schema first
  - Backward compatibility: fixtures array still readable
  - Cost: N/A
- **Stack note:** Demo stack: React/Vite · Express · SQLite · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given legacy layout with fixtures only, When GET layout, Then shelves array is populated from fixtures.
  2. Given OpenAPI, When openapi:check runs after route implementation, Then new shelf/planogram ops are documented.
- **Evidence required:**
  - API migration tests
  - Docs/openapi.yaml
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Dual fixture/shelf writes during transition.
  - Rollback steps: PLANOGRAM_EDITOR=0; ignore shelves writes.
- **Spec link:** `openspec/changes/SEED-LE-00-model-openapi/` (unit: `Docs/seeds/SEED-LE-00-model-openapi.md`; parent change: `openspec/changes/layout-editor-planogram/`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI modular editor checked when UI touched
- [ ] Intent review before merge
