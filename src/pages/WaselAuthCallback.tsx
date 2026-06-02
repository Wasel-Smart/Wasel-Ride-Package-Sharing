import { useEffect, useMemo, useState } from 'react';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { normalizeReturnToPath } from '../utils/env';
import {
  completeAuthCallbackSession,
  subscribeToPasswordRecovery,
  updateRecoveredPassword,
  type AuthRecoverySubscription,
} from '../services/auth';

type CallbackState = 'loading' | 'closing' | 'redirecting' | 'recovery' | 'error';

const PASSWORD_POLICY_MESSAGE =
  'Password must include lowercase, uppercase, number, and special character.';

function meetsPasswordPolicy(value: string) {
  return (
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

function readCallbackParam(key: string): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const searchValue = new URLSearchParams(window.location.search).get(key);
  if (searchValue) {
    return searchValue;
  }

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(hash).get(key) ?? '';
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
  const returnTo = useMemo(() => normalizeReturnToPath(readCallbackParam('returnTo')), []);
  const callbackError = useMemo(
    () =>
      decodeURIComponent(
        readCallbackParam('error_description') || readCallbackParam('error') || '',
      ),
    [],
  );

  useEffect(() => {
    let active = true;
    let isRecoveryFlow = callbackType === 'recovery';
    let subscription: AuthRecoverySubscription | undefined;

    const finishAuth = async () => {
      if (callbackError) {
        if (!active) return;
        setState('error');
        setMessage(callbackError);
        return;
      }

      subscription = subscribeToPasswordRecovery(() => {
        if (!active) return;
        isRecoveryFlow = true;
        setState('recovery');
        setMessage('Set a new password to finish recovering your account.');
        setFormError('');
      });

      try {
        await new Promise(resolve => setTimeout(resolve, 50));

        if (isRecoveryFlow) {
          if (!active) return;
          setState('recovery');
          setMessage('Set a new password to finish recovering your account.');
          return;
        }

        await completeAuthCallbackSession();

        if (window.opener && !window.opener.closed) {
          setState('closing');
          setMessage('Sign-in complete. You can return to Wasel.');
          window.opener.postMessage({ type: 'wasel-auth-complete' }, window.location.origin);
          window.close();
          return;
        }

        setState('redirecting');
        setMessage('Sign-in complete. Redirecting...');
        navigate(returnTo, { replace: true });
      } catch (error) {
        if (!active) return;
        setState('error');
        setMessage(error instanceof Error ? error.message : 'Unable to complete sign-in.');
      } finally {
        subscription?.unsubscribe();
      }
    };

    void finishAuth();

    return () => {
      active = false;
    };
  }, [callbackError, callbackType, navigate, returnTo]);

  const handlePasswordUpdate = async () => {
    if (!meetsPasswordPolicy(password)) {
      setFormError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setFormError('');
    setSavingPassword(true);

    try {
      await updateRecoveredPassword(password);
    } catch (error) {
      setSavingPassword(false);
      setFormError(error instanceof Error ? error.message : 'Unable to update your password.');
      return;
    }

    setState('redirecting');
    setMessage('Password updated. Redirecting to sign in...');
    navigate(`/app/auth?tab=signin&reset=success&returnTo=${encodeURIComponent(returnTo)}`, {
      replace: true,
    });
  };

  if (state === 'recovery') {
    return (
      <div
        style={{
          minHeight: 'var(--app-min-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#040C18',
          color: '#EFF6FF',
          padding: 24,
          fontFamily: "-apple-system,'Inter',sans-serif",
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 20,
            padding: 28,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(0,200,232,0.14)',
            display: 'grid',
            gap: 14,
          }}
        >
          <div>
            <h1 style={{ margin: '0 0 8px', fontSize: '1.35rem', lineHeight: 1.2 }}>
              Reset your password
            </h1>
            <p style={{ margin: 0, color: 'rgba(239,246,255,0.7)', lineHeight: 1.6 }}>{message}</p>
          </div>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>New password</span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Enter a new password"
              style={{
                width: '100%',
                minHeight: 46,
                borderRadius: 12,
                border: '1px solid rgba(0,200,232,0.18)',
                background: 'rgba(255,255,255,0.03)',
                color: '#EFF6FF',
                padding: '0 14px',
                fontSize: '0.95rem',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your new password"
              style={{
                width: '100%',
                minHeight: 46,
                borderRadius: 12,
                border: '1px solid rgba(0,200,232,0.18)',
                background: 'rgba(255,255,255,0.03)',
                color: '#EFF6FF',
                padding: '0 14px',
                fontSize: '0.95rem',
              }}
            />
          </label>

          {formError && (
            <div
              style={{
                borderRadius: 12,
                border: '1px solid rgba(255,68,85,0.28)',
                background: 'rgba(255,68,85,0.12)',
                color: '#FF8A96',
                padding: '12px 14px',
                fontSize: '0.85rem',
                lineHeight: 1.5,
              }}
            >
              {formError}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              void handlePasswordUpdate();
            }}
            disabled={savingPassword}
            style={{
              minHeight: 46,
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #00C8E8, #0095B8)',
              color: '#041018',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: savingPassword ? 'not-allowed' : 'pointer',
              opacity: savingPassword ? 0.7 : 1,
            }}
          >
            {savingPassword ? 'Updating password...' : 'Save new password'}
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(`/app/auth?tab=signin&returnTo=${encodeURIComponent(returnTo)}`, {
                replace: true,
              })
            }
            style={{
              minHeight: 42,
              borderRadius: 12,
              border: '1px solid rgba(0,200,232,0.18)',
              background: 'transparent',
              color: '#EFF6FF',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: 'var(--app-min-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#040C18',
        color: '#EFF6FF',
        padding: 24,
        fontFamily: "-apple-system,'Inter',sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 20,
          padding: 28,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(0,200,232,0.14)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            margin: '0 auto 16px',
            borderRadius: '50%',
            border:
              state === 'error'
                ? '3px solid rgba(255,68,85,0.3)'
                : '3px solid rgba(0,200,232,0.15)',
            borderTop: state === 'error' ? '3px solid #FF4455' : '3px solid #00C8E8',
            animation:
              state === 'redirecting' || state === 'loading' || state === 'closing'
                ? 'spin 0.8s linear infinite'
                : 'none',
          }}
        />
        <h1 style={{ margin: '0 0 8px', fontSize: '1.35rem', lineHeight: 1.2 }}>
          {state === 'error' ? 'Sign-in could not finish' : 'Finalizing authentication'}
        </h1>
        <p style={{ margin: 0, color: 'rgba(239,246,255,0.7)' }}>{message}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
