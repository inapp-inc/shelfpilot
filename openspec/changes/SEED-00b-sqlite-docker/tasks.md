# Tasks: SEED-00b-sqlite-docker

Canonical SEED unit: `Docs/seeds/SEED-00b-sqlite-docker.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given a created layout, When API restarts with same SQLITE_PATH, Then GET layout returns the same fixtures.
- [ ] Given docker compose up --build, When GET /health on api, Then ok true.
- [ ] Given npm test, When run on Node >= 22.5, Then all API tests pass.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-00b-sqlite-docker/tasks.md"
```
