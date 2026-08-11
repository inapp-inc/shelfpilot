import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";
import { API_URL } from "../fixtures/env.js";
import { LayoutsPortfolioPage } from "../pages/LayoutsPortfolioPage.js";
import { LayoutEditorPage } from "../pages/LayoutEditorPage.js";

test.describe("Shelf arrangement & volume @smoke", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.ok, `API health failed at ${API_URL}/health`).toBeTruthy();
  });

  test("@smoke demo layout opens with arrangement already accepted", async ({ page }) => {
    await loginAs(page, "Designer");
    const portfolio = new LayoutsPortfolioPage(page);
    await portfolio.goto();
    await portfolio.openDemoLayout();

    const editor = new LayoutEditorPage(page);
    await expect(page.getByTestId("arrangement-reopen")).toBeVisible({ timeout: 20_000 });
    await editor.openArrangementSummary();
    await editor.expectArrangementAcceptedView();
    await editor.closeArrangementPanel();
  });
});
