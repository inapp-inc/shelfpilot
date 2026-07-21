# Current vs proposed — module reframe

**Change:** `module-reframe-smart-autogen`  
**Date:** 2026-07-16

## What you asked for → how we map it

| Your ask | Current state | Proposed |
|----------|---------------|----------|
| Dashboard shows analytics | Dashboard = layout card grid + filters | **Dashboard = KPI / analytics home** (utilization, shelf count, category mix summary) |
| Layout editor shows what dashboard shows now | Layout Editor = canvas only; list lives on Dashboard | **Layouts module = portfolio list + “New layout” + open canvas** |
| No multi-step wizard | 3-step modal wizard (info → dimensions → review) | **Single form** in one panel/drawer |
| Store type dropdown (Hypermarket, Pharmacy…) | Vertical pills in top bar + wizard uses pill | **Store type** on create form; drives vertical + category templates |
| Better menus / icons / smilies | Text nav + colored dots | **Icon + emoji nav** + module headers |
| Autogen: aisle space + category % sliders | Autogen: orientation only; shelves **unmapped** | **Smart generate**: aisle width + category mix sliders → **pre-mapped shelves** |
| Chilled categories | No temperature zones | **Chilled / frozen** category groups + shelf tagging in autogen |

## Module map (after change)

```
┌─────────────────────────────────────────────────────────────┐
│  ShelfPilot shell — sidebar nav (emoji + label)              │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ 📊       │ 🗺️       │ 📦       │ 📈       │ ⚙️              │
│ Dashboard│ Layouts  │ Catalog  │ Analytics│ Admin           │
│ (M5)     │ (M1+M4)  │ (M3)     │ (M5 deep)│ (M6)            │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
```

| Module | ID | Screen(s) | Primary user job |
|--------|-----|-----------|------------------|
| Dashboard | M-DASH | Home KPIs, charts, recent layouts | “How are my stores performing?” |
| Layouts | M-LAY | Portfolio + create form + canvas editor | “Create / open / edit a floor plan” |
| Catalog | M-CAT | Categories + products (existing v2) | “Manage SKUs and categories” |
| Analytics | M-AN | Compare layouts, allocation drill-down | “Deep-dive reports” |
| Admin | M-ADM | Users, config, audit | “Configure rules and access” |

## Gaps in current code (why change is needed)

| ID | Issue |
|----|-------|
| G1 | Dashboard and Analytics overlap in purpose but neither is the default “home” users expect |
| G2 | Creating a layout requires 3 wizard clicks; store type is implicit (top pill) |
| G3 | Autogenerate ignores category strategy — user must map every shelf manually |
| G4 | No chilled/frozen concept in catalog templates or autogen |
| G5 | Nav lacks visual affordances (icons) for non-technical store planners |

## Out of scope (this change)

- Real refrigeration CAD / MEP
- ML/LLM layout AI
- Multi-store enterprise rollup (single-tenant demo remains)
