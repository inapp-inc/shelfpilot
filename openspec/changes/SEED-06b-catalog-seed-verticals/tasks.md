# Tasks: SEED-06b-catalog-seed-verticals

Canonical SEED unit: `Docs/seeds/SEED-06b-catalog-seed-verticals.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given fresh or seeded DB, When switching each vertical, Then category tree is non-empty.
- [ ] Given each vertical, When listing products, Then at least 3 products exist.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-06b-catalog-seed-verticals/tasks.md"
```
