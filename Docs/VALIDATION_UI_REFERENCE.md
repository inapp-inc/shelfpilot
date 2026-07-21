# Validation — UI reference integration (SEED-09)

**Date:** 2026-07-14  
**Visual SoT:** `ui/ShelfPilot.dc.html`  
**Executable UI:** `codebase/web`

## Side-by-side checklist

| Region | Reference | React port | Status |
|--------|-----------|------------|--------|
| Login logo (shelf bars) + hero ShelfPilot | yes | yes | Match |
| Login card + Foundry footer | yes | yes | Match |
| Sidebar + nav dots + Foundry footer | yes | yes | Match |
| Vertical pills in top bar | yes | yes | Match |
| Dashboard cards + status chips + filters | yes | yes | Match |
| 3-step wizard modal | yes | yes | Match |
| Editor: palette \| canvas \| properties | yes | yes | Match |
| Auto-calc + zoom + aisle violation banner | yes | yes | Match |
| 2D / 3D toggle + Three.js wash `#e9e5e0` | yes | yes | Match |
| Products tree + table | yes | yes (catalog from reference) | Match |
| Analytics KPIs | yes | yes | Match |
| Admin tabs (5) | yes | yes | Match |
| Toasts | yes | yes | Match |

## API regression

Run: `cd codebase/api && node --test test/health.test.js test/shelfpilot.test.js`  
Expect: all tests pass (category id `otc` aligned with UI reference).

## How to review visually

```bash
cd codebase
npm run dev:api
npm run dev:web
```

Open `ui/ShelfPilot.dc.html` in Design Canvas (or inspect markup) alongside http://localhost:5173.
