# Proposal: Product CRUD · polygon-tight autogen · 2D zoom · multi-layer planogram

## Why

Merchandisers need to **add and update products** in-app (not mock toasts). Autogenerate currently can place aisles/shelves that **visually overflow** the drawn irregular area (AABB packing / aisle length mismatch). The 2D canvas needs **mouse-wheel zoom**. Shelves already have **multiple levels**—each level must support **different products**, with level counts/templates driven by **shelf type**. This change also documents how to **reuse** the layout/planogram stack in another product.

## What changes

1. **Product create & update** — Catalog UI: add product form + edit existing (name, SKU, category, dimensions attributes). API: ensure `POST /products` + additive `PATCH /products/{productId}`.
2. **Polygon-tight autogen (bugfix)** — Packer and aisle footprints must stay **strictly inside the drawn polygon** (not merely the bounding box). Clip aisle segments; drop any entity that fails containment; align 2D rendering with `lengthMeters` / footprint used by the API.
3. **2D mouse zoom** — Wheel (and optional Ctrl+wheel) zooms the floor plan toward cursor; pan remains via existing patterns where applicable.
4. **Multi-layer planogram** — Select shelf **level**; place different products per level; facing calc per level; shelf **type** (shelf / gondola / rack / endcap) drives default level count and optional per-type level templates.
5. **Reuse guide** — Document extractable modules and integration steps for another Foundry/vertical product.

## Locked decisions (defaults — correct on approve if needed)

| Topic | Decision |
|-------|----------|
| Product CRUD roles | Designer + Admin create/update; Viewer read-only |
| Dimensions on product | `attributes.widthMeters` / `heightMeters` editable in form |
| Overflow fix | Tighten packer to **drawn polygon**; post-generate containment audit; never emit outside |
| Aisle geometry | Persist and render `lengthMeters` clipped to polygon |
| 2D zoom | Mouse wheel toward pointer; zoom range ~60%–180% (existing meter-bar buttons remain) |
| Levels | User picks `levelIndex` when placing; multiple products allowed per level (facings share width) |
| Shelf type → levels | Type templates in config: e.g. `shelf`→2 levels, `gondola`→3, `rack`→4 (demo defaults) |
| Category filter | Unchanged: shelf category + children; still required before place |
| Stack | Demo stack unchanged |

## Out of scope

- LLM layout / category AI
- Full bay/slot CAD grid
- ERP/PIM sync
- Delete product (soft-delete later)
- Production IdP / Mongo

## Impact

- OpenSpec: `openspec/changes/merch-layers-polygon-fix/`
- Specs: catalog, layouts, planogram, ui-fidelity
- OpenAPI: `PATCH /products/{productId}`; planogram level UX notes; optional shelf type level templates on config
- UI: Catalog forms; Canvas2D wheel zoom; PlanogramPanel level selector; packer fix
- Docs: `Docs/REUSE_LAYOUT_PLANOGRAM.md` (+ FSD / SEED plan)
- SEEDs: SEED-ML-00 … SEED-ML-05

## Canonical flow (updated)

```text
Draw / adjust floor polygon
  → Generate (entities stay inside drawn area)
  → Assign shelf category (+ shelf type / levels)
  → Per level: place different products (filtered)
  → Add/update catalog products as needed
  → 2D wheel zoom · 3D Orbit/Walk review
```

## Reuse (summary)

Portable pieces for another product (warehouse, showroom, dark-store, etc.):

| Module | Path | Reuse as |
|--------|------|----------|
| Facing math | `api/src/services/planogramMath.js` | Shared npm/workspace package or copy |
| Polygon containment | `api/src/services/polygonContainment.js` | Same |
| Rules packer | `api/src/services/layoutPacker.js` | Strategy plugin per domain |
| Category tree filter | `api/.../categoryTree.js` + web `categoryFilter.js` | Catalog-agnostic |
| Layout editor UI | `web/src/layout-editor/**` | Embed as micro-frontend or package |
| Contracts | `Docs/openapi.yaml` planogram + layouts paths | Versioned API surface |
| OpenSpec | `openspec/specs/planogram`, `layouts` | Behavior SoT for new vertical |

**How to reuse:** (1) keep OpenAPI + OpenSpec as contract, (2) swap vertical config/templates, (3) point packer Strategy at domain rules, (4) embed `layout-editor` with auth/token adapter, (5) keep SQLite→Mongo behind repository boundary. Full steps: `Docs/REUSE_LAYOUT_PLANOGRAM.md`.

## Parent / related

- `openspec/changes/layout-autogen-walkthrough/` (SEED-AG)
- `openspec/changes/layout-editor-planogram/` (SEED-LE)
