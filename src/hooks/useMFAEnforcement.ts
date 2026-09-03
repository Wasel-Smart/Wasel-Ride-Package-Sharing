import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isMFAEnforced, requireMFAForOperation } from '@/utils/security';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export function useMFAEnforcement() {
  const { waselUser } = useAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';

  const enforce = useCallback(
    async (operation: 'payment' | 'profile_update' | 'password_change' | 'sensitive') => {
      if (!isMFAEnforced()) {
        return { allowed: true };
      }

      const result = await requireMFAForOperation(operation, waselUser?.twoFactorEnabled);

      if (!result.enforced) {
        return { allowed: true };
      }

      if (!result.passed) {
        toast.error(
          ar
            ? 'يجب تفعيل التحقق الثنائي قبل إتمام هذه العملية.'
            : 'Two-factor authentication is required before completing this operation.',
        );
        return { allowed: false, reason: 'mfa_required' };
      }

      return { allowed: true };
    },
    [ar, waselUser?.twoFactorEnabled],
  );

  return { enforceMFA: enforce };
}
