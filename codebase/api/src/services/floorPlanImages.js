/**
 * Uploaded store floor-plan images (architectural drawings traced in the editor).
 * Stored on disk next to the SQLite DB and served statically, mirroring product images.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { resolveSqlitePath } from "../store/sqlite.js";

export const FLOOR_PLAN_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg"];

export function resolveFloorPlansDir() {
  if (process.env.FLOOR_PLANS_DIR) return path.resolve(process.env.FLOOR_PLANS_DIR);
  const sqlitePath = resolveSqlitePath();
  if (sqlitePath === ":memory:") {
    return path.resolve(process.cwd(), "data", "floor-plans");
  }
  return path.join(path.dirname(sqlitePath), "floor-plans");
}

export function ensureFloorPlansDir() {
  const dir = resolveFloorPlansDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function publicFloorPlanUrl(fileName) {
  return `/floor-plans/${encodeURIComponent(fileName)}`;
}

export function isAllowedFloorPlanFile(fileName) {
  const ext = path.extname(String(fileName || "")).toLowerCase();
  return FLOOR_PLAN_EXTENSIONS.includes(ext);
}

export function sanitizeFloorPlanFileName(fileName) {
  const base = path.basename(String(fileName || "").trim());
  if (!base || base.includes("..")) return null;
  if (!isAllowedFloorPlanFile(base)) return null;
  return base;
}

/** Store under a layout-scoped unique name so re-uploads never clash or cache-hit. */
export function saveFloorPlanImage(buffer, layoutId, originalFileName) {
  const ext = (path.extname(String(originalFileName || "")).toLowerCase() || ".png").replace(
    /[^a-z.]/g,
    ""
  );
  const safeExt = FLOOR_PLAN_EXTENSIONS.includes(ext) ? ext : ".png";
  const safeLayoutId = String(layoutId || "layout").replace(/[^a-zA-Z0-9_-]/g, "");
  const fileName = `${safeLayoutId}-${randomUUID().slice(0, 8)}${safeExt}`;
  const dir = ensureFloorPlansDir();
  fs.writeFileSync(path.join(dir, fileName), buffer);
  return { fileName, url: publicFloorPlanUrl(fileName) };
}

export function deleteFloorPlanImage(fileName) {
  const safe = sanitizeFloorPlanFileName(fileName);
  if (!safe) return false;
  const target = path.join(resolveFloorPlansDir(), safe);
  if (!fs.existsSync(target)) return false;
  fs.unlinkSync(target);
  return true;
}
