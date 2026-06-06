import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Offline Mode', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
    
    // Sign in before each test
    await element(by.id('sign-in-button')).tap();
    await element(by.id('email-input')).typeText('test@wasel.jo');
    await element(by.id('password-input')).typeText('TestPass123!');
    await element(by.id('submit-button')).tap();
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should display offline indicator when network is disconnected', async () => {
    // Disable network
    await device.disableSynchronization();
    await device.setURLBlacklist(['.*']);
    
    // Wait for offline indicator
    await waitFor(element(by.id('offline-indicator')))
      .toBeVisible()
      .withTimeout(5000);
    
    await detoxExpect(element(by.text(/offline|no connection/i))).toBeVisible();
    
    // Re-enable network
    await device.setURLBlacklist([]);
    await device.enableSynchronization();
  });

  it('should queue ride request when offline', async () => {
    // Disable network
    await device.setURLBlacklist(['.*']);
    await waitFor(element(by.id('offline-indicator'))).toBeVisible().withTimeout(5000);
    
    // Try to request a ride
    await element(by.id('request-ride-button')).tap();
    await element(by.id('origin-input')).typeText('Downtown Amman');
    await element(by.id('destination-input')).typeText('Abdali');
    await element(by.id('submit-request-button')).tap();
    
    // Should show queued message
    await detoxExpect(element(by.text(/queued|will sync/i))).toBeVisible();
    
    // Navigate to settings or sync screen
    await element(by.id('profile-tab')).tap();
    await element(by.id('settings-button')).tap();
    
    // Should show pending actions
    await detoxExpect(element(by.id('offline-queue-indicator'))).toBeVisible();
    await detoxExpect(element(by.text(/1.*pending/i))).toBeVisible();
    
    // Re-enable network
    await device.setURLBlacklist([]);
  });

  it('should sync queued actions when back online', async () => {
    // Disable network and queue an action
    await device.setURLBlacklist(['.*']);
    await waitFor(element(by.id('offline-indicator'))).toBeVisible().withTimeout(5000);
    
    await element(by.id('request-ride-button')).tap();
    await element(by.id('origin-input')).typeText('Downtown Amman');
    await element(by.id('destination-input')).typeText('Abdali');
    await element(by.id('submit-request-button')).tap();
    
    // Re-enable network
    await device.setURLBlacklist([]);
    await device.enableSynchronization();
    
    // Wait for online indicator
    await waitFor(element(by.id('online-indicator')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Should auto-sync
    await waitFor(element(by.text(/syncing|sync complete/i)))
      .toBeVisible()
      .withTimeout(15000);
    
    // Queue should be empty
    await element(by.id('profile-tab')).tap();
    await element(by.id('settings-button')).tap();
    await detoxExpect(element(by.text(/0.*pending/i))).toBeVisible();
  });

  it('should view cached ride history when offline', async () => {
    // First, load ride history while online
    await element(by.id('rides-tab')).tap();
    await element(by.id('history-tab')).tap();
    await waitFor(element(by.id('ride-history-list'))).toBeVisible().withTimeout(5000);
    
    // Go back to home
    await element(by.id('home-tab')).tap();
    
    // Disable network
    await device.setURLBlacklist(['.*']);
    await waitFor(element(by.id('offline-indicator'))).toBeVisible().withTimeout(5000);
    
    // View history again - should load from cache
    await element(by.id('rides-tab')).tap();
    await element(by.id('history-tab')).tap();
    
    // Should display cached rides
    await detoxExpect(element(by.id('ride-history-list'))).toBeVisible();
    await detoxExpect(element(by.id('ride-history-item')).atIndex(0)).toBeVisible();
    
    // Should show cache indicator
    await detoxExpect(element(by.text(/cached|offline data/i))).toBeVisible();
    
    // Re-enable network
    await device.setURLBlacklist([]);
  });

  it('should manually trigger sync from settings', async () => {
    // Disable network and queue an action
    await device.setURLBlacklist(['.*']);
    await waitFor(element(by.id('offline-indicator'))).toBeVisible().withTimeout(5000);
    
    await element(by.id('request-ride-button')).tap();
    await element(by.id('origin-input')).typeText('Downtown Amman');
    await element(by.id('destination-input')).typeText('Abdali');
    await element(by.id('submit-request-button')).tap();
    
    // Re-enable network
    await device.setURLBlacklist([]);
    await device.enableSynchronization();
    
    // Navigate to settings
    await element(by.id('profile-tab')).tap();
    await element(by.id('settings-button')).tap();
    
    // Manually trigger sync
    await element(by.id('sync-now-button')).tap();
    
    // Should show syncing indicator
    await detoxExpect(element(by.text(/syncing/i))).toBeVisible();
    
    // Wait for completion
    await waitFor(element(by.text(/sync complete/i)))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should clear offline cache from settings', async () => {
    // Navigate to settings
    await element(by.id('profile-tab')).tap();
    await element(by.id('settings-button')).tap();
    
    // Clear cache
    await element(by.id('clear-cache-button')).tap();
    
    // Confirm
    await element(by.id('confirm-clear-button')).tap();
    
    // Should show success message
    await detoxExpect(element(by.text(/cache cleared/i))).toBeVisible();
    
    // Cache size should be 0
    await detoxExpect(element(by.text(/0.*cached items/i))).toBeVisible();
  });

  it('should show offline banner with retry option', async () => {
    // Disable network
    await device.setURLBlacklist(['.*']);
    await waitFor(element(by.id('offline-indicator'))).toBeVisible().withTimeout(5000);
    
    // Try an action that requires network
    await element(by.id('request-ride-button')).tap();
    await element(by.id('origin-input')).typeText('Downtown Amman');
    await element(by.id('destination-input')).typeText('Abdali');
    await element(by.id('submit-request-button')).tap();
    
    // Should show offline banner
    await detoxExpect(element(by.id('offline-banner'))).toBeVisible();
    await detoxExpect(element(by.id('retry-button'))).toBeVisible();
    
    // Re-enable network
    await device.setURLBlacklist([]);
    
    // Tap retry
    await element(by.id('retry-button')).tap();
    
    // Should attempt to sync
    await waitFor(element(by.text(/syncing/i)))
      .toBeVisible()
      .withTimeout(5000);
    
    await device.enableSynchronization();
  });
});
