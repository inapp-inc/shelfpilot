# Tasks: SEED-01b-auth-session-hardening

Canonical SEED unit: `Docs/seeds/SEED-01b-auth-session-hardening.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given an expired token, When calling a protected endpoint, Then 401.
- [ ] Given logout, When the same token is reused, Then 401.
- [ ] Given AUTH_SESSION_TTL unset or 0, When login, Then long-lived demo session still works.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-01b-auth-session-hardening/tasks.md"
```
