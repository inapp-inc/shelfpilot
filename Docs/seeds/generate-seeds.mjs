/**
 * Generate SEED unit markdown files from the full demo-stack plan.
 * Run: node Docs/seeds/generate-seeds.mjs
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;

const STACK = `Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.`;

const seeds = [
  {
    id: "SEED-00-bootstrap",
    phase: 0,
    status: "Done",
    goal: "Scaffold ShelfPilot codebase with health API and project layout.",
    inScope: ["Scaffold clone into codebase/", "Health endpoint", "Docs/openapi.yaml stub", "Package naming"],
    outScope: ["Domain features", "Auth", "UI screens"],
    constraints: {
      performance: "N/A — bootstrap",
      security: "N/A — no auth yet",
      observability: "Correlation-id middleware from scaffold",
      backward: "N/A — greenfield",
      cost: "N/A",
    },
    ac: [
      "Given the API is running, When GET /health, Then response is 200 with ok true and correlationId.",
      "Given the repo, When inspecting Docs/, Then openapi.yaml exists.",
    ],
    evidence: ["codebase/api/test/health.test.js", "Docs/openapi.yaml"],
    risks: "Scaffold drift from platform starter.",
    rollback: "Delete codebase/ and re-run clone-scaffold.",
    spec: "openspec/changes/shelfpilot-mvp/",
    skills: "scaffold",
  },
  {
    id: "SEED-00b-sqlite-docker",
    phase: 0,
    status: "Done",
    goal: "Replace in-memory store with SQLite and ship local Docker Compose (api + web + volume).",
    inScope: ["node:sqlite repository", "SQLITE_PATH", "Dockerfile/Dockerfile.web", "docker-compose.yml", "Data durability across restart"],
    outScope: ["MongoDB", "Production orchestration"],
    constraints: {
      performance: "N/A — local single-node demo",
      security: "N/A — demo DB file; not multi-tenant",
      observability: "Stdout logs; compose healthcheck on /health",
      backward: "API contract unchanged",
      cost: "N/A",
    },
    ac: [
      "Given a created layout, When API restarts with same SQLITE_PATH, Then GET layout returns the same fixtures.",
      "Given docker compose up --build, When GET /health on api, Then ok true.",
      "Given npm test, When run on Node >= 22.5, Then all API tests pass.",
    ],
    evidence: ["codebase/api/src/store/sqlite.js", "Docs/ARCHITECTURE_LOCAL.md", "API test suite"],
    risks: "SQLite not suitable for multi-instance prod.",
    rollback: "Wipe volume shelfpilot_data or delete SQLITE_PATH file; re-seed.",
    spec: "Docs/ARCHITECTURE_LOCAL.md",
    skills: "observability",
  },
  {
    id: "SEED-00c-openapi-align",
    phase: 0,
    status: "Todo",
    goal: "Align Docs/openapi.yaml with every live API route and schema used by the UI.",
    inScope: ["Document all Express routes", "Sync request/response schemas", "openapi:check script green"],
    outScope: ["New business features", "Breaking URL renames without version note"],
    constraints: {
      performance: "N/A — docs only",
      security: "N/A — contract documentation",
      observability: "N/A — no runtime change",
      backward: "Additive preferred; breaking changes must be called out",
      cost: "N/A",
    },
    ac: [
      "Given codebase/api routes, When comparing to Docs/openapi.yaml, Then every path+method is documented.",
      "Given npm run openapi:check, When executed, Then exit code 0.",
    ],
    evidence: ["openapi:check output", "Docs/openapi.yaml diff"],
    risks: "UI relies on undocumented fields.",
    rollback: "Revert openapi.yaml commit.",
    spec: "Docs/openapi.yaml",
    skills: "none",
  },
  {
    id: "SEED-01-auth-rbac",
    phase: 1,
    status: "Done",
    goal: "Mock email/password login with role selection and bearer-token RBAC.",
    inScope: ["POST /auth/login", "GET /auth/me", "Role guards on mutations", "Login UI"],
    outScope: ["OIDC/IdP", "Password hashing beyond demo"],
    constraints: {
      performance: "N/A — auth only",
      security: "Mock credentials; never log passwords; RBAC on routes",
      observability: "Audit login events",
      backward: "N/A — greenfield auth",
      cost: "N/A",
    },
    ac: [
      "Given valid email/password/role, When login, Then token and user are returned.",
      "Given Viewer token, When POST /layouts, Then 403.",
    ],
    evidence: ["codebase/api/test/shelfpilot.test.js"],
    risks: "Mock auth must not ship to production.",
    rollback: "Disable protected routes behind flag (demo only).",
    spec: "openspec/specs/auth-access/spec.md",
    skills: "security-engineering",
  },
  {
    id: "SEED-01b-auth-session-hardening",
    phase: 1,
    status: "Todo",
    goal: "Demo-safe session lifecycle on SQLite (expiry + logout).",
    inScope: ["Token TTL", "POST /auth/logout", "401 on expired/revoked token", "Audit login/logout"],
    outScope: ["Real IdP", "Refresh-token rotation"],
    constraints: {
      performance: "N/A — session table lookups",
      security: "Session expiry and revoke; still mock passwords",
      observability: "Audit logout",
      backward: "Existing tokens may invalidate when TTL enabled",
      cost: "N/A",
    },
    ac: [
      "Given an expired token, When calling a protected endpoint, Then 401.",
      "Given logout, When the same token is reused, Then 401.",
      "Given AUTH_SESSION_TTL unset or 0, When login, Then long-lived demo session still works.",
    ],
    evidence: ["New API tests for expiry/logout", "Docs/openapi.yaml auth paths"],
    risks: "Breaking open demos if TTL too short.",
    rollback: "Set AUTH_SESSION_TTL=0 or remove expiry check via config.",
    spec: "openspec/specs/auth-access/spec.md",
    skills: "security-engineering, rollback-and-flags",
  },
  {
    id: "SEED-02-admin-config",
    phase: 1,
    status: "Todo",
    goal: "Full Admin & Config (M6) wired to SQLite: users tab, store master, approval, configuration, audit.",
    inScope: ["Admin UI tabs matching UI SoT", "PUT/GET config", "Approval workflow toggle gating status", "Audit list"],
    outScope: ["Enterprise IdP user sync"],
    constraints: {
      performance: "N/A — config CRUD",
      security: "Admin-only writes; Designer 403 on PUT config",
      observability: "Audit on config PUT and layout status changes",
      backward: "Existing config keys preserved",
      cost: "N/A",
    },
    ac: [
      "Given Admin, When PUT config for pharmacy, Then GET returns pharmacy rules.",
      "Given Designer, When PUT config, Then 403.",
      "Given pharmacy vs apparel, When GET config, Then minAisleWidthMeters differs.",
      "Given approvalWorkflowEnabled true, When Viewer tries approve, Then 403; Approver can approve.",
    ],
    evidence: ["Admin API tests", "UI checklist vs ui/ShelfPilot.dc.html Admin"],
    risks: "Toggle off may block demo approval flow.",
    rollback: "Set approvalWorkflowEnabled true in config; revert UI tab changes.",
    spec: "openspec/specs/admin-config/spec.md",
    skills: "security-engineering, rollback-and-flags",
  },
  {
    id: "SEED-02b-user-admin-crud",
    phase: 1,
    status: "Todo",
    goal: "Admin can create/update demo users in SQLite (mock passwords).",
    inScope: ["POST/PATCH /admin/users", "List users", "New user can login"],
    outScope: ["Password hashing beyond demo", "Email verification"],
    constraints: {
      performance: "N/A",
      security: "Admin-only; document demo-only plaintext passwords",
      observability: "Audit user create/update",
      backward: "Seed users unchanged",
      cost: "N/A",
    },
    ac: [
      "Given Admin, When creating a user with role Designer, Then user appears in GET /admin/users.",
      "Given the new user credentials, When login, Then token issued.",
      "Given Designer, When POST /admin/users, Then 403.",
    ],
    evidence: ["API tests", "OpenAPI admin user schemas"],
    risks: "Demo password storage.",
    rollback: "Delete created users from SQLite; revert routes.",
    spec: "openspec/specs/admin-config/spec.md",
    skills: "security-engineering",
  },
  {
    id: "SEED-03-dashboard-projects",
    phase: 2,
    status: "Todo",
    goal: "Dashboard portfolio parity with UI SoT: filters, cards, empty state, wizard entry.",
    inScope: ["Status filters", "Project cards with dims", "3-step new layout wizard", "Empty state"],
    outScope: ["Advanced search", "Pagination at scale"],
    constraints: {
      performance: "N/A — small demo datasets",
      security: "N/A — auth already applied",
      observability: "N/A — CRUD UI",
      backward: "Layout list API stable",
      cost: "N/A",
    },
    ac: [
      "Given layouts with mixed statuses, When filtering draft, Then only drafts show.",
      "Given Designer, When completing wizard with dimensions, Then draft layout is created and editor opens.",
      "Given no matching filter, When dashboard loads, Then empty state is shown.",
    ],
    evidence: ["Layout list/create API tests", "UI SoT checklist Dashboard"],
    risks: "Card missing dims if API summary lacks width/depth.",
    rollback: "Revert web Dashboard components.",
    spec: "openspec/specs/layouts/spec.md",
    skills: "none",
  },
  {
    id: "SEED-04-layout-canvas",
    phase: 2,
    status: "Todo",
    goal: "M1 layout canvas: scaled floor, zoom, selection, aisle tools with min-width validation.",
    inScope: ["Scaled blank canvas from dimensions", "Zoom", "Aisle add + validation banner", "Selection chrome"],
    outScope: ["CAD boolean ops", "DXF import"],
    constraints: {
      performance: "N/A — 2D canvas MVP",
      security: "Designer/Admin mutate; Viewer read-only",
      observability: "N/A — client canvas",
      backward: "Layout payload fields additive",
      cost: "N/A",
    },
    ac: [
      "Given dimensions entered, When layout opens, Then scaled blank canvas is visible immediately.",
      "Given min aisle from vertical config, When aisle width is below min, Then violation shows icon and text.",
      "Given zoom controls, When zoom in/out, Then canvas scale updates.",
    ],
    evidence: ["Aisle validation API test", "Docs/VALIDATION_UI_REFERENCE.md editor rows"],
    risks: "Validation rules differ per vertical — must read config.",
    rollback: "Revert editor canvas components; keep API validation.",
    spec: "openspec/specs/layouts/spec.md",
    skills: "none",
  },
  {
    id: "SEED-04b-zones-polygon",
    phase: 2,
    status: "Todo",
    goal: "Demo-level store zones and irregular polygon boundary storage/render.",
    inScope: ["Polygon points on layout", "Zone list optional", "Canvas outline render"],
    outScope: ["CAD-grade geometry engine", "Boolean merges"],
    constraints: {
      performance: "N/A — few vertices demo",
      security: "N/A — same layout RBAC",
      observability: "N/A",
      backward: "shape=rectangle remains default",
      cost: "N/A",
    },
    ac: [
      "Given shape polygon, When saving boundary points, Then GET layout returns polygon array.",
      "Given polygon layout, When opening 2D editor, Then outline is rendered.",
    ],
    evidence: ["API test for polygon round-trip", "UI smoke screenshot optional"],
    risks: "Invalid polygons may break canvas — validate min 3 points.",
    rollback: "Ignore polygon field; fall back to rectangle bounds.",
    spec: "openspec/specs/layouts/spec.md",
    skills: "none",
  },
  {
    id: "SEED-05-fixtures-autocalc",
    phase: 3,
    status: "Todo",
    goal: "M2 fixture palette from vertical templates, place/edit/delete, auto-calc on dimension change.",
    inScope: ["Palette shelf/rack/gondola/storage", "Properties W/D", "autoCalc.maxFixtures", "Calc duration log"],
    outScope: ["Structural load engineering"],
    constraints: {
      performance: "Auto-calc p95 < 50ms for demo footprints",
      security: "Designer/Admin only mutations",
      observability: "Log auto_calc durationMs",
      backward: "Existing fixture schema preserved",
      cost: "N/A",
    },
    ac: [
      "Given Designer, When placing a shelf from palette, Then fixture appears on GET layout.",
      "Given layout dimensions patched larger, When auto-calc runs, Then maxFixtures increases.",
      "Given Viewer, When POST fixture, Then 403.",
    ],
    evidence: ["shelfpilot auto-calc/fixture tests", "Log sample"],
    risks: "Template missing for vertical — fall back to defaults.",
    rollback: "Revert layoutMath formula; keep prior fixtures in DB.",
    spec: "openspec/specs/layouts/spec.md",
    skills: "performance-engineering, observability",
  },
  {
    id: "SEED-05b-fixture-drag-snap",
    phase: 3,
    status: "Todo",
    goal: "2D click-to-place, drag move, and snap-to-grid with persisted positions.",
    inScope: ["Drag handlers", "Grid snap", "Persist x/y via API"],
    outScope: ["Collision physics", "Multi-select"],
    constraints: {
      performance: "UI remains responsive while dragging (no full re-fetch each pixel)",
      security: "N/A — same RBAC as fixture mutate",
      observability: "N/A — client interaction",
      backward: "x/y fields already on fixture",
      cost: "N/A",
    },
    ac: [
      "Given Designer, When dragging a fixture and releasing, Then saved x/y match snapped grid.",
      "Given reload layout, When editor opens, Then fixture is at saved position.",
    ],
    evidence: ["Manual UI smoke", "API GET shows updated x/y"],
    risks: "Excessive PATCH traffic — debounce saves.",
    rollback: "Disable drag; keep click-to-place only.",
    spec: "openspec/specs/layouts/spec.md",
    skills: "performance-engineering",
  },
  {
    id: "SEED-06-products-categories",
    phase: 4,
    status: "Todo",
    goal: "M3 hierarchical categories and products per vertical with JSON import/export.",
    inScope: ["Category tree API/UI", "Product table", "Import/export JSON"],
    outScope: ["ERP sync", "Real CSV Excel macros"],
    constraints: {
      performance: "N/A — demo catalog size",
      security: "Auth required; Admin/Designer import",
      observability: "N/A — CRUD",
      backward: "Category/product ids stable for mappings",
      cost: "N/A",
    },
    ac: [
      "Given vertical pharmacy, When listing categories, Then tree includes parent/child where seeded.",
      "Given import payload, When POST /catalog/import, Then counts > 0 and data listable.",
      "Given export, When user clicks Export, Then JSON downloads.",
    ],
    evidence: ["Catalog API tests", "UI Products screen vs UI SoT"],
    risks: "Import duplicates — use id upsert or skip.",
    rollback: "Delete imported rows; restore seed.",
    spec: "openspec/specs/catalog/spec.md",
    skills: "none",
  },
  {
    id: "SEED-06b-catalog-seed-verticals",
    phase: 4,
    status: "Todo",
    goal: "Rich demo catalog seed for Retail, Pharmacy, Beauty, Apparel from UI SoT data.",
    inScope: ["Seed script npm run seed:demo-catalog", "VERTICALS/PRODUCTS parity"],
    outScope: ["Customer-specific catalogs"],
    constraints: {
      performance: "N/A",
      security: "N/A — seed data",
      observability: "N/A",
      backward: "Additive seed; do not wipe user layouts",
      cost: "N/A",
    },
    ac: [
      "Given fresh or seeded DB, When switching each vertical, Then category tree is non-empty.",
      "Given each vertical, When listing products, Then at least 3 products exist.",
    ],
    evidence: ["seed script", "UI smoke"],
    risks: "Re-seed duplicates — make idempotent.",
    rollback: "Empty categories/products tables and re-run minimal seed.",
    spec: "ui/ShelfPilot.dc.html (VERTICALS/PRODUCTS)",
    skills: "none",
  },
  {
    id: "SEED-07a-category-mapping",
    phase: 4,
    status: "Todo",
    goal: "Map product category to fixture/shelf with color coding (space planogram foundation).",
    inScope: ["POST mappings", "Legend", "Unmapped state", "Viewer cannot map"],
    outScope: ["SKU-level facing planogram (future SEED if required)"],
    constraints: {
      performance: "N/A — few fixtures",
      security: "Designer/Admin only; Viewer 403",
      observability: "N/A",
      backward: "CategoryMapping schema in OpenAPI",
      cost: "N/A",
    },
    ac: [
      "Given fixture and category, When POST mapping with color, Then GET layout returns mapping and fixture.color.",
      "Given Viewer, When POST mapping, Then 403.",
      "Given mapped fixtures, When viewing 2D canvas, Then colors match legend.",
    ],
    evidence: ["Mapping API test", "UI editor mapping control"],
    risks: "Orphan mappings if category deleted — prevent or null color.",
    rollback: "Clear mappings array on layouts; revert UI select.",
    spec: "openspec/specs/layouts/spec.md",
    skills: "security-engineering",
  },
  {
    id: "SEED-07b-viz-2d-fidelity",
    phase: 5,
    status: "Todo",
    goal: "2D editor visual parity with ui/ShelfPilot.dc.html.",
    inScope: ["Canvas wash #e9e5e0", "Floor #fbfaf8", "Dashed aisles", "Selection chrome", "Grid"],
    outScope: ["Print/PDF export"],
    constraints: {
      performance: "N/A — CSS/layout",
      security: "N/A",
      observability: "N/A",
      backward: "N/A — visual only",
      cost: "N/A",
    },
    ac: [
      "Given VALIDATION_UI_REFERENCE checklist for editor 2D, When reviewed, Then all critical rows are Match.",
    ],
    evidence: ["Docs/VALIDATION_UI_REFERENCE.md updated"],
    risks: "Drift from DC file if both edited — UI SoT wins.",
    rollback: "Revert web CSS/editor styles.",
    spec: "openspec/specs/ui-fidelity/spec.md",
    skills: "none",
  },
  {
    id: "SEED-07c-viz-3d",
    phase: 5,
    status: "Todo",
    goal: "Three.js 3D view with floor, grid, fixtures colored by mapping; safe teardown.",
    inScope: ["2D/3D toggle", "Scene3D parity with UI SoT", "Unmount cleanup"],
    outScope: ["Photoreal materials", "VR"],
    constraints: {
      performance: "Interactive on integrated GPU; no specialized GPU required",
      security: "N/A",
      observability: "N/A — client render",
      backward: "N/A",
      cost: "N/A",
    },
    ac: [
      "Given layout with mapped fixtures, When switching to 3D, Then scene renders without console errors.",
      "Given leaving editor, When unmounting, Then WebGL context is disposed.",
    ],
    evidence: ["Manual smoke", "Optional screenshot"],
    risks: "WebGL unavailable — show fallback message.",
    rollback: "Hide 3D toggle; keep 2D only.",
    spec: "openspec/specs/ui-fidelity/spec.md",
    skills: "performance-engineering",
  },
  {
    id: "SEED-08-analytics",
    phase: 6,
    status: "Todo",
    goal: "M5 analytics summary: utilization, capacity, allocation-by-category, layout picker.",
    inScope: ["GET analytics summary", "KPI UI", "Latency log"],
    outScope: ["BI tool export", "Scheduled reports"],
    constraints: {
      performance: "N/A — small layouts",
      security: "N/A — auth required",
      observability: "Log analytics_summary durationMs",
      backward: "Summary schema stable",
      cost: "N/A",
    },
    ac: [
      "Given mapped layout, When GET summary, Then utilizationPercent and fixtureCount are consistent with geometry.",
      "Given no mappings, When GET summary, Then allocationByCategory is empty array.",
    ],
    evidence: ["Analytics API tests", "Analytics UI"],
    risks: "Division by zero on zero footprint — guard.",
    rollback: "Revert analytics route formula.",
    spec: "openspec/specs/analytics/spec.md",
    skills: "observability",
  },
  {
    id: "SEED-08b-version-compare",
    phase: 6,
    status: "Todo",
    goal: "Compare two layouts (or versions) for utilization and fixture count deltas.",
    inScope: ["POST /analytics/compare", "UI A vs B panel", "OpenAPI sync"],
    outScope: ["Visual diff overlay"],
    constraints: {
      performance: "N/A",
      security: "N/A — auth required",
      observability: "N/A",
      backward: "Additive endpoint",
      cost: "N/A",
    },
    ac: [
      "Given two layout ids, When POST compare, Then utilizationDelta and fixtureCountDelta are returned.",
      "Given Analytics UI, When selecting A and B, Then deltas display.",
    ],
    evidence: ["API test", "UI panel"],
    risks: "Missing layout id → 404.",
    rollback: "Hide compare UI; keep summary.",
    spec: "openspec/specs/analytics/spec.md",
    skills: "none",
  },
  {
    id: "SEED-08c-layout-versions",
    phase: 6,
    status: "Todo",
    goal: "Demo layout versioning: snapshot on submit-for-review; list versions for compare.",
    inScope: ["versions table or JSON snapshots", "List versions API", "Flag LAYOUT_VERSIONING"],
    outScope: ["Full git-like history UI", "Branching"],
    constraints: {
      performance: "N/A — few snapshots",
      security: "N/A — same layout RBAC",
      observability: "Audit snapshot create",
      backward: "Flag default on for demo",
      cost: "N/A",
    },
    ac: [
      "Given draft submitted to in_review, When listing versions, Then at least one snapshot exists.",
      "Given two version ids, When compare, Then deltas compute from snapshots.",
    ],
    evidence: ["API tests", "Flag documented in .env.example"],
    risks: "DB growth — limit snapshots per layout in demo.",
    rollback: "LAYOUT_VERSIONING=0; ignore versions table.",
    spec: "openspec/specs/analytics/spec.md",
    skills: "rollback-and-flags",
  },
  {
    id: "SEED-09-ui-reference",
    phase: 7,
    status: "Todo",
    goal: "Close remaining UI SoT gaps: toasts, approve/reject, empty/loading states.",
    inScope: ["Toast stack", "Approver actions", "Empty/loading", "VALIDATION_UI_REFERENCE complete"],
    outScope: ["New product features"],
    constraints: {
      performance: "N/A",
      security: "N/A",
      observability: "N/A",
      backward: "N/A — UI polish",
      cost: "N/A",
    },
    ac: [
      "Given Docs/VALIDATION_UI_REFERENCE.md, When reviewed, Then all critical rows are Match.",
    ],
    evidence: ["VALIDATION_UI_REFERENCE.md sign-off"],
    risks: "SoT file edits without React port.",
    rollback: "Revert web UI commits.",
    spec: "openspec/changes/ui-reference-integration/",
    skills: "none",
  },
  {
    id: "SEED-10-demo-dataset",
    phase: 7,
    status: "Todo",
    goal: "One-command demo dataset: 3 projects with fixtures, aisles, mappings.",
    inScope: ["npm run seed:demo", "Pharmacy in_review, Apparel draft, Retail approved"],
    outScope: ["Customer data import"],
    constraints: {
      performance: "N/A",
      security: "N/A — local demo data",
      observability: "N/A",
      backward: "Idempotent seed preferred",
      cost: "N/A",
    },
    ac: [
      "Given empty or reset DB, When npm run seed:demo, Then dashboard shows 3 layout cards.",
      "Given pharmacy demo layout, When opened, Then fixtures and at least one mapping exist.",
    ],
    evidence: ["seed script", "README snippet"],
    risks: "Overwrites — document destructive flag.",
    rollback: "Delete SQLITE_PATH / volume; re-seed minimal users only.",
    spec: "Docs/SEED_PLAN_FULL.md",
    skills: "none",
  },
  {
    id: "SEED-11-compose-demo-pack",
    phase: 7,
    status: "Todo",
    goal: "Documented one-shot docker compose demo with smoke script (health + login).",
    inScope: ["README compose steps", "scripts/smoke-demo.mjs", "Healthcheck"],
    outScope: ["Cloud deploy"],
    constraints: {
      performance: "N/A",
      security: "N/A — local",
      observability: "Compose healthcheck",
      backward: "N/A",
      cost: "N/A",
    },
    ac: [
      "Given clean machine with Docker, When following README compose steps, Then http://localhost:8080 loads.",
      "Given smoke script, When run against compose stack, Then exit 0.",
    ],
    evidence: ["smoke script output", "codebase/README.md"],
    risks: "Port conflicts 3000/8080.",
    rollback: "docker compose down.",
    spec: "Docs/ARCHITECTURE_LOCAL.md",
    skills: "observability",
  },
  {
    id: "SEED-12-e2e-smoke",
    phase: 7,
    status: "Todo",
    goal: "Automated happy-path smoke: login → create → fixture → aisle → map → analytics.",
    inScope: ["API-level or Playwright smoke command", "CI-ready script"],
    outScope: ["Full visual regression"],
    constraints: {
      performance: "N/A",
      security: "N/A — uses demo users",
      observability: "N/A",
      backward: "N/A",
      cost: "N/A",
    },
    ac: [
      "Given API running, When smoke command executes, Then exit 0.",
      "Given broken mapping route, When smoke runs, Then exit non-zero.",
    ],
    evidence: ["Test report / command output"],
    risks: "Flaky if depending on UI timing — prefer API smoke first.",
    rollback: "Remove script from required gates.",
    spec: "Docs/FSD_ShelfPilot.md acceptance summary",
    skills: "testing",
  },
  {
    id: "SEED-13-handover-refresh",
    phase: 7,
    status: "Todo",
    goal: "Refresh Docs/HANDOVER.md and validation after full demo build.",
    inScope: ["Mark all SEED IDs Done", "OWASP demo attestation", "Link SEED_PLAN_FULL"],
    outScope: ["Production migration rewrite"],
    constraints: {
      performance: "N/A",
      security: "OWASP table updated for demo scope",
      observability: "N/A",
      backward: "N/A — docs",
      cost: "N/A",
    },
    ac: [
      "Given all demo SEEDs complete, When reading HANDOVER.md, Then each SEED-ID is listed Done with evidence links.",
    ],
    evidence: ["Docs/HANDOVER.md", "Docs/VALIDATION_REPORT.md"],
    risks: "Stale links.",
    rollback: "Revert docs commit.",
    spec: "Docs/SEED_PLAN_FULL.md",
    skills: "handover",
  },
];

function renderSeed(s) {
  return `---
seedId: ${s.id}
phase: ${s.phase}
status: ${s.status}
stack: demo
---

# ${s.id}

## SEED Unit

- **SEED-ID:** ${s.id}
- **Status:** ${s.status}
- **Phase:** ${s.phase}
- **Goal:** ${s.goal}
- **Scope:**
  - In scope:
${s.inScope.map((x) => `    - ${x}`).join("\n")}
  - Out of scope:
${s.outScope.map((x) => `    - ${x}`).join("\n")}
- **Constraints:**
  - Performance: ${s.constraints.performance}
  - Security: ${s.constraints.security}
  - Observability: ${s.constraints.observability}
  - Backward compatibility: ${s.constraints.backward}
  - Cost: ${s.constraints.cost}
- **Stack note:** ${STACK}
- **Acceptance criteria:**
${s.ac.map((a, i) => `  ${i + 1}. ${a}`).join("\n")}
- **Evidence required:**
${s.evidence.map((e) => `  - ${e}`).join("\n")}
  - OpenAPI / contract (\`Docs/openapi.yaml\`) if APIs touched
- **Risks & rollback:**
  - Risks: ${s.risks}
  - Rollback steps: ${s.rollback}
- **Spec link:** \`${s.spec}\`
- **Engineering skills invoked:** ${s.skills}

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against \`ui/ShelfPilot.dc.html\` when UI touched
- [ ] Intent review before merge
`;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const indexRows = [
    "# ShelfPilot SEED Units (generated)",
    "",
    "Source plan: [`Docs/SEED_PLAN_FULL.md`](../SEED_PLAN_FULL.md)",
    "",
    "Generated by `Docs/seeds/generate-seeds.mjs`.",
    "",
    "| SEED-ID | Phase | Status | File |",
    "|---------|------:|--------|------|",
  ];

  for (const s of seeds) {
    const file = `${s.id}.md`;
    await fs.writeFile(path.join(outDir, file), renderSeed(s), "utf8");
    indexRows.push(`| ${s.id} | ${s.phase} | ${s.status} | [${file}](./${file}) |`);
  }

  indexRows.push(
    "",
    "## Build order (next up)",
    "",
    "1. SEED-00c-openapi-align",
    "2. SEED-01b-auth-session-hardening",
    "3. SEED-02-admin-config",
    "",
    "See full order in SEED_PLAN_FULL.md.",
    ""
  );

  await fs.writeFile(path.join(outDir, "README.md"), indexRows.join("\n"), "utf8");
  console.log(`Wrote ${seeds.length} SEED files to ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
