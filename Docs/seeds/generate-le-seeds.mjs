/**
 * Generate SEED-LE-* unit markdown + lightweight OpenSpec change folders.
 * Run: node Docs/seeds/generate-le-seeds.mjs
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const seedsDir = path.join(root, "Docs", "seeds");
const changesDir = path.join(root, "openspec", "changes");

const STACK =
  "Demo stack: React/Vite · Express · SQLite · Docker Compose · Mock auth · Three.js. Node >= 22.5.";

const seeds = [
  {
    id: "SEED-LE-00-model-openapi",
    goal: "OpenAPI + layout payload model for aisles/shelves/planogram; migrate fixtures→shelves on read.",
    inScope: ["OpenAPI paths already drafted", "SQLite/payload shelves+planogram", "Synthesize shelves from fixtures", "planogramMath service stub"],
    outScope: ["Full DnD UI", "3D upgrade"],
    constraints: {
      performance: "N/A — model/migration",
      security: "Same RBAC on new mutate routes",
      observability: "N/A — schema first",
      backward: "fixtures array still readable",
      cost: "N/A",
    },
    ac: [
      "Given legacy layout with fixtures only, When GET layout, Then shelves array is populated from fixtures.",
      "Given OpenAPI, When openapi:check runs after route implementation, Then new shelf/planogram ops are documented.",
    ],
    evidence: ["API migration tests", "Docs/openapi.yaml"],
    risks: "Dual fixture/shelf writes during transition.",
    rollback: "PLANOGRAM_EDITOR=0; ignore shelves writes.",
    skills: "none",
  },
  {
    id: "SEED-LE-01-component-split",
    goal: "Extract Layout Editor into reusable components under web/src/layout-editor/ with behavior parity.",
    inScope: ["LayoutEditor, Canvas2D, Palette, PropertiesPanel, Scene3D wrapper", "App.jsx thin shell"],
    outScope: ["New planogram panel UI", "DnD from palette"],
    constraints: {
      performance: "N/A — refactor",
      security: "N/A — UI structure",
      observability: "N/A",
      backward: "Existing editor flows still work",
      cost: "N/A",
    },
    ac: [
      "Given Designer opens editor, When page loads, Then modular components render and place/map still works.",
    ],
    evidence: ["web/src/layout-editor/**", "manual smoke"],
    risks: "Regression in selection/state.",
    rollback: "Revert to previous App.jsx editor block.",
    skills: "none",
  },
  {
    id: "SEED-LE-02-dnd-canvas",
    goal: "Palette drag-and-drop place/move for aisles and shelves with snap and PATCH persist.",
    inScope: ["HTML5/DnD or pointer DnD", "Snap 0.5m", "Persist x/y"],
    outScope: ["Collision physics"],
    constraints: {
      performance: "No full re-fetch per drag pixel; save on drop",
      security: "Designer/Admin only",
      observability: "N/A — client",
      backward: "Click-to-place may remain as fallback",
      cost: "N/A",
    },
    ac: [
      "Given shelf tool dragged from palette, When dropped on canvas, Then shelf is persisted at snapped coordinates.",
      "Given existing shelf dragged, When mouseup, Then PATCH updates x/y.",
    ],
    evidence: ["manual smoke", "API PATCH assertions"],
    risks: "Click vs drag conflict.",
    rollback: "Disable DnD; keep click-to-place.",
    skills: "performance-engineering",
  },
  {
    id: "SEED-LE-03-aisle-shelf-config",
    goal: "Configure aisle corridor width/space and per-shelf height, usable width, and levels.",
    inScope: ["PropertiesPanel aisle vs shelf fields", "PATCH aisle/shelf", "levels[]"],
    outScope: ["CAD-grade geometry"],
    constraints: {
      performance: "N/A",
      security: "Designer/Admin only",
      observability: "N/A",
      backward: "Existing aisles without x/y still valid",
      cost: "N/A",
    },
    ac: [
      "Given aisle selected, When widthMeters set to 1.6, Then GET returns 1.6 on aisle only.",
      "Given shelf selected, When height and two levels saved, Then GET shelf.levels length is 2.",
    ],
    evidence: ["API tests", "UI smoke"],
    risks: "Invalid level heights.",
    rollback: "Hide levels UI; keep single height field.",
    skills: "none",
  },
  {
    id: "SEED-LE-04-category-separate",
    goal: "Independent category mapping for aisles vs shelves.",
    inScope: ["CategoryMappingPanel", "aisleMappings/shelfMappings", "colors on each"],
    outScope: ["SKU category inheritance rules"],
    constraints: {
      performance: "N/A",
      security: "Designer/Admin; Viewer 403 on map",
      observability: "N/A",
      backward: "Legacy mappings.fixtureId still accepted",
      cost: "N/A",
    },
    ac: [
      "Given aisle and shelf mapped to different categories, When GET layout, Then each retains its categoryId/color.",
      "Given Viewer, When mapping shelf, Then 403.",
    ],
    evidence: ["API tests", "UI"],
    risks: "Orphan mappings.",
    rollback: "Fall back to single mappings array.",
    skills: "security-engineering",
  },
  {
    id: "SEED-LE-05-planogram-facings",
    goal: "Add products to shelf front; compute/clamp facings from dimensions.",
    inScope: ["PlanogramPanel", "POST/DELETE planogram", "preview endpoint", "planogramMath"],
    outScope: ["ERP sync", "full bay slot grid"],
    constraints: {
      performance: "Facing calc < 5ms demo",
      security: "Designer/Admin only",
      observability: "Log planogram_facing_calc durationMs",
      backward: "N/A — new feature",
      cost: "N/A",
    },
    ac: [
      "Given usableWidth 1.2 and product width 0.2, When POST placement, Then maxFacings is 6.",
      "Given facings request 9 and max 4, When POST, Then facings stored as 4 (clamp).",
      "Given Viewer, When POST placement, Then 403.",
    ],
    evidence: ["unit tests planogramMath", "API tests"],
    risks: "Missing product dimensions → defaults.",
    rollback: "PLANOGRAM_EDITOR=0 hides panel and write routes.",
    skills: "observability, rollback-and-flags",
  },
  {
    id: "SEED-LE-06-3d-upgrade",
    goal: "Richer Three.js view: aisle corridors, shelf levels, facing boxes, dispose on unmount.",
    inScope: ["Scene3D upgrade", "level meshes", "facing boxes from planogram"],
    outScope: ["Photoreal materials"],
    constraints: {
      performance: "Interactive on integrated GPU",
      security: "N/A",
      observability: "N/A — client",
      backward: "2D editor unchanged",
      cost: "N/A",
    },
    ac: [
      "Given shelf with planogram, When switching to 3D, Then facing blocks render without console errors.",
      "Given leaving editor, When unmount, Then WebGL disposed.",
    ],
    evidence: ["manual smoke"],
    risks: "WebGL unavailable — show fallback.",
    rollback: "Revert Scene3D to prior simple boxes.",
    skills: "performance-engineering",
  },
  {
    id: "SEED-LE-07-validation-handover",
    goal: "Validate LE SEEDs and refresh handover/validation docs.",
    inScope: ["VALIDATION note", "HANDOVER link", "mark SEED-LE Done"],
    outScope: ["Production migration"],
    constraints: {
      performance: "N/A — docs",
      security: "N/A — docs",
      observability: "N/A",
      backward: "N/A",
      cost: "N/A",
    },
    ac: [
      "Given LE SEEDs complete, When reading HANDOVER.md, Then layout-editor-planogram change is listed with evidence.",
    ],
    evidence: ["Docs/HANDOVER.md", "Docs/VALIDATION_REPORT.md or LE addendum"],
    risks: "Stale links.",
    rollback: "Revert docs commit.",
    skills: "handover",
  },
];

function renderUnit(s) {
  return `---
seedId: ${s.id}
phase: LE
status: Todo
stack: demo
change: layout-editor-planogram
---

# ${s.id}

## SEED Unit

- **SEED-ID:** ${s.id}
- **Status:** Todo
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
- **Spec link:** \`openspec/changes/${s.id}/\` (unit: \`Docs/seeds/${s.id}.md\`; parent change: \`openspec/changes/layout-editor-planogram/\`)
- **Engineering skills invoked:** ${s.skills}

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI modular editor checked when UI touched
- [ ] Intent review before merge
`;
}

async function writeChangeFolder(s) {
  const dir = path.join(changesDir, s.id);
  const specDir = path.join(dir, "specs", s.id.includes("planogram") || s.id.includes("05") ? "planogram" : "layouts");
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "proposal.md"),
    `# Proposal: ${s.id}\n\n## Why\n\n${s.goal}\n\n## Parent change\n\n\`openspec/changes/layout-editor-planogram/\`\n\n## Status\n\nTodo — awaiting change approval then sequential build.\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(dir, "design.md"),
    `# Design: ${s.id}\n\nSee parent \`openspec/changes/layout-editor-planogram/design.md\`.\n\n## Constraints\n\n${Object.entries(s.constraints)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n")}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(dir, "tasks.md"),
    `# Tasks: ${s.id}\n\nCanonical: \`Docs/seeds/${s.id}.md\`\n\n## Checklist\n\n${s.ac.map((a) => `- [ ] ${a}`).join("\n")}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(specDir, "spec.md"),
    `# Delta ${s.id}\n\n### Requirement: ${s.id}\n\n${s.goal}\n\n${s.ac
      .map(
        (a, i) =>
          `#### Scenario: AC-${i + 1}\n- **THEN** ${a}\n`
      )
      .join("\n")}\n`,
    "utf8"
  );
}

async function main() {
  const indexRows = [
    "",
    "## Layout editor + planogram (SEED-LE series)",
    "",
    "Parent change: [`openspec/changes/layout-editor-planogram/`](../../openspec/changes/layout-editor-planogram/)",
    "",
    "| SEED-ID | Status | File | OpenSpec |",
    "|---------|--------|------|----------|",
  ];

  for (const s of seeds) {
    await fs.writeFile(path.join(seedsDir, `${s.id}.md`), renderUnit(s), "utf8");
    await writeChangeFolder(s);
    indexRows.push(
      `| ${s.id} | Todo | [${s.id}.md](./${s.id}.md) | [openspec](../../openspec/changes/${s.id}/) |`
    );
  }

  indexRows.push(
    "",
    "**Next after change approval:** SEED-LE-00-model-openapi",
    ""
  );

  const readmePath = path.join(seedsDir, "README.md");
  let readme = await fs.readFile(readmePath, "utf8");
  if (!readme.includes("SEED-LE series")) {
    readme = readme.trimEnd() + "\n" + indexRows.join("\n") + "\n";
    await fs.writeFile(readmePath, readme, "utf8");
  }
  console.log(`Wrote ${seeds.length} SEED-LE units`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
