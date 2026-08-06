import { expect } from "@playwright/test";

export class AdminPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.getByTestId("nav-admin").click();
    await expect(this.page.getByTestId("admin-page")).toBeVisible();
  }

  async openTab(tab) {
    await this.page.getByTestId(`admin-tab-${tab}`).click();
    await expect(this.page.getByTestId(`admin-panel-${tab}`)).toBeVisible();
  }

  async expectSeededUsers() {
    await this.openTab("users");
    await expect(this.page.getByTestId("admin-user-row-designer@shelfpilot.local")).toBeVisible();
    await expect(this.page.getByTestId("admin-user-row-admin@shelfpilot.local")).toBeVisible();
  }

  async createUser({ name, email, role = "Viewer", password = "password" }) {
    await this.openTab("users");
    await this.page.getByTestId("admin-user-name").fill(name);
    await this.page.getByTestId("admin-user-email").fill(email);
    await this.page.getByTestId("admin-user-role").selectOption(role);
    await this.page.getByTestId("admin-user-password").fill(password);
    await this.page.getByTestId("admin-user-create-submit").click();
    await expect(this.page.getByTestId(`admin-user-row-${email}`)).toBeVisible({ timeout: 15_000 });
  }

  async expectHypermarketMinAisle(min = "1.5") {
    await this.openTab("configuration");
    await this.page.getByTestId("admin-config-vertical").selectOption("hypermarket");
    await expect(this.page.getByTestId("admin-config-min-aisle")).toHaveValue(String(min));
  }

  async expectApproverAuditOnly() {
    await expect(this.page.getByTestId("admin-tab-audit")).toBeVisible();
    await expect(this.page.getByTestId("admin-tab-users")).toHaveCount(0);
    await expect(this.page.getByTestId("admin-tab-stores")).toHaveCount(0);
    await expect(this.page.getByTestId("admin-tab-configuration")).toHaveCount(0);
    await expect(this.page.getByTestId("admin-audit-list")).toBeVisible();
  }
}
