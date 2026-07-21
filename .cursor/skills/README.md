# Project skills (spec-driven development)

**Single managed folder:** `.cursor/skills/`

| Path | Role |
|------|------|
| `.cursor/skills/<skill-name>/SKILL.md` | Agent-facing skills |
| `.cursor/skills/_resources/` | Templates, ADRs, coding guides, scaffold, harnesses |
| `.cursor/skills/_resources/_archive/` | Superseded drafts — **do not use** |

## Master skill

- **spec-driven-development** — Orchestrates: requirements → architecture → SEED (+ engineering) → coding → testing → seed-review → handover.

## Flow (ordered)

1. **requirements** — gaps JSON (`status` + `reviewedBy`/`reviewedAt`) → FSD → OpenSpec
2. **architecture** — platform-fit, patterns, `Docs/openapi.yaml`, container plan
3. **seed-unit** — PR-sized units; invoke **security-engineering** / **performance-engineering** / **observability** / **rollback-and-flags** as needed; **scaffold** for greenfield bootstrap
4. **coding** — implement against approved slice + OpenAPI
5. **testing** — evidence + validation harness
6. **seed-review** — intent-first go/no-go
7. **handover** — `Docs/HANDOVER.md`

## Harnesses

| Harness | Command |
|---------|---------|
| Eval (before trusting skill edits) | `node .cursor/skills/_resources/harness/eval/run-eval.mjs` |
| Dispatch | `node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "<tasks.md>"` |
| Validation | `node .cursor/skills/_resources/harness/validation/run-validation.mjs --projectDir "<dir>"` |

## Conventions

- `<projectDir>` = current project / repo root
- Canonical OpenAPI = `<projectDir>/Docs/openapi.yaml`
- Sprint Mode: declare explicitly; never silently drop security/perf/observability
