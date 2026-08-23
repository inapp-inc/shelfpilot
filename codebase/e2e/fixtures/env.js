/** Environment helpers for Playwright E2E. */

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080";
export const API_URL = process.env.PLAYWRIGHT_API_URL || "http://localhost:3001";

export const DEMO_USERS = {
  SuperAdmin: { email: "superadmin@shelfpilot.local", password: "changeme" },
  Designer: { email: "designer@shelfpilot.local", password: "password" },
  Approver: { email: "approver@shelfpilot.local", password: "password" },
  Viewer: { email: "viewer@shelfpilot.local", password: "password" },
  Admin: { email: "admin@shelfpilot.local", password: "password" },
};
