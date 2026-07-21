---
seedId: SEED-AG-00-polygon-containment
phase: AG
status: Done
stack: demo
change: layout-autogen-walkthrough
---

# SEED-AG-00-polygon-containment

## SEED Unit

- **SEED-ID:** SEED-AG-00-polygon-containment
- **Status:** Done
- **Goal:** Polygon draw/edit persistence + strict containment validation for aisles/shelves.
- **Scope:**
  - In scope: polygon PATCH, containment helpers, reject out-of-bounds PATCH, OpenAPI fields
  - Out of scope: autogenerate packer UI, 3D walk
- **Constraints:**
  - Performance: containment check p95 &lt; 5ms for ≤64 vertices
  - Security: validate finite coords; max 64 vertices
  - Observability: log `containment_violation`
  - Backward compatibility: rectangle layouts still work (implicit 4-corner polygon)
- **Acceptance criteria:**
  1. Given polygon layout, When PATCH shelf outside, Then 400 `containment_violation`.
  2. Given rectangle layout, When place shelf inside, Then 201/200 success.
- **Evidence required:** API tests; OpenAPI updated
- **Risks & rollback:** Revert containment checks; keep soft geometry.
- **Spec link:** `openspec/changes/layout-autogen-walkthrough/`
- **Engineering skills:** security-engineering (input validation)
