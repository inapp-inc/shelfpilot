---
name: spec-driven-development
description: Use when the user wants work executed through a spec-driven development process. This skill coordinates requirement gathering, architecture, coding, testing, SEED, engineering, and handover skills so implementation follows an explicit spec, changes map back to approved requirements, and validation proves the delivered behavior matches the spec.
---

# Spec-Driven Development

Use this skill as the **orchestration layer** for spec-driven delivery. It is the **master** that drives all other skills.

**Shared resources** live under `.cursor/skills/_resources/`.

## Skills this orchestrator invokes

| Stage | Invoke |
|-------|--------|
| Requirements / FSD | **requirements** |
| Design / platform-fit / OpenAPI / containers | **architecture** (+ **scaffold** for greenfield bootstrap after design) |
| SEED planning | **seed-unit** (+ **security-engineering** / **performance-engineering** / **observability** / **rollback-and-flags** when constraints apply) |
| Implementation | **coding** |
| Validation | **testing** (+ validation harness) |
| Intent review | **seed-review** |
| Closeout | **handover** |

## Core Rules

- Do not start implementation until there is a written spec or a clearly bounded delta to an existing spec.
- Treat ambiguity as a requirements problem first, not a coding problem.
- Keep a visible mapping from spec items to code changes and tests.
- Prefer small spec slices that can be implemented and validated independently.
- If the user asks to skip a stage, comply only after stating the risk briefly.
- **PR operations are manual:** Creating PRs, updating PR descriptions, requesting reviews, and merging are performed **manually by the developer**. This skill defines artifacts, review checkpoints, and required evidence only.
- **Stage-gated delivery:** After each stage’s deliverables are produced, **stop and wait for user review/approval** before starting the next stage.
- **Canonical OpenAPI path:** `<projectDir>/Docs/openapi.yaml` (or `.json`). Always edit the OpenAPI file before changing API shapes.

## Review Checkpoints (Hard Stops)

- **After requirements:** gaps JSON finalized (`"status": "Complete"` **and** `reviewedBy` / `reviewedAt` set), generated docs exist (`Docs/SDD_Gaps_*.md`), assumptions doc if needed.
- **After spec:** FSD (or spec delta) ready for review.
- **After design:** OpenSpec change folder + `Docs/openapi.yaml` (if APIs) + container/scaffold plan ready for review.
- **After SEED planning:** SEED Units defined with AC, evidence, rollback, OpenSpec links.
- **After UI prompt:** `Discovery and Design/FigmaMake_UI_Prompt.txt` ready for review.
- **After each implementation slice:** code ready for review.
- **After validation:** test/validation report ready for review.
- **After seed-review:** intent checklist completed; missing evidence called out.
- **After handover:** `<projectDir>/Docs/HANDOVER.md` exists.

## Required Outputs

- Gaps questionnaire JSON + generated Markdown (see requirements skill)
- Project layout: `<projectDir>/{Discovery and Design, Docs, codebase}/`
- FSD (or delta) — template: `.cursor/skills/_resources/requirement-skill/fsd-template.md`
- OpenSpec library:
  - Source of truth: `<projectDir>/openspec/specs/**/spec.md`
  - Changes: `<projectDir>/openspec/changes/<change-id>/{proposal.md,design.md,tasks.md,specs/**/spec.md}`
- **OpenAPI:** `<projectDir>/Docs/openapi.yaml` when APIs are involved
- Container scaffold (greenfield / deployable): via **scaffold** skill (Dockerfile, compose)
- SEED Unit blocks + evidence — templates under `.cursor/skills/_resources/seed/`
- Validation evidence (tests, contract shape check, OWASP attestation)
- Handover: `<projectDir>/Docs/HANDOVER.md`

## Workflow

### 1. Requirement analysis and establish the spec

If no usable spec exists, **invoke the requirements skill**.

- **Project root:** `<projectDir>` is the current project's root folder (the repo root you are working in).
- Create layout + gaps JSON via CLI under `.cursor/skills/_resources/requirement-skill/gaps-questionnaire/`.
- Stakeholders fill the JSON. **Completion gate (all required):**
  1. Top-level `"status": "Complete"`
  2. `"reviewedBy"` set to the reviewing stakeholder’s name/initials
  3. `"reviewedAt"` set to an ISO date (`YYYY-MM-DD`)
- Generate Markdown (`generate-gap-md.mjs`) and assumptions if needed (`generate-assumptions-md.mjs`).

**STOP for review.** Then draft/update the FSD from the filled questionnaire.

**STOP for review** before design.

A usable spec must define: problem statement, goals, scope and non-goals, functional requirements, constraints, acceptance criteria.

### 1a. Establish or update OpenSpec specs

After the FSD (or when a usable spec already exists), create/update:

- `<projectDir>/openspec/config.yaml`
- `<projectDir>/openspec/specs/**/spec.md` (Purpose + Requirements with RFC 2119 + Given/When/Then scenarios)

CLI when available: `openspec init` / `openspec new change <change-id>`; manual creation of the same structure is always acceptable.

### 2. Normalize the implementation target

Rewrite the work into: what will change, what will not, what success looks like, what evidence proves success. Spec wins over conflicting current behavior once confirmed.

### 3. Drive architecture and design (before SEED slicing)

**Invoke the architecture skill** when the spec affects boundaries, data contracts, APIs, persistence, concurrency, security, performance-sensitive paths, or cross-team behavior. For greenfield, always invoke architecture for the Day-1 platform-fit gate.

**Design obligations:**

- Day-1 **platform-fit** (ADR-0001–0016 as-is vs ADR-0017 exception) — record in `design.md`
- Patterns library: `.cursor/skills/_resources/architecture-patterns/ARCHITECTURE-AND-DESIGN-PATTERNS.md` — chosen vs rejected
- **OpenAPI** at `<projectDir>/Docs/openapi.yaml`
- **Container plan:** for greenfield, plan to use **scaffold** (do not invent Docker/layout from a prompt)
- ADRs: `.cursor/skills/_resources/architecture-adr/`

**Design-phase OpenSpec output:**

- `<projectDir>/openspec/changes/<change-id>/{proposal.md,design.md,tasks.md,specs/**/spec.md}`

**STOP for review** before SEED planning / implementation.

### 4. Convert the work into SEED Units

**Invoke the seed-unit skill** after architecture (so units can link to real design/OpenAPI/scaffold decisions).

For each unit: goal, scope, constraints, AC, evidence, risks & rollback, OpenSpec link.

**Invoke engineering skills when constraints apply:**

| Constraint present | Invoke |
|--------------------|--------|
| Authn/authz, tenant isolation, input validation, secrets, OWASP | **security-engineering** |
| Latency/throughput/p95/p99, large data, UI responsiveness | **performance-engineering** |
| Runtime behavior change needing logs/metrics/traces | **observability** |
| Risky rollout / need flag or revert plan | **rollback-and-flags** |

If a constraint does not apply (especially under Sprint Mode), record `N/A — <rationale>` — never omit silently.

**Greenfield bootstrap unit:** invoke **scaffold** (clone starter, then diverge). Exempt from single-PR sizing.

**STOP for review** before implementation.

Optional dispatch bookkeeping:

```bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "<projectDir>/openspec/changes/<seed-id>/tasks.md"
```

### 5. Pre-development UI prompt

Before coding user-facing UI:

```bash
node .cursor/skills/_resources/requirement-skill/gaps-questionnaire/generate-figma-make-prompt.mjs --projectDir "<projectDir>"
```

Saves `Discovery and Design/FigmaMake_UI_Prompt.txt` (max 4950 characters).

**STOP for review.**

### 6. Implement against the spec

**Invoke the coding skill** with the approved SEED slice (stack must match ADR-0001 or accepted exception).

- APIs: implement against `<projectDir>/Docs/openapi.yaml`; edit OpenAPI first if the contract must change.
- Stay in approved scope; surface spec gaps; pause and update spec when wrong/incomplete.

### 7. Validate against acceptance criteria

**Invoke the testing skill** after each meaningful slice (or before handoff).

Cover: AC, regressions, edge cases, non-goals, NFRs, and OpenAPI contract checks.

Prefer the validation harness:

```bash
node .cursor/skills/_resources/harness/validation/run-validation.mjs --projectDir "<projectDir>" --seedId "<seed-id>"
```

### 8. Intent review

**Invoke the seed-review skill** before declaring a unit (or delivery) ready for developer merge.

Order: spec delta → risk/rollback → evidence → code scan. Use `.cursor/skills/_resources/seed/INTENT-REVIEW-CHECKLIST.md`.

### 9. Close the loop and handover

Delivery summary: implemented items, evidence, deviations, deferred work, residual risks, OWASP Top 10 checkpoint.

**Invoke the handover skill** to produce `<projectDir>/Docs/HANDOVER.md`.

## Decision Heuristics

- **Lightweight path:** small bug fix, isolated change, clear requirements, few checks.
- **Fuller cycle:** new/ambiguous behavior, multiple modules, security/reliability/migration risk, user-visible workflows.

## Sprint Mode

Declare **"Sprint Mode"** at the start of a tight engagement (e.g. 3-day sprint). Compression is named, not improvised.

**Compresses:** FSD depth; patterns-library breadth; SEED unit count/granularity; review latency (same-day self-review).

**Does not compress:** platform-fit/ADR check; architecture + OpenAPI (`Docs/openapi.yaml`) + container scaffold; OWASP Top 10 at close.

**Requires explicit `N/A — <rationale>` (never silent omission):** per-unit security / performance / observability sections when that risk is absent.

Supporting skills (requirements, architecture, testing, seed-unit) must honor the same compress / non-compress / N/A rules when Sprint Mode is declared.

## Traceability Template

| Spec ID | Requirement / Acceptance Criterion | Implementation Area | Validation |
| --- | --- | --- | --- |
| S1 | ... | ... | ... |

Include OpenAPI operationIds when APIs are involved.

## Security Evaluation

Before delivery is complete, validate against **OWASP Top 10** (A01–A10). Closeout must mark each item passed / N/A (with reason) / flagged. Do not ship unresolved OWASP findings without explicit acknowledgment.

## Configuration Management

- Never hardcode environment-specific values.
- Config via files or env injected at deploy time; document every key.
- Treat configuration changes as spec changes.

## Governance: skill eval harness

Before trusting skill-file changes on a real engagement:

```bash
node .cursor/skills/_resources/harness/eval/run-eval.mjs
```

## Failure Modes To Avoid

- Coding from an implied spec
- SEED planning before architecture on greenfield (platform-fit / OpenAPI / scaffold undecided)
- Expanding architecture scope without updating the spec
- Changing APIs without updating `Docs/openapi.yaml` first
- Skipping contract / OWASP evidence when applicable
- Silently dropping security/performance/observability under Sprint Mode
- Skipping seed-review or handover at closeout
- Invoking engineering skills only in README but never from this orchestrator

## Handoff Style

Lead with spec status; name the SEED slice; note spec/OpenAPI changes before code changes; bound open questions.

**Success:** requested → specified → designed → sliced → implemented → validated → reviewed → handed over.
