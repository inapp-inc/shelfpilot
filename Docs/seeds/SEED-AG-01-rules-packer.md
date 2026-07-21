---
seedId: SEED-AG-01-rules-packer
phase: AG
status: Done
stack: demo
change: layout-autogen-walkthrough
---

# SEED-AG-01-rules-packer

## SEED Unit

- **SEED-ID:** SEED-AG-01-rules-packer
- **Status:** Done
- **Goal:** Deterministic parallel-row packer via `POST /layouts/{id}/autogenerate`.
- **Scope:**
  - In scope: `layoutPacker` service, replaceExisting, orientation auto/H/V, max shelf density + min aisle clearance, OpenAPI
  - Out of scope: LLM, category auto-zoning, generate UI
- **Constraints:**
  - Performance: p95 &lt; 200ms for ≤2000 m² / ≤32 vertices
  - Security: Designer/Admin only
  - Observability: log `layout_autogenerate`
  - Flag: `LAYOUT_AUTOGENERATE`
- **Acceptance criteria:**
  1. Given valid polygon, When autogenerate, Then all shelves/aisles inside polygon and categories null.
  2. Given Viewer, When autogenerate, Then 403.
- **Evidence required:** Unit + route tests; OpenAPI
- **Risks & rollback:** Disable flag; manual placement remains.
- **Spec link:** `openspec/changes/layout-autogen-walkthrough/`
- **Engineering skills:** performance-engineering (packer budget)
