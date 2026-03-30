/**
 * Wasel Auth Page v3.0
 * Full dark cosmic — both panels match #040C18 / #0A1628
 * Password strength · social hints · bilingual · mobile-responsive
 */
import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import { useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { WaselLogo, WaselHeroMark } from '../components/wasel-ds/WaselLogo';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { Eye, EyeOff, CheckCircle2, Loader2, Shield, Zap, Package, Bus } from 'lucide-react';
import { checkRateLimit, validateEmail } from '../utils/security';
import { useAuth } from '../contexts/AuthContext';
import { getConfig, getWhatsAppSupportUrl } from '../utils/env';

// ── Tokens (all dark) ─────────────────────────────────────────────────────────
const C = {
  bg:    '#040C18',
  card:  '#0A1628',
  panel: '#0D1F38',
  border:'rgba(0,200,232,0.14)',
  borderH:'rgba(0,200,232,0.35)',
  cyan:  '#00C8E8',
  gold:  '#F0A830',
  green: '#00C875',
  red:   '#FF4455',
  text:  '#EFF6FF',
  sub:   'rgba(148,163,184,0.80)',
  muted: 'rgba(100,130,180,0.55)',
  F: "-apple-system,'Inter','Cairo',sans-serif",
  FA:"'Cairo','Tajawal',sans-serif",
} as const;

const R = { sm:6, md:10, lg:12, xl:16, xxl:20, full:9999 } as const;
const GRAD = `linear-gradient(135deg,${C.cyan},#0095B8)`;
const GRAD_GOLD = `linear-gradient(135deg,${C.gold},#E89200)`;

// ── Password strength ─────────────────────────────────────────────────────────
function pwStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score:0, label:'', color:C.muted };
  let s = 0;
  if (pw.length >= 6)  s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw))    s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const map = [
    { score:0, label:'', color:C.muted },
    { score:1, label:'Weak', color:C.red },
    { score:2, label:'Fair', color:C.gold },
    { score:3, label:'Good', color:C.cyan },
    { score:4, label:'Strong', color:C.green },
    { score:5, label:'Excellent', color:C.green },
  ];
  return map[Math.min(s, 5)];
}

// ── Dark floating input ───────────────────────────────────────────────────────
function DarkInput({
  label, labelAr, type='text', value, onChange, placeholder, icon, hint,
}: {
  label:string; labelAr?:string; type?:string; value:string;
  onChange:(v:string)=>void; placeholder?:string; icon?:string; hint?:React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPw = type === 'password';
  const inputType = isPw && showPw ? 'text' : type;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
        <label style={{ fontSize:'0.76rem', fontWeight:700, color:C.sub, fontFamily:C.F }}>{label}</label>
        {labelAr && <span style={{ fontSize:'0.7rem', color:C.muted, fontFamily:C.FA }}>{labelAr}</span>}
      </div>
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'0 14px', height:48, borderRadius:R.md,
        background: focused ? C.panel : C.card,
        border:`1.5px solid ${focused ? C.cyan : C.border}`,
        boxShadow: focused ? `0 0 0 3px rgba(0,200,232,0.12)` : 'none',
        transition:'all 0.15s ease',
      }}>
        {icon && <span style={{ fontSize:'1rem', flexShrink:0 }}>{icon}</span>}
        <input
          type={inputType} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:'0.875rem', color:C.text, fontFamily:C.F }}
        />
        {isPw && (
          <button type="button" onClick={() => setShowPw(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, display:'flex', padding:0 }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && <div style={{ marginTop:6 }}>{hint}</div>}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
type Tab = 'signin' | 'register';

export default function WaselAuth() {
  const [params] = useSearchParams();
  const initialTab = params.get('tab') === 'register' ? 'register' : 'signin';

  const [tab,      setTab]      = useState<Tab>(initialTab);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [err,      setErr]      = useState('');
  const [success,  setSuccess]  = useState(false);

  const { signIn, register, loading, user } = useLocalAuth();
  const { resetPassword, signInWithGoogle, signInWithFacebook } = useAuth();
  const nav = useIframeSafeNavigate();
  const mountedRef = useRef(true);
  const { enableDemoAccount, supportWhatsAppNumber } = getConfig();

  // Validate returnTo to prevent open redirect — only allow same-origin paths
  const safeReturnTo = (() => {
    const raw = params.get('returnTo') || '/app/find-ride';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/app/find-ride';
  })();

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { if (user && mountedRef.current) nav(safeReturnTo); }, [user, nav, safeReturnTo]);

  const handleDemo = async () => {
    await signIn('demo@wasel.jo', 'demo123');
    if (mountedRef.current) setTimeout(() => { if (mountedRef.current) nav(safeReturnTo); }, 600);
  };

  const handleSignIn = async () => {
    setErr('');
    if (!email) { setErr('Please enter your email'); return; }
    if (!validateEmail(email)) { setErr('Please enter a valid email address'); return; }
    if (!password) { setErr('Please enter your password'); return; }
    // Client-side rate limit: 5 attempts per minute per email
    if (!checkRateLimit(`signin:${email}`, { maxRequests: 5, windowMs: 60_000 })) {
      setErr('Too many attempts. Please wait a minute before trying again.');
      return;
    }
    const { error } = await signIn(email, password);
    if (error) setErr(error);
    else if (mountedRef.current) { setSuccess(true); setTimeout(() => { if (mountedRef.current) nav(safeReturnTo); }, 600); }
  };

  const handleRegister = async () => {
    setErr('');
    if (!name) { setErr('Please enter your name'); return; }
    if (!email) { setErr('Please enter your email'); return; }
    if (!validateEmail(email)) { setErr('Please enter a valid email address'); return; }
    if (password.length < 6) { setErr('Password must be at least 6 characters'); return; }
    // Client-side rate limit: 3 registrations per minute per email
    if (!checkRateLimit(`register:${email}`, { maxRequests: 3, windowMs: 60_000 })) {
      setErr('Too many attempts. Please wait a minute before trying again.');
      return;
    }
    const { error } = await register(name, email, password, phone);
    if (error) setErr(error);
    else if (mountedRef.current) { setSuccess(true); setTimeout(() => { if (mountedRef.current) nav(safeReturnTo); }, 600); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setErr('Enter your email above first'); return; }
    if (!validateEmail(email)) { setErr('Please enter a valid email address'); return; }
    const { error } = await resetPassword(email);
    if (error) setErr(typeof error === 'string' ? error : (error as Error).message);
    else setErr('');
    // Show success regardless to prevent email enumeration
    toast.success(`If ${email} is registered, a reset link has been sent.`);
  };

  const handleGoogleSignIn = async () => {
    setErr('');
    const { error } = await signInWithGoogle();
    if (error) {
      setErr(error instanceof Error ? error.message : 'Google sign-in failed');
    }
  };

  const handleFacebookSignIn = async () => {
    setErr('');
    const { error } = await signInWithFacebook();
    if (error) {
      setErr(error instanceof Error ? error.message : 'Facebook sign-in failed');
    }
  };

  const handleWhatsAppHelp = () => {
    if (!supportWhatsAppNumber) {
      setErr('WhatsApp support is not configured yet.');
      return;
    }

    window.open(
      getWhatsAppSupportUrl('Hi Wasel'),
      '_blank',
      'noopener,noreferrer',
    );
  };
  const socialActions: Record<string, () => void | Promise<void>> = {
    Google: handleGoogleSignIn,
    Facebook: handleFacebookSignIn,
    WhatsApp: handleWhatsAppHelp,
  };
  const pw = pwStrength(password);

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:C.F, display:'grid', gridTemplateColumns:'1fr 1fr' }}
      className="auth-grid"
    >
      <style>{`
        @media(max-width:768px){
          .auth-grid { grid-template-columns:1fr !important; }
          .auth-brand-panel { display:none !important; }
          .auth-form-panel { padding:32px 20px !important; align-items:flex-start !important; }
          .auth-mobile-header { display:flex !important; }
        }
        @media(max-width:480px){
          .auth-form-panel { padding:24px 16px !important; }
        }
      `}</style>

      {/* ── LEFT — Brand Panel ── */}
      <div className="auth-brand-panel" style={{
        background:`linear-gradient(145deg,#0B1D45 0%,#162C6A 55%,#0A1628 100%)`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'60px 52px', position:'relative', overflow:'hidden',
      }}>
        {/* glows */}
        <div style={{ position:'absolute', top:-100, right:-60, width:440, height:440, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,200,232,0.12),transparent 65%)', filter:'blur(80px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-80, left:-50, width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle,rgba(32,96,232,0.12),transparent 65%)', filter:'blur(80px)', pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:360 }}>
          <WaselLogo size={44} theme="light" variant="full" />
          <div style={{ margin:'32px 0 24px' }}>
            <WaselHeroMark size={90} />
          </div>
          <h2 style={{ fontSize:'1.7rem', fontWeight:900, color:'#fff', letterSpacing:'-0.03em', margin:'0 0 8px', lineHeight:1.15 }}>
            Wasel,<br />
            <span style={{ background:`linear-gradient(90deg,${C.cyan},#60A5FA)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Move Smarter
            </span>
          </h2>
          <p dir="rtl" style={{ fontSize:'0.95rem', fontWeight:700, color:C.gold, fontFamily:C.FA, marginBottom:24 }}>
            واصل — شريكك الذكي بالتنقل
          </p>
          <p style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.42)', lineHeight:1.8, marginBottom:36 }}>
            Four smart services built for Jordan's culture — carpooling, packages, on-demand &amp; bus.
          </p>

          <div style={{ display:'flex', flexDirection:'column', gap:12, textAlign:'left' }}>
            {[
              { icon:<Zap size={14}/>,     text:'Intercity carpooling from JOD 4',  color:C.cyan  },
              { icon:<Package size={14}/>, text:'Package delivery via travelers',     color:C.gold  },
              { icon:<Bus size={14}/>,     text:'Fixed-price intercity buses',        color:C.green },
              { icon:<Shield size={14}/>,  text:'Prayer stops · gender preferences', color:'#A78BFA'},
            ].map(f => (
              <div key={f.text} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:`${f.color}15`, border:`1px solid ${f.color}25`, display:'flex', alignItems:'center', justifyContent:'center', color:f.color, flexShrink:0 }}>
                  {f.icon}
                </div>
                <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.55)', fontFamily:C.F }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:32, flexWrap:'wrap' }}>
            {['🔒 SSL Secured','🇯🇴 Jordan-first','✓ No spam'].map(b => (
              <span key={b} style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:999, padding:'4px 10px' }}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT — Form Panel (DARK) ── */}
      <div className="auth-form-panel" style={{ background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 48px', overflowY:'auto' }}>
        <div style={{ width:'100%', maxWidth:420 }}>

          {/* Mobile brand strip — visible only on mobile, hidden on desktop */}
          <div className="auth-mobile-header" style={{
            display:'none', flexDirection:'column', alignItems:'center',
            textAlign:'center', marginBottom:32, paddingBottom:28,
            borderBottom:`1px solid ${C.border}`,
          }}>
            <WaselLogo size={38} theme="light" variant="full" />
            <h2 style={{ fontSize:'1.5rem', fontWeight:900, color:C.text, marginTop:14, marginBottom:4, letterSpacing:'-0.03em' }}>
              Wasel <span style={{ color:C.cyan }}>Move Smarter</span>
            </h2>
            <p dir="rtl" style={{ fontSize:'0.88rem', fontWeight:700, color:C.gold, fontFamily:C.FA, marginBottom:12 }}>
              شريكك الذكي بالتنقل
            </p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
              {[
                { icon:<Zap size={11}/>,     label:'From JOD 4',        color:C.cyan  },
                { icon:<Package size={11}/>, label:'Package delivery',  color:C.gold  },
                { icon:<Shield size={11}/>,  label:'Prayer-aware',       color:'#A78BFA'},
              ].map(f => (
                <span key={f.label} style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  fontSize:'0.68rem', color:f.color, fontWeight:600,
                  background:`${f.color}12`, border:`1px solid ${f.color}25`,
                  borderRadius:999, padding:'4px 10px',
                }}>
                  <span style={{ color:f.color }}>{f.icon}</span>
                  {f.label}
                </span>
              ))}
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display:'flex', background:C.card, borderRadius:R.lg, padding:4, marginBottom:32, border:`1px solid ${C.border}` }}>
            {(['signin','register'] as Tab[]).map(t => (
              <motion.button key={t} onClick={() => { setTab(t); setErr(''); }}
                whileTap={{ scale:0.97 }}
                style={{
                  flex:1, height:42, borderRadius:R.md, border:'none', cursor:'pointer',
                  fontSize:'0.875rem', fontWeight: tab===t ? 700 : 500, fontFamily:C.F,
                  background: tab===t ? GRAD : 'transparent',
                  color: tab===t ? '#040C18' : C.muted,
                  boxShadow: tab===t ? `0 2px 12px rgba(0,200,232,0.3)` : 'none',
                  transition:'all 0.18s ease',
                }}>
                {t === 'signin' ? 'Sign In' : 'Create Account'}
              </motion.button>
            ))}
          </div>

          {/* Heading */}
          <div style={{ marginBottom:28 }}>
            <h3 style={{ fontSize:'1.4rem', fontWeight:900, color:C.text, margin:'0 0 6px', letterSpacing:'-0.02em' }}>
              {tab === 'signin' ? 'Welcome back' : 'Join Wasel'}
            </h3>
            <p style={{ fontSize:'0.8rem', color:C.muted, margin:0, fontFamily:C.FA }} dir="rtl">
              {tab === 'signin' ? 'أهلاً بعودتك — سجّل دخولك' : 'انضم إلى مجتمع التنقل الذكي'}
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {err && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                style={{ background:'rgba(255,68,85,0.10)', border:'1px solid rgba(255,68,85,0.30)', borderRadius:R.md, padding:'10px 14px', marginBottom:18, fontSize:'0.8rem', color:C.red }}>
                ⚠ {err}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success */}
          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                style={{ background:'rgba(0,200,117,0.10)', border:'1px solid rgba(0,200,117,0.30)', borderRadius:R.md, padding:'12px 14px', marginBottom:18, display:'flex', alignItems:'center', gap:8, fontSize:'0.82rem', color:C.green }}>
                <CheckCircle2 size={16} /> Signed in! Redirecting…
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form fields */}
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity:0, x:12 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-12 }} transition={{ duration:0.15 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                {tab === 'register' && (
                  <DarkInput label="Full Name" labelAr="الاسم الكامل" value={name} onChange={setName} placeholder="Ahmad Al-Rashid" icon="👤" />
                )}

                <DarkInput label="Email" labelAr="البريد الإلكتروني" type="email" value={email} onChange={setEmail} placeholder="you@example.com" icon="📧" />

                <DarkInput
                  label="Password" labelAr="كلمة المرور" type="password" value={password} onChange={setPassword}
                  placeholder={tab === 'register' ? 'Min. 6 characters' : 'Enter password'}
                  icon="����"
                  hint={tab === 'register' && password.length > 0 ? (
                    <div>
                      <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} style={{ flex:1, height:3, borderRadius:999, background: i <= pw.score ? pw.color : 'rgba(255,255,255,0.08)', transition:'background 0.2s' }} />
                        ))}
                      </div>
                      {pw.label && <span style={{ fontSize:'0.65rem', color:pw.color }}>{pw.label}</span>}
                    </div>
                  ) : undefined}
                />

                {tab === 'register' && (
                  <DarkInput label="Phone (optional)" labelAr="الهاتف (اختياري)" type="tel" value={phone} onChange={setPhone} placeholder="+962 79 123 4567" icon="📱" />
                )}

                {tab === 'signin' && (
                  <div style={{ textAlign:'right' }}>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      style={{ background:'none', border:'none', color:C.cyan, fontSize:'0.76rem', cursor:'pointer', fontFamily:C.F }}
                    >
                      Forgot password? / نسيت كلمة المرور؟
                    </button>
                  </div>
                )}

                {/* Primary CTA */}
                <motion.button
                  whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                  onClick={tab === 'signin' ? handleSignIn : handleRegister}
                  disabled={loading || success}
                  style={{
                    height:50, borderRadius:R.md, border:'none', cursor:'pointer',
                    background: GRAD, color:'#040C18', fontWeight:800, fontSize:'0.9rem',
                    fontFamily:C.F, boxShadow:`0 4px 20px rgba(0,200,232,0.3)`,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    opacity: loading ? 0.7 : 1, transition:'opacity 0.15s',
                  }}>
                  {loading ? <Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} /> : (
                    tab === 'signin' ? '→ Sign In' : '→ Create Account'
                  )}
                </motion.button>

                {/* Divider */}
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ flex:1, height:1, background:C.border }} />
                  <span style={{ fontSize:'0.7rem', color:C.muted }}>or continue with</span>
                  <div style={{ flex:1, height:1, background:C.border }} />
                </div>

                {/* Social / quick login buttons */}
                <div style={{ display:'flex', gap:8 }}>
                  {[
                    { icon:'🌐', label:'Google', color:'#4285F4' },
                    ...(supportWhatsAppNumber ? [{ icon:'📱', label:'WhatsApp', color:'#25D366' }] : []),
                  ].map(s => (
                    <motion.button key={s.label} whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} type="button" onClick={() => { void socialActions[s.label]?.(); }}
                      style={{ flex:1, height:44, borderRadius:R.md, border:`1px solid ${s.color}30`, background:`${s.color}0A`, color:s.color, fontWeight:700, fontSize:'0.8rem', fontFamily:C.F, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                      <span>{s.icon}</span> {s.label}
                    </motion.button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleFacebookSignIn}
                  style={{ height:44, borderRadius:R.md, border:'1px solid rgba(24,119,242,0.28)', background:'rgba(24,119,242,0.08)', color:'#1877F2', fontWeight:600, fontSize:'0.8rem', fontFamily:C.F, cursor:'pointer' }}
                >
                  Facebook Sign In
                </button>

                {/* Demo shortcut */}
                <button onClick={handleDemo} type="button" hidden={!enableDemoAccount}
                  style={{ height:44, borderRadius:R.md, border:`1px solid rgba(240,168,48,0.25)`, background:'rgba(240,168,48,0.07)', color:C.gold, fontWeight:600, fontSize:'0.8rem', fontFamily:C.F, cursor:'pointer', display: enableDemoAccount ? 'block' : 'none' }}>
                  ⚡ Try demo account — جرّب الحساب التجريبي
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Footer note */}
          <p style={{ fontSize:'0.68rem', color:C.muted, textAlign:'center', marginTop:24, lineHeight:1.7 }}>
            By continuing, you agree to our{' '}
            <button type="button" onClick={() => nav('/terms')} style={{ color:C.cyan, cursor:'pointer', background:'none', border:'none', padding:0, font:'inherit' }}>Terms of Service</button>{' '}and{' '}
            <button type="button" onClick={() => nav('/privacy')} style={{ color:C.cyan, cursor:'pointer', background:'none', border:'none', padding:0, font:'inherit' }}>Privacy Policy</button>.
            <br />
            <span dir="rtl" style={{ fontFamily:C.FA }}>🇯🇴 مصمّم خصيصاً للأردن والشرق الأوسط</span>
          </p>
        </div>
      </div>
    </div>
  );
}

