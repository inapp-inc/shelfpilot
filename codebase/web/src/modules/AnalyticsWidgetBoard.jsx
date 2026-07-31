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
import AnalyticsWidgetCard from "./AnalyticsWidgetCard.jsx";
import {
  catalogVerticalsForLayout,
  categoryDisplayName,
  mergeCategoriesForLayout,
} from "../layout-editor/categoryFilter.js";
import {
  ANALYTICS_WIDGET_GROUPS,
  ANALYTICS_WIDGET_MAP,
  ANALYTICS_WIDGETS,
  defaultWidgetSizes,
  readWidgetBoardPrefs,
  widgetMatchesSection,
  writeWidgetBoardPrefs,
} from "./analyticsWidgets.js";

function CustomizePanel({ visibleSet, onToggle, onShowAll, onReset, onClose, title = "Customize dashboard", excludeWidgetIds = [] }) {
  const excluded = useMemo(() => new Set(excludeWidgetIds), [excludeWidgetIds]);
  const availableWidgets = ANALYTICS_WIDGETS.filter((w) => !excluded.has(w.id));
  const hiddenCount = availableWidgets.length - [...visibleSet].filter((id) => !excluded.has(id)).length;

  return (
    <div className="panel analytics-customize-panel">
      <div className="analytics-customize-head">
        <div>
          <div className="section-label analytics-customize-title">{title}</div>
          <p className="muted analytics-customize-desc">
            Show or hide widgets, drag the corner grip to resize cards, or double-click the grip to reset size.
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

function KpiContent({ label, value, hint, accent }) {
  return (
    <>
      <div className="muted analytics-kpi-label">{label}</div>
      <div className="mono kpi-value" style={accent ? { color: accent } : undefined}>{value}</div>
      {hint ? <div className="muted analytics-kpi-hint">{hint}</div> : null}
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
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [comparison, setComparison] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [auditSummary, setAuditSummary] = useState(null);
  const [layoutVersions, setLayoutVersions] = useState([]);
  const [versionA, setVersionA] = useState("");
  const [versionB, setVersionB] = useState("");
  const [versionComparison, setVersionComparison] = useState(null);
  const [categories, setCategories] = useState([]);
  const [visibleWidgets, setVisibleWidgets] = useState(() => initialPrefs.visible);
  const [widgetSizes, setWidgetSizes] = useState(() => initialPrefs.sizes);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const kpiGridRef = useRef(null);
  const reportGridRef = useRef(null);

  const visibleSet = useMemo(() => {
    const base = new Set(visibleWidgets.filter((id) => !excluded.has(id)));
    if (!sectionFilter || sectionFilter === "all") return base;
    const filtered = new Set();
    for (const id of base) {
      const widget = ANALYTICS_WIDGET_MAP[id];
      if (widget && widgetMatchesSection(widget, sectionFilter)) filtered.add(id);
    }
    return filtered;
  }, [visibleWidgets, excluded, sectionFilter]);
  const selectedLayout = sorted.find((l) => l.id === layoutId);

  const persistDashboard = useCallback(
    (visible, sizes) => {
      setVisibleWidgets(visible);
      setWidgetSizes(sizes);
      writeWidgetBoardPrefs({ visible, sizes }, storageKey);
    },
    [storageKey]
  );

  const persistVisible = useCallback(
    (next) => persistDashboard(next, widgetSizes),
    [persistDashboard, widgetSizes]
  );

  const updateWidgetSize = useCallback(
    (id, patch) => {
      persistDashboard(visibleWidgets, { ...widgetSizes, [id]: { ...widgetSizes[id], ...patch } });
    },
    [persistDashboard, visibleWidgets, widgetSizes]
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
    persistDashboard([...defaultVisibleIds], defaultWidgetSizes());
  }, [defaultVisibleIds, persistDashboard]);

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
    if (!layoutId || !token) {
      setLayoutVersions([]);
      return;
    }
    let cancelled = false;
    api(`/layouts/${layoutId}/versions`, { token })
      .then((v) => !cancelled && setLayoutVersions(Array.isArray(v) ? v : v?.items || []))
      .catch(() => !cancelled && setLayoutVersions([]));
    return () => {
      cancelled = true;
    };
  }, [layoutId, token]);

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

  const categoryBars = useMemo(
    () =>
      (summary?.categorySpaceAllocation?.rows || summary?.allocationByCategory || []).map((r) => ({
        label: categoryDisplayName(r.categoryId, categories) || r.categoryName,
        value: r.areaSqm ?? r.shelfCount ?? r.fixtureCount ?? 0,
        color: r.color,
      })),
    [summary, categories]
  );

  const fixtureMix = (summary?.fixtureMix || []).map((r) => ({
    label: r.type,
    value: r.count,
    color: "#64748b",
  }));

  const verticalLevels = summary?.verticalSpaceUtilization?.levels || [];
  const capacity = summary?.capacityVariance;

  async function runCompare() {
    if (!compareA || !compareB) return;
    try {
      setComparison(await api("/analytics/compare", { token, method: "POST", body: { layoutIdA: compareA, layoutIdB: compareB } }));
    } catch (e) {
      toast?.(e.message);
    }
  }

  async function runVersionCompare() {
    if (!layoutId || !versionA || !versionB) return;
    try {
      setVersionComparison(
        await api("/analytics/compare", {
          token,
          method: "POST",
          body: { layoutIdA: layoutId, layoutIdB: layoutId, versionIdA: versionA, versionIdB: versionB },
        })
      );
    } catch (e) {
      toast?.(e.message);
    }
  }

  function widgetCardProps(id, kpi = false) {
    return {
      widget: ANALYTICS_WIDGET_MAP[id],
      size: widgetSizes[id],
      gridMode: kpi ? "kpi" : "report",
      gridRef: kpi ? kpiGridRef : reportGridRef,
      onRemove: hideWidget,
      onSizeChange: updateWidgetSize,
      kpi,
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
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id, true)}>
            <KpiContent label="Utilization" value={`${exec?.utilizationPercent ?? summary.utilizationPercent}%`} hint="Allocated ÷ store area" />
          </AnalyticsWidgetCard>
        );
      case "kpi-product-coverage": {
        const cov = summary.productCoverage;
        const covHint = cov
          ? `${cov.placedCount}/${cov.totalProducts} placed${cov.missingCount ? ` · ${cov.missingCount} missing` : ""}`
          : "SKUs on shelves";
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id, true)}>
            <KpiContent label="Product coverage" value={exec?.productCoveragePercent != null ? `${exec.productCoveragePercent}%` : "—"} hint={covHint} />
          </AnalyticsWidgetCard>
        );
      }
      case "kpi-aisle-compliance":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id, true)}>
            <KpiContent label="Aisle compliance" value={`${exec?.aisleCompliancePercent ?? 100}%`} hint="Min width rules" accent={exec?.aisleCompliancePercent < 100 ? "#dc2626" : undefined} />
          </AnalyticsWidgetCard>
        );
      case "kpi-unmapped-shelves":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id, true)}>
            <KpiContent label="Unmapped shelves" value={`${exec?.unmappedSpacePercent ?? 0}%`} hint="Empty shelf area" accent={exec?.unmappedSpacePercent > 0 ? "#d97706" : undefined} />
          </AnalyticsWidgetCard>
        );
      case "kpi-fixtures":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id, true)}>
            <KpiContent label="Fixtures" value={String(exec?.fixtureCount ?? summary.fixtureCount)} hint={`${summary.fixtureDensity?.fixturesPer100Sqm ?? "—"} / 100 m²`} />
          </AnalyticsWidgetCard>
        );
      case "kpi-capacity-variance":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id, true)}>
            <KpiContent
              label="Capacity variance"
              value={capacity?.variancePercent != null ? `${capacity.variancePercent > 0 ? "+" : ""}${capacity.variancePercent}%` : "—"}
              hint={capacity ? `${capacity.actualFixtureCount} vs ${capacity.theoreticalMaxFixtures} max` : undefined}
              accent={capacity?.variancePercent != null && Math.abs(capacity.variancePercent) > 15 ? "#dc2626" : "oklch(0.5 0.12 150)"}
            />
          </AnalyticsWidgetCard>
        );
      case "kpi-pending-approval":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id, true)}>
            <KpiContent
              label="Pending approval"
              value={String(portfolio?.approvalStatus?.pendingApproval ?? 0)}
              hint={`${portfolio?.approvalStatus?.total ?? layouts.length} layouts total`}
              accent={portfolio?.approvalStatus?.pendingApproval > 0 ? "#d97706" : undefined}
            />
          </AnalyticsWidgetCard>
        );
      case "space-utilization":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)} className="analytics-widget--space">
            <SpaceUtilizationPanel space={space} />
          </AnalyticsWidgetCard>
        );
      case "fixture-density": {
        const zones = summary?.fixtureDensityByZone?.rows || [];
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            <div className="analytics-inline-kpi">
              <strong>{summary?.fixtureDensity?.fixturesPer100Sqm ?? "—"}</strong>
              <span className="muted">fixtures / 100 m² (store avg)</span>
            </div>
            {zones.length ? (
              <BarChart
                data={zones.map((z) => ({ label: z.label, value: z.fixturesPer100Sqm, color: "#64748b" }))}
                unit=""
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
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            {categoryBars.length ? <BarChart data={categoryBars} unit=" m²" /> : <div className="muted">No category mappings yet.</div>}
          </AnalyticsWidgetCard>
        );
      case "fixture-mix":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            {fixtureMix.length ? <DonutChart data={fixtureMix} centerValue={String(summary.fixtureCount)} centerLabel="fixtures" /> : <div className="muted">No fixtures placed.</div>}
          </AnalyticsWidgetCard>
        );
      case "capacity-compare":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            {capacity ? (
              <div className="analytics-capacity-compare">
                <div className="analytics-capacity-col"><div className="muted">Theoretical max</div><div className="mono analytics-capacity-val">{capacity.theoreticalMaxFixtures}</div></div>
                <div className="analytics-capacity-col"><div className="muted">Actual placed</div><div className="mono analytics-capacity-val">{capacity.actualFixtureCount}</div></div>
                <div className="analytics-capacity-col"><div className="muted">Variance</div><div className="mono analytics-capacity-val" style={{ color: capacity.nearOptimal ? "oklch(0.5 0.12 150)" : "#dc2626" }}>{capacity.variancePercent != null ? `${capacity.variancePercent}%` : "—"}</div></div>
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
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            <div className="analytics-inline-kpi">
              <strong>{summary.aisleCompliance?.compliancePercent ?? 100}%</strong>
              <span className="muted">{summary.aisleCompliance?.compliantCount ?? 0} / {summary.aisleCompliance?.aisleCount ?? 0} aisles ≥ {summary.aisleCompliance?.minAisleWidthMeters} m</span>
            </div>
            {(summary.aisleCompliance?.aisles || []).length ? (
              <table className="analytics-table">
                <thead><tr><th>Aisle</th><th>Width</th><th>Status</th></tr></thead>
                <tbody>
                  {summary.aisleCompliance.aisles.map((a) => (
                    <tr key={a.aisleId}><td>{a.name}</td><td className="mono">{a.widthMeters} m</td><td className={a.compliant ? "analytics-pass" : "analytics-fail"}>{a.compliant ? "Compliant" : "Violation"}</td></tr>
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
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            <div className="analytics-inline-kpi">
              <strong>{summary.unmappedShelves?.emptyShelfPercent ?? 0}%</strong>
              <span className="muted">of shelf area unmapped ({summary.unmappedShelves?.emptyShelfAreaSqm ?? 0} m²)</span>
            </div>
            {(summary.unmappedShelves?.unmappedShelves || []).length ? (
              <table className="analytics-table">
                <thead><tr><th>Shelf</th><th>Area</th><th>Position</th></tr></thead>
                <tbody>
                  {summary.unmappedShelves.unmappedShelves.map((s) => (
                    <tr key={s.shelfId}><td>{s.label || s.shelfId}</td><td className="mono">{s.areaSqm} m²</td><td className="mono muted">{s.x != null ? `${s.x}, ${s.y}` : "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted">All shelves have a category assigned.</div>
            )}
          </AnalyticsWidgetCard>
        );
      case "product-coverage":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)} className="analytics-widget--flush">
            <MissingProductsPanel coverage={summary.productCoverage} loading={false} categories={categories} alwaysShow defaultOpen={Boolean(summary.productCoverage?.missingCount)} title={ANALYTICS_WIDGET_MAP[id].label} embedded />
          </AnalyticsWidgetCard>
        );
      case "facings-by-category": {
        const facings = (summary?.facingsByCategory || []).map((r) => ({
          label: categoryDisplayName(r.categoryId, categories) || r.categoryName,
          value: r.facings,
          color: r.color,
        }));
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
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
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            <div className="analytics-inline-kpi">
              <strong>{adj?.adjacentPairs ?? 0}</strong>
              <span className="muted">adjacent category pairs within 2.5 m</span>
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
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            <div className="analytics-inline-kpi">
              <strong className={walk?.connected ? "analytics-pass" : walk?.entryCount ? "analytics-fail" : ""}>{walk?.statusLabel ?? "—"}</strong>
              <span className="muted">{walk?.entryCount ?? 0} entries · {walk?.aisleCount ?? 0} aisles</span>
            </div>
            {(walk?.unreachableZones || []).length ? (
              <table className="analytics-table">
                <thead><tr><th>Shelf</th><th>Nearest entry</th></tr></thead>
                <tbody>
                  {walk.unreachableZones.map((z) => (
                    <tr key={z.shelfId}><td>{z.label}</td><td className="mono analytics-fail">{z.nearestEntryMeters} m</td></tr>
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
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            <div className="analytics-chart-row">
              <GaugeChart value={reg?.complianceScore ?? 100} label="compliance" color={reg?.complianceScore >= 80 ? "oklch(0.5 0.12 150)" : "#dc2626"} />
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
      case "version-compare":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            <div className="analytics-compare-controls">
              <select value={versionA} onChange={(e) => setVersionA(e.target.value)}>
                <option value="">Version A</option>
                {layoutVersions.map((v) => <option key={v.id} value={v.id}>{v.label || v.createdAt}</option>)}
              </select>
              <span className="muted">vs</span>
              <select value={versionB} onChange={(e) => setVersionB(e.target.value)}>
                <option value="">Version B</option>
                {layoutVersions.map((v) => <option key={v.id} value={v.id}>{v.label || v.createdAt}</option>)}
              </select>
              <button type="button" className="btn-primary" disabled={!versionA || !versionB} onClick={runVersionCompare}>Compare</button>
            </div>
            {versionComparison ? (
              <div className="analytics-compare-results">
                <div><div className="muted">Utilization Δ (B − A)</div><div className="mono analytics-compare-delta">{versionComparison.utilizationDelta > 0 ? "+" : ""}{versionComparison.utilizationDelta}%</div></div>
                <div><div className="muted">Fixture count Δ</div><div className="mono analytics-compare-delta">{versionComparison.fixtureCountDelta > 0 ? "+" : ""}{versionComparison.fixtureCountDelta}</div></div>
              </div>
            ) : layoutVersions.length < 2 ? (
              <div className="muted">Save at least two layout versions to compare.</div>
            ) : null}
          </AnalyticsWidgetCard>
        );
      case "audit-activity":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            {(auditSummary?.activityByDay || []).length ? (
              <BarChart data={auditSummary.activityByDay.map((d) => ({ label: d.day.slice(5), value: d.count, color: "#64748b" }))} unit="" />
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
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            <FunnelChart stages={portfolio?.approvalStatus?.funnel || []} />
          </AnalyticsWidgetCard>
        );
      case "store-benchmarking": {
        const bench = portfolio?.storeBenchmarking?.rows || [];
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            <div className="analytics-inline-kpi">
              <strong>{portfolio?.storeBenchmarking?.peerAverageFixturesPer1000Sqm ?? "—"}</strong>
              <span className="muted">peer avg fixtures / 1000 m²</span>
            </div>
            {bench.length ? (
              <BarChart data={bench.map((r) => ({ label: r.name, value: r.fixturesPer1000Sqm, color: "#A30A2A" }))} unit="" />
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
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
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
      case "vertical-comparison": {
        const verts = portfolio?.verticalComparison || [];
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            {verts.length ? (
              <table className="analytics-table">
                <thead><tr><th>Vertical</th><th>Layouts</th><th>Util %</th><th>Coverage %</th><th>Density</th><th>Compliance</th></tr></thead>
                <tbody>
                  {verts.map((v) => (
                    <tr key={v.vertical}><td>{v.vertical}</td><td className="mono">{v.layoutCount}</td><td className="mono">{v.avgUtilizationPercent}%</td><td className="mono">{v.avgCoveragePercent}%</td><td className="mono">{v.avgFixtureDensity}</td><td className="mono">{v.avgAisleCompliancePercent}%</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted">No layouts for vertical comparison.</div>
            )}
          </AnalyticsWidgetCard>
        );
      }
      case "layout-standardization": {
        const std = portfolio?.layoutStandardization?.rows || [];
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            {std.length ? (
              <BarChart data={std.map((r) => ({ label: r.name, value: r.deviationScore, color: "#d97706" }))} unit="" />
            ) : (
              <div className="muted">Need 2+ layouts to compute standardization deviation.</div>
            )}
          </AnalyticsWidgetCard>
        );
      }
      case "scenario-compare":
        return (
          <AnalyticsWidgetCard key={id} {...widgetCardProps(id)}>
            <div className="section-label">{ANALYTICS_WIDGET_MAP[id].label}</div>
            <div className="analytics-compare-controls">
              <select value={compareA} onChange={(e) => setCompareA(e.target.value)}><option value="">Layout A</option>{sorted.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
              <span className="muted">vs</span>
              <select value={compareB} onChange={(e) => setCompareB(e.target.value)}><option value="">Layout B</option>{sorted.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
              <button type="button" className="btn-primary" disabled={!compareA || !compareB} onClick={runCompare}>Compare</button>
            </div>
            {comparison ? (
              <div className="analytics-compare-results">
                <div><div className="muted">Utilization Δ (B − A)</div><div className="mono analytics-compare-delta">{comparison.utilizationDelta > 0 ? "+" : ""}{comparison.utilizationDelta}%</div></div>
                <div><div className="muted">Fixture count Δ</div><div className="mono analytics-compare-delta">{comparison.fixtureCountDelta > 0 ? "+" : ""}{comparison.fixtureCountDelta}</div></div>
              </div>
            ) : null}
          </AnalyticsWidgetCard>
        );
      default:
        return null;
    }
  }

  const kpiWidgets = ANALYTICS_WIDGETS.filter((w) => w.group === "kpi" && !excluded.has(w.id));
  const pinnedFeaturedIds = pinFeaturedWidgets
    ? ANALYTICS_WIDGETS.filter((w) => w.featured && !excluded.has(w.id)).map((w) => w.id)
    : [];
  const reportWidgets = ANALYTICS_WIDGETS.filter(
    (w) =>
      (w.group === "report" || w.group === "tool") &&
      !excluded.has(w.id) &&
      !pinnedFeaturedIds.includes(w.id) &&
      !(w.id === "fixture-density" && visibleSet.has("vertical-space"))
  );
  const hasKpis = kpiWidgets.some((w) => visibleSet.has(w.id));
  const hasReports = reportWidgets.some((w) => visibleSet.has(w.id));
  const allHidden = visibleSet.size === 0;

  return (
    <div className={`analytics-widget-board${className ? ` ${className}` : ""}`}>
      {(showLayoutPicker || showCustomize || toolbarExtra) ? (
        <div className="analytics-board-toolbar">
          {toolbarExtra}
          {showCustomize ? (
            <button type="button" className={`btn-secondary analytics-customize-toggle${customizeOpen ? " analytics-customize-toggle--active" : ""}`} onClick={() => setCustomizeOpen((v) => !v)}>
              {customizeOpen ? "Close" : "Customize"}
            </button>
          ) : null}
          {showLayoutPicker ? (
            <select className="analytics-layout-select" value={layoutId} onChange={(e) => setLayoutId(e.target.value)}>
              {!sorted.length ? <option value="">No layouts</option> : null}
              {sorted.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          ) : null}
        </div>
      ) : null}
      {customizeOpen && showCustomize ? (
        <CustomizePanel visibleSet={visibleSet} onToggle={toggleWidget} onShowAll={showAllWidgets} onReset={resetWidgets} onClose={() => setCustomizeOpen(false)} title={customizeTitle} excludeWidgetIds={excludeWidgetIds} />
      ) : null}
      {loading && !summary && !portfolio ? (
        <div className="panel muted analytics-board-loading">Loading analytics…</div>
      ) : !summary && visibleSet.size > 0 && [...visibleSet].every((id) => ANALYTICS_WIDGET_MAP[id]?.portfolio) ? (
        <>
          {hasKpis ? (
            <div className="analytics-kpi-section">
              <div className="section-label analytics-section-label">{kpiSectionLabel}</div>
              <div className="kpi-grid analytics-kpi-grid" ref={kpiGridRef}>{kpiWidgets.map((w) => renderWidget(w.id))}</div>
            </div>
          ) : null}
          {hasReports ? (
            <div className="dashboard-grid analytics-report-grid" ref={reportGridRef}>{reportWidgets.map((w) => renderWidget(w.id))}</div>
          ) : null}
        </>
      ) : !summary ? (
        <div className="empty-box">{emptyMessage}</div>
      ) : allHidden ? (
        <div className="empty-box analytics-empty-custom">
          <p>All widgets are hidden.</p>
          {showCustomize ? <button type="button" className="btn-primary" onClick={() => setCustomizeOpen(true)}>Customize widgets</button> : null}
        </div>
      ) : (
        <>
          {pinFeaturedWidgets && summary?.spaceUtilization && visibleSet.has("space-utilization") ? (
            <div className="panel analytics-pinned-space">
              <SpaceUtilizationPanel space={summary.spaceUtilization} />
            </div>
          ) : null}
          {hasKpis ? (
            <div className="analytics-kpi-section">
              <div className="section-label analytics-section-label">{kpiSectionLabel}</div>
              <div className="kpi-grid analytics-kpi-grid" ref={kpiGridRef}>{kpiWidgets.map((w) => renderWidget(w.id))}</div>
            </div>
          ) : null}
          {hasReports ? (
            <div className="dashboard-grid analytics-report-grid" ref={reportGridRef}>{reportWidgets.map((w) => renderWidget(w.id))}</div>
          ) : null}
        </>
      )}
    </div>
  );
}
