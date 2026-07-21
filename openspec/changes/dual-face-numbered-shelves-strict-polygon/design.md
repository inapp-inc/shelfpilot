# Design: Dual-face numbered shelves + strict drawn area

## 1. Strict polygon canvas

### Problem

Layout stores `widthMeters × depthMeters` bounding box **and** a polygon. Canvas uses the full rectangle; fixtures are clipped but the **grid and empty space** extend beyond the drawn line.

### Solution

```
┌─────────────────────────────────────┐  ← layout rectangle (metadata only)
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← dimmed: not fixture zone
│ ░░┌───────────────────────┐░░░░░░░░░ │
│ ░░│ 12A │ aisle │ 13B   │░░░░░░░░░ │  ← active polygon AABB
│ ░░│     │       │       │░░░░░░░░░ │
│ ░░└───────────────────────┘░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────┘
```

- Compute polygon AABB: `minX, minY, maxX, maxY`.
- Canvas stage size = AABB (not full layout W×D) when `shape === polygon`.
- Translate coordinates: render at `x - minX`, `y - minY`.
- Optional dim overlay for rectangle minus polygon (if rectangle shown).
- Draw tool + generate: only accept clicks inside polygon.

## 2. Dual-face shelf model

```json
{
  "id": "shf-abc123",
  "type": "gondola",
  "displayNumber": 12,
  "doubleSided": true,
  "x": 4.5,
  "y": 2.0,
  "usableWidthMeters": 1.8,
  "depthMeters": 0.9,
  "faces": [
    { "id": "A", "categoryId": "grocery", "color": "#16a34a", "planogram": [] },
    { "id": "B", "categoryId": "chilled", "color": "#0ea5e9", "planogram": [] }
  ],
  "categoryId": "grocery",
  "planogram": []
}
```

**Normalization rules:**

- If `faces` present → `categoryId` = Face A category (legacy readers).
- If only `categoryId` → synthesize single face `{ id: "A", categoryId, planogram }`.
- `doubleSided: false` → one face only; canvas shows `12` not `12A`.

## 3. Canvas shelf badge

**Remove:** `{f.type}`, planogram count.

**Show:**

| Case | Badge |
|------|-------|
| Single-sided | `12` centered, category color fill |
| Double-sided | Left half `12A`, right half `12B` (or top/bottom by orientation) |

**Legend** (editor side rail or canvas footer):

| # | Category |
|---|----------|
| 12A | Grocery |
| 12B | Chilled |

Numbers assigned at autogen **sequentially** in pack order; stable until regenerate.

## 4. Autogen + category mix

Extend smart generate:

1. Pack shelves inside polygon only (existing).
2. Assign `displayNumber` 1…N.
3. For each shelf:
   - **Single-sided** (`shelf`, `rack`): one face, category from mix slot.
   - **Double-sided** (`gondola`, hypermarket defaults): two faces;
     - Default: **same category both faces** (mirrored planogram).
     - Optional mix row `dualCategory: true` → A gets slot N, B gets slot N+1 or paired template.

**Hypermarket default:** gondola rows → `doubleSided: true`.

## 5. Merchandising UI

```
┌─ Merchandising ─────────────────────┐
│ Shelf #12 · Gondola                 │
│ Face: [ A · Grocery ] [ B · Chilled ]│
│ Level: [0] [1] [2]                  │
│ Products: …                         │
└─────────────────────────────────────┘
```

Planogram POST includes `faceId: "A" | "B"`.

## 6. API delta (preview)

- `POST .../planogram` body: optional `faceId` (default `A`).
- Shelf schema: `displayNumber`, `doubleSided`, `faces[]`, `ShelfFace` type.
- OpenAPI **v0.7.0**.

## 7. Component plan

| Component | Change |
|-----------|--------|
| `polygonCanvas.js` (new) | AABB, coord translate, point-in-poly hit test |
| `Canvas2D.jsx` | Strict viewport, numbered badges |
| `MerchandisingPanel.jsx` | Face selector |
| `categoryMixPacker.js` | displayNumber + faces assignment |
| `layoutNormalize.js` | faces synthesis |

## Rollback

- Feature flag `DUAL_FACE_SHELVES=0` → single face, legacy labels optional via `SHELF_TYPE_LABELS=1`.
- Feature flag `STRICT_POLYGON_CANVAS=0` → full rectangle canvas (current).
