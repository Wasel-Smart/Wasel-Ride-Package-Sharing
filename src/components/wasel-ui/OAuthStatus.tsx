/**
 * OAuth Status Component
 * Shows OAuth provider connection status in settings
 */
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { C, F, R, SPACE, TYPE } from '../../utils/wasel-ds';

export type OAuthProviderStatus = {
  provider: 'google' | 'facebook';
  connected: boolean;
  email?: string;
  connectedAt?: string;
  lastUsed?: string;
};

interface OAuthStatusCardProps {
  status: OAuthProviderStatus;
  onDisconnect?: () => void;
  onConnect?: () => void;
}

export function OAuthStatusCard({ status, onDisconnect, onConnect }: OAuthStatusCardProps) {
  const providerName = status.provider === 'google' ? 'Google' : 'Facebook';
  const providerColor = status.provider === 'google' ? C.cyan : C.navyLight;

  return (
    <div
      style={{
        padding: SPACE[4],
        borderRadius: R.lg,
        border: `1px solid ${status.connected ? `${providerColor}30` : C.border}`,
        background: status.connected ? `${providerColor}08` : C.elevated,
        display: 'flex',
        alignItems: 'center',
        gap: SPACE[3],
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: R.md,
          background: `${providerColor}15`,
          border: `1px solid ${providerColor}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {status.connected ? (
          <CheckCircle size={20} color={providerColor} />
        ) : (
          <XCircle size={20} color={C.textMuted} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: TYPE.size.base,
            fontWeight: TYPE.weight.bold,
            color: C.text,
            fontFamily: F,
            marginBottom: 2,
          }}
        >
          {providerName}
        </div>
        <div
          style={{
            fontSize: TYPE.size.sm,
            color: C.textMuted,
            fontFamily: F,
          }}
        >
          {status.connected ? (
            <>
              Connected {status.email && ` - ${status.email}`}
              {status.lastUsed && ` - Last used ${status.lastUsed}`}
            </>
          ) : (
            `Not connected - Click to link your ${providerName} account`
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={status.connected ? onDisconnect : onConnect}
        style={{
          padding: '8px 14px',
          borderRadius: R.md,
          border: status.connected ? `1px solid ${C.error}40` : `1px solid ${providerColor}40`,
          background: status.connected ? `${C.error}15` : `${providerColor}15`,
          color: status.connected ? C.error : providerColor,
          fontFamily: F,
          fontSize: TYPE.size.sm,
          fontWeight: TYPE.weight.bold,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {status.connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}

interface OAuthStatusSectionProps {
  providers: OAuthProviderStatus[];
  onDisconnect?: (provider: 'google' | 'facebook') => void;
  onConnect?: (provider: 'google' | 'facebook') => void;
}

export function OAuthStatusSection({
  providers,
  onDisconnect,
  onConnect,
}: OAuthStatusSectionProps) {
  const hasConnected = providers.some(p => p.connected);

  return (
    <div style={{ display: 'grid', gap: SPACE[3] }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2] }}>
        <AlertCircle size={16} color={C.cyan} />
        <div
          style={{
            fontSize: TYPE.size.sm,
            color: C.textMuted,
            fontFamily: F,
          }}
        >
          {hasConnected
            ? 'You can sign in with any connected provider'
            : 'Connect OAuth providers for faster sign-in'}
        </div>
      </div>

      {providers.map(provider => (
        <OAuthStatusCard
          key={provider.provider}
          status={provider}
          onDisconnect={() => onDisconnect?.(provider.provider)}
          onConnect={() => onConnect?.(provider.provider)}
        />
      ))}

      <div
        style={{
          fontSize: TYPE.size.xs,
          color: C.textDim,
          fontFamily: F,
          marginTop: SPACE[2],
        }}
      >
        OAuth connections are managed securely through Supabase. Disconnecting will not delete your
        account.
      </div>
    </div>
  );
}
