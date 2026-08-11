# Floor Plan Import — Product & Technical Spec (Draft)

**Status:** Draft for review  
**Author:** ShelfPilot team  
**Last updated:** 2026-08-10  

---

## 1. Problem statement

Today, uploading a PNG (or attempting PDF) **binds the same flat image to the canvas**. The app:

- Guesses store size from **image aspect ratio** and a fixed default long edge (24 m).
- Does **not** read real-world dimensions from the file.
- Does **not** create fixtures from the drawing — only overlays the image; fixtures come from **manual placement** or **Smart Generate** after the user draws a fixture zone.

You asked for a rethink: **read dimensions from the uploaded file**, then **build fixtures based on that**, with **PNG and PDF behaving the same way**.

---

## 2. Decisions captured (from stakeholder input)

| Topic | Decision |
|--------|----------|
| File types in scope | Architect PDF, vector CAD PDF, PNG/JPG **with** scale/dimensions, PNG/JPG **sketch** (no scale) |
| How fixtures are built | **Manual outline on canvas → Smart Generate** (rules packer, not ML tracing of shelf symbols) |
| PNG vs PDF | **Same UX and pipeline** from day one |
| Sketches without scale | **Manual Length × Width fields only** (no 2-point calibration in v1) |
| PDF pages | **Page 1 only** in v1 |
| Default fixture zone | **Full store rectangle** until user redraws |

This spec describes a **calibrated underlay + generate** workflow, not automatic shelf detection from drawing symbols.

---

## 3. What “read dimensions from the file” means (by file type)

Real-world metres are **not** stored inside most PNG pixels. Extraction is **tiered**:

| Tier | Source | PNG sketch | PNG + scale bar / “24 m” label | Architect PDF | Vector CAD PDF |
|------|--------|------------|----------------------------------|---------------|----------------|
| **A — User** | Length / width fields in create dialog | Required | Confirm / override | Confirm / override | Confirm / override |
| **B — Geometry** | Pixel size → aspect ratio only | Aspect only | Aspect only | Page size (points/mm) | Page size + optional layer units |
| **C — Calibration** | Two-point scale on preview | Required | Recommended | Recommended | Optional if Tier D works |
| **D — Parsed labels** | OCR / PDF text layer (“12.000 m”) | Future | Future | **Phase 2** | **Phase 2** |
| **E — Vector walls** | Line detection → building outline | Future | Future | Future | **Phase 3** |

**Release 1 (this change)** delivers **A + B + C** uniformly for PNG and PDF.  
**Release 2+** adds D (read printed dimensions) and optionally E (snap outline to walls).

---

## 4. Target workflow (unified PNG & PDF)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CREATE LAYOUT — Upload floor plan (PNG, JPG, or PDF)         │
│    • Render PDF page 1 → same raster pipeline as PNG            │
│    • Show preview + editable Length × Width × Height (metres)   │
│    • Optional: calibrate scale (2 clicks + known distance)      │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. CREATE — Persist layout                                      │
│    • storeEnvelope ← user-confirmed metres                        │
│    • floorPlan underlay ← image scaled to storeEnvelope         │
│    • fixture polygon ← full store rectangle (editable later)    │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. EDITOR — Align & define merchandising area                   │
│    • Drag / resize underlay if needed (single source of truth)  │
│    • Draw or adjust fixture zone polygon on top of drawing      │
│    • Mark columns / blocked areas (Structure tools)             │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. SMART GENERATE — Build fixtures                              │
│    • Rules packer inside polygon (existing engine)              │
│    • Category mix, aisle width, orientation                       │
│    • Shelves + aisles placed in **metres**, not pixels          │
└─────────────────────────────────────────────────────────────────┘
```

**Important:** The uploaded file defines **store scale and shape context**. Fixtures are **generated**, not copied pixel-for-pixel from the drawing (per your choice).

---

## 5. Dimension & canvas binding rules

### 5.1 Single binding model

| Concept | Rule |
|---------|------|
| **Store envelope** | Authoritative real-world box: `(0,0)` → `(lengthM, widthM)` in metres |
| **Underlay** | `floorPlan.widthMeters` × `floorPlan.depthMeters` **must equal** store envelope unless user explicitly offsets/scales |
| **Fixture zone** | Polygon inside envelope; Smart Generate only packs inside this |
| **Fixtures** | Placed in layout coordinates (metres); always drawn **above** underlay |

### 5.2 Store dimensions (Release 1)

**Release 1 uses manual Length × Width × Height fields only** — no 2-point calibration tool yet.

- User enters real-world **Length** and **Width** in metres in the create dialog (required).
- Image **aspect ratio** is used only to suggest initial values (long edge default 24 m); user must confirm or edit before create.
- For **architect PDFs with printed dimensions**, Phase 2 can pre-fill fields from PDF text/OCR; user still confirms.

*(Optional Phase 1b: 2-point calibration on preview for users who prefer clicking two wall endpoints — deferred unless requested.)*

### 5.3 PDF handling (same as PNG)

| Step | Behaviour |
|------|-----------|
| Upload | Accept `.pdf` in create dialog (same dropzone as PNG) |
| Convert | Server or client renders **page 1** to PNG/WebP at fixed DPI (e.g. 150–200) |
| Store | Save raster like today under `/floor-plans/` |
| Metadata | Record `sourceType: "pdf"`, `pageIndex: 0`, original filename |
| Preview | Show converted raster in create dialog (identical UX to PNG) |

Multi-page PDFs: **page 1 only** in v1; page picker in v2.

---

## 6. Fixture generation (unchanged engine, clearer prerequisites)

Smart Generate already:

- Packs gondolas/shelves inside a **drawn polygon**
- Respects **min aisle width**, **category mix**, **obstacles**
- Outputs shelves in **metres** aligned to the canvas grid

After import, the user must:

1. Confirm store dimensions match the drawing (calibration + L×W fields).
2. Adjust the **fixture zone** polygon if the sellable area is not the full rectangle.
3. Run **Smart Generate**.

No change to packer logic is required for Release 1; the fix is **correct scale binding** before generate.

---

## 7. Current vs target (summary)

| Area | Today | Target (Release 1) |
|------|--------|---------------------|
| PDF upload | Not supported in create dialog | Same dropzone as PNG |
| Dimensions | Fixed 24 m long edge + aspect | User L×W + optional 2-point calibration |
| Canvas binding | Image stretched to guessed size | Image scaled to **confirmed** envelope |
| Fixtures | Manual or Smart Generate after draw | Same, but zone + scale are trustworthy |
| Underlay in editor | Draggable; no upload in editor | Draggable; scale locked to envelope unless patched |
| Dimension text in PDF | Ignored | Phase 2 (OCR / text layer) |

---

## 8. Proposed implementation phases

### Phase 1 — Unified import & calibration (MVP)

- [x] PDF → raster conversion (page 1, client-side via pdfjs-dist)
- [x] Create dialog: preview + **Length / Width / Height** (manual metres, confirm against drawing)
- [x] Persist `floorPlan` dimensions = store envelope on create
- [x] Auto fixture polygon = full store
- [x] Editor: fixtures always render above underlay
- [ ] E2E: create from PNG and PDF, run Smart Generate, shelves visible

### Phase 2 — Read dimensions from file (assist)

- [ ] PDF text extraction for dimension strings (regex + units)
- [ ] Optional OCR on PNG for “XX m” / scale bar detection
- [ ] Pre-fill L×W; user always confirms

### Phase 3 — Outline assist (optional)

- [ ] Suggest fixture polygon from PDF vector walls (CAD exports)
- [ ] User confirms polygon before generate

---

## 9. Non-goals (explicit)

- **Automatic shelf symbol recognition** from architect drawings (ML/CV) — out of scope unless requirements change.
- **Importing planogram SKUs** from the floor plan image — separate catalog/import flow.
- **Multi-floor / multi-page** PDF stores in v1.

---

## 10. Open questions — resolved

| # | Question | Decision |
|---|----------|----------|
| 1 | Sketch with no scale | **Manual L×W fields only** (no 2-point calibration in v1) |
| 2 | PDF pages | **Page 1 only** in v1 |
| 3 | Ceiling height | Manual (3.2 m default); PDF title block in Phase 2 |
| 4 | Replace underlay after create | Create-only (no editor upload) — current policy |
| 5 | Irregular stores | **Full rectangle fixture zone** by default; user may redraw polygon in editor |

---

## 11. Acceptance criteria (Release 1)

1. User uploads **PNG or PDF** in create dialog with the **same steps**.
2. User sets or calibrates **real-world Length × Width**; created layout uses those metres.
3. Floor plan underlay **aligns 1:1** with store envelope (no arbitrary 24 m guess without user consent).
4. User draws/adjusts fixture zone → **Smart Generate** → fixtures visible on canvas over the drawing.
5. Dashboard metrics use **shelf dimensions + planogram**, not image pixels.

---

## 12. Related code (today)

| Area | Path |
|------|------|
| Create dialog | `codebase/web/src/modules/LayoutCreateModal.jsx` |
| Create API | `codebase/api/src/routes/layouts.js` (POST `/layouts`) |
| Floor plan storage | `codebase/api/src/services/floorPlanImages.js` |
| Canvas underlay | `codebase/web/src/layout-editor/Canvas2D.jsx` |
| Smart Generate | `codebase/api/src/services/layoutPacker.js` + `/autogenerate` |

---

*Please review sections 4, 5, and 10. Once open questions are answered, this spec can be turned into SEED units for implementation.*
