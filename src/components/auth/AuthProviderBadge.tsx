import type { CSSProperties } from 'react';
import { AUTH_PROVIDER_META, type AuthProvider } from './authProviderBadgeMeta';

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
