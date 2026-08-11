# Full Feature Inventory — ShelfPilot (for Playwright)

This is the **complete product surface** automation must cover.  
If a feature is listed here, it belongs in the coverage matrix and (eventually) in an E2E suite or an explicit **Manual only** exception.

**App:** http://localhost:8080  
**Stack:** React SPA · Express API · SQLite · Docker  

---

## 1. Login & access

| Feature | Where | Notes |
|---------|-------|-------|
| Email + password login | Login screen | Demo users `*@shelfpilot.local` / `password` |
| Role selection | Login screen | Designer, Approver, Viewer, Admin |
| Invalid credentials error | Login screen | |
| Sign out | Header | Clears session |
| Vertical / store-type selector | Header | Changes catalog/config context |

---

## 2. Navigation (by role)

| Module | Path | Designer | Approver | Viewer | Admin |
|--------|------|:--------:|:--------:|:------:|:-----:|
| Dashboard | `/dashboard` | ✓ | ✓ | ✓ | ✓ |
| Layouts | `/layouts`, `/layouts/:id` | ✓ | ✓ | ✓ | ✓ |
| Products (Catalog) | `/products` | ✓ | ✓ | ✓ | ✓ |
| Admin | `/admin` | ✗ | Audit only | ✗ | All tabs |

---

## 3. Store / layout creation (New store layout)

| Feature | Details |
|---------|---------|
| Open create modal | From Layouts / Dashboard “New” |
| Store name | Required |
| Store type | Hypermarket, Supermarket, Pharmacy, Beauty, Apparel, Convenience |
| **Length (m)** | Floor X — was labeled Width |
| **Width (m)** | Floor Y — was labeled Depth |
| **Height (m)** | Ceiling height |
| Floor shape | Rectangle **or** Draw irregular in canvas |
| Shelf templates preview | Inherited from Admin → Store Master |
| Validation | Empty name / invalid dimensions blocked |
| Success | Layout created → opens editor |

---

## 4. Layouts portfolio

| Feature | Details |
|---------|---------|
| List layouts | Cards with name, size, status |
| Open layout | Navigates to editor |
| Clone layout | Duplicate |
| Delete layout | Confirm + remove |
| Status filters | draft / in_review / approved / rejected (if UI exposed) |
| Demo layout | `Demo Hypermarket — Generated` |

---

## 5. Layout editor — tools (Palette)

| Tool | What it does |
|------|----------------|
| Select | Click / drag move entities |
| Draw area | Polygon floor; Apply area (≥3 vertices) |
| Edit area | Drag vertices |
| **Generate** | Opens Smart Generate |
| Aisle H / Aisle V | Place walk aisles |
| Fixture types | From Store Master (gondola, shelf, chilled, …) |
| Zones | Merchandising zone overlays |
| Obstacles | Columns / blocked areas |
| Entry point | Store entrance marker |
| Floor plan (panel) | Upload / manage floor plan image if enabled |
| Side panels | Merchandising, Planogram config, Missing products, Find products, Zones, Shelf load, etc. |

---

## 6. Smart Generate

| Feature | Details |
|---------|---------|
| Min aisle width | ≥ store rule (hypermarket **1.5 m**) |
| Orientation | Mixed / Auto / Horizontal / Vertical |
| Category mix | Must total **100%** |
| Auto-fill planogram | Optional on **Accept arrangement** (not during Smart Generate) |
| Replace existing | Regenerates aisles + shelves; clears arrangement acceptance |
| Outcomes | Gondola units, walk aisles; then arrangement & volume review |
| Must not create | Aisle width violations (`width < min`) |

---

## 6b. Shelf arrangement & volume (workflow gate)

| Feature | Details |
|---------|---------|
| After Smart Generate | Arrangement panel shows rows, shelves/row, utilization, volume, capacity |
| Layout summary | Store / walking / fixture / unused area, bays, total volume |
| Accept | Unlocks product allocation / planogram editing |
| Optional fill | Auto-fill planogram from catalog on accept |
| Reopen | View summary after accept without re-locking |

---

## 7. Planogram & merchandising

| Feature | Details |
|---------|---------|
| Requires arrangement accepted | Planogram blocked until summary accepted |
| Assign category to shelf | Required before products |
| Open planogram editor | Per shelf / face (A/B dual-face) |
| Place facings on levels | Product on shelf level |
| Split segments | Must not false-fail on aisle overlap |
| Find products | Search by product / category / missing |
| Missing products panel | Unplaced SKUs |
| Shelf badges / hover | Numbers and tooltips |

---

## 8. 2D canvas interactions

| Feature | Details |
|---------|---------|
| Zoom / pan / fit | Mouse wheel, fit-to-view |
| Drag entities | Move shelves/aisles inside floor |
| Resize aisle handles | Width ≥ min |
| Violations banner | Aisle / containment / overlap |
| Fullscreen editor | Browser fullscreen |
| Selection bar | Shows selected entity details |

---

## 9. 3D view (must automate smoke)

| Feature | Details |
|---------|---------|
| Toggle **View in 3D** / Orbit | WebGL canvas appears; no page crash |
| Orbit controls | Rotate / zoom (soft assert: canvas exists) |
| **Walk mode** | First-person style if enabled |
| Shelf number labels | Visible on shelves (soft) |
| Product images on shelves | Soft assert when planogram filled |
| Return to 2D | Toggle off cleanly |
| Planogram ↔ 3D handoff | Open 3D from planogram and back |

**Note:** Pixel-perfect 3D visual regression is **out of scope** for v1 Playwright. Crash-free + canvas present = pass.

---

## 10. Approval workflow

| Feature | Role | Details |
|---------|------|---------|
| Submit for review | Designer / Admin | From draft with changes |
| Approve | Approver / Admin | Status → approved |
| Reject + comment | Approver / Admin | Comment required |
| Dirty since submit | — | Blocks duplicate submit until changes |
| Approval toggle | Admin | Admin → Approval Workflow tab |

---

## 11. Dashboard & analytics (all widgets)

### 11.1 Shell

| Feature | Details |
|---------|---------|
| Layout picker | Which layout feeds analytics |
| Status counts | Draft / In review / Approved / Rejected |
| Section filters | All, Executive, Space, Capacity, Category, Compliance, Version, Cross-store |
| View tabs | Reports / tools as implemented |
| Widget customize | Show/hide widgets (localStorage) |
| Drill-down | KPI → layouts / editor / admin (role-gated) |
| New layout CTA | Opens create modal |

### 11.2 KPI widgets

| Widget ID | Label |
|-----------|-------|
| `kpi-utilization` | Utilization |
| `kpi-product-coverage` | Product coverage |
| `kpi-aisle-compliance` | Aisle compliance |
| `kpi-unmapped-shelves` | Unmapped shelves |
| `kpi-fixtures` | Fixtures |
| `kpi-storage-volume` | Storage volume |
| `kpi-shelf-load` | Shelf load |
| `kpi-capacity-variance` | Capacity variance |
| `kpi-pending-approval` | Pending approval |

### 11.3 Report widgets

| Widget ID | Label |
|-----------|-------|
| `space-utilization` | Space utilization |
| `storage-volume` | Storage volume & category allocation |
| `shelf-load` | Shelf weight load |
| `fixture-density` | Fixture density |
| `unmapped-shelves` | Unmapped shelves |
| `vertical-space` | Space by level & density |
| `capacity-compare` | Capacity vs auto-calc |
| `fixture-mix` | Fixture mix |
| `scenario-compare` | Scenario comparison |
| `store-benchmarking` | Store benchmarking (Admin/Approver) |
| `category-allocation` | Category space allocation |
| `facings-by-category` | Facings by category |
| `product-coverage` | Product mapping coverage |
| `category-adjacency` | Category adjacency |
| `aisle-compliance` | Aisle compliance |
| `walkability` | Walkability / flow |
| `regulatory-compliance` | Regulatory compliance |
| `version-compare` | Version comparison |
| `audit-activity` | Audit / change history (Admin/Approver) |
| `approval-status` | Approval status |
| `rollout-progress` | Rollout progress |
| `vertical-comparison` | Vertical comparison |
| `layout-standardization` | Layout standardization (Admin/Approver) |

**Automation rule for widgets:** each must **render without NaN/blank crash**; deep formula correctness stays in API unit tests.

---

## 12. Products & categories (Catalog)

| Feature | Details |
|---------|---------|
| Product list | Search / filter |
| Category tree | Hierarchy browse |
| Create / edit / delete product | Designer, Admin |
| Create / edit / delete category | Designer, Admin |
| Product dimensions & weight | Form fields |
| Product image upload | |
| Import Excel | Designer, Admin |
| Export | |
| Download import template | |
| Viewer read-only | No create/edit |

---

## 13. Admin & Config (full)

| Tab | Who sees it | Features to automate |
|-----|-------------|----------------------|
| **Users & Roles** | Admin | List users; create user (name, email, role, password) |
| **Store Master** | Admin | Pick store type/vertical; edit **shelf templates** with **feet** dimensions; **live shelf volume** (cu ft / cu in); save |
| **Approval Workflow** | Admin | Enable/disable approval workflow per vertical |
| **Configuration** | Admin | Min aisle width (m) per vertical; save |
| **Audit Log** | Admin + Approver | Recent audit events list |

---

## 14. Explicit Manual-only / N/A (v1)

| Item | Why |
|------|-----|
| Three.js pixel visual regression | Too flaky / expensive for v1 |
| Performance / load testing | Different tool |
| Production IdP / SSO | Not in demo |
| Multi-browser matrix beyond Chromium in CI | Optional local |

---

## Coverage completeness statement

| Area | Documented for E2E? |
|------|---------------------|
| Admin (all tabs) | **Yes** |
| Store creation (Length/Width/Height) | **Yes** |
| 3D view (Orbit + Walk smoke) | **Yes** |
| Dashboard (shell + every widget ID) | **Yes** |
| Layout editor / Generate / Planogram | **Yes** |
| Catalog / RBAC / Approval | **Yes** |

Next: implement Playwright suites using [MODULE_TEST_PLANS.md](./MODULE_TEST_PLANS.md) and track status in [COVERAGE_MATRIX.md](./COVERAGE_MATRIX.md).
