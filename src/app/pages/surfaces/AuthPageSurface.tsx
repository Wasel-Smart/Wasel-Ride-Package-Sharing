/**
 * AuthPageSurface
 *
 * Sign-in / Sign-up page. Handles email/password flows and
 * social OAuth (Google, Facebook) via AuthContext.
 */
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Bus, Package, Search, Shield } from 'lucide-react';
import {
  Button,
  Input,
  LayoutContainer,
  SectionWrapper,
  Tabs,
  type TabItem,
} from '../../../design-system/components';
import { BrandLockup } from '../../../components/brand';
import { useAuth } from '../../../contexts/AuthContext';
import { useLocalAuth } from '../../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../../hooks/useIframeSafeNavigate';
import { normalizeAuthReturnTo } from '../../../utils/authFlow';
import {
  normalizeEmailInput,
  validateFullName,
  validatePassword,
} from '../../../utils/authHelpers';
import { validateEmail, validatePhone } from '../../../utils/security';
import { BrandPillRow, MapHeroPanel } from './SharedPageComponents';
import type { BrandPillItem } from './pageTypes';

export function AuthPage() {
  const [params, setParams] = useSearchParams();
  const initialTab =
    params.get('tab') === 'signup' || params.get('tab') === 'register' ? 'signup' : 'signin';
  const returnTo = normalizeAuthReturnTo(params.get('returnTo'), '/app/find-ride');

  const navigate = useIframeSafeNavigate();
  const { signIn, register, user } = useLocalAuth();
  const { resetPassword, signInWithFacebook, signInWithGoogle } = useAuth();

  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'none' | 'google' | 'facebook' | 'submit' | 'reset'>('none');

  const normalizedEmail = useMemo(() => normalizeEmailInput(email), [email]);
  const nameError = tab === 'signup' && name.trim() ? validateFullName(name) ?? '' : '';
  const emailError =
    normalizedEmail && !validateEmail(normalizedEmail) ? 'Enter a valid email address.' : '';
  const passwordError =
    password && (tab === 'signup' || password.length > 0) ? validatePassword(password) ?? '' : '';
  const confirmPasswordError =
    tab === 'signup' && confirmPassword && confirmPassword !== password
      ? 'Passwords do not match.'
      : '';
  const phoneError =
    tab === 'signup' && phone.trim() && !validatePhone(phone.trim())
      ? 'Enter a valid phone number in international format, for example +962791234567.'
      : '';

  const isSubmitDisabled =
    busy !== 'none' ||
    !normalizedEmail ||
    !password ||
    Boolean(emailError) ||
    (tab === 'signup' &&
      (!name.trim() ||
        !confirmPassword ||
        Boolean(nameError) ||
        Boolean(passwordError) ||
        Boolean(confirmPasswordError) ||
        Boolean(phoneError)));

  const authHighlights: BrandPillItem[] = [
    { icon: <Search size={14} />, label: 'Rides' },
    { icon: <Package size={14} />, label: 'Packages' },
    { icon: <Bus size={14} />, label: 'Bus' },
    { icon: <Shield size={14} />, label: 'Wallet and recovery' },
  ];
  const authSignals = ['One account live', 'Return path saved', 'Recovery ready'];

  useEffect(() => {
    if (user) navigate(returnTo);
  }, [navigate, returnTo, user]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    next.set('returnTo', returnTo);
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
  }, [params, returnTo, setParams, tab]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (emailError) {
      setError(emailError);
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setBusy('submit');

    if (tab === 'signin') {
      const result = await signIn(normalizedEmail, password);
      setBusy('none');
      if (result.error) {
        setError(result.error);
        return;
      }
      navigate(returnTo);
      return;
    }

    if (!name.trim()) {
      setBusy('none');
      setError('Please enter your name.');
      return;
    }
    if (nameError || passwordError || confirmPasswordError || phoneError) {
      setBusy('none');
      setError(nameError || passwordError || confirmPasswordError || phoneError);
      return;
    }
    if (!confirmPassword) {
      setBusy('none');
      setError('Please confirm your password.');
      return;
    }

    const result = await register(
      name.trim(),
      normalizedEmail,
      password,
      phone.trim() || undefined,
    );
    setBusy('none');
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.requiresEmailConfirmation) {
      setNotice(`Check ${result.email ?? normalizedEmail} for a confirmation link.`);
      return;
    }
    navigate(returnTo);
  };

  const handleReset = async () => {
    if (!normalizedEmail) {
      setError('Enter your email address first.');
      return;
    }
    if (emailError) {
      setError(emailError);
      return;
    }

    setBusy('reset');
    const result = await resetPassword(normalizedEmail);
    setBusy('none');
    if (result.error) {
      setError(result.error instanceof Error ? result.error.message : String(result.error));
    } else {
      setNotice(`Recovery link sent to ${normalizedEmail}.`);
    }
  };

  return (
    <LayoutContainer>
      <div className="ds-page">
        <div className="ds-shell-header__inner">
          <button
            className="ds-shell-header__brand"
            onClick={() => navigate('/')}
            type="button"
          >
            <BrandLockup size="md" surface="light" />
          </button>
        </div>

        <div className="ds-screen-grid">
          <MapHeroPanel signals={authSignals}>
            <div className="ds-hero-panel__content-inner">
              <h1 className="ds-section-title">One account for every Wasel move.</h1>
              <p className="ds-copy ds-copy--tight">
                Rides, packages, bus, and wallet all stay in the same trusted shell.
              </p>
              <BrandPillRow items={authHighlights} />
            </div>
          </MapHeroPanel>

          <SectionWrapper description="Sign in or create an account." title="Account access">
            <Tabs
              items={
                [
                  { content: null, label: 'Sign in', value: 'signin' },
                  { content: null, label: 'Create account', value: 'signup' },
                ] satisfies TabItem<'signin' | 'signup'>[]
              }
              label="Auth tabs"
              onChange={setTab}
              value={tab}
            />

            <form className="ds-stack" onSubmit={event => void handleSubmit(event)}>
              {tab === 'signup' && (
                <Input
                  error={name.trim() ? nameError || undefined : undefined}
                  label="Full name"
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  value={name}
                />
              )}

              <Input
                error={email.trim() ? emailError || undefined : undefined}
                label="Email"
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />

              <Input
                error={password ? passwordError || undefined : undefined}
                hint={
                  tab === 'signup'
                    ? 'Use at least 8 characters with uppercase, lowercase, a number, and a symbol.'
                    : undefined
                }
                label="Password"
                onChange={e => setPassword(e.target.value)}
                placeholder={tab === 'signup' ? 'Create a strong password' : 'Your password'}
                type="password"
                value={password}
              />

              {tab === 'signup' && (
                <>
                  <Input
                    error={confirmPassword ? confirmPasswordError || undefined : undefined}
                    label="Confirm password"
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    type="password"
                    value={confirmPassword}
                  />

                  <Input
                    error={phone.trim() ? phoneError || undefined : undefined}
                    hint="Optional, but required for SMS notifications and support."
                    label="Phone (optional)"
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+962791234567"
                    type="tel"
                    value={phone}
                  />
                </>
              )}

              {error ? (
                <div className="ds-inline-feedback" data-tone="error">{error}</div>
              ) : null}

              {notice ? (
                <div className="ds-inline-feedback" data-tone="success">{notice}</div>
              ) : null}

              <Button disabled={isSubmitDisabled} fullWidth type="submit">
                {busy === 'submit'
                  ? 'Please wait...'
                  : tab === 'signin'
                    ? 'Sign in'
                    : 'Create account'}
              </Button>

              {tab === 'signin' && (
                <Button
                  disabled={busy !== 'none'}
                  onClick={() => void handleReset()}
                  type="button"
                  variant="ghost"
                >
                  {busy === 'reset' ? 'Sending...' : 'Forgot password?'}
                </Button>
              )}
            </form>

            <div className="ds-divider ds-copy--tight">or continue with</div>

            <div className="ds-social-grid">
              <Button
                disabled={busy !== 'none'}
                fullWidth
                onClick={() => {
                  setBusy('google');
                  void signInWithGoogle(returnTo).finally(() => setBusy('none'));
                }}
                variant="secondary"
              >
                {busy === 'google' ? 'Redirecting...' : 'Google'}
              </Button>
              <Button
                disabled={busy !== 'none'}
                fullWidth
                onClick={() => {
                  setBusy('facebook');
                  void signInWithFacebook(returnTo).finally(() => setBusy('none'));
                }}
                variant="secondary"
              >
                {busy === 'facebook' ? 'Redirecting...' : 'Facebook'}
              </Button>
            </div>

            <p className="ds-caption">
              {tab === 'signin' ? (
                <>
                  No account?{' '}
                  <button
                    className="ds-link"
                    onClick={() => setTab('signup')}
                    type="button"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    className="ds-link"
                    onClick={() => setTab('signin')}
                    type="button"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

            <p className="ds-caption">
              By continuing you agree to our{' '}
              <a className="ds-link" href="/app/terms">Terms</a>
              {' and '}
              <a className="ds-link" href="/app/privacy">Privacy policy</a>.
            </p>
          </SectionWrapper>
        </div>
      </div>
    </LayoutContainer>
  );
}
