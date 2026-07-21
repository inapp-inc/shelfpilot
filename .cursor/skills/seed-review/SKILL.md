---
name: seed-review
description: Use to enforce SEED intent review: validate spec deltas first, then risk/rollback, then evidence, then code. Invoked by spec-driven-development before declaring a unit or delivery ready for developer merge.
---

# SEED intent review

Prepare and execute reviews that focus on **intent and evidence**, not syntax.

Invoked by **spec-driven-development** after validation and before handover/merge readiness.

**Manual developer operation:** Creating PRs, requesting reviews, and merging is performed **manually by the developer**.

## Review order

1. **Spec delta** (`openspec/changes/<id>/specs/**/spec.md`) — intent matches desired outcome?
2. **Risk & rollback** (`proposal.md` / `design.md`) — safe to ship and easy to revert?
3. **Evidence** (`tasks.md` + CI + validation harness report) — proves AC?
4. **Code scan** — implementation aligns with the above?
5. **Engineering extras** — if security/perf/observability/rollback skills were invoked, their evidence is present (or N/A rationale).

## Required outputs

- Completed checklist from `.cursor/skills/_resources/seed/INTENT-REVIEW-CHECKLIST.md`
- Statement of missing evidence (if any) and the next gate to satisfy
- Explicit go / no-go for developer merge
