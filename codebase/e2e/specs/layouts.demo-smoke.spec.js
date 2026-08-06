import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";
import { API_URL } from "../fixtures/env.js";
import { LayoutsPortfolioPage } from "../pages/LayoutsPortfolioPage.js";
import { LayoutEditorPage } from "../pages/LayoutEditorPage.js";

test.describe("Demo layout 3D smoke @smoke", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.ok, `API health failed at ${API_URL}/health`).toBeTruthy();
  });

  test("@smoke @3d toggle View in 3D then back to 2D", async ({ page }) => {
    page.on("pageerror", (err) => {
      throw err;
    });
    await loginAs(page, "Designer");
    const portfolio = new LayoutsPortfolioPage(page);
    await portfolio.goto();
    await portfolio.openDemoLayout();
    const editor = new LayoutEditorPage(page);
    await editor.open3d();
    await editor.open2d();
    await editor.expandTools();
  });
});
