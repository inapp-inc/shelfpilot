import { CHART } from "./chartColors.js";

/** Dependency-free horizontal bar chart. `data` = [{ label, value, color, title? }]. */
export default function BarChart({ data = [], unit = "", max, formula }) {
  const top = max != null ? max : Math.max(1, ...data.map((d) => Number(d.value) || 0));
  if (!data.length) {
    return <div className="muted" style={{ fontSize: 12.5 }}>No data yet.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }} title={formula || undefined}>
      {data.map((d, i) => {
        const pct = Math.max(0, Math.min(100, (Number(d.value) / top) * 100));
        const tip = d.title || `${d.label}: ${d.value}${unit}${formula ? ` · ${formula}` : ""}`;
        return (
          <div key={d.label ?? i} style={{ display: "flex", alignItems: "center", gap: 10 }} title={tip}>
            <span style={{ flex: "0 0 120px", fontSize: 12.5, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d.label}
            </span>
            <div style={{ flex: 1, background: "#eef0f2", borderRadius: 8, height: 14, overflow: "hidden" }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: d.color || CHART.primary,
                  borderRadius: 8,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <span className="mono" style={{ flex: "0 0 auto", fontSize: 12, color: "#1f2933", minWidth: 44, textAlign: "right" }}>
              {d.value}
              {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}
