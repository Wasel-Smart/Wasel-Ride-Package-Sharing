import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

type ExtraConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  googleMapsKey?: string;
  stripePublishableKey?: string;
  supabaseFunctionUrl?: string;
  authRedirectUrl?: string;
  apiUrl?: string;
  wsUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;
const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env ?? {};

function readPublicEnv(key: string, fallback?: string): string {
  return processEnv[key] ?? fallback ?? '';
}

const supabaseUrl = readPublicEnv('EXPO_PUBLIC_SUPABASE_URL', extra.supabaseUrl);
const supabaseAnonKey = readPublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', extra.supabaseAnonKey);
const googleMapsKey = readPublicEnv('EXPO_PUBLIC_GOOGLE_MAPS_KEY', extra.googleMapsKey);
const stripePublishableKey = readPublicEnv(
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  extra.stripePublishableKey,
);
const supabaseFunctionUrl = readPublicEnv(
  'EXPO_PUBLIC_SUPABASE_FUNCTION_URL',
  extra.supabaseFunctionUrl,
);
const authRedirectUrl = readPublicEnv('EXPO_PUBLIC_AUTH_REDIRECT_URL', extra.authRedirectUrl);
const apiUrl = readPublicEnv('EXPO_PUBLIC_API_URL', extra.apiUrl);
const wsUrl = readPublicEnv('EXPO_PUBLIC_WS_URL', extra.wsUrl);

export const waselMobileConfig = {
  supabaseUrl,
  supabaseAnonKey,
  googleMapsKey,
  stripePublishableKey,
  supabaseFunctionUrl,
  authRedirectUrl: authRedirectUrl || 'wasel://auth/callback',
  apiUrl,
  wsUrl,
  hasSupabase: Boolean(supabaseUrl && supabaseAnonKey),
  hasMaps: Boolean(googleMapsKey),
  hasStripe: Boolean(stripePublishableKey),
  hasFunctions: Boolean(supabaseFunctionUrl),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    detectSessionInUrl: false,
  },
});

