/** Shared chart palette — semantic, accessible colors used across dashboard analytics. */

export const CHART = {
  primary: "#2563eb",
  secondary: "#64748b",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  purple: "#7c3aed",
  teal: "#0d9488",
  light: "#cbd5e1",
  brand: "#A30A2A",
};

export const CHART_SERIES = [
  CHART.primary,
  CHART.teal,
  CHART.warning,
  CHART.purple,
  CHART.success,
  CHART.secondary,
  CHART.danger,
];

export const SPACE_BREAKDOWN_COLORS = {
  allocated: CHART.primary,
  aisle: CHART.secondary,
  blocked: CHART.purple,
  obstacles: "#334155",
  unused: CHART.light,
};

/** Pick a series color by index when API does not supply one. */
export function seriesColor(index) {
  return CHART_SERIES[index % CHART_SERIES.length];
}

/** Apply standard series colors to chart rows. */
export function withSeriesColors(rows = []) {
  return rows.map((row, i) => ({
    ...row,
    color: row.color && row.color !== "#A30A2A" ? row.color : seriesColor(i),
  }));
}

/** Map space breakdown segment keys to the shared palette. */
export function mapSpaceBreakdown(breakdown = []) {
  return breakdown.map((seg) => ({
    ...seg,
    color: SPACE_BREAKDOWN_COLORS[seg.key] || seg.color || CHART.secondary,
  }));
}

/** Utilization tier color for vertical space bars. */
export function utilizationTierColor(percent) {
  if (percent >= 70) return CHART.primary;
  if (percent >= 40) return CHART.warning;
  return CHART.secondary;
}

export const KPI_ACCENT = {
  success: CHART.success,
  warning: CHART.warning,
  danger: CHART.danger,
  brand: CHART.brand,
};
