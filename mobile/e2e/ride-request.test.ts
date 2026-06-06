import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Ride Request Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
    
    // Sign in before each test
    await element(by.id('sign-in-button')).tap();
    await element(by.id('email-input')).typeText('test@wasel.jo');
    await element(by.id('password-input')).typeText('TestPass123!');
    await element(by.id('submit-button')).tap();
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should navigate to ride request screen', async () => {
    await element(by.id('request-ride-button')).tap();
    await detoxExpect(element(by.id('ride-request-screen'))).toBeVisible();
    await detoxExpect(element(by.id('origin-input'))).toBeVisible();
    await detoxExpect(element(by.id('destination-input'))).toBeVisible();
  });

  it('should fill ride request form', async () => {
    await element(by.id('request-ride-button')).tap();
    
    // Enter origin
    await element(by.id('origin-input')).tap();
    await element(by.id('origin-input')).typeText('Downtown Amman');
    
    // Enter destination
    await element(by.id('destination-input')).tap();
    await element(by.id('destination-input')).typeText('Abdali');
    
    // Select number of seats
    await element(by.id('seats-input')).tap();
    await element(by.text('2')).tap();
    
    // Verify form is filled
    await detoxExpect(element(by.text('Downtown Amman'))).toBeVisible();
    await detoxExpect(element(by.text('Abdali'))).toBeVisible();
  });

  it('should submit ride request successfully', async () => {
    await element(by.id('request-ride-button')).tap();
    
    // Fill form
    await element(by.id('origin-input')).typeText('Downtown Amman');
    await element(by.id('destination-input')).typeText('Abdali');
    await element(by.id('seats-input')).tap();
    await element(by.text('2')).tap();
    
    // Submit request
    await element(by.id('submit-request-button')).tap();
    
    // Should show searching/matching screen
    await waitFor(element(by.id('matching-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    await detoxExpect(element(by.text(/searching|matching/i))).toBeVisible();
  });

  it('should display ride details after matching', async () => {
    await element(by.id('request-ride-button')).tap();
    
    // Fill and submit form
    await element(by.id('origin-input')).typeText('Downtown Amman');
    await element(by.id('destination-input')).typeText('Abdali');
    await element(by.id('submit-request-button')).tap();
    
    // Wait for match (or timeout)
    await waitFor(element(by.id('ride-details-screen')))
      .toBeVisible()
      .withTimeout(30000);
    
    // Verify ride details are shown
    await detoxExpect(element(by.id('driver-name'))).toBeVisible();
    await detoxExpect(element(by.id('vehicle-info'))).toBeVisible();
    await detoxExpect(element(by.id('fare-amount'))).toBeVisible();
  });

  it('should cancel ride request', async () => {
    await element(by.id('request-ride-button')).tap();
    
    // Fill and submit form
    await element(by.id('origin-input')).typeText('Downtown Amman');
    await element(by.id('destination-input')).typeText('Abdali');
    await element(by.id('submit-request-button')).tap();
    
    // Wait for matching screen
    await waitFor(element(by.id('matching-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Cancel request
    await element(by.id('cancel-request-button')).tap();
    
    // Confirm cancellation
    await element(by.id('confirm-cancel-button')).tap();
    
    // Should return to home screen
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should view ride history', async () => {
    // Navigate to rides tab
    await element(by.id('rides-tab')).tap();
    await detoxExpect(element(by.id('rides-screen'))).toBeVisible();
    
    // View history
    await element(by.id('history-tab')).tap();
    await detoxExpect(element(by.id('ride-history-list'))).toBeVisible();
    
    // Should display past rides
    await detoxExpect(element(by.id('ride-history-item')).atIndex(0)).toBeVisible();
  });

  it('should display map with driver location', async () => {
    await element(by.id('request-ride-button')).tap();
    
    // Submit ride request
    await element(by.id('origin-input')).typeText('Downtown Amman');
    await element(by.id('destination-input')).typeText('Abdali');
    await element(by.id('submit-request-button')).tap();
    
    // Wait for match
    await waitFor(element(by.id('ride-details-screen')))
      .toBeVisible()
      .withTimeout(30000);
    
    // Map should be visible
    await detoxExpect(element(by.id('ride-map'))).toBeVisible();
    await detoxExpect(element(by.id('driver-marker'))).toBeVisible();
  });

  it('should rate ride after completion', async () => {
    // Assuming we have a completed ride
    await element(by.id('rides-tab')).tap();
    await element(by.id('history-tab')).tap();
    
    // Tap on first completed ride
    await element(by.id('ride-history-item')).atIndex(0).tap();
    
    // Should show ride details
    await detoxExpect(element(by.id('ride-detail-screen'))).toBeVisible();
    
    // Tap rate ride button
    await element(by.id('rate-ride-button')).tap();
    
    // Select 5 stars
    await element(by.id('star-5')).tap();
    
    // Add feedback
    await element(by.id('feedback-input')).typeText('Great driver!');
    
    // Submit rating
    await element(by.id('submit-rating-button')).tap();
    
    // Should show success message
    await detoxExpect(element(by.text(/rating submitted|thank you/i))).toBeVisible();
  });
});
