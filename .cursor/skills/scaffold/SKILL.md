---
name: scaffold
description: Use for greenfield bootstrap — clone the versioned starter template (Express API, web/Python stubs, Dockerfile, lint, OpenAPI stub) consistent with ADR-0001/ADR-0003, then diverge for project specifics. Invoked by seed-unit for the bootstrap SEED unit after architecture platform-fit.
---

# Scaffold

Use this skill for the **bootstrap SEED unit** on greenfield work. Do not generate repo layout, Dockerfile, lint config, and base middleware from a prompt — **clone the starter template, then diverge**.

## When to run

- **After** the architecture Day-1 platform-fit gate (ADR-0001–0016 as-is, or ADR-0017 exception on file).
- As the first implementation SEED unit (exempt from single-PR sizing — see seed-unit).

## Core rules

- Starter must stay consistent with **ADR-0001** (MERN + Python modular platform) and **ADR-0003** (container-first deployment).
- Bootstrap unit job: clone scaffold → customize for this project → stop. Feature work belongs in later SEED units.
- Record divergences from the starter in `design.md` (what changed and why).
- Canonical OpenAPI path after clone: `<projectDir>/Docs/openapi.yaml`.
- **Hard enforcement (manual PR operations):** This skill MUST NOT create, open, update, comment on, approve, or merge pull requests.

## Starter template location

- `.cursor/skills/_resources/scaffold/starter/`

| Path | Purpose |
|------|---------|
| `api/` | Express API with helmet/cors, correlation ID, `/health`, tests |
| `web/` | React placeholder — add Vite/React after clone |
| `services/python/` | Python capability-service health stub |
| `Dockerfile` + `docker-compose.yml` | Container-first API + Mongo |
| `eslint.config.js` + `.prettierrc.json` | Lint/format baseline |
| `.env.example` | Documented config keys (no secrets) |
| `openapi.stub.yaml` | Copied to `Docs/openapi.yaml` on clone |
| `package-lock.json` | Deterministic installs (`npm ci` / `npm install`) |

## Workflow

1. Confirm platform-fit (architecture Day-1 gate).
2. Clone:

```bash
node .cursor/skills/_resources/scaffold/clone-scaffold.mjs --projectDir "<projectDir>"
```

3. In `codebase/`: `npm install`, `npm test`, optionally `docker compose up --build`.
4. Customize names, ports, and service boundaries; expand `web/` and Python service when in scope.
5. Keep `Docs/openapi.yaml` as the FE/BE contract; edit it before changing API shapes.
6. Hand off to subsequent PR-sized SEED units for features.

## Failure modes to avoid

- Regenerating scaffolding from a free-form prompt
- Skipping Dockerfile / compose on greenfield
- Expanding bootstrap into feature implementation without a new SEED unit
- Changing API behavior without updating `Docs/openapi.yaml` first
