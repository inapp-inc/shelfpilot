import { expect } from "@playwright/test";

export class LoginPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/");
    await expect(this.page.getByTestId("login-form")).toBeVisible();
  }

  async login(email, password, role = "Designer") {
    await this.page.getByTestId("login-email").fill(email);
    await this.page.getByTestId("login-password").fill(password);
    await this.page.getByTestId("login-role").selectOption(role);
    await this.page.getByTestId("login-submit").click();
  }

  async expectLoggedIn(role) {
    await expect(this.page.getByTestId("login-form")).toHaveCount(0);
    await expect(this.page.getByTestId("nav-layouts")).toBeVisible();
    if (role) {
      await expect(this.page.getByTestId("user-role")).toHaveText(role);
    }
  }

  async expectLoginError() {
    await expect(this.page.getByTestId("login-error")).toBeVisible();
    await expect(this.page.getByTestId("login-form")).toBeVisible();
  }

  async signOut() {
    await this.page.getByTestId("sign-out").click();
    await expect(this.page.getByTestId("login-form")).toBeVisible();
  }
}
