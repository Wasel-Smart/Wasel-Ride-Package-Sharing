import { device, element, by, expect } from 'detox';

describe('Wasel mobile smoke flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { location: 'always', notifications: 'YES', camera: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('renders the home command center', async () => {
    await expect(element(by.id('home-screen'))).toBeVisible();
    await expect(element(by.id('mobile-command-center'))).toBeVisible();
  });

  it('surfaces quick links from the dashboard', async () => {
    await expect(element(by.id('quick-link-trips'))).toBeVisible();
    await expect(element(by.id('quick-link-safety'))).toBeVisible();
  });

  it('opens the trip history from the dashboard', async () => {
    await element(by.id('quick-link-trips')).tap();
    await expect(element(by.id('trips-screen'))).toBeVisible();
  });

  it('opens the safety center from the dashboard', async () => {
    await element(by.id('quick-link-safety')).tap();
    await expect(element(by.id('safety-screen'))).toBeVisible();
    await expect(element(by.id('sos-button'))).toBeVisible();
  });
});
