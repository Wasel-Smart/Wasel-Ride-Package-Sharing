import Constants from 'expo-constants';

type ExtraConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  googleMapsKey?: string;
  stripePublishableKey?: string;
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

export const waselMobileConfig = {
  supabaseUrl,
  supabaseAnonKey,
  googleMapsKey,
  stripePublishableKey,
  hasSupabase: Boolean(supabaseUrl && supabaseAnonKey),
  hasMaps: Boolean(googleMapsKey),
  hasStripe: Boolean(stripePublishableKey),
};
