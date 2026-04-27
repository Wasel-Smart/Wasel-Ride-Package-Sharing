import {
  BadgeCheck,
  HeartPulse,
  Mail,
  MapPin,
  MessageSquareText,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import {
  getWaselPresenceProfile,
  getWaselPresenceSignals,
  type WaselContactAction,
} from '../../domains/trust/waselPresence';

const FONT = "var(--wasel-font-sans, 'Montserrat', 'Cairo', 'Tajawal', sans-serif)";
const DISPLAY =
  "var(--wasel-font-display, 'Montserrat', 'Cairo', 'Tajawal', sans-serif)";
const PRESENCE_TEXT = 'var(--wasel-copy-primary)';
const PRESENCE_TEXT_MUTED = 'var(--wasel-copy-muted)';
const PRESENCE_BORDER = 'var(--wasel-panel-border)';
const PRESENCE_BORDER_SOFT = 'var(--wasel-button-primary-border)';
const PRESENCE_PANEL = 'var(--wasel-panel-strong)';
const PRESENCE_PANEL_SOFT = 'var(--wasel-panel-strong)';

const TONE_STYLES = {
  cyan: {
    border: 'color-mix(in srgb, var(--ds-accent) 24%, transparent)',
    background: 'color-mix(in srgb, var(--ds-accent) 10%, transparent)',
    color: 'var(--ds-accent)',
  },
  green: {
    border: 'color-mix(in srgb, var(--ds-accent-strong) 26%, transparent)',
    background: 'color-mix(in srgb, var(--ds-accent-strong) 10%, transparent)',
    color: 'var(--ds-accent-strong)',
  },
  gold: {
    border: 'color-mix(in srgb, var(--wasel-brand-hover) 24%, transparent)',
    background: 'color-mix(in srgb, var(--wasel-brand-hover) 10%, transparent)',
    color: 'var(--wasel-brand-hover)',
  },
} as const;

function getActionMeta(action: WaselContactAction) {
  if (action.id === 'call') return { icon: PhoneCall, color: 'var(--ds-accent)' };
  if (action.id === 'whatsapp') return { icon: MessageSquareText, color: 'var(--ds-accent-strong)' };
  return { icon: Mail, color: 'var(--wasel-brand-hover)' };
}

function getActionAriaLabel(action: WaselContactAction, ar: boolean) {
  switch (action.id) {
    case 'call':
      return ar ? `اتصل عبر ${action.labelAr}` : `Call support via ${action.label}`;
    case 'whatsapp':
      return ar
        ? `افتح ${action.labelAr} في علامة تبويب جديدة`
        : `Open ${action.label} in a new tab`;
    default:
      return ar ? `راسل الدعم عبر ${action.labelAr}` : `Email support via ${action.label}`;
  }
}

export function WaselContactActionRow({ ar, compact = false }: { ar: boolean; compact?: boolean }) {
  const profile = getWaselPresenceProfile();

  return (
    <div
      style={{
        display: 'flex',
        gap: compact ? 8 : 10,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {profile.contactActions.map(action => {
        const meta = getActionMeta(action);
        const Icon = meta.icon;

        return (
          <a
            key={action.id}
            href={action.href}
            target={action.id === 'whatsapp' ? '_blank' : undefined}
            rel={action.id === 'whatsapp' ? 'noreferrer noopener' : undefined}
            aria-label={getActionAriaLabel(action, ar)}
            title={ar ? action.labelAr : action.label}
            className="wasel-lift-card"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minHeight: compact ? 40 : 42,
              padding: compact ? '0 14px' : '0 16px',
              borderRadius: 999,
              border: compact ? '1px solid rgba(191,214,234,0.9)' : `1px solid ${meta.color}26`,
              background: compact
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99), rgba(248,252,255,0.96))'
                : `${meta.color}10`,
              color: PRESENCE_TEXT,
              fontFamily: FONT,
              fontSize: compact ? '0.76rem' : '0.82rem',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: compact
                ? '0 10px 24px rgba(20,52,89,0.08)'
                : '0 10px 22px rgba(20,52,89,0.1)',
            }}
          >
            <Icon size={compact ? 14 : 16} color={meta.color} />
            {ar ? action.labelAr : action.label}
          </a>
        );
      })}
    </div>
  );
}

export function WaselProofOfLifeBlock({ ar, compact = false }: { ar: boolean; compact?: boolean }) {
  const profile = getWaselPresenceProfile();
  const signals = getWaselPresenceSignals();

  return (
    <section
      className="wasel-lift-card"
      style={{
        borderRadius: compact ? 20 : 24,
        padding: compact ? '16px 16px 14px' : '22px 22px 20px',
        background: PRESENCE_PANEL,
        border: `1px solid ${PRESENCE_BORDER}`,
        boxShadow: '0 20px 48px rgba(16,50,95,0.12)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: compact ? 12 : 16,
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
              padding: '6px 10px',
              borderRadius: 999,
              background: 'color-mix(in srgb, var(--ds-accent-strong) 10%, transparent)',
              border: `1px solid ${PRESENCE_BORDER_SOFT}`,
              color: 'var(--ds-accent-strong)',
              fontSize: '0.72rem',
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: FONT,
            }}
          >
            <HeartPulse size={14} />
            {ar ? profile.proofOfLife.ar : profile.proofOfLife.en}
          </div>
          <div
            style={{
              color: PRESENCE_TEXT,
              fontFamily: DISPLAY,
              fontSize: compact ? '1rem' : '1.15rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            {ar ? profile.actionSummary.ar : profile.actionSummary.en}
          </div>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 999,
            background: 'color-mix(in srgb, var(--ds-accent) 8%, transparent)',
            border: `1px solid ${PRESENCE_BORDER_SOFT}`,
            color: PRESENCE_TEXT,
            fontSize: '0.76rem',
            fontWeight: 700,
            fontFamily: FONT,
          }}
        >
          <BadgeCheck size={15} color="var(--ds-accent)" />
          {profile.supportPhoneDisplay || profile.supportEmail}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact
            ? 'repeat(auto-fit, minmax(180px, 1fr))'
            : 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 10,
        }}
      >
        {signals.map(signal => {
          const tone = TONE_STYLES[signal.tone];

          return (
            <div
              key={signal.id}
              style={{
                borderRadius: 18,
                padding: compact ? '12px 13px' : '14px 14px 13px',
                border: `1px solid ${tone.border}`,
                background: tone.background,
              }}
            >
              <div
                style={{
                  color: tone.color,
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: FONT,
                }}
              >
                {ar ? signal.labelAr : signal.label}
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: PRESENCE_TEXT,
                  fontSize: compact ? '0.8rem' : '0.84rem',
                  lineHeight: 1.5,
                  fontFamily: FONT,
                  fontWeight: 600,
                }}
              >
                {ar ? signal.valueAr : signal.value}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function WaselFounderCard({ ar, compact = false }: { ar: boolean; compact?: boolean }) {
  const profile = getWaselPresenceProfile();

  return (
    <section
      className="wasel-lift-card"
      style={{
        borderRadius: compact ? 20 : 24,
        padding: compact ? '16px 16px 15px' : '22px 22px 20px',
        background: PRESENCE_PANEL_SOFT,
        border: `1px solid ${PRESENCE_BORDER}`,
        boxShadow: '0 16px 42px rgba(16,50,95,0.11)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          borderRadius: 999,
          background: 'color-mix(in srgb, var(--ds-accent-strong) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--ds-accent-strong) 24%, transparent)',
          color: 'var(--ds-accent-strong)',
          fontSize: '0.72rem',
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: FONT,
          marginBottom: 12,
        }}
      >
        <Sparkles size={14} />
        {ar ? 'من المؤسس' : 'Founder note'}
      </div>

      <div
        style={{
          color: PRESENCE_TEXT,
          fontFamily: DISPLAY,
          fontSize: compact ? '1.04rem' : '1.18rem',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          marginBottom: 8,
        }}
      >
        {profile.founderName}
      </div>

      <p
        style={{
          margin: 0,
          color: PRESENCE_TEXT_MUTED,
          fontSize: compact ? '0.82rem' : '0.9rem',
          lineHeight: 1.75,
          fontFamily: FONT,
        }}
      >
        {ar ? profile.founderStory.ar : profile.founderStory.en}
      </p>
    </section>
  );
}

export function WaselWhyCard({ ar, compact = false }: { ar: boolean; compact?: boolean }) {
  const profile = getWaselPresenceProfile();

  return (
    <section
      className="wasel-lift-card"
      style={{
        borderRadius: compact ? 20 : 24,
        padding: compact ? '16px 16px 15px' : '22px 22px 20px',
        background: PRESENCE_PANEL_SOFT,
        border: `1px solid ${PRESENCE_BORDER}`,
        boxShadow: '0 16px 42px rgba(16,50,95,0.11)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          borderRadius: 999,
          background: 'color-mix(in srgb, var(--ds-accent) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--ds-accent) 22%, transparent)',
          color: 'var(--ds-accent)',
          fontSize: '0.72rem',
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: FONT,
          marginBottom: 12,
        }}
      >
        <BadgeCheck size={14} />
        {ar ? 'لماذا واصل' : 'Why Wasel exists'}
      </div>

      <p
        style={{
          margin: 0,
          color: PRESENCE_TEXT_MUTED,
          fontSize: compact ? '0.84rem' : '0.92rem',
          lineHeight: 1.75,
          fontFamily: FONT,
        }}
      >
        {ar ? profile.whyWaselExists.ar : profile.whyWaselExists.en}
      </p>
    </section>
  );
}

export function WaselBusinessFooter({ ar }: { ar: boolean }) {
  const profile = getWaselPresenceProfile();

  return (
    <section
      className="wasel-lift-card"
      style={{
        borderRadius: 24,
        padding: '18px 18px 16px',
        background: PRESENCE_PANEL_SOFT,
        border: `1px solid ${PRESENCE_BORDER}`,
        boxShadow: '0 18px 44px rgba(16,50,95,0.11)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              color: PRESENCE_TEXT,
              fontFamily: DISPLAY,
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            {ar ? 'واسل يعمل من داخل المسار نفسه' : 'Wasel stays visible inside the corridor'}
          </div>
          <div
            style={{
              marginTop: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: PRESENCE_TEXT_MUTED,
              fontSize: '0.8rem',
              fontFamily: FONT,
            }}
          >
            <MapPin size={14} color="var(--ds-accent)" />
            {ar ? profile.businessAddressAr : profile.businessAddress}
          </div>
        </div>
        <WaselContactActionRow ar={ar} compact />
      </div>
      <div
        style={{
          color: PRESENCE_TEXT_MUTED,
          fontSize: '0.8rem',
          lineHeight: 1.7,
          fontFamily: FONT,
        }}
      >
        {ar ? profile.whyWaselExists.ar : profile.whyWaselExists.en}
      </div>
    </section>
  );
}

export function WaselPresenceStrip({ ar }: { ar: boolean }) {
  const profile = getWaselPresenceProfile();

  return (
    <section
      className="wasel-lift-card"
      style={{
        borderRadius: 20,
        padding: '12px 14px',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--ds-accent-strong) 12%, transparent), rgba(255,255,255,0.03) 52%, color-mix(in srgb, var(--ds-accent) 8%, transparent))',
        border: `1px solid ${PRESENCE_BORDER}`,
        boxShadow: '0 14px 34px rgba(16,50,95,0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              width: 'fit-content',
              padding: '5px 10px',
              borderRadius: 999,
              background: 'color-mix(in srgb, var(--ds-accent-strong) 10%, transparent)',
              border: `1px solid ${PRESENCE_BORDER_SOFT}`,
              color: 'var(--ds-accent-strong)',
              fontSize: '0.7rem',
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: FONT,
            }}
          >
            <HeartPulse size={13} />
            {ar ? profile.proofOfLife.ar : profile.proofOfLife.en}
          </div>
          <div
            style={{
              color: PRESENCE_TEXT,
              fontFamily: DISPLAY,
              fontSize: '0.96rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            {ar ? profile.actionSummary.ar : profile.actionSummary.en}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              color: PRESENCE_TEXT_MUTED,
              fontSize: '0.76rem',
              fontFamily: FONT,
            }}
          >
            <span>{profile.supportPhoneDisplay || profile.supportEmail}</span>
            <span>{ar ? profile.businessAddressAr : profile.businessAddress}</span>
          </div>
        </div>
        <WaselContactActionRow ar={ar} compact />
      </div>
    </section>
  );
}
