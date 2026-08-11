import { expect } from "@playwright/test";

export class LayoutEditorPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  root() {
    return this.page.getByTestId("layout-editor");
  }

  async expectOpen(name) {
    await expect(this.root()).toBeVisible();
    if (name) await expect(this.page.getByTestId("editor-layout-name")).toHaveText(name);
  }

  /** Tools panel starts collapsed by default — expand before palette actions. */
  async expandTools() {
    const expand = this.page.getByRole("button", { name: /Expand Tools/i });
    if (await expand.isVisible().catch(() => false)) {
      await expand.click();
    }
    await expect(this.page.getByTestId("editor-palette")).toBeVisible();
  }

  aisleViolations() {
    return this.page.getByTestId("editor-aisle-violation");
  }

  async expectNoAisleWidthViolations() {
    const banners = this.aisleViolations();
    const count = await banners.count();
    for (let i = 0; i < count; i += 1) {
      const text = await banners.nth(i).innerText();
      expect(text, `unexpected aisle violation: ${text}`).not.toMatch(/width\s+.+\s+<\s+min/i);
    }
  }

  async openSmartGenerate() {
    await this.expandTools();
    await this.page.getByTestId("smart-generate-open").click();
    await expect(this.page.getByTestId("smart-generate-panel")).toBeVisible();
  }

  async expectStoreMinAisleAtLeast(minMeters) {
    const rule = this.page.getByTestId("smart-generate-store-rule");
    await expect(rule).toBeVisible();
    await expect(rule).toContainText(String(minMeters));
    const value = Number(await this.page.getByTestId("smart-generate-min-aisle").inputValue());
    expect(value).toBeGreaterThanOrEqual(Number(minMeters));
  }

  /**
   * Runs Smart Generate. Stubs window.confirm so replace-existing always proceeds
   * (native dialogs are flaky under Playwright load / retries).
   */
  async runSmartGenerate() {
    const runBtn = this.page.getByTestId("smart-generate-run");
    await expect(runBtn).toBeEnabled({ timeout: 30_000 });

    await this.page.evaluate(() => {
      window.confirm = () => true;
    });

    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes("/autogenerate") && res.request().method() === "POST",
      { timeout: 120_000 }
    );
    await runBtn.click();
    // If a native confirm still appears, accept it (confirm stub usually prevents this).
    this.page.once("dialog", (d) => d.accept().catch(() => {}));
    const res = await responsePromise;
    expect(res.ok(), `autogenerate failed: ${res.status()}`).toBeTruthy();
    await expect(this.page.getByTestId("smart-generate-panel")).toHaveCount(0, { timeout: 30_000 });
    await expect(this.root()).toBeVisible();
    // Next workflow step: arrangement & volume (acceptance clears on regenerate)
    await expect(this.page.getByTestId("arrangement-panel")).toBeVisible({ timeout: 30_000 });
  }

  async expectArrangementPending() {
    await expect(this.page.getByTestId("arrangement-panel")).toBeVisible();
    await expect(this.page.getByTestId("arrangement-pending-banner")).toBeVisible();
    await expect(this.page.getByTestId("arrangement-accept")).toBeEnabled();
  }

  async expectArrangementKpis() {
    const total = this.page.getByTestId("arrangement-total-shelves");
    await expect(total).toBeVisible();
    const n = Number((await total.innerText()).replace(/,/g, ""));
    expect(n, "expected shelves after generate/arrange").toBeGreaterThan(0);
    await expect(this.page.getByTestId("arrangement-row-count")).toBeVisible();
    await expect(this.page.getByTestId("arrangement-total-volume")).toBeVisible();
    await expect(this.page.getByTestId("arrangement-layout-summary")).toBeVisible();
    await expect(this.page.getByTestId("arrangement-max-qty")).toBeVisible();
  }

  /**
   * Accept arrangement summary. Defaults to no planogram fill (faster smoke).
   * @param {{ fillPlanogram?: boolean }} [opts]
   */
  async acceptArrangement({ fillPlanogram = false } = {}) {
    await this.expectArrangementPending();
    await this.expectArrangementKpis();
    const fill = this.page.getByTestId("arrangement-fill-on-accept");
    if (await fill.count()) {
      if (fillPlanogram) await fill.check();
      else await fill.uncheck();
    }
    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes("/arrangement/accept") && res.request().method() === "POST",
      { timeout: 120_000 }
    );
    await this.page.getByTestId("arrangement-accept").click();
    const res = await responsePromise;
    expect(res.ok(), `arrangement accept failed: ${res.status()}`).toBeTruthy();
    await expect(this.page.getByTestId("arrangement-modal")).toHaveCount(0, { timeout: 30_000 });
    await expect(this.page.getByTestId("arrangement-reopen")).toBeVisible({ timeout: 30_000 });
  }

  async openArrangementSummary() {
    await this.page.getByTestId("arrangement-reopen").click();
    await expect(this.page.getByTestId("arrangement-panel")).toBeVisible();
  }

  async expectArrangementAcceptedView() {
    await expect(this.page.getByTestId("arrangement-accepted-banner")).toBeVisible();
    await this.expectArrangementKpis();
  }

  async closeArrangementPanel() {
    const close = this.page.getByTestId("arrangement-close");
    if (await close.isVisible().catch(() => false)) {
      await close.click();
    } else {
      await this.page.getByTestId("arrangement-done").click();
    }
    await expect(this.page.getByTestId("arrangement-modal")).toHaveCount(0);
    await expect(this.page.getByTestId("arrangement-reopen")).toBeVisible();
  }

  async open3d() {
    await this.page.getByTestId("view-3d").click();
    await expect(this.page.getByTestId("editor-canvas-stage")).toBeVisible();
    await expect(this.page.locator("canvas").first()).toBeVisible({ timeout: 20_000 });
  }

  async open2d() {
    await this.page.getByTestId("view-2d").click();
  }

  async backToPortfolio() {
    await this.page.getByTestId("editor-back").click();
    await expect(this.page.getByTestId("layouts-portfolio")).toBeVisible();
  }

  async submitForReview() {
    const btn = this.page.getByTestId("editor-submit-review");
    await expect(btn).toBeVisible();
    const resPromise = this.page.waitForResponse(
      (r) => r.url().includes("/review/submit") && r.request().method() === "POST"
    );
    await btn.click();
    const res = await resPromise;
    expect(res.ok(), `submit failed: ${res.status()}`).toBeTruthy();
    await expect(this.page.getByTestId("editor-layout-status")).toHaveText(/In review/i);
  }

  async approve() {
    const resPromise = this.page.waitForResponse(
      (r) => r.url().includes("/review/approve") && r.request().method() === "POST"
    );
    await this.page.getByTestId("editor-approve").click();
    const res = await resPromise;
    expect(res.ok(), `approve failed: ${res.status()}`).toBeTruthy();
    await expect(this.page.getByTestId("editor-layout-status")).toHaveText(/Approved/i);
  }

  async reject(comment) {
    await this.page.getByTestId("editor-reject").click();
    await expect(this.page.getByTestId("reject-modal")).toBeVisible();
    await this.page.getByTestId("reject-comment").fill(comment);
    const resPromise = this.page.waitForResponse(
      (r) => r.url().includes("/review/reject") && r.request().method() === "POST"
    );
    await this.page.getByTestId("reject-confirm").click();
    const res = await resPromise;
    expect(res.ok(), `reject failed: ${res.status()}`).toBeTruthy();
    await expect(this.page.getByTestId("reject-modal")).toHaveCount(0);
    await expect(this.page.getByTestId("editor-layout-status")).toHaveText(/Rejected/i);
  }
}
