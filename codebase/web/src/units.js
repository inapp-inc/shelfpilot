/** Unit conversion — UI displays inches; layout engine stores meters. */

export const METERS_PER_INCH = 0.0254;

export function inchesToMeters(inches) {
  const n = Number(inches);
  if (!Number.isFinite(n)) return 0;
  return n * METERS_PER_INCH;
}

export function metersToInches(meters) {
  const n = Number(meters);
  if (!Number.isFinite(n)) return 0;
  return n / METERS_PER_INCH;
}

/** Format meters as inches for display (1 decimal). */
export function formatInchesFromMeters(meters, { suffix = true, dash = "—" } = {}) {
  if (meters == null || meters === "" || !Number.isFinite(Number(meters))) return dash;
  const inches = metersToInches(meters);
  const val = inches >= 10 ? inches.toFixed(1) : inches.toFixed(2);
  return suffix ? `${val}"` : val;
}

/** Round-trip safe string for form inputs. */
export function inchesInputFromMeters(meters, fallback = "") {
  if (meters == null || meters === "" || !Number.isFinite(Number(meters))) return fallback;
  const inches = metersToInches(meters);
  return String(inches >= 10 ? Number(inches.toFixed(1)) : Number(inches.toFixed(2)));
}

export function formatDimensionTripleInches(wM, hM, dM) {
  const w = formatInchesFromMeters(wM, { suffix: false });
  const h = formatInchesFromMeters(hM, { suffix: false });
  const d = formatInchesFromMeters(dM, { suffix: false });
  if (w === "—" && h === "—" && d === "—") return "—";
  return `${w}" × ${h}" × ${d}"`;
}

export const FEET_PER_METER = 3.280839895;

export function metersToFeet(meters) {
  const n = Number(meters);
  if (!Number.isFinite(n)) return 0;
  return n * FEET_PER_METER;
}

export function feetToMeters(feet) {
  const n = Number(feet);
  if (!Number.isFinite(n)) return 0;
  return n / FEET_PER_METER;
}

/** Round-trip safe feet string for form inputs (Store Master shelf dims). */
export function feetInputFromMeters(meters, fallback = "") {
  if (meters == null || meters === "" || !Number.isFinite(Number(meters))) return fallback;
  const ft = metersToFeet(Number(meters));
  return String(ft >= 10 ? Number(ft.toFixed(2)) : Number(ft.toFixed(3)));
}

/**
 * Envelope volume of a shelf fixture from width × depth × height (meters → m³).
 * Used for Store Master live volume and layout summaries.
 */
export function shelfEnvelopeVolumeM3(widthMeters, depthMeters, heightMeters) {
  const w = Number(widthMeters);
  const d = Number(depthMeters);
  const h = Number(heightMeters);
  if (![w, d, h].every((n) => Number.isFinite(n) && n > 0)) return null;
  return w * d * h;
}

/** Square feet per square meter — US retail display standard. */
export const SQFT_PER_SQM = 10.76391041671;

export function sqmToSqFt(sqm) {
  const n = Number(sqm);
  if (!Number.isFinite(n)) return 0;
  return n * SQFT_PER_SQM;
}

/** Format area stored as m² for UI (sq ft). */
export function formatAreaFromSqm(sqm, { suffix = true, dash = "—", decimals = 0 } = {}) {
  if (sqm == null || sqm === "" || !Number.isFinite(Number(sqm))) return dash;
  const sqft = sqmToSqFt(Number(sqm));
  const val = decimals > 0 ? sqft.toFixed(decimals) : Math.round(sqft).toLocaleString();
  return suffix ? `${val} sq ft` : val;
}

/** Format lineal distance stored as meters (inches). */
export function formatLengthFromMeters(meters, opts) {
  return formatInchesFromMeters(meters, opts);
}

/** Cubic feet per cubic meter — US retail display standard. */
export const CUFT_PER_CUM = 35.3146667215;

export function cubicMetersToCubicFeet(cum) {
  const n = Number(cum);
  if (!Number.isFinite(n)) return 0;
  return n * CUFT_PER_CUM;
}

/** Cubic inches per cubic foot. */
export const CUIN_PER_CUFT = 1728;

export function cubicMetersToCubicInches(cum) {
  return cubicMetersToCubicFeet(cum) * CUIN_PER_CUFT;
}

/** Format volume stored as m³ for UI (cubic feet and optional cubic inches). */
export function formatVolumeFromCubicMeters(cum, { suffix = true, dash = "—", decimals = 0, unit = "cuft" } = {}) {
  if (cum == null || cum === "" || !Number.isFinite(Number(cum))) return dash;
  if (unit === "cuin") {
    const cuin = cubicMetersToCubicInches(Number(cum));
    const places = decimals > 0 ? decimals : cuin < 100 ? 0 : 0;
    const val = places > 0 ? cuin.toFixed(places) : Math.round(cuin).toLocaleString();
    return suffix ? `${val} cu in` : val;
  }
  const cuft = cubicMetersToCubicFeet(Number(cum));
  // Small volumes lose all meaning when rounded to a whole cubic foot.
  const places = decimals > 0 ? decimals : cuft < 10 ? 2 : 0;
  const val = places > 0 ? cuft.toFixed(places) : Math.round(cuft).toLocaleString();
  return suffix ? `${val} cu ft` : val;
}

/** Dual-unit volume label: "1,234 cu ft (2,131,000 cu in)". */
export function formatVolumeBothFromCubicMeters(cum, { dash = "—" } = {}) {
  if (cum == null || cum === "" || !Number.isFinite(Number(cum))) return dash;
  return `${formatVolumeFromCubicMeters(cum)} (${formatVolumeFromCubicMeters(cum, { unit: "cuin" })})`;
}

/** Pounds per kilogram — UI displays pounds; the engine stores kilograms. */
export const LB_PER_KG = 2.20462262185;

export function kgToLb(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return 0;
  return n * LB_PER_KG;
}

export function lbToKg(lb) {
  const n = Number(lb);
  if (!Number.isFinite(n)) return 0;
  return n / LB_PER_KG;
}

/** Format a weight stored as kg for UI (pounds). */
export function formatWeightFromKg(kg, { suffix = true, dash = "—", decimals = null } = {}) {
  if (kg == null || kg === "" || !Number.isFinite(Number(kg))) return dash;
  const lb = kgToLb(Number(kg));
  const places = decimals != null ? decimals : lb < 10 ? 1 : 0;
  const val = places > 0 ? lb.toFixed(places) : Math.round(lb).toLocaleString();
  return suffix ? `${val} lb` : val;
}

/** Round-trip safe pounds string for form inputs. */
export function lbInputFromKg(kg, fallback = "") {
  if (kg == null || kg === "" || !Number.isFinite(Number(kg))) return fallback;
  return String(Number(kgToLb(kg).toFixed(2)));
}
