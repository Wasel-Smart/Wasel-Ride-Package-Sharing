import { useEffect, useMemo, useState } from 'react';
import { WaselButton, WaselCard, WaselInput } from '../design-system';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { normalizeReturnToPath } from '../utils/env';
import { C, F, GRAD, R, TYPE } from '../utils/wasel-ds';
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
          background: C.bgDeep,
          color: C.text,
          padding: 24,
          fontFamily: F,
        }}
      >
        <WaselCard
          variant="default"
          padding="28px"
          radius={R.xxl}
          style={{ width: '100%', maxWidth: 420, display: 'grid', gap: 14 }}
        >
          <div>
            <h1
              style={{
                margin: '0 0 8px',
                fontSize: TYPE.size.xl,
                lineHeight: TYPE.lineHeight.snug,
                color: C.text,
              }}
            >
              Reset your password
            </h1>
            <p style={{ margin: 0, color: C.textMuted, lineHeight: TYPE.lineHeight.relaxed }}>
              {message}
            </p>
          </div>

          <WaselInput
            label="New password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Enter a new password"
          />

          <WaselInput
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Re-enter your new password"
          />

          {formError && (
            <div
              style={{
                borderRadius: R.md,
                border: `1px solid ${C.errorDim}`,
                background: C.errorDim,
                color: C.error,
                padding: '12px 14px',
                fontSize: '0.85rem',
                lineHeight: 1.5,
              }}
            >
              {formError}
            </div>
          )}

          <WaselButton
            type="button"
            onClick={() => {
              void handlePasswordUpdate();
            }}
            disabled={savingPassword}
            fullWidth
            style={{ background: GRAD, color: C.bgDeep }}
          >
            {savingPassword ? 'Updating password...' : 'Save new password'}
          </WaselButton>

          <WaselButton
            type="button"
            variant="outline"
            fullWidth
            onClick={() =>
              navigate(`/app/auth?tab=signin&returnTo=${encodeURIComponent(returnTo)}`, {
                replace: true,
              })
            }
          >
            Back to sign in
          </WaselButton>
        </WaselCard>
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
        background: C.bgDeep,
        color: C.text,
        padding: 24,
        fontFamily: F,
      }}
    >
      <WaselCard
        variant="default"
        padding="28px"
        radius={R.xxl}
        style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            margin: '0 auto 16px',
            borderRadius: R.full,
            border: state === 'error' ? `3px solid ${C.errorDim}` : `3px solid ${C.cyanDim}`,
            borderTop: state === 'error' ? `3px solid ${C.error}` : `3px solid ${C.cyan}`,
            animation:
              state === 'redirecting' || state === 'loading' || state === 'closing'
                ? 'spin 0.8s linear infinite'
                : 'none',
          }}
        />
        <h1 style={{ margin: '0 0 8px', fontSize: '1.35rem', lineHeight: 1.2 }}>
          {state === 'error' ? 'Sign-in could not finish' : 'Finalizing authentication'}
        </h1>
        <p style={{ margin: 0, color: C.textMuted }}>{message}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </WaselCard>
    </div>
  );
}
