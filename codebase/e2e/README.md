# ShelfPilot Playwright E2E

Phases A–C — login, layouts, Smart Generate, dashboard, 3D, RBAC, catalog, admin, approval.

**Docs:** [`Docs/automation/`](../../Docs/automation/README.md)

## Commands

```bash
cd codebase
npm run docker:rebuild
npm run test:e2e:smoke
```

## Specs

| Spec | Coverage |
|------|----------|
| `auth.login.spec.js` | Login / sign out |
| `layouts.create.spec.js` | Create L/W/H, demo open |
| `layouts.smart-generate.spec.js` | Aisle min compliance + arrangement accept |
| `layouts.arrangement.spec.js` | Arrangement & volume summary gate |
| `layouts.demo-smoke.spec.js` | 3D toggle |
| `analytics.dashboard.spec.js` | Dashboard KPIs |
| `rbac.viewer.spec.js` | Viewer read-only |
| `catalog.crud.spec.js` | Category + product create |
| `admin.config.spec.js` | Admin tabs + Approver audit |
| `approval.workflow.spec.js` | Submit / approve / reject |
