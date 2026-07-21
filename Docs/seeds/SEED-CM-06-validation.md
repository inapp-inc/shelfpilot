# SEED-CM-06 — Validation & spec fold-in

**Change:** `catalog-merch-ui-v2` · **Status:** Pending approval

## Checks
- Retail: Electronics, Home, Grocery, Seasonal all merchandisable
- Pharmacy: OTC parent shelf accepts painrelief + coldflu products
- `npm test` green; manual browser checklist complete
- Fold spec deltas into `openspec/specs/catalog` + `ui-fidelity`

## Manual QA matrix

| Vertical | Shelf category | Expected products |
|----------|----------------|-------------------|
| retail | electronics | TV, etc. |
| retail | home | Cookware |
| retail | grocery | Coffee |
| retail | seasonal | Gift wrap |
| pharmacy | otc | Ibuprofen, Cold syrup, Bandages |
| pharmacy | rx | Amoxicillin |
