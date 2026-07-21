# Proposal: ShelfPilot UI + Mock API MVP

## Why

Deliver an interactive prototype of the Graphical Store Layout Design Solution (ShelfPilot) so planners can design, map, visualize (2D/3D), and report on store layouts across verticals via configuration.

## What changes

- Greenfield platform scaffold (Express API + React web + Docker)
- Mock auth + RBAC
- Layout editor domain APIs (stores, layouts, aisles, fixtures, mappings, auto-calc)
- Catalog, analytics, admin/config APIs
- React SPA implementing Login, Dashboard, Layout Editor, Products, Analytics, Admin

## Out of scope

POS, real-time inventory, procurement, structural engineering, foot-traffic sensors, external IdP, production multi-tenancy.

## Impact

- New codebase under `codebase/`
- Canonical contract: `Docs/openapi.yaml`
- Specs under `openspec/specs/**`
