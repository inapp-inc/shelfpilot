# Tasks: SEED-00-bootstrap

Canonical SEED unit: `Docs/seeds/SEED-00-bootstrap.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given the API is running, When GET /health, Then response is 200 with ok true and correlationId.
- [ ] Given the repo, When inspecting Docs/, Then openapi.yaml exists.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-00-bootstrap/tasks.md"
```
