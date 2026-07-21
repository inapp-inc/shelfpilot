# Design: Layout editor + planogram redesign

## Stack

Demo stack unchanged: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node ≥ 22.5.

## Domain model

```
Layout
  ├── aisles[]          # corridor: widthMeters, path/x/y, optional categoryId/color, aisleId
  ├── shelves[]         # merchandising unit (replaces fixture for planogram)
  │     ├── geometry: x, y, usableWidthMeters, depthMeters, heightMeters, rotationDeg, type
  │     ├── aisleId?    # optional ownership link to an aisle
  │     ├── levels[]    # { levelIndex, heightFromFloorMeters, clearanceMeters }
  │     ├── categoryId, color
  │     └── planogram[] # { levelIndex, productId, facings, maxFacings, positionX }
  ├── fixtures[]        # deprecated/read-compat during migration (mirror of shelves where type was fixture)
  └── mappings[]        # split into aisleMappings + shelfMappings (see OpenAPI)
```

### Facing calculation

```
maxFacings = floor(usableWidthMeters / productWidthMeters)
suggestedLevels = floor(shelfHeightMeters / productHeightMeters)  // when both heights present
facings clamped to [1, maxFacings] on write
```

Product dimensions read from `product.attributes.widthMeters` / `heightMeters` (defaults: width 0.2, height 0.25 if missing — documented assumption).

## API shape (additive)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/layouts/{id}/shelves` | Place shelf |
| PATCH | `/layouts/{id}/shelves/{shelfId}` | Move/resize/config levels |
| POST | `/layouts/{id}/aisles` | Existing; extended body (x,y,categoryId) |
| PATCH | `/layouts/{id}/aisles/{aisleId}` | Move/config aisle space |
| POST | `/layouts/{id}/shelves/{shelfId}/planogram` | Add/update placement |
| DELETE | `/layouts/{id}/shelves/{shelfId}/planogram/{placementId}` | Remove placement |
| GET | `/layouts/{id}/planogram/preview` | Optional: compute maxFacings for product+shelf |

Legacy `POST .../fixtures` remains and maps to shelf with `type` for one SEED transition window.

## UI component split

| Component | Responsibility |
|-----------|----------------|
| `LayoutEditor.jsx` | Shell, selection, tool mode, save orchestration |
| `Canvas2D.jsx` | Grid, DnD drop, aisle + shelf layers |
| `Scene3D.jsx` | Levels + facing boxes, lighting, dispose |
| `Palette.jsx` | Separate Aisle vs Shelf tools |
| `PropertiesPanel.jsx` | Aisle width vs shelf height/levels/usable width |
| `CategoryMappingPanel.jsx` | Independent aisle vs shelf category |
| `PlanogramPanel.jsx` | Product picker, facing preview, add to front |

Brand tokens remain in `styles.css` (`--canvas-wash`, `--floor`, `--crimson`).

## Migration

1. On read: if `shelves` empty and `fixtures` present → synthesize shelves from fixtures.
2. On write (post SEED-LE-00): persist `shelves` + `aisles` + planogram in layout payload JSON.
3. Category mappings: prefer `shelfMappings` / `aisleMappings`; keep `mappings` (fixtureId) as alias during transition.

## Constraints

- Performance: facing calc and 3D remain interactive on integrated GPU; auto-calc p95 unchanged for demo footprints.
- Security: Designer/Admin mutate; Viewer read-only; same mock RBAC.
- Observability: log `planogram_facing_calc` durationMs; keep `auto_calc` logs.
- Rollback: feature flag `PLANOGRAM_EDITOR=0` hides planogram panel and planogram write routes; shelves still editable as fixtures.

## Risks

- Existing demos with only `fixtures` must round-trip via synthesizer.
- Missing product dimensions → defaults may overstate facings; UI must show assumed size.
