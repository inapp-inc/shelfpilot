import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import AlertBanner from "../components/AlertBanner.jsx";
import { FIXTURE_TYPES } from "../referenceCatalog.js";
import { categoryLabel } from "../catalog/buildCategoryTree.js";
import { filterProductsForShelf } from "./categoryFilter.js";
import { friendlyError } from "../validationMessages.js";
import MissingProductsPanel from "./MissingProductsPanel.jsx";
import SearchableSelect from "../components/SearchableSelect.jsx";
import ShelfPlanogramConfig from "./ShelfPlanogramConfig.jsx";
import { MISSING_PRODUCT_MIME, parseMissingProduct } from "./missingProductDrag.js";

const TEMPERATURE_ZONES = {
  ambient: { emoji: "🌡️", label: "Ambient" },
  chilled: { emoji: "🧊", label: "Chilled" },
  frozen: { emoji: "❄️", label: "Frozen" },
};
import { isDoubleSided, isPairedShelf, merchandisingFaceId, normalizeShelfUI, planogramEditorFaceId, resolveGondolaForEditor, shelfCanvasFaceLabel, shelfFaceDisplayLabel, shelfDisplayLabel } from "./shelfFaces.js";
import {
  buildEqualSegmentsClient,
  defaultSegmentId,
  defaultSegmentIdForLevel,
  effectiveSegmentsForLevel,
  levelDisplayLabel,
  mergeAllSegments,
  orphanPlacementsForLevel,
  placementInCell,
  positionDisplayLabel,
  resizeDivider,
  shelfLevels,
} from "./planogramSegments.js";
import { formatInchesFromMeters, formatDimensionTripleInches } from "../units.js";
import { levelClearanceMeters } from "../scene3dDimensions.js";
import { catalogProductDimensionsInches } from "../catalog/productDimensions.js";
import { resolveCategoryStorageType, storageTypeLabel } from "../storageType.js";
import { weightWarningMessage } from "../shelfLoad.js";

function activeFace(shelf, faceId) {
  if (!shelf?.faces?.length) {
    return { id: "A", categoryId: shelf?.categoryId, planogram: shelf?.planogram || [] };
  }
  return shelf.faces.find((f) => f.id === faceId) || shelf.faces[0];
}

/** Tooltip for the left gutter height — board position, not capacity. */
function levelGutterTooltip(level, levels, shelfHeightMeters) {
  if (level?.heightFromFloorMeters == null) return "Shelf level";
  const fromFloor = formatInchesFromMeters(level.heightFromFloorMeters);
  const clearAbove = formatInchesFromMeters(levelClearanceMeters(level, levels, shelfHeightMeters));
  return (
    `Height from floor: ${fromFloor}\n` +
    `Where the Level ${(level.levelIndex ?? 0) + 1} shelf board sits (not product capacity).\n` +
    `Clear space above this board for products: about ${clearAbove}.`
  );
}

/** Visual level × bay planogram editor with draggable dividers. */
export default function PlanogramEditorModal({
  open,
  shelfId,
  initialFaceId = "A",
  layout,
  token,
  products,
  categories,
  editDisabled,
  onClose,
  onLayoutUpdated,
  onPatchShelf,
  toast,
  planogramCoverage,
  coverageLoading,
  onRefreshCoverage,
  fixtureTypes = [],
  onMapShelf,
  onDeleteShelf,
  onViewIn3d,
  onOpenAisleShelfView,
}) {
  const [faceId, setFaceId] = useState(initialFaceId);
  const [addCell, setAddCell] = useState(null);
  const [editPlacement, setEditPlacement] = useState(null);
  const [productId, setProductId] = useState("");
  const [facings, setFacings] = useState("");
  const [depthFacings, setDepthFacings] = useState("");
  const [stackLayers, setStackLayers] = useState("");
  const [preview, setPreview] = useState(null);
  const [dragDivider, setDragDivider] = useState(null);
  const [draftSegmentsByLevel, setDraftSegmentsByLevel] = useState({});
  const [selectedLevelIndex, setSelectedLevelIndex] = useState(0);
  const [dismissedFillWarning, setDismissedFillWarning] = useState(false);
  const [cellDropTarget, setCellDropTarget] = useState(null);
  const [sidebarTab, setSidebarTab] = useState("missing");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const gridRef = useRef(null);
  const addPanelRef = useRef(null);
  const draftRef = useRef(null);
  const dragLevelRef = useRef(null);

  const gondolaCtx = useMemo(
    () => (open && shelfId && layout ? resolveGondolaForEditor(layout, shelfId) : null),
    [open, shelfId, layout]
  );
  const shelfRaw = useMemo(() => {
    if (!gondolaCtx) return null;
    const shelves = layout?.shelves || layout?.fixtures || [];
    return shelves.find((s) => s.id === shelfId) || null;
  }, [gondolaCtx, layout, shelfId]);
  const shelf = gondolaCtx?.shelf ?? (shelfRaw ? normalizeShelfUI(shelfRaw) : null);
  const dualFace = shelf ? isDoubleSided(shelf) : false;
  const activePhysicalId = shelfId;
  const activeApiFaceId = shelfRaw ? planogramEditorFaceId(shelfRaw, faceId) : faceId;
  const face = shelf ? activeFace(shelf, faceId) : null;
  const faceCategory = face?.categoryId || null;
  const levels = shelf ? shelfLevels(shelf) : [];
  const levelsDesc = useMemo(() => [...levels].reverse(), [levels]);
  const usable = Number(shelf?.usableWidthMeters ?? shelf?.widthMeters) || 1.2;

  const segmentsForLevel = useCallback(
    (levelIndex) => {
      const key = String(levelIndex);
      if (draftSegmentsByLevel[key]) return draftSegmentsByLevel[key];
      return effectiveSegmentsForLevel(shelf, faceId, levelIndex);
    },
    [draftSegmentsByLevel, shelf, faceId]
  );
  const typeLabel = (FIXTURE_TYPES[shelf?.type] || FIXTURE_TYPES.shelf)?.label || shelf?.type || "Shelf";
  const productList = faceCategory ? filterProductsForShelf(products, faceCategory, categories) : [];
  const productSelectOptions = useMemo(
    () =>
      productList.map((p) => ({
        value: p.id,
        label: `${p.name || p.id}${p.sku ? ` (${p.sku})` : ""}`,
        searchText: [p.sku, p.id, p.name].filter(Boolean).join(" "),
      })),
    [productList]
  );
  const planogram = face?.planogram || [];

  const missingCount =
    planogramCoverage?.missingCount ??
    planogramCoverage?.missingProducts?.length ??
    0;

  useEffect(() => {
    if (open) {
      const shelves = layout?.shelves || layout?.fixtures || [];
      const phys = shelves.find((s) => s.id === shelfId);
      const editorFace =
        phys && isPairedShelf(phys) && !phys.pairDisplay
          ? "A"
          : initialFaceId === "B"
            ? "B"
            : "A";
      setFaceId(editorFace);
      setAddCell(null);
      setEditPlacement(null);
      setDraftSegmentsByLevel({});
      setSelectedLevelIndex(0);
      setDismissedFillWarning(false);
      setSidebarTab("missing");
    }
  }, [open, shelfId, initialFaceId, layout?.shelves, layout?.fixtures]);

  useEffect(() => {
    if (levelsDesc.length) {
      setSelectedLevelIndex((prev) =>
        levelsDesc.some((lv) => (lv.levelIndex ?? 0) === prev) ? prev : (levelsDesc[0].levelIndex ?? 0)
      );
    }
  }, [levelsDesc, shelf?.id]);

  useEffect(() => {
    setProductId("");
    setFacings("");
    setDepthFacings("");
    setPreview(null);
    setAddCell(null);
    setEditPlacement(null);
    setDraftSegmentsByLevel({});
    draftRef.current = null;
    dragLevelRef.current = null;
  }, [faceId, faceCategory]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    setPreview(null);
    if (!productId || !token || !shelf || !faceCategory) return;
    const levelIndex = addCell?.levelIndex ?? editPlacement?.levelIndex ?? selectedLevelIndex;
    const segmentId =
      addCell?.segmentId ||
      editPlacement?.segmentId ||
      defaultSegmentIdForLevel(shelf, faceId, levelIndex);
    const previewBody = {
      shelfId: activePhysicalId,
      productId,
      levelIndex: addCell?.levelIndex ?? editPlacement?.levelIndex ?? selectedLevelIndex,
      faceId: activeApiFaceId,
    };
    if (segmentId && segmentId !== "implicit") previewBody.segmentId = segmentId;
    api(`/layouts/${layout.id}/planogram/preview`, {
      token,
      method: "POST",
      body: previewBody,
    })
      .then((p) => {
        setPreview(p);
        if (!editPlacement) {
          setFacings(String(p.maxFacings));
          setDepthFacings(String(p.maxDepthFacings ?? 1));
        }
      })
      .catch((e) => toast?.(e.message));
  }, [productId, addCell, editPlacement, selectedLevelIndex, activePhysicalId, activeApiFaceId, faceCategory, layout?.id, token, shelf, faceId]);

  const applySegments = useCallback(
    async (levelIndex, nextSegments) => {
      if (!shelf || editDisabled) return;
      const orphans = orphanPlacementsForLevel(planogram, nextSegments, levelIndex);
      if (orphans.length) {
        const ok = window.confirm(
          `Re-splitting ${levelDisplayLabel(levelIndex)} will remove ${orphans.length} product placement(s) tied to old positions. Continue?`
        );
        if (!ok) return;
        for (const p of orphans) {
          await api(`/layouts/${layout.id}/shelves/${activePhysicalId}/planogram/${p.id}`, {
            token,
            method: "DELETE",
          });
        }
      }
      const updated = await onPatchShelf(activePhysicalId, {
        segments: nextSegments,
        faceId: activeApiFaceId,
        levelIndex,
      });
      onLayoutUpdated?.(updated);
      setDraftSegmentsByLevel((prev) => {
        const next = { ...prev };
        delete next[String(levelIndex)];
        return next;
      });
      draftRef.current = null;
      dragLevelRef.current = null;
    },
    [shelf, editDisabled, planogram, layout?.id, token, onPatchShelf, onLayoutUpdated, activePhysicalId, activeApiFaceId]
  );

  const onDividerPointerDown = (levelIndex, idx, e) => {
    if (editDisabled) return;
    e.preventDefault();
    dragLevelRef.current = levelIndex;
    setDragDivider(idx);
    setSelectedLevelIndex(levelIndex);
  };

  useEffect(() => {
    if (dragDivider == null) return;

    const onMove = (e) => {
      const grid = gridRef.current;
      const levelIndex = dragLevelRef.current;
      if (!grid || !shelf || levelIndex == null) return;
      const gutter = 72;
      const rect = grid.getBoundingClientRect();
      const cellsWidth = Math.max(1, rect.width - gutter);
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left - gutter) / cellsWidth));
      const boundary = ratio * usable;
      const base = draftRef.current || effectiveSegmentsForLevel(shelf, faceId, levelIndex);
      const next = resizeDivider(base, dragDivider, boundary, usable);
      draftRef.current = next;
      setDraftSegmentsByLevel((prev) => ({ ...prev, [String(levelIndex)]: next }));
    };

    const onUp = () => {
      const pending = draftRef.current;
      const levelIndex = dragLevelRef.current;
      setDragDivider(null);
      dragLevelRef.current = null;
      if (pending != null && levelIndex != null) {
        applySegments(levelIndex, pending).catch((err) => toast?.(friendlyError(err, "Could not update positions.")));
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragDivider, usable, shelf, applySegments, toast, faceId]);

  async function savePlacement({ replaceId } = {}) {
    if (!productId || !shelf) return;
    const levelIndex = addCell?.levelIndex ?? editPlacement?.levelIndex ?? 0;
    const segmentId = addCell?.segmentId ?? editPlacement?.segmentId ?? defaultSegmentId(shelf, faceId);
    const body = {
      productId,
      levelIndex,
      faceId: activeApiFaceId,
      facings: facings !== "" ? Number(facings) : undefined,
      depthFacings: depthFacings !== "" ? Number(depthFacings) : undefined,
      stackLayers: stackLayers !== "" ? Number(stackLayers) : undefined,
    };
    if (segmentId && segmentId !== "implicit") body.segmentId = segmentId;
    if (replaceId) {
      await api(`/layouts/${layout.id}/shelves/${activePhysicalId}/planogram/${replaceId}`, {
        token,
        method: "DELETE",
      });
    }
    const updated = await api(`/layouts/${layout.id}/shelves/${activePhysicalId}/planogram`, {
      token,
      method: "POST",
      body,
    });
    onLayoutUpdated(updated);
    await onRefreshCoverage?.();
    setAddCell(null);
    setEditPlacement(null);
    const overload = weightWarningMessage(updated);
    if (overload) toast?.(overload, { type: "warning" });
    else toast?.(`Placed on level ${levelIndex}`);
  }

  async function placeProductOnCell(draggedProduct, levelIndex, segmentId) {
    if (editDisabled || !shelf || !faceCategory) {
      toast?.("Assign a category to this face first.", { type: "warning" });
      return;
    }
    const productIdToPlace = draggedProduct?.productId;
    if (!productIdToPlace) return;

    const existing = placementInCell(planogram, { levelIndex, segmentId, shelf, faceId });
    if (existing && existing.productId !== productIdToPlace) {
      toast?.("Another product occupies this position — remove it first or click to edit.", { type: "warning" });
      return;
    }

    const segmentIdResolved = segmentId || defaultSegmentIdForLevel(shelf, faceId, levelIndex);
    try {
      const previewBody = {
        shelfId: activePhysicalId,
        productId: productIdToPlace,
        levelIndex,
        faceId: activeApiFaceId,
      };
      if (segmentIdResolved && segmentIdResolved !== "implicit") previewBody.segmentId = segmentIdResolved;

      const prev = await api(`/layouts/${layout.id}/planogram/preview`, {
        token,
        method: "POST",
        body: previewBody,
      });
      if ((prev.maxFacings ?? 0) < 1) {
        toast?.("Product does not fit in this position.", { type: "error" });
        return;
      }

      const body = existing
        ? {
            productId: productIdToPlace,
            levelIndex,
            faceId: activeApiFaceId,
            ...(segmentIdResolved && segmentIdResolved !== "implicit" ? { segmentId: segmentIdResolved } : {}),
          }
        : {
            productId: productIdToPlace,
            levelIndex,
            faceId: activeApiFaceId,
            facings: prev.maxFacings,
            depthFacings: prev.maxDepthFacings > 0 ? prev.maxDepthFacings : undefined,
            ...(segmentIdResolved && segmentIdResolved !== "implicit" ? { segmentId: segmentIdResolved } : {}),
          };

      const updated = await api(`/layouts/${layout.id}/shelves/${activePhysicalId}/planogram`, {
        token,
        method: "POST",
        body,
      });
      onLayoutUpdated(updated);
      await onRefreshCoverage?.();
      const name = draggedProduct.name || productIdToPlace;
      const stacked = Boolean(updated.stacked);
      const wide = existing?.facings ?? prev.maxFacings ?? 1;
      const deep = existing?.depthFacings ?? prev.maxDepthFacings ?? 1;
      const high = updated.stackLayers ?? existing?.stackLayers ?? 1;
      const units = wide * deep * high;
      const overload = weightWarningMessage(updated);
      if (overload) toast?.(overload, { type: "warning" });
      else if (stacked) {
        toast?.(
          `Stacked ${name} — ${high} high (${units} units on ${levelDisplayLabel(levelIndex)})`,
          { type: "success" }
        );
      } else {
        toast?.(`Placed ${name} on ${levelDisplayLabel(levelIndex)}`, { type: "success" });
      }
    } catch (err) {
      toast?.(friendlyError(err, "Could not place product in this position."), { type: "error" });
    }
  }

  function handleCellDragOver(e, levelIndex, segmentId) {
    if (editDisabled || !faceCategory) return;
    if (!e.dataTransfer.types.includes(MISSING_PRODUCT_MIME)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setCellDropTarget({ levelIndex, segmentId });
  }

  function handleCellDrop(e, levelIndex, segmentId) {
    const dragged = parseMissingProduct(e.dataTransfer.getData(MISSING_PRODUCT_MIME));
    if (!dragged) return;
    e.preventDefault();
    e.stopPropagation();
    setCellDropTarget(null);
    setSelectedLevelIndex(levelIndex);
    placeProductOnCell(dragged, levelIndex, segmentId);
  }

  async function handleAddToCell(levelIndex, segmentId) {
    if (editDisabled) return;
    if (!faceCategory) {
      toast?.("Assign a category to this face first.");
      return;
    }
    const existing = placementInCell(planogram, { levelIndex, segmentId, shelf, faceId });
    if (existing) {
      const prod = products.find((p) => p.id === existing.productId);
      setEditPlacement({
        ...existing,
        levelIndex,
        segmentId: segmentId || defaultSegmentId(shelf, faceId),
        productName: prod?.name,
      });
      setProductId(existing.productId);
      setFacings(String(existing.facings));
      setDepthFacings(String(existing.depthFacings ?? 1));
      setStackLayers(String(existing.stackLayers ?? 1));
      setAddCell(null);
      return;
    }
    setEditPlacement(null);
    setAddCell({ levelIndex, segmentId: segmentId || defaultSegmentId(shelf, faceId) });
    setProductId("");
    setFacings("");
    setDepthFacings("");
    setStackLayers("");
  }

  async function removePlacement(placementId) {
    const updated = await api(`/layouts/${layout.id}/shelves/${activePhysicalId}/planogram/${placementId}`, {
      token,
      method: "DELETE",
    });
    onLayoutUpdated(updated);
    setEditPlacement(null);
  }

  async function equalSplit(n) {
    if (editDisabled || !shelf) return;
    await applySegments(selectedLevelIndex, buildEqualSegmentsClient(usable, n));
  }

  async function mergeBays() {
    if (editDisabled || !shelf) return;
    await applySegments(selectedLevelIndex, mergeAllSegments(usable));
  }

  async function toggleFillMode(levelIndex, seg) {
    if (editDisabled || !shelf) return;
    const segs = segmentsForLevel(levelIndex);
    const next = segs.map((s) =>
      s.id === seg.id ? { ...s, fillMode: s.fillMode === "partial" ? "full" : "partial" } : s
    );
    await applySegments(levelIndex, next);
  }

  const summary = useMemo(() => {
    let warnings = 0;
    let bayCount = 0;
    for (const lv of levels) {
      const levelIndex = lv.levelIndex ?? 0;
      const segs = effectiveSegmentsForLevel(shelf, faceId, levelIndex);
      bayCount = Math.max(bayCount, segs.length);
      for (const seg of segs) {
        if (seg.fillMode !== "full") continue;
        const p = placementInCell(planogram, { levelIndex, segmentId: seg.id, shelf, faceId });
        if (p && p.maxFacings && p.facings < p.maxFacings - 0.5) warnings += 1;
      }
    }
    return {
      placements: planogram.length,
      warnings,
      maxBays: bayCount,
    };
  }, [levels, planogram, shelf, faceId]);

  const planogramTitle =
    shelfRaw && layout?.aisles
      ? shelfFaceDisplayLabel(shelfRaw, layout.aisles) || shelfDisplayLabel(shelfRaw, layout.aisles)
      : shelf
        ? shelfDisplayLabel(shelf, layout?.aisles)
        : "—";

  const faceLabel =
    shelfRaw && layout
      ? shelfFaceDisplayLabel(shelfRaw, layout.aisles) ||
        shelfCanvasFaceLabel(shelf, faceId, layout.aisles, layout.shelves) ||
        planogramTitle
      : planogramTitle;
  const heightM = Number(shelfRaw?.heightMeters ?? shelf?.heightMeters) || 2;
  const depthM = Number(shelfRaw?.depthMeters ?? shelf?.depthMeters) || 0.6;
  const zone = TEMPERATURE_ZONES[shelfRaw?.temperatureZone || "ambient"] || TEMPERATURE_ZONES.ambient;
  const mapTarget = { shelfId: activePhysicalId, faceId: activeApiFaceId };
  const pickerOpen = addCell || editPlacement;

  useEffect(() => {
    if (!open || !pickerOpen || !addPanelRef.current) return;
    requestAnimationFrame(() => {
      addPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [open, pickerOpen, addCell?.levelIndex, addCell?.segmentId, editPlacement?.id]);

  if (!open || !shelf) return null;

  return (
    <div
      className="modal-backdrop planogram-editor-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="planogram-editor-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="modal planogram-editor-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="planogram-editor-header">
          <div className="planogram-editor-header-main">
            <h2 id="planogram-editor-title" style={{ margin: 0, fontSize: 20 }}>
              {planogramTitle}
              {shelfRaw?.label ? (
                <span className="planogram-editor-shelf-name"> · {shelfRaw.label}</span>
              ) : null}
            </h2>
            <div className="planogram-editor-header-details">
              <span className="planogram-header-chip planogram-header-chip--primary mono">{faceLabel}</span>
              <span className="planogram-header-chip">{typeLabel}</span>
              <span className="planogram-header-chip">
                {zone.emoji} {zone.label}
              </span>
              <span className="planogram-header-chip mono">
                {formatDimensionTripleInches(usable, depthM, heightM)} (W × D × H)
              </span>
              <span className="planogram-header-chip">{levels.length} level{levels.length === 1 ? "" : "s"}</span>
              {faceCategory ? (
                <span className="planogram-header-chip cat-chip">{categoryLabel(categories, faceCategory)}</span>
              ) : (
                <span className="planogram-header-chip planogram-header-chip--warn">No category</span>
              )}
            </div>
          </div>
          <div className="planogram-editor-header-actions">
            {dualFace ? (
              <div className="merch-face-toggle">
                <button type="button" className={faceId === "A" ? "active" : ""} onClick={() => setFaceId("A")}>
                  Face A
                </button>
                <button type="button" className={faceId === "B" ? "active" : ""} onClick={() => setFaceId("B")}>
                  Face B
                </button>
              </div>
            ) : null}
            {onViewIn3d ? (
              <button
                type="button"
                className="btn-primary planogram-view-3d-btn"
                onClick={() => onViewIn3d(activePhysicalId, merchandisingFaceId(shelfRaw, faceId))}
              >
                View in 3D
              </button>
            ) : null}
            {onOpenAisleShelfView && shelfRaw?.aisleId ? (
              <button
                type="button"
                className="btn-secondary"
                data-testid="planogram-aisle-shelf-view"
                onClick={() => onOpenAisleShelfView(activePhysicalId)}
              >
                Aisle shelf view
              </button>
            ) : null}
            <button type="button" className="btn-secondary planogram-close-btn" onClick={() => onClose?.()}>
              Close
            </button>
          </div>
        </header>

        {!faceCategory ? (
          <div className="planogram-editor-empty muted">
            Assign a category in{" "}
            <button type="button" className="planogram-inline-link" onClick={() => setSidebarTab("settings")}>
              Shelf settings
            </button>{" "}
            for {faceLabel} before placing products.
          </div>
        ) : null}

        <div className="planogram-editor-body">
          <div className={`planogram-editor-main${pickerOpen ? " planogram-editor-main--picker-open" : ""}`}>
        <div className="planogram-editor-toolbar">
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
            Positions · {levelDisplayLabel(selectedLevelIndex)}
          </span>
          {!editDisabled ? (
            <>
              {[2, 3, 4].map((n) => (
                <button key={n} type="button" className="btn-secondary planogram-toolbar-btn" onClick={() => equalSplit(n).catch((e) => toast?.(friendlyError(e, "Could not split positions.")))}>
                  Split {n}
                </button>
              ))}
              <button type="button" className="btn-secondary planogram-toolbar-btn" onClick={() => mergeBays().catch((e) => toast?.(e.message))}>
                Merge level
              </button>
              <span className="muted" style={{ fontSize: 11 }}>
                Select a level row, then split · drag dividers on that level only
              </span>
            </>
          ) : (
            <span className="muted" style={{ fontSize: 11 }}>View only</span>
          )}
        </div>

        <div className="planogram-editor-grid-wrap" ref={gridRef}>
          {levelsDesc.map((lv) => {
            const levelIndex = lv.levelIndex ?? 0;
            const segments = segmentsForLevel(levelIndex);
            const levelSelected = selectedLevelIndex === levelIndex;
            return (
              <div key={levelIndex} className={`planogram-level-row${levelSelected ? " planogram-level-selected" : ""}`}>
                <div
                  className="planogram-level-gutter planogram-level-gutter-btn"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedLevelIndex(levelIndex)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedLevelIndex(levelIndex)}
                >
                  <span className="mono">{levelDisplayLabel(levelIndex)}</span>
                  {lv.heightFromFloorMeters != null ? (
                    <span
                      className="planogram-level-gutter-height muted"
                      title={levelGutterTooltip(lv, levels, heightM)}
                      aria-label={levelGutterTooltip(lv, levels, heightM).replace(/\n/g, ". ")}
                    >
                      <span className="mono planogram-level-gutter-height-value">
                        {formatInchesFromMeters(lv.heightFromFloorMeters)}
                      </span>
                      <span className="planogram-level-gutter-height-label">from floor</span>
                    </span>
                  ) : null}
                </div>
                <div className="planogram-level-stack">
                  {segments.length > 1 ? (
                    <div className="planogram-bay-headers planogram-bay-headers-inline">
                      {segments.map((seg, idx) => (
                        <div key={seg.id} className="planogram-bay-header" style={{ flex: `${seg.widthMeters} 0 0`, minWidth: `${Math.max(96, Math.round(seg.widthMeters * 88))}px` }}>
                          <span>{positionDisplayLabel(idx, seg.label)}</span>
                          <span className="mono muted">{formatInchesFromMeters(seg.widthMeters)}</span>
                          {!editDisabled && levelSelected ? (
                            <button
                              type="button"
                              className="planogram-fill-toggle"
                              title={seg.fillMode === "partial" ? "Partial fill" : "Full fill"}
                              onClick={() => toggleFillMode(levelIndex, seg).catch((e) => toast?.(e.message))}
                            >
                              {seg.fillMode === "partial" ? "Partial" : "Full"}
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="planogram-level-cells">
                    {segments.map((seg, segIdx) => {
                      const placement = placementInCell(planogram, {
                        levelIndex,
                        segmentId: seg.id,
                        shelf,
                        faceId,
                      });
                      const prod = placement ? products.find((p) => p.id === placement.productId) : null;
                      const fillPct =
                        placement?.maxFacings > 0
                          ? Math.min(100, (placement.facings / placement.maxFacings) * 100)
                          : 0;
                      const isPartial = seg.fillMode === "partial";
                      const isDropTarget =
                        cellDropTarget?.levelIndex === levelIndex && cellDropTarget?.segmentId === seg.id;
                      return (
                        <div
                          key={seg.id}
                          className={`planogram-cell${isPartial ? " segment-partial" : ""}${!placement ? " planogram-cell-empty" : ""}${isDropTarget ? " planogram-cell-drop-target" : ""}`}
                          style={{
                            flex: `${seg.widthMeters} 0 0`,
                            minWidth: `${Math.max(96, Math.round(seg.widthMeters * 88))}px`,
                          }}
                          onClick={() => {
                            setSelectedLevelIndex(levelIndex);
                            handleAddToCell(levelIndex, seg.id);
                          }}
                          onDragOver={(e) => handleCellDragOver(e, levelIndex, seg.id)}
                          onDragLeave={() => setCellDropTarget(null)}
                          onDrop={(e) => handleCellDrop(e, levelIndex, seg.id)}
                        >
                          {placement ? (
                            <div className="planogram-product-block">
                              <div className="planogram-product-name">{prod?.name || placement.productId}</div>
                              {prod ? (
                                <div
                                  className="mono planogram-product-dims"
                                  title={catalogProductDimensionsInches(prod).assumed ? "Estimated product size (W × H × D)" : "Product size (W × H × D)"}
                                >
                                  {catalogProductDimensionsInches(prod).label}
                                </div>
                              ) : null}
                              <div className="mono planogram-product-count">
                                {placement.facings} wide × {placement.depthFacings ?? 1} deep
                                {(placement.stackLayers ?? 1) > 1 ? ` × ${placement.stackLayers} high` : ""}
                                {" · "}
                                {(placement.facings || 0) * (placement.depthFacings ?? 1) * (placement.stackLayers ?? 1)}{" "}
                                units
                              </div>
                              <div className="planogram-fill-bar">
                                <div className="planogram-fill-bar-inner" style={{ width: `${fillPct}%` }} />
                              </div>
                              {!editDisabled ? (
                                <button
                                  type="button"
                                  className="planogram-cell-remove"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removePlacement(placement.id).catch((err) => toast?.(err.message));
                                  }}
                                >
                                  ×
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="planogram-cell-placeholder">
                              {editDisabled ? "—" : "+ Add"}
                            </span>
                          )}
                          {segIdx < segments.length - 1 && !editDisabled && levelSelected ? (
                            <div
                              className="planogram-divider-handle"
                              onPointerDown={(e) => onDividerPointerDown(levelIndex, segIdx, e)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {pickerOpen ? (
          <div className="planogram-add-panel" ref={addPanelRef}>
            <div className="section-label">
              {editPlacement ? "Edit placement" : `Add · Level ${addCell?.levelIndex}`}
            </div>
            <div className="planogram-add-fields">
              {faceCategory ? (
                <div className="planogram-add-storage-hint muted" style={{ gridColumn: "1 / -1", fontSize: 11.5 }}>
                  Products filtered to <strong>{storageTypeLabel(resolveCategoryStorageType(faceCategory, categories))}</strong> storage for this category.
                </div>
              ) : null}
              <label>
                Product
                <SearchableSelect
                  disabled={editDisabled || !!editPlacement}
                  value={productId}
                  onChange={setProductId}
                  options={productSelectOptions}
                  noneLabel="Select product"
                  placeholder="Type to search…"
                  emptyLabel="No matching products"
                  className="planogram-product-search"
                />
                {!productList.length && faceCategory ? (
                  <span className="muted" style={{ fontSize: 11 }}>
                    No matching products — set storage type on products in Catalog to match this category.
                  </span>
                ) : null}
              </label>
              <label>
                Front facings
                <input
                  className="mono"
                  type="number"
                  min="1"
                  disabled={editDisabled || !preview}
                  value={facings}
                  onChange={(e) => setFacings(e.target.value)}
                />
              </label>
              <label>
                Depth (backstock)
                <input
                  className="mono"
                  type="number"
                  min="1"
                  disabled={editDisabled || !preview}
                  value={depthFacings}
                  onChange={(e) => setDepthFacings(e.target.value)}
                />
              </label>
              <label>
                Stack (high)
                <input
                  className="mono"
                  type="number"
                  min="1"
                  disabled={editDisabled || !preview}
                  value={stackLayers}
                  onChange={(e) => setStackLayers(e.target.value)}
                />
              </label>
            </div>
            {productId ? (() => {
              const selected = productList.find((p) => p.id === productId) || products.find((p) => p.id === productId);
              if (!selected) return null;
              const dims = catalogProductDimensionsInches(selected);
              return (
                <div className="mono muted planogram-add-dims" style={{ fontSize: 11.5, marginBottom: 6 }}>
                  Product size: {dims.label}
                  {dims.assumed ? " (estimated)" : ""}
                </div>
              );
            })() : null}
            {preview ? (
              <div className="mono muted" style={{ fontSize: 11.5 }}>
                Max {preview.maxFacings} wide · {preview.maxDepthFacings ?? 1} deep · {preview.maxStackLayers ?? 1} high
              </div>
            ) : null}
            <div className="planogram-add-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={editDisabled || !productId}
                onClick={() =>
                  savePlacement(editPlacement ? { replaceId: editPlacement.id } : {}).catch((e) =>
                    toast?.(e.message)
                  )
                }
              >
                {editPlacement ? "Update" : "Add product"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setAddCell(null);
                  setEditPlacement(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {summary.warnings > 0 && !dismissedFillWarning ? (
          <AlertBanner variant="warning" onDismiss={() => setDismissedFillWarning(true)}>
            {summary.warnings} placement{summary.warnings === 1 ? "" : "s"} leave unused shelf width — add facings or adjust position splits.
          </AlertBanner>
        ) : null}

        <footer className="planogram-editor-footer mono muted">
          {levels.length} levels · up to {summary.maxBays} position{summary.maxBays === 1 ? "" : "s"} ·{" "}
          {summary.placements} placement{summary.placements === 1 ? "" : "s"}
          {summary.warnings > 0 ? ` · ${summary.warnings} fill gap warning(s)` : ""}
        </footer>
          </div>

          <aside
            className={`planogram-editor-sidebar${sidebarCollapsed ? " planogram-editor-sidebar--collapsed" : ""}`}
            aria-label="Shelf settings and missing products"
          >
            <button
              type="button"
              className="planogram-sidebar-collapse-btn"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? "Expand side panel" : "Collapse side panel"}
              title={sidebarCollapsed ? "Expand panel" : "Collapse panel — more room for planogram"}
            >
              {sidebarCollapsed ? "‹" : "›"}
            </button>

            {sidebarCollapsed ? (
              <div className="planogram-sidebar-rail">
                <button
                  type="button"
                  className={`planogram-sidebar-rail-btn${sidebarTab === "settings" ? " active" : ""}`}
                  title="Shelf settings"
                  onClick={() => {
                    setSidebarTab("settings");
                    setSidebarCollapsed(false);
                  }}
                >
                  <span aria-hidden>⚙</span>
                  <span className="planogram-sidebar-rail-label">Setup</span>
                </button>
                <button
                  type="button"
                  className={`planogram-sidebar-rail-btn${sidebarTab === "missing" ? " active" : ""}`}
                  title="Missing products"
                  onClick={() => {
                    setSidebarTab("missing");
                    setSidebarCollapsed(false);
                  }}
                >
                  <span aria-hidden>📦</span>
                  <span className="planogram-sidebar-rail-label">Missing</span>
                  {missingCount > 0 ? (
                    <span className="planogram-sidebar-rail-badge">{missingCount}</span>
                  ) : null}
                </button>
              </div>
            ) : (
              <>
            <nav className="planogram-sidebar-tabs" aria-label="Side panel tabs">
              <button
                type="button"
                className={`planogram-sidebar-tab${sidebarTab === "settings" ? " active" : ""}`}
                onClick={() => setSidebarTab("settings")}
              >
                Settings
              </button>
              <button
                type="button"
                className={`planogram-sidebar-tab${sidebarTab === "missing" ? " active" : ""}`}
                onClick={() => setSidebarTab("missing")}
              >
                Missing
                {missingCount > 0 ? (
                  <span className="planogram-sidebar-tab-badge">{missingCount}</span>
                ) : null}
              </button>
            </nav>

            <div
              className={`planogram-sidebar-panel${sidebarTab === "missing" ? " planogram-sidebar-panel--missing" : " planogram-sidebar-panel--settings"}`}
            >
              {sidebarTab === "settings" ? (
                <ShelfPlanogramConfig
                  shelfRaw={shelfRaw}
                  faceCategory={faceCategory}
                  faceId={faceId}
                  faceLabel={faceLabel}
                  levels={levels}
                  categories={categories}
                  products={products}
                  fixtureTypes={fixtureTypes}
                  editDisabled={editDisabled}
                  onPatchShelf={onPatchShelf}
                  onMapShelf={onMapShelf}
                  onDeleteShelf={onDeleteShelf}
                  mapTarget={mapTarget}
                  hideTitle
                  compact
                />
              ) : (
                <>
                  {!faceCategory ? (
                    <AlertBanner variant="warning" style={{ margin: "0 0 6px", flexShrink: 0 }}>
                      Assign a shelf category in <strong>Settings</strong> to place products on this shelf.
                    </AlertBanner>
                  ) : null}
                  <MissingProductsPanel
                    coverage={planogramCoverage}
                    loading={coverageLoading}
                    categories={categories}
                    alwaysShow
                    embedded
                    variant="sidebar"
                    compactSidebar
                    hierarchical
                    showCategoryFilter
                    onRefresh={onRefreshCoverage}
                    refreshLoading={coverageLoading}
                    maxProductsPerCategory={null}
                    draggable={!editDisabled && !!faceCategory}
                    editDisabled={editDisabled || !faceCategory}
                    hideDragHint
                  />
                </>
              )}
            </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
