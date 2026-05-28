/**
 * useProfile — web React Query hook for Wasel user profile management.
 *
 * ✅ Gap 3 fixed: web app now has a useProfile hook equivalent to
 *    mobile/src/hooks/useProfile.ts, wrapping src/services/userProfile.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUserProfile,
  submitDriverVerification,
  updateEmail,
  updatePhoneNumber,
  updateUserProfile,
  uploadAvatar,
  type DriverVerificationData,
  type UpdateProfileData,
  type UserProfile,
} from '@/services/userProfile';
import { sanitizeLogMessage } from '@/utils/sanitization';

export type { UserProfile, UpdateProfileData, DriverVerificationData };

export const PROFILE_QUERY_KEY = ['profile'] as const;

export function useProfile() {
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await getUserProfile();
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 min
    retry: 2,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });

  const updateProfileMutation = useMutation({
    mutationFn: (updates: UpdateProfileData) => updateUserProfile(updates),
    onSuccess: invalidate,
    onError: (err) => console.error('Update profile failed:', sanitizeLogMessage(err)),
  });

  const updatePhoneMutation = useMutation({
    mutationFn: (phone: string) => updatePhoneNumber(phone),
    onSuccess: invalidate,
    onError: (err) => console.error('Update phone failed:', sanitizeLogMessage(err)),
  });

  const updateEmailMutation = useMutation({
    mutationFn: (email: string) => updateEmail(email),
    onSuccess: invalidate,
    onError: (err) => console.error('Update email failed:', sanitizeLogMessage(err)),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: ({ file }: { file: File; fileType?: string }) =>
      uploadAvatar(file),
    onSuccess: invalidate,
    onError: (err) => console.error('Upload avatar failed:', sanitizeLogMessage(err)),
  });

  const submitVerificationMutation = useMutation({
    mutationFn: (data: DriverVerificationData) => submitDriverVerification(data),
    onSuccess: invalidate,
    onError: (err) => console.error('Submit verification failed:', sanitizeLogMessage(err)),
  });

  const isUpdating =
    updateProfileMutation.isPending ||
    updatePhoneMutation.isPending ||
    updateEmailMutation.isPending ||
    uploadAvatarMutation.isPending ||
    submitVerificationMutation.isPending;

  return {
    profile,
    isLoading,
    error,
    refetch,
    isUpdating,
    updateProfile: updateProfileMutation.mutateAsync,
    updatePhone: updatePhoneMutation.mutateAsync,
    updateEmail: updateEmailMutation.mutateAsync,
    uploadAvatar: uploadAvatarMutation.mutateAsync,
    submitVerification: submitVerificationMutation.mutateAsync,
    // Raw mutation objects for isPending / isError access in components
    mutations: {
      updateProfile: updateProfileMutation,
      updatePhone: updatePhoneMutation,
      updateEmail: updateEmailMutation,
      uploadAvatar: uploadAvatarMutation,
      submitVerification: submitVerificationMutation,
    },
  };
}
