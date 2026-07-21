# Design — Demo enhancements

## 1. Canvas resize for zones & aisles

**Current:** zones/aisles are positioned via `x/y` and sized by `widthMeters` /
`depthMeters` (zone) or `widthMeters` + orientation + `lengthMeters` (aisle). They are moved
by dragging (see `LayoutEditor` drag effect). There is no resize UI; sizes are edited only in
the side panel.

**Approach:**
- Add a small `ResizeHandles` overlay rendered by `Canvas2D` when the selected entity is a
  zone or aisle **and** `!editDisabled`.
- Handles are absolutely-positioned `div`s at the 4 corners + 4 edge midpoints, in stage
  pixels. Each handle has a `data-dir` (n, s, e, w, ne, nw, se, sw).
- On handle `mousedown`, start a resize gesture (separate from the move gesture). Track the
  origin rect (x, y, w, d) and pointer start. `mousemove` computes the new rect in meters
  (via `scale`), snapped to 0.5 m, and shows a live preview (local state, like `dragPos`).
- On `mouseup`, commit:
  - Zone → `PATCH /zones/{id}` with `{ x, y, widthMeters, depthMeters }`.
  - Aisle → `PATCH /aisles/{id}` with `{ x, y, widthMeters, lengthMeters }` (orientation
    stays; horizontal length runs along X, vertical along Y).
- **Clamp:** before committing, shrink the rect if any corner falls outside the polygon
  (reuse `rectFullyInsidePolygon`; step down the growing edge). This guarantees no
  `containment_violation` on release. If it cannot fit at min size, ignore the resize.
- Minimums: zone 1×1 m; aisle width ≥ walkable min (0.8 m), length ≥ 1 m.

**API change:** aisle `PATCH` must accept `lengthMeters` (currently it accepts
`widthMeters`, `x`, `y`, `name`, mapping fields). Add `lengthMeters` handling +
containment check via the orientation-aware `aisleFootprint`.

## 2. Delete layouts

- `DELETE /layouts/:layoutId` (Designer/Admin): `repo.deleteLayout(id)` removing the layout
  row + its versions/snapshots. Return `204` (or `{ ok: true }`); 404 if missing.
- Repo: add `deleteLayout(id)` (delete from `layouts`, `layout_versions` where present).
- **Portfolio card:** the card is currently a single `<button>`. To host a nested delete
  button, convert the card to a `div` with an inner open-area click target + an absolutely
  positioned trash button (stops propagation, confirms, calls `onDeleteLayout`). Keeps
  keyboard access via a visible "Open" affordance.
- **Editor header:** add a `Delete layout` button near Back → confirm → `DELETE` → navigate
  to `/layouts` and `onRefreshLayouts()`.

## 3. Dashboard charts + per-layout metrics

**Metrics (extend `computeAnalytics`):**
- `usableAreaSqm` — polygon area if polygon, else `width*depth`.
- `usedAreaSqm` — sum of fixture footprints (already `fixtureArea`).
- `freeSpacePercent` — `100 - min(100, used/usable*100)`.
- `facingsTotal` and `facingsByCategory` — sum planogram `facings` across shelves/faces,
  grouped by the face's mapped category. (Planogram placements live on
  `shelf.faces[].planogram[]` or legacy `shelf.planogram[]`.)
- Keep existing `utilizationPercent`, `allocationByCategory`, `fixtureCount`, `capacity`.

**Dashboard UI:**
- Add a layout `<select>` (defaults to most recently updated). On change, fetch
  `/analytics/layouts/{id}/summary`.
- Charts as dependency-free SVG components in `web/src/modules/charts/`:
  - `DonutChart` — free space vs used; category fill.
  - `BarChart` — facings by category; utilization.
- KPI cards reuse existing `.kpi-card`. Empty layout → friendly empty state.
- Portfolio KPIs (all layouts) remain above the per-layout drill-down.

**Why custom SVG:** the web bundle already exceeds the 500 kB warning; adding a chart lib
(recharts/chart.js) worsens it. Small SVG donuts/bars are enough for this dashboard.

## 4 & 5. Product images (form + import) — storage decision

**Options:**
1. **Data URL in SQLite** (base64 on the product). Simplest; no static plumbing; survives the
   Docker volume. Downside: DB size — mitigated by **client-side resize** to ≤256 px before
   saving.
2. **Upload endpoint + file on a volume**, served at `/api/uploads/...`. Cleaner for large
   catalogs; needs a static route, a writable mounted dir, and cleanup.
3. **External URL only.** Zero storage; depends on network; not great for uploads.

**Decision (default):** support **(1) + (3)** — uploads are resized client-side to a data
URL; users may also paste an external URL. Field name `imageUrl` on the product (a data URL
*is* a valid URL string, so one field covers both). No new static route or volume needed.
`express.json` limit is already `1mb`; a 256 px JPEG data URL is ~10–40 kB, well within it.

- **Model/API:** `product.imageUrl` (top-level) accepted on `POST /products` and
  `PATCH /products/:id`; persisted by `repo.upsertProduct`. Also mirrored into
  `attributes.imageUrl` for backward-compatible readers.
- **Import:** `imageUrl` column (external URL) mapped onto the product. Data URLs are not
  practical in spreadsheets, so import is URL-based; the form handles uploads.

## 6. 3D product images

**Current:** `Scene3D` draws shelves as colored boxes.

**Approach:**
- For each shelf, gather its planogram placements (by face). For each placement with a
  product that has `imageUrl`, create a `THREE.TextureLoader` texture and a thin plane
  positioned on the shelf face at the placement's level/position, scaled to the product
  footprint. Reuse across facings.
- Cache textures by `imageUrl` to avoid reloading. On texture load error, skip the plane
  (color block remains).
- Keep it lightweight: cap planes per shelf (e.g., top N facings) so large planograms don't
  explode the scene. Product data must be passed into `Scene3D` (currently it may only get
  `layout`); thread `products` (or an `id → imageUrl` map) through from `LayoutEditor`.

## Testing

- API: delete-layout (success, 404, 403, version cascade); aisle `lengthMeters` PATCH +
  containment; analytics free-space & facings math.
- Web: no runner (smoke stub) — rely on lint + build + manual. Resize clamp logic can be a
  pure helper (`clampResizeInsidePolygon`) with a unit test placed in the API test dir if it
  is moved to a shared/service module, otherwise verified manually.

## Rollout / risk

- All additive; no breaking API changes (aisle PATCH gains a field; product gains a field).
- Bundle size watched (custom SVG charts, lazy 3D textures).
- Docker: rebuild web with `--no-cache` after changes (documented in compose).
```
