/** Dashboard widget drill-down actions — click-through from KPI/report cards. */

/** @typedef {{ action: string, tab?: string, section?: string, status?: string, adminTab?: string }} DrillDownAction */

/** Default drill-down target per widget id. */
export const WIDGET_DRILL_DOWN = {
  "kpi-utilization": { action: "section", section: "space" },
  "kpi-product-coverage": { action: "tab", tab: "product-mapping" },
  "kpi-aisle-compliance": { action: "section", section: "compliance" },
  "kpi-unmapped-shelves": { action: "layout-editor" },
  "kpi-fixtures": { action: "layout-editor" },
  "kpi-storage-volume": { action: "section", section: "space" },
  "kpi-shelf-load": { action: "section", section: "space" },
  "storage-volume": { action: "section", section: "space" },
  "shelf-load": { action: "layout-editor" },
  "kpi-capacity-variance": { action: "section", section: "capacity" },
  "kpi-pending-approval": { action: "layouts", status: "in_review" },
  "space-utilization": { action: "section", section: "space" },
  "fixture-density": { action: "section", section: "space" },
  "unmapped-shelves": { action: "layout-editor" },
  "vertical-space": { action: "section", section: "space" },
  "capacity-compare": { action: "section", section: "capacity" },
  "fixture-mix": { action: "layout-editor" },
  "store-benchmarking": { action: "layouts", status: "all" },
  "category-allocation": { action: "section", section: "category" },
  "facings-by-category": { action: "layout-editor" },
  "product-coverage": { action: "tab", tab: "product-mapping" },
  "category-adjacency": { action: "layout-editor" },
  "aisle-compliance": { action: "layout-editor" },
  "walkability": { action: "layout-editor" },
  "regulatory-compliance": { action: "section", section: "compliance" },
  "audit-activity": { action: "admin", adminTab: "audit" },
  "approval-status": { action: "layouts", status: "in_review" },
  "rollout-progress": { action: "layouts", status: "approved" },
  "layout-standardization": { action: "layouts", status: "all" },
};

/** @param {{ id: string, drillDown?: DrillDownAction } | undefined} widget */
export function drillDownForWidget(widget) {
  if (!widget) return null;
  return widget.drillDown || WIDGET_DRILL_DOWN[widget.id] || null;
}

/** @param {DrillDownAction | undefined} drill @param {{ canEditLayout?: boolean }} ctx */
export function drillDownHint(drill, ctx = {}) {
  if (!drill) return null;
  switch (drill.action) {
    case "tab":
      return drill.tab === "product-mapping" ? "View product mapping" : "Open view";
    case "section":
      return "Filter to related reports";
    case "layouts":
      return drill.status === "in_review" ? "Review pending layouts" : "Browse layouts";
    case "layout-editor":
      return ctx.canEditLayout ? "Open layout in editor" : "Open layout (view only)";
    case "catalog":
      return "Open product catalog";
    case "admin":
      return "Open admin audit log";
    default:
      return "View details";
  }
}
