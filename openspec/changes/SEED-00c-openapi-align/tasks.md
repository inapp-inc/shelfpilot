# Tasks: SEED-00c-openapi-align

Canonical SEED unit: `Docs/seeds/SEED-00c-openapi-align.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given codebase/api routes, When comparing to Docs/openapi.yaml, Then every path+method is documented.
- [ ] Given npm run openapi:check, When executed, Then exit code 0.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-00c-openapi-align/tasks.md"
```
