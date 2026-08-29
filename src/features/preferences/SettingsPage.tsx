/**
 * SettingsPage - /app/settings
 * App-wide settings plus real account editing flows.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Bell, Eye, Globe, Palette, Shield } from 'lucide-react';
import {
  PageHero,
  PageShell,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { normalizeProfilePhone } from '../../features/profile/profileUtils';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import type { Language } from '../../locales/translations';
import {
  getAccountSettings,
  getDefaultAccountSettings,
  updateAccountSettings,
} from '../../services/accountSettings';
import {
  getCommunicationCapabilities,
  getCommunicationPreferences,
  updateCommunicationPreferences,
  type CommunicationPreferences,
} from '../../services/communicationPreferences';
import {
  getSmsSupportUrl,
  getSupportEmailUrl,
  getSupportPhoneUrl,
  getWhatsAppSupportUrl,
} from '../../utils/env';
import {
  checkPasswordStrength,
  disable2FA,
  enable2FA,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  isTwoFactorAvailable,
  verify2FACode,
  type TwoFactorSetup,
} from '../../utils/security';
import { C, F, R, TYPE } from '../../utils/wasel-ds';
import { supabase } from '../../utils/supabase/client';
import styles from '../../styles/app-shell.module.css';
import { Section, ToggleRow, SelectRow, LinkRow, ActionButton, FormField } from './components/SettingsPrimitives';

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const { language, setLanguage, t } = useLanguage();
  const { changePassword, profile, refreshProfile, resetPassword, updateProfile } = useAuth();
  const { user, updateUser } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';
  const notificationCapabilities = useMemo(
    () =>
      getCommunicationCapabilities({
        email: user?.email ?? profile?.email,
        phone: user?.phone ?? profile?.phone_number,
      }),
    [profile?.email, profile?.phone_number, user?.email, user?.phone],
  );
  const accountRef = useRef<HTMLDivElement | null>(null);
  const securityRef = useRef<HTMLDivElement | null>(null);
  const settingsHydratedRef = useRef(false);
  const twoFactorSupported = isTwoFactorAvailable();
  const defaultAccountSettings = useMemo(
    () => getDefaultAccountSettings(language, ar ? 'rtl' : 'ltr'),
    [ar, language],
  );

  const [emailInput, setEmailInput] = useState(user?.email ?? '');
  const [emailSaving, setEmailSaving] = useState(false);
  const [phoneInput, setPhoneInput] = useState(user?.phone ?? '');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [sessions, setSessions] = useState<Array<{ id: string; device: string; lastActive: string }>>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [notifs, setNotifs] = useState<CommunicationPreferences>({
    inApp: true,
    push: true,
    email: true,
    sms: true,
    whatsapp: false,
    tripUpdates: true,
    bookingRequests: true,
    messages: true,
    promotions: false,
    prayerReminders: true,
    criticalAlerts: true,
    preferredLanguage: language === 'ar' ? 'ar' : 'en',
  });
  const [notificationSavingKey, setNotificationSavingKey] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState(defaultAccountSettings.privacy);
  const [display, setDisplay] = useState<{
    language: Language;
    currency: string;
    theme: string;
    direction: string;
  }>(defaultAccountSettings.display);

  const passwordStrength = useMemo(() => checkPasswordStrength(passwordInput), [passwordInput]);
  const twoFactorEnabled = Boolean(user?.twoFactorEnabled ?? profile?.two_factor_enabled);

  useEffect(() => {
    setPhoneInput(user?.phone ?? '');
  }, [user?.phone]);

  useEffect(() => {
    setDisplay(previous => ({
      ...previous,
      language,
      direction: language === 'ar' ? 'rtl' : 'ltr',
    }));
    setNotifs(previous => ({
      ...previous,
      preferredLanguage: language === 'ar' ? 'ar' : 'en',
    }));
  }, [language]);

  useEffect(() => {
    settingsHydratedRef.current = false;
    let cancelled = false;

    const loadSettings = async () => {
      const settings = await getAccountSettings(user?.id ?? null, defaultAccountSettings);
      if (cancelled) return;

      setPrivacy(settings.privacy);
      setDisplay({
        ...settings.display,
        language,
        direction: ar ? 'rtl' : 'ltr',
      });
      settingsHydratedRef.current = true;
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [ar, defaultAccountSettings, language, user?.id]);

  useEffect(() => {
    if (!settingsHydratedRef.current) return;

    const handle = window.setTimeout(() => {
      void updateAccountSettings(user?.id ?? null, {
        privacy,
        display: {
          ...display,
          language,
          direction: ar ? 'rtl' : 'ltr',
        },
      });
    }, 250);

    return () => {
      window.clearTimeout(handle);
    };
  }, [ar, display, language, privacy, user?.id]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section === 'security') {
      securityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (section === 'account' || section === 'phone') {
      accountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      const prefs = await getCommunicationPreferences(user?.id ?? null);
      if (cancelled) return;
      setNotifs(prefs);
    };

    void loadPreferences();

     return () => {
       cancelled = true;
     };
   }, [user?.id]);

    useEffect(() => {
      const loadSessionsEffect = async () => {
        if (!supabase) return;
        const currentSession = await supabase.auth.getSession();
        const currentSessionId = currentSession.data.session?.user?.id ?? null;
        setActiveSessionId(currentSessionId);
      };

      void loadSessionsEffect();
    }, [user?.id, ar]);

   const saveNotificationPreferences = async (
    updates: Partial<CommunicationPreferences>,
    savingKey: string,
  ) => {
    setNotificationSavingKey(savingKey);
    const next = await updateCommunicationPreferences(user?.id ?? null, updates);
    setNotifs(next);
    setNotificationSavingKey(null);
    toast.success(ar ? 'تم تحديث تفضيلات التواصل.' : 'Communication preferences updated.');
  };

  const toggleNotificationPreference =
    (key: keyof CommunicationPreferences) => (value: boolean) => {
      setNotifs(previous => ({ ...previous, [key]: value }));
      void saveNotificationPreferences({ [key]: value } as Partial<CommunicationPreferences>, key);
    };

  const openSupportLink = (url: string, emptyMessage: string) => {
    if (!url) {
      toast.error(emptyMessage);
      return;
    }
    window.location.href = url;
  };

  const savePhone = async () => {
    const normalized = normalizeProfilePhone(phoneInput);
    if (normalized === null && phoneInput.trim() !== '') {
      toast.error(ar ? 'أدخل رقم هاتف صحيح.' : 'Please enter a valid phone number.');
      return;
    }
    if ((normalized ?? '') === (user?.phone ?? '')) {
      toast.message(ar ? 'ما في إشي جديد للحفظ.' : 'There is nothing new to save.');
      return;
    }

    setPhoneSaving(true);
    const { error } = await updateProfile({ phone_number: normalized });
    setPhoneSaving(false);

    if (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }

    updateUser({
      phone: normalized || undefined,
      phoneVerified: false,
    });
    toast.success(
      normalized
        ? ar
          ? 'تم حفظ رقم الهاتف.'
          : 'Phone number saved.'
        : ar
          ? 'تم حذف رقم الهاتف.'
          : 'Phone number removed.',
    );
  };

  const saveEmail = async () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) {
      toast.error(ar ? 'أدخل بريدًا إلكترونيًا صحيحًا.' : 'Please enter a valid email.');
      return;
    }
    if (trimmed === (user?.email ?? profile?.email ?? '')) {
      toast.message(ar ? 'ما في إشي جديد للحفظ.' : 'There is nothing new to save.');
      return;
    }

    setEmailSaving(true);
    const { error } = await updateProfile({ email: trimmed });
    setEmailSaving(false);

    if (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }

     updateUser({ email: trimmed, emailVerified: false });
     toast.success(
       ar ? 'تم حفظ البريد الإلكتروني. تحقق من بريدك لتأكيده.' : 'Email saved. Check your inbox to verify it.',
     );
    };

   const savePassword = async () => {
    if (!passwordInput) {
      toast.error(ar ? 'أدخل كلمة مرور جديدة.' : 'Enter a new password.');
      return;
    }
    if (!passwordStrength.isValid) {
      toast.error(ar ? 'كلمة المرور الجديدة ضعيفة.' : 'The new password is too weak.');
      return;
    }
    if (passwordInput !== confirmPassword) {
      toast.error(ar ? 'كلمات المرور غير متطابقة.' : 'The passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    const { error } = await changePassword(passwordInput);
    setPasswordSaving(false);

    if (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }

    setPasswordInput('');
    setConfirmPassword('');
    toast.success(ar ? 'تم تحديث كلمة المرور.' : 'Password updated.');
  };

  const sendResetLink = async () => {
    if (!user?.email) {
      toast.error(
        ar ? 'ما في بريد إلكتروني مربوط بهذا الحساب.' : 'No email is associated with this account.',
      );
      return;
    }

    const { error } = await resetPassword(user.email);
    if (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }

    toast.success(
      ar ? `تم إرسال رابط إعادة التعيين إلى ${user.email}` : `Reset link sent to ${user.email}`,
    );
  };

  const revokeSession = async (sessionId: string) => {
    if (!supabase) return;
    toast.success(ar ? 'تم إنهاء الجلسة.' : 'Session revoked.');
    setSessions(previous => previous.filter(s => s.id !== sessionId));
  };

  const turnOnTwoFactor = async () => {
    if (!user) {
      toast.error(ar ? 'سجّل دخول أولاً.' : 'Please sign in first.');
      return;
    }
    if (!twoFactorSupported) {
      toast.error(
        ar
          ? 'التحقق الثنائي غير متاح في هاي البيئة.'
          : 'Two-factor authentication is not available in this environment.',
      );
      return;
    }

    try {
      setTwoFactorSaving(true);
      const setup = await enable2FA(user.id);
      setTwoFactorSetup(setup);
      setTwoFactorCode('');
      toast.success(
        ar
          ? 'امسح رمز QR، احفظ الأكواد الاحتياطية، وبعدها أكّد برمز من 6 خانات من تطبيق المصادقة.'
          : 'Scan the QR code, save your backup codes, then confirm with a 6-digit authenticator code.',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const confirmTwoFactorSetup = async () => {
    if (!user) {
      toast.error(ar ? 'سجّل دخول أولاً.' : 'Please sign in first.');
      return;
    }
    if (!twoFactorCode.trim()) {
      toast.error(
        ar
          ? 'أدخل رمز المصادقة من 6 خانات لإنهاء الإعداد.'
          : 'Enter the 6-digit authenticator code to finish setup.',
      );
      return;
    }

    try {
      setTwoFactorSaving(true);
      const verified = await verify2FACode(user.id, twoFactorCode.trim());
      if (!verified) {
        toast.error(
          ar ? 'تعذّر تأكيد رمز التحقق.' : 'That verification code could not be confirmed.',
        );
        return;
      }

      setTwoFactorCode('');
      setTwoFactorSetup(null);
      updateUser({ twoFactorEnabled: true });
      await refreshProfile();
      toast.success(ar ? 'تم تفعيل التحقق الثنائي.' : 'Two-factor authentication enabled.');
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const turnOffTwoFactor = async () => {
    if (!user) {
      toast.error(ar ? 'سجّل دخول أولاً.' : 'Please sign in first.');
      return;
    }
    if (!twoFactorCode.trim()) {
      toast.error(
        ar
          ? 'أدخل رمز المصادقة أو كود احتياطي.'
          : 'Enter your authenticator code or a backup code.',
      );
      return;
    }

    try {
      setTwoFactorSaving(true);
      const disabled = await disable2FA(user.id, twoFactorCode.trim());
      if (!disabled) {
        toast.error(
          ar ? 'تعذّر تأكيد رمز التحقق.' : 'That verification code could not be confirmed.',
        );
        return;
      }

      setTwoFactorCode('');
      setTwoFactorSetup(null);
      updateUser({ twoFactorEnabled: false });
      await refreshProfile();
      toast.success(ar ? 'تم تعطيل التحقق الثنائي.' : 'Two-factor authentication disabled.');
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const exportData = () => {
    if (!user) {
      toast.error(ar ? 'سجّل دخول أولاً.' : 'Please sign in first.');
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
    ? t('settingsExpanded.oneActiveSessionOnThisDevice')
    : t('settingsExpanded.signInToViewActiveSessions');

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [savedSettings, setSavedSettings] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const requestResetToDefaults = () => {
    setShowResetConfirm(true);
  };

  const resetToDefaults = () => {
    setShowResetConfirm(false);
    setPrivacy(defaultAccountSettings.privacy);
    setDisplay({
      ...defaultAccountSettings.display,
      language,
      direction: ar ? 'rtl' : 'ltr',
    });
    setNotifs({
      inApp: true,
      push: true,
      email: true,
      sms: true,
      whatsapp: false,
      tripUpdates: true,
      bookingRequests: true,
      messages: true,
      promotions: false,
      prayerReminders: true,
      criticalAlerts: true,
      preferredLanguage: language === 'ar' ? 'ar' : 'en',
    });

    void updateAccountSettings(user?.id ?? null, {
      privacy: defaultAccountSettings.privacy,
      display: {
        ...defaultAccountSettings.display,
        language,
        direction: ar ? 'rtl' : 'ltr',
      },
    });

    setSavedSettings(
      ar ? 'تمت إعادة كل الإعدادات للوضع الافتراضي' : 'All settings reset to defaults',
    );
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };

  useEffect(() => {
    if (settingsHydratedRef.current) {
      setSavedSettings(ar ? 'تم حفظ الإعدادات تلقائياً' : 'Settings saved automatically');
      setShowSaveConfirm(true);
      setTimeout(() => setShowSaveConfirm(false), 1500);
    }
  }, [privacy, display, notifs]);

  return (
    <PageShell maxWidth={760} dir={ar ? 'rtl' : 'ltr'}>
      <div className={styles.settingsPageShell}>
        <PageHero
          eyebrow={t('settingsExpanded.accountControl')}
          icon={<StatusBadge label="W" accent={C.cyan} />}
          title={t('settingsExpanded.waselSettings')}
          description={t('settingsExpanded.notificationsPrivacySecurityAndAccount')}
          accent={C.cyan}
        />

        <Section icon={<Bell size={16} />} title={t('header.notifications')}>
          <ToggleRow
            label={t('settingsExpanded.tripUpdates')}
            sub={t('settingsExpanded.bookingChanges')}
            value={notifs.tripUpdates}
            onChange={toggleNotificationPreference('tripUpdates')}
          />
          <ToggleRow
            label={t('settingsExpanded.newBookingRequests')}
            sub={t('settingsExpanded.driversOnly')}
            value={notifs.bookingRequests}
            onChange={toggleNotificationPreference('bookingRequests')}
          />
          <ToggleRow
            label={t('settingsExpanded.messages')}
            value={notifs.messages}
            onChange={toggleNotificationPreference('messages')}
          />
          <ToggleRow
            label={t('settingsExpanded.prayerTimeReminders')}
            sub={t('settingsExpanded.onLongDistanceRoutes')}
            value={notifs.prayerReminders}
            onChange={toggleNotificationPreference('prayerReminders')}
          />
          <ToggleRow
            label={t('settingsExpanded.promotionsAndOffers')}
            value={notifs.promotions}
            onChange={toggleNotificationPreference('promotions')}
          />
          <ToggleRow
            label={t('settingsExpanded.pushNotifications')}
            sub={
              notificationCapabilities.push
                ? t('settingsExpanded.availableOnThisDevice')
                : t('settingsExpanded.notAvailableOnThisDevice')
            }
            value={notifs.push}
            onChange={toggleNotificationPreference('push')}
          />
          <ToggleRow
            label={t('settingsExpanded.smsAlerts')}
            sub={
              notificationCapabilities.sms
                ? t('settingsExpanded.readyForYourPhone', {
                    phone: user?.phone ?? profile?.phone_number ?? (ar ? 'رقمك' : 'your phone'),
                  })
                : t('settingsExpanded.addAPhoneNumber')
            }
            value={notifs.sms}
            onChange={toggleNotificationPreference('sms')}
          />
          <ToggleRow
            label={t('settingsExpanded.emailNotifications')}
            sub={
              notificationCapabilities.email
                ? t('settingsExpanded.readyForYourEmail', {
                    email: user?.email ?? profile?.email ?? (ar ? 'بريدك' : 'your email'),
                  })
                : t('settingsExpanded.addAnEmailAddress')
            }
            value={notifs.email}
            onChange={toggleNotificationPreference('email')}
          />
          <ToggleRow
            label={t('settingsExpanded.whatsappAlerts')}
            sub={
              notificationCapabilities.whatsapp
                ? t('settingsExpanded.available')
                : t('settingsExpanded.addAPhoneNumber')
            }
            value={notifs.whatsapp}
            onChange={toggleNotificationPreference('whatsapp')}
          />
          <ToggleRow
            label={t('settingsExpanded.criticalSafetyAlerts')}
            sub={t('settingsExpanded.securityAndUrgentUpdates')}
            value={notifs.criticalAlerts}
            onChange={toggleNotificationPreference('criticalAlerts')}
          />
          <div className={styles.settingsSectionNote}>
            {notificationSavingKey
              ? t('settingsExpanded.savingNotificationSettings')
              : t('settingsExpanded.notificationSettingsSyncAutomatically')}
          </div>
          <LinkRow
            label={t('settingsExpanded.emailSupport')}
            sub={t('settingsExpanded.openDefaultMailApp')}
            onClick={() =>
              openSupportLink(
                getSupportEmailUrl('Wasel support request'),
                ar
                  ? 'بريد الدعم مش مفعّل في هاي البيئة.'
                  : 'Support email is not configured for this environment.',
              )
            }
          />
          <LinkRow
            label={t('settingsExpanded.smsSupport')}
            sub={t('settingsExpanded.openPhoneSMSApp')}
            onClick={() =>
              openSupportLink(
                getSmsSupportUrl('Hi Wasel support team'),
                ar
                  ? 'رسائل الدعم مش مفعّلة في هاي البيئة.'
                  : 'Support SMS is not configured for this environment.',
              )
            }
          />
          <LinkRow
            label={t('settingsExpanded.whatsappSupport')}
            sub={t('settingsExpanded.openDirectWhatsAppSupport')}
            onClick={() =>
              openSupportLink(
                getWhatsAppSupportUrl('Hi Wasel support team'),
                ar
                  ? 'دعم واتساب مش مفعّل في هاي البيئة.'
                  : 'Support WhatsApp is not configured for this environment.',
              )
            }
          />
          <LinkRow
            label={t('settingsExpanded.callSupport')}
            sub={t('settingsExpanded.immediateVoiceSupportHandoff')}
            onClick={() =>
              openSupportLink(
                getSupportPhoneUrl(),
                ar
                  ? 'هاتف الدعم مش مفعّل في هاي البيئة.'
                  : 'Support phone is not configured for this environment.',
              )
            }
          />
        </Section>

        <Section icon={<Globe size={16} />} title={t('settingsExpanded.displayAndLanguage')}>
          <SelectRow
            label={t('settingsExpanded.language')}
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
            label={t('settingsExpanded.currency')}
            options={[
              { value: 'JOD', label: 'JOD - Jordanian Dinar' },
              { value: 'USD', label: 'USD - US Dollar' },
              { value: 'EUR', label: 'EUR - Euro' },
              { value: 'SAR', label: 'SAR - Saudi Riyal' },
            ]}
            value={display.currency}
            onChange={value => setDisplay(previous => ({ ...previous, currency: value }))}
          />
          <SelectRow
            label={t('settingsExpanded.theme')}
            options={[
              { value: 'dark', label: t('settingsExpanded.dark') },
              { value: 'system', label: t('settingsExpanded.system') },
            ]}
            value={display.theme}
            onChange={value => setDisplay(previous => ({ ...previous, theme: value }))}
          />
        </Section>

        <Section icon={<Eye size={16} />} title={t('legal.terms.privacy')}>
          <ToggleRow
            label={t('settingsExpanded.showProfileToOthers')}
            sub={t('settingsExpanded.passengersAndDrivers')}
            value={privacy.showProfile}
            onChange={value => setPrivacy(previous => ({ ...previous, showProfile: value }))}
          />
          <ToggleRow
            label={t('settingsExpanded.hideProfilePhoto')}
            sub={t('settingsExpanded.showNameOnly')}
            value={privacy.hidePhoto}
            onChange={value => setPrivacy(previous => ({ ...previous, hidePhoto: value }))}
          />
          <ToggleRow
            label={t('settingsExpanded.shareLiveLocation')}
            sub={t('settingsExpanded.activeTripsOnly')}
            value={privacy.shareLocation}
            onChange={value => setPrivacy(previous => ({ ...previous, shareLocation: value }))}
          />
          <ToggleRow
            label={t('settingsExpanded.analyticsAndImprovement')}
            sub={t('settingsExpanded.anonymousUsage')}
            value={privacy.dataAnalytics}
            onChange={value => setPrivacy(previous => ({ ...previous, dataAnalytics: value }))}
          />
          <div className={styles.settingsSectionInner}>
            <button onClick={requestResetToDefaults} className={styles.settingsResetButton}>
              {t('settingsExpanded.resetToDefaults')}
            </button>
            {showSaveConfirm && savedSettings && (
              <span className={styles.settingsSaveMessage}>✓ {savedSettings}</span>
            )}
          </div>
        </Section>

        <div ref={securityRef}>
          <Section icon={<Shield size={16} />} title={t('profileExpanded.security')}>
            <div style={{ padding: 18, display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: TYPE.weight.bold,
                    color: C.text,
                    fontFamily: F,
                  }}
                >
                  {t('settings.security.changePassword')}
                </div>
                <FormField
                  value={passwordInput}
                  onChange={setPasswordInput}
                  type="password"
                  placeholder={t('settingsExpanded.newPassword')}
                />
                <FormField
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  type="password"
                  placeholder={t('settingsExpanded.confirmNewPassword')}
                />
                <div
                  style={{
                    fontSize: '0.74rem',
                    color: getPasswordStrengthColor(passwordStrength.score),
                    fontFamily: F,
                  }}
                >
                  {passwordInput
                    ? `${t('settingsExpanded.strength')}: ${getPasswordStrengthLabel(passwordStrength.score)}`
                    : t('settingsExpanded.useStrongPasswordWith8Chars')}
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: C.textMuted,
                      fontFamily: F,
                      lineHeight: 1.5,
                    }}
                  >
                    {passwordStrength.feedback.join(' - ')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <ActionButton
                    label={
                      passwordSaving
                        ? t('settingsExpanded.saving')
                        : t('settingsExpanded.updatePassword')
                    }
                    onClick={() => {
                      void savePassword();
                    }}
                    disabled={!user || passwordSaving}
                  />
                  <ActionButton
                    label={t('settingsExpanded.sendResetLink')}
                    onClick={() => {
                      void sendResetLink();
                    }}
                    disabled={!user?.email}
                    variant="secondary"
                  />
                </div>
              </div>

              <div className={styles.settingsDivider} />

              <div className={styles.settingsStackMd}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div className={styles.settingsSectionTitle}>
                      {t('settings.security.twoFactor')}
                    </div>
                    <div className={styles.settingsSectionCopyCompact}>
                      {!twoFactorSupported
                        ? t('settingsExpanded.unavailableOnThisDevice')
                        : twoFactorEnabled
                          ? t('settingsExpanded.enabledOnThisAccount')
                          : twoFactorSetup
                            ? t('settingsExpanded.finishSetupWithAuthenticatorCode')
                            : t('settingsExpanded.addExtraCodeLayer')}
                    </div>
                  </div>
                  <ActionButton
                    label={
                      twoFactorSaving
                        ? t('settingsExpanded.updating')
                        : twoFactorEnabled
                          ? t('settingsExpanded.disable2FA')
                          : twoFactorSetup
                            ? t('settingsExpanded.confirm2FA')
                            : t('settingsExpanded.start2FASetup')
                    }
                    onClick={() => {
                      if (twoFactorEnabled) {
                        void turnOffTwoFactor();
                        return;
                      }
                      if (twoFactorSetup) {
                        void confirmTwoFactorSetup();
                        return;
                      }
                      void turnOnTwoFactor();
                    }}
                    disabled={
                      !user || twoFactorSaving || (!twoFactorSupported && !twoFactorEnabled)
                    }
                    variant={twoFactorEnabled ? 'danger' : 'primary'}
                  />
                </div>

                {(twoFactorEnabled || twoFactorSetup) && (
                  <div className={styles.settingsStackSm}>
                    <FormField
                      value={twoFactorCode}
                      onChange={setTwoFactorCode}
                      placeholder={
                        twoFactorEnabled
                          ? t('settingsExpanded.authenticatorCodeOrBackupCode')
                          : ar
                            ? 'رمز مصادقة من 6 خانات لتأكيد الإعداد'
                            : '6-digit authenticator code to confirm setup'
                      }
                    />
                    <div className={styles.settingsSectionHint}>
                      {twoFactorEnabled
                        ? t('settingsExpanded.useThisFieldWhenDisabling2FA')
                        : t('settingsExpanded.enterCodeFromAuthenticatorApp')}
                    </div>
                  </div>
                )}

                {twoFactorSetup && (
                  <div className={styles.settingsFormCard}>
                    <div className={styles.settingsSectionTitle}>
                      {t('settingsExpanded.currentSetupDetails')}
                    </div>
                    <img
                      src={twoFactorSetup.qrCode}
                      alt={t('settingsPage.two_factor_qr_code')}
                      className={styles.settingsQrImage}
                    />
                    <div className={styles.settingsSectionCopy}>
                      {t('settingsPage.secret')}
                      <span style={{ color: C.text }}>{twoFactorSetup.secret}</span>
                    </div>
                    <div className={styles.settingsSectionCopyCompact}>
                      {t('settingsPage.backup_codes')}
                      {twoFactorSetup.backupCodes.join(' - ')}
                    </div>
                  </div>
                )}

                <div className={styles.settingsSectionCaption}>{sessionSummary}</div>

                {sessions.length > 0 && (
                  <div className={styles.settingsStackSm}>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: TYPE.weight.bold,
                        color: C.text,
                        fontFamily: F,
                      }}
                    >
                      {t('settingsExpanded.activeSessions')}
                    </div>
                    {sessions.map(session => (
                      <div
                        key={session.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: R.md,
                          background: C.elevated,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: C.text,
                              fontFamily: F,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {session.device}
                          </div>
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color: C.textDim,
                              fontFamily: F,
                            }}
                          >
                            {session.lastActive}
                            {session.id === activeSessionId
                              ? ar
                                ? ' • الجلسة الحالية'
                                : ' • Current session'
                              : null}
                          </div>
                        </div>
                        {session.id !== activeSessionId && (
                          <ActionButton
                            label={t('settingsExpanded.revokeSession')}
                      onClick={async () => {
                              void revokeSession(session.id);
                            }}
                            variant="danger"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>
        </div>

        <div ref={accountRef}>
          <Section icon={<Palette size={16} />} title={t('profileExpanded.account')}>
            <div style={{ padding: 18, display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: TYPE.weight.bold,
                    color: C.text,
                    fontFamily: F,
                  }}
                >
                  {t('auth.phoneNumber')}
                </div>
                <FormField
                  value={phoneInput}
                  onChange={setPhoneInput}
                  type="tel"
                  placeholder="+962791234567"
                />
                <div className={styles.settingsSectionCopy}>
                  {user?.phoneVerified
                    ? ar
                      ? 'رقمك موثّق حالياً.'
                      : 'Your phone is currently verified.'
                    : user?.phone
                      ? ar
                        ? 'الرقم محفوظ ولسه بانتظار التوثيق.'
                        : 'The phone is saved but still pending verification.'
                      : ar
                        ? 'بنستخدمه للتنبيهات وتنسيق الرحلات.'
                        : 'Used for alerts and trip coordination.'}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <ActionButton
                    label={
                      phoneSaving ? t('settingsExpanded.saving') : ar ? 'حفظ الهاتف' : 'Save Phone'
                    }
                    onClick={() => {
                      void savePhone();
                    }}
                    disabled={!user || phoneSaving}
                  />
                  <ActionButton
                    label={ar ? 'افتح الملف الشخصي' : 'Open Profile'}
                    onClick={() => nav('/app/profile')}
                    variant="secondary"
                  />
                </div>
               </div>

               <div style={{ height: 1, background: C.borderFaint }} />

               <div style={{ display: 'grid', gap: 10 }}>
                 <div
                   style={{
                     fontSize: '0.82rem',
                     fontWeight: TYPE.weight.bold,
                     color: C.text,
                     fontFamily: F,
                   }}
                 >
                   {t('settingsExpanded.emailAddress')}
                 </div>
                 <FormField
                   value={emailInput}
                   onChange={setEmailInput}
                   type="email"
                   placeholder={t('settingsExpanded.emailPlaceholder')}
                 />
                 <div className={styles.settingsSectionCopy}>
                   {user?.emailVerified
                     ? ar
                       ? 'بريدك موثّق حالياً.'
                       : 'Your email is currently verified.'
                     : user?.email
                       ? ar
                         ? 'البريد محفوظ ولسه بانتظار التوثيق.'
                         : 'The email is saved but still pending verification.'
                       : ar
                         ? 'يُستخدم للتنبيهات واستعادة الحساب.'
                         : 'Used for alerts and account recovery.'}
                 </div>
                 <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                   <ActionButton
                     label={
                       emailSaving
                         ? t('settingsExpanded.saving')
                         : ar
                           ? 'حفظ البريد'
                           : 'Save Email'
                     }
                     onClick={() => {
                       void saveEmail();
                     }}
                     disabled={!user || emailSaving}
                   />
                   <ActionButton
                     label={t('settingsExpanded.sendVerification')}
                      onClick={async () => {
                        if (!user?.email) {
                          toast.error(
                            ar
                              ? 'ما في بريد إلكتروني مربوط بهذا الحساب.'
                              : 'No email is associated with this account.',
                          );
                          return;
                        }
                        if (!supabase) {
                          toast.error(ar ? 'البيئة غير مفعّلة.' : 'Backend is not configured.');
                          return;
                        }
                        const { error } = await supabase.auth.resend({ type: 'signup' as const, email: user.email });
                        if (error) {
                          toast.error(error instanceof Error ? error.message : String(error));
                          return;
                        }
                        toast.success(ar ? 'تم إرسال رابط التأكيد.' : 'Verification email sent.');
                      }}
                     disabled={!user?.email}
                     variant="secondary"
                   />
                 </div>
               </div>

               <div style={{ height: 1, background: C.borderFaint }} />

               <LinkRow
                 label={t('settingsExpanded.privacyPolicy')}
                 onClick={() => nav('/app/privacy')}
               />
              <LinkRow
                label={t('settingsExpanded.securityCenter')}
                sub={
                  ar
                    ? 'تشفير، تحقق ثنائي، بوابات ثقة، ومسار حوادث'
                    : 'Encryption, 2FA, trust gates, and incident flow'
                }
                onClick={() => nav('/app/security')}
              />
              <LinkRow
                label={t('settingsExpanded.termsOfService')}
                onClick={() => nav('/app/terms')}
              />
              <LinkRow
                label={t('settingsExpanded.supportCenter')}
                sub={
                  ar
                    ? 'مسارات، طرود، محفظة، حساب، وتصعيد سلامة'
                    : 'Routes, packages, wallet, account, and safety escalation'
                }
                onClick={() => nav('/app/support')}
              />
              <LinkRow
                label={t('settingsExpanded.exportMyData')}
                sub={
                  ar
                    ? 'نزّل بيانات حسابك الحالية بصيغة JSON'
                    : 'Download your current account data as JSON'
                }
                onClick={exportData}
              />
            </div>
          </Section>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: '0.7rem',
            color: C.textDim,
            fontFamily: F,
            marginTop: 8,
          }}
        >
          {t('settingsPage.wasel_v1_0_0_wasel14_online')}
        </p>
      </div>

      {showResetConfirm && (
        <div className={styles.settingsModalBackdrop} onClick={() => setShowResetConfirm(false)}>
          <div className={styles.settingsModalCard} onClick={event => event.stopPropagation()}>
            <h3 className={styles.settingsModalTitle}>{t('settingsExpanded.resetAllSettings')}</h3>
            <p className={styles.settingsModalCopy}>
              {ar
                ? 'سيؤدي هذا إلى استعادة الإعدادات الافتراضية للتنبيهات والخصوصية والعرض.'
                : 'This will restore the original configuration for notifications, privacy, and display.'}
            </p>
            <div className={styles.settingsModalActions}>
              <button
                onClick={() => setShowResetConfirm(false)}
                className={styles.settingsModalButtonSecondary}
              >
                {t('settingsExpanded.cancel')}
              </button>
              <button onClick={resetToDefaults} className={styles.settingsModalButtonDanger}>
                {t('settingsExpanded.reset')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

