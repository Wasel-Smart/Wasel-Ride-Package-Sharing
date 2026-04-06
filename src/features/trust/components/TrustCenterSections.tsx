import { type ReactNode } from 'react';
import { AlertTriangle, ChevronRight, Shield } from 'lucide-react';
import {
  WaselContactActionRow,
  WaselFounderCard,
  WaselProofOfLifeBlock,
  WaselWhyCard,
} from '../../../components/system/WaselPresence';

export const TRUST_THEME = {
  bg: '#061726',
  card: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
  border: 'rgba(73,190,242,0.14)',
  cyan: '#16C7F2',
  green: '#60C536',
  gold: '#C7FF1A',
  red: '#EF4444',
  font: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
  display: "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', sans-serif)",
} as const;

type VerificationTone = {
  color: string;
  label: string;
};

type TrustPageScaffoldProps = {
  ar: boolean;
  children: ReactNode;
};

type TrustHeroCardProps = {
  title: string;
  description: string;
  verificationTone: VerificationTone;
  trustScoreLabel: string;
  liveProfileLabel: string;
  readinessLabel: string;
};

type TrustPresencePanelsProps = {
  ar: boolean;
  contactTitle: string;
  contactDescription: string;
};

export type TrustActionRowItem = {
  label: string;
  sub: string;
  icon: ReactNode;
  accent: string;
  onClick: () => void;
};

type TrustVerificationListProps = {
  items: TrustActionRowItem[];
};

export type TrustReadinessStep = {
  id: string;
  label: string;
  description: string;
  complete: boolean;
};

type TrustDriverReadinessCardProps = {
  title: string;
  headline: string;
  detail: string;
  steps: TrustReadinessStep[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
};

export type TrustCapabilityItem = {
  title: string;
  description: string;
  allowed: boolean;
  statusLabel: string;
};

type TrustCapabilityMatrixProps = {
  title: string;
  items: TrustCapabilityItem[];
};

export type TrustSignalItem = {
  title: string;
  desc: string;
  accent: string;
};

type TrustSignalsCardProps = {
  title: string;
  items: TrustSignalItem[];
};

type TrustNextStepsCardProps = {
  title: string;
  body: string;
};

function TrustSectionCard({
  children,
  padding = '18px',
  overflow = 'visible',
}: {
  children: ReactNode;
  padding?: string;
  overflow?: 'visible' | 'hidden';
}) {
  return (
    <div
      style={{
        background: TRUST_THEME.card,
        border: `1px solid ${TRUST_THEME.border}`,
        borderRadius: 18,
        padding,
        overflow,
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );
}

function TrustSectionTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        color: '#EFF6FF',
        fontWeight: 700,
        fontSize: '0.98rem',
        marginBottom: 12,
        fontFamily: TRUST_THEME.display,
        letterSpacing: '-0.03em',
      }}
    >
      {children}
    </div>
  );
}

function TrustActionRow({
  item,
  isLast = false,
}: {
  item: TrustActionRowItem;
  isLast?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : `1px solid ${TRUST_THEME.border}`,
        padding: '16px 18px',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: `${item.accent}18`,
          border: `1px solid ${item.accent}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: item.accent,
          flexShrink: 0,
        }}
      >
        {item.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: '#EFF6FF',
            fontWeight: 700,
            fontFamily: TRUST_THEME.font,
            fontSize: '0.92rem',
          }}
        >
          {item.label}
        </div>
        <div
          style={{
            color: 'rgba(148,163,184,0.72)',
            fontFamily: TRUST_THEME.font,
            fontSize: '0.78rem',
            marginTop: 4,
            lineHeight: 1.55,
          }}
        >
          {item.sub}
        </div>
      </div>
      <ChevronRight size={16} color="rgba(148,163,184,0.45)" />
    </button>
  );
}

export function TrustPageScaffold({ ar, children }: TrustPageScaffoldProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: TRUST_THEME.bg,
        fontFamily: TRUST_THEME.font,
        direction: ar ? 'rtl' : 'ltr',
        paddingBottom: 80,
      }}
    >
      <style>{`
        @media (max-width: 720px) {
          .trust-hero-row,
          .trust-contact-row,
          .trust-story-grid,
          .trust-signal-grid,
          .trust-capability-grid {
            grid-template-columns: 1fr !important;
          }

          .trust-hero-row {
            display: grid !important;
          }
        }
      `}</style>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 16px 0' }}>{children}</div>
    </div>
  );
}

export function TrustHeroCard({
  title,
  description,
  verificationTone,
  trustScoreLabel,
  liveProfileLabel,
  readinessLabel,
}: TrustHeroCardProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(22,199,242,0.16), rgba(255,255,255,0.03))',
        border: '1px solid rgba(22,199,242,0.22)',
        borderRadius: 24,
        padding: '24px 22px',
        marginBottom: 20,
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
      }}
    >
      <div
        className="trust-hero-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: 14,
          alignItems: 'start',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'rgba(22,199,242,0.15)',
            border: '1px solid rgba(22,199,242,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: TRUST_THEME.cyan,
          }}
        >
          <Shield size={24} />
        </div>
        <div>
          <div
            style={{
              color: '#EFF6FF',
              fontSize: '1.45rem',
              fontWeight: 700,
              fontFamily: TRUST_THEME.display,
              letterSpacing: '-0.04em',
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: 'rgba(148,163,184,0.78)',
              fontSize: '0.84rem',
              marginTop: 5,
              lineHeight: 1.7,
            }}
          >
            {description}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <span
          style={{
            padding: '6px 11px',
            borderRadius: 999,
            background: `${verificationTone.color}1A`,
            border: `1px solid ${verificationTone.color}33`,
            color: verificationTone.color,
            fontSize: '0.72rem',
            fontWeight: 800,
          }}
        >
          {verificationTone.label}
        </span>
        <span
          style={{
            padding: '6px 11px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${TRUST_THEME.border}`,
            color: '#CBD5E1',
            fontSize: '0.72rem',
            fontWeight: 700,
          }}
        >
          {trustScoreLabel}
        </span>
        <span
          style={{
            padding: '6px 11px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${TRUST_THEME.border}`,
            color: '#CBD5E1',
            fontSize: '0.72rem',
            fontWeight: 700,
          }}
        >
          {liveProfileLabel}
        </span>
        <span
          style={{
            padding: '6px 11px',
            borderRadius: 999,
            background: `${TRUST_THEME.cyan}12`,
            border: `1px solid ${TRUST_THEME.cyan}24`,
            color: TRUST_THEME.cyan,
            fontSize: '0.72rem',
            fontWeight: 700,
          }}
        >
          {readinessLabel}
        </span>
      </div>
    </div>
  );
}

export function TrustPresencePanels({
  ar,
  contactTitle,
  contactDescription,
}: TrustPresencePanelsProps) {
  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <WaselProofOfLifeBlock ar={ar} compact />
      </div>

      <div
        className="trust-story-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <WaselWhyCard ar={ar} compact />
        <WaselFounderCard ar={ar} compact />
      </div>

      <TrustSectionCard>
        <div
          className="trust-contact-row"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                color: '#EFF6FF',
                fontWeight: 700,
                fontFamily: TRUST_THEME.display,
                fontSize: '1rem',
                letterSpacing: '-0.03em',
              }}
            >
              {contactTitle}
            </div>
            <div
              style={{
                color: 'rgba(148,163,184,0.78)',
                fontSize: '0.8rem',
                lineHeight: 1.65,
                marginTop: 4,
              }}
            >
              {contactDescription}
            </div>
          </div>
          <WaselContactActionRow ar={ar} compact />
        </div>
      </TrustSectionCard>
    </>
  );
}

export function TrustVerificationList({ items }: TrustVerificationListProps) {
  return (
    <TrustSectionCard padding="0" overflow="hidden">
      {items.map((item, index) => (
        <TrustActionRow key={item.label} item={item} isLast={index === items.length - 1} />
      ))}
    </TrustSectionCard>
  );
}

export function TrustDriverReadinessCard({
  title,
  headline,
  detail,
  steps,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
}: TrustDriverReadinessCardProps) {
  return (
    <TrustSectionCard>
      <TrustSectionTitle>{title}</TrustSectionTitle>
      <div
        style={{
          color: 'rgba(148,163,184,0.78)',
          fontSize: '0.8rem',
          lineHeight: 1.65,
          marginBottom: 14,
        }}
      >
        {headline} · {detail}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {steps.map((step) => (
          <div
            key={step.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${step.complete ? `${TRUST_THEME.green}33` : TRUST_THEME.border}`,
              borderRadius: 14,
              padding: '12px 13px',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: step.complete ? `${TRUST_THEME.green}18` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${step.complete ? `${TRUST_THEME.green}33` : TRUST_THEME.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: step.complete ? TRUST_THEME.green : '#CBD5E1',
                fontSize: '0.72rem',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {step.complete ? 'OK' : '...'}
            </div>
            <div>
              <div style={{ color: '#EFF6FF', fontWeight: 700, fontSize: '0.82rem' }}>{step.label}</div>
              <div
                style={{
                  color: 'rgba(148,163,184,0.78)',
                  fontSize: '0.75rem',
                  marginTop: 4,
                  lineHeight: 1.55,
                }}
              >
                {step.description}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
        <button
          type="button"
          onClick={onPrimaryAction}
          style={{
            border: 'none',
            borderRadius: 12,
            background: `linear-gradient(135deg, ${TRUST_THEME.cyan}, #0F78BF)`,
            color: '#041018',
            fontWeight: 800,
            padding: '11px 16px',
            cursor: 'pointer',
          }}
        >
          {primaryActionLabel}
        </button>
        <button
          type="button"
          onClick={onSecondaryAction}
          style={{
            border: `1px solid ${TRUST_THEME.border}`,
            borderRadius: 12,
            background: 'transparent',
            color: '#EFF6FF',
            fontWeight: 700,
            padding: '11px 16px',
            cursor: 'pointer',
          }}
        >
          {secondaryActionLabel}
        </button>
      </div>
    </TrustSectionCard>
  );
}

export function TrustCapabilityMatrix({
  title,
  items,
}: TrustCapabilityMatrixProps) {
  return (
    <TrustSectionCard>
      <TrustSectionTitle>{title}</TrustSectionTitle>
      <div
        className="trust-capability-grid"
        style={{
          display: 'grid',
          gap: 10,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {items.map((item) => (
          <div
            key={item.title}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${TRUST_THEME.border}`,
              borderRadius: 14,
              padding: '12px 13px',
              gap: 12,
            }}
          >
            <div>
              <div style={{ color: '#EFF6FF', fontWeight: 700, fontSize: '0.82rem' }}>{item.title}</div>
              <div
                style={{
                  color: 'rgba(148,163,184,0.78)',
                  fontSize: '0.74rem',
                  marginTop: 4,
                  lineHeight: 1.55,
                }}
              >
                {item.description}
              </div>
            </div>
            <span
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                background: item.allowed ? `${TRUST_THEME.green}1A` : `${TRUST_THEME.gold}1A`,
                border: `1px solid ${item.allowed ? `${TRUST_THEME.green}33` : `${TRUST_THEME.gold}33`}`,
                color: item.allowed ? TRUST_THEME.green : TRUST_THEME.gold,
                fontSize: '0.72rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              {item.statusLabel}
            </span>
          </div>
        ))}
      </div>
    </TrustSectionCard>
  );
}

export function TrustSignalsCard({ title, items }: TrustSignalsCardProps) {
  return (
    <TrustSectionCard>
      <TrustSectionTitle>{title}</TrustSectionTitle>
      <div
        className="trust-signal-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {items.map((item) => (
          <div
            key={item.title}
            style={{
              borderRadius: 14,
              padding: '12px 13px',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${item.accent}22`,
            }}
          >
            <div
              style={{
                color: item.accent,
                fontWeight: 800,
                fontSize: '0.84rem',
                marginBottom: 4,
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                color: 'rgba(148,163,184,0.78)',
                fontSize: '0.76rem',
                lineHeight: 1.55,
              }}
            >
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </TrustSectionCard>
  );
}

export function TrustNextStepsCard({ title, body }: TrustNextStepsCardProps) {
  return (
    <TrustSectionCard padding="20px 18px">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <AlertTriangle size={16} color={TRUST_THEME.gold} />
        <TrustSectionTitle>{title}</TrustSectionTitle>
      </div>
      <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.82rem', lineHeight: 1.7 }}>
        {body}
      </div>
    </TrustSectionCard>
  );
}

