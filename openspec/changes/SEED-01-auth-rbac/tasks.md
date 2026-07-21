# Tasks: SEED-01-auth-rbac

Canonical SEED unit: `Docs/seeds/SEED-01-auth-rbac.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given valid email/password/role, When login, Then token and user are returned.
- [ ] Given Viewer token, When POST /layouts, Then 403.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-01-auth-rbac/tasks.md"
```
