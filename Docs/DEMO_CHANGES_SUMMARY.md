# ShelfPilot — Demo changes summary

_Last updated: 2026-08-11_

A running record of the enhancements delivered in the current demo cycle. Newest work is at
the top.

**BRD / product brief:** [BRD_ADDENDUM_DEMO_AUG_2026.md](./BRD_ADDENDUM_DEMO_AUG_2026.md) · root [`project.md`](../project.md)

---

## Iteration 6 — Aug 2026 demo cycle + customer feedback capture

### Delivered
1. **Floor plan import** — PNG/PDF dimensions → analyze/build layout (not image underlay as primary UX). Spec: `FLOOR_PLAN_IMPORT_SPEC.md`.
2. **Smart Generate / packer** — leftover fill, aisle clear, no-overlap; arrangement summary accept UI.
3. **Planogram auto-fill** — wide × deep × stack from product vs shelf dimensions; stack capped by level clear height + `clearanceMeters` + layer gap.
4. **Shelf layout mode** — Ctrl+click move/resize; Enter exits; normal click opens planogram (Ctrl no longer pans when clicking shelves).
5. **3D product images** — persistent texture cache so planogram → View in 3D keeps images.
6. **Docs** — BRD addendum + `project.md` / `openspec/project.md` updated for demo feedback.
7. **FR-AISLE-01/02** — aisle-based shelf selection (2D per-face; 3D face highlight + corridor emphasis; no gondola pair co-select).

### Customer feedback captured (planned)
| ID | Item |
|----|------|
| ~~FR-AISLE-01/02~~ | ~~Done~~ |
| FR-BUF-01 | 1 cm product buffer (0.5 cm each side) |
| FR-TEMP-01 | Temporary storage (tables / pallets) |
| FR-CUST-01 | Customer role — find product, layout select, no edit |
| FR-VIEW-01 | Flat adjacent/opposite shelves viewing menu |
| FR-WH-01 | Warehouse store type (design first) |

---

## Iteration 5 — Selection reliability, Docker rebuilds, product edit

### 1. Shelves (and aisles) now select reliably
- **Root cause A — deselect on release:** the empty-floor deselect ran on `click`. Pressing a
  shelf and releasing the mouse slightly off it fires the browser `click` on the floor, which
  wiped the just-made selection ("select → flicker → deselect"). Deselect now runs on the
  floor's **`mousedown`** instead; entity `mousedown`s `stopPropagation`, so selecting a
  shelf/aisle survives releasing just off it.
- **Root cause B — stacking order:** a *selected* zone/aisle jumped above shelves (`zIndex 4`),
  so shelves overlapping them couldn't be clicked. Z-order is now layered so **shelves are
  always the top interactive layer**: zone `0/2` < aisle `1/3` < shelf `5/6` < entry `7`.
- Files: `web/src/layout-editor/Canvas2D.jsx`.

### 2. Docker builds always reflect changes (no manual `--no-cache`)
- Both Dockerfiles take a **`CACHEBUST` build arg** referenced right after `npm install`, so the
  source COPY + build layers rebuild every time while the slow dependency layer stays cached.
- `docker-compose.yml` passes `CACHEBUST: ${CACHEBUST:-dev}` to both services.
- New one-command rebuild: **`npm run docker:rebuild`** (`scripts/docker-rebuild.mjs`,
  cross-platform) — sets a fresh timestamp `CACHEBUST`, runs `compose build`, then
  `compose up -d --force-recreate`. Optional `-- web` / `-- api` to scope it.
- Files: `Dockerfile`, `Dockerfile.web`, `docker-compose.yml`, `scripts/docker-rebuild.mjs`,
  `package.json`.

### 3. Edit products from the Products list
- Products already had an **Edit** action (drawer with all fields + image); the product **name
  is now a clickable edit link** too, so editing is obvious from the list.
- Note: if Edit wasn't visible before, it was a stale Docker image — rebuild with
  `npm run docker:rebuild`.
- Files: `web/src/catalog/CatalogPage.jsx`, `web/src/styles.css`.

---

## Iteration 4 — Canvas resize, layout delete, dashboard, product & 3D images

### 1. Resize zones & aisles on the canvas (edit mode)
- Selecting a **zone** or **aisle** now shows 8 resize grips (corners + edges).
- Dragging a grip resizes the entity live and snaps to 0.5 m; release persists it.
  - Zone → `widthMeters` / `depthMeters`.
  - Aisle → `widthMeters` + `lengthMeters` (orientation-aware).
- Resizing is **clamped to the drawn polygon** — it stops at the boundary and never triggers
  a containment violation.
- API: `PATCH /layouts/{id}/aisles/{aisleId}` now accepts `lengthMeters` (and `orientation`).
- Files: `web/src/layout-editor/Canvas2D.jsx`, `LayoutEditor.jsx`, `api/src/routes/layouts.js`.

### 2. Delete layouts
- New `DELETE /layouts/{layoutId}` (Designer/Admin) — removes the layout and its saved
  versions. 404 for unknown id, 403 for Viewer.
- **Layouts portfolio:** each card has a trash button (with confirmation).
- **Editor header:** a **Delete layout** button (confirm → returns to the Layouts list).
- Files: `api/src/store/sqlite.js` (`deleteLayout`), `api/src/routes/layouts.js`,
  `web/src/App.jsx`, `web/src/modules/LayoutsPortfolio.jsx`,
  `web/src/layout-editor/LayoutEditor.jsx`.
- Test: `api/test/delete-layout.test.js`.

### 3. Dashboard with charts + per-layout drill-down
- A **layout picker**; selecting a layout shows:
  - **Space usage** donut — free vs used floor area (+ usable m²).
  - **Category fill** donut — shelves per category.
  - **Facings by category** bar chart.
  - KPI cards: Free space %, Utilization %, Shelves, Aisles, Facings.
- Empty layouts get a clear "run Smart Generate" empty state.
- Charts are **dependency-free SVG** (no chart library — keeps the bundle small).
- Analytics extended: `computeAnalytics` now returns `usableAreaSqm`, `usedAreaSqm`,
  `freeSpacePercent`, `aisleCount`, `facingsTotal`, and `facingsByCategory`.
- Files: `web/src/modules/DashboardPage.jsx`, `web/src/modules/charts/DonutChart.jsx`,
  `web/src/modules/charts/BarChart.jsx`, `api/src/services/layoutMath.js`.
- Test: `api/test/analytics-freespace-facings.test.js`.

### 4. Product images (edit form + import)
- Product model gains `imageUrl` (stored in `attributes.imageUrl`, surfaced top-level).
  Accepted on `POST /products` and `PATCH /products/{id}`.
- **Edit product drawer:** polished **Cancel / Save** footer, plus a **Product image**
  field — drag-and-drop or browse (auto-resized to ≤256 px, stored as a compact data URL) or
  paste an image URL, with a live thumbnail and remove control.
- **Excel import & template:** new optional `imageUrl` column (external URL).
- Files: `api/src/routes/catalog.js`, `api/src/store/sqlite.js`,
  `web/src/catalog/ProductFormDrawer.jsx`, `web/src/catalog/importExcel.js`, `web/src/App.jsx`.

### 4b. Category editing + color, and UI polish
- Categories can now be **edited** (pencil on each category chip): name, parent, and color.
  New `PATCH /categories/{id}`.
- The category color picker gained a **swatch + hex input + preset palette**.
- **Dashboard & Layouts** screens use consistent page spacing/alignment (shared
  `.module-page` flow, aligned KPI cards).
- Files: `api/src/routes/catalog.js`, `web/src/App.jsx`,
  `web/src/catalog/CategoryFormDrawer.jsx`, `web/src/catalog/CategoryTreeBar.jsx`,
  `web/src/catalog/CatalogPage.jsx`, `web/src/styles.css`.

### 5. Live product images in 3D
- The 3D view textures shelf facings with the product image when available, falling back to
  the category color block when a product has no image or the image can't load. Textures are
  cached by URL.
- Files: `web/src/Scene3D.jsx`, `web/src/layout-editor/LayoutEditor.jsx`.

---

## Iteration 3 — Selection, deletion & routing fixes (previously delivered)

- **Delete shelves & aisles** — selection bar with Delete, `Delete`/`Backspace` shortcut,
  confirm dialog; `btn-danger` styling; `DELETE` endpoints for shelves/aisles with mapping
  cleanup (shelves referencing a deleted aisle are detached).
- **Selection fixes** — clicking a shelf/aisle no longer (a) fires a spurious containment
  violation (a pure click no longer re-snaps/PATCHes position) or (b) flickers and
  deselects (empty-floor clicks only deselect on the floor itself).
- **Refresh no longer 401s** — all client API calls are namespaced under `/api`; Vite proxy
  and nginx updated so client routes (`/layouts`, `/products`, …) fall through to the SPA on a
  hard refresh.
- **Docker rebuilds reflect changes** — `Dockerfile.web` hardened; use
  `docker compose build --no-cache && docker compose up -d --force-recreate` for clean builds.

## Iteration 2 — Import store-type dialog (previously delivered)

- Import dialog to pick the **target store type** + **drag-and-drop** file upload; the parser
  honors the selected vertical instead of silently defaulting to retail. Import progress +
  success toast.

## Iteration 1 — Layout/merchandising foundations (previously delivered)

- **Dual-sided shelves** (faces A/B, independent categories/planograms).
- **Numbered shelf badges** on the 2D canvas (numbers instead of type labels).
- **Strict polygon canvas** — objects constrained to the drawn boundary.
- **Visible, orientation-aware aisles** via scan-based placement; **mixed orientation**
  auto-generation.
- **Dynamic category mix** from the active catalog; planogram picker lists imported products.
- **Special zones** (hot/offer/custom) and **entry points**.
- **Higher zoom range** (up to 500%+) and aligned drawing area.

---

## Deployment (Docker, single port, subpath)
- One Docker container serves **UI + API** (host port **4520** by default) under
  **`/shelfpilot`** → `http://foundry.inapp.com/shelfpilot`.
- Package: `scripts\package.bat` (or `package.ps1` / `package.sh`) → `dist-package/*.zip`
  (includes `Dockerfile`, `docker-compose.yml`, `api/package-lock.json`, deploy `README.md`).
- Deploy on server: unzip → `bash deploy.sh` (Docker build + up + health check).
  Flags: `--no-build`, `--down`. SQLite persists in volume `shelfpilot_data`.
- CORS allow-list via `CORS_ORIGINS` (defaults to `http://foundry.inapp.com`).
- Full details: `codebase/deploy/README.md`.

## Build / run notes
- Web: `npm run build -w web` (bundle ~1.2 MB; chunk-size warning is expected/benign).
- API tests: `npm test -w api` (Node test runner).
- Docker: `npm run docker:rebuild` (fresh `CACHEBUST` → changes always ship; force-recreates).
- Image storage: product images are stored as compact **data URLs** (uploads, auto-resized)
  or **external URLs** — no extra static-file volume required.
