# SDD Assumptions — ShelfPilot

| ID | Item | Disposition | Rationale |
|----|------|-------------|-----------|
| A-D2 / O1 | Persistence for local deploy | **Decided** — SQLite via `node:sqlite` (`SQLITE_PATH`) | Lightweight durable local store; Mongo deferred to cloud |
| A-I2 | Auth without IdP | **Assume** mock email/password + role token | Prototype only |
| A-N3 | Multi-tenancy | **Assume** single-tenant; reserve `tenantId` | ADR-0006 future-ready |
| A-S3 | Missing BRD/FRD | **Defer** import | project.md + FSD remain product SoT |
| A-UI | Visual UI SoT | **Decided** — `ui/ShelfPilot.dc.html` | React ports from this file |
| O2 | Auto-calc host | **Decided** — Express/Node for MVP | Architecture 2026-07-14 |
| O3 | Local deploy | **Decided** — Docker Compose (api + web + SQLite volume) | Architecture 2026-07-15 |

Requires **Node.js >= 22.5** (built-in `node:sqlite`). Docker images use `node:22-bookworm-slim`.
