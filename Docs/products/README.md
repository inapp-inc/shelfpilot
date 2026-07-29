# ShelfPilot — Product Import Package (v3)

Ready-to-import **supermarket** catalog: 17 categories (hierarchical) and 129 products,
each with a matching thumbnail and a storage-temperature tag.

## Contents
| Item | Description |
|---|---|
| `ShelfPilot-product-import.xlsx` | `Import` (data) + `Catalog` (product images embedded) + `Instructions` |
| `images/` | 129 PNG thumbnails (240×240), one per product; filename = exact product name |

## Catalog sheet
The `Catalog` tab shows every product with its image embedded directly in the sheet, grouped by category, alongside SKU, storage, size and URL — open the file and you see the pictures, no hosting needed.

## Category hierarchy
| Parent | Child categories |
|---|---|
| Fresh Produce | Vegetables, Fruits |
| Grocery | Rice & Grains, Pulses & Lentils, Flour & Baking, Spices & Masala, Oils & Ghee, Sugar & Sweeteners |
| Beverages | Soft Drinks |
| *(standalone)* | Frozen Foods, Bakery, Dry Fruits & Nuts, Health & Wellness, Stationery |

Parents carry no products; every product maps to a leaf category via `categoryId`.
Child categories link to their parent via `parentId`.

## Storage temperature (`storageTemp`, column M)
Each product is tagged **Ambient**, **Chilled**, or **Frozen**:
- Frozen Foods → Frozen
- Soft Drinks + a few fresh/dairy items → Chilled
- Everything else → Ambient

This is an **optional extension column**. If your ShelfPilot importer uses a strict fixed
schema, simply delete column M — the rest of the sheet imports unchanged.

## Making images live (imageUrl, column L)
Base URL used:

    https://cdn.example.com/shelfpilot/images/<Product Name>.png

1. Upload the `images/` folder to your object storage / CDN.
2. Find-and-replace the base in column L with your real host.
3. Filenames already match, so links resolve once hosted.

**Local testing:** set column L to `images/<Product Name>.png` (relative path).

## Notes
- `widthMeters` / `heightMeters` are physical shelf-facing sizes (meters) for planogram & 3D.
- SKUs follow `CAT-ITEM-000`; adjust to match your ERP if needed.
