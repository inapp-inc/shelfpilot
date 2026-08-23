import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage.js";
import { loginAs } from "../fixtures/auth.js";
import { API_URL, DEMO_USERS } from "../fixtures/env.js";

test.describe("Auth login @smoke", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(
      res.ok,
      `API health failed at ${API_URL}/health — start Docker (\`npm run docker:rebuild\`) or API first`
    ).toBeTruthy();
  });

  test("@smoke Designer can log in", async ({ page }) => {
    const { email, password } = DEMO_USERS.Designer;
    const login = new LoginPage(page);
    await login.goto();
    await login.login(email, password);
    await login.expectLoggedIn("Designer");
    await expect(page.getByTestId("nav-dashboard")).toBeVisible();
    await expect(page.getByTestId("nav-catalog")).toBeVisible();
  });

  test("@smoke bad password is rejected", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(DEMO_USERS.Designer.email, "wrong-password");
    await login.expectLoginError();
  });

  test("@smoke Designer can sign out", async ({ page }) => {
    await loginAs(page, "Designer");
    const login = new LoginPage(page);
    await login.signOut();
    await expect(page.getByTestId("nav-layouts")).toHaveCount(0);
  });
});
