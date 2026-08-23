import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildStorePlanScene,
  badgeClearOfEntrance,
  findPlanFixture,
} from "./shopperStorePlan.js";
import {
  EntryMarker,
  RouteLayer,
  ShelfTargetMarker,
  pathFromPoints,
  shelfOutlinePath,
} from "./mapLayers.jsx";
import {
  clampViewBoxToBounds,
  expandViewBoxForPoints,
  fitViewBoxToAspect,
  focusViewBoxForGuidedRoute,
  guidedStoreShare,
} from "./shopperMapFraming.js";
import { routeDashPatternUserUnits, routeStrokeUserUnits } from "./shopperSchematicMap.js";
import { routePolylineForMap, shelfMarkerFootprint } from "./shopperWayfinding.js";

function polygonPoints(corners) {
  return (corners || []).map((c) => `${c.x},${c.y}`).join(" ");
}

/**
 * Read-only store plan — fixture footprints, aisle corridors, route overlay (FR-KIOSK-04).
 */
export default function ShopperLayoutPlanMap({
  layout,
  entryPoint,
  route = [],
  highlightShelfId = null,
  highlightMapUnitId = null,
  highlightAisleId = null,
  categories = [],
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

  const scene = useMemo(
    () => (layout ? buildStorePlanScene(layout, entryPoint, categories) : null),
    [layout, entryPoint, categories]
  );

  const target = useMemo(() => {
    if (!scene || !highlightShelfId) return null;
    return findPlanFixture(scene.fixtures, highlightShelfId, highlightMapUnitId);
  }, [scene, highlightShelfId, highlightMapUnitId]);

  const overlay = useMemo(() => {
    if (!scene) return null;
    const walked = routePolylineForMap(layout, route, highlightShelfId);
    const aisleNear = walked.length >= 2 ? walked[walked.length - 2] : walked[walked.length - 1];
    const footprint = highlightShelfId ? shelfMarkerFootprint(layout, highlightShelfId, aisleNear) : null;
    const pinWorld = footprint?.badge || null;

    const hasRoute = walked.length >= 2;
    const hostAspect = hostBox?.width && hostBox?.height ? hostBox.width / hostBox.height : 16 / 9;
    let vb = scene.vb;
    if (hasRoute) {
      const full = expandViewBoxForPoints(scene.vb, walked, 0.9);
      vb = focusViewBoxForGuidedRoute(full, walked, entryPoint, pinWorld, target?.fixture?.aabb || null, {
        storeShare: guidedStoreShare(scene.span),
      });
      vb = fitViewBoxToAspect(vb, hostAspect);
      vb = clampViewBoxToBounds(vb, {
        minX: full.minX,
        minY: full.minY,
        maxX: full.minX + full.width,
        maxY: full.minY + full.height,
      });
    } else {
      vb = fitViewBoxToAspect(scene.vb, hostAspect);
    }

    const renderWidthPx = Math.max(hostBox?.width || 560, 560);
    const strokeOpts = { minPx: hasRoute ? 5 : 4, renderWidthPx };
    const wayW = routeStrokeUserUnits(vb.width, strokeOpts);
    const wayDash = routeDashPatternUserUnits(vb.width, {
      dashPx: 11,
      gapPx: 8,
      renderWidthPx,
    });
    const labelFs = Math.max(0.22, scene.span * 0.028);
    const markR = Math.max(0.06, scene.span * 0.008);

    return {
      walked,
      shelfOutline: footprint?.corners || target?.fixture?.corners || [],
      badgeAt: pinWorld,
      vb,
      wayW,
      wayDash,
      labelFs,
      markR,
    };
  }, [scene, layout, route, entryPoint, highlightShelfId, target, hostBox]);

  if (!layout || !scene || !overlay) {
    return <div className={`shopper-floor-map-host shopper-floor-map--empty ${className}`.trim()} />;
  }

  const viewBox = `${overlay.vb.minX} ${overlay.vb.minY} ${overlay.vb.width} ${overlay.vb.height}`;
  const routeD = pathFromPoints(overlay.walked);
  const hasRoute = overlay.walked.length >= 2;

  return (
    <div
      ref={hostRef}
      className={`shopper-floor-map-host shopper-floor-map--plan ${className}`.trim()}
      data-aisle={highlightAisleId || undefined}
      data-testid="shopper-plan-map"
    >
      <svg
        className={`shopper-layout-map-board shopper-plan-board${
          hasRoute ? " shopper-floor-map--routed" : ""
        }${highlightShelfId ? " shopper-floor-map--guided" : ""}`}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ "--way-dash-period": `${overlay.wayDash.period}` }}
        aria-label="Store plan map"
      >
        <rect
          x={overlay.vb.minX}
          y={overlay.vb.minY}
          width={overlay.vb.width}
          height={overlay.vb.height}
          className="shopper-floor-map-bg"
        />

        {scene.envelope ? (
          <rect
            x={scene.envelope.x}
            y={scene.envelope.y}
            width={scene.envelope.widthMeters}
            height={scene.envelope.depthMeters}
            className="shopper-plan-envelope"
          />
        ) : null}

        {scene.floor ? (
          <rect
            x={scene.floor.x}
            y={scene.floor.y}
            width={scene.floor.widthMeters}
            height={scene.floor.depthMeters}
            className="shopper-plan-floor"
          />
        ) : null}

        {scene.floorPlan ? (
          <image
            href={scene.floorPlan.url}
            x={scene.floorPlan.x}
            y={scene.floorPlan.y}
            width={scene.floorPlan.widthMeters}
            height={scene.floorPlan.depthMeters}
            opacity={scene.floorPlan.opacity}
            transform={`rotate(${scene.floorPlan.rotationDeg || 0} ${scene.floorPlan.x} ${scene.floorPlan.y})`}
            className="shopper-plan-underlay"
            preserveAspectRatio="none"
          />
        ) : null}

        {scene.corridors.map((band) => {
          const badge = badgeClearOfEntrance(band, entryPoint);
          const isTarget = highlightAisleId && band.aisleId === highlightAisleId;
          const dim = highlightAisleId && !isTarget;
          return (
            <g
              key={band.id || `${band.x}-${band.y}`}
              className={`shopper-plan-corridor${isTarget ? " is-target-aisle" : ""}${dim ? " is-dimmed" : ""}`}
            >
              <rect x={band.x} y={band.y} width={band.w} height={band.h} rx={0.08} />
              {badge ? (
                <text
                  x={badge.x}
                  y={badge.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={band.badgeFontSize || overlay.labelFs * 0.85}
                  transform={badge.rotate ? `rotate(${badge.rotate} ${badge.x} ${badge.y})` : undefined}
                  className="shopper-plan-aisle-badge"
                >
                  {band.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {scene.fixtures.map((fixture) => {
          const isTarget =
            target?.fixture?.id === fixture.id ||
            (highlightShelfId && fixture.highlightIds?.has?.(highlightShelfId));
          const dim = highlightShelfId && !isTarget;
          return (
            <g
              key={fixture.id}
              className={`shopper-plan-fixture${isTarget ? " is-target" : ""}${dim ? " is-dimmed" : ""}`}
            >
              {fixture.spine ? (
                <line
                  x1={fixture.spine.x1}
                  y1={fixture.spine.y1}
                  x2={fixture.spine.x2}
                  y2={fixture.spine.y2}
                  className="shopper-plan-spine"
                />
              ) : null}
              {fixture.faces.map((face) => {
                const faceTarget = isTarget && target?.face?.id === face.id;
                return (
                  <g key={face.id}>
                    <polygon
                      points={polygonPoints(face.corners)}
                      fill={face.fill}
                      stroke={face.color}
                      className={`shopper-plan-face${faceTarget ? " is-target-face" : ""}`}
                    />
                    {face.labelVisible !== false && face.label ? (
                      <text
                        x={face.at.x}
                        y={face.at.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={face.labelFontSize || overlay.labelFs * 0.72}
                        transform={face.rotate ? `rotate(${face.rotate} ${face.at.x} ${face.at.y})` : undefined}
                        className={`shopper-plan-face-label${faceTarget ? " is-target-face" : ""}`}
                      >
                        {face.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              {fixture.labelVisible && fixture.displayLabel ? (
                <text
                  x={fixture.labelAt?.x ?? fixture.centroid?.x}
                  y={fixture.labelAt?.y ?? fixture.centroid?.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={fixture.labelFontSize || overlay.labelFs}
                  transform={
                    fixture.labelRotate
                      ? `rotate(${fixture.labelRotate} ${fixture.labelAt?.x ?? fixture.centroid?.x} ${
                          fixture.labelAt?.y ?? fixture.centroid?.y
                        })`
                      : undefined
                  }
                  className="shopper-plan-fixture-label"
                >
                  {fixture.displayLabel}
                </text>
              ) : null}
            </g>
          );
        })}

        {hasRoute ? (
          <RouteLayer
            route={overlay.walked}
            routeD={routeD}
            wayW={overlay.wayW}
            wayDash={overlay.wayDash}
          />
        ) : null}
        <EntryMarker entryPoint={entryPoint} fontSize={overlay.labelFs} />
        {overlay.badgeAt && overlay.shelfOutline?.length >= 3 ? (
          <ShelfTargetMarker
            outline={overlay.shelfOutline}
            badge={overlay.badgeAt}
            markR={overlay.markR}
          />
        ) : target?.fixture?.corners?.length >= 3 ? (
          <path
            d={shelfOutlinePath(target.fixture.corners)}
            className="shopper-floor-map-shelf-outline"
          />
        ) : null}
      </svg>
    </div>
  );
}
