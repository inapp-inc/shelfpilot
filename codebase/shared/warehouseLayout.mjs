/** Warehouse store type — single-sided racks, wider aisles (FR-WH-01 / DF-04). */

export const WAREHOUSE_VERTICAL = "warehouse";

export const WAREHOUSE_FIXTURE_TYPES = new Set([
  "pallet_rack",
  "selective_rack",
  "bulk_storage",
  "staging_lane",
]);

/** Default fixture templates for warehouse (meters). */
export const WAREHOUSE_FIXTURE_ENTRIES = [
  {
    type: "pallet_rack",
    label: "Pallet rack",
    baseKind: "rack",
    defaultWidthMeters: 2.7,
    defaultDepthMeters: 1.1,
    defaultHeightMeters: 6,
    defaultLevels: 4,
  },
  {
    type: "selective_rack",
    label: "Selective rack",
    baseKind: "rack",
    defaultWidthMeters: 2.4,
    defaultDepthMeters: 1.0,
    defaultHeightMeters: 5,
    defaultLevels: 5,
  },
  {
    type: "bulk_storage",
    label: "Bulk storage",
    baseKind: "storage",
    defaultWidthMeters: 3.6,
    defaultDepthMeters: 1.2,
    defaultHeightMeters: 4,
    defaultLevels: 3,
  },
  {
    type: "staging_lane",
    label: "Staging lane",
    baseKind: "storage",
    defaultWidthMeters: 2.0,
    defaultDepthMeters: 1.5,
    defaultHeightMeters: 0.5,
    defaultLevels: 1,
  },
];

export const WAREHOUSE_MIN_AISLE_M = 3.0;
export const WAREHOUSE_DEFAULT_CEILING_M = 8;

export function isWarehouseVertical(vertical) {
  return String(vertical || "").toLowerCase() === WAREHOUSE_VERTICAL;
}

export function isWarehouseFixtureType(type) {
  return WAREHOUSE_FIXTURE_TYPES.has(String(type || ""));
}

/** Manual placement and autogen use single-sided bays (not gondola pairs). */
export function isSingleSidedPlacementType(type, vertical) {
  if (isWarehouseFixtureType(type)) return true;
  if (isWarehouseVertical(vertical)) return true;
  return false;
}

export function warehouseLayoutMode(layoutOrVertical) {
  if (layoutOrVertical && typeof layoutOrVertical === "object") {
    return isWarehouseVertical(layoutOrVertical.vertical);
  }
  return isWarehouseVertical(layoutOrVertical);
}

export function warehouseFixtureLabel(type) {
  const row = WAREHOUSE_FIXTURE_ENTRIES.find((e) => e.type === type);
  return row?.label || type;
}
