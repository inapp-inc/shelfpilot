/**
 * Server-side floor plan analyze (PDF text + shared parsers).
 * Raster OCR: PDF text layer only unless PLAN_FIXTURE_OCR_ENABLED (PNG returns guidance).
 */
import {
  mergeDimensionCandidates,
  parseStoreDimensionsFromFileName,
  parseStoreDimensionsFromSvgMarkup,
  parseStoreDimensionsFromText,
} from "../../../shared/floorPlanDimensions.mjs";
import { analyzePlanTextContent } from "../../../shared/planTextAnalyze.mjs";
import { enrichSimplifiedPlanImport } from "../../../shared/floorPlanSimplifiedLayout.mjs";
import { createRequire } from "node:module";
import {
  associateLabelsToRuns,
  parseScaleBarFromText,
  pdfTextItemsFromContent,
} from "../../../shared/floorPlanGeometry.mjs";

const MAX_BYTES = 12 * 1024 * 1024;
const require = createRequire(import.meta.url);

let pdfModulePromise = null;

async function loadPdfJs() {
  if (!pdfModulePromise) {
    pdfModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = require.resolve(
        "pdfjs-dist/legacy/build/pdf.worker.mjs"
      );
      return pdfjs;
    });
  }
  return pdfModulePromise;
}

function inferType(fileName, mimeType) {
  const lower = String(fileName || "").toLowerCase();
  const mime = String(mimeType || "").toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (mime === "image/svg+xml" || lower.endsWith(".svg")) return "svg";
  if (lower.endsWith(".txt")) return "text";
  return "image";
}

async function extractPdfText(buffer) {
  const { getDocument } = await loadPdfJs();
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
  if (!pdf.numPages) throw new Error("PDF has no pages.");
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  const vp = page.getViewport({ scale: 1 });
  const text = content.items.map((i) => i.str).join("\n");
  const textItems = pdfTextItemsFromContent(content, vp);
  return {
    text,
    textItems,
    pageCount: pdf.numPages,
    aspect: vp.width > 0 && vp.height > 0 ? vp.width / vp.height : null,
    pageWidth: vp.width,
    pageHeight: vp.height,
  };
}

export function planFixtureOcrEnabled() {
  const raw = process.env.PLAN_FIXTURE_OCR_ENABLED;
  if (raw == null || raw === "") return false;
  return raw !== "0" && String(raw).toLowerCase() !== "false";
}

/**
 * @param {Buffer} buffer
 * @param {{ fileName?: string, mimeType?: string }} meta
 */
export async function analyzePlanFromUploadBuffer(buffer, meta = {}) {
  if (!buffer || buffer.length > MAX_BYTES) {
    const err = new Error("plan_too_large");
    err.code = "plan_too_large";
    throw err;
  }

  const fileName = meta.fileName || "floor-plan";
  const kind = inferType(fileName, meta.mimeType);
  let textContent = "";
  let textItems = [];
  let aspect = null;
  let pageCount = 1;
  let pageWidth = null;
  let pageHeight = null;
  const warnings = [];

  if (kind === "pdf") {
    const pdfMeta = await extractPdfText(buffer);
    textContent = pdfMeta.text;
    textItems = pdfMeta.textItems;
    aspect = pdfMeta.aspect;
    pageCount = pdfMeta.pageCount;
    pageWidth = pdfMeta.pageWidth;
    pageHeight = pdfMeta.pageHeight;
  } else if (kind === "svg") {
    textContent = buffer.toString("utf8");
  } else if (kind === "text") {
    textContent = buffer.toString("utf8");
  } else if (planFixtureOcrEnabled()) {
    warnings.push("raster_ocr_unavailable_use_pdf");
    return {
      error: "ocr_raster_not_supported",
      detail: "PNG/JPG OCR is not bundled; export the plan as PDF with a text layer or upload .txt extract.",
      warnings,
    };
  } else {
    return {
      error: "ocr_disabled",
      detail: "Set PLAN_FIXTURE_OCR_ENABLED=true for server analyze; raster OCR still requires PDF.",
      warnings: ["ocr_disabled"],
    };
  }

  const fromText = parseStoreDimensionsFromText(textContent);
  const fromSvg = kind === "svg" ? parseStoreDimensionsFromSvgMarkup(textContent) : { source: "none" };
  const fromName = parseStoreDimensionsFromFileName(fileName);
  const parsed = mergeDimensionCandidates(fromText, fromSvg, fromName);

  const analyzed = analyzePlanTextContent(textContent, { fileName, aspect });
  let { fixturePlan, widthMeters, depthMeters } = analyzed;
  if (parsed.widthMeters && parsed.depthMeters) {
    widthMeters = parsed.widthMeters;
    depthMeters = parsed.depthMeters;
    enrichSimplifiedPlanImport(textContent, fixturePlan, widthMeters, depthMeters);
  }

  if (textItems.length && fixturePlan.runs.length && pageWidth && pageHeight) {
    associateLabelsToRuns(fixturePlan.runs, textItems, {
      pageWidth,
      pageHeight,
      widthMeters,
      depthMeters,
    });
    if (fixturePlan.layoutTemplate) {
      enrichSimplifiedPlanImport(textContent, fixturePlan, widthMeters, depthMeters);
    }
  }

  const scaleBar = parseScaleBarFromText(textContent);
  if (scaleBar.barSpanMeters && fixturePlan.scale?.ratio) {
    fixturePlan.scale = {
      ...fixturePlan.scale,
      scaleBarMeters: scaleBar.barSpanMeters,
      scaleBarConfidence: scaleBar.confidence,
    };
  }

  return {
    fileName,
    sourceType: kind === "pdf" ? "pdf" : kind === "svg" ? "svg" : kind === "text" ? "image" : "image",
    widthMeters,
    depthMeters,
    pageCount,
    aspect,
    fixturePlan,
    textItemCount: textItems.length,
    warnings: [...warnings, ...fixturePlan.warnings],
  };
}
