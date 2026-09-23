# ShelfPilot — Graphical Store Layout Design & Planning

> A vertical-agnostic platform for designing, visualizing, and optimizing physical-store layouts in 2D and 3D.
> _Built by the Foundry (InApp)._

Canonical OpenSpec copy of the product brief. Source: repository root `project.md`.

## Status

Demo / local MVP — iterating on customer demo feedback (Aug 2026).  
Living BRD addendum: `Docs/BRD_ADDENDUM_DEMO_AUG_2026.md`.

## Modules

- M1 Store Setup, Canvas & Aisle Management (incl. floor-plan import)
- M2 Shelving, Storage & Auto-Calculation (Smart Generate; temporary storage delivered)
- M3 Product & Category Management
- M4 Category Mapping & 2D/3D Visualization (aisle-centric selection; Customer wayfinding delivered, core)
- M5 Analytics & Reporting
- M6 Administration & Configuration (Customer role + Warehouse type delivered)

## Recent delivery (Jul–Aug 2026)

- Floor plan import → dimensions → packer build
- Planogram dimension fill + stack height by level clearance
- Ctrl+move/resize shelves; Enter exits
- 3D product images (planogram View in 3D)
- Aisle-centric labels; arrangement summary gate

## Aug 2026 demo requirements — delivered

All shipped; see root `project.md` §6 and `Docs/PENDING.md` §10 for status, §2 for open follow-ups
(Customer 2D map UX polish, Warehouse shared-vs-separate editor UX decision).

- Aisle-based selection/highlight (not gondola pair co-select) in 2D & 3D — **Done**
- 1 cm product buffer in facing math — **Done**
- Temporary storage fixtures — **Done**
- Customer role + full-screen find + flat aisle shelf viewer — **Done** (core)
- Warehouse store type — **Done** (core; editor-UX design question open)

## Delivery constraints

- Configuration-only verticals (no code forks)
- Aisle binding is source of truth for shopper-facing shelf identity
- Three.js for 3D on standard business hardware
- Stack: ADR-0001 MERN + Python (as-is)
- Contract: `Docs/openapi.yaml`
