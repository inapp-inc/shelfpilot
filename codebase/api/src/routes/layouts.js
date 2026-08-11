import { Router } from "express";
import { randomUUID } from "node:crypto";
import { repo, audit, getConfig, now } from "../store/sqlite.js";
import { authRequired, requireRoles } from "../middleware/auth.js";
import { computeAutoCalc, validateAisles } from "../services/layoutMath.js";
import { fixtureToShelf, normalizeLayout, nextDisplayNumber, shelfToFixture } from "../services/layoutNormalize.js";
import { clampFacings, clampDepthFacings, clampStackLayers, previewFacings } from "../services/planogramMath.js";
import {
  countGondolaUnits,
  faceCategoryId,
  facePlanogram,
  getFace,
  normalizeShelf,
  oppositeShelfOrigin,
  setFaceCategory,
  syncLegacyFromFaces,
} from "../services/shelfFaces.js";
import {
  assertInsideOrThrow,
  assertNoOverlapOrThrow,
  collectContainmentViolations,
  collectOverlapViolations,
  entityInsideLayout,
  layoutBoundaryPolygon,
  maxLengthInsideX,
  maxLengthInsideY,
  validatePolygonRing,
} from "../services/polygonContainment.js";
import { normalizeEntryPoint, normalizeZone, normalizeZoneType } from "../services/zones.js";
import { normalizeObstacle, normalizeObstacleType } from "../services/obstacles.js";
import { normalizeFloorPlan, patchFloorPlan } from "../services/floorPlan.js";
import { floorPlanEnvelopeBinding, fullStorePolygon, inferFloorPlanSourceType } from "../services/floorPlanImport.js";
import { deleteFloorPlanImage, saveFloorPlanImage } from "../services/floorPlanImages.js";
import { autogenerateLayoutFixtures, clearArrangementAcceptance } from "../services/layoutAutogenerate.js";
import { computeShelfLoad } from "../services/weightMath.js";
import { packAislesAndShelves } from "../services/layoutPacker.js";
import { bindShelvesToAisles, finalizeAisleShelfBinding } from "../services/aisleBinding.js";
import { finalizeAisleLabeling } from "../services/aisleLabeling.js";
import { assignCategoryMix } from "../services/categoryMixPacker.js";
import { applyFixtureTypesToShelves } from "../services/categoryFixtureDefaults.js";
import { listCategoriesForLayout, productAllowedForShelf, resolveCategoryId } from "../services/categoryTree.js";
import { computeArrangementSummary } from "../services/arrangementSummary.js";
import { fillPlanogramsForLayout, loadProductsForLayoutVertical } from "../services/planogramAutoFill.js";
import { computePlanogramCoverage } from "../services/planogramCoverage.js";
import {
  SegmentError,
  getShelfSegment,
  normalizeFaceLevelSegments,
  normalizeRotationDeg,
  normalizeShelfFaceSegments,
} from "../services/shelfSegments.js";
import { isTemporaryStorageShelf, isTemporaryStorageType, temporaryStorageLabel } from "../services/temporaryStorage.js";
import { isSingleSidedPlacementType, warehouseFixtureLabel } from "../services/warehouseLayout.js";

export const layoutsRouter = Router();

function findPairMate(layout, shelf) {
  if (!shelf?.pairId) return null;
  return (layout.shelves || []).find((s) => s.pairId === shelf.pairId && s.id !== shelf.id) || null;
}

function syncPairMatePose(layout, shelf) {
  const mate = findPairMate(layout, shelf);
  if (!mate) return null;
  const w = Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 1.2;
  const d = Number(shelf.depthMeters) || 0.6;
  const opp = oppositeShelfOrigin(shelf.x, shelf.y, shelf.rotationDeg, w, d);
  mate.x = opp.x;
  mate.y = opp.y;
  mate.rotationDeg = opp.rotationDeg;
  mate.usableWidthMeters = w;
  mate.widthMeters = Number(shelf.widthMeters) || w;
  mate.depthMeters = d;
  if (shelf.heightMeters != null) mate.heightMeters = shelf.heightMeters;
  normalizeShelf(mate);
  return mate;
}

function planogramEnabled() {
  const raw = process.env.PLANOGRAM_EDITOR;
  if (raw == null || raw === "") return true;
  return raw !== "0" && String(raw).toLowerCase() !== "false";
}

/** Product allocation requires arrangement acceptance when fixtures exist. */
function arrangementGate(layout, res) {
  if (!(layout?.shelves || []).length) return true;
  if (layout.arrangementAcceptedAt) return true;
  res.status(409).json({ error: "arrangement_not_accepted" });
  return false;
}

function autogenerateEnabled() {
  const raw = process.env.LAYOUT_AUTOGENERATE;
  if (raw == null || raw === "") return true;
  return raw !== "0" && String(raw).toLowerCase() !== "false";
}

function refreshValidation(layout) {
  normalizeLayout(layout);
  const started = Date.now();
  const config = getConfig(layout.vertical);
  const aisleViolations = validateAisles(layout, config);
  const containmentViolations = collectContainmentViolations(layout);
  const overlapViolations = collectOverlapViolations(layout);
  layout.validation = { aisleViolations, containmentViolations, overlapViolations };
  layout.autoCalc = computeAutoCalc(layout, config);
  layout.autoCalc.durationMs = Date.now() - started;
  layout.updatedAt = now();
  console.log(
    JSON.stringify({
      event: "auto_calc",
      layoutId: layout.id,
      durationMs: layout.autoCalc.durationMs,
      maxFixtures: layout.autoCalc.maxFixtures,
    })
  );
  return layout;
}

function saveNormalized(layout, options = {}) {
  normalizeLayout(layout);
  if (!options.skipRevisionBump) {
    layout.contentRevision = (Number(layout.contentRevision) || 0) + 1;
  }
  refreshValidation(layout);
  repo.saveLayout(layout);
  return layout;
}

function containmentError(res, err) {
  if (err?.code === "containment_violation") {
    return res.status(400).json({ error: "containment_violation" });
  }
  if (err?.code === "overlap_violation") {
    return res.status(400).json({ error: "overlap_violation" });
  }
  if (err?.code === "obstacle_violation") {
    return res.status(400).json({ error: "obstacle_violation", obstacleId: err.obstacleId });
  }
  throw err;
}

layoutsRouter.get("/layouts", authRequired, (req, res) => {
  const items = repo.listLayouts(req.query.status || null);
  res.json({ items });
});

/** Decode base64 image payload and persist under layout id. Returns { fileName, url } or throws Error with .code. */
function persistFloorPlanUpload(layoutId, dataBase64, fileName) {
  const rawInput = String(dataBase64 || "");
  if (!rawInput) {
    const err = new Error("data_required");
    err.code = "data_required";
    throw err;
  }
  let buffer;
  try {
    const raw = rawInput.includes(",") ? rawInput.split(",").pop() : rawInput;
    buffer = Buffer.from(raw, "base64");
  } catch {
    const err = new Error("invalid_image_data");
    err.code = "invalid_image_data";
    throw err;
  }
  if (!buffer?.length) {
    const err = new Error("invalid_image_data");
    err.code = "invalid_image_data";
    throw err;
  }
  try {
    return saveFloorPlanImage(buffer, layoutId, fileName || "floor-plan.png");
  } catch {
    const err = new Error("invalid_image_file");
    err.code = "invalid_image_file";
    throw err;
  }
}

layoutsRouter.post("/layouts", authRequired, requireRoles("Designer", "Admin"), (req, res) => {
  const {
    name,
    vertical,
    widthMeters,
    depthMeters,
    heightMeters,
    shape,
    polygon,
    floorPlan,
    floorPlanImport,
    autoGenerateFixtures,
    categoryMix,
  } = req.body || {};
  if (!name || !vertical || widthMeters == null || depthMeters == null) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const poly = Array.isArray(polygon) ? polygon : [];
  const polyCheck = validatePolygonRing(poly);
  if (shape === "polygon" && poly.length > 0 && !polyCheck.ok) {
    return res.status(400).json({ error: polyCheck.error });
  }
  if (poly.length > 0 && !polyCheck.ok) {
    return res.status(400).json({ error: polyCheck.error });
  }
  const layout = {
    id: `lay-${randomUUID().slice(0, 8)}`,
    name,
    vertical: String(vertical).toLowerCase(),
    status: "draft",
    widthMeters: Number(widthMeters),
    depthMeters: Number(depthMeters),
    heightMeters: heightMeters != null ? Number(heightMeters) : 3,
    shape: shape || "rectangle",
    polygon: poly,
    storeEnvelope: {
      x: 0,
      y: 0,
      widthMeters: Number(widthMeters),
      depthMeters: Number(depthMeters),
    },
    contentRevision: 0,
    submittedRevision: null,
    reviewComment: null,
    reviewedAt: null,
    reviewedBy: null,
    lastSubmittedAt: null,
    aisles: [],
    shelves: [],
    fixtures: [],
    zones: [],
    entryPoints: [],
    mappings: [],
    aisleMappings: [],
    shelfMappings: [],
    validation: { aisleViolations: [] },
    floorPlan: null,
    updatedAt: now(),
  };

  // Build layout from analyzed floor-plan upload (dimensions only — no image underlay).
  const importMeta = floorPlanImport && typeof floorPlanImport === "object" ? floorPlanImport : null;
  let generatedFromImport = null;
  if (importMeta) {
    layout.shape = "polygon";
    layout.polygon = fullStorePolygon(layout.widthMeters, layout.depthMeters);
    layout.floorPlan = null;
    layout.importSource = {
      fileName: importMeta.sourceFileName || importMeta.fileName || "floor-plan",
      sourceType: inferFloorPlanSourceType(importMeta.sourceFileName, importMeta.sourceType),
      dimensionSource: importMeta.dimensionSource || "manual",
      matchedText: importMeta.matchedText || null,
      pageIndex: importMeta.pageIndex ?? 0,
    };
    if (autoGenerateFixtures !== false && autogenerateEnabled()) {
      try {
        generatedFromImport = autogenerateLayoutFixtures(
          layout,
          { categoryMix: Array.isArray(categoryMix) ? categoryMix : [], orientation: "auto" },
          { getConfig, listCategories: () => repo.listCategories() }
        );
        if (planogramEnabled()) {
          const { categories: fillCats, products: fillProducts } = loadProductsForLayoutVertical(
            layout.vertical,
            (v) => repo.listCategories(v),
            () => repo.listProducts()
          );
          const pogCount = fillPlanogramsForLayout(layout, fillProducts, fillCats);
          if (generatedFromImport && pogCount > 0) {
            generatedFromImport.planogramPlacements = pogCount;
          }
        }
      } catch (err) {
        if (err.code === "category_mix_invalid") {
          return res.status(400).json({ error: "category_mix_invalid", detail: "Percentages must sum to 100" });
        }
        throw err;
      }
    }
  }

  // Legacy: optional image underlay (deprecated — prefer floorPlanImport analyze-and-build).
  const fpPayload = !importMeta && floorPlan && typeof floorPlan === "object" ? floorPlan : null;
  const fpData = fpPayload?.dataBase64 || fpPayload?.data;
  if (fpData) {
    let saved;
    try {
      const rasterName =
        fpPayload.fileName ||
        (inferFloorPlanSourceType(fpPayload.sourceFileName, fpPayload.sourceType) === "pdf"
          ? "floor-plan-page1.png"
          : "floor-plan.png");
      saved = persistFloorPlanUpload(layout.id, fpData, rasterName);
    } catch (err) {
      return res.status(400).json({ error: err.code || err.message || "invalid_image_file" });
    }
    const binding = floorPlanEnvelopeBinding(layout, fpPayload);
    layout.widthMeters = binding.widthMeters;
    layout.depthMeters = binding.depthMeters;
    layout.storeEnvelope = {
      x: 0,
      y: 0,
      widthMeters: binding.widthMeters,
      depthMeters: binding.depthMeters,
    };
    layout.shape = "polygon";
    layout.polygon = fullStorePolygon(binding.widthMeters, binding.depthMeters);
    layout.floorPlan = normalizeFloorPlan({
      url: saved.url,
      fileName: saved.fileName,
      sourceType: inferFloorPlanSourceType(fpPayload.sourceFileName || fpPayload.fileName, fpPayload.sourceType),
      sourceFileName: fpPayload.sourceFileName || fpPayload.fileName || saved.fileName,
      pageIndex: fpPayload.pageIndex ?? 0,
      x: binding.x,
      y: binding.y,
      widthMeters: binding.widthMeters,
      depthMeters: binding.depthMeters,
      opacity: fpPayload.opacity ?? 0.75,
      visible: true,
    });
  }

  saveNormalized(layout, { skipRevisionBump: true });
  const auditAction = importMeta
    ? "layout.create.from_floorplan_import"
    : layout.floorPlan
      ? "layout.create.with_floorplan"
      : "layout.create";
  audit(req.user.email, auditAction, layout.id);
  const response = { ...layout };
  if (generatedFromImport) {
    response.generated = {
      aisles: layout.aisles.length,
      shelves: layout.shelves.length,
      gondolaUnits: generatedFromImport.gondolaUnits,
      walkAisles: layout.aisles.length,
      categoryMapped: generatedFromImport.categoryMapped,
      skippedOutsideCount: generatedFromImport.skippedOutsideCount,
    };
  }
  res.status(201).json(response);
});

layoutsRouter.get("/layouts/:layoutId", authRequired, (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  normalizeLayout(layout);
  res.json(layout);
});

layoutsRouter.post(
  "/layouts/:layoutId/clone",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const source = repo.getLayout(req.params.layoutId);
    if (!source) return res.status(404).json({ error: "not_found" });
    const name =
      typeof req.body?.name === "string" && req.body.name.trim()
        ? req.body.name.trim().slice(0, 120)
        : `${source.name} (copy)`;
    const cloned = JSON.parse(JSON.stringify(source));
    cloned.id = `lay-${randomUUID().slice(0, 8)}`;
    cloned.name = name;
    cloned.status = "draft";
    cloned.contentRevision = 0;
    cloned.submittedRevision = null;
    cloned.reviewComment = null;
    cloned.reviewedAt = null;
    cloned.reviewedBy = null;
    cloned.lastSubmittedAt = null;
    cloned.updatedAt = now();
    saveNormalized(cloned, { skipRevisionBump: true });
    audit(req.user.email, "layout.clone", `${source.id}->${cloned.id}`);
    res.status(201).json(cloned);
  }
);

layoutsRouter.delete(
  "/layouts/:layoutId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    repo.deleteLayout(req.params.layoutId);
    audit(req.user.email, "layout.delete", req.params.layoutId);
    res.json({ ok: true, id: req.params.layoutId });
  }
);

layoutsRouter.patch("/layouts/:layoutId", authRequired, (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });

  const { name, status, widthMeters, depthMeters, heightMeters, shape, polygon, storeEnvelope } =
    req.body || {};
  const mutatingGeometry =
    widthMeters != null ||
    depthMeters != null ||
    heightMeters != null ||
    name != null ||
    shape != null ||
    polygon != null ||
    storeEnvelope != null;
  const mutatingStatus = status != null;
  const config = getConfig(layout.vertical);

  if (mutatingGeometry && !["Designer", "Admin"].includes(req.user.role)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (mutatingStatus) {
    if (status === "in_review" && !["Designer", "Admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden" });
    }
    if (["approved", "rejected"].includes(status)) {
      if (!["Approver", "Admin"].includes(req.user.role)) {
        return res.status(403).json({ error: "forbidden" });
      }
      if (config.approvalWorkflowEnabled === false && req.user.role !== "Admin") {
        return res.status(403).json({ error: "approval_disabled" });
      }
    }
    if (status === "in_review" && layout.status === "draft") {
      repo.saveLayoutVersion(layout, "submit_for_review");
      audit(req.user.email, "layout.version.snapshot", layout.id);
      layout.submittedRevision = Number(layout.contentRevision) || 0;
      layout.lastSubmittedAt = now();
      layout.reviewComment = null;
    }
    layout.status = status;
    audit(req.user.email, "layout.status", `${layout.id}:${status}`);
  }
  if (name != null) layout.name = name;
  if (widthMeters != null) {
    layout.widthMeters = Number(widthMeters);
    layout.storeEnvelope = {
      ...(layout.storeEnvelope || { x: 0, y: 0 }),
      widthMeters: Number(widthMeters),
      depthMeters: layout.storeEnvelope?.depthMeters ?? layout.depthMeters,
    };
  }
  if (depthMeters != null) {
    layout.depthMeters = Number(depthMeters);
    layout.storeEnvelope = {
      ...(layout.storeEnvelope || { x: 0, y: 0 }),
      widthMeters: layout.storeEnvelope?.widthMeters ?? layout.widthMeters,
      depthMeters: Number(depthMeters),
    };
  }
  if (heightMeters != null) layout.heightMeters = Number(heightMeters);
  if (shape != null) layout.shape = shape;
  if (storeEnvelope != null && typeof storeEnvelope === "object") {
    layout.storeEnvelope = {
      x: Number(storeEnvelope.x) || 0,
      y: Number(storeEnvelope.y) || 0,
      widthMeters: Number(storeEnvelope.widthMeters) || layout.widthMeters,
      depthMeters: Number(storeEnvelope.depthMeters) || layout.depthMeters,
    };
  }
  if (polygon != null) {
    const polyCheck = validatePolygonRing(polygon);
    if (!polyCheck.ok) return res.status(400).json({ error: polyCheck.error });
    layout.polygon = polygon;
    if (polygon.length >= 3) layout.shape = shape || "polygon";
    const env =
      layout.storeEnvelope ||
      (storeEnvelope && typeof storeEnvelope === "object" ? storeEnvelope : null) ||
      { x: 0, y: 0, widthMeters: layout.widthMeters, depthMeters: layout.depthMeters };
    layout.storeEnvelope = {
      x: Number(env.x) || 0,
      y: Number(env.y) || 0,
      widthMeters: Number(env.widthMeters) || layout.widthMeters,
      depthMeters: Number(env.depthMeters) || layout.depthMeters,
    };
    // Never shrink store footprint to polygon AABB — envelope stays the full store size.
    layout.widthMeters = layout.storeEnvelope.widthMeters;
    layout.depthMeters = layout.storeEnvelope.depthMeters;
  } else if (!layout.storeEnvelope) {
    layout.storeEnvelope = {
      x: 0,
      y: 0,
      widthMeters: layout.widthMeters,
      depthMeters: layout.depthMeters,
    };
  }

  saveNormalized(layout, { skipRevisionBump: mutatingStatus && !mutatingGeometry });
  audit(req.user.email, "layout.update", layout.id);
  res.json(layout);
});

function reviewSubmitHandler(req, res) {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  if (!["Designer", "Admin"].includes(req.user.role)) {
    return res.status(403).json({ error: "forbidden" });
  }
  const allowed =
    layout.status === "draft" ||
    layout.status === "rejected" ||
    (Number(layout.contentRevision) || 0) > (Number(layout.submittedRevision) ?? -1);
  if (!allowed) return res.status(400).json({ error: "submit_not_allowed" });
  if (layout.status === "draft" || layout.status === "rejected") {
    repo.saveLayoutVersion(layout, "submit_for_review");
    audit(req.user.email, "layout.version.snapshot", layout.id);
  }
  layout.status = "in_review";
  layout.submittedRevision = Number(layout.contentRevision) || 0;
  layout.lastSubmittedAt = now();
  layout.reviewComment = null;
  layout.reviewedAt = null;
  layout.reviewedBy = null;
  saveNormalized(layout, { skipRevisionBump: true });
  audit(req.user.email, "layout.review.submit", layout.id);
  res.json(layout);
}

function reviewApproveHandler(req, res) {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  if (!["Approver", "Admin"].includes(req.user.role)) {
    return res.status(403).json({ error: "forbidden" });
  }
  const config = getConfig(layout.vertical);
  if (config.approvalWorkflowEnabled === false && req.user.role !== "Admin") {
    return res.status(403).json({ error: "approval_disabled" });
  }
  if (layout.status !== "in_review") return res.status(400).json({ error: "not_in_review" });
  layout.status = "approved";
  layout.reviewedAt = now();
  layout.reviewedBy = req.user.email;
  saveNormalized(layout, { skipRevisionBump: true });
  audit(req.user.email, "layout.review.approve", layout.id);
  res.json(layout);
}

function reviewRejectHandler(req, res) {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  if (!["Approver", "Admin"].includes(req.user.role)) {
    return res.status(403).json({ error: "forbidden" });
  }
  const config = getConfig(layout.vertical);
  if (config.approvalWorkflowEnabled === false && req.user.role !== "Admin") {
    return res.status(403).json({ error: "approval_disabled" });
  }
  if (layout.status !== "in_review") return res.status(400).json({ error: "not_in_review" });
  const comment = String(req.body?.comment || "").trim();
  if (!comment) return res.status(400).json({ error: "review_comment_required" });
  layout.status = "rejected";
  layout.reviewComment = comment.slice(0, 2000);
  layout.reviewedAt = now();
  layout.reviewedBy = req.user.email;
  saveNormalized(layout, { skipRevisionBump: true });
  audit(req.user.email, "layout.review.reject", `${layout.id}:${comment.length}`);
  res.json(layout);
}

layoutsRouter.post(
  "/layouts/:layoutId/review/submit",
  authRequired,
  requireRoles("Designer", "Admin"),
  reviewSubmitHandler
);
layoutsRouter.post(
  "/layouts/:layoutId/review/approve",
  authRequired,
  requireRoles("Approver", "Admin"),
  reviewApproveHandler
);
layoutsRouter.post(
  "/layouts/:layoutId/review/reject",
  authRequired,
  requireRoles("Approver", "Admin"),
  reviewRejectHandler
);

layoutsRouter.get("/layouts/:layoutId/versions", authRequired, (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  res.json({ items: repo.listLayoutVersions(layout.id) });
});

layoutsRouter.post("/layouts/:layoutId/aisles", authRequired, requireRoles("Designer", "Admin"), (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  const orientation = req.body?.orientation === "vertical" ? "vertical" : "horizontal";
  const widthMeters = Number(req.body?.widthMeters ?? 1.2);
  const x = Number(req.body?.x || 0);
  const y = Number(req.body?.y || 0);
  const poly = layoutBoundaryPolygon(layout);
  const spanW = Number(layout.widthMeters) || 10;
  const spanD = Number(layout.depthMeters) || 8;
  let lengthMeters =
    req.body?.lengthMeters != null ? Number(req.body.lengthMeters) : null;
  if (lengthMeters == null || !Number.isFinite(lengthMeters) || lengthMeters <= 0) {
    if (orientation === "vertical") {
      lengthMeters =
        maxLengthInsideY(x, y, widthMeters, spanD, poly) || Math.max(2, spanD * 0.85);
    } else {
      lengthMeters =
        maxLengthInsideX(x, y, spanW, widthMeters, poly) || Math.max(2, spanW * 0.85);
    }
  }
  const aisle = {
    id: req.body?.id || `aisle-${randomUUID().slice(0, 6)}`,
    name: req.body?.name || "Aisle",
    widthMeters,
    lengthMeters: Math.max(1, lengthMeters),
    orientation,
    x,
    y,
    path: req.body?.path || [],
    categoryId: req.body?.categoryId,
    color: req.body?.color,
    source: "manual",
    violations: [],
  };
  layout.aisles = layout.aisles || [];
  try {
    assertInsideOrThrow(aisle, "aisle", layout);
    assertNoOverlapOrThrow(aisle, "aisle", layout);
  } catch (err) {
    return containmentError(res, err);
  }
  layout.aisles.push(aisle);
  saveNormalized(layout);
  audit(req.user.email, "layout.aisle.add", `${layout.id}:${aisle.id}`);
  res.status(201).json(layout);
});

layoutsRouter.patch(
  "/layouts/:layoutId/aisles/:aisleId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const aisle = (layout.aisles || []).find((a) => a.id === req.params.aisleId);
    if (!aisle) return res.status(404).json({ error: "aisle_not_found" });
    const patch = req.body || {};
    if (patch.name != null) aisle.name = patch.name;
    if (patch.widthMeters != null) aisle.widthMeters = Number(patch.widthMeters);
    if (patch.lengthMeters != null) aisle.lengthMeters = Number(patch.lengthMeters);
    if (patch.orientation != null) aisle.orientation = patch.orientation;
    if (patch.x != null) aisle.x = Number(patch.x);
    if (patch.y != null) aisle.y = Number(patch.y);
    if (patch.path != null) aisle.path = patch.path;
    if (patch.categoryId !== undefined) aisle.categoryId = patch.categoryId || null;
    if (patch.color !== undefined) aisle.color = patch.color || null;
    if (patch.categoryId && patch.color) {
      layout.aisleMappings = (layout.aisleMappings || []).filter((m) => m.aisleId !== aisle.id);
      layout.aisleMappings.push({
        aisleId: aisle.id,
        categoryId: patch.categoryId,
        color: patch.color,
      });
    }
    try {
      assertInsideOrThrow(aisle, "aisle", layout);
      assertNoOverlapOrThrow(aisle, "aisle", layout, { ignoreId: aisle.id });
    } catch (err) {
      return containmentError(res, err);
    }
    saveNormalized(layout);
    audit(req.user.email, "layout.aisle.patch", `${layout.id}:${aisle.id}`);
    res.json(layout);
  }
);

layoutsRouter.delete(
  "/layouts/:layoutId/aisles/:aisleId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const before = (layout.aisles || []).length;
    layout.aisles = (layout.aisles || []).filter((a) => a.id !== req.params.aisleId);
    if (layout.aisles.length === before) return res.status(404).json({ error: "aisle_not_found" });
    layout.aisleMappings = (layout.aisleMappings || []).filter((m) => m.aisleId !== req.params.aisleId);
    for (const shelf of layout.shelves || []) {
      if (shelf.aisleId === req.params.aisleId) shelf.aisleId = null;
    }
    saveNormalized(layout);
    audit(req.user.email, "layout.aisle.delete", `${layout.id}:${req.params.aisleId}`);
    res.json(layout);
  }
);

// ---- Special zones (hot / offer / custom) ----
layoutsRouter.post("/layouts/:layoutId/zones", authRequired, requireRoles("Designer", "Admin"), (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  const zone = normalizeZone(req.body || {});
  try {
    assertInsideOrThrow(zone, "zone", layout);
  } catch (err) {
    return containmentError(res, err);
  }
  layout.zones = layout.zones || [];
  layout.zones.push(zone);
  saveNormalized(layout);
  audit(req.user.email, "layout.zone.add", `${layout.id}:${zone.id}`);
  res.status(201).json(layout);
});

layoutsRouter.patch(
  "/layouts/:layoutId/zones/:zoneId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const zone = (layout.zones || []).find((z) => z.id === req.params.zoneId);
    if (!zone) return res.status(404).json({ error: "zone_not_found" });
    const patch = req.body || {};
    if (patch.type != null) zone.type = normalizeZoneType(patch.type);
    if (patch.name !== undefined) zone.name = patch.name || zone.name;
    if (patch.color !== undefined) zone.color = patch.color || zone.color;
    for (const key of ["x", "y", "widthMeters", "depthMeters"]) {
      if (patch[key] != null) zone[key] = Number(patch[key]);
    }
    try {
      assertInsideOrThrow(zone, "zone", layout);
    } catch (err) {
      return containmentError(res, err);
    }
    saveNormalized(layout);
    audit(req.user.email, "layout.zone.patch", `${layout.id}:${zone.id}`);
    res.json(layout);
  }
);

layoutsRouter.delete(
  "/layouts/:layoutId/zones/:zoneId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const before = (layout.zones || []).length;
    layout.zones = (layout.zones || []).filter((z) => z.id !== req.params.zoneId);
    if (layout.zones.length === before) return res.status(404).json({ error: "zone_not_found" });
    saveNormalized(layout);
    audit(req.user.email, "layout.zone.delete", `${layout.id}:${req.params.zoneId}`);
    res.json(layout);
  }
);

// ---- Architectural obstacles (columns / walls / blocked areas) ----
layoutsRouter.post(
  "/layouts/:layoutId/obstacles",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const obstacle = normalizeObstacle(req.body || {});
    try {
      assertInsideOrThrow(obstacle, "obstacle", layout);
      assertNoOverlapOrThrow(obstacle, "obstacle", layout);
    } catch (err) {
      return containmentError(res, err);
    }
    layout.obstacles = layout.obstacles || [];
    layout.obstacles.push(obstacle);
    saveNormalized(layout);
    audit(req.user.email, "layout.obstacle.add", `${layout.id}:${obstacle.id}`);
    res.status(201).json(layout);
  }
);

layoutsRouter.patch(
  "/layouts/:layoutId/obstacles/:obstacleId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const obstacle = (layout.obstacles || []).find((o) => o.id === req.params.obstacleId);
    if (!obstacle) return res.status(404).json({ error: "obstacle_not_found" });
    const patch = req.body || {};
    if (patch.type != null) obstacle.type = normalizeObstacleType(patch.type);
    if (patch.name !== undefined) obstacle.name = patch.name || obstacle.name;
    if (patch.color !== undefined) obstacle.color = patch.color || obstacle.color;
    for (const key of ["x", "y", "widthMeters", "depthMeters", "heightMeters"]) {
      if (patch[key] != null) obstacle[key] = Number(patch[key]);
    }
    try {
      assertInsideOrThrow(obstacle, "obstacle", layout);
      assertNoOverlapOrThrow(obstacle, "obstacle", layout);
    } catch (err) {
      return containmentError(res, err);
    }
    saveNormalized(layout);
    audit(req.user.email, "layout.obstacle.patch", `${layout.id}:${obstacle.id}`);
    res.json(layout);
  }
);

layoutsRouter.delete(
  "/layouts/:layoutId/obstacles/:obstacleId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const before = (layout.obstacles || []).length;
    layout.obstacles = (layout.obstacles || []).filter((o) => o.id !== req.params.obstacleId);
    if (layout.obstacles.length === before) return res.status(404).json({ error: "obstacle_not_found" });
    saveNormalized(layout);
    audit(req.user.email, "layout.obstacle.delete", `${layout.id}:${req.params.obstacleId}`);
    res.json(layout);
  }
);

// ---- Floor-plan underlay (uploaded architectural drawing) ----
layoutsRouter.post(
  "/layouts/:layoutId/floor-plan",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });

    let saved;
    try {
      saved = persistFloorPlanUpload(
        layout.id,
        req.body?.dataBase64 || req.body?.data,
        req.body?.fileName || "floor-plan.png"
      );
    } catch (err) {
      return res.status(400).json({ error: err.code || err.message || "invalid_image_file" });
    }

    // Default the underlay to the store envelope so it lands on-screen ready to calibrate.
    const envelope = layout.storeEnvelope || {};
    const previous = layout.floorPlan;
    layout.floorPlan = normalizeFloorPlan({
      url: saved.url,
      fileName: saved.fileName,
      x: req.body?.x ?? envelope.x ?? 0,
      y: req.body?.y ?? envelope.y ?? 0,
      widthMeters: req.body?.widthMeters ?? envelope.widthMeters ?? layout.widthMeters,
      depthMeters: req.body?.depthMeters ?? envelope.depthMeters ?? layout.depthMeters,
      opacity: req.body?.opacity ?? 0.5,
      visible: true,
    });
    if (previous?.fileName && previous.fileName !== saved.fileName) {
      try {
        deleteFloorPlanImage(previous.fileName);
      } catch {
        /* stale file is harmless */
      }
    }

    saveNormalized(layout);
    audit(req.user.email, "layout.floorplan.upload", `${layout.id}:${saved.fileName}`);
    res.status(201).json(layout);
  }
);

layoutsRouter.patch(
  "/layouts/:layoutId/floor-plan",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    if (!layout.floorPlan) return res.status(404).json({ error: "floor_plan_not_found" });
    layout.floorPlan = patchFloorPlan(layout.floorPlan, req.body || {});
    saveNormalized(layout);
    audit(req.user.email, "layout.floorplan.patch", layout.id);
    res.json(layout);
  }
);

layoutsRouter.delete(
  "/layouts/:layoutId/floor-plan",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const existing = layout.floorPlan;
    if (!existing) return res.status(404).json({ error: "floor_plan_not_found" });
    layout.floorPlan = null;
    try {
      deleteFloorPlanImage(existing.fileName);
    } catch {
      /* stale file is harmless */
    }
    saveNormalized(layout);
    audit(req.user.email, "layout.floorplan.delete", layout.id);
    res.json(layout);
  }
);

// ---- Store entry points ----
layoutsRouter.post(
  "/layouts/:layoutId/entry-points",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const entry = normalizeEntryPoint(req.body || {});
    try {
      assertInsideOrThrow(entry, "entryPoint", layout);
    } catch (err) {
      return containmentError(res, err);
    }
    layout.entryPoints = layout.entryPoints || [];
    layout.entryPoints.push(entry);
    saveNormalized(layout);
    audit(req.user.email, "layout.entry.add", `${layout.id}:${entry.id}`);
    res.status(201).json(layout);
  }
);

layoutsRouter.patch(
  "/layouts/:layoutId/entry-points/:entryId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const entry = (layout.entryPoints || []).find((e) => e.id === req.params.entryId);
    if (!entry) return res.status(404).json({ error: "entry_not_found" });
    const patch = req.body || {};
    if (patch.name !== undefined) entry.name = patch.name || entry.name;
    for (const key of ["x", "y", "widthMeters"]) {
      if (patch[key] != null) entry[key] = Number(patch[key]);
    }
    try {
      assertInsideOrThrow(entry, "entryPoint", layout);
    } catch (err) {
      return containmentError(res, err);
    }
    saveNormalized(layout);
    audit(req.user.email, "layout.entry.patch", `${layout.id}:${entry.id}`);
    res.json(layout);
  }
);

layoutsRouter.delete(
  "/layouts/:layoutId/entry-points/:entryId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const before = (layout.entryPoints || []).length;
    layout.entryPoints = (layout.entryPoints || []).filter((e) => e.id !== req.params.entryId);
    if (layout.entryPoints.length === before) return res.status(404).json({ error: "entry_not_found" });
    saveNormalized(layout);
    audit(req.user.email, "layout.entry.delete", `${layout.id}:${req.params.entryId}`);
    res.json(layout);
  }
);

layoutsRouter.post("/layouts/:layoutId/fixtures", authRequired, requireRoles("Designer", "Admin"), (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  const templates = getConfig(layout.vertical).fixtureTemplates || [];
  const tmpl = templates.find((t) => t.type === (req.body?.type || "shelf"));
  const type = req.body?.type || "shelf";
  const fixture = {
    id: req.body?.id || `fix-${randomUUID().slice(0, 6)}`,
    type,
    label: req.body?.label || temporaryStorageLabel(type) || "Fixture",
    widthMeters: Number(req.body?.widthMeters ?? tmpl?.defaultWidthMeters ?? 1.2),
    depthMeters: Number(req.body?.depthMeters ?? tmpl?.defaultDepthMeters ?? 0.6),
    heightMeters: Number(req.body?.heightMeters || 2),
    x: Number(req.body?.x || 0),
    y: Number(req.body?.y || 0),
    rotationDeg: Number(req.body?.rotationDeg || 0),
    categoryId: req.body?.categoryId,
    color: req.body?.color,
    temporaryStorage: isTemporaryStorageType(type) || req.body?.temporaryStorage === true,
    defaultLevels: tmpl?.defaultLevels,
  };
  layout.fixtures = layout.fixtures || [];
  layout.shelves = layout.shelves || [];
  const shelf = fixtureToShelf(fixture);
  try {
    assertInsideOrThrow(shelf, "shelf", layout);
    assertNoOverlapOrThrow(shelf, "shelf", layout);
  } catch (err) {
    return containmentError(res, err);
  }
  layout.fixtures.push(fixture);
  layout.shelves.push(shelf);
  saveNormalized(layout);
  audit(req.user.email, "layout.fixture.add", `${layout.id}:${fixture.id}`);
  res.status(201).json(layout);
});

layoutsRouter.patch(
  "/layouts/:layoutId/fixtures/:fixtureId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const fixture = (layout.fixtures || []).find((f) => f.id === req.params.fixtureId);
    const shelf = (layout.shelves || []).find((s) => s.id === req.params.fixtureId);
    if (!fixture && !shelf) return res.status(404).json({ error: "fixture_not_found" });
    const patch = req.body || {};
    const target = shelf || fixture;
    for (const key of ["x", "y", "widthMeters", "depthMeters", "heightMeters", "rotationDeg", "usableWidthMeters"]) {
      if (patch[key] != null) target[key] = Number(patch[key]);
    }
    for (const key of ["maxLoadKgPerLevel", "maxLoadKg"]) {
      if (patch[key] !== undefined) {
        target[key] = patch[key] == null || patch[key] === "" ? null : Number(patch[key]);
      }
    }
    if (patch.label != null) target.label = patch.label;
    try {
      assertInsideOrThrow(target, "shelf", layout);
      assertNoOverlapOrThrow(target, "shelf", layout, { ignoreId: target.id });
    } catch (err) {
      return containmentError(res, err);
    }
    if (shelf && fixture) Object.assign(fixture, shelfToFixture(shelf));
    if (!shelf && fixture) {
      layout.shelves = layout.shelves || [];
      layout.shelves.push(fixtureToShelf(fixture));
    }
    saveNormalized(layout);
    audit(req.user.email, "layout.fixture.patch", `${layout.id}:${req.params.fixtureId}`);
    res.json(layout);
  }
);

layoutsRouter.post("/layouts/:layoutId/shelves", authRequired, requireRoles("Designer", "Admin"), (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  const templates = getConfig(layout.vertical).fixtureTemplates || [];
  const type = req.body?.type || "shelf";
  const tmpl = templates.find((t) => t.type === type);
  const usable = Number(
    req.body?.usableWidthMeters ?? req.body?.widthMeters ?? tmpl?.defaultWidthMeters ?? 1.2
  );
  const heightMeters = Number(req.body?.heightMeters || 2);
  const depthMeters = Number(req.body?.depthMeters ?? tmpl?.defaultDepthMeters ?? 0.6);
  const x = Number(req.body?.x || 0);
  const y = Number(req.body?.y || 0);
  const rotationDeg = Number(req.body?.rotationDeg || 0);

  if (isTemporaryStorageType(type) || isSingleSidedPlacementType(type, layout.vertical)) {
    const shelf = fixtureToShelf({
      id: req.body?.id || `shf-${randomUUID().slice(0, 6)}`,
      type,
      label: req.body?.label || warehouseFixtureLabel(type) || temporaryStorageLabel(type) || "Fixture",
      usableWidthMeters: usable,
      widthMeters: Number(req.body?.widthMeters ?? usable),
      depthMeters,
      heightMeters,
      x,
      y,
      rotationDeg,
      aisleId: null,
      categoryId: req.body?.categoryId,
      color: req.body?.color,
      defaultLevels: tmpl?.defaultLevels ?? 1,
      levels: req.body?.levels,
      planogram: [],
      temporaryStorage: isTemporaryStorageType(type),
      doubleSided: false,
    });
    layout.shelves = layout.shelves || [];
    try {
      assertInsideOrThrow(shelf, "shelf", layout);
      assertNoOverlapOrThrow(shelf, "shelf", layout);
    } catch (err) {
      return containmentError(res, err);
    }
    shelf.displayNumber = nextDisplayNumber(layout.shelves);
    layout.shelves.push(shelf);
    normalizeShelf(shelf);
    clearArrangementAcceptance(layout);
    saveNormalized(layout);
    audit(req.user.email, "layout.shelf.add", `${layout.id}:${shelf.id}`);
    return res.status(201).json(layout);
  }

  const pairId = `pair-${randomUUID().slice(0, 8)}`;
  const front = fixtureToShelf({
    id: req.body?.id || `shf-${randomUUID().slice(0, 6)}`,
    type,
    label: req.body?.label || "Shelf (front)",
    usableWidthMeters: usable,
    widthMeters: Number(req.body?.widthMeters ?? usable),
    depthMeters,
    heightMeters,
    x,
    y,
    rotationDeg,
    aisleId: req.body?.aisleId || null,
    categoryId: req.body?.categoryId,
    color: req.body?.color,
    defaultLevels: tmpl?.defaultLevels,
    levels: req.body?.levels,
    planogram: [],
    pairId,
    pairRole: "front",
    doubleSided: false,
  });
  const backOrigin = oppositeShelfOrigin(x, y, rotationDeg, usable, depthMeters);
  const back = fixtureToShelf({
    id: `shf-${randomUUID().slice(0, 6)}`,
    type,
    label: "Shelf (back)",
    usableWidthMeters: usable,
    widthMeters: Number(req.body?.widthMeters ?? usable),
    depthMeters,
    heightMeters,
    x: backOrigin.x,
    y: backOrigin.y,
    rotationDeg: backOrigin.rotationDeg,
    aisleId: req.body?.aisleId || null,
    defaultLevels: tmpl?.defaultLevels,
    planogram: [],
    pairId,
    pairRole: "back",
    doubleSided: false,
  });
  layout.shelves = layout.shelves || [];
  try {
    assertInsideOrThrow(front, "shelf", layout);
    assertInsideOrThrow(back, "shelf", layout);
    assertNoOverlapOrThrow(front, "shelf", layout);
    assertNoOverlapOrThrow(back, "shelf", layout, { ignoreId: front.id });
  } catch (err) {
    return containmentError(res, err);
  }
  const unit = nextDisplayNumber(layout.shelves);
  front.displayNumber = unit;
  back.displayNumber = unit;
  layout.shelves.push(front, back);
  normalizeShelf(front);
  normalizeShelf(back);
  clearArrangementAcceptance(layout);
  saveNormalized(layout);
  audit(req.user.email, "layout.shelf.add", `${layout.id}:${front.id}+${back.id}`);
  res.status(201).json(layout);
});

layoutsRouter.patch(
  "/layouts/:layoutId/shelves/:shelfId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const shelf = (layout.shelves || []).find((s) => s.id === req.params.shelfId);
    if (!shelf) return res.status(404).json({ error: "shelf_not_found" });
    const patch = req.body || {};
    for (const key of ["x", "y", "widthMeters", "depthMeters", "heightMeters", "usableWidthMeters"]) {
      if (patch[key] != null) shelf[key] = Number(patch[key]);
    }
    for (const key of ["maxLoadKgPerLevel", "maxLoadKg"]) {
      if (patch[key] !== undefined) {
        shelf[key] = patch[key] == null || patch[key] === "" ? null : Number(patch[key]);
      }
    }
    if (patch.rotationDeg != null) shelf.rotationDeg = normalizeRotationDeg(patch.rotationDeg);
    if (patch.label != null) shelf.label = patch.label;
    if (patch.type != null) shelf.type = patch.type;
    if (patch.aisleId !== undefined) shelf.aisleId = patch.aisleId || null;
    if (Array.isArray(patch.levels)) shelf.levels = patch.levels;
    if (Array.isArray(patch.segments)) {
      try {
        normalizeShelf(shelf);
        const faceId = patch.faceId === "B" ? "B" : "A";
        const face = getFace(shelf, faceId);
        const usable = Math.max(0.1, Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 1.2);
        if (patch.levelIndex != null && patch.levelIndex !== "") {
          const levelKey = String(Number(patch.levelIndex) || 0);
          if (!face.levelSegments) face.levelSegments = {};
          face.levelSegments[levelKey] = patch.segments;
          normalizeFaceLevelSegments(face, usable);
        } else {
          face.segments = patch.segments;
          normalizeShelfFaceSegments(shelf);
        }
      } catch (err) {
        if (err instanceof SegmentError) return res.status(400).json({ error: err.code });
        throw err;
      }
    }
    if (patch.categoryId !== undefined) {
      const faceId = patch.faceId === "B" ? "B" : "A";
      setFaceCategory(shelf, faceId, patch.categoryId || null, patch.color);
      if (patch.categoryId && patch.color) {
        layout.shelfMappings = (layout.shelfMappings || []).filter(
          (m) => !(m.shelfId === shelf.id && (m.faceId || "A") === faceId)
        );
        layout.shelfMappings.push({
          shelfId: shelf.id,
          fixtureId: shelf.id,
          faceId,
          categoryId: patch.categoryId,
          color: patch.color,
        });
      }
    }
    if (patch.color != null && patch.categoryId === undefined) shelf.color = patch.color;
    const poseChanged =
      patch.x != null ||
      patch.y != null ||
      patch.rotationDeg != null ||
      patch.widthMeters != null ||
      patch.depthMeters != null ||
      patch.usableWidthMeters != null;
    // Segment / category / label edits must not re-run aisle overlap checks — many
    // generated layouts have aisle bands that kiss shelf footprints, and blocking
    // Split/Merge for that is a false positive.
    if (poseChanged) {
      const mate = syncPairMatePose(layout, shelf);
      try {
        assertInsideOrThrow(shelf, "shelf", layout);
        assertNoOverlapOrThrow(shelf, "shelf", layout, { ignoreId: shelf.id });
        if (mate) {
          assertInsideOrThrow(mate, "shelf", layout);
          assertNoOverlapOrThrow(mate, "shelf", layout, { ignoreId: mate.id });
        }
      } catch (err) {
        return containmentError(res, err);
      }
      clearArrangementAcceptance(layout);
    } else if (Array.isArray(patch.levels) || patch.heightMeters != null) {
      clearArrangementAcceptance(layout);
    }
    saveNormalized(layout);
    audit(req.user.email, "layout.shelf.patch", `${layout.id}:${shelf.id}`);
    res.json(layout);
  }
);

layoutsRouter.delete(
  "/layouts/:layoutId/shelves/:shelfId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const shelf = (layout.shelves || []).find((s) => s.id === req.params.shelfId);
    if (!shelf) return res.status(404).json({ error: "shelf_not_found" });
    const removeIds = new Set([shelf.id]);
    if (shelf.pairId) {
      for (const s of layout.shelves) {
        if (s.pairId === shelf.pairId) removeIds.add(s.id);
      }
    }
    layout.shelves = (layout.shelves || []).filter((s) => !removeIds.has(s.id));
    layout.fixtures = (layout.fixtures || []).filter((f) => !removeIds.has(f.id));
    layout.shelfMappings = (layout.shelfMappings || []).filter(
      (m) => !removeIds.has(m.shelfId) && !removeIds.has(m.fixtureId)
    );
    clearArrangementAcceptance(layout);
    saveNormalized(layout);
    audit(req.user.email, "layout.shelf.delete", `${layout.id}:${[...removeIds].join("+")}`);
    res.json(layout);
  }
);

layoutsRouter.post("/layouts/:layoutId/mappings", authRequired, requireRoles("Designer", "Admin"), (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  const { fixtureId, shelfId, aisleId, categoryId, color, faceId } = req.body || {};
  if (!categoryId || !color) return res.status(400).json({ error: "missing_fields" });

  if (aisleId) {
    const aisle = (layout.aisles || []).find((a) => a.id === aisleId);
    if (!aisle) return res.status(404).json({ error: "aisle_not_found" });
    aisle.categoryId = categoryId;
    aisle.color = color;
    layout.aisleMappings = (layout.aisleMappings || []).filter((m) => m.aisleId !== aisleId);
    layout.aisleMappings.push({ aisleId, categoryId, color });
    saveNormalized(layout);
    audit(req.user.email, "layout.aisle.mapping", `${layout.id}:${aisleId}`);
    return res.status(201).json(layout);
  }

  const id = shelfId || fixtureId;
  if (!id) return res.status(400).json({ error: "missing_fields" });
  const shelf = (layout.shelves || []).find((s) => s.id === id);
  const fixture = (layout.fixtures || []).find((f) => f.id === id);
  if (!shelf && !fixture) return res.status(404).json({ error: "fixture_not_found" });
  if (shelf) {
    const fid = faceId === "B" ? "B" : "A";
    setFaceCategory(shelf, fid, categoryId, color);
  }
  if (fixture) {
    fixture.categoryId = categoryId;
    fixture.color = color;
  }
  layout.shelfMappings = (layout.shelfMappings || []).filter(
    (m) => !(m.shelfId === id && m.fixtureId === id && (m.faceId || "A") === (faceId === "B" ? "B" : "A"))
  );
  layout.shelfMappings.push({ shelfId: id, fixtureId: id, faceId: faceId === "B" ? "B" : "A", categoryId, color });
  saveNormalized(layout);
  audit(req.user.email, "layout.mapping.add", `${layout.id}:${id}`);
  res.status(201).json(layout);
});

function samePlanogramCell(placement, { levelIndex, segmentId, faceId }) {
  const fid = faceId === "B" ? "B" : "A";
  const pFace = placement?.faceId === "B" ? "B" : "A";
  const seg = segmentId || null;
  const pSeg = placement?.segmentId || null;
  return (
    Number(placement?.levelIndex) === Number(levelIndex) &&
    pFace === fid &&
    pSeg === seg
  );
}

layoutsRouter.post(
  "/layouts/:layoutId/shelves/:shelfId/planogram",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    if (!planogramEnabled()) return res.status(403).json({ error: "planogram_disabled" });
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    if (!arrangementGate(layout, res)) return;
    const shelf = (layout.shelves || []).find((s) => s.id === req.params.shelfId);
    if (!shelf) return res.status(404).json({ error: "shelf_not_found" });
    normalizeShelf(shelf);
    const faceId = req.body?.faceId === "B" ? "B" : "A";
    const segmentId = req.body?.segmentId || null;
    const isTemp = isTemporaryStorageShelf(shelf);
    const activeCategoryId = faceCategoryId(shelf, faceId);
    if (!activeCategoryId && !isTemp) return res.status(400).json({ error: "shelf_category_required" });
    const productId = req.body?.productId;
    if (!productId) return res.status(400).json({ error: "missing_fields" });
    const levelIndex = Number(req.body?.levelIndex) || 0;
    if (segmentId && !getShelfSegment(shelf, segmentId, faceId, levelIndex)) {
      return res.status(404).json({ error: "segment_not_found" });
    }
    const product = repo.listProducts().find((p) => p.id === productId);
    if (!product) return res.status(404).json({ error: "product_not_found" });
    const categories = listCategoriesForLayout(layout.vertical, (v) => repo.listCategories(v));
    const shelfForGate = {
      ...shelf,
      categoryId: activeCategoryId || (isTemp ? product.categoryId : null),
    };
    if (!isTemp && !productAllowedForShelf(product, activeCategoryId, categories)) {
      return res.status(400).json({ error: "product_category_mismatch" });
    }
    const preview = previewFacings({
      shelf: shelfForGate,
      product,
      levelIndex: req.body?.levelIndex,
      segmentId,
      faceId,
    });
    if (!preview.fitsLevelHeight) {
      return res.status(400).json({ error: "product_too_tall_for_level" });
    }
    const pog = facePlanogram(shelf, faceId);
    const cell = { levelIndex, segmentId, faceId };
    const existing = pog.find((p) => samePlanogramCell(p, cell));
    if (existing) {
      if (existing.productId !== productId) {
        return res.status(409).json({ error: "cell_occupied" });
      }
      const nextStack = clampStackLayers((existing.stackLayers || 1) + 1, preview.maxStackLayers);
      if (nextStack <= (existing.stackLayers || 1)) {
        return res.status(400).json({ error: "stack_limit_reached", maxStackLayers: preview.maxStackLayers });
      }
      existing.stackLayers = nextStack;
      existing.maxStackLayers = preview.maxStackLayers;
      existing.maxFacings = preview.maxFacings;
      existing.maxDepthFacings = preview.maxDepthFacings;
      if (req.body?.facings != null) {
        existing.facings = clampFacings(req.body.facings, preview.maxFacings);
      }
      if (req.body?.depthFacings != null) {
        existing.depthFacings = clampDepthFacings(req.body.depthFacings, preview.maxDepthFacings);
      }
      syncLegacyFromFaces(shelf);
      saveNormalized(layout);
      const load = computeShelfLoad(shelf, repo.listProducts());
      const level = load.levels.find((l) => l.levelIndex === existing.levelIndex);
      const weightWarning =
        level?.overloaded
          ? {
              code: "level_overloaded",
              levelIndex: level.levelIndex,
              loadKg: level.loadKg,
              limitKg: level.limitKg,
            }
          : null;
      audit(req.user.email, "layout.planogram.stack", `${layout.id}:${shelf.id}:${productId}`);
      return res.status(201).json(
        weightWarning ? { ...layout, weightWarning, stacked: true, stackLayers: existing.stackLayers } : { ...layout, stacked: true, stackLayers: existing.stackLayers }
      );
    }

    const facings = clampFacings(req.body?.facings, preview.maxFacings);
    const depthFacings = clampDepthFacings(req.body?.depthFacings, preview.maxDepthFacings);
    const stackLayers = clampStackLayers(req.body?.stackLayers ?? 1, preview.maxStackLayers);
    const placement = {
      id: req.body?.id || `pog-${randomUUID().slice(0, 6)}`,
      productId,
      levelIndex: Number(req.body?.levelIndex) || 0,
      facings,
      maxFacings: preview.maxFacings,
      depthFacings,
      maxDepthFacings: preview.maxDepthFacings,
      stackLayers,
      maxStackLayers: preview.maxStackLayers,
      positionX: Number(req.body?.positionX || 0),
      faceId,
      segmentId: segmentId || undefined,
    };
    pog.push(placement);
    syncLegacyFromFaces(shelf);
    saveNormalized(layout);

    // Manual placement is never blocked on weight — the planner is told and decides.
    const load = computeShelfLoad(shelf, repo.listProducts());
    const level = load.levels.find((l) => l.levelIndex === placement.levelIndex);
    const weightWarning =
      level?.overloaded
        ? {
            code: "level_overloaded",
            levelIndex: level.levelIndex,
            loadKg: level.loadKg,
            limitKg: level.limitKg,
          }
        : null;

    audit(req.user.email, "layout.planogram.add", `${layout.id}:${shelf.id}:${productId}`);
    res.status(201).json(weightWarning ? { ...layout, weightWarning } : layout);
  }
);

layoutsRouter.delete(
  "/layouts/:layoutId/shelves/:shelfId/planogram/:placementId",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    if (!planogramEnabled()) return res.status(403).json({ error: "planogram_disabled" });
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    if (!arrangementGate(layout, res)) return;
    const shelf = (layout.shelves || []).find((s) => s.id === req.params.shelfId);
    if (!shelf) return res.status(404).json({ error: "shelf_not_found" });
    normalizeShelf(shelf);
    let found = false;
    for (const face of shelf.faces || []) {
      const before = (face.planogram || []).length;
      face.planogram = (face.planogram || []).filter((p) => p.id !== req.params.placementId);
      if (face.planogram.length < before) found = true;
    }
    if (!found) return res.status(404).json({ error: "placement_not_found" });
    syncLegacyFromFaces(shelf);
    saveNormalized(layout);
    audit(req.user.email, "layout.planogram.delete", `${layout.id}:${req.params.placementId}`);
    res.json(layout);
  }
);

layoutsRouter.post("/layouts/:layoutId/planogram/preview", authRequired, (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  const shelf = (layout.shelves || []).find((s) => s.id === req.body?.shelfId);
  if (!shelf) return res.status(404).json({ error: "shelf_not_found" });
  normalizeShelf(shelf);
  const faceId = req.body?.faceId === "B" ? "B" : "A";
  const segmentId = req.body?.segmentId || null;
  const activeCategoryId = faceCategoryId(shelf, faceId);
  if (!activeCategoryId) return res.status(400).json({ error: "shelf_category_required" });
  const levelIndex = Number(req.body?.levelIndex) || 0;
  if (segmentId && !getShelfSegment(shelf, segmentId, faceId, levelIndex)) {
    return res.status(404).json({ error: "segment_not_found" });
  }
  const product = repo.listProducts().find((p) => p.id === req.body?.productId);
  if (!product) return res.status(404).json({ error: "product_not_found" });
  res.json(
    previewFacings({
      shelf: { ...shelf, categoryId: activeCategoryId },
      product,
      levelIndex: req.body?.levelIndex,
      segmentId,
      faceId,
    })
  );
});

layoutsRouter.post(
  "/layouts/:layoutId/autogenerate",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    if (!autogenerateEnabled()) return res.status(403).json({ error: "autogenerate_disabled" });
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    const body = req.body || {};
    const replaceExisting = body.replaceExisting !== false;
    const hasContent = (layout.aisles || []).length > 0 || (layout.shelves || []).length > 0;
    if (hasContent && !replaceExisting) {
      return res.status(400).json({ error: "layout_not_empty" });
    }

    let generated;
    try {
      generated = autogenerateLayoutFixtures(layout, body, {
        getConfig,
        listCategories: () => repo.listCategories(),
      });
    } catch (err) {
      if (err.code === "category_mix_invalid") {
        return res.status(400).json({ error: "category_mix_invalid", detail: "Percentages must sum to 100" });
      }
      throw err;
    }

    const categoryMix = Array.isArray(body.categoryMix) ? body.categoryMix : [];

    let planogramPlacements = 0;
    if (body.fillPlanogram !== false && planogramEnabled()) {
      const { categories: fillCats, products: fillProducts } = loadProductsForLayoutVertical(
        layout.vertical,
        (v) => repo.listCategories(v),
        () => repo.listProducts()
      );
      planogramPlacements = fillPlanogramsForLayout(layout, fillProducts, fillCats);
    }

    saveNormalized(layout);
    const coverage = computePlanogramCoverage(
      layout,
      (v) => repo.listCategories(v),
      () => repo.listProducts()
    );
    const arrangement = computeArrangementSummary(layout, repo.listProducts());
    audit(req.user.email, "layout.autogenerate", `${layout.id}:${layout.shelves.length}`);
    res.json({
      ...layout,
      arrangement,
      generated: {
        aisles: layout.aisles.length,
        shelves: layout.shelves.length,
        gondolaUnits: generated.gondolaUnits,
        walkAisles: layout.aisles.length,
        categoryMapped: generated.categoryMapped,
        planogramFilled: planogramPlacements > 0,
        planogramPlacements,
        productsMapped: planogramPlacements,
        skippedOutsideCount: generated.skippedOutsideCount,
      },
      coverage: {
        totalProducts: coverage.totalProducts,
        placedCount: coverage.placedCount,
        missingCount: coverage.missingCount,
        coveragePercent: coverage.coveragePercent,
        missingProducts: coverage.missingProducts,
      },
      replaced: replaceExisting && hasContent,
    });
  }
);

layoutsRouter.get("/layouts/:layoutId/arrangement-summary", authRequired, (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  normalizeLayout(layout);
  res.json(computeArrangementSummary(layout, repo.listProducts()));
});

layoutsRouter.post(
  "/layouts/:layoutId/arrangement/accept",
  authRequired,
  requireRoles("Designer", "Admin"),
  (req, res) => {
    const layout = repo.getLayout(req.params.layoutId);
    if (!layout) return res.status(404).json({ error: "not_found" });
    if (!(layout.shelves || []).length) {
      return res.status(400).json({ error: "no_shelves", detail: "Arrange shelves before accepting." });
    }
    layout.arrangementAcceptedAt = now();
    layout.arrangementAcceptedBy = req.user.email;
    let planogramPlacements = 0;
    if (req.body?.fillPlanogram === true) {
      const { categories: fillCats, products: fillProducts } = loadProductsForLayoutVertical(
        layout.vertical,
        (v) => repo.listCategories(v),
        () => repo.listProducts()
      );
      planogramPlacements = fillPlanogramsForLayout(layout, fillProducts, fillCats);
      const boundAfter = finalizeAisleShelfBinding(layout.shelves, layout.aisles, layout);
      layout.shelves = boundAfter.shelves;
      layout.aisles = boundAfter.aisles;
      ({ shelves: layout.shelves, aisles: layout.aisles } = finalizeAisleLabeling(
        layout.shelves,
        layout.aisles,
        layout
      ));
    }
    saveNormalized(layout);
    audit(req.user.email, "layout.arrangement.accept", layout.id);
    const coverage = computePlanogramCoverage(
      layout,
      (v) => repo.listCategories(v),
      () => repo.listProducts()
    );
    res.json({
      ...layout,
      arrangement: computeArrangementSummary(layout, repo.listProducts()),
      coverage,
      planogramPlacements,
    });
  }
);

layoutsRouter.get("/layouts/:layoutId/planogram/coverage", authRequired, (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  res.json(
    computePlanogramCoverage(
      layout,
      (v) => repo.listCategories(v),
      () => repo.listProducts()
    )
  );
});

layoutsRouter.post("/layouts/:layoutId/auto-calc", authRequired, requireRoles("Designer", "Admin"), (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  saveNormalized(layout);
  res.json(layout.autoCalc);
});
