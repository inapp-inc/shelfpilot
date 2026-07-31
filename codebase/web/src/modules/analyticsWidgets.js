/** Analytics dashboard widget registry and user preference persistence. */

export const ANALYTICS_WIDGETS_STORAGE_KEY = "shelfpilot.analyticsWidgets";
export const DASHBOARD_WIDGETS_STORAGE_KEY = "shelfpilot.dashboardWidgets";

export const DASHBOARD_EXCLUDED_WIDGET_IDS = ["product-coverage", "audit-activity", "version-compare"];

/** Curated default set for the home dashboard (overview without deep tables). */
export const DASHBOARD_DEFAULT_VISIBLE_WIDGET_IDS = [
  "kpi-product-coverage",
  "kpi-aisle-compliance",
  "kpi-unmapped-shelves",
  "kpi-fixtures",
  "kpi-capacity-variance",
  "category-allocation",
  "fixture-mix",
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

/** @typedef {{ id: string, label: string, group: 'kpi' | 'report' | 'tool', section: string, defaultVisible: boolean, wide?: boolean, portfolio?: boolean, featured?: boolean }} AnalyticsWidgetDef */

/** @typedef {{ colSpan: number | 'full', height?: number | null }} AnalyticsWidgetSize */

/** @type {AnalyticsWidgetDef[]} */
export const ANALYTICS_WIDGETS = [
  // §7 Executive
  { id: "kpi-utilization", label: "Utilization", group: "kpi", section: "executive", defaultVisible: true },
  { id: "kpi-product-coverage", label: "Product coverage", group: "kpi", section: "executive", defaultVisible: true },
  { id: "kpi-aisle-compliance", label: "Aisle compliance", group: "kpi", section: "executive", defaultVisible: true },
  { id: "kpi-unmapped-shelves", label: "Unmapped shelves", group: "kpi", section: "executive", defaultVisible: true },
  { id: "kpi-fixtures", label: "Fixtures", group: "kpi", section: "executive", defaultVisible: true },
  { id: "kpi-capacity-variance", label: "Capacity variance", group: "kpi", section: "executive", defaultVisible: true },
  { id: "kpi-pending-approval", label: "Pending approval", group: "kpi", section: "executive", defaultVisible: true, portfolio: true },
  // §1 Space
  { id: "space-utilization", label: "Space utilization", group: "report", section: "space", defaultVisible: true, wide: true, featured: true },
  { id: "fixture-density", label: "Fixture density (§1.2)", group: "report", section: "space", defaultVisible: false },
  { id: "unmapped-shelves", label: "Unmapped shelves (§1.3)", group: "report", section: "space", defaultVisible: true, wide: true },
  { id: "vertical-space", label: "Space by level & density", group: "report", section: "space", defaultVisible: true, wide: true },
  // §2 Capacity
  { id: "capacity-compare", label: "Capacity vs auto-calc (§2.1)", group: "report", section: "capacity", defaultVisible: true },
  { id: "fixture-mix", label: "Fixture mix (§2.2)", group: "report", section: "capacity", defaultVisible: true },
  { id: "scenario-compare", label: "Scenario comparison (§2.3)", group: "tool", section: "capacity", defaultVisible: true, wide: true },
  { id: "store-benchmarking", label: "Store benchmarking (§2.4)", group: "report", section: "capacity", defaultVisible: true, wide: true, portfolio: true },
  // §3 Category
  { id: "category-allocation", label: "Category space allocation (§3.1)", group: "report", section: "category", defaultVisible: true },
  { id: "facings-by-category", label: "Facings by category", group: "report", section: "category", defaultVisible: true },
  { id: "product-coverage", label: "Product mapping coverage (§3.3)", group: "report", section: "category", defaultVisible: true, wide: true },
  { id: "category-adjacency", label: "Category adjacency (§3.4)", group: "report", section: "category", defaultVisible: true, wide: true },
  // §4 Compliance
  { id: "aisle-compliance", label: "Aisle compliance (§4.1)", group: "report", section: "compliance", defaultVisible: true, wide: true },
  { id: "walkability", label: "Walkability / flow (§4.2)", group: "report", section: "compliance", defaultVisible: true },
  { id: "regulatory-compliance", label: "Regulatory compliance (§4.3)", group: "report", section: "compliance", defaultVisible: true },
  // §5 Version
  { id: "version-compare", label: "Version comparison (§5.1)", group: "tool", section: "version", defaultVisible: true, wide: true },
  { id: "audit-activity", label: "Audit / change history (§5.2)", group: "report", section: "version", defaultVisible: true, wide: true, portfolio: true },
  { id: "approval-status", label: "Approval status (§5.3)", group: "report", section: "version", defaultVisible: true, portfolio: true },
  // §6 Portfolio
  { id: "rollout-progress", label: "Rollout progress (§6.2)", group: "report", section: "portfolio", defaultVisible: true, portfolio: true },
  { id: "vertical-comparison", label: "Vertical comparison (§6.3)", group: "report", section: "portfolio", defaultVisible: true, wide: true, portfolio: true },
  { id: "layout-standardization", label: "Layout standardization (§6.1)", group: "report", section: "portfolio", defaultVisible: true, wide: true, portfolio: true },
];

export const ANALYTICS_WIDGET_MAP = Object.fromEntries(ANALYTICS_WIDGETS.map((w) => [w.id, w]));

export const DEFAULT_VISIBLE_WIDGET_IDS = ANALYTICS_WIDGETS.filter((w) => w.defaultVisible).map((w) => w.id);

export const ANALYTICS_MIN_WIDGET_HEIGHT = 96;
export const ANALYTICS_MAX_WIDGET_HEIGHT = 640;

/** Widget visible for active section filter. */
export function widgetMatchesSection(widget, sectionId) {
  if (!sectionId || sectionId === "all") return true;
  if (sectionId === "executive") return widget.section === "executive";
  return widget.section === sectionId;
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

/** @returns {{ visible: string[], sizes: Record<string, AnalyticsWidgetSize> }} */
export function readWidgetBoardPrefs({
  storageKey = ANALYTICS_WIDGETS_STORAGE_KEY,
  defaultVisible = DEFAULT_VISIBLE_WIDGET_IDS,
} = {}) {
  const sizes = defaultWidgetSizes();
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { visible: [...defaultVisible], sizes };
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

    return { visible, sizes };
  } catch {
    return { visible: [...defaultVisible], sizes };
  }
}

/** @returns {{ visible: string[], sizes: Record<string, AnalyticsWidgetSize> }} */
export function readAnalyticsDashboardPrefs() {
  return readWidgetBoardPrefs();
}

/** @param {{ visible: string[], sizes: Record<string, AnalyticsWidgetSize> }} prefs */
export function writeWidgetBoardPrefs(prefs, storageKey = ANALYTICS_WIDGETS_STORAGE_KEY) {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      v: 3,
      visible: [...prefs.visible],
      sizes: prefs.sizes,
    })
  );
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

export function writeAnalyticsWidgetPrefs(visibleIds, sizes = defaultWidgetSizes()) {
  writeAnalyticsDashboardPrefs({ visible: visibleIds, sizes });
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
