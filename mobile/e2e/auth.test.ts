import { by, device, element, expect as detoxExpect } from 'detox';

describe('Wasel app shell', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('opens the home surface', async () => {
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
    await detoxExpect(element(by.text('Wasel mobile'))).toBeVisible();
  });

  it('shows profile state without requiring a backend session', async () => {
    await element(by.id('profile-tab')).tap();
    await detoxExpect(element(by.id('profile-screen'))).toBeVisible();
    await detoxExpect(element(by.text(/Guest mode|Signed in/))).toBeVisible();
  });
});
