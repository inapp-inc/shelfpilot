# ShelfPilot — Technical Pitch (1 Page)

**Tagline:** Browser-based store layout design, planogram, and space analytics for retail verticals.

---

## Problem → Solution

| Retail teams need | ShelfPilot provides |
|-------------------|---------------------|
| Accurate floor plans with compliance (aisle width, containment) | 2D canvas + polygon store shapes + validation engine |
| Category → shelf → SKU mapping at scale | Planogram editor with level/position splits, storage-type filtering |
| Utilization & rollout visibility before build-out | Dashboard analytics (M9 metrics), RBAC, approval workflow |

---

## Stack

| Layer | Technology |
|-------|------------|
| **Web** | React 18, Vite, Three.js (WebGL 3D), CSS design tokens |
| **API** | Node.js ≥ 22.5, Express, OpenAPI contract (`Docs/openapi.yaml`) |
| **Data** | SQLite (`node:sqlite`) — local/Demo; repository boundary for cloud DB swap |
| **Deploy** | Docker Compose (nginx + API), optional bare-metal dev |

---

## Core Modules

| Module | Technical capability |
|--------|----------------------|
| **Layouts** | Fixtures, aisles, zones, entry points; autogen packer; version snapshots on review |
| **Planogram** | Per-level segment splits, facings/depth preview API, drag-from-catalog placement |
| **Catalog** | Hierarchical categories, product dims (inches UI / meters engine), storage temp tags |
| **Analytics** | Layout + portfolio summaries; widget board; drill-down to editor/layouts |
| **Admin** | Store config, fixture templates, users/roles, audit log |

---

## Architecture (simplified)

```
Browser (React SPA)
    ↓ REST + session token
Express API ──→ SQLite (layouts, catalog, audit)
    ↓
Services: layoutNormalize · aisleBinding · categoryMixPacker · planogram facings · analytics
```

- **Units:** Engine stores meters/m²; UI displays inches and sq ft.
- **RBAC:** Designer / Approver / Viewer / Admin — nav, edit, and widget visibility enforced client + API.
- **Multi-vertical:** Retail, hypermarket, pharmacy, convenience, etc. via config + category trees.

---

## Technical Differentiators

1. **2D ↔ 3D parity** — Planogram placements render on WebGL shelves; aisle-centric shelf labels (`9A`, `9B`).
2. **Rules-first autogen** — Category mix %, temperature zones (ambient/chilled/frozen), orientation-aware aisle binding.
3. **Spec-driven delivery** — OpenSpec + SEED units; traceable acceptance criteria and rollback notes.
4. **Import/export** — Excel/CSV catalog, JSON layout export, product image sync pipeline.

---

## Demo / Ops

```bash
cd codebase && docker compose up --build   # http://localhost:8080
npm run seed:demo && npm run smoke:demo  # catalog + layouts smoke test
```

**Contract:** `Docs/openapi.yaml` · **UI reference:** `ui/ShelfPilot.dc.html`

---

*ShelfPilot — design the shelf before you build the store.*
