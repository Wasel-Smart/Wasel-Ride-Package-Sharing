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
    return { label: ar ? 'Ù…ØºÙ„Ù‚Ø©' : 'Closed', color: C.error };
  }

  if (user.walletStatus === 'frozen') {
    return { label: ar ? 'Ù…Ø¬Ù…Ù‘Ø¯' : 'Frozen', color: C.error };
  }

  if (user.walletStatus === 'limited') {
    return { label: ar ? 'Ù…Ø­Ø¯ÙˆØ¯' : 'Limited', color: C.gold };
  }

  return { label: ar ? 'Ù†Ø´Ø·' : 'Active', color: C.green };
}

function getPermissionStatus(support: NotificationSupport, ar: boolean): ProfileStatusChip {
  if (!support.isSupported) {
    return { label: ar ? 'ØºÙŠØ± Ù…Ø¯Ø¹ÙˆÙ…' : 'Unsupported', color: C.textDim };
  }

  if (support.permission === 'granted') {
    return { label: ar ? 'Ù…ÙØ¹Ù„' : 'Enabled', color: C.green };
  }

  if (support.permission === 'denied') {
    return { label: ar ? 'Ù…Ø­Ø¸ÙˆØ±' : 'Blocked', color: C.error };
  }

  return { label: ar ? 'ØºÙŠØ± Ù…ÙØ¹Ù„' : 'Not enabled', color: C.gold };
}

function getTrustTier(trustScore: number, ar: boolean) {
  if (trustScore >= 90) return ar ? 'Ø«Ù‚Ø© Ø¹Ø§Ù„ÙŠØ©' : 'High trust';
  if (trustScore >= 75) return ar ? 'Ø«Ù‚Ø© Ù‚ÙˆÙŠØ©' : 'Strong trust';
  return ar ? 'Ø¨Ø­Ø§Ø¬Ø© ØªØ¹Ø²ÙŠØ²' : 'Needs strengthening';
}

function getJoinedText(joinedAt: string | undefined, ar: boolean) {
  const joinedDate = joinedAt ? new Date(joinedAt) : null;
  if (joinedDate && !Number.isNaN(joinedDate.getTime())) {
    return joinedDate.toLocaleDateString('en-JO', {
      month: 'short',
      year: 'numeric',
    });
  }

  return ar ? 'Ø­Ø³Ø§Ø¨ Ø¬Ø¯ÙŠØ¯' : 'New account';
}

function getRoleLabel(role: WaselUser['role'], ar: boolean) {
  if (role === 'driver') return ar ? 'Ø³Ø§Ø¦Ù‚' : 'Driver';
  if (role === 'both') return ar ? 'Ø³Ø§Ø¦Ù‚ + Ø±Ø§ÙƒØ¨' : 'Driver + Rider';
  return ar ? 'Ø±Ø§ÙƒØ¨' : 'Rider';
}

function buildVerificationItems(user: WaselUser, ar: boolean): ProfileVerificationItem[] {
  return [
    {
      label: ar ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ' : 'Email',
      status: user.emailVerified
        ? ar
          ? 'Ù…Ø¤ÙƒØ¯'
          : 'Verified'
        : ar
          ? 'ØºÙŠØ± Ù…Ø¤ÙƒØ¯'
          : 'Needs confirmation',
      color: user.emailVerified ? C.green : C.gold,
    },
    {
      label: ar ? 'Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ' : 'Phone',
      status: user.phoneVerified
        ? ar
          ? 'Ù…Ø¤ÙƒØ¯'
          : 'Verified'
        : user.phone
          ? ar
            ? 'Ù…Ø¶Ø§Ù Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„ØªØ£ÙƒÙŠØ¯'
            : 'Added, pending confirmation'
          : ar
            ? 'ØºÙŠØ± Ù…Ø¶Ø§Ù'
            : 'Not added',
      color: user.phoneVerified ? C.green : C.gold,
    },
    {
      label: ar ? 'Ø§Ù„Ù‡ÙˆÙŠØ© / Ø³Ù†Ø¯' : 'Identity / Sanad',
      status:
        user.sanadVerified || user.verified
          ? ar
            ? 'Ù…ÙƒØªÙ…Ù„'
            : 'Completed'
          : ar
            ? 'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„ØªØ­Ù‚Ù‚'
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
      label: ar ? 'Ù…Ø±ÙƒØ² Ø±Ø­Ù„Ø§ØªÙŠ' : 'My Trips Hub',
      detail: ar
        ? 'Ø£Ø¯Ø± Ø­Ø¬ÙˆØ²Ø§ØªÙƒ ÙˆØ§Ù„Ø±Ø­Ù„Ø§Øª Ø§Ù„Ù‚Ø§Ø¯Ù…Ø© Ù…Ù† Ù…ÙƒØ§Ù† ÙˆØ§Ø­Ø¯.'
        : 'Trips and bookings in one place.',
      icon: <Car size={18} />,
      color: PROFILE_CYAN,
      onClick: () => nav('/app/my-trips'),
    },
    {
      label: ar ? 'Ø§Ù„Ù…Ø­ÙØ¸Ø© ÙˆØ§Ù„Ø¯ÙØ¹' : 'Wallet & Payments',
      detail: ar ? 'Ø±Ø§Ù‚Ø¨ Ø§Ù„Ø±ØµÙŠØ¯ ÙˆØ§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª ÙˆÙ…ÙŠØ²Ø§Øª ÙˆØ§ØµÙ„.' : 'Balance and payments.',
      icon: <CreditCard size={18} />,
      color: C.gold,
      onClick: () => nav('/app/wallet'),
    },
    {
      label: ar ? 'Ù…Ø±ÙƒØ² Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª' : 'Notification Center',
      detail: ar ? 'Ø«Ø¨Øª Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ù…Ù‡Ù…Ø© Ù„Ù„Ø­Ø¬ÙˆØ²Ø§Øª ÙˆØ§Ù„Ø±Ø­Ù„Ø§Øª ÙˆØ§Ù„Ø·Ø±ÙˆØ¯.' : 'Trip and account alerts.',
      icon: <Bell size={18} />,
      color: C.green,
      onClick: () => {
        void handleNotificationSetup();
      },
    },
    {
      label: ar ? 'Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø­Ø³Ø§Ø¨' : 'Account Settings',
      detail: ar ? 'Ø­Ø¯Ù‘Ø« Ù„ØºØªÙƒ ÙˆØªÙØ¶ÙŠÙ„Ø§ØªÙƒ ÙˆØ£Ù…Ø§Ù† Ø­Ø³Ø§Ø¨Ùƒ.' : 'Language, preferences, and security.',
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
          ? `ØªØ¹Ø°Ø± Ø­ÙØ¸ ${field === 'name' ? 'Ø§Ù„Ø§Ø³Ù…' : 'Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ'}. ØªÙ… Ø§Ù„ØªØ±Ø§Ø¬Ø¹ Ø¥Ù„Ù‰ Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©.`
          : `Failed to save ${field}. Rolled back to previous value.`,
        {
          label: ar ? 'Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©' : 'Retry',
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
      showErrorToast(validationErrors.name || (ar ? 'Ø§Ù„Ø§Ø³Ù… ØºÙŠØ± ØµØ§Ù„Ø­' : 'Invalid name'));
      return;
    }

    setSavingField('name');

    const { error } = await updateProfile({ full_name: clean });
    setSavingField(null);

    if (error) {
      showErrorToast(
        ar ? 'ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„Ø§Ø³Ù…. ÙŠØ±Ø¬Ù‰ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø§ØªØµØ§Ù„ ÙˆØ§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.' 
           : 'Unable to save name. Please check your connection and try again.',
        {
          label: ar ? 'Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©' : 'Retry',
          onClick: () => handleSaveName(),
        }
      );
      return;
    }

    setEditingField(null);
    showSuccessToast(ar ? 'ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø§Ø³Ù… Ø¨Ù†Ø¬Ø§Ø­' : 'Name saved successfully');
  }, [nameInput, user, ar, validateField, validationErrors, updateProfile]);

  const handleSavePhone = useCallback(async () => {
    const normalized = normalizePhoneNumber(phoneInput);
    if (!normalized) {
      showErrorToast(
        ar ? 'ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø±Ù‚Ù… Ù‡Ø§ØªÙ ØµØ§Ù„Ø­ (Ù…Ø«Ø§Ù„: +962791234567)' 
           : 'Please enter a valid phone number (e.g., +962791234567)'
      );
      return;
    }

    // Validate
    if (!validateField('phone', normalized)) {
      showErrorToast(validationErrors.phone || (ar ? 'Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ ØºÙŠØ± ØµØ§Ù„Ø­' : 'Invalid phone number'));
      return;
    }

    if (normalized === user.phone) {
      setEditingField(null);
      return;
    }

    setSavingField('phone');

    const { error } = await updateProfile({ phone_number: normalized });
    setSavingField(null);

    if (error) {
      showErrorToast(
        ar ? 'ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ. ÙŠØ±Ø¬Ù‰ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø§ØªØµØ§Ù„ ÙˆØ§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.' 
           : 'Unable to save phone. Please check your connection and try again.',
        {
          label: ar ? 'Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©' : 'Retry',
          onClick: () => handleSavePhone(),
        }
      );
      return;
    }

    setEditingField(null);
    showSuccessToast(
      ar ? 'ØªÙ… Ø­ÙØ¸ Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ. Ø³ÙŠØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø±Ù…Ø² Ø§Ù„ØªØ­Ù‚Ù‚ Ù‚Ø±ÙŠØ¨Ø§Ù‹.' 
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
    showSuccessToast(ar ? 'ØªÙ… ØªØµØ¯ÙŠØ± Ø¨ÙŠØ§Ù†Ø§ØªÙƒ Ø¨Ù†Ø¬Ø§Ø­' : 'Your data has been exported successfully');
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

      const { error } = await updateProfile({ avatar_url: avatarUrl });
      setSavingField(null);

      if (error) {
        showErrorToast(
          ar ? 'ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ« Ø§Ù„ØµÙˆØ±Ø©. ÙŠØ±Ø¬Ù‰ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.' 
             : 'Unable to update photo. Please try again.',
          {
            label: ar ? 'Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©' : 'Retry',
            onClick: () => photoInputRef.current?.click(),
          }
        );
        return;
      }

      showSuccessToast(ar ? 'ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„ØµÙˆØ±Ø© Ø§Ù„Ø´Ø®ØµÙŠØ© Ø¨Ù†Ø¬Ø§Ø­' : 'Profile photo updated successfully');
    } catch {
      showErrorToast(
        ar ? 'ØªØ¹Ø°Ø± Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ØµÙˆØ±Ø©. ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± ØµÙˆØ±Ø© Ø£Ø®Ø±Ù‰.' 
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
          ? 'Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª ØºÙŠØ± Ù…Ø¯Ø¹ÙˆÙ…Ø© Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ø¬Ù‡Ø§Ø²'
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
      showSuccessToast(ar ? 'ØªÙ… ØªÙØ¹ÙŠÙ„ ØªÙ†Ø¨ÙŠÙ‡Ø§Øª ÙˆØ§ØµÙ„ Ø¨Ù†Ø¬Ø§Ø­' : 'Wasel alerts are now enabled');
      nav('/app/notifications');
      return;
    }

    showWarningToast(
      ar
        ? 'ÙŠÙ…ÙƒÙ†Ùƒ ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù„Ø§Ø­Ù‚Ø§Ù‹ Ù…Ù† Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…ØªØµÙØ­'
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
        ? `ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø·Ù„Ø¨ Ø§Ù„Ø­Ø°Ù Ø¹Ø¨Ø± Ø§Ù„ØªØ°ÙƒØ±Ø© ${ticket.id}. Ø³ÙŠØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬ Ø§Ù„Ø¢Ù†.`
        : `Deletion request logged as ticket ${ticket.id}. Signing you out now.`,
      {
        label: ar ? 'Ø­Ø³Ù†Ø§Ù‹' : 'OK',
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

