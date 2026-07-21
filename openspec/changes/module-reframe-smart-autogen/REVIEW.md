# Review guide — module-reframe-smart-autogen

**Start here** before implementation.

## One-page summary

| Area | Today | After this change |
|------|-------|-------------------|
| **Dashboard** | Layout cards + New layout | **Analytics KPIs** + recent layouts link |
| **Layouts** | Canvas only (list hidden on Dashboard) | **Portfolio + New layout + Canvas** |
| **New layout** | 3-step wizard | **Single form** + **Store type** dropdown |
| **Navigation** | Text + dots | **Emoji + label** sidebar |
| **Generate** | Aisles/shelves, no categories | **Sliders** (veg 50%, chilled…) → **mapped shelves** |

## Documents to read

1. [proposal.md](./proposal.md) — scope & SEED list  
2. [design.md](./design.md) — wireframes, store types, packer logic  
3. [AUDIT.md](./AUDIT.md) — current vs proposed map  
4. [tasks.md](./tasks.md) — implementation checklist  
5. Spec deltas: `specs/dashboard/`, `specs/layouts/`, `specs/ui-fidelity/`

## Store type dropdown (confirm list)

Proposed options:

- 🏬 **Hypermarket**
- 🛒 **Supermarket**
- 💊 **Pharmacy**
- 💄 **Beauty**
- 👔 **Apparel**
- 🏪 **Convenience**

Add/remove any before approve.

## Category mix sliders (confirm zones)

### Hypermarket / Supermarket

| Zone | Emoji | Example % |
|------|-------|-----------|
| Fresh produce / Vegetables | 🥬 | 25 |
| Grocery / Dry goods | 🛒 | 30 |
| **Chilled** | 🧊 | 20 |
| **Frozen** | ❄️ | 10 |
| Seasonal / Promo | 🏷️ | 15 |

### Pharmacy

| Zone | Emoji | Example % |
|------|-------|-----------|
| OTC | 💊 | 40 |
| Rx | 📋 | 15 |
| Vitamins | 🌿 | 20 |
| Personal care | 🧴 | 15 |
| **Chilled** | 🧊 | 10 |

Should sliders **auto-balance to 100%** when you move one, or **block Generate** until total = 100%?

## Decisions needed

| # | Question | Default if no answer |
|---|----------|----------------------|
| 1 | Approve Dashboard = analytics, Layouts = portfolio? | Yes |
| 2 | Store types list OK? Add **Wholesale / Cash & carry**? | Use list above |
| 3 | Slider behavior: auto-balance vs strict 100%? | Auto-balance |
| 4 | Chilled visual: blue shelf border in 2D? | Yes |
| 5 | Keep separate **Analytics** menu for compare, or fold into Dashboard? | Keep both (Dashboard = summary, Analytics = drill-down) |
| 6 | Hypermarket = new config key or extend retail? | New `hypermarket` config |

## Approve?

Reply **"approve module-reframe-smart-autogen"** with any edits to decisions 1–6.

## Quick reference — module ownership

```
📊 Dashboard     → KPIs, charts, recent activity
🗺️ Layouts       → List, create form, canvas, smart generate
📦 Products      → Categories, SKUs, chilled products
📈 Analytics     → Compare layouts, export
⚙️ Admin         → Users, store-type config, audit
```
