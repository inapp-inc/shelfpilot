# Tasks — SEED-PI-09-raster-ocr

- [x] Add `POST /layouts/analyze-plan` (Designer auth, JSON base64 payload ≤ 12 MB)
- [x] PDF/SVG/`.txt` analyze on server (`planAnalyzeFromUpload.js` + pdfjs-dist on API)
- [x] When `PLAN_FIXTURE_OCR_ENABLED`: raster PNG/JPG returns 503 `ocr_raster_not_supported` (no bundled OCR yet)
- [x] When OCR flag off: raster returns 501 `ocr_disabled`
- [x] Client: optional server analyze for raster (`tryServerAnalyze`, `VITE_PLAN_FIXTURE_SERVER_ANALYZE`)
- [x] Scale bar heuristic: `parseScaleBarFromText` in `floorPlanGeometry.mjs`
- [x] Env vars documented in `Docs/DEPLOYMENT_WORKFLOW.md`
- [ ] Manual QA: `Docs/plan/Layout2.png` E2E requires future OCR or PDF export (documented in REVIEW.md AT-9)
