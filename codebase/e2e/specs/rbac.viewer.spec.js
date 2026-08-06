import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";
import { API_URL } from "../fixtures/env.js";
import { LayoutsPortfolioPage } from "../pages/LayoutsPortfolioPage.js";
import { LayoutEditorPage } from "../pages/LayoutEditorPage.js";
import { CatalogPage } from "../pages/CatalogPage.js";

test.describe("RBAC Viewer @rbac @smoke", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.ok, `API health failed at ${API_URL}/health`).toBeTruthy();
  });

  test("@smoke @rbac Viewer has no Admin nav", async ({ page }) => {
    await loginAs(page, "Viewer");
    await expect(page.getByTestId("nav-layouts")).toBeVisible();
    await expect(page.getByTestId("nav-catalog")).toBeVisible();
    await expect(page.getByTestId("nav-admin")).toHaveCount(0);
  });

  test("@smoke @rbac Viewer catalog is read-only", async ({ page }) => {
    await loginAs(page, "Viewer");
    const catalog = new CatalogPage(page);
    await catalog.goto();
    await catalog.expectReadOnly();
  });

  test("@smoke @rbac Viewer cannot Smart Generate", async ({ page }) => {
    await loginAs(page, "Viewer");
    const portfolio = new LayoutsPortfolioPage(page);
    await portfolio.goto();
    await expect(page.getByTestId("layout-create-open")).toHaveCount(0);
    await portfolio.openDemoLayout();
    const editor = new LayoutEditorPage(page);
    await editor.expandTools();
    await expect(page.getByTestId("smart-generate-open")).toBeDisabled();
    await expect(page.getByTestId("editor-submit-review")).toHaveCount(0);
  });
});
