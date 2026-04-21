import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  ArrowRightLeft,
  BadgeCent,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  LoaderCircle,
  Wallet,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { PageShell, Protected } from '../shared/pageShared';
import { StripePaymentForm } from './StripePaymentForm';
import {
  createPaymentAttemptIdempotencyKey,
  paymentsService,
  resolveDefaultPaymentMethodType,
} from './paymentsService';
import { walletApi } from '../../services/walletApi';
import { hasStripeClientPaymentsEnabled } from './stripeClient';
import { PAYMENT_FLOW_PURPOSES, type PaymentIntentSession, type PaymentRequestDraft, type PaymentsDashboardData } from './paymentsTypes';
import type { PaymentTransaction } from '../../../shared/domain-contracts';
import type { WalletPaymentMethodType } from '../../../shared/wallet-contracts';

const PURPOSE_LABELS: Record<(typeof PAYMENT_FLOW_PURPOSES)[number], string> = {
  ride_payment: 'Ride payment',
  package_payment: 'Package payment',
  subscription: 'Subscription charge',
  deposit: 'Wallet top-up',
};

const PAYMENT_METHOD_LABELS: Record<WalletPaymentMethodType, string> = {
  card: 'Card',
  wallet: 'Wallet balance',
  bank_transfer: 'Bank transfer',
  cliq: 'CliQ',
};

type PaymentNotice = {
  tone: 'neutral' | 'success' | 'warning';
  message: string;
};

const FINAL_PAYMENT_STATUSES = new Set(['succeeded', 'failed', 'cancelled']);

function formatCurrency(value: number, currency = 'JOD') {
  return new Intl.NumberFormat('en-JO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function PaymentsPageContent() {
  const { user } = useLocalAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dashboard, setDashboard] = useState<PaymentsDashboardData | null>(null);
  const [intentSession, setIntentSession] = useState<PaymentIntentSession | null>(null);
  const [confirmationState, setConfirmationState] = useState<'idle' | 'confirming' | 'confirmed'>('idle');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<PaymentNotice | null>(null);
  const [paymentAttemptKey, setPaymentAttemptKey] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentRequestDraft>({
    purpose: 'ride_payment',
    amount: 12,
    paymentMethodType: 'wallet',
    referenceType: 'trip',
    referenceId: '',
    description: 'Wasel service movement',
  });

  const stripeClientEnabled = hasStripeClientPaymentsEnabled();
  const returnedPaymentIntentId = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');
  const intent = intentSession?.transaction ?? null;

  useEffect(() => {
    setPaymentAttemptKey(null);
  }, [form.amount, form.paymentMethodType, form.purpose, form.referenceId, form.referenceType]);

  function updateIntentStatus(paymentIntentId: string, status: string, clientSecret?: string | null) {
    setIntentSession((current) => {
      if (!current || current.transaction.id !== paymentIntentId) {
        return current;
      }

      return {
        ...current,
        clientSecret: clientSecret ?? current.clientSecret,
        transaction: {
          ...current.transaction,
          status: status as PaymentTransaction['status'],
        },
      };
    });
  }

  async function refreshDashboard(
    nextUserId: string,
    options?: { cancelled?: () => boolean },
  ) {
    try {
      const [nextDashboard, walletBalance] = await Promise.all([
        paymentsService.getDashboard(nextUserId),
        walletApi.getBalance(nextUserId)
      ]);
      
      if (options?.cancelled?.()) {
        return;
      }
      
      // Merge wallet data with payments dashboard
      const enhancedDashboard = {
        ...nextDashboard,
        wallet: {
          ...nextDashboard.wallet,
          balance: walletBalance.available
        },
        summary: {
          ...nextDashboard.summary,
          availableBalance: walletBalance.available,
          pendingAmount: walletBalance.pending
        }
      };
      
      setDashboard(enhancedDashboard);
      setForm((current) => ({
        ...current,
        paymentMethodType: resolveDefaultPaymentMethodType(
          enhancedDashboard.paymentMethods,
          current.amount,
          enhancedDashboard.wallet.balance,
        ),
      }));
    } catch (caughtError) {
      console.error('Failed to refresh dashboard:', caughtError);
      throw caughtError;
    }
  }

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void refreshDashboard(user.id, { cancelled: () => cancelled })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Payments could not be loaded.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const paymentMethods = useMemo(() => {
    const methodsByType = new Map<WalletPaymentMethodType, {
      id: string;
      type: WalletPaymentMethodType;
      label: string;
    }>();

    if ((dashboard?.wallet.balance ?? 0) > 0) {
      methodsByType.set('wallet', {
        id: 'wallet-balance',
        type: 'wallet',
        label: 'Wallet balance',
      });
    }

    (dashboard?.paymentMethods ?? []).forEach((method) => {
      const existing = methodsByType.get(method.type);
      if (!existing || method.isDefault) {
        methodsByType.set(method.type, {
          id: method.id,
          type: method.type,
          label: method.label,
        });
      }
    });

    if (stripeClientEnabled && !methodsByType.has('card')) {
      methodsByType.set('card', {
        id: 'stripe-card-entry',
        type: 'card',
        label: 'Secure card via Stripe',
      });
    }

    return Array.from(methodsByType.values());
  }, [dashboard, stripeClientEnabled]);

  useEffect(() => {
    if (!user?.id || !returnedPaymentIntentId) {
      return;
    }

    let cancelled = false;
    setConfirmationState('confirming');
    setNotice({
      tone: redirectStatus === 'failed' ? 'warning' : 'neutral',
      message: redirectStatus === 'failed'
        ? 'Stripe returned this payment as incomplete. Rechecking the latest status now.'
        : 'Stripe returned to Wasel. Rechecking the latest payment status now.',
    });

    void paymentsService.awaitPaymentSettlement(returnedPaymentIntentId, {
      attempts: 10,
      delayMs: 1_500,
    })
      .then(async (result) => {
        if (cancelled) {
          return;
        }

        updateIntentStatus(returnedPaymentIntentId, String(result.status), result.clientSecret);
        setConfirmationState(result.settled ? 'confirmed' : 'idle');
        if (result.settled || FINAL_PAYMENT_STATUSES.has(String(result.status))) {
          setPaymentAttemptKey(null);
        }
        setNotice(result.settled
          ? {
            tone: 'success',
            message: 'Payment settled successfully and the wallet dashboard is now updated.',
          }
          : {
            tone: 'warning',
            message: redirectStatus === 'failed'
              ? 'Payment was not completed. You can retry with another card or funding source.'
              : 'Payment is still processing. Wasel will reflect settlement as soon as Stripe finishes.',
          });
        await refreshDashboard(user.id, { cancelled: () => cancelled });
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setConfirmationState('idle');
          setError(nextError instanceof Error ? nextError.message : 'Payment status could not be refreshed.');
        }
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('payment_intent');
        nextParams.delete('payment_intent_client_secret');
        nextParams.delete('redirect_status');
        setSearchParams(nextParams, { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [redirectStatus, returnedPaymentIntentId, searchParams, setSearchParams, user?.id]);

  async function handleInitiatePayment() {
    if (!user?.id) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);
    setConfirmationState('idle');

    try {
      // Validate payment amount and method
      const amount = Number(form.amount);
      if (amount <= 0 || amount > 10000) {
        throw new Error('Payment amount must be between 0.01 and 10,000 JOD');
      }

      // Check wallet balance for wallet payments
      if (form.paymentMethodType === 'wallet') {
        const balance = await walletApi.getBalance(user.id);
        if (balance.available < amount) {
          throw new Error(`Insufficient wallet balance. Available: ${formatCurrency(balance.available)}`);
        }
      }

      const idempotencyKey = paymentAttemptKey
        ?? createPaymentAttemptIdempotencyKey(user.id, {
          purpose: form.purpose,
          amount,
          paymentMethodType: form.paymentMethodType,
          referenceType: form.referenceType ?? null,
          referenceId: form.referenceId ?? null,
        });
      setPaymentAttemptKey(idempotencyKey);

      const session = await paymentsService.initiatePayment(user.id, {
        ...form,
        amount,
        idempotencyKey,
      });

      setIntentSession(session);

      if (session.redirectUrl) {
        setNotice({
          tone: 'neutral',
          message: 'Provider instructions are ready below. Complete the payment with the linked flow.',
        });
      } else {
        setNotice({
          tone: 'success',
          message: 'Payment intent created successfully. Proceed with confirmation.',
        });
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Payment initiation failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmPayment() {
    if (!intent || confirmationState === 'confirming') {
      return;
    }

    if (intent.provider === 'stripe' && intent.paymentMethodType === 'card' && intentSession?.clientSecret) {
      return;
    }

    setConfirmationState('confirming');
    setError(null);
    setNotice(null);

    try {
      const result = await paymentsService.confirmPayment(intent.id);
      updateIntentStatus(intent.id, String(result.status), result.clientSecret);

      if (result.settled) {
        setConfirmationState('confirmed');
        setPaymentAttemptKey(null);
        setNotice({
          tone: 'success',
          message: 'Payment settled successfully and the server-side wallet ledger is now updated.',
        });
      } else if (intent.provider === 'stripe') {
        const settled = await paymentsService.awaitPaymentSettlement(intent.id);
        updateIntentStatus(intent.id, String(settled.status), settled.clientSecret);
        setConfirmationState(settled.settled ? 'confirmed' : 'idle');
        if (settled.settled || FINAL_PAYMENT_STATUSES.has(String(settled.status))) {
          setPaymentAttemptKey(null);
        }
        setNotice(settled.settled
          ? {
            tone: 'success',
            message: 'Stripe accepted the payment and Wasel has settled it.',
          }
          : {
            tone: 'warning',
            message: 'Payment confirmation was accepted, but settlement is still processing.',
          });
      } else {
        setConfirmationState('idle');
        setNotice({
          tone: 'neutral',
          message: intentSession?.redirectUrl
            ? 'Continue with the provider instructions below to finish this payment.'
            : 'Payment confirmation was accepted and is now processing.',
        });
      }

      if (user?.id) {
        await refreshDashboard(user.id);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Payment confirmation failed.');
      setConfirmationState('idle');
    }
  }

  async function handleStripePaymentCompleted(result: {
    paymentIntentId: string | null;
    status: string;
  }) {
    if (!intent || !user?.id) {
      return;
    }

    setConfirmationState('confirming');
    setError(null);
    setNotice({
      tone: 'neutral',
      message: 'Stripe accepted the payment. Wasel is reconciling settlement now.',
    });
    updateIntentStatus(intent.id, result.status);

    try {
      const settled = await paymentsService.awaitPaymentSettlement(result.paymentIntentId ?? intent.id, {
        attempts: 10,
        delayMs: 1_500,
      });
      updateIntentStatus(intent.id, String(settled.status), settled.clientSecret);
      setConfirmationState(settled.settled ? 'confirmed' : 'idle');
      if (settled.settled || FINAL_PAYMENT_STATUSES.has(String(settled.status))) {
        setPaymentAttemptKey(null);
      }

      if (settled.settled) {
        setNotice({
          tone: 'success',
          message: 'Stripe payment settled successfully and Wasel refreshed your server-side wallet state.',
        });
      } else {
        setNotice({
          tone: 'warning',
          message: 'Payment was accepted, but settlement is still processing in Stripe.',
        });
      }
      
      await refreshDashboard(user.id);
    } catch (nextError) {
      setConfirmationState('idle');
      setError(nextError instanceof Error ? nextError.message : 'Stripe payment status could not be reconciled.');
    }
  }

  const isStripeCardIntent = Boolean(
    intent &&
    intent.provider === 'stripe' &&
    intent.paymentMethodType === 'card' &&
    intentSession?.clientSecret,
  );

  const noticeClassName = notice?.tone === 'success'
    ? 'border-primary/25 bg-primary/10 text-primary'
    : notice?.tone === 'warning'
      ? 'border-amber-500/25 bg-amber-500/10 text-amber-100'
      : 'border-white/10 bg-white/5 text-muted-foreground';

  return (
    <PageShell>
      <Protected>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8 pt-4 md:px-6">
          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card className="border-primary/15 bg-[linear-gradient(140deg,rgba(3,13,28,0.96),rgba(8,34,60,0.92))]">
              <CardHeader className="gap-3">
                <Badge className="w-fit border border-primary/20 bg-primary/10 text-primary">
                  Payments
                </Badge>
                <CardTitle className="flex items-center gap-3 text-2xl text-foreground">
                  <ArrowRightLeft className="h-6 w-6 text-primary" />
                  Move value with explicit payment flows
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Wallet keeps your balance. Payments handles charging, collecting, and confirming movement of value
                  across rides, packages, subscriptions, and wallet top-ups.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pb-6 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Wallet className="h-4 w-4 text-primary" />
                    Available balance
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(dashboard?.summary.availableBalance ?? 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BadgeCent className="h-4 w-4 text-primary" />
                    Settled this month
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(dashboard?.summary.settledThisMonth ?? 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Primary source
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {dashboard?.summary.defaultMethodLabel ?? 'Wallet balance'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dashboard?.summary.paymentMethodsCount ?? 0} configured payment methods
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Movement boundary</CardTitle>
                <CardDescription className="text-sm leading-6 text-muted-foreground">
                  This page only initiates and confirms payments. Stored value, PIN controls, and long-term balance
                  settings remain on Wallet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Wallet className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Wallet</p>
                    <p>Balance, rewards, payout controls, stored methods, and escrow posture.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <ArrowRightLeft className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Payments</p>
                    <p>Amount, funding source, payment intent state, and confirmation lifecycle.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-xs text-primary">
                  Pending movements: {dashboard?.summary.pendingCount ?? 0} totaling{' '}
                  {formatCurrency(dashboard?.summary.pendingAmount ?? 0)}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Initiate payment</CardTitle>
                <CardDescription>
                  Select a payment flow and create a backend-managed payment intent.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">Purpose</span>
                  <select
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground"
                    value={form.purpose}
                    onChange={(event) => {
                      const purpose = event.target.value as PaymentRequestDraft['purpose'];
                      setForm((current) => ({
                        ...current,
                        purpose,
                        referenceType: purpose === 'deposit' ? 'wallet' : purpose === 'subscription' ? 'plan' : 'trip',
                        description: `${PURPOSE_LABELS[purpose]} from Payments`,
                      }));
                    }}
                  >
                    {PAYMENT_FLOW_PURPOSES.map((purpose) => (
                      <option key={purpose} value={purpose}>
                        {PURPOSE_LABELS[purpose]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">Amount</span>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground"
                    value={form.amount}
                    onChange={(event) => {
                      const nextAmount = Number(event.target.value);
                      setForm((current) => ({
                        ...current,
                        amount: nextAmount,
                        paymentMethodType: resolveDefaultPaymentMethodType(
                          dashboard?.paymentMethods ?? [],
                          nextAmount,
                          dashboard?.wallet.balance ?? 0,
                        ),
                      }));
                    }}
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">Funding source</span>
                  <select
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground"
                    value={form.paymentMethodType}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        paymentMethodType: event.target.value as WalletPaymentMethodType,
                      }));
                    }}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.type}>
                        {method.label} ({PAYMENT_METHOD_LABELS[method.type]})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">Reference ID</span>
                  <input
                    type="text"
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground"
                    value={form.referenceId ?? ''}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, referenceId: event.target.value }));
                    }}
                    placeholder="trip-123 or package-456"
                  />
                </label>

                <Button
                  className="w-full"
                  disabled={submitting || loading || !dashboard || form.amount <= 0}
                  onClick={handleInitiatePayment}
                >
                  {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create payment intent
                </Button>

                {error ? (
                  <div className="flex items-start gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                    <CircleAlert className="mt-0.5 h-4 w-4" />
                    <span>{error}</span>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Payment lifecycle</CardTitle>
                <CardDescription>
                  Every movement starts as an intent, then moves through confirmation and settlement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading payment state...
                  </div>
                ) : null}

                {notice ? (
                  <div className={`flex items-start gap-2 rounded-2xl border p-3 text-sm ${noticeClassName}`}>
                    {notice.tone === 'success' ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4" />
                    ) : (
                      <CircleAlert className="mt-0.5 h-4 w-4" />
                    )}
                    <span>{notice.message}</span>
                  </div>
                ) : null}

                {intent ? (
                  <div className="space-y-3 rounded-3xl border border-primary/15 bg-primary/5 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{intent.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {intent.kind.replace('_', ' ')} · {intent.provider} · {intent.paymentMethodType}
                        </p>
                      </div>
                      <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-primary">
                        {intent.status}
                      </Badge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount</p>
                        <p className="text-lg font-semibold text-foreground">
                          {formatCurrency(intent.amount, intent.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference</p>
                        <p className="text-sm text-foreground">{intent.referenceId ?? 'Unassigned'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Created</p>
                        <p className="text-sm text-foreground">{new Date(intent.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {isStripeCardIntent ? (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                          <CreditCard className="h-4 w-4 text-cyan-300" />
                          Complete the secure Stripe form below to finish this payment.
                        </div>
                      ) : (
                        <Button
                          disabled={confirmationState === 'confirming'}
                          onClick={handleConfirmPayment}
                        >
                          {confirmationState === 'confirming' ? (
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Confirm payment
                        </Button>
                      )}

                      {confirmationState === 'confirmed' ? (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
                          <CheckCircle2 className="h-4 w-4" />
                          Payment settled
                        </div>
                      ) : null}
                    </div>

                    {isStripeCardIntent && intentSession?.clientSecret ? (
                      <StripePaymentForm
                        amount={intent.amount}
                        currency={intent.currency}
                        clientSecret={intentSession.clientSecret}
                        disabled={confirmationState === 'confirming'}
                        onCompleted={handleStripePaymentCompleted}
                        onError={(message) => {
                          setError(message);
                        }}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm text-muted-foreground">
                    No payment intent created yet. Recent movement stays listed below.
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Recent payment activity</h3>
                    <Badge variant="outline">{dashboard?.recentPayments.length ?? 0} movements</Badge>
                  </div>
                  <div className="space-y-3">
                    {(dashboard?.recentPayments ?? []).slice(0, 6).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{payment.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.kind.replace('_', ' ')} · {payment.provider} · {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {payment.direction === 'credit' ? '+' : '-'}
                            {formatCurrency(payment.amount, payment.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">{payment.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </Protected>
    </PageShell>
  );
}

export default function PaymentsPage() {
  return <PaymentsPageContent />;
}
