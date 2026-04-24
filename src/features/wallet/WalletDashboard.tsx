import { useState } from 'react';
import {
  ArrowRightLeft,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Wallet as WalletIcon,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { OperationalConfidencePanel } from '../../components/trust/OperationalConfidencePanel';
import { Input } from '../../components/ui/input';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { getWalletConfidenceSummary } from '../../domains/trust/operationalConfidence';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  ClarityBand,
  CoreExperienceBanner,
  PageShell,
  Protected,
  SectionHead,
} from '../shared/pageShared';
import { useWallet, type WalletSendDraft } from './useWallet';

function formatCurrency(value: number, currency = 'JOD', locale = 'en-JO') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMetaSource(source: string, degraded: boolean, t: (key: string) => string) {
  if (degraded) {
    return t('walletPage.meta.backup');
  }
  return source === 'edge-api' ? t('walletPage.meta.primary') : t('walletPage.meta.direct');
}

function formatTransactionMeta(
  transaction: { createdAt: string; status: string; type: string },
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string,
) {
  return [
    transaction.type.replace(/_/g, ' '),
    formatDate(transaction.createdAt, { dateStyle: 'medium', timeStyle: 'short' }),
    transaction.status,
  ].join(' • ');
}

export function WalletDashboard() {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();
  const { formatDate, locale, t } = useLanguage();
  const {
    error,
    hasMoreTransactions,
    loading,
    loadingMore,
    meta,
    refresh,
    sendMoney,
    setError,
    submittingTransfer,
    totalTransactions,
    transactions,
    transferChallenge,
    transferMessage,
    wallet,
    loadMoreTransactions,
  } = useWallet(user?.id ?? null);
  const [sendDraft, setSendDraft] = useState<WalletSendDraft>({
    recipientUserId: '',
    amount: '',
    note: '',
    pin: '',
    otpCode: '',
  });

  const paymentMethods = wallet?.wallet.paymentMethods ?? [];
  const defaultPaymentMethod = paymentMethods.find(method => method.isDefault) ?? null;
  const recentTransactions = transactions;
  const walletConfidence = getWalletConfidenceSummary({
    wallet,
    meta,
    transferChallenge,
    totalTransactions,
    defaultPaymentMethodLabel: defaultPaymentMethod?.label ?? null,
    formatMoney: (value, currency) => formatCurrency(value, currency, locale),
  });

  async function handleSendMoney() {
    setError(null);
    try {
      const result = await sendMoney(sendDraft);
      if (result?.status === 'success') {
        setSendDraft({
          recipientUserId: '',
          amount: '',
          note: '',
          pin: '',
          otpCode: '',
        });
      }
    } catch {
      // Errors are normalized and surfaced by the wallet hook.
    }
  }

  return (
    <PageShell>
      <Protected>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8 pt-4 md:px-6">
          <SectionHead
            emoji={<WalletIcon aria-hidden="true" className="h-5 w-5" />}
            title={t('walletPage.header.title')}
            sub={t('walletPage.header.subtitle')}
            color="var(--accent)"
            action={{
              label: loading ? t('common.loading') : t('walletPage.header.refresh'),
              onClick: () => {
                void refresh();
              },
            }}
          />

          <CoreExperienceBanner
            title={t('walletPage.banner.title')}
            detail={t('walletPage.banner.detail')}
            tone="var(--accent)"
          />

          <ClarityBand
            title={t('walletPage.clarity.title')}
            detail={t('walletPage.clarity.detail')}
            tone="var(--accent)"
            items={[
              {
                label: t('walletPage.metrics.balance'),
                value: wallet
                  ? formatCurrency(wallet.balance, wallet.currency, locale)
                  : t('common.loading'),
              },
              {
                label: t('walletPage.metrics.pending'),
                value: wallet
                  ? formatCurrency(wallet.pendingBalance, wallet.currency, locale)
                  : t('common.loading'),
              },
              {
                label: t('walletPage.metrics.rewards'),
                value: wallet
                  ? formatCurrency(wallet.rewardsBalance, wallet.currency, locale)
                  : t('common.loading'),
              },
            ]}
          />

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-primary/15 bg-[linear-gradient(140deg,rgba(3,13,28,0.96),rgba(8,34,60,0.92))]">
              <CardHeader className="gap-3">
                <Badge className="w-fit border border-primary/20 bg-primary/10 text-primary">
                  {t('walletPage.liveBadge')}
                </Badge>
                <CardTitle className="flex items-center gap-3 text-2xl text-foreground">
                  <WalletIcon className="h-6 w-6 text-primary" />
                  {wallet
                    ? formatCurrency(wallet.balance, wallet.currency, locale)
                    : t('walletPage.loadingWallet')}
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  {t('walletPage.liveDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pb-6 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    {t('walletPage.pendingBalance')}
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {wallet ? formatCurrency(wallet.pendingBalance, wallet.currency, locale) : '--'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CreditCard className="h-4 w-4 text-primary" />
                    {t('walletPage.paymentMethods')}
                  </div>
                  <p className="text-2xl font-bold text-foreground">{paymentMethods.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {defaultPaymentMethod?.label ?? t('walletPage.noDefaultMethod')}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {t('walletPage.servicePosture')}
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {meta ? formatMetaSource(meta.source, meta.degraded, t) : t('common.loading')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {meta
                      ? `${t('walletPage.updatedAt')} ${formatDate(meta.fetchedAt, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}`
                      : t('walletPage.waitingSync')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <OperationalConfidencePanel summary={walletConfidence} variant="detail" />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">
                    {t('walletPage.actions.title')}
                  </CardTitle>
                  <CardDescription className="text-sm leading-6 text-muted-foreground">
                    {t('walletPage.actions.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => navigate('/app/payments')}
                  >
                    {t('walletPage.actions.openPayments')}
                  </Button>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => navigate('/app/settings')}
                  >
                    {t('walletPage.actions.openSettings')}
                  </Button>
                  <Button
                    className="w-full"
                    disabled={loading}
                    onClick={() => {
                      void refresh();
                    }}
                  >
                    {loading ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {t('walletPage.actions.refresh')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">
                  {t('walletPage.transfer.title')}
                </CardTitle>
                <CardDescription>{t('walletPage.transfer.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">
                    {t('walletPage.transfer.recipient')}
                  </span>
                  <Input
                    value={sendDraft.recipientUserId}
                    onChange={event =>
                      setSendDraft(current => ({ ...current, recipientUserId: event.target.value }))
                    }
                    placeholder={t('walletPage.transfer.recipientPlaceholder')}
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">
                    {t('walletPage.transfer.amount')}
                  </span>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={sendDraft.amount}
                    onChange={event =>
                      setSendDraft(current => ({ ...current, amount: event.target.value }))
                    }
                    placeholder={t('walletPage.transfer.amountPlaceholder')}
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">
                    {t('walletPage.transfer.note')}
                  </span>
                  <Input
                    value={sendDraft.note}
                    onChange={event =>
                      setSendDraft(current => ({ ...current, note: event.target.value }))
                    }
                    placeholder={t('walletPage.transfer.notePlaceholder')}
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="font-medium text-foreground">
                    {t('walletPage.transfer.pin')}
                  </span>
                  <Input
                    type="password"
                    value={sendDraft.pin}
                    onChange={event =>
                      setSendDraft(current => ({ ...current, pin: event.target.value }))
                    }
                    placeholder={t('walletPage.transfer.pinPlaceholder')}
                  />
                </label>

                {transferChallenge ? (
                  <label className="block space-y-2 text-sm">
                    <span className="font-medium text-foreground">
                      {t('walletPage.transfer.otp')}
                    </span>
                    <Input
                      value={sendDraft.otpCode}
                      onChange={event =>
                        setSendDraft(current => ({ ...current, otpCode: event.target.value }))
                      }
                      placeholder={t('walletPage.transfer.otpPlaceholder')}
                    />
                  </label>
                ) : null}

                {transferMessage ? (
                  <div
                    aria-live="polite"
                    className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary"
                    role="status"
                  >
                    {transferMessage}
                  </div>
                ) : null}

                {error ? (
                  <div
                    className="rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
                    role="alert"
                  >
                    {error}
                  </div>
                ) : null}

                <Button
                  className="w-full"
                  disabled={submittingTransfer || loading || !wallet}
                  onClick={() => {
                    void handleSendMoney();
                  }}
                >
                  {submittingTransfer ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                  )}
                  {transferChallenge
                    ? t('walletPage.transfer.verifyAction')
                    : t('walletPage.transfer.submit')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">
                  {t('walletPage.history.title')}
                </CardTitle>
                <CardDescription>
                  {t('walletPage.history.summary')
                    .replace('{visible}', String(recentTransactions.length))
                    .replace('{total}', String(totalTransactions))}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading && recentTransactions.length === 0 ? (
                  <div
                    aria-live="polite"
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground"
                    role="status"
                  >
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {t('walletPage.history.loading')}
                  </div>
                ) : null}

                {!loading && recentTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm text-muted-foreground">
                    {t('walletPage.history.empty')}
                  </div>
                ) : null}

                {recentTransactions.map(transaction => {
                  const isCredit = transaction.amount >= 0;
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTransactionMeta(transaction, formatDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${isCredit ? 'text-emerald-400' : 'text-foreground'}`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatCurrency(
                            Math.abs(transaction.amount),
                            wallet?.currency ?? 'JOD',
                            locale,
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{transaction.id}</p>
                      </div>
                    </div>
                  );
                })}

                {hasMoreTransactions ? (
                  <Button
                    className="w-full"
                    disabled={loadingMore}
                    variant="secondary"
                    onClick={() => {
                      void loadMoreTransactions();
                    }}
                  >
                    {loadingMore ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('walletPage.history.loadMore')}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </section>
        </div>
      </Protected>
    </PageShell>
  );
}
