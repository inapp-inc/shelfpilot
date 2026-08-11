import { expect } from "@playwright/test";

export class LayoutCreateModal {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async expectLabelsLengthWidthHeight() {
    await expect(this.page.getByTestId("layout-create-length-label")).toHaveText(/Length/);
    await expect(this.page.getByTestId("layout-create-width-label")).toHaveText(/Width/);
    await expect(this.page.getByTestId("layout-create-height-label")).toHaveText(/Height/);
    await expect(this.page.getByTestId("layout-create-length-label")).not.toHaveText(/Depth/);
  }

  async fill({ name, storeTypeId = "hypermarket", length = "24", width = "16", height = "3.2" }) {
    await this.page.getByTestId("layout-create-mode-dimensions").click();
    await this.page.getByTestId("layout-create-name").fill(name);
    await this.page.getByTestId("layout-create-store-type").selectOption(storeTypeId);
    await this.page.getByTestId("layout-create-length").fill(String(length));
    await this.page.getByTestId("layout-create-width").fill(String(width));
    await this.page.getByTestId("layout-create-height").fill(String(height));
  }

  async submit() {
    await this.page.getByTestId("layout-create-submit").click();
  }

  async createAndOpenEditor(opts) {
    await this.fill(opts);
    await this.submit();
    await expect(this.page.getByTestId("layout-create-modal")).toHaveCount(0);
    await expect(this.page.getByTestId("layout-editor")).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByTestId("editor-layout-name")).toHaveText(opts.name);
  }
}
