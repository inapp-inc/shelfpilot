# Design: Demo feedback — July 2026

## 1. Aisle-centric shelf numbering (DF-01)

### Client model vs current model

| Aspect | Current (`shelf-face-letter-number-labels`) | Target (client demo) |
|--------|---------------------------------------------|----------------------|
| Primary key | Sequential unit letter: A, B, C… | **Aisle number** + shelf letter along aisle |
| Face label | A1, A2 (unit A, face 1/2) | **4A**, **4B** (aisle 4, shelf units A/B) |
| Dual-face back | Same unit letter, face 2 | **Opposite aisle** number + letter (e.g. **5A** on aisle 5 behind spine) |
| Aisle identity | `aisleId` UUID, optional binding | Explicit **`aisleNumber`** integer shown on canvas |

### Data model (additive)

```js
// Aisle
{
  id: "uuid",
  aisleNumber: 4,           // NEW — 1-based, unique per layout
  orientation: "horizontal" | "vertical",
  // x, y, lengthMeters, widthMeters ...
}

// Shelf (per physical record; front/back pair share pairId)
{
  id: "uuid",
  aisleId: "uuid",          // walk aisle this face serves
  shelfIndexAlongAisle: 1,  // NEW — 0→A, 1→B, 2→C
  displayNumber: 4,           // OPTIONAL retain for sort; or derive from aisleNumber
  // pairId, pairRole: front|back ...
}
```

### Label helpers

```js
const SHELF_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function shelfLetter(index) {
  return SHELF_LETTERS[index] ?? String(index + 1);
}

/** Customer-facing label, e.g. aisle 4, second unit → "4B" */
export function aisleShelfLabel(aisleNumber, shelfIndexAlongAisle) {
  return `${aisleNumber}${shelfLetter(shelfIndexAlongAisle)}`;
}

/** Dual-face: resolve aisle from shelf.aisleId → aisle.aisleNumber */
export function shelfFaceDisplayLabel(shelf, aisles) {
  const aisle = aisles.find((a) => a.id === shelf.aisleId);
  const n = aisle?.aisleNumber ?? "?";
  const idx = shelf.shelfIndexAlongAisle ?? 0;
  return aisleShelfLabel(n, idx);
}
```

### Assignment algorithm (post-pack)

1. Sort walk aisles by primary flow (entry point → depth), assign `aisleNumber` 1…N.
2. For each aisle, sort adjacent shelf units along aisle run (projection on aisle axis).
3. Assign `shelfIndexAlongAisle` 0, 1, 2… per unit (gondola pair = one unit, two physical records with same index).
4. Front record: `aisleId` = customer-side aisle. Back record: `aisleId` = opposite aisle (existing `aisleBinding.js` logic).

### UI impact

- Replace `shelfFaceLabel(displayNumber, faceId)` calls with `shelfFaceDisplayLabel(shelf, aisles)` in Properties, canvas, merch, planogram.
- Legend rows: `4A → Grocery`, `4B → Dairy`, …
- Selection highlight must match hovered label.

---

## 2. WebGL 2D floor plan (DF-02)

### Rationale

`Canvas2D.jsx` positions fixtures as absolutely positioned DOM nodes on a CSS-scaled stage. Zoom/pan, sub-pixel rounding, and paired-shelf merge cause **visible misalignment** between aisles and shelves — reported in demo.

Three.js orthographic 2D shares the same metre space as `Scene3D.jsx`:

```jsx
// FloorPlan2D.jsx (sketch)
const camera = new OrthographicCamera(-halfW, halfW, halfD, -halfD, 0.1, 100);
camera.position.set(storeCx, 50, storeCz);
camera.lookAt(storeCx, 0, storeCz);
camera.up.set(0, 0, -1); // top-down, north up
```

### Scene layers

| Layer | Render |
|-------|--------|
| Floor | Envelope fill (slate) + fixture polygon (crimson hatch) |
| Aisles | Walk surface mesh + aisle number label at centre |
| Shelves | Extruded rects (flat); category colour; spine line for gondola |
| Zones | Semi-transparent overlay |
| Labels | Billboard text: aisle number, shelf label (4A) |

### Interaction

- **Raycaster** on pointer move / click → `{ shelfId, faceId }`.
- Drag: attach to `TransformControls` or custom drag plane at y=0.
- Draw/edit polygon: **Option A (recommended v1)** — keep SVG overlay for draw modes only; WebGL for view/edit fixtures. **Option B** — full WebGL vertex handles (more work).

### Feature flag

```env
VITE_USE_WEBGL_2D=true
```

LayoutEditor:

```jsx
{useWebGl2d ? (
  <FloorPlan2D ... />
) : (
  <Canvas2D ... />
)}
```

### Shared assets

Extract fixture dimensions/colours into `fixtureSceneGraph.js` used by both `Scene3D` and `FloorPlan2D`.

---

## 3. Dimension-first store area (DF-03)

### Meter bar extension

```
[ Store W: 20.0 m ] [ Store D: 15.0 m ]  ·  Fixture zone 14×10 m  ·  [ Fit ] [ Focus ▾ ]
```

- Inputs bound to `layout.storeEnvelope.widthMeters` / `depthMeters`.
- On blur/Enter: PATCH layout; canvas re-fit optional.
- Envelope rect re-renders immediately (optimistic UI).

### Edit modes

| Mode | Envelope | Fixture polygon |
|------|----------|-----------------|
| Draw area | Read-only guide (dashed) | Click/trace vertices |
| Edit envelope | Corner handles + numeric inputs | Unchanged |
| Edit area | Unchanged | Vertex drag (existing CF-06) |

### Create flow shortcut

New layout form already has W×D → on first editor open, envelope pre-drawn; prompt: “Trace fixture zone inside store”.

---

## 4. Shelf hover product preview (DF-04)

```jsx
function ShelfProductTooltip({ shelf, faceId, products, anchor }) {
  const label = shelfFaceDisplayLabel(shelf, aisles);
  return (
    <Popover anchor={anchor}>
      <strong>{label}</strong>
      <div>{categoryName}</div>
      <ul>{products.slice(0, 8).map(p => <li key={p.id}>{p.name}</li>)}</ul>
      {products.length > 8 && <div>+{products.length - 8} more</div>}
    </Popover>
  );
}
```

- Product list from `facePlanogram(shelf, faceId).facings` resolved against catalog (layout load cache).
- Debounce 500 ms; dismiss on pointer leave.

---

## 5. Smart Generate v2 (DF-05)

### Packer adjustments

- Quantise positions to 0.05 m grid after pack.
- Shelf outer edge distance to aisle centreline ≤ fixture depth/2 + ε.
- Reject pack if any shelf centre &gt; 0.15 m from expected spine.

### Product fill

- Resolve template category IDs → catalog IDs (existing `planogramAutoFill.js`).
- Fill front and back faces independently per aisle-bound category.
- Return `{ productsPlaced, productsEligible, byCategory: [...] }` in autogen response.

### UI

Smart Generate panel footer:

```
✓ 48 shelves · 6 aisles · 0 outside polygon
✓ 142 / 180 products placed (79%)
⚠ Frozen: no catalog SKUs matched
```

---

## 6. Dashboard rework (DF-06)

### Wireframe (desktop)

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Dashboard                    [ + New layout ]        │
├─────────────────────────────────────────────────────────┤
│  Draft 3  │ In review 2  │ Approved 5  │ Rejected 1    │  ← pipeline
├──────────────────────────┬──────────────────────────────┤
│  Featured layout         │  Quick stats (5 KPIs)       │
│  [mini 2D preview]       │  Util · Shelves · Facings   │
│  Hypermarket A · Approved│                              │
│  [ Open editor ]         │  Space + category chart     │
├──────────────────────────┴──────────────────────────────┤
│  Recent layouts (table/cards with status badges)        │
└─────────────────────────────────────────────────────────┘
```

### API (optional)

```http
GET /analytics/portfolio/summary
→ { layoutCount, byStatus: { draft, in_review, approved, rejected }, ... }
```

If counts are cheap, derive client-side from portfolio list already loaded.

---

## 7. Migration & backwards compatibility

- **Labels:** On layout load, if `aisleNumber` missing, compute once and PATCH (lazy migration).
- **WebGL:** Feature flag default `false` until QA sign-off.
- **Tests:** Golden layouts from demo saved as JSON fixtures under `api/test/fixtures/demo-jul-2026/`.
