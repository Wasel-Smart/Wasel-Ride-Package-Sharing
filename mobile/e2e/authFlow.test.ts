import { device, element, by, expect } from 'detox';

describe('Wasel Auth Flows', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { location: 'always', notifications: 'YES', camera: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Sign In', () => {
    it('renders the sign in screen', async () => {
      await expect(element(by.id('sign-in-screen'))).toBeVisible();
    });

    it('shows email and password fields', async () => {
      await expect(element(by.id('email-input'))).toBeVisible();
      await expect(element(by.id('password-input'))).toBeVisible();
    });

    it('shows social sign-in buttons', async () => {
      await expect(element(by.id('google-sign-in-button'))).toBeVisible();
      await expect(element(by.id('facebook-sign-in-button'))).toBeVisible();
    });

    it('shows phone sign-in button', async () => {
      await expect(element(by.id('phone-sign-in-button'))).toBeVisible();
    });

    it('shows biometric sign-in button when supported', async () => {
      await expect(element(by.id('biometric-sign-in-button'))).toBeVisible();
    });
  });

  describe('Sign Up', () => {
    it('navigates to sign up screen', async () => {
      await element(by.id('sign-up-link')).tap();
      await expect(element(by.id('sign-up-screen'))).toBeVisible();
    });

    it('shows name, email, password, and phone fields', async () => {
      await expect(element(by.id('sign-up-name'))).toBeVisible();
      await expect(element(by.id('sign-up-email'))).toBeVisible();
      await expect(element(by.id('sign-up-password'))).toBeVisible();
      await expect(element(by.id('sign-up-phone'))).toBeVisible();
    });
  });

  describe('Forgot Password', () => {
    it('navigates to forgot password screen', async () => {
      await element(by.id('forgot-password-link')).tap();
      await expect(element(by.id('forgot-password-screen'))).toBeVisible();
    });

    it('shows email input and reset button', async () => {
      await expect(element(by.id('forgot-email'))).toBeVisible();
      await expect(element(by.id('forgot-reset-button'))).toBeVisible();
    });
  });

  describe('Phone Auth', () => {
    it('navigates to phone auth screen', async () => {
      await element(by.id('phone-sign-in-button')).tap();
      await expect(element(by.id('phone-auth-screen'))).toBeVisible();
    });
  });
});