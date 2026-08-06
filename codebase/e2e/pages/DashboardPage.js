import { expect } from "@playwright/test";

export class DashboardPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.getByTestId("nav-dashboard").click();
    await expect(this.page.getByTestId("dashboard-page")).toBeVisible();
  }

  async expectShellLoaded() {
    await expect(this.page.getByTestId("dashboard-page")).toBeVisible();
    await expect(this.page.getByTestId("dashboard-pipeline")).toBeVisible();
    await expect(this.page.getByTestId("dashboard-analytics")).toBeVisible();
    await expect(this.page.getByTestId("dashboard-widgets")).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByTestId("dashboard-layout-picker")).toBeVisible();
  }

  async expectKpiUtilizationVisible() {
    await expect(this.page.getByTestId("analytics-widget-kpi-utilization")).toBeVisible({ timeout: 30_000 });
  }
}
