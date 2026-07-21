# Tasks: SEED-08c-layout-versions

Canonical SEED unit: `Docs/seeds/SEED-08c-layout-versions.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given draft submitted to in_review, When listing versions, Then at least one snapshot exists.
- [ ] Given two version ids, When compare, Then deltas compute from snapshots.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-08c-layout-versions/tasks.md"
```
