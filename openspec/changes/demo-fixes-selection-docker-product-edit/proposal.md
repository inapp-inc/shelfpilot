# Proposal — demo-fixes-selection-docker-product-edit

## Why
Three demo blockers reported after the previous iteration:
1. Shelves (and aisles) **sometimes don't select** — they select then instantly deselect, or a
   selected zone/aisle sits on top of shelves and swallows the click. The earlier click/drag fix
   did not fully cover releasing the mouse just off a shelf.
2. **Docker rebuilds don't reflect source changes** — cached layers ship a stale bundle unless the
   user remembers `--no-cache`, so new features (e.g. product edit) appear "missing".
3. Users need an obvious way to **edit products** from the Products list.

## What changes
- **Selection reliability (`Canvas2D`):**
  - Move the empty-floor **deselect from `onClick` to `onMouseDown`**. Entity mousedowns already
    `stopPropagation`, so a shelf/aisle stays selected even when the mouse is released just off it
    onto the floor. Placement/vertex-draw stay on `onClick`.
  - Re-layer z-index so **shelves are always the top interactive layer**: zone `0/2` <
    aisle `1/3` < shelf `5/6` < entry point `7`. A selected zone/aisle no longer covers shelves.
- **Docker cache-busting:**
  - Add a `CACHEBUST` build ARG to `Dockerfile` and `Dockerfile.web`, referenced right after
    `npm install`, so source + build layers rebuild every time while deps stay cached.
  - `docker-compose.yml` forwards `CACHEBUST: ${CACHEBUST:-dev}` to both services.
  - Add `scripts/docker-rebuild.mjs` + `npm run docker:rebuild` (cross-platform) that sets a fresh
    timestamp `CACHEBUST`, builds, and `up -d --force-recreate`.
- **Product edit discoverability:** make the product **name a clickable edit link** in the Products
  table (in addition to the existing Edit button). No API change — edit was already wired.

## Impact
- Affected UI: `web/src/layout-editor/Canvas2D.jsx`, `web/src/catalog/CatalogPage.jsx`,
  `web/src/styles.css`.
- Affected build/infra: `Dockerfile`, `Dockerfile.web`, `docker-compose.yml`,
  `scripts/docker-rebuild.mjs`, `package.json`.
- No schema, API, or data-contract changes. No breaking changes.

## Verification
- Manual: click shelves/aisles on the canvas (including releasing just off the shape, and where a
  selected zone/aisle overlaps a shelf) — selection sticks.
- `npm run docker:rebuild` — confirm the running app shows the latest bundle (product Edit visible).
- Products list: name and Edit button both open the edit drawer with all fields prefilled.
