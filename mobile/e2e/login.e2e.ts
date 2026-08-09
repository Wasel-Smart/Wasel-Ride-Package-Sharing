import { device, expect, element, by, waitFor } from 'detox';

describe('Login Flow', () => {
    beforeAll(async () => {
        await device.launchApp({ newInstance: true });
    });

    beforeEach(async () => {
        await device.reloadReactNative();
    });

    it('should display login screen on app launch', async () => {
        await expect(element(by.id('login-screen'))).toBeVisible();
        await expect(element(by.id('email-input'))).toBeVisible();
        await expect(element(by.id('password-input'))).toBeVisible();
        await expect(element(by.id('login-button'))).toBeVisible();
    });

    it('should allow a user to log in successfully', async () => {
        // Assuming a test user exists in your Supabase setup
        await element(by.id('email-input')).typeText('test@example.com');
        await element(by.id('password-input')).typeText('password123');
        await element(by.id('login-button')).tap();

        // Wait for the home screen to appear after successful login
        await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
        await expect(element(by.id('welcome-message'))).toBeVisible();
        await expect(element(by.id('login-screen'))).toBeNotVisible();
    });
});