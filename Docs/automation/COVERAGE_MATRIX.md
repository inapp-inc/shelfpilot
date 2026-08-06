# Coverage Matrix — Complete Playwright Scenarios

**Status values:** `Todo` · `In progress` · `Automated` · `Manual only` · `N/A`  
**Tags:** `@smoke` · `@critical` · `@full` · `@rbac` · `@3d` · `@admin` · `@dashboard`

Link to human-readable steps: [MODULE_TEST_PLANS.md](./MODULE_TEST_PLANS.md)  
Feature list: [FULL_FEATURE_INVENTORY.md](./FULL_FEATURE_INVENTORY.md)

---

## A · Auth & session

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| A-01 | Valid Designer login | Designer | P0 | @smoke | Automated | TP-AUTH-01 |
| A-02 | Bad password rejected | — | P0 | @smoke | Automated | TP-AUTH-02 |
| A-03 | Login as Approver | Approver | P0 | @smoke | Automated | TP-AUTH-03 |
| A-04 | Login as Viewer | Viewer | P0 | @smoke | Automated | TP-AUTH-03 |
| A-05 | Login as Admin | Admin | P0 | @smoke | Automated | TP-AUTH-03 |
| A-06 | Sign out clears session | Designer | P1 | @critical | Automated | TP-AUTH-04 |

---

## B · Navigation & RBAC

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| B-01 | Nav: Dashboard, Layouts, Products | Designer | P0 | @smoke | Todo | — |
| B-02 | Admin nav visible | Admin | P0 | @smoke @admin | Automated | TP-ADM-01 |
| B-03 | Admin nav = Audit only | Approver | P1 | @rbac @admin | Automated | TP-ADM-08 |
| B-04 | No Admin nav | Designer | P1 | @rbac | Automated | TP-ADM-07 |
| B-05 | Viewer cannot Smart Generate | Viewer | P0 | @rbac | Automated | TP-EDIT-04 |
| B-06 | Viewer catalog read-only | Viewer | P1 | @rbac | Automated | TP-CAT-04 |

---

## C · Store / layout creation

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| C-01 | Open New store layout modal | Designer | P0 | @smoke | Automated | TP-CREATE-01 |
| C-02 | Labels Length / Width / Height | Designer | P0 | @smoke | Automated | TP-CREATE-01 |
| C-03 | Create Hypermarket (L×W×H) | Designer | P0 | @smoke | Automated | TP-CREATE-02 |
| C-04 | Empty name validation | Designer | P1 | @critical | Automated | TP-CREATE-03 |
| C-05 | Create Pharmacy store type | Designer | P1 | @full | Todo | TP-CREATE-04 |
| C-06 | Create Beauty store type | Designer | P2 | @full | Todo | TP-CREATE-04 |
| C-07 | Create Apparel store type | Designer | P2 | @full | Todo | TP-CREATE-04 |
| C-08 | Create Convenience store type | Designer | P2 | @full | Todo | TP-CREATE-04 |
| C-09 | Create Supermarket store type | Designer | P1 | @full | Todo | TP-CREATE-04 |
| C-10 | Shape = Draw irregular (opens editor for polygon) | Designer | P1 | @critical | Todo | — |
| C-11 | Shelf templates preview shown from Store Master | Designer | P2 | @full | Todo | — |

---

## D · Layouts portfolio

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| D-01 | Demo Hypermarket listed | Designer | P0 | @smoke | Automated | TP-PORT-01 |
| D-02 | Open demo into editor | Designer | P0 | @smoke | Automated | TP-PORT-02 |
| D-03 | Clone layout | Designer | P1 | @critical | Todo | TP-PORT-03 |
| D-04 | Delete E2E layout | Designer | P1 | @critical | Todo | TP-PORT-04 |
| D-05 | Status filter (if UI) | Designer | P2 | @full | Todo | — |

---

## E · Layout editor palette & canvas

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| E-01 | Palette tools visible | Designer | P0 | @smoke | Automated | TP-EDIT-01 |
| E-11 | Violations region exists | Designer | P0 | @smoke | Automated | — |
| E-02 | Draw area + Apply (≥3 points) | Designer | P1 | @critical | Todo | — |
| E-03 | Edit area enabled after polygon | Designer | P2 | @full | Todo | — |
| E-04 | Place Aisle H tool selectable | Designer | P1 | @critical | Todo | — |
| E-05 | Place Aisle V tool selectable | Designer | P1 | @critical | Todo | — |
| E-06 | Fixture tools from Store Master | Designer | P1 | @critical | Todo | — |
| E-07 | Zone tools visible | Designer | P2 | @full | Todo | — |
| E-08 | Obstacle tools visible | Designer | P2 | @full | Todo | — |
| E-09 | Entry point tool visible | Designer | P2 | @full | Todo | — |
| E-10 | Selection bar updates | Designer | P1 | @critical | Todo | — |
| E-11 | Violations region exists | Designer | P0 | @smoke | Automated | — |
| E-12 | Fullscreen toggle | Designer | P2 | @full | Todo | — |
| E-13 | Floor plan panel open (if present) | Designer | P2 | @full | Todo | — |

---

## F · Smart Generate

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| F-01 | Open Smart Generate | Designer | P0 | @smoke | Automated | TP-EDIT-02 |
| F-02 | Shows store min aisle rule | Designer | P0 | @critical | Automated | TP-EDIT-02 |
| F-03 | Mix must be 100% before run | Designer | P1 | @critical | Todo | — |
| F-04 | Run generate — aisles ≥ min, no width violations | Designer | P0 | @smoke | Automated | TP-EDIT-03 |
| F-05 | Auto-fill planogram stats | Designer | P1 | @critical | Todo | — |
| F-06 | Orientation options work | Designer | P2 | @full | Todo | — |

---

## G · Planogram & find products

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| G-01 | Open planogram on shelf | Designer | P1 | @critical | Todo | TP-POG-01 |
| G-02 | Dual-face A/B (gondola) | Designer | P2 | @full | Todo | — |
| G-03 | Find products search | Designer | P1 | @critical | Todo | TP-POG-02 |
| G-04 | Missing products panel | Designer | P2 | @full | Todo | TP-POG-03 |
| G-05 | Split segment no false overlap | Designer | P1 | @critical | Todo | — |

---

## H · 3D view

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| H-01 | Open View in 3D / Orbit — canvas, no crash | Designer | P0 | @smoke @3d | Automated | TP-3D-01 |
| H-02 | Walk mode — no crash | Designer | P1 | @critical @3d | Todo | TP-3D-02 |
| H-03 | Return to 2D | Designer | P0 | @smoke @3d | Automated | TP-3D-03 |
| H-04 | Planogram ↔ 3D handoff | Designer | P2 | @full @3d | Todo | TP-3D-04 |
| H-05 | Pixel visual regression | — | P3 | — | Manual only / N/A | — |

---

## I · Approval workflow

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| I-01 | Submit for review | Designer | P1 | @critical | Automated | TP-APPR-01 |
| I-02 | Approve layout | Approver | P1 | @critical | Automated | TP-APPR-02 |
| I-03 | Reject requires comment | Approver | P1 | @critical | Automated | TP-APPR-03 |
| I-04 | Viewer cannot submit/approve | Viewer | P1 | @rbac | Automated | — |

---

## J · Dashboard & analytics

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| J-01 | Dashboard shell loads | Designer | P0 | @smoke @dashboard | Automated | TP-DASH-01 |
| J-02 | Layout picker changes analytics | Designer | P0 | @smoke @dashboard | Automated | TP-DASH-02 |
| J-03 | Status counts visible | Designer | P1 | @dashboard | Todo | TP-DASH-01 |
| J-04 | Section filter Space | Designer | P1 | @dashboard | Todo | TP-DASH-03 |
| J-05 | Section filter Compliance | Designer | P1 | @dashboard | Todo | TP-DASH-03 |
| J-06 | Section filter Category | Designer | P1 | @dashboard | Todo | TP-DASH-03 |
| J-07 | KPI Utilization renders (not NaN) | Designer | P0 | @smoke @dashboard | Automated | TP-DASH-04 |
| J-08 | KPI Product coverage | Designer | P1 | @dashboard | Todo | TP-DASH-04 |
| J-09 | KPI Aisle compliance | Designer | P0 | @critical @dashboard | Todo | TP-DASH-04 |
| J-10 | KPI Unmapped shelves | Designer | P1 | @dashboard | Todo | TP-DASH-04 |
| J-11 | KPI Fixtures | Designer | P1 | @dashboard | Todo | TP-DASH-04 |
| J-12 | KPI Storage volume | Designer | P1 | @dashboard | Todo | TP-DASH-04 |
| J-13 | KPI Shelf load | Designer | P1 | @dashboard | Todo | TP-DASH-04 |
| J-14 | KPI Capacity variance | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-15 | KPI Pending approval | Designer | P1 | @dashboard | Todo | TP-DASH-04 |
| J-16 | Widget space-utilization | Designer | P0 | @critical @dashboard | Todo | TP-DASH-04 |
| J-17 | Widget storage-volume | Designer | P1 | @dashboard | Todo | TP-DASH-04 |
| J-18 | Widget shelf-load | Designer | P1 | @dashboard | Todo | TP-DASH-04 |
| J-19 | Widget fixture-density | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-20 | Widget unmapped-shelves | Designer | P1 | @dashboard | Todo | TP-DASH-04 |
| J-21 | Widget vertical-space | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-22 | Widget capacity-compare | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-23 | Widget fixture-mix | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-24 | Widget scenario-compare | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-25 | Widget store-benchmarking (role) | Admin | P1 | @rbac @dashboard | Todo | TP-DASH-05 |
| J-26 | Widget category-allocation | Designer | P1 | @dashboard | Todo | TP-DASH-04 |
| J-27 | Widget facings-by-category | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-28 | Widget product-coverage | Designer | P1 | @dashboard | Todo | TP-DASH-04 |
| J-29 | Widget category-adjacency | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-30 | Widget aisle-compliance | Designer | P0 | @critical @dashboard | Todo | TP-DASH-04 |
| J-31 | Widget walkability | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-32 | Widget regulatory-compliance | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-33 | Widget version-compare | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-34 | Widget audit-activity (role) | Admin | P1 | @rbac @dashboard | Todo | TP-DASH-05 |
| J-35 | Widget approval-status | Designer | P1 | @dashboard | Todo | TP-DASH-04 |
| J-36 | Widget rollout-progress | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-37 | Widget vertical-comparison | Designer | P2 | @dashboard | Todo | TP-DASH-04 |
| J-38 | Widget layout-standardization (role) | Admin | P1 | @rbac @dashboard | Todo | TP-DASH-05 |
| J-39 | Drill-down navigation | Designer | P2 | @dashboard | Todo | TP-DASH-06 |
| J-40 | New layout CTA from dashboard | Designer | P1 | @dashboard | Todo | — |

---

## K · Catalog (Products & Categories)

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| K-01 | Product list loads | Designer | P0 | @smoke | Automated | TP-CAT-01 |
| K-02 | Category tree navigable | Designer | P1 | @critical | Todo | — |
| K-03 | Create category | Designer | P1 | @critical | Automated | TP-CAT-02 |
| K-04 | Create product + dimensions | Designer | P1 | @critical | Automated | TP-CAT-03 |
| K-05 | Edit product | Designer | P2 | @full | Todo | — |
| K-06 | Delete product (E2E-created) | Designer | P2 | @full | Todo | — |
| K-07 | Image upload | Designer | P2 | @full | Todo | — |
| K-08 | Export / template download | Designer | P2 | @full | Todo | TP-CAT-05 |
| K-09 | Excel import smoke | Designer | P2 | @full | Todo | — |
| K-10 | Viewer cannot create | Viewer | P1 | @rbac | Automated | TP-CAT-04 |

---

## L · Admin — Users & Roles

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| L-01 | List seeded users | Admin | P0 | @smoke @admin | Automated | TP-ADM-01 |
| L-02 | Create user | Admin | P1 | @critical @admin | Automated | TP-ADM-02 |
| L-03 | Non-admin cannot create | Approver | P1 | @rbac @admin | Automated | TP-ADM-08 |

---

## M · Admin — Store Master

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| M-01 | Open Store Master | Admin | P0 | @smoke @admin | Automated | TP-ADM-03 |
| M-02 | Switch vertical / store type | Admin | P1 | @admin | Todo | TP-ADM-03 |
| M-03 | Shelf templates editor visible | Admin | P0 | @critical @admin | Automated | TP-ADM-03 |
| M-04 | Save shelf templates (safe) | Admin | P1 | @admin | Todo | TP-ADM-03 |

---

## N · Admin — Approval Workflow

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| N-01 | Toggle visible | Admin | P1 | @admin | Automated | TP-ADM-04 |
| N-02 | Save approval setting | Admin | P1 | @admin | Todo | TP-ADM-04 |

---

## O · Admin — Configuration

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| O-01 | Hypermarket min aisle = 1.5 | Admin | P0 | @smoke @admin | Automated | TP-ADM-05 |
| O-02 | Save configuration | Admin | P1 | @admin | Todo | TP-ADM-05 |
| O-03 | Designer cannot open Config | Designer | P1 | @rbac | Automated | TP-ADM-07 |

---

## P · Admin — Audit Log

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| P-01 | Admin sees audit list/empty | Admin | P1 | @admin | Automated | TP-ADM-06 |
| P-02 | Approver sees audit | Approver | P1 | @rbac @admin | Automated | TP-ADM-06 |

---

## Q · Demo gate

| ID | Scenario | Role | Pri | Tag | Status | Plan |
|----|----------|------|-----|-----|--------|------|
| Q-01 | Full pre-demo smoke chain | Designer+Admin | P0 | @smoke | Todo | TP-GATE-01 |
| Q-02 | No pageerror on smoke path | Designer | P0 | @smoke | Todo | TP-GATE-01 |

---

## Counts (Phases A–C smoke live — 22 `@smoke` green)

| Area | Scenarios | Automated |
|------|----------:|----------:|
| Auth | 6 | 6 |
| RBAC / Nav | 6 | 5 |
| Store creation | 11 | 4 |
| Portfolio | 5 | 2 |
| Editor / Generate | 19 | 5 |
| Planogram | 5 | 0 |
| **3D** | 5 | 2 |
| Approval | 4 | 4 |
| **Dashboard** | 40 | 3 |
| Catalog | 10 | 4 |
| **Admin (all tabs)** | 14 | 10 |
| Demo gate | 2 | 0 |
| **Total** | **~127** | **~45** |

---

## Recommended build order

1. ~~**Phases A–C `@smoke`**~~ **Done** (auth, layouts, generate, 3D, dashboard shell, RBAC, catalog CRUD, admin tabs, approval)  
2. Remaining `@critical` (planogram, Walk 3D, clone/delete, import)  
3. Full dashboard widget loop (J-07…J-38)  
4. `@full` canvas placements / import / Walk polish  
5. **Phase D** — CI job for `test:e2e:smoke`
