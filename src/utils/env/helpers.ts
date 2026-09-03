import { DEFAULT_AUTH_RETURN_TO, type AuthCallbackParams } from './resolvers';
import { getConfig } from './config';

export function normalizeReturnToPath(
  returnTo: string | null | undefined,
  fallback = DEFAULT_AUTH_RETURN_TO,
): string {
  if (!returnTo) {
    return fallback;
  }

  return returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : fallback;
}

export function getAuthCallbackUrl(origin?: string, params?: AuthCallbackParams): string {
  const { appUrl, authCallbackPath } = getConfig();
  const base = (origin || appUrl || 'http://localhost:3000').replace(/\/$/, '');
  const url = new URL(`${base}${authCallbackPath}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (typeof value !== 'string' || value.length === 0) {
      return;
    }

    url.searchParams.set(key, key === 'returnTo' ? normalizeReturnToPath(value) : value);
  });

  return url.toString();
}

export function resolveAuthRedirectOrigin(): string {
  const { appUrl } = getConfig();
  const fallback = appUrl || 'http://localhost:3000';

  if (typeof window === 'undefined' || !window.location?.origin) {
    return fallback;
  }

  const origin = window.location.origin;

  try {
    const current = new URL(origin);
    if (current.protocol === 'http:') {
      return origin;
    }
    const configured = new URL(fallback);
    if (current.host === configured.host) {
      return origin;
    }
    return configured.origin;
  } catch {
    return fallback;
  }
}

export function getWhatsAppSupportUrl(message = 'Hi Wasel'): string {
  const { supportWhatsAppNumber, enableWhatsAppNotifications } = getConfig();
  if (!supportWhatsAppNumber || !enableWhatsAppNotifications) {
    return '';
  }
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${supportWhatsAppNumber.replace(/^\+/, '')}?text=${encodedMessage}`;
}

export function getSupportEmailUrl(subject = 'Wasel Support', body = ''): string {
  const { supportEmail, enableEmailNotifications } = getConfig();
  if (!supportEmail || !enableEmailNotifications) {
    return '';
  }

  const search = new URLSearchParams();
  if (subject) {search.set('subject', subject);}
  if (body) {search.set('body', body);}
  const suffix = search.toString();
  return `mailto:${supportEmail}${suffix ? `?${suffix}` : ''}`;
}

export function getSmsSupportUrl(message = 'Hi Wasel'): string {
  const { supportSmsNumber, enableSmsNotifications } = getConfig();
  if (!supportSmsNumber || !enableSmsNotifications) {
    return '';
  }
  return `sms:${supportSmsNumber}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
}

export function getSupportPhoneUrl(): string {
  const { supportPhoneNumber } = getConfig();
  if (!supportPhoneNumber) {
    return '';
  }
  return `tel:${supportPhoneNumber}`;
}
