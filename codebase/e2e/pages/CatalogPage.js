import { expect } from "@playwright/test";

export class CatalogPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.getByTestId("nav-catalog").click();
    await expect(this.page.getByTestId("catalog-page")).toBeVisible();
  }

  async expectReadOnly() {
    await expect(this.page.getByTestId("catalog-product-create")).toBeDisabled();
    await expect(this.page.getByTestId("catalog-category-create")).toHaveCount(0);
  }

  async createCategory(name) {
    await this.page.getByTestId("catalog-category-create").click();
    await expect(this.page.getByTestId("drawer-panel")).toBeVisible();
    await this.page.getByTestId("category-form-name").fill(name);
    const resPromise = this.page.waitForResponse(
      (r) => r.url().includes("/categories") && r.request().method() === "POST"
    );
    await this.page.getByTestId("category-form-submit").click();
    const res = await resPromise;
    expect(res.ok(), `category create failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    await expect(this.page.getByTestId("drawer-panel")).toHaveCount(0);
    await expect(this.page.getByTestId("catalog-category-bar").getByText(name)).toBeVisible({
      timeout: 15_000,
    });
  }

  async createProduct({ name, sku }) {
    await this.page.getByTestId("catalog-product-create").click();
    await expect(this.page.getByTestId("drawer-panel")).toBeVisible();
    await this.page.getByTestId("product-form-name").fill(name);
    if (sku) await this.page.getByTestId("product-form-sku").fill(sku);
    const resPromise = this.page.waitForResponse(
      (r) => r.url().includes("/products") && r.request().method() === "POST"
    );
    await this.page.getByTestId("product-form-submit").click();
    const res = await resPromise;
    expect(res.ok(), `product create failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    await expect(this.page.getByTestId("drawer-panel")).toHaveCount(0);
    await this.page.getByTestId("catalog-search").fill(name);
    await expect(this.page.getByTestId("catalog-product-list")).toContainText(name);
  }

  async selectVertical(verticalKey) {
    await this.page.getByTestId("catalog-vertical").selectOption(verticalKey);
  }
}
