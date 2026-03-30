import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration.
 * Test specs live in ./e2e/ (NOT ./src/tests/e2e — that dir didn't exist).
 * Run:  npx playwright test
 * UI:   npx playwright test --ui
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },
  webServer: {
    command: 'cmd /c npm run build && npx vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'safari',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
