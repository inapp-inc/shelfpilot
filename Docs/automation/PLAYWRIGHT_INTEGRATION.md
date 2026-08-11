# Playwright Integration Plan — ShelfPilot

**Owner:** QA / Foundry delivery  
**Audience:** Developers implementing E2E, CI maintainers, demo owners  
**App under test:** ShelfPilot (React/Vite SPA + Express API + SQLite)  
**Primary demo URL:** http://localhost:8080 (Docker Compose)  
**API health:** http://localhost:3001/health  

---

## 1. Why Playwright

ShelfPilot is a rich UI product (2D canvas, 3D WebGL, Smart Generate, planogram editor, dashboard widgets). API tests alone cannot prove:

- Login / RBAC nav visibility
- Create-layout wizard (Length / Width / Height)
- Canvas interactions and Smart Generate outcomes
- Catalog drawers, analytics widgets, admin tabs
- Role-gated actions (Viewer cannot mutate; Approver can approve)

Playwright gives reliable Chromium/Firefox/WebKit automation, screenshots/traces on failure, and CI-friendly reporters.

---

## 2. Goals

**Full product coverage is defined in:**

- [FULL_FEATURE_INVENTORY.md](./FULL_FEATURE_INVENTORY.md) — every feature  
- [MODULE_TEST_PLANS.md](./MODULE_TEST_PLANS.md) — Given/When/Then  
- [COVERAGE_MATRIX.md](./COVERAGE_MATRIX.md) — ~127 trackable scenarios including **Admin (all tabs)**, **store creation**, **3D Orbit/Walk**, and **every dashboard widget**

| Priority | Goal |
|----------|------|
| P0 | Smoke: login → dashboard → create store (L/W/H) → demo layout → 3D toggle → admin config → no aisle violations |
| P0 | Smart Generate aisles ≥ store min |
| P0 | Admin Users + Store Master + Configuration visible |
| P1 | Catalog CRUD, approval submit/approve/reject, Walk mode |
| P1 | All dashboard KPIs/widgets render (not NaN) |
| P2 | Zones, obstacles, import Excel, drill-downs |
| P3 | Visual regression of Three.js (Manual / N/A) |

---

## 3. Test architecture

```
┌─────────────────────────────────────────────────────────┐
│  Playwright Test Runner (Node ≥ 22.5)                   │
│  codebase/e2e/                                          │
├─────────────────────────────────────────────────────────┤
│  fixtures/     auth, layout helpers, API seed helpers   │
│  pages/        Page Object Models (Login, Layouts, …)   │
│  specs/        *.spec.js ordered by module              │
│  utils/        waits, toast assertions, data-testid     │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / browser
         ┌─────────────┴──────────────┐
         ▼                            ▼
   Web (nginx:8080)              API (:3001)
   React SPA                     Express + SQLite
```

**Principles:**

1. **Prefer user flows** over implementation details.
2. **Stable selectors** via `data-testid` (see [SELECTORS_AND_CONVENTIONS.md](./SELECTORS_AND_CONVENTIONS.md)).
3. **Isolate mutable data** — create uniquely named layouts/products per run; never rely on hand-edited local DB state alone.
4. **Reuse demo layout** for read-mostly smoke (`Demo Hypermarket — Generated`).
5. **API helpers allowed** for setup/teardown (login token, create layout via API) when UI setup is slow — assert critical UX still through the browser.

---

## 4. Proposed repository layout

```
codebase/
  e2e/
    playwright.config.js
    package.json                 # optional workspace @shelfpilot/e2e
    fixtures/
      auth.js                    # loginAs(role)
      env.js                     # BASE_URL, API_URL
    pages/
      LoginPage.js
      DashboardPage.js
      LayoutsPortfolioPage.js
      LayoutCreateModal.js
      LayoutEditorPage.js
      CatalogPage.js
      AdminPage.js
    specs/
      auth.login.spec.js
      layouts.create.spec.js
      layouts.smart-generate.spec.js
      layouts.demo-smoke.spec.js
      catalog.crud.spec.js
      analytics.dashboard.spec.js
      rbac.viewer.spec.js
      admin.config.spec.js
    README.md                    # short pointer back to Docs/automation
```

Root scripts to add later (in `codebase/package.json`):

```json
"test:e2e": "npm run test -w @shelfpilot/e2e",
"test:e2e:ui": "npm run test:ui -w @shelfpilot/e2e",
"test:e2e:smoke": "npm run test:smoke -w @shelfpilot/e2e"
```

---

## 5. Environments

| Env | Base URL | Notes |
|-----|----------|-------|
| Docker demo (recommended) | `http://localhost:8080` | `npm run docker:rebuild` from `codebase/` |
| Local Vite + API | web `http://localhost:5173`, API `http://localhost:3001` | Set `PLAYWRIGHT_BASE_URL` |
| CI | Compose stack or `web` service URL | Start stack before Playwright |

Config via env:

| Variable | Default | Meaning |
|----------|---------|---------|
| `PLAYWRIGHT_BASE_URL` | `http://localhost:8080` | SPA origin |
| `PLAYWRIGHT_API_URL` | `http://localhost:3001` | Direct API for helpers |
| `PLAYWRIGHT_HEADLESS` | `1` | Set `0` for headed debug |

---

## 6. Demo accounts (local / Docker only)

| Role | Email | Password |
|------|-------|----------|
| Designer | `designer@shelfpilot.local` | `password` |
| Approver | `approver@shelfpilot.local` | `password` |
| Viewer | `viewer@shelfpilot.local` | `password` |
| Admin | `admin@shelfpilot.local` | `password` |

Do **not** use these credentials outside local/demo automation.

---

## 7. Implementation phases

### Phase A — Scaffold ✅

1. Playwright under `codebase/e2e`.
2. Config: Chromium, HTML reporter, trace on first retry.
3. `LoginPage` + `auth.login.spec.js` (Designer happy path + bad password + sign out).
4. `npm run test:e2e:smoke` wired.

### Phase B — Core product smoke (P0) ✅

1. Layouts portfolio lists demo layout.
2. Create layout modal: Length / Width / Height labels + submit.
3. Smart Generate without aisle-width violations banner; arrangement panel → accept.
4. Dashboard / analytics shell loads + 3D toggle.

### Phase C — RBAC / catalog / admin / approval ✅ (smoke slice)

Specs: `rbac.viewer`, `catalog.crud`, `admin.config`, `approval.workflow`, `layouts.arrangement`.  
**~24+ `@smoke` tests** against Docker (`http://localhost:8080`) including arrangement & volume gate.

Remaining matrix rows (`@critical` / `@full`) still tracked in [COVERAGE_MATRIX.md](./COVERAGE_MATRIX.md).

### Phase D — CI (next)

1. Job: start Compose → wait health → `npx playwright install --with-deps` → `test:e2e:smoke`.
2. Upload HTML report + traces on failure.
3. Keep API `npm test` as fast PR gate; Playwright smoke as merge or nightly gate until stable.

---

## 8. Mapping to product modules (BRD M1–M6)

| Module | Screen | Playwright focus |
|--------|--------|------------------|
| M1 | Layout Editor + create wizard | Dimensions, canvas shell, aisles |
| M2 | Fixtures / auto-calc | Palette place, Smart Generate stats |
| M3 | Products & Categories | Catalog CRUD / import smoke |
| M4 | Mapping & 2D/3D | Category on shelf, View in 3D smoke |
| M5 | Analytics | Dashboard widgets visible |
| M6 | Admin | Users / config / audit by role |

---

## 9. Relationship to existing tests

| Layer | Location | Role |
|-------|----------|------|
| Unit / API | `codebase/api/test/**` | Algorithms, routes, packer, analytics math |
| API smoke | `codebase/scripts/smoke-demo.mjs` | Health + login + thin happy path |
| E2E UI | `codebase/e2e/**` | Full browser functionality (Phases A–C smoke live) |
| Spec SEED | `Docs/seeds/SEED-12-e2e-smoke.md` | Historical smoke SEED; Playwright fulfills UI half |

**Rule:** Do not re-test packer math in Playwright. Assert **user-visible outcomes** (violation banners cleared, shelf count > 0, product appears in catalog list).

---

## 10. Definition of done (automation program)

- [x] Docs under `Docs/automation/` reviewed (this pack)
- [x] Playwright scaffold with `@smoke` suite green on Docker (Phases A–C + arrangement gate)
- [ ] Coverage matrix rows marked Automated for all P0 items (most P0 smoke done; remaining planogram open / demo-gate)
- [ ] CI job publishes report artifacts (**Phase D**)
- [x] Handover / README mentions `test:e2e` commands

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Canvas / WebGL flaky | Prefer API or DOM side-effects; 3D = “canvas exists + no error toast” |
| Shared SQLite state | Unique names (`E2E-{timestamp}`); optional API reset endpoint later |
| Docker cold start | `webServer` or Compose health wait in config |
| Selector churn | Mandate `data-testid`; ban CSS-class-only locators |
| Native `confirm()` flaky | Stub `window.confirm` in Smart Generate page object |

---

## 12. Next step

**Phase D** — CI job for Compose + `test:e2e:smoke`, then expand remaining `@critical` / `@full` matrix rows.
