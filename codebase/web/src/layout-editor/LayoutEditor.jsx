import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { FIXTURE_TYPES, VERTICALS, ZONE_TYPES } from "../referenceCatalog.js";
import Scene3D from "../Scene3D.jsx";
import Palette from "./Palette.jsx";
import Canvas2D from "./Canvas2D.jsx";
import SmartGeneratePanel from "./SmartGeneratePanel.jsx";
import EditorSideRail from "./EditorSideRail.jsx";
import { mixForVertical, mixFromCategories, storeTypeForVertical, withFixtureTypeDefaults } from "../storeTypes.js";
import { layoutCanvasBounds, pointInPolygon, entityFitsPolygon, entityPlacementValid, layoutStoreEnvelope, shelfLocalMeters, aisleFootprintMeters } from "./polygonCanvas.js";

const snap = (v) => Math.max(0, Math.round(v * 2) / 2);

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
  const [generating, setGenerating] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const stageRef = useRef(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const editDisabled = !["Designer", "Admin"].includes(role);
  const vMeta = VERTICALS[vertical] || VERTICALS.retail;
  const minAisle = config?.minAisleWidthMeters ?? vMeta.minAisle;

  const catSig = useMemo(() => (categories || []).map((c) => c.id).join("|"), [categories]);

  useEffect(() => {
    const mix = mixFromCategories(categories) || mixForVertical(vertical);
    setCategoryMix(withFixtureTypeDefaults(mix, categories));
    setGenMinAisle(String(config?.minAisleWidthMeters ?? vMeta.minAisle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout?.id, vertical, catSig, config?.minAisleWidthMeters, vMeta.minAisle]);

  const envelope = useMemo(
    () => (layout ? layoutStoreEnvelope(layout) : null),
    [layout]
  );

  const fixtureZoneSize = useMemo(() => {
    if (!layout?.polygon?.length || layout.polygon.length < 3) return null;
    const xs = layout.polygon.map((p) => p.x);
    const ys = layout.polygon.map((p) => p.y);
    return {
      w: Math.max(...xs) - Math.min(...xs),
      d: Math.max(...ys) - Math.min(...ys),
    };
  }, [layout?.polygon]);

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

  const canvasBounds = useMemo(
    () => (layout ? layoutCanvasBounds(layout) : { width: 10, height: 8 }),
    [layout]
  );

  const fitToView = useMemo(
    () => () => {
      const stage = stageRef.current;
      if (!stage || !layout) return;
      const pad = 40;
      const availW = Math.max(120, stage.clientWidth - pad * 2);
      const availH = Math.max(120, stage.clientHeight - pad * 2);
      const baseScale = Math.min(48, 640 / Math.max(canvasBounds.width, canvasBounds.height, 1));
      const fitScale = Math.min(availW / canvasBounds.width, availH / canvasBounds.height);
      const nextZoom = Math.min(5, Math.max(0.5, fitScale / baseScale));
      setZoom(Number(nextZoom.toFixed(2)));
      requestAnimationFrame(() => {
        stage.scrollLeft = 0;
        stage.scrollTop = 0;
      });
    },
    [layout, canvasBounds]
  );

  useEffect(() => {
    if (!layout?.id || view3d) return;
    const t = setTimeout(() => fitToView(), 80);
    return () => clearTimeout(t);
  }, [layout?.id, view3d, fitToView]);

  const scale = useMemo(() => {
    if (!layout) return 24;
    return Math.min(48, 640 / Math.max(canvasBounds.width, canvasBounds.height, 1)) * zoom;
  }, [layout, canvasBounds, zoom]);

  useEffect(() => {
    setSelection(null);
  }, [layout?.id]);

  const handleCanvasWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const stage = stageRef.current;
    const currentZoom = zoomRef.current;
    const step = e.deltaMode === 1 ? 0.35 : e.deltaMode === 2 ? 0.5 : 0.12;
    const delta = e.deltaY > 0 ? -step : step;
    const nextZoom = Math.min(5, Math.max(0.5, Number((currentZoom + delta).toFixed(2))));
    if (!stage || nextZoom === currentZoom) {
      setZoom(nextZoom);
      return;
    }
    const rect = stage.getBoundingClientRect();
    const pointerX = e.clientX - rect.left + stage.scrollLeft;
    const pointerY = e.clientY - rect.top + stage.scrollTop;
    const ratio = nextZoom / currentZoom;
    setZoom(nextZoom);
    requestAnimationFrame(() => {
      stage.scrollLeft = pointerX * ratio - (e.clientX - rect.left);
      stage.scrollTop = pointerY * ratio - (e.clientY - rect.top);
    });
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || view3d || !layout) return undefined;
    const onWheel = (e) => handleCanvasWheel(e);
    stage.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => stage.removeEventListener("wheel", onWheel, { capture: true });
  }, [view3d, layout?.id, handleCanvasWheel]);

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
    const t = FIXTURE_TYPES[type] || FIXTURE_TYPES.shelf;
    const tentative = {
      x,
      y,
      usableWidthMeters: t.w,
      widthMeters: t.w,
      depthMeters: t.d,
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
          type: FIXTURE_TYPES[type] ? type : "shelf",
          usableWidthMeters: t.w,
          widthMeters: t.w,
          depthMeters: t.d,
          heightMeters: 2,
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

  async function addAisle(x = 0.5, y = 0.5) {
    const tentative = {
      x,
      y,
      widthMeters: Math.max(0.8, minAisle - 0.1),
      orientation: "horizontal",
    };
    if (!entityPlacementValid(tentative, "aisle", canvasBounds, layout)) {
      toast("Aisles must be placed in open floor space — not on shelves.");
      return;
    }
    try {
      const updated = await api(`/layouts/${layout.id}/aisles`, {
        token,
        method: "POST",
        body: { name: "Aisle", widthMeters: Math.max(0.8, minAisle - 0.1), x, y },
      });
      setLayout(updated);
      setPaletteTool("select");
      toast("Aisle added");
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
    if (tool === "aisle") return addAisle(x, y);
    if (tool === "entry") return addEntry(x, y);
    if (typeof tool === "string" && tool.startsWith("zone:")) {
      return addZone(tool.slice("zone:".length), x, y);
    }
    if (FIXTURE_TYPES[tool]) return addShelf(tool, x, y);
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
    try {
      const env = layout.storeEnvelope || {
        x: 0,
        y: 0,
        widthMeters: layout.widthMeters,
        depthMeters: layout.depthMeters,
      };
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

  async function savePolygon(polygon) {
    if (!polygon?.length || polygon.length < 3) return;
    try {
      const updated = await api(`/layouts/${layout.id}`, {
        token,
        method: "PATCH",
        body: { shape: "polygon", polygon },
      });
      setLayout(updated);
      toast("Floor area updated");
    } catch (e) {
      toast(e.message === "invalid_polygon" ? "Invalid polygon shape." : e.message);
    }
  }

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
          const { w, d } = shelfLocalMeters(s);
          expandRect(Number(s.x) || 0, Number(s.y) || 0, w, d);
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
    const baseScale = Math.min(48, 640 / Math.max(canvasBounds.width, canvasBounds.height, 1));
    const fitScale = Math.min(availW / bw, availH / bh);
    const nextZoom = Math.min(5, Math.max(0.5, fitScale / baseScale));
    setZoom(Number(nextZoom.toFixed(2)));
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
      toast("Rejection comment is required.");
      return;
    }
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
      toast("Layout rejected");
    } catch (e) {
      toast(e.message === "review_comment_required" ? "Rejection comment is required." : e.message);
    } finally {
      setRejectSubmitting(false);
    }
  }

  async function runGenerate() {
    const hasPolygon = layout.shape === "polygon" && (layout.polygon?.length ?? 0) >= 3;
    if (!hasPolygon) {
      toast("Draw and apply a floor area first (3+ vertices), then Generate.");
      setPaletteTool("draw");
      return;
    }
    const hasContent = (layout.aisles || []).length > 0 || (layout.shelves || []).length > 0;
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
      const updated = await api(`/layouts/${layout.id}/autogenerate`, {
        token,
        method: "POST",
        body: {
          orientation: genOrientation,
          replaceExisting: true,
          minAisleWidthMeters: Number(genMinAisle) || minAisle,
          categoryMix: mixPayload,
        },
      });
      setLayout(updated);
      setGenOpen(false);
      const g = updated.generated || {};
      toast(
        `Generated ${g.shelves ?? 0} shelves · ${g.aisles ?? 0} aisles${g.skippedOutsideCount ? ` (${g.skippedOutsideCount} slots skipped outside area)` : ""}`
      );
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
            ? "Aisles cannot overlap shelves."
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
      const num = s?.displayNumber != null ? `#${s.displayNumber}` : "";
      if (!s) return null;
      const uw = Number(s.usableWidthMeters ?? s.widthMeters) || 0;
      const dep = Number(s.depthMeters) || 0;
      const ht = Number(s.heightMeters) || 0;
      const dim = `${uw.toFixed(1)}×${dep.toFixed(1)}×${ht.toFixed(1)} m`;
      return { kind: "shelf", id, label: `Shelf ${num}`.trim(), detail: dim, run: () => deleteShelf(id) };
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
  }, [selection, layout]);

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
    <section className="fade editor-layout-root">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button className="btn-secondary" style={{ border: "none", background: "none", color: "#6b7280" }} onClick={onBack}>
            ← Layouts
          </button>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{layout.name}</div>
          <span
            className="status-chip"
            style={{ background: statusMeta(layout.status).bg, color: statusMeta(layout.status).color }}
          >
            {statusMeta(layout.status).label}
          </span>
          <span className="catalog-vertical-badge">
            {storeTypeForVertical(vertical)?.emoji} {(VERTICALS[vertical] || VERTICALS.retail).label}
          </span>
          {!view3d && zoomCategories.length > 0 ? (
            <select
              className="category-zoom-select"
              defaultValue=""
              title="Zoom canvas to a category"
              onChange={(e) => {
                const v = e.target.value;
                e.target.value = "";
                if (v) focusCanvasTarget(v);
              }}
            >
              <option value="">Category zoom…</option>
              <option value="__selection__">Current selection</option>
              {zoomCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {canApproveReject ? (
            <>
              <button
                className="btn-secondary"
                style={{ padding: "9px 14px", color: "#A30A2A", fontWeight: 700 }}
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </button>
              <button
                className="btn-primary"
                style={{ padding: "9px 14px", background: "oklch(0.5 0.12 150)", boxShadow: "none" }}
                onClick={() => approveLayout()}
              >
                Approve
              </button>
            </>
          ) : null}
          {canSubmitReview ? (
            <button
              className="btn-secondary"
              style={{ padding: "9px 14px" }}
              onClick={() => submitForReview()}
            >
              Submit for review
            </button>
          ) : null}
          {(role === "Designer" || role === "Admin") && onDeleteLayout ? (
            <button
              className="btn-danger"
              style={{ padding: "9px 14px" }}
              onClick={() => onDeleteLayout(layout)}
            >
              Delete layout
            </button>
          ) : null}
          <div className="mode-toggle">
            <button
              className={!view3d ? "active" : ""}
              onClick={() => {
                setView3d(false);
                setWalkMode(false);
              }}
            >
              2D
            </button>
            <button className={view3d && !walkMode ? "active" : ""} onClick={() => { setView3d(true); setWalkMode(false); }}>
              3D Orbit
            </button>
            <button className={view3d && walkMode ? "active" : ""} onClick={() => { setView3d(true); setWalkMode(true); }}>
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
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Describe what needs to change…"
              maxLength={2000}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button type="button" className="btn-secondary" onClick={() => setRejectOpen(false)}>
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

      <div className="editor-layout">
        <Palette
          paletteTool={paletteTool}
          setPaletteTool={setPaletteTool}
          editDisabled={editDisabled}
          minAisle={minAisle}
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

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div className="meter-bar">
            <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>
              {envelope
                ? `Store ${envelope.widthMeters.toFixed(1)}×${envelope.depthMeters.toFixed(1)} m`
                : `${layout.widthMeters.toFixed(1)}×${layout.depthMeters.toFixed(1)} m`}
              {fixtureZoneSize
                ? ` · Fixture zone ${fixtureZoneSize.w.toFixed(1)}×${fixtureZoneSize.d.toFixed(1)} m`
                : canvasBounds.strict
                  ? ` · ${canvasBounds.width.toFixed(1)}×${canvasBounds.height.toFixed(1)} m fixture zone`
                  : ""}
              {layout.shape === "polygon" ? " · polygon" : ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              {!view3d && zoomCategories.length > 0 ? (
                <select
                  className="category-zoom-select"
                  defaultValue=""
                  title="Zoom canvas to a category"
                  onChange={(e) => {
                    const v = e.target.value;
                    e.target.value = "";
                    if (v) focusCanvasTarget(v);
                  }}
                >
                  <option value="">Category zoom…</option>
                  <option value="__selection__">Current selection</option>
                  {zoomCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.id}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "6px 10px", fontSize: 12 }}
                onClick={() => fitToView()}
              >
                Fit view
              </button>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Max shelves</span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: "#A30A2A" }}>
                {layout.autoCalc?.maxFixtures ?? "—"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 10 }}>
                <button className="btn-secondary" style={{ width: 26, height: 26, padding: 0 }} onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}>
                  –
                </button>
                <span className="mono" style={{ fontSize: 11, color: "#9aa1ab", width: 40, textAlign: "center" }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button className="btn-secondary" style={{ width: 26, height: 26, padding: 0 }} onClick={() => setZoom((z) => Math.min(5, Number((z + 0.25).toFixed(2))))}>
                  +
                </button>
                <button
                  className="btn-secondary"
                  style={{ padding: "0 8px", height: 26, fontSize: 11 }}
                  onClick={() => setZoom(1)}
                  title="Reset zoom"
                >
                  Reset
                </button>
              </div>
              <button
                className="btn-secondary"
                style={{ padding: "6px 10px", fontSize: 12 }}
                disabled={editDisabled}
                onClick={() =>
                  patchLayout({
                    widthMeters: layout.widthMeters + 2,
                    depthMeters: layout.depthMeters + 2,
                    storeEnvelope: {
                      ...(layout.storeEnvelope || { x: 0, y: 0 }),
                      widthMeters: (layout.storeEnvelope?.widthMeters ?? layout.widthMeters) + 2,
                      depthMeters: (layout.storeEnvelope?.depthMeters ?? layout.depthMeters) + 2,
                    },
                  }).then(() => {
                    toast("Store envelope expanded");
                    fitToView();
                  })
                }
              >
                Grow +2m
              </button>
            </div>
          </div>

          {(layout.validation?.aisleViolations || []).map((text) => (
            <div key={text} className="violation">
              <span className="bang">!</span>
              <span>{text}</span>
            </div>
          ))}
          {(layout.validation?.containmentViolations || []).length > 0 ? (
            <div className="violation violation-clickable" role="button" tabIndex={0} onClick={() => selectContainmentViolation()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") selectContainmentViolation(); }}>
              <span className="bang">!</span>
              <span>
                {(layout.validation.containmentViolations || []).length} item(s) outside floor area — click to select
              </span>
            </div>
          ) : null}
          {!view3d && paletteTool === "edit-area" ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(14,165,233,0.08)",
                border: "1px solid rgba(14,165,233,0.25)",
                fontSize: 12.5,
                color: "#0369a1",
              }}
            >
              Drag polygon vertices to reshape the fixture zone · changes save automatically
            </div>
          ) : null}
          {!view3d && paletteTool === "draw" ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(14,165,233,0.08)",
                border: "1px solid rgba(14,165,233,0.25)",
                fontSize: 12.5,
                color: "#0369a1",
              }}
            >
              Click to add vertices · drag blue handles to adjust · need 3+ points · then{" "}
              <strong>Apply area</strong>
            </div>
          ) : null}
          {!view3d && layout.shape === "polygon" && fixtureZoneSize && envelope ? (
            Math.abs(envelope.widthMeters - fixtureZoneSize.w) < 0.6 &&
            Math.abs(envelope.depthMeters - fixtureZoneSize.d) < 0.6 ? (
              <div className="muted" style={{ fontSize: 12, padding: "0 2px" }}>
                Store envelope matches the fixture zone — use <strong>Grow +2m</strong> to expand the outer
                boundary, then draw/apply a smaller polygon inside it.
              </div>
            ) : null
          ) : null}
          {!view3d && layout.shape !== "polygon" && !editDisabled ? (
            <div className="muted" style={{ fontSize: 12, padding: "0 2px" }}>
              Tip: use <strong>Draw area</strong> to define an irregular store shape before Generate.
            </div>
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
              onGenerate={() => runGenerate()}
              generating={generating}
              disabled={editDisabled}
            />
          ) : null}

          {!view3d && selectionInfo ? (
            <div className="selection-bar">
              <span className="selection-bar-kind">{selectionInfo.kind}</span>
              <span className="selection-bar-label">{selectionInfo.label}</span>
              {selectionInfo.detail ? (
                <span className="selection-bar-dim mono">{selectionInfo.detail}</span>
              ) : null}
              <span className="selection-bar-hint">Press Del to remove</span>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "6px 12px", fontSize: 12 }}
                onClick={() => setSelection(null)}
              >
                Deselect
              </button>
              <button
                type="button"
                className="btn-danger"
                style={{ padding: "6px 12px", fontSize: 12 }}
                disabled={editDisabled}
                onClick={() => deleteSelection()}
              >
                Delete
              </button>
            </div>
          ) : null}

          <div className="canvas-stage" ref={stageRef}>
            {view3d ? (
              <div style={{ width: "100%", height: "100%", minHeight: 420 }}>
                <Scene3D layout={layout} products={products} walkMode={walkMode} />
                {walkMode ? (
                  <div className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: "center" }}>
                    Click canvas to start · WASD walk · mouse look · Esc to release
                  </div>
                ) : (
                  <div className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: "center" }}>
                    Scroll zoom · drag orbit · right-drag pan · view stays inside store
                  </div>
                )}
              </div>
            ) : (
              <Canvas2D
                layout={layout}
                scale={scale}
                selection={selection}
                setSelection={setSelection}
                paletteTool={paletteTool}
                editDisabled={editDisabled}
                dragPos={dragPos}
                setDragging={setDragging}
                onDropTool={onDropTool}
                onPlaceClick={onPlaceClick}
                onResize={resizeEntity}
                onRotateShelf={(id, deg) => rotateShelf(id, deg)}
                onWheelZoom={handleCanvasWheel}
                categories={categories}
                draftPolygon={draftPolygon}
                onDrawVertex={(x, y) => setDraftPolygon((pts) => [...pts, { x, y }])}
                onDraftPolygonChange={setDraftPolygon}
                onPolygonChange={(polygon) => savePolygon(polygon)}
              />
            )}
          </div>
        </div>

        <EditorSideRail
          selection={selection}
          layout={layout}
          editDisabled={editDisabled}
          minAisle={minAisle}
          verticalLabel={vMeta.label}
          categories={categories}
          products={products}
          token={token}
          onPatchAisle={(id, body) => patchAisle(id, body).catch((e) => toast(e.message))}
          onPatchShelf={(id, body) => patchShelf(id, body).catch((e) => toast(e.message))}
          onDeleteAisle={() => deleteSelection()}
          onDeleteShelf={() => deleteSelection()}
          onMapAisle={(id, cat, color) => mapAisle(id, cat, color).catch((e) => toast(e.message))}
          onMapShelf={(id, cat, color) => mapShelf(id, cat, color).catch((e) => toast(e.message))}
          onLayoutUpdated={setLayout}
          onQuickAddProduct={onQuickAddProduct}
          onPatchZone={(id, body) =>
            patchZone(id, body).catch((e) =>
              toast(
                e.message === "zone_not_found"
                  ? "Zone was removed or is out of sync. Reselect the zone and try again."
                  : e.message
              )
            )
          }
          onSelectZone={(id) => setSelection({ kind: "zone", id })}
          onDeleteZone={(id) => deleteZone(id).catch((e) => toast(e.message))}
          onPatchEntry={(id, body) => patchEntry(id, body).catch((e) => toast(e.message))}
          onDeleteEntry={(id) => deleteEntry(id).catch((e) => toast(e.message))}
          onRefreshCatalog={onRefreshCatalog}
          toast={toast}
        />
      </div>
    </section>
  );
}
