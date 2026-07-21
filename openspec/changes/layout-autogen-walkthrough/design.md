# Design: Polygon autogen + category planogram + 3D walkthrough

## Platform-fit

Demo stack inherits prior ShelfPilot local decisions (SQLite, mock auth, Compose). No ADR-0017 exception. Production Mongo/IdP remain out of scope.

## Patterns considered

| Pattern | Choice | Rationale |
|---------|--------|-----------|
| Strategy | **Chosen** — `LayoutPacker` strategy (parallel rows); future packers pluggable | Autogen without LLM |
| Repository | **Chosen** — persist via existing layout repo | Unchanged boundary |
| Factory | **Chosen** — generate aisle/shelf IDs + default levels | Consistent entity shape |
| CQRS | **Rejected** | Overkill for demo |
| Event sourcing | **Rejected** | Replace-on-regenerate is enough |
| Client-only pack | **Rejected** — pack on API so validation/AC shared | Single source of truth |

## Domain additions

```
Layout
  shape: rectangle | polygon
  polygon: [{x,y}, ...]   # meters; closed ring; CCW preferred
  validation.containmentViolations[]  # aisle/shelf ids outside polygon
  aisles[] / shelves[]    # must be strictly inside polygon (AABB or footprint ⊆ polygon)
```

### Containment

- Point-in-polygon + rectangle/aisle footprint corners must all be inside (or on boundary).
- Generate: only emit entities that pass.
- PATCH move/resize: if outside → `400 containment_violation` (strict).

### Rules packer (`layoutPacker`)

Inputs:

- `polygon` (or rectangle bounds as 4-point polygon)
- `minAisleWidthMeters` (config)
- `shelfTemplate` (usableWidth, depth, height, default levels)
- `orientation`: `auto` | `horizontal` | `vertical`
- `replaceExisting`: boolean (UI always confirms when true and content exists)

Algorithm (v1 — parallel rows):

1. Compute axis-aligned bounding box (AABB) of polygon; choose primary aisle direction from longest AABB edge when `auto`.
2. Lay corridor strips of width `minAisleWidthMeters` alternating with shelf rows of depth `shelf.depthMeters`.
3. Along each shelf row, place as many shelves of `usableWidthMeters` as fit with small gap; **clip/drop** any shelf whose footprint is not fully inside polygon.
4. Emit aisle entities for corridor strips that intersect the polygon (clipped segments approximated as AABB aisles with x,y,width).
5. Leave `categoryId` null on all generated shelves/aisles.
6. Log `autogenerate` with counts + durationMs.

Density goal: maximize shelf count under min aisle clearance and containment.

### Category-filtered products

- Shelf has single `categoryId`.
- Product list for planogram = products whose `categoryId` is the shelf category **or any descendant** in the category tree for that vertical.
- If shelf `categoryId` is null → UI disables Add; API planogram POST returns `400 shelf_category_required`.

### 3D walkthrough

| Mode | Controls |
|------|----------|
| Orbit (default) | Scroll zoom, drag orbit, pan |
| Walk | WASD / arrows move on floor plane; mouse look; Esc exits; collision soft-clamp to polygon AABB (demo) |

Render: aisles, shelf frames + levels, planogram facing boxes colored by product/category. Products visible as facing meshes (same as LE-06, denser labels optional).

Libraries: `three` + `OrbitControls` + simple first-person controller (no external game engine).

## API (additive)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/layouts/{layoutId}/autogenerate` | Rules pack; body: orientation, replaceExisting, optional template overrides |
| PATCH | `/layouts/{layoutId}` | Already supports polygon; enforce re-validate containment after polygon edit |
| POST | `/layouts/{id}/shelves/{shelfId}/planogram` | Add `shelf_category_required` when unmapped |

Response of autogenerate: full layout + `{ generated: { aisles, shelves }, replaced: boolean }`.

## UI

| Surface | Behavior |
|---------|----------|
| Palette tool **Draw area** | Click vertices; close polygon; edit handles; “Apply area” |
| **Generate** button | Dialog: orientation, density note, Replace confirm |
| Properties / Planogram | Category required; product select filtered to category+children |
| 3D toggle | Orbit \| Walk |

## Feature flags / rollback

- Flag `LAYOUT_AUTOGENERATE` (default on in demo).
- Flag `SCENE3D_WALK` (default on).
- Rollback: disable flags; polygon edit and manual DnD remain.

## Observability

- Log `layout_autogenerate` { layoutId, shelfCount, aisleCount, durationMs }.
- Log `containment_violation` on rejected PATCH.

## Performance

- Packer target p95 &lt; 200ms for polygons ≤ 32 vertices, store ≤ 2000 m².
- 3D walk 30fps target on integrated GPU for ≤ 200 shelves / ≤ 500 facing meshes (LOD: merge facings if over budget).

## Security

- Autogenerate: Designer/Admin only.
- Validate polygon ring (≥ 3 points, finite numbers, max 64 vertices demo).
