# SEED-PI-06 — Client: analyze upload → fixture parse

**Goal:** After file read, run shared fixture parsers on extracted text; expose `fixturePlan` on analyze result for create payload.

**Depends on:** SEED-PI-01, SEED-PI-02  
**Optional:** Stub `POST /layouts/analyze-plan` returning same shape for future OCR (PI-09).
