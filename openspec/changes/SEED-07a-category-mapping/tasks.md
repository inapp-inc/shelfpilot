# Tasks: SEED-07a-category-mapping

Canonical SEED unit: `Docs/seeds/SEED-07a-category-mapping.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given fixture and category, When POST mapping with color, Then GET layout returns mapping and fixture.color.
- [ ] Given Viewer, When POST mapping, Then 403.
- [ ] Given mapped fixtures, When viewing 2D canvas, Then colors match legend.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-07a-category-mapping/tasks.md"
```
