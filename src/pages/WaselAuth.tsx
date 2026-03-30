import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowRight,
  Bus,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Package,
  Phone,
  Shield,
  Sparkles,
  UserRound,
  Zap,
} from 'lucide-react';
import { WaselHeroMark, WaselLogo } from '../components/wasel-ds/WaselLogo';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { checkRateLimit, validateEmail } from '../utils/security';
import { useAuth } from '../contexts/AuthContext';
import { getConfig, getWhatsAppSupportUrl } from '../utils/env';

const C = {
  bg: '#040C18',
  card: '#0A1628',
  panel: '#0D1F38',
  border: 'rgba(0,200,232,0.14)',
  borderH: 'rgba(0,200,232,0.34)',
  cyan: '#00C8E8',
  gold: '#F0A830',
  green: '#00C875',
  red: '#FF4455',
  text: '#EFF6FF',
  sub: 'rgba(148,163,184,0.80)',
  muted: 'rgba(100,130,180,0.62)',
  F: "-apple-system,'Inter','Cairo',sans-serif",
} as const;

const R = { md: 12, lg: 16, xl: 22, full: 9999 } as const;
const GRAD = 'linear-gradient(135deg, #00C8E8, #0095B8)';

function pwStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: C.muted };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const map = [
    { score: 0, label: '', color: C.muted },
    { score: 1, label: 'Weak', color: C.red },
    { score: 2, label: 'Fair', color: C.gold },
    { score: 3, label: 'Good', color: C.cyan },
    { score: 4, label: 'Strong', color: C.green },
    { score: 5, label: 'Excellent', color: C.green },
  ];

  return map[Math.min(score, 5)];
}

function friendlyAuthError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('authentication failed') ||
    lower.includes('wrong email') ||
    lower.includes('wrong password')
  ) {
    return 'Incorrect email or password.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }

  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'This email is already registered.';
  }

  return message || fallback;
}

function AuthField({
  id,
  label,
  description,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  hint,
}: {
  id: string;
  label: string;
  description?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  hint?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <label htmlFor={id} style={{ fontSize: '0.78rem', fontWeight: 700, color: C.sub, fontFamily: C.F }}>
          {label}
        </label>
        {description && (
          <span style={{ fontSize: '0.7rem', color: C.muted, fontFamily: C.F }}>
            {description}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          minHeight: 50,
          borderRadius: R.md,
          background: focused ? C.panel : C.card,
          border: `1.5px solid ${focused ? C.borderH : C.border}`,
          boxShadow: focused ? '0 0 0 3px rgba(0,200,232,0.10)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        {icon && <span style={{ flexShrink: 0, color: C.muted, display: 'inline-flex' }}>{icon}</span>}
        <input
          id={id}
          aria-label={label}
          type={resolvedType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={id.includes('password') ? 'current-password' : undefined}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '0.92rem',
            color: C.text,
            fontFamily: C.F,
            minWidth: 0,
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.muted,
              display: 'inline-flex',
              padding: 0,
            }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {hint && <div style={{ marginTop: 8 }}>{hint}</div>}
    </div>
  );
}

type Tab = 'signin' | 'signup';

export default function WaselAuth() {
  const [params] = useSearchParams();
  const rawTab = params.get('tab')?.toLowerCase();
  const initialTab: Tab = rawTab === 'signup' || rawTab === 'register' ? 'signup' : 'signin';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { signIn, register, loading, user } = useLocalAuth();
  const { resetPassword, signInWithGoogle, signInWithFacebook } = useAuth();
  const nav = useIframeSafeNavigate();
  const mountedRef = useRef(true);
  const { enableDemoAccount, supportWhatsAppNumber } = getConfig();

  const safeReturnTo = (() => {
    const raw = params.get('returnTo') || '/app/find-ride';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/app/find-ride';
  })();

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

  const handleDemo = async () => {
    setError('');
    const { error: demoError } = await signIn('demo@wasel.jo', 'demo123');
    if (demoError) {
      setError(demoError);
      return;
    }
    pushSuccessRedirect();
  };

  const handleSignIn = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (!checkRateLimit(`signin:${email}`, { maxRequests: 5, windowMs: 60_000 })) {
      setError('Too many attempts. Please wait a minute and try again.');
      return;
    }

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(friendlyAuthError(signInError, 'Sign in failed. Please try again.'));
      return;
    }

    pushSuccessRedirect();
  };

  const handleSignUp = async () => {
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!checkRateLimit(`signup:${email}`, { maxRequests: 3, windowMs: 60_000 })) {
      setError('Too many attempts. Please wait a minute and try again.');
      return;
    }

    const { error: signUpError } = await register(name, email, password, phone);
    if (signUpError) {
      setError(friendlyAuthError(signUpError, 'Sign up failed. Please try again.'));
      return;
    }

    pushSuccessRedirect();
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address above first.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    const { error: resetError } = await resetPassword(email);
    if (resetError) {
      setError(friendlyAuthError(resetError, 'Password reset failed.'));
      return;
    }

    setError('');
    toast.success(`If ${email} is registered, a password reset link has been sent.`);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error: oauthError } = await signInWithGoogle();
    if (oauthError) setError(friendlyAuthError(oauthError, 'Google sign-in failed.'));
  };

  const handleFacebookSignIn = async () => {
    setError('');
    const { error: oauthError } = await signInWithFacebook();
    if (oauthError) setError(friendlyAuthError(oauthError, 'Facebook sign-in failed.'));
  };

  const handleWhatsAppHelp = () => {
    if (!supportWhatsAppNumber) {
      setError('WhatsApp support is not configured yet.');
      return;
    }

    window.open(getWhatsAppSupportUrl('Hi Wasel'), '_blank', 'noopener,noreferrer');
  };

  const strength = pwStrength(password);
  const socialButtons = [
    { label: 'Google', color: '#4285F4', onClick: handleGoogleSignIn },
    { label: 'Facebook', color: '#1877F2', onClick: handleFacebookSignIn },
    ...(supportWhatsAppNumber ? [{ label: 'WhatsApp', color: '#25D366', onClick: handleWhatsAppHelp }] : []),
  ] as const;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: C.F,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
      }}
      className="auth-grid"
    >
      <style>{`
        @media(max-width: 768px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-brand-panel { display: none !important; }
          .auth-form-panel { padding: 28px 18px !important; align-items: flex-start !important; }
          .auth-mobile-header { display: flex !important; }
        }
      `}</style>

      <div
        className="auth-brand-panel"
        style={{
          background: 'linear-gradient(145deg, #0B1D45 0%, #162C6A 48%, #0A1628 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 52px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -110,
            right: -80,
            width: 460,
            height: 460,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,200,232,0.14), transparent 66%)',
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
            background: 'radial-gradient(circle, rgba(32,96,232,0.14), transparent 66%)',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
          <WaselLogo size={44} theme="light" variant="full" />
          <div style={{ margin: '30px 0 22px' }}>
            <WaselHeroMark size={92} />
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#fff', letterSpacing: '-0.04em', margin: '0 0 10px', lineHeight: 1.12 }}>
            Wasel
            <span style={{ display: 'block', background: 'linear-gradient(90deg, #55E9FF, #60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Move smarter
            </span>
          </h2>

          <p style={{ fontSize: '0.93rem', color: C.muted, lineHeight: 1.8, marginBottom: 24 }}>
            Sign in once and move through rides, parcels, trust, and live corridors from the same experience.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            {[
              { icon: <Zap size={14} />, text: 'Live ride discovery with real route visibility', color: C.cyan },
              { icon: <Package size={14} />, text: 'Parcel movement through active trips', color: C.gold },
              { icon: <Bus size={14} />, text: 'Scheduled corridors with clean booking flows', color: C.green },
              { icon: <Shield size={14} />, text: 'Verified-first trust signals from the first tap', color: '#A78BFA' },
            ].map((item) => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
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
                <span style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.62)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
            {['Secure sign-in', 'Jordan-first UX', 'Low-friction onboarding'].map((item) => (
              <span
                key={item}
                style={{
                  fontSize: '0.66rem',
                  color: 'rgba(255,255,255,0.42)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 999,
                  padding: '4px 10px',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        className="auth-form-panel"
        style={{
          background: 'linear-gradient(180deg, #040C18 0%, #071120 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 48px',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div
            className="auth-mobile-header"
            style={{
              display: 'none',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              marginBottom: 28,
              paddingBottom: 24,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <WaselLogo size={38} theme="light" variant="full" />
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: C.text, marginTop: 14, marginBottom: 6, letterSpacing: '-0.03em' }}>
              Wasel <span style={{ color: C.cyan }}>Move smarter</span>
            </h2>
            <p style={{ fontSize: '0.84rem', color: C.muted, marginBottom: 12 }}>
              Sign in to continue into the mobility experience.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              background: C.card,
              borderRadius: R.xl,
              padding: 4,
              marginBottom: 28,
              border: `1px solid ${C.border}`,
            }}
          >
            {(['signin', 'signup'] as Tab[]).map((value) => {
              const active = tab === value;
              return (
                <motion.button
                  key={value}
                  onClick={() => {
                    setTab(value);
                    setError('');
                    setSuccess(false);
                  }}
                  aria-label={value === 'signin' ? 'Switch to sign in' : 'Switch to sign up'}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: R.md,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: active ? 800 : 600,
                    fontFamily: C.F,
                    background: active ? GRAD : 'transparent',
                    color: active ? '#041018' : C.muted,
                    boxShadow: active ? '0 2px 12px rgba(0,200,232,0.28)' : 'none',
                  }}
                >
                  {value === 'signin' ? 'Sign in' : 'Create account'}
                </motion.button>
              );
            })}
          </div>

          <div style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: C.text, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              {tab === 'signin' ? 'Welcome back' : 'Join Wasel'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: C.muted, margin: 0, lineHeight: 1.65 }}>
              {tab === 'signin'
                ? 'Use your Wasel account to continue where you left off.'
                : 'Create your account to unlock rides, parcels, and trust in one place.'}
            </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: 'rgba(255,68,85,0.10)',
                  border: '1px solid rgba(255,68,85,0.28)',
                  borderRadius: R.md,
                  padding: '12px 14px',
                  marginBottom: 18,
                  fontSize: '0.82rem',
                  color: C.red,
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'rgba(0,200,117,0.10)',
                  border: '1px solid rgba(0,200,117,0.28)',
                  borderRadius: R.md,
                  padding: '12px 14px',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.82rem',
                  color: C.green,
                }}
              >
                <CheckCircle2 size={16} />
                Signed in successfully. Redirecting now.
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {tab === 'signup' && (
                  <AuthField
                    id="full-name"
                    label="Full name"
                    description="As shown on your profile"
                    value={name}
                    onChange={setName}
                    placeholder="Ahmad Al-Rashid"
                    icon={<UserRound size={16} />}
                  />
                )}

                <AuthField
                  id="auth-email"
                  label="Email address"
                  description="Used for sign in"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  icon={<Mail size={16} />}
                />

                <AuthField
                  id="auth-password"
                  label="Password"
                  description={tab === 'signin' ? 'Your account password' : 'Minimum 8 characters'}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder={tab === 'signin' ? 'Enter your password' : 'Create a secure password'}
                  icon={<Lock size={16} />}
                  hint={
                    tab === 'signup' && password.length > 0 ? (
                      <div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                          {[1, 2, 3, 4, 5].map((item) => (
                            <div
                              key={item}
                              style={{
                                flex: 1,
                                height: 3,
                                borderRadius: 999,
                                background: item <= strength.score ? strength.color : 'rgba(255,255,255,0.08)',
                              }}
                            />
                          ))}
                        </div>
                        {strength.label && <span style={{ fontSize: '0.68rem', color: strength.color }}>{strength.label}</span>}
                      </div>
                    ) : undefined
                  }
                />

                {tab === 'signup' && (
                  <AuthField
                    id="auth-phone"
                    label="Phone number"
                    description="Optional"
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
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        fontFamily: C.F,
                        padding: 0,
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={tab === 'signin' ? handleSignIn : handleSignUp}
                  aria-label={tab === 'signin' ? 'Submit sign in' : 'Submit sign up'}
                  disabled={loading || success}
                  style={{
                    height: 52,
                    borderRadius: R.md,
                    border: 'none',
                    cursor: 'pointer',
                    background: GRAD,
                    color: '#041018',
                    fontWeight: 900,
                    fontSize: '0.92rem',
                    fontFamily: C.F,
                    boxShadow: '0 4px 20px rgba(0,200,232,0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (
                    <>
                      {tab === 'signin' ? 'Sign in' : 'Create account'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </motion.button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: '0.72rem', color: C.muted }}>or continue with</span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {socialButtons.map((social) => (
                    <motion.button
                      key={social.label}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => {
                        void social.onClick();
                      }}
                      style={{
                        flex: '1 1 120px',
                        height: 44,
                        borderRadius: R.md,
                        border: `1px solid ${social.color}30`,
                        background: `${social.color}0C`,
                        color: social.color,
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        fontFamily: C.F,
                        cursor: 'pointer',
                      }}
                    >
                      Continue with {social.label}
                    </motion.button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleDemo}
                  hidden={!enableDemoAccount}
                  style={{
                    height: 44,
                    borderRadius: R.md,
                    border: '1px solid rgba(240,168,48,0.25)',
                    background: 'rgba(240,168,48,0.07)',
                    color: C.gold,
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    fontFamily: C.F,
                    cursor: 'pointer',
                    display: enableDemoAccount ? 'block' : 'none',
                  }}
                >
                  Try demo account
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          <p style={{ fontSize: '0.7rem', color: C.muted, textAlign: 'center', marginTop: 24, lineHeight: 1.7 }}>
            By continuing, you agree to our{' '}
            <button
              type="button"
              onClick={() => nav('/terms')}
              style={{ color: C.cyan, cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => nav('/privacy')}
              style={{ color: C.cyan, cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
            >
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
