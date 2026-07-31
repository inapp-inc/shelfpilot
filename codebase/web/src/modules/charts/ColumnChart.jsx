/** Vertical column chart for tier / level metrics. */
export default function ColumnChart({ data = [], unit = "", max = 100, height = 140 }) {
  if (!data.length) {
    return <div className="muted column-chart-empty">No data yet.</div>;
  }
  const top = max != null ? max : Math.max(1, ...data.map((d) => Number(d.value) || 0));

  return (
    <div className="column-chart" style={{ height }}>
      <div className="column-chart-bars">
        {data.map((d, i) => {
          const pct = Math.max(0, Math.min(100, (Number(d.value) / top) * 100));
          return (
            <div key={d.label ?? i} className="column-chart-col" title={`${d.label}: ${d.value}${unit}`}>
              <div className="column-chart-val mono">{d.value}{unit}</div>
              <div className="column-chart-track">
                <div
                  className="column-chart-fill"
                  style={{ height: `${pct}%`, background: d.color || "#A30A2A" }}
                />
              </div>
              <div className="column-chart-label">{d.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
