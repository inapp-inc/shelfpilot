# ShelfPilot — Need Works (Consolidated Issues & Work Items)

**Date:** 2026-09-11 (updated with a direct source-code read of the hot paths — §1.5)
**Compiled from:** `project.md`, `Docs/PERFORMANCE_ANALYSIS.md`, `Docs/PERFORMANCE_REMEDIATION_PLAN.md`, `Docs/PENDING.md`, `Docs/HANDOVER.md`, `Docs/HANDOVER_PRODUCTION_MIGRATION.md`, `Docs/automation/COVERAGE_MATRIX.md`, `openspec/**`, `.cursor/skills/**` — cross-checked against the current code in `codebase/` (not just doc claims), plus a full read of `sqlite.js`, `analyticsReports.js`, `layoutPacker.js`, `routes/layouts.js`, `App.jsx`, `Canvas2D.jsx`, `LayoutEditor.jsx`, `Scene3D.jsx` (§1.5 findings spot-verified line-by-line, not just grepped).
**Purpose:** Single backlog of what's actually still slow/broken/missing, so work can be picked up here in Claude Code. Each item has an ID for tracking; use it in commit messages / PRs.

> Methodology note (per `.cursor/skills/coding/SKILL.md` and OpenSpec convention used throughout this repo): implementation work below should go through a spec slice — update `openspec/specs/**` or open an `openspec/changes/<slug>/` folder, and `Docs/openapi.yaml` if an endpoint changes — **before** code, not after. ADR-0011 (Scaling & Performance) says "measure before optimizing" — several items below need a profiling pass, not a blind fix.

---

## -1. Critical correctness bugs found 2026-09-14 (product-facing, not performance)

Found while investigating a user report: "Smart Generate works, but products aren't filling the shelves, and the 3D view doesn't show products properly."

### BUG-01 — Planogram auto-fill exhausted after a handful of placements — **fixed**

**Root cause**, confirmed end-to-end against the real seeded demo catalog (not guessed): `planogramAutoFill.js`'s `fillPlanogramsForLayout` tracked `usedProductIds` as a single Set **global across the entire layout** — once a product SKU was placed on any one shelf, it could never be placed again anywhere else in the store, even on other shelves of the same category. Real stores obviously repeat the same SKU across many shelf facings; this policy meant every layout's fill exhausted almost immediately once each category's unique catalog SKUs ran out.

**Measured impact (before fix), full 130-product demo catalog, layout generated end-to-end via the real autogenerate + fill pipeline:**

| Vertical | Shelves filled | Placements | Coverage |
|---|---|---|---|
| Hypermarket (rich catalog, 130 matching products) | 6/100 (6%) | 11 | 8% |
| Pharmacy (thin catalog, "rx" category had 0 matching products, "otc" had 2) | ~0-4/174 | ~2-4 | ~0% |

**Fix:** `usedProductIds` scoped per-shelf-face instead of global (so a single shelf's own levels still never show the same SKU twice — no visual repetition on one unit), and a per-category rotation cursor now carries across shelves so different shelves of the same category start from different points in the candidate list, spreading catalog variety across the store instead of every shelf repeating the same first few SKUs. This was confirmed as the intended product direction before implementing (user: fill "based on shelf and product availability... dimensions all matching").

**Measured impact (after fix), same test:**

| Vertical | Shelves filled | Placements | Coverage |
|---|---|---|---|
| Hypermarket | 88/100 (**88%**) | 176 | 75% |
| Pharmacy | 74/174 (**43%**) | 117 | 21% |

Pharmacy's remaining gap (100 categorized-but-empty shelves) is **not a code bug** — it's FEAT-08 below: the demo catalog's "rx" (Prescription) category has zero matching products at all; no fill algorithm can place products that don't exist in the catalog.

Files changed: `api/src/services/planogramAutoFill.js` (the fix), `api/test/planogram-autofill.test.js` (one test asserted the old "at most one shelf" behavior by name — rewritten to assert the new, confirmed-correct invariant: repeats allowed across shelves, never within one shelf face's own levels). Full suite 264/264 after the change. This also directly explains the "3D view not showing products" complaint — Scene3D correctly renders whatever planogram data exists; with 6-8% of shelves having any data, the 3D view necessarily looked mostly bare. No Scene3D bug was found or needed fixing for this.

### BUG-02 — React hooks called conditionally after an early return — **fixed**

Found via TOOL-01 below (fixing the linter surfaced this immediately). `MissingProductsPanel.jsx` (the panel showing catalog products not yet placed on any shelf — directly relevant to "product mapping not complete") had `if (!alwaysShow && !coverage && !loading) return null;` **before** ~10 `useState`/`useMemo`/`useEffect`/`useCallback` calls. Whenever that condition's truth value changed between renders (e.g. `coverage` prop goes from `null` to populated, which happens naturally as data loads), React would call a different number of hooks than the previous render — this throws "Rendered more hooks than during the previous render" and crashes that component's subtree. **Fixed** by moving the early-return to just before the component's final JSX return, after all hooks (React's standard fix — hooks must run unconditionally on every render). Verified: `npx eslint` on the file now reports 0 `rules-of-hooks` errors (was 15); build clean.

### BUG-03 — Back half of a gondola rendered with no products in 3D — **fixed**

User report: "I click a shelf in 2D with products on every level, hit View in 3D, and the shelf I clicked has no products." Reproduced on a generated vertical layout and traced with in-page instrumentation rather than by reading code — the planogram data was present all the way into the renderer (all 112 shelves had 3 rows on both faces, and `collectShelfFacingInstances` emitted 3 undimmed rows for the clicked face), so the drop had to be downstream.

Root cause in `Scene3D.jsx` `expandFacingInstances()`: `shelfCap` (the per-shelf facing budget, `MAX_FACINGS / unitCount`) was enforced with a **single counter shared by both faces** of a double-sided unit, and `resolveFacePlanograms()` always returned faces in a fixed `[A, B]` order. On a gondola whose front face alone exhausted the cap — measured: face A took all 285, face B got **0** — the back half rendered its decks and uprights but not one product mesh. It only bit richly-stocked gondolas, which is why it looked intermittent. **Fixed** by (a) splitting the allowance evenly per face (`capPerFace = shelfCap / faceCount`, so the per-unit mesh total is unchanged — no added render cost) and (b) ordering the faces so the face being looked at is filled first. Measured after: 142 facings on each face of every focus-group unit.

### BUG-04 — 3D "three nearby shelves" focus group picked the wrong shelves — **fixed**

User report: "need to see 3 shelves nearby selected shelves with products, still showing back view of products." `focusGroupFor()` (`layout-editor/shelfFocusGroup.js`) sliced its window out of `shelvesOnAisle()` ordered by `shelfIndexAlongAisle`. But one aisle record binds **both halves of every gondola and more than one gondola column**, so consecutive indices are not neighbours. Measured on a generated vertical layout: indices 0/1/2 were the clicked shelf, *its own back half* (which renders as the same merged unit), and a gondola in the next column 2.5m to the side — so the "three-shelf" group drew **two** units, one of them across the way. That also wrecked the camera, which derives its along-the-aisle offset from the group's extent.

**Fixed** by keeping the aisle binding as the candidate set (project.md §9 — aisle binding still owns shelf identity) but ordering the window by real position along the run: same facing within 14°, within ~1.85 × depth laterally, sorted by the run-axis projection. The rotation filter also drops the target's own back half, since front/back differ by 180°. Verified on both a vertical (rot 90/270) and a horizontal (rot 0/180) generated layout: 3 distinct consecutive gondolas, centred on a mid-run target, correctly one-sided at the ends of a run. Guarded by `shelfFocusGroup.test.js` (6 tests).

Related camera fix in the same pass: `shelfGroupFocusCamera()` applied its sideways offset in a fixed direction, so clicking a shelf at the **end** of a run walked the camera off the end of the run and framed empty floor. It now projects the anchor→group-centroid vector onto the aisle axis and steps the opposite way, so the neighbours always recede *behind* the selected shelf.

### BUG-05 — 3D highlight glow painted onto neighbour shelves, not just the selected one — **fixed**

User report (on a real layout, shelf "7E", fully allocated): "the products not showing in 3D shelves also showing red color on nearby shelves as well — only need to show red color on selected shelves only." Traced by introspecting the live Three.js scene graph (`window.__SP_SCENE.traverse(...)`, reading each shelf group's material `emissive`/`opacity`) rather than reading code alone, since the effect is visually subtle (emissive intensity 0.14–0.55) and easy to misjudge from a screenshot.

Root cause: six separate spots in `Scene3D.jsx` (the shelf frame, both merchandising boards, both per-level board pairs, and the product-instance flags) gated their highlight color on `isHighlighted` — true for the *entire* FR-VIEW-02 three-shelf focus group — instead of `isTarget`, true only for the shelf actually clicked. `resolveActiveFaceForHighlight()` falls back to the same `activeFace` letter for every unit in the group, so all three shelves satisfied `isHighlighted && activeFace === "A"` and all three got the glow — worst on the product boxes, whose emphasized-state emissive color is `SCENE_COLORS.shelfDefault` (`#9F1239`, a crimson red) laid directly over the product texture.

**Fixed** by changing every one of those six gates from `isHighlighted` to `isTarget`, and extracting the product-instance flag logic into a pure, exported, unit-tested function (`productHighlightFlags()`, 7 tests in `productHighlightFlags.test.js`) so this can't silently regress again. Verified on the live scene graph: before the fix, 2–3 shelf groups carried emissive materials for one focus click; after, exactly 1 (the clicked shelf), while the 2 context neighbours render at full opacity/brightness with zero emissive tint (still visible, just not glowing), and everything outside the group stays dimmed to 0.28 opacity as before.

### FEAT-08 — Demo catalog is overwhelmingly hypermarket/grocery-themed — new finding

The 129 seeded product images (`Docs/products/images/`) are fruits, pantry staples, snacks — hypermarket/grocery content. Non-grocery verticals have almost no real matching products: **pharmacy "Prescription" (rx) category: 0 matches. "OTC": 2 matches**, out of 130 total products. Beauty/apparel/convenience are likely similarly thin (not yet measured). This is a content gap, not a code defect — BUG-01's fix maximizes what's possible with existing content, but pharmacy/beauty/apparel layouts will still show partial fill until the catalog gets vertical-appropriate products. Options: (a) add a small set of real pharmacy/beauty/apparel product images+data to the seed catalog, (b) accept partial fill for non-grocery verticals in demos, (c) scope demo walkthroughs to hypermarket/grocery where the catalog is strong. Needs a product decision, not something to guess at.

### TOOL-01 — ESLint provided zero signal on any `.jsx` file project-wide — **fixed**

`npm run lint`'s flat config was missing `parserOptions.ecmaFeatures.jsx`, so every `.jsx` file (~30 files) failed with `Parsing error: Unexpected token <` — this had been true before any of today's changes (verified: `App.jsx` failed identically pre-edit). Fixed the parser config, then installed `eslint-plugin-react-hooks` (was imported-by-convention via `eslint-disable-next-line react-hooks/exhaustive-deps` comments already in the codebase, but never actually installed — those disable comments were referencing a rule that didn't exist, which is itself a lint error). Scoped to just `rules-of-hooks` (error) and `exhaustive-deps` (warn) — **not** the full `recommended`/`recommended-latest` bundle, which in v7 folds in the newer React Compiler rule set (purity, immutability, set-state-in-render, etc.) — a much stricter, unreviewed-for-this-codebase set of checks that would need its own separate adoption decision. This is exactly the tooling gap that let BUG-02 ship undetected — restoring it is what surfaced BUG-02 within minutes.

---

## 0. Reality check on "the system is slow"

`PERFORMANCE_ANALYSIS.md` (2026-08-11) and `PERFORMANCE_REMEDIATION_PLAN.md` mark **Phase 1–3 as ✅ DONE**. I verified this against the actual code rather than trusting the doc:

| Claimed fix | Verified in code? |
|---|---|
| Express `compression` middleware | ✅ `api/src/index.js:2,46` |
| Route-level code splitting (`React.lazy`) | ✅ `web/src/lazyWithRetry.js` + lazy imports |
| Vite `manualChunks` (vendor-three/xlsx/pdf split) | ✅ `web/vite.config.js:21` — confirmed by fresh build below |
| Demo bootstrap moved off the request path (after `listen()`) | ✅ `api/src/index.js:107-129`, runs in `setImmediate` |
| Portfolio analytics cache (TTL) | ✅ `api/src/services/portfolioAnalyticsCache.js`, wired into `routes/analytics.js` |
| Autogenerate concurrency guard (503 on overlap) | ✅ `api/src/routes/layouts.js:1551` |
| Scene3D pauses render loop on tab hidden | ✅ `visibilitychange` listener in `Scene3D.jsx` |
| Canvas2D viewport virtualization | ✅ `viewportCull.js`, wired into `Canvas2D.jsx` |
| `express.json` limit reduced from 25 MB → 5 MB | ✅ `JSON_BODY_LIMIT_MB` default 5 |

**Fresh production build (today):**

| Chunk | Size (gzip) | Loads when |
|---|---|---|
| `index-*.js` (app shell) | 252 KB (77 KB gz) | Always |
| `index-*.css` | 170 KB (31 KB gz) | Always |
| `DashboardPage-*.js` | 64 KB (17 KB gz) | Dashboard route |
| `LayoutEditor-*.js` | 162 KB (48 KB gz) | Editor route only |
| `vendor-three-*.js` | 532 KB (135 KB gz) | Only when 3D view opened |
| `vendor-xlsx-*.js` | 425 KB (142 KB gz) | Only on catalog Excel import |
| `vendor-pdf-*.js` + worker | 365 KB + 1.38 MB | Only on floor-plan PDF import |

So the **P0/P1 frontend-bundle and backend-request-path fixes described in the docs are real and already shipped**, not just aspirational. This means the "very slow" symptom right now is most likely one of:

1. **The deployed production build is stale** — an older zip/image without these fixes. Check `docker compose logs shelfpilot | grep startupMs` and confirm `SKIP_DEMO_BOOTSTRAP=1` is actually set on the server ([DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md)), and that the running image was built **after** 2026-08-11.
2. **Dev mode, not prod** — `npm run dev` (Vite dev server, unminified, no gzip) is inherently slower than a built/served bundle; this is expected and not itself a bug.
3. Slowness introduced by **Phase 4 gaps** (below) — these were explicitly scoped out of Phase 1–3 as "not required for demo stability."
4. A **new regression** not yet analyzed — see §1.4.

**WI-000 (do first):** Confirm which of the above is actually happening before writing more optimization code — get the server's `startupMs`/`demo_bootstrap_complete` log line, a hot-path Network-tab trace, and `docker stats` memory, per §7 of `PERFORMANCE_ANALYSIS.md`. Optimizing blind here risks re-doing work that's already shipped.

---

## 1. Performance — confirmed still open

### 1.1 Phase 4 (architecture) — never started

| ID | Item | Why it matters |
|---|---|---|
| PERF-01 | ~~No precomputed analytics columns~~ — **corrected 2026-09-11, this was an overclaim.** `portfolioKpis` IS precomputed once (on every `saveNormalized`, via `computePortfolioKpis`) and stored inside the `payload` JSON blob; `listLayoutPortfolioSummaries` reads it cheaply via `json_extract(payload, '$.portfolioKpis')` (`sqlite.js:786-817`) instead of recomputing full reports. The real, narrower gap: it's JSON-embedded rather than a typed SQL column, so it can't be indexed/queried by SQL directly — minor, not the "everything recomputed" picture originally implied. | Genuinely low priority now — Phase 2.1's "DONE" claim in `PERFORMANCE_REMEDIATION_PLAN.md` was accurate after all. |
| PERF-02 | No background job worker for autogenerate/analytics | Smart Generate still runs synchronously on the request thread (guarded by 503 concurrency cap, but not offloaded) |
| PERF-03 | No CDN for `web/dist` static assets | Single Node process serves JS/CSS/images directly |
| PERF-04 | No rate limiting on any endpoint | **Fixed 2026-09-11** — see below. |

### 1.2 SQLite operational hygiene

| ID | Item | Why it matters |
|---|---|---|
| PERF-05 | Local `api/data/` has multiple abandoned DB files (`shelfpilot-docker.db`, `shelfpilot-live.db`, `tmp-kioskqa.db`, `tmp-kioskqa2.db`, `tmp-visual-check.db`) plus a 4 MB uncheckpointed `-wal` file | Not a production bug (properly gitignored), but indicates ad-hoc DB creation during dev/testing with no cleanup script — worth a `npm run clean:data` helper so stale local state doesn't get mistaken for the real slowdown |

### 1.3 Not yet measured (per ADR-0011, "measure before optimizing")

| ID | Item |
|---|---|
| PERF-06 | No APM/tracing in place — `PERFORMANCE_ANALYSIS.md §7` gives manual `curl -w` diagnostics but there's no persisted metric. Add a minimal timing log (already partially done via `demo_bootstrap_complete`/`startupMs`) for `/analytics/portfolio`, `/layouts/:id`, and `/autogenerate` so future slowness has hard data instead of guesswork. |
| PERF-07 | Large-layout editor performance (200+ shelves, viewport culling already in place — §1 confirms) has not been re-benchmarked since PERF fixes shipped. Re-run the original diagnostic steps in `PERFORMANCE_ANALYSIS.md §7` against today's build and record numbers in this doc or a new `PERFORMANCE_VERIFICATION_2026-09.md`. |

### 1.4 Deployment-side (likely root cause of "still slow")

| ID | Item |
|---|---|
| PERF-08 | Verify `foundry.inapp.com` (or wherever it's deployed) is running an image built from current `master`, not a pre-Aug-11 build. `DEPLOYMENT_WORKFLOW.md` requires a manual package+deploy step — there's no CI/CD pipeline auto-deploying on merge, so drift between `master` and production is easy to miss. |
| PERF-09 | Confirm host nginx actually has `gzip on` (Phase 0.2) — this lives outside the repo (host config), so it can't be verified from code and is a common thing to forget on redeploy. |

### 1.5 Code-level hot-path findings (deep source review, 2026-09-11)

Read (not grepped) the actual hot-path files — `sqlite.js`, `analyticsReports.js`, `layoutPacker.js`, `routes/layouts.js` on the backend; `App.jsx`, `Canvas2D.jsx`, `LayoutEditor.jsx`, `Scene3D.jsx` on the frontend. Spot-verified the highest-impact ones directly (line numbers below are confirmed, not agent-reported-only). Ranked by actual impact, not effort.

**Backend**

| ID | File:Line | Problem | Fix |
|---|---|---|---|
| PERF-10 | `api/src/services/analyticsReports.js:541-591` (`computeCategoryAdjacency`) | O(shelves²) pairwise-distance loop, then an O(categories²) matrix build that re-`.filter()`s the full pairs array per cell — worst case O(shelves² × categories²). Runs on every analytics/summary request. | **Fixed 2026-09-11** — replaced the all-pairs distance scan with fixed-radius spatial hashing (`shelfPairsWithinThreshold`: grid cell size = threshold, 3×3 neighborhood scan; found-pairs sorted back to the original i-asc/j-asc order since downstream truncates to `pairs.slice(0,20)` and order-sensitive callers depend on it), and replaced the per-cell `.filter()` with a `Map`-based single-pass count. Verified: full suite 264/264, no output changes. |
| PERF-11 | `analyticsReports.js:1089` calls `computeCategoryAdjacency` directly, then `:1091` calls `computeRegulatoryCompliance` which **calls it again internally** (`:637`) — **confirmed by direct read**: the O(n²) work from PERF-10 runs twice per single report. | **Fixed 2026-09-11** — `computeRegulatoryCompliance` now accepts an optional `precomputedAdjacency` param; `buildLayoutAnalyticsReport` passes the already-computed result instead of recomputing. Verified via `analytics-reports.test.js` and the full suite. |
| PERF-12 | `layoutPacker.js:590-609, 646-668, 998-1006, 1054-1060` | Every candidate shelf/aisle placement during Smart Generate is checked against **every already-placed** shelf/aisle via linear scan — no spatial index. Packer cost grows O(shelves²) as a store fills up. | **Deliberately not attempted 2026-09-11** — unlike PERF-10, this isn't a simple radius query: `measureFaceGap`/`buildShelfFaceAisles`/`consolidateNearbyAisles`/`dedupeOverlappingParallelAisles` interact through directional, tolerance-sensitive geometry (parallel-run overlap thresholds, axis-dependent edge distances) across ~10 helper functions. It's the core Smart Generate algorithm with no way for me to visually verify a real layout — a wrong spatial-index rewrite could pass the test suite while producing subtly broken layouts. Needs a dedicated pass with visual QA, not a batch fix. |
| PERF-13 | `api/src/store/sqlite.js` — **confirmed by direct read**: 14 call sites (e.g. `:458` `findUserByEmail`, `:572` `getSession`, `:642` `getConfig`) call `getDb().prepare(sql)` inline on *every invocation* instead of preparing once and reusing the `Statement`. `getSession` runs on every authenticated request. | **Fixed 2026-09-11** — added a `prepared(sql)` helper caching `Statement` objects in a `Map` keyed by SQL text (cleared in `resetDbForTests()`); all 14 call sites now go through it. Verified: full suite 264/264. |
| PERF-14 | `sqlite.js` — no index on `layouts.status`, `layouts.vertical`, or `layouts.updated_at`; `listLayouts`/`listLayoutPortfolioSummaries` do a full table scan + sort on every dashboard load. | **Fixed 2026-09-11** — added `idx_layouts_status`, `idx_layouts_updated_at`, `idx_layouts_vertical`, and `idx_sessions_user_id` (same pattern as the existing `idx_products_*` indexes). |
| PERF-15 | `api/src/routes/layouts.js` (`saveNormalized`, called from nearly every mutating aisle/zone/fixture/shelf/planogram endpoint) | Even a single-field PATCH (e.g. rename one aisle) re-runs full `normalizeLayout` + aisle/containment/overlap validation + `computePortfolioKpis` over the **entire** layout, then re-serializes the whole payload back to SQLite. | **Not attempted** — same risk class as PERF-12: `normalizeLayout`/`computePortfolioKpis` are relied on by nearly every route and test in the suite; scoping them down safely needs a dedicated architectural pass, not a sweep-in edit. |
| PERF-16 | `routes/layouts.js` inside `refreshValidation` (called from `saveNormalized`) | Synchronous `console.log(JSON.stringify(...))` fires on essentially every mutating layout request. | **Fixed 2026-09-11** — gated behind `DEBUG_AUTO_CALC=1` (off by default). |
| PERF-17 | `routes/layouts.js` `GET /layouts` | Returns the full result set with no `limit`/`offset` — fine at demo scale, won't stay fine. | **Fixed 2026-09-11** — added opt-in `?limit=&offset=` (applied *after* the Customer-role RBAC filter, so results stay correct for that role); omitting them preserves the exact current response shape (`{ items }`), so no caller needed to change. |

*(Positive, already good: polygon vertex count is capped in `polygonContainment.js`; `listLayoutPortfolioSummaries` already avoids full-blob parsing via `json_extract` — only plain `getLayout` pays that cost.)*

**Frontend**

| ID | File:Line | Problem | Fix |
|---|---|---|---|
| PERF-18 | `web/src/App.jsx:279-285` | Effect deps include `page`, but the body unconditionally re-fetches `GET /layouts` and `GET /admin/config` — so navigating Dashboard→Catalog→Admin→Dashboard re-fetches both every time even though nothing changed. | **Fixed 2026-09-11** — dropped `page` from the dependency array. Safe because every mutation that changes the layouts list already calls `refreshLayouts()` explicitly (verified 3 call sites). |
| PERF-19 | `App.jsx:160-164` and `:313-317` | Two separate effects both call `loadCatalog(vertical)` when a layout opens (one keyed on `catalogVertical`, one on `layout?.vertical`) — they fire back-to-back with the same vertical, fetching categories+products twice. | **Fixed 2026-09-11** — rather than merge/remove one effect (risk: the two conditions aren't identical — one covers the general Catalog page too), added an in-flight dedup guard inside `loadCatalog` itself (`catalogLoadRef`): a second call for the same vertical while one is pending joins the existing promise instead of firing a new fetch. Deliberate sequential refetches after mutations (8 call sites) are unaffected since any prior call has already settled by the time those run. |
| PERF-20 | `App.jsx:539-561` (`loadCatalog`) | Categories fetch via `Promise.all`, then products is `await`ed afterward even though it doesn't depend on the category result for the single-vertical path. | **Fixed 2026-09-11** — the single-vertical products request now starts alongside the categories request instead of after it. |
| PERF-21 | `layout-editor/LayoutEditor.jsx` (drag state around `:118`/`:807`) | `setDragPos` fires on every raw `mousemove` while dragging a shelf, with no rAF/throttle, inside a **2500+ line component with ~40 `useState` hooks** that also renders the palette/property panel/side rail — so every mouse-move re-renders the whole editor shell, not just the dragged shelf. | **Fixed 2026-09-11** — coalesced `setDragPos` to one call per animation frame (`requestAnimationFrame`, with `cancelAnimationFrame` on effect cleanup). Validation and the final committed position are unaffected — `onUp` always recomputes from the raw mouseup event, not from throttled state. |
| PERF-22 | Whole `web/src` — **confirmed by grep**: zero uses of `React.memo` anywhere in the codebase. `Canvas2D.jsx` (2000+ lines) and `LayoutEditor.jsx` (2500+ lines) map shelves/aisles with inline arrow-function props and no memo boundary, so PERF-21's re-render hits every shelf/aisle node. | **Not attempted 2026-09-11** — doing this safely means extracting each shelf/aisle render block (inline JSX inside `.map()`, ~150-300 lines each, closing over many outer variables) into standalone components with exactly the right props threaded through. No test or visual coverage to catch a missed closure capture. PERF-21 (done) addresses the re-render *frequency* driver directly; this is the remaining re-render *scope* layer — do as a dedicated, carefully-verified extraction. |
| PERF-23 | `Scene3D.jsx` `animate()` loop (~`:1550`, `:1624`) | Allocates fresh `THREE.Vector3()` instances every rendered frame (walk-mode `forward`/`right` vectors, label-sprite distance calc) — steady GC pressure while 3D/walk mode is open. | **Fixed 2026-09-11** — hoisted 4 reusable scratch `Vector3`s to the effect's outer closure, mutated via `.set()`/`.crossVectors()` instead of allocated fresh. Confirmed none of the 3 allocation sites retain a reference across frames (only `.x`/`.z` numeric reads escape the synchronous block) before changing this. |
| PERF-24 | `Scene3D.jsx` main scene-build effect (`:918-1754`) | Tears down and rebuilds the **entire** THREE scene (all geometry/materials/meshes) whenever the `products` or `categories` array identity changes — not just when the layout changes. Editing the catalog while the 3D view is open forces a full rebuild. | **Not attempted 2026-09-11** — same risk class as PERF-22: splitting an 836-line scene-construction effect (many interdependent locals — `shelfLabelSprites`, `avatar`, the `animate` closure itself) without visual QA risks silently breaking 3D rendering. Needs a dedicated pass. |

*(Positive, already good: `Scene3D.jsx` shares one module-level texture cache keyed by URL and uses `THREE.InstancedMesh` for facings — not per-instance meshes/textures; `Canvas2D.jsx` already `useMemo`s its viewport-cull derivations correctly; `AnalyticsWidgetBoard.jsx` already parallelizes its API calls.)*

| ID | Item | Note |
|---|---|---|
| TOOL-01 | `npm run lint` (root) fails with `Parsing error: Unexpected token <` on **every** `.jsx` file project-wide (~30 files) — discovered while verifying the frontend changes above. Pre-existing, not caused by anything in this doc; `App.jsx` fails identically before and after edits. The root `eslint.config.js` isn't resolving a JSX parser for `.jsx` when run via the configured `lint` script. | Not fixed — out of scope for a performance pass, but means ESLint has been providing **zero** signal on any `.jsx` file for some time. The Vite build (which correctly transforms JSX) was used as the correctness check for all frontend edits in this doc instead. Worth a dedicated fix — likely a missing `parserOptions.ecmaFeatures.jsx` or file-extension glob in the flat config. |

| ID | Item | Note |
|---|---|---|
| QA-03 | `web/package.json` `"test"` script was a **literal no-op stub**: `echo "UI smoke via manual/API tests" && exit 0`. No `vitest`/`jest`/testing-library dependency anywhere — frontend testing was never scaffolded, not just "unused." | **Fixed 2026-09-11** — added `vitest` (devDependency), `web/vitest.config.js` (Node environment, separate from the production `vite.config.js`), and 30 tests across 2 files: `layout-editor/viewportCull.test.js` (the culling math) and `rolePermissions.test.js` (RBAC — chosen because I'd just edited routing-adjacent logic in `App.jsx`). `layoutMath.js` turned out to be a **backend** module (`api/src/services/`), already covered by `npm test -w api` — corrected from the original (slightly wrong) suggestion. `npm test -w web` now runs `vitest run`; 30/30 passing. This is a starting scaffold, not full coverage — `Canvas2D.jsx`/`LayoutEditor.jsx`/`Scene3D.jsx` still have none (would need `@testing-library/react` + jsdom for component-level tests, a bigger addition). |

---

## 2. Correctness / quality risk (new finding — not previously documented)

| ID | Item | Evidence | Status |
|---|---|---|---|
| **QA-01** | `npm test` in `codebase/api/package.json` only ran **34 of 52** test files. The `"test"` script hardcoded an explicit file list instead of discovering everything under `test/`. **18 test files were never executed** by `npm test` (and therefore likely never by CI): `aisle-binding-vertical`, `aisle-coverage`, `aisle-shelf-view`, `auth-roles`, `delete-layout`, `delete-shelf-aisle`, `missing-products-tree`, `packer-aisle-clear`, `packer-fill-leftover`, `packer-no-overlap`, `placement-index`, `product-buffer`, `temporary-storage`, `vertical-orientation`, `warehouse-layout` (and more). | Diffed `package.json` test script against `ls api/test/*.test.js` | **Fixed 2026-09-11** — `"test": "node --test test/"` failed on this Node build (directory arg not resolved); changed to bare `"test": "node --test"`, which auto-discovers `**/*.test.js` from cwd. Verified: 264 tests now collected (was 34 files' worth before). |
| QA-02 | Consequence of QA-01: recently-added features that this project's own docs call "Done" — **FR-BUF-01 (product buffer)**, **FR-TEMP-01 (temporary storage)**, **FR-WH-01 (warehouse type)** — have dedicated test files that silently don't run. Regressions in these areas would not be caught. | `product-buffer.test.js`, `temporary-storage.test.js`, `warehouse-layout.test.js` all excluded per QA-01 | Superseded by QA-01 fix — these now run. |

**Result of turning the missing 18 files back on:** 4 failures surfaced immediately, confirming the exact risk QA-01/QA-02 predicted. Triaged all 4:

| ID | Test | Root cause | Status |
|---|---|---|---|
| QA-01a | `product-buffer.test.js:13` | Test bug, not a product bug: `assert.equal(productSlotWidthMeters(0.2), 0.21)` fails on ordinary IEEE-754 float drift (`0.2 + 0.01 = 0.21000000000000002`). | **Fixed** — changed to a tolerance check (`Math.abs(actual - 0.21) < 1e-9`). |
| QA-01b | `delete-layout.test.js:78` | Test bug: calls `login(port, "Viewer")` but the helper's default email is `designer@shelfpilot.local`, so it logs in as Designer-email + Viewer-role → `403 role_mismatch` from `auth.js:15`. The seeded Viewer account is `viewer@shelfpilot.local` (`sqlite.js:302`). | **Fixed** — pass the correct seed email explicitly. |
| **QA-04** | `delete-shelf-aisle.test.js:70` — "delete shelf removes shelf and its mapping" | **Confirmed real product bug**, root-caused via a throwaway repro script. `DELETE /layouts/:id/shelves/:shelfId` correctly empties `layout.shelfMappings` — but never touches the **legacy synced field** `layout.mappings`. `saveNormalized()` → `normalizeLayout()` (`layoutNormalize.js:116-126`) then sees `shelfMappings.length === 0` and **backfills it from the stale `layout.mappings`**, resurrecting the just-deleted mapping. | **Fixed 2026-09-11** — `routes/layouts.js`'s shelf-delete handler now also filters `layout.mappings` by the same `removeIds` set. Verified via repro script (mapping no longer resurrected) and the full suite. |
| **QA-05** | `delete-shelf-aisle.test.js:94` — "delete aisle removes aisle, its mapping, and detaches shelves" | Root-caused via repro script: the shelf fixture at `(x:2,y:2)` genuinely **overlaps the aisle's corridor** (aisle at `x:1,y:1`, `widthMeters:1.5` → occupies `y:[1, 2.5]`), so `POST /shelves` correctly returns `400 overlap_violation` — this is a **test-fixture bug, not a product bug**. Separately, moving the shelf to `(x:2,y:6)` to clear the overlap surfaced a *different*, more interesting finding: manually `PATCH`-assigning `shelf.aisleId` doesn't persist — this app's aisle-binding system (`project.md` §9: "Aisle binding is the source of truth for shelf identity") re-derives `aisleId` from geometry on every normalize, including synthesizing a fallback "Walk aisle" (`source: "auto"`) when no real aisle faces the shelf. This is **intentional, documented architecture, not a bug** — the original test's premise (manual PATCH → persists → nulled on delete) doesn't match how binding actually works. | **Fixed 2026-09-11** — moved the shelf fixture to a non-overlapping position, added a `shelfRes.status` assertion (so a future validation failure fails loudly instead of crashing on `undefined.shelves[0]`), and replaced the final assertion with the invariant that actually holds: the shelf must stop referencing the *deleted* aisle's id (it may legitimately rebind to a different/synthesized one — asserting `null` was asserting an implementation detail this app doesn't have). |

**Current suite status: 264/264 passing** (was 34-files'-worth passing, silently, before today's QA-01 fix). Both real bugs found by turning the missing tests back on are now fixed and verified; nothing left red.

---

## 3. Documentation drift — **fixed 2026-09-11**

Per `Docs/PENDING.md §1`, several docs already knew they were stale — this was a pre-existing, self-reported gap. All four now updated:

| ID | File | Fix |
|---|---|---|
| DOC-01 | `project.md` §1, §3, §4, §7, §10 | Was: Customer role, Warehouse type, temporary storage, aisle-selection fix marked "planned"/"in progress". Now: all marked Done, with "(core)" / open-question caveats preserved where real follow-up remains (Warehouse editor-UX decision, Customer multi-store picker deferred). §6 rewritten from "Agreed next" to "delivered" with a status table. |
| DOC-02 | `Docs/HANDOVER.md` | Was: dated 2026-07-15, "25 API tests passed". Now: notes 264 tests passing, plus the QA-01 test-script-exclusion history and the SEED-01 OpenAPI gap, so it doesn't silently go stale the same way again. |
| DOC-03 | `Docs/DEMO_CHANGES_SUMMARY.md`, `Docs/BRD_ADDENDUM_DEMO_AUG_2026.md` | Was: "planned"/"Discovery" status for FR-BUF-01/TEMP-01/CUST-01/VIEW-01/WH-01/AISLE-01-02. Now: all marked Done with code pointers (`productBuffer.mjs`, `temporaryStorage.js`, `warehouseLayout.mjs`, `AisleShelfViewModal.jsx`); §3.6 "known demo gap" reframed as resolved; §7 delivery order marked complete. |
| DOC-04 | `openspec/project.md` | Was mirroring root `project.md`'s stale "planned" language in its own Modules/Next sections. Now synced to Done. |

`PENDING.md §1` itself updated to reflect the fix rather than re-describing the (now resolved) gap.

---

## 4. Product / feature work items still open

Pulled from `PENDING.md §2` and BRD addendum §6 — still genuinely unresolved, not doc drift:

| ID | Item | Notes |
|---|---|---|
| FEAT-01 | Warehouse vs retail — same editor/canvas or separate skin? | Open design question, BRD §6 Q1 |
| FEAT-02 | Which layouts are visible to the Customer role — approved-only, or assigned-store only? | Open design question, BRD §6 Q2 — currently assigned-store only, not formally decided |
| FEAT-03 | Product buffer (1 cm) — auto-fill only, or also shown in manual planogram facing preview? | BRD §6 Q3 |
| FEAT-04 | Does temporary storage consume capacity in fixture auto-calc? | BRD §6 Q4 |
| FEAT-05 | Customer 2D map — needs a separate label profile (aisle numbers in corridors only), screen-relative route styling, browse vs guided modes | Spec exists: `Docs/SHOPPER_KIOSK_2D_MAP_UX_SPEC.md`, "Phase 1 done", follow-up not started |
| FEAT-06 | Multi-store picker for Customer role | Explicitly out of scope for now (`CustomerShopPage`) — confirm still desired before building |
| FEAT-07 | Warehouse demo bootstrap layout for live demos | `bootstrapDemo.js` — nice-to-have polish item |

---

## 5. SEED plan — platform completeness (Partial → Todo)

From `Docs/SEED_PLAN_FULL.md` via `PENDING.md §5` — these work in the demo but aren't closed against the full FSD/UI source of truth. Full list of ~20 items lives in `PENDING.md`; highest-value to close first:

| ID | SEED | Gap |
|---|---|---|
| **SEED-01** | `SEED-00c-openapi-align` | OpenAPI doesn't match every live route — **contract drift risk**. Quantified 2026-09-11 (see below): `npm run openapi:check` only verifies a hardcoded 38-operation allowlist and reports PASS, giving false confidence — a real route-vs-spec diff found the actual gap. |
| SEED-02 | `SEED-08b-version-compare` / `SEED-08c-layout-versions` | Version compare UI / layout versioning UX still Todo |
| SEED-03 | `SEED-09-ui-reference` | UI parity vs `ui/ShelfPilot.dc.html` source-of-truth — Partial |
| SEED-04 | `SEED-04b-zones-polygon` | Zones + polygon completeness — Todo |
| SEED-05 | `SEED-02b-user-admin-crud` | Full user admin CRUD — Todo |

(Remaining ~15 items enumerated in `PENDING.md §5` — bring them here as they're picked up.)

### SEED-01 detail — real OpenAPI drift (quantified 2026-09-11)

Extracted every registered Express route (regex over all 7 `routes/*.js` files, method-aware,
handles both same-line and multi-line route registrations) and every documented operation in
`Docs/openapi.yaml`, then diffed both directions:

- **78 routes actually registered**
- **50 operations documented**
- **0 documented operations that aren't real routes** (no stale/removed-route docs)
- **28 registered routes with zero OpenAPI documentation:**

```
DELETE /categories/{categoryId}                    DELETE /layouts/{layoutId}
DELETE /layouts/{layoutId}/aisles/{aisleId}         DELETE /layouts/{layoutId}/floor-plan
DELETE /layouts/{layoutId}/obstacles/{obstacleId}   DELETE /layouts/{layoutId}/shelves/{shelfId}
DELETE /products/{productId}                        GET /admin/shopper-experience
GET /analytics/audit-summary                        GET /catalog/product-images
GET /layouts/{layoutId}/arrangement-summary          GET /layouts/{layoutId}/planogram/coverage
GET /shop/experience, /shop/layout, /shop/products (+ /shop/{layoutId}/* variants)
PATCH /categories/{categoryId}                       PATCH /layouts/{layoutId}/floor-plan
PATCH /layouts/{layoutId}/obstacles/{obstacleId}     POST /catalog/product-images/map
POST /catalog/product-images/sync                    POST /catalog/product-images/upload
POST /layouts/{layoutId}/arrangement/accept          POST /layouts/{layoutId}/floor-plan
POST /layouts/{layoutId}/obstacles                    PUT /admin/shopper-experience
```

**Why not fixed today:** writing accurate OpenAPI schemas (request/response shapes) for 28
endpoints requires tracing each handler's exact output — doing that from memory/inference risks
writing *wrong* documentation, which is worse than the current honest gap. This list is the
precise, ready-to-use checklist for whoever picks this up next (can also just run the diff again
— it's cheap: extract routes, extract `openapi.yaml` paths, `comm -23`/`comm -13`).

---

## 6. Test automation gap

`Docs/automation/COVERAGE_MATRIX.md`: **82 Playwright scenarios still `Todo`**, 50 `Automated` (counted directly from the matrix today — matches `PENDING.md`'s "~82 scenarios").

High-priority gaps (P0/P1) per `PENDING.md §6`:

| ID | Area | Examples |
|---|---|---|
| E2E-01 | Navigation | B-01 — Designer nav smoke (currently `Todo` despite being P0 @smoke) |
| E2E-02 | Store creation | C-05–C-09 non-Hypermarket store types, C-10 irregular polygon |
| E2E-03 | Portfolio | D-03 clone, D-04 delete, D-05 status filter |
| E2E-04 | Editor canvas | E-02 draw area, E-04/E-05 aisle tools, E-06 fixtures |
| E2E-05 | Smart Generate | Arrangement accept, warehouse vertical |
| E2E-06 | Customer / shop | Shop kiosk find product, Customer RBAC redirect |
| E2E-07 | 3D | Orbit/walk smoke, product images |

Given QA-01 (unit tests silently excluded), **fixing QA-01 first is higher leverage than adding new E2E coverage** — it's cheaper and closes a bigger silent gap.

---

## 7. Production-readiness (explicitly out of scope for the demo, but should be tracked)

From `Docs/HANDOVER_PRODUCTION_MIGRATION.md` — the local MVP is **not production-hardened**. Not urgent unless a real production rollout (beyond the demo box) is planned:

| Capability | Now | Needed |
|---|---|---|
| Identity | Mock email/password + role picker | Enterprise IdP (OIDC/SAML), MFA |
| Authorization | Role string on token | RBAC/ABAC, tenant isolation |
| Database | SQLite file on Docker volume | Managed DB (ADR-0004) |
| Deploy | Single-host Docker Compose, manual zip+deploy | CI/CD pipeline, orchestration, TLS, secrets management |
| Observability | Correlation ID + stdout only | Metrics, traces, alerts, dashboards — this would also directly help PERF-06 |
| HA / DR | Single node | Multi-AZ, backups, RPO/RTO |

---

## 8. Status ledger

### Done (2026-09-14)

- ✅ **BUG-01** — Planogram auto-fill exhaustion fixed (see §-1). Hypermarket shelf-fill 6%→88%, pharmacy 0%→43% (pharmacy capped further by FEAT-08, a content gap not a code issue). This was the actual root cause of the user-reported "product mapping not complete" / "3D view not showing products."
- ✅ **BUG-02** — Fixed a React hooks rules-of-hooks violation in `MissingProductsPanel.jsx` (conditional hook calls after an early return — could crash that component when `coverage` loads asynchronously).
- ✅ **TOOL-01** — Fixed the project-wide ESLint JSX parsing gap (`parserOptions.ecmaFeatures.jsx` was missing) and properly installed `eslint-plugin-react-hooks` (previously referenced by disable-comments but never installed), scoped to just `rules-of-hooks`/`exhaustive-deps`. This is what surfaced BUG-02.
- ✅ **PERF-04** — Added a lightweight in-memory rate limiter (`api/src/middleware/rateLimit.js`, no new dependency) on `/autogenerate` (10/min/IP) and `/analytics/portfolio` (30/min/IP); disabled under `NODE_ENV=test` so it doesn't interfere with the test suite's legitimate rapid-fire calls.
- ✅ **PERF-01 corrected** — the original finding overclaimed; `portfolioKpis` IS precomputed and stored (JSON-embedded in the payload column, read via `json_extract`), not recomputed per request. Phase 2.1's "DONE" claim in `PERFORMANCE_REMEDIATION_PLAN.md` was accurate.
- ✅ **BUG-03** — Back half of a double-sided gondola rendered with zero products in 3D: the per-shelf facing budget was a single counter shared by both faces, so a richly-stocked front face could exhaust it and starve the back. Split per face (total per unit unchanged) and the looked-at face is filled first.
- ✅ **BUG-04** — The 3D three-shelf focus group was sliced by `shelfIndexAlongAisle`, which interleaves both halves of each gondola and more than one gondola column — it returned two units, one of them across the aisle. Now ordered by real position along the run. Also made the group camera's sideways step signed, so clicking a shelf at the end of a run no longer walks the camera off the end.
- ✅ **BUG-05** — The 3D highlight glow (frame/board emissive color, and the product-box emissive tint) was gated on `isHighlighted` (the whole 3-shelf focus group) instead of `isTarget` (the one shelf actually clicked), so all 3 shelves lit up in the same highlight color. Fixed all 6 call sites; extracted the product-flag logic into a tested pure function.

Full suite re-verified after every change: 264/264 backend, 47/47 frontend, clean build.

### Done (2026-09-11) — verified: 264/264 backend tests, 30/30 new frontend tests, clean web build, after every change

**Performance:**
- ✅ PERF-10 — Category adjacency: O(n²) distance scan → spatial-grid (fixed-radius hashing), O(categories²) matrix filter → single-pass Map.
- ✅ PERF-11 — Category adjacency no longer computed twice per analytics report.
- ✅ PERF-13 — SQLite prepared statements cached (14 call sites) instead of re-prepared per call.
- ✅ PERF-14 — Added `layouts.status` / `layouts.updated_at` / `layouts.vertical` / `sessions.user_id` indexes.
- ✅ PERF-16 — `auto_calc` console.log gated behind `DEBUG_AUTO_CALC=1` (was firing on every mutating request).
- ✅ PERF-17 — Opt-in `?limit=&offset=` pagination on `GET /layouts` (backward compatible; RBAC-safe).
- ✅ PERF-18 — Removed redundant `page` dependency causing layouts+config re-fetch on every nav.
- ✅ PERF-19 — Deduped concurrent `loadCatalog()` calls for the same vertical (in-flight guard).
- ✅ PERF-20 — Parallelized categories+products fetch for the single-vertical path.
- ✅ PERF-21 — Editor drag position updates throttled to one per animation frame (was: every raw `mousemove`).
- ✅ PERF-23 — Removed per-frame `THREE.Vector3` allocations in the Scene3D animation loop (4 reusable scratch vectors).
- ✅ PERF-06 — Added a timing log (`get_layout_slow`, >200ms threshold) to `GET /layouts/:id`; portfolio/summary endpoints already had one.

**Deliberately not attempted** (documented why — high risk of silently breaking core, hard-to-visually-verify features):
- ⏸ PERF-12 — Packer spatial indexing (dense, tolerance-sensitive geometry across ~10 interacting helpers).
- ⏸ PERF-15 — Scoped validation/recompute (would touch nearly every mutating route + most of the test suite's assumptions).
- ⏸ PERF-22 — `React.memo` extraction in Canvas2D/LayoutEditor (needs careful component extraction from dense inline JSX, no visual QA available).
- ⏸ PERF-24 — Splitting Scene3D's 836-line scene-build effect (same risk class as PERF-22).

**Correctness:**
- ✅ QA-01 — Backend `npm test` now runs all 52 test files (was 34, hardcoded list). Surfaced 4 previously-invisible failures.
- ✅ QA-04 — Real bug found and fixed: shelf delete now also clears the legacy `layout.mappings` field, so `normalizeLayout`'s backfill no longer resurrects deleted shelf mappings.
- ✅ QA-05 — Test-fixture bug fixed; surfaced and documented a real architecture finding (aisle-binding is geometrically authoritative, manual `aisleId` PATCH doesn't persist — intentional, not a bug).
- ✅ QA-03 — Added `vitest` + 30 tests (`viewportCull.test.js`, `rolePermissions.test.js`) — frontend had zero test infrastructure before today.

**Documentation:**
- ✅ DOC-01…04 — `project.md`, `openspec/project.md`, `Docs/HANDOVER.md`, `Docs/DEMO_CHANGES_SUMMARY.md`, `Docs/BRD_ADDENDUM_DEMO_AUG_2026.md`, `Docs/PENDING.md` §1 all updated from stale "planned" to accurate "Done (core)" status.
- ✅ SEED-01 quantified — real OpenAPI drift measured precisely (78 routes vs. 50 documented, 28-route checklist in §5) rather than left as a vague "Partial".

**New finding (not previously documented):**
- 🆕 TOOL-01 — `npm run lint` is broken for every `.jsx` file project-wide (pre-existing, unrelated to today's changes) — see §1.5.

### Next up, in order

1. **FEAT-08** — Decide direction on the thin non-hypermarket catalog (add real pharmacy/beauty/apparel product data, accept partial fill, or scope demos to hypermarket/grocery) — needs a product decision, not engineering.
2. **WI-000** — Confirm what's actually deployed/slow in production (still the highest-value unblock if a real prod deployment is in play — everything above is demo/local-verified only).
3. **QA-04/05-style investigation of PERF-12/15/22/24** — each needs a dedicated session with either strong existing test coverage (PERF-12/15: extend packer/validation tests first) or visual/browser verification (PERF-22/24: run the app and watch the editor/3D view before and after).
4. **PERF-08 / PERF-09** — Verify production deploy freshness + host nginx gzip (ops check, needs server access I don't have).
5. **SEED-01** — Write the actual OpenAPI schemas for the 28 undocumented routes (checklist in §5 — mechanical but needs handler-by-handler accuracy, not a batch guess).
6. **PERF-02 / PERF-03** (remaining Phase 4 items — background workers, CDN) — only after the above show it's actually needed (measure first, per ADR-0011).
7. **FEAT-01…07** — Product decisions needed from the client/PM before implementation, not pure engineering — I can't resolve these.
8. **E2E-01…07** — 82 Playwright scenarios. Not attempted today: writing correct selectors/assertions for a UI I can't run in a browser risks producing tests that are wrong rather than missing — needs a session with the dev server up and a way to drive/inspect the browser.

---

_Update this file as items are picked up — mark `Done`/`In progress` inline rather than deleting rows, so it stays a reliable history like `PENDING.md`._
