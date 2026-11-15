import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/auth-js';
import { useAuth } from '../contexts/AuthContext';
import type { getSupabaseClient } from '../contexts/auth/auth-service';
import { useLanguage } from '../contexts/LanguageContext';
import { isHighPrivilegeRole, resolveAccessRole } from '../platform/rbac';
import { Button } from './ui/button';
import { Input } from './ui/input';

type GateState = 'checking' | 'allowed' | 'challenge' | 'enroll' | 'error';
type FactorType = 'phone' | 'totp';

interface GateViewState {
  gateState: GateState;
  factorId: string;
  factorType: FactorType;
  qrCode: string;
  secret: string;
  errorMessage: string;
  notice: string;
}

interface PendingEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

interface GateCopy {
  checking: string;
  title: string;
  description: string;
  enrollTitle: string;
  enrollDescription: string;
  manualEntry: string;
  codeLabel: string;
  challengeDescription: Record<FactorType, string>;
  submit: string;
  verifying: string;
  retry: string;
  setupPending: string;
  storageWarning: string;
}

const INITIAL_STATE: GateViewState = {
  gateState: 'checking',
  factorId: '',
  factorType: 'totp',
  qrCode: '',
  secret: '',
  errorMessage: '',
  notice: '',
};

const COPY: Record<'ar' | 'en', GateCopy> = {
  en: {
    checking: 'Checking your account security…',
    title: 'Additional verification required',
    description: 'Privileged accounts must verify with a second factor before using the platform.',
    enrollTitle: 'Set up an authenticator',
    enrollDescription: 'Scan this QR code with an authenticator app, then enter the 6-digit code.',
    manualEntry: 'Can’t scan the code? Enter this secret in your authenticator app:',
    codeLabel: 'Verification code',
    challengeDescription: {
      totp: 'Enter the 6-digit code from your authenticator app.',
      phone: 'Enter the verification code sent to your phone.',
    },
    submit: 'Verify and continue',
    verifying: 'Verifying…',
    retry: 'Try again',
    setupPending: 'A pending setup exists in another tab. Return to that tab to finish setup.',
    storageWarning: 'Keep this tab open until verification is complete; pending setup could not be saved for refresh.',
  },
  ar: {
    checking: 'جارٍ التحقق من أمان حسابك…',
    title: 'مطلوب تحقق إضافي',
    description: 'يجب على الحسابات ذات الصلاحيات العالية التحقق بعامل ثانٍ قبل استخدام المنصة.',
    enrollTitle: 'إعداد تطبيق المصادقة',
    enrollDescription: 'امسح رمز QR باستخدام تطبيق مصادقة، ثم أدخل الرمز المكوّن من 6 أرقام.',
    manualEntry: 'إذا تعذر مسح الرمز، أدخل هذا المفتاح في تطبيق المصادقة:',
    codeLabel: 'رمز التحقق',
    challengeDescription: {
      totp: 'أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة.',
      phone: 'أدخل رمز التحقق المرسل إلى هاتفك.',
    },
    submit: 'تحقق ومتابعة',
    verifying: 'جارٍ التحقق…',
    retry: 'إعادة المحاولة',
    setupPending: 'يوجد إعداد غير مكتمل في علامة تبويب أخرى. ارجع إليها لإكمال الإعداد.',
    storageWarning: 'أبقِ علامة التبويب مفتوحة حتى يكتمل التحقق؛ تعذر حفظ الإعداد لمتابعته بعد التحديث.',
  },
};

function getEnrollmentStorageKey(userId: string): string {
  return `wasel:privileged-mfa:${userId}`;
}

function readPendingEnrollment(userId: string): PendingEnrollment | null {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(getEnrollmentStorageKey(userId));
  } catch (error) {
    console.error('[MFA] Unable to read pending enrollment:', error);
    return null;
  }
  if (!raw) {return null;}

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'factorId' in parsed &&
      typeof parsed.factorId === 'string' &&
      'qrCode' in parsed &&
      typeof parsed.qrCode === 'string' &&
      parsed.qrCode.startsWith('data:image/svg+xml') &&
      'secret' in parsed &&
      typeof parsed.secret === 'string'
    ) {
      return {
        factorId: parsed.factorId,
        qrCode: parsed.qrCode,
        secret: parsed.secret,
      };
    }
  } catch (error) {
    console.error('[MFA] Unable to parse pending enrollment:', error);
  }
  return null;
}

function savePendingEnrollment(userId: string, enrollment: PendingEnrollment): boolean {
  try {
    window.sessionStorage.setItem(getEnrollmentStorageKey(userId), JSON.stringify(enrollment));
    return true;
  } catch (error) {
    console.error('[MFA] Unable to save pending enrollment:', error);
    return false;
  }
}

function clearPendingEnrollment(userId: string): void {
  try {
    window.sessionStorage.removeItem(getEnrollmentStorageKey(userId));
  } catch (error) {
    console.error('[MFA] Unable to clear pending enrollment:', error);
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The security check could not be completed.';
}

function makeChallengeState(factorId: string, factorType: FactorType): GateViewState {
  return {
    ...INITIAL_STATE,
    gateState: 'challenge',
    factorId,
    factorType,
  };
}

async function loadPrivilegedMfaState(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  userId: string,
  copy: GateCopy,
): Promise<GateViewState> {
  const { data: assurance, error: assuranceError } =
    await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) {throw assuranceError;}
  if (assurance.currentLevel === 'aal2') {
    return { ...INITIAL_STATE, gateState: 'allowed' };
  }

  const { data: factors, error: factorsError } = await client.auth.mfa.listFactors();
  if (factorsError) {throw factorsError;}

  const verifiedTotp = factors.totp[0];
  if (verifiedTotp) {return makeChallengeState(verifiedTotp.id, 'totp');}
  const verifiedPhone = factors.phone[0];
  if (verifiedPhone) {return makeChallengeState(verifiedPhone.id, 'phone');}

  const pendingTotp = factors.all.find(
    factor => factor.factor_type === 'totp' && factor.status === 'unverified',
  );
  if (pendingTotp) {
    const pending = readPendingEnrollment(userId);
    if (pending?.factorId !== pendingTotp.id) {
      throw new Error(copy.setupPending);
    }
    return {
      ...INITIAL_STATE,
      gateState: 'enroll',
      factorId: pending.factorId,
      qrCode: pending.qrCode,
      secret: pending.secret,
    };
  }

  const pendingPhone = factors.all.find(
    factor => factor.factor_type === 'phone' && factor.status === 'unverified',
  );
  if (pendingPhone) {return makeChallengeState(pendingPhone.id, 'phone');}

  const { data: enrollment, error: enrollmentError } = await client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Wasel privileged access',
  });
  if (enrollmentError) {throw enrollmentError;}

  const nextEnrollment = {
    factorId: enrollment.id,
    qrCode: `data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.totp.qr_code)}`,
    secret: enrollment.totp.secret,
  };
  const saved = savePendingEnrollment(userId, nextEnrollment);
  return {
    ...INITIAL_STATE,
    gateState: 'enroll',
    ...nextEnrollment,
    notice: saved ? '' : copy.storageWarning,
  };
}

function MfaPrompt({
  state,
  copy,
  language,
  dir,
  code,
  isSubmitting,
  onCodeChange,
  onSubmit,
  onRetry,
}: {
  state: GateViewState;
  copy: GateCopy;
  language: 'ar' | 'en';
  dir: 'ltr' | 'rtl';
  code: string;
  isSubmitting: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
}) {
  const isVerifying = state.gateState === 'challenge' || state.gateState === 'enroll';
  return (
    <main
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background p-4 text-foreground"
      dir={dir}
      lang={language}
      aria-busy={state.gateState === 'checking' || isSubmitting}
    >
      <section className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">
            {state.gateState === 'checking' ? copy.checking : copy.title}
          </h1>
          {state.gateState !== 'checking' && (
            <p className="text-sm text-muted-foreground">{copy.description}</p>
          )}
        </div>

        {state.gateState === 'checking' && (
          <p role="status" className="text-sm text-muted-foreground">{copy.checking}</p>
        )}

        {state.gateState === 'enroll' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-medium">{copy.enrollTitle}</h2>
              <p className="text-sm text-muted-foreground">{copy.enrollDescription}</p>
            </div>
            <img className="mx-auto max-h-56 w-auto rounded bg-white p-2" src={state.qrCode} alt={copy.enrollTitle} />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{copy.manualEntry}</p>
              <code className="block select-text break-all rounded bg-muted p-2 text-sm" dir="ltr">
                {state.secret}
              </code>
            </div>
          </div>
        )}

        {isVerifying && (
          <div className="space-y-3">
            {state.gateState === 'challenge' && (
              <p className="text-sm text-muted-foreground">
                {copy.challengeDescription[state.factorType]}
              </p>
            )}
            <label htmlFor="privileged-mfa-code" className="block text-sm font-medium">
              {copy.codeLabel}
            </label>
            <Input
              id="privileged-mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={6}
              value={code}
              onChange={event => onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-invalid={Boolean(state.errorMessage)}
            />
            {state.notice && <p className="text-sm text-amber-700" role="status">{state.notice}</p>}
          </div>
        )}

        {state.errorMessage && (
          <p className="text-sm text-destructive" role="alert">{state.errorMessage}</p>
        )}

        {isVerifying && (
          <Button
            type="button"
            className="w-full"
            disabled={isSubmitting || code.length !== 6}
            onClick={onSubmit}
          >
            {isSubmitting ? copy.verifying : copy.submit}
          </Button>
        )}

        {state.gateState === 'error' && (
          <Button type="button" variant="outline" className="w-full" onClick={onRetry}>
            {copy.retry}
          </Button>
        )}
      </section>
    </main>
  );
}

export function PrivilegedMfaGate({ children }: { children: ReactNode }) {
  const { loading, profile, session } = useAuth();
  const { language, dir } = useLanguage();
  const [state, setState] = useState<GateViewState>(INITIAL_STATE);
  const [readySession, setReadySession] = useState<Session | null>(null);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const role = resolveAccessRole(profile?.role);
  const requiresMfa = isHighPrivilegeRole(role);
  const copy = COPY[language];
  const bypassGate = !loading && (!session || !requiresMfa);
  const currentState = bypassGate
    ? { ...state, gateState: 'allowed' as const }
    : readySession === session ? state : INITIAL_STATE;

  useEffect(() => {
    if (loading || !session || !requiresMfa) {return;}
    let active = true;

    void (async () => {
      const { getSupabaseClient } = await import('../contexts/auth/auth-service');
      const client = getSupabaseClient();
      if (!client) {throw new Error('Authentication service is unavailable.');}
      return loadPrivilegedMfaState(client, session.user.id, copy);
    })()
      .then(nextState => {
        if (active) {
          setState(nextState);
          setReadySession(session);
        }
      })
      .catch(error => {
        if (active) {
          setState({ ...INITIAL_STATE, gateState: 'error', errorMessage: getErrorMessage(error) });
          setReadySession(session);
        }
      });

    return () => {
      active = false;
    };
  }, [copy, loading, requiresMfa, retryCount, session]);

  const submitCode = async () => {
    const { getSupabaseClient } = await import('../contexts/auth/auth-service');
    const client = getSupabaseClient();
    if (!client || !session || !currentState.factorId || !/^\d{6}$/.test(code)) {return;}

    setIsSubmitting(true);
    setState(current => ({ ...current, errorMessage: '' }));
    try {
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({
        factorId: currentState.factorId,
      });
      if (challengeError) {throw challengeError;}

      const { error: verifyError } = await client.auth.mfa.verify({
        factorId: currentState.factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) {throw verifyError;}

      const { data: assurance, error: assuranceError } =
        await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) {throw assuranceError;}
      if (assurance.currentLevel !== 'aal2') {
        throw new Error('Second-factor verification did not establish AAL2.');
      }

      clearPendingEnrollment(session.user.id);
      setState({ ...INITIAL_STATE, gateState: 'allowed' });
      setReadySession(session);
      setCode('');
    } catch (error) {
      setState(current => ({ ...current, errorMessage: getErrorMessage(error) }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const retry = () => {
    setState(INITIAL_STATE);
    setReadySession(null);
    setCode('');
    setRetryCount(count => count + 1);
  };

  if (currentState.gateState === 'allowed') {return <>{children}</>;}

  return (
    <MfaPrompt
      state={currentState}
      copy={copy}
      language={language}
      dir={dir}
      code={code}
      isSubmitting={isSubmitting}
      onCodeChange={setCode}
      onSubmit={() => void submitCode()}
      onRetry={retry}
    />
  );
}
