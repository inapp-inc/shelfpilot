/**
 * Floor-plan upload: read dimensions from file content and build layout (no canvas underlay).
 * @see Docs/FLOOR_PLAN_IMPORT_SPEC.md
 */
import {
  mergeDimensionCandidates,
  parseStoreDimensionsFromFileName,
  parseStoreDimensionsFromSvgMarkup,
  parseStoreDimensionsFromText,
} from "../../shared/floorPlanDimensions.mjs";
import {
  analyzePlanTextContent as analyzePlanTextShared,
  dimensionsFromAspect,
  resolveFloorPlanImportMode,
} from "../../shared/planTextAnalyze.mjs";
import { enrichSimplifiedPlanImport } from "../../shared/floorPlanSimplifiedLayout.mjs";
import {
  associateLabelsToRuns,
  parseScaleBarFromText,
  pdfTextItemsFromContent,
} from "../../shared/floorPlanGeometry.mjs";
import { api } from "./api.js";
import { ocrFloorPlanImage } from "./planOcr.js";

export const MAX_FLOOR_PLAN_BYTES = 12 * 1024 * 1024;
export const FLOOR_PLAN_ACCEPT =
  "image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.pdf,text/plain,.txt";
export const DEFAULT_FLOOR_PLAN_LONG_EDGE_M = 24;
export const DEFAULT_CEILING_M = 3.2;

let pdfModulePromise = null;

async function loadPdfJs() {
  if (!pdfModulePromise) {
    pdfModulePromise = (async () => {
      const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfModulePromise;
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => resolve(reader.result);
    reader.readAsArrayBuffer(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
  });
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export function imageNaturalSize(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth || 0,
        height: img.naturalHeight || 0,
      });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

/** Derive suggested store envelope from aspect — longer edge = DEFAULT_FLOOR_PLAN_LONG_EDGE_M. */
export function dimensionsFromFloorPlanAspect(aspect) {
  return dimensionsFromAspect(aspect, DEFAULT_FLOOR_PLAN_LONG_EDGE_M);
}

export function isPdfFile(file) {
  if (!file) return false;
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  return type === "application/pdf" || name.endsWith(".pdf");
}

function isPlainTextPlan(file) {
  if (!file) return false;
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  return type === "text/plain" || name.endsWith(".txt");
}

function isSvgFile(file) {
  if (!file) return false;
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  return type === "image/svg+xml" || name.endsWith(".svg");
}

function inferSourceType(fileName, pdf, plain = false) {
  if (pdf) return "pdf";
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".svg")) return "svg";
  if (plain || lower.endsWith(".txt")) return "text";
  return "image";
}

async function extractPdfPageMeta(arrayBuffer) {
  const { getDocument } = await loadPdfJs();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  if (!pdf.numPages) throw new Error("PDF has no pages.");
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  const text = content.items.map((i) => i.str).join("\n");
  const vp = page.getViewport({ scale: 1 });
  const textItems = pdfTextItemsFromContent(content, vp);
  return {
    text,
    textItems,
    pageWidth: vp.width,
    pageHeight: vp.height,
    pageCount: pdf.numPages,
    aspect: vp.width > 0 && vp.height > 0 ? vp.width / vp.height : null,
  };
}

function applyPdfGeometry(fixturePlan, textItems, pageWidth, pageHeight, widthMeters, depthMeters) {
  if (!textItems?.length || !fixturePlan?.runs?.length) return fixturePlan;
  associateLabelsToRuns(fixturePlan.runs, textItems, {
    pageWidth,
    pageHeight,
    widthMeters,
    depthMeters,
  });
  return fixturePlan;
}

async function readFileAsBase64(file) {
  const dataUrl = await readAsDataUrl(file);
  return dataUrl;
}

async function tryServerAnalyze(file, token) {
  if (!token) return null;
  const raster = !isPdfFile(file) && !isSvgFile(file) && !isPlainTextPlan(file);
  if (!raster) return null;
  if (import.meta.env.VITE_PLAN_FIXTURE_SERVER_ANALYZE === "false") return null;
  try {
    const dataBase64 = await readFileAsBase64(file);
    return await api("/layouts/analyze-plan", {
      token,
      method: "POST",
      body: {
        fileName: file.name,
        mimeType: file.type,
        dataBase64,
      },
    });
  } catch (err) {
    if (err.status === 501 || err.status === 503) return null;
    throw err;
  }
}

function mergeAnalyzeWithServer(local, server) {
  if (!server?.fixturePlan) return local;
  const textContent = server.textContent || local.floorPlanTextContent || "";
  const widthMeters = server.widthMeters ?? local.widthMeters;
  const depthMeters = server.depthMeters ?? local.depthMeters;
  const merged = analyzePlanTextShared(textContent, {
    fileName: local.floorPlanSourceFileName || local.floorPlanFileName,
    aspect: local.floorPlanAspect,
  });
  const fixturePlan = {
    ...server.fixturePlan,
    runs: merged.fixturePlan.runs?.length ? merged.fixturePlan.runs : server.fixturePlan.runs,
    warnings: merged.fixturePlan.warnings,
    aisleHints: merged.fixturePlan.aisleHints,
    layoutTemplate: merged.fixturePlan.layoutTemplate,
  };
  return {
    ...local,
    widthMeters: merged.widthMeters ?? widthMeters,
    depthMeters: merged.depthMeters ?? depthMeters,
    fixturePlan,
    floorPlanImportMode: resolveFloorPlanImportMode(fixturePlan),
    floorPlanTextContent: textContent,
    floorPlanEnvelopeDerived: merged.floorPlanEnvelopeDerived,
    floorPlanEnvelopeConfirmed: !merged.floorPlanEnvelopeDerived,
  };
}

function dimensionSourceLabel(source) {
  if (source === "text") return "text in file";
  if (source === "svg") return "SVG size attributes";
  if (source === "filename") return "file name";
  if (source === "aspect") return "drawing aspect ratio";
  if (source === "scale") return "drawing scale + fixture runs";
  return "manual";
}

/** Build API-ready floorPlanImport fragment from analyze draft fields. */
export function floorPlanImportPayloadFromDraft(draft) {
  const base = {
    sourceFileName: draft.floorPlanSourceFileName || draft.floorPlanFileName,
    sourceType: draft.floorPlanSourceType || "image",
    dimensionSource: draft.floorPlanDimensionSource || "manual",
    matchedText: draft.floorPlanMatchedText || null,
    pageIndex: draft.floorPlanPageIndex ?? 0,
  };
  const plan = draft.fixturePlan;
  const useFixture =
    draft.floorPlanImportMode === "fixture" && Array.isArray(plan?.runs) && plan.runs.length > 0;
  if (!useFixture) {
    return { ...base, importMode: "envelope" };
  }
  return {
    ...base,
    importMode: "fixture",
    parserVersion: plan.parserVersion,
    scale: plan.scale,
    runs: plan.runs,
    aisleHints: plan.aisleHints,
    warnings: plan.warnings,
    planText: draft.floorPlanTextContent || null,
  };
}

/**
 * Analyze upload: extract dimensions from file content. Does not store or preview the raster.
 */
export async function analyzeFloorPlanUpload(file, { token, onPhase } = {}) {
  if (!file) throw new Error("No file selected.");
  if (file.size > MAX_FLOOR_PLAN_BYTES) {
    throw new Error("Floor plan must be under 12 MB.");
  }

  const pdf = isPdfFile(file);
  const svg = isSvgFile(file);
  const plain = isPlainTextPlan(file);
  const sourceFileName = file.name || (pdf ? "floor-plan.pdf" : svg ? "floor-plan.svg" : "floor-plan.png");
  const sourceType = inferSourceType(sourceFileName, pdf, plain);

  let textContent = "";
  let aspect = null;
  let pageCount = 1;
  let textItems = [];
  let pageWidth = null;
  let pageHeight = null;

  if (pdf) {
    const buffer = await readAsArrayBuffer(file);
    const meta = await extractPdfPageMeta(buffer);
    textContent = meta.text;
    textItems = meta.textItems;
    pageWidth = meta.pageWidth;
    pageHeight = meta.pageHeight;
    aspect = meta.aspect;
    pageCount = meta.pageCount;
  } else if (svg || plain) {
    textContent = await readAsText(file);
  } else {
    const dataUrl = await readAsDataUrl(file);
    const nat = await imageNaturalSize(dataUrl);
    aspect = nat.width > 0 && nat.height > 0 ? nat.width / nat.height : null;
    onPhase?.("ocr");
    try {
      const ocrText = await ocrFloorPlanImage(file);
      if (String(ocrText || "").trim()) {
        textContent = ocrText;
      }
    } catch {
      // OCR optional — envelope + Smart Generate still available
    }
    onPhase?.("parse");
  }

  const fromText = parseStoreDimensionsFromText(textContent);
  const fromSvg = svg ? parseStoreDimensionsFromSvgMarkup(textContent) : { source: "none" };
  const fromName = parseStoreDimensionsFromFileName(sourceFileName);
  const parsed = mergeDimensionCandidates(fromText, fromSvg, fromName);

  const analyzed = analyzePlanTextShared(textContent, { fileName: sourceFileName, aspect });
  let {
    fixturePlan,
    widthMeters,
    depthMeters,
    floorPlanImportMode,
    dimensionSource,
    matchedText,
    floorPlanEnvelopeDerived,
    scaleParse,
  } = analyzed;

  if (parsed.widthMeters && parsed.depthMeters) {
    widthMeters = parsed.widthMeters;
    depthMeters = parsed.depthMeters;
    dimensionSource = parsed.source;
    matchedText = parsed.matched;
    floorPlanEnvelopeDerived = false;
    enrichSimplifiedPlanImport(textContent, fixturePlan, widthMeters, depthMeters);
    floorPlanImportMode = resolveFloorPlanImportMode(fixturePlan);
  } else if (dimensionSource === "none" || !dimensionSource) {
    dimensionSource = parsed.source !== "none" ? parsed.source : aspect ? "aspect" : "manual";
  }

  fixturePlan = applyPdfGeometry(
    fixturePlan,
    textItems,
    pageWidth,
    pageHeight,
    widthMeters,
    depthMeters
  );

  if (fixturePlan.layoutTemplate) {
    enrichSimplifiedPlanImport(textContent, fixturePlan, widthMeters, depthMeters);
    floorPlanImportMode = resolveFloorPlanImportMode(fixturePlan);
  }

  let result = {
    footprintMode: "floorPlan",
    floorPlanAnalyzed: true,
    floorPlanFileName: sourceFileName,
    floorPlanSourceFileName: sourceFileName,
    floorPlanSourceType: sourceType,
    floorPlanPageIndex: 0,
    floorPlanPageCount: pageCount,
    floorPlanAspect: aspect,
    floorPlanDimensionSource: dimensionSource,
    floorPlanDimensionSourceLabel: dimensionSourceLabel(dimensionSource),
    floorPlanMatchedText: matchedText,
    widthMeters,
    depthMeters,
    shape: "rectangle",
    fixturePlan,
    floorPlanImportMode,
    floorPlanEnvelopeDerived,
    floorPlanEnvelopeConfirmed: !floorPlanEnvelopeDerived,
    floorPlanScaleRatio: scaleParse.ratio,
    floorPlanScaleMatched: scaleParse.matched,
    floorPlanTextContent: textContent,
    floorPlanOcrUsed: sourceType === "image" && Boolean(textContent.trim()),
  };

  const server = await tryServerAnalyze(file, token);
  if (server) result = mergeAnalyzeWithServer(result, server);
  return result;
}

/** @internal Test hook — parse fixture plan from raw plan text (PDF extract). */
export function analyzePlanTextContent(textContent, options = {}) {
  return analyzePlanTextShared(textContent, options);
}

/** @deprecated Use analyzeFloorPlanUpload — no image is sent to the API. */
export async function ingestFloorPlanUpload(file) {
  return analyzeFloorPlanUpload(file);
}
