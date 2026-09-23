/**
 * Build layout aisles/shelves from parsed fixture import runs.
 *
 * Geometry: when runs include `geometry.anchorX/Y` (from PDF text, SEED-PI-08), shelves use
 * those coordinates; otherwise left-to-right grid placement inside the envelope.
 */
import { randomUUID } from "node:crypto";
import { fullStorePolygon } from "./floorPlanImport.js";
import { levelsForType } from "./layoutPacker.js";
import { finalizeAisleShelfBinding } from "./aisleBinding.js";
import { guaranteeEveryShelfHasAisle, enforceAisleMinimums } from "./aisleCoverage.js";
import { finalizeAisleLabeling } from "./aisleLabeling.js";
import { entityInsideLayout } from "./polygonContainment.js";
import {
  PARSER_VERSION,
  deriveStoreEnvelopeFromRuns,
} from "../../../shared/floorPlanFixtures.mjs";
import { validateFixtureImportPayload } from "./planFixtureImportSchema.js";
import { parseBackOfHouseObstacles } from "../../../shared/floorPlanGeometry.mjs";
import { normalizeObstacle } from "./obstacles.js";

export { deriveStoreEnvelopeFromRuns };

const DEFAULT_MARGIN_M = 1.5;
const DEFAULT_AISLE_M = 1.5;

function resolveFixtureType(run, templates) {
  const allowed = new Set((templates || []).map((t) => t.type));
  const pick = (...candidates) => candidates.find((c) => allowed.has(c)) || candidates[0] || "gondola";

  switch (run.kind) {
    case "freezer":
      return { type: pick("frozen", "chilled", "gondola"), temperatureZone: "frozen" };
    case "chiller":
      return { type: pick("chilled", "gondola"), temperatureZone: "chilled" };
    case "low_level":
      return { type: pick("gondola", "shelf"), temperatureZone: "ambient" };
    case "ambient_gondola":
    case "gondola":
      return { type: pick("gondola", "ambient", "shelf"), temperatureZone: "ambient" };
    case "basket":
      return { type: pick("gondola", "shelf"), temperatureZone: "ambient" };
    default:
      return { type: pick("gondola", "shelf"), temperatureZone: "ambient" };
  }
}

function displayLabelForRun(run) {
  let label = String(run.label || "Imported run").trim();
  const extras = [];
  if (run.doorCount != null && !/\bdoors?\b/i.test(label)) {
    extras.push(`${run.doorCount} doors`);
  }
  if (run.bayCount != null && !/\bbays?\b/i.test(label)) {
    extras.push(`${run.bayCount} bays`);
  }
  if (extras.length) label = `${label} · ${extras.join(" · ")}`;
  return label;
}

function shelfFromRun(run, x, y, templates, layoutHeight) {
  const { type, temperatureZone } = resolveFixtureType(run, templates);
  const tmpl = (templates || []).find((t) => t.type === type) || {};
  const usable = Number(run.lengthMeters) || Number(tmpl.defaultWidthMeters) || 1.2;
  const depth = Number(run.depthMeters) || Number(tmpl.defaultDepthMeters) || 0.6;
  const height = Number(layoutHeight) || Number(tmpl.defaultHeightMeters) || 2;
  const levelCount = run.levelCount ?? run.bayCount ?? tmpl.defaultLevels ?? 3;

  const rotationDeg = Number(run.geometry?.rotationDeg) || 0;

  return {
    id: run.id?.startsWith("run-") ? `shf-${run.id.slice(4)}` : `shf-${randomUUID().slice(0, 6)}`,
    type,
    label: displayLabelForRun(run),
    usableWidthMeters: usable,
    widthMeters: usable,
    depthMeters: depth,
    heightMeters: height,
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    rotationDeg,
    aisleId: null,
    categoryId: null,
    temperatureZone,
    doubleSided: false,
    pairId: null,
    pairRole: null,
    faces: [{ id: "A", categoryId: null, planogram: [], facingDeg: 0 }],
    levels: levelsForType(tmpl.baseKind || type, height, levelCount),
    planogram: [],
    importRunId: run.id || null,
  };
}

function placeRunsWithGeometry(runs, layout, marginM, minAisleM) {
  const shelves = [];
  let x = marginM;
  let y = marginM;
  let rowDepth = 0;
  const w = Number(layout.widthMeters) || 24;

  for (const run of runs) {
    const g = run.geometry;
    const lengthM = Number(run.lengthMeters) || 1.2;
    const depthM = Number(run.depthMeters) || 0.6;
    let px;
    let py;
    if (g?.anchorX != null || g?.centerXMeters != null) {
      px = g?.anchorX != null ? Number(g.anchorX) : (Number(g.centerXMeters) || marginM) - lengthM / 2;
      py = g?.anchorY != null ? Number(g.anchorY) : (Number(g.centerYMeters) || marginM) - depthM / 2;
    } else {
      if (x + lengthM > w - marginM && x > marginM) {
        x = marginM;
        y += rowDepth + minAisleM;
        rowDepth = 0;
      }
      px = x;
      py = y;
      x += lengthM + minAisleM;
      rowDepth = Math.max(rowDepth, depthM);
    }
    shelves.push(
      shelfFromRun(run, Math.max(marginM, px), Math.max(marginM, py), layout._fixtureTemplates, layout.heightMeters)
    );
  }
  return shelves;
}

function placeRunsInGrid(runs, layout, minAisleM, marginM) {
  const shelves = [];
  const w = Number(layout.widthMeters) || 24;
  let x = marginM;
  let y = marginM;
  let rowDepth = 0;

  for (const run of runs) {
    const lengthM = Number(run.lengthMeters) || 1.2;
    const depthM = Number(run.depthMeters) || 0.6;
    if (x + lengthM > w - marginM && x > marginM) {
      x = marginM;
      y += rowDepth + minAisleM;
      rowDepth = 0;
    }
    shelves.push(shelfFromRun(run, x, y, layout._fixtureTemplates, layout.heightMeters));
    x += lengthM + minAisleM;
    rowDepth = Math.max(rowDepth, depthM);
  }
  return shelves;
}

function createWalkAisles(shelves, layout, minAisleM) {
  const aisles = [];
  if (!shelves.length) return aisles;

  const byY = new Map();
  for (const s of shelves) {
    const key = Number(s.y.toFixed(1));
    if (!byY.has(key)) byY.set(key, []);
    byY.get(key).push(s);
  }

  let n = 0;
  for (const group of byY.values()) {
    const minX = Math.min(...group.map((s) => s.x));
    const maxX = Math.max(...group.map((s) => s.x + (s.usableWidthMeters || 1.2)));
    const y = group[0].y;
    aisles.push({
      id: `aisle-${randomUUID().slice(0, 6)}`,
      name: `Aisle ${++n}`,
      widthMeters: minAisleM,
      lengthMeters: Math.max(2, maxX - minX + minAisleM * 2),
      orientation: "horizontal",
      x: Math.max(0, minX - minAisleM),
      y: Math.max(0, y - minAisleM),
      path: [],
    });
  }
  return aisles;
}

/**
 * @returns {{ shelfCount: number, aisleCount: number, envelopeDerived: boolean, warnings: string[] }}
 */
export function buildLayoutFromFixtureImport(layout, importPayload, options = {}) {
  const validated = validateFixtureImportPayload(importPayload);
  if (!validated.ok) {
    const err = new Error(validated.error);
    err.code = validated.error;
    err.detail = validated.detail;
    throw err;
  }

  const payload = validated.value;
  const runs = payload.runs || [];
  const config = options.config || {};
  const templates = config.fixtureTemplates || options.templates || [];
  layout._fixtureTemplates = templates;

  const aisleHints = payload.aisleHints || [];
  const configMin = Math.max(0.9, Number(config.minAisleWidthMeters) || 1.2);
  const hintMin = aisleHints[0]?.widthMeters;
  const minAisleM = Math.max(configMin, Number.isFinite(hintMin) ? hintMin : DEFAULT_AISLE_M);

  let envelopeDerived = false;
  if (!layout.widthMeters || !layout.depthMeters || layout.widthMeters <= 0) {
    const env = deriveStoreEnvelopeFromRuns(runs, aisleHints);
    layout.widthMeters = env.widthMeters;
    layout.depthMeters = env.depthMeters;
    envelopeDerived = true;
  }

  layout.shape = "polygon";
  layout.polygon = fullStorePolygon(layout.widthMeters, layout.depthMeters);

  const warnings = [...(payload.warnings || [])];

  const geoCount = runs.filter((r) => r.geometry?.centerXMeters != null || r.geometry?.anchorX != null).length;
  const shelves =
    geoCount > 0
      ? placeRunsWithGeometry(runs, layout, DEFAULT_MARGIN_M, minAisleM)
      : placeRunsInGrid(runs, layout, minAisleM, DEFAULT_MARGIN_M);
  let aisles = createWalkAisles(shelves, layout, minAisleM);

  const bohText = payload.planText || "";
  if (bohText) {
    const hints = parseBackOfHouseObstacles(bohText, layout.widthMeters, layout.depthMeters);
    if (hints.length) {
      layout.obstacles = [...(layout.obstacles || []), ...hints.map(normalizeObstacle)];
      warnings.push("boh_obstacles_approximate");
    }
  }

  let bound = finalizeAisleShelfBinding(shelves, aisles, layout);
  const covered = guaranteeEveryShelfHasAisle(bound.shelves, bound.aisles, layout, {
    preferredMinAisle: minAisleM,
    strictMinAisle: false,
  });
  bound = finalizeAisleShelfBinding(covered.shelves, covered.aisles, layout);
  aisles = enforceAisleMinimums(bound.aisles, bound.shelves, layout, minAisleM, { strict: false });
  const labeled = finalizeAisleLabeling(bound.shelves, aisles, layout);

  layout.shelves = labeled.shelves.filter((s) => entityInsideLayout(s, "shelf", layout));
  layout.aisles = labeled.aisles.filter((a) => entityInsideLayout(a, "aisle", layout));
  layout.fixtures = [];
  layout.mappings = [];
  layout.aisleMappings = [];
  layout.shelfMappings = [];

  if (envelopeDerived) warnings.push("store_envelope_derived_from_runs");

  layout.importSource = {
    ...(layout.importSource || {}),
    fixtureImport: {
      importMode: payload.importMode || "fixture",
      scale: payload.scale || null,
      runCount: runs.length,
      warnings: [...new Set(warnings)],
      parserVersion: payload.parserVersion || PARSER_VERSION,
    },
  };

  return {
    shelfCount: layout.shelves.length,
    aisleCount: layout.aisles.length,
    envelopeDerived,
    warnings: [...new Set(warnings)],
  };
}
