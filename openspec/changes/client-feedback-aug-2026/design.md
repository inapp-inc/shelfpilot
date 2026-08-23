# Design — client-feedback-aug-2026

**Status:** Draft — awaiting approval

**Requirements:** [Docs/CLIENT_FEEDBACK_AUG_2026_SPEC.md](../../../Docs/CLIENT_FEEDBACK_AUG_2026_SPEC.md)
**Canonical OpenAPI:** `Docs/openapi.yaml` (edit **before** implementing any API change)

---

## 1. Platform-fit gate

| ADR area | Decision | Fit |
|----------|----------|-----|
| ADR-0001 stack (React/Vite + Express + SQLite, Node ≥ 22.5) | No stack change; all work inside existing packages | **As-is** |
| ADR-0003 project structure | New files follow existing folders (`web/src/shopper`, `api/src/services`, `codebase/shared`) | **As-is** |
| ADR-0004 persistence | One new relational table (`user_store_access`) in the existing SQLite schema, plus JSON payload fields on layouts | **As-is** |
| ADR-0006 tenancy | Multi-store access is **not** multi-tenancy; still single-tenant with per-user grants | **As-is** |
| ADR-0017 exception | Not required | N/A |

No architectural exception is needed for this change.

---

## 2. Multi-store kiosk access (FR-KIOSK-01)

### 2.1 Data model

```sql
CREATE TABLE IF NOT EXISTS user_store_access (
  user_id  TEXT NOT NULL,
  layout_id TEXT NOT NULL,
  PRIMARY KEY (user_id, layout_id),
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (layout_id) REFERENCES layouts(id)
);
```

- `users.shopper_layout_id` is **kept** and reinterpreted as the **default store**.
- Optional `users.store_access_all_approved` flag (0/1) for the "all approved stores" grant.
- **Migration:** for every user with a non-null `shopper_layout_id`, insert the matching access row. Idempotent; safe to re-run.

### 2.2 Authorization

Single resolution helper used by every read path:

```
permittedLayoutIdsFor(user):
  if user.role != Customer      -> null   (no restriction; existing role rules apply)
  if storeAccessAllApproved     -> ids of layouts with status = approved
  else                          -> rows from user_store_access
                                   ∪ { shopper_layout_id } if set
```

Applied at:

| Path | Change |
|------|--------|
| `GET /layouts` | Filter to the permitted set (today: the single assigned id) |
| `GET /layouts/:id` | 403 unless the id is in the permitted set |
| `GET /shopper/kiosk` | Accept `?layoutId=`; 403 if not permitted; fall back to default store when omitted |
| `GET /shopper/stores` | **New** — list permitted stores |

**Rejected alternative:** letting every Customer read all `approved` layouts by default. Rejected because it silently widens data exposure and cannot express "this kiosk serves these two stores".

### 2.3 API additions

```
GET /shopper/stores
200 { items: [ { layoutId, name, storeType, vertical, widthMeters, depthMeters,
                 status, isDefault } ] }
```

`GET /shopper/kiosk?layoutId={id}` → existing payload shape plus `layoutId` echo, so the client can confirm which store loaded.

Admin `createUser` / `updateUser` accept `storeAccess: string[]` and `defaultStoreId`, retaining `shopperLayoutId` as an accepted alias for a single-store grant (backwards compatible).

### 2.4 Web

| Concern | Design |
|---------|--------|
| Store list | `GET /shopper/stores` on kiosk mount |
| Pinning | `localStorage["shelfpilot.kiosk.store"]`; cleared by "Change location" in the switcher |
| Landing | picker shown when `stores.length > 1` and no pin/default resolves |
| Routing | selection navigates to `/shop/{layoutId}`; the existing Customer redirect guard is relaxed to "must be a permitted store" instead of "must equal the assigned store" |
| Grouping | `storeType === "warehouse"` → **Warehouses**; else **Retail stores** |

New components: `ShopperStorePicker.jsx` (full-screen sheet), `ShopperStoreSwitcher.jsx` (header pill).

---

## 3. Single-entrance model (FR-KIOSK-02)

| Layer | Change |
|-------|--------|
| `POST /layouts/:id/entry-points` | Set-entrance semantics: replace the existing entrance (200 on replace, 201 on first create) |
| `PATCH`/`DELETE` entry-point routes | Unchanged; delete leaves the layout entranceless (assumed plaza applies) |
| `normalizeLayout` | `entryPoints = entryPoints.slice(0, 1)`; tolerant read, canonical write |
| Audit | `layout.entrance.trimmed` recorded when >1 was present |
| `resolveShopperEntry` | Drop the admin-configured branch (the admin kiosk panel was already removed); resolve `entryPoints[0]` → `assumeEntranceSpace` |
| Name field | Persist `name`; accept `label` on read; kiosk renders `name ?? label ?? "Entrance"` |

**Ordering rule for the retained entrance:** keep the **first** array element, which is already the creation-ordered/primary entrance and is what wayfinding uses today — so behaviour does not shift for existing demo layouts.

---

## 4. Guided kiosk view + route to shelf (FR-KIOSK-03)

### 4.1 Layout states

| State | Composition |
|-------|-------------|
| **Browse** (no selection) | Finder 30 % / map 70 % — unchanged |
| **Guided** (product selected) | Map full content width; finder collapsed to a "Search again" bar with the product chip; directions in an overlay dock on the map |

CSS: `.sp-kiosk-main--guided` switches the grid to a single column; `.sp-kiosk-mapcol` keeps `min-height: 0` so the SVG host still flexes.

### 4.2 Framing

Replace the unconditional `fitFullLayout` with mode-aware framing:

| Mode | Framing |
|------|---------|
| Browse | `fitViewBoxToAspect(fullLayoutVb, hostAspect)` — today's behaviour |
| Guided | `focusViewBoxForCustomerRoute(...)` (already implemented, currently unused) over entrance + route + target tick, then `fitViewBoxToAspect`, with a **minimum span clamp** (`max(routeSpan * 1.15, MIN_GUIDED_SPAN_M)`) to prevent over-zoom on short routes |

### 4.3 Final approach segment

`computeShopperRoute` gains an opt-in tail:

```
computeShopperRoute(layout, entryPoint, shelfId, { approachShelfFace: true })
  ... existing aisle-graph path ...
  + push shelfApproachPoint(shelf, layout, lastAislePoint).edgeMid   (guarded)
```

- The new segment is emitted **only** when `segmentCrossesShelves` reports no intersection, preserving the existing invariant.
- Styled as a distinguishable "last steps" dash so the transition from corridor to shelf reads intentionally.
- The destination pin remains a separate element and now sits at the line terminus rather than beyond it.

**Rejected alternative:** routing all the way to the shelf centroid. Rejected because it necessarily crosses the shelf interior and breaks the existing collision invariant and its tests.

---

## 5. Read-only store-plan view (FR-KIOSK-04)

New `codebase/web/src/shopper/ShopperLayoutPlanMap.jsx`:

```
props: { layout, entryPoint, route, markerPoint, highlightShelfId, className }
layers (bottom → top):
  floor polygon / store envelope
  runwayBandsForMap(layout)      → aisle corridors
  shelfTilesForMap(layout)       → exact rotated fixture footprints
  zone tints (muted, optional)
  RouteLayer / EntryMarker / MapPin   (shared with ShopperFloorMap)
  target shelf emphasis + bay label
```

- Geometry helpers come from `shopperSchematicMap.js` / `shopperMapGeometry.js`, both already covered by `shopper-schematic.test.js`.
- Shared sub-components (`RouteLayer`, `EntryMarker`, `MapPin`) are extracted from `ShopperFloorMap.jsx` into `shopper/mapLayers.jsx` so both renderers stay visually identical.
- No pointer handlers are attached — read-only by construction.
- Reuses existing unused CSS: `.shopper-floor-map--layout`, `.shopper-layout-map-board`, `.shopper-layout-map-route`.

**Rejected alternative:** `Canvas2D` with `editDisabled`. Rejected — ~25 required props, pixel-based sizing rather than responsive SVG, retains selection/hover behaviour, and has no route layer.

---

## 6. Three-shelf 3D focus group (FR-VIEW-02)

### 6.1 Focus set selection

```
focusGroupFor(layout, targetPhysicalShelfId):
  shelves = shelvesOnAisle(layout, target.aisleId)        // already sorted by shelfIndexAlongAisle
  i = indexOf(target)
  window = clamp a 3-wide window around i to [0, shelves.length)
  return window                                          // 1 or 2 shelves if the aisle is short
```

Merged gondola display units are resolved through the existing `shelvesForScene3D` / `unitTouchesPhysicalShelf` helpers, so front/back pairs continue to render as one unit.

### 6.2 Rendering changes

| Concern | Change |
|---------|--------|
| Props | `focusPhysicalShelfId` → plus `focusPhysicalShelfIds: string[]`; the single id remains the **emphasised** shelf |
| Planogram rows | `planogramRowsForFace` matches against the focus **set** instead of one id |
| Emphasis | Target: full opacity + highlight ring. Neighbours: products visible at ~0.85 opacity, no ring. Out-of-group: frame geometry only |
| Camera | `shelfGroupFocusCamera(groupBounds, faceId)` derived from `shelfFocusCamera`, with span from the union AABB; same face-aware approach angle and orbit clamp |
| Labels | Face-label sprites for all three; target rendered active |
| Return path | `planogram3dReturn` continues to carry the **originally selected** shelf + face |

### 6.3 Performance

| Lever | Effect |
|-------|--------|
| Products instanced for the focus group **only** in `shelfFocusMode` | Fewer instances than today (which builds facings for every unit) |
| Per-shelf cap raised for focus-group shelves | Three fully merchandised shelves render without truncation |
| Global `MAX_FACINGS` unchanged | Existing safety ceiling retained |

Evidence to capture: instance count and first-frame time before/after on the demo hypermarket layout.

---

## 7. Configurable naming (FR-NAME-01)

### 7.1 Shared formatter

New `codebase/shared/labelFormat.mjs` (mirrors the existing `codebase/shared/productBuffer.mjs` pattern) exporting:

```
DEFAULT_NAMING_CONVENTION          // exactly today's behaviour
resolveNamingConvention(layout, verticalConfig)
formatAisle(aisleNumber, convention)
formatBay(shelfIndexAlongAisle, convention)
formatShelfCode(aisleNumber, shelfIndexAlongAisle, convention)   // "{aisle}{bay}" → 4A
formatLevel(levelIndex, convention)
formatPosition(positionIndex, convention)
parseShelfCode(text, convention)
```

Consumed by API `aisleLabeling.js` and web `shelfFaces.js` / `planogramSegments.js` / `shopperMapLabels.js`, removing today's duplicated formatting logic.

### 7.2 Config precedence

```
layout.namingConvention  ▸  config(vertical).namingConvention  ▸  DEFAULT_NAMING_CONVENTION
```

- `VerticalConfig.namingConvention` — set in Admin → Configuration; whitelisted in the `PUT /admin/config` body builder (which currently drops unknown fields).
- `layout.namingConvention` — per-store override, persisted in the layout JSON payload and settable via `PATCH /layouts/:id`.

### 7.3 Render-time-only rule

`aisleNumber` and `shelfIndexAlongAisle` remain the persisted source of truth; **no formatted string is ever persisted**. Consequences:

- No data migration.
- Changing a convention re-labels immediately with **no** re-generation of aisles/shelves and no geometry change.
- `finalizeAisleLabeling` keeps assigning structure; only presentation reads the convention.

### 7.4 Compatibility guarantee

`DEFAULT_NAMING_CONVENTION` reproduces `{aisleNumber}{BAY_LETTER}` byte-for-byte, so these must pass **unchanged**: `aisle-labeling.test.js`, `aisle-shelf-view.test.js`, `shopper-schematic.test.js`, `aisle-binding-vertical.test.js`, `dual-face.test.js`.

---

## 8. Engineering constraints

| Constraint | Applies | Approach |
|-----------|---------|----------|
| **Security** | **Yes** (FR-KIOSK-01) | Every Customer layout read authorized against the permitted set; grant changes audited (`user.storeAccess.update`); negative tests for non-granted stores; OWASP **A01 Broken Access Control** is the primary risk for this change |
| **Performance** | **Yes** (FR-VIEW-02, FR-KIOSK-04) | Focus-group-only product instancing; capture instance count + first-frame timing; plan view reuses tested geometry helpers and adds no per-frame work |
| **Observability** | Partial | Audit entries for entrance trim and store-grant changes; existing correlation-ID logging is sufficient — no new metrics |
| **Rollback / flags** | **Yes** | `KIOSK_MULTI_STORE`, `KIOSK_PLAN_VIEW`, `SHELF_3D_GROUP_FOCUS` toggles so each behaviour can be disabled without redeploying; naming defaults to today's convention, making FR-NAME-01 inert until configured |

---

## 9. Patterns chosen vs rejected

| Decision | Chosen | Rejected | Rationale |
|----------|--------|----------|-----------|
| Store scope | Explicit per-user grant list | All-approved-by-default | Auditable, least privilege, expresses "this kiosk serves these stores" |
| Store selection UI | Switcher pill + full-screen picker | Tabs; `<select>` dropdown | Tabs break past ~4 stores and consume map space; dropdowns are poor touch targets |
| Plan view renderer | New SVG over tested geometry helpers | `Canvas2D` read-only | Responsive, read-only by construction, far less wiring |
| Route to shelf | Aisle path + guarded face approach segment | Direct route to shelf centroid | Preserves the no-shelf-crossing invariant and its tests |
| Naming storage | Structural fields + render-time format | Persist formatted labels | No migration; instant re-label; single source of truth |
| Naming scope | Per-layout override + vertical default | Vertical only | Client cited variation **across store locations** |
| 3D group | Fixed 3, prop-driven | Configurable N in v1 | Meets the ask now; widening later is a one-line change |
