import { useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent } from '@supabase/supabase-js';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { friendlyAuthError, getPasswordRequirements, validatePassword } from '../utils/authHelpers';
import { consumePersistedAuthReturnTo } from '../utils/authFlow';
import { supabase } from '../utils/supabase/client';
import './WaselAuthCallback.css';

type CallbackState = 'loading' | 'closing' | 'redirecting' | 'recovery' | 'error';

function readCallbackParam(key: string): string {
  if (typeof window === 'undefined') return '';

  const searchValue = new URLSearchParams(window.location.search).get(key);
  if (searchValue) return searchValue;

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(hash).get(key) ?? '';
}

function shouldIgnoreExchangeCodeError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : '';

  return (
    message.includes('code verifier') ||
    message.includes('auth code') ||
    message.includes('already been used') ||
    message.includes('invalid flow state')
  );
}

function hasUsableOpener(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return Boolean(window.opener && !window.opener.closed);
  } catch {
    return false;
  }
}

async function ensureEstablishedSession() {
  if (!supabase) return null;

  const firstAttempt = await supabase.auth.getSession();
  if (firstAttempt.error) throw firstAttempt.error;
  if (firstAttempt.data.session) return firstAttempt.data.session;

  await new Promise(resolve => setTimeout(resolve, 500));

  const retryAttempt = await supabase.auth.getSession();
  if (retryAttempt.error) throw retryAttempt.error;
  if (retryAttempt.data.session) return retryAttempt.data.session;

  throw new Error('Authentication session could not be established. Please try signing in again.');
}

export default function WaselAuthCallback() {
  const navigate = useIframeSafeNavigate();
  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState('Completing sign-in...');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const callbackType = useMemo(() => readCallbackParam('type'), []);
  const authCode = useMemo(() => readCallbackParam('code'), []);
  const rawCallbackError = useMemo(
    () =>
      decodeURIComponent(
        readCallbackParam('error_description') || readCallbackParam('error') || '',
      ),
    [],
  );
  const callbackError = useMemo(
    () =>
      rawCallbackError ? friendlyAuthError(rawCallbackError, 'Unable to complete sign-in.') : '',
    [rawCallbackError],
  );
  const passwordRequirements = getPasswordRequirements(password);

  useEffect(() => {
    let active = true;
    let isRecoveryFlow = callbackType === 'recovery';

    const finishAuth = async () => {
      if (!supabase) {
        if (!active) return;
        setState('error');
        setMessage('Backend is not configured for social sign-in.');
        return;
      }

      if (callbackError) {
        if (!active) return;
        setState('error');
        setMessage(callbackError);
        return;
      }

      const authChange =
        typeof supabase.auth.onAuthStateChange === 'function'
          ? supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
              if (!active) return;

              if (event === 'PASSWORD_RECOVERY') {
                isRecoveryFlow = true;
                setState('recovery');
                setMessage('Set a new password to finish recovering your account.');
                setFormError('');
              }
            })
          : {
              data: {
                subscription: {
                  unsubscribe() {
                    return undefined;
                  },
                },
              },
            };

      const {
        data: { subscription },
      } = authChange;

      try {
        if (typeof supabase.auth.initialize === 'function') {
          const { error: initializeError } = await supabase.auth.initialize();
          if (initializeError) {
            throw initializeError;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 50));

        if (authCode && typeof supabase.auth.exchangeCodeForSession === 'function') {
          const existingSession = await supabase.auth.getSession();
          if (existingSession.error) {
            throw existingSession.error;
          }

          if (!existingSession.data.session) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
            if (exchangeError && !shouldIgnoreExchangeCodeError(exchangeError)) {
              throw exchangeError;
            }
          }
        }

        if (isRecoveryFlow) {
          if (!active) return;
          setState('recovery');
          setMessage('Set a new password to finish recovering your account.');
          return;
        }

        await ensureEstablishedSession();

        if (hasUsableOpener()) {
          try {
            window.opener.postMessage({ type: 'wasel-auth-complete' }, window.location.origin);
          } catch {
            // Ignore cross-origin opener restrictions and continue to close.
          }

          setState('closing');
          setMessage('Sign-in complete. You can return to Wasel.');
          setTimeout(() => {
            try {
              window.close();
            } catch {
              // Ignore close failures in embedded browsers or tests.
            }
          }, 300);
          return;
        }

        setState('redirecting');
        setMessage('Sign-in complete. Redirecting...');
        navigate(consumePersistedAuthReturnTo('/app/find-ride'), { replace: true });
      } catch (error) {
        if (!active) return;
        setState('error');
        setMessage(
          friendlyAuthError(
            error instanceof Error ? error : String(error),
            'Unable to complete sign-in.',
          ),
        );
      } finally {
        subscription.unsubscribe();
      }
    };

    void finishAuth();

    return () => {
      active = false;
    };
  }, [authCode, callbackError, callbackType, navigate]);

  const handlePasswordUpdate = async () => {
    if (!supabase) {
      setFormError('Backend is not configured for password recovery.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setFormError('');
    setSavingPassword(true);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSavingPassword(false);
      setFormError(friendlyAuthError(error.message || error, 'Unable to update your password.'));
      return;
    }

    await supabase.auth.signOut().catch(() => undefined);

    setState('redirecting');
    setMessage('Password updated. Redirecting to sign in...');
    navigate('/app/auth?tab=signin&reset=success', { replace: true });
  };

  if (state === 'recovery') {
    return (
      <div className="auth-callback">
        <div className="auth-callback__panel auth-callback__panel--recovery">
          <div>
            <h1 className="auth-callback__title">Reset your password</h1>
            <p className="auth-callback__body auth-callback__body--spaced">{message}</p>
          </div>

          <label className="auth-callback__field">
            <span className="auth-callback__field-label">New password</span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Enter a new password"
              className="auth-callback__input"
            />
          </label>

          <div className="auth-callback__requirements">
            <span className="auth-callback__requirements-title">Password requirements</span>
            <div className="auth-callback__requirements-list">
              {passwordRequirements.map(requirement => (
                <span
                  key={requirement.key}
                  className={`auth-callback__requirement${requirement.met ? ' is-met' : ''}`}
                >
                  {requirement.met ? '✓' : '•'} {requirement.label}
                </span>
              ))}
            </div>
          </div>

          <label className="auth-callback__field">
            <span className="auth-callback__field-label">Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your new password"
              className="auth-callback__input"
            />
          </label>

          {formError ? <div className="auth-callback__error">{formError}</div> : null}

          <button
            type="button"
            onClick={() => {
              void handlePasswordUpdate();
            }}
            disabled={savingPassword}
            className="auth-callback__button auth-callback__button--primary"
          >
            {savingPassword ? 'Updating password...' : 'Save new password'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/auth?tab=signin', { replace: true })}
            className="auth-callback__button auth-callback__button--secondary"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-callback">
      <div className="auth-callback__panel auth-callback__panel--status">
        <div
          className={`auth-callback__spinner${state === 'error' ? ' is-error' : ''}${state === 'redirecting' || state === 'loading' || state === 'closing' ? ' is-active' : ''}`}
        />
        <h1 className="auth-callback__title">
          {state === 'error' ? 'Sign-in could not finish' : 'Finalizing authentication'}
        </h1>
        <p className="auth-callback__body">{message}</p>
        {state === 'error' ? (
          <button
            type="button"
            onClick={() => navigate('/app/auth?tab=signin', { replace: true })}
            className="auth-callback__button auth-callback__button--secondary auth-callback__button--spaced"
          >
            Back to sign in
          </button>
        ) : null}
      </div>
    </div>
  );
}
