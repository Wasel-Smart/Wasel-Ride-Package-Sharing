import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, type LucideIcon } from 'lucide-react';
import { WaselLogo, WaselMark } from '../../components/wasel-ds/WaselLogo';
import {
  WaselBusinessFooter,
  WaselContactActionRow,
  WaselProofOfLifeBlock,
  WaselWhyCard,
} from '../../components/system/WaselPresence';
import { useTheme } from '../../contexts/ThemeContext';
import { MobilityOSLandingMap } from './MobilityOSLandingMap';
import { C, GRAD_AURORA, GRAD_HERO, GRAD_SIGNAL, SH } from '../../utils/wasel-ds';

export const LANDING_COLORS = {
  bg: 'var(--background)',
  bgDeep: 'var(--wasel-surface-0)',
  panel: 'var(--wasel-panel-strong)',
  panelSoft: 'var(--wasel-panel-muted)',
  text: 'var(--wasel-copy-primary)',
  muted: 'var(--wasel-copy-muted)',
  soft: 'var(--wasel-copy-soft)',
  cyan: '#20D8FF',
  blue: '#1388D9',
  gold: '#B7FF2B',
  green: '#72FF47',
  border: 'var(--border)',
  borderStrong: 'rgba(var(--wasel-border-rgb), 0.30)',
} as const;
export const LANDING_FONT =
  "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";
export const LANDING_DISPLAY =
  "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', sans-serif)";
export const LANDING_RESPONSIVE_STYLES = `
  :root { color-scheme: inherit; }
  .landing-shell, .landing-shell * { box-sizing: border-box; }
  .landing-shell > * { min-width: 0; }
  .landing-shell button:focus-visible {
    outline: 2px solid rgba(22,199,242,0.92);
    outline-offset: 3px;
  }
  .wasel-lift-card { transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
  .landing-live-dot { animation: landingPulse 1.9s ease-in-out infinite; }
  .landing-glow-card { position: relative; overflow: hidden; }
  .landing-glow-card::before {
    content: '';
    position: absolute;
    inset: -1px;
    background: linear-gradient(135deg, rgba(22,199,242,0.18), rgba(22,199,242,0) 36%, rgba(199,255,26,0.16) 100%);
    opacity: 0.9;
    pointer-events: none;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    -webkit-mask-composite: xor;
    padding: 1px;
  }
  @keyframes landingPulse { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }
  @media (hover: hover) and (pointer: fine) { .wasel-lift-card:hover { transform: translateY(-2px); box-shadow: 0 24px 54px rgba(0,0,0,0.24); } }
  @media (max-width: 1240px) { .landing-main-grid { grid-template-columns: 1fr !important; } }
  @media (max-width: 1040px) { .landing-signal-grid, .landing-bottom-grid { grid-template-columns: 1fr !important; } }
  @media (max-width: 780px) {
    .landing-action-grid, .landing-auth-grid, .landing-hero-highlights { grid-template-columns: 1fr !important; }
    .landing-hero-shell { grid-template-columns: 1fr !important; }
    .landing-hero-stat-grid { grid-template-columns: 1fr !important; }
    .landing-map-education-grid { grid-template-columns: 1fr !important; }
    .landing-hero-meta, .landing-footer-meta { flex-direction: column !important; align-items: flex-start !important; }
  }
  @media (max-width: 640px) {
    .landing-shell { padding: 22px 14px 72px !important; }
    .landing-header-row { flex-direction: column !important; align-items: flex-start !important; }
    .landing-map-shell { padding: 12px !important; }
  }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
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
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: GRAD_HERO, pointerEvents: 'none' }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `${GRAD_AURORA}, radial-gradient(circle at 82% 18%, rgba(22,199,242,0.18), rgba(4,18,30,0) 26%), radial-gradient(circle at 72% 68%, rgba(199,255,26,0.14), rgba(4,18,30,0) 18%)`,
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
    <motion.div
      className="landing-header-row"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
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
              'drop-shadow(0 0 18px rgba(32,216,255,0.16)) drop-shadow(0 0 20px rgba(114,255,71,0.12))',
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
          {copy(ar ? 'Ø´Ø¨ÙƒØ© Ø§Ù„Ø£Ø±Ø¯Ù† Ø§Ù„Ø­ÙŠØ©' : 'Jordan mobility network')}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {canShowAuthActions ? (
          <>
            <button
              aria-label={copy(
                ar ? 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù…Ù† Ø´Ø±ÙŠØ· Ø§Ù„Ø±Ø£Ø³' : 'Sign in from header',
              )}
              type="button"
              onClick={() => onNavigate?.(signinPath!)}
              style={{
                ...headerAuthButtonBase,
                border: `1px solid ${LANDING_COLORS.borderStrong}`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))',
                color: LANDING_COLORS.text,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 30px rgba(1,10,18,0.18)',
              }}
            >
              {copy(ar ? 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„' : 'Sign in')}
            </button>
            <button
              aria-label={copy(
                ar ? 'Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨ Ù…Ù† Ø´Ø±ÙŠØ· Ø§Ù„Ø±Ø£Ø³' : 'Sign up from header',
              )}
              type="button"
              onClick={() => onNavigate?.(signupPath!)}
              style={{
                ...headerAuthButtonBase,
                border: 'none',
                background: 'linear-gradient(135deg, #17C7EA 0%, #1E7CFF 62%, #7EF34B 100%)',
                color: '#F8FBFF',
                boxShadow: '0 18px 40px rgba(30,124,255,0.28)',
              }}
            >
              {copy(ar ? 'Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨' : 'Sign up')}
            </button>
          </>
        ) : null}
        <WaselContactActionRow ar={ar} />
      </div>
    </motion.div>
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
  authError,
  oauthLoadingProvider,
  showQuickAuth = false,
  onGoogleAuth,
  onFacebookAuth,
  onNavigate,
}: LandingHeroSectionProps) {
  const bullets = heroBullets.slice(0, 3);
  const isGoogleLoading = oauthLoadingProvider === 'google';
  const isFacebookLoading = oauthLoadingProvider === 'facebook';
  const highlights = [
    {
      label: ar ? 'نظام واحد' : 'One system',
      value: ar
        ? 'Mobility OS يجمع الخريطة والقرار والخطوة التالية في نفس الواجهة.'
        : 'Mobility OS keeps the map, the decision, and the next step inside one surface.',
    },
    {
      label: ar ? 'تدفقان بلغة واحدة' : 'Two flows, one language',
      value: ar
        ? 'الرحلات والطرود يتحركان بين المدن بنفس منطق المسار.'
        : 'Rides and packages move between cities using the same corridor logic.',
    },
  ] as const;
  const heroLogoSignals = [
    ar ? 'الهوية الحية للشبكة' : 'Live network identity',
    ar ? 'ركاب + طرود + مسارات' : 'Rides + packages + routes',
    ar ? 'مصمم للهاتف والويب' : 'Built for mobile and web',
  ] as const;
  const heroMetricPills = [
    ar ? 'خريطة حيّة أولاً' : 'Live map first',
    ar ? 'واجهة أنظف' : 'Cleaner first view',
    ar ? 'علامة أوضح' : 'Sharper brand mark',
  ] as const;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'grid', gap: 16, height: '100%' }}
    >
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
              'radial-gradient(circle at 18% 18%, rgba(22,199,242,0.18), rgba(4,18,30,0) 32%), radial-gradient(circle at 82% 26%, rgba(199,255,26,0.12), rgba(4,18,30,0) 24%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))',
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
                background: 'rgba(22,199,242,0.1)',
                border: `1px solid ${LANDING_COLORS.borderStrong}`,
                color: LANDING_COLORS.cyan,
                fontSize: '0.75rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {copy(ar ? 'Mobility OS للأردن' : 'Mobility OS for Jordan')}
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
                  {copy(ar ? 'الخريطة الحية هي قلب Wasel.' : 'The live map is the heart of Wasel.')}
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
                      ? 'رحلات وطرود ومسارات ذكية في تدفق تشغيلي واحد.'
                      : 'Rides, packages, and route intelligence in one operating flow.',
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
                    ? 'بدل أن تبدو Wasel كخدمات منفصلة، نعرض Mobility OS من البداية كالمشهد الذي يربط الرحلات والطرود والتوجيه. هكذا يفهم المستخدم الشبكة قبل أن يضغط أي زر.'
                    : 'Instead of presenting Wasel as disconnected services, the first screen now leads with Mobility OS as the shared scene that connects rides, packages, and routing. Users understand the network before they tap.',
                )}
              </p>
            </div>
            <div style={{ display: 'grid', gap: 10, maxWidth: 620 }}>
              {bullets.map(bullet => (
                <div
                  key={bullet}
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
              {highlights.map(item => (
                <div
                  key={item.label}
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
                aria-label={copy(ar ? 'افتح خريطة Mobility OS الحية' : 'Open Mobility OS live map')}
                type="button"
                onClick={() => onNavigate(mobilityOsPath || findRidePath)}
                style={{
                  minHeight: 54,
                  padding: '0 22px',
                  borderRadius: 18,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: GRAD_SIGNAL,
                  color: '#041521',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: SH.cyanL,
                }}
              >
                {copy(ar ? 'افتح خريطة Mobility OS الحية' : 'Open Mobility OS live map')}
                <ArrowRight size={16} />
              </button>
              <button
                aria-label={copy(ar ? 'استكشف المسارات' : 'Explore routes')}
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
                {copy(ar ? 'استكشف المسارات' : 'Explore routes')}
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
          </div>
          <div style={{ display: 'grid', gap: 18, alignContent: 'center' }}>
            <div
              style={{
                position: 'relative',
                minHeight: 520,
                display: 'grid',
                alignItems: 'start',
                justifyItems: 'center',
                overflow: 'visible',
                paddingTop: 18,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: '0% 4% 12% 4%',
                  background:
                    'radial-gradient(circle at 48% 18%, rgba(18,219,255,0.2), rgba(18,219,255,0) 24%), radial-gradient(circle at 58% 54%, rgba(105,255,69,0.42), rgba(105,255,69,0) 30%), radial-gradient(circle at 62% 72%, rgba(191,255,24,0.16), rgba(191,255,24,0) 22%)',
                  filter: 'blur(22px)',
                  opacity: 1,
                  pointerEvents: 'none',
                }}
              />
              <motion.div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  width: '92%',
                  maxWidth: 420,
                  aspectRatio: '1 / 1',
                  borderRadius: '50%',
                  border: '1px solid rgba(18,219,255,0.14)',
                  opacity: 0.58,
                  pointerEvents: 'none',
                  top: -176,
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  width: '66%',
                  maxWidth: 310,
                  aspectRatio: '1 / 1',
                  borderRadius: '50%',
                  border: '1px solid rgba(105,255,69,0.12)',
                  opacity: 0.48,
                  pointerEvents: 'none',
                  top: -124,
                }}
                animate={{ rotate: -360 }}
                transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                style={{
                  position: 'relative',
                  display: 'grid',
                  placeItems: 'center',
                  width: '100%',
                    minHeight: 430,
                    marginTop: -184,
                }}
                animate={{ y: [0, -12, 0], scale: [1, 1.035, 1] }}
                transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    width: 340,
                    height: 340,
                    borderRadius: '50%',
                    background:
                      'radial-gradient(circle, rgba(18,219,255,0.34) 0%, rgba(18,219,255,0.12) 34%, rgba(18,219,255,0) 74%)',
                    filter: 'blur(26px)',
                    pointerEvents: 'none',
                    transform: 'translate(-8px, -22px)',
                  }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    width: 320,
                    height: 320,
                    borderRadius: '50%',
                    background:
                      'radial-gradient(circle, rgba(105,255,69,0.26) 0%, rgba(105,255,69,0.1) 36%, rgba(105,255,69,0) 74%)',
                    filter: 'blur(24px)',
                    transform: 'translate(28px, 34px)',
                    pointerEvents: 'none',
                  }}
                />
                <WaselMark
                  size={334}
                  style={{
                    filter:
                      'drop-shadow(0 0 42px rgba(18,219,255,0.32)) drop-shadow(0 0 56px rgba(105,255,69,0.26)) saturate(1.08)',
                      transform: 'translate(6px, -124px)',
                  }}
                />
              </motion.div>
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
                {heroLogoSignals.map(signal => (
                  <span
                    key={signal}
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
                {heroMetricPills.map(item => (
                  <span
                    key={item}
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
              {authError ? (
                <div
                  role="alert"
                  style={{
                    padding: '12px 14px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,123,123,0.24)',
                    background: 'rgba(255,123,123,0.08)',
                    color: '#FFE2E2',
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
                      aria-label={copy(ar ? 'متابعة باستخدام Google' : 'Continue with Google')}
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
                            ? 'جارٍ الاتصال بـ Google...'
                            : 'Connecting to Google...'
                          : ar
                            ? 'متابعة باستخدام Google'
                            : 'Continue with Google',
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={copy(ar ? 'متابعة باستخدام Facebook' : 'Continue with Facebook')}
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
                            ? 'جارٍ الاتصال بـ Facebook...'
                            : 'Connecting to Facebook...'
                          : ar
                            ? 'متابعة باستخدام Facebook'
                            : 'Continue with Facebook',
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={copy(
                        ar ? 'متابعة باستخدام البريد الإلكتروني' : 'Continue with email',
                      )}
                      onClick={() => onNavigate(emailAuthPath)}
                      style={{
                        minHeight: 48,
                        padding: '0 18px',
                        borderRadius: 18,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: GRAD_SIGNAL,
                        color: '#041521',
                        fontWeight: 900,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        boxShadow: SH.cyanL,
                      }}
                    >
                      {copy(ar ? 'متابعة باستخدام البريد الإلكتروني' : 'Continue with email')}
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
                      aria-label={copy(ar ? 'تسجيل الدخول' : 'Sign in')}
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
                      {copy(ar ? 'تسجيل الدخول' : 'Sign in')}
                    </button>
                    <button
                      type="button"
                      aria-label={copy(ar ? 'إنشاء حساب' : 'Create account')}
                      onClick={() => onNavigate(signupAuthPath)}
                      style={{
                        minHeight: 48,
                        padding: '0 18px',
                        borderRadius: 18,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: GRAD_SIGNAL,
                        color: '#041521',
                        fontWeight: 900,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        boxShadow: SH.cyanL,
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
                  minHeight: 138,
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
          {copy(ar ? 'تحديث حي للممرات' : 'Live corridor refresh')}
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
          {copy(ar ? 'ØªØ§Ø¨Ø¹ Ø±Ø­Ù„Ø§ØªÙŠ' : 'Track my trips')}
        </button>
      </div>
    </motion.section>
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
      title: ar ? 'تدفق الرحلات' : 'Ride flow',
      detail: ar
        ? 'الخطوط والنقاط الزرقاء تشرح أين تتحرك المقاعد والطلب بين المدن.'
        : 'Blue lines and moving dots show where seats and rider demand are moving between cities.',
      accent: LANDING_COLORS.cyan,
    },
    {
      title: ar ? 'تدفق الطرود' : 'Package flow',
      detail: ar
        ? 'الخطوط المتقطعة والعناصر الذهبية توضّح كيف تستفيد الطرود من نفس الشبكة.'
        : 'Gold dashed paths and moving parcels show how package delivery uses the same network.',
      accent: LANDING_COLORS.gold,
    },
    {
      title: ar ? 'طبقة المحاكاة' : 'Simulation layer',
      detail: ar
        ? 'هذه الحركة ليست للزينة؛ إنها تشرح منطق النظام الذي يربط Mobility OS بكل خدمة في Wasel.'
        : 'This motion is not decoration. It explains the system logic that connects Mobility OS to every Wasel service.',
      accent: LANDING_COLORS.green,
    },
  ] as const;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      style={{ display: 'grid', gap: 14, height: '100%' }}
    >
      <div
        className="landing-map-shell wasel-lift-card"
        style={{
          position: 'relative',
          padding: 16,
          height: '100%',
          borderRadius: 32,
          background:
            'radial-gradient(circle at 14% 10%, rgba(22,199,242,0.18), rgba(4,18,30,0) 24%), radial-gradient(circle at 88% 14%, rgba(199,255,26,0.12), rgba(4,18,30,0) 18%), linear-gradient(165deg, rgba(7,24,39,0.96) 0%, rgba(7,27,43,0.9) 42%, rgba(4,19,31,0.96) 100%)',
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
              {copy(ar ? 'الخريطة الحية الكاملة' : 'Full live mobility map')}
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
                  ? 'Mobility OS هو المشهد الذي تتفرع منه كل خدمات Wasel.'
                  : 'Mobility OS is the scene every Wasel service branches from.',
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
                  ? 'نُظهر المحاكاة بالحجم الكامل حتى يفهم المستخدم كيف تتحرك الرحلات والطرود على نفس المسارات، ثم نفتح له الإجراء المناسب.'
                  : 'The simulation gets full space so users can understand how rides and packages move through the same corridors before they choose an action.',
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
            {copy(ar ? 'Optimized for mobile and desktop' : 'Optimized for mobile and desktop')}
          </div>
        </div>
        <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden' }}>
          <MobilityOSLandingMap ar={ar} />
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
                  ? 'ابدأ من الخريطة ثم انتقل إلى الرحلات أو الطرود أو مساحة Mobility OS الكاملة.'
                  : 'Start from the map, then move into rides, packages, or the full Mobility OS surface.',
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
                    color: '#041521',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: SH.cyanL,
                  }}
                >
                  {copy(ar ? 'افتح Mobility OS' : 'Open Mobility OS')}
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
                  {copy(ar ? 'استكشف الرحلات' : 'Explore rides')}
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
                  {copy(ar ? 'استكشف الطرود' : 'Explore packages')}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </motion.section>
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
              'radial-gradient(circle at top right, rgba(96,197,54,0.18), rgba(4,18,30,0) 30%)',
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
              {copy(ar ? 'Trust stays visible' : 'Trust stays visible')}
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
                  ? 'Identity, support, and business presence appear early, which makes the first contact with Wasel feel real and dependable.'
                  : 'Identity, support, and business presence appear early, which makes the first contact with Wasel feel real and dependable.',
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
        if (renderedSlots.length === 0) return null;
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
