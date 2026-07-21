# Design: Layout dimensions, containment, rotation & shelf bays

## 1. Dimension overlays

### Canvas labels

**Aisles** — extend existing walkway render in `Canvas2D.jsx`:

```jsx
// Secondary mono label under aisle name
<span className="aisle-dim mono">{runLen.toFixed(1)}×{a.widthMeters.toFixed(1)} m</span>
```

**Shelves** — when `selection.kind === 'shelf'`, render a floating dimension chip above
the fixture (similar to zone badge):

```jsx
<span className="fixture-dim mono">{w.toFixed(1)}×{d.toFixed(1)} m</span>
```

**Selection bar** (`LayoutEditor.jsx`) — append dimensions to `selectionInfo`:

```js
// aisle: `${runLen.toFixed(1)} m run · ${width.toFixed(1)} m wide`
// shelf: `${usable.toFixed(1)} m × ${depth.toFixed(1)} m × ${height.toFixed(1)} m high`
```

Styles: `.aisle-dim`, `.fixture-dim` — 9–10px mono, high contrast, no overlap with
number badge (position top-right for shelves, bottom-centre for aisles).

## 2. Containment hardening

### Root causes (confirmed in codebase)

1. **Drag preview** (`LayoutEditor.jsx` `toPos`) clamps only `x,y ≥ 0`, not polygon.
2. **Canvas** filters `visibleShelves` to hide violations — user thinks shelf vanished
   or placement succeeded.
3. **Footprint** (`shelfFloorFootprint`) swaps W/D at 90°/270° only — arbitrary rotation
   (SEED-LD-03) needs separate math but 0/90 gaps still allow corner overflow on concave polygons if drag unchecked.

### Client-side containment helper

Add to `polygonCanvas.js` (or reuse API logic via shared util in web):

```js
export function shelfFootprintMeters(shelf) {
  // same as API shelfFloorFootprint today; extend in LD-03 for arbitrary angles
}

export function entityFitsPolygon(entity, kind, bounds) {
  const poly = bounds.polygon;
  if (!poly) return true;
  const fp = kind === 'aisle' ? aisleFootprint(entity) : shelfFootprintMeters(entity);
  return rectCornersInsidePolygon(fp, poly); // 4 corners + edge midpoints (existing API pattern)
}
```

**Drag loop** — after computing `nx, ny`, build tentative entity `{ ...orig, x: nx, y: ny }`;
if `!entityFitsPolygon(...)`, keep last valid position (don't update `dragPos`).

**Render violations** — remove `visibleShelves` filter; instead:

```jsx
className={`fx ${outside ? 'fx-violation' : ''}`}
// .fx-violation: red dashed border, pulsing outline, still selectable
```

**Validation banner** — click navigates selection to first `containmentViolations[0]`.

### Server (unchanged authority)

Keep `assertInsideOrThrow` on PATCH/POST. Add regression test: drag simulation via API
PATCH sequence near polygon edge.

## 3. Arbitrary shelf rotation

### Footprint math

Replace axis-aligned swap with rotated corners:

```js
export function shelfFloorFootprint(shelf) {
  const cx = Number(shelf.x) || 0;
  const cy = Number(shelf.y) || 0;
  const w = Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 1.2;
  const d = Number(shelf.depthMeters) || 0.6;
  const rad = ((Number(shelf.rotationDeg) || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    [0, 0], [w, 0], [w, d], [0, d],
  ].map(([lx, ly]) => [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos]);
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  return {
    corners,
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    d: Math.max(...ys) - Math.min(...ys),
  };
}

export function shelfInsidePolygon(shelf, poly) {
  const { corners } = shelfFloorFootprint(shelf);
  return corners.every(([px, py]) => pointInPolygon(px, py, poly));
}
```

**Note:** AABB (`x,y,w,d`) is insufficient for containment when rotated; use **corner test**.

### API

- PATCH `/shelves/{id}`: validate `rotationDeg` in `[0, 360)` (normalize modulo 360).
- Reject PATCH when rotated footprint outside polygon.

### Canvas

```jsx
style={{
  transform: `rotate(${rotationDeg}deg)`,
  transformOrigin: 'top left',
  // width/height remain unrotated local W×D
}}
```

Add rotation handle (small circle at top-centre of selected shelf) — drag adjusts angle
with optional Shift = snap 15°.

### 3D (`Scene3D.jsx`)

```js
group.rotation.y = -(rotationDeg * Math.PI) / 180;
```

## 4. Shelf badge readability

### Rules

| Fixture width (px) | Single-sided | Dual-sided |
|--------------------|--------------|------------|
| ≥ 56 | centred `#12` | split `12A` \| `12B` (current) |
| 36–55 | centred, 9px | stacked `12A` over `12B` |
| &lt; 36 | `#12` only + tooltip | `#12` + corner dots (A=blue, B=amber) + tooltip |

Implement in `ShelfBadge` component extracted from `Canvas2D.jsx`.

**Mirror label (optional v1):** second absolutely-positioned badge on far long edge when
`doubleSided && w * scale >= 40`.

## 5. Shelf segments (bay split)

### Data model

```ts
interface ShelfSegment {
  id: string;           // seg-{uuid6}
  offsetMeters: number; // >= 0
  widthMeters: number;  // > 0
  fillMode: 'full' | 'partial';
}
```

On shelf:

```js
{
  usableWidthMeters: 3.6,
  segments: [
    { id: 'seg-a', offsetMeters: 0, widthMeters: 1.2, fillMode: 'full' },
    { id: 'seg-b', offsetMeters: 1.2, widthMeters: 1.2, fillMode: 'partial' },
    { id: 'seg-c', offsetMeters: 2.4, widthMeters: 1.2, fillMode: 'full' },
  ]
}
```

**Default:** `segments` absent ⇒ single implicit segment spanning full usable width
(back-compat).

**Normalize** (`layoutNormalize.js` / `shelfFaces.js`):

- Coerce segments; validate `offset + width ≤ usableWidthMeters`.
- If segments empty after normalize, synthesize one full segment.
- Reject overlapping segments (400 `segment_overlap`).

### Planogram scoping

Extend placement:

```json
POST .../planogram
{ "productId", "levelIndex", "facings", "faceId", "segmentId" }
```

`computeMaxFacings(segmentWidthMeters, productWidth)` — segment width replaces shelf
usable width when `segmentId` set.

**Fill mode semantics:**

| Mode | Meaning |
|------|---------|
| `full` | Planogram UI targets 100% of segment width (warn if facings leave gap &lt; 1 product width) |
| `partial` | Allow intentional empty space; show hatched unused strip on canvas |

### UI — Merchandising panel

When shelf selected:

1. **Segments** section: list bays with width, fill toggle, delete.
2. **Split equally** — prompt N (2–12), creates N segments of `usableWidth / N`.
3. **Custom split** — editable width inputs with live sum indicator.
4. Planogram picker scoped to active segment tab.

### UI — Canvas

On selected shelf, draw vertical dashed lines at segment boundaries (in shelf local
space, respecting rotation transform).

## 6. OpenAPI delta (summary)

See tasks SEED-LD-05. Key additions:

- `Shelf.rotationDeg` — document 0–360 (not just 0/90).
- `ShelfSegment` schema + `Shelf.segments[]`.
- Planogram POST body: optional `segmentId`.
- Errors: `segment_overlap`, `segment_out_of_range`.

## 7. Security / performance / observability

| Area | Disposition |
|------|-------------|
| Security | Input validation on segment widths and rotation; no new auth surface — **N/A beyond existing RBAC** |
| Performance | Corner tests are O(1) per drag frame; acceptable — **N/A** |
| Observability | No new runtime telemetry — **N/A** |
| Rollback | Segments optional; old clients ignore `segments[]`; rotation 0 default — revert UI flags only |

## 8. Platform-fit

- Stays in existing Express + React stack (ADR-0001).
- Shared footprint logic duplicated web/API until extracted to `codebase/shared/` (optional follow-up; not blocking).
