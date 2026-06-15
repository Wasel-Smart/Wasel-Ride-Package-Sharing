/**
 * OAuth Error Handling Utilities
 * Provides user-friendly error messages for OAuth failures
 */

export type OAuthProvider = 'google' | 'facebook';

export interface OAuthError {
  code: string;
  message: string;
  provider?: OAuthProvider;
  userMessage: string;
  recoveryAction?: string;
}

/**
 * Common OAuth error codes and their meanings
 */
const OAUTH_ERROR_CODES = {
  // User-initiated cancellations
  access_denied: 'User denied access',
  user_cancelled: 'User cancelled the sign-in',
  
  // Configuration errors
  invalid_client: 'OAuth client configuration error',
  unauthorized_client: 'OAuth client not authorized',
  invalid_request: 'Invalid OAuth request',
  
  // Redirect errors
  redirect_uri_mismatch: 'Redirect URI mismatch',
  
  // Scope errors
  invalid_scope: 'Invalid OAuth scope requested',
  
  // Server errors
  server_error: 'OAuth provider server error',
  temporarily_unavailable: 'OAuth provider temporarily unavailable',
  
  // Token errors
  invalid_grant: 'Invalid authorization grant',
  
  // Network errors
  network_error: 'Network connection failed',
  timeout: 'Request timed out',
} as const;

/**
 * Parse OAuth error from URL parameters or error object
 */
export function parseOAuthError(
  error: unknown,
  provider?: OAuthProvider,
): OAuthError | null {
  // Handle URL error parameters
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    const errorDescription = params.get('error_description');
    
    if (errorCode) {
      return createOAuthError(errorCode, errorDescription, provider);
    }
  }

  // Handle error objects
  if (error instanceof Error) {
    return createOAuthError(
      'unknown_error',
      error.message,
      provider,
    );
  }

  // Handle string errors
  if (typeof error === 'string') {
    return createOAuthError('unknown_error', error, provider);
  }

  return null;
}

/**
 * Create structured OAuth error with user-friendly message
 */
function createOAuthError(
  code: string,
  description: string | null,
  provider?: OAuthProvider,
): OAuthError {
  const providerName = provider
    ? provider.charAt(0).toUpperCase() + provider.slice(1)
    : 'OAuth';

  let userMessage: string;
  let recoveryAction: string | undefined;

  switch (code) {
    case 'access_denied':
    case 'user_cancelled':
      userMessage = `You cancelled the ${providerName} sign-in. No worries, you can try again anytime.`;
      recoveryAction = 'Click the button again to sign in';
      break;

    case 'invalid_client':
    case 'unauthorized_client':
      userMessage = `${providerName} authentication is not properly configured. Please contact support.`;
      recoveryAction = 'Contact support@wasel14.online';
      break;

    case 'redirect_uri_mismatch':
      userMessage = `${providerName} authentication configuration error. Please contact support.`;
      recoveryAction = 'Contact support@wasel14.online';
      break;

    case 'invalid_scope':
      userMessage = `${providerName} requested invalid permissions. Please contact support.`;
      recoveryAction = 'Contact support@wasel14.online';
      break;

    case 'server_error':
      userMessage = `${providerName} is experiencing technical difficulties. Please try again later.`;
      recoveryAction = 'Try again in a few minutes';
      break;

    case 'temporarily_unavailable':
      userMessage = `${providerName} is temporarily unavailable. Please try again in a moment.`;
      recoveryAction = 'Try again in a few minutes';
      break;

    case 'invalid_grant':
      userMessage = `${providerName} authorization expired. Please sign in again.`;
      recoveryAction = 'Click the button to sign in again';
      break;

    case 'network_error':
    case 'timeout':
      userMessage = 'Network connection failed. Please check your internet and try again.';
      recoveryAction = 'Check your connection and try again';
      break;

    case 'popup_blocked':
      userMessage = 'Sign-in popup was blocked. Please allow popups for this site.';
      recoveryAction = 'Enable popups in your browser settings';
      break;

    case 'popup_closed':
      userMessage = 'Sign-in window was closed before completing. Please try again.';
      recoveryAction = 'Click the button again to sign in';
      break;

    default:
      userMessage = description
        ? `${providerName} sign-in failed: ${description}`
        : `${providerName} sign-in failed. Please try again.`;
      recoveryAction = 'Try again or use email/password';
  }

  return {
    code,
    message: description || OAUTH_ERROR_CODES[code as keyof typeof OAUTH_ERROR_CODES] || code,
    provider,
    userMessage,
    recoveryAction,
  };
}

/**
 * Check if error is user-initiated cancellation
 */
export function isUserCancellation(error: OAuthError): boolean {
  return ['access_denied', 'user_cancelled', 'popup_closed'].includes(error.code);
}

/**
 * Check if error is a configuration issue
 */
export function isConfigurationError(error: OAuthError): boolean {
  return [
    'invalid_client',
    'unauthorized_client',
    'redirect_uri_mismatch',
    'invalid_scope',
  ].includes(error.code);
}

/**
 * Check if error is temporary and retryable
 */
export function isRetryableError(error: OAuthError): boolean {
  return [
    'server_error',
    'temporarily_unavailable',
    'network_error',
    'timeout',
  ].includes(error.code);
}

/**
 * Get appropriate error severity level
 */
export function getErrorSeverity(error: OAuthError): 'info' | 'warning' | 'error' {
  if (isUserCancellation(error)) return 'info';
  if (isRetryableError(error)) return 'warning';
  return 'error';
}

/**
 * Format error for logging (sanitized)
 */
export function formatErrorForLogging(error: OAuthError): string {
  return `[OAuth Error] Provider: ${error.provider || 'unknown'}, Code: ${error.code}, Message: ${error.message}`;
}

/**
 * Get support contact based on error type
 */
export function getSupportContact(error: OAuthError): {
  method: 'email' | 'whatsapp' | 'docs';
  value: string;
} {
  if (isConfigurationError(error)) {
    return {
      method: 'email',
      value: 'support@wasel14.online',
    };
  }

  if (isRetryableError(error)) {
    return {
      method: 'docs',
      value: '/docs/oauth-setup-guide.md#troubleshooting',
    };
  }

  return {
    method: 'whatsapp',
    value: '+962790000000',
  };
}

/**
 * Enhanced OAuth error handler for AuthContext
 */
export function handleOAuthError(
  error: unknown,
  provider: OAuthProvider,
  onError: (message: string) => void,
): void {
  const oauthError = parseOAuthError(error, provider);

  if (!oauthError) {
    onError(`${provider.charAt(0).toUpperCase()}${provider.slice(1)} sign-in failed. Please try again.`);
    return;
  }

  // Don't show error for user cancellations
  if (isUserCancellation(oauthError)) {
    return;
  }

  // Log configuration errors
  if (isConfigurationError(oauthError)) {
    if (import.meta.env?.DEV) {
      console.error(formatErrorForLogging(oauthError));
    }
  }

  // Show user-friendly message
  onError(oauthError.userMessage);
}
