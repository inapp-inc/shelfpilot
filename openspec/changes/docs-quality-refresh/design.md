# Design: Documentation quality refresh

## Approach

Docs-only change. Baseline OpenSpec specs become the **single source of truth** for shipped behavior; the LE/AG/ML change deltas are considered folded in. Cross-cutting Docs are corrected to cite one consistent evidence set. Content is staged here for verification, then applied to live paths.

## Documentation standards (adopt going forward)

1. **Single evidence source.** Test count, OpenAPI op count, and stack facts are stated once with a date and must match `npm test` / `npm run openapi:check`. Current: **25 tests · 36 ops · SQLite (durable) · OpenAPI 0.5.0**.
2. **Baseline vs delta rule.** When a change is implemented, its behavior is folded into `openspec/specs/**` (baseline). Change folders remain as history; they are not the live source of truth once implemented.
3. **Status discipline.** Index tables (`Docs/seeds/README.md`, `SEED-UNITS.md`) reflect real status; no "next up" pointing at Done items.
4. **No factual drift.** Persistence, auth, and port facts are copied from code/compose, never restated from memory.
5. **Traceability current.** FSD header lists all contributing changes.

## Baseline spec deltas (staged in this change → `specs/**`)

| Baseline | Change type | Summary |
|----------|-------------|---------|
| `planogram` | MODIFIED + ADDED | Category-gated placement, category+children filter, per-level products, shelf-type default levels |
| `layouts` | MODIFIED + ADDED | Shelves/aisles first-class, polygon draw + strict containment, rules autogenerate |
| `catalog` | ADDED | Product update (`PATCH /products/{id}`) |
| `ui-fidelity` | ADDED | Draw area, Generate, Orbit/Walk 3D, 2D wheel-zoom, per-level planogram |

## Before / after — cross-cutting Docs (apply on approval)

### D5/D11 — `Docs/VALIDATION_REPORT.md`

- **Before:** "Seed scope: SEED-00 … SEED-08"; "5 passed, 0 failed" (2026-07-14).
- **After:** Scope `SEED-00…13 + SEED-LE + SEED-AG + SEED-ML`; evidence "**25 passed / 0 failed**; **36 OpenAPI operations**; SQLite durable (2026-07-15)"; add capability rows: planogram facings, category-gated placement, polygon containment, autogenerate, product CRUD, multi-level planogram, Orbit/Walk 3D.

### D6 — `Docs/HANDOVER.md`

- **Before (§4):** "10 API tests passed; OpenAPI 28 operations verified".
- **Before (§5 table):** "API tests | 5 passed".
- **After (both):** "**25 API tests passed; OpenAPI 36 operations verified (2026-07-15)**". §5 table row → "API tests | 25 passed".

### D7 — `Docs/SEED_INTENT_REVIEW.md`

- **Before (§4):** "In-memory store — data resets on process restart (documented assumption)".
- **After (§4):** "**Durable SQLite** via `SQLITE_PATH`; `:memory:` only under test. Data persists across restarts (Docker volume in compose)."
- **Add section 8:** "Intent review — LE/AG/ML" with GO verdict, listing evidence (25 tests, containment/packer/category-gate/product-CRUD/multi-level coverage) and rollback flags (`LAYOUT_AUTOGENERATE`, `SCENE3D_WALK`, `PLANOGRAM_MULTI_LEVEL_UI`, `PLANOGRAM_EDITOR`).

### D8 — `Docs/seeds/README.md`

- **Before:** "Build order (next up): 1. SEED-00c … 2. SEED-01b … 3. SEED-02"; SEED-LE rows all "Todo"; no AG/ML.
- **After:** Remove stale build order; SEED-LE rows → **Done**; add **SEED-AG-00…06 (Done)** and **SEED-ML-00…05 (Done)** tables; link reuse guide.

### D9 — `Docs/FSD_ShelfPilot.md`

- **Before (§1):** MVP-only summary ("layout editor (canvas, fixtures, aisles, mapping, 2D/3D)").
- **After (§1):** append "…plus draw-area + rules autogenerate, category-gated multi-level planogram, product create/update, and immersive Orbit/Walk 3D (changes LE/AG/ML)."
- **Header Traceability:** list `layout-editor-planogram`, `layout-autogen-walkthrough`, `merch-layers-polygon-fix`.

## Patterns considered

| Pattern | Choice | Rationale |
|---------|--------|-----------|
| Update baseline specs vs keep deltas only | **Update baseline** | Reviewer reads one source of truth |
| Archive change folders now | **Deferred** | Keep readable history; low value in demo |
| Auto-generate index from filesystem | **Deferred** | Manual table sufficient at this size |

## Rollback

Docs-only; revert the doc commits. No runtime impact.
