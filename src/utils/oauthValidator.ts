/**
 * OAuth Configuration Validator
 * Validates that OAuth providers are properly configured before use
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type OAuthProvider = 'google' | 'facebook' | 'microsoft' | 'apple';

export interface OAuthProviderStatus {
  provider: OAuthProvider;
  enabled: boolean;
  configured: boolean;
  error?: string;
}

export interface OAuthValidationResult {
  valid: boolean;
  providers: OAuthProviderStatus[];
  redirectUri: string;
  warnings: string[];
}

/**
 * Get the expected redirect URI for Supabase OAuth
 */
export function getOAuthRedirectUri(supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/$/, '');
  return `${base}/auth/v1/callback`;
}

/**
 * Validate OAuth configuration by attempting to get the provider's auth URL
 * without actually redirecting the user
 */
export async function validateOAuthProvider(
  client: SupabaseClient,
  provider: OAuthProvider,
): Promise<OAuthProviderStatus> {
  try {
    // signInWithOAuth with shouldCreateSession=false lets us check config
    // without initiating the full flow
    const { data, error } = await client.auth.signInWithOAuth({
      provider: provider as unknown,
      options: {
        redirectTo: window.location.origin + '/app/auth/callback',
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return {
        provider,
        enabled: true,
        configured: false,
        error: classifyConfigError(error.message, provider),
      };
    }

    // If we got a URL back, the provider is configured
    return {
      provider,
      enabled: true,
      configured: Boolean(data?.url),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      provider,
      enabled: true,
      configured: false,
      error: classifyConfigError(message, provider),
    };
  }
}

/**
 * Classify configuration errors into actionable messages
 */
function classifyConfigError(message: string, provider: OAuthProvider): string {
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
  const lower = message.toLowerCase();

  if (lower.includes('redirect_uri') || lower.includes('redirect uri') || lower.includes('uri not allowed')) {
    return `${providerName} redirect URI is not whitelisted. Add "${getExpectedRedirectUri()}" to your ${provider === 'facebook' ? 'Facebook Developer Console' : 'Google Cloud Console'} > Valid OAuth Redirect URIs.`;
  }

  if (lower.includes('client_id') || lower.includes('client id') || lower.includes('invalid_client')) {
    return `${providerName} Client ID is missing or invalid. Check your Supabase Dashboard > Authentication > Providers > ${providerName}.`;
  }

  if (lower.includes('client_secret') || lower.includes('client secret') || lower.includes('unauthorized')) {
    return `${providerName} Client Secret is missing or invalid. Check your Supabase Dashboard > Authentication > Providers > ${providerName}.`;
  }

  if (lower.includes('provider is not enabled') || lower.includes('not enabled')) {
    return `${providerName} provider is not enabled in Supabase Dashboard > Authentication > Providers.`;
  }

  return `${providerName} OAuth configuration error: ${message}`;
}

/**
 * Get the expected redirect URI for this app
 */
export function getExpectedRedirectUri(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  return getOAuthRedirectUri(supabaseUrl);
}

/**
 * Get setup instructions for each provider
 */
export function getProviderSetupInstructions(provider: OAuthProvider): {
  steps: string[];
  docsUrl: string;
} {
  const redirectUri = getExpectedRedirectUri();

  if (provider === 'facebook') {
    return {
      steps: [
        'Go to Facebook Developers â†’ Your App â†’ Facebook Login â†’ Settings',
        `Add "${redirectUri}" to Valid OAuth Redirect URIs`,
        'Go to Supabase Dashboard â†’ Authentication â†’ Providers â†’ Facebook',
        'Enable Facebook and enter your App ID + App Secret',
        'Ensure your Facebook app is in "Live" mode for public access',
      ],
      docsUrl: 'https://developers.facebook.com/docs/facebook-login',
    };
  }

  if (provider === 'microsoft') {
    return {
      steps: [
        'Go to Azure Portal â†’ Microsoft Entra ID â†’ App registrations',
        `Add "${redirectUri}" to Redirect URIs (web)`,
        'Go to Supabase Dashboard â†’ Authentication â†’ Providers â†’ Microsoft',
        'Enable Microsoft and enter your Client ID + Client Secret',
        'Ensure the app is published and consent is granted for the required scopes',
      ],
      docsUrl: 'https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app',
    };
  }

  if (provider === 'apple') {
    return {
      steps: [
        'Go to Apple Developer â†’ Certificates, Identifiers & Profiles â†’ Identifiers',
        `Add "${redirectUri}" to Return URLs in your Apple Services ID`,
        'Go to Supabase Dashboard â†’ Authentication â†’ Providers â†’ Apple',
        'Enable Apple and enter your Services ID, Team ID, Key ID, and Private Key',
        'Ensure your Apple app is configured for Sign in with Apple',
      ],
      docsUrl: 'https://developer.apple.com/documentation/sign_in_with_apple',
    };
  }

  return {
    steps: [
      'Go to Google Cloud Console â†’ Credentials',
      `Add "${redirectUri}" to Authorized redirect URIs`,
      'Go to Supabase Dashboard â†’ Authentication â†’ Providers â†’ Google',
      'Enable Google and enter your Client ID + Client Secret',
    ],
    docsUrl: 'https://developers.google.com/identity/protocols/oauth2',
  };
}

/**
 * Check if the current origin is in the Supabase allow-list
 */
export function isOriginAllowed(allowedOrigins: string[]): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  const origin = window.location.origin;
  return allowedOrigins.some(allowed => {
    try {
      const allowedUrl = new URL(allowed);
      return allowedUrl.origin === origin;
    } catch {
      return allowed === origin;
    }
  });
}

