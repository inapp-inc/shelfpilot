# Recheck Audit — ShelfPilot documentation

**Change:** `docs-quality-refresh`
**Date:** 2026-07-15
**Reviewer:** SDD agent (high-thinking pass)
**Scope of recheck:** all docs touched by the three implemented changes — `layout-editor-planogram` (SEED-LE), `layout-autogen-walkthrough` (SEED-AG), `merch-layers-polygon-fix` (SEED-ML) — plus baseline OpenSpec specs and cross-cutting Docs.

## Verified ground truth (from code + last runs)

| Fact | Value | Source |
|------|-------|--------|
| API tests | **25 passed / 0 failed** | `npm test` (2026-07-15) |
| OpenAPI operations | **36 verified** | `npm run openapi:check` |
| OpenAPI version | **0.5.0** | `Docs/openapi.yaml` |
| Persistence | **SQLite (durable file / `:memory:` only in tests)** | `api/src/store/sqlite.js` |
| Implemented changes | LE-00…07, AG-00…06, ML-00…05 | change `tasks.md` files |

These values are the corrected reference numbers used throughout the refreshed docs.

## Findings

Severity: **S1** = factually wrong / misleading · **S2** = stale (contradicts shipped state) · **S3** = incomplete / cosmetic.

| ID | Sev | File | Issue | Fix |
|----|-----|------|-------|-----|
| D1 | S2 | `openspec/specs/planogram/spec.md` | Says "until that change is archived, prefer the delta"; only 2 requirements. Missing category-gating (`shelf_category_required`), category+children filter, per-level placement, shelf-type default levels — all shipped. | Fold LE+AG+ML behavior into baseline (see `specs/planogram/spec.md` delta). |
| D2 | S2 | `openspec/specs/layouts/spec.md` | Fixtures-first; "Delta" note points only to `layout-editor-planogram`. No polygon containment, autogenerate, or tight-polygon behavior. | Modify baseline to shelves/aisles first-class + containment + autogenerate. |
| D3 | S2 | `openspec/specs/catalog/spec.md` | No product **update** requirement though `PATCH /products/{id}` shipped (ML-00). | Add product-update requirement. |
| D4 | S3 | `openspec/specs/ui-fidelity/spec.md` | Editor described as fixture palette + 2D only. No draw-area, Generate, Orbit/Walk 3D, 2D wheel-zoom, per-level planogram. | Add UI requirements for the shipped editor. |
| D5 | S1 | `Docs/VALIDATION_REPORT.md` | "5 passed", "SEED-00 … SEED-08", dated 2026-07-14. Contradicts 25 tests / 36 ops and the LE/AG/ML capabilities. | Rewrite with current evidence + capability matrix. |
| D6 | S1 | `Docs/HANDOVER.md` | Internal contradiction: §4 "10 API tests passed; OpenAPI 28 operations" vs §5 table "API tests | 5 passed". Both wrong now. | Single sourced number: 25 tests / 36 ops. |
| D7 | S1 | `Docs/SEED_INTENT_REVIEW.md` | "In-memory store — data resets on process restart" — false; stack is durable SQLite. Also only reviews shelfpilot-mvp, no LE/AG/ML intent review. | Correct persistence statement; add LE/AG/ML intent section. |
| D8 | S2 | `Docs/seeds/README.md` | "Build order (next up): SEED-00c…" (all Done); SEED-LE all "Todo"; **no SEED-AG or SEED-ML tables**. | Regenerate index with correct statuses + AG/ML rows. |
| D9 | S3 | `Docs/FSD_ShelfPilot.md` | §1 Executive Summary still describes MVP-only scope; header Traceability line points only to `layout-editor-planogram`. Epics F3/F4 exist further down but summary is out of sync. | Update summary + traceability to include AG/ML. |
| D10 | S3 | OpenSpec hygiene | LE/AG/ML changes implemented but not archived; baseline specs not updated, so "source of truth" is ambiguous (baseline vs change delta). | This change updates baselines; archival optional follow-up. |
| D11 | S3 | `Docs/VALIDATION_REPORT.md` | "Seed scope SEED-00 … SEED-08" but MVP delivered through SEED-13. | Correct scope line. |

## Non-issues (verified correct, no change)

- `Docs/openapi.yaml` — 36 ops, version 0.5.0, `PATCH /products/{productId}` present. Correct.
- `Docs/REUSE_LAYOUT_PLANOGRAM.md` — accurate to current module paths.
- Change `tasks.md` for LE/AG/ML — correctly marked implemented with evidence.
- SEED-LE / SEED-AG / SEED-ML unit files — statuses Done, consistent.

## Recommendation

Apply the refreshed baseline specs (D1–D4) and corrected cross-cutting docs (D5–D9, D11) in one documentation pass. Treat D10 (archival) as an optional follow-up so the change-folder history stays readable.
