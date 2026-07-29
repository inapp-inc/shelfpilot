# Spec delta — planogram

## ADD: Depth and level suggestions on preview

**Given** a shelf with known width, depth, and height  
**And** a product with width, depth, and height attributes (or defaults)  
**When** the client calls `POST /layouts/{id}/planogram/preview`  
**Then** the response includes:

- `maxFacings` — maximum units along shelf width
- `maxDepthFacings` — maximum units along shelf depth (backward)
- `suggestedLevels` — maximum vertical stacks on the shelf
- `assumedDimensions` — true when product used default dimensions

## MODIFY: Face-scoped preview

Preview request body includes `faceId` (`A` | `B`) for dual-face shelves; calculations use the same shelf geometry (faces share physical dimensions).
