import { device, element, by, expect, waitFor } from 'detox';

describe('Wasel Ride Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { location: 'always', notifications: 'YES', camera: 'YES' },
      newInstance: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('logs in and reaches home screen', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
    await expect(element(by.id('welcome-message'))).toBeVisible();
  });

  it('opens ride request from home quick links', async () => {
    await expect(element(by.id('home-screen'))).toBeVisible();
    await element(by.id('quick-link-trips')).tap();
    await expect(element(by.id('trips-screen'))).toBeVisible();
  });

  it('opens ride request screen and validates form', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('quick-link-trips')).tap();
    await waitFor(element(by.id('ride-request-screen'))).toBeVisible().withTimeout(5000);
    await expect(element(by.id('origin-input'))).toBeVisible();
    await expect(element(by.id('destination-input'))).toBeVisible();
    await expect(element(by.id('seats-selector'))).toBeVisible();
  });

  it('navigates to safety center and validates SOS button', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('quick-link-safety')).tap();
    await expect(element(by.id('safety-screen'))).toBeVisible();
    await expect(element(by.id('sos-button'))).toBeVisible();
  });

  it('opens wallet and validates top-up surface', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('wallet-tab')).tap();
    await waitFor(element(by.id('wallet-screen'))).toBeVisible().withTimeout(5000);
    await expect(element(by.id('wallet-balance'))).toBeVisible();
  });
});
