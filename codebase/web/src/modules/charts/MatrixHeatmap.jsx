/** Category adjacency matrix heat grid. */
export default function MatrixHeatmap({ matrix = [], categories = [], categoryNames = {} }) {
  if (!matrix.length) {
    return <div className="muted" style={{ fontSize: 12.5 }}>No mapped categories to compare.</div>;
  }
  const labels = categories.map((id) => categoryNames[id] || id.slice(0, 8));
  const cell = 28;
  const pad = 72;
  const size = pad + matrix.length * cell;

  return (
    <div className="matrix-heatmap-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        {labels.map((lab, i) => (
          <text key={`r-${i}`} x={pad - 6} y={pad + i * cell + cell * 0.65} textAnchor="end" fontSize="9" fill="#64748b">
            {lab}
          </text>
        ))}
        {labels.map((lab, j) => (
          <text
            key={`c-${j}`}
            x={pad + j * cell + cell / 2}
            y={pad - 8}
            textAnchor="middle"
            fontSize="9"
            fill="#64748b"
            transform={`rotate(-35 ${pad + j * cell + cell / 2} ${pad - 8})`}
          >
            {lab}
          </text>
        ))}
        {matrix.map((row, i) =>
          row.cells.map((cellData, j) => {
            const on = cellData.adjacent && i !== j;
            return (
              <rect
                key={`${i}-${j}`}
                x={pad + j * cell + 1}
                y={pad + i * cell + 1}
                width={cell - 2}
                height={cell - 2}
                rx={4}
                fill={i === j ? "#f1f5f9" : on ? "#A30A2A" : "#eef0f2"}
                opacity={i === j ? 0.5 : on ? 0.35 + Math.min(cellData.count, 3) * 0.2 : 1}
              />
            );
          })
        )}
      </svg>
      <div className="muted matrix-heatmap-legend">Darker = more adjacent fixture pairs</div>
    </div>
  );
}
