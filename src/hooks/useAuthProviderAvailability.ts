import { useEffect, useMemo, useRef } from 'react';
import {
  buildAuthProviderWarning,
  logAuthProviderWarning,
  type AuthProviderWarningReason,
  type SupportedAuthProvider,
} from '../utils/authHelpers';
import { getConfig, getWhatsAppSupportUrl } from '../utils/env';
import { isSupabaseConfigured } from '../utils/supabase/client';

type ProviderAvailability = {
  configKey?: string;
  enabled: boolean;
  reason?: AuthProviderWarningReason;
};

export type AuthProviderAvailability = Record<SupportedAuthProvider, ProviderAvailability>;

export function useAuthProviderAvailability(): AuthProviderAvailability {
  const config = getConfig();
  const loggedWarningsRef = useRef<Set<string>>(new Set());

  const availability = useMemo<AuthProviderAvailability>(() => {
    const whatsAppSupportUrl = getWhatsAppSupportUrl('Hi Wasel');
    const backendAvailable = isSupabaseConfigured;

    return {
      google: backendAvailable && config.enableGoogleAuth
        ? { enabled: true, configKey: 'VITE_ENABLE_GOOGLE_AUTH' }
        : {
            enabled: false,
            configKey: 'VITE_ENABLE_GOOGLE_AUTH',
            reason: backendAvailable ? 'disabled_in_environment' : 'missing_backend',
          },
      facebook: backendAvailable && config.enableFacebookAuth
        ? { enabled: true, configKey: 'VITE_ENABLE_FACEBOOK_AUTH' }
        : {
            enabled: false,
            configKey: 'VITE_ENABLE_FACEBOOK_AUTH',
            reason: backendAvailable ? 'disabled_in_environment' : 'missing_backend',
          },
      whatsapp: config.supportWhatsAppNumber && whatsAppSupportUrl
        ? { enabled: true }
        : {
            enabled: false,
            configKey: 'VITE_SUPPORT_WHATSAPP_NUMBER',
            reason: 'missing_support_channel',
          },
    };
  }, [
    config.enableFacebookAuth,
    config.enableGoogleAuth,
    config.supportWhatsAppNumber,
  ]);

  useEffect(() => {
    (Object.entries(availability) as Array<[SupportedAuthProvider, ProviderAvailability]>).forEach(
      ([provider, details]) => {
        if (details.enabled || !details.reason) {
          return;
        }

        const key = `${provider}:${details.reason}:${config.environment}`;
        if (loggedWarningsRef.current.has(key)) {
          return;
        }

        logAuthProviderWarning(
          buildAuthProviderWarning(provider, details.reason, {
            configKey: details.configKey,
            environment: config.environment,
          }),
        );
        loggedWarningsRef.current.add(key);
      },
    );
  }, [availability, config.environment]);

  return availability;
}
