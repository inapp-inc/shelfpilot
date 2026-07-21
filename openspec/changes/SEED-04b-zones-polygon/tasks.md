# Tasks: SEED-04b-zones-polygon

Canonical SEED unit: `Docs/seeds/SEED-04b-zones-polygon.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given shape polygon, When saving boundary points, Then GET layout returns polygon array.
- [ ] Given polygon layout, When opening 2D editor, Then outline is rendered.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-04b-zones-polygon/tasks.md"
```
