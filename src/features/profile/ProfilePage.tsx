/**
 * ProfilePage - /app/profile
 */
import { useEffect, useRef } from 'react';
import { Bell, Camera, Car, CheckCircle, Clock, CreditCard, LogOut, Settings, Shield, Star, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
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
    background: '#0A1628',
    border: '1px solid rgba(0,200,232,0.3)',
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
  photoInputRef: React.RefObject<HTMLInputElement | null>;
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
    photoInputRef,
  });

  const initials = getProfileInitials(user.name);

  useEffect(() => {
    if (editingField !== 'name') setNameInput(user.name ?? '');
    if (editingField !== 'phone') setPhoneInput(user.phone ?? '');
  }, [editingField, setNameInput, setPhoneInput, user.name, user.phone]);

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
          <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelection} style={{ display: 'none' }} />
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
                boxShadow: '0 0 0 3px rgba(0,200,232,0.35), 0 8px 32px rgba(0,200,232,0.2)',
                overflow: 'hidden',
              }}
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <button
              title={ar ? 'تغيير الصورة' : 'Change photo'}
              onClick={() => photoInputRef.current?.click()}
              disabled={savingField === 'photo'}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#1E293B', border: `2px solid ${BG}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: savingField === 'photo' ? 'not-allowed' : 'pointer', opacity: savingField === 'photo' ? 0.65 : 1 }}
            >
              {savingField === 'photo' ? <Clock size={12} color={CYAN} /> : <Camera size={12} color={CYAN} />}
            </button>
          </div>

          {editingField === 'name' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', maxWidth: 320 }}>
              <input
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                autoFocus
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${CYAN}`, background: 'rgba(0,200,232,0.07)', color: '#EFF6FF', fontSize: '0.9rem', fontFamily: FONT, outline: 'none' }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleSaveName();
                  if (event.key === 'Escape') setEditingField(null);
                }}
                maxLength={60}
              />
              <button onClick={() => void handleSaveName()} disabled={savingField !== null} style={{ padding: '8px 14px', borderRadius: 8, background: CYAN, border: 'none', color: '#040C18', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', fontFamily: FONT }}>
                {savingField === 'name' ? '...' : (ar ? 'حفظ' : 'Save')}
              </button>
              <button onClick={() => setEditingField(null)} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORD}`, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: FONT }}>
                {ar ? 'إلغاء' : 'Cancel'}
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
                  {ar ? 'ملف مباشر' : 'Live profile'}
                </span>
              </div>
              <button onClick={() => { setNameInput(user.name); setEditingField('name'); }} style={{ fontSize: '0.72rem', color: CYAN, background: 'none', border: 'none', cursor: 'pointer', marginTop: 8, fontFamily: FONT }}>
                {ar ? 'تعديل الاسم' : 'Edit name'}
              </button>
            </div>
          )}

          <SharedVerificationBadge level={user.verificationLevel ?? 'level_0'} ar={ar} accent={CYAN} />
          <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.82rem', fontFamily: FONT, margin: 0 }}>{user.email}</p>
          <p style={{ color: 'rgba(148,163,184,0.72)', fontSize: '0.76rem', fontFamily: FONT, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            {ar ? `درجة الثقة ${user.trustScore}/100 - ${trustTier}` : `Trust score ${user.trustScore}/100 - ${trustTier}`}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          <SharedStatCard label={ar ? 'رحلات' : 'Trips'} value={user.trips ?? 0} icon={<Car size={16} />} color={CYAN} />
          <SharedStatCard label={ar ? 'تقييم' : 'Rating'} value={(user.rating ?? 5).toFixed(1)} icon={<Star size={16} />} color="#F59E0B" />
          <SharedStatCard label={ar ? 'الثقة' : 'Trust'} value={`${user.trustScore}/100`} icon={<Shield size={16} />} color="#22C55E" />
          <SharedStatCard label={ar ? 'الرصيد' : 'Balance'} value={`JOD ${(user.balance ?? 0).toFixed(1)}`} icon={<CreditCard size={16} />} color="#A78BFA" />
        </div>

        <SharedSection title={ar ? 'مركز الحساب' : 'Account Command Center'}>
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

        <SharedSection title={ar ? 'صحة الحساب' : 'Account Health'}>
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
          {verificationItems.map((item) => (
            <SharedRow
              key={item.label}
              label={item.label}
              value={item.status}
              icon={<Shield size={15} />}
              badge={
                <span style={{ fontSize: '0.65rem', color: item.color, background: `${item.color}1A`, padding: '3px 8px', borderRadius: 999, fontFamily: FONT, fontWeight: 700 }}>
                  {item.status}
                </span>
              }
              onClick={() => nav('/app/settings?section=account')}
            />
          ))}
          <SharedRow
            label={ar ? 'الوضع التشغيلي' : 'Operational standing'}
            value={ar ? `${trustTier} - عضو منذ ${joinedText}` : `${trustTier} - Member since ${joinedText}`}
            icon={<CheckCircle size={15} />}
            onClick={() => nav('/app/my-trips')}
          />
        </SharedSection>

        <SharedSection title={ar ? 'تعديلات سريعة' : 'Quick Edits'}>
          <div style={{ padding: 18, display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.72)', fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {ar ? 'رقم الهاتف' : 'Phone number'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={phoneInput}
                  onChange={(event) => setPhoneInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleSavePhone();
                    if (event.key === 'Escape') setEditingField(null);
                  }}
                  onFocus={() => setEditingField('phone')}
                  placeholder="+962791234567"
                  style={{ flex: '1 1 220px', minWidth: 0, padding: '10px 12px', borderRadius: 10, border: `1px solid ${editingField === 'phone' ? CYAN : BORD}`, background: 'rgba(0,200,232,0.07)', color: '#EFF6FF', fontSize: '0.88rem', fontFamily: FONT, outline: 'none' }}
                />
                <button onClick={() => void handleSavePhone()} disabled={savingField !== null} style={{ padding: '10px 14px', borderRadius: 10, background: CYAN, border: 'none', color: '#040C18', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', fontFamily: FONT }}>
                  {savingField === 'phone' ? '...' : (ar ? 'حفظ الهاتف' : 'Save phone')}
                </button>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'rgba(148,163,184,0.7)', fontFamily: FONT }}>
                {ar ? 'يُستخدم للتنبيهات والتحقق وتنسيق الرحلات.' : 'Used for alerts, verification, and ride coordination.'}
              </div>
            </div>
          </div>
        </SharedSection>

        <SharedSection title={ar ? 'الحساب' : 'Account'}>
          <SharedRow label={ar ? 'الهاتف' : 'Phone number'} value={user.phone ?? (ar ? 'لم يُضف بعد' : 'Not added')} icon={<span>📱</span>} onClick={() => nav('/app/settings?section=phone')} />
          <SharedRow label={ar ? 'التحقق من الهوية' : 'ID Verification'} value={ar ? 'سند eKYC' : 'Sanad eKYC'} icon={<Shield size={15} />} badge={<SharedVerificationBadge level={user.verificationLevel ?? 'level_0'} ar={ar} accent={CYAN} />} onClick={() => nav('/app/trust')} />
          <SharedRow label={ar ? 'اللغة' : 'Language'} value={ar ? 'العربية' : 'English'} icon={<span>🌐</span>} onClick={() => nav('/app/settings?section=account')} />
          <SharedRow
            label={ar ? 'الإشعارات' : 'Notifications'}
            value={permissionStatus.label}
            icon={<Bell size={15} />}
            badge={
              <span style={{ fontSize: '0.65rem', color: permissionStatus.color, background: `${permissionStatus.color}1A`, padding: '3px 8px', borderRadius: 999, fontFamily: FONT, fontWeight: 700 }}>
                {permissionStatus.label}
              </span>
            }
            onClick={() => void handleNotificationSetup()}
          />
        </SharedSection>

        {(user.role === 'driver' || user.role === 'both') && (
          <SharedSection title={ar ? 'وضع السائق' : 'Driver Mode'}>
            <SharedRow label={ar ? 'سيارتي' : 'My Vehicle'} value={ar ? 'تويوتا كورولا 2021' : 'Toyota Corolla 2021'} icon={<Car size={15} />} onClick={() => nav('/app/settings?section=account')} />
            <SharedRow
              label={ar ? 'المستندات' : 'Documents'}
              value={ar ? 'رخصة + تأمين + ترخيص' : 'License · Insurance · Registration'}
              icon={<span>📄</span>}
              badge={<CheckCircle size={14} color="#22C55E" />}
              onClick={() => nav('/app/trust')}
            />
            <SharedRow label={ar ? 'الأرباح' : 'Earnings'} icon={<span>💰</span>} onClick={() => nav('/app/wallet')} />
          </SharedSection>
        )}

        <SharedSection title={ar ? 'التفضيلات' : 'Preferences'}>
          <SharedRow label={ar ? 'تفضيل الجنس' : 'Gender Preference'} value={ar ? 'مختلط (افتراضي)' : 'Mixed (default)'} icon={<span>👥</span>} onClick={() => nav('/app/settings?section=account')} />
          <SharedRow label={ar ? 'العملة' : 'Currency'} value="JOD" icon={<span>💱</span>} onClick={() => nav('/app/settings?section=account')} />
          <SharedRow label={ar ? 'الإعدادات المتقدمة' : 'Advanced Settings'} icon={<Settings size={15} />} onClick={() => nav('/app/settings?section=account')} />
        </SharedSection>

        <SharedSection title={ar ? 'الأمان' : 'Security'}>
          <SharedRow label={ar ? 'تغيير كلمة المرور' : 'Change Password'} icon={<span>🔑</span>} onClick={() => nav('/app/settings?section=security')} />
          <SharedRow
            label={ar ? 'التحقق الثنائي (2FA)' : 'Two-Factor Auth (2FA)'}
            badge={
              <span style={{ fontSize: '0.65rem', color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '2px 7px', borderRadius: 999, fontFamily: FONT, fontWeight: 700 }}>
                {user.twoFactorEnabled ? (ar ? 'مفعل' : 'On') : (ar ? 'غير مفعل' : 'Off')}
              </span>
            }
            icon={<span>🛡️</span>}
            onClick={() => nav('/app/settings?section=security')}
          />
          <SharedRow label={ar ? 'الأجهزة المسجلة' : 'Active Sessions'} icon={<span>💻</span>} onClick={() => nav('/app/settings?section=security')} />
        </SharedSection>

        <SharedSection title={ar ? 'القانوني' : 'Legal'}>
          <SharedRow label={ar ? 'سياسة الخصوصية' : 'Privacy Policy'} icon={<span>📋</span>} onClick={() => nav('/app/privacy')} />
          <SharedRow label={ar ? 'شروط الخدمة' : 'Terms of Service'} icon={<span>📜</span>} onClick={() => nav('/app/terms')} />
        </SharedSection>

        <SharedSection title={ar ? 'منطقة الخطر' : 'Danger Zone'}>
          <SharedRow label={ar ? 'تصدير بياناتي' : 'Export My Data'} icon={<span>📦</span>} onClick={handleExportData} />
          <SharedRow label={ar ? 'طلب حذف الحساب' : 'Request Account Deletion'} danger icon={<span>🗑️</span>} onClick={() => setShowDeleteConfirm(true)} />
          <SharedRow
            label={ar ? 'تسجيل الخروج' : 'Sign Out'}
            danger
            icon={<LogOut size={15} />}
            onClick={() => void handleSignOut()}
          />
        </SharedSection>

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(148,163,184,0.35)', fontFamily: FONT }}>
          <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          {user.joinedAt
            ? (ar ? `عضو منذ ${joinedText}` : `Member since ${joinedText}`)
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
                onClick={() => void handleDeletionContinue()}
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
