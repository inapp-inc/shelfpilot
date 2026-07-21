# SEED Unit — SEED-09-ui-reference

- **SEED-ID:** SEED-09-ui-reference
- **Goal:** Rebuild `codebase/web` to match `ui/ShelfPilot.dc.html` and keep mock API wiring.
- **Scope:**
  - In scope: visual port of all screens; vertical pills; wizard; editor 2D/3D; toasts
  - Out of scope: Design Canvas runtime; production IdP
- **Constraints:**
  - Performance: 3D on integrated GPU (same as prototype)
  - Security: existing RBAC via API
  - Observability: N/A — UI chrome
  - Rollback: revert web package; prototype remains in `ui/`
- **Acceptance criteria:**
  1. Given ui reference, When comparing Login/Dashboard/Editor chrome, Then brand tokens and layout regions match.
  2. Given Designer session, When creating layout via wizard, Then API-backed layout opens in editor matching reference interactions.
- **Evidence required:** side-by-side checklist in Docs/VALIDATION_UI_REFERENCE.md; API tests still green
- **Spec link:** `openspec/changes/ui-reference-integration/`
- **Engineering skills invoked:** coding, performance-engineering (3D)
