# Tasks: SEED-06-products-categories

Canonical SEED unit: `Docs/seeds/SEED-06-products-categories.md`  
Plan: `Docs/SEED_PLAN_FULL.md`

## Implementation checklist

- [ ] Given vertical pharmacy, When listing categories, Then tree includes parent/child where seeded.
- [ ] Given import payload, When POST /catalog/import, Then counts > 0 and data listable.
- [ ] Given export, When user clicks Export, Then JSON downloads.

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (`Docs/openapi.yaml`)
- [ ] Intent review before merge

## Dispatch

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/SEED-06-products-categories/tasks.md"
```
