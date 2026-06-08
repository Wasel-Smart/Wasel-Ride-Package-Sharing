import { by, device, element, expect as detoxExpect } from 'detox';

describe('Ride request flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
    await element(by.id('rides-tab')).tap();
  });

  it('renders the ride request form with stable iOS automation IDs', async () => {
    await detoxExpect(element(by.id('ride-request-screen'))).toBeVisible();
    await detoxExpect(element(by.id('origin-input'))).toBeVisible();
    await detoxExpect(element(by.id('destination-input'))).toBeVisible();
    await detoxExpect(element(by.id('seats-input'))).toBeVisible();
    await detoxExpect(element(by.id('submit-request-button'))).toBeVisible();
  });

  it('accepts updated corridor details', async () => {
    await element(by.id('origin-input')).replaceText('Downtown Amman');
    await element(by.id('destination-input')).replaceText('Abdali');
    await element(by.id('seats-input')).replaceText('2');

    await detoxExpect(element(by.text('Downtown Amman'))).toBeVisible();
    await detoxExpect(element(by.text('Abdali'))).toBeVisible();
    await detoxExpect(element(by.text('2'))).toBeVisible();
  });
});
