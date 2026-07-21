## Gaps questionnaire (CLI utilities)

JSON-first gaps capture. Edit the per-project JSON directly; generate Markdown with the scripts below.

### Layout

- `init-project-structure.mjs` — `<projectDir>/{Discovery and Design, Docs, codebase}/`
- `init-gap-json.mjs` — create `gap-questionnaire.json` (includes `status`, `reviewedBy`, `reviewedAt`)
- `generate-gap-md.mjs` — `Docs/SDD_Gaps_Questionnaire.md` + `SDD_Gaps_Answers.md`
- `generate-assumptions-md.mjs` — `Docs/SDD_Assumptions.md`
- `generate-figma-make-prompt.mjs` — `Discovery and Design/FigmaMake_UI_Prompt.txt`

### Project root

`<projectDir>` is the current project's root folder (the repo root you are working in).

### Typical flow

```bash
node ".cursor/skills/_resources/requirement-skill/gaps-questionnaire/init-project-structure.mjs" --projectDir "<projectDir>"
node ".cursor/skills/_resources/requirement-skill/gaps-questionnaire/init-gap-json.mjs" --projectDir "<projectDir>"
# Edit Discovery and Design/gap-questionnaire.json
node ".cursor/skills/_resources/requirement-skill/gaps-questionnaire/generate-gap-md.mjs" \
  --in "<projectDir>/Discovery and Design/gap-questionnaire.json" \
  --projectDir "<projectDir>"
```

### Completion gate (all required)

1. `"status": "Complete"`
2. `"reviewedBy": "<name or initials>"` (non-empty)
3. `"reviewedAt": "YYYY-MM-DD"` (non-empty)
