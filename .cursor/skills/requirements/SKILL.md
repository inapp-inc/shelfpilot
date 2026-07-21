---
name: requirements
description: Use when gathering, clarifying, or documenting product or feature requirements. Produces gaps questionnaires and Functional Specification Documents (FSD) so that behavior is explicit, traceable, and usable as input to architecture and implementation. Invoked by spec-driven-development when no usable spec exists.
---

# Requirements

Use this skill to capture unknowns, close gaps, and produce a **Functional Specification Document (FSD)** that drives design and implementation. Invoked by **spec-driven-development** when no usable spec exists.

## Core Rules

- Produce a **gaps questionnaire** (JSON-first) before the full FSD for non-trivial work.
- Per-project JSON under `<projectDir>/Discovery and Design/` is the source of truth; generate Markdown for review.
- Use the filled questionnaire as the primary FSD input.
- For small tasks, a short checklist is OK if another engineer can still tell whether the work is done.
- Align API/integration details with the eventual OpenAPI at `<projectDir>/Docs/openapi.yaml`.
- **Hard enforcement (manual PR operations):** do not create/update/merge PRs.
- Maintain OpenSpec behavior specs under `<projectDir>/openspec/specs/**/spec.md`.

## Sprint Mode

When Sprint Mode is declared: compress FSD depth; do **not** skip the gaps completion gate (`status` + `reviewedBy` / `reviewedAt`) or explicit out-of-scope/assumptions.

## Artifacts and Templates

| Artifact | Location |
|----------|----------|
| Gaps template | `.cursor/skills/_resources/requirement-skill/gaps-questionnaire-template.md` |
| Gaps CLI | `.cursor/skills/_resources/requirement-skill/gaps-questionnaire/` |
| Per-project JSON | `<projectDir>/Discovery and Design/gap-questionnaire.json` |
| Generated Markdown | `<projectDir>/Docs/SDD_Gaps_*.md` via `generate-gap-md.mjs` |
| FSD template | `.cursor/skills/_resources/requirement-skill/fsd-template.md` |

## Gaps Questionnaire Workflow

**Project root:** `<projectDir>` is the current project's root folder (the repo root you are working in).

1. `init-project-structure.mjs --projectDir "<projectDir>"`
2. `init-gap-json.mjs --projectDir "<projectDir>"` (creates JSON with `status`, `reviewedBy`, `reviewedAt`)
3. Fill answers, owner, confidence (H/M/L) in the JSON.
4. **Completion gate (all required before FSD/architecture/coding):**
   - `"status": "Complete"`
   - `"reviewedBy": "<reviewer name or initials>"` (not empty)
   - `"reviewedAt": "YYYY-MM-DD"` (not empty)
5. Generate Markdown: `generate-gap-md.mjs --in "..." --projectDir "..."`
6. If unresolved gaps remain: `generate-assumptions-md.mjs` → `Docs/SDD_Assumptions.md` (assume/defer/block per item)
7. Create/update FSD in `Docs/` with traceability to questionnaire IDs.

## FSD Content Requirements

Executive summary; background & problem; goals & success criteria; stakeholders/personas; functional requirements (epics → stories → Given/When/Then AC); NFRs; high-level system/data architecture (align with future `Docs/openapi.yaml`); user flows; assumptions; constraints; open questions; out of scope; glossary.

Calibrate depth to input; drop empty sections. Under Sprint Mode, keep AC testable even if narrative is shorter.

## OpenSpec alignment

After FSD, extract durable behavior into `openspec/specs/` (Purpose + Requirements + scenarios).

## Failure Modes To Avoid

- Writing the FSD without completing gaps (status + reviewer fields) for non-trivial work
- Vague AC; high-level integrations without endpoints/auth/errors
- Omitting out-of-scope and assumptions
- Setting `status: Complete` without `reviewedBy` / `reviewedAt`

## Handoff

State draft/approved; list approved requirement IDs; note open questions and owners.
