# Tasks: SEED-05b-fixture-drag-snap

Canonical SEED unit: `Docs/seeds/SEED-05b-fixture-drag-snap.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given Designer, When dragging a fixture and releasing, Then saved x/y match snapped grid.
- [ ] Given reload layout, When editor opens, Then fixture is at saved position.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-05b-fixture-drag-snap/tasks.md"
```
