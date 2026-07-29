import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app is served under a base path in production (e.g. /shelfpilot) behind nginx.
// Set VITE_BASE_PATH at build time (the package scripts default it to "/shelfpilot/").
// It MUST start and end with a slash. In dev it defaults to "/".
// The web app derives its API base from import.meta.env.BASE_URL (see src/api.js), so the
// API always lives under <base>/api and matches the build automatically.
const base = process.env.VITE_BASE_PATH || "/";

// Backend runs at :3000 with root-mounted routes in dev; the web app calls <base>/api and
// Vite proxies + strips that prefix so client routes fall through to the SPA on a refresh.
const apiPrefix = `${base.replace(/\/+$/, "")}/api`;

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      [apiPrefix]: {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(new RegExp(`^${apiPrefix}`), ""),
      },
      [`${base.replace(/\/+$/, "")}/product-images`]: {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
