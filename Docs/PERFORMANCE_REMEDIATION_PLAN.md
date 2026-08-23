# ShelfPilot — Performance & Stability Remediation Plan

**Date:** 2026-08-11  
**Goal:** Reduce load, faster load times, stop server crashes — **without changing product behaviour**  
**Related:** [PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md)

---

## 1. Problem statement

| Symptom | Likely cause |
|---------|----------------|
| First page load very slow | ~3.3 MB JS, no code-split, no compression |
| Dashboard / Analytics slow | API loads every full layout + heavy analytics per request |
| Server “loading” after restart | Demo bootstrap runs **before** HTTP listen |
| Server crashes / restarts | Memory spikes (25 MB JSON uploads, portfolio analytics, 3D client load is separate); PM2 limit **400 MB** |
| Smart Generate “hangs” | Synchronous CPU work on Node single thread |

This plan is ordered by **impact vs effort**. Do **Phase 0** today (mostly ops). Phases 1–3 are code changes in small PRs.

---

## 2. Phase 0 — Immediate ops (today, no code deploy)

These reduce crashes and perceived downtime **now**.

### 0.1 Stop re-running demo bootstrap on every start

Bootstrap can regenerate a full hypermarket (packer + planograms). That blocks startup and spikes CPU/RAM.

**Production `.env` or `docker-compose.yml`:**

```env
SKIP_DEMO_BOOTSTRAP=1
```

Run bootstrap **once** manually after fresh DB, or only in dev. Demo layout already in SQLite volume persists across restarts.

**Verify:** After restart, logs should **not** show long `demo_bootstrap` work; `/api/health` should respond in &lt; 3 s.

### 0.2 Enable gzip on host nginx (foundry.inapp.com)

The app container does not compress responses. Your **front nginx** should:

```nginx
gzip on;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;
gzip_min_length 256;
gzip_vary on;

location /shelfpilot/ {
  proxy_pass http://127.0.0.1:4520;
  # ... existing headers ...
}
```

**Expected:** JS ~1.5 MB → ~450 KB transfer; JSON API responses 60–80% smaller.

### 0.3 Give the container enough memory

If the VM has &lt; 1 GB RAM, Node + SQLite + large JSON can OOM-kill the container.

**Docker Compose (recommended minimum):**

```yaml
services:
  shelfpilot:
    deploy:
      resources:
        limits:
          memory: 768M
        reservations:
          memory: 512M
```

Or `--memory=768m` on `docker run`. Monitor with `docker stats shelfpilot`.

### 0.4 Extend healthcheck start period (until Phase 1 ships)

If bootstrap must stay on for now, increase grace time so Docker does not kill a still-starting container:

```yaml
healthcheck:
  start_period: 60s   # was 15s
  interval: 15s
  retries: 10
```

### 0.5 PM2 users: raise or tune memory cap

`deploy/ecosystem.config.cjs` sets `max_memory_restart: "400M"`. Under portfolio + autogenerate load, Node can exceed 400 MB and **restart in a loop**.

**Temporary:** Set `max_memory_restart: "768M"` or run under Docker with explicit memory limit instead.

### 0.6 Operational playbook

| Action | Command |
|--------|---------|
| Check OOM / restart reason | `docker logs shelfpilot --tail 200` |
| Check memory | `docker stats shelfpilot --no-stream` |
| Time health after restart | `curl -w "%{time_total}\n" http://127.0.0.1:4520/shelfpilot/api/health` |
| Time portfolio API | `curl -w "%{time_total}\n" -H "Authorization: Bearer …" …/api/analytics/portfolio` |

---

## 3. Phase 1 — Quick code wins (1–2 days, low risk)

**Target:** Faster first load, faster dashboard, faster cold start. **No UX change.**

| # | Change | Files | Impact |
|---|--------|-------|--------|
| 1.1 | Add `compression` middleware to Express | `api/src/index.js`, `api/package.json` | All API JSON compressed |
| 1.2 | `React.lazy()` for `LayoutEditor`, `DashboardPage` heavy widgets, catalog import (xlsx) | `App.jsx` | First load −50–60% JS |
| 1.3 | Lazy-load PDF import only when floor-plan modal opens | `floorPlanImport.js`, import sites | PDF worker 1.37 MB on demand only |
| 1.4 | In-memory cache for `GET /analytics/portfolio` (TTL 60 s, invalidate on layout save) | `routes/analytics.js` | Dashboard API ms instead of seconds |
| 1.5 | Move `ensureDemoReady()` to **after** `app.listen()` (async, non-blocking) | `api/src/index.js` | Health responds immediately |
| 1.6 | Google Fonts: add `&display=swap` or self-host woff2 | `index.html` | Faster first paint |
| 1.7 | Remove redundant `GET /products` in `loadCatalog` when vertical queries suffice | `App.jsx` | Fewer API calls on layout open |

**Acceptance criteria (Phase 1):**

- Login page Network tab: main JS &lt; 250 KB gzip (excluding lazy chunks)
- `/analytics/portfolio` &lt; 500 ms with 5+ layouts (cached hit &lt; 50 ms)
- Container healthy &lt; 5 s after restart with `SKIP_DEMO_BOOTSTRAP=1`
- No change to layout editor, Smart Generate, or analytics numbers

---

## 4. Phase 2 — Server stability (3–5 days, medium risk) ✅ DONE

**Target:** Stop crash loops under normal demo usage.

| # | Change | Rationale | Status |
|---|--------|-----------|--------|
| 2.1 | **Lightweight portfolio endpoint** — use layout list metadata + stored KPI fields; do not `getLayout()` for every id | Removes largest CPU/RAM spike | ✅ |
| 2.2 | Replace `buildLayoutAnalyticsReport` inside `computeVerticalComparison` with cheap metrics (utilization, shelf count only) | Same endpoint, 10× less work | ✅ |
| 2.3 | Cap concurrent autogenerate (queue or 503 with retry) | Prevents event-loop stall + memory pile-up | ✅ |
| 2.4 | Reduce `express.json` limit to 5 MB; stream/chunk floor-plan uploads if needed | Prevents 25 MB allocation per request | ✅ |
| 2.5 | Store product images as files only — reject or migrate large `data:image` in `attributes` | Shrinks `GET /products` responses | ✅ |
| 2.6 | Add `start_period` + structured startup log with timing | Ops visibility | ✅ |
| 2.7 | nginx in `Dockerfile.web` / production image: `gzip_static on` for prebuilt assets | Compress JS/CSS at edge | ✅ |

**Acceptance criteria (Phase 2):**

- Portfolio API with 10 layouts: &lt; 1 s uncached, stable memory under 512 MB
- Two simultaneous Smart Generate requests: second gets queued or fast-fail, process does not crash
- `docker stats` memory flat after 30 min dashboard + editor use

---

## 5. Phase 3 — Client runtime (1 week, medium effort) ✅ DONE

**Target:** Smoother editor; less client CPU (helps weak demo laptops too).

| # | Change | Rationale | Status |
|---|--------|-----------|--------|
| 3.1 | Pause Scene3D `requestAnimationFrame` when tab hidden or no camera movement for 2 s | Stops idle GPU/CPU burn | ✅ |
| 3.2 | Vite `manualChunks`: `vendor-three`, `vendor-xlsx`, `vendor-pdf` | Better caching, parallel download | ✅ (Phase 1) |
| 3.3 | Canvas2D: render only shelves/aisles in viewport (virtualization) | Large layouts stay interactive | ✅ |
| 3.4 | Debounce layout PATCH on drag (batch saves) | Fewer large JSON round-trips | ✅ |
| 3.5 | Split layout API: `GET /layouts/:id` summary vs `?include=planograms` | Editor loads skeleton first | ✅ |

---

## 6. Phase 4 — Architecture (later, production hardening)

Not required for demo stability; needed for scale.

- Background job worker for autogenerate / analytics (BullMQ, separate process)
- Precomputed analytics columns on `layouts` table updated on save
- CDN for `web/dist` static assets
- Managed DB + read replicas (per [HANDOVER_PRODUCTION_MIGRATION.md](./HANDOVER_PRODUCTION_MIGRATION.md))
- Rate limiting on heavy endpoints

---

## 7. Recommended execution order

```
Week 1
├── Phase 0 (ops)           ← DONE in repo: SKIP_DEMO_BOOTSTRAP default, memory, healthcheck, nginx examples
├── Phase 1.1–1.5 (PR #1)   ← DONE: compression, lazy routes, async bootstrap, portfolio cache
└── Phase 1.6–1.7 (PR #1)   ← DONE: fonts already had display=swap; loadCatalog simplified

Week 2
├── Phase 2.1–2.2 (PR #2)   ← DONE: portfolio KPI summaries, cheap vertical comparison
├── Phase 2.3–2.5 (PR #3)   ← DONE: autogenerate guard, 5 MB JSON limit, inline image cap
└── Phase 2.7               ← DONE: gzip_static + pre-gzip in Dockerfile.web

Week 3+ (as needed)
└── Phase 3                 ← DONE: 3D idle pause, canvas cull, debounced shelf PATCH, layout API split
```

---

## 8. Crash diagnosis checklist

When the server crashes, capture **before** restart:

1. **Docker OOM?** — `docker inspect shelfpilot --format='{{.State.OOMKilled}}'`
2. **Exit code 137?** — SIGKILL, usually memory
3. **PM2 restart loop?** — `pm2 logs` around 400 MB mark
4. **Last request?** — Morgan logs: portfolio, autogenerate, floor-plan import before crash
5. **SQLite locked?** — rare with WAL; check concurrent writes during autogenerate

| Crash pattern | Most likely fix |
|---------------|-----------------|
| Crash on container start | Phase 0.1 + 1.5 (bootstrap) |
| Crash on Dashboard open | Phase 1.4 + 2.1 + 2.2 (portfolio) |
| Crash on Smart Generate | Phase 2.3 (queue) + more RAM |
| Crash on floor plan upload | Phase 2.4 (JSON limit) |
| Slow but no crash | Phase 0.2 + Phase 1 (compression + lazy load) |

---

## 9. Success metrics

Track before/after on **foundry.inapp.com** server:

| Metric | Current (est.) | Target after Phase 1 | Target after Phase 2 |
|--------|----------------|----------------------|----------------------|
| Time to interactive (login) | 8–15 s | &lt; 4 s | &lt; 3 s |
| `/api/health` after restart | 15–60 s | &lt; 5 s | &lt; 3 s |
| `/analytics/portfolio` | 2–10 s | &lt; 1 s (cached &lt; 100 ms) | &lt; 500 ms uncached |
| Container restarts / day | &gt; 0 | 0 | 0 |
| Memory steady-state | spikes &gt; 400 MB | &lt; 350 MB | &lt; 450 MB peak |

---

## 10. What we will NOT change

To honour “no functionality change” during stabilization:

- Smart Generate algorithm and layout rules
- Analytics formulas and report content
- RBAC, roles, approval workflow
- 3D/2D editor features (only **when** heavy code loads, not **what** it does)

---

## 11. Next step

**Recommended:** Deploy Phase 0 ops on foundry.inapp.com (`SKIP_DEMO_BOOTSTRAP=1`, host nginx gzip, memory limits), then rebuild with Phase 1 + Phase 2 code.

**Next code phase:** Phase 4 (background workers, CDN, rate limits) for production scale — not required for demo stability.

---

_Prepared from [PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md) root-cause work._
