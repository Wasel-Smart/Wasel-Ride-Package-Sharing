import { device, element, by, expect, waitFor } from 'detox';

// NOTE: Previously asserted `login-button` (real id: `sign-in-button`),
// `welcome-message` (does not exist on HomeScreen), `quick-link-trips` /
// `trips-screen` (HomeScreen has no "trips" quick action — its quick actions
// are AdvancedSearch, Packages, and Driver), and `seats-selector` (real id:
// `seats-input`). `quick-link-safety` also didn't exist — the real button is
// `home-safety-center`. Rewritten to match AppNavigator / HomeScreen /
// RideRequestScreen / SafetyScreen / WalletScreen as they actually exist.

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
    await element(by.id('sign-in-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
  });

  it('opens ride request via the Rides tab', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('sign-in-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('rides-tab')).tap();
    await waitFor(element(by.id('ride-request-screen'))).toBeVisible().withTimeout(5000);
    await expect(element(by.id('origin-input'))).toBeVisible();
    await expect(element(by.id('destination-input'))).toBeVisible();
    await expect(element(by.id('seats-input'))).toBeVisible();
  });

  it('navigates to safety center and validates SOS button', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('sign-in-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('home-safety-center')).tap();
    await waitFor(element(by.id('safety-screen'))).toBeVisible().withTimeout(5000);
    await expect(element(by.id('sos-button'))).toBeVisible();
  });

  it('opens wallet and validates balance surface', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('sign-in-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);

    await element(by.id('wallet-tab')).tap();
    await waitFor(element(by.id('wallet-screen'))).toBeVisible().withTimeout(5000);
    await expect(element(by.id('wallet-balance'))).toBeVisible();
  });
});
