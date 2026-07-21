# Tasks: module-reframe-smart-autogen

**Status:** Implemented

## SEED-MR-00 — Module shell + emoji nav
- [ ] Split routes: `dashboard` | `layouts` | `layouts/:id` | `catalog` | `analytics` | `admin`
- [ ] Sidebar emoji + label; remove layout grid from Dashboard route
- [ ] Feature flag `MODULE_REFRAME` for rollback

## SEED-MR-01 — Dashboard analytics home
- [ ] `DashboardPage.jsx` — KPI cards, allocation chart, recent layouts strip
- [ ] Wire aggregate analytics API or portfolio summary

## SEED-MR-02 — Layouts portfolio + single-form create
- [ ] `LayoutsPortfolio.jsx` — move card grid from App dashboard
- [ ] `LayoutCreateDrawer.jsx` — single form (name, store type, W×D×H, shape)
- [ ] Remove 3-step wizard modal

## SEED-MR-03 — Store type registry
- [ ] `storeTypes.js` — Hypermarket, Supermarket, Pharmacy, …
- [ ] Admin seed configs for hypermarket / convenience
- [ ] Create layout passes `vertical` from store type

## SEED-MR-04 — Smart generate UI
- [ ] `SmartGeneratePanel.jsx` + `CategoryMixSliders.jsx`
- [ ] Aisle space field, orientation, mix total indicator
- [ ] Store-type-specific default mix templates

## SEED-MR-05 — Category-aware packer + API
- [ ] `categoryMixPacker.js` — assign categoryId + temperatureZone per shelf
- [ ] Extend `POST .../autogenerate` body with `categoryMix[]`
- [ ] OpenAPI + shelf schema `temperatureZone`

## SEED-MR-06 — Chilled / frozen catalog seed
- [ ] Categories: Chilled, Frozen, Fresh produce per vertical
- [ ] Demo products; `npm run seed:demo` update
- [ ] 2D styles: `.shelf-chilled`, `.shelf-frozen`

## SEED-MR-07 — Validation & docs
- [ ] Tests: mix 50/50 produces ~50/50 shelf counts
- [ ] Fold spec deltas into baseline
- [ ] Update HANDOVER, FSD module section
