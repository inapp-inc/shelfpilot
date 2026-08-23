/**
 * FR-NAME-01 / SEED-CB-08 — configurable aisle / bay / shelf nomenclature.
 * Default convention reproduces today's `{aisle}{bayLetter}` labels (e.g. 4A, 4B).
 */

const SHELF_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const DEFAULT_NAMING_CONVENTION = Object.freeze({
  aislePattern: "{n}",
  bayPattern: "{n}{bay}",
  levelPattern: "{level}",
  positionPattern: "{pos}",
  bayAsNumber: false,
  aislePadding: 0,
  bayPadding: 0,
});

export function shelfLetter(index) {
  const i = Math.max(0, Math.floor(Number(index) || 0));
  return SHELF_LETTERS[i] ?? String(i + 1);
}

function pad(value, width) {
  const n = Math.max(0, Math.floor(Number(width) || 0));
  if (!n) return String(value);
  return String(value).padStart(n, "0");
}

function applyPattern(pattern, tokens) {
  return String(pattern || "").replace(/\{(\w+)\}/g, (_, key) =>
    tokens[key] != null ? String(tokens[key]) : ""
  );
}

export function formatAisle(aisleNumber, convention = DEFAULT_NAMING_CONVENTION) {
  const n = Number(aisleNumber);
  if (!Number.isFinite(n) || n < 1) return "—";
  return applyPattern(convention.aislePattern || "{n}", {
    n: pad(n, convention.aislePadding),
  });
}

export function formatBay(aisleNumber, bayIndex, convention = DEFAULT_NAMING_CONVENTION) {
  const n = Number(aisleNumber);
  const idx = Math.max(0, Math.floor(Number(bayIndex) || 0));
  if (!Number.isFinite(n) || n < 1) return "—";
  const bayToken = convention.bayAsNumber
    ? pad(idx + 1, convention.bayPadding)
    : shelfLetter(idx);
  return applyPattern(convention.bayPattern || "{n}{bay}", {
    n: pad(n, convention.aislePadding),
    bay: bayToken,
  });
}

export function formatShelfCode(aisleNumber, bayIndex, convention = DEFAULT_NAMING_CONVENTION) {
  return formatBay(aisleNumber, bayIndex, convention);
}

export function formatLevel(levelIndex, convention = DEFAULT_NAMING_CONVENTION) {
  const level = Math.max(1, Math.floor(Number(levelIndex) || 0) + 1);
  return applyPattern(convention.levelPattern || "{level}", { level });
}

export function formatPosition(positionIndex, convention = DEFAULT_NAMING_CONVENTION) {
  const pos = Math.max(1, Math.floor(Number(positionIndex) || 0) + 1);
  return applyPattern(convention.positionPattern || "{pos}", { pos });
}

export function resolveNamingConvention(layout = null, verticalConfig = null) {
  return (
    layout?.namingConvention ||
    verticalConfig?.namingConvention ||
    DEFAULT_NAMING_CONVENTION
  );
}

/** Best-effort parse of a shelf code like 4A back to { aisleNumber, bayIndex }. */
export function parseShelfCode(code, convention = DEFAULT_NAMING_CONVENTION) {
  const raw = String(code || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d+)([A-Z]+|\d+)$/i);
  if (!match) return null;
  const aisleNumber = Number(match[1]);
  if (!Number.isFinite(aisleNumber) || aisleNumber < 1) return null;
  const bayPart = match[2];
  let bayIndex = 0;
  if (/^\d+$/.test(bayPart)) {
    bayIndex = Math.max(0, Number(bayPart) - 1);
  } else {
    bayIndex = Math.max(0, bayPart.toUpperCase().charCodeAt(0) - 65);
  }
  const expected = formatShelfCode(aisleNumber, bayIndex, convention);
  if (expected.toUpperCase() !== raw.toUpperCase()) return null;
  return { aisleNumber, bayIndex };
}
