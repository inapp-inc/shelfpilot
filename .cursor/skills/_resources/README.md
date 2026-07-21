# Shared resources (not a skill)

Templates, ADRs, coding guides, scaffold starter, and harnesses used by skills under `.cursor/skills/*/SKILL.md`.

This folder has **no** root `SKILL.md` — Cursor will not treat `_resources` itself as an invokable skill. Do **not** treat `_archive/` contents as live guidance.

| Subfolder | Contents |
|-----------|----------|
| `requirement-skill/` | FSD template, gaps template, gaps CLI |
| `architecture-adr/` | ADR-0001–0018 + governance |
| `architecture-patterns/` | Patterns library |
| `coding-skills/` | Per-stack `SKILLS.md` + `ADR.md` (`legacy-source/` = historical only) |
| `seed/` | SEED template, intent checklist, evidence requirements |
| `handover/` | Handover template |
| `scaffold/` | Starter template + `clone-scaffold.mjs` |
| `harness/` | Eval, dispatch, validation runners |
| `_archive/` | Superseded drafts — do not use |

**Canonical OpenAPI path for projects:** `<projectDir>/Docs/openapi.yaml`
