import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import {
  getUserProfile,
  updateUserProfile,
  updatePhoneNumber,
  updateEmail,
  uploadAvatar,
  submitDriverVerification,
  UserProfile,
  UpdateProfileData,
  DriverVerificationData,
} from '../services/userProfile';
import { sanitizeLogMessage } from '../utils/sanitization';

export type { UserProfile, UpdateProfileData, DriverVerificationData };

export function useProfile() {
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data, error } = await getUserProfile();
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (updates: UpdateProfileData) => updateUserProfile(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      console.error('Update profile failed:', sanitizeLogMessage(error));
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: (phone: string) => updatePhoneNumber(phone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      console.error('Update phone failed:', sanitizeLogMessage(error));
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: (email: string) => updateEmail(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      console.error('Update email failed:', sanitizeLogMessage(error));
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: ({ uri, fileType }: { uri: string; fileType?: string }) =>
      uploadAvatar(uri, fileType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      console.error('Upload avatar failed:', sanitizeLogMessage(error));
    },
  });

  const submitVerificationMutation = useMutation({
    mutationFn: (data: DriverVerificationData) => submitDriverVerification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      console.error('Submit verification failed:', sanitizeLogMessage(error));
    },
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile: updateProfileMutation.mutateAsync,
    updatePhone: updatePhoneMutation.mutateAsync,
    updateEmail: updateEmailMutation.mutateAsync,
    uploadAvatar: uploadAvatarMutation.mutateAsync,
    submitVerification: submitVerificationMutation.mutateAsync,
    isUpdating:
      updateProfileMutation.isPending ||
      updatePhoneMutation.isPending ||
      updateEmailMutation.isPending ||
      uploadAvatarMutation.isPending ||
      submitVerificationMutation.isPending,
  };
}
