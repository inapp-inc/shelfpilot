# Architecture note — Local deploy (SQLite + Docker)

**Status:** Approved for local profile (post-FSD)  
**Date:** 2026-07-15  
**Change:** `openspec/changes/shelfpilot-mvp/`

## Summary

ShelfPilot local deployment uses:

| Layer | Choice |
|-------|--------|
| API | Express (Node 20) in Docker |
| Web | Vite/React build served by nginx |
| Persistence | **SQLite** file on Docker volume |
| Orchestration | `docker compose` in `codebase/` |

MongoDB is **not** required for local runs. Platform ADR-0004 Mongo path remains the future cloud default; repository boundary isolates the swap.

## Paths

- DB file: `SQLITE_PATH` (compose default `/data/shelfpilot.db`)
- OpenAPI: `Docs/openapi.yaml`
- UI SoT: `ui/ShelfPilot.dc.html`

Requires **Node.js >= 22.5** (`node:sqlite`). Docker images use `node:22-bookworm-slim`.

## Run locally

```bash
cd codebase
docker compose up --build
# App: http://localhost:8080
# API direct (Compose host map): http://localhost:3001/health
```

Without Docker (dev):

```bash
cd codebase
npm install
# PowerShell:
$env:SQLITE_PATH="./data/shelfpilot.db"
npm run dev:api
npm run dev:web
```
