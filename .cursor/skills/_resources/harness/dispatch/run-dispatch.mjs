#!/usr/bin/env node
/**
 * Dispatch / collection harness — prepare parallel SEED unit prompts and a status table.
 * Usage: node run-dispatch.mjs --tasks "<path/to/tasks.md>" [--out status.json]
 *
 * Does not start agents automatically; prints scoped prompts and a status skeleton
 * so a human/orchestrator can launch sessions without copy-paste bookkeeping.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { tasks: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tasks") args.tasks = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
  }
  if (!args.tasks) {
    throw new Error('Usage: node run-dispatch.mjs --tasks "<path/to/tasks.md>" [--out status.json]');
  }
  return args;
}

function parseTaskBullets(md) {
  return md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[-*]\s+/.test(l) || /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tasksPath = path.resolve(args.tasks);
  const md = await fs.readFile(tasksPath, "utf8");
  const tasks = parseTaskBullets(md);

  const units = tasks.map((goal, i) => ({
    unit: `U${i + 1}`,
    goal,
    session: null,
    seedReview: "pending",
    prompt: [
      "Implement this SEED unit only.",
      `Goal: ${goal}`,
      "Follow .cursor/skills/seed-unit/SKILL.md and linked OpenSpec change folder.",
      "Do not expand scope. Produce evidence mapped to acceptance criteria.",
    ].join("\n"),
  }));

  const table = [
    "| Unit | Goal | Session | Seed-review |",
    "| --- | --- | --- | --- |",
    ...units.map(
      (u) => `| ${u.unit} | ${u.goal.replace(/\|/g, "\\|")} | ${u.session ?? "—"} | ${u.seedReview} |`
    ),
  ].join("\n");

  console.log("## Dispatch status\n");
  console.log(table);
  console.log("\n## Scoped prompts\n");
  for (const u of units) {
    console.log(`### ${u.unit}\n\`\`\`\n${u.prompt}\n\`\`\`\n`);
  }

  if (args.out) {
    await fs.writeFile(path.resolve(args.out), JSON.stringify({ units }, null, 2));
    console.log(`Wrote ${args.out}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
