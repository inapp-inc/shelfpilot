import { useEffect, useMemo, useRef } from "react";
import Canvas2D from "./Canvas2D.jsx";
import { layoutCanvasBounds } from "./polygonCanvas.js";
import { createFloorPlanRenderer } from "./floorPlanWebGL.js";

/**
 * WebGL background (grid, envelope, fixture fill) + Canvas2D entities, labels, interaction.
 */
export default function FloorPlan2D(props) {
  const { layout, scale, onWheelZoom, previewFixturePolygon, ...canvasProps } = props;
  const bounds = useMemo(
    () => layoutCanvasBounds(layout, { previewPoly: previewFixturePolygon }),
    [layout, previewFixturePolygon]
  );
  const bgRef = useRef(null);
  const compositeRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!bgRef.current) return undefined;
    rendererRef.current?.dispose();
    const api = createFloorPlanRenderer(bgRef.current, bounds, scale);
    rendererRef.current = api;
    if (layout) api.render(layout, previewFixturePolygon);
    return () => {
      api.dispose();
      rendererRef.current = null;
    };
  }, [bounds.width, bounds.height, bounds.minX, bounds.minY, scale, layout, previewFixturePolygon]);

  useEffect(() => {
    const el = compositeRef.current;
    if (!el || !onWheelZoom) return undefined;
    const onWheel = (e) => onWheelZoom(e);
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, [onWheelZoom]);

  const w = bounds.width * scale;
  const h = bounds.height * scale;

  return (
    <div
      ref={compositeRef}
      className="floor-plan-composite floor-plan-composite--webgl"
      style={{ position: "relative", width: w, height: h, flexShrink: 0 }}
      aria-label="WebGL 2D floor plan"
    >
      <div
        ref={bgRef}
        className="floor-plan-webgl-bg"
        style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
      />
      <Canvas2D
        {...canvasProps}
        layout={layout}
        scale={scale}
        canvasBounds={bounds}
        webglBackground
        previewFixturePolygon={previewFixturePolygon}
        onWheelZoom={onWheelZoom}
      />
    </div>
  );
}
