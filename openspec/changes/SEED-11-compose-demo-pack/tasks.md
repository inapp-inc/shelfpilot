# Tasks: SEED-11-compose-demo-pack

Canonical SEED unit: `Docs/seeds/SEED-11-compose-demo-pack.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given clean machine with Docker, When following README compose steps, Then http://localhost:8080 loads.
- [ ] Given smoke script, When run against compose stack, Then exit 0.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-11-compose-demo-pack/tasks.md"
```
