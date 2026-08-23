/** Shared SVG map overlays — used by ShopperFloorMap and ShopperLayoutPlanMap. */

export function pathFromPoints(points) {
  if (!points?.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export function shelfOutlinePath(points) {
  if (!points?.length) return "";
  return `${pathFromPoints(points)} Z`;
}

/** Shelf footprint outline + badge on the exact bay the product sits on. */
export function ShelfTargetMarker({ outline, badge, markR }) {
  if (!outline?.length || !badge) return null;
  const r = markR || 0.07;
  return (
    <g className="shopper-floor-map-target">
      <path d={shelfOutlinePath(outline)} className="shopper-floor-map-shelf-outline" />
      <path d={shelfOutlinePath(outline)} className="shopper-floor-map-shelf-fill" />
      <circle cx={badge.x} cy={badge.y} r={r * 2.1} className="shopper-floor-map-shelf-mark-ring" />
      <circle cx={badge.x} cy={badge.y} r={r * 1.35} className="shopper-floor-map-shelf-mark-dot" />
    </g>
  );
}

export function EntryMarker({ entryPoint, fontSize }) {
  if (!entryPoint) return null;
  const plaza = entryPoint.plaza;
  const hereLabel = entryPoint.assumed ? "You are here" : entryPoint.label || entryPoint.name || "Entrance";
  return (
    <g className="shopper-floor-map-entry">
      {plaza ? (
        <rect
          x={plaza.x}
          y={plaza.y}
          width={plaza.w}
          height={plaza.d}
          rx={0.12}
          className="shopper-floor-map-entrance-plaza"
        />
      ) : null}
      <circle
        cx={entryPoint.x}
        cy={entryPoint.y}
        r={Math.max(0.18, fontSize * 0.45)}
        className="shopper-floor-map-entry-ring"
      />
      <circle
        cx={entryPoint.x}
        cy={entryPoint.y}
        r={Math.max(0.12, fontSize * 0.28)}
        className="shopper-floor-map-entry-dot"
      />
      <text
        x={entryPoint.x}
        y={plaza ? plaza.y - fontSize * 0.35 : entryPoint.y - fontSize * 1.15}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={700}
        className="shopper-floor-map-entry-here"
      >
        {hereLabel}
      </text>
    </g>
  );
}

export function RouteLayer({ route, routeD, wayW, wayDash }) {
  if (!routeD) return null;
  const turns = route.length > 2 ? route.slice(1, -1) : [];
  const dashStyle = wayDash ? { strokeDasharray: `${wayDash.dash} ${wayDash.gap}` } : undefined;
  const head =
    route.length >= 2
      ? (() => {
          const end = route[route.length - 1];
          const prev = route[route.length - 2];
          const dx = end.x - prev.x;
          const dy = end.y - prev.y;
          const len = Math.hypot(dx, dy) || 1;
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          const tip = wayW * 1.55;
          const wing = wayW * 0.95;
          return { x: end.x, y: end.y, angle, tip, wing };
        })()
      : null;

  return (
    <>
      <path d={routeD} className="shopper-floor-map-way-halo" style={{ strokeWidth: wayW * 2.1 }} />
      <path
        d={routeD}
        className="shopper-floor-map-way"
        style={{ strokeWidth: wayW, ...dashStyle }}
      />
      {turns.length <= 4
        ? turns.map((p, i) => (
            <circle key={`turn-${i}`} cx={p.x} cy={p.y} r={wayW * 0.7} className="shopper-floor-map-way-node" />
          ))
        : null}
      {head ? (
        <g
          className="shopper-floor-map-way-arrow"
          transform={`translate(${head.x} ${head.y}) rotate(${head.angle})`}
          aria-hidden
        >
          <g className="shopper-floor-map-way-arrow-bob">
            <circle
              cx={0}
              cy={0}
              r={head.wing * 1.35}
              className="shopper-floor-map-way-arrow-glow"
            />
            <path
              d={`M ${-head.tip * 0.55} 0 L ${head.tip * 0.45} ${-head.wing} L ${head.tip * 0.12} 0 L ${head.tip * 0.45} ${head.wing} Z`}
              className="shopper-floor-map-way-arrow-shape"
            />
          </g>
        </g>
      ) : null}
    </>
  );
}
