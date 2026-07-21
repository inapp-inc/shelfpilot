---
name: seed-unit
description: Use to break work into SEED Units (small PR-sized deliverables) with explicit scope, constraints, acceptance criteria, evidence, and rollback. Produces SEED Unit artifacts and ties them to OpenSpec change folders. Invoked by spec-driven-development after architecture.
---

# SEED Unit

Convert work into **AI-executable SEED Units**: small, independently shippable PR-sized slices with explicit outcomes and required evidence.

**When:** After architecture/design (platform-fit, OpenAPI, container plan decided). Invoked by **spec-driven-development**.

## Core rules

- Each SEED Unit MUST have: **goal**, **scope**, **constraints**, **acceptance criteria**, **evidence required**, **risks & rollback**, and a **spec link** (OpenSpec path).
- Keep units small enough for a single PR — except the **bootstrap exemption** below.
- **Bootstrap exemption:** First greenfield unit (repo/container setup) may exceed single-PR size. Job: **invoke scaffold** (clone starter after platform-fit), then diverge — not generate scaffolding from nothing.
- No hidden work: required work appears in AC and/or tasks.
- Under **Sprint Mode**, compress unit count/granularity; security / performance / observability MUST be filled or `N/A — <rationale>`.
- **PR operations are manual.**

## Invoke engineering skills when constraints apply

| Constraint | Invoke |
|------------|--------|
| Authn/authz, tenant isolation, validation, secrets, OWASP | **security-engineering** |
| Latency/throughput budgets, large data, UI responsiveness | **performance-engineering** |
| Runtime behavior needing logs/metrics/traces | **observability** |
| Risky rollout / flag / revert | **rollback-and-flags** |

List invoked skills in the SEED Unit block.

## Required outputs

- SEED Unit block from `.cursor/skills/_resources/seed/SEED-UNIT-TEMPLATE.md`
- OpenSpec change folder: `<projectDir>/openspec/changes/<seed-id>/{proposal.md,design.md,tasks.md,specs/**/spec.md}`

## Engineering checklist (intent-first)

Before implementation: OpenSpec delta exists; AC measurable; constraints explicit; evidence listed; rollback actionable; security/perf/observability filled or N/A.

Use `.cursor/skills/_resources/seed/INTENT-REVIEW-CHECKLIST.md`.

## Dispatch / collection harness

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "<projectDir>/openspec/changes/<seed-id>/tasks.md"
```

Prepares scoped prompts and a status table. Does **not** replace seed-review judgment or launch agents automatically.
