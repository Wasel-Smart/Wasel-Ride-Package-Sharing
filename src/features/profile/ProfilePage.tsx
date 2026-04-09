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
    border: '1px solid rgba(71,183,230,0.3)',
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
      label: ar ? '????? ????????' : 'Operational standing',
      value: ar ? `${trustTier} - ??? ??? ${joinedText}` : `${trustTier} - Member since ${joinedText}`,
      icon: <CheckCircle size={15} />,
      onClick: () => nav('/app/my-trips'),
    },
  ];

  const accountRows: ProfileRowConfig[] = [
    {
      key: 'phone',
      label: ar ? '??????' : 'Phone number',
      value: user.phone ?? (ar ? '?? ???? ???' : 'Not added'),
      icon: <span>??</span>,
      onClick: () => nav('/app/settings?section=phone'),
    },
    {
      key: 'id-verification',
      label: ar ? '?????? ?? ??????' : 'ID Verification',
      value: ar ? '??? eKYC' : 'Sanad eKYC',
      icon: <Shield size={15} />,
      badge: <SharedVerificationBadge level={user.verificationLevel ?? 'level_0'} ar={ar} accent={CYAN} />,
      onClick: () => nav('/app/trust'),
    },
    {
      key: 'language',
      label: ar ? '?????' : 'Language',
      value: ar ? '???????' : 'English',
      icon: <span>??</span>,
      onClick: () => nav('/app/settings?section=account'),
    },
    {
      key: 'notifications',
      label: ar ? '?????????' : 'Notifications',
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
      label: ar ? '??????' : 'My Vehicle',
      value: ar ? '?????? ?????? 2021' : 'Toyota Corolla 2021',
      icon: <Car size={15} />,
      onClick: () => nav('/app/settings?section=account'),
    },
    {
      key: 'documents',
      label: ar ? '?????????' : 'Documents',
      value: ar ? '???? + ????? + ?????' : 'License � Insurance � Registration',
      icon: <span>??</span>,
      badge: <CheckCircle size={14} color="#22C55E" />,
      onClick: () => nav('/app/trust'),
    },
    {
      key: 'earnings',
      label: ar ? '???????' : 'Earnings',
      icon: <span>??</span>,
      onClick: () => nav('/app/wallet'),
    },
  ];

  const preferenceRows: ProfileRowConfig[] = [
    {
      key: 'gender-preference',
      label: ar ? '????? ?????' : 'Gender Preference',
      value: ar ? '????? (???????)' : 'Mixed (default)',
      icon: <span>??</span>,
      onClick: () => nav('/app/settings?section=account'),
    },
    {
      key: 'currency',
      label: ar ? '??????' : 'Currency',
      value: 'JOD',
      icon: <span>??</span>,
      onClick: () => nav('/app/settings?section=account'),
    },
    {
      key: 'advanced-settings',
      label: ar ? '????????? ????????' : 'Advanced Settings',
      icon: <Settings size={15} />,
      onClick: () => nav('/app/settings?section=account'),
    },
  ];

  const securityRows: ProfileRowConfig[] = [
    {
      key: 'password',
      label: ar ? '????? ???? ??????' : 'Change Password',
      icon: <span>??</span>,
      onClick: () => nav('/app/settings?section=security'),
    },
    {
      key: 'two-factor',
      label: ar ? '?????? ??????? (2FA)' : 'Two-Factor Auth (2FA)',
      icon: <span>???</span>,
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
          {user.twoFactorEnabled ? (ar ? '????' : 'On') : (ar ? '??? ????' : 'Off')}
        </span>
      ),
      onClick: () => nav('/app/settings?section=security'),
    },
    {
      key: 'sessions',
      label: ar ? '??????? ???????' : 'Active Sessions',
      icon: <span>??</span>,
      onClick: () => nav('/app/settings?section=security'),
    },
  ];

  const legalRows: ProfileRowConfig[] = [
    {
      key: 'privacy',
      label: ar ? '????? ????????' : 'Privacy Policy',
      icon: <span>??</span>,
      onClick: () => nav('/app/privacy'),
    },
    {
      key: 'terms',
      label: ar ? '???? ??????' : 'Terms of Service',
      icon: <span>??</span>,
      onClick: () => nav('/app/terms'),
    },
  ];

  const dangerRows: ProfileRowConfig[] = [
    {
      key: 'export-data',
      label: ar ? '????? ???????' : 'Export My Data',
      icon: <span>??</span>,
      onClick: handleExportData,
    },
    {
      key: 'delete-account',
      label: ar ? '??? ??? ??????' : 'Request Account Deletion',
      icon: <span>???</span>,
      danger: true,
      onClick: () => setShowDeleteConfirm(true),
    },
    {
      key: 'sign-out',
      label: ar ? '????? ??????' : 'Sign Out',
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
            eyebrow={ar ? '???? � ????? ??????' : 'Wasel � identity comms'}
            title={
              ar
                ? '????? ?????? ???? ???? ????? ??? ?????? ?????? ????????'
                : 'Profile now acts as the shared handoff point between identity, trust, and operations'
            }
            detail={
              ar
                ? '??? ?????? ?? ??? ???? ??????? ?????. ?? ???? ???? ???? ??? ???? ???????? ?????? ?????? ???????? ?? ?????? ??????.'
                : 'This page is no longer just personal info. It now summarizes what the user, support, trust, and operations all need to see about account readiness.'
            }
            stakeholders={[
              { label: ar ? '?????' : 'Trust', value: `${user.trustScore}/100`, tone: 'green' },
              { label: ar ? '???????' : 'Trips', value: String(user.trips ?? 0), tone: 'teal' },
              { label: ar ? '?????????' : 'Alerts', value: permissionStatus.label, tone: 'blue' },
              { label: ar ? '???????' : 'Wallet', value: walletStatus.label, tone: 'amber' },
            ]}
            statuses={[
              { label: ar ? '?????? ?????' : 'Profile completeness', value: `${profileCompleteness}%`, tone: profileCompleteness >= 80 ? 'green' : 'amber' },
              { label: ar ? '??????' : 'Verification', value: trustTier, tone: user.verified || user.sanadVerified ? 'green' : 'amber' },
              { label: ar ? '??????? ????????' : '2FA', value: user.twoFactorEnabled ? (ar ? '?????' : 'Enabled') : (ar ? '??? ?????' : 'Disabled'), tone: user.twoFactorEnabled ? 'green' : 'rose' },
            ]}
            lanes={[
              {
                label: ar ? '???? ??????' : 'Identity lane',
                detail: ar
                  ? '????? ??????? ??????? ????? ????? ???? ???? ???????? ????? ??????.'
                  : 'Name, phone, verification, and profile media define the account뭩 first layer of trust.',
              },
              {
                label: ar ? '???? ???????' : 'Operations lane',
                detail: ar
                  ? '??????? ???????? ???????? ???? ??? ??? ???? ???????? ????? ??? ?? ???? ????.'
                  : 'Trips, rating, and wallet health stay visible here so readiness is clear before the next action.',
              },
              {
                label: ar ? '???? ?????' : 'Support lane',
                detail: ar
                  ? '????????? ?????????? ??????? ???? ????? ?????? ??? ????? ??????.'
                  : 'Alerts and quick settings reduce the time it takes to resolve account issues.',
              },
            ]}
          />
        </div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          <SharedStatCard label={ar ? '?????' : 'Trips'} value={user.trips ?? 0} icon={<Car size={16} />} color={CYAN} />
          <SharedStatCard label={ar ? '?????' : 'Rating'} value={(user.rating ?? 5).toFixed(1)} icon={<Star size={16} />} color="#F59E0B" />
          <SharedStatCard label={ar ? '?????' : 'Trust'} value={`${user.trustScore}/100`} icon={<Shield size={16} />} color="#22C55E" />
          <SharedStatCard label={ar ? '??????' : 'Balance'} value={`JOD ${(user.balance ?? 0).toFixed(1)}`} icon={<CreditCard size={16} />} color="#A78BFA" />
        </div>

        <SharedSection title={ar ? '???? ??????' : 'Quick actions'}>
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

        <SharedSection title={ar ? '??? ??????' : 'Account overview'}>
          <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <SharedInsightCard
              label={ar ? '?????? ?????' : 'Profile completeness'}
              value={`${profileCompleteness}%`}
              detail={ar ? '???? ????? ????? ????? ????? ????? ?????.' : 'A more complete account improves trust and booking confidence.'}
              color={profileCompleteness >= 80 ? '#22C55E' : CYAN}
            />
            <SharedInsightCard
              label={ar ? '????? ??????' : 'Verification level'}
              value={(user.verificationLevel ?? 'level_0').replace('level_', 'L')}
              detail={ar ? '????? ??????? ??????? ??????? ?? ???.' : 'Driven by email, phone, and identity completion.'}
              color={user.verified || user.sanadVerified ? CYAN : '#F59E0B'}
            />
            <SharedInsightCard
              label={ar ? '???? ???????' : 'Wallet status'}
              value={walletStatus.label}
              detail={ar ? '???? ?????? ????? ???????? ???? ????.' : 'Shows whether payments and payouts are ready to flow.'}
              color={walletStatus.color}
            />
            <SharedInsightCard
              label={ar ? '?????????' : 'Alerts'}
              value={permissionStatus.label}
              detail={ar ? '??????? ??????? ??????? ?????????? ??????.' : 'Critical ride, package, and account alerts for this device.'}
              color={permissionStatus.color}
            />
          </div>
        </SharedSection>

        <SharedSection title={ar ? '????? ???????' : 'Trust & Verification'}>
          {renderRows(trustVerificationRows)}
        </SharedSection>

        <SharedSection title={ar ? '??????? ?????' : 'Quick Edits'}>
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

        <SharedSection title={ar ? '??????' : 'Account'}>
          {renderRows(accountRows)}
        </SharedSection>

        {(user.role === 'driver' || user.role === 'both') && (
          <SharedSection title={ar ? '??? ??????' : 'Driver Mode'}>
            {renderRows(driverRows)}
          </SharedSection>
        )}

        <SharedSection title={ar ? '?????????' : 'Preferences'}>
          {renderRows(preferenceRows)}
        </SharedSection>

        <SharedSection title={ar ? '??????' : 'Security'}>
          {renderRows(securityRows)}
        </SharedSection>

        <SharedSection title={ar ? '????????' : 'Legal'}>
          {renderRows(legalRows)}
        </SharedSection>

        <SharedSection title={ar ? '????? ?????' : 'Danger Zone'}>
          {renderRows(dangerRows)}
        </SharedSection>

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(148,163,184,0.35)', fontFamily: FONT }}>
          {user.joinedAt
            ? (ar ? `??? ??? ${joinedText}` : `Member since ${joinedText}`)
            : (ar ? '??? ?? ????' : 'Wasel member')}
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

