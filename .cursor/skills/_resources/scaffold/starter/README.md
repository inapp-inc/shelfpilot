# Scaffold starter (ADR-0001 / ADR-0003)

Clone via `clone-scaffold.mjs`, then diverge for the project. This is a **baseline**, not a finished app.

## Included

| Area | What you get |
|------|----------------|
| **API** (`api/`) | Express + helmet/cors, correlation ID middleware, `/health`, unit test |
| **Web** (`web/`) | React placeholder README — add Vite/React after clone |
| **Python** (`services/python/`) | Capability-service health stub |
| **Containers** | Dockerfile (API) + docker-compose (API + Mongo) |
| **Lint/format** | ESLint flat config + Prettier |
| **OpenAPI stub** | `openapi.stub.yaml` — copied to `<projectDir>/Docs/openapi.yaml` on clone |

## Commands

```bash
npm install
npm test
npm run lint
docker compose up --build
```

Record divergences from this starter in the OpenSpec `design.md` for the bootstrap SEED unit.
