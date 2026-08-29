import { device, element, by, expect } from 'detox';

// NOTE: This spec was previously asserting against testIDs and screens that do
// not exist anywhere in mobile/src (e.g. `login-button`, a dedicated
// `phone-auth-screen` reachable from SignInScreen). It could never have passed
// against a real build. Rewritten to match the actual SignInScreen /
// SignUpScreen / ForgotPasswordScreen implementations.

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
    await expect(element(by.id('sign-in-button'))).toBeVisible();
    await expect(element(by.id('google-sign-in-button'))).toBeVisible();
    await expect(element(by.id('facebook-sign-in-button'))).toBeVisible();
    await expect(element(by.id('phone-sign-in-button'))).toBeVisible();
  });

  it('navigates to sign-up and validates fields', async () => {
    await element(by.id('sign-up-link')).tap();
    await waitFor(element(by.id('sign-up-screen'))).toBeVisible().withTimeout(5000);
    await expect(element(by.id('sign-up-name'))).toBeVisible();
    await expect(element(by.id('sign-up-email'))).toBeVisible();
    await expect(element(by.id('sign-up-password'))).toBeVisible();
    await expect(element(by.id('sign-up-phone'))).toBeVisible();
  });

  it('navigates to forgot password and validates fields', async () => {
    await element(by.id('forgot-password-link')).tap();
    await waitFor(element(by.id('forgot-password-screen'))).toBeVisible().withTimeout(5000);
    await expect(element(by.id('forgot-email'))).toBeVisible();
    await expect(element(by.id('forgot-reset-button'))).toBeVisible();
  });

  it('shows a validation error when submitting phone sign-in without a number', async () => {
    // SignInScreen's phone button calls signInWithPhone directly — there is no
    // separate phone-auth-screen reachable from here. This asserts the real
    // inline validation behaviour instead of a screen that doesn't exist.
    await element(by.id('phone-sign-in-button')).tap();
    await expect(element(by.id('sign-in-error'))).toBeVisible();
  });

  // Biometric sign-in only renders when biometricAuth.isSupported() resolves
  // true on-device, so it cannot be asserted unconditionally in CI/simulator
  // runs without device-level biometric enrollment. Left out rather than
  // asserted as always-visible, which was the previous (false) claim.
});
