# Gaps Questionnaire: Gaps Questionnaire: ShelfPilot

**Purpose:** Capture unknowns, assumptions, and gaps between stated needs and current system behavior before writing the Functional Specification Document (FSD). Once filled, this questionnaire is the primary input for FSD creation.

**Version:** 1.0  
**Date:** 2026-07-14  
**Status:** Complete  
**Reviewed by:** Foundry SDD (project.md)  
**Reviewed at:** 2026-07-14  
**Source docs:** `project.md`

---

## How to use

1. Fill **Answer / Owner / Confidence** for each row.
2. Any item left at **Confidence = L** is treated as a **blocked spec** for the impacted epic/slice.
3. When answered, translate each item into either an FSD requirement/acceptance criterion, or an explicit assumption/constraint in the FSD.

---

## 1. Functional gaps

| ID | Question / Gap | Answer | Owner | Confidence (H/M/L) |
|----|----------------|--------|-------|--------------------|
| F1 | Which user roles must be supported in v1? | Designer, Approver, Viewer, Admin (email/password sign-in with role selection). Maps to BR-09. | Product | H |
| F2 | What screens constitute the UI + mock API MVP? | Login, Dashboard, Layout Editor (M1/M2/M4), Products & Categories (M3), Analytics (M5), Admin & Config (M6). | Product | H |
| F3 | What layout editor capabilities are in scope for MVP? | Scaled canvas, fixtures, aisle validation, auto-calc, category mapping, 2D/3D (Three.js). | Product | H |
| F4 | How are verticals supported without code changes? | Global + vertical config for UoM, templates, compliance. Retail, Pharmacy, Beauty, Apparel. | Product | H |
| F5 | What analytics are required for MVP? | Utilization, category allocation, shelf capacity, version comparison (mock OK). | Product | H |

---

## 2. Data and domain gaps

| ID | Question / Gap | Answer | Owner | Confidence (H/M/L) |
|----|----------------|--------|-------|--------------------|
| D1 | What are the core domain entities? | User, Role, Store, Layout, Zone, Aisle, Fixture, Category, Product, CategoryMapping, VerticalConfig, AuditEvent, ApprovalWorkflow. | Architecture | H |
| D2 | What persistence model for UI + mock API phase? | In-memory / JSON seed for prototype; Mongo schema for platform-fit. Assumption A-D2. | Architecture | M |
| D3 | Are store dimensions provided at creation? | Yes — length/width/height or polygon boundaries. | Product | H |

---

## 3. Integration and API gaps

| ID | Question / Gap | Answer | Owner | Confidence (H/M/L) |
|----|----------------|--------|-------|--------------------|
| I1 | External system integrations in MVP? | None. POS/inventory/etc. out of scope. | Product | H |
| I2 | Auth mechanism for UI + mock API phase? | Mock email/password + role; session/token from API. No IdP. | Security | H |
| I3 | Canonical API contract location? | Docs/openapi.yaml | Architecture | H |

---

## 4. Non-functional and constraints

| ID | Question / Gap | Answer | Owner | Confidence (H/M/L) |
|----|----------------|--------|-------|--------------------|
| N1 | 3D performance constraints? | Standard business hardware; Three.js; no specialized GPU. | Engineering | H |
| N2 | Platform / stack constraints? | ADR-0001 MERN + Python as-is. | Architecture | H |
| N3 | Multi-tenancy Day-1? | Single-tenant prototype; tenantId reserved. | Architecture | M |
| N4 | Branding constraints? | ShelfPilot crimson #A30A2A; Plus Jakarta Sans; DM Mono; Foundry attribution. | Design | H |

---

## 5. Scope and out-of-scope

| ID | Question / Gap | Answer | Owner | Confidence (H/M/L) |
|----|----------------|--------|-------|--------------------|
| S1 | What is in scope for this delivery? | Full M1–M6 UI + mock API phase capabilities. | Product | H |
| S2 | What is explicitly out of scope? | POS, inventory, procurement, structural engineering, foot-traffic hardware. | Product | H |
| S3 | Missing source docs referenced by project.md? | BRD/FRD/ui/requirements absent; project.md authoritative. | Product | M |

---

## 6. Open decisions

| ID | Decision needed | Options | Owner | Due |
|----|-----------------|---------|-------|-----|
| O1 | Mock API persistence | In-memory+JSON seed (chosen) \| Mongo from Day-1 | Architecture | 2026-07-14 |
| O2 | Auto-calc location | Node in Express for MVP (chosen) \| Python microservice | Architecture | 2026-07-14 |
