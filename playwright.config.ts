import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/*.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: true,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // Bilingual locale coverage (Jordan / English fallback)
    locale: 'en-JO',
    timezoneId: 'Asia/Amman',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  webServer: {
    command: 'node scripts/playwright-web-server.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !isCI,
    timeout: 300_000,
    stderr: 'pipe',
  },

  projects: [
    // ── Desktop ───────────────────────────────────────────────────────────────
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
    },

    // ── Mobile / RTL ─────────────────────────────────────────────────────────
    {
      name: 'mobile-android-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-ios-safari',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'tablet-ipad',
      use: { ...devices['iPad (gen 7)'] },
    },

    // ── RTL / Arabic locale ──────────────────────────────────────────────────
    {
      name: 'rtl-arabic-mobile',
      use: { ...devices['Pixel 7'], locale: 'ar-JO' },
      testMatch: ['**/rtl-arabic.spec.ts'],
    },
  ],
});
