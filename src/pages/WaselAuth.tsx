import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowRight,
  Bus,
  CheckCircle2,
  Lock,
  Mail,
  Package,
  Phone,
  Shield,
  UserRound,
  Zap,
} from 'lucide-react';
import { WaselHeroMark, WaselLogo } from '../components/wasel-ui/WaselLogo';
import { WaselButton } from '../components/wasel-ui/WaselButton';
import { WaselInput } from '../components/wasel-ui/WaselInput';
import { WaselCard } from '../components/wasel-ui/WaselCard';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { checkRateLimit, resetRateLimit, validateEmail } from '../utils/security';
import { useAuth } from '../contexts/AuthContext';
import { getConfig, getWhatsAppSupportUrl, normalizeReturnToPath } from '../utils/env';
import { friendlyAuthError, pwStrength } from '../utils/authHelpers';

import { C, R, TYPE, F, SPACE } from '../utils/wasel-ds';
import { tx } from '../locales/tx';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'signin' | 'signup';

// ─── Feature list for the brand panel ────────────────────────────────────────
const BRAND_FEATURES = [
  { icon: <Zap size={14} />, text: 'Live route graph', color: C.cyan },
  { icon: <Package size={14} />, text: 'Parcels on route', color: C.gold },
  { icon: <Bus size={14} />, text: 'Scheduled lanes', color: C.green },
  { icon: <Shield size={14} />, text: 'Trust by default', color: C.purple },
] as const;

const BRAND_FEATURES_AR = [
  { icon: <Zap size={14} />, text: 'رسم المسارات المباشر', color: C.cyan },
  { icon: <Package size={14} />, text: 'طرود على نفس المسار', color: C.gold },
  { icon: <Bus size={14} />, text: 'خطوط مجدولة', color: C.green },
  { icon: <Shield size={14} />, text: 'الثقة من البداية', color: C.purple },
] as const;

const BRAND_METRICS = [
  { value: '3', label: 'mobility surfaces', accent: C.cyan },
  { value: '1', label: 'trusted account', accent: C.gold },
  { value: 'Live', label: 'route intelligence', accent: C.green },
] as const;

const BRAND_METRICS_AR = [
  { value: '٣', label: 'أسطح تنقل', accent: C.cyan },
  { value: '١', label: 'حساب موثوق', accent: C.gold },
  { value: 'مباشر', label: 'ذكاء المسار', accent: C.green },
] as const;

const BRAND_PILLS = ['Verified', 'Fast', 'Clear'] as const;
const BRAND_PILLS_AR = ['موثّق', 'سريع', 'واضح'] as const;

// ─── Brand panel (left column) ────────────────────────────────────────────────
function BrandPanel() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const metrics = ar ? BRAND_METRICS_AR : BRAND_METRICS;
  const features = ar ? BRAND_FEATURES_AR : BRAND_FEATURES;
  const pills = ar ? BRAND_PILLS_AR : BRAND_PILLS;

  return (
    <div
      className="auth-brand-panel"
      style={{
        background: `linear-gradient(145deg, ${C.navy} 0%, ${C.navyMid} 48%, ${C.cardSolid} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${SPACE[16]} ${SPACE[12]}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glows */}
      <div
        style={{
          position: 'absolute',
          top: -110,
          right: -80,
          width: 460,
          height: 460,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.cyanGlow}, transparent 66%)`,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -100,
          left: -80,
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.blueDim}cc, transparent 66%)`,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
        <div
          style={{ margin: `0 0 ${SPACE[6]}`, display: 'flex', justifyContent: 'center' }}
        >
          <WaselHeroMark size={140} />
        </div>

        <h2
          style={{
            fontSize: TYPE.size['3xl'],
            fontWeight: TYPE.weight.ultra,
            color: C.text,
            letterSpacing: '-0.04em',
            margin: `0 0 ${SPACE[3]}`,
            lineHeight: 1.12,
          }}
        >
          <span style={{ display: 'block' }}>{tx('waselAuth.one_identity')}</span>
          <span
            style={{
              display: 'block',
              background: 'linear-gradient(90deg, #55E9FF, #60A5FA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {tx('waselAuth.for_every_route')}
          </span>
        </h2>

        <p
          style={{
            fontSize: TYPE.size.base,
            color: C.textMuted,
            lineHeight: TYPE.lineHeight.loose,
            marginBottom: SPACE[6],
          }}
        >
          {tx('waselAuth.rides_parcels_buses_trust_and_support_stay_under_one_clear_account')}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: SPACE[3],
            marginBottom: SPACE[6],
          }}
        >
          {metrics.map(item => (
            <div
              key={item.label}
              style={{
                borderRadius: R.xl,
                border: `1px solid ${item.accent}24`,
                background: `${item.accent}12`,
                padding: `${SPACE[3]} ${SPACE[4]}`,
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  color: C.text,
                  fontSize: TYPE.size.lg,
                  fontWeight: TYPE.weight.ultra,
                  lineHeight: TYPE.lineHeight.tight,
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: C.textMuted,
                  fontSize: TYPE.size.xs,
                  textTransform: 'uppercase',
                  letterSpacing: TYPE.letterSpacing.wide,
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[3], textAlign: 'left' }}>
          {features.map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: R.sm,
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}28`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.color,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: TYPE.size.sm, color: `${C.text}99` }}>{item.text}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: SPACE[3],
            justifyContent: 'center',
            marginTop: SPACE[8],
            flexWrap: 'wrap',
          }}
        >
          {pills.map(label => (
            <span
              key={label}
              style={{
                fontSize: TYPE.size.xs,
                color: `${C.text}66`,
                background: `${C.text}0a`,
                border: `1px solid ${C.text}18`,
                borderRadius: R.full,
                padding: '4px 10px',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Password strength bar ────────────────────────────────────────────────────
function StrengthBar({ password }: { password: string }) {
  const strength = pwStrength(password);
  if (!password) return null;
  return (
    <div>
      <div style={{ display: 'flex', gap: SPACE[1], marginBottom: SPACE[1] }}>
        {[1, 2, 3, 4, 5].map(n => (
          <div
            key={n}
            style={{
              flex: 1,
              height: 3,
              borderRadius: R.full,
              background: n <= strength.score ? strength.color : `${C.text}14`,
              transition: 'background 200ms ease',
            }}
          />
        ))}
      </div>
      {strength.label && (
        <span style={{ fontSize: TYPE.size.xs, color: strength.color, fontFamily: F }}>
          {strength.label}
        </span>
      )}
    </div>
  );
}

// ─── Tab switcher ─────────────────────────────────────────────────────────────
function TabSwitcher({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <div
      style={{
        display: 'flex',
        background: C.cardSolid,
        borderRadius: R.xl,
        padding: 4,
        marginBottom: SPACE[7],
        border: `1px solid ${C.border}`,
      }}
    >
      {(['signin', 'signup'] as Tab[]).map(value => {
        const active = tab === value;
        return (
          <motion.button
            key={value}
            onClick={() => onChange(value)}
            aria-label={
              value === 'signin'
                ? ar
                  ? 'التبديل إلى تسجيل الدخول'
                  : 'Switch to sign in'
                : ar
                  ? 'التبديل إلى إنشاء حساب'
                  : 'Switch to create account'
            }
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1,
              height: 42,
              borderRadius: R.lg,
              border: 'none',
              cursor: 'pointer',
              fontSize: TYPE.size.sm,
              fontWeight: active ? TYPE.weight.black : TYPE.weight.semibold,
              fontFamily: F,
              background: active
                ? 'linear-gradient(135deg, #00E5FF 0%, #0e5cb0 100%)'
                : 'transparent',
              color: active ? C.bg : C.textMuted,
              boxShadow: active ? `0 2px 12px ${C.cyanGlow}` : 'none',
              transition: 'all 150ms ease',
            }}
          >
            {value === 'signin'
              ? ar
                ? 'تسجيل الدخول'
                : 'Sign in'
              : ar
                ? 'إنشاء حساب'
                : 'Create account'}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WaselAuth() {
  const [params] = useSearchParams();
  const rawTab = params.get('tab')?.toLowerCase();
  const initialTab: Tab = rawTab === 'signup' || rawTab === 'register' ? 'signup' : 'signin';
  const passwordResetCompleted = params.get('reset') === 'success';
  const { language } = useLanguage();
  const ar = language === 'ar';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [notice, setNotice] = useState(
    passwordResetCompleted
      ? ar
        ? 'تم تحديث كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.'
        : 'Password updated. Sign in with your new password.'
      : '',
  );

  const { signIn, register, loading, user } = useLocalAuth();
  const { resetPassword, signInWithGoogle, signInWithFacebook } = useAuth();
  const nav = useIframeSafeNavigate();
  const mountedRef = useRef(true);
  const { supportWhatsAppNumber } = getConfig();

  const safeReturnTo = normalizeReturnToPath(params.get('returnTo'));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user && mountedRef.current) nav(safeReturnTo);
  }, [user, nav, safeReturnTo]);

  const pushSuccessRedirect = () => {
    setSuccess(true);
    setTimeout(() => {
      if (mountedRef.current) nav(safeReturnTo);
    }, 700);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'signin') {
      await handleSignIn();
    } else {
      await handleSignUp();
    }
  };

  const handleTabChange = (next: Tab) => {
    setTab(next);
    setError('');
    setSuccess(false);
    if (!passwordResetCompleted) {
      setNotice('');
    }
  };

  const handleSignIn = async () => {
    setError('');
    if (!passwordResetCompleted) {
      setNotice('');
    }
    if (!email.trim()) {
      setError(tx('waselAuth.error_enter_email'));
      return;
    }
    if (!validateEmail(email)) {
      setError(tx('waselAuth.error_enter_valid_email'));
      return;
    }
    if (!password) {
      setError(tx('waselAuth.error_enter_password'));
      return;
    }
    if (!checkRateLimit(`signin:${email}`, { maxRequests: 5, windowMs: 60_000 })) {
      setError(tx('waselAuth.error_too_many_attempts'));
      return;
    }
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(friendlyAuthError(signInError, tx('waselAuth.error_signin_failed')));
      return;
    }
    resetRateLimit(`signin:${email}`);
    pushSuccessRedirect();
  };

  const handleSignUp = async () => {
    setError('');
    if (!passwordResetCompleted) {
      setNotice('');
    }
    if (!name.trim()) {
      setError(tx('waselAuth.error_enter_full_name'));
      return;
    }
    if (!email.trim()) {
      setError(tx('waselAuth.error_enter_email'));
      return;
    }
    if (!validateEmail(email)) {
      setError(tx('waselAuth.error_enter_valid_email'));
      return;
    }
    if (password.length < 8) {
      setError(tx('waselAuth.error_password_min_length'));
      return;
    }
    if (!checkRateLimit(`signup:${email}`, { maxRequests: 3, windowMs: 60_000 })) {
      setError(tx('waselAuth.error_too_many_attempts'));
      return;
    }
    const registration = await register(name, email, password, phone, safeReturnTo);
    if (registration.error) {
      setError(friendlyAuthError(registration.error, tx('waselAuth.error_signup_failed')));
      return;
    }
    if (registration.requiresEmailConfirmation) {
      setPassword('');
      setNotice(
        tx('waselAuth.confirm_email_notice', { email: registration.email ?? email }),
      );
      setTab('signin');
      resetRateLimit(`signup:${email}`);
      return;
    }
    resetRateLimit(`signup:${email}`);
    pushSuccessRedirect();
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError(tx('waselAuth.error_enter_email_first'));
      return;
    }
    if (!validateEmail(email)) {
      setError(tx('waselAuth.error_enter_valid_email'));
      return;
    }
    const { error: resetError } = await resetPassword(email, safeReturnTo);
    if (resetError) {
      setError(friendlyAuthError(resetError, tx('waselAuth.error_reset_failed')));
      return;
    }
    setError('');
    toast.success(tx('waselAuth.reset_link_sent', { email }));
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error: oauthError } = await signInWithGoogle(safeReturnTo);

    if (oauthError) {
      setError(friendlyAuthError(oauthError, tx('waselAuth.error_google_failed')));
    }
  };

  const handleFacebookSignIn = async () => {
    setError('');
    const { error: oauthError } = await signInWithFacebook(safeReturnTo);

    if (oauthError) {
      setError(friendlyAuthError(oauthError, tx('waselAuth.error_facebook_failed')));
    }
  };

  const handleWhatsAppHelp = () => {
    if (!supportWhatsAppNumber) {
      setError(tx('waselAuth.error_whatsapp_not_configured'));
      return;
    }
    window.open(getWhatsAppSupportUrl(ar ? 'مرحبا واصل' : 'Hi Wasel'), '_blank', 'noopener,noreferrer');
  };

  const socialButtons = [
    { label: 'Google', color: '#4285F4', onClick: handleGoogleSignIn },
    { label: 'Facebook', color: '#1877F2', onClick: handleFacebookSignIn },
    ...(supportWhatsAppNumber
      ? [{ label: 'WhatsApp', color: '#25D366', onClick: handleWhatsAppHelp }]
      : []),
  ] as const;

  return (
    <div
      className="auth-grid"
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: F,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
      }}
    >
      <style>{`
        @media(max-width:768px){
          .auth-grid{grid-template-columns:1fr!important}
          .auth-brand-panel{display:none!important}
          .auth-form-panel{padding:${SPACE[7]} ${SPACE[5]}!important;align-items:flex-start!important}
          .auth-mobile-header{display:flex!important}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <BrandPanel />

      {/* ── Form panel ─────────────────────────────────────────────────── */}
      <div
        className="auth-form-panel"
        style={{
          background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bgAlt} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${SPACE[16]} ${SPACE[12]}`,
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Mobile header (hidden on desktop) */}
          <div
            className="auth-mobile-header"
            style={{
              display: 'none',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              marginBottom: SPACE[7],
              paddingBottom: SPACE[6],
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <WaselLogo size={64} theme="light" variant="full" />
            <h2
              style={{
                fontSize: TYPE.size.xl,
                fontWeight: TYPE.weight.ultra,
                color: C.text,
                marginTop: SPACE[4],
                marginBottom: SPACE[2],
                letterSpacing: '-0.03em',
              }}
            >
              <span style={{ color: C.cyan }}>{tx('waselAuth.one_identity_2')}</span>
            </h2>
            <p style={{ fontSize: TYPE.size.sm, color: C.textMuted, marginBottom: SPACE[3] }}>
              {tx('waselAuth.sign_in_once_for_rides_parcels_buses_and_trust')}
            </p>
          </div>

          <TabSwitcher tab={tab} onChange={handleTabChange} />

          {/* Heading */}
          <div style={{ marginBottom: SPACE[6] }}>
            <h3
              style={{
                fontSize: TYPE.size['2xl'],
                fontWeight: TYPE.weight.ultra,
                color: C.text,
                margin: `0 0 ${SPACE[2]}`,
                letterSpacing: '-0.02em',
              }}
            >
              {ar
                ? tab === 'signin'
                  ? 'مرحباً بعودتك إلى واصل'
                  : 'أنشئ حسابك في واصل'
                : tab === 'signin'
                  ? 'Welcome back to Wasel'
                  : 'Create your Wasel account'}
            </h3>
            <p
              style={{
                fontSize: TYPE.size.sm,
                color: C.textMuted,
                margin: 0,
                lineHeight: TYPE.lineHeight.relaxed,
              }}
            >
              {tab === 'signin'
                ? tx('waselAuth.subtitle_signin')
                : tx('waselAuth.subtitle_signup')}
            </p>
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {notice && !error && !success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: SPACE[5] }}
              >
                <WaselCard
                  variant="solid"
                  padding={`${SPACE[3]} ${SPACE[4]}`}
                  radius={R.lg}
                  style={{ background: C.greenDim, border: `1px solid ${C.green}40` }}
                >
                  <span style={{ fontSize: TYPE.size.sm, color: C.green, fontFamily: F }}>
                    {notice}
                  </span>
                </WaselCard>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: SPACE[5] }}
              >
                <WaselCard
                  variant="solid"
                  padding={`${SPACE[3]} ${SPACE[4]}`}
                  radius={R.lg}
                  style={{ background: C.errorDim, border: `1px solid ${C.error}40` }}
                >
                  <span style={{ fontSize: TYPE.size.sm, color: C.error, fontFamily: F }}>
                    {error}
                  </span>
                </WaselCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success banner */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ marginBottom: SPACE[5] }}
              >
                <WaselCard
                  variant="solid"
                  padding={`${SPACE[3]} ${SPACE[4]}`}
                  radius={R.lg}
                  style={{ background: C.greenDim, border: `1px solid ${C.green}40` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2] }}>
                    <CheckCircle2 size={16} color={C.green} />
                    <span style={{ fontSize: TYPE.size.sm, color: C.green, fontFamily: F }}>
                      {tx('waselAuth.signed_in_successfully_redirecting_now')}
                    </span>
                  </div>
                </WaselCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fields */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              <form
                onSubmit={handleFormSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: SPACE[4] }}
              >
                {tab === 'signup' && (
                  <WaselInput
                    id="full-name"
                    label={tx('auth.fullName')}
                    description={tx('waselAuth.as_shown_on_your_profile')}
                    value={name}
                    onChange={setName}
                    placeholder={tx('waselAuth.ahmad_al_rashid')}
                    icon={<UserRound size={16} />}
                  />
                )}

                <WaselInput
                  id="auth-email"
                  label={tx('common.email')}
                  description={tx('waselAuth.used_for_sign_in')}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder={tx('waselAuth.you_example_com')}
                  icon={<Mail size={16} />}
                />

                <WaselInput
                  id="auth-password"
                  label={tx('auth.password')}
                  description={
                    tab === 'signin'
                      ? tx('waselAuth.your_account_password')
                      : tx('waselAuth.minimum_8_characters')
                  }
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder={
                    tab === 'signin'
                      ? tx('waselAuth.enter_your_password')
                      : tx('waselAuth.create_a_secure_password')
                  }
                  icon={<Lock size={16} />}
                  hint={
                    tab === 'signup' && password.length > 0 ? (
                      <StrengthBar password={password} />
                    ) : undefined
                  }
                />

                {tab === 'signup' && (
                  <WaselInput
                    id="auth-phone"
                    label={tx('auth.phoneNumber')}
                    description={tx('common.optional')}
                    type="tel"
                    value={phone}
                    onChange={setPhone}
                    placeholder="+962 79 123 4567"
                    icon={<Phone size={16} />}
                  />
                )}

                {tab === 'signin' && (
                  <div style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.cyan,
                        fontSize: TYPE.size.xs,
                        cursor: 'pointer',
                        fontFamily: F,
                        padding: 0,
                      }}
                    >
                      {tx('waselAuth.forgot_password')}
                    </button>
                  </div>
                )}

                <WaselButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  disabled={success}
                  type="submit"
                  aria-label={tab === 'signin' ? tx('waselAuth.submit_signin') : tx('waselAuth.submit_signup')}
                  iconEnd={<ArrowRight size={16} />}
                >
                  {tab === 'signin' ? tx('waselAuth.sign_in') : tx('waselAuth.create_account')}
                </WaselButton>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: TYPE.size.xs, color: C.textMuted }}>
                    {tx('waselAuth.or_continue_with')}
                  </span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>

                {/* Social buttons */}
                <div style={{ display: 'flex', gap: SPACE[2], flexWrap: 'wrap' }}>
                  {socialButtons.map(social => (
                    <motion.button
                      key={social.label}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      disabled={loading || success}
                      onClick={() => {
                        void social.onClick();
                      }}
                      style={{
                        flex: '1 1 120px',
                        height: 44,
                        borderRadius: R.lg,
                        border: `1px solid ${social.color}30`,
                        background: `${social.color}0C`,
                        color: social.color,
                        fontWeight: TYPE.weight.black,
                        fontSize: TYPE.size.sm,
                        fontFamily: F,
                        cursor: loading || success ? 'not-allowed' : 'pointer',
                        opacity: loading || success ? 0.55 : 1,
                        transition: 'all 150ms ease',
                      }}
                    >
                      {social.label}
                    </motion.button>
                  ))}
                </div>
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Legal */}
          <p
            style={{
              fontSize: TYPE.size.xs,
              color: C.textMuted,
              textAlign: 'center',
              marginTop: SPACE[6],
              lineHeight: TYPE.lineHeight.relaxed,
            }}
          >
            {tx('waselAuth.by_continuing_you_agree_to_our')}{' '}
            <button
              type="button"
              onClick={() => nav('/terms')}
              style={{
                color: C.cyan,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
              }}
            >
              {tx('sidebar.terms')}
            </button>{' '}
            {tx('waselAuth.and')}{' '}
            <button
              type="button"
              onClick={() => nav('/privacy')}
              style={{
                color: C.cyan,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
              }}
            >
              {tx('sidebar.privacy')}
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
