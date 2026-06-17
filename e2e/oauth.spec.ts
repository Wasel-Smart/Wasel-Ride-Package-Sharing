import { expect, test, type Page, type Request } from '@playwright/test';

function isGoogleAuthorizeRequest(request: Request) {
  const url = new URL(request.url());
  return (
    url.pathname.endsWith('/auth/v1/authorize') && url.searchParams.get('provider') === 'google'
  );
}

async function captureGoogleAuthorizeRequest(page: Page) {
  await page.route('**/auth/v1/authorize**', route => route.abort());

  const requestPromise = page.waitForRequest(isGoogleAuthorizeRequest);
  await page.getByRole('button', { name: /google/i }).click();

  return requestPromise;
}

function getRedirectTo(request: Request) {
  const redirectTo = new URL(request.url()).searchParams.get('redirect_to');
  if (!redirectTo) throw new Error('OAuth authorize request is missing redirect_to');
  return new URL(redirectTo);
}

async function gotoAuth(page: Page, path = '/auth') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

test.describe('OAuth Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuth(page);
  });

  test('displays enabled OAuth provider buttons', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /google/i });
    const facebookButton = page.getByRole('button', { name: /facebook/i });

    await expect(googleButton).toBeVisible();
    await expect(facebookButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
    await expect(facebookButton).toBeEnabled();
  });

  test('starts Google OAuth with the configured callback URL', async ({ page }) => {
    const request = await captureGoogleAuthorizeRequest(page);
    const redirectTo = getRedirectTo(request);

    expect(redirectTo.pathname).toBe('/auth/callback');
    expect(redirectTo.searchParams.get('returnTo')).toBe('/app/find-ride');
  });

  test('preserves a safe returnTo value in the Google OAuth redirect', async ({ page }) => {
    await gotoAuth(page, '/auth?returnTo=/app/wallet');

    const request = await captureGoogleAuthorizeRequest(page);
    const redirectTo = getRedirectTo(request);

    expect(redirectTo.pathname).toBe('/auth/callback');
    expect(redirectTo.searchParams.get('returnTo')).toBe('/app/wallet');
  });

  test('sanitizes an external returnTo value before Google OAuth', async ({ page }) => {
    await gotoAuth(page, '/auth?returnTo=https://evil.example/login');

    const request = await captureGoogleAuthorizeRequest(page);
    const redirectTo = getRedirectTo(request);

    expect(redirectTo.origin).not.toBe('https://evil.example');
    expect(redirectTo.searchParams.get('returnTo')).toBe('/app/find-ride');
  });

  test('opens the sign-up form and validates the create-account button', async ({ page }) => {
    await page.getByRole('button', { name: /switch to create account/i }).click();

    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/phone number/i)).toBeVisible();

    const createAccountButton = page.getByRole('button', { name: /submit create account/i });
    await expect(createAccountButton).toBeVisible();
    await expect(createAccountButton).toBeEnabled();

    await createAccountButton.click();
    await expect(page.getByText('Please enter your full name.')).toBeVisible();
  });

  test('keeps OAuth and legal controls keyboard accessible', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /google/i });
    const facebookButton = page.getByRole('button', { name: /facebook/i });

    await googleButton.focus();
    await expect(googleButton).toBeFocused();

    await facebookButton.focus();
    await expect(facebookButton).toBeFocused();

    await expect(page.getByRole('button', { name: /terms of service/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /privacy policy/i })).toBeVisible();
  });
});
