import type { CSSProperties } from 'react';

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

type AuthProviderBadgeProps = {
  provider: AuthProvider;
  size?: number;
  style?: CSSProperties;
};

export function AuthProviderBadge({
  provider,
  size = 18,
  style,
}: AuthProviderBadgeProps) {
  const meta = AUTH_PROVIDER_META[provider];

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: meta.badgeBackground,
        color: meta.badgeColor,
        fontSize: size * 0.7,
        fontWeight: 900,
        lineHeight: 1,
        boxShadow: `0 8px 20px ${meta.accent}33`,
        ...style,
      }}
    >
      {meta.badgeText}
    </span>
  );
}
