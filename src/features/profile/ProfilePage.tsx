/**
 * ProfilePage - /app/profile
 */
import { type MutableRefObject, type ReactNode, useEffect, useRef } from 'react';
import {
  Bell,
  Car,
  CheckCircle,
  CreditCard,
  LogOut,
  Settings,
  Shield,
  Star,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { StakeholderSignalBanner } from '../../components/system/StakeholderSignalBanner';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { buildAuthPagePath } from '../../utils/authFlow';
import { getProfileInitials } from './profileUtils';
import {
  InsightCard as SharedInsightCard,
  QuickActionCard as SharedQuickActionCard,
  Row as SharedRow,
  Section as SharedSection,
  StatCard as SharedStatCard,
  VerificationBadge as SharedVerificationBadge,
} from './components/ProfilePageParts';
import {
  PROFILE_CYAN as CYAN,
  PROFILE_FONT as FONT,
  useProfilePageController,
} from './useProfilePageController';
import {
  ProfileDeleteConfirmDialog,
  ProfileHeroSection,
  ProfileQuickPhoneEditor,
  ProfileSignedOutState,
} from './components/ProfilePageSections';
import {
  ClarityBand,
  CoreExperienceBanner,
  PageShell,
  Protected,
  SectionHead,
} from '../shared/pageShared';

function showToast(message: string) {
  const element = document.createElement('div');
  element.textContent = message;
  Object.assign(element.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--wasel-service-card)',
    border: '1px solid var(--wasel-service-border)',
    color: 'var(--wasel-service-text)',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    zIndex: '9999',
    boxShadow: 'var(--wasel-shadow-md)',
  });
  document.body.appendChild(element);
  setTimeout(() => element.remove(), 2800);
}

export default function ProfilePage() {
  const { user, signOut } = useLocalAuth();
  const { updateProfile } = useAuth();
  const { language } = useLanguage();
  const nav = useIframeSafeNavigate();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const ar = language === 'ar';
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  if (!user) {
    return <ProfileSignedOutState ar={ar} onSignIn={() => nav(buildAuthPagePath('signin'))} />;
  }

  return (
    <ProfilePageContent
      user={user}
      signOut={signOut}
      updateProfile={updateProfile}
      ar={ar}
      nav={nav}
      isSupported={isSupported}
      permission={permission}
      requestPermission={requestPermission}
      photoInputRef={photoInputRef}
    />
  );
}

interface ProfilePageContentProps {
  user: NonNullable<ReturnType<typeof useLocalAuth>['user']>;
  signOut: ReturnType<typeof useLocalAuth>['signOut'];
  updateProfile: ReturnType<typeof useAuth>['updateProfile'];
  ar: boolean;
  nav: ReturnType<typeof useIframeSafeNavigate>;
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  photoInputRef: MutableRefObject<HTMLInputElement | null>;
}

type ProfileRowConfig = {
  key: string;
  label: string;
  value?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  danger?: boolean;
  onClick?: () => void;
};

function renderRows(rows: ProfileRowConfig[]) {
  return rows.map((row) => (
    <SharedRow
      key={row.key}
      label={row.label}
      value={row.value}
      icon={row.icon}
      badge={row.badge}
      danger={row.danger}
      onClick={row.onClick}
    />
  ));
}

function ProfilePageContent({
  user,
  signOut,
  updateProfile,
  ar,
  nav,
  isSupported,
  permission,
  requestPermission,
  photoInputRef,
}: ProfilePageContentProps) {
  const {
    editingField,
    handleDeletionContinue,
    handleExportData,
    handleNotificationSetup,
    handlePhotoSelection,
    handleSaveName,
    handleSavePhone,
    handleSignOut,
    joinedText,
    nameInput,
    permissionStatus,
    phoneInput,
    profileCompleteness,
    quickActions,
    roleLabel,
    savingField,
    setEditingField,
    setNameInput,
    setPhoneInput,
    setShowDeleteConfirm,
    showDeleteConfirm,
    trustTier,
    verificationItems,
    walletStatus,
  } = useProfilePageController({
    user,
    ar,
    nav,
    updateProfile,
    notificationSupport: {
      isSupported,
      permission,
      requestPermission,
    },
    showToast,
    signOut,
  });

  const initials = getProfileInitials(user.name);

  useEffect(() => {
    if (editingField !== 'name') setNameInput(user.name ?? '');
    if (editingField !== 'phone') setPhoneInput(user.phone ?? '');
  }, [editingField, setNameInput, setPhoneInput, user.name, user.phone]);

  const trustVerificationRows: ProfileRowConfig[] = [
    ...verificationItems.map((item) => ({
      key: item.label,
      label: item.label,
      icon: <Shield size={15} />,
      badge: (
        <span
          style={{
            fontSize: '0.65rem',
            color: item.color,
            background: `${item.color}1A`,
            padding: '3px 8px',
            borderRadius: 999,
            fontFamily: FONT,
            fontWeight: 700,
          }}
        >
          {item.status}
        </span>
      ),
      onClick: () => nav('/app/settings?section=account'),
    })),
    {
      key: 'operational-standing',
      label: ar ? 'الوضع التشغيلي' : 'Operational standing',
      value: ar ? `${trustTier} - عضو منذ ${joinedText}` : `${trustTier} - Member since ${joinedText}`,
      icon: <CheckCircle size={15} />,
      onClick: () => nav('/app/my-trips'),
    },
  ];

  const accountRows: ProfileRowConfig[] = [
    {
      key: 'phone',
      label: ar ? 'الهاتف' : 'Phone number',
      value: user.phone ?? (ar ? 'غير مضاف' : 'Not added'),
      icon: <span>📱</span>,
      onClick: () => nav('/app/settings?section=phone'),
    },
    {
      key: 'id-verification',
      label: ar ? 'التحقق من الهوية' : 'ID Verification',
      value: ar ? 'سند eKYC' : 'Sanad eKYC',
      icon: <Shield size={15} />,
      badge: <SharedVerificationBadge level={user.verificationLevel ?? 'level_0'} ar={ar} accent={CYAN} />,
      onClick: () => nav('/app/trust'),
    },
    {
      key: 'language',
      label: ar ? 'اللغة' : 'Language',
      value: ar ? 'العربية' : 'English',
      icon: <span>🌐</span>,
      onClick: () => nav('/app/settings?section=account'),
    },
    {
      key: 'notifications',
      label: ar ? 'الإشعارات' : 'Notifications',
      value: permissionStatus.label,
      icon: <Bell size={15} />,
      badge: (
        <span
          style={{
            fontSize: '0.65rem',
            color: permissionStatus.color,
            background: `${permissionStatus.color}1A`,
            padding: '3px 8px',
            borderRadius: 999,
            fontFamily: FONT,
            fontWeight: 700,
          }}
        >
          {permissionStatus.label}
        </span>
      ),
      onClick: () => {
        void handleNotificationSetup();
      },
    },
  ];

  const driverRows: ProfileRowConfig[] = [
    {
      key: 'vehicle',
      label: ar ? 'مركبتي' : 'My Vehicle',
      value: ar ? 'تويوتا كورولا 2021' : 'Toyota Corolla 2021',
      icon: <Car size={15} />,
      onClick: () => nav('/app/settings?section=account'),
    },
    {
      key: 'documents',
      label: ar ? 'المستندات' : 'Documents',
      value: ar ? 'رخصة + تأمين + تسجيل' : 'License · Insurance · Registration',
      icon: <span>🪪</span>,
      badge: <CheckCircle size={14} color="#22C55E" />,
      onClick: () => nav('/app/trust'),
    },
    {
      key: 'earnings',
      label: ar ? 'الأرباح' : 'Earnings',
      icon: <span>💰</span>,
      onClick: () => nav('/app/wallet'),
    },
  ];

  const preferenceRows: ProfileRowConfig[] = [
    {
      key: 'gender-preference',
      label: ar ? 'تفضيل الجنس' : 'Gender Preference',
      value: ar ? 'مختلط (افتراضي)' : 'Mixed (default)',
      icon: <span>⚙️</span>,
      onClick: () => nav('/app/settings?section=account'),
    },
    {
      key: 'currency',
      label: ar ? 'العملة' : 'Currency',
      value: 'JOD',
      icon: <span>💱</span>,
      onClick: () => nav('/app/settings?section=account'),
    },
    {
      key: 'advanced-settings',
      label: ar ? 'إعدادات متقدمة' : 'Advanced Settings',
      icon: <Settings size={15} />,
      onClick: () => nav('/app/settings?section=account'),
    },
  ];

  const securityRows: ProfileRowConfig[] = [
    {
      key: 'password',
      label: ar ? 'تغيير كلمة المرور' : 'Change Password',
      icon: <span>🔐</span>,
      onClick: () => nav('/app/settings?section=security'),
    },
    {
      key: 'two-factor',
      label: ar ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Auth (2FA)',
      icon: <span>🛡️</span>,
      badge: (
        <span
          style={{
            fontSize: '0.65rem',
            color: '#F59E0B',
            background: 'rgba(245,158,11,0.12)',
            padding: '2px 7px',
            borderRadius: 999,
            fontFamily: FONT,
            fontWeight: 700,
          }}
        >
          {user.twoFactorEnabled ? (ar ? 'مفعل' : 'On') : (ar ? 'غير مفعل' : 'Off')}
        </span>
      ),
      onClick: () => nav('/app/settings?section=security'),
    },
    {
      key: 'sessions',
      label: ar ? 'الجلسات النشطة' : 'Active Sessions',
      icon: <span>🖥️</span>,
      onClick: () => nav('/app/settings?section=security'),
    },
  ];

  const legalRows: ProfileRowConfig[] = [
    {
      key: 'privacy',
      label: ar ? 'سياسة الخصوصية' : 'Privacy Policy',
      icon: <span>📄</span>,
      onClick: () => nav('/app/privacy'),
    },
    {
      key: 'terms',
      label: ar ? 'شروط الخدمة' : 'Terms of Service',
      icon: <span>📘</span>,
      onClick: () => nav('/app/terms'),
    },
  ];

  const dangerRows: ProfileRowConfig[] = [
    {
      key: 'export-data',
      label: ar ? 'تصدير بياناتي' : 'Export My Data',
      icon: <span>⬇️</span>,
      onClick: handleExportData,
    },
    {
      key: 'delete-account',
      label: ar ? 'طلب حذف الحساب' : 'Request Account Deletion',
      icon: <span>🗑️</span>,
      danger: true,
      onClick: () => setShowDeleteConfirm(true),
    },
    {
      key: 'sign-out',
      label: ar ? 'تسجيل الخروج' : 'Sign Out',
      icon: <LogOut size={15} />,
      danger: true,
      onClick: () => {
        void handleSignOut();
      },
    },
  ];

  return (
    <Protected>
      <PageShell>
        <div style={{ maxWidth: 760, margin: '0 auto', fontFamily: FONT, direction: ar ? 'rtl' : 'ltr', paddingBottom: 48 }}>
          <SectionHead
            emoji="👤"
            title="My Profile"
            titleAr="ملفي"
            sub={ar ? 'الهوية والثقة والإعدادات في مكان واحد.' : 'Identity, trust, and settings in one place.'}
            color={CYAN}
          />

          <CoreExperienceBanner
            title={ar ? 'جاهزية الحساب واضحة' : 'Account readiness at a glance'}
            detail={ar ? 'أهم الإشارات بدون تفاصيل مشتتة.' : 'The most important account signals without extra noise.'}
            tone={CYAN}
          />

          <ProfileHeroSection
            user={user}
            ar={ar}
            initials={initials}
            roleLabel={roleLabel}
            walletStatus={walletStatus}
            trustTier={trustTier}
            joinedText={joinedText}
            profileCompleteness={profileCompleteness}
            permissionStatus={permissionStatus}
            editingField={editingField}
            nameInput={nameInput}
            savingField={savingField}
            photoInputRef={photoInputRef}
            onNameInputChange={setNameInput}
            onNameEditStart={() => {
              setNameInput(user.name);
              setEditingField('name');
            }}
            onNameEditCancel={() => setEditingField(null)}
            onNameSave={handleSaveName}
            onPhotoSelection={handlePhotoSelection}
          />

          {Boolean((globalThis as { __showStakeholderBanner?: boolean }).__showStakeholderBanner) && <div style={{ marginBottom: 24 }}>
            <StakeholderSignalBanner
              dir={ar ? 'rtl' : 'ltr'}
              eyebrow={ar ? 'واصل الهوية' : 'Wasel identity'}
              title={
                ar
                  ? 'الملف الشخصي هو نقطة الربط بين الهوية والثقة والتشغيل'
                  : 'Profile is now the shared handoff point for identity, trust, and operations'
              }
              detail={
                ar
                  ? 'هذا العرض يلخص أهم مؤشرات الجاهزية للحساب.'
                  : 'This surface summarizes the account signals that matter before the next action.'
              }
              stakeholders={[
                { label: ar ? 'الثقة' : 'Trust', value: `${user.trustScore}/100`, tone: 'green' },
                { label: ar ? 'الرحلات' : 'Trips', value: String(user.trips ?? 0), tone: 'teal' },
                { label: ar ? 'التنبيهات' : 'Alerts', value: permissionStatus.label, tone: 'blue' },
                { label: ar ? 'المحفظة' : 'Wallet', value: walletStatus.label, tone: 'amber' },
              ]}
              statuses={[
                { label: ar ? 'اكتمال الحساب' : 'Profile completeness', value: `${profileCompleteness}%`, tone: profileCompleteness >= 80 ? 'green' : 'amber' },
                { label: ar ? 'التحقق' : 'Verification', value: trustTier, tone: user.verified || user.sanadVerified ? 'green' : 'amber' },
                { label: ar ? 'المصادقة الثنائية' : '2FA', value: user.twoFactorEnabled ? (ar ? 'مفعلة' : 'Enabled') : (ar ? 'غير مفعلة' : 'Disabled'), tone: user.twoFactorEnabled ? 'green' : 'rose' },
              ]}
              lanes={[
                {
                  label: ar ? 'مسار الهوية' : 'Identity lane',
                  detail: ar
                    ? 'الاسم والهاتف والتحقق تحدد الطبقة الأولى من الثقة.'
                    : 'Name, phone, and verification define the first layer of trust.',
                },
                {
                  label: ar ? 'مسار التشغيل' : 'Operations lane',
                  detail: ar
                    ? 'الرحلات والتقييم والمحفظة تظهر هنا بوضوح.'
                    : 'Trips, rating, and wallet health stay visible here.',
                },
                {
                  label: ar ? 'مسار الدعم' : 'Support lane',
                  detail: ar
                    ? 'الإشعارات والإعدادات السريعة تقلل وقت حل المشاكل.'
                    : 'Alerts and quick settings reduce resolution time.',
                },
              ]}
            />
          </div>}

          <ClarityBand
            title={ar ? 'لقطة سريعة' : 'Quick status'}
            detail={ar ? 'البيانات الأساسية التي تحدد جاهزية الحساب.' : 'The core signals that define account readiness.'}
            tone={CYAN}
            items={[
              { label: ar ? 'الثقة' : 'Trust', value: `${user.trustScore}/100` },
              { label: ar ? 'الاكتمال' : 'Profile', value: `${profileCompleteness}%` },
              { label: ar ? 'المحفظة' : 'Wallet', value: walletStatus.label },
            ]}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
            <SharedStatCard label={ar ? 'الرحلات' : 'Trips'} value={user.trips ?? 0} icon={<Car size={16} />} color={CYAN} />
            <SharedStatCard label={ar ? 'التقييم' : 'Rating'} value={(user.rating ?? 5).toFixed(1)} icon={<Star size={16} />} color="#F59E0B" />
            <SharedStatCard label={ar ? 'الثقة' : 'Trust'} value={`${user.trustScore}/100`} icon={<Shield size={16} />} color="#22C55E" />
            <SharedStatCard label={ar ? 'الرصيد' : 'Balance'} value={`JOD ${(user.balance ?? 0).toFixed(1)}`} icon={<CreditCard size={16} />} color="#A78BFA" />
          </div>

          <SharedSection title={ar ? 'إجراءات سريعة' : 'Quick actions'}>
            <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {quickActions.map((action) => (
                <SharedQuickActionCard
                  key={action.label}
                  label={action.label}
                  detail={action.detail}
                  icon={action.icon}
                  color={action.color}
                  onClick={action.onClick}
                />
              ))}
            </div>
          </SharedSection>

          <SharedSection title={ar ? 'نظرة عامة' : 'Account overview'}>
            <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <SharedInsightCard
                label={ar ? 'اكتمال الحساب' : 'Profile completeness'}
                value={`${profileCompleteness}%`}
                detail={ar ? 'الحساب المكتمل يرفع الثقة.' : 'A more complete account improves trust.'}
                color={profileCompleteness >= 80 ? '#22C55E' : CYAN}
              />
              <SharedInsightCard
                label={ar ? 'مستوى التحقق' : 'Verification level'}
                value={(user.verificationLevel ?? 'level_0').replace('level_', 'L')}
                detail={ar ? 'يعتمد على البريد والهاتف والهوية.' : 'Driven by email, phone, and identity.'}
                color={user.verified || user.sanadVerified ? CYAN : '#F59E0B'}
              />
              <SharedInsightCard
                label={ar ? 'حالة المحفظة' : 'Wallet status'}
                value={walletStatus.label}
                detail={ar ? 'يوضح جاهزية الدفع والتحويل.' : 'Shows whether payments are ready.'}
                color={walletStatus.color}
              />
              <SharedInsightCard
                label={ar ? 'التنبيهات' : 'Alerts'}
                value={permissionStatus.label}
                detail={ar ? 'تنبيهات الرحلات والحساب على هذا الجهاز.' : 'Trip and account alerts for this device.'}
                color={permissionStatus.color}
              />
            </div>
          </SharedSection>

          <SharedSection title={ar ? 'الثقة والتحقق' : 'Trust & Verification'}>
            {renderRows(trustVerificationRows)}
          </SharedSection>

          <SharedSection title={ar ? 'تعديل سريع' : 'Quick edits'}>
            <ProfileQuickPhoneEditor
              ar={ar}
              phoneInput={phoneInput}
              editingField={editingField}
              savingField={savingField}
              onPhoneInputChange={setPhoneInput}
              onPhoneFocus={() => setEditingField('phone')}
              onPhoneSave={handleSavePhone}
              onPhoneCancel={() => setEditingField(null)}
            />
          </SharedSection>

          <SharedSection title={ar ? 'الحساب' : 'Account'}>
            {renderRows(accountRows)}
          </SharedSection>

          {(user.role === 'driver' || user.role === 'both') && (
            <SharedSection title={ar ? 'وضع السائق' : 'Driver mode'}>
              {renderRows(driverRows)}
            </SharedSection>
          )}

          <SharedSection title={ar ? 'التفضيلات' : 'Preferences'}>
            {renderRows(preferenceRows)}
          </SharedSection>

          <SharedSection title={ar ? 'الأمان' : 'Security'}>
            {renderRows(securityRows)}
          </SharedSection>

          <SharedSection title={ar ? 'القانوني' : 'Legal'}>
            {renderRows(legalRows)}
          </SharedSection>

          <SharedSection title={ar ? 'منطقة الخطر' : 'Danger Zone'}>
            {renderRows(dangerRows)}
          </SharedSection>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--wasel-service-muted)', fontFamily: FONT }}>
            {user.joinedAt
              ? (ar ? `عضو منذ ${joinedText}` : `Member since ${joinedText}`)
              : (ar ? 'عضو واصل' : 'Wasel member')}
          </p>
        </div>
      </PageShell>

      {showDeleteConfirm ? (
        <ProfileDeleteConfirmDialog
          ar={ar}
          onCancel={() => setShowDeleteConfirm(false)}
          onContinue={handleDeletionContinue}
        />
      ) : null}
    </Protected>
  );
}
