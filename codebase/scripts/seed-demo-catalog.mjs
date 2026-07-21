/**
 * Seed rich demo catalog for all verticals (idempotent upsert).
 * Run from codebase/: node scripts/seed-demo-catalog.mjs
 */
import { getDb, repo, resetDbForTests } from "../api/src/store/sqlite.js";

const CATALOG = {
  retail: {
    categories: [
      { id: "electronics", name: "Electronics", color: "#3b82f6" },
      { id: "home", name: "Home Goods", color: "#16a34a" },
      { id: "grocery", name: "Grocery", color: "#ca8a04" },
      { id: "fresh-produce", name: "Fresh Produce", color: "#22c55e" },
      { id: "chilled", name: "Chilled", color: "#0ea5e9" },
      { id: "frozen", name: "Frozen", color: "#38bdf8" },
      { id: "seasonal", name: "Seasonal", color: "#ea580c" },
    ],
    products: [
      { id: "rt-p1", name: "4K Living Room TV", sku: "RT-1001", categoryId: "electronics", attributes: { size: '55"' } },
      { id: "rt-p2", name: "Nonstick Cookware Set", sku: "RT-1002", categoryId: "home", attributes: { pieces: 10 } },
      { id: "rt-p3", name: "Organic Coffee Beans", sku: "RT-1003", categoryId: "grocery", attributes: { weight: "340g" } },
      { id: "rt-p4", name: "Holiday Gift Wrap", sku: "RT-1004", categoryId: "seasonal", attributes: {} },
    ],
  },
  pharmacy: {
    categories: [
      { id: "otc", name: "OTC Medicines", color: "#0ea5e9" },
      { id: "painrelief", name: "Pain Relief", parentId: "otc", color: "#38bdf8" },
      { id: "coldflu", name: "Cold & Flu", parentId: "otc", color: "#38bdf8" },
      { id: "firstaid", name: "First Aid", parentId: "otc", color: "#38bdf8" },
      { id: "rx", name: "Prescription", color: "#a855f7" },
      { id: "personal", name: "Personal Care", color: "#16a34a" },
      { id: "vitamins", name: "Vitamins", color: "#ca8a04" },
      { id: "ph-chilled", name: "Chilled", color: "#0ea5e9" },
    ],
    products: [
      { id: "ph-p1", name: "Ibuprofen 200mg", sku: "PH-2001", categoryId: "painrelief", attributes: { facing: 4 } },
      { id: "ph-p2", name: "Amoxicillin 500mg", sku: "PH-2002", categoryId: "rx", attributes: { rx: true } },
      { id: "ph-p3", name: "Multivitamin Gummies", sku: "PH-2003", categoryId: "vitamins", attributes: { count: 60 } },
      { id: "ph-p4", name: "Cold Relief Syrup", sku: "PH-2004", categoryId: "coldflu", attributes: {} },
      { id: "ph-p5", name: "Adhesive Bandages", sku: "PH-2005", categoryId: "firstaid", attributes: {} },
    ],
  },
  beauty: {
    categories: [
      { id: "skincare", name: "Skincare", color: "#f43f5e" },
      { id: "makeup", name: "Makeup", color: "#db2777" },
      { id: "fragrance", name: "Fragrance", color: "#a855f7" },
      { id: "haircare", name: "Haircare", color: "#f59e0b" },
    ],
    products: [
      { id: "be-p1", name: "Hydrating Serum", sku: "BE-3001", categoryId: "skincare", attributes: { size: "30ml" } },
      { id: "be-p2", name: "Matte Lipstick", sku: "BE-3002", categoryId: "makeup", attributes: { shade: "12" } },
      { id: "be-p3", name: "Eau de Parfum", sku: "BE-3003", categoryId: "fragrance", attributes: {} },
    ],
  },
  apparel: {
    categories: [
      { id: "womens", name: "Womenswear", color: "#db2777" },
      { id: "mens", name: "Menswear", color: "#A30A2A" },
      { id: "accessories", name: "Accessories", color: "#ca8a04" },
      { id: "footwear", name: "Footwear", color: "#ea580c" },
    ],
    products: [
      { id: "ap-p1", name: "Wool Overcoat", sku: "AP-4001", categoryId: "womens", attributes: { size: "M" } },
      { id: "ap-p2", name: "Oxford Shirt", sku: "AP-4002", categoryId: "mens", attributes: { size: "L" } },
      { id: "ap-p3", name: "Leather Belt", sku: "AP-4003", categoryId: "accessories", attributes: {} },
      { id: "ap-p4", name: "Running Sneakers", sku: "AP-4004", categoryId: "footwear", attributes: { size: "9US" } },
    ],
  },
  hypermarket: {
    categories: [
      { id: "hm-fresh", name: "Fresh Produce", color: "#22c55e" },
      { id: "hm-grocery", name: "Grocery", color: "#16a34a" },
      { id: "hm-chilled", name: "Chilled", color: "#0ea5e9" },
      { id: "hm-frozen", name: "Frozen", color: "#38bdf8" },
      { id: "hm-seasonal", name: "Seasonal", color: "#ea580c" },
    ],
    products: [
      { id: "hm-p1", name: "Organic Tomatoes", sku: "HM-1001", categoryId: "hm-fresh", attributes: { weight: "500g" } },
      { id: "hm-p2", name: "Pasta Pack", sku: "HM-1002", categoryId: "hm-grocery", attributes: {} },
      { id: "hm-p3", name: "Whole Milk 2L", sku: "HM-1003", categoryId: "hm-chilled", attributes: {} },
      { id: "hm-p4", name: "Frozen Peas", sku: "HM-1004", categoryId: "hm-frozen", attributes: {} },
    ],
  },
  convenience: {
    categories: [
      { id: "cv-grocery", name: "Grocery", color: "#16a34a" },
      { id: "cv-chilled", name: "Chilled", color: "#0ea5e9" },
      { id: "cv-snacks", name: "Snacks", color: "#ea580c" },
      { id: "cv-personal", name: "Personal Care", color: "#a855f7" },
    ],
    products: [
      { id: "cv-p1", name: "Energy Bar", sku: "CV-2001", categoryId: "cv-snacks", attributes: {} },
      { id: "cv-p2", name: "Iced Coffee", sku: "CV-2002", categoryId: "cv-chilled", attributes: {} },
    ],
  },
};

function seedCatalog() {
  getDb();
  for (const [vertical, pack] of Object.entries(CATALOG)) {
    for (const c of pack.categories) {
      repo.upsertCategory({
        id: c.id,
        name: c.name,
        vertical,
        parentId: c.parentId || null,
        color: c.color,
      });
    }
    for (const p of pack.products) {
      repo.upsertProduct(p);
    }
  }
  console.log("seed:demo-catalog OK — verticals:", Object.keys(CATALOG).join(", "));
}

if (process.env.NODE_ENV === "test") resetDbForTests();
seedCatalog();
