/**
 * LocalAuth
 *
 * Backward-compatible adapter on top of AuthContext.
 * No longer owns a separate auth state or provider.
 */
import { useAuth } from './AuthContext';
import type { WaselUser } from './authContextHelpers';

export type { WaselUser };

export interface LocalAuthCtx {
  user: WaselUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    returnTo?: string;
  }) => Promise<{
    error: string | null;
    requiresEmailConfirmation: boolean;
    email: string;
  }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<WaselUser>) => Promise<void>;
}

export function LocalAuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useLocalAuth(): LocalAuthCtx {
  const auth = useAuth();

  const signIn = async (email: string, password: string) => {
    const result = await auth.signIn(email, password);
    return {
      error: result.error ? String(result.error) : null,
    };
  };

  const register = async (input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    returnTo?: string;
  }) => {
    const { name, email, password, phone, returnTo } = input;
    const result = await auth.signUp(email, password, name, phone ?? '', returnTo);
    return {
      error: result.error ? String(result.error) : null,
      requiresEmailConfirmation: result.requiresEmailConfirmation ?? false,
      email,
    };
  };

  return {
    user: auth.waselUser,
    loading: auth.loading,
    signIn,
    register,
    signOut: auth.signOut,
    updateUser: auth.updateUser,
  };
}
