---
name: observability
description: Use when a change affects runtime behavior and requires logs/metrics/traces, correlation IDs, dashboards/alerts, or evidence of observability. Invoked by spec-driven-development / seed-unit when runtime telemetry constraints apply.
---

# Observability

Invoked when a SEED Unit or slice changes runtime behavior and needs structured logs, traces, metrics, or correlation IDs.

## Core rules

- Prefer **structured logs** with stable keys.
- Propagate a **correlation ID** through the request/workflow.
- Telemetry for failure paths as well as success.
- Evidence MUST appear in the SEED Unit (or `N/A — <rationale>` under Sprint Mode when truly not applicable).
- **Hard enforcement (manual PR operations):** do not create/update/merge PRs.

## Required outputs

- Update SEED **Evidence required** with telemetry evidence.
- Update OpenSpec deltas if observability is a MUST.
- For higher-risk changes, add operational notes to `design.md` (metrics, log fields incl. correlation_id, spans, alerts).

## Failure modes to avoid

- Logging PII/secrets; happy-path-only telemetry; multi-step flows without correlation IDs
