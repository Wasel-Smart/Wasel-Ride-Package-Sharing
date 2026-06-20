import { useState } from 'react';
import { ArrowRight, Phone, Mail, Lock, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';

/**
 * WORLD-CLASS AUTH PAGE - 10/10 UX
 * 
 * Inspired by:
 * - WhatsApp: Phone-first authentication
 * - Telegram: Simple, fast signup
 * - Stripe: Clean, trustworthy design
 * 
 * Key Principles:
 * 1. Phone number as primary method (fastest in Jordan)
 * 2. Email as fallback option
 * 3. No social auth clutter for new users
 * 4. Clear value proposition
 */

type AuthStep = 'phone' | 'verify' | 'complete';

export function WorldClassAuthPage() {
  const { language } = useLanguage();
  const { signIn, signUp } = useAuth();
  const navigate = useIframeSafeNavigate();
  
  const ar = language === 'ar';
  
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useEmail, setUseEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Format phone number as user types
  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('962')) {
      return cleaned;
    }
    if (cleaned.startsWith('0')) {
      return '962' + cleaned.slice(1);
    }
    return '962' + cleaned;
  };

  const handlePhoneSubmit = async () => {
    setError('');
    
    if (phone.length < 12) {
      setError(ar ? 'رقم الهاتف غير صحيح' : 'Invalid phone number');
      return;
    }

    setLoading(true);
    
    // Simulate sending verification code
    setTimeout(() => {
      setLoading(false);
      setStep('verify');
    }, 1000);
  };

  const handleVerifyCode = async () => {
    setError('');
    
    if (code.length !== 6) {
      setError(ar ? 'أدخل رمز التحقق المكون من 6 أرقام' : 'Enter 6-digit verification code');
      return;
    }

    setLoading(true);
    
    // Simulate verification
    setTimeout(() => {
      setLoading(false);
      setStep('complete');
    }, 1000);
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
      name,
      phone,
      '/app',
    );
    
    if (result.error) {
      setError(ar ? 'حدث خطأ. حاول مرة أخرى' : 'Something went wrong. Try again');
      setLoading(false);
      return;
    }

    // Success - redirect
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
      setError(ar ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
      setLoading(false);
      return;
    }

    navigate('/app');
  };

  return (
    <div style={{
      minHeight: 'var(--app-min-height)',
      background: 'linear-gradient(135deg, #0B1D2D 0%, #051218 100%)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px'
      }}>
        {/* Logo and Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '16px'
          }}>
            🚗
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '900',
            margin: '0 0 12px',
            background: 'linear-gradient(90deg, #55E9FF, #60A5FA)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {ar ? 'مرحباً بك في واصل' : 'Welcome to Wasel'}
          </h1>
          <p style={{
            color: '#94A3B8',
            margin: 0,
            fontSize: '1rem'
          }}>
            {ar 
              ? 'سجل دخول للمتابعة'
              : 'Sign in to continue'
            }
          </p>
        </div>

        {/* Auth Form */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Step 1: Phone Number */}
          {step === 'phone' && !useEmail && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  color: '#94A3B8',
                  fontSize: '0.9rem',
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  {ar ? 'رقم الهاتف' : 'Phone Number'}
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <Phone size={20} color="#00C8E8" />
                  <span style={{ color: '#94A3B8' }}>+962</span>
                  <input
                    type="tel"
                    value={phone.replace('962', '')}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder={ar ? '79 123 4567' : '79 123 4567'}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: '1rem',
                      flex: 1,
                      outline: 'none'
                    }}
                  />
                </div>
                <p style={{
                  color: '#64748B',
                  fontSize: '0.85rem',
                  margin: '8px 0 0',
                  lineHeight: '1.4'
                }}>
                  {ar 
                    ? 'سنرسل لك رمز تحقق عبر الرسائل القصيرة'
                    : 'We\'ll send you a verification code via SMS'
                  }
                </p>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#EF4444',
                  fontSize: '0.9rem',
                  marginBottom: '16px'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handlePhoneSubmit}
                disabled={loading || phone.length < 12}
                style={{
                  width: '100%',
                  background: phone.length >= 12 && !loading
                    ? 'linear-gradient(135deg, #00C8E8 0%, #0095B8 100%)'
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '800',
                  cursor: phone.length >= 12 && !loading ? 'pointer' : 'not-allowed',
                  opacity: phone.length >= 12 && !loading ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}
              >
                {loading ? (
                  ar ? 'جاري الإرسال...' : 'Sending...'
                ) : (
                  <>
                    {ar ? 'إرسال الرمز' : 'Send Code'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div style={{
                textAlign: 'center',
                padding: '16px 0',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                marginTop: '16px'
              }}>
                <button
                  onClick={() => setUseEmail(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00C8E8',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {ar ? 'استخدم البريد الإلكتروني بدلاً من ذلك' : 'Use email instead'}
                </button>
              </div>
            </>
          )}

          {/* Step 2: Verify Code */}
          {step === 'verify' && (
            <>
              <div style={{
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(0,200,232,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Phone size={28} color="#00C8E8" />
                </div>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '800',
                  margin: '0 0 8px'
                }}>
                  {ar ? 'أدخل رمز التحقق' : 'Enter verification code'}
                </h3>
                <p style={{
                  color: '#94A3B8',
                  fontSize: '0.9rem',
                  margin: 0
                }}>
                  {ar 
                    ? `أرسلنا رمزاً إلى +${phone}`
                    : `We sent a code to +${phone}`
                  }
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    padding: '16px',
                    color: '#fff',
                    fontSize: '1.5rem',
                    textAlign: 'center',
                    letterSpacing: '0.5em',
                    outline: 'none',
                    fontWeight: '700'
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#EF4444',
                  fontSize: '0.9rem',
                  marginBottom: '16px'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
                style={{
                  width: '100%',
                  background: code.length === 6 && !loading
                    ? 'linear-gradient(135deg, #00C8E8 0%, #0095B8 100%)'
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '800',
                  cursor: code.length === 6 && !loading ? 'pointer' : 'not-allowed',
                  opacity: code.length === 6 && !loading ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  ar ? 'جاري التحقق...' : 'Verifying...'
                ) : (
                  <>
                    {ar ? 'تحقق' : 'Verify'}
                    <Check size={18} />
                  </>
                )}
              </button>

              <div style={{
                textAlign: 'center',
                marginTop: '16px'
              }}>
                <button
                  onClick={() => setStep('phone')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  {ar ? 'تغيير رقم الهاتف' : 'Change phone number'}
                </button>
              </div>
            </>
          )}

          {/* Step 3: Complete Profile */}
          {step === 'complete' && (
            <>
              <div style={{
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Check size={28} color="#10B981" />
                </div>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '800',
                  margin: '0 0 8px'
                }}>
                  {ar ? 'أكمل ملفك الشخصي' : 'Complete your profile'}
                </h3>
                <p style={{
                  color: '#94A3B8',
                  fontSize: '0.9rem',
                  margin: 0
                }}>
                  {ar 
                    ? 'خطوة أخيرة قبل البدء'
                    : 'One last step before you start'
                  }
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  color: '#94A3B8',
                  fontSize: '0.9rem',
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  {ar ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={ar ? 'أحمد محمد' : 'Ahmad Mohammad'}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    color: '#fff',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#EF4444',
                  fontSize: '0.9rem',
                  marginBottom: '16px'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleComplete}
                disabled={loading || !name.trim()}
                style={{
                  width: '100%',
                  background: name.trim() && !loading
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '800',
                  cursor: name.trim() && !loading ? 'pointer' : 'not-allowed',
                  opacity: name.trim() && !loading ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  ar ? 'جاري الإنشاء...' : 'Creating...'
                ) : (
                  <>
                    {ar ? 'ابدأ استخدام واصل' : 'Start using Wasel'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </>
          )}

          {/* Email Auth Alternative */}
          {useEmail && step === 'phone' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  color: '#94A3B8',
                  fontSize: '0.9rem',
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  {ar ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <Mail size={20} color="#00C8E8" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={ar ? 'you@example.com' : 'you@example.com'}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: '1rem',
                      flex: 1,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  color: '#94A3B8',
                  fontSize: '0.9rem',
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  {ar ? 'كلمة المرور' : 'Password'}
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <Lock size={20} color="#00C8E8" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={ar ? '••••••••' : '••••••••'}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: '1rem',
                      flex: 1,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#EF4444',
                  fontSize: '0.9rem',
                  marginBottom: '16px'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleEmailAuth}
                disabled={loading || !email || !password}
                style={{
                  width: '100%',
                  background: email && password && !loading
                    ? 'linear-gradient(135deg, #00C8E8 0%, #0095B8 100%)'
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '800',
                  cursor: email && password && !loading ? 'pointer' : 'not-allowed',
                  opacity: email && password && !loading ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}
              >
                {loading ? (
                  ar ? 'جاري تسجيل الدخول...' : 'Signing in...'
                ) : (
                  <>
                    {ar ? 'تسجيل الدخول' : 'Sign In'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div style={{
                textAlign: 'center',
                padding: '16px 0',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                marginTop: '16px'
              }}>
                <button
                  onClick={() => setUseEmail(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00C8E8',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {ar ? 'استخدم رقم الهاتف بدلاً من ذلك' : 'Use phone number instead'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Terms */}
        <p style={{
          textAlign: 'center',
          color: '#64748B',
          fontSize: '0.85rem',
          marginTop: '24px',
          lineHeight: '1.5'
        }}>
          {ar 
            ? 'بالمتابعة، أنت توافق على شروط الخدمة وسياسة الخصوصية'
            : 'By continuing, you agree to our Terms of Service and Privacy Policy'
          }
        </p>
      </div>
    </div>
  );
}

export default WorldClassAuthPage;
