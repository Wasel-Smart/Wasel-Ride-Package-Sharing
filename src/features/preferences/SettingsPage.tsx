/**
 * SettingsPage - /app/settings
 * App-wide settings plus real account editing flows.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Bell, ChevronRight, Eye, Globe, Palette, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { StakeholderSignalBanner } from '../../components/system/StakeholderSignalBanner';
import { ThemeSwitcher } from '../../components/system/ThemeSwitcher';
import { normalizeProfilePhone } from '../../features/profile/profileUtils';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import type { Language } from '../../locales/translations';
import {
  getCommunicationCapabilities,
  type CommunicationPreferences,
} from '../../services/communicationPreferences';
import {
  defaultDisplaySettings,
  defaultPrivacySettings,
  userSettingsService,
  type DisplaySettings,
  type PrivacySettings,
  type UserSettings,
} from '../../services/userSettingsService';
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
import type { ThemePreference } from '../../utils/theme';
import { omitUndefined } from '../../utils/object';
import { ClarityBand, PageShell, SectionHead } from '../shared/pageShared';
import { PAGE_DS } from '../../styles/wasel-page-theme';

const DS = PAGE_DS;
const BORD = DS.border;
const CYAN = DS.cyan;
const FONT = DS.F;
const DISPLAY_FONT = DS.FD;
const TEXT = DS.text;
const SOFT = DS.muted;
const FIELD_BG = 'var(--surface-field)';
const SOFT_SURFACE = 'var(--surface-muted)';
const SOFT_SURFACE_STRONG = 'var(--surface-muted-strong)';

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
        <span style={{ color: CYAN, fontSize: '0.9rem' }}>{icon}</span>
        <h2
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: SOFT,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: FONT,
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      <div
        style={{
          background: 'var(--wasel-panel-strong)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          border: `1px solid ${BORD}`,
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: 'var(--wasel-shadow-lg)',
          transition: 'box-shadow 0.18s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="w-focus"
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: value ? 'var(--accent)' : SOFT_SURFACE_STRONG,
        border: `1px solid ${value ? 'rgb(var(--accent-secondary-rgb) / 0.35)' : BORD}`,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s, border-color 0.2s',
        flexShrink: 0,
        boxShadow: value ? `0 12px 28px ${CYAN}30` : 'none',
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
          background: 'var(--bg-secondary)',
          transition: 'left 0.2s',
          boxShadow: 'var(--wasel-shadow-sm)',
        }}
      />
    </button>
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: `1px solid ${BORD}`,
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: TEXT, fontFamily: FONT }}>
          {label}
        </div>
        {sub ? (
          <div
            style={{
              marginTop: 4,
              fontSize: '0.72rem',
              color: SOFT,
              fontFamily: FONT,
              lineHeight: 1.55,
            }}
          >
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: `1px solid ${BORD}`,
        gap: 12,
      }}
    >
      <div
        style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: TEXT, fontFamily: FONT }}
      >
        {label}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: FIELD_BG,
          border: `1px solid ${BORD}`,
          borderRadius: 14,
          color: TEXT,
          fontFamily: FONT,
          fontSize: '0.8rem',
          padding: '7px 12px',
          cursor: 'pointer',
          outline: 'none',
          backdropFilter: 'blur(16px)',
        }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
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
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '16px 20px',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${BORD}`,
        cursor: 'pointer',
        gap: 12,
        textAlign: 'left',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: TEXT, fontFamily: FONT }}>
          {label}
        </div>
        {sub ? (
          <div
            style={{
              marginTop: 4,
              fontSize: '0.72rem',
              color: SOFT,
              fontFamily: FONT,
              lineHeight: 1.55,
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
      <ChevronRight size={14} color={SOFT} />
    </button>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const styles = {
    primary: {
      background: DS.gradC,
      color: 'var(--text-inverse)',
      border: '1px solid rgb(255 255 255 / 0.18)',
      boxShadow: 'var(--wasel-shadow-teal)',
    },
    secondary: {
      background: SOFT_SURFACE,
      color: TEXT,
      border: `1px solid ${BORD}`,
      backdropFilter: 'blur(16px)',
    },
    danger: {
      background: 'rgb(var(--danger-rgb) / 0.12)',
      color: 'var(--danger)',
      border: '1px solid rgb(var(--danger-rgb) / 0.24)',
    },
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-focus"
      style={{
        minHeight: 42,
        borderRadius: 999,
        padding: '0 16px',
        fontFamily: FONT,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease',
        ...styles[variant],
      }}
    >
      {label}
    </button>
  );
}

function FormField({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        minHeight: 46,
        padding: '0 14px',
        borderRadius: 16,
        border: `1px solid ${BORD}`,
        background: FIELD_BG,
        color: TEXT,
        fontFamily: FONT,
        outline: 'none',
        backdropFilter: 'blur(16px)',
      }}
    />
  );
}

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { changePassword, profile, refreshProfile, resetPassword, updateProfile } = useAuth();
  const { user, updateUser } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';
  const notificationCapabilities = useMemo(
    () =>
      getCommunicationCapabilities(
        omitUndefined({
          email: user?.email ?? profile?.email,
          phone: user?.phone ?? profile?.phone_number,
        }),
      ),
    [profile?.email, profile?.phone_number, user?.email, user?.phone],
  );
  const accountRef = useRef<HTMLDivElement | null>(null);
  const securityRef = useRef<HTMLDivElement | null>(null);
  const hydratedSettingsRef = useRef(false);
  const twoFactorSupported = isTwoFactorAvailable();

  const [phoneInput, setPhoneInput] = useState(user?.phone ?? '');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);

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
  const [privacy, setPrivacy] = useState<PrivacySettings>(defaultPrivacySettings);
  const [display, setDisplay] = useState<DisplaySettings>({
    ...defaultDisplaySettings,
    direction: ar ? 'rtl' : 'ltr',
    language,
    theme,
  });

  const passwordStrength = useMemo(() => checkPasswordStrength(passwordInput), [passwordInput]);
  const twoFactorEnabled = Boolean(user?.twoFactorEnabled ?? profile?.two_factor_enabled);

  useEffect(() => {
    setPhoneInput(user?.phone ?? '');
  }, [user?.phone]);

  useEffect(() => {
    setDisplay(previous => ({
      ...previous,
      language,
      theme,
      direction: language === 'ar' ? 'rtl' : 'ltr',
    }));
    setNotifs(previous => ({
      ...previous,
      preferredLanguage: language === 'ar' ? 'ar' : 'en',
    }));
  }, [language, theme]);

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

    const loadSettings = async () => {
      try {
        const settings = await userSettingsService.getUserSettings();
        if (cancelled) return;

        hydratedSettingsRef.current = true;
        setNotifs(settings.notifications);
        setPrivacy(settings.privacy);
        setDisplay(settings.display);
        if (settings.display.language !== language) {
          setLanguage(settings.display.language);
        }
        if (settings.display.theme !== theme) {
          setTheme(settings.display.theme);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Settings could not be loaded.');
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [language, setLanguage, setTheme, theme, user?.id]);

  const persistSettings = async (
    patch: Partial<UserSettings>,
    savingKey: string,
    options?: { quiet?: boolean },
  ) => {
    setNotificationSavingKey(savingKey);

    try {
      const next = await userSettingsService.updateUserSettings(patch);
      hydratedSettingsRef.current = true;
      setNotifs(next.notifications);
      setPrivacy(next.privacy);
      setDisplay(next.display);
      if (next.display.language !== language) {
        setLanguage(next.display.language);
      }
      if (next.display.theme !== theme) {
        setTheme(next.display.theme);
      }
      if (!options?.quiet) {
        toast.success('Saved.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Settings could not be saved.');
    } finally {
      setNotificationSavingKey(null);
    }
  };

  const saveNotificationPreferences = async (
    updates: Partial<CommunicationPreferences>,
    savingKey: string,
  ) => {
    const next = { ...notifs, ...updates };
    setNotifs(next);
    await persistSettings({ notifications: next }, savingKey);
  };

  const toggleNotificationPreference =
    (key: keyof CommunicationPreferences) => (value: boolean) => {
      void saveNotificationPreferences({ [key]: value } as Partial<CommunicationPreferences>, key);
    };

  const updatePrivacySetting =
    (key: keyof PrivacySettings) => (value: boolean) => {
      const next = { ...privacy, [key]: value };
      setPrivacy(next);
      void persistSettings({ privacy: next }, key);
    };

  const updateDisplaySettings = (updates: Partial<DisplaySettings>, savingKey: string) => {
    const next = { ...display, ...updates };
    setDisplay(next);
    void persistSettings({ display: next }, savingKey);
  };

  useEffect(() => {
    if (!hydratedSettingsRef.current || display.theme === theme) {
      return;
    }

    const nextDisplay = {
      ...display,
      theme,
    };
    setDisplay(nextDisplay);
    void persistSettings({ display: nextDisplay }, 'theme', { quiet: true });
  }, [display, theme]);

  const openSupportLink = (url: string, emptyMessage: string) => {
    if (!url) {
      toast.error(emptyMessage);
      return;
    }

    if (/^https?:/i.test(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    window.location.href = url;
  };

  const savePhone = async () => {
    const normalized = normalizeProfilePhone(phoneInput);
    if (normalized === null) {
      toast.error('Please enter a valid phone number.');
      return;
    }
    if ((normalized || '') === (user?.phone ?? '')) {
      toast.message('There is nothing new to save.');
      return;
    }

    setPhoneSaving(true);
    const { error } = await updateProfile({ phone_number: normalized || null });
    setPhoneSaving(false);

    if (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }

    updateUser(
      omitUndefined({
        phone: normalized || undefined,
        phoneVerified: false,
      }),
    );
    toast.success(normalized ? 'Phone number saved.' : 'Phone number removed.');
  };

  const savePassword = async () => {
    if (!passwordInput) {
      toast.error('Enter a new password.');
      return;
    }
    if (!passwordStrength.isValid) {
      toast.error('The new password is too weak.');
      return;
    }
    if (passwordInput !== confirmPassword) {
      toast.error('The passwords do not match.');
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
    toast.success('Password updated.');
  };

  const sendResetLink = async () => {
    if (!user?.email) {
      toast.error('No email is associated with this account.');
      return;
    }

    const { error } = await resetPassword(user.email);
    if (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }

    toast.success(`Reset link sent to ${user.email}`);
  };

  const turnOnTwoFactor = async () => {
    if (!user) {
      toast.error('Please sign in first.');
      return;
    }
    if (!twoFactorSupported) {
      toast.error('Two-factor authentication is not available in this environment.');
      return;
    }

    try {
      setTwoFactorSaving(true);
      const setup = await enable2FA(user.id);
      setTwoFactorSetup(setup);
      setTwoFactorCode('');
      toast.success(
        'Scan the QR code, save your backup codes, then confirm with a 6-digit authenticator code.',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const confirmTwoFactorSetup = async () => {
    if (!user) {
      toast.error('Please sign in first.');
      return;
    }
    if (!twoFactorCode.trim()) {
      toast.error('Enter the 6-digit authenticator code to finish setup.');
      return;
    }

    try {
      setTwoFactorSaving(true);
      const verified = await verify2FACode(user.id, twoFactorCode.trim());
      if (!verified) {
        toast.error('That verification code could not be confirmed.');
        return;
      }

      setTwoFactorCode('');
      setTwoFactorSetup(null);
      updateUser({ twoFactorEnabled: true });
      await refreshProfile();
      toast.success('Two-factor authentication enabled.');
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const turnOffTwoFactor = async () => {
    if (!user) {
      toast.error('Please sign in first.');
      return;
    }
    if (!twoFactorCode.trim()) {
      toast.error('Enter your authenticator code or a backup code.');
      return;
    }

    try {
      setTwoFactorSaving(true);
      const disabled = await disable2FA(user.id, twoFactorCode.trim());
      if (!disabled) {
        toast.error('That verification code could not be confirmed.');
        return;
      }

      setTwoFactorCode('');
      setTwoFactorSetup(null);
      updateUser({ twoFactorEnabled: false });
      await refreshProfile();
      toast.success('Two-factor authentication disabled.');
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const exportData = () => {
    if (!user) {
      toast.error('Please sign in first.');
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
    toast.success('Account data exported.');
  };

  const sessionSummary = user ? 'Active on this device' : 'Sign in to view sessions';
  const activeChannelCount = [
    notifs.inApp,
    notifs.push && notificationCapabilities.push,
    notifs.email && notificationCapabilities.email,
    notifs.sms && notificationCapabilities.sms,
    notifs.whatsapp && notificationCapabilities.whatsapp,
  ].filter(Boolean).length;

  return (
    <PageShell>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <SectionHead
          emoji="⚙️"
          title="Settings"
          sub="Control notifications, privacy, security, and account preferences inside the same Wasel glass system."
          color={CYAN}
        />

        {Boolean((globalThis as { __showStakeholderBanner?: boolean }).__showStakeholderBanner) && (
          <div style={{ marginBottom: 22 }}>
            <StakeholderSignalBanner
              dir={ar ? 'rtl' : 'ltr'}
              eyebrow="Wasel · account comms"
              title="Account and alert settings in one place"
              detail="Keep support, trust, and notification choices clear before they matter."
              stakeholders={[
                { label: 'Active channels', value: String(activeChannelCount), tone: 'teal' },
                {
                  label: 'Critical alerts',
                  value: notifs.criticalAlerts ? 'On' : 'Off',
                  tone: notifs.criticalAlerts ? 'green' : 'rose',
                },
                {
                  label: 'Preferred language',
                  value: notifs.preferredLanguage.toUpperCase(),
                  tone: 'blue',
                },
                {
                  label: 'Phone ready',
                  value: notificationCapabilities.sms ? 'Yes' : 'No',
                  tone: notificationCapabilities.sms ? 'green' : 'amber',
                },
              ]}
              statuses={[
                {
                  label: 'Push delivery',
                  value: notificationCapabilities.push ? 'Available' : 'Unavailable',
                  tone: notificationCapabilities.push ? 'green' : 'amber',
                },
                {
                  label: '2FA',
                  value: twoFactorEnabled ? 'Enabled' : 'Not enabled',
                  tone: twoFactorEnabled ? 'green' : 'rose',
                },
                {
                  label: 'Profile visibility',
                  value: privacy.showProfile ? 'Shared' : 'Private',
                  tone: privacy.showProfile ? 'blue' : 'slate',
                },
              ]}
              lanes={[
                {
                  label: 'Notification routing',
                  detail:
                    'In-app, email, SMS, and WhatsApp preferences are now treated as one delivery policy.',
                },
                {
                  label: 'Support handoff',
                  detail:
                    'Support email, phone, SMS, and WhatsApp links stay close to the same preference surface.',
                },
                {
                  label: 'Trust controls',
                  detail:
                    'Security settings, 2FA, and account contact details now reinforce the same escalation story.',
                },
              ]}
            />
          </div>
        )}

        <ClarityBand
          title="Keep account controls easy to scan."
          detail="Notifications, privacy, and security belong in one place, but the next adjustment should still be obvious."
          tone={CYAN}
          items={[
            { label: '1. Alerts', value: 'Turn on the channels you actually want to hear from.' },
            { label: '2. Privacy', value: 'Decide what profile and trip data stays visible.' },
            {
              label: '3. Security',
              value: 'Use password health and 2FA before the next critical trip.',
            },
          ]}
        />

        <Section icon={<Bell size={16} />} title="Notifications">
          <ToggleRow
            label="Trip Updates"
            sub="Accept, cancel, confirm"
            value={notifs.tripUpdates}
            onChange={toggleNotificationPreference('tripUpdates')}
          />
          <ToggleRow
            label="New Booking Requests"
            sub="Drivers only"
            value={notifs.bookingRequests}
            onChange={toggleNotificationPreference('bookingRequests')}
          />
          <ToggleRow
            label="Messages"
            value={notifs.messages}
            onChange={toggleNotificationPreference('messages')}
          />
          <ToggleRow
            label="Prayer Time Reminders"
            sub="On long-distance routes"
            value={notifs.prayerReminders}
            onChange={toggleNotificationPreference('prayerReminders')}
          />
          <ToggleRow
            label="Promotions & Offers"
            value={notifs.promotions}
            onChange={toggleNotificationPreference('promotions')}
          />
          <ToggleRow
            label="Push Notifications"
            sub={
              notificationCapabilities.push
                ? 'Browser push is available on this device.'
                : 'Browser push is unavailable on this device.'
            }
            value={notifs.push}
            onChange={toggleNotificationPreference('push')}
          />
          <ToggleRow
            label="SMS Alerts"
            sub={
              notificationCapabilities.sms
                ? `Ready for ${user?.phone ?? profile?.phone_number ?? 'your saved phone'}`
                : 'Add a phone number to enable SMS delivery.'
            }
            value={notifs.sms}
            onChange={toggleNotificationPreference('sms')}
          />
          <ToggleRow
            label="Email Notifications"
            sub={
              notificationCapabilities.email
                ? `Ready for ${user?.email ?? profile?.email ?? 'your account email'}`
                : 'Add an email address to enable email delivery.'
            }
            value={notifs.email}
            onChange={toggleNotificationPreference('email')}
          />
          <ToggleRow
            label="WhatsApp Alerts"
            sub={
              notificationCapabilities.whatsapp
                ? 'High-priority WhatsApp delivery is available.'
                : 'Add a phone number and support WhatsApp routing to enable this.'
            }
            value={notifs.whatsapp}
            onChange={toggleNotificationPreference('whatsapp')}
          />
          <ToggleRow
            label="Critical Safety Alerts"
            sub="Security, wallet, verification, and urgent operations updates"
            value={notifs.criticalAlerts}
            onChange={toggleNotificationPreference('criticalAlerts')}
          />
          <div style={{ padding: '14px 18px', fontSize: '0.72rem', color: SOFT, fontFamily: FONT }}>
            {notificationSavingKey ? 'Saving...' : 'Notification settings sync automatically.'}
          </div>
          <LinkRow
            label="Email Support"
            sub="Open your default mail app with a prefilled Wasel support draft"
            onClick={() =>
              openSupportLink(
                getSupportEmailUrl('Wasel support request'),
                'Support email is not configured for this environment.',
              )
            }
          />
          <LinkRow
            label="SMS Support"
            sub="Open your phone’s SMS app for quick support escalation"
            onClick={() =>
              openSupportLink(
                getSmsSupportUrl('Hi Wasel support team'),
                'Support SMS is not configured for this environment.',
              )
            }
          />
          <LinkRow
            label="WhatsApp Support"
            sub="Open direct WhatsApp support chat when available"
            onClick={() =>
              openSupportLink(
                getWhatsAppSupportUrl('Hi Wasel support team'),
                'Support WhatsApp is not configured for this environment.',
              )
            }
          />
          <LinkRow
            label="Call Support"
            sub="Immediate voice support handoff"
            onClick={() =>
              openSupportLink(
                getSupportPhoneUrl(),
                'Support phone is not configured for this environment.',
              )
            }
          />
        </Section>

        <Section icon={<Globe size={16} />} title="Language & Region">
          <SelectRow
            label="Language"
            options={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'العربية' },
            ]}
            value={display.language}
            onChange={value => {
              const nextLanguage = (value === 'ar' ? 'ar' : 'en') as Language;
              setLanguage(nextLanguage);
              updateDisplaySettings(
                {
                  direction: nextLanguage === 'ar' ? 'rtl' : 'ltr',
                  language: nextLanguage,
                },
                'language',
              );
            }}
          />
          <SelectRow
            label="Currency"
            options={[
              { value: 'JOD', label: 'JOD - Jordanian Dinar' },
              { value: 'USD', label: 'USD - US Dollar' },
              { value: 'EUR', label: 'EUR - Euro' },
              { value: 'SAR', label: 'SAR - Saudi Riyal' },
            ]}
            value={display.currency}
            onChange={value => updateDisplaySettings({ currency: value }, 'currency')}
          />
        </Section>

        <Section icon={<Palette size={16} />} title="Theme">
          <ThemeSwitcher />
        </Section>

        <Section icon={<Eye size={16} />} title="Privacy">
          <ToggleRow
            label="Show Profile to Others"
            sub="Passengers & drivers"
            value={privacy.showProfile}
            onChange={updatePrivacySetting('showProfile')}
          />
          <ToggleRow
            label="Hide Profile Photo"
            sub="Only name is shown"
            value={privacy.hidePhoto}
            onChange={updatePrivacySetting('hidePhoto')}
          />
          <ToggleRow
            label="Share Live Location"
            sub="During active trips only"
            value={privacy.shareLocation}
            onChange={updatePrivacySetting('shareLocation')}
          />
          <ToggleRow
            label="Analytics & Improvement"
            sub="Anonymous usage data"
            value={privacy.dataAnalytics}
            onChange={updatePrivacySetting('dataAnalytics')}
          />
        </Section>

        <div ref={securityRef}>
          <Section icon={<Shield size={16} />} title="Security">
            <div style={{ padding: 18, display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div
                  style={{ fontSize: '0.82rem', fontWeight: 700, color: TEXT, fontFamily: FONT }}
                >
                  Change Password
                </div>
                <FormField
                  value={passwordInput}
                  onChange={setPasswordInput}
                  type="password"
                  placeholder="New password"
                />
                <FormField
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  type="password"
                  placeholder="Confirm new password"
                />
                <div
                  style={{
                    fontSize: '0.74rem',
                    color: getPasswordStrengthColor(passwordStrength.score),
                    fontFamily: FONT,
                  }}
                >
                  {passwordInput
                    ? `Strength: ${getPasswordStrengthLabel(passwordStrength.score)}`
                    : 'Use a strong password with at least 8 characters.'}
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <div
                    style={{ fontSize: '0.72rem', color: SOFT, fontFamily: FONT, lineHeight: 1.5 }}
                  >
                    {passwordStrength.feedback.join(' · ')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <ActionButton
                    label={passwordSaving ? 'Saving...' : 'Update Password'}
                    onClick={() => {
                      void savePassword();
                    }}
                    disabled={!user || passwordSaving}
                  />
                  <ActionButton
                    label="Send Reset Link"
                    onClick={() => {
                      void sendResetLink();
                    }}
                    disabled={!user?.email}
                    variant="secondary"
                  />
                </div>
              </div>

              <div style={{ height: 1, background: BORD }} />

              <div style={{ display: 'grid', gap: 12 }}>
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
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: TEXT,
                        fontFamily: FONT,
                      }}
                    >
                      Two-Factor Authentication
                    </div>
                    <div
                      style={{ fontSize: '0.72rem', color: SOFT, fontFamily: FONT, marginTop: 4 }}
                    >
                      {!twoFactorSupported
                        ? 'Unavailable on this device or in this environment.'
                        : twoFactorEnabled
                          ? 'Enabled on this account.'
                          : twoFactorSetup
                            ? 'Finish setup with your authenticator code to turn protection on.'
                            : 'Add an extra code layer to protect this account.'}
                    </div>
                  </div>
                  <ActionButton
                    label={
                      twoFactorSaving
                        ? 'Updating...'
                        : twoFactorEnabled
                          ? 'Disable 2FA'
                          : twoFactorSetup
                            ? 'Confirm 2FA'
                            : 'Start 2FA Setup'
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
                  <div style={{ display: 'grid', gap: 10 }}>
                    <FormField
                      value={twoFactorCode}
                      onChange={setTwoFactorCode}
                      placeholder={
                        twoFactorEnabled
                          ? 'Authenticator code or backup code'
                          : '6-digit authenticator code to confirm setup'
                      }
                    />
                    <div style={{ fontSize: '0.72rem', color: SOFT, fontFamily: FONT }}>
                      {twoFactorEnabled
                        ? 'Use this field when disabling 2FA or testing backup codes.'
                        : 'Enter a code from your authenticator app to finish enabling 2FA.'}
                    </div>
                  </div>
                )}

                {twoFactorSetup && (
                  <div
                    style={{
                      display: 'grid',
                      gap: 12,
                      background: SOFT_SURFACE,
                      border: `1px solid ${BORD}`,
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: TEXT,
                        fontFamily: FONT,
                        fontWeight: 700,
                      }}
                    >
                      Current setup details
                    </div>
                    <a
                      href={twoFactorSetup.otpauthUrl}
                      style={{
                        color: CYAN,
                        fontFamily: FONT,
                        fontSize: '0.74rem',
                        wordBreak: 'break-all',
                      }}
                    >
                      Open your authenticator app with this `otpauth://` link
                    </a>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: SOFT,
                        fontFamily: FONT,
                        lineHeight: 1.5,
                      }}
                    >
                      Secret: <span style={{ color: TEXT }}>{twoFactorSetup.secret}</span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: SOFT,
                        fontFamily: FONT,
                        lineHeight: 1.6,
                      }}
                    >
                      Backup codes: {twoFactorSetup.backupCodes.join(' · ')}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.78rem', color: SOFT, fontFamily: FONT }}>
                  {sessionSummary}
                </div>
              </div>
            </div>
          </Section>
        </div>

        <div ref={accountRef}>
          <Section icon={<Palette size={16} />} title="Account">
            <div style={{ padding: 18, display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div
                  style={{ fontSize: '0.82rem', fontWeight: 700, color: TEXT, fontFamily: FONT }}
                >
                  Phone Number
                </div>
                <FormField
                  value={phoneInput}
                  onChange={setPhoneInput}
                  type="tel"
                  placeholder="+962791234567"
                />
                <div
                  style={{ fontSize: '0.72rem', color: SOFT, fontFamily: FONT, lineHeight: 1.5 }}
                >
                  {user?.phoneVerified
                    ? 'Your phone is currently verified.'
                    : user?.phone
                      ? 'The phone is saved but still pending verification.'
                      : 'Used for alerts and trip coordination.'}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <ActionButton
                    label={phoneSaving ? 'Saving...' : 'Save Phone'}
                    onClick={() => {
                      void savePhone();
                    }}
                    disabled={!user || phoneSaving}
                  />
                  <ActionButton
                    label="Open Profile"
                    onClick={() => nav('/app/profile')}
                    variant="secondary"
                  />
                </div>
              </div>

              <div style={{ height: 1, background: BORD }} />

              <LinkRow label="Privacy Policy" onClick={() => nav('/app/privacy')} />
              <LinkRow label="Terms of Service" onClick={() => nav('/app/terms')} />
              <LinkRow
                label="Export My Data"
                sub="Download your current account data as JSON"
                onClick={exportData}
              />
            </div>
          </Section>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: '0.7rem',
            color: SOFT,
            fontFamily: DISPLAY_FONT,
            marginTop: 8,
            opacity: 0.72,
          }}
        >
          Wasel v1.0.0 · wasel14.online
        </p>
      </div>
    </PageShell>
  );
}
