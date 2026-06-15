import { useState, useCallback, type ChangeEvent, type ReactNode, type RefObject } from 'react';
import { Bell, Car, CreditCard, Settings } from 'lucide-react';
import type { WaselUser } from '../../contexts/LocalAuth';
import { createSupportTicket } from '../../services/supportInbox';
import { sanitizeText } from '../../utils/sanitize';
import { C, F } from '../../utils/wasel-ds';
import { 
  profileValidationSchemas, 
  validateProfileField, 
  normalizePhoneNumber 
} from '../../utils/profileValidation';
import { showSuccessToast, showErrorToast, showWarningToast } from '../../utils/advancedToast';
import { useOptimisticUpdates } from '../../hooks/useOptimisticUpdates';

export const PROFILE_BG = C.bg;
export const PROFILE_BORDER = C.border;
export const PROFILE_CYAN = C.cyan;
export const PROFILE_FONT = F;

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
  updateProfile: (updates: Record<string, unknown>) => Promise<{ error: unknown }>;
  notificationSupport: NotificationSupport;
  showToast: (message: string) => void;
  signOut: () => Promise<void>;
  photoInputRef: RefObject<HTMLInputElement | null>;
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
  if (user.walletStatus === 'closed') {
    return { label: ar ? 'مغلقة' : 'Closed', color: C.error };
  }

  if (user.walletStatus === 'frozen') {
    return { label: ar ? 'مجمّد' : 'Frozen', color: C.error };
  }

  if (user.walletStatus === 'limited') {
    return { label: ar ? 'محدود' : 'Limited', color: C.gold };
  }

  return { label: ar ? 'نشط' : 'Active', color: C.green };
}

function getPermissionStatus(support: NotificationSupport, ar: boolean): ProfileStatusChip {
  if (!support.isSupported) {
    return { label: ar ? 'غير مدعوم' : 'Unsupported', color: C.textDim };
  }

  if (support.permission === 'granted') {
    return { label: ar ? 'مفعل' : 'Enabled', color: C.green };
  }

  if (support.permission === 'denied') {
    return { label: ar ? 'محظور' : 'Blocked', color: C.error };
  }

  return { label: ar ? 'غير مفعل' : 'Not enabled', color: C.gold };
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

function buildVerificationItems(user: WaselUser, ar: boolean): ProfileVerificationItem[] {
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
      color: user.emailVerified ? C.green : C.gold,
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
      color: user.phoneVerified ? C.green : C.gold,
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
      color: user.sanadVerified || user.verified ? PROFILE_CYAN : C.gold,
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
        : 'Trips and bookings in one place.',
      icon: <Car size={18} />,
      color: PROFILE_CYAN,
      onClick: () => nav('/app/my-trips'),
    },
    {
      label: ar ? 'المحفظة والدفع' : 'Wallet & Payments',
      detail: ar ? 'راقب الرصيد والمدفوعات وميزات واصل.' : 'Balance and payments.',
      icon: <CreditCard size={18} />,
      color: C.gold,
      onClick: () => nav('/app/wallet'),
    },
    {
      label: ar ? 'مركز الإشعارات' : 'Notification Center',
      detail: ar ? 'ثبت التنبيهات المهمة للحجوزات والرحلات والطرود.' : 'Trip and account alerts.',
      icon: <Bell size={18} />,
      color: C.green,
      onClick: () => {
        void handleNotificationSetup();
      },
    },
    {
      label: ar ? 'إعدادات الحساب' : 'Account Settings',
      detail: ar ? 'حدّث لغتك وتفضيلاتك وأمان حسابك.' : 'Language, preferences, and security.',
      icon: <Settings size={18} />,
      color: C.purple,
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
  signOut,
  photoInputRef,
}: UseProfilePageControllerArgs) {
  void photoInputRef;
  const [editingField, setEditingField] = useState<'name' | 'phone' | null>(null);
  const [nameInput, setNameInput] = useState(user.name ?? '');
  const [phoneInput, setPhoneInput] = useState(user.phone ?? '');
  const [savingField, setSavingField] = useState<SavingField>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Optimistic updates
  const { optimisticData, applyOptimisticUpdate, isPending } = useOptimisticUpdates({
    data: user,
    onUpdate: async (field, value) => {
      const updates = { [field]: value };
      return await updateProfile(updates);
    },
    onRollback: field => {
      showWarningToast(
        ar
          ? `تعذر حفظ ${field === 'name' ? 'الاسم' : 'رقم الهاتف'}. تم التراجع إلى القيمة السابقة.`
          : `Failed to save ${field}. Rolled back to previous value.`,
        {
          label: ar ? 'إعادة المحاولة' : 'Retry',
          onClick: () => applyOptimisticUpdate(field, user[field as keyof WaselUser]),
        }
      );
    },
  });

  // Validate field with inline feedback
  const validateField = useCallback((field: 'name' | 'phone', value: string): boolean => {
    const schema = field === 'name' ? profileValidationSchemas.name : profileValidationSchemas.phone;
    const result = validateProfileField(schema, value);

    if (!result.success) {
      setValidationErrors(prev => ({ ...prev, [field]: result.error }));
      return false;
    }

    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    return true;
  }, []);

  const handleSaveName = useCallback(async () => {
    const clean = sanitizeText(nameInput.trim());
    if (!clean || clean === user.name) {
      setEditingField(null);
      return;
    }

    // Validate
    if (!validateField('name', clean)) {
      showErrorToast(validationErrors.name || (ar ? 'الاسم غير صالح' : 'Invalid name'));
      return;
    }

    setSavingField('name');
    const oldValue = user.name;

    const { error } = await updateProfile({ full_name: clean });
    setSavingField(null);

    if (error) {
      showErrorToast(
        ar ? 'تعذر حفظ الاسم. يرجى التحقق من الاتصال والمحاولة مرة أخرى.' 
           : 'Unable to save name. Please check your connection and try again.',
        {
          label: ar ? 'إعادة المحاولة' : 'Retry',
          onClick: () => handleSaveName(),
        }
      );
      return;
    }

    setEditingField(null);
    showSuccessToast(ar ? 'تم حفظ الاسم بنجاح' : 'Name saved successfully');
  }, [nameInput, user, ar, validateField, validationErrors, updateProfile]);

  const handleSavePhone = useCallback(async () => {
    const normalized = normalizePhoneNumber(phoneInput);
    if (!normalized) {
      showErrorToast(
        ar ? 'يرجى إدخال رقم هاتف صالح (مثال: +962791234567)' 
           : 'Please enter a valid phone number (e.g., +962791234567)'
      );
      return;
    }

    // Validate
    if (!validateField('phone', normalized)) {
      showErrorToast(validationErrors.phone || (ar ? 'رقم الهاتف غير صالح' : 'Invalid phone number'));
      return;
    }

    if (normalized === user.phone) {
      setEditingField(null);
      return;
    }

    setSavingField('phone');
    const oldValue = user.phone;

    const { error } = await updateProfile({ phone_number: normalized });
    setSavingField(null);

    if (error) {
      showErrorToast(
        ar ? 'تعذر حفظ رقم الهاتف. يرجى التحقق من الاتصال والمحاولة مرة أخرى.' 
           : 'Unable to save phone. Please check your connection and try again.',
        {
          label: ar ? 'إعادة المحاولة' : 'Retry',
          onClick: () => handleSavePhone(),
        }
      );
      return;
    }

    setEditingField(null);
    showSuccessToast(
      ar ? 'تم حفظ رقم الهاتف. سيتم إرسال رمز التحقق قريباً.' 
         : 'Phone saved. Verification code will be sent shortly.'
    );
  }, [phoneInput, user, ar, validateField, validationErrors, updateProfile]);

  const handleExportData = useCallback(() => {
    const data = JSON.stringify(
      {
        profile: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          joinedAt: user.joinedAt,
        },
        verification: {
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          sanadVerified: user.sanadVerified,
          verificationLevel: user.verificationLevel,
        },
        wallet: {
          balance: user.balance,
          walletStatus: user.walletStatus,
        },
        statistics: {
          trips: user.trips,
          rating: user.rating,
          trustScore: user.trustScore,
        },
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `wasel-profile-${user.id}-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showSuccessToast(ar ? 'تم تصدير بياناتك بنجاح' : 'Your data has been exported successfully');
  }, [user, ar]);

  const handlePhotoSelection = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateProfileField(profileValidationSchemas.avatar, {
      size: file.size,
      type: file.type,
    });

    if (!validation.success) {
      showErrorToast(validation.error);
      return;
    }

    try {
      const avatarUrl = await readAvatarFile(file);
      setSavingField('photo');
      const oldValue = user.avatar;

      const { error } = await updateProfile({ avatar_url: avatarUrl });
      setSavingField(null);

      if (error) {
        showErrorToast(
          ar ? 'تعذر تحديث الصورة. يرجى المحاولة مرة أخرى.' 
             : 'Unable to update photo. Please try again.',
          {
            label: ar ? 'إعادة المحاولة' : 'Retry',
            onClick: () => photoInputRef.current?.click(),
          }
        );
        return;
      }

      showSuccessToast(ar ? 'تم تحديث الصورة الشخصية بنجاح' : 'Profile photo updated successfully');
    } catch {
      showErrorToast(
        ar ? 'تعذر معالجة الصورة. يرجى اختيار صورة أخرى.' 
           : 'Unable to process image. Please choose another one.'
      );
    } finally {
      event.target.value = '';
    }
  }, [user, ar, updateProfile, photoInputRef]);

  const handleNotificationSetup = useCallback(async () => {
    if (!notificationSupport.isSupported) {
      showWarningToast(
        ar
          ? 'الإشعارات غير مدعومة على هذا الجهاز'
          : 'Notifications are not supported on this device'
      );
      return;
    }

    if (notificationSupport.permission === 'granted') {
      nav('/app/notifications');
      return;
    }

    const nextPermission = await notificationSupport.requestPermission();
    if (nextPermission === 'granted') {
      showSuccessToast(ar ? 'تم تفعيل تنبيهات واصل بنجاح' : 'Wasel alerts are now enabled');
      nav('/app/notifications');
      return;
    }

    showWarningToast(
      ar
        ? 'يمكنك تفعيل الإشعارات لاحقاً من إعدادات المتصفح'
        : 'You can enable notifications later from your browser settings'
    );
  }, [notificationSupport, ar, nav]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    nav('/');
  }, [signOut, nav]);

  const handleDeletionContinue = useCallback(async () => {
    const ticket = await createSupportTicket(user.id, {
      topic: 'cancellation',
      subject: 'Account deletion request',
      detail:
        'User requested account deletion from the profile danger zone and was signed out while support reviews the request.',
      relatedId: user.id,
      routeLabel: 'Profile deletion request',
      priority: 'high',
    });
    showSuccessToast(
      ar
        ? `تم تسجيل طلب الحذف عبر التذكرة ${ticket.id}. سيتم تسجيل الخروج الآن.`
        : `Deletion request logged as ticket ${ticket.id}. Signing you out now.`,
      {
        label: ar ? 'حسناً' : 'OK',
        onClick: () => {},
      }
    );
    await handleSignOut();
  }, [user.id, ar, handleSignOut]);

  const profileChecks = [
    Boolean(user.name?.trim()),
    Boolean(user.email?.trim()),
    Boolean(user.phone?.trim()),
    user.emailVerified,
    user.phoneVerified,
    user.sanadVerified || user.verified,
  ];

  const profileCompleteness = Math.round(
    (profileChecks.filter(Boolean).length / profileChecks.length) * 100
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
    validationErrors,
    validateField,
    optimisticData,
    isPending,
  };
}
