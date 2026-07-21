#!/usr/bin/env node
/** Lightweight OpenAPI shape check (no external deps). */
import { promises as fs } from "node:fs";
import path from "node:path";

const candidates = [
  process.argv[2],
  "Docs/openapi.yaml",
  "Docs/openapi.json",
  "openapi.stub.yaml",
].filter(Boolean);

function fail(msg) {
  console.error(`openapi:check FAIL — ${msg}`);
  process.exit(1);
}

async function load(file) {
  const text = await fs.readFile(file, "utf8");
  if (file.endsWith(".json")) return { kind: "json", data: JSON.parse(text), text };
  return { kind: "yaml", data: null, text };
}

function yamlHas(text, key) {
  return new RegExp(`^${key}\\s*:`, "m").test(text);
}

async function main() {
  let file = null;
  for (const c of candidates) {
    try {
      await fs.access(c);
      file = c;
      break;
    } catch {
      /* try next */
    }
  }
  if (!file) fail("no OpenAPI file found (expected Docs/openapi.yaml)");

  const loaded = await load(file);
  if (loaded.kind === "json") {
    if (!loaded.data.openapi && !loaded.data.swagger) fail(`${file}: missing openapi/swagger version`);
    if (!loaded.data.paths || typeof loaded.data.paths !== "object") fail(`${file}: missing paths`);
  } else {
    if (!yamlHas(loaded.text, "openapi") && !yamlHas(loaded.text, "swagger")) {
      fail(`${file}: missing openapi/swagger key`);
    }
    if (!yamlHas(loaded.text, "paths")) fail(`${file}: missing paths`);
    if (!yamlHas(loaded.text, "info")) fail(`${file}: missing info`);
  }
  console.log(`openapi:check PASS — ${path.resolve(file)}`);
}

main().catch((err) => fail(err.message || String(err)));
