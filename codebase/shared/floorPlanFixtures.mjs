/**
 * Fixture plan import — scale and dimension parsing (PDF text, OCR text).
 *
 * ## Drawing scale (architect notation 1:N)
 * On a paper or PDF plan, **1:N** means one unit measured on the drawing equals
 * **N** units in the built store. Example: **1:50** → 1 mm on the plan = 50 mm
 * real = **0.05 m**.
 *
 * ```js
 * realMetersPerDrawingMillimetre(50) // → 0.05
 * ```
 *
 * PDF text positions use pdf.js viewport units (points at scale 1). Converting
 * text (x, y) to layout metres requires page size + confirmed scale — **SEED-PI-08**.
 *
 * @see Docs/PLAN_IMPORT_FIXTURE_LAYOUT_SPEC.md (FR-SCALE-01, FR-SCALE-02)
 */

import { expandSimplifiedPlanRuns } from "./floorPlanSimplifiedLayout.mjs";

export const PARSER_VERSION = "1.1.0";

const MIN_AISLE_M = 0.8;
const MAX_AISLE_M = 4;
const MIN_MM_EXPLICIT = 50;
const MAX_MM_EXPLICIT = 50000;

/** Real-world metres per one millimetre measured on the drawing at scale 1:N. */
export function realMetersPerDrawingMillimetre(ratio) {
  const n = Number(ratio);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n / 1000;
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ");
}

/**
 * @returns {{ ratio: number|null, method: string, matched: string|null }}
 */
export function parseDrawingScaleFromText(text) {
  const raw = normalizeText(text);
  if (!raw.trim()) {
    return { ratio: null, method: "none", matched: null };
  }

  const patterns = [
    {
      re: /\bscale\s*1\s*[:\/]\s*(\d{1,4})\b/gi,
      method: "text_scale_notation",
    },
    {
      re: /\b1\s*[:\/]\s*(\d{2,4})\b/gi,
      method: "text_scale_notation",
      requireScaleWord: true,
    },
  ];

  for (const { re, method, requireScaleWord } of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(raw)) !== null) {
      if (requireScaleWord) {
        const before = raw.slice(Math.max(0, m.index - 40), m.index).toLowerCase();
        if (!before.includes("scale")) continue;
      }
      const ratio = Number(m[1]);
      if (Number.isFinite(ratio) && ratio >= 2 && ratio <= 5000) {
        return { ratio, method, matched: m[0].trim() };
      }
    }
  }

  return { ratio: null, method: "none", matched: null };
}

function clampMmToMeters(mm) {
  const v = Number(mm);
  if (!Number.isFinite(v) || v < MIN_MM_EXPLICIT || v > MAX_MM_EXPLICIT) return null;
  return Math.round((v / 1000) * 1000) / 1000;
}

/**
 * Explicit millimetre dimensions in plan text (labels, not inferred aisle widths).
 * @returns {{ valueMeters: number, raw: string, context: string }[]}
 */
export function parseMillimetreDimensions(text) {
  const raw = normalizeText(text);
  if (!raw.trim()) return [];

  const out = [];
  const seen = new Set();

  const explicitMm = /(\d{3,5})\s*mm\b/gi;
  let m;
  while ((m = explicitMm.exec(raw)) !== null) {
    const valueMeters = clampMmToMeters(m[1]);
    if (valueMeters == null) continue;
    const key = `${valueMeters}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const start = Math.max(0, m.index - 30);
    const end = Math.min(raw.length, m.index + m[0].length + 30);
    out.push({
      valueMeters,
      raw: m[0].trim(),
      context: raw.slice(start, end).replace(/\s+/g, " ").trim(),
    });
  }

  return out;
}

const AISLE_CONTEXT_RE =
  /\b(aisle|aisles|clearance|circulation|passage|walkway|min\.?\s*width|between\s+gondola)\b/i;

function isPlausibleAisleWidthMeters(valueMeters) {
  return valueMeters >= MIN_AISLE_M && valueMeters <= MAX_AISLE_M;
}

/**
 * Suggested aisle widths from dimension strings (FR-SCALE-02).
 * Ignores bare grid-style numbers without aisle/clearance context.
 * @returns {{ widthMeters: number, source: string, confidence: number }[]}
 */
export function parseAisleWidthHints(text) {
  const raw = normalizeText(text);
  if (!raw.trim()) return [];

  const hints = [];
  const byWidth = new Map();

  function add(widthMeters, source, confidence) {
    if (!isPlausibleAisleWidthMeters(widthMeters)) return;
    const prev = byWidth.get(widthMeters);
    if (!prev || confidence > prev.confidence) {
      byWidth.set(widthMeters, { widthMeters, source, confidence });
    }
  }

  // Explicit: "aisle 1.5m", "clearance 1250mm"
  const labelled = [
    /\b(?:aisle|clearance|circulation|passage)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(m|mm|metres?|meters?)\b/gi,
    /\b(\d+(?:\.\d+)?)\s*(m|mm)\s*(?:wide\s*)?(?:aisle|clearance|circulation)\b/gi,
  ];
  for (const re of labelled) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(raw)) !== null) {
      const unit = (m[2] || "m").toLowerCase();
      const num = Number(m[1]);
      const widthMeters = unit.startsWith("mm") ? num / 1000 : num;
      add(widthMeters, m[0].trim(), 0.95);
    }
  }

  // Context window: 1500 / 1250 near "aisle" or between dimension ticks on plan extracts
  const bareFour = /\b(\d{3,4})\b/g;
  let b;
  while ((b = bareFour.exec(raw)) !== null) {
    const mm = Number(b[1]);
    if (mm < 800 || mm > 3500) continue;
    const windowStart = Math.max(0, b.index - 50);
    const windowEnd = Math.min(raw.length, b.index + b[0].length + 50);
    const window = raw.slice(windowStart, windowEnd);
    if (!AISLE_CONTEXT_RE.test(window)) continue;
    // Skip model-style lines (e.g. KALEA 3750) — four digits after letters without mm
    if (/\b[A-Z]{2,}\s+\d{3,4}\b/.test(window) && !/\bmm\b/i.test(window)) continue;
    add(mm / 1000, b[0], 0.75);
  }

  // Explicit mm in plausible aisle range with weak context (dimension chains)
  for (const { valueMeters, raw: label, context } of parseMillimetreDimensions(raw)) {
    if (!isPlausibleAisleWidthMeters(valueMeters)) continue;
    if (AISLE_CONTEXT_RE.test(context)) {
      add(valueMeters, label, 0.85);
    }
  }

  for (const h of byWidth.values()) hints.push(h);
  hints.sort((a, b) => b.confidence - a.confidence || a.widthMeters - b.widthMeters);
  return hints;
}

/** @typedef {'ambient_gondola'|'gondola'|'basket'|'chiller'|'freezer'|'low_level'|'unknown'} FixtureRunKind */

/**
 * @typedef {Object} FixtureRun
 * @property {string} id
 * @property {string} label
 * @property {FixtureRunKind} kind
 * @property {number|null} lengthMeters
 * @property {number|null} depthMeters
 * @property {number|null} bayCount
 * @property {number|null} levelCount
 * @property {number|null} doorCount
 * @property {number} confidence
 * @property {string|null} suggestedCategoryName
 */

const MIN_RUN_LENGTH_M = 0.5;
const MAX_RUN_LENGTH_M = 80;
const DEFAULT_GONDOLA_DEPTH_M = 0.6;

function clampRunLength(m) {
  const v = Number(m);
  if (!Number.isFinite(v) || v < MIN_RUN_LENGTH_M || v > MAX_RUN_LENGTH_M) return null;
  return Math.round(v * 100) / 100;
}

function clampRunDepth(m) {
  const v = Number(m);
  if (!Number.isFinite(v) || v < 0.1 || v > 5) return null;
  return Math.round(v * 1000) / 1000;
}

function contextSlice(raw, index, len, before = 60, after = 80) {
  return raw
    .slice(Math.max(0, index - before), Math.min(raw.length, index + len + after))
    .replace(/\s+/g, " ")
    .trim();
}

/** Four-digit model length (3750 → 3.75 m) near equipment labels. */
function lengthHintFromContext(context) {
  const mmExplicit = context.match(/\b(\d{4})\b/g);
  if (!mmExplicit) return null;
  for (const token of mmExplicit) {
    const mm = Number(token);
    if (mm >= 1500 && mm <= 15000) {
      const m = clampRunLength(mm / 1000);
      if (m) return m;
    }
  }
  return null;
}

function runKey(run) {
  return `${run.kind}|${run.label}|${run.lengthMeters ?? ""}`;
}

/**
 * Parse fixture runs from architect plan text (FR-FIX-01 … FR-FIX-06).
 * @returns {{ runs: FixtureRun[], warnings: string[], aisleHints: ReturnType<typeof parseAisleWidthHints> }}
 */
export function parseFixtureRunsFromText(text) {
  const raw = normalizeText(text);
  const warnings = [];
  const runs = [];
  const seen = new Set();
  let seq = 0;
  let m;

  function pushRun(partial) {
    const run = {
      id: partial.id || `run-${++seq}`,
      label: partial.label || "Fixture run",
      kind: partial.kind || "unknown",
      lengthMeters: partial.lengthMeters ?? null,
      depthMeters: partial.depthMeters ?? null,
      bayCount: partial.bayCount ?? null,
      levelCount: partial.levelCount ?? null,
      doorCount: partial.doorCount ?? null,
      confidence: partial.confidence ?? 0.7,
      suggestedCategoryName: partial.suggestedCategoryName ?? null,
      textIndex: partial.textIndex ?? null,
      layoutRole: partial.layoutRole ?? null,
      islandIndex: partial.islandIndex ?? null,
    };
    const key = runKey(run);
    if (seen.has(key)) return;
    seen.add(key);
    runs.push(run);
  }

  // GONDOLA 9m (architect shorthand)
  const gondolaRe = /\bGONDOLA(?:\s+(?!islands?\b)[A-Z]{2,8})?\s+(\d+(?:\.\d+)?)\s*m\b/gi;
  while ((m = gondolaRe.exec(raw)) !== null) {
    const lengthMeters = clampRunLength(Number(m[2]));
    if (!lengthMeters) continue;
    pushRun({
      label: m[0].trim(),
      kind: "gondola",
      lengthMeters,
      depthMeters: DEFAULT_GONDOLA_DEPTH_M,
      confidence: 0.9,
      textIndex: m.index,
    });
  }

  // BASKET / BASKET SHELF(ING) optional length
  const basketRe = /\bBASKET(?:\s+(?:SHELF(?:ING)?|UNIT|DISPLAY))?(?:\s+(\d+(?:\.\d+)?)\s*m)?/gi;
  while ((m = basketRe.exec(raw)) !== null) {
    const lengthMeters = m[1] ? clampRunLength(Number(m[1])) : 1.2;
    pushRun({
      label: m[0].trim(),
      kind: "basket",
      lengthMeters: lengthMeters || 1.2,
      depthMeters: 0.5,
      confidence: m[1] ? 0.88 : 0.72,
      textIndex: m.index,
    });
  }

  // AMBIENT 9m / AMBIENT VEG 3m
  const ambientRe = /\bAMBIENT(?:\s+([A-Z]{2,6}))?\s+(\d+(?:\.\d+)?)\s*m\b/gi;
  while ((m = ambientRe.exec(raw)) !== null) {
    const zone = m[1] ? m[1].toUpperCase() : null;
    const lengthMeters = clampRunLength(Number(m[2]));
    if (!lengthMeters) continue;
    pushRun({
      label: m[0].trim(),
      kind: "ambient_gondola",
      lengthMeters,
      depthMeters: DEFAULT_GONDOLA_DEPTH_M,
      confidence: 0.92,
      suggestedCategoryName: zone === "VEG" ? "Produce" : null,
      textIndex: m.index,
    });
  }

  // Low level shelving 11m long 250mm deep
  const lowRe =
    /\blow\s*level\s*shelving\s*(\d+(?:\.\d+)?)\s*m\s*long\s*(\d+(?:\.\d+)?)\s*mm\s*deep/gi;
  while ((m = lowRe.exec(raw)) !== null) {
    const lengthMeters = clampRunLength(Number(m[1]));
    const depthMeters = clampRunDepth(Number(m[2]) / 1000);
    if (!lengthMeters) continue;
    pushRun({
      label: m[0].trim(),
      kind: "low_level",
      lengthMeters,
      depthMeters: depthMeters ?? 0.25,
      confidence: 0.9,
      textIndex: m.index,
    });
  }

  // KALEA FREEZE / CHILLED
  const kaleaRe = /\bKALEA\s+(FREEZE|CHILLED)\b[^.\n]{0,120}/gi;
  while ((m = kaleaRe.exec(raw)) !== null) {
    const ctx = contextSlice(raw, m.index, m[0].length);
    const kind = m[1].toUpperCase() === "FREEZE" ? "freezer" : "chiller";
    const lengthMeters = lengthHintFromContext(ctx);
    pushRun({
      label: m[0].trim().replace(/\s+/g, " "),
      kind,
      lengthMeters,
      depthMeters: DEFAULT_GONDOLA_DEPTH_M,
      confidence: lengthMeters ? 0.88 : 0.65,
      textIndex: m.index,
    });
    if (!lengthMeters) warnings.push("refrigeration_run_missing_length");
  }

  // Standalone CHILLER / MULTIDECK (not already KALEA)
  const chillerRe =
    /\b(?:CHILLER|CHILLED\s+(?:CABINET|CASE|COUNTER)|MULTIDECK(?:\s+CHILL(?:ED)?)?)\b[^.\n]{0,100}/gi;
  while ((m = chillerRe.exec(raw)) !== null) {
    const prefix = raw.slice(Math.max(0, m.index - 8), m.index);
    if (/\bKALEA\s$/i.test(prefix)) continue;
    const ctx = contextSlice(raw, m.index, m[0].length);
    const lengthMeters = lengthHintFromContext(ctx);
    pushRun({
      label: m[0].trim().replace(/\s+/g, " "),
      kind: "chiller",
      lengthMeters,
      depthMeters: DEFAULT_GONDOLA_DEPTH_M,
      confidence: lengthMeters ? 0.82 : 0.62,
      textIndex: m.index,
    });
  }

  // Standalone FREEZER (not KALEA FREEZE)
  const freezerRe = /\b(?:FREEZER|FREEZE\s+(?:CABINET|CASE|COUNTER))\b[^.\n]{0,100}/gi;
  while ((m = freezerRe.exec(raw)) !== null) {
    const prefix = raw.slice(Math.max(0, m.index - 8), m.index);
    if (/\bKALEA\s$/i.test(prefix)) continue;
    const ctx = contextSlice(raw, m.index, m[0].length);
    const lengthMeters = lengthHintFromContext(ctx);
    pushRun({
      label: m[0].trim().replace(/\s+/g, " "),
      kind: "freezer",
      lengthMeters,
      depthMeters: DEFAULT_GONDOLA_DEPTH_M,
      confidence: lengthMeters ? 0.82 : 0.62,
      textIndex: m.index,
    });
  }

  // n DOORS n BAYS — attach to last matching refrigeration run or spawn metadata run
  const doorBayRe = /\b(\d+)\s*DOORS\s*(\d+)\s*BAYS\b/gi;
  const doorBayMeta = [];
  while ((m = doorBayRe.exec(raw)) !== null) {
    doorBayMeta.push({
      doorCount: Number(m[1]),
      bayCount: Number(m[2]),
      index: m.index,
      label: m[0].trim(),
    });
  }
  for (const meta of doorBayMeta) {
    let target = null;
    let bestIdx = -1;
    for (const run of runs) {
      if (run.kind !== "chiller" && run.kind !== "freezer") continue;
      const idx = run.textIndex ?? raw.indexOf(run.label);
      if (idx < 0 || idx > meta.index) continue;
      if (idx > bestIdx) {
        bestIdx = idx;
        target = run;
      }
    }
    if (target) {
      target.doorCount = meta.doorCount;
      target.bayCount = meta.bayCount;
      target.confidence = Math.min(0.98, target.confidence + 0.05);
    } else {
      pushRun({
        label: meta.label,
        kind: "unknown",
        bayCount: meta.bayCount,
        doorCount: meta.doorCount,
        confidence: 0.5,
      });
      warnings.push("doors_bays_without_equipment_kind");
    }
  }

  // n BAYS n SHELVES — attach to latest ambient/low_level missing bayCount
  const bayShelfRe = /\b(\d+)\s*BAYS\s*(\d+)\s*SHELVES\b/gi;
  while ((m = bayShelfRe.exec(raw)) !== null) {
    const bayCount = Number(m[1]);
    const levelCount = Number(m[2]);
    let target = null;
    let bestDist = Infinity;
    for (const run of runs) {
      if (run.kind !== "ambient_gondola" && run.kind !== "low_level" && run.kind !== "gondola") continue;
      if (run.bayCount != null) continue;
      const idx = run.textIndex ?? raw.indexOf(run.label);
      if (idx < 0 || idx > m.index) continue;
      const dist = m.index - idx;
      if (dist < bestDist) {
        bestDist = dist;
        target = run;
      }
    }
    if (target) {
      target.bayCount = bayCount;
      target.levelCount = levelCount;
    } else {
      pushRun({
        label: m[0].trim(),
        kind: "ambient_gondola",
        bayCount,
        levelCount,
        confidence: 0.55,
      });
    }
  }

  expandSimplifiedPlanRuns(raw, runs, pushRun, warnings);

  if (/TILL|CHECKOUT/i.test(raw) && !/\bAMBIENT\b/i.test(raw)) {
    warnings.push("checkout_area_not_imported");
  }

  for (const run of runs) {
    delete run.textIndex;
  }

  const aisleHints = parseAisleWidthHints(raw);
  return { runs, warnings: [...new Set(warnings)], aisleHints };
}

/**
 * Combine scale parse with fixture parse for analyze/create pipeline.
 */
export function mergeFixtureParse(scaleParse, fixtureParse) {
  const runs = fixtureParse?.runs || [];
  return {
    scale: scaleParse || { ratio: null, method: "none", matched: null },
    runs,
    warnings: fixtureParse?.warnings || [],
    aisleHints: fixtureParse?.aisleHints || [],
    importMode: runs.length > 0 ? "fixture" : "envelope",
    parserVersion: PARSER_VERSION,
  };
}

const DEFAULT_MARGIN_M = 1.5;
const DEFAULT_AISLE_M = 1.5;

/** @see FR-SCALE-03 — suggest store L×W when plan has fixture runs but no footprint label */
export function deriveStoreEnvelopeFromRuns(runs, aisleHints = [], marginM = DEFAULT_MARGIN_M) {
  const list = Array.isArray(runs) ? runs : [];
  const aisleGap =
    aisleHints.find((h) => h.widthMeters > 0)?.widthMeters ||
    DEFAULT_AISLE_M;
  let totalRunLength = 0;
  let maxDepth = 0.6;
  for (const run of list) {
    totalRunLength += Number(run.lengthMeters) || 1.2;
    maxDepth = Math.max(maxDepth, Number(run.depthMeters) || 0.6);
  }
  if (!list.length) {
    return { widthMeters: 24, depthMeters: 16 };
  }
  const cols = Math.max(1, Math.ceil(Math.sqrt(list.length)));
  const rows = Math.ceil(list.length / cols);
  const widthMeters = Math.max(
    12,
    totalRunLength / rows + (cols + 1) * aisleGap + marginM * 2
  );
  const depthMeters = Math.max(
    10,
    rows * (maxDepth + aisleGap) + marginM * 2
  );
  return {
    widthMeters: Math.round(widthMeters * 10) / 10,
    depthMeters: Math.round(depthMeters * 10) / 10,
  };
}
