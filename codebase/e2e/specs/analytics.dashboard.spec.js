import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";
import { API_URL } from "../fixtures/env.js";
import { DashboardPage } from "../pages/DashboardPage.js";

test.describe("Dashboard @smoke", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.ok, `API health failed at ${API_URL}/health`).toBeTruthy();
  });

  test("@smoke dashboard shell and widgets load", async ({ page }) => {
    await loginAs(page, "Designer");
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectShellLoaded();
    await dashboard.expectKpiUtilizationVisible();
  });
});
