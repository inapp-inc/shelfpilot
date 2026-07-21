# Proposal: Polygon draw → rules autogen → category planogram → 3D walkthrough

## Why

Layouts for irregular floorplates need a **draw-first** workflow: define the store boundary, then **autogenerate** compliant aisles and shelves inside that boundary. Merchandisers then assign a **category per shelf** and place products filtered to that category. Stakeholders need a **walkable 3D** view (zoom / pan / walk) that shows products on shelves—not a static orbit-only preview.

## What changes

1. **Irregular area draw & edit** — Draw/edit polygon floor boundary in the Layout Editor; resize/adjust vertices; layout footprint follows the polygon.
2. **Strict containment** — Aisles and shelves must remain **fully inside** the polygon (generation + move/resize validation). Soft-warn is not enough.
3. **Rules-based autogenerate** (no LLM) — After area is drawn, **Generate aisles & shelves** packs maximum compliant shelves with configured min aisle clearance and density goal: *fit as many compliant shelves as possible*.
4. **Category-bound planogram** — Shelf has one category; product picker lists that category **plus descendant categories** in the tree. Unmapped shelf blocks product placement until a category is set.
5. **Immersive 3D** — Orbit zoom/pan **and** first-person / walk mode through the store; shelf levels and placed products visible.

## Locked decisions

| Topic | Decision |
|-------|----------|
| Autogen intelligence | **A — Rules-based only** (deterministic packer). No LLM in this change. |
| Outside polygon | **Strict clip / reject** — entities cannot sit outside; API returns validation error on PATCH that exits bounds; generate never emits outside. |
| Category zones on generate | **Leave unmapped** — user assigns categories after generate (no auto OTC-near-entrance). |
| Product filter | **Category + all child categories** under the shelf’s `categoryId`. |
| Unmapped shelf + planogram | **Block** until category assigned. |
| Categories per shelf | **One** categoryId. |
| Generate density | Fit as many compliant shelves as possible with min aisle clearance (from vertical config). |
| On re-generate | **Replace** existing aisles/shelves after confirm (manual DnD remains available). |
| Orientation default | Auto from longest polygon axis; optional H/V override in generate dialog. |
| Stack | Demo: React/Vite · Express · SQLite · Docker Compose · Mock auth · Three.js |

## Out of scope

- LLM / “AI” layout suggestions (future change)
- Auto category zoning from entrance heuristics
- CAD/DXF import, photoreal/VR headsets
- ERP/PIM sync
- Exact-category-only filter (can flip later via config)
- Production IdP / Mongo / multi-region HA

## Impact

- OpenSpec change: `openspec/changes/layout-autogen-walkthrough/`
- Spec deltas: layouts, planogram, ui-fidelity (3D walk)
- Contract: `Docs/openapi.yaml` — `POST /layouts/{id}/autogenerate`, containment validation fields
- UI: polygon draw tool, Generate action, walk mode in Scene3D
- API: `layoutPacker` (rules) + polygon containment helpers
- SEEDs: SEED-AG-00 … SEED-AG-06

## User flow (canonical)

```text
Create/open layout
  → Draw or edit irregular floor polygon (adjust size/area)
  → Generate aisles & shelves (rules packer, strict inside polygon)
  → Assign category on each shelf
  → Click shelf → add products (filtered to category + children) with facing calc
  → Walk / zoom 3D to review products on shelves
  → Submit for approval
```

## Parent / related

- Completed: `openspec/changes/layout-editor-planogram/` (SEED-LE)
- Demo MVP: `openspec/changes/shelfpilot-mvp/`
