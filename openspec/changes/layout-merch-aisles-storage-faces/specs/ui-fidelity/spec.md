# Spec delta — ui-fidelity

## ADD: Merchandising suggested arrangement block

When a product is selected on a shelf face, show:

1. Front facings (wide)
2. Depth (backward)
3. Levels (high)

Prefill the facings input from `maxFacings`. Show a muted note when `assumedDimensions` is true.

## ADD: Aisle walkway rendering

Aisles inside the fixture polygon render with:

- Semi-opaque fill
- Dashed border (≥2px)
- Centered label (aisle id or index)
- Visible at default zoom alongside shelves

## MODIFY: Dual-face storage labeling

Dual-face storage shelves show Merchandising header **Storage (A/B)** and Face A / Face B toggles. Canvas badges show `{n}A` and `{n}B`.
