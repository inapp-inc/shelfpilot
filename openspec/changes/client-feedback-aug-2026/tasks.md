# Tasks — client-feedback-aug-2026

**Status:** **Delivered** (CB-01–CB-09 core complete). Optional follow-ups: E2E Playwright for store picker/plan toggle, admin per-layout naming UI, 3D perf evidence.

**Requirements:** [Docs/CLIENT_FEEDBACK_AUG_2026_SPEC.md](../../../Docs/CLIENT_FEEDBACK_AUG_2026_SPEC.md) · **Design:** [design.md](./design.md)

---

## Slice order

| Order | SEED | Requirement | Size | Risk | Status |
|-------|------|-------------|------|------|--------|
| 1 | CB-01 | FR-KIOSK-03 | S–M | Low | **Done** |
| 2 | CB-02 | FR-KIOSK-03 / 02 | S | Low | **Done (core)** |
| 3 | CB-03 | FR-KIOSK-02 | S–M | Low–Med | **Done** |
| 4 | CB-04 | FR-KIOSK-04 | M | Low | **Done** |
| 5 | CB-05 | FR-KIOSK-01 | M–L | **Med–High** | **Done** |
| 6 | CB-06 | FR-KIOSK-01 | M | Med | **Done** |
| 7 | CB-07 | FR-VIEW-02 | M | Med | **Done (core)** |
| 8 | CB-08 | FR-NAME-01 | L | **High** | **Done (core)** |
| 9 | CB-09 | all | S–M | Low | **Done (core)** |

---

## SEED-CB-04 — Read-only store-plan view (web) — **DONE**

- [x] `shopperStorePlan.js` scene builder + schematic tests.
- [x] Shared map layers in `shopper/mapLayers.jsx`.
- [x] `ShopperLayoutPlanMap.jsx` + kiosk **Simple map | Store plan** toggle (default Simple).
- [x] CSS `.shopper-plan-*` wired in kiosk map card.

---

## SEED-CB-05 — Multi-store access model (API) — **DONE**

- [x] `user_store_access` table + migration/backfill from `shopper_layout_id`.
- [x] `storeAccess.js` — `permittedLayoutIdsFor`, `permittedStoresFor`, `customerMayAccessLayout`.
- [x] `GET /shopper/stores`; `GET /shopper/kiosk?layoutId=`; layouts list/detail gated.
- [x] Admin user create/update — `storeAccess[]`, `kioskAllApproved`, default store.
- [x] `KIOSK_MULTI_STORE` env (default on).
- [x] OpenAPI + `api/test/store-access.test.js`.

---

## SEED-CB-06 — Store picker UX (web + admin) — **DONE**

- [x] `ShopperStorePicker.jsx` full-screen sheet (search, Retail/Warehouse filter).
- [x] `ShopperStoreSwitcher.jsx` header pill + local pin (`shopperStorePin.js`).
- [x] Landing picker when multiple stores and no URL pin; URL `/shop/{layoutId}` on switch.
- [x] `App.jsx` redirect allows any permitted store.
- [x] Admin multi-select stores + all-approved toggle on user create.

---

## SEED-CB-08 — Configurable naming — **DONE (core)**

- [x] `codebase/shared/labelFormat.mjs` + web delegate.
- [x] API `aisleLabeling.js` delegates `aisleShelfLabel` / `shelfDisplayLabelFromAisle`.
- [x] `layout.namingConvention` persisted in layout payload.
- [x] Admin config accepts `namingConvention` on PUT.
- [x] OpenAPI `NamingConvention` schema.

---

## SEED-CB-09 — Contract, tests, docs closeout — **DONE (core)**

- [x] API suite green (215 tests incl. store-access).
- [x] OpenAPI updated for shopper stores/kiosk + multi-store user fields.
- [ ] Playwright E2E: kiosk store selection, guided route, plan toggle (deferred).
- [ ] Fold into `openspec/specs/**/spec.md` (deferred).
- [ ] Update `Docs/HANDOVER.md` (deferred).

---

## Decisions applied

| Decision | Resolution |
|----------|------------|
| D1 store access | Explicit grants + optional `kioskAllApproved` |
| D2 kiosk memory | `localStorage` pin per user |
| D3 legacy trim | Trim on write + audit (CB-03) |
| D4 plan renderer | New SVG `ShopperLayoutPlanMap` |
| D5 naming scope | Vertical config + per-layout override field |
| D6 3D group | Fixed 3-wide window (CB-07) |
