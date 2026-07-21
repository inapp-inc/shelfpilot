# Review guide — catalog-merch-ui-v2

**For:** Product owner / stakeholder sign-off before implementation  
**Change folder:** `openspec/changes/catalog-merch-ui-v2/`

---

## Your reported issues → our diagnosis

| You said | Root cause |
|----------|------------|
| Can add category | Likely **shelf mapping** or import — there is **no Add Category button** in Catalog UI today |
| Can only fill Grocery in layout editor | **Vertical/catalog mismatch** + **sparse DB seed** + **flat category pickers** → only Grocery SKUs align with mapped shelves |
| Need to update Add product | Form is a minimal inline grid; no drawer, no hierarchy, shows raw category ids |

Full analysis: [`AUDIT.md`](./AUDIT.md) (8 findings)

---

## Proposed UX (summary)

### 1. Catalog page — master/detail

- **Left:** category tree with **+ Add category**
- **Right:** products filtered by selected category
- **Drawers:** polished Add/Edit product (shared component)

### 2. Layout editor — tabbed right rail

- **Properties** tab — aisle/shelf dimensions (unchanged content)
- **Merchandising** tab — guided flow:
  1. Pick category (tree picker, shows SKU count)
  2. Place products by level
  3. Quick-add product if list is empty

### 3. Vertical sync fix

Opening a layout **automatically switches catalog context** to that layout's vertical (Retail layout → Retail products, even if shell pill was Pharmacy).

---

## Documents to read (in order)

1. [`proposal.md`](./proposal.md) — scope, success criteria, SEED list
2. [`design.md`](./design.md) — wireframes, components, mermaid diagram
3. [`AUDIT.md`](./AUDIT.md) — why Grocery-only happens
4. [`tasks.md`](./tasks.md) — implementation checklist (6 SEEDs)
5. [`specs/catalog/spec.md`](./specs/catalog/spec.md) + [`specs/ui-fidelity/spec.md`](./specs/ui-fidelity/spec.md)

SEED unit files: `Docs/seeds/SEED-CM-00` … `SEED-CM-06`

---

## Decisions needed from you

| # | Question | Default if no answer |
|---|----------|---------------------|
| 1 | Approve **tabbed editor rail** (Properties / Merchandising)? | Yes — proceed |
| 2 | **Drawers** for Add category / Add product OK? | Yes |
| 3 | **Auto-sync vertical** when opening a layout (changes shell pill)? | Yes — recommended |
| 4 | Include **`PATCH /categories/{id}`** (edit category name/color) in v2? | Defer to v2.1 |
| 5 | Run **`npm run seed:demo`** as part of setup docs? | Yes |

---

## Quick workaround (until v2 ships)

If you need all retail categories working **today** before approval:

```bash
cd codebase
npm run seed:demo
```

Then in layout editor:
1. Confirm shell vertical matches your layout (e.g. **Retail** for retail layouts)
2. Map each shelf to the correct category (Electronics, Home, Grocery, Seasonal)
3. Add products in Catalog with matching `categoryId`

---

## Approve?

Reply **"approve catalog-merch-ui-v2"** (with any changes to decisions 1–5) and implementation will proceed in SEED-CM-00 → CM-06 order.
