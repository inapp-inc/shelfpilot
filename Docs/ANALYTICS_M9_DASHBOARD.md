# Analytics M9 Dashboard — Full Report Catalog

**Date:** July 2026  
**Module:** M9 — Analytics & Reporting  
**Source spec:** `Docs/Store_Layout_Reports_Logic_and_Visualization.md`  
**Related:** `Docs/ANALYTICS_DASHBOARD_CUSTOMIZATION.md`

---

## Overview

The Analytics page delivers all M9 report sections with **section filters**, a compact widget grid (no dead whitespace when widgets are hidden), and charts aligned to the calculation logic in the store layout reports guide.

### Section filters

| Filter | Spec § | Widgets |
|--------|--------|---------|
| **All reports** | — | Every visible widget |
| **Executive / KPI** | §7 | Utilization, product coverage, aisle compliance, unmapped shelves, fixtures, capacity variance, pending approval |
| **Space utilization** | §1 | Space utilization donut, fixture density, unmapped shelves detail, vertical space by level |
| **Capacity & planning** | §2 | Capacity vs auto-calc, fixture mix, scenario comparison, store benchmarking |
| **Category & allocation** | §3 | Category space allocation, facings by category, product mapping coverage, category adjacency matrix |
| **Aisle & compliance** | §4 | Aisle compliance detail, walkability / flow, regulatory scorecard |
| **Version & change** | §5 | Layout version compare, audit activity, approval status funnel |
| **Cross-store / portfolio** | §6 | Rollout progress, vertical/format comparison, layout standardization |

Filters are sticky below the layout picker. Selecting a section shows only widgets tagged to that section (Executive KPIs remain visible when the Executive filter is active).

---

## Widget catalog (complete)

### Executive / KPI Dashboard (§7)

| ID | Visualization | Data source |
|----|---------------|-------------|
| `kpi-utilization` | KPI tile | §1.1 utilization % |
| `kpi-product-coverage` | KPI tile | §3.3 coverage % |
| `kpi-aisle-compliance` | KPI tile | §4.1 compliance % |
| `kpi-unmapped-shelves` | KPI tile | §1.3 empty shelf % |
| `kpi-fixtures` | KPI tile | §1.2 fixture count + density |
| `kpi-capacity-variance` | KPI tile | §2.1 variance % |
| `kpi-pending-approval` | KPI tile | §5.3 in-review count (portfolio) |

### Space Utilization & Efficiency (§1)

| ID | Visualization | Logic ref |
|----|---------------|-----------|
| `space-utilization` | Donut + legend | §1.1 allocated / aisle / blocked / unused |
| `fixture-density` | Bar chart (per zone) | §1.2 fixtures ÷ area by zone |
| `unmapped-shelves` | KPI + table | §1.3 unmapped fixture list |
| `vertical-space` | Bar chart | §1.4 tier utilization % |

### Capacity & Planning (§2)

| ID | Visualization | Logic ref |
|----|---------------|-----------|
| `capacity-compare` | Side-by-side columns | §2.1 theoretical vs actual |
| `fixture-mix` | Donut | §2.2 type distribution |
| `scenario-compare` | Compare tool | §2.3 layout A vs B delta |
| `store-benchmarking` | Ranked bar | §2.4 fixtures per 1000 m² vs peers |

### Category & Product Allocation (§3)

| ID | Visualization | Logic ref |
|----|---------------|-----------|
| `category-allocation` | Horizontal bar | §3.1 area share by category |
| `facings-by-category` | Horizontal bar | Facings count by category |
| `product-coverage` | Gauge + table | §3.3 SKU coverage |
| `category-adjacency` | Heat matrix | §3.4 adjacent category pairs |

### Aisle & Compliance (§4)

| ID | Visualization | Logic ref |
|----|---------------|-----------|
| `aisle-compliance` | KPI + table | §4.1 width vs min rule |
| `walkability` | Status + list | §4.2 entry connectivity |
| `regulatory-compliance` | Scorecard | §4.3 rule pass/fail |

### Version & Change Management (§5)

| ID | Visualization | Logic ref |
|----|---------------|-----------|
| `version-compare` | Version picker + diff | §5.1 snapshot comparison |
| `audit-activity` | Timeline table + bar | §5.2 recent audit log |
| `approval-status` | Funnel + counts | §5.3 status distribution |

### Cross-Store / Portfolio (§6)

| ID | Visualization | Logic ref |
|----|---------------|-----------|
| `rollout-progress` | Progress bars | §6.2 published / total |
| `vertical-comparison` | Grouped bar | §6.3 KPI by vertical |
| `layout-standardization` | Ranked deviation bar | §6.1 vs portfolio average |

---

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/analytics/layouts/:id/summary` | Single-layout M9 bundle (existing + extended fields) |
| GET | `/analytics/portfolio?vertical=` | Cross-store KPIs, benchmarking, rollout |
| GET | `/analytics/audit-summary?limit=50` | Layout-related audit entries for §5.2 |
| POST | `/analytics/compare` | Scenario / layout comparison (existing) |

Extended summary fields: `fixtureDensityByZone`, `categoryAdjacency`, `walkability`, `regulatoryCompliance`, `facingsByCategory` (legacy).

---

## UX design principles

1. **No gap grid** — hidden widgets are not rendered; `auto-fill` minmax grid reflows instantly.
2. **Section scoping** — filter chips reduce cognitive load; default is **All reports**.
3. **Compact density** — 10px section gaps, 12px panel padding, 11px section labels.
4. **Consistent chart palette** — crimson `#A30A2A` primary, slate `#64748b` secondary, category colors from catalog.
5. **Drill-down** — KPI tiles mirror detailed report widgets in the same section filter.

---

## 3D default zoom

The layout **3D tab** opens at **70% of fit-store distance** (slightly zoomed in so individual racks are easier to read). Press **0** to reset to this default; **+** / **−** adjust further.

---

## Files

| File | Role |
|------|------|
| `codebase/api/src/services/analyticsReports.js` | Calculation logic |
| `codebase/api/src/routes/analytics.js` | HTTP routes |
| `codebase/web/src/modules/analyticsWidgets.js` | Widget registry + sections |
| `codebase/web/src/modules/AnalyticsPage.jsx` | Section filter bar |
| `codebase/web/src/modules/AnalyticsWidgetBoard.jsx` | Widget rendering |
| `codebase/web/src/modules/charts/*` | Donut, bar, gauge, matrix |
| `codebase/web/src/styles.css` | `.analytics-*` layout |

---

## Out of scope

- §3.2 Category vs sales (requires external POS integration)
- Geo map for rollout (§6.2) — progress bars only until store coordinates exist
- Server-side widget preference sync
