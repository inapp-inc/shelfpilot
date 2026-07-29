# Urgent layout fixes — proposal

**Status:** Approved for implementation  
**Date:** 2026-07-28

## Problems reported

| # | Issue | Root cause |
|---|--------|------------|
| 1 | Aisles not binding properly | Packer never sets `shelf.aisleId`; only category `aisleMappings` exist — no spatial link |
| 2 | Two shelves at same place instead of joined gondola | Back shelf rendered separately; `normalizeShelfUI` drops pair merge; Scene3D has no pair logic |
| 3 | Planogram bay split not working | `normalizeShelfUI` strips `faces[].segments` — splits saved via API but lost on read in modal/canvas |
| 4 | Products not mapping on auto-generate | Category mix template IDs vs catalog IDs; paired-shelf planogram fill; UI not surfacing empty fill |

## Target behaviour

### 1. Aisle binding
After autogenerate, each gondola face shelf record gets:
- `aisleId` → walk aisle on the **customer-facing** side of that physical shelf (front → north/west aisle, back → south/east aisle in runway layout)

### 2. Joined gondola unit (A1 | spine | A2)
- **2D:** Always one merged footprint per `pairId` (never two overlapping rects)
- **3D:** One gondola mesh per pair with spine + A1/A2 halves
- **Planogram:** Single editor with **A1 / A2** toggle routing to front/back shelf records

### 3. Bay split (levels × bays)
- Segments preserved through `normalizeShelfUI` and merged gondola views
- Split / merge / drag dividers persist via `PATCH` on correct physical shelf + face

### 4. Product auto-map
- Server resolves category mix IDs to catalog IDs before mix assignment
- `fillPlanogramsForLayout` fills paired front/back shelves
- Toast reports placement count or explicit “no products matched”

## Files changed

| Area | Files |
|------|--------|
| API aisle bind | `aisleBinding.js`, `layoutPacker.js`, `layouts.js` |
| Gondola unit | `shelfFaces.js` (web), `Canvas2D.jsx`, `Scene3D.jsx`, `PlanogramEditorModal.jsx` |
| Segments | `shelfFaces.js`, `mergePairedShelfForCanvas`, `Canvas2D.jsx` |
| Products | `planogramAutoFill.js`, `layouts.js` autogenerate |
| Tests | `aisle-binding.test.js`, `planogram-autofill.test.js` |

## Acceptance

- [ ] After autogenerate, `shelf.aisleId` set for gondola shelves adjacent to walk aisles
- [ ] Canvas shows one gondola block per pair with A1/A2 labels (not two stacked shelves)
- [ ] 3D walk view shows single gondola with two faces
- [ ] Planogram “Split 2/3/4” persists after close/reopen
- [ ] Smart generate with catalog places products; coverage panel shows placed SKUs
