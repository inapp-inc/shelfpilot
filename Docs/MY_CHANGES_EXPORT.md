# ShelfPilot — My Changes Export (Single File Summary)

**Author:** mujeeb (abdul.mujeeb@inapp.com)  
**Branch:** master  
**Latest commit:** `1e0a3c1` — updates (Fri Jul 31, 2026)  
**Purpose:** One document listing all changes delivered in this development session.

---

## 1. Executive summary

| Area | What changed |
|------|----------------|
| **3D layout view** | WebGL floor/aisles, detailed racks + planogram products, 70% default zoom, zoom-to-cursor, improved orbit/pan |
| **Shelf numbering** | Aisle-centric labels (`9A`, `9B` not `14D`/`13F`); orientation-aware aisle binding |
| **Planogram → 3D** | Products from planogram visible on shelves in 3D and planogram “View in 3D” focus |
| **Analytics (M9)** | Full report catalog with section filters, portfolio API, audit summary, 28+ widgets |
| **Space utilization UX** | Hero pinned panel (stacked bar + stat tiles) on Dashboard & Analytics |
| **Space split row** | Vertical space by level (left 50%) + fixture density & unmapped (right 50%) |

---

## 2. 3D layout view

### Behaviour
- **3D tab:** Detailed rack meshes (uprights, boards, gondola spines) with **planogram products on every shelf**
- **Planogram “View in 3D”:** Focused shelf emphasized with ring highlight
- **Walk mode:** Detailed racks; products only in shelf-focus mode
- **Default zoom:** Opens at **70% of fit-store distance** (slightly zoomed in); press **0** to reset
- **Navigation:** Zoom-to-cursor, ground-plane pan, right-drag pan, compact nav hint

### Key files
| File | Change |
|------|--------|
| `codebase/web/src/Scene3D.jsx` | WebGL integration, product rendering, orbit controls, 70% zoom |
| `codebase/web/src/layout-editor/layoutSceneWebGL.js` | Polygon floor, aisles, renderer, `DEFAULT_OVERVIEW_ZOOM = 0.7` |
| `codebase/web/src/scene3dDimensions.js` | 3D shelf box / focus helpers |

### Docs
- `openspec/changes/customer-feedback-jul-2026/layout-3d-webgl-upgrade.md`
- `openspec/changes/customer-feedback-jul-2026/planogram-3d-shelf-view.md`

---

## 3. Shelf numbering & aisle binding

### Behaviour
- Labels are **aisle-centric single letters** per physical shelf (`4A`, `4B`, not `4AA`)
- Gondola **back face** gets rear aisle number (e.g. aisle 5 → `5A` on back)
- Aisle binding is **orientation-aware**; re-bind on layout save and GET normalize

### Key files
| File | Change |
|------|--------|
| `codebase/api/src/services/aisleLabeling.js` | `assignAisleShelfLabels()` per physical shelf |
| `codebase/api/src/services/aisleBinding.js` | Orientation-aware binding |
| `codebase/api/src/services/layoutNormalize.js` | Re-bind on normalize |
| `codebase/web/src/layout-editor/shelfFaces.js` | Web-side label helpers |
| `codebase/api/test/aisle-labeling.test.js` | 8 tests |
| `codebase/api/test/aisle-binding-vertical.test.js` | Vertical aisle binding tests |

### Docs
- `openspec/changes/customer-feedback-jul-2026/shelf-labels-planogram-3d-fix.md`

**Note:** Reload layout and **save once** to refresh corrected shelf labels in existing layouts.

---

## 4. Planogram → 3D products

### Behaviour
- `planogramFromPhysicalShelf()` resolves correct face for focused shelf
- `segmentFaceIdForShelf()` for bay/segment lookup
- Products render as boxes + catalog images on shelves

### Key files
| File | Change |
|------|--------|
| `codebase/web/src/Scene3D.jsx` | `resolveFacePlanograms`, `renderProducts`, facing budget |

---

## 5. Analytics & Dashboard (M9)

### Behaviour
- **Section filters:** All reports, Executive/KPI, Space, Capacity, Category, Compliance, Version, Cross-store
- **28 widgets** aligned to `Docs/Store_Layout_Reports_Logic_and_Visualization.md`
- **Customize dashboard:** Show/hide widgets, resize, persist in `localStorage`
- **Portfolio API:** Benchmarking, rollout, vertical comparison, standardization, approval funnel
- **Audit API:** `GET /analytics/audit-summary` for change history

### New API calculations (`analyticsReports.js`)
- Space utilization §1.1, fixture density §1.2, unmapped §1.3, vertical space §1.4
- Capacity variance §2.1, fixture mix §2.2, category allocation §3.1, adjacency §3.4
- Walkability §4.2, regulatory §4.3, approval §5.3, portfolio §6.x

### Key files
| File | Change |
|------|--------|
| `codebase/api/src/services/analyticsReports.js` | Full M9 calculation bundle |
| `codebase/api/src/routes/analytics.js` | Summary, portfolio, audit, compare |
| `codebase/api/src/services/layoutMath.js` | Delegates to analyticsReports |
| `codebase/web/src/modules/AnalyticsPage.jsx` | Section filter chips |
| `codebase/web/src/modules/AnalyticsWidgetBoard.jsx` | Widget rendering, data fetch |
| `codebase/web/src/modules/AnalyticsWidgetCard.jsx` | Removable/resizable cards |
| `codebase/web/src/modules/analyticsWidgets.js` | Widget registry + prefs |
| `codebase/web/src/modules/DashboardPage.jsx` | Portfolio pipeline + analytics board |
| `codebase/web/src/modules/charts/*` | Donut, Bar, Column, Gauge, Funnel, Matrix |

### Docs
- `Docs/ANALYTICS_M9_DASHBOARD.md`
- `Docs/ANALYTICS_DASHBOARD_CUSTOMIZATION.md`
- `Docs/Store_Layout_Reports_Logic_and_Visualization.md`

---

## 6. Space utilization UX (hero panel)

### Behaviour
- **Pinned at top** on Dashboard and Analytics (when widget visible)
- Large utilization % + status badge (Good / Room to grow / Low)
- **Stacked proportional bar** (fixtures, aisles, zones, free)
- **Four stat tiles** with m² and % of floor
- Footer with free space for expansion

### Key files
| File | Change |
|------|--------|
| `codebase/web/src/modules/SpaceUtilizationPanel.jsx` | Hero panel component |
| `codebase/web/src/modules/AnalyticsWidgetBoard.jsx` | `pinFeaturedWidgets` |
| `codebase/web/src/styles.css` | `.space-util-*`, `.analytics-pinned-space` |

---

## 7. Space metrics split row (50 / 50)

### Behaviour
- **Left half:** Vertical space by level — column chart + per-level m² stats (§1.4)
- **Right half:** Fixture density KPI + zone bars (§1.2) + unmapped shelf summary (§1.3)
- Full-width row; stacks vertically on mobile
- Standalone “Fixture density” widget hidden when split row is visible (still in Customize)

### Key files
| File | Change |
|------|--------|
| `codebase/web/src/modules/SpaceMetricsSplitPanel.jsx` | Split layout |
| `codebase/web/src/modules/charts/ColumnChart.jsx` | Tier column chart |
| `codebase/web/src/modules/analyticsWidgets.js` | Widget `vertical-space` → “Space by level & density” |

---

## 8. Complete file list (this session — code & docs)

### API
```
codebase/api/src/routes/analytics.js
codebase/api/src/services/aisleBinding.js
codebase/api/src/services/aisleLabeling.js
codebase/api/src/services/analyticsReports.js
codebase/api/src/services/layoutMath.js
codebase/api/src/services/layoutNormalize.js
codebase/api/test/aisle-binding-vertical.test.js
codebase/api/test/aisle-labeling.test.js
codebase/api/test/analytics-reports.test.js
```

### Web — 3D & layout editor
```
codebase/web/src/Scene3D.jsx
codebase/web/src/layout-editor/layoutSceneWebGL.js
codebase/web/src/scene3dDimensions.js
codebase/web/src/layout-editor/shelfFaces.js
codebase/web/src/layout-editor/LayoutEditor.jsx
codebase/web/src/layout-editor/Canvas2D.jsx
codebase/web/src/styles.css
```

### Web — Analytics & Dashboard
```
codebase/web/src/modules/AnalyticsPage.jsx
codebase/web/src/modules/AnalyticsWidgetBoard.jsx
codebase/web/src/modules/AnalyticsWidgetCard.jsx
codebase/web/src/modules/analyticsWidgets.js
codebase/web/src/modules/DashboardPage.jsx
codebase/web/src/modules/SpaceUtilizationPanel.jsx
codebase/web/src/modules/SpaceMetricsSplitPanel.jsx
codebase/web/src/modules/charts/BarChart.jsx
codebase/web/src/modules/charts/ColumnChart.jsx
codebase/web/src/modules/charts/DonutChart.jsx
codebase/web/src/modules/charts/FunnelChart.jsx
codebase/web/src/modules/charts/GaugeChart.jsx
codebase/web/src/modules/charts/MatrixHeatmap.jsx
```

### Documentation
```
Docs/ANALYTICS_M9_DASHBOARD.md
Docs/ANALYTICS_DASHBOARD_CUSTOMIZATION.md
Docs/Store_Layout_Reports_Logic_and_Visualization.md
Docs/DASHBOARD_UI_REFACTOR.md
openspec/changes/customer-feedback-jul-2026/layout-3d-webgl-upgrade.md
openspec/changes/customer-feedback-jul-2026/shelf-labels-planogram-3d-fix.md
openspec/changes/customer-feedback-jul-2026/planogram-3d-shelf-view.md
openspec/changes/customer-feedback-jul-2026/proposal.md
openspec/changes/customer-feedback-jul-2026/tasks.md
```

---

## 9. How to verify

| Feature | Steps |
|---------|--------|
| 3D racks + products | Open layout → **3D** tab → see products on shelves |
| 3D default zoom | Open 3D → view slightly zoomed in → press **0** to reset |
| Shelf labels | Open aisle 9 layout → labels should be `9A`, `9B`, … |
| Planogram 3D | Planogram → **View in 3D** → products on focused shelf |
| Analytics filters | **Analytics** → use section chips (Space, Capacity, etc.) |
| Space hero panel | **Dashboard** or **Analytics** → top pinned space breakdown |
| Split row | **Analytics** → **Space utilization** filter → 50/50 level + density |
| API tests | `cd codebase/api && node --test test/analytics-reports.test.js` |
| Web build | `cd codebase/web && npm run build` |

---

## 10. Git reference

```bash
# View all changes since initial commit
git diff 0e2fcf7..HEAD --stat

# View latest commit
git show 1e0a3c1 --stat

# Export patch file (optional)
git format-patch 0e2fcf7..HEAD -o ./patches
```

**Commits on branch:**
- `1e0a3c1` updates
- `4feedf9` Updates
- `db595a8` updates
- `9fda30f` Updates
- `0e2fcf7` initial commit

---

## 11. Out of scope / future

- §3.2 Category vs Sales (needs external POS data)
- Server-side analytics widget preference sync
- Geo map for rollout progress
- Instanced overview-only 3D mode (reverted per user request — full merchandising 3D is active)

---

*Generated for handover and export. For detailed calculation logic see `Docs/Store_Layout_Reports_Logic_and_Visualization.md`.*
