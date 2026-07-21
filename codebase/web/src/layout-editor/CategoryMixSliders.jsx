/** Category mix sliders with auto-rebalance to 100%. */

function rebalanceMix(rows, changedIndex, nextPercent) {
  const clamped = Math.max(0, Math.min(100, Number(nextPercent) || 0));
  const next = rows.map((r) => ({ ...r }));
  next[changedIndex] = { ...next[changedIndex], percent: clamped };
  const others = next.filter((_, i) => i !== changedIndex);
  const otherTotal = others.reduce((s, r) => s + r.percent, 0);
  const budget = 100 - clamped;
  if (otherTotal <= 0) {
    const each = budget / Math.max(others.length, 1);
    others.forEach((r, i) => {
      const idx = next.findIndex((x) => x.categoryId === r.categoryId);
      next[idx] = { ...next[idx], percent: Math.round(each) };
    });
  } else {
    others.forEach((r) => {
      const idx = next.findIndex((x) => x.categoryId === r.categoryId);
      next[idx] = { ...next[idx], percent: Math.round((r.percent / otherTotal) * budget) };
    });
  }
  const drift = 100 - next.reduce((s, r) => s + r.percent, 0);
  if (drift !== 0 && next.length) {
    const last = next.length - 1 === changedIndex ? next.length - 2 : next.length - 1;
    if (last >= 0) next[last] = { ...next[last], percent: next[last].percent + drift };
  }
  return next;
}

export default function CategoryMixSliders({ mix, onChange, disabled }) {
  const total = mix.reduce((s, r) => s + Number(r.percent || 0), 0);
  const valid = total === 100;

  return (
    <div className="category-mix-panel">
      <div className="category-mix-header">
        <span className="section-label">Category mix</span>
        <span className={`mix-total ${valid ? "ok" : "bad"}`}>Total: {total}% {valid ? "✓" : ""}</span>
      </div>
      {mix.map((row, idx) => (
        <div key={row.categoryId} className="mix-row">
          <span className="mix-emoji">{row.emoji || "📦"}</span>
          <span className="mix-label">{row.label || row.categoryId}</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            disabled={disabled}
            value={row.percent}
            onChange={(e) => onChange(rebalanceMix(mix, idx, e.target.value))}
          />
          <span className="mono mix-pct">{row.percent}%</span>
          {row.temperatureZone === "chilled" ? <span className="zone-tag chilled">🧊</span> : null}
          {row.temperatureZone === "frozen" ? <span className="zone-tag frozen">❄️</span> : null}
        </div>
      ))}
    </div>
  );
}
