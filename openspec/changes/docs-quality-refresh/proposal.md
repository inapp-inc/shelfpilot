# Proposal: Documentation quality refresh & consolidation

**Status:** Implemented (2026-07-15)

## Why

Three feature changes are implemented and tested — `layout-editor-planogram` (SEED-LE), `layout-autogen-walkthrough` (SEED-AG), and `merch-layers-polygon-fix` (SEED-ML). The **code and OpenAPI are current**, but several **baseline OpenSpec specs and cross-cutting docs were not kept in sync**, and a few contain **factual errors** (wrong test counts, "in-memory" persistence claim, stale build order). This undermines the docs as a source of truth for reviewers and for teams reusing the stack.

Full findings: [`AUDIT.md`](./AUDIT.md) (11 issues, S1–S3).

## What changes (docs only)

1. **Baseline specs updated** to reflect shipped behavior (source of truth = baseline, change deltas fold in):
   - `planogram` — category-gated placement, category+children filter, per-level products, shelf-type default levels.
   - `layouts` — first-class shelves/aisles, polygon draw + strict containment, rules autogenerate.
   - `catalog` — product create **and update**.
   - `ui-fidelity` — draw area, Generate, Orbit/Walk 3D, 2D wheel-zoom, per-level planogram panel.
2. **Corrected cross-cutting docs** with a single sourced evidence number (**25 tests / 36 OpenAPI ops / SQLite durable**):
   - `Docs/VALIDATION_REPORT.md`, `Docs/HANDOVER.md`, `Docs/SEED_INTENT_REVIEW.md`, `Docs/seeds/README.md`, `Docs/FSD_ShelfPilot.md`.
3. **Doc standards** captured in `design.md` so future changes stay consistent (evidence sourcing, status discipline, baseline-vs-delta rule).

## Explicitly NOT in this change

- No code, API, or behavior changes (docs only).
- No archival/deletion of LE/AG/ML change folders (optional follow-up, D10).
- No new features.

## Verification-first workflow (per your instruction)

This change **stages** the improved content inside this change folder for your review:

- Corrected baseline requirements → `specs/{planogram,layouts,catalog,ui-fidelity}/spec.md` (MODIFIED/ADDED deltas).
- Exact before/after for the non-spec docs → `design.md`.

After you verify, the **"update" step** applies the staged content to the live baseline specs and Docs. Nothing under `Docs/` or `openspec/specs/` is overwritten until then.

## Impact

- New change: `openspec/changes/docs-quality-refresh/`
- SEEDs: SEED-DR-00 … SEED-DR-03 (`Docs/seeds/SEED-DR-*.md`)
- On apply: 4 baseline specs + 5 Docs corrected; 0 code files touched.

## Success criteria

- Every S1/S2 finding in `AUDIT.md` resolved.
- All docs cite the same evidence numbers (25 / 36 / SQLite).
- A reviewer reading only the baseline specs sees current behavior without opening change folders.
