/** Dependency-free SVG donut chart. `data` = [{ label, value, color }]. */
export default function DonutChart({ data = [], size = 160, thickness = 26, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + Math.max(0, Number(d.value) || 0), 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;
  const segments =
    total > 0
      ? data
          .filter((d) => Number(d.value) > 0)
          .map((d, i) => {
            const frac = d.value / total;
            const len = frac * c;
            const seg = (
              <circle
                key={d.label ?? i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={d.color || "#A30A2A"}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            );
            offset += len;
            return seg;
          })
      : null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef0f2" strokeWidth={thickness} />
      {segments}
      {centerValue != null ? (
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight="700" fill="#1f2933">
          {centerValue}
        </text>
      ) : null}
      {centerLabel ? (
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#6b7280">
          {centerLabel}
        </text>
      ) : null}
    </svg>
  );
}
