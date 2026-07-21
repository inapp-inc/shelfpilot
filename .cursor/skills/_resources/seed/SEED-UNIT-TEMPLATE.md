# SEED Unit template

Copy this block into Jira and every PR description.

**Manual developer operation:** Creating/updating/merging PRs is done **manually by the developer**. This template only specifies the information that must be included.

```markdown
## SEED Unit

- **SEED-ID:** <capability>-<sequence>
- **Goal:** (1–2 lines)
- **Scope:**
  - In scope:
  - Out of scope:
- **Constraints:**
  - Performance: <budget or `N/A — <rationale>`>
  - Security: <requirement or `N/A — <rationale>`>
  - Observability: <requirement or `N/A — <rationale>`>
  - Backward compatibility:
  - Cost:
- **Acceptance criteria:**
  1. Given / When / Then …
- **Evidence required:**
  - Tests / commands:
  - CI run link(s):
  - Screenshots / metrics / logs:
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched:
- **Risks & rollback:**
  - Risks:
  - Rollback steps: (flag off / config / revert)
- **Spec link:** `<projectDir>/openspec/changes/<seed-id>/`
- **Engineering skills invoked:** (security-engineering / performance-engineering / observability / rollback-and-flags / none)
```
