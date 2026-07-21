---
name: performance-engineering
description: Use when a SEED Unit includes performance constraints (latency/throughput/p95/p99, large datasets, UI responsiveness). Invoked by spec-driven-development / seed-unit when performance constraints apply.
---

# Performance engineering

Convert performance constraints into **explicit budgets** and measurable evidence.

## Core rules

- Budgets: p50/p95/p99, throughput, payload size — not vibes.
- Evidence: benchmarks, profiling, load tests, or targeted measurements mapped to budgets.
- Missing budgets must be called out; under Sprint Mode use `N/A — <rationale>` only when performance is truly out of scope for the unit.
- **Hard enforcement (manual PR operations):** do not create/update/merge PRs.

## Required outputs

- OpenSpec deltas for new performance MUST/SHALL requirements
- Performance evidence on the SEED Unit block (commands, metrics, environment)
- Short performance notes in `design.md` when constraints exist
