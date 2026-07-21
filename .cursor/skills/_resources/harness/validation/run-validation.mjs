#!/usr/bin/env node
/**
 * Validation harness — Day-5-style checks into one pass/fail report per SEED unit.
 * Usage: node run-validation.mjs --projectDir "<projectDir>" [--seedId <id>] [--skip-tests]
 *
 * Checks:
 *  1) npm test (api/workspace) when present
 *  2) OpenAPI shape/presence at Docs/openapi.yaml|.json (canonical)
 *  3) OWASP attestation file with overall: pass|n/a|flagged
 *
 * Does NOT run full schema/contract suites (Zod etc.) — those stay in project tests.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const args = { projectDir: null, seedId: null, skipTests: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--projectDir") args.projectDir = argv[++i];
    else if (argv[i] === "--seedId") args.seedId = argv[++i];
    else if (argv[i] === "--skip-tests") args.skipTests = true;
  }
  if (!args.projectDir) {
    throw new Error(
      'Usage: node run-validation.mjs --projectDir "<dir>" [--seedId <id>] [--skip-tests]'
    );
  }
  return args;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findOpenApi(projectDir) {
  const preferred = [
    "Docs/openapi.yaml",
    "Docs/openapi.json",
    "codebase/Docs/openapi.yaml",
  ];
  for (const c of preferred) {
    const full = path.join(projectDir, c);
    if (await exists(full)) return full;
  }
  return null;
}

function checkOpenApiShape(text, file) {
  const failures = [];
  const isJson = file.endsWith(".json");
  if (isJson) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return ["invalid JSON"];
    }
    if (!data.openapi && !data.swagger) failures.push("missing openapi/swagger version");
    if (!data.info) failures.push("missing info");
    if (!data.paths || typeof data.paths !== "object") failures.push("missing paths");
  } else {
    if (!/^openapi\s*:/m.test(text) && !/^swagger\s*:/m.test(text)) {
      failures.push("missing openapi/swagger key");
    }
    if (!/^info\s*:/m.test(text)) failures.push("missing info");
    if (!/^paths\s*:/m.test(text)) failures.push("missing paths");
  }
  return failures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectDir = path.resolve(args.projectDir);
  const results = [];

  // Tests
  if (args.skipTests) {
    results.push({ check: "tests", status: "skipped", detail: "--skip-tests" });
  } else {
    const pkgCandidates = [
      path.join(projectDir, "codebase", "package.json"),
      path.join(projectDir, "package.json"),
      path.join(projectDir, "codebase", "api", "package.json"),
    ];
    let ran = false;
    for (const pkgPath of pkgCandidates) {
      if (!(await exists(pkgPath))) continue;
      const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
      if (!pkg.scripts?.test) {
        results.push({ check: "tests", status: "skipped", detail: `no test script in ${pkgPath}` });
        ran = true;
        break;
      }
      const cwd = path.dirname(pkgPath);
      const proc = spawnSync("npm", ["test"], { cwd, encoding: "utf8" });
      results.push({
        check: "tests",
        status: proc.status === 0 ? "pass" : "fail",
        detail: `cwd=${cwd} exit=${proc.status}`,
      });
      ran = true;
      break;
    }
    if (!ran) results.push({ check: "tests", status: "skipped", detail: "no package.json" });
  }

  // OpenAPI shape (canonical Docs/openapi.*)
  const openapi = await findOpenApi(projectDir);
  if (!openapi) {
    results.push({
      check: "openapi",
      status: "fail",
      detail: "missing Docs/openapi.yaml (canonical contract path)",
    });
  } else {
    const text = await fs.readFile(openapi, "utf8");
    const shapeFails = checkOpenApiShape(text, openapi);
    results.push({
      check: "openapi",
      status: shapeFails.length ? "fail" : "pass",
      detail: shapeFails.length
        ? `${path.relative(projectDir, openapi)}: ${shapeFails.join("; ")}`
        : `shape ok — ${path.relative(projectDir, openapi)}`,
    });
  }

  // OWASP attestation
  const owaspPath = path.join(
    projectDir,
    "Docs",
    args.seedId ? `OWASP_${args.seedId}.md` : "OWASP_CHECKLIST.md"
  );
  if (await exists(owaspPath)) {
    const text = await fs.readFile(owaspPath, "utf8");
    const complete = /overall:\s*(pass|passed|n\/a|flagged)/i.test(text);
    results.push({
      check: "owasp",
      status: complete ? "pass" : "fail",
      detail: complete
        ? owaspPath
        : `${owaspPath} present but missing "overall: pass|n/a|flagged"`,
    });
  } else {
    results.push({
      check: "owasp",
      status: "fail",
      detail: `missing ${owaspPath} — create A01–A10 checklist with overall: pass|n/a|flagged`,
    });
  }

  const hardFails = results.filter((r) => r.status === "fail");
  console.log(`# Validation report${args.seedId ? ` — ${args.seedId}` : ""}\n`);
  console.log("| Check | Status | Detail |");
  console.log("| --- | --- | --- |");
  for (const r of results) {
    console.log(`| ${r.check} | ${r.status} | ${String(r.detail).replace(/\|/g, "\\|")} |`);
  }
  console.log("");
  if (hardFails.length) {
    console.log(`FAIL — ${hardFails.length} hard failure(s)`);
    process.exit(1);
  }
  console.log("PASS — no hard failures");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
