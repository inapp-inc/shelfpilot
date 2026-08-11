# ShelfPilot — Pending Work & Status Gaps

_Last updated: 2026-08-11_

Consolidated view of what is still **pending**, **partial**, or **documented as planned but already implemented**. Use this alongside [project.md](../project.md), [BRD_ADDENDUM_DEMO_AUG_2026.md](./BRD_ADDENDUM_DEMO_AUG_2026.md), and [DEMO_CHANGES_SUMMARY.md](./DEMO_CHANGES_SUMMARY.md).

---

## 1. Documentation out of date (pending refresh)

These docs still list Aug 2026 demo items as **Planned** even though code exists. Updating them is pending.

| File | What is stale |
|------|----------------|
| [project.md](../project.md) | §3–§7 still say Customer, Warehouse, temporary storage, aisle fixes are “planned” or “in progress”. |
| [DEMO_CHANGES_SUMMARY.md](./DEMO_CHANGES_SUMMARY.md) | “Customer feedback captured (planned)” table still lists FR-BUF-01, FR-TEMP-01, FR-CUST-01, FR-VIEW-01, FR-WH-01 as planned. |
| [BRD_ADDENDUM_DEMO_AUG_2026.md](./BRD_ADDENDUM_DEMO_AUG_2026.md) | §3.6 “Known demo gap” for aisle selection is superseded; §4 status columns for FR-BUF-01, FR-TEMP-01, FR-CUST-01, FR-VIEW-01, FR-WH-01 still say Planned / Discovery. |
| [openspec/project.md](../openspec/project.md) | Likely mirrors root `project.md` — verify and sync. |

### Implemented in code but marked planned in docs

| ID | Requirement | Code pointers |
|----|-------------|---------------|
| FR-AISLE-01/02 | Aisle-based 2D/3D selection | `LayoutEditor.jsx`, `Scene3D.jsx`, `layoutMath.js` |
| FR-BUF-01 | 1 cm product lateral buffer | `codebase/shared/productBuffer.mjs`, planogram math |
| FR-TEMP-01 | Temporary storage fixtures | `temporaryStorage.js`, palette, `temporary-storage.test.js` |
| FR-VIEW-01 | Flat adjacent/opposite shelf viewer | `AisleShelfViewModal.jsx` |
| FR-WH-01 | Warehouse store type | `warehouseLayout.mjs`, `layoutPacker.js`, `warehouse-layout.test.js` |

---

## 2. Product features — still pending or partial

### FR-CUST-01 — Customer role & wayfinding (partial)

| Done | Pending |
|------|---------|
| Customer role in RBAC (API + web) | Wire **CustomerShopPage** (store picker by store type) into `App.jsx` |
| `shopperLayoutId` on user create | Multi-layout browse for Customer (today: one assigned layout only) |
| Public shop API (`/shop/*`) | Clarify visibility rules: approved-only vs demo layouts (BRD open question) |
| `ShopperKioskPage` — find product + wayfinding | End-to-end Playwright coverage |

**Note:** `CustomerShopPage.jsx` exists but is not imported or routed. Customers login → redirect to assigned layout kiosk.

### Open product questions (BRD addendum §6)

| # | Question | Status |
|---|----------|--------|
| 1 | Warehouse vs retail — same canvas/editor or separate skin? | Unresolved |
| 2 | Which layouts are visible to Customer (approved only? assigned stores?) | Unresolved |
| 3 | Product buffer — auto-fill only, or also manual planogram facing preview? | Unresolved |
| 4 | Temporary storage — does it consume capacity in fixture auto-calc? | Unresolved |

### Demo / polish (optional)

| Item | Notes |
|------|-------|
| Warehouse demo bootstrap layout | Pre-built warehouse layout in `bootstrapDemo.js` for tomorrow’s demo |
| Doc sync after demo | Close the gap in §1 above |

---

## 3. In-app “pending” states (runtime — not missing features)

These are normal workflow states inside the running application.

| State | Where | Meaning |
|-------|-------|---------|
| Layout **`in_review`** | Layout portfolio, editor, API | Submitted for approval; Approver/Admin can approve/reject |
| **Pending approval** KPI | Analytics dashboard | Count of layouts with status `in_review` |
| **Arrangement pending** banner | Layout editor after Smart Generate | User must accept arrangement summary before merchandising |
| **Draft polygon vertices** | Canvas draw-area tool | Fixture area not applied until user clicks Apply |

### Layout status lifecycle

```
draft → in_review → approved
                  → rejected → (back to draft for edits)
```

---

## 4. SEED units — pending review / approval

Process artifacts under `Docs/seeds/` (governance, not runtime gaps). Representative list:

| Change folder | Example units | Status |
|---------------|---------------|--------|
| `catalog-merch-ui-v2` | SEED-CM-00, SEED-CM-03, SEED-CM-06 | Pending approval |
| `layout-client-feedback` | SEED-CF-01 … SEED-CF-08 | Pending review |
| `module-reframe-smart-autogen` | SEED-MR-03, SEED-MR-05, SEED-MR-07 | Pending review |
| `dual-face-numbered-shelves-strict-polygon` | SEED-DF-02 … SEED-DF-05 | Pending review |
| `layout-dimensions-rotation-shelf-bays` | SEED-LD-02 … SEED-LD-05 | Pending review |

Full index: [Docs/seeds/README.md](./seeds/README.md)

---

## 5. SEED plan — Todo / Partial (platform completeness)

From [SEED_PLAN_FULL.md](./SEED_PLAN_FULL.md). Many **Partial** items work in the demo but are not closed to full FSD / UI source-of-truth.

| SEED-ID | Goal | Status |
|---------|------|--------|
| SEED-00c-openapi-align | OpenAPI matches every live route | Partial → **Todo** |
| SEED-01b-auth-session-hardening | Session security hardening | **Todo** |
| SEED-02-admin-config | Admin config completeness | Partial → **Todo** |
| SEED-02b-user-admin-crud | Full user admin CRUD | **Todo** |
| SEED-03-dashboard-projects | Dashboard to FSD | Partial → **Todo** |
| SEED-04-layout-canvas | Canvas to FSD | Partial → **Todo** |
| SEED-04b-zones-polygon | Zones + polygon | **Todo** |
| SEED-05-fixtures-autocalc | Fixtures + autocalc | Partial → **Todo** |
| SEED-05b-fixture-drag-snap | Drag/snap polish | **Todo** |
| SEED-06-products-categories | Catalog to FSD | Partial → **Todo** |
| SEED-06b-catalog-seed-verticals | Vertical seed data | **Todo** |
| SEED-07a-category-mapping | Mapping completeness | Partial → **Todo** |
| SEED-07b-viz-2d-fidelity | 2D fidelity vs UI SoT | Partial → **Todo** |
| SEED-07c-viz-3d | 3D completeness | Partial → **Todo** |
| SEED-08-analytics | Analytics to FSD | Partial → **Todo** |
| SEED-08b-version-compare | Version compare UI | **Todo** |
| SEED-08c-layout-versions | Layout versioning UX | **Todo** |
| SEED-09-ui-reference | UI parity with `ui/ShelfPilot.dc.html` | Partial → **Todo** |
| SEED-10-demo-dataset | Curated demo dataset | **Todo** |
| SEED-11-compose-demo-pack | Demo packaging | **Todo** |
| SEED-12-e2e-smoke | E2E smoke suite | **Todo** |
| SEED-13-handover-refresh | Handover doc refresh | **Todo** |

---

## 6. Test automation — Playwright pending

[COVERAGE_MATRIX.md](./automation/COVERAGE_MATRIX.md) — **~82 scenarios** still marked **Todo** (API unit tests cover much of the logic).

### High-priority E2E gaps (P0/P1)

| Area | Examples |
|------|----------|
| Navigation | B-01 — Designer nav smoke |
| Store creation | C-05–C-09 — non-Hypermarket store types; C-10 — irregular polygon |
| Portfolio | D-03 clone, D-04 delete, D-05 status filter |
| Editor canvas | E-02 draw area, E-04/E-05 aisle tools, E-06 fixtures |
| Smart Generate | Arrangement accept, warehouse vertical |
| Customer / shop | Shop kiosk find product, Customer RBAC redirect |
| 3D | Orbit/walk smoke, product images |

Detail: [MODULE_TEST_PLANS.md](./automation/MODULE_TEST_PLANS.md)

---

## 7. Production migration — explicitly deferred

From [HANDOVER_PRODUCTION_MIGRATION.md](./HANDOVER_PRODUCTION_MIGRATION.md). The local MVP is **not production-ready**.

| Capability | Local (now) | Production (pending) |
|------------|-------------|----------------------|
| Identity | Mock email/password + role picker | Enterprise IdP (OIDC/SAML), MFA |
| Authorization | Role string on token | RBAC/ABAC, tenant isolation |
| Database | SQLite file on Docker volume | Managed MongoDB (ADR-0004) or approved DB |
| Deploy | Single-host Docker Compose | Orchestration, TLS, secrets management |
| Observability | Correlation ID + stdout | Metrics, traces, alerts, dashboards |
| HA / DR | Single node | Multi-AZ, backups, RPO/RTO |
| Compliance | Prototype OWASP notes | Hardened OWASP + audit retention |

Workstreams: WS-1 … WS-8 / SEED-P01 … in production handover.

---

## 8. Out of scope (unchanged — not pending for this MVP)

- POS integration  
- Real-time inventory / stock  
- Physical fixture procurement  
- Structural engineering sign-off  
- Foot-traffic sensors  

---

## 9. Suggested priority order

1. **Doc refresh** — Align `project.md`, BRD addendum, and demo summary with implemented FR-* items.  
2. **FR-CUST-01 completion** — Route `CustomerShopPage` or document single-layout assignment as intentional.  
3. **Resolve BRD §6 open questions** — Especially Customer layout visibility and warehouse editor UX.  
4. **Demo hardening** — Warehouse bootstrap layout; verify Docker rebuild path.  
5. **SEED-00c-openapi-align** — Contract drift risk.  
6. **SEED-12-e2e-smoke** — Critical path Playwright scenarios.  
7. **Production migration** — When moving off local demo stack.

---

## 10. Quick reference — Aug 2026 demo requirements

| ID | Summary | True status |
|----|---------|-------------|
| FR-AISLE-01/02 | Aisle-based selection 2D/3D | **Done** |
| FR-BUF-01 | 1 cm product buffer | **Done** |
| FR-TEMP-01 | Temporary storage fixtures | **Done** |
| FR-VIEW-01 | Flat aisle shelf viewer | **Done** |
| FR-WH-01 | Warehouse store type | **Done** (design questions remain) |
| FR-CUST-01 | Customer find + wayfinding | **Partial** — kiosk yes, store picker not wired |

---

_Related: [HANDOVER.md](./HANDOVER.md) · [FULL_FEATURE_INVENTORY.md](./automation/FULL_FEATURE_INVENTORY.md)_
