---
name: security-engineering
description: Use when a SEED Unit has security constraints (authn/authz, tenant isolation, input validation, secrets, OWASP). Invoked by spec-driven-development / seed-unit when security constraints apply.
---

# Security engineering

Ensure SEED Units and design artifacts include explicit **security requirements**, validation, and evidence.

## Core rules

- Authn/authz and tenant isolation are first-class when applicable.
- Prefer deny by default; safe errors (no enumeration/leakage).
- Require evidence: security tests, static checks, or reviewable proofs.
- Close each touching slice with an OWASP Top 10 check (or `N/A — <rationale>` under Sprint Mode when not applicable).
- If APIs change, ensure **`Docs/openapi.yaml`** reflects auth requirements.
- **Hard enforcement (manual PR operations):** do not create/update/merge PRs.

## Required outputs

- Security constraints + AC + evidence on the SEED Unit block
- Security decisions in `design.md` (threats, mitigations, residual risk)

## Minimum checklist

- Input validation & injection safety
- Authn/authz correctness
- Data isolation / least privilege
- Secrets handling (env/config only)
- Safe logging (no sensitive payloads)
