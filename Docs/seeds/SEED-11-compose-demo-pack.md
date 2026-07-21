---
seedId: SEED-11-compose-demo-pack
phase: 7
status: Done
stack: demo
---

# SEED-11-compose-demo-pack

## SEED Unit

- **SEED-ID:** SEED-11-compose-demo-pack
- **Status:** Done
- **Phase:** 7
- **Goal:** Documented one-shot docker compose demo with smoke script (health + login).
- **Scope:**
  - In scope:
    - README compose steps
    - scripts/smoke-demo.mjs
    - Healthcheck
  - Out of scope:
    - Cloud deploy
- **Constraints:**
  - Performance: N/A
  - Security: N/A — local
  - Observability: Compose healthcheck
  - Backward compatibility: N/A
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given clean machine with Docker, When following README compose steps, Then http://localhost:8080 loads.
  2. Given smoke script, When run against compose stack, Then exit 0.
- **Evidence required:**
  - smoke script output
  - codebase/README.md
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Port conflicts 3000/8080.
  - Rollback steps: docker compose down.
- **Spec link:** `openspec/changes/SEED-11-compose-demo-pack/` (unit: `Docs/seeds/SEED-11-compose-demo-pack.md`)
- **Engineering skills invoked:** observability

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
