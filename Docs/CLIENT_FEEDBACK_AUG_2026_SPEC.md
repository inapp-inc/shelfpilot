# Client Feedback Aug 2026 — Kiosk Store Selection, 3D Context & Configurable Naming

**Status:** Draft — **awaiting client/product approval. No code changed yet.**
**Date:** 2026-08-19
**Source:** Client demo feedback (2026-08-19) — client not satisfied with current kiosk and 3D behaviour.
**Requirement IDs:** FR-KIOSK-01 · FR-KIOSK-02 · FR-KIOSK-03 · FR-KIOSK-04 · FR-VIEW-02 · FR-NAME-01
**OpenSpec change:** [`openspec/changes/client-feedback-aug-2026/`](../openspec/changes/client-feedback-aug-2026/proposal.md)
**Builds on:** [SHOPPER_KIOSK_2D_MAP_UX_SPEC.md](./SHOPPER_KIOSK_2D_MAP_UX_SPEC.md) (map/route styling baseline) · [BRD_ADDENDUM_DEMO_AUG_2026.md](./BRD_ADDENDUM_DEMO_AUG_2026.md) (FR-CUST-01, FR-VIEW-01, FR-WH-01)

---

## 1. Executive summary

Five client asks, grouped into three delivery themes:

| Theme | Client ask | Requirement | Nature of change |
|-------|-----------|-------------|------------------|
| **A. Kiosk store scope** | Select a specific retail store **or warehouse** at the top level; layout auto-loads | FR-KIOSK-01 | **Breaking model change** — one store per customer → many |
| **A. Kiosk store scope** | Restrict stores to a **single entrance** to cut technical complexity | FR-KIOSK-02 | Constraint + simplification |
| **B. Kiosk wayfinding** | Route display must be **bigger**; add a **read-only 2D design view**; draw the line **entrance → that shelf** | FR-KIOSK-03, FR-KIOSK-04 | UI/UX rework + one routing change |
| **C. Planogram 3D** | Show **three adjacent shelves** in 3D, not one | FR-VIEW-02 | Focus-group render + camera |
| **D. Nomenclature** | Aisle / bay / shelf naming must be **configurable per store** | FR-NAME-01 | New config + shared formatter |

**Why the previous implementation missed:** the kiosk was built on the assumption *one customer = one store, one screen, one simplified map*. The client's mental model is *one kiosk = a store selector on top of a real store plan, with a visible walking line to a real shelf*. Items A and B are that gap. Item C and D are context and localisation gaps in the planner tools.

**Recommended sequencing:** FR-KIOSK-03/04 and FR-KIOSK-02 first (highest demo impact, lowest risk), then FR-KIOSK-01 (touches RBAC), then FR-VIEW-02, then FR-NAME-01 (widest blast radius).

---

## 2. Current state (as-built) — what constrains each ask

### 2.1 Kiosk store binding — hard-wired to exactly one layout

| Layer | Current behaviour | File |
|-------|-------------------|------|
| DB | `users.shopper_layout_id` — a **single** nullable layout id | `codebase/api/src/store/sqlite.js` |
| User admin | Customer role **requires** one `shopperLayoutId`; validated against existing layout | `codebase/api/src/routes/admin.js` |
| Kiosk API | `resolveCustomerKiosk(user)` returns `{ enabled:false, reason:"no_layout" }` without it | `codebase/api/src/services/shopperExperience.js` |
| Layout API | Customer sees **only** the assigned layout in `GET /layouts`; any other id returns **403** | `codebase/api/src/routes/layouts.js` |
| Web routing | `/shop/{layoutId}`; a Customer visiting another id is **redirected** to their assigned one | `codebase/web/src/rolePermissions.js`, `codebase/web/src/App.jsx` |

**Consequence:** there is no store picker to build on. Multi-store is a data-model + authorization change, not a UI change.

### 2.2 Entrances — multiple allowed today

- `layout.entryPoints[]` is an **array with no cap**; created via the editor entrance tool and `POST /layouts/:layoutId/entry-points`.
- Wayfinding start resolution order: configured entry → `entryPoints[0]` → `assumeEntranceSpace(layout)` synthetic front plaza (`codebase/web/src/shopper/shopperWayfinding.js`).
- **Known defect:** the editor persists the entrance name as `name`, while kiosk/API code reads `label` — custom entrance names never reach the kiosk.

### 2.3 Kiosk map & route — small panel, simplified geometry, line stops in the aisle

| Aspect | Current behaviour |
|--------|-------------------|
| Screen split | `.sp-kiosk-main` is a fixed **30 / 70** grid (finder / map) in **both** browse and guided modes — the map never gets the full screen after selection |
| Geometry | `ShopperFloorMap` draws a **simplified lane diagram** (coloured aisle strips + walk lanes), *not* the designed layout |
| Route end | `computeShopperRoute` terminates at the shelf centre **projected onto the aisle centreline** — it deliberately stops in the corridor; the pin is a separate element |
| Framing | `fitFullLayout=true` always fits the **whole store**; `focusViewBoxForCustomerRoute` exists but is **not used** |
| Dead assets | CSS `.shopper-floor-map--layout`, `.shopper-layout-map-board`, `.shopper-layout-map-route` exist with **no JSX** — a real-plan view was scaffolded and never built |

**Consequence:** the client sees a small, abstract map whose line appears to "stop before the shelf".

### 2.4 Planogram → 3D — whole layout rendered, one shelf focused

- `Scene3D` receives the **entire layout** and builds geometry for **every** gondola unit; "single shelf" is achieved by **highlight + dimming**, not culling.
- In `shelfFocusMode`, `planogramRowsForFace` returns rows **only** for the focused physical shelf/face — neighbours render as empty frames.
- Camera `shelfFocusCamera` frames **one** shelf's span.
- Adjacency is already derivable: `shelf.aisleId` + `shelf.shelfIndexAlongAisle`, with `shelvesOnAisle()` already sorting them (`codebase/web/src/layout-editor/aisleShelfView.js`).
- Facing budget: global `MAX_FACINGS = 16000`, per-shelf cap `MAX_FACINGS / shelfCount`.

**Consequence:** three-shelf context is mostly a **focus-set + camera + planogram-rows** change — the data is already present.

### 2.5 Naming — fixed format, per-vertical config only

- Canonical runtime format is `{aisleNumber}{BAY_LETTER}` → `4A`, `4B`, `12C`. No prefix, separator, or padding.
- Generated in **two duplicated places**: API `codebase/api/src/services/aisleLabeling.js` and web `codebase/web/src/layout-editor/shelfFaces.js`.
- Kiosk strips the aisle prefix for map ticks (`shopperMapLabels.js`).
- Level / position labels are hard-coded `Level {n}` / `Position {n}` (`planogramSegments.js`).
- Config table is keyed by **`vertical`** only (`configs(vertical PRIMARY KEY)`) — there is **no per-layout config** and no naming field in `VerticalConfig`.
- Structural fields (`aisleNumber`, `shelfIndexAlongAisle`) **are** persisted on entities — formatted strings are **not**. This is good news: naming can be a pure render-time concern with no data migration.

---

## 3. Requirements

### FR-KIOSK-01 — Store & warehouse selection at the top level

**Requirement.** A kiosk user SHALL choose from the retail stores and warehouses they are permitted to use, and selecting one SHALL load that layout's map, products, and wayfinding without a re-login.

**Scope of access (recommended model).** Replace the single `shopperLayoutId` with an **access list**, keeping the old column as the *default* store for backwards compatibility.

| Element | Design |
|---------|--------|
| Storage | New table `user_store_access(user_id, layout_id)`; `users.shopper_layout_id` retained as **default store** |
| Migration | Existing single assignment seeds one `user_store_access` row — **no behaviour change for current users** |
| Admin UI | Customer role gets a **multi-select store list** + a "default store" radio, replacing today's single dropdown |
| Optional grant | Admin toggle **"All approved stores"** on a customer (stored as a flag, evaluated at request time) |
| API | New `GET /shopper/stores`; `GET /shopper/kiosk?layoutId=` accepts a permitted store; `GET /layouts/:id` authorizes against the permitted set |

**Acceptance criteria.**

- **Given** a Customer granted 3 stores, **when** they sign in, **then** `GET /shopper/stores` returns exactly those 3 with name, store type, and which is default.
- **Given** that customer, **when** they select store B, **then** the kiosk loads store B's layout, product list, entrance, and map without re-authenticating, and the URL becomes `/shop/{B}`.
- **Given** that customer, **when** they request a store they were **not** granted, **then** the API returns **403** and the kiosk keeps the current store.
- **Given** a Customer granted exactly 1 store, **when** they sign in, **then** no picker is shown and that store loads directly (**today's behaviour preserved**).
- **Given** a layout of type `warehouse`, **when** it is granted to a kiosk user, **then** it appears in the picker under a **Warehouses** group and opens with the same kiosk shell.

### FR-KIOSK-02 — Single-entrance store model

**Requirement.** A layout SHALL have at most one entrance. Placing a new entrance SHALL move the existing one rather than adding a second.

| Element | Design |
|---------|--------|
| API create | `POST /layouts/:id/entry-points` **replaces** the existing entrance (idempotent "set entrance") instead of appending |
| Normalize | `normalizeLayout` keeps only the first entry point; tolerant on read, canonical on write |
| Editor | Entrance tool relabelled **"Set entrance"**; `ZonesEntryPanel` shows a single row (edit name/width, delete) |
| Wayfinding | `resolveShopperEntry` simplifies to `entryPoints[0]` → assumed front plaza |
| Defect fix | Persist and read the **same** field for the entrance name (`name`, with `label` accepted on read) so editor names reach the kiosk |
| Legacy data | Layouts with >1 entrance keep the **first** and drop the rest on next write, with an audit entry |

**Acceptance criteria.**

- **Given** a layout with an entrance, **when** the designer places another, **then** the layout still has exactly 1 entrance and it is at the new position.
- **Given** a legacy layout with 3 entrances, **when** it is saved, **then** 1 entrance remains and an audit record notes the trim.
- **Given** a layout with no entrance, **when** a customer opens the kiosk, **then** the assumed front-of-store entrance is used and labelled as assumed (**today's behaviour preserved**).
- **Given** an entrance named "Main Door" in the editor, **when** the kiosk loads, **then** the kiosk shows "Main Door" (not "Entrance").

### FR-KIOSK-03 — Guided view: bigger route, entrance-to-shelf line

**Requirement.** When a product is selected, the map SHALL become the dominant element, the route SHALL be re-framed to fill it, and the drawn line SHALL run from the entrance **to the target shelf face**.

| Change | Detail |
|--------|--------|
| **Layout** | On selection the kiosk switches to a **guided layout**: map takes the full content width; the finder collapses to a slim "Search again" bar with the selected product chip. Directions move to an overlay dock on the map. |
| **Framing** | Use the existing-but-unused `focusViewBoxForCustomerRoute` to frame entrance + route + target shelf with a ~15 % margin and a **minimum span clamp** so short routes do not over-zoom. |
| **Final approach** | Append a **final segment** from the aisle centreline to the shelf face point (`shelfApproachPoint().marker` / `edgeMid`) so the line visibly reaches the shelf. Styled as a distinct "last steps" dash; existing shelf-interior collision rules still apply. |
| **Stroke** | Pixel-stable stroke ≥ 8 px at 1080p with halo and animated dash (per [SHOPPER_KIOSK_2D_MAP_UX_SPEC](./SHOPPER_KIOSK_2D_MAP_UX_SPEC.md) §6.2) — the meter-based width currently renders sub-pixel when zoomed out. |
| **Endpoints** | Entrance marker with "You are here" and destination pin both always visible inside the framed view. |

**Acceptance criteria.**

- **Given** browse mode, **when** a product is selected, **then** the map occupies ≥ 70 % of kiosk content width and the finder collapses to a single bar.
- **Given** a selected product, **then** the drawn route's **last vertex** lies on the target shelf's face approach point (not the aisle centreline), and no segment crosses a shelf interior.
- **Given** a selected product, **then** the entrance marker, full route, and destination pin are all inside the visible viewBox.
- **Given** a 1080p kiosk, **then** the route stroke measures ≥ 8 px and the dash animation is visible (unless `prefers-reduced-motion`).
- **Given** a very short route (target in the first aisle), **then** the view does not zoom past the minimum span clamp.

### FR-KIOSK-04 — Read-only 2D store-plan view in the kiosk

**Requirement.** The kiosk SHALL offer a **read-only true-to-design 2D plan** of the store alongside the simplified map, with the same route overlay.

**Implementation choice.** Build a new `ShopperLayoutPlanMap.jsx` SVG renderer rather than reusing the editor canvas.

| Option | Verdict |
|--------|---------|
| Reuse `Canvas2D` with `editDisabled` | **Rejected** — needs ~25 props, pixel-based (not responsive SVG), retains selection/hover behaviour, no route layer |
| **New SVG renderer over existing tested geometry** (`shelfTilesForMap`, `runwayBandsForMap` from `shopperSchematicMap.js`) | **Recommended** — exact rotated footprints, responsive, read-only by construction, reuses `RouteLayer` / `EntryMarker` / `MapPin`, and the CSS (`.shopper-floor-map--layout`, `.shopper-layout-map-board`) already exists |

- Toggle: segmented control **"Simple map | Store plan"** in the map header. Default **Simple map**.
- The plan view is **strictly read-only**: no selection, drag, tooltips, or edit affordances.

**Acceptance criteria.**

- **Given** the kiosk, **when** the user picks "Store plan", **then** fixtures, aisles, zones, and the floor polygon render at true design geometry with the same route overlay and pin.
- **Given** the plan view, **when** the user taps or drags a fixture, **then** nothing is selected, moved, or edited.
- **Given** the plan view with a selected product, **then** the target shelf is highlighted and the entrance-to-shelf line is drawn using the same styling as the simple map.
- **Given** the toggle, **when** the user switches views, **then** the selected product, route, and framing are preserved.

### FR-VIEW-02 — Three-shelf 3D visualisation from the planogram

**Requirement.** Opening 3D from the planogram SHALL display the target shelf **and its two aisle neighbours** with their products, framed together.

| Element | Design |
|---------|--------|
| Focus set | Target + previous + next by `shelfIndexAlongAisle` within the same `aisleId` (via `shelvesOnAisle()`) |
| Edge cases | First shelf → `[0,1,2]`; last shelf → last three; aisle with 1–2 shelves → render what exists (never fabricate) |
| Planogram rows | `planogramRowsForFace` accepts a **set** of focused physical shelf ids so all three show products; target at full emphasis, neighbours slightly muted but legible |
| Camera | New group-aware framing from the **union bounds** of the three shelves, keeping the existing face-aware approach angle |
| Labels | Face-label sprites for all three; target emphasised |
| Performance | In focus mode, instance products **only** for the focus group (frames only elsewhere) and raise the per-shelf facing cap — this **reduces** total instances versus today while showing more useful detail |
| Optional | ◀ / ▶ controls to step focus along the aisle (flagged, not required for sign-off) |

**Acceptance criteria.**

- **Given** a shelf in the middle of an aisle, **when** "View in 3D" is used, **then** three shelves render with products and all three are fully inside the camera frame.
- **Given** the first shelf in an aisle, **then** the target plus the next two render, with the target still visually emphasised.
- **Given** an aisle with a single shelf, **then** only that shelf renders and no error occurs.
- **Given** a fully merchandised focus group, **then** total product instances stay within the facing cap and the view remains interactive (no perceptible stall on the demo layout).
- **Given** the 3D view, **then** returning to the planogram reopens the **originally selected** shelf and face.

### FR-NAME-01 — Configurable aisle / bay / shelf nomenclature

**Requirement.** Aisle, bay, shelf, and position naming SHALL be configurable, with a vertical-level default and a **per-store (per-layout) override**, because conventions differ by location.

**Glossary alignment** (client wording → ShelfPilot model — needs confirmation):

| Client term | ShelfPilot entity | Today's label |
|-------------|-------------------|---------------|
| **Aisle** | walk aisle, `aisle.aisleNumber` | `4` |
| **Bay** | shelf unit along the aisle, `shelf.shelfIndexAlongAisle` | `A` (composed: `4A`) |
| **Shelf** | level within a bay | `Level 1` |
| *(position)* | horizontal slot within a level | `Position 1` |

**Config shape (proposed).**

```json
{
  "namingConvention": {
    "aisle":    { "style": "number",  "prefix": "",  "padding": 0 },
    "bay":      { "style": "letter",  "prefix": "",  "padding": 0 },
    "code":     { "pattern": "{aisle}{bay}" },
    "level":    { "pattern": "Level {n}" },
    "position": { "pattern": "Position {n}" }
  }
}
```

Examples: `{aisle}{bay}` → `4A` (today's default) · `A{aisle}-{bay}` → `A4-A` · `{aisle}-{bay}` with `padding:2` → `04-A`.

| Element | Design |
|---------|--------|
| Default | Identical to today's `{aisle}{bay}` — **existing behaviour and tests unchanged** when unset |
| Vertical default | New optional `namingConvention` on `VerticalConfig` (Admin → Configuration) |
| Per-layout override | `layout.namingConvention` in the layout payload, inheriting the vertical default when unset |
| Shared formatter | New `codebase/shared/labelFormat.mjs` consumed by API `aisleLabeling.js` **and** web `shelfFaces.js`, removing today's duplicated logic |
| Storage rule | Continue persisting only **structural** fields (`aisleNumber`, `shelfIndexAlongAisle`); format at render time — **no data migration, instant re-label** |
| Parsing | "Go to shelf" input derives its parser from the active convention |

**Acceptance criteria.**

- **Given** no naming config, **then** every surface renders exactly today's labels (`4A`, `Level 1`, `Position 1`) and all existing label tests pass unchanged.
- **Given** a layout with `pattern: "{aisle}-{bay}"`, **then** the editor, planogram, 3D labels, kiosk directions, and find-product results all show `4-A` consistently.
- **Given** a vertical default and a per-layout override, **then** the layout override wins for that layout only.
- **Given** a changed convention, **when** the layout is reopened, **then** labels update with **no** re-generation of aisles/shelves and no change to persisted geometry.
- **Given** a convention with `bay.style: "number"`, **then** "Go to shelf" accepts the new format and resolves the correct shelf.

---

## 4. Kiosk store-selection UX (FR-KIOSK-01 design detail)

The client asked whether tabs are right. **Tabs are not recommended.**

| Model | Assessment |
|-------|------------|
| **Tabs across the top** | Works only for ≤ 4 stores; consumes vertical space the map needs; poor at 20+ stores; awkward for two groups (stores vs warehouses) |
| Dropdown `<select>` | Compact but a poor touch target and hides the store list behind an unlabelled control |
| **Store switcher + full-screen picker (recommended)** | Scales from 2 to 200 stores, large touch targets, supports search and grouping, and costs zero permanent screen space |

**Recommended interaction.**

```
Header:  [ 🏬 Northgate Superstore  ▾ ]        ← switcher pill, always visible
             │ tap
             ▼
Full-screen picker sheet
  ┌──────────────────────────────────────────┐
  │  Choose a location            [ Search ] │
  │  ( All ) ( Retail stores ) ( Warehouses )│  ← segmented filter
  │                                          │
  │  RETAIL STORES                           │
  │  ┌────────────┐ ┌────────────┐           │
  │  │ Northgate  │ │ Riverside  │           │  ← large cards: name,
  │  │ Superstore │ │ Express    │           │    type, size, ★ default
  │  │ ★ default  │ │            │           │
  │  └────────────┘ └────────────┘           │
  │  WAREHOUSES                              │
  │  ┌────────────┐                          │
  │  │ DC-01 East │                          │
  │  └────────────┘                          │
  └──────────────────────────────────────────┘
```

**Rules.**

1. **One store granted →** no picker, no switcher; load directly (today's behaviour).
2. **Many granted, none pinned →** picker is the **landing step** before the finder.
3. **Kiosk pinning:** "Use this location on this screen" pins the choice in `localStorage`, so a physical in-store kiosk never asks again; staff can unpin from the switcher. *(Confirmation needed — decision D2.)*
4. Selecting a store resets product selection and route, and updates the URL to `/shop/{layoutId}` so a refresh is stable.
5. Grouping uses the layout's store type: `warehouse` → **Warehouses**, everything else → **Retail stores**.

---

## 5. Decisions needed before implementation

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| **D1** | Which stores may a kiosk user open? | (a) explicit per-user grant list · (b) all `approved` layouts · (c) all layouts in the tenant | **(a) + optional "all approved" toggle** — explicit, auditable, and safest for RBAC |
| **D2** | Should a kiosk device remember its store? | (a) yes, pin locally · (b) always ask · (c) admin-assigned default only | **(a)** with admin default as fallback |
| **D3** | Legacy layouts with multiple entrances | (a) trim to first on next write · (b) block save until the designer fixes it | **(a)** with an audit entry — avoids blocking demo data |
| **D4** | Read-only 2D plan renderer | (a) new SVG renderer · (b) reuse `Canvas2D` read-only | **(a)** — see FR-KIOSK-04 table |
| **D5** | Naming config scope | (a) per-layout override + vertical default · (b) vertical only | **(a)** — client explicitly cited variation *across store locations* |
| **D6** | 3D focus group size | (a) fixed 3 · (b) configurable 3/5/7 | **(a)** fixed 3, implemented prop-driven so 5 is a one-line change later |
| **D7** | Do warehouses use the same kiosk shell? | (a) same shell, labelled Warehouse · (b) separate staff picker UI | **(a)** for this slice |
| **D8** | Glossary confirmation | Is the client's "bay" our shelf-along-aisle, and their "shelf" our level? | Confirm §3 FR-NAME-01 table before building the formatter |

---

## 6. Delivery plan

Suggested SEED slices (each independently reviewable and shippable):

| SEED | Scope | Requirement | Size | Risk |
|------|-------|-------------|------|------|
| **SEED-CB-01** | Guided kiosk layout: map dominance, route re-framing, pixel-stable stroke | FR-KIOSK-03 | S–M | Low |
| **SEED-CB-02** | Final-approach route segment to the shelf face + entrance labelling fix | FR-KIOSK-03, FR-KIOSK-02 | S | Low |
| **SEED-CB-03** | Single-entrance model: API, normalize, editor, migration trim | FR-KIOSK-02 | S–M | Low–Med |
| **SEED-CB-04** | Read-only store-plan SVG renderer + view toggle | FR-KIOSK-04 | M | Low |
| **SEED-CB-05** | Multi-store access model: table, migration, `GET /shopper/stores`, authorization | FR-KIOSK-01 | M–L | **Med–High** (RBAC) |
| **SEED-CB-06** | Store picker UX + switcher + kiosk pinning + admin multi-select | FR-KIOSK-01 | M | Med |
| **SEED-CB-07** | Three-shelf 3D focus group, camera, planogram rows, facing budget | FR-VIEW-02 | M | Med (perf) |
| **SEED-CB-08** | Shared label formatter + naming config (vertical + per-layout) + admin UI | FR-NAME-01 | L | **High** (blast radius) |
| **SEED-CB-09** | Tests, OpenAPI, spec fold, PENDING/BRD status refresh | all | S–M | Low |

**Recommended order:** CB-01 → CB-02 → CB-03 → CB-04 → CB-05 → CB-06 → CB-07 → CB-08 → CB-09.
CB-01/02/03 are the fastest visible wins if another client checkpoint is imminent.

---

## 7. Risk & blast radius

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Multi-store breaks Customer RBAC** | Cross-store data exposure | Authorize every layout read against the permitted set; extend `customer-role.test.js` and `auth-roles.test.js` with negative cases before shipping |
| **Naming change breaks labels everywhere** | Editor, planogram, 3D, kiosk, wayfinding, find-product all consume labels | Default convention **identical** to today; keep these tests green unchanged: `aisle-labeling.test.js`, `aisle-shelf-view.test.js`, `shopper-schematic.test.js`, `aisle-binding-vertical.test.js`, `dual-face.test.js` |
| **Three-shelf 3D performance** | Frame drops on large layouts | Instance products for the focus group **only**; measure instance count before/after; keep the global facing cap |
| **Single-entrance trim loses data** | Designer surprise on legacy layouts | Trim only on write, record an audit entry, and surface a one-time notice in the editor |
| **Route final segment crossing a fixture** | Line appears to go through a shelf | Reuse the existing `segmentCrossesShelves` guard on the new segment; add a regression test |
| **Store-plan view feels "CAD-like"** (the original complaint) | Client dissatisfaction returns | Keep **Simple map** as the default; the plan view is an opt-in secondary mode |

---

## 8. Out of scope

- Multi-floor stores and multiple floor polygons per layout.
- Anonymous / no-login kiosk access (Customer login remains required).
- Turn-by-turn live positioning, beacons, or sensors.
- Editing anything from the kiosk (it stays strictly read-only).
- Renaming or re-numbering **existing** persisted geometry (naming is render-time only).
- Cross-store analytics or basket/route optimisation across multiple products.

---

## 9. Traceability

| Spec ID | Requirement | Implementation area | Validation |
|---------|-------------|---------------------|------------|
| FR-KIOSK-01 | Store & warehouse selection | `sqlite.js`, `admin.js`, `shopperExperience.js`, `layouts.js`, `ShopperKioskPage.jsx`, new store picker | New API tests for grant/deny + picker E2E |
| FR-KIOSK-02 | Single entrance | `layouts.js` entry-point routes, `layoutNormalize.js`, `ZonesEntryPanel.jsx`, `shopperWayfinding.js` | Entrance replace/trim tests; entrance-name test |
| FR-KIOSK-03 | Bigger guided route + entrance→shelf line | `ShopperKioskPage.jsx`, `ShopperFloorMap.jsx`, `shopperWayfinding.js`, `shopperCustomerLaneMap.js`, `styles.css` | Route-end assertion + no-shelf-crossing regression |
| FR-KIOSK-04 | Read-only 2D plan view | new `ShopperLayoutPlanMap.jsx`, `shopperSchematicMap.js`, `styles.css` | Render test on demo layout; read-only assertion |
| FR-VIEW-02 | Three-shelf 3D | `Scene3D.jsx`, `LayoutEditor.jsx`, `aisleShelfView.js` | Focus-set unit tests incl. edge cases; instance-count check |
| FR-NAME-01 | Configurable naming | new `codebase/shared/labelFormat.mjs`, `aisleLabeling.js`, `shelfFaces.js`, `planogramSegments.js`, `admin.js`, `Docs/openapi.yaml` | Default-parity tests + alternate-convention tests |

OpenAPI operations to add/change: `listShopperStores` (new), `getShopperKiosk` (query param), `createUser` / `updateUser` (store grants), `putConfig` (`namingConvention`), `patchLayout` (`namingConvention`), entry-point set semantics.

---

## 10. Approval

| Role | Name | Decision | Date |
|------|------|----------|------|
| Client / Product | | ☐ Approve ☐ Approve with changes ☐ Reject | |
| Architecture | | ☐ Approve ☐ Approve with changes ☐ Reject | |
| Engineering | | ☐ Approve ☐ Approve with changes ☐ Reject | |

**Next step after approval:** answer D1–D8, then implement SEED-CB-01 through CB-03 as the first reviewable slice.
