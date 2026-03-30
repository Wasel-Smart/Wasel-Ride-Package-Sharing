/**
 * SettingsPage - /app/settings
 * App-wide settings: notifications, privacy, language, display, account.
 */
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Bell, ChevronRight, Eye, Globe, Palette, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import type { Language } from '../../locales/translations';
import { getConfig } from '../../utils/env';
import { isTwoFactorAvailable } from '../../utils/security';

const BG = '#040C18';
const CARD = 'rgba(255,255,255,0.04)';
const BORD = 'rgba(255,255,255,0.09)';
const CYAN = '#00C8E8';
const FONT = "-apple-system,'Inter',sans-serif";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: value ? CYAN : 'rgba(255,255,255,0.15)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: value ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}
      />
    </button>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.9rem' }}>{icon}</span>
        <h2
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'rgba(148,163,184,0.5)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: FONT,
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${BORD}`, gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#EFF6FF', fontFamily: FONT }}>{label}</div>
        {sub ? (
          <div style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.55)', fontFamily: FONT, marginTop: 2 }}>
            {sub}
          </div>
        ) : null}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function SelectRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${BORD}`, gap: 12 }}>
      <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: '#EFF6FF', fontFamily: FONT }}>{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: `1px solid ${BORD}`,
          borderRadius: 8,
          color: '#EFF6FF',
          fontFamily: FONT,
          fontSize: '0.8rem',
          padding: '5px 10px',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value} style={{ background: '#0F172A' }}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function LinkRow({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '14px 18px',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${BORD}`,
        cursor: 'pointer',
        gap: 12,
        transition: 'background 0.12s',
        textAlign: 'left',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#EFF6FF', fontFamily: FONT }}>{label}</div>
        {sub ? (
          <div style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.55)', fontFamily: FONT, marginTop: 2 }}>
            {sub}
          </div>
        ) : null}
      </div>
      <ChevronRight size={14} color="rgba(148,163,184,0.4)" />
    </button>
  );
}

function InfoRow({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '14px 18px', borderBottom: `1px solid ${BORD}`, gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#EFF6FF', fontFamily: FONT }}>{label}</div>
        {sub ? (
          <div style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.55)', fontFamily: FONT, marginTop: 2 }}>
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { resetPassword } = useAuth();
  const { user } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';
  const { enableDemoAccount } = getConfig();

  const [notifs, setNotifs] = useState({
    tripUpdates: true,
    newBookings: true,
    messages: true,
    promotions: false,
    prayerReminders: true,
    email: true,
    sms: true,
    push: true,
  });

  const [privacy, setPrivacy] = useState({
    showProfile: true,
    shareLocation: true,
    hidePhoto: false,
    dataAnalytics: false,
  });

  const [display, setDisplay] = useState<{
    language: Language;
    currency: string;
    theme: string;
    direction: string;
  }>({
    language,
    currency: 'JOD',
    theme: 'dark',
    direction: ar ? 'rtl' : 'ltr',
  });

  const toggle = <K extends keyof typeof notifs>(key: K) =>
    setNotifs(previous => ({ ...previous, [key]: !previous[key] }));

  const togglePrivacy = <K extends keyof typeof privacy>(key: K) =>
    setPrivacy(previous => ({ ...previous, [key]: !previous[key] }));

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast.error(ar ? 'لا يوجد بريد إلكتروني مرتبط بهذا الحساب.' : 'No email is associated with this account.');
      return;
    }

    const { error } = await resetPassword(user.email);
    if (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }

    toast.success(ar ? `تم إرسال رابط إعادة التعيين إلى ${user.email}` : `Reset link sent to ${user.email}`);
  };

  const handleExportData = () => {
    if (!user) {
      toast.error(ar ? 'يرجى تسجيل الدخول أولاً.' : 'Please sign in first.');
      return;
    }

    const payload = JSON.stringify(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        trips: user.trips,
        rating: user.rating,
        verificationLevel: user.verificationLevel,
        trustScore: user.trustScore,
        walletStatus: user.walletStatus,
        joinedAt: user.joinedAt,
        backendMode: user.backendMode,
      },
      null,
      2,
    );

    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'wasel-account-data.json';
    anchor.click();
    URL.revokeObjectURL(url);

    toast.success(ar ? 'تم تصدير بيانات الحساب.' : 'Account data exported.');
  };

  const sessionSummary = user
    ? `${ar ? 'جلسة نشطة واحدة على هذا الجهاز' : 'One active session on this device'} · ${user.backendMode === 'supabase' ? 'Supabase' : ar ? 'الوضع التجريبي' : 'Demo mode'}`
    : ar
      ? 'سجّل الدخول لعرض الجلسات النشطة'
      : 'Sign in to view active sessions';

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: FONT, direction: ar ? 'rtl' : 'ltr', paddingBottom: 80 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px 0' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#EFF6FF', fontFamily: FONT, marginBottom: 28 }}>
          {ar ? 'الإعدادات' : 'Settings'}
        </h1>

        <Section icon={<Bell size={16} />} title={ar ? 'الإشعارات' : 'Notifications'}>
          <ToggleRow label={ar ? 'تحديثات الرحلة' : 'Trip Updates'} sub={ar ? 'قبول، رفض، تأكيد' : 'Accept, cancel, confirm'} value={notifs.tripUpdates} onChange={() => toggle('tripUpdates')} />
          <ToggleRow label={ar ? 'حجوزات جديدة' : 'New Booking Requests'} sub={ar ? 'للسائقين فقط' : 'Drivers only'} value={notifs.newBookings} onChange={() => toggle('newBookings')} />
          <ToggleRow label={ar ? 'الرسائل' : 'Messages'} value={notifs.messages} onChange={() => toggle('messages')} />
          <ToggleRow label={ar ? 'تذكير الصلاة' : 'Prayer Time Reminders'} sub={ar ? 'على المسارات الطويلة' : 'On long-distance routes'} value={notifs.prayerReminders} onChange={() => toggle('prayerReminders')} />
          <ToggleRow label={ar ? 'العروض والخصومات' : 'Promotions & Offers'} value={notifs.promotions} onChange={() => toggle('promotions')} />
          <ToggleRow label={ar ? 'إشعارات Push' : 'Push Notifications'} value={notifs.push} onChange={() => toggle('push')} />
          <ToggleRow label={ar ? 'رسائل SMS' : 'SMS Alerts'} value={notifs.sms} onChange={() => toggle('sms')} />
          <ToggleRow label={ar ? 'البريد الإلكتروني' : 'Email Notifications'} value={notifs.email} onChange={() => toggle('email')} />
        </Section>

        <Section icon={<Globe size={16} />} title={ar ? 'العرض واللغة' : 'Display & Language'}>
          <SelectRow
            label={ar ? 'اللغة' : 'Language'}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'العربية' },
            ]}
            value={display.language}
            onChange={value => {
              const nextLanguage = (value === 'ar' ? 'ar' : 'en') as Language;
              setDisplay(previous => ({ ...previous, language: nextLanguage }));
              setLanguage(nextLanguage);
            }}
          />
          <SelectRow
            label={ar ? 'العملة' : 'Currency'}
            options={[
              { value: 'JOD', label: 'JOD - Jordanian Dinar' },
              { value: 'USD', label: 'USD - US Dollar' },
              { value: 'EUR', label: 'EUR - Euro' },
              { value: 'AED', label: 'AED - UAE Dirham' },
              { value: 'SAR', label: 'SAR - Saudi Riyal' },
            ]}
            value={display.currency}
            onChange={value => setDisplay(previous => ({ ...previous, currency: value }))}
          />
          <SelectRow
            label={ar ? 'السمة' : 'Theme'}
            options={[
              { value: 'dark', label: ar ? 'داكن' : 'Dark' },
              { value: 'system', label: ar ? 'النظام' : 'System' },
            ]}
            value={display.theme}
            onChange={value => setDisplay(previous => ({ ...previous, theme: value }))}
          />
        </Section>

        <Section icon={<Eye size={16} />} title={ar ? 'الخصوصية' : 'Privacy'}>
          <ToggleRow label={ar ? 'إظهار ملفي الشخصي' : 'Show Profile to Others'} sub={ar ? 'الركابون والسائقون' : 'Passengers & drivers'} value={privacy.showProfile} onChange={() => togglePrivacy('showProfile')} />
          <ToggleRow label={ar ? 'إخفاء الصورة الشخصية' : 'Hide Profile Photo'} sub={ar ? 'يظهر الاسم فقط' : 'Only name is shown'} value={privacy.hidePhoto} onChange={() => togglePrivacy('hidePhoto')} />
          <ToggleRow label={ar ? 'مشاركة الموقع المباشر' : 'Share Live Location'} sub={ar ? 'أثناء الرحلة فقط' : 'During active trips only'} value={privacy.shareLocation} onChange={() => togglePrivacy('shareLocation')} />
          <ToggleRow label={ar ? 'تحسين الخدمة بالبيانات' : 'Analytics & Improvement'} sub={ar ? 'بيانات مجهولة الهوية' : 'Anonymous usage data'} value={privacy.dataAnalytics} onChange={() => togglePrivacy('dataAnalytics')} />
        </Section>

        <Section icon={<Shield size={16} />} title={ar ? 'الأمان' : 'Security'}>
          <LinkRow
            label={ar ? 'تغيير كلمة المرور' : 'Change Password'}
            sub={user?.email || (ar ? 'يتطلب حسابًا مسجل الدخول' : 'Requires a signed-in account')}
            onClick={() => {
              void handlePasswordReset();
            }}
          />
          <InfoRow
            label={ar ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Auth (2FA)'}
            sub={
              isTwoFactorAvailable()
                ? ar
                  ? 'الواجهة جاهزة، لكن التحقق الخلفي لم يُفعّل بعد.'
                  : 'The device supports 2FA setup, but backend verification is not enabled yet.'
                : ar
                  ? 'غير متاحة على هذا الجهاز.'
                  : 'Unavailable on this device.'
            }
          />
          <InfoRow label={ar ? 'إدارة الجلسات النشطة' : 'Manage Active Sessions'} sub={sessionSummary} />
        </Section>

        <Section icon={<Palette size={16} />} title={ar ? 'الحساب' : 'Account'}>
          <LinkRow label={ar ? 'ملفي الشخصي' : 'Edit Profile'} onClick={() => nav('/app/profile')} />
          <LinkRow label={ar ? 'سياسة الخصوصية' : 'Privacy Policy'} onClick={() => nav('/app/privacy')} />
          <LinkRow label={ar ? 'شروط الخدمة' : 'Terms of Service'} onClick={() => nav('/app/terms')} />
          <LinkRow
            label={ar ? 'تصدير بياناتي' : 'Export My Data'}
            sub={
              enableDemoAccount
                ? ar
                  ? 'يشمل نسخة من بيانات الحساب الحالية'
                  : 'Downloads a snapshot of the current account data'
                : ar
                  ? 'نزّل بيانات حسابك الحالية بصيغة JSON'
                  : 'Download your current account data as JSON'
            }
            onClick={handleExportData}
          />
        </Section>

        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(148,163,184,0.3)', fontFamily: FONT, marginTop: 8 }}>
          Wasel v1.0.0 · wasel14.online
        </p>
      </div>
    </div>
  );
}
