/**
 * OCR for raster floor plans (PNG/JPG) — extracts label text for fixture import.
 */

export async function ocrFloorPlanImage(file, { onProgress } = {}) {
  if (!file) return "";
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof onProgress === "function") {
        onProgress(m.progress ?? 0);
      }
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return String(data?.text || "");
  } finally {
    await worker.terminate();
  }
}
