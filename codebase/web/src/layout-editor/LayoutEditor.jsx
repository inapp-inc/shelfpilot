import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import AlertBanner from "../components/AlertBanner.jsx";
import FieldError from "../components/FieldError.jsx";
import { friendlyError } from "../validationMessages.js";
import { shelfUnitLabel, countGondolaUnits, resolveShelfByLabel, listShelfLabels, shelfFaceDisplayLabel, shelfCanvasFaceLabel, resolveGondolaForEditor } from "./shelfFaces.js";
import { FIXTURE_TYPES, VERTICALS, ZONE_TYPES } from "../referenceCatalog.js";
import { fixtureForType, fixturePaletteEntries } from "../fixtureCatalog.js";
import Scene3D from "../Scene3D.jsx";
import { formatMeters, layoutBounds, shelf3dLocalBox } from "../scene3dDimensions.js";
import Palette from "./Palette.jsx";
import Canvas2D from "./Canvas2D.jsx";
import FloorPlan2D from "./FloorPlan2D.jsx";
import SmartGeneratePanel from "./SmartGeneratePanel.jsx";
import EditorPanelShell from "./EditorPanelShell.jsx";
import PlanogramEditorModal from "./PlanogramEditorModal.jsx";
import MissingProductsDialog from "./MissingProductsDialog.jsx";
import EditorCanvasBar from "./EditorCanvasBar.jsx";
import {
  shelfLabelFitsGondolaFace,
  shelfLabelFitsShelfBadge,
} from "./canvasLabelZoom.js";
import { mixForVertical, buildCategoryMix, storeTypeForVertical } from "../storeTypes.js";
import { layoutCanvasBounds, layoutContentBounds, pointInPolygon, entityFitsPolygon, entityPlacementValid, layoutStoreEnvelope, layoutFixturePolygon, fixtureZoneDistinctFromEnvelope, polygonDimensions, normalizeFixtureRectangle, shelfLocalMeters, shelfCanvasAabb, gondolaCanvasAabb, aisleFootprintMeters, defaultAisleRun, fitRectanglePolygonInEnvelope, polygonInsideEnvelope, centeredStoreEnvelope, layoutFixtureZoneRect } from "./polygonCanvas.js";

const snap = (v) => Math.max(0, Math.round(v * 2) / 2);

/** Hybrid WebGL 2D disabled — CSS floor grid is reliable for demo. Set VITE_USE_WEBGL_2D=true to re-enable. */
const USE_WEBGL_2D = import.meta.env.VITE_USE_WEBGL_2D === "true";

const DEFAULT_CANVAS_BOUNDS = { minX: 0, minY: 0, maxX: 10, maxY: 8, width: 10, height: 8 };

/** Minimum canvas px/m so shelf numbers are readable after fit (see canvasLabelZoom). */
const MIN_READABLE_PX_PER_M = 24;

/** Default zoom when opening or after generate — ~250% for readable shelf numbers. */
const INITIAL_LANDING_ZOOM = 2.5;

function clampZoom(value) {
  return Math.min(5, Math.max(0.5, Number(Number(value).toFixed(2))));
}

function resolveFrameZoom(fitZoom, baseScale, { landing = true } = {}) {
  let next = Math.max(0.5, fitZoom, MIN_READABLE_PX_PER_M / baseScale);
  if (landing) next = Math.max(next, INITIAL_LANDING_ZOOM);
  return clampZoom(next);
}

const EDITOR_PANELS_STORAGE_KEY = "shelfpilot.editorPanels";

function readEditorPanelPrefs() {
  try {
    const raw = localStorage.getItem(EDITOR_PANELS_STORAGE_KEY);
    if (!raw) return { palette: true };
    const parsed = JSON.parse(raw);
    return {
      palette: Boolean(parsed.palette),
    };
  } catch {
    return { palette: true };
  }
}

function layoutBoundsKey(layout) {
  if (!layout) return "";
  const env = layout.storeEnvelope || {};
  const poly =
    layout.polygon?.length >= 3
      ? layout.polygon.map((p) => `${Number(p.x).toFixed(3)},${Number(p.y).toFixed(3)}`).join(";")
      : "";
  return [
    layout.shape,
    layout.widthMeters,
    layout.depthMeters,
    env.x,
    env.y,
    env.widthMeters,
    env.depthMeters,
    poly,
  ].join("|");
}

function baseCanvasScale(bounds) {
  return Math.min(48, 640 / Math.max(bounds.width, bounds.height, 1));
}

export default function LayoutEditor({
  layout,
  setLayout,
  token,
  role,
  vertical,
  config,
  categories,
  products,
  toast,
  onBack,
  onRefreshLayouts,
  onDeleteLayout,
  statusMeta,
  onQuickAddProduct,
  onRefreshCatalog,
}) {
  const [view3d, setView3d] = useState(false);
  const [walkMode, setWalkMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [paletteTool, setPaletteTool] = useState("select");
  const [selection, setSelection] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragPos, setDragPos] = useState(null);
  const [draftPolygon, setDraftPolygon] = useState([]);
  const [genOpen, setGenOpen] = useState(false);
  const [genOrientation, setGenOrientation] = useState("mixed");
  const [genMinAisle, setGenMinAisle] = useState("");
  const [categoryMix, setCategoryMix] = useState(() => mixForVertical(vertical));
  const [genFillPlanogram, setGenFillPlanogram] = useState(true);
  const [lastGenStats, setLastGenStats] = useState(null);
  const [storeW, setStoreW] = useState("");
  const [storeD, setStoreD] = useState("");
  const [fixtureW, setFixtureW] = useState("");
  const [fixtureD, setFixtureD] = useState("");
  const envelopePatchRef = useRef(null);
  const fixturePatchRef = useRef(null);
  const pendingFrameRef = useRef(null);
  const prevPaletteToolRef = useRef(paletteTool);
  const [focus3dRequest, setFocus3dRequest] = useState(0);
  const [planogramCoverage, setPlanogramCoverage] = useState(null);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState(() => new Set());
  const [planogramEditor, setPlanogramEditor] = useState(null);
  const [planogram3dReturn, setPlanogram3dReturn] = useState(null);
  const [missingProductsOpen, setMissingProductsOpen] = useState(false);
  const stageRef = useRef(null);
  const editorRootRef = useRef(null);
  const zoomRef = useRef(zoom);
  const lastAutoFitLayoutId = useRef(null);
  const pendingViewPreserveRef = useRef(null);
  const pendingZoomScrollRef = useRef(null);
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [paletteCollapsed, setPaletteCollapsed] = useState(() => readEditorPanelPrefs().palette);
  zoomRef.current = zoom;

  const editDisabled = !["Designer", "Admin"].includes(role);
  const layoutHasShelves = Boolean((layout?.shelves || layout?.fixtures || []).length);
  const missingProductCount = planogramCoverage?.missingCount ?? 0;
  const layoutVertical = layout?.vertical || vertical;
  const vMeta = VERTICALS[layoutVertical] || VERTICALS.retail;
  const activeStoreType = storeTypeForVertical(layoutVertical);
  const minAisle = config?.minAisleWidthMeters ?? vMeta.minAisle;
  const fixtureTypes = useMemo(
    () => fixturePaletteEntries(config, layoutVertical),
    [config, layoutVertical]
  );
  const fixtureTypeKeys = useMemo(() => new Set(fixtureTypes.map((t) => t.type)), [fixtureTypes]);

  const catSig = useMemo(() => (categories || []).map((c) => c.id).join("|"), [categories]);
  const fixtureSig = useMemo(
    () => fixtureTypes.map((t) => `${t.type}:${t.defaultWidthMeters}:${t.defaultDepthMeters}:${t.defaultLevels}`).join("|"),
    [fixtureTypes]
  );

  const violationSig = useMemo(
    () =>
      JSON.stringify({
        aisle: layout?.validation?.aisleViolations || [],
        containment: (layout?.validation?.containmentViolations || []).length,
      }),
    [layout?.validation]
  );

  useEffect(() => {
    setDismissedAlerts(new Set());
  }, [violationSig]);

  useEffect(() => {
    if (view3d) onRefreshCatalog?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view3d, layout?.id]);

  const dismissAlert = useCallback((key) => {
    setDismissedAlerts((prev) => new Set([...prev, key]));
  }, []);

  const notifyError = useCallback(
    (err, fallback) => toast(friendlyError(err, fallback), { type: "error" }),
    [toast]
  );

  const notifySuccess = useCallback((text) => toast(text, { type: "success" }), [toast]);

  useEffect(() => {
    setCategoryMix(buildCategoryMix(categories, vertical, fixtureTypes));
    setGenMinAisle(String(config?.minAisleWidthMeters ?? vMeta.minAisle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertical, catSig, fixtureSig, config?.minAisleWidthMeters, vMeta.minAisle]);

  const refreshPlanogramCoverage = useCallback(async () => {
    if (!layout?.id || !token) return;
    try {
      setCoverageLoading(true);
      const data = await api(`/layouts/${layout.id}/planogram/coverage`, { token });
      setPlanogramCoverage(data);
    } catch {
      /* coverage optional until layout has shelves */
    } finally {
      setCoverageLoading(false);
    }
  }, [layout?.id, token]);

  useEffect(() => {
    refreshPlanogramCoverage();
  }, [layout?.id, layout?.contentRevision, refreshPlanogramCoverage]);

  const envelope = useMemo(
    () => (layout ? layoutStoreEnvelope(layout) : null),
    [layout]
  );

  const fixtureZoneSize = useMemo(() => {
    if (layout?.polygon?.length >= 3) return polygonDimensions(layout.polygon);
    if (envelope) {
      const w = Number(layout?.widthMeters) || envelope.widthMeters;
      const d = Number(layout?.depthMeters) || envelope.depthMeters;
      return { w, d };
    }
    return null;
  }, [layout?.polygon, layout?.widthMeters, layout?.depthMeters, envelope]);

  useEffect(() => {
    if (!envelope) return;
    setStoreW(String(envelope.widthMeters ?? ""));
    setStoreD(String(envelope.depthMeters ?? ""));
  }, [envelope?.widthMeters, envelope?.depthMeters, layout?.id]);

  useEffect(() => {
    if (fixtureZoneSize) {
      setFixtureW(String(Number(fixtureZoneSize.w.toFixed(1))));
      setFixtureD(String(Number(fixtureZoneSize.d.toFixed(1))));
    } else if (envelope) {
      setFixtureW(String(envelope.widthMeters ?? ""));
      setFixtureD(String(envelope.depthMeters ?? ""));
    }
  }, [fixtureZoneSize?.w, fixtureZoneSize?.d, envelope?.widthMeters, envelope?.depthMeters, layout?.id, layout?.polygon]);

  const previewFixturePolygon = useMemo(() => {
    if (layoutFixturePolygon(layout)) return null;
    if (!envelope) return null;
    const w = Number(fixtureW);
    const d = Number(fixtureD);
    if (!Number.isFinite(w) || !Number.isFinite(d) || w <= 0 || d <= 0) return null;
    const poly = fitRectanglePolygonInEnvelope(envelope, w, d, layout?.polygon);
    if (!poly || !fixtureZoneDistinctFromEnvelope(poly, envelope)) return null;
    return poly;
  }, [layout, envelope, fixtureW, fixtureD]);

  const useWebGlFloor =
    USE_WEBGL_2D && paletteTool !== "draw" && paletteTool !== "edit-area";

  function scheduleEnvelopePatch(widthMeters, depthMeters) {
    if (envelopePatchRef.current) clearTimeout(envelopePatchRef.current);
    envelopePatchRef.current = setTimeout(async () => {
      const w = Number(widthMeters);
      const d = Number(depthMeters);
      if (!Number.isFinite(w) || !Number.isFinite(d) || w < 1 || d < 1) return;
      const oldEnv = layoutStoreEnvelope(layout);
      const env = centeredStoreEnvelope(oldEnv, w, d);
      const body = {
        widthMeters: w,
        depthMeters: d,
        storeEnvelope: env,
      };
      const fw = Number(fixtureW);
      const fd = Number(fixtureD);
      if (Number.isFinite(fw) && Number.isFinite(fd) && fw > 0 && fd > 0) {
        const clampedW = Math.min(fw, w);
        const clampedD = Math.min(fd, d);
        if (clampedW !== fw || clampedD !== fd) {
          setFixtureW(String(clampedW));
          setFixtureD(String(clampedD));
        }
        const poly = fitRectanglePolygonInEnvelope(env, clampedW, clampedD, layout.polygon);
        if (poly) {
          body.shape = "polygon";
          body.polygon = poly;
        }
      }
      try {
        await patchLayout(body);
      } catch (e) {
        toast(e.message);
      }
    }, 400);
  }

  function scheduleFixtureZonePatch(widthMeters, depthMeters) {
    if (fixturePatchRef.current) clearTimeout(fixturePatchRef.current);
    fixturePatchRef.current = setTimeout(async () => {
      const env = envelope || layoutStoreEnvelope(layout);
      const w = Number(widthMeters);
      const d = Number(depthMeters);
      if (!Number.isFinite(w) || !Number.isFinite(d) || w < 0.5 || d < 0.5) return;
      if (w > env.widthMeters || d > env.depthMeters) {
        toast(`Fixture zone must fit inside store (${env.widthMeters}×${env.depthMeters} m)`);
        return;
      }
      const poly = fitRectanglePolygonInEnvelope(env, w, d, layout.polygon);
      if (!poly || !polygonInsideEnvelope(poly, env)) {
        toast("Fixture zone must stay inside the store envelope");
        return;
      }
      try {
        await patchLayout({ shape: "polygon", polygon: poly, storeEnvelope: env });
        setDraftPolygon([]);
        toast("Fixture zone updated");
      } catch (e) {
        toast(e.message === "invalid_polygon" ? "Invalid fixture zone shape." : e.message);
      }
    }, 400);
  }

  function growStoreEnvelope() {
    pendingViewPreserveRef.current = { ...canvasBounds };
    const oldEnv = layoutStoreEnvelope(layout);
    const nextEnv = centeredStoreEnvelope(oldEnv, oldEnv.widthMeters + 2, oldEnv.depthMeters + 2);
    const body = {
      widthMeters: nextEnv.widthMeters,
      depthMeters: nextEnv.depthMeters,
      storeEnvelope: nextEnv,
    };
    const fw = Number(fixtureW);
    const fd = Number(fixtureD);
    if (Number.isFinite(fw) && Number.isFinite(fd) && fw > 0 && fd > 0) {
      const poly = fitRectanglePolygonInEnvelope(
        nextEnv,
        Math.min(fw, nextEnv.widthMeters),
        Math.min(fd, nextEnv.depthMeters),
        layout.polygon
      );
      if (poly) {
        body.shape = "polygon";
        body.polygon = poly;
      }
    }
    patchLayout(body).then(() => {
      toast("Store envelope expanded (+1 m each side)");
    });
  }

  const dirtySinceSubmit =
    (Number(layout?.contentRevision) || 0) > (Number(layout?.submittedRevision) ?? -1);
  const canSubmitReview =
    !editDisabled &&
    (role === "Designer" || role === "Admin") &&
    (layout?.status === "draft" ||
      layout?.status === "rejected" ||
      dirtySinceSubmit);
  const canApproveReject =
    (role === "Approver" || role === "Admin") && layout?.status === "in_review";

  const zoomCategories = useMemo(
    () => (categories || []).filter((c) => !c.parentId),
    [categories]
  );

  const boundsKey = useMemo(() => layoutBoundsKey(layout), [layout]);

  const canvasBounds = useMemo(() => {
    if (!layout) return DEFAULT_CANVAS_BOUNDS;
    return layoutCanvasBounds(layout, { previewPoly: previewFixturePolygon });
  }, [boundsKey, previewFixturePolygon]);

  const fitToView = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !layout) return;

    const hasFixtures =
      (layout.shelves?.length || layout.fixtures?.length || layout.aisles?.length) > 0;
    const content = layoutContentBounds(layout, previewFixturePolygon);

    if (hasFixtures && content) {
      frameRect(content.minX, content.minY, content.maxX, content.maxY, 0.8);
      return;
    }

    if (layout.shape === "polygon" && (layout.polygon?.length ?? 0) >= 3) {
      const fz = layoutFixtureZoneRect(layout, previewFixturePolygon);
      frameRect(fz.x, fz.y, fz.x + fz.widthMeters, fz.y + fz.depthMeters, 0.6);
      return;
    }

    const pad = 40;
    const availW = Math.max(120, stage.clientWidth - pad * 2);
    const availH = Math.max(120, stage.clientHeight - pad * 2);
    const baseScale = baseCanvasScale(canvasBounds);
    const fitScale = Math.min(availW / canvasBounds.width, availH / canvasBounds.height);
    let nextZoom = resolveFrameZoom(fitScale / baseScale, baseScale);
    setZoom(nextZoom);
    requestAnimationFrame(() => {
      const innerPad = 24;
      const innerScale = baseCanvasScale(canvasBounds) * nextZoom;
      const w = canvasBounds.width * innerScale + innerPad * 2;
      const h = canvasBounds.height * innerScale + innerPad * 2;
      stage.scrollLeft = Math.max(0, (w - stage.clientWidth) / 2);
      stage.scrollTop = Math.max(0, (h - stage.clientHeight) / 2);
    });
  }, [canvasBounds.width, canvasBounds.height, canvasBounds.minX, layout, previewFixturePolygon]);

  useEffect(() => {
    localStorage.setItem(
      EDITOR_PANELS_STORAGE_KEY,
      JSON.stringify({ palette: paletteCollapsed })
    );
  }, [paletteCollapsed]);

  const toggleEditorFullscreen = useCallback(async () => {
    const el = editorRootRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      toast("Fullscreen is not available in this browser.");
    }
  }, [toast]);

  useEffect(() => {
    const onFsChange = () => {
      const active = document.fullscreenElement === editorRootRef.current;
      setEditorFullscreen(active);
      if (active) {
        requestAnimationFrame(() => fitToView());
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [fitToView]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      e.preventDefault();
      toggleEditorFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleEditorFullscreen]);

  useEffect(() => {
    if (!layout?.id || view3d) return;
    if (lastAutoFitLayoutId.current === layout.id) return;
    lastAutoFitLayoutId.current = layout.id;
    const t = setTimeout(() => fitToView(), 80);
    return () => clearTimeout(t);
  }, [layout?.id, view3d, fitToView]);

  const scale = useMemo(
    () => baseCanvasScale(canvasBounds) * zoom,
    [canvasBounds.width, canvasBounds.height, zoom]
  );

  const shelfLabelsVisible = useMemo(() => {
    if (!layout) return false;
    const list = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
    for (const raw of list) {
      const aabb = shelfCanvasAabb(raw);
      const pw = aabb.w * scale;
      const ph = aabb.d * scale;
      if (shelfLabelFitsShelfBadge(pw, ph)) return true;
      if (shelfLabelFitsGondolaFace(pw, ph, true)) return true;
      if (shelfLabelFitsGondolaFace(pw, ph, false)) return true;
    }
    return false;
  }, [layout, scale]);

  const preserveViewCenter = useCallback((prevBounds) => {
    const stage = stageRef.current;
    if (!stage || !prevBounds) return;
    const currentZoom = zoomRef.current;
    const oldScale = baseCanvasScale(prevBounds) * currentZoom;
    const newScale = baseCanvasScale(canvasBounds) * currentZoom;
    if (oldScale <= 0 || newScale <= 0) return;
    const rect = stage.getBoundingClientRect();
    const centerX = stage.scrollLeft + rect.width / 2;
    const centerY = stage.scrollTop + rect.height / 2;
    const worldX = centerX / oldScale;
    const worldY = centerY / oldScale;
    requestAnimationFrame(() => {
      if (!stageRef.current) return;
      stageRef.current.scrollLeft = worldX * newScale - rect.width / 2;
      stageRef.current.scrollTop = worldY * newScale - rect.height / 2;
    });
  }, [canvasBounds]);

  useLayoutEffect(() => {
    if (pendingViewPreserveRef.current) {
      preserveViewCenter(pendingViewPreserveRef.current);
      pendingViewPreserveRef.current = null;
    }
  });

  const applyZoomAtPoint = useCallback((nextZoom, clientX, clientY) => {
    const stage = stageRef.current;
    const currentZoom = zoomRef.current;
    const clamped = clampZoom(nextZoom);
    if (clamped === currentZoom) return;
    if (!stage) {
      setZoom(clamped);
      return;
    }
    const rect = stage.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const ratio = clamped / currentZoom;
    pendingZoomScrollRef.current = {
      scrollLeft: (stage.scrollLeft + localX) * ratio - localX,
      scrollTop: (stage.scrollTop + localY) * ratio - localY,
    };
    pendingFrameRef.current = null;
    setZoom(clamped);
  }, []);

  const adjustZoom = useCallback((delta, { reset = false, clientX, clientY } = {}) => {
    const stage = stageRef.current;
    const currentZoom = zoomRef.current;
    const nextZoom = reset ? 1 : clampZoom(currentZoom + delta);
    if (nextZoom === currentZoom) return;
    if (clientX != null && clientY != null) {
      applyZoomAtPoint(nextZoom, clientX, clientY);
      return;
    }
    if (!stage) {
      setZoom(nextZoom);
      return;
    }
    const rect = stage.getBoundingClientRect();
    const localX = rect.width / 2;
    const localY = rect.height / 2;
    const ratio = nextZoom / currentZoom;
    pendingZoomScrollRef.current = {
      scrollLeft: (stage.scrollLeft + localX) * ratio - localX,
      scrollTop: (stage.scrollTop + localY) * ratio - localY,
    };
    pendingFrameRef.current = null;
    setZoom(nextZoom);
  }, [applyZoomAtPoint]);

  useEffect(() => {
    setSelection(null);
  }, [layout?.id]);

  const handleCanvasWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const stage = stageRef.current;
    if (!stage) return;

    if (e.ctrlKey || e.metaKey) {
      stage.scrollLeft += e.deltaX;
      stage.scrollTop += e.deltaY;
      return;
    }

    const currentZoom = zoomRef.current;
    const step = e.deltaMode === 1 ? 0.35 : e.deltaMode === 2 ? 0.5 : 0.12;
    const delta = e.deltaY > 0 ? -step : step;
    applyZoomAtPoint(currentZoom + delta, e.clientX, e.clientY);
  }, [applyZoomAtPoint]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || view3d || !layout) return undefined;
    const onWheel = (e) => handleCanvasWheel(e);
    stage.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => stage.removeEventListener("wheel", onWheel, { capture: true });
  }, [view3d, layout?.id, handleCanvasWheel]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || view3d || !layout) return undefined;

    let pan = null;

    const startPan = (e) => {
      pan = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: stage.scrollLeft,
        scrollTop: stage.scrollTop,
      };
      stage.classList.add("canvas-panning");
      e.preventDefault();
      e.stopPropagation();
    };

    const onDown = (e) => {
      if (
        e.target.closest?.(
          ".resize-handle, .polygon-vertex-handle, .polygon-vertex-handle-hit, .polygon-edge-handle, .rotate-handle, .draft-vertex-handle, .draft-close-handle"
        )
      ) {
        return;
      }
      const panWithCtrl = (e.ctrlKey || e.metaKey) && e.button === 0;
      const panWithMiddle = e.button === 1;
      if (!panWithCtrl && !panWithMiddle) return;
      startPan(e);
    };

    const onAuxClick = (e) => {
      if (e.button === 1) e.preventDefault();
    };

    const onMove = (e) => {
      if (!pan) return;
      stage.scrollLeft = pan.scrollLeft - (e.clientX - pan.x);
      stage.scrollTop = pan.scrollTop - (e.clientY - pan.y);
      e.preventDefault();
    };

    const onUp = () => {
      if (!pan) return;
      pan = null;
      stage.classList.remove("canvas-panning");
    };

    stage.addEventListener("mousedown", onDown, { capture: true });
    stage.addEventListener("auxclick", onAuxClick, { capture: true });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      stage.removeEventListener("mousedown", onDown, { capture: true });
      stage.removeEventListener("auxclick", onAuxClick, { capture: true });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      stage.classList.remove("canvas-panning");
    };
  }, [view3d, layout?.id]);

  useEffect(() => {
    if (!dragging || !layout) return undefined;
    const entity =
      dragging.kind === "aisle"
        ? (layout.aisles || []).find((a) => a.id === dragging.id)
        : (layout.shelves || layout.fixtures || []).find((s) => s.id === dragging.id);
    const toPos = (clientX, clientY) => {
      const dx = (clientX - dragging.startClientX) / scale;
      const dy = (clientY - dragging.startClientY) / scale;
      return { x: Math.max(0, dragging.origX + dx), y: Math.max(0, dragging.origY + dy) };
    };
    const onMove = (e) => {
      const movedPx = Math.hypot(
        e.clientX - dragging.startClientX,
        e.clientY - dragging.startClientY
      );
      if (movedPx < 4) return;
      const { x, y } = toPos(e.clientX, e.clientY);
      if (!entity) return;
      const tentative = { ...entity, x, y };
      if (!entityPlacementValid(tentative, dragging.kind, canvasBounds, layout, { ignoreId: dragging.id })) return;
      setDragPos({ id: dragging.id, x, y });
    };
    const onUp = async (e) => {
      const movedPx = Math.hypot(
        e.clientX - dragging.startClientX,
        e.clientY - dragging.startClientY
      );
      const { x, y } = toPos(e.clientX, e.clientY);
      const nx = snap(x);
      const ny = snap(y);
      setDragging(null);
      setDragPos(null);
      if (movedPx < 4 || (nx === snap(dragging.origX) && ny === snap(dragging.origY))) {
        return;
      }
      if (entity && !entityPlacementValid({ ...entity, x: nx, y: ny }, dragging.kind, canvasBounds, layout, { ignoreId: dragging.id })) {
        toast(
          dragging.kind === "aisle"
            ? "Aisles cannot overlap shelves — place corridors in open floor space."
            : "Shelves cannot overlap aisle corridors."
        );
        return;
      }
      try {
        const path =
          dragging.kind === "aisle"
            ? `/layouts/${dragging.layoutId}/aisles/${dragging.id}`
            : `/layouts/${dragging.layoutId}/shelves/${dragging.id}`;
        const updated = await api(path, {
          token,
          method: "PATCH",
          body: { x: nx, y: ny },
        });
        setLayout(updated);
      } catch (err) {
        toast(err.message === "containment_violation" ? "Keep fixtures inside the drawn floor area." : err.message === "overlap_violation" ? "Aisles cannot overlap shelves." : err.message);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, scale, token, layout, canvasBounds]);

  function placementAllowed(x, y) {
    const poly = canvasBounds.polygon;
    if (!poly) return true;
    return pointInPolygon(x, y, poly);
  }

  async function addShelf(type, x, y) {
    const t = fixtureForType(config, type, layoutVertical);
    const w = t.defaultWidthMeters;
    const d = t.defaultDepthMeters;
    const tentative = {
      x,
      y,
      usableWidthMeters: w,
      widthMeters: w,
      depthMeters: d,
      rotationDeg: 0,
    };
    if (!entityPlacementValid(tentative, "shelf", canvasBounds, layout)) {
      toast("Place shelves inside the floor area and away from aisle corridors.");
      return;
    }
    try {
      const updated = await api(`/layouts/${layout.id}/shelves`, {
        token,
        method: "POST",
        body: {
          type,
          usableWidthMeters: w,
          widthMeters: w,
          depthMeters: d,
          heightMeters: t.defaultHeightMeters ?? 2,
          x,
          y,
        },
      });
      setLayout(updated);
      setPaletteTool("select");
      toast(`${t.label} placed`);
    } catch (e) {
      toast(
        e.message === "overlap_violation"
          ? "Shelves cannot overlap aisle corridors."
          : e.message === "containment_violation"
            ? "Place shelves inside the drawn floor area only."
            : e.message
      );
    }
  }

  async function addAisle(x = 0.5, y = 0.5, orientation = "horizontal") {
    const widthMeters = Math.max(minAisle, 1.0);
    const ax = snap(x);
    const ay = snap(y);
    const lengthMeters = defaultAisleRun(canvasBounds, ax, ay, orientation, widthMeters);
    const tentative = {
      x: ax,
      y: ay,
      widthMeters,
      lengthMeters,
      orientation,
    };
    if (!entityPlacementValid(tentative, "aisle", canvasBounds, layout)) {
      toast("Aisles must be placed in open floor space — not on shelves.");
      return;
    }
    try {
      const updated = await api(`/layouts/${layout.id}/aisles`, {
        token,
        method: "POST",
        body: {
          name: orientation === "vertical" ? "Walk (vertical)" : "Walk (horizontal)",
          widthMeters,
          lengthMeters,
          orientation,
          x: ax,
          y: ay,
        },
      });
      setLayout(updated);
      setPaletteTool("select");
      const created = (updated.aisles || []).slice(-1)[0];
      if (created) setSelection({ kind: "aisle", id: created.id });
      toast("Aisle added — drag handles to resize");
    } catch (e) {
      toast(
        e.message === "overlap_violation"
          ? "Aisles cannot overlap shelves — place corridors in open floor space."
          : e.message === "containment_violation"
            ? "Place aisles inside the drawn floor area only."
            : e.message
      );
    }
  }

  async function addZone(type, x, y) {
    if (!placementAllowed(x, y)) {
      toast("Place zones inside the drawn floor area only.");
      return;
    }
    const meta = ZONE_TYPES[type] || ZONE_TYPES.special;
    const prevIds = new Set((layout.zones || []).map((z) => z.id));
    try {
      const updated = await api(`/layouts/${layout.id}/zones`, {
        token,
        method: "POST",
        body: { type, x: snap(x), y: snap(y), widthMeters: 3, depthMeters: 3, color: meta.color },
      });
      setLayout(updated);
      setPaletteTool("select");
      const created = (updated.zones || []).find((z) => !prevIds.has(z.id));
      if (created) setSelection({ kind: "zone", id: created.id });
      toast(`${meta.label} added — drag edges or handles to resize`);
    } catch (e) {
      toast(
        e.message === "containment_violation"
          ? "Zone must fit inside the drawn floor area."
          : e.message
      );
    }
  }

  async function addEntry(x, y) {
    if (!placementAllowed(x, y)) {
      toast("Place the entry point inside the drawn floor area.");
      return;
    }
    const updated = await api(`/layouts/${layout.id}/entry-points`, {
      token,
      method: "POST",
      body: { x: snap(x), y: snap(y), widthMeters: 1.8 },
    });
    setLayout(updated);
    setPaletteTool("select");
    toast("Entry point added");
  }

  async function dispatchPlace(tool, x, y) {
    if (tool === "aisle" || tool === "aisle-h") return addAisle(x, y, "horizontal");
    if (tool === "aisle-v") return addAisle(x, y, "vertical");
    if (tool === "entry") return addEntry(x, y);
    if (typeof tool === "string" && tool.startsWith("zone:")) {
      return addZone(tool.slice("zone:".length), x, y);
    }
    if (fixtureTypeKeys.has(tool)) return addShelf(tool, x, y);
    return undefined;
  }

  async function onDropTool(tool, x, y) {
    try {
      await dispatchPlace(tool, x, y);
    } catch (e) {
      toast(e.message);
    }
  }

  async function onPlaceClick(tool, x, y) {
    try {
      await dispatchPlace(tool, x, y);
    } catch (e) {
      toast(e.message);
    }
  }

  async function patchLayout(body) {
    const updated = await api(`/layouts/${layout.id}`, { token, method: "PATCH", body });
    setLayout(updated);
    await onRefreshLayouts?.();
  }

  async function applyArea() {
    if (draftPolygon.length < 3) {
      toast("Need at least 3 vertices");
      return;
    }
    const env = layoutStoreEnvelope(layout);
    if (!polygonInsideEnvelope(draftPolygon, env)) {
      toast("Fixture zone must stay inside the store envelope — redraw inside the dashed border");
      return;
    }
    try {
      const updated = await api(`/layouts/${layout.id}`, {
        token,
        method: "PATCH",
        body: {
          shape: "polygon",
          polygon: draftPolygon,
          storeEnvelope: env,
        },
      });
      setLayout(updated);
      setDraftPolygon([]);
      setPaletteTool("select");
      toast("Floor area applied");
      await onRefreshLayouts?.();
      setTimeout(() => fitToView(), 100);
    } catch (e) {
      toast(e.message);
    }
  }

  async function savePolygon(polygon, { silent = false } = {}) {
    const normalized = normalizeFixtureRectangle(polygon) || polygon;
    if (!normalized?.length || normalized.length < 3) return;
    const env = layoutStoreEnvelope(layout);
    if (!polygonInsideEnvelope(normalized, env)) {
      toast("Fixture zone must stay inside the store envelope");
      return;
    }
    const dims = polygonDimensions(normalized);
    try {
      const updated = await api(`/layouts/${layout.id}`, {
        token,
        method: "PATCH",
        body: {
          shape: "polygon",
          polygon: normalized,
          storeEnvelope: env,
        },
      });
      setLayout(updated);
      if (dims) {
        setFixtureW(String(Number(dims.w.toFixed(1))));
        setFixtureD(String(Number(dims.d.toFixed(1))));
      }
      if (!silent) toast("Fixture zone updated");
    } catch (e) {
      toast(e.message === "invalid_polygon" ? "Invalid polygon shape." : e.message);
    }
  }

  function handlePolygonPreview(polygon) {
    const normalized = normalizeFixtureRectangle(polygon) || polygon;
    const dims = polygonDimensions(normalized);
    if (!dims) return;
    setFixtureW(String(Number(dims.w.toFixed(1))));
    setFixtureD(String(Number(dims.d.toFixed(1))));
    setLayout((prev) =>
      prev ? { ...prev, polygon: normalized, shape: "polygon" } : prev
    );
  }

  function frameRect(minX, minY, maxX, maxY, padM = 1.5) {
    const stage = stageRef.current;
    if (!stage || !layout) return;
    minX -= padM;
    minY -= padM;
    maxX += padM;
    maxY += padM;
    const bw = Math.max(0.5, maxX - minX);
    const bh = Math.max(0.5, maxY - minY);
    const pad = 32;
    const availW = Math.max(120, stage.clientWidth - pad * 2);
    const availH = Math.max(120, stage.clientHeight - pad * 2);
    const baseScale = baseCanvasScale(canvasBounds);
    const fitScale = Math.min(availW / bw, availH / bh);
    let nextZoom = resolveFrameZoom(fitScale / baseScale, baseScale);
    pendingZoomScrollRef.current = null;
    pendingFrameRef.current = { minX, minY, maxX, maxY, zoom: nextZoom };
    setZoom(nextZoom);
  }

  function focusLayoutContent(targetLayout, padM = 0.6) {
    const content = layoutContentBounds(targetLayout, previewFixturePolygon);
    if (content) {
      frameRect(content.minX, content.minY, content.maxX, content.maxY, padM);
      return;
    }
    fitToView();
  }

  function frameShelfIds(shelfIds) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const shelves = layout.shelves || [];

    for (const id of shelfIds) {
      const s = shelves.find((x) => x.id === id);
      if (!s) continue;
      let aabb;
      if (s.pairId) {
        const mate = shelves.find((x) => x.pairId === s.pairId && x.id !== s.id);
        if (mate) {
          const front = s.pairRole === "back" ? mate : s;
          const back = s.pairRole === "back" ? s : mate;
          aabb = gondolaCanvasAabb(front, back);
        } else {
          aabb = shelfCanvasAabb(s);
        }
      } else {
        aabb = shelfCanvasAabb(s);
      }
      minX = Math.min(minX, aabb.x);
      minY = Math.min(minY, aabb.y);
      maxX = Math.max(maxX, aabb.x + aabb.w);
      maxY = Math.max(maxY, aabb.y + aabb.d);
    }

    if (!Number.isFinite(minX)) return;
    frameRect(minX, minY, maxX, maxY);
  }

  function focusFixtureZone() {
    const fz = layoutFixtureZoneRect(layout, previewFixturePolygon);
    frameRect(fz.x, fz.y, fz.x + fz.widthMeters, fz.y + fz.depthMeters, 0.6);
  }

  useLayoutEffect(() => {
    if (view3d) return;
    const stage = stageRef.current;
    if (!stage) return;

    const frame = pendingFrameRef.current;
    if (frame) {
      pendingFrameRef.current = null;
      pendingZoomScrollRef.current = null;
      const baseScale = baseCanvasScale(canvasBounds);
      const cx = (frame.minX + frame.maxX) / 2 - canvasBounds.minX;
      const cy = (frame.minY + frame.maxY) / 2 - canvasBounds.minY;
      stage.scrollLeft = Math.max(0, cx * baseScale * frame.zoom - stage.clientWidth / 2);
      stage.scrollTop = Math.max(0, cy * baseScale * frame.zoom - stage.clientHeight / 2);
      return;
    }

    const pendingScroll = pendingZoomScrollRef.current;
    if (pendingScroll) {
      pendingZoomScrollRef.current = null;
      stage.scrollLeft = Math.max(0, pendingScroll.scrollLeft);
      stage.scrollTop = Math.max(0, pendingScroll.scrollTop);
    }
  }, [zoom, canvasBounds, view3d]);

  useEffect(() => {
    const prev = prevPaletteToolRef.current;
    prevPaletteToolRef.current = paletteTool;
    if (paletteTool !== "edit-area" || prev === "edit-area" || view3d || editDisabled) return;
    if (scale < 22) focusFixtureZone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteTool, view3d, editDisabled]);

  function openPlanogramForShelf(shelfId, faceId = "A") {
    if (view3d) return;
    setPlanogramEditor({ shelfId, faceId: faceId || "A" });
  }

  function viewShelfIn3d(shelfId, faceId = "A") {
    if (!shelfId) return;
    setPlanogram3dReturn({ shelfId, faceId: faceId || "A" });
    setSelection({ kind: "shelf", id: shelfId, faceId: faceId || "A" });
    setPlanogramEditor(null);
    setView3d(true);
    setWalkMode(false);
    setFocus3dRequest((n) => n + 1);
  }

  function backToPlanogramFrom3d() {
    if (!planogram3dReturn) return;
    setView3d(false);
    setWalkMode(false);
    setPlanogramEditor({
      shelfId: planogram3dReturn.shelfId,
      faceId: planogram3dReturn.faceId || "A",
    });
    setSelection({
      kind: "shelf",
      id: planogram3dReturn.shelfId,
      faceId: planogram3dReturn.faceId || "A",
    });
    setPlanogram3dReturn(null);
  }

  function exit3dView() {
    setView3d(false);
    setWalkMode(false);
    setPlanogram3dReturn(null);
  }

  function selectShelf(shelfId, faceId = "A", { openPlanogram = true } = {}) {
    setSelection({ kind: "shelf", id: shelfId, faceId: faceId || "A" });
    if (openPlanogram) openPlanogramForShelf(shelfId, faceId);
  }

  function goToShelf(label) {
    const resolved = resolveShelfByLabel(layout, label);
    if (!resolved) {
      toast(`Shelf "${String(label).trim()}" not found — try e.g. 4A`);
      return;
    }
    const faceId =
      resolved.mergedGondola && resolved.shelfId === resolved.backId ? "B" : "A";
    selectShelf(resolved.shelfId, faceId);
    setFocus3dRequest((n) => n + 1);
    if (view3d) return;
    const ids =
      resolved.mergedGondola && resolved.backId
        ? [resolved.frontId, resolved.backId]
        : [resolved.shelfId];
    frameShelfIds(ids);
  }

  const shelfLabelOptions = useMemo(() => listShelfLabels(layout), [layout?.shelves, layout?.aisles, layout?.contentRevision]);

  const highlightShelf3d = useMemo(() => {
    if (!selection || (selection.kind !== "shelf" && selection.kind !== "fixture")) return null;
    const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
    const s = shelves.find((x) => x.id === selection.id);
    if (!s) return { shelfId: selection.id, pairId: null };
    if (s.pairId) {
      const mate = shelves.find((x) => x.pairId === s.pairId && x.id !== s.id);
      return {
        shelfId: selection.id,
        pairId: s.pairId,
        frontId: s.pairRole === "back" ? mate?.id : s.id,
        backId: s.pairRole === "back" ? s.id : mate?.id,
      };
    }
    return { shelfId: selection.id, pairId: null };
  }, [selection, layout?.shelves, layout?.fixtures]);

  const scene3dDimensionLabels = useMemo(() => {
    if (!layout) return null;
    const floor = layoutBounds(layout);
    const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
    const focusShelf = planogram3dReturn
      ? shelves.find((s) => s.id === planogram3dReturn.shelfId)
      : shelves.find((s) => s.id === highlightShelf3d?.shelfId);
    const rack = focusShelf ? shelf3dLocalBox(focusShelf, layout) : null;
    return {
      layout: `${formatMeters(floor.widthMeters)} × ${formatMeters(floor.depthMeters)} × ${formatMeters(floor.heightMeters)}`,
      rack: rack
        ? `${formatMeters(rack.merchWidthMeters)} W × ${formatMeters(rack.depthMeters)} D × ${formatMeters(rack.heightMeters)} H`
        : null,
    };
  }, [layout, planogram3dReturn, highlightShelf3d?.shelfId]);

  function focusCanvasTarget(target) {
    const stage = stageRef.current;
    if (!stage || !layout) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const expandRect = (x, y, w, d) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + d);
    };

    if (target === "__selection__" && selection) {
      if (selection.kind === "shelf" || selection.kind === "fixture") {
        const s = (layout.shelves || []).find((x) => x.id === selection.id);
        if (s) {
          const ids = [s.id];
          if (s.pairId) {
            const mate = (layout.shelves || []).find((x) => x.pairId === s.pairId && x.id !== s.id);
            if (mate) ids.push(mate.id);
          }
          frameShelfIds(ids);
          return;
        }
      } else if (selection.kind === "aisle") {
        const a = (layout.aisles || []).find((x) => x.id === selection.id);
        if (a) {
          const fp = aisleFootprintMeters(a, layout);
          expandRect(fp.x, fp.y, fp.w, fp.d);
        }
      }
    } else if (target) {
      const shelfIds = new Set(
        (layout.shelfMappings || [])
          .filter((m) => m.categoryId === target)
          .map((m) => m.shelfId || m.fixtureId)
      );
      for (const s of layout.shelves || []) {
        if (shelfIds.has(s.id) || s.categoryId === target) {
          const { w, d } = shelfLocalMeters(s);
          expandRect(Number(s.x) || 0, Number(s.y) || 0, w, d);
        }
      }
      for (const a of layout.aisles || []) {
        if ((layout.aisleMappings || []).some((m) => m.aisleId === a.id && m.categoryId === target)) {
          const fp = aisleFootprintMeters(a, layout);
          expandRect(fp.x, fp.y, fp.w, fp.d);
        }
      }
    }

    if (!Number.isFinite(minX)) {
      if (target && target !== "__selection__") {
        const cat = zoomCategories.find((c) => c.id === target);
        toast(`No fixtures placed for ${cat?.name || "that category"} yet.`);
      }
      fitToView();
      return;
    }
    const padM = 1.5;
    minX -= padM;
    minY -= padM;
    maxX += padM;
    maxY += padM;
    const bw = Math.max(0.5, maxX - minX);
    const bh = Math.max(0.5, maxY - minY);
    const pad = 32;
    const availW = Math.max(120, stage.clientWidth - pad * 2);
    const availH = Math.max(120, stage.clientHeight - pad * 2);
    const baseScale = baseCanvasScale(canvasBounds);
    const fitScale = Math.min(availW / bw, availH / bh);
    const nextZoom = resolveFrameZoom(fitScale / baseScale, baseScale);
    setZoom(nextZoom);
    requestAnimationFrame(() => {
      const cx = (minX + maxX) / 2 - canvasBounds.minX;
      const cy = (minY + maxY) / 2 - canvasBounds.minY;
      stage.scrollLeft = cx * baseScale * nextZoom - stage.clientWidth / 2;
      stage.scrollTop = cy * baseScale * nextZoom - stage.clientHeight / 2;
    });
  }

  async function submitForReview() {
    try {
      const updated = await api(`/layouts/${layout.id}/review/submit`, { token, method: "POST" });
      setLayout(updated);
      await onRefreshLayouts?.();
      toast("Submitted for review");
    } catch (e) {
      toast(e.message === "submit_not_allowed" ? "No changes to submit yet." : e.message);
    }
  }

  async function approveLayout() {
    try {
      const updated = await api(`/layouts/${layout.id}/review/approve`, { token, method: "POST" });
      setLayout(updated);
      await onRefreshLayouts?.();
      toast("Layout approved");
    } catch (e) {
      toast(e.message);
    }
  }

  async function confirmReject() {
    const comment = rejectComment.trim();
    if (!comment) {
      setRejectError("Describe what needs to change before rejecting.");
      notifyError("review_comment_required");
      return;
    }
    setRejectError("");
    try {
      setRejectSubmitting(true);
      const updated = await api(`/layouts/${layout.id}/review/reject`, {
        token,
        method: "POST",
        body: { comment },
      });
      setLayout(updated);
      await onRefreshLayouts?.();
      setRejectOpen(false);
      setRejectComment("");
      notifySuccess("Layout rejected");
    } catch (e) {
      notifyError(e);
    } finally {
      setRejectSubmitting(false);
    }
  }

  async function runGenerate() {
    let activeLayout = layout;
    const hasPolygon = (activeLayout.polygon?.length ?? 0) >= 3;
    if (!hasPolygon) {
      if (previewFixturePolygon) {
        try {
          activeLayout = await patchLayout({ shape: "polygon", polygon: previewFixturePolygon });
          setLayout(activeLayout);
        } catch (e) {
          toast(e.message === "invalid_polygon" ? "Invalid fixture zone shape." : e.message);
          setPaletteTool("draw");
          return;
        }
      } else {
        toast("Draw and apply a floor area first (3+ vertices), then Generate.");
        setPaletteTool("draw");
        return;
      }
    }
    const hasContent = (activeLayout.aisles || []).length > 0 || (activeLayout.shelves || []).length > 0;
    if (hasContent && !window.confirm("Replace existing aisles and shelves with generated layout?")) {
      return;
    }
    try {
      setGenerating(true);
      const mixPayload = categoryMix.map(({ categoryId, percent, temperatureZone, fixtureType }) => ({
        categoryId,
        percent,
        temperatureZone,
        fixtureType,
      }));
      const updated = await api(`/layouts/${activeLayout.id}/autogenerate`, {
        token,
        method: "POST",
        body: {
          orientation: genOrientation,
          replaceExisting: true,
          minAisleWidthMeters: Number(genMinAisle) || minAisle,
          categoryMix: mixPayload,
          fillPlanogram: genFillPlanogram,
        },
      });
      setLayout(updated);
      if (updated.coverage) setPlanogramCoverage(updated.coverage);
      setLastGenStats({
        generated: updated.generated,
        coverage: updated.coverage,
        shelfMappings: updated.shelfMappings,
      });
      setGenOpen(false);
      onRefreshCatalog?.();
      const g = updated.generated || {};
      const cov = updated.coverage;
      const gondolas = g.gondolaUnits ?? countGondolaUnits(updated.shelves || []);
      const walkAisles = g.walkAisles ?? g.aisles ?? updated.aisles?.length ?? 0;
      toast(
        `Generated ${gondolas} gondola${gondolas === 1 ? "" : "s"} (front+back) · ${walkAisles} walk aisle${walkAisles === 1 ? "" : "s"}` +
          (g.productsMapped || g.planogramPlacements
            ? ` · ${g.productsMapped ?? g.planogramPlacements} product placements`
            : genFillPlanogram && mixPayload.length
              ? " · no catalog products matched categories"
              : "") +
          (cov ? ` · ${cov.placedCount}/${cov.totalProducts} catalog SKUs on shelves` : "") +
          (g.skippedOutsideCount ? ` (${g.skippedOutsideCount} skipped outside area)` : "")
      );
      setTimeout(() => focusLayoutContent(updated, 0.5), 120);
    } catch (e) {
      toast(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function patchAisle(aisleId, body) {
    const updated = await api(`/layouts/${layout.id}/aisles/${aisleId}`, {
      token,
      method: "PATCH",
      body,
    });
    setLayout(updated);
  }

  async function patchShelf(shelfId, body) {
    const updated = await api(`/layouts/${layout.id}/shelves/${shelfId}`, {
      token,
      method: "PATCH",
      body,
    });
    setLayout(updated);
    return updated;
  }

  async function deleteAisle(aisleId) {
    const updated = await api(`/layouts/${layout.id}/aisles/${aisleId}`, { token, method: "DELETE" });
    setLayout(updated);
    setSelection(null);
  }

  async function deleteShelf(shelfId) {
    const updated = await api(`/layouts/${layout.id}/shelves/${shelfId}`, { token, method: "DELETE" });
    setLayout(updated);
    setSelection(null);
  }

  async function patchZone(zoneId, body) {
    const updated = await api(`/layouts/${layout.id}/zones/${zoneId}`, { token, method: "PATCH", body });
    setLayout(updated);
  }

  async function resizeEntity(kind, id, patch) {
    try {
      if (kind === "shelf") {
        const updated = await api(`/layouts/${layout.id}/shelves/${id}`, {
          token,
          method: "PATCH",
          body: patch,
        });
        setLayout(updated);
        return;
      }
      const path =
        kind === "zone"
          ? `/layouts/${layout.id}/zones/${id}`
          : `/layouts/${layout.id}/aisles/${id}`;
      const updated = await api(path, { token, method: "PATCH", body: patch });
      setLayout(updated);
    } catch (err) {
      toast(
        err.message === "zone_not_found"
          ? "Zone was removed or is out of sync. Reselect the zone and try again."
          : err.message === "overlap_violation"
            ? kind === "shelf"
              ? "Shelves cannot overlap aisle corridors."
              : "Aisles cannot overlap shelves."
            : err.message === "containment_violation"
              ? "Keep items inside the drawn floor area."
              : err.message
      );
    }
  }

  async function deleteZone(zoneId) {
    const updated = await api(`/layouts/${layout.id}/zones/${zoneId}`, { token, method: "DELETE" });
    setLayout(updated);
    setSelection(null);
  }

  async function patchEntry(entryId, body) {
    const updated = await api(`/layouts/${layout.id}/entry-points/${entryId}`, { token, method: "PATCH", body });
    setLayout(updated);
  }

  async function deleteEntry(entryId) {
    const updated = await api(`/layouts/${layout.id}/entry-points/${entryId}`, { token, method: "DELETE" });
    setLayout(updated);
    setSelection(null);
  }

  const selectionInfo = useMemo(() => {
    if (!selection) return null;
    const { kind, id } = selection;
    if (kind === "aisle") {
      const a = (layout.aisles || []).find((x) => x.id === id);
      if (!a) return null;
      const vertical = a.orientation === "vertical";
      const runLen = a.lengthMeters != null ? a.lengthMeters : Math.max(2, layout.widthMeters * 0.35);
      const dim = vertical
        ? `${Number(a.widthMeters || 0).toFixed(1)}×${runLen.toFixed(1)} m`
        : `${runLen.toFixed(1)}×${Number(a.widthMeters || 0).toFixed(1)} m`;
      return { kind, id, label: a.name || "Aisle", detail: dim, run: () => deleteAisle(id) };
    }
    if (kind === "shelf" || kind === "fixture") {
      const s = (layout.shelves || layout.fixtures || []).find((x) => x.id === id);
      if (!s) return null;
      const gondola = resolveGondolaForEditor(layout, id);
      const faceId = selection.faceId || "A";
      const aisleLabel =
        gondola?.mode === "gondola"
          ? shelfCanvasFaceLabel(gondola.shelf, faceId, layout.aisles, layout.shelves)
          : shelfFaceDisplayLabel(s, layout.aisles);
      const unit = aisleLabel || (s.displayNumber != null ? shelfUnitLabel(s.displayNumber) : "");
      const uw = Number(s.usableWidthMeters ?? s.widthMeters) || 0;
      const dep = Number(s.depthMeters) || 0;
      const ht = Number(s.heightMeters) || 0;
      const dim = `${uw.toFixed(1)}×${dep.toFixed(1)}×${ht.toFixed(1)} m`;
      const shelfType =
        fixtureTypes.find((t) => t.type === s.type)?.label ||
        FIXTURE_TYPES[s.type]?.label ||
        s.type ||
        "Shelf";
      return {
        kind: "shelf",
        id,
        label: unit ? `Shelf ${unit}` : "Shelf",
        detail: dim,
        shelfType,
        run: () => deleteShelf(id),
      };
    }
    if (kind === "zone") {
      const z = (layout.zones || []).find((x) => x.id === id);
      return z ? { kind, id, label: z.name || "Zone", run: () => deleteZone(id) } : null;
    }
    if (kind === "entryPoint") {
      const e = (layout.entryPoints || []).find((x) => x.id === id);
      return e ? { kind, id, label: e.name || "Entry point", run: () => deleteEntry(id) } : null;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, selection?.faceId, layout, fixtureTypes]);

  function selectContainmentViolation() {
    const v = (layout.validation?.containmentViolations || [])[0];
    if (!v) return;
    const kind = v.kind === "fixture" ? "shelf" : v.kind;
    setSelection({ kind, id: v.id });
  }

  async function rotateShelf(shelfId, rotationDeg) {
    try {
      await patchShelf(shelfId, { rotationDeg: Math.round(rotationDeg) % 360 });
    } catch (e) {
      toast(e.message === "containment_violation" ? "Rotation places shelf outside the drawn area." : e.message);
    }
  }

  async function deleteSelection() {
    if (!selectionInfo || editDisabled) return;
    if (!window.confirm(`Delete ${selectionInfo.label}? This can't be undone.`)) return;
    try {
      await selectionInfo.run();
      toast(`${selectionInfo.label} deleted`);
    } catch (e) {
      toast(e.message);
    }
  }

  useEffect(() => {
    if (view3d || editDisabled) return undefined;
    const onKey = (e) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (!selectionInfo) return;
      e.preventDefault();
      deleteSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view3d, editDisabled, selectionInfo]);

  async function mapAisle(aisleId, categoryId, color) {
    const updated = await api(`/layouts/${layout.id}/mappings`, {
      token,
      method: "POST",
      body: { aisleId, categoryId, color },
    });
    setLayout(updated);
  }

  async function mapShelf(shelfId, categoryId, color, faceId = "A") {
    const updated = await api(`/layouts/${layout.id}/mappings`, {
      token,
      method: "POST",
      body: { shelfId, categoryId, color, faceId },
    });
    setLayout(updated);
  }

  if (!layout) {
    return <p className="muted">Select a layout from Layouts, or create one with + New layout.</p>;
  }

  return (
    <section
      ref={editorRootRef}
      className={`fade editor-layout-root${editorFullscreen ? " editor-layout-fullscreen" : ""}${view3d ? " editor-layout-root--3d" : ""}${planogram3dReturn ? " editor-layout-root--3d-focus" : ""}`}
    >
      <div className="editor-toolbar-row editor-toolbar-row--compact">
        <div className="editor-toolbar-left">
          <button className="btn-secondary editor-back-btn" onClick={onBack}>
            ←
          </button>
          <div className="editor-toolbar-title">{layout.name}</div>
          <span
            className="status-chip status-chip--sm"
            style={{ background: statusMeta(layout.status).bg, color: statusMeta(layout.status).color }}
          >
            {statusMeta(layout.status).label}
          </span>
          <span className="catalog-vertical-badge catalog-vertical-badge--sm">
            {activeStoreType?.emoji} {activeStoreType?.label || vMeta.label}
          </span>
        </div>
        <div className="editor-toolbar-right">
          {canApproveReject ? (
            <>
              <button
                className="btn-secondary editor-toolbar-action"
                style={{ color: "#A30A2A", fontWeight: 700 }}
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </button>
              <button
                className="btn-primary editor-toolbar-action"
                style={{ background: "oklch(0.5 0.12 150)", boxShadow: "none" }}
                onClick={() => approveLayout()}
              >
                Approve
              </button>
            </>
          ) : null}
          {canSubmitReview ? (
            <>
              {layoutHasShelves ? (
                <button
                  type="button"
                  className={`btn-secondary editor-toolbar-action${missingProductCount > 0 ? " editor-toolbar-action--warn" : ""}`}
                  onClick={() => setMissingProductsOpen(true)}
                  disabled={coverageLoading && !planogramCoverage}
                  title={
                    missingProductCount > 0
                      ? `${missingProductCount} catalog product${missingProductCount === 1 ? "" : "s"} not on shelves`
                      : "All catalog products are placed on shelves"
                  }
                >
                  Missing products{missingProductCount > 0 ? ` (${missingProductCount})` : ""}
                </button>
              ) : null}
              <button className="btn-secondary editor-toolbar-action" onClick={() => submitForReview()}>
                Submit
              </button>
            </>
          ) : layoutHasShelves ? (
            <button
              type="button"
              className={`btn-secondary editor-toolbar-action${missingProductCount > 0 ? " editor-toolbar-action--warn" : ""}`}
              onClick={() => setMissingProductsOpen(true)}
              disabled={coverageLoading && !planogramCoverage}
              title={
                missingProductCount > 0
                  ? `${missingProductCount} catalog product${missingProductCount === 1 ? "" : "s"} not on shelves`
                  : "All catalog products are placed on shelves"
              }
            >
              Missing products{missingProductCount > 0 ? ` (${missingProductCount})` : ""}
            </button>
          ) : null}
          {(role === "Designer" || role === "Admin") && onDeleteLayout ? (
            <button className="btn-danger editor-toolbar-action" onClick={() => onDeleteLayout(layout)}>
              Delete
            </button>
          ) : null}
          <div className="mode-toggle mode-toggle--sm">
            <button
              type="button"
              className="btn-secondary editor-fullscreen-btn"
              style={{ padding: "6px 10px", marginRight: 4 }}
              onClick={() => toggleEditorFullscreen()}
              title={editorFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (F)"}
            >
              {editorFullscreen ? "⛶" : "⛶"}
            </button>
            <button
              className={!view3d ? "active" : ""}
              onClick={() => exit3dView()}
            >
              2D
            </button>
            <button
              className={view3d && !walkMode ? "active" : ""}
              onClick={() => {
                setPlanogram3dReturn(null);
                setView3d(true);
                setWalkMode(false);
                setFocus3dRequest((n) => n + 1);
              }}
            >
              3D
            </button>
            <button
              className={view3d && walkMode ? "active" : ""}
              onClick={() => {
                setPlanogram3dReturn(null);
                setView3d(true);
                setWalkMode(true);
              }}
            >
              Walk
            </button>
          </div>
        </div>
      </div>

      {layout.status === "rejected" && layout.reviewComment ? (
        <div className="review-reject-banner">
          <strong>Rejected — reviewer feedback</strong>
          {layout.reviewComment}
          {layout.reviewedBy ? (
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              {layout.reviewedBy}
              {layout.reviewedAt ? ` · ${new Date(layout.reviewedAt).toLocaleString()}` : ""}
            </div>
          ) : null}
        </div>
      ) : null}

      {rejectOpen ? (
        <div className="review-modal-backdrop" role="dialog" aria-modal="true">
          <div className="review-modal">
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Reject layout</div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
              A comment is required so the designer knows what to fix.
            </p>
            <textarea
              value={rejectComment}
              onChange={(e) => {
                setRejectComment(e.target.value);
                if (rejectError) setRejectError("");
              }}
              placeholder="Describe what needs to change…"
              maxLength={2000}
            />
            <FieldError message={rejectError} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button type="button" className="btn-secondary" onClick={() => { setRejectOpen(false); setRejectError(""); }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={rejectSubmitting || !rejectComment.trim()}
                onClick={() => confirmReject()}
              >
                {rejectSubmitting ? "Rejecting…" : "Reject layout"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!view3d && paletteTool === "edit-area" && !dismissedAlerts.has("hint:edit-area") ? (
        <AlertBanner variant="info" onDismiss={() => dismissAlert("hint:edit-area")}>
          Drag polygon vertices to reshape the fixture zone · changes save automatically
        </AlertBanner>
      ) : null}
      {!view3d && paletteTool === "draw" && !dismissedAlerts.has("hint:draw") ? (
        <AlertBanner variant="info" onDismiss={() => dismissAlert("hint:draw")}>
          Click to place corners · move mouse to preview each line · click the green start point (or Apply area) to close · need 3+ points
        </AlertBanner>
      ) : null}

      <div className={`editor-layout${view3d ? " editor-layout--3d" : ""}`}>
        {!view3d ? (
        <EditorPanelShell
          side="left"
          label="Tools"
          collapsed={paletteCollapsed}
          onToggleCollapse={() => setPaletteCollapsed((v) => !v)}
        >
          <Palette
            compact
            paletteTool={paletteTool}
            setPaletteTool={setPaletteTool}
            editDisabled={editDisabled}
            minAisle={minAisle}
            fixtureTypes={fixtureTypes}
            draftCount={draftPolygon.length}
            hasAppliedPolygon={layout.shape === "polygon" && (layout.polygon?.length ?? 0) >= 3}
            onApplyArea={() => applyArea()}
            onClearDraft={() => setDraftPolygon([])}
            onOpenGenerate={() => {
              if (layout.shape !== "polygon" || (layout.polygon?.length ?? 0) < 3) {
                toast("Draw floor area first: click vertices, then Apply area.");
                setPaletteTool("draw");
                return;
              }
              setGenOpen(true);
            }}
          />
        </EditorPanelShell>
        ) : null}

        <div className="editor-canvas-column">
          {!planogram3dReturn ? (
          <EditorCanvasBar
            view3d={view3d}
            editDisabled={editDisabled}
            storeW={storeW}
            storeD={storeD}
            fixtureW={fixtureW}
            fixtureD={fixtureD}
            onStoreWChange={setStoreW}
            onStoreDChange={setStoreD}
            onFixtureWChange={setFixtureW}
            onFixtureDChange={setFixtureD}
            onEnvelopePatch={scheduleEnvelopePatch}
            onFixturePatch={scheduleFixtureZonePatch}
            envelope={envelope}
            hasPolygon={layout.shape === "polygon" && (layout.polygon?.length ?? 0) >= 3}
            zoom={zoom}
            onZoomDelta={adjustZoom}
            onZoomReset={() => adjustZoom(0, { reset: true })}
            onFitView={fitToView}
            shelfLabelOptions={shelfLabelOptions}
            onGoToShelf={goToShelf}
            zoomCategories={zoomCategories}
            onCategoryZoom={focusCanvasTarget}
            maxFixtures={layout.autoCalc?.maxFixtures}
            onGrowStore={growStoreEnvelope}
            showShelfLabelHint={!shelfLabelsVisible && shelfLabelOptions.length > 0}
          />
          ) : null}

          {!planogram3dReturn && (layout.validation?.aisleViolations || []).map((text) =>
            dismissedAlerts.has(`aisle:${text}`) ? null : (
              <AlertBanner
                key={text}
                variant="error"
                onDismiss={() => dismissAlert(`aisle:${text}`)}
              >
                {text}
              </AlertBanner>
            )
          )}
          {!planogram3dReturn && (layout.validation?.containmentViolations || []).length > 0 && !dismissedAlerts.has("containment") ? (
            <AlertBanner
              variant="error"
              className="alert-banner--clickable"
              onDismiss={() => dismissAlert("containment")}
              role="button"
              tabIndex={0}
              onClick={selectContainmentViolation}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") selectContainmentViolation();
              }}
            >
              {(layout.validation.containmentViolations || []).length} item(s) outside floor area — click to select
            </AlertBanner>
          ) : null}
          {!view3d && !planogram3dReturn && planogramCoverage?.missingCount > 0 && !dismissedAlerts.has("missing-products") ? (
            <AlertBanner
              variant="warning"
              role="button"
              style={{ cursor: "pointer" }}
              onDismiss={() => dismissAlert("missing-products")}
              onClick={() => setMissingProductsOpen(true)}
            >
              {planogramCoverage.missingCount} product{planogramCoverage.missingCount === 1 ? "" : "s"} not on shelves — view missing products
            </AlertBanner>
          ) : null}

          {genOpen ? (
            <SmartGeneratePanel
              open={genOpen}
              onClose={() => setGenOpen(false)}
              minAisleWidth={genMinAisle}
              onMinAisleWidthChange={setGenMinAisle}
              orientation={genOrientation}
              onOrientationChange={setGenOrientation}
              categoryMix={categoryMix}
              onCategoryMixChange={setCategoryMix}
              fillPlanogram={genFillPlanogram}
              onFillPlanogramChange={setGenFillPlanogram}
              onGenerate={() => runGenerate()}
              generating={generating}
              disabled={editDisabled}
              lastGenStats={lastGenStats}
              categories={categories}
              fixtureTypes={fixtureTypes}
            />
          ) : null}

          <div className={`canvas-stage${view3d ? " canvas-stage--3d" : ""}`} ref={stageRef}>
            {!view3d && selectionInfo ? (
              <div className="selection-bar selection-bar--overlay">
                <span className="selection-bar-kind">{selectionInfo.kind}</span>
                <span className="selection-bar-label">{selectionInfo.label}</span>
                {selectionInfo.shelfType ? (
                  <span className="selection-bar-type">{selectionInfo.shelfType}</span>
                ) : null}
                {selectionInfo.detail ? (
                  <span className="selection-bar-dim mono">{selectionInfo.detail}</span>
                ) : null}
                <span className="selection-bar-spacer" aria-hidden />
                <div className="selection-bar-actions">
                  <button
                    type="button"
                    className="editor-canvas-chip"
                    onClick={() => setSelection(null)}
                  >
                    Deselect
                  </button>
                  <button
                    type="button"
                    className="editor-canvas-chip editor-canvas-chip--danger"
                    disabled={editDisabled}
                    onClick={() => deleteSelection()}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : null}
            <div className={`canvas-stage-inner${view3d ? " canvas-stage-inner--3d" : ""}`}>
            {view3d ? (
              <div className="scene3d-wrap">
                {planogram3dReturn ? (
                  <div className="scene3d-focus-bar">
                    <div className="scene3d-focus-bar-main">
                      <strong>Shelf view</strong>
                      {scene3dDimensionLabels?.rack ? (
                        <span className="mono scene3d-dimension-chip">{scene3dDimensionLabels.rack}</span>
                      ) : null}
                    </div>
                    <div className="scene3d-focus-bar-actions">
                      <button type="button" className="btn-primary scene3d-focus-btn" onClick={backToPlanogramFrom3d}>
                        Back to planogram
                      </button>
                      <button type="button" className="btn-secondary scene3d-focus-btn" onClick={exit3dView}>
                        Close
                      </button>
                    </div>
                  </div>
                ) : null}
                <Scene3D
                  layout={layout}
                  products={products}
                  walkMode={walkMode}
                  highlightShelfId={highlightShelf3d?.shelfId}
                  highlightPairId={highlightShelf3d?.pairId}
                  highlightFaceId={selection?.faceId || "A"}
                  focusPhysicalShelfId={planogram3dReturn?.shelfId || null}
                  shelfFocusMode={Boolean(planogram3dReturn)}
                  focusRequest={focus3dRequest}
                  contentRevision={layout.contentRevision}
                />
                {walkMode ? (
                  <div className="canvas-hint canvas-hint--overlay">
                    Click canvas · WASD · Esc to release
                  </div>
                ) : null}
              </div>
            ) : useWebGlFloor ? (
              <FloorPlan2D
                layout={layout}
                scale={scale}
                previewFixturePolygon={previewFixturePolygon}
                selection={selection}
                setSelection={setSelection}
                onSelectShelf={selectShelf}
                paletteTool={paletteTool}
                editDisabled={editDisabled}
                dragPos={dragPos}
                setDragging={setDragging}
                onDropTool={onDropTool}
                onPlaceClick={onPlaceClick}
                onResize={resizeEntity}
                onRotateShelf={(id, deg) => rotateShelf(id, deg)}
                categories={categories}
                products={products}
                draftPolygon={draftPolygon}
                onDrawVertex={(x, y) => setDraftPolygon((pts) => [...pts, { x, y }])}
                onDraftPolygonChange={setDraftPolygon}
                onCloseDraw={() => applyArea()}
                onPolygonChange={(polygon) => savePolygon(polygon)}
                onPolygonPreviewChange={handlePolygonPreview}
              />
            ) : (
              <Canvas2D
                layout={layout}
                scale={scale}
                previewFixturePolygon={previewFixturePolygon}
                fixtureTypeKeys={fixtureTypeKeys}
                selection={selection}
                setSelection={setSelection}
                onSelectShelf={selectShelf}
                paletteTool={paletteTool}
                editDisabled={editDisabled}
                dragPos={dragPos}
                setDragging={setDragging}
                onDropTool={onDropTool}
                onPlaceClick={onPlaceClick}
                onResize={resizeEntity}
                onRotateShelf={(id, deg) => rotateShelf(id, deg)}
                categories={categories}
                products={products}
                draftPolygon={draftPolygon}
                onDrawVertex={(x, y) => setDraftPolygon((pts) => [...pts, { x, y }])}
                onDraftPolygonChange={setDraftPolygon}
                onCloseDraw={() => applyArea()}
                onPolygonChange={(polygon) => savePolygon(polygon)}
                onPolygonPreviewChange={handlePolygonPreview}
              />
            )}
            </div>
          </div>
        </div>
      </div>

      <PlanogramEditorModal
        open={!!planogramEditor}
        shelfId={planogramEditor?.shelfId}
        initialFaceId={planogramEditor?.faceId || "A"}
        layout={layout}
        token={token}
        products={products}
        categories={categories}
        editDisabled={editDisabled}
        onClose={() => setPlanogramEditor(null)}
        onLayoutUpdated={setLayout}
        onPatchShelf={patchShelf}
        toast={toast}
        planogramCoverage={planogramCoverage}
        coverageLoading={coverageLoading}
        onRefreshCoverage={refreshPlanogramCoverage}
        fixtureTypes={fixtureTypes}
        onMapShelf={(id, cat, color, faceId) => mapShelf(id, cat, color, faceId).catch((e) => notifyError(e))}
        onDeleteShelf={async () => {
          await deleteSelection();
          setPlanogramEditor(null);
        }}
        onViewIn3d={(id, faceId) => viewShelfIn3d(id, faceId)}
      />

      <MissingProductsDialog
        open={missingProductsOpen}
        onClose={() => setMissingProductsOpen(false)}
        coverage={planogramCoverage}
        loading={coverageLoading}
        onRefresh={refreshPlanogramCoverage}
        categories={categories}
      />
    </section>
  );
}
