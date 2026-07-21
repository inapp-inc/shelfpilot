# Audit: aisle visibility + planogram product freshness

## Ask → current behavior → gap

| # | User ask | Current behavior | Gap |
|---|----------|------------------|-----|
| 1 | Aisles should show when generating | Aisles generated (log shows `aisleCount > 0`) but drawn as `rgba(156,163,175,0.2)` faint strip with 10px label | Visually invisible ⇒ reads as "no aisles" |
| 2 | Aisles "with space also" | Packer interleaves shelf/aisle bands with real gaps | Space exists but not perceivable; tiny config aisle width can shrink it |
| 3 | Aisles for tall/portrait layouts | Vertical branch builds aisles, but `aisleFootprint` swaps dims | Vertical aisles dropped by containment or drawn sideways |
| 4 | List updated products in planogram | Editor uses catalog loaded for vertical | Not refreshed after Excel import ⇒ stale picker |
| 5 | Hot/offer/special zones (user-definable) | No zone concept on layout | New `zones[]` model + canvas draw/edit needed |
| 6 | Define store entry point | No entry-point concept | New `entryPoints[]` model + canvas marker needed |

## Code baseline (verified)

- `codebase/api/src/services/layoutPacker.js`
  - `packAislesAndShelves` — horizontal branch (L103–137) and vertical branch
    (L138–173). Both call `tryPushAisle` with `{ x, y, widthMeters: minAisle,
    lengthMeters: aisleLen }` but **no `orientation`**.
  - Returns `{ aisles, shelves, durationMs, orientation, droppedOutsidePolygon,
    skippedOutsideCount }` — **no `aisleCount`** convenience field (caller uses
    `packed.aisles.length`).
- `codebase/api/src/services/polygonContainment.js`
  - `aisleFootprint` (L127–134) hard-codes `w = lengthMeters`, `d = widthMeters`
    (horizontal-only). Used by `entityInsideLayout` (L136–140) which both branches
    filter through (L177) → **vertical aisles at risk**.
- `codebase/web/src/layout-editor/Canvas2D.jsx`
  - Aisle map (≈L208–256): `background` faint gray, label `fontSize: 10`, size always
    `width: len`, `height: widthMeters` (**horizontal-only** rendering).
- `codebase/web/src/layout-editor/categoryFilter.js`
  - `filterProductsForShelf` scopes products to face category + descendants — correct;
    depends entirely on freshness of `products`/`categories` passed in.
- `codebase/web/src/App.jsx` / `LayoutEditor.jsx`
  - Catalog load is keyed to vertical/route; import success reloads on catalog page but
    editor picker relies on the same `products` prop which may be stale on navigation.
- `codebase/api/src/routes/layouts.js`
  - Autogenerate response (L580–589) reports `generated.aisles` (from
    `packed.aisles.length`) and `shelves`; toast in editor currently surfaces shelves
    + skipped only.
  - No routes for zones or entry points; layout has no `zones[]` / `entryPoints[]`.
- `codebase/api/src/services/polygonContainment.js`
  - `rectFullyInsidePolygon` is reusable for zone containment (no new geometry needed).
- `codebase/web/src/layout-editor/referenceCatalog.js` + palette
  - `FIXTURE_TYPES` + `aisle`/`draw`/`select` tools exist; no `zone`/`entry` tools yet.

## Module impact

| Module | Impact |
|--------|--------|
| Layouts (API packer/containment) | Aisle orientation field + footprint fix |
| Layout editor canvas | Walkway rendering both orientations |
| Layout editor merchandising | Catalog refresh + picker states |
| Catalog import | Ensure imported products reach editor (refresh path) |
| Layouts (API model) | New `zones[]` + `entryPoints[]` collections, CRUD, containment |
| Layout editor canvas/side-rail | Zone + entry-point draw tools and management UI |

## Risk

- Low. Additive `orientation` field; footprint fix only changes vertical-aisle math.
- Canvas styling change is presentation-only.
- Catalog refresh is idempotent read.
