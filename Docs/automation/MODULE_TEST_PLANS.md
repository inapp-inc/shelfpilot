# Module Test Plans — Playwright (clear Given / When / Then)

Use these plans when writing specs. Each plan maps to IDs in [COVERAGE_MATRIX.md](./COVERAGE_MATRIX.md).

**Demo target:** http://localhost:8080  
**Default user:** `designer@shelfpilot.local` / `password` / role **Designer**

---

# Plan 1 — Auth & roles

### TP-AUTH-01 · Happy login (Designer)
- **Given** app is up at BASE_URL  
- **When** user enters Designer credentials and clicks Sign in  
- **Then** main app shell loads and **Layouts** (or Dashboard) nav is visible  

### TP-AUTH-02 · Bad password
- **Given** login screen  
- **When** wrong password submitted  
- **Then** user stays on login; error message shown  

### TP-AUTH-03 · Each role can log in
- **Given** login screen  
- **When** login as Designer / Approver / Viewer / Admin (one test each or parameterized)  
- **Then** nav matches role (Admin sees Admin; Designer does not)  

### TP-AUTH-04 · Sign out
- **Given** logged-in Designer  
- **When** Sign out  
- **Then** login screen returns; refreshing protected URL does not show layouts  

---

# Plan 2 — Store / layout creation

### TP-CREATE-01 · Labels are Length / Width / Height
- **Given** Designer on Layouts  
- **When** open **New store layout**  
- **Then** fields labeled **Length (m)**, **Width (m)**, **Height (m)** (not Width/Depth)  

### TP-CREATE-02 · Create hypermarket store
- **Given** create modal open  
- **When** name = `E2E Store {timestamp}`, type = Hypermarket, Length=24, Width=16, Height=3.2, shape=Rectangle, submit  
- **Then** layout appears; URL is `/layouts/{id}`; editor canvas visible  

### TP-CREATE-03 · Validation
- **Given** create modal  
- **When** submit with empty name  
- **Then** error on name; layout not created  

### TP-CREATE-04 · All store types (smoke)
- **Given** create modal  
- **When** create one tiny layout per store type (or sample 2–3 types)  
- **Then** each create returns 201 / editor opens  

---

# Plan 3 — Layouts portfolio

### TP-PORT-01 · Demo layout listed
- **Given** Designer on Layouts  
- **Then** card/list includes **Demo Hypermarket — Generated**  

### TP-PORT-02 · Open demo
- **Given** portfolio  
- **When** open demo layout  
- **Then** editor loads with shelves and aisles  

### TP-PORT-03 · Clone
- **Given** a layout  
- **When** Clone  
- **Then** new layout exists with distinct id/name  

### TP-PORT-04 · Delete E2E layout
- **Given** layout created by E2E  
- **When** Delete + confirm  
- **Then** it disappears from portfolio  

---

# Plan 4 — Layout editor & Smart Generate

### TP-EDIT-01 · Palette tools visible
- **Given** editor on draft layout as Designer  
- **Then** Select, Draw area, Generate, Aisle H/V, fixtures, Zones, Entry visible  

### TP-EDIT-02 · Smart Generate opens
- **Given** editor  
- **When** click Generate  
- **Then** Smart Generate panel shows min aisle + orientation + mix  

### TP-EDIT-03 · Generate respects aisle min (critical)
- **Given** hypermarket layout (config min 1.5 m)  
- **When** run Smart Generate with category mix 100%  
- **Then** success toast/stats; **no** violation text like `width … < min`; aisles ≥ 1.5 m  

### TP-EDIT-04 · Viewer cannot generate
- **Given** Viewer opens layout  
- **Then** Generate disabled/hidden **or** API returns 403 if forced  

### TP-ARR-01 · Arrangement panel after generate
- **Given** Designer runs Smart Generate successfully  
- **Then** arrangement panel shows pending banner, shelf KPIs, volume, layout summary  
- **And** Accept is enabled when total shelves > 0  

### TP-ARR-02 · Accept unlocks allocation
- **Given** pending arrangement summary  
- **When** Accept arrangement (fill optional)  
- **Then** reopen control appears; planogram mutations allowed (API 201 vs 409 before)  

### TP-ARR-03 · Demo pre-accepted
- **Given** Demo Hypermarket — Generated  
- **When** open editor  
- **Then** “View arrangement & volume summary” is available with accepted banner  

---

# Plan 5 — Planogram

### TP-POG-01 · Open planogram
- **Given** shelf with category on layout **and arrangement accepted**  
- **When** select shelf / open planogram  
- **Then** planogram modal/panel shows levels  

### TP-POG-01b · Blocked until arrangement accepted
- **Given** shelves present and arrangement not accepted  
- **When** try to open planogram  
- **Then** toast/error `arrangement_not_accepted`; arrangement panel stays/opens  

### TP-POG-02 · Find products
- **Given** editor with filled planograms  
- **When** open Find products; search a known product  
- **Then** result shows shelf # / level / space used  

### TP-POG-03 · Missing products panel
- **Given** coverage has missingCount > 0 (or after generate with gaps)  
- **When** open Missing products  
- **Then** list of SKUs shown  

---

# Plan 6 — 3D view (Orbit + Walk)

### TP-3D-01 · Open Orbit / View in 3D
- **Given** demo layout in 2D  
- **When** user toggles **View in 3D** (or Orbit)  
- **Then** a `<canvas>` (WebGL) is present; **no** `pageerror`; UI remains usable  

### TP-3D-02 · Walk mode
- **Given** 3D view open  
- **When** enable **Walk** mode  
- **Then** walk mode control active; no crash  

### TP-3D-03 · Back to 2D
- **Given** 3D open  
- **When** toggle off 3D  
- **Then** 2D canvas/stage restored  

### TP-3D-04 · Planogram → 3D → back (if UI supports)
- **Given** planogram open  
- **When** open 3D from planogram then return  
- **Then** planogram context restored without crash  

**Pass criteria:** functional smoke only — not pixel comparison.

---

# Plan 7 — Approval workflow

### TP-APPR-01 · Submit for review
- **Given** Designer on draft with content  
- **When** Submit for review  
- **Then** status becomes `in_review`  

### TP-APPR-02 · Approve
- **Given** Approver opens layout in `in_review`  
- **When** Approve  
- **Then** status `approved`  

### TP-APPR-03 · Reject requires comment
- **Given** Approver on `in_review` layout  
- **When** Reject without comment  
- **Then** validation error; status unchanged  
- **When** Reject with comment  
- **Then** status `rejected`  

---

# Plan 8 — Dashboard (all)

### TP-DASH-01 · Dashboard shell
- **Given** Designer opens Dashboard  
- **Then** layout picker, status counts, and widget board region visible  

### TP-DASH-02 · Select layout for analytics
- **Given** Dashboard with ≥1 layout  
- **When** select demo layout  
- **Then** widgets refresh (no error toast / no NaN in KPI tiles)  

### TP-DASH-03 · Section filters
- **Given** Dashboard  
- **When** switch section to Space / Compliance / Category  
- **Then** board updates; no crash  

### TP-DASH-04 · Every default widget renders
- **Given** Dashboard on demo layout, section = All  
- **When** page settles  
- **Then** each default-visible widget container is present (see inventory widget IDs)  
- **And** no KPI text equals `NaN`  

### TP-DASH-05 · Restricted widgets by role
- **Given** Viewer on Dashboard  
- **Then** Admin-only widgets (`audit-activity`, `store-benchmarking`, `layout-standardization`) hidden or inaccessible  

### TP-DASH-06 · Drill-down (Designer)
- **Given** clickable KPI with drill  
- **When** activate drill to layouts or editor  
- **Then** navigation occurs to expected module  

---

# Plan 9 — Catalog (Products)

### TP-CAT-01 · List products
- **Given** Designer on Products  
- **Then** product list non-empty (demo catalog)  

### TP-CAT-02 · Create category
- **Given** catalog  
- **When** create category `E2E Cat {ts}`  
- **Then** appears in tree  

### TP-CAT-03 · Create product
- **Given** category exists  
- **When** create product with name + dimensions  
- **Then** appears in list  

### TP-CAT-04 · Viewer read-only
- **Given** Viewer on Products  
- **Then** create/edit controls disabled or absent  

### TP-CAT-05 · Export / template download
- **Given** Designer catalog  
- **When** export or download template  
- **Then** download starts (or API 200)  

---

# Plan 10 — Admin (all tabs)

### TP-ADM-01 · Users & Roles — list
- **Given** Admin → Users & Roles  
- **Then** table shows seeded users (admin, designer, approver, viewer)  

### TP-ADM-02 · Create user
- **Given** Admin Users form  
- **When** create `e2e-{ts}@shelfpilot.local` / Viewer / password  
- **Then** user appears in table  

### TP-ADM-03 · Store Master — shelf templates
- **Given** Admin → Store Master  
- **When** select Hypermarket vertical  
- **Then** shelf template cards show Width / Depth / Height in **feet**  
- **And** Shelf volume (cu ft / cu in) is visible and read-only  
- **When** dimensions change  
- **Then** volume updates automatically  
- **And** layout remains usable on narrow viewports  

### TP-ADM-04 · Approval Workflow toggle
- **Given** Admin → Approval Workflow  
- **When** view toggle for current vertical  
- **Then** control visible; Admin can toggle and save  

### TP-ADM-05 · Configuration — min aisle
- **Given** Admin → Configuration · Hypermarket  
- **Then** Min aisle width shows **1.5** (or current saved value)  
- **When** Admin saves  
- **Then** success; value persists on reload  

### TP-ADM-06 · Audit Log
- **Given** Admin or Approver → Audit  
- **Then** list of events (or empty state message) renders  

### TP-ADM-07 · Designer blocked from Admin
- **Given** Designer session  
- **Then** Admin nav item absent **or** `/admin` redirects/blocked  

### TP-ADM-08 · Approver only Audit
- **Given** Approver → Admin  
- **Then** only Audit tab (no Users / Store Master / Config edit)  

---

# Plan 11 — Cross-cutting demo gate

### TP-GATE-01 · Pre-demo smoke chain
1. Login Designer  
2. Open Dashboard — widgets OK  
3. Open Layouts — open Demo Hypermarket  
4. Confirm no aisle width violations  
5. Toggle 3D — canvas OK — back to 2D  
6. Open Products — list OK  
7. Login Admin — open Store Master + Configuration  

**Tag:** `@smoke` — run before every client demo.

---

# How to use this document

1. Implement one **Plan** at a time as a Playwright file (`auth.spec.js`, `create-layout.spec.js`, …).  
2. Mark matching rows **Automated** in the coverage matrix.  
3. Prefer API helpers only for setup; assert outcomes in the UI.
