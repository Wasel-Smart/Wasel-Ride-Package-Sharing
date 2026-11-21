import { useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent } from '@supabase/auth-js';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { supabase } from '../utils/supabase/client';
import { normalizeReturnToPath } from '../utils/env';
import { getPasswordRuleIssue } from '../utils/authHelpers';
import { tx } from '../locales/tx';

type CallbackState = 'loading' | 'closing' | 'redirecting' | 'recovery' | 'error';

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

// eslint-disable-next-line max-lines-per-function -- auth callback state machine, one linear effect
export default function WaselAuthCallback() {
  const navigate = useIframeSafeNavigate();
  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState(() => tx('waselAuthCallback.completing_sign_in'));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const callbackType = useMemo(() => readCallbackParam('type'), []);
  const returnTo = useMemo(() => normalizeReturnToPath(readCallbackParam('returnTo')), []);
  const callbackError = useMemo(() => {
    // A cancelled social sign-in returns here with error=access_denied and a
    // provider description like "Permissions error", which tells the user
    // nothing about what happened. Say what actually occurred instead.
    const errorCode = readCallbackParam('error');
    if (errorCode === 'access_denied' || errorCode === 'user_cancelled') {
      return tx('waselAuthCallback.sign_in_cancelled');
    }

    const raw = readCallbackParam('error_description') || errorCode;
    if (!raw) {return '';}
    try {
      // Sanitize: only allow printable ASCII, strip control chars and HTML
      return decodeURIComponent(raw)
        .replace(/[<>"'`]/g, '')
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1f\x7f]/g, '')
        .slice(0, 200);
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    let active = true;
    let isRecoveryFlow = callbackType === 'recovery';
    const cleanup = { unsubscribe: undefined as (() => void) | undefined, timer: undefined as ReturnType<typeof setTimeout> | undefined };

    const showRecovery = () => {
      if (!active) {return;}
      setState('recovery');
      setMessage(tx('waselAuthCallback.set_new_password_message'));
      setFormError('');
    };

    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- missing backend is a terminal error surfaced on mount, not a derived value
      setState('error');
      setMessage(tx('waselAuthCallback.backend_not_configured_social'));
      return () => { active = false; };
    }

    if (callbackError) {
      setState('error');
      setMessage(callbackError);
      return () => { active = false; };
    }

    if (isRecoveryFlow) {
      showRecovery();
      return () => { active = false; };
    }

    // Narrowed for the closures below, which otherwise widen back to | null.
    const client = supabase;

    // With PKCE + detectSessionInUrl:true the browser client exchanges the
    // code automatically and fires onAuthStateChange. We wait for that event
    // rather than calling getSession() immediately (which may return null
    // before the exchange completes and produce a spurious "session failed").
    //
    // The one case where waiting cannot help is a redirect with no credential
    // to exchange: a cancelled or rejected provider sign-in returns here with
    // no `code` and no hash token, so no auth event will ever fire. Waiting the
    // full fallback window only strands the user on a spinner, so check the
    // session immediately and report the failure instead.
    const hasCredentialToExchange =
      new URLSearchParams(window.location.search).has('code') ||
      window.location.hash.includes('access_token') ||
      window.location.hash.includes('refresh_token');

    if ( !hasCredentialToExchange ) {
      supabase.auth.getSession().then(
        ({ data: { session }, error }) => {
          if ( !active ) {return;}
          if ( error || !session ) {
            setState('error');
            setMessage(tx('waselAuthCallback.session_failed'));
          }
        },
        () => {
          if ( !active ) {return;}
          setState('error');
          setMessage(tx('waselAuthCallback.session_failed'));
        },
      );
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, eventSession) => {
        if (!active) {return;}

        if (event === 'PASSWORD_RECOVERY') {
          isRecoveryFlow = true;
          clearTimeout(cleanup.timer);
          subscription.unsubscribe();
          showRecovery();
          return;
        }

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          clearTimeout(cleanup.timer);
          subscription.unsubscribe();

          if (isRecoveryFlow) { showRecovery(); return; }

          if (!eventSession) {
            setState('error');
            setMessage(tx('waselAuthCallback.session_failed'));
            return;
          }

          if (window.opener && !window.opener.closed) {
            setState('closing');
            setMessage(tx('waselAuthCallback.sign_in_complete_return'));
            const nonce = sessionStorage.getItem('wasel_oauth_nonce') ?? '';
            window.opener.postMessage({ type: 'wasel-auth-complete', nonce }, window.location.origin);
            window.close();
            return;
          }

          setState('redirecting');
          setMessage(tx('waselAuthCallback.sign_in_complete_redirecting'));
          navigate(returnTo, { replace: true });
        }
      },
    );
    cleanup.unsubscribe = () => subscription.unsubscribe();

    cleanup.timer = setTimeout(() => {
      if (!active) {return;}
      subscription.unsubscribe();
      void client.auth.getSession().then(
        ({ data: { session }, error }) => {
          if (!active) {return;}
          if (error || !session) {
            setState('error');
            setMessage(tx('waselAuthCallback.session_failed'));
          } else {
            setState('redirecting');
            setMessage(tx('waselAuthCallback.sign_in_complete_redirecting'));
            navigate(returnTo, { replace: true });
          }
        },
        () => {
          if (!active) {return;}
          setState('error');
          setMessage(tx('waselAuthCallback.session_failed'));
        },
      );
    }, 10_000);

    return () => {
      active = false;
      clearTimeout(cleanup.timer);
      cleanup.unsubscribe?.();
    };
  }, [callbackError, callbackType, navigate, returnTo]);

  const handlePasswordUpdate = async () => {
    if (!supabase) {
      setFormError(tx('waselAuthCallback.backend_not_configured_recovery'));
      return;
    }

    // Same rules as sign-up (utils/authHelpers) so a reset can't set a
    // weaker password than registration would accept.
    const passwordIssue = getPasswordRuleIssue(password);
    if (passwordIssue === 'min_length') {
      setFormError(tx('waselAuth.error_password_min_length'));
      return;
    }
    if (passwordIssue === 'requirements') {
      setFormError(tx('waselAuth.error_password_requirements'));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(tx('waselAuthCallback.passwords_do_not_match'));
      return;
    }

    setFormError('');
    setSavingPassword(true);

    // An expired or already-used reset link leaves no session; say so plainly
    // instead of surfacing Supabase's "Auth session missing!".
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSavingPassword(false);
      setFormError(tx('waselAuthCallback.link_expired'));
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSavingPassword(false);
      setFormError(error.message || tx('waselAuthCallback.unable_to_update_password'));
      return;
    }

    await supabase.auth.signOut().catch(() => undefined);

    setState('redirecting');
    setMessage(tx('waselAuthCallback.password_updated_redirecting'));
    navigate(`/app/auth?tab=signin&reset=success&returnTo=${encodeURIComponent(returnTo)}`, {
      replace: true,
    });
  };

  if (state === 'recovery') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background)',
          color: 'var(--foreground)',
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
              {tx('waselAuthCallback.reset_your_password')}
            </h1>
            <p style={{ margin: 0, color: 'rgba(239,246,255,0.7)', lineHeight: 1.6 }}>{message}</p>
          </div>

          <form
            onSubmit={event => {
              event.preventDefault();
              void handlePasswordUpdate();
            }}
            style={{ display: 'grid', gap: 14 }}
            noValidate
          >
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: '0.82rem', color: 'rgba(196,220,238,0.68)' }}>
                {tx('settingsExpanded.newPassword')}
              </span>
              <input
                type="password"
                value={password}
                autoComplete="new-password"
                onChange={event => setPassword(event.target.value)}
                placeholder={tx('waselAuthCallback.enter_a_new_password')}
                aria-describedby="reset-password-rules"
                style={{
                  width: '100%',
                  minHeight: 46,
                  borderRadius: 12,
                  border: '1px solid rgba(0,200,232,0.18)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--foreground)',
                  padding: '0 14px',
                  fontSize: '0.95rem',
                }}
              />
              <span
                id="reset-password-rules"
                style={{ fontSize: '0.75rem', color: 'rgba(196,220,238,0.55)' }}
              >
                {tx('waselAuth.minimum_8_characters')}
              </span>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: '0.82rem', color: 'rgba(196,220,238,0.68)' }}>
                {tx('waselAuthCallback.confirm_password')}
              </span>
              <input
                type="password"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={event => setConfirmPassword(event.target.value)}
                placeholder={tx('waselAuthCallback.re_enter_your_new_password')}
                style={{
                  width: '100%',
                  minHeight: 46,
                  borderRadius: 12,
                  border: '1px solid rgba(0,200,232,0.18)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--foreground)',
                  padding: '0 14px',
                  fontSize: '0.95rem',
                }}
              />
            </label>

            {formError && (
              <div
                role="alert"
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(255,68,85,0.28)',
                  background: 'rgba(255,68,85,0.12)',
                  color: 'var(--destructive)',
                  padding: '12px 14px',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                }}
              >
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={savingPassword}
              style={{
                minHeight: 46,
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #00E5FF 0%, #0a3d6e 100%)',
                color: 'var(--foreground)',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: savingPassword ? 'not-allowed' : 'pointer',
                opacity: savingPassword ? 0.7 : 1,
              }}
            >
              {savingPassword
                ? tx('waselAuthCallback.updating_password')
                : tx('waselAuthCallback.save_new_password')}
            </button>
          </form>

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
              color: 'var(--foreground)',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {tx('waselAuthCallback.back_to_sign_in')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        color: 'var(--foreground)',
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
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            margin: '0 auto 16px',
            borderRadius: '50%',
            border:
              state === 'error'
                ? '3px solid rgba(255,68,85,0.3)'
                : '3px solid rgba(0,200,232,0.15)',
            borderTop: state === 'error' ? '3px solid #FF7C8B' : '3px solid #00E5FF',
            animation:
              state === 'redirecting' || state === 'loading' || state === 'closing'
                ? 'wasel-spin 0.8s linear infinite'
                : 'none',
          }}
        />
        <h1 style={{ margin: '0 0 8px', fontSize: '1.35rem', lineHeight: 1.2 }}>
          {state === 'error'
            ? tx('waselAuthCallback.sign_in_could_not_finish')
            : tx('waselAuthCallback.finalizing_authentication')}
        </h1>
        <p
          role={state === 'error' ? 'alert' : 'status'}
          style={{ margin: 0, color: 'rgba(239,246,255,0.7)' }}
        >
          {message}
        </p>
        {/* A cancelled or failed social sign-in lands here with no session and
            no way forward, so offer the same way back to the form that the
            recovery branch uses instead of stranding the user. */}
        {state === 'error' ? (
          <button
            type="button"
            onClick={() =>
              navigate(`/app/auth?tab=signin&returnTo=${encodeURIComponent(returnTo)}`, {
                replace: true,
              })
            }
            style={{
              marginTop: 20,
              minHeight: 42,
              borderRadius: 12,
              border: '1px solid rgba(0,200,232,0.18)',
              background: 'transparent',
              color: 'var(--foreground)',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {tx('waselAuthCallback.back_to_sign_in')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
