# Handover — ShelfPilot (Lightweight / Local MVP)

**Project:** ShelfPilot  
**Date:** 2026-07-15  
**Owner(s):** Foundry delivery  
**Scope:** Full demo SEED plan SEED-00…13 (`Docs/SEED_PLAN_FULL.md`, `Docs/seeds/`)  
**Status:** Demo build complete — **not production**

> **SEED units:** [seeds/README.md](./seeds/README.md)  
> **Full-phase SEED plan (demo stack):** [SEED_PLAN_FULL.md](./SEED_PLAN_FULL.md)  
> **Production migration (later):** [HANDOVER_PRODUCTION_MIGRATION.md](./HANDOVER_PRODUCTION_MIGRATION.md)

---

## 1) Executive summary (PM / BA)

- **What changed:** Greenfield ShelfPilot UI + API for store layout design (M1–M6), with SQLite persistence and local Docker. Follow-ons: **layout-editor-planogram** (SEED-LE), **layout-autogen-walkthrough** (SEED-AG), **merch-layers-polygon-fix** (SEED-ML) — product CRUD, polygon-tight autogen, 2D wheel zoom, multi-level planogram, reuse guide.
- **Why it matters:** Validates product workflow (canvas, shelves/aisles, planogram facings, immersive 3D, catalog edit, analytics) before production hardening.
- **Out of scope:** POS, inventory, procurement, sensors; real IdP; multi-tenant SaaS; managed Mongo; ERP/CAD; LLM layout AI (see production handover + change proposals).
- **Reuse in another product:** [`Docs/REUSE_LAYOUT_PLANOGRAM.md`](./REUSE_LAYOUT_PLANOGRAM.md)

---

## 2) Specs and contracts

- **OpenSpec:** `openspec/specs/**`, changes `shelfpilot-mvp/`, `layout-editor-planogram/`, `layout-autogen-walkthrough/`, `merch-layers-polygon-fix/`, `docs-quality-refresh/`
- **FSD:** `Docs/FSD_ShelfPilot.md`
- **OpenAPI:** `Docs/openapi.yaml`
- **UI SoT:** `ui/ShelfPilot.dc.html`
- **Local architecture:** `Docs/ARCHITECTURE_LOCAL.md`

---

## 3) What was built

**Capabilities:** Login/RBAC (mock), dashboard + wizard, modular layout editor (draw area, rules autogenerate, aisles/shelves, DnD, category-filtered planogram, 2D / Orbit / Walk 3D), catalog, analytics, admin/config, vertical selector.

**Key decisions:**

- Modular Express API + React SPA  
- SQLite (`node:sqlite`) for local durable store  
- Docker Compose: api + web + volume  
- Mock auth for prototype only  
- Visual parity with `ui/ShelfPilot.dc.html`

**Patterns:** Repository boundary (chosen); Mongo-in-compose Day-1 (rejected for local); microservices-first (rejected).

---

## 4) QA validation guide

**Automated:**

```bash
cd codebase
npm test
npm run openapi:check
npm run seed:demo
# with API up:
npm run smoke:demo
```

**Evidence (2026-07-15):** **25 API tests passed; OpenAPI 36 operations verified**; seed + smoke scripts ship in `codebase/`.

**Manual:** Run `npm run seed:demo` once for full category/product samples · Login → Catalog: add category/product via drawers · Layout editor: Merchandising tab → map category → place by level · draw polygon → generate → 2D/3D.

**Known limitations:** Mock auth; SQLite not multi-instance; demo passwords; no production IdP/Mongo.

---

## 5) Evidence

| Gate | Result |
|------|--------|
| API tests | 25 passed |
| UI checklist | `Docs/VALIDATION_UI_REFERENCE.md` |
| Intent review | `Docs/SEED_INTENT_REVIEW.md` — GO (MVP) |
| OWASP | A06/A07 flagged — see production handover |

---

## 6) Ops notes (local)

| Key | Purpose |
|-----|---------|
| `SQLITE_PATH` | SQLite file (`./data/shelfpilot.db` or `/data/shelfpilot.db`) |
| `PORT` | API port (3000) |
| `NODE_ENV` | development / production |

```bash
cd codebase
docker compose up --build
# http://localhost:8080
```

**Rollback (local):** `docker compose down`; restore volume or delete `shelfpilot_data` to re-seed.

---

## 7) Risks and follow-ups

- Do **not** expose this stack publicly without production migration.  
- Next: follow [HANDOVER_PRODUCTION_MIGRATION.md](./HANDOVER_PRODUCTION_MIGRATION.md) workstreams WS-1…WS-8 / SEED-P01….

---

## Traceability (MVP)

| Spec | AC area | Code | Tests |
|------|---------|------|-------|
| A1 | Auth roles | `api/src/routes/auth.js` | shelfpilot.test.js |
| B–D | Layouts / aisles / fixtures | `routes/layouts.js` | shelfpilot.test.js |
| E | Catalog | `routes/catalog.js` | manual + API |
| F | Mapping / 3D | web `Scene3D.jsx` | mapping test |
| G | Analytics | `routes/analytics.js` | summary test |
| H | Admin config | `routes/admin.js` | pharmacy vs apparel |
