/**
 * @typedef {import('detox').DetoxCircus.Types} DetoxTypes
 */

describe('Wasel Mobile E2E Tests', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Authentication Flow', () => {
    it('should show sign-in screen on launch', async () => {
      await expect(element(by.id('sign-in-screen'))).toBeVisible();
      await expect(element(by.id('email-input'))).toBeVisible();
      await expect(element(by.id('password-input'))).toBeVisible();
    });

    it('should show validation error for empty fields', async () => {
      await element(by.id('sign-in-button')).tap();
      await expect(element(by.text('Missing details'))).toBeVisible();
    });

    it('should sign in successfully with valid credentials', async () => {
      await element(by.id('email-input')).typeText('test@wasel.jo');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('sign-in-button')).tap();
      await expect(element(by.id('Home'))).toBeVisible();
    });
  });

  describe('Ride Booking Flow', () => {
    it('should navigate to ride request screen', async () => {
      await element(by.id('Rides')).tap();
      await expect(element(by.id('ride-request-screen'))).toBeVisible();
    });

    it('should request ride with valid inputs', async () => {
      await element(by.id('Where to?')).tap();
      await element(by.id('search-input')).typeText('Rabat St, Amman');
      await element(by.id('confirm-ride-button')).tap();
      await expect(element(by.id('LiveTracking'))).toBeVisible();
    });
  });

  describe('Live Tracking', () => {
    it('should show driver location on map', async () => {
      await element(by.id('LiveTracking')).tap();
      await expect(element(by.id('live-tracking-screen'))).toBeVisible();
      await expect(element(by.id('driver-marker'))).toBeVisible();
      await expect(element(by.text('ETA'))).toBeVisible();
    });

    it('should update ETA in real-time', async () => {
      await device.setStatusBar({ time: new Date() });
      await expect(element(by.id('eta-text'))).toHaveText(expect.stringContaining('min'));
    });
  });

  describe('Payment Flow', () => {
    it('should navigate to wallet screen', async () => {
      await element(by.id('Wallet')).tap();
      await expect(element(by.id('wallet-screen'))).toBeVisible();
    });

    it('should add funds successfully', async () => {
      await element(by.id('Wallet')).tap();
      await element(by.id('topup-button')).tap();
      await expect(element(by.text('Success'))).toBeVisible();
    });
  });

  describe('Offline Mode', () => {
    it('should queue ride request when offline', async () => {
      await device.setNetworkConnection('none');
      await element(by.id('request-ride')).tap();
      await expect(element(by.text('Ride request queued'))).toBeVisible();
    });
  });
});