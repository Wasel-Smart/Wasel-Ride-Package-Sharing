import { device, element, by, expect } from 'detox';

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
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('packages-tab')).tap();
    await waitFor(element(by.id('packages-screen'))).toBeVisible().withTimeout(5000);
    await expect(element(by.id('new-package-button'))).toBeVisible();
  });

  it('opens package creation form and validates fields', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('packages-tab')).tap();
    await waitFor(element(by.id('packages-screen'))).toBeVisible().withTimeout(5000);
    await element(by.id('new-package-button')).tap();
    await waitFor(element(by.id('package-form-screen'))).toBeVisible().withTimeout(5000);
    await expect(element(by.id('package-pickup-input'))).toBeVisible();
    await expect(element(by.id('package-dropoff-input'))).toBeVisible();
    await expect(element(by.id('package-size-selector'))).toBeVisible();
  });
});
