# Tasks: SEED-08-analytics

Canonical SEED unit: `Docs/seeds/SEED-08-analytics.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given mapped layout, When GET summary, Then utilizationPercent and fixtureCount are consistent with geometry.
- [ ] Given no mappings, When GET summary, Then allocationByCategory is empty array.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-08-analytics/tasks.md"
```
