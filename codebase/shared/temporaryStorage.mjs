/** Temporary storage fixtures (display tables / pallets) — FR-TEMP-01. */

export const TEMPORARY_STORAGE_TYPES = new Set(["temp_table", "temp_pallet"]);

export const TEMPORARY_FIXTURE_ENTRIES = [
  {
    type: "temp_table",
    label: "Display table",
    baseKind: "shelf",
    temporaryStorage: true,
    temperatureZone: "ambient",
    defaultWidthMeters: 1.6,
    defaultDepthMeters: 0.8,
    defaultHeightMeters: 0.9,
    defaultLevels: 1,
  },
  {
    type: "temp_pallet",
    label: "Pallet",
    baseKind: "storage",
    temporaryStorage: true,
    temperatureZone: "ambient",
    defaultWidthMeters: 1.2,
    defaultDepthMeters: 1.2,
    defaultHeightMeters: 0.15,
    defaultLevels: 1,
  },
];

export function isTemporaryStorageType(type) {
  return TEMPORARY_STORAGE_TYPES.has(String(type || ""));
}

export function isTemporaryStorageShelf(shelf) {
  if (!shelf) return false;
  if (shelf.temporaryStorage === true) return true;
  return isTemporaryStorageType(shelf.type);
}

export function temporaryStorageLabel(type) {
  const row = TEMPORARY_FIXTURE_ENTRIES.find((e) => e.type === type);
  return row?.label || type;
}
