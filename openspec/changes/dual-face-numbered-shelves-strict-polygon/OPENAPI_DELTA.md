# OpenAPI delta preview — v0.7.0

**Apply to `Docs/openapi.yaml` after approval.**

## Version bump

```yaml
info:
  version: 0.7.0
  description: |
    ...
    v0.7 adds dual-face shelves (faces A/B), displayNumber, strict polygon fixture zone,
    and faceId on planogram writes (change: dual-face-numbered-shelves-strict-polygon).
```

## New schema: ShelfFace

```yaml
ShelfFace:
  type: object
  required: [id]
  properties:
    id:
      type: string
      enum: [A, B]
    categoryId: { type: string }
    color: { type: string, pattern: "^#[0-9A-Fa-f]{6}$" }
    planogram:
      type: array
      items:
        $ref: "#/components/schemas/PlanogramPlacement"
```

## ShelfInput / Shelf — added fields

```yaml
displayNumber:
  type: integer
  minimum: 1
  description: Shown on 2D canvas; maps to category via legend
doubleSided:
  type: boolean
  default: false
faces:
  type: array
  items:
    $ref: "#/components/schemas/ShelfFace"
  description: When absent, synthesized from categoryId + planogram (Face A)
```

## PlanogramPlacementInput — added field

```yaml
faceId:
  type: string
  enum: [A, B]
  default: A
  description: Target face on double-sided shelves
```

## AutogenerateResponse — added field

```yaml
skippedOutsideCount:
  type: integer
  minimum: 0
  description: Shelves/aisles omitted because footprint did not fit inside polygon
```

## Backward compatibility

- Clients reading `categoryId` + `planogram[]` continue to work; API normalizes to `faces[0]`.
- Clients omitting `faceId` on planogram POST default to Face A.
