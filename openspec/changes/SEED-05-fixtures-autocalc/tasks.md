# Tasks: SEED-05-fixtures-autocalc

Canonical SEED unit: `Docs/seeds/SEED-05-fixtures-autocalc.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given Designer, When placing a shelf from palette, Then fixture appears on GET layout.
- [ ] Given layout dimensions patched larger, When auto-calc runs, Then maxFixtures increases.
- [ ] Given Viewer, When POST fixture, Then 403.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-05-fixtures-autocalc/tasks.md"
```
