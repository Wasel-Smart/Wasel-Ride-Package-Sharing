/**
 * ProfilePage - /app/profile
 */
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { sanitizeText } from '../../utils/sanitize';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import {
  User,
  Shield,
  Star,
  Car,
  Settings,
  ChevronRight,
  Camera,
  CheckCircle,
  Clock,
  LogOut,
  Bell,
  CreditCard,
} from 'lucide-react';

const BG = '#040C18';
const CARD = 'rgba(255,255,255,0.04)';
const BORD = 'rgba(255,255,255,0.09)';
const CYAN = '#00C8E8';
const FONT = "-apple-system,'Inter',sans-serif";

function showToast(msg: string) {
  const el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#0A1628',
    border: '1px solid rgba(0,200,232,0.3)',
    color: '#EFF6FF',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    zIndex: '9999',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: string;
}
function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 14, padding: '16px 18px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color, fontSize: '1.1rem' }}>{icon}</span>
        <span style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.7)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: FONT }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EFF6FF', fontFamily: FONT, lineHeight: 1.2 }}>
        {value}
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
}
function Section({ title, children }: SectionProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(148,163,184,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT, marginBottom: 12 }}>
        {title}
      </h2>
      <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  value?: string;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  badge?: ReactNode;
}
function Row({ label, value, icon, onClick, danger, badge }: RowProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '14px 18px',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${BORD}`,
        cursor: onClick ? 'pointer' : 'default',
        gap: 12,
        transition: 'background 0.12s',
        textAlign: 'left',
      }}
      onMouseEnter={e => {
        if (onClick) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {icon && <span style={{ color: danger ? '#EF4444' : 'rgba(148,163,184,0.6)', fontSize: '1rem', flexShrink: 0 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: danger ? '#EF4444' : '#EFF6FF', fontFamily: FONT }}>
          {label}
        </div>
        {value && <div style={{ fontSize: '0.75rem', color: 'rgba(148,163,184,0.6)', fontFamily: FONT, marginTop: 2 }}>{value}</div>}
      </div>
      {badge}
      {onClick && <ChevronRight size={14} color="rgba(148,163,184,0.4)" style={{ flexShrink: 0 }} />}
    </button>
  );
}

function VerificationBadge({ level, ar = false }: { level: string; ar?: boolean }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    level_0: { label: ar ? 'غير موثق' : 'Unverified', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
    level_1: { label: ar ? 'موثق الهاتف' : 'Phone Verified', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    level_2: { label: ar ? 'موثق الهوية' : 'ID Verified', color: CYAN, bg: 'rgba(0,200,232,0.12)' },
    level_3: { label: ar ? 'موثوق' : 'Trusted', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  };
  const v = map[level] ?? map.level_0;
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 999, color: v.color, background: v.bg, fontFamily: FONT, letterSpacing: '0.05em', flexShrink: 0 }}>
      {v.label}
    </span>
  );
}

interface InsightCardProps {
  label: string;
  value: string;
  detail: string;
  color: string;
}
function InsightCard({ label, value, detail, color }: InsightCardProps) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.62)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 900, color, fontFamily: FONT, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.76rem', color: 'rgba(148,163,184,0.75)', lineHeight: 1.5, fontFamily: FONT }}>
        {detail}
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  label: string;
  detail: string;
  icon: ReactNode;
  color: string;
  onClick: () => void;
}
function QuickActionCard({ label, detail, icon, color, onClick }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: CARD,
        border: `1px solid ${BORD}`,
        borderRadius: 16,
        padding: '16px 18px',
        width: '100%',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,200,232,0.28)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = BORD;
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
        <ChevronRight size={14} color="rgba(148,163,184,0.45)" />
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#EFF6FF', fontFamily: FONT, marginTop: 14 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.76rem', color: 'rgba(148,163,184,0.72)', lineHeight: 1.5, fontFamily: FONT, marginTop: 6 }}>
        {detail}
      </div>
    </button>
  );
}

export default function ProfilePage() {
  const { user, signOut } = useLocalAuth();
  const { updateProfile } = useAuth();
  const { language } = useLanguage();
  const nav = useIframeSafeNavigate();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const ar = language === 'ar';

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
        <User size={40} color="rgba(148,163,184,0.4)" />
        <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.9rem' }}>
          {ar ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in to view your profile'}
        </p>
        <button
          onClick={() => nav('/app/auth')}
          style={{ padding: '10px 24px', borderRadius: 10, background: `linear-gradient(135deg,${CYAN},#0095B8)`, border: 'none', color: '#040C18', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', fontFamily: FONT }}
        >
          {ar ? 'تسجيل الدخول' : 'Sign In'}
        </button>
      </div>
    );
  }

  const handleSaveName = async () => {
    const clean = sanitizeText(nameInput.trim());
    if (!clean || clean === user.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({ full_name: clean });
    setSaving(false);
    if (error) {
      showToast(ar ? 'تعذر حفظ الاسم حالياً' : 'Unable to save your name right now');
      return;
    }
    setEditing(false);
    showToast(ar ? 'تم حفظ الاسم' : 'Name saved');
  };

  const handleExportData = () => {
    const data = JSON.stringify(
      {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        trips: user.trips,
        rating: user.rating,
        joinedAt: user.joinedAt,
        verificationLevel: user.verificationLevel,
      },
      null,
      2,
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wasel-my-data.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast(ar ? 'تم تصدير بياناتك' : 'Data exported');
  };

  const handlePhotoSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(ar ? 'يرجى اختيار صورة صالحة' : 'Please choose a valid image');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const avatarUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!avatarUrl) {
        showToast(ar ? 'تعذر تجهيز الصورة' : 'Unable to process that image');
        return;
      }

      const { error } = await updateProfile({ avatar_url: avatarUrl });
      if (error) {
        showToast(ar ? 'تعذر تحديث الصورة حالياً' : 'Unable to update your photo right now');
        return;
      }

      showToast(ar ? 'تم تحديث الصورة الشخصية' : 'Profile photo updated');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleNotificationSetup = async () => {
    if (!isSupported) {
      showToast(ar ? 'الإشعارات غير مدعومة على هذا الجهاز' : 'Notifications are not supported on this device');
      return;
    }

    if (permission === 'granted') {
      nav('/app/notifications');
      return;
    }

    const nextPermission = await requestPermission();
    if (nextPermission === 'granted') {
      showToast(ar ? 'تم تفعيل تنبيهات واصل' : 'Wasel alerts are now enabled');
      nav('/app/notifications');
      return;
    }

    showToast(ar ? 'يمكنك تفعيل الإشعارات لاحقاً من إعدادات المتصفح' : 'You can enable notifications later from your browser settings');
  };

  const initials = user.name.split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
  const profileChecks = [
    Boolean(user.name?.trim()),
    Boolean(user.email?.trim()),
    Boolean(user.phone?.trim()),
    user.emailVerified,
    user.phoneVerified,
    user.sanadVerified || user.verified,
  ];
  const profileCompleteness = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100);
  const walletStatus = user.walletStatus === 'frozen'
    ? { label: ar ? 'مجمّد' : 'Frozen', color: '#EF4444' }
    : user.walletStatus === 'limited'
      ? { label: ar ? 'محدود' : 'Limited', color: '#F59E0B' }
      : { label: ar ? 'نشط' : 'Active', color: '#22C55E' };
  const permissionStatus = !isSupported
    ? { label: ar ? 'غير مدعوم' : 'Unsupported', color: '#94A3B8' }
    : permission === 'granted'
      ? { label: ar ? 'مفعل' : 'Enabled', color: '#22C55E' }
      : permission === 'denied'
        ? { label: ar ? 'محظور' : 'Blocked', color: '#EF4444' }
        : { label: ar ? 'غير مفعل' : 'Not enabled', color: '#F59E0B' };
  const trustTier = user.trustScore >= 90
    ? (ar ? 'ثقة عالية' : 'High trust')
    : user.trustScore >= 75
      ? (ar ? 'ثقة قوية' : 'Strong trust')
      : (ar ? 'بحاجة تعزيز' : 'Needs strengthening');
  const joinedDate = user.joinedAt ? new Date(user.joinedAt) : null;
  const joinedText = joinedDate && !Number.isNaN(joinedDate.getTime())
    ? joinedDate.toLocaleDateString('en-JO', { month: 'short', year: 'numeric' })
    : (ar ? 'حساب جديد' : 'New account');
  const roleLabel = user.role === 'driver'
    ? (ar ? 'سائق' : 'Driver')
    : user.role === 'both'
      ? (ar ? 'سائق + راكب' : 'Driver + Rider')
      : (ar ? 'راكب' : 'Rider');

  const verificationItems = [
    {
      label: ar ? 'البريد الإلكتروني' : 'Email',
      status: user.emailVerified ? (ar ? 'مؤكد' : 'Verified') : (ar ? 'غير مؤكد' : 'Needs confirmation'),
      color: user.emailVerified ? '#22C55E' : '#F59E0B',
    },
    {
      label: ar ? 'رقم الهاتف' : 'Phone',
      status: user.phoneVerified ? (ar ? 'مؤكد' : 'Verified') : (user.phone ? (ar ? 'مضاف بانتظار التأكيد' : 'Added, pending confirmation') : (ar ? 'غير مضاف' : 'Not added')),
      color: user.phoneVerified ? '#22C55E' : '#F59E0B',
    },
    {
      label: ar ? 'الهوية / سند' : 'Identity / Sanad',
      status: user.sanadVerified || user.verified ? (ar ? 'مكتمل' : 'Completed') : (ar ? 'بانتظار التحقق' : 'Pending verification'),
      color: user.sanadVerified || user.verified ? CYAN : '#F59E0B',
    },
  ];

  const quickActions = [
    {
      label: ar ? 'مركز رحلاتي' : 'My Trips Hub',
      detail: ar ? 'أدر حجوزاتك والرحلات القادمة من مكان واحد.' : 'Manage upcoming bookings and travel activity in one place.',
      icon: <Car size={18} />,
      color: CYAN,
      onClick: () => nav('/app/my-trips'),
    },
    {
      label: ar ? 'المحفظة والدفع' : 'Wallet & Payments',
      detail: ar ? 'راقب الرصيد والمدفوعات وميزات واصل.' : 'Track balance, payments, and wallet access.',
      icon: <CreditCard size={18} />,
      color: '#F59E0B',
      onClick: () => nav('/app/wallet'),
    },
    {
      label: ar ? 'مركز الإشعارات' : 'Notification Center',
      detail: ar ? 'ثبت التنبيهات المهمة للحجوزات والرحلات والطرود.' : 'Keep ride, package, and account alerts under control.',
      icon: <Bell size={18} />,
      color: '#22C55E',
      onClick: handleNotificationSetup,
    },
    {
      label: ar ? 'إعدادات الحساب' : 'Account Settings',
      detail: ar ? 'حدّث لغتك وتفضيلاتك وأمان حسابك.' : 'Update preferences, language, and security controls.',
      icon: <Settings size={18} />,
      color: '#A78BFA',
      onClick: () => nav('/app/settings'),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: FONT, direction: ar ? 'rtl' : 'ltr', paddingBottom: 80 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ padding: '40px 0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <WaselLogo size={34} theme="light" variant="full" />
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <p style={{ margin: 0, color: 'rgba(148,163,184,0.82)', fontSize: '0.82rem', lineHeight: 1.6, fontFamily: FONT }}>
              {ar ? 'مركز الهوية والثقة والإعدادات داخل شبكة واصل.' : 'Identity, trust, and account controls inside the Wasel network.'}
            </p>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelection}
            style={{ display: 'none' }}
          />
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#00C8E8,#0060D8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 900,
                color: '#040C18',
                boxShadow: `0 0 0 3px rgba(0,200,232,0.35), 0 8px 32px rgba(0,200,232,0.2)`,
                overflow: 'hidden',
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
            </div>
            <button
              title={ar ? 'تغيير الصورة' : 'Change photo'}
              onClick={() => photoInputRef.current?.click()}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#1E293B', border: `2px solid ${BG}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Camera size={12} color={CYAN} />
            </button>
          </div>

          {editing ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', maxWidth: 320 }}>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                autoFocus
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${CYAN}`, background: 'rgba(0,200,232,0.07)', color: '#EFF6FF', fontSize: '0.9rem', fontFamily: FONT, outline: 'none' }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setEditing(false);
                }}
                maxLength={60}
              />
              <button onClick={handleSaveName} disabled={saving} style={{ padding: '8px 14px', borderRadius: 8, background: CYAN, border: 'none', color: '#040C18', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', fontFamily: FONT }}>
                {saving ? '...' : (ar ? 'حفظ' : 'Save')}
              </button>
              <button onClick={() => setEditing(false)} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORD}`, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: FONT }}>
                x
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EFF6FF', fontFamily: FONT, margin: 0 }}>{user.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <span style={{ fontSize: '0.66rem', padding: '4px 9px', borderRadius: 999, color: CYAN, background: 'rgba(0,200,232,0.12)', border: '1px solid rgba(0,200,232,0.25)', fontFamily: FONT, fontWeight: 700 }}>
                  {roleLabel}
                </span>
                <span style={{ fontSize: '0.66rem', padding: '4px 9px', borderRadius: 999, color: walletStatus.color, background: `${walletStatus.color}1A`, border: `1px solid ${walletStatus.color}33`, fontFamily: FONT, fontWeight: 700 }}>
                  {ar ? 'المحفظة' : 'Wallet'}: {walletStatus.label}
                </span>
                <span style={{ fontSize: '0.66rem', padding: '4px 9px', borderRadius: 999, color: '#94A3B8', background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.2)', fontFamily: FONT, fontWeight: 700 }}>
                  {user.backendMode === 'supabase' ? (ar ? 'ملف مباشر' : 'Live profile') : (ar ? 'ملف تجريبي' : 'Demo profile')}
                </span>
              </div>
              <button onClick={() => { setNameInput(user.name); setEditing(true); }} style={{ fontSize: '0.72rem', color: CYAN, background: 'none', border: 'none', cursor: 'pointer', marginTop: 8, fontFamily: FONT }}>
                {ar ? 'تعديل الاسم' : 'Edit name'}
              </button>
            </div>
          )}

          <VerificationBadge level={user.verificationLevel ?? 'level_0'} ar={ar} />
          <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.82rem', fontFamily: FONT, margin: 0 }}>{user.email}</p>
          <p style={{ color: 'rgba(148,163,184,0.72)', fontSize: '0.76rem', fontFamily: FONT, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            {ar ? `درجة الثقة ${user.trustScore}/100 - ${trustTier}` : `Trust score ${user.trustScore}/100 - ${trustTier}`}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          <StatCard label={ar ? 'رحلات' : 'Trips'} value={user.trips ?? 0} icon={<Car size={16} />} color={CYAN} />
          <StatCard label={ar ? 'تقييم' : 'Rating'} value={(user.rating ?? 5).toFixed(1)} icon={<Star size={16} />} color="#F59E0B" />
          <StatCard label={ar ? 'الثقة' : 'Trust'} value={`${user.trustScore}/100`} icon={<Shield size={16} />} color="#22C55E" />
          <StatCard label={ar ? 'الرصيد' : 'Balance'} value={`JOD ${(user.balance ?? 0).toFixed(1)}`} icon={<CreditCard size={16} />} color="#A78BFA" />
        </div>

        <Section title={ar ? 'مركز الحساب' : 'Account Command Center'}>
          <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {quickActions.map(action => (
              <QuickActionCard
                key={action.label}
                label={action.label}
                detail={action.detail}
                icon={action.icon}
                color={action.color}
                onClick={action.onClick}
              />
            ))}
          </div>
        </Section>

        <Section title={ar ? 'صحة الحساب' : 'Account Health'}>
          <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <InsightCard
              label={ar ? 'اكتمال الملف' : 'Profile completeness'}
              value={`${profileCompleteness}%`}
              detail={ar ? 'كلما اكتمل الملف تحسنت الثقة وسهُل الحجز.' : 'A more complete account improves trust and booking confidence.'}
              color={profileCompleteness >= 80 ? '#22C55E' : CYAN}
            />
            <InsightCard
              label={ar ? 'مستوى التحقق' : 'Verification level'}
              value={(user.verificationLevel ?? 'level_0').replace('level_', 'L')}
              detail={ar ? 'مرتبط بالبريد والهاتف والهوية أو سند.' : 'Driven by email, phone, and identity completion.'}
              color={user.verified || user.sanadVerified ? CYAN : '#F59E0B'}
            />
            <InsightCard
              label={ar ? 'حالة المحفظة' : 'Wallet status'}
              value={walletStatus.label}
              detail={ar ? 'يعكس جاهزية الدفع والتحصيل داخل واصل.' : 'Shows whether payments and payouts are ready to flow.'}
              color={walletStatus.color}
            />
            <InsightCard
              label={ar ? 'التنبيهات' : 'Alerts'}
              value={permissionStatus.label}
              detail={ar ? 'إشعارات الرحلات والطرود والتحديثات الحرجة.' : 'Critical ride, package, and account alerts for this device.'}
              color={permissionStatus.color}
            />
          </div>
        </Section>

        <Section title={ar ? 'الثقة والتحقق' : 'Trust & Verification'}>
          {verificationItems.map(item => (
            <Row
              key={item.label}
              label={item.label}
              value={item.status}
              icon={<Shield size={15} />}
              badge={
                <span style={{ fontSize: '0.65rem', color: item.color, background: `${item.color}1A`, padding: '3px 8px', borderRadius: 999, fontFamily: FONT, fontWeight: 700 }}>
                  {item.status}
                </span>
              }
              onClick={() => nav('/app/settings')}
            />
          ))}
          <Row
            label={ar ? 'الوضع التشغيلي' : 'Operational standing'}
            value={ar ? `${trustTier} - عضو منذ ${joinedText}` : `${trustTier} - Member since ${joinedText}`}
            icon={<CheckCircle size={15} />}
            onClick={() => nav('/app/my-trips')}
          />
        </Section>

        <Section title={ar ? 'الحساب' : 'Account'}>
          <Row label={ar ? 'الهاتف' : 'Phone number'} value={user.phone ?? (ar ? 'لم يُضف بعد' : 'Not added')} icon={<span>📱</span>} onClick={() => nav('/app/settings')} />
          <Row label={ar ? 'التحقق من الهوية' : 'ID Verification'} value={ar ? 'سند eKYC' : 'Sanad eKYC'} icon={<Shield size={15} />} badge={<VerificationBadge level={user.verificationLevel ?? 'level_0'} ar={ar} />} onClick={() => nav('/app/trust')} />
          <Row label={ar ? 'اللغة' : 'Language'} value={ar ? 'العربية' : 'English'} icon={<span>🌐</span>} onClick={() => nav('/app/settings')} />
          <Row
            label={ar ? 'الإشعارات' : 'Notifications'}
            value={permissionStatus.label}
            icon={<Bell size={15} />}
            badge={
              <span style={{ fontSize: '0.65rem', color: permissionStatus.color, background: `${permissionStatus.color}1A`, padding: '3px 8px', borderRadius: 999, fontFamily: FONT, fontWeight: 700 }}>
                {permissionStatus.label}
              </span>
            }
            onClick={handleNotificationSetup}
          />
        </Section>

        {(user.role === 'driver' || user.role === 'both') && (
          <Section title={ar ? 'وضع السائق' : 'Driver Mode'}>
            <Row label={ar ? 'سيارتي' : 'My Vehicle'} value={ar ? 'تويوتا كورولا 2021' : 'Toyota Corolla 2021'} icon={<Car size={15} />} onClick={() => nav('/app/settings')} />
            <Row
              label={ar ? 'المستندات' : 'Documents'}
              value={ar ? 'رخصة + تأمين + ترخيص' : 'License · Insurance · Registration'}
              icon={<span>📄</span>}
              badge={<CheckCircle size={14} color="#22C55E" />}
              onClick={() => nav('/app/trust')}
            />
            <Row label={ar ? 'الأرباح' : 'Earnings'} icon={<span>💰</span>} onClick={() => nav('/app/wallet')} />
          </Section>
        )}

        <Section title={ar ? 'التفضيلات' : 'Preferences'}>
          <Row label={ar ? 'تفضيل الجنس' : 'Gender Preference'} value={ar ? 'مختلط (افتراضي)' : 'Mixed (default)'} icon={<span>👥</span>} onClick={() => nav('/app/settings')} />
          <Row label={ar ? 'العملة' : 'Currency'} value="JOD" icon={<span>💱</span>} onClick={() => nav('/app/settings')} />
          <Row label={ar ? 'الإعدادات المتقدمة' : 'Advanced Settings'} icon={<Settings size={15} />} onClick={() => nav('/app/settings')} />
        </Section>

        <Section title={ar ? 'الأمان' : 'Security'}>
          <Row label={ar ? 'تغيير كلمة المرور' : 'Change Password'} icon={<span>🔑</span>} onClick={() => nav('/app/settings')} />
          <Row
            label={ar ? 'التحقق الثنائي (2FA)' : 'Two-Factor Auth (2FA)'}
            badge={
              <span style={{ fontSize: '0.65rem', color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '2px 7px', borderRadius: 999, fontFamily: FONT, fontWeight: 700 }}>
                {ar ? 'غير مفعل' : 'Off'}
              </span>
            }
            icon={<span>🛡️</span>}
            onClick={() => nav('/app/settings')}
          />
          <Row label={ar ? 'الأجهزة المسجلة' : 'Active Sessions'} icon={<span>💻</span>} onClick={() => nav('/app/settings')} />
        </Section>

        <Section title={ar ? 'القانوني' : 'Legal'}>
          <Row label={ar ? 'سياسة الخصوصية' : 'Privacy Policy'} icon={<span>📋</span>} onClick={() => nav('/app/privacy')} />
          <Row label={ar ? 'شروط الخدمة' : 'Terms of Service'} icon={<span>📜</span>} onClick={() => nav('/app/terms')} />
        </Section>

        <Section title={ar ? 'منطقة الخطر' : 'Danger Zone'}>
          <Row label={ar ? 'تصدير بياناتي' : 'Export My Data'} icon={<span>📦</span>} onClick={handleExportData} />
          <Row label={ar ? 'طلب حذف الحساب' : 'Request Account Deletion'} danger icon={<span>🗑️</span>} onClick={() => setShowDeleteConfirm(true)} />
          <Row
            label={ar ? 'تسجيل الخروج' : 'Sign Out'}
            danger
            icon={<LogOut size={15} />}
            onClick={async () => {
              await signOut();
              nav('/');
            }}
          />
        </Section>

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(148,163,184,0.35)', fontFamily: FONT }}>
          <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          {user.joinedAt
            ? (ar ? `عضو منذ ${user.joinedAt}` : `Member since ${user.joinedAt}`)
            : (ar ? 'عضو في واصل' : 'Wasel member')}
        </p>
      </div>

      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0A1628', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%' }}>
            <h3 style={{ color: '#EF4444', fontFamily: FONT, fontWeight: 800, fontSize: '1.1rem', marginBottom: 10 }}>
              {ar ? 'طلب حذف الحساب' : 'Request Account Deletion'}
            </h3>
            <p style={{ color: 'rgba(148,163,184,0.8)', fontFamily: FONT, fontSize: '0.85rem', marginBottom: 20 }}>
              {ar ? 'الحذف الكامل غير متاح من هذا السطح حالياً. سنسجل خروجك الآن لتأمين الحساب، ثم يمكنك متابعة طلب الحذف عبر الدعم.' : 'Full account deletion is not available from this screen yet. We will sign you out now so you can safely continue a deletion request through support.'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, height: 40, borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontFamily: FONT, cursor: 'pointer' }}
              >
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  showToast(ar ? 'تم تسجيل الخروج. تابع طلب الحذف عبر الدعم.' : 'Signed out. Continue the deletion request through support.');
                  await signOut();
                  nav('/');
                }}
                style={{ flex: 1, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', fontFamily: FONT, fontWeight: 700, cursor: 'pointer' }}
              >
                {ar ? 'متابعة' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
