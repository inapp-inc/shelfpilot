# Tasks: SEED-12-e2e-smoke

Canonical SEED unit: `Docs/seeds/SEED-12-e2e-smoke.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given API running, When smoke command executes, Then exit 0.
- [ ] Given broken mapping route, When smoke runs, Then exit non-zero.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-12-e2e-smoke/tasks.md"
```
