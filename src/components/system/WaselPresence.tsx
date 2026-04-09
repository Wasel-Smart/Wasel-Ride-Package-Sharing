import { BadgeCheck, HeartPulse, Mail, MapPin, MessageSquareText, PhoneCall, Sparkles } from 'lucide-react';
import {
  getWaselPresenceProfile,
  getWaselPresenceSignals,
  type WaselContactAction,
} from '../../domains/trust/waselPresence';

const FONT = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";
const DISPLAY = "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', sans-serif)";

const TONE_STYLES = {
  cyan: {
    border: 'rgba(93,150,210,0.24)',
    background: 'rgba(71,183,230,0.12)',
    color: '#47B7E6',
  },
  green: {
    border: 'rgba(107,181,21,0.24)',
    background: 'rgba(107,181,21,0.12)',
    color: '#6BB515',
  },
  gold: {
    border: 'rgba(168,214,20,0.24)',
    background: 'rgba(168,214,20,0.12)',
    color: '#A8D614',
  },
} as const;

function getActionMeta(action: WaselContactAction) {
  if (action.id === 'call') return { icon: PhoneCall, color: '#47B7E6' };
  if (action.id === 'whatsapp') return { icon: MessageSquareText, color: '#6BB515' };
  return { icon: Mail, color: '#A8D614' };
}

export function WaselContactActionRow({
  ar,
  compact = false,
}: {
  ar: boolean;
  compact?: boolean;
}) {
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
      {profile.contactActions.map((action) => {
        const meta = getActionMeta(action);
        const Icon = meta.icon;

        return (
          <a
            key={action.id}
            href={action.href}
            target={action.id === 'whatsapp' ? '_blank' : undefined}
            rel={action.id === 'whatsapp' ? 'noreferrer' : undefined}
            className="wasel-primary-button wasel-lift-card"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minHeight: compact ? 38 : 42,
              padding: compact ? '0 12px' : '0 16px',
              borderRadius: 999,
              border: `1px solid ${meta.color}33`,
              background: `${meta.color}15`,
              color: '#EAF7FF',
              fontFamily: FONT,
              fontSize: compact ? '0.76rem' : '0.82rem',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 12px 28px rgba(1,10,18,0.16)',
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

export function WaselProofOfLifeBlock({
  ar,
  compact = false,
}: {
  ar: boolean;
  compact?: boolean;
}) {
  const profile = getWaselPresenceProfile();
  const signals = getWaselPresenceSignals();

  return (
    <section
      className="wasel-lift-card"
      style={{
        borderRadius: compact ? 20 : 24,
        padding: compact ? '16px 16px 14px' : '22px 22px 20px',
        background: 'linear-gradient(135deg, rgba(71,183,230,0.12), rgba(255,255,255,0.04) 46%, rgba(168,214,20,0.09) 100%)',
        border: '1px solid rgba(93,150,210,0.18)',
        boxShadow: '0 22px 56px rgba(1,10,18,0.18)',
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
              background: 'rgba(6,23,38,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#47B7E6',
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
              color: '#EAF7FF',
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
            background: 'rgba(6,23,38,0.5)',
            border: '1px solid rgba(107,181,21,0.2)',
            color: '#EAF7FF',
            fontSize: '0.76rem',
            fontWeight: 700,
            fontFamily: FONT,
          }}
        >
          <BadgeCheck size={15} color="#6BB515" />
          {profile.supportPhoneDisplay || profile.supportEmail}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? 'repeat(auto-fit, minmax(180px, 1fr))' : 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 10,
        }}
      >
        {signals.map((signal) => {
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
                  color: '#EFF6FF',
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

export function WaselFounderCard({
  ar,
  compact = false,
}: {
  ar: boolean;
  compact?: boolean;
}) {
  const profile = getWaselPresenceProfile();

  return (
    <section
      className="wasel-lift-card"
      style={{
        borderRadius: compact ? 20 : 24,
        padding: compact ? '16px 16px 15px' : '22px 22px 20px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        border: '1px solid rgba(93,150,210,0.14)',
        boxShadow: '0 18px 48px rgba(1,10,18,0.18)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          borderRadius: 999,
          background: 'rgba(168,214,20,0.12)',
          border: '1px solid rgba(168,214,20,0.22)',
          color: '#A8D614',
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
          color: '#EAF7FF',
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
          color: 'rgba(234,247,255,0.76)',
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

export function WaselWhyCard({
  ar,
  compact = false,
}: {
  ar: boolean;
  compact?: boolean;
}) {
  const profile = getWaselPresenceProfile();

  return (
    <section
      className="wasel-lift-card"
      style={{
        borderRadius: compact ? 20 : 24,
        padding: compact ? '16px 16px 15px' : '22px 22px 20px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        border: '1px solid rgba(93,150,210,0.14)',
        boxShadow: '0 18px 48px rgba(1,10,18,0.18)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          borderRadius: 999,
          background: 'rgba(107,181,21,0.12)',
          border: '1px solid rgba(107,181,21,0.22)',
          color: '#6BB515',
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
          color: 'rgba(234,247,255,0.82)',
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

export function WaselBusinessFooter({
  ar,
}: {
  ar: boolean;
}) {
  const profile = getWaselPresenceProfile();

  return (
    <section
      className="wasel-lift-card"
      style={{
        borderRadius: 24,
        padding: '18px 18px 16px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        border: '1px solid rgba(93,150,210,0.14)',
        boxShadow: '0 20px 48px rgba(1,10,18,0.18)',
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
              color: '#EAF7FF',
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
              color: 'rgba(234,247,255,0.72)',
              fontSize: '0.8rem',
              fontFamily: FONT,
            }}
          >
            <MapPin size={14} color="#A8D614" />
            {ar ? profile.businessAddressAr : profile.businessAddress}
          </div>
        </div>
        <WaselContactActionRow ar={ar} compact />
      </div>
      <div
        style={{
          color: 'rgba(234,247,255,0.72)',
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

export function WaselPresenceStrip({
  ar,
}: {
  ar: boolean;
}) {
  const profile = getWaselPresenceProfile();

  return (
    <section
      className="wasel-lift-card"
      style={{
        borderRadius: 20,
        padding: '12px 14px',
        background: 'linear-gradient(135deg, rgba(71,183,230,0.1), rgba(255,255,255,0.03) 52%, rgba(168,214,20,0.07))',
        border: '1px solid rgba(93,150,210,0.16)',
        boxShadow: '0 16px 36px rgba(1,10,18,0.16)',
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
              background: 'rgba(6,23,38,0.48)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#47B7E6',
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
          <div style={{ color: '#EAF7FF', fontFamily: DISPLAY, fontSize: '0.96rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
            {ar ? profile.actionSummary.ar : profile.actionSummary.en}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', color: 'rgba(234,247,255,0.68)', fontSize: '0.76rem', fontFamily: FONT }}>
            <span>{profile.supportPhoneDisplay || profile.supportEmail}</span>
            <span>{ar ? profile.businessAddressAr : profile.businessAddress}</span>
          </div>
        </div>
        <WaselContactActionRow ar={ar} compact />
      </div>
    </section>
  );
}
