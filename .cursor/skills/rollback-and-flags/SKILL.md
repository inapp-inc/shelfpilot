---
name: rollback-and-flags
description: Use when a SEED Unit requires safe rollout, rollback steps, feature flags/config toggles, or risk mitigation. Invoked by spec-driven-development / seed-unit for non-trivial or risky changes.
---

# Rollback and feature flags

Make changes safe to deploy and easy to revert.

## Core rules

- Every non-trivial SEED Unit MUST include a **risk and rollback** plan.
- Prefer **feature flags** or config toggles for risky behavior changes.
- Rollback MUST be actionable (exact steps).
- **Hard enforcement (manual PR operations):** do not create/update/merge PRs.

## Required outputs

- Explicit “Risks & rollback” on the SEED Unit block
- `design.md` documents risk areas, rollback options (flag off / config / revert), blast radius
