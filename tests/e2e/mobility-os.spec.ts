import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test.beforeEach(async ({ page }) => {
  await seedDemoSession(page);
});

function extractSeatAvailability(text: string): number {
  const match = text.match(/(\d+)\s+seats/i);
  if (!match) {
    throw new Error(`Could not parse seats from: ${text}`);
  }
  return Number(match[1]);
}

test('mobility os renders a corridor book and accepts a capacity booking', async ({ page }) => {
  await page.goto('/app/mobility-os', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  await expect(page.getByRole('heading', { name: /corridor capacity exchange for jordan/i })).toBeVisible();
  await expect(page.getByTestId('mobility-os-runtime-status')).toContainText(
    /(server-backed stream|local fallback runtime)/i,
  );
  await expect(page.getByTestId('mobility-os-selected-instrument')).toContainText(/.+->.+/i);
  await expect(page.getByText(/recent corridor events/i)).toHaveCount(0);
  await expect(page.getByText(/business model/i)).toHaveCount(0);
  await expect(page.getByText(/api and websocket shape/i)).toHaveCount(0);
  await expect(page.getByText(/seriousness, pattern, and operating posture/i)).toHaveCount(0);

  const availability = page.getByTestId('mobility-os-selected-availability');
  const seatsBefore = extractSeatAvailability(await availability.innerText());
  const submit = page.getByTestId('mobility-os-booking-submit');
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect
    .poll(async () => extractSeatAvailability(await availability.innerText()), {
      timeout: 10_000,
    })
    .toBe(Math.max(0, seatsBefore - 1));
  await expect(page.getByTestId('mobility-os-runtime-chip')).toContainText(
    /(server-backed stream|local fallback runtime)/i,
  );
});
