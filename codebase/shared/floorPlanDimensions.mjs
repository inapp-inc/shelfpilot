/**
 * Parse store dimensions from floor-plan file text (PDF text layer, SVG markup, filenames).
 */

const MIN_STORE_M = 3;
const MAX_STORE_M = 500;

function clampDim(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  if (v < MIN_STORE_M || v > MAX_STORE_M) return null;
  return Math.round(v * 10) / 10;
}

function toMeters(value, unit) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  const u = String(unit || "m").toLowerCase();
  if (u === "mm") return v / 1000;
  if (u === "cm") return v / 100;
  if (u === "ft" || u === "feet" || u === "'") return v * 0.3048;
  return v;
}

/** @returns {{ widthMeters: number|null, depthMeters: number|null, source: string, matched?: string }} */
export function parseStoreDimensionsFromText(text) {
  if (!text || typeof text !== "string") {
    return { widthMeters: null, depthMeters: null, source: "none" };
  }
  const flat = text.replace(/\s+/g, " ");

  const patterns = [
    {
      re: /(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(m|metres?|meters?|mm|cm|ft)?/gi,
      pick: (m) => ({
        a: toMeters(m[1], m[3]),
        b: toMeters(m[2], m[3]),
        matched: m[0],
      }),
    },
    {
      re: /(?:length|long)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?|mm|cm)?[^\d]{0,20}(?:width|wide|short|depth)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?|mm|cm)?/gi,
      pick: (m) => ({
        a: toMeters(m[1], "m"),
        b: toMeters(m[2], "m"),
        matched: m[0],
      }),
    },
    {
      re: /(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\s*(?:by|×|x)\s*(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)/gi,
      pick: (m) => ({ a: Number(m[1]), b: Number(m[2]), matched: m[0] }),
    },
  ];

  for (const { re, pick } of patterns) {
    re.lastIndex = 0;
    const m = re.exec(flat);
    if (m) {
      const { a, b, matched } = pick(m);
      const w = clampDim(Math.max(a, b));
      const d = clampDim(Math.min(a, b));
      if (w && d) {
        return { widthMeters: w, depthMeters: d, source: "text", matched: matched?.trim() };
      }
    }
  }

  return { widthMeters: null, depthMeters: null, source: "none" };
}

/** Parse width/height from SVG root when units are present. */
export function parseStoreDimensionsFromSvgMarkup(svgText) {
  if (!svgText || typeof svgText !== "string") {
    return { widthMeters: null, depthMeters: null, source: "none" };
  }
  const widthMatch = svgText.match(/\bwidth=["']([\d.]+)\s*(m|mm|cm|ft)?/i);
  const heightMatch = svgText.match(/\bheight=["']([\d.]+)\s*(m|mm|cm|ft)?/i);
  if (widthMatch && heightMatch) {
    const w = clampDim(toMeters(widthMatch[1], widthMatch[2]));
    const d = clampDim(toMeters(heightMatch[1], heightMatch[2]));
    if (w && d) {
      return {
        widthMeters: w,
        depthMeters: d,
        source: "svg",
        matched: `${widthMatch[0]} ${heightMatch[0]}`,
      };
    }
  }
  return parseStoreDimensionsFromText(svgText);
}

export function parseStoreDimensionsFromFileName(fileName) {
  if (!fileName) return { widthMeters: null, depthMeters: null, source: "none" };
  const base = String(fileName).replace(/\.[^.]+$/, "");
  const m = base.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*m?/i);
  if (!m) return { widthMeters: null, depthMeters: null, source: "none" };
  const w = clampDim(Math.max(Number(m[1]), Number(m[2])));
  const d = clampDim(Math.min(Number(m[1]), Number(m[2])));
  if (w && d) {
    return { widthMeters: w, depthMeters: d, source: "filename", matched: m[0] };
  }
  return { widthMeters: null, depthMeters: null, source: "none" };
}

/** Pick best dimension parse from multiple sources. */
export function mergeDimensionCandidates(...candidates) {
  for (const c of candidates) {
    if (c?.widthMeters && c?.depthMeters) return c;
  }
  return { widthMeters: null, depthMeters: null, source: "none" };
}
