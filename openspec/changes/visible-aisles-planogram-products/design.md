# Design: Visible generated aisles + updated products in planogram

## 1. Aisle orientation model

### Problem

The packer produces horizontal (`orient === "horizontal"`) and vertical (`else`)
runs. An aisle object carries `{ x, y, widthMeters, lengthMeters }` where:

- **horizontal aisle**: runs along X ⇒ X-extent = `lengthMeters`, Y-extent = `widthMeters`.
- **vertical aisle**: runs along Y ⇒ X-extent = `widthMeters`, Y-extent = `lengthMeters`.

But `aisleFootprint()` is hard-coded to `w = lengthMeters, d = widthMeters`, which is
only correct for horizontal aisles. Vertical aisles therefore get a footprint that
extends the wrong way, failing `rectFullyInsidePolygon` (dropped) or, when they
survive, Canvas draws them sideways.

### Change

Add an explicit `orientation` field to generated aisles and make footprint +
rendering orientation-aware.

```js
// layoutPacker.js — horizontal branch
tryPushAisle({ ...aisle, orientation: "horizontal", widthMeters: minAisle, lengthMeters: aisleLen, x: ax, y: aisleY });

// layoutPacker.js — vertical branch
tryPushAisle({ ...aisle, orientation: "vertical", widthMeters: minAisle, lengthMeters: aisleLen, x: aisleX, y: ay });
```

```js
// polygonContainment.js
export function aisleFootprint(aisle, layout) {
  const aw = Math.max(0.4, Number(aisle.widthMeters) || 1);
  const len = aisle.lengthMeters != null
    ? Number(aisle.lengthMeters)
    : Math.max(2, (Number(layout?.widthMeters) || 10) * 0.35);
  const vertical = aisle.orientation === "vertical";
  return vertical
    ? { x: Number(aisle.x) || 0, y: Number(aisle.y) || 0, w: aw,  d: len }
    : { x: Number(aisle.x) || 0, y: Number(aisle.y) || 0, w: len, d: aw };
}
```

`orientation` defaults to `"horizontal"` when absent (back-compat for existing saved
layouts and manually-drawn aisles).

## 2. Guaranteed spacing

- `minAisle = max(0.9, config.minAisleWidthMeters)` for autogen so the walkway is
  always physically meaningful even if a vertical is configured with a tiny value.
- Packer already interleaves `shelf row → gap → aisle → gap → shelf row`; keep that,
  but ensure the aisle row is only emitted when a full `minAisle` band fits (already
  guarded by the `break` conditions).
- Return `aisleCount` alongside `shelfCount` / `skippedOutsideCount` for the toast.

## 3. Canvas walkway rendering

In `Canvas2D.jsx`, replace the faint aisle block with a clearly visible walkway.

```jsx
const vertical = a.orientation === "vertical";
const runLen = a.lengthMeters != null ? a.lengthMeters : Math.max(2, layout.widthMeters * 0.35);
const w = vertical ? a.widthMeters : runLen;
const h = vertical ? runLen : a.widthMeters;
// style:
//   width: Math.max(24, w * scale), height: Math.max(18, h * scale)
//   background: repeating-linear-gradient walkway tint (light) OR solid rgba(...,0.35)
//   border: "1px dashed rgba(31,41,51,0.45)"
//   label centered: `Aisle N`, readable size (>= 11px)
```

- Aisles keep `zIndex: 1` and render **before** shelves so shelf badges stay on top,
  but the stronger fill + dashed border makes the walkway legible between blocks.
- `title` attribute: `Aisle N · {width} m` for hover detail.

## 4. Updated products in the planogram

### Flow today

`App.jsx` loads the catalog (`categories`, `products`) for the active vertical and
passes `products` → `LayoutEditor` → `MerchandisingPanel`, which calls
`filterProductsForShelf(products, faceCategoryId, categories)`
(category + descendants). After an Excel import, the editor's `products` can be stale
because the catalog is not re-fetched when returning to / opening a layout.

### Change

1. **Refresh on editor open**: when the route resolves to a layout, (re)load the
   catalog for `layout.vertical` before/at editor mount, so the picker reflects the
   latest products.
2. **Refresh after import**: after a successful catalog import, invalidate/reload the
   catalog so any open editor picker updates (import already reloads catalog on the
   catalog page; extend so the editor path also reloads when navigated to).
3. **Picker states** in `MerchandisingPanel.jsx`:
   - No face category → "Assign a category to this face to place products."
   - Face category set, zero products → "No products in {category}. Import or add
     products in Catalog." + **Refresh** button (re-fetches catalog).
   - Otherwise → list with a visible count (`N products`).
4. **Import tolerance**: products whose `categoryId` was auto-created as a stub during
   import already resolve through `descendantCategoryIds`; verify stub categories are
   returned by the catalog list for the vertical so they filter correctly.

No schema change is required for products; this is data-freshness + UX.

## 5. Special zones (hot / offer / custom)

### Data model

New optional layout collection `zones[]`:

```jsonc
{
  "id": "zone-a1b2c3",
  "type": "hot",              // "hot" | "offer" | "special"
  "name": "Seasonal offers",  // optional; user-definable label for custom/special zones
  "color": "#f97316",         // optional; defaults per type
  "x": 2.0, "y": 1.5,          // meters, top-left, in polygon coordinate space
  "widthMeters": 4.0,
  "depthMeters": 3.0
}
```

- `type` is an enum with a default color per type (`hot` = warm/red, `offer` = amber,
  `special` = purple). `special` + a custom `name` covers user-defined zones so the
  user can "define also".
- Rectangle footprint only in this change (keeps containment simple and matches the
  strict-polygon rule). Polygon zones can be a later enhancement.
- **Strict containment**: a zone must fit fully inside the drawn polygon
  (`rectFullyInsidePolygon`), reusing the existing containment helper; reject with
  `containment_violation` (400) otherwise.
- Zones are pure overlays — they do **not** participate in aisle/shelf packing or block
  placement; autogenerate ignores them (they survive regenerate as they live in a
  separate collection).

### API

- `POST /layouts/:layoutId/zones` — create (validates containment).
- `PATCH /layouts/:layoutId/zones/:zoneId` — rename/recolor/retype/move/resize.
- `DELETE /layouts/:layoutId/zones/:zoneId` — remove.
- `zones` included in the normalized layout GET response.
- `layoutNormalize.js` normalizes `zones` (numeric coercion, default color by type).

### Canvas + panel

- Zone palette tool: "Zone" with a type dropdown (Hot / Offer / Special); draw a
  rectangle inside the polygon (respects `insideZone`, like fixtures).
- Rendered under shelves/aisles as a translucent tinted rectangle with a dashed
  colored border and a corner label (`Hot`, `Offer`, or the custom name).
- Side-rail "Zones" section: list with rename, type, color swatch, delete.

## 6. Store entry points

### Data model

New optional layout collection `entryPoints[]`:

```jsonc
{
  "id": "entry-9f8e7d",
  "name": "Main entrance", // optional
  "x": 0.0, "y": 6.0,        // meters, near polygon boundary
  "widthMeters": 1.8
}
```

- Placed via an "Entry" palette tool (single click near an edge).
- Rendered as a distinct marker (door glyph / inward arrow) on the canvas.
- Metadata only in this change — does not alter packing; reserved as a future
  autogen hint (e.g. bias hot zones near entry).

### API

- `POST /layouts/:layoutId/entry-points`, `PATCH .../:id`, `DELETE .../:id`.
- `entryPoints` included in normalized layout; `layoutNormalize.js` normalizes.

## Files touched (implementation preview)

| File | Change |
|------|--------|
| `codebase/api/src/services/polygonContainment.js` | orientation-aware `aisleFootprint` |
| `codebase/api/src/services/layoutPacker.js` | tag aisle `orientation`, clamp `minAisle`, return `aisleCount` |
| `codebase/api/src/services/layoutNormalize.js` | default `orientation` on aisle normalize |
| `codebase/api/src/routes/layouts.js` | include `aisleCount` in autogenerate response |
| `codebase/web/src/layout-editor/Canvas2D.jsx` | visible, orientation-aware walkway rendering |
| `codebase/web/src/layout-editor/LayoutEditor.jsx` | show aisle count in generate toast |
| `codebase/web/src/App.jsx` | reload catalog on editor open + after import |
| `codebase/web/src/layout-editor/MerchandisingPanel.jsx` | picker count + empty-state + refresh |
| `codebase/api/src/services/layoutNormalize.js` | normalize `zones` + `entryPoints` |
| `codebase/api/src/routes/layouts.js` | zones + entry-points CRUD, containment |
| `codebase/web/src/layout-editor/Canvas2D.jsx` | render zones + entry markers; zone/entry draw tools |
| `codebase/web/src/layout-editor/EditorSideRail.jsx` | Zones + Entry points management sections |
| `codebase/web/src/layout-editor/referenceCatalog.js` | zone/entry palette tool defs |
| `codebase/web/src/styles.css` | `.aisle` walkway + `.zone` + `.entry-point` styles |
| `codebase/api/test/*` | aisle-orientation + footprint + zone containment + entry tests |

## Backward compatibility

- Aisles without `orientation` are treated as `horizontal` (current behavior).
- No API contract break; `aisleCount` is additive; `orientation` is an additive,
  optional field (OpenAPI patch/minor).
- `zones` and `entryPoints` are new optional collections; layouts without them behave
  exactly as today. Autogenerate leaves both collections untouched.
