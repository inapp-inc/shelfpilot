#!/usr/bin/env node
/**
 * Clone the ADR-aligned starter template into a project directory.
 * Usage: node clone-scaffold.mjs --projectDir "<projectDir>" [--target codebase|root]
 *
 * Also ensures Discovery and Design / Docs exist and seeds Docs/openapi.yaml from the stub.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const args = { projectDir: null, target: "codebase" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--projectDir") args.projectDir = argv[++i];
    else if (a === "--target") args.target = argv[++i];
  }
  if (!args.projectDir) {
    throw new Error(
      'Usage: node clone-scaffold.mjs --projectDir "<dir>" [--target codebase|root]'
    );
  }
  return args;
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "openapi.stub.yaml") continue; // handled separately into Docs/
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else await fs.copyFile(from, to);
  }
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const here = path.dirname(fileURLToPath(import.meta.url));
  const starter = path.join(here, "starter");
  const projectDir = path.resolve(args.projectDir);
  const dest =
    args.target === "root" ? projectDir : path.join(projectDir, "codebase");

  await fs.mkdir(path.join(projectDir, "Discovery and Design"), { recursive: true });
  await fs.mkdir(path.join(projectDir, "Docs"), { recursive: true });
  await fs.mkdir(dest, { recursive: true });
  await copyDir(starter, dest);

  const stub = path.join(starter, "openapi.stub.yaml");
  const openapiDest = path.join(projectDir, "Docs", "openapi.yaml");
  if (!(await exists(openapiDest))) {
    await fs.copyFile(stub, openapiDest);
    console.log(`Seeded ${openapiDest}`);
  } else {
    console.log(`Kept existing ${openapiDest}`);
  }

  console.log(`Scaffold starter copied to ${dest}`);
  console.log("Next: npm install in codebase/, customize, record divergences in design.md");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
