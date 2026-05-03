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
  const metrics = await page.evaluate(() => {
    const labels = [
      'Every action should feel like the same product.',
      'The page explains the system in one pass.',
      'Specific routes make the product feel real.',
    ];

    return {
      innerHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      sections: labels.map((label) => {
        const node = Array.from(document.querySelectorAll('h2')).find(
          (element) => element.textContent?.trim() === label,
        ) as HTMLElement | undefined;

        if (!node) {
          return { label, found: false };
        }

        const rect = node.getBoundingClientRect();
        const styles = window.getComputedStyle(node);

        return {
          label,
          found: true,
          top: rect.top + window.scrollY,
          height: rect.height,
          opacity: styles.opacity,
          color: styles.color,
        };
      }),
    };
  });

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
  console.log(`METRICS=${JSON.stringify(metrics)}`);
  await page.screenshot({
    path: 'review-screenshots/landing-debug-from-test.png',
    fullPage: true,
  });
});
