import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? '4173');
const baseURL = `http://127.0.0.1:${port}`;

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
    trace: 'retain-on-failure',
    screenshot: {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    },
  },
  webServer: {
    command: 'node scripts/start-playwright-dev.mjs',
    url: baseURL,
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
