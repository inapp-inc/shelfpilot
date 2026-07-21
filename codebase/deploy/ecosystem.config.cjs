// pm2 process definition for ShelfPilot (single-port UI + API).
// Used by deploy.sh when pm2 is available. Env values come from the shell/.env
// (deploy.sh exports them) with sensible fallbacks.
const path = require("node:path");

const root = __dirname;

module.exports = {
  apps: [
    {
      name: process.env.APP_NAME || "shelfpilot",
      script: "api/src/index.js",
      cwd: root,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
        PORT: process.env.PORT || 4520,
        BASE_PATH: process.env.BASE_PATH || "/shelfpilot",
        WEB_DIST: process.env.WEB_DIST || path.join(root, "web", "dist"),
        SQLITE_PATH: process.env.SQLITE_PATH || path.join(root, "data", "shelfpilot.db"),
        CORS_ORIGINS: process.env.CORS_ORIGINS || "http://foundry.inapp.com",
      },
    },
  ],
};
