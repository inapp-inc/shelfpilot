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
export function ShelfTargetMarker({
  outline,
  badge,
  markR,
  spotIndex = null,
  variant = "primary",
  onActivate = null,
  ariaLabel = null,
}) {
  if (!badge) return null;
  const r = markR || 0.07;
  const secondary = variant === "secondary";
  const interactive = typeof onActivate === "function";
  const numbered = spotIndex != null;
  const showFootprint = !numbered && outline?.length >= 3;

  return (
    <g
      className={`shopper-floor-map-target${secondary ? " shopper-floor-map-target--secondary" : ""}${
        numbered ? " shopper-floor-map-target--numbered" : ""
      }${interactive ? " shopper-floor-map-target--interactive" : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? ariaLabel || `Location ${spotIndex ?? ""}`.trim() : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onActivate();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
    >
      {showFootprint ? (
        <>
          <path d={shelfOutlinePath(outline)} className="shopper-floor-map-shelf-outline" />
          <path d={shelfOutlinePath(outline)} className="shopper-floor-map-shelf-fill" />
        </>
      ) : null}
      {numbered ? (
        <>
          <circle cx={badge.x} cy={badge.y} r={r * 1.45} className="shopper-floor-map-shelf-mark-dot" />
          <text
            x={badge.x}
            y={badge.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={r * 2.05}
            fontWeight={800}
            className="shopper-floor-map-spot-index"
          >
            {spotIndex}
          </text>
        </>
      ) : (
        <>
          <circle cx={badge.x} cy={badge.y} r={r * 1.35} className="shopper-floor-map-shelf-mark-dot" />
        </>
      )}
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

/** Shorten the visible polyline so the arrowhead sits at the destination without a square notch on the stroke. */
function routeLineAndArrow(route, wayW) {
  if (!route || route.length < 2) return { lineRoute: route || [], head: null };
  const end = route[route.length - 1];
  const prev = route[route.length - 2];
  const dx = end.x - prev.x;
  const dy = end.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const tip = wayW * 1.35;
  const wing = wayW * 0.72;
  const trim = Math.min(len * 0.92, tip * 1.25);
  const lineEnd = {
    x: end.x - (dx / len) * trim,
    y: end.y - (dy / len) * trim,
  };
  const lineRoute =
    route.length > 2 ? [...route.slice(0, -1), lineEnd] : [route[0], lineEnd];
  return {
    lineRoute,
    head: { x: end.x, y: end.y, angle, tip, wing },
  };
}

export function RouteLayer({
  route,
  routeD,
  wayW,
  wayDash,
  variant = "primary",
  showTurnNodes = false,
  showArrow = true,
  animate = true,
}) {
  if (!route?.length) return null;
  const { lineRoute, head } = routeLineAndArrow(route, wayW);
  const lineD = pathFromPoints(lineRoute);
  if (!lineD) return null;
  const turns = lineRoute.length > 2 ? lineRoute.slice(1, -1) : [];
  const dashStyle = wayDash ? { strokeDasharray: `${wayDash.dash} ${wayDash.gap}` } : undefined;
  const secondary = variant === "secondary";
  const haloW = wayW * (secondary ? 1.9 : 2.15);

  return (
    <g
      className={`shopper-floor-map-way-group${secondary ? " shopper-floor-map-way-group--secondary" : ""}${
        animate ? "" : " shopper-floor-map-way-group--static"
      }`.trim()}
    >
      <path
        d={lineD}
        className="shopper-floor-map-way-halo"
        style={{ strokeWidth: haloW, opacity: secondary ? 0.88 : 1 }}
      />
      <path
        d={lineD}
        className="shopper-floor-map-way"
        style={{ strokeWidth: wayW, opacity: secondary ? 0.88 : 1, ...dashStyle }}
      />
      {showTurnNodes && turns.length <= 4
        ? turns.map((p, i) => (
            <circle key={`turn-${i}`} cx={p.x} cy={p.y} r={wayW * 0.55} className="shopper-floor-map-way-node" />
          ))
        : null}
      {head && showArrow && !secondary ? (
        <g
          className="shopper-floor-map-way-arrow"
          transform={`translate(${head.x} ${head.y}) rotate(${head.angle})`}
          aria-hidden
        >
          <path
            d={`M 0 ${-head.wing} L ${head.tip} 0 L 0 ${head.wing} Z`}
            className="shopper-floor-map-way-arrow-shape"
          />
        </g>
      ) : null}
    </g>
  );
}
