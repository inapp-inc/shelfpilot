---
name: handover
description: Use at the end of delivery to create a holistic handover pack for downstream teams (BAs, architects, developers, QAs, PMs). Invoked by spec-driven-development at closeout.
---

# Handover

Produce a **handover deliverable** that gives downstream teams a complete view of what was built and how to operate/validate it.

Invoked by **spec-driven-development** after seed-review at delivery closeout.

## Hard enforcement (manual PR operations)

This skill MUST NOT create, open, update, comment on, approve, or merge pull requests.

## Required output

Create:

- `<projectDir>/Docs/HANDOVER.md`

using:

- `.cursor/skills/_resources/handover/HANDOVER-TEMPLATE.md`

## Content requirements

- Delivered outcomes
- Links to OpenSpec specs and change folders
- Link to **`Docs/openapi.yaml`** when APIs exist
- Key design decisions and patterns (chosen vs rejected)
- Evidence summary (tests, CI, screenshots, metrics, contract checks, OWASP)
- Operational notes (config, migrations, telemetry keys)
- QA guidance
- Rollback plan and residual risks
- Deferred work / open questions
