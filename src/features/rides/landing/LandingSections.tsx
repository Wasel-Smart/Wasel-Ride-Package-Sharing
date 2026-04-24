import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, ShieldCheck, type LucideIcon } from 'lucide-react';
import { WaselLogo, WaselMark } from '../../../components/wasel-ds/WaselLogo';
import {
  WaselBusinessFooter,
  WaselContactActionRow,
  WaselProofOfLifeBlock,
  WaselWhyCard,
} from '../../../components/system/WaselPresence';
import { useTheme } from '../../../contexts/ThemeContext';
import { DeferredLandingMap } from '../../../components/layout/DeferredLandingMap';
import {
  LANDING_DISPLAY,
  LANDING_FONT,
  LANDING_RESPONSIVE_STYLES,
} from '../../../styles/shared-ui';
import { GRAD_AURORA, GRAD_HERO, GRAD_SIGNAL } from '../../../utils/wasel-ds';

export const LANDING_COLORS = {
  bg: 'var(--background)',
  bgDeep: 'var(--wasel-surface-0)',
  panel: 'var(--wasel-panel-strong)',
  panelSoft: 'var(--wasel-panel-muted)',
  text: 'var(--wasel-copy-primary)',
  muted: 'var(--wasel-copy-muted)',
  soft: 'var(--wasel-copy-soft)',
  cyan: 'var(--ds-accent, #a9e3ff)',
  blue: 'var(--ds-accent-strong, #5b9bd5)',
  gold: 'var(--wasel-brand-gradient-start, #ffb357)',
  green: 'var(--ds-accent-strong, #19e7bb)',
  border: 'var(--wasel-panel-border)',
  borderStrong: 'var(--wasel-app-border-strong)',
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

const panel = (radius = 24): CSSProperties => ({
  borderRadius: radius,
  background: 'var(--wasel-panel-strong)',
  border: '1px solid var(--wasel-panel-border)',
  boxShadow: 'var(--wasel-shadow-md)',
  backdropFilter: 'blur(20px)',
});
const copy = (value: string) => value;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const PREMIUM_BUTTON = {
  primary: {
    minHeight: 52,
    padding: '0 28px',
    borderRadius: 16,
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    background: GRAD_SIGNAL,
    color: 'var(--wasel-button-primary-foreground)',
    boxShadow: 'var(--wasel-button-primary-shadow)',
    transition: 'transform 200ms ease, box-shadow 200ms ease',
  } as CSSProperties,
  secondary: {
    minHeight: 52,
    padding: '0 24px',
    borderRadius: 16,
    fontSize: '0.92rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--wasel-button-primary-border)',
    background: 'transparent',
    color: 'var(--wasel-copy-primary)',
    transition: 'border-color 180ms ease, background 180ms ease',
  } as CSSProperties,
};

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
          50% { transform: translate(0, -8px) scale(1.02); }
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
          background: `${GRAD_AURORA}, radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--ds-accent, #a9e3ff) 16%, transparent), transparent 24%), radial-gradient(circle at 72% 68%, color-mix(in srgb, var(--ds-accent-strong, #19e7bb) 12%, transparent), transparent 16%)`,
          pointerEvents: 'none',
          opacity: 0.94,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 40%)',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
      <div
        className="landing-shell"
        style={{
          position: 'relative',
          maxWidth: 1280,
          margin: '0 auto',
          padding: '32px 24px 80px',
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

  return (
    <div
      className="landing-header-row"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 32,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <WaselLogo size={36} theme={logoTheme} variant="full" subtitle="Mobility OS" />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 999,
            background: 'var(--wasel-app-surface)',
            border: '1px solid var(--wasel-border)',
            color: 'var(--wasel-copy-muted)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          <span
            className="landing-live-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: LANDING_COLORS.green,
              boxShadow: `0 0 10px ${LANDING_COLORS.green}`,
            }}
          />
          {copy(ar ? 'شبكة الأردن الحية' : 'Jordan Network Live')}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {canShowAuthActions ? (
          <>
            <button
              aria-label={copy(ar ? 'تسجيل الدخول من شريط الرأس' : 'Sign in from header')}
              type="button"
              onClick={() => {
                if (signinPath) {
                  onNavigate?.(signinPath);
                }
              }}
              style={{
                ...PREMIUM_BUTTON.secondary,
              }}
            >
              {copy(ar ? 'تسجيل الدخول' : 'Sign in')}
            </button>
            <button
              aria-label={copy(ar ? 'إنشاء حساب من شريط الرأس' : 'Sign up from header')}
              type="button"
              onClick={() => {
                if (signupPath) {
                  onNavigate?.(signupPath);
                }
              }}
              style={{
                ...PREMIUM_BUTTON.primary,
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
  const heroMetrics = [
    { label: ar ? 'خريطة مباشرة أولاً' : 'Live map first', value: ar ? 'مفعل' : 'Enabled' },
    { label: ar ? 'عرض أنظف' : 'Cleaner view', value: ar ? 'مستقر' : 'Stable' },
    { label: ar ? 'علامة أوضح' : 'Sharper mark', value: ar ? 'حي' : 'Live' },
  ];
  const serviceCtaLabel = ctaLabel ?? (ar ? 'استكشف الخدمات' : 'Explore services');

  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <div
        className="landing-glow-card"
        style={{
          ...panel(28),
          padding: '32px',
          display: 'grid',
          gap: 28,
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
              'radial-gradient(circle at 16% 16%, color-mix(in srgb, var(--ds-accent) 14%, transparent) 28%, radial-gradient(circle at 84% 24%, color-mix(in srgb, var(--ds-accent-strong) 10%, transparent) 20%)',
            pointerEvents: 'none',
          }}
        />

        {/* Main Hero Content */}
        <div
          className="landing-hero-shell"
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(340px, 0.92fr)',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* Left Content Column */}
          <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
            {/* Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                width: 'fit-content',
                padding: '6px 14px',
                borderRadius: 999,
                background: 'var(--wasel-button-primary-soft)',
                border: '1px solid var(--wasel-button-primary-border)',
                color: 'var(--wasel-cyan)',
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {copy(ar ? 'Mobility OS للأردن' : 'Mobility OS for Jordan')}
            </div>

            {/* Headline */}
            <div style={{ display: 'grid', gap: 16 }}>
              <h1
                style={{
                  margin: 0,
                  maxWidth: 680,
                  fontFamily: LANDING_DISPLAY,
                  fontSize: 'clamp(2.5rem, 4.8vw, 4.5rem)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.04em',
                  fontWeight: 700,
                }}
              >
                <span style={{ display: 'block', color: LANDING_COLORS.text }}>
                  {copy(ar ? 'تحرك بالخريطة.' : 'Move by map.')}
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 8,
                    background: GRAD_SIGNAL,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {copy(ar ? 'رحلات وحزم، شبكة واحدة.' : 'Rides and packages, one network.')}
                </span>
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: 560,
                  color: LANDING_COLORS.muted,
                  fontSize: '1.05rem',
                  lineHeight: 1.7,
                }}
              >
                {copy(
                  ar
                    ? 'شاهد الشبكة أولاً، ثم اختر خدمة.'
                    : 'See the network first, then choose a service.',
                )}
              </p>
            </div>

            {/* Feature Bullets */}
            <div style={{ display: 'grid', gap: 12, maxWidth: 540 }}>
              {bullets.map((bullet, index) => (
                <div
                  key={`hero-bullet-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    color: LANDING_COLORS.soft,
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                  }}
                >
                  <span
                    className="landing-live-dot"
                    style={{
                      width: 6,
                      height: 6,
                      marginTop: 6,
                      borderRadius: '50%',
                      background: LANDING_COLORS.cyan,
                      boxShadow: `0 0 10px ${LANDING_COLORS.cyan}`,
                      flexShrink: 0,
                    }}
                  />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <button
                aria-label={copy(ar ? 'افتح الخريطة' : 'Open map')}
                type="button"
                onClick={() => onNavigate(mobilityOsPath || findRidePath)}
                style={{
                  ...PREMIUM_BUTTON.primary,
                }}
              >
                {copy(ar ? 'افتح الخريطة' : 'Open map')}
                <ArrowRight size={16} style={{ marginLeft: 8 }} />
              </button>
              <button
                aria-label={copy(ar ? 'ابحث عن رحلات' : 'Find rides')}
                type="button"
                onClick={() => onNavigate(findRidePath)}
                style={{
                  ...PREMIUM_BUTTON.secondary,
                }}
              >
                {copy(ar ? 'ابحث عن رحلات' : 'Find rides')}
              </button>
            </div>

            {/* Stats Row */}
            <div
              className="landing-hero-service-stats"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                marginTop: 8,
              }}
            >
              {(stats ?? heroMetrics).slice(0, 3).map(metric => (
                <div
                  key={`${metric.label}-${metric.value}`}
                  className="landing-glow-card"
                  style={{
                    padding: '16px 20px',
                    borderRadius: 18,
                    background: 'var(--wasel-panel-muted)',
                    border: '1px solid var(--wasel-border)',
                    display: 'grid',
                    gap: 6,
                    alignContent: 'start',
                  }}
                >
                  <span
                    style={{
                      color: LANDING_COLORS.muted,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {metric.label}
                  </span>
                  <span
                    style={{
                      color: LANDING_COLORS.text,
                      fontSize: '1.12rem',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual Column */}
          <div className="landing-hero-art-column">
            <div
              className="landing-hero-visual"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
              }}
            >
              {/* Glow Field */}
              <div
                className="landing-hero-glow-field"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: '8% 6% 12%',
                  background:
                    'radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--ds-accent) 20%, transparent) 30%, radial-gradient(circle at 60% 60%, color-mix(in srgb, var(--ds-accent-strong) 16%, transparent) 24%)',
                  filter: 'blur(24px)',
                }}
              />

              {/* Orbital Rings */}
              <div className="landing-hero-orbit landing-hero-orbit--outer" aria-hidden="true" />
              <div className="landing-hero-orbit landing-hero-orbit--inner" aria-hidden="true" />

              {/* Brand Mark */}
              <div
                className="landing-hero-mark-stage"
                style={{
                  position: 'relative',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <div
                  className="landing-hero-mark-glow landing-hero-mark-glow--cyan"
                  aria-hidden="true"
                />
                <div
                  className="landing-hero-mark-glow landing-hero-mark-glow--green"
                  aria-hidden="true"
                />
                <div className="landing-hero-mark">
                  <WaselMark
                    size={280}
                    animated
                    style={{
                      justifyContent: 'center',
                      filter: 'drop-shadow(0 0 32px rgba(169,227,255,0.2))',
                    }}
                  />
                </div>
              </div>

              {/* CTA Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: LANDING_COLORS.cyan,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                <span>{serviceCtaLabel}</span>
                <ArrowRight size={14} />
              </div>

              {/* Auth Error */}
              {authError ? (
                <div
                  role="alert"
                  style={{
                    padding: '14px 18px',
                    borderRadius: 14,
                    border: '1px solid var(--wasel-border)',
                    background: 'var(--wasel-surface-muted)',
                    color: LANDING_COLORS.text,
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    maxWidth: 540,
                  }}
                >
                  {authError}
                </div>
              ) : null}

              {/* Quick Auth Buttons */}
              {showQuickAuth ? (
                <div style={{ display: 'grid', gap: 12, marginTop: 4, width: '100%' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 12,
                    }}
                  >
                    <button
                      type="button"
                      aria-label={copy(ar ? 'متابعة مع Google' : 'Continue with Google')}
                      onClick={() => onGoogleAuth?.()}
                      disabled={!onGoogleAuth || isGoogleLoading}
                      style={{
                        minHeight: 48,
                        padding: '0 16px',
                        borderRadius: 14,
                        border: '1px solid var(--wasel-border)',
                        background: 'transparent',
                        color: LANDING_COLORS.text,
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: onGoogleAuth && !isGoogleLoading ? 'pointer' : 'not-allowed',
                        opacity: onGoogleAuth ? 1 : 0.6,
                      }}
                    >
                      {copy(
                        isGoogleLoading
                          ? ar
                            ? 'جاري الاتصال...'
                            : 'Connecting...'
                          : ar
                            ? 'Google'
                            : 'Google',
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={copy(ar ? 'متابعة مع Facebook' : 'Continue with Facebook')}
                      onClick={() => onFacebookAuth?.()}
                      disabled={!onFacebookAuth || isFacebookLoading}
                      style={{
                        minHeight: 48,
                        padding: '0 16px',
                        borderRadius: 14,
                        border: '1px solid var(--wasel-border)',
                        background: 'transparent',
                        color: LANDING_COLORS.text,
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: onFacebookAuth && !isFacebookLoading ? 'pointer' : 'not-allowed',
                        opacity: onFacebookAuth ? 1 : 0.6,
                      }}
                    >
                      {copy(
                        isFacebookLoading
                          ? ar
                            ? 'جاري الاتصال...'
                            : 'Connecting...'
                          : ar
                            ? 'Facebook'
                            : 'Facebook',
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={copy(ar ? 'متابعة بالبريد الإلكتروني' : 'Continue with email')}
                      onClick={() => onNavigate(emailAuthPath)}
                      style={{
                        minHeight: 48,
                        padding: '0 16px',
                        borderRadius: 14,
                        border: 'none',
                        background: GRAD_SIGNAL,
                        color: 'var(--wasel-button-primary-foreground)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      {copy(ar ? 'بريد إلكتروني' : 'Email')}
                    </button>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      justifyContent: 'center',
                    }}
                  >
                    <button
                      type="button"
                      aria-label={copy(ar ? 'تسجيل الدخول' : 'Sign in')}
                      onClick={() => onNavigate(emailAuthPath)}
                      style={{
                        minHeight: 44,
                        padding: '0 20px',
                        borderRadius: 14,
                        border: '1px solid var(--wasel-border)',
                        background: 'transparent',
                        color: LANDING_COLORS.soft,
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      {copy(ar ? 'تسجيل الدخول' : 'Sign in')}
                    </button>
                    <button
                      type="button"
                      aria-label={copy(ar ? 'إنشاء حساب' : 'Create account')}
                      onClick={() => onNavigate(signupAuthPath)}
                      style={{
                        minHeight: 44,
                        padding: '0 20px',
                        borderRadius: 14,
                        border: 'none',
                        background: GRAD_SIGNAL,
                        color: 'var(--wasel-button-primary-foreground)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      {copy(ar ? 'إنشاء حساب' : 'Create account')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div
          className="landing-action-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
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
                className="wasel-lift-card"
                style={{
                  display: 'grid',
                  gap: 12,
                  alignContent: 'start',
                  minHeight: 120,
                  padding: '20px 24px',
                  borderRadius: 20,
                  background: 'var(--wasel-panel-muted)',
                  border: `1px solid ${card.color}28`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition:
                    'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: `${card.color}14`,
                    border: `1px solid ${card.color}32`,
                  }}
                >
                  <Icon size={20} color={card.color} />
                </div>
                <div
                  style={{
                    color: LANDING_COLORS.text,
                    fontWeight: 700,
                    fontSize: '0.98rem',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {card.title}
                </div>
                <div style={{ color: LANDING_COLORS.soft, fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {card.detail}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Meta */}
        <div
          className="landing-footer-meta"
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            color: LANDING_COLORS.soft,
            fontSize: '0.82rem',
            paddingTop: 8,
            borderTop: '1px solid var(--wasel-border)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: LANDING_COLORS.text,
            }}
          >
            <span
              className="landing-live-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: LANDING_COLORS.green,
                boxShadow: `0 0 10px ${LANDING_COLORS.green}`,
              }}
            />
            {copy(ar ? 'تحديث الممر المباشر' : 'Live corridor refresh')}
          </span>
          <span
            style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--wasel-border)' }}
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
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            {copy(ar ? 'تابع رحلاتي' : 'Track my trips')}
          </button>
          <span
            style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--wasel-border)' }}
          />
          <span>{supportLine}</span>
          <span
            style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--wasel-border)' }}
          />
          <span>{businessAddress}</span>
        </div>
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
      title: ar ? 'تدفق الرحلة' : 'Ride flow',
      detail: ar ? 'حيث تتحرك الرحلات.' : 'Where rides are moving.',
      accent: LANDING_COLORS.cyan,
    },
    {
      title: ar ? 'تدفق الحزمة' : 'Package flow',
      detail: ar ? 'حيث تتحرك الحزم.' : 'Where packages are moving.',
      accent: LANDING_COLORS.gold,
    },
    {
      title: ar ? 'طبقة المحاكاة' : 'Simulation layer',
      detail: ar ? 'تعرض منطق الشبكة.' : 'Shows the network logic.',
      accent: LANDING_COLORS.green,
    },
  ] as const;

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <div
        className="landing-map-shell wasel-lift-card"
        style={{
          position: 'relative',
          padding: 24,
          borderRadius: 28,
          background: 'var(--service-background)',
          boxShadow: 'var(--wasel-shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))',
            pointerEvents: 'none',
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <div style={{ minWidth: 0, flex: 1, maxWidth: 560 }}>
            <div
              style={{
                color: 'var(--wasel-cyan)',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                fontWeight: 800,
                marginBottom: 6,
              }}
            >
              {copy(ar ? 'خريطة مباشرة' : 'Live Map')}
            </div>
            <div
              style={{
                fontFamily: LANDING_DISPLAY,
                fontSize: '1.4rem',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: LANDING_COLORS.text,
              }}
            >
              {copy(ar ? 'Mobility OS في لمحة واحدة لكل خدمة.' : 'One view for every service.')}
            </div>
            <p
              style={{
                margin: '10px 0 0',
                color: LANDING_COLORS.soft,
                fontSize: '0.95rem',
                lineHeight: 1.6,
              }}
            >
              {copy(
                ar
                  ? 'الرحلات والحزم تشترك في نفس الممرات.'
                  : 'Rides and packages share the same corridors.',
              )}
            </p>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 14,
              background: 'var(--wasel-app-surface)',
              color: LANDING_COLORS.soft,
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <span
              className="landing-live-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: LANDING_COLORS.green,
                boxShadow: `0 0 8px ${LANDING_COLORS.green}`,
              }}
            />
            {copy(ar ? 'جوال + سطح مكتب' : 'Mobile + desktop')}
          </div>
        </div>

        {/* Map */}
        <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden' }}>
          <DeferredLandingMap ar={ar} />
        </div>

        {/* Education Cards */}
        <div
          className="landing-map-education-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginTop: 20,
          }}
        >
          {educationCards.map(card => (
            <div
              key={card.title}
              className="wasel-lift-card"
              style={{
                padding: '18px 22px',
                borderRadius: 20,
                background: 'var(--wasel-panel-muted)',
                border: `1px solid ${card.accent}22`,
                display: 'grid',
                gap: 10,
                transition: 'transform 180ms ease, box-shadow 180ms ease',
              }}
            >
              <div
                style={{
                  color: card.accent,
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                {card.title}
              </div>
              <div style={{ color: LANDING_COLORS.soft, fontSize: '0.88rem', lineHeight: 1.55 }}>
                {card.detail}
              </div>
            </div>
          ))}
        </div>

        {/* Action Links */}
        {onNavigate && (mobilityOsPath || findRidePath || packagesPath) ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--wasel-border)',
            }}
          >
            <div
              style={{
                color: LANDING_COLORS.soft,
                fontSize: '0.88rem',
                lineHeight: 1.6,
                maxWidth: 400,
              }}
            >
              {copy(
                ar ? 'ابدأ هنا، ثم افتح التدفق الصحيح.' : 'Start here, then open the right flow.',
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {mobilityOsPath ? (
                <button
                  type="button"
                  onClick={() => onNavigate(mobilityOsPath)}
                  style={{
                    ...PREMIUM_BUTTON.primary,
                    minHeight: 46,
                    padding: '0 20px',
                    fontSize: '0.88rem',
                  }}
                >
                  {copy(ar ? 'افتح Mobility OS' : 'Open Mobility OS')}
                  <ArrowRight size={14} style={{ marginLeft: 8 }} />
                </button>
              ) : null}
              {findRidePath ? (
                <button
                  type="button"
                  onClick={() => onNavigate(findRidePath)}
                  style={{
                    ...PREMIUM_BUTTON.secondary,
                    minHeight: 46,
                    padding: '0 20px',
                    fontSize: '0.88rem',
                  }}
                >
                  {copy(ar ? 'الرحلات' : 'Rides')}
                </button>
              ) : null}
              {packagesPath ? (
                <button
                  type="button"
                  onClick={() => onNavigate(packagesPath)}
                  style={{
                    ...PREMIUM_BUTTON.secondary,
                    minHeight: 46,
                    padding: '0 20px',
                    fontSize: '0.88rem',
                  }}
                >
                  {copy(ar ? 'الحزم' : 'Packages')}
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
      }}
    >
      {cards.map(card => {
        const average = Math.round(
          card.sparkline.reduce((sum, value) => sum + value, 0) / card.sparkline.length,
        );
        const change = card.sparkline[card.sparkline.length - 1] - card.sparkline[0];
        const fill = clamp(average, 18, 92);

        return (
          <div
            key={card.title}
            className="wasel-lift-card"
            style={{
              ...panel(20),
              padding: '22px',
              display: 'grid',
              gap: 18,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at top right, ${card.accent}12, transparent 24%)`,
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
              <div style={{ display: 'grid', gap: 6 }}>
                <div
                  style={{
                    color: card.accent,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    fontWeight: 800,
                  }}
                >
                  {card.title}
                </div>
                <p
                  style={{
                    margin: 0,
                    color: LANDING_COLORS.soft,
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    maxWidth: 280,
                  }}
                >
                  {card.detail}
                </p>
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: `${card.accent}12`,
                  border: `1px solid ${card.accent}28`,
                  color: card.accent,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  textAlign: 'center',
                }}
              >
                {card.intensity}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: 'var(--wasel-surface-muted-strong)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${fill}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${card.accent}, rgba(255,255,255,0.7))`,
                    boxShadow: `0 0 12px ${card.accent}44`,
                  }}
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                }}
              >
                <div style={{ display: 'grid', gap: 4 }}>
                  <span
                    style={{ color: LANDING_COLORS.muted, fontSize: '0.7rem', fontWeight: 600 }}
                  >
                    Signal
                  </span>
                  <span style={{ color: LANDING_COLORS.text, fontSize: '1rem', fontWeight: 800 }}>
                    {average}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span
                    style={{ color: LANDING_COLORS.muted, fontSize: '0.7rem', fontWeight: 600 }}
                  >
                    Trend
                  </span>
                  <span
                    style={{
                      color: change >= 0 ? card.accent : LANDING_COLORS.text,
                      fontSize: '1rem',
                      fontWeight: 800,
                    }}
                  >
                    {change >= 0 ? '+' : ''}
                    {change}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span
                    style={{ color: LANDING_COLORS.muted, fontSize: '0.7rem', fontWeight: 600 }}
                  >
                    Mode
                  </span>
                  <span
                    style={{ color: LANDING_COLORS.text, fontSize: '0.92rem', fontWeight: 700 }}
                  >
                    {card.trendLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LandingTrustSection({ ar }: LandingTrustSectionProps) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        className="wasel-lift-card"
        style={{
          ...panel(20),
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at top right, color-mix(in srgb, var(--ds-accent-strong) 14%, transparent) 24%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            width: 48,
            height: 48,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--wasel-button-primary-soft)',
            border: '1px solid var(--wasel-button-primary-border)',
            boxShadow: 'var(--wasel-shadow-sm)',
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={22} color="var(--wasel-cyan)" />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: LANDING_COLORS.text,
              fontWeight: 700,
              fontSize: '1.08rem',
              letterSpacing: '-0.02em',
            }}
          >
            {copy(ar ? 'الثقة تظل واضحة' : 'Trust stays clear')}
          </div>
          <div
            style={{
              marginTop: 4,
              color: LANDING_COLORS.soft,
              fontSize: '0.9rem',
              lineHeight: 1.6,
            }}
          >
            {copy(
              ar ? 'الهوية والدعم سهلان العثور عليهما.' : 'Identity and support are easy to find.',
            )}
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
