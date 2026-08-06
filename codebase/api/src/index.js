import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { correlationId } from "./middleware/correlationId.js";
import { ensureProductImagesDir, resolveProductImagesDir } from "./services/productImages.js";
import { ensureFloorPlansDir, resolveFloorPlansDir } from "./services/floorPlanImages.js";
import { bootstrapProductImages } from "./services/bootstrapProductImages.js";
import { ensureDemoReady } from "./services/bootstrapDemo.js";
import { getDb } from "./store/sqlite.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { layoutsRouter } from "./routes/layouts.js";
import { catalogRouter } from "./routes/catalog.js";
import { analyticsRouter } from "./routes/analytics.js";
import { adminRouter } from "./routes/admin.js";

const app = express();
const port = Number(process.env.PORT || 3000);

// Single-port production: when WEB_DIST points at the built UI, this process serves both
// the API and the SPA on one port — no nginx needed inside the package. In dev/tests
// WEB_DIST is unset, so routes stay root-mounted and Vite proxies <base>/api.
const webDist = process.env.WEB_DIST ? path.resolve(process.env.WEB_DIST) : null;
const serveWeb = !!webDist && fs.existsSync(path.join(webDist, "index.html"));

// Deploy subpath, e.g. "/shelfpilot" (served at http://foundry.inapp.com/shelfpilot).
// Must match the web build's base. Empty = served at root.
const rawBase = process.env.BASE_PATH || "";
const basePath = rawBase === "/" ? "" : rawBase.replace(/\/+$/, "");
const apiMount = `${basePath}/api`;

// CORS: same-origin in production (UI + API share one origin), so no CORS needed. If you do
// call the API cross-origin, set CORS_ORIGINS (comma-separated) to lock it down; unset = allow all.
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(helmet(serveWeb ? { contentSecurityPolicy: false } : undefined));
app.use(cors(corsOrigins.length ? { origin: corsOrigins, credentials: true } : undefined));
// Floor-plan drawings are uploaded as base64 JSON and are far larger than thumbnails.
app.use(express.json({ limit: "25mb" }));
app.use(correlationId);
app.use(morgan("combined"));

// Product thumbnails live in data/product-images/ and are served at /product-images/.
const imageBootstrap = bootstrapProductImages();
const productImagesDir = ensureProductImagesDir();
const mountProductImages = (mountPath) => {
  app.use(mountPath, express.static(productImagesDir, { fallthrough: true }));
};
mountProductImages(`${basePath}/product-images`);
if (basePath) mountProductImages("/product-images");

// Uploaded architectural floor plans, served at /floor-plans/.
const floorPlansDir = ensureFloorPlansDir();
const mountFloorPlans = (mountPath) => {
  app.use(mountPath, express.static(floorPlansDir, { fallthrough: true }));
};
mountFloorPlans(`${basePath}/floor-plans`);
if (basePath) mountFloorPlans("/floor-plans");

const routers = [
  healthRouter,
  authRouter,
  layoutsRouter,
  catalogRouter,
  analyticsRouter,
  adminRouter,
];

if (serveWeb) {
  for (const r of routers) app.use(apiMount, r);
  if (basePath) app.use(basePath, express.static(webDist));
  else app.use(express.static(webDist));
  // SPA fallback: non-API GET/HEAD under the base returns index.html so client routes
  // survive a hard refresh.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith(`${apiMount}/`)) return next();
    if (basePath && req.path !== basePath && !req.path.startsWith(`${basePath}/`)) return next();
    res.sendFile(path.join(webDist, "index.html"));
  });
} else {
  for (const r of routers) app.use(r);
}

app.use((err, _req, res, _next) => {
  console.error(JSON.stringify({ level: "error", message: err.message }));
  res.status(err.status || 500).json({ error: "internal_error" });
});

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  let demoBootstrap = null;
  if (process.env.NODE_ENV !== "test" && process.env.SKIP_DEMO_BOOTSTRAP !== "1") {
    getDb();
    demoBootstrap = ensureDemoReady();
  }
  app.listen(port, () => {
    console.log(
      JSON.stringify({
        level: "info",
        message: "shelfpilot listening",
        port,
        serveWeb,
        basePath: serveWeb ? basePath || "/" : null,
        webDist: serveWeb ? webDist : null,
        productImagesDir: resolveProductImagesDir(),
        productImagesBootstrapped: imageBootstrap.copied,
        floorPlansDir: resolveFloorPlansDir(),
        demoBootstrap,
      })
    );
  });
}

export default app;
