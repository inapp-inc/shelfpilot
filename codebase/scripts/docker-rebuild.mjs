#!/usr/bin/env node
/**
 * Rebuild the Docker images so local source changes ALWAYS ship, then recreate
 * the containers. Cross-platform (Windows / macOS / Linux) — run via:
 *   npm run docker:rebuild
 *
 * How it works: we pass a fresh CACHEBUST value (timestamp) as a build arg. The
 * Dockerfiles reference CACHEBUST right after `npm install`, so the source COPY +
 * build layers are invalidated on every run (changes reflect), while the slow
 * dependency-install layer stays cached. No `--no-cache` needed.
 *
 * Pass extra service names to limit the rebuild, e.g.:
 *   npm run docker:rebuild -- web
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(__dirname, "../api");

function seedProductImages() {
  console.log("\n> Seeding product-images from Docs/products/images …");
  const res = spawnSync("node", ["scripts/seed-product-images.mjs"], {
    cwd: apiDir,
    stdio: "inherit",
    shell: false,
  });
  if (res.status !== 0) {
    console.warn("Warning: product image seed step failed — Docker build may ship without thumbnails.");
  }
}

seedProductImages();

const services = process.argv.slice(2); // optional: ["web"] or ["api"]
const cacheBust = new Date().toISOString().replace(/[^0-9]/g, "");
const env = { ...process.env, CACHEBUST: cacheBust };

function run(args) {
  const pretty = ["docker", ...args].join(" ");
  console.log(`\n> ${pretty}  (CACHEBUST=${cacheBust})`);
  const res = spawnSync("docker", args, { stdio: "inherit", env, shell: false });
  if (res.error) {
    console.error(`Failed to run "${pretty}": ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0) process.exit(res.status ?? 1);
}

// `compose build` rebuilds images with the fresh CACHEBUST; `up --force-recreate`
// guarantees the running containers are replaced by the freshly built images.
run(["compose", "build", ...services]);
run(["compose", "up", "-d", "--force-recreate", ...services]);

console.log("\nDone. App: http://localhost:8080  ·  API: http://localhost:3001/health");
