# Tasks: SEED-03-dashboard-projects

Canonical SEED unit: `Docs/seeds/SEED-03-dashboard-projects.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given layouts with mixed statuses, When filtering draft, Then only drafts show.
- [ ] Given Designer, When completing wizard with dimensions, Then draft layout is created and editor opens.
- [ ] Given no matching filter, When dashboard loads, Then empty state is shown.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-03-dashboard-projects/tasks.md"
```
