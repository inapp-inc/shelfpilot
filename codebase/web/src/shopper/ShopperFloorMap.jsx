import { useMemo } from "react";
import { layoutStoreEnvelope, polygonAabb, rectanglePolygon } from "../layout-editor/polygonCanvas.js";
import {
  runwayBandsForMap,
  schematicAisleFontSize,
  schematicFontSize,
  shelfTilesForMap,
} from "./shopperSchematicMap.js";

function pathFromPoints(points) {
  if (!points?.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

function MapPin({ x, y, scale }) {
  const s = scale || 1;
  return (
    <g className="shopper-floor-map-pin" transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={1.05} rx={0.32} ry={0.11} className="shopper-floor-map-pin-shadow" />
      <path
        d="M0,-0.82 C0.44,-0.82 0.76,-0.5 0.76,-0.06 C0.76,0.42 0,1.12 0,1.12 C0,1.12 -0.76,0.42 -0.76,-0.06 C-0.76,-0.5 -0.44,-0.82 0,-0.82 Z"
        className="shopper-floor-map-pin-body"
      />
      <circle cx={0} cy={-0.1} r={0.24} className="shopper-floor-map-pin-dot" />
    </g>
  );
}

function EntryMarker({ entryPoint, route, label, fontSize }) {
  if (!entryPoint) return null;
  const next = route?.length >= 2 ? route[1] : null;
  let tipX = entryPoint.x;
  let tipY = entryPoint.y - 0.6;
  if (next) {
    const dx = next.x - entryPoint.x;
    const dy = next.y - entryPoint.y;
    const len = Math.hypot(dx, dy) || 1;
    tipX = entryPoint.x + (dx / len) * 0.65;
    tipY = entryPoint.y + (dy / len) * 0.65;
  }
  const fs = fontSize * 0.85;
  return (
    <g className="shopper-floor-map-entry">
      <polygon
        points={`${entryPoint.x},${entryPoint.y + 0.42} ${tipX},${tipY} ${entryPoint.x - 0.38},${entryPoint.y + 0.62} ${entryPoint.x + 0.38},${entryPoint.y + 0.62}`}
        className="shopper-floor-map-entry-arrow"
      />
      <circle cx={entryPoint.x} cy={entryPoint.y} r={0.52} />
      <text
        x={entryPoint.x}
        y={entryPoint.y - 0.95}
        textAnchor="middle"
        fontSize={fs}
        className="shopper-floor-map-entry-label"
      >
        {label}
      </text>
    </g>
  );
}

/** Schematic kiosk map — runway bands + shelf tiles + walk path (mockup style). */
export default function ShopperFloorMap({
  layout,
  entryPoint,
  route = [],
  markerPoint = null,
  highlightShelfId = null,
  highlightAisleId = null,
  className = "",
}) {
  const scene = useMemo(() => {
    if (!layout) return null;
    const envelope = layoutStoreEnvelope(layout);
    const poly =
      layout.polygon?.length >= 3
        ? layout.polygon
        : rectanglePolygon(envelope.x, envelope.y, envelope.widthMeters, envelope.depthMeters);
    const aabb = polygonAabb(poly) || {
      minX: 0,
      minY: 0,
      width: envelope.widthMeters,
      height: envelope.depthMeters,
    };
    const pad = 1;
    const vb = {
      minX: aabb.minX - pad,
      minY: aabb.minY - pad,
      width: aabb.width + pad * 2,
      height: aabb.height + pad * 2,
    };
    return {
      poly,
      vb,
      runways: runwayBandsForMap(layout),
      tiles: shelfTilesForMap(layout),
      labelFs: schematicFontSize(vb.width, vb.height),
      aisleFs: schematicAisleFontSize(vb.width, vb.height),
    };
  }, [layout]);

  if (!layout || !scene) {
    return <div className={`shopper-floor-map shopper-floor-map--empty ${className}`.trim()} />;
  }

  const { poly, vb, runways, tiles, labelFs, aisleFs } = scene;
  const viewBox = `${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`;
  const hasRoute = route.length >= 2;
  const routeD = pathFromPoints(route);
  const pinAt = markerPoint || (hasRoute ? route[route.length - 1] : null);
  const entryLabel = entryPoint?.label || "Entrance";
  const pinScale = Math.max(0.85, Math.min(1.35, vb.width / 28));

  return (
    <svg
      className={`shopper-floor-map shopper-floor-map--schematic${hasRoute ? " shopper-floor-map--routed" : ""} ${className}`.trim()}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Store map with walking route to product"
    >
      <rect x={vb.minX} y={vb.minY} width={vb.width} height={vb.height} className="shopper-floor-map-bg" />
      <polygon points={poly.map((p) => `${p.x},${p.y}`).join(" ")} className="shopper-floor-map-store" />

      {runways.map((band) => {
        const isTarget = highlightAisleId && band.id === highlightAisleId;
        return (
          <g key={band.id} className="shopper-floor-map-runway">
            <rect
              x={band.x}
              y={band.y}
              width={band.w}
              height={band.h}
              rx={0.1}
              className={`shopper-floor-map-runway-fill${isTarget ? " is-target-aisle" : ""}`}
            />
            {band.label ? (
              <text
                x={band.cx}
                y={band.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={aisleFs}
                fontWeight={900}
                className={`shopper-floor-map-aisle-num mono${isTarget ? " is-target-aisle" : ""}`}
              >
                {band.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {routeD ? (
        <>
          <path d={routeD} className="shopper-floor-map-way-shadow" />
          <path d={routeD} className="shopper-floor-map-way" />
        </>
      ) : null}

      {tiles.map((tile) => {
        const active = highlightShelfId && tile.id === highlightShelfId;
        const dimmed = Boolean(highlightShelfId && !active);
        return (
          <g key={tile.id} className={`shopper-floor-map-tile${active ? " is-target" : ""}${dimmed ? " is-dimmed" : ""}`}>
            <rect
              x={tile.aabb.x}
              y={tile.aabb.y}
              width={tile.aabb.w}
              height={tile.aabb.h}
              className={`shopper-floor-map-shelf${active ? " is-target" : ""}${dimmed ? " is-dimmed" : ""}`}
              rx={0.04}
            />
            {tile.label && tile.label !== "—" ? (
              <text
                x={tile.at.x}
                y={tile.at.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={labelFs}
                fontWeight={800}
                className={`shopper-floor-map-shelf-label mono${active ? " is-target" : ""}${dimmed ? " is-dimmed" : ""}`}
              >
                {tile.label}
              </text>
            ) : null}
          </g>
        );
      })}

      <EntryMarker entryPoint={entryPoint} route={route} label={entryLabel} fontSize={labelFs} />

      {pinAt && highlightShelfId ? <MapPin x={pinAt.x} y={pinAt.y} scale={pinScale} /> : null}
    </svg>
  );
}
