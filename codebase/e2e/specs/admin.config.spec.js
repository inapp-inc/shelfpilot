import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";
import { API_URL } from "../fixtures/env.js";
import { AdminPage } from "../pages/AdminPage.js";

test.describe("Admin tabs @admin @smoke", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.ok, `API health failed at ${API_URL}/health`).toBeTruthy();
  });

  test("@smoke @admin Admin users list + create user", async ({ page }) => {
    await loginAs(page, "Admin");
    const admin = new AdminPage(page);
    await admin.goto();
    await admin.expectSeededUsers();
    const stamp = Date.now();
    await admin.createUser({
      name: `E2E User ${stamp}`,
      email: `e2e-${stamp}@shelfpilot.local`,
      role: "Viewer",
      password: "password",
    });
  });

  test("@smoke @admin Store Master + Configuration min aisle", async ({ page }) => {
    await loginAs(page, "Admin");
    const admin = new AdminPage(page);
    await admin.goto();
    await admin.openTab("stores");
    await expect(page.getByTestId("admin-stores")).toBeVisible();
    await expect(page.getByTestId("admin-stores").getByText(/^Shelf types —/)).toBeVisible();
    await admin.openTab("approval");
    await expect(page.getByTestId("admin-approval-enabled")).toBeVisible();
    await admin.expectHypermarketMinAisle("1.5");
    await admin.openTab("audit");
    await expect(page.getByTestId("admin-audit-list")).toBeVisible();
  });

  test("@smoke @rbac @admin Approver sees Audit only", async ({ page }) => {
    await loginAs(page, "Approver");
    const admin = new AdminPage(page);
    await admin.goto();
    await admin.expectApproverAuditOnly();
  });

  test("@smoke @rbac Designer has no Admin nav", async ({ page }) => {
    await loginAs(page, "Designer");
    await expect(page.getByTestId("nav-admin")).toHaveCount(0);
  });
});
