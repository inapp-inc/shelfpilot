import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";
import { API_URL } from "../fixtures/env.js";
import { LayoutsPortfolioPage } from "../pages/LayoutsPortfolioPage.js";
import { LayoutCreateModal } from "../pages/LayoutCreateModal.js";
import { LayoutEditorPage } from "../pages/LayoutEditorPage.js";

test.describe("Approval workflow @critical @smoke", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.ok, `API health failed at ${API_URL}/health`).toBeTruthy();
  });

  test("@smoke @critical Designer submit → Approver approve", async ({ page }) => {
    const name = `E2E Approval ${Date.now()}`;

    await loginAs(page, "Designer");
    const portfolio = new LayoutsPortfolioPage(page);
    await portfolio.goto();
    await portfolio.openCreateModal();
    const modal = new LayoutCreateModal(page);
    await modal.createAndOpenEditor({
      name,
      storeTypeId: "hypermarket",
      length: "12",
      width: "10",
      height: "3",
    });
    const editor = new LayoutEditorPage(page);
    await editor.submitForReview();
    await editor.backToPortfolio();
    await page.getByTestId("sign-out").click();
    await expect(page.getByTestId("login-form")).toBeVisible();

    await loginAs(page, "Approver");
    await portfolio.goto();
    await portfolio.cardByName(name).click();
    await editor.expectOpen(name);
    await expect(page.getByTestId("editor-approve")).toBeVisible();
    await editor.approve();
  });

  test("@smoke @critical Approver reject requires comment then rejects", async ({ page }) => {
    const name = `E2E Reject ${Date.now()}`;

    await loginAs(page, "Designer");
    const portfolio = new LayoutsPortfolioPage(page);
    await portfolio.goto();
    await portfolio.openCreateModal();
    await new LayoutCreateModal(page).createAndOpenEditor({
      name,
      storeTypeId: "pharmacy",
      length: "10",
      width: "8",
      height: "3",
    });
    const editor = new LayoutEditorPage(page);
    await editor.submitForReview();
    await editor.backToPortfolio();
    await page.getByTestId("sign-out").click();
    await expect(page.getByTestId("login-form")).toBeVisible();

    await loginAs(page, "Approver");
    await portfolio.goto();
    await portfolio.cardByName(name).click();
    await editor.expectOpen(name);
    await page.getByTestId("editor-reject").click();
    await expect(page.getByTestId("reject-modal")).toBeVisible();
    await expect(page.getByTestId("reject-confirm")).toBeDisabled();
    await page.getByTestId("reject-cancel").click();
    await editor.reject("E2E: please adjust aisle spacing");
  });
});
