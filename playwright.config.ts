import { defineConfig, devices } from '@playwright/test';

const useDemoData = process.env.PLAYWRIGHT_USE_DEMO_DATA !== 'false';

const devServerCommand = process.platform === 'win32'
  ? `cmd /c "set VITE_ENABLE_DEMO_DATA=${useDemoData ? 'true' : 'false'}&& npm run dev -- --host 127.0.0.1 --port 4173"`
  : `VITE_ENABLE_DEMO_DATA=${useDemoData ? 'true' : 'false'} npm run dev -- --host 127.0.0.1 --port 4173`;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/*.spec.ts'],
  timeout:        60_000,
  expect:        { timeout: 12_000 },
  fullyParallel:  true,
  retries:        process.env.CI ? 2 : 0,
  workers:        process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  use: {
    baseURL:          'http://127.0.0.1:4173',
    trace:            'retain-on-failure',
    screenshot:       'only-on-failure',
    video:            'retain-on-failure',
    // Bilingual locale coverage (Jordan / English fallback)
    locale:           'en-JO',
    timezoneId:       'Asia/Amman',
    actionTimeout:    10_000,
    navigationTimeout: 20_000,
  },

  webServer: {
    command:             devServerCommand,
    url:                 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout:             120_000,
    stderr:              'pipe',
  },

  projects: [
    // ── Desktop ───────────────────────────────────────────────────────────────
    {
      name: 'chromium-desktop',
      use:  { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'firefox-desktop',
      use:  { ...devices['Desktop Firefox'] },
    },

    // ── Mobile / RTL ─────────────────────────────────────────────────────────
    {
      name: 'mobile-android-chrome',
      use:  { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-ios-safari',
      use:  { ...devices['iPhone 14'] },
    },
    {
      name: 'tablet-ipad',
      use:  { ...devices['iPad (gen 7)'] },
    },

    // ── RTL / Arabic locale ──────────────────────────────────────────────────
    {
      name:     'rtl-arabic-mobile',
      use:      { ...devices['Pixel 7'], locale: 'ar-JO' },
      testMatch: ['**/rtl-arabic.spec.ts'],
    },
  ],
});
