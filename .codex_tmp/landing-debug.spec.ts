import { test } from '@playwright/test';

test('inspect landing page', async ({ page }) => {
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    consoleMessages.push(`[${message.type()}] ${message.text()}`);
  });

  page.on('pageerror', (error) => {
    pageErrors.push(String(error));
  });

  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const bodyText = await page.locator('body').innerText().catch(() => '');
  const rootHtml = await page.locator('#root').innerHTML().catch(() => '');
  const headingCount = await page.locator('h1, h2, h3').count();

  console.log('BODY_TEXT_START');
  console.log(bodyText.slice(0, 2000));
  console.log('BODY_TEXT_END');
  console.log(`HEADING_COUNT=${headingCount}`);
  console.log(`ROOT_HTML_START=${rootHtml.slice(0, 2000)}`);
  console.log('ROOT_HTML_END');
  console.log(`CONSOLE_COUNT=${consoleMessages.length}`);
  console.log(consoleMessages.join('\n'));
  console.log(`PAGEERROR_COUNT=${pageErrors.length}`);
  console.log(pageErrors.join('\n'));
});
