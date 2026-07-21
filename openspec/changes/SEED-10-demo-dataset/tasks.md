# Tasks: SEED-10-demo-dataset

Canonical SEED unit: `Docs/seeds/SEED-10-demo-dataset.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given empty or reset DB, When npm run seed:demo, Then dashboard shows 3 layout cards.
- [ ] Given pharmacy demo layout, When opened, Then fixtures and at least one mapping exist.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-10-demo-dataset/tasks.md"
```
