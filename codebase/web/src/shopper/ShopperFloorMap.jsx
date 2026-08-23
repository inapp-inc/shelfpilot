import { useEffect, useMemo, useRef, useState } from "react";
import Canvas2D from "../layout-editor/Canvas2D.jsx";
import { layoutCanvasBounds, toStageCoords } from "../layout-editor/polygonCanvas.js";
import { routeDashPatternUserUnits, routeStrokeUserUnits } from "./shopperSchematicMap.js";
import { fitLayoutScale } from "./shopperMapFraming.js";
import { routePolylineForMap, shelfMarkerFootprint } from "./shopperWayfinding.js";
import {
  EntryMarker,
  RouteLayer,
  ShelfTargetMarker,
  pathFromPoints,
} from "./mapLayers.jsx";

const noop = () => {};

/**
 * Read-only layout-editor 2D view, fitted to the kiosk host, with the walking route overlaid.
 * Labels stay at editor sizes (pixels) so they never explode when the store is shown in full.
 */
export default function ShopperFloorMap({
  layout,
  entryPoint,
  route = [],
  highlightShelfId = null,
  highlightMapUnitId = null,
  highlightAisleId = null,
  categories = [],
  products = [],
  className = "",
}) {
  const hostRef = useRef(null);
  const [hostBox, setHostBox] = useState(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setHostBox((prev) =>
          prev && Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
            ? prev
            : { width, height }
        );
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout?.id]);

  const bounds = useMemo(() => (layout ? layoutCanvasBounds(layout) : null), [layout]);
  const scale = hostBox && bounds ? fitLayoutScale(bounds, hostBox.width, hostBox.height) : 0;
  const hostWidth = hostBox?.width || 0;

  const overlay = useMemo(() => {
    if (!layout || !bounds) return null;
    const walked = routePolylineForMap(layout, route, highlightShelfId);
    const aisleNear = walked.length >= 2 ? walked[walked.length - 2] : walked[walked.length - 1];
    const footprint = highlightShelfId ? shelfMarkerFootprint(layout, highlightShelfId, aisleNear) : null;
    const pinWorld = footprint?.badge || null;
    const toStage = (p) => {
      if (!p || !Number.isFinite(Number(p.x)) || !Number.isFinite(Number(p.y))) return null;
      return toStageCoords(Number(p.x), Number(p.y), bounds);
    };
    const path = walked.map(toStage).filter(Boolean);
    const shelfOutline = footprint?.corners?.map(toStage).filter(Boolean) || [];
    const badgeAt = pinWorld ? toStage(pinWorld) : null;
    const entry = entryPoint ? { ...entryPoint, ...toStage(entryPoint) } : null;
    if (entry && entryPoint?.plaza) {
      const p0 = toStage({ x: entryPoint.plaza.x, y: entryPoint.plaza.y });
      entry.plaza = p0
        ? { ...entryPoint.plaza, x: p0.x, y: p0.y }
        : entryPoint.plaza;
    }
    const boardW = bounds.width * Math.max(scale, 1);
    const strokeOpts = { minPx: path.length >= 2 ? 5 : 4, renderWidthPx: Math.max(boardW, hostWidth, 560) };
    return {
      path,
      shelfOutline,
      badgeAt,
      entry,
      wayW: routeStrokeUserUnits(bounds.width, strokeOpts),
      wayDash: routeDashPatternUserUnits(bounds.width, {
        dashPx: 11,
        gapPx: 8,
        renderWidthPx: strokeOpts.renderWidthPx,
      }),
      labelFs: 11 / Math.max(scale, 1),
      markR: Math.min(0.11, Math.max(0.055, 2.8 / Math.max(scale, 1))),
    };
  }, [layout, bounds, entryPoint, route, highlightShelfId, scale, hostWidth]);

  // Keep the shelf visible — kiosk uses a thin SVG outline instead of editor selection chrome.
  const selection = null;

  if (!layout) {
    return <div className={`shopper-floor-map-host shopper-floor-map--empty ${className}`.trim()} />;
  }

  const boardW = bounds && scale ? bounds.width * scale : 0;
  const boardH = bounds && scale ? bounds.height * scale : 0;
  const hasRoute = overlay?.path?.length >= 2;
  const viewBox = bounds ? `0 0 ${bounds.width} ${bounds.height}` : "0 0 1 1";

  return (
    <div
      ref={hostRef}
      className={`shopper-floor-map-host shopper-floor-map-host--layout ${className}`.trim()}
      data-aisle={highlightAisleId || undefined}
    >
      {scale > 0 && bounds ? (
        <div className="shopper-layout-map-board" style={{ width: boardW, height: boardH }}>
          <Canvas2D
            layout={layout}
            scale={scale}
            canvasBounds={bounds}
            selection={selection}
            setSelection={noop}
            onSelectShelf={noop}
            paletteTool="select"
            editDisabled
            dragPos={null}
            setDragging={noop}
            onDropTool={noop}
            onPlaceClick={noop}
            onPlaceZoneRect={noop}
            onResize={noop}
            onRotateShelf={noop}
            categories={categories}
            products={products}
            draftPolygon={null}
          />
          <svg
            className={`shopper-layout-map-route${hasRoute ? " shopper-floor-map--routed" : ""}${
              highlightShelfId ? " shopper-floor-map--guided" : ""
            }`}
            viewBox={viewBox}
            preserveAspectRatio="none"
            style={overlay ? { "--way-dash-period": `${overlay.wayDash.period}` } : undefined}
            aria-hidden
          >
            {hasRoute ? (
              <RouteLayer
                route={overlay.path}
                routeD={pathFromPoints(overlay.path)}
                wayW={overlay.wayW}
                wayDash={overlay.wayDash}
              />
            ) : null}
            <EntryMarker entryPoint={overlay.entry} fontSize={overlay.labelFs} />
            {overlay.badgeAt && overlay.shelfOutline?.length >= 3 ? (
              <ShelfTargetMarker
                outline={overlay.shelfOutline}
                badge={overlay.badgeAt}
                markR={overlay.markR}
              />
            ) : null}
          </svg>
        </div>
      ) : null}
    </div>
  );
}
