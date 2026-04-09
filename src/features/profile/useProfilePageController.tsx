import { useState, type ChangeEvent, type ReactNode } from 'react';
import { Bell, Car, CreditCard, Settings } from 'lucide-react';
import type { WaselUser } from '../../contexts/LocalAuth';
import { sanitizeText } from '../../utils/sanitize';
import {
  buildProfileExportPayload,
  normalizeProfilePhone,
} from './profileUtils';

export const PROFILE_BG = '#061726';
export const PROFILE_BORDER = 'rgba(93,150,210,0.14)';
export const PROFILE_CYAN = '#47B7E6';
export const PROFILE_FONT = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

export type SavingField = 'name' | 'phone' | 'photo' | null;

export interface ProfileStatusChip {
  label: string;
  color: string;
}

export interface ProfileQuickAction {
  label: string;
  detail: string;
  icon: ReactNode;
  color: string;
  onClick: () => void;
}

export interface ProfileVerificationItem {
  label: string;
  status: string;
  color: string;
}

interface NotificationSupport {
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
}

interface UseProfilePageControllerArgs {
  user: WaselUser;
  ar: boolean;
  nav: (path: string) => void;
  updateProfile: (
    updates: Record<string, unknown>,
  ) => Promise<{ error: unknown }>;
  notificationSupport: NotificationSupport;
  showToast: (message: string) => void;
  signOut: () => Promise<void>;
}

async function readAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const avatarUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!avatarUrl) {
        reject(new Error('invalid-image'));
        return;
      }

      resolve(avatarUrl);
    };
    reader.onerror = () => reject(new Error('invalid-image'));
    reader.readAsDataURL(file);
  });
}

function getWalletStatus(user: WaselUser, ar: boolean): ProfileStatusChip {
  if (user.walletStatus === 'frozen') {
    return { label: ar ? 'مجمّد' : 'Frozen', color: '#EF4444' };
  }

  if (user.walletStatus === 'limited') {
    return { label: ar ? 'محدود' : 'Limited', color: '#F59E0B' };
  }

  return { label: ar ? 'نشط' : 'Active', color: '#22C55E' };
}

function getPermissionStatus(
  support: NotificationSupport,
  ar: boolean,
): ProfileStatusChip {
  if (!support.isSupported) {
    return { label: ar ? 'غير مدعوم' : 'Unsupported', color: '#94A3B8' };
  }

  if (support.permission === 'granted') {
    return { label: ar ? 'مفعل' : 'Enabled', color: '#22C55E' };
  }

  if (support.permission === 'denied') {
    return { label: ar ? 'محظور' : 'Blocked', color: '#EF4444' };
  }

  return { label: ar ? 'غير مفعل' : 'Not enabled', color: '#F59E0B' };
}

function getTrustTier(trustScore: number, ar: boolean) {
  if (trustScore >= 90) return ar ? 'ثقة عالية' : 'High trust';
  if (trustScore >= 75) return ar ? 'ثقة قوية' : 'Strong trust';
  return ar ? 'بحاجة تعزيز' : 'Needs strengthening';
}

function getJoinedText(joinedAt: string | undefined, ar: boolean) {
  const joinedDate = joinedAt ? new Date(joinedAt) : null;
  if (joinedDate && !Number.isNaN(joinedDate.getTime())) {
    return joinedDate.toLocaleDateString('en-JO', {
      month: 'short',
      year: 'numeric',
    });
  }

  return ar ? 'حساب جديد' : 'New account';
}

function getRoleLabel(role: WaselUser['role'], ar: boolean) {
  if (role === 'driver') return ar ? 'سائق' : 'Driver';
  if (role === 'both') return ar ? 'سائق + راكب' : 'Driver + Rider';
  return ar ? 'راكب' : 'Rider';
}

function buildVerificationItems(
  user: WaselUser,
  ar: boolean,
): ProfileVerificationItem[] {
  return [
    {
      label: ar ? 'البريد الإلكتروني' : 'Email',
      status: user.emailVerified
        ? ar
          ? 'مؤكد'
          : 'Verified'
        : ar
          ? 'غير مؤكد'
          : 'Needs confirmation',
      color: user.emailVerified ? '#22C55E' : '#F59E0B',
    },
    {
      label: ar ? 'رقم الهاتف' : 'Phone',
      status: user.phoneVerified
        ? ar
          ? 'مؤكد'
          : 'Verified'
        : user.phone
          ? ar
            ? 'مضاف بانتظار التأكيد'
            : 'Added, pending confirmation'
          : ar
            ? 'غير مضاف'
            : 'Not added',
      color: user.phoneVerified ? '#22C55E' : '#F59E0B',
    },
    {
      label: ar ? 'الهوية / سند' : 'Identity / Sanad',
      status:
        user.sanadVerified || user.verified
          ? ar
            ? 'مكتمل'
            : 'Completed'
          : ar
            ? 'بانتظار التحقق'
            : 'Pending verification',
      color: user.sanadVerified || user.verified ? PROFILE_CYAN : '#F59E0B',
    },
  ];
}

function buildQuickActions(
  ar: boolean,
  nav: (path: string) => void,
  handleNotificationSetup: () => Promise<void>,
): ProfileQuickAction[] {
  return [
    {
      label: ar ? 'مركز رحلاتي' : 'My Trips Hub',
      detail: ar
        ? 'أدر حجوزاتك والرحلات القادمة من مكان واحد.'
        : 'Manage upcoming bookings and travel activity in one place.',
      icon: <Car size={18} />,
      color: PROFILE_CYAN,
      onClick: () => nav('/app/my-trips'),
    },
    {
      label: ar ? 'المحفظة والدفع' : 'Wallet & Payments',
      detail: ar
        ? 'راقب الرصيد والمدفوعات وميزات واصل.'
        : 'Track balance, payments, and wallet access.',
      icon: <CreditCard size={18} />,
      color: '#F59E0B',
      onClick: () => nav('/app/wallet'),
    },
    {
      label: ar ? 'مركز الإشعارات' : 'Notification Center',
      detail: ar
        ? 'ثبت التنبيهات المهمة للحجوزات والرحلات والطرود.'
        : 'Keep ride, package, and account alerts under control.',
      icon: <Bell size={18} />,
      color: '#22C55E',
      onClick: () => {
        void handleNotificationSetup();
      },
    },
    {
      label: ar ? 'إعدادات الحساب' : 'Account Settings',
      detail: ar
        ? 'حدّث لغتك وتفضيلاتك وأمان حسابك.'
        : 'Update preferences, language, and security controls.',
      icon: <Settings size={18} />,
      color: '#A78BFA',
      onClick: () => nav('/app/settings?section=account'),
    },
  ];
}

export function useProfilePageController({
  user,
  ar,
  nav,
  updateProfile,
  notificationSupport,
  showToast,
  signOut,
}: UseProfilePageControllerArgs) {
  const [editingField, setEditingField] = useState<'name' | 'phone' | null>(
    null,
  );
  const [nameInput, setNameInput] = useState(user.name ?? '');
  const [phoneInput, setPhoneInput] = useState(user.phone ?? '');
  const [savingField, setSavingField] = useState<SavingField>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveName = async () => {
    const clean = sanitizeText(nameInput.trim());
    if (!clean || clean === user.name) {
      setEditingField(null);
      return;
    }

    setSavingField('name');
    const { error } = await updateProfile({ full_name: clean });
    setSavingField(null);
    if (error) {
      showToast(
        ar ? 'تعذر حفظ الاسم حالياً' : 'Unable to save your name right now',
      );
      return;
    }

    setEditingField(null);
    showToast(ar ? 'تم حفظ الاسم' : 'Name saved');
  };

  const handleSavePhone = async () => {
    const normalized = normalizeProfilePhone(phoneInput);
    if (normalized === null) {
      showToast(
        ar ? 'يرجى إدخال رقم هاتف صالح' : 'Please enter a valid phone number',
      );
      return;
    }

    if (!normalized || normalized === user.phone) {
      setEditingField(null);
      return;
    }

    setSavingField('phone');
    const { error } = await updateProfile({ phone_number: normalized });
    setSavingField(null);
    if (error) {
      showToast(
        ar
          ? 'تعذر حفظ رقم الهاتف حالياً'
          : 'Unable to save your phone right now',
      );
      return;
    }

    setEditingField(null);
    showToast(ar ? 'تم حفظ رقم الهاتف' : 'Phone number saved');
  };

  const handleExportData = () => {
    const data = JSON.stringify(buildProfileExportPayload(user), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'wasel-my-data.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast(ar ? 'تم تصدير بياناتك' : 'Data exported');
  };

  const handlePhotoSelection = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(ar ? 'يرجى اختيار صورة صالحة' : 'Please choose a valid image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast(
        ar ? 'الحد الأقصى للصورة 2MB' : 'Please choose an image smaller than 2MB',
      );
      return;
    }

    try {
      const avatarUrl = await readAvatarFile(file);
      setSavingField('photo');
      const { error } = await updateProfile({ avatar_url: avatarUrl });
      setSavingField(null);
      if (error) {
        showToast(
          ar
            ? 'تعذر تحديث الصورة حالياً'
            : 'Unable to update your photo right now',
        );
        return;
      }

      showToast(ar ? 'تم تحديث الصورة الشخصية' : 'Profile photo updated');
    } catch {
      showToast(ar ? 'تعذر تجهيز الصورة' : 'Unable to process that image');
    } finally {
      event.target.value = '';
    }
  };

  const handleNotificationSetup = async () => {
    if (!notificationSupport.isSupported) {
      showToast(
        ar
          ? 'الإشعارات غير مدعومة على هذا الجهاز'
          : 'Notifications are not supported on this device',
      );
      return;
    }

    if (notificationSupport.permission === 'granted') {
      nav('/app/notifications');
      return;
    }

    const nextPermission = await notificationSupport.requestPermission();
    if (nextPermission === 'granted') {
      showToast(ar ? 'تم تفعيل تنبيهات واصل' : 'Wasel alerts are now enabled');
      nav('/app/notifications');
      return;
    }

    showToast(
      ar
        ? 'يمكنك تفعيل الإشعارات لاحقاً من إعدادات المتصفح'
        : 'You can enable notifications later from your browser settings',
    );
  };

  const handleSignOut = async () => {
    await signOut();
    nav('/');
  };

  const handleDeletionContinue = async () => {
    showToast(
      ar
        ? 'تم تسجيل الخروج. تابع طلب الحذف عبر الدعم.'
        : 'Signed out. Continue the deletion request through support.',
    );
    await handleSignOut();
  };

  const profileChecks = [
    Boolean(user.name?.trim()),
    Boolean(user.email?.trim()),
    Boolean(user.phone?.trim()),
    user.emailVerified,
    user.phoneVerified,
    user.sanadVerified || user.verified,
  ];

  const profileCompleteness = Math.round(
    (profileChecks.filter(Boolean).length / profileChecks.length) * 100,
  );

  return {
    editingField,
    handleDeletionContinue,
    handleExportData,
    handleNotificationSetup,
    handlePhotoSelection,
    handleSaveName,
    handleSavePhone,
    handleSignOut,
    joinedText: getJoinedText(user.joinedAt, ar),
    nameInput,
    permissionStatus: getPermissionStatus(notificationSupport, ar),
    phoneInput,
    profileCompleteness,
    quickActions: buildQuickActions(ar, nav, handleNotificationSetup),
    roleLabel: getRoleLabel(user.role, ar),
    savingField,
    setEditingField,
    setNameInput,
    setPhoneInput,
    setShowDeleteConfirm,
    showDeleteConfirm,
    trustTier: getTrustTier(user.trustScore, ar),
    verificationItems: buildVerificationItems(user, ar),
    walletStatus: getWalletStatus(user, ar),
  };
}
