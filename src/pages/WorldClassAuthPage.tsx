import { useState, type CSSProperties, type ReactNode } from 'react';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import { ArrowRight, Check, Lock, Mail, Phone, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { useLanguage } from '../contexts/LanguageContext';

type AuthStep = 'phone' | 'verify' | 'complete';
type AuthMode = 'signin' | 'signup';

export function WorldClassAuthPage() {
  const { language } = useLanguage();
  const { signIn, signUp } = useAuth();
  const navigate = useIframeSafeNavigate();

  const ar = language === 'ar';
  const [step, setStep] = useState<AuthStep>('phone');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useEmail, setUseEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('962')) return cleaned;
    if (cleaned.startsWith('0')) return `962${cleaned.slice(1)}`;
    return `962${cleaned}`;
  };

  const handlePhoneSubmit = () => {
    setError('');
    if (phone.length < 12) {
      setError(ar ? 'رقم الهاتف غير صحيح' : 'Invalid phone number');
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setStep('verify');
      setResendCooldown(30);
      const interval = window.setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { window.clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    }, 500);
  };

  const handleVerifyCode = () => {
    setError('');
    if (code.length !== 6) {
      setError(ar ? 'أدخل رمز التحقق المكون من 6 أرقام' : 'Enter the 6-digit verification code');
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setStep('complete');
    }, 500);
  };

  const handleComplete = async () => {
    setError('');
    if (!name.trim()) {
      setError(ar ? 'أدخل اسمك' : 'Enter your name');
      return;
    }

    setLoading(true);
    const result = await signUp(
      email || `${phone}@wasel.app`,
      password || 'TempPass123!',
      name.trim(),
      phone,
      '/app',
    );

    if (result.error) {
      setError(ar ? 'حدث خطأ. حاول مرة أخرى' : 'Something went wrong. Try again');
      setLoading(false);
      return;
    }

    navigate('/app');
  };

  const handleEmailAuth = async () => {
    setError('');
    if (!email || !password) {
      setError(ar ? 'أدخل البريد الإلكتروني وكلمة المرور' : 'Enter email and password');
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    if (result.error) {
      setError(ar ? 'بيانات الدخول غير صحيحة' : 'Invalid email or password');
      setLoading(false);
      return;
    }

    navigate('/app');
  };

  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <header style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <WaselLogo size={60} theme="light" />
          </div>
          <h1 style={headingStyle}>{ar ? 'مرحبا بك في واصل' : 'Welcome to Wasel'}</h1>
          <p style={mutedStyle}>{ar ? 'سجل دخولك للمتابعة' : 'Sign in to continue'}</p>
        </header>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 4, marginBottom: 24 }}>
          {(['signin', 'signup'] as AuthMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setStep('phone'); setError(''); }}
              style={{
                flex: 1, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: mode === m ? 'rgba(0,200,232,0.18)' : 'transparent',
                color: mode === m ? '#55E9FF' : '#94A3B8',
                fontWeight: 700, fontSize: '0.88rem',
                transition: 'all 0.18s',
              }}
            >
              {m === 'signin' ? (ar ? 'تسجيل الدخول' : 'Sign in') : (ar ? 'إنشاء حساب' : 'Sign up')}
            </button>
          ))}
        </div>

        <main style={cardStyle}>
          {step === 'phone' && !useEmail && (
            <>
              <FieldLabel>{ar ? 'رقم الهاتف' : 'Phone number'}</FieldLabel>
              <div style={inputShellStyle}>
                <Phone size={20} color="#00C8E8" />
                <span style={{ color: '#94A3B8' }}>+962</span>
                <input
                  type="tel"
                  value={phone.replace(/^962/, '')}
                  onChange={event => setPhone(formatPhone(event.target.value))}
                  placeholder="79 123 4567"
                  style={inputStyle}
                />
              </div>
              <p style={{ ...mutedStyle, marginTop: 8 }}>
                {ar ? 'سنرسل لك رمز تحقق عبر الرسائل القصيرة' : "We'll send you a verification code via SMS"}
              </p>
              <ErrorMessage message={error} />
              <PrimaryButton disabled={loading || phone.length < 12} onClick={handlePhoneSubmit}>
                {loading ? (ar ? 'جار الإرسال...' : 'Sending...') : ar ? 'إرسال الرمز' : 'Send code'}
                {!loading && <ArrowRight size={18} />}
              </PrimaryButton>
              <SecondaryButton onClick={() => setUseEmail(true)}>
                {ar ? 'استخدم البريد الإلكتروني بدلا من ذلك' : 'Use email instead'}
              </SecondaryButton>
            </>
          )}

          {step === 'verify' && (
            <>
              <div style={stepIconStyle}>
                <Phone size={28} color="#00C8E8" />
              </div>
              <h2 style={subheadingStyle}>{ar ? 'أدخل رمز التحقق' : 'Enter verification code'}</h2>
              <p style={mutedStyle}>{ar ? `أرسلنا رمزا إلى +${phone}` : `We sent a code to +${phone}`}</p>
              {/* 6-box OTP input */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '24px 0 16px' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={code[i] ?? ''}
                    onChange={ev => {
                      const val = ev.target.value.replace(/\D/g, '');
                      const next = code.split('');
                      next[i] = val;
                      const joined = next.join('').slice(0, 6);
                      setCode(joined);
                      if (val && i < 5) {
                        const sibling = ev.target.parentElement?.children[i + 1] as HTMLInputElement | undefined;
                        sibling?.focus();
                      }
                    }}
                    onKeyDown={ev => {
                      if (ev.key === 'Backspace' && !code[i] && i > 0) {
                        const sibling = ev.currentTarget.parentElement?.children[i - 1] as HTMLInputElement | undefined;
                        sibling?.focus();
                      }
                    }}
                    style={{
                      width: 44, height: 52, borderRadius: 12, textAlign: 'center',
                      background: 'rgba(255,255,255,0.1)', border: `1.5px solid ${code[i] ? '#00C8E8' : 'rgba(255,255,255,0.2)'}`,
                      color: '#fff', fontSize: '1.4rem', fontWeight: 700, outline: 'none',
                    }}
                  />
                ))}
              </div>
              <ErrorMessage message={error} />
              <PrimaryButton disabled={loading || code.length !== 6} onClick={handleVerifyCode}>
                {loading ? (ar ? 'جار التحقق...' : 'Verifying...') : ar ? 'تحقق' : 'Verify'}
                {!loading && <Check size={18} />}
              </PrimaryButton>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                <SecondaryButton onClick={() => setStep('phone')}>
                  {ar ? 'تغيير رقم الهاتف' : 'Change number'}
                </SecondaryButton>
                <button
                  onClick={resendCooldown === 0 ? handlePhoneSubmit : undefined}
                  disabled={resendCooldown > 0}
                  style={{
                    background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    color: resendCooldown > 0 ? '#64748B' : '#00C8E8',
                    fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <RefreshCw size={14} />
                  {resendCooldown > 0 ? `${ar ? 'إعادة الإرسال' : 'Resend'} (${resendCooldown}s)` : (ar ? 'إعادة إرسال الرمز' : 'Resend code')}
                </button>
              </div>
            </>
          )}

          {step === 'complete' && (
            <>
              <div style={stepIconStyle}>
                <Check size={28} color="#10B981" />
              </div>
              <h2 style={subheadingStyle}>{ar ? 'أكمل ملفك الشخصي' : 'Complete your profile'}</h2>
              <FieldLabel>{ar ? 'الاسم الكامل' : 'Full name'}</FieldLabel>
              <input
                type="text"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder={ar ? 'أحمد محمد' : 'Ahmad Mohammad'}
                style={{ ...inputStyle, ...standaloneInputStyle }}
              />
              <ErrorMessage message={error} />
              <PrimaryButton disabled={loading || !name.trim()} onClick={() => void handleComplete()}>
                {loading ? (ar ? 'جار الإنشاء...' : 'Creating...') : ar ? 'ابدأ استخدام واصل' : 'Start using Wasel'}
                {!loading && <ArrowRight size={18} />}
              </PrimaryButton>
            </>
          )}

          {step === 'phone' && useEmail && (
            <>
              <FieldLabel>{ar ? 'البريد الإلكتروني' : 'Email'}</FieldLabel>
              <div style={inputShellStyle}>
                <Mail size={20} color="#00C8E8" />
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>
              <FieldLabel>{ar ? 'كلمة المرور' : 'Password'}</FieldLabel>
              <div style={inputShellStyle}>
                <Lock size={20} color="#00C8E8" />
                <input
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>
              <ErrorMessage message={error} />
              <PrimaryButton disabled={loading || !email || !password} onClick={() => void handleEmailAuth()}>
                {loading ? (ar ? 'جار تسجيل الدخول...' : 'Signing in...') : ar ? 'تسجيل الدخول' : 'Sign in'}
                {!loading && <ArrowRight size={18} />}
              </PrimaryButton>
              <SecondaryButton onClick={() => setUseEmail(false)}>
                {ar ? 'استخدم رقم الهاتف بدلا من ذلك' : 'Use phone number instead'}
              </SecondaryButton>
            </>
          )}
        </main>

        <p style={{ ...mutedStyle, textAlign: 'center', marginTop: 24 }}>
          {ar
            ? 'بالمتابعة، أنت توافق على شروط الخدمة وسياسة الخصوصية'
            : 'By continuing, you agree to our Terms of Service and Privacy Policy'}
        </p>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <label style={labelStyle}>{children}</label>;
}

function ErrorMessage({ message }: { message: string }) {
  if (!message) return null;
  return <div style={errorStyle}>{message}</div>;
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...buttonStyle,
        background: disabled ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00C8E8 0%, #0095B8 100%)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={secondaryButtonStyle}>
      {children}
    </button>
  );
}

const pageStyle: CSSProperties = {
  minHeight: 'var(--app-min-height)',
  background: 'linear-gradient(135deg, #0B1D2D 0%, #051218 100%)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  fontFamily: 'Inter, system-ui, sans-serif',
};

const headingStyle: CSSProperties = {
  fontSize: '2rem',
  fontWeight: 900,
  margin: '0 0 12px',
  color: '#55E9FF',
};

const subheadingStyle: CSSProperties = {
  fontSize: '1.3rem',
  fontWeight: 800,
  margin: '0 0 8px',
  textAlign: 'center',
};

const mutedStyle: CSSProperties = {
  color: '#94A3B8',
  margin: 0,
  fontSize: '0.95rem',
  lineHeight: 1.5,
};

const cardStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 24,
  padding: 32,
  border: '1px solid rgba(255,255,255,0.1)',
};

const labelStyle: CSSProperties = {
  display: 'block',
  color: '#94A3B8',
  fontSize: '0.9rem',
  margin: '0 0 8px',
  fontWeight: 600,
};

const inputShellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '14px 16px',
  border: '1px solid rgba(255,255,255,0.2)',
  marginBottom: 16,
};

const inputStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  fontSize: '1rem',
  flex: 1,
  outline: 'none',
};

const standaloneInputStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 12,
  padding: '14px 16px',
  marginBottom: 16,
};

const codeInputStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 12,
  padding: 16,
  color: '#fff',
  fontSize: '1.5rem',
  textAlign: 'center',
  letterSpacing: '0.5em',
  outline: 'none',
  fontWeight: 700,
  margin: '24px 0 16px',
};

const errorStyle: CSSProperties = {
  background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.3)',
  borderRadius: 12,
  padding: 12,
  color: '#EF4444',
  fontSize: '0.9rem',
  marginBottom: 16,
};

const buttonStyle: CSSProperties = {
  width: '100%',
  border: 'none',
  borderRadius: 12,
  padding: 16,
  color: '#fff',
  fontSize: '1rem',
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 16,
};

const secondaryButtonStyle: CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  color: '#00C8E8',
  fontSize: '0.9rem',
  cursor: 'pointer',
  fontWeight: 600,
  marginTop: 16,
};

const stepIconStyle: CSSProperties = {
  width: 60,
  height: 60,
  borderRadius: '50%',
  background: 'rgba(0,200,232,0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px',
};

export default WorldClassAuthPage;
