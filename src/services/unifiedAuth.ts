/**
 * Unified Authentication Service
 * Consolidates all auth flows (email/password, Google, Facebook)
 * with comprehensive error handling and session management
 */

import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase/client';
import { getAuthCallbackUrl } from '../utils/env';
import { logger, setCorrelationId } from './logger';
import { authAPI } from './auth';

export type AuthProvider = 'google' | 'facebook';
export type AuthMethod = 'email' | 'oauth';

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
  requiresEmailConfirmation?: boolean;
}

export interface OAuthConfig {
  provider: AuthProvider;
  redirectTo?: string;
  scopes?: string[];
}

class UnifiedAuthService {
  private correlationId: string | null = null;

  private generateCorrelationId(): string {
    return `auth-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private startAuthFlow(method: AuthMethod, provider?: AuthProvider): void {
    this.correlationId = this.generateCorrelationId();
    setCorrelationId(this.correlationId);
    
    logger.authEvent('auth_flow_started', {
      method,
      provider,
      correlationId: this.correlationId,
    });
  }

  private normalizeAuthError(error: AuthError | Error | unknown): string {
    if (!error) return 'Authentication failed';

    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();

    // Normalize common error messages
    if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
      return 'Invalid email or password';
    }
    if (lower.includes('email not confirmed')) {
      return 'Please verify your email before signing in';
    }
    if (lower.includes('user already registered')) {
      return 'This email is already registered';
    }
    if (lower.includes('rate limit')) {
      return 'Too many attempts. Please wait a moment';
    }
    if (lower.includes('network') || lower.includes('fetch')) {
      return 'Network error. Please check your connection';
    }

    return message || 'Authentication failed';
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    this.startAuthFlow('email');

    try {
      if (!supabase) {
        throw new Error('Authentication service not configured');
      }

      logger.authEvent('email_signin_attempt', { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.authEvent('email_signin_failed', {
          email,
          error: error.message,
        });
        return {
          success: false,
          error: this.normalizeAuthError(error),
        };
      }

      logger.authEvent('email_signin_success', {
        userId: data.user?.id,
        email,
      });

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (error) {
      logger.error('Email sign-in exception', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: this.normalizeAuthError(error),
      };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(
    email: string,
    password: string,
    metadata?: { fullName?: string; phone?: string }
  ): Promise<AuthResult> {
    this.startAuthFlow('email');

    try {
      if (!supabase) {
        throw new Error('Authentication service not configured');
      }

      logger.authEvent('email_signup_attempt', { email });

      const redirectTo = getAuthCallbackUrl(
        typeof window !== 'undefined' ? window.location.origin : undefined
      );

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: metadata || {},
        },
      });

      if (error) {
        logger.authEvent('email_signup_failed', {
          email,
          error: error.message,
        });
        return {
          success: false,
          error: this.normalizeAuthError(error),
        };
      }

      const requiresConfirmation = !data.session;

      logger.authEvent('email_signup_success', {
        userId: data.user?.id,
        email,
        requiresConfirmation,
      });

      return {
        success: true,
        user: data.user,
        session: data.session || undefined,
        requiresEmailConfirmation: requiresConfirmation,
      };
    } catch (error) {
      logger.error('Email sign-up exception', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: this.normalizeAuthError(error),
      };
    }
  }

  /**
   * Sign in with OAuth provider (Google or Facebook)
   */
  async signInWithOAuth(config: OAuthConfig): Promise<AuthResult> {
    this.startAuthFlow('oauth', config.provider);

    try {
      if (!supabase) {
        throw new Error('Authentication service not configured');
      }

      logger.authEvent('oauth_signin_attempt', {
        provider: config.provider,
      });

      const redirectTo = config.redirectTo || getAuthCallbackUrl(
        typeof window !== 'undefined' ? window.location.origin : undefined
      );

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: config.provider,
        options: {
          redirectTo,
          scopes: config.scopes?.join(' '),
        },
      });

      if (error) {
        logger.authEvent('oauth_signin_failed', {
          provider: config.provider,
          error: error.message,
        });
        return {
          success: false,
          error: this.normalizeAuthError(error),
        };
      }

      logger.authEvent('oauth_redirect_initiated', {
        provider: config.provider,
        url: data.url,
      });

      // OAuth redirects to provider, so we return success
      // Actual session will be established on callback
      return {
        success: true,
      };
    } catch (error) {
      logger.error('OAuth sign-in exception', {
        provider: config.provider,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: this.normalizeAuthError(error),
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<AuthResult> {
    try {
      if (!supabase) {
        throw new Error('Authentication service not configured');
      }

      logger.authEvent('signout_attempt');

      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.authEvent('signout_failed', { error: error.message });
        return {
          success: false,
          error: this.normalizeAuthError(error),
        };
      }

      logger.authEvent('signout_success');

      return { success: true };
    } catch (error) {
      logger.error('Sign-out exception', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: this.normalizeAuthError(error),
      };
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<{ session: Session | null; error?: string }> {
    try {
      if (!supabase) {
        return { session: null, error: 'Authentication service not configured' };
      }

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        logger.warn('Session retrieval failed', { error: error.message });
        return { session: null, error: this.normalizeAuthError(error) };
      }

      return { session: data.session };
    } catch (error) {
      logger.error('Session retrieval exception', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        session: null,
        error: this.normalizeAuthError(error),
      };
    }
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<AuthResult> {
    try {
      if (!supabase) {
        throw new Error('Authentication service not configured');
      }

      logger.authEvent('session_refresh_attempt');

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        logger.authEvent('session_refresh_failed', { error: error.message });
        return {
          success: false,
          error: this.normalizeAuthError(error),
        };
      }

      logger.authEvent('session_refresh_success', {
        userId: data.user?.id,
      });

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (error) {
      logger.error('Session refresh exception', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: this.normalizeAuthError(error),
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      if (!supabase) {
        throw new Error('Authentication service not configured');
      }

      logger.authEvent('password_reset_attempt', { email });

      const redirectTo = getAuthCallbackUrl(
        typeof window !== 'undefined' ? window.location.origin : undefined
      );

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        logger.authEvent('password_reset_failed', {
          email,
          error: error.message,
        });
        return {
          success: false,
          error: this.normalizeAuthError(error),
        };
      }

      logger.authEvent('password_reset_success', { email });

      return { success: true };
    } catch (error) {
      logger.error('Password reset exception', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: this.normalizeAuthError(error),
      };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<AuthResult> {
    try {
      if (!supabase) {
        throw new Error('Authentication service not configured');
      }

      logger.authEvent('password_update_attempt');

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        logger.authEvent('password_update_failed', { error: error.message });
        return {
          success: false,
          error: this.normalizeAuthError(error),
        };
      }

      logger.authEvent('password_update_success', { userId: data.user?.id });

      return {
        success: true,
        user: data.user,
      };
    } catch (error) {
      logger.error('Password update exception', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: this.normalizeAuthError(error),
      };
    }
  }
}

export const unifiedAuthService = new UnifiedAuthService();
