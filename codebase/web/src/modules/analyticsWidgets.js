/** Analytics dashboard widget registry and user preference persistence. */

export const ANALYTICS_WIDGETS_STORAGE_KEY = "shelfpilot.analyticsWidgets";
export const DASHBOARD_WIDGETS_STORAGE_KEY = "shelfpilot.dashboardWidgets";

/** No widgets excluded from dashboard until explicitly requested. */
export const DASHBOARD_EXCLUDED_WIDGET_IDS = [];

/** Curated default set for the unified dashboard (overview + key reports). */
export const DASHBOARD_DEFAULT_VISIBLE_WIDGET_IDS = [
  "kpi-utilization",
  "kpi-product-coverage",
  "kpi-aisle-compliance",
  "kpi-unmapped-shelves",
  "kpi-fixtures",
  "kpi-storage-volume",
  "kpi-shelf-load",
  "kpi-capacity-variance",
  "space-utilization",
  "storage-volume",
  "shelf-load",
  "vertical-space",
  "category-allocation",
  "fixture-mix",
  "capacity-compare",
  "aisle-compliance",
];

/** M9 report section filters — maps to Store_Layout_Reports_Logic_and_Visualization.md */
export const ANALYTICS_SECTIONS = [
  { id: "all", label: "All reports" },
  { id: "executive", label: "Executive / KPI" },
  { id: "space", label: "Space utilization" },
  { id: "capacity", label: "Capacity & planning" },
  { id: "category", label: "Category & allocation" },
  { id: "compliance", label: "Aisle & compliance" },
  { id: "version", label: "Version & change" },
  { id: "portfolio", label: "Cross-store" },
];

export const ANALYTICS_WIDGET_GROUPS = [
  { id: "kpi", label: "Executive KPIs" },
  { id: "report", label: "Reports" },
  { id: "tool", label: "Tools" },
];

/** @typedef {{ id: string, label: string, group: 'kpi' | 'report' | 'tool', section: string, defaultVisible: boolean, description: string, wide?: boolean, portfolio?: boolean, featured?: boolean }} AnalyticsWidgetDef */

/** @typedef {{ colSpan: number | 'full', height?: number | null }} AnalyticsWidgetSize */

/** @type {AnalyticsWidgetDef[]} */
export const ANALYTICS_WIDGETS = [
  {
    id: "kpi-utilization",
    label: "Utilization",
    group: "kpi",
    section: "executive",
    defaultVisible: true,
    description:
      "How to calculate: allocated fixture floor area ÷ usable store area × 100. Usable = total floor − columns/obstacles. Gondola pair = one footprint.",
  },
  {
    id: "kpi-product-coverage",
    label: "Product coverage",
    group: "kpi",
    section: "executive",
    defaultVisible: true,
    description: "How to calculate: distinct placed product IDs ÷ catalog SKUs for this vertical × 100.",
  },
  {
    id: "kpi-aisle-compliance",
    label: "Aisle compliance",
    group: "kpi",
    section: "executive",
    defaultVisible: true,
    description: "How to calculate: aisles with width ≥ min aisle width ÷ total aisles × 100.",
  },
  {
    id: "kpi-unmapped-shelves",
    label: "Unmapped shelves",
    group: "kpi",
    section: "executive",
    defaultVisible: true,
    description:
      "How to calculate: floor-share of shelves with no category on any face ÷ total shelf floor-share × 100.",
  },
  {
    id: "kpi-fixtures",
    label: "Fixtures",
    group: "kpi",
    section: "executive",
    defaultVisible: true,
    description:
      "How to calculate: physical fixture count (gondola pair = 1). Density = count ÷ (usable area in sq ft ÷ 100).",
  },
  {
    id: "kpi-storage-volume",
    label: "Storage volume",
    group: "kpi",
    section: "executive",
    defaultVisible: true,
    description:
      "How to calculate: used volume ÷ available volume × 100. Available = Σ usable width × face depth × clear height per level.",
  },
  {
    id: "kpi-shelf-load",
    label: "Shelf load",
    group: "kpi",
    section: "executive",
    defaultVisible: true,
    description:
      "How to calculate: Σ (unit weight × facings × depth facings) ÷ Σ level load limits × 100.",
  },
  {
    id: "kpi-capacity-variance",
    label: "Capacity variance",
    group: "kpi",
    section: "executive",
    defaultVisible: true,
    description:
      "How to calculate: (actual physical fixtures − autoCalc.maxFixtures) ÷ autoCalc.maxFixtures × 100.",
  },
  {
    id: "kpi-pending-approval",
    label: "Pending approval",
    group: "kpi",
    section: "executive",
    defaultVisible: true,
    portfolio: true,
    description: "How to calculate: count of layouts with status = in_review.",
  },
  {
    id: "space-utilization",
    label: "Space utilization",
    group: "report",
    section: "space",
    defaultVisible: true,
    wide: true,
    featured: true,
    description:
      "Exclusive floor: fixtures + aisles + obstacles + vacant. Utilization = fixtures ÷ (total − obstacles) × 100. Vacant = usable − fixtures − aisles. Merchandising zones are overlays and do not reduce vacant.",
  },
  {
    id: "storage-volume",
    label: "Storage volume & category allocation",
    group: "report",
    section: "space",
    defaultVisible: true,
    wide: true,
    description:
      "Available vs used shelf volume (cu ft). Used = product W×H×D × facings × depth facings. Category volume attributed per face category.",
  },
  {
    id: "shelf-load",
    label: "Shelf weight load",
    group: "report",
    section: "space",
    defaultVisible: true,
    description:
      "Placed weight vs fixture limits: unit kg × facings × depth facings vs maxLoadKgPerLevel / maxLoadKg.",
  },
  {
    id: "fixture-density",
    label: "Fixture density",
    group: "report",
    section: "space",
    defaultVisible: false,
    description:
      "How to calculate: physical units ÷ (area sq ft ÷ 100). Store average uses usable floor; zones use zone rectangle area.",
  },
  {
    id: "unmapped-shelves",
    label: "Unmapped shelves",
    group: "report",
    section: "space",
    defaultVisible: true,
    wide: true,
    description:
      "Shelves with no category. Empty % = unmapped floor-share ÷ all shelf floor-share × 100.",
  },
  {
    id: "vertical-space",
    label: "Space by level & density",
    group: "report",
    section: "space",
    defaultVisible: true,
    wide: true,
    description:
      "Tier % = area of levels that have products ÷ that level’s shelf floor-share × 100. Category mapping alone does not count as filled. Density = physical units per 100 sq ft.",
  },
  {
    id: "capacity-compare",
    label: "Capacity vs auto-calc",
    group: "report",
    section: "capacity",
    defaultVisible: true,
    description:
      "Actual physical fixtures vs autoCalc.maxFixtures. Variance % = (actual − theoretical) ÷ theoretical × 100.",
  },
  {
    id: "fixture-mix",
    label: "Fixture mix",
    group: "report",
    section: "capacity",
    defaultVisible: true,
    description:
      "Share of physical units by type (gondola pair counted once). Count % aligns with fixture KPI.",
  },
  {
    id: "scenario-compare",
    label: "Scenario comparison",
    group: "tool",
    section: "capacity",
    defaultVisible: true,
    wide: true,
    description: "Side-by-side comparison of utilization and fixture count between two layout scenarios.",
  },
  {
    id: "store-benchmarking",
    label: "Store benchmarking",
    group: "report",
    section: "capacity",
    defaultVisible: true,
    wide: true,
    portfolio: true,
    description:
      "How to calculate: fixtures ÷ (store area sq ft ÷ 1000). Capacity index = store ÷ peer average.",
  },
  {
    id: "category-allocation",
    label: "Category space allocation",
    group: "report",
    section: "category",
    defaultVisible: true,
    description:
      "Mapped shelf floor-share split evenly across categories on that shelf. Chart values are sq ft (m² × 10.7639). Share % = category ÷ total mapped × 100.",
  },
  {
    id: "facings-by-category",
    label: "Facings by category",
    group: "report",
    section: "category",
    defaultVisible: true,
    description: "How to calculate: sum of planogram facings attributed to each category on shelf faces.",
  },
  {
    id: "product-coverage",
    label: "Product mapping coverage",
    group: "report",
    section: "category",
    defaultVisible: true,
    wide: true,
    dashboardTab: "product-mapping",
    description: "Placed SKUs ÷ catalog SKUs × 100. Missing = catalog − placed.",
  },
  {
    id: "category-adjacency",
    label: "Category adjacency",
    group: "report",
    section: "category",
    defaultVisible: true,
    wide: true,
    description: "Categories on shelves whose centers are within 2.5 m are adjacent (proximity heuristic).",
  },
  {
    id: "aisle-compliance",
    label: "Aisle compliance",
    group: "report",
    section: "compliance",
    defaultVisible: true,
    wide: true,
    description: "Per-aisle width vs min aisle width. Compliance % = compliant ÷ total × 100.",
  },
  {
    id: "walkability",
    label: "Walkability / flow",
    group: "report",
    section: "compliance",
    defaultVisible: true,
    description:
      "Uses layout entryPoints. Unreachable if shelf center > 25 m from nearest entry (straight-line).",
  },
  {
    id: "regulatory-compliance",
    label: "Regulatory compliance",
    group: "report",
    section: "compliance",
    defaultVisible: true,
    description: "Score = rules passed ÷ rules total × 100 (entries, aisles, or category separation rules).",
  },
  {
    id: "version-compare",
    label: "Version comparison",
    group: "tool",
    section: "version",
    defaultVisible: true,
    wide: true,
    description: "Compare utilization and fixture count between two saved versions of the same layout.",
  },
  {
    id: "audit-activity",
    label: "Audit / change history",
    group: "report",
    section: "version",
    defaultVisible: true,
    wide: true,
    portfolio: true,
    description: "Count of audit log events per day for the portfolio / layout.",
  },
  {
    id: "approval-status",
    label: "Approval status",
    group: "report",
    section: "version",
    defaultVisible: true,
    portfolio: true,
    description: "Layout counts by status. Published count includes only status = published.",
  },
  {
    id: "rollout-progress",
    label: "Rollout progress",
    group: "report",
    section: "portfolio",
    defaultVisible: true,
    portfolio: true,
    description: "How to calculate: published layouts ÷ total layouts × 100.",
  },
  {
    id: "vertical-comparison",
    label: "Vertical comparison",
    group: "report",
    section: "portfolio",
    defaultVisible: true,
    wide: true,
    portfolio: true,
    description: "Average utilization, coverage, density, and compliance across store verticals.",
  },
  {
    id: "layout-standardization",
    label: "Layout standardization",
    group: "report",
    section: "portfolio",
    defaultVisible: true,
    wide: true,
    portfolio: true,
    description: "Deviation score measuring how much each layout differs from portfolio norms.",
  },
];

export const ANALYTICS_WIDGET_MAP = Object.fromEntries(ANALYTICS_WIDGETS.map((w) => [w.id, w]));

export const DEFAULT_VISIBLE_WIDGET_IDS = ANALYTICS_WIDGETS.filter((w) => w.defaultVisible).map((w) => w.id);

export const ANALYTICS_MIN_WIDGET_HEIGHT = 96;
export const ANALYTICS_MAX_WIDGET_HEIGHT = 640;
export const ANALYTICS_GRID_MIN_COL_PX = 300;
export const ANALYTICS_MIN_WIDGET_WIDTH = 240;

const CATALOG_ORDER = ANALYTICS_WIDGETS.map((w) => w.id);

/** Widget visible for active section filter. */
export function widgetMatchesSection(widget, sectionId) {
  if (!sectionId || sectionId === "all") return true;
  if (sectionId === "executive") return widget.section === "executive";
  return widget.section === sectionId;
}

/** Dashboard tab filter — product-mapping tab shows coverage widgets. */
export function widgetMatchesDashboardTab(widget, tab) {
  if (!tab || tab === "reports") {
    return widget?.dashboardTab !== "product-mapping";
  }
  if (tab === "product-mapping") {
    return widget?.dashboardTab === "product-mapping" || widget?.id === "product-coverage";
  }
  return true;
}

/** @returns {AnalyticsWidgetSize} */
export function defaultWidgetSize(widget) {
  if (widget.group === "kpi") {
    return { colSpan: 1, height: null };
  }
  return { colSpan: widget.wide ? "full" : 1, height: null };
}

/** @returns {Record<string, AnalyticsWidgetSize>} */
export function defaultWidgetSizes() {
  /** @type {Record<string, AnalyticsWidgetSize>} */
  const sizes = {};
  for (const widget of ANALYTICS_WIDGETS) {
    sizes[widget.id] = defaultWidgetSize(widget);
  }
  return sizes;
}

/** Default display order — catalog order filtered to visible ids, then remaining catalog ids. */
export function defaultWidgetOrder(visibleIds = DEFAULT_VISIBLE_WIDGET_IDS) {
  const visible = new Set(visibleIds);
  const ordered = CATALOG_ORDER.filter((id) => visible.has(id));
  for (const id of CATALOG_ORDER) {
    if (!visible.has(id)) ordered.push(id);
  }
  return ordered;
}

/** Sort widget ids by saved order, falling back to catalog order. */
export function sortWidgetIds(ids, order = CATALOG_ORDER) {
  const orderIndex = new Map(order.map((id, i) => [id, i]));
  return [...ids].sort((a, b) => {
    const ia = orderIndex.has(a) ? orderIndex.get(a) : 9999 + CATALOG_ORDER.indexOf(a);
    const ib = orderIndex.has(b) ? orderIndex.get(b) : 9999 + CATALOG_ORDER.indexOf(b);
    return ia - ib;
  });
}

/** Move one widget before another in the saved order array. */
export function moveWidgetInOrder(order, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return order;
  const next = order.filter((id) => id !== fromId);
  const toIdx = next.indexOf(toId);
  if (toIdx < 0) next.push(fromId);
  else next.splice(toIdx, 0, fromId);
  return next;
}

function sanitizeSize(raw, widget) {
  const fallback = defaultWidgetSize(widget);
  if (!raw || typeof raw !== "object") return fallback;

  let colSpan = raw.colSpan;
  if (widget.group === "kpi") {
    colSpan = Number(colSpan) === 2 ? 2 : 1;
  } else if (colSpan === "full") {
    colSpan = "full";
  } else {
    const n = Number(colSpan);
    colSpan = n >= 2 ? 2 : 1;
  }

  let height = raw.height;
  if (height == null || height === "") {
    height = null;
  } else {
    height = Math.min(ANALYTICS_MAX_WIDGET_HEIGHT, Math.max(ANALYTICS_MIN_WIDGET_HEIGHT, Math.round(Number(height))));
  }

  return { colSpan, height };
}

/** @returns {{ visible: string[], sizes: Record<string, AnalyticsWidgetSize>, order: string[] }} */
export function readWidgetBoardPrefs({
  storageKey = ANALYTICS_WIDGETS_STORAGE_KEY,
  defaultVisible = DEFAULT_VISIBLE_WIDGET_IDS,
} = {}) {
  const sizes = defaultWidgetSizes();
  const defaultOrder = defaultWidgetOrder(defaultVisible);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { visible: [...defaultVisible], sizes, order: defaultOrder };
    }
    const parsed = JSON.parse(raw);
    const known = new Set(ANALYTICS_WIDGETS.map((w) => w.id));
    const visible = Array.isArray(parsed.visible)
      ? parsed.visible.filter((id) => known.has(id))
      : [...defaultVisible];

    if (parsed.sizes && typeof parsed.sizes === "object") {
      for (const widget of ANALYTICS_WIDGETS) {
        if (parsed.sizes[widget.id]) {
          sizes[widget.id] = sanitizeSize(parsed.sizes[widget.id], widget);
        }
      }
    }

    let order = Array.isArray(parsed.order)
      ? parsed.order.filter((id) => known.has(id))
      : defaultWidgetOrder(visible);
    for (const id of CATALOG_ORDER) {
      if (!order.includes(id)) order.push(id);
    }

    return { visible, sizes, order };
  } catch {
    return { visible: [...defaultVisible], sizes, order: defaultOrder };
  }
}

/** @param {{ visible: string[], sizes: Record<string, AnalyticsWidgetSize>, order?: string[] }} prefs */
export function writeWidgetBoardPrefs(prefs, storageKey = ANALYTICS_WIDGETS_STORAGE_KEY) {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      v: 4,
      visible: [...prefs.visible],
      sizes: prefs.sizes,
      order: prefs.order ? [...prefs.order] : defaultWidgetOrder(prefs.visible),
    })
  );
}

/** @returns {{ visible: string[], sizes: Record<string, AnalyticsWidgetSize>, order: string[] }} */
export function readAnalyticsDashboardPrefs() {
  return readWidgetBoardPrefs();
}

export function writeAnalyticsDashboardPrefs(prefs) {
  writeWidgetBoardPrefs(prefs, ANALYTICS_WIDGETS_STORAGE_KEY);
}

export function readDashboardWidgetPrefs() {
  return readWidgetBoardPrefs({
    storageKey: DASHBOARD_WIDGETS_STORAGE_KEY,
    defaultVisible: DASHBOARD_DEFAULT_VISIBLE_WIDGET_IDS,
  });
}

export function writeDashboardWidgetPrefs(prefs) {
  writeWidgetBoardPrefs(prefs, DASHBOARD_WIDGETS_STORAGE_KEY);
}

/** Back-compat helper */
export function readAnalyticsWidgetPrefs() {
  return readAnalyticsDashboardPrefs().visible;
}

export function writeAnalyticsWidgetPrefs(visibleIds, sizes = defaultWidgetSizes(), order = defaultWidgetOrder(visibleIds)) {
  writeAnalyticsDashboardPrefs({ visible: visibleIds, sizes, order });
}

export function estimateGridColumnWidth(gridEl, minColPx = 300, gapPx = 12) {
  if (!gridEl) return minColPx;
  const width = gridEl.getBoundingClientRect().width;
  const cols = Math.max(1, Math.floor((width + gapPx) / (minColPx + gapPx)));
  return (width - gapPx * (cols - 1)) / cols;
}

/** @param {number} widthPx @param {number} colWidthPx @param {'kpi' | 'report'} mode */
export function snapColumnSpan(widthPx, colWidthPx, mode) {
  const gap = 12;
  const unit = colWidthPx + gap;
  if (widthPx >= unit * 1.75 && mode === "report") return "full";
  if (widthPx >= unit * 1.35) return 2;
  return 1;
}
