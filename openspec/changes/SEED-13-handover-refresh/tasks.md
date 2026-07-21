# Tasks: SEED-13-handover-refresh

Canonical SEED unit: `Docs/seeds/SEED-13-handover-refresh.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given all demo SEEDs complete, When reading HANDOVER.md, Then each SEED-ID is listed Done with evidence links.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-13-handover-refresh/tasks.md"
```
