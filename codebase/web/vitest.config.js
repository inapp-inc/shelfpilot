import { defineConfig } from "vite";

// Separate from vite.config.js (the production build config) so test-only settings never
// affect the app bundle. Covers pure-function modules only — no jsdom/component rendering yet.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
