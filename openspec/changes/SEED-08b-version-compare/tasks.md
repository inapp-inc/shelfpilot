# Tasks: SEED-08b-version-compare

Canonical SEED unit: `Docs/seeds/SEED-08b-version-compare.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given two layout ids, When POST compare, Then utilizationDelta and fixtureCountDelta are returned.
- [ ] Given Analytics UI, When selecting A and B, Then deltas display.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-08b-version-compare/tasks.md"
```
