# Design: UI reference integration

## Platform-fit

Unchanged — ADR-0001 as-is. Frontend remains React; Three.js for 3D as in prototype.

## Visual SoT

| Priority | Source |
|----------|--------|
| 1 | `ui/ShelfPilot.dc.html` |
| 2 | `ui/brand.md` |
| 3 | `Discovery and Design/Claude_UI_Generation_Brief.md` (prompt archive) |

## Patterns

- Presentational React port of DC screens (not iframe of `.dc.html`)
- API client for persistence; local UI state for selection/zoom/wizard
- Config-driven verticals matching prototype `VERTICALS` map

## Risks

- DC file depends on missing `support.js` — not runnable standalone; React is the executable UI
- Pixel drift — mitigate with side-by-side checklist in validation
