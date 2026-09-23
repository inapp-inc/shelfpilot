/**
 * Validate fixture plan import payload (POST /layouts floorPlanImport).
 * @see Docs/PLAN_IMPORT_FIXTURE_LAYOUT_SPEC.md §8
 * @see Docs/openapi.yaml — components/schemas/FloorPlanImport
 */

export const MAX_FIXTURE_RUNS = 500;
export const MAX_WARNINGS = 100;

const VALID_KINDS = new Set([
  "ambient_gondola",
  "gondola",
  "basket",
  "chiller",
  "freezer",
  "low_level",
  "unknown",
]);
const VALID_IMPORT_MODES = new Set(["fixture", "envelope"]);

function isFiniteNum(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < min || v > max) return false;
  return true;
}

function validateRun(run, index) {
  if (!run || typeof run !== "object") {
    return { ok: false, error: "invalid_run", detail: `runs[${index}] must be an object` };
  }
  if (run.kind && !VALID_KINDS.has(run.kind)) {
    return { ok: false, error: "invalid_run_kind", detail: `runs[${index}].kind` };
  }
  if (run.lengthMeters != null && !isFiniteNum(run.lengthMeters, 0.01, 120)) {
    return { ok: false, error: "invalid_run_length", detail: `runs[${index}].lengthMeters` };
  }
  if (run.depthMeters != null && !isFiniteNum(run.depthMeters, 0.05, 5)) {
    return { ok: false, error: "invalid_run_depth", detail: `runs[${index}].depthMeters` };
  }
  if (run.geometry != null && typeof run.geometry !== "object") {
    return { ok: false, error: "invalid_run_geometry", detail: `runs[${index}].geometry` };
  }
  return { ok: true };
}

/**
 * @param {object} payload floorPlanImport body fragment
 * @returns {{ ok: true, value: object } | { ok: false, error: string, detail?: string }}
 */
export function validateFixtureImportPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "invalid_floor_plan_import", detail: "expected object" };
  }

  if (payload.importMode != null && !VALID_IMPORT_MODES.has(payload.importMode)) {
    return { ok: false, error: "invalid_import_mode", detail: String(payload.importMode) };
  }

  const runs = Array.isArray(payload.runs) ? payload.runs : [];
  if (payload.importMode === "fixture" && runs.length === 0) {
    return { ok: false, error: "fixture_import_empty_runs", detail: "importMode fixture requires runs" };
  }
  if (runs.length > MAX_FIXTURE_RUNS) {
    return { ok: false, error: "too_many_runs", detail: String(runs.length) };
  }

  for (let i = 0; i < runs.length; i += 1) {
    const check = validateRun(runs[i], i);
    if (!check.ok) return check;
  }

  if (Array.isArray(payload.warnings) && payload.warnings.length > MAX_WARNINGS) {
    return { ok: false, error: "too_many_warnings", detail: String(payload.warnings.length) };
  }

  return { ok: true, value: payload };
}

/** HTTP status for validation failures (used by PI-05 create branch). */
export function fixtureImportValidationStatus(code) {
  if (code === "fixture_import_empty_runs" || code === "invalid_run_length") return 400;
  return 400;
}
