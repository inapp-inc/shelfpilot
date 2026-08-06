import { expect } from "@playwright/test";

export class LayoutsPortfolioPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.getByTestId("nav-layouts").click();
    await expect(this.page.getByTestId("layouts-portfolio")).toBeVisible();
  }

  async openCreateModal() {
    await this.page.getByTestId("layout-create-open").click();
    await expect(this.page.getByTestId("layout-create-modal")).toBeVisible();
  }

  demoCard() {
    return this.page.locator('[data-testid^="layout-card-"][data-demo-ready="true"]').first();
  }

  async openDemoLayout() {
    const card = this.demoCard();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.click();
    await expect(this.page.getByTestId("layout-editor")).toBeVisible();
  }

  cardByName(name) {
    return this.page.locator(`[data-testid^="layout-card-"][data-layout-name="${name}"]`);
  }
}
