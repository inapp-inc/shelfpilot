# ShelfPilot codebase

Demo stack: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node ≥ 22.5

## Packages

- `api` — Express API (`../Docs/openapi.yaml`)
- `web` — React + Vite + Three.js SPA

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev:api` | API on :3000 |
| `npm run dev:web` | Web on :5173 (proxies `/api` if configured) |
| `npm test` | API tests |
| `npm run openapi:check` | Verify OpenAPI documents all live routes |
| `npm run seed:demo` | Seed rich catalog + 3 demo layouts |
| `npm run seed:demo-catalog` | Catalog only (all verticals) |
| `npm run smoke:demo` | Happy-path smoke against running API |

## Local without Docker

```bash
cd codebase
npm install
# PowerShell:
$env:SQLITE_PATH="./data/shelfpilot.db"
npm run seed:demo
npm run dev:api
# other terminal:
npm run dev:web
```

Demo login (fresh DB): **SuperAdmin** only — `superadmin@shelfpilot.local` / `changeme` (override with `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`). Sign in with email and password; your role comes from the account. SuperAdmin creates tenant **Admin** users; each Admin adds designers, approvers, viewers, and customer kiosk users.

In test mode the API also seeds demo users (`designer@shelfpilot.local`, etc.) with password `password`.

## Local Docker

```bash
cd codebase
docker compose up --build
# Web http://localhost:8080
# API  http://localhost:3001/health  (mapped away from host :3000)
```

Then smoke:

```bash
npm run smoke:demo -- http://127.0.0.1:3001
```

SQLite persists on volume `shelfpilot_data` (`/data/shelfpilot.db`).

## Env (see `.env.example`)

| Variable | Meaning |
|----------|---------|
| `SQLITE_PATH` | SQLite file or `:memory:` |
| `AUTH_SESSION_TTL` | Session seconds; `0` = long-lived demo |
| `LAYOUT_VERSIONING` | `1` snapshot on submit-for-review |

See `Docs/HANDOVER.md`, `Docs/SEED_PLAN_FULL.md`, `Docs/seeds/README.md`.
