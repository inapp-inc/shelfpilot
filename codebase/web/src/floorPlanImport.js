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

export const MAX_FLOOR_PLAN_BYTES = 12 * 1024 * 1024;
export const FLOOR_PLAN_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.pdf";
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
  const longEdge = DEFAULT_FLOOR_PLAN_LONG_EDGE_M;
  if (!aspect || !Number.isFinite(aspect) || aspect <= 0) {
    return { widthMeters: longEdge, depthMeters: Math.round((longEdge * 2) / 3 * 10) / 10 };
  }
  if (aspect >= 1) {
    return {
      widthMeters: longEdge,
      depthMeters: Math.max(1, Math.round((longEdge / aspect) * 10) / 10),
    };
  }
  return {
    widthMeters: Math.max(1, Math.round(longEdge * aspect * 10) / 10),
    depthMeters: longEdge,
  };
}

export function isPdfFile(file) {
  if (!file) return false;
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  return type === "application/pdf" || name.endsWith(".pdf");
}

function isSvgFile(file) {
  if (!file) return false;
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  return type === "image/svg+xml" || name.endsWith(".svg");
}

function inferSourceType(fileName, pdf) {
  if (pdf) return "pdf";
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".svg")) return "svg";
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
  return {
    text,
    pageCount: pdf.numPages,
    aspect: vp.width > 0 && vp.height > 0 ? vp.width / vp.height : null,
  };
}

function dimensionSourceLabel(source) {
  if (source === "text") return "text in file";
  if (source === "svg") return "SVG size attributes";
  if (source === "filename") return "file name";
  if (source === "aspect") return "drawing aspect ratio";
  return "manual";
}

/**
 * Analyze upload: extract dimensions from file content. Does not store or preview the raster.
 */
export async function analyzeFloorPlanUpload(file) {
  if (!file) throw new Error("No file selected.");
  if (file.size > MAX_FLOOR_PLAN_BYTES) {
    throw new Error("Floor plan must be under 12 MB.");
  }

  const pdf = isPdfFile(file);
  const svg = isSvgFile(file);
  const sourceFileName = file.name || (pdf ? "floor-plan.pdf" : svg ? "floor-plan.svg" : "floor-plan.png");
  const sourceType = inferSourceType(sourceFileName, pdf);

  let textContent = "";
  let aspect = null;
  let pageCount = 1;

  if (pdf) {
    const buffer = await readAsArrayBuffer(file);
    const meta = await extractPdfPageMeta(buffer);
    textContent = meta.text;
    aspect = meta.aspect;
    pageCount = meta.pageCount;
  } else if (svg) {
    textContent = await readAsText(file);
  } else {
    const dataUrl = await readAsDataUrl(file);
    const nat = await imageNaturalSize(dataUrl);
    aspect = nat.width > 0 && nat.height > 0 ? nat.width / nat.height : null;
  }

  const fromText = parseStoreDimensionsFromText(textContent);
  const fromSvg = svg ? parseStoreDimensionsFromSvgMarkup(textContent) : { source: "none" };
  const fromName = parseStoreDimensionsFromFileName(sourceFileName);
  const parsed = mergeDimensionCandidates(fromText, fromSvg, fromName);

  const aspectDims = dimensionsFromFloorPlanAspect(aspect);
  const widthMeters = parsed.widthMeters ?? aspectDims.widthMeters;
  const depthMeters = parsed.depthMeters ?? aspectDims.depthMeters;
  const dimensionSource = parsed.source !== "none" ? parsed.source : aspect ? "aspect" : "manual";

  return {
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
    floorPlanMatchedText: parsed.matched || null,
    widthMeters,
    depthMeters,
    shape: "rectangle",
  };
}

/** @deprecated Use analyzeFloorPlanUpload — no image is sent to the API. */
export async function ingestFloorPlanUpload(file) {
  return analyzeFloorPlanUpload(file);
}
