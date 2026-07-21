/**
 * Generate OpenSpec change folders per SEED-ID (seed-unit skill output).
 * Run: node Docs/seeds/generate-openspec-changes.mjs
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const changesDir = path.join(root, "openspec", "changes");
const seedsDir = path.join(root, "Docs", "seeds");

/** Map SEED → capability folder under openspec/specs for delta pointer */
const CAP_MAP = {
  "SEED-00-bootstrap": "platform",
  "SEED-00b-sqlite-docker": "platform",
  "SEED-00c-openapi-align": "platform",
  "SEED-01-auth-rbac": "auth-access",
  "SEED-01b-auth-session-hardening": "auth-access",
  "SEED-02-admin-config": "admin-config",
  "SEED-02b-user-admin-crud": "admin-config",
  "SEED-03-dashboard-projects": "layouts",
  "SEED-04-layout-canvas": "layouts",
  "SEED-04b-zones-polygon": "layouts",
  "SEED-05-fixtures-autocalc": "layouts",
  "SEED-05b-fixture-drag-snap": "layouts",
  "SEED-06-products-categories": "catalog",
  "SEED-06b-catalog-seed-verticals": "catalog",
  "SEED-07a-category-mapping": "layouts",
  "SEED-07b-viz-2d-fidelity": "ui-fidelity",
  "SEED-07c-viz-3d": "ui-fidelity",
  "SEED-08-analytics": "analytics",
  "SEED-08b-version-compare": "analytics",
  "SEED-08c-layout-versions": "analytics",
  "SEED-09-ui-reference": "ui-fidelity",
  "SEED-10-demo-dataset": "platform",
  "SEED-11-compose-demo-pack": "platform",
  "SEED-12-e2e-smoke": "platform",
  "SEED-13-handover-refresh": "platform",
};

function parseFrontMatter(raw) {
  if (!raw.startsWith("---")) return {};
  const end = raw.indexOf("---", 3);
  if (end < 0) return {};
  const block = raw.slice(3, end).trim();
  const out = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function extractSection(md, heading) {
  const re = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const m = md.match(re);
  return m ? m[1].trim() : "";
}

function proposalMd(id, meta, body) {
  const goal = (body.match(/\*\*Goal:\*\*\s*(.+)/) || [, ""])[1];
  const status = meta.status || "Todo";
  return `# Proposal: ${id}

## Why

Deliver the SEED unit **${id}** as defined in \`Docs/SEED_PLAN_FULL.md\` and \`Docs/seeds/${id}.md\`.

## What changes

${goal}

## Status

${status}

## Out of scope

See Out of scope in \`Docs/seeds/${id}.md\`.

## Impact

- Demo stack only (SQLite · mock auth · Docker Compose)
- Spec delta under \`openspec/changes/${id}/specs/\`
- Implementation under \`codebase/\` when this SEED is selected for build

## Parent change

\`openspec/changes/shelfpilot-mvp/\`
`;
}

function designMd(id, body) {
  const constraints = body.match(/\*\*Constraints:\*\*([\s\S]*?)(?=\n- \*\*Stack note|\n- \*\*Acceptance)/);
  const risks = body.match(/\*\*Risks & rollback:\*\*([\s\S]*?)(?=\n- \*\*Spec link)/);
  return `# Design: ${id}

## Stack

Demo: React/Vite · Express · SQLite (\`node:sqlite\`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

${constraints ? constraints[1].trim() : "See Docs/seeds/" + id + ".md"}

## Risks & rollback

${risks ? risks[1].trim() : "See Docs/seeds/" + id + ".md"}

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: \`ui/ShelfPilot.dc.html\` when UI is touched.
- Persistence: SQLite via \`SQLITE_PATH\` only for this SEED.
`;
}

function tasksMd(id, body) {
  const ac = body.match(/\*\*Acceptance criteria:\*\*([\s\S]*?)(?=\n- \*\*Evidence)/);
  const lines = ac
    ? ac[1]
        .trim()
        .split("\n")
        .map((l) => l.replace(/^\s*\d+\.\s*/, "").trim())
        .filter(Boolean)
    : [];
  const checks = lines.map((l) => `- [ ] ${l}`).join("\n");
  return `# Tasks: ${id}

Canonical SEED unit: \`Docs/seeds/${id}.md\`  
Plan: \`Docs/SEED_PLAN_FULL.md\`

## Implementation checklist

${checks || "- [ ] Implement per Docs/seeds/" + id + ".md"}

## Evidence

- [ ] Tests / commands recorded
- [ ] OpenAPI updated if APIs touched (\`Docs/openapi.yaml\`)
- [ ] Intent review before merge

## Dispatch

\`\`\`bash
node .cursor/skills/_resources/harness/dispatch/run-dispatch.mjs --tasks "openspec/changes/${id}/tasks.md"
\`\`\`
`;
}

function specDeltaMd(id, capability, body) {
  const goal = (body.match(/\*\*Goal:\*\*\s*(.+)/) || [, "Deliver SEED goals"])[1];
  const acBlock = body.match(/\*\*Acceptance criteria:\*\*([\s\S]*?)(?=\n- \*\*Evidence)/);
  const scenarios = acBlock
    ? acBlock[1]
        .trim()
        .split("\n")
        .map((l) => l.replace(/^\s*\d+\.\s*/, "").trim())
        .filter(Boolean)
    : [];

  const scenarioBlocks = scenarios
    .map((s, i) => {
      // Try to parse Given/When/Then
      const g = s.match(/Given\s+(.+?),\s*When\s+(.+?),\s*Then\s+(.+)/i);
      if (g) {
        return `#### Scenario: AC-${i + 1}
- **GIVEN** ${g[1]}
- **WHEN** ${g[2]}
- **THEN** ${g[3]}
`;
      }
      return `#### Scenario: AC-${i + 1}
- **THEN** ${s}
`;
    })
    .join("\n");

  return `# ${capability} — delta for ${id}

## Purpose

Delta requirements for **${id}**. Parent capability live specs: \`openspec/specs/${capability}/spec.md\` (if present).

## Requirements

### Requirement: ${id} delivery

The system SHALL satisfy the goal: ${goal}

${scenarioBlocks || "#### Scenario: See Docs/seeds/" + id + ".md\n"}
`;
}

async function main() {
  const files = (await fs.readdir(seedsDir)).filter((f) => f.startsWith("SEED-") && f.endsWith(".md"));
  let count = 0;

  for (const file of files) {
    const id = file.replace(/\.md$/, "");
    const raw = await fs.readFile(path.join(seedsDir, file), "utf8");
    const meta = parseFrontMatter(raw);
    const body = extractSection(raw, "SEED Unit") || raw;
    const capability = CAP_MAP[id] || "platform";
    const dir = path.join(changesDir, id);
    const specDir = path.join(dir, "specs", capability);

    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(path.join(dir, "proposal.md"), proposalMd(id, meta, body), "utf8");
    await fs.writeFile(path.join(dir, "design.md"), designMd(id, body), "utf8");
    await fs.writeFile(path.join(dir, "tasks.md"), tasksMd(id, body), "utf8");
    await fs.writeFile(path.join(specDir, "spec.md"), specDeltaMd(id, capability, body), "utf8");

    // Point seed doc Spec link at OpenSpec change folder
    let updated = raw;
    if (raw.includes("**Spec link:**")) {
      updated = raw.replace(
        /\*\*Spec link:\*\*.*/,
        `**Spec link:** \`openspec/changes/${id}/\` (unit: \`Docs/seeds/${id}.md\`)`
      );
      await fs.writeFile(path.join(seedsDir, file), updated, "utf8");
    }
    count++;
  }

  // Update Docs/seeds README with OpenSpec column if present
  const readmePath = path.join(seedsDir, "README.md");
  let readme = await fs.readFile(readmePath, "utf8");
  if (!readme.includes("OpenSpec change")) {
    readme = readme.replace(
      "| SEED-ID | Phase | Status | File |",
      "| SEED-ID | Phase | Status | File | OpenSpec |"
    );
    readme = readme.replace(
      "|---------|------:|--------|------|",
      "|---------|------:|--------|------|---------|"
    );
    for (const file of files) {
      const id = file.replace(/\.md$/, "");
      readme = readme.replace(
        `| ${id} |`,
        `| ${id} |`
      );
      // add openspec link at end of matching row
      const rowRe = new RegExp(`(\\| ${id} \\| \\d+ \\| \\w+ \\| \\[.*?\\]\\(\\./${file}\\) )\\|`);
      readme = readme.replace(rowRe, `$1| [openspec/changes/${id}/](../../openspec/changes/${id}/) |`);
    }
    await fs.writeFile(readmePath, readme, "utf8");
  }

  console.log(`Wrote ${count} OpenSpec change folders under openspec/changes/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
