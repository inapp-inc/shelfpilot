# Tasks: SEED-04-layout-canvas

Canonical SEED unit: `Docs/seeds/SEED-04-layout-canvas.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given dimensions entered, When layout opens, Then scaled blank canvas is visible immediately.
- [ ] Given min aisle from vertical config, When aisle width is below min, Then violation shows icon and text.
- [ ] Given zoom controls, When zoom in/out, Then canvas scale updates.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-04-layout-canvas/tasks.md"
```
