import { device, element, by, expect, waitFor } from 'detox';

describe('Wasel Auth Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { location: 'always', notifications: 'YES', camera: 'YES' },
      newInstance: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('renders sign-in screen with all auth options', async () => {
    await expect(element(by.id('sign-in-screen'))).toBeVisible();
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
    await expect(element(by.id('login-button'))).toBeVisible();
    await expect(element(by.id('google-sign-in-button'))).toBeVisible();
    await expect(element(by.id('facebook-sign-in-button'))).toBeVisible();
    await expect(element(by.id('phone-sign-in-button'))).toBeVisible();
  });

  it('navigates to sign-up and validates fields', async () => {
    await element(by.id('sign-up-link')).tap();
    await expect(element(by.id('sign-up-screen'))).toBeVisible();
    await expect(element(by.id('sign-up-name'))).toBeVisible();
    await expect(element(by.id('sign-up-email'))).toBeVisible();
    await expect(element(by.id('sign-up-password'))).toBeVisible();
    await expect(element(by.id('sign-up-phone'))).toBeVisible();
  });

  it('navigates to forgot password and validates fields', async () => {
    await element(by.id('forgot-password-link')).tap();
    await expect(element(by.id('forgot-password-screen'))).toBeVisible();
    await expect(element(by.id('forgot-email'))).toBeVisible();
    await expect(element(by.id('forgot-reset-button'))).toBeVisible();
  });

  it('navigates to phone auth screen', async () => {
    await element(by.id('phone-sign-in-button')).tap();
    await expect(element(by.id('phone-auth-screen'))).toBeVisible();
  });

  it('shows biometric option when available', async () => {
    await expect(element(by.id('biometric-sign-in-button'))).toBeVisible();
  });
});
