import { device, element, by, expect as detoxExpect } from 'detox';

describe('Authentication Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display welcome screen on first launch', async () => {
    await detoxExpect(element(by.id('welcome-screen'))).toBeVisible();
    await detoxExpect(element(by.text('Wasel'))).toBeVisible();
  });

  it('should navigate to sign in screen', async () => {
    await element(by.id('sign-in-button')).tap();
    await detoxExpect(element(by.id('sign-in-screen'))).toBeVisible();
    await detoxExpect(element(by.id('email-input'))).toBeVisible();
    await detoxExpect(element(by.id('password-input'))).toBeVisible();
  });

  it('should show validation errors for invalid credentials', async () => {
    await element(by.id('sign-in-button')).tap();
    
    // Try to sign in without filling fields
    await element(by.id('submit-button')).tap();
    await detoxExpect(element(by.text('Email is required'))).toBeVisible();
    await detoxExpect(element(by.text('Password is required'))).toBeVisible();
  });

  it('should sign in with valid credentials', async () => {
    await element(by.id('sign-in-button')).tap();
    
    // Enter test credentials
    await element(by.id('email-input')).typeText('test@wasel.jo');
    await element(by.id('password-input')).typeText('TestPass123!');
    
    // Submit form
    await element(by.id('submit-button')).tap();
    
    // Wait for home screen
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
    await detoxExpect(element(by.id('user-greeting'))).toBeVisible();
  });

  it('should persist session after app restart', async () => {
    // Sign in first
    await element(by.id('sign-in-button')).tap();
    await element(by.id('email-input')).typeText('test@wasel.jo');
    await element(by.id('password-input')).typeText('TestPass123!');
    await element(by.id('submit-button')).tap();
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
    
    // Restart app
    await device.terminateApp();
    await device.launchApp({ newInstance: false });
    
    // Should still be logged in
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should sign out successfully', async () => {
    // Sign in first
    await element(by.id('sign-in-button')).tap();
    await element(by.id('email-input')).typeText('test@wasel.jo');
    await element(by.id('password-input')).typeText('TestPass123!');
    await element(by.id('submit-button')).tap();
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
    
    // Navigate to profile
    await element(by.id('profile-tab')).tap();
    await detoxExpect(element(by.id('profile-screen'))).toBeVisible();
    
    // Sign out
    await element(by.id('sign-out-button')).tap();
    
    // Should return to welcome screen
    await detoxExpect(element(by.id('welcome-screen'))).toBeVisible();
  });

  it('should navigate to sign up screen', async () => {
    await element(by.id('sign-up-button')).tap();
    await detoxExpect(element(by.id('sign-up-screen'))).toBeVisible();
    await detoxExpect(element(by.id('name-input'))).toBeVisible();
    await detoxExpect(element(by.id('email-input'))).toBeVisible();
    await detoxExpect(element(by.id('password-input'))).toBeVisible();
  });

  it('should create new account', async () => {
    await element(by.id('sign-up-button')).tap();
    
    // Fill registration form
    await element(by.id('name-input')).typeText('Test User');
    await element(by.id('email-input')).typeText(`test-${Date.now()}@wasel.jo`);
    await element(by.id('password-input')).typeText('TestPass123!');
    await element(by.id('password-confirm-input')).typeText('TestPass123!');
    
    // Submit
    await element(by.id('submit-button')).tap();
    
    // Should navigate to verification or home screen
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
