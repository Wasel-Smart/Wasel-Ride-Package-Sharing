import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Mail, ShieldCheck, type LucideIcon } from 'lucide-react';
import { AUTH_PROVIDER_META, AuthProviderBadge } from '../../components/auth/AuthProviderBadge';
import { WaselLogo, WaselMark } from '../../components/wasel-ds/WaselLogo';
import { WaselBusinessFooter, WaselContactActionRow, WaselProofOfLifeBlock, WaselWhyCard } from '../../components/system/WaselPresence';
import { MobilityOSLandingMap } from './MobilityOSLandingMap';
import { C, GRAD_AURORA, GRAD_HERO, GRAD_SIGNAL, SH } from '../../utils/wasel-ds';

export const LANDING_COLORS = {
  bg: C.bg,
  bgDeep: C.bgDeep,
  panel: C.glass,
  panelSoft: 'rgba(255,255,255,0.04)',
  text: C.text,
  muted: C.textSub,
  soft: C.textMuted,
  cyan: C.cyan,
  blue: C.cyanDark,
  gold: C.gold,
  green: C.green,
  border: C.border,
  borderStrong: C.borderHov,
} as const;
export const LANDING_FONT = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";
export const LANDING_DISPLAY = "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', sans-serif)";
export const LANDING_RESPONSIVE_STYLES = `
  :root { color-scheme: dark; }
  .landing-shell, .landing-shell * { box-sizing: border-box; }
  .landing-shell > * { min-width: 0; }
  .wasel-lift-card { transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
  .landing-live-dot { animation: landingPulse 1.9s ease-in-out infinite; }
  .landing-logo-breathe { animation: landingBreath 5.8s ease-in-out infinite; transform-origin: center; }
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
  @keyframes landingBreath {
    0%, 100% { transform: scale(0.98); opacity: 0.9; filter: drop-shadow(0 0 20px rgba(22,199,242,0.18)) drop-shadow(0 0 28px rgba(199,255,26,0.08)); }
    50% { transform: scale(1.03); opacity: 1; filter: drop-shadow(0 0 32px rgba(22,199,242,0.28)) drop-shadow(0 0 42px rgba(199,255,26,0.16)); }
  }
  @media (hover: hover) and (pointer: fine) { .wasel-lift-card:hover { transform: translateY(-2px); box-shadow: 0 24px 54px rgba(0,0,0,0.24); } }
  @media (max-width: 1240px) { .landing-main-grid { grid-template-columns: 1fr !important; } }
  @media (max-width: 1040px) { .landing-signal-grid, .landing-bottom-grid { grid-template-columns: 1fr !important; } }
  @media (max-width: 780px) {
    .landing-action-grid, .landing-auth-grid, .landing-hero-highlights { grid-template-columns: 1fr !important; }
    .landing-hero-shell { grid-template-columns: 1fr !important; }
    .landing-hero-stat-grid { grid-template-columns: 1fr !important; }
    .landing-hero-meta, .landing-footer-meta { flex-direction: column !important; align-items: flex-start !important; }
  }
  @media (max-width: 640px) {
    .landing-shell { padding: 22px 14px 72px !important; }
    .landing-header-row { flex-direction: column !important; align-items: flex-start !important; }
    .landing-map-shell { padding: 12px !important; }
  }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
`;

export type LandingActionCard = { title: string; detail: string; path: string; icon: LucideIcon; color: string };
export type LandingSignalCard = { title: string; detail: string; accent: string; trendLabel: string; trendDirection: 'up' | 'down'; intensity: string; sparkline: readonly number[] };
export type LandingSlotId = 'hero' | 'map' | 'signals' | 'why' | 'trust' | 'footer';
export type LandingRowDefinition = { id: string; className?: string; style?: CSSProperties; slots: readonly LandingSlotId[] };

type LandingPageFrameProps = { children: ReactNode };
type LandingHeaderProps = { ar: boolean; signinPath?: string; signupPath?: string; showAuthActions?: boolean; onNavigate?: (path: string) => void };
type LandingHeroSectionProps = { ar: boolean; emailAuthPath: string; signupAuthPath: string; findRidePath: string; mobilityOsPath: string; myTripsPath: string; supportLine: string; businessAddress: string; heroBullets: readonly string[]; primaryActions: readonly LandingActionCard[]; authError?: string; oauthLoadingProvider?: 'google' | 'facebook' | null; showQuickAuth?: boolean; onGoogleAuth?: () => void; onFacebookAuth?: () => void; onNavigate: (path: string) => void };
type LandingMapSectionProps = { ar: boolean };
type LandingSignalSectionProps = { cards: readonly LandingSignalCard[] };
type LandingTrustSectionProps = { ar: boolean };
type LandingSlotRowsProps = { rows: readonly LandingRowDefinition[]; slots: Partial<Record<LandingSlotId, ReactNode>> };

const panel = (radius = 28): CSSProperties => ({
  borderRadius: radius,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015)), rgba(8,27,43,0.92)',
  border: `1px solid ${LANDING_COLORS.border}`,
  boxShadow: SH.card,
  backdropFilter: 'blur(22px)',
});
const copy = (value: string) => value;

export function LandingPageFrame({ children }: LandingPageFrameProps) {
  return (
    <div style={{ minHeight: '100vh', background: LANDING_COLORS.bg, color: LANDING_COLORS.text, fontFamily: LANDING_FONT, position: 'relative', overflow: 'hidden' }}>
      <style>{LANDING_RESPONSIVE_STYLES}</style>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: GRAD_HERO, pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: `${GRAD_AURORA}, radial-gradient(circle at 82% 18%, rgba(22,199,242,0.18), rgba(4,18,30,0) 26%), radial-gradient(circle at 72% 68%, rgba(199,255,26,0.14), rgba(4,18,30,0) 18%)`, pointerEvents: 'none', opacity: 0.96 }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0) 16%, rgba(255,255,255,0) 84%, rgba(255,255,255,0.03) 100%)', opacity: 0.28, mixBlendMode: 'screen', pointerEvents: 'none' }} />
      <div className="landing-shell" style={{ position: 'relative', maxWidth: 1380, margin: '0 auto', padding: '28px 20px 84px' }}>{children}</div>
    </div>
  );
}

export function LandingHeader({ ar, signinPath, signupPath, showAuthActions = false, onNavigate }: LandingHeaderProps) {
  const canShowAuthActions = Boolean(showAuthActions && signinPath && signupPath && onNavigate);
  return (
    <motion.div className="landing-header-row" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <WaselLogo size={42} theme="light" />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 999, background: 'rgba(7,26,42,0.78)', border: `1px solid ${LANDING_COLORS.borderStrong}`, color: LANDING_COLORS.muted, fontSize: '0.8rem', fontWeight: 800, boxShadow: '0 10px 24px rgba(0,0,0,0.18)' }}>
          <span className="landing-live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: LANDING_COLORS.green, boxShadow: `0 0 14px ${LANDING_COLORS.green}` }} />
          {copy(ar ? 'Ø´Ø¨ÙƒØ© Ø§Ù„Ø£Ø±Ø¯Ù† Ø§Ù„Ø­ÙŠØ©' : 'Jordan mobility network')}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {canShowAuthActions ? (
          <>
            <button aria-label={copy(ar ? 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù…Ù† Ø´Ø±ÙŠØ· Ø§Ù„Ø±Ø£Ø³' : 'Sign in from header')} type="button" onClick={() => onNavigate?.(signinPath!)} style={{ minHeight: 42, padding: '0 16px', borderRadius: 16, border: `1px solid ${LANDING_COLORS.borderStrong}`, background: 'rgba(255,255,255,0.04)', color: LANDING_COLORS.text, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}>{copy(ar ? 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„' : 'Sign in')}</button>
            <button aria-label={copy(ar ? 'Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨ Ù…Ù† Ø´Ø±ÙŠØ· Ø§Ù„Ø±Ø£Ø³' : 'Create account from header')} type="button" onClick={() => onNavigate?.(signupPath!)} style={{ minHeight: 42, padding: '0 18px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #17C7EA, #1E7CFF)', color: '#F8FBFF', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 16px 36px rgba(30,124,255,0.24)' }}>{copy(ar ? 'Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨' : 'Create account')}</button>
          </>
        ) : null}
        <WaselContactActionRow ar={ar} />
      </div>
    </motion.div>
  );
}

export function LandingHeroSection({ ar, emailAuthPath, signupAuthPath, findRidePath, mobilityOsPath, myTripsPath, supportLine, businessAddress, heroBullets, primaryActions, authError, oauthLoadingProvider, showQuickAuth = false, onGoogleAuth, onFacebookAuth, onNavigate }: LandingHeroSectionProps) {
  const bullets = heroBullets.slice(0, 3);
  const highlights = [
    { label: ar ? 'ثقة حية' : 'Live confidence', value: ar ? 'قوة المسار والتوقيت وضغط الشبكة تظهر في قراءة واحدة.' : 'Route strength, timing, and network pressure in one read.' },
    { label: ar ? 'طبقة إجراء واحدة' : 'One action layer', value: ar ? 'ابحث أو أنشئ أو أرسل من دون تغيير السياق الذهني.' : 'Find, create, or send without changing mental context.' },
  ] as const;
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: 'grid', gap: 16, height: '100%' }}>
      <div className="landing-glow-card" style={{ ...panel(34), padding: '24px', display: 'grid', gap: 22, alignContent: 'start', minHeight: '100%', overflow: 'hidden', position: 'relative' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 18%, rgba(22,199,242,0.18), rgba(4,18,30,0) 32%), radial-gradient(circle at 82% 26%, rgba(199,255,26,0.12), rgba(4,18,30,0) 24%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))', pointerEvents: 'none' }} />
        <div className="landing-hero-shell" style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0, 1.08fr) minmax(320px, 0.92fr)', gap: 20, alignItems: 'stretch' }}>
          <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', padding: '8px 12px', borderRadius: 999, background: 'rgba(22,199,242,0.1)', border: `1px solid ${LANDING_COLORS.borderStrong}`, color: LANDING_COLORS.cyan, fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{copy(ar ? 'Mobility OS للأردن' : 'Mobility OS for Jordan')}</div>
            <div style={{ display: 'grid', gap: 14 }}>
              <h1 style={{ margin: 0, maxWidth: 720, fontFamily: LANDING_DISPLAY, fontSize: 'clamp(2.7rem, 5vw, 5.15rem)', lineHeight: 0.94, letterSpacing: '-0.06em', fontWeight: 700 }}>
                <span style={{ display: 'block', color: LANDING_COLORS.text }}>{copy(ar ? 'طريقة أهدأ لقراءة الحركة.' : 'A calmer way to read movement.')}</span>
                <span style={{ display: 'block', marginTop: 10, background: GRAD_SIGNAL, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{copy(ar ? 'مسارات حية وتوقيت واضح وخطوة تالية واثقة.' : 'Live routes, clear timing, one confident next step.')}</span>
              </h1>
              <p style={{ margin: 0, maxWidth: 620, color: LANDING_COLORS.muted, fontSize: '1rem', lineHeight: 1.74 }}>{copy(ar ? 'يجب أن تبدو Wasel دقيقة وخفيفة. الشاشة الأولى تروي الآن قصة حركة حية واحدة بدل تكديس تفاصيل مشتتة، حتى يفهم الركاب والسائقون ومستخدمو التوصيل الشبكة مباشرة.' : 'Wasel should feel precise and light. The first screen now tells one live mobility story instead of stacking noisy detail, so riders, drivers, and delivery users understand the network immediately.')}</p>
            </div>
            <div style={{ display: 'grid', gap: 10, maxWidth: 620 }}>
              {bullets.map((bullet) => <div key={bullet} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, color: LANDING_COLORS.soft, fontSize: '0.92rem', lineHeight: 1.65 }}><span className="landing-live-dot" style={{ width: 8, height: 8, marginTop: 4, borderRadius: '50%', background: LANDING_COLORS.cyan, boxShadow: `0 0 12px ${LANDING_COLORS.cyan}`, flexShrink: 0 }} /><span>{bullet}</span></div>)}
            </div>
            <div className="landing-hero-highlights" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {highlights.map((item) => <div key={item.label} className="landing-glow-card wasel-lift-card" style={{ padding: '16px 16px 18px', borderRadius: 22, background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))', border: `1px solid ${LANDING_COLORS.border}`, display: 'grid', gap: 8 }}><span style={{ color: LANDING_COLORS.cyan, fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</span><span style={{ color: LANDING_COLORS.text, fontSize: '0.93rem', lineHeight: 1.5, fontWeight: 800 }}>{item.value}</span></div>)}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" onClick={() => onNavigate(mobilityOsPath || findRidePath)} style={{ minHeight: 54, padding: '0 22px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', background: GRAD_SIGNAL, color: '#041521', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: SH.cyanL }}>{copy(ar ? 'افتح خريطة Mobility OS الحية' : 'Open Mobility OS live map')}<ArrowRight size={16} /></button>
              <button type="button" onClick={() => onNavigate(findRidePath)} style={{ minHeight: 54, padding: '0 20px', borderRadius: 18, border: `1px solid ${LANDING_COLORS.borderStrong}`, background: 'rgba(255,255,255,0.04)', color: LANDING_COLORS.text, fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer' }}>{copy(ar ? 'استكشف المسارات' : 'Explore routes')}</button>
              <div className="landing-hero-meta" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', color: LANDING_COLORS.soft, fontSize: '0.82rem' }}><span>{supportLine}</span><span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(239,246,255,0.26)' }} /><span>{businessAddress}</span></div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 14, alignContent: 'stretch' }}>
            <div style={{ position: 'relative', minHeight: 320, padding: '20px 12px', borderRadius: 34, background: 'radial-gradient(circle at 50% 38%, rgba(22,199,242,0.2), rgba(4,18,30,0) 28%), radial-gradient(circle at 56% 62%, rgba(199,255,26,0.18), rgba(4,18,30,0) 22%), linear-gradient(160deg, rgba(6,23,38,0.42) 0%, rgba(10,34,55,0.18) 52%, rgba(9,28,47,0.12) 100%)', boxShadow: '0 34px 80px rgba(1,10,18,0.24)', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.06), rgba(255,255,255,0) 34%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'grid', gap: 14, justifyItems: 'center', textAlign: 'center' }}>
                <span style={{ color: LANDING_COLORS.cyan, fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', opacity: 0.96 }}>{copy(ar ? 'إشارة Wasel' : 'Wasel signal')}</span>
                <div className="landing-logo-breathe" style={{ position: 'relative', width: 'min(100%, 320px)', minHeight: 240, display: 'grid', placeItems: 'center' }}>
                  <div aria-hidden="true" style={{ position: 'absolute', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,199,242,0.26) 0%, rgba(22,199,242,0.1) 36%, rgba(4,18,30,0) 72%)', filter: 'blur(24px)' }} />
                  <div aria-hidden="true" style={{ position: 'absolute', width: 210, height: 210, borderRadius: '50%', background: 'radial-gradient(circle, rgba(199,255,26,0.24) 0%, rgba(199,255,26,0.08) 42%, rgba(4,18,30,0) 78%)', filter: 'blur(24px)', transform: 'translate(28px, 22px)' }} />
                  <WaselMark size={214} />
                </div>
                <span style={{ maxWidth: 320, color: LANDING_COLORS.muted, fontSize: '0.88rem', lineHeight: 1.6 }}>{copy(ar ? 'هوية حية تعكس نفس نظام الحركة المباشر الظاهر داخل الخريطة.' : 'A living identity that matches the same live mobility system shown in the map.')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="landing-action-grid" style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {primaryActions.slice(0, 3).map((card) => { const Icon = card.icon; return <button key={card.title} aria-label={card.title} type="button" onClick={() => onNavigate(card.path)} className="landing-glow-card wasel-lift-card" style={{ display: 'grid', gap: 10, alignContent: 'start', minHeight: 138, padding: '18px', borderRadius: 24, textAlign: 'left', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.024))', border: `1px solid ${card.color}30`, cursor: 'pointer', boxShadow: '0 18px 36px rgba(1,10,18,0.18)' }}><div style={{ width: 46, height: 46, borderRadius: 15, display: 'grid', placeItems: 'center', background: `${card.color}18`, border: `1px solid ${card.color}42`, boxShadow: `0 14px 28px ${card.color}18` }}><Icon size={20} color={card.color} /></div><div style={{ color: LANDING_COLORS.text, fontWeight: 900, fontSize: '0.96rem', letterSpacing: '-0.03em' }}>{card.title}</div><div style={{ color: LANDING_COLORS.soft, fontSize: '0.82rem', lineHeight: 1.58 }}>{card.detail}</div></button>; })}
        </div>
      </div>
      {showQuickAuth && onGoogleAuth && onFacebookAuth ? (
        <div style={{ ...panel(28), padding: '18px', display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: LANDING_COLORS.cyan, fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{copy(ar ? 'دخول سريع' : 'Fast access')}</span>
            <div style={{ color: LANDING_COLORS.text, fontFamily: LANDING_DISPLAY, fontSize: '1.3rem', fontWeight: 700 }}>{copy(ar ? 'ابدأ بخطوة واحدة واضحة.' : 'Start in one clean step.')}</div>
            <p style={{ margin: 0, color: LANDING_COLORS.muted, fontSize: '0.9rem', lineHeight: 1.6 }}>{copy(ar ? 'استخدم Google أو Facebook أو البريد الإلكتروني للوصول إلى نفس تجربة Wasel.' : 'Use Google, Facebook, or email to enter the same Wasel flow.')}</p>
          </div>
          {authError ? <div role="alert" style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(255,68,85,0.12)', border: '1px solid rgba(255,68,85,0.26)', color: '#FF9BA4', fontSize: '0.86rem', lineHeight: 1.6 }}>{authError}</div> : null}
          <div className="landing-auth-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            {(['google', 'facebook'] as const).map((provider) => { const meta = AUTH_PROVIDER_META[provider]; const loading = oauthLoadingProvider === provider; return <button key={provider} type="button" onClick={provider === 'google' ? onGoogleAuth : onFacebookAuth} disabled={Boolean(oauthLoadingProvider)} style={{ minHeight: 54, borderRadius: 18, border: `1px solid ${meta.accent}40`, background: `${meta.accent}12`, color: LANDING_COLORS.text, padding: '0 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: '0.9rem', fontWeight: 800, cursor: oauthLoadingProvider ? 'not-allowed' : 'pointer', opacity: oauthLoadingProvider && !loading ? 0.55 : 1 }}><AuthProviderBadge provider={provider} size={20} /><span>{loading ? (ar ? `جار الاتصال عبر ${meta.label}...` : `Connecting ${meta.label}...`) : (ar ? `تابع عبر ${meta.label}` : `Continue with ${meta.label}`)}</span></button>; })}
            <button aria-label={copy(ar ? 'ØªØ§Ø¨Ø¹ Ø¨Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„' : 'Continue with email')} type="button" onClick={() => onNavigate(emailAuthPath)} disabled={Boolean(oauthLoadingProvider)} style={{ minHeight: 54, borderRadius: 18, border: `1px solid ${LANDING_COLORS.borderStrong}`, background: 'rgba(255,255,255,0.04)', color: LANDING_COLORS.text, padding: '0 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: '0.9rem', fontWeight: 800, cursor: oauthLoadingProvider ? 'not-allowed' : 'pointer', opacity: oauthLoadingProvider ? 0.55 : 1 }}><Mail size={18} /><span>{copy(ar ? 'ØªØ§Ø¨Ø¹ Ø¨Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„' : 'Continue with email')}</span></button>
          </div>
          <button aria-label={copy(ar ? 'Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨ Ù…Ù† Ø³Ø·Ø­ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø³Ø±ÙŠØ¹' : 'Create account from quick access')} type="button" onClick={() => onNavigate(signupAuthPath)} style={{ minHeight: 44, width: 'fit-content', padding: '0 16px', borderRadius: 16, border: `1px solid ${LANDING_COLORS.border}`, background: 'transparent', color: LANDING_COLORS.soft, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}>{copy(ar ? 'Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨' : 'Create account')}</button>
        </div>
      ) : null}
      <div className="landing-footer-meta" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', color: LANDING_COLORS.soft, fontSize: '0.82rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: LANDING_COLORS.text }}><span className="landing-live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: LANDING_COLORS.green, boxShadow: `0 0 12px ${LANDING_COLORS.green}` }} />{copy(ar ? 'تحديث حي للممرات' : 'Live corridor refresh')}</span>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(239,246,255,0.28)' }} />
        <button type="button" onClick={() => onNavigate(myTripsPath)} style={{ background: 'transparent', border: 'none', color: LANDING_COLORS.soft, padding: 0, cursor: 'pointer', fontWeight: 700 }}>{copy(ar ? 'ØªØ§Ø¨Ø¹ Ø±Ø­Ù„Ø§ØªÙŠ' : 'Track my trips')}</button>
      </div>
    </motion.section>
  );
}

export function LandingMapSection({ ar }: LandingMapSectionProps) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} style={{ display: 'grid', gap: 14, height: '100%' }}>
      <div className="landing-map-shell wasel-lift-card" style={{ position: 'relative', padding: 16, height: '100%', borderRadius: 32, background: 'radial-gradient(circle at 14% 10%, rgba(22,199,242,0.18), rgba(4,18,30,0) 24%), radial-gradient(circle at 88% 14%, rgba(199,255,26,0.12), rgba(4,18,30,0) 18%), linear-gradient(165deg, rgba(7,24,39,0.96) 0%, rgba(7,27,43,0.9) 42%, rgba(4,19,31,0.96) 100%)', boxShadow: SH.navy, overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: LANDING_COLORS.cyan, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 900 }}>{copy(ar ? 'Ø¹Ø±Ø¶ Ø§Ù„Ù…Ù…Ø±Ø§Øª Ø§Ù„Ø­ÙŠ' : 'Live corridor view')}</div>
            <div style={{ marginTop: 6, fontFamily: LANDING_DISPLAY, fontSize: '1.12rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{copy(ar ? 'The Mobility Map is part of the same Wasel surface.' : 'The Mobility Map is part of the same Wasel surface.')}</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', color: LANDING_COLORS.soft, fontSize: '0.78rem' }}><span className="landing-live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: LANDING_COLORS.green, boxShadow: `0 0 10px ${LANDING_COLORS.green}` }} />{copy(ar ? 'Optimized for mobile and desktop' : 'Optimized for mobile and desktop')}</div>
        </div>
        <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden' }}><MobilityOSLandingMap ar={ar} /></div>
      </div>
    </motion.section>
  );
}

export function LandingSignalSection({ cards }: LandingSignalSectionProps) {
  const sparklinePath = (values: readonly number[]) => values.map((value, index) => { const max = Math.max(...values); const min = Math.min(...values); const x = (index / Math.max(values.length - 1, 1)) * 100; const y = max === min ? 50 : 100 - ((value - min) / (max - min)) * 100; return `${index === 0 ? 'M' : 'L'} ${x} ${y}`; }).join(' ');
  return <>{cards.map((card) => <div key={card.title} className="landing-glow-card wasel-lift-card" style={{ ...panel(24), padding: '20px', display: 'grid', gap: 16, position: 'relative', overflow: 'hidden' }}><div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at top right, ${card.accent}18, transparent 28%)`, pointerEvents: 'none' }} /><div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}><div><div style={{ color: card.accent, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 900 }}>{card.title}</div><div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 8, color: card.trendDirection === 'up' ? card.accent : LANDING_COLORS.soft, fontSize: '0.8rem', fontWeight: 800 }}><span>{card.trendDirection === 'up' ? 'Up' : 'Down'}</span><span>{card.trendLabel}</span></div></div><div style={{ minWidth: 92, padding: '8px 10px', borderRadius: 16, background: `${card.accent}12`, border: `1px solid ${card.accent}30`, color: card.accent, fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>{card.intensity}</div></div><div style={{ position: 'relative', padding: '10px 0 4px' }}><svg viewBox="0 0 100 28" preserveAspectRatio="none" style={{ width: '100%', height: 32, overflow: 'visible' }}><path d="M 0 24 C 20 20, 38 18, 100 8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" /><path d={sparklinePath(card.sparkline)} fill="none" stroke={card.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div><p style={{ margin: 0, color: LANDING_COLORS.soft, fontSize: '0.86rem', lineHeight: 1.68 }}>{card.detail}</p></div>)}</>;
}

export function LandingTrustSection({ ar }: LandingTrustSectionProps) {
  return <div style={{ display: 'grid', gap: 14 }}><div className="landing-glow-card wasel-lift-card" style={{ ...panel(24), padding: '20px', position: 'relative', overflow: 'hidden' }}><div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(96,197,54,0.18), rgba(4,18,30,0) 30%)', pointerEvents: 'none' }} /><div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 46, height: 46, borderRadius: 16, display: 'grid', placeItems: 'center', background: `${LANDING_COLORS.green}14`, border: `1px solid ${LANDING_COLORS.green}30`, boxShadow: SH.green }}><ShieldCheck size={18} color={LANDING_COLORS.green} /></div><div><div style={{ color: LANDING_COLORS.text, fontWeight: 900, fontSize: '1.02rem', letterSpacing: '-0.03em' }}>{copy(ar ? 'Trust stays visible' : 'Trust stays visible')}</div><div style={{ marginTop: 4, color: LANDING_COLORS.soft, fontSize: '0.84rem', lineHeight: 1.65 }}>{copy(ar ? 'Identity, support, and business presence appear early, which makes the first contact with Wasel feel real and dependable.' : 'Identity, support, and business presence appear early, which makes the first contact with Wasel feel real and dependable.')}</div></div></div></div><WaselProofOfLifeBlock ar={ar} /></div>;
}

export function LandingSlotRows({ rows, slots }: LandingSlotRowsProps) {
  return <>{rows.map((row) => { const renderedSlots = row.slots.flatMap((slotId) => slots[slotId] ? [{ id: slotId, node: slots[slotId] as ReactNode }] : []); if (renderedSlots.length === 0) return null; return <div key={row.id} className={row.className} style={row.style}>{renderedSlots.map((slot) => <Fragment key={slot.id}>{slot.node}</Fragment>)}</div>; })}</>;
}

export function LandingWhySlot({ ar }: { ar: boolean }) { return <WaselWhyCard ar={ar} compact />; }
export function LandingFooterSlot({ ar }: { ar: boolean }) { return <WaselBusinessFooter ar={ar} />; }

