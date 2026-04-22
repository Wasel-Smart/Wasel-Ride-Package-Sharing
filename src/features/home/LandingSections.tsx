import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, ShieldCheck, type LucideIcon } from 'lucide-react';
import { WaselLogo, WaselMark } from '../../components/wasel-ds/WaselLogo';
import {
  WaselBusinessFooter,
  WaselContactActionRow,
  WaselProofOfLifeBlock,
  WaselWhyCard,
} from '../../components/system/WaselPresence';
import { useTheme } from '../../contexts/ThemeContext';
import { DeferredLandingMap } from './DeferredLandingMap';
import {
  LANDING_DISPLAY,
  LANDING_FONT,
  LANDING_RESPONSIVE_STYLES,
} from './landingConstants';
import { GRAD_AURORA, GRAD_HERO, GRAD_SIGNAL, SH } from '../../utils/wasel-ds';

export const LANDING_COLORS = {
  bg: 'var(--background)',
  bgDeep: 'var(--wasel-surface-0)',
  panel: 'var(--wasel-panel-strong)',
  panelSoft: 'var(--wasel-panel-muted)',
  text: 'var(--wasel-copy-primary)',
  muted: 'var(--wasel-copy-muted)',
  soft: 'var(--wasel-copy-soft)',
  cyan: 'var(--ds-accent, #E67E22)',
  blue: 'var(--ds-accent-strong, #F5B041)',
  gold: 'var(--wasel-brand-gradient-start, #F5B041)',
  green: 'var(--ds-accent-strong, #F5B041)',
  border: 'var(--ds-border, #313841)',
  borderStrong:
    'color-mix(in srgb, var(--ds-accent-strong, #F5B041) 30%, var(--ds-border, #313841))',
} as const;

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
  trendLabel: string;
  trendDirection: 'up' | 'down';
  intensity: string;
  sparkline: readonly number[];
};
export type LandingSlotId = 'hero' | 'map' | 'signals' | 'why' | 'trust' | 'footer';
export type LandingRowDefinition = {
  id: string;
  className?: string;
  style?: CSSProperties;
  slots: readonly LandingSlotId[];
};

type LandingPageFrameProps = { children: ReactNode };
type LandingHeaderProps = {
  ar: boolean;
  signinPath?: string;
  signupPath?: string;
  showAuthActions?: boolean;
  onNavigate?: (path: string) => void;
};
type LandingHeroSectionProps = {
  ar: boolean;
  emailAuthPath: string;
  signupAuthPath: string;
  findRidePath: string;
  mobilityOsPath: string;
  myTripsPath: string;
  supportLine: string;
  businessAddress: string;
  heroBullets: readonly string[];
  primaryActions: readonly LandingActionCard[];
  stats?: readonly {
    label: string;
    value: string;
  }[];
  ctaLabel?: string;
  authError?: string;
  oauthLoadingProvider?: 'google' | 'facebook' | null;
  showQuickAuth?: boolean;
  onGoogleAuth?: () => void;
  onFacebookAuth?: () => void;
  onNavigate: (path: string) => void;
};
type LandingMapSectionProps = {
  ar: boolean;
  onNavigate?: (path: string) => void;
  mobilityOsPath?: string;
  findRidePath?: string;
  packagesPath?: string;
};
type LandingSignalSectionProps = { cards: readonly LandingSignalCard[] };
type LandingTrustSectionProps = { ar: boolean };
type LandingSlotRowsProps = {
  rows: readonly LandingRowDefinition[];
  slots: Partial<Record<LandingSlotId, ReactNode>>;
};

const panel = (radius = 28): CSSProperties => ({
  borderRadius: radius,
  background: 'var(--wasel-panel-strong)',
  border: `1px solid ${LANDING_COLORS.border}`,
  boxShadow: 'var(--wasel-shadow-lg)',
  backdropFilter: 'blur(22px)',
});
const copy = (value: string) => value;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function LandingPageFrame({ children }: LandingPageFrameProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--wasel-shell-background)',
        color: LANDING_COLORS.text,
        fontFamily: LANDING_FONT,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{LANDING_RESPONSIVE_STYLES}</style>
      <style>{`
        @keyframes landing-orbit-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes landing-orbit-reverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes landing-mark-float {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(0, -12px) scale(1.035); }
          100% { transform: translate(0, 0) scale(1); }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: GRAD_HERO, pointerEvents: 'none' }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `${GRAD_AURORA}, radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--ds-accent, #E67E22) 18%, transparent), transparent 26%), radial-gradient(circle at 72% 68%, color-mix(in srgb, var(--ds-accent-strong, #F5B041) 14%, transparent), transparent 18%)`,
          pointerEvents: 'none',
          opacity: 0.96,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0) 16%, rgba(255,255,255,0) 84%, rgba(255,255,255,0.03) 100%)',
          opacity: 0.28,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
      <div
        className="landing-shell"
        style={{
          position: 'relative',
          maxWidth: 1380,
          margin: '0 auto',
          padding: '28px 20px 84px',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function LandingHeader({
  ar,
  signinPath,
  signupPath,
  showAuthActions = false,
  onNavigate,
}: LandingHeaderProps) {
  const { resolvedTheme } = useTheme();
  const canShowAuthActions = Boolean(showAuthActions && signinPath && signupPath && onNavigate);
  const logoTheme = resolvedTheme === 'light' ? 'dark' : 'light';

  const headerAuthButtonBase: CSSProperties = {
    minHeight: 46,
    minWidth: 124,
    padding: '0 20px',
    borderRadius: 18,
    fontSize: '0.9rem',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
  };

  return (
    <div
      className="landing-header-row"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <WaselLogo
          size={34}
          theme={logoTheme}
          variant="full"
          subtitle="Mobility OS"
          style={{
            filter:
              'drop-shadow(0 0 18px rgba(255,179,87,0.16)) drop-shadow(0 0 22px rgba(245,154,44,0.12))',
          }}
        />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            borderRadius: 999,
            background: 'rgba(9,31,48,0.58)',
            border: `1px solid rgba(79,213,255,0.18)`,
            color: LANDING_COLORS.muted,
            fontSize: '0.8rem',
            fontWeight: 800,
          }}
        >
          <span
            className="landing-live-dot"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: LANDING_COLORS.green,
              boxShadow: `0 0 14px ${LANDING_COLORS.green}`,
            }}
          />
          {copy(ar ? 'شبكة الأردن الحية' : 'Jordan mobility network')}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {canShowAuthActions ? (
          <>
            <button
              aria-label={copy(
                ar ? 'تسجيل الدخول من شريط الرأس' : 'Sign in from header',
              )}
              type="button"
              onClick={() => {
                if (signinPath) {
                  onNavigate?.(signinPath);
                }
              }}
              style={{
                ...headerAuthButtonBase,
                border: `1px solid ${LANDING_COLORS.borderStrong}`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))',
                color: LANDING_COLORS.text,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 30px rgba(1,10,18,0.18)',
              }}
            >
              {copy(ar ? 'تسجيل الدخول' : 'Sign in')}
            </button>
            <button
              aria-label={copy(
                ar ? 'إنشاء حساب من شريط الرأس' : 'Sign up from header',
              )}
              type="button"
              onClick={() => {
                if (signupPath) {
                  onNavigate?.(signupPath);
                }
              }}
              style={{
                ...headerAuthButtonBase,
                border: 'none',
                background:
                  'linear-gradient(135deg, var(--wasel-brand-gradient-start) 0%, var(--wasel-brand-gradient-end) 100%)',
                color: '#FFFDF9',
                boxShadow:
                  '0 18px 40px color-mix(in srgb, var(--wasel-brand-gradient-end) 26%, transparent)',
              }}
            >
              {copy(ar ? 'إنشاء حساب' : 'Sign up')}
            </button>
          </>
        ) : null}
        <WaselContactActionRow ar={ar} />
      </div>
    </div>
  );
}

export function LandingHeroSection({
  ar,
  emailAuthPath,
  signupAuthPath,
  findRidePath,
  mobilityOsPath,
  myTripsPath,
  supportLine,
  businessAddress,
  heroBullets,
  primaryActions,
  stats,
  ctaLabel,
  authError,
  oauthLoadingProvider,
  showQuickAuth = false,
  onGoogleAuth,
  onFacebookAuth,
  onNavigate,
}: LandingHeroSectionProps) {
  const bullets = heroBullets.slice(0, 2);
  const isGoogleLoading = oauthLoadingProvider === 'google';
  const isFacebookLoading = oauthLoadingProvider === 'facebook';
  const highlights = [
    {
      label: ar ? '???? ????' : 'One system',
      value: ar
        ? '??????? ??????? ?? ????? ?????.'
        : 'Map and action in one place.',
    },
    {
      label: ar ? '?????? ???? ?????' : 'Two flows, one language',
      value: ar
        ? '??????? ??????? ??? ??? ??????.'
        : 'Rides and packages share the same lanes.',
    },
  ] as const;
  const heroLogoSignals = [
    ar ? '?????? ????? ??????' : 'Live network identity',
    ar ? '???? + ???? + ??????' : 'Rides + packages + routes',
    ar ? '???? ?????? ??????' : 'Built for mobile and web',
  ] as const;
  const heroMetricPills = [
    ar ? '????? ???? ?????' : 'Live map first',
    ar ? '????? ????' : 'Cleaner first view',
    ar ? '????? ????' : 'Sharper brand mark',
  ] as const;
  const serviceStats = stats?.length
    ? stats.slice(0, 3)
    : [
        { label: ar ? '????? ???? ?????' : 'Live map first', value: ar ? '?????' : 'Enabled' },
        { label: ar ? '????? ????' : 'Cleaner first view', value: ar ? '????' : 'Stable' },
        { label: ar ? '????? ????' : 'Sharper brand mark', value: ar ? '????' : 'Live' },
      ];
  const serviceCtaLabel = ctaLabel ?? (ar ? '???? ?????? ??????' : 'Explore services');
  return (
    <section style={{ display: 'grid', gap: 16, height: '100%' }}>
      <div
        className="landing-glow-card"
        style={{
          ...panel(34),
          padding: '24px',
          display: 'grid',
          gap: 22,
          alignContent: 'start',
          minHeight: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--ds-accent) 18%, transparent), transparent 32%), radial-gradient(circle at 82% 26%, color-mix(in srgb, var(--ds-accent-strong) 14%, transparent), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))',
            pointerEvents: 'none',
          }}
        />
        <div
          className="landing-hero-shell"
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.02fr) minmax(340px, 0.98fr)',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                width: 'fit-content',
                padding: '8px 12px',
                borderRadius: 999,
                background: 'color-mix(in srgb, var(--ds-accent) 12%, transparent)',
                border: `1px solid ${LANDING_COLORS.borderStrong}`,
                color: LANDING_COLORS.cyan,
                fontSize: '0.75rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {copy(ar ? 'Mobility OS ??????' : 'Mobility OS for Jordan')}
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <h1
                style={{
                  margin: 0,
                  maxWidth: 720,
                  fontFamily: LANDING_DISPLAY,
                  fontSize: 'clamp(2.7rem, 5vw, 5.15rem)',
                  lineHeight: 0.94,
                  letterSpacing: '-0.06em',
                  fontWeight: 700,
                }}
              >
                <span style={{ display: 'block', color: LANDING_COLORS.text }}>
                  {copy(ar ? '???? ?? ???????.' : 'Move by map.')}
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 10,
                    background: GRAD_SIGNAL,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {copy(
                    ar
                      ? '????? ????? ??? ???? ?????.'
                      : 'Rides and packages, one network.',
                  )}
                </span>
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: 620,
                  color: LANDING_COLORS.muted,
                  fontSize: '1rem',
                  lineHeight: 1.74,
                }}
              >
                {copy(
                  ar
                    ? '???? ?????? ????? ?? ???? ??????.'
                    : 'See the network first, then choose a service.',
                )}
              </p>
            </div>
            <div style={{ display: 'grid', gap: 10, maxWidth: 620 }}>
              {bullets.map((bullet, index) => (
                <div
                  key={`hero-bullet-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    color: LANDING_COLORS.soft,
                    fontSize: '0.92rem',
                    lineHeight: 1.65,
                  }}
                >
                  <span
                    className="landing-live-dot"
                    style={{
                      width: 8,
                      height: 8,
                      marginTop: 4,
                      borderRadius: '50%',
                      background: LANDING_COLORS.cyan,
                      boxShadow: `0 0 12px ${LANDING_COLORS.cyan}`,
                      flexShrink: 0,
                    }}
                  />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
            <div
              className="landing-hero-highlights"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}
            >
              {highlights.map((item, index) => (
                <div
                  key={`hero-highlight-${index}`}
                  className="landing-glow-card wasel-lift-card"
                  style={{
                    padding: '16px 16px 18px',
                    borderRadius: 22,
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))',
                    border: `1px solid ${LANDING_COLORS.border}`,
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      color: LANDING_COLORS.cyan,
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      color: LANDING_COLORS.text,
                      fontSize: '0.93rem',
                      lineHeight: 1.5,
                      fontWeight: 800,
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                aria-label={copy(ar ? '???? ???????' : 'Open map')}
                type="button"
                onClick={() => onNavigate(mobilityOsPath || findRidePath)}
                style={{
                  minHeight: 54,
                  padding: '0 22px',
                  borderRadius: 18,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: GRAD_SIGNAL,
                  color: '#FFFDF9',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: SH.cyanL,
                }}
              >
                {copy(ar ? '???? ???????' : 'Open map')}
                <ArrowRight size={16} />
              </button>
              <button
                aria-label={copy(ar ? '???? ?? ????' : 'Find rides')}
                type="button"
                onClick={() => onNavigate(findRidePath)}
                style={{
                  minHeight: 54,
                  padding: '0 20px',
                  borderRadius: 18,
                  border: `1px solid ${LANDING_COLORS.borderStrong}`,
                  background: 'rgba(255,255,255,0.04)',
                  color: LANDING_COLORS.text,
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                }}
              >
                {copy(ar ? '???? ?? ????' : 'Find rides')}
              </button>
              <div
                className="landing-hero-meta"
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  color: LANDING_COLORS.soft,
                  fontSize: '0.82rem',
                }}
              >
                <span>{supportLine}</span>
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'rgba(239,246,255,0.26)',
                  }}
                />
                <span>{businessAddress}</span>
              </div>
            </div>
            <div
              className="landing-hero-service-stats"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              {serviceStats.map(metric => (
                <div
                  key={`${metric.label}-${metric.value}`}
                  className="landing-glow-card"
                  style={{
                    padding: '16px 18px',
                    borderRadius: 22,
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02))',
                    border: `1px solid ${LANDING_COLORS.border}`,
                    display: 'grid',
                    gap: 6,
                    alignContent: 'start',
                  }}
                >
                  <span
                    style={{
                      color: LANDING_COLORS.muted,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      lineHeight: 1.5,
                    }}
                  >
                    {metric.label}
                  </span>
                  <span
                    style={{
                      color: LANDING_COLORS.text,
                      fontSize: '1.08rem',
                      fontWeight: 900,
                      lineHeight: 1.2,
                    }}
                  >
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="landing-hero-art-column">
            <div
              className="landing-hero-visual"
              style={{
                position: 'relative',
              }}
            >
              <div
                className="landing-hero-glow-field"
                aria-hidden="true"
                style={{
                  background:
                    'radial-gradient(circle at 48% 18%, color-mix(in srgb, var(--ds-accent) 22%, transparent), transparent 24%), radial-gradient(circle at 58% 54%, color-mix(in srgb, var(--ds-accent-strong) 28%, transparent), transparent 30%), radial-gradient(circle at 62% 72%, color-mix(in srgb, var(--ds-accent-strong) 16%, transparent), transparent 22%)',
                }}
              />
              <div
                className="landing-hero-orbit landing-hero-orbit--outer"
                aria-hidden="true"
              />
              <div
                className="landing-hero-orbit landing-hero-orbit--inner"
                aria-hidden="true"
              />
              <div
                className="landing-hero-mark-stage"
                style={{
                  position: 'relative',
                }}
              >
                <div className="landing-hero-mark-glow landing-hero-mark-glow--cyan" aria-hidden="true" />
                <div
                  className="landing-hero-mark-glow landing-hero-mark-glow--green"
                  aria-hidden="true"
                />
                <div className="landing-hero-mark">
                  <WaselMark
                    size={334}
                    animated
                    style={{
                      justifyContent: 'center',
                      filter:
                        'drop-shadow(0 0 42px rgba(255,179,87,0.24)) drop-shadow(0 0 56px rgba(245,154,44,0.28)) saturate(1.04)',
                      transform: 'translateY(12px)',
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  color: LANDING_COLORS.soft,
                  fontSize: '0.8rem',
                  textAlign: 'center',
                }}
                >
                {heroLogoSignals.map((signal, index) => (
                  <span
                    key={`hero-signal-${index}`}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '7px 10px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${LANDING_COLORS.border}`,
                    }}
                  >
                    {signal}
                  </span>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                {heroMetricPills.map((item, index) => (
                  <span
                    key={`hero-metric-${index}`}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 999,
                      background: 'rgba(32,216,255,0.08)',
                      border: '1px solid rgba(32,216,255,0.16)',
                      color: LANDING_COLORS.text,
                      fontSize: '0.76rem',
                      fontWeight: 800,
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 10,
                  color: LANDING_COLORS.cyan,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  textAlign: 'center',
                }}
              >
                <span>{serviceCtaLabel}</span>
                <ArrowRight size={16} />
              </div>
              {authError ? (
                <div
                  role="alert"
                  style={{
                    padding: '12px 14px',
                    borderRadius: 16,
                    border: '1px solid color-mix(in srgb, var(--wasel-brand-hover) 34%, transparent)',
                    background: 'color-mix(in srgb, var(--wasel-brand-hover) 10%, transparent)',
                    color: LANDING_COLORS.text,
                    fontSize: '0.88rem',
                    lineHeight: 1.55,
                    maxWidth: 620,
                  }}
                >
                  {authError}
                </div>
              ) : null}
              {showQuickAuth ? (
                <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 10,
                    }}
                  >
                    <button
                      type="button"
                      aria-label={copy(ar ? '?????? ???????? Google' : 'Continue with Google')}
                      onClick={() => onGoogleAuth?.()}
                      disabled={!onGoogleAuth || isGoogleLoading}
                      style={{
                        minHeight: 48,
                        padding: '0 18px',
                        borderRadius: 18,
                        border: `1px solid ${LANDING_COLORS.borderStrong}`,
                        background: 'rgba(255,255,255,0.04)',
                        color: LANDING_COLORS.text,
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        cursor: onGoogleAuth && !isGoogleLoading ? 'pointer' : 'not-allowed',
                        opacity: onGoogleAuth ? 1 : 0.66,
                      }}
                    >
                      {copy(
                        isGoogleLoading
                          ? ar
                            ? '???? ??????? ?? Google...'
                            : 'Connecting to Google...'
                          : ar
                            ? '?????? ???????? Google'
                            : 'Continue with Google',
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={copy(ar ? '?????? ???????? Facebook' : 'Continue with Facebook')}
                      onClick={() => onFacebookAuth?.()}
                      disabled={!onFacebookAuth || isFacebookLoading}
                      style={{
                        minHeight: 48,
                        padding: '0 18px',
                        borderRadius: 18,
                        border: `1px solid ${LANDING_COLORS.borderStrong}`,
                        background: 'rgba(255,255,255,0.04)',
                        color: LANDING_COLORS.text,
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        cursor: onFacebookAuth && !isFacebookLoading ? 'pointer' : 'not-allowed',
                        opacity: onFacebookAuth ? 1 : 0.66,
                      }}
                    >
                      {copy(
                        isFacebookLoading
                          ? ar
                            ? '???? ??????? ?? Facebook...'
                            : 'Connecting to Facebook...'
                          : ar
                            ? '?????? ???????? Facebook'
                            : 'Continue with Facebook',
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={copy(
                        ar ? '?????? ???????? ?????? ??????????' : 'Continue with email',
                      )}
                      onClick={() => onNavigate(emailAuthPath)}
                      style={{
                        minHeight: 48,
                        padding: '0 18px',
                        borderRadius: 18,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: GRAD_SIGNAL,
                        color: '#FFFDF9',
                        fontWeight: 900,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        boxShadow: SH.cyanL,
                      }}
                    >
                      {copy(ar ? '?????? ???????? ?????? ??????????' : 'Continue with email')}
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                    }}
                  >
                    <button
                      type="button"
                      aria-label={copy(ar ? '????? ??????' : 'Sign in')}
                      onClick={() => onNavigate(emailAuthPath)}
                      style={{
                        minHeight: 48,
                        padding: '0 18px',
                        borderRadius: 18,
                        border: `1px solid ${LANDING_COLORS.borderStrong}`,
                        background: 'rgba(255,255,255,0.04)',
                        color: LANDING_COLORS.text,
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                      }}
                    >
                      {copy(ar ? '????? ??????' : 'Sign in')}
                    </button>
                    <button
                      type="button"
                      aria-label={copy(ar ? '????? ????' : 'Create account')}
                      onClick={() => onNavigate(signupAuthPath)}
                      style={{
                        minHeight: 48,
                        padding: '0 18px',
                        borderRadius: 18,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: GRAD_SIGNAL,
                        color: '#FFFDF9',
                        fontWeight: 900,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        boxShadow: SH.cyanL,
                      }}
                    >
                      {copy(ar ? '????? ????' : 'Create account')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div
          className="landing-action-grid"
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          {primaryActions.slice(0, 3).map(card => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                aria-label={card.title}
                type="button"
                onClick={() => onNavigate(card.path)}
                className="landing-glow-card wasel-lift-card"
                style={{
                  display: 'grid',
                  gap: 10,
                  alignContent: 'start',
                  minHeight: 118,
                  padding: '18px',
                  borderRadius: 24,
                  textAlign: 'left',
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.024))',
                  border: `1px solid ${card.color}30`,
                  cursor: 'pointer',
                  boxShadow: '0 18px 36px rgba(1,10,18,0.18)',
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 15,
                    display: 'grid',
                    placeItems: 'center',
                    background: `${card.color}18`,
                    border: `1px solid ${card.color}42`,
                    boxShadow: `0 14px 28px ${card.color}18`,
                  }}
                >
                  <Icon size={20} color={card.color} />
                </div>
                <div
                  style={{
                    color: LANDING_COLORS.text,
                    fontWeight: 900,
                    fontSize: '0.96rem',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {card.title}
                </div>
                <div style={{ color: LANDING_COLORS.soft, fontSize: '0.82rem', lineHeight: 1.58 }}>
                  {card.detail}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div
        className="landing-footer-meta"
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          color: LANDING_COLORS.soft,
          fontSize: '0.82rem',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: LANDING_COLORS.text,
          }}
        >
          <span
            className="landing-live-dot"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: LANDING_COLORS.green,
              boxShadow: `0 0 12px ${LANDING_COLORS.green}`,
            }}
          />
          {copy(ar ? '????? ?? ???????' : 'Live corridor refresh')}
        </span>
        <span
          style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(239,246,255,0.28)' }}
        />
        <button
          type="button"
          onClick={() => onNavigate(myTripsPath)}
          style={{
            background: 'transparent',
            border: 'none',
            color: LANDING_COLORS.soft,
            padding: 0,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          {copy(ar ? 'تابع رحلاتي' : 'Track my trips')}
        </button>
      </div>
    </section>
  );
}

export function LandingMapSection({
  ar,
  onNavigate,
  mobilityOsPath,
  findRidePath,
  packagesPath,
}: LandingMapSectionProps) {
  const educationCards = [
    {
      title: ar ? '???? ???????' : 'Ride flow',
      detail: ar
        ? '?????? ??????? ??????? ???? ??? ????? ??????? ?????? ??? ?????.'
        : 'Where rides are moving.',
      accent: LANDING_COLORS.cyan,
    },
    {
      title: ar ? '???? ??????' : 'Package flow',
      detail: ar
        ? '?????? ???????? ???????? ??????? ????? ??? ?????? ?????? ?? ??? ??????.'
        : 'Where packages are moving.',
      accent: LANDING_COLORS.gold,
    },
    {
      title: ar ? '???? ????????' : 'Simulation layer',
      detail: ar
        ? '??? ?????? ???? ??????? ???? ???? ???? ?????? ???? ???? Mobility OS ??? ???? ?? Wasel.'
        : 'Shows the network logic.',
      accent: LANDING_COLORS.green,
    },
  ] as const;

  return (
    <section style={{ display: 'grid', gap: 14, height: '100%' }}>
      <div
        className="landing-map-shell wasel-lift-card"
        style={{
          position: 'relative',
          padding: 16,
          height: '100%',
          borderRadius: 32,
          background:
            'radial-gradient(circle at 14% 10%, color-mix(in srgb, var(--ds-accent) 20%, transparent), transparent 24%), radial-gradient(circle at 88% 14%, color-mix(in srgb, var(--ds-accent-strong) 14%, transparent), transparent 18%), linear-gradient(165deg, color-mix(in srgb, var(--ds-page-muted) 88%, black 12%) 0%, color-mix(in srgb, var(--ds-page) 94%, black 6%) 42%, var(--ds-page) 100%)',
          boxShadow: SH.navy,
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))',
            pointerEvents: 'none',
          }}
        />
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
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: LANDING_COLORS.cyan,
                fontSize: '0.74rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 900,
              }}
            >
              {copy(ar ? '??????? ?????' : 'Live map')}
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
              {copy(
                ar
                  ? 'Mobility OS ?? ?????? ???? ????? ??? ?? ????? Wasel.'
                  : 'One view for every service.',
              )}
            </div>
            <p
              style={{
                margin: '8px 0 0',
                color: LANDING_COLORS.soft,
                fontSize: '0.88rem',
                lineHeight: 1.6,
                maxWidth: 760,
              }}
            >
              {copy(
                ar
                  ? '????? ???????? ?????? ?????? ??? ???? ???????? ??? ????? ??????? ??????? ??? ??? ????????? ?? ???? ?? ??????? ???????.'
                  : 'Rides and packages share the same corridors.',
              )}
            </p>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              color: LANDING_COLORS.soft,
              fontSize: '0.78rem',
            }}
          >
            <span
              className="landing-live-dot"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: LANDING_COLORS.green,
                boxShadow: `0 0 10px ${LANDING_COLORS.green}`,
              }}
            />
            {copy(ar ? '?????? + ?????' : 'Mobile + desktop')}
          </div>
        </div>
        <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden' }}>
          <DeferredLandingMap ar={ar} />
        </div>
        <div
          className="landing-map-education-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
            marginTop: 14,
          }}
        >
          {educationCards.map(card => (
            <div
              key={card.title}
              className="landing-glow-card wasel-lift-card"
              style={{
                padding: '18px',
                borderRadius: 24,
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                border: `1px solid ${card.accent}28`,
                display: 'grid',
                gap: 8,
              }}
            >
              <div
                style={{
                  color: card.accent,
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                {card.title}
              </div>
              <div style={{ color: LANDING_COLORS.soft, fontSize: '0.84rem', lineHeight: 1.62 }}>
                {card.detail}
              </div>
            </div>
          ))}
        </div>
        {onNavigate && (mobilityOsPath || findRidePath || packagesPath) ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: 14,
            }}
          >
            <div
              style={{
                color: LANDING_COLORS.soft,
                fontSize: '0.84rem',
                lineHeight: 1.6,
                maxWidth: 620,
              }}
            >
              {copy(
                ar
                  ? '???? ?? ??????? ?? ???? ??????.'
                  : 'Start here, then open the right flow.',
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {mobilityOsPath ? (
                <button
                  type="button"
                  onClick={() => onNavigate(mobilityOsPath)}
                  style={{
                    minHeight: 48,
                    padding: '0 18px',
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: GRAD_SIGNAL,
                    color: '#FFFDF9',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: SH.cyanL,
                  }}
                >
                  {copy(ar ? '???? Mobility OS' : 'Open Mobility OS')}
                  <ArrowRight size={15} />
                </button>
              ) : null}
              {findRidePath ? (
                <button
                  type="button"
                  onClick={() => onNavigate(findRidePath)}
                  style={{
                    minHeight: 48,
                    padding: '0 18px',
                    borderRadius: 18,
                    border: `1px solid ${LANDING_COLORS.borderStrong}`,
                    background: 'rgba(255,255,255,0.04)',
                    color: LANDING_COLORS.text,
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  {copy(ar ? '???????' : 'Rides')}
                </button>
              ) : null}
              {packagesPath ? (
                <button
                  type="button"
                  onClick={() => onNavigate(packagesPath)}
                  style={{
                    minHeight: 48,
                    padding: '0 18px',
                    borderRadius: 18,
                    border: `1px solid ${LANDING_COLORS.border}`,
                    background: 'rgba(255,255,255,0.03)',
                    color: LANDING_COLORS.soft,
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  {copy(ar ? '??????' : 'Packages')}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function LandingSignalSection({ cards }: LandingSignalSectionProps) {
  return (
    <>
      {cards.map(card => {
        const average = Math.round(
          card.sparkline.reduce((sum, value) => sum + value, 0) / card.sparkline.length,
        );
        const change = card.sparkline[card.sparkline.length - 1] - card.sparkline[0];
        const fill = clamp(average, 18, 92);

        return (
          <div
            key={card.title}
            className="landing-glow-card wasel-lift-card"
            style={{
              ...panel(24),
              padding: '20px',
              display: 'grid',
              gap: 16,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at top right, ${card.accent}16, transparent 28%)`,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ display: 'grid', gap: 8 }}>
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
                <p
                  style={{
                    margin: 0,
                    color: LANDING_COLORS.soft,
                    fontSize: '0.86rem',
                    lineHeight: 1.68,
                  }}
                >
                  {card.detail}
                </p>
              </div>
              <div
                style={{
                  minWidth: 96,
                  padding: '8px 10px',
                  borderRadius: 16,
                  background: `${card.accent}12`,
                  border: `1px solid ${card.accent}30`,
                  color: card.accent,
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  textAlign: 'center',
                }}
              >
                {card.intensity}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${fill}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${card.accent}, rgba(255,255,255,0.82))`,
                    boxShadow: `0 0 16px ${card.accent}55`,
                  }}
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                <div style={{ display: 'grid', gap: 4 }}>
                  <span
                    style={{ color: LANDING_COLORS.soft, fontSize: '0.72rem', fontWeight: 700 }}
                  >
                    Signal
                  </span>
                  <span style={{ color: card.accent, fontSize: '1rem', fontWeight: 900 }}>
                    {average}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span
                    style={{ color: LANDING_COLORS.soft, fontSize: '0.72rem', fontWeight: 700 }}
                  >
                    Trend
                  </span>
                  <span
                    style={{
                      color: change >= 0 ? card.accent : LANDING_COLORS.text,
                      fontSize: '1rem',
                      fontWeight: 900,
                    }}
                  >
                    {change >= 0 ? '+' : ''}
                    {change}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span
                    style={{ color: LANDING_COLORS.soft, fontSize: '0.72rem', fontWeight: 700 }}
                  >
                    Mode
                  </span>
                  <span style={{ color: LANDING_COLORS.text, fontSize: '0.9rem', fontWeight: 800 }}>
                    {card.trendLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function LandingTrustSection({ ar }: LandingTrustSectionProps) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div
        className="landing-glow-card wasel-lift-card"
        style={{ ...panel(24), padding: '20px', position: 'relative', overflow: 'hidden' }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at top right, color-mix(in srgb, var(--ds-accent-strong) 18%, transparent), transparent 30%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              display: 'grid',
              placeItems: 'center',
              background: `${LANDING_COLORS.green}14`,
              border: `1px solid ${LANDING_COLORS.green}30`,
              boxShadow: SH.green,
            }}
          >
            <ShieldCheck size={18} color={LANDING_COLORS.green} />
          </div>
          <div>
            <div
              style={{
                color: LANDING_COLORS.text,
                fontWeight: 900,
                fontSize: '1.02rem',
                letterSpacing: '-0.03em',
              }}
            >
              {copy(ar ? '????? ???? ?????' : 'Trust stays clear')}
            </div>
            <div
              style={{
                marginTop: 4,
                color: LANDING_COLORS.soft,
                fontSize: '0.84rem',
                lineHeight: 1.65,
              }}
            >
              {copy(
                ar
                  ? '?????? ?????? ?????? ?? ???????.'
                  : 'Identity and support are easy to find.',
              )}
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
      {rows.map(row => {
        const renderedSlots = row.slots.flatMap(slotId =>
          slots[slotId] ? [{ id: slotId, node: slots[slotId] as ReactNode }] : [],
        );
        if (renderedSlots.length === 0) {
          return null;
        }
        return (
          <div key={row.id} className={row.className} style={row.style}>
            {renderedSlots.map(slot => (
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
