# ShelfPilot — Performance Analysis Report

**Date:** 2026-08-11  
**Scope:** Full-stack review (web, API, Docker deploy) — **analysis only, no code changes**  
**Symptom:** Application feels heavy; slow initial load and server response times  

---

## Executive summary

ShelfPilot’s slowness comes from **several compounding factors**, not a single bug:

| Layer | Severity | Primary cause |
|-------|----------|---------------|
| **Initial page load** | Critical | ~**3.3 MB** JavaScript downloaded on first visit (single bundle + PDF worker), no code-splitting |
| **Dashboard / Analytics** | High | API loads **every layout’s full JSON** (shelves + planograms) and runs **heavy analytics per layout** on each portfolio request |
| **Layout editor (3D)** | High | Continuous **60 FPS WebGL render loop** + up to **16,000** facing instances + texture preload |
| **API startup** | Medium | **Synchronous demo bootstrap** (Smart Generate + planogram fill) may block server listen on cold start |
| **Transport** | Medium | **No gzip/brotli** compression on API or static assets in production single-container deploy |
| **Client data fetching** | Medium | Redundant **multi-vertical + full catalog** product fetches on layout open |

None of these require functional changes to fix — they are architecture and delivery optimizations.

---

## 1. Frontend — initial load (biggest user-visible impact)

### 1.1 Monolithic JavaScript bundle

Production build (`npm run build -w web`):

| Asset | Size (minified) | Gzip |
|-------|-----------------|------|
| `index-*.js` (main app) | **1,544 KB** | **452 KB** |
| `pdf.worker.min-*.mjs` | **1,376 KB** | — |
| `pdf-*.js` (pdfjs-dist) | **365 KB** | **108 KB** |
| `index-*.css` | **138 KB** | **25 KB** |
| **Total JS (first visit)** | **~3,285 KB** | **~560 KB+** |

Vite warns: *“Some chunks are larger than 500 kB”* — no `manualChunks` or `React.lazy()` is configured.

### 1.2 Everything imported on the login screen

`App.jsx` **statically imports** heavy modules even when the user is on login or dashboard:

```javascript
import LayoutEditor from "./layout-editor/LayoutEditor.jsx";  // → Scene3D → three.js
import { parseCatalogImportWorkbook } from "./catalog/importExcel.js";  // → xlsx
```

**Effect:** Three.js (~170), xlsx, full layout editor, and Canvas2D ship in the **first** download before any route is chosen. User pays ~450 KB gzip JS even to see the login form.

### 1.3 PDF import libraries always shipped

Floor plan PDF import uses dynamic import in `floorPlanImport.js`, but the **worker file (1.37 MB)** is still emitted as a separate chunk and may be prefetched. Users who never import PDFs still download PDF infrastructure.

### 1.4 External Google Fonts (render-blocking)

`index.html` loads Plus Jakarta Sans + DM Mono from `fonts.googleapis.com` with no `font-display: swap` override in the link. On slow networks this **blocks first paint** until fonts resolve.

### 1.5 Large CSS bundle

`styles.css` is **~5,800 lines / 138 KB** (25 KB gzip). Acceptable alone, but adds to first paint with the JS payload.

---

## 2. Frontend — runtime (after login)

### 2.1 Dashboard fires expensive API calls immediately

`AnalyticsWidgetBoard.jsx` on mount (when token exists):

1. `GET /analytics/portfolio` — see §3.2  
2. `GET /analytics/audit-summary?limit=40`  
3. `GET /analytics/layouts/:id/summary` — full per-layout analytics report  
4. Category fetches per vertical  

**Effect:** Opening Dashboard triggers **multiple heavy server computations** before charts render.

### 2.2 Catalog over-fetching

`App.jsx` → `loadCatalog()`:

- Fetches categories **per vertical** (parallel)  
- Fetches products **per vertical** (parallel)  
- Then fetches **`GET /products`** (all products) again to merge  

When a layout is open, this runs on every layout vertical change. With 100+ products × multiple verticals, JSON parse + React state updates add client CPU.

### 2.3 Layout editor — full layout JSON in memory

`GET /layouts/:id` returns the **entire** layout document: all shelves, faces, planogram rows, aisles, zones, validation, autoCalc. Demo hypermarket layouts can be **hundreds of KB to several MB** of JSON.

Every edit PATCH may re-send or re-receive large payloads.

### 2.4 Canvas2D — DOM scale

`Canvas2D.jsx` renders **one DOM element per shelf face, aisle, zone, obstacle, entry point**. A Smart-Generated warehouse/ hypermarket with 200+ shelves creates **200+ interactive DOM nodes** with labels, badges, and event handlers.

**Effect:** Slow selection, scroll, and re-render on layout editor; main-thread bound.

### 2.5 Scene3D — WebGL continuous render loop

When 3D view is active (`view3d === true`), `Scene3D.jsx` runs:

```javascript
const animate = () => {
  frame = requestAnimationFrame(animate);
  // walk mode physics, label scaling, controls.update()
  renderer.render(scene, camera);
};
animate();
```

**Effect:** **Constant 60 FPS GPU + CPU** usage while 3D tab is open, even when idle (orbit mode still renders every frame).

Additional 3D cost:

- `MAX_FACINGS = 16000` — cap for instanced product meshes  
- Texture preload for every product image URL on scene build  
- Antialiased WebGL renderer (`createWebGLRenderer`)  
- Shelf label sprites updated every frame (distance-based scaling)

### 2.6 React StrictMode

`main.jsx` wraps the app in `<React.StrictMode>`, which **double-invokes effects in development**. Production build is unaffected; dev feels slower.

---

## 3. Backend — API bottlenecks

### 3.1 Portfolio analytics — O(n) full layout loads

```javascript
// api/src/routes/analytics.js
analyticsRouter.get("/analytics/portfolio", authRequired, (req, res) => {
  const summaries = repo.listLayouts();
  const layouts = summaries.map((l) => repo.getLayout(l.id)).filter(Boolean);  // ← full payload each
  const summary = computePortfolioAnalytics(layouts, categories, vertical);
});
```

For **N layouts**, the server:

1. Reads N rows from SQLite  
2. **JSON.parse** N full layout payloads (shelves + planograms)  
3. Runs portfolio analytics over all of them  

### 3.2 Vertical comparison — full report per layout

Inside `buildPortfolioAnalyticsReport` → `computeVerticalComparison`:

```javascript
for (const layout of layouts) {
  const report = buildLayoutAnalyticsReport(layout, categories, {}, null);  // ← expensive
}
```

`buildLayoutAnalyticsReport` computes space utilization, fixture density, aisle compliance, product coverage, merch fill, weight load, storage volume, facings, etc.

**Effect:** Portfolio endpoint cost grows **linearly with layout count × layout complexity**. With 10 layouts and large demo data, this can take **seconds** on a modest VM.

### 3.3 Per-layout analytics summary

`GET /analytics/layouts/:id/summary` runs the same full `buildLayoutAnalyticsReport` plus logs duration. Dashboard calls this on layout selection and when `contentRevision` changes.

### 3.4 Smart Generate / autogenerate (CPU spike)

`POST /layouts/:id/autogenerate` runs synchronously:

- `layoutPacker.js` — shelf/aisle placement  
- `planogramAutoFill.js` — product placement  
- Aisle binding, labeling, validation  

**Effect:** Request holds the Node event loop for **multi-second** periods on large fixture areas. Concurrent users amplify server load.

### 3.5 Demo bootstrap on every API start

`api/src/index.js`:

```javascript
if (process.env.NODE_ENV !== "test" && process.env.SKIP_DEMO_BOOTSTRAP !== "1") {
  getDb();
  demoBootstrap = ensureDemoReady();  // ← before listen()
}
```

`ensureDemoReady()` may:

- Seed catalog from 129 image files  
- **Regenerate** demo layout (packer + planogram fill) if validation fails  

**Effect:** **Cold start / container restart** can take **10–30+ seconds** before `/health` responds, depending on DB state and CPU. Docker healthcheck retries during this window.

### 3.6 SQLite — single-writer, large JSON blobs

- Layout bodies stored as single **TEXT JSON** columns  
- Every `getLayout` = full parse + `normalizeLayout`  
- WAL mode enabled (good) but no indexes help payload size  
- All analytics and editor traffic hits one Node process + one DB file  

### 3.7 No HTTP compression

Grep across codebase: **no `compression` middleware**, nginx config has **no `gzip on`**.

Production deploy (`deploy/Dockerfile`) serves static files via Express `express.static` — **uncompressed** JS/CSS (~1.5 MB main.js raw over the wire).

### 3.8 Large JSON body limit

```javascript
app.use(express.json({ limit: "25mb" }));
```

Floor plan uploads as base64 JSON. A single request can allocate **25 MB** in memory. Multiple concurrent imports risk **memory pressure** on small servers.

### 3.9 Morgan `combined` logging

Every request logged to stdout in production. High traffic + log shipping adds I/O overhead (minor vs above items).

---

## 4. Infrastructure & deployment

### 4.1 Production topology

| Mode | Web | API | Compression |
|------|-----|-----|---------------|
| Local dev (`docker-compose.yml`) | nginx:80 → static | Node:3000 | nginx default gzip may apply to static only |
| Production (`deploy/`) | Express serves `web/dist` + API on **one port 4520** | Same process | **None configured** |

Single Node process handles static assets, API, SQLite, and demo bootstrap — **no horizontal scaling**, no CDN for assets.

### 4.2 Product images

- 129 bundled PNGs ≈ **1.72 MB** on disk (reasonable)  
- Served as static files at `/product-images/` (good)  
- Uploaded product images stored as **JPEG data URLs** in SQLite `attributes` — if used widely, **`GET /products` responses bloat** and 3D texture loader fetches heavy inline URLs  

### 4.3 Healthcheck / restart loop

If bootstrap exceeds healthcheck `start-period` (15s in deploy), container may flap under load on weak hardware.

---

## 5. Root cause matrix

| # | Root cause | User symptom | Where |
|---|------------|--------------|-------|
| R1 | No JS code-splitting; Three.js + xlsx + editor in main chunk | Slow first load, long white screen | `web/vite.config.js`, `App.jsx` imports |
| R2 | PDF worker 1.37 MB bundled | Slow first load even without PDF feature | `floorPlanImport.js`, Vite build |
| R3 | Portfolio analytics loads + analyzes all full layouts | Dashboard slow; server CPU spike | `routes/analytics.js`, `analyticsReports.js` |
| R4 | `computeVerticalComparison` runs full layout report per store | Same as R3 | `analyticsReports.js:769` |
| R5 | Full layout JSON over REST | Slow editor open/save | `sqlite.js` payload model |
| R6 | Scene3D continuous rAF + 16k facing budget | Fan noise, tab sluggish in 3D | `Scene3D.jsx` |
| R7 | Canvas2D DOM-per-entity | Janky 2D editor with many shelves | `Canvas2D.jsx` |
| R8 | `ensureDemoReady()` before listen | Server “loading” after deploy/restart | `index.js`, `bootstrapDemo.js` |
| R9 | No gzip on API/static in production | Large transfer times on foundry.inapp.com | `deploy/Dockerfile`, nginx |
| R10 | Redundant catalog API calls | Extra latency on layout open | `App.jsx` `loadCatalog` |
| R11 | Synchronous autogenerate | Smart Generate hangs UI | `routes/layouts.js` |
| R12 | External Google Fonts blocking | Delayed first paint | `index.html` |

---

## 6. Recommended fixes (priority order — no functionality change)

### P0 — Quick wins (high impact, low risk)

1. **Enable gzip/brotli** for static assets and JSON responses (nginx or `compression` middleware).  
   *Expected: 60–70% smaller transfers for JS/API JSON.*

2. **Lazy-load routes/modules** with `React.lazy()` + `Suspense`:  
   - `LayoutEditor` (and thus Three.js)  
   - `importExcel` / xlsx  
   - PDF import (already partial dynamic import — ensure worker loads on demand only)  
   *Expected: first load ~450 KB → ~150–200 KB gzip for login/dashboard.*

3. **Cache portfolio analytics** (in-memory, 30–60s TTL) or precompute on layout save.  
   *Expected: dashboard API from seconds → milliseconds.*

4. **Skip or defer demo bootstrap** in production: `SKIP_DEMO_BOOTSTRAP=1` after first seed, or run async after `listen()`.  
   *Expected: faster container ready time.*

### P1 — Medium effort

5. **Portfolio endpoint:** pass layout summaries only; avoid `getLayout()` for every id, or store precomputed analytics fields on layout row.  

6. **Split `computeVerticalComparison`** to use lightweight metrics (utilization, shelf count) instead of `buildLayoutAnalyticsReport` per layout.  

7. **Catalog fetch:** remove redundant `GET /products` when vertical-scoped queries suffice.  

8. **Scene3D:** pause render loop when tab hidden (`document.visibilityState`) or when idle (render on demand).  

9. **Self-host fonts** or add `&display=swap` to Google Fonts URL.  

### P2 — Larger optimizations (same functionality)

10. **Layout payload pagination** — API returns shelves/aisles in chunks or separate resources (bigger refactor).  

11. **Canvas2D virtualization** — render only visible shelves in viewport.  

12. **Web Workers** for autogenerate / analytics (API-side job queue with polling).  

13. **CDN** for static `web/dist` assets.  

---

## 7. How to verify (diagnostics)

Run these on the server **without changing app logic**:

```bash
# 1. Measure asset sizes (already ~3.3 MB JS)
cd codebase && npm run build -w web

# 2. Time portfolio API (replace token)
curl -w "\nTIME:%{time_total}s SIZE:%{size_download}\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:4520/shelfpilot/api/analytics/portfolio

# 3. Time full layout fetch
curl -w "\nTIME:%{time_total}s SIZE:%{size_download}\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:4520/shelfpilot/api/layouts/<layout-id>

# 4. Cold start — watch API logs for demo_bootstrap duration
docker compose logs api | grep demo_bootstrap

# 5. Browser DevTools → Network: check Transfer size vs Resource size (gzip)
# 6. Browser Performance tab: record Dashboard load and Layout Editor 3D view
```

---

## 8. Conclusion

The application is **functionally rich but delivery-heavy**: a demo-scale layout platform shipping a **3+ MB JavaScript payload**, **uncompressed over the wire**, with **server-side analytics that re-parse entire store layouts on every dashboard visit**, and **3D rendering that never sleeps**.

The **top three root causes** for “heavy load” and “system loading time”:

1. **Monolithic frontend bundle** (Three.js + editor + xlsx + PDF on first load)  
2. **`/analytics/portfolio` loading and analyzing every full layout**  
3. **Synchronous demo bootstrap + no compression** on production deploy  

Addressing P0 items alone should produce a **noticeable improvement** without changing any user-facing behavior.

---

_Related: [PENDING.md](./PENDING.md) · [ARCHITECTURE_LOCAL.md](./ARCHITECTURE_LOCAL.md) · [deploy/README.md](../codebase/deploy/README.md)_
