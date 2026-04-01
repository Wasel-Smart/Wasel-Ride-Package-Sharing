import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
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
import { WaselHeroMark, WaselLogo } from '../components/wasel-ds/WaselLogo';
import { WaselButton }               from '../components/wasel-ui/WaselButton';
import { WaselInput }                from '../components/wasel-ui/WaselInput';
import { WaselCard }                 from '../components/wasel-ui/WaselCard';
import { useLocalAuth }              from '../contexts/LocalAuth';
import { useIframeSafeNavigate }     from '../hooks/useIframeSafeNavigate';
import { checkRateLimit, validateEmail } from '../utils/security';
import { useAuth }                   from '../contexts/AuthContext';
import { getConfig, getWhatsAppSupportUrl } from '../utils/env';
import { friendlyAuthError, pwStrength }    from '../utils/authHelpers';
import { C, R, TYPE, F, SPACE }      from '../utils/wasel-ds';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'signin' | 'signup';

// ─── Feature list for the brand panel ────────────────────────────────────────
const BRAND_FEATURES = [
  { icon: <Zap  size={14} />, text: 'Live ride discovery with real route visibility', color: C.cyan   },
  { icon: <Package size={14} />, text: 'Parcel movement through active trips',        color: C.gold   },
  { icon: <Bus  size={14} />, text: 'Scheduled corridors with clean booking flows',   color: C.green  },
  { icon: <Shield size={14} />, text: 'Verified-first trust signals from the first tap', color: C.purple },
] as const;

const BRAND_PILLS = ['Secure sign-in', 'Jordan-first UX', 'Low-friction onboarding'] as const;

// ─── Brand panel (left column) ────────────────────────────────────────────────
function BrandPanel() {
  return (
    <div
      className="auth-brand-panel"
      style={{
        background: `linear-gradient(145deg, ${C.navy} 0%, ${C.navyMid} 48%, ${C.cardSolid} 100%)`,
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

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
        <WaselLogo size={44} theme="light" variant="full" />
        <div style={{ margin: `${SPACE[8]} 0 ${SPACE[6]}` }}>
          <WaselHeroMark size={92} />
        </div>

        <h2 style={{ fontSize: TYPE.size['3xl'], fontWeight: TYPE.weight.ultra, color: C.text, letterSpacing: '-0.04em', margin: `0 0 ${SPACE[3]}`, lineHeight: 1.12 }}>
          Wasel
          <span style={{ display: 'block', background: 'linear-gradient(90deg, #55E9FF, #60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Move smarter
          </span>
        </h2>

        <p style={{ fontSize: TYPE.size.base, color: C.textMuted, lineHeight: TYPE.lineHeight.loose, marginBottom: SPACE[6] }}>
          Sign in once and move through rides, parcels, trust, and live corridors from the same experience.
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

        <div style={{ display: 'flex', gap: SPACE[3], justifyContent: 'center', marginTop: SPACE[8], flexWrap: 'wrap' }}>
          {BRAND_PILLS.map((label) => (
            <span key={label} style={{ fontSize: TYPE.size.xs, color: `${C.text}66`, background: `${C.text}0a`, border: `1px solid ${C.text}18`, borderRadius: R.full, padding: '4px 10px' }}>
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
              background:   active ? 'linear-gradient(135deg, #00C8E8 0%, #0095B8 100%)' : 'transparent',
              color:        active ? C.bg : C.textMuted,
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
  const [params]      = useSearchParams();
  const rawTab        = params.get('tab')?.toLowerCase();
  const initialTab: Tab = rawTab === 'signup' || rawTab === 'register' ? 'signup' : 'signin';

  const [tab,      setTab]      = useState<Tab>(initialTab);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const { signIn, register, loading, user } = useLocalAuth();
  const { resetPassword, signInWithGoogle, signInWithFacebook } = useAuth();
  const nav        = useIframeSafeNavigate();
  const mountedRef = useRef(true);
  const { supportWhatsAppNumber } = getConfig();

  const safeReturnTo = (() => {
    const raw = params.get('returnTo') || '/app/find-ride';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/app/find-ride';
  })();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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
  };

  const handleSignIn = async () => {
    setError('');
    if (!email.trim())            { setError('Please enter your email address.'); return; }
    if (!validateEmail(email))    { setError('Please enter a valid email address.'); return; }
    if (!password)                { setError('Please enter your password.'); return; }
    if (!checkRateLimit(`signin:${email}`, { maxRequests: 5, windowMs: 60_000 })) {
      setError('Too many attempts. Please wait a minute and try again.'); return;
    }
    const { error: signInError } = await signIn(email, password);
    if (signInError) { setError(friendlyAuthError(signInError, 'Sign in failed. Please try again.')); return; }
    pushSuccessRedirect();
  };

  const handleSignUp = async () => {
    setError('');
    if (!name.trim())             { setError('Please enter your full name.'); return; }
    if (!email.trim())            { setError('Please enter your email address.'); return; }
    if (!validateEmail(email))    { setError('Please enter a valid email address.'); return; }
    if (password.length < 8)      { setError('Password must be at least 8 characters long.'); return; }
    if (!checkRateLimit(`signup:${email}`, { maxRequests: 3, windowMs: 60_000 })) {
      setError('Too many attempts. Please wait a minute and try again.'); return;
    }
    const { error: signUpError } = await register(name, email, password, phone);
    if (signUpError) { setError(friendlyAuthError(signUpError, 'Sign up failed. Please try again.')); return; }
    pushSuccessRedirect();
  };

  const handleForgotPassword = async () => {
    if (!email.trim())            { setError('Enter your email address above first.'); return; }
    if (!validateEmail(email))    { setError('Please enter a valid email address.'); return; }
    const { error: resetError } = await resetPassword(email);
    if (resetError) { setError(friendlyAuthError(resetError, 'Password reset failed.')); return; }
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
    if (!supportWhatsAppNumber) { setError('WhatsApp support is not configured yet.'); return; }
    window.open(getWhatsAppSupportUrl('Hi Wasel'), '_blank', 'noopener,noreferrer');
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
        }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <BrandPanel />

      {/* ── Form panel ─────────────────────────────────────────────────── */}
      <div
        className="auth-form-panel"
        style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bgAlt} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${SPACE[16]} ${SPACE[12]}`, overflowY: 'auto' }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Mobile header (hidden on desktop) */}
          <div
            className="auth-mobile-header"
            style={{ display: 'none', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: SPACE[7], paddingBottom: SPACE[6], borderBottom: `1px solid ${C.border}` }}
          >
            <WaselLogo size={38} theme="light" variant="full" />
            <h2 style={{ fontSize: TYPE.size.xl, fontWeight: TYPE.weight.ultra, color: C.text, marginTop: SPACE[4], marginBottom: SPACE[2], letterSpacing: '-0.03em' }}>
              Wasel <span style={{ color: C.cyan }}>Move smarter</span>
            </h2>
            <p style={{ fontSize: TYPE.size.sm, color: C.textMuted, marginBottom: SPACE[3] }}>
              Sign in to continue into the mobility experience.
            </p>
          </div>

          <TabSwitcher tab={tab} onChange={handleTabChange} />

          {/* Heading */}
          <div style={{ marginBottom: SPACE[6] }}>
            <h3 style={{ fontSize: TYPE.size['2xl'], fontWeight: TYPE.weight.ultra, color: C.text, margin: `0 0 ${SPACE[2]}`, letterSpacing: '-0.02em' }}>
              {tab === 'signin' ? 'Welcome back' : 'Join Wasel'}
            </h3>
            <p style={{ fontSize: TYPE.size.sm, color: C.textMuted, margin: 0, lineHeight: TYPE.lineHeight.relaxed }}>
              {tab === 'signin'
                ? 'Use your Wasel account to continue where you left off.'
                : 'Create your account to unlock rides, parcels, and trust in one place.'}
            </p>
          </div>

          {/* Error banner */}
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
                      Signed in successfully. Redirecting now.
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[4] }}>

                {tab === 'signup' && (
                  <WaselInput
                    id="full-name"
                    label="Full name"
                    description="As shown on your profile"
                    value={name}
                    onChange={setName}
                    placeholder="Ahmad Al-Rashid"
                    icon={<UserRound size={16} />}
                  />
                )}

                <WaselInput
                  id="auth-email"
                  label="Email address"
                  description="Used for sign in"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  icon={<Mail size={16} />}
                />

                <WaselInput
                  id="auth-password"
                  label="Password"
                  description={tab === 'signin' ? 'Your account password' : 'Minimum 8 characters'}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder={tab === 'signin' ? 'Enter your password' : 'Create a secure password'}
                  icon={<Lock size={16} />}
                  hint={tab === 'signup' && password.length > 0 ? <StrengthBar password={password} /> : undefined}
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
                  />
                )}

                {tab === 'signin' && (
                  <div style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      style={{ background: 'none', border: 'none', color: C.cyan, fontSize: TYPE.size.xs, cursor: 'pointer', fontFamily: F, padding: 0 }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <WaselButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  disabled={success}
                  onClick={tab === 'signin' ? handleSignIn : handleSignUp}
                  aria-label={tab === 'signin' ? 'Submit sign in' : 'Submit sign up'}
                  iconEnd={<ArrowRight size={16} />}
                >
                  {tab === 'signin' ? 'Sign in' : 'Create account'}
                </WaselButton>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: TYPE.size.xs, color: C.textMuted }}>or continue with</span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>

                {/* Social buttons */}
                <div style={{ display: 'flex', gap: SPACE[2], flexWrap: 'wrap' }}>
                  {socialButtons.map((social) => (
                    <motion.button
                      key={social.label}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => { void social.onClick(); }}
                      style={{ flex: '1 1 120px', height: 44, borderRadius: R.lg, border: `1px solid ${social.color}30`, background: `${social.color}0C`, color: social.color, fontWeight: TYPE.weight.black, fontSize: TYPE.size.sm, fontFamily: F, cursor: 'pointer', transition: 'all 150ms ease' }}
                    >
                      {social.label}
                    </motion.button>
                  ))}
                </div>

              </div>
            </motion.div>
          </AnimatePresence>

          {/* Legal */}
          <p style={{ fontSize: TYPE.size.xs, color: C.textMuted, textAlign: 'center', marginTop: SPACE[6], lineHeight: TYPE.lineHeight.relaxed }}>
            By continuing, you agree to our{' '}
            <button type="button" onClick={() => nav('/terms')} style={{ color: C.cyan, cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit' }}>Terms of Service</button>
            {' '}and{' '}
            <button type="button" onClick={() => nav('/privacy')} style={{ color: C.cyan, cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit' }}>Privacy Policy</button>.
          </p>
        </div>
      </div>
    </div>
  );
}
