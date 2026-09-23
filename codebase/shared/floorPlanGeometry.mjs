/**
 * Map PDF text positions to fixture run geometry (layout metres).
 * @see SEED-PI-08
 */

/**
 * @param {import('pdfjs-dist').TextContent} content
 * @param {{ width: number, height: number }} viewport
 */
export function pdfTextItemsFromContent(content, viewport) {
  const h = Number(viewport?.height) || 1;
  return (content?.items || [])
    .filter((i) => i?.str && String(i.str).trim())
    .map((i) => {
      const t = i.transform || [1, 0, 0, 1, 0, 0];
      const x = Number(t[4]) || 0;
      const yPdf = Number(t[5]) || 0;
      return {
        str: String(i.str).trim(),
        x,
        y: h - yPdf,
        width: Number(i.width) || 0,
        height: Number(i.height) || 0,
      };
    });
}

function labelMatchScore(runLabel, itemStr) {
  const a = String(runLabel || "").toLowerCase();
  const b = String(itemStr || "").toLowerCase();
  if (!a || !b) return 0;
  if (a === b || a.includes(b) || b.includes(a)) return 1;
  const core = a.replace(/\s+/g, " ").slice(0, 24);
  if (core.length >= 4 && b.includes(core.slice(0, Math.min(12, core.length)))) return 0.85;
  const ambient = a.match(/ambient\s*(\d+(?:\.\d+)?)\s*m/i);
  const itemAmbient = b.match(/ambient\s*(\d+(?:\.\d+)?)\s*m/i);
  if (ambient && itemAmbient && ambient[1] === itemAmbient[1]) return 0.95;
  if (/kalea\s+(freeze|chilled)/i.test(a) && /kalea\s+(freeze|chilled)/i.test(b)) return 0.9;
  return 0;
}

/**
 * Attach geometry.centerXMeters/Y to runs from labelled PDF text positions.
 * @param {object[]} runs
 * @param {{ str: string, x: number, y: number }[]} textItems
 * @param {{ pageWidth: number, pageHeight: number, widthMeters: number, depthMeters: number }} map
 */
export function associateLabelsToRuns(runs, textItems, map) {
  const pw = Number(map.pageWidth) || 1;
  const ph = Number(map.pageHeight) || 1;
  const storeW = Number(map.widthMeters) || 24;
  const storeD = Number(map.depthMeters) || 16;
  const margin = 0.5;

  for (const run of runs || []) {
    let best = null;
    let bestScore = 0;
    for (const item of textItems || []) {
      const score = labelMatchScore(run.label, item.str);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (!best || bestScore < 0.85) continue;

    const cx = (best.x / pw) * storeW;
    const cy = (best.y / ph) * storeD;
    const lengthM = Number(run.lengthMeters) || 1.2;
    const depthM = Number(run.depthMeters) || 0.6;
    run.geometry = {
      centerXMeters: Math.round(Math.min(storeW - margin, Math.max(margin, cx)) * 100) / 100,
      centerYMeters: Math.round(Math.min(storeD - margin, Math.max(margin, cy)) * 100) / 100,
      rotationDeg: 0,
      anchorX: Math.round(Math.max(margin, cx - lengthM / 2) * 100) / 100,
      anchorY: Math.round(Math.max(margin, cy - depthM / 2) * 100) / 100,
    };
  }
  return runs;
}

const BOH_PATTERNS = [
  { re: /\bstore room\b/i, type: "blocked", label: "Store room", w: 4, d: 3 },
  { re: /\bstair(s|case)?\b/i, type: "blocked", label: "Stairs", w: 3, d: 2.5 },
  { re: /\blift\b/i, type: "utility", label: "Lift", w: 2, d: 2 },
  { re: /\belectrical room\b/i, type: "utility", label: "Electrical", w: 2.5, d: 1.8 },
  { re: /\bbakery\b/i, type: "blocked", label: "Bakery", w: 1.6, d: 4 },
  { re: /\blobby\b/i, type: "blocked", label: "Lobby", w: 2.8, d: 2 },
  { re: /\bcheckout\s+area\b/i, type: "blocked", label: "Checkout", w: 6, d: 2.8 },
];

function sizeFromText(text, labelRe, defaults) {
  const raw = String(text || "");
  const lineRe = new RegExp(`${labelRe.source}[^\\n]{0,40}?(\\d+(?:\\.\\d+)?)\\s*m\\s*[x×]\\s*(\\d+(?:\\.\\d+)?)\\s*m`, "i");
  const m = raw.match(lineRe);
  if (m) {
    return { w: Number(m[1]), d: Number(m[2]) };
  }
  return defaults;
}

/** Rough BOH rectangles (upper-right of envelope until PI-08+ vision). */
export function parseBackOfHouseObstacles(text, widthMeters, depthMeters) {
  const raw = String(text || "");
  const W = Number(widthMeters) || 24;
  const D = Number(depthMeters) || 14;
  const obstacles = [];
  let slot = 0;

  function place(type, label, w, d, x, y) {
    obstacles.push({
      id: `obs-boh-${slot + 1}`,
      type,
      label,
      widthMeters: w,
      depthMeters: d,
      x: Math.max(0, x),
      y: Math.max(0, y),
      approximate: true,
    });
    slot += 1;
  }

  if (/\bcheckout\s+area\b/i.test(raw)) {
    const { w, d } = sizeFromText(raw, /\bcheckout\s+area\b/i, { w: 6, d: 2.8 });
    place("blocked", "Checkout", w, d, 0.75, D - d - 0.75);
  }
  if (/\belectrical room\b/i.test(raw)) {
    const { w, d } = sizeFromText(raw, /\belectrical room\b/i, { w: 2.5, d: 1.8 });
    place("utility", "Electrical", w, d, W - w - 0.75, 0.75);
  }
  if (/\bbakery\b/i.test(raw)) {
    const { w, d } = sizeFromText(raw, /\bbakery\b/i, { w: 1.6, d: 4 });
    place("blocked", "Bakery", w, d, W - w - 0.75, (D - d) / 2);
  }
  if (/\blobby\b/i.test(raw)) {
    const { w, d } = sizeFromText(raw, /\blobby\b/i, { w: 2.8, d: 2 });
    place("blocked", "Lobby", w, d, W - w - 0.75, D - d - 0.75);
  }

  for (const { re, type, label, w, d } of BOH_PATTERNS) {
    if (re.source.includes("checkout|electrical|bakery|lobby")) continue;
    if (!re.test(raw)) continue;
    const x = Math.max(0, W - w - 1 - slot * 0.5);
    const y = Math.max(0, D - d - 1);
    place(type, label, w, d, x, y);
  }
  return obstacles;
}

/** Scale bar text e.g. "0  1  2  3  4  5" with "m" nearby → barSpanMeters */
export function parseScaleBarFromText(text) {
  const flat = String(text || "").replace(/\s+/g, " ");
  const mNear = /\b0\b[\s\d]{0,40}\b5\b[\s\S]{0,30}\bm\b/i.test(flat);
  if (!mNear && !/\bscale bar\b/i.test(flat)) {
    return { barSpanMeters: null, confidence: 0, matched: null };
  }
  const nums = flat.match(/\b(\d+(?:\.\d+)?)\b/g);
  if (!nums || nums.length < 2) {
    return { barSpanMeters: null, confidence: 0, matched: null };
  }
  const values = nums.map(Number).filter((n) => Number.isFinite(n));
  const span = Math.max(...values) - Math.min(...values);
  if (span >= 1 && span <= 20) {
    return { barSpanMeters: span, confidence: 0.7, matched: `0–${span} m scale bar` };
  }
  return { barSpanMeters: null, confidence: 0, matched: null };
}
