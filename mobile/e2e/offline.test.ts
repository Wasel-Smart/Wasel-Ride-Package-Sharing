import { by, device, element, expect as detoxExpect } from 'detox';

describe('Offline and package surfaces', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('shows the connectivity banner', async () => {
    await detoxExpect(element(by.id('online-indicator'))).toBeVisible();
  });

  it('renders the package request form with stable iOS automation IDs', async () => {
    await element(by.id('packages-tab')).tap();

    await detoxExpect(element(by.id('packages-screen'))).toBeVisible();
    await detoxExpect(element(by.id('package-pickup-input'))).toBeVisible();
    await detoxExpect(element(by.id('package-dropoff-input'))).toBeVisible();
    await detoxExpect(element(by.id('package-weight-input'))).toBeVisible();
    await detoxExpect(element(by.id('submit-package-button'))).toBeVisible();
  });
});
