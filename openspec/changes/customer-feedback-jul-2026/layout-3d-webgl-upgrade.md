# Layout 3D WebGL upgrade

**Change ID:** CUF-08c  
**Status:** Implemented (Jul 2026)  
**Related:** CUF-08, [planogram-3d-shelf-view.md](./planogram-3d-shelf-view.md), [shelf-labels-planogram-3d-fix.md](./shelf-labels-planogram-3d-fix.md)

## Problem

The layout **3D** tab felt “not proper” compared to the **WebGL 2D floor plan**:

| Issue | Impact |
|-------|--------|
| Floor drawn as a **rectangle** only | L-shaped / polygon stores show wrong floor; camera centre wrong |
| Monolithic `Scene3D.jsx` (~1100 lines) | Hard to maintain; unlike `floorPlanWebGL.js` pattern |
| Basic `WebGLRenderer` setup | No tone mapping / colour space; canvas sizing inconsistent |
| Full scene **rebuild** on navigation ticks | Janky zoom/fit; lost camera state |
| Overview shelves as many individual meshes | Slow on large layouts; cluttered |

## Solution

### Step 1 — Shared WebGL scene module

Add `codebase/web/src/layout-editor/layoutSceneWebGL.js` (same pattern as `floorPlanWebGL.js`):

- **Polygon-accurate floor** — fixture zone + store envelope outline from `polygonCanvas.js`
- **Aisle strips** — flat coloured boxes aligned to 2D aisles
- **Overview shelves** — `InstancedMesh` blocks (position, rotation, colour per shelf)
- **Shared palette** — colours aligned with 2D WebGL floor
- **`layoutSceneBounds()`** — camera fit from real layout bounds (not only `widthMeters`)

### Step 2 — Refactor `Scene3D.jsx`

- Thin React wrapper: mount, resize, orbit/walk, planogram shelf detail
- Import floor / aisles / overview from `layoutSceneWebGL.js`
- Improved renderer: sRGB, ACES tone mapping, `powerPreference: 'high-performance'`
- Canvas CSS: `width/height 100%`, `display block`
- Remove `focusRequest` from scene rebuild deps (navigation via orbit API only)

### Step 3 — Camera & navigation

- Overview camera computed from `layoutSceneBounds` (fits entire drawable area)
- Pan + zoom-to-cursor retained; **Fit store** resets to bounds-aware bird’s-eye
- Shelf focus mode: detailed rack + planogram products (unchanged behaviour)

## Files

| File | Change |
|------|--------|
| `layoutSceneWebGL.js` | **New** — WebGL floor, aisles, instanced overview shelves |
| `Scene3D.jsx` | Use module; renderer upgrade; slimmer rebuild logic |
| `scene3dDimensions.js` | Polygon-aware `layoutBounds` |
| `styles.css` | WebGL canvas fill container |

### Step 3 — Full shelf + product rendering

**3D tab** uses WebGL polygon floor + aisles with **detailed rack meshes and planogram products** on every shelf:

- **3D tab:** all shelves show racks + products from planogram data
- **Planogram View in 3D:** focused shelf + products (emphasized)
- Instanced overview blocks not used for default 3D view

## Acceptance criteria

- [x] Polygon / L-shaped layout: 3D floor matches 2D drawable area
- [x] **3D** tab opens with full-store view centred on layout
- [x] **3D** tab shows planogram products on shelves (boxes + images)
- [x] Planogram **View in 3D** shows products on focused shelf
- [x] Web build passes
