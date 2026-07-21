# SEED evidence requirements (default)

This document defines the minimum evidence expected for a SEED Unit to be considered complete.

## Evidence checklist (pick what applies)

- **Automated tests**
  - Unit tests for new/changed logic paths
  - Integration/contract tests when boundaries change (API/data/messaging)
  - E2E/UI tests when user flows change (when available)
- **Contract evidence**
  - Update `<projectDir>/Docs/openapi.yaml` first for API-visible behavior changes
  - Schema/contract tests (e.g. Zod) when APIs are touched
  - Validation harness OpenAPI shape check passes
- **Performance evidence**
  - Measured p95/p99 latency/throughput when a performance constraint exists
  - Profiling/benchmark notes for hot paths when applicable
- **Security evidence**
  - OWASP checkpoint for slices touching auth/data/input
  - Safe logging and secret handling verified
- **Observability evidence**
  - Structured log examples with stable keys
  - Correlation ID propagation evidence when applicable
- **CI evidence**
  - Link to CI run(s) and named checks that provide the promised gates

## PR hygiene (required)

- **Manual developer operation:** PR creation, PR updates, and merges are done **manually by the developer**. This document only defines what information should be included.
- The PR description should include the SEED Unit block (`.cursor/skills/_resources/seed/SEED-UNIT-TEMPLATE.md`)
- The PR should link to the OpenSpec change folder and impacted spec paths
- When APIs are touched, link **`Docs/openapi.yaml`**

## Handover deliverable (required)

- Create `<projectDir>/Docs/HANDOVER.md` using `.cursor/skills/_resources/handover/HANDOVER-TEMPLATE.md` so downstream delivery teams (BAs, architects, developers, QAs, PMs) have a holistic view of what was built and what evidence exists.
