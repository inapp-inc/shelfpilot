import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";
import { API_URL } from "../fixtures/env.js";
import { LayoutsPortfolioPage } from "../pages/LayoutsPortfolioPage.js";
import { LayoutCreateModal } from "../pages/LayoutCreateModal.js";
import { LayoutEditorPage } from "../pages/LayoutEditorPage.js";

test.describe("Layouts create & demo @smoke", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.ok, `API health failed at ${API_URL}/health`).toBeTruthy();
  });

  test("@smoke portfolio lists Demo Hypermarket", async ({ page }) => {
    await loginAs(page, "Designer");
    const portfolio = new LayoutsPortfolioPage(page);
    await portfolio.goto();
    await expect(portfolio.demoCard()).toBeVisible();
    await expect(portfolio.demoCard()).toContainText(/Demo Hypermarket/i);
  });

  test("@smoke create modal shows Length Width Height labels", async ({ page }) => {
    await loginAs(page, "Designer");
    const portfolio = new LayoutsPortfolioPage(page);
    await portfolio.goto();
    await portfolio.openCreateModal();
    const modal = new LayoutCreateModal(page);
    await expect(page.getByTestId("layout-create-mode-dimensions")).toBeVisible();
    await expect(page.getByTestId("layout-create-mode-floorplan")).toBeVisible();
    await page.getByTestId("layout-create-mode-dimensions").click();
    await modal.expectLabelsLengthWidthHeight();
    await page.getByTestId("layout-create-mode-floorplan").click();
    await expect(page.getByTestId("layout-create-floorplan-pick")).toBeVisible();
    await expect(page.getByText(/PNG, JPG, WEBP, SVG or PDF/i)).toBeVisible();
    await expect(page.getByTestId("layout-create-length")).toHaveCount(0);
  });

  test("@smoke create layout with Length×Width×Height opens editor", async ({ page }) => {
    await loginAs(page, "Designer");
    const portfolio = new LayoutsPortfolioPage(page);
    await portfolio.goto();
    await portfolio.openCreateModal();
    const name = `E2E Store ${Date.now()}`;
    const modal = new LayoutCreateModal(page);
    await modal.createAndOpenEditor({
      name,
      storeTypeId: "hypermarket",
      length: "20",
      width: "14",
      height: "3.2",
    });
    const editor = new LayoutEditorPage(page);
    await editor.expectOpen(name);
    await editor.backToPortfolio();
  });

  test("@smoke empty store name is blocked", async ({ page }) => {
    await loginAs(page, "Designer");
    const portfolio = new LayoutsPortfolioPage(page);
    await portfolio.goto();
    await portfolio.openCreateModal();
    await page.getByTestId("layout-create-name").fill("");
    await page.getByTestId("layout-create-submit").click();
    await expect(page.getByTestId("layout-create-modal")).toBeVisible();
    await expect(page.getByTestId("layout-create-errors")).toBeVisible();
    await expect(page.getByText(/Store name is required/i)).toBeVisible();
  });

  test("@smoke open demo layout has no aisle width violations", async ({ page }) => {
    await loginAs(page, "Designer");
    const portfolio = new LayoutsPortfolioPage(page);
    await portfolio.goto();
    await portfolio.openDemoLayout();
    const editor = new LayoutEditorPage(page);
    await editor.expectOpen();
    await editor.expandTools();
    await editor.expectNoAisleWidthViolations();
  });
});
