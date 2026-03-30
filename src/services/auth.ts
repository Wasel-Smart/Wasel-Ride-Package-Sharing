import { API_URL, fetchWithRetry, getAuthDetails, publicAnonKey, supabase } from './core';
import { getDirectProfile, updateDirectProfile } from './directSupabase';

function canUseEdgeApi(): boolean {
  return Boolean(API_URL && publicAnonKey);
}

function normalizeAuthError(message: string, context: 'signin' | 'signup' | 'generic'): string {
  const lower = message.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('authentication failed') ||
    lower.includes('wrong email') ||
    lower.includes('wrong password')
  ) {
    return 'Incorrect email or password.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }

  if (
    lower.includes('already been registered') ||
    lower.includes('already registered') ||
    lower.includes('user already exists')
  ) {
    return 'This email is already registered.';
  }

  if (context === 'signin') return 'Sign in failed. Please try again.';
  if (context === 'signup') return 'Sign up failed. Please try again.';
  return message || 'Request failed.';
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
}

export const authAPI = {
  async signUp(email: string, password: string, firstName: string, lastName: string, phone: string) {
    const client = requireSupabase();

    if (!canUseEdgeApi()) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
            phone,
          },
        },
      });

      if (error) throw error;
      return data;
    }

    try {
      const response = await fetchWithRetry(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email,
          password,
          fullName: `${firstName} ${lastName}`.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

        if (
          errorData.error?.includes('already been registered') ||
          errorData.error?.includes('User already registered')
        ) {
          throw new Error('This email is already registered.');
        }

        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.message === 'This email is already registered.') {
        throw error;
      }

      const { data, error: fallbackError } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
            phone,
          },
        },
      });

      if (fallbackError) {
        throw new Error(normalizeAuthError(fallbackError.message, 'signup'));
      }
      return data;
    }
  },

  async createProfile(userId: string, email: string, firstName: string, lastName: string) {
    if (!canUseEdgeApi()) {
      return updateDirectProfile(userId, {
        email,
        full_name: `${firstName} ${lastName}`.trim(),
      });
    }

    const client = requireSupabase();

    try {
      let session = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!session && attempts < maxAttempts) {
        const { data: { session: currentSession } } = await client.auth.getSession();
        if (currentSession) {
          session = currentSession;
          break;
        }

        attempts += 1;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!session) {
        throw new Error('Not authenticated - please try logging in again');
      }

      const response = await fetchWithRetry(`${API_URL}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId,
          email,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

        if (response.status === 401 && errorData.message?.includes('JWT')) {
          const {
            data: { session: refreshedSession },
            error: refreshError,
          } = await client.auth.refreshSession();

          if (refreshError || !refreshedSession) {
            throw new Error('Session expired - please log in again');
          }

          const retryResponse = await fetchWithRetry(`${API_URL}/profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${refreshedSession.access_token}`,
            },
            body: JSON.stringify({
              userId,
              email,
              firstName,
              lastName,
              fullName: `${firstName} ${lastName}`.trim(),
            }),
          });

          if (!retryResponse.ok) {
            const retryErrorData = await retryResponse.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(retryErrorData.error || `Failed to create profile: ${retryResponse.status}`);
          }

          return await retryResponse.json();
        }

        throw new Error(errorData.error || `Failed to create profile: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('createProfile error:', error);
      }

      throw error;
    }
  },

  async signIn(email: string, password: string) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) throw new Error(normalizeAuthError(error.message, 'signin'));
    return data;
  },

  async signOut() {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const client = requireSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data;
  },

  async getProfile() {
    const { token, userId } = await getAuthDetails();
    if (!token || !userId) return { profile: null };

    if (!canUseEdgeApi()) {
      const profile = await getDirectProfile(userId);
      return { profile };
    }

    try {
      const response = await fetchWithRetry(
        `${API_URL}/profile/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) {
        const profile = await getDirectProfile(userId).catch(() => null);
        return { profile };
      }

      const data = await response.json();
      return { profile: data };
    } catch {
      const profile = await getDirectProfile(userId).catch(() => null);
      return { profile };
    }
  },

  async updateProfile(updates: Record<string, unknown>) {
    const { token, userId } = await getAuthDetails();
    if (!token || !userId) return { success: false, error: 'Not authenticated' };

    if (!canUseEdgeApi()) {
      try {
        const profile = await updateDirectProfile(userId, updates);
        return { success: true, profile };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update profile',
        };
      }
    }

    try {
      const response = await fetchWithRetry(`${API_URL}/profile/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
        console.error('[authAPI.updateProfile] Server error:', response.status, errorData);
        return { success: false, error: errorData.error || `Failed to update profile: ${response.status}` };
      }

      const data = await response.json();
      return { success: true, profile: data };
    } catch (error) {
      try {
        const profile = await updateDirectProfile(userId, updates);
        return { success: true, profile };
      } catch (fallbackError) {
        console.error('[authAPI.updateProfile] Network/fetch error:', error);
        return {
          success: false,
          error: fallbackError instanceof Error ? fallbackError.message : 'Network error updating profile',
        };
      }
    }
  },
};
