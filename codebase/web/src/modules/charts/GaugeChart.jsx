/** Dependency-free semicircle gauge (0–100). */
export default function GaugeChart({ value = 0, label, size = 120, color = "#A30A2A" }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size * 0.55;
  const start = Math.PI;
  const end = 0;
  const arc = Math.PI * r;
  const filled = (pct / 100) * arc;

  const bgPath = describeArc(cx, cy, r, start, end);
  return (
    <div className="gauge-chart" style={{ textAlign: "center" }}>
      <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`} role="img">
        <path d={bgPath} fill="none" stroke="#eef0f2" strokeWidth={12} strokeLinecap="round" />
        <path
          d={bgPath}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${arc}`}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="#1f2933">
          {pct}%
        </text>
        {label ? (
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#6b7280">
            {label}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
}
