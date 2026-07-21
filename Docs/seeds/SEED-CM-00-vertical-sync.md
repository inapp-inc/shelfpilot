# SEED-CM-00 — Vertical sync + catalog scoping

**Change:** `catalog-merch-ui-v2` · **Status:** Pending approval

## Problem
Layout editor loads catalog from shell vertical pill; planogram API validates against `layout.vertical` → mismatch, empty or wrong product lists.

## Scope
- Auto-sync vertical on layout open
- Pass layout-scoped catalog to LayoutEditor
- Vertical badge in editor chrome

## Acceptance
- Open retail layout while pharmacy pill selected → editor shows retail SKUs within 1 render cycle
- Planogram POST succeeds for Electronics shelf on retail layout
