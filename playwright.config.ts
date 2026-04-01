import { defineConfig, devices } from '@playwright/test';

const useDemoData = process.env.PLAYWRIGHT_USE_DEMO_DATA === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/*.spec.ts'],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `cmd /c "set VITE_ENABLE_DEMO_DATA=${useDemoData ? 'true' : 'false'}&& npm run dev -- --host 127.0.0.1 --port 4173"`,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
