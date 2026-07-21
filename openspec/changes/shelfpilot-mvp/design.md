# Design: ShelfPilot UI + Mock API MVP

## Platform-fit gate

**Decision:** Inherit **ADR-0001–0016 as-is** for application runtime and container-first deploy.

**Local persistence exception (ADR-0017-style, bounded):** For **local Docker / laptop deploy**, the system of record is **SQLite** (single file on a named volume), not MongoDB. Rationale: lightweight ops, no extra DB container, durable across restarts. **MongoDB remains the platform default** for managed/cloud multi-tenant deployments later; schema ownership stays in the API (repository boundary) so storage can be swapped without route rewrites.

| ADR area | Fit |
|----------|-----|
| ADR-0001 MERN + Python modular | React web + Express API; Python stub retained |
| ADR-0003 containers | Docker + compose for local full stack |
| ADR-0004 persistence | **Local profile: SQLite (`node:sqlite`)**; cloud profile later: Mongo |
| ADR-0006 security/tenancy | Mock auth + RBAC; single-tenant local |
| ADR-0007 observability | `x-correlation-id` middleware |
| ADR-0009 API design | OpenAPI 3 at `Docs/openapi.yaml` |

## Patterns considered

| Pattern | Choice | Rationale |
|---------|--------|-----------|
| Modular monolith | **Chosen** | Single API + static web |
| Repository over store | **Chosen** | SQLite now; Mongo later without route churn |
| SQLite file + volume | **Chosen (local)** | Lightweight durable local storage |
| Mongo in compose Day-1 | **Rejected (local)** | Heavier than needed for laptop deploy |
| Embedded layout JSON in SQLite | **Chosen** | Fixtures/aisles/mappings as JSON columns — simple MVP |
| Config-driven verticals | **Chosen** | BR-10 |
| Client-side 3D (Three.js) | **Chosen** | project.md / UI SoT |

## Local deploy topology

```
docker compose up --build
  ├─ web   (nginx)     :8080 → static SPA, /api proxied to api
  ├─ api   (node)      :3000
  └─ volume shelfpilot_data → /data/shelfpilot.db
```

Env:
- `SQLITE_PATH` (default `/data/shelfpilot.db` in container, `./data/shelfpilot.db` on host)
- `PORT=3000`
- `NODE_ENV=production|development`
- Runtime: **Node.js >= 22.5** (`node:sqlite` DatabaseSync)

## Container / scaffold plan

1. API image (`node:22`) — built-in SQLite, no native compile
2. Web image: Vite build → nginx with API reverse proxy
3. Compose: `api` + `web` + named volume (no Mongo service for local profile)
4. Persist SQLite file on volume so data survives container recreate
5. Host Node for local-without-Docker: **>= 22.5**
## Decisions locked

- **O1 (revised):** SQLite file store for local deploy (replaces in-memory)
- **O2:** Auto-calc in Express/Node for MVP
- **O3:** Local deploy via Docker Compose (API + web + SQLite volume)

## Engineering constraints

- Security: mock auth, RBAC, validation; DB file not world-readable in image
- Performance: 3D on standard hardware; SQLite adequate for prototype concurrency
- Observability: correlation IDs; calc timing logs
- Rollback: remove volume / restore DB file; compose down
