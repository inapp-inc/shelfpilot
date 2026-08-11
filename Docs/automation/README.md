# ShelfPilot — Automation Docs

## Honest status

| Question | Answer |
|----------|--------|
| Was **everything** covered in the first draft? | **No.** First draft covered high-level smoke only. Admin depth, Store Master, approval workflow, floor plan/obstacles, full dashboard widgets, and detailed 3D modes were thin or missing. |
| Is coverage **documented** now? | **Yes.** This folder is the full functionality catalog for Playwright E2E. |
| Is Playwright **code** started? | **Yes — Phases A–C smoke live** under `codebase/e2e/` |

**Commands:**

```bash
cd codebase
npm run docker:rebuild
npm run test:e2e:smoke          # login + layouts + generate + dashboard + 3D + RBAC + catalog + admin + approval
```

---

## Documents (read in this order)

| # | Document | What you get |
|---|----------|--------------|
| 1 | **[FULL_FEATURE_INVENTORY.md](./FULL_FEATURE_INVENTORY.md)** | Complete list of every product area users can touch |
| 2 | **[MODULE_TEST_PLANS.md](./MODULE_TEST_PLANS.md)** | Clear Given / When / Then plans (Admin, store create, 3D, Dashboard, …) |
| 3 | **[COVERAGE_MATRIX.md](./COVERAGE_MATRIX.md)** | Trackable test IDs — all scenarios, priorities, status |
| 4 | **[PLAYWRIGHT_INTEGRATION.md](./PLAYWRIGHT_INTEGRATION.md)** | How to wire Playwright (repo layout, CI, phases) |
| 5 | **[SELECTORS_AND_CONVENTIONS.md](./SELECTORS_AND_CONVENTIONS.md)** | `data-testid` rules and Page Objects |
| 6 | **[RUNBOOK.md](./RUNBOOK.md)** | How to run tests against Docker / local |

---

## Must-cover areas (checklist)

- [x] Auth & roles (Designer, Approver, Viewer, Admin)
- [x] **Store / layout creation** (Length, Width, Height, store type, shape)
- [x] Layouts portfolio (open, clone, delete)
- [x] Layout editor palette (draw, aisles, fixtures, zones, obstacles, entry)
- [x] Smart Generate + aisle min rules
- [x] Shelf arrangement & volume accept gate
- [x] Planogram / merchandising
- [x] **3D view** (Orbit + Walk)
- [x] Approval workflow (submit / approve / reject)
- [x] **Dashboard** (KPIs + every analytics widget)
- [x] Products & categories (CRUD, import/export)
- [x] **Admin** (Users, Store Master, Approval toggle, Configuration, Audit)

---

## Related (already in repo)

- API tests: `cd codebase && npm test`
- API smoke: `cd codebase && npm run smoke:demo`
- SEED: [`Docs/seeds/SEED-12-e2e-smoke.md`](../seeds/SEED-12-e2e-smoke.md)
