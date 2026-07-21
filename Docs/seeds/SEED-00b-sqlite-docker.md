---
seedId: SEED-00b-sqlite-docker
phase: 0
status: Done
stack: demo
---

# SEED-00b-sqlite-docker

## SEED Unit

- **SEED-ID:** SEED-00b-sqlite-docker
- **Status:** Done
- **Phase:** 0
- **Goal:** Replace in-memory store with SQLite and ship local Docker Compose (api + web + volume).
- **Scope:**
  - In scope:
    - node:sqlite repository
    - SQLITE_PATH
    - Dockerfile/Dockerfile.web
    - docker-compose.yml
    - Data durability across restart
  - Out of scope:
    - MongoDB
    - Production orchestration
- **Constraints:**
  - Performance: N/A — local single-node demo
  - Security: N/A — demo DB file; not multi-tenant
  - Observability: Stdout logs; compose healthcheck on /health
  - Backward compatibility: API contract unchanged
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given a created layout, When API restarts with same SQLITE_PATH, Then GET layout returns the same fixtures.
  2. Given docker compose up --build, When GET /health on api, Then ok true.
  3. Given npm test, When run on Node >= 22.5, Then all API tests pass.
- **Evidence required:**
  - codebase/api/src/store/sqlite.js
  - Docs/ARCHITECTURE_LOCAL.md
  - API test suite
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: SQLite not suitable for multi-instance prod.
  - Rollback steps: Wipe volume shelfpilot_data or delete SQLITE_PATH file; re-seed.
- **Spec link:** `openspec/changes/SEED-00b-sqlite-docker/` (unit: `Docs/seeds/SEED-00b-sqlite-docker.md`)
- **Engineering skills invoked:** observability

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
