import { device, element, by, expect } from 'detox';

// NOTE: Previously asserted `packages-tab`, `new-package-button`,
// `package-form-screen`, and `package-size-selector` — none of which exist.
// PackagesScreen is a single screen with an inline form (no separate
// "new package" step, no size selector — pickup/dropoff/weight/note fields
// directly on the tab). Rewritten to match the real component.

describe('Wasel Package Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { location: 'always', notifications: 'YES', camera: 'YES' },
      newInstance: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('logs in and opens packages tab', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('sign-in-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('packages-tab')).tap();
    await waitFor(element(by.id('packages-screen'))).toBeVisible().withTimeout(5000);
    await expect(element(by.id('package-pickup-input'))).toBeVisible();
    await expect(element(by.id('package-dropoff-input'))).toBeVisible();
    await expect(element(by.id('package-weight-input'))).toBeVisible();
  });

  it('fills the package form and submits', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('sign-in-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('packages-tab')).tap();
    await waitFor(element(by.id('packages-screen'))).toBeVisible().withTimeout(5000);

    await element(by.id('package-pickup-input')).clearText();
    await element(by.id('package-pickup-input')).typeText('عمّان');
    await element(by.id('package-dropoff-input')).clearText();
    await element(by.id('package-dropoff-input')).typeText('إربد');
    await element(by.id('package-weight-input')).clearText();
    await element(by.id('package-weight-input')).typeText('2');

    await element(by.id('submit-package-button')).tap();
    await waitFor(element(by.id('package-request-result'))).toBeVisible().withTimeout(5000);
  });
});
