import { defineConfig, devices } from '@playwright/test';

// When PLAYWRIGHT_BASE_URL is set (e.g. in CI against staging), point directly at
// the remote origin and skip the local dev server.
// E.g.:  PLAYWRIGHT_BASE_URL=https://staging.wasel.app npx playwright test
const stagingUrl = process.env.PLAYWRIGHT_BASE_URL;
const port = Number(process.env.PLAYWRIGHT_PORT ?? '4173');
const localBaseURL = `http://127.0.0.1:${port}`;
const baseURL = stagingUrl ?? localBaseURL;

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
  // webServer is only needed for local runs; staging already has a server.
  ...(stagingUrl
    ? {}
    : {
        webServer: {
          command: 'node scripts/start-playwright-dev.mjs',
          url: localBaseURL,
          // A stale local dev server can silently test an older bundle. Reuse only
          // when explicitly requested for interactive debugging.
          reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
          timeout: 120_000,
        },
      }),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
