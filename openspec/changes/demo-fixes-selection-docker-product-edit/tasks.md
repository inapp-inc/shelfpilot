# Tasks — demo-fixes-selection-docker-product-edit

## SEED-FX-01 — Selection: deselect on mousedown, not click
- [x] Move empty-floor deselect from `onClick` to `onMouseDown` (guard `e.target === e.currentTarget`).
- [x] Keep placement/vertex-draw on `onClick` (no deselect there).
- [x] Verify a shelf/aisle stays selected when the mouse is released just off it.

## SEED-FX-02 — Selection: z-index layering
- [x] Zone `zIndex` selected `2` / idle `0`.
- [x] Aisle `zIndex` selected `3` / idle `1`.
- [x] Shelf `zIndex` selected `6` / idle `5` (always above zones/aisles).
- [x] Entry point `zIndex` `7`.
- [x] Confirm shelves overlapped by a selected zone/aisle are still clickable.

## SEED-FX-03 — Docker: cache-bust so builds always ship
- [x] `Dockerfile.web`: `ARG CACHEBUST` after `npm install`, referenced before source COPY.
- [x] `Dockerfile` (api): `ARG CACHEBUST` after deps copy, referenced before `COPY api`.
- [x] `docker-compose.yml`: pass `CACHEBUST: ${CACHEBUST:-dev}` to `api` + `web`.
- [x] `scripts/docker-rebuild.mjs` + `npm run docker:rebuild` (fresh timestamp → build → force-recreate).
- [ ] Manual: `npm run docker:rebuild`, confirm latest bundle in the running container.

## SEED-FX-04 — Product edit from list
- [x] Product name is a clickable edit link (`.linklike`) when editing is allowed.
- [x] Existing Edit button retained; both open the drawer with all fields prefilled.

## SEED-FX-05 — Docs
- [x] `Docs/DEMO_CHANGES_SUMMARY.md` — Iteration 5 section + Docker note.
- [x] This change pack (`proposal.md` + `tasks.md`).

## Notes
- No API/schema changes. Web has no unit-test runner; verified by lint + build + manual.
- If product Edit "was missing", it was a stale Docker image — rebuild with `npm run docker:rebuild`.
