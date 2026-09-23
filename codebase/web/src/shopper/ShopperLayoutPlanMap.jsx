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
  routes = null,
  highlightShelfId = null,
  highlightMapUnitId = null,
  highlightAisleId = null,
  highlightShelfIds = null,
  shelfMarkers = null,
  focusedPlacementId = null,
  focusedRoutePlacementId = null,
  mapEntryPoint = null,
  onSpotSelect = null,
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

  const highlightIdSet = useMemo(() => {
    const ids = highlightShelfIds?.length ? highlightShelfIds : highlightShelfId ? [highlightShelfId] : [];
    return new Set(ids.filter(Boolean));
  }, [highlightShelfIds, highlightShelfId]);

  const markerList = useMemo(() => {
    if (shelfMarkers?.length) return shelfMarkers;
    if (highlightShelfId) {
      return [{ shelfId: highlightShelfId, isPrimary: true, spotIndex: null, footprint: null }];
    }
    return [];
  }, [shelfMarkers, highlightShelfId]);

  const target = useMemo(() => {
    if (!scene || !highlightShelfId) return null;
    return findPlanFixture(scene.fixtures, highlightShelfId, highlightMapUnitId);
  }, [scene, highlightShelfId, highlightMapUnitId]);

  const overlay = useMemo(() => {
    if (!scene) return null;

    const routeSpecs =
      routes?.length > 0
        ? routes
        : route?.length >= 2
          ? [{ route, shelfId: highlightShelfId, placementId: highlightShelfId || "route-0" }]
          : [];

    const routeFocusId =
      focusedRoutePlacementId ?? focusedPlacementId ?? routeSpecs[0]?.placementId ?? null;

    const routeLayers = routeSpecs
      .map((spec, idx) => {
        const walked = routePolylineForMap(
          layout,
          spec.route || [],
          spec.shelfId,
          mapEntryPoint ?? entryPoint
        );
        const placementId = spec.placementId || spec.shelfId || `route-${idx}`;
        const isPrimaryRoute = idx === 0;
        const isFocusedRoute = routeFocusId ? placementId === routeFocusId : isPrimaryRoute;
        return {
          key: placementId,
          placementId,
          walked,
          shelfId: spec.shelfId,
          isPrimaryRoute,
          isFocusedRoute,
        };
      })
      .filter((layer) => layer.walked.length >= 2);

    const primaryLayer = routeLayers[0];
    const walked = primaryLayer?.walked || [];
    const aisleNear = walked.length >= 2 ? walked[walked.length - 2] : walked[walked.length - 1];

    const resolvedMarkers = markerList
      .map((m) => {
        if (m.footprint) return m;
        const footprint = shelfMarkerFootprint(
          layout,
          m.shelfId,
          m.isPrimary ? aisleNear : null
        );
        return footprint ? { ...m, footprint } : null;
      })
      .filter(Boolean);
    const primaryMarker = resolvedMarkers.find((m) => m.isPrimary) || resolvedMarkers[0];
    const footprint = primaryMarker?.footprint || null;
    const pinWorld = footprint?.badge || null;
    const multiSpot = resolvedMarkers.length > 1 || routeLayers.length > 1;

    const hasRoute = routeLayers.length > 0;
    const hostAspect = hostBox?.width && hostBox?.height ? hostBox.width / hostBox.height : 16 / 9;
    let vb = scene.vb;
    const framePoints = [];
    for (const layer of routeLayers) framePoints.push(...layer.walked);
    if (entryPoint) framePoints.push({ x: entryPoint.x, y: entryPoint.y });
    for (const m of resolvedMarkers) {
      if (m.footprint?.badge) framePoints.push(m.footprint.badge);
      if (m.footprint?.corners) framePoints.push(...m.footprint.corners);
    }

    if (multiSpot) {
      const full = expandViewBoxForPoints(scene.vb, framePoints, 1.05);
      vb = fitViewBoxToAspect(full, hostAspect);
      vb = clampViewBoxToBounds(vb, {
        minX: scene.vb.minX,
        minY: scene.vb.minY,
        maxX: scene.vb.minX + scene.vb.width,
        maxY: scene.vb.minY + scene.vb.height,
      });
    } else if (hasRoute && walked.length >= 2) {
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
    const strokeOpts = { minPx: hasRoute ? 9 : 4, renderWidthPx };
    const wayW = routeStrokeUserUnits(vb.width, strokeOpts);
    const wayDash = routeDashPatternUserUnits(vb.width, {
      dashPx: 10,
      gapPx: 7,
      renderWidthPx,
    });
    const labelFs = Math.max(0.22, scene.span * 0.028);
    const markR = Math.max(0.06, scene.span * 0.008);

    const mapTargets = resolvedMarkers
      .map((m) => {
        const isFocusedSpot = routeFocusId && m.placementId === routeFocusId;
        const variant =
          multiSpot && routeFocusId
            ? isFocusedSpot
              ? "primary"
              : "secondary"
            : m.isPrimary
              ? "primary"
              : "secondary";
        return {
          key: m.placementId || m.shelfId,
          placementId: m.placementId || null,
          outline: m.footprint?.corners || [],
          badge: m.footprint?.badge || null,
          spotIndex: multiSpot ? m.spotIndex : null,
          variant,
          isFocusedSpot,
          label: m.label || null,
        };
      })
      .filter((t) => t.badge && (t.spotIndex != null || t.outline.length >= 3));

    return {
      walked,
      routeLayers,
      shelfOutline: footprint?.corners || target?.fixture?.corners || [],
      badgeAt: pinWorld,
      mapTargets,
      vb,
      wayW,
      wayDash,
      labelFs,
      markR,
    };
  }, [
    scene,
    layout,
    route,
    routes,
    entryPoint,
    highlightShelfId,
    target,
    hostBox,
    markerList,
    focusedPlacementId,
    focusedRoutePlacementId,
    mapEntryPoint,
  ]);

  if (!layout || !scene || !overlay) {
    return <div className={`shopper-floor-map-host shopper-floor-map--empty ${className}`.trim()} />;
  }

  const viewBox = `${overlay.vb.minX} ${overlay.vb.minY} ${overlay.vb.width} ${overlay.vb.height}`;
  const hasRoute = overlay.routeLayers?.length > 0;

  return (
    <div
      ref={hostRef}
      className={`shopper-floor-map-host shopper-floor-map--plan ${className}`.trim()}
      data-aisle={highlightAisleId || undefined}
      data-testid="shopper-plan-map"
    >
      <svg
        className={`shopper-layout-map-board shopper-plan-board shopper-floor-map${
          hasRoute ? " shopper-floor-map--routed" : ""
        }${highlightShelfId ? " shopper-floor-map--guided" : ""}`}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        style={{ "--way-dash-period": `${overlay.wayDash.period}` }}
        aria-label="Store plan map"
      >
        <defs>
          {scene.floor ? (
            <clipPath id={`shopper-plan-clip-${layout.id}`}>
              <rect
                x={scene.floor.x}
                y={scene.floor.y}
                width={scene.floor.widthMeters}
                height={scene.floor.depthMeters}
              />
            </clipPath>
          ) : null}
        </defs>
        <rect
          x={overlay.vb.minX}
          y={overlay.vb.minY}
          width={overlay.vb.width}
          height={overlay.vb.height}
          className="shopper-floor-map-bg"
        />

        <g clipPath={scene.floor ? `url(#shopper-plan-clip-${layout.id})` : undefined}>
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
          const multiSpot = highlightIdSet.size > 1;
          const isTarget = highlightAisleId && band.aisleId === highlightAisleId;
          const dim = !multiSpot && highlightAisleId && !isTarget;
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
          const matchesHighlight =
            highlightIdSet.size > 0 &&
            [...highlightIdSet].some(
              (id) => fixture.id === id || fixture.highlightIds?.has?.(id)
            );
          const isTarget =
            target?.fixture?.id === fixture.id ||
            matchesHighlight ||
            (highlightShelfId && fixture.highlightIds?.has?.(highlightShelfId));
          const dimAllOthers = highlightIdSet.size > 0 && highlightIdSet.size === 1;
          const dim = dimAllOthers && !isTarget;
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
        </g>

        <g
          className="shopper-plan-map-overlays"
          clipPath={scene.floor ? `url(#shopper-plan-clip-${layout.id})` : undefined}
        >
          {hasRoute
            ? overlay.routeLayers.map((layer) => (
                <RouteLayer
                  key={layer.key}
                  route={layer.walked}
                  wayW={overlay.wayW * (layer.isFocusedRoute ? 1 : 0.88)}
                  wayDash={overlay.wayDash}
                  variant={layer.isFocusedRoute ? "primary" : "secondary"}
                  showTurnNodes={false}
                  showArrow={layer.isFocusedRoute}
                  animate
                />
              ))
            : null}

          <EntryMarker entryPoint={entryPoint} fontSize={overlay.labelFs} />

          {overlay.mapTargets?.length
            ? overlay.mapTargets.map((targetRow) => (
                <ShelfTargetMarker
                  key={targetRow.key}
                  outline={targetRow.outline}
                  badge={targetRow.badge}
                  markR={overlay.markR}
                  spotIndex={targetRow.spotIndex}
                  variant={targetRow.variant}
                  onActivate={
                    onSpotSelect && targetRow.placementId
                      ? () => onSpotSelect(targetRow.placementId)
                      : null
                  }
                  ariaLabel={targetRow.label || undefined}
                />
              ))
            : overlay.badgeAt && overlay.shelfOutline?.length >= 3 ? (
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
        </g>
      </svg>
    </div>
  );
}
