# SEED-DR-02 — Cross-cutting doc corrections

**Status:** Done (applied 2026-07-15)

## Goal
Correct factual/stale content and unify evidence numbers (25 tests · 36 ops · SQLite durable).

## Fixes
| Doc | Finding | Change |
|-----|---------|--------|
| `VALIDATION_REPORT.md` | D5, D11 | Scope LE/AG/ML; 25/36/SQLite; capability rows |
| `HANDOVER.md` | D6 | §4 & §5 → 25 tests / 36 ops |
| `SEED_INTENT_REVIEW.md` | D7 | Fix "in-memory" → durable SQLite; add LE/AG/ML GO section |
| `seeds/README.md` | D8 | Real statuses; add AG/ML tables; drop stale build order |
| `FSD_ShelfPilot.md` | D9 | Summary + traceability include AG/ML |

## Acceptance
- Grep finds no "5 passed", "28 operations", or "in-memory store" claims.
