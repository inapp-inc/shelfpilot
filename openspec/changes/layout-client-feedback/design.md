# Design: Layout client feedback

## 1. Store envelope vs fixture polygon (CF-01)

### Data model

```js
// Layout (additive fields)
{
  widthMeters: 20,      // store envelope width (persist on create; not overwritten by polygon AABB only)
  depthMeters: 15,
  shape: "polygon",
  polygon: [...],       // fixture zone — shelves/aisles must stay inside
  storeEnvelope: {      // optional explicit outer rect; defaults to initial width×depth at origin
    x: 0, y: 0,
    widthMeters: 20,
    depthMeters: 15,
  },
}
```

**Apply area behaviour change:**

- Current: `widthMeters`/`depthMeters` ← polygon AABB only.
- New: `polygon` ← drawn vertices; **do not shrink** `storeEnvelope`; set `widthMeters`/`depthMeters` to envelope (or max of envelope and AABB for backward compat).
- Canvas: render `storeEnvelope` rect with **slate/blue-grey dashed** border + light fill; render `polygon` with **crimson** fixture styling (existing).

```jsx
// Canvas2D — two SVG layers
<rect className="store-envelope" ... />   // full store
<polygon className="fixture-zone" ... />  // drawable area
```

## 2. Autogen containment + fixture types (CF-02)

### Packer hardening

- After `packAislesAndShelves`, filter shelves/aisles with `entityInsideLayout`; increment `skippedOutsideCount`; never append failing entities.
- Autogen response toast: `0 outside` or warn if any skipped.

### Category → fixture type

Extend Smart Generate `categoryMix` entries:

```js
{ categoryId, percent, temperatureZone, fixtureType: "storage" | "shelf" | "gondola" | "rack" }
```

Default mapping table in `categoryFixtureDefaults.js` (vertical-aware):

| Category pattern | Default type |
|------------------|--------------|
| fresh-produce, hm-fresh, veg* | storage |
| chilled, frozen | shelf (temp zone tagged) |
| default grocery | gondola |
| fallback | shelf |

Packer `makeShelf(type, ...)` uses template dimensions from `FIXTURE_TYPES[type]`.

## 3. Viewport-fit + focus zoom (CF-03)

### Layout CSS

```css
.editor-layout {
  height: calc(100vh - var(--editor-chrome, 180px));
  min-height: 0;
  overflow: hidden;
}
.props-col { max-height: 100%; overflow: hidden; }
.editor-rail-body { flex: 1; min-height: 0; overflow-y: auto; }
.canvas-stage { flex: 1; min-height: 0; max-height: 100%; }
```

### Fit-to-view

On layout open + after Apply: compute `scale` so floor plan fits `canvas-stage` client box (reuse zoom logic; set `zoom` to fitScale).

### Focus dropdown

```jsx
<select onChange={(catId) => focusCategory(catId)}>
  <option value="">Focus…</option>
  <option value="__selection__">Current selection</option>
  {mappedCategories.map(...)}
</select>
```

`focusBounds(categoryId)` → union AABB of shelves/aisles with that category mapping (+ padding); adjust `scrollLeft/scrollTop` and `zoom` to frame.

## 4. Shelf name in Properties (CF-04)

`PropertiesPanel.jsx` — shelf branch:

- Editable `label` or `name` field (PATCH `label`).
- Read-only: `#displayNumber`, type, W×D×H, rotation.

## 5. Tab alignment (CF-05)

- Move `.editor-rail-tabs` outside scroll container (already sibling of `.editor-rail-body`; verify).
- Set `flex-shrink: 0` on tabs; `merch-panel` max-width 100%; fix button wrap causing horizontal overflow.
- Remove duplicate padding causing tab strip shift between tabs.

## 6. Editable polygon (CF-06)

Modes:

- `draw` — add vertices (existing).
- `edit-area` — select vertex (circles), drag to move; edge midpoints insert vertex on double-click; Delete vertex if ≥4 points.

Persist via PATCH layout `polygon` (Designer/Admin); validate with `validatePolygonRing`.

Reuse resize handle patterns from zone resize in `Canvas2D.jsx`.

## 7. Review workflow (CF-07)

### API fields (Layout)

```js
{
  status: "draft" | "in_review" | "approved" | "rejected",
  reviewComment: string | null,      // set on reject; cleared on resubmit
  reviewedAt: ISO string | null,
  reviewedBy: string | null,           // email
  lastSubmittedAt: ISO string | null,
  contentRevision: number,           // increment on any layout mutation except status-only approve/reject metadata
}
```

### Dirty / gating rules

| Button | Visible when |
|--------|----------------|
| Submit for review | `(draft \|\| rejected) && role Designer/Admin` OR `(in_review && contentRevision > submittedRevision)` — simpler: **`canSubmit = draft \|\| rejected \|\| (in_review && dirtySinceSubmit)`** → client wants hide after submit: **`status === draft \|\| status === rejected \|\| dirtySinceSubmit`** where dirtySinceSubmit = `contentRevision > submittedRevision` |
| Approve / Reject | `status === in_review && role Approver/Admin` AND layout not already approved/rejected for current submission |

On **Submit for review**: `status → in_review`, save version snapshot, `submittedRevision = contentRevision`, clear `reviewComment`.

On **Reject**: modal → require `reviewComment`, `status → rejected`, record reviewer.

On **Approve**: `status → approved`, clear comment optional, record reviewer.

On **any layout mutation** (shelves, polygon, mappings): `contentRevision++` (server-side in `saveNormalized`).

Designer UI: banner when `rejected` showing `reviewComment`.

### OpenAPI

- PATCH layout body: optional `reviewComment` (reject flow only via dedicated endpoint preferred).
- `POST /layouts/{id}/review/reject` `{ comment }` and `POST .../review/approve` cleaner than overloading PATCH.

**Recommendation:** add `POST /layouts/{layoutId}/review/submit`, `/approve`, `/reject` for explicit workflow.

## Security / performance / observability

| Area | Disposition |
|------|-------------|
| Security | Review comments sanitized; approver RBAC unchanged — **N/A beyond existing** |
| Performance | Focus zoom is client-only — **N/A** |
| Observability | Audit log `layout.review.reject` with comment length — optional |
| Rollback | New fields optional; envelope defaults to current rectangle behaviour |
