/**
 * ProfilePage - /app/profile
 */
import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Camera,
  Car,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Key,
  LogOut,
  Monitor,
  Settings,
  Shield,
  Star,
  TrendingUp,
} from 'lucide-react';
import { ProtectedPagePreview } from '../../components/system/ProtectedPagePreview';
import { PageHero, PageShell, StatusBadge } from '../../components/wasel-ui/WaselPagePrimitives';
import { WaselButton } from '../../design-system';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { C, GRAD, R, SH, SPACE } from '../../utils/wasel-ds';
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
  PROFILE_BORDER as BORD,
  PROFILE_CYAN as CYAN,
  PROFILE_FONT as FONT,
  useProfilePageController,
} from './useProfilePageController';

function showToast(message: string) {
  const element = document.createElement('div');
  element.textContent = message;
  Object.assign(element.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: C.cardSolid,
    border: `1px solid ${C.borderHov}`,
    color: C.text,
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    zIndex: '9999',
    boxShadow: SH.md,
  });
  document.body.appendChild(element);
  setTimeout(() => element.remove(), 2800);
}

export default function ProfilePage() {
  const { user, signOut, updateUser } = useLocalAuth();
  const { updateProfile } = useAuth();
  const { language, t } = useLanguage();
  const nav = useIframeSafeNavigate();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const ar = language === 'ar';
  const photoInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return <ProtectedPagePreview pathname="/app/profile" />;
  }

  return (
    <ProfilePageContent
      user={user}
      signOut={signOut}
      updateProfile={updateProfile}
      updateUser={updateUser}
      ar={ar}
      t={t}
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
  updateUser: ReturnType<typeof useLocalAuth>['updateUser'];
  ar: boolean;
  t: (key: string) => string;
  nav: ReturnType<typeof useIframeSafeNavigate>;
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  photoInputRef: React.MutableRefObject<HTMLInputElement | null>;
}

function ProfilePageContent({
  user,
  signOut,
  updateProfile,
  updateUser,
  ar,
  t,
  nav,
  isSupported,
  permission,
  requestPermission,
  photoInputRef,
}: ProfilePageContentProps) {
  const [avatarError, setAvatarError] = useState(false);
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
    updateUser,
    notificationSupport: {
      isSupported,
      permission,
      requestPermission,
    },
    showToast,
    signOut,
    photoInputRef,
  });

  const initials = getProfileInitials(user.name);
  const memberLabel = user.joinedAt
    ? `${t('profileExpanded.memberSince')} ${joinedText}`
    : t('profileExpanded.waselMember');

  useEffect(() => {
    if (editingField !== 'name') setNameInput(user.name ?? '');
    if (editingField !== 'phone') setPhoneInput(user.phone ?? '');
  }, [editingField, setNameInput, setPhoneInput, user.name, user.phone]);

  return (
    <PageShell maxWidth={820} dir={ar ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelection}
          style={{ display: 'none' }}
        />

        <PageHero
          eyebrow={t('profileExpanded.accountIdentity')}
          icon={<StatusBadge label={roleLabel} accent={CYAN} />}
          title={user.name}
          description={`${user.email} · ${t('profileExpanded.trustScore')} ${user.trustScore}/100 · ${memberLabel}`}
          accent={CYAN}
          actions={
            <>
              <WaselButton
                onClick={() => {
                  setNameInput(user.name);
                  setEditingField('name');
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t('profileExpanded.editName')}
              </WaselButton>
              <WaselButton
                variant="outline"
                onClick={() => nav('/app/trust')}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                {t('profileExpanded.trustCenter')}
              </WaselButton>
              <WaselButton
                variant="outline"
                onClick={() => nav('/app/settings?section=account')}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                {t('profileExpanded.settings')}
              </WaselButton>
            </>
          }
          aside={
            <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: R.full,
                    background: GRAD,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.9rem',
                    fontWeight: 900,
                    color: C.bgDeep,
                    boxShadow: SH.blueL,
                    overflow: 'hidden',
                  }}
                >
                  {user.avatar && !avatarError ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      onError={() => setAvatarError(true)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    initials
                  )}
                </div>
                <button
                  title={t('profileExpanded.changePhoto')}
                  onClick={() => photoInputRef.current?.click()}
                  disabled={savingField === 'photo'}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 30,
                    height: 30,
                    borderRadius: R.full,
                    background: C.cardSolid,
                    border: `2px solid ${BG}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: savingField === 'photo' ? 'not-allowed' : 'pointer',
                    opacity: savingField === 'photo' ? 0.65 : 1,
                  }}
                >
                  {savingField === 'photo' ? (
                    <Clock size={12} color={CYAN} />
                  ) : (
                    <Camera size={12} color={CYAN} />
                  )}
                </button>
              </div>
              <SharedVerificationBadge
                level={user.verificationLevel ?? 'level_0'}
                ar={ar}
                accent={CYAN}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <StatusBadge label={`${walletStatus.label}`} accent={walletStatus.color} />
                <StatusBadge label={permissionStatus.label} accent={permissionStatus.color} />
              </div>
            </div>
          }
        />

        {editingField === 'name' ? (
          <SharedSection title={t('profileExpanded.quickEdit')}>
            <div
              style={{
                padding: 18,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <input
                value={nameInput}
                onChange={event => setNameInput(event.target.value)}
                autoFocus
                style={{
                  flex: '1 1 240px',
                  minWidth: 0,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1.5px solid ${CYAN}`,
                  background: C.cyanDim,
                  color: C.text,
                  fontSize: '0.9rem',
                  fontFamily: FONT,
                  outline: 'none',
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') void handleSaveName();
                  if (event.key === 'Escape') setEditingField(null);
                }}
                maxLength={60}
              />
              <button
                onClick={() => void handleSaveName()}
                disabled={savingField !== null}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: CYAN,
                  border: 'none',
                  color: C.bgDeep,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontFamily: FONT,
                }}
              >
                {savingField === 'name' ? '...' : t('profileExpanded.save')}
              </button>
              <button
                onClick={() => setEditingField(null)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: C.elevated,
                  border: `1px solid ${BORD}`,
                  color: C.textMuted,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontFamily: FONT,
                }}
              >
                {t('profileExpanded.cancel')}
              </button>
            </div>
          </SharedSection>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 28,
          }}
        >
          <SharedStatCard
            label={t('profileExpanded.trips')}
            value={user.trips ?? 0}
            icon={<Car size={16} />}
            color={CYAN}
          />
          <SharedStatCard
            label={t('profileExpanded.rating')}
            value={(user.rating ?? 5).toFixed(1)}
            icon={<Star size={16} />}
            color={C.gold}
          />
          <SharedStatCard
            label={t('profileExpanded.trust')}
            value={`${user.trustScore}/100`}
            icon={<Shield size={16} />}
            color={C.green}
          />
          <SharedStatCard
            label={t('profileExpanded.balance')}
            value={`JOD ${(user.balance ?? 0).toFixed(1)}`}
            icon={<CreditCard size={16} />}
            color={C.purple}
          />
        </div>

        <SharedSection title={t('profileExpanded.account')}>
          <div
            style={{
              padding: 18,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {quickActions.map(action => (
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

        <SharedSection title={t('profileExpanded.accountHealth')}>
          <div
            style={{
              padding: 18,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <SharedInsightCard
              label={t('profileExpanded.profileCompleteness')}
              value={`${profileCompleteness}%`}
              detail={t('profileExpanded.profileCompletenessDetail')}
              color={profileCompleteness >= 80 ? C.green : CYAN}
            />
            <SharedInsightCard
              label={t('profileExpanded.verificationLevel')}
              value={(user.verificationLevel ?? 'level_0').replace('level_', 'L')}
              detail={t('profileExpanded.verificationLevelDetail')}
              color={user.verified || user.sanadVerified ? CYAN : C.gold}
            />
            <SharedInsightCard
              label={t('profileExpanded.walletStatus')}
              value={walletStatus.label}
              detail={t('profileExpanded.walletStatusDetail')}
              color={walletStatus.color}
            />
            <SharedInsightCard
              label={t('profileExpanded.alerts')}
              value={permissionStatus.label}
              detail={t('profileExpanded.alertsDetail')}
              color={permissionStatus.color}
            />
          </div>
        </SharedSection>

        <SharedSection title={t('profileExpanded.trustAndVerification')}>
          {verificationItems.map(item => (
            <SharedRow
              key={item.label}
              label={item.label}
              value={item.status}
              icon={<Shield size={15} />}
              badge={
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
              }
              onClick={() => nav('/app/settings?section=account')}
            />
          ))}
          <SharedRow
            label={t('profileExpanded.operationalStanding')}
            value={`${trustTier} - ${memberLabel}`}
            icon={<CheckCircle size={15} />}
            onClick={() => nav('/app/my-trips')}
          />
        </SharedSection>

        <SharedSection title={t('profileExpanded.quickEdits')}>
          <div style={{ padding: 18, display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: C.textMuted,
                  fontFamily: FONT,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {t('profileExpanded.phoneNumber')}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={phoneInput}
                  onChange={event => setPhoneInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') void handleSavePhone();
                    if (event.key === 'Escape') setEditingField(null);
                  }}
                  onFocus={() => setEditingField('phone')}
                  placeholder="+962791234567"
                  style={{
                    flex: '1 1 220px',
                    minWidth: 0,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${editingField === 'phone' ? CYAN : BORD}`,
                    background: C.cyanDim,
                    color: C.text,
                    fontSize: '0.88rem',
                    fontFamily: FONT,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => void handleSavePhone()}
                  disabled={savingField !== null}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: CYAN,
                    border: 'none',
                    color: C.bgDeep,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontFamily: FONT,
                  }}
                >
                  {savingField === 'phone' ? '...' : t('profileExpanded.savePhone')}
                </button>
              </div>
              <div style={{ fontSize: '0.74rem', color: C.textMuted, fontFamily: FONT }}>
                {t('profileExpanded.usedForAlertsVerificationAndCoordination')}
              </div>
            </div>
          </div>
        </SharedSection>

        {(user.role === 'driver' || user.role === 'both') && (
          <SharedSection title={t('profileExpanded.driverMode')}>
            <SharedRow
              label={t('profileExpanded.myVehicle')}
              value={t('profileExpanded.notAddedYet')}
              icon={<Car size={15} />}
              onClick={() => nav('/app/settings?section=account')}
            />
            <SharedRow
              label={t('profileExpanded.documents')}
              value={t('profileExpanded.licenseInsuranceRegistration')}
              icon={<FileText size={15} />}
              badge={<CheckCircle size={14} color={C.green} />}
              onClick={() => nav('/app/trust')}
            />
            <SharedRow
              label={t('profileExpanded.earnings')}
              icon={<TrendingUp size={15} />}
              onClick={() => nav('/app/wallet')}
            />
          </SharedSection>
        )}

        <SharedSection title={t('profileExpanded.preferences')}>
          <SharedRow
            label={t('profileExpanded.genderPreference')}
            value={t('profileExpanded.mixedDefault')}
            icon={<Settings size={15} />}
            onClick={() => nav('/app/settings?section=account')}
          />
          <SharedRow
            label={t('profileExpanded.currency')}
            value="JOD"
            icon={<CreditCard size={15} />}
            onClick={() => nav('/app/settings?section=account')}
          />
          <SharedRow
            label={t('profileExpanded.advancedSettings')}
            icon={<Settings size={15} />}
            onClick={() => nav('/app/settings?section=account')}
          />
        </SharedSection>

        <SharedSection title={t('profileExpanded.security')}>
          <SharedRow
            label={t('profileExpanded.changePassword')}
            icon={<Key size={15} />}
            onClick={() => nav('/app/settings?section=security')}
          />
          <SharedRow
            label={t('profileExpanded.twoFactorAuth2FA')}
            badge={
              <span
                style={{
                  fontSize: '0.65rem',
                  color: C.gold,
                  background: C.goldDim,
                  padding: '2px 7px',
                  borderRadius: 999,
                  fontFamily: FONT,
                  fontWeight: 700,
                }}
              >
                {user.twoFactorEnabled ? t('profileExpanded.on') : t('profileExpanded.off')}
              </span>
            }
            icon={<Shield size={15} />}
            onClick={() => nav('/app/settings?section=security')}
          />
          <SharedRow
            label={t('profileExpanded.activeSessions')}
            icon={<Monitor size={15} />}
            onClick={() => nav('/app/settings?section=security')}
          />
        </SharedSection>

        <SharedSection title={t('profileExpanded.alerts')}>
          <SharedRow
            label={t('profileExpanded.notificationCenter')}
            value={permissionStatus.label}
            icon={<Bell size={15} />}
            badge={<StatusBadge label={permissionStatus.label} accent={permissionStatus.color} />}
            onClick={() => void handleNotificationSetup()}
          />
        </SharedSection>

        <SharedSection title={t('profileExpanded.legal')}>
          <SharedRow
            label={t('profileExpanded.privacyPolicy')}
            icon={<FileText size={15} />}
            onClick={() => nav('/app/privacy')}
          />
          <SharedRow
            label={t('profileExpanded.termsOfService')}
            icon={<FileText size={15} />}
            onClick={() => nav('/app/terms')}
          />
        </SharedSection>

        <SharedSection title={t('profileExpanded.dangerZone')}>
          <SharedRow
            label={t('profileExpanded.exportMyData')}
            icon={<FileText size={15} />}
            onClick={handleExportData}
          />
          <SharedRow
            label={t('profileExpanded.requestAccountDeletion')}
            danger
            icon={<LogOut size={15} />}
            onClick={() => setShowDeleteConfirm(true)}
          />
          <SharedRow
            label={t('profileExpanded.signOut')}
            danger
            icon={<LogOut size={15} />}
            onClick={() => void handleSignOut()}
          />
        </SharedSection>

        <p
          style={{
            textAlign: 'center',
            fontSize: '0.72rem',
            color: C.textDim,
            fontFamily: FONT,
          }}
        >
          <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          {memberLabel}
        </p>
      </div>

      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: C.overlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: C.cardSolid,
              border: `1px solid ${C.errorDim}`,
              borderRadius: 16,
              padding: 28,
              maxWidth: 360,
              width: '100%',
            }}
          >
            <h3
              style={{
                color: C.error,
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: '1.1rem',
                marginBottom: 10,
              }}
            >
              {t('profileExpanded.requestAccountDeletion')}
            </h3>
            <p
              style={{
                color: C.textMuted,
                fontFamily: FONT,
                fontSize: '0.85rem',
                marginBottom: 20,
              }}
            >
              {t('profileExpanded.fullAccountDeletionBody')}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  color: C.textMuted,
                  fontFamily: FONT,
                  cursor: 'pointer',
                }}
              >
                {t('profileExpanded.cancel')}
              </button>
              <button
                onClick={() => void handleDeletionContinue()}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  background: C.errorDim,
                  border: `1px solid ${C.errorDim}`,
                  color: C.error,
                  fontFamily: FONT,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('profileExpanded.continue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
