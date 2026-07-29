# Proposal: Autogen planogram fill + missing products + 3D walk avatar

## Why

After **Smart generate**, shelves have categories but planograms are empty — merchandisers must manually place every SKU. Stakeholders need:

1. **Auto-fill** — place catalog products on shelves by category when generating.
2. **Missing products report** — which catalog SKUs are not on any shelf yet.
3. **Realistic walk avatar** — first-person 3D walk should show a human figure, not abstract shapes.

## What changes

| # | Feature | Summary |
|---|---------|---------|
| CF-13 | Planogram auto-fill on autogen | After category mix, fill each shelf face from matching catalog products (category + descendants). |
| CF-14 | Missing products coverage | API + UI list of products not placed on any shelf in the layout. |
| CF-15 | 3D walk human avatar | Proportioned human mesh with arms/legs/shoes; subtle walk animation. |

## Locked decisions

- Auto-fill runs when `fillPlanogram !== false` (default **true**) and category mix is present.
- One or more products per shelf level; facings from dimension math (`previewFacings`).
- Missing = in layout vertical catalog but `productId` absent from all shelf face planograms.
- Walk avatar stays lightweight (procedural geometry, no external GLB).

## Out of scope

- AI product selection / sales-weighted facing
- Auto-fill on manual shelf create
- Photorealistic human models / mocap
