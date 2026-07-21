---
name: architecture
description: Use when the spec affects system boundaries, data contracts, APIs, persistence, concurrency, security, performance, or cross-team behavior. Applies platform ADRs and governance; produces or updates OpenAPI specs and design decisions. Invoked by spec-driven-development for design and architectural alignment.
---

# Architecture

Use this skill when the spec affects **system boundaries**, **data contracts**, **APIs**, **persistence**, **concurrency**, **security**, **performance-sensitive paths**, or **cross-team/cross-module behavior**. It is invoked by the spec-driven-development skill during the design phase.

## Core Rules

- **Day-1 platform-fit gate (required before design):** Explicitly confirm whether the project inherits ADR-0001–0016 as-is, or requires an **ADR-0017 exception** filed *before* design proceeds. Record the decision in `design.md` (or a short platform-fit note). Do not discover platform mismatch mid-build.
- **SOLID principles:** Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- **Design patterns:** Apply appropriate patterns (e.g., Repository, Factory, Strategy, Adapter) for clarity, testability, and consistency; document choices in design or ADRs.
- **Major patterns must be considered explicitly:** During design, consult the patterns library and record which patterns were **chosen** vs **rejected** (with brief rationale). Do not treat “patterns” as only OO patterns—include architecture, integration, data consistency, reliability, and security patterns.
- **OpenAPI spec:** Produce and maintain **`<projectDir>/Docs/openapi.yaml`** (or `.json`) that defines all API endpoints, request/response schemas, and auth. This spec is the **contract** for frontend and backend.
- **Container scaffold (required design-phase output for greenfield / deployable services):** Produce a Dockerfile and related compose/deploy stubs consistent with ADR-0003’s deployment strategy and the backbone’s container-first principle. Prefer cloning via the **scaffold** skill rather than inventing layout from scratch.
- For local or low-risk changes, record only the minimal design decision needed; for API-bearing work, still produce or update the OpenAPI spec.
- **Hard enforcement (manual PR operations):** This skill MUST NOT create, open, update, comment on, approve, or merge pull requests. Any PR/merge action is **manual developer work**; this skill only defines design artifacts and required evidence.
- **OpenSpec design output:** At the end of design, ensure there is an OpenSpec change folder capturing proposal + design + tasks + spec deltas:
  - `<projectDir>/openspec/changes/<change-id>/proposal.md`
  - `<projectDir>/openspec/changes/<change-id>/design.md`
  - `<projectDir>/openspec/changes/<change-id>/tasks.md`
  - `<projectDir>/openspec/changes/<change-id>/specs/**/spec.md`

## Sprint Mode

When Sprint Mode is declared: compress patterns-library breadth in write-ups; do **not** compress platform-fit, OpenAPI (`Docs/openapi.yaml`), or container scaffold obligations.

## Patterns Library (Required Design Input)

Use this as the canonical reference for “major architecture and design patterns”, including short explanations and selection heuristics:

- `.cursor/skills/_resources/architecture-patterns/ARCHITECTURE-AND-DESIGN-PATTERNS.md`

Minimum expectation for an architecture/design output is a short **“Patterns considered”** section (copy the checklist from the library doc) that makes the pattern choices explicit and reviewable.

## Platform Architecture (Master Reference)

The platform is **cloud-native, modular, multi-tenant**, with:

- **Modular monolith first** — clear boundaries before distribution
- **Extensibility by design** — plugins and capability services
- **Event-driven where it matters** — loose coupling, asynchronous workflows
- **Cloud-native, not cloud-locked** — managed services, avoid vendor lock-in
- **Security and tenant isolation** as first-class concerns
- **Progressive scaling** — no speculative scaling

**Stack:** MERN (MongoDB, Express, React, Node.js) as system of record; Python-based capability services for analytics, ML, heavy computation; polyglot persistence; no shared databases across boundaries.

Full executive summary and ADR governance: **`.cursor/skills/_resources/architecture-adr/EXEC-SUMMARY-AND-ADR-GOVERNANCE.md`**  
Platform blueprint (MERN + Python): **`.cursor/skills/_resources/architecture-adr/backbone-mern-python.md`**

## ADR Governance

- **Foundational ADRs:** ADR-0001 through ADR-0016 define the default architecture. Do not bypass without explicit review.
- **ADR-0017** governs ecosystem expansion, exceptions, customer-specific deviations, regional/compliance adaptations, experimental architectures.
- **New ADR only when:** a foundational principle is violated or replaced, a platform-wide default changes, a previous ADR is reversed, or a new architectural axis is introduced.
- **No new ADR for:** adding/removing plugins, scaling within strategy, new services under existing rules, tenant-specific config, threshold adjustments, feature flags. These are governed by existing ADRs.
- ADRs are **immutable** once accepted; revisions require a **superseding ADR**, not edits.

All ADR documents: **`.cursor/skills/_resources/architecture-adr/`** (ADR-0001 through ADR-0018).

## When To Invoke This Skill

Invoke when the spec involves:

- New or changed system boundaries, services, or modules
- Data models, persistence, or migrations
- API design, versioning, or compatibility
- Security, identity, tenant isolation
- Eventing, async communication, scaling, observability
- CI/CD, configuration, feature flags, disaster recovery
- Cost, FinOps, or architecture evolution (e.g. service extraction)
- Greenfield projects (platform-fit gate + container scaffold required)

For each of these, **read the relevant ADR(s)** in `.cursor/skills/_resources/architecture-adr/` before making design decisions.

## OpenAPI Obligation

When the work introduces or changes APIs:

1. Create or update **`<projectDir>/Docs/openapi.yaml`** (or `.json`) with endpoints, request/response schemas, auth.
2. Treat it as the single source of truth for frontend and backend.
3. Implementation and testing (including contract validation) must refer to this path.

## Container Scaffold Obligation

When the work is greenfield or introduces a deployable service:

1. Ensure a Dockerfile (and compose/deploy stubs as needed) exists, aligned with ADR-0003.
2. Prefer **scaffold** skill: clone the starter template, then diverge for project specifics.
3. Record container/runtime decisions in `design.md`.

## Failure Modes To Avoid

- Expanding scope without updating the spec.
- Designing in isolation from ADRs and platform principles.
- Skipping the Day-1 platform-fit gate and discovering stack mismatch mid-implementation.
- Introducing API or data contract changes without updating the OpenAPI spec.
- Omitting container scaffold for greenfield / deployable work.
- Silent or undocumented deviations from ADRs (governed by ADR-0017).

## Handoff

When handing off to implementation: state platform-fit decision; state which ADRs apply; provide or reference the OpenAPI spec and container scaffold; list design decisions and where they are documented. This skill succeeds when design is traceable to the spec and to platform ADRs, and the OpenAPI contract is clear for implementers and testers.
