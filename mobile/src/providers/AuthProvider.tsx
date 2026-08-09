import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { authService, type AuthMetadata } from '../services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string, phone?: string) => Promise<void>;
  updateUser: (updates: { email?: string; phone?: string; password?: string; name?: string; data?: AuthMetadata }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithPhone: (phone: string) => Promise<{ error?: Error }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error?: Error }>;
  resetPassword: (email: string) => Promise<{ error?: Error }>;
  changePassword: (newPassword: string) => Promise<{ error?: Error }>;
  updateEmail: (newEmail: string) => Promise<{ error?: Error }>;
  updatePhone: (newPhone: string) => Promise<{ error?: Error }>;
  signOutAllDevices: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.subscribe(state => {
      setUser(state.user);
      setLoading(state.loading);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authService.signIn(email, password);
    if (result.error) throw result.error;
    setUser(result.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string, phone?: string) => {
    const { error } = await authService.signUpWithEmail(email, password, {
      full_name: fullName,
      phone_number: phone,
    });
    if (error) throw error;
  }, []);

  const updateUser = useCallback(async (updates: { email?: string; phone?: string; password?: string; name?: string; data?: AuthMetadata }) => {
    const data: AuthMetadata = { ...(updates.data ?? {}) };
    if (updates.name) data.full_name = updates.name;

    if (updates.password) {
      const { error } = await authService.changePassword(updates.password);
      if (error) throw error;
    }
    if (updates.email) {
      const { error } = await authService.updateEmail(updates.email);
      if (error) throw error;
    }
    if (updates.phone) {
      const { error } = await authService.updatePhone(updates.phone);
      if (error) throw error;
    }
    if (data && Object.keys(data).length > 0) {
      const { error } = await authService.updateUser(data);
      if (error) throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await authService.signInWithGoogle();
    if (error) throw error;
  }, []);

  const signInWithFacebook = useCallback(async () => {
    const { error } = await authService.signInWithFacebook();
    if (error) throw error;
  }, []);

  const signInWithPhone = useCallback(async (phone: string) => {
    const { error } = await authService.signInWithPhone(phone);
    if (error) throw error;
    return { error: undefined };
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { error } = await authService.verifyOtp(phone, token);
    if (error) throw error;
    return { error: undefined };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await authService.resetPassword(email);
    if (error) throw error;
    return { error: undefined };
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    const { error } = await authService.changePassword(newPassword);
    if (error) throw error;
    return { error: undefined };
  }, []);

  const updateEmail = useCallback(async (newEmail: string) => {
    const { error } = await authService.updateEmail(newEmail);
    if (error) throw error;
    return { error: undefined };
  }, []);

  const updatePhone = useCallback(async (newPhone: string) => {
    const { error } = await authService.updatePhone(newPhone);
    if (error) throw error;
    return { error: undefined };
  }, []);

  const signOutAllDevices = useCallback(async () => {
    await authService.signOutAllDevices();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, updateUser, signInWithGoogle, signInWithFacebook, signInWithPhone, verifyOtp, resetPassword, changePassword, updateEmail, updatePhone, signOutAllDevices, signOut }),
    [loading, signIn, signUp, updateUser, signInWithGoogle, signInWithFacebook, signInWithPhone, verifyOtp, resetPassword, changePassword, updateEmail, updatePhone, signOutAllDevices, signOut, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
