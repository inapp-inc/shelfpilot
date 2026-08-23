#!/usr/bin/env node
/**
 * OpenAPI presence + route inventory check (no external deps).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const codebaseRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(codebaseRoot, "..");

const REQUIRED_OPERATIONS = [
  ["get", "/health"],
  ["post", "/auth/login"],
  ["get", "/auth/me"],
  ["post", "/auth/logout"],
  ["get", "/layouts"],
  ["post", "/layouts"],
  ["get", "/layouts/{layoutId}"],
  ["patch", "/layouts/{layoutId}"],
  ["post", "/layouts/{layoutId}/aisles"],
  ["patch", "/layouts/{layoutId}/aisles/{aisleId}"],
  ["post", "/layouts/{layoutId}/fixtures"],
  ["patch", "/layouts/{layoutId}/fixtures/{fixtureId}"],
  ["post", "/layouts/{layoutId}/shelves"],
  ["patch", "/layouts/{layoutId}/shelves/{shelfId}"],
  ["post", "/layouts/{layoutId}/shelves/{shelfId}/planogram"],
  ["delete", "/layouts/{layoutId}/shelves/{shelfId}/planogram/{placementId}"],
  ["post", "/layouts/{layoutId}/planogram/preview"],
  ["post", "/layouts/{layoutId}/autogenerate"],
  ["post", "/layouts/{layoutId}/mappings"],
  ["post", "/layouts/{layoutId}/auto-calc"],
  ["get", "/layouts/{layoutId}/versions"],
  ["get", "/categories"],
  ["post", "/categories"],
  ["get", "/products"],
  ["post", "/products"],
  ["patch", "/products/{productId}"],
  ["post", "/catalog/import"],
  ["get", "/catalog/export"],
  ["get", "/analytics/portfolio"],
  ["get", "/analytics/layouts/{layoutId}/summary"],
  ["post", "/analytics/compare"],
  ["get", "/admin/config"],
  ["put", "/admin/config"],
  ["get", "/admin/users"],
  ["post", "/admin/users"],
  ["patch", "/admin/users/{userId}"],
  ["delete", "/admin/users/{userId}"],
  ["get", "/admin/audit"],
];

const candidates = [
  process.argv[2],
  path.join(repoRoot, "Docs", "openapi.yaml"),
  path.join(codebaseRoot, "Docs", "openapi.yaml"),
  "Docs/openapi.yaml",
].filter(Boolean);

function fail(msg) {
  console.error(`openapi:check FAIL — ${msg}`);
  process.exit(1);
}

function yamlHas(text, key) {
  return new RegExp(`^${key}\\s*:`, "m").test(text);
}

function hasOperation(text, method, apiPath) {
  // Path line like `  /health:` then later `    get:` before next top-level path
  const pathIdx = text.indexOf(`\n  ${apiPath}:`);
  const altIdx = text.startsWith(`  ${apiPath}:`) ? 0 : -1;
  const start = pathIdx >= 0 ? pathIdx : altIdx;
  if (start < 0) return false;
  const rest = text.slice(start + 1);
  const nextPath = rest.search(/\n  \//);
  const block = nextPath >= 0 ? rest.slice(0, nextPath) : rest;
  return new RegExp(`\\n    ${method}\\s*:`).test(`\n${block}`) || new RegExp(`^    ${method}\\s*:`, "m").test(block);
}

async function main() {
  let file = null;
  for (const c of candidates) {
    try {
      await fs.access(c);
      file = c;
      break;
    } catch {
      /* next */
    }
  }
  if (!file) fail("no OpenAPI file found (expected Docs/openapi.yaml at repo root)");

  const text = await fs.readFile(file, "utf8");
  if (!yamlHas(text, "openapi") && !yamlHas(text, "swagger")) fail(`${file}: missing openapi/swagger key`);
  if (!yamlHas(text, "paths")) fail(`${file}: missing paths`);
  if (!yamlHas(text, "info")) fail(`${file}: missing info`);
  if (!/^\s+Error:\s*$/m.test(text) && !text.includes("\n    Error:")) {
    // accept `    Error:` under schemas
    if (!text.includes("Error:")) fail(`${file}: missing Error schema`);
  }

  const missing = [];
  for (const [method, apiPath] of REQUIRED_OPERATIONS) {
    if (!hasOperation(text, method, apiPath)) missing.push(`${method.toUpperCase()} ${apiPath}`);
  }
  if (missing.length) fail(`routes not documented:\n  - ${missing.join("\n  - ")}`);

  console.log(
    `openapi:check PASS — ${path.resolve(file)} (${REQUIRED_OPERATIONS.length} operations verified)`
  );
}

main().catch((err) => fail(err.message || String(err)));
