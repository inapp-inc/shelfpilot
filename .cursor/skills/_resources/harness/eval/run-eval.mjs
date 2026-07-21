#!/usr/bin/env node
/**
 * Eval harness — canned scenarios probing live skill files + critical resources.
 * Usage: node run-eval.mjs [--scenario <id>]
 *
 * Run before trusting skill-file changes on a real engagement.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const scenariosDir = path.join(here, "scenarios");
const skillsRoot = path.resolve(here, "../../.."); // .cursor/skills

function parseArgs(argv) {
  const args = { scenario: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--scenario") args.scenario = argv[++i];
  }
  return args;
}

async function loadScenarios(filterId) {
  const files = (await fs.readdir(scenariosDir)).filter((f) => f.endsWith(".json"));
  const scenarios = [];
  for (const file of files) {
    const data = JSON.parse(await fs.readFile(path.join(scenariosDir, file), "utf8"));
    if (!filterId || data.id === filterId) scenarios.push(data);
  }
  return scenarios;
}

function checkShape(scenario, observed) {
  const failures = [];
  for (const flag of scenario.expect.mustBeTrue || []) {
    if (!observed[flag]) failures.push(`expected ${flag} to be true`);
  }
  for (const flag of scenario.expect.mustBeFalse || []) {
    if (observed[flag]) failures.push(`expected ${flag} to be false`);
  }
  return failures;
}

async function readSkill(name) {
  return fs.readFile(path.join(skillsRoot, name, "SKILL.md"), "utf8");
}

async function exists(rel) {
  try {
    await fs.access(path.join(skillsRoot, rel));
    return true;
  } catch {
    return false;
  }
}

async function observeFromSkills(scenario) {
  const observed = { ...scenario.fixtureObserved };

  if (scenario.probe === "sprint-mode-section") {
    const text = await readSkill("spec-driven-development");
    observed.hasSprintMode = /## Sprint Mode/.test(text);
    observed.owaspDoesNotCompress = /Does not compress[\s\S]*OWASP/i.test(text);
    observed.naRequired = /N\/A — <rationale>/.test(text);
  }

  if (scenario.probe === "platform-fit-gate") {
    const text = await readSkill("architecture");
    observed.hasPlatformFitGate = /Day-1 platform-fit gate/i.test(text);
    observed.mentionsAdr0017 = /ADR-0017/.test(text);
    observed.hasContainerScaffold = /Container scaffold|container scaffold/i.test(text);
    observed.canonicalOpenApi = /Docs\/openapi\.yaml/.test(text);
    observed.adrNumbering = /ADR-0001 through ADR-0016/.test(text);
  }

  if (scenario.probe === "gaps-no-portal") {
    const text = await readSkill("requirements");
    observed.noPortal = !/Gap Manager Portal|ensure-portal-running|register-from-path/.test(text);
    observed.statusCompleteGate = /"status".*"Complete"|status.*Complete/i.test(text);
    observed.projectDirIsRepoRoot = /current project's root folder/.test(text);
    observed.hasReviewedBy = /reviewedBy/.test(text);
    observed.hasReviewedAt = /reviewedAt/.test(text);
  }

  if (scenario.probe === "bootstrap-exemption") {
    const text = await readSkill("seed-unit");
    observed.hasBootstrapExemption = /Bootstrap exemption/i.test(text);
    observed.referencesScaffold = /scaffold/i.test(text);
    observed.afterArchitecture = /After architecture/i.test(text);
  }

  if (scenario.probe === "sdd-orchestration") {
    const text = await readSkill("spec-driven-development");
    observed.architectureBeforeSeed = /### 3\. Drive architecture[\s\S]*### 4\. Convert the work into SEED/i.test(
      text
    );
    observed.invokesSecurity = /security-engineering/.test(text);
    observed.invokesSeedReview = /seed-review/.test(text);
    observed.invokesHandover = /handover/.test(text);
    observed.canonicalOpenApi = /Docs\/openapi\.yaml/.test(text);
  }

  if (scenario.probe === "coding-stack-confirm") {
    const text = await readSkill("coding");
    observed.hasStackConfirm = /Stack confirmation/i.test(text);
    observed.refsAdr0001 = /ADR-0001/.test(text);
  }

  if (scenario.probe === "scaffold-starter-files") {
    observed.hasDockerfile = await exists("_resources/scaffold/starter/Dockerfile");
    observed.hasLockfile = await exists("_resources/scaffold/starter/package-lock.json");
    observed.hasEslint = await exists("_resources/scaffold/starter/eslint.config.js");
    observed.hasApi = await exists("_resources/scaffold/starter/api/src/index.js");
    observed.hasOpenApiStub = await exists("_resources/scaffold/starter/openapi.stub.yaml");
    observed.noFunctionalSpecZip = !(await exists(
      "_resources/requirement-skill/functional-spec.skill"
    ));
  }

  if (scenario.probe === "testing-harness-honesty") {
    const text = await readSkill("testing");
    observed.mentionsShapeCheck = /shape\/presence|shape check/i.test(text);
    observed.doesNotOverclaimOnly = !/chain test suite \+ OpenAPI contract validation \+ OWASP/.test(
      text
    );
  }

  return observed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenarios = await loadScenarios(args.scenario);
  if (!scenarios.length) {
    console.error("No scenarios found.");
    process.exit(1);
  }

  let failed = 0;
  for (const scenario of scenarios) {
    const observed = await observeFromSkills(scenario);
    const failures = checkShape(scenario, observed);
    if (failures.length) {
      failed += 1;
      console.log(`FAIL  ${scenario.id}: ${scenario.title}`);
      for (const f of failures) console.log(`  - ${f}`);
    } else {
      console.log(`PASS  ${scenario.id}: ${scenario.title}`);
    }
  }

  console.log(`\n${scenarios.length - failed}/${scenarios.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
