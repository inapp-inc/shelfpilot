# Tasks: SEED-02b-user-admin-crud

Canonical SEED unit: `Docs/seeds/SEED-02b-user-admin-crud.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given Admin, When creating a user with role Designer, Then user appears in GET /admin/users.
- [ ] Given the new user credentials, When login, Then token issued.
- [ ] Given Designer, When POST /admin/users, Then 403.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-02b-user-admin-crud/tasks.md"
```
