import { expect, test } from '@playwright/test';
import { gotoAuthedRoute } from '../../e2e/helpers/session';

const LANDING_VISUAL_PROJECTS = new Set([
  'chromium-desktop',
]);

const FIND_RIDE_VISUAL_PROJECTS = new Set([
  'chromium-desktop',
]);

const SETTINGS_VISUAL_PROJECTS = new Set([
  'chromium-desktop',
]);

async function prepareVisualState(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
) {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    try {
      if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
        return;
      }

      window.localStorage.setItem('wasel-language', 'en');
      window.localStorage.setItem('wasel-theme', 'light');
      window.localStorage.setItem(
        'wasel.settings.display',
        JSON.stringify({
          direction: 'ltr',
          language: 'en',
          theme: 'light',
          currency: 'JOD',
        }),
      );
    } catch {}
  });
}

async function waitForSnapshotSurface(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
) {
  await expect(page.locator('main')).toBeVisible();
  await page.waitForFunction(() => {
    const main = document.querySelector('main');
    if (!(main instanceof HTMLElement)) {
      return false;
    }

    return main.innerText.replace(/\s+/g, ' ').trim().length > 20;
  });
}

async function expectFullPageSnapshot(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  route: string,
  viewport: { width: number; height: number },
  snapshotName: string,
  options?: {
    clip?: { x: number; y: number; width: number; height: number };
    maxDiffPixels?: number;
    requiresAuth?: boolean;
  },
) {
  await prepareVisualState(page);
  await page.setViewportSize(viewport);
  if (options?.requiresAuth) {
    await gotoAuthedRoute(page, route, { timeout: 60_000 });
  } else {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
  }
  await waitForSnapshotSurface(page);
  await page.evaluate(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  });
  await page.waitForTimeout(250);
  await expect(page).toHaveScreenshot(snapshotName, {
    animations: 'disabled',
    caret: 'hide',
    clip: options?.clip,
    fullPage: !options?.clip,
    maxDiffPixels: options?.maxDiffPixels,
    timeout: 60_000,
  });
}

test.describe('Visual regression', () => {
  test('landing matches the Wasel redesign shell', async ({ page }, testInfo) => {
    test.slow();
    test.skip(
      !LANDING_VISUAL_PROJECTS.has(testInfo.project.name),
      `Landing snapshots are not maintained for ${testInfo.project.name}.`,
    );
    await expectFullPageSnapshot(page, '/', { width: 1440, height: 1200 }, 'landing-page.png');
  });

  test('find ride matches the shared system', async ({ page }, testInfo) => {
    test.slow();
    test.skip(
      !FIND_RIDE_VISUAL_PROJECTS.has(testInfo.project.name),
      `Find Ride snapshots are only maintained for ${Array.from(FIND_RIDE_VISUAL_PROJECTS).join(', ')}.`,
    );
    await expectFullPageSnapshot(
      page,
      '/app/find-ride',
      { width: 1440, height: 1180 },
      'find-ride-page.png',
      {
        clip: {
          x: 0,
          y: 0,
          width: 1440,
          height: 1180,
        },
        maxDiffPixels: 150,
        requiresAuth: true,
      },
    );
  });

  test('settings matches the shared system', async ({ page }, testInfo) => {
    test.slow();
    test.skip(
      !SETTINGS_VISUAL_PROJECTS.has(testInfo.project.name),
      `Settings snapshots are not maintained for ${testInfo.project.name}.`,
    );
    await expectFullPageSnapshot(
      page,
      '/app/settings',
      { width: 1440, height: 1260 },
      'settings-page.png',
      {
        clip: {
          x: 0,
          y: 0,
          width: 1440,
          height: 1260,
        },
        requiresAuth: true,
      },
    );
  });
});
