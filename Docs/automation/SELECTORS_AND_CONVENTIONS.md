# Selectors & Conventions — Playwright E2E

Rules for writing maintainable ShelfPilot UI tests.

---

## 1. Prefer `data-testid`

Add stable hooks in React components as automation lands. Pattern:

```jsx
<button type="button" data-testid="layout-create-open">New layout</button>
```

Naming:

```
{area}-{element}-{action?}
```

Examples:

| Test ID | Element |
|---------|---------|
| `login-email` | Email input |
| `login-password` | Password input |
| `login-role` | Role select |
| `login-submit` | Sign in |
| `nav-layouts` | Header nav Layouts |
| `nav-catalog` | Header nav Products |
| `nav-dashboard` | Header nav Dashboard |
| `nav-admin` | Header nav Admin |
| `layout-create-open` | Open create modal |
| `layout-create-name` | Store name |
| `layout-create-length` | Length (m) |
| `layout-create-width` | Width (m) |
| `layout-create-height` | Height (m) |
| `layout-create-submit` | Create layout |
| `layout-card-{id}` | Portfolio card |
| `smart-generate-open` | Open Smart Generate |
| `smart-generate-run` | Run smart generate |
| `smart-generate-min-aisle` | Min aisle input |
| `arrangement-panel` | Shelf arrangement & volume panel |
| `arrangement-accept` | Accept arrangement (unlock allocation) |
| `arrangement-fill-on-accept` | Optional auto-fill planogram checkbox |
| `arrangement-reopen` | Reopen summary after accept |
| `arrangement-pending-banner` | Must-accept warning |
| `arrangement-accepted-banner` | Accepted confirmation |
| `arrangement-total-shelves` | KPI: total shelves |
| `arrangement-layout-summary` | Layout summary list |
| `editor-violations` | Violations / alerts region |
| `catalog-product-list` | Product list root |
| `catalog-product-create` | New product |
| `dashboard-widgets` | Widget board root |

Until hooks exist, Playwright may use **role + accessible name** (`getByRole('button', { name: /create layout/i })`). Convert to `data-testid` when a test flakes twice.

**Avoid:** CSS class hashes, deep DOM trees, XPath, text that changes with i18n unless intentional.

---

## 2. Page Object Model (POM)

Keep selectors in page classes; specs stay readable:

```js
// pages/LoginPage.js
export class LoginPage {
  constructor(page) {
    this.page = page;
  }
  async goto() {
    await this.page.goto("/");
  }
  async login(email, password, role = "Designer") {
    await this.page.getByTestId("login-email").fill(email);
    await this.page.getByTestId("login-password").fill(password);
    await this.page.getByTestId("login-role").selectOption(role);
    await this.page.getByTestId("login-submit").click();
  }
}
```

Specs:

```js
test("@smoke Designer can log in", async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login("designer@shelfpilot.local", "password", "Designer");
  await expect(page.getByTestId("nav-layouts")).toBeVisible();
});
```

---

## 3. Auth fixture

Centralize login:

```js
// fixtures/auth.js
export async function loginAs(page, role = "Designer") {
  const users = {
    Designer: "designer@shelfpilot.local",
    Approver: "approver@shelfpilot.local",
    Viewer: "viewer@shelfpilot.local",
    Admin: "admin@shelfpilot.local",
  };
  // … fill form or set storage from API token if UI bootstrap supports it
}
```

Prefer **UI login** for smoke authenticity. Optional: API login + `localStorage` seed if session format is documented and stable.

---

## 4. Waits

- Prefer Playwright auto-waiting (`expect(locator).toBeVisible()`).
- Use `page.waitForResponse` for autogenerate:

```js
const [res] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/autogenerate") && r.ok()),
  page.getByTestId("smart-generate-run").click(),
]);
```

- Do **not** use fixed `waitForTimeout` except as last resort (&lt; 1s).

---

## 5. Data isolation

```js
const name = `E2E Layout ${Date.now()}`;
```

Never delete the seeded `Demo Hypermarket — Generated` unless a dedicated reset job recreates it.

For destructive catalog tests, create then delete via UI or API helper.

---

## 6. Assertions that match product rules

| Area | Assert |
|------|--------|
| Create layout | Labels Length / Width / Height present |
| Smart Generate (hypermarket) | No violation text matching `/width .* < min/i` |
| Aisle compliance | Generated aisle widths ≥ store config min |
| RBAC Viewer | Autogenerate control disabled or API 403 when forced |
| Analytics | Widget board visible; key KPI not `NaN` |

---

## 7. Console / page errors

In smoke:

```js
page.on("pageerror", (err) => {
  throw err;
});
```

Ignore known benign third-party warnings via allowlist if required (document in suite).

---

## 8. 2D canvas & WebGL

- Assert **side effects** (DOM badges, counts, toasts, API responses).
- Do not click raw canvas coordinates unless a documented hit-test helper exists.
- 3D: assert container `canvas` exists and no `pageerror`.

---

## 9. Tagging

```js
test("@smoke @critical create layout with Length Width Height", async ({ page }) => {
  // …
});
```

CI: `--grep @smoke`  
Nightly: no grep or `--grep @critical`

---

## 10. Adding testids (implementation checklist)

When implementing Phase A/B, prioritize hooks on:

1. Login form  
2. Header nav  
3. Layout create modal (Length/Width/Height fields)  
4. Smart Generate open/run  
5. Violations / alert banner region  
6. Catalog list + create  

Track additions in PRs that land E2E suites.
