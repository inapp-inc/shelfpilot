import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import DonutChart from "./charts/DonutChart.jsx";
import BarChart from "./charts/BarChart.jsx";
import GaugeChart from "./charts/GaugeChart.jsx";
import MatrixHeatmap from "./charts/MatrixHeatmap.jsx";
import FunnelChart from "./charts/FunnelChart.jsx";
import MissingProductsPanel from "../layout-editor/MissingProductsPanel.jsx";
import SpaceUtilizationPanel from "./SpaceUtilizationPanel.jsx";
import SpaceMetricsSplitPanel from "./SpaceMetricsSplitPanel.jsx";
import StorageVolumePanel from "./StorageVolumePanel.jsx";
import ShelfLoadPanel from "./ShelfLoadPanel.jsx";
import AnalyticsWidgetCard from "./AnalyticsWidgetCard.jsx";
import WidgetInfoTip from "./WidgetInfoTip.jsx";
import { CHART, KPI_ACCENT, seriesColor, withSeriesColors } from "./charts/chartColors.js";
import {
  catalogVerticalsForLayout,
  categoryDisplayName,
  mergeCategoriesForLayout,
} from "../layout-editor/categoryFilter.js";
import {
  ANALYTICS_WIDGET_GROUPS,
  ANALYTICS_WIDGET_MAP,
  ANALYTICS_WIDGETS,
  defaultWidgetOrder,
  defaultWidgetSizes,
  moveWidgetInOrder,
  readWidgetBoardPrefs,
  sortWidgetIds,
  widgetMatchesDashboardTab,
  widgetMatchesSection,
  writeWidgetBoardPrefs,
} from "./analyticsWidgets.js";
import { canCustomizeDashboard, canViewAnalyticsWidget } from "../rolePermissions.js";
import {
  formatAreaFromSqm,
  formatLengthFromMeters,
  formatVolumeFromCubicMeters,
  formatWeightFromKg,
  sqmToSqFt,
} from "../units.js";

function CustomizePanel({ visibleSet, onToggle, onShowAll, onReset, onClose, title = "Customize dashboard", excludeWidgetIds = [], role = null }) {
  const excluded = useMemo(() => new Set(excludeWidgetIds), [excludeWidgetIds]);
  const availableWidgets = ANALYTICS_WIDGETS.filter((w) => !excluded.has(w.id) && canViewAnalyticsWidget(role, w.id));
  const hiddenCount = availableWidgets.length - [...visibleSet].filter((id) => !excluded.has(id)).length;

  return (
    <div className="panel analytics-customize-panel">
      <div className="analytics-customize-head">
        <div>
          <div className="section-label analytics-customize-title">{title}</div>
          <p className="muted analytics-customize-desc">
            Show or hide widgets, drag the ⠿ handle to reorder, resize with the corner grip, or double-click the grip to reset size.
            Your layout is saved in this browser.
          </p>
        </div>
        <button type="button" className="btn-secondary analytics-customize-close" onClick={onClose}>
          Done
        </button>
      </div>
      <div className="analytics-customize-groups">
        {ANALYTICS_WIDGET_GROUPS.map((group) => {
          const widgets = availableWidgets.filter((w) => w.group === group.id);
          if (!widgets.length) return null;
          return (
            <div key={group.id} className="analytics-customize-group">
              <div className="analytics-customize-group-label">{group.label}</div>
              <div className="analytics-customize-chips">
                {widgets.map((widget) => {
                  const on = visibleSet.has(widget.id);
                  return (
                    <button
                      key={widget.id}
                      type="button"
                      className={`analytics-customize-chip${on ? " analytics-customize-chip--on" : ""}`}
                      onClick={() => onToggle(widget.id)}
                      aria-pressed={on}
                    >
                      {on ? "✓" : "+"} {widget.label}
                      {widget.dashboardTab === "product-mapping" ? " ↗ tab" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="analytics-customize-actions">
        {hiddenCount > 0 ? (
          <button type="button" className="btn-secondary" onClick={onShowAll}>
            Show all ({hiddenCount} hidden)
          </button>
        ) : null}
        <button type="button" className="btn-secondary" onClick={onReset}>
          Reset to default
        </button>
      </div>
    </div>
  );
}

function KpiContent({ value, hint, accent, formula }) {
  return (
    <>
      <div
        className="mono kpi-value"
        style={accent ? { color: accent } : undefined}
        title={formula || hint || undefined}
      >
        {value}
      </div>
      {hint ? (
        <div className="muted analytics-kpi-hint" title={formula || undefined}>
          {hint}
        </div>
      ) : null}
    </>
  );
}

/** Shared M9 analytics widget board for Analytics module and Dashboard. */
export default function AnalyticsWidgetBoard({
  layouts,
  token,
  toast,
  storageKey,
  defaultVisibleIds,
  sectionFilter = "all",
  layoutId: controlledLayoutId,
  onLayoutIdChange,
  showLayoutPicker = false,
  showCustomize = true,
  customizeTitle = "Customize dashboard",
  kpiSectionLabel = "Executive KPIs (§7)",
  emptyMessage = "Select a layout to view reports.",
  className = "",
  toolbarExtra = null,
  excludeWidgetIds = [],
  pinFeaturedWidgets = false,
  enableReorder = true,
  dashboardTab = "reports",
  role = null,
  onDrillDown,
  canEditLayout = true,
}) {
  const excluded = useMemo(() => new Set(excludeWidgetIds), [excludeWidgetIds]);
  const sorted = useMemo(
    () => [...layouts].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))),
    [layouts]
  );

  const initialPrefs = useMemo(
    () => readWidgetBoardPrefs({ storageKey, defaultVisible: defaultVisibleIds }),
    [storageKey, defaultVisibleIds]
  );

  const [internalLayoutId, setInternalLayoutId] = useState("");
  const layoutId = controlledLayoutId ?? internalLayoutId;
  const setLayoutId = onLayoutIdChange ?? setInternalLayoutId;

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [auditSummary, setAuditSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [visibleWidgets, setVisibleWidgets] = useState(() => initialPrefs.visible);
  const [widgetSizes, setWidgetSizes] = useState(() => initialPrefs.sizes);
  const [widgetOrder, setWidgetOrder] = useState(() => initialPrefs.order);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const dashboardGridRef = useRef(null);

  const visibleSet = useMemo(() => {
    const base = new Set(
      visibleWidgets.filter((id) => !excluded.has(id) && canViewAnalyticsWidget(role, id))
    );
    if (!sectionFilter || sectionFilter === "all") return base;
    const filtered = new Set();
    for (const id of base) {
      const widget = ANALYTICS_WIDGET_MAP[id];
      if (widget && widgetMatchesSection(widget, sectionFilter)) filtered.add(id);
    }
    return filtered;
  }, [visibleWidgets, excluded, sectionFilter, role]);

  const allowCustomize = showCustomize && canCustomizeDashboard(role);
  const selectedLayout = sorted.find((l) => l.id === layoutId);

  const persistDashboard = useCallback(
    (visible, sizes, order = widgetOrder) => {
      setVisibleWidgets(visible);
      setWidgetSizes(sizes);
      setWidgetOrder(order);
      writeWidgetBoardPrefs({ visible, sizes, order }, storageKey);
    },
    [storageKey, widgetOrder]
  );

  const persistVisible = useCallback(
    (next) => {
      const nextOrder = [...widgetOrder];
      for (const id of next) {
        if (!nextOrder.includes(id)) nextOrder.push(id);
      }
      persistDashboard(next, widgetSizes, nextOrder);
    },
    [persistDashboard, widgetOrder, widgetSizes]
  );

  const updateWidgetSize = useCallback(
    (id, patch) => {
      persistDashboard(visibleWidgets, { ...widgetSizes, [id]: { ...widgetSizes[id], ...patch } }, widgetOrder);
    },
    [persistDashboard, visibleWidgets, widgetSizes, widgetOrder]
  );

  const hideWidget = useCallback(
    (id) => persistVisible(visibleWidgets.filter((w) => w !== id)),
    [persistVisible, visibleWidgets]
  );

  const toggleWidget = useCallback(
    (id) => {
      if (visibleSet.has(id)) {
        persistVisible(visibleWidgets.filter((w) => w !== id));
      } else {
        const order = ANALYTICS_WIDGETS.map((w) => w.id);
        persistVisible([...visibleWidgets, id].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
      }
    },
    [persistVisible, visibleSet, visibleWidgets]
  );

  const showAllWidgets = useCallback(() => {
    persistVisible(ANALYTICS_WIDGETS.map((w) => w.id).filter((id) => !excluded.has(id)));
  }, [persistVisible, excluded]);

  const resetWidgets = useCallback(() => {
    const visible = [...defaultVisibleIds];
    persistDashboard(visible, defaultWidgetSizes(), defaultWidgetOrder(visible));
  }, [defaultVisibleIds, persistDashboard]);

  const onDragHandleStart = useCallback((event, id) => {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }, []);

  const onWidgetDragOver = useCallback((event, id) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (id !== draggingId) setDragOverId(id);
  }, [draggingId]);

  const onWidgetDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const onWidgetDrop = useCallback(
    (event, targetId) => {
      event.preventDefault();
      const fromId = event.dataTransfer.getData("text/plain") || draggingId;
      setDraggingId(null);
      setDragOverId(null);
      if (!fromId || fromId === targetId) return;
      const nextOrder = moveWidgetInOrder(widgetOrder, fromId, targetId);
      persistDashboard(visibleWidgets, widgetSizes, nextOrder);
    },
    [draggingId, persistDashboard, visibleWidgets, widgetSizes, widgetOrder]
  );

  const onWidgetDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverId(null);
  }, []);

  useEffect(() => {
    if (!layoutId && sorted.length) setLayoutId(sorted[0].id);
  }, [sorted, layoutId, setLayoutId]);

  useEffect(() => {
    if (!layoutId || !token) return;
    let cancelled = false;
    setLoading(true);
    api(`/analytics/layouts/${layoutId}/summary`, { token })
      .then((s) => !cancelled && setSummary(s))
      .catch((e) => {
        if (!cancelled) {
          setSummary(null);
          toast?.(e.message);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [layoutId, token, selectedLayout?.contentRevision, toast]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api("/analytics/portfolio", { token })
      .then((p) => !cancelled && setPortfolio(p))
      .catch(() => !cancelled && setPortfolio(null));
    api("/analytics/audit-summary?limit=40", { token })
      .then((a) => !cancelled && setAuditSummary(a))
      .catch(() => !cancelled && setAuditSummary(null));
    return () => {
      cancelled = true;
    };
  }, [token, layouts.length]);

  useEffect(() => {
    const v = selectedLayout?.vertical;
    if (!v || !token) {
      setCategories([]);
      return;
    }
    let cancelled = false;
    const verticals = catalogVerticalsForLayout(v);
    Promise.all(
      verticals.map((cv) =>
        api(`/categories?vertical=${encodeURIComponent(cv)}`, { token }).catch(() => ({ items: [] }))
      )
    )
      .then((results) => {
        if (cancelled) return;
        const listsByVertical = Object.fromEntries(
          verticals.map((cv, i) => [cv, results[i]?.items || []])
        );
        setCategories(mergeCategoriesForLayout(v, listsByVertical));
      })
      .catch(() => !cancelled && setCategories([]));
    return () => {
      cancelled = true;
    };
  }, [selectedLayout?.vertical, token]);

  const exec = summary?.executiveKpis;
  const space = summary?.spaceUtilization;
  const storageVolume = summary?.storageVolume;
  const categoryVolume = summary?.categoryVolumeAllocation;
  const weightLoad = summary?.weightLoad;
  const merchFill = summary?.merchandisingFill;
  const categorySpace = summary?.categorySpaceAllocation;

  const categoryUsesLinearMerch = Boolean(
    categorySpace?.totalLinearMeters && categorySpace.rows?.some((r) => r.linearSharePercent != null)
  );

  const categoryBars = useMemo(
    () =>
      withSeriesColors(
        (categorySpace?.rows || summary?.allocationByCategory || []).map((r) => {
          if (categoryUsesLinearMerch) {
            const linearM = Number(r.linearMeters) || 0;
            return {
              label: categoryDisplayName(r.categoryId, categories) || r.categoryName,
              value: linearM,
              color: r.color,
              title: `${r.categoryName || r.categoryId}: ${formatLengthFromMeters(linearM)} linear · share ${r.linearSharePercent ?? "—"}% · facings × product width on shelf`,
            };
          }
          const sqm = Number(r.areaSqm) || 0;
          const sqft = Math.round(sqmToSqFt(sqm));
          return {
            label: categoryDisplayName(r.categoryId, categories) || r.categoryName,
            value: sqft,
            color: r.color,
            title: `${r.categoryName || r.categoryId}: ${sqft} sq ft (${sqm.toFixed(2)} m²) · share ${r.areaSharePercent ?? r.sharePercent ?? "—"}% · shelf floor allocation`,
          };
        })
      ),
    [summary, categories, categoryUsesLinearMerch, categorySpace]
  );

  const fixtureMix = withSeriesColors(
    (summary?.fixtureMix || []).map((r, i) => ({
      label: r.type,
      value: r.count,
      color: seriesColor(i),
    }))
  );

  const verticalLevels = summary?.verticalSpaceUtilization?.levels || [];
  const capacity = summary?.capacityVariance;

  function widgetCardProps(id) {
    const widget = ANALYTICS_WIDGET_MAP[id];
    const kpi = widget?.group === "kpi";
    return {
      widget,
      size: widgetSizes[id],
      gridMode: kpi ? "kpi" : "report",
      gridRef: dashboardGridRef,
      onRemove: hideWidget,
      onSizeChange: updateWidgetSize,
      kpi,
      enableReorder: enableReorder && dashboardTab === "reports",
      isDragOver: dragOverId === id,
      isDragging: draggingId === id,
      onDragHandleStart,
      onDragEnd: onWidgetDragEnd,
      onDragOver: (e) => onWidgetDragOver(e, id),
      onDragLeave: onWidgetDragLeave,
      onDrop: (e) => onWidgetDrop(e, id),
      onDrillDown,
      canEditLayout,
    };
  }

  function renderWidget(id) {
    const widget = ANALYTICS_WIDGET_MAP[id];
    const needsSummary = !widget?.portfolio;
    if (excluded.has(id) || !visibleSet.has(id)) return null;
    if (needsSummary && !summary) return null;

    switch (id) {
      case "kpi-utilization":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <KpiContent
              value={`${exec?.utilizationPercent ?? summary.utilizationPercent}%`}
              hint="Fixtures ÷ usable floor"
              formula={space?.formula?.utilizationPercent || "allocatedAreaSqm ÷ usableStoreAreaSqm × 100"}
            />
          </AnalyticsWidgetCard>
        );
      case "kpi-product-coverage": {
        const cov = summary.productCoverage;
        const covHint = cov
          ? `${cov.placedCount}/${cov.totalProducts} placed${cov.missingCount ? ` · ${cov.missingCount} missing` : ""}`
          : "SKUs on shelves";
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <KpiContent value={exec?.productCoveragePercent != null ? `${exec.productCoveragePercent}%` : "—"} hint={covHint} />
          </AnalyticsWidgetCard>
        );
      }
      case "kpi-aisle-compliance":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <KpiContent value={`${exec?.aisleCompliancePercent ?? 100}%`} hint="Min width rules" accent={exec?.aisleCompliancePercent < 100 ? KPI_ACCENT.danger : undefined} />
          </AnalyticsWidgetCard>
        );
      case "kpi-unmapped-shelves":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <KpiContent value={`${exec?.unmappedSpacePercent ?? 0}%`} hint="Empty shelf area" accent={exec?.unmappedSpacePercent > 0 ? KPI_ACCENT.warning : undefined} />
          </AnalyticsWidgetCard>
        );
      case "kpi-fixtures":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <KpiContent
              value={String(exec?.fixtureCount ?? summary.fixtureCount)}
              hint={`${summary.fixtureDensity?.fixturesPer100SqFt ?? summary.fixtureDensity?.fixturesPer100Sqm ?? "—"} / 100 sq ft`}
              formula={summary.fixtureDensity?.formula?.fixturesPer100SqFt}
            />
          </AnalyticsWidgetCard>
        );
      case "kpi-storage-volume":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <KpiContent
              value={storageVolume ? `${storageVolume.fillPercent}%` : "—"}
              hint={
                storageVolume
                  ? `${formatVolumeFromCubicMeters(storageVolume.usedVolumeM3)} of ${formatVolumeFromCubicMeters(storageVolume.availableVolumeM3)}`
                  : "Shelf volume filled"
              }
              accent={storageVolume?.fillPercent >= 85 ? KPI_ACCENT.warning : undefined}
            />
          </AnalyticsWidgetCard>
        );
      case "kpi-linear-fill":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <KpiContent
              value={exec?.linearFillPercent != null ? `${exec.linearFillPercent}%` : "—"}
              hint={
                merchFill
                  ? `${formatLengthFromMeters(merchFill.usedLinearMeters, { suffix: false })} / ${formatLengthFromMeters(merchFill.totalLinearCapacityMeters)} shelf linear`
                  : "Planogram vs usable width"
              }
              formula={merchFill?.formula?.linearFillPercent}
            />
          </AnalyticsWidgetCard>
        );
      case "kpi-shelf-load":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <KpiContent
              value={weightLoad ? `${weightLoad.utilizationPercent}%` : "—"}
              hint={
                weightLoad
                  ? weightLoad.overloadedShelfCount > 0
                    ? `${weightLoad.overloadedShelfCount} shelf(s) over limit`
                    : `${formatWeightFromKg(weightLoad.totalLoadKg)} of ${formatWeightFromKg(weightLoad.totalCapacityKg)}`
                  : "Weight vs capacity"
              }
              accent={weightLoad?.overloadedShelfCount > 0 ? KPI_ACCENT.danger : undefined}
            />
          </AnalyticsWidgetCard>
        );
      case "kpi-capacity-variance":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <KpiContent
              value={capacity?.variancePercent != null ? `${capacity.variancePercent > 0 ? "+" : ""}${capacity.variancePercent}%` : "—"}
              hint={capacity ? `${capacity.actualFixtureCount} vs ${capacity.theoreticalMaxFixtures} max` : undefined}
              accent={capacity?.variancePercent != null && Math.abs(capacity.variancePercent) > 15 ? KPI_ACCENT.danger : KPI_ACCENT.success}
            />
          </AnalyticsWidgetCard>
        );
      case "kpi-pending-approval":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <KpiContent
              value={String(portfolio?.approvalStatus?.pendingApproval ?? 0)}
              hint={`${portfolio?.approvalStatus?.total ?? layouts.length} layouts total`}
              accent={portfolio?.approvalStatus?.pendingApproval > 0 ? KPI_ACCENT.warning : undefined}
            />
          </AnalyticsWidgetCard>
        );
      case "space-utilization":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)} className="analytics-widget--space">
            <SpaceUtilizationPanel space={space} />
          </AnalyticsWidgetCard>
        );
      case "storage-volume":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <StorageVolumePanel
              volume={storageVolume}
              categoryVolume={categoryVolume}
              categories={categories}
            />
          </AnalyticsWidgetCard>
        );
      case "shelf-load":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <ShelfLoadPanel load={weightLoad} />
          </AnalyticsWidgetCard>
        );
      case "fixture-density": {
        const zones = summary?.fixtureDensityByZone?.rows || [];
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="analytics-inline-kpi">
              <strong>{summary?.fixtureDensity?.fixturesPer100SqFt ?? summary?.fixtureDensity?.fixturesPer100Sqm ?? "—"}</strong>
              <span className="muted">fixtures / 100 sq ft (store avg)</span>
            </div>
            {zones.length ? (
              <BarChart
                data={zones.map((z) => ({
                  label: z.label,
                  value: z.fixturesPer100SqFt ?? z.fixturesPer100Sqm,
                  color: CHART.secondary,
                  title: `${z.label}: ${z.fixtureCount} units · ${z.areaSqm} m² · density per 100 sq ft`,
                }))}
                unit=""
                formula="physicalUnits ÷ (zoneAreaSqFt / 100)"
              />
            ) : (
              <div className="muted">No zone data.</div>
            )}
          </AnalyticsWidgetCard>
        );
      }
      case "category-allocation":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            {categoryBars.length ? (
              <BarChart
                data={categoryBars}
                unit={categoryUsesLinearMerch ? " m" : " sq ft"}
                formula={categorySpace?.formula}
              />
            ) : (
              <div className="muted">No category mappings yet.</div>
            )}
          </AnalyticsWidgetCard>
        );
      case "fixture-mix":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            {fixtureMix.length ? <DonutChart data={fixtureMix} centerValue={String(summary.fixtureCount)} centerLabel="fixtures" /> : <div className="muted">No fixtures placed.</div>}
          </AnalyticsWidgetCard>
        );
      case "temporary-storage":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            {summary?.temporaryStorage?.count ? (
              <div className="analytics-temp-storage">
                <div className="analytics-inline-kpi">
                  <strong>{summary.temporaryStorage.count}</strong>
                  <span className="muted">units · {summary.temporaryStorage.areaSqm} m² floor area</span>
                </div>
                {(summary.temporaryStorage.byType || []).length ? (
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Count</th>
                        <th>Area</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.temporaryStorage.byType.map((row) => (
                        <tr key={row.type}>
                          <td>{row.label || row.type}</td>
                          <td className="mono">{row.count}</td>
                          <td className="mono">{row.areaSqm} m²</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            ) : (
              <div className="muted">No temporary storage placed.</div>
            )}
          </AnalyticsWidgetCard>
        );
      case "capacity-compare":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            {capacity ? (
              <div className="analytics-capacity-compare">
                <div className="analytics-capacity-col"><div className="muted">Theoretical max</div><div className="mono analytics-capacity-val">{capacity.theoreticalMaxFixtures}</div></div>
                <div className="analytics-capacity-col"><div className="muted">Actual placed</div><div className="mono analytics-capacity-val">{capacity.actualFixtureCount}</div></div>
                <div className="analytics-capacity-col"><div className="muted">Variance</div><div className="mono analytics-capacity-val" style={{ color: capacity.nearOptimal ? KPI_ACCENT.success : KPI_ACCENT.danger }}>{capacity.variancePercent != null ? `${capacity.variancePercent}%` : "—"}</div></div>
              </div>
            ) : (
              <div className="muted">Run Smart Generate for theoretical capacity.</div>
            )}
          </AnalyticsWidgetCard>
        );
      case "vertical-space":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)} className="analytics-widget--space-split">
            <SpaceMetricsSplitPanel
              verticalLevels={verticalLevels}
              fixtureDensity={summary?.fixtureDensity}
              fixtureDensityByZone={summary?.fixtureDensityByZone}
              unmappedShelves={summary?.unmappedShelves}
            />
          </AnalyticsWidgetCard>
        );
      case "aisle-compliance":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="analytics-inline-kpi">
              <strong>{summary.aisleCompliance?.compliancePercent ?? 100}%</strong>
              <span className="muted">{summary.aisleCompliance?.compliantCount ?? 0} / {summary.aisleCompliance?.aisleCount ?? 0} aisles ≥ {formatLengthFromMeters(summary.aisleCompliance?.minAisleWidthMeters)}</span>
            </div>
            {(summary.aisleCompliance?.aisles || []).length ? (
              <table className="analytics-table">
                <thead><tr><th>Aisle</th><th>Width</th><th>Status</th></tr></thead>
                <tbody>
                  {summary.aisleCompliance.aisles.map((a) => (
                    <tr key={a.aisleId}><td>{a.name}</td><td className="mono">{formatLengthFromMeters(a.widthMeters)}</td><td className={a.compliant ? "analytics-pass" : "analytics-fail"}>{a.compliant ? "Compliant" : "Violation"}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted">No aisles in this layout.</div>
            )}
          </AnalyticsWidgetCard>
        );
      case "unmapped-shelves":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="analytics-inline-kpi">
              <strong>{summary.unmappedShelves?.emptyShelfPercent ?? 0}%</strong>
              <span className="muted">of shelf area unmapped ({formatAreaFromSqm(summary.unmappedShelves?.emptyShelfAreaSqm ?? 0)})</span>
            </div>
            {(summary.unmappedShelves?.unmappedShelves || []).length ? (
              <table className="analytics-table">
                <thead><tr><th>Shelf</th><th>Area</th><th>Position</th></tr></thead>
                <tbody>
                  {summary.unmappedShelves.unmappedShelves.map((s) => (
                    <tr key={s.shelfId}><td>{s.label || s.shelfId}</td><td className="mono">{formatAreaFromSqm(s.areaSqm)}</td><td className="mono muted">{s.x != null ? `${s.x}, ${s.y}` : "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted">All shelves have a category assigned.</div>
            )}
          </AnalyticsWidgetCard>
        );
      case "facings-by-category": {
        const facings = withSeriesColors(
          (summary?.facingsByCategory || []).map((r) => ({
            label: categoryDisplayName(r.categoryId, categories) || r.categoryName,
            value: r.facings,
            color: r.color,
          }))
        );
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            {facings.length ? <BarChart data={facings} unit="" /> : <div className="muted">No planogram facings yet.</div>}
          </AnalyticsWidgetCard>
        );
      }
      case "category-adjacency": {
        const adj = summary?.categoryAdjacency;
        const nameMap = Object.fromEntries(
          (adj?.categories || []).map((cid) => [cid, categoryDisplayName(cid, categories)])
        );
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="analytics-inline-kpi">
              <strong>{adj?.adjacentPairs ?? 0}</strong>
              <span className="muted">adjacent category pairs within {formatLengthFromMeters(2.5)}</span>
            </div>
            {adj?.matrix?.length ? (
              <MatrixHeatmap matrix={adj.matrix} categories={adj.categories} categoryNames={nameMap} />
            ) : (
              <div className="muted">Map categories to shelves to build adjacency matrix.</div>
            )}
          </AnalyticsWidgetCard>
        );
      }
      case "walkability": {
        const walk = summary?.walkability;
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="analytics-inline-kpi">
              <strong className={walk?.connected ? "analytics-pass" : walk?.entryCount ? "analytics-fail" : ""}>{walk?.statusLabel ?? "—"}</strong>
              <span className="muted">{walk?.entryCount ?? 0} entries · {walk?.aisleCount ?? 0} aisles</span>
            </div>
            {(walk?.unreachableZones || []).length ? (
              <table className="analytics-table">
                <thead><tr><th>Shelf</th><th>Nearest entry</th></tr></thead>
                <tbody>
                  {walk.unreachableZones.map((z) => (
                    <tr key={z.shelfId}><td>{z.label}</td><td className="mono analytics-fail">{formatLengthFromMeters(z.nearestEntryMeters)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </AnalyticsWidgetCard>
        );
      }
      case "regulatory-compliance": {
        const reg = summary?.regulatoryCompliance;
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="analytics-chart-row">
              <GaugeChart value={reg?.complianceScore ?? 100} label="compliance" color={reg?.complianceScore >= 80 ? KPI_ACCENT.success : KPI_ACCENT.danger} />
              <div className="analytics-scorecard">
                {(reg?.rules || []).map((r) => (
                  <div key={r.id} className={`analytics-scorecard-row${r.pass ? " analytics-scorecard-row--pass" : " analytics-scorecard-row--fail"}`}>
                    <span>{r.pass ? "✓" : "✗"}</span>
                    <span>{r.label}</span>
                    <span className="muted">{r.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnalyticsWidgetCard>
        );
      }
      case "audit-activity":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            {(auditSummary?.activityByDay || []).length ? (
              <BarChart data={auditSummary.activityByDay.map((d, i) => ({ label: d.day.slice(5), value: d.count, color: seriesColor(i) }))} unit="" />
            ) : null}
            {(auditSummary?.entries || []).length ? (
              <table className="analytics-table">
                <thead><tr><th>When</th><th>User</th><th>Action</th></tr></thead>
                <tbody>
                  {auditSummary.entries.slice(0, 12).map((e) => (
                    <tr key={e.id}><td className="mono muted">{String(e.at || "").slice(0, 16)}</td><td>{e.actorEmail}</td><td>{e.action}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted">No layout audit entries yet.</div>
            )}
          </AnalyticsWidgetCard>
        );
      case "approval-status":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <FunnelChart stages={portfolio?.approvalStatus?.funnel || []} />
          </AnalyticsWidgetCard>
        );
      case "store-benchmarking": {
        const bench = portfolio?.storeBenchmarking?.rows || [];
        const peer =
          portfolio?.storeBenchmarking?.peerAverageFixturesPer1000SqFt ??
          portfolio?.storeBenchmarking?.peerAverageFixturesPer1000Sqm;
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="analytics-inline-kpi">
              <strong>{peer ?? "—"}</strong>
              <span className="muted">peer avg fixtures / 1000 sq ft</span>
            </div>
            {bench.length ? (
              <BarChart
                data={bench.map((r, i) => ({
                  label: r.name,
                  value: r.fixturesPer1000SqFt ?? r.fixturesPer1000Sqm,
                  color: seriesColor(i),
                  title: `${r.name}: ${r.fixtureCount} fixtures ÷ (${r.areaSqm} m² as sq ft / 1000) = ${r.fixturesPer1000SqFt ?? r.fixturesPer1000Sqm}; index ${r.capacityIndex}`,
                }))}
                unit=""
                formula={portfolio?.storeBenchmarking?.formula}
              />
            ) : (
              <div className="muted">Add layouts to benchmark across stores.</div>
            )}
          </AnalyticsWidgetCard>
        );
      }
      case "rollout-progress": {
        const rollout = portfolio?.rolloutProgress;
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="analytics-inline-kpi">
              <strong>{rollout?.percentComplete ?? 0}%</strong>
              <span className="muted">{rollout?.complete ?? 0} / {rollout?.total ?? 0} published</span>
            </div>
            {(rollout?.byVertical || []).map((v) => (
              <div key={v.vertical} className="analytics-progress-row">
                <span>{v.vertical}</span>
                <div className="analytics-progress-track"><div className="analytics-progress-fill" style={{ width: `${v.percent}%` }} /></div>
                <span className="mono">{v.percent}%</span>
              </div>
            ))}
          </AnalyticsWidgetCard>
        );
      }
      case "vertical-comparison":
      case "scenario-compare":
      case "version-compare":
        return null;
      case "layout-standardization": {
        const std = portfolio?.layoutStandardization?.rows || [];
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            {std.length ? (
              <BarChart data={std.map((r, i) => ({ label: r.name, value: r.deviationScore, color: seriesColor(i) }))} unit="" />
            ) : (
              <div className="muted">Need 2+ layouts to compute standardization deviation.</div>
            )}
          </AnalyticsWidgetCard>
        );
      }
      default:
        return null;
    }
  }

  const pinnedFeaturedIds = pinFeaturedWidgets
    ? ANALYTICS_WIDGETS.filter((w) => w.featured && !excluded.has(w.id) && canViewAnalyticsWidget(role, w.id)).map((w) => w.id)
    : [];

  const dashboardWidgetPool = ANALYTICS_WIDGETS.filter(
    (w) =>
      (w.group === "kpi" || w.group === "report" || w.group === "tool") &&
      !excluded.has(w.id) &&
      canViewAnalyticsWidget(role, w.id) &&
      !pinnedFeaturedIds.includes(w.id) &&
      widgetMatchesDashboardTab(w, "reports") &&
      !(w.id === "fixture-density" && visibleSet.has("vertical-space"))
  );

  const orderedDashboardWidgets = sortWidgetIds(
    dashboardWidgetPool
      .filter(
        (w) =>
          visibleSet.has(w.id) &&
          widgetMatchesSection(w, sectionFilter) &&
          widgetMatchesDashboardTab(w, dashboardTab)
      )
      .map((w) => w.id),
    widgetOrder
  )
    .map((id) => ANALYTICS_WIDGET_MAP[id])
    .filter(Boolean);

  const hasDashboardWidgets = orderedDashboardWidgets.length > 0;
  const showProductMapping = dashboardTab === "product-mapping" && visibleSet.has("product-coverage");
  const allHidden = visibleSet.size === 0;

  return (
    <div className={`analytics-widget-board${className ? ` ${className}` : ""}`} data-testid="dashboard-widgets">
      {(showLayoutPicker || allowCustomize || toolbarExtra) ? (
        <div className="analytics-board-toolbar">
          {toolbarExtra ? <div className="analytics-board-toolbar-filters">{toolbarExtra}</div> : null}
          <div className="analytics-board-toolbar-actions">
            {showLayoutPicker ? (
              <select
                className="analytics-layout-select"
                data-testid="dashboard-layout-picker"
                value={layoutId}
                onChange={(e) => setLayoutId(e.target.value)}
                aria-label="Layout for analytics"
              >
                {!sorted.length ? <option value="">No layouts</option> : null}
                {sorted.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            ) : null}
            {allowCustomize ? (
              <button type="button" className={`btn-secondary analytics-customize-toggle${customizeOpen ? " analytics-customize-toggle--active" : ""}`} onClick={() => setCustomizeOpen((v) => !v)}>
                {customizeOpen ? "Close" : "Customize"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {customizeOpen && allowCustomize ? (
        <CustomizePanel visibleSet={visibleSet} onToggle={toggleWidget} onShowAll={showAllWidgets} onReset={resetWidgets} onClose={() => setCustomizeOpen(false)} title={customizeTitle} excludeWidgetIds={excludeWidgetIds} role={role} />
      ) : null}
      {loading && !summary && !portfolio ? (
        <div className="panel muted analytics-board-loading">Loading analytics…</div>
      ) : !summary && visibleSet.size > 0 && [...visibleSet].every((id) => ANALYTICS_WIDGET_MAP[id]?.portfolio) ? (
        dashboardTab === "product-mapping" ? (
          showProductMapping ? (
            <div className="panel dashboard-product-mapping">
              <div className="dashboard-product-mapping-head">
                <span className="section-label">{ANALYTICS_WIDGET_MAP["product-coverage"].label}</span>
                <WidgetInfoTip text={ANALYTICS_WIDGET_MAP["product-coverage"].description} />
              </div>
              <div className="muted dashboard-product-mapping-hint">Portfolio widgets load without a layout summary.</div>
            </div>
          ) : (
            <div className="empty-box">Enable Product mapping coverage in Customize to view this tab.</div>
          )
        ) : hasDashboardWidgets ? (
          <div className="analytics-unified-grid" ref={dashboardGridRef}>
            {orderedDashboardWidgets.map((w) => renderWidget(w.id))}
          </div>
        ) : (
          <div className="empty-box">No widgets match the current filters.</div>
        )
      ) : !summary ? (
        <div className="empty-box">{emptyMessage}</div>
      ) : allHidden ? (
        <div className="empty-box analytics-empty-custom">
          <p>All widgets are hidden.</p>
          {allowCustomize ? <button type="button" className="btn-primary" onClick={() => setCustomizeOpen(true)}>Customize widgets</button> : null}
        </div>
      ) : (
        <>
          {dashboardTab === "reports" && pinFeaturedWidgets && summary?.spaceUtilization && visibleSet.has("space-utilization") ? (
            <div className="panel analytics-pinned-space">
              <SpaceUtilizationPanel
                space={summary.spaceUtilization}
                compact
                description={ANALYTICS_WIDGET_MAP["space-utilization"].description}
              />
            </div>
          ) : null}
          {dashboardTab === "product-mapping" ? (
            showProductMapping && summary ? (
              <div className="panel dashboard-product-mapping">
                <div className="dashboard-product-mapping-head">
                  <span className="section-label">{ANALYTICS_WIDGET_MAP["product-coverage"].label}</span>
                  <WidgetInfoTip text={ANALYTICS_WIDGET_MAP["product-coverage"].description} />
                </div>
                <MissingProductsPanel
                  coverage={summary.productCoverage}
                  loading={false}
                  categories={categories}
                  alwaysShow
                  defaultOpen
                  maxProductsPerCategory={null}
                  categoryTabs
                />
              </div>
            ) : (
              <div className="empty-box">
                {visibleSet.has("product-coverage")
                  ? emptyMessage
                  : "Enable Product mapping coverage in Customize to view this tab."}
              </div>
            )
          ) : hasDashboardWidgets ? (
            <div className="analytics-unified-grid" ref={dashboardGridRef}>
              {orderedDashboardWidgets.map((w) => renderWidget(w.id))}
            </div>
          ) : (
            <div className="empty-box">No widgets match the current filters.</div>
          )}
        </>
      )}
    </div>
  );
}
