# Audit — dual-face numbered shelves + strict drawn area

**Change:** `dual-face-numbered-shelves-strict-polygon`  
**Date:** 2026-07-16

## Your request → mapping

| Your ask | Current behavior | Gap |
|----------|------------------|-----|
| Shelves both sides for items | Single `categoryId` + one `planogram[]` per shelf | No Face A / Face B |
| Shelf numbers for both sides | Canvas shows `shelf` / `gondola` + planogram count | No display numbers |
| Each number = category | Category shown by color only; no numeric ID | Need `displayNumber` + legend |
| Don't show type label | Canvas renders `{f.type}` text | Remove type label |
| Strict with drawn inner boundary | Packer skips outside (recent fix); canvas still **full rectangle** AABB | Visual overflow / grid outside polygon |
| Drawn area only for aisles/shelves | Polygon stored; rectangle W×D still drives canvas size | Fixture zone ≠ visual zone |

## Current code baseline (Jul 2026)

| Area | State |
|------|-------|
| `polygonContainment.js` | Grid-sampling `rectFullyInsidePolygon`; rotated footprint fix |
| `layoutPacker.js` | Skips shelves that don't fit |
| `Canvas2D.jsx` | Full `widthMeters × depthMeters` div; clip-path on polygon; shows type label |
| Planogram API | Single planogram array per shelf |
| Smart autogen | `categoryId` on shelf; no face split |

## Module impact

| Module | Change |
|--------|--------|
| Layout editor canvas | Strict polygon viewport; numbered badges |
| Merchandising panel | Face A / B tabs |
| API / OpenAPI | `faces[]`, `displayNumber` |
| Packer / autogen | Dual-face assignment, sequential numbering |

## Out of scope

- End-cap special fixtures
- Automatic aisle generation outside polygon for circulation (polygon **is** the walkable + fixture zone)
- 3D separate meshes per face (2D/3D may show combined number badge in v1)
