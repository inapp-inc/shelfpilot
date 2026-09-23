/**
 * Placement template for simplified retail plans (e.g. Docs/plan/newLayout.png):
 * north refrigeration row, centre gondola islands, south ambient run.
 */

const WORD_TO_N = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

function parseCount(token) {
  const t = String(token || "").toLowerCase();
  if (WORD_TO_N[t]) return WORD_TO_N[t];
  const n = Number(t);
  return Number.isFinite(n) && n >= 1 && n <= 12 ? Math.floor(n) : null;
}

function readSpacingMeters(text, patterns, fallback) {
  const raw = String(text || "");
  for (const re of patterns) {
    re.lastIndex = 0;
    const m = re.exec(raw);
    if (m) {
      const v = Number(m[1]);
      if (Number.isFinite(v) && v >= 0.8 && v <= 5) return v;
    }
  }
  return fallback;
}

export function isSimplifiedRetailPlanText(text) {
  const raw = String(text || "");
  return (
    /\b(?:store\s+layout\s+plan|simplified\s+for\s+layout\s+planning)\b/i.test(raw) ||
    (/\bgondola\s+islands?\b/i.test(raw) &&
      (/\b\d+\s*[x×]\s*chiller\b/i.test(raw) || /\bambient\s+shelves?\b/i.test(raw)))
  );
}

/**
 * Expand counted equipment, ambient shelves L×D, and gondola island count into concrete runs.
 * Mutates `runs` array and returns meta for geometry.
 */
export function expandSimplifiedPlanRuns(text, runs, pushRun, warnings) {
  const raw = String(text || "");
  if (!isSimplifiedRetailPlanText(raw) && !/\b\d+\s*[x×]\s*(?:CHILLER|FREEZER)/i.test(raw)) {
    return { islandCount: 0 };
  }

  let islandCount = 0;
  const islandM = raw.match(/\b(one|two|three|four|\d+)\s+gondola\s+islands?\b/i);
  if (islandM) {
    islandCount = parseCount(islandM[1]) || 0;
  }

  const countedRe =
    /\b(\d+)\s*[x×]\s*(CHILLER|FREEZER)s?\b[^.\n]{0,50}?(\d+(?:\.\d+)?)\s*m\s*[x×]\s*(\d+(?:\.\d+)?)\s*m/gi;
  let cm;
  const countedKinds = new Set();
  while ((cm = countedRe.exec(raw)) !== null) {
    const count = parseCount(cm[1]) || Number(cm[1]);
    const kind = cm[2].toUpperCase() === "CHILLER" ? "chiller" : "freezer";
    const lengthM = Number(cm[3]);
    const depthM = Number(cm[4]);
    if (!Number.isFinite(count) || count < 1 || count > 12) continue;
    countedKinds.add(kind);
    for (let i = 0; i < count; i += 1) {
      pushRun({
        label: `${kind === "chiller" ? "CHILLER" : "FREEZER"} ${i + 1}`,
        kind,
        lengthMeters: lengthM,
        depthMeters: depthM,
        confidence: 0.93,
        layoutRole: kind === "chiller" ? "north_row" : "north_row",
      });
    }
  }

  const ambientShelvesRe =
    /\bambient\s+shelves?\s+(\d+(?:\.\d+)?)\s*m\s*[x×]\s*(\d+(?:\.\d+)?)\s*m/gi;
  let am;
  while ((am = ambientShelvesRe.exec(raw)) !== null) {
    pushRun({
      label: am[0].trim(),
      kind: "ambient_gondola",
      lengthMeters: Number(am[1]),
      depthMeters: Number(am[2]),
      confidence: 0.94,
      layoutRole: "south_run",
    });
  }

  if (islandCount > 0) {
    for (let i = 0; i < islandCount; i += 1) {
      pushRun({
        label: `Gondola island ${i + 1}`,
        kind: "gondola",
        lengthMeters: null,
        depthMeters: 1,
        confidence: 0.88,
        layoutRole: "centre_island",
        islandIndex: i,
      });
    }
  }

  if (countedKinds.size) {
    for (let i = runs.length - 1; i >= 0; i -= 1) {
      const r = runs[i];
      if (
        (r.kind === "chiller" || r.kind === "freezer") &&
        countedKinds.has(r.kind) &&
        !r.layoutRole
      ) {
        runs.splice(i, 1);
      }
    }
  }

  if (islandCount && !runs.some((r) => r.layoutRole === "centre_island")) {
    warnings.push("gondola_islands_not_expanded");
  }

  return { islandCount };
}

/**
 * Assign anchor positions inside store envelope (x → width, y → depth, origin top-left).
 */
export function applySimplifiedRetailGeometry(runs, widthMeters, depthMeters, text) {
  const W = Number(widthMeters) || 24;
  const D = Number(depthMeters) || 14;
  const margin = 0.75;
  const raw = String(text || "");

  const islandGap = readSpacingMeters(
    raw,
    [/spacing\s+between\s+gondola\s+islands?\s+(\d+(?:\.\d+)?)\s*m/i],
    2.4
  );
  const northAisle = readSpacingMeters(
    raw,
    [/aisle\s+to\s+freezers?\s+(\d+(?:\.\d+)?)\s*m/i],
    1.5
  );
  const southAisle = readSpacingMeters(
    raw,
    [/aisle\s+to\s+ambient\s+shelves?\s+(\d+(?:\.\d+)?)\s*m/i],
    2.4
  );

  const northRow = runs.filter((r) => r.layoutRole === "north_row" || (r.kind === "chiller" || r.kind === "freezer") && !r.layoutRole);
  const southRun = runs.find((r) => r.layoutRole === "south_run" || (r.kind === "ambient_gondola" && r.lengthMeters >= 8));
  const islands = runs.filter((r) => r.layoutRole === "centre_island" || (r.kind === "gondola" && r.islandIndex != null));

  if (!northRow.length && !southRun && !islands.length) return false;

  if (northRow.length) {
    const unitLen = northRow.map((r) => Number(r.lengthMeters) || 3.1);
    const unitDepth = Math.max(...northRow.map((r) => Number(r.depthMeters) || 0.9));
    const totalLen = unitLen.reduce((a, b) => a + b, 0);
    let x = Math.max(margin, (W - totalLen) / 2);
    const y = margin;
    northRow.forEach((run, idx) => {
      const len = unitLen[idx] || 3.1;
      const depth = Number(run.depthMeters) || unitDepth;
      run.geometry = {
        anchorX: Math.round(x * 100) / 100,
        anchorY: y,
        rotationDeg: 0,
        centerXMeters: Math.round((x + len / 2) * 100) / 100,
        centerYMeters: Math.round((y + depth / 2) * 100) / 100,
      };
      run.lengthMeters = len;
      run.depthMeters = depth;
      x += len;
    });
  }

  if (southRun) {
    const len = Number(southRun.lengthMeters) || 12;
    const depth = Number(southRun.depthMeters) || 1;
    const x = Math.max(margin, (W - len) / 2);
    const y = D - margin - depth;
    southRun.geometry = {
      anchorX: Math.round(x * 100) / 100,
      anchorY: Math.round(y * 100) / 100,
      rotationDeg: 0,
      centerXMeters: Math.round((x + len / 2) * 100) / 100,
      centerYMeters: Math.round((y + depth / 2) * 100) / 100,
    };
  }

  if (islands.length) {
    const northDepth = northRow.length
      ? Math.max(...northRow.map((r) => Number(r.depthMeters) || 0.9))
      : 0.9;
    const southDepth = southRun ? Number(southRun.depthMeters) || 1 : 1;
    const gondolaTop = margin + northDepth + northAisle;
    const gondolaBottom = D - margin - southDepth - southAisle;
    const spanY = Math.max(3, gondolaBottom - gondolaTop);
    const islandDepthX = 1;
    const clusterW = islands.length * islandDepthX + Math.max(0, islands.length - 1) * islandGap;
    let startX = Math.max(margin, (W - clusterW) / 2);

    islands.forEach((run, idx) => {
      const x = startX + idx * (islandDepthX + islandGap);
      run.lengthMeters = Math.round(spanY * 100) / 100;
      run.depthMeters = islandDepthX;
      run.geometry = {
        anchorX: Math.round(x * 100) / 100,
        anchorY: Math.round(gondolaTop * 100) / 100,
        rotationDeg: 90,
        centerXMeters: Math.round((x + islandDepthX / 2) * 100) / 100,
        centerYMeters: Math.round((gondolaTop + spanY / 2) * 100) / 100,
      };
    });
  }

  return true;
}

export function enrichSimplifiedPlanImport(text, plan, widthMeters, depthMeters) {
  if (!plan?.runs?.length && !isSimplifiedRetailPlanText(text)) return plan;
  applySimplifiedRetailGeometry(plan.runs, widthMeters, depthMeters, text);
  for (const run of plan.runs) {
    delete run.layoutRole;
    delete run.islandIndex;
  }
  if (isSimplifiedRetailPlanText(text)) {
    plan.importMode = plan.runs.length > 0 ? "fixture" : plan.importMode;
    plan.layoutTemplate = "simplified_retail_v1";
  }
  return plan;
}
