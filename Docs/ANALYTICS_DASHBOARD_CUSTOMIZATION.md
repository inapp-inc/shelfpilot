# Analytics Dashboard Customization

**Date:** July 2026  
**Module:** M9 — Analytics & Reporting  
**Related:** `Docs/Store_Layout_Reports_Logic_and_Visualization.md`

---

## Summary

The Analytics page now supports **user-configurable widgets**. Each KPI tile, chart, table, and tool panel can be hidden or restored individually. Preferences persist in the browser so returning users see their chosen layout.

Layout spacing was tightened so hidden widgets do not leave empty gaps — the grid reflows to use available space efficiently.

---

## User-facing behavior

### Hide a widget

1. Open **Analytics** and select a layout.
2. Hover any KPI tile or report panel.
3. Click the **×** button in the top-right corner of that widget.

The widget is removed immediately and the remaining panels reflow to fill the space.

### Resize a widget

1. Hover a KPI tile or report panel.
2. Drag the **corner grip** at the bottom-right to resize:
   - **Horizontal drag** (on release) snaps width to 1 column, 2 columns, or full row (report panels only).
   - **Vertical drag** sets a minimum card height (content scrolls inside if needed).
3. **Double-click** the grip to cycle width (1 → 2 → full → …) and reset height to auto.

KPI tiles support 1- or 2-column width. Report panels support 1 column, 2 columns, or full width.

### Restore widgets

1. Click **Customize dashboard** in the page header.
2. Use the toggle chips grouped under **Executive KPIs**, **Reports**, and **Tools**.
   - Active widgets show **✓** and a highlighted chip.
   - Hidden widgets show **+** and can be clicked to add back.
3. Click **Done** to close the customize panel.

Additional actions in the customize panel:

| Action | Effect |
|--------|--------|
| **Show all (N hidden)** | Restores every widget |
| **Reset to default** | Restores the original out-of-box widget set and default sizes |

### Empty state

If all widgets are hidden, the page shows a prompt with a **Customize dashboard** button.

---

## Widget catalog

| ID | Label | Group | Default | Full width |
|----|-------|-------|---------|------------|
| `kpi-utilization` | Utilization | KPI | ✓ | |
| `kpi-product-coverage` | Product coverage | KPI | ✓ | |
| `kpi-aisle-compliance` | Aisle compliance | KPI | ✓ | |
| `kpi-unmapped-shelves` | Unmapped shelves | KPI | ✓ | |
| `kpi-fixtures` | Fixtures | KPI | ✓ | |
| `kpi-capacity-variance` | Capacity variance | KPI | ✓ | |
| `space-utilization` | Space utilization (§1.1) | Report | ✓ | |
| `category-allocation` | Category space allocation (§3.1) | Report | ✓ | |
| `fixture-mix` | Fixture mix (§2.2) | Report | ✓ | |
| `capacity-compare` | Capacity vs auto-calc (§2.1) | Report | ✓ | |
| `vertical-space` | Vertical space by level (§1.4) | Report | ✓ | ✓ |
| `aisle-compliance` | Aisle compliance detail (§4.1) | Report | ✓ | ✓ |
| `unmapped-shelves` | Unmapped shelves detail (§1.3) | Report | ✓ | ✓ |
| `product-coverage` | Product mapping coverage (§3.3) | Report | ✓ | ✓ |
| `scenario-compare` | Scenario comparison (§2.3) | Tool | ✓ | ✓ |

Report section references map to `Docs/Store_Layout_Reports_Logic_and_Visualization.md`.

---

## Persistence

| Key | Storage | Scope |
|-----|---------|-------|
| `shelfpilot.analyticsWidgets` | `localStorage` | Per browser / device |

Stored shape (v2):

```json
{
  "v": 2,
  "visible": ["kpi-utilization", "space-utilization"],
  "sizes": {
    "space-utilization": { "colSpan": 2, "height": 280 },
    "kpi-utilization": { "colSpan": 1, "height": null }
  }
}
```

| Field | Values | Notes |
|-------|--------|-------|
| `colSpan` | `1`, `2`, `"full"` | KPI widgets: `1` or `2` only. `"full"` = entire grid row. |
| `height` | `null` or pixels | `null` = auto height. Set by vertical resize (96–640 px). |

- v1 prefs (visible only) migrate automatically on read.
- Preferences are **not** synced to the server or tied to user accounts in this release.
- Clearing site data resets the dashboard to defaults.

---

## Layout improvements

Changes applied alongside customization:

| Area | Before | After |
|------|--------|-------|
| Page vertical gap | 16px | 12px |
| KPI grid | `minmax(160px, 1fr)`, 14px gap | `minmax(140px, 1fr)`, 10px gap |
| Report grid | Fixed 2-column | `auto-fill` with `minmax(300px, 1fr)` — reflows when panels hidden |
| Panel padding | Varied | 14–16px consistent |
| Section labels | Always shown | KPI section label hidden when all KPIs removed |
| Compare / product panels | Separate blocks with extra margin | Integrated into unified report grid |

Hidden widgets are **not rendered**, so there are no placeholder boxes or dead whitespace.

---

## Implementation

### Files added

| File | Purpose |
|------|---------|
| `codebase/web/src/modules/analyticsWidgets.js` | Widget registry, defaults, localStorage read/write |
| `codebase/web/src/modules/AnalyticsWidgetCard.jsx` | Removable panel wrapper, drag resize grip, column snap |

### Files changed

| File | Change |
|------|--------|
| `codebase/web/src/modules/AnalyticsPage.jsx` | Widget-driven rendering, customize panel, hide/show actions |
| `codebase/web/src/styles.css` | `.analytics-*` styles for customize UI, widget remove button, denser grid |

### Architecture

```
AnalyticsPage
  ├── readAnalyticsWidgetPrefs()  → visible widget IDs
  ├── CustomizePanel            → toggle chips, show all, reset
  ├── KPI section               → renders visible kpi-* widgets only
  └── Report grid               → renders visible report/tool widgets only
        └── AnalyticsWidgetCard → × remove + panel content
```

Adding a new report widget:

1. Add an entry to `ANALYTICS_WIDGETS` in `analyticsWidgets.js`.
2. Add a `case` in `renderWidget()` inside `AnalyticsPage.jsx`.
3. No API changes required unless the widget needs new data.

---

## Out of scope (future)

- Drag-and-drop reorder of widgets
- Free-form pixel width (non-grid snap)
- Server-side preference sync per user account
- Saved named dashboard layouts (e.g. “Merchandising view”, “Compliance view”)
- Widget resize (half / full width toggle beyond the fixed `wide` flag)

---

## Test plan

1. Open Analytics → confirm all default widgets visible.
2. Hide a KPI and a chart via **×** → grid reflows, no empty slot.
3. Drag resize grip on a report panel wider → snaps to 2 columns or full row on release.
4. Drag resize grip taller → card min-height increases; scroll appears if content overflows.
5. Double-click grip → width cycles; height resets to auto.
6. Open **Customize dashboard** → toggle widgets on/off → confirm immediate update.
7. Click **Reset to default** → all defaults and sizes restored.
8. Hide all widgets → empty state with customize button appears.
9. Reload page → hidden/visible set and sizes persist from localStorage.
10. Narrow viewport (< 900px) → single-column report grid, no horizontal overflow.
