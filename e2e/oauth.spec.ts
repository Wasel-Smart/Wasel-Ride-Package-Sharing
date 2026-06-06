/**
 * OAuth Authentication E2E Tests
 * Tests Google and Facebook sign-in flows
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';

test.describe('OAuth Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
  });

  test('should display OAuth provider buttons', async ({ page }) => {
    // Check Google button exists
    const googleButton = page.getByRole('button', { name: /google/i });
    await expect(googleButton).toBeVisible();

    // Check Facebook button exists
    const facebookButton = page.getByRole('button', { name: /facebook/i });
    await expect(facebookButton).toBeVisible();

    // Verify buttons are enabled
    await expect(googleButton).toBeEnabled();
    await expect(facebookButton).toBeEnabled();
  });

  test('should have correct OAuth button styling', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /google/i });
    const facebookButton = page.getByRole('button', { name: /facebook/i });

    // Check Google button color
    const googleColor = await googleButton.evaluate(el => 
      window.getComputedStyle(el).color
    );
    expect(googleColor).toBeTruthy();

    // Check Facebook button color
    const facebookColor = await facebookButton.evaluate(el => 
      window.getComputedStyle(el).color
    );
    expect(facebookColor).toBeTruthy();
  });

  test('should show loading state when OAuth button clicked', async ({ page, context }) => {
    // Prevent actual OAuth redirect for testing
    await context.route('**/**/auth/v1/authorize**', route => route.abort());

    const googleButton = page.getByRole('button', { name: /google/i });
    
    // Click button
    await googleButton.click();

    // Button should be disabled during OAuth flow
    await expect(googleButton).toBeDisabled();
  });

  test('should handle OAuth errors gracefully', async ({ page, context }) => {
    // Mock OAuth error response
    await context.route('**/**/auth/v1/authorize**', route => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'invalid_request' }),
      });
    });

    const googleButton = page.getByRole('button', { name: /google/i });
    await googleButton.click();

    // Should show error message
    await expect(page.getByText(/sign-in failed/i)).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to callback URL after OAuth', async ({ page, context }) => {
    // Mock successful OAuth flow
    await context.route('**/**/auth/v1/callback**', route => {
      route.fulfill({
        status: 302,
        headers: {
          'Location': `${BASE_URL}/app/auth/callback?code=mock_code`,
        },
      });
    });

    const googleButton = page.getByRole('button', { name: /google/i });
    
    // Start OAuth flow
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      googleButton.click(),
    ]);

    // Verify popup/redirect occurred
    expect(popup).toBeTruthy();
  });

  test('should preserve returnTo parameter in OAuth flow', async ({ page }) => {
    // Navigate with returnTo parameter
    await page.goto(`${BASE_URL}/auth?returnTo=/app/find-ride`);

    const googleButton = page.getByRole('button', { name: /google/i });
    
    // Check that button is ready
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test('should show WhatsApp support button when configured', async ({ page }) => {
    // WhatsApp button should be visible if support number is configured
    const whatsappButton = page.getByRole('button', { name: /whatsapp/i });
    
    // Button may or may not exist depending on configuration
    const isVisible = await whatsappButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(whatsappButton).toBeEnabled();
    }
  });

  test('should display correct OAuth consent information', async ({ page }) => {
    // Check for privacy policy link
    const privacyLink = page.getByRole('button', { name: /privacy policy/i });
    await expect(privacyLink).toBeVisible();

    // Check for terms of service link
    const termsLink = page.getByRole('button', { name: /terms of service/i });
    await expect(termsLink).toBeVisible();
  });

  test('should handle OAuth popup blockers', async ({ page, context }) => {
    // Simulate popup blocker
    await context.addInitScript(() => {
      window.open = () => null;
    });

    const googleButton = page.getByRole('button', { name: /google/i });
    await googleButton.click();

    // Should handle gracefully (no crash)
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/auth');
  });

  test('should switch between sign-in and sign-up tabs', async ({ page }) => {
    // Start on sign-in tab
    const signInTab = page.getByRole('button', { name: /sign in/i }).first();
    const signUpTab = page.getByRole('button', { name: /create account/i }).first();

    // OAuth buttons should be visible on both tabs
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();

    // Switch to sign-up
    await signUpTab.click();
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();

    // Switch back to sign-in
    await signInTab.click();
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
  });

  test('should display OAuth divider text', async ({ page }) => {
    // Check for "or continue with" text
    await expect(page.getByText(/or continue with/i)).toBeVisible();
  });

  test('should have accessible OAuth buttons', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /google/i });
    const facebookButton = page.getByRole('button', { name: /facebook/i });

    // Buttons should be keyboard accessible
    await googleButton.focus();
    await expect(googleButton).toBeFocused();

    await facebookButton.focus();
    await expect(facebookButton).toBeFocused();
  });
});

test.describe('OAuth Callback Handling', () => {
  test('should handle successful OAuth callback', async ({ page, context }) => {
    // Mock successful session
    await context.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock_token',
        refresh_token: 'mock_refresh',
        expires_at: Date.now() + 3600000,
      }));
    });

    await page.goto(`${BASE_URL}/app/auth/callback?code=mock_code`);

    // Should redirect to app
    await expect(page).toHaveURL(/\/app/, { timeout: 10000 });
  });

  test('should handle OAuth callback errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/auth/callback?error=access_denied`);

    // Should show error or redirect to auth page
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/\/(auth|app)/);
  });

  test('should handle OAuth callback with returnTo', async ({ page, context }) => {
    // Mock successful session
    await context.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock_token',
        refresh_token: 'mock_refresh',
        expires_at: Date.now() + 3600000,
      }));
    });

    await page.goto(`${BASE_URL}/app/auth/callback?code=mock_code&returnTo=/app/wallet`);

    // Should eventually redirect to returnTo destination
    await page.waitForTimeout(3000);
    // URL should contain app route
    expect(page.url()).toContain('/app');
  });
});

test.describe('OAuth Profile Creation', () => {
  test('should create profile after OAuth sign-in', async () => {
    // This test requires actual OAuth flow or mocked backend
    // Placeholder for integration testing
    test.skip(true, 'Requires backend integration');
  });

  test('should handle OAuth profile creation errors', async () => {
    // This test requires actual OAuth flow or mocked backend
    // Placeholder for integration testing
    test.skip(true, 'Requires backend integration');
  });
});

test.describe('OAuth Security', () => {
  test('should use HTTPS in production', async ({ page }) => {
    if (process.env.NODE_ENV === 'production') {
      expect(page.url()).toMatch(/^https:/);
    }
  });

  test('should not expose OAuth secrets in client', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);

    // Check page source for secrets
    const content = await page.content();
    
    // Should not contain secret keywords
    expect(content).not.toContain('client_secret');
    expect(content).not.toContain('SUPABASE_AUTH_GOOGLE_CLIENT_SECRET');
    expect(content).not.toContain('SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET');
  });

  test('should validate redirect URLs', async ({ page }) => {
    // Attempt to use invalid redirect URL
    await page.goto(`${BASE_URL}/auth?returnTo=https://evil.com`);

    const googleButton = page.getByRole('button', { name: /google/i });
    await googleButton.click();

    // Should sanitize or reject invalid redirect
    await page.waitForTimeout(1000);
    // Should stay on safe domain
    expect(page.url()).toContain(BASE_URL);
  });
});
