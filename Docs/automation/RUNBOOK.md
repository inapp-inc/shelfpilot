# Playwright Runbook — ShelfPilot

Practical commands once the `codebase/e2e` scaffold exists. Until then, use this as the **target** workflow.

---

## 1. Prerequisites

- Node.js ≥ 22.5
- Docker Desktop (for recommended demo target)
- Git clone of `shelfpilot`

---

## 2. Start the app under test

### Recommended: Docker demo

```bash
cd codebase
npm run docker:rebuild
```

- App: http://localhost:8080  
- API: http://localhost:3001/health  

Wait until health returns OK before running E2E.

### Alternative: local dev

```bash
cd codebase
npm run dev:api
# other terminal
npm run dev:web
```

Set:

```bash
set PLAYWRIGHT_BASE_URL=http://localhost:5173
set PLAYWRIGHT_API_URL=http://localhost:3001
```

(PowerShell: `$env:PLAYWRIGHT_BASE_URL="http://localhost:5173"`)

---

## 3. Install Playwright (first time)

```bash
cd codebase
npm install
npx --workspace=@shelfpilot/e2e playwright install chromium
```

Phase A scaffold is live under `codebase/e2e/`.

---

## 4. Run suites

From `codebase/`:

```bash
npm run test:e2e:smoke          # @smoke only — CI / pre-demo (login live)
npm run test:e2e                # all suites
npm run test:e2e:ui             # Playwright UI mode (debug)
```

Direct equivalents:

```bash
cd codebase/e2e
npx playwright test --grep @smoke
npx playwright test
npx playwright test --ui
npx playwright test --headed --debug
```

---

## 5. Reports & debugging

- HTML report: `npx playwright show-report`
- On failure: open **trace** (`trace.zip`) from the report
- Screenshots: configured `screenshot: 'only-on-failure'`
- Video: optional `video: 'retain-on-failure'` for CI flakes

Common flakes:

| Symptom | Fix |
|---------|-----|
| Timeout on login | Ensure API healthy; increase `actionTimeout` once |
| Empty layout list | Wait for network idle / specific `data-testid` |
| Smart Generate stuck | Assert toast or panel “Generating…” then result |
| 3D blank | Assert container exists; skip pixel asserts |

---

## 6. Pre-demo checklist (manual + smoke)

1. `npm run docker:rebuild`
2. Open http://localhost:8080 — login Designer
3. `npm run test:e2e:smoke` (once available)
4. Spot-check: Demo Hypermarket — Generated → no aisle width violations
5. Create layout labels: Length / Width / Height

---

## 7. CI sketch (GitHub Actions)

```yaml
# illustrative — adapt to repo CI
jobs:
  e2e-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: Start Compose
        working-directory: codebase
        run: docker compose up -d --build
      - name: Wait for health
        run: |
          for i in $(seq 1 60); do
            curl -sf http://localhost:3001/health && exit 0
            sleep 2
          done
          exit 1
      - name: Install Playwright
        working-directory: codebase/e2e
        run: npm ci && npx playwright install --with-deps chromium
      - name: Smoke
        working-directory: codebase/e2e
        run: npx playwright test --grep @smoke
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:8080
          PLAYWRIGHT_API_URL: http://localhost:3001
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: codebase/e2e/playwright-report/
```

Keep **API `npm test`** as the fast PR gate; promote Playwright `@smoke` to required when flake rate is low.

---

## 8. Credentials

See [PLAYWRIGHT_INTEGRATION.md](./PLAYWRIGHT_INTEGRATION.md) §6. Demo only.

---

## 9. Updating docs when suites land

1. Mark rows **Automated** in [COVERAGE_MATRIX.md](./COVERAGE_MATRIX.md)
2. Add suite file names under each module section
3. Update [README.md](./README.md) status from “not checked in yet” to “scaffold live”
