# Reuse guide — Layout editor & planogram stack

**Audience:** Teams adapting ShelfPilot layout/planogram capabilities into another product (warehouse, dark store, showroom, clinic, etc.).  
**Related change:** `openspec/changes/merch-layers-polygon-fix/`

## What is reusable

| Capability | Location | Notes |
|------------|----------|--------|
| Dimension facing math | `codebase/api/src/services/planogramMath.js` | Pure functions; no I/O |
| Polygon containment | `codebase/api/src/services/polygonContainment.js` | Pure geometry |
| Rules packer | `codebase/api/src/services/layoutPacker.js` | Swap Strategy for domain rules |
| Category descendants | `categoryTree.js` / `categoryFilter.js` | Catalog-agnostic |
| Layout editor UI | `codebase/web/src/layout-editor/**` | React; inject `api` + auth |
| 3D Orbit/Walk | `codebase/web/src/Scene3D.jsx` | Three.js |
| Behavior specs | `openspec/specs/**`, change folders | Contract for QA |
| HTTP contract | `Docs/openapi.yaml` (Layouts, Planogram, Catalog) | Versioned surface |

## What is product-specific (replace)

- Verticals, category trees, brand tokens / `ui/ShelfPilot.dc.html`
- Min aisle width and shelf-type templates (`admin/config`)
- Auth (mock → real IdP)
- Persistence (SQLite → Mongo behind repository)
- Packer density/orientation heuristics for the new domain

## Integration steps (recommended)

1. **Copy or package** pure services (`planogramMath`, `polygonContainment`) into a shared workspace package.
2. **Keep OpenAPI** paths for layouts/shelves/planogram; version bumps additive only.
3. **Embed** `LayoutEditor` with props: `token`, `layout`, `categories`, `products`, `config`, callbacks.
4. **Configure** shelf-type → default levels for the new product.
5. **Point** packer Strategy at domain rules (e.g. pallet lanes vs retail aisles).
6. **Validate** with OpenSpec scenarios + containment tests on irregular polygons.
7. **Do not** fork facing formula without updating OpenSpec + OpenAPI descriptions.

## Anti-patterns

- Hard-coding pharmacy categories into the packer
- Skipping containment for “speed”
- Duplicating planogram math in the UI without API preview
- Coupling Scene3D to a single vertical’s colors only (pass mappings as data)

## Demo vs production

This repo’s demo stack (SQLite, mock auth, Compose) is intentional. For production reuse follow `Docs/HANDOVER_PRODUCTION_MIGRATION.md` (IdP, Mongo, HA) while keeping the same OpenAPI/OpenSpec boundaries.
