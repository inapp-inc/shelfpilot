/** Catalog constants mirrored from ui/ShelfPilot.dc.html */

export const VERTICALS = {
  retail: {
    label: "Retail",
    minAisle: 1.2,
    color: "#16a34a",
    categories: [
      { id: "electronics", name: "Electronics", color: "oklch(0.7 0.15 250)" },
      { id: "home", name: "Home Goods", color: "oklch(0.7 0.15 140)" },
      { id: "grocery", name: "Grocery", color: "oklch(0.75 0.14 90)" },
      { id: "fresh-produce", name: "Fresh Produce", color: "oklch(0.72 0.14 145)" },
      { id: "chilled", name: "Chilled", color: "oklch(0.7 0.12 230)" },
      { id: "frozen", name: "Frozen", color: "oklch(0.75 0.1 220)" },
      { id: "seasonal", name: "Seasonal", color: "oklch(0.7 0.15 40)" },
    ],
    compliance: ["Fire exit lanes must remain ≥ 1.2m clear", "Max shelf height 2.1m on aisle-facing units"],
  },
  pharmacy: {
    label: "Pharmacy",
    minAisle: 1.5,
    color: "#0ea5e9",
    categories: [
      {
        id: "otc",
        name: "OTC Medicines",
        color: "#0ea5e9",
        children: [
          { id: "painrelief", name: "Pain Relief", color: "#38bdf8" },
          { id: "coldflu", name: "Cold & Flu", color: "#38bdf8" },
          { id: "firstaid", name: "First Aid", color: "#38bdf8" },
        ],
      },
      { id: "rx", name: "Prescription", color: "oklch(0.68 0.16 300)" },
      { id: "personal", name: "Personal Care", color: "oklch(0.7 0.15 140)" },
      { id: "vitamins", name: "Vitamins", color: "oklch(0.76 0.14 90)" },
      { id: "ph-chilled", name: "Chilled", color: "oklch(0.7 0.12 230)" },
    ],
    compliance: ["ADA aisle clearance ≥ 1.5m throughout", "Rx counter sightline must stay unobstructed"],
  },
  beauty: {
    label: "Beauty",
    minAisle: 1.3,
    color: "#db2777",
    categories: [
      { id: "skincare", name: "Skincare", color: "oklch(0.72 0.13 20)" },
      { id: "makeup", name: "Makeup", color: "oklch(0.68 0.16 340)" },
      { id: "fragrance", name: "Fragrance", color: "oklch(0.7 0.15 280)" },
      { id: "haircare", name: "Haircare", color: "oklch(0.72 0.13 60)" },
    ],
    compliance: ["Fragrance testing stations require ventilation", "Sample station aisle ≥ 1.3m"],
  },
  apparel: {
    label: "Apparel",
    minAisle: 1.4,
    color: "#A30A2A",
    categories: [
      { id: "womens", name: "Womenswear", color: "oklch(0.68 0.16 340)" },
      { id: "mens", name: "Menswear", color: "oklch(0.6 0.1 240)" },
      { id: "accessories", name: "Accessories", color: "oklch(0.75 0.13 90)" },
      { id: "footwear", name: "Footwear", color: "oklch(0.65 0.12 40)" },
    ],
    compliance: ["Fitting room ADA clearance ≥ 1.4m", "Max garment rack height 1.8m"],
  },
  hypermarket: {
    label: "Hypermarket",
    minAisle: 1.5,
    color: "#7c3aed",
    categories: [
      { id: "hm-fresh", name: "Fresh Produce", color: "#22c55e" },
      { id: "hm-grocery", name: "Grocery", color: "#16a34a" },
      { id: "hm-chilled", name: "Chilled", color: "#0ea5e9" },
      { id: "hm-frozen", name: "Frozen", color: "#38bdf8" },
      { id: "hm-seasonal", name: "Seasonal", color: "#ea580c" },
    ],
    compliance: ["Min aisle 1.5m", "Chilled zone at back wall"],
  },
  convenience: {
    label: "Convenience",
    minAisle: 1.0,
    color: "#f97316",
    categories: [
      { id: "cv-grocery", name: "Grocery", color: "#16a34a" },
      { id: "cv-chilled", name: "Chilled", color: "#0ea5e9" },
      { id: "cv-snacks", name: "Snacks", color: "#ea580c" },
      { id: "cv-personal", name: "Personal Care", color: "#a855f7" },
    ],
    compliance: ["Min aisle 1.0m"],
  },
  warehouse: {
    label: "Warehouse",
    minAisle: 3.0,
    color: "#475569",
    categories: [
      { id: "wh-bulk", name: "Bulk storage", color: "#64748b" },
      { id: "wh-pick", name: "Pick face", color: "#0ea5e9" },
      { id: "wh-cold", name: "Cold storage", color: "#38bdf8" },
      { id: "wh-staging", name: "Staging / dispatch", color: "#f59e0b" },
      { id: "wh-returns", name: "Returns", color: "#a855f7" },
    ],
    compliance: ["Min forklift aisle 3.0m", "Rack height ≤ ceiling − 0.5m"],
  },
};

export const FIXTURE_TYPES = {
  shelf: { label: "Shelf", w: 1.2, d: 0.6 },
  rack: { label: "Rack", w: 1.0, d: 0.5 },
  gondola: { label: "Gondola", w: 1.8, d: 0.9 },
  storage: { label: "Storage", w: 2.0, d: 1.0 },
  temp_table: { label: "Display table", w: 1.6, d: 0.8 },
  temp_pallet: { label: "Pallet", w: 1.2, d: 1.2 },
  pallet_rack: { label: "Pallet rack", w: 2.7, d: 1.1 },
  selective_rack: { label: "Selective rack", w: 2.4, d: 1.0 },
  bulk_storage: { label: "Bulk storage", w: 3.6, d: 1.2 },
  staging_lane: { label: "Staging lane", w: 2.0, d: 1.5 },
};

export const ZONE_TYPES = {
  hot: { label: "Hot zone", color: "#ef4444", hint: "high-traffic / promo" },
  offer: { label: "Offer zone", color: "#f59e0b", hint: "deals & offers" },
  special: { label: "Special zone", color: "#8b5cf6", hint: "custom / seasonal" },
};

export const STATUS_META = {
  draft: { label: "Draft", bg: "#eef0f2", color: "#6b7280" },
  in_review: { label: "In review", bg: "oklch(0.95 0.05 85)", color: "oklch(0.42 0.12 75)" },
  approved: { label: "Approved", bg: "oklch(0.94 0.05 150)", color: "oklch(0.4 0.12 150)" },
  rejected: { label: "Rejected", bg: "oklch(0.95 0.03 15)", color: "#A30A2A" },
};

export const PRODUCTS = {
  retail: [
    { name: "4K Living Room TV", sku: "RT-1001", categoryId: "electronics", attr: '55"' },
    { name: "Nonstick Cookware Set", sku: "RT-1002", categoryId: "home", attr: "10-pc" },
    { name: "Organic Coffee Beans", sku: "RT-1003", categoryId: "grocery", attr: "340g" },
  ],
  pharmacy: [
    { name: "Ibuprofen 200mg", sku: "PH-2001", categoryId: "painrelief", attr: "100ct" },
    { name: "Amoxicillin 500mg", sku: "PH-2002", categoryId: "rx", attr: "Rx only" },
    { name: "Multivitamin Gummies", sku: "PH-2003", categoryId: "vitamins", attr: "60ct" },
  ],
  beauty: [
    { name: "Hydrating Serum", sku: "BE-3001", categoryId: "skincare", attr: "30ml" },
    { name: "Matte Lipstick", sku: "BE-3002", categoryId: "makeup", attr: "Shade 12" },
  ],
  apparel: [
    { name: "Wool Overcoat", sku: "AP-4001", categoryId: "womens", attr: "M" },
    { name: "Oxford Shirt", sku: "AP-4002", categoryId: "mens", attr: "L" },
    { name: "Running Sneakers", sku: "AP-4004", categoryId: "footwear", attr: "9US" },
  ],
};

export function flatCategories(vertical) {
  const out = [];
  (VERTICALS[vertical]?.categories || []).forEach((c) => {
    out.push(c);
    (c.children || []).forEach((ch) => out.push(ch));
  });
  return out;
}

export function findCategory(vertical, id) {
  return flatCategories(vertical).find((c) => c.id === id) || null;
}

export function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}
