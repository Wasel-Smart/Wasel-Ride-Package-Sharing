import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Lock,
  Mail,
  Phone,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { WaselHeroMark, WaselLogo } from '../components/wasel-ds/WaselLogo';
import { WaselButton }               from '../components/wasel-ui/WaselButton';
import { WaselInput }                from '../components/wasel-ui/WaselInput';
import { WaselCard }                 from '../components/wasel-ui/WaselCard';
import { useLocalAuth }              from '../contexts/LocalAuth';
import { useIframeSafeNavigate }     from '../hooks/useIframeSafeNavigate';
import { checkRateLimit, validateEmail } from '../utils/security';
import { useAuth }                   from '../contexts/AuthContext';
import { getConfig, getWhatsAppSupportUrl } from '../utils/env';
import { friendlyAuthError, getPasswordRequirements, normalizeEmailInput, pwStrength, validateFullName, validatePassword } from '../utils/authHelpers';
import { C, R, TYPE, F, SPACE, SH, GRAD_HERO } from '../utils/wasel-ds';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'signin' | 'signup';

type PendingAction = 'google' | 'facebook' | 'reset' | 'whatsapp' | null;

// ─── Feature list for the brand panel ────────────────────────────────────────
const BRAND_FEATURES = [
  { icon: <Shield size={14} />, text: 'Secure access', color: C.cyan },
  { icon: <Mail size={14} />, text: 'One account', color: C.gold },
] as const;

const SOCIAL_META: Record<string, { accent: string; bg: string; border: string }> = {
  Google: { accent: '#4285F4', bg: 'rgba(66,133,244,0.10)', border: 'rgba(66,133,244,0.20)' },
  Facebook: { accent: '#1877F2', bg: 'rgba(24,119,242,0.10)', border: 'rgba(24,119,242,0.20)' },
  WhatsApp: { accent: '#25D366', bg: 'rgba(37,211,102,0.10)', border: 'rgba(37,211,102,0.20)' },
};

// ─── Brand panel (left column) ────────────────────────────────────────────────
function BrandPanel() {
  return (
    <div
      className="auth-brand-panel"
      style={{
        background: GRAD_HERO,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        `${SPACE[16]} ${SPACE[12]}`,
        position:       'relative',
        overflow:       'hidden',
      }}
    >
      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: -110, right: -80, width: 460, height: 460, borderRadius: '50%', background: `radial-gradient(circle, ${C.cyanGlow}, transparent 66%)`, filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -80, width: 420, height: 420, borderRadius: '50%', background: `radial-gradient(circle, ${C.blueDim}cc, transparent 66%)`, filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 24, borderRadius: 40, border: `1px solid ${C.borderFaint}`, pointerEvents: 'none', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 420 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE[2], padding: '8px 14px', borderRadius: R.full, marginBottom: SPACE[6], background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderFaint}`, color: C.blueLight, fontSize: TYPE.size.xs, fontWeight: TYPE.weight.bold, letterSpacing: TYPE.letterSpacing.wide, textTransform: 'uppercase' }}>
          <Sparkles size={12} />
          Wasel Access
        </div>
        <WaselLogo
          size={48}
          theme="light"
          variant="full"
          showWordmark
          subtitle=""
          framed={false}
        />
        <div style={{ margin: `${SPACE[8]} 0 ${SPACE[6]}` }}>
          <WaselHeroMark size={120} />
        </div>

        <h2 style={{ fontSize: TYPE.size['3xl'], fontWeight: TYPE.weight.ultra, color: C.text, letterSpacing: '-0.04em', margin: `0 0 ${SPACE[3]}`, lineHeight: 1.12 }}>
          One account.
          <span style={{ display: 'block', background: 'linear-gradient(90deg, #DCFFF8, #19E7BB, #48CFFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Every Wasel service.
          </span>
        </h2>

        <p style={{ fontSize: TYPE.size.base, color: C.textMuted, lineHeight: TYPE.lineHeight.loose, marginBottom: SPACE[6] }}>
          One account for rides, buses, packages, and wallet access.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[3], textAlign: 'left' }}>
          {BRAND_FEATURES.map((item) => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
              <div style={{ width: 30, height: 30, borderRadius: R.sm, background: `${item.color}15`, border: `1px solid ${item.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                {item.icon}
              </div>
              <span style={{ fontSize: TYPE.size.sm, color: `${C.text}99` }}>{item.text}</span>
            </div>
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
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} style={{ flex: 1, height: 3, borderRadius: R.full, background: n <= strength.score ? strength.color : `${C.text}14`, transition: 'background 200ms ease' }} />
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
  return (
    <div style={{ display: 'flex', background: C.cardSolid, borderRadius: R.xl, padding: 4, marginBottom: SPACE[7], border: `1px solid ${C.border}` }}>
      {(['signin', 'signup'] as Tab[]).map((value) => {
        const active = tab === value;
        return (
          <motion.button
            key={value}
            onClick={() => onChange(value)}
            aria-label={value === 'signin' ? 'Switch to sign in' : 'Switch to create account'}
            whileTap={{ scale: 0.97 }}
            style={{
              flex:         1,
              height:       42,
              borderRadius: R.lg,
              border:       'none',
              cursor:       'pointer',
              fontSize:     TYPE.size.sm,
              fontWeight:   active ? TYPE.weight.black : TYPE.weight.semibold,
              fontFamily:   F,
              background:   active ? 'linear-gradient(135deg, #DCFFF8 0%, #19E7BB 48%, #48CFFF 100%)' : 'transparent',
              color:        active ? '#041019' : C.textMuted,
              boxShadow:    active ? `0 2px 12px ${C.cyanGlow}` : 'none',
              transition:   'all 150ms ease',
            }}
          >
            {value === 'signin' ? 'Sign in' : 'Create account'}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WaselAuth() {
  const [params, setParams] = useSearchParams();
  const rawTab        = params.get('tab')?.toLowerCase();
  const initialTab: Tab = rawTab === 'signup' || rawTab === 'register' ? 'signup' : 'signin';
  const passwordResetCompleted = params.get('reset') === 'success';

  const [tab,      setTab]      = useState<Tab>(initialTab);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [notice,   setNotice]   = useState(
    passwordResetCompleted ? 'Password updated. Sign in with your new password.' : '',
  );

  const { signIn, register, loading, user } = useLocalAuth();
  const { resetPassword, signInWithGoogle, signInWithFacebook } = useAuth();
  const nav        = useIframeSafeNavigate();
  const mountedRef = useRef(true);
  const { supportWhatsAppNumber } = getConfig();

  const safeReturnTo = (() => {
    const raw = params.get('returnTo') || '/app/find-ride';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/app/find-ride';
  })();
  const returnLabel = safeReturnTo.replace(/^\/+/, '').replace(/-/g, ' ');
  const normalizedEmail = useMemo(() => normalizeEmailInput(email), [email]);
  const normalizedPhone = useMemo(() => phone.trim().replace(/[^\d+]/g, ''), [phone]);
  const isBusy = loading || pendingAction !== null || success;

  const validatePhoneNumber = (value: string): string | null => {
    if (!value) return null;
    if (value.length < 8) return 'Enter a valid phone number or leave it blank.';
    return null;
  };

  const nameError = tab === 'signup' && name.trim() ? validateFullName(name) : '';
  const emailError =
    normalizedEmail && !validateEmail(normalizedEmail) ? 'Please enter a valid email address.' : '';
  const passwordError =
    tab === 'signup' && password ? (validatePassword(password) ?? '') : '';
  const phoneError =
    tab === 'signup' && phone.trim() ? (validatePhoneNumber(normalizedPhone) ?? '') : '';

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const nextTab: Tab = rawTab === 'signup' || rawTab === 'register' ? 'signup' : 'signin';
    setTab((current) => (current === nextTab ? current : nextTab));
  }, [rawTab]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
  }, [params, setParams, tab]);

  useEffect(() => {
    if (user && mountedRef.current) nav(safeReturnTo);
  }, [user, nav, safeReturnTo]);

  const pushSuccessRedirect = () => {
    setSuccess(true);
    setTimeout(() => { if (mountedRef.current) nav(safeReturnTo); }, 700);
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
    if (!normalizedEmail)         { setError('Please enter your email address.'); return; }
    if (!validateEmail(normalizedEmail)) { setError('Please enter a valid email address.'); return; }
    if (!password)                { setError('Please enter your password.'); return; }
    if (!checkRateLimit(`signin:${normalizedEmail}`, { maxRequests: 5, windowMs: 60_000 })) {
      setError('Too many attempts. Please wait a minute and try again.'); return;
    }
    const { error: signInError } = await signIn(normalizedEmail, password);
    if (signInError) { setError(friendlyAuthError(signInError, 'Sign in failed. Please try again.')); return; }
    pushSuccessRedirect();
  };

  const handleSignUp = async () => {
    setError('');
    if (!passwordResetCompleted) {
      setNotice('');
    }
    const fullNameError = validateFullName(name);
    if (fullNameError)            { setError(fullNameError); return; }
    if (!normalizedEmail)         { setError('Please enter your email address.'); return; }
    if (!validateEmail(normalizedEmail)) { setError('Please enter a valid email address.'); return; }
    const passwordError = validatePassword(password);
    if (passwordError)            { setError(passwordError); return; }
    const phoneValidationError = validatePhoneNumber(normalizedPhone);
    if (phoneValidationError)    { setError(phoneValidationError); return; }
    if (!checkRateLimit(`signup:${normalizedEmail}`, { maxRequests: 3, windowMs: 60_000 })) {
      setError('Too many attempts. Please wait a minute and try again.'); return;
    }
    const registration = await register(name.trim(), normalizedEmail, password, normalizedPhone || undefined);
    if (registration.error) {
      const friendly = friendlyAuthError(registration.error, 'Sign up failed. Please try again.');
      if (friendly.includes('already exists')) {
        setTab('signin');
        setNotice(`An account already exists for ${normalizedEmail}. Sign in instead or reset your password.`);
        setError('');
        return;
      }
      setError(friendly);
      return;
    }
    if (registration.requiresEmailConfirmation) {
      setPassword('');
      setPhone('');
      setNotice(`Check ${registration.email ?? normalizedEmail} and confirm your email address to finish creating your account.`);
      setTab('signin');
      return;
    }
    pushSuccessRedirect();
  };

  const handleForgotPassword = async () => {
    if (!normalizedEmail)         { setError('Enter your email address above first.'); return; }
    if (!validateEmail(normalizedEmail)) { setError('Please enter a valid email address.'); return; }
    setPendingAction('reset');
    const { error: resetError } = await resetPassword(normalizedEmail);
    setPendingAction(null);
    if (resetError) { setError(friendlyAuthError(resetError, 'Password reset failed.')); return; }
    setError('');
    setNotice(`If ${normalizedEmail} is registered, a password reset link has been sent.`);
    toast.success(`If ${normalizedEmail} is registered, a password reset link has been sent.`);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setPendingAction('google');
    let oauthError: unknown = null;
    try {
      ({ error: oauthError } = await signInWithGoogle(safeReturnTo));
    } finally {
      setPendingAction(null);
    }
    if (oauthError) setError(friendlyAuthError(oauthError, 'Google sign-in failed.'));
  };

  const handleFacebookSignIn = async () => {
    setError('');
    setPendingAction('facebook');
    let oauthError: unknown = null;
    try {
      ({ error: oauthError } = await signInWithFacebook(safeReturnTo));
    } finally {
      setPendingAction(null);
    }
    if (oauthError) setError(friendlyAuthError(oauthError, 'Facebook sign-in failed.'));
  };

  const handleWhatsAppHelp = () => {
    const supportUrl = getWhatsAppSupportUrl('Hi Wasel');
    if (!supportWhatsAppNumber || !supportUrl) {
      setError('WhatsApp support is not configured yet.');
      return;
    }
    setPendingAction('whatsapp');
    window.open(supportUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => {
      if (mountedRef.current) setPendingAction(null);
    }, 300);
  };

  const socialButtons = [
    { label: 'Google',    color: '#4285F4', onClick: handleGoogleSignIn   },
    { label: 'Facebook',  color: '#1877F2', onClick: handleFacebookSignIn },
    ...(supportWhatsAppNumber ? [{ label: 'WhatsApp', color: '#25D366', onClick: handleWhatsAppHelp }] : []),
  ] as const;

  return (
    <div
      className="auth-grid"
      style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: F, display: 'grid', gridTemplateColumns: '1fr 1fr' }}
    >
      <style>{`
        @media(max-width:768px){
          .auth-grid{grid-template-columns:1fr!important}
          .auth-brand-panel{display:none!important}
          .auth-form-panel{padding:${SPACE[7]} ${SPACE[5]}!important;align-items:flex-start!important}
          .auth-mobile-header{display:flex!important}
          .auth-form-shell{padding:${SPACE[5]}!important;border-radius:${R.xxl}!important}
          .auth-highlights-grid{grid-template-columns:1fr!important}
          .auth-social-grid{grid-template-columns:1fr!important}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <BrandPanel />

      {/* ── Form panel ─────────────────────────────────────────────────── */}
      <div
        className="auth-form-panel"
        style={{ background: `radial-gradient(circle at top, rgba(244,198,81,0.10), transparent 28%), linear-gradient(180deg, ${C.bg} 0%, ${C.bgAlt} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${SPACE[16]} ${SPACE[12]}`, overflowY: 'auto' }}
      >
        <WaselCard
          className="auth-form-shell"
          variant="default"
          padding={SPACE[7]}
          radius={R['3xl']}
          style={{ width: '100%', maxWidth: 520, background: 'linear-gradient(180deg, rgba(10,22,40,0.94), rgba(10,22,40,0.82))', border: `1px solid ${C.borderHov}`, boxShadow: SH.navy }}
        >

          {/* Mobile header (hidden on desktop) */}
          <div
            className="auth-mobile-header"
            style={{ display: 'none', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: SPACE[7], paddingBottom: SPACE[6], borderBottom: `1px solid ${C.border}` }}
          >
            <WaselLogo
              size={40}
              theme="light"
              variant="compact"
              showWordmark
              subtitle=""
              framed={false}
            />
            <h2 style={{ fontSize: TYPE.size.xl, fontWeight: TYPE.weight.ultra, color: C.text, marginTop: SPACE[4], marginBottom: SPACE[2], letterSpacing: '-0.03em' }}>
              Wasel Access
            </h2>
            <p style={{ fontSize: TYPE.size.sm, color: C.textMuted, marginBottom: SPACE[3] }}>
              {tab === 'signin' ? 'Sign in and continue.' : 'Create your Wasel account.'}
            </p>
          </div>

          <TabSwitcher tab={tab} onChange={handleTabChange} />

          {/* Heading */}
          <div style={{ marginBottom: SPACE[6] }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE[2], marginBottom: SPACE[3], padding: '7px 12px', borderRadius: R.full, background: 'rgba(244,198,81,0.10)', border: '1px solid rgba(244,198,81,0.18)', fontSize: TYPE.size.xs, color: C.blueLight, fontWeight: TYPE.weight.bold, letterSpacing: TYPE.letterSpacing.wide, textTransform: 'uppercase' }}>
              <Sparkles size={12} />
              Premium Access
            </div>
            <h3 style={{ fontSize: TYPE.size['2xl'], fontWeight: TYPE.weight.ultra, color: C.text, margin: `0 0 ${SPACE[2]}`, letterSpacing: '-0.02em' }}>
              {tab === 'signin' ? 'Sign in' : 'Sign up'}
            </h3>
            <p style={{ fontSize: TYPE.size.sm, color: C.textMuted, margin: 0, lineHeight: TYPE.lineHeight.relaxed }}>
              {tab === 'signin'
                ? 'Sign in to continue to your account.'
                : 'Create your account in under a minute.'}
            </p>
            <div style={{ marginTop: SPACE[3], display: 'flex', alignItems: 'center', gap: SPACE[2], flexWrap: 'wrap', color: C.textMuted, fontSize: TYPE.size.xs }}>
              <span>{tab === 'signin' ? 'New to Wasel?' : 'Already have an account?'}</span>
              <button
                type="button"
                onClick={() => handleTabChange(tab === 'signin' ? 'signup' : 'signin')}
                style={{ background: 'none', border: 'none', padding: 0, color: C.cyan, cursor: 'pointer', font: 'inherit', fontWeight: TYPE.weight.bold }}
              >
                {tab === 'signin' ? 'Create account' : 'Sign in'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: SPACE[6], padding: `${SPACE[3]} ${SPACE[4]}`, borderRadius: R.xl, background: 'linear-gradient(90deg, rgba(255,240,193,0.10), rgba(244,198,81,0.04))', border: '1px solid rgba(244,198,81,0.16)' }}>
            <div style={{ fontSize: TYPE.size.xs, fontWeight: TYPE.weight.bold, letterSpacing: TYPE.letterSpacing.wide, textTransform: 'uppercase', color: C.blueLight, marginBottom: 4 }}>
              Return path
            </div>
            <div style={{ fontSize: TYPE.size.sm, color: C.text, fontWeight: TYPE.weight.bold }}>
              {`Back to ${returnLabel || 'find ride'}`}
            </div>
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
                <WaselCard variant="solid" padding={`${SPACE[3]} ${SPACE[4]}`} radius={R.lg} style={{ background: C.greenDim, border: `1px solid ${C.green}40` }}>
                  <span style={{ fontSize: TYPE.size.sm, color: C.green, fontFamily: F }}>{notice}</span>
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
                <WaselCard variant="solid" padding={`${SPACE[3]} ${SPACE[4]}`} radius={R.lg} style={{ background: C.errorDim, border: `1px solid ${C.error}40` }}>
                  <span style={{ fontSize: TYPE.size.sm, color: C.error, fontFamily: F }}>{error}</span>
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
                <WaselCard variant="solid" padding={`${SPACE[3]} ${SPACE[4]}`} radius={R.lg} style={{ background: C.greenDim, border: `1px solid ${C.green}40` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2] }}>
                    <CheckCircle2 size={16} color={C.green} />
                    <span style={{ fontSize: TYPE.size.sm, color: C.green, fontFamily: F }}>
                      Success. Redirecting.
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
                onSubmit={(event) => {
                  event.preventDefault();
                  void (tab === 'signin' ? handleSignIn() : handleSignUp());
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: SPACE[4] }}
              >

                {tab === 'signup' && (
                  <WaselInput
                    id="full-name"
                    label="Full name"
                    description="Required"
                    value={name}
                    onChange={setName}
                    placeholder="Ahmad Al-Rashid"
                    icon={<UserRound size={16} />}
                    autoComplete="name"
                    error={nameError || undefined}
                  />
                )}

                <WaselInput
                  id="auth-email"
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  icon={<Mail size={16} />}
                  autoComplete="email"
                  error={emailError || undefined}
                />

                <WaselInput
                  id="auth-password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder={tab === 'signin' ? 'Enter your password' : 'Create a secure password'}
                  icon={<Lock size={16} />}
                  autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                  error={passwordError || undefined}
                  hint={tab === 'signup' ? <div>{password.length > 0 ? <StrengthBar password={password} /> : null}<PasswordChecklist password={password} /></div> : undefined}
                />

                {tab === 'signup' && (
                  <WaselInput
                    id="auth-phone"
                    label="Phone number"
                    description="Optional"
                    type="tel"
                    value={phone}
                    onChange={setPhone}
                    placeholder="+962 79 123 4567"
                    icon={<Phone size={16} />}
                    autoComplete="tel"
                    error={phoneError || undefined}
                    hint={<span style={{ fontSize: TYPE.size.xs, color: C.textMuted, fontFamily: F }}>Add it now or skip it.</span>}
                  />
                )}

                {tab === 'signin' && (
                  <div style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isBusy}
                      style={{ background: 'none', border: 'none', color: C.cyan, fontSize: TYPE.size.xs, cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: F, padding: 0, opacity: isBusy ? 0.6 : 1 }}
                    >
                      {pendingAction === 'reset' ? 'Sending reset link...' : 'Forgot password?'}
                    </button>
                  </div>
                )}

                <WaselButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  disabled={isBusy}
                  type="submit"
                  aria-label={tab === 'signin' ? 'Submit sign in' : 'Submit sign up'}
                  iconEnd={<ArrowRight size={16} />}
                >
                  {tab === 'signin' ? 'Sign in to Wasel' : 'Create account'}
                </WaselButton>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: TYPE.size.xs, color: C.textMuted }}>or continue with</span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>

                {/* Social buttons */}
                <div className="auth-social-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: SPACE[3] }}>
                  {socialButtons.map((social) => (
                    <motion.button
                      key={social.label}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      aria-label={social.label === 'WhatsApp' ? 'WhatsApp' : `Continue with ${social.label}`}
                      disabled={isBusy}
                      onClick={() => { void social.onClick(); }}
                      style={{ minHeight: 68, borderRadius: R.xl, border: `1px solid ${SOCIAL_META[social.label].border}`, background: `linear-gradient(180deg, ${SOCIAL_META[social.label].bg}, rgba(255,255,255,0.02))`, color: C.text, fontWeight: TYPE.weight.black, fontSize: TYPE.size.sm, fontFamily: F, cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.55 : 1, transition: 'all 150ms ease', padding: `${SPACE[3]} ${SPACE[4]}`, textAlign: 'left', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                        <div style={{ width: 34, height: 34, borderRadius: R.full, display: 'flex', alignItems: 'center', justifyContent: 'center', background: SOCIAL_META[social.label].bg, color: SOCIAL_META[social.label].accent, border: `1px solid ${SOCIAL_META[social.label].border}` }}>
                          {social.label.slice(0, 1)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: TYPE.size.sm, fontWeight: TYPE.weight.bold, color: C.text }}>{social.label}</div>
                          <div style={{ fontSize: TYPE.size.xs, color: C.textMuted, marginTop: 2 }}>
                            {pendingAction === social.label.toLowerCase() ? 'Opening secure flow...' : `Continue with ${social.label}`}
                          </div>
                        </div>
                        <ChevronRight size={14} color={SOCIAL_META[social.label].accent} />
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div style={{ marginTop: SPACE[2], padding: `${SPACE[3]} ${SPACE[4]}`, borderRadius: R.lg, border: `1px solid ${C.borderFaint}`, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACE[3], flexWrap: 'wrap' }}>
                  <div style={{ fontSize: TYPE.size.xs, color: C.textMuted, lineHeight: 1.6 }}>
                    {tab === 'signin'
                      ? 'One account across Wasel.'
                      : 'Name, email, and password are enough to start.'}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.green, fontSize: TYPE.size.xs, fontWeight: TYPE.weight.bold }}>
                    <Shield size={12} />
                    Secure recovery active
                  </div>
                </div>
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Legal */}
          <p style={{ fontSize: TYPE.size.xs, color: C.textMuted, textAlign: 'center', marginTop: SPACE[6], lineHeight: TYPE.lineHeight.relaxed }}>
            By continuing, you agree to the{' '}
            <button type="button" onClick={() => nav('/terms')} style={{ color: C.cyan, cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit' }}>Terms of Service</button>
            {' '}and{' '}
            <button type="button" onClick={() => nav('/privacy')} style={{ color: C.cyan, cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit' }}>Privacy Policy</button>.
          </p>
        </WaselCard>
      </div>
    </div>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  const requirements = getPasswordRequirements(password);

  return (
    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
      {requirements.map((requirement) => (
        <div
          key={requirement.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: TYPE.size.xs,
            color: requirement.met ? C.green : C.textMuted,
            fontFamily: F,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: requirement.met ? C.green : 'rgba(255,255,255,0.14)',
              boxShadow: requirement.met ? '0 0 12px rgba(255,240,193,0.18)' : 'none',
              flexShrink: 0,
            }}
          />
          <span>{requirement.label}</span>
        </div>
      ))}
    </div>
  );
}
