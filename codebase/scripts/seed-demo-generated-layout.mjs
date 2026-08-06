/**
 * CLI wrapper — same logic as API startup bootstrap.
 * Run: node scripts/seed-demo-generated-layout.mjs
 */
import { getDb } from "../api/src/store/sqlite.js";
import { ensureDemoCatalog, ensureDemoGeneratedLayout } from "../api/src/services/bootstrapDemo.js";

getDb();
ensureDemoCatalog();
const layout = ensureDemoGeneratedLayout({ force: true });
console.log(JSON.stringify({ message: "seed:demo-generated-layout OK", ...layout }));
