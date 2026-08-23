# Proposal: Client feedback Aug 2026 — kiosk store scope, guided wayfinding, 3D context, configurable naming

**Status:** Draft — awaiting approval (no implementation started)

**Source:** Client demo feedback 2026-08-19. Client is **not satisfied** with the delivered kiosk and planogram 3D behaviour.

**Requirements spec:** [Docs/CLIENT_FEEDBACK_AUG_2026_SPEC.md](../../../Docs/CLIENT_FEEDBACK_AUG_2026_SPEC.md)

**Prior art:** `customer-feedback-jul-2026` (Customer role + wayfinding) · `demo-feedback-jul-2026` · [Docs/SHOPPER_KIOSK_2D_MAP_UX_SPEC.md](../../../Docs/SHOPPER_KIOSK_2D_MAP_UX_SPEC.md) (map/route styling baseline)

---

## Summary

Six requested changes across the customer kiosk, the planogram 3D view, and label nomenclature. Two are model changes (multi-store access, single entrance), three are UX/rendering changes (guided map dominance, read-only store plan, three-shelf 3D), and one is a configuration capability (naming conventions).

## Why the current implementation missed

The kiosk was built on **one customer = one store = one simplified map**. The client's model is **one kiosk = a location selector on top of a real store plan, with a visible walking line that reaches a real shelf**. That mismatch, not defect density, is the source of dissatisfaction.

| Assumption made | Client expectation |
|-----------------|--------------------|
| Customer is permanently bound to a single layout | Kiosk user picks the store or warehouse at the top level |
| Multiple entrances are supported (extra routing complexity) | One entrance per store, deliberately, to reduce complexity |
| Map is a secondary 30 % panel; simplified lane diagram is the only view | Map dominates after selection; a real 2D design view must also be available read-only |
| Route stops at the aisle centreline (pin conveys the rest) | The line must be drawn **from the entrance to that shelf** |
| 3D focus = one shelf | 3D shows the shelf **in context** with its two neighbours |
| Aisle/bay/shelf codes are a fixed platform format | Naming varies by store location and must be configurable |

## Client requests (traceability)

| # | Client ask | Requirement | Problem today |
|---|-----------|-------------|---------------|
| 1 | Select specific retail stores or warehouses at the top level; layout auto-populates | FR-KIOSK-01 | `users.shopper_layout_id` allows exactly one layout; other layouts return 403; no picker exists |
| 2 | Restrict the store model to a single entrance | FR-KIOSK-02 | `layout.entryPoints[]` is uncapped; wayfinding branches over configured / first / assumed entrance |
| 3 | Better store-selection UX than tabs | FR-KIOSK-01 | No selection UI at all |
| 4 | Route display must be bigger; add read-only 2D design view; draw the line entrance → shelf | FR-KIOSK-03, FR-KIOSK-04 | Fixed 30/70 split in both modes; `focusViewBoxForCustomerRoute` unused; route ends on the aisle centreline; no plan view (CSS scaffolded, never built) |
| 5 | 3D shows three adjacent shelves, not one | FR-VIEW-02 | `shelfFocusMode` renders planogram rows for one physical shelf; camera frames one shelf span |
| 6 | Aisle / bay / shelf nomenclature configurable per location | FR-NAME-01 | Format hard-coded as `{aisleNumber}{BAY_LETTER}` in two duplicated modules; config is per-vertical only |

## Deliverables

### 1. Multi-store kiosk access (FR-KIOSK-01)

- New `user_store_access(user_id, layout_id)`; `users.shopper_layout_id` retained as the **default store**.
- Migration seeds one access row from each existing assignment — **no behaviour change for current users**.
- New `GET /shopper/stores`; `GET /shopper/kiosk` accepts `?layoutId=`; `GET /layouts/:id` authorizes against the permitted set.
- Admin user form: multi-select stores + default-store radio for Customer role; optional "all approved stores" grant.
- Kiosk **store switcher pill + full-screen picker** (grouped Retail stores / Warehouses, searchable, large touch cards). Tabs rejected — they do not scale past ~4 stores and consume map space.
- Single-store users keep today's zero-friction direct load.

### 2. Single-entrance store model (FR-KIOSK-02)

- `POST /layouts/:id/entry-points` becomes **set-entrance** (replaces rather than appends).
- `normalizeLayout` canonicalises to at most one entrance; tolerant on read, canonical on write; audit entry when trimming legacy data.
- Editor entrance tool relabelled "Set entrance"; `ZonesEntryPanel` shows a single entrance row.
- `resolveShopperEntry` simplifies to `entryPoints[0]` → assumed front plaza.
- Fix the `name` vs `label` mismatch so editor entrance names reach the kiosk.

### 3. Guided kiosk view (FR-KIOSK-03)

- Product selection switches to a **guided layout**: map full width, finder collapsed to a "Search again" bar, directions in an overlay dock.
- Adopt `focusViewBoxForCustomerRoute` with a minimum-span clamp for framing.
- **Final approach segment** from the aisle centreline to the shelf face point, so the drawn line reaches the shelf; existing shelf-interior collision guard reused.
- Pixel-stable route stroke (≥ 8 px at 1080p), halo, animated dash, per the 2D map UX spec §6.2.

### 4. Read-only 2D store-plan view (FR-KIOSK-04)

- New `ShopperLayoutPlanMap.jsx` SVG renderer over the already-tested `shelfTilesForMap` / `runwayBandsForMap` geometry, reusing `RouteLayer` / `EntryMarker` / `MapPin`.
- Segmented toggle **"Simple map | Store plan"**; default Simple map so the original "too CAD-like" complaint does not regress.
- Strictly read-only: no selection, drag, tooltips, or edit affordances. Reactivates the existing unused `.shopper-floor-map--layout` CSS.

### 5. Three-shelf 3D context (FR-VIEW-02)

- Focus **group** = target + previous + next by `shelfIndexAlongAisle` within the same `aisleId` (via `shelvesOnAisle()`), with first/last/short-aisle edge handling.
- `planogramRowsForFace` accepts a set of focused physical shelf ids so all three show products; target emphasised, neighbours muted but legible.
- Group-aware camera framing from the union bounds, keeping the face-aware approach angle.
- Performance: in focus mode instance products for the **focus group only** — net reduction in instances versus today.

### 6. Configurable nomenclature (FR-NAME-01)

- `namingConvention` config for aisle, bay, level, and position tokens plus a composed `code.pattern` (default `{aisle}{bay}` = today's `4A`).
- **Vertical default** on `VerticalConfig` + **per-layout override** on `layout.namingConvention` (client cited variation across store locations).
- New shared `codebase/shared/labelFormat.mjs` consumed by API `aisleLabeling.js` and web `shelfFaces.js`, eliminating today's duplicated formatting.
- Structural fields stay the source of truth; formatting is render-time only → **no data migration**, instant re-label.
- "Go to shelf" parser derives from the active convention.

## SEED units

| ID | Scope |
|----|-------|
| SEED-CB-01 | Guided kiosk layout: map dominance, route re-framing, pixel-stable stroke |
| SEED-CB-02 | Final-approach route segment to shelf face + entrance name fix |
| SEED-CB-03 | Single-entrance model (API, normalize, editor, legacy trim) |
| SEED-CB-04 | Read-only store-plan SVG renderer + view toggle |
| SEED-CB-05 | Multi-store access model (table, migration, `GET /shopper/stores`, authorization) |
| SEED-CB-06 | Store picker UX, switcher, kiosk pinning, admin multi-select |
| SEED-CB-07 | Three-shelf 3D focus group, camera, planogram rows, facing budget |
| SEED-CB-08 | Shared label formatter + naming config (vertical + per-layout) + admin UI |
| SEED-CB-09 | Tests, OpenAPI, spec fold, PENDING/BRD status refresh |

## Success criteria

- A Customer granted 3 stores signs in, sees a grouped picker, selects a warehouse, and its layout, products, and entrance load without re-login; a non-granted store returns 403.
- A Customer granted 1 store sees **no** picker and loads directly, exactly as today.
- Placing a second entrance in the editor **moves** the existing one; a legacy 3-entrance layout trims to 1 on save with an audit entry; an entrance named "Main Door" shows as "Main Door" in the kiosk.
- Selecting a product gives the map ≥ 70 % of content width, and the route's last vertex is the **shelf face approach point** with no segment crossing a shelf interior.
- Route stroke measures ≥ 8 px at 1080p with visible dash animation (motion preferences respected).
- "Store plan" renders true design geometry with the same route overlay and cannot be edited; switching views preserves product, route, and framing.
- "View in 3D" from a mid-aisle shelf shows three shelves with products, all inside the camera frame; first/last/single-shelf aisles behave correctly; returning to the planogram reopens the originally selected shelf and face.
- With no naming config, every label matches today and all existing label tests pass unchanged; with `{aisle}-{bay}`, editor, planogram, 3D, kiosk, and find-product all show `4-A`; a per-layout override wins over the vertical default.

## Non-goals

- Multi-floor stores / multiple floor polygons per layout.
- Anonymous kiosk access (Customer login still required).
- Turn-by-turn live positioning, beacons, or sensors.
- Any editing capability from the kiosk.
- Re-numbering or migrating existing persisted geometry for naming changes.
- Cross-store analytics or multi-product route optimisation.

## Open decisions

Recorded as **D1–D8** in [Docs/CLIENT_FEEDBACK_AUG_2026_SPEC.md](../../../Docs/CLIENT_FEEDBACK_AUG_2026_SPEC.md) §5 — store access scope, kiosk store pinning, legacy entrance trim policy, plan-view renderer choice, naming config scope, 3D focus-group size, warehouse kiosk shell, and glossary confirmation (client "bay"/"shelf" vs ShelfPilot entities).

## Relationship to prior changes

| Prior change | Relationship |
|--------------|--------------|
| `customer-feedback-jul-2026` | Established the Customer role and single assigned store — FR-KIOSK-01 supersedes the single-store constraint |
| `demo-feedback-jul-2026` | Wayfinding baseline — FR-KIOSK-03 extends the route to the shelf face |
| `SEED-07c-viz-3d` | 3D completeness backlog — FR-VIEW-02 delivers the shelf-context portion |
| `SEED-LE-03-aisle-shelf-config` | Aisle/shelf configuration — FR-NAME-01 adds the naming dimension |
| `SEED-02-admin-config` | Admin config completeness — FR-NAME-01 adds `namingConvention` to `VerticalConfig` |
