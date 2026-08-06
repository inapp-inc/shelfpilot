import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";
import { API_URL } from "../fixtures/env.js";
import { LayoutsPortfolioPage } from "../pages/LayoutsPortfolioPage.js";
import { LayoutEditorPage } from "../pages/LayoutEditorPage.js";

test.describe("Smart Generate @smoke", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.ok, `API health failed at ${API_URL}/health`).toBeTruthy();
  });

  test("@smoke Smart Generate shows store aisle min and run keeps compliance", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, "Designer");
    const portfolio = new LayoutsPortfolioPage(page);
    await portfolio.goto();
    await portfolio.openDemoLayout();

    const editor = new LayoutEditorPage(page);
    await editor.openSmartGenerate();
    await editor.expectStoreMinAisleAtLeast(1.5);
    await editor.runSmartGenerate();
    await editor.expectNoAisleWidthViolations();
  });
});
