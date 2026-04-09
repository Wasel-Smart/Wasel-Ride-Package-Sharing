export type AuthProvider = 'google' | 'facebook';

export const AUTH_PROVIDER_META: Record<
  AuthProvider,
  {
    label: string;
    accent: string;
    badgeText: string;
    badgeColor: string;
    badgeBackground: string;
  }
> = {
  google: {
    label: 'Google',
    accent: '#4285F4',
    badgeText: 'G',
    badgeColor: '#FFFFFF',
    badgeBackground:
      'linear-gradient(135deg, #EA4335 0%, #FBBC05 34%, #34A853 68%, #4285F4 100%)',
  },
  facebook: {
    label: 'Facebook',
    accent: '#1877F2',
    badgeText: 'f',
    badgeColor: '#FFFFFF',
    badgeBackground: 'linear-gradient(135deg, #1877F2 0%, #0F5FD7 100%)',
  },
};
