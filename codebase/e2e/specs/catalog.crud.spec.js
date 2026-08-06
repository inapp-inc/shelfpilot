import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";
import { API_URL } from "../fixtures/env.js";
import { CatalogPage } from "../pages/CatalogPage.js";

test.describe("Catalog CRUD @critical @smoke", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.ok, `API health failed at ${API_URL}/health`).toBeTruthy();
  });

  test("@smoke catalog lists products", async ({ page }) => {
    await loginAs(page, "Designer");
    const catalog = new CatalogPage(page);
    await catalog.goto();
    await expect(page.getByTestId("catalog-product-list")).toBeVisible();
    await expect(page.getByTestId("catalog-count")).toContainText(/item/);
  });

  test("@smoke @critical Designer can create category and product", async ({ page }) => {
    await loginAs(page, "Designer");
    const catalog = new CatalogPage(page);
    await catalog.goto();
    await catalog.selectVertical("hypermarket");
    const stamp = Date.now();
    const catName = `E2E Cat ${stamp}`;
    const productName = `E2E Product ${stamp}`;
    await catalog.createCategory(catName);
    await page.getByTitle(`Filter by ${catName}`).click();
    await catalog.createProduct({ name: productName, sku: `E2E-${stamp}` });
  });
});
