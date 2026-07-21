# Tasks: SEED-02-admin-config

Canonical SEED unit: `Docs/seeds/SEED-02-admin-config.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given Admin, When PUT config for pharmacy, Then GET returns pharmacy rules.
- [ ] Given Designer, When PUT config, Then 403.
- [ ] Given pharmacy vs apparel, When GET config, Then minAisleWidthMeters differs.
- [ ] Given approvalWorkflowEnabled true, When Viewer tries approve, Then 403; Approver can approve.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-02-admin-config/tasks.md"
```
