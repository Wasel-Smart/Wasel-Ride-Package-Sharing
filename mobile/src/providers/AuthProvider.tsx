import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { authService } from '../services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
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
    const session = await authService.signIn(email, password);
    setUser(session.user);
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

  const value = useMemo(
    () => ({ user, loading, signIn, signInWithGoogle, signInWithFacebook, signOut }),
    [loading, signIn, signInWithFacebook, signInWithGoogle, signOut, user],
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
