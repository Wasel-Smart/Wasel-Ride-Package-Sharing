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
  PROFILE_BG as BG,
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

function showToast(message: string) {
  const element = document.createElement('div');
  element.textContent = message;
  Object.assign(element.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#0A1628',
    border: '1px solid rgba(22,199,242,0.3)',
    color: '#EFF6FF',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    zIndex: '9999',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
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
      value: user.phone ?? (ar ? 'لم يُضف بعد' : 'Not added'),
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
      label: ar ? 'سيارتي' : 'My Vehicle',
      value: ar ? 'تويوتا كورولا 2021' : 'Toyota Corolla 2021',
      icon: <Car size={15} />,
      onClick: () => nav('/app/settings?section=account'),
    },
    {
      key: 'documents',
      label: ar ? 'المستندات' : 'Documents',
      value: ar ? 'رخصة + تأمين + ترخيص' : 'License · Insurance · Registration',
      icon: <span>📄</span>,
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
      icon: <span>👥</span>,
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
      label: ar ? 'الإعدادات المتقدمة' : 'Advanced Settings',
      icon: <Settings size={15} />,
      onClick: () => nav('/app/settings?section=account'),
    },
  ];

  const securityRows: ProfileRowConfig[] = [
    {
      key: 'password',
      label: ar ? 'تغيير كلمة المرور' : 'Change Password',
      icon: <span>🔑</span>,
      onClick: () => nav('/app/settings?section=security'),
    },
    {
      key: 'two-factor',
      label: ar ? 'التحقق الثنائي (2FA)' : 'Two-Factor Auth (2FA)',
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
      label: ar ? 'الأجهزة المسجلة' : 'Active Sessions',
      icon: <span>💻</span>,
      onClick: () => nav('/app/settings?section=security'),
    },
  ];

  const legalRows: ProfileRowConfig[] = [
    {
      key: 'privacy',
      label: ar ? 'سياسة الخصوصية' : 'Privacy Policy',
      icon: <span>📋</span>,
      onClick: () => nav('/app/privacy'),
    },
    {
      key: 'terms',
      label: ar ? 'شروط الخدمة' : 'Terms of Service',
      icon: <span>📜</span>,
      onClick: () => nav('/app/terms'),
    },
  ];

  const dangerRows: ProfileRowConfig[] = [
    {
      key: 'export-data',
      label: ar ? 'تصدير بياناتي' : 'Export My Data',
      icon: <span>📦</span>,
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
    <div style={{ minHeight: '100vh', background: BG, fontFamily: FONT, direction: ar ? 'rtl' : 'ltr', paddingBottom: 80 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
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
            eyebrow={ar ? 'واصل · تواصل الهوية' : 'Wasel · identity comms'}
            title={
              ar
                ? 'الملف الشخصي أصبح نقطة تنسيق بين الهوية والثقة والتشغيل'
                : 'Profile now acts as the shared handoff point between identity, trust, and operations'
            }
            detail={
              ar
                ? 'هذه الصفحة لم تعد مجرد معلومات شخصية. هي الآن ملخص واضح لما يراه المستخدم والدعم والثقة والتشغيل عن جاهزية الحساب.'
                : 'This page is no longer just personal info. It now summarizes what the user, support, trust, and operations all need to see about account readiness.'
            }
            stakeholders={[
              { label: ar ? 'الثقة' : 'Trust', value: `${user.trustScore}/100`, tone: 'green' },
              { label: ar ? 'الرحلات' : 'Trips', value: String(user.trips ?? 0), tone: 'teal' },
              { label: ar ? 'الإشعارات' : 'Alerts', value: permissionStatus.label, tone: 'blue' },
              { label: ar ? 'المحفظة' : 'Wallet', value: walletStatus.label, tone: 'amber' },
            ]}
            statuses={[
              { label: ar ? 'اكتمال الملف' : 'Profile completeness', value: `${profileCompleteness}%`, tone: profileCompleteness >= 80 ? 'green' : 'amber' },
              { label: ar ? 'التحقق' : 'Verification', value: trustTier, tone: user.verified || user.sanadVerified ? 'green' : 'amber' },
              { label: ar ? 'الحماية الثنائية' : '2FA', value: user.twoFactorEnabled ? (ar ? 'مفعلة' : 'Enabled') : (ar ? 'غير مفعلة' : 'Disabled'), tone: user.twoFactorEnabled ? 'green' : 'rose' },
            ]}
            lanes={[
              {
                label: ar ? 'مسار الهوية' : 'Identity lane',
                detail: ar
                  ? 'الاسم والهاتف والتحقق وصورة الملف كلها تصنع الانطباع الأول للحساب.'
                  : 'Name, phone, verification, and profile media define the account’s first layer of trust.',
              },
              {
                label: ar ? 'مسار التشغيل' : 'Operations lane',
                detail: ar
                  ? 'الرحلات والتقييم والمحفظة تظهر هنا حتى تبقى الجاهزية مرئية قبل أي نشاط جديد.'
                  : 'Trips, rating, and wallet health stay visible here so readiness is clear before the next action.',
              },
              {
                label: ar ? 'مسار الدعم' : 'Support lane',
                detail: ar
                  ? 'الإشعارات والإعدادات السريعة تقلل الوقت اللازم لحل مشاكل الحساب.'
                  : 'Alerts and quick settings reduce the time it takes to resolve account issues.',
              },
            ]}
          />
        </div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          <SharedStatCard label={ar ? 'رحلات' : 'Trips'} value={user.trips ?? 0} icon={<Car size={16} />} color={CYAN} />
          <SharedStatCard label={ar ? 'تقييم' : 'Rating'} value={(user.rating ?? 5).toFixed(1)} icon={<Star size={16} />} color="#F59E0B" />
          <SharedStatCard label={ar ? 'الثقة' : 'Trust'} value={`${user.trustScore}/100`} icon={<Shield size={16} />} color="#22C55E" />
          <SharedStatCard label={ar ? 'الرصيد' : 'Balance'} value={`JOD ${(user.balance ?? 0).toFixed(1)}`} icon={<CreditCard size={16} />} color="#A78BFA" />
        </div>

        <SharedSection title={ar ? 'مركز الحساب' : 'Quick actions'}>
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

        <SharedSection title={ar ? 'صحة الحساب' : 'Account overview'}>
          <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <SharedInsightCard
              label={ar ? 'اكتمال الملف' : 'Profile completeness'}
              value={`${profileCompleteness}%`}
              detail={ar ? 'كلما اكتمل الملف تحسنت الثقة وسهُل الحجز.' : 'A more complete account improves trust and booking confidence.'}
              color={profileCompleteness >= 80 ? '#22C55E' : CYAN}
            />
            <SharedInsightCard
              label={ar ? 'مستوى التحقق' : 'Verification level'}
              value={(user.verificationLevel ?? 'level_0').replace('level_', 'L')}
              detail={ar ? 'مرتبط بالبريد والهاتف والهوية أو سند.' : 'Driven by email, phone, and identity completion.'}
              color={user.verified || user.sanadVerified ? CYAN : '#F59E0B'}
            />
            <SharedInsightCard
              label={ar ? 'حالة المحفظة' : 'Wallet status'}
              value={walletStatus.label}
              detail={ar ? 'يعكس جاهزية الدفع والتحصيل داخل واصل.' : 'Shows whether payments and payouts are ready to flow.'}
              color={walletStatus.color}
            />
            <SharedInsightCard
              label={ar ? 'التنبيهات' : 'Alerts'}
              value={permissionStatus.label}
              detail={ar ? 'إشعارات الرحلات والطرود والتحديثات الحرجة.' : 'Critical ride, package, and account alerts for this device.'}
              color={permissionStatus.color}
            />
          </div>
        </SharedSection>

        <SharedSection title={ar ? 'الثقة والتحقق' : 'Trust & Verification'}>
          {renderRows(trustVerificationRows)}
        </SharedSection>

        <SharedSection title={ar ? 'تعديلات سريعة' : 'Quick Edits'}>
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
          <SharedSection title={ar ? 'وضع السائق' : 'Driver Mode'}>
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

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(148,163,184,0.35)', fontFamily: FONT }}>
          {user.joinedAt
            ? (ar ? `عضو منذ ${joinedText}` : `Member since ${joinedText}`)
            : (ar ? 'عضو في واصل' : 'Wasel member')}
        </p>
      </div>

      {showDeleteConfirm ? (
        <ProfileDeleteConfirmDialog
          ar={ar}
          onCancel={() => setShowDeleteConfirm(false)}
          onContinue={handleDeletionContinue}
        />
      ) : null}
    </div>
  );
}

