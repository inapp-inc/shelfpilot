# Dashboard UI Refactor & Analytics Integration

**Date:** July 2026  
**Modules:** Dashboard (home), M9 Analytics  
**Related:** `Docs/ANALYTICS_DASHBOARD_CUSTOMIZATION.md`, `Docs/Store_Layout_Reports_Logic_and_Visualization.md`

---

## Summary

The **Dashboard** was refactored for a cleaner layout and now embeds the same **M9 analytics widget board** used on the Analytics module — with customizable, resizable cards and separate saved preferences.

---

## Dashboard layout (top to bottom)

| Section | Purpose |
|---------|---------|
| **Header** | Title, subtitle, **+ New layout** |
| **Pipeline strip** | Counts by status (Draft, In review, Approved, Rejected) — click to filter Layouts |
| **Hero grid** | Featured layout (last edited) + Quick actions |
| **Layout analytics** | Full M9 widget board for selected layout |

Inline styles were removed in favour of `.dashboard-*` CSS classes.

---

## Analytics on Dashboard

The dashboard uses `AnalyticsWidgetBoard` with:

- **Storage key:** `shelfpilot.dashboardWidgets` (separate from Analytics module prefs)
- **Default widgets:** Executive KPIs, space utilization, category allocation, fixture mix, product coverage
- **Customize / resize / hide:** Same behaviour as Analytics module
- **Layout picker:** Select which layout drives the charts below the hero section
- **Link:** Quick action **Full analytics module →** opens the dedicated Analytics page (all widgets including compare, compliance tables, etc.)

Dashboard and Analytics module preferences are **independent** — customizing one does not change the other.

---

## Shared component architecture

```
AnalyticsWidgetBoard.jsx     ← shared widget rendering, API fetch, customize, resize
├── AnalyticsPage.jsx        ← full analytics module (all widgets by default)
└── DashboardPage.jsx        ← home overview (curated default widgets)
```

| File | Role |
|------|------|
| `analyticsWidgets.js` | Widget registry, `readWidgetBoardPrefs` / `writeWidgetBoardPrefs`, dashboard defaults |
| `AnalyticsWidgetCard.jsx` | Removable, resizable card shell |
| `AnalyticsWidgetBoard.jsx` | Data loading + widget render switch |
| `DashboardPage.jsx` | Portfolio UI + embedded board |
| `AnalyticsPage.jsx` | Thin wrapper around board |

---

## Default dashboard widgets

| Widget | Shown by default |
|--------|------------------|
| All 6 executive KPIs | ✓ |
| Space utilization (§1.1) | ✓ |
| Category allocation (§3.1) | ✓ |
| Fixture mix (§2.2) | ✓ |
| Product coverage (§3.3) | Hidden on dashboard (use **Product coverage** KPI + Analytics module) |
| Capacity compare, vertical space, aisle/unmapped tables, scenario compare | Hidden (add via Customize) |

---

## Test plan

1. Open **Dashboard** → pipeline counts, featured layout, quick actions render without inline layout glitches.
2. Scroll to **Layout analytics** → KPIs and charts load for selected layout.
3. **Customize** on dashboard → hide a widget → reload → preference persists under `shelfpilot.dashboardWidgets`.
4. Open **Analytics** module → confirm dashboard changes did **not** affect analytics prefs.
5. Click **Full analytics module →** → navigates to Analytics with full widget set.
6. Resize a dashboard card → grip works; double-click resets.
7. Mobile width → hero grid stacks to single column.
