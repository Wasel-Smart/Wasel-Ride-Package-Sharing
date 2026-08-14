import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

const routes = [
  '/app/my-trips',
  '/app/my-trips?tab=packages',
  '/app/my-trips?tab=buses',
  '/app/offer-ride',
  '/app/packages',
  '/app/bus',
  '/app/mobility-os',
];

function expectArabicInterface(text: string) {
  expect(text).not.toContain('\uFFFD');
  // Wasel is the product name. Every other visible interface word must use Arabic.
  expect(text.replace(/wasel|demo rider|demo|dr/gi, '')).not.toMatch(/[A-Za-z]{2,}/);
}

test.describe('Arabic service surfaces', () => {
  for (const route of routes) {
    test(`${route} exposes its Arabic surface`, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('wasel-language', 'ar'));
      await seedDemoSession(page);
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      const text = await page.locator('body').innerText();
      expectArabicInterface(text);
      // Keep product names and user-generated values out of this guard. These are
      // English interface labels that must never ship on an Arabic service surface.
      expect(text).not.toMatch(
        /\b(?:Routes|Seats|Operators|Exact matches first|Visible now|Best fare|Lowest on screen|Shown now|Refreshing departures|Scheduled|Closed today|Boarding soon|Departing this hour|Later today|Standard|Live operator feed|Official schedule|Next departure today|Keep one calmer alternative visible|Selected departure is currently the clearest fit|Choose two different cities|Live departures loaded|No exact route yet|Support opened|Bus seat confirmed|Bus support opened|Pickup|Schedule|Status|Depart now|Book later|Seat fare|Available on this coach|Try another departure|Reserve seat|No seats left)\b/i,
      );
    });
  }

  test('package tabs remain completely Arabic', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('wasel-language', 'ar'));
    await seedDemoSession(page);
    await page.goto('/app/packages', { waitUntil: 'domcontentloaded' });

    for (const tab of ['تتبع طرد', 'إرجاعات راجع', 'أرسل طرد']) {
      const tabButton = page.getByRole('button', { name: tab, exact: true });
      await expect(tabButton).toBeVisible();
      await tabButton.click();
      await page.waitForTimeout(150);
      expectArabicInterface(await page.locator('body').innerText());
    }
  });
});
