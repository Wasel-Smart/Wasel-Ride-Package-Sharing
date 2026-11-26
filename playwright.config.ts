import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? '4173');
const localURL = `http://127.0.0.1:${port}`;
// Set PLAYWRIGHT_BASE_URL to run tests against a live deployment, e.g.:
//   PLAYWRIGHT_BASE_URL=https://wasel14.online npx playwright test
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? localURL;
const isRemote = !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/*.spec.ts'],
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  expect: {
    timeout: 30_000,
  },
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: 'retain-on-failure',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
  },
  // Skip local dev server when pointing at a remote deployment.
  webServer: isRemote ? undefined : {
    command: 'node scripts/start-playwright-dev.mjs',
    url: localURL,
    // A stale local dev server can silently test an older bundle. Reuse only
    // when explicitly requested for interactive debugging.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
