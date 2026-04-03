import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, type LucideIcon } from 'lucide-react';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import {
  WaselBusinessFooter,
  WaselContactActionRow,
  WaselProofOfLifeBlock,
  WaselWhyCard,
} from '../../components/system/WaselPresence';
import { MobilityOSLandingMap } from './MobilityOSLandingMap';

export const LANDING_COLORS = {
  bg: '#040C18',
  text: '#EFF6FF',
  muted: 'rgba(239,246,255,0.76)',
  soft: 'rgba(239,246,255,0.58)',
  cyan: '#55E9FF',
  blue: '#1EA1FF',
  gold: '#F5B11E',
  green: '#33E85F',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(85,233,255,0.16)',
} as const;

export const LANDING_FONT = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";
export const LANDING_DISPLAY = "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', sans-serif)";

export const LANDING_RESPONSIVE_STYLES = `
  :root { color-scheme: dark; }
  @media (max-width: 1120px) {
    .landing-main-grid { grid-template-columns: 1fr !important; }
    .landing-bottom-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 840px) {
    .landing-action-grid { grid-template-columns: 1fr !important; }
    .landing-signal-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .landing-header-row { flex-direction: column !important; align-items: flex-start !important; }
    .landing-cta-row { flex-direction: column !important; align-items: stretch !important; }
    .landing-map-shell { padding: 12px !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

export type LandingActionCard = {
  title: string;
  detail: string;
  path: string;
  icon: LucideIcon;
  color: string;
};

export type LandingSignalCard = {
  title: string;
  detail: string;
  accent: string;
};

export type LandingSlotId = 'hero' | 'map' | 'signals' | 'why' | 'trust' | 'footer';

export type LandingRowDefinition = {
  id: string;
  className?: string;
  style?: CSSProperties;
  slots: readonly LandingSlotId[];
};

type LandingPageFrameProps = {
  children: ReactNode;
};

type LandingHeaderProps = {
  ar: boolean;
};

type LandingHeroSectionProps = {
  ar: boolean;
  openAppLabel: string;
  primaryAppPath: string;
  mobilityOsPath: string;
  myTripsPath: string;
  supportLine: string;
  businessAddress: string;
  heroBullets: readonly string[];
  primaryActions: readonly LandingActionCard[];
  onNavigate: (path: string) => void;
};

type LandingMapSectionProps = {
  ar: boolean;
};

type LandingSignalSectionProps = {
  cards: readonly LandingSignalCard[];
};

type LandingTrustSectionProps = {
  ar: boolean;
};

type LandingSlotRowsProps = {
  rows: readonly LandingRowDefinition[];
  slots: Partial<Record<LandingSlotId, ReactNode>>;
};

export function LandingPageFrame({ children }: LandingPageFrameProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: LANDING_COLORS.bg,
        color: LANDING_COLORS.text,
        fontFamily: LANDING_FONT,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{LANDING_RESPONSIVE_STYLES}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 8% 10%, rgba(85,233,255,0.14), transparent 28%),
            radial-gradient(circle at 82% 12%, rgba(245,177,30,0.12), transparent 24%),
            radial-gradient(circle at 72% 76%, rgba(51,232,95,0.10), transparent 18%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))
          `,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', maxWidth: 1420, margin: '0 auto', padding: '28px 20px 84px' }}>
        {children}
      </div>
    </div>
  );
}

export function LandingHeader({ ar }: LandingHeaderProps) {
  return (
    <motion.div
      className="landing-header-row"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        marginBottom: 28,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <WaselLogo size={44} theme="light" />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 14px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${LANDING_COLORS.borderStrong}`,
            color: LANDING_COLORS.muted,
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: LANDING_COLORS.green,
              boxShadow: `0 0 12px ${LANDING_COLORS.green}`,
            }}
          />
          {ar ? 'شبكة الأردن الحية' : 'Jordan mobility network'}
        </div>
      </div>
      <WaselContactActionRow ar={ar} />
    </motion.div>
  );
}

export function LandingHeroSection({
  ar,
  openAppLabel,
  primaryAppPath,
  mobilityOsPath,
  myTripsPath,
  supportLine,
  businessAddress,
  heroBullets,
  primaryActions,
  onNavigate,
}: LandingHeroSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      style={{ display: 'grid', gap: 18 }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          width: 'fit-content',
          padding: '8px 12px',
          borderRadius: 999,
          background: 'rgba(85,233,255,0.08)',
          border: `1px solid ${LANDING_COLORS.borderStrong}`,
          color: LANDING_COLORS.cyan,
          fontSize: '0.75rem',
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {ar ? 'Mobility OS للأردن' : 'Mobility OS for Jordan'}
      </div>

      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: LANDING_DISPLAY,
            fontSize: 'clamp(2.9rem, 6vw, 5.8rem)',
            lineHeight: 0.92,
            letterSpacing: '-0.08em',
            fontWeight: 700,
            maxWidth: 760,
          }}
        >
          <span
            style={{
              display: 'block',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #D4FBFF 28%, #55E9FF 62%, #33E85F 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {ar ? 'افهم المسار قبل أن تحجزه.' : 'Understand the route before you book it.'}
          </span>
          <span style={{ display: 'block', marginTop: 12 }}>
            {ar ? 'شبكة واحدة تنقل الناس والطرود بين المدن.' : 'One network moving people and packages between cities.'}
          </span>
        </h1>

        <p
          style={{
            margin: '18px 0 0',
            maxWidth: 760,
            color: LANDING_COLORS.muted,
            fontSize: '1.02rem',
            lineHeight: 1.82,
          }}
        >
          {ar
            ? 'يعرض Wasel الممرات الأقوى، أوقات الذروة، الساعات الهادئة، وأفضل المسارات بين المدن قبل أن يدخل المستخدم في تفاصيل الحجز أو التتبع. الفكرة واضحة من أول شاشة: القرار يبدأ من فهم الشبكة.'
            : 'Wasel starts with the network itself. Users can compare busy windows, calmer hours, and the strongest city-to-city corridors before they commit to booking, tracking, or sending a package.'}
        </p>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {heroBullets.map((item) => (
          <div
            key={item}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${LANDING_COLORS.border}`,
              color: LANDING_COLORS.text,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: LANDING_COLORS.cyan,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>{item}</span>
          </div>
        ))}
      </div>

      <div className="landing-cta-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => onNavigate(primaryAppPath)}
          style={{
            height: 50,
            padding: '0 22px',
            borderRadius: 18,
            border: 'none',
            background: 'linear-gradient(135deg, #17C7EA, #1E7CFF)',
            color: '#F8FBFF',
            fontWeight: 900,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 18px 44px rgba(30,124,255,0.28)',
          }}
        >
          {openAppLabel}
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(mobilityOsPath)}
          style={{
            height: 50,
            padding: '0 20px',
            borderRadius: 18,
            border: `1px solid ${LANDING_COLORS.borderStrong}`,
            background: 'rgba(255,255,255,0.03)',
            color: LANDING_COLORS.text,
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
          }}
        >
          {ar ? 'شاهد Mobility OS' : 'Watch Mobility OS'}
        </button>
        <button
          type="button"
          onClick={() => onNavigate(myTripsPath)}
          style={{
            height: 50,
            padding: '0 18px',
            borderRadius: 18,
            border: `1px solid ${LANDING_COLORS.border}`,
            background: 'transparent',
            color: LANDING_COLORS.soft,
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          {ar ? 'تتبع الرحلات' : 'Track trips'}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          color: LANDING_COLORS.soft,
          fontSize: '0.84rem',
        }}
      >
        <span>{supportLine}</span>
        <span
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'rgba(239,246,255,0.28)',
          }}
        />
        <span>{businessAddress}</span>
      </div>

      <div className="landing-action-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        {primaryActions.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.title}
              type="button"
              onClick={() => onNavigate(card.path)}
              className="wasel-lift-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 10,
                minHeight: 154,
                padding: '18px 18px 16px',
                borderRadius: 22,
                textAlign: 'left',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))',
                border: `1px solid ${card.color}30`,
                boxShadow: '0 18px 44px rgba(0,0,0,0.18)',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 16,
                  display: 'grid',
                  placeItems: 'center',
                  background: `${card.color}18`,
                  border: `1px solid ${card.color}42`,
                }}
              >
                <Icon size={20} color={card.color} />
              </div>
              <div
                style={{
                  color: LANDING_COLORS.text,
                  fontWeight: 900,
                  fontSize: '0.98rem',
                  letterSpacing: '-0.03em',
                }}
              >
                {card.title}
              </div>
              <div style={{ color: LANDING_COLORS.soft, fontSize: '0.8rem', lineHeight: 1.65, flex: 1 }}>
                {card.detail}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: card.color,
                  fontSize: '0.76rem',
                  fontWeight: 800,
                }}
              >
                {ar ? 'افتح' : 'Open'}
                <ArrowRight size={14} />
              </div>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}

export function LandingMapSection({ ar }: LandingMapSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.52 }}
      style={{ display: 'grid', gap: 14 }}
    >
      <div
        className="landing-map-shell wasel-lift-card"
        style={{
          borderRadius: 30,
          padding: 14,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))',
          border: `1px solid ${LANDING_COLORS.borderStrong}`,
          boxShadow: '0 28px 78px rgba(0,0,0,0.24)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                color: LANDING_COLORS.cyan,
                fontSize: '0.74rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 900,
              }}
            >
              {ar ? 'عرض الشبكة الحية' : 'Live corridor view'}
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily: LANDING_DISPLAY,
                fontSize: '1.12rem',
                fontWeight: 700,
                letterSpacing: '-0.03em',
              }}
            >
              {ar ? 'ابدأ من الخريطة ثم ادخل إلى الرحلة المناسبة' : 'Start from the map, then move into the right trip'}
            </div>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${LANDING_COLORS.border}`,
              color: LANDING_COLORS.soft,
              fontSize: '0.8rem',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: LANDING_COLORS.green,
                boxShadow: `0 0 10px ${LANDING_COLORS.green}`,
              }}
            />
            {ar ? 'الضغط والمسارات والهدوء في شاشة واحدة' : 'Pressure, best lanes, and calm windows in one view'}
          </div>
        </div>

        <div style={{ borderRadius: 22, overflow: 'hidden' }}>
          <MobilityOSLandingMap />
        </div>
      </div>
    </motion.section>
  );
}

export function LandingSignalSection({ cards }: LandingSignalSectionProps) {
  return (
    <>
      {cards.map((card) => (
        <div
          key={card.title}
          className="wasel-lift-card"
          style={{
            borderRadius: 22,
            padding: '18px 18px 16px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            border: `1px solid ${LANDING_COLORS.border}`,
            boxShadow: '0 18px 38px rgba(0,0,0,0.16)',
          }}
        >
          <div
            style={{
              color: card.accent,
              fontSize: '0.74rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 900,
            }}
          >
            {card.title}
          </div>
          <p style={{ margin: '10px 0 0', color: LANDING_COLORS.soft, fontSize: '0.86rem', lineHeight: 1.7 }}>
            {card.detail}
          </p>
        </div>
      ))}
    </>
  );
}

export function LandingTrustSection({ ar }: LandingTrustSectionProps) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div
        className="wasel-lift-card"
        style={{
          borderRadius: 22,
          padding: '18px 18px 16px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          border: `1px solid ${LANDING_COLORS.border}`,
          boxShadow: '0 18px 38px rgba(0,0,0,0.16)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 16,
              display: 'grid',
              placeItems: 'center',
              background: `${LANDING_COLORS.green}14`,
              border: `1px solid ${LANDING_COLORS.green}30`,
            }}
          >
            <ShieldCheck size={18} color={LANDING_COLORS.green} />
          </div>
          <div>
            <div
              style={{
                color: LANDING_COLORS.text,
                fontWeight: 900,
                fontSize: '1rem',
                letterSpacing: '-0.03em',
              }}
            >
              {ar ? 'الثقة ظاهرة وليست مخفية' : 'Trust stays visible'}
            </div>
            <div
              style={{
                marginTop: 4,
                color: LANDING_COLORS.soft,
                fontSize: '0.82rem',
                lineHeight: 1.6,
              }}
            >
              {ar
                ? 'الهوية، العنوان، قنوات الاتصال، وإشارات الحياة التجارية تظهر مبكرا بدل أن تبقى مدفونة.'
                : 'Identity, address, contact channels, and proof-of-life signals appear early instead of being buried.'}
            </div>
          </div>
        </div>
      </div>
      <WaselProofOfLifeBlock ar={ar} />
    </div>
  );
}

export function LandingSlotRows({ rows, slots }: LandingSlotRowsProps) {
  return (
    <>
      {rows.map((row) => {
        const renderedSlots = row.slots.flatMap((slotId) =>
          slots[slotId] ? [{ id: slotId, node: slots[slotId] as ReactNode }] : [],
        );

        if (renderedSlots.length === 0) return null;

        return (
          <div key={row.id} className={row.className} style={row.style}>
            {renderedSlots.map((slot) => (
              <Fragment key={slot.id}>{slot.node}</Fragment>
            ))}
          </div>
        );
      })}
    </>
  );
}

export function LandingWhySlot({ ar }: { ar: boolean }) {
  return <WaselWhyCard ar={ar} compact />;
}

export function LandingFooterSlot({ ar }: { ar: boolean }) {
  return <WaselBusinessFooter ar={ar} />;
}
